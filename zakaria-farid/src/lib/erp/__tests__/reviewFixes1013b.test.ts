import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import Player from '../../../components/video/LuxuryAmbientVideoPlayer';

test('compact video renders one play target, poster and title below, without ambient/volume/skip controls', () => {
  const html = renderToStaticMarkup(React.createElement(Player, { video: {id:'test-video',url:'/tour.mp4',title_en:'Tour',thumbnail:'/poster.jpg'}, compact:true, onOpen:()=>{} } as React.ComponentProps<typeof Player>));
  assert.match(html, /data-compact-video/);
  assert.match(html, /src="\/poster.jpg"/);
  assert.equal((html.match(/<button/g)||[]).length,1);
  assert.doesNotMatch(html, /type="range"|Ambient|ambient-chip|volume-slider|RotateCw|RotateCcw/);
  assert.match(html, /data-compact-title[^>]*>Tour/);
});
test('saved drawer theme overrides retain opaque site surface', () => {
 const source=readFileSync('src/components/property/SavedPortfolioDrawer.tsx','utf8');
 const rules=[...source.matchAll(/(?:\[data-theme="(?:dark|light)"\] )?\.saved-portfolio-drawer \{([^}]+)\}/g)].filter(rule=>rule[1].includes('background:'));
 assert.equal(rules.length,3);
 for(const rule of rules) assert.match(rule[1],/background: var\(--bg-surface\)/);
});
test('shared public light glass has translucent fill and white inner border', () => {
 const css=readFileSync('src/app/globals.css','utf8');
 const light=css.match(/\[data-theme="light"\] \{([\s\S]*?)\n\}/)![1];
 assert.match(light,/--glass-card-strong: linear-gradient\(180deg, rgba\(255, 255, 255, 0\.42\), rgba\(255, 255, 255, 0\.52\)\)/);
 assert.match(light,/--glass-border: 1px solid rgba\(255, 255, 255, 0\.70\)/);
 const gold=css.match(/--gold-text-light: #([0-9A-F]{6})/)![1];
 const luminance=(hex:string)=>hex.match(/../g)!.map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
 assert.ok((luminance('FCFAF7')+.05)/(luminance(gold)+.05)>=4.5);
});
