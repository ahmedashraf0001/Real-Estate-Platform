// Real admin route + real read-only test DB. No property save or other DB writes.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const option = name => process.argv[process.argv.indexOf(name) + 1];
const base = option('--base');
const shots = path.resolve(option('--shots'));
assert.ok(base?.startsWith('http://localhost:'), '--base local dev server required');
fs.mkdirSync(shots, { recursive: true });
// Authenticated dashboard layout redirects to login. Isolate the unchanged real form
// in the admin root layout, using the same SELECT and live Gouna record. No auth bypass
// remains in the working tree; the temporary route is removed even on capture failure.
const routeDir = path.resolve('src/app/admin/blueprint-capture');
assert.ok(routeDir.startsWith(path.resolve('src/app/admin') + path.sep));
assert.ok(!fs.existsSync(routeDir), 'never overwrite an existing route');
fs.mkdirSync(routeDir);
fs.writeFileSync(path.join(routeDir, 'page.tsx'), `
import { notFound } from 'next/navigation';
import AdminPropertyForm from '@/components/admin/AdminPropertyForm';
import { getPublicSupabase } from '@/lib/supabase/public';
export default async function CapturePage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { data, error } = await getPublicSupabase().from('properties')
    .select('*, property_images(*), property_amenities(*)')
    .eq('id', 'c1f6671b-cc87-4a34-9066-eb4cd80e885b').single();
  if (error || !data) notFound();
  return <AdminPropertyForm property={data} isAr />;
}
`, 'utf8');
(async () => {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext();
    await context.route('**/*', route => {
      const req = route.request();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method()) && !req.url().startsWith(base + '/_next/')) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(base + '/admin/blueprint-capture?step=3', { waitUntil: 'networkidle' });
      const preview = page.getByRole('region', { name: 'معاينة مخطط المبنى' });
      await preview.waitFor();
      await preview.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(shots, `building-ar-${width}.png`), fullPage: true });
      await preview.getByRole('complementary', { name: 'الأدوار' }).getByRole('button').filter({ hasText: /^الدور 2/ }).click();
      await preview.getByRole('button', { name: 'الأسانسير والمصعد', exact: true }).click();
      const details = preview.getByRole('complementary', { name: 'تفاصيل العنصر' });
      await details.getByRole('heading', { name: 'الأسانسير والمصعد', exact: true }).waitFor();
      assert.equal(await details.locator('li').count(), 1, 'elevator has only its own trade');
      assert.ok((await details.innerText()).includes('بئر المصعد جاهز'));
      assert.ok(!(await preview.innerText()).match(/InProgress|Applied|Shaft|Flat/));
      await page.screenshot({ path: path.join(shots, `floor-2-elevator-ar-${width}.png`), fullPage: true });
      await preview.getByRole('button').filter({ hasText: /^شقة 2A/ }).click();
      await preview.getByRole('button', { name: 'رجوع للدور', exact: true }).waitFor();
      assert.equal(await preview.getByRole('button', { name: 'شقة 1A', exact: true }).count(), 0);
      await preview.getByRole('button', { name: /الصالة \/ الاستقبال/ }).click();
      await details.getByRole('heading', { name: 'الصالة / الاستقبال', exact: true }).waitFor();
      await page.screenshot({ path: path.join(shots, `unit-2A-ar-${width}.png`), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width} document overflow`);
      await preview.getByRole('button', { name: 'رجوع للدور', exact: true }).focus();
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'رجوع للدور');
      console.log(`captured 3 states at ${width}; floor isolation, trade scope, labels, overflow, focus verified`);
      if (width === 1280) {
        await page.getByRole('button', { name: 'تحرير الأبعاد والموقع', exact: true }).click();
        const editor = page.locator('.fp-numeric-layout');
        const x = editor.getByLabel('الموضع الأفقي', { exact: true });
        await x.fill('1.26');
        assert.equal(await x.inputValue(), '1.5', 'numeric X snaps to 0.5 metre grid');
        await page.waitForTimeout(600); // separate existing history burst windows
        const room = page.locator('.fp-canvas-svg').getByRole('button', { name: /^الصالة \/ الاستقبال,/ });
        await room.focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await x.inputValue(), '2', 'one arrow = one grid step');
        await page.waitForTimeout(600);
        await page.keyboard.press('Shift+ArrowRight');
        assert.equal(await x.inputValue(), '7', 'Shift arrow = ten grid steps');
        await page.getByRole('button', { name: 'تراجع (Ctrl+Z)', exact: true }).first().click();
        assert.equal(await x.inputValue(), '2', 'undo restores room position');
        await page.getByRole('button', { name: 'إعادة (Ctrl+Y)', exact: true }).first().click();
        assert.equal(await x.inputValue(), '7', 'redo restores room position');
        const rect = await room.locator(':scope > rect').first().boundingBox();
        assert.ok(rect);
        await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.mouse.down();
        await page.mouse.move(rect.x + rect.width / 2 + 60, rect.y + rect.height / 2 + 20, { steps: 8 });
        await page.mouse.up();
        const draggedX = Number(await x.inputValue());
        assert.notEqual(draggedX, 7, 'drag commits real metre coordinates');
        assert.equal(draggedX % .5, 0, 'drag snaps to metre grid');
        await room.click();
        const widthInput = editor.getByLabel('العرض', { exact: true });
        const beforeWidth = Number(await widthInput.inputValue());
        const handle = await room.locator('[style*="ew-resize"]').first().boundingBox();
        assert.ok(handle, 'resize handle exists on selected room');
        await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
        await page.mouse.down();
        await page.mouse.move(handle.x + handle.width / 2 + 40, handle.y + handle.height / 2, { steps: 8 });
        await page.mouse.up();
        const resizedWidth = Number(await widthInput.inputValue());
        assert.notEqual(resizedWidth, beforeWidth, 'resize commits dimensions');
        assert.equal(resizedWidth % .5, 0, 'resize snaps to metre grid');
        console.log('numeric snapping, arrow/Shift nudge, undo/redo, drag, resize verified in real CAD');
        await page.getByRole('button', { name: 'معاينة المخطط', exact: true }).click();
        await preview.getByRole('button', { name: 'رجوع للدور', exact: true }).click();
        await preview.getByRole('button', { name: 'الأسانسير والمصعد', exact: true }).click();
        await details.getByRole('button', { name: 'تحرير بيانات العنصر', exact: true }).click();
        const inspector = page.locator('.rooms-rail-inspector-scroll');
        for (const [label, value] of [['الحمولة (كجم)', '630'], ['عدد الأشخاص', '8'], ['عدد الوقفات', '7'], ['ماركة الأسانسير', 'ماركة الاختبار']]) {
          await inspector.getByLabel(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)).fill(value);
          assert.ok((await details.innerText()).includes(value), `${label} updates preview from real handler`);
        }
        await page.getByRole('button', { name: 'إخفاء اللوحة', exact: true }).click();
        await preview.getByRole('button').filter({ hasText: /^شقة 2A/ }).click();
        await preview.getByRole('button', { name: 'بيانات الشقة', exact: true }).click();
        await details.getByRole('button', { name: 'تحرير بيانات العنصر', exact: true }).click();
        await inspector.getByLabel('المساحة (م²)', { exact: true }).fill('125.5');
        await inspector.getByLabel('الاتجاه', { exact: true }).fill('شمالي');
        await inspector.getByLabel('الإطلالة', { exact: true }).fill('البحر');
        assert.ok((await preview.innerText()).includes('125.5'));
        assert.ok((await preview.innerText()).includes('شمالي'));
        assert.ok((await preview.innerText()).includes('البحر'));
        await inspector.getByLabel('الدور', { exact: true }).fill('3');
        await preview.getByRole('navigation', { name: 'مسار المبنى' }).getByRole('button', { name: 'الدور 3', exact: true }).waitFor();
        assert.equal(await inspector.getByLabel('الدور', { exact: true }).inputValue(), '3');
        console.log('optional elevator/unit facts and canonical unit floor relocation verified; edits unsaved');
      }
    }
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally {
    await browser?.close();
    fs.unlinkSync(path.join(routeDir, 'page.tsx'));
    fs.rmdirSync(routeDir);
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
