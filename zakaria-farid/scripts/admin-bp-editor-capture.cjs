// Temporary, unauthenticated fixture. Real editor handlers; no production records or writes.
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const option = name => process.argv[process.argv.indexOf(name) + 1];
const shots = path.resolve(option('--shots'));
const port = 51219, base = `http://localhost:${port}`;
const env = { ...process.env, NEXT_DIST_DIR: '.next/admin-bp-editor-capture' };
const generated = ['tsconfig.json', 'next-env.d.ts'].map(file => [file, fs.readFileSync(file)]);
const routeDir = path.resolve('src/app/admin/admin-bp-editor.capture');
assert.ok(!fs.existsSync(routeDir));
fs.mkdirSync(routeDir); fs.mkdirSync(shots, { recursive: true });
fs.writeFileSync(path.join(routeDir, 'page.tsx'), `
'use client';
import { useState } from 'react';
import Blueprint from '@/components/property/ArchitecturalBlueprintInspector';
import styles from '@/app/admin/admin.module.css';
import { createUnit, createZone } from '@/lib/layering/blueprintEditor';
const initial = () => [createZone({ templateId: 'bld.staircase', floorKey: 'Floor 2', sortOrder: 1 }), createZone({ templateId: 'bld.elevator', floorKey: 'Floor 2', sortOrder: 2 }), { ...createUnit('Floor 2', '2A', 3), children: [createZone({ templateId: 'apt.kitchen', sortOrder: 1 }), createZone({ templateId: 'apt.std_bed', sortOrder: 2 })] }, createUnit('Floor 1', '1A', 1)];
export default function Page() {
 const [zones, setZones] = useState(initial);
 const [accent, setAccent] = useState(false);
 return <main data-theme="light"><div className={styles.adminWrapper} style={{ height: 'auto', minHeight: '100vh', display: 'block', padding: 16, ...(accent ? { '--admin-accent': 'var(--admin-text-title)' } : {}) }}>
 <button type="button" data-reload onClick={() => setZones(initial())}>إعادة تحميل العقار</button>
 <button type="button" data-palette onClick={() => setAccent(!accent)}>تبديل اللوحة</button>
 <Blueprint zones={zones} propertyTitle="" propertyType="building" locale="ar" edit={{ onChange: setZones }} />
 </div></main>;
}
`, 'utf8');
(async () => {
 let server, browser, output = '';
 const errors = [], consoleErrors = [];
 const timer = setTimeout(() => { if (server) spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { windowsHide: true }); }, 180000);
 try {
  await new Promise((resolve, reject) => { const net = require('node:net').createServer(); net.once('error', reject); net.listen(port, () => net.close(resolve)); });
  const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { env, windowsHide: true, encoding: 'utf8', timeout: 150000 });
  console.log(build.stdout); console.error(build.stderr); assert.equal(build.status, 0, 'production build');
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(port)], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { output += chunk; });
  for (let i = 0; i < 60; i++) {
   if (server.exitCode !== null) throw new Error(output);
   try { if ((await fetch(base + '/admin/admin-bp-editor.capture', { signal: AbortSignal.timeout(1500) })).ok) break; } catch {}
   if (i === 59) throw new Error('Preview readiness failed: ' + output);
   await new Promise(resolve => setTimeout(resolve, 500));
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  await context.route('**/*', route => {
   const req = route.request();
   if (!req.url().startsWith(base) || !['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.abort();
   return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  for (const width of [1280, 390, 1440]) {
   await page.setViewportSize({ width, height: 1000 });
   await page.goto(base + '/admin/admin-bp-editor.capture', { waitUntil: 'networkidle' });
   const root = page.locator('[data-blueprint-editor]');
   await page.locator('.blueprint-studio-root').screenshot({ path: path.join(shots, `editor-building-ar-light-${width}.png`) });
   await root.locator('button[data-floor-key="Floor 2"]').click();
   const tiles = root.locator('[data-blueprint-drawing] [data-editor-tile]');
   const undo = root.getByRole('button', { name: 'تراجع', exact: true });
   const redo = root.getByRole('button', { name: 'إعادة', exact: true });
   await root.getByText('اختر مساحة لتعديلها', { exact: true }).waitFor();
   assert.equal(await undo.isDisabled(), true);
   await root.screenshot({ path: path.join(shots, `editor-empty-ar-light-${width}.png`) });
   const first = tiles.first().locator('button').first();
   await first.click();
   assert.equal(await first.getAttribute('aria-pressed'), 'true');
   await root.getByLabel('الاسم', { exact: true }).waitFor();
   await root.screenshot({ path: path.join(shots, `editor-selected-ar-light-${width}.png`) });
   const name = root.getByLabel('الاسم', { exact: true });
   const originalName = await name.inputValue();
   await name.fill('مساحة معدلة'); await name.press('Tab');
   assert.equal(await tiles.first().locator('strong').innerText(), 'شقة مساحة معدلة');
   await undo.click(); assert.equal(await name.inputValue(), originalName);
   await redo.click(); assert.equal(await name.inputValue(), 'مساحة معدلة');
   await first.focus(); await first.press('Enter'); assert.equal(await name.evaluate(e => e === document.activeElement), true);
   await first.focus(); await first.press('Control+d'); assert.equal(await tiles.count(), 4);
   await undo.click(); assert.equal(await tiles.count(), 3);
   await first.focus(); await first.press('Delete'); assert.equal(await tiles.count(), 2);
   await root.locator('[data-blueprint-drawing]').click({ position: { x: 2, y: 2 } });
   await root.press('Control+z'); assert.equal(await tiles.count(), 3);
   await tiles.first().locator('button').first().focus(); await page.keyboard.press('ArrowDown');
   assert.equal(await tiles.nth(1).locator('button').first().getAttribute('aria-pressed'), 'true');
   await tiles.first().locator('button').first().click();
   await tiles.first().getByRole('button', { name: 'خيارات المساحة', exact: true }).click();
   await root.getByRole('menuitem', { name: 'تعديل', exact: true }).waitFor();
   await root.screenshot({ path: path.join(shots, `editor-menu-ar-light-${width}.png`) });
   await page.keyboard.press('Escape'); assert.equal(await root.getByRole('menu').count(), 0);
   const color = await first.evaluate(e => getComputedStyle(e).borderColor);
   await page.locator('[data-palette]').click();
   const changed = await first.evaluate(e => getComputedStyle(e).borderColor);
   assert.notEqual(color, changed, 'admin palette propagates');
   await page.locator('[data-palette]').click();
   await root.locator('[data-tree-unit]').first().click();
   assert.equal(await root.locator('[data-blueprint-drawing] [data-editor-tile]').count(), 2);
   await root.locator('[data-blueprint-drawing] [data-editor-tile]').first().locator('button').first().click();
   await root.getByLabel('الارتفاع', { exact: true }).selectOption('3.2m Suspended');
   assert.equal(await root.getByLabel('الارتفاع', { exact: true }).locator('option:checked').innerText(), '3.2 م · سقف معلق');
   await root.screenshot({ path: path.join(shots, `editor-unit-ar-light-${width}.png`) });
   await page.locator('[data-reload]').click(); assert.equal(await undo.isDisabled(), true); assert.equal(await redo.isDisabled(), true);
   await root.locator('button[data-floor-key="Floor 2"]').click();
   const shared = root.locator('[data-editor-tile]').filter({ has: page.locator('[data-zone-template="bld.staircase"], [data-zone-template="bld.elevator"]') });
   const before = await shared.locator('button[data-zone-id]').evaluateAll(elements => elements.map(e => e.dataset.zoneId));
   await shared.first().dragTo(shared.last());
   const after = await shared.locator('button[data-zone-id]').evaluateAll(elements => elements.map(e => e.dataset.zoneId));
   assert.deepEqual(after, [...before].reverse(), 'drag persists sibling order');
   await undo.click();
   assert.deepEqual(await shared.locator('button[data-zone-id]').evaluateAll(elements => elements.map(e => e.dataset.zoneId)), before);
   await root.locator('[class*="primaryAction"]').click();
   await root.getByRole('dialog', { name: 'إضافة مساحة', exact: true }).getByRole('button', { name: 'غرفة الحارس والأمن', exact: true }).click();
   assert.equal(await tiles.count(), 4); await undo.click(); assert.equal(await tiles.count(), 3);
   await root.locator('[class*="editorActions"]').getByRole('button', { name: 'شقة', exact: true }).click();
   assert.equal(await tiles.count(), 4); await undo.click(); assert.equal(await tiles.count(), 3);
   await root.locator('[class*="addFloors"]').getByRole('button', { name: 'بدروم', exact: true }).click();
   assert.equal(await root.locator('button[data-floor-key="bld_basement"]').count(), 1);
   await undo.click(); assert.equal(await root.locator('button[data-floor-key="bld_basement"]').count(), 0);
   await root.locator('button[data-floor-key="Floor 2"]').click();
   const floor = root.locator('details').filter({ has: page.locator('button[data-floor-key="Floor 2"]') });
   await floor.getByRole('button', { name: 'خيارات الدور', exact: true }).click();
   await floor.getByRole('menuitem', { name: 'إعادة التسمية', exact: true }).click();
   await floor.getByLabel('اسم الدور').fill('دور معدل'); await floor.getByLabel('اسم الدور').press('Enter');
   assert.equal(await root.locator('button[data-floor-key="Floor 2"]').innerText(), 'دور معدل');
   await undo.click(); assert.equal(await root.locator('button[data-floor-key="Floor 2"]').innerText(), 'الدور 2');
   await floor.getByRole('button', { name: 'خيارات الدور', exact: true }).click();
   await floor.getByRole('menuitem', { name: 'تكرار كدور جديد', exact: true }).click();
   assert.equal(await root.locator('button[data-floor-key="Floor 3"]').count(), 1);
   await undo.click(); assert.equal(await root.locator('button[data-floor-key="Floor 3"]').count(), 0);
   assert.equal(await root.locator('button:not([type=button])').count(), 0);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width} document overflow`);
   console.log(`${width}: 5 screenshots; rename/undo/redo/keyboard/copy/delete/tree/height/reset/palette/drag/add-space/add-unit/basement/floor-rename/floor-copy/overflow checked`);
  }
  assert.deepEqual(errors, [], 'runtime errors');
  console.log('Console errors:', JSON.stringify([...new Set(consoleErrors)]));
 } finally {
  clearTimeout(timer); await browser?.close();
  if (server) { spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve)); }
  const root = path.resolve('src/app/admin'); assert.ok(routeDir.startsWith(root + path.sep)); fs.rmSync(routeDir, { recursive: true, force: true });
  for (const [file, bytes] of generated) fs.writeFileSync(file, bytes);
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
