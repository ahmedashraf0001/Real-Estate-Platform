import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ZoneInstance } from '../../layering/instances';
import { buildingFloorKey } from '../../layering/buildingBlueprint';
import {
  changeZoneType, createUnit, createZone, deleteFloor, duplicateFloor, duplicateZone, findZone, insertZone,
  isUnitLocked, listFloorKeys, lockedUnitsOnFloor, moveInList, nextFloorKey, nextUnitCode, removeZoneById,
  renameZone, reorderZones, ROOM_TEMPLATES, SHARED_SPACE_TEMPLATES,
} from '../../layering/blueprintEditor';

const building = (): ZoneInstance[] => {
  const unitA = createUnit('Floor 1', '1A', 1);
  const unitB = createUnit('Floor 1', '1B', 2);
  const kitchen = createZone({ templateId: 'apt.kitchen', sortOrder: 1 });
  return [
    createZone({ templateId: 'bld.entrance_lobby', floorKey: 'bld_ground', sortOrder: 1 }),
    createZone({ templateId: 'bld.staircase', floorKey: 'Floor 1', sortOrder: 3 }),
    { ...unitA, children: [kitchen] },
    unitB,
    createZone({ templateId: 'bld.roof_terrace', floorKey: 'bld_roof', sortOrder: 1 }),
  ];
};

test('floor keys come from the zones, bottom to top, including pending empty floors', () => {
  assert.deepEqual(listFloorKeys(building(), ['Floor 2']), ['bld_ground', 'Floor 1', 'Floor 2', 'bld_roof']);
});

test('new zones land on the requested floor', () => {
  const ground = createZone({ templateId: 'bld.guard_room', floorKey: 'bld_ground', sortOrder: 1 });
  const roof = createZone({ templateId: 'bld.roof_service', floorKey: 'bld_roof', sortOrder: 1 });
  const basement = createZone({ templateId: 'bld.garage_bays', floorKey: 'bld_basement', sortOrder: 1 });
  assert.equal(buildingFloorKey(ground), 'bld_ground');
  assert.equal(buildingFloorKey(roof), 'bld_roof');
  assert.equal(buildingFloorKey(basement), 'bld_basement');
  assert.ok(ground.trades.length > 0, 'template trades attached');
});

test('custom tiles keep the admin name and get generic trades', () => {
  const z = createZone({ label: 'مصلى', floorKey: 'bld_ground', sortOrder: 4 });
  assert.match(z.zone_template_id, /^custom\./);
  assert.equal(z.instance_label, 'مصلى');
  assert.ok(z.trades.length > 0);
});

test('next floor and next unit code', () => {
  const keys = listFloorKeys(building());
  assert.equal(nextFloorKey(keys, 'upper'), 'Floor 2');
  assert.equal(nextFloorKey(keys, 'ground'), null);
  assert.equal(nextFloorKey(keys, 'basement'), 'bld_basement');
  assert.equal(nextUnitCode(building(), 'Floor 1'), '1C');
  assert.equal(nextUnitCode(building(), 'bld_ground'), 'GA');
});

test('rename, change type, remove and insert work inside unit children', () => {
  let zones = building();
  const unit = zones.find(z => z.zone_template_id === 'bld.unit')!;
  const kitchen = unit.children![0];
  zones = renameZone(zones, kitchen.id, 'مطبخ مفتوح');
  assert.equal(findZone(zones, kitchen.id)!.instance_label, 'مطبخ مفتوح');
  zones = renameZone(zones, unit.id, '1Z');
  assert.equal(findZone(zones, unit.id)!.unit?.unit_code, '1Z');
  zones = changeZoneType(zones, kitchen.id, 'apt.main_bath');
  assert.equal(findZone(zones, kitchen.id)!.zone_template_id, 'apt.main_bath');
  const room = createZone({ templateId: 'apt.std_bed', sortOrder: 2 });
  zones = insertZone(zones, room, unit.id);
  assert.equal(findZone(zones, unit.id)!.children!.length, 2);
  zones = removeZoneById(zones, kitchen.id);
  assert.equal(findZone(zones, kitchen.id), undefined);
  assert.equal(findZone(zones, unit.id)!.children!.length, 1);
});

test('changing type keeps trades shared by both types', () => {
  let zones = [createZone({ templateId: 'apt.master_bed', sortOrder: 1 })];
  const trade = zones[0].trades[0];
  zones = [{ ...zones[0], trades: [{ ...trade, status: 'Finished' }, ...zones[0].trades.slice(1)] }];
  zones = changeZoneType(zones, zones[0].id, 'apt.std_bed');
  assert.equal(zones[0].trades.find(t => t.trade_template_id === trade.trade_template_id)?.status, 'Finished');
});

test('duplicate gives new ids and a fresh unit code', () => {
  const zones = building();
  const unit = zones.find(z => z.zone_template_id === 'bld.unit')!;
  const next = duplicateZone(zones, unit.id);
  const units = next.filter(z => z.zone_template_id === 'bld.unit');
  assert.equal(units.length, 3);
  const copy = units.find(u => u.id !== unit.id && u.unit?.unit_code === '1C');
  assert.ok(copy, 'copy coded 1C');
  assert.notEqual(copy!.children![0].id, unit.children![0].id);
});

test('reorder sets sort order from position', () => {
  const zones = building();
  const ids = zones.slice(0, 2).map(z => z.id);
  const reordered = reorderZones(zones, moveInList(ids, ids[1], -1));
  assert.ok(reordered.find(z => z.id === ids[1])!.sort_order < reordered.find(z => z.id === ids[0])!.sort_order);
  assert.deepEqual(moveInList(ids, ids[0], -1), ids, 'moving past the start is a no-op');
});

test('duplicate floor copies units with target-floor codes; delete floor removes only that floor', () => {
  const zones = duplicateFloor(building(), 'Floor 1', 'Floor 2');
  const floor2 = zones.filter(z => buildingFloorKey(z) === 'Floor 2');
  assert.equal(floor2.length, 3);
  assert.deepEqual(floor2.filter(z => z.zone_template_id === 'bld.unit').map(z => z.unit?.unit_code).sort(), ['2A', '2B']);
  const after = deleteFloor(zones, 'Floor 2');
  assert.equal(after.length, building().length);
});

test('reserved or sold units are locked; available and unknown are not', () => {
  const zones = building();
  const inventory = [
    { unit_id: 'x1', unit_number: '1A', floor: 1, area_sqm: 100, bedrooms: 2, bathrooms: 1, price_egp: 1, status: 'reserved' as const },
    { unit_id: 'x2', unit_number: '1B', floor: 1, area_sqm: 100, bedrooms: 2, bathrooms: 1, price_egp: 1, status: 'available' as const },
  ];
  const [a, b] = zones.filter(z => z.zone_template_id === 'bld.unit');
  assert.equal(isUnitLocked(a, inventory), true);
  assert.equal(isUnitLocked(b, inventory), false);
  assert.equal(isUnitLocked(a, []), false);
  assert.equal(lockedUnitsOnFloor(zones, 'Floor 1', inventory).length, 1);
});

test('pickers offer real tile types only, never floor-group templates', () => {
  assert.ok(SHARED_SPACE_TEMPLATES.every(t => !['bld.unit', 'bld.roof', 'bld.ground_lobby', 'bld.building'].includes(t.id)));
  assert.ok(SHARED_SPACE_TEMPLATES.some(t => t.id === 'bld.staircase'));
  assert.ok(ROOM_TEMPLATES.every(t => t.id.startsWith('apt.') && t.id !== 'apt.level'));
});

test('unit rooms are arranged like an apartment and sized by area', async () => {
  const { arrangeUnitRooms, roomWeight } = await import('../../layering/blueprintEditor');
  const ids = ['apt.reception', 'apt.master_bed', 'apt.kitchen', 'apt.balcony', 'apt.main_bath', 'apt.std_bed'];
  const rooms = ids.map((id, i) => createZone({ templateId: id, sortOrder: i + 1 }));
  const plan = arrangeUnitRooms(rooms);
  assert.deepEqual(plan.front.map(z => z.zone_template_id), ['apt.balcony']);
  assert.deepEqual(plan.social.map(z => z.zone_template_id), ['apt.reception', 'apt.kitchen']);
  assert.deepEqual(plan.private.map(z => z.zone_template_id), ['apt.master_bed', 'apt.main_bath', 'apt.std_bed']);
  const measured = { ...rooms[0], spatial: { length_m: 6, width_m: 5, sqm: 30 } } as ZoneInstance;
  assert.equal(roomWeight(measured), 30);
  assert.ok(roomWeight(rooms[0]) > roomWeight(rooms[4]), 'reception outweighs a bathroom by default');
  const onlyBeds = arrangeUnitRooms([rooms[1], rooms[5]]);
  assert.equal(onlyBeds.social.length + onlyBeds.private.length, 2);
  assert.ok(onlyBeds.social.length > 0 && onlyBeds.private.length > 0, 'both columns used');
});
