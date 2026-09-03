'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
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
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { 
  ERPAccount, 
  ERPJournalEntry, 
  ERPAccountingPeriod 
} from '@/lib/erp/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { D } from '@/lib/erp/math';
import { ImmutableRecordFrame } from '@/components/erp/ImmutableRecordFrame';
import { JournalEntryPreview, localizeJournalDescription, localizeJournalMemo } from '@/components/erp/JournalEntryPreview';
import { AccountLedgerModal } from './AccountLedgerModal';
import subStyles from './ZFSubprogram.module.css';

interface GeneralLedgerViewProps {
  journalEntries: ERPJournalEntry[];
  activePeriod: ERPAccountingPeriod;
  isAr: boolean;
  isMutating: boolean;
  onOpenQuickTransaction: () => void;
  onTogglePeriodStatus: (periodId: string, newStatus: 'OPEN' | 'LOCKED') => void;
  onNavigateToOpenQuestion: (questionId: string) => void;
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({
  journalEntries,
  activePeriod,
  isAr,
  isMutating,
  onOpenQuickTransaction,
  onTogglePeriodStatus,
  onNavigateToOpenQuestion
}) => {
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
      const s = accountStats[acc.account_code] || { debits: D(0), credits: D(0), count: 0 };
      const net = acc.normal_balance === 'DEBIT' 
        ? s.debits.minus(s.credits) 
        : s.credits.minus(s.debits);

      if (acc.account_code === '101000' || acc.account_code === '102000' || acc.account_code === '102100') {
        totalCash = totalCash.plus(net);
      }
      if (acc.account_type === 'ASSET') {
        totalAssets = totalAssets.plus(net);
        if (acc.account_code.startsWith('15')) {
          totalWip = totalWip.plus(net);
        }
      } else if (acc.account_type === 'LIABILITY') {
        totalLiabilities = totalLiabilities.plus(net);
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

  // Filtered Accounts for Table
  const filteredAccounts = useMemo(() => {
    return Object.values(CANONICAL_COA).filter(acc => {
      if (selectedCategory === 'ASSET' && acc.account_type !== 'ASSET') return false;
      if (selectedCategory === 'WIP' && !acc.account_code.startsWith('15')) return false;
      if (selectedCategory === 'LIABILITY' && acc.account_type !== 'LIABILITY' && acc.account_type !== 'CONTRA_LIABILITY') return false;
      if (selectedCategory === 'EQUITY' && acc.account_type !== 'EQUITY') return false;
      if (selectedCategory === 'REVENUE' && acc.account_type !== 'REVENUE') return false;
      if (selectedCategory === 'EXPENSE' && acc.account_type !== 'EXPENSE') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = acc.account_code.toLowerCase();
        const titleAr = (acc.account_name_ar || '').toLowerCase();
        const titleEn = (acc.account_name_en || '').toLowerCase();
        return code.includes(q) || titleAr.includes(q) || titleEn.includes(q);
      }

      return true;
    });
  }, [selectedCategory, searchQuery]);

  // Filtered Journal Entries
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      // 1. Account filter
      if (filterAccountInEntries) {
        const hasAccount = (entry.lines || []).some(l => l.account_code === filterAccountInEntries);
        if (!hasAccount) return false;
      }

      // 2. Module filter
      if (selectedModuleFilter !== 'all') {
        if (entry.source_module !== selectedModuleFilter) return false;
      }

      // 3. Search filter
      if (entriesSearchQuery.trim()) {
        const q = entriesSearchQuery.toLowerCase().trim();
        const num = (entry.entry_number || '').toLowerCase();
        const desc = (entry.description || '').toLowerCase();
        const actor = (entry.created_by || '').toLowerCase();
        const hasLineMatch = (entry.lines || []).some(l => 
          (l.memo || '').toLowerCase().includes(q) || 
          l.account_code.includes(q) || 
          l.debit_amount.includes(q) || 
          l.credit_amount.includes(q)
        );
        return num.includes(q) || desc.includes(q) || actor.includes(q) || hasLineMatch;
      }

      return true;
    });
  }, [journalEntries, filterAccountInEntries, selectedModuleFilter, entriesSearchQuery]);

  // Pagination for Journal Entries
  const totalPages = Math.max(1, Math.ceil(filteredJournalEntries.length / pageSize));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredJournalEntries.slice(start, start + pageSize);
  }, [filteredJournalEntries, currentPage, pageSize]);

  // Toggle Accordion expansion
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

  // Helper for entry totals & balance
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
        return { label: isAr ? 'عقود بيع' : 'Sales', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.35)' };
      case 'HANDOVER':
        return { label: isAr ? 'محضر تسليم' : 'Handover', bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)' };
      case 'RESCISSION':
        return { label: isAr ? 'فسخ تعاقد' : 'Rescission', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.35)' };
      case 'EXPENSE':
        return { label: isAr ? 'مصروف تشغيل' : 'Expense', bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' };
      case 'SYSTEM':
        return { label: isAr ? 'رصيد افتتاحي' : 'Opening', bg: 'rgba(212, 175, 55, 0.15)', text: 'var(--zf-gold, #d4af37)', border: 'rgba(212, 175, 55, 0.35)' };
      default:
        return { label: mod, bg: 'rgba(255, 255, 255, 0.08)', text: '#e2e8f0', border: 'rgba(255, 255, 255, 0.15)' };
    }
  };

  const typeColorMap: Record<string, { bg: string; text: string; border: string }> = {
    ASSET: { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
    LIABILITY: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
    CONTRA_LIABILITY: { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
    EQUITY: { bg: 'rgba(99, 102, 241, 0.12)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
    REVENUE: { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' },
    EXPENSE: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingTop: '0.5rem' }}>
      {/* 1. Header & Stage Actions */}
      <div className={subStyles.stageHeader}>
        <div className={subStyles.stageTitleArea}>
          <div className={subStyles.stageBreadcrumb} style={{ marginBottom: '0.25rem' }}>
            <span>FIN-OS</span>
            <span>/</span>
            <span>{isAr ? 'دفتر الأستاذ العام' : 'General Ledger'}</span>
          </div>
          <h1 className={subStyles.stageTitle} style={{ lineHeight: 1.3 }}>
            {isAr ? 'دليل الحسابات وقيود اليومية المحصنة' : 'Chart of Accounts & Immutable Ledger'}
          </h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
            {isAr 
              ? 'انقر على أي بند أو حساب لاستعراض وظيفته، دوره في التطوير العقاري، وكشف حسابه الدفتري التفصيلي.'
              : 'Click any account row to inspect its business purpose, real estate role, and detailed statement of postings.'}
          </p>
        </div>

        <div className={subStyles.stageActions}>
          <button 
            className={subStyles.actionBtnPrimary}
            onClick={onOpenQuickTransaction}
            disabled={isMutating}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#ffffff'
            }}
          >
            <Plus size={14} />
            <span>{isAr ? '+ قيد / مصروف جديد' : '+ New Entry'}</span>
          </button>

          <button 
            className={subStyles.actionBtnSecondary}
            onClick={() => onTogglePeriodStatus(
              activePeriod.period_id, 
              activePeriod.status === 'OPEN' ? 'LOCKED' : 'OPEN'
            )}
            disabled={isMutating}
          >
            {activePeriod.status === 'OPEN' ? <Lock size={14} /> : <Unlock size={14} />}
            <span>
              {activePeriod.status === 'OPEN'
                ? (isAr ? 'قفل الفترة المحاسبية' : 'Lock Period (Inv 0.9)')
                : (isAr ? 'إعادة فتح الفترة' : 'Unlock Period')}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Dashboard Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        {/* Cash & Bank Balances */}
        <div style={{
          background: 'rgba(18, 22, 34, 0.75)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            padding: '0.65rem',
            borderRadius: '10px'
          }}>
            <Wallet size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, display: 'block' }}>
              {isAr ? 'السيولة النقدية المتاحة (خزينة وبنوك)' : 'Available Liquid Cash'}
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
              {kpis.totalCash.formatEGP(isAr)}
            </span>
          </div>
        </div>

        {/* Total Assets */}
        <div style={{
          background: 'rgba(18, 22, 34, 0.75)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#38bdf8',
            padding: '0.65rem',
            borderRadius: '10px'
          }}>
            <Landmark size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, display: 'block' }}>
              {isAr ? 'إجمالي الأصول المدارة (Total Assets)' : 'Total Capital Assets'}
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
              {kpis.totalAssets.formatEGP(isAr)}
            </span>
          </div>
        </div>

        {/* Total Liabilities & Deferred Revenue */}
        <div style={{
          background: 'rgba(18, 22, 34, 0.75)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
            padding: '0.65rem',
            borderRadius: '10px'
          }}>
            <Scale size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, display: 'block' }}>
              {isAr ? 'الالتزامات وإيرادات العقود المؤجلة' : 'Liabilities & Advances'}
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>
              {kpis.totalLiabilities.formatEGP(isAr)}
            </span>
          </div>
        </div>

        {/* Posted Journal Entries Count */}
        <div style={{
          background: 'rgba(18, 22, 34, 0.75)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            color: 'var(--zf-gold, #d4af37)',
            padding: '0.65rem',
            borderRadius: '10px'
          }}>
            <FileText size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, display: 'block' }}>
              {isAr ? 'القيود المحصنة بالدفاتر' : 'Posted Ledger Entries'}
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--zf-gold, #d4af37)', fontFamily: 'monospace' }}>
              {kpis.entriesCount} {isAr ? 'قيد مرحل' : 'Entries'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar for Chart of Accounts */}
      <div style={{
        background: 'rgba(18, 22, 34, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
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
                style={{
                  background: isActive ? 'var(--zf-gold, #d4af37)' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#0a0c12' : '#cbd5e1',
                  border: isActive ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.74rem',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{
          position: 'relative',
          minWidth: '240px',
          flex: '1 1 240px',
          maxWidth: '350px'
        }}>
          <Search size={14} style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            [isAr ? 'right' : 'left']: '10px',
            color: '#94a3b8'
          }} />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالكود أو اسم الحساب...' : 'Search by code or title...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              [isAr ? 'paddingRight' : 'paddingLeft']: '2rem',
              fontSize: '0.76rem',
              color: '#ffffff',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* 4. Interactive Chart of Accounts Grid */}
      <div className={subStyles.denseTableContainer} style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <table className={subStyles.denseTable}>
          <thead>
            <tr>
              <th style={{ width: '110px' }}>{isAr ? 'كود الحساب' : 'Code'}</th>
              <th>{isAr ? 'اسم وتوصيف الحساب (اضغط للتفاصيل)' : 'Account Title (Click for details)'}</th>
              <th style={{ width: '130px' }}>{isAr ? 'التصنيف' : 'Category'}</th>
              <th style={{ width: '110px' }}>{isAr ? 'طبيعة الرصيد' : 'Normal'}</th>
              <th style={{ width: '160px', textAlign: isAr ? 'left' : 'right' }}>{isAr ? 'الرصيد الدفتري الحالي' : 'Live Balance'}</th>
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
                    transition: 'all 0.15s ease',
                    opacity: isGated ? 0.75 : 1
                  }}
                  className={subStyles.clickableRow}
                >
                  {/* Account Code */}
                  <td>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: isGated ? '#f87171' : 'var(--zf-gold, #d4af37)',
                      background: isGated ? 'rgba(239, 68, 68, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      display: 'inline-block',
                      fontSize: '0.78rem'
                    }}>
                      {acc.account_code}
                    </span>
                  </td>

                  {/* Account Title */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.82rem' }}>
                        {isAr ? acc.account_name_ar : acc.account_name_en}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>
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
                    <span className={subStyles.statusPill} style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                      {acc.normal_balance}
                    </span>
                  </td>

                  {/* Live Balance */}
                  <td style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: isZero ? '#64748b' : (isPositive ? '#34d399' : '#f87171')
                    }}>
                      {netBalance.formatEGP(isAr)}
                    </span>
                  </td>

                  {/* Activity Count */}
                  <td style={{ textAlign: 'center' }}>
                    {stats.count > 0 ? (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: 'var(--zf-gold, #d4af37)',
                        background: 'rgba(212, 175, 55, 0.12)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px'
                      }}>
                        {isAr ? `${stats.count} حركة` : `${stats.count} tx`}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#475569' }}>—</span>
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
                          background: 'rgba(212, 175, 55, 0.1)',
                          border: '1px solid rgba(212, 175, 55, 0.25)',
                          color: 'var(--zf-gold, #d4af37)',
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
                            // Scroll to entries section
                            const el = document.getElementById('journal-entries-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          title={isAr ? 'تصفية قيود اليومية بهذا الحساب' : 'Filter journal entries by this account'}
                          style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            color: '#38bdf8',
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

      {/* 5. Scalable & Intuitive Journal Entries Register Section */}
      <div id="journal-entries-section" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Register Section Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'rgba(18, 22, 34, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.15rem 1.35rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="var(--zf-gold, #d4af37)" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                {isAr ? 'سجل قيود اليومية المرحلة والمحصنة (General Journal Register)' : 'Posted Immutable Journal Register'}
              </h3>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
              {filterAccountInEntries ? (
                <span>
                  {isAr ? `تصفية القيود لحساب: ${filterAccountInEntries}` : `Filtered by account: ${filterAccountInEntries}`}
                  {' — '}
                  <button 
                    onClick={() => setFilterAccountInEntries(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--zf-gold, #d4af37)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.74rem' }}
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
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
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
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
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
            <div style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '0.2rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <button
                onClick={() => setEntriesViewMode('table')}
                title={isAr ? 'عرض جدول القيود المدمج' : 'Dense Register Table'}
                style={{
                  background: entriesViewMode === 'table' ? 'var(--zf-gold, #d4af37)' : 'transparent',
                  color: entriesViewMode === 'table' ? '#0a0c12' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Table size={13} />
                <span>{isAr ? 'جدول مدمج' : 'Table'}</span>
              </button>

              <button
                onClick={() => setEntriesViewMode('cards')}
                title={isAr ? 'عرض البطاقات التقليدي' : 'Cards View'}
                style={{
                  background: entriesViewMode === 'cards' ? 'var(--zf-gold, #d4af37)' : 'transparent',
                  color: entriesViewMode === 'cards' ? '#0a0c12' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <LayoutGrid size={13} />
                <span>{isAr ? 'بطاقات' : 'Cards'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Journal Filter & Search Sub-bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.25rem 0.25rem'
        }}>
          {/* Module Filter Pills */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
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
                  style={{
                    background: active ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: active ? 'var(--zf-gold, #d4af37)' : '#94a3b8',
                    border: active ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? pill.labelAr : pill.labelEn}
                </button>
              );
            })}
          </div>

          {/* Quick Search within Journal Entries */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px', maxWidth: '300px' }}>
            <Search size={13} style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              [isAr ? 'right' : 'left']: '10px',
              color: '#94a3b8'
            }} />
            <input
              type="text"
              placeholder={isAr ? 'بحث برقم القيد أو الوصف...' : 'Search entry number or desc...'}
              value={entriesSearchQuery}
              onChange={e => {
                setEntriesSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.35rem 0.65rem',
                [isAr ? 'paddingRight' : 'paddingLeft']: '1.85rem',
                fontSize: '0.74rem',
                color: '#ffffff',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* VIEW 1: DENSE REGISTER TABLE (Default & Highly Scalable) */}
        {entriesViewMode === 'table' ? (
          <div className={subStyles.denseTableContainer} style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <table className={subStyles.denseTable}>
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

                    // Collect distinct account codes in this entry
                    const accountsInvolved = Array.from(new Set((entry.lines || []).map(l => l.account_code)));

                    return (
                      <React.Fragment key={entry.entry_id}>
                        <tr 
                          onClick={() => toggleExpand(entry.entry_id)}
                          style={{
                            cursor: 'pointer',
                            background: isExpanded ? 'rgba(212, 175, 55, 0.05)' : undefined
                          }}
                          className={subStyles.clickableRow}
                        >
                          {/* Expand/Collapse Chevron */}
                          <td style={{ textAlign: 'center', padding: '0.65rem 0.4rem', color: '#94a3b8' }}>
                            {isExpanded ? <ChevronUp size={15} color="var(--zf-gold, #d4af37)" /> : <ChevronDown size={15} />}
                          </td>

                          {/* Entry Number & Date */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                color: 'var(--zf-gold, #d4af37)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                <Lock size={12} color="var(--zf-gold, #d4af37)" />
                                <span>{entry.entry_number}</span>
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
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
                            <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.8rem' }}>
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
                                    fontFamily: 'monospace',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    color: '#cbd5e1',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
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
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              color: 'var(--zf-gold, #d4af37)'
                            }}>
                              {totalAmt.formatEGP(isAr)}
                            </span>
                          </td>

                          {/* Balance Check */}
                          <td style={{ textAlign: 'center' }}>
                            {isBalanced ? (
                              <span style={{
                                fontSize: '0.66rem',
                                color: '#34d399',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '999px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}>
                                <CheckCircle2 size={10} />
                                <span>{isAr ? 'متوازن' : 'OK'}</span>
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.66rem',
                                color: '#f87171',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
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

                        {/* Expandable Accordion Row: Full T-Account Breakdown */}
                        {isExpanded && (
                          <tr style={{ background: 'rgba(10, 12, 18, 0.6)' }}>
                            <td colSpan={7} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(212, 175, 55, 0.15)' }}>
                              <div style={{
                                background: 'rgba(18, 22, 34, 0.85)',
                                border: '1px solid rgba(212, 175, 55, 0.25)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)'
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
          /* VIEW 2: CARDS VIEW (Traditional) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {paginatedEntries.length === 0 ? (
              <div style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(18, 22, 34, 0.5)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                color: '#64748b'
              }}>
                {isAr ? 'لا توجد قيود يومية مسجلة تطابق التصفية الحالية.' : 'No journal entries match the current filter.'}
              </div>
            ) : (
              paginatedEntries.map(entry => (
                <ImmutableRecordFrame 
                  key={entry.entry_id}
                  title={localizeJournalDescription(entry.description, isAr) || (isAr ? `قيد رقم ${entry.entry_number}` : `Entry #${entry.entry_number}`)}
                  recordId={entry.entry_id}
                  isAr={isAr}
                >
                  <JournalEntryPreview entry={entry} isDraft={false} isAr={isAr} />
                </ImmutableRecordFrame>
              ))
            )}
          </div>
        )}

        {/* Pagination Footer Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(18, 22, 34, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px'
        }}>
          {/* Info Text */}
          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            {isAr 
              ? `عرض ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredJournalEntries.length)} من أصل ${filteredJournalEntries.length} قيد مرحل`
              : `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredJournalEntries.length)} of ${filteredJournalEntries.length} entries`}
          </span>

          {/* Page Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: currentPage === 1 ? '#475569' : '#e2e8f0',
                borderRadius: '6px',
                padding: '0.35rem 0.6rem',
                fontSize: '0.72rem',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              {isAr ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
              <span>{isAr ? 'السابق' : 'Prev'}</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    style={{
                      background: currentPage === p ? 'var(--zf-gold, #d4af37)' : 'rgba(255, 255, 255, 0.04)',
                      color: currentPage === p ? '#0a0c12' : '#cbd5e1',
                      border: currentPage === p ? '1px solid var(--zf-gold, #d4af37)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '6px',
                      padding: '0.3rem 0.55rem',
                      fontSize: '0.72rem',
                      fontWeight: currentPage === p ? 800 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: currentPage === totalPages ? '#475569' : '#e2e8f0',
                borderRadius: '6px',
                padding: '0.35rem 0.6rem',
                fontSize: '0.72rem',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span>{isAr ? 'التالي' : 'Next'}</span>
              {isAr ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
            </button>

            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                borderRadius: '6px',
                padding: '0.3rem 0.5rem',
                fontSize: '0.72rem',
                outline: 'none',
                cursor: 'pointer',
                marginLeft: '0.5rem',
                colorScheme: 'dark'
              }}
            >
              <option value={5}>5 {isAr ? 'سطور' : 'rows'}</option>
              <option value={10}>10 {isAr ? 'سطور' : 'rows'}</option>
              <option value={25}>25 {isAr ? 'سطور' : 'rows'}</option>
              <option value={50}>50 {isAr ? 'سطور' : 'rows'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 6. Account Details & Statement Modal */}
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
