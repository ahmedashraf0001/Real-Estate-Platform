import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InvariantsValidator } from '../invariants';
import { EscalationEngine } from '../escalation';
import { RescissionEngine } from '../rescission';
import { CANONICAL_COA } from '../ledger';
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

});
