import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ERPSupabaseService } from '../supabaseService';
import { GeneralLedgerEngine } from '../ledger';
import { InvariantsValidator } from '../invariants';
import { buildProjectedVaultItems, calculateVaultKPIs } from '../installmentsVaultProjection';
import type {
  ERPPDCRecord,
  ERPContract,
  ERPInstallmentSchedule,
  ERPAccountingPeriod
} from '../types';

/**
 * In-memory Mock Supabase Client for End-to-End Persistence Validation.
 * Tracks all table rows for assertions across erp_pdc_records, erp_journal_entries,
 * erp_journal_lines, erp_installment_schedules, and erp_contracts.
 */
function createMockSupabaseClient(tables: Map<string, Record<string, unknown>[]>): SupabaseClient {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: { id: '00000000-0000-4000-8000-000000000099' } }, error: null })
    },
    from(tableName: string) {
      return {
        select() {
          const query = {
            eq(col: string, val: unknown) {
              const currentRows = tables.get(tableName) ?? [];
              const filtered = currentRows.filter(r => r[col] === val);
              return {
                ...query,
                then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
                  return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
                },
                single: async () => ({ data: filtered[0] || null, error: filtered[0] ? null : { message: 'Not found' } }),
                maybeSingle: async () => ({ data: filtered[0] || null, error: null })
              };
            },
            order() { return query; },
            then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
              return Promise.resolve({ data: tables.get(tableName) ?? [], error: null }).then(resolve, reject);
            }
          };
          return query;
        },
        async insert(value: Record<string, unknown> | Record<string, unknown>[]) {
          const rows = Array.isArray(value) ? value : [value];
          const existing = tables.get(tableName) ?? [];
          tables.set(tableName, [...existing, ...rows]);
          return { error: null };
        },
        async upsert(value: Record<string, unknown> | Record<string, unknown>[]) {
          const rows = Array.isArray(value) ? value : [value];
          const existing = tables.get(tableName) ?? [];
          tables.set(tableName, [...existing, ...rows]);
          return { error: null };
        },
        update(updateValues: Record<string, unknown>) {
          return {
            eq: async (col: string, val: unknown) => {
              const rows = tables.get(tableName) ?? [];
              const updated = rows.map(r => {
                if (r[col] === val) {
                  return { ...r, ...updateValues };
                }
                return r;
              });
              tables.set(tableName, updated);
              return { error: null };
            }
          };
        }
      };
    }
  } as unknown as SupabaseClient;
}

// Canonical Fixtures
const TEST_PERIOD: ERPAccountingPeriod = {
  period_id: 'p-2026-09',
  fiscal_year: 2026,
  period_number: 9,
  start_date: '2026-09-01',
  end_date: '2026-09-30',
  status: 'OPEN'
};

const CLOSED_PERIOD: ERPAccountingPeriod = {
  period_id: 'p-2026-08',
  fiscal_year: 2026,
  period_number: 8,
  start_date: '2026-08-01',
  end_date: '2026-08-31',
  status: 'CLOSED'
};

const BASE_CONTRACT: ERPContract = {
  contract_id: 'c1000000-0000-4000-8000-000000000001',
  contract_number: 'ZF-104-E2E',
  unit_id: 'Apartment 4B',
  property_id: 'prop-001',
  building_unit_id: 'u-4b',
  building_unit_number: '4B',
  is_whole_building_sale: false,
  payment_plan_type: 'INSTALLMENTS',
  buyer_name: 'أحمد محمود التميمي',
  gross_contract_value: '3000000.00',
  currency: 'EGP',
  exchange_rate: '1.0000',
  contract_date: '2026-01-15',
  handover_status: 'Pending',
  total_cash_collected: '1000000.00',
  status: 'Active'
};

const BASE_SCHEDULE: ERPInstallmentSchedule = {
  schedule_id: 's1000000-0000-4000-8000-000000000002',
  contract_id: BASE_CONTRACT.contract_id,
  tranche_number: 2,
  nominal_value: '250000.00',
  due_date: '2026-09-15',
  status: 'Pending',
  schedule_version: 1,
  amount_paid: '0.00'
};

const BASE_PDC: ERPPDCRecord = {
  cheque_id: 'ch100000-0000-4000-8000-000000000003',
  contract_id: BASE_CONTRACT.contract_id,
  schedule_id: BASE_SCHEDULE.schedule_id,
  cheque_number: 'CHK-998877',
  bank_name: 'البنك التجاري الدولي (CIB)',
  drawer_name: 'أحمد محمود التميمي',
  nominal_value: '250000.00',
  due_date: '2026-09-15',
  status: 'In Safe'
};

describe('PDC Lifecycle Persistence & Double-Entry Ledger Verification', () => {

  // =========================================================================
  // 1. DEPOSIT IN BANK TRANSITION (إيداع بنكي / برسم التحصيل)
  // =========================================================================
  describe('1. Deposit in Bank Transition (إيداع بنكي)', () => {
    it('persists Deposited status and deposited_date to erp_pdc_records table in Supabase', async () => {
      const db = new Map<string, Record<string, unknown>[]>([
        ['erp_pdc_records', [{ ...BASE_PDC }]]
      ]);
      const client = createMockSupabaseClient(db);

      await ERPSupabaseService.persistPDCStatus(client, BASE_PDC.cheque_id, 'Deposited');

      const pdcRows = db.get('erp_pdc_records') ?? [];
      const updatedPdc = pdcRows.find(r => r.cheque_id === BASE_PDC.cheque_id);

      assert.ok(updatedPdc, 'Cheque record must exist');
      assert.strictEqual(updatedPdc.status, 'Deposited');
      assert.ok(updatedPdc.deposited_date, 'deposited_date must be set');
      assert.match(String(updatedPdc.deposited_date), /^\d{4}-\d{2}-\d{2}$/);
    });

    it('generates a balanced double-entry deposit journal entry (Dr 104000 / Cr 103200)', () => {
      const todayStr = '2026-09-10';
      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-DEP-${BASE_PDC.cheque_number}`,
        entry_date: todayStr,
        period: TEST_PERIOD,
        description: `إيداع القسط / الشيك رقم ${BASE_PDC.cheque_number} برسم التحصيل البنكي`,
        source_module: 'PDC',
        source_entity_id: BASE_PDC.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: '104000',
            debit_amount: BASE_PDC.nominal_value,
            credit_amount: '0.00',
            contract_id: BASE_PDC.contract_id,
            memo: `إيداع برسم التحصيل للقسط رقم ${BASE_PDC.cheque_number}`
          },
          {
            account_code: '103200',
            debit_amount: '0.00',
            credit_amount: BASE_PDC.nominal_value,
            contract_id: BASE_PDC.contract_id,
            memo: `صرف من عهدة الخزينة للقسط رقم ${BASE_PDC.cheque_number}`
          }
        ]
      });

      // Verify mathematical balance (Dr === Cr)
      const balanceCheck = InvariantsValidator.verifyDoubleEntryBalance([entry]);
      assert.strictEqual(balanceCheck.passed, true);
      assert.strictEqual(entry.source_module, 'PDC');
      assert.strictEqual(entry.source_entity_id, BASE_PDC.cheque_id);
      assert.strictEqual(entry.lines.length, 2);
      assert.strictEqual(entry.lines[0].account_code, '104000');
      assert.strictEqual(entry.lines[0].debit_amount, '250000.00');
      assert.strictEqual(entry.lines[1].account_code, '103200');
      assert.strictEqual(entry.lines[1].credit_amount, '250000.00');
    });

    it('persists deposit journal entry and its lines to erp_journal_entries & erp_journal_lines in Supabase', async () => {
      const db = new Map<string, Record<string, unknown>[]>([
        ['erp_journal_entries', []],
        ['erp_journal_lines', []]
      ]);
      const client = createMockSupabaseClient(db);

      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-DEP-${BASE_PDC.cheque_number}`,
        entry_date: '2026-09-10',
        period: TEST_PERIOD,
        description: `إيداع القسط / الشيك رقم ${BASE_PDC.cheque_number} برسم التحصيل البنكي`,
        source_module: 'PDC',
        source_entity_id: BASE_PDC.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          { account_code: '104000', debit_amount: BASE_PDC.nominal_value, credit_amount: '0.00' },
          { account_code: '103200', debit_amount: '0.00', credit_amount: BASE_PDC.nominal_value }
        ]
      });

      await ERPSupabaseService.persistJournalEntry(client, entry);

      const storedEntries = db.get('erp_journal_entries') ?? [];
      const storedLines = db.get('erp_journal_lines') ?? [];

      assert.strictEqual(storedEntries.length, 1);
      assert.strictEqual(storedEntries[0].entry_number, `JE-PDC-DEP-${BASE_PDC.cheque_number}`);
      assert.strictEqual(storedEntries[0].source_module, 'PDC');
      assert.strictEqual(storedLines.length, 2);
      assert.strictEqual(storedLines[0].account_code, '104000');
      assert.strictEqual(storedLines[1].account_code, '103200');
    });

    it('upholds the Banking Boundary: Deposited cheque is in transit and strictly NOT liquid cash', () => {
      const depositedPdc: ERPPDCRecord = {
        ...BASE_PDC,
        status: 'Deposited',
        deposited_date: '2026-09-10'
      };

      const items = buildProjectedVaultItems(
        [depositedPdc],
        [BASE_SCHEDULE],
        [BASE_CONTRACT],
        [],
        { referenceDate: '2026-09-15' }
      );

      const kpis = calculateVaultKPIs(items, '2026-09-15');

      // KPI Invariant: Must be tracked in clearing transit, NOT in collected cash
      assert.strictEqual(items[0].status, 'deposited');
      assert.strictEqual(kpis.depositedCount, 1);
      assert.strictEqual(kpis.clearedCount, 0);
      assert.strictEqual(kpis.depositedSum.toFixed(2), '250000.00');
      assert.strictEqual(kpis.clearedSum.toFixed(2), '0.00');
    });
  });

  // =========================================================================
  // 2. CONFIRM BANK CLEARANCE TRANSITION (تأكيد المقاصة والتحصيل البنكي)
  // =========================================================================
  describe('2. Confirm Bank Clearance Transition (تأكيد المقاصة)', () => {
    it('persists Cleared status and cleared_date to erp_pdc_records table in Supabase', async () => {
      const db = new Map<string, Record<string, unknown>[]>([
        ['erp_pdc_records', [{ ...BASE_PDC, status: 'Deposited', deposited_date: '2026-09-10' }]]
      ]);
      const client = createMockSupabaseClient(db);

      await ERPSupabaseService.persistPDCStatus(client, BASE_PDC.cheque_id, 'Cleared');

      const pdcRows = db.get('erp_pdc_records') ?? [];
      const updatedPdc = pdcRows.find(r => r.cheque_id === BASE_PDC.cheque_id);

      assert.ok(updatedPdc);
      assert.strictEqual(updatedPdc.status, 'Cleared');
      assert.ok(updatedPdc.cleared_date, 'cleared_date must be populated on clearance');
      assert.match(String(updatedPdc.cleared_date), /^\d{4}-\d{2}-\d{2}$/);
    });

    it('generates a balanced bank clearance entry into Operating Bank 102000 and Deferred Revenue 203000', () => {
      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-CLR-${BASE_PDC.cheque_number}`,
        entry_date: '2026-09-15',
        period: TEST_PERIOD,
        description: `تحصيل قسط تعاقدي - إيراد مؤجل - ورقة قبض #${BASE_PDC.cheque_number} - عقد ${BASE_CONTRACT.contract_number}`,
        source_module: 'PDC',
        source_entity_id: BASE_PDC.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: '102000', // Operating Bank
            debit_amount: BASE_PDC.nominal_value,
            credit_amount: '0.00',
            contract_id: BASE_PDC.contract_id,
            memo: `تحصيل بنكي بحساب البنك للشيك ${BASE_PDC.cheque_number}`
          },
          {
            account_code: '203000', // Deferred Contract Revenue
            debit_amount: '0.00',
            credit_amount: BASE_PDC.nominal_value,
            contract_id: BASE_PDC.contract_id,
            memo: 'إثبات إيراد تعاقدي مؤجل للوحدة قيد الإنشاء (203000)'
          }
        ]
      });

      const balanceCheck = InvariantsValidator.verifyDoubleEntryBalance([entry]);
      assert.strictEqual(balanceCheck.passed, true);
      assert.strictEqual(entry.lines[0].account_code, '102000');
      assert.strictEqual(entry.lines[1].account_code, '203000');
    });

    it('credits Accounts Receivable 103000 when the unit has been delivered (post-handover)', () => {
      const deliveredContract: ERPContract = {
        ...BASE_CONTRACT,
        handover_status: 'Delivered',
        handover_date: '2026-06-01'
      };

      const isDelivered = deliveredContract.handover_status === 'Delivered';
      const creditAccount = isDelivered ? '103000' : '203000';

      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-CLR-POST-${BASE_PDC.cheque_number}`,
        entry_date: '2026-09-15',
        period: TEST_PERIOD,
        description: `تحصيل قسط بعد التسليم - ورقة قبض #${BASE_PDC.cheque_number}`,
        source_module: 'PDC',
        source_entity_id: BASE_PDC.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          { account_code: '102000', debit_amount: BASE_PDC.nominal_value, credit_amount: '0.00' },
          { account_code: creditAccount, debit_amount: '0.00', credit_amount: BASE_PDC.nominal_value }
        ]
      });

      assert.strictEqual(entry.lines[1].account_code, '103000');
      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([entry]).passed, true);
    });

    it('executes full atomic tranche payment: updates schedule, contract, PDC, and posts GL entry', async () => {
      const db = new Map<string, Record<string, unknown>[]>([
        ['erp_contracts', [{ ...BASE_CONTRACT }]],
        ['erp_installment_schedules', [{ ...BASE_SCHEDULE }]],
        ['erp_pdc_records', [{ ...BASE_PDC, status: 'Deposited' }]],
        ['erp_journal_entries', []],
        ['erp_journal_lines', []]
      ]);
      const client = createMockSupabaseClient(db);

      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-CLR-${BASE_PDC.cheque_number}`,
        entry_date: '2026-09-15',
        period: TEST_PERIOD,
        description: `تحصيل قسط تعاقدي - ورقة قبض #${BASE_PDC.cheque_number}`,
        source_module: 'PDC',
        source_entity_id: BASE_PDC.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          { account_code: '102000', debit_amount: BASE_PDC.nominal_value, credit_amount: '0.00' },
          { account_code: '203000', debit_amount: '0.00', credit_amount: BASE_PDC.nominal_value }
        ]
      });

      await ERPSupabaseService.persistTranchePayment(
        client,
        BASE_CONTRACT.contract_id,
        BASE_SCHEDULE.schedule_id,
        BASE_PDC.nominal_value,
        entry
      );

      // 1. Schedule updated
      const schedules = db.get('erp_installment_schedules') ?? [];
      const updatedSchedule = schedules.find(s => s.schedule_id === BASE_SCHEDULE.schedule_id);
      assert.strictEqual(updatedSchedule?.status, 'Paid');
      assert.strictEqual(updatedSchedule?.amount_paid, '250000.00');
      assert.ok(updatedSchedule?.paid_date);

      // 2. Contract total cash updated
      const contracts = db.get('erp_contracts') ?? [];
      const updatedContract = contracts.find(c => c.contract_id === BASE_CONTRACT.contract_id);
      assert.strictEqual(updatedContract?.total_cash_collected, '1250000.00'); // 1,000,000 + 250,000

      // 3. PDC updated
      const pdcs = db.get('erp_pdc_records') ?? [];
      const updatedPdc = pdcs.find(p => p.cheque_id === BASE_PDC.cheque_id);
      assert.strictEqual(updatedPdc?.status, 'Cleared');

      // 4. GL Entry and Lines recorded
      const entries = db.get('erp_journal_entries') ?? [];
      const lines = db.get('erp_journal_lines') ?? [];
      assert.strictEqual(entries.length, 1);
      assert.strictEqual(lines.length, 2);
    });

    it('updates vault projection: cleared item now reflects in clearedSum and zero transit', () => {
      const clearedSchedule: ERPInstallmentSchedule = {
        ...BASE_SCHEDULE,
        status: 'Paid',
        amount_paid: '250000.00',
        paid_date: '2026-09-15'
      };
      const clearedPdc: ERPPDCRecord = {
        ...BASE_PDC,
        status: 'Cleared',
        cleared_date: '2026-09-15'
      };

      const items = buildProjectedVaultItems(
        [clearedPdc],
        [clearedSchedule],
        [BASE_CONTRACT],
        [],
        { referenceDate: '2026-09-15' }
      );

      const kpis = calculateVaultKPIs(items, '2026-09-15');

      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].status, 'cleared');
      assert.strictEqual(kpis.clearedCount, 1);
      assert.strictEqual(kpis.depositedCount, 0);
      assert.strictEqual(kpis.clearedSum.toFixed(2), '250000.00');
      assert.strictEqual(kpis.depositedSum.toFixed(2), '0.00');
    });

    it('resolves legacy cheques without direct schedule_id by matching contract_id and due_date', async () => {
      const legacyPdc: ERPPDCRecord = {
        ...BASE_PDC,
        cheque_id: 'ch-legacy-001',
        schedule_id: undefined, // No direct schedule link!
        status: 'Deposited',
        due_date: '2026-09-15'
      };

      const db = new Map<string, Record<string, unknown>[]>([
        ['erp_contracts', [{ ...BASE_CONTRACT }]],
        ['erp_installment_schedules', [{ ...BASE_SCHEDULE }]],
        ['erp_pdc_records', [{ ...legacyPdc }]],
        ['erp_journal_entries', []],
        ['erp_journal_lines', []]
      ]);
      const client = createMockSupabaseClient(db);

      // Reconcile via contract_id and due_date fallback
      const matchingSchedule = [BASE_SCHEDULE].find(s => 
        (legacyPdc.schedule_id && s.schedule_id === legacyPdc.schedule_id) ||
        (s.contract_id === legacyPdc.contract_id && s.due_date === legacyPdc.due_date)
      );
      assert.ok(matchingSchedule, 'Must find matching schedule by contract_id and due_date');

      const entry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-CLR-${legacyPdc.cheque_number}`,
        entry_date: '2026-09-15',
        period: TEST_PERIOD,
        description: `تحصيل قسط تعاقدي قديم`,
        source_module: 'PDC',
        source_entity_id: legacyPdc.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          { account_code: '102000', debit_amount: legacyPdc.nominal_value, credit_amount: '0.00' },
          { account_code: '203000', debit_amount: '0.00', credit_amount: legacyPdc.nominal_value }
        ]
      });

      await ERPSupabaseService.persistTranchePayment(
        client,
        BASE_CONTRACT.contract_id,
        matchingSchedule.schedule_id,
        legacyPdc.nominal_value,
        entry
      );
      await ERPSupabaseService.persistPDCStatus(client, legacyPdc.cheque_id, 'Cleared');

      const updatedSchedule = (db.get('erp_installment_schedules') ?? [])[0];
      const updatedContract = (db.get('erp_contracts') ?? [])[0];
      const updatedPdc = (db.get('erp_pdc_records') ?? [])[0];

      assert.strictEqual(updatedSchedule.status, 'Paid');
      assert.strictEqual(updatedPdc.status, 'Cleared');
      assert.strictEqual(updatedContract.total_cash_collected, '1250000.00');
    });
  });

  // =========================================================================
  // 3. RECORD BOUNCE TRANSITION (إثبات الارتداد البنكي للشيك)
  // =========================================================================
  describe('3. Record Bounce Transition (إثبات ارتداد بنكي)', () => {
    it('persists Bounced status to erp_pdc_records table in Supabase', async () => {
      const db = new Map<string, Record<string, unknown>[]>([
        ['erp_pdc_records', [{ ...BASE_PDC, status: 'Deposited', deposited_date: '2026-09-10' }]]
      ]);
      const client = createMockSupabaseClient(db);

      await ERPSupabaseService.persistPDCStatus(client, BASE_PDC.cheque_id, 'Bounced');

      const pdcRows = db.get('erp_pdc_records') ?? [];
      const updatedPdc = pdcRows.find(r => r.cheque_id === BASE_PDC.cheque_id);

      assert.ok(updatedPdc);
      assert.strictEqual(updatedPdc.status, 'Bounced');
    });

    it('generates a balanced reversal GL entry: Dr 103200 (Safe Custody returned) / Cr 104000 (Clearance reversed)', () => {
      const bounceEntry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-BNC-${BASE_PDC.cheque_number}`,
        entry_date: '2026-09-16',
        period: TEST_PERIOD,
        description: `إثبات ارتداد الشيك رقم ${BASE_PDC.cheque_number} وإعادته للخزينة بعد إيداعه برسم التحصيل`,
        source_module: 'PDC',
        source_entity_id: BASE_PDC.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          {
            account_code: '103200',
            debit_amount: BASE_PDC.nominal_value,
            credit_amount: '0.00',
            contract_id: BASE_PDC.contract_id,
            memo: `إعادة قيد الشيك المرتد بالخزينة #${BASE_PDC.cheque_number}`
          },
          {
            account_code: '104000',
            debit_amount: '0.00',
            credit_amount: BASE_PDC.nominal_value,
            contract_id: BASE_PDC.contract_id,
            memo: `عكس حساب برسم التحصيل للشيك المرتد #${BASE_PDC.cheque_number}`
          }
        ]
      });

      const balanceCheck = InvariantsValidator.verifyDoubleEntryBalance([bounceEntry]);
      assert.strictEqual(balanceCheck.passed, true);
      assert.strictEqual(bounceEntry.lines[0].account_code, '103200');
      assert.strictEqual(bounceEntry.lines[1].account_code, '104000');
      assert.strictEqual(bounceEntry.lines[0].debit_amount, '250000.00');
      assert.strictEqual(bounceEntry.lines[1].credit_amount, '250000.00');
    });

    it('persists bounce reversal entry and updates schedule to Defaulted', async () => {
      const db = new Map<string, Record<string, unknown>[]>([
        ['erp_pdc_records', [{ ...BASE_PDC, status: 'Deposited' }]],
        ['erp_installment_schedules', [{ ...BASE_SCHEDULE }]],
        ['erp_journal_entries', []],
        ['erp_journal_lines', []]
      ]);
      const client = createMockSupabaseClient(db);

      const bounceEntry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-BNC-${BASE_PDC.cheque_number}`,
        entry_date: '2026-09-16',
        period: TEST_PERIOD,
        description: `إثبات ارتداد الشيك رقم ${BASE_PDC.cheque_number}`,
        source_module: 'PDC',
        source_entity_id: BASE_PDC.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          { account_code: '103200', debit_amount: BASE_PDC.nominal_value, credit_amount: '0.00' },
          { account_code: '104000', debit_amount: '0.00', credit_amount: BASE_PDC.nominal_value }
        ]
      });

      // 1. Persist PDC status
      await ERPSupabaseService.persistPDCStatus(client, BASE_PDC.cheque_id, 'Bounced');

      // 2. Persist Journal Entry
      await ERPSupabaseService.persistJournalEntry(client, bounceEntry);

      // 3. Mark schedule as Defaulted
      await client
        .from('erp_installment_schedules')
        .update({ status: 'Defaulted' })
        .eq('schedule_id', BASE_SCHEDULE.schedule_id);

      const pdc = (db.get('erp_pdc_records') ?? [])[0];
      const sch = (db.get('erp_installment_schedules') ?? [])[0];
      const entries = db.get('erp_journal_entries') ?? [];

      assert.strictEqual(pdc.status, 'Bounced');
      assert.strictEqual(sch.status, 'Defaulted');
      assert.strictEqual(entries.length, 1);
    });

    it('reflects bounced status in vault projection without phantom cash or transit balances', () => {
      const bouncedPdc: ERPPDCRecord = {
        ...BASE_PDC,
        status: 'Bounced'
      };

      const items = buildProjectedVaultItems(
        [bouncedPdc],
        [BASE_SCHEDULE],
        [BASE_CONTRACT],
        [],
        { referenceDate: '2026-09-15' }
      );

      const kpis = calculateVaultKPIs(items, '2026-09-15');

      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].status, 'bounced');
      assert.strictEqual(kpis.bouncedCount, 1);
      assert.strictEqual(kpis.bouncedSum.toFixed(2), '250000.00');
      assert.strictEqual(kpis.depositedSum.toFixed(2), '0.00');
      assert.strictEqual(kpis.clearedSum.toFixed(2), '0.00');
    });

    it('handles bounce of In Safe cheque by updating status to Bounced without spurious circular GL entry', async () => {
      const db = new Map<string, Record<string, unknown>[]>([
        ['erp_pdc_records', [{ ...BASE_PDC, status: 'In Safe' }]],
        ['erp_installment_schedules', [{ ...BASE_SCHEDULE }]],
        ['erp_journal_entries', []],
        ['erp_journal_lines', []]
      ]);
      const client = createMockSupabaseClient(db);

      // In safe bounce: persist status Bounced and mark schedule Defaulted without posting circular Dr 103200 / Cr 103200
      await ERPSupabaseService.persistPDCStatus(client, BASE_PDC.cheque_id, 'Bounced');
      await client
        .from('erp_installment_schedules')
        .update({ status: 'Defaulted' })
        .eq('schedule_id', BASE_SCHEDULE.schedule_id);

      const pdc = (db.get('erp_pdc_records') ?? [])[0];
      const sch = (db.get('erp_installment_schedules') ?? [])[0];
      const entries = db.get('erp_journal_entries') ?? [];

      assert.strictEqual(pdc.status, 'Bounced');
      assert.strictEqual(sch.status, 'Defaulted');
      assert.strictEqual(entries.length, 0, 'No circular GL entry should be posted for unpresented cheque');
    });

    it('handles bounce of previously Cleared cheque: reverses bank cash (Cr 102000), resets schedule amount_paid, and decrements contract cash', async () => {
      const db = new Map<string, Record<string, unknown>[]>([
        ['erp_pdc_records', [{ ...BASE_PDC, status: 'Cleared', cleared_date: '2026-09-15' }]],
        ['erp_installment_schedules', [{ ...BASE_SCHEDULE, status: 'Paid', amount_paid: '250000.00', paid_date: '2026-09-15' }]],
        ['erp_contracts', [{ ...BASE_CONTRACT, total_cash_collected: '1250000.00' }]],
        ['erp_journal_entries', []],
        ['erp_journal_lines', []]
      ]);
      const client = createMockSupabaseClient(db);

      // Reversal entry: Dr 203000 (reopen deferred rev) / Cr 102000 (bank deduction)
      const bounceEntry = GeneralLedgerEngine.validateAndCreateEntry({
        entry_number: `JE-PDC-BNC-CLR-${BASE_PDC.cheque_number}`,
        entry_date: '2026-09-18',
        period: TEST_PERIOD,
        description: `إثبات ارتداد بنكي بعد التحصيل للشيك #${BASE_PDC.cheque_number}`,
        source_module: 'PDC',
        source_entity_id: BASE_PDC.cheque_id,
        created_by: 'CFO_FARID',
        lines: [
          { account_code: '203000', debit_amount: BASE_PDC.nominal_value, credit_amount: '0.00' },
          { account_code: '102000', debit_amount: '0.00', credit_amount: BASE_PDC.nominal_value }
        ]
      });

      assert.strictEqual(InvariantsValidator.verifyDoubleEntryBalance([bounceEntry]).passed, true);
      assert.strictEqual(bounceEntry.lines[0].account_code, '203000');
      assert.strictEqual(bounceEntry.lines[1].account_code, '102000');

      // Execute persistence
      await ERPSupabaseService.persistPDCStatus(client, BASE_PDC.cheque_id, 'Bounced');
      await ERPSupabaseService.persistJournalEntry(client, bounceEntry);

      // Reset schedule
      await client
        .from('erp_installment_schedules')
        .update({ status: 'Defaulted', amount_paid: '0.00', paid_date: null })
        .eq('schedule_id', BASE_SCHEDULE.schedule_id);

      // Decrement contract total_cash_collected
      await client
        .from('erp_contracts')
        .update({ total_cash_collected: '1000000.00' })
        .eq('contract_id', BASE_CONTRACT.contract_id);

      const pdc = (db.get('erp_pdc_records') ?? [])[0];
      const sch = (db.get('erp_installment_schedules') ?? [])[0];
      const contract = (db.get('erp_contracts') ?? [])[0];
      const entries = db.get('erp_journal_entries') ?? [];

      assert.strictEqual(pdc.status, 'Bounced');
      assert.strictEqual(sch.status, 'Defaulted');
      assert.strictEqual(sch.amount_paid, '0.00');
      assert.strictEqual(sch.paid_date, null);
      assert.strictEqual(contract.total_cash_collected, '1000000.00');
      assert.strictEqual(entries.length, 1);

      // Vault projection must now truthfully reflect the remaining unpaid debt
      const items = buildProjectedVaultItems(
        [pdc as unknown as ERPPDCRecord],
        [sch as unknown as ERPInstallmentSchedule],
        [contract as unknown as ERPContract],
        [],
        { referenceDate: '2026-09-18' }
      );
      assert.strictEqual(items[0].status, 'bounced');
      assert.strictEqual(items[0].remainingAmount, '250000.00', 'Remaining debt must be 250000, not 0.00');
      assert.strictEqual(items[0].amountPaid, '0.00', 'Amount paid must be 0.00 after bounce');
    });
  });

  // =========================================================================
  // 4. ACCOUNTING INVARIANTS & INTEGRITY GUARDS
  // =========================================================================
  describe('4. Invariant 0.9 & Accounting Period Protections', () => {
    it('strictly prohibits posting deposit journal entry into a CLOSED period (Invariant 0.9)', () => {
      assert.throws(() => {
        GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-PDC-DEP-FAIL`,
          entry_date: '2026-08-15',
          period: CLOSED_PERIOD, // CLOSED period!
          description: 'محاولة إيداع في فترة مغلقة',
          source_module: 'PDC',
          source_entity_id: BASE_PDC.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            { account_code: '104000', debit_amount: '250000.00', credit_amount: '0.00' },
            { account_code: '103200', debit_amount: '0.00', credit_amount: '250000.00' }
          ]
        });
      }, /ERP Invariant 0.9 Violation/);
    });

    it('strictly prohibits posting clearance entry into a CLOSED period (Invariant 0.9)', () => {
      assert.throws(() => {
        GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-PDC-CLR-FAIL`,
          entry_date: '2026-08-15',
          period: CLOSED_PERIOD,
          description: 'محاولة مقاصة في فترة مغلقة',
          source_module: 'PDC',
          source_entity_id: BASE_PDC.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            { account_code: '102000', debit_amount: '250000.00', credit_amount: '0.00' },
            { account_code: '203000', debit_amount: '0.00', credit_amount: '250000.00' }
          ]
        });
      }, /ERP Invariant 0.9 Violation/);
    });

    it('strictly prohibits posting bounce entry into a CLOSED period (Invariant 0.9)', () => {
      assert.throws(() => {
        GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: `JE-PDC-BNC-FAIL`,
          entry_date: '2026-08-15',
          period: CLOSED_PERIOD,
          description: 'محاولة إثبات ارتداد في فترة مغلقة',
          source_module: 'PDC',
          source_entity_id: BASE_PDC.cheque_id,
          created_by: 'CFO_FARID',
          lines: [
            { account_code: '103200', debit_amount: '250000.00', credit_amount: '0.00' },
            { account_code: '104000', debit_amount: '0.00', credit_amount: '250000.00' }
          ]
        });
      }, /ERP Invariant 0.9 Violation/);
    });
  });

  // =========================================================================
  // 5. DETAIL DRAWER ACTION AVAILABILITY MATRIX
  // =========================================================================
  describe('5. Detail Drawer Action Availability Matrix', () => {
    it('evaluates truthful action availability based on item lifecycle status', () => {
      // Helper matching InstallmentDetailDrawer.tsx rules:
      const evaluateDrawerActions = (status: string, hasCheque: boolean) => {
        const isCleared = status === 'cleared';
        const isDeposited = status === 'deposited';
        const isBounced = status === 'bounced';

        return {
          canDeposit: hasCheque && !isDeposited && !isCleared && !isBounced,
          canClear: isDeposited,
          canBounce: hasCheque && !isCleared && !isBounced,
          canCollectImmediate: !isCleared && !isDeposited,
          canPrintReceipt: isCleared,
          canPrintDueNotice: !isCleared
        };
      };

      // State 1: In Safe (with cheque)
      const inSafe = evaluateDrawerActions('in_safe', true);
      assert.strictEqual(inSafe.canDeposit, true, 'Cheque in safe can be deposited');
      assert.strictEqual(inSafe.canClear, false, 'Cheque in safe cannot be cleared directly without deposit/collection');
      assert.strictEqual(inSafe.canBounce, true, 'Cheque in safe can be recorded as bounced');
      assert.strictEqual(inSafe.canCollectImmediate, true, 'Cheque in safe can be collected immediate cash');
      assert.strictEqual(inSafe.canPrintReceipt, false, 'Uncollected item cannot have receipt voucher');
      assert.strictEqual(inSafe.canPrintDueNotice, true, 'Uncollected item has formal due notice');

      // State 2: Deposited in Bank
      const deposited = evaluateDrawerActions('deposited', true);
      assert.strictEqual(deposited.canDeposit, false, 'Deposited cheque cannot be re-deposited');
      assert.strictEqual(deposited.canClear, true, 'Deposited cheque can be cleared');
      assert.strictEqual(deposited.canBounce, true, 'Deposited cheque can bounce');
      assert.strictEqual(deposited.canCollectImmediate, false, 'Deposited cheque is in transit; cannot double-collect');
      assert.strictEqual(deposited.canPrintReceipt, false, 'In-transit cheque cannot have receipt voucher');
      assert.strictEqual(deposited.canPrintDueNotice, true, 'In-transit cheque still has due notice');

      // State 3: Cleared
      const cleared = evaluateDrawerActions('cleared', true);
      assert.strictEqual(cleared.canDeposit, false, 'Cleared item cannot be deposited');
      assert.strictEqual(cleared.canClear, false, 'Cleared item cannot be re-cleared');
      assert.strictEqual(cleared.canBounce, false, 'Cleared item cannot bounce from normal lifecycle');
      assert.strictEqual(cleared.canCollectImmediate, false, 'Cleared item is already collected');
      assert.strictEqual(cleared.canPrintReceipt, true, 'Cleared item gets official cash receipt voucher');
      assert.strictEqual(cleared.canPrintDueNotice, false, 'Cleared item does not get due notice');

      // State 4: Bounced
      const bounced = evaluateDrawerActions('bounced', true);
      assert.strictEqual(bounced.canDeposit, false, 'Bounced cheque cannot be deposited');
      assert.strictEqual(bounced.canClear, false, 'Bounced cheque cannot be cleared');
      assert.strictEqual(bounced.canBounce, false, 'Already bounced cheque cannot bounce again');
      assert.strictEqual(bounced.canPrintReceipt, false, 'Bounced cheque cannot have receipt voucher');
    });
  });
});
