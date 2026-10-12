import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { miniMarkdown, stripMarkdown } from '../../markdown/miniMarkdown';
import { legacyHtmlToMarkdown } from '../../markdown/legacyHtmlToMarkdown';
import { rankGeocodeCandidates } from '../../geocodeCandidates';
import { adminHarness, nodes, textOf } from './adminWizardHarness';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/admin/geocode/route';
const render = (text: string) => renderToStaticMarkup(createElement('div', {}, miniMarkdown(text)));
test('description headings and hairlines render without literal markers, pipes stay text', () => {
 const html = render('Price | Beds\n\n# Title\n## Overview\n### Details\n#### Small\n---\n***\n___\n- **Beds:** three');
 assert.match(html, /<h2[^>]*>Title<\/h2>/);
 assert.match(html, /<h3[^>]*>Overview<\/h3>/);
 assert.match(html, /<h3[^>]*>Details<\/h3>/);
 assert.match(html, /<h4[^>]*>Small<\/h4>/);
 assert.equal((html.match(/<hr/g) || []).length, 3);
 assert.match(html, /Price \| Beds/);
 assert.match(html, /<strong>Beds:<\/strong>/);
 assert.doesNotMatch(html, /##|---|<h1|<table/);
 assert.equal(stripMarkdown('# Title\n---\n## Overview'), 'Title Overview');
});
test('each markdown block aligns at start with automatic direction; lists follow first item', () => {
 const html = render('English paragraph\n\n## عربي\n- **English:** first\n- العربية');
 for (const tag of ['p', 'h3', 'ul', 'li']) assert.match(html, new RegExp('<' + tag + '[^>]*dir="auto"[^>]*text-align:start'));
 assert.match(html, /<ul[^>]*>\s*<li/);
 const css = readFileSync('src/app/globals.css', 'utf8');
 assert.match(css, /\.mini-markdown[^{}]*[^{]*\{[^}]*text-align:\s*start/);
});
test('legacy h1 h2 and hr normalize to supported markdown', () => {
 assert.equal(legacyHtmlToMarkdown('<h1>Title</h1><h2>Overview</h2><hr><p>Text</p>'), '## Title\n\n## Overview\n\n---\n\nText');
 assert.equal(legacyHtmlToMarkdown('<hr>'), '---');
 assert.doesNotMatch(render('[link](https://example.com) <img src=x>'), /<a |<img /);
});
for (const metadata of [{types:['hospital','establishment']}, {class:'amenity',type:'hospital'}, {osm_key:'amenity',osm_value:'hospital'}, {Addr_type:'POI'}]) {
 test('hospital query prefers provider POI over street ' + JSON.stringify(metadata), () => {
  const street = {display_name:'شارع مستشفى العاصمة، منيا القمح، الشرقية', type:'residential'};
  const poi = {display_name:'مستشفى العاصمة — منيا القمح', ...metadata};
  assert.equal(rankGeocodeCandidates('مستشفى العاصمة منيا القمح', [street, poi])[0], poi);
  assert.equal(rankGeocodeCandidates('شارع مستشفى العاصمة, منيا القمح', [street, poi])[0], poi);
 });
}
test('location decisions accept <=1500m, reject coarse invalid and network positions; errors have reasons', async () => {
 const { locationDecision, locationError } = await import('../../geolocationDecision');
 assert.equal(locationDecision(1500).move, true);
 assert.equal(locationDecision(1501).move, false);
 assert.equal(locationDecision(0).move, true);
 for (const accuracy of [NaN, Infinity, -1, undefined]) assert.equal(locationDecision(accuracy).move, false);
 assert.match(locationDecision(100, true).message, /±100 م/);
 assert.match(locationDecision(20000, true).message, /±20 كم/);
 assert.doesNotMatch(locationDecision(100).message, /GPS/);
 assert.match(locationError(1), /permission/i);
 assert.match(locationError(2), /unavailable/i);
 assert.match(locationError(3), /timeout/i);
});
test('public blueprint detail is sticky layout column outside plan; mobile sheet starts below 900px', () => {
 const css = readFileSync('src/components/blueprint/BuildingBlueprintPreview.module.css','utf8');
 const source = readFileSync('src/components/blueprint/BuildingBlueprintPreview.tsx','utf8');
 assert.match(css, /\.detail\s*\{[^}]*position:\s*sticky/);
 assert.match(css, /\.withDetail\s*\{[^}]*grid-template-columns:/);
 assert.match(css, /@media\s*\(max-width:\s*899px\)/);
 assert.match(source, /<\/div>\s*\{!ed.editing && selected && <aside/);
 assert.doesNotMatch(source, /--bp-detail-height|--bp-detail-top/);
});

for (const accuracy of [1500, 1501, 20000]) test(`real locate handler accuracy ${accuracy} preserves or moves pin, coarse override is explicit`, () => {
 const writes: number[][] = [], messages: string[] = [];
 const h = adminHarness('MapPicker', '', () => { throw Error('No network fallback allowed'); }, {
  navigator: {geolocation: {getCurrentPosition(success: any) {success({coords:{latitude:30.51,longitude:31.35,accuracy}});}}},
  sonner: {toast: {success: (message: string) => messages.push(message)}},
 });
 const props = {latitude:30.1,longitude:31.1,isAr:true,onChange:(...coords: number[])=>writes.push(coords)};
 try {
  let tree = h.render(props);
  nodes(tree).find(n => n.type === 'button' && n.props.onClick?.name === 'handleLocateMe').props.onClick();
  tree = h.render(props);
  if (accuracy <= 1500) {assert.deepEqual(writes,[[30.51,31.35]]); assert.deepEqual(messages,['تم تحديد موقعك (±1500 م)']);}
  else {
   assert.deepEqual(writes,[]);assert.deepEqual(messages,[]);
   assert.match(textOf(tree), /موقعك من المتصفح تقريبي/);
   const override = nodes(tree).find(n=>n.type==='button' && textOf(n)==='انقل الدبوس رغم ذلك');
   override.props.onClick();
   assert.deepEqual(writes,[[30.51,31.35]]);
   assert.doesNotMatch(textOf(h.render(props)),/انقل الدبوس رغم ذلك/);
  }
 } finally {h.cleanup();}
});
for (const code of [1,2,3]) test(`real locate error ${code} shows inline reason and never invokes a fallback`, () => {
 const writes: number[][]=[];
 const h=adminHarness('MapPicker','',()=>{throw Error('No fallback');},{navigator:{geolocation:{getCurrentPosition(_success: any,error: any){error({code});}}}});
 const props={isAr:false,onChange:(...coords: number[])=>writes.push(coords)};
 try {
  const tree=h.render(props);
  nodes(tree).find(n=>n.type==='button'&&n.props.onClick?.name==='handleLocateMe').props.onClick();
  assert.deepEqual(writes,[]);
  assert.match(textOf(h.render(props)),code===1?/permission denied/:code===2?/unavailable/:/timeout/);
 } finally {h.cleanup();}
});

test('real geocode route retains engine metadata, nearby POIs and exact candidate coordinates', async () => {
 const originalFetch=globalThis.fetch;
 const request=(key: string)=>new NextRequest('http://localhost/api/admin/geocode',{method:'POST',body:JSON.stringify({query:'Hospital Minya El Qamh',googleApiKey:key})});
 let google=true;
 try {
  globalThis.fetch=(async (input: any)=>{
   const url=String(input);
   if(url.includes('maps.googleapis.com'))return Response.json({status:google?'OK':'ZERO_RESULTS',results:google?[
    {place_id:'street',name:'Hospital Road',formatted_address:'Minya El Qamh',types:['route'],geometry:{location:{lat:30.51,lng:31.35}}},
    {place_id:'hospital',name:'Hospital',formatted_address:'Minya El Qamh',types:['health','hospital','establishment'],geometry:{location:{lat:30.51001,lng:31.35002}}},
   ]:[]});
   if(url.includes('nominatim'))return Response.json([
    {place_id:1,lat:'30.51',lon:'31.35',name:'Hospital Road',display_name:'Hospital Road, Minya El Qamh',type:'residential',class:'highway'},
    {place_id:2,lat:'30.51001',lon:'31.35002',name:'Hospital',display_name:'Hospital, Minya El Qamh',type:'hospital',class:'amenity'},
   ]);
   if(url.includes('photon'))return Response.json({features:[{properties:{name:'Clinic',city:'Minya El Qamh',osm_id:3,osm_key:'amenity',osm_value:'clinic'},geometry:{coordinates:[31.35003,30.51002]}}]});
   if(url.includes('arcgis'))return Response.json({candidates:[{score:90,address:'School',attributes:{PlaceName:'School',City:'Minya El Qamh',Addr_type:'POI',Type:'Education'},location:{y:30.51003,x:31.35004}}]});
   throw Error('Unexpected engine '+url);
  }) as typeof fetch;
  const first=await (await POST(request('test-only'))).json();
  assert.equal(first.results[0].place_id,'google-hospital');
  assert.deepEqual(first.results[0].types,['health','hospital','establishment']);
  assert.deepEqual([first.results[0].lat,first.results[0].lon],['30.51001','31.35002']);
  google=false;
  const fallback=await (await POST(request('test-only'))).json();
  assert.equal(fallback.total,4,'nearby candidates must survive before ranking');
  assert.deepEqual(fallback.results.map((r: any)=>r.source),['osm','photon','arcgis','osm']);
  assert.equal(fallback.results[0].class,'amenity');
  assert.equal(fallback.results[1].osm_key,'amenity');
  assert.equal(fallback.results[1].osm_value,'clinic');
  assert.equal(fallback.results[2].Addr_type,'POI');
  assert.deepEqual([fallback.results[0].lat,fallback.results[0].lon],['30.51001','31.35002']);
 } finally {globalThis.fetch=originalFetch;}
});
