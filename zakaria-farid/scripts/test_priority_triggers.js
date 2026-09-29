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
  await page.setViewport({ width: 1750, height: 924, deviceScaleFactor: 1 });

  // Pre-seed localStorage to avoid tour popup
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('zf_fin_os_tour_completed_v1', 'dismissed');
    localStorage.setItem('zf_guided_tour_dismissed', 'true');
    localStorage.setItem('zf_welcome_tour_dismissed', 'true');
  });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

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

  console.log(`Navigating to ${BASE_URL}/fin-os/ar/construction...`);
  await page.goto(`${BASE_URL}/fin-os/ar/construction`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(res => setTimeout(res, 5000));

  // Dismiss tour if any
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const dismissBtn = buttons.find(b => 
      b.textContent.includes('لاحقاً') || 
      b.textContent.includes('إغلاق') ||
      b.getAttribute('aria-label') === 'Close'
    );
    if (dismissBtn) dismissBtn.click();
  }).catch(() => {});

  await new Promise(res => setTimeout(res, 1000));

  const getTableInfo = async () => {
    return page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        label: s.getAttribute('aria-label') || s.className,
        val: s.value
      }));
      return {
        rowCount: rows.length,
        firstRowText: rows[0] ? rows[0].innerText.replace(/\s+/g, ' ').slice(0, 120) : 'none',
        selects
      };
    });
  };

  console.log('INITIAL STATE:', JSON.stringify(await getTableInfo(), null, 2));

  // Find buttons inside side widgets
  const sideTriggerInfos = await page.evaluate(() => {
    const sideSlot = document.getElementById('zf-side-widgets-slot');
    if (!sideSlot) return { error: 'no zf-side-widgets-slot found!' };
    const btns = Array.from(sideSlot.querySelectorAll('button'));
    return btns.map((b, i) => ({
      index: i,
      text: b.innerText.replace(/\s+/g, ' ').trim(),
      className: b.className
    }));
  });

  console.log('Side triggers found in slot:', JSON.stringify(sideTriggerInfos, null, 2));

  // Let's click each button in the side widget
  const sideButtons = await page.$$('#zf-side-widgets-slot button');
  console.log('DOM side buttons count:', sideButtons.length);

  for (let i = 0; i < sideButtons.length; i++) {
    console.log(`\n================== CLICKING BUTTON ${i} ==================`);
    await sideButtons[i].click();
    await new Promise(r => setTimeout(r, 1000));
    console.log('AFTER CLICK STATE:', JSON.stringify(await getTableInfo(), null, 2));

    const modalTitle = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      return modal ? modal.innerText.slice(0, 100).replace(/\s+/g, ' ') : null;
    });
    if (modalTitle) console.log('Modal opened:', modalTitle);
  }

  await browser.close();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
