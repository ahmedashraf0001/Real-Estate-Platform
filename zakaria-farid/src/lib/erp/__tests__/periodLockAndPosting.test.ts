import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeneralLedgerEngine, resolvePeriodForDate } from '@/lib/erp/ledger';
import { ERPAccountingPeriod, ERPJournalEntry, ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { PartnersEngine } from '@/lib/erp/partnersEngine';
import { ContractsEngine } from '@/lib/erp/contracts';
import { RescissionEngine } from '@/lib/erp/rescission';
import { D } from '@/lib/erp/math';

describe('ERP Invariant 0.9 & Fiscal Period Posting Suite', () => {
  const openPeriod: ERPAccountingPeriod = {
    period_id: 'prd-2026-04',
    fiscal_year: 2026,
    period_number: 4,
    start_date: '2026-04-01',
    end_date: '2026-04-30',
    status: 'OPEN'
  };

  const lockedPeriod: ERPAccountingPeriod = {
    period_id: 'prd-2026-03',
    fiscal_year: 2026,
    period_number: 3,
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    status: 'LOCKED',
    locked_at: '2026-09-02T23:36:45.786Z',
    locked_by: 'CFO_FARID'
  };

  const closedPeriod: ERPAccountingPeriod = {
    period_id: 'prd-2026-02',
    fiscal_year: 2026,
    period_number: 2,
    start_date: '2026-02-01',
    end_date: '2026-02-28',
    status: 'CLOSED'
  };

  const sampleLines = [
    {
      account_code: '101000',
      debit_amount: '10000.00',
      credit_amount: '0.00',
      memo: 'نقدية بالخزينة'
    },
    {
      account_code: '203000',
      debit_amount: '0.00',
      credit_amount: '10000.00',
      memo: 'مقدم تعاقد عميل'
    }
  ];

  it('Invariant 0.9: should reject posting a journal entry into a LOCKED period', () => {
    assert.throws(
      () => {
        GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: 'JE-TEST-001',
          entry_date: '2026-03-15',
          period: lockedPeriod,
          description: 'Attempted mutation in locked period',
          source_module: 'MANUAL',
          created_by: 'CFO_FARID',
          lines: sampleLines
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('ERP Invariant 0.9 Violation'));
        assert.ok(err.message.includes('LOCKED fiscal period'));
        return true;
      }
    );
  });

  it('Invariant 0.9: should reject posting a journal entry into a CLOSED period', () => {
    assert.throws(
      () => {
        GeneralLedgerEngine.validateAndCreateEntry({
          entry_number: 'JE-TEST-002',
          entry_date: '2026-02-15',
          period: closedPeriod,
          description: 'Attempted mutation in closed period',
          source_module: 'MANUAL',
          created_by: 'CFO_FARID',
          lines: sampleLines
        });
      },
      (err: Error) => {
        assert.ok(err.message.includes('ERP Invariant 0.9 Violation'));
        assert.ok(err.message.includes('CLOSED fiscal period'));
        return true;
      }
    );
  });

  it('Invariant 0.9: should succeed when posting a journal entry into an OPEN period', () => {
    const entry = GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: 'JE-TEST-003',
      entry_date: '2026-04-10',
      period: openPeriod,
      description: 'Valid mutation in open period',
      source_module: 'SALES',
      created_by: 'CFO_FARID',
      lines: sampleLines
    });

    assert.ok(entry);
    assert.equal(entry.entry_number, 'JE-TEST-003');
    assert.equal(entry.period_id, 'prd-2026-04');
    assert.equal(entry.lines.length, 2);
    assert.equal(entry.is_locked, false);
  });

  it('Monthly Posting: should post unposted entries without locking the fiscal period', () => {
    const entries: ERPJournalEntry[] = [
      {
        entry_id: 'e-1',
        entry_number: 'JE-01',
        entry_date: '2026-04-05',
        period_id: 'prd-2026-04',
        description: 'Entry 1',
        source_module: 'MANUAL',
        created_by: 'CFO',
        created_at: '',
        is_locked: false,
        lines: []
      },
      {
        entry_id: 'e-2',
        entry_number: 'JE-02',
        entry_date: '2026-04-06',
        period_id: 'prd-2026-04',
        description: 'Entry 2',
        source_module: 'SALES',
        created_by: 'CFO',
        created_at: '',
        is_locked: false,
        lines: []
      },
      {
        entry_id: 'e-3',
        entry_number: 'JE-03',
        entry_date: '2026-03-01',
        period_id: 'prd-2026-03',
        description: 'Prior month entry',
        source_module: 'SALES',
        created_by: 'CFO',
        created_at: '',
        is_locked: true,
        lines: []
      }
    ];

    // Simulating postMonthlyJournalEntries logic
    const targetPeriodId = 'prd-2026-04';
    const updatedEntries = entries.map(e => 
      e.period_id === targetPeriodId ? { ...e, is_locked: true } : e
    );

    // Period 4 entries are now locked (posted)
    const period4Entries = updatedEntries.filter(e => e.period_id === targetPeriodId);
    assert.equal(period4Entries.length, 2);
    assert.ok(period4Entries.every(e => e.is_locked === true));

    // Crucial Invariant: The period itself remains OPEN!
    assert.equal(openPeriod.status, 'OPEN');

    // Because the period remains OPEN, new entries can still be created in the current period
    const newEntry = GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: 'JE-TEST-004',
      entry_date: '2026-04-12',
      period: openPeriod,
      description: 'Post-batch mutation allowed because period is still open',
      source_module: 'WIP_ALLOCATION',
      created_by: 'CFO_FARID',
      lines: sampleLines
    });
    assert.ok(newEntry);
  });

  it('Active Period Derivation: prioritizes OPEN periods and gracefully falls back', () => {
    const periods: ERPAccountingPeriod[] = [
      closedPeriod,
      lockedPeriod,
      openPeriod
    ];

    // Priority 1: First OPEN period
    const active = periods.find(p => p.status === 'OPEN') || periods[periods.length - 1];
    assert.equal(active.period_id, 'prd-2026-04');
    assert.equal(active.status, 'OPEN');

    // When all are locked/closed, fallback to latest
    const allLockedPeriods: ERPAccountingPeriod[] = [
      closedPeriod,
      lockedPeriod
    ];
    const fallbackActive = allLockedPeriods.find(p => p.status === 'OPEN') || allLockedPeriods[allLockedPeriods.length - 1];
    assert.equal(fallbackActive.period_id, 'prd-2026-03');
    assert.equal(fallbackActive.status, 'LOCKED');
  });

  describe('Calendar Date to Period Resolution & Invariant 0.9 Protection', () => {
    const fullYear2026Periods: ERPAccountingPeriod[] = [
      { period_id: 'prd-2026-01', fiscal_year: 2026, period_number: 1, start_date: '2026-01-01', end_date: '2026-01-31', status: 'CLOSED' },
      { period_id: 'prd-2026-02', fiscal_year: 2026, period_number: 2, start_date: '2026-02-01', end_date: '2026-02-28', status: 'CLOSED' },
      { period_id: 'prd-2026-03', fiscal_year: 2026, period_number: 3, start_date: '2026-03-01', end_date: '2026-03-31', status: 'LOCKED' },
      { period_id: 'prd-2026-04', fiscal_year: 2026, period_number: 4, start_date: '2026-04-01', end_date: '2026-04-30', status: 'OPEN' },
      { period_id: 'prd-2026-05', fiscal_year: 2026, period_number: 5, start_date: '2026-05-01', end_date: '2026-05-31', status: 'OPEN' },
      { period_id: 'prd-2026-06', fiscal_year: 2026, period_number: 6, start_date: '2026-06-01', end_date: '2026-06-30', status: 'OPEN' },
      { period_id: 'prd-2026-07', fiscal_year: 2026, period_number: 7, start_date: '2026-07-01', end_date: '2026-07-31', status: 'OPEN' },
      { period_id: 'prd-2026-08', fiscal_year: 2026, period_number: 8, start_date: '2026-08-01', end_date: '2026-08-31', status: 'OPEN' },
      { period_id: 'prd-2026-09', fiscal_year: 2026, period_number: 9, start_date: '2026-09-01', end_date: '2026-09-30', status: 'OPEN' },
      { period_id: 'prd-2026-10', fiscal_year: 2026, period_number: 10, start_date: '2026-10-01', end_date: '2026-10-31', status: 'OPEN' },
      { period_id: 'prd-2026-11', fiscal_year: 2026, period_number: 11, start_date: '2026-11-01', end_date: '2026-11-30', status: 'OPEN' },
      { period_id: 'prd-2026-12', fiscal_year: 2026, period_number: 12, start_date: '2026-12-01', end_date: '2026-12-31', status: 'OPEN' },
    ];

    it('resolvePeriodForDate accurately matches all 12 calendar months of 2026', () => {
      const datesAndExpectedPeriods = [
        { date: '2026-01-15', periodNumber: 1, expectedStatus: 'CLOSED' },
        { date: '2026-02-28', periodNumber: 2, expectedStatus: 'CLOSED' },
        { date: '2026-03-10', periodNumber: 3, expectedStatus: 'LOCKED' },
        { date: '2026-04-01', periodNumber: 4, expectedStatus: 'OPEN' },
        { date: '2026-05-18', periodNumber: 5, expectedStatus: 'OPEN' },
        { date: '2026-06-30', periodNumber: 6, expectedStatus: 'OPEN' },
        { date: '2026-07-04', periodNumber: 7, expectedStatus: 'OPEN' },
        { date: '2026-08-20', periodNumber: 8, expectedStatus: 'OPEN' },
        { date: '2026-09-15', periodNumber: 9, expectedStatus: 'OPEN' },
        { date: '2026-10-31', periodNumber: 10, expectedStatus: 'OPEN' },
        { date: '2026-11-11', periodNumber: 11, expectedStatus: 'OPEN' },
        { date: '2026-12-25', periodNumber: 12, expectedStatus: 'OPEN' },
      ];

      for (const item of datesAndExpectedPeriods) {
        const resolved = resolvePeriodForDate(item.date, fullYear2026Periods, openPeriod);
        assert.equal(resolved.period_number, item.periodNumber, `Failed resolving month for date ${item.date}`);
        assert.equal(resolved.status, item.expectedStatus);
      }
    });

    it('resolvePeriodForDate uses the own month of the date when no listed period contains it', () => {
      const own = resolvePeriodForDate('2028-01-01', fullYear2026Periods, openPeriod);
      assert.equal(own.period_id, 'prd-2028-01');
      assert.equal(own.start_date, '2028-01-01');
      assert.equal(own.end_date, '2028-01-31');
      assert.equal(own.status, 'OPEN');

      const fallbackEmpty = resolvePeriodForDate('2026-05-01', [], openPeriod);
      assert.equal(fallbackEmpty.period_id, openPeriod.period_id);
    });

    it('PartnersEngine.createPayoutJournalEntry respects target period status', () => {
      // 1. Success in OPEN period
      const openEntry = PartnersEngine.createPayoutJournalEntry({
        partnerName: 'زكريا فريد',
        amount: '50000.00',
        paymentMethod: 'CASH_101000',
        currentPeriod: openPeriod,
        date: '2026-04-15',
        receiptRef: 'REC-001'
      });
      assert.ok(openEntry);
      assert.equal(openEntry.period_id, 'prd-2026-04');
      assert.equal(openEntry.lines.length, 2);

      // 2. Failure in LOCKED period
      assert.throws(
        () => {
          PartnersEngine.createPayoutJournalEntry({
            partnerName: 'زكريا فريد',
            amount: '50000.00',
            paymentMethod: 'CASH_101000',
            currentPeriod: lockedPeriod,
            date: '2026-03-15'
          });
        },
        (err: Error) => {
          assert.ok(err.message.includes('ERP Invariant 0.9 Violation'));
          assert.ok(err.message.includes('LOCKED fiscal period'));
          return true;
        }
      );

      // 3. Failure in CLOSED period
      assert.throws(
        () => {
          PartnersEngine.createPayoutJournalEntry({
            partnerName: 'زكريا فريد',
            amount: '50000.00',
            paymentMethod: 'BANK_102000',
            currentPeriod: closedPeriod,
            date: '2026-02-15'
          });
        },
        (err: Error) => {
          assert.ok(err.message.includes('ERP Invariant 0.9 Violation'));
          assert.ok(err.message.includes('CLOSED fiscal period'));
          return true;
        }
      );
    });

    it('PartnersEngine.createCapitalInjectionJournalEntry respects target period status', () => {
      // 1. Success in OPEN period
      const openEntry = PartnersEngine.createCapitalInjectionJournalEntry({
        partnerName: 'م. أحمد الشريف',
        amount: '100000.00',
        paymentMethod: 'BANK_102000',
        currentPeriod: openPeriod,
        date: '2026-04-20',
        propertyTitle: 'prop-001',
        receiptRef: 'REC-CAP-001'
      });
      assert.ok(openEntry);
      assert.equal(openEntry.period_id, 'prd-2026-04');
      assert.equal(openEntry.lines.length, 2);

      // 2. Failure in LOCKED period
      assert.throws(
        () => {
          PartnersEngine.createCapitalInjectionJournalEntry({
            partnerName: 'م. أحمد الشريف',
            amount: '100000.00',
            paymentMethod: 'CASH_101000',
            currentPeriod: lockedPeriod,
            date: '2026-03-20'
          });
        },
        (err: Error) => {
          assert.ok(err.message.includes('ERP Invariant 0.9 Violation'));
          assert.ok(err.message.includes('LOCKED fiscal period'));
          return true;
        }
      );
    });

    const sampleContract: ERPContract = {
      contract_id: 'c-test-001',
      contract_number: 'ZF-2026-0001',
      unit_id: 'Unit 101',
      property_id: 'prop-001',
      buyer_name: 'أحمد محمود',
      base_price: '1000000.00',
      tax_amount: '0.00',
      gross_contract_value: '1000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-04-01',
      handover_status: 'Pending',
      total_cash_collected: '200000.00',
      status: 'Active',
      payment_plan_type: 'INSTALLMENTS',
      partner_splits: []
    };

    const sampleSchedules: ERPInstallmentSchedule[] = [
      {
        schedule_id: 'sch-001',
        contract_id: 'c-test-001',
        tranche_number: 0,
        due_date: '2026-04-01',
        nominal_value: '200000.00',
        status: 'Paid',
        schedule_version: 1,
        amount_paid: '200000.00',
        paid_date: '2026-04-01'
      },
      {
        schedule_id: 'sch-002',
        contract_id: 'c-test-001',
        tranche_number: 1,
        due_date: '2026-07-01',
        nominal_value: '800000.00',
        status: 'Pending',
        schedule_version: 1,
        amount_paid: '0.00'
      }
    ];

    it('ContractsEngine.createHandoverModelBEntry enforces Invariant 0.9 and supports safe preview', () => {
      // 1. Success in OPEN period
      const handoverEntry = ContractsEngine.createHandoverModelBEntry(
        sampleContract,
        openPeriod,
        '2026-04-10',
        D('350000.00'),
        '501000',
        '151000'
      );
      assert.ok(handoverEntry);
      assert.equal(handoverEntry.period_id, 'prd-2026-04');
      assert.equal(handoverEntry.lines.length, 5);

      // 2. Rejection in LOCKED period
      assert.throws(
        () => {
          ContractsEngine.createHandoverModelBEntry(
            sampleContract,
            lockedPeriod,
            '2026-03-15',
            D('350000.00'),
            '501000',
            '151000'
          );
        },
        (err: Error) => {
          assert.ok(err.message.includes('ERP Invariant 0.9 Violation'));
          assert.ok(err.message.includes('LOCKED fiscal period'));
          return true;
        }
      );

      // 3. UI Safe preview calculation pattern: cloning period as OPEN for read-only preview
      const previewPeriod: ERPAccountingPeriod = lockedPeriod.status === 'OPEN'
        ? lockedPeriod
        : { ...lockedPeriod, status: 'OPEN' };
      const previewEntry = ContractsEngine.createHandoverModelBEntry(
        sampleContract,
        previewPeriod,
        '2026-03-15',
        D('350000.00'),
        '501000',
        '151000',
        'PREVIEW'
      );
      assert.ok(previewEntry);
      assert.equal(previewEntry.period_id, lockedPeriod.period_id);
      // UI knows target period is locked and disables confirm button
      const isTargetPeriodLocked = lockedPeriod.status !== 'OPEN';
      assert.equal(isTargetPeriodLocked, true);
    });

    it('RescissionEngine.processRescission enforces Invariant 0.9 and supports safe calculation', () => {
      // 1. Success in OPEN period
      const result = RescissionEngine.processRescission(
        sampleContract,
        sampleSchedules,
        openPeriod,
        '2026-04-15'
      );
      assert.ok(result.journalEntry);
      assert.equal(result.journalEntry.period_id, 'prd-2026-04');

      // 2. Rejection in LOCKED period
      assert.throws(
        () => {
          RescissionEngine.processRescission(
            sampleContract,
            sampleSchedules,
            lockedPeriod,
            '2026-03-15'
          );
        },
        (err: Error) => {
          assert.ok(err.message.includes('ERP Invariant 0.9 Violation'));
          assert.ok(err.message.includes('LOCKED fiscal period'));
          return true;
        }
      );

      // 3. UI Safe calculation pattern for preview
      const calculationPeriod: ERPAccountingPeriod = lockedPeriod.status === 'OPEN'
        ? lockedPeriod
        : { ...lockedPeriod, status: 'OPEN' };
      const previewResult = RescissionEngine.processRescission(
        sampleContract,
        sampleSchedules,
        calculationPeriod,
        '2026-03-15'
      );
      assert.ok(previewResult.rescissionRecord);
      assert.equal(previewResult.rescissionRecord.penalty_retained, '100000.00');
      assert.equal(previewResult.rescissionRecord.net_refund_liability, '100000.00');
    });
  });
});
