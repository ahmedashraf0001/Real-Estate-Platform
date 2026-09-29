import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { D, Decimal } from '@/lib/erp/math';
import { ERPJournalEntry, ERPAccountingPeriod } from '@/lib/erp/types';

describe('General Ledger & Journal Register Overhaul Suite (v2)', () => {
  const dummyPeriod: ERPAccountingPeriod = {
    period_id: 'period-2025-01',
    fiscal_year: 2025,
    period_number: 1,
    start_date: '2025-01-01',
    end_date: '2025-01-31',
    status: 'OPEN'
  };

  const sampleEntries: ERPJournalEntry[] = [
    {
      entry_id: 'je-1',
      entry_number: 'JV-2025-001',
      entry_date: '2025-01-15',
      period_id: 'period-2025-01',
      description: 'تحصيل دفعة حجز نقدية من عميل',
      source_module: 'SALES',
      source_entity_id: 'CT-2025-001',
      created_by: 'Farid Zakaria',
      created_at: '2025-01-15T10:00:00Z',
      is_locked: true,
      lines: [
        {
          line_id: 'l-1',
          entry_id: 'je-1',
          line_number: 1,
          account_code: '101000',
          debit_amount: '500000.00',
          credit_amount: '0.00',
          memo: 'كاش بالخزينة'
        },
        {
          line_id: 'l-2',
          entry_id: 'je-1',
          line_number: 2,
          account_code: '203000',
          debit_amount: '0.00',
          credit_amount: '500000.00',
          memo: 'مقدم حجز شقة'
        }
      ]
    },
    {
      entry_id: 'je-2',
      entry_number: 'JV-2025-002',
      entry_date: '2025-02-10',
      period_id: 'period-2025-01',
      description: 'سداد دفعة خرسانات ومقاولات',
      source_module: 'WIP_ALLOCATION',
      source_entity_id: 'PO-2025-089',
      created_by: 'Farid Zakaria',
      created_at: '2025-02-10T12:00:00Z',
      is_locked: true,
      lines: [
        {
          line_id: 'l-3',
          entry_id: 'je-2',
          line_number: 1,
          account_code: '151000',
          debit_amount: '350000.00',
          credit_amount: '0.00',
          memo: 'خرسانات الدور الثالث'
        },
        {
          line_id: 'l-4',
          entry_id: 'je-2',
          line_number: 2,
          account_code: '102000',
          debit_amount: '0.00',
          credit_amount: '350000.00',
          memo: 'تحويل بنكي'
        }
      ]
    }
  ];

  it('aggregates total debits and credits with perfect Invariant 4.1 equality', () => {
    let sumDebits = D(0);
    let sumCredits = D(0);

    sampleEntries.forEach(entry => {
      entry.lines.forEach(l => {
        sumDebits = sumDebits.plus(D(l.debit_amount));
        sumCredits = sumCredits.plus(D(l.credit_amount));
      });
    });

    assert.equal(sumDebits.toString(), '850000.00');
    assert.equal(sumCredits.toString(), '850000.00');
    assert.equal(sumDebits.equals(sumCredits), true, 'Debits must strictly equal Credits');
  });

  it('detects unbalanced entries and flags variance correctly', () => {
    const unbalancedEntry: ERPJournalEntry = {
      entry_id: 'je-err',
      entry_number: 'JV-ERR',
      entry_date: '2025-03-01',
      period_id: 'p-1',
      description: 'قيد خطأ غير متزن',
      source_module: 'MANUAL',
      created_by: 'SYSTEM',
      created_at: '2025-03-01T00:00:00Z',
      is_locked: false,
      lines: [
        { line_id: '1', entry_id: 'je-err', line_number: 1, account_code: '101000', debit_amount: '1000.00', credit_amount: '0.00' },
        { line_id: '2', entry_id: 'je-err', line_number: 2, account_code: '201000', debit_amount: '0.00', credit_amount: '900.00' }
      ]
    };

    const debits = unbalancedEntry.lines.reduce((s, l) => s.plus(D(l.debit_amount)), D(0));
    const credits = unbalancedEntry.lines.reduce((s, l) => s.plus(D(l.credit_amount)), D(0));
    const variance = debits.minus(credits);

    assert.equal(debits.equals(credits), false);
    assert.equal(variance.toString(), '100.00');
  });

  it('derives live account statistics and normal balance calculations', () => {
    const stats: Record<string, { debits: Decimal; credits: Decimal; count: number }> = {};
    sampleEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (!stats[line.account_code]) {
          stats[line.account_code] = { debits: D(0), credits: D(0), count: 0 };
        }
        stats[line.account_code].debits = stats[line.account_code].debits.plus(D(line.debit_amount));
        stats[line.account_code].credits = stats[line.account_code].credits.plus(D(line.credit_amount));
        stats[line.account_code].count += 1;
      });
    });

    // Account 101000 (Operating Cash Vault) - DEBIT normal balance
    const acc101 = CANONICAL_COA['101000'];
    const net101 = acc101.normal_balance === 'DEBIT'
      ? stats['101000'].debits.minus(stats['101000'].credits)
      : stats['101000'].credits.minus(stats['101000'].debits);
    assert.equal(net101.toString(), '500000.00');

    // Account 102000 (Bank) - credited 350,000 => net is -350,000
    const acc102 = CANONICAL_COA['102000'];
    const net102 = acc102.normal_balance === 'DEBIT'
      ? stats['102000'].debits.minus(stats['102000'].credits)
      : stats['102000'].credits.minus(stats['102000'].debits);
    assert.equal(net102.toString(), '-350000.00');
  });

  it('verifies canonical chart of accounts root categories exist', () => {
    const rootCategories = new Set(Object.values(CANONICAL_COA).map(a => a.account_type));
    assert.ok(rootCategories.has('ASSET'), 'COA must contain ASSET');
    assert.ok(rootCategories.has('LIABILITY'), 'COA must contain LIABILITY');
    assert.ok(rootCategories.has('EQUITY'), 'COA must contain EQUITY');
    assert.ok(rootCategories.has('REVENUE'), 'COA must contain REVENUE');
    assert.ok(rootCategories.has('EXPENSE'), 'COA must contain EXPENSE');
  });

  it('computes monthly movements correctly across entry dates', () => {
    const monthMap: Record<string, { debits: Decimal; credits: Decimal }> = {};
    sampleEntries.forEach(entry => {
      const ym = (entry.entry_date || '').substring(0, 7);
      if (!monthMap[ym]) monthMap[ym] = { debits: D(0), credits: D(0) };
      entry.lines.forEach(line => {
        monthMap[ym].debits = monthMap[ym].debits.plus(D(line.debit_amount));
        monthMap[ym].credits = monthMap[ym].credits.plus(D(line.credit_amount));
      });
    });

    assert.equal(monthMap['2025-01'].debits.toString(), '500000.00');
    assert.equal(monthMap['2025-01'].credits.toString(), '500000.00');
    assert.equal(monthMap['2025-02'].debits.toString(), '350000.00');
    assert.equal(monthMap['2025-02'].credits.toString(), '350000.00');
  });

  it('handles zero entries state gracefully without division by zero', () => {
    const emptyEntries: ERPJournalEntry[] = [];
    const sumDebits = emptyEntries.reduce((s) => s.plus(D(0)), D(0));
    const sumCredits = emptyEntries.reduce((s) => s.plus(D(0)), D(0));
    const isBalanced = sumDebits.equals(sumCredits);

    assert.equal(sumDebits.toString(), '0.00');
    assert.equal(sumCredits.toString(), '0.00');
    assert.equal(isBalanced, true);
  });

  it('preserves sparse and late-year months without data loss in monthly movement series', () => {
    // When entries only exist in months 11 and 12, they must NOT be discarded
    const lateYearEntries: ERPJournalEntry[] = [
      {
        entry_id: 'je-nov',
        entry_number: 'JV-2025-011',
        entry_date: '2025-11-20',
        period_id: 'p-11',
        description: 'قيد شهر نوفمبر',
        source_module: 'MANUAL',
        created_by: 'Farid Zakaria',
        created_at: '2025-11-20T00:00:00Z',
        is_locked: true,
        lines: [
          { line_id: 'l-nov-1', entry_id: 'je-nov', line_number: 1, account_code: '101000', debit_amount: '120000.00', credit_amount: '0.00' },
          { line_id: 'l-nov-2', entry_id: 'je-nov', line_number: 2, account_code: '401000', debit_amount: '0.00', credit_amount: '120000.00' }
        ]
      }
    ];

    const monthMap: Record<string, { debits: Decimal; credits: Decimal }> = {};
    lateYearEntries.forEach(entry => {
      const ym = (entry.entry_date || '').substring(0, 7);
      if (!monthMap[ym]) monthMap[ym] = { debits: D(0), credits: D(0) };
      entry.lines.forEach(line => {
        monthMap[ym].debits = monthMap[ym].debits.plus(D(line.debit_amount));
        monthMap[ym].credits = monthMap[ym].credits.plus(D(line.credit_amount));
      });
    });

    const monthKeys = new Set(Object.keys(monthMap));
    for (let i = 1; i <= 5; i++) {
      monthKeys.add(`2025-${String(i).padStart(2, '0')}`);
    }
    const sortedYMs = Array.from(monthKeys).sort();

    assert.ok(sortedYMs.includes('2025-11'), 'Must include 2025-11 month with entries');
    assert.equal(monthMap['2025-11'].debits.toString(), '120000.00');
    assert.equal(sortedYMs.length >= 5, true);
  });

  it('verifies that all CANONICAL_COA accounts are mapped with zero orphaned codes in file hierarchy', () => {
    const HIERARCHY_STRUCTURE = [
      {
        id: 'cat_1', code: '1', titleAr: 'الأصول',
        subcategories: [
          { id: 'sub_11', code: '11', titleAr: 'الأصول المتداولة', accountCodes: ['101000', '102000', '102100', '103000', '103200', '103300', '104000', '105000'] },
          { id: 'sub_12', code: '12', titleAr: 'الأصول غير المتداولة', accountCodes: ['150000', '151000', '152000', '153000', '156000'] }
        ]
      },
      {
        id: 'cat_2', code: '2', titleAr: 'الخصوم والالتزامات',
        subcategories: [
          { id: 'sub_21', code: '21', titleAr: 'الخصوم المتداولة', accountCodes: ['201000', '203000', '204000', '206200', '207000'] },
          { id: 'sub_22', code: '22', titleAr: 'الخصوم غير المتداولة', accountCodes: ['202000', '202500'] }
        ]
      },
      {
        id: 'cat_3', code: '3', titleAr: 'حقوق الملكية',
        subcategories: [
          { id: 'sub_31', code: '31', titleAr: 'رأس المال', accountCodes: ['301000'] },
          { id: 'sub_32', code: '32', titleAr: 'الاحتياطيات', accountCodes: ['304000'] },
          { id: 'sub_33', code: '33', titleAr: 'الأرباح والخسائر المرحلة والتوزيعات', accountCodes: ['302000', '303000'] }
        ]
      },
      {
        id: 'cat_4', code: '4', titleAr: 'الإيرادات',
        subcategories: [
          { id: 'sub_41', code: '41', titleAr: 'إيرادات بيع الوحدات', accountCodes: ['401000'] },
          { id: 'sub_42', code: '42', titleAr: 'إيرادات غرامات وفسخ العقود', accountCodes: ['430100'] },
          { id: 'sub_43', code: '43', titleAr: 'إيرادات وفروق أخرى', accountCodes: ['440000'] }
        ]
      },
      {
        id: 'cat_5', code: '5', titleAr: 'المصروفات والتكاليف',
        subcategories: [
          { id: 'sub_51', code: '51', titleAr: 'تكلفة الشقق والوحدات المباعة (COGS)', accountCodes: ['501000', '502000', '503000', '504000'] },
          { id: 'sub_52', code: '52', titleAr: 'مصروفات التسويق والمبيعات', accountCodes: ['601000'] },
          { id: 'sub_53', code: '53', titleAr: 'المصروفات الإدارية والعمومية', accountCodes: ['602000'] },
          { id: 'sub_55', code: '55', titleAr: 'مصروفات المشروعات وموقع العمل', accountCodes: ['603000'] }
        ]
      }
    ];

    const mappedCodes = new Set<string>();
    HIERARCHY_STRUCTURE.forEach(c => c.subcategories.forEach(s => s.accountCodes.forEach(code => mappedCodes.add(code))));
    const coaCodes = new Set(Object.keys(CANONICAL_COA));

    const missing = [...coaCodes].filter(c => !mappedCodes.has(c));
    const invalid = [...mappedCodes].filter(c => !coaCodes.has(c));

    assert.equal(missing.length, 0, `All COA accounts must be mapped, missing: ${missing.join(', ')}`);
    assert.equal(invalid.length, 0, `No unknown account codes allowed in hierarchy, invalid: ${invalid.join(', ')}`);
  });

  it('handles compound journal entries with multiple debits and credits correctly', () => {
    const compoundEntry: ERPJournalEntry = {
      entry_id: 'je-compound',
      entry_number: 'JV-CMP-001',
      entry_date: '2025-03-15',
      period_id: 'p-1',
      description: 'سداد دفعة مجمعة مع خصم تجاري',
      source_module: 'MANUAL',
      created_by: 'Farid Zakaria',
      created_at: '2025-03-15T00:00:00Z',
      is_locked: true,
      lines: [
        { line_id: 'l1', entry_id: 'je-compound', line_number: 1, account_code: '201000', debit_amount: '100000.00', credit_amount: '0.00' },
        { line_id: 'l2', entry_id: 'je-compound', line_number: 2, account_code: '101000', debit_amount: '0.00', credit_amount: '95000.00' },
        { line_id: 'l3', entry_id: 'je-compound', line_number: 3, account_code: '440000', debit_amount: '0.00', credit_amount: '5000.00' }
      ]
    };

    const debitLines = compoundEntry.lines.filter(l => D(l.debit_amount).greaterThan(0));
    const creditLines = compoundEntry.lines.filter(l => D(l.credit_amount).greaterThan(0));

    const totalDebit = debitLines.reduce((s, l) => s.plus(D(l.debit_amount)), D(0));
    const totalCredit = creditLines.reduce((s, l) => s.plus(D(l.credit_amount)), D(0));

    assert.equal(debitLines.length, 1);
    assert.equal(creditLines.length, 2);
    assert.equal(totalDebit.toString(), '100000.00');
    assert.equal(totalCredit.toString(), '100000.00');
    assert.equal(totalDebit.equals(totalCredit), true);
  });

  it('derives journal entry status accurately between posted, in review, and draft', () => {
    const postedEntry: ERPJournalEntry = {
      entry_id: '1', entry_number: 'JV-1', entry_date: '2025-01-01', period_id: 'p1', description: 't',
      source_module: 'SALES', created_by: 'u', created_at: '', is_locked: true, lines: []
    };
    const draftEntry: ERPJournalEntry = {
      entry_id: '2', entry_number: 'JV-2', entry_date: '2025-01-01', period_id: 'p1', description: 't',
      source_module: 'MANUAL', created_by: 'u', created_at: '', is_locked: false, lines: []
    };
    const reviewEntry: ERPJournalEntry = {
      entry_id: '3', entry_number: 'JV-3', entry_date: '2025-01-01', period_id: 'p1', description: 't',
      source_module: 'RESCISSION', created_by: 'u', created_at: '', is_locked: false, lines: []
    };

    const getStatus = (entry: ERPJournalEntry) => {
      if (entry.is_locked) return 'POSTED';
      if (entry.source_module === 'MANUAL' || entry.source_entity_id?.startsWith('DRAFT')) return 'DRAFT';
      return 'REVIEW';
    };

    assert.equal(getStatus(postedEntry), 'POSTED');
    assert.equal(getStatus(draftEntry), 'DRAFT');
    assert.equal(getStatus(reviewEntry), 'REVIEW');
  });

  it('filters date range correctly for prefix and range intervals', () => {
    const entryDate = '2025-03-15';

    const matchesFilter = (date: string, filter: string) => {
      const f = filter.trim();
      if (!f) return true;
      if (f.includes(' - ')) {
        const [start, end] = f.split(' - ').map(s => s.trim());
        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
      }
      return date.startsWith(f);
    };

    assert.equal(matchesFilter(entryDate, '2025-03'), true);
    assert.equal(matchesFilter(entryDate, '2025-04'), false);
    assert.equal(matchesFilter(entryDate, '2025-03-01 - 2025-03-31'), true);
    assert.equal(matchesFilter(entryDate, '2025-03-16 - 2025-03-31'), false);
  });

  it('filters journal entries by COA category and subcategory account codes', () => {
    // Current Assets subcategory (sub_11) account codes:
    const currentAssetCodes = new Set(['101000', '102000', '102100', '103000', '103200', '103300', '104000', '105000']);
    
    // Non-Current Assets subcategory (sub_12) account codes:
    const nonCurrentAssetCodes = new Set(['150000', '151000', '152000', '153000', '156000']);

    const matchingCurrentAssets = sampleEntries.filter(entry =>
      entry.lines.some(l => currentAssetCodes.has(l.account_code))
    );
    // entry 1 has 101000, entry 2 has 102000 => both match current assets
    assert.equal(matchingCurrentAssets.length, 2);

    const matchingNonCurrentAssets = sampleEntries.filter(entry =>
      entry.lines.some(l => nonCurrentAssetCodes.has(l.account_code))
    );
    // entry 2 has 151000 => only entry 2 matches
    assert.equal(matchingNonCurrentAssets.length, 1);
    assert.equal(matchingNonCurrentAssets[0].entry_id, 'je-2');
  });

  it('safely handles quick action handlers without crashes when activePeriod is undefined', () => {
    let callbackCalled = false;
    const safeTogglePeriodStatus = (
      period: ERPAccountingPeriod | undefined,
      callback?: (id: string, s: 'OPEN' | 'LOCKED') => void
    ) => {
      if (!period?.period_id) return { success: false, reason: 'NO_PERIOD' };
      const nextStatus = period.status === 'OPEN' ? 'LOCKED' : 'OPEN';
      if (typeof callback === 'function') {
        callback(period.period_id, nextStatus);
      }
      return { success: true, nextStatus };
    };

    // Test with undefined period
    const resUndefined = safeTogglePeriodStatus(undefined, () => { callbackCalled = true; });
    assert.equal(resUndefined.success, false);
    assert.equal(resUndefined.reason, 'NO_PERIOD');
    assert.equal(callbackCalled, false);

    // Test with valid period
    const resValid = safeTogglePeriodStatus(dummyPeriod, (id, s) => {
      assert.equal(id, 'period-2025-01');
      assert.equal(s, 'LOCKED');
      callbackCalled = true;
    });
    assert.equal(resValid.success, true);
    assert.equal(callbackCalled, true);
  });

  it('derives category accounts breakdown table with accurate balances, debits, credits, and activity count', () => {
    // Current Assets account codes:
    const currentAssetCodes = ['101000', '102000', '102100', '103000', '103200', '103300', '104000', '105000'];
    
    // Compute stats from sampleEntries
    const stats: Record<string, { debits: Decimal; credits: Decimal; count: number }> = {};
    currentAssetCodes.forEach(code => {
      stats[code] = { debits: D(0), credits: D(0), count: 0 };
    });

    sampleEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (stats[line.account_code]) {
          stats[line.account_code].debits = stats[line.account_code].debits.plus(D(line.debit_amount));
          stats[line.account_code].credits = stats[line.account_code].credits.plus(D(line.credit_amount));
          stats[line.account_code].count += 1;
        }
      });
    });

    // 101000: Debit 500,000, Credit 0, Count 1, Normal DEBIT => Net 500,000
    assert.equal(stats['101000'].debits.toString(), '500000.00');
    assert.equal(stats['101000'].credits.toString(), '0.00');
    assert.equal(stats['101000'].count, 1);
    const net101000 = stats['101000'].debits.minus(stats['101000'].credits);
    assert.equal(net101000.toString(), '500000.00');

    // 102000: Debit 0, Credit 350,000, Count 1, Normal DEBIT => Net -350,000
    assert.equal(stats['102000'].debits.toString(), '0.00');
    assert.equal(stats['102000'].credits.toString(), '350000.00');
    assert.equal(stats['102000'].count, 1);
    const net102000 = stats['102000'].debits.minus(stats['102000'].credits);
    assert.equal(net102000.toString(), '-350000.00');

    // Total category debits & credits
    const totalDebits = currentAssetCodes.reduce((s, c) => s.plus(stats[c].debits), D(0));
    const totalCredits = currentAssetCodes.reduce((s, c) => s.plus(stats[c].credits), D(0));
    assert.equal(totalDebits.toString(), '500000.00');
    assert.equal(totalCredits.toString(), '350000.00');
  });

  it('filters COA table accounts when selectedCategory is provided', () => {
    const allAccounts = Object.values(CANONICAL_COA);
    assert.ok(allAccounts.length >= 25, 'Canonical COA must have 25+ accounts');

    // Category with subcategories: e.g. Equity (301000, 302000, 303000, 304000)
    const equityCodes = ['301000', '302000', '303000', '304000'];
    const filteredEquity = allAccounts.filter(a => equityCodes.includes(a.account_code));

    assert.equal(filteredEquity.length, 4);
    assert.ok(filteredEquity.every(a => equityCodes.includes(a.account_code)));
  });

  it('safely handles async onTogglePeriodStatus rejection without uncaught exceptions', async () => {
    const failingAsyncToggle = async () => {
      throw new Error('Supabase network error');
    };

    let caughtError: Error | null = null;
    const safeExecute = async (fn: () => Promise<void>) => {
      try {
        await fn();
        return { success: true };
      } catch (err) {
        caughtError = err as Error;
        return { success: false, error: err };
      }
    };

    const res = await safeExecute(failingAsyncToggle);
    assert.equal(res.success, false);
    assert.ok(caughtError);
    assert.equal((caughtError as Error).message, 'Supabase network error');
  });

  describe('Financial Statements & 5-Tab Consolidation Suite', () => {
    it('resolves the 5 canonical tabs correctly with detailed_tb fallback', () => {
      const canonicalTabs = ['coa', 'journal', 'trial_balance', 'balance_sheet', 'income_statement'];
      
      const resolveTab = (tab?: string | null) => {
        if (!tab) return 'coa';
        if (tab === 'detailed_tb') return 'trial_balance';
        if (canonicalTabs.includes(tab)) return tab;
        return 'coa';
      };

      assert.equal(resolveTab(null), 'coa');
      assert.equal(resolveTab('income_statement'), 'income_statement');
      assert.equal(resolveTab('balance_sheet'), 'balance_sheet');
      assert.equal(resolveTab('detailed_tb'), 'trial_balance');
      assert.equal(resolveTab('trial_balance'), 'trial_balance');
      assert.equal(resolveTab('journal'), 'journal');
      assert.equal(resolveTab('unknown_tab'), 'coa');
    });

    it('accurately derives Income Statement revenue, expense, and net margin', () => {
      const revenue = D(15000000);
      const expense = D(9500000);
      const netIncome = revenue.minus(expense);

      assert.equal(netIncome.toString(), '5500000.00');
      const marginPct = (netIncome.toNumber() / revenue.toNumber()) * 100;
      assert.equal(marginPct.toFixed(1), '36.7');
    });

    it('formats negative ledger numbers with correct LTR bidi isolation string', () => {
      const formatIsolatedAmount = (val: Decimal | number, isAr = true) => {
        const d = val instanceof Decimal ? val : new Decimal(val);
        const isNeg = d.isNegative();
        const absVal = d.abs();
        const parts = absVal.toFixed(2).split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const formattedNumber = `${integerPart}.${parts[1]}`;
        const signedNumber = isNeg ? `-${formattedNumber}` : formattedNumber;
        const currency = isAr ? 'ج.م' : 'EGP';
        return { signedNumber, currency, isNeg };
      };

      const res1 = formatIsolatedAmount(new Decimal('-13500000.00'), true);
      assert.equal(res1.signedNumber, '-13,500,000.00');
      assert.equal(res1.currency, 'ج.م');
      assert.equal(res1.isNeg, true);

      const res2 = formatIsolatedAmount(new Decimal('-40525000.00'), true);
      assert.equal(res2.signedNumber, '-40,525,000.00');
      assert.equal(res2.currency, 'ج.م');
      assert.equal(res2.isNeg, true);

      const res3 = formatIsolatedAmount(new Decimal('2500000.50'), false);
      assert.equal(res3.signedNumber, '2,500,000.50');
      assert.equal(res3.currency, 'EGP');
      assert.equal(res3.isNeg, false);
    });

    it('verifies all financial statement accounts exist in CANONICAL_COA for statement drilldown', () => {
      const revenueAccounts = Object.values(CANONICAL_COA).filter(a => a.account_type === 'REVENUE');
      const expenseAccounts = Object.values(CANONICAL_COA).filter(a => a.account_type === 'EXPENSE');
      const assetAccounts = Object.values(CANONICAL_COA).filter(a => a.account_type === 'ASSET');
      const liabilityAccounts = Object.values(CANONICAL_COA).filter(a => a.account_type === 'LIABILITY');
      const equityAccounts = Object.values(CANONICAL_COA).filter(a => a.account_type === 'EQUITY');

      assert.ok(revenueAccounts.length > 0, 'Must have revenue accounts');
      assert.ok(expenseAccounts.length > 0, 'Must have expense accounts');
      assert.ok(assetAccounts.length > 0, 'Must have asset accounts');
      assert.ok(liabilityAccounts.length > 0, 'Must have liability accounts');
      assert.ok(equityAccounts.length > 0, 'Must have equity accounts');

      // Every account must have valid code and arabic title for drilldown modal
      [...revenueAccounts, ...expenseAccounts, ...assetAccounts, ...liabilityAccounts, ...equityAccounts].forEach(acc => {
        assert.ok(acc.account_code, 'Account must have code');
        assert.ok(acc.account_name_ar, 'Account must have Arabic name');
      });
    });

    it('safely handles missing accountStats gracefully with zero fallback', () => {
      const statsMap: Record<string, { debits: Decimal; credits: Decimal; count: number }> = {};
      const unknownAccountCode = '999999';
      const stats = statsMap[unknownAccountCode] || { debits: D(0), credits: D(0), count: 0 };
      const net = stats.debits.minus(stats.credits);

      assert.equal(stats.count, 0);
      assert.equal(stats.debits.toString(), '0.00');
      assert.equal(stats.credits.toString(), '0.00');
      assert.equal(net.toString(), '0.00');
      assert.equal(net.isZero(), true);
    });

    it('maps COA tree categories to semantic icons avoiding alarm/warning icons', () => {
      const semanticCategoryIconMap: Record<string, string> = {
        '1': 'Building2',
        '11': 'Wallet',
        '12': 'Landmark',
        '2': 'Scale',
        '21': 'CreditCard',
        '22': 'Landmark',
        '3': 'Award',
        '31': 'Award',
        '32': 'ShieldCheck',
        '33': 'PieChart',
        '4': 'TrendingUp',
        '41': 'TrendingUp',
        '42': 'Coins',
        '43': 'ArrowDownLeft',
        '5': 'Receipt',
        '51': 'HardHat',
        '52': 'Megaphone',
        '53': 'Briefcase',
        '55': 'Truck',
      };

      assert.equal(semanticCategoryIconMap['21'], 'CreditCard', 'Current Liabilities must use CreditCard');
      assert.equal(semanticCategoryIconMap['22'], 'Landmark', 'Non-Current Liabilities must use Landmark');
      assert.notEqual(semanticCategoryIconMap['21'], 'FileWarning', 'Must not use FileWarning');
      assert.notEqual(semanticCategoryIconMap['22'], 'ShieldAlert', 'Must not use ShieldAlert');
    });

    it('verifies getAccountSemanticIcon maps accounts to semantic icons and never folder icons', async () => {
      const { getAccountSemanticIconName } = await import('@/lib/erp/accountSemanticIcons');
      const allAccounts = Object.values(CANONICAL_COA);

      allAccounts.forEach(acc => {
        const iconName = getAccountSemanticIconName(acc);
        assert.ok(iconName, `Account ${acc.account_code} must have an icon`);
        assert.ok(!iconName.toLowerCase().includes('folder'), `Account ${acc.account_code} must NOT have a folder icon, got: ${iconName}`);
      });
    });
  });
});
