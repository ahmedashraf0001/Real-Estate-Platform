const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = fs.existsSync('/usr/bin/google-chrome') 
  ? '/usr/bin/google-chrome' 
  : path.join(__dirname, '../chrome/linux-152.0.7977.82/chrome-linux64/chrome');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const VIEWPORTS = [
  { width: 1353, height: 980 },
  { width: 1544, height: 980 }
];

async function verify() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  // Emulate desktop fine pointer and hover
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle2' });
  const emailInput = await page.$('#admin-email');
  if (emailInput) {
    await page.type('#admin-email', 'zakariafarid@gmail.com');
    await page.type('#admin-password', 'Admin123456!');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);
  }

  let allPassed = true;

  for (const vp of VIEWPORTS) {
    console.log(`\n================ Testing Viewport ${vp.width}x${vp.height} ================`);
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto(`${BASE_URL}/fin-os/ar`, { waitUntil: 'networkidle2' });

    // Dismiss tour / modals
    await page.evaluate(() => {
      localStorage.setItem('zf_fin_os_tour_completed_v1', 'dismissed');
      const closeBtn = document.querySelector('button[title="إغلاق"], button[title="Dismiss"]');
      if (closeBtn) closeBtn.click();
    }).catch(() => {});

    await new Promise(r => setTimeout(r, 2500));

    const result = await page.evaluate(() => {
      const shell = document.querySelector('[data-erp-workstation="true"]');
      const sidebar = document.querySelector('aside[data-tour="nav-dock"]');
      const middleSection = document.querySelector('section[class*="middleSection"]');
      const sideWidgets = document.querySelector('#zf-workstation-side-widgets');

      const getBox = el => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          left: Math.round(r.left * 100) / 100,
          right: Math.round(r.right * 100) / 100,
          top: Math.round(r.top * 100) / 100,
          bottom: Math.round(r.bottom * 100) / 100,
          width: Math.round(r.width * 100) / 100,
          height: Math.round(r.height * 100) / 100
        };
      };

      const htmlStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);

      return {
        window: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          htmlScrollbarGutter: htmlStyle.scrollbarGutter,
          htmlOverflowY: htmlStyle.overflowY,
          bodyOverflowY: bodyStyle.overflowY,
          documentClientWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyClientWidth: document.body.clientWidth,
          bodyScrollWidth: document.body.scrollWidth,
        },
        shell: getBox(shell),
        sidebar: getBox(sidebar),
        middleSection: getBox(middleSection),
        sideWidgets: getBox(sideWidgets),
      };
    });

    console.log('Document & Window Metrics:', JSON.stringify(result.window, null, 2));
    console.log('Sidebar BoundingBox:', result.sidebar);
    console.log('Middle Section BoundingBox:', result.middleSection);
    console.log('Side Widgets BoundingBox:', result.sideWidgets);

    const W = vp.width;
    const H = vp.height;

    // Checks:
    const checks = [
      { name: 'SideWidgets outer left whitespace is exactly 12px', actual: result.sideWidgets.left, expected: 12, pass: Math.abs(result.sideWidgets.left - 12) < 0.5 },
      { name: 'Sidebar outer right whitespace is exactly 12px', actual: Math.round(W - result.sidebar.right), expected: 12, pass: Math.abs((W - result.sidebar.right) - 12) < 0.5 },
      { name: 'SideWidgets top whitespace is exactly 12px', actual: result.sideWidgets.top, expected: 12, pass: Math.abs(result.sideWidgets.top - 12) < 0.5 },
      { name: 'MiddleSection top whitespace is exactly 12px', actual: result.middleSection.top, expected: 12, pass: Math.abs(result.middleSection.top - 12) < 0.5 },
      { name: 'Sidebar top whitespace is exactly 12px', actual: result.sidebar.top, expected: 12, pass: Math.abs(result.sidebar.top - 12) < 0.5 },
      { name: 'SideWidgets bottom whitespace is exactly 12px', actual: Math.round(H - result.sideWidgets.bottom), expected: 12, pass: Math.abs((H - result.sideWidgets.bottom) - 12) < 0.5 },
      { name: 'MiddleSection bottom whitespace is exactly 12px', actual: Math.round(H - result.middleSection.bottom), expected: 12, pass: Math.abs((H - result.middleSection.bottom) - 12) < 0.5 },
      { name: 'Sidebar bottom whitespace is exactly 12px', actual: Math.round(H - result.sidebar.bottom), expected: 12, pass: Math.abs((H - result.sidebar.bottom) - 12) < 0.5 },
      { name: 'Gap between MiddleSection and SideWidgets is exactly 12px', actual: Math.round(result.middleSection.left - result.sideWidgets.right), expected: 12, pass: Math.abs((result.middleSection.left - result.sideWidgets.right) - 12) < 0.5 },
      { name: 'Gap between Sidebar and MiddleSection is exactly 12px', actual: Math.round(result.sidebar.left - result.middleSection.right), expected: 12, pass: Math.abs((result.sidebar.left - result.middleSection.right) - 12) < 0.5 },
      { name: 'Document has no horizontal scroll (scrollWidth === clientWidth)', actual: result.window.documentScrollWidth, expected: result.window.documentClientWidth, pass: result.window.documentScrollWidth <= result.window.documentClientWidth },
      { name: 'Html scrollbar-gutter is auto', actual: result.window.htmlScrollbarGutter, expected: 'auto', pass: result.window.htmlScrollbarGutter === 'auto' }
    ];

    checks.forEach(c => {
      const status = c.pass ? 'PASS' : 'FAIL';
      console.log(`[${status}] ${c.name} -> actual: ${c.actual}, expected: ${c.expected}`);
      if (!c.pass) allPassed = false;
    });
  }

  await browser.close();

  if (!allPassed) {
    console.error('\nERROR: One or more uniformity checks failed!');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All 4-side uniformity checks passed with flying colors!');
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
