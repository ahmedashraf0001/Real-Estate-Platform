import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as helpers from '../../layering/buildingBlueprint';
import type { ZoneInstance } from '../../layering/instances';
import type { BuildingUnitItem } from '../../supabase/types';
const req = createRequire(import.meta.url);
const css = req.extensions['.css'];
req.extensions['.css'] = module => { module.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }; };
const Blueprint = req('../../../components/blueprint/BuildingBlueprintPreview').default;
const Inspector = req('../../../components/property/ArchitecturalBlueprintInspector').default;
if (css) req.extensions['.css'] = css; else delete req.extensions['.css'];
const zone = (id: string, kind: string, floor?: number): ZoneInstance => ({ id, zone_template_id: kind, floor_number: floor, sort_order: 1, trades: [] });
const unit = { ...zone('2a', 'bld.unit', 2), instance_label: 'Flat 2A', unit: { unit_code: '2A' }, children: [zone('bed', 'apt.std_bed')] };
const zones = [zone('building', 'bld.building'), zone('garage', 'bld.garage_bays', 0), unit, zone('lift', 'bld.elevator', 2), { ...zone('roof', 'bld.roof_service'), level_label: 'roof' }, zone('basement', 'bld.basement', -1)];
const inventory: BuildingUnitItem[] = [{ unit_id: '2a', unit_number: '2A', floor: 2, area_sqm: 120, bedrooms: 3, bathrooms: 2, price_egp: 0, status: 'available' }];
function render(view: helpers.BlueprintView, editing = false, selectedId: string | null = null) {
 return renderToStaticMarkup(React.createElement(Blueprint, { zones, inventory, view, selectedId, isAr: false, onSelect() {}, onViewChange() {}, ...(editing ? { edit: { onChange() {} } } : {}) }));
}
test('rail summary uses inventory availability and real non-unit spaces', () => {
 assert.equal(typeof helpers.blueprintFloorSummary, 'function');
 assert.equal(helpers.blueprintFloorSummary(zones, 'Floor 2', inventory, false), '1 units · 1 available');
 assert.equal(helpers.blueprintFloorSummary(zones, 'Floor 2', [], false), '1 units');
 assert.match(helpers.blueprintFloorSummary(zones, 'bld_ground', inventory, false), /Garage/);
 assert.doesNotMatch(helpers.blueprintFloorSummary(zones, 'bld_ground', inventory, false), /units|available/);
});
test('real preview keeps descending HTML rail in every view and only ancestor breadcrumb buttons', () => {
 for (const view of [{ mode: 'elevation' }, { mode: 'floor', floorKey: 'Floor 2' }, { mode: 'unit', floorKey: 'Floor 2', unitId: '2a' }] as helpers.BlueprintView[]) {
  const html = render(view);
  const rail = html.match(/<aside[^>]*data-floor-rail[\s\S]*?<\/aside>/)?.[0];
  assert.ok(rail, 'HTML floor rail always present');
  assert.ok(rail.indexOf('Roof') < rail.indexOf('Floor 2') && rail.indexOf('Floor 2') < rail.indexOf('Ground floor') && rail.indexOf('Ground floor') < rail.indexOf('Basement'));
  const nav = html.match(/<nav[\s\S]*?<\/nav>/)![0];
  assert.equal((nav.match(/<button/g) ?? []).length, view.mode === 'elevation' ? 0 : view.mode === 'floor' ? 1 : 2);
  assert.doesNotMatch(nav, /Back to|Choose a unit/);
 }
});
test('facade replaced with counts and clickable real facilities below drawing', () => {
 const html = render({ mode: 'elevation' });
 assert.match(html, /data-blueprint-info/); assert.match(html, /Building facilities/);
 assert.match(html, /4 floors/); assert.match(html, /1 units/); assert.match(html, /1 available/);
 assert.doesNotMatch(html, /Building overview|Select an element to see/);
 assert.match(html, /data-facility-id="building"/); assert.match(html, /data-facility-id="garage"/);
 assert.match(render({ mode: 'elevation' }, false, 'building'), /Element photos/);
});
test('floor info offers only existing adjacent levels, unit facts and room details retained', () => {
 const roof = render({ mode: 'floor', floorKey: 'bld_roof' });
 assert.match(roof, /Lower floor/); assert.doesNotMatch(roof, /Upper floor/);
 const base = render({ mode: 'floor', floorKey: 'bld_basement' });
 assert.match(base, /Upper floor/); assert.doesNotMatch(base, /Lower floor/);
 const html = render({ mode: 'unit', floorKey: 'Floor 2', unitId: '2a' }, false, 'bed');
 assert.match(html, /120 m²/); assert.match(html, /3 bedrooms/); assert.match(html, /Element photos/);
});
test('real elevation has keyboard floor groups with full-width bands and no embedded floor text or markers', () => {
 const html = renderToStaticMarkup(React.createElement(Inspector, { zones, inventory, propertyType: 'building', propertyTitle: 'Recorded building', locale: 'ar' }));
 const svg = html.match(/<svg[^>]*class="cad-vector-svg fp-building-elevation"[\s\S]*?<\/svg>/)![0];
 assert.equal((svg.match(/role="button"/g) ?? []).length, 4);
 assert.equal((svg.match(/tabindex="0"/g) ?? []).length, 4);
 assert.equal((svg.match(/data-floor-hit/g) ?? []).length, 4);
 assert.doesNotMatch(svg, /<text|fp-datum-group/);
 assert.ok(html.indexOf('data-floor-rail') > html.indexOf('fp-building-elevation'));
});
test('admin retains floor controls, add slots, tile menus and drag wrappers', () => {
 const facade = render({ mode: 'elevation' }, true);
 assert.match(facade, /class="addFloors"/); assert.match(facade, /class="kebab"/);
 assert.match(facade, /data-tile-menu/);
 const floor = render({ mode: 'floor', floorKey: 'Floor 2' }, true);
 assert.match(floor, /draggable="true"/); assert.match(floor, /data-tile-menu/); assert.match(floor, /class="addSlot"[^>]*>[\s\S]*?>Unit<\/button>/);
 const room = render({ mode: 'unit', floorKey: 'Floor 2', unitId: '2a' }, true);
 assert.match(room, /draggable="true"/); assert.match(room, /class="addSlot"[^>]*>[\s\S]*?>Room<\/button>/);
 assert.doesNotMatch(floor, /<form/);
});
