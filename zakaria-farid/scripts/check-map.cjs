
const p=require(process.cwd()+'/node_modules/puppeteer-core');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const option = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const baseUrl = option('--url') || 'http://localhost:51208';
const output = option('--output');
let checks = 0;
(async()=>{
 const b=await p.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
 const page=await b.newPage();
 // Unpkg failure must no longer affect tile layout.
 await page.setRequestInterception(true);page.on('request',r=>r.url().includes('unpkg.com')?r.abort():r.continue());
 page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 const settle=async()=>{await page.waitForFunction(()=>{const ts=[...document.querySelectorAll('.leaflet-tile')];return ts.length>0&&ts.every(t=>t.complete&&t.naturalWidth>0)},{timeout:30000});await new Promise(r=>setTimeout(r,500));};
 const check=async(expected)=>{
  await settle();
  const result=await page.evaluate(()=>{
   const nav=document.querySelector('.nav-glass-capsule').getBoundingClientRect();
   const sidebar=document.querySelector('.floating-glass-directory').getBoundingClientRect();
   const controls=document.querySelector('.map-floating-controls-row').getBoundingClientRect();
   const images=[...document.querySelectorAll('.leaflet-tile')];
   const base=[...document.querySelectorAll('.leaflet-tile-pane > .leaflet-layer:first-child .leaflet-tile, .leaflet-neon-basemap-pane > .leaflet-layer:first-child .leaflet-tile')];
   const sampleXs=[1,window.innerWidth/2,window.innerWidth-1],sampleYs=[1,window.innerHeight/2,window.innerHeight-1];
   return {nav:{left:nav.left,right:nav.right,bottom:nav.bottom},sidebar:{top:sidebar.top,left:sidebar.left,right:sidebar.right},controls:{top:controls.top,left:controls.left,right:controls.right,bottom:controls.bottom},layers:document.querySelectorAll('.leaflet-layer').length,position:getComputedStyle(images[0]).position,coverage:sampleXs.every(x=>sampleYs.every(y=>base.some(t=>{const r=t.getBoundingClientRect();return x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom}))),filter:getComputedStyle(document.querySelector('.leaflet-neon-basemap-pane')).filter,attribution:document.querySelector('.leaflet-control-attribution').textContent,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(result.layers,expected);assert.equal(result.position,'absolute');assert.equal(result.filter,'sepia(0.65) saturate(1.25)');assert.equal(result.coverage,true);assert.equal(result.overflow,false);
  assert.ok(result.nav.left>=-1&&result.nav.right<=await page.evaluate(()=>innerWidth)+1);
  assert.ok(result.sidebar.top>=result.nav.bottom);assert.ok(result.controls.top>=result.nav.bottom);
  assert.ok(result.controls.right<=result.sidebar.left||result.controls.left>=result.sidebar.right||result.controls.bottom<=result.sidebar.top);
  assert.match(result.attribution,/Esri/);assert.ok(result.controls.left>=0&&result.controls.right<=await page.evaluate(()=>innerWidth));checks++;
  assert.equal(await page.evaluate(()=>{const c=document.querySelector('.leaflet-control-attribution');const r=c.getBoundingClientRect();return !!document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('.leaflet-control-attribution')}),true);
 };
 for(const width of [1280,1024,390])for(const locale of ['en','ar']){
  await page.setViewport({width,height:width===390?844:900});
  await page.goto(baseUrl+'/'+locale+'/map',{waitUntil:'networkidle2',timeout:45000});await check(3);
  if(output&&width!==1024){fs.mkdirSync(path.join(output,String(width)),{recursive:true});await page.screenshot({path:path.join(output,String(width),'satellite-'+locale+'.png'),fullPage:true});}
  for(let i=0;i<5;i++){await page.click('.map-mode-pill-btn');await check(i%2===0?2:3);}
  if(output&&width!==1024){fs.mkdirSync(path.join(output,String(width)),{recursive:true});await page.screenshot({path:path.join(output,String(width),'neon-'+locale+'.png'),fullPage:true});}
  await page.click('.map-glass-ctrl-btn');await settle();await check(2);
  // Drag the actual map; loaded base tiles must still cover all nine viewport samples.
  await page.mouse.move(width===390?170:width/2,170);await page.mouse.down();await page.mouse.move(width===390?260:width/2+140,210,{steps:12});await page.mouse.up();await settle();await check(2);
  await page.focus('.map-mode-pill-btn');await page.keyboard.press('Enter');await check(3);
 }
 // Corrupt the existing cache with all three formerly accepted invalid responses.
 const invalidUrls=await page.evaluate(async()=>{
  const cache=await caches.open('zf-sovereign-map-cache-v1');const urls=(await cache.keys()).map(r=>r.url).filter(url=>url.includes('World_Imagery'));for(let i=0;i<urls.length;i++)await cache.put(urls[i],new Response(i%3===0?'error':i%3===1?'':'not an image',{headers:{'Content-Type':i%3===0?'text/html':'image/png'}}));return urls;
 });
 assert.ok(invalidUrls.length>0);await page.reload({waitUntil:'networkidle2'});await check(3);
 console.log('CACHE_RECOVERY',invalidUrls.length,'invalid cached images recovered');
 console.log('PASS',checks,'real-map assertions across 1280/1024/390 and en/ar; five switches, keyboard, pan/zoom, CDN failure and cache recovery');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
