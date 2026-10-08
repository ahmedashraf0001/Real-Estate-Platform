import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBlueprintView, serializeBlueprintView, blueprintElementDetail } from '../../layering/publicBlueprint';
import type { ZoneInstance } from '../../layering/instances';

test('URL building/floor/unit states round-trip; malformed state falls back to building', () => {
  for (const view of [{ mode: 'elevation' }, { mode: 'floor', floorKey: 'Floor 2' }, { mode: 'unit', floorKey: 'Floor 2', unitId: 'unit-2A/مسجل' }] as const) {
    assert.deepEqual(parseBlueprintView(serializeBlueprintView(view)), view);
  }
  for (const value of [null, '', 'floor', 'floor/%ZZ', 'floor/Floor%202/unit/', 'building/extra']) assert.deepEqual(parseBlueprintView(value), { mode: 'elevation' });
});

test('Gouna elevator detail scopes inf.elevator and hides empty capacity, placeholder and zero fields', () => {
  // Read-only Gouna SELECT, 2026-10-08: actual floor-2 elevator has no recorded attributes.
  const recorded: ZoneInstance = { id: 'nonvfl7pmuvmw88l', trades: [{ id: 'ldmk3d95muvmw88m', status: 'Shaft', attributes: [], trade_template_id: 'inf.elevator' }], sort_order: 17, level_label: 'Floor 2', instance_label: 'Floor 2 Elevator', zone_template_id: 'bld.elevator' };
  assert.deepEqual(blueprintElementDetail(recorded, true).trades.map(t => t.trade_template_id), ['inf.elevator']);
  assert.deepEqual(blueprintElementDetail(recorded, true).facts, [], 'unrecorded capacity hidden on real Gouna fixture');
  const lift: ZoneInstance = { id: 'gouna-lift-floor-2', zone_template_id: 'bld.elevator', floor_number: 2, sort_order: 1, trades: [
    { id: 'lift', trade_template_id: 'inf.elevator', status: 'Shaft', attributes: [
      { attribute_template_id: 'inf.elev.capacity', value: null },
      { attribute_template_id: 'inf.elev.persons', value: 0 },
      { attribute_template_id: 'inf.elev.brand', value: '[...]' },
      { attribute_template_id: 'inf.elev.stops', value: 7 },
    ] },
    { id: 'drain', trade_template_id: 'inf.drainage', status: 'Applied', attributes: [] },
  ] };
  const detail = blueprintElementDetail(lift, true);
  assert.deepEqual(detail.trades.map(t => t.trade_template_id), ['inf.elevator']);
  assert.deepEqual(detail.facts, [['عدد الوقفات', '7']]);
  assert.equal(lift.trades.length, 2, 'view model cannot mutate source');
});

test('filled bilingual attributes display only requested language', () => {
  const stairs: ZoneInstance = { id: 'stairs', zone_template_id: 'bld.staircase', sort_order: 1, trades: [{ id: 'finish', trade_template_id: 'inf.common_finish', status: 'Finished', attributes: [{ attribute_template_id: 'inf.stair.material', value: 'Marble (رخام)' }] }] };
  assert.equal(blueprintElementDetail(stairs, true).facts[0][1], 'رخام');
  assert.equal(blueprintElementDetail(stairs, false).facts[0][1], 'Marble');
});
