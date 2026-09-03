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
  ShieldCheck
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

  // Chart of Accounts State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAccountForModal, setSelectedAccountForModal] = useState<ERPAccount | null>(null);

  // Journal Entries Interactive State
  const [entriesViewMode, setEntriesViewMode] = useState<'table' | 'cards'>('table');
  const [entriesSearchQuery, setEntriesSearchQuery] = useState<string>('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
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
      if (acc.account_code === '105000') {
        totalWip = totalWip.plus(netBalance);
      }
      if (acc.account_type === 'LIABILITY' || acc.account_type === 'CONTRA_LIABILITY') {
        totalLiabilities = totalLiabilities.plus(netBalance);
      }
    });

    return {
      totalCash,
      totalAssets,
      totalLiabilities,
      totalWip,
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

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = acc.account_code.toLowerCase();
        const nameAr = (acc.account_name_ar || '').toLowerCase();
        const nameEn = (acc.account_name_en || '').toLowerCase();
        return code.includes(q) || nameAr.includes(q) || nameEn.includes(q);
      }

      return true;
    });
  }, [selectedCategory, searchQuery]);

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

  // Pagination for entries
  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

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
        return { label: isAr ? 'عقود بيع' : 'Sales', bg: 'rgba(184, 144, 62, 0.08)', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' };
      case 'HANDOVER':
        return { label: isAr ? 'محضر تسليم' : 'Handover', bg: '#f0fdf4', text: '#15803d', border: 'rgba(22, 163, 74, 0.25)' };
      case 'RESCISSION':
        return { label: isAr ? 'فسخ تعاقد' : 'Rescission', bg: '#fef2f2', text: '#b91c1c', border: 'rgba(220, 38, 38, 0.25)' };
      case 'EXPENSE':
        return { label: isAr ? 'مصروف تشغيل' : 'Expense', bg: '#f8fafc', text: '#334155', border: '#cbd5e1' };
      case 'SYSTEM':
        return { label: isAr ? 'رصيد افتتاحي' : 'Opening', bg: 'rgba(184, 144, 62, 0.08)', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' };
      default:
        return { label: mod, bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    }
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
            <span>{isAr ? 'دفتر الأستاذ العام' : 'General Ledger'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle}>
              {isAr ? 'دليل الحسابات وقيود اليومية المحصنة' : 'Chart of Accounts & Immutable Ledger'}
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
              {isAr ? 'نظام القيد المزدوج' : 'Double Entry System'}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isAr 
              ? 'انقر على أي بند أو حساب لاستعراض وظيفته، دوره في التطوير العقاري، وكشف حسابه الدفتري التفصيلي.'
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
            <span>{isAr ? '+ قيد / مصروف جديد' : '+ New Entry'}</span>
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
                ? (isAr ? 'إقفال الفترة المحاسبية' : 'Lock Period (Inv 0.9)')
                : (isAr ? 'إعادة فتح الفترة' : 'Unlock Period')}
            </span>
          </button>
        </div>
      </div>

      {/* 2. 4 Executive KPI Cards (Calm Architectural Alabaster Aesthetic) */}
      <div className={styles.kpiGrid}>
        {/* Card 1: Available Liquid Cash */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>{isAr ? 'السيولة النقدية المتاحة (خزينة وبنوك)' : 'Available Liquid Cash'}</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Wallet size={17} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            <span>{splitAmount(kpis.totalCash).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.totalCash).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#15803d', display: 'inline-block' }} />
              {isAr ? 'خزينة وبنوك [101+102]' : 'Safe & Banks'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'سيولة جاهزة للصرف' : 'cleared liquidity'}</span>
          </div>
        </div>

        {/* Card 2: Total Assets */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>{isAr ? 'إجمالي الأصول المدارة (Total Assets)' : 'Total Capital Assets'}</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Landmark size={17} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            <span>{splitAmount(kpis.totalAssets).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.totalAssets).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#475569', display: 'inline-block' }} />
              {isAr ? 'أصول ومشروعات WIP' : 'Assets & WIP'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'محفظة الأصول الرأسمالية' : 'capital portfolio'}</span>
          </div>
        </div>

        {/* Card 3: Liabilities & Advances */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>{isAr ? 'الالتزامات وإيرادات العقود المؤجلة' : 'Liabilities & Advances'}</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Scale size={17} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            <span>{splitAmount(kpis.totalLiabilities).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.totalLiabilities).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
              {isAr ? 'دفعات مقدمة ومستحقات' : 'Payables & Advances'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'التزامات حتى التسليم' : 'due at delivery'}</span>
          </div>
        </div>

        {/* Card 4: Immutable Ledger Entries Count (Flagship Gold Card) */}
        <div 
          className={`${styles.kpiCard} ${styles.flagshipCard}`}
          onClick={() => setActiveTab('journal')}
          style={{ cursor: 'pointer' }}
          title={isAr ? 'اضغط لعرض سجل القيود المحصنة' : 'Click to view journal entries'}
        >
          <div className={styles.kpiHeader}>
            <span className={`${styles.kpiLabel} ${styles.flagshipLabel}`}>
              {isAr ? 'القيود المحصنة بالدفاتر' : 'Posted Ledger Entries'}
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'rgba(184, 144, 62, 0.1)',
              border: '1px solid rgba(184, 144, 62, 0.3)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={17} />
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#946f23' }}>
            <span>{kpis.entriesCount}</span>
            <span className={styles.kpiCurrency} style={{ color: '#946f23' }}>{isAr ? 'قيد مرحل' : 'Entries'}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ borderColor: 'rgba(184, 144, 62, 0.3)', background: 'rgba(184, 144, 62, 0.06)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#946f23', display: 'inline-block' }} />
              <span style={{ color: '#946f23', fontWeight: 800 }}>{isAr ? 'غير قابلة للتعديل' : 'Immutable'}</span>
            </span>
            <span className={styles.kpiNote}>{isAr ? 'سجل تدقيق كامل' : 'audit-logged'}</span>
          </div>
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
            <span>{isAr ? 'دليل الحسابات والأرصدة' : 'Chart of Accounts'}</span>
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
            <span>{isAr ? 'سجل قيود اليومية المحصنة' : 'Posted Journal Register'}</span>
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

        {/* Right Info / Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {activeTab === 'coa' ? (
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {isAr ? 'عرض الأرصدة الحية والحركات وفق شجرة الحسابات' : 'Live balances and activity across canonical accounts'}
            </span>
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
                <span>{isAr ? `تصفية بحساب: ${filterAccountInEntries}` : `Filtered by: ${filterAccountInEntries}`}</span>
                <button
                  onClick={() => setFilterAccountInEntries(null)}
                  style={{ background: 'none', border: 'none', color: '#946f23', cursor: 'pointer', fontWeight: 900 }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {isAr ? 'قيود دفترية مزدوجة معتمدة وغير قابلة للتعديل IFRS 15' : 'Immutable double-entry journal register compliant with IFRS 15'}
              </span>
            )
          )}
        </div>
      </div>

      {/* 4. ACTIVE VIEW: EITHER COA OR JOURNAL REGISTER */}
      {activeTab === 'coa' ? (
        <>
          {/* Search & Filter Bar for Chart of Accounts */}
      <div className={styles.toolbar}>
        <div className={styles.tabBar}>
          {[
            { id: 'all', labelAr: 'كافة الحسابات (الكل)', labelEn: 'All Accounts' },
            { id: 'ASSET', labelAr: 'الأصول والسيولة', labelEn: 'Assets' },
            { id: 'WIP', labelAr: 'مشاريع تحت التنفيذ (WIP)', labelEn: 'WIP Projects' },
            { id: 'LIABILITY', labelAr: 'الالتزامات والدفعات', labelEn: 'Liabilities' },
            { id: 'EQUITY', labelAr: 'حقوق الملكية', labelEn: 'Equity' },
            { id: 'REVENUE', labelAr: 'الإيرادات', labelEn: 'Revenue' },
            { id: 'EXPENSE', labelAr: 'المصروفات والتكاليف', labelEn: 'Expenses' }
          ].map(tab => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            );
          })}
        </div>

        <div className={styles.searchBox}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالكود أو اسم الحساب...' : 'Search by code or title...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. Interactive Chart of Accounts Grid */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '110px' }}>{isAr ? 'كود الحساب' : 'Code'}</th>
              <th>{isAr ? 'اسم وتوصيف الحساب (اضغط للتفاصيل)' : 'Account Title (Click for details)'}</th>
              <th style={{ width: '130px' }}>{isAr ? 'التصنيف' : 'Category'}</th>
              <th style={{ width: '110px' }}>{isAr ? 'طبيعة الرصيد' : 'Normal'}</th>
              <th style={{ minWidth: '180px', textAlign: isAr ? 'left' : 'right', whiteSpace: 'nowrap' }}>{isAr ? 'الرصيد الدفتري الحالي' : 'Live Balance'}</th>
              <th style={{ width: '110px', textAlign: 'center' }}>{isAr ? 'الحركات' : 'Activity'}</th>
              <th style={{ width: '130px', textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map(acc => {
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
                        color: isZero ? '#94a3b8' : (isPositive ? '#0f172a' : '#b91c1c'),
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
                        <span>{isAr ? 'كشف الحساب' : 'Statement'}</span>
                      </button>

                      {stats.count > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFilterAccountInEntries(acc.account_code);
                            setActiveTab('journal');
                          }}
                          title={isAr ? 'تصفية قيود اليومية بهذا الحساب' : 'Filter journal entries by this account'}
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
            })}
          </tbody>
        </table>
      </div>
        </>
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
                {isAr ? 'سجل قيود اليومية المرحلة والمحصنة (General Journal Register)' : 'Posted Immutable Journal Register'}
              </h3>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
              {filterAccountInEntries ? (
                <span>
                  {isAr ? `تصفية القيود لحساب: ${filterAccountInEntries}` : `Filtered by account: ${filterAccountInEntries}`}
                  {' — '}
                  <button 
                    onClick={() => setFilterAccountInEntries(null)}
                    style={{ background: 'none', border: 'none', color: '#946f23', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.74rem', fontWeight: 700 }}
                  >
                    {isAr ? 'إلغاء التصفية وعرض الكل' : 'Clear Filter & Show All'}
                  </button>
                </span>
              ) : (
                isAr ? 'سجل محاسبي منظم بنظام القيد المزدوج وفق معايير المحاسبة العقارية IFRS 15.' : 'Organized double-entry journal register compliant with IFRS 15.'
              )}
            </span>
          </div>

          {/* View Mode & Expand Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
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
                  <span>{isAr ? 'توسيع الكل' : 'Expand All'}</span>
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
                  <span>{isAr ? 'طي الكل' : 'Collapse All'}</span>
                </button>
              </div>
            )}

            {/* View Mode Switcher (Table vs Cards) */}
            <div className={styles.viewModeGroup}>
              <button
                className={`${styles.viewModeBtn} ${entriesViewMode === 'table' ? styles.viewModeBtnActive : ''}`}
                onClick={() => setEntriesViewMode('table')}
                title={isAr ? 'عرض جدول القيود المدمج' : 'Dense Register Table'}
              >
                <Table size={13} />
                <span>{isAr ? 'جدول مدمج' : 'Table'}</span>
              </button>

              <button
                className={`${styles.viewModeBtn} ${entriesViewMode === 'cards' ? styles.viewModeBtnActive : ''}`}
                onClick={() => setEntriesViewMode('cards')}
                title={isAr ? 'عرض البطاقات' : 'Cards View'}
              >
                <LayoutGrid size={13} />
                <span>{isAr ? 'بطاقات' : 'Cards'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Journal Filter & Search Sub-bar */}
        <div className={styles.toolbar}>
          <div className={styles.tabBar}>
            {[
              { id: 'all', labelAr: 'كافة المعاملات', labelEn: 'All Types' },
              { id: 'SALES', labelAr: 'عقود بيع ومقدمات', labelEn: 'Sales & Advances' },
              { id: 'HANDOVER', labelAr: 'تسليم وحدات', labelEn: 'Handovers' },
              { id: 'RESCISSION', labelAr: 'فسخ عقود', labelEn: 'Rescissions' },
              { id: 'EXPENSE', labelAr: 'مصروفات تشغيل', labelEn: 'Expenses' }
            ].map(pill => {
              const active = selectedModuleFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    setSelectedModuleFilter(pill.id);
                    setCurrentPage(1);
                  }}
                  className={`${styles.tabBtn} ${active ? styles.tabBtnActive : ''}`}
                >
                  {isAr ? pill.labelAr : pill.labelEn}
                </button>
              );
            })}
          </div>

          <div className={styles.searchBox}>
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder={isAr ? 'بحث برقم القيد أو الوصف...' : 'Search entry number or desc...'}
              value={entriesSearchQuery}
              onChange={e => {
                setEntriesSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* VIEW 1: DENSE REGISTER TABLE (Default & Highly Scalable) */}
        {entriesViewMode === 'table' ? (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}></th>
                  <th style={{ width: '190px' }}>{isAr ? 'رقم القيد والتاريخ' : 'Entry # & Date'}</th>
                  <th style={{ width: '130px' }}>{isAr ? 'المعاملة' : 'Source'}</th>
                  <th>{isAr ? 'بيان وشرح القيد المحاسبي' : 'Description'}</th>
                  <th style={{ width: '160px' }}>{isAr ? 'الحسابات المتأثرة' : 'Accounts Involved'}</th>
                  <th style={{ width: '150px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'قيمة القيد' : 'Amount'}</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>{isAr ? 'التوازن' : 'Balance'}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      {isAr ? 'لا توجد قيود مطابقة لمعايير البحث الحالية.' : 'No journal entries match the current filter.'}
                    </td>
                  </tr>
                ) : (
                  paginatedEntries.map(entry => {
                    const isExpanded = expandedEntryIds.has(entry.entry_id);
                    const totalAmt = getEntryTotal(entry);
                    const isBalanced = isEntryBalanced(entry);
                    const modBadge = getModuleBadge(entry.source_module);
                    const accountsInvolved = Array.from(new Set((entry.lines || []).map(l => l.account_code)));

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
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                color: '#946f23',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}>
                                <Lock size={12} color="#946f23" />
                                <span>{entry.entry_number}</span>
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
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
                                  title={isAr ? 'اضغط لفتح كشف حساب البند' : 'Click to inspect account'}
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
                                <span>{isAr ? 'متوازن' : 'OK'}</span>
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
                                <span>{isAr ? 'غير متوازن' : 'Unbalanced'}</span>
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
                                border: '1px solid #e2e8f0',
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
                {isAr ? 'لا توجد قيود يومية مسجلة تطابق التصفية الحالية.' : 'No journal entries match the current filter.'}
              </div>
            ) : (
              paginatedEntries.map(entry => (
                <div 
                  key={entry.entry_id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
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

        {/* Pagination Bar */}
        {filteredEntries.length > pageSize && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.65rem 1.25rem'
          }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {isAr ? (
                <span>
                  عرض <strong>{(currentPage - 1) * pageSize + 1}</strong> إلى <strong>{Math.min(currentPage * pageSize, filteredEntries.length)}</strong> من أصل <strong>{filteredEntries.length}</strong> قيد مرحل
                </span>
              ) : (
                <span>
                  Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(currentPage * pageSize, filteredEntries.length)}</strong> of <strong>{filteredEntries.length}</strong> entries
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.74rem',
                  outline: 'none'
                }}
              >
                <option value={10}>10 {isAr ? 'قيود' : '/ page'}</option>
                <option value={25}>25 {isAr ? 'قيداً' : '/ page'}</option>
                <option value={50}>50 {isAr ? 'قيداً' : '/ page'}</option>
              </select>

              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: currentPage <= 1 ? '#cbd5e1' : '#0f172a',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', padding: '0.25rem 0.6rem' }}>
                  {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: currentPage >= totalPages ? '#cbd5e1' : '#0f172a',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}
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
