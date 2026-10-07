import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { 
  buildCostCorrectionJournalLines, 
  calculateCostItemEffectiveTotals,
  PROPERTY_COST_CATEGORIES,
  resplitUnpaidInstallments
} from '../propertyCostEngine';
import { GeneralLedgerEngine } from '../ledger';
import { ERPAccountingPeriod, ERPJournalEntry, ERPPropertyCostItem, ERPPayableInstallment } from '../types';
import { D } from '../math';

describe('fin-b1-cost-journals: Cost Correction Journals', () => {
  const dummyPeriod: ERPAccountingPeriod = {
    period_id: 'period-2026-10',
    fiscal_year: 2026,
    period_number: 10,
    start_date: '2026-10-01',
    end_date: '2026-10-31',
    status: 'OPEN'
  };

  it('T1: negative delta produces Dr 201000 and Cr category account (civil_structure -> 151000)', () => {
    const lines = buildCostCorrectionJournalLines({
      category: 'civil_structure',
      delta: '-20000',
      memo: 'm'
    });
    assert.deepEqual(lines, [
      {
        account_code: '201000',
        debit_amount: '20000.00',
        credit_amount: '0.00',
        memo: 'm'
      },
      {
        account_code: '151000',
        debit_amount: '0.00',
        credit_amount: '20000.00',
        memo: 'm'
      }
    ]);
  });

  it('T2: positive delta with fractional piastres rounds half-up and balances', () => {
    const lines = buildCostCorrectionJournalLines({
      category: 'civil_structure',
      delta: '1234.565',
      memo: 'test fraction'
    });
    assert.equal(lines.length, 2);
    // delta '1234.565' rounded with D().toFixed(2) is '1234.57'
    assert.equal(lines[0].account_code, '151000');
    assert.equal(lines[0].debit_amount, '1234.57');
    assert.equal(lines[0].credit_amount, '0.00');
    assert.equal(lines[1].account_code, '201000');
    assert.equal(lines[1].debit_amount, '0.00');
    assert.equal(lines[1].credit_amount, '1234.57');

    const sumDebit = D(lines[0].debit_amount).plus(lines[1].debit_amount);
    const sumCredit = D(lines[0].credit_amount).plus(lines[1].credit_amount);
    assert.equal(sumDebit.toFixed(2), sumCredit.toFixed(2));
  });

  it('T3: delta 0 gives []', () => {
    const lines = buildCostCorrectionJournalLines({
      category: 'civil_structure',
      delta: 0,
      memo: 'zero delta'
    });
    assert.deepEqual(lines, []);
  });

  it('T4: different category maps to its own accountCode', () => {
    const mepCategory = PROPERTY_COST_CATEGORIES.find(c => c.key === 'mep_infrastructure')!;
    assert.ok(mepCategory);
    const lines = buildCostCorrectionJournalLines({
      category: mepCategory.key,
      delta: '5000',
      memo: 'mep'
    });
    assert.equal(lines[0].account_code, mepCategory.accountCode);
    assert.equal(lines[0].debit_amount, '5000.00');
    assert.equal(lines[1].account_code, '201000');
    assert.equal(lines[1].credit_amount, '5000.00');
  });

  it('T5: Entries built for edit/adjust/delete pass GeneralLedgerEngine.validateAndCreateEntry', () => {
    const lines = buildCostCorrectionJournalLines({
      category: 'civil_structure',
      delta: '-20000',
      memo: 'Cost decrease'
    });
    const entry = GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: 'JE-WIP-EDIT-TEST0001-A1B2C3',
      entry_date: '2026-10-07',
      period: dummyPeriod,
      description: 'Cost decrease',
      source_module: 'WIP_ALLOCATION',
      source_entity_id: 'prop-123',
      created_by: 'CFO_FARID',
      lines
    });

    assert.ok(entry);
    const totalDebit = entry.lines.reduce((acc, l) => acc.plus(l.debit_amount), D(0));
    const totalCredit = entry.lines.reduce((acc, l) => acc.plus(l.credit_amount), D(0));
    assert.equal(totalDebit.toFixed(2), '20000.00');
    assert.equal(totalCredit.toFixed(2), '20000.00');
    assert.equal(totalDebit.toFixed(2), totalCredit.toFixed(2));
  });
});

/**
 * Extracts and compiles the actual production handler from ERPWorkstationContext.tsx
 * using TypeScript AST extraction and transpileModule.
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

describe('F1, F2, F3: Actual Context Handlers Execution & Proof', () => {
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

  describe('F1 [R3]: handleAddCostAdjustment robust identity and rollback', () => {
    it('F1.1: state [] + updatedItem with adjustments rejects with zero cost or journal writes', async () => {
      const factory = getContextHandlerFactory('handleAddCostAdjustment');
      const dbCalls: any[] = [];
      const journalCalls: any[] = [];
      let state = { propertyCosts: [] as ERPPropertyCostItem[], journalEntries: [] as ERPJournalEntry[] };

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
          addPropertyCostAdjustment: async (_s: any, item: any) => { dbCalls.push(['add', item]); },
          updatePropertyCostItem: async (_s: any, item: any) => { dbCalls.push(['update', item]); }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        noopToast
      );

      const staleItem: ERPPropertyCostItem = {
        item_id: 'item-stale',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'بند ملغي',
        item_name_en: 'Cancelled Item',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '1000',
        total_cost_egp: '1000',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        logged_by: 'usr',
        status: 'verified',
        adjustments: [
          {
            adjustment_id: 'aaaaaaaa',
            parent_item_id: 'item-stale',
            adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
            amount_egp: '1000',
            reason: 'old',
            created_at: new Date().toISOString(),
            logged_by: 'usr'
          },
          {
            adjustment_id: 'bbbbbbbb',
            parent_item_id: 'item-stale',
            adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
            amount_egp: '2000',
            reason: 'new',
            created_at: new Date().toISOString(),
            logged_by: 'usr'
          }
        ]
      };

      await assert.rejects(
        async () => handler(staleItem),
        /بند التكلفة الأصلي غير موجود|Original cost item not found/
      );

      assert.equal(dbCalls.length, 0, 'Must have zero DB cost writes');
      assert.equal(journalCalls.length, 0, 'Must have zero journal writes');
      assert.equal(state.journalEntries.length, 0, 'Local journalEntries must stay empty');
    });

    it('F1.2: valid original containing historical id posts only bbbbbbbb 2000', async () => {
      const factory = getContextHandlerFactory('handleAddCostAdjustment');
      const dbCalls: any[] = [];
      const journalCalls: ERPJournalEntry[] = [];

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-active',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة مسلحة',
        item_name_en: 'Concrete',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '50000',
        total_cost_egp: '50000',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        logged_by: 'usr',
        status: 'verified',
        adjustments: [
          {
            adjustment_id: 'aaaaaaaa',
            parent_item_id: 'item-active',
            adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
            amount_egp: '1000',
            reason: 'first adjustment',
            created_at: new Date().toISOString(),
            logged_by: 'usr'
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
          addPropertyCostAdjustment: async (_s: any, item: any) => { dbCalls.push(['add', item]); },
          updatePropertyCostItem: async (_s: any, item: any) => { dbCalls.push(['update', item]); }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        noopToast
      );

      const updatedItem: ERPPropertyCostItem = {
        ...originalItem,
        adjustments: [
          ...originalItem.adjustments!,
          {
            adjustment_id: 'bbbbbbbb',
            parent_item_id: 'item-active',
            adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
            amount_egp: '2000',
            reason: 'second adjustment',
            created_at: new Date().toISOString(),
            logged_by: 'usr'
          }
        ]
      };

      await handler(updatedItem);

      assert.equal(dbCalls.length, 1, 'Exactly one DB write to add adjustment');
      assert.equal(journalCalls.length, 1, 'Exactly one journal posted');
      assert.equal(journalCalls[0].entry_number, 'JE-WIP-ADJ-BBBBBBBB');
      const lines = journalCalls[0].lines;
      assert.equal(lines.find(l => l.account_code === '151000')?.debit_amount, '2000.00');
      assert.equal(lines.find(l => l.account_code === '201000')?.credit_amount, '2000.00');
      assert.equal(state.journalEntries.length, 1);
    });

    it('F1.3: unknown/missing/multiple new identity must not write', async () => {
      const factory = getContextHandlerFactory('handleAddCostAdjustment');
      const dbCalls: any[] = [];
      const journalCalls: any[] = [];

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-active',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة',
        item_name_en: 'Concrete',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '50000',
        total_cost_egp: '50000',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        logged_by: 'usr',
        status: 'verified',
        adjustments: [
          {
            adjustment_id: 'aaaaaaaa',
            parent_item_id: 'item-active',
            adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
            amount_egp: '1000',
            reason: 'first',
            created_at: new Date().toISOString(),
            logged_by: 'usr'
          }
        ]
      };

      let state = { propertyCosts: [originalItem], journalEntries: [] as ERPJournalEntry[] };

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
          addPropertyCostAdjustment: async (_s: any, item: any) => { dbCalls.push(['add', item]); },
          updatePropertyCostItem: async (_s: any, item: any) => { dbCalls.push(['update', item]); }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        noopToast
      );

      // Multiple new adjustments
      const multipleItem: ERPPropertyCostItem = {
        ...originalItem,
        adjustments: [
          ...originalItem.adjustments!,
          {
            adjustment_id: 'bbbbbbbb',
            parent_item_id: 'item-active',
            adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
            amount_egp: '2000',
            reason: 'two',
            created_at: new Date().toISOString(),
            logged_by: 'usr'
          },
          {
            adjustment_id: 'cccccccc',
            parent_item_id: 'item-active',
            adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
            amount_egp: '3000',
            reason: 'three',
            created_at: new Date().toISOString(),
            logged_by: 'usr'
          }
        ]
      };

      await assert.rejects(
        async () => handler(multipleItem),
        /Multiple new adjustments found|أكثر من تسوية جديدة/
      );
      assert.equal(dbCalls.length, 0);
      assert.equal(journalCalls.length, 0);

      // Zero new adjustments
      await assert.rejects(
        async () => handler(originalItem),
        /No new adjustment with valid adjustment_id found|لم يتم العثور على أي تسوية جديدة/
      );
      assert.equal(dbCalls.length, 0);
      assert.equal(journalCalls.length, 0);

      // Malformed records must not disappear when a valid new record accompanies them.
      for (const adjustmentId of [undefined, '', '   ']) {
        const malformed = { ...multipleItem.adjustments![1], adjustment_id: adjustmentId as unknown as string };
        for (const additions of [[malformed], [malformed, multipleItem.adjustments![2]]]) {
          await assert.rejects(() => handler({
            ...originalItem,
            adjustments: [...originalItem.adjustments!, ...additions]
          }));
          assert.equal(dbCalls.length, 0, 'Malformed identities must block every cost write');
          assert.equal(journalCalls.length, 0, 'Malformed identities must block every journal write');
        }
      }
    });

    it('F1.4: journal persistence failure restores original row and leaves local state unchanged', async () => {
      const factory = getContextHandlerFactory('handleAddCostAdjustment');
      const dbCalls: any[] = [];

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-active',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة',
        item_name_en: 'Concrete',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '50000',
        total_cost_egp: '50000',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        logged_by: 'usr',
        status: 'verified',
        adjustments: []
      };

      let state = { propertyCosts: [originalItem], journalEntries: [] as ERPJournalEntry[] };

      const handler = factory(
        state,
        (fn: any) => { state = typeof fn === 'function' ? fn(state) : fn; },
        true,
        () => {},
        {},
        { id: 'usr-1' },
        async () => defaultPeriod,
        () => true,
        async () => { throw new Error('Journal DB failure'); },
        {
          addPropertyCostAdjustment: async (_s: any, item: any) => { dbCalls.push(['add', item]); },
          updatePropertyCostItem: async (_s: any, item: any) => { dbCalls.push(['update', item]); }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        noopToast
      );

      const updatedItem: ERPPropertyCostItem = {
        ...originalItem,
        adjustments: [
          {
            adjustment_id: 'bbbbbbbb',
            parent_item_id: 'item-active',
            adjustment_type: 'SUPPLEMENT_UNDERPAYMENT',
            amount_egp: '2000',
            reason: 'new',
            created_at: new Date().toISOString(),
            logged_by: 'usr'
          }
        ]
      };

      await assert.rejects(
        async () => handler(updatedItem),
        /Journal DB failure/
      );

      assert.equal(dbCalls.length, 2);
      assert.equal(dbCalls[0][0], 'add');
      assert.equal(dbCalls[1][0], 'update');
      assert.deepEqual(dbCalls[1][1], originalItem, 'Must restore original row to DB');
      assert.equal(state.propertyCosts[0].adjustments?.length || 0, 0, 'Local cost item must be unchanged');
      assert.equal(state.journalEntries.length, 0, 'Local journalEntries must stay empty');
    });

    it('A1: refund larger than net effective cost rejects with zero writes; refund equal to net cost succeeds', async () => {
      const factory = getContextHandlerFactory('handleAddCostAdjustment');
      const dbCalls: any[] = [];
      const journalCalls: ERPJournalEntry[] = [];

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-refund-test',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة',
        item_name_en: 'Concrete',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '1000',
        total_cost_egp: '1000',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        logged_by: 'usr',
        status: 'verified',
        adjustments: []
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
          addPropertyCostAdjustment: async (_s: any, item: any) => { dbCalls.push(['add', item]); },
          updatePropertyCostItem: async (_s: any, item: any) => { dbCalls.push(['update', item]); }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        noopToast
      );

      // Refund of 2,000 on net 1,000: must reject and write zero
      const overRefundItem: ERPPropertyCostItem = {
        ...originalItem,
        adjustments: [
          {
            adjustment_id: 'ref-2000',
            parent_item_id: 'item-refund-test',
            adjustment_type: 'REFUND_OVERPAYMENT',
            amount_egp: '2000',
            reason: 'Excess refund',
            created_at: new Date().toISOString(),
            logged_by: 'usr'
          }
        ]
      };

      await assert.rejects(
        async () => handler(overRefundItem),
        /يتجاوز|exceed/i
      );
      assert.equal(dbCalls.length, 0, 'Zero DB writes on excessive refund');
      assert.equal(journalCalls.length, 0, 'Zero journal writes on excessive refund');

      // Refund of 1,000 on net 1,000: must succeed and post Dr 201000 1000.00 / Cr 151000 1000.00
      const exactRefundItem: ERPPropertyCostItem = {
        ...originalItem,
        adjustments: [
          {
            adjustment_id: 'ref-1000',
            parent_item_id: 'item-refund-test',
            adjustment_type: 'REFUND_OVERPAYMENT',
            amount_egp: '1000',
            reason: 'Exact net refund',
            created_at: new Date().toISOString(),
            logged_by: 'usr'
          }
        ]
      };

      await handler(exactRefundItem);
      assert.equal(dbCalls.length, 1, 'Exact refund writes to DB');
      assert.equal(journalCalls.length, 1, 'Exact refund posts journal');
      assert.equal(journalCalls[0].lines.find(l => l.account_code === '201000')?.debit_amount, '1000.00');
      assert.equal(journalCalls[0].lines.find(l => l.account_code === '151000')?.credit_amount, '1000.00');
    });

    it('A2.2: adjustment submitted from a stale copy missing existing adjustment is rejected with zero writes', async () => {
      const factory = getContextHandlerFactory('handleAddCostAdjustment');
      const dbCalls: any[] = [];
      const journalCalls: any[] = [];

      const adj1 = {
        adjustment_id: 'adj-001',
        parent_item_id: 'item-multi-adj',
        adjustment_type: 'SUPPLEMENT_UNDERPAYMENT' as const,
        amount_egp: '500',
        reason: 'first adjustment',
        created_at: new Date().toISOString(),
        logged_by: 'usr'
      };
      const adj2 = {
        adjustment_id: 'adj-002',
        parent_item_id: 'item-multi-adj',
        adjustment_type: 'SUPPLEMENT_UNDERPAYMENT' as const,
        amount_egp: '300',
        reason: 'second adjustment in state',
        created_at: new Date().toISOString(),
        logged_by: 'usr'
      };

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-multi-adj',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة',
        item_name_en: 'Concrete',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '10000',
        total_cost_egp: '10000',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        logged_by: 'usr',
        status: 'verified',
        adjustments: [adj1, adj2]
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
          addPropertyCostAdjustment: async (_s: any, item: any) => { dbCalls.push(['add', item]); },
          updatePropertyCostItem: async (_s: any, item: any) => { dbCalls.push(['update', item]); }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        noopToast
      );

      // Stale copy only has adj1, and tries to add adj3 (missing adj2!)
      const adj3 = {
        adjustment_id: 'adj-003',
        parent_item_id: 'item-multi-adj',
        adjustment_type: 'SUPPLEMENT_UNDERPAYMENT' as const,
        amount_egp: '400',
        reason: 'third adjustment from stale modal',
        created_at: new Date().toISOString(),
        logged_by: 'usr'
      };

      const staleItem: ERPPropertyCostItem = {
        ...originalItem,
        adjustments: [adj1, adj3] // missing adj2!
      };

      await assert.rejects(
        async () => handler(staleItem),
        /stale|refresh|قديمة|تحديث/i
      );
      assert.equal(dbCalls.length, 0, 'Zero DB writes on stale adjustment');
      assert.equal(journalCalls.length, 0, 'Zero journal writes on stale adjustment');

      for (const changes of [
        { parent_item_id: 'different-item' },
        { created_at: '2000-01-01T00:00:00.000Z' },
        { journal_entry_id: 'different-journal' },
        { amount_egp: '500.001' }
      ]) {
        await assert.rejects(
          () => handler({ ...originalItem, adjustments: [{ ...adj1, ...changes }, adj2, adj3] }),
          /stale|refresh|قديمة|تحديث/i,
          `Changed historical adjustment must reject: ${JSON.stringify(changes)}`
        );
        assert.equal(dbCalls.length, 0, 'Zero DB writes on changed history');
        assert.equal(journalCalls.length, 0, 'Zero journal writes on changed history');
        assert.deepEqual(state.propertyCosts, [originalItem], 'Rejected history leaves local state unchanged');
      }
    });
  });

  describe('F2 & F3 [R4, R5]: handleDeletePropertyCostItem mirroring and error recovery', () => {
    it('F2.1: deletion failure with successful compensation retains cost row and mirrors both entries netting to 0', async () => {
      const factory = getContextHandlerFactory('handleDeletePropertyCostItem');
      const dbCalls: any[] = [];
      const journalCalls: ERPJournalEntry[] = [];

      const costItem: ERPPropertyCostItem = {
        item_id: 'cost-12345678',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'حديد تسليح',
        item_name_en: 'Rebar',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '30000',
        total_cost_egp: '30000',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        paid_amount_egp: '0.00',
        logged_by: 'usr',
        status: 'verified'
      };

      let state = {
        propertyCosts: [costItem],
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
          deletePropertyCostItem: async (_s: any, id: string) => {
            dbCalls.push(['delete', id]);
            throw new Error('delete denied');
          }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        noopToast
      );

      await assert.rejects(
        async () => handler('cost-12345678'),
        /delete denied/
      );

      assert.equal(state.propertyCosts.length, 1, 'Cost row must be retained on delete failure');
      assert.equal(state.journalEntries.length, 2, 'Local journals must contain both reversal and compensation');
      assert.ok(state.journalEntries.some(e => e.entry_number.startsWith('JE-WIP-DEL-COST-123')));
      assert.ok(state.journalEntries.some(e => e.entry_number.startsWith('JE-WIP-DEL-ROLLBACK-COST-123')));

      // Verify they net to zero
      const rev = state.journalEntries.find(e => e.entry_number.startsWith('JE-WIP-DEL-COST-123'))!;
      const roll = state.journalEntries.find(e => e.entry_number.startsWith('JE-WIP-DEL-ROLLBACK-COST-123'))!;
      const revApDebit = rev.lines.find(l => l.account_code === '201000')?.debit_amount;
      const rollApCredit = roll.lines.find(l => l.account_code === '201000')?.credit_amount;
      assert.equal(revApDebit, rollApCredit);
    });

    it('F2.2 & F3.1: deletion failure with compensation failure exposes AggregateError with both causes, retains only reversal', async () => {
      const factory = getContextHandlerFactory('handleDeletePropertyCostItem');
      let persistCallCount = 0;
      const deleteError = { message: 'delete denied', code: '42501' };
      const compensationError = { message: 'compensation offline', code: 'PGRST000' };
      const errorToasts: Array<{ description: string }> = [];

      const costItem: ERPPropertyCostItem = {
        item_id: 'cost-12345678',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'حديد تسليح',
        item_name_en: 'Rebar',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '30000',
        total_cost_egp: '30000',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        paid_amount_egp: '0.00',
        logged_by: 'usr',
        status: 'verified'
      };

      let state = {
        propertyCosts: [costItem],
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
        async () => {
          persistCallCount++;
          if (persistCallCount > 1) {
            throw compensationError;
          }
        },
        {
          deletePropertyCostItem: async () => {
            throw deleteError;
          }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        {
          ...noopToast,
          error: (_message: string, options: { description: string }) => { errorToasts.push(options); },
          info: () => assert.fail('Failed deletion must not show a success toast'),
          success: () => assert.fail('Failed deletion must not show a success toast')
        }
      );

      await assert.rejects(
        async () => handler('cost-12345678'),
        (err: any) => {
          const msg = err.message || '';
          assert.ok(msg.includes('delete denied'), 'Error must contain delete error cause');
          assert.ok(msg.includes('compensation offline'), 'Error must contain compensation error cause');
          assert.ok(err instanceof AggregateError);
          assert.deepEqual(err.errors, [deleteError, compensationError]);
          return true;
        }
      );

      assert.equal(state.propertyCosts.length, 1, 'Cost row must be retained');
      assert.equal(state.journalEntries.length, 1, 'Failed compensation must not be added to local journals');
      assert.ok(state.journalEntries[0].entry_number.startsWith('JE-WIP-DEL-COST-123'));
      assert.equal(errorToasts.length, 1);
      assert.match(errorToasts[0].description, /delete denied/);
      assert.match(errorToasts[0].description, /compensation offline/);
    });

    it('F2.3: normal delete removes row and retains exactly one reversal entry', async () => {
      const factory = getContextHandlerFactory('handleDeletePropertyCostItem');
      let toastInfoCalled = false;

      const costItem: ERPPropertyCostItem = {
        item_id: 'cost-12345678',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'حديد',
        item_name_en: 'Rebar',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '30000',
        total_cost_egp: '30000',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        paid_amount_egp: '0.00',
        logged_by: 'usr',
        status: 'verified'
      };

      let state = {
        propertyCosts: [costItem],
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
        async () => {},
        {
          deletePropertyCostItem: async () => {}
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        {
          ...noopToast,
          info: () => { toastInfoCalled = true; }
        }
      );

      await handler('cost-12345678');

      assert.equal(state.propertyCosts.length, 0, 'Cost row must be removed on successful delete');
      assert.equal(state.journalEntries.length, 1, 'Exactly one reversal entry in local journals');
      assert.ok(state.journalEntries[0].entry_number.startsWith('JE-WIP-DEL-COST-123'));
      assert.ok(toastInfoCalled);
    });

    it('F2.4: delete blocked when paid_amount_egp > 0 with zero writes', async () => {
      const factory = getContextHandlerFactory('handleDeletePropertyCostItem');
      let persistCalled = false;
      let deleteCalled = false;

      const costItem: ERPPropertyCostItem = {
        item_id: 'cost-12345678',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'حديد',
        item_name_en: 'Rebar',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '30000',
        total_cost_egp: '30000',
        created_at: new Date().toISOString(),
        payment_term: 'DOWN_PAYMENT_INSTALLMENTS',
        paid_amount_egp: '5000.00',
        logged_by: 'usr',
        status: 'verified'
      };

      let state = {
        propertyCosts: [costItem],
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
        async () => { persistCalled = true; },
        {
          deletePropertyCostItem: async () => { deleteCalled = true; }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        noopToast
      );

      await assert.rejects(
        async () => handler('cost-12345678'),
        /لا يمكن حذف بند تكلفة تم سداد مبالغ منه بالفعل|Cannot delete cost item with recorded payments/
      );

      assert.equal(persistCalled, false);
      assert.equal(deleteCalled, false);
      assert.equal(state.propertyCosts.length, 1);
      assert.equal(state.journalEntries.length, 0);
    });
  });

  describe('F4 [R2]: handleUpdatePropertyCostItem execution, ordering, rollback, and stale protection', () => {
    it('A2.1: an edit submitted with a stale copy keeps state adjustments and journal delta equals base-amount change only', async () => {
      const factory = getContextHandlerFactory('handleUpdatePropertyCostItem');
      const dbCalls: any[] = [];
      const journalCalls: ERPJournalEntry[] = [];

      const adjInState = {
        adjustment_id: 'adj-state-1',
        parent_item_id: 'item-edit-1',
        adjustment_type: 'SUPPLEMENT_UNDERPAYMENT' as const,
        amount_egp: '20000.00',
        reason: 'supplement in state',
        created_at: new Date().toISOString(),
        logged_by: 'usr'
      };

      const instInState: ERPPayableInstallment = {
        installment_id: 'inst-1',
        cost_item_id: 'item-edit-1',
        installment_number: 1,
        title_ar: 'قسط 1',
        due_date: '2026-11-01',
        amount_egp: '50000.00',
        paid_amount_egp: '50000.00',
        status: 'PAID'
      };

      const instPending: ERPPayableInstallment = {
        installment_id: 'inst-2',
        cost_item_id: 'item-edit-1',
        installment_number: 2,
        title_ar: 'قسط 2',
        due_date: '2026-12-01',
        amount_egp: '470000.00',
        paid_amount_egp: '0.00',
        status: 'PENDING'
      };

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-edit-1',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة مسلحة',
        item_name_en: 'Concrete',
        quantity: 10,
        unit: 'م3',
        unit_cost_egp: '50000.00',
        total_cost_egp: '500000.00',
        created_at: new Date().toISOString(),
        payment_term: 'DOWN_PAYMENT_INSTALLMENTS',
        paid_amount_egp: '50000.00',
        remaining_amount_egp: '470000.00',
        net_effective_cost_egp: '520000.00',
        logged_by: 'usr',
        status: 'verified',
        adjustments: [adjInState],
        payable_installments: [instInState, instPending],
        supplier_contractor: 'Old supplier',
        invoice_ref: 'Old invoice',
        due_date: '2026-11-01'
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
        noopToast
      );

      // Stale copy from modal: base cost changed 500,000 -> 520,000 (+20,000), but adjustments and installments are empty
      const staleModalItem: ERPPropertyCostItem = {
        ...originalItem,
        total_cost_egp: '520000.00',
        item_name_ar: 'خرسانة مسلحة معدلة',
        notes: 'ملاحظة جديدة',
        supplier_contractor: undefined,
        invoice_ref: undefined,
        due_date: undefined,
        adjustments: [], // stale modal copy has no adjustments!
        payable_installments: [], // stale modal copy has no installments!
        paid_amount_egp: '0.00'
      };

      await handler(staleModalItem);

      assert.equal(dbCalls.length, 1, 'Exactly one DB update');
      const savedRow = dbCalls[0][1];
      // Saved row must keep CURRENT state adjustments, payable_installments and paid amounts
      assert.deepEqual(savedRow.adjustments, [adjInState], 'Saved row must retain state adjustments');
      assert.equal(savedRow.payable_installments?.length, 2, 'Saved row has 2 installments');
      assert.deepEqual(savedRow.payable_installments[0], instInState, 'Saved row must retain paid tranche unchanged');
      assert.equal(savedRow.payable_installments[1].amount_egp, '490000.00', 'Pending tranche updated to 490,000.00');
      assert.equal(savedRow.payable_installments[1].paid_amount_egp, '0.00', 'Pending tranche paid is 0.00');
      assert.equal(savedRow.payable_installments[1].status, 'PENDING', 'Pending tranche status is PENDING');
      const savedInstSum = savedRow.payable_installments.reduce((acc: any, i: any) => acc.plus(i.amount_egp), D(0));
      assert.equal(savedInstSum.toFixed(2), '540000.00', 'Schedule sum equals net effective cost 540,000.00');
      assert.equal(savedRow.paid_amount_egp, '50000.00', 'Saved row must retain paid amount');
      assert.equal(savedRow.item_name_ar, 'خرسانة مسلحة معدلة', 'Saved row took edited name');
      assert.equal(savedRow.notes, 'ملاحظة جديدة', 'Saved row took edited notes');
      assert.equal(savedRow.total_cost_egp, '520000.00', 'Saved row took edited total_cost_egp');
      assert.equal(savedRow.supplier_contractor, undefined, 'Modal can clear supplier');
      assert.equal(savedRow.invoice_ref, undefined, 'Modal can clear invoice reference');
      assert.equal(savedRow.due_date, undefined, 'Modal can clear due date');
      // Net effective: 520,000 base + 20,000 adjustment = 540,000.00
      assert.equal(savedRow.net_effective_cost_egp, '540000.00');
      // Remaining: 540,000 net - 50,000 paid = 490,000.00
      assert.equal(savedRow.remaining_amount_egp, '490000.00');

      // Journal delta must equal base-amount change only (520k - 500k = +20k)
      assert.equal(journalCalls.length, 1, 'Exactly one journal entry posted');
      const lines = journalCalls[0].lines;
      assert.equal(lines.find(l => l.account_code === '151000')?.debit_amount, '20000.00');
      assert.equal(lines.find(l => l.account_code === '201000')?.credit_amount, '20000.00');

      // Local state updated with merged item
      assert.equal(state.propertyCosts[0].total_cost_egp, '520000.00');
      assert.deepEqual(state.propertyCosts[0].adjustments, [adjInState]);
      assert.equal(state.propertyCosts[0].payable_installments?.length, 2);
      assert.deepEqual(state.propertyCosts[0].payable_installments[0], instInState);
      assert.equal(state.propertyCosts[0].payable_installments[1].amount_egp, '490000.00');
      const stateInstSum = state.propertyCosts[0].payable_installments.reduce((acc: any, i: any) => acc.plus(i.amount_egp), D(0));
      assert.equal(stateInstSum.toFixed(2), '540000.00');
    });

    it('F2: module import does not create globalThis.resplitUnpaidInstallments', () => {
      assert.equal((globalThis as any).resplitUnpaidInstallments, undefined);
    });

    it('A3.1: Order: update row in DB, then persist the journal', async () => {
      const factory = getContextHandlerFactory('handleUpdatePropertyCostItem');
      const executionOrder: string[] = [];

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-order-1',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة',
        item_name_en: 'Concrete',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '10000.00',
        total_cost_egp: '10000.00',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        paid_amount_egp: '0.00',
        logged_by: 'usr',
        status: 'verified'
      };

      let state = { propertyCosts: [originalItem], journalEntries: [] as ERPJournalEntry[] };

      const handler = factory(
        state,
        (fn: any) => { state = typeof fn === 'function' ? fn(state) : fn; },
        true,
        () => {},
        {},
        { id: 'usr-1' },
        async () => defaultPeriod,
        () => true,
        async () => { executionOrder.push('persist_journal'); },
        {
          updatePropertyCostItem: async () => { executionOrder.push('update_row'); }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        noopToast
      );

      const editedItem: ERPPropertyCostItem = {
        ...originalItem,
        total_cost_egp: '15000.00'
      };

      await handler(editedItem);

      assert.deepEqual(executionOrder, ['update_row', 'persist_journal'], 'Must update row before persisting journal');
    });

    it('A3.2: Journal failure: row is restored to original, error rethrown, local state unchanged, no success toast', async () => {
      const factory = getContextHandlerFactory('handleUpdatePropertyCostItem');
      const dbCalls: any[] = [];
      let successToastCalled = false;

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-fail-1',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة',
        item_name_en: 'Concrete',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '10000.00',
        total_cost_egp: '10000.00',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        paid_amount_egp: '0.00',
        logged_by: 'usr',
        status: 'verified'
      };

      let state = { propertyCosts: [originalItem], journalEntries: [] as ERPJournalEntry[] };

      const handler = factory(
        state,
        (fn: any) => { state = typeof fn === 'function' ? fn(state) : fn; },
        true,
        () => {},
        {},
        { id: 'usr-1' },
        async () => defaultPeriod,
        () => true,
        async () => { throw new Error('Journal DB crash'); },
        {
          updatePropertyCostItem: async (_s: any, item: any) => { dbCalls.push(['update', item]); }
        },
        D,
        buildCostCorrectionJournalLines,
        calculateCostItemEffectiveTotals,
        GeneralLedgerEngine,
        {
          ...noopToast,
          success: () => { successToastCalled = true; }
        }
      );

      const editedItem: ERPPropertyCostItem = {
        ...originalItem,
        total_cost_egp: '15000.00'
      };

      await assert.rejects(
        async () => handler(editedItem),
        /Journal DB crash/
      );

      assert.equal(dbCalls.length, 2, 'Must have attempted update then restored row');
      assert.equal(dbCalls[0][1].total_cost_egp, '15000.00', 'First call was edited item');
      assert.deepEqual(dbCalls[1][1], originalItem, 'Second call restored original item');
      assert.equal(state.propertyCosts[0].total_cost_egp, '10000.00', 'Local state remains unchanged');
      assert.equal(state.journalEntries.length, 0, 'No journal added to local state');
      assert.equal(successToastCalled, false, 'No success toast shown');
    });

    it('A3.3: New total below paid_amount_egp is rejected with zero writes', async () => {
      const factory = getContextHandlerFactory('handleUpdatePropertyCostItem');
      const dbCalls: any[] = [];
      const journalCalls: any[] = [];

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-below-paid',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة',
        item_name_en: 'Concrete',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '50000.00',
        total_cost_egp: '50000.00',
        created_at: new Date().toISOString(),
        payment_term: 'DOWN_PAYMENT_INSTALLMENTS',
        paid_amount_egp: '30000.00',
        logged_by: 'usr',
        status: 'verified'
      };

      let state = { propertyCosts: [originalItem], journalEntries: [] as ERPJournalEntry[] };

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
        noopToast
      );

      // Attempt to lower total to 20,000 when paid is 30,000
      const editedItem: ERPPropertyCostItem = {
        ...originalItem,
        total_cost_egp: '20000.00'
      };

      await assert.rejects(
        async () => handler(editedItem),
        /المبلغ المسدد|paid amount/i
      );

      assert.equal(dbCalls.length, 0, 'Zero DB writes when total below paid');
      assert.equal(journalCalls.length, 0, 'Zero journal writes when total below paid');
      assert.equal(state.propertyCosts[0].total_cost_egp, '50000.00', 'Local state unchanged');
    });

    it('A3.4: Unchanged amount updates row and posts no journal', async () => {
      const factory = getContextHandlerFactory('handleUpdatePropertyCostItem');
      const dbCalls: any[] = [];
      const journalCalls: any[] = [];

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-unchanged',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة',
        item_name_en: 'Concrete',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '50000.00',
        total_cost_egp: '50000.00',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        paid_amount_egp: '0.00',
        logged_by: 'usr',
        status: 'verified',
        notes: 'old note'
      };

      let state = { propertyCosts: [originalItem], journalEntries: [] as ERPJournalEntry[] };

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
        noopToast
      );

      // Same total_cost_egp, only notes cleared
      const editedItem: ERPPropertyCostItem = {
        ...originalItem,
        notes: undefined
      };

      await handler(editedItem);

      assert.equal(dbCalls.length, 1, 'Row updated in DB');
      assert.equal(dbCalls[0][1].notes, undefined, 'Modal can clear notes');
      assert.equal(journalCalls.length, 0, 'No journal posted when delta is zero');
      assert.equal(state.propertyCosts[0].notes, undefined, 'Local state updated');
    });

    it('A3.5: Recorded payments outside the installment schedule survive an edit', async () => {
      const factory = getContextHandlerFactory('handleUpdatePropertyCostItem');
      const dbCalls: any[] = [];
      const journalCalls: any[] = [];

      const originalItem: ERPPropertyCostItem = {
        item_id: 'item-paid-off-schedule',
        property_id: 'prop-1',
        category: 'civil_structure',
        phase: 'structural_skeleton',
        logged_date: '2026-10-01',
        item_name_ar: 'خرسانة',
        item_name_en: 'Concrete',
        quantity: 1,
        unit: 'مقطوعية',
        unit_cost_egp: '1000.00',
        total_cost_egp: '1000.00',
        created_at: new Date().toISOString(),
        payment_term: 'FULL_DEFERRED',
        paid_amount_egp: '300.00',
        remaining_amount_egp: '700.00',
        logged_by: 'usr',
        status: 'verified',
        notes: 'old note'
      };

      let state = { propertyCosts: [originalItem], journalEntries: [] as ERPJournalEntry[] };

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
        noopToast
      );

      await handler({ ...originalItem, notes: 'new note' });

      assert.equal(dbCalls.length, 1);
      assert.equal(dbCalls[0][1].paid_amount_egp, '300.00', 'Paid amount kept as recorded');
      assert.equal(dbCalls[0][1].remaining_amount_egp, '700.00', 'Remaining = net - recorded paid');
      assert.equal(journalCalls.length, 0);
    });
  });
});
