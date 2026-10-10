import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeGroundFloor } from '../../layering/blueprintEditor';
import type { ZoneInstance } from '../../layering/instances';

const makeZone = (id: string, templateId: string, sortOrder = 1): ZoneInstance => ({
  id,
  zone_template_id: templateId,
  sort_order: sortOrder,
  trades: [],
});

test('arrangeGroundFloor with all types partitions into gate, front, core, large, services', () => {
  const gate = makeZone('z-gate', 'bld.entrance_gate', 1);
  const lobby = makeZone('z-lobby', 'bld.entrance_lobby', 2);
  const stairs = makeZone('z-stairs', 'bld.staircase', 3);
  const lift = makeZone('z-lift', 'bld.elevator', 4);
  const garage = makeZone('z-garage', 'bld.garage_bays', 5);
  const elec = makeZone('z-elec', 'bld.electric_box', 6);
  const guard = makeZone('z-guard', 'bld.guard_room', 7);

  const zones = [gate, lobby, stairs, lift, garage, elec, guard];
  const arranged = arrangeGroundFloor(zones);

  assert.deepEqual(arranged.gate.map(z => z.id), ['z-gate']);
  assert.deepEqual(arranged.front.map(z => z.id), ['z-lobby']);
  assert.deepEqual(arranged.core.map(z => z.id), ['z-stairs', 'z-lift']);
  assert.deepEqual(arranged.large.map(z => z.id), ['z-garage']);
  assert.deepEqual(arranged.services.map(z => z.id), ['z-elec', 'z-guard']);
});

test('arrangeGroundFloor collapses missing types cleanly into empty arrays', () => {
  const stairs = makeZone('z-stairs', 'bld.staircase', 1);
  const elec = makeZone('z-elec', 'bld.electric_box', 2);

  const arranged = arrangeGroundFloor([stairs, elec]);

  assert.deepEqual(arranged.gate, []);
  assert.deepEqual(arranged.front, []);
  assert.deepEqual(arranged.core.map(z => z.id), ['z-stairs']);
  assert.deepEqual(arranged.large, []);
  assert.deepEqual(arranged.services.map(z => z.id), ['z-elec']);
});

test('arrangeGroundFloor routes custom and unknown types to services', () => {
  const customPrayer = makeZone('z-prayer', 'custom.prayer_room', 1);
  const unknownWorkshop = makeZone('z-workshop', 'workshop_unknown', 2);
  const lobby = makeZone('z-lobby', 'bld.entrance_lobby', 3);

  const arranged = arrangeGroundFloor([customPrayer, unknownWorkshop, lobby]);

  assert.deepEqual(arranged.gate, []);
  assert.deepEqual(arranged.front.map(z => z.id), ['z-lobby']);
  assert.deepEqual(arranged.core, []);
  assert.deepEqual(arranged.large, []);
  assert.deepEqual(arranged.services.map(z => z.id), ['z-prayer', 'z-workshop']);
});
