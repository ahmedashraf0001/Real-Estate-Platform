const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const option = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;
const PORT = option('--port') || '51109';
const BASE = `http://localhost:${PORT}`;
const SHOTS = path.resolve(option('--shots') || path.resolve(__dirname, '../../.agents/runs/site-visual-4b/shots'));
const SLUG = "el-gouna-marina-residential-building-\u0639\u0645\u0627\u0631\u0629-\u0634\u0642\u0642-\u0628\u0627\u0644\u062c\u0648\u0646\u0629-bqycxm";
const BP = '[aria-label="\u0645\u0639\u0627\u064a\u0646\u0629 \u0645\u062e\u0637\u0637 \u0627\u0644\u0645\u0628\u0646\u0649"]';
const widths = [1440, 1280, 390];
const themes = ['light', 'dark'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
fs.mkdirSync(SHOTS, { recursive: true });

async function theme(page, value) {
  await page.evaluate(t => { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('zf_theme', t); }, value);
  await page.waitForFunction(t => document.documentElement.getAttribute('data-theme') === t, value);
  await delay(400);
}
async function screenshot(page, name) { await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }
async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No document overflow'); }
async function closeSidebar(page) {
  await page.locator('.dir-collapse-btn').click();
  await page.locator('.floating-glass-directory').waitFor({ state: 'detached' });
  await page.waitForFunction(() => { const r=document.querySelector('.nav-glass-capsule').getBoundingClientRect(); const wrap=document.querySelector('.navbar-wrapper').getBoundingClientRect(); return Math.abs((r.left+r.right)/2-(wrap.left+wrap.right)/2)<1; });
}
async function openSidebar(page) {
  await page.locator('.floating-sidebar-trigger').click();
  await page.locator('.floating-glass-directory').waitFor({ state: 'visible' });
  await delay(400);
}
async function navGeometry(page, width, locale, open) {
  const geometry = await page.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
    const nav = document.querySelector('.nav-glass-capsule');
    const members = ['.brand-primary-name','.brand-sub-text','.brand-emblem-wrap', ...Array.from(document.querySelectorAll('.desktop-nav .nav-link')).map((_,i) => `.desktop-nav .nav-link:nth-child(${i+1})`), '.nav-controls'];
    return { nav:rect(nav), sidebar:document.querySelector('.floating-glass-directory') ? rect(document.querySelector('.floating-glass-directory')) : null,
      members: members.map(selector => { const el=document.querySelector(selector); if(!el) throw new Error(`Missing nav ${selector}`); return {selector,...rect(el)}; }),
      padding: parseFloat(getComputedStyle(nav).paddingInlineStart), viewport:document.querySelector('.navbar-wrapper').getBoundingClientRect().right, height:innerHeight };
  });
  if (open) {
    assert.ok(geometry.sidebar.top <= 24 && geometry.sidebar.bottom >= geometry.height - 24, `Full height sidebar ${JSON.stringify(geometry.sidebar)}`);
  }
  if (width > 992) {
    assert.equal(geometry.nav.height, 56, 'Map navbar compact height');
    assert.ok(geometry.padding <= 18, 'Map navbar compact padding');
    if (open) {
      assert.ok(locale === 'ar' ? geometry.nav.left >= geometry.sidebar.right : geometry.nav.right <= geometry.sidebar.left, 'Navbar separated from sidebar');
    } else assert.ok(Math.abs((geometry.nav.left+geometry.nav.right)/2-geometry.viewport/2)<4, 'Collapsed navbar centered');
    for (const member of geometry.members) assert.ok(member.left >= geometry.nav.left - 1 && member.right <= geometry.nav.right + 1, `${member.selector} contained in capsule: ${JSON.stringify(geometry)}`);
    // The wordmark/subtitle may overlap each other horizontally, but must not overlap navigation/control groups.
    const branding=geometry.members.filter(r=>r.selector.startsWith('.brand-'));
    const links=geometry.members.filter(r=>!r.selector.startsWith('.brand-'));
    for(const a of branding) for(const b of links) assert.ok(a.right<=b.left+1 || b.right<=a.left+1, `Brand/link overlap ${a.selector}/${b.selector}`);
    for(let i=0;i<links.length;i++) for(let j=i+1;j<links.length;j++) assert.ok(links[i].right<=links[j].left+1 || links[j].right<=links[i].left+1, 'Navigation/control overlap');
  }
}
async function glass(page, value) {
  const styles=await page.evaluate(()=>['.floating-glass-directory','.floating-estate-card','.map-mode-pill-btn','.map-glass-ctrl-pill'].map(selector=>{
    const el=document.querySelector(selector); if(!el)throw new Error(`Missing glass ${selector}`);const s=getComputedStyle(el);return {selector,bg:s.backgroundColor,image:s.backgroundImage,color:s.color};
  }));
  for(const s of styles) {
    assert.equal(s.image,'none',`${s.selector} has no stale gradient`);
    const expected = value==='light' ? /rgba\(255,\s*255,\s*255,\s*0\.72\)/ : (s.selector==='.floating-estate-card' ? /rgba\(255,\s*255,\s*255,\s*0\.07\)/ : /rgba\(20,\s*24,\s*35,\s*0\.58\)/);
    assert.match(s.bg,expected,`${s.selector} follows theme`);
    assert.match(s.color,value==='light'?/rgb\(13,\s*17,\s*23\)/:/rgb\(255,\s*255,\s*255\)/,`${s.selector} readable text`);
  }
}
async function loadedMap(page, mode, value) {
  const provider=mode==='satellite'?'World_Imagery':`World_${value==='light'?'Light':'Dark'}_Gray`;
  await page.waitForFunction(expected => {
    const tiles=[...document.querySelectorAll('.leaflet-tile')];
    return tiles.length>1 && tiles.every(t=>(t.dataset.tileUrl||t.src).includes(expected) && t.complete && t.naturalWidth>0);
  }, provider, {timeout:30000});
  const content=await page.evaluate(mode=>{
    const tiles=[...document.querySelectorAll('.leaflet-tile')];
    const sampled=tiles.filter(t=>mode==='satellite'||t.dataset.tileUrl.includes('_Base/')).slice(0,8);
    const hashes=[];let min=255,max=0;
    for(const tile of sampled){const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(tile,0,0,32,32);const data=ctx.getImageData(0,0,32,32).data;let hash=2166136261;for(let i=0;i<data.length;i+=4){for(let c=0;c<3;c++){const v=data[i+c];min=Math.min(min,v);max=Math.max(max,v);hash=Math.imul(hash^v,16777619);}}hashes.push(hash>>>0);}
    return {urls:tiles.map(t=>t.dataset.tileUrl||t.src),hashes,min,max};
  },mode);
  assert.ok(content.hashes.length>1 && new Set(content.hashes).size>1,'Different geographic tiles must have different pixel content (reject identical provider error tiles)');
  assert.ok(content.max-content.min>12,'Basemap must contain visible geographic detail, not blank tiles');
  if(mode==='satellite') for(const url of content.urls)assert.doesNotMatch(url,/Reference|Transportation|Canvas/,'Imagery only');
  else for(const url of content.urls)assert.doesNotMatch(url,/cartocdn|[?&](key|token)=/,'Working key-free provider');
}
async function mapCapture(page) {
  for(const width of widths)for(const value of themes)for(const locale of ['ar','en']){
    console.log(`Map ${width} ${value} ${locale}`);
    await page.setViewportSize({width,height:width===390?844:960});
    await page.goto(`${BASE}/${locale}/map`,{waitUntil:'networkidle'});
    await theme(page,value);
    // Dev chrome is not product UI; real clicks below still enforce product hit testing.
    await page.addStyleTag({content:'nextjs-portal { display:none !important; }'});
    await page.locator('.floating-glass-directory').waitFor();
    await delay(400);
    await navGeometry(page,width,locale,true);await glass(page,value);await noOverflow(page);
    for(const mode of ['satellite','vector']){
      await loadedMap(page,mode,value);
      await screenshot(page,`map-${value}-${locale}-${width}-${mode}-open`);
      await closeSidebar(page);
      await navGeometry(page,width,locale,false);await noOverflow(page);
      await screenshot(page,`map-${value}-${locale}-${width}-${mode}-collapsed`);
      // Both controls are reached through ordinary clicks. On phone the full-height directory is dismissed first.
      await page.locator('.map-mode-pill-btn').focus();
      assert.equal(await page.locator('.map-mode-pill-btn').evaluate(el=>document.activeElement===el),true,'Style control keyboard focus');
      await page.locator('.map-mode-pill-btn').press('Enter');
      await loadedMap(page,mode==='satellite'?'vector':'satellite',value);
      await openSidebar(page);
    }
    await closeSidebar(page);
    await page.locator('.map-mode-pill-btn').click();
    await loadedMap(page,'vector',value);
    const next=value==='light'?'dark':'light';await theme(page,next);await loadedMap(page,'vector',next);
  }
}
async function scrollBlueprint(page){const bp=page.locator(BP);await bp.waitFor();await bp.scrollIntoViewIfNeeded();await delay(200);}
async function blueprintCapture(page){
 const url=`${BASE}/ar/properties/${encodeURIComponent(SLUG)}`;
 for(const width of widths)for(const value of themes){
  console.log(`Blueprint ${width} ${value}`);await page.setViewportSize({width,height:width===390?844:960});
  await page.goto(url,{waitUntil:'networkidle'});await theme(page,value);await scrollBlueprint(page);
  assert.equal(await page.locator(`${BP} aside[aria-label]`).count(),1,'Only detail aside remains on facade');
  assert.equal(await page.locator(`${BP} aside[class*="floors"]`).count(),0,'Facade has no duplicate floor list');
  if(width>992)assert.ok((await page.locator(`${BP} [class*="planColumn"]`).boundingBox()).width>=500,'Facade occupies main region');
  await noOverflow(page);await screenshot(page,`gouna-facade-${value}-${width}`);
  const label=page.locator(`${BP} svg g[role="button"]`).first();await label.waitFor();await label.focus();await label.press('Enter');
  await page.locator(`${BP} aside[class*="floors"]`).waitFor();assert.ok(new URL(page.url()).searchParams.get('bp')?.startsWith('floor/'),'Facade label keyboard navigates floor URL');
  await page.goto(`${url}?bp=floor%2Fbld_ground`,{waitUntil:'networkidle'});await theme(page,value);await scrollBlueprint(page);
  const ground=await page.locator(BP).evaluate(root=>{
   const r=part=>{const el=root.querySelector(`[class*="${part}"]`);if(!el)throw new Error(`Missing plan region ${part}`);const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width};};
   return {frame:r('groundBuildingFrame'),garage:r('groundGarageCol'),core:r('groundCoreCol'),services:r('groundServicesCol'),front:r('groundFrontStrip'),gate:r('groundGateBoundary'),street:r('groundStreet')};
  });
  assert.ok((ground.garage.right<=ground.core.left&&ground.core.right<=ground.services.left)||(ground.services.right<=ground.core.left&&ground.core.right<=ground.garage.left),'Core between garage/services');
  assert.ok(ground.garage.width>ground.core.width&&ground.garage.width>ground.services.width,'Garage largest side block');
  assert.ok(ground.front.top>=ground.core.bottom-1&&ground.gate.top>=ground.frame.bottom&&ground.street.top>=ground.gate.bottom,'Front lobby/gate/street spatial relation');
  await noOverflow(page);await screenshot(page,`gouna-ground-plan-${value}-${width}`);
  await page.goto(`${url}?bp=floor%2FFloor%202`,{waitUntil:'networkidle'});await theme(page,value);await scrollBlueprint(page);
  await page.locator(`${BP} aside[class*="floors"]`).waitFor();const unit=page.locator(`${BP} button[class*="unit"]`).first();await unit.waitFor();
  await noOverflow(page);await screenshot(page,`gouna-typical-floor-${value}-${width}`);
  await unit.click();await page.locator(`${BP} button[class*="room"]`).first().waitFor();await scrollBlueprint(page);
  assert.ok(new URL(page.url()).searchParams.get('bp')?.includes('/unit/'),'Unit tile navigates real URL');
  await page.locator(`${BP} aside[class*="floors"]`).waitFor();
  const room=page.locator(`${BP} button[class*="room"]`).first();await room.focus();await room.press('Enter');assert.equal(await room.getAttribute('aria-pressed'),'true','Room keyboard selection');
  await noOverflow(page);await screenshot(page,`gouna-unit-${value}-${width}`);
 }
}
async function main(){
 let server,browser;
 try{
  const existing=await fetch(`${BASE}/ar/map`).then(r=>r.ok).catch(()=>false);
  if(!existing){
   server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),process.argv.includes('--production')?'start':'dev','-p',PORT],{cwd:path.resolve(__dirname,'..'),stdio:'pipe',env:{...process.env,...(process.argv.includes('--production')?{}:{NEXT_DIST_DIR:'.next-capture'})}});
   server.stderr.on('data',d=>process.stderr.write(d));
   const deadline=Date.now()+60000;let ready=false;while(Date.now()<deadline){try{ready=(await fetch(`${BASE}/ar/map`)).ok;}catch{}if(ready)break;await delay(500);}assert.ok(ready,`Server failed on ${PORT}`);
  }
  browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext();const page=await context.newPage();
  await mapCapture(page);await blueprintCapture(page);console.log('PASS: 48 map + 24 blueprint screenshots; all observed geometry/content/interaction assertions passed.');
 }finally{
  if(browser)await browser.close();
  if(server){if(process.platform==='win32')execFileSync('taskkill',['/pid',String(server.pid),'/T','/F'],{stdio:'ignore'});else server.kill('SIGTERM');}
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
