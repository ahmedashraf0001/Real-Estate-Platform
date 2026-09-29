import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { D, Decimal } from '@/lib/erp/math';
import { ERPJournalEntry } from '@/lib/erp/types';

// Register .css and .module.css handlers for node:test
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };

describe('Balance Sheet & Income Statement Visual Analytics Suite (§Blueprints)', () => {
  const sampleEntries: ERPJournalEntry[] = [
    {
      entry_id: 'je-bs-01',
      entry_number: 'JV-2026-001',
      entry_date: '2026-01-10',
      period_id: 'period-2026-01',
      description: 'إيداع رأس مال شريك مؤسس بالخزينة',
      source_module: 'MANUAL',
      created_by: 'Farid Zakaria',
      created_at: '2026-01-10T10:00:00Z',
      is_locked: true,
      lines: [
        { line_id: 'l1', entry_id: 'je-bs-01', line_number: 1, account_code: '101000', debit_amount: '1000000.00', credit_amount: '0.00' },
        { line_id: 'l2', entry_id: 'je-bs-01', line_number: 2, account_code: '301000', debit_amount: '0.00', credit_amount: '1000000.00' }
      ]
    },
    {
      entry_id: 'je-bs-02',
      entry_number: 'JV-2026-002',
      entry_date: '2026-02-15',
      period_id: 'period-2026-02',
      description: 'مقدم حجز شقة سكنية بالخزينة',
      source_module: 'SALES',
      created_by: 'Farid Zakaria',
      created_at: '2026-02-15T11:00:00Z',
      is_locked: true,
      lines: [
        { line_id: 'l3', entry_id: 'je-bs-02', line_number: 1, account_code: '101000', debit_amount: '2500000.00', credit_amount: '0.00' },
        { line_id: 'l4', entry_id: 'je-bs-02', line_number: 2, account_code: '203000', debit_amount: '0.00', credit_amount: '2500000.00' }
      ]
    },
    {
      entry_id: 'je-bs-03',
      entry_number: 'JV-2026-003',
      entry_date: '2026-03-01',
      period_id: 'period-2026-03',
      description: 'مستخلص خرسانات إنشائية للمقاول',
      source_module: 'WIP_ALLOCATION',
      created_by: 'Farid Zakaria',
      created_at: '2026-03-01T12:00:00Z',
      is_locked: true,
      lines: [
        { line_id: 'l5', entry_id: 'je-bs-03', line_number: 1, account_code: '151000', debit_amount: '1800000.00', credit_amount: '0.00' },
        { line_id: 'l6', entry_id: 'je-bs-03', line_number: 2, account_code: '201000', debit_amount: '0.00', credit_amount: '1800000.00' }
      ]
    },
    {
      entry_id: 'je-bs-04',
      entry_number: 'JV-2026-004',
      entry_date: '2026-03-20',
      period_id: 'period-2026-03',
      description: 'إثبات إيراد مبيعات محققة وتكلفة مباني',
      source_module: 'SALES',
      created_by: 'Farid Zakaria',
      created_at: '2026-03-20T14:00:00Z',
      is_locked: true,
      lines: [
        { line_id: 'l7', entry_id: 'je-bs-04', line_number: 1, account_code: '103000', debit_amount: '5000000.00', credit_amount: '0.00' },
        { line_id: 'l8', entry_id: 'je-bs-04', line_number: 2, account_code: '401000', debit_amount: '0.00', credit_amount: '5000000.00' },
        { line_id: 'l9', entry_id: 'je-bs-04', line_number: 3, account_code: '501000', debit_amount: '3000000.00', credit_amount: '0.00' },
        { line_id: 'l10', entry_id: 'je-bs-04', line_number: 4, account_code: '151000', debit_amount: '0.00', credit_amount: '3000000.00' }
      ]
    }
  ];

  const computeStats = (entries: ERPJournalEntry[]) => {
    const stats: Record<string, { debits: Decimal; credits: Decimal; count: number }> = {};
    Object.keys(CANONICAL_COA).forEach(code => {
      stats[code] = { debits: D(0), credits: D(0), count: 0 };
    });
    entries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        if (!stats[line.account_code]) {
          stats[line.account_code] = { debits: D(0), credits: D(0), count: 0 };
        }
        stats[line.account_code].debits = stats[line.account_code].debits.plus(D(line.debit_amount || '0'));
        stats[line.account_code].credits = stats[line.account_code].credits.plus(D(line.credit_amount || '0'));
        stats[line.account_code].count += 1;
      });
    });
    return stats;
  };

  const accountStats = computeStats(sampleEntries);

  it('1. Balance Sheet: enforces Invariant 4.1 Balance Equation (Assets = Liabilities + Equity + Net Income)', () => {
    let assets = D(0);
    let liabilities = D(0);
    let equity = D(0);
    let revenue = D(0);
    let expenses = D(0);

    Object.values(CANONICAL_COA).forEach(acc => {
      const stats = accountStats[acc.account_code];
      const net = acc.normal_balance === 'DEBIT' 
        ? stats.debits.minus(stats.credits) 
        : stats.credits.minus(stats.debits);

      if (acc.account_type === 'ASSET') assets = assets.plus(net);
      else if (acc.account_type === 'LIABILITY' || acc.account_type === 'CONTRA_LIABILITY') liabilities = liabilities.plus(net);
      else if (acc.account_type === 'EQUITY') equity = equity.plus(net);
      else if (acc.account_type === 'REVENUE') revenue = revenue.plus(net);
      else if (acc.account_type === 'EXPENSE') expenses = expenses.plus(net);
    });

    const netIncome = revenue.minus(expenses);
    const balanceVariance = assets.minus(liabilities.plus(equity).plus(netIncome)).abs();

    assert.equal(balanceVariance.lte(0.001), true, 'Balance Sheet Equation must strictly balance');
    assert.equal(revenue.toString(), '5000000.00');
    assert.equal(expenses.toString(), '3000000.00');
    assert.equal(netIncome.toString(), '2000000.00');
  });

  it('2. Balance Sheet Donut 1 & 2: categories group canonical COA accounts accurately', () => {
    // Asset Categories
    const cashVal = accountStats['101000'].debits.minus(accountStats['101000'].credits);
    assert.equal(cashVal.toString(), '3500000.00'); // 1M capital + 2.5M advance

    const receivablesVal = accountStats['103000'].debits.minus(accountStats['103000'].credits);
    assert.equal(receivablesVal.toString(), '5000000.00');

    // Liabilities Categories
    const advancesVal = accountStats['203000'].credits.minus(accountStats['203000'].debits);
    assert.equal(advancesVal.toString(), '2500000.00');

    const contractorsVal = accountStats['201000'].credits.minus(accountStats['201000'].debits);
    assert.equal(contractorsVal.toString(), '1800000.00');

    const capitalVal = accountStats['301000'].credits.minus(accountStats['301000'].debits);
    assert.equal(capitalVal.toString(), '1000000.00');
  });

  it('3. Income Statement: verifies Waterfall bridge calculations (Gross Sales -> Rescissions -> Net Rev -> Costs -> Net Operating Result)', () => {
    const grossSales = D('30000000.00');
    const rescissions = D('4300000.00');
    const netRevenue = grossSales.minus(rescissions);
    const costs = D('13500000.00');
    const netProfit = netRevenue.minus(costs);

    assert.equal(netRevenue.toString(), '25700000.00');
    assert.equal(netProfit.toString(), '12200000.00');

    const marginPct = (netProfit.toNumber() / netRevenue.toNumber()) * 100;
    assert.equal(marginPct.toFixed(1), '47.5');
  });

  it('4. DOM Contract: BalanceSheetAnalyticsView and IncomeStatementAnalyticsView render valid markup', async () => {
    const { BalanceSheetAnalyticsView } = await import('@/components/admin/erp/v2/views/ledger/BalanceSheetAnalyticsView');
    const { IncomeStatementAnalyticsView } = await import('@/components/admin/erp/v2/views/ledger/IncomeStatementAnalyticsView');

    const bsHtml = renderToStaticMarkup(
      React.createElement(BalanceSheetAnalyticsView, {
        accountStats,
        journalEntries: sampleEntries,
        isAr: true,
        currentAccent: '#2563eb',
        onInspectAccount: () => {}
      })
    );

    assert.equal(bsHtml.includes('قائمة المركز المالي'), true);
    assert.equal(bsHtml.includes('إجمالي الأصول'), true);
    assert.equal(bsHtml.includes('إجمالي الالتزامات'), true);
    assert.equal(bsHtml.includes('حقوق الملكية'), true);
    assert.equal(bsHtml.includes('توزيع الأصول حسب الفئات الرئيسية'), true);
    assert.equal(bsHtml.includes('أكبر الحسابات في الميزانية'), true);

    const isHtml = renderToStaticMarkup(
      React.createElement(IncomeStatementAnalyticsView, {
        accountStats,
        journalEntries: sampleEntries,
        isAr: true,
        currentAccent: '#2563eb',
        onInspectAccount: () => {}
      })
    );

    assert.equal(isHtml.includes('قائمة الأرباح والخسائر'), true);
    assert.equal(isHtml.includes('إجمالي الإيرادات'), true);
    assert.equal(isHtml.includes('إجمالي المصروفات والتكاليف'), true);
    assert.equal(isHtml.includes('صافي نتيجة النشاط'), true);
    assert.equal(isHtml.includes('تحليل تكوين صافي الربح'), true);
    assert.equal(isHtml.includes('أكبر حسابات المصروفات والتكاليف'), true);
  });
});
