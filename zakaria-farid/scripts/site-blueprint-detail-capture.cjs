const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const option = name => process.argv[process.argv.indexOf(name) + 1];
const base = option('--base');
const shots = path.resolve(option('--shots'));
assert.ok(base?.startsWith('http://localhost:'), 'local preview required');
fs.mkdirSync(shots, { recursive: true });
const slug = 'el-gouna-marina-residential-building-عمارة-شقق-بالجونة-bqycxm';
// Test DB has no non-building record. Temporary route exercises the real inspector
// with the existing apartment preset. Never alter or save a property.
const routeDir = path.resolve('src/app/[locale]/blueprint-nonbuilding-capture');
assert.ok(!fs.existsSync(routeDir), 'never overwrite a route');
fs.mkdirSync(routeDir);
fs.writeFileSync(path.join(routeDir, 'page.tsx'), `
import { notFound } from 'next/navigation';
import ArchitecturalBlueprintInspector from '@/components/property/ArchitecturalBlueprintInspector';
import { buildZoneInstances } from '@/lib/layering/instances';
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <main style={{ paddingTop: 140 }}><ArchitecturalBlueprintInspector
    zones={buildZoneInstances('apartment', 'semi_finished', 3)}
    propertyTitle="Apartment preset capture fixture" propertyType="apartment" locale="ar" /></main>;
}
`, 'utf8');
(async () => {
  let browser;
  const errors = [];
  const consoleErrors = [];
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext();
    await context.route('**/*', route => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) && !route.request().url().startsWith(base + '/_next/')) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    // Fit the entire blueprint below fixed navigation for an unobscured section capture.
    // Restore the ordinary viewport immediately after each PNG.
    const capture = async (studio, name) => {
      const original = page.viewportSize();
      const height = Math.ceil(await studio.evaluate(e => e.getBoundingClientRect().height)) + 350;
      await page.setViewportSize({ width: original.width, height: Math.max(original.height, height) });
      await studio.evaluate(e => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 140));
      await studio.screenshot({ path: path.join(shots, name) });
      await page.setViewportSize(original);
    };
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(`${base}/ar/properties/${encodeURIComponent(slug)}`, { waitUntil: 'networkidle' });
      const studio = page.locator('.blueprint-studio-root');
      const preview = studio.getByRole('region', { name: 'معاينة مخطط المبنى' });
      await preview.waitFor();
      await capture(studio, `building-ar-${width}.png`);
      const floors = preview.getByRole('complementary', { name: 'الأدوار' });
      await floors.getByRole('button').filter({ hasText: /^الدور 2/ }).click();
      await preview.getByRole('button', { name: 'الأسانسير والمصعد', exact: true }).click();
      const detail = preview.getByRole('complementary', { name: 'تفاصيل العنصر' });
      assert.equal(await detail.locator('li').count(), 1);
      assert.match(await detail.innerText(), /بئر المصعد جاهز/);
      assert.doesNotMatch(await detail.innerText(), /الحمولة|InProgress|Applied|Shaft|\[\.\.\.\]/);
      assert.doesNotMatch(await floors.innerText(), /متاحة/);
      await capture(studio, `floor-2-elevator-ar-${width}.png`);
      await preview.getByRole('button').filter({ hasText: /^شقة 2A/ }).click();
      await preview.getByRole('button', { name: /الصالة \/ الاستقبال/ }).click();
      await detail.getByRole('heading', { name: 'الصالة / الاستقبال', exact: true }).waitFor();
      assert.doesNotMatch(await preview.innerText(), /Flat|InProgress|Applied|Shaft|غير محدد|لم تسجل الأبعاد/);
      await capture(studio, `unit-2A-ar-${width}.png`);
      const unitURL = page.url();
      await page.goBack();
      await preview.getByRole('button', { name: 'رجوع لواجهة المبنى', exact: true }).waitFor();
      await page.goForward();
      await preview.getByRole('button', { name: 'رجوع للدور', exact: true }).waitFor();
      assert.equal(page.url(), unitURL);
      await page.reload({ waitUntil: 'networkidle' });
      await preview.getByRole('button', { name: 'رجوع للدور', exact: true }).waitFor();
      await preview.getByRole('button', { name: 'الشقة التالية', exact: true }).click();
      assert.match(await preview.getByRole('navigation').innerText(), /شقة 2B/);
      await preview.getByRole('button', { name: 'الشقة السابقة', exact: true }).click();
      await preview.getByRole('button', { name: 'اطلب هذه الشقة', exact: true }).click();
      await page.locator('.inquiry-close-btn').waitFor();
      assert.equal(await page.locator('.form-textarea').inputValue(), 'استفسار عن شقة 2A');
      await page.locator('.inquiry-close-btn').click();
      const back = preview.getByRole('button', { name: 'رجوع للدور', exact: true });
      await back.focus();
      assert.equal(await back.evaluate(e => e === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width} overflow`);
      const small = await preview.locator('button:visible').evaluateAll(elements => elements.filter(e => {
        const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44;
      }).map(e => e.textContent));
      assert.deepEqual(small, [], '44px targets');
      if (width === 390) {
        assert.equal(await floors.evaluate(e => getComputedStyle(e).overflowX), 'auto');
        assert.ok(await detail.evaluate(e => e.getBoundingClientRect().top) > await preview.locator('[class*="planColumn"]').evaluate(e => e.getBoundingClientRect().bottom));
      }
      await page.goto(`${base}/ar/blueprint-nonbuilding-capture`, { waitUntil: 'networkidle' });
      await page.locator('.cad-unit-svg').waitFor();
      await capture(studio, `apartment-preset-ar-${width}.png`);
      console.log(`${width}: 4 fresh captures; trade scope, hidden values, history, reload, prev/next, inquiry, focus, targets, overflow verified`);
    }
    await page.goto(`${base}/en/properties/${encodeURIComponent(slug)}?bp=floor%2FFloor%25202`, { waitUntil: 'networkidle' });
    const en = page.getByRole('region', { name: 'Building blueprint preview' });
    await en.getByRole('button', { name: 'Floor 2 Elevator', exact: true }).click();
    assert.doesNotMatch(await en.innerText(), /[\u0600-\u06ff]/);
    await capture(page.locator('.blueprint-studio-root'), 'floor-2-elevator-en-390.png');
    assert.deepEqual(errors, [], 'browser runtime errors');
    console.log('Runtime errors:', JSON.stringify(errors));
    console.log('Console errors:', JSON.stringify([...new Set(consoleErrors)]));
  } finally {
    await browser?.close();
    fs.rmSync(routeDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
