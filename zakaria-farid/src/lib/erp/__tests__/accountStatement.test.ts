import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { D } from '@/lib/erp/math';
import {
  calculateAccountStatement,
  AccountStatementLineInput,
  paginateStatementLines
} from '@/lib/erp/accountStatement';

describe('Account Statement Suite (ui-ledger-widgets)', () => {
  it('same-day entries use creation order even when the store arrives newest first', () => {
    const result = calculateAccountStatement([
      { entry_id: 'later', entry_date: '2026-10-06', created_at: '2026-10-06T12:00:00Z', debit_amount: '0', credit_amount: '40' },
      { entry_id: 'earlier', entry_date: '2026-10-06', created_at: '2026-10-06T09:00:00Z', debit_amount: '100', credit_amount: '0' },
    ], { normalBalance: 'DEBIT' });
    assert.deepEqual(result.lines.map(line => [line.entry_id, line.runningBalance.toFixed(2)]), [
      ['earlier', '100.00'], ['later', '60.00'],
    ]);
  });
  // T1. debit-nature account, lines Dr 2,083,333 / Dr 7,500,000 / Cr 3,000,000 -> running 2,083,333 / 9,583,333 / 6,583,333; closing 6,583,333 "مدين".
  it('T1: debit-nature account running balances and closing balance', () => {
    const lines: AccountStatementLineInput[] = [
      {
        entry_id: 'e1',
        entry_date: '2026-10-06',
        debit_amount: '2083333',
        credit_amount: '0',
        description: 'تحصيل مقدم'
      },
      {
        entry_id: 'e2',
        entry_date: '2026-10-06',
        debit_amount: '7500000',
        credit_amount: '0',
        description: 'تمويل شريك'
      },
      {
        entry_id: 'e3',
        entry_date: '2026-10-07',
        debit_amount: '0',
        credit_amount: '3000000',
        description: 'سداد مقاول'
      }
    ];

    const result = calculateAccountStatement(lines, {
      normalBalance: 'DEBIT',
      period: 'all'
    });

    assert.equal(result.openingBalance.toNumber(), 0);
    assert.equal(result.lines.length, 3);
    assert.equal(result.lines[0].runningBalance.toNumber(), 2083333);
    assert.equal(result.lines[1].runningBalance.toNumber(), 9583333);
    assert.equal(result.lines[2].runningBalance.toNumber(), 6583333);
    assert.equal(result.closingBalance.toNumber(), 6583333);
    assert.equal(result.closingBalanceLabelAr, 'مدين');
  });

  // T2. credit-nature account (e.g. 201000) running balance = Σcr − Σdr.
  it('T2: credit-nature account running balance equals Σcr - Σdr', () => {
    const lines: AccountStatementLineInput[] = [
      {
        entry_id: 'c1',
        entry_date: '2026-10-01',
        debit_amount: '0',
        credit_amount: '4200000',
        description: 'استحقاق مقاول'
      },
      {
        entry_id: 'c2',
        entry_date: '2026-10-05',
        debit_amount: '500000',
        credit_amount: '0',
        description: 'دفعة سداد'
      }
    ];

    const result = calculateAccountStatement(lines, {
      normalBalance: 'CREDIT',
      period: 'all'
    });

    assert.equal(result.lines[0].runningBalance.toNumber(), 4200000);
    assert.equal(result.lines[1].runningBalance.toNumber(), 3700000);
    assert.equal(result.closingBalance.toNumber(), 3700000);
    assert.equal(result.closingBalanceLabelAr, 'دائن');
  });

  // T3. period filter: lines before period start sum into opening balance; opening + period dr − period cr == closing.
  it('T3: period filter sums lines before period start into opening balance and satisfies invariant', () => {
    const lines: AccountStatementLineInput[] = [
      {
        entry_id: 'p-prev-1',
        entry_date: '2026-09-15',
        debit_amount: '1000000',
        credit_amount: '200000',
        description: 'حركة سبتمبر'
      },
      {
        entry_id: 'p-oct-1',
        entry_date: '2026-10-06',
        debit_amount: '500000',
        credit_amount: '100000',
        description: 'حركة أكتوبر 1'
      },
      {
        entry_id: 'p-oct-2',
        entry_date: '2026-10-15',
        debit_amount: '200000',
        credit_amount: '300000',
        description: 'حركة أكتوبر 2'
      }
    ];

    const result = calculateAccountStatement(lines, {
      normalBalance: 'DEBIT',
      period: '2026-10'
    });

    // Opening balance from September lines: 1,000,000 - 200,000 = 800,000
    assert.equal(result.openingBalance.toNumber(), 800000);
    assert.equal(result.totalDebits.toNumber(), 700000);
    assert.equal(result.totalCredits.toNumber(), 400000);

    // Invariant: opening + period dr - period cr == closing
    const calculatedClosing = result.openingBalance.plus(result.totalDebits).minus(result.totalCredits);
    assert.equal(calculatedClosing.toNumber(), result.closingBalance.toNumber());
    assert.equal(result.closingBalance.toNumber(), 1100000);
    assert.equal(result.lines.length, 2);
    assert.equal(result.lines[0].runningBalance.toNumber(), 1200000); // 800,000 + 500,000 - 100,000
    assert.equal(result.lines[1].runningBalance.toNumber(), 1100000); // 1,200,000 + 200,000 - 300,000
  });

  // T4. ties on the same date keep entry order; running balance identical across a page break (page size 2).
  it('T4: ties on the same date keep entry order and running balance is identical across page break', () => {
    const lines: AccountStatementLineInput[] = [
      {
        entry_id: 'tie-1',
        entry_date: '2026-10-06',
        debit_amount: '100',
        credit_amount: '0',
        description: 'حركة 1 تاريخ مشترك'
      },
      {
        entry_id: 'tie-2',
        entry_date: '2026-10-06',
        debit_amount: '200',
        credit_amount: '0',
        description: 'حركة 2 تاريخ مشترك'
      },
      {
        entry_id: 'tie-3',
        entry_date: '2026-10-07',
        debit_amount: '300',
        credit_amount: '0',
        description: 'حركة 3'
      },
      {
        entry_id: 'tie-4',
        entry_date: '2026-10-07',
        debit_amount: '400',
        credit_amount: '0',
        description: 'حركة 4'
      }
    ];

    const result = calculateAccountStatement(lines, {
      normalBalance: 'DEBIT',
      period: 'all'
    });

    // Check order preserved for ties
    assert.equal(result.lines[0].entry_id, 'tie-1');
    assert.equal(result.lines[1].entry_id, 'tie-2');
    assert.equal(result.lines[2].entry_id, 'tie-3');
    assert.equal(result.lines[3].entry_id, 'tie-4');

    // Check full running balances: 100, 300, 600, 1000
    assert.equal(result.lines[0].runningBalance.toNumber(), 100);
    assert.equal(result.lines[1].runningBalance.toNumber(), 300);
    assert.equal(result.lines[2].runningBalance.toNumber(), 600);
    assert.equal(result.lines[3].runningBalance.toNumber(), 1000);

    // Paginate with page size 2
    const page1 = paginateStatementLines(result.lines, 1, 2);
    const page2 = paginateStatementLines(result.lines, 2, 2);

    assert.equal(page1.length, 2);
    assert.equal(page2.length, 2);

    assert.equal(page1[0].runningBalance.toNumber(), 100);
    assert.equal(page1[1].runningBalance.toNumber(), 300);
    assert.equal(page2[0].runningBalance.toNumber(), 600);
    assert.equal(page2[1].runningBalance.toNumber(), 1000);
  });
});
