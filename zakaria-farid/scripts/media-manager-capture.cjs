// Real components and styles; isolated temporary fixtures. Never save or upload.
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const option = name => process.argv[process.argv.indexOf(name) + 1];
const shots = path.resolve(option('--shots'));
const port = 51218, base = `http://localhost:${port}`;
const env = { ...process.env, NEXT_DIST_DIR: '.next/media-manager-capture' };
const generated = ['tsconfig.json', 'next-env.d.ts'].map(file => [file, fs.readFileSync(file)]);
const routeDir = path.resolve('src/app/admin/media-manager.capture');
assert.ok(!fs.existsSync(routeDir));
fs.mkdirSync(routeDir); fs.mkdirSync(shots, { recursive: true });
fs.writeFileSync(path.join(routeDir, 'page.tsx'), `
'use client';
import { useState } from 'react';
import MediaManager from '@/components/admin/media/MediaManager';
import Form from '@/components/admin/AdminPropertyForm';
import { ZoneInspector } from '@/components/admin/ZoneInspector';
import styles from '@/app/admin/admin.module.css';
import type { ZoneInstance } from '@/lib/layering/instances';
const fixture: any = { id: 'capture-only', type: 'building', title_en: 'Capture fixture', title_ar: 'اختبار العرض', location: 'موقع الاختبار', latitude: 30.51, longitude: 31.35, price_egp: 100, area_sqm: 100, bedrooms: 1, bathrooms: 1, completion_status: 'ready', listing_status: 'active', description_ar: '<p>اختبار وسائط</p>', property_images: [], videos: [] };
export default function Page() {
 const [media, setMedia] = useState<any>({ videos: [], photos: [] });
 const [showZone, setShowZone] = useState(false);
 const [showForm, setShowForm] = useState(false);
 const [zones, setZones] = useState<ZoneInstance[]>([{ id: 'capture-unit', zone_template_id: 'bld.unit', instance_label: '5A', floor_number: 1, sort_order: 0, trades: [] }]);
 return <main data-theme="light" style={{ minHeight: '100vh' }}><div className={styles.adminWrapper} style={{ height: 'auto', display: 'block', padding: 16 }}>
 <div data-capture-manager style={{ maxWidth: 900, margin: 'auto' }}><MediaManager contextLabel="شقة 5A" videos={media.videos} photos={media.photos} onChange={setMedia} storagePathPrefix="zone-photos/capture-unit-" isAr /></div>
 <button type="button" onClick={() => setShowZone(!showZone)}>Toggle inspector fixture</button>
 {showZone && <div data-capture-zone style={{ maxWidth: 900, margin: '24px auto' }}><ZoneInspector zoneInstances={zones} onZoneInstancesChange={setZones} selectedZoneId="capture-unit" isAr /></div>}
 <button type="button" onClick={() => setShowForm(!showForm)}>Toggle building fixture</button>
 {showForm && <div data-capture-form><Form property={fixture} isAr /></div>}
 </div></main>;
}
`, 'utf8');

(async () => {
 let server, browser, output = '';
 const errors = [], consoleErrors = [];
 const timer = setTimeout(() => { console.error('Capture timeout 180s'); if (server) spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']); }, 180000);
 try {
  await new Promise((resolve, reject) => { const net = require('node:net').createServer(); net.once('error', reject); net.listen(port, () => net.close(resolve)); });
  const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { env, windowsHide: true, encoding: 'utf8', timeout: 150000 });
  console.log(build.stdout); console.error(build.stderr); assert.equal(build.status, 0, 'production build');
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(port)], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { output += chunk; });
  for (let i = 0; i < 60; i++) {
   if (server.exitCode !== null) throw new Error(output);
   try { if ((await fetch(base + '/admin/media-manager.capture?step=3', { signal: AbortSignal.timeout(1500) })).ok) break; } catch {}
   if (i === 59) throw new Error('Preview readiness failed: ' + output);
   await new Promise(resolve => setTimeout(resolve, 500));
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  await context.route('**/*', route => {
   const req = route.request();
   if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method()) && !req.url().startsWith(base + '/_next/')) return route.abort();
   return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const slug = 'el-gouna-marina-residential-building-عمارة-شقق-بالجونة-bqycxm';
  for (const width of [1280, 390]) {
   await page.setViewportSize({ width, height: 1000 });
   await page.goto(base + '/admin/media-manager.capture?step=3', { waitUntil: 'networkidle' });
   const manager = page.locator('[data-capture-manager]');
   await manager.screenshot({ path: path.join(shots, `manager-empty-ar-${width}.png`) });
   assert.equal(await manager.locator('input[type=url], input[type=text]').count(), 0);
   const link = manager.getByRole('button', { name: 'إضافة رابط (يوتيوب / MP4)', exact: true });
   await link.focus(); assert.ok(await link.evaluate(e => e === document.activeElement));
   await link.click(); await manager.getByRole('button', { name: 'إضافة', exact: true }).click();
   await manager.getByRole('alert').waitFor();
   await manager.screenshot({ path: path.join(shots, `manager-error-ar-${width}.png`) });
   await manager.getByRole('textbox', { name: 'رابط الفيديو' }).fill('https://youtu.be/dQw4w9WgXcQ');
   await manager.getByRole('button', { name: 'إضافة', exact: true }).click();
   await manager.locator('article').waitFor();
   await manager.getByLabel('العنوان بالعربية').fill('عنوان معدل للاختبار');
   await manager.locator('.thumbnail img, [class*="thumbnail"] img').evaluateAll(images => Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }))));
   await manager.screenshot({ path: path.join(shots, `manager-video-ar-${width}.png`) });
   assert.equal(await manager.getByText('تعريفي', { exact: true }).count(), 1);
   assert.equal(await manager.getByText('يوتيوب', { exact: true }).count(), 1);
   const small = await manager.locator('button:visible').evaluateAll(list => list.filter(e => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(e => e.textContent));
   assert.deepEqual(small, []);
   // Inspect production ZoneInspector in fixture; position is existing desktop flyout.
   await page.getByRole('button', { name: 'Toggle inspector fixture' }).click();
   await page.locator('[data-capture-zone] .zi-root').screenshot({ path: path.join(shots, `unit-inspector-ar-${width}.png`) });
   await page.locator('[data-capture-zone] [data-media-manager]').screenshot({ path: path.join(shots, `unit-inspector-media-ar-${width}.png`) });
   await page.getByRole('button', { name: 'Toggle inspector fixture' }).click();
   await page.getByRole('button', { name: 'Toggle building fixture' }).click();
   const form = page.locator('[data-capture-form]');
   assert.equal(await form.locator('form form').count(), 0);
   assert.equal(await form.locator('button:not([type=button])').count(), 0);
   await form.locator('[data-media-manager]').screenshot({ path: path.join(shots, `building-media-ar-${width}.png`) });
   await page.getByRole('button', { name: 'Toggle building fixture' }).click();
   assert.equal(await manager.evaluate(e => e.scrollWidth > e.clientWidth), false, `${width} manager overflow`);
   await page.goto(`${base}/ar/properties/${encodeURIComponent(slug)}`, { waitUntil: 'networkidle' });
   const preview = page.getByRole('region', { name: 'معاينة مخطط المبنى' });
   await preview.waitFor();
   await preview.getByRole('button').filter({ hasText: /^الدور 2/ }).click();
   await preview.getByRole('button').filter({ hasText: /^شقة 2A/ }).click();
   const unitVideos = await preview.locator('[data-zone-media] .luxury-ambient-player-root').count();
   await page.locator('.blueprint-studio-root').screenshot({ path: path.join(shots, `gouna-unit-2A-ar-${width}.png`) });
   await preview.getByRole('button', { name: /الصالة \/ الاستقبال/ }).click();
   const detail = preview.locator('[data-blueprint-detail]');
   await detail.waitFor();
   const zoneVideos = await detail.locator('[data-zone-media] .luxury-ambient-player-root').count();
   await page.locator('.blueprint-studio-root').screenshot({ path: path.join(shots, `gouna-zone-living-ar-${width}.png`) });
   await detail.screenshot({ path: path.join(shots, `gouna-zone-panel-ar-${width}.png`) });
   console.log(`${width}: Gouna unit 2A overview players=${unitVideos}; selected living-zone overview players=${zoneVideos}; 9 fresh screenshots; fixture controls/focus/targets/overflow checked`);
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
