const { chromium } = require('playwright');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const net = require('node:net');
const { loadEnvConfig } = require('@next/env');
const app = path.resolve(__dirname, '..');
const shotsIndex = process.argv.indexOf('--shots');
assert.ok(shotsIndex > -1, '--shots required');
const shots = path.resolve(process.argv[shotsIndex + 1]);
const port = 51215, controlPort = 51216, base = `http://localhost:${port}`;
const control = `http://127.0.0.1:${controlPort}`;
const originals = ['tsconfig.json', 'next-env.d.ts'].map(file => [path.join(app, file), fs.readFileSync(path.join(app, file))]);
let server, browser, fixtureServer;
function stop(child) {
  if (child?.pid && child.exitCode === null) {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
  }
}
async function free(port) {
  await new Promise((resolve, reject) => { const check = net.createServer(); check.once('error', reject); check.listen(port, '127.0.0.1', () => check.close(resolve)); });
}
const env = { ...process.env, NEXT_DIST_DIR: '.next-capture/site-content-db', NEXT_PUBLIC_SUPABASE_URL: control, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'capture-anon-key', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'capture-anon-key', NEXT_TELEMETRY_DISABLED: '1' };
async function build() {
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], { cwd: app, env, stdio: 'inherit' });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { stop(child); reject(new Error('build exceeded 180000ms')); }, 180000);
    child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`build exit ${code}`)); });
  });
}
const setFixture = body => fetch(control, { method: 'POST', body: JSON.stringify(body) }).then(response => response.json());
(async () => {
  let captures = 0;
  try {
    await free(port); await free(controlPort); fs.mkdirSync(shots, { recursive: true });
    loadEnvConfig(app);
    fixtureServer = require('./lib/site-content-capture-proxy.cjs')();
    await new Promise(resolve => fixtureServer.listen(controlPort, '127.0.0.1', resolve));
    await build();
    server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--port', String(port)], { cwd: app, env, stdio: 'inherit' });
    const deadline = Date.now() + 30000;
    while (true) {
      try { const result = await fetch(base + '/ar/about'); if (result.ok) break; } catch {}
      if (Date.now() > deadline) throw new Error('preview did not start');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext();
    await context.route('**/*', route => {
      const request = route.request();
      if (request.url().includes('/rest/v1/')) return route.fulfill({ json: [] });
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !request.url().startsWith(base + '/')) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') console.error('Browser console:', message.text()); });
    const capture = async (name, locator, fullPage = true) => { await locator.screenshot({ path: path.join(shots, name + '.png'), animations: 'disabled', ...(locator === page ? { fullPage } : {}) }); captures++; };
    for (const width of [1440, 1280, 390]) for (const locale of ['ar', 'en']) for (const theme of ['light', 'dark']) {
      await context.clearCookies();
      await context.addCookies([{ name: 'zf_theme', value: theme, url: base }]);
      await page.addInitScript(theme => localStorage.setItem('zf_theme', theme), theme);
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(base + '/' + locale + '/about', { waitUntil: 'networkidle' });
      const charter = page.locator('.atelier-curation-section');
      await charter.waitFor();
      await page.locator('.atelier-hero-title').waitFor();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.atelier-hero-title')).opacity === '1');
      await page.getByRole('link', { name: locale === 'ar' ? 'اطلب تقرير الفحص' : 'Request an inspection report', exact: true }).waitFor();
      assert.equal(await page.locator('[data-charter-stage]').count(), 3);
      assert.equal(await page.locator('[data-charter-accept]').count(), 3);
      assert.equal(await page.locator('[data-charter-reject]').count(), 3);
      assert.doesNotMatch(await charter.innerText(), /70%|٧٠٪/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'document overflow');
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      if (width >= 1280) {
        await page.waitForFunction(() => {
          const deck = document.querySelector('.paravent-deck-container');
          const panel = deck.querySelector('.expanded');
          return panel.getBoundingClientRect().width >= deck.getBoundingClientRect().width * .6;
        }, null, { timeout: 3000 }).catch(async error => {
          console.error('folio geometry', await page.locator('.paravent-deck-container').evaluate(deck => ({ width: deck.getBoundingClientRect().width, children: [...deck.children].map(child => ({ width: child.getBoundingClientRect().width, flex: getComputedStyle(child).flex, classes: child.className })) })));
          throw error;
        });
      }
      if (width === 390) {
        const rows = await page.locator('[data-charter-stage]').evaluateAll(stages => stages.map(stage => {
          const title = stage.querySelector('.charter-heading').getBoundingClientRect();
          const accept = stage.querySelector('[data-charter-accept]').getBoundingClientRect();
          const reject = stage.querySelector('[data-charter-reject]').getBoundingClientRect();
          return { titleBottom: title.bottom, acceptTop: accept.top, acceptBottom: accept.bottom, rejectTop: reject.top, left: Math.min(title.left, accept.left, reject.left), right: Math.max(title.right, accept.right, reject.right) };
        }));
        for (const row of rows) { assert.ok(row.titleBottom <= row.acceptTop); assert.ok(row.acceptBottom <= row.rejectTop); assert.ok(row.left >= 0 && row.right <= width); }
      }
      await capture(`about-${locale}-${theme}-${width}-full`, page);
      await capture(`about-${locale}-${theme}-${width}-charter`, charter);
      if (width === 1440) await capture(`about-${locale}-${theme}-${width}-story`, page.locator('.atelier-paravent-section'));
      const link = page.getByRole('link', { name: locale === 'ar' ? 'اطلب تقرير الفحص' : 'Request an inspection report', exact: true });
      await link.focus(); assert.equal(await link.evaluate(element => element === document.activeElement), true);
      await page.locator('.paravent-panel').nth(1).focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('.paravent-panel').nth(1).getAttribute('aria-expanded'), 'true');
      assert.doesNotMatch(await page.locator('.paravent-deck-container').innerText(), /70%|٧٠٪/);
    }
    // Fixture auth is accepted only by the capture proxy. No real admin session.
    const project = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
    const jwt = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: '00000000-0000-4000-8000-000000000001', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.capture';
    const session = { access_token: jwt, refresh_token: 'capture', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user: { id: '00000000-0000-4000-8000-000000000001', role: 'authenticated' } };
    await context.addCookies([{ name: `sb-${project}-auth-token`, value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: base }]);
    for (const width of [1440, 1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base + '/admin/ar/page-content', { waitUntil: 'networkidle' });
      await page.locator('[data-content-block="hero"]').waitFor();
      assert.match(page.url(), /\/admin\/ar\/page-content$/);
      assert.equal(await page.locator('[data-content-block]').count(), 6);
      assert.equal(await page.locator('[data-content-block] button:not([type="button"])').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'admin overflow');
      await capture(`admin-ar-${width}-full`, page);
      if (width === 390) await capture('admin-ar-390-viewport', page, false);
      if (width === 1440) {
        await page.locator('#heroTitle1-ar').fill('عنوان معاينة الاختبار');
        await page.locator('[data-about-preview] .atelier-hero-title').filter({ hasText: 'عنوان معاينة الاختبار' }).waitFor();
        await page.locator('[data-content-block="charter"] > div').first().getByRole('button', { name: 'معاينة', exact: true }).click();
        await page.locator('#stages-0-title-ar').fill('مرحلة أولى للاختبار');
        assert.match(await page.locator('[data-about-preview]').innerText(), /مرحلة أولى للاختبار/);
        await capture('admin-ar-1440-charter-editor', page, false);
        await page.getByRole('button', { name: 'إضافة مراحل الفحص', exact: true }).click();
        assert.equal(await page.locator('[data-about-preview] [data-charter-stage]').count(), 4);
        await page.locator('#stages-3-title-ar').fill('مرحلة مضافة');
        await page.locator('#stages-3-title-ar').locator('xpath=ancestor::div[contains(@class,"listItem")][1]').getByRole('button', { name: 'لأعلى', exact: true }).click();
        assert.equal(await page.locator('#stages-2-title-ar').inputValue(), 'مرحلة مضافة');
        await page.locator('#stages-2-title-ar').locator('xpath=ancestor::div[contains(@class,"listItem")][1]').getByRole('button', { name: 'حذف', exact: true }).click();
        assert.equal(await page.locator('[data-about-preview] [data-charter-stage]').count(), 3);
        await setFixture({ failWrites: true });
        await page.getByRole('button', { name: 'حفظ التعديلات', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: 'تعذر حفظ المحتوى' }).waitFor();
        await capture('admin-ar-1440-error', page);
        await setFixture({ failWrites: false });
        await page.getByRole('button', { name: 'حفظ التعديلات', exact: true }).click();
        await page.getByRole('button', { name: 'تم الحفظ', exact: true }).waitFor();
        await capture('admin-ar-1440-saved', page);
        await page.goto(base + '/ar/about', { waitUntil: 'networkidle' });
        assert.match(await page.locator('.atelier-hero-title').innerText(), /عنوان معاينة الاختبار/);
        await page.goto(base + '/admin/ar/page-content', { waitUntil: 'networkidle' });
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'استعادة الافتراضي', exact: true }).click();
        await page.getByRole('button', { name: 'تم الحفظ', exact: true }).waitFor();
        assert.equal(await page.locator('#heroTitle1-ar').inputValue(), 'ريادة التميز في');
        await setFixture({ rows: { about_page: {} } });
        console.log('editor: live preview, add, reorder, remove, write failure, retry and visitor propagation verified with isolated fixtures');
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + '/admin/ar/settings', { waitUntil: 'networkidle' });
    const priceCard = page.locator('.settings-card').filter({ has: page.getByRole('heading', { name: /إخفاء أسعار العقارات عن الزوار/ }) });
    const toggle = priceCard.locator('input[type="checkbox"]');
    assert.equal(await toggle.isChecked(), true, 'saved settings reach settings screen');
    await toggle.uncheck();
    assert.equal((await fetch(control).then(response => response.json())).writes, 3, 'editing settings does not autosave');
    await setFixture({ failWrites: true });
    await page.getByRole('button', { name: 'حفظ التعديلات', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'تعذر حفظ الإعدادات' }).waitFor();
    await capture('settings-ar-1440-error', page, false);
    await setFixture({ failWrites: false });
    await page.getByRole('button', { name: 'حفظ التعديلات', exact: true }).click();
    await page.getByRole('button', { name: 'تم الحفظ بنجاح!', exact: true }).waitFor();
    assert.equal((await fetch(control).then(response => response.json())).rows.platform_settings.hidePropertyPrices, false);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'استعادة الافتراضي', exact: true }).click();
    await page.getByRole('button', { name: 'تم الحفظ بنجاح!', exact: true }).waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('input[type="checkbox"]')].some(element => !element.checked));
    assert.equal((await fetch(control).then(response => response.json())).rows.platform_settings, undefined, 'reset deletes settings row');
    await capture('settings-ar-1440-defaults', page, false);
    assert.deepEqual(errors, [], 'no page errors');
    const fixture = await fetch(control).then(response => response.json());
    assert.ok(fixture.reads > 0); assert.equal(fixture.writes, 6);
    console.log(JSON.stringify({ captures, reads: fixture.reads, writes: fixture.writes, shots }));
  } finally {
    if (browser) await browser.close();
    stop(server);
    if (fixtureServer) await new Promise(resolve => fixtureServer.close(resolve));
    for (const [file, content] of originals) fs.writeFileSync(file, content);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
