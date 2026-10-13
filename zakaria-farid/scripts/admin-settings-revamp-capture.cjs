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
const port = 51225, controlPort = 51226, base = `http://localhost:${port}`;
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
const env = { ...process.env, NEXT_DIST_DIR: '.next-capture/admin-settings-revamp', NEXT_PUBLIC_SUPABASE_URL: control, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'capture-anon-key', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'capture-anon-key', NEXT_TELEMETRY_DISABLED: '1' };
async function build() {
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], { cwd: app, env, stdio: 'inherit' });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { stop(child); reject(new Error('build exceeded 180000ms')); }, 180000);
    child.once('exit', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`build exit ${code}`)); });
  });
}
const setFixture = body => fetch(control, { method: 'POST', body: JSON.stringify(body) }).then(response => response.json());
(async()=>{
let captures=0;
try {
 await free(port);await free(controlPort);fs.mkdirSync(shots,{recursive:true});loadEnvConfig(app);
 fixtureServer=require('./lib/site-content-capture-proxy.cjs')();await new Promise(r=>fixtureServer.listen(controlPort,'127.0.0.1',r));
 if(!process.argv.includes('--reuse-build'))await build();server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--port',String(port)],{cwd:app,env,stdio:'inherit'});
 const deadline=Date.now()+30000;while(true){try{if((await fetch(base+'/admin/login')).ok)break;}catch{}if(Date.now()>deadline)throw Error('preview did not start');await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext();
 await context.route('**/*',route=>{const r=route.request();if(r.url().includes('/rest/v1/'))return route.fulfill({json:[]});if(!['GET','HEAD','OPTIONS'].includes(r.method())&&!r.url().startsWith(base+'/'))return route.abort();return route.continue();});
 const project=new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
 const jwt=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:'00000000-0000-4000-8000-000000000001',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.capture';
 const session={access_token:jwt,refresh_token:'capture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000001',role:'authenticated'}};
 await context.addCookies([{name:`sb-${project}-auth-token`,value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:base}]);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error('Browser console:',m.text());});
 const fixture=()=>fetch(control).then(r=>r.json());const preview=()=>page.frameLocator('iframe[title="معاينة الموقع"]');
 const capture=async name=>{
   await page.evaluate(()=>document.fonts.ready);
   for(const frame of page.frames()){
     await frame.evaluate(()=>document.fonts.ready);
     for(const selector of ['.atelier-hero-title','.hero-title','.hero-subtitle'])if(await frame.locator(selector).count())await frame.waitForFunction(selector=>{const el=document.querySelector(selector);return el&&getComputedStyle(el).opacity==='1';},selector);
   }
   await page.screenshot({path:path.join(shots,name+'.png'),animations:'disabled',fullPage:false});captures++;
 };
 const goto=async(group,width)=>{await page.setViewportSize({width,height:900});await page.goto(base+'/admin/ar/settings?group='+group,{waitUntil:'domcontentloaded'});await page.locator('[data-admin-settings]').waitFor();assert.equal(await page.locator('[data-settings-group="'+group+'"]').getAttribute('aria-current'),'page');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+group+'/'+width);assert.equal(await page.locator('[data-admin-settings] button:not([type="button"])').count(),0);assert.equal(await page.locator('[data-admin-settings] form').count(),0);assert.equal(await page.locator('a[href$="/page-content"]').count(),0);assert.match(await page.locator('[data-admin-settings] > header').innerText(),/capture@example.invalid/);const bar=await page.getByRole('region',{name:'حفظ التغييرات',exact:true}).boundingBox();assert.ok(bar.y>=0&&bar.y+bar.height<=900,'save bar inside viewport');if(width>=1200){try{await preview().locator('[data-settings-preview="'+group+'"]').waitFor({timeout:5000});}catch(e){console.log(await page.locator('iframe').evaluate(el=>({ready:el.contentDocument.readyState,html:el.contentDocument.body.innerHTML.slice(0,400),width:el.getBoundingClientRect().width})));throw e;}}};

 const auditPreview=async(label)=>{
   const evidence=await preview().locator('[data-settings-preview]').evaluate(root=>{
     const w=innerWidth,h=innerHeight;
     const rendered=el=>{const r=el.getBoundingClientRect();if(r.width<=1||r.height<=1||r.bottom<=0||r.top>=h||r.right<=0||r.left>=w)return false;for(let p=el;p;p=p.parentElement)if(getComputedStyle(p).display==='none')return false;return true;};
     const hidden=[...root.querySelectorAll('*')].filter(el=>rendered(el)&&['STYLE','SCRIPT'].every(tag=>el.tagName!==tag)).filter(el=>{const s=getComputedStyle(el);return Number(s.opacity)===0||s.visibility==='hidden';}).map(el=>el.tagName+'.'+el.className);
     const text=[...root.querySelectorAll('*')].filter(el=>el instanceof HTMLElement&&rendered(el)&&[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())).map(el=>{
       let scale=window.frameElement.getBoundingClientRect().width/innerWidth;for(let p=el;p;p=p.parentElement)scale*=Number(getComputedStyle(p).zoom)||1;
       return {tag:el.tagName,classes:el.className,size:parseFloat(getComputedStyle(el).fontSize)*scale};
     });
     const clipped=[];
     for(const el of root.querySelectorAll('*')){
       if(!(el instanceof HTMLElement)||!rendered(el)||el.closest('[aria-hidden=true]'))continue;
       for(const node of el.childNodes){
         if(node.nodeType!==Node.TEXT_NODE||!node.textContent.trim())continue;
         const range=document.createRange();range.selectNodeContents(node);
         for(const rect of range.getClientRects()){
           if(rect.bottom<=0||rect.top>=h)continue;
           let left=0,right=w;
           for(let p=el;p&&p!==root.parentElement;p=p.parentElement){const s=getComputedStyle(p),r=p.getBoundingClientRect();if(['hidden','clip','auto','scroll'].includes(s.overflowX)){left=Math.max(left,r.left);right=Math.min(right,r.right);}}
           if(rect.left<left-2||rect.right>right+2){clipped.push(el.tagName+'.'+el.className);break;}
         }
       }
     }
     const target=root.querySelector('[data-preview-focus]')||root.querySelector('[data-preview-target="'+root.dataset.highlight+'"]');
     const r=target?.getBoundingClientRect(),style=target&&getComputedStyle(target);
     const filler=[...root.querySelectorAll('[data-about-preview],.atelier-about-page,.contact-page,.home-view')].filter(el=>{const children=[...el.querySelectorAll('*')].filter(c=>c.getBoundingClientRect().height>0&&getComputedStyle(c).display!=='none'&&c.tagName!=='STYLE');return children.length&&el.getBoundingClientRect().height-Math.max(...children.map(c=>c.getBoundingClientRect().bottom-el.getBoundingClientRect().top))>80;}).map(el=>el.className||'data-about-preview');
     const first=root.querySelector('.hero-pill-line-gold')?.getBoundingClientRect(),second=root.querySelector('.hero-pill-line-white')?.getBoundingClientRect();
     const titleOverlap=!!(first&&second&&first.width>0&&first.bottom>second.top+1);
     const snapshot=root.querySelector('.executive-snapshot-card');
     const fadedSnapshot=!!(snapshot&&rendered(snapshot)&&Number(getComputedStyle(snapshot).opacity)<1);
     return {hidden,clipped,titleOverlap,fadedSnapshot,tiny:text.filter(item=>item.size<9.95),filler,target:r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,outline:style.outlineWidth}:null,viewport:{w,h}};
   });
   assert.deepEqual(evidence.hidden,[],label+' invisible rendered region');
   assert.deepEqual(evidence.filler,[],label+' empty full-page filler');
   assert.deepEqual(evidence.clipped,[],label+' horizontally clipped text');
   assert.equal(evidence.titleOverlap,false,label+' overlapping hero title lines');
   assert.equal(evidence.fadedSnapshot,false,label+' fading radar snapshot');
   assert.deepEqual(evidence.tiny,[],label+' text below 10px effective');
   assert.ok(evidence.target,label+' missing focused target');
   assert.ok(evidence.target.width>0&&evidence.target.height>0&&evidence.target.top>=-1&&evidence.target.bottom<=evidence.viewport.h+1&&evidence.target.left>=-1&&evidence.target.right<=evidence.viewport.w+1,label+' focused target clipped: '+JSON.stringify(evidence.target));
   assert.ok(parseFloat(evidence.target.outline)>0,label+' focused target not outlined');
 };
 if(process.argv.includes('--claude-fix1')){
   await goto('listings',1280);assert.equal(await preview().locator('.property-card').isVisible(),true,'initial listings preview must show the real card before field focus');
   const groups=['about','contact','home','listings','radar','whatsapp'];
   const fields={home:'platform_settings-home-heroTitle1Ar',about:'about_page-heroTitle1Ar',listings:'platform_settings-hidePropertyPrices',contact:'platform_settings-contact-phone',radar:'platform_settings-marketDistricts-0-districtAr',whatsapp:'platform_settings-whatsappAutomation-faridAlertPhone'};
   const aboutFields=['about_page-heroTitle1Ar','about_page-stats-0-value-ar','about_page-chapters-1-title-ar','about_page-stages-0-title-ar','about_page-stages-2-title-ar','about_page-founderQuoteAr','about_page-portalHeadingAr'];
   const settle=async()=>{await preview().locator('[data-preview-focus]').waitFor();await page.evaluate(()=>document.fonts.ready);await preview().locator('[data-settings-preview]').evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);};
   let audits=0;
   if(!process.argv.includes('--focus-only'))for(const group of groups){
     for(const phone of [false,true]){
       await goto(group,phone?390:1280);if(!phone){await settle();await auditPreview('initial '+group);audits++;}await page.locator('#'+fields[group]).focus();
       if(phone){await page.locator('[data-admin-settings] > header').getByRole('button',{name:'معاينة',exact:true}).click();await page.locator('dialog').waitFor({state:'visible'});await preview().locator('[data-settings-preview]').waitFor();}
       const panel=page.getByRole('region',{name:'معاينة مباشرة',exact:true});
       if(phone)await panel.getByRole('button',{name:'حاسوب',exact:true}).click();
       for(const language of ['ar','en']){
         if(language==='en')await panel.getByRole('button',{name:'EN',exact:true}).click();
         for(const theme of ['light','dark']){
           if(theme==='dark')await panel.getByRole('button',{name:'فاتح',exact:true}).click();
           const name=`fix1-${group}-${language}-${theme}-${phone?'390-phone':'1280-desktop'}`;
           await settle();assert.equal(await preview().locator('html').evaluate(()=>innerWidth),phone?390:1440);
           await auditPreview(name);audits++;
           await page.locator('iframe[title="معاينة الموقع"]').screenshot({path:path.join(shots,name+'.png'),animations:'disabled'});captures++;
           if(language==='ar'&&theme==='light')await capture(name+'-settings');
           if(theme==='dark')await panel.getByRole('button',{name:'داكن',exact:true}).click();
         }
       }
       if(phone)await page.keyboard.press('Escape');
     }
   }
   // Each About block, including a non-first folio, must follow focus in both languages/themes.
   for(const language of ['ar','en']){
     await goto('about',1280);
     const panel=page.getByRole('region',{name:'معاينة مباشرة',exact:true});
     if(language==='en'){await panel.getByRole('button',{name:'EN',exact:true}).click();await panel.getByRole('button',{name:'فاتح',exact:true}).click();}
     for(const id of aboutFields){
       await page.locator('#'+id).focus();await settle();const name=`fix1-about-block-${id}-${language}`;
       await auditPreview(name);audits++;await page.locator('iframe[title="معاينة الموقع"]').screenshot({path:path.join(shots,name+'.png'),animations:'disabled'});captures++;
     }
   }
   for(const language of ['ar','en'])for(const id of aboutFields){
     await goto('about',390);await page.locator('#'+id).focus();
     await page.locator('[data-admin-settings] > header').getByRole('button',{name:'معاينة',exact:true}).click();
     await preview().locator('[data-settings-preview]').waitFor();
     const panel=page.getByRole('region',{name:'معاينة مباشرة',exact:true});await panel.getByRole('button',{name:'حاسوب',exact:true}).click();
     if(language==='en'){await panel.getByRole('button',{name:'EN',exact:true}).click();await panel.getByRole('button',{name:'فاتح',exact:true}).click();}
     await settle();const name=`fix1-about-block-${id}-${language}-390-phone`;await auditPreview(name);audits++;
     await page.locator('iframe[title="معاينة الموقع"]').screenshot({path:path.join(shots,name+'.png'),animations:'disabled'});captures++;await page.keyboard.press('Escape');
   }
   for(const [group,ids]of [
     ['home',['platform_settings-home-showStatsRibbon','platform_settings-home-featuredTitle1Ar','platform_settings-home-sellerTitle1Ar']],
     ['listings',['platform_settings-showFloorPlans','platform_settings-showCommuteTimes','platform_settings-showMarketRadar','platform_settings-showVIPAlerts']],
     ['contact',['platform_settings-contact-addressAr','platform_settings-contact-email','platform_settings-contact-whatsapp']],
     ['radar',['platform_settings-marketDistricts-1-districtAr','platform_settings-marketDistricts-1-pricePerSqm']],
   ]){
     await goto(group,1280);
     for(const id of ids){await page.locator('#'+id).focus();await settle();const name='fix1-focus-'+id;await auditPreview(name);audits++;await page.locator('iframe[title="معاينة الموقع"]').screenshot({path:path.join(shots,name+'.png'),animations:'disabled'});captures++;}
   }
   await goto('contact',1280);
   for(const label of ['B','I','•','1.','H'])assert.equal(await page.locator('[data-admin-settings] button').filter({hasText:new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).count(),2,'shared contact toolbar '+label);
   assert.deepEqual(errors,[],'no page errors');assert.equal((await fixture()).writes,0,'preview matrix must not save');
   console.log(JSON.stringify({round:'Claude fix round 1',audits,captures,errors,writes:(await fixture()).writes,shots}));return;
 }
 for(const group of ['home','about','listings','contact','radar','whatsapp']){await goto(group,1440);assert.equal(await page.locator('input[id*="Token"]').count(),0);const boxes=await page.locator('[data-admin-settings] > div').first().evaluate(el=>[...el.children].map(c=>{const r=c.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width};}));assert.equal(boxes.length,3);assert.ok(boxes.every(b=>b.x>=0&&b.right<=1440&&b.width>100),'column bounds');await capture('settings-ar-1440-'+group);}
 await goto('listings',1280);for(const [id,name]of [['showFloorPlans','plans'],['showCommuteTimes','commute']]){await page.locator('#platform_settings-'+id).focus();await preview().locator('[data-highlight="'+name+'"]').waitFor();await capture('settings-ar-1280-preview-'+name);}await goto('home',1280);await page.locator('#platform_settings-home-heroTitle1Ar').fill('عنوان المعاينة المباشر');await preview().locator('.hero-title').filter({hasText:'عنوان المعاينة المباشر'}).waitFor();assert.equal(await page.locator('[data-settings-group="home"] span').count(),1);assert.equal((await fixture()).writes,0);await page.locator('#platform_settings-home-heroTitle1Ar').focus();assert.equal(await preview().locator('[data-highlight]').getAttribute('data-highlight'),'hero');assert.match(await page.getByRole('status').last().innerText(),/تغيير واحد غير محفوظ/);await capture('settings-ar-1280-dirty');await Promise.all([new Promise(resolve=>page.once('dialog',async d=>{assert.equal(d.type(),'beforeunload');await d.dismiss();resolve();})),page.evaluate(()=>location.reload())]);assert.equal(await page.locator('#platform_settings-home-heroTitle1Ar').inputValue(),'عنوان المعاينة المباشر');
 page.once('dialog',d=>d.dismiss());await page.locator('a[href="/admin/ar/properties"]').first().click();assert.match(page.url(),/settings/);assert.equal(await page.locator('#platform_settings-home-heroTitle1Ar').inputValue(),'عنوان المعاينة المباشر');
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'خروج',exact:true}).click();assert.match(page.url(),/settings/);
 await page.keyboard.press('Control+k');await page.getByText('تحرير عقد بيع جديد',{exact:true}).waitFor();page.once('dialog',d=>d.dismiss());await page.getByText('تحرير عقد بيع جديد',{exact:true}).click();assert.match(page.url(),/settings/);await page.keyboard.press('Escape');
 page.once('dialog',d=>d.dismiss());await page.evaluate(()=>history.back());await page.waitForFunction(()=>location.pathname.endsWith('/settings'));
 await page.locator('[data-settings-group="about"]').click();await page.locator('#about_page-heroTitle1Ar').fill('عنوان المكتب المباشر');await page.locator('[data-settings-group="listings"]').click();await page.locator('#platform_settings-hidePropertyPrices').uncheck();assert.equal((await fixture()).writes,0,'no toggle autosave');
 await setFixture({failWrites:true,writeDelayMs:1000});await page.getByRole('button',{name:'حفظ التغييرات',exact:true}).click();assert.equal(await page.getByRole('button',{name:'حفظ التغييرات',exact:true}).isDisabled(),true);assert.equal(await page.locator('#platform_settings-showFloorPlans').isDisabled(),true);await capture('settings-ar-1280-saving');await page.locator('[data-admin-settings] [role=alert]').filter({hasText:'تعذر حفظ'}).first().waitFor();assert.equal(await page.locator('[data-admin-settings] [role=alert]').count(),2);await capture('settings-ar-1280-error');await setFixture({failWrites:false,writeDelayMs:0});await page.getByRole('button',{name:'حفظ التغييرات',exact:true}).click();await page.getByRole('status').filter({hasText:'تم حفظ التغييرات'}).waitFor();const result=await fixture();assert.equal(result.writes,4);assert.equal(result.rows.platform_settings.home.heroTitle1Ar,'عنوان المعاينة المباشر');assert.equal(result.rows.about_page.heroTitle1Ar,'عنوان المكتب المباشر');assert.equal(result.rows.platform_settings.hidePropertyPrices,false);await capture('settings-ar-1280-saved');
 await page.locator('[data-settings-group=home]').click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'استعادة الافتراضي',exact:true}).click();assert.equal((await fixture()).writes,4);page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'تجاهل',exact:true}).click();assert.match(await page.getByRole('status').last().innerText(),/لا توجد تغييرات غير محفوظة/);
 await page.locator('[data-settings-group="radar"]').click();await page.getByRole('button',{name:'إضافة المناطق',exact:true}).click();await page.locator('[id$="-districtAr"]').last().fill('منطقة تجريبية');await page.locator('[id$="-district"]').last().fill('Preview district');await page.locator('[id$="-isEnabled"]').last().check();await preview().locator('.row-name').filter({hasText:'منطقة تجريبية'}).waitFor();await page.locator('[id$="-districtAr"]').last().locator('xpath=ancestor::div[contains(@class,"listItem")][1]').getByRole('button',{name:'لأعلى',exact:true}).click();assert.equal(await page.locator('[id$="-districtAr"]').nth(4).inputValue(),'منطقة تجريبية');await page.locator('[id$="-districtAr"]').nth(4).locator('xpath=ancestor::div[contains(@class,"listItem")][1]').getByRole('button',{name:'حذف',exact:true}).click();assert.equal(await page.locator('[id$="-districtAr"]').count(),5);await page.locator('[id$="-districtAr"]').first().fill('منطقة متغيرة');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'تجاهل',exact:true}).click();
 for(const group of ['home','contact']){await goto(group,390);await capture('settings-ar-390-'+group);if(group==='home'){await page.locator('#platform_settings-home-showHero').uncheck();await capture('settings-ar-390-dirty');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'تجاهل',exact:true}).click();}await page.locator('[data-admin-settings] > header').getByRole('button',{name:'معاينة',exact:true}).click();await page.locator('dialog').waitFor({state:'visible'});await preview().locator('[data-settings-preview]').waitFor();await page.getByRole('button',{name:'حاسوب',exact:true}).click();assert.equal(await preview().locator('html').evaluate(()=>innerWidth),390);await capture('settings-ar-390-'+group+'-preview');await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'hidden'});assert.equal(await page.locator('[data-admin-settings] > header').getByRole('button',{name:'معاينة',exact:true}).evaluate(el=>el===document.activeElement),true);}
 await goto('about',1024);await page.locator('[data-admin-settings] > header').getByRole('button',{name:'معاينة',exact:true}).click();await page.locator('dialog').waitFor({state:'visible'});await preview().locator('[data-about-preview]').waitFor();await capture('settings-ar-1024-drawer');await page.getByRole('button',{name:'EN',exact:true}).click();await preview().locator('.atelier-hero-title').filter({hasText:'Curating'}).waitFor();await page.getByRole('button',{name:'فاتح',exact:true}).click();assert.equal(await preview().locator('html').getAttribute('data-theme'),'dark');await capture('settings-en-dark-1024-drawer');await page.keyboard.press('Escape');await page.goto(base+'/admin/ar/page-content',{waitUntil:'domcontentloaded'});await page.waitForURL(/settings\?group=about$/);await page.locator('[data-content-block=hero]').waitFor();assert.match(page.url(),/settings\?group=about$/);
 assert.deepEqual(errors,[],'no page errors');console.log(JSON.stringify({captures,reads:(await fixture()).reads,writes:(await fixture()).writes,shots}));
}finally{if(browser)await browser.close();stop(server);if(fixtureServer)await new Promise(r=>fixtureServer.close(r));for(const [file,content]of originals)fs.writeFileSync(file,content);}
})().catch(error=>{console.error(error);process.exitCode=1;});
