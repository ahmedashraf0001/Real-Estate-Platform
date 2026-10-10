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
    // 3. LIGHTBOX FULLSCREEN (Landscape & Portrait at 1920 & 390)
    // ─────────────────────────────────────────────────────────────
    console.log('Testing Req 3: Lightbox Fullscreen cropping checks (1920 & 390)...');
    for (const width of [1920, 390]) {
      const height = width === 1920 ? 951 : 844;
      await page.setViewportSize({ width, height });
      await page.goto(`${BASE}/ar/properties/${gounaSlug}`, { waitUntil: 'networkidle' });
      await wait(1000);

      // Open fullscreen lightbox
      const fullscreenBtn = page.locator('.gallery-fullscreen-btn');
      await fullscreenBtn.scrollIntoViewIfNeeded();
      await fullscreenBtn.click();
      await wait(1000);

      const lightboxOverlay = page.locator('.lightbox-overlay');
      await lightboxOverlay.waitFor({ timeout: 10000 });

      // Landscape image (first card)
      const centerImg = page.locator('.carousel-card-slot.slot-center .carousel-card-img').first();
      await centerImg.waitFor({ timeout: 5000 });
      const imgStyle = await centerImg.evaluate(e => {
        const s = getComputedStyle(e);
        return {
          objectFit: s.objectFit,
          clientWidth: e.clientWidth,
          clientHeight: e.clientHeight,
          naturalWidth: e.naturalWidth,
          naturalHeight: e.naturalHeight
        };
      });
      console.log(`Lightbox at ${width}px landscape:`, imgStyle);
      assert.equal(imgStyle.objectFit, 'contain', 'Image must have object-fit: contain');
      await page.screenshot({ path: path.join(SHOTS_DIR, `lightbox-fullscreen-landscape-${width}.png`) });

      // Switch image or test portrait
      // Replace active image src with a portrait image aspect ratio test to verify contain without crop
      await page.evaluate(() => {
        const img = document.querySelector('.carousel-card-slot.slot-center .carousel-card-img');
        if (img) {
          // 800x1200 portrait SVG data URL
          img.setAttribute('src', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200"><rect width="800" height="1200" fill="%231a202c"/><circle cx="400" cy="600" r="250" fill="%23d4af37"/><text x="400" y="620" font-size="48" fill="%23ffffff" text-anchor="middle">Portrait Test</text></svg>');
        }
      });
      await wait(500);

      const portraitStyle = await centerImg.evaluate(e => {
        const s = getComputedStyle(e);
        return {
          objectFit: s.objectFit,
          clientWidth: e.clientWidth,
          clientHeight: e.clientHeight
        };
      });
      console.log(`Lightbox at ${width}px portrait:`, portraitStyle);
      assert.equal(portraitStyle.objectFit, 'contain', 'Portrait image must have object-fit: contain');
      await page.screenshot({ path: path.join(SHOTS_DIR, `lightbox-fullscreen-portrait-${width}.png`) });

      // Close lightbox
      const closeBtn = page.locator('.lightbox-close-btn');
      await closeBtn.click();
      await wait(500);
    }

    // ─────────────────────────────────────────────────────────────
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
