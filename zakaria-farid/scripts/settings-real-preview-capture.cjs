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
const port = 51235, controlPort = 51236, base = `http://localhost:${port}`;
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
const env = { ...process.env, NEXT_DIST_DIR: '.next-capture/settings-real-preview', NEXT_PUBLIC_SUPABASE_URL: control, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'capture-anon-key', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'capture-anon-key', NEXT_TELEMETRY_DISABLED: '1' };
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
 const preview=()=>page.frameLocator('iframe[title="معاينة الموقع"]');
 const frame=()=>page.frames().find(f=>f.url().includes('preview=1'));
 const settle=async()=>{await preview().locator('.settings-preview-badge').waitFor();await preview().locator('[data-preview-focus]').waitFor();await page.waitForTimeout(350);};
 const shot=async name=>{await page.evaluate(()=>document.fonts.ready);if(frame())await frame().evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(shots,name+'.png'),animations:'disabled'});captures++;};
 const open=async(group,width=1280)=>{
  await page.setViewportSize({width,height:900});await page.goto(base+'/admin/ar/settings?group='+group,{waitUntil:'domcontentloaded'});
  await page.locator('[data-admin-settings]').waitFor();
  if(width<1200)await page.locator('button').filter({hasText:'معاينة'}).first().click();
  if(group!=='whatsapp'){await settle();assert.ok(await preview().locator('nav').count(),'real Navbar');assert.ok(await preview().locator('footer').count(),'real Footer');assert.match(frame().url(),/preview=1/);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'admin overflow');
 };
 const field=id=>page.locator('#'+id).last();
 await setFixture({rows:{platform_settings:{hidePropertyPrices:false}}});
 await open('home');const initialLoad=await frame().evaluate(()=>performance.timeOrigin);await field('platform_settings-home-heroTitle1Ar').fill('عنوان المسودة غير المحفوظ');
 await preview().locator('.hero-title').filter({hasText:'عنوان المسودة غير المحفوظ'}).waitFor();await settle();
 assert.equal(await frame().evaluate(()=>innerWidth),1440);await shot('home-1280-draft');
 assert.equal(await frame().evaluate(()=>performance.timeOrigin),initialLoad,'draft updated without reload');
 await field('platform_settings-home-sellerTitle1Ar').focus();await settle();
 const focus=await preview().locator('[data-preview-focus]').evaluate(el=>({y:el.getBoundingClientRect().y,h:innerHeight,outline:getComputedStyle(el).outlineWidth}));
 assert.ok(focus.y>=0&&focus.y<focus.h&&parseFloat(focus.outline)>0,JSON.stringify(focus));await shot('home-lower-focus-1280');
 const originalUrl=frame().url();await preview().locator('a').first().dispatchEvent('click');assert.equal(frame().url(),originalUrl);
 await field('platform_settings-home-showSellerConsignment').uncheck();await settle();assert.equal(await preview().locator('.seller-banner-section').count(),0);await shot('home-hidden-section-1280');
 const submit=await frame().evaluate(()=>{const form=document.querySelector('form');if(!form)return null;const event=new Event('submit',{bubbles:true,cancelable:true});return {allowed:form.dispatchEvent(event),prevented:event.defaultPrevented};});
 assert.deepEqual(submit,{allowed:false,prevented:true});
 await open('about');await field('about_page-heroTitle1Ar').fill('سردية المسودة');await preview().locator('.atelier-hero-title').filter({hasText:'سردية المسودة'}).waitFor();await settle();await shot('about-1280-draft');
 await open('contact');await field('platform_settings-contact-phone').fill('+20 123 456 789');await settle();
 assert.equal((await preview().locator('footer a[href^="tel:"]').getAttribute('href')).replace(/\D/g,''),'20123456789');assert.equal((await preview().locator('.contact-page a[href^="tel:"]').getAttribute('href')).replace(/\D/g,''),'20123456789');await shot('contact-1280-draft');
 await preview().locator('footer').evaluate(el=>el.scrollIntoView({block:'end'}));await shot('contact-footer-1280');
 await open('listings');await field('platform_settings-hidePropertyPrices').check();await settle();
 assert.match(await preview().locator('.no-results-box').innerText(),/لا توجد عقارات/);assert.match(await preview().locator('.settings-preview-sample').innerText(),/مثال للمعاينة/);
 assert.ok(await preview().locator('.settings-preview-sample .property-card').count());assert.equal(await preview().locator('.settings-preview-sample .card-price').innerText(),'السعر عند الطلب');await shot('listings-1280-empty-hidden-price');
 await field('platform_settings-showFloorPlans').focus();await settle();await preview().locator('[data-preview-target="plans"]').waitFor();await shot('listings-plans-1280');
 await field('platform_settings-showFloorPlans').uncheck();await settle();assert.equal(await preview().locator('#architectural-cad-section').count(),0);await shot('listings-plans-hidden-1280');
 await field('platform_settings-showCommuteTimes').focus();await settle();assert.ok(await preview().locator('.location-suite-side').count());await shot('listings-commute-1280');
 await field('platform_settings-showCommuteTimes').uncheck();await settle();assert.equal(await preview().locator('.location-suite-side').count(),0);
 await open('radar');await field('platform_settings-marketDistricts-0-districtAr').fill('منطقة المسودة');await settle();assert.match(await preview().locator('[data-preview-target="radar"]').innerText(),/منطقة المسودة/);await shot('radar-1280-draft');
 await open('whatsapp');await field('platform_settings-whatsappAutomation-faridAlertPhone').fill('201234567890');assert.match(await page.locator('.settings-message-preview').innerText(),/201234567890/);await shot('whatsapp-1280-draft');
 await open('home',390);await page.getByRole('button',{name:'حاسوب',exact:true}).last().click();await settle();assert.equal(await frame().evaluate(()=>innerWidth),390);await shot('home-390-phone');
 await page.getByRole('button',{name:'EN',exact:true}).last().click();await settle();assert.match(frame().url(),/\/en\?preview=1/);await shot('home-390-en');
 await page.getByRole('button',{name:'فاتح',exact:true}).last().click();await preview().locator('html[data-theme="dark"]').waitFor();await shot('home-390-en-dark');
 for(const group of ['about','contact','listings','radar','whatsapp']){await open(group,390);if(group!=='whatsapp'){await page.getByRole('button',{name:'حاسوب',exact:true}).last().click();await settle();}await shot(group+'-390');}
 const property={id:'00000000-0000-4000-8000-000000000002',slug:'capture-first-property',title_en:'Capture first property',title_ar:'عقار اختبار المسار',description_en:'Capture only',description_ar:'اختبار فقط',price_egp:1234567,area_sqm:120,bedrooms:2,bathrooms:1,type:'apartment',location:'Cairo',latitude:30,longitude:31,completion_status:'ready',listing_status:'active',is_featured:true,created_at:'2026-10-14T00:00:00Z',property_images:[],property_amenities:[]};
 await setFixture({propertyRows:[property]});await open('listings');await field('platform_settings-showFloorPlans').focus();
 await page.waitForFunction(()=>{const frame=document.querySelector('iframe');return frame?.contentWindow?.location.pathname.endsWith('/capture-first-property');});await settle();
 assert.match(frame().url(),/\/ar\/properties\/capture-first-property\?preview=1/);assert.equal(await preview().locator('.settings-preview-sample').count(),0);
 await field('platform_settings-hidePropertyPrices').check();await settle();await field('platform_settings-showCommuteTimes').focus();await settle();assert.ok(await preview().locator('.location-suite-side').count());await shot('listings-real-detail-1280');
 await setFixture({propertyRows:[]});
 const standalone=await context.newPage();await standalone.goto(base+'/ar?preview=1');assert.equal(await standalone.locator('.settings-preview-badge').count(),0);await standalone.close();
 assert.deepEqual(errors,[],'page errors');assert.equal((await fetch(control).then(r=>r.json())).writes,0,'zero fixture writes');console.log('settings-real-preview captures',captures);
} finally {await browser?.close();stop(server);if(fixtureServer)await new Promise(r=>fixtureServer.close(r));for(const [file,content] of originals)fs.writeFileSync(file,content);}
})().catch(error=>{console.error(error);process.exitCode=1;});
