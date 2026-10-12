import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as helpers from '../../layering/buildingBlueprint';
import type { ZoneInstance } from '../../layering/instances';
const req = createRequire(import.meta.url);
const css = req.extensions['.css'];
req.extensions['.css'] = module => { module.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }; };
const Blueprint = req('../../../components/blueprint/BuildingBlueprintPreview').default;
if (css) req.extensions['.css'] = css; else delete req.extensions['.css'];
const zone = (id: string, floor: number): ZoneInstance => ({ id, zone_template_id: 'bld.staircase', floor_number: floor, sort_order: 1, trades: [] });
const zones = [zone('stairs0', 0), zone('stairs1', 1), zone('stairs2', 2)];
function render(editing = false) {
 return renderToStaticMarkup(React.createElement(Blueprint, { zones, view: { mode: 'floor', floorKey: 'Floor 1' }, selectedId: 'stairs1', isAr: false, onSelect() {}, onViewChange() {}, ...(editing ? { edit: { onChange() {} } } : {}) }));
}
test('facility grouping retains first real zone and counts distinct floors by displayed name', () => {
 const groups = helpers.groupBlueprintFacilities([...zones, zone('sameFloor', 1)], false);
 assert.equal(groups.length, 1);
 assert.equal(groups[0].zone.id, 'stairs0');
 assert.equal(groups[0].count, 3);
});
test('selected detail is a sibling after drawing before rail, absent from info strip, and retains empty states', () => {
 const html = render();
 const panel = html.indexOf('data-blueprint-detail');
 assert.ok(panel > html.indexOf('data-blueprint-drawing') && panel < html.indexOf('data-floor-rail'));
 assert.match(html.slice(0, panel), /<\/div><\/div><aside[^>]*$/);
 assert.equal((html.match(/data-blueprint-detail/g) ?? []).length, 1);
 assert.doesNotMatch(html.slice(html.indexOf('data-blueprint-info')), /Element photos|Execution status for this element/);
 assert.match(html, /No photos added yet/);
 assert.match(html, /No trades recorded for this element/);
 assert.match(html, /data-detail-close/);
 assert.match(html, /Floor 1/);
});
test('admin selection renders real edit controls inside detail while retaining add and drag controls', () => {
 const html = render(true);
 const panel = html.slice(html.indexOf('data-blueprint-detail'), html.indexOf('data-floor-rail'));
 assert.match(panel, /aria-label="Name"/);
 assert.match(panel, /aria-label="Type"/);
 assert.match(panel, />Delete<\/button>/);
 assert.match(html, /draggable="true"/);
 assert.match(html, /class="addSlot"/);
 assert.doesNotMatch(html, /<form/);
});
test('facility strip groups actual repeated floor facilities into one counted tag', () => {
 const html = renderToStaticMarkup(React.createElement(Blueprint, { zones, view: { mode: 'elevation' }, selectedId: null, isAr: false, onSelect() {}, onViewChange() {} }));
 assert.equal((html.match(/data-facility-id=/g) ?? []).length, 1);
 assert.match(html, /data-facility-id="stairs0"/);
 assert.match(html, /×3/);
});
test('admin uses existing ZoneInspector inside drawing without duplicate public detail content', () => {
 const html = renderToStaticMarkup(React.createElement(Blueprint, {
  zones, view: { mode: 'floor', floorKey: 'Floor 1' }, selectedId: 'stairs1', isAr: false,
  onSelect() {}, onViewChange() {}, edit: {
   onChange() {},
  },
 }));
 const panel = html.slice(html.indexOf('data-blueprint-detail'), html.indexOf('data-floor-rail'));
 assert.match(panel, /zi-root/);
 assert.match(panel, /zi-title/);
 assert.match(panel, /Building Staircase/);
 assert.doesNotMatch(panel, /Execution status for this element/);
 assert.doesNotMatch(html, /<form/);
});
