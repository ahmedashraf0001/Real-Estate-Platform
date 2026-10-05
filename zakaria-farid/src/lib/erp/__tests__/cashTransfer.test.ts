import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { GeneralLedgerEngine } from '../ledger';
import { buildTreasuryMovements, summarizeTreasury } from '../treasuryLedger';
import { D } from '../math';
import type { ERPAccountingPeriod } from '../types';

describe('Cash Transfer & Quick Menu Invariants', () => {
  it('1. GeneralLedgerEngine.validateAndCreateEntry creates balanced entry with 2 lines for cash transfer', () => {
    const period: ERPAccountingPeriod = {
      period_id: 'prd-2026-10',
      fiscal_year: 2026,
      period_number: 10,
      start_date: '2026-10-01',
      end_date: '2026-10-31',
      status: 'OPEN',
    };
    const date = '2026-10-04';
    const amt = D('5000.00');
    const memo = 'تحويل من الخزينة 101000 إلى إنستاباي 102000';
    const entry = GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: `TRF-${date.replace(/-/g, '')}-TEST01`,
      entry_date: date,
      period,
      description: memo,
      source_module: 'MANUAL_ADJUSTMENT',
      created_by: 'FIN_OS',
      lines: [
        { account_code: '102000', debit_amount: amt.toFixed(2), credit_amount: '0.00', memo },
        { account_code: '101000', debit_amount: '0.00', credit_amount: amt.toFixed(2), memo },
      ],
    });

    assert.equal(entry.lines.length, 2);
    assert.equal(entry.lines[0].account_code, '102000');
    assert.equal(entry.lines[0].debit_amount, '5000.00');
    assert.equal(entry.lines[0].credit_amount, '0.00');
    assert.equal(entry.lines[1].account_code, '101000');
    assert.equal(entry.lines[1].debit_amount, '0.00');
    assert.equal(entry.lines[1].credit_amount, '5000.00');
  });

  it('2. buildTreasuryMovements and summarizeTreasury for transfer entry', () => {
    const period: ERPAccountingPeriod = {
      period_id: 'prd-2026-10',
      fiscal_year: 2026,
      period_number: 10,
      start_date: '2026-10-01',
      end_date: '2026-10-31',
      status: 'OPEN',
    };
    const date = '2026-10-04';
    const amt = D('5000.00');
    const memo = 'تحويل من الخزينة 101000 إلى إنستاباي 102000';
    const entry = GeneralLedgerEngine.validateAndCreateEntry({
      entry_number: `TRF-${date.replace(/-/g, '')}-TEST01`,
      entry_date: date,
      period,
      description: memo,
      source_module: 'MANUAL_ADJUSTMENT',
      created_by: 'FIN_OS',
      lines: [
        { account_code: '102000', debit_amount: amt.toFixed(2), credit_amount: '0.00', memo },
        { account_code: '101000', debit_amount: '0.00', credit_amount: amt.toFixed(2), memo },
      ],
    });

    const movs = buildTreasuryMovements([entry], [], true);
    assert.equal(movs.length, 1);
    assert.equal(movs[0].direction, 'TRANSFER');
    assert.equal(movs[0].account, '102000');
    assert.equal(movs[0].fromAccount, '101000');
    assert.ok(movs[0].amount.eq(5000));

    const summary = summarizeTreasury(movs, 'all', date);
    const tot = summary.accounts.find((a) => a.code === 'TOTAL')!;
    const a101 = summary.accounts.find((a) => a.code === '101000')!;
    const a102 = summary.accounts.find((a) => a.code === '102000')!;

    assert.ok(tot.closing.eq(0));
    assert.ok(a101.closing.eq(-5000));
    assert.ok(a102.closing.eq(5000));
  });

  it('3. Source checks: ZFCashTransferModal.module.css, ERPWorkstationShell.tsx, and ZFNavigationDock.tsx', () => {
    const cssPath = path.join(process.cwd(), 'src/components/admin/erp/v2/modals/ZFCashTransferModal.module.css');
    const shellPath = path.join(process.cwd(), 'src/components/admin/erp/ERPWorkstationShell.tsx');
    const dockPath = path.join(process.cwd(), 'src/components/admin/erp/ZFNavigationDock.tsx');

    const cssSource = fs.readFileSync(cssPath, 'utf8');
    const shellSource = fs.readFileSync(shellPath, 'utf8');
    const dockSource = fs.readFileSync(dockPath, 'utf8');

    const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
    assert.strictEqual(hexPattern.test(cssSource), false, 'ZFCashTransferModal.module.css must not contain hex colors');
    assert.strictEqual(cssSource.toLowerCase().includes('gradient'), false, 'ZFCashTransferModal.module.css must not contain gradient');
    assert.strictEqual(cssSource.toLowerCase().includes('box-shadow'), false, 'ZFCashTransferModal.module.css must not contain box-shadow');

    assert.ok(shellSource.includes('quickMenu='), 'ERPWorkstationShell.tsx must contain quickMenu=');
    assert.strictEqual(
      shellSource.includes('onQuickRequest={() => erp.setShowProjectExpenseModal(true)}'),
      false,
      'ERPWorkstationShell.tsx must not contain onQuickRequest={() => erp.setShowProjectExpenseModal(true)}'
    );

    assert.strictEqual(dockSource.includes("'+ طلب جديد'"), false, "ZFNavigationDock.tsx must not contain '+ طلب جديد'");
  });
});
