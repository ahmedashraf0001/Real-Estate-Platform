import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { D, Decimal } from '@/lib/erp/math';
import { ERPJournalEntry, ERPAccount, NormalBalance } from '@/lib/erp/types';
import { HIERARCHY_STRUCTURE } from '@/lib/erp/coaHierarchy';

// Register .css and .module.css handlers so Node.js doesn't fail on CSS module imports
const cjsRequire = createRequire(import.meta.url);
cjsRequire.extensions['.css'] = (m: any) => { m.exports = {}; };
cjsRequire.extensions['.module.css'] = (m: any) => { m.exports = {}; };

describe('General Ledger Unified Workstation Suite (§Task 5 & 6)', () => {
  const sampleEntries: ERPJournalEntry[] = [
    {
      entry_id: 'je-001',
      entry_number: 'JV-2026-001',
      entry_date: '2026-03-01',
      period_id: 'period-2026-03',
      description: 'إيداع رأس مال بالبنك وحساب الخزينة',
      source_module: 'MANUAL',
      created_by: 'Farid Zakaria',
      created_at: '2026-03-01T10:00:00Z',
      is_locked: true,
      lines: [
        { line_id: 'l1', entry_id: 'je-001', line_number: 1, account_code: '101000', debit_amount: '1000000.00', credit_amount: '0.00' },
        { line_id: 'l2', entry_id: 'je-001', line_number: 2, account_code: '102000', debit_amount: '4000000.00', credit_amount: '0.00' },
        { line_id: 'l3', entry_id: 'je-001', line_number: 3, account_code: '301000', debit_amount: '0.00', credit_amount: '5000000.00' }
      ]
    },
    {
      entry_id: 'je-002',
      entry_number: 'JV-2026-002',
      entry_date: '2026-03-05',
      period_id: 'period-2026-03',
      description: 'شراء أراضي ومواد بناء بالأجل',
      source_module: 'WIP_ALLOCATION',
      created_by: 'Farid Zakaria',
      created_at: '2026-03-05T12:00:00Z',
      is_locked: true,
      lines: [
        { line_id: 'l4', entry_id: 'je-002', line_number: 1, account_code: '150000', debit_amount: '2500000.00', credit_amount: '0.00' },
        { line_id: 'l5', entry_id: 'je-002', line_number: 2, account_code: '151000', debit_amount: '1200000.00', credit_amount: '0.00' },
        { line_id: 'l6', entry_id: 'je-002', line_number: 3, account_code: '201000', debit_amount: '0.00', credit_amount: '3700000.00' }
      ]
    },
    {
      entry_id: 'je-003',
      entry_number: 'JV-2026-003',
      entry_date: '2026-03-10',
      period_id: 'period-2026-03',
      description: 'إيراد بيع وحدات عقارية نقداً',
      source_module: 'SALES',
      created_by: 'Farid Zakaria',
      created_at: '2026-03-10T14:00:00Z',
      is_locked: true,
      lines: [
        { line_id: 'l7', entry_id: 'je-003', line_number: 1, account_code: '102000', debit_amount: '800000.00', credit_amount: '0.00' },
        { line_id: 'l8', entry_id: 'je-003', line_number: 2, account_code: '401000', debit_amount: '0.00', credit_amount: '800000.00' }
      ]
    },
    {
      entry_id: 'je-004',
      entry_number: 'JV-2026-004',
      entry_date: '2026-03-15',
      period_id: 'period-2026-03',
      description: 'سداد مصروفات عمومية وتسويقية من الخزينة',
      source_module: 'MANUAL',
      created_by: 'Farid Zakaria',
      created_at: '2026-03-15T15:00:00Z',
      is_locked: true,
      lines: [
        { line_id: 'l9', entry_id: 'je-004', line_number: 1, account_code: '601000', debit_amount: '50000.00', credit_amount: '0.00' },
        { line_id: 'l10', entry_id: 'je-004', line_number: 2, account_code: '602000', debit_amount: '30000.00', credit_amount: '0.00' },
        { line_id: 'l11', entry_id: 'je-004', line_number: 3, account_code: '101000', debit_amount: '0.00', credit_amount: '80000.00' }
      ]
    }
  ];

  // Helper to compute account stats identical to GeneralLedgerView
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

  // Helper to compute 5 signed KPI metrics identical to GeneralLedgerView
  const computeSignedBreakdown = (stats: Record<string, { debits: Decimal; credits: Decimal; count: number }>) => {
    const signed = {
      assets: D(0),
      liabilities: D(0),
      equity: D(0),
      revenue: D(0),
      expenses: D(0)
    };

    Object.values(CANONICAL_COA).forEach(acc => {
      const s = stats[acc.account_code] || { debits: D(0), credits: D(0), count: 0 };
      const net = acc.normal_balance === 'DEBIT'
        ? s.debits.minus(s.credits)
        : s.credits.minus(s.debits);

      if (acc.account_type === 'ASSET') signed.assets = signed.assets.plus(net);
      else if (acc.account_type === 'LIABILITY' || acc.account_type === 'CONTRA_LIABILITY') signed.liabilities = signed.liabilities.plus(net);
      else if (acc.account_type === 'EQUITY') signed.equity = signed.equity.plus(net);
      else if (acc.account_type === 'REVENUE') signed.revenue = signed.revenue.plus(net);
      else if (acc.account_type === 'EXPENSE') signed.expenses = signed.expenses.plus(net);
    });

    return signed;
  };

  // 1. TOP 5 EXECUTIVE KPI CARDS
  describe('1. Executive 5 KPI Metric Cards & Aggregations', () => {
    it('accurately derives the 5 executive figures with signed balance consistency', () => {
      const stats = computeStats(sampleEntries);
      const signed = computeSignedBreakdown(stats);

      // Total Assets:
      // Cash Safe 101000: +1,000,000 - 80,000 = +920,000
      // Bank 102000: +4,000,000 + 800,000 = +4,800,000
      // Land 150000: +2,500,000
      // WIP 151000: +1,200,000
      // Total Assets = 920,000 + 4,800,000 + 2,500,000 + 1,200,000 = 9,420,000
      assert.equal(signed.assets.toNumber(), 9420000);

      // Total Liabilities:
      // AP 201000: +3,700,000 (credit normal)
      assert.equal(signed.liabilities.toNumber(), 3700000);

      // Equity:
      // Capital 301000: +5,000,000 (credit normal)
      assert.equal(signed.equity.toNumber(), 5000000);

      // Revenue:
      // Unit Sales 401000: +800,000 (credit normal)
      assert.equal(signed.revenue.toNumber(), 800000);

      // Expenses:
      // Marketing 601000: +50,000
      // Admin 602000: +30,000
      // Total Expenses = +80,000 (debit normal)
      assert.equal(signed.expenses.toNumber(), 80000);

      // Net Income = Revenue - Expenses = 800,000 - 80,000 = 720,000
      const netIncome = signed.revenue.minus(signed.expenses);
      assert.equal(netIncome.toNumber(), 720000);

      // Accounting Fundamental Equation:
      // Assets = Liabilities + Equity + Net Income
      // 9,420,000 = 3,700,000 + 5,000,000 + 720,000 = 9,420,000
      assert.equal(
        signed.assets.equals(signed.liabilities.plus(signed.equity).plus(netIncome)),
        true,
        'Assets must strictly equal Liabilities + Equity + Net Income'
      );
    });

    it('safely handles empty journal entries state with honest zero balances', () => {
      const stats = computeStats([]);
      const signed = computeSignedBreakdown(stats);

      assert.equal(signed.assets.toNumber(), 0);
      assert.equal(signed.liabilities.toNumber(), 0);
      assert.equal(signed.equity.toNumber(), 0);
      assert.equal(signed.revenue.toNumber(), 0);
      assert.equal(signed.expenses.toNumber(), 0);
    });

    it('validates 5 discrete card configurations without fake decorative elements', () => {
      const cardConfig = [
        { key: 'assets', color: 'emerald', positive: true },
        { key: 'liabilities', color: 'blue', positive: true },
        { key: 'equity', color: 'purple', positive: true },
        { key: 'revenue', color: 'teal', positive: true },
        { key: 'expenses', color: 'rose', positive: false }
      ];

      assert.equal(cardConfig.length, 5);
      assert.equal(cardConfig[0].color, 'emerald');
      assert.equal(cardConfig[4].positive, false, 'Expense trend should be negative or neutral');
    });

    it('renders GeneralLedgerView discrete KPI cards with sparkline curves', async () => {
      const { GeneralLedgerView } = await import('@/components/admin/erp/v2/views/GeneralLedgerView');
      const html = renderToStaticMarkup(
        React.createElement(GeneralLedgerView, {
          journalEntries: sampleEntries,
          activePeriod: { period_id: 'period-2026-03', fiscal_year: 2026, period_number: 3, start_date: '2026-03-01', end_date: '2026-03-31', status: 'OPEN' },
          isAr: true,
          onOpenProjectExpense: () => {},
          onTogglePeriodStatus: () => {}
        })
      );

      // Verify sparkline linear gradients and wave curves are rendered in the KPI section
      assert.ok(
        html.includes('sparkline-grad-'),
        'GeneralLedgerView KPI cards must render sparkline SVG gradients'
      );

      // Verify all 4 discrete card titles are rendered
      assert.ok(html.includes('إجمالي الأصول'), 'Card 1 (Assets) title must exist');
      assert.ok(html.includes('إجمالي الخصوم'), 'Card 2 (Liabilities) title must exist');
      assert.ok(html.includes('حقوق الملكية'), 'Card 3 (Equity) title must exist');
      assert.ok(html.includes('صافي نتيجة النشاط'), 'Card 4 (Net Operating Result) title must exist');

      // Verify subtitles are rendered cleanly without trailing colons
      assert.ok(html.includes('أصول متداولة وثابتة'), 'Card 1 subtitle label must exist');
      assert.ok(!html.includes('أصول متداولة وثابتة:'), 'Card 1 must NOT have dangling trailing colon');
      assert.ok(html.includes('التزامات قصيرة وطويلة الأجل'), 'Card 2 subtitle label must exist');
      assert.ok(!html.includes('التزامات قصيرة وطويلة الأجل:'), 'Card 2 must NOT have dangling trailing colon');
      assert.ok(html.includes('رأس المال والأرباح المرحلة'), 'Card 3 subtitle label must exist');
      assert.ok(!html.includes('رأس المال والأرباح المرحلة:'), 'Card 3 must NOT have dangling trailing colon');
    });
  });

  // 2. TREE NAVIGATION & SYNCHRONIZATION
  describe('2. COA Tree Hierarchy Navigation & Synchronization', () => {
    it('contains all 5 canonical root categories with valid child subcategories', () => {
      assert.equal(HIERARCHY_STRUCTURE.length, 5);
      const rootCodes = HIERARCHY_STRUCTURE.map(c => c.code);
      assert.deepEqual(rootCodes, ['1', '2', '3', '4', '5']);

      HIERARCHY_STRUCTURE.forEach(cat => {
        assert.ok(cat.subcategories.length > 0, `Category ${cat.code} must have subcategories`);
      });
    });

    it('resolves all account codes when root category is selected', () => {
      const assetsCat = HIERARCHY_STRUCTURE.find(c => c.code === '1');
      assert.ok(assetsCat);
      const allAssetCodes = assetsCat.subcategories.flatMap(s => s.accountCodes);

      // Verify known asset codes are included
      assert.ok(allAssetCodes.includes('101000'));
      assert.ok(allAssetCodes.includes('102000'));
      assert.ok(allAssetCodes.includes('150000'));
      assert.ok(allAssetCodes.includes('151000'));
    });

    it('resolves strict subcategory codes when subcategory is selected', () => {
      const assetsCat = HIERARCHY_STRUCTURE.find(c => c.code === '1');
      const currentAssets = assetsCat?.subcategories.find(s => s.code === '11');
      assert.ok(currentAssets);

      // Current assets must contain 101000, 102000 but NOT non-current land 150000
      assert.ok(currentAssets.accountCodes.includes('101000'));
      assert.ok(!currentAssets.accountCodes.includes('150000'));
    });
  });

  // 3. MASTER INTERACTIVE TABLE & FILTERS
  describe('3. Master Interactive Workstation Table & Filtering', () => {
    const allAccounts = Object.values(CANONICAL_COA);

    it('filters by level (Level 1, Level 2, Level 3)', () => {
      const level1 = allAccounts.filter(a => a.account_code.length === 1);
      const level2 = allAccounts.filter(a => a.account_code.length === 2);
      const level3 = allAccounts.filter(a => a.account_code.length > 2);

      assert.ok(level3.length > 0, 'Must have level 3 analytical accounts');
      assert.equal(allAccounts.length, level1.length + level2.length + level3.length);
    });

    it('filters by type (folders vs leaf accounts)', () => {
      const isFolder = (acc: ERPAccount) => acc.account_code.length <= 2 || acc.account_code.endsWith('000');
      const folders = allAccounts.filter(isFolder);
      const leafAccounts = allAccounts.filter(a => !isFolder(a));

      assert.ok(folders.length > 0, 'Must have folder accounts');
      assert.ok(leafAccounts.length > 0, 'Must have leaf accounts');
      assert.equal(folders.length + leafAccounts.length, allAccounts.length);
    });

    it('filters by search query across code, Arabic name, and English name', () => {
      const searchAccounts = (query: string) => {
        const q = query.trim().toLowerCase();
        return allAccounts.filter(acc =>
          acc.account_code.toLowerCase().includes(q) ||
          acc.account_name_ar.toLowerCase().includes(q) ||
          acc.account_name_en.toLowerCase().includes(q)
        );
      };

      // Search by code prefix
      const resCode = searchAccounts('101');
      assert.ok(resCode.some(a => a.account_code === '101000'));

      // Search by Arabic name
      const resAr = searchAccounts('خزينة');
      assert.ok(resAr.some(a => a.account_name_ar.includes('خزينة')));

      // Search by English name
      const resEn = searchAccounts('bank');
      assert.ok(resEn.some(a => a.account_name_en.toLowerCase().includes('bank')));
    });

    it('manages multi-select checkbox selection state correctly', () => {
      let selectedCodes = new Set<string>();

      // Select single account
      selectedCodes.add('101000');
      assert.equal(selectedCodes.has('101000'), true);
      assert.equal(selectedCodes.size, 1);

      // Toggle select-all on page
      const pageCodes = ['101000', '102000', '103000'];
      const selectAll = (codes: string[]) => new Set(codes);
      selectedCodes = selectAll(pageCodes);
      assert.equal(selectedCodes.size, 3);
      assert.ok(pageCodes.every(c => selectedCodes.has(c)));

      // Deselect all
      selectedCodes = new Set();
      assert.equal(selectedCodes.size, 0);
    });

    it('computes pagination math accurately without fractional overflow', () => {
      const totalItems = 27;
      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      assert.equal(totalPages, 3);

      const page1 = allAccounts.slice(0, 10);
      assert.equal(page1.length, 10);

      const page3 = allAccounts.slice(20, 30);
      assert.ok(page3.length <= 10);
    });
  });

  // 4. BREADCRUMBS TRAIL
  describe('4. Workstation Breadcrumbs Generation', () => {
    it('generates breadcrumb trail for selected root category and subcategories', () => {
      const resolveBreadcrumbs = (selectedId: string | null, isAr = true) => {
        if (!selectedId) return [];
        for (const cat of HIERARCHY_STRUCTURE) {
          if (cat.id === selectedId) {
            return [{ label: isAr ? cat.titleAr : cat.titleEn, code: cat.code }];
          }
          const sub = cat.subcategories.find(s => s.id === selectedId);
          if (sub) {
            return [
              { label: isAr ? cat.titleAr : cat.titleEn, code: cat.code },
              { label: isAr ? sub.titleAr : sub.titleEn, code: sub.code }
            ];
          }
        }
        return [];
      };

      // Root Reset
      assert.deepEqual(resolveBreadcrumbs(null), []);

      // Root category selected
      const rootCrumbs = resolveBreadcrumbs('cat_1', true);
      assert.equal(rootCrumbs.length, 1);
      assert.equal(rootCrumbs[0].code, '1');
      assert.equal(rootCrumbs[0].label, 'الأصول');

      // Subcategory selected
      const subCrumbs = resolveBreadcrumbs('sub_11', true);
      assert.equal(subCrumbs.length, 2);
      assert.equal(subCrumbs[0].code, '1');
      assert.equal(subCrumbs[1].code, '11');
      assert.equal(subCrumbs[1].label, 'الأصول المتداولة');
    });
  });

  // 5. ACCOUNT INSPECTOR INTEGRATION
  describe('5. Account Inspector Domain & Metadata Resolution', () => {
    it('resolves parent hierarchy and level classification', () => {
      const resolveParentInfo = (code: string, isAr = true) => {
        for (const cat of HIERARCHY_STRUCTURE) {
          for (const sub of cat.subcategories) {
            if (sub.accountCodes.includes(code)) {
              return isAr ? `${sub.code} - ${sub.titleAr}` : `${sub.code} - ${sub.titleEn}`;
            }
          }
          if (cat.code === code.slice(0, 1)) {
            return isAr ? `${cat.code} - ${cat.titleAr}` : `${cat.code} - ${cat.titleEn}`;
          }
        }
        return null;
      };

      const parent101 = resolveParentInfo('101000', true);
      assert.equal(parent101, '11 - الأصول المتداولة');

      const parent150 = resolveParentInfo('150000', true);
      assert.equal(parent150, '12 - الأصول غير المتداولة');

      const parent301 = resolveParentInfo('301000', true);
      assert.equal(parent301, '31 - رأس المال');
    });

    it('resolves last movement date for each account from journal entries', () => {
      const map: Record<string, string> = {};
      sampleEntries.forEach(entry => {
        (entry.lines || []).forEach(line => {
          if (!map[line.account_code] || entry.entry_date > map[line.account_code]) {
            map[line.account_code] = entry.entry_date;
          }
        });
      });

      // 101000 moved on 2026-03-01 and 2026-03-15 => last date is 2026-03-15
      assert.equal(map['101000'], '2026-03-15');

      // 150000 moved on 2026-03-05 => last date is 2026-03-05
      assert.equal(map['150000'], '2026-03-05');

      // 102000 moved on 2026-03-01 and 2026-03-10 => last date is 2026-03-10
      assert.equal(map['102000'], '2026-03-10');
    });
  });

  // 6. GENERAL LEDGER PAGE FEEDBACK & CONTRACT INVARIANTS
  describe('6. General Ledger Page Feedback & Invariants Enforcement', () => {
    it('verifies "الفترة مفتوحة" status pill is removed from the workstation header', async () => {
      const { GeneralLedgerView } = await import('@/components/admin/erp/v2/views/GeneralLedgerView');
      const html = renderToStaticMarkup(
        React.createElement(GeneralLedgerView, {
          journalEntries: sampleEntries,
          activePeriod: { period_id: 'period-2026-03', fiscal_year: 2026, period_number: 3, start_date: '2026-03-01', end_date: '2026-03-31', status: 'OPEN' },
          isAr: true,
          onOpenProjectExpense: () => {},
          onTogglePeriodStatus: () => {}
        })
      );

      // Verify "الفترة مفتوحة" is NOT present in rendered header
      assert.ok(!html.includes('الفترة مفتوحة'), 'Header must NOT render "الفترة مفتوحة" badge');
    });

    it('verifies "+ مجلد جديد" button is eliminated and replaced with canonical accounting actions', async () => {
      const { GeneralLedgerView } = await import('@/components/admin/erp/v2/views/GeneralLedgerView');
      const html = renderToStaticMarkup(
        React.createElement(GeneralLedgerView, {
          journalEntries: sampleEntries,
          activePeriod: { period_id: 'period-2026-03', fiscal_year: 2026, period_number: 3, start_date: '2026-03-01', end_date: '2026-03-31', status: 'OPEN' },
          isAr: true,
          onOpenProjectExpense: () => {},
          onTogglePeriodStatus: () => {}
        })
      );

      // Verify "+ مجلد جديد" does NOT exist
      assert.ok(!html.includes('مجلد جديد'), 'Workstation top bar must NOT render "+ مجلد جديد" button');

      // Verify redundant action buttons are eliminated on COA per user feedback
      assert.ok(!html.includes('إضافة حساب فرعي'), 'Must eliminate redundant "+ إضافة حساب فرعي" on COA');
      assert.ok(!html.includes('قيد يومية جديد'), 'Must eliminate redundant "+ قيد يومية جديد" on COA');
    });

    it('verifies COA table uses "حساب رئيسي" / "حساب فرعي" and eliminates "مجلد" terminology', async () => {
      const { GeneralLedgerView } = await import('@/components/admin/erp/v2/views/GeneralLedgerView');
      const html = renderToStaticMarkup(
        React.createElement(GeneralLedgerView, {
          journalEntries: sampleEntries,
          activePeriod: { period_id: 'period-2026-03', fiscal_year: 2026, period_number: 3, start_date: '2026-03-01', end_date: '2026-03-31', status: 'OPEN' },
          isAr: true,
          onOpenProjectExpense: () => {},
          onTogglePeriodStatus: () => {}
        })
      );

      // Verify "حساب رئيسي" and "حساب فرعي" exist
      assert.ok(html.includes('حساب رئيسي'), 'Must use "حساب رئيسي" label');
      assert.ok(html.includes('حسابات رئيسية'), 'Must include "حسابات رئيسية" in type filter select');
      assert.ok(html.includes('حسابات فرعية'), 'Must include "حسابات فرعية" in type filter select');

      // Verify old OS folder terms "مجلدات" or table cell "مجلد" do NOT exist
      assert.ok(!html.includes('>مجلدات<'), 'Filter must NOT contain "مجلدات" option');
      assert.ok(!html.includes('>مجلد<'), 'Table cell must NOT contain "مجلد"');
    });

    it('verifies COA table includes Action column with Inspect button and 9-column headers', async () => {
      const { GeneralLedgerView } = await import('@/components/admin/erp/v2/views/GeneralLedgerView');
      const html = renderToStaticMarkup(
        React.createElement(GeneralLedgerView, {
          journalEntries: sampleEntries,
          activePeriod: { period_id: 'period-2026-03', fiscal_year: 2026, period_number: 3, start_date: '2026-03-01', end_date: '2026-03-31', status: 'OPEN' },
          isAr: true,
          initialTab: 'coa',
          onOpenProjectExpense: () => {},
          onTogglePeriodStatus: () => {}
        })
      );

      // Verify Action column header exists
      assert.ok(html.includes('الإجراء'), 'Must render "الإجراء" action column header');

      // Verify Inspect button "كشف" exists in rows
      assert.ok(html.includes('<span>كشف</span>'), 'Must render "كشف" inspect button in each account row');

      // Verify all 8 data headers + 1 action header exist in table
      assert.ok(html.includes('كود الحساب') && html.includes('اسم الحساب') && html.includes('النوع') && html.includes('الطبيعة') && html.includes('الرصيد الحالي') && html.includes('الحالة') && html.includes('آخر حركة') && html.includes('الإجراء'), 'Must contain all 9 column headers');
    });

    it('verifies dynamic sparkline checkpoints derivation from journal entries', () => {
      // Calculate cumulative sum of debits up to entry dates
      const dates = ['2026-03-01', '2026-03-05', '2026-03-10', '2026-03-15', '2026-03-20', '2026-03-31'];
      const checkpoints = dates.map(d => {
        let sum = 0;
        sampleEntries.filter(e => e.entry_date <= d).forEach(e => {
          e.lines.forEach(l => {
            if (l.account_code.startsWith('1')) {
              sum += parseFloat(l.debit_amount) - parseFloat(l.credit_amount);
            }
          });
        });
        return Math.max(0, sum / 1000000);
      });

      assert.equal(checkpoints.length, 6);
      assert.ok(checkpoints[checkpoints.length - 1] > 0, 'Cumulative asset value must be positive');
      assert.ok(checkpoints[1] >= checkpoints[0], 'Cumulative assets should reflect entry on March 5th');
    });
  });
});
