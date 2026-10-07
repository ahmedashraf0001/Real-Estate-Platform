import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PartnersEngine, computeProjectPayoutPosition, isSamePartner } from '../partnersEngine';
import { ERPSupabaseService } from '../supabaseService';
import type { ERPAccountingPeriod, ERPPartnerProfile, ERPPartnerTransaction } from '../types';
import { D, isUUID, generateUUID, ensureUUID } from '../math';
import { PRIMARY_DEVELOPER_NAME, saveRegisteredPartner } from '../partnersDirectory';
import { resolvePeriodForDate } from '../ledger';

const TEST_PERIOD: ERPAccountingPeriod = {
  period_id: 'period-2026-04-uuid-000000000001',
  fiscal_year: 2026,
  period_number: 4,
  start_date: '2026-04-01',
  end_date: '2026-04-30',
  status: 'OPEN'
};

const TEST_ENTRY_DATE = '2026-04-15';
const PARTNER_UUID = '550e8400-e29b-41d4-a716-446655440000';

function mockSupabaseClient(tableStore: Map<string, Record<string, unknown>[]>): SupabaseClient {
  return {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      getUser: async () => ({ data: { user: null } })
    },
    from(table: string) {
      return {
        select(cols?: string) {
          let eqField: string | null = null;
          let eqVal: unknown = null;
          const query = {
            eq(f: string, v: unknown) {
              eqField = f;
              eqVal = v;
              return query;
            },
            limit(_n: number) {
              return query;
            },
            order(_f: string, _opt?: any) {
              return query;
            },
            then(resolve: (res: any) => any, reject?: (err: any) => any) {
              const all = tableStore.get(table) || [];
              const filtered = eqField ? all.filter(r => r[eqField!] === eqVal) : all;
              return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
            }
          };
          return query;
        },
        async insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
          const list = Array.isArray(rows) ? rows : [rows];
          tableStore.set(table, [...(tableStore.get(table) ?? []), ...list]);
          return { error: null };
        },
        async upsert(rowOrRows: Record<string, unknown> | Record<string, unknown>[], opt?: { onConflict?: string }) {
          const list = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          const conflictCol = opt?.onConflict || 'id';
          const existing = tableStore.get(table) ?? [];
          for (const item of list) {
            const idx = existing.findIndex(e => e[conflictCol] === item[conflictCol]);
            if (idx >= 0) {
              existing[idx] = { ...existing[idx], ...item };
            } else {
              existing.push({ ...item });
            }
          }
          tableStore.set(table, existing);
          return { error: null };
        }
      };
    }
  } as unknown as SupabaseClient;
}

/**
 * Extracts and compiles a production callback from ERPWorkstationContext.tsx
 * using TypeScript AST extraction, preserving real handler execution.
 */
function extractContextHandler(handlerName: string) {
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

  return (scope: Record<string, any>) => {
    const keys = Object.keys(scope);
    const values = Object.values(scope);
    const fn = new Function(...keys, transpiled);
    return fn(...values);
  };
}

describe('fin-c2-partner-id-lines: partner equity journal line tagging', () => {
  // T1. createPayoutJournalEntry with partnerId (a UUID) and a debt offset
  it('T1: createPayoutJournalEntry with partnerId tags 303000 and 301000 lines; cash line has no partner_id; balances debits=credits', () => {
    const entry = PartnersEngine.createPayoutJournalEntry({
      partnerName: 'م. أحمد الشريف',
      partnerId: PARTNER_UUID,
      amount: '750000.00',
      debtOffsetAmount: '250000.00',
      paymentMethod: 'CASH_101000',
      propertyTitle: 'برج الأمل',
      date: TEST_ENTRY_DATE,
      currentPeriod: TEST_PERIOD
    });

    const line303 = entry.lines.find(l => l.account_code === '303000');
    const line301 = entry.lines.find(l => l.account_code === '301000');
    const line101 = entry.lines.find(l => l.account_code === '101000');

    assert.ok(line303, '303000 line must exist');
    assert.strictEqual(line303.partner_id, PARTNER_UUID, '303000 distribution line must carry partner_id UUID');

    assert.ok(line301, '301000 line must exist for debt offset');
    assert.strictEqual(line301.partner_id, PARTNER_UUID, '301000 debt offset line must carry partner_id UUID');

    assert.ok(line101, '101000 cash line must exist');
    assert.strictEqual(line101.partner_id, undefined, '101000 cash line must NOT carry partner_id');

    // Debits = credits
    const totalDr = entry.lines.reduce((s, l) => s.plus(l.debit_amount), D(0));
    const totalCr = entry.lines.reduce((s, l) => s.plus(l.credit_amount), D(0));
    assert.strictEqual(totalDr.toFixed(2), totalCr.toFixed(2), 'Debits must equal credits');
    assert.strictEqual(totalDr.toFixed(2), '1000000.00');
  });

  // T2. createCapitalInjectionJournalEntry with partnerId
  it('T2: createCapitalInjectionJournalEntry with partnerId tags 301000 line; bank line does not carry partner_id', () => {
    const entry = PartnersEngine.createCapitalInjectionJournalEntry({
      partnerName: 'م. أحمد الشريف',
      partnerId: PARTNER_UUID,
      amount: '500000.00',
      paymentMethod: 'BANK_102000',
      propertyTitle: 'برج الأمل',
      date: TEST_ENTRY_DATE,
      currentPeriod: TEST_PERIOD
    });

    const line301 = entry.lines.find(l => l.account_code === '301000');
    const line102 = entry.lines.find(l => l.account_code === '102000');

    assert.ok(line301, '301000 capital line must exist');
    assert.strictEqual(line301.partner_id, PARTNER_UUID, '301000 capital line must carry partner_id UUID');

    assert.ok(line102, '102000 bank line must exist');
    assert.strictEqual(line102.partner_id, undefined, '102000 bank line must NOT carry partner_id');
  });

  // T3. Without partnerId both builders behave exactly as before
  it('T3: Without partnerId both builders leave partner_id undefined on all lines', () => {
    const payoutEntry = PartnersEngine.createPayoutJournalEntry({
      partnerName: 'م. أحمد الشريف',
      amount: '300000.00',
      debtOffsetAmount: '100000.00',
      paymentMethod: 'CASH_101000',
      propertyTitle: 'برج الأمل',
      date: TEST_ENTRY_DATE,
      currentPeriod: TEST_PERIOD
    });

    for (const line of payoutEntry.lines) {
      assert.strictEqual(line.partner_id, undefined, `Payout line ${line.account_code} must have undefined partner_id`);
    }

    const injectionEntry = PartnersEngine.createCapitalInjectionJournalEntry({
      partnerName: 'م. أحمد الشريف',
      amount: '200000.00',
      paymentMethod: 'BANK_102000',
      propertyTitle: 'برج الأمل',
      date: TEST_ENTRY_DATE,
      currentPeriod: TEST_PERIOD
    });

    for (const line of injectionEntry.lines) {
      assert.strictEqual(line.partner_id, undefined, `Injection line ${line.account_code} must have undefined partner_id`);
    }
  });

  // T4. The persistence mapper (supabaseService ~846 path, smallest seam) writes partner_id for those lines
  it('T4: The persistence mapper (supabaseService ~846 path) writes partner_id for those lines', async () => {
    const payoutEntry = PartnersEngine.createPayoutJournalEntry({
      partnerName: 'م. أحمد الشريف',
      partnerId: PARTNER_UUID,
      amount: '400000.00',
      debtOffsetAmount: '100000.00',
      paymentMethod: 'CASH_101000',
      propertyTitle: 'برج الأمل',
      date: TEST_ENTRY_DATE,
      currentPeriod: TEST_PERIOD
    });

    const tableStore = new Map<string, Record<string, unknown>[]>();
    const client = mockSupabaseClient(tableStore);

    await ERPSupabaseService.persistJournalEntry(client, payoutEntry, true);

    const savedLines = tableStore.get('erp_journal_lines') || [];
    assert.strictEqual(savedLines.length, 3, 'Must save 3 journal line rows');

    const line303 = savedLines.find(r => r.account_code === '303000');
    const line301 = savedLines.find(r => r.account_code === '301000');
    const line101 = savedLines.find(r => r.account_code === '101000');

    assert.ok(line303, '303000 row must exist in erp_journal_lines');
    assert.strictEqual(line303.partner_id, PARTNER_UUID, '303000 line in DB must have partner_id UUID');

    assert.ok(line301, '301000 row must exist in erp_journal_lines');
    assert.strictEqual(line301.partner_id, PARTNER_UUID, '301000 line in DB must have partner_id UUID');

    assert.ok(line101, '101000 row must exist in erp_journal_lines');
    assert.strictEqual(line101.partner_id, null, '101000 line in DB must have null partner_id');

    // Smallest seam unit check on mapJournalLineForPersistence directly
    const mappedWithUuid = ERPSupabaseService.mapJournalLineForPersistence({
      account_code: '303000',
      debit_amount: '100.00',
      credit_amount: '0.00',
      partner_id: PARTNER_UUID
    } as any, 'e-1', 0);
    assert.strictEqual(mappedWithUuid.partner_id, PARTNER_UUID, 'Mapper must write partner_id when UUID');

    const mappedWithoutUuid = ERPSupabaseService.mapJournalLineForPersistence({
      account_code: '101000',
      debit_amount: '0.00',
      credit_amount: '100.00'
    } as any, 'e-1', 1);
    assert.strictEqual(mappedWithoutUuid.partner_id, null, 'Mapper must write null when partner_id undefined');

    const mappedWithNonUuid = ERPSupabaseService.mapJournalLineForPersistence({
      account_code: '301000',
      debit_amount: '0.00',
      credit_amount: '100.00',
      partner_id: 'pt-001'
    } as any, 'e-1', 2);
    assert.strictEqual(mappedWithNonUuid.partner_id, null, 'Mapper must write null when partner_id non-UUID');
  });

  // F1 [R2]: handleRegisterNewPartner retains persisted profile UUID and passes it to initial deposit
  describe('F1 [R2]: handleRegisterNewPartner profile identity and initial deposit tagging', () => {
    it('F1.1: empty profiles + initialDeposit saves one profile; 301000 carries saved partner_id; 101000 is null; local profile id equals saved partner_id', async () => {
      const tableStore = new Map<string, Record<string, unknown>[]>();
      const client = mockSupabaseClient(tableStore);
      let localProfiles: ERPPartnerProfile[] = [];
      let localJournalEntries: any[] = [];
      let localProperties: any[] = [];

      const factory = extractContextHandler('handleRegisterNewPartner');
      const handler = factory({
        setIsMutating: () => {},
        saveRegisteredPartner: () => {},
        PRIMARY_DEVELOPER_NAME,
        setPartnerProfiles: (fn: any) => { localProfiles = typeof fn === 'function' ? fn(localProfiles) : fn; },
        partnerProfiles: localProfiles,
        ERPSupabaseService,
        supabase: client,
        toast: { info: () => {}, error: () => {}, success: () => {} },
        isAr: true,
        setData: (fn: any) => {
          const prev = { properties: localProperties, journalEntries: localJournalEntries };
          const next = typeof fn === 'function' ? fn(prev) : fn;
          localProperties = next.properties;
          localJournalEntries = next.journalEntries;
        },
        D,
        resolveAndEnsurePeriodForDate: async () => TEST_PERIOD,
        ensureActivePeriodOpen: () => true,
        PartnersEngine,
        persistJournalEntryGuarded: async (entry: any) => {
          await ERPSupabaseService.persistJournalEntry(client, entry, true);
        },
        setPartnerTransactions: () => {},
        ensureUUID,
        isSamePartner,
        isUUID,
        generateUUID
      });

      await handler({
        name: 'شريك تجريبي جديد',
        role: 'equity_partner',
        phone: '01099998888',
        nationalId: '29001011234567',
        initialDeposit: {
          amount: '500000.00',
          paymentMethod: 'CASH_101000',
          date: TEST_ENTRY_DATE,
          receiptRef: 'DEP-001'
        }
      });

      // Assert Supabase profile row
      const savedProfiles = tableStore.get('erp_partner_profiles') || [];
      assert.strictEqual(savedProfiles.length, 1, 'Must persist exactly one profile');
      const savedPartnerId = savedProfiles[0].partner_id as string;
      assert.ok(isUUID(savedPartnerId), 'Saved partner_id must be a UUID');

      // Assert local state profile id
      assert.strictEqual(localProfiles.length, 1);
      assert.strictEqual(localProfiles[0].id, savedPartnerId, 'Local profile id must equal saved partner_id');

      // Assert saved journal lines in DB
      const savedLines = tableStore.get('erp_journal_lines') || [];
      const line301 = savedLines.find(r => r.account_code === '301000');
      const line101 = savedLines.find(r => r.account_code === '101000');
      assert.ok(line301, '301000 capital line must exist');
      assert.strictEqual(line301.partner_id, savedPartnerId, '301000.partner_id must equal saved partner_id');
      assert.ok(line101, '101000 cash line must exist');
      assert.strictEqual(line101.partner_id, null, '101000 cash line must have null partner_id');
    });

    it('F1.2: existing-name registration retains existing UUID, does not overwrite it', async () => {
      const EXISTING_UUID = '11111111-2222-4333-8444-555555555555';
      const tableStore = new Map<string, Record<string, unknown>[]>([
        ['erp_partner_profiles', [{ partner_id: EXISTING_UUID, name: 'شريك موجود مسبقا', role: 'equity_partner' }]]
      ]);
      const client = mockSupabaseClient(tableStore);
      let localProfiles: ERPPartnerProfile[] = [
        { id: EXISTING_UUID, name: 'شريك موجود مسبقا', role: 'equity_partner', joined_date: '2026-01-01' }
      ];
      let localJournalEntries: any[] = [];

      const factory = extractContextHandler('handleRegisterNewPartner');
      const handler = factory({
        setIsMutating: () => {},
        saveRegisteredPartner: () => {},
        PRIMARY_DEVELOPER_NAME,
        setPartnerProfiles: (fn: any) => { localProfiles = typeof fn === 'function' ? fn(localProfiles) : fn; },
        partnerProfiles: localProfiles,
        ERPSupabaseService,
        supabase: client,
        toast: { info: () => {}, error: () => {}, success: () => {} },
        isAr: true,
        setData: (fn: any) => {
          const prev = { properties: [], journalEntries: localJournalEntries };
          const next = typeof fn === 'function' ? fn(prev) : fn;
          localJournalEntries = next.journalEntries;
        },
        D,
        resolveAndEnsurePeriodForDate: async () => TEST_PERIOD,
        ensureActivePeriodOpen: () => true,
        PartnersEngine,
        persistJournalEntryGuarded: async (entry: any) => {
          await ERPSupabaseService.persistJournalEntry(client, entry, true);
        },
        setPartnerTransactions: () => {},
        ensureUUID,
        isSamePartner,
        isUUID,
        generateUUID
      });

      await handler({
        name: 'شريك موجود مسبقا',
        role: 'equity_partner',
        phone: '0122223333'
      });

      const savedProfiles = tableStore.get('erp_partner_profiles') || [];
      assert.strictEqual(savedProfiles.length, 1);
      assert.strictEqual(savedProfiles[0].partner_id, EXISTING_UUID, 'Must retain existing partner UUID in DB');
      assert.strictEqual(localProfiles[0].id, EXISTING_UUID, 'Must retain existing partner UUID in local state');
    });

    it('F1.3: profile failure cannot produce a journal tagged with a nonexistent profile UUID', async () => {
      const failingClient = {
        auth: { getSession: async () => ({ data: { session: null } }), getUser: async () => ({ data: { user: null } }) },
        from(table: string) {
          return {
            select() {
              const query = {
                eq() { return query; },
                async limit() { return { data: [], error: null }; }
              };
              return query;
            },
            async insert() { return { error: null }; },
            async upsert() {
              if (table === 'erp_partner_profiles') {
                return { error: { message: 'Database failure on partner profile insert' } };
              }
              return { error: null };
            }
          };
        }
      } as unknown as SupabaseClient;

      let localProfiles: ERPPartnerProfile[] = [];
      let savedJournalEntries: any[] = [];

      const factory = extractContextHandler('handleRegisterNewPartner');
      const handler = factory({
        setIsMutating: () => {},
        saveRegisteredPartner: () => {},
        PRIMARY_DEVELOPER_NAME,
        setPartnerProfiles: (fn: any) => { localProfiles = typeof fn === 'function' ? fn(localProfiles) : fn; },
        partnerProfiles: localProfiles,
        ERPSupabaseService,
        supabase: failingClient,
        toast: { info: () => {}, error: () => {}, success: () => {} },
        isAr: true,
        setData: () => {},
        D,
        resolveAndEnsurePeriodForDate: async () => TEST_PERIOD,
        ensureActivePeriodOpen: () => true,
        PartnersEngine,
        persistJournalEntryGuarded: async (entry: any) => { savedJournalEntries.push(entry); },
        setPartnerTransactions: () => {},
        ensureUUID,
        isSamePartner,
        isUUID,
        generateUUID
      });

      await handler({
        name: 'شريك فاشل الحفظ',
        role: 'equity_partner',
        initialDeposit: {
          amount: '100000.00',
          paymentMethod: 'CASH_101000',
          date: TEST_ENTRY_DATE,
          receiptRef: 'FAIL-001'
        }
      });

      // Journal entry 301000 must NOT have a non-persisted UUID attached
      assert.strictEqual(savedJournalEntries.length, 1, 'Must exercise initial deposit after profile failure');
      assert.strictEqual(localProfiles.length, 1);
      assert.ok(!isUUID(localProfiles[0].id), 'Failed profile must not claim a saved UUID');
      {
        const line301 = savedJournalEntries[0].lines.find((l: any) => l.account_code === '301000');
        assert.strictEqual(line301?.partner_id, undefined, 'Must not tag journal with unpersisted profile UUID');
      }
    });
  });

  // F2 [R2]: handleConfirmPartnerInjection preserves UUID and maintains consistent identity across flows
  describe('F2 [R2]: handleConfirmPartnerInjection identity consistency', () => {
    it('F2.3: failed identity lookup never writes a replacement profile UUID', async () => {
      for (const rejectLookup of [false, true]) {
        const lookupError = { message: 'Partner identity lookup failed', code: '42501' };
        let writes = 0;
        const client = {
          from() {
            const query = {
              select() { return query; },
              eq() { return query; },
              async limit() {
                if (rejectLookup) throw lookupError;
                return { data: null, error: lookupError };
              },
              async upsert() { writes++; return { error: null }; }
            };
            return query;
          }
        } as unknown as SupabaseClient;
        await assert.rejects(
          ERPSupabaseService.persistPartnerProfile(client, { name: 'Existing partner' }),
          error => error === lookupError
        );
        assert.strictEqual(writes, 0, 'Unknown identity must not be replaced');
      }
    });

    it('F2.1: loaded UUID A remains A in saved profile, 301000 line, and context', async () => {
      const PARTNER_A_UUID = 'aaaaaaaa-1111-4111-8111-111111111111';
      const tableStore = new Map<string, Record<string, unknown>[]>([
        ['erp_partner_profiles', [{ partner_id: PARTNER_A_UUID, name: 'شريك قديم أ', role: 'equity_partner' }]]
      ]);
      const client = mockSupabaseClient(tableStore);
      let localProfiles: ERPPartnerProfile[] = [
        { id: PARTNER_A_UUID, name: 'شريك قديم أ', role: 'equity_partner', joined_date: '2026-01-01' }
      ];
      let localJournalEntries: any[] = [];

      const factory = extractContextHandler('handleConfirmPartnerInjection');
      const handler = factory({
        resolveAndEnsurePeriodForDate: async () => TEST_PERIOD,
        ensureActivePeriodOpen: () => true,
        isAr: true,
        setIsMutating: () => {},
        partnerProfiles: localProfiles,
        isSamePartner,
        isUUID,
        PartnersEngine,
        persistJournalEntryGuarded: async (entry: any) => {
          await ERPSupabaseService.persistJournalEntry(client, entry, true);
        },
        generateUUID,
        ensureUUID,
        ERPSupabaseService,
        supabase: client,
        toast: { info: () => {}, error: () => {}, success: () => {} },
        saveRegisteredPartner: () => {},
        setPartnerProfiles: (fn: any) => { localProfiles = typeof fn === 'function' ? fn(localProfiles) : fn; },
        setData: (fn: any) => {
          const prev = { properties: [], journalEntries: localJournalEntries, partnerCommitments: [] };
          const next = typeof fn === 'function' ? fn(prev) : fn;
          localJournalEntries = next.journalEntries;
        },
        D,
        setPartnerTransactions: () => {},
        resolvePeriodForDate: () => TEST_PERIOD,
        data: { periods: [TEST_PERIOD] },
        activePeriod: TEST_PERIOD
      });

      await handler({
        partnerName: 'شريك قديم أ',
        amount: '250000.00',
        paymentMethod: 'CASH_101000',
        injectionDate: TEST_ENTRY_DATE,
        receiptRef: 'INJ-001',
        memo: 'زيادة رأس مال'
      });

      // DB profile must still have UUID A (not replaced by a new random UUID)
      const savedProfiles = tableStore.get('erp_partner_profiles') || [];
      assert.strictEqual(savedProfiles.length, 1);
      assert.strictEqual(savedProfiles[0].partner_id, PARTNER_A_UUID, 'Saved profile must retain UUID A');

      // Local state must still have UUID A
      assert.strictEqual(localProfiles[0].id, PARTNER_A_UUID, 'Local state must retain UUID A');

      // 301000 line must have UUID A; 101000 must have null
      const savedLines = tableStore.get('erp_journal_lines') || [];
      const line301 = savedLines.find(r => r.account_code === '301000');
      const line101 = savedLines.find(r => r.account_code === '101000');
      assert.ok(line301);
      assert.strictEqual(line301.partner_id, PARTNER_A_UUID, '301000 line must carry UUID A');
      assert.ok(line101);
      assert.strictEqual(line101.partner_id, null, '101000 cash line must remain null');
    });

    it('F2.2: new partner injection retains saved UUID across first and second injection, and subsequent payout sees it', async () => {
      const tableStore = new Map<string, Record<string, unknown>[]>();
      const client = mockSupabaseClient(tableStore);
      let localProfiles: ERPPartnerProfile[] = [];
      let localJournalEntries: any[] = [];
      let localTransactions: ERPPartnerTransaction[] = [];

      const injectionFactory = extractContextHandler('handleConfirmPartnerInjection');
      const payoutFactory = extractContextHandler('handleConfirmPartnerPayout');

      const makeInjectionHandler = () => injectionFactory({
        resolveAndEnsurePeriodForDate: async () => TEST_PERIOD,
        ensureActivePeriodOpen: () => true,
        isAr: true,
        setIsMutating: () => {},
        partnerProfiles: localProfiles,
        isSamePartner,
        isUUID,
        PartnersEngine,
        persistJournalEntryGuarded: async (entry: any) => {
          await ERPSupabaseService.persistJournalEntry(client, entry, true);
        },
        generateUUID,
        ensureUUID,
        ERPSupabaseService,
        supabase: client,
        toast: { info: () => {}, error: () => {}, success: () => {} },
        saveRegisteredPartner: () => {},
        setPartnerProfiles: (fn: any) => { localProfiles = typeof fn === 'function' ? fn(localProfiles) : fn; },
        setData: (fn: any) => {
          const prev = { properties: [], journalEntries: localJournalEntries, partnerCommitments: [] };
          const next = typeof fn === 'function' ? fn(prev) : fn;
          localJournalEntries = next.journalEntries;
        },
        D,
        setPartnerTransactions: (fn: any) => { localTransactions = typeof fn === 'function' ? fn(localTransactions) : fn; },
        resolvePeriodForDate: () => TEST_PERIOD,
        data: { periods: [TEST_PERIOD] },
        activePeriod: TEST_PERIOD
      });

      // 1. First injection from new partner (empty profiles)
      await makeInjectionHandler()({
        partnerName: 'شريك قادم جديد',
        amount: '600000.00',
        paymentMethod: 'BANK_102000',
        injectionDate: TEST_ENTRY_DATE,
        receiptRef: 'INJ-FIRST',
        memo: 'أول إيداع'
      });

      const savedProfiles = tableStore.get('erp_partner_profiles') || [];
      assert.strictEqual(savedProfiles.length, 1, 'Must persist profile');
      const newPartnerUUID = savedProfiles[0].partner_id as string;
      assert.ok(isUUID(newPartnerUUID), 'Must have saved a valid UUID');

      // Local state has that UUID
      assert.strictEqual(localProfiles.length, 1);
      assert.strictEqual(localProfiles[0].id, newPartnerUUID, 'Local profile id must match saved UUID');

      // First injection 301000 line has that UUID
      const savedLines = tableStore.get('erp_journal_lines') || [];
      const firstLine301 = savedLines.filter(r => r.account_code === '301000')[0];
      assert.ok(firstLine301);
      assert.strictEqual(firstLine301.partner_id, newPartnerUUID, 'First injection 301000 must carry saved UUID');

      // 2. Second injection for same partner reuses the exact same UUID
      await makeInjectionHandler()({
        partnerName: 'شريك قادم جديد',
        amount: '300000.00',
        paymentMethod: 'CASH_101000',
        injectionDate: TEST_ENTRY_DATE,
        receiptRef: 'INJ-SECOND',
        memo: 'ثاني إيداع'
      });

      const savedProfilesAfterSecond = tableStore.get('erp_partner_profiles') || [];
      assert.strictEqual(savedProfilesAfterSecond.length, 1, 'Must not duplicate profile row');
      assert.strictEqual(savedProfilesAfterSecond[0].partner_id, newPartnerUUID, 'Must retain same UUID after second injection');

      const allLines301 = (tableStore.get('erp_journal_lines') || []).filter(r => r.account_code === '301000');
      assert.strictEqual(allLines301.length, 2);
      assert.strictEqual(allLines301[1].partner_id, newPartnerUUID, 'Second injection 301000 must carry same UUID');

      // 3. Subsequent payout sees that UUID from partnerProfiles
      const payoutHandler = payoutFactory({
        data: {
          properties: [{ id: 'prop-1', title_ar: 'مشروع 1', partner_splits: [{ partner_name: 'شريك قادم جديد', share_percentage: '50' }] }],
          contracts: [],
          partnerCommitments: [],
          journalEntries: [{ lines: [{ account_code: '101000', debit_amount: '1000000.00', credit_amount: '0.00' }] }],
          periods: [TEST_PERIOD]
        },
        toast: { info: () => {}, error: () => {}, success: () => {} },
        isAr: true,
        resolveAndEnsurePeriodForDate: async () => TEST_PERIOD,
        ensureActivePeriodOpen: () => true,
        setIsMutating: () => {},
        computeProjectPayoutPosition: () => ({ offsetNow: '0.00', cashAvailable: '50000.00', commitmentDebt: '0.00' }),
        partnerTransactions: localTransactions,
        D,
        partnerProfiles: localProfiles,
        isSamePartner,
        isUUID,
        PartnersEngine,
        persistJournalEntryGuarded: async (entry: any) => {
          await ERPSupabaseService.persistJournalEntry(client, entry, true);
        },
        generateUUID,
        ERPSupabaseService,
        supabase: client,
        setPartnerTransactions: () => {},
        setData: () => {}
      });

      await payoutHandler({
        partnerName: 'شريك قادم جديد',
        amount: '20000.00',
        paymentMethod: 'CASH_101000',
        propertyId: 'prop-1',
        payoutDate: TEST_ENTRY_DATE,
        receiptRef: 'PAY-001',
        memo: 'صرف أرباح'
      });

      const savedLines303 = (tableStore.get('erp_journal_lines') || []).filter(r => r.account_code === '303000');
      assert.strictEqual(savedLines303.length, 1, 'Payout 303000 line must exist');
      assert.strictEqual(savedLines303[0].partner_id, newPartnerUUID, 'Payout 303000 line must resolve saved UUID');

      // Cash lines never tagged
      const allCashLines = (tableStore.get('erp_journal_lines') || []).filter(r => r.account_code === '101000' || r.account_code === '102000');
      for (const cl of allCashLines) {
        assert.strictEqual(cl.partner_id, null, `Cash line ${cl.account_code} must remain null in DB`);
      }
    });
  });
});
