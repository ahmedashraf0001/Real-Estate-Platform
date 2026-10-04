import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getConstructionPayablesTelemetry, getConstructionCostSection } from '../canonicalMetrics';
import { prepareConstructionSettlement } from '../constructionSettlement';
import { recordPayableInstallmentPayment } from '../propertyCostEngine';
import { ERPSupabaseService } from '../supabaseService';
import type { ERPPropertyCostItem, ERPAccountingPeriod, ERPConstructionPurchaseOrder } from '../types';

const period: ERPAccountingPeriod = { period_id: 'prd-2026-09', fiscal_year: 2026, period_number: 9, start_date: '2026-09-01', end_date: '2026-09-30', status: 'OPEN' };
const cost: ERPPropertyCostItem = { item_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', property_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', category: 'civil_structure', phase: 'structural_skeleton', item_name_ar: 'خرسانة', item_name_en: 'Concrete', supplier_contractor: 'المقاول', quantity: 1, unit: 'مقطوعية', unit_cost_egp: '1000.00', total_cost_egp: '1000.00', logged_date: '2026-09-01', logged_by: 'test', status: 'verified', payment_term: 'FULL_DEFERRED', linked_account_code: '201000', paid_amount_egp: '0.00', remaining_amount_egp: '1000.00', due_date: '2026-07-01' };
const installment = { installment_id: 'direct', cost_item_id: cost.item_id, installment_number: 1, title_ar: 'سداد', due_date: '2026-09-27', amount_egp: '1000.00', paid_amount_egp: '0.00', status: 'PENDING' as const };

describe('Construction modernization financial integrity', () => {
  it('preserves empty sources as zero and flat sparklines', () => {
    const telemetry = getConstructionPayablesTelemetry([], '2026-09-27');
    assert.equal(telemetry.totalCost.toFixed(2), '0.00');
    assert.equal(telemetry.paid.toFixed(2), '0.00');
    assert.equal(telemetry.outstanding.toFixed(2), '0.00');
    assert.deepEqual(telemetry.costSeries, [0, 0]);
    assert.deepEqual(telemetry.aging, [0, 0, 0, 0]);
  });
  it('derives dated cost cohorts and limits aging to actual net liability', () => {
    const items = [{ ...cost, payable_installments: [{ ...installment, due_date: '2026-07-01' }], adjustments: [{ adjustment_id: 'a', parent_item_id: cost.item_id, adjustment_type: 'REFUND_OVERPAYMENT' as const, amount_egp: '200', reason: 'Refund', created_at: '2026-09-01', logged_by: 'test' }] }, { ...cost, item_id: 'second', logged_date: '2026-08-01', total_cost_egp: '500', payable_installments: undefined, paid_amount_egp: '500', payment_term: 'FULL_CASH' as const }];
    const telemetry = getConstructionPayablesTelemetry(items, '2026-09-27');
    assert.deepEqual(telemetry.costSeries, [500, 800]);
    assert.deepEqual(telemetry.paidSeries, [500, 0]);
    assert.equal(telemetry.totalCost.toFixed(2), '1300.00');
    assert.equal(telemetry.aging.reduce((a, b) => a + b, 0), 800);
    assert.equal(telemetry.retentions.toFixed(2), '0.00');
  });
  it('classifies named cash suppliers as site expenses and honors explicit operational purpose', () => {
    assert.equal(getConstructionCostSection(cost), 'contractors');
    assert.equal(getConstructionCostSection({ ...cost, linked_account_code: '101000', payment_term: 'FULL_CASH' }), 'site');
    assert.equal(getConstructionCostSection({ ...cost, notes: '[FIN_OS_SECTION:site]' }), 'site');
    assert.equal(getConstructionCostSection({ ...cost, linked_account_code: '101000', payment_term: 'FULL_CASH', notes: '[FIN_OS_SECTION:contractors]' }), 'contractors');
  });
  for (const method of ['CASH_101000', 'INSTAPAY_101000'] as const) {
    it(`posts ${method} to unified treasury and preserves prior paid amounts`, () => {
      const original = { ...cost, paid_amount_egp: '200.00', remaining_amount_egp: '800.00' };
      const updated = recordPayableInstallmentPayment(original, 'direct', '100', method, '2026-09-27', 'payment', { ...installment, amount_egp: '800', payment_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', treasury_account_code: method === 'CASH_101000' ? '101000' : '102000' });
      const settlement = prepareConstructionSettlement(original, updated, period);
      assert.equal(settlement.request.p_amount, '100.00');
      assert.equal(settlement.request.p_expected_paid, '200.00');
      assert.equal(settlement.request.p_method, method === 'INSTAPAY_101000' ? 'INSTAPAY_102000' : method);
      assert.equal(settlement.journal.lines[0].account_code, '201000');
      assert.equal(settlement.journal.lines[0].debit_amount, '100.00');
      assert.equal(settlement.journal.lines[1].account_code, method === 'CASH_101000' ? '101000' : '102000');
      assert.equal(settlement.journal.lines[1].credit_amount, '100.00');
      assert.equal(settlement.updatedItem.paid_amount_egp, '300.00');
    });
  }
  it('does not post preserved historical paid amounts as a new treasury payment', () => {
    const original = { ...cost, paid_amount_egp: '500.00', payable_installments: [{ ...installment, paid_amount_egp: '300.00', status: 'PARTIALLY_PAID' as const }] };
    const updated = recordPayableInstallmentPayment(original, 'direct', '100', 'CASH_101000', '2026-09-27', '', installment);
    const settlement = prepareConstructionSettlement(original, updated, period);
    assert.equal(settlement.request.p_expected_paid, '500.00');
    assert.equal(settlement.request.p_amount, '100.00');
    assert.equal(settlement.updatedItem.paid_amount_egp, '600.00');
    assert.equal(settlement.journal.lines[1].credit_amount, '100.00');
  });
  it('rejects bank channels, overpay, non-AP source and locked periods', () => {
    const updated = recordPayableInstallmentPayment(cost, 'direct', '100', 'CASH_101000', '2026-09-27', '', installment);
    assert.throws(() => prepareConstructionSettlement({ ...cost, linked_account_code: '101000' }, updated, period), /recognized payable/);
    assert.throws(() => prepareConstructionSettlement(cost, updated, { ...period, status: 'CLOSED' }), /open accounting/);
    assert.throws(() => prepareConstructionSettlement(cost, { ...updated, payable_installments: updated.payable_installments?.map(inst => ({ ...inst, payment_method: 'BANK_102000' })) }, period), /Only Cash/);
    const overpaid = recordPayableInstallmentPayment(cost, 'direct', '1001', 'CASH_101000', '2026-09-27', '', installment);
    assert.throws(() => prepareConstructionSettlement(cost, overpaid, period), /cannot exceed/);
  });
  it('persists a draft purchase order separately from all journal/cost writes', async () => {
    const calls: { table: string; payload: unknown }[] = [];
    const client = { from: (table: string) => ({ insert: async (payload: unknown) => { calls.push({ table, payload }); return { error: null }; } }) } as unknown as SupabaseClient;
    const order: ERPConstructionPurchaseOrder = { order_id: 'o', property_id: cost.property_id, supplier_name: 'Supplier', description: 'Steel supply', amount_egp: '3000', order_date: '2026-09-27', status: 'DRAFT' };
    await ERPSupabaseService.createConstructionPurchaseOrder(client, order);
    assert.deepEqual(calls, [{ table: 'erp_construction_purchase_orders', payload: order }]);
    await assert.rejects(ERPSupabaseService.createConstructionPurchaseOrder(client, { ...order, amount_egp: '-1' }), /positive amount/);
  });
  it('propagates purchase order and atomic RPC failures without reporting success', async () => {
    const client = { from: () => ({ insert: async () => ({ error: { message: 'RLS rejected' } }) }), rpc: async () => ({ error: { message: 'Stale payable' } }) } as unknown as SupabaseClient;
    await assert.rejects(ERPSupabaseService.createConstructionPurchaseOrder(client, { order_id: 'o', property_id: cost.property_id, supplier_name: 'Supplier', description: 'Steel', amount_egp: '1', order_date: '2026-09-27', status: 'DRAFT' }), /RLS rejected/);
    const updated = recordPayableInstallmentPayment(cost, 'direct', '100', 'CASH_101000', '2026-09-27', '', installment);
    await assert.rejects(ERPSupabaseService.recordCostPayablePayment(client, updated, cost, period), /Stale payable/);
  });
  it('restricts settlement UI to two methods and canonical side chart geometry', () => {
    const modal = readFileSync('src/components/admin/erp/v2/modals/CostPayableSettlementModal.tsx', 'utf8');
    assert.equal((modal.match(/<option value="(?:CASH_101000|INSTAPAY_102000)"/g) || []).length, 2);
    assert.ok(!/BANK_102000|شيك|Cheque/.test(modal));
    const view = readFileSync('src/components/admin/erp/v2/views/ConstructionPayablesView.tsx', 'utf8');
    assert.ok(view.includes("size: '76%'")); assert.ok(view.includes('customScale: 0.98')); assert.ok(view.includes('horizontal: true')); assert.ok(!view.includes('generateMockPropertyCosts'));
  });
});
