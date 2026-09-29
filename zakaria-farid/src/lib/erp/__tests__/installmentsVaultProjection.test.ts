import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  buildProjectedVaultItems, 
  calculateVaultKPIs,
  normalizeDateStr,
  formatYMD,
  toLocalDateStr,
  getLocalTodayStr,
  getDistinctiveUnit
} from '../installmentsVaultProjection';
import { ERPContract, ERPInstallmentSchedule, ERPPDCRecord } from '../types';
import { Property } from '../../supabase/types';

describe('Installments Vault & Receivables Projection Engine', () => {
  const mockProperties: Property[] = [
    {
      id: 'prop-1',
      title_ar: 'برج الأهرام بلازا',
      title_en: 'Al-Ahram Plaza Tower',
      slug: 'al-ahram',
      created_at: '2025-01-01',
      updated_at: '2025-01-01'
    } as unknown as Property
  ];

  const mockContracts: ERPContract[] = [
    {
      contract_id: 'cnt-1',
      contract_number: 'CNT-2025-001',
      property_id: 'prop-1',
      buyer_name: 'أحمد علي',
      unit_id: 'A-101',
      gross_contract_value: '1500000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2025-01-15',
      handover_status: 'Pending',
      total_cash_collected: '300000.00',
      status: 'Active'
    },
    {
      contract_id: 'cnt-2',
      contract_number: 'CNT-2025-002',
      property_id: 'prop-1',
      buyer_name: 'سارة خالد',
      unit_id: 'B-204',
      gross_contract_value: '2000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2025-02-01',
      handover_status: 'Pending',
      total_cash_collected: '400000.00',
      status: 'Active'
    },
    {
      contract_id: 'cnt-cancelled',
      contract_number: 'CNT-2025-CANCELLED',
      property_id: 'prop-1',
      buyer_name: 'عميل ملغي',
      unit_id: 'C-301',
      gross_contract_value: '1000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2025-01-01',
      handover_status: 'Pending',
      total_cash_collected: '0.00',
      status: 'Rescinded'
    }
  ];

  it('1. Deduplication & Reconciliation: Consolidated schedule-plus-cheque row (zero double counting)', () => {
    // Schedule linked to contract 1
    const schedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-1',
        contract_id: 'cnt-1',
        tranche_number: 1,
        nominal_value: '100000.00',
        due_date: '2025-03-10',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      }
    ];

    // Cheque linked to the same schedule via schedule_id
    const pdcs: ERPPDCRecord[] = [
      {
        cheque_id: 'chk-1',
        contract_id: 'cnt-1',
        schedule_id: 'sch-1',
        cheque_number: 'CHQ-9901',
        bank_name: 'البنك الأهلي المصري',
        drawer_name: 'أحمد علي',
        nominal_value: '100000.00',
        due_date: '2025-03-10',
        status: 'In Safe'
      }
    ];

    const result = buildProjectedVaultItems(pdcs, schedules, mockContracts, mockProperties, {
      referenceDate: '2025-03-01'
    });

    // Must produce exactly ONE consolidated row, NOT two separate rows
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].kind, 'consolidated');
    assert.strictEqual(result[0].scheduleId, 'sch-1');
    assert.strictEqual(result[0].chequeId, 'chk-1');
    assert.strictEqual(result[0].instrumentNumber, 'CHQ-9901');
    assert.strictEqual(result[0].nominalValue, '100000.00');
    assert.strictEqual(result[0].remainingAmount, '100000.00');
    assert.strictEqual(result[0].buyerName, 'أحمد علي');
    assert.strictEqual(result[0].unitId, 'A-101');
    assert.strictEqual(result[0].projectTitle, 'برج الأهرام بلازا');
  });

  it('2. Reconciliation fallback: Matches by (contract_id, due_date) when schedule_id is not explicitly populated on cheque', () => {
    const schedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-legacy-1',
        contract_id: 'cnt-2',
        tranche_number: 2,
        nominal_value: '150000.00',
        due_date: '2025-04-15',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      }
    ];

    // Cheque without schedule_id, but matching contract_id and due_date
    const pdcs: ERPPDCRecord[] = [
      {
        cheque_id: 'chk-legacy-1',
        contract_id: 'cnt-2',
        cheque_number: 'CHQ-LEGACY-01',
        bank_name: 'بنك مصر',
        drawer_name: 'سارة خالد',
        nominal_value: '150000.00',
        due_date: '2025-04-15',
        status: 'In Safe'
      }
    ];

    const result = buildProjectedVaultItems(pdcs, schedules, mockContracts, mockProperties, {
      referenceDate: '2025-03-01'
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].kind, 'consolidated');
    assert.strictEqual(result[0].scheduleId, 'sch-legacy-1');
    assert.strictEqual(result[0].chequeId, 'chk-legacy-1');
    assert.strictEqual(result[0].instrumentNumber, 'CHQ-LEGACY-01');
  });

  it('3. Schedule-only active due: Appears in vault with synthetic note reference', () => {
    const schedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-cash-due',
        contract_id: 'cnt-1',
        tranche_number: 3,
        nominal_value: '75000.00',
        due_date: '2025-05-01',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      }
    ];

    // Empty PDCs
    const result = buildProjectedVaultItems([], schedules, mockContracts, mockProperties, {
      referenceDate: '2025-03-01'
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].kind, 'schedule_due');
    assert.strictEqual(result[0].scheduleId, 'sch-cash-due');
    assert.strictEqual(result[0].nominalValue, '75000.00');
    assert.strictEqual(result[0].remainingAmount, '75000.00');
    assert.strictEqual(result[0].instrumentNumber, 'SND-nt-1-T3');
    assert.strictEqual(result[0].bankName, 'سند استحقاق نقدي بالخزينة');
  });

  it('4. Banking Boundary: Deposited cheque in transit is NOT counted as liquid cash', () => {
    const pdcs: ERPPDCRecord[] = [
      {
        cheque_id: 'chk-deposited',
        contract_id: 'cnt-1',
        cheque_number: 'CHQ-DEP-01',
        bank_name: 'CIB',
        drawer_name: 'أحمد علي',
        nominal_value: '250000.00',
        due_date: '2025-03-05',
        status: 'Deposited',
        deposited_date: '2025-03-05'
      }
    ];

    const items = buildProjectedVaultItems(pdcs, [], mockContracts, mockProperties, {
      referenceDate: '2025-03-06'
    });

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].status, 'deposited');

    const kpis = calculateVaultKPIs(items, '2025-03-06');
    // Deposited must be accounted under depositedSum, and strictly NOT in clearedSum!
    assert.strictEqual(kpis.depositedCount, 1);
    assert.strictEqual(kpis.depositedSum.toFixed(2), '250000.00');
    assert.strictEqual(kpis.clearedCount, 0);
    assert.strictEqual(kpis.clearedSum.toFixed(2), '0.00');
  });

  it('5. Exclusion of void, superseded, and cancelled contract schedules', () => {
    const schedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-void',
        contract_id: 'cnt-1',
        tranche_number: 1,
        nominal_value: '50000.00',
        due_date: '2025-03-01',
        status: 'Void',
        schedule_version: 1,
        amount_paid: '0.00'
      },
      {
        schedule_id: 'sch-superseded',
        contract_id: 'cnt-1',
        tranche_number: 2,
        nominal_value: '50000.00',
        due_date: '2025-03-01',
        status: 'SUPERSEDED',
        schedule_version: 1,
        amount_paid: '0.00'
      },
      {
        schedule_id: 'sch-cancelled-contract',
        contract_id: 'cnt-cancelled',
        tranche_number: 1,
        nominal_value: '80000.00',
        due_date: '2025-03-01',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      }
    ];

    const result = buildProjectedVaultItems([], schedules, mockContracts, mockProperties, {
      referenceDate: '2025-03-01'
    });

    // All void, superseded, and cancelled contract schedules must be excluded
    assert.strictEqual(result.length, 0);
  });

  it('6. Aging & Status Logic: Overdue, Due Today, and Upcoming', () => {
    const refDate = '2025-03-15';
    const schedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-overdue',
        contract_id: 'cnt-1',
        tranche_number: 1,
        nominal_value: '40000.00',
        due_date: '2025-03-10', // Prior to refDate
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      },
      {
        schedule_id: 'sch-today',
        contract_id: 'cnt-1',
        tranche_number: 2,
        nominal_value: '60000.00',
        due_date: '2025-03-15', // Same as refDate
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      },
      {
        schedule_id: 'sch-upcoming',
        contract_id: 'cnt-1',
        tranche_number: 3,
        nominal_value: '80000.00',
        due_date: '2025-03-20', // After refDate
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      }
    ];

    const items = buildProjectedVaultItems([], schedules, mockContracts, mockProperties, {
      referenceDate: refDate
    });

    assert.strictEqual(items.length, 3);
    const overdue = items.find(i => i.scheduleId === 'sch-overdue');
    const today = items.find(i => i.scheduleId === 'sch-today');
    const upcoming = items.find(i => i.scheduleId === 'sch-upcoming');

    assert.strictEqual(overdue?.status, 'overdue');
    assert.strictEqual(today?.status, 'due_today');
    assert.strictEqual(upcoming?.status, 'upcoming');

    const kpis = calculateVaultKPIs(items, refDate);
    assert.strictEqual(kpis.overdueCount, 1);
    assert.strictEqual(kpis.overdueSum.toFixed(2), '40000.00');
    assert.strictEqual(kpis.dueTodayCount, 1);
    assert.strictEqual(kpis.dueTodaySum.toFixed(2), '60000.00');
    assert.strictEqual(kpis.upcomingCount, 1);
    assert.strictEqual(kpis.upcomingSum.toFixed(2), '80000.00');
    // Total sum = 40k + 60k + 80k = 180k
    assert.strictEqual(kpis.totalSum.toFixed(2), '180000.00');
  });

  it('7. Cleared and Bounced items correctly update KPI metrics', () => {
    const refDate = '2025-03-15';
    const pdcs: ERPPDCRecord[] = [
      {
        cheque_id: 'chk-cleared',
        contract_id: 'cnt-1',
        cheque_number: 'CHQ-CLR-01',
        bank_name: 'CIB',
        drawer_name: 'أحمد علي',
        nominal_value: '120000.00',
        due_date: '2025-03-01',
        status: 'Cleared',
        cleared_date: '2025-03-02'
      },
      {
        cheque_id: 'chk-bounced',
        contract_id: 'cnt-2',
        cheque_number: 'CHQ-BNC-01',
        bank_name: 'بنك مصر',
        drawer_name: 'سارة خالد',
        nominal_value: '90000.00',
        due_date: '2025-03-05',
        status: 'Bounced'
      }
    ];

    const items = buildProjectedVaultItems(pdcs, [], mockContracts, mockProperties, {
      referenceDate: refDate
    });

    const kpis = calculateVaultKPIs(items, refDate);
    assert.strictEqual(kpis.clearedCount, 1);
    assert.strictEqual(kpis.clearedSum.toFixed(2), '120000.00');
    assert.strictEqual(kpis.bouncedCount, 1);
    assert.strictEqual(kpis.bouncedSum.toFixed(2), '90000.00');
  });

  it('8. Partial payment handling: Remaining balance decreases and cleared cash reflects collected partial funds', () => {
    const schedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-partial-1',
        contract_id: 'cnt-1',
        tranche_number: 1,
        nominal_value: '100000.00',
        amount_paid: '40000.00',
        due_date: '2025-03-01',
        status: 'Partially Paid',
        schedule_version: 1
      }
    ];

    // Cheque linked to schedule
    const pdcs: ERPPDCRecord[] = [
      {
        cheque_id: 'chk-partial-1',
        contract_id: 'cnt-1',
        schedule_id: 'sch-partial-1',
        cheque_number: 'CHQ-PART-01',
        bank_name: 'CIB',
        drawer_name: 'أحمد علي',
        nominal_value: '100000.00',
        due_date: '2025-03-01',
        status: 'In Safe'
      }
    ];

    const items = buildProjectedVaultItems(pdcs, schedules, mockContracts, mockProperties, {
      referenceDate: '2025-03-15'
    });

    assert.strictEqual(items.length, 1);
    const row = items[0];
    assert.strictEqual(row.nominalValue, '100000.00');
    assert.strictEqual(row.amountPaid, '40000.00');
    // Remaining balance must be 60,000, NOT 100,000
    assert.strictEqual(row.remainingAmount, '60000.00');
    assert.strictEqual(row.status, 'overdue');

    const kpis = calculateVaultKPIs(items, '2025-03-15');
    // Overdue sum must only count the remaining 60,000 balance
    assert.strictEqual(kpis.overdueSum.toFixed(2), '60000.00');
    // Cleared sum must reflect the 40,000 collected cash
    assert.strictEqual(kpis.clearedSum.toFixed(2), '40000.00');
    // Collection rate: 40,000 / (40,000 + 60,000) = 40.0%
    assert.strictEqual(kpis.collectionRate, 40);
  });

  it('9. Attack Vector Verification: Multi-tranche collision on same date matches by nominal value preventing phantom debt', () => {
    // Contract 1 has two installments on the exact same date with different amounts
    const schedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-col-1',
        contract_id: 'cnt-1',
        tranche_number: 1,
        nominal_value: '30000.00',
        due_date: '2025-04-01',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      },
      {
        schedule_id: 'sch-col-2',
        contract_id: 'cnt-1',
        tranche_number: 2,
        nominal_value: '50000.00',
        due_date: '2025-04-01',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      }
    ];

    // Cheque without schedule_id for 50,000 on 2025-04-01
    const pdcs: ERPPDCRecord[] = [
      {
        cheque_id: 'chk-col-50k',
        contract_id: 'cnt-1',
        cheque_number: 'CHQ-50K',
        bank_name: 'CIB',
        drawer_name: 'أحمد علي',
        nominal_value: '50000.00',
        due_date: '2025-04-01',
        status: 'In Safe'
      }
    ];

    const items = buildProjectedVaultItems(pdcs, schedules, mockContracts, mockProperties, {
      referenceDate: '2025-03-01'
    });

    // Must project exactly 2 items: 1 schedule-only (30k) and 1 consolidated (50k)
    assert.strictEqual(items.length, 2);
    const item30k = items.find(i => i.scheduleId === 'sch-col-1');
    const item50k = items.find(i => i.scheduleId === 'sch-col-2');

    assert.strictEqual(item30k?.kind, 'schedule_due');
    assert.strictEqual(item30k?.nominalValue, '30000.00');

    assert.strictEqual(item50k?.kind, 'consolidated');
    assert.strictEqual(item50k?.nominalValue, '50000.00');
    assert.strictEqual(item50k?.chequeId, 'chk-col-50k');

    // Total sum must be 80,000, NOT 100,000 (no phantom debt)
    const kpis = calculateVaultKPIs(items, '2025-03-01');
    assert.strictEqual(kpis.totalSum.toFixed(2), '80000.00');
  });

  it('10. Contract Number Fallback Reconciliation: Matches when cheque uses contract_number instead of internal contract_id', () => {
    const schedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-uuid-1',
        contract_id: 'cnt-1', // internal ID
        tranche_number: 1,
        nominal_value: '70000.00',
        due_date: '2025-06-01',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      }
    ];

    // Cheque referencing external contract_number 'CNT-2025-001'
    const pdcs: ERPPDCRecord[] = [
      {
        cheque_id: 'chk-num-1',
        contract_id: 'CNT-2025-001',
        cheque_number: 'CHQ-NUM-01',
        bank_name: 'بنك القاهرة',
        drawer_name: 'أحمد علي',
        nominal_value: '70000.00',
        due_date: '2025-06-01',
        status: 'In Safe'
      }
    ];

    const items = buildProjectedVaultItems(pdcs, schedules, mockContracts, mockProperties, {
      referenceDate: '2025-03-01'
    });

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].kind, 'consolidated');
    assert.strictEqual(items[0].scheduleId, 'sch-uuid-1');
    assert.strictEqual(items[0].chequeId, 'chk-num-1');
  });

  it('11. Rescinded Contract Cheque Exclusion: Orphaned cheques from rescinded contracts are excluded', () => {
    const pdcs: ERPPDCRecord[] = [
      {
        cheque_id: 'chk-rescinded-contract',
        contract_id: 'cnt-cancelled', // Status is Rescinded in mockContracts
        cheque_number: 'CHQ-RESCINDED-01',
        bank_name: 'CIB',
        drawer_name: 'عميل ملغي',
        nominal_value: '500000.00',
        due_date: '2025-03-01',
        status: 'In Safe'
      }
    ];

    const items = buildProjectedVaultItems(pdcs, [], mockContracts, mockProperties, {
      referenceDate: '2025-03-01'
    });

    assert.strictEqual(items.length, 0);
  });

  it('12. Timezone & Date Formatting Integrity: Functions guarantee local calendar date without UTC offset rollback', () => {
    // Test normalization of ISO timestamps
    assert.strictEqual(normalizeDateStr('2025-03-10T14:30:00.000Z'), '2025-03-10');
    assert.strictEqual(normalizeDateStr('2025-03-10'), '2025-03-10');
    assert.strictEqual(normalizeDateStr(''), '');

    // Test formatYMD
    assert.strictEqual(formatYMD(2025, 2, 1), '2025-03-01');
    assert.strictEqual(formatYMD(2025, 11, 31), '2025-12-31');
    assert.strictEqual(formatYMD(2025, -1, 31), '2024-12-31');
    assert.strictEqual(formatYMD(2025, 12, 1), '2026-01-01');

    // Test toLocalDateStr on local midnight
    const localDate = new Date(2025, 2, 1); // March 1, 2025 in local timezone
    assert.strictEqual(toLocalDateStr(localDate), '2025-03-01');

    // Test getLocalTodayStr
    const today = getLocalTodayStr();
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('13. Title & Unit Deduplication: getDistinctiveUnit properly cleans up duplicated titles', () => {
    // Exact match returns null
    assert.strictEqual(
      getDistinctiveUnit('شقة رووف كاملة مع السطح – مدينتي بريفادو', 'شقة رووف كاملة مع السطح – مدينتي بريفادو'),
      null
    );

    // Case-insensitive exact match returns null
    assert.strictEqual(
      getDistinctiveUnit('Al-Ahram Plaza Tower', 'al-ahram plaza tower'),
      null
    );

    // Unit repeats full project title prefix -> returns only distinctive suffix
    assert.strictEqual(
      getDistinctiveUnit('شقة رووف كاملة مع السطح – مدينتي بريفادو', 'شقة رووف كاملة مع السطح – مدينتي بريفادو - شقة 104'),
      'شقة 104'
    );

    assert.strictEqual(
      getDistinctiveUnit('عمارة الياسمين', 'عمارة الياسمين – شقة 201 - الدور الثاني'),
      'شقة 201 - الدور الثاني'
    );

    // Project title contains unitId -> returns null (already fully captured in title)
    assert.strictEqual(
      getDistinctiveUnit('شقة رووف كاملة مع السطح – مدينتي بريفادو', 'شقة رووف'),
      null
    );

    // Distinct project and unit -> returns unit
    assert.strictEqual(
      getDistinctiveUnit('مدينتي بريفادو', 'شقة 104'),
      'شقة 104'
    );

    // Special regex characters in title are handled safely
    assert.strictEqual(
      getDistinctiveUnit('Compound (Phase 1) [Zone A]', 'Compound (Phase 1) [Zone A] - Unit 5'),
      'Unit 5'
    );

    // Dash variants (ASCII hyphen vs en-dash vs em-dash vs minus)
    assert.strictEqual(
      getDistinctiveUnit('شقة رووف كاملة مع السطح – مدينتي بريفادو', 'شقة رووف كاملة مع السطح - مدينتي بريفادو'),
      null
    );

    // Arabic letter variations (Alef hamza, Taa marbouta vs Haa, Alef maksura vs Yaa)
    assert.strictEqual(
      getDistinctiveUnit('شقة رووف كاملة مع السطح – مدينتي بريفادو', 'شقة رووف كامله مع السطح - مدينتى بريفادو'),
      null
    );

    // Dash and orthographic differences with distinctive unit suffix
    assert.strictEqual(
      getDistinctiveUnit('شقة رووف كاملة مع السطح – مدينتي بريفادو', 'شقة رووف كامله مع السطح - مدينتى بريفادو - وحدة 104'),
      'وحدة 104'
    );

    // Generic fallback placeholders in ERP return null (no fake/redundant subtitles)
    assert.strictEqual(getDistinctiveUnit('مدينتي بريفادو', 'وحدة عقارية'), null);
    assert.strictEqual(getDistinctiveUnit('مدينتي بريفادو', 'Unit'), null);
    assert.strictEqual(getDistinctiveUnit('مشروع عقاري', 'شيك ضمان / دفعة مباشرة'), null);

    // Parentheses and bracketed units
    assert.strictEqual(getDistinctiveUnit('مدينتي بريفادو', 'مدينتي بريفادو (شقة 104)'), 'شقة 104');

    // Empty and falsy values
    assert.strictEqual(getDistinctiveUnit('', ''), null);
    assert.strictEqual(getDistinctiveUnit('Project', ''), null);
    assert.strictEqual(getDistinctiveUnit(undefined, undefined), null);
    assert.strictEqual(getDistinctiveUnit(undefined, 'Unit 1'), 'Unit 1');
  });
});
