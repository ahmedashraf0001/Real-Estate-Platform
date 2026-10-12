// Isolated test route, real components/styles/handlers. No authenticated session or DB.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const option = name => process.argv[process.argv.indexOf(name) + 1];
const shots = path.resolve(option('--shots'));
const port = 51216;
const base = `http://localhost:${port}`;
const captureEnv = { ...process.env, NEXT_DIST_DIR: '.next/admin-wizard-split-capture',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-only' };
const generatedFiles = ['tsconfig.json', 'next-env.d.ts'].map(file => [file, fs.readFileSync(file)]);
// A dot excludes this isolated fixture route from the middleware matcher. The
// real admin route remains protected; no auth override or DB is used.
const routePath = '/admin/wizard-split.capture';
const routeDir = path.resolve('src/app' + routePath);
assert.ok(!fs.existsSync(routeDir), 'never overwrite an existing route');
fs.mkdirSync(routeDir);
fs.mkdirSync(shots, { recursive: true });
fs.writeFileSync(path.join(routeDir, 'page.tsx'), `
'use client';
import dynamic from 'next/dynamic';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { AdminMainContent } from '@/components/admin/AdminMainContent';
import styles from '@/app/admin/admin.module.css';
const Form = dynamic(() => import('@/components/admin/AdminPropertyForm'), { ssr: false });
// Test-only edit fixture. This route is removed in finally.
const property: any = { id: 'test-only', type: 'building', title_en: 'Test building', title_ar: 'مبنى الاختبار',
  location: 'منيا القمح', latitude: 30.51, longitude: 31.35, price_egp: 100, area_sqm: 100,
  bedrooms: 2, bathrooms: 1, completion_status: 'ready', listing_status: 'active',
  description_ar: '<p>وصف محفوظ للتحقق من انتقال الحقول بين الخطوات.</p>', description_en: '<p>Saved description</p>',
  property_images: [], property_amenities: [{ amenity_en: 'Lift', amenity_ar: 'مصعد' }], videos: [] };
export default function CapturePage() {
  return <div className={styles.adminWrapper} dir="rtl" data-admin-wrapper="true">
    <AdminSidebar adminLocale="ar" /><AdminMainContent><Form property={property} isAr /></AdminMainContent>
  </div>;
}
`, 'utf8');

(async () => {
  let browser, server, release, page;
  let serverOutput = '';
  const timer = setTimeout(() => { console.error('Capture timeout 180s'); server && spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']); }, 180000);
  try {
    await new Promise((resolve, reject) => {
      const net = require('node:net').createServer();
      net.once('error', reject); net.listen(port, () => net.close(resolve));
    });
    const build = process.argv.includes('--reuse-build') ? { status: 0, stdout: 'Reusing previous successful isolated capture build', stderr: '' } : spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
      env: captureEnv, windowsHide: true, encoding: 'utf8', timeout: 150000,
    });
    console.log(build.stdout);
    console.error(build.stderr);
    assert.equal(build.status, 0, 'capture production build');
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(port)], {
      env: captureEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { serverOutput += chunk; });
    for (let i = 0; i < 60; i++) {
      if (server.exitCode !== null) throw new Error(serverOutput);
      try { const response = await fetch(base + routePath + '?step=2', { signal: AbortSignal.timeout(1500) }); if (response.ok) break; } catch {}
      if (i === 59) throw new Error('Server readiness failed: ' + serverOutput);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext();
    let mode = 'multi';
    await context.route('**/*', async route => {
      const req = route.request(), url = req.url();
      if (url === base + '/api/admin/geocode') {
        if (mode === 'loading') await new Promise(resolve => { release = resolve; });
        const results = mode === 'empty' ? [] : [
          { place_id: 'fixture-1', lat: '30.51', lon: '31.35', display_name: 'مستشفى اختبار أ — منيا القمح، الشرقية' },
          { place_id: 'fixture-2', lat: '30.52', lon: '31.36', display_name: 'مستشفى اختبار ب — منيا القمح، الشرقية' },
        ];
        return route.fulfill({ status: mode === 'error' ? 500 : 200, contentType: 'application/json', body: JSON.stringify({ results }) });
      }
      if (url.includes('.supabase.co') || (!['GET', 'HEAD', 'OPTIONS'].includes(req.method()) && !url.startsWith(base + '/_next/'))) return route.abort();
      return route.continue();
    });
    page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error('Browser runtime error:', error.message); });
    for (const width of [1280, 1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(base + routePath + '?step=2');
      const location = page.locator('input[name="location"]');
      const search = page.locator('.sanctum-map-search-input');
      await search.waitFor();
      assert.equal(await location.inputValue(), 'منيا القمح');
      assert.equal(await page.locator('.tiptap').count(), 0);
      const waitForMap = async () => page.waitForFunction(() => {
        const map = document.querySelector('.leaflet-container');
        if (!map || map.classList.contains('leaflet-zoom-anim')) return false;
        const view = map.getBoundingClientRect();
        const tiles = [...map.querySelectorAll('img.leaflet-tile')].filter(img => {
          const r = img.getBoundingClientRect();
          return r.right > view.left && r.left < view.right && r.bottom > view.top && r.top < view.bottom;
        });
        return tiles.length >= 2 && tiles.every(img => img.complete && img.naturalWidth >= 256 && /google.com/.test(img.src)
          && Number(getComputedStyle(img).opacity) >= .99 && Number(getComputedStyle(img.parentElement).opacity) >= .99);
      });
      await waitForMap();
      assert.equal(await page.locator('button[aria-current="step"]').getAttribute('title'), 'الموقع');
      assert.equal(await page.locator('button[title="المراجعة والنشر"]').count(), 1);
      const saveShot = async state => {
        if (state !== 'step3') await waitForMap();
        await page.screenshot({ path: path.join(shots, `${state}-ar-light-${width}.png`), fullPage: true });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${state}/${width} document overflow`);
        const bad = await page.locator('button[aria-current="step"]').evaluate(e => {
          const bar = e.closest('[class*="saveBar"]');
          const buttons = [...bar.querySelectorAll(':scope > * button')];
          return buttons.some(button => { const r = button.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth; });
        });
        assert.equal(bad, false, 'stepper controls fully visible');
        const overlap = await page.locator('button[title="المراجعة والنشر"]').evaluate(e => {
          const stepper = e.closest('[class*="saveBarStepper"]'), controls = stepper.nextElementSibling;
          const a = stepper.getBoundingClientRect(), b = controls.getBoundingClientRect();
          return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        });
        assert.equal(overlap, false, 'stepper and controls do not overlap');
        const next = page.getByRole('button', { name: 'الخطوة التالية', exact: true });
        assert.equal(await next.evaluate(e => {
          const r = e.getBoundingClientRect();
          return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
        }), true, 'map overlays cannot obscure wizard navigation');
      };
      await saveShot('step2');
      const coords = page.locator('.sanctum-coords-pill');
      const before = await coords.innerText();
      await search.fill('مستشفى منيا القمح');
      mode = 'loading';
      await page.getByRole('button', { name: 'بحث وانتقال', exact: true }).click();
      await page.getByRole('button', { name: 'جاري البحث...', exact: true }).waitFor();
      await saveShot('search-loading');
      mode = 'multi'; release();
      const results = page.locator('.dropdown-item');
      await results.first().waitFor();
      assert.equal(await results.count(), 2);
      assert.equal(await coords.innerText(), before, 'multiple matches cannot move pin');
      await results.first().focus();
      await page.keyboard.press('Tab');
      assert.equal(await results.nth(1).evaluate(e => e === document.activeElement), true);
      await saveShot('search-results');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.sanctum-coords-pill')?.textContent.includes('30.52000'));
      mode = 'empty'; await search.fill('لا يوجد');
      await page.getByRole('button', { name: 'بحث وانتقال', exact: true }).click();
      await page.getByText('لا توجد نتائج داخل مصر — جرّب اسم المدينة أو اسحب الدبوس', { exact: true }).waitFor();
      assert.equal(await page.locator('.alert-text').evaluate(e => {
        const r = e.getBoundingClientRect(), box = e.closest('.sanctum-location-alert').getBoundingClientRect();
        return r.left >= box.left && r.right <= box.right && e.scrollWidth <= e.clientWidth;
      }), true, 'empty-result message fits the alert');
      await saveShot('search-empty');
      mode = 'error'; await search.fill('خطأ');
      await page.getByRole('button', { name: 'بحث وانتقال', exact: true }).click();
      await page.getByText('تعذر إتمام البحث حالياً، تأكد من اتصال الإنترنت', { exact: true }).waitFor();
      await saveShot('search-error');
      await location.fill('');
      await page.getByRole('button', { name: 'الخطوة التالية', exact: true }).click();
      assert.equal(new URL(page.url()).searchParams.get('step'), '2');
      await location.fill('موقع معدل');
      await page.getByRole('button', { name: 'الخطوة التالية', exact: true }).click();
      await page.locator('.tiptap').waitFor();
      assert.equal(new URL(page.url()).searchParams.get('step'), '3');
      assert.equal(await page.locator('.sanctum-map-picker-root').count(), 0);
      assert.ok((await page.locator('.tiptap').innerText()).includes('وصف محفوظ'));
      await saveShot('step3');
      await page.getByRole('button', { name: 'الخطوة السابقة', exact: true }).click();
      assert.equal(await location.inputValue(), 'موقع معدل');
      console.log(`${width}: six fresh captures; loaded Google tiles; five-step geometry; multiple-result no-pin; keyboard selection; inline empty/error; loading; validation; back retention`);
    }
    assert.deepEqual(errors, [], 'no runtime errors');
  } catch (error) {
    if (page) { console.error(await page.locator('body').innerText()); await page.screenshot({ path: path.join(shots, 'capture-failure.png'), fullPage: true }); }
    console.error(serverOutput);
    throw error;
  } finally {
    clearTimeout(timer);
    release?.();
    await browser?.close();
    if (server && server.exitCode === null) {
      spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { windowsHide: true });
      await new Promise(resolve => server.once('exit', resolve));
    }
    fs.unlinkSync(path.join(routeDir, 'page.tsx'));
    fs.rmdirSync(routeDir);
    for (const [file, bytes] of generatedFiles) fs.writeFileSync(file, bytes);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
