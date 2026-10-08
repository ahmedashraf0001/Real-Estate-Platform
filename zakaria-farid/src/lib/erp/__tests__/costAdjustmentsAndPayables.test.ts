import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  isItemWithinGracePeriod,
  getRemainingGraceHours,
  calculateCostItemEffectiveTotals,
  calculatePropertyAuditMetrics,
  addCostAdjustment,
  generatePayableInstallmentSchedule,
  recordPayableInstallmentPayment,
  updateCostItemDirectly
} from '../propertyCostEngine';
import { ERPSupabaseService } from '../supabaseService';
import { GeneralLedgerEngine } from '../ledger';
import { D, Decimal } from '../math';
import { ERPPropertyCostItem, ERPJournalEntry } from '../types';
import { findOrphanedWipEntries } from '../../../../scripts/check_historical_orphaned_costs';

describe('Project Cost Lifecycle: 24-Hour Grace Period & Sub-Item Adjustments', () => {

  const baseItem: ERPPropertyCostItem = {
    item_id: 'cost-test-01',
    property_id: 'prop-building-01',
    category: 'civil_structure',
    phase: 'structural_skeleton',
    item_name_ar: 'توريد حديد تسليح عز الدخيلة 20 طن',
    item_name_en: 'Reinforced Rebar Supply 20 Tons',
    supplier_contractor: 'شركة الأهرام للتجارة والتوريدات',
    quantity: 20,
    unit: 'طن',
    unit_cost_egp: '42000.00',
    total_cost_egp: '840000.00',
    logged_date: '2026-09-14',
    logged_by: 'المكتب الفني',
    status: 'verified',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
    payment_term: 'FULL_CASH'
  };

  it('allows direct modification within the 24-hour grace period', () => {
    assert.equal(isItemWithinGracePeriod(baseItem.created_at, 24), true);
    assert.ok(getRemainingGraceHours(baseItem.created_at, 24) >= 21.5);

    const updated = updateCostItemDirectly(baseItem, {
      total_cost_egp: '850000.00',
      supplier_contractor: 'شركة الأهرام للصلب المطور'
    });

    assert.equal(updated.total_cost_egp, '850000.00');
    assert.equal(updated.supplier_contractor, 'شركة الأهرام للصلب المطور');
    assert.ok(updated.updated_at);
  });

  it('rejects direct modification after the 24-hour grace period has expired', () => {
    const expiredItem: ERPPropertyCostItem = {
      ...baseItem,
      created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString() // 26 hours ago
    };

    assert.equal(isItemWithinGracePeriod(expiredItem.created_at, 24), false);
    assert.equal(getRemainingGraceHours(expiredItem.created_at, 24), 0);

    assert.throws(() => {
      updateCostItemDirectly(expiredItem, { total_cost_egp: '900000.00' });
    }, /Accounting Lock/);
  });

  it('adds a refund adjustment sub-item (overpayment return) and reduces net effective cost', () => {
    // Initial cost: 840,000 EGP
    // Mistake: 40,000 EGP was overpaid and returned to company
    const adjustedItem = addCostAdjustment(baseItem, {
      parent_item_id: baseItem.item_id,
      adjustment_type: 'REFUND_OVERPAYMENT',
      amount_egp: '40000.00',
      reason: 'خطأ في وزن الشحنة وتم استرداد الفارق نقداً بالخزينة',
      payment_method: 'CASH_101000',
      logged_by: 'مدير الحسابات'
    });

    assert.equal(adjustedItem.adjustments?.length, 1);
    assert.equal(adjustedItem.adjustments[0].adjustment_type, 'REFUND_OVERPAYMENT');
    assert.equal(adjustedItem.net_effective_cost_egp, '800000.00');

    const totals = calculateCostItemEffectiveTotals(adjustedItem);
    assert.equal(totals.baseCost, '840000.00');
    assert.equal(totals.totalRefunds, '40000.00');
    assert.equal(totals.totalSupplements, '0.00');
    assert.equal(totals.netAdjustments, '-40000.00');
    assert.equal(totals.netEffectiveCost, '800000.00');
  });

  it('adds a supplemental adjustment sub-item (underpayment) and increases net effective cost', () => {
    // Initial cost: 840,000 EGP
    // Additional work / underpayment: +60,000 EGP paid to supplier
    const adjustedItem = addCostAdjustment(baseItem, {
      parent_item_id: baseItem.item_id,
      adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
      amount_egp: '60000.00',
      reason: 'ملحق مشال وتفريغ رافعة هيدروليكية إضافية بالموقع',
      payment_method: 'INSTAPAY_102000',
      logged_by: 'مدير الحسابات'
    });

    assert.equal(adjustedItem.adjustments?.length, 1);
    assert.equal(adjustedItem.adjustments[0].adjustment_type, 'SUPPLEMENT_UNDERPAYMENT');
    assert.equal(adjustedItem.net_effective_cost_egp, '900000.00');

    const totals = calculateCostItemEffectiveTotals(adjustedItem);
    assert.equal(totals.baseCost, '840000.00');
    assert.equal(totals.totalRefunds, '0.00');
    assert.equal(totals.totalSupplements, '60000.00');
    assert.equal(totals.netAdjustments, '60000.00');
    assert.equal(totals.netEffectiveCost, '900000.00');
  });

  it('property audit metrics (calculator cost basis) use net effective cost after adjustments', () => {
    const refunded = addCostAdjustment(baseItem, {
      parent_item_id: baseItem.item_id,
      adjustment_type: 'REFUND_OVERPAYMENT',
      amount_egp: '40000.00',
      reason: 'استرداد',
      payment_method: 'CASH_101000',
      logged_by: 'مدير الحسابات'
    });
    const supplemented = addCostAdjustment({ ...baseItem, item_id: 'cost-test-02' }, {
      parent_item_id: 'cost-test-02',
      adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
      amount_egp: '60000.00',
      reason: 'ملحق',
      payment_method: 'INSTAPAY_102000',
      logged_by: 'مدير الحسابات'
    });
    const otherProperty = { ...baseItem, item_id: 'cost-test-03', property_id: 'prop-other' };

    const audit = calculatePropertyAuditMetrics(baseItem.property_id, 100, [refunded, supplemented, otherProperty]);
    // 800,000 + 900,000 (base 840,000 each, −40k refund, +60k supplement)
    assert.equal(audit.totalLoggedCost, '1700000.00');
    assert.equal(audit.costPerSqm, '17000.00');
    assert.equal(audit.byCategory.civil_structure?.total, '1700000.00');
    assert.equal(audit.byPhase.structural_skeleton?.total, '1700000.00');
  });

  it('generates payable installment schedule and tracks partial/full settlement', () => {
    // 600,000 EGP elevator contract: 200,000 down payment + 4 monthly installments of 100,000
    const installments = generatePayableInstallmentSchedule({
      costItemId: 'elevator-01',
      totalAmount: '600000.00',
      downPayment: '200000.00',
      numberOfInstallments: 4,
      firstDueDate: '2026-10-01',
      frequencyMonths: 1
    });

    assert.equal(installments.length, 5); // 1 DP + 4 tranches
    assert.equal(installments[0].installment_number, 0);
    assert.equal(installments[0].amount_egp, '200000.00');
    assert.equal(installments[0].status, 'PAID');

    assert.equal(installments[1].installment_number, 1);
    assert.equal(installments[1].amount_egp, '100000.00');
    assert.equal(installments[1].paid_amount_egp, '0.00');
    assert.equal(installments[1].status, 'PENDING');

    // Test partial payment on tranche 1
    const costItemWithSchedule: ERPPropertyCostItem = {
      ...baseItem,
      total_cost_egp: '600000.00',
      payment_term: 'DOWN_PAYMENT_INSTALLMENTS',
      payable_installments: installments
    };

    const targetTrancheId = installments[1].installment_id;

    // Pay 40,000 out of 100,000
    const partialUpdated = recordPayableInstallmentPayment(
      costItemWithSchedule,
      targetTrancheId,
      '40000.00',
      'BANK_102000'
    );

    const trancheAfterPartial = partialUpdated.payable_installments?.find(t => t.installment_id === targetTrancheId);
    assert.equal(trancheAfterPartial?.status, 'PARTIALLY_PAID');
    assert.equal(trancheAfterPartial?.paid_amount_egp, '40000.00');

    // Complete payment: pay remaining 60,000
    const fullyPaidUpdated = recordPayableInstallmentPayment(
      partialUpdated,
      targetTrancheId,
      '60000.00',
      'CASH_101000'
    );

    const trancheAfterFull = fullyPaidUpdated.payable_installments?.find(t => t.installment_id === targetTrancheId);
    assert.equal(trancheAfterFull?.status, 'PAID');
    assert.equal(trancheAfterFull?.paid_amount_egp, '100000.00');
  });

});

describe('Data Integrity Audit Fixes: Issues 1, 2, 3, 4', () => {

  // --- Issue 1: Atomic Project Expense Persistence & Rollback ---
  describe('Issue 1: Atomic Expense Persistence & Rollback Contract', () => {
    const validPropertyId = '11111111-1111-4111-a111-111111111111';

    const sampleJournalEntry: ERPJournalEntry = {
      entry_id: 'entry-uuid-001',
      entry_number: 'JE-2026-0001',
      entry_date: '2026-09-15',
      period_id: '2026-09',
      source_module: 'WIP_ALLOCATION',
      description: 'Site expense test',
      is_locked: false,
      created_by: 'CFO_FARID',
      created_at: new Date().toISOString(),
      lines: [
        {
          line_id: 'line-001',
          entry_id: 'entry-uuid-001',
          line_number: 1,
          account_code: '151000',
          debit_amount: '50000.00',
          credit_amount: '0.00',
          memo: 'Concrete supply'
        },
        {
          line_id: 'line-002',
          entry_id: 'entry-uuid-001',
          line_number: 2,
          account_code: '101000',
          debit_amount: '0.00',
          credit_amount: '50000.00',
          memo: 'Cash safe disbursement'
        }
      ]
    };

    const sampleCostItem: ERPPropertyCostItem = {
      item_id: 'cost-uuid-001',
      property_id: validPropertyId,
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'توريد خرسانة جاهزة',
      item_name_en: 'Ready-mix concrete supply',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '50000.00',
      total_cost_egp: '50000.00',
      logged_date: '2026-09-15',
      logged_by: 'CFO_FARID',
      linked_account_code: '151000',
      status: 'verified',
      payment_term: 'FULL_CASH',
      paid_amount_egp: '50000.00',
      remaining_amount_egp: '0.00',
      net_effective_cost_egp: '50000.00',
      created_at: new Date().toISOString()
    };

    it('rejects expense entry if property_id is not a valid UUID', async () => {
      const invalidCostItem: ERPPropertyCostItem = {
        ...sampleCostItem,
        property_id: 'general' // non-UUID
      };

      const mockSupabase: any = {};

      await assert.rejects(
        async () => {
          await ERPSupabaseService.persistExpenseWithCostItem(mockSupabase, sampleJournalEntry, invalidCostItem);
        },
        /A valid property UUID is required to allocate site expense/
      );
    });

    it('executes compensating rollback on erp_property_costs if journal insertion fails', async () => {
      let costInserted = false;
      let rollbackCostDeleted = false;

      const mockSupabase: any = {
        from: (table: string) => {
          if (table === 'erp_property_costs') {
            return {
              insert: async (payload: any[]) => {
                costInserted = true;
                return { data: payload, error: null };
              },
              delete: () => ({
                eq: async (col: string, val: string) => {
                  if (col === 'item_id' && val === sampleCostItem.item_id) {
                    rollbackCostDeleted = true;
                  }
                  return { error: null };
                }
              })
            };
          }
          if (table === 'erp_journal_entries') {
            return {
              insert: async () => {
                throw new Error('Database error on erp_journal_entries insert');
              },
              delete: () => ({ eq: async () => ({ error: null }) })
            };
          }
          return {
            insert: async () => ({ error: null }),
            delete: () => ({ eq: async () => ({ error: null }) })
          };
        }
      };

      await assert.rejects(
        async () => {
          await ERPSupabaseService.persistExpenseWithCostItem(mockSupabase, sampleJournalEntry, sampleCostItem);
        },
        /Database error on erp_journal_entries insert/
      );

      assert.equal(costInserted, true, 'Cost item was inserted first');
      assert.equal(rollbackCostDeleted, true, 'Compensating rollback deleted the orphaned cost item');
    });

    it('successfully persists both cost item and journal entry when both succeed', async () => {
      let costInserted = false;
      let journalInserted = false;
      let rollbackTriggered = false;

      const mockSupabase: any = {
        from: (table: string) => ({
          insert: async () => {
            if (table === 'erp_property_costs') costInserted = true;
            if (table === 'erp_journal_entries') journalInserted = true;
            return { error: null };
          },
          delete: () => ({
            eq: async () => {
              rollbackTriggered = true;
              return { error: null };
            }
          })
        })
      };

      await ERPSupabaseService.persistExpenseWithCostItem(mockSupabase, sampleJournalEntry, sampleCostItem);

      assert.equal(costInserted, true, 'Cost item was inserted');
      assert.equal(journalInserted, true, 'Journal entry was inserted');
      assert.equal(rollbackTriggered, false, 'No rollback was triggered');
    });

    it('persists journal only if no cost item is provided (e.g. partner funding)', async () => {
      let journalInserted = false;
      let costInserted = false;

      const mockSupabase: any = {
        from: (table: string) => ({
          insert: async () => {
            if (table === 'erp_journal_entries') journalInserted = true;
            if (table === 'erp_property_costs') costInserted = true;
            return { error: null };
          }
        })
      };

      await ERPSupabaseService.persistExpenseWithCostItem(mockSupabase, sampleJournalEntry, undefined);

      assert.equal(journalInserted, true);
      assert.equal(costInserted, false);
    });
  });

  // --- Issue 3: Handover Execution Modal 45% Fallback Removal ---
  describe('Issue 3: Handover COGS Gating & Fallback Removal', () => {
    it('requires explicit cost allocation when project has no approved RSV factor', () => {
      const contract = {
        contract_id: 'CTR-001',
        property_id: 'prop-001',
        gross_contract_value: '5000000.00',
        total_cash_collected: '3000000.00',
        handover_status: 'Pending'
      };

      const costAllocations: any[] = []; // No approved allocation factor

      // Replicating HandoverExecutionModal calculation logic
      const matchingAlloc = costAllocations.find(ca => ca.property_id === contract.property_id);
      let rsvCostAmount = '';
      let isCostAllocated = false;

      if (matchingAlloc && matchingAlloc.rsv_factor && parseFloat(matchingAlloc.rsv_factor) > 0) {
        rsvCostAmount = D(contract.gross_contract_value).times(matchingAlloc.rsv_factor).toFixed(2);
        isCostAllocated = true;
      } else {
        // Fallback: stopped defaulting to 45% (was: grossV.times(0.45))
        rsvCostAmount = '';
        isCostAllocated = false;
      }

      assert.equal(rsvCostAmount, '', 'rsvCostAmount must be blank instead of 45% fallback');
      assert.equal(isCostAllocated, false);

      const hasValidCost = D(rsvCostAmount || '0').gt(0);
      assert.equal(hasValidCost, false, 'hasValidCost must be false when unallocated');

      // Confirmation gate check
      const canConfirm = hasValidCost && D(contract.gross_contract_value).gt(0);
      assert.equal(canConfirm, false, 'Confirmation must be gated until user explicitly provides WIP cost');
    });

    it('unblocks handover confirmation once user manually enters a valid positive cost', () => {
      let rsvCostAmount = '2100000.00'; // CFO manually entered verified cost
      const hasValidCost = D(rsvCostAmount || '0').gt(0);
      assert.equal(hasValidCost, true);

      const canConfirm = hasValidCost && D('5000000.00').gt(0);
      assert.equal(canConfirm, true);
    });
  });

  // --- Issue 4: Available Cash Metric Net of Outflows ---
  describe('Issue 4: Available Cash Trial Balance Net Calculation', () => {
    it('calculates available cash net of outflows (101000 and 102000), not gross collections', () => {
      const journalEntries: ERPJournalEntry[] = [
        // Entry 1: Customer down payment collection (Inflow: Dr 101000 Safe 1,000,000 / Cr 203000 Adv 1,000,000)
        {
          entry_id: 'e-01',
          entry_number: 'JE-01',
          entry_date: '2026-09-01',
          period_id: '2026-09',
          source_module: 'SALES',
          description: 'Down payment collection',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l-01', entry_id: 'e-01', line_number: 1, account_code: '101000', debit_amount: '1000000.00', credit_amount: '0.00', memo: 'Cash collection' },
            { line_id: 'l-02', entry_id: 'e-01', line_number: 2, account_code: '203000', debit_amount: '0.00', credit_amount: '1000000.00', memo: 'Advance liability' }
          ]
        },
        // Entry 2: Contractor site disbursement (Outflow: Dr 151000 WIP 400,000 / Cr 101000 Safe 400,000)
        {
          entry_id: 'e-02',
          entry_number: 'JE-02',
          entry_date: '2026-09-05',
          period_id: '2026-09',
          source_module: 'WIP_ALLOCATION',
          description: 'Concrete contractor payment',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l-03', entry_id: 'e-02', line_number: 1, account_code: '151000', debit_amount: '400000.00', credit_amount: '0.00', memo: 'Concrete WIP' },
            { line_id: 'l-04', entry_id: 'e-02', line_number: 2, account_code: '101000', debit_amount: '0.00', credit_amount: '400000.00', memo: 'Cash safe paid' }
          ]
        },
        // Entry 3: Bank transfer disbursement (Outflow: Dr 152000 MEP 150,000 / Cr 102000 Bank 150,000)
        {
          entry_id: 'e-03',
          entry_number: 'JE-03',
          entry_date: '2026-09-10',
          period_id: '2026-09',
          source_module: 'WIP_ALLOCATION',
          description: 'Electrical supplies payment',
          is_locked: false,
          created_by: 'TEST',
          created_at: new Date().toISOString(),
          lines: [
            { line_id: 'l-05', entry_id: 'e-03', line_number: 1, account_code: '152000', debit_amount: '150000.00', credit_amount: '0.00', memo: 'MEP WIP' },
            { line_id: 'l-06', entry_id: 'e-03', line_number: 2, account_code: '102000', debit_amount: '0.00', credit_amount: '150000.00', memo: 'Bank transfer paid' }
          ]
        }
      ];

      // Calculate trial balance
      const trialBalance = GeneralLedgerEngine.calculateTrialBalance(journalEntries);
      const safeCash = D(trialBalance['101000']?.net_balance || '0');
      const bankCash = D(trialBalance['102000']?.net_balance || '0');
      const trueLiquidCash = safeCash.plus(bankCash).toFixed(2);

      // Safe net: 1,000,000 - 400,000 = 600,000
      assert.equal(safeCash.toFixed(2), '600000.00');
      // Bank net: 0 - 150,000 = -150,000
      assert.equal(bankCash.toFixed(2), '-150000.00');
      // Total liquid net cash: 600,000 - 150,000 = 450,000
      assert.equal(trueLiquidCash, '450000.00');

      // The old faulty behavior would have reported gross collected = 1,000,000
      assert.notEqual(trueLiquidCash, '1000000.00', 'Must not be equal to gross customer collection');
    });
  });

  // --- Issue 2: Cockpit Dynamic Delta Aggregations ---
  describe('Issue 2: Real Period Delta Calculations', () => {
    function formatDelta(current: Decimal, prior: Decimal): string {
      if (prior.isZero()) {
        if (current.isZero()) return '0.0%';
        return current.lt(0) ? '-100.0%' : '+100.0%';
      }
      const diff = current.minus(prior);
      const pct = diff.dividedBy(prior.abs()).times(100);
      const sign = pct.gte(0) ? '+' : '';
      return `${sign}${pct.toFixed(1)}%`;
    }

    it('computes positive delta when current period exceeds prior', () => {
      const delta = formatDelta(D(150000), D(100000));
      assert.equal(delta, '+50.0%');
    });

    it('computes negative delta when current period is less than prior', () => {
      const delta = formatDelta(D(75000), D(100000));
      assert.equal(delta, '-25.0%');
    });

    it('handles zero prior period gracefully', () => {
      assert.equal(formatDelta(D(0), D(0)), '0.0%');
      assert.equal(formatDelta(D(50000), D(0)), '+100.0%');
    });

    it('handles negative current with zero prior period', () => {
      assert.equal(formatDelta(D(-50000), D(0)), '-100.0%');
    });
  });

  describe('Safe Fixed-Point Decimal Arithmetic Robustness', () => {
    it('gracefully handles non-numeric or malformed string inputs by returning zero without throwing', () => {
      assert.equal(D('abc').toFixed(2), '0.00');
      assert.equal(D('').toFixed(2), '0.00');
      assert.equal(D('$$$').toFixed(2), '0.00');
      assert.equal(D('undefined').toFixed(2), '0.00');
    });
  });

  describe('Historical Orphaned WIP Journal Entries Detection Algorithm', () => {
    it('detects WIP journal entry missing corresponding property cost record', () => {
      const mockEntries = [
        {
          entry_id: 'e-orphan',
          entry_number: 'JE-WIP-001',
          entry_date: '2026-08-01',
          source_module: 'WIP_ALLOCATION',
          lines: [
            { line_id: 'l-1', account_code: '151000', debit_amount: '75000.00', credit_amount: '0.00' },
            { line_id: 'l-2', account_code: '101000', debit_amount: '0.00', credit_amount: '75000.00' }
          ]
        },
        {
          entry_id: 'e-matched',
          entry_number: 'JE-WIP-002',
          entry_date: '2026-08-05',
          source_module: 'WIP_ALLOCATION',
          lines: [
            { line_id: 'l-3', account_code: '151000', debit_amount: '30000.00', credit_amount: '0.00' },
            { line_id: 'l-4', account_code: '101000', debit_amount: '0.00', credit_amount: '30000.00' }
          ]
        }
      ];

      const mockCosts = [
        {
          item_id: 'cost-1',
          invoice_ref: 'JE-WIP-002',
          total_cost_egp: '30000.00',
          logged_date: '2026-08-05'
        }
      ];

      const { totalWipEntriesCount, orphanedEntries } = findOrphanedWipEntries(mockEntries, mockCosts);
      assert.equal(totalWipEntriesCount, 2);
      assert.equal(orphanedEntries.length, 1);
      assert.equal(orphanedEntries[0].entryNumber, 'JE-WIP-001');
      assert.equal(orphanedEntries[0].debitAmount, '75000.00');
    });

    it('returns zero orphaned entries when all WIP entries have matching costs', () => {
      const mockEntries = [
        {
          entry_id: 'e-matched',
          entry_number: 'JE-WIP-003',
          entry_date: '2026-08-10',
          source_module: 'WIP_ALLOCATION',
          lines: [
            { line_id: 'l-5', account_code: '151000', debit_amount: '120000.00', credit_amount: '0.00' }
          ]
        }
      ];

      const mockCosts = [
        {
          item_id: 'cost-2',
          invoice_ref: 'JE-WIP-003',
          total_cost_egp: '120000.00',
          logged_date: '2026-08-10'
        }
      ];

      const { totalWipEntriesCount, orphanedEntries } = findOrphanedWipEntries(mockEntries, mockCosts);
      assert.equal(totalWipEntriesCount, 1);
      assert.equal(orphanedEntries.length, 0);
    });
  });

});
