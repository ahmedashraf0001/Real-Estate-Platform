'use client';

import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  RotateCcw,
  ArrowUpDown,
  Filter,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { ERPPDCRecord, ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
import styles from '../ZFWorkstationShell.module.css';

interface HandInstallmentsVaultViewProps {
  pdcRecords: ERPPDCRecord[];
  contracts: ERPContract[];
  isAr?: boolean;
  isMutating?: boolean;
  onCollectItem: (item: ERPPDCRecord) => void;
  onCollectDueToday: () => void;
  onOpenNewCheque: () => void;
  onInspectCheque: (item: ERPPDCRecord) => void;
}

export const HandInstallmentsVaultView: React.FC<HandInstallmentsVaultViewProps> = ({
  pdcRecords,
  contracts,
  isAr = true,
  isMutating = false,
  onCollectItem,
  onCollectDueToday,
  onOpenNewCheque,
  onInspectCheque
}) => {
  const [chequeMaturityFilter, setChequeMaturityFilter] = useState<'all' | 'due_now' | 'due_30'>('all');
  const [chequeStatusFilter, setChequeStatusFilter] = useState<'all' | 'pending' | 'cleared' | 'overdue' | 'bounced'>('all');
  const [chequeSortBy, setChequeSortBy] = useState<'due_date_asc' | 'due_date_desc' | 'nominal_desc' | 'nominal_asc' | 'drawer_asc'>('due_date_asc');
  const [chequeSearchQuery, setChequeSearchQuery] = useState('');
  const [chequeViewMode, setChequeViewMode] = useState<'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Vault KPIs
  const vaultKPIs = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const weekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    let dueTodaySum = D(0);
    let dueTodayCount = 0;
    let dueWeekSum = D(0);
    let dueWeekCount = 0;
    let clearedSum = D(0);
    let clearedCount = 0;
    let totalSum = D(0);

    pdcRecords.forEach(p => {
      const val = D(p.nominal_value || '0');
      totalSum = totalSum.plus(val);

      if (p.status === 'Cleared') {
        clearedSum = clearedSum.plus(val);
        clearedCount++;
      } else if (p.status !== 'Bounced') {
        if (p.due_date <= todayStr) {
          dueTodaySum = dueTodaySum.plus(val);
          dueTodayCount++;
        } else if (p.due_date <= weekStr) {
          dueWeekSum = dueWeekSum.plus(val);
          dueWeekCount++;
        }
      }
    });

    return {
      dueTodaySum,
      dueTodayCount,
      dueWeekSum,
      dueWeekCount,
      clearedSum,
      clearedCount,
      totalSum,
      totalCount: pdcRecords.length
    };
  }, [pdcRecords]);

  // Filtered Cheques / Hand Dues
  const filteredCheques = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    return pdcRecords.filter(p => {
      // 1. Maturity Filter
      if (chequeMaturityFilter === 'due_now') {
        if (p.status === 'Cleared' || p.status === 'Bounced' || p.due_date > todayStr) return false;
      } else if (chequeMaturityFilter === 'due_30') {
        if (p.status === 'Cleared' || p.status === 'Bounced' || p.due_date > thirtyDaysStr) return false;
      }

      // 2. Cheque Status Filter
      if (chequeStatusFilter !== 'all') {
        const isOverdue = p.status !== 'Cleared' && p.status !== 'Bounced' && p.due_date < todayStr;
        if (chequeStatusFilter === 'cleared' && p.status !== 'Cleared') return false;
        if (chequeStatusFilter === 'bounced' && p.status !== 'Bounced') return false;
        if (chequeStatusFilter === 'overdue' && !isOverdue) return false;
        if (chequeStatusFilter === 'pending') {
          if (p.status === 'Cleared' || p.status === 'Bounced' || isOverdue) return false;
        }
      }

      // 3. Search Query
      if (chequeSearchQuery.trim()) {
        const q = chequeSearchQuery.toLowerCase();
        const code = (p.cheque_number || '').toLowerCase();
        const client = (p.drawer_name || '').toLowerCase();
        const linked = contracts.find(c => c.contract_id === p.contract_id);
        const contractNum = (linked?.contract_number || '').toLowerCase();
        const unit = (linked?.unit_id || '').toLowerCase();

        return code.includes(q) || client.includes(q) || contractNum.includes(q) || unit.includes(q);
      }

      return true;
    });
  }, [pdcRecords, contracts, chequeMaturityFilter, chequeStatusFilter, chequeSearchQuery]);

  // Sorted Cheques
  const sortedCheques = useMemo(() => {
    const list = [...filteredCheques];
    list.sort((a, b) => {
      if (chequeSortBy === 'due_date_asc') return (a.due_date || '').localeCompare(b.due_date || '');
      if (chequeSortBy === 'due_date_desc') return (b.due_date || '').localeCompare(a.due_date || '');
      if (chequeSortBy === 'nominal_desc') return D(b.nominal_value || '0').minus(D(a.nominal_value || '0')).toNumber();
      if (chequeSortBy === 'nominal_asc') return D(a.nominal_value || '0').minus(D(b.nominal_value || '0')).toNumber();
      if (chequeSortBy === 'drawer_asc') return (a.drawer_name || '').localeCompare(b.drawer_name || '', isAr ? 'ar' : 'en');
      return 0;
    });
    return list;
  }, [filteredCheques, chequeSortBy, isAr]);

  const totalPages = Math.ceil(sortedCheques.length / pageSize) || 1;
  const paginatedCheques = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCheques.slice(start, start + pageSize);
  }, [sortedCheques, currentPage, pageSize]);

  const activeFiltersCount = (chequeMaturityFilter !== 'all' ? 1 : 0) +
    (chequeStatusFilter !== 'all' ? 1 : 0) +
    (chequeSearchQuery.trim() ? 1 : 0) +
    (chequeSortBy !== 'due_date_asc' ? 1 : 0);

  const handleResetFilters = () => {
    setChequeMaturityFilter('all');
    setChequeStatusFilter('all');
    setChequeSortBy('due_date_asc');
    setChequeSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className={styles.stageContainer}>
      {/* 1. STAGE HEADER & ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {isAr ? 'أجندة ومواعيد الأقساط وسندات القبض' : 'Installment Dues & Cash Receipts'}
            </h1>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.18rem 0.55rem',
              borderRadius: '6px',
              background: 'rgba(184, 144, 62, 0.09)',
              border: '1px solid rgba(184, 144, 62, 0.28)',
              color: '#946f23'
            }}>
              {isAr ? 'متابعة وتحصيل' : 'Cash Receivables'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'متابعة مواعيد سداد الأقساط التعاقدية، والتحصيل كاش باليد أو تحويل مع إصدار سندات القبض'
              : 'Tracking hand-collected installments, payment dues aging, and instant safe receipts'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className={styles.btnSecondary}
            onClick={onCollectDueToday}
            disabled={isMutating || vaultKPIs.dueTodayCount === 0}
            title={isAr ? 'تحصيل كل الأقساط المستحقة النهاردة مرة واحدة' : 'Batch collect today dues'}
          >
            <Wallet size={14} color="#059669" />
            <span>{isAr ? `تحصيل فلوس النهاردة (${vaultKPIs.dueTodayCount})` : `Collect Today (${vaultKPIs.dueTodayCount})`}</span>
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={onOpenNewCheque}
          >
            <Plus size={14} />
            <span>{isAr ? 'تسجيل قسط أو سند قبض جديد' : 'New Installment Voucher'}</span>
          </button>
        </div>
      </div>

      {/* 2. ASYMMETRIC VAULT CASHIER RADAR */}
      <div className={styles.asymmetricBentoGrid}>
        {/* Left / Hero Card: Total Vault Liquidity & Clearance Progress */}
        <ZFKpiCard
          variant="double-bezel"
          isFlagship={true}
          title={isAr ? 'إجمالي الأقساط والمستحقات' : 'Total Hand Vault Portfolio'}
          value={vaultKPIs.totalSum.formatEGP(isAr)}
          icon={<Wallet size={20} />}
          accentColor="gold"
          progress={vaultKPIs.totalSum.isZero() ? 0 : vaultKPIs.clearedSum.div(vaultKPIs.totalSum).times(100).toFixed(1)}
          progressColor="#10b981"
          badge={{ text: `${vaultKPIs.totalCount} ${isAr ? 'قسط مسجل' : 'records'}`, variant: 'gold' }}
          subtitleLabel={isAr ? 'اتحصل ودخل الخزنة' : 'Cleared in Safe'}
          subtitleValue={`${vaultKPIs.clearedSum.formatEGP(isAr)} (${vaultKPIs.clearedCount} ${isAr ? 'متحصل' : 'cleared'})`}
        />

        {/* Right Stack: 2 Compact Telemetry Instruments */}
        <div className={styles.telemetryStack}>
          <ZFKpiCard
            variant="compact"
            title={isAr ? 'مستحق النهاردة ومتأخرات' : 'Due Today & Overdue'}
            value={vaultKPIs.dueTodaySum.formatEGP(isAr)}
            icon={<Clock size={16} />}
            accentColor={vaultKPIs.dueTodayCount > 0 ? 'rose' : 'emerald'}
            subtitleLabel={isAr ? 'حالة التحصيل' : 'Urgency'}
            subtitleValue={`${vaultKPIs.dueTodayCount} ${isAr ? 'أقساط جاهزة للتحصيل' : 'ready'}`}
          />

          <ZFKpiCard
            variant="compact"
            title={isAr ? 'مستحق خلال أسبوع' : 'Due This Week'}
            value={vaultKPIs.dueWeekSum.formatEGP(isAr)}
            icon={<Calendar size={16} />}
            accentColor="amber"
            subtitleLabel={isAr ? 'المواعيد الجاية' : 'Timeline'}
            subtitleValue={`${vaultKPIs.dueWeekCount} ${isAr ? 'أقساط قادمة' : 'items'}`}
          />
        </div>
      </div>

      {/* 3. UNIFIED FILTER TOOLBAR & VIEW SWITCHER */}
      <ZFFilterToolbar
        tabs={[
          { id: 'all', label: isAr ? 'كل المواعيد' : 'All Dates' },
          { id: 'due_now', label: isAr ? 'مستحق النهاردة أو متأخر' : 'Due / Overdue', count: vaultKPIs.dueTodayCount },
          { id: 'due_30', label: isAr ? 'مستحق خلال 30 يوم' : 'Next 30 Days' }
        ]}
        activeTab={chequeMaturityFilter}
        onTabChange={(tabId) => {
          setChequeMaturityFilter(tabId as any);
          setCurrentPage(1);
        }}
        searchQuery={chequeSearchQuery}
        onSearchChange={(q) => {
          setChequeSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder={isAr ? 'دوّر برقم الإيصال، اسم العميل، أو العقد...' : 'Search code, client, or contract...'}
        filters={[
          {
            id: 'cheque_status_filter',
            value: chequeStatusFilter,
            onChange: (val) => {
              setChequeStatusFilter(val as any);
              setCurrentPage(1);
            },
            ariaLabel: isAr ? 'تصفية حسب حالة التحصيل' : 'Filter by installment status',
            options: [
              { value: 'all', label: isAr ? 'كل الحالات' : 'Status: All' },
              { value: 'pending', label: isAr ? 'لسه ما اتحصلش' : 'Pending' },
              { value: 'cleared', label: isAr ? 'اتحصل خلاص' : 'Cleared' },
              { value: 'overdue', label: isAr ? 'متأخر في السداد' : 'Overdue' },
              { value: 'bounced', label: isAr ? 'قسط متعثر / مرفوض' : 'Defaulted / Bounced' }
            ]
          }
        ]}
        sortBy={chequeSortBy}
        onSortChange={(val) => setChequeSortBy(val as any)}
        sortOptions={[
          { value: 'due_date_asc', label: isAr ? 'الميعاد: الأقرب الأول' : 'Due: Soonest First' },
          { value: 'due_date_desc', label: isAr ? 'الميعاد: الأبعد الأول' : 'Due: Latest First' },
          { value: 'nominal_desc', label: isAr ? 'المبلغ: الأكبر الأول' : 'Amount: High to Low' },
          { value: 'nominal_asc', label: isAr ? 'المبلغ: الأقل الأول' : 'Amount: Low to High' },
          { value: 'drawer_asc', label: isAr ? 'اسم العميل: أ - ي' : 'Client: A to Z' }
        ]}
        sortAriaLabel={isAr ? 'ترتيب الأقساط وسندات القبض' : 'Sort installments'}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={handleResetFilters}
        viewMode={chequeViewMode}
        onViewModeChange={(mode) => setChequeViewMode(mode)}
        isAr={isAr}
      />

      {/* 4. EMPTY STATE */}
      {sortedCheques.length === 0 && (
        <div style={{
          padding: '3.5rem 2rem',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px dashed #cbd5e1'
        }}>
          <Wallet size={36} color="#946f23" style={{ margin: '0 auto 0.75rem auto' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            {isAr ? 'مفيش أقساط مطابقة للبحث أو الفلتر' : 'No matching installment items found'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
            {isAr ? 'جرب تغيّر الفلتر أو تمسح خانة البحث.' : 'Try changing the filter or clearing the search box.'}
          </div>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className={styles.resetFilterBtn}
              style={{ marginTop: '1rem' }}
            >
              <RotateCcw size={13} />
              <span>{isAr ? 'مسح الفلاتر والرجوع للكل' : 'Reset all filters'}</span>
            </button>
          )}
        </div>
      )}

      {/* 5. VIEW MODE 1: EXECUTIVE CARDS */}
      {chequeViewMode === 'cards' && sortedCheques.length > 0 && (
        <div className={styles.cardsGrid}>
          {paginatedCheques.map(pdc => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isOverdue = pdc.status !== 'Cleared' && pdc.due_date < todayStr;
            const isDueToday = pdc.status !== 'Cleared' && pdc.due_date === todayStr;
            const isCollected = pdc.status === 'Cleared';
            const linkedContract = contracts.find(c => c.contract_id === pdc.contract_id);

            return (
              <div 
                key={pdc.cheque_id}
                onClick={() => onInspectCheque(pdc)}
                style={{
                  background: '#ffffff',
                  border: isDueToday || isOverdue ? '1.5px solid rgba(184, 144, 62, 0.6)' : '1.5px solid #cbd5e1',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header: Item Code & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 800,
                      color: '#946f23',
                      fontSize: '0.88rem',
                      whiteSpace: 'nowrap',
                      direction: 'ltr',
                      unicodeBidi: 'isolate',
                      display: 'inline-block'
                    }}>
                      #{pdc.cheque_number}
                    </span>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      {pdc.drawer_name}
                    </div>
                  </div>

                  <span style={{
                    padding: '0.22rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    background: isCollected ? '#f0fdf4' : isOverdue ? '#fef2f2' : 'rgba(184, 144, 62, 0.08)',
                    color: isCollected ? '#15803d' : isOverdue ? '#dc2626' : '#946f23',
                    border: isCollected ? '1px solid rgba(22, 163, 74, 0.25)' : isOverdue ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid rgba(184, 144, 62, 0.25)'
                  }}>
                    {isCollected ? (isAr ? 'اتحصل' : 'Cleared') : isOverdue ? (isAr ? 'متأخر' : 'Overdue') : (isAr ? 'لسه ما اتحصلش' : 'Pending')}
                  </span>
                </div>

                {/* Amount & Due Date Box */}
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'قيمة القسط:' : 'Due Amount:'}
                    </span>
                    <strong style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {D(pdc.nominal_value).formatEGP(isAr)}
                    </strong>
                  </div>

                  <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'ميعاد الاستحقاق:' : 'Due Date:'}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isOverdue ? '#dc2626' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {pdc.due_date}
                    </span>
                  </div>
                </div>

                {/* Contract Link */}
                {linkedContract && (
                  <div style={{
                    fontSize: '0.74rem',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#f8fafc',
                    padding: '0.4rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #f1f5f9',
                    overflow: 'hidden'
                  }}>
                    <span style={{ flexShrink: 0 }}>{isAr ? 'عقد:' : 'Contract:'}</span>
                    <strong dir="ltr" style={{ color: '#0f172a', whiteSpace: 'nowrap', unicodeBidi: 'isolate', flexShrink: 0 }}>
                      #{linkedContract.contract_number}
                    </strong>
                    <span>•</span>
                    <span style={{
                      color: '#946f23',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {linkedContract.unit_id}
                    </span>
                  </div>
                )}

                {/* Action Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem', marginTop: 'auto' }}>
                  {!isCollected ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCollectItem(pdc);
                      }}
                      disabled={isMutating}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                        color: '#ffffff',
                        border: '1px solid #947228',
                        borderRadius: '8px',
                        padding: '0.45rem',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(184, 144, 62, 0.25)'
                      }}
                    >
                      <Wallet size={13} />
                      <span>{isAr ? 'تحصيل القسط كاش' : 'Collect Cash by Hand'}</span>
                    </button>
                  ) : (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem',
                      borderRadius: '8px',
                      background: '#ecfdf5',
                      color: '#065f46',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      border: '1px solid #a7f3d0'
                    }}>
                      <CheckCircle2 size={13} />
                      <span>{isAr ? 'اتحصل في الخزنة' : 'In Safe [101000]'}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectCheque(pdc);
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      color: '#475569',
                      borderRadius: '8px',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={isAr ? 'عرض التفاصيل' : 'Inspect details'}
                  >
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. VIEW MODE 2: DENSE ACCOUNTING TABLE */}
      {chequeViewMode === 'table' && sortedCheques.length > 0 && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', color: '#475569', textAlign: isAr ? 'right' : 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'رقم الإيصال / السند' : 'Item Code'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'العميل' : 'Client / Payer'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'العقد والشقة' : 'Contract & Unit'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'قيمة القسط' : 'Installment Value'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'ميعاد الاستحقاق' : 'Due Date & Aging'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'حالة التحصيل' : 'Status'}</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{isAr ? 'حركة الخزنة' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCheques.map(pdc => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isOverdue = pdc.status !== 'Cleared' && pdc.due_date < todayStr;
                  const isCollected = pdc.status === 'Cleared';
                  const linkedContract = contracts.find(c => c.contract_id === pdc.contract_id);

                  return (
                    <tr 
                      key={pdc.cheque_id} 
                      onClick={() => onInspectCheque(pdc)} 
                      style={{ 
                        borderBottom: '1px solid #cbd5e1', 
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fdfbf7')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#946f23' }}>
                        #{pdc.cheque_number}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {pdc.drawer_name || (isAr ? 'مش محدد' : 'Unknown')}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {linkedContract ? (
                          <span dir="ltr" style={{ whiteSpace: 'nowrap', unicodeBidi: 'isolate' }}>
                            {linkedContract.contract_number} ({linkedContract.unit_id})
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <MoneyCell amount={pdc.nominal_value} isAr={isAr} highlight />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={12} color={isOverdue ? '#dc2626' : '#64748b'} />
                          <span style={{ color: isOverdue ? '#dc2626' : '#0f172a', fontWeight: isOverdue ? 700 : 500 }}>
                            {pdc.due_date}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isCollected ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            background: 'rgba(21, 128, 61, 0.08)',
                            color: '#15803d',
                            border: '1px solid rgba(21, 128, 61, 0.25)',
                            fontSize: '0.7rem',
                            fontWeight: 800
                          }}>
                            <CheckCircle2 size={11} /> {isAr ? 'اتحصل' : 'Cleared'}
                          </span>
                        ) : isOverdue ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            background: 'rgba(220, 38, 38, 0.08)',
                            color: '#dc2626',
                            border: '1px solid rgba(220, 38, 38, 0.25)',
                            fontSize: '0.7rem',
                            fontWeight: 800
                          }}>
                            <AlertTriangle size={11} /> {isAr ? 'متأخر' : 'Overdue'}
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            background: 'rgba(184, 144, 62, 0.08)',
                            color: '#946f23',
                            border: '1px solid rgba(184, 144, 62, 0.25)',
                            fontSize: '0.7rem',
                            fontWeight: 800
                          }}>
                            <Clock size={11} /> {isAr ? 'ميعاده لسه' : 'Due Later'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {!isCollected ? (
                            <button
                              type="button"
                              onClick={() => onCollectItem(pdc)}
                              disabled={isMutating}
                              style={{
                                background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                                border: '1px solid #947228',
                                color: '#ffffff',
                                padding: '0.3rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Wallet size={12} />
                              <span>{isAr ? 'تحصيل كاش' : 'Collect'}</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>
                              {isAr ? 'اتحصل في الخزنة' : 'In Safe'}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => onInspectCheque(pdc)}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              color: '#475569',
                              padding: '0.25rem 0.45rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                            title={isAr ? 'عرض التفاصيل' : 'Inspect'}
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. PAGINATION BAR (SHARED) */}
      {sortedCheques.length > 0 && (
        <ZFPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedCheques.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          isAr={isAr}
          itemLabel={{ ar: 'قسط', en: 'installments' }}
        />
      )}
    </div>
  );
};
