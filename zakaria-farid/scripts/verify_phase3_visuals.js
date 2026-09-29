const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const VIEWPORTS = [
  { width: 1242, height: 930, name: '1242x930' },
  { width: 1376, height: 987, name: '1376x987' },
];

const ROUTES = [
  { name: 'properties', path: '/fin-os/ar/properties' },
  { name: 'construction', path: '/fin-os/ar/construction' },
  { name: 'calculator', path: '/fin-os/ar/calculator' },
  { name: 'contracts', path: '/fin-os/ar/contracts' },
  { name: 'pdc_vault', path: '/fin-os/ar/pdc' },
  { name: 'partners', path: '/fin-os/ar/partners' },
];

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results', 'screenshots');

async function runVisualVerification() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const results = [];
  console.log('--- STARTING PHASE 3 PLAYWRIGHT VISUAL VERIFICATION ---');

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: 'ar-EG',
      colorScheme: 'light',
    });

    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route.path}`;
      process.stdout.write(`  Visiting ${route.name} (${route.path})... `);

      try {
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
        const status = response ? response.status() : 'no-response';

        // Wait a beat for animations & counters to settle
        await page.waitForTimeout(1200);

        // Check RTL direction
        const dir = await page.evaluate(() => document.documentElement.getAttribute('dir') || document.body.getAttribute('dir'));
        
        // Check for any horizontal overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        // Capture screenshot
        const screenshotPath = path.join(SCREENSHOT_DIR, `${route.name}_${vp.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        console.log(`✓ OK (Status: ${status}, Dir: ${dir}, Overflow: ${hasHorizontalOverflow ? 'WARN' : 'None'})`);
        results.push({
          route: route.name,
          viewport: vp.name,
          status,
          dir,
          hasHorizontalOverflow,
          screenshot: screenshotPath,
          errors: [...consoleErrors],
        });
      } catch (err) {
        console.log(`✗ FAILED: ${err.message}`);
        results.push({
          route: route.name,
          viewport: vp.name,
          status: 'ERROR',
          error: err.message,
        });
      }
    }

    await context.close();
  }

  await browser.close();

  console.log('\n--- VERIFICATION SUMMARY ---');
  const allSuccessful = results.every(r => r.status === 200 && !r.hasHorizontalOverflow);
  console.log(`Total tests: ${results.length}, All Successful: ${allSuccessful}`);
  if (!allSuccessful) {
    console.log('Failures/Warnings:', results.filter(r => r.status !== 200 || r.hasHorizontalOverflow));
  }
}

runVisualVerification().catch(err => {
  console.error('Fatal error during visual verification:', err);
  process.exit(1);
});
