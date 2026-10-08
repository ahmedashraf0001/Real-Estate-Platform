import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBuildingUnits, normalizeERPProperty, cleanUnitNumber, formatUnitDisplayName, formatUnitWithFloor } from '../projectStatusHelper';
import { ERPSupabaseService } from '../supabaseService';
import { loadSaveProperty } from './buildingUnitsHarness';
import { getAvailableUnitsForProperty } from '../propertiesPortfolioCalculations';
import { Property } from '@/lib/supabase/types';
import { ERPContract } from '../types';

describe('TASK fin-b2-units-persist: building units & contract availability', () => {
  // T1
  it('T1: buildBuildingUnits creates exact floor-major units with remainder absorbed by last unit', () => {
    const units = buildBuildingUnits({
      propertyId: 'p1',
      totalFloors: 2,
      unitsPerFloor: 2,
      areaSqm: 600,
      priceEgp: 1000001,
    });

    assert.equal(units.length, 4);
    assert.deepEqual(units.map(u => u.unit_id), ['p1-apt-1', 'p1-apt-2', 'p1-apt-3', 'p1-apt-4']);
    assert.deepEqual(units.map(u => u.unit_number), ['1A', '1B', '2A', '2B']);
    assert.deepEqual(units.map(u => u.floor), [1, 1, 2, 2]);
    assert.deepEqual(units.map(u => u.area_sqm), [150, 150, 150, 150]);
    assert.deepEqual(units.map(u => u.price_egp), [250000, 250000, 250000, 250001]);
    const sum = units.reduce((acc, u) => acc + u.price_egp, 0);
    assert.equal(sum, 1000001);
  });

  // T2
  it('T2: 3 floors x 2 per floor gives legacy-compatible apt-1..apt-6 and floors [1,1,2,2,3,3]', () => {
    const units = buildBuildingUnits({
      propertyId: 'p2',
      totalFloors: 3,
      unitsPerFloor: 2,
      areaSqm: 1200,
      priceEgp: 6000000,
    });

    assert.equal(units.length, 6);
    assert.deepEqual(units.map(u => u.unit_id), [
      'p2-apt-1', 'p2-apt-2', 'p2-apt-3', 'p2-apt-4', 'p2-apt-5', 'p2-apt-6'
    ]);
    assert.deepEqual(units.map(u => u.floor), [1, 1, 2, 2, 3, 3]);
  });

  // T3
  it('T3: units_per_floor 3 gives letters A, B, C on each floor', () => {
    const units = buildBuildingUnits({
      propertyId: 'p3',
      totalFloors: 2,
      unitsPerFloor: 3,
      areaSqm: 900,
      priceEgp: 9000000,
    });

    assert.equal(units.length, 6);
    assert.deepEqual(units.map(u => u.unit_number), ['1A', '1B', '1C', '2A', '2B', '2C']);
  });

  // T4
  it('T4: normalization function fallback for legacy building yields 6 units summing to priceEgp and containing x-apt-2', () => {
    const rawProp = {
      id: 'x',
      slug: 'x-building',
      title_ar: 'عمارة x',
      title_en: 'Building X',
      description_ar: '',
      description_en: '',
      location: 'New Cairo',
      latitude: null,
      longitude: null,
      completion_status: 'ready' as const,
      listing_status: 'active' as const,
      is_featured: false,
      created_at: '2026-01-01',
      bedrooms: 0,
      bathrooms: 0,
      type: 'building' as const,
      building_units: [],
      total_units_count: 1,
      price_egp: 12500000,
      area_sqm: 350,
    } as unknown as Property;

    const normalized = normalizeERPProperty(rawProp);
    assert.equal(normalized.building_units?.length, 6);
    assert.equal(normalized.total_units_count, 6);
    const sum = (normalized.building_units || []).reduce((acc, u) => acc + u.price_egp, 0);
    assert.equal(sum, 12500000);
    const ids = (normalized.building_units || []).map(u => u.unit_id);
    assert.ok(ids.includes('x-apt-2'));
  });

  // T5
  it('T5: building with apt-1..apt-4 has 3 available units with 1 active contract and Rescinded does not reduce availability', () => {
    const buildingUnits = buildBuildingUnits({
      propertyId: 'b1',
      totalFloors: 2,
      unitsPerFloor: 2,
      areaSqm: 400,
      priceEgp: 4000000,
    });

    const building: Property = {
      id: 'b1',
      slug: 'b1-slug',
      title_ar: 'عمارة 1',
      title_en: 'Building 1',
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
        contract_id: 'c1',
        contract_number: 'CNT-001',
        property_id: 'b1',
        building_unit_id: 'b1-apt-1',
        unit_id: 'b1-apt-1',
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
        contract_id: 'c2',
        contract_number: 'CNT-002',
        property_id: 'b1',
        building_unit_id: 'b1-apt-2',
        unit_id: 'b1-apt-2',
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
    assert.equal(available.length, 3);
    const availableIds = available.map(u => u.unit_id);
    assert.ok(!availableIds.includes('b1-apt-1'));
    assert.ok(availableIds.includes('b1-apt-2'));
    assert.ok(availableIds.includes('b1-apt-3'));
    assert.ok(availableIds.includes('b1-apt-4'));
  });

  // F2: Odd counts 3 and 5 in normalizeERPProperty
  it('F2: normalizeERPProperty generates exact count 3 with floors [1,1,2] and numbers [1A,1B,2A] summing to 1000001', () => {
    const rawProp = {
      id: 'prop-3',
      type: 'building' as const,
      building_units: [],
      total_units_count: 3,
      price_egp: 1000001,
      area_sqm: 300,
    } as unknown as Property;

    const norm = normalizeERPProperty(rawProp);
    assert.equal(norm.building_units?.length, 3);
    assert.equal(norm.total_units_count, 3);
    assert.deepEqual(norm.building_units?.map(u => u.unit_id), ['prop-3-apt-1', 'prop-3-apt-2', 'prop-3-apt-3']);
    assert.deepEqual(norm.building_units?.map(u => u.floor), [1, 1, 2]);
    assert.deepEqual(norm.building_units?.map(u => u.unit_number), ['1A', '1B', '2A']);
    assert.deepEqual(norm.building_units?.map(u => u.price_egp), [333333, 333333, 333335]);
    const sum = (norm.building_units || []).reduce((acc, u) => acc + u.price_egp, 0);
    assert.equal(sum, 1000001);
  });

  it('F2: normalizeERPProperty generates exact count 5 with floors [1,1,2,2,3] and numbers [1A,1B,2A,2B,3A] summing to 1000001', () => {
    const rawProp = {
      id: 'prop-5',
      type: 'building' as const,
      building_units: [],
      total_units_count: 5,
      price_egp: 1000001,
      area_sqm: 500,
    } as unknown as Property;

    const norm = normalizeERPProperty(rawProp);
    assert.equal(norm.building_units?.length, 5);
    assert.equal(norm.total_units_count, 5);
    assert.deepEqual(norm.building_units?.map(u => u.unit_id), [
      'prop-5-apt-1', 'prop-5-apt-2', 'prop-5-apt-3', 'prop-5-apt-4', 'prop-5-apt-5'
    ]);
    assert.deepEqual(norm.building_units?.map(u => u.floor), [1, 1, 2, 2, 3]);
    assert.deepEqual(norm.building_units?.map(u => u.unit_number), ['1A', '1B', '2A', '2B', '3A']);
    assert.deepEqual(norm.building_units?.map(u => u.price_egp), [200000, 200000, 200000, 200000, 200001]);
    const sum = (norm.building_units || []).reduce((acc, u) => acc + u.price_egp, 0);
    assert.equal(sum, 1000001);
  });
  // F1: ERPSupabaseService.fetchContracts error handling and propagation
  it('F1: fetchContracts rejects non-auth SDK errors and throws auth errors without swallowing', async () => {
    const mockSdkErrClient = {
      from: (table: string) => {
        assert.equal(table, 'erp_contracts');
        return {
          select: () => ({
            order: async () => ({
              data: null,
              error: { message: 'permission denied', code: '42501' },
            }),
          }),
        };
      },
    } as any;

    await assert.rejects(
      async () => ERPSupabaseService.fetchContracts(mockSdkErrClient),
      (err: any) => err.message === 'permission denied' && err.code === '42501'
    );

    const mockAuthErrClient = {
      from: () => ({
        select: () => ({
          order: async () => ({
            data: null,
            error: { message: 'JWT expired', code: 'PGRST301' },
          }),
        }),
      }),
    } as any;

    await assert.rejects(
      async () => ERPSupabaseService.fetchContracts(mockAuthErrClient),
      (err: any) => err.message === 'JWT expired'
    );
  });

  it('F1: fetchContracts succeeds and returns mapped contracts', async () => {
    const mockSuccessClient = {
      from: () => ({
        select: () => ({
          order: async () => ({
            data: [
              {
                contract_id: 'c-1',
                contract_number: 'CNT-001',
                property_id: 'p-1',
                building_unit_id: 'p-1-apt-1',
                status: 'Active',
                gross_contract_value: '1000000',
              },
              {
                contract_id: 'c-2',
                contract_number: 'CNT-002',
                property_id: 'p-1',
                building_unit_id: 'p-1-apt-2',
                status: 'Rescinded',
                gross_contract_value: '1000000',
              },
            ],
            error: null,
          }),
        }),
      }),
    } as any;

    const contracts = await ERPSupabaseService.fetchContracts(mockSuccessClient);
    assert.equal(contracts.length, 2);
    assert.equal(contracts[0].contract_id, 'c-1');
    assert.equal(contracts[0].status, 'Active');
    assert.equal(contracts[1].status, 'Rescinded');
  });

  // F1: Lead wizard / contract availability gating
  it('F1: availability gating excludes active contracted unit but permits Rescinded unit', () => {
    const building: Property = {
      id: 'p-gate',
      type: 'building',
      price_egp: 2000000,
      area_sqm: 200,
      total_units_count: 2,
      building_units: [
        { unit_id: 'p-gate-apt-1', unit_number: '1A', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 1000000, status: 'available' },
        { unit_id: 'p-gate-apt-2', unit_number: '1B', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 1000000, status: 'available' },
      ],
    } as any;

    const contracts: ERPContract[] = [
      {
        contract_id: 'c-act',
        contract_number: 'C1',
        property_id: 'p-gate',
        building_unit_id: 'p-gate-apt-1',
        status: 'Active',
      } as any,
      {
        contract_id: 'c-resc',
        contract_number: 'C2',
        property_id: 'p-gate',
        building_unit_id: 'p-gate-apt-2',
        status: 'Rescinded',
      } as any,
    ];

    const available = getAvailableUnitsForProperty(building, contracts);
    assert.equal(available.length, 1);
    assert.equal(available[0].unit_id, 'p-gate-apt-2'); // apt-2 is permitted because contract is Rescinded!
  });

  // F3: Unit label formatters (clean and legacy forms)
  it('F3: cleanUnitNumber extracts clean unit number without doubled prefixes/floors', () => {
    assert.equal(cleanUnitNumber('1A'), '1A');
    assert.equal(cleanUnitNumber('شقة 1A'), '1A');
    assert.equal(cleanUnitNumber('شقة 1A - الدور 1'), '1A');
    assert.equal(cleanUnitNumber('Apt 2B - Floor 2'), '2B');
    assert.equal(cleanUnitNumber('prop-1-apt-3'), '3');
    assert.equal(cleanUnitNumber('unit-4'), '4');
  });

  it('F3: formatUnitDisplayName formats localized unit display without duplicate wording', () => {
    assert.equal(formatUnitDisplayName('1A', true), 'شقة 1A');
    assert.equal(formatUnitDisplayName('1A', false), 'Apt 1A');
    assert.equal(formatUnitDisplayName('شقة 1A - الدور 1', true), 'شقة 1A');
    assert.equal(formatUnitDisplayName('شقة 1A - الدور 1', false), 'Apt 1A');
    assert.equal(formatUnitDisplayName('فيلا 3', true), 'فيلا 3');
  });

  it('F3: formatUnitWithFloor formats localized unit and floor context', () => {
    assert.equal(formatUnitWithFloor('1A', 1, true), 'شقة 1A - الدور 1');
    assert.equal(formatUnitWithFloor('1A', 1, false), 'Apt 1A - Floor 1');
    assert.equal(formatUnitWithFloor('شقة 1A - الدور 1', null, true), 'شقة 1A - الدور 1');
    assert.equal(formatUnitWithFloor('شقة 1A - الدور 1', null, false), 'Apt 1A - Floor 1');
  });

  // Regressions: saveProperty persistent real-action tests
  it('Regression: same-count 2x2 -> 1x4 edit preserves stored units, prices and status without querying contracts', async () => {
    const storedUnits = [
      { unit_id: 'b-1-apt-1', unit_number: '1A', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'sold' as const },
      { unit_id: 'b-1-apt-2', unit_number: '1B', floor: 1, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' as const },
      { unit_id: 'b-1-apt-3', unit_number: '2A', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250000, status: 'available' as const },
      { unit_id: 'b-1-apt-4', unit_number: '2B', floor: 2, area_sqm: 100, bedrooms: 3, bathrooms: 2, price_egp: 250001, status: 'available' as const },
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
                neq: async () => ({
                    data: [{ contract_id: 'active-c1', building_unit_id: 'b-1-apt-1', status: 'Active' }],
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === 'property_amenities') {
          return {
            delete: () => ({ eq: async () => ({ error: null }) }),
            insert: async () => ({ error: null }),
          };
        }
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ error: null }),
        };
      },
    };

    const res = await loadSaveProperty(mockClient)(
      {
        type: 'building',
        total_floors: 1,
        units_per_floor: 4,
        area_sqm: 400,
        price_egp: 1000001,
      },
      true, // isEditing
      'b-1',
      [],
      []
    );

    assert.equal(res?.success, true);
    assert.equal(contractsQueried, false, 'erp_contracts should NOT be queried when count (2x2 -> 1x4 = 4) is unchanged');
    assert.deepEqual(updatedPayload.building_units, storedUnits, 'Stored building units must be preserved intact');
    assert.equal(updatedPayload.total_units_count, 4);
  });

  it('Regression: schema error for building_units/total_units_count returns failure and fields are NOT stripped on retry', async () => {
    for (const column of ['building_units', 'total_units_count']) {
    let attemptedPayloads: any[] = [];

    const mockClient = {
      from: (table: string) => {
        if (table === 'properties') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: 'b-2', type: 'building', building_units: [], total_units_count: 1 },
                  error: null,
                }),
              }),
            }),
            update: (payload: any) => {
              attemptedPayloads.push({ ...payload });
              return {
                eq: async () => ({
                  data: null,
                  error: { message: `column "${column}" of relation "properties" does not exist` },
                }),
              };
            },
          };
        }
        if (table === 'erp_contracts') {
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

    const res = await loadSaveProperty(mockClient)(
      {
        type: 'building',
        total_floors: 2,
        units_per_floor: 2,
        area_sqm: 400,
        price_egp: 1000000,
      },
      true,
      'b-2',
      [],
      []
    );

    assert.equal(res?.success, false);
    assert.ok(res?.error?.includes(`column "${column}"`));
    assert.ok(attemptedPayloads.length >= 1);
    for (const p of attemptedPayloads) {
      assert.ok('building_units' in p, 'building_units must NOT be stripped by schema retry');
      assert.ok('total_units_count' in p, 'total_units_count must NOT be stripped by schema retry');
    }
    }
  });
});
