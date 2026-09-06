'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  BookOpen,
  Lock, 
  Unlock, 
  Search, 
  Eye, 
  Landmark, 
  TrendingUp, 
  Wallet, 
  Scale, 
  FileText,
  Filter,
  CheckCircle2,
  AlertCircle,
  Table,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  ArrowUpDown
} from 'lucide-react';
import { 
  ERPAccount, 
  ERPJournalEntry, 
  ERPAccountingPeriod 
} from '@/lib/erp/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { D } from '@/lib/erp/math';
import { JournalEntryPreview, localizeJournalDescription } from '@/components/erp/JournalEntryPreview';
import { AccountLedgerModal } from '../../AccountLedgerModal';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
import { GeneralLedgerMindmap } from './GeneralLedgerMindmap';
import styles from '../ZFWorkstationShell.module.css';

interface GeneralLedgerViewProps {
  journalEntries: ERPJournalEntry[];
  activePeriod: ERPAccountingPeriod;
  isAr?: boolean;
  isMutating?: boolean;
  onOpenQuickTransaction: () => void;
  onTogglePeriodStatus: (periodId: string, newStatus: 'OPEN' | 'LOCKED') => void;
  onNavigateToOpenQuestion: (questionId: string) => void;
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({
  journalEntries,
  activePeriod,
  isAr = true,
  isMutating = false,
  onOpenQuickTransaction,
  onTogglePeriodStatus
}) => {
  // Main Switch State: 'coa' | 'journal'
  const [activeTab, setActiveTab] = useState<'coa' | 'journal'>('coa');
  // Chart of Accounts View Mode: 'mindmap' (default interactive flow map) | 'table' (dense table)
  const [coaViewMode, setCoaViewMode] = useState<'mindmap' | 'table'>('mindmap');

  // Chart of Accounts State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [coaActivityFilter, setCoaActivityFilter] = useState<'all' | 'active' | 'zero'>('all');
  const [coaSortBy, setCoaSortBy] = useState<'code_asc' | 'code_desc' | 'name_asc' | 'balance_desc' | 'activity_desc'>('code_asc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAccountForModal, setSelectedAccountForModal] = useState<ERPAccount | null>(null);
  const [coaCurrentPage, setCoaCurrentPage] = useState<number>(1);
  const [coaPageSize, setCoaPageSize] = useState<number>(15);

  // Journal Entries Interactive State
  const [entriesViewMode, setEntriesViewMode] = useState<'table' | 'cards'>('table');
  const [entriesSearchQuery, setEntriesSearchQuery] = useState<string>('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [entriesSortBy, setEntriesSortBy] = useState<'date_desc' | 'date_asc' | 'entry_desc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [filterAccountInEntries, setFilterAccountInEntries] = useState<string | null>(null);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Compute live account balances & transaction counts from all posted journal entries
  const accountStats = useMemo(() => {
    const stats: Record<string, { debits: ReturnType<typeof D>; credits: ReturnType<typeof D>; count: number }> = {};
    
    Object.keys(CANONICAL_COA).forEach(code => {
      stats[code] = { debits: D(0), credits: D(0), count: 0 };
    });

    journalEntries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        if (!stats[line.account_code]) {
          stats[line.account_code] = { debits: D(0), credits: D(0), count: 0 };
        }
        stats[line.account_code].debits = stats[line.account_code].debits.plus(D(line.debit_amount));
        stats[line.account_code].credits = stats[line.account_code].credits.plus(D(line.credit_amount));
        stats[line.account_code].count += 1;
      });
    });

    return stats;
  }, [journalEntries]);

  // Executive KPI Aggregations
  const kpis = useMemo(() => {
    let totalCash = D(0);
    let totalAssets = D(0);
    let totalLiabilities = D(0);
    let totalWip = D(0);

    Object.values(CANONICAL_COA).forEach(acc => {
      const stats = accountStats[acc.account_code] || { debits: D(0), credits: D(0), count: 0 };
      const netBalance = acc.normal_balance === 'DEBIT'
        ? stats.debits.minus(stats.credits)
        : stats.credits.minus(stats.debits);

      if (acc.account_code === '101000' || acc.account_code === '102000') {
        totalCash = totalCash.plus(netBalance);
      }
      if (acc.account_type === 'ASSET') {
        totalAssets = totalAssets.plus(netBalance);
      }
      if (acc.account_type === 'LIABILITY') {
        totalLiabilities = totalLiabilities.plus(netBalance);
      }
      if (acc.account_code === '105000') {
        totalWip = totalWip.plus(netBalance);
      }
    });

    return {
      totalCash: totalCash.toFixed(2),
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      totalWip: totalWip.toFixed(2),
      entriesCount: journalEntries.length
    };
  }, [accountStats, journalEntries]);

  // Filtered Chart of Accounts
  const filteredAccounts = useMemo(() => {
    return Object.values(CANONICAL_COA).filter(acc => {
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'WIP') {
          if (acc.account_code !== '105000' && !acc.account_name_en.includes('WIP')) return false;
        } else if (acc.account_type !== selectedCategory) {
          return false;
        }
      }

      const stats = accountStats[acc.account_code] || { debits: D(0), credits: D(0), count: 0 };
      const netBalance = acc.normal_balance === 'DEBIT'
        ? stats.debits.minus(stats.credits)
        : stats.credits.minus(stats.debits);

      if (coaActivityFilter === 'active' && stats.count === 0) return false;
      if (coaActivityFilter === 'zero' && !netBalance.isZero()) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = acc.account_code.toLowerCase();
        const nameAr = (acc.account_name_ar || '').toLowerCase();
        const nameEn = (acc.account_name_en || '').toLowerCase();
        return code.includes(q) || nameAr.includes(q) || nameEn.includes(q);
      }

      return true;
    });
  }, [selectedCategory, coaActivityFilter, searchQuery, accountStats]);

  // Sorted Chart of Accounts
  const sortedAccounts = useMemo(() => {
    const list = [...filteredAccounts];
    list.sort((a, b) => {
      const statsA = accountStats[a.account_code] || { debits: D(0), credits: D(0), count: 0 };
      const statsB = accountStats[b.account_code] || { debits: D(0), credits: D(0), count: 0 };
      const netA = a.normal_balance === 'DEBIT' ? statsA.debits.minus(statsA.credits) : statsA.credits.minus(statsA.debits);
      const netB = b.normal_balance === 'DEBIT' ? statsB.debits.minus(statsB.credits) : statsB.credits.minus(statsB.debits);

      if (coaSortBy === 'code_asc') return a.account_code.localeCompare(b.account_code);
      if (coaSortBy === 'code_desc') return b.account_code.localeCompare(a.account_code);
      if (coaSortBy === 'name_asc') {
        const nameA = isAr ? a.account_name_ar : a.account_name_en;
        const nameB = isAr ? b.account_name_ar : b.account_name_en;
        return nameA.localeCompare(nameB, isAr ? 'ar' : 'en');
      }
      if (coaSortBy === 'balance_desc') return netB.abs().minus(netA.abs()).toNumber();
      if (coaSortBy === 'activity_desc') return statsB.count - statsA.count;
      return 0;
    });
    return list;
  }, [filteredAccounts, coaSortBy, accountStats, isAr]);

  const coaTotalPages = Math.ceil(sortedAccounts.length / coaPageSize) || 1;
  const paginatedAccounts = useMemo(() => {
    const start = (coaCurrentPage - 1) * coaPageSize;
    return sortedAccounts.slice(start, start + coaPageSize);
  }, [sortedAccounts, coaCurrentPage, coaPageSize]);

  const coaActiveFiltersCount = (selectedCategory !== 'all' ? 1 : 0) +
    (coaActivityFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    (coaSortBy !== 'code_asc' ? 1 : 0);

  const handleResetCoaFilters = () => {
    setSelectedCategory('all');
    setCoaActivityFilter('all');
    setCoaSortBy('code_asc');
    setSearchQuery('');
    setCoaCurrentPage(1);
  };

  // Filtered Journal Entries
  const filteredEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      if (selectedModuleFilter !== 'all' && entry.source_module !== selectedModuleFilter) {
        return false;
      }

      if (filterAccountInEntries) {
        const hasAccount = (entry.lines || []).some(l => l.account_code === filterAccountInEntries);
        if (!hasAccount) return false;
      }

      if (entriesSearchQuery.trim()) {
        const q = entriesSearchQuery.toLowerCase();
        const num = (entry.entry_number || '').toLowerCase();
        const desc = (entry.description || '').toLowerCase();
        const hasMatchingLine = (entry.lines || []).some(l => 
          (l.account_code || '').toLowerCase().includes(q) || 
          (l.memo || '').toLowerCase().includes(q)
        );
        return num.includes(q) || desc.includes(q) || hasMatchingLine;
      }

      return true;
    });
  }, [journalEntries, selectedModuleFilter, filterAccountInEntries, entriesSearchQuery]);

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

  // Pagination for entries
  const totalPages = Math.ceil(sortedEntries.length / pageSize) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEntries.slice(start, start + pageSize);
  }, [sortedEntries, currentPage, pageSize]);

  const entriesActiveFiltersCount = (selectedModuleFilter !== 'all' ? 1 : 0) +
    (filterAccountInEntries ? 1 : 0) +
    (entriesSearchQuery.trim() ? 1 : 0) +
    (entriesSortBy !== 'date_desc' ? 1 : 0);

  const handleResetEntriesFilters = () => {
    setSelectedModuleFilter('all');
    setFilterAccountInEntries(null);
    setEntriesSortBy('date_desc');
    setEntriesSearchQuery('');
    setCurrentPage(1);
  };

  // Expand / Collapse Handlers
  const toggleExpand = (entryId: string) => {
    setExpandedEntryIds(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedEntryIds(new Set(paginatedEntries.map(e => e.entry_id)));
  };

  const collapseAll = () => {
    setExpandedEntryIds(new Set());
  };

  const getEntryTotal = (entry: ERPJournalEntry) => {
    return (entry.lines || []).reduce((acc, l) => acc.plus(D(l.debit_amount)), D(0));
  };

  const isEntryBalanced = (entry: ERPJournalEntry) => {
    const dr = (entry.lines || []).reduce((acc, l) => acc.plus(D(l.debit_amount)), D(0));
    const cr = (entry.lines || []).reduce((acc, l) => acc.plus(D(l.credit_amount)), D(0));
    return dr.equals(cr);
  };

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case 'SALES':
        return { label: isAr ? 'عقود بيع ومقدمات' : 'Sales', bg: 'rgba(184, 144, 62, 0.08)', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' };
      case 'HANDOVER':
        return { label: isAr ? 'تسليم شقق' : 'Handover', bg: '#f0fdf4', text: '#15803d', border: 'rgba(22, 163, 74, 0.25)' };
      case 'RESCISSION':
        return { label: isAr ? 'إلغاء عقود' : 'Rescission', bg: '#fef2f2', text: '#b91c1c', border: 'rgba(220, 38, 38, 0.25)' };
      case 'EXPENSE':
        return { label: isAr ? 'مصاريف تشغيل' : 'Expense', bg: '#f8fafc', text: '#334155', border: '#cbd5e1' };
      case 'SYSTEM':
        return { label: isAr ? 'رصيد افتتاحي' : 'Opening', bg: 'rgba(184, 144, 62, 0.08)', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' };
      case 'WIP_ALLOCATION':
        return { label: isAr ? 'مصاريف مباني (WIP)' : 'WIP Costs', bg: '#fffbeb', text: '#b45309', border: 'rgba(245, 158, 11, 0.3)' };
      case 'PDC':
        return { label: isAr ? 'أقساط الخزنة' : 'Installments', bg: '#f0f9ff', text: '#0284c7', border: 'rgba(2, 132, 199, 0.25)' };
      case 'ESCALATION':
        return { label: isAr ? 'فروق أسعار' : 'Price Escalation', bg: '#fff7ed', text: '#c2410c', border: 'rgba(234, 88, 12, 0.25)' };
      case 'TAX':
        return { label: isAr ? 'ضرائب ورسوم' : 'Taxes', bg: '#fdf4ff', text: '#a21caf', border: 'rgba(162, 28, 175, 0.25)' };
      case 'CAPITAL_CALL':
        return { label: isAr ? 'ضخ الشركاء' : 'Capital Call', bg: 'rgba(184, 144, 62, 0.08)', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' };
      case 'MANUAL':
        return { label: isAr ? 'قيد يدوي' : 'Manual Entry', bg: '#f8fafc', text: '#475569', border: '#cbd5e1' };
      default:
        return { label: mod, bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    }
  };

  const getEntryTypeLabel = (entryNum: string) => {
    if (entryNum.startsWith('JE-PAY')) return isAr ? 'سند قبض وتحصيل' : 'Payment Receipt';
    if (entryNum.startsWith('JE-WIP')) return isAr ? 'مصروف مباني ومواد' : 'WIP Cost Entry';
    if (entryNum.startsWith('JE-RESC')) return isAr ? 'تسوية فسخ عقد' : 'Rescission Settlement';
    if (entryNum.startsWith('JE-HANDOVER')) return isAr ? 'محضر تسليم شقة' : 'Handover Protocol';
    if (entryNum.startsWith('JE-OPEN')) return isAr ? 'رصيد أول المدة' : 'Opening Balance';
    if (entryNum.startsWith('JE-EXP')) return isAr ? 'مصروف تشغيل' : 'Operating Expense';
    return null;
  };

  const typeColorMap: Record<string, { bg: string; text: string; border: string }> = {
    ASSET: { bg: '#f0fdf4', text: '#15803d', border: 'rgba(22, 163, 74, 0.25)' },
    LIABILITY: { bg: '#fffbeb', text: '#b45309', border: 'rgba(245, 158, 11, 0.25)' },
    CONTRA_LIABILITY: { bg: '#fef2f2', text: '#b91c1c', border: 'rgba(220, 38, 38, 0.25)' },
    EQUITY: { bg: 'rgba(184, 144, 62, 0.08)', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' },
    REVENUE: { bg: 'rgba(184, 144, 62, 0.08)', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' },
    EXPENSE: { bg: '#f8fafc', text: '#334155', border: '#cbd5e1' }
  };

  // Format helper for calm executive KPI typography
  const splitAmount = (dec: any) => {
    const str = dec.formatEGP(isAr);
    const lastSpaceIdx = str.lastIndexOf(' ');
    if (lastSpaceIdx === -1) return { num: str, cur: '' };
    return { num: str.substring(0, lastSpaceIdx), cur: str.substring(lastSpaceIdx + 1) };
  };

  return (
    <div className={styles.stageContainer}>
      {/* 1. Header & Stage Breadcrumb */}
      <div className={styles.stageHeader}>
        <div className={styles.stageTitleArea}>
          <div className={styles.stageBreadcrumb}>
            <span>FIN-OS</span>
            <span>/</span>
            <span>{isAr ? 'حسابات الشركة ودفتر اليومية' : 'General Ledger'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle}>
              {isAr ? 'حسابات الشركة ودفتر اليومية' : 'Chart of Accounts & Immutable Ledger'}
            </h1>
            <span style={{
              background: 'rgba(184, 144, 62, 0.08)',
              border: '1px solid rgba(184, 144, 62, 0.25)',
              color: '#946f23',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {isAr ? 'حسابات مضبوطة بالمليم' : 'Double Entry System'}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isAr 
              ? 'اضغط على أي حساب عشان تشوف تفاصيله، رصيده الحالي، وكشف حساب بكل الحركات المتسجلة عليه.'
              : 'Click any account row to inspect its business purpose, real estate role, and detailed statement of postings.'}
          </p>
        </div>

        <div className={styles.stageActions}>
          <button 
            onClick={onOpenQuickTransaction}
            disabled={isMutating}
            style={{
              background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: isMutating ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 14px rgba(197, 160, 89, 0.35)'
            }}
          >
            <Plus size={15} />
            <span>{isAr ? '+ تسجيل حركة / مصروف جديد' : '+ New Entry'}</span>
          </button>

          <button 
            onClick={() => onTogglePeriodStatus(
              activePeriod.period_id, 
              activePeriod.status === 'OPEN' ? 'LOCKED' : 'OPEN'
            )}
            disabled={isMutating}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              borderRadius: '10px',
              padding: '0.65rem 1.15rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: isMutating ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            {activePeriod.status === 'OPEN' ? <Lock size={15} color="#b45309" /> : <Unlock size={15} color="#946f23" />}
            <span>
              {activePeriod.status === 'OPEN'
                ? (isAr ? 'قفل الفترة (حماية من التعديل)' : 'Lock Period (Inv 0.9)')
                : (isAr ? 'فتح الفترة للتسجيل' : 'Unlock Period')}
            </span>
          </button>
        </div>
      </div>

      {/* 2. AUDITED CAPITAL BALANCE RIBBON (Corporate Accounting Archetype) */}
      <div className={styles.auditedBalanceRibbon}>
        <div className={styles.auditedBalanceItem}>
          <span className={styles.auditedBalanceLabel}>{isAr ? 'ممتلكات وفلوس الشركة' : 'Total Assets'}</span>
          <div className={styles.auditedBalanceValue}>
            <span>{D(kpis.totalAssets).formatEGP(isAr)}</span>
          </div>
          <span className={styles.auditedBalanceSubtext}>
            {isAr ? 'كاش جاهز بالبنك والخزنة: ' : 'Liquid portion: '}
            <strong className={styles.auditedCashHighlight}>{D(kpis.totalCash).formatEGP(isAr)}</strong>
          </span>
        </div>

        <div className={styles.auditedBalanceItem}>
          <span className={styles.auditedBalanceLabel}>{isAr ? 'الالتزامات ومستحقات على الشركة' : 'Liabilities & Advances'}</span>
          <div className={styles.auditedBalanceValue}>
            <span>{D(kpis.totalLiabilities).formatEGP(isAr)}</span>
          </div>
          <span className={styles.auditedBalanceSubtext}>
            {isAr ? 'مقدمات حجز وفلوس مؤجلة' : 'Advance deposits & maturities'}
          </span>
        </div>

        <div className={styles.auditedBalanceItem}>
          <span className={styles.auditedBalanceLabel}>{isAr ? 'صافي رأس مال الشركة' : 'Net Equity Position'}</span>
          <div className={styles.auditedBalanceValue}>
            <span className={styles.auditedEquityValue}>
              {D(kpis.totalAssets).minus(D(kpis.totalLiabilities)).formatEGP(isAr)}
            </span>
          </div>
          <span className={styles.auditedBalanceSubtext}>
            {isAr ? 'ممتلكات الشركة بعد خصم الالتزامات' : 'Assets minus Liabilities'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isAr ? 'flex-start' : 'flex-end', gap: '0.45rem' }}>
          <div className={styles.auditedStampBadge}>
            <ShieldCheck size={14} />
            <span>{isAr ? 'دفتر حسابات مضبوط بالمليم' : 'Audited Immutable Ledger'}</span>
          </div>
          <span className={styles.auditedEntryCount}>
            {kpis.entriesCount} {isAr ? 'حركة متسجلة ومعتمدة' : 'Posted journal entries'}
          </span>
        </div>
      </div>

      {/* 3. MASTER SWITCH: دليل الحسابات vs قيود اليومية المحصنة */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '0.75rem 1.15rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Switch Segmented Control */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: '#f1f5f9',
          padding: '0.25rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('coa')}
            style={{
              padding: '0.45rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'coa' ? '#ffffff' : 'transparent',
              color: activeTab === 'coa' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'coa' ? 800 : 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeTab === 'coa' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <BookOpen size={15} color={activeTab === 'coa' ? '#946f23' : '#64748b'} />
            <span>{isAr ? 'شجرة الحسابات' : 'Chart of Accounts'}</span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: activeTab === 'coa' ? 'rgba(184, 144, 62, 0.12)' : '#e2e8f0',
              color: activeTab === 'coa' ? '#946f23' : '#64748b'
            }}>
              {Object.keys(CANONICAL_COA).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('journal')}
            style={{
              padding: '0.45rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'journal' ? '#ffffff' : 'transparent',
              color: activeTab === 'journal' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'journal' ? 800 : 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: activeTab === 'journal' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldCheck size={15} color={activeTab === 'journal' ? '#946f23' : '#64748b'} />
            <span>{isAr ? 'دفتر اليومية والحركات' : 'Posted Journal Register'}</span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: activeTab === 'journal' ? 'rgba(184, 144, 62, 0.12)' : '#e2e8f0',
              color: activeTab === 'journal' ? '#946f23' : '#64748b'
            }}>
              {journalEntries.length}
            </span>
          </button>
        </div>

        {/* Right Info / View Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {activeTab === 'coa' ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: '#f1f5f9',
              padding: '0.2rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => setCoaViewMode('mindmap')}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: coaViewMode === 'mindmap' ? '#ffffff' : 'transparent',
                  color: coaViewMode === 'mindmap' ? '#0f172a' : '#64748b',
                  fontWeight: coaViewMode === 'mindmap' ? 800 : 700,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: coaViewMode === 'mindmap' ? '0 1px 2px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <TrendingUp size={13} color={coaViewMode === 'mindmap' ? '#946f23' : '#64748b'} />
                <span>{isAr ? 'لوحة الميزان والحسابات' : 'Visual Balance Sheet'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCoaViewMode('table')}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: coaViewMode === 'table' ? '#ffffff' : 'transparent',
                  color: coaViewMode === 'table' ? '#0f172a' : '#64748b',
                  fontWeight: coaViewMode === 'table' ? 800 : 700,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: coaViewMode === 'table' ? '0 1px 2px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Table size={13} color={coaViewMode === 'table' ? '#946f23' : '#64748b'} />
                <span>{isAr ? 'جدول الحسابات المفصل' : 'Table View'}</span>
              </button>
            </div>
          ) : (
            filterAccountInEntries ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(184, 144, 62, 0.08)',
                border: '1px solid rgba(184, 144, 62, 0.25)',
                padding: '0.25rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.74rem',
                color: '#946f23',
                fontWeight: 700
              }}>
                <span>{isAr ? `حركات حساب: ${filterAccountInEntries}` : `Filtered by: ${filterAccountInEntries}`}</span>
                <button
                  onClick={() => setFilterAccountInEntries(null)}
                  style={{ background: 'none', border: 'none', color: '#946f23', cursor: 'pointer', fontWeight: 900 }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {isAr ? 'دفتر يومية موثق ومدين = دائن بالمليم' : 'Immutable double-entry journal register compliant with IFRS 15'}
              </span>
            )
          )}
        </div>
      </div>

      {/* 4. ACTIVE VIEW: EITHER COA OR JOURNAL REGISTER */}
      {activeTab === 'coa' ? (
        coaViewMode === 'mindmap' ? (
          <GeneralLedgerMindmap
            isAr={isAr}
            journalEntries={journalEntries}
            accountStats={accountStats}
            onSelectAccountForModal={(acc) => setSelectedAccountForModal(acc)}
            onFilterAccountInJournal={(accountCode) => {
              setFilterAccountInEntries(accountCode);
              setActiveTab('journal');
              const el = document.getElementById('journal-entries-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        ) : (
          <>
            {/* Search & Filter Bar for Chart of Accounts */}
            <ZFFilterToolbar
        tabs={[
          { id: 'all', label: isAr ? 'كل الحسابات' : 'All Accounts' },
          { id: 'ASSET', label: isAr ? 'فلوس وأصول الشركة' : 'Assets' },
          { id: 'WIP', label: isAr ? 'مصاريف المباني والمشاريع' : 'WIP Projects' },
          { id: 'LIABILITY', label: isAr ? 'الالتزامات اللي علينا' : 'Liabilities' },
          { id: 'EQUITY', label: isAr ? 'رأس مال الشركاء' : 'Equity' },
          { id: 'REVENUE', label: isAr ? 'المبيعات والإيرادات' : 'Revenue' },
          { id: 'EXPENSE', label: isAr ? 'المصاريف والتشغيل' : 'Expenses' }
        ]}
        activeTab={selectedCategory}
        onTabChange={(tabId) => {
          setSelectedCategory(tabId);
          setCoaCurrentPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCoaCurrentPage(1);
        }}
        searchPlaceholder={isAr ? 'دوّر برقم الكود أو اسم الحساب...' : 'Search by code or title...'}
        filters={[
          {
            id: 'coa_activity',
            value: coaActivityFilter,
            onChange: (val) => {
              setCoaActivityFilter(val as any);
              setCoaCurrentPage(1);
            },
            ariaLabel: isAr ? 'تصفية النشاط' : 'Activity Filter',
            options: [
              { value: 'all', label: isAr ? 'كل الحسابات' : 'All Activity' },
              { value: 'active', label: isAr ? 'حسابات عليها حركات بس' : 'Active Only (>0 tx)' },
              { value: 'zero', label: isAr ? 'حسابات رصيدها صفر' : 'Zero Balance Only' }
            ]
          }
        ]}
        sortBy={coaSortBy}
        onSortChange={(val) => {
          setCoaSortBy(val as any);
          setCoaCurrentPage(1);
        }}
        sortOptions={[
          { value: 'code_asc', label: isAr ? 'الكود: من الأصغر' : 'Code (Ascending)' },
          { value: 'code_desc', label: isAr ? 'الكود: من الأكبر' : 'Code (Descending)' },
          { value: 'name_asc', label: isAr ? 'اسم الحساب: أ - ي' : 'Account Name (A-Z)' },
          { value: 'balance_desc', label: isAr ? 'الرصيد: الأكبر الأول' : 'Highest Balance' },
          { value: 'activity_desc', label: isAr ? 'الأكتر حركات الأول' : 'Most Active' }
        ]}
        sortAriaLabel={isAr ? 'ترتيب الحسابات' : 'Sort Accounts'}
        activeFiltersCount={coaActiveFiltersCount}
        onResetFilters={handleResetCoaFilters}
        isAr={isAr}
      />

      {/* 4. Interactive Chart of Accounts Grid */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '110px' }}>{isAr ? 'كود الحساب' : 'Code'}</th>
              <th>{isAr ? 'اسم الحساب (اضغط للتفاصيل)' : 'Account Title (Click for details)'}</th>
              <th style={{ width: '130px' }}>{isAr ? 'نوع الحساب' : 'Category'}</th>
              <th style={{ width: '110px' }}>{isAr ? 'طبيعة الرصيد' : 'Normal'}</th>
              <th style={{ minWidth: '180px', textAlign: isAr ? 'left' : 'right', whiteSpace: 'nowrap' }}>{isAr ? 'الرصيد الحالي' : 'Live Balance'}</th>
              <th style={{ width: '110px', textAlign: 'center' }}>{isAr ? 'عدد الحركات' : 'Activity'}</th>
              <th style={{ width: '130px', textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAccounts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                  {isAr ? 'مفيش حسابات مطابقة للبحث أو الفلتر.' : 'No accounts match the current filters.'}
                </td>
              </tr>
            ) : (
              paginatedAccounts.map(acc => {
              const isGated = acc.account_code === '103300';
              const stats = accountStats[acc.account_code] || { debits: D(0), credits: D(0), count: 0 };
              const netBalance = acc.normal_balance === 'DEBIT'
                ? stats.debits.minus(stats.credits)
                : stats.credits.minus(stats.debits);

              const isPositive = netBalance.greaterThan(0);
              const isZero = netBalance.isZero();
              const colors = typeColorMap[acc.account_type] || typeColorMap.ASSET;

              return (
                <tr 
                  key={acc.account_code}
                  onClick={() => setSelectedAccountForModal(acc)}
                  style={{
                    cursor: 'pointer',
                    opacity: isGated ? 0.75 : 1
                  }}
                >
                  {/* Account Code */}
                  <td>
                    <span style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 800,
                      color: isGated ? '#dc2626' : '#946f23',
                      background: isGated ? 'rgba(239, 68, 68, 0.08)' : 'rgba(184, 144, 62, 0.08)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      display: 'inline-block',
                      fontSize: '0.78rem',
                      border: `1px solid ${isGated ? 'rgba(239, 68, 68, 0.2)' : 'rgba(184, 144, 62, 0.2)'}`
                    }}>
                      {acc.account_code}
                    </span>
                  </td>

                  {/* Account Title */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>
                        {isAr ? acc.account_name_ar : acc.account_name_en}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                        {isAr ? acc.account_name_en : acc.account_name_ar}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: colors.text,
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      {acc.account_type}
                    </span>
                  </td>

                  {/* Normal Balance */}
                  <td>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#475569',
                      background: '#f1f5f9',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {acc.normal_balance}
                    </span>
                  </td>

                  {/* Live Balance */}
                  <td style={{ textAlign: isAr ? 'left' : 'right', whiteSpace: 'nowrap', minWidth: '180px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'baseline',
                      gap: '0.35rem',
                      fontFamily: 'var(--font-sans), sans-serif',
                      fontVariantNumeric: 'tabular-nums',
                      direction: 'ltr'
                    }}>
                      <span style={{
                        fontWeight: 900,
                        fontSize: '0.92rem',
                        color: isZero ? '#943b8' : (isPositive ? '#0f172a' : '#b91c1c'),
                        letterSpacing: '-0.02em'
                      }}>
                        {netBalance.toFixed(2).split('.')[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.{netBalance.toFixed(2).split('.')[1]}
                      </span>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: isZero ? '#94a3b8' : '#946f23',
                        fontFamily: 'var(--font-sans), sans-serif'
                      }}>
                        {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  </td>

                  {/* Activity Count */}
                  <td style={{ textAlign: 'center' }}>
                    {stats.count > 0 ? (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: '#946f23',
                        background: 'rgba(184, 144, 62, 0.1)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        border: '1px solid rgba(184, 144, 62, 0.2)'
                      }}>
                        {isAr ? `${stats.count} حركة` : `${stats.count} tx`}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  {/* Details Action Button */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAccountForModal(acc);
                        }}
                        style={{
                          background: 'rgba(184, 144, 62, 0.08)',
                          border: '1px solid rgba(184, 144, 62, 0.25)',
                          color: '#946f23',
                          borderRadius: '6px',
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Eye size={12} />
                        <span>{isAr ? 'كشف حساب' : 'Statement'}</span>
                      </button>

                      {stats.count > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFilterAccountInEntries(acc.account_code);
                            setActiveTab('journal');
                          }}
                          title={isAr ? 'عرض حركات الحساب ده' : 'Filter journal entries by this account'}
                          style={{
                            background: 'rgba(148, 111, 35, 0.08)',
                            border: '1px solid rgba(148, 111, 35, 0.25)',
                            color: '#946f23',
                            borderRadius: '6px',
                            padding: '0.25rem 0.4rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <Filter size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>

      <ZFPagination
        currentPage={coaCurrentPage}
        totalPages={coaTotalPages}
        totalItems={sortedAccounts.length}
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
          </>
        )
      ) : (
        <div id="journal-entries-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Register Section Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '1.15rem 1.35rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="#946f23" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'دفتر اليومية والحركات' : 'Posted Immutable Journal Register'}
              </h3>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
              {filterAccountInEntries ? (
                <span>
                  {isAr ? `حركات حساب: ${filterAccountInEntries}` : `Filtered by account: ${filterAccountInEntries}`}
                  {' — '}
                  <button 
                    onClick={() => setFilterAccountInEntries(null)}
                    style={{ background: 'none', border: 'none', color: '#946f23', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.74rem', fontWeight: 700 }}
                  >
                    {isAr ? 'مسح الفلتر وعرض الكل' : 'Clear Filter & Show All'}
                  </button>
                </span>
              ) : (
                isAr ? 'دفتر يومية موثق ومدين = دائن 0.00 بالمليم.' : 'Organized double-entry journal register compliant with IFRS 15.'
              )}
            </span>
          </div>

          {/* Expand Controls for Table Mode */}
          {entriesViewMode === 'table' && (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={expandAll}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <ChevronDown size={13} />
                <span>{isAr ? 'فتح الكل' : 'Expand All'}</span>
              </button>
              <button
                onClick={collapseAll}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <ChevronUp size={13} />
                <span>{isAr ? 'قفل الكل' : 'Collapse All'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Journal Filter & Search Bar */}
        <ZFFilterToolbar
          tabs={[
            { id: 'all', label: isAr ? 'كل الحركات' : 'All Types' },
            { id: 'SALES', label: isAr ? 'عقود بيع ومقدمات' : 'Sales & Advances' },
            { id: 'WIP_ALLOCATION', label: isAr ? 'مصاريف مباني (WIP)' : 'WIP Costs' },
            { id: 'HANDOVER', label: isAr ? 'تسليم شقق' : 'Handovers' },
            { id: 'RESCISSION', label: isAr ? 'إلغاء عقود وترجيع فلوس' : 'Rescissions' },
            { id: 'EXPENSE', label: isAr ? 'مصاريف وتشغيل' : 'Expenses' },
            { id: 'PDC', label: isAr ? 'أقساط الخزنة' : 'Installments' }
          ]}
          activeTab={selectedModuleFilter}
          onTabChange={(tabId) => {
            setSelectedModuleFilter(tabId);
            setCurrentPage(1);
          }}
          searchQuery={entriesSearchQuery}
          onSearchChange={(q) => {
            setEntriesSearchQuery(q);
            setCurrentPage(1);
          }}
          searchPlaceholder={isAr ? 'دوّر برقم القيد أو الشرح...' : 'Search entry number or desc...'}
          sortBy={entriesSortBy}
          onSortChange={(val) => {
            setEntriesSortBy(val as any);
            setCurrentPage(1);
          }}
          sortOptions={[
            { value: 'date_desc', label: isAr ? 'التاريخ: الأحدث الأول' : 'Date: Newest First' },
            { value: 'date_asc', label: isAr ? 'التاريخ: الأقدم الأول' : 'Date: Oldest First' },
            { value: 'entry_desc', label: isAr ? 'رقم القيد: الأكبر الأول' : 'Entry Number (Desc)' },
            { value: 'amount_desc', label: isAr ? 'المبلغ: الأكبر الأول' : 'Amount: Highest First' },
            { value: 'amount_asc', label: isAr ? 'المبلغ: الأقل الأول' : 'Amount: Lowest First' }
          ]}
          sortAriaLabel={isAr ? 'ترتيب القيود' : 'Sort Journal Entries'}
          activeFiltersCount={entriesActiveFiltersCount}
          onResetFilters={handleResetEntriesFilters}
          viewMode={entriesViewMode}
          onViewModeChange={(mode) => setEntriesViewMode(mode as any)}
          viewModeOptions={[
            { mode: 'table', label: isAr ? 'جدول' : 'Table', icon: <Table size={13} /> },
            { mode: 'cards', label: isAr ? 'كروت' : 'Cards', icon: <LayoutGrid size={13} /> }
          ]}
          isAr={isAr}
        />

        {/* VIEW 1: DENSE REGISTER TABLE (Default & Highly Scalable) */}
        {entriesViewMode === 'table' ? (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}></th>
                  <th style={{ width: '220px' }}>{isAr ? 'رقم القيد والتاريخ' : 'Entry # & Date'}</th>
                  <th style={{ width: '140px' }}>{isAr ? 'نوع الحركة' : 'Source'}</th>
                  <th>{isAr ? 'بيان القيد' : 'Description'}</th>
                  <th style={{ width: '160px' }}>{isAr ? 'الحسابات' : 'Accounts Involved'}</th>
                  <th style={{ width: '150px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>{isAr ? 'مضبوط؟' : 'Balance'}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      {isAr ? 'مفيش قيود مطابقة للبحث أو الفلتر.' : 'No journal entries match the current filter.'}
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map(entry => {
                    const isExpanded = expandedEntryIds.has(entry.entry_id);
                    const totalAmt = getEntryTotal(entry);
                    const isBalanced = isEntryBalanced(entry);
                    const modBadge = getModuleBadge(entry.source_module);
                    const accountsInvolved = Array.from(new Set((entry.lines || []).map(l => l.account_code)));
                    const typeLabel = getEntryTypeLabel(entry.entry_number);

                    return (
                      <React.Fragment key={entry.entry_id}>
                        <tr 
                          onClick={() => toggleExpand(entry.entry_id)}
                          style={{
                            cursor: 'pointer',
                            background: isExpanded ? 'rgba(184, 144, 62, 0.04)' : undefined
                          }}
                        >
                          {/* Expand/Collapse Chevron */}
                          <td style={{ textAlign: 'center', padding: '0.65rem 0.4rem', color: '#94a3b8' }}>
                            {isExpanded ? <ChevronUp size={15} color="#946f23" /> : <ChevronDown size={15} />}
                          </td>

                          {/* Entry Number & Date */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontVariantNumeric: 'tabular-nums',
                                  fontWeight: 800,
                                  fontSize: '0.78rem',
                                  color: '#946f23',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}>
                                  <Lock size={11} color="#946f23" />
                                  <span>{entry.entry_number}</span>
                                </span>
                                {typeLabel && (
                                  <span style={{
                                    fontSize: '0.64rem',
                                    fontWeight: 700,
                                    color: '#475569',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    padding: '0.08rem 0.35rem',
                                    borderRadius: '4px'
                                  }}>
                                    {typeLabel}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                                {entry.entry_date}
                              </span>
                            </div>
                          </td>

                          {/* Source Module Badge */}
                          <td>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: modBadge.text,
                              background: modBadge.bg,
                              border: `1px solid ${modBadge.border}`,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              display: 'inline-block'
                            }}>
                              {modBadge.label}
                            </span>
                          </td>

                          {/* Description */}
                          <td>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem' }}>
                              {localizeJournalDescription(entry.description, isAr)}
                            </span>
                          </td>

                          {/* Accounts Involved */}
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              {accountsInvolved.map(accCode => (
                                <span 
                                  key={accCode}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const acc = CANONICAL_COA[accCode];
                                    if (acc) setSelectedAccountForModal(acc);
                                  }}
                                  title={isAr ? 'اضغط عشان تفتح كشف الحساب' : 'Click to inspect account'}
                                  style={{
                                    fontVariantNumeric: 'tabular-nums',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#334155',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {accCode}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Total Amount */}
                          <td style={{ textAlign: isAr ? 'left' : 'right' }}>
                            <span style={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              color: '#0f172a',
                              whiteSpace: 'nowrap'
                            }}>
                              {splitAmount(totalAmt).num}{' '}
                              <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 700 }}>
                                {splitAmount(totalAmt).cur}
                              </span>
                            </span>
                          </td>

                          {/* Balance Check */}
                          <td style={{ textAlign: 'center' }}>
                            {isBalanced ? (
                              <span style={{
                                fontSize: '0.68rem',
                                color: '#15803d',
                                background: '#f0fdf4',
                                border: '1px solid rgba(22, 163, 74, 0.25)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '999px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                <CheckCircle2 size={10} />
                                <span>{isAr ? 'مضبوط' : 'OK'}</span>
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.66rem',
                                color: '#dc2626',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '999px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}>
                                <AlertCircle size={10} />
                                <span>{isAr ? 'مش متطابق' : 'Unbalanced'}</span>
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Accordion Row */}
                        {isExpanded && (
                          <tr style={{ background: '#f8fafc' }}>
                            <td colSpan={7} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                              }}>
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
        ) : (
          /* VIEW 2: CARDS VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {paginatedEntries.length === 0 ? (
              <div style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: '#ffffff',
                border: '1px dashed #e2e8f0',
                borderRadius: '14px',
                color: '#64748b'
              }}>
                {isAr ? 'مفيش حركات مطابقة للفلتر.' : 'No journal entries match the current filter.'}
              </div>
            ) : (
              paginatedEntries.map(entry => (
                <div 
                  key={entry.entry_id}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <JournalEntryPreview entry={entry} isDraft={false} isAr={isAr} />
                </div>
              ))
            )}
          </div>
        )}

        {/* Unified Pagination Bar */}
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
      )}

      {/* Account Statement & Educational Guide Modal */}
      {selectedAccountForModal && (
        <AccountLedgerModal
          account={selectedAccountForModal}
          journalEntries={journalEntries}
          onClose={() => setSelectedAccountForModal(null)}
          isAr={isAr}
        />
      )}
    </div>
  );
};
