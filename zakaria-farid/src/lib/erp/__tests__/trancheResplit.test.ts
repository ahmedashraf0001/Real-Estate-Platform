import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { 
  resplitUnpaidInstallments,
  buildCostCorrectionJournalLines, 
  calculateCostItemEffectiveTotals
} from '../propertyCostEngine';
import { GeneralLedgerEngine } from '../ledger';
import { ERPAccountingPeriod, ERPJournalEntry, ERPPropertyCostItem, ERPPayableInstallment } from '../types';
import { D } from '../math';

describe('fin-c1-tranche-resplit: Payable Installments Resplit on Cost Item Edit', () => {
  // T1: 7 unpaid tranches summing 1,000,001, new total 1,000,000: 7 tranches, sum exactly 1,000,000, first six equal, last absorbs rounding.
  it('T1: 7 unpaid tranches summing 1,000,001, new total 1,000,000', () => {
    const tranches: ERPPayableInstallment[] = [
      {
        installment_id: 'inst-1',
        cost_item_id: 'c1729fd2',
        installment_number: 1,
        title_ar: 'القسط الإنشائي رقم 1',
        due_date: '2026-11-01',
        amount_egp: '142857.29',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-2',
        cost_item_id: 'c1729fd2',
        installment_number: 2,
        title_ar: 'القسط الإنشائي رقم 2',
        due_date: '2026-12-01',
        amount_egp: '142857.29',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-3',
        cost_item_id: 'c1729fd2',
        installment_number: 3,
        title_ar: 'القسط الإنشائي رقم 3',
        due_date: '2027-01-01',
        amount_egp: '142857.29',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-4',
        cost_item_id: 'c1729fd2',
        installment_number: 4,
        title_ar: 'القسط الإنشائي رقم 4',
        due_date: '2027-02-01',
        amount_egp: '142857.29',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-5',
        cost_item_id: 'c1729fd2',
        installment_number: 5,
        title_ar: 'القسط الإنشائي رقم 5',
        due_date: '2027-03-01',
        amount_egp: '142857.29',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-6',
        cost_item_id: 'c1729fd2',
        installment_number: 6,
        title_ar: 'القسط الإنشائي رقم 6',
        due_date: '2027-04-01',
        amount_egp: '142857.28',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-7',
        cost_item_id: 'c1729fd2',
        installment_number: 7,
        title_ar: 'القسط الإنشائي رقم 7',
        due_date: '2027-05-01',
        amount_egp: '142857.27',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      }
    ];

    // Initial tranches sum to 1,000,001.00
    const initialSum = tranches.reduce((acc, inst) => acc.plus(inst.amount_egp), D(0));
    assert.equal(initialSum.toFixed(2), '1000001.00');

    const result = resplitUnpaidInstallments(tranches, '1000000.00');

    assert.equal(result.length, 7);

    // First six must be equal: 142,857.14
    for (let i = 0; i < 6; i++) {
      assert.equal(result[i].amount_egp, '142857.14');
      assert.equal(result[i].paid_amount_egp, '0.00');
      assert.equal(result[i].status, 'PENDING');
    }

    // Seventh (last) absorbs rounding: 142,857.16
    assert.equal(result[6].amount_egp, '142857.16');
    assert.equal(result[6].paid_amount_egp, '0.00');
    assert.equal(result[6].status, 'PENDING');

    // Sum of amount_egp must equal 1,000,000.00 exactly
    const newSum = result.reduce((acc, inst) => acc.plus(inst.amount_egp), D(0));
    assert.equal(newSum.toFixed(2), '1000000.00');
  });

  // T2: 3 tranches of 100,000; first fully paid, second paid 40,000; new total 360,000:
  // tranche 1 unchanged (100,000 paid), tranche 2 paid 40,000 stays, sum = 360,000,
  // unpaid remainder 220,000 split evenly over tranches 2 and 3.
  it('T2: 3 tranches of 100,000; first fully paid, second paid 40,000; new total 360,000', () => {
    const tranches: ERPPayableInstallment[] = [
      {
        installment_id: 'inst-1',
        cost_item_id: 'cost-item-2',
        installment_number: 1,
        title_ar: 'الدفعة الأولى',
        due_date: '2026-11-01',
        amount_egp: '100000.00',
        paid_amount_egp: '100000.00',
        status: 'PAID'
      },
      {
        installment_id: 'inst-2',
        cost_item_id: 'cost-item-2',
        installment_number: 2,
        title_ar: 'الدفعة الثانية',
        due_date: '2026-12-01',
        amount_egp: '100000.00',
        paid_amount_egp: '40000.00',
        status: 'PARTIALLY_PAID'
      },
      {
        installment_id: 'inst-3',
        cost_item_id: 'cost-item-2',
        installment_number: 3,
        title_ar: 'الدفعة الثالثة',
        due_date: '2027-01-01',
        amount_egp: '100000.00',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      }
    ];

    const result = resplitUnpaidInstallments(tranches, '360000.00');

    assert.equal(result.length, 3);

    // Tranche 1 unchanged (100,000 paid)
    assert.equal(result[0].amount_egp, '100000.00');
    assert.equal(result[0].paid_amount_egp, '100000.00');
    assert.equal(result[0].status, 'PAID');

    // Tranche 2 paid 40,000 stays; unpaid remainder 220,000 split evenly (110,000 each)
    // Tranche 2 amount = paid (40,000) + share (110,000) = 150,000
    assert.equal(result[1].paid_amount_egp, '40000.00');
    assert.equal(result[1].amount_egp, '150000.00');
    assert.equal(result[1].status, 'PARTIALLY_PAID');

    // Tranche 3 amount = paid (0) + share (110,000) = 110,000
    assert.equal(result[2].paid_amount_egp, '0.00');
    assert.equal(result[2].amount_egp, '110000.00');
    assert.equal(result[2].status, 'PENDING');

    // Sum must equal 360,000.00
    const newSum = result.reduce((acc, inst) => acc.plus(inst.amount_egp), D(0));
    assert.equal(newSum.toFixed(2), '360000.00');

    // Unpaid remainder is 220,000:
    const unpaidT2 = D(result[1].amount_egp).minus(result[1].paid_amount_egp);
    const unpaidT3 = D(result[2].amount_egp).minus(result[2].paid_amount_egp);
    assert.equal(unpaidT2.toFixed(2), '110000.00');
    assert.equal(unpaidT3.toFixed(2), '110000.00');
    assert.equal(unpaidT2.plus(unpaidT3).toFixed(2), '220000.00');
  });

  // T3: new total below total paid throws.
  it('T3: new total below total paid throws', () => {
    const tranches: ERPPayableInstallment[] = [
      {
        installment_id: 'inst-1',
        cost_item_id: 'cost-item-3',
        installment_number: 1,
        title_ar: 'الدفعة الأولى',
        due_date: '2026-11-01',
        amount_egp: '100000.00',
        paid_amount_egp: '100000.00',
        status: 'PAID'
      },
      {
        installment_id: 'inst-2',
        cost_item_id: 'cost-item-3',
        installment_number: 2,
        title_ar: 'الدفعة الثانية',
        due_date: '2026-12-01',
        amount_egp: '100000.00',
        paid_amount_egp: '40000.00',
        status: 'PARTIALLY_PAID'
      },
      {
        installment_id: 'inst-3',
        cost_item_id: 'cost-item-3',
        installment_number: 3,
        title_ar: 'الدفعة الثالثة',
        due_date: '2027-01-01',
        amount_egp: '100000.00',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      }
    ];

    // Total paid = 140,000.00
    assert.throws(
      () => resplitUnpaidInstallments(tranches, '139999.00'),
      /cannot be less than|أقل من/i
    );
    assert.throws(
      () => resplitUnpaidInstallments(tranches, '50000.00'),
      /cannot be less than|أقل من/i
    );
    assert.throws(
      () => resplitUnpaidInstallments(tranches, 0),
      /cannot be less than|أقل من/i
    );
  });

  // F1.1: Seven pending rows with paid 0.00, total 0.04
  it('F1.1: seven pending rows with paid 0.00, total 0.04, first six 0.00, last 0.04, sum 0.04, every amount >= paid', () => {
    const tranches: ERPPayableInstallment[] = Array.from({ length: 7 }, (_, i) => ({
      installment_id: `inst-${i + 1}`,
      cost_item_id: 'cost-tiny',
      installment_number: i + 1,
      title_ar: `قسط ${i + 1}`,
      due_date: '2026-11-01',
      amount_egp: '100.00',
      paid_amount_egp: '0.00',
      status: 'PENDING'
    }));

    const result = resplitUnpaidInstallments(tranches, '0.04');
    assert.equal(result.length, 7);
    for (let i = 0; i < 6; i++) {
      assert.equal(result[i].amount_egp, '0.00');
      assert.equal(result[i].paid_amount_egp, '0.00');
      assert.ok(D(result[i].amount_egp).gte(D(result[i].paid_amount_egp)));
    }
    assert.equal(result[6].amount_egp, '0.04');
    assert.equal(result[6].paid_amount_egp, '0.00');
    assert.ok(D(result[6].amount_egp).gte(D(result[6].paid_amount_egp)));

    const sum = result.reduce((acc, inst) => acc.plus(inst.amount_egp), D(0));
    assert.equal(sum.toFixed(2), '0.04');
  });

  // F1.2: Partly-paid row and tiny remaining amount respects floor
  it('F1.2: partly-paid row and tiny remaining amount, paid unchanged and floors respected', () => {
    const tranches: ERPPayableInstallment[] = [
      {
        installment_id: 'inst-1',
        cost_item_id: 'cost-part',
        installment_number: 1,
        title_ar: 'قسط 1',
        due_date: '2026-11-01',
        amount_egp: '100.00',
        paid_amount_egp: '100.00',
        status: 'PAID'
      },
      {
        installment_id: 'inst-2',
        cost_item_id: 'cost-part',
        installment_number: 2,
        title_ar: 'قسط 2',
        due_date: '2026-12-01',
        amount_egp: '100.00',
        paid_amount_egp: '40.00',
        status: 'PARTIALLY_PAID'
      },
      {
        installment_id: 'inst-3',
        cost_item_id: 'cost-part',
        installment_number: 3,
        title_ar: 'قسط 3',
        due_date: '2027-01-01',
        amount_egp: '100.00',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      }
    ];

    // Total paid = 140.00. New total = 140.03. Remaining = 0.03.
    // 2 unpaid rows. 0.03 / 2: share 1 = 0.01, share 2 = 0.02.
    const result = resplitUnpaidInstallments(tranches, '140.03');
    assert.equal(result[0].paid_amount_egp, '100.00');
    assert.equal(result[0].amount_egp, '100.00');
    assert.equal(result[1].paid_amount_egp, '40.00');
    assert.equal(result[1].amount_egp, '40.01');
    assert.equal(result[2].paid_amount_egp, '0.00');
    assert.equal(result[2].amount_egp, '0.02');

    for (const inst of result) {
      assert.ok(D(inst.amount_egp).gte(D(inst.paid_amount_egp)), `Floor violated for ${inst.installment_id}`);
    }
    const sum = result.reduce((acc, inst) => acc.plus(inst.amount_egp), D(0));
    assert.equal(sum.toFixed(2), '140.03');
  });

  // F3.1: Pure helper rejects nonzero remaining when all tranches are paid
  it('F3.1: pure helper rejects nonzero remaining when all tranches are paid', () => {
    const tranches: ERPPayableInstallment[] = [
      {
        installment_id: 'inst-paid-1',
        cost_item_id: 'cost-all-paid',
        installment_number: 1,
        title_ar: 'قسط مدفوع',
        due_date: '2026-11-01',
        amount_egp: '100.00',
        paid_amount_egp: '100.00',
        status: 'PAID'
      }
    ];
    assert.throws(
      () => resplitUnpaidInstallments(tranches, '120.00'),
      /No unpaid tranches available/i
    );
  });

  // F3.2: All-paid exact total succeeds unchanged
  it('F3.2: all-paid exact total succeeds unchanged', () => {
    const tranches: ERPPayableInstallment[] = [
      {
        installment_id: 'inst-paid-1',
        cost_item_id: 'cost-all-paid',
        installment_number: 1,
        title_ar: 'قسط مدفوع',
        due_date: '2026-11-01',
        amount_egp: '100.00',
        paid_amount_egp: '100.00',
        status: 'PAID'
      }
    ];
    const result = resplitUnpaidInstallments(tranches, '100.00');
    assert.equal(result.length, 1);
    assert.equal(result[0].amount_egp, '100.00');
    assert.equal(result[0].paid_amount_egp, '100.00');
    assert.equal(result[0].status, 'PAID');
  });

  // F3.3: Real edit handler rejects when all tranches are paid and total changes, with zero writes
  it('F3.3: real edit-handler rejects when all tranches are paid and total changes, zero writes, unchanged state', async () => {
    const factory = getContextHandlerFactory('handleUpdatePropertyCostItem');
    const dbCalls: any[] = [];
    const journalCalls: ERPJournalEntry[] = [];

    const defaultPeriod: ERPAccountingPeriod = {
      period_id: 'period-2026-10',
      fiscal_year: 2026,
      period_number: 10,
      start_date: '2026-10-01',
      end_date: '2026-10-31',
      status: 'OPEN'
    };

    const noopToast = { info: () => {}, error: () => {}, success: () => {} };

    const originalItem: ERPPropertyCostItem = {
      item_id: 'c-all-paid-item',
      property_id: 'prop-1',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      logged_date: '2026-10-01',
      item_name_ar: 'بند مدفوع بالكامل',
      item_name_en: 'Fully Paid Item',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '100.00',
      total_cost_egp: '100.00',
      created_at: new Date().toISOString(),
      payment_term: 'FULL_CASH',
      paid_amount_egp: '100.00',
      remaining_amount_egp: '0.00',
      net_effective_cost_egp: '100.00',
      logged_by: 'CFO_FARID',
      status: 'verified',
      payable_installments: [
        {
          installment_id: 'inst-paid-1',
          cost_item_id: 'c-all-paid-item',
          installment_number: 1,
          title_ar: 'دفعة مسددة',
          due_date: '2026-10-01',
          amount_egp: '100.00',
          paid_amount_egp: '100.00',
          status: 'PAID'
        }
      ]
    };

    let state = {
      propertyCosts: [originalItem],
      journalEntries: [] as ERPJournalEntry[]
    };

    const handler = factory(
      state,
      (fn: any) => { state = typeof fn === 'function' ? fn(state) : fn; },
      true,
      () => {},
      {},
      { id: 'usr-1' },
      async () => defaultPeriod,
      () => true,
      async (e: any) => { journalCalls.push(e); },
      {
        updatePropertyCostItem: async (_s: any, item: any) => { dbCalls.push(['update', item]); }
      },
      D,
      buildCostCorrectionJournalLines,
      calculateCostItemEffectiveTotals,
      GeneralLedgerEngine,
      noopToast,
      resplitUnpaidInstallments
    );

    const editedItem: ERPPropertyCostItem = {
      ...originalItem,
      total_cost_egp: '120.00'
    };

    await assert.rejects(
      async () => handler(editedItem),
      /No unpaid tranches available/i
    );

    assert.equal(dbCalls.length, 0, 'Zero cost writes on rejection');
    assert.equal(journalCalls.length, 0, 'Zero journal writes on rejection');
    assert.equal(state.propertyCosts[0].total_cost_egp, '100.00', 'Local state total unchanged');
    assert.equal(state.propertyCosts[0].payable_installments![0].amount_egp, '100.00', 'Local state installments unchanged');
    assert.equal(state.journalEntries.length, 0, 'Local journalEntries unchanged');
  });

  // F4: Zero-paid OVERDUE becomes PENDING, partly-paid stays PARTIALLY_PAID, paid stays PAID, metadata preserved
  it('F4: zero-paid OVERDUE row becomes PENDING on re-split; partly-paid stays PARTIALLY_PAID; paid stays PAID; metadata preserved', () => {
    const tranches: ERPPayableInstallment[] = [
      {
        installment_id: 'inst-overdue',
        cost_item_id: 'cost-status',
        installment_number: 1,
        title_ar: 'قسط متأخر',
        title_en: 'Overdue Tranche',
        due_date: '2026-09-01',
        amount_egp: '50000.00',
        paid_amount_egp: '0.00',
        status: 'OVERDUE',
        notes: 'ملاحظة خاصة',
        payment_method: 'BANK_102000'
      },
      {
        installment_id: 'inst-partial',
        cost_item_id: 'cost-status',
        installment_number: 2,
        title_ar: 'قسط جزئي',
        title_en: 'Partial Tranche',
        due_date: '2026-10-01',
        amount_egp: '50000.00',
        paid_amount_egp: '20000.00',
        status: 'PARTIALLY_PAID',
        notes: 'دفعة جزئية',
        payment_method: 'CASH_101000'
      },
      {
        installment_id: 'inst-paid',
        cost_item_id: 'cost-status',
        installment_number: 3,
        title_ar: 'قسط مسدد',
        title_en: 'Paid Tranche',
        due_date: '2026-08-01',
        amount_egp: '30000.00',
        paid_amount_egp: '30000.00',
        status: 'PAID',
        notes: 'مسدد بالكامل'
      }
    ];

    // Total paid = 50,000.00. New total = 110,000.00. Remaining = 60,000.00.
    // 2 unpaid rows (inst-overdue, inst-partial).
    // Share each = 30,000.00.
    const result = resplitUnpaidInstallments(tranches, '110000.00');

    // Overdue zero-paid becomes PENDING per task specification
    assert.equal(result[0].status, 'PENDING');
    assert.equal(result[0].installment_id, 'inst-overdue');
    assert.equal(result[0].title_ar, 'قسط متأخر');
    assert.equal(result[0].title_en, 'Overdue Tranche');
    assert.equal(result[0].due_date, '2026-09-01');
    assert.equal(result[0].notes, 'ملاحظة خاصة');
    assert.equal(result[0].payment_method, 'BANK_102000');
    assert.equal(result[0].amount_egp, '30000.00');
    assert.equal(result[0].paid_amount_egp, '0.00');

    // Partly paid stays PARTIALLY_PAID with positive share
    assert.equal(result[1].status, 'PARTIALLY_PAID');
    assert.equal(result[1].installment_id, 'inst-partial');
    assert.equal(result[1].amount_egp, '50000.00'); // 20k + 30k
    assert.equal(result[1].paid_amount_egp, '20000.00');
    assert.equal(result[1].notes, 'دفعة جزئية');
    assert.equal(result[1].payment_method, 'CASH_101000');

    // Paid row stays PAID unchanged
    assert.equal(result[2].status, 'PAID');
    assert.equal(result[2].installment_id, 'inst-paid');
    assert.equal(result[2].amount_egp, '30000.00');
    assert.equal(result[2].paid_amount_egp, '30000.00');
    assert.equal(result[2].notes, 'مسدد بالكامل');
  });

  // F5: Empty or undefined installments returns input unchanged
  it('F5: handles empty or undefined installments returning input unchanged', () => {
    assert.strictEqual(resplitUnpaidInstallments(undefined, '500000.00'), undefined);
    const empty: ERPPayableInstallment[] = [];
    assert.strictEqual(resplitUnpaidInstallments(empty, '500000.00'), empty);
  });

  // F2: Module import does not create globalThis.resplitUnpaidInstallments
  it('F2: module import does not create globalThis.resplitUnpaidInstallments', () => {
    assert.equal((globalThis as any).resplitUnpaidInstallments, undefined);
  });

  // T4: Handler-level (smallest existing seam): editing an item's total rewrites its installments so they sum to the new net total.
  it('T4: Handler-level seam rewrites installments to sum to new net total', async () => {
    const factory = getContextHandlerFactory('handleUpdatePropertyCostItem');
    const dbCalls: any[] = [];
    const journalCalls: ERPJournalEntry[] = [];

    const defaultPeriod: ERPAccountingPeriod = {
      period_id: 'period-2026-10',
      fiscal_year: 2026,
      period_number: 10,
      start_date: '2026-10-01',
      end_date: '2026-10-31',
      status: 'OPEN'
    };

    const noopToast = {
      info: () => {},
      error: () => {},
      success: () => {}
    };

    const initialTranches: ERPPayableInstallment[] = [
      {
        installment_id: 'inst-1',
        cost_item_id: 'c1729fd2',
        installment_number: 1,
        title_ar: 'القسط 1',
        due_date: '2026-11-01',
        amount_egp: '142857.29',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-2',
        cost_item_id: 'c1729fd2',
        installment_number: 2,
        title_ar: 'القسط 2',
        due_date: '2026-12-01',
        amount_egp: '142857.29',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-3',
        cost_item_id: 'c1729fd2',
        installment_number: 3,
        title_ar: 'القسط 3',
        due_date: '2027-01-01',
        amount_egp: '142857.29',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-4',
        cost_item_id: 'c1729fd2',
        installment_number: 4,
        title_ar: 'القسط 4',
        due_date: '2027-02-01',
        amount_egp: '142857.29',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-5',
        cost_item_id: 'c1729fd2',
        installment_number: 5,
        title_ar: 'القسط 5',
        due_date: '2027-03-01',
        amount_egp: '142857.29',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-6',
        cost_item_id: 'c1729fd2',
        installment_number: 6,
        title_ar: 'القسط 6',
        due_date: '2027-04-01',
        amount_egp: '142857.28',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      },
      {
        installment_id: 'inst-7',
        cost_item_id: 'c1729fd2',
        installment_number: 7,
        title_ar: 'القسط 7',
        due_date: '2027-05-01',
        amount_egp: '142857.27',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      }
    ];

    const originalItem: ERPPropertyCostItem = {
      item_id: 'c1729fd2',
      property_id: 'prop-1',
      category: 'civil_structure',
      phase: 'structural_skeleton',
      logged_date: '2026-10-01',
      item_name_ar: 'بند هيكل خرساني',
      item_name_en: 'Skeleton item',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '1000001.00',
      total_cost_egp: '1000001.00',
      created_at: new Date().toISOString(),
      payment_term: 'FULL_DEFERRED',
      paid_amount_egp: '0.00',
      remaining_amount_egp: '1000001.00',
      net_effective_cost_egp: '1000001.00',
      logged_by: 'CFO_FARID',
      status: 'verified',
      payable_installments: initialTranches
    };

    let state = {
      propertyCosts: [originalItem],
      journalEntries: [] as ERPJournalEntry[]
    };

    const handler = factory(
      state,
      (fn: any) => { state = typeof fn === 'function' ? fn(state) : fn; },
      true,
      () => {},
      {},
      { id: 'usr-1' },
      async () => defaultPeriod,
      () => true,
      async (e: any) => { journalCalls.push(e); },
      {
        updatePropertyCostItem: async (_s: any, item: any) => { dbCalls.push(['update', item]); }
      },
      D,
      buildCostCorrectionJournalLines,
      calculateCostItemEffectiveTotals,
      GeneralLedgerEngine,
      noopToast,
      resplitUnpaidInstallments
    );

    // Edit 1,000,001 -> 1,000,000
    const editedItem: ERPPropertyCostItem = {
      ...originalItem,
      total_cost_egp: '1000000.00'
    };

    await handler(editedItem);

    // Assert that the item updated in DB has installments re-split to sum to 1,000,000 exactly
    assert.equal(dbCalls.length, 1);
    const savedRow: ERPPropertyCostItem = dbCalls[0][1];
    assert.equal(savedRow.total_cost_egp, '1000000.00');
    assert.ok(savedRow.payable_installments);
    assert.equal(savedRow.payable_installments.length, 7);

    const savedSum = savedRow.payable_installments.reduce((acc, inst) => acc.plus(inst.amount_egp), D(0));
    assert.equal(savedSum.toFixed(2), '1000000.00', 'Saved installments must sum exactly to new total 1,000,000.00');

    // Assert that local state also has updated installments
    assert.equal(state.propertyCosts[0].total_cost_egp, '1000000.00');
    const stateSum = state.propertyCosts[0].payable_installments!.reduce((acc, inst) => acc.plus(inst.amount_egp), D(0));
    assert.equal(stateSum.toFixed(2), '1000000.00', 'Local state installments must sum exactly to new total 1,000,000.00');
  });
});

/**
 * Extracts and compiles the production handler from ERPWorkstationContext.tsx
 */
function getContextHandlerFactory(handlerName: string) {
  const contextFilePath = path.resolve(process.cwd(), 'src/components/admin/erp/context/ERPWorkstationContext.tsx');
  const src = fs.readFileSync(contextFilePath, 'utf8');
  const sf = ts.createSourceFile('ERPWorkstationContext.tsx', src, ts.ScriptTarget.Latest, true);

  let rawCode: string | null = null;
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sf) === handlerName) {
      if (node.initializer && ts.isCallExpression(node.initializer)) {
        rawCode = node.initializer.arguments[0].getText(sf);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (!rawCode) {
    throw new Error(`Handler ${handlerName} not found in ERPWorkstationContext.tsx`);
  }

  const transpiled = ts.transpileModule(`return (${rawCode});`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  const fn = new Function(
    'data', 'setData', 'isAr', 'setIsMutating', 'supabase', 'currentUser',
    'resolveAndEnsurePeriodForDate', 'ensureActivePeriodOpen', 'persistJournalEntryGuarded',
    'ERPSupabaseService', 'D', 'buildCostCorrectionJournalLines', 'calculateCostItemEffectiveTotals',
    'GeneralLedgerEngine', 'toast', 'resplitUnpaidInstallments',
    transpiled
  );
  return (...args: any[]) => fn(...args, resplitUnpaidInstallments);
}
