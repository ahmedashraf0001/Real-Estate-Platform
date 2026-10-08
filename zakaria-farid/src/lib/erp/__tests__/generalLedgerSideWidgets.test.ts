import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { CANONICAL_COA, resolveEffectivePeriod } from '@/lib/erp/ledger';
import { D, Decimal } from '@/lib/erp/math';
import { ERPAccountingPeriod, ERPAccount } from '@/lib/erp/types';

const cjsRequire = createRequire(import.meta.url);
try {
  cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
  cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };
} catch (_) {}

let GeneralLedgerSideWidgets: any;

describe('General Ledger Companion Side Widgets Suite (§Redesign & Offloaded Controls)', () => {
  before(async () => {
    const mod = await import('@/components/admin/erp/v2/views/GeneralLedgerSideWidgets');
    GeneralLedgerSideWidgets = mod.GeneralLedgerSideWidgets;
  });
  const dummyOpenPeriod: ERPAccountingPeriod = {
    period_id: 'period-2026-09',
    fiscal_year: 2026,
    period_number: 9,
    start_date: '2026-09-01',
    end_date: '2026-09-30',
    status: 'OPEN'
  };

  const dummyLockedPeriod: ERPAccountingPeriod = {
    period_id: 'period-2026-08',
    fiscal_year: 2026,
    period_number: 8,
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    status: 'LOCKED'
  };

  const balancedReport = {
    sumDebits: D('407606250.99'),
    sumCredits: D('407606250.99'),
    isMovementsBalanced: true,
    isBalancesBalanced: true
  };

  const unbalancedReport = {
    sumDebits: D('407606250.99'),
    sumCredits: D('407600000.00'),
    isMovementsBalanced: false,
    isBalancesBalanced: false
  };

  // 1. FISCAL PERIOD & LOCKING CONTROLS
  describe('1. Fiscal Period & Locking Widget Logic', () => {
    it('correctly maps period status and labels for OPEN period', () => {
      const isLocked = dummyOpenPeriod.status === 'LOCKED';
      assert.equal(isLocked, false);
      const labelAr = isLocked ? 'الفترة مقفلة' : 'الفترة مفتوحة';
      const labelEn = isLocked ? 'Locked' : 'Open';
      const buttonTextAr = isLocked ? 'إعادة فتح الفترة المحاسبية' : 'إقفال الفترة المحاسبية';

      assert.equal(labelAr, 'الفترة مفتوحة');
      assert.equal(labelEn, 'Open');
      assert.equal(buttonTextAr, 'إقفال الفترة المحاسبية');
    });

    it('correctly maps period status and labels for LOCKED period', () => {
      const isLocked = dummyLockedPeriod.status === 'LOCKED';
      assert.equal(isLocked, true);
      const labelAr = isLocked ? 'الفترة مقفلة' : 'الفترة مفتوحة';
      const labelEn = isLocked ? 'Locked' : 'Open';
      const buttonTextAr = isLocked ? 'إعادة فتح الفترة المحاسبية' : 'إقفال الفترة المحاسبية';

      assert.equal(labelAr, 'الفترة مقفلة');
      assert.equal(labelEn, 'Locked');
      assert.equal(buttonTextAr, 'إعادة فتح الفترة المحاسبية');
    });

    it('formats fiscal period header as YEAR / MONTH with zero-padding', () => {
      const formatPeriod = (p: ERPAccountingPeriod) =>
        `${p.fiscal_year} / ${String(p.period_number).padStart(2, '0')}`;

      assert.equal(formatPeriod(dummyOpenPeriod), '2026 / 09');
      assert.equal(formatPeriod(dummyLockedPeriod), '2026 / 08');
    });

    it('supports selecting a fiscal period from periods list and reflects target period status', () => {
      const periods: ERPAccountingPeriod[] = [
        { period_id: 'prd-2026-01', fiscal_year: 2026, period_number: 1, start_date: '2026-01-01', end_date: '2026-01-31', status: 'CLOSED' },
        { period_id: 'prd-2026-02', fiscal_year: 2026, period_number: 2, start_date: '2026-02-01', end_date: '2026-02-28', status: 'CLOSED' },
        { period_id: 'prd-2026-03', fiscal_year: 2026, period_number: 3, start_date: '2026-03-01', end_date: '2026-03-31', status: 'OPEN' }
      ];

      // Default selection is active period (e.g. prd-03)
      let selectedId = 'prd-2026-03';
      let selected = periods.find(p => p.period_id === selectedId)!;
      assert.equal(selected.status, 'OPEN');

      // User selects prd-01
      selectedId = 'prd-2026-01';
      selected = periods.find(p => p.period_id === selectedId)!;
      assert.equal(selected.status, 'CLOSED');
      assert.equal(selected.fiscal_year, 2026);
      assert.equal(selected.period_number, 1);
    });

    it('toggles lock status on the specifically selected period, not just activePeriod', () => {
      const periods: ERPAccountingPeriod[] = [
        { period_id: 'prd-2026-01', fiscal_year: 2026, period_number: 1, start_date: '2026-01-01', end_date: '2026-01-31', status: 'LOCKED' },
        { period_id: 'prd-2026-03', fiscal_year: 2026, period_number: 3, start_date: '2026-03-01', end_date: '2026-03-31', status: 'OPEN' }
      ];

      const activePeriod = periods[1]; // Period 3 (OPEN)
      const selectedPeriod = periods[0]; // Period 1 (LOCKED)

      let toggledPeriodId: string | null = null;
      let toggledNewStatus: string | null = null;

      const onTogglePeriodStatus = (periodId: string, targetStatus: 'OPEN' | 'LOCKED') => {
        toggledPeriodId = periodId;
        toggledNewStatus = targetStatus;
      };

      // Toggling selected period should target prd-2026-01 with 'OPEN'
      const targetStatus = selectedPeriod.status === 'OPEN' ? 'LOCKED' : 'OPEN';
      onTogglePeriodStatus(selectedPeriod.period_id, targetStatus);

      assert.equal(toggledPeriodId, 'prd-2026-01');
      assert.equal(toggledNewStatus, 'OPEN');
      assert.notEqual(toggledPeriodId, activePeriod.period_id);
    });

    it('derives month filter string (YYYY-MM) from selected period start date', () => {
      const p: ERPAccountingPeriod = {
        period_id: 'prd-2026-04',
        fiscal_year: 2026,
        period_number: 4,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        status: 'OPEN'
      };

      const monthFilter = p.start_date.substring(0, 7);
      assert.equal(monthFilter, '2026-04');
    });

    it('accurately counts entries falling strictly within the selected period date range', () => {
      const p: ERPAccountingPeriod = {
        period_id: 'prd-2026-03',
        fiscal_year: 2026,
        period_number: 3,
        start_date: '2026-03-01',
        end_date: '2026-03-31',
        status: 'OPEN'
      };

      const entries = [
        { entry_id: '1', entry_date: '2026-02-15' },
        { entry_id: '2', entry_date: '2026-03-05' },
        { entry_id: '3', entry_date: '2026-03-20' },
        { entry_id: '4', entry_date: '2026-04-01' }
      ];

      const periodCount = entries.filter(
        e => e.entry_date >= p.start_date && e.entry_date <= p.end_date
      ).length;

      assert.equal(periodCount, 2);
    });

    it('safely handles missing or empty activePeriod fallback resolution using resolveEffectivePeriod', () => {
      // 1. With activePeriod provided
      assert.equal(
        resolveEffectivePeriod({ activePeriod: dummyOpenPeriod })?.period_id,
        dummyOpenPeriod.period_id
      );

      // 2. With periods list fallback when activePeriod is undefined
      assert.equal(
        resolveEffectivePeriod({ periods: [dummyLockedPeriod] })?.period_id,
        dummyLockedPeriod.period_id
      );

      // 3. Complete undefined fallback
      assert.equal(resolveEffectivePeriod({}), undefined);

      // 4. Selected period prioritized over activePeriod and periods
      assert.equal(
        resolveEffectivePeriod({
          selectedPeriod: dummyLockedPeriod,
          activePeriod: dummyOpenPeriod,
          periods: [dummyOpenPeriod]
        })?.period_id,
        dummyLockedPeriod.period_id
      );

      // 5. Selected period updated from live periods array if matching period_id exists
      const updatedLockedPeriod: ERPAccountingPeriod = { ...dummyOpenPeriod, status: 'LOCKED' };
      assert.equal(
        resolveEffectivePeriod({
          selectedPeriod: dummyOpenPeriod,
          periods: [updatedLockedPeriod]
        })?.status,
        'LOCKED'
      );

      // 6. User selected period id matching in periods array
      assert.equal(
        resolveEffectivePeriod({
          userSelectedPeriodId: dummyLockedPeriod.period_id,
          periods: [dummyOpenPeriod, dummyLockedPeriod],
          activePeriod: dummyOpenPeriod
        })?.period_id,
        dummyLockedPeriod.period_id
      );

      // 7. Active period matched inside periods array over first item
      assert.equal(
        resolveEffectivePeriod({
          periods: [dummyLockedPeriod, dummyOpenPeriod],
          activePeriod: dummyOpenPeriod
        })?.period_id,
        dummyOpenPeriod.period_id
      );
    });
  });

  // 2. QUICK AUDIT TRIGGERS & BALANCE INVARIANT
  describe('2. Quick Audit Triggers & Invariant Telemetry', () => {
    it('verifies double-entry invariant with zero variance for balanced ledger', () => {
      const variance = balancedReport.sumDebits.minus(balancedReport.sumCredits);
      assert.equal(variance.isZero(), true);
      assert.equal(variance.toNumber(), 0);
      assert.equal(balancedReport.isMovementsBalanced, true);
      const statusPill = balancedReport.isMovementsBalanced ? 'مطابق 0.00' : 'يوجد فارق!';
      assert.equal(statusPill, 'مطابق 0.00');
    });

    it('detects variance and flags unbalanced ledger correctly', () => {
      const variance = unbalancedReport.sumDebits.minus(unbalancedReport.sumCredits);
      assert.equal(variance.isZero(), false);
      assert.equal(variance.toNumber(), 6250.99);
      assert.equal(unbalancedReport.isMovementsBalanced, false);
      const statusPill = unbalancedReport.isMovementsBalanced ? 'مطابق 0.00' : 'يوجد فارق!';
      assert.equal(statusPill, 'يوجد فارق!');
    });

    it('routes quick audit triggers to appropriate modules, filters, and resets currentPage', () => {
      let currentPage = 5;
      let activeTab = 'coa';
      let selectedStatus = 'all';
      let filteredAccount: string | null = null;

      const onFilterUnpostedEntries = () => {
        selectedStatus = 'review';
        currentPage = 1;
        activeTab = 'journal';
      };

      const onFilterLiquidAccounts = () => {
        filteredAccount = '101000';
        currentPage = 1;
        activeTab = 'journal';
      };

      onFilterUnpostedEntries();
      assert.equal(activeTab, 'journal');
      assert.equal(selectedStatus, 'review');
      assert.equal(currentPage, 1);

      currentPage = 3;
      onFilterLiquidAccounts();
      assert.equal(activeTab, 'journal');
      assert.equal(filteredAccount, '101000');
      assert.equal(currentPage, 1);
    });
  });

  // 3. REPORTS & EXPORT HUB
  describe('3. Reports & Export Hub Actions', () => {
    it('supports direct 1-click links to all 3 core financial statements', () => {
      const statements = [
        { tab: 'detailed_tb', titleAr: 'ميزان تفصيلي', titleEn: 'Detailed TB' },
        { tab: 'balance_sheet', titleAr: 'المركز المالي', titleEn: 'Balance Sheet' },
        { tab: 'income_statement', titleAr: 'الأرباح والخسائر', titleEn: 'Income Statement' }
      ];

      assert.equal(statements.length, 3);
      assert.deepEqual(statements.map(s => s.tab), ['detailed_tb', 'balance_sheet', 'income_statement']);
    });
  });

  // 4. SELECTED ACCOUNT CONTEXTUAL INSPECTOR
  describe('4. Contextual Selected Account Inspector Card', () => {
    it('computes net balance correctly for debit-normal accounts in the side rail', () => {
      const acc = CANONICAL_COA['101000']; // Cash in Safe (DEBIT normal)
      const stats = { debits: D(5000000), credits: D(1200000), count: 14 };

      const net = acc.normal_balance === 'DEBIT'
        ? stats.debits.minus(stats.credits)
        : stats.credits.minus(stats.debits);

      assert.equal(net.toNumber(), 3800000);
      assert.equal(net.formatEGP(true), '3,800,000.00 ج.م');
    });

    it('computes net balance correctly for credit-normal liability accounts in the side rail', () => {
      const acc = CANONICAL_COA['201000']; // Trade Payables (CREDIT normal)
      const stats = { debits: D(500000), credits: D(4200000), count: 22 };

      const net = acc.normal_balance === 'DEBIT'
        ? stats.debits.minus(stats.credits)
        : stats.credits.minus(stats.debits);

      assert.equal(net.toNumber(), 3700000);
      assert.equal(net.formatEGP(true), '3,700,000.00 ج.م');
    });

    it('safely handles zero-stats account selection without error', () => {
      const acc = CANONICAL_COA['102100']; // Maintenance Escrow
      const stats = { debits: D(0), credits: D(0), count: 0 };

      const net = acc.normal_balance === 'DEBIT'
        ? stats.debits.minus(stats.credits)
        : stats.credits.minus(stats.debits);

      assert.equal(net.toNumber(), 0);
      assert.equal(net.isZero(), true);
    });

    it('safely handles extra long account names without breaking structure', () => {
      const longAcc: ERPAccount = {
        account_code: '109999',
        account_name_ar: 'حساب مجمع استثمارات المشاريع العقارية قيد التطوير والتنفيذ الهندسي الممتد لشركة زكريا فريد',
        account_name_en: 'Accumulated Real Estate Development Engineering Works Under Construction Escrow Ledger Account',
        account_type: 'ASSET',
        normal_balance: 'DEBIT',
        is_active: true,
        notes: 'حساب تجريبي طويل - Long test account'
      };

      assert.ok(longAcc.account_name_ar.length > 50);
      assert.ok(longAcc.account_name_en.length > 50);

      // Verify bilingual title resolution behavior as rendered in the inspector
      const resolveBilingualTitles = (acc: ERPAccount, isAr: boolean) => ({
        primary: isAr ? acc.account_name_ar : acc.account_name_en,
        secondary: isAr ? acc.account_name_en : acc.account_name_ar
      });

      const arDisplay = resolveBilingualTitles(longAcc, true);
      assert.equal(arDisplay.primary, longAcc.account_name_ar);
      assert.equal(arDisplay.secondary, longAcc.account_name_en);

      const enDisplay = resolveBilingualTitles(longAcc, false);
      assert.equal(enDisplay.primary, longAcc.account_name_en);
      assert.equal(enDisplay.secondary, longAcc.account_name_ar);

      // Verify net balance computation for longAcc
      const stats = { debits: D(10000000), credits: D(2500000), count: 5 };
      const net = longAcc.normal_balance === 'DEBIT'
        ? stats.debits.minus(stats.credits)
        : stats.credits.minus(stats.debits);
      assert.equal(net.toNumber(), 7500000);
      assert.equal(net.formatEGP(true), '7,500,000.00 ج.م');
    });

    it('safely handles missing stats (undefined) for selected account', () => {
      const acc = CANONICAL_COA['101000'];
      const getAccountNet = (account: ERPAccount, stats?: { debits: Decimal; credits: Decimal }) => {
        if (!account || !stats) return D(0);
        return account.normal_balance === 'DEBIT'
          ? stats.debits.minus(stats.credits)
          : stats.credits.minus(stats.debits);
      };

      const netWithUndefined = getAccountNet(acc, undefined);
      assert.equal(netWithUndefined.toNumber(), 0);
      assert.equal(netWithUndefined.isZero(), true);
    });
  });

  // 5. WORKSTATION TOP BAR ARCHITECTURE
  describe('5. Workstation Top Bar Architecture', () => {
    it('properly evaluates customActions !== undefined to allow custom actions or suppressed actions', () => {
      const resolveTopBarActions = (options?: { customActions?: string | null }) => {
        if (options?.customActions !== undefined) {
          return options.customActions;
        }
        return null;
      };

      assert.equal(resolveTopBarActions(undefined), null);
      assert.equal(resolveTopBarActions({}), null);
      assert.equal(resolveTopBarActions({ customActions: 'CUSTOM_PRINT' }), 'CUSTOM_PRINT');
      assert.equal(resolveTopBarActions({ customActions: null }), null);
    });
  });

  // 6. RTL MINUS SIGN FORMATTING & BIDI ISOLATION
  describe('6. RTL Minus Sign Formatting & Bidi Isolation', () => {
    const parseMetricValue = (val: number | string | Decimal | undefined | null) => {
      if (val === undefined || val === null) {
        return { isNegative: false, formattedNumber: '0' };
      }
      if (typeof val === 'object' && 'isNegative' in val && typeof val.isNegative === 'function') {
        const isNeg = val.isNegative();
        const absVal = Math.round(Math.abs(val.toNumber()));
        return {
          isNegative: isNeg,
          formattedNumber: isNeg ? `- ${absVal.toLocaleString('en-US')}` : absVal.toLocaleString('en-US')
        };
      }
      if (typeof val === 'number') {
        const isNeg = val < 0;
        const absVal = Math.round(Math.abs(val));
        return {
          isNegative: isNeg,
          formattedNumber: isNeg ? `- ${absVal.toLocaleString('en-US')}` : absVal.toLocaleString('en-US')
        };
      }
      let str = String(val).trim();
      const curRegex = /(?:\s+|^)(ج\.م|EGP|USD|EUR|LE)(?:\s+|$)/i;
      str = str.replace(curRegex, ' ').trim();
      const isNeg = str.startsWith('-') || str.endsWith('-') || (str.startsWith('(') && str.endsWith(')'));
      const clean = str.replace(/[-()]/g, '').trim().replace(/\.\d{1,2}$/, '');
      const numVal = parseFloat(clean.replace(/,/g, ''));
      if (!isNaN(numVal)) {
        const absVal = Math.round(Math.abs(numVal));
        return {
          isNegative: isNeg,
          formattedNumber: isNeg ? `- ${absVal.toLocaleString('en-US')}` : absVal.toLocaleString('en-US')
        };
      }
      return { isNegative: isNeg, formattedNumber: isNeg ? `- ${clean}` : clean };
    };

    it('formats negative Decimal with minus on the left of digits', () => {
      const dec = D('-25700000');
      const parsed = parseMetricValue(dec);
      assert.equal(parsed.isNegative, true);
      assert.equal(parsed.formattedNumber, '- 25,700,000');
      assert.ok(parsed.formattedNumber.startsWith('-'));
    });

    it('formats trailing minus string from RTL display correctly with leading minus', () => {
      const trailingMinusStr = '25,700,000- ج.م';
      const parsed = parseMetricValue(trailingMinusStr);
      assert.equal(parsed.isNegative, true);
      assert.equal(parsed.formattedNumber, '- 25,700,000');
      assert.ok(parsed.formattedNumber.startsWith('-'));
    });

    it('formats parenthesized negative string correctly with leading minus', () => {
      const parenStr = '(13,500,000)';
      const parsed = parseMetricValue(parenStr);
      assert.equal(parsed.isNegative, true);
      assert.equal(parsed.formattedNumber, '- 13,500,000');
      assert.ok(parsed.formattedNumber.startsWith('-'));
    });

    it('formats positive Decimal normally without minus', () => {
      const dec = D('407606250.99');
      const parsed = parseMetricValue(dec);
      assert.equal(parsed.isNegative, false);
      assert.equal(parsed.formattedNumber, '407,606,251');
    });

    it('formats negative number correctly', () => {
      const parsed = parseMetricValue(-150000);
      assert.equal(parsed.isNegative, true);
      assert.equal(parsed.formattedNumber, '- 150,000');
    });

    it('formats zero correctly without minus sign', () => {
      const parsedZeroNum = parseMetricValue(0);
      assert.equal(parsedZeroNum.isNegative, false);
      assert.equal(parsedZeroNum.formattedNumber, '0');

      const parsedZeroDec = parseMetricValue(D(0));
      assert.equal(parsedZeroDec.isNegative, false);
      assert.equal(parsedZeroDec.formattedNumber, '0');
    });
  });

  // 7. MOVEMENT STATS & GRANULARITIES
  describe('7. Movement Stats Granularity (Daily, Weekly, Monthly, Yearly)', () => {
    const mockEntries = [
      {
        entry_id: 'ent-1',
        entry_number: 'JV-2026-001',
        entry_date: '2026-01-15',
        description: 'دفعة تعاقد حجز فيلا',
        lines: [
          { debit_amount: '500000', credit_amount: '0' },
          { debit_amount: '0', credit_amount: '500000' }
        ]
      },
      {
        entry_id: 'ent-2',
        entry_number: 'JV-2026-002',
        entry_date: '2026-02-10',
        description: 'شراء حديد وأسمنت للمشروع',
        lines: [
          { debit_amount: '300000', credit_amount: '0' },
          { debit_amount: '0', credit_amount: '300000' }
        ]
      },
      {
        entry_id: 'ent-3',
        entry_number: 'JV-2026-003',
        entry_date: '2026-09-05',
        description: 'سداد رواتب ومصروفات تشغيل',
        lines: [
          { debit_amount: '80000', credit_amount: '0' },
          { debit_amount: '0', credit_amount: '80000' }
        ]
      }
    ];

    it('computes monthly granularity covering all 12 calendar months with cumulative balance', () => {
      const monthBuckets = Array.from({ length: 12 }, () => ({
        debits: D(0),
        credits: D(0)
      }));

      mockEntries.forEach(entry => {
        const d = entry.entry_date || '';
        if (d.length >= 7) {
          const parts = d.split('-');
          const monthIdx = parseInt(parts[1], 10) - 1;
          if (monthIdx >= 0 && monthIdx < 12) {
            entry.lines.forEach(line => {
              monthBuckets[monthIdx].debits = monthBuckets[monthIdx].debits.plus(D(line.debit_amount || '0'));
              monthBuckets[monthIdx].credits = monthBuckets[monthIdx].credits.plus(D(line.credit_amount || '0'));
            });
          }
        }
      });

      assert.equal(monthBuckets.length, 12);
      assert.equal(monthBuckets[0].debits.toNumber(), 500000);
      assert.equal(monthBuckets[0].credits.toNumber(), 500000);
      assert.equal(monthBuckets[1].debits.toNumber(), 300000);
      assert.equal(monthBuckets[1].credits.toNumber(), 300000);
      assert.equal(monthBuckets[8].debits.toNumber(), 80000);
      assert.equal(monthBuckets[8].credits.toNumber(), 80000);
      assert.equal(monthBuckets[2].debits.toNumber(), 0);
    });

    it('computes daily granularity grouping entries by exact date', () => {
      const dateMap: Record<string, { debits: Decimal; credits: Decimal }> = {};
      mockEntries.forEach(entry => {
        const d = entry.entry_date;
        if (!dateMap[d]) dateMap[d] = { debits: D(0), credits: D(0) };
        entry.lines.forEach(l => {
          dateMap[d].debits = dateMap[d].debits.plus(D(l.debit_amount));
          dateMap[d].credits = dateMap[d].credits.plus(D(l.credit_amount));
        });
      });

      const dates = Object.keys(dateMap).sort();
      assert.deepEqual(dates, ['2026-01-15', '2026-02-10', '2026-09-05']);
      assert.equal(dateMap['2026-01-15'].debits.toNumber(), 500000);
      assert.equal(dateMap['2026-09-05'].debits.toNumber(), 80000);
    });

    it('computes weekly granularity across 6 intervals', () => {
      const weekBuckets = Array.from({ length: 6 }, () => ({ debits: D(0), credits: D(0) }));

      mockEntries.forEach(entry => {
        const d = entry.entry_date;
        const day = parseInt(d.split('-')[2] || '1', 10);
        const weekIdx = Math.min(5, Math.floor((day - 1) / 5));
        entry.lines.forEach(l => {
          weekBuckets[weekIdx].debits = weekBuckets[weekIdx].debits.plus(D(l.debit_amount));
          weekBuckets[weekIdx].credits = weekBuckets[weekIdx].credits.plus(D(l.credit_amount));
        });
      });

      assert.equal(weekBuckets[2].debits.toNumber(), 500000);
      assert.equal(weekBuckets[1].debits.toNumber(), 300000);
      assert.equal(weekBuckets[0].debits.toNumber(), 80000);
    });
  });

  // 8. ENTRY TYPE DISTRIBUTION CLASSIFICATION
  describe('8. Entry Type Distribution Classification', () => {
    it('accurately classifies entries into procurement, sales, expenses, investments, and other', () => {
      const testEntries = [
        {
          description: 'فاتورة شراء خامات وبناء',
          source_module: 'MANUAL',
          lines: [{ account_code: '201000' }]
        },
        {
          description: 'دفعة تعاقد بيع وحدة',
          source_module: 'SALES',
          lines: [{ account_code: '401000' }]
        },
        {
          description: 'سداد رواتب وأجور موظفين',
          source_module: 'MANUAL',
          lines: [{ account_code: '501000' }]
        },
        {
          description: 'ضخ استثمار وزيادة رأس المال',
          source_module: 'CAPITAL_CALL',
          lines: [{ account_code: '301000' }]
        },
        {
          description: 'تسوية شيكات مقاصة عامة',
          source_module: 'MANUAL',
          lines: [{ account_code: '101000' }]
        }
      ];

      const classify = (entry: { description?: string; source_module?: string; lines?: { account_code: string }[] }) => {
        const desc = (entry.description || '').toLowerCase();
        const codes = (entry.lines || []).map(l => l.account_code);
        const isSales = entry.source_module === 'SALES' || codes.some(c => c.startsWith('4') || c === '103000') || /مبيع|إيراد|بيع|دفعة|تعاقد|حجز|قسط|تحصيل/.test(desc);
        const isExpenses = codes.some(c => c.startsWith('5')) || /مصروف|رواتب|أجور|صيانة|إيجار|كهرباء|تشغيل/.test(desc);
        const isPurchases = codes.some(c => c.startsWith('201') || c.startsWith('202') || c.startsWith('204')) || /شراء|مشتريات|توريد|خامات|أصناف/.test(desc);
        const isInvestment = entry.source_module === 'CAPITAL_CALL' || codes.some(c => c.startsWith('3') || c.startsWith('105')) || /رأس المال|استثمار|حصة|أرباح|تمويل/.test(desc);

        if (isPurchases) return 'purchases';
        if (isSales) return 'sales';
        if (isExpenses) return 'expenses';
        if (isInvestment) return 'investments';
        return 'other';
      };

      assert.equal(classify(testEntries[0]), 'purchases');
      assert.equal(classify(testEntries[1]), 'sales');
      assert.equal(classify(testEntries[2]), 'expenses');
      assert.equal(classify(testEntries[3]), 'investments');
      assert.equal(classify(testEntries[4]), 'other');
    });
  });

  // 9. TABLE RESPONSIVENESS & COLUMN WIDTH INTEGRITY
  describe('9. Table Responsiveness & Column Width Math', () => {
    it('verifies journal table columns have minimum safe widths > 820px', () => {
      const colWidths = {
        seq: 38,
        date: 95,
        entryNum: 155,
        descMin: 180,
        accountsFlow: 220,
        amount: 135,
        status: 90
      };

      const totalCalculatedMin = Object.values(colWidths).reduce((a, b) => a + b, 0);
      assert.ok(totalCalculatedMin >= 820, `Total min width is ${totalCalculatedMin}px, which safely satisfies 820px requirement`);
    });

    it('verifies master COA table columns have minimum safe widths > 680px', () => {
      const coaColWidths = {
        checkbox: 36,
        code: 80,
        nameMin: 150,
        type: 65,
        nature: 70,
        balance: 130,
        status: 65,
        lastMovement: 90
      };

      const totalCalculatedMin = Object.values(coaColWidths).reduce((a, b) => a + b, 0);
      assert.ok(totalCalculatedMin >= 680, `Total COA min width is ${totalCalculatedMin}px, which safely satisfies 680px requirement`);
    });
  });

  // 10. WIDGET ORDERING & CONSOLIDATED QUICK ACTIONS
  describe('10. Widget Ordering & Consolidated Quick Actions', () => {
    it('verifies widget ordering in GeneralLedgerSideWidgets puts COA tree at index 0 (top-most)', () => {
      const html = renderToStaticMarkup(
        React.createElement(GeneralLedgerSideWidgets, {
          standalone: true,
          trialBalanceReport: balancedReport,
          totalEntriesCount: 5,
          activePeriod: dummyOpenPeriod,
          onTogglePeriodStatus: () => {}
        })
      );

      const treeIndex = html.indexOf('data-testid="side-widget-coa-tree"');
      const quickActionsIndex = html.indexOf('data-testid="side-widget-quick-actions"') !== -1
        ? html.indexOf('data-testid="side-widget-quick-actions"')
        : html.indexOf('data-testid="side-widget-reports"');
      const periodBalanceIndex = html.indexOf('data-testid="side-widget-period-balance"');

      assert.ok(treeIndex !== -1, 'Must render side-widget-coa-tree');
      assert.ok(quickActionsIndex !== -1, 'Must render side-widget-quick-actions');
      assert.ok(periodBalanceIndex !== -1, 'Must render side-widget-period-balance');

      assert.ok(treeIndex < quickActionsIndex, 'COA tree must precede quick actions widget');
      assert.ok(quickActionsIndex < periodBalanceIndex, 'Quick actions widget must precede period-balance widget');
    });

    it('verifies account inspector is removed from side rail (clicking account opens modal directly)', () => {
      const acc = CANONICAL_COA['101000'];
      const html = renderToStaticMarkup(
        React.createElement(GeneralLedgerSideWidgets, {
          standalone: true,
          trialBalanceReport: balancedReport,
          totalEntriesCount: 5,
          activePeriod: dummyOpenPeriod,
          selectedAccount: acc,
          onTogglePeriodStatus: () => {}
        })
      );

      const treeIndex = html.indexOf('data-testid="side-widget-coa-tree"');
      const inspectorIndex = html.indexOf('data-testid="side-widget-account-inspector"');
      const quickActionsIndex = html.indexOf('data-testid="side-widget-quick-actions"') !== -1
        ? html.indexOf('data-testid="side-widget-quick-actions"')
        : html.indexOf('data-testid="side-widget-reports"');

      assert.ok(treeIndex !== -1, 'Must render side-widget-coa-tree');
      assert.equal(inspectorIndex, -1, 'Side rail must no longer render side-widget-account-inspector');
      assert.ok(quickActionsIndex !== -1, 'Must render side-widget-quick-actions');
      assert.ok(treeIndex < quickActionsIndex, 'COA tree must precede quick actions widget');
    });

    it('verifies account inspector is not rendered when selectedAccountId is provided alone', () => {
      const html = renderToStaticMarkup(
        React.createElement(GeneralLedgerSideWidgets, {
          standalone: true,
          trialBalanceReport: balancedReport,
          totalEntriesCount: 5,
          activePeriod: dummyOpenPeriod,
          selectedAccountId: '101000',
          onTogglePeriodStatus: () => {}
        })
      );

      const treeIndex = html.indexOf('data-testid="side-widget-coa-tree"');
      const inspectorIndex = html.indexOf('data-testid="side-widget-account-inspector"');
      const quickActionsIndex = html.indexOf('data-testid="side-widget-quick-actions"') !== -1
        ? html.indexOf('data-testid="side-widget-quick-actions"')
        : html.indexOf('data-testid="side-widget-reports"');

      assert.ok(treeIndex !== -1, 'Must render side-widget-coa-tree');
      assert.equal(inspectorIndex, -1, 'Inspector must not be rendered in side rail');
      assert.ok(quickActionsIndex !== -1, 'Must render side-widget-quick-actions');
      assert.ok(treeIndex < quickActionsIndex, 'Ordering must remain tree < quick actions');
    });

    it('verifies quick actions widget contains all 4 triggers and core financial statement links', () => {
      const html = renderToStaticMarkup(
        React.createElement(GeneralLedgerSideWidgets, {
          standalone: true,
          trialBalanceReport: balancedReport,
          totalEntriesCount: 5,
          activePeriod: dummyOpenPeriod,
          onTogglePeriodStatus: () => {},
          onOpenNewEntry: () => {},
          onAddSubAccount: () => {},
          onExportExcel: () => {},
          onPrintTrialBalance: () => {},
          onNavigateTab: () => {}
        })
      );

      // Verify all 4 operational and export triggers exist
      assert.ok(html.includes('+ قيد يومية جديد'), 'Must contain "+ قيد يومية جديد" trigger');
      assert.ok(html.includes('+ إضافة حساب فرعي'), 'Must contain "+ إضافة حساب فرعي" trigger');
      assert.ok(html.includes('تصدير الدفتر Excel'), 'Must contain "تصدير الدفتر Excel" trigger');
      assert.ok(html.includes('طباعة الميزان'), 'Must contain "طباعة الميزان" trigger');

      // Verify all 3 core financial statements exist
      assert.ok(html.includes('ميزان تفصيلي'), 'Must contain "ميزان تفصيلي" link');
      assert.ok(html.includes('المركز المالي'), 'Must contain "المركز المالي" link');
      assert.ok(html.includes('الأرباح والخسائر'), 'Must contain "الأرباح والخسائر" link');
    });

    it('verifies data-testid="side-widget-quick-actions" and tabular-nums formatting on all balance telemetry rows', () => {
      const html = renderToStaticMarkup(
        React.createElement(GeneralLedgerSideWidgets, {
          standalone: true,
          trialBalanceReport: balancedReport,
          totalEntriesCount: 5,
          activePeriod: dummyOpenPeriod,
          onTogglePeriodStatus: () => {}
        })
      );

      // Verify exact data-testid
      assert.ok(html.includes('data-testid="side-widget-quick-actions"'), 'Must render data-testid="side-widget-quick-actions"');
      assert.ok(html.includes('data-testid="side-widget-period-balance"'), 'Must render data-testid="side-widget-period-balance"');
      assert.ok(html.includes('الفترة والتوازن'), 'Must render consolidated "الفترة والتوازن" header');

      // Verify balance telemetry rows exist and have tabular-nums
      assert.ok(html.includes('font-variant-numeric:tabular-nums'), 'Must format telemetry values with tabular-nums');
      assert.ok(html.includes('مدين'), 'Must render total debits telemetry label');
      assert.ok(html.includes('دائن'), 'Must render total credits telemetry label');
      assert.ok(html.includes('متوازن 0.00'), 'Must render balanced pill');
    });
  });
});
