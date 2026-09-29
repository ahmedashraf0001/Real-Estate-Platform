const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('/usr/bin/google-chrome') 
  ? '/usr/bin/google-chrome' 
  : path.join(__dirname, '../chrome/linux-152.0.7977.82/chrome-linux64/chrome');
const BASE_URL = 'http://localhost:3000';

async function verify() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('1. Navigating to /fin-os/ar/operations...');
    await page.goto(`${BASE_URL}/fin-os/ar/operations`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Dismiss tour modal if open
    await page.evaluate(() => {
      localStorage.setItem('zf_fin_os_tour_completed_v1', 'dismissed');
      const closeBtn = document.querySelector('button[title="إغلاق"], button[title="Dismiss"]');
      if (closeBtn) closeBtn.click();
    }).catch(() => {});

    await page.waitForSelector('[data-stream-id="in-1"]', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 500));

    // Helper to get current table row count
    const getRowCount = () => page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      return rows.length;
    });

    const getActiveBannerText = () => page.evaluate(() => {
      const banner = document.querySelector('[class*="activeFilterBanner"]');
      return banner ? banner.textContent : null;
    });

    const getUrl = () => page.url();

    const initialRows = await getRowCount();
    console.log(`Initial rows in table: ${initialRows}`);
    console.log(`Initial URL: ${getUrl()}`);

    // Test 1: Click Partner Injections (in-1)
    console.log('\n--- Test 1: Click in-1 (Partner Injections) ---');
    await page.evaluate(() => {
      const el = document.querySelector('[data-stream-id="in-1"]');
      if (el) el.click();
      else throw new Error('data-stream-id="in-1" not found');
    });
    await new Promise(r => setTimeout(r, 600));

    const banner1 = await getActiveBannerText();
    const rows1 = await getRowCount();
    const url1 = getUrl();
    console.log(`Active Banner: ${banner1}`);
    console.log(`Rows after in-1 filter: ${rows1}`);
    console.log(`URL: ${url1}`);

    if (!url1.includes('/fin-os/ar/operations')) {
      throw new Error(`URL changed unexpectedly: ${url1}`);
    }
    // Check no modal opened
    const modalCount1 = await page.evaluate(() => document.querySelectorAll('[role="dialog"]').length);
    console.log(`Modal dialog count: ${modalCount1}`);
    if (modalCount1 > 0) {
      throw new Error('A modal opened when clicking in-1!');
    }

    // Test 2: Click Taxes & Fees (out-3) -> Formerly navigated to /tax
    console.log('\n--- Test 2: Click out-3 (Taxes & Fees) ---');
    await page.evaluate(() => {
      const el = document.querySelector('[data-stream-id="out-3"]');
      if (el) el.click();
      else throw new Error('data-stream-id="out-3" not found');
    });
    await new Promise(r => setTimeout(r, 600));

    const banner2 = await getActiveBannerText();
    const rows2 = await getRowCount();
    const url2 = getUrl();
    console.log(`Active Banner: ${banner2}`);
    console.log(`Rows after out-3 filter: ${rows2}`);
    console.log(`URL: ${url2}`);

    if (!url2.includes('/fin-os/ar/operations') || url2.includes('/tax')) {
      throw new Error(`URL navigated away to /tax! Current URL: ${url2}`);
    }

    // Test 3: Click Central Hub -> Clears filter
    console.log('\n--- Test 3: Click Central Hub to reset filter ---');
    await page.evaluate(() => {
      const el = document.querySelector('[data-stream-id="central-hub"]');
      if (el) el.click();
      else throw new Error('data-stream-id="central-hub" not found');
    });
    await new Promise(r => setTimeout(r, 600));

    const banner3 = await getActiveBannerText();
    const rows3 = await getRowCount();
    console.log(`Active Banner: ${banner3}`);
    console.log(`Rows after hub click (should reset): ${rows3}`);
    if (banner3 !== null) {
      throw new Error(`Banner still exists after clicking Central Hub: ${banner3}`);
    }
    if (rows3 !== initialRows) {
      throw new Error(`Row count did not return to initial! Expected ${initialRows}, got ${rows3}`);
    }

    // Test 4: Keyboard navigation (Enter key on in-0)
    console.log('\n--- Test 4: Keyboard navigation Enter on in-0 ---');
    await page.evaluate(() => {
      const el = document.querySelector('[data-stream-id="in-0"]');
      if (el) {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      } else {
        throw new Error('data-stream-id="in-0" not found');
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const banner4 = await getActiveBannerText();
    console.log(`Active Banner after Enter key: ${banner4}`);
    if (!banner4 || !banner4.includes('أقساط ومقدمات العملاء')) {
      throw new Error(`Enter key did not activate in-0 filter! Banner: ${banner4}`);
    }

    // Test 5: Clear button in activeFilterBanner
    console.log('\n--- Test 5: Click Clear button in activeFilterBanner ---');
    await page.evaluate(() => {
      const clearBtn = document.querySelector('[class*="clearFilterBtn"]');
      if (clearBtn) clearBtn.click();
      else throw new Error('clearFilterBtn not found in banner');
    });
    await new Promise(r => setTimeout(r, 600));

    const banner5 = await getActiveBannerText();
    console.log(`Active Banner after clear: ${banner5}`);
    if (banner5 !== null) {
      throw new Error('Banner still exists after clicking clear button');
    }

    console.log('\n>>> ALL LIVE INTERACTIONS VERIFIED SUCCESSFULLY! <<<');
  } finally {
    await browser.close();
  }
}

verify().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
