// Capture-only route imports real components. No production records, writes, or fixture switches.
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const option = name => process.argv[process.argv.indexOf(name) + 1];
const shots = path.resolve(option('--shots'));
const port = 51229, base = `http://localhost:${port}`;
const routeDir = path.resolve('src/app/[locale]/site-sold-markdown.capture');
const preload = path.join(os.tmpdir(), `site-sold-markdown-${process.pid}.cjs`);
const generated = ['tsconfig.json', 'next-env.d.ts'].map(file => [file, fs.readFileSync(file)]);
assert.ok(!fs.existsSync(routeDir));
fs.mkdirSync(routeDir); fs.mkdirSync(shots, { recursive: true });
fs.writeFileSync(preload, `const original=globalThis.fetch; globalThis.fetch=(input,init)=>{ const url=String(input?.url||input); if(url.includes('.supabase.co')) { if(!['GET','HEAD'].includes((init?.method||input?.method||'GET').toUpperCase())) throw Error('Capture forbids writes'); return Promise.resolve(new Response('[]',{headers:{'content-type':'application/json'}})); } return original(input,init); };`);
const env = { ...process.env, NEXT_DIST_DIR: '.next/site-sold-markdown-capture', NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require "${preload.replaceAll(String.fromCharCode(92), "/")}"` };
fs.writeFileSync(path.join(routeDir, 'page.tsx'), `
'use client';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { PropertyDetailView } from '@/components/property/PropertyDetailView';
import { PropertyCard } from '@/components/property/PropertyCard';
import Blueprint from '@/components/blueprint/BuildingBlueprintPreview';
import Editor from '@/components/admin/MarkdownDescriptionEditor';
import adminStyles from '@/app/admin/admin.module.css';
import { adaptProperty } from '@/lib/utils/propertyAdapter';
import { legacyHtmlToMarkdown } from '@/lib/markdown/legacyHtmlToMarkdown';
const ar = '<h2>تفاصيل العقار</h2><p>وصف <strong>عريض</strong> مع <em>مائل</em> و English<br>سطر ثان</p><ul><li><p>إطلالة مفتوحة</p></li><li><p>تصميم عملي</p></li></ul><h5>المرافق</h5><ol><li><p>مصعد</p></li><li><p>مدخل خاص</p></li></ol>';
const en = '<h1>Property details</h1><p>A <strong>bold</strong> description with <em>italic</em> and العربية<br>Second line</p><ul><li><p>Open view</p></li><li><p>Practical layout</p></li></ul><h5>Amenities</h5><ol><li><p>Lift</p></li><li><p>Private entrance</p></li></ol>';
const record: any = { id:'capture-only', slug:'capture-only', title_ar:'عقار اختبار العرض', title_en:'Display test property', location:'Test location', type:'apartment', listing_status:'sold', completion_status:'ready', price_egp:1000000, area_sqm:100, bedrooms:2, bathrooms:1, description_ar:ar, description_en:en, property_images:[{url:'/images/hero-light.jpg',sort_order:0}], property_amenities:[] };
const zones = ['sold','reserved','available'].map((id,i)=>({id,zone_template_id:'bld.unit',sort_order:i,trades:[],floor_number:1,level_label:'Floor 1',unit:{unit_code:id},images:['/images/hero-light.jpg']}));
const inventory: any = zones.map(z=>({unit_id:z.id,unit_number:z.id,floor:1,status:z.id==='sold'?'contracted':z.id,area_sqm:100,bedrooms:2,bathrooms:1,price_egp:1000000}));
export default function Page() {
 const locale = useParams().locale as 'ar'|'en'; const isAr=locale==='ar';
 const [mode,setMode]=useState('detail'); const [view,setView]=useState<any>({mode:'floor',floorKey:'Floor 1'}); const [selected,setSelected]=useState<string|null>(null);
 const [language,setLanguage]=useState<'ar'|'en'>(locale); const [values,setValues]=useState(()=>({ar:legacyHtmlToMarkdown(ar),en:legacyHtmlToMarkdown(en)}));
 const p=adaptProperty(record,locale);
 return <><div data-capture-controls style={{display:'flex',gap:8,flexWrap:'wrap',padding:16,marginTop:100}}>{['detail','cards','blueprint','editor'].map(m=><button type="button" key={m} onClick={()=>setMode(m)}>{m}</button>)}</div>
 {mode==='detail' && <PropertyDetailView property={p} locale={locale} />}
 {mode==='cards' && <div data-capture-cards style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,320px),1fr))',gap:16,padding:16}}>{['sold','under_offer'].map(status=><PropertyCard key={status} property={{...p,listing_status:status}} locale={locale} onSelect={()=>setMode('detail')} />)}</div>}
 {mode==='blueprint' && <div data-capture-blueprint style={{padding:16}}><Blueprint zones={zones} inventory={inventory} view={view} onViewChange={setView} selectedId={selected} onSelect={setSelected} isAr={isAr}/></div>}
 {mode==='editor' && <div data-capture-editor className={adminStyles.adminWrapper} style={{display:'block',height:'auto',minHeight:400,padding:16}}><button type="button" data-language onClick={()=>setLanguage(language==='ar'?'en':'ar')}>AR / EN</button><Editor key={language} value={values[language]} onChange={value=>setValues({...values,[language]:value})} language={language} isAr={isAr}/></div>}
 </>;
}
`, 'utf8');

(async () => {
 let server, browser, output = '', captures = 0;
 const errors = [], consoleErrors = [];
 try {
  await new Promise((resolve,reject)=>{const net=require('node:net').createServer();net.once('error',reject);net.listen(port,()=>net.close(resolve));});
  const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next','build'], { env, windowsHide:true, encoding:'utf8', timeout:150000 });
  console.log(build.stdout); console.error(build.stderr); assert.equal(build.status,0,'production build');
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port)],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  for(const stream of [server.stdout,server.stderr])stream.on('data',chunk=>{output+=chunk;});
  for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error(output);try{if((await fetch(base+'/en/site-sold-markdown.capture',{signal:AbortSignal.timeout(1500)})).ok)break;}catch{}if(i===59)throw Error(output);await new Promise(r=>setTimeout(r,500));}
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext();
  await context.route('**/*',route=>{
   const req=route.request();
   if(req.url().startsWith('https://static.cloudflareinsights.com/'))return route.fulfill({body:'',contentType:'application/javascript'});
   if(!['GET','HEAD','OPTIONS'].includes(req.method()))return route.abort();
   if(req.url().includes('.supabase.co')||req.url().startsWith(base+'/api/'))return route.fulfill({json:[]});
   return route.continue();
  });
  const page=await context.newPage();
  page.on('requestfailed',r=>console.error('Request failed:',r.method(),r.url(),r.failure()?.errorText));
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  const capture=async name=>{await page.screenshot({path:path.join(shots,name+'.png')});captures++;};
  const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  const badges=async theme=>{
   const results=await page.locator('[data-public-status]').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);const nums=c=>c.match(/[\d.]+/g).map(Number).slice(0,3);const lum=c=>nums(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);const a=lum(s.color),b=lum(s.backgroundColor);return{status:e.dataset.publicStatus,color:s.color,bg:s.backgroundColor,border:s.borderColor,radius:s.borderRadius,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};}));
   assert.ok(results.length>0,'visible badges required');
   for(const r of results){assert.ok(r.ratio>=4.5,JSON.stringify(r));assert.equal(r.radius,'999px');if(r.status==='sold'){assert.equal(r.color,theme==='dark'?'rgb(229, 184, 105)':'rgb(138, 91, 10)');assert.equal(r.bg,theme==='dark'?'rgb(26, 29, 36)':'rgb(255, 255, 255)');assert.equal(r.border,theme==='dark'?'rgba(229, 184, 105, 0.55)':'rgba(138, 91, 10, 0.5)');}}
   return results;
  };
  for(const locale of ['ar','en'])for(const theme of ['light','dark'])for(const width of [1440,1280,390]){
   await page.setViewportSize({width,height:width===390?844:900});
   await context.addCookies([{name:'zf_theme',value:theme,url:base}]);
   await page.goto(base+'/'+locale+'/site-sold-markdown.capture',{waitUntil:'networkidle',timeout:30000});
   await page.evaluate(t=>{localStorage.setItem('zf_theme',t);document.documentElement.setAttribute('data-theme',t);},theme);
   await page.locator('.top-action-group [data-public-status="sold"]:visible').first().waitFor();
   await badges(theme);await overflow();await capture(`detail-${locale}-${theme}-${width}`);
   const narrative=page.locator('.narrative-text');await narrative.scrollIntoViewIfNeeded();
   assert.equal(await narrative.locator('h3').count(),1);assert.equal(await narrative.locator('h4').count(),1);assert.equal(await narrative.locator('strong').count(),1);assert.equal(await narrative.locator('em').count(),1);assert.equal(await narrative.locator('ul li').count(),2);assert.equal(await narrative.locator('ol li').count(),2);
   await capture(`markdown-${locale}-${theme}-${width}`);
   await page.locator('[data-capture-controls]').getByText('cards',{exact:true}).click();
   await page.locator('.public-sold-media img').waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('[data-capture-cards] img')].every(i=>i.complete&&i.naturalWidth>0));
   assert.equal(await page.locator('.public-sold-media img').evaluate(e=>getComputedStyle(e).filter),'saturate(0.6) brightness(0.92)');
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-capture-cards] > div')].every(e=>Number(getComputedStyle(e).opacity)>=.99));
   await badges(theme);await overflow();await page.locator('[data-capture-cards]').scrollIntoViewIfNeeded();await capture(`cards-${locale}-${theme}-${width}`);
   await page.locator('[data-capture-controls]').getByText('blueprint',{exact:true}).click();
   await page.locator('[data-capture-blueprint]').scrollIntoViewIfNeeded();await badges(theme);await overflow();
   assert.equal(await page.locator('.public-sold-media img').evaluate(e=>getComputedStyle(e).filter),'saturate(0.6) brightness(0.92)');
   await capture(`blueprint-${locale}-${theme}-${width}`);
   await page.locator('[data-capture-controls]').getByText('editor',{exact:true}).click();
   const editor=page.locator('[data-capture-editor]');await editor.scrollIntoViewIfNeeded();
   const textarea=editor.locator('textarea');const original=await textarea.inputValue();assert.doesNotMatch(original,/<\/?(?:p|h[1-6]|ul|ol|li|strong|em|br)\b/i,'admin initial value normalized from Tiptap');
   await textarea.focus();await textarea.evaluate(e=>e.setSelectionRange(0,3));
   await editor.getByRole('button',{name:locale==='ar'?'عريض':'Bold',exact:true}).click();
   assert.equal(await textarea.inputValue(),'**'+original.slice(0,3)+'**'+original.slice(3));assert.equal(await textarea.evaluate(e=>e===document.activeElement),true,'focus restored');
   await textarea.fill(locale==='ar'?'### عنوان\n\n**وصف** *مائل*':'### Title\n\n**Description** *italic*');
   await editor.getByRole('button',{name:locale==='ar'?'معاينة':'Preview',exact:true}).click();
   assert.equal(await editor.locator('.mini-markdown strong').count(),1);assert.equal(await editor.locator('textarea').count(),0);
   await overflow();await capture(`editor-preview-${locale}-${theme}-${width}`);
   await editor.locator('[data-language]').click();assert.equal(await editor.locator('textarea').inputValue(),locale==='ar'?'### Property details\n\nA **bold** description with *italic* and العربية\nSecond line\n\n- Open view\n- Practical layout\n\n#### Amenities\n\n1. Lift\n1. Private entrance':'### تفاصيل العقار\n\nوصف **عريض** مع *مائل* و English\nسطر ثان\n\n- إطلالة مفتوحة\n- تصميم عملي\n\n#### المرافق\n\n1. مصعد\n1. مدخل خاص');
   console.log(`${locale} ${theme} ${width}: badges AA, colors, desaturation, Markdown, toolbar, preview, focus, overflow PASS`);
  }
  assert.deepEqual(errors,[],'runtime errors');assert.deepEqual(consoleErrors,[],'console errors');console.log(`${captures} fresh screenshots; runtime/console errors 0`);
 } finally {
  if(browser)await browser.close();
  if(server&&server.exitCode===null)spawnSync('taskkill',['/pid',String(server.pid),'/T','/F'],{windowsHide:true});
  for(const [file,bytes]of generated)fs.writeFileSync(file,bytes);
  fs.rmSync(routeDir,{recursive:true,force:true});fs.rmSync(preload,{force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
