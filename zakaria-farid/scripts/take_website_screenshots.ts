import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUTPUT_DIR = 'C:\\Users\\lyr1csan\\Documents\\Real Estate\\website_screenshots';

const PAGES_TO_CAPTURE = [
  { name: '01_homepage_en.png', url: 'http://localhost:3000/en' },
  { name: '02_homepage_ar.png', url: 'http://localhost:3000/ar' },
  { name: '03_properties_en.png', url: 'http://localhost:3000/en/properties' },
  { name: '04_properties_ar.png', url: 'http://localhost:3000/ar/properties' },
  { name: '05_map_en.png', url: 'http://localhost:3000/en/map' },
  { name: '06_about_en.png', url: 'http://localhost:3000/en/about' },
  { name: '07_contact_en.png', url: 'http://localhost:3000/en/contact' },
  { name: '08_admin_dashboard.png', url: 'http://localhost:3000/admin/en/properties' },
];

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🚀 Launching Edge for automated website screenshots...');
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  for (const item of PAGES_TO_CAPTURE) {
    console.log(`📸 Capturing ${item.name} (${item.url})...`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      const savePath = path.join(OUTPUT_DIR, item.name);
      await page.screenshot({ path: savePath, fullPage: true });
      console.log(`✅ Saved: ${savePath}`);
    } catch (err: any) {
      console.error(`❌ Failed to capture ${item.name}:`, err?.message || err);
    }
  }

  await browser.close();
  console.log('🎉 All website screenshots captured successfully!');
}

main().catch(console.error);
