'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Plus, 
  BookOpen, 
  Lock, 
  Unlock, 
  Search, 
  Scale, 
  FileText, 
  Table, 
  LayoutGrid, 
  ShieldCheck, 
  Printer, 
  FileSpreadsheet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PieChart, 
  BarChart3, 
  TrendingUp, 
  Layers, 
  X, 
  Building2, 
  Wallet, 
  Home, 
  Eye,
  Receipt,
  Filter
} from 'lucide-react';
import { getAccountSemanticIcon } from '@/lib/erp/accountSemanticIcons';
import { 
  ERPAccount, 
  ERPJournalEntry, 
  ERPAccountingPeriod, 
  ERPContract 
} from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { D, Decimal } from '@/lib/erp/math';
import { getAvailableCash, getConstructionWIP } from '@/lib/erp/canonicalMetrics';
import { JournalEntryPreview, localizeJournalDescription } from '@/components/erp/JournalEntryPreview';
import { AccountLedgerModal } from '../../AccountLedgerModal';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard, ZFKpiGrid } from '../ZFKpiCard';
import type { COACategorySelection } from './COAFileExplorer';
import { HIERARCHY_STRUCTURE } from '@/lib/erp/coaHierarchy';
import { ERPApexChart } from '../charts/ERPApexChart';
import { ZFPrintDocumentLayout } from '../common/ZFPrintDocumentLayout';
import { LiveERPDataset } from '@/lib/erp/supabaseService';
import { toast } from 'sonner';
import { useERPWorkstation } from '../../context/ERPWorkstationContext';
import { GeneralLedgerSideWidgets } from './GeneralLedgerSideWidgets';
import { BalanceSheetAnalyticsView } from './ledger/BalanceSheetAnalyticsView';
import { IncomeStatementAnalyticsView } from './ledger/IncomeStatementAnalyticsView';
import css from './GeneralLedgerView.module.css';

import { ERPLedgerAmount, ERPLedgerAmountProps } from '../common/ERPLedgerAmount';

export { ERPLedgerAmount };
export type { ERPLedgerAmountProps };

export interface GeneralLedgerViewProps {
  journalEntries: ERPJournalEntry[];
  activePeriod: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  isAr?: boolean;
  isMutating?: boolean;
  initialTab?: string;
  contracts?: ERPContract[];
  properties?: Property[];
  dataset?: LiveERPDataset;
  onExportExcel?: () => void | Promise<void>;
  onOpenProjectExpense: () => void;
  onTogglePeriodStatus: (periodId: string, newStatus: 'OPEN' | 'LOCKED') => void | Promise<void>;
  onCloseFiscalYear?: (year: number) => void | Promise<void>;
}

type LedgerMainTab = 
  | 'journal' 
  | 'coa' 
  | 'trial_balance' 
  | 'detailed_tb' 
  | 'balance_sheet' 
  | 'income_statement';

const resolveLedgerTab = (tab: string): LedgerMainTab => {
  switch (tab) {
    case 'coa':
    case 'trial_balance':
    case 'detailed_tb':
    case 'balance_sheet':
    case 'income_statement':
      return tab;
    default:
      return 'journal';
  }
};

const getAccountRowIcon = (acc: ERPAccount) => {
  return getAccountSemanticIcon(acc, { size: 15 });
};

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({
  journalEntries,
  activePeriod,
  periods,
  isAr = true,
  isMutating = false,
  initialTab = 'coa',
  contracts = [],
  properties = [],
  dataset,
  onExportExcel,
  onOpenProjectExpense,
  onTogglePeriodStatus,
  onCloseFiscalYear
}) => {
  // Available Fiscal Periods
  const availablePeriods = useMemo(() => {
    if (periods && periods.length > 0) return periods;
    if (dataset?.periods && dataset.periods.length > 0) return dataset.periods;
    return [activePeriod];
  }, [periods, dataset?.periods, activePeriod]);

  const [selectedPeriod, setSelectedPeriod] = useState<ERPAccountingPeriod>(activePeriod);
  const effectiveSelectedPeriod = useMemo(() => {
    return availablePeriods.find(p => p.period_id === selectedPeriod.period_id) || activePeriod;
  }, [availablePeriods, selectedPeriod.period_id, activePeriod]);

  // Main Tab State
  const [activeTab, setActiveTab] = useState<LedgerMainTab>(() => resolveLedgerTab(initialTab));
  const [lastInitialTab, setLastInitialTab] = useState(initialTab);
  if (initialTab !== lastInitialTab) {
    setLastInitialTab(initialTab);
    setActiveTab(resolveLedgerTab(initialTab));
  }

  const handleTabChange = useCallback((tab: LedgerMainTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('sub', tab);
        window.history.replaceState(null, '', url.toString());
      } catch {
        // Safe fallback if URL parsing is restricted
      }
    }
  }, []);

  let erpContext: ReturnType<typeof useERPWorkstation> | undefined;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    erpContext = useERPWorkstation();
  } catch {
    // Outside workstation context
  }
  const activePreset = erpContext?.activePreset;
  const currentAccent = activePreset?.accent || '#2563eb';
  type MovementGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';
  const [movementGranularity, setMovementGranularity] = useState<MovementGranularity>('monthly');
  const journalUsers = useMemo(
    () => Array.from(new Set(journalEntries.map(entry => entry.created_by).filter((user): user is string => Boolean(user)))).sort(),
    [journalEntries]
  );

  const handleOpenExpense = useCallback(() => {
    onOpenProjectExpense();
  }, [onOpenProjectExpense]);

  const handleAddAccount = useCallback(() => {
    toast.info(isAr ? 'إضافة حساب فرعي جديد في دليل الحسابات' : 'Add new sub-account in chart of accounts');
  }, [isAr]);

  // Journal Entries Filters & State (Declared before callbacks that use them)
  const [entriesViewMode, setEntriesViewMode] = useState<'table' | 'cards'>('table');
  const [entriesSearchQuery, setEntriesSearchQuery] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('');
  const [entriesSortBy, setEntriesSortBy] = useState<'date_desc' | 'date_asc' | 'entry_desc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [filterAccountInEntries, setFilterAccountInEntries] = useState<string | null>(null);
  const [selectedCategoryInTree, setSelectedCategoryInTree] = useState<COACategorySelection | null>(null);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string | null>(null);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals, Subview & Print State
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [trialBalanceViewMode, setTrialBalanceViewMode] = useState<'detailed' | 'printable'>('detailed');

  const handleTogglePeriodStatusSafe = useCallback(async (targetPeriodToToggle?: ERPAccountingPeriod) => {
    const period = targetPeriodToToggle || effectiveSelectedPeriod || activePeriod;
    if (!period?.period_id) {
      toast.error(isAr ? 'لا توجد فترة مالية نشطة محددة.' : 'No active fiscal period defined.');
      return;
    }
    const currentStatus = period.status || 'OPEN';
    const targetStatus = currentStatus === 'OPEN' ? 'LOCKED' : 'OPEN';
    const periodLabel = `${period.fiscal_year}/${String(period.period_number).padStart(2, '0')}`;
    if (!window.confirm(targetStatus === 'LOCKED'
      ? (isAr ? `سيمنع إقفال الفترة (${periodLabel}) إضافة قيود جديدة إليها. هل تريد المتابعة؟` : `Locking period (${periodLabel}) prevents new entries. Continue?`)
      : (isAr ? `هل تريد إعادة فتح الفترة المحاسبية (${periodLabel})؟` : `Reopen accounting period (${periodLabel})?`))) return;
    try {
      if (typeof onTogglePeriodStatus === 'function') {
        await Promise.resolve(onTogglePeriodStatus(period.period_id, targetStatus));
      }
    } catch (err) {
      console.error('Error toggling period status:', err);
      toast.error(isAr ? 'حدث خطأ أثناء تعديل حالة الفترة المالية' : 'Failed to update period status');
    }
  }, [effectiveSelectedPeriod, activePeriod, onTogglePeriodStatus, isAr]);

  const handleCloseFiscalYearSafe = useCallback(async (year: number) => {
    if (!onCloseFiscalYear) return;
    const msg = isAr
      ? `سيتم إغلاق جميع الفترات الـ 12 للسنة المالية ${year} نهائياً ومنع أي قيود جديدة عليها. هل تريد المتابعة؟`
      : `This will CLOSE all 12 periods of fiscal year ${year} and block any new postings. Continue?`;
    if (!window.confirm(msg)) return;
    if (year === new Date().getFullYear()) {
      const msg2 = isAr
        ? `تحذير: ${year} هي السنة الحالية. إغلاقها يوقف تسجيل التحصيلات والمصروفات لهذا العام. تأكيد نهائي؟`
        : `Warning: ${year} is the CURRENT year. Closing it stops recording collections and expenses for this year. Final confirmation?`;
      if (!window.confirm(msg2)) return;
    }
    await Promise.resolve(onCloseFiscalYear(year));
  }, [onCloseFiscalYear, isAr]);

  const handleFilterPeriodInJournal = useCallback((period: ERPAccountingPeriod) => {
    if (period.start_date) {
      const ym = period.start_date.substring(0, 7);
      setDateRangeFilter(ym);
    }
    setCurrentPage(1);
    handleTabChange('journal');
  }, [handleTabChange]);

  const selectedPeriodEntriesCount = useMemo(() => {
    if (!effectiveSelectedPeriod.start_date || !effectiveSelectedPeriod.end_date) {
      return journalEntries.length;
    }
    return journalEntries.filter(
      e => e.entry_date >= effectiveSelectedPeriod.start_date! && e.entry_date <= effectiveSelectedPeriod.end_date!
    ).length;
  }, [journalEntries, effectiveSelectedPeriod]);

  // Chart of Accounts Filters & State
  const [selectedAccountForModal, setSelectedAccountForModal] = useState<ERPAccount | null>(null);
  const [selectedAccountForInspector, setSelectedAccountForInspector] = useState<ERPAccount | null>(
    () => CANONICAL_COA['101000'] || Object.values(CANONICAL_COA)[0] || null
  );

  // Workstation COA Accounts Table Filters & State
  const [coaSearchQuery, setCoaSearchQuery] = useState<string>('');
  const [coaLevelFilter, setCoaLevelFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [coaTypeFilter, setCoaTypeFilter] = useState<'all' | 'folders' | 'accounts' | 'main' | 'sub'>('all');
  const [selectedAccountCodes, setSelectedAccountCodes] = useState<Set<string>>(new Set());
  const [coaCurrentPage, setCoaCurrentPage] = useState<number>(1);
  const [coaPageSize, setCoaPageSize] = useState<number>(10);

  // Compute live account balances & transaction counts from all posted journal entries
  const accountStats = useMemo(() => {
    const stats: Record<string, { debits: Decimal; credits: Decimal; count: number }> = {};
    
    Object.keys(CANONICAL_COA).forEach(code => {
      stats[code] = { debits: D(0), credits: D(0), count: 0 };
    });

    journalEntries.forEach(entry => {
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
  }, [journalEntries]);

  // Map of last recorded movement date for each account
  const accountLastMovementMap = useMemo(() => {
    const map: Record<string, string> = {};
    journalEntries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        if (!map[line.account_code] || entry.entry_date > map[line.account_code]) {
          map[line.account_code] = entry.entry_date;
        }
      });
    });
    return map;
  }, [journalEntries]);

  // Filtered COA Accounts for Master Workstation Table
  const filteredCoaAccounts = useMemo(() => {
    let list = Object.values(CANONICAL_COA);

    if (selectedAccountCode) {
      list = list.filter(acc =>
        acc.account_code === selectedAccountCode ||
        (selectedAccountCode.endsWith('000') && acc.account_code.startsWith(selectedAccountCode.slice(0, 3)))
      );
    } else if (selectedCategoryInTree) {
      list = list.filter(acc => selectedCategoryInTree.accountCodes.includes(acc.account_code));
    }

    if (coaSearchQuery.trim()) {
      const q = coaSearchQuery.trim().toLowerCase();
      list = list.filter(acc =>
        acc.account_code.toLowerCase().includes(q) ||
        acc.account_name_ar.toLowerCase().includes(q) ||
        acc.account_name_en.toLowerCase().includes(q)
      );
    }

    if (coaLevelFilter !== 'all') {
      list = list.filter(acc => {
        if (coaLevelFilter === '1') return acc.account_code.length === 1;
        if (coaLevelFilter === '2') return acc.account_code.length === 2;
        if (coaLevelFilter === '3') return acc.account_code.length > 2;
        return true;
      });
    }

    if (coaTypeFilter !== 'all') {
      list = list.filter(acc => {
        const isMain = acc.account_code.length <= 2 || acc.account_code.endsWith('000');
        return (coaTypeFilter === 'main' || coaTypeFilter === 'folders') ? isMain : !isMain;
      });
    }

    return list;
  }, [selectedAccountCode, selectedCategoryInTree, coaSearchQuery, coaLevelFilter, coaTypeFilter]);

  // Real-time totals for filtered COA accounts
  const coaFilteredTotals = useMemo(() => {
    let totalDebits = D(0);
    let totalCredits = D(0);
    let totalNetBalance = D(0);
    let totalDebitNatureBalance = D(0);
    let totalCreditNatureBalance = D(0);
    let totalAccountsWithActivity = 0;
    let mainAccountsCount = 0;
    let subAccountsCount = 0;
    let debitNatureCount = 0;
    let creditNatureCount = 0;

    filteredCoaAccounts.forEach(acc => {
      const stats = accountStats[acc.account_code] || { debits: D(0), credits: D(0), count: 0 };
      totalDebits = totalDebits.plus(stats.debits);
      totalCredits = totalCredits.plus(stats.credits);
      const net = acc.normal_balance === 'DEBIT'
        ? stats.debits.minus(stats.credits)
        : stats.credits.minus(stats.debits);
      totalNetBalance = totalNetBalance.plus(net);
      if (stats.count > 0 || !stats.debits.isZero() || !stats.credits.isZero()) {
        totalAccountsWithActivity++;
      }
      const isMain = acc.account_code.length <= 2 || acc.account_code.endsWith('000');
      if (isMain) {
        mainAccountsCount++;
      } else {
        subAccountsCount++;
      }
      if (acc.normal_balance === 'DEBIT') {
        debitNatureCount++;
        totalDebitNatureBalance = totalDebitNatureBalance.plus(net);
      } else {
        creditNatureCount++;
        totalCreditNatureBalance = totalCreditNatureBalance.plus(net);
      }
    });

    const balanceDelta = totalDebitNatureBalance.minus(totalCreditNatureBalance);

    return {
      count: filteredCoaAccounts.length,
      totalDebits,
      totalCredits,
      totalNetBalance,
      totalDebitNatureBalance,
      totalCreditNatureBalance,
      balanceDelta,
      totalAccountsWithActivity,
      mainAccountsCount,
      subAccountsCount,
      debitNatureCount,
      creditNatureCount
    };
  }, [filteredCoaAccounts, accountStats]);

  const coaTotalPages = Math.max(1, Math.ceil(filteredCoaAccounts.length / coaPageSize));
  const paginatedCoaAccounts = useMemo(() => {
    const start = (coaCurrentPage - 1) * coaPageSize;
    return filteredCoaAccounts.slice(start, start + coaPageSize);
  }, [filteredCoaAccounts, coaCurrentPage, coaPageSize]);

  const handleToggleSelectAllCoa = useCallback(() => {
    if (paginatedCoaAccounts.length > 0 && paginatedCoaAccounts.every(a => selectedAccountCodes.has(a.account_code))) {
      setSelectedAccountCodes(new Set());
    } else {
      setSelectedAccountCodes(new Set(paginatedCoaAccounts.map(a => a.account_code)));
    }
  }, [selectedAccountCodes, paginatedCoaAccounts]);

  const handleToggleSelectAccount = useCallback((code: string) => {
    setSelectedAccountCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  // Workstation Breadcrumbs
  let breadcrumbItems: { label: string; onClick: () => void }[] = [];
  if (selectedAccountCode) {
    const acc = CANONICAL_COA[selectedAccountCode];
    let foundCat: (typeof HIERARCHY_STRUCTURE)[0] | undefined;
    let foundSub: (typeof HIERARCHY_STRUCTURE)[0]['subcategories'][0] | undefined;
    for (const cat of HIERARCHY_STRUCTURE) {
      for (const sub of cat.subcategories) {
        if (sub.accountCodes.includes(selectedAccountCode)) {
          foundCat = cat;
          foundSub = sub;
          break;
        }
      }
      if (foundCat) break;
    }
    if (foundCat && foundSub) {
      breadcrumbItems = [
        {
          label: isAr ? foundCat.titleAr : foundCat.titleEn,
          onClick: () => {
            setSelectedAccountCode(null);
            setSelectedCategoryInTree({
              id: foundCat.id,
              code: foundCat.code,
              title: isAr ? foundCat.titleAr : foundCat.titleEn,
              accountCodes: foundCat.subcategories.flatMap(s => s.accountCodes)
            });
            setCoaCurrentPage(1);
          }
        },
        {
          label: isAr ? foundSub.titleAr : foundSub.titleEn,
          onClick: () => {
            setSelectedAccountCode(null);
            setSelectedCategoryInTree({
              id: foundSub.id,
              code: foundSub.code,
              title: isAr ? foundSub.titleAr : foundSub.titleEn,
              accountCodes: foundSub.accountCodes
            });
            setCoaCurrentPage(1);
          }
        },
        {
          label: acc ? (isAr ? `${acc.account_code} - ${acc.account_name_ar}` : `${acc.account_code} - ${acc.account_name_en}`) : selectedAccountCode,
          onClick: () => {}
        }
      ];
    } else {
      breadcrumbItems = [
        {
          label: acc ? (isAr ? `${acc.account_code} - ${acc.account_name_ar}` : `${acc.account_code} - ${acc.account_name_en}`) : selectedAccountCode,
          onClick: () => {}
        }
      ];
    }
  } else if (selectedCategoryInTree) {
    const rootCat = HIERARCHY_STRUCTURE.find(c => c.id === selectedCategoryInTree.id || c.code === selectedCategoryInTree.code);
    if (rootCat) {
      breadcrumbItems = [
        {
          label: isAr ? rootCat.titleAr : rootCat.titleEn,
          onClick: () => {
            setSelectedCategoryInTree({
              id: rootCat.id,
              code: rootCat.code,
              title: isAr ? rootCat.titleAr : rootCat.titleEn,
              accountCodes: rootCat.subcategories.flatMap(s => s.accountCodes)
            });
            setCoaCurrentPage(1);
          }
        }
      ];
    } else {
      let foundSub = false;
      for (const cat of HIERARCHY_STRUCTURE) {
        const sub = cat.subcategories.find(s => s.id === selectedCategoryInTree.id || s.code === selectedCategoryInTree.code);
        if (sub) {
          breadcrumbItems = [
            {
              label: isAr ? cat.titleAr : cat.titleEn,
              onClick: () => {
                setSelectedCategoryInTree({
                  id: cat.id,
                  code: cat.code,
                  title: isAr ? cat.titleAr : cat.titleEn,
                  accountCodes: cat.subcategories.flatMap(s => s.accountCodes)
                });
                setCoaCurrentPage(1);
              }
            },
            {
              label: isAr ? sub.titleAr : sub.titleEn,
              onClick: () => {}
            }
          ];
          foundSub = true;
          break;
        }
      }
      if (!foundSub) {
        breadcrumbItems = [{ label: selectedCategoryInTree.title, onClick: () => {} }];
      }
    }
  }


  // Executive KPI Aggregations (Matching media_1790182655987.jpg)
  const kpis = useMemo(() => {
    let sumDebits = D(0);
    let sumCredits = D(0);

    journalEntries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        sumDebits = sumDebits.plus(D(line.debit_amount || '0'));
        sumCredits = sumCredits.plus(D(line.credit_amount || '0'));
      });
    });

    const isBalanced = sumDebits.equals(sumCredits);
    const netVariance = sumDebits.minus(sumCredits);

    const { totalCash } = getAvailableCash(journalEntries);
    const totalWip = getConstructionWIP({
      costAllocations: dataset?.costAllocations,
      propertyCosts: dataset?.propertyCosts,
      journalEntries: journalEntries || dataset?.journalEntries,
    });

    return {
      sumDebits,
      sumCredits,
      isBalanced,
      netVariance,
      totalCash,
      totalWip,
      entriesCount: journalEntries.length
    };
  }, [journalEntries, dataset]);

  // Donut Chart: Balance Breakdown by Account Type (media_1790182959277.png)
  const accountTypeBreakdown = useMemo(() => {
    let assets = D(0);
    let liabilities = D(0);
    let equity = D(0);
    let revenue = D(0);
    let expenses = D(0);
    const signed = { assets: D(0), liabilities: D(0), equity: D(0), revenue: D(0), expenses: D(0) };

    Object.values(CANONICAL_COA).forEach(acc => {
      const stats = accountStats[acc.account_code] || { debits: D(0), credits: D(0), count: 0 };
      const net = acc.normal_balance === 'DEBIT'
        ? stats.debits.minus(stats.credits)
        : stats.credits.minus(stats.debits);

      const val = net.abs();
      if (acc.account_type === 'ASSET') { assets = assets.plus(val); signed.assets = signed.assets.plus(net); }
      else if (acc.account_type === 'LIABILITY' || acc.account_type === 'CONTRA_LIABILITY') { liabilities = liabilities.plus(val); signed.liabilities = signed.liabilities.plus(net); }
      else if (acc.account_type === 'EQUITY') { equity = equity.plus(val); signed.equity = signed.equity.plus(net); }
      else if (acc.account_type === 'REVENUE') { revenue = revenue.plus(val); signed.revenue = signed.revenue.plus(net); }
      else if (acc.account_type === 'EXPENSE') { expenses = expenses.plus(val); signed.expenses = signed.expenses.plus(net); }
    });

    const total = assets.plus(liabilities).plus(equity).plus(revenue).plus(expenses);
    const totalNum = total.isZero() ? 1 : total.toNumber();

    const items = [
      { key: 'assets', label: isAr ? 'الأصول' : 'Assets', value: assets.toNumber(), percent: Math.round(assets.toNumber() / totalNum * 100), color: currentAccent },
      { key: 'liabilities', label: isAr ? 'الالتزامات' : 'Liabilities', value: liabilities.toNumber(), percent: Math.round(liabilities.toNumber() / totalNum * 100), color: '#64748b' },
      { key: 'equity', label: isAr ? 'حقوق الملكية' : 'Equity', value: equity.toNumber(), percent: Math.round(equity.toNumber() / totalNum * 100), color: '#334155' },
      { key: 'revenue', label: isAr ? 'الإيرادات' : 'Revenue', value: revenue.toNumber(), percent: Math.round(revenue.toNumber() / totalNum * 100), color: '#94a3b8' },
      { key: 'expenses', label: isAr ? 'المصروفات' : 'Expenses', value: expenses.toNumber(), percent: Math.round(expenses.toNumber() / totalNum * 100), color: '#cbd5e1' }
    ];

    return {
      items,
      total: total.toNumber(),
      totalFormatted: total.formatEGP(isAr),
      signed,
      netIncome: signed.revenue.minus(signed.expenses),
      liabilitiesAndEquity: signed.liabilities.plus(signed.equity)
    };
  }, [accountStats, isAr, currentAccent]);

  // Dynamic Sparkline wave points derived from journal entries and account types
  const kpiSparklines = useMemo(() => {
    const sortedEntries = [...journalEntries].sort((a, b) => (a.entry_date || '').localeCompare(b.entry_date || ''));
    const numCheckpoints = 6;
    const assetsSeries: number[] = [];
    const liabilitiesSeries: number[] = [];
    const equitySeries: number[] = [];
    const netIncomeSeries: number[] = [];

    const finalAssets = accountTypeBreakdown.signed.assets.toNumber();
    const finalLiabilities = accountTypeBreakdown.signed.liabilities.toNumber();
    const finalEquity = accountTypeBreakdown.signed.equity.toNumber();
    const finalNetIncome = accountTypeBreakdown.netIncome.toNumber();

    if (sortedEntries.length >= 2) {
      const step = Math.max(1, Math.floor(sortedEntries.length / numCheckpoints));
      let curAssets = D(0);
      let curLiab = D(0);
      let curEq = D(0);
      let curRev = D(0);
      let curExp = D(0);

      let entryIdx = 0;
      for (let cp = 0; cp < numCheckpoints; cp++) {
        const targetIdx = cp === numCheckpoints - 1 ? sortedEntries.length : Math.min(sortedEntries.length, (cp + 1) * step);
        while (entryIdx < targetIdx) {
          const entry = sortedEntries[entryIdx];
          (entry.lines || []).forEach(line => {
            const acc = CANONICAL_COA[line.account_code];
            if (!acc) return;
            const deb = D(line.debit_amount || '0');
            const cred = D(line.credit_amount || '0');
            const net = acc.normal_balance === 'DEBIT' ? deb.minus(cred) : cred.minus(deb);

            if (acc.account_type === 'ASSET') curAssets = curAssets.plus(net);
            else if (acc.account_type === 'LIABILITY' || acc.account_type === 'CONTRA_LIABILITY') curLiab = curLiab.plus(net);
            else if (acc.account_type === 'EQUITY') curEq = curEq.plus(net);
            else if (acc.account_type === 'REVENUE') curRev = curRev.plus(net);
            else if (acc.account_type === 'EXPENSE') curExp = curExp.plus(net);
          });
          entryIdx++;
        }

        assetsSeries.push(Math.round(curAssets.toNumber() / 1000));
        liabilitiesSeries.push(Math.round(curLiab.toNumber() / 1000));
        equitySeries.push(Math.round(curEq.toNumber() / 1000));
        netIncomeSeries.push(Math.round(curRev.minus(curExp).toNumber() / 1000));
      }
    }

    const ensureSeries = (series: number[], finalVal: number, defaultProgression: number[]) => {
      if (series.length >= 2 && series.some(v => v !== 0)) {
        return series;
      }
      const scale = finalVal !== 0 ? Math.abs(finalVal) / 1000 : 1;
      return defaultProgression.map(p => Math.round(p * scale));
    };

    return {
      assets: ensureSeries(assetsSeries, finalAssets, [0.72, 0.78, 0.84, 0.89, 0.95, 1.0]),
      liabilities: ensureSeries(liabilitiesSeries, finalLiabilities, [0.95, 0.90, 0.86, 0.88, 0.92, 1.0]),
      equity: ensureSeries(equitySeries, finalEquity, [0.65, 0.70, 0.76, 0.82, 0.90, 1.0]),
      netIncome: ensureSeries(netIncomeSeries, finalNetIncome, [0.45, 0.55, 0.62, 0.74, 0.88, 1.0])
    };
  }, [journalEntries, accountTypeBreakdown]);

  // ─── ANALYTICAL CHARTS DATA (حركة القيود وتوزيعها حسب النوع) ───
  const entryTypeDistribution = useMemo(() => {
    let purchasesCount = 0;
    let salesCount = 0;
    let expensesCount = 0;
    let investmentsCount = 0;
    let otherCount = 0;

    journalEntries.forEach(entry => {
      const desc = (entry.description || '').toLowerCase();
      const codes = (entry.lines || []).map(l => l.account_code);
      const mod = (entry.source_module as string) || '';
      const num = (entry.entry_number || '').toUpperCase();

      const isCollectionReceipt = 
        num.startsWith('JE-RCP-') || 
        num.startsWith('JE-IP-') || 
        num.startsWith('JE-COL-') || 
        mod === 'PDC' || 
        mod === 'COLLECTION' || 
        codes.some(c => c === '203000' || c === '103200') || 
        /تحصيل|إيصال|إنستاباي|انستاباي|مقدم|مقدمة|receipt|collection|instapay/i.test(desc);

      const isSales = isCollectionReceipt || mod === 'SALES' || codes.some(c => c.startsWith('4') || c === '103000') || /مبيع|إيراد|بيع|دفعة|تعاقد|حجز|قسط/.test(desc);
      const isExpenses = codes.some(c => c.startsWith('5') || c.startsWith('6')) || /مصروف|رواتب|أجور|صيانة|إيجار|كهرباء|تشغيل|إدارية/.test(desc);
      const isPurchases = !isCollectionReceipt && (mod === 'PAYABLES' || codes.some(c => c.startsWith('201') || c.startsWith('202') || c.startsWith('204')) || /شراء|مشتريات|توريد|خامات|أصناف|مقاول/.test(desc));
      const isInvestment = mod === 'CAPITAL_CALL' || mod === 'PARTNER_EQUITY' || codes.some(c => c.startsWith('3') || c.startsWith('105')) || /رأس المال|استثمار|حصة|أرباح|تمويل|شريك/.test(desc);

      if (isSales) {
        salesCount++;
      } else if (isPurchases) {
        purchasesCount++;
      } else if (isExpenses) {
        expensesCount++;
      } else if (isInvestment) {
        investmentsCount++;
      } else {
        otherCount++;
      }
    });

    const total = journalEntries.length;
    const calcPercent = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

    return [
      {
        key: 'purchases',
        label: isAr ? 'مشتريات' : 'Procurement',
        count: purchasesCount,
        percent: calcPercent(purchasesCount),
        color: '#0ea5e9'
      },
      {
        key: 'sales',
        label: isAr ? 'مبيعات وإيرادات' : 'Sales & Revenue',
        count: salesCount,
        percent: calcPercent(salesCount),
        color: '#10b981'
      },
      {
        key: 'expenses',
        label: isAr ? 'مصروفات تشغيلية' : 'Operating Expenses',
        count: expensesCount,
        percent: calcPercent(expensesCount),
        color: '#8b5cf6'
      },
      {
        key: 'investments',
        label: isAr ? 'استثمارات' : 'Investments',
        count: investmentsCount,
        percent: calcPercent(investmentsCount),
        color: '#f59e0b'
      },
      {
        key: 'other',
        label: isAr ? 'أخرى' : 'Other',
        count: otherCount,
        percent: calcPercent(otherCount),
        color: '#f43f5e'
      }
    ];
  }, [journalEntries, isAr]);

  const entryTypeDonutSeries = useMemo(() => {
    const counts = entryTypeDistribution.map(item => item.count);
    const sum = counts.reduce((a, b) => a + b, 0);
    return sum > 0 ? counts : [1];
  }, [entryTypeDistribution]);

  const entryTypeDonutOptions: ApexCharts.ApexOptions = useMemo(() => {
    const hasData = journalEntries.length > 0;
    return {
      chart: {
        type: 'donut',
        fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', sans-serif",
        toolbar: { show: false },
        animations: { enabled: true }
      },
      labels: hasData ? entryTypeDistribution.map(i => i.label) : [isAr ? 'لا توجد بيانات' : 'No Data'],
      colors: hasData ? entryTypeDistribution.map(i => i.color) : ['#e2e8f0'],
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 2, colors: ['#ffffff'] },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '11px',
                color: '#64748b',
                offsetY: 14
              },
              value: {
                show: true,
                fontSize: '18px',
                fontWeight: 800,
                color: '#0f172a',
                offsetY: -8,
                formatter: (val: string) => {
                  const num = parseInt(val, 10);
                  if (isNaN(num)) return '0';
                  return num.toLocaleString();
                }
              },
              total: {
                show: true,
                label: isAr ? 'إجمالي القيود' : 'Total Entries',
                fontSize: '10px',
                color: '#64748b',
                formatter: () => `${journalEntries.length}`
              }
            }
          }
        }
      },
      tooltip: {
        theme: 'light',
        enabled: hasData,
        y: {
          formatter: (val: number) => `${val} ${isAr ? 'قيد' : 'entries'}`
        }
      }
    };
  }, [entryTypeDistribution, journalEntries.length, isAr]);

  // Movement stats with granularity support (يومي، أسبوعي، شهري، سنوي)
  const activeFiscalYear = activePeriod?.fiscal_year ?? 2026;
  const movementStats = useMemo(() => {
    const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (movementGranularity === 'monthly') {
      const monthBuckets: { debits: Decimal; credits: Decimal }[] = Array.from({ length: 12 }, () => ({
        debits: D(0),
        credits: D(0)
      }));

      journalEntries.forEach(entry => {
        const d = entry.entry_date || '';
        if (d.length >= 7) {
          const parts = d.split('-');
          const monthIdx = parseInt(parts[1], 10) - 1;
          if (monthIdx >= 0 && monthIdx < 12) {
            (entry.lines || []).forEach(line => {
              monthBuckets[monthIdx].debits = monthBuckets[monthIdx].debits.plus(D(line.debit_amount || '0'));
              monthBuckets[monthIdx].credits = monthBuckets[monthIdx].credits.plus(D(line.credit_amount || '0'));
            });
          }
        }
      });

      let cumulative = D(0);
      const categories: string[] = [];
      const debitSeries: number[] = [];
      const creditSeries: number[] = [];
      const balanceSeries: number[] = [];

      for (let i = 0; i < 12; i++) {
        categories.push(isAr ? monthsAr[i] : monthsEn[i]);
        const deb = monthBuckets[i].debits;
        const cred = monthBuckets[i].credits;
        cumulative = cumulative.plus(deb.minus(cred));

        debitSeries.push(deb.toNumber());
        creditSeries.push(cred.toNumber());
        balanceSeries.push(cumulative.toNumber());
      }

      return { categories, debitSeries, creditSeries, balanceSeries };
    }

    if (movementGranularity === 'daily') {
      const dateMap: Record<string, { debits: Decimal; credits: Decimal }> = {};
      journalEntries.forEach(entry => {
        const d = entry.entry_date || 'N/A';
        if (!dateMap[d]) {
          dateMap[d] = { debits: D(0), credits: D(0) };
        }
        (entry.lines || []).forEach(line => {
          dateMap[d].debits = dateMap[d].debits.plus(D(line.debit_amount || '0'));
          dateMap[d].credits = dateMap[d].credits.plus(D(line.credit_amount || '0'));
        });
      });

      let sortedDates = Object.keys(dateMap).sort();
      if (sortedDates.length > 8) {
        sortedDates = sortedDates.slice(-8);
      }

      let cumulative = D(0);
      const categories: string[] = [];
      const debitSeries: number[] = [];
      const creditSeries: number[] = [];
      const balanceSeries: number[] = [];

      sortedDates.forEach(date => {
        categories.push(date);
        const deb = dateMap[date].debits;
        const cred = dateMap[date].credits;
        cumulative = cumulative.plus(deb.minus(cred));

        debitSeries.push(deb.toNumber());
        creditSeries.push(cred.toNumber());
        balanceSeries.push(cumulative.toNumber());
      });

      return { categories, debitSeries, creditSeries, balanceSeries };
    }

    if (movementGranularity === 'weekly') {
      const weekLabels = isAr
        ? ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4', 'الأسبوع 5', 'الأسبوع 6']
        : ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];

      const weekBuckets: { debits: Decimal; credits: Decimal }[] = Array.from({ length: 6 }, () => ({
        debits: D(0),
        credits: D(0)
      }));

      journalEntries.forEach(entry => {
        const d = entry.entry_date || '';
        const day = parseInt(d.split('-')[2] || '1', 10);
        const weekIdx = Math.min(5, Math.floor((day - 1) / 5));
        (entry.lines || []).forEach(line => {
          weekBuckets[weekIdx].debits = weekBuckets[weekIdx].debits.plus(D(line.debit_amount || '0'));
          weekBuckets[weekIdx].credits = weekBuckets[weekIdx].credits.plus(D(line.credit_amount || '0'));
        });
      });

      let cumulative = D(0);
      const categories: string[] = [];
      const debitSeries: number[] = [];
      const creditSeries: number[] = [];
      const balanceSeries: number[] = [];

      weekLabels.forEach((label, idx) => {
        categories.push(label);
        const deb = weekBuckets[idx].debits;
        const cred = weekBuckets[idx].credits;
        cumulative = cumulative.plus(deb.minus(cred));

        debitSeries.push(deb.toNumber());
        creditSeries.push(cred.toNumber());
        balanceSeries.push(cumulative.toNumber());
      });

      return { categories, debitSeries, creditSeries, balanceSeries };
    }

    // 'yearly'
    const yearMap: Record<string, { debits: Decimal; credits: Decimal }> = {};
    journalEntries.forEach(entry => {
      const y = (entry.entry_date || '').substring(0, 4) || String(activeFiscalYear);
      if (!yearMap[y]) {
        yearMap[y] = { debits: D(0), credits: D(0) };
      }
      (entry.lines || []).forEach(line => {
        yearMap[y].debits = yearMap[y].debits.plus(D(line.debit_amount || '0'));
        yearMap[y].credits = yearMap[y].credits.plus(D(line.credit_amount || '0'));
      });
    });

    const currYear = activeFiscalYear;
    const baseYears = [String(currYear - 2), String(currYear - 1), String(currYear)];
    const allYears = Array.from(new Set([...baseYears, ...Object.keys(yearMap)])).sort();

    let cumulative = D(0);
    const categories: string[] = [];
    const debitSeries: number[] = [];
    const creditSeries: number[] = [];
    const balanceSeries: number[] = [];

    allYears.forEach(year => {
      categories.push(year);
      const deb = yearMap[year]?.debits || D(0);
      const cred = yearMap[year]?.credits || D(0);
      cumulative = cumulative.plus(deb.minus(cred));

      debitSeries.push(deb.toNumber());
      creditSeries.push(cred.toNumber());
      balanceSeries.push(cumulative.toNumber());
    });

    return { categories, debitSeries, creditSeries, balanceSeries };
  }, [journalEntries, movementGranularity, isAr, activeFiscalYear]);

  const movementChartSeries = useMemo(() => [
    {
      name: isAr ? 'مدين' : 'Debit',
      type: 'column',
      data: movementStats.debitSeries
    },
    {
      name: isAr ? 'دائن' : 'Credit',
      type: 'column',
      data: movementStats.creditSeries
    },
    {
      name: isAr ? 'الرصيد' : 'Net Balance',
      type: 'line',
      data: movementStats.balanceSeries
    }
  ], [movementStats, isAr]);

  const movementChartOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: {
      type: 'line',
      stacked: false,
      fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', sans-serif",
      toolbar: { show: false },
      animations: { enabled: true }
    },
    colors: [currentAccent, '#10b981', '#38bdf8'],
    stroke: {
      width: [0, 0, 3],
      curve: 'smooth'
    },
    plotOptions: {
      bar: {
        columnWidth: '38%',
        borderRadius: 4
      }
    },
    fill: {
      opacity: [0.9, 0.9, 1]
    },
    markers: {
      size: [0, 0, 5],
      strokeWidth: 2,
      strokeColors: '#ffffff',
      hover: { size: 7 }
    },
    xaxis: {
      categories: movementStats.categories,
      lines: { show: true },
      labels: {
        style: {
          fontSize: '11px',
          fontWeight: 600,
          colors: '#64748b'
        }
      }
    },
    yaxis: {
      opposite: isAr,
      lines: { show: true },
      labels: {
        formatter: (val: number) => {
          if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
          if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
          return val.toLocaleString();
        },
        style: {
          fontSize: '10px',
          fontWeight: 600,
          colors: '#64748b'
        }
      }
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 2,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } }
    },
    legend: {
      show: false
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => `${val.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}`
      }
    }
  }), [movementStats, isAr, currentAccent]);

  // Trial Balance calculation
  const trialBalanceReport = useMemo(() => {
    let sumDebits = D(0);
    let sumCredits = D(0);
    let sumEndingDebitBalances = D(0);
    let sumEndingCreditBalances = D(0);

    const rows = Object.values(CANONICAL_COA).map(acc => {
      const stats = accountStats[acc.account_code] || { debits: D(0), credits: D(0), count: 0 };
      sumDebits = sumDebits.plus(stats.debits);
      sumCredits = sumCredits.plus(stats.credits);

      const isDebitNormal = acc.normal_balance === 'DEBIT';
      const net = isDebitNormal
        ? stats.debits.minus(stats.credits)
        : stats.credits.minus(stats.debits);

      let endingDebit = D(0);
      let endingCredit = D(0);

      if (isDebitNormal) {
        if (net.greaterThanOrEqual(0)) {
          endingDebit = net;
        } else {
          endingCredit = net.abs();
        }
      } else {
        if (net.greaterThanOrEqual(0)) {
          endingCredit = net;
        } else {
          endingDebit = net.abs();
        }
      }

      sumEndingDebitBalances = sumEndingDebitBalances.plus(endingDebit);
      sumEndingCreditBalances = sumEndingCreditBalances.plus(endingCredit);

      return {
        code: acc.account_code,
        nameAr: acc.account_name_ar,
        nameEn: acc.account_name_en,
        category: acc.account_type,
        normalBalance: acc.normal_balance,
        debitMovements: stats.debits,
        creditMovements: stats.credits,
        endingDebit,
        endingCredit,
        hasActivity: stats.count > 0 || !stats.debits.isZero() || !stats.credits.isZero()
      };
    });

    const isMovementsBalanced = sumDebits.equals(sumCredits);
    const isBalancesBalanced = sumEndingDebitBalances.equals(sumEndingCreditBalances);

    return {
      rows,
      sumDebits,
      sumCredits,
      sumEndingDebitBalances,
      sumEndingCreditBalances,
      isMovementsBalanced,
      isBalancesBalanced
    };
  }, [accountStats]);

  // Filtered Journal Entries
  const filteredEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'locked' && !entry.is_locked) return false;
        const isDraft = entry.source_entity_id?.startsWith('DRAFT') || (entry as ERPJournalEntry & { status?: string }).status === 'DRAFT';
        if (selectedStatusFilter === 'draft' && (entry.is_locked || !isDraft)) return false;
        if (selectedStatusFilter === 'review' && (entry.is_locked || isDraft || entry.source_module !== 'MANUAL')) return false;
      }

      // User filter
      if (selectedUserFilter !== 'all') {
        if (entry.created_by !== selectedUserFilter) return false;
      }


      // Account filter
      if (filterAccountInEntries) {
        const hasAccount = (entry.lines || []).some(l => 
          l.account_code === filterAccountInEntries ||
          (filterAccountInEntries.endsWith('000') && l.account_code.startsWith(filterAccountInEntries.slice(0, 3)))
        );
        if (!hasAccount) return false;
      }

      // Category filter (from side COA tree)
      if (selectedCategoryInTree && !filterAccountInEntries) {
        const allowedCodes = new Set(selectedCategoryInTree.accountCodes);
        const hasMatchingAccount = (entry.lines || []).some(l => allowedCodes.has(l.account_code));
        if (!hasMatchingAccount) return false;
      }

      // Date Range filter
      if (dateRangeFilter.trim()) {
        const d = (entry.entry_date || '').trim();
        const filterVal = dateRangeFilter.trim();
        if (filterVal.includes(' - ')) {
          const [start, end] = filterVal.split(' - ').map(s => s.trim());
          if (start && d < start) return false;
          if (end && d > end) return false;
        } else if (!d.startsWith(filterVal)) {
          return false;
        }
      }

      // Search Query
      if (entriesSearchQuery.trim()) {
        const q = entriesSearchQuery.toLowerCase();
        const num = (entry.entry_number || '').toLowerCase();
        const desc = (entry.description || '').toLowerCase();
        const ref = (entry.source_entity_id || '').toLowerCase();
        const hasMatchingLine = (entry.lines || []).some(l => 
          (l.account_code || '').toLowerCase().includes(q) || 
          (l.memo || '').toLowerCase().includes(q)
        );
        return num.includes(q) || desc.includes(q) || ref.includes(q) || hasMatchingLine;
      }

      return true;
    });
  }, [journalEntries, selectedStatusFilter, selectedUserFilter, filterAccountInEntries, selectedCategoryInTree, dateRangeFilter, entriesSearchQuery]);


  // Sorted Journal Entries
  const sortedEntries = useMemo(() => {
    const list = [...filteredEntries];
    list.sort((a, b) => {
      if (entriesSortBy === 'date_desc') return (b.entry_date || '').localeCompare(a.entry_date || '');
      if (entriesSortBy === 'date_asc') return (a.entry_date || '').localeCompare(b.entry_date || '');
      if (entriesSortBy === 'entry_desc') return (b.entry_number || '').localeCompare(a.entry_number || '');
      if (entriesSortBy === 'amount_desc') {
        const sumA = (a.lines || []).reduce((acc, l) => acc.plus(D(l.debit_amount || '0')), D(0));
        const sumB = (b.lines || []).reduce((acc, l) => acc.plus(D(l.debit_amount || '0')), D(0));
        return sumB.minus(sumA).toNumber();
      }
      if (entriesSortBy === 'amount_asc') {
        const sumA = (a.lines || []).reduce((acc, l) => acc.plus(D(l.debit_amount || '0')), D(0));
        const sumB = (b.lines || []).reduce((acc, l) => acc.plus(D(l.debit_amount || '0')), D(0));
        return sumA.minus(sumB).toNumber();
      }
      return 0;
    });
    return list;
  }, [filteredEntries, entriesSortBy]);

  // Paginated Journal Entries
  const totalPages = Math.ceil(sortedEntries.length / pageSize) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEntries.slice(start, start + pageSize);
  }, [sortedEntries, currentPage, pageSize]);

  // Expand / Collapse Handlers
  const toggleExpand = (entryId: string) => {
    setExpandedEntryIds(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  // Excel Export Handler
  const handleExportExcelClick = async () => {
    if (onExportExcel) {
      try {
        setIsExportingExcel(true);
        await Promise.resolve(onExportExcel());
      } catch (err) {
        console.error('Error during onExportExcel:', err);
        toast.error(isAr ? 'حدث خطأ أثناء تصدير ملف الإكسيل' : 'Failed to export Excel');
      } finally {
        setIsExportingExcel(false);
      }
      return;
    }
    toast.error(isAr ? 'خدمة تصدير Excel غير متاحة حالياً.' : 'Excel export is unavailable.');
  };

  // Helper to extract primary debit and credit lines from entry
  const getEntryDebitCreditInfo = (entry: ERPJournalEntry) => {
    const debitLines = (entry.lines || []).filter(l => D(l.debit_amount || '0').greaterThan(0));
    const creditLines = (entry.lines || []).filter(l => D(l.credit_amount || '0').greaterThan(0));

    const totalDebit = debitLines.reduce((sum, l) => sum.plus(D(l.debit_amount || '0')), D(0));
    const totalCredit = creditLines.reduce((sum, l) => sum.plus(D(l.credit_amount || '0')), D(0));

    const primaryDebitAcc = debitLines[0] ? CANONICAL_COA[debitLines[0].account_code] : null;
    const primaryCreditAcc = creditLines[0] ? CANONICAL_COA[creditLines[0].account_code] : null;

    return {
      debitLines,
      creditLines,
      totalDebit,
      totalCredit,
      primaryDebitAcc,
      primaryCreditAcc
    };
  };

  const generatedAt = new Date();
  const statementDate = generatedAt.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const voucherCode = `TB-${generatedAt.toISOString().slice(0, 10)}`;

  // Printable Trial Balance Body
  const printableTrialBalanceBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', direction: isAr ? 'rtl' : 'ltr' }}>
      <ZFKpiGrid className={css.ledgerKpis}>
        <ZFKpiCard title={isAr ? 'إجمالي المدين' : 'Total debits'} value={<span>{kpis.sumDebits.formatEGP(isAr)}</span>}
          icon={<ArrowDownLeft size={16} />} accentColor="accent" />
        <ZFKpiCard title={isAr ? 'إجمالي الدائن' : 'Total credits'} value={<span>{kpis.sumCredits.formatEGP(isAr)}</span>}
          icon={<ArrowUpRight size={16} />} accentColor="accent" />
        <ZFKpiCard title={isAr ? 'السيولة المتاحة' : 'Available cash'} value={<span>{kpis.totalCash.formatEGP(isAr)}</span>}
          icon={<Wallet size={16} />} accentColor="accent" />
        <ZFKpiCard title={isAr ? 'أعمال تحت التنفيذ' : 'Construction WIP'} value={<span>{kpis.totalWip.formatEGP(isAr)}</span>}
          icon={<Building2 size={16} />} accentColor="accent" />
      </ZFKpiGrid>

      {/* Trial Balance Audit Strip */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '0.75rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className={css.iconSquircle} style={{ background: 'var(--erp-accent-subtle)', color: 'var(--erp-accent)' }}>
            <ShieldCheck size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
              {trialBalanceReport.isMovementsBalanced
                ? (isAr ? 'ميزان المراجعة متوازن ومطابق بالمليم' : 'Trial Balance is perfectly balanced with zero variance.')
                : (isAr ? 'تنبيه: يوجد فارق محاسبي بين المدين والدائن يحتاج مراجعة فورية!' : 'Alert: Unbalanced variance detected!')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {isAr ? '(إجمالي الحركات المدين = إجمالي الحركات الدائن)' : '(Total Debit Movements = Total Credit Movements)'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className={`${css.statusPill} ${trialBalanceReport.isMovementsBalanced ? css.statusPillGreen : css.statusPillRed}`}>
            {trialBalanceReport.isMovementsBalanced ? (isAr ? 'متطابق محاسبياً' : 'Balanced') : (isAr ? 'يوجد فارق' : 'Unbalanced')}
          </span>
          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
            {isAr ? `إجمالي القيود المسجلة: ${journalEntries.length}` : `Total recorded entries: ${journalEntries.length}`}
          </span>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.74rem' }}>
        <thead>
          <tr style={{ background: '#fafbfc', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '8%', fontWeight: 700, color: '#475569' }}>{isAr ? 'الكود' : 'Code'}</th>
            <th style={{ padding: '0.65rem 0.75rem', textAlign: isAr ? 'right' : 'left', width: '28%', fontWeight: 700, color: '#475569' }}>{isAr ? 'اسم الحساب' : 'Account Name'}</th>
            <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '12%', fontWeight: 700, color: '#475569' }}>{isAr ? 'طبيعة الحساب' : 'Nature'}</th>
            <th style={{ padding: '0.65rem 0.65rem', textAlign: isAr ? 'left' : 'right', width: '13%', fontWeight: 700, color: '#475569' }}>{isAr ? 'حركات مدين' : 'Debit Mov.'}</th>
            <th style={{ padding: '0.65rem 0.65rem', textAlign: isAr ? 'left' : 'right', width: '13%', fontWeight: 700, color: '#475569' }}>{isAr ? 'حركات دائن' : 'Credit Mov.'}</th>
            <th style={{ padding: '0.65rem 0.65rem', textAlign: isAr ? 'left' : 'right', width: '13%', fontWeight: 700, color: '#475569' }}>{isAr ? 'رصيد مدين' : 'End Debit'}</th>
            <th style={{ padding: '0.65rem 0.65rem', textAlign: isAr ? 'left' : 'right', width: '13%', fontWeight: 700, color: '#475569' }}>{isAr ? 'رصيد دائن' : 'End Credit'}</th>
          </tr>
        </thead>
        <tbody>
          {trialBalanceReport.rows.map((row, idx) => (
            <tr 
              key={row.code}
              style={{
                borderBottom: '1px solid #e2e8f0',
                background: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                opacity: row.hasActivity ? 1 : 0.65
              }}
            >
              <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                {row.code}
              </td>
              <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>
                {isAr ? row.nameAr : row.nameEn}
              </td>
              <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center' }}>
                <span className={`${css.statusPill} ${row.normalBalance === 'DEBIT' ? css.statusPillBlue : css.statusPillAmber}`}>
                  {isAr ? (row.normalBalance === 'DEBIT' ? 'مدين' : 'دائن') : row.normalBalance}
                </span>
              </td>
              <td style={{ padding: '0.55rem 0.65rem', textAlign: isAr ? 'left' : 'right' }}>
                <ERPLedgerAmount value={row.debitMovements} isAr={isAr} zeroAsDash />
              </td>
              <td style={{ padding: '0.55rem 0.65rem', textAlign: isAr ? 'left' : 'right' }}>
                <ERPLedgerAmount value={row.creditMovements} isAr={isAr} zeroAsDash />
              </td>
              <td style={{ padding: '0.55rem 0.65rem', textAlign: isAr ? 'left' : 'right' }}>
                <ERPLedgerAmount value={row.endingDebit} isAr={isAr} zeroAsDash color="#1e3a8a" />
              </td>
              <td style={{ padding: '0.55rem 0.65rem', textAlign: isAr ? 'left' : 'right' }}>
                <ERPLedgerAmount value={row.endingCredit} isAr={isAr} zeroAsDash color="#b45309" />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
            <td colSpan={3} style={{ padding: '0.65rem 0.85rem', color: '#0f172a' }}>
              {isAr ? 'الإجمالي العام لميزان المراجعة' : 'Trial Balance Grand Total'}
            </td>
            <td style={{ padding: '0.65rem', textAlign: isAr ? 'left' : 'right' }}>
              <ERPLedgerAmount value={trialBalanceReport.sumDebits} isAr={isAr} />
            </td>
            <td style={{ padding: '0.65rem', textAlign: isAr ? 'left' : 'right' }}>
              <ERPLedgerAmount value={trialBalanceReport.sumCredits} isAr={isAr} />
            </td>
            <td style={{ padding: '0.65rem', textAlign: isAr ? 'left' : 'right' }}>
              <ERPLedgerAmount value={trialBalanceReport.sumEndingDebitBalances} isAr={isAr} color="#1e3a8a" />
            </td>
            <td style={{ padding: '0.65rem', textAlign: isAr ? 'left' : 'right' }}>
              <ERPLedgerAmount value={trialBalanceReport.sumEndingCreditBalances} isAr={isAr} color="#b45309" />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderWorkstationTopBar = (
    row2Content?: React.ReactNode,
    options?: {
      customBreadcrumb?: React.ReactNode;
      customActions?: React.ReactNode;
    }
  ) => (
    <div className={css.tableCardTopBar}>
      {/* Row 1: Breadcrumbs & Primary Actions */}
      <div className={css.tableHeaderRow1}>
        <div className={css.tableBreadcrumbLeading}>
          {options?.customBreadcrumb ? (
            options.customBreadcrumb
          ) : (
            <>
              <button
                type="button"
                className={css.workstationBreadcrumbItem}
                onClick={() => {
                  setSelectedCategoryInTree(null);
                  setCoaCurrentPage(1);
                }}
                title={isAr ? 'العودة لجذر دليل الحسابات' : 'Reset to Chart of Accounts Root'}
              >
                <Home size={14} />
                <span>{isAr ? 'دليل الحسابات' : 'Chart of Accounts'}</span>
              </button>
              {breadcrumbItems.map((item, idx) => (
                <React.Fragment key={idx}>
                  <span className={css.breadcrumbSeparator}>{isAr ? '‹' : '›'}</span>
                  <button
                    type="button"
                    className={css.workstationBreadcrumbItem}
                    onClick={item.onClick}
                    style={{
                      fontWeight: idx === breadcrumbItems.length - 1 ? 700 : 500,
                      color: idx === breadcrumbItems.length - 1 ? '#0f172a' : '#64748b'
                    }}
                  >
                    {item.label}
                  </button>
                </React.Fragment>
              ))}
            </>
          )}
        </div>

        <div className={css.tableHeaderRow1Actions}>
          {options?.customActions !== undefined ? options.customActions : null}
        </div>
      </div>

      {row2Content}
    </div>
  );

  return (
    <div className={css.container} dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── 0. COMPANION SIDE WIDGETS (OFFLOADED SECONDARY CONTROLS) ─── */}
      <GeneralLedgerSideWidgets
        activePeriod={activePeriod}
        periods={availablePeriods}
        selectedPeriod={effectiveSelectedPeriod}
        onSelectPeriod={(period) => {
          setSelectedPeriod(period);
          if (period.start_date) {
            setDateRangeFilter(period.start_date.substring(0, 7));
          }
        }}
        isAr={isAr}
        isMutating={isMutating}
        trialBalanceReport={trialBalanceReport}
        totalEntriesCount={journalEntries.length}
        periodEntriesCount={selectedPeriodEntriesCount}
        availableCash={{ totalCash: kpis.totalCash }}
        accounts={Object.values(CANONICAL_COA)}
        accountStats={accountStats}
        selectedCategoryInTree={selectedCategoryInTree}
        selectedAccountCode={selectedAccountCode}
        onSelectCategory={(cat) => {
          setSelectedCategoryInTree(cat);
          setSelectedAccountCode(null);
          setFilterAccountInEntries(null);
          setCoaCurrentPage(1);
          setCurrentPage(1);
        }}
        onSelectAccount={(acc) => {
          if (selectedAccountCode === acc.account_code) {
            setSelectedAccountCode(null);
            setSelectedCategoryInTree(null);
            setFilterAccountInEntries(null);
          } else {
            setSelectedAccountCode(acc.account_code);
            setSelectedAccountForInspector(acc);
            setFilterAccountInEntries(acc.account_code);
            setSelectedCategoryInTree({
              id: `acc_${acc.account_code}`,
              code: acc.account_code,
              title: isAr ? `${acc.account_code} - ${acc.account_name_ar}` : `${acc.account_code} - ${acc.account_name_en}`,
              accountCodes: [acc.account_code]
            });
          }
          setCoaCurrentPage(1);
          setCurrentPage(1);
        }}
        onFilterInJournal={(accCode) => {
          setSelectedAccountCode(accCode);
          setFilterAccountInEntries(accCode);
          setCurrentPage(1);
          handleTabChange('journal');
        }}
        selectedAccount={selectedAccountForInspector}
        selectedAccountId={selectedAccountForInspector?.account_code || selectedAccountCode || undefined}
        selectedAccountStats={selectedAccountForInspector ? accountStats[selectedAccountForInspector.account_code] : undefined}
        lastMovementDate={selectedAccountForInspector ? accountLastMovementMap[selectedAccountForInspector.account_code] : undefined}
        onCloseInspector={() => setSelectedAccountForInspector(null)}
        onTogglePeriodStatus={handleTogglePeriodStatusSafe}
        onCloseFiscalYear={onCloseFiscalYear ? handleCloseFiscalYearSafe : undefined}
        onFilterPeriodInJournal={handleFilterPeriodInJournal}
        onExportExcel={handleExportExcelClick}
        isExportingExcel={isExportingExcel}
        onPrintTrialBalance={() => setShowPrintPreview(true)}
        onNavigateTab={handleTabChange}
        onOpenNewEntry={handleOpenExpense}
        onAddSubAccount={handleAddAccount}
        onInspectAccount={(acc) => {
          setSelectedAccountForInspector(acc);
          setSelectedAccountForModal(acc);
        }}
        onFilterUnpostedEntries={() => {
          setSelectedStatusFilter('review');
          setCurrentPage(1);
          handleTabChange('journal');
        }}
        onFilterLiquidAccounts={() => {
          setFilterAccountInEntries('101000');
          setCurrentPage(1);
          handleTabChange('journal');
        }}
      />

      {/* ─── 1. TOP HEADER & BREADCRUMB ─── */}
      <div className={css.headerRow}>
        <div className={css.headerLeading}>
          <div className={css.titleGroup}>
            <h1 className={css.pageTitle}>
              {isAr ? 'حسابات الشركة ودفتر اليومية' : 'General Ledger & Journal Entries'}
            </h1>
          </div>
          <p className={css.pageSubtitle}>
            {isAr
              ? 'راجع القيود، افتح حسابات الأستاذ، واستخرج القوائم من دفتر واحد.'
              : 'Review entries, inspect accounts, and prepare statements from one ledger.'}
          </p>
        </div>
        <div className={css.headerActions}>
          {activeTab === 'journal' && (
            <button
              type="button"
              className={css.primaryBtn}
              onClick={handleOpenExpense}
              disabled={isMutating || activePeriod.status === 'LOCKED'}
            >
              <Plus size={14} />
              <span>{isAr ? '+ قيد جديد' : '+ New Entry'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. 4 BALANCED DISCRETE STAT CARDS GRID (FIN-OS Invariant Spec) ─── */}
      <ZFKpiGrid className={css.ledger5Kpis}>
        {/* KPI 1: Total Assets */}
        <ZFKpiCard
          title={isAr ? 'إجمالي الأصول' : 'Total Assets'}
          value={accountTypeBreakdown.signed.assets}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Building2 size={16} />}
          accentColor="emerald"
          showSparkline={true}
          sparklineData={kpiSparklines.assets}
          subtitleLabel={isAr ? 'أصول متداولة وثابتة' : 'Current & fixed assets'}
        />

        {/* KPI 2: Total Liabilities */}
        <ZFKpiCard
          title={isAr ? 'إجمالي الخصوم' : 'Total Liabilities'}
          value={accountTypeBreakdown.signed.liabilities}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Scale size={16} />}
          accentColor="blue"
          showSparkline={true}
          sparklineData={kpiSparklines.liabilities}
          subtitleLabel={isAr ? 'التزامات قصيرة وطويلة الأجل' : 'Short & long term liabilities'}
        />

        {/* KPI 3: Equity */}
        <ZFKpiCard
          title={isAr ? 'حقوق الملكية' : 'Equity'}
          value={accountTypeBreakdown.signed.equity}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<ShieldCheck size={16} />}
          accentColor="purple"
          showSparkline={true}
          sparklineData={kpiSparklines.equity}
          subtitleLabel={isAr ? 'رأس المال والأرباح المرحلة' : 'Capital & retained earnings'}
        />

        {/* KPI 4: Net Operating Income / Result (incorporating Revenue & Expenses) */}
        <ZFKpiCard
          title={isAr ? 'صافي نتيجة النشاط' : 'Net Operating Result'}
          value={accountTypeBreakdown.netIncome}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<TrendingUp size={16} />}
          accentColor={accountTypeBreakdown.netIncome.gte(0) ? 'teal' : 'rose'}
          showSparkline={true}
          sparklineData={kpiSparklines.netIncome}
          delta={!accountTypeBreakdown.signed.revenue.isZero() ? {
            value: `${((accountTypeBreakdown.netIncome.toNumber() / Math.max(1, accountTypeBreakdown.signed.revenue.toNumber())) * 100).toFixed(1)}%`,
            isPositive: accountTypeBreakdown.netIncome.gte(0),
            label: isAr ? 'هامش' : 'margin'
          } : undefined}
          subtitleLabel={isAr ? 'إيرادات / مصروفات' : 'Rev / Exp'}
          subtitleValue={
            <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
              {`${accountTypeBreakdown.signed.revenue.formatEGP(isAr)} / ${accountTypeBreakdown.signed.expenses.formatEGP(isAr)}`}
            </span>
          }
        />
      </ZFKpiGrid>

      {/* ─── 2.5 ANALYTICAL CHARTS (حركة القيود & توزيع القيود حسب النوع) ─── */}
      {(activeTab !== 'balance_sheet' && activeTab !== 'income_statement') && (
        <div className={css.chartsGrid}>
          {/* Chart 1: Movement chart with granularity switchers */}
          <div className={css.chartCard}>
            <div className={css.chartCardHeader}>
              <div className={css.chartHeaderTitleGroup}>
                <span className={css.chartIcon}><BarChart3 size={16} /></span>
                <h3 className={css.chartTitle}>{isAr ? 'حركة القيود المحاسبية' : 'Journal Entries Movement'}</h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className={css.chartHeaderLegend}>
                  <span className={css.chartHeaderLegendItem}>
                    <span className={css.chartHeaderLegendDot} style={{ background: currentAccent }} />
                    <span>{isAr ? 'مدين' : 'Debit'}</span>
                  </span>
                  <span className={css.chartHeaderLegendItem}>
                    <span className={css.chartHeaderLegendDot} style={{ background: '#10b981' }} />
                    <span>{isAr ? 'دائن' : 'Credit'}</span>
                  </span>
                  <span className={css.chartHeaderLegendItem}>
                    <span className={css.chartHeaderLegendDot} style={{ background: '#38bdf8' }} />
                    <span>{isAr ? 'صافي الرصيد' : 'Net Balance'}</span>
                  </span>
                </div>

                <div className={css.chartGranularityPills}>
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(gran => {
                    const labelMap = {
                      daily: isAr ? 'يومي' : 'Daily',
                      weekly: isAr ? 'أسبوعي' : 'Weekly',
                      monthly: isAr ? 'شهري' : 'Monthly',
                      yearly: isAr ? 'سنوي' : 'Yearly',
                    };
                    return (
                      <button
                        key={gran}
                        type="button"
                        className={`${css.chartGranularityBtn} ${movementGranularity === gran ? css.chartGranularityBtnActive : ''}`}
                        onClick={() => setMovementGranularity(gran)}
                      >
                        {labelMap[gran]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {movementStats.categories.length > 0 ? (
              <ERPApexChart
                type="line"
                series={movementChartSeries}
                options={movementChartOptions}
                height={230}
                isAr={isAr}
              />
            ) : (
              <p className={css.emptyChart}>{isAr ? 'لا توجد قيود لعرض الحركة.' : 'No entries to chart.'}</p>
            )}
          </div>

          {/* Chart 2: Donut distribution by entry type */}
          <div className={css.chartCard}>
            <div className={css.chartCardHeader}>
              <div className={css.chartHeaderTitleGroup}>
                <span className={css.chartIcon}><PieChart size={16} /></span>
                <h3 className={css.chartTitle}>{isAr ? 'توزيع القيود حسب النوع' : 'Entries by Type'}</h3>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                {isAr ? `${journalEntries.length} قيد مسجل` : `${journalEntries.length} Total`}
              </span>
            </div>

            <div className={css.donutContainer}>
              <div className={css.donutLegendList}>
                {entryTypeDistribution.map(item => (
                  <div key={item.key} className={css.donutLegendItem}>
                    <div className={css.donutLegendLeading}>
                      <span className={css.donutLegendDot} style={{ background: item.color }} />
                      <span className={css.donutLegendLabel}>{item.label}</span>
                    </div>
                    <span className={css.donutLegendPercent}>
                      {item.percent}% <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#64748b' }}>({item.count})</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className={css.donutChartWrapper}>
                <ERPApexChart
                  type="donut"
                  series={entryTypeDonutSeries}
                  options={entryTypeDonutOptions}
                  height={200}
                  width={200}
                  isAr={isAr}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. FIN-OS CANONICAL UNDERLINE TABS BAR ─── */}
      <div className={css.tabsUnderlineBar} role="tablist" aria-label={isAr ? 'أقسام الدفتر المحاسبي' : 'Ledger sections'}>
        <button
          type="button"
          className={`${css.underlineTab} ${activeTab === 'coa' ? css.underlineTabActive : ''}`}
          onClick={() => handleTabChange('coa')}
          role="tab"
          aria-selected={activeTab === 'coa'}
        >
          <Layers size={14} />
          <span>{isAr ? 'دليل الحسابات والأرصدة' : 'Chart of Accounts'}</span>
          <span className={css.tabCountBadge}>
            {Object.keys(CANONICAL_COA).length}
          </span>
        </button>

        <button
          type="button"
          className={`${css.underlineTab} ${activeTab === 'journal' ? css.underlineTabActive : ''}`}
          onClick={() => handleTabChange('journal')}
          role="tab"
          aria-selected={activeTab === 'journal'}
        >
          <BookOpen size={14} />
          <span>{isAr ? 'سجل القيود اليومية' : 'Daily Journal'}</span>
          <span className={css.tabCountBadge}>
            {journalEntries.length}
          </span>
        </button>

        <button
          type="button"
          className={`${css.underlineTab} ${activeTab === 'trial_balance' || activeTab === 'detailed_tb' ? css.underlineTabActive : ''}`}
          onClick={() => handleTabChange('trial_balance')}
          role="tab"
          aria-selected={activeTab === 'trial_balance' || activeTab === 'detailed_tb'}
        >
          <Scale size={14} />
          <span>{isAr ? 'ميزان المراجعة' : 'Trial Balance'}</span>
        </button>

        <button
          type="button"
          className={`${css.underlineTab} ${activeTab === 'balance_sheet' ? css.underlineTabActive : ''}`}
          onClick={() => handleTabChange('balance_sheet')}
          role="tab"
          aria-selected={activeTab === 'balance_sheet'}
        >
          <Building2 size={14} />
          <span>{isAr ? 'المركز المالي' : 'Balance Sheet'}</span>
        </button>

        <button
          type="button"
          className={`${css.underlineTab} ${activeTab === 'income_statement' ? css.underlineTabActive : ''}`}
          onClick={() => handleTabChange('income_statement')}
          role="tab"
          aria-selected={activeTab === 'income_statement'}
        >
          <TrendingUp size={14} />
          <span>{isAr ? 'الأرباح والخسائر' : 'Income Statement'}</span>
        </button>
      </div>

      <div className={css.ledgerWorkspace}>
        {/* ─── TAB 1: JOURNAL ENTRIES (سجل القيود اليومية) ─── */}
        {activeTab === 'journal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
            {/* Journal Entries Section (Table or Cards) */}
            {entriesViewMode === 'table' ? (
              <div className={css.tableCard}>
                      {renderWorkstationTopBar(
                        <div className={css.tableHeaderRow2}>
                          <div className={css.tableSearchWrap}>
                            <label className={css.searchBox} style={{ width: '100%' }}>
                              <Search size={14} aria-hidden="true" />
                              <input className={css.searchInput} type="search" aria-label={isAr ? 'البحث في القيود' : 'Search entries'}
                                placeholder={isAr ? 'رقم القيد، البيان، الحساب...' : 'Entry, description, account...'}
                                value={entriesSearchQuery} onChange={event => { setEntriesSearchQuery(event.target.value); setCurrentPage(1); }} />
                            </label>
                          </div>
                          <div className={css.tableFiltersGroup}>
                            <label className={css.monthFilter}>
                              <span>{isAr ? 'الشهر' : 'Month'}</span>
                              <input type="month" value={dateRangeFilter} onChange={event => { setDateRangeFilter(event.target.value); setCurrentPage(1); }}
                                aria-label={isAr ? 'تصفية حسب الشهر' : 'Filter by month'} />
                            </label>
                            <select className={css.filterSelect} value={selectedUserFilter} onChange={event => { setSelectedUserFilter(event.target.value); setCurrentPage(1); }}
                              aria-label={isAr ? 'تصفية المستخدم' : 'Filter by user'}>
                              <option value="all">{isAr ? 'كل المستخدمين' : 'All users'}</option>
                              {journalUsers.map(user => <option value={user} key={user}>{user === 'SYSTEM' ? (isAr ? 'النظام الآلي' : 'System') : user}</option>)}
                            </select>
                            <select className={css.filterSelect} value={selectedStatusFilter} onChange={event => { setSelectedStatusFilter(event.target.value); setCurrentPage(1); }}
                              aria-label={isAr ? 'تصفية الحالة' : 'Filter by status'}>
                              <option value="all">{isAr ? 'كل الحالات' : 'All statuses'}</option>
                              <option value="locked">{isAr ? 'مرحل ومقفل' : 'Posted'}</option>
                              <option value="review">{isAr ? 'قيد المراجعة' : 'In review'}</option>
                              <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                            </select>
                            <select className={css.filterSelect} value={entriesSortBy} onChange={event => { setEntriesSortBy(event.target.value as typeof entriesSortBy); setCurrentPage(1); }}
                              aria-label={isAr ? 'ترتيب القيود' : 'Sort entries'}>
                              <option value="date_desc">{isAr ? 'الأحدث أولاً' : 'Newest first'}</option>
                              <option value="date_asc">{isAr ? 'الأقدم أولاً' : 'Oldest first'}</option>
                              <option value="entry_desc">{isAr ? 'رقم القيد' : 'Entry number'}</option>
                              <option value="amount_desc">{isAr ? 'الأعلى مبلغاً' : 'Highest amount'}</option>
                              <option value="amount_asc">{isAr ? 'الأقل مبلغاً' : 'Lowest amount'}</option>
                            </select>
                            <div className={css.toolbarTrailing} role="group" aria-label={isAr ? 'طريقة عرض القيود' : 'Entry display'}>
                              <button type="button" className={`${css.viewToggle} ${css.viewToggleActive}`}
                                aria-label={isAr ? 'عرض الجدول' : 'Table view'} aria-pressed={true} onClick={() => setEntriesViewMode('table')}><Table size={15} /></button>
                              <button type="button" className={css.viewToggle}
                                aria-label={isAr ? 'عرض البطاقات' : 'Card view'} aria-pressed={false} onClick={() => setEntriesViewMode('cards')}><LayoutGrid size={15} /></button>
                            </div>
                          </div>
                        </div>,
                        {
                          customBreadcrumb: (
                            <>
                              <button
                                type="button"
                                className={css.workstationBreadcrumbItem}
                                onClick={() => {
                                  setFilterAccountInEntries(null);
                                  setCurrentPage(1);
                                }}
                              >
                                <Home size={14} />
                                <span>{isAr ? 'دفتر اليومية العامة' : 'General Journal'}</span>
                              </button>
                              {filterAccountInEntries && (
                                <>
                                  <span className={css.breadcrumbSeparator}>{isAr ? '‹' : '›'}</span>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                    {isAr ? `تصفية بحساب: ${filterAccountInEntries}` : `Account: ${filterAccountInEntries}`}
                                  </span>
                                  <button
                                    type="button"
                                    className={css.clearCategoryBtn}
                                    onClick={() => setFilterAccountInEntries(null)}
                                    title={isAr ? 'إلغاء التصفية' : 'Clear filter'}
                                  >
                                    <X size={12} />
                                  </button>
                                </>
                              )}
                              {!filterAccountInEntries && selectedCategoryInTree && (
                                <>
                                  <span className={css.breadcrumbSeparator}>{isAr ? '‹' : '›'}</span>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                    {isAr ? `تصفية بتصنيف: ${selectedCategoryInTree.title}` : `Category: ${selectedCategoryInTree.title}`}
                                  </span>
                                  <button
                                    type="button"
                                    className={css.clearCategoryBtn}
                                    onClick={() => setSelectedCategoryInTree(null)}
                                    title={isAr ? 'إلغاء التصفية' : 'Clear filter'}
                                  >
                                    <X size={12} />
                                  </button>
                                </>
                              )}
                            </>
                          ),
                          customActions: (
                            <button
                              type="button"
                              className={css.primaryBtn}
                              onClick={handleOpenExpense}
                              disabled={isMutating || activePeriod.status === 'LOCKED'}
                            >
                              <Plus size={13} />
                              <span>{isAr ? '+ قيد جديد' : '+ New Entry'}</span>
                            </button>
                          )
                        }
                      )}
                <div className={css.tableContainer} role="region" tabIndex={0} aria-label={isAr ? 'جدول القيود المحاسبية' : 'Journal entries table'}>
                  <table className={`${css.canonicalTable} ${css.journalTable}`}>
                    <thead className={css.canonicalThead}>
                      <tr>
                        <th className={css.canonicalTh} style={{ width: '40px', textAlign: 'center' }}>#</th>
                        <th className={css.canonicalTh} style={{ width: '100px', textAlign: 'center' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className={css.canonicalTh} style={{ width: '160px' }}>{isAr ? 'رقم القيد' : 'Entry #'}</th>
                        <th className={css.canonicalTh} style={{ width: '235px' }}>{isAr ? 'البيان' : 'Description'}</th>
                        <th className={css.canonicalTh} style={{ width: '240px' }}>{isAr ? 'الحسابات والعمليات' : 'Accounts & Flow'}</th>
                        <th className={css.canonicalTh} style={{ width: '125px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'المبلغ' : 'Amount'}</th>
                        <th className={css.canonicalTh} style={{ width: '95px', textAlign: 'center' }}>{isAr ? 'الحالة' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className={css.emptyTable}>
                            <BookOpen size={22} aria-hidden="true" />
                            <strong>{isAr ? 'لا توجد قيود مطابقة' : 'No matching entries'}</strong>
                            <span>{isAr ? 'غيّر الشهر أو الحالة أو عبارة البحث لعرض نتائج أخرى.' : 'Try another month, status, or search term.'}</span>
                          </td>
                        </tr>
                      ) : (
                        paginatedEntries.map((entry, idx) => {
                          const isExpanded = expandedEntryIds.has(entry.entry_id);
                          const { debitLines, creditLines, totalDebit, totalCredit, primaryDebitAcc, primaryCreditAcc } = getEntryDebitCreditInfo(entry);
                          const seqNumber = (currentPage - 1) * pageSize + idx + 1;
                          const totalLineCount = (entry.lines || []).length;
                          const displayAmount = totalDebit.isZero() ? totalCredit : totalDebit;

                          return (
                            <React.Fragment key={entry.entry_id}>
                              <tr 
                                className={`${css.canonicalRow} ${isExpanded ? css.canonicalRowExpanded : ''}`}
                                onClick={() => toggleExpand(entry.entry_id)}
                                tabIndex={0}
                                role="button"
                                aria-expanded={isExpanded}
                                aria-label={isAr ? `تفاصيل القيد ${entry.entry_number}` : `Details for entry ${entry.entry_number}`}
                                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleExpand(entry.entry_id); } }}
                                title={isAr ? 'انقر لعرض تفاصيل القيد' : 'Click to inspect journal entry lines'}
                              >
                                {/* 1. # */}
                                <td className={css.canonicalTd} style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>
                                  {seqNumber}
                                </td>

                                {/* 2. التاريخ */}
                                <td className={`${css.canonicalTd} ${css.dateCell}`} style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                  {entry.entry_date}
                                </td>

                                {/* 3. رقم القيد */}
                                <td className={css.canonicalTd}>
                                  <span className={css.entryNumPill} title={entry.entry_number}>
                                    {entry.is_locked ? <Lock size={11} /> : <FileText size={11} />}
                                    <span>{entry.entry_number}</span>
                                  </span>
                                </td>

                                {/* 4. البيان */}
                                <td className={css.canonicalTd}>
                                  <div className={css.tableDescription} title={entry.description}>
                                    {localizeJournalDescription(entry.description, isAr)}
                                  </div>
                                </td>

                                {/* 5. الحسابات والعمليات */}
                                <td className={css.canonicalTd}>
                                  <div className={css.accountsFlowBox}>
                                    {/* Debit Line */}
                                    <div className={css.accountFlowLine}>
                                      <span className={`${css.flowTag} ${css.flowTagDr}`}>{isAr ? 'مدين' : 'Dr'}</span>
                                      <span className={css.accountFlowName} title={primaryDebitAcc ? (isAr ? primaryDebitAcc.account_name_ar : primaryDebitAcc.account_name_en) : debitLines[0]?.account_code}>
                                        {primaryDebitAcc ? (isAr ? primaryDebitAcc.account_name_ar : primaryDebitAcc.account_name_en) : (debitLines[0]?.account_code || '—')}
                                      </span>
                                      {primaryDebitAcc && <span className={css.accountFlowCode}>{primaryDebitAcc.account_code}</span>}
                                    </div>

                                    {/* Credit Line */}
                                    <div className={css.accountFlowLine}>
                                      <span className={`${css.flowTag} ${css.flowTagCr}`}>{isAr ? 'دائن' : 'Cr'}</span>
                                      <span className={css.accountFlowName} title={primaryCreditAcc ? (isAr ? primaryCreditAcc.account_name_ar : primaryCreditAcc.account_name_en) : creditLines[0]?.account_code}>
                                        {primaryCreditAcc ? (isAr ? primaryCreditAcc.account_name_ar : primaryCreditAcc.account_name_en) : (creditLines[0]?.account_code || '—')}
                                      </span>
                                      {primaryCreditAcc && <span className={css.accountFlowCode}>{primaryCreditAcc.account_code}</span>}
                                      {totalLineCount > 2 && (
                                        <span className={css.extraAccountsBadge} title={isAr ? `إجمالي سطور القيد: ${totalLineCount}` : `Total lines: ${totalLineCount}`}>
                                          +{totalLineCount - 2}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* 6. المبلغ */}
                                <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                                  <ERPLedgerAmount value={displayAmount} isAr={isAr} className={css.amountVal} />
                                </td>

                                {/* 7. الحالة (Calibrated Invariant 6 status pills) */}
                                <td className={css.canonicalTd} style={{ textAlign: 'center' }}>
                                  {entry.is_locked ? (
                                    <span className={`${css.statusPill} ${css.statusPillGreen}`}>
                                      {isAr ? 'مرحل ومقفل' : 'Posted'}
                                    </span>
                                  ) : (entry.source_entity_id?.startsWith('DRAFT') || (entry as ERPJournalEntry & { status?: string }).status === 'DRAFT') ? (
                                    <span className={`${css.statusPill} ${css.statusPillBlue}`}>
                                      {isAr ? 'مسودة' : 'Draft'}
                                    </span>
                                  ) : entry.source_module && entry.source_module !== 'MANUAL' ? (
                                    <span className={`${css.statusPill} ${css.statusPillGreen}`}>
                                      {isAr ? 'معتمد آلياً' : 'System Verified'}
                                    </span>
                                  ) : (
                                    <span className={`${css.statusPill} ${css.statusPillAmber}`}>
                                      {isAr ? 'قيد المراجعة' : 'In Review'}
                                    </span>
                                  )}
                                </td>
                              </tr>

                              {/* Accordion Detail Inspection */}
                              {isExpanded && (
                                <tr style={{ background: '#f8fafc' }}>
                                  <td colSpan={7} style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
                                      <JournalEntryPreview entry={entry} isDraft={false} isAr={isAr} />
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with Pagination */}
                <div className={css.tableFooter}>
                  <span className={css.tableFooterCount}>
                    {isAr 
                      ? `عرض ${sortedEntries.length ? (currentPage - 1) * pageSize + 1 : 0} - ${Math.min(currentPage * pageSize, sortedEntries.length)} من أصل ${sortedEntries.length} قيد`
                      : `Showing ${sortedEntries.length ? (currentPage - 1) * pageSize + 1 : 0} - ${Math.min(currentPage * pageSize, sortedEntries.length)} of ${sortedEntries.length} entries`}
                  </span>

                  <ZFPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={sortedEntries.length}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 25, 50]}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={sz => {
                      setPageSize(sz);
                      setCurrentPage(1);
                    }}
                    isAr={isAr}
                    itemLabel={{ ar: 'قيد', en: 'entries' }}
                  />
                </div>
              </div>
            ) : (
              /* Cards View Mode */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {paginatedEntries.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    {isAr ? 'لا توجد قيود مطابقة.' : 'No journal entries match.'}
                  </div>
                ) : (
                  paginatedEntries.map(entry => (
                    <div key={entry.entry_id} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                      <JournalEntryPreview entry={entry} isDraft={false} isAr={isAr} />
                    </div>
                  ))
                )}
                <ZFPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={sortedEntries.length}
                  pageSize={pageSize}
                  pageSizeOptions={[10, 25, 50]}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={sz => {
                    setPageSize(sz);
                    setCurrentPage(1);
                  }}
                  isAr={isAr}
                />
              </div>
            )}
          </div>
        )}

  {/* ─── TAB 2: CHART OF ACCOUNTS (دليل الحسابات والأرصدة) ─── */}
  {activeTab === 'coa' && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
      {/* Master Interactive Accounts Table Card with Integrated Toolbar */}
      <div className={css.tableCard}>
            {/* Unified 2-Row Master Table Card Top Bar */}
            {renderWorkstationTopBar(
              <div className={css.tableHeaderRow2}>
                <div className={css.tableSearchWrap}>
                  <label className={css.searchBox} style={{ width: '100%' }}>
                    <Search size={14} aria-hidden="true" />
                    <input
                      className={css.searchInput}
                      type="search"
                      aria-label={isAr ? 'البحث في الحسابات' : 'Search accounts'}
                      placeholder={isAr ? 'بحث بالكود أو الاسم العربي أو الإنجليزي...' : 'Search by code or account name...'}
                      value={coaSearchQuery}
                      onChange={e => {
                        setCoaSearchQuery(e.target.value);
                        setCoaCurrentPage(1);
                      }}
                    />
                  </label>
                </div>

                <div className={css.tableFiltersGroup}>
                  <select
                    className={css.filterSelect}
                    value={coaLevelFilter}
                    onChange={e => {
                      setCoaLevelFilter(e.target.value as typeof coaLevelFilter);
                      setCoaCurrentPage(1);
                    }}
                    aria-label={isAr ? 'تصفية المستوى' : 'Filter level'}
                  >
                    <option value="all">{isAr ? 'المستوى: الكل' : 'Level: All'}</option>
                    <option value="1">{isAr ? 'المستوى 1 (رئيسي)' : 'Level 1 (Root)'}</option>
                    <option value="2">{isAr ? 'المستوى 2 (مجموعة)' : 'Level 2 (Group)'}</option>
                    <option value="3">{isAr ? 'المستوى 3 (تحليلي)' : 'Level 3 (Analytical)'}</option>
                  </select>

                  <select
                    className={css.filterSelect}
                    value={coaTypeFilter}
                    onChange={e => {
                      setCoaTypeFilter(e.target.value as typeof coaTypeFilter);
                      setCoaCurrentPage(1);
                    }}
                    aria-label={isAr ? 'تصفية النوع' : 'Filter type'}
                  >
                    <option value="all">{isAr ? 'النوع: الكل' : 'Type: All'}</option>
                    <option value="main">{isAr ? 'حسابات رئيسية' : 'Main Accounts'}</option>
                    <option value="sub">{isAr ? 'حسابات فرعية' : 'Sub-Accounts'}</option>
                  </select>

                  {selectedAccountCodes.size > 0 && (
                    <span className={css.tableSelectedBadge}>
                      {isAr ? `محدد: ${selectedAccountCodes.size}` : `Selected: ${selectedAccountCodes.size}`}
                    </span>
                  )}

                  {(coaSearchQuery || coaLevelFilter !== 'all' || coaTypeFilter !== 'all') && (
                    <button
                      type="button"
                      className={css.clearCategoryBtn}
                      onClick={() => {
                        setCoaSearchQuery('');
                        setCoaLevelFilter('all');
                        setCoaTypeFilter('all');
                        setCoaCurrentPage(1);
                      }}
                    >
                      <X size={12} />
                      <span>{isAr ? 'إعادة تعيين الفلاتر' : 'Reset filters'}</span>
                    </button>
                  )}
                </div>
              </div>,
              { customActions: null }
            )}

            {(selectedCategoryInTree || selectedAccountCode) && (
              <div style={{ padding: '0 0.85rem 0.5rem 0.85rem' }}>
                <div className={css.activeCategoryIndicator} role="status">
                  <div className={css.activeCategoryText}>
                    <Filter size={14} style={{ color: 'var(--erp-accent, #2563eb)' }} />
                    <span>{isAr ? 'تصفية نشطة من الشجرة:' : 'Active Tree Filter:'}</span>
                    <strong>
                      {selectedAccountCode
                        ? `${selectedAccountCode} - ${CANONICAL_COA[selectedAccountCode]?.account_name_ar || selectedAccountCode}`
                        : selectedCategoryInTree?.title}
                    </strong>
                    <span className={css.statusPill} style={{ marginInlineStart: '0.4rem', fontSize: '0.68rem' }}>
                      {filteredCoaAccounts.length} {isAr ? 'حساب' : 'accounts'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={css.clearCategoryBtn}
                    onClick={() => {
                      setSelectedAccountCode(null);
                      setSelectedCategoryInTree(null);
                      setFilterAccountInEntries(null);
                      setCoaCurrentPage(1);
                    }}
                    title={isAr ? 'إلغاء التصفية وعرض كل الحسابات' : 'Clear filter and show all accounts'}
                  >
                    <X size={12} />
                    <span>{isAr ? 'إلغاء التصفية' : 'Clear Filter'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className={css.tableContainer} role="region" tabIndex={0} aria-label={isAr ? 'جدول الحسابات الرئيسي' : 'Master accounts table'}>
              <table className={`${css.canonicalTable} ${css.coaMasterTable}`}>
                <thead className={css.canonicalThead}>
                  <tr>
                    <th className={css.canonicalTh} style={{ width: '36px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        aria-label={isAr ? 'تحديد كل الحسابات في الصفحة' : 'Select all accounts on page'}
                        checked={paginatedCoaAccounts.length > 0 && paginatedCoaAccounts.every(a => selectedAccountCodes.has(a.account_code))}
                        onChange={handleToggleSelectAllCoa}
                      />
                    </th>
                    <th className={css.canonicalTh} style={{ width: '85px' }}>{isAr ? 'كود الحساب' : 'Code'}</th>
                    <th className={css.canonicalTh} style={{ width: '239px' }}>{isAr ? 'اسم الحساب' : 'Account Name'}</th>
                    <th className={css.canonicalTh} style={{ width: '75px', textAlign: 'center' }}>{isAr ? 'النوع' : 'Type'}</th>
                    <th className={css.canonicalTh} style={{ width: '75px', textAlign: 'center' }}>{isAr ? 'الطبيعة' : 'Nature'}</th>
                    <th className={css.canonicalTh} style={{ width: '140px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'الرصيد الحالي' : 'Current Balance'}</th>
                    <th className={css.canonicalTh} style={{ width: '75px', textAlign: 'center' }}>{isAr ? 'الحالة' : 'Status'}</th>
                    <th className={css.canonicalTh} style={{ width: '95px', textAlign: 'center' }}>{isAr ? 'آخر حركة' : 'Last Movement'}</th>
                    <th className={css.canonicalTh} style={{ width: '70px', textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCoaAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={css.emptyTable}>
                        <Layers size={24} aria-hidden="true" />
                        <strong>{isAr ? 'لا توجد حسابات مطابقة للبحث أو التصفية' : 'No accounts match the current filter'}</strong>
                        <span>{isAr ? 'جرّب تغيير عبارة البحث أو اختيار تصنيف مختلف من الشجرة.' : 'Try changing search terms or choosing another category from the tree.'}</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedCoaAccounts.map(acc => {
                      const stats = accountStats[acc.account_code] || { debits: D(0), credits: D(0), count: 0 };
                      const net = acc.normal_balance === 'DEBIT'
                        ? stats.debits.minus(stats.credits)
                        : stats.credits.minus(stats.debits);
                      const isMainAccount = acc.account_code.length <= 2 || acc.account_code.endsWith('000');
                      const isSelected = selectedAccountCodes.has(acc.account_code);
                      const isInspectorTarget = selectedAccountForInspector?.account_code === acc.account_code;
                      const lastMovement = accountLastMovementMap[acc.account_code] || '—';

                      return (
                        <tr
                          key={acc.account_code}
                          className={`${css.canonicalRow} ${isInspectorTarget ? css.canonicalRowExpanded : ''}`}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isInspectorTarget ? 'var(--erp-accent-subtle, #eff6ff)' : undefined
                          }}
                          onClick={() => {
                            setSelectedAccountForInspector(acc);
                            setSelectedAccountForModal(acc);
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={isAr ? `تحديد الحساب ${acc.account_name_ar}` : `Select ${acc.account_name_en}`}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedAccountForInspector(acc);
                              setSelectedAccountForModal(acc);
                            }
                          }}
                        >
                          {/* 1. Checkbox */}
                          <td className={css.canonicalTd} style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectAccount(acc.account_code)}
                              aria-label={isAr ? `تحديد الحساب ${acc.account_code}` : `Select account ${acc.account_code}`}
                            />
                          </td>

                          {/* 2. Account Code */}
                          <td className={css.canonicalTd}>
                            <span className={css.tableItemCode}>{acc.account_code}</span>
                          </td>

                          {/* 3. Account Name with Semantic Squircle Icon */}
                          <td className={css.canonicalTd}>
                            <div className={css.tableItemNameCell}>
                              <div className={css.tableItemSquircle}>
                                {getAccountRowIcon(acc)}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span className={css.tableItemName} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {isAr ? acc.account_name_ar : acc.account_name_en}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {isAr ? acc.account_name_en : acc.account_name_ar}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 4. Type */}
                          <td className={css.canonicalTd} style={{ textAlign: 'center' }}>
                            <span className={`${css.statusPill} ${isMainAccount ? css.statusPillBlue : css.statusPillNeutral}`} style={{ fontSize: '0.70rem' }}>
                              {isMainAccount ? (isAr ? 'حساب رئيسي' : 'Main Account') : (isAr ? 'حساب فرعي' : 'Sub-Account')}
                            </span>
                          </td>

                          {/* 5. Nature pill */}
                          <td className={css.canonicalTd} style={{ textAlign: 'center' }}>
                            <span className={`${css.statusPill} ${acc.normal_balance === 'DEBIT' ? css.statusPillBlue : css.statusPillAmber}`}>
                              {isAr ? (acc.normal_balance === 'DEBIT' ? 'مدين' : 'دائن') : acc.normal_balance}
                            </span>
                          </td>

                          {/* 6. Current Balance */}
                          <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                            <ERPLedgerAmount value={net} isAr={isAr} style={{ fontWeight: 700 }} />
                          </td>

                          {/* 7. Status pill */}
                          <td className={css.canonicalTd} style={{ textAlign: 'center' }}>
                            <span className={`${css.statusPill} ${acc.is_active !== false ? css.statusPillGreen : css.statusPillNeutral}`}>
                              {acc.is_active !== false ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطّل' : 'Inactive')}
                            </span>
                          </td>

                          {/* 8. Last Movement date */}
                          <td className={css.canonicalTd} style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: '0.72rem', color: '#64748b' }}>
                            {lastMovement}
                          </td>

                          {/* 9. Action Button */}
                          <td className={css.canonicalTd} style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              className={css.canonicalInspectBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAccountForInspector(acc);
                                setSelectedAccountForModal(acc);
                              }}
                              title={isAr ? 'فحص كشف الحساب' : 'Inspect account statement'}
                            >
                              <Eye size={12} />
                              <span>{isAr ? 'كشف' : 'Inspect'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                    <td colSpan={3} className={css.canonicalTd}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                          ({isAr ? `${coaFilteredTotals.count} حساب معروض` : `${coaFilteredTotals.count} accounts displayed`})
                        </span>
                      </div>
                    </td>
                    <td className={css.canonicalTd} style={{ textAlign: 'center', fontSize: '0.70rem', color: '#475569' }}>
                      {isAr ? `${coaFilteredTotals.mainAccountsCount} رئيسي / ${coaFilteredTotals.subAccountsCount} فرعي` : `${coaFilteredTotals.mainAccountsCount} M / ${coaFilteredTotals.subAccountsCount} S`}
                    </td>
                    <td className={css.canonicalTd} style={{ textAlign: 'center', fontSize: '0.70rem', color: '#475569' }}>
                      {isAr ? `${coaFilteredTotals.debitNatureCount} مدين / ${coaFilteredTotals.creditNatureCount} دائن` : `${coaFilteredTotals.debitNatureCount} Dr / ${coaFilteredTotals.creditNatureCount} Cr`}
                    </td>
                    <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.74rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', color: '#1e40af' }}>
                          <span style={{ fontWeight: 600 }}>{isAr ? 'مدين:' : 'Dr:'}</span>
                          <ERPLedgerAmount value={coaFilteredTotals.totalDebitNatureBalance} isAr={isAr} style={{ fontWeight: 700 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', color: '#b45309' }}>
                          <span style={{ fontWeight: 600 }}>{isAr ? 'دائن:' : 'Cr:'}</span>
                          <ERPLedgerAmount value={coaFilteredTotals.totalCreditNatureBalance} isAr={isAr} style={{ fontWeight: 700 }} />
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          borderTop: '1px dashed #cbd5e1',
                          paddingTop: '0.15rem',
                          color: coaFilteredTotals.balanceDelta.isZero() ? '#15803d' : '#b91c1c',
                          fontWeight: 800
                        }}>
                          <span>{isAr ? 'الفارق (Δ):' : 'Δ Check:'}</span>
                          <span>{coaFilteredTotals.balanceDelta.isZero() ? (isAr ? '٠.٠٠ (متزن ✓)' : '0.00 (Balanced ✓)') : coaFilteredTotals.balanceDelta.formatEGP(isAr)}</span>
                        </div>
                      </div>
                    </td>
                    <td className={css.canonicalTd} style={{ textAlign: 'center', fontSize: '0.70rem', color: '#16a34a' }}>
                      {isAr ? `${coaFilteredTotals.totalAccountsWithActivity} بحركة` : `${coaFilteredTotals.totalAccountsWithActivity} active`}
                    </td>
                    <td className={css.canonicalTd} style={{ textAlign: 'center', fontSize: '0.70rem', color: '#64748b' }}>
                      —
                    </td>
                    <td className={css.canonicalTd} style={{ textAlign: 'center' }} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Numeric Pagination */}
            <div style={{ padding: '0.5rem 0.85rem' }}>
              <ZFPagination
                currentPage={coaCurrentPage}
                totalPages={coaTotalPages}
                totalItems={filteredCoaAccounts.length}
                pageSize={coaPageSize}
                pageSizeOptions={[10, 15, 25, 50]}
                onPageChange={setCoaCurrentPage}
                onPageSizeChange={sz => {
                  setCoaPageSize(sz);
                  setCoaCurrentPage(1);
                }}
                isAr={isAr}
                itemLabel={{ ar: 'حساب', en: 'accounts' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: TRIAL BALANCE (ميزان المراجعة) ─── */}
      {(activeTab === 'trial_balance' || activeTab === 'detailed_tb') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className={css.tableCard}>
            {renderWorkstationTopBar(undefined, {
              customBreadcrumb: (
                <div className={css.tableBreadcrumbLeading}>
                  <Scale size={14} />
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {trialBalanceViewMode === 'detailed'
                      ? (isAr ? 'ميزان المراجعة التفصيلي (حركات وأرصدة ختامية)' : 'Detailed Trial Balance (Movements & Ending Balances)')
                      : (isAr ? 'ميزان المراجعة العام (ملخص الطباعة)' : 'General Trial Balance (Print Summary)')}
                  </span>
                </div>
              ),
              customActions: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px', border: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        background: trialBalanceViewMode === 'detailed' ? '#ffffff' : 'transparent',
                        color: trialBalanceViewMode === 'detailed' ? 'var(--erp-accent, #2563eb)' : '#64748b',
                        boxShadow: trialBalanceViewMode === 'detailed' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                      }}
                      onClick={() => setTrialBalanceViewMode('detailed')}
                    >
                      <FileSpreadsheet size={13} style={{ display: 'inline', marginInlineEnd: '4px' }} />
                      {isAr ? 'عرض تفصيلي' : 'Detailed'}
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        background: trialBalanceViewMode === 'printable' ? '#ffffff' : 'transparent',
                        color: trialBalanceViewMode === 'printable' ? 'var(--erp-accent, #2563eb)' : '#64748b',
                        boxShadow: trialBalanceViewMode === 'printable' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                      }}
                      onClick={() => setTrialBalanceViewMode('printable')}
                    >
                      <Scale size={13} style={{ display: 'inline', marginInlineEnd: '4px' }} />
                      {isAr ? 'ملخص الميزان' : 'Summary'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className={css.secondaryBtn}
                    onClick={() => setShowPrintPreview(true)}
                    title={isAr ? 'طباعة ميزان المراجعة' : 'Print Trial Balance'}
                  >
                    <Printer size={13} />
                    <span>{isAr ? 'طباعة' : 'Print'}</span>
                  </button>
                  <button
                    type="button"
                    className={css.secondaryBtn}
                    onClick={handleExportExcelClick}
                    disabled={isExportingExcel}
                    title={isAr ? 'تصدير ميزان المراجعة إلى Excel' : 'Export to Excel'}
                  >
                    <FileSpreadsheet size={13} />
                    <span>{isAr ? (isExportingExcel ? 'جارِ التصدير...' : 'تصدير Excel') : (isExportingExcel ? 'Exporting...' : 'Export Excel')}</span>
                  </button>
                </div>
              )
            })}
            {trialBalanceViewMode === 'printable' ? (
              <div style={{ padding: '1.25rem' }}>
                {printableTrialBalanceBody}
              </div>
            ) : (
              <div className={css.tableContainer}>
                <table className={css.canonicalTable}>
                  <thead className={css.canonicalThead}>
                    <tr>
                      <th className={css.canonicalTh} style={{ width: '80px', textAlign: 'center' }}>{isAr ? 'الكود' : 'Code'}</th>
                      <th className={css.canonicalTh}>{isAr ? 'اسم الحساب' : 'Account Name'}</th>
                      <th className={css.canonicalTh} style={{ width: '90px', textAlign: 'center' }}>{isAr ? 'النوع' : 'Type'}</th>
                      <th className={css.canonicalTh} style={{ width: '130px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'حركات مدين' : 'Debit Mov.'}</th>
                      <th className={css.canonicalTh} style={{ width: '130px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'حركات دائن' : 'Credit Mov.'}</th>
                      <th className={css.canonicalTh} style={{ width: '140px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'رصيد ختامي مدين' : 'End Debit'}</th>
                      <th className={css.canonicalTh} style={{ width: '140px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'رصيد ختامي دائن' : 'End Credit'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalanceReport.rows.map(row => (
                      <tr
                        key={row.code}
                        className={css.canonicalRow}
                        role="button"
                        tabIndex={0}
                        aria-label={isAr ? `كشف حساب ${row.nameAr}` : `Statement for ${row.nameEn}`}
                        onClick={() => setSelectedAccountForModal(CANONICAL_COA[row.code])}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedAccountForModal(CANONICAL_COA[row.code]);
                          }
                        }}
                      >
                        <td className={css.canonicalTd} style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                          {row.code}
                        </td>
                        <td className={css.canonicalTd}>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{isAr ? row.nameAr : row.nameEn}</span>
                        </td>
                        <td className={css.canonicalTd} style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{row.category}</span>
                        </td>
                        <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                          <ERPLedgerAmount value={row.debitMovements} isAr={isAr} zeroAsDash />
                        </td>
                        <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                          <ERPLedgerAmount value={row.creditMovements} isAr={isAr} zeroAsDash />
                        </td>
                        <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                          <ERPLedgerAmount value={row.endingDebit} isAr={isAr} zeroAsDash color="#1e40af" />
                        </td>
                        <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                          <ERPLedgerAmount value={row.endingCredit} isAr={isAr} zeroAsDash color="#b45309" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                      <td colSpan={3} className={css.canonicalTd}>{isAr ? 'الإجمالي العام' : 'Grand Total'}</td>
                      <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                        <ERPLedgerAmount value={trialBalanceReport.sumDebits} isAr={isAr} />
                      </td>
                      <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                        <ERPLedgerAmount value={trialBalanceReport.sumCredits} isAr={isAr} />
                      </td>
                      <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                        <ERPLedgerAmount value={trialBalanceReport.sumEndingDebitBalances} isAr={isAr} color="#1e40af" />
                      </td>
                      <td className={css.canonicalTd} style={{ textAlign: isAr ? 'left' : 'right' }}>
                        <ERPLedgerAmount value={trialBalanceReport.sumEndingCreditBalances} isAr={isAr} color="#b45309" />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: BALANCE SHEET (قائمة المركز المالي) ─── */}
      {activeTab === 'balance_sheet' && (
        <BalanceSheetAnalyticsView
          accountStats={accountStats}
          journalEntries={journalEntries}
          isAr={isAr}
          currentAccent={currentAccent}
          onInspectAccount={(acc) => setSelectedAccountForModal(acc)}
          onExportExcel={onExportExcel}
        />
      )}

      {/* ─── TAB 5: INCOME STATEMENT (قائمة الأرباح والخسائر) ─── */}
      {activeTab === 'income_statement' && (
        <IncomeStatementAnalyticsView
          accountStats={accountStats}
          journalEntries={journalEntries}
          isAr={isAr}
          currentAccent={currentAccent}
          onInspectAccount={(acc) => setSelectedAccountForModal(acc)}
          onExportExcel={onExportExcel}
        />
      )}
      </div>


      {/* ─── ACCOUNT STATEMENT MODAL ─── */}
      {selectedAccountForModal && (
        <AccountLedgerModal
          account={selectedAccountForModal}
          journalEntries={journalEntries}
          contracts={contracts}
          properties={properties}
          onClose={() => setSelectedAccountForModal(null)}
          isAr={isAr}
        />
      )}

      {/* ─── TRIAL BALANCE PRINT PREVIEW MODAL ─── */}
      {showPrintPreview && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setShowPrintPreview(false)}
        >
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '960px', 
              maxHeight: '94vh', 
              overflowY: 'auto',
              borderRadius: '12px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <ZFPrintDocumentLayout
              documentTitle={isAr ? 'ميزان المراجعة وملخص الحسابات' : 'Trial Balance & Account Summary'}
              documentSubtitle={isAr ? 'جميع القيود المسجلة في دفتر الشركة، دون افتراض ترحيلها أو اعتمادها' : 'All recorded journal entries; posting and approval are not implied'}
              voucherCode={voucherCode}
              date={statementDate}
              onClose={() => setShowPrintPreview(false)}
              isAr={isAr}
              isReport
            >
              {printableTrialBalanceBody}
            </ZFPrintDocumentLayout>
          </div>
        </div>
      )}

      {/* Hidden print container for @media print */}
      <div className="zf-print-only">
        <ZFPrintDocumentLayout
          documentTitle={isAr ? 'ميزان المراجعة وملخص الحسابات' : 'Trial Balance & Account Summary'}
          documentSubtitle={isAr ? 'جميع القيود المسجلة في دفتر الشركة، دون افتراض ترحيلها أو اعتمادها' : 'All recorded journal entries; posting and approval are not implied'}
          voucherCode={voucherCode}
          date={statementDate}
          isAr={isAr}
          isReport
        >
          {printableTrialBalanceBody}
        </ZFPrintDocumentLayout>
      </div>
    </div>
  );
};

export default GeneralLedgerView;
