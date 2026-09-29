const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('/usr/bin/google-chrome') 
  ? '/usr/bin/google-chrome' 
  : path.join(__dirname, '../chrome/linux-152.0.7977.82/chrome-linux64/chrome');
const BASE_URL = 'http://localhost:3000';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  const shotsDir = path.join(process.cwd(), 'shots');

  await page.setViewport({ width: 1750, height: 924, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/fin-os/ar/contracts`, { waitUntil: 'networkidle2', timeout: 30000 });

  // Dismiss any tours
  await page.evaluate(() => {
    localStorage.setItem('zf_fin_os_tour_completed_v1', 'dismissed');
    localStorage.setItem('zf_tour_dismissed', 'true');
    document.querySelectorAll('[class*="tourOverlay"], [class*="guidedTour"]').forEach(el => el.remove());
  });

  await new Promise(r => setTimeout(r, 2000));

  // 1. Capture base 1750
  await page.screenshot({ path: path.join(shotsDir, 'contracts_refined_all.png') });
  console.log('Captured contracts_refined_all.png');

  // 2. Click 'متأخر' (Overdue)
  const buttons = await page.$$('button[role="tab"]');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('متأخر')) {
      console.log('Clicking overdue tab...');
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(shotsDir, 'contracts_refined_overdue.png') });
  console.log('Captured contracts_refined_overdue.png');

  // 3. Click 'جاهز للتسليم' (Handover)
  const buttons2 = await page.$$('button[role="tab"]');
  for (const btn of buttons2) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('جاهز للتسليم')) {
      console.log('Clicking handover tab...');
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(shotsDir, 'contracts_refined_handover.png') });
  console.log('Captured contracts_refined_handover.png');

  // 4. Click 'فسخ وتسويات' (Rescissions)
  const buttons3 = await page.$$('button[role="tab"]');
  for (const btn of buttons3) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('فسخ وتسويات')) {
      console.log('Clicking rescissions tab...');
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(shotsDir, 'contracts_refined_rescissions.png') });
  console.log('Captured contracts_refined_rescissions.png');

  // Capture side widget close up
  const sideWidgets = await page.$('#zf-workstation-side-widgets');
  if (sideWidgets) {
    await sideWidgets.screenshot({ path: path.join(shotsDir, 'side_widgets_refined.png') });
    console.log('Captured side_widgets_refined.png');
  }

  await browser.close();
  console.log('All filter verification screenshots captured!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
