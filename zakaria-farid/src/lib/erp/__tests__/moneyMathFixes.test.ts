import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ContractsEngine, generateContractNumber } from '../contracts';
import { RescissionEngine, resolveRescissionCost } from '../rescission';
import { computeDynamicBuildingCapital } from '../partnersEngine';
import { getHandoverCOGS } from '../canonicalMetrics';
import { RSVEngine } from '../rsv';
import { PRIMARY_DEVELOPER_NAME } from '../partnersDirectory';
import type {
  ERPAccountingPeriod,
  ERPContract,
  ERPCostAllocation,
  ERPJournalEntry,
  ERPPartnerTransaction,
  ERPPropertyCostItem,
} from '../types';
import type { Property } from '@/lib/supabase/types';

const period: ERPAccountingPeriod = {
  period_id: 'prd-2026-10',
  fiscal_year: 2026,
  period_number: 10,
  start_date: '2026-10-01',
  end_date: '2026-10-31',
  status: 'OPEN',
};

const contract = (over: Partial<ERPContract> = {}): ERPContract => ({
  contract_id: '11111111-1111-4111-8111-111111111111',
  contract_number: 'ZF-2026-0001',
  property_id: 'prop-1',
  unit_id: 'prop-1',
  buyer_name: 'Buyer',
  gross_contract_value: '1000000.00',
  total_cash_collected: '500000.00',
  status: 'Active',
  handover_status: 'Pending',
  ...over,
} as ERPContract);

const cost = (propertyId: string, total: string): ERPPropertyCostItem => ({
  item_id: `c-${propertyId}-${total}`,
  property_id: propertyId,
  category: 'civil_structure',
  phase: 'structural_skeleton',
  item_name_ar: 'تكلفة',
  item_name_en: 'Cost',
  quantity: 1,
  unit: 'lump',
  unit_cost_egp: total,
  total_cost_egp: total,
  logged_date: '2026-01-01',
  logged_by: 'test',
  status: 'verified',
} as ERPPropertyCostItem);

describe('Installment schedule uses the exact down payment amount', () => {
  it('keeps a typed 125,000 down payment (no 2-decimal ratio rounding to 130,000)', () => {
    const s = ContractsEngine.generateSchedule('c1', '1000000.00', { amount: '125000' }, 4, '2026-01-01', 3);
    assert.strictEqual(s[0].nominal_value, '125000.00');
    assert.deepStrictEqual(s.slice(1).map(x => x.nominal_value), ['218750.00', '218750.00', '218750.00', '218750.00']);
  });

  it('applies a fractional percent at full precision', () => {
    const s = ContractsEngine.generateSchedule('c1', '1000000.00', '0.125', 4, '2026-01-01', 3);
    assert.strictEqual(s[0].nominal_value, '125000.00');
  });

  it('puts the rounding remainder in the last tranche', () => {
    const s = ContractsEngine.generateSchedule('c1', '100.00', { amount: '0' }, 3, '2026-01-01', 3);
    assert.deepStrictEqual(s.map(x => x.nominal_value), ['0.00', '33.33', '33.33', '33.34']);
  });

  it('rejects a down payment above the contract value', () => {
    assert.throws(() => ContractsEngine.generateSchedule('c1', '1000000.00', { amount: '2000000' }, 4, '2026-01-01', 3), /exceeds contract value/);
  });
});

describe('Sequential contract numbers', () => {
  it('starts at 0001', () => {
    assert.strictEqual(generateContractNumber([], 2026), 'ZF-2026-0001');
  });
  it('continues after the highest number of the same year', () => {
    assert.strictEqual(generateContractNumber(['ZF-2026-4386', 'ZF-2026-0007', 'ZF-2025-9999', 'bad'], 2026), 'ZF-2026-4387');
  });
});

describe('Rescission penalty and unit cost', () => {
  it('applies a 7.5% penalty exactly', () => {
    const r = RescissionEngine.processRescission(contract(), [], period, '2026-10-05', '0.00', '501000', '151000', 'T', undefined, 0.075);
    assert.strictEqual(r.rescissionRecord.penalty_uncapped, '75000.00');
    assert.strictEqual(r.rescissionRecord.penalty_retained, '75000.00');
    assert.strictEqual(r.rescissionRecord.net_refund_liability, '425000.00');
  });

  it('pre-delivery: needs no cost and restores none', () => {
    const res = resolveRescissionCost({ contract: contract() });
    assert.deepStrictEqual([res.needed, res.amount, res.source], [false, '0.00', 'not-needed']);
    const r = RescissionEngine.processRescission(contract(), [], period, '2026-10-05', '450000.00');
    assert.strictEqual(r.rescissionRecord.wip_cost_restored, '0.00');
  });

  it('delivered with a handover entry: reverses its exact COGS', () => {
    const delivered = contract({ handover_status: 'Delivered' });
    const handover = {
      entry_id: 'e1',
      entry_number: 'JE-HANDOVER-ZF-2026-0001',
      source_module: 'SALES',
      lines: [
        { account_code: '501000', debit_amount: '412345.67', credit_amount: '0.00' },
        { account_code: '151000', debit_amount: '0.00', credit_amount: '412345.67' },
      ],
    } as unknown as ERPJournalEntry;
    const res = resolveRescissionCost({ contract: delivered, journalEntries: [handover] });
    assert.strictEqual(res.source, 'handover-entry');
    assert.strictEqual(res.amount, '412345.67');
  });

  it('delivered without entry: uses the RSV allocation at full precision', () => {
    const delivered = contract({ handover_status: 'Delivered' });
    const alloc = { allocation_id: 'a', project_name: 'x', rsv_factor: '0.4537', property_id: 'prop-1' } as unknown as ERPCostAllocation;
    const property = { id: 'prop-1', title_ar: 'عمارة', title_en: '' } as Property;
    const res = resolveRescissionCost({ contract: delivered, costAllocations: [alloc], properties: [property] });
    assert.strictEqual(res.source, 'rsv');
    assert.strictEqual(res.amount, '453700.00');
  });

  it('delivered with no recorded cost: blocks the posting', () => {
    const delivered = contract({ handover_status: 'Delivered' });
    const res = resolveRescissionCost({ contract: delivered });
    assert.deepStrictEqual([res.needed, res.amount, res.source], [true, null, 'none']);
    assert.throws(() => RescissionEngine.processRescission(delivered, [], period, '2026-10-05', '0.00'), /unit cost is not recorded/);
  });
});

describe('Handover COGS matching', () => {
  it('an empty English title does not match every allocation', () => {
    const other = { allocation_id: 'a', project_name: 'Other Tower', rsv_factor: '0.5' } as unknown as ERPCostAllocation;
    const res = getHandoverCOGS({ contractValue: '1000000', costAllocations: [other], property: { id: 'p', title_ar: 'عمارة النخيل', title_en: '' } });
    assert.strictEqual(res.isAllocated, false);
  });

  it('RSV factor is stored with 6 decimals and applied exactly', () => {
    const alloc = RSVEngine.calculateAllocation('p', '4537000.00', '10000000.00');
    assert.strictEqual(alloc.rsv_factor, '0.453700');
    assert.strictEqual(RSVEngine.computeUnitCOGS('1000000.00', alloc.rsv_factor).toFixed(2), '453700.00');
    assert.strictEqual(RSVEngine.computeGrossMarginPct(alloc.rsv_factor), '54.63%');
  });
});

describe('Partner capital owed = share x recorded costs', () => {
  it('derives requirement and arrears from recorded costs, not founder payments', () => {
    const building = {
      id: 'b1',
      type: 'building',
      area_sqm: 500,
      title_ar: 'عمارة',
      partner_splits: [
        { partner_name: PRIMARY_DEVELOPER_NAME, share_percentage: 60 },
        { partner_name: 'Partner B', share_percentage: 40 },
      ],
    } as unknown as Property;
    const txs = [{
      id: 't1', partner_name: 'Partner B', property_id: 'b1', type: 'CAPITAL_INJECTION', amount: '300000.00',
    }] as unknown as ERPPartnerTransaction[];
    const info = computeDynamicBuildingCapital(building, txs, [cost('b1', '600000.00'), cost('b1', '400000.00')]);
    const b = info.partnerStatuses.find(p => p.partnerName === 'Partner B')!;
    const f = info.partnerStatuses.find(p => p.isFounder)!;
    assert.deepStrictEqual([b.requiredContributionEgp, b.paidContributionEgp, b.arrearsEgp], ['400000.00', '300000.00', '100000.00']);
    assert.deepStrictEqual([f.requiredContributionEgp, f.paidContributionEgp, f.arrearsEgp], ['600000.00', '0.00', '600000.00']);
    assert.strictEqual(info.impliedTotalCapitalEgp, '1000000.00');
    assert.strictEqual(info.fundingRatioPct, 30);
  });
});
