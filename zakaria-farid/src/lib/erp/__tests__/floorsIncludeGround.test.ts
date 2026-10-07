import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadSaveProperty } from './buildingUnitsHarness';
import type { BuildingUnitItem } from '@/lib/supabase/types';

// Register css and module.css handlers for node:test SSR/require
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };

describe('TASK fin-b9-floors-include-ground: total_floors includes ground floor', () => {
  // T1
  it('T1: Create path: total_floors 3, units_per_floor 2 saves 4 units, numbers 1A, 1B, 2A, 2B, total_units_count 4, and unit prices sum to price_egp exactly', async () => {
    let insertedPayload: any = null;
    let updatedPayload: any = null;

    const mockClient = {
      from: (table: string) => {
        if (table === 'properties') {
          return {
            insert: (payload: any) => {
              insertedPayload = payload;
              return {
                select: () => ({
                  single: async () => ({
                    data: { id: 'bld-create-1', slug: 'bld-create-1-slug' },
                    error: null,
                  }),
                }),
              };
            },
            update: (payload: any) => {
              updatedPayload = payload;
              return {
                eq: async () => ({
                  data: null,
                  error: null,
                }),
              };
            },
          };
        }
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        };
      },
    };

    const saveProperty = loadSaveProperty(mockClient);
    const res = await saveProperty(
      {
        type: 'building',
        total_floors: 3,
        units_per_floor: 2,
        area_sqm: 400,
        price_egp: 1000001,
      },
      false, // isEditing = false
      undefined,
      [],
      []
    );

    assert.equal(res?.success, true);
    assert.equal(insertedPayload?.total_units_count, 4, 'inserted total_units_count must be 4 ((3-1)*2)');
    assert.equal(updatedPayload?.total_units_count, 4, 'updated total_units_count must be 4');
    assert.ok(Array.isArray(updatedPayload?.building_units));
    assert.equal(updatedPayload.building_units.length, 4);

    const unitNumbers = updatedPayload.building_units.map((u: BuildingUnitItem) => u.unit_number);
    assert.deepEqual(unitNumbers, ['1A', '1B', '2A', '2B']);

    const unitFloors = updatedPayload.building_units.map((u: BuildingUnitItem) => u.floor);
    assert.deepEqual(unitFloors, [1, 1, 2, 2]);

    const sumPrices = updatedPayload.building_units.reduce((s: number, u: BuildingUnitItem) => s + u.price_egp, 0);
    assert.equal(sumPrices, 1000001, 'Unit prices must sum to price_egp exactly');
  });

  // T2
  it('T2: Create path: total_floors 1, units_per_floor 4 saves 4 units on floor 1', async () => {
    let insertedPayload: any = null;
    let updatedPayload: any = null;

    const mockClient = {
      from: (table: string) => {
        if (table === 'properties') {
          return {
            insert: (payload: any) => {
              insertedPayload = payload;
              return {
                select: () => ({
                  single: async () => ({
                    data: { id: 'bld-create-2', slug: 'bld-create-2-slug' },
                    error: null,
                  }),
                }),
              };
            },
            update: (payload: any) => {
              updatedPayload = payload;
              return {
                eq: async () => ({
                  data: null,
                  error: null,
                }),
              };
            },
          };
        }
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        };
      },
    };

    const saveProperty = loadSaveProperty(mockClient);
    const res = await saveProperty(
      {
        type: 'building',
        total_floors: 1,
        units_per_floor: 4,
        area_sqm: 400,
        price_egp: 1000000,
      },
      false, // isEditing = false
      undefined,
      [],
      []
    );

    assert.equal(res?.success, true);
    assert.equal(insertedPayload?.total_units_count, 4, '1 floor building keeps 1 residential floor * 4 = 4 units');
    assert.equal(updatedPayload?.total_units_count, 4);
    assert.ok(Array.isArray(updatedPayload?.building_units));
    assert.equal(updatedPayload.building_units.length, 4);

    const unitNumbers = updatedPayload.building_units.map((u: BuildingUnitItem) => u.unit_number);
    assert.deepEqual(unitNumbers, ['1A', '1B', '1C', '1D']);

    const unitFloors = updatedPayload.building_units.map((u: BuildingUnitItem) => u.floor);
    assert.deepEqual(unitFloors, [1, 1, 1, 1]);
  });

  // T3
  it('T3: Edit path: stored units 1A–2B (2 residential floors × 2) and payload total_floors 3, units_per_floor 2 is "no change": no rebuild, stored units unchanged', async () => {
    const storedUnits: BuildingUnitItem[] = [
      { unit_id: 'b-1-apt-1', unit_number: '1A', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-1-apt-2', unit_number: '1B', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-1-apt-3', unit_number: '2A', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-1-apt-4', unit_number: '2B', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250001, status: 'available' },
    ];

    let contractsQueried = false;
    let updatedPayload: any = null;

    const mockClient = {
      from: (table: string) => {
        if (table === 'properties') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'b-1',
                    type: 'building',
                    building_units: storedUnits,
                    total_units_count: 4,
                    area_sqm: 400,
                    price_egp: 1000001,
                  },
                  error: null,
                }),
              }),
            }),
            update: (payload: any) => {
              updatedPayload = payload;
              return {
                eq: async () => ({
                  data: null,
                  error: null,
                }),
              };
            },
          };
        }
        if (table === 'erp_contracts') {
          contractsQueried = true;
          return {
            select: () => ({
              eq: () => ({
                neq: async () => ({ data: [], error: null }),
              }),
            }),
          };
        }
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        };
      },
    };

    const saveProperty = loadSaveProperty(mockClient);
    const res = await saveProperty(
      {
        type: 'building',
        total_floors: 3, // 3 floors = ground + 2 residential floors = 2x2 = 4 (matches stored 2x2 = 4)
        units_per_floor: 2,
        area_sqm: 400,
        price_egp: 1000001,
      },
      true, // isEditing = true
      'b-1',
      [],
      []
    );

    assert.equal(res?.success, true);
    assert.equal(contractsQueried, false, 'erp_contracts should NOT be queried when configuration is unchanged');
    assert.deepEqual(updatedPayload?.building_units, storedUnits, 'Stored units must be preserved without rebuilding');
    assert.equal(updatedPayload?.total_units_count, 4);
  });

  // T4
  it('T4: hydrateBuildingConfig on units 1A–2B returns totalFloors 3, unitsPerFloor 2', () => {
    const adminPropertyFormMod = cjsRequire('../../../components/admin/AdminPropertyForm');
    assert.equal(typeof adminPropertyFormMod.hydrateBuildingConfig, 'function', 'hydrateBuildingConfig should be exported');

    const storedUnits: BuildingUnitItem[] = [
      { unit_id: 'b-1-apt-1', unit_number: '1A', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-1-apt-2', unit_number: '1B', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-1-apt-3', unit_number: '2A', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-1-apt-4', unit_number: '2B', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250001, status: 'available' },
    ];

    const config = adminPropertyFormMod.hydrateBuildingConfig(storedUnits);
    assert.deepEqual(config, { totalFloors: 3, unitsPerFloor: 2 });
  });
});
