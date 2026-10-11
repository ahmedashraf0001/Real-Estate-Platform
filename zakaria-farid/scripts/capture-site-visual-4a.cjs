const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const sharp = require('sharp');
const { contrast, assertFilledRows } = require('./lib/site-visual-assertions.cjs');
const option = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name)+1] : undefined;
const PORT = Number(option('--port') || 51108);
const PROXY_PORT = PORT + 2;
const BASE = `http://localhost:${PORT}`;
const CONTROL = `http://127.0.0.1:${PROXY_PORT}`;
const SHOTS = path.resolve(option('--shots') || path.resolve(__dirname,'../../.agents/runs/site-visual-4a/shots'));
const SLUG = 'el-gouna-marina-residential-building-\u0639\u0645\u0627\u0631\u0629-\u0634\u0642\u0642-\u0628\u0627\u0644\u062c\u0648\u0646\u0629-bqycxm';
const TOKEN = fs.readFileSync(path.resolve(__dirname,'../src/app/globals.css'),'utf8').match(/--gold-text-light:\s*(#[0-9a-f]{6})/i)[1];
const TOKEN_RGB = 'rgb('+TOKEN.slice(1).match(/../g).map(v=>parseInt(v,16)).join(', ')+')';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const shots = [], errors = [];
async function fixture(value) {
  const res=await fetch(CONTROL+'/fixture',{method:'POST',body:JSON.stringify(value)});
  assert.ok(res.ok); return res.json();
}
async function theme(page, desired) {
  const button=page.locator('.nav-glass-capsule .theme-btn:not(.bookmark-nav-btn)');
  await button.waitFor({state:'visible'});
  if (await page.locator('html').getAttribute('data-theme') !== desired) await button.click();
  await page.waitForFunction(t=>document.documentElement.dataset.theme===t,desired);
  assert.equal(await page.evaluate(()=>localStorage.getItem('zf_theme')),desired);
  await sleep(350);
}
async function shot(page,name) {
  if (/^gallery-(multi|video|focus)/.test(name)) { await page.locator('.gallery-media-frame').evaluate(e=>e.scrollIntoView({block:'center'})); await sleep(300); }
  const file=path.join(SHOTS,name+'.png'); await page.screenshot({path:file}); shots.push(file);
}
async function overflow(page) {
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'document horizontal overflow');
}
async function navbar(page, top) {
  const s=await page.locator('.nav-glass-capsule').evaluate(e=>{const c=getComputedStyle(e);return {bg:c.backgroundColor,blur:c.backdropFilter,border:c.borderStyle,shadow:c.boxShadow}});
  if(top) {assert.equal(s.bg,'rgba(0, 0, 0, 0)');assert.equal(s.blur,'none');assert.equal(s.border,'none');assert.equal(s.shadow,'none');}
  else {assert.match(s.blur,/blur\(/);assert.notEqual(s.bg,'rgba(0, 0, 0, 0)');}
}
async function rows(page,count) {
  await page.mouse.move(0,0);await sleep(275);
  const r=await page.locator('.property-spec-matrix-grid').evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {left:r.left,right:r.right,gap:parseFloat(s.columnGap),cards:[...e.children].map(c=>{const x=c.getBoundingClientRect();return {left:x.left,right:x.right,width:x.width,top:x.top}})}});
  try { return assertFilledRows(r,count); } catch(e) { throw new Error('grid count='+count+' geometry='+JSON.stringify(r)+' reason='+e.message); }
}
async function gold(page, selectors) {
  for(const selector of selectors) {
    const el=page.locator(selector).first();assert.ok(await el.count(),`missing gold text ${selector}`);
    const {color,background}=await el.evaluate(e=>{
      const nodes=[];for(let a=e;a;a=a.parentElement)nodes.unshift(a);
      let bg=[255,255,255];
      const rgba=value=>value.match(/[\d.]+/g)?.map(Number);
      const over=values=>values?.length>=3?bg.map((v,i)=>values[i]*(values[3]??1)+v*(1-(values[3]??1))):bg;
      const lum=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
      for(const node of nodes){const css=getComputedStyle(node);bg=over(rgba(css.backgroundColor));
        const stops=(css.backgroundImage.match(/rgba?\([^)]*\)/g)||[]).map(c=>over(rgba(c)));
        if(stops.length)bg=stops.reduce((a,b)=>lum(a)<lum(b)?a:b);
      }
      return {color:getComputedStyle(e).color,background:'#'+bg.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')};
    });
    assert.equal(color,TOKEN_RGB,selector+' must use canonical light text token');
    assert.ok(contrast(TOKEN,background)>=4.5,`${selector} ${TOKEN} on composited ${background}: ${contrast(TOKEN,background)}`);
  }
}
async function fullscreen(page) {
  const image=page.locator('.slot-center .carousel-card-img');await image.evaluate(e=>e.decode());await sleep(650);
  const g=await image.evaluate(e=>{
    const r=e.getBoundingClientRect(),p=e.parentElement,s=getComputedStyle(p),b=p.getBoundingClientRect();
    const available={width:b.width-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth),height:b.height-parseFloat(s.borderTopWidth)-parseFloat(s.borderBottomWidth)};
    const scale=Math.min(available.width/e.naturalWidth,available.height/e.naturalHeight);
    const clips=[];for(let a=p;a;a=a.parentElement){const c=getComputedStyle(a);if(/hidden|clip|auto|scroll/.test(c.overflowX+c.overflowY)){const q=a.getBoundingClientRect();clips.push({left:q.left,right:q.right,top:q.top,bottom:q.bottom});}}
    return {rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},natural:[e.naturalWidth,e.naturalHeight],expected:[e.naturalWidth*scale,e.naturalHeight*scale],fit:getComputedStyle(e).objectFit,clips,top:document.querySelector('.lightbox-top-bar').getBoundingClientRect().bottom,bottom:document.querySelector('.lightbox-bottom-dock').getBoundingClientRect().top};
  });
  assert.equal(g.fit,'contain');assert.ok(g.natural[0]>0);
  assert.ok(Math.abs(g.rect.width-g.expected[0])<2 && Math.abs(g.rect.height-g.expected[1])<2,`actual contained image rect ${JSON.stringify(g)}`);
  assert.ok(g.rect.top>=g.top-2 && g.rect.bottom<=g.bottom+2,'image between bars');
  for(const c of g.clips)assert.ok(g.rect.left>=c.left-2 && g.rect.right<=c.right+2 && g.rect.top>=c.top-2 && g.rect.bottom<=c.bottom+2,'image ancestor clipping');
  return g;
}
async function strip(page,locale,width) {
  const bar=page.locator('.in-photo-thumbnails-bar');await bar.waitFor({state:'visible'});
  const geom=await bar.evaluate(e=>{const r=e.getBoundingClientRect(),frame=(e.closest('.gallery-media-frame').querySelector('.main-image-frame')||e.closest('.gallery-media-frame')).getBoundingClientRect(),s=getComputedStyle(e),thumb=e.querySelector('.in-photo-thumb-btn').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,frame:{left:frame.left,right:frame.right,top:frame.top,bottom:frame.bottom},bg:s.backgroundColor,blur:s.backdropFilter,thumb:[thumb.width,thumb.height]}});
  assert.equal(await page.locator('.in-photo-counter .tabular-nums').evaluate(e=>getComputedStyle(e).direction),'ltr','counter ordering must survive RTL');
  assert.equal(await page.locator('.in-photo-counter .tabular-nums').evaluate(e=>getComputedStyle(e).unicodeBidi),'bidi-override','Arabic numeric runs must keep current before total');
  assert.equal(geom.bg,'rgba(12, 15, 22, 0.38)');assert.equal(geom.blur,'blur(12px)');assert.deepEqual(geom.thumb,width===390?[44,32]:[56,40]);
  assert.ok(geom.left>=geom.frame.left && geom.right<=geom.frame.right && geom.bottom<=geom.frame.bottom);
  const overlaps=await page.evaluate(()=>{const b=document.querySelector('.in-photo-thumbnails-bar').getBoundingClientRect();return [...document.querySelectorAll('.gallery-stage-overlay button,.gallery-arrow,.gallery-counter-pill,.player-controls-bottom')].filter(e=>{const r=e.getBoundingClientRect();return r.width && r.height && r.left<b.right && r.right>b.left && r.top<b.bottom && r.bottom>b.top}).map(e=>e.className)});
  assert.deepEqual(overlaps,[],'strip covers controls');
  const last=page.locator('.in-photo-thumb-btn:not(.thumb-video-btn)').last();await last.click();await sleep(650);
  assert.match(await page.locator('.main-hero-img').getAttribute('src'), /capture_image=13$/, 'last thumb changes production image source');
  assert.equal(await last.getAttribute('aria-current'),'true');assert.equal(await last.getAttribute('aria-label'),locale==='ar'?'\u0635\u0648\u0631\u0629 \u0661\u0664 \u0645\u0646 \u0661\u0664':'Image 14 of 14');
  assert.equal(await page.locator('.in-photo-counter').innerText(),locale==='ar'?'\u0661\u0665 / \u0661\u0665':'15 / 15');
  const active=await last.evaluate(e=>{const r=e.getBoundingClientRect(),s=e.parentElement.getBoundingClientRect();return {left:r.left,right:r.right,start:s.left,end:s.right,border:getComputedStyle(e).borderColor}});
  assert.ok(active.left>=active.start-1 && active.right<=active.end+1,'active thumbnail visible');assert.equal(active.border,'rgb(229, 184, 105)');
  await page.keyboard.press('Tab');await last.focus();const focus=await last.evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return {outline:s.outlineStyle,width:s.outlineWidth,top:r.top,bottom:r.bottom,clipTop:p.top,clipBottom:p.bottom}});
  assert.equal(focus.outline,'solid');assert.equal(focus.width,'2px');assert.ok(focus.top-4>=focus.clipTop-1 && focus.bottom+4<=focus.clipBottom+1,'focus ring clipped');
  await shot(page,`gallery-focus-${locale}-${await page.locator('html').getAttribute('data-theme')}-${width}`);
  // Exercise keyboard activation of the real video and photo buttons.
  const video=page.locator('.thumb-video-btn');await video.focus();await page.keyboard.press('Enter');await page.locator('.gallery-video-showcase-stage').waitFor({state:'visible'});await sleep(400);
  assert.equal(await page.locator('.in-photo-thumb-btn').count(),15);assert.equal(await video.getAttribute('aria-current'),'true');
  assert.equal(await page.locator('.in-photo-counter').innerText(),locale==='ar'?'\u0661 / \u0661\u0665':'1 / 15');
}
async function run() {
  let server,browser;const originalConfig=fs.readFileSync(path.resolve(__dirname,'../tsconfig.json'));
  fs.mkdirSync(SHOTS,{recursive:true});
  try {
    assert.equal(await fetch(BASE+'/ar').then(()=>true).catch(()=>false),false,'capture requires an unused owned port');
    server=spawn(process.execPath,['--require',path.resolve(__dirname,'lib/site-visual-capture-proxy.cjs'),require.resolve('next/dist/bin/next'),'start','-p',String(PORT)],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe'],env:{...process.env,SITE_VISUAL_CAPTURE_PROXY_PORT:String(PROXY_PORT)}});
    server.stdout.on('data',d=>process.stdout.write(d));server.stderr.on('data',d=>process.stderr.write(d));
    const deadline=Date.now()+60000;while(Date.now()<deadline){if(await fetch(BASE+'/ar').then(r=>r.ok).catch(()=>false))break;await sleep(500);}
    assert.ok((await fetch(BASE+'/ar')).ok,'server not ready');
    browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
    // A loopback capture has no production analytics origin. Provide a test-only collector with correct CORS.
    await page.route('https://cloudflareinsights.com/cdn-cgi/rum',route=>route.fulfill({status:204,headers:{'access-control-allow-origin':BASE,'access-control-allow-methods':'POST, GET, OPTIONS','access-control-allow-headers':route.request().headers()['access-control-request-headers']||'content-type'}}));
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    for(const width of (option('--skip-home')?[]:[1440,1280,390]))for(const t of ['light','dark']) {
      await page.setViewportSize({width,height:width===390?844:800});await fixture(null);await page.goto(BASE+'/ar',{waitUntil:'networkidle'});await theme(page,t);await page.evaluate(()=>scrollTo(0,0));await sleep(300);await navbar(page,true);
      const hero=await page.locator('.hero-title').evaluate(e=>{const a=e.querySelector('.hero-pill-line-gold .gold-text-span'),b=e.querySelector('.hero-pill-line-white .white-text-span');if(!a||!b)throw Error('missing exact hero lines');const sa=getComputedStyle(a),sb=getComputedStyle(b),card=getComputedStyle(e.closest('.hero-title-glass-card'));return {first:sa.webkitTextFillColor,second:sb.backgroundImage,clip:sb.backgroundClip,shadow:sb.textShadow,filter:sb.filter,card:card.backgroundColor,blur:card.backdropFilter}});
      assert.equal(hero.first,'rgb(255, 255, 255)');assert.equal(hero.clip,'text');assert.equal(hero.second,'linear-gradient(135deg, rgb(255, 253, 247) 0%, rgb(255, 240, 194) 22%, rgb(246, 212, 132) 55%, rgb(229, 184, 105) 85%, rgb(212, 159, 51) 100%)');assert.equal(hero.shadow,'none');assert.equal(hero.filter,'none');assert.equal(hero.card,'rgba(0, 0, 0, 0)');assert.equal(hero.blur,'none');
      await shot(page,`home-top-${t}-${width}`);await page.evaluate(()=>scrollTo(0,850));await sleep(350);await navbar(page,false);await shot(page,`home-scrolled-${t}-${width}`);
      await page.locator('.property-card').first().scrollIntoViewIfNeeded();await sleep(300);const card=await page.locator('.card-content-overlay').first().evaluate(e=>{const c=getComputedStyle(e);return {bg:c.backgroundColor,image:c.backgroundImage,blur:c.backdropFilter,title:getComputedStyle(e.querySelector('.card-title')).color,price:getComputedStyle(e.querySelector('.price-amount')).color}});
      assert.match(card.blur,/blur\(/);if(t==='light'){assert.equal(card.bg,'rgba(255, 255, 255, 0.85)');assert.equal(card.title,'rgb(15, 23, 42)');await gold(page,['.title-serif-accent','.explore-catalog-btn','.section-eyebrow-pill','.price-amount']);}else{assert.match(card.image,/rgba\(20, 25, 36, 0.38\)/);assert.equal(card.price,'rgb(229, 184, 105)');}
      await shot(page,`property-cards-${t}-${width}`);await page.locator('.bookmark-nav-btn').click();await page.locator('.saved-portfolio-backdrop').waitFor({state:'visible'});await sleep(350);
      const dim=await page.locator('.saved-portfolio-backdrop').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,blur:getComputedStyle(e).backdropFilter}));assert.equal(dim.blur,'none');assert.equal(dim.bg,t==='light'?'rgba(10, 12, 16, 0.35)':'rgba(10, 12, 16, 0.55)');await shot(page,`saved-drawer-${t}-${width}`);await overflow(page);
      console.log(`PASS home/card/drawer ${t} ${width}`);
    }
    for(const locale of (option('--locale')?[option('--locale')]:['ar','en']))for(const width of (option('--width')?[Number(option('--width'))]:[1920,1440,1280,390]))for(const t of (option('--theme')?[option('--theme')]:['light','dark'])) {
      await page.setViewportSize({width,height:width===1920?951:width===390?844:800});await fixture(null);const url=BASE+'/'+locale+'/properties/'+encodeURIComponent(SLUG);await page.goto(url,{waitUntil:'networkidle'});await theme(page,t);await page.evaluate(()=>scrollTo(0,0));await sleep(300);await navbar(page,true);
      assert.equal(await page.locator('.in-photo-thumbnails-bar').count(),0);await page.locator('.main-image-frame').scrollIntoViewIfNeeded();await shot(page,`gouna-detail-${locale}-${t}-${width}`);
      await page.locator('.property-spec-matrix-grid').scrollIntoViewIfNeeded();assert.equal(await page.locator('.spec-stat-card').count(),5);await rows(page,5);await shot(page,`gouna-specs-${locale}-${t}-${width}`);
      if(locale==='ar') {
        // Layout-only stress: clone already rendered real cards and apply production count selectors.
        for(let count=1;count<=9;count++){await page.locator('.property-spec-matrix-grid').evaluate((e,n)=>{const source=e.firstElementChild.cloneNode(true);e.replaceChildren(...Array.from({length:n},()=>source.cloneNode(true)));e.className=e.className.replace(/spec-count-\d+/,`spec-count-${n}`)},count);await rows(page,count);}
      }
      await fixture({images:14,video:true,otherSpecs:true});await page.goto(url,{waitUntil:'networkidle'});await theme(page,t);assert.equal(await page.locator('.in-photo-thumb-btn').count(),15,'capture proxy must inject actual server property data');await page.locator('.gallery-media-frame').scrollIntoViewIfNeeded();await strip(page,locale,width);await shot(page,`gallery-video-${locale}-${t}-${width}`);
      const first=page.locator('.in-photo-thumb-btn:not(.thumb-video-btn)').first();await first.focus();await page.keyboard.press('Enter');await page.locator('.main-hero-img').waitFor({state:'visible'});await sleep(500);assert.equal(await first.getAttribute('aria-current'),'true');assert.match(await page.locator('.main-hero-img').getAttribute('src'),/capture_image=0$/,'keyboard return changes production image source');await overflow(page);await shot(page,`gallery-multi-${locale}-${t}-${width}`);
      await page.locator('.property-spec-matrix-grid').scrollIntoViewIfNeeded();assert.equal(await page.locator('.spec-stat-card').count(),7);await rows(page,7);await shot(page,`alternate-specs-${locale}-${t}-${width}`);
      if(locale==='ar') {
        // Also prove the one-image+video gate through server data, not a mocked component.
        await fixture({images:1,video:true});await page.goto(url,{waitUntil:'networkidle'});assert.equal(await page.locator('.in-photo-thumb-btn').count(),2);
        await fixture(null);await page.goto(url,{waitUntil:'networkidle'});await theme(page,t);const realImage=await page.locator('.main-hero-img').evaluate(e=>e.src);
        for(const orientation of ['portrait','landscape']) {
          if(orientation==='landscape') {const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#192434"/><rect x="4" y="4" width="1192" height="792" fill="none" stroke="#E5B869" stroke-width="8"/><text x="600" y="400" text-anchor="middle" fill="white" font-size="40">Landscape fixture 1200 x 800</text></svg>';const body=await sharp(Buffer.from(svg)).png().toBuffer();await page.route(realImage,r=>r.fulfill({status:200,contentType:'image/png',body}));await page.reload({waitUntil:'networkidle'});await theme(page,t);}
          await page.locator('.gallery-fullscreen-btn').click();await page.locator('.slot-center .carousel-card-img').waitFor({state:'visible'});const g=await fullscreen(page);if(orientation==='portrait')assert.ok(g.natural[1]>g.natural[0],'real building photo is portrait');else assert.deepEqual(g.natural,[1200,800]);
          if(t==='light')await gold(page,['.lightbox-dossier-tag','.lightbox-counter-pill','.dock-estate']);
          await shot(page,`lightbox-${orientation}-${t}-${width}`);await page.keyboard.press('Escape');await page.locator('.lightbox-overlay').waitFor({state:'hidden'});if(orientation==='landscape')await page.unroute(realImage);
          console.log(`PASS real-route lightbox ${orientation} ${t} ${width} natural=${g.natural} rect=${g.rect.width.toFixed(1)}x${g.rect.height.toFixed(1)}`);
        }
      }
      console.log(`PASS detail/keyboard/video/grid ${locale} ${t} ${width}`);
    }
    const status=await fetch(CONTROL+'/status').then(r=>r.json());assert.ok(status.intercepts>0,'server fixture adapter not invoked');
    assert.deepEqual(errors,[],'console/page errors');console.log(`ALL ASSERTIONS PASSED; screenshots=${shots.length}; intercepted-read-responses=${status.intercepts}; console-errors=0; overflow=0`);
    console.log('SHOTS '+JSON.stringify(shots));
  } finally {
    if(browser)await browser.close();
    if(server){try{if(process.platform==='win32')execFileSync('taskkill',['/pid',String(server.pid),'/T','/F'],{stdio:'ignore'});else server.kill('SIGTERM');}catch(e){if(server.exitCode===null)throw e;}}
    fs.writeFileSync(path.resolve(__dirname,'../tsconfig.json'),originalConfig);
  }
}
run().catch(e=>{console.error(e);process.exitCode=1});
