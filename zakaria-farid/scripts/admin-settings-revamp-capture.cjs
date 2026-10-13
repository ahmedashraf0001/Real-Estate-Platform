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
 for(const group of ['home','about','listings','contact','radar','whatsapp']){await goto(group,1440);assert.equal(await page.locator('input[id*="Token"]').count(),0);const boxes=await page.locator('[data-admin-settings] > div').first().evaluate(el=>[...el.children].map(c=>{const r=c.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width};}));assert.equal(boxes.length,3);assert.ok(boxes.every(b=>b.x>=0&&b.right<=1440&&b.width>100),'column bounds');await capture('settings-ar-1440-'+group);}
 await goto('listings',1280);for(const [id,name]of [['showFloorPlans','plans'],['showCommuteTimes','commute']]){await page.locator('#platform_settings-'+id).focus();await preview().locator('[data-highlight="'+name+'"]').waitFor();await capture('settings-ar-1280-preview-'+name);}await goto('home',1280);await page.locator('#platform_settings-home-heroTitle1Ar').fill('عنوان المعاينة المباشر');await preview().locator('.hero-title').filter({hasText:'عنوان المعاينة المباشر'}).waitFor();assert.equal(await page.locator('[data-settings-group="home"] span').count(),1);assert.equal((await fixture()).writes,0);await page.locator('#platform_settings-home-heroTitle1Ar').focus();assert.equal(await preview().locator('[data-highlight]').getAttribute('data-highlight'),'hero');assert.match(await page.getByRole('status').last().innerText(),/1 تغييرات غير محفوظة/);await capture('settings-ar-1280-dirty');await Promise.all([new Promise(resolve=>page.once('dialog',async d=>{assert.equal(d.type(),'beforeunload');await d.dismiss();resolve();})),page.evaluate(()=>location.reload())]);assert.equal(await page.locator('#platform_settings-home-heroTitle1Ar').inputValue(),'عنوان المعاينة المباشر');
 page.once('dialog',d=>d.dismiss());await page.locator('a[href="/admin/ar/properties"]').first().click();assert.match(page.url(),/settings/);assert.equal(await page.locator('#platform_settings-home-heroTitle1Ar').inputValue(),'عنوان المعاينة المباشر');
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'خروج',exact:true}).click();assert.match(page.url(),/settings/);
 await page.keyboard.press('Control+k');await page.getByText('تحرير عقد بيع جديد',{exact:true}).waitFor();page.once('dialog',d=>d.dismiss());await page.getByText('تحرير عقد بيع جديد',{exact:true}).click();assert.match(page.url(),/settings/);await page.keyboard.press('Escape');
 page.once('dialog',d=>d.dismiss());await page.evaluate(()=>history.back());await page.waitForFunction(()=>location.pathname.endsWith('/settings'));
 await page.locator('[data-settings-group="about"]').click();await page.locator('#about_page-heroTitle1Ar').fill('عنوان المكتب المباشر');await page.locator('[data-settings-group="listings"]').click();await page.locator('#platform_settings-hidePropertyPrices').uncheck();assert.equal((await fixture()).writes,0,'no toggle autosave');
 await setFixture({failWrites:true,writeDelayMs:1000});await page.getByRole('button',{name:'حفظ التغييرات',exact:true}).click();assert.equal(await page.getByRole('button',{name:'حفظ التغييرات',exact:true}).isDisabled(),true);assert.equal(await page.locator('#platform_settings-showFloorPlans').isDisabled(),true);await capture('settings-ar-1280-saving');await page.locator('[data-admin-settings] [role=alert]').filter({hasText:'تعذر حفظ'}).first().waitFor();assert.equal(await page.locator('[data-admin-settings] [role=alert]').count(),2);await capture('settings-ar-1280-error');await setFixture({failWrites:false,writeDelayMs:0});await page.getByRole('button',{name:'حفظ التغييرات',exact:true}).click();await page.getByRole('status').filter({hasText:'تم حفظ التغييرات'}).waitFor();const result=await fixture();assert.equal(result.writes,4);assert.equal(result.rows.platform_settings.home.heroTitle1Ar,'عنوان المعاينة المباشر');assert.equal(result.rows.about_page.heroTitle1Ar,'عنوان المكتب المباشر');assert.equal(result.rows.platform_settings.hidePropertyPrices,false);await capture('settings-ar-1280-saved');
 await page.locator('[data-settings-group=home]').click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'استعادة الافتراضي',exact:true}).click();assert.equal((await fixture()).writes,4);page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'تجاهل',exact:true}).click();assert.match(await page.getByRole('status').last().innerText(),/0 تغييرات غير محفوظة/);
 await page.locator('[data-settings-group="radar"]').click();await page.getByRole('button',{name:'إضافة المناطق',exact:true}).click();await page.locator('[id$="-districtAr"]').last().fill('منطقة تجريبية');await page.locator('[id$="-district"]').last().fill('Preview district');await page.locator('[id$="-isEnabled"]').last().check();await preview().locator('.row-name').filter({hasText:'منطقة تجريبية'}).waitFor();await page.locator('[id$="-districtAr"]').last().locator('xpath=ancestor::div[contains(@class,"listItem")][1]').getByRole('button',{name:'لأعلى',exact:true}).click();assert.equal(await page.locator('[id$="-districtAr"]').nth(4).inputValue(),'منطقة تجريبية');await page.locator('[id$="-districtAr"]').nth(4).locator('xpath=ancestor::div[contains(@class,"listItem")][1]').getByRole('button',{name:'حذف',exact:true}).click();assert.equal(await page.locator('[id$="-districtAr"]').count(),5);await page.locator('[id$="-districtAr"]').first().fill('منطقة متغيرة');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'تجاهل',exact:true}).click();
 for(const group of ['home','contact']){await goto(group,390);await capture('settings-ar-390-'+group);if(group==='home'){await page.locator('#platform_settings-home-showHero').uncheck();await capture('settings-ar-390-dirty');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'تجاهل',exact:true}).click();}await page.locator('[data-admin-settings] > header').getByRole('button',{name:'معاينة',exact:true}).click();await page.locator('dialog').waitFor({state:'visible'});await preview().locator('[data-settings-preview]').waitFor();await page.getByRole('button',{name:'حاسوب',exact:true}).click();assert.equal(await preview().locator('html').evaluate(()=>innerWidth),390);await capture('settings-ar-390-'+group+'-preview');await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'hidden'});assert.equal(await page.locator('[data-admin-settings] > header').getByRole('button',{name:'معاينة',exact:true}).evaluate(el=>el===document.activeElement),true);}
 await goto('about',1024);await page.locator('[data-admin-settings] > header').getByRole('button',{name:'معاينة',exact:true}).click();await page.locator('dialog').waitFor({state:'visible'});await preview().locator('[data-about-preview]').waitFor();await capture('settings-ar-1024-drawer');await page.getByRole('button',{name:'EN',exact:true}).click();await preview().locator('.atelier-hero-title').filter({hasText:'Curating'}).waitFor();await page.getByRole('button',{name:'فاتح',exact:true}).click();assert.equal(await preview().locator('html').getAttribute('data-theme'),'dark');await capture('settings-en-dark-1024-drawer');await page.keyboard.press('Escape');await page.goto(base+'/admin/ar/page-content',{waitUntil:'domcontentloaded'});await page.waitForURL(/settings\?group=about$/);await page.locator('[data-content-block=hero]').waitFor();assert.match(page.url(),/settings\?group=about$/);
 assert.deepEqual(errors,[],'no page errors');console.log(JSON.stringify({captures,reads:(await fixture()).reads,writes:(await fixture()).writes,shots}));
}finally{if(browser)await browser.close();stop(server);if(fixtureServer)await new Promise(r=>fixtureServer.close(r));for(const [file,content]of originals)fs.writeFileSync(file,content);}
})().catch(error=>{console.error(error);process.exitCode=1;});
