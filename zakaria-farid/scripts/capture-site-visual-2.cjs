const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const sharp = require('sharp');

const option = name => process.argv.indexOf(name) !== -1 ? process.argv[process.argv.indexOf(name) + 1] : undefined;
const BASE = option('--base') || 'http://localhost:51103';
const SHOTS_DIR = path.resolve(option('--shots') || path.resolve(__dirname, '../../.agents/runs/site-visual-2/shots'));

fs.mkdirSync(SHOTS_DIR, { recursive: true });

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);

async function measureContrast(page, selector, theme) {
  const samples = await page.evaluate(sel => {
    const surface = document.querySelector(sel);
    if (!surface) return [];
    const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
    const results = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (!text || !/[\p{L}\p{N}]/u.test(text)) continue;
      const parent = node.parentElement;
      if (['STYLE', 'SCRIPT'].includes(parent.tagName)) continue;
      const style = getComputedStyle(parent);
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      results.push({
        text,
        color: style.color,
        fontSize: parseFloat(style.fontSize),
        fontWeight: style.fontWeight,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      });
    }
    return results;
  }, selector);

  const originalStyles = await page.evaluate(() => [...document.querySelectorAll('.app-root, .app-root *, .catalog-cards-grid, .catalog-cards-grid *')].map(e => {
    const original = e.getAttribute('style');
    if (getComputedStyle(e).backgroundClip === 'text') e.style.setProperty('background-image', 'none', 'important');
    for (const prop of ['color', '-webkit-text-fill-color']) e.style.setProperty(prop, 'transparent', 'important');
    e.style.setProperty('text-shadow', 'none', 'important');
    return original;
  }));
  const backdrop = await page.screenshot();
  await page.evaluate(styles => [...document.querySelectorAll('.app-root, .app-root *, .catalog-cards-grid, .catalog-cards-grid *')].forEach((e, i) => {
    if (styles[i] === null) e.removeAttribute('style'); else e.setAttribute('style', styles[i]);
  }), originalStyles);

  const { data, info } = await sharp(backdrop).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const metrics = [];
  for (const s of samples) {
    const { x, y, width: w, height: h } = s.rect;
    const values = [];
    for (let j = Math.max(0, Math.ceil(y)); j < Math.min(info.height, y + h); j++) {
      for (let i = Math.max(0, Math.ceil(x)); i < Math.min(info.width, x + w); i++) {
        const offset = (j * info.width + i) * 3;
        const rgb = [...data.subarray(offset, offset + 3)];
        values.push({ rgb, l: luminance(rgb) });
      }
    }
    if (!values.length) continue;
    values.sort((a, b) => a.l - b.l);
    // Dark mode: text is light, check against the brightest background spot (worst case)
    // Light mode: text is dark, check against the darkest background spot (worst case)
    const bg = theme === 'dark' ? values[Math.floor(values.length * 0.95)] : values[Math.floor(values.length * 0.05)];
    const textMatch = s.color.match(/[\d.]+/g);
    if (!textMatch) continue;
    const textRgb = textMatch.slice(0, 3).map(Number);
    const textL = luminance(textRgb);
    const ratio = (Math.max(textL, bg.l) + 0.05) / (Math.min(textL, bg.l) + 0.05);
    metrics.push({
      text: s.text.substring(0, 30),
      color: s.color,
      fontSize: s.fontSize,
      ratio: Number(ratio.toFixed(2)),
      bgRgb: bg.rgb
    });
  }
  return metrics;
}

async function assertFullscreenImage(page, image, fixture) {
  await image.evaluate(e => e.decode());
  await page.waitForFunction(() => {
    const image = document.querySelector('.carousel-card-slot.slot-center .carousel-card-img');
    if (!image || !image.complete || !image.naturalWidth) return false;
    for (let e = image; e; e = e.parentElement) {
      if (Number(getComputedStyle(e).opacity) < 0.999) return false;
    }
    return true;
  });
  const geometry = await image.evaluate(e => {
    const box = e.getBoundingClientRect();
    const style = getComputedStyle(e);
    const scale = style.objectFit === 'cover'
      ? Math.max(box.width / e.naturalWidth, box.height / e.naturalHeight)
      : Math.min(box.width / e.naturalWidth, box.height / e.naturalHeight);
    const width = e.naturalWidth * scale, height = e.naturalHeight * scale;
    const content = { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
    const clips = [{ x: 0, y: 0, width: innerWidth, height: innerHeight }];
    for (let ancestor = e; ancestor; ancestor = ancestor.parentElement) {
      const css = getComputedStyle(ancestor);
      if (ancestor === e || /(hidden|clip|scroll|auto)/.test(css.overflowX + css.overflowY)) {
        const rect = ancestor.getBoundingClientRect();
        clips.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      }
    }
    const top = document.querySelector('.lightbox-top-bar').getBoundingClientRect();
    const bottom = document.querySelector('.lightbox-bottom-dock').getBoundingClientRect();
    return { naturalWidth: e.naturalWidth, naturalHeight: e.naturalHeight, content, clips, topBottom: top.bottom, bottomTop: bottom.top };
  });
  assert.equal(geometry.naturalWidth, fixture.width, 'Fixture must decode at its expected width');
  assert.equal(geometry.naturalHeight, fixture.height, 'Fixture must decode at its expected height');
  const { content } = geometry;
  for (const clip of geometry.clips) {
    assert.ok(content.x >= clip.x - 1 && content.y >= clip.y - 1 &&
      content.x + content.width <= clip.x + clip.width + 1 &&
      content.y + content.height <= clip.y + clip.height + 1, 'Full image content must be unclipped');
  }
  assert.ok(content.y >= geometry.topBottom - 1 && content.y + content.height <= geometry.bottomTop + 1,
    'Full image content must fit between fullscreen controls');
  const screenshot = await page.screenshot();
  const { data, info } = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const mark of fixture.marks) {
    const x = Math.round(content.x + mark.x / fixture.width * content.width);
    const y = Math.round(content.y + mark.y / fixture.height * content.height);
    const pixel = [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
    // The floating header casts a shadow over top marks: compare hue, retaining a visible brightness floor.
    const peak = Math.max(...pixel), expectedPeak = Math.max(...mark.rgb);
    assert.ok(peak >= 100 && pixel.every((value, i) => Math.abs(value / peak - mark.rgb[i] / expectedPeak) <= 0.08),
      `${mark.name} corner must be visible: ${pixel}`);
  }
  return { screenshot, geometry };
}

async function run() {
  console.log(`Connecting to ${BASE}...`);
  console.log(`Saving screenshots to ${SHOTS_DIR}...`);

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const gounaSlug = encodeURIComponent('el-gouna-marina-residential-building-عمارة-شقق-بالجونة-bqycxm');

    // ─────────────────────────────────────────────────────────────
    // 1. CATALOG CARDS (Light + Dark, 1920)
    // ─────────────────────────────────────────────────────────────
    console.log('Testing Req 1: Catalog cards at 1920x951 (Dark & Light)...');
    await page.setViewportSize({ width: 1920, height: 951 });

    // Dark
    await page.goto(`${BASE}/ar/properties`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.cookie = 'zf_theme=dark; path=/';
    });
    await wait(1000);
    const cardOverlayDark = page.locator('.catalog-cards-grid .property-card .card-content-overlay').first();
    await cardOverlayDark.waitFor({ timeout: 10000 });
    await cardOverlayDark.scrollIntoViewIfNeeded();
    await wait(1000);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'catalog-cards-dark-1920.png') });
    const darkMetrics = await measureContrast(page, '.catalog-cards-grid .property-card .card-content-overlay', 'dark');
    console.log('Dark Catalog Card Overlay Contrast Samples:');
    darkMetrics.slice(0, 6).forEach(m => console.log(`  - "${m.text}": ratio ${m.ratio} (color: ${m.color}, fontSize: ${m.fontSize}px)`));
    for (const m of darkMetrics.slice(0, 6)) {
      const minRatio = m.fontSize >= 18 ? 3.0 : 4.5;
      assert.ok(m.ratio >= minRatio, `Dark mode text "${m.text}" ratio ${m.ratio} must meet WCAG AA (>= ${minRatio})`);
    }

    // Light
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.cookie = 'zf_theme=light; path=/';
    });
    await wait(1000);
    const cardOverlayLight = page.locator('.catalog-cards-grid .property-card .card-content-overlay').first();
    await cardOverlayLight.scrollIntoViewIfNeeded();
    await wait(1000);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'catalog-cards-light-1920.png') });
    const lightMetrics = await measureContrast(page, '.catalog-cards-grid .property-card .card-content-overlay', 'light');
    console.log('Light Catalog Card Overlay Contrast Samples:');
    lightMetrics.slice(0, 6).forEach(m => console.log(`  - "${m.text}": ratio ${m.ratio} (color: ${m.color}, fontSize: ${m.fontSize}px)`));
    for (const m of lightMetrics.slice(0, 6)) {
      const minRatio = m.fontSize >= 18 ? 3.0 : 4.5;
      assert.ok(m.ratio >= minRatio, `Light mode text "${m.text}" ratio ${m.ratio} must meet WCAG AA (>= ${minRatio})`);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. GOUNA BLUEPRINT (Ground floor vs Typical floor at 1920 & 1280)
    // ─────────────────────────────────────────────────────────────
    console.log('Testing Req 2: Gouna Blueprint Ground Floor vs Typical Floor (1920 & 1280)...');
    for (const width of [1920, 1280]) {
      const height = width === 1920 ? 951 : 800;
      await page.setViewportSize({ width, height });

      // Ground floor (?bp=floor%2Fbld_ground)
      await page.goto(`${BASE}/ar/properties/${gounaSlug}?bp=floor%2Fbld_ground`, { waitUntil: 'networkidle' });
      await wait(1500);
      const groundFloorPlan = page.locator('div[class*="floorPlan"]').first();
      await groundFloorPlan.waitFor({ timeout: 10000 });
      await groundFloorPlan.scrollIntoViewIfNeeded();
      await wait(800);
      const groundBox = await groundFloorPlan.boundingBox();
      await page.screenshot({ path: path.join(SHOTS_DIR, `gouna-ground-floor-${width}.png`) });

      // Typical floor (?bp=floor%2FFloor%202)
      await page.goto(`${BASE}/ar/properties/${gounaSlug}?bp=floor%2FFloor%202`, { waitUntil: 'networkidle' });
      await wait(1500);
      const typicalFloorPlan = page.locator('div[class*="floorPlan"]').first();
      await typicalFloorPlan.waitFor({ timeout: 10000 });
      await typicalFloorPlan.scrollIntoViewIfNeeded();
      await wait(800);
      const typicalBox = await typicalFloorPlan.boundingBox();
      await page.screenshot({ path: path.join(SHOTS_DIR, `gouna-typical-floor-${width}.png`) });

      console.log(`Blueprint at ${width}px: Ground Floor Height = ${groundBox?.height}px, Typical Floor Height = ${typicalBox?.height}px`);
      assert.ok(groundBox && typicalBox, 'Both floor plans must have bounding boxes');
      assert.ok(groundBox.height <= typicalBox.height + 30, `Ground floor (${groundBox.height}px) must not be taller than typical floor (${typicalBox.height}px) at ${width}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. LIGHTBOX FULLSCREEN (Landscape & Portrait at 1920, 1280 & 390)
    // ─────────────────────────────────────────────────────────────
    console.log('Testing Req 3: decoded fullscreen landscape and portrait (1920, 1280, 390)...');
    for (const width of [1920, 1280, 390]) {
      const height = width === 1920 ? 951 : width === 1280 ? 800 : 844;
      await page.setViewportSize({ width, height });
      await page.goto(`${BASE}/ar/properties/${gounaSlug}`, { waitUntil: 'networkidle' });
      const imageUrl = await page.locator('.main-hero-img').first().evaluate(e => e.currentSrc || e.src);
      assert.ok(imageUrl, 'Production gallery must expose an image URL');
      for (const orientation of ['landscape', 'portrait']) {
        const fixture = { width: orientation === 'landscape' ? 1200 : 800, height: orientation === 'landscape' ? 800 : 1200 };
        assert.ok(orientation === 'landscape' ? fixture.width > fixture.height : fixture.height > fixture.width);
        fixture.marks = [
          { name: 'TL', x: 48, y: 48, rgb: [240, 40, 40] },
          { name: 'TR', x: fixture.width - 48, y: 48, rgb: [40, 220, 60] },
          { name: 'BL', x: 48, y: fixture.height - 48, rgb: [40, 80, 240] },
          { name: 'BR', x: fixture.width - 48, y: fixture.height - 48, rgb: [240, 220, 40] }
        ];
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fixture.width}" height="${fixture.height}"><rect width="100%" height="100%" fill="#243344"/><rect x="4" y="4" width="${fixture.width - 8}" height="${fixture.height - 8}" fill="none" stroke="white" stroke-width="8"/>${fixture.marks.map(m => `<rect x="${m.x - 32}" y="${m.y - 32}" width="64" height="64" fill="rgb(${m.rgb})"/>`).join('')}<text x="50%" y="50%" text-anchor="middle" fill="white" font-size="48">${orientation} ${fixture.width} x ${fixture.height}</text></svg>`;
        const body = await sharp(Buffer.from(svg)).png().toBuffer();
        await page.route(imageUrl, route => route.fulfill({ status: 200, contentType: 'image/png', body }));
        try {
          await page.reload({ waitUntil: 'networkidle' });
          const fullscreen = page.locator('.gallery-fullscreen-btn');
          await fullscreen.scrollIntoViewIfNeeded();
          await fullscreen.click();
          const image = page.locator('.carousel-card-slot.slot-center .carousel-card-img').first();
          await image.waitFor({ state: 'visible' });
          await wait(800);
          const green = await assertFullscreenImage(page, image, fixture);
          console.log(`GREEN fullscreen ${orientation} ${width}x${height}:`, green.geometry);
          await image.evaluate(e => e.style.setProperty('object-fit', 'cover', 'important'));
          let red;
          try { await assertFullscreenImage(page, image, fixture); } catch (error) { red = error; }
          await image.evaluate(e => e.style.removeProperty('object-fit'));
          assert.ok(red && /unclipped|corner must be visible/.test(red.message), 'Checker must reject cover cropping');
          console.log(`RED cover ${orientation} ${width}: ${red.message}`);
          fs.writeFileSync(path.join(SHOTS_DIR, `lightbox-fullscreen-${orientation}-${width}.png`), green.screenshot);
          const close = page.locator('.lightbox-close-btn');
          await close.focus();
          assert.ok(await close.evaluate(e => document.activeElement === e), 'Fullscreen close must accept keyboard focus');
          await page.keyboard.press('Enter');
          await page.locator('.lightbox-overlay').waitFor({ state: 'hidden' });
        } finally {
          await page.unroute(imageUrl);
        }
      }
    }

    // 4 & 5. /ar/map SATELLITE & DIRECTORY (1920, 1280, 390)
    // ─────────────────────────────────────────────────────────────
    console.log('Testing Req 4 & 5: Map directory & Satellite layers (1920, 1280, 390)...');
    for (const width of [1920, 1280, 390]) {
      const height = width === 1920 ? 951 : width === 1280 ? 800 : 844;
      await page.setViewportSize({ width, height });
      await page.goto(`${BASE}/ar/map`, { waitUntil: 'networkidle' });
      await wait(2000);

      const directory = page.locator('.floating-glass-directory');
      await directory.waitFor({ timeout: 10000 });

      if (width >= 993) {
        // Desktop / tablet: check full viewport height and no overlap with navbar
        const dirBox = await directory.boundingBox();
        const navbar = page.locator('.nav-glass-capsule');
        const navBox = await navbar.boundingBox();
        console.log(`Map at ${width}px: Dir Box =`, dirBox, `Nav Box =`, navBox);

        assert.ok(dirBox, 'Directory must have bounding box');
        assert.ok(dirBox.height > height * 0.75, `Directory should take majority of viewport height: got ${dirBox.height} for viewport ${height}`);

        if (navBox) {
          // Check collision
          const overlapX = !(dirBox.x + dirBox.width <= navBox.x || navBox.x + navBox.width <= dirBox.x);
          const overlapY = !(dirBox.y + dirBox.height <= navBox.y || navBox.y + navBox.height <= dirBox.y);
          const overlaps = overlapX && overlapY;
          console.log(`Directory and Navbar overlap at ${width}px:`, overlaps);
          assert.equal(overlaps, false, `Navbar and Directory must NOT overlap at ${width}px`);
        }
      }

      // Check satellite layer URL: exactly 1 tile layer, no Reference URLs
      const tileUrls = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.leaflet-tile-pane img')].map(img => img.src);
        return tiles;
      });
      const hasReferenceTiles = tileUrls.some(u => u.includes('Reference') || u.includes('Transportation'));
      console.log(`Map at ${width}px tile samples: ${tileUrls.length} tiles, hasReference: ${hasReferenceTiles}`);
      assert.equal(hasReferenceTiles, false, 'Satellite view must NOT fetch Reference/Transportation tile layers');

      await page.screenshot({ path: path.join(SHOTS_DIR, `map-satellite-directory-${width}.png`) });
    }

    // ─────────────────────────────────────────────────────────────
    // 6. NAVBAR TOP STATE ON /ar HOME (1920, Dark & Light)
    // ─────────────────────────────────────────────────────────────
    console.log('Testing Req 6: Navbar Top State on /ar home at 1920x951 (Dark & Light)...');
    await page.setViewportSize({ width: 1920, height: 951 });

    for (const theme of ['dark', 'light']) {
      await page.goto(`${BASE}/ar`, { waitUntil: 'networkidle' });
      await page.evaluate(t => {
        document.documentElement.setAttribute('data-theme', t);
        document.cookie = `zf_theme=${t}; path=/`;
        window.scrollTo(0, 0);
      }, theme);
      await wait(1000);

      const navCapsule = page.locator('.nav-glass-capsule');
      await navCapsule.waitFor({ timeout: 10000 });

      // State at scrollY 0
      const topStyles = await navCapsule.evaluate(e => {
        const s = getComputedStyle(e);
        return {
          classList: Array.from(e.classList),
          backgroundColor: s.backgroundColor,
          borderWidth: s.borderWidth,
          borderStyle: s.borderStyle,
          borderColor: s.borderColor,
          boxShadow: s.boxShadow,
          backdropFilter: s.backdropFilter
        };
      });
      console.log(`Navbar Top State (${theme}):`, topStyles);
      assert.ok(topStyles.classList.includes('hero-blended'), 'Capsule must have hero-blended class at scroll 0');
      assert.ok(
        topStyles.backgroundColor === 'rgba(0, 0, 0, 0)' || topStyles.backgroundColor === 'transparent',
        `Top state must have transparent background, got: ${topStyles.backgroundColor}`
      );
      assert.ok(
        topStyles.boxShadow === 'none' || topStyles.boxShadow === '',
        `Top state must have no box-shadow, got: ${topStyles.boxShadow}`
      );
      assert.ok(
        topStyles.backdropFilter === 'none' || topStyles.backdropFilter === '',
        `Top state must have no backdrop-filter, got: ${topStyles.backdropFilter}`
      );

      await page.screenshot({ path: path.join(SHOTS_DIR, `home-navbar-top-${theme}-1920.png`) });

      // Scrolled state
      await page.evaluate(() => window.scrollTo(0, 300));
      await wait(800);

      const scrolledStyles = await navCapsule.evaluate(e => {
        const s = getComputedStyle(e);
        return {
          classList: Array.from(e.classList),
          backgroundColor: s.backgroundColor,
          boxShadow: s.boxShadow,
          backdropFilter: s.backdropFilter
        };
      });
      console.log(`Navbar Scrolled State (${theme}):`, scrolledStyles);
      assert.ok(!scrolledStyles.classList.includes('hero-blended'), 'Scrolled capsule must NOT have hero-blended class');
      assert.ok(
        scrolledStyles.backdropFilter !== 'none' && scrolledStyles.backdropFilter !== '',
        `Scrolled capsule must have active backdropFilter, got: ${scrolledStyles.backdropFilter}`
      );

      await page.screenshot({ path: path.join(SHOTS_DIR, `home-navbar-scrolled-${theme}-1920.png`) });
    }

    // ─────────────────────────────────────────────────────────────
    // HORIZONTAL OVERFLOW CHECK AT 390
    // ─────────────────────────────────────────────────────────────
    console.log('Verifying no horizontal overflow at 390px across all routes...');
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ['/ar', '/ar/properties', `/ar/properties/${gounaSlug}`, '/ar/map']) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await wait(1000);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      console.log(`Route ${route} at 390px has horizontal overflow:`, overflow);
      assert.equal(overflow, false, `Route ${route} must have NO horizontal overflow at 390px`);
    }

    console.log('ALL VISUAL VERIFICATIONS AND SCREENSHOTS COMPLETED SUCCESSFULLY!');

  } catch (err) {
    console.error('Error during capture:', err);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}

run().catch(e => {
  console.error('Fatal execution error:', e);
  process.exit(1);
});
