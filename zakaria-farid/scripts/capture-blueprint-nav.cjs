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
        return [...e.querySelectorAll('button')].filter(b => {
          const r = b.getBoundingClientRect();
          return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1;
        }).map(b => b.textContent);
      });
      assert.deepEqual(clippedTiles, [], 'plan tiles fully fit drawing card');
      const overlappingTiles = await overlay.locator('[data-blueprint-drawing] button').evaluateAll(es => {
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
      if (width !== 1280) await capture(studio, `building-${locale}-${theme}-${width}`);
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
          if (width !== 1280) await capture(studio, `${state}-${locale}-${theme}-${width}`);
        }
        const open = studio.locator('.cad-fullscreen-toggle-btn');
        const lenisWasStopped = await page.evaluate(() => window.__masrLenis?.isStopped ?? null);
        await open.click();
        const overlay = page.locator('.cad-fullscreen-portal-overlay');
        await overlay.waitFor();
        const scroll = await page.evaluate(() => scrollY);
        assert.equal(await overlay.evaluate(e => e.contains(document.activeElement)), true, 'focus enters fullscreen');
        assert.equal(await page.evaluate(() => window.__masrLenis ? window.__masrLenis.isStopped : true), true, 'Lenis stopped');
        await bounds(overlay);
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
