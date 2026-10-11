import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { shouldRenderThumbnailStrip, formatThumbnailCounter } from '@/lib/utils/specGrid';
const { contrast, assertFilledRows } = require('../../../../scripts/lib/site-visual-assertions.cjs');

test('light gold: canonical CSS text token meets AA on all light surfaces', () => {
  const css = fs.readFileSync(path.resolve('src/app/globals.css'), 'utf8');
  const token = css.match(/--gold-text-light:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(token, 'canonical CSS token exists');
  assert.match(css, /--gold-text:\s*var\(--gold-text-light\)/, 'light text resolves canonical CSS token');
  for (const bg of ['#FFFFFF','#F7F4EE','#FCFAF7']) assert.ok(contrast(token,bg)>=4.5, `${token} on ${bg}`);
  assert.ok(contrast('#B8860B','#FFFFFF')<4.5, 'capture must reject old washed-out gold');
});
test('capture row assertion rejects an empty last slot and overlapping cards', () => {
  const cards=[{top:0,left:0,right:45,width:45},{top:0,left:55,right:100,width:45},{top:50,left:0,right:100,width:100}];
  assert.equal(assertFilledRows({left:0,right:100,gap:10,cards},3),2);
  assert.throws(()=>assertFilledRows({left:0,right:100,gap:10,cards:[...cards.slice(0,2),{...cards[2],right:45,width:45}]},3), /end at grid edge/);
  assert.throws(()=>assertFilledRows({left:0,right:100,gap:10,cards:[cards[0],{...cards[1],left:40}]},2), /configured gaps/);
});
test('thumbnailStrip: one image hides bar unless video exists; zero media hides bar', () => {
  assert.equal(shouldRenderThumbnailStrip(0,0),false);
  assert.equal(shouldRenderThumbnailStrip(1,0),false);
  assert.equal(shouldRenderThumbnailStrip(1,1),true);
  assert.equal(shouldRenderThumbnailStrip(2,0),true);
  assert.equal(shouldRenderThumbnailStrip(14,1),true);
});
test('thumbnailStrip: Arabic and English counters reflect position and total', () => {
  assert.equal(formatThumbnailCounter(2,15,'ar'),'\u0662 / \u0661\u0665');
  assert.equal(formatThumbnailCounter(2,15,'en'),'2 / 15');
});
