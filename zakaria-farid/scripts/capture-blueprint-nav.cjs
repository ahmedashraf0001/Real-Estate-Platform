const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const option = name => process.argv[process.argv.indexOf(name) + 1];
const base = option('--base');
const shots = path.resolve(option('--shots'));
assert.match(base, /^http:\/\/localhost:\d+$/);
fs.mkdirSync(shots, { recursive: true });
const slug = 'el-gouna-marina-residential-building-عمارة-شقق-بالجونة-bqycxm';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  let captures = 0;
  try {
    const context = await browser.newContext();
    await context.route('**/*', route => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) && !route.request().url().startsWith(base + '/_next/')) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') console.error('Browser console:', m.text()); });
    const capture = async (locator, name) => {
      await locator.screenshot({ path: path.join(shots, name + '.png') });
      captures++;
    };
    const bounds = async overlay => {
      const result = await overlay.evaluate(e => {
        const r = e.getBoundingClientRect();
        // Scrollable rails/details intentionally have clipped offscreen content.
        // Assert every rendered descendant's visible rect, intersected with its
        // real clipping ancestors. No hidden controls or reconstructed shell.
        const outside = [];
        for (const child of e.querySelectorAll('*')) {
          if (!child.getClientRects().length || child.closest('svg')) continue;
          const b = child.getBoundingClientRect();
          let left = b.left, top = b.top, right = b.right, bottom = b.bottom;
          for (let p = child.parentElement; p && p !== e; p = p.parentElement) {
            const css = getComputedStyle(p), clip = p.getBoundingClientRect();
            if (['auto', 'scroll', 'hidden', 'clip'].includes(css.overflowX)) { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
            if (['auto', 'scroll', 'hidden', 'clip'].includes(css.overflowY)) { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
          }
          if (right > left && bottom > top && (left < -.5 || top < -.5 || right > innerWidth + .5 || bottom > innerHeight + .5)) outside.push({ tag: child.tagName, class: String(child.className), left, top, right, bottom });
        }
        return { rect: [r.left, r.top, r.width, r.height], viewport: [0, 0, innerWidth, innerHeight], outside, scrollTop: e.scrollTop };
      });
      assert.deepEqual(result.rect, result.viewport, 'overlay exactly fills viewport');
      assert.deepEqual(result.outside, [], 'all visible descendants inside viewport');
      assert.equal(result.scrollTop, 0, 'dialog header stays visible');
      for (const selector of ['[data-blueprint-drawing]', '[data-floor-rail]', '[data-blueprint-info]']) {
        const r = await overlay.locator(selector).boundingBox();
        assert.ok(r.width > 0 && r.height > 0, selector + ' has usable area');
      }
      const clippedTiles = await overlay.locator('[data-blueprint-drawing]').evaluate(e => {
        const box = e.getBoundingClientRect();
        return [...e.querySelectorAll('[data-zone-id], button[class*="__unit "]')].filter(b => {
          const r = b.getBoundingClientRect();
          return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1;
        }).map(b => b.textContent);
      });
      assert.deepEqual(clippedTiles, [], 'plan tiles fully fit drawing card');
      const overlappingTiles = await overlay.locator('[data-blueprint-drawing] [data-zone-id], [data-blueprint-drawing] button[class*="__unit "]').evaluateAll(es => {
        const pairs = [];
        for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
          const a = es[i].getBoundingClientRect(), b = es[j].getBoundingClientRect();
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) pairs.push([es[i].textContent, es[j].textContent]);
        }
        return pairs;
      });
      assert.deepEqual(overlappingTiles, [], 'plan tiles never overlap');
      const tiny = await overlay.locator('button').evaluateAll(es => es.filter(e => { const r = e.getBoundingClientRect(); return r.width < 40 || r.height < 40; }).map(e => e.textContent));
      assert.deepEqual(tiny, [], 'every view has 40px targets');
    };
    const detailCheck = async (scope, state, locale, theme, width, fullscreen) => {
      const tile = state === 'building' ? scope.locator('[data-facility-id]').first()
        : state === 'ground' ? scope.locator('[data-zone-template="bld.entrance_gate"]').first()
        : scope.locator('[data-zone-id]').first();
      assert.ok(await tile.count(), state + ' required real selectable tile');
      if (!fullscreen) await scope.locator('[data-blueprint-drawing]').evaluate(e => {
        const y = scrollY + e.getBoundingClientRect().top - 60;
        if (window.__masrLenis) window.__masrLenis.scrollTo(y, { immediate: true });
        else window.scrollTo({ top: y, behavior: 'instant' });
      });
      await page.evaluate(async () => {
        let previous = scrollY, stable = 0;
        for (let i = 0; i < 120 && stable < 5; i++) {
          await new Promise(requestAnimationFrame);
          stable = previous === scrollY ? stable + 1 : 0;
          previous = scrollY;
        }
      });
      await tile.evaluate(e => e.focus({ preventScroll: true }));
      const scroll = await page.evaluate(() => scrollY);
      await page.keyboard.press('Enter');
      const panel = scope.locator('[data-blueprint-detail]');
      await panel.waitFor();
      assert.equal(await page.evaluate(() => scrollY), scroll, 'detail opening does not scroll page');
      assert.equal(await panel.evaluate(e => e.contains(document.activeElement)), true, 'focus enters panel');
      assert.equal(await panel.locator('[data-detail-close]').evaluate(e => {
        const r = e.getBoundingClientRect();
        return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }), true, 'panel close is visible above sticky chrome');
      assert.equal(await tile.getAttribute('aria-pressed'), 'true', 'selected tile stays highlighted');
      const contrast = await panel.evaluate(e => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        const rgb = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
        const luminance = values => values.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        const background = luminance(rgb(getComputedStyle(e).backgroundColor));
        return Math.min(...['--text-primary', '--text-secondary'].map(token => {
          const foreground = luminance(rgb(getComputedStyle(e).getPropertyValue(token)));
          return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
        }));
      });
      assert.ok(contrast >= 4.5, `panel text tokens meet AA: ${contrast}`);
      const p = await panel.boundingBox(), d = await scope.locator('[data-blueprint-drawing]').boundingBox();
      const height = width === 390 ? 844 : width === 1280 ? 800 : 900;
      assert.ok(p.x >= -.5 && p.y >= -.5 && p.x + p.width <= width + .5 && p.y + p.height <= height + .5, JSON.stringify({ p, d, width, height }));
      if (width > 768) {
        assert.ok(p.x >= d.x - .5 && p.y >= d.y - .5 && p.x + p.width <= d.x + d.width + .5 && p.y + p.height <= d.y + d.height + .5, 'panel inside drawing');
        assert.ok(p.width <= d.width * .4 + 1, 'panel max 40%');
        assert.ok(Math.abs(locale === 'ar' ? p.x - d.x : p.x + p.width - d.x - d.width) < 2, 'opposite rail edge');
      } else {
        assert.ok(p.height <= height * .7 + 1 && Math.abs(p.y + p.height - height) < 2, 'phone bottom sheet max 70vh');
        assert.ok(Math.min(p.y, d.y + d.height) - Math.max(0, d.y) >= 40, 'drawing remains visible above phone sheet');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow');
      }
      assert.equal(await scope.locator('[data-blueprint-info] [data-blueprint-detail]').count(), 0);
      await capture(fullscreen ? scope : page, `detail-${fullscreen ? 'fullscreen' : 'inline'}-${state}-${locale}-${theme}-${width}`);
      // A second selection reuses the same panel DOM node.
      const tiles = state === 'building' ? scope.locator('[data-facility-id]') : scope.locator('[data-zone-id]');
      if (await tiles.count() > 1 && width > 768) {
        const handle = await panel.elementHandle();
        await tiles.nth(1).evaluate(e => e.focus({ preventScroll: true })); await page.keyboard.press('Enter');
        assert.equal(await handle.evaluate(e => e.isConnected), true, 'selection swaps in place');
      }
      await page.keyboard.press('Escape');
      await panel.waitFor({ state: 'detached' });
      const last = await tiles.count() > 1 && width > 768 ? tiles.nth(1) : tile;
      assert.equal(await last.evaluate(e => e === document.activeElement), true, 'Escape returns focus to tile');
      if (fullscreen) assert.equal(await scope.count(), 1, 'Escape closes panel before fullscreen');
      await tile.evaluate(e => e.focus({ preventScroll: true })); await page.keyboard.press('Enter'); await panel.waitFor();
      await panel.locator('[data-detail-close]').click(); await panel.waitFor({ state: 'detached' });
      assert.equal(await tile.evaluate(e => e === document.activeElement), true, 'X returns focus');
      await tile.evaluate(e => e.focus({ preventScroll: true })); await page.keyboard.press('Enter'); await panel.waitFor();
      await tile.evaluate(e => e.focus({ preventScroll: true })); await page.keyboard.press('Enter'); await panel.waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => scrollY), scroll, `detail close does not scroll: ${state} ${locale} ${theme} ${width} fullscreen=${fullscreen}`);
    };
    for (const locale of ['ar', 'en']) for (const theme of ['dark', 'light']) for (const width of [1440, 1280, 390]) {
      const height = width === 390 ? 844 : width === 1280 ? 800 : 900;
      await page.setViewportSize({ width, height });
      await page.goto(`${base}/${locale}/properties/${encodeURIComponent(slug)}`, { waitUntil: 'networkidle', timeout: 120000 });
      await page.evaluate(theme => { localStorage.setItem('theme', theme); document.documentElement.setAttribute('data-theme', theme); }, theme);
      const studio = page.locator('.blueprint-studio-root');
      const inline = studio.locator('section');
      const rail = inline.locator('[data-floor-rail]');
      const crumbs = inline.locator('nav');
      await rail.waitFor();
      assert.equal(await rail.locator('svg.fp-building-elevation').count(), 0);
      assert.equal(await inline.locator('.fp-building-elevation text').count(), 0, 'no broken Arabic labels');
      const floorKey = await rail.locator('button[data-floor-key]').evaluateAll(es => es.map(e => e.dataset.floorKey).find(k => /^Floor \d+$/.test(k)));
      assert.ok(floorKey, 'real typical floor recorded');
      const hit = inline.locator(`g[data-floor-key="${floorKey}"]`);
      const floorButton = rail.locator(`button[data-floor-key="${floorKey}"]`);
      await hit.hover();
      assert.equal(await floorButton.getAttribute('data-hovered'), 'true', 'drawing hover highlights rail');
      await floorButton.hover();
      assert.equal(await hit.getAttribute('data-hovered'), 'true', 'rail hover highlights drawing');
      await page.mouse.move(0, 0);
      await capture(studio, `building-${locale}-${theme}-${width}`);
      const states = ['building', 'floor', 'ground', 'unit'];
      for (const state of states) {
        if (state !== 'building') {
          if (state === 'floor') {
            await hit.click();
            assert.equal(new URL(page.url()).searchParams.get('bp'), `floor/${encodeURIComponent(floorKey)}`, 'drawing click navigates floor');
            await crumbs.locator('button').first().click();
            await hit.focus(); await page.keyboard.press('Enter');
            assert.match(await crumbs.innerText(), locale === 'ar' ? /الدور/ : /Floor/);
            assert.equal(new URL(page.url()).searchParams.get('bp'), `floor/${encodeURIComponent(floorKey)}`);
          } else if (state === 'ground') {
            await rail.locator('button[data-floor-key="bld_ground"]').click();
            assert.match(await crumbs.innerText(), locale === 'ar' ? /الأرضي/ : /Ground/);
          } else {
            await floorButton.click();
            await inline.locator('button[class*="__unit "]').first().click();
            assert.match(new URL(page.url()).searchParams.get('bp'), /^floor\/Floor%20\d+\/unit\/[^/]+$/);
            assert.equal(await crumbs.locator('button').count(), 2, 'unit has two ancestors');
          }
          await capture(studio, `${state}-${locale}-${theme}-${width}`);
        }
        await detailCheck(inline, state, locale, theme, width, false);
        const open = studio.locator('.cad-fullscreen-toggle-btn');
        const lenisWasStopped = await page.evaluate(() => window.__masrLenis?.isStopped ?? null);
        await open.click();
        const overlay = page.locator('.cad-fullscreen-portal-overlay');
        await overlay.waitFor();
        const scroll = await page.evaluate(() => scrollY);
        assert.equal(await overlay.evaluate(e => e.contains(document.activeElement)), true, 'focus enters fullscreen');
        assert.equal(await page.evaluate(() => window.__masrLenis ? window.__masrLenis.isStopped : true), true, 'Lenis stopped');
        await bounds(overlay);
        if (width === 1440) {
          const levels = overlay.locator('[data-floor-rail] button[data-floor-key]');
          const capacity = await overlay.locator('[data-floor-rail]').evaluate(e => {
            const rows = [...e.querySelectorAll('button[data-floor-key]')];
            return { available: e.clientHeight, eight: Math.max(...rows.map(row => row.getBoundingClientRect().height)) * 8 + parseFloat(getComputedStyle(e).rowGap) * 7 };
          });
          assert.ok(capacity.available >= capacity.eight, `fullscreen capacity for eight levels: ${JSON.stringify(capacity)}`);
          if (await levels.count() <= 8) {
            const visible = await levels.evaluateAll(es => es.every(e => { const a = e.getBoundingClientRect(), b = e.closest('[data-floor-rail]').getBoundingClientRect(); return a.top >= b.top - 1 && a.bottom <= b.bottom + 1; }));
            assert.ok(visible, 'up to eight fullscreen levels fit without scrolling');
          }
        }
        await detailCheck(overlay, state, locale, theme, width, true);
        if (width === 390) {
          const a = await overlay.locator('[data-floor-rail]').boundingBox(), b = await overlay.locator('[data-blueprint-drawing]').boundingBox();
          assert.ok(a.y + a.height <= b.y, 'mobile rail above drawing');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'phone document no horizontal overflow');
        }
        await page.mouse.move(0, 0);
        await capture(overlay, `fullscreen-${state}-${locale}-${theme}-${width}`);
        await page.keyboard.press('Escape');
        await overlay.waitFor({ state: 'detached' });
        assert.equal(await page.evaluate(() => scrollY), scroll, 'Escape restores scroll');
        assert.equal(await page.evaluate(() => document.body.classList.contains('cad-fullscreen-locked')), false);
        assert.equal(await open.evaluate(e => e === document.activeElement), true, 'focus returns to fullscreen trigger');
        assert.equal(await page.evaluate(() => window.__masrLenis?.isStopped ?? null), lenisWasStopped, 'Lenis previous state restored');
      }
      // URL hydration + history still use the production navigation.
      const unitUrl = page.url();
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await crumbs.locator('button').count(), 2);
      await crumbs.locator('button').first().click();
      await page.goBack();
      assert.equal(page.url(), unitUrl);
      assert.equal(await crumbs.locator('button').count(), 2);
      await page.goForward();
      assert.equal(await crumbs.locator('button').count(), 0);
      // Space, fullscreen navigation, close button, trap, all >=40px targets.
      await studio.locator('.cad-fullscreen-toggle-btn').click();
      const overlay = page.locator('.cad-fullscreen-portal-overlay');
      await overlay.locator(`g[data-floor-key="${floorKey}"]`).focus();
      await page.keyboard.press('Space');
      assert.equal(await overlay.count(), 1, 'floor navigation keeps fullscreen open');
      assert.match(await overlay.locator('nav').innerText(), locale === 'ar' ? /الدور/ : /Floor/);
      const tiny = await overlay.locator('button').evaluateAll(es => es.filter(e => { const r = e.getBoundingClientRect(); return r.width < 40 || r.height < 40; }).map(e => e.textContent));
      assert.deepEqual(tiny, [], '40px targets');
      const close = overlay.locator('.cad-fullscreen-close-btn');
      const focusable = overlay.locator('button:not(:disabled), [tabindex="0"]');
      await focusable.last().focus(); await page.keyboard.press('Tab');
      assert.equal(await focusable.first().evaluate(e => e === document.activeElement), true, 'Tab wraps inside dialog');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await focusable.last().evaluate(e => e === document.activeElement), true, 'Shift+Tab wraps inside dialog');
      await close.click(); await overlay.waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => document.body.classList.contains('cad-fullscreen-locked')), false);
      await inline.locator('button[class*="__unit "]').first().click();
      await studio.locator('.cad-fullscreen-toggle-btn').click();
      const request = page.locator('.cad-fullscreen-portal-overlay button[class*="__request"]');
      await request.click();
      await page.locator('.inquiry-close-btn').waitFor();
      assert.equal(await page.locator('.cad-fullscreen-portal-overlay').count(), 0, 'request opens inquiry after closing fullscreen');
      assert.match(await page.locator('.form-textarea').inputValue(), locale === 'ar' ? /استفسار عن شقة/ : /Inquiry about unit/);
      await page.locator('.inquiry-close-btn').click();
      if (width === 390) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'inline phone no horizontal overflow');
      console.log(`${locale} ${theme} ${width}: geometry, hover, keyboard, history, fullscreen navigation, scroll, focus verified`);
    }
    assert.deepEqual(errors, [], 'runtime errors');
    console.log(`${captures} screenshots; runtime errors 0`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
