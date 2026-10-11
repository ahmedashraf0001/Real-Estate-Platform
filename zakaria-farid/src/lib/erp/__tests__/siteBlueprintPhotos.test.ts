import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ZoneInstance } from '../../layering/instances';
import type { BlueprintView } from '../../layering/buildingBlueprint';

// CSS class tokens are stubbed for Node rendering; production component and hooks remain real.
const runtimeRequire = createRequire(import.meta.url);
const previousCssLoader = runtimeRequire.extensions['.css'];
runtimeRequire.extensions['.css'] = module => {
  module.exports = { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
};
const Blueprint = runtimeRequire('../../../components/blueprint/BuildingBlueprintPreview').default as typeof import('../../../components/blueprint/BuildingBlueprintPreview').default;
if (previousCssLoader) runtimeRequire.extensions['.css'] = previousCssLoader;
else delete runtimeRequire.extensions['.css'];

const zone = (id: string, kind: string, images?: string[]): ZoneInstance => ({ id, zone_template_id: kind, sort_order: 1, trades: [], floor_number: 2, level_label: 'Floor 2', images });
const unit: ZoneInstance = { ...zone('unit', 'bld.unit', ['/unit-first.jpg', '/unit-second.jpg']), unit: { unit_code: '2A' }, children: [zone('bedroom', 'apt.master_bed', ['/room-first.jpg', '/room-second.jpg'])] };
const shared = zone('stairs', 'bld.staircase', ['/shared-first.jpg', '/shared-second.jpg']);
function render(zones: ZoneInstance[], view: BlueprintView, editing = false) {
  return renderToStaticMarkup(React.createElement(Blueprint, { zones, view, isAr: false, selectedId: null, onSelect: () => {}, onViewChange: () => {}, ...(editing ? { edit: { onChange: () => {} } } : {}) }));
}
function tile(html: string, className: string) {
  const buttons = [...html.matchAll(/<button\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g)];
  const result = buttons.find(match => match[1].split(' ').includes(className));
  assert.ok(result, `${className} tile rendered`);
  return { classes: result[1], content: result[2] };
}
function photo(result: ReturnType<typeof tile>, source: string, rejected: string) {
  assert.match(result.classes, /tileWithPhoto/);
  assert.ok(result.content.includes(`src="${source}"`));
  assert.ok(!result.content.includes(rejected));
  assert.match(result.content, /class="tilePhotoCover"/);
  assert.match(result.content, /class="tilePhotoScrim"/);
  assert.match(result.content, /class="tilePhotoContent"/);
  assert.match(result.content, /<strong>/);
}

test('real public blueprint uses first zone photo and scrim for unit/shared/room tiles', () => {
  const floor = render([unit, shared], { mode: 'floor', floorKey: 'Floor 2' });
  const unitTile = tile(floor, 'unit');
  photo(unitTile, '/unit-first.jpg', '/unit-second.jpg');
  assert.doesNotMatch(unitTile.content, /lucide-house/);
  const sharedTile = tile(floor, 'element');
  photo(sharedTile, '/shared-first.jpg', '/shared-second.jpg');
  assert.doesNotMatch(sharedTile.content, /<svg/);
  const roomTile = tile(render([unit], { mode: 'unit', floorKey: 'Floor 2', unitId: 'unit' }), 'room');
  photo(roomTile, '/room-first.jpg', '/room-second.jpg');
  assert.doesNotMatch(roomTile.content, /<svg/);
});

test('real blueprint falls back to icons for unit/shared/room zones without photos', () => {
  const emptyUnit = { ...unit, images: [], children: [{ ...unit.children![0], images: [] }] };
  const floor = render([emptyUnit, { ...shared, images: [] }], { mode: 'floor', floorKey: 'Floor 2' });
  for (const result of [tile(floor, 'unit'), tile(floor, 'element'), tile(render([emptyUnit], { mode: 'unit', floorKey: 'Floor 2', unitId: 'unit' }), 'room')]) {
    assert.doesNotMatch(result.classes, /tileWithPhoto/);
    assert.match(result.content, /<svg/);
    assert.doesNotMatch(result.content, /tilePhotoCover/);
  }
});

test('real admin blueprint photo tiles retain edit actions and drag wrappers', () => {
  const html = render([unit, shared], { mode: 'floor', floorKey: 'Floor 2' }, true);
  photo(tile(html, 'unit'), '/unit-first.jpg', '/unit-second.jpg');
  photo(tile(html, 'element'), '/shared-first.jpg', '/shared-second.jpg');
  assert.match(html, /draggable="true"/);
  assert.match(html, /class="tileActions"/);
  for (const label of ['Rename', 'Change type', 'Duplicate', 'Move earlier', 'Move later', 'Delete']) assert.ok(html.includes(`aria-label="${label}"`), `${label} remains reachable`);
  const roomHtml = render([unit], { mode: 'unit', floorKey: 'Floor 2', unitId: 'unit' }, true);
  photo(tile(roomHtml, 'room'), '/room-first.jpg', '/room-second.jpg');
  assert.match(roomHtml, /class="tileActions"/);
});

test('real facade retains public HTML rail and compact admin floor controls', () => {
  const publicHtml = render([unit, shared], { mode: 'elevation' });
  assert.match(publicHtml, /<aside class="floors/);
  assert.match(publicHtml, /data-blueprint-info/);
  const adminHtml = render([unit, shared], { mode: 'elevation' }, true);
  assert.match(adminHtml, /floorsAdminCompact/);
  assert.match(adminHtml, /class="addFloors"/);
  assert.match(adminHtml, /class="kebab"/);
});
