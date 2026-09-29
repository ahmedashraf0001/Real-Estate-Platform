const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('/usr/bin/google-chrome') 
  ? '/usr/bin/google-chrome' 
  : path.join(__dirname, '../chrome/linux-152.0.7977.82/chrome-linux64/chrome');
const BASE_URL = 'http://localhost:3000';

async function testInteractions() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('zf_fin_os_tour_completed_v1', 'dismissed');
    localStorage.setItem('zf_tour_dismissed', 'true');
  });

  await page.setViewport({ width: 1341, height: 924 });
  await page.goto(`${BASE_URL}/fin-os/ar/properties`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('[data-properties-portfolio="true"]', { timeout: 30000 });

  // Clean tour overlays
  await page.evaluate(() => {
    const tourElements = document.querySelectorAll('[class*="tourOverlay"], [class*="guidedTour"], [class*="tourPrompt"], [class*="firstTimeTour"]');
    tourElements.forEach(el => el.remove());
  });

  await new Promise(r => setTimeout(r, 1500));

  // Check 1: Count visible project cards initially
  const initialCardsCount = await page.evaluate(() => {
    return document.querySelectorAll('[class*="projectCard"]').length;
  });
  console.log(`Initial visible project cards: ${initialCardsCount}`);

  // Check 2: Table dimensions and columns visibility
  const tableMetrics = await page.evaluate(() => {
    const table = document.querySelector('table');
    const scrollArea = document.querySelector('[class*="tableScrollArea"]');
    const ths = Array.from(document.querySelectorAll('th')).map(th => th.textContent.trim());
    return {
      tableScrollWidth: scrollArea ? scrollArea.scrollWidth : 0,
      tableClientWidth: scrollArea ? scrollArea.clientWidth : 0,
      isTableHorizontallyOverflowing: scrollArea ? scrollArea.scrollWidth > scrollArea.clientWidth : false,
      columnCount: ths.length,
      headers: ths
    };
  });
  console.log('Table metrics:', tableMetrics);

  // Check 3: Check pagination of cards
  const paginationText = await page.evaluate(() => {
    const counter = document.querySelector('[class*="projectNavCounter"]');
    return counter ? counter.textContent.trim() : null;
  });
  console.log('Pagination text:', paginationText);

  // Click next page of project cards
  const nextBtn = await page.$('button[title="المجموعة التالية"]');
  if (nextBtn) {
    await nextBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const page2Text = await page.evaluate(() => {
      const counter = document.querySelector('[class*="projectNavCounter"]');
      return counter ? counter.textContent.trim() : null;
    });
    console.log('After clicking next, pagination text:', page2Text);
  }

  // Check 4: Click toggle "عرض كافة المشروعات"
  const toggleBtn = await page.$('[class*="toggleAllProjectsBtn"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const allCardsCount = await page.evaluate(() => {
      return document.querySelectorAll('[class*="projectCard"]').length;
    });
    console.log(`Cards count when "show all" is active: ${allCardsCount}`);
    
    // Toggle back
    await toggleBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // Check 5: Click a card to filter the table
  const firstCard = await page.$('[class*="projectCard"]');
  if (firstCard) {
    await firstCard.click();
    await new Promise(r => setTimeout(r, 500));
    const filteredBadge = await page.evaluate(() => {
      const badge = document.querySelector('[class*="clearProjectFilterBtn"]');
      return badge ? badge.textContent.trim() : null;
    });
    console.log('Project filter active badge:', filteredBadge);
  }

  console.log('Console errors:', consoleErrors);
  await browser.close();
}

testInteractions().catch(console.error);
