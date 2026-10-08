import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const option = (name: string) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const OUTPUT_DIR = option('--output') || 'C:\\Users\\lyr1csan\\Documents\\Real Estate\\website_screenshots';
const width = Number(option('--width') || 1440);
const height = Number(option('--height') || 900);

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
    defaultViewport: { width, height },
  });

  const page = await browser.newPage();

  const manifest = option('--manifest');
  const pages = manifest ? JSON.parse(fs.readFileSync(manifest, 'utf8')) as typeof PAGES_TO_CAPTURE : PAGES_TO_CAPTURE;
  for (const item of pages) {
    console.log(`📸 Capturing ${item.name} (${item.url})...`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      const savePath = path.join(OUTPUT_DIR, item.name);
      await page.screenshot({ path: savePath, fullPage: true });
      console.log(`✅ Saved: ${savePath}`);
    } catch (err: any) {
      console.error(`❌ Failed to capture ${item.name}:`, err?.message || err);
      if (manifest) {
        await browser.close();
        throw err;
      }
    }
  }

  await browser.close();
  console.log('🎉 All website screenshots captured successfully!');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
