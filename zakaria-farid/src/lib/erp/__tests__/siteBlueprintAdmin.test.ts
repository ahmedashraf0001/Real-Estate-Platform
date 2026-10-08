import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { repairBuildingTradeScopes, selectBuildingFloor, resolveBlueprintUnit, patchBlueprintZone } from '../../layering/buildingBlueprint';
import { blueprintLabel, zoneLabel } from '../../layering/labels';
import { BLUEPRINT_ICONS } from '../../layering/blueprintIcons';
import { ZONE_TEMPLATES, TRADE_TEMPLATES, getTradesForZone } from '../../layering/templates';
import { buildZoneInstances, type ZoneInstance } from '../../layering/instances';

const zone = (id: string, kind: string, floor: number): ZoneInstance => ({ id, zone_template_id: kind, floor_number: floor, level_label: `Floor ${floor}`, sort_order: 1, trades: [] });

test('trade repair moves unrelated infrastructure off the elevator without losing statuses or attributes; idempotent', () => {
  const ids = ['inf.ramp_access', 'inf.parking', 'inf.drainage', 'inf.lobby', 'inf.security', 'inf.elevator', 'inf.common_finish', 'inf.insulation'];
  const elevator = { ...zone('elevator', 'bld.elevator', 2), trades: ids.map((id, i) => ({ id: `trade-${i}`, trade_template_id: id, status: 'InProgress', attributes: [{ attribute_template_id: `${id}.note`, value: 'recorded' }] })) };
  const input = [elevator];
  const result = repairBuildingTradeScopes(input);
  assert.equal(input[0].trades.length, 8, 'dry run cannot mutate input');
  assert.deepEqual(result.zones.find(z => z.id === 'elevator')!.trades.map(t => t.trade_template_id), ['inf.elevator']);
  assert.deepEqual(result.zones.find(z => z.zone_template_id === 'bld.building')!.trades, elevator.trades.filter(t => t.trade_template_id !== 'inf.elevator'));
  assert.equal(result.moved, 7);
  const second = repairBuildingTradeScopes(result.zones);
  assert.equal(second.moved, 0);
  assert.deepEqual(second.zones, result.zones);
});

test('every building element uses its own trade map, elevator only gets elevator', () => {
  assert.deepEqual(getTradesForZone(ZONE_TEMPLATES.find(z => z.id === 'bld.elevator')!).map(t => t.id), ['inf.elevator']);
  assert.deepEqual(getTradesForZone(ZONE_TEMPLATES.find(z => z.id === 'bld.staircase')!).map(t => t.id), ['inf.common_finish']);
  for (const z of ZONE_TEMPLATES.filter(z => z.property_type_id === 'building')) assert.ok(getTradesForZone(z).length < TRADE_TEMPLATES.filter(t => t.categories.includes('infrastructure')).length || z.id === 'bld.building', z.id);
});

test('all statuses in templates and instance presets have Arabic and English labels; unknown is neutral', () => {
  const source = readFileSync(new URL('../../layering/instances.ts', import.meta.url), 'utf8');
  const statuses = new Set([...TRADE_TEMPLATES.flatMap(t => t.status_values), ...[...source.matchAll(/'[^']+':\s*'([A-Z][A-Za-z]+)'/g)].map(m => m[1])]);
  for (const status of statuses) {
    const ar = blueprintLabel('status', status, true);
    assert.match(ar, /[\u0600-\u06ff]/, status);
    assert.doesNotMatch(ar, /[A-Za-z]/, status);
    assert.notEqual(ar, 'غير محدد', status);
    assert.doesNotMatch(blueprintLabel('status', status, false), /[\u0600-\u06ff]/);
  }
  assert.equal(blueprintLabel('status', 'FutureEnum', true), 'غير محدد');
  assert.equal(zoneLabel({ ...zone('u', 'bld.unit', 2), instance_label: 'Flat 2A' }, true), 'شقة 2A');
});

test('floor selector isolates canonical floor 2 units and core, includes core-only floors, never inherits other units', () => {
  const first = zone('1A', 'bld.unit', 1);
  const second = { ...zone('2A', 'bld.unit', 2), level_label: 'wrong legacy label', children: [zone('bed', 'apt.std_bed', 2)] };
  const elevator = zone('lift', 'bld.elevator', 2);
  const result = selectBuildingFloor([first, second, elevator, zone('roof', 'bld.roof', 3)], 'Floor 2');
  assert.deepEqual(result.units.map(z => z.id), ['2A']);
  assert.deepEqual(result.core.map(z => z.id), ['lift']);
  assert.deepEqual(selectBuildingFloor([first, second], 'Floor 9').units, []);
  assert.deepEqual(selectBuildingFloor([zone('ground', 'bld.elevator', 0)], 'bld_ground').core.map(z => z.id), ['ground']);
});

test('every preset zone kind has a shared lucide icon', () => {
  const walk = (list: ZoneInstance[]) => list.forEach(z => { assert.ok(BLUEPRINT_ICONS[z.zone_template_id], z.zone_template_id); walk(z.children ?? []); });
  walk(buildZoneInstances('building', 'semi_finished', 3, { totalFloors: 4, unitsPerFloor: 2 }));
  for (const z of ZONE_TEMPLATES) assert.ok(BLUEPRINT_ICONS[z.id], z.id);
});

test('new building elevators derive default stops from the generated floor count', () => {
  const zones = buildZoneInstances('building', 'semi_finished', 3, { totalFloors: 4, unitsPerFloor: 2 });
  const lifts = zones.filter(z => z.zone_template_id === 'bld.elevator');
  assert.ok(lifts.length > 0);
  for (const lift of lifts) assert.equal(lift.trades.find(t => t.trade_template_id === 'inf.elevator')!.attributes.find(a => a.attribute_template_id === 'inf.elev.stops')?.value, 5);
});

test('unit facts and sale status use ERP inventory, match code and floor, unknown stays unknown', () => {
  const u = { ...zone('cad-2a', 'bld.unit', 2), instance_label: 'Flat 2A' };
  const inventory = [{ unit_id: 'inventory-2a', unit_number: 'شقة 2A', floor: 2, area_sqm: 125, bedrooms: 3, bathrooms: 2, price_egp: 0, status: 'contracted' as const }];
  const result = resolveBlueprintUnit(u, inventory);
  assert.equal(result.status, 'sold');
  assert.equal(result.area_sqm, 125);
  assert.equal(result.floor_number, 2);
  assert.equal(resolveBlueprintUnit({ ...u, floor_number: 1 }, inventory).status, undefined);
  assert.equal(resolveBlueprintUnit(u, []).status, undefined);
});

test('nested room patch preserves floor and siblings and snaps metre edits', () => {
  const rooms = [zone('bed', 'apt.std_bed', 2), zone('bath', 'apt.main_bath', 2)];
  const input = [{ ...zone('u', 'bld.unit', 2), children: rooms }];
  const next = patchBlueprintZone(input, 'bed', { spatial: { gridX: 0, gridY: 0, gridW: 1, gridH: 1, pos_x_m: 1.23, pos_y_m: 2.38, width_m: 4.04, length_m: 3.96 } }, 0.1);
  assert.equal(next[0].children![0].spatial!.pos_x_m, 1.2);
  assert.equal(next[0].children![0].spatial!.pos_y_m, 2.4);
  assert.equal(next[0].children![0].spatial!.width_m, 4);
  assert.equal(next[0].floor_number, 2);
  assert.equal(next[0].children![1], rooms[1]);
  assert.equal(input[0].children![0].spatial, undefined);
});
