// Offline public-site capture: real routes, isolated PostgREST fixture, no live DB.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const option = name => process.argv[process.argv.indexOf(name) + 1];
const phase = option('--phase');
const cpu = Number(process.argv.includes('--cpu') ? option('--cpu') : 8);
assert.ok(['before', 'after'].includes(phase), '--phase before|after required');
const output = path.resolve(option('--output'));
const port = 51218;
const apiPort = 51219;
const base = `http://localhost:${port}`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const fixture = Array.from({ length: 18 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  slug: `scroll-fixture-${i + 1}`, title_en: `Scroll fixture ${i + 1}`, title_ar: `عقار الاختبار ${i + 1}`,
  description_en: 'Offline scrolling fixture. Gallery, specification and acquisition sections.',
  description_ar: 'عقار اختبار محلي لمراجعة التمرير والمعرض والمواصفات.',
  type: 'villa', location: 'Cairo', district: 'Cairo', price_egp: 6000000,
  bedrooms: 4, bathrooms: 3, area_sqm: 360, listing_status: 'active',
  is_featured: i < 6, completion_status: 'ready', is_archived: false,
  property_images: [1, 2, 3].map((n) => ({ id: `${i}-${n}`, url: '/images/sunlit-hero-villa.png', sort_order: n })),
  property_amenities: [], created_at: '2026-01-01T00:00:00Z',
}));
const api = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${apiPort}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.end();
  assert.equal(req.method, 'GET', 'capture must never mutate fixture');
  if (url.pathname === '/rest/v1/properties') {
    const slug = url.searchParams.get('slug');
    const rows = slug ? fixture.filter(p => `eq.${p.slug}` === slug) : fixture;
    res.end(JSON.stringify(req.headers.accept?.includes('object') ? rows[0] : rows));
  } else res.end('[]');
});
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${apiPort}`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'offline-capture-key', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'offline-capture-key',
  SUPABASE_SERVICE_ROLE_KEY: 'offline-capture-key', NEXT_PUBLIC_ENABLE_AGENTATION: 'false' };
let server, browser;
let captureTiles = false;
async function command(args) {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', ...args], { env, stdio: 'inherit' });
  const code = await new Promise(resolve => child.on('exit', resolve));
  assert.equal(code, 0, `next ${args.join(' ')} failed`);
}
async function trace(page, name) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.evaluate(() => {
    window.__scrollEvidence = { frames: [], tasks: [] };
    let last;
    window.__scrollObserver = new PerformanceObserver(list => window.__scrollEvidence.tasks.push(...list.getEntries().map(e => e.duration)));
    window.__scrollObserver.observe({ type: 'longtask', buffered: false });
    const tick = t => { if (last) window.__scrollEvidence.frames.push(t - last); last = t; window.__scrollFrame = requestAnimationFrame(tick); };
    window.__scrollFrame = requestAnimationFrame(tick);
  });
  const completed = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,v8,cc,disabled-by-default-devtools.timeline', transferMode: 'ReturnAsStream' });
  for (let i = 0; i < 48; i++) { await page.mouse.wheel(0, i < 24 ? 180 : -180); await wait(125); }
  await wait(1300);
  await cdp.send('Tracing.end');
  const { stream } = await completed;
  let raw = '';
  for (;;) { const chunk = await cdp.send('IO.read', { handle: stream }); raw += chunk.data; if (chunk.eof) break; }
  await cdp.send('IO.close', { handle: stream });
  fs.writeFileSync(path.join(output, `${phase}-${name}.trace.json`), raw);
  const events = JSON.parse(raw).traceEvents;
  const main = events.find(e => e.name === 'thread_name' && e.args.name === 'CrRendererMain' && events.some(x => x.pid === e.pid && x.tid === e.tid && x.name === 'FunctionCall'));
  const costs = {};
  for (const e of events) if (e.ph === 'X' && e.pid === main?.pid && e.tid === main?.tid) costs[e.name] = (costs[e.name] || 0) + (e.dur || 0) / 1000;
  // Keep nested scopes separate: inclusive event sums are not total CPU time.
  const scripting = {};
  for (const [label, names] of Object.entries({
    scriptingUnionMs: ['FunctionCall', 'EvaluateScript', 'EventDispatch'],
    callbackEventUnionMs: ['FunctionCall', 'EventDispatch'],
  })) {
    const intervals = events.filter(e => e.ph === 'X' && e.pid === main?.pid && e.tid === main?.tid && names.includes(e.name))
      .map(e => [e.ts, e.ts + e.dur]).sort((a,b) => a[0]-b[0]);
    let end = 0, elapsed = 0;
    for (const [start, finish] of intervals) { elapsed += Math.max(0, finish-Math.max(end,start)); end = Math.max(end,finish); }
    scripting[label] = elapsed / 1000;
  }
  const data = await page.evaluate(() => { cancelAnimationFrame(window.__scrollFrame); window.__scrollObserver.disconnect(); return window.__scrollEvidence; });
  const frames = data.frames.sort((a,b) => a-b);
  const result = { name, longTasks: data.tasks.length, longTaskMs: data.tasks.reduce((a,b)=>a+b,0),
    frameMeanMs: frames.reduce((a,b)=>a+b,0)/frames.length, frameP95Ms: frames[Math.floor(frames.length*0.95)],
    droppedFrameEstimate: frames.reduce((n,t)=>n+Math.max(0,Math.round(t/(1000/60))-1),0),
    ...scripting,
    paintMs: costs.Paint || 0, compositePreparationMs: costs.Layerize || 0,
    top5InclusiveMs: Object.entries(costs).filter(([n])=>['FunctionCall','EvaluateScript','EventDispatch','Paint','Layerize','UpdateLayoutTree','Layout','CompositeLayers'].includes(n)).sort((a,b)=>b[1]-a[1]).slice(0,5) };
  console.log('METRICS', JSON.stringify(result));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.detach();
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => api.listen(apiPort, '127.0.0.1', resolve));
  if (!process.argv.includes('--skip-build')) await command(['build']);
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], { env, stdio: 'inherit' });
  for (let i=0;i<100;i++) { try { await fetch(base+'/en'); break; } catch { await wait(200); } }
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('**/*', route => (new URL(route.request().url()).hostname === 'localhost' || (captureTiles && new URL(route.request().url()).hostname === 'server.arcgisonline.com')) ? route.continue() : route.abort());
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  if (!process.argv.includes('--capture-only')) for (const name of ['properties', 'detail']) {
    await page.goto(base+'/en/properties'+(name==='detail'?'/scroll-fixture-1':''), { waitUntil: 'networkidle' });
    await page.getByText('Scroll fixture 1', { exact: true }).first().waitFor();
    await wait(2000);
    await trace(page, name);
  }
  if (process.argv.includes('--glass')) {
    captureTiles = true;
    await require('./site-glass-capture.cjs')(page, base, path.resolve(option('--shots')));
    return;
  }
  for (const width of [1280,390]) for (const locale of ['en','ar']) for (const name of ['home','detail']) {
    await page.setViewportSize({ width, height: width===390?844:900 });
    await page.goto(base+'/'+locale+(name==='detail'?'/properties/scroll-fixture-1':''), { waitUntil: 'networkidle' });
    await page.locator('h1').waitFor();
    await wait(1800);
    await page.screenshot({ path: path.join(output, `${phase}-${name}-${locale}-${width}.png`) });
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false, `${name} ${locale} ${width} overflow`);
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(()=>document.activeElement !== document.body),'keyboard focus');
  }
  if (phase==='after') {
    await page.setViewportSize({width:1280,height:900});
    await page.goto(base+'/en/properties/scroll-fixture-1',{waitUntil:'networkidle'});
    assert.equal(await page.evaluate(()=>!!window.__masrLenis),true,'desktop Lenis enabled');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>!window.__masrLenis);
    assert.equal(await page.evaluate(()=>document.body.classList.contains('custom-cursor-active')),false);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>!!window.__masrLenis);
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>!window.__masrLenis);
    await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));
    await page.waitForFunction(()=>document.querySelector('.mobile-bottom-lead-bar').classList.contains('lead-bar-hidden'));
    await page.waitForFunction(()=>!document.querySelector('.mobile-bottom-lead-bar').classList.contains('lead-bar-hidden'));
    await page.evaluate(()=>window.scrollTo({top:300,behavior:'instant'}));
    await wait(80);
    assert.equal(await page.locator('.mobile-bottom-lead-bar').evaluate(e=>e.classList.contains('lead-bar-hidden')),false,'upward scroll shows lead bar');
    await page.setViewportSize({width:1280,height:900});
    await page.waitForFunction(()=>!!window.__masrLenis);
    const touch = await browser.newContext({viewport:{width:1280,height:900},hasTouch:true});
    await touch.route('**/*',route=>new URL(route.request().url()).hostname==='localhost'?route.continue():route.abort());
    const touchPage = await touch.newPage();
    await touchPage.goto(base+'/en',{waitUntil:'networkidle'});
    assert.equal(await touchPage.evaluate(()=>!!window.__masrLenis),false,'touch uses native scroll');
    assert.equal(await touchPage.evaluate(()=>document.body.classList.contains('custom-cursor-active')),false,'touch uses native cursor');
    await touch.close();
    console.log('PASS desktop/reduced-motion/resize/touch lifecycle; mobile lead bar down/idle/up; 8 viewport/RTL/focus captures');
  }
  await context.tracing.stop({path:path.join(output,`${phase}-playwright.zip`)});
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{
  if(browser) await browser.close();
  if(server) { server.kill(); await new Promise(resolve=>server.once('exit',resolve)); }
  await new Promise(resolve=>api.close(resolve));
});
