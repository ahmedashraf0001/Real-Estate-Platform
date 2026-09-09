import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InvariantsValidator } from '../invariants';
import { EscalationEngine } from '../escalation';
import { RescissionEngine } from '../rescission';
import { ContractsEngine } from '../contracts';
import { ERPSupabaseService } from '../supabaseService';
import { CANONICAL_COA, GeneralLedgerEngine } from '../ledger';
import { D, generateUUID } from '../math';
import { ERPAccountingPeriod, ERPContract, ERPInstallmentSchedule, ERPJournalEntry } from '../types';

describe('Financial Invariants & Immutability Audits (§4.1 – §4.17)', () => {

  it('INV-4.1: Should verify double-entry balanced journals (ΣDr == ΣCr) and reject unbalanced entries', () => {
    const balancedEntry: ERPJournalEntry = {
      entry_id: 'je-1',
      entry_number: 'JE-TEST-001',
      period_id: 'period-1',
      entry_date: '2026-09-06',
      description: 'Balanced test entry',
      source_module: 'SALES',
      is_locked: false,
      created_by: 'system',
      created_at: new Date().toISOString(),
      lines: [
        { line_id: 'l1', entry_id: 'je-1', line_number: 1, account_code: '101000', debit_amount: '1000.00', credit_amount: '0.00' },
        { line_id: 'l2', entry_id: 'je-1', line_number: 2, account_code: '103200', debit_amount: '0.00', credit_amount: '1000.00' }
      ]
    };

    const res = InvariantsValidator.verifyDoubleEntryBalance([balancedEntry]);
    assert.strictEqual(res.passed, true);

    const unbalancedEntry: ERPJournalEntry = {
      ...balancedEntry,
      entry_number: 'JE-TEST-FAIL',
      lines: [
        { line_id: 'l1', entry_id: 'je-1', line_number: 1, account_code: '101000', debit_amount: '1000.00', credit_amount: '0.00' },
        { line_id: 'l2', entry_id: 'je-1', line_number: 2, account_code: '103200', debit_amount: '0.00', credit_amount: '999.00' }
      ]
    };
    const failRes = InvariantsValidator.verifyDoubleEntryBalance([unbalancedEntry]);
    assert.strictEqual(failRes.passed, false);
  });

  it('INV-4.9 & §0.6: Escalation leaves Paid tranches untouched and increments schedule_version', () => {
    const contract: ERPContract = {
      contract_id: 'c-1',
      contract_number: 'CNT-001',
      unit_id: 'u-1',
      buyer_name: 'Buyer 1',
      gross_contract_value: '100000.00',
      total_cash_collected: '50000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      handover_status: 'Pending',
      status: 'Active',
      contract_date: '2026-01-01'
    };

    const schedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 's-1',
        contract_id: 'c-1',
        tranche_number: 1,
        schedule_version: 1,
        due_date: '2026-01-01',
        nominal_value: '50000.00',
        amount_paid: '50000.00',
        status: 'Paid'
      },
      {
        schedule_id: 's-2',
        contract_id: 'c-1',
        tranche_number: 2,
        schedule_version: 1,
        due_date: '2026-06-01',
        nominal_value: '50000.00',
        amount_paid: '0.00',
        status: 'Pending'
      }
    ];

    // Escalate with +10000 delta on pending tranches
    const result = EscalationEngine.applyEscalation(
      contract,
      schedules,
      '10000.00',
      'Construction Cost Spike',
      '2026-03-01'
    );

    // Check that paid tranche s-1 is untouched
    const paid = result.allSchedules.find(s => s.schedule_id === 's-1');
    assert.strictEqual(paid?.status, 'Paid');
    assert.strictEqual(paid?.nominal_value, '50000.00');

    // Check that old pending tranche was marked SUPERSEDED
    const oldPending = result.allSchedules.find(s => s.schedule_id === 's-2');
    assert.strictEqual(oldPending?.status, 'SUPERSEDED');

    // Check that replacement tranche was created at schedule_version = 2
    const replacement = result.allSchedules.find(s => s.tranche_number === 2 && s.status === 'Pending');
    assert.strictEqual(replacement?.schedule_version, 2);
    assert.strictEqual(replacement?.nominal_value, '60000.00');
    assert.strictEqual(replacement?.supersedes_schedule_id, 's-2');
  });

  it('INV-4.10: Rescission Forfeiture Floor Arithmetic caps penalty at cash collected', () => {
    const period: ERPAccountingPeriod = {
      period_id: 'p-1',
      fiscal_year: 2026,
      period_number: 9,
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      status: 'OPEN'
    };

    // Contract = 1,000,000, 10% penalty = 100,000. Cash collected = 40,000.
    // Penalty must be capped at 40,000 (cannot demand extra deficiency from buyer).
    const contractDeficiency: ERPContract = {
      contract_id: 'c-def',
      contract_number: 'CNT-DEF',
      unit_id: 'u-1',
      buyer_name: 'Buyer Def',
      gross_contract_value: '1000000.00',
      total_cash_collected: '40000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      handover_status: 'Pending',
      status: 'Active',
      contract_date: '2026-01-01'
    };

    const resDef = RescissionEngine.processRescission(
      contractDeficiency,
      [],
      period,
      '2026-09-06'
    );

    assert.strictEqual(resDef.rescissionRecord.penalty_retained, '40000.00');
    assert.strictEqual(resDef.rescissionRecord.net_refund_liability, '0.00');

    // If Cash collected = 150,000, penalty = 100,000, refund = 50,000
    const contractSurplus: ERPContract = {
      ...contractDeficiency,
      contract_id: 'c-sur',
      total_cash_collected: '150000.00'
    };

    const resSurplus = RescissionEngine.processRescission(
      contractSurplus,
      [],
      period,
      '2026-09-06'
    );

    assert.strictEqual(resSurplus.rescissionRecord.penalty_retained, '100000.00');
    assert.strictEqual(resSurplus.rescissionRecord.net_refund_liability, '50000.00');
  });

  it('INV-4.17: Handover Net Recognition Model B satisfies Dr(203000) [C] + Dr(103000) [V - C] == Cr(401000) [V]', () => {
    const handoverEntry: ERPJournalEntry = {
      entry_id: 'je-handover-1',
      entry_number: 'JE-HANDOVER-001',
      period_id: 'p-1',
      entry_date: '2026-09-06',
      description: 'Handover Delivery Net Recognition',
      source_module: 'SALES',
      is_locked: false,
      created_by: 'system',
      created_at: new Date().toISOString(),
      lines: [
        { line_id: 'l1', entry_id: 'je-handover-1', line_number: 1, account_code: '203000', debit_amount: '400000.00', credit_amount: '0.00' },
        { line_id: 'l2', entry_id: 'je-handover-1', line_number: 2, account_code: '103000', debit_amount: '600000.00', credit_amount: '0.00' },
        { line_id: 'l3', entry_id: 'je-handover-1', line_number: 3, account_code: '401000', debit_amount: '0.00', credit_amount: '1000000.00' }
      ]
    };

    const res = InvariantsValidator.verifyHandoverNetRecognition([handoverEntry]);
    assert.strictEqual(res.passed, true);
  });

  it('INV-0.6 & Trigger Contract: Assert mutating locked columns is blocked by contract', () => {
    const lockedColumns = ['nominal_value', 'due_date', 'tranche_number', 'contract_id'];
    
    function attemptUpdate(col: string) {
      if (lockedColumns.includes(col)) {
        throw new Error(`CANNOT_MODIFY_LOCKED_FINANCIAL_COLUMN: Column '${col}' is strictly append-only`);
      }
    }

    assert.throws(() => attemptUpdate('nominal_value'), /CANNOT_MODIFY_LOCKED_FINANCIAL_COLUMN/);
    assert.throws(() => attemptUpdate('due_date'), /CANNOT_MODIFY_LOCKED_FINANCIAL_COLUMN/);
    assert.throws(() => attemptUpdate('tranche_number'), /CANNOT_MODIFY_LOCKED_FINANCIAL_COLUMN/);
    assert.throws(() => attemptUpdate('contract_id'), /CANNOT_MODIFY_LOCKED_FINANCIAL_COLUMN/);
  });

  it('INV-0.9: Accounting Period Lock unconditionally rejects entries posted to LOCKED periods', () => {
    const periods: ERPAccountingPeriod[] = [
      { period_id: 'p-open', fiscal_year: 2026, period_number: 9, start_date: '2026-09-01', end_date: '2026-09-30', status: 'OPEN' },
      { period_id: 'p-closed', fiscal_year: 2026, period_number: 8, start_date: '2026-08-01', end_date: '2026-08-31', status: 'LOCKED' }
    ];

    const illegalEntry: ERPJournalEntry = {
      entry_id: 'je-bad',
      entry_number: 'JE-BAD-001',
      period_id: 'p-closed',
      entry_date: '2026-08-15',
      description: 'Posting to locked period',
      source_module: 'SALES',
      is_locked: false,
      created_by: 'system',
      created_at: new Date().toISOString(),
      lines: []
    };

    const res = InvariantsValidator.verifyPeriodLockInvariant(periods, [illegalEntry]);
    assert.strictEqual(res.passed, false);
  });

  it('CANONICAL_COA: Verifies canonical Chart of Accounts registration', () => {
    const required = ['101000', '103200', '104000', '105000', '203000', '204000', '401000', '603000'];
    required.forEach(code => {
      assert.ok(CANONICAL_COA[code], `Account ${code} must be registered in CANONICAL_COA`);
    });
  });

  it('INV-4.3 & Terms: ContractsEngine.generateSchedule supports firstInstallmentDueDate and installmentFrequency', () => {
    const schedules = ContractsEngine.generateSchedule(
      'c-sched-test',
      '1000000.00',
      '0.20', // 20% down payment = 200,000
      4,      // 4 installments of 200,000
      '2026-01-01',
      'QUARTERLY',
      '2026-04-01'
    );

    assert.strictEqual(schedules.length, 5); // Tranche 0 + 4 installments
    // Tranche 0: Down payment on startDate
    assert.strictEqual(schedules[0].tranche_number, 0);
    assert.strictEqual(schedules[0].nominal_value, '200000.00');
    assert.strictEqual(schedules[0].due_date, '2026-01-01');

    // Tranche 1: first installment on firstInstallmentDueDate
    assert.strictEqual(schedules[1].tranche_number, 1);
    assert.strictEqual(schedules[1].nominal_value, '200000.00');
    assert.strictEqual(schedules[1].due_date, '2026-04-01');

    // Tranche 2: 3 months after firstInstallmentDueDate
    assert.strictEqual(schedules[2].tranche_number, 2);
    assert.strictEqual(schedules[2].nominal_value, '200000.00');
    assert.strictEqual(schedules[2].due_date, '2026-07-01');

    // Tranche 3
    assert.strictEqual(schedules[3].tranche_number, 3);
    assert.strictEqual(schedules[3].due_date, '2026-10-01');

    // Tranche 4
    assert.strictEqual(schedules[4].tranche_number, 4);
    assert.strictEqual(schedules[4].due_date, '2027-01-01');
  });

  it('INV-PDC: Tranche 0 (Down Payment) never generates PDC note during persistNewContract', async () => {
    const insertedRecords: Record<string, any[]> = {};
    const mockSupabase: any = {
      from: (tableName: string) => ({
        insert: async (rows: any[]) => {
          insertedRecords[tableName] = rows;
          return { error: null };
        }
      })
    };

    const mockContract: ERPContract = {
      contract_id: 'c-test-pdc',
      contract_number: 'CNT-PDC-001',
      unit_id: 'u-1',
      buyer_name: 'Buyer PDC',
      gross_contract_value: '1000000.00',
      total_cash_collected: '200000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      handover_status: 'Pending',
      status: 'Active',
      contract_date: '2026-01-01'
    };

    const schedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-0',
        contract_id: 'c-test-pdc',
        tranche_number: 0,
        nominal_value: '200000.00',
        due_date: '2026-01-01',
        status: 'Paid',
        schedule_version: 1,
        amount_paid: '200000.00'
      },
      {
        schedule_id: 'sch-1',
        contract_id: 'c-test-pdc',
        tranche_number: 1,
        nominal_value: '400000.00',
        due_date: '2026-04-01',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      },
      {
        schedule_id: 'sch-2',
        contract_id: 'c-test-pdc',
        tranche_number: 2,
        nominal_value: '400000.00',
        due_date: '2026-07-01',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      }
    ];

    await ERPSupabaseService.persistNewContract(mockSupabase, mockContract, schedules);

    const pdcs = insertedRecords['erp_pdc_records'] || [];
    // Only Tranche 1 and 2 should generate PDCs (2 PDCs), never Tranche 0
    assert.strictEqual(pdcs.length, 2, 'Only future pending installments (tranche_number > 0) generate PDCs');
    assert.ok(!pdcs.some(p => p.schedule_id === 'sch-0'), 'Tranche 0 must never generate a PDC');
  });

  it('INV-4.3 & Calendar Clamping: Clamps month-end dates without skipping February or overflowing', () => {
    const schedules = ContractsEngine.generateSchedule(
      'c-clamp-test',
      '1200000.00',
      '0.20',
      4,
      '2026-01-31',
      'MONTHLY'
    );

    assert.strictEqual(schedules.length, 5);
    assert.strictEqual(schedules[0].due_date, '2026-01-31', 'Tranche 0 starts on Jan 31');
    assert.strictEqual(schedules[1].due_date, '2026-02-28', 'Feb installment must clamp to Feb 28, not rollover to March');
    assert.strictEqual(schedules[2].due_date, '2026-03-31', 'March installment must be March 31');
    assert.strictEqual(schedules[3].due_date, '2026-04-30', 'April installment must clamp to April 30');
    assert.strictEqual(schedules[4].due_date, '2026-05-31', 'May installment must be May 31');
  });

  it('INV-4.3 & Full Cash: 0 installments guarantees single Tranche 0 covering 100% of gross value', () => {
    const schedules = ContractsEngine.generateSchedule(
      'c-cash-test',
      '2500000.00',
      '1.00',
      0,
      '2026-03-01'
    );

    assert.strictEqual(schedules.length, 1, 'Full cash schedule must have exactly 1 tranche');
    assert.strictEqual(schedules[0].tranche_number, 0);
    assert.strictEqual(schedules[0].nominal_value, '2500000.00');
    assert.strictEqual(schedules[0].due_date, '2026-03-01');
  });

  it('INV-4.17 & Continuity: Handover Model B Net Recognition clears 203000, recognizes 401000, debits 103000 for (V - C), relieves WIP to COGS, and subsequent installment collection credits 103000 cleanly without negative balance', () => {
    const period: ERPAccountingPeriod = {
      period_id: 'p-open-2026',
      fiscal_year: 2026,
      period_number: 9,
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      status: 'OPEN'
    };

    const contract: ERPContract = {
      contract_id: 'c-handover-test',
      contract_number: 'CNT-HND-001',
      unit_id: 'unit-101',
      buyer_name: 'Eng. Ahmed Zaki',
      gross_contract_value: '2500000.00',
      total_cash_collected: '1000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      handover_status: 'Pending',
      status: 'Active',
      contract_date: '2026-01-01'
    };

    const rsvWipCost = '1125000.00'; // 45% RSV construction cost

    // 1. Post Model B Handover entry via ContractsEngine
    const handoverEntry = ContractsEngine.createHandoverModelBEntry(
      contract,
      period,
      '2026-09-08',
      rsvWipCost,
      '501000',
      '151000',
      'CFO_FARID'
    );

    // Assert double entry balance and invariant 4.17
    const valRes = InvariantsValidator.verifyHandoverNetRecognition([handoverEntry]);
    assert.strictEqual(valRes.passed, true, 'Handover Net Recognition validator must pass');

    // Dr 203000 == C (1,000,000.00)
    const line203 = handoverEntry.lines.find(l => l.account_code === '203000');
    assert.ok(line203, 'Line 203000 must exist');
    assert.strictEqual(line203.debit_amount, '1000000.00');
    assert.strictEqual(line203.credit_amount, '0.00');

    // Dr 103000 == V - C (1,500,000.00)
    const line103 = handoverEntry.lines.find(l => l.account_code === '103000');
    assert.ok(line103, 'Line 103000 must exist');
    assert.strictEqual(line103.debit_amount, '1500000.00');
    assert.strictEqual(line103.credit_amount, '0.00');

    // Cr 401000 == V (2,500,000.00)
    const line401 = handoverEntry.lines.find(l => l.account_code === '401000');
    assert.ok(line401, 'Line 401000 must exist');
    assert.strictEqual(line401.debit_amount, '0.00');
    assert.strictEqual(line401.credit_amount, '2500000.00');

    // Dr 501000 COGS == rsvWipCost (1,125,000.00)
    const line501 = handoverEntry.lines.find(l => l.account_code === '501000');
    assert.ok(line501, 'Line 501000 must exist');
    assert.strictEqual(line501.debit_amount, '1125000.00');
    assert.strictEqual(line501.credit_amount, '0.00');

    // Cr 151000 Incurred WIP == rsvWipCost (1,125,000.00)
    const line151 = handoverEntry.lines.find(l => l.account_code === '151000');
    assert.ok(line151, 'Line 151000 must exist');
    assert.strictEqual(line151.debit_amount, '0.00');
    assert.strictEqual(line151.credit_amount, '1125000.00');

    // Double entry balance invariant: Sum(Dr) == Sum(Cr)
    const totalDr = handoverEntry.lines.reduce((acc, l) => D(acc).plus(l.debit_amount), D(0));
    const totalCr = handoverEntry.lines.reduce((acc, l) => D(acc).plus(l.credit_amount), D(0));
    assert.strictEqual(totalDr.toFixed(2), totalCr.toFixed(2));
    assert.strictEqual(totalDr.toFixed(2), '3625000.00');

    // 2. Post subsequent post-handover installment collection (500,000.00)
    const deliveredContract: ERPContract = {
      ...contract,
      handover_status: 'Delivered',
      handover_date: '2026-09-08'
    };

    const collectionEntry = ContractsEngine.createPostHandoverCollectionEntry(
      deliveredContract,
      '500000.00',
      period,
      '2026-10-01',
      true, // isVaultCash
      'CFO_FARID'
    );

    // Dr 101000 / Cr 103000 == 500,000.00
    const collLine101 = collectionEntry.lines.find(l => l.account_code === '101000');
    const collLine103 = collectionEntry.lines.find(l => l.account_code === '103000');
    assert.ok(collLine101 && collLine103);
    assert.strictEqual(collLine101.debit_amount, '500000.00');
    assert.strictEqual(collLine103.credit_amount, '500000.00');

    // Check remaining A/R balance after collection: 1,500,000.00 - 500,000.00 = 1,000,000.00 (> 0)
    const initialAR = D(line103.debit_amount);
    const collectedAR = D(collLine103.credit_amount);
    const remainingAR = initialAR.minus(collectedAR);
    assert.strictEqual(remainingAR.toFixed(2), '1000000.00');
    assert.ok(!remainingAR.isNegative(), 'Receivable balance must remain non-negative');
  });

  it('PDC Clearance & Continuity: PDC clearance updates linked schedule to Paid and increments contract cash collected', async () => {
    const updatedSchedules: Record<string, any> = {};
    const updatedContracts: Record<string, any> = {};
    const updatedPDCs: Record<string, any> = {};
    const insertedEntries: Record<string, any[]> = {};

    const contractRecord = {
      contract_id: 'c-pdc-test-01',
      total_cash_collected: '300000.00'
    };
    const scheduleRecord = {
      schedule_id: 'sch-pdc-test-01',
      contract_id: 'c-pdc-test-01',
      status: 'Pending',
      amount_paid: '0.00'
    };

    const mockSupabase: any = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null })
      },
      from: (tableName: string) => {
        return {
          select: (fields: string) => ({
            eq: (col: string, val: string) => ({
              maybeSingle: async () => {
                if (tableName === 'erp_installment_schedules' && val === scheduleRecord.schedule_id) {
                  return { data: scheduleRecord, error: null };
                }
                return { data: null, error: null };
              },
              single: async () => {
                if (tableName === 'erp_contracts' && val === contractRecord.contract_id) {
                  return { data: contractRecord, error: null };
                }
                return { data: null, error: null };
              }
            })
          }),
          update: (values: any) => ({
            eq: async (col: string, val: string) => {
              if (tableName === 'erp_installment_schedules') {
                updatedSchedules[val] = values;
              } else if (tableName === 'erp_contracts') {
                updatedContracts[val] = values;
              } else if (tableName === 'erp_pdc_records') {
                updatedPDCs[val] = values;
              }
              return { error: null };
            }
          }),
          insert: async (rows: any[]) => {
            insertedEntries[tableName] = rows;
            return { error: null };
          }
        };
      }
    };

    const mockEntry: ERPJournalEntry = {
      entry_id: 'je-test-clr',
      entry_number: 'JE-PDC-CLR-TEST',
      period_id: 'p-1',
      entry_date: '2026-09-08',
      description: 'PDC Cleared test',
      source_module: 'PDC',
      created_by: 'CFO_FARID',
      created_at: new Date().toISOString(),
      is_locked: false,
      lines: [
        { line_id: 'l1', entry_id: 'je-test-clr', line_number: 1, account_code: '101000', debit_amount: '150000.00', credit_amount: '0.00' },
        { line_id: 'l2', entry_id: 'je-test-clr', line_number: 2, account_code: '103200', debit_amount: '0.00', credit_amount: '150000.00' }
      ]
    };

    await ERPSupabaseService.persistTranchePayment(
      mockSupabase,
      contractRecord.contract_id,
      scheduleRecord.schedule_id,
      '150000.00',
      mockEntry
    );

    // 1. Schedule must be marked Paid with amount_paid = 150000.00
    const schUpdate = updatedSchedules[scheduleRecord.schedule_id];
    assert.ok(schUpdate, 'Schedule must be updated');
    assert.strictEqual(schUpdate.status, 'Paid');
    assert.strictEqual(schUpdate.amount_paid, '150000.00');

    // 2. Contract total_cash_collected must be incremented: 300000.00 + 150000.00 = 450000.00
    const contractUpdate = updatedContracts[contractRecord.contract_id];
    assert.ok(contractUpdate, 'Contract must be updated');
    assert.strictEqual(contractUpdate.total_cash_collected, '450000.00');

    // 3. Matching PDC record must be marked Cleared
    const pdcUpdate = updatedPDCs[scheduleRecord.schedule_id];
    assert.ok(pdcUpdate, 'PDC linked to schedule must be updated to Cleared');
    assert.strictEqual(pdcUpdate.status, 'Cleared');
  });

  it('INV-4.17 & Edge Case C == V: 100% pre-paid contract at handover clears 203000 fully, creates zero-value 103000 line, and recognizes 401000', () => {
    const period: ERPAccountingPeriod = {
      period_id: 'p-2026-09',
      fiscal_year: 2026,
      period_number: 9,
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      status: 'OPEN'
    };

    const fullPaidContract: ERPContract = {
      contract_id: 'c-full-paid-01',
      contract_number: 'CNT-2026-FULL',
      unit_id: 'APT-100',
      buyer_name: 'عميل مسدد بالكامل',
      gross_contract_value: '2000000.00',
      total_cash_collected: '2000000.00', // C == V
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-01-01',
      handover_status: 'Pending',
      status: 'Active'
    };

    const entry = ContractsEngine.createHandoverModelBEntry(
      fullPaidContract,
      period,
      '2026-09-08',
      '800000.00'
    );

    // Dr 203000 == 2,000,000.00
    const line203 = entry.lines.find(l => l.account_code === '203000');
    assert.ok(line203);
    assert.strictEqual(line203.debit_amount, '2000000.00');

    // Dr 103000 == 0.00 (MUST be present per spec §4.17)
    const line103 = entry.lines.find(l => l.account_code === '103000');
    assert.ok(line103, 'Line 103000 must not be omitted even when C == V');
    assert.strictEqual(line103.debit_amount, '0.00');

    // Cr 401000 == 2,000,000.00
    const line401 = entry.lines.find(l => l.account_code === '401000');
    assert.ok(line401);
    assert.strictEqual(line401.credit_amount, '2000000.00');

    // WIP & COGS
    const line501 = entry.lines.find(l => l.account_code === '501000');
    const line151 = entry.lines.find(l => l.account_code === '151000');
    assert.strictEqual(line501?.debit_amount, '800000.00');
    assert.strictEqual(line151?.credit_amount, '800000.00');

    // Balance check
    const totalDr = entry.lines.reduce((acc, l) => D(acc).plus(l.debit_amount), D(0));
    const totalCr = entry.lines.reduce((acc, l) => D(acc).plus(l.credit_amount), D(0));
    assert.strictEqual(totalDr.toFixed(2), totalCr.toFixed(2));
  });

  it('Handover Invariant Safeguards: Re-handover rejected, pre-handover 103000 collection rejected, and post-handover over-collection rejected', () => {
    const period: ERPAccountingPeriod = {
      period_id: 'p-2026-09',
      fiscal_year: 2026,
      period_number: 9,
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      status: 'OPEN'
    };

    const activeContract: ERPContract = {
      contract_id: 'c-guard-01',
      contract_number: 'CNT-GUARD-01',
      unit_id: 'APT-200',
      buyer_name: 'عميل حماية الحسابات',
      gross_contract_value: '1000000.00',
      total_cash_collected: '400000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-01-01',
      handover_status: 'Pending',
      status: 'Active'
    };

    // 1. Calling createPostHandoverCollectionEntry on Pending contract must throw
    assert.throws(
      () => ContractsEngine.createPostHandoverCollectionEntry(activeContract, '100000.00', period, '2026-09-08'),
      /has not been delivered/
    );

    // 2. Deliver contract
    const deliveredContract: ERPContract = {
      ...activeContract,
      handover_status: 'Delivered',
      handover_date: '2026-09-08'
    };

    // 3. Re-handover on already Delivered contract must throw
    assert.throws(
      () => ContractsEngine.createHandoverModelBEntry(deliveredContract, period, '2026-09-08', '300000.00'),
      /already been marked as Delivered/
    );

    // 4. Over-collection beyond remaining receivable (V - C = 600,000.00; payment = 650,000.00) must throw
    assert.throws(
      () => ContractsEngine.createPostHandoverCollectionEntry(deliveredContract, '650000.00', period, '2026-09-09'),
      /exceeds remaining accounts receivable/
    );

    // 5. Negative/zero collection must throw
    assert.throws(
      () => ContractsEngine.createPostHandoverCollectionEntry(deliveredContract, '0.00', period, '2026-09-09'),
      /strictly greater than 0.00/
    );
  });

  it('Database Continuity: updateContractHandoverStatus preserves non-UUID string IDs cleanly without random mutation', async () => {
    let capturedId = '';
    let capturedStatus = '';
    let capturedDate: string | null = null;

    const mockSupabase: any = {
      from: (tableName: string) => ({
        update: (vals: any) => ({
          eq: async (col: string, val: string) => {
            if (tableName === 'erp_contracts' && col === 'contract_id') {
              capturedId = val;
              capturedStatus = vals.handover_status;
              capturedDate = vals.handover_date;
            }
            return { error: null };
          }
        })
      })
    };

    await ERPSupabaseService.updateContractHandoverStatus(
      mockSupabase,
      'c-custom-id-99',
      'Delivered',
      '2026-09-15'
    );

    assert.strictEqual(capturedId, 'c-custom-id-99', 'contractId must match exact passed string');
    assert.strictEqual(capturedStatus, 'Delivered');
    assert.strictEqual(capturedDate, '2026-09-15');
  });

  it('INV-0.6 & DB Immutability: Schedule trigger immutability contract unconditionally blocks direct DELETE', () => {
    // Simulates the PL/pgSQL function trg_guard_installment_schedule_immutability() from migration 013
    function simulateScheduleImmutabilityTrigger(
      op: 'INSERT' | 'UPDATE' | 'DELETE',
      oldRow: any,
      newRow: any
    ) {
      if (op === 'DELETE') {
        throw new Error('ERP Violation: installment_schedules rows are insert-only and cannot be deleted.');
      }
      if (op === 'UPDATE') {
        if (
          oldRow.nominal_value !== newRow.nominal_value ||
          oldRow.due_date !== newRow.due_date ||
          oldRow.tranche_number !== newRow.tranche_number ||
          oldRow.contract_id !== newRow.contract_id
        ) {
          throw new Error('ERP Violation: Financial columns (nominal_value, due_date, tranche_number, contract_id) are immutable once inserted.');
        }

        if (oldRow.status === 'SUPERSEDED' && newRow.status !== 'SUPERSEDED' && newRow.status !== 'Void') {
          throw new Error('ERP Violation: SUPERSEDED tranches cannot transition to any status other than Void.');
        }

        if (oldRow.status === 'Void' && newRow.status !== 'Void') {
          throw new Error('ERP Violation: Void tranches cannot transition to any other status.');
        }
      }
    }

    // Direct DELETE is unconditionally rejected
    assert.throws(
      () => simulateScheduleImmutabilityTrigger('DELETE', { schedule_id: 's-1' }, null),
      /ERP Violation: installment_schedules rows are insert-only and cannot be deleted/
    );

    // Modifying financial columns is rejected
    assert.throws(
      () => simulateScheduleImmutabilityTrigger('UPDATE', 
        { schedule_id: 's-1', nominal_value: '50000.00', due_date: '2026-06-01', tranche_number: 1, contract_id: 'c-1' },
        { schedule_id: 's-1', nominal_value: '55000.00', due_date: '2026-06-01', tranche_number: 1, contract_id: 'c-1' }
      ),
      /Financial columns .* are immutable once inserted/
    );

    // SUPERSEDED -> Void is explicitly allowed for contract rescission cleanup
    assert.doesNotThrow(
      () => simulateScheduleImmutabilityTrigger('UPDATE',
        { schedule_id: 's-1', status: 'SUPERSEDED', nominal_value: '50000.00', due_date: '2026-06-01', tranche_number: 1, contract_id: 'c-1' },
        { schedule_id: 's-1', status: 'Void', nominal_value: '50000.00', due_date: '2026-06-01', tranche_number: 1, contract_id: 'c-1' }
      )
    );

    // SUPERSEDED -> Paid is strictly forbidden
    assert.throws(
      () => simulateScheduleImmutabilityTrigger('UPDATE',
        { schedule_id: 's-1', status: 'SUPERSEDED', nominal_value: '50000.00', due_date: '2026-06-01', tranche_number: 1, contract_id: 'c-1' },
        { schedule_id: 's-1', status: 'Paid', nominal_value: '50000.00', due_date: '2026-06-01', tranche_number: 1, contract_id: 'c-1' }
      ),
      /SUPERSEDED tranches cannot transition to any status other than Void/
    );
  });

  it('INV-4.10 & Rescission Hardening: Branch 2 reverses exact historical handover WIP/COGS accounts and voids schedule lineage and PDCs', async () => {
    const period: ERPAccountingPeriod = {
      period_id: 'p-1',
      fiscal_year: 2026,
      period_number: 9,
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      status: 'OPEN'
    };

    const contract: ERPContract = {
      contract_id: 'c-resc-handover-test',
      contract_number: 'CNT-HND-042',
      unit_id: 'u-301',
      buyer_name: 'Hossam Osman',
      gross_contract_value: '2500000.00',
      total_cash_collected: '1500000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      handover_status: 'Delivered',
      status: 'Active',
      contract_date: '2025-03-01'
    };

    // Historical handover entry with exact historical WIP (152000) and COGS (502000) for 1,125,000 EGP
    const historicalHandoverEntry: ERPJournalEntry = {
      entry_id: 'je-hnd-historical',
      entry_number: `JE-HANDOVER-${contract.contract_number}`,
      period_id: 'p-1',
      entry_date: '2025-10-01',
      description: `Historical Handover Delivery for ${contract.contract_number}`,
      source_module: 'SALES',
      source_entity_id: contract.contract_id,
      is_locked: true,
      created_by: 'CFO_FARID',
      created_at: '2025-10-01T00:00:00Z',
      lines: [
        { line_id: 'l1', entry_id: 'je-hnd', line_number: 1, account_code: '203000', debit_amount: '1500000.00', credit_amount: '0.00' },
        { line_id: 'l2', entry_id: 'je-hnd', line_number: 2, account_code: '103000', debit_amount: '1000000.00', credit_amount: '0.00' },
        { line_id: 'l3', entry_id: 'je-hnd', line_number: 3, account_code: '401000', debit_amount: '0.00', credit_amount: '2500000.00' },
        { line_id: 'l4', entry_id: 'je-hnd', line_number: 4, account_code: '502000', debit_amount: '1125000.00', credit_amount: '0.00' },
        { line_id: 'l5', entry_id: 'je-hnd', line_number: 5, account_code: '152000', debit_amount: '0.00', credit_amount: '1125000.00' }
      ]
    };

    const schedules: ERPInstallmentSchedule[] = [
      { schedule_id: 's-1', contract_id: contract.contract_id, tranche_number: 1, schedule_version: 1, due_date: '2025-03-01', nominal_value: '500000.00', amount_paid: '500000.00', status: 'Paid' },
      { schedule_id: 's-2', contract_id: contract.contract_id, tranche_number: 2, schedule_version: 1, due_date: '2025-06-01', nominal_value: '1000000.00', amount_paid: '1000000.00', status: 'Paid' },
      { schedule_id: 's-3', contract_id: contract.contract_id, tranche_number: 3, schedule_version: 1, due_date: '2025-12-01', nominal_value: '500000.00', amount_paid: '0.00', status: 'SUPERSEDED' },
      { schedule_id: 's-4', contract_id: contract.contract_id, tranche_number: 3, schedule_version: 2, due_date: '2025-12-01', nominal_value: '500000.00', amount_paid: '0.00', status: 'Pending' }
    ];

    const rescissionResult = RescissionEngine.processRescission(
      contract,
      schedules,
      period,
      '2026-09-08',
      '0.00',
      '501000',
      '151000',
      'CFO_FARID',
      historicalHandoverEntry
    );

    // Verify exact accounts and amounts unwound
    const restoredWipLine = rescissionResult.journalEntry.lines.find(l => l.account_code === '152000');
    const reversedCogsLine = rescissionResult.journalEntry.lines.find(l => l.account_code === '502000');
    assert.ok(restoredWipLine, 'WIP account 152000 from handover must be debited');
    assert.strictEqual(restoredWipLine?.debit_amount, '1125000.00');
    assert.ok(reversedCogsLine, 'COGS account 502000 from handover must be credited');
    assert.strictEqual(reversedCogsLine?.credit_amount, '1125000.00');

    // Verify all schedule lineage rows (Pending and SUPERSEDED) are voided
    const s3 = rescissionResult.updatedSchedules.find(s => s.schedule_id === 's-3');
    const s4 = rescissionResult.updatedSchedules.find(s => s.schedule_id === 's-4');
    assert.strictEqual(s3?.status, 'Void');
    assert.strictEqual(s4?.status, 'Void');

    // Test persistRescission updates Supabase schedules, PDCs, and unit status
    let voidedScheduleStatus: string | null = null;
    let voidedPdcStatus: string | null = null;
    let unitStatusUpdated: string | null = null;

    const mockSupabase: any = {
      from: (tableName: string) => {
        if (tableName === 'erp_rescissions') {
          return { insert: async () => ({ error: null }) };
        }
        if (tableName === 'erp_contracts') {
          return {
            update: () => ({ eq: async () => ({ error: null }) }),
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { property_id: 'a0000000-0000-4000-8000-000000000001', building_unit_id: 'u-301' },
                  error: null
                })
              })
            })
          };
        }
        if (tableName === 'erp_installment_schedules') {
          return {
            update: (vals: any) => ({
              in: async () => { voidedScheduleStatus = vals.status; return { error: null }; },
              eq: () => ({ in: async () => { voidedScheduleStatus = vals.status; return { error: null }; } })
            })
          };
        }
        if (tableName === 'erp_pdc_records') {
          return {
            update: (vals: any) => ({
              eq: () => ({ in: async () => { voidedPdcStatus = vals.status; return { error: null }; } })
            })
          };
        }
        if (tableName === 'erp_journal_entries' || tableName === 'erp_journal_lines') {
          return { insert: async () => ({ error: null }) };
        }
        if (tableName === 'properties') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { building_units: [{ unit_id: 'u-301', status: 'contracted' }] },
                  error: null
                })
              })
            }),
            update: (vals: any) => {
              if (vals.building_units) {
                const u = vals.building_units.find((item: any) => item.unit_id === 'u-301');
                if (u) unitStatusUpdated = u.status;
              }
              return { eq: async () => ({ error: null }) };
            }
          };
        }
        return { insert: async () => ({ error: null }), update: () => ({ eq: async () => ({ error: null }) }) };
      }
    };

    await ERPSupabaseService.persistRescission(
      mockSupabase,
      'a0000000-0000-4000-8000-000000000002',
      rescissionResult.rescissionRecord,
      rescissionResult.journalEntry,
      ['s-3', 's-4']
    );

    assert.strictEqual(voidedScheduleStatus, 'Void', 'Schedules must be marked Void in DB');
    assert.strictEqual(voidedPdcStatus, 'Void', 'Safe PDCs must be marked Void in DB');
    assert.strictEqual(unitStatusUpdated, 'available', 'Linked building unit must be marked available');
  });

  it('INV-4.17 & Escalation Hardening: Delivered contract escalation generates adjusting entry Dr 103000 / Cr 401000 for Delta V', () => {
    const period: ERPAccountingPeriod = {
      period_id: 'p-1',
      fiscal_year: 2026,
      period_number: 9,
      start_date: '2026-09-01',
      end_date: '2026-09-30',
      status: 'OPEN'
    };

    const deliveredContract: ERPContract = {
      contract_id: 'c-deliv-esc-01',
      contract_number: 'CNT-DELIV-001',
      unit_id: 'u-202',
      buyer_name: 'Dr. Mahmoud Sharqawy',
      gross_contract_value: '3000000.00',
      total_cash_collected: '2000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      handover_status: 'Delivered',
      status: 'Active',
      contract_date: '2025-01-01'
    };

    const deltaV = '250000.00';

    const adjustingEntry = GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: `JE-ADJ-ESC-${deliveredContract.contract_number}-2`,
      entry_date: '2026-09-08',
      period,
      description: `Contract Price Escalation Adjustment (Post-Handover) for ${deliveredContract.contract_number} (Delta V: ${deltaV})`,
      source_module: 'ESCALATION',
      source_entity_id: deliveredContract.contract_id,
      created_by: 'CFO_FARID',
      lines: [
        {
          account_code: '103000',
          debit_amount: deltaV,
          credit_amount: '0.00',
          contract_id: deliveredContract.contract_id,
          unit_id: deliveredContract.unit_id,
          memo: 'Incremental Accounts Receivable from Escalation'
        },
        {
          account_code: '401000',
          debit_amount: '0.00',
          credit_amount: deltaV,
          contract_id: deliveredContract.contract_id,
          unit_id: deliveredContract.unit_id,
          memo: 'Incremental Realized Sales Revenue from Escalation'
        }
      ]
    });

    assert.strictEqual(adjustingEntry.lines.length, 2);
    assert.strictEqual(adjustingEntry.lines[0].account_code, '103000');
    assert.strictEqual(adjustingEntry.lines[0].debit_amount, '250000.00');
    assert.strictEqual(adjustingEntry.lines[1].account_code, '401000');
    assert.strictEqual(adjustingEntry.lines[1].credit_amount, '250000.00');

    const balCheck = InvariantsValidator.verifyDoubleEntryBalance([adjustingEntry]);
    assert.strictEqual(balCheck.passed, true);
  });

  it('INV-4.5 & Partner Persistence: Partner payout asserts sufficient cash balance and persists transaction record', async () => {
    const journalEntries: ERPJournalEntry[] = [
      {
        entry_id: 'je-init-safe',
        entry_number: 'JE-SAFE-001',
        period_id: 'p-1',
        entry_date: '2026-09-01',
        description: 'Initial Safe Cash Funding',
        source_module: 'SALES',
        is_locked: false,
        created_by: 'system',
        created_at: new Date().toISOString(),
        lines: [
          { line_id: 'l1', entry_id: 'je-s', line_number: 1, account_code: '101000', debit_amount: '80000.00', credit_amount: '0.00' },
          { line_id: 'l2', entry_id: 'je-s', line_number: 2, account_code: '301000', debit_amount: '0.00', credit_amount: '80000.00' }
        ]
      }
    ];

    function verifyCashBalanceForPayout(routingAccount: string, payoutAmount: string, entries: ERPJournalEntry[]) {
      let balance = D(0);
      for (const entry of entries) {
        for (const line of entry.lines) {
          if (line.account_code === routingAccount) {
            balance = balance.plus(line.debit_amount).minus(line.credit_amount);
          }
        }
      }
      const payout = D(payoutAmount);
      if (balance.lt(payout)) {
        throw new Error(`ERP Invariant 4.5 Violation: Insufficient balance in ${routingAccount} (${balance.toFixed(2)} EGP). Cannot disburse ${payout.toFixed(2)} EGP.`);
      }
      return balance;
    }

    // Payout <= 80,000 succeeds
    assert.doesNotThrow(() => {
      verifyCashBalanceForPayout('101000', '50000.00', journalEntries);
    });

    // Payout > 80,000 throws INV-4.5
    assert.throws(
      () => verifyCashBalanceForPayout('101000', '95000.00', journalEntries),
      /ERP Invariant 4.5 Violation: Insufficient balance in 101000/
    );

    // Test persistPartnerTransaction & loadPartnerTransactions
    let insertedTxRow: any = null;
    const mockSupabase: any = {
      from: (tableName: string) => {
        if (tableName === 'erp_partner_transactions') {
          return {
            insert: async (row: any) => { insertedTxRow = row; return { error: null }; },
            select: () => ({
              order: async () => ({
                data: [
                  {
                    transaction_id: 'b0000000-0000-0000-0000-000000000001',
                    partner_name: 'Eng. Ahmed El-Sherif',
                    type: 'PROFIT_DISTRIBUTION',
                    amount: '50000.00',
                    routing_account: '101000',
                    date: '2026-09-08',
                    notes: 'Q3 Dividend'
                  }
                ],
                error: null
              })
            })
          };
        }
        return { insert: async () => ({ error: null }) };
      }
    };

    await ERPSupabaseService.persistPartnerTransaction(mockSupabase, {
      id: 'b0000000-0000-0000-0000-000000000001',
      transaction_number: 'PT-2026-001',
      partner_name: 'Eng. Ahmed El-Sherif',
      type: 'PROFIT_DISTRIBUTION',
      amount: '50000.00',
      payment_method: 'CASH_101000',
      date: '2026-09-08',
      status: 'COMPLETED',
      memo: 'Q3 Dividend'
    });

    assert.strictEqual(insertedTxRow.partner_name, 'Eng. Ahmed El-Sherif');
    assert.strictEqual(insertedTxRow.amount, '50000.00');
    assert.strictEqual(insertedTxRow.routing_account, '101000');

    const loaded = await ERPSupabaseService.loadPartnerTransactions(mockSupabase);
    assert.strictEqual(loaded.length, 1);
    assert.strictEqual(loaded[0].partner_name, 'Eng. Ahmed El-Sherif');
    assert.strictEqual(loaded[0].amount, '50000.00');
  });

});
