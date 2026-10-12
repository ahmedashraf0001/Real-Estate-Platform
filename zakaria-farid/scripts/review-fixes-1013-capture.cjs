// Temporary fixture route renders production components. No database traffic.
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const shots = path.resolve(process.argv[process.argv.indexOf('--shots') + 1]);
const port = 51237, base = `http://localhost:${port}`;
const routeDir = path.resolve('src/app/[locale]/review-fixes-1013.capture');
const preload = path.join(os.tmpdir(), `review-fixes-${process.pid}.cjs`);
const originals = ['tsconfig.json', 'next-env.d.ts'].map(file => [file, fs.readFileSync(file)]);
assert.ok(!fs.existsSync(routeDir));
fs.mkdirSync(routeDir); fs.mkdirSync(shots, { recursive: true });
fs.writeFileSync(preload, `const original=globalThis.fetch;globalThis.fetch=(input,init)=>{const url=String(input?.url||input);if(url.includes('.supabase.co')){if(!['GET','HEAD'].includes((init?.method||input?.method||'GET').toUpperCase()))throw Error('No writes');return Promise.resolve(new Response('[]',{headers:{'content-type':'application/json'}}));}return original(input,init);};`);
const env = { ...process.env, NEXT_DIST_DIR: '.next/review-fixes-1013', NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require "${preload.replaceAll('\\', '/')}"` };
fs.writeFileSync(path.join(routeDir, 'page.tsx'), `
'use client';
import React, {useState} from 'react';
import {useParams} from 'next/navigation';
import {PropertyDetailView} from '@/components/property/PropertyDetailView';
import Editor from '@/components/admin/MarkdownDescriptionEditor';
import adminStyles from '@/app/admin/admin.module.css';
import {buildZoneInstances} from '@/lib/layering/instances';
const sample='Price | Beds\\n\\n# Property description\\n## Overview\\nA calm English paragraph.\\n\\n---\\n- **Beds:** three\\n- **View:** open\\n\\n## نظرة عامة\\nوصف عربي واضح.\\n\\n---\\n- **الغرف:** ثلاثة\\n- **الإطلالة:** مفتوحة';
const zones=buildZoneInstances('building','semi_finished',3,{totalFloors:12,unitsPerFloor:2});
const property:any={id:'capture-only',slug:'capture-only',title_ar:'عقار اختبار العرض',title_en:'Display test property',location:'Test location',type:'building',listing_status:'available',completion_status:'ready',price_egp:1000000,area_sqm:100,bedrooms:3,bathrooms:2,description_ar:sample,description_en:sample,spec_layers:zones,building_units:[],property_images:[{url:'/images/hero-light.jpg',sort_order:0}],property_amenities:[]};
export default function Page(){const locale=String(useParams().locale);const [value,setValue]=useState(sample);return <><PropertyDetailView property={property} locale={locale}/><div data-capture-editor className={adminStyles.adminWrapper} style={{padding:24,height:'auto',overflow:'visible'}}><Editor value={value} onChange={setValue} language={locale==='ar'?'ar':'en'} isAr={locale==='ar'}/></div></>;}
`, 'utf8');
(async () => {
 let server, browser, output = '', count = 0;
 const errors = [], consoles = [];
 try {
  await new Promise((resolve, reject) => { const net = require('node:net').createServer(); net.once('error', reject); net.listen(port, () => net.close(resolve)); });
  const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {env, windowsHide:true, encoding:'utf8',timeout:170000,maxBuffer:8*1024*1024});
  console.log(build.stdout);console.error(build.stderr);assert.equal(build.status,0,'production build');
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port)],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  for(const stream of [server.stdout,server.stderr])stream.on('data',chunk=>output+=chunk);
  for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error(output);try{if((await fetch(base+'/en/review-fixes-1013.capture',{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}if(i===59)throw Error(output);await new Promise(r=>setTimeout(r,250));}
  for(const query of ['مستشفى العاصمة منيا القمح','شارع مستشفى العاصمة, منيا القمح']){
   const res=await fetch(base+'/api/admin/geocode',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query}),signal:AbortSignal.timeout(25000)});
   const data=await res.json();console.log('LIVE',JSON.stringify({query,status:res.status,provider:data.provider,total:data.total,results:data.results?.slice(0,3)},null,2));
  }
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route('**/*',route=>{
   const req=route.request();
   if(req.url().startsWith('https://static.cloudflareinsights.com/'))return route.fulfill({body:'',contentType:'application/javascript'});
   if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
   if(req.url().includes('.supabase.co')||req.url().startsWith(base+'/api/'))return route.fulfill({json:[]});
   return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoles.push(m.text());});
  const scrollTo=async y=>page.evaluate(y=>{if(window.__masrLenis)window.__masrLenis.scrollTo(y,{immediate:true});else window.scrollTo({top:y,behavior:'instant'});},y);
  const capture=async (name,target=page)=>{await target.screenshot({path:path.join(shots,name+'.png')});count++;};
  const geometry=async scope=>{
   const result=await scope.evaluate(e=>{
    const panel=e.querySelector('[data-blueprint-detail]').getBoundingClientRect(), plan=e.querySelector('[data-blueprint-drawing]').getBoundingClientRect();
    const tiles=[...e.querySelectorAll('[data-blueprint-drawing] [data-zone-id]')];
    return {count:tiles.length,intersect:tiles.filter(t=>{const r=t.getBoundingClientRect();return Math.min(r.right,panel.right)>Math.max(r.left,panel.left)+1&&Math.min(r.bottom,panel.bottom)>Math.max(r.top,panel.top)+1;}).map(t=>t.dataset.zoneId),clipped:tiles.filter(t=>{const r=t.getBoundingClientRect();return r.left<plan.left-1||r.right>plan.right+1||r.top<plan.top-1||r.bottom>plan.bottom+1;}).map(t=>t.dataset.zoneId),sticky:getComputedStyle(e.querySelector('[data-blueprint-detail]')).position};
   });
   assert.ok(result.count>0);assert.deepEqual(result.intersect,[],'tiles never intersect panel');assert.deepEqual(result.clipped,[],'all tiles fit plan');assert.equal(result.sticky,'sticky');
  };
  const markdown=async scope=>{
   assert.equal(await scope.locator('h2').count(),1);assert.equal(await scope.locator('h3').count(),2);assert.equal(await scope.locator('hr').count(),2);
   assert.doesNotMatch(await scope.innerText(),/##|---/);assert.match(await scope.innerText(),/Price \| Beds/);
   const styles=await scope.locator('p,h2,h3,li,ul').evaluateAll(es=>es.map(e=>({tag:e.tagName,dir:e.getAttribute('dir'),align:getComputedStyle(e).textAlign,direction:getComputedStyle(e).direction,text:e.textContent})));
   for(const s of styles){assert.equal(s.dir,'auto');assert.equal(s.align,'start');if(/^(?:Beds|View|A calm|Property description|Overview|Price)/.test(s.text))assert.equal(s.direction,'ltr');if(/^(?:الغرف|الإطلالة|وصف|نظرة)/.test(s.text))assert.equal(s.direction,'rtl');}
  };
  for(const locale of ['ar','en'])for(const theme of ['dark','light'])for(const width of [1440,1280,1024,390]){
   await page.setViewportSize({width,height:width===390?844:1000});
   await context.addCookies([{name:'zf_theme',value:theme,url:base}]);
   await page.goto(base+'/'+locale+'/review-fixes-1013.capture',{waitUntil:'networkidle',timeout:30000});
   await page.evaluate(t=>{localStorage.setItem('zf_theme',t);document.documentElement.setAttribute('data-theme',t);},theme);
   const narrative=page.locator('.narrative-text');await narrative.scrollIntoViewIfNeeded();await markdown(narrative);await capture(`description-${locale}-${theme}-${width}`);
   const preview=page.locator('.blueprint-studio-root [data-blueprint-drawing]').locator('..').locator('..');
   const floors=preview.locator('[data-floor-rail]');
   await floors.getByRole('button').filter({hasText:locale==='ar'?/^الدور 1\b/:/^Floor 1\b/}).first().click();
   await preview.locator('button[class*="__unit "]').first().click();
   const drawing=preview.locator('[data-blueprint-drawing]');
   const tile=drawing.locator('[data-zone-id]').last();
   await tile.click();
   const panel=preview.locator('[data-blueprint-detail]');await panel.waitFor();
   assert.equal(await panel.evaluate(e=>e.contains(document.activeElement)),true,'focus enters detail');
   if(width>=900){
    await scrollTo(await preview.evaluate(e=>scrollY+e.getBoundingClientRect().top-130));await geometry(preview);
    await capture(`blueprint-${locale}-${theme}-${width}`);
    await scrollTo(await page.evaluate(()=>scrollY+400));await geometry(preview);
    assert.ok(await panel.evaluate(e=>e.getBoundingClientRect().top>=0),'sticky panel remains visible after 400px');await capture(`sticky-${locale}-${theme}-${width}`);
   }else{
    const t=await tile.boundingBox(),p=await panel.boundingBox();assert.ok(t.y+t.height<=p.y+1,'selected tile above bottom sheet');await capture(`blueprint-${locale}-${theme}-${width}`);
   }
   await page.keyboard.press('Escape');assert.equal(await panel.count(),0);assert.equal(await tile.evaluate(e=>e===document.activeElement),true,'focus restored');
   await preview.locator('.cad-fullscreen-toggle-btn').click();
   const overlay=page.locator('.cad-building-fullscreen');await overlay.waitFor();
   const fullscreenTile=overlay.locator('[data-blueprint-drawing] [data-zone-id]').first();
   await fullscreenTile.click();
   if(width>=900)await geometry(overlay);
   else {
    const t=await fullscreenTile.boundingBox(),p=await overlay.locator('[data-blueprint-detail]').boundingBox();
    const d=await overlay.locator('[data-blueprint-drawing]').boundingBox();
    assert.ok(t.y>=d.y-1&&t.y+t.height<=p.y+1,'fullscreen selected tile fully visible above bottom sheet');
    const pairs=await overlay.locator('[data-blueprint-drawing] [data-zone-id]').evaluateAll(es=>{
     const pairs=[];for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++){const a=es[i].getBoundingClientRect(),b=es[j].getBoundingClientRect();if(Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1)pairs.push([es[i].dataset.zoneId,es[j].dataset.zoneId]);}return pairs;
    });assert.deepEqual(pairs,[],'phone fullscreen tiles retain separate rows');
   }
   await capture(`fullscreen-${locale}-${theme}-${width}`);
   await overlay.locator('[data-detail-close]').click();await overlay.locator('.cad-fullscreen-close-btn').click();
   const editor=page.locator('[data-capture-editor]');await editor.scrollIntoViewIfNeeded();
   await editor.getByRole('button',{name:locale==='ar'?'معاينة':'Preview',exact:true}).click();await markdown(editor.locator('.mini-markdown'));await capture(`editor-${locale}-${theme}-${width}`,editor);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no page overflow');
   console.log(`${locale} ${theme} ${width}: geometry, sticky/sheet, fullscreen, direction, preview, focus PASS`);
  }
  assert.deepEqual(errors,[],'runtime errors');assert.deepEqual(consoles,[],'console errors');console.log(`${count} fresh screenshots; runtime/console errors 0`);
 }finally{
  await browser?.close();
  if(server&&server.exitCode===null)spawnSync('taskkill',['/pid',String(server.pid),'/T','/F'],{windowsHide:true});
  for(const [file,bytes]of originals)fs.writeFileSync(file,bytes);
  const expected=path.resolve('src/app/[locale]/review-fixes-1013.capture');assert.equal(routeDir,expected);fs.rmSync(routeDir,{recursive:true,force:true});fs.rmSync(preload,{force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
