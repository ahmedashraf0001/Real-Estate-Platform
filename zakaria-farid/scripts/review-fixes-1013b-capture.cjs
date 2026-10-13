// Temporary fixture route renders production components. No database traffic.
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const shots = path.resolve(process.argv[process.argv.indexOf('--shots') + 1]);
const port = 51238, base = `http://localhost:${port}`;
const routeDir = path.resolve('src/app/[locale]/review-fixes-1013b.capture');
const preload = path.join(os.tmpdir(), `review-fixes-${process.pid}.cjs`);
const originals = ['tsconfig.json', 'next-env.d.ts'].map(file => [file, fs.readFileSync(file)]);
assert.ok(!fs.existsSync(routeDir));
fs.mkdirSync(routeDir); fs.mkdirSync(shots, { recursive: true });
fs.writeFileSync(preload, `const original=globalThis.fetch;globalThis.fetch=(input,init)=>{const url=String(input?.url||input);if(url.includes('.supabase.co')){if(!['GET','HEAD'].includes((init?.method||input?.method||'GET').toUpperCase()))throw Error('No writes');return Promise.resolve(new Response('[]',{headers:{'content-type':'application/json'}}));}return original(input,init);};`);
const env = { ...process.env, NEXT_DIST_DIR: '.next/review-fixes-1013b', NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require "${preload.replaceAll('\\', '/')}"` };
fs.writeFileSync(path.join(routeDir,'page.tsx'), `
'use client';
import React from 'react';
import {useParams} from 'next/navigation';
import {PropertyDetailView} from '@/components/property/PropertyDetailView';
import {HomeView} from '@/components/home/HomeView';
import {buildZoneInstances} from '@/lib/layering/instances';
const zones=buildZoneInstances('building','semi_finished',3,{totalFloors:2,unitsPerFloor:2});
const decorate=(list:any[])=>list.forEach(z=>{if(z.zone_template_id==='apt.kitchen'){z.images=['/images/hero-light.jpg','/images/about-interior.png','/images/about-hero.png'];z.videos=[{id:'fixture-tour',url:'https://youtu.be/dQw4w9WgXcQ',title_en:'Kitchen overview video with a long title',title_ar:'فيديو تعريفي للمطبخ مع عنوان طويل',thumbnail:'/images/hero-light.jpg'},{id:'fixture-native',url:'/images/can_you_make_a_video_for_the_t.mp4',title_en:'Native tour',title_ar:'جولة'}];}if(z.children)decorate(z.children);});decorate(zones);
const property:any={id:'capture-only',slug:'capture-only',title_ar:'عقار اختبار العرض',title_en:'Display test property',location:'Test location',type:'building',listing_status:'available',completion_status:'ready',price_egp:1000000,area_sqm:100,bedrooms:3,bathrooms:2,description_ar:'اختبار',description_en:'Test',spec_layers:zones,building_units:[],property_images:[{url:'/images/hero-light.jpg',sort_order:0}],property_amenities:[]};
export default function Page(){const locale=String(useParams().locale);return <><HomeView properties={[]} locale={locale}/><PropertyDetailView property={property} locale={locale}/></>;}
`, 'utf8');
(async()=>{
let server,browser,output='',count=0;
const before=process.argv.includes('--before');
try{
 await new Promise((resolve,reject)=>{const net=require('node:net').createServer();net.once('error',reject);net.listen(port,()=>net.close(resolve));});
 const build=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{env,windowsHide:true,encoding:'utf8',timeout:170000,maxBuffer:8*1024*1024});console.log(build.stdout);console.error(build.stderr);assert.equal(build.status,0,'production build');
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port)],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});for(const s of [server.stdout,server.stderr])s.on('data',c=>output+=c);
 for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error(output);try{if((await fetch(base+'/en/review-fixes-1013b.capture',{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}if(i===59)throw Error(output);await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({reducedMotion:'no-preference'});
 await context.route('**/*',route=>{const req=route.request(),url=req.url();if(url.includes('.supabase.co')||url.startsWith(base+'/api/'))return route.fulfill({json:[]});if(url.includes('youtube-nocookie.com'))return route.fulfill({body:'<!doctype html><title>Intercepted embed</title><body style="background:#111;color:white">YouTube embed intercepted</body>',contentType:'text/html'});if(url.startsWith('https://static.cloudflareinsights.com/'))return route.fulfill({body:'',contentType:'application/javascript'});if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();return route.continue();});
 let captureLocale='en';
 const page=await context.newPage(),errors=[];const cdp=await context.newCDPSession(page);page.on('pageerror',e=>errors.push(e.stack||e.message));
 const shot=async name=>{await page.evaluate(()=>document.fonts.ready);if(await page.locator('.lightbox-overlay').count())await page.waitForFunction(()=>{const overlay=document.querySelector('.lightbox-overlay'),card=overlay.querySelector('.slot-center'),ambient=overlay.querySelectorAll('.lightbox-ambient-fade-slot');if(!card||ambient.length!==1)return false;const transform=getComputedStyle(card).transform,matrix=new DOMMatrixReadOnly(transform==='none'?undefined:transform);return Number(getComputedStyle(overlay).opacity)===1&&Number(getComputedStyle(ambient[0]).opacity)===1&&Math.abs(matrix.m41)<.1&&Math.abs(matrix.a-1)<.001;});await page.screenshot({path:path.join(shots,name+(captureLocale==='ar'?'-ar':'')+'.png')});count++;};
 for(const locale of (before?['en']:['en','ar']))for(const theme of ['light','dark'])for(const width of [1440,1280,390]){
 captureLocale=locale;
 await page.setViewportSize({width,height:width===390?844:1000});await context.addCookies([{name:'zf_theme',value:theme,url:base}]);
 await page.goto(base+'/'+locale+'/review-fixes-1013b.capture',{waitUntil:'networkidle',timeout:30000});await page.evaluate(t=>{localStorage.setItem('zf_theme',t);document.documentElement.dataset.theme=t;},theme);
 if(theme==='light'&&width===1440){await shot('hero-light-1440-'+(before?'before':'after'));
 if(!before){
 const texts=await page.locator('.nav-glass-capsule .nav-link.active, .nav-glass-capsule .brand-sub-text, .nav-glass-capsule .lang-btn').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {text:e.textContent,color:getComputedStyle(e).color,x:Math.round(b.x+b.width/2),y:Math.round(b.y-3)};}));
 const {data,info}=await require('sharp')(await page.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const luminance=rgb=>rgb.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
 for(const t of texts){const offset=(t.y*info.width+t.x)*info.channels;const bg=[...data.subarray(offset,offset+3)],fg=t.color.match(/[\d.]+/g).slice(0,3).map(Number);const ratio=(luminance(bg)+.05)/(luminance(fg)+.05);console.log('HEADER CONTRAST',locale,JSON.stringify({...t,bg,ratio}));assert.ok(ratio>=4.5,'header gold on rendered background: '+ratio);}
 const search=page.locator('.quick-search-bar');assert.equal(await search.count(),1);const glass=await search.evaluate(e=>{const c=getComputedStyle(e);return {blur:c.backdropFilter,border:c.borderTopColor,shadow:c.boxShadow};});assert.match(glass.blur,/blur/);assert.notEqual(glass.shadow,'none');
 }
 }
 const preview=page.locator('.blueprint-studio-root [data-blueprint-drawing]').locator('..').locator('..');
 await preview.locator('[data-floor-rail]').getByRole('button').filter({hasText:locale==='en'?/^Floor 1\b/:/^\u0627\u0644\u062f\u0648\u0631 1\b/}).first().click();
 await preview.locator('button[class*="__unit "]').first().click();const tile=preview.locator('[data-zone-template="apt.kitchen"]');await tile.click();
 const panel=preview.locator('[data-blueprint-detail]');await panel.waitFor();await panel.evaluate(e=>{const y=scrollY+e.getBoundingClientRect().top-130;if(window.__masrLenis)window.__masrLenis.scrollTo(y,{immediate:true});else window.scrollTo({top:y,behavior:'instant'});});await shot(`panel-${theme}-${width}${before?'-before':''}`);
 if(before)continue;
 assert.equal(await tile.locator('svg').count(),1,'photo tile retains type icon');assert.equal(await panel.locator('[data-zone-media] img').count(),4,'poster and three photos');assert.equal(await panel.locator('[data-zone-media] img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)),true,'all media images loaded');
 if(width===390){await panel.locator('[data-zone-media]').scrollIntoViewIfNeeded();await shot(`panel-media-${theme}-${width}`);await panel.locator('[data-zone-photo]').last().scrollIntoViewIfNeeded();await shot(`panel-photos-${theme}-${width}`);}
 const compact=panel.locator('[data-compact-video]');assert.equal(await compact.locator('button').count(),1);assert.equal(await compact.locator('input').count(),0);
 const rects=await compact.evaluate(e=>{const f=e.querySelector('button').getBoundingClientRect(),t=e.querySelector('[data-compact-title]').getBoundingClientRect();return {frameBottom:f.bottom,titleTop:t.top,width:f.width,height:f.height};});assert.ok(rects.titleTop>=rects.frameBottom,'title below poster');assert.ok(Math.abs(rects.width/rects.height-16/9)<.03);
 for(const width of [280,320,420]){const result=await compact.evaluate((e,width)=>{const previous=e.style.width;e.style.width=width+'px';const b=e.querySelector('button').getBoundingClientRect(),p=e.querySelector('[data-compact-title]').getBoundingClientRect();e.style.width=previous;return {bottom:b.bottom,top:p.top,width:b.width,height:b.height};},width);assert.ok(result.top>=result.bottom,'compact title below controls at '+width);assert.ok(Math.abs(result.width/result.height-16/9)<.03);}

 const photo=panel.locator('[data-zone-media] button[data-zone-photo]').first();await photo.click();const lightbox=page.locator('.lightbox-overlay[role=dialog]');await lightbox.waitFor();assert.equal(await lightbox.locator('[data-media-counter]').innerText(),'1 / 5');await shot(`lightbox-photo-${theme}-${width}`);
 await page.keyboard.press('Shift+Tab');assert.equal(await lightbox.locator('.dock-thumb-btn').last().evaluate(e=>e===document.activeElement),true,'backward Tab wraps');await page.keyboard.press('Tab');assert.equal(await lightbox.locator('.lightbox-close-btn').evaluate(e=>e===document.activeElement),true,'forward Tab wraps');
 const swipeBox=await lightbox.locator('.lightbox-deck-container').boundingBox();const startX=swipeBox.x+swipeBox.width*.6,swipeY=swipeBox.y+swipeBox.height*.35;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:startX,y:swipeY}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:startX-100,y:swipeY}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>document.querySelector('[data-media-counter]').textContent==='2 / 5');assert.equal(await lightbox.locator('[data-media-counter]').innerText(),'2 / 5','left swipe advances');await page.keyboard.press('ArrowLeft');assert.equal(await lightbox.locator('[data-media-counter]').innerText(),'1 / 5');
 await lightbox.getByRole('button',{name:'Next Plate (Right Arrow)'}).click();assert.equal(await lightbox.locator('[data-media-counter]').innerText(),'2 / 5');await page.keyboard.press('Escape');await lightbox.waitFor({state:'detached'});assert.equal(await photo.evaluate(e=>e===document.activeElement),true,'focus returns to photo');
 await compact.locator('button').click();await lightbox.waitFor();assert.equal(await lightbox.locator('[data-media-counter]').innerText(),'4 / 5');assert.match(await lightbox.locator('iframe').getAttribute('src'),/^https:\/\/www.youtube-nocookie.com\/embed\//);await shot(`lightbox-video-${theme}-${width}`);
 await lightbox.getByRole('button',{name:'Next Plate (Right Arrow)'}).click();assert.equal(await lightbox.locator('[data-media-counter]').innerText(),'5 / 5');assert.equal(await lightbox.locator('video[controls]').count(),1,'native controls for uploaded video');await page.waitForFunction(()=>{const v=document.querySelector('.lightbox-overlay video');return v&&v.readyState>=2&&!v.paused;});await shot(`lightbox-native-${theme}-${width}`);await lightbox.getByRole('button',{name:'Next Plate (Right Arrow)'}).click();assert.equal(await lightbox.locator('[data-media-counter]').innerText(),'1 / 5','sequence wraps');
 await page.keyboard.press('Tab');assert.equal(await lightbox.evaluate(e=>e.contains(document.activeElement)),true);await page.keyboard.press('Escape');await lightbox.waitFor({state:'detached'});
 await panel.locator('[data-detail-close]').click();await tile.evaluate(e=>{const y=scrollY+e.getBoundingClientRect().top-130;if(window.__masrLenis)window.__masrLenis.scrollTo(y,{immediate:true});else window.scrollTo({top:y,behavior:'instant'});});await shot(`tile-${theme}-${width}`);await tile.evaluate(e=>e.focus({preventScroll:true}));await page.keyboard.press('Enter');
 await preview.locator('.cad-fullscreen-toggle-btn').evaluate(e=>e.focus({preventScroll:true}));await page.keyboard.press('Enter');const overlay=page.locator('.cad-building-fullscreen');await overlay.waitFor();if(await overlay.locator('[data-zone-template="apt.kitchen"]').getAttribute('aria-pressed')!=='true')await overlay.locator('[data-zone-template="apt.kitchen"]').click();await overlay.locator('[data-zone-photo]').first().click();await lightbox.waitFor();assert.equal(await page.evaluate(()=>window.__masrLenis?.isStopped),width>=1024?true:undefined,'Lenis paused in fullscreen lightbox');await shot(`fullscreen-lightbox-${theme}-${width}`);await page.keyboard.press('Escape');await lightbox.waitFor({state:'detached'});assert.equal(await overlay.count(),1,'Esc only closes lightbox');assert.equal(await page.evaluate(()=>window.__masrLenis?.isStopped),width>=1024?true:undefined,'Lenis remains paused');await overlay.locator('.cad-fullscreen-close-btn').click();
 await page.locator('.bookmark-nav-btn').click();const drawer=page.locator('.saved-portfolio-drawer');await drawer.waitFor();await page.waitForFunction(()=>{const e=document.querySelector('.saved-portfolio-drawer');if(!e)return false;const r=e.getBoundingClientRect();return Number(getComputedStyle(e).opacity)===1&&r.left>=0&&r.right<=innerWidth;});const fill=await drawer.evaluate(e=>getComputedStyle(e).backgroundColor);assert.ok(!fill.startsWith('rgba')&&fill!=='transparent',fill);await shot(`saved-drawer-${theme}-${width}`);await drawer.locator('.drawer-close-btn').click();
 }
 if(before){assert.equal(await page.locator('[data-zone-photo]').count(),3,'RED zone photos must be lightbox triggers');}
 assert.deepEqual(errors,[]);console.log(`${count} screenshots; runtime errors 0`);
}finally{
await browser?.close();if(server&&server.exitCode===null)spawnSync('taskkill',['/pid',String(server.pid),'/T','/F'],{windowsHide:true});for(const [file,bytes]of originals)fs.writeFileSync(file,bytes);assert.equal(routeDir,path.resolve('src/app/[locale]/review-fixes-1013b.capture'));fs.rmSync(routeDir,{recursive:true,force:true});fs.rmSync(preload,{force:true});
}
})().catch(e=>{console.error(e);process.exitCode=1;});
