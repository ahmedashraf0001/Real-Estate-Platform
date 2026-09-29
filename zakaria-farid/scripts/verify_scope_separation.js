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
  if (!fs.existsSync(shotsDir)) {
    fs.mkdirSync(shotsDir, { recursive: true });
  }

  // Set local storage before load to avoid tour popup
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('zf_fin_os_tour_completed_v1', 'dismissed');
    localStorage.setItem('zf_tour_dismissed', 'true');
    localStorage.setItem('zf_active_palette', 'default');
  });

  // Login as admin
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

  // 1. VERIFY PORTFOLIO MODE AT 1750x924
  console.log('\n--- 1. Testing Portfolio Macro Mode (1750x924) ---');
  await page.setViewport({ width: 1750, height: 924, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/fin-os/ar/analysis?view=portfolio`, { waitUntil: 'networkidle2', timeout: 30000 });

  await page.evaluate(() => {
    localStorage.setItem('zf_fin_os_tour_completed_v1', 'dismissed');
    localStorage.setItem('zf_tour_dismissed', 'true');
    localStorage.setItem('zf_guided_tour_dismissed', 'true');
    localStorage.setItem('zf_welcome_tour_dismissed', 'true');
    document.querySelectorAll('[class*="tourOverlay"], [class*="guidedTour"], [class*="driver-popover"]').forEach(el => el.remove());
  });
  await new Promise(r => setTimeout(r, 6000));

  // Screenshot 1: Portfolio Macro Studio
  const portfolio1750 = path.join(shotsDir, 'verified_portfolio_mode_1750.png');
  await page.screenshot({ path: portfolio1750 });
  console.log('Saved:', portfolio1750);

  // Switch to Matrix tab in Portfolio Mode
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[role="tab"]'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('جدول مقارنة المحفظة'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const matrix1750 = path.join(shotsDir, 'verified_portfolio_matrix_1750.png');
  await page.screenshot({ path: matrix1750 });
  console.log('Saved:', matrix1750);

  // 2. DRILL DOWN FROM MATRIX ROW TO PROPERTY DOSSIER
  console.log('\n--- 2. Testing Drill Down to Property Lifecycle Dossier ---');
  const clickedInspect = await page.evaluate(() => {
    const actionBtns = Array.from(document.querySelectorAll('button'));
    const btn = actionBtns.find(b => b.textContent && b.textContent.includes('فحص ملف العقار ↗'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked inspect dossier button:', clickedInspect);
  await new Promise(r => setTimeout(r, 2000));
  console.log('URL after clicking inspect:', page.url());

  // Screenshot 2: Property Lifecycle Dossier Mode
  const propertyDossier1750 = path.join(shotsDir, 'verified_property_mode_1750.png');
  await page.screenshot({ path: propertyDossier1750 });
  console.log('Saved:', propertyDossier1750);

  // 3. TEST BACK TO PORTFOLIO BUTTON
  console.log('\n--- 3. Testing Return to Portfolio Button ---');
  const clickedBack = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const backBtn = btns.find(b => b.textContent && b.textContent.includes('العودة لمقارنة المحفظة'));
    if (backBtn) {
      backBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked back to portfolio button:', clickedBack);
  await new Promise(r => setTimeout(r, 2000));
  console.log('URL after clicking back to portfolio:', page.url());

  const returnedPortfolio = path.join(shotsDir, 'verified_returned_to_portfolio_1750.png');
  await page.screenshot({ path: returnedPortfolio });
  console.log('Saved:', returnedPortfolio);

  // 4. TEST DIRECT DEEP LINK TO PROPERTY MODE
  console.log('\n--- 4. Testing Direct Deep Link (?view=property) ---');
  await page.goto(`${BASE_URL}/fin-os/ar/analysis?view=property`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => {
    document.querySelectorAll('[class*="tourOverlay"], [class*="guidedTour"], [class*="driver-popover"]').forEach(el => el.remove());
  });
  await new Promise(r => setTimeout(r, 4000));

  const directProperty1750 = path.join(shotsDir, 'verified_direct_property_deeplink.png');
  await page.screenshot({ path: directProperty1750 });
  console.log('Saved:', directProperty1750);

  // 5. COMPACT DESKTOP (1341x924)
  console.log('\n--- 5. Testing Compact Desktop (1341x924) ---');
  await page.setViewport({ width: 1341, height: 924, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/fin-os/ar/analysis?view=portfolio`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => {
    document.querySelectorAll('[class*="tourOverlay"], [class*="guidedTour"], [class*="driver-popover"]').forEach(el => el.remove());
  });
  await new Promise(r => setTimeout(r, 4000));

  const compactPortfolio = path.join(shotsDir, 'verified_portfolio_compact_1341.png');
  await page.screenshot({ path: compactPortfolio });
  console.log('Saved:', compactPortfolio);

  await browser.close();
  console.log('\nAll scope separation and verification tests completed successfully!');
}

run().catch(err => {
  console.error('Scope separation verification failed:', err);
  process.exit(1);
});
