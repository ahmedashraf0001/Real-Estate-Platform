const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
// Called by the offline fixture/performance driver. Text-free screenshots stay in memory.
module.exports = async function captureGlass(page, base, shots) {
  fs.mkdirSync(shots, { recursive: true });
  for (const width of [1280, 390]) for (const theme of ['dark', 'light']) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.context().addCookies([{ name: 'zf_theme', value: theme, url: base }]);
    await page.addInitScript(theme => localStorage.setItem('zf_theme', theme), theme);
    for (const [name, route, panel] of [
      ['home', '/en', '.hero-title-glass-card'],
      ['properties', '/en/properties', '.card-content-overlay'],
      ['detail', '/en/properties/scroll-fixture-1', '.broker-card'],
      ['map', '/en/map', '.floating-glass-directory'],
    ]) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.locator(panel).first().waitFor();
      if (name === 'detail' || name === 'properties') await page.locator(panel).first().scrollIntoViewIfNeeded();
      await wait(1800);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} ${width} overflow`);
      await page.keyboard.press('Tab');
      assert.ok(await page.evaluate(() => document.activeElement !== document.body), 'keyboard focus');
      await page.screenshot({ path: path.join(shots, `${name}-${theme}-${width}.png`) });
      const nested = await page.evaluate(() => [...document.querySelectorAll('.app-root *')].filter(e => {
        if (getComputedStyle(e).backdropFilter === 'none') return false;
        for (let a = e.parentElement; a; a = a.parentElement) if (getComputedStyle(a).backdropFilter !== 'none') return true;
        return false;
      }).map(e => e.className));
      console.log('NESTED', name, theme, width, JSON.stringify(nested));
      const samples = await page.evaluate(panel => {
        const results = [];
        for (const selector of ['.nav-glass-capsule', panel, ...(panel === '.broker-card' ? ['.spec-stat-card', '.mobile-bottom-lead-bar'] : [])]) {
          const surface = document.querySelector(selector);
          if (!surface) continue;
          const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) {
            if (!/[\p{L}\p{N}]/u.test(node.textContent) || ['STYLE', 'SCRIPT'].includes(node.parentElement.tagName)) continue;
            if (node.parentElement.closest('.luxury-brand-logo')) continue; // Branding is excluded from WCAG body-text contrast.
            const parent = node.parentElement, style = getComputedStyle(parent);
            const range = document.createRange(); range.selectNodeContents(node);
            const raw = range.getBoundingClientRect();
            let left = raw.left, top = raw.top, right = raw.right, bottom = raw.bottom;
            for (let a = parent; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
              const clip = getComputedStyle(a), bounds = a.getBoundingClientRect();
              if (/(hidden|auto|scroll|clip)/.test(clip.overflowX)) { left = Math.max(left, bounds.left+a.clientLeft); right = Math.min(right, bounds.left+a.clientLeft+a.clientWidth); }
              if (/(hidden|auto|scroll|clip)/.test(clip.overflowY)) { top = Math.max(top, bounds.top+a.clientTop); bottom = Math.min(bottom, bounds.top+a.clientTop+a.clientHeight); }
            }
            const rect = { x: left, y: top, left, top, right, bottom, width: right-left, height: bottom-top };
            if (rect.width < 2 || rect.height < 2 || rect.top < 0 || rect.bottom > innerHeight || rect.left < 0 || rect.right > innerWidth) continue;
            let opacity = 1;
            for (let e = parent; e; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
            if (opacity === 0) continue;
            results.push({ surface: selector, text: node.textContent.trim(), color: style.color, fill: style.webkitTextFillColor, gradient: style.backgroundClip === 'text' ? style.backgroundImage : null, size: parseFloat(style.fontSize), opacity,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } });
          }
        }
        return results;
      }, panel);
      const originalStyles = await page.evaluate(() => [...document.querySelectorAll('.app-root, .app-root *, .mobile-bottom-lead-bar, .mobile-bottom-lead-bar *')].map(e => {
        const original = e.getAttribute('style');
        if (getComputedStyle(e).backgroundClip === 'text') e.style.setProperty('background-image', 'none', 'important');
        for (const prop of ['color', '-webkit-text-fill-color']) e.style.setProperty(prop, 'transparent', 'important');
        e.style.setProperty('text-shadow', 'none', 'important');
        return original;
      }));
      const backdrop = await page.screenshot();
      await page.evaluate(styles => [...document.querySelectorAll('.app-root, .app-root *, .mobile-bottom-lead-bar, .mobile-bottom-lead-bar *')].forEach((e,i) => {
        if (styles[i] === null) e.removeAttribute('style'); else e.setAttribute('style', styles[i]);
      }), originalStyles);
      const { data, info } = await sharp(backdrop).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const summaries = {};
      for (const sample of samples) {
        const values = [];
        const { x, y, width: w, height: h } = sample.rect;
        for (let j = Math.ceil(y); j < Math.min(info.height, y+h); j++) for (let i = Math.ceil(x); i < Math.min(info.width, x+w); i++) {
          const offset = (j * info.width + i) * 3;
          const rgb = [...data.subarray(offset, offset+3)]; values.push({ rgb, l: luminance(rgb) });
        }
        values.sort((a,b) => a.l-b.l);
        const background = values[Math.floor(values.length * .95)];
        if (!background) continue;
        const colors = sample.gradient?.match(/rgba?\([^)]*\)/g) || [sample.fill || sample.color];
        const rgba = colors.map(c => c.match(/[\d.]+/g).map(Number)).sort((a,b) => luminance(a.slice(0,3))-luminance(b.slice(0,3)))[0];
        const alpha = (rgba[3] ?? 1) * sample.opacity;
        const ink = rgba.slice(0,3).map((v,i) => alpha*v + (1-alpha)*background.rgb[i]);
        const l = luminance(ink), ratio = (Math.max(l, background.l)+.05)/(Math.min(l, background.l)+.05);
        const tier = sample.size >= 24 ? 'large' : 'body';
        const key = sample.surface + ' ' + tier;
        if (!summaries[key] || summaries[key].ratio > ratio) summaries[key] = { ...sample, p95: background.rgb, ratio };
      }
      console.log('CONTRAST', name, theme, width, JSON.stringify(Object.fromEntries(Object.entries(summaries).map(([key, value]) => [key, { color: value.gradient || value.fill || value.color, p95: value.p95, ratio: value.ratio }]))));
      assert.ok(Object.keys(summaries).some(key => key.startsWith(panel)), `${panel} visible text sample required`);
      for (const [key, sample] of Object.entries(summaries)) assert.ok(sample.ratio >= (key.endsWith('large') ? 3 : 4.5), `${name} ${theme} ${width} ${key}: ${sample.ratio}`);
      assert.deepEqual(nested, [], 'only outer glass blurs');
      if (name === 'map') {
        await page.locator('.dir-search-input').fill('site-glass-no-match');
        await page.getByText('No properties available yet', { exact: true }).waitFor();
        assert.equal(await page.locator('.floating-estate-card').count(), 0);
        await page.screenshot({ path: path.join(shots, `map-empty-${theme}-${width}.png`) });
        await page.locator('.dir-search-input').fill('');
        assert.equal(await page.locator('.floating-estate-card').count(), 18);
      }
      if (name === 'detail') {
        await page.locator('.broker-primary-btn').click();
        const modal = page.locator('.inquiry-modal-card');
        await modal.waitFor();
        assert.equal(await modal.evaluate(e => getComputedStyle(e).backdropFilter), 'none', 'modal reuses outer blur');
        await page.screenshot({ path: path.join(shots, `inquiry-${theme}-${width}.png`) });
        const fields = modal.locator('.form-input');
        await fields.nth(0).fill('Offline capture');
        await fields.nth(1).fill('01012345678');
        let posts = 0;
        await page.route('**/api/leads', async route => {
          assert.equal(route.request().method(), 'POST'); posts++;
          await wait(1000);
          await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Capture rejected inquiry' }) });
        });
        await modal.locator('.submit-inquiry-btn').click();
        assert.equal(await modal.locator('.submit-inquiry-btn').isDisabled(), true, 'loading disables submit');
        await page.screenshot({ path: path.join(shots, `inquiry-loading-${theme}-${width}.png`) });
        await page.getByText('Capture rejected inquiry', { exact: true }).waitFor();
        assert.equal(posts, 1, 'one intercepted submit; no database writes');
        assert.equal(await modal.locator('.submit-inquiry-btn').isDisabled(), false, 'failure allows retry');
        await page.screenshot({ path: path.join(shots, `inquiry-error-${theme}-${width}.png`) });
        await modal.locator('.inquiry-close-btn').click();
        await modal.waitFor({ state: 'hidden' });
        await page.unroute('**/api/leads');
      }

    }
    await page.goto(base + '/ar/properties', { waitUntil: 'networkidle' });
    await page.locator('.card-content-overlay').first().scrollIntoViewIfNeeded(); await wait(1800);
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'RTL overflow');
    await page.screenshot({ path: path.join(shots, `properties-ar-${theme}-${width}.png`) });
  }
};
