import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBuildingUnits, computeProjectStatusMetrics } from '../projectStatusHelper';
import { getAvailableUnitsForProperty } from '../propertiesPortfolioCalculations';
import { loadSaveProperty } from './buildingUnitsHarness';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract } from '../types';

describe('fin-b2b-audit-fixes: A1 contract guard, A2 legacy availability, A3 piastre remainder', () => {
  // A1: The contract guard can be bypassed
  it('A1: edit with type omitted on a building with live contract and different product is rejected', async () => {
    const storedUnits: BuildingUnitItem[] = [
      { unit_id: 'b-1-apt-1', unit_number: '1A', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'contracted' },
      { unit_id: 'b-1-apt-2', unit_number: '1B', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-1-apt-3', unit_number: '2A', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-1-apt-4', unit_number: '2B', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250001, status: 'available' },
    ];

    let updateCalled = false;
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
            update: () => {
              updateCalled = true;
              return {
                eq: async () => ({ data: null, error: null }),
              };
            },
          };
        }
        if (table === 'erp_contracts') {
          return {
            select: () => ({
              eq: () => ({
                neq: async () => ({
                    data: [{ contract_id: 'c-live-1', building_unit_id: 'b-1-apt-1', status: 'Active' }],
                    error: null,
                  }),
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
        // Notice: `type` is completely omitted in client payload!
        total_floors: 3,
        units_per_floor: 2, // 3x2 = 6, changed from stored 2x2 = 4
        area_sqm: 600,
        price_egp: 1000001,
      },
      true, // isEditing
      'b-1',
      [],
      []
    );

    assert.equal(res?.success, false);
    assert.equal(updateCalled, false, 'Database update must not be called when product changes under live contract');
    assert.ok(res?.error?.includes('عقود جارية') || res?.error?.includes('contract'));
  });

  it('A4: a live legacy contract with no building_unit_id also blocks a unit rebuild', async () => {
    const storedUnits: BuildingUnitItem[] = [
      { unit_id: 'b-1-apt-1', unit_number: '1A', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'contracted' },
      { unit_id: 'b-1-apt-2', unit_number: '1B', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-1-apt-3', unit_number: '2A', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-1-apt-4', unit_number: '2B', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250001, status: 'available' },
    ];

    let updateCalled = false;
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
            update: () => {
              updateCalled = true;
              return {
                eq: async () => ({ data: null, error: null }),
              };
            },
          };
        }
        if (table === 'erp_contracts') {
          return {
            select: () => ({
              eq: () => ({
                neq: async () => ({
                    data: [{ contract_id: 'c-live-1', building_unit_id: null, building_unit_number: 'شقة 1A - الدور 1', status: 'Active' }],
                    error: null,
                  }),
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
        // Notice: `type` is completely omitted in client payload!
        total_floors: 3,
        units_per_floor: 2, // 3x2 = 6, changed from stored 2x2 = 4
        area_sqm: 600,
        price_egp: 1000001,
      },
      true, // isEditing
      'b-1',
      [],
      []
    );

    assert.equal(res?.success, false);
    assert.equal(updateCalled, false, 'Database update must not be called when product changes under live contract');
    assert.ok(res?.error?.includes('عقود جارية') || res?.error?.includes('contract'));
  });

  it('A1: a payload carrying building_units is ignored and stored units are unchanged', async () => {
    const storedUnits: BuildingUnitItem[] = [
      { unit_id: 'b-2-apt-1', unit_number: '1A', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-2-apt-2', unit_number: '1B', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-2-apt-3', unit_number: '2A', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
      { unit_id: 'b-2-apt-4', unit_number: '2B', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250001, status: 'available' },
    ];

    let updatedPayload: any = null;
    const mockClient = {
      from: (table: string) => {
        if (table === 'properties') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'b-2',
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
                eq: async () => ({ data: null, error: null }),
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
        total_floors: 2,
        units_per_floor: 2,
        // Injected malicious/client-supplied units
        building_units: [
          { unit_id: 'injected-unit', unit_number: '99Z', floor: 99, area_sqm: 10, bedrooms: 1, bathrooms: 1, price_egp: 1, status: 'available' },
        ],
        total_units_count: 99,
      },
      true,
      'b-2',
      [],
      []
    );

    assert.equal(res?.success, true);
    assert.deepEqual(updatedPayload?.building_units, storedUnits, 'Client-supplied building_units must be ignored');
    assert.equal(updatedPayload?.total_units_count, 4, 'Client-supplied total_units_count must be ignored');
  });

  it('A1: type change to apartment with a live unit contract is rejected', async () => {
    const storedUnits: BuildingUnitItem[] = [
      { unit_id: 'b-3-apt-1', unit_number: '1A', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'contracted' },
      { unit_id: 'b-3-apt-2', unit_number: '1B', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
    ];

    let updateCalled = false;
    const mockClient = {
      from: (table: string) => {
        if (table === 'properties') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'b-3',
                    type: 'building',
                    building_units: storedUnits,
                    total_units_count: 2,
                    area_sqm: 200,
                    price_egp: 500000,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => {
              updateCalled = true;
              return {
                eq: async () => ({ data: null, error: null }),
              };
            },
          };
        }
        if (table === 'erp_contracts') {
          return {
            select: () => ({
              eq: () => ({
                neq: async () => ({
                    data: [{ contract_id: 'c-live-3', building_unit_id: 'b-3-apt-1', status: 'Active' }],
                    error: null,
                  }),
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
        type: 'apartment', // Attempt to change type away from 'building'
      },
      true,
      'b-3',
      [],
      []
    );

    assert.equal(res?.success, false);
    assert.equal(updateCalled, false, 'Database update must not be called when changing building type with live contracts');
    assert.ok(res?.error?.includes('عقود جارية') || res?.error?.includes('contract'));
  });

  it('A4: a live legacy contract with no building_unit_id also blocks a type change', async () => {
    const storedUnits: BuildingUnitItem[] = [
      { unit_id: 'b-3-apt-1', unit_number: '1A', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'contracted' },
      { unit_id: 'b-3-apt-2', unit_number: '1B', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' },
    ];

    let updateCalled = false;
    const mockClient = {
      from: (table: string) => {
        if (table === 'properties') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'b-3',
                    type: 'building',
                    building_units: storedUnits,
                    total_units_count: 2,
                    area_sqm: 200,
                    price_egp: 500000,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => {
              updateCalled = true;
              return {
                eq: async () => ({ data: null, error: null }),
              };
            },
          };
        }
        if (table === 'erp_contracts') {
          return {
            select: () => ({
              eq: () => ({
                neq: async () => ({
                    data: [{ contract_id: 'c-live-3', building_unit_id: null, building_unit_number: 'شقة 1A - الدور 1', status: 'Active' }],
                    error: null,
                  }),
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
        type: 'apartment', // Attempt to change type away from 'building'
      },
      true,
      'b-3',
      [],
      []
    );

    assert.equal(res?.success, false);
    assert.equal(updateCalled, false, 'Database update must not be called when changing building type with live contracts');
    assert.ok(res?.error?.includes('عقود جارية') || res?.error?.includes('contract'));
  });

  // A2: Availability is miscounted for legacy contracts
  it('A2: 4 units with one legacy contract ("شقة 1B - الدور 1") and one Rescinded contract gives 3 available', () => {
    const buildingUnits = buildBuildingUnits({
      propertyId: 'b-legacy',
      totalFloors: 2,
      unitsPerFloor: 2,
      areaSqm: 400,
      priceEgp: 4000000,
    });

    const building: Property = {
      id: 'b-legacy',
      slug: 'b-legacy-slug',
      title_ar: 'عمارة التراث',
      title_en: 'Legacy Building',
      description_ar: '',
      description_en: '',
      location: 'New Cairo',
      latitude: null,
      longitude: null,
      completion_status: 'ready',
      listing_status: 'active',
      is_featured: false,
      created_at: '2026-01-01',
      bedrooms: 0,
      bathrooms: 0,
      type: 'building',
      price_egp: 4000000,
      area_sqm: 400,
      total_units_count: 4,
      building_units: buildingUnits,
    };

    const contracts: ERPContract[] = [
      {
        contract_id: 'c-legacy-1',
        contract_number: 'CNT-LEG-001',
        property_id: 'b-legacy',
        unit_id: 'b-legacy',
        // Legacy contract has building_unit_number with long label and NO building_unit_id
        building_unit_number: 'شقة 1B - الدور 1',
        buyer_name: 'Buyer 1',
        gross_contract_value: '1000000',
        currency: 'EGP',
        exchange_rate: '1',
        contract_date: '2026-01-01',
        handover_status: 'Pending',
        total_cash_collected: '200000',
        status: 'Active',
      },
      {
        contract_id: 'c-rescinded-1',
        contract_number: 'CNT-RESC-001',
        property_id: 'b-legacy',
        unit_id: 'b-legacy',
        // Rescinded contract on apt 1A
        building_unit_number: 'شقة 1A - الدور 1',
        buyer_name: 'Buyer 2',
        gross_contract_value: '1000000',
        currency: 'EGP',
        exchange_rate: '1',
        contract_date: '2026-01-02',
        handover_status: 'Pending',
        total_cash_collected: '0',
        status: 'Rescinded',
      },
    ];

    const available = getAvailableUnitsForProperty(building, contracts);
    assert.equal(available.length, 3, 'Expected 3 available units (1B contracted via legacy string, 1A Rescinded so available, 2A, 2B available)');
    const availableIds = available.map(u => u.unit_id);
    assert.ok(availableIds.includes('b-legacy-apt-1'), '1A must be available since contract is Rescinded');
    assert.ok(!availableIds.includes('b-legacy-apt-2'), '1B must NOT be available since legacy contract is Active');
    assert.ok(availableIds.includes('b-legacy-apt-3'), '2A must be available');
    assert.ok(availableIds.includes('b-legacy-apt-4'), '2B must be available');

    // Also check computeProjectStatusMetrics
    const metrics = computeProjectStatusMetrics(building, contracts);
    assert.equal(metrics.totalUnits, 4);
    assert.equal(metrics.contractedUnits, 1);
  });

  // A3: buildBuildingUnits fractional prices lose piastres
  it('A3: 4 units at 1000001.75 gives [250000, 250000, 250000, 250001.75], sum 1000001.75', () => {
    const units = buildBuildingUnits({
      propertyId: 'p-frac',
      totalFloors: 2,
      unitsPerFloor: 2,
      areaSqm: 600,
      priceEgp: 1000001.75,
    });

    assert.equal(units.length, 4);
    assert.deepEqual(units.map(u => u.price_egp), [250000, 250000, 250000, 250001.75]);
    const sum = units.reduce((acc, u) => acc + u.price_egp, 0);
    assert.equal(sum, 1000001.75);
  });

  // F1: computeProjectStatusMetrics must not treat listing_status='sold' as live contracts
  it('F1: listing_status=sold with no contracts gives 0 contracted units, isContracted=false, statusTextEn=Sold', () => {
    const buildingUnits = buildBuildingUnits({
      propertyId: 'b-sold-no-cnt',
      totalFloors: 2,
      unitsPerFloor: 2,
      areaSqm: 400,
      priceEgp: 4000000,
    });

    const building: Property = {
      id: 'b-sold-no-cnt',
      slug: 'b-sold-no-cnt-slug',
      title_ar: 'عمارة مباعة',
      title_en: 'Sold Building',
      description_ar: '',
      description_en: '',
      location: 'New Cairo',
      latitude: null,
      longitude: null,
      completion_status: 'ready',
      listing_status: 'sold',
      is_featured: false,
      created_at: '2026-01-01',
      bedrooms: 0,
      bathrooms: 0,
      type: 'building',
      price_egp: 4000000,
      area_sqm: 400,
      total_units_count: 4,
      building_units: buildingUnits,
    };

    // Case 1: listing_status='sold', contracts=[]
    const metrics = computeProjectStatusMetrics(building, []);
    assert.equal(metrics.totalUnits, 4);
    assert.equal(metrics.contractedUnits, 0, 'listing_status=sold with no contracts must have 0 contracted units');
    assert.equal(metrics.isContracted, false, 'isContracted must be false when contractedUnits is 0');
    assert.equal(metrics.statusTextEn, 'Sold', 'statusTextEn must be "Sold", not "Contracted"');

    // Case 2: actual whole-building live contract still gives four contracted units
    const wholeBuildingContract: ERPContract = {
      contract_id: 'c-whole-1',
      contract_number: 'CNT-WHOLE-001',
      property_id: 'b-sold-no-cnt',
      unit_id: 'b-sold-no-cnt',
      is_whole_building_sale: true,
      buyer_name: 'Whole Buyer',
      gross_contract_value: '4000000',
      currency: 'EGP',
      exchange_rate: '1',
      contract_date: '2026-01-01',
      handover_status: 'Pending',
      total_cash_collected: '1000000',
      status: 'Active',
    };

    const wholeMetrics = computeProjectStatusMetrics(building, [wholeBuildingContract]);
    assert.equal(wholeMetrics.totalUnits, 4);
    assert.equal(wholeMetrics.contractedUnits, 4, 'Whole building live contract must yield 4 contracted units');
    assert.equal(wholeMetrics.isContracted, true);
    assert.equal(wholeMetrics.statusTextEn, 'Contracted');
  });
});
