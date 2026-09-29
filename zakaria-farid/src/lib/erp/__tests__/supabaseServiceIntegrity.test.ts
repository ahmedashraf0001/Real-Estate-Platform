import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ERPSupabaseService } from '../supabaseService';
import type { ERPContract } from '../types';

function erpClient(rows: Map<string, Record<string, unknown>[]>): SupabaseClient {
  return {
    auth: { getSession: async () => ({ data: { session: {} } }) },
    from(table: string) {
      return {
        select() {
          const query = {
            order() { return query; },
            then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
              return Promise.resolve({ data: rows.get(table) ?? [], error: null }).then(resolve, reject);
            }
          };
          return query;
        },
        async insert(value: Record<string, unknown> | Record<string, unknown>[]) {
          rows.set(table, [...(rows.get(table) ?? []), ...(Array.isArray(value) ? value : [value])]);
          return { error: null };
        },
        update() { return { eq: async () => ({ error: null }) }; }
      };
    }
  } as unknown as SupabaseClient;
}

const contract: ERPContract = {
  contract_id: 'a0000000-0000-4000-8000-000000000001',
  contract_number: 'ZF-ROUNDTRIP-1',
  unit_id: 'Building - 2A',
  property_id: 'b0000000-0000-4000-8000-000000000002',
  building_unit_id: 'unit-2a',
  building_unit_number: '2A',
  is_whole_building_sale: false,
  payment_plan_type: 'INSTALLMENTS',
  buyer_name: 'Test buyer',
  gross_contract_value: '2500000.00',
  currency: 'EGP',
  exchange_rate: '1.0000',
  contract_date: '2026-01-01',
  handover_status: 'Pending',
  total_cash_collected: '500000.00',
  status: 'Active'
};

describe('ERP live data integrity', () => {
  it('preserves a unit sale and payment plan through persistence and reload', async () => {
    const rows = new Map<string, Record<string, unknown>[]>([
      ['erp_accounting_periods', [{ period_id: 'p-1', fiscal_year: 2026, period_number: 1, start_date: '2026-01-01', end_date: '2026-01-31', status: 'OPEN' }]]
    ]);
    const client = erpClient(rows);

    await ERPSupabaseService.persistNewContract(client, { ...contract }, []);
    const stored = rows.get('erp_contracts')?.[0];
    assert.ok(stored);
    assert.equal(stored.payment_plan_type, 'INSTALLMENTS');
    assert.equal(stored.is_whole_building_sale, false);
    assert.equal(stored.building_unit_id, 'unit-2a');
    assert.equal(stored.building_unit_number, '2A');

    const loaded = (await ERPSupabaseService.fetchLiveERPData(client)).contracts[0];
    assert.equal(loaded.payment_plan_type, 'INSTALLMENTS');
    assert.equal(loaded.is_whole_building_sale, false);
    assert.equal(loaded.building_unit_id, 'unit-2a');
    assert.equal(loaded.building_unit_number, '2A');
  });
  it('loads only recorded costs, including when there are fewer than three or none', async () => {
    const rows = new Map<string, Record<string, unknown>[]>([
      ['erp_accounting_periods', [{ period_id: 'p-1', fiscal_year: 2026, period_number: 1, start_date: '2026-01-01', end_date: '2026-01-31', status: 'OPEN' }]],
      ['erp_property_costs', [{
        item_id: 'c0000000-0000-4000-8000-000000000003',
        property_id: contract.property_id,
        category: 'civil_structure',
        phase: 'structural_skeleton',
        item_name_ar: 'خرسانة',
        item_name_en: 'Concrete',
        total_cost_egp: '120000.00',
        logged_date: '2026-01-01',
        status: 'verified'
      }]]
    ]);
    const client = erpClient(rows);

    const withOneCost = await ERPSupabaseService.fetchLiveERPData(client);
    assert.deepEqual(withOneCost.propertyCosts.map(item => item.item_id), ['c0000000-0000-4000-8000-000000000003']);
    assert.equal(withOneCost.propertyCosts[0].total_cost_egp, '120000.00');

    rows.set('erp_property_costs', []);
    const withoutCosts = await ERPSupabaseService.fetchLiveERPData(client);
    assert.deepEqual(withoutCosts.propertyCosts, []);
  });
});
