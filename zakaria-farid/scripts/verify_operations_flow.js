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

  console.log('Setting viewport to 1376x987...');
  await page.setViewport({ width: 1376, height: 987, deviceScaleFactor: 1 });

  console.log('Navigating to login page...');
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle2', timeout: 30000 });

  const emailInput = await page.$('#admin-email');
  if (emailInput) {
    console.log('Logging in as admin...');
    await page.type('#admin-email', 'zakariafarid@gmail.com');
    await page.type('#admin-password', 'Admin123456!');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
  }

  const targetUrl = `${BASE_URL}/fin-os/ar/operations`;
  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  // Dismiss tour modal
  await page.evaluate(() => {
    localStorage.setItem('zf_fin_os_tour_completed_v1', 'dismissed');
    const closeBtn = document.querySelector('button[title="إغلاق"], button[title="Dismiss"]');
    if (closeBtn) closeBtn.click();
  }).catch(() => {});

  await new Promise(res => setTimeout(res, 3500));

  const shotsDir = path.join(__dirname, '../shots');
  if (!fs.existsSync(shotsDir)) fs.mkdirSync(shotsDir, { recursive: true });

  // 1. Screenshot: Top of page (KPIs + Flow map) at 1376px
  await page.screenshot({ path: path.join(shotsDir, 'daily_operations_top_1376.png') });
  console.log('Captured daily_operations_top_1376.png');

  // 2. Scroll stage down to show canonical data table
  console.log('Scrolling stage down to canonical table...');
  await page.evaluate(() => {
    const stage = document.querySelector('main, [class*="stage"]');
    if (stage) {
      stage.scrollTop = stage.scrollHeight;
    }
  });

  await new Promise(res => setTimeout(res, 1200));
  await page.screenshot({ path: path.join(shotsDir, 'daily_operations_table_1376.png') });
  console.log('Captured daily_operations_table_1376.png');

  // 3. Test filter interaction & Reset button
  console.log('Testing search filter & reset button...');
  const searchInput = await page.$('input[placeholder*="بحث"]');
  if (searchInput) {
    await searchInput.type('تحصيل');
    await new Promise(res => setTimeout(res, 800));
    await page.screenshot({ path: path.join(shotsDir, 'daily_operations_filtered_1376.png') });
    console.log('Captured daily_operations_filtered_1376.png');

    // Click Reset button
    const resetClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('إعادة ضبط'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Reset button clicked:', resetClicked);
    await new Promise(res => setTimeout(res, 600));
  }

  // 4. Test Quick Action: Click "إصدار شيك / تحويل بنكي"
  console.log('Testing Quick Action: New Cheque Modal...');
  const chequeBtnClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('إصدار شيك'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (chequeBtnClicked) {
    await new Promise(res => setTimeout(res, 1500));
    await page.screenshot({ path: path.join(shotsDir, 'daily_operations_cheque_modal_1376.png') });
    console.log('Captured daily_operations_cheque_modal_1376.png');

    // Close the modal with correct Arabic aria-label
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="إغلاق"], button[aria-label="Close"], [class*="closeBtn"], [class*="closeButton"], button[title="إغلاق"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(res => setTimeout(res, 1200));
  }

  // 5. Test Quick Action: Click "تقرير حركة الخزينة"
  console.log('Testing Quick Action: Treasury Report Modal...');
  const reportBtnClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('تقرير حركة الخزينة'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (reportBtnClicked) {
    await new Promise(res => setTimeout(res, 1500));
    await page.screenshot({ path: path.join(shotsDir, 'daily_operations_report_modal_1376.png') });
    console.log('Captured daily_operations_report_modal_1376.png');

    // Close the report modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="إغلاق"], button[aria-label="Close"], [class*="closeBtn"], [class*="closeButton"], button[title="إغلاق"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(res => setTimeout(res, 1000));
  }

  // 6. Viewport 1242x930
  console.log('Switching viewport to 1242x930...');
  await page.setViewport({ width: 1242, height: 930, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    const stage = document.querySelector('main, [class*="stage"]');
    if (stage) stage.scrollTop = 0;
  });
  await new Promise(res => setTimeout(res, 1200));
  await page.screenshot({ path: path.join(shotsDir, 'daily_operations_top_1242.png') });
  console.log('Captured daily_operations_top_1242.png');

  await page.evaluate(() => {
    const stage = document.querySelector('main, [class*="stage"]');
    if (stage) stage.scrollTop = stage.scrollHeight;
  });
  await new Promise(res => setTimeout(res, 1200));
  await page.screenshot({ path: path.join(shotsDir, 'daily_operations_table_1242.png') });
  console.log('Captured daily_operations_table_1242.png');

  await browser.close();
  console.log('Verification finished successfully!');
}

run().catch(err => {
  console.error('Error in verification:', err);
  process.exit(1);
});
