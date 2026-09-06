'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Search, 
  LayoutGrid, 
  List, 
  Eye, 
  Scale, 
  Building,
  Building2,
  User,
  Plus,
  RotateCcw,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { StatusBadge } from '@/components/erp/StatusBadge';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
import styles from '../ZFWorkstationShell.module.css';

interface ContractsRegistryViewProps {
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  isAr?: boolean;
  onInspectContract: (contract: ERPContract) => void;
  onNavigateToProperties: () => void;
  onOpenNewContract?: () => void;
}

export const ContractsRegistryView: React.FC<ContractsRegistryViewProps> = ({
  contracts,
  schedules,
  isAr = true,
  onInspectContract,
  onNavigateToProperties,
  onOpenNewContract
}) => {
  const [contractFilter, setContractFilter] = useState<'All' | 'Delivered' | 'Pending' | 'Rescinded'>('All');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'fully_paid' | 'partially_paid' | 'zero_paid'>('all');
  const [contractSortBy, setContractSortBy] = useState<'date_desc' | 'date_asc' | 'gross_desc' | 'gross_asc' | 'collected_desc' | 'progress_desc' | 'buyer_asc'>('date_desc');
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [contractViewMode, setContractViewMode] = useState<'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Calculate Contracts Portfolio KPIs
  const contractKPIs = useMemo(() => {
    let grossTotal = D(0);
    let collectedTotal = D(0);
    let activeCnt = 0;
    let deliveredCnt = 0;
    let pendingCnt = 0;
    let rescindedCnt = 0;

    contracts.forEach(c => {
      if (c.status === 'Rescinded') {
        rescindedCnt++;
        return;
      }
      activeCnt++;
      grossTotal = grossTotal.plus(c.gross_contract_value || '0');
      collectedTotal = collectedTotal.plus(c.total_cash_collected || '0');

      if (c.handover_status === 'Delivered') {
        deliveredCnt++;
      } else {
        pendingCnt++;
      }
    });

    const remainingTotal = grossTotal.minus(collectedTotal).isNegative() ? D(0) : grossTotal.minus(collectedTotal);
    const avgCollectionPct = grossTotal.gt(0) 
      ? Math.round(collectedTotal.dividedBy(grossTotal).times(100).toNumber()) 
      : 0;

    return {
      totalGross: grossTotal.toFixed(2),
      totalCollected: collectedTotal.toFixed(2),
      totalRemaining: remainingTotal.toFixed(2),
      avgCollectionPct,
      totalCount: contracts.length,
      activeCount: activeCnt,
      deliveredCount: deliveredCnt,
      pendingCount: pendingCnt,
      rescindedCount: rescindedCnt
    };
  }, [contracts]);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      // 1. Status Filter
      if (contractFilter === 'All' && c.status === 'Rescinded') return false;
      if (contractFilter === 'Delivered' && (c.status === 'Rescinded' || c.handover_status !== 'Delivered')) return false;
      if (contractFilter === 'Pending' && (c.status === 'Rescinded' || c.handover_status === 'Delivered')) return false;
      if (contractFilter === 'Rescinded' && c.status !== 'Rescinded') return false;

      // 2. Payment Filter
      if (paymentFilter !== 'all') {
        const gross = D(c.gross_contract_value || '0');
        const collected = D(c.total_cash_collected || '0');
        const isFully = gross.gt(0) && collected.gte(gross);
        const isZero = collected.isZero();
        const isPartial = !isFully && !isZero;

        if (paymentFilter === 'fully_paid' && !isFully) return false;
        if (paymentFilter === 'partially_paid' && !isPartial) return false;
        if (paymentFilter === 'zero_paid' && !isZero) return false;
      }

      // 3. Search Query
      if (contractSearchQuery.trim()) {
        const q = contractSearchQuery.toLowerCase();
        const num = (c.contract_number || '').toLowerCase();
        const buyer = (c.buyer_name || '').toLowerCase();
        const unit = (c.unit_id || '').toLowerCase();
        return num.includes(q) || buyer.includes(q) || unit.includes(q);
      }

      return true;
    });
  }, [contracts, contractFilter, paymentFilter, contractSearchQuery]);

  // Sorted Contracts
  const sortedContracts = useMemo(() => {
    const list = [...filteredContracts];
    list.sort((a, b) => {
      if (contractSortBy === 'date_desc') return (b.contract_date || '').localeCompare(a.contract_date || '');
      if (contractSortBy === 'date_asc') return (a.contract_date || '').localeCompare(b.contract_date || '');
      if (contractSortBy === 'gross_desc') return D(b.gross_contract_value || '0').minus(D(a.gross_contract_value || '0')).toNumber();
      if (contractSortBy === 'gross_asc') return D(a.gross_contract_value || '0').minus(D(b.gross_contract_value || '0')).toNumber();
      if (contractSortBy === 'collected_desc') return D(b.total_cash_collected || '0').minus(D(a.total_cash_collected || '0')).toNumber();
      if (contractSortBy === 'progress_desc') {
        const pA = D(a.gross_contract_value || '0').gt(0) ? D(a.total_cash_collected || '0').dividedBy(D(a.gross_contract_value || '0')).toNumber() : 0;
        const pB = D(b.gross_contract_value || '0').gt(0) ? D(b.total_cash_collected || '0').dividedBy(D(b.gross_contract_value || '0')).toNumber() : 0;
        return pB - pA;
      }
      if (contractSortBy === 'buyer_asc') return (a.buyer_name || '').localeCompare(b.buyer_name || '', isAr ? 'ar' : 'en');
      return 0;
    });
    return list;
  }, [filteredContracts, contractSortBy, isAr]);

  const totalPages = Math.ceil(sortedContracts.length / pageSize) || 1;
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedContracts.slice(start, start + pageSize);
  }, [sortedContracts, currentPage, pageSize]);

  const activeFiltersCount = (contractFilter !== 'All' ? 1 : 0) +
    (paymentFilter !== 'all' ? 1 : 0) +
    (contractSearchQuery.trim() ? 1 : 0) +
    (contractSortBy !== 'date_desc' ? 1 : 0);

  const handleResetFilters = () => {
    setContractFilter('All');
    setPaymentFilter('all');
    setContractSortBy('date_desc');
    setContractSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className={styles.stageContainer}>
      {/* 1. STAGE HEADER & ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {isAr ? 'عقود البيع ومتابعة أقساط العملاء' : 'Sales Contracts & Installment Pipeline'}
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
              {isAr ? 'عقود وشقق مبيوعة' : 'Contract Escrow'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'متابعة عقود البيع، مواعيد الأقساط، الفلوس اللي ادفعت، وحالة تسليم الشقق' 
              : 'Centralized registry of booked sales contracts, installment schedules, cash collection, and unit handovers'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className={styles.btnSecondary}
            onClick={onNavigateToProperties}
            title={isAr ? 'اختيار شقة لكتابة عقد بيع جديد' : 'Go to Property Portfolio to originate a contract'}
          >
            <Building size={14} color="#946f23" />
            <span>{isAr ? 'اختيار شقة لكتابة عقد' : 'Originate Contract'}</span>
          </button>

          {onOpenNewContract && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onOpenNewContract}
            >
              <Plus size={14} />
              <span>{isAr ? 'عقد بيع جديد' : 'New Contract'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THE 4 EXECUTIVE CONTRACT KPI CARDS */}
      <div className={styles.kpiGrid}>
        <ZFKpiCard
          title={isAr ? 'إجمالي مبيعات العقود' : 'Gross Contract Value (V)'}
          value={D(contractKPIs.totalGross).formatEGP(isAr)}
          isFlagship={true}
          accentColor="gold"
          icon={<TrendingUp size={16} />}
          subtitleLabel={isAr ? 'العقود الشغالة' : 'Active Contracts'}
          subtitleValue={`${contractKPIs.activeCount} ${isAr ? 'عقد شغال' : 'contracts'}`}
        />

        <ZFKpiCard
          title={isAr ? 'الفلوس اللي اتحصلت كاش' : 'Total Cash Collected (C)'}
          value={D(contractKPIs.totalCollected).formatEGP(isAr)}
          icon={<Wallet size={16} />}
          accentColor="emerald"
          subtitleLabel={isAr ? 'كاش في البنك والخزنة' : 'Collected Cash'}
          subtitleValue={isAr ? 'دخلت الحسابات' : 'GL Bank 102000'}
        />

        <ZFKpiCard
          title={isAr ? 'أقساط لسه عند العملاء' : 'Outstanding Receivables (A/R)'}
          value={D(contractKPIs.totalRemaining).formatEGP(isAr)}
          icon={<Clock size={16} />}
          accentColor="amber"
          subtitleLabel={isAr ? 'أقساط جاية' : 'Pending Installments'}
          subtitleValue={`${contractKPIs.pendingCount} ${isAr ? 'عقد لسه عليه أقساط' : 'in progress'}`}
        />

        <ZFKpiCard
          title={isAr ? 'نسبة التحصيل من المبيعات' : 'Portfolio Collection Rate'}
          value={`${contractKPIs.avgCollectionPct}%`}
          icon={<CheckCircle2 size={16} />}
          accentColor="gold"
          progress={contractKPIs.avgCollectionPct}
          subtitleLabel={isAr ? 'الشقق اللي اتسلمت' : 'Delivered / WIP'}
          subtitleValue={`${contractKPIs.deliveredCount} ${isAr ? 'متسلمة' : 'handed over'}`}
        />
      </div>

      {/* 3. UNIFIED FILTER TOOLBAR & VIEW SWITCHER */}
      <ZFFilterToolbar
        tabs={[
          { id: 'All', label: isAr ? 'كل العقود الشغالة' : 'Active Pipeline', count: contractKPIs.activeCount },
          { id: 'Delivered', label: isAr ? 'شقق اتسلمت' : 'Delivered', count: contractKPIs.deliveredCount },
          { id: 'Pending', label: isAr ? 'شقق تحت الإنشاء' : 'Under Construction', count: contractKPIs.pendingCount },
          { id: 'Rescinded', label: isAr ? 'عقود اتلغت' : 'Rescinded', count: contractKPIs.rescindedCount }
        ]}
        activeTab={contractFilter}
        onTabChange={(tabId) => {
          setContractFilter(tabId as any);
          setCurrentPage(1);
        }}
        searchQuery={contractSearchQuery}
        onSearchChange={(q) => {
          setContractSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder={isAr ? 'دوّر برقم العقد، اسم العميل، أو الشقة...' : 'Search contract #, buyer, unit...'}
        filters={[
          {
            id: 'payment_filter',
            value: paymentFilter,
            onChange: (val) => {
              setPaymentFilter(val as any);
              setCurrentPage(1);
            },
            ariaLabel: isAr ? 'موقف السداد والتحصيل' : 'Payment Status',
            options: [
              { value: 'all', label: isAr ? 'كل حالات السداد' : 'Payment: All' },
              { value: 'fully_paid', label: isAr ? 'مدفوع بالكامل (100%)' : 'Fully Paid' },
              { value: 'partially_paid', label: isAr ? 'مدفوع منه جزء (شغال)' : 'Partially Paid' },
              { value: 'zero_paid', label: isAr ? 'لسه ما اتدفعش منه حاجة (0%)' : 'Unpaid (0%)' }
            ]
          }
        ]}
        sortBy={contractSortBy}
        onSortChange={(val) => setContractSortBy(val as any)}
        sortOptions={[
          { value: 'date_desc', label: isAr ? 'التاريخ: الأحدث الأول' : 'Date: Newest First' },
          { value: 'date_asc', label: isAr ? 'التاريخ: الأقدم الأول' : 'Date: Oldest First' },
          { value: 'gross_desc', label: isAr ? 'سعر العقد: الأكبر الأول' : 'Gross: High to Low' },
          { value: 'gross_asc', label: isAr ? 'سعر العقد: الأقل الأول' : 'Gross: Low to High' },
          { value: 'collected_desc', label: isAr ? 'المتحصل: الأكتر الأول' : 'Collected: High to Low' },
          { value: 'progress_desc', label: isAr ? 'نسبة التحصيل: الأعلى الأول' : 'Collection %: Highest' },
          { value: 'buyer_asc', label: isAr ? 'اسم العميل: أ - ي' : 'Buyer: A to Z' }
        ]}
        sortAriaLabel={isAr ? 'ترتيب العقود' : 'Sort contracts'}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={handleResetFilters}
        viewMode={contractViewMode}
        onViewModeChange={(mode) => setContractViewMode(mode)}
        isAr={isAr}
      />

      {/* 4. EMPTY STATE */}
      {sortedContracts.length === 0 && (
        <div style={{
          padding: '3.5rem 2rem',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px dashed #cbd5e1'
        }}>
          <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            {isAr ? 'مفيش عقود مطابقة للبحث أو الفلتر' : 'No matching contracts found'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
            {isAr ? 'جرب تغيّر التبويب أو الفلتر، أو تمسح خانة البحث.' : 'Try changing the status tab, payment filter, or clearing search.'}
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
      {contractViewMode === 'cards' && sortedContracts.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))',
          gap: '1.25rem'
        }}>
          {paginatedContracts.map(c => {
            const contractSchedules = schedules.filter(s => s.contract_id === c.contract_id && s.status !== 'SUPERSEDED');
            const pendingSchedules = contractSchedules.filter(s => s.status === 'Pending');
            
            const gross = D(c.gross_contract_value || '0');
            const collected = D(c.total_cash_collected || '0');
            const remaining = gross.minus(collected).isNegative() ? '0.00' : gross.minus(collected).toFixed(2);
            const progress = gross.isZero() ? 0 : Math.min(100, Math.max(0, collected.div(gross).times(100).toNumber()));
            const isFullyPaid = collected.greaterThanOrEqual(gross) && !gross.isZero();

            return (
              <div 
                key={c.contract_id}
                onClick={() => onInspectContract(c)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                }}
              >
                {/* 1. Top Metadata Strip: Contract # Badge & Handover Status */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  paddingBottom: '0.65rem',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(184, 144, 62, 0.08)',
                    border: '1px solid rgba(184, 144, 62, 0.22)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#946f23',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                    direction: 'ltr',
                    unicodeBidi: 'isolate'
                  }}>
                    <FileText size={12} color="#946f23" />
                    <span>#{c.contract_number}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                    <StatusBadge domain="unit" status={c.handover_status} isAr={isAr} />
                  </div>
                </div>

                {/* 2. Unit Title & Buyer Identity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{
                    fontSize: '0.96rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.45rem'
                  }}>
                    <Building2 size={16} color="#946f23" style={{ flexShrink: 0, marginTop: '3px' }} />
                    <span style={{
                      wordBreak: 'break-word',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {c.unit_id}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    color: '#64748b'
                  }}>
                    <User size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                    <span style={{ color: '#64748b' }}>{isAr ? 'العميل:' : 'Buyer:'}</span>
                    <strong style={{ color: '#1e293b', fontWeight: 700 }}>{c.buyer_name}</strong>
                  </div>
                </div>

                {/* 3. Financial Escrow Breakdown (Executive Bento) */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  {/* Gross Contract Value Hero */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '0.45rem',
                    borderBottom: '1px solid #e2e8f0',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      fontSize: '0.68rem',
                      color: '#64748b',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}>
                      <Scale size={12} color="#946f23" />
                      <span>{isAr ? 'إجمالي سعر العقد' : 'GROSS VALUE (V)'}</span>
                    </div>
                    <div style={{
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap'
                    }}>
                      {D(c.gross_contract_value || '0').formatEGP(isAr)}
                    </div>
                  </div>

                  {/* 2-Column Metric Grid: Collected vs Remaining */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem'
                  }}>
                    {/* Box 1: Collected In Bank */}
                    <div style={{
                      background: 'rgba(22, 163, 74, 0.05)',
                      border: '1px solid rgba(22, 163, 74, 0.18)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.65rem'
                    }}>
                      <div style={{
                        fontSize: '0.67rem',
                        color: '#15803d',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        whiteSpace: 'nowrap'
                      }}>
                        <CheckCircle2 size={11} />
                        <span>{isAr ? 'المتحصل كاش' : 'Collected (C)'}</span>
                      </div>
                      <div style={{
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        color: '#15803d',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        marginTop: '0.25rem'
                      }}>
                        {D(c.total_cash_collected || '0').formatEGP(isAr)}
                      </div>
                    </div>

                    {/* Box 2: Outstanding Receivables (A/R) */}
                    <div style={{
                      background: isFullyPaid ? '#f1f5f9' : 'rgba(217, 119, 6, 0.05)',
                      border: isFullyPaid ? '1px solid #e2e8f0' : '1px solid rgba(217, 119, 6, 0.2)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.65rem'
                    }}>
                      <div style={{
                        fontSize: '0.67rem',
                        color: isFullyPaid ? '#64748b' : '#b45309',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        whiteSpace: 'nowrap'
                      }}>
                        <Clock size={11} />
                        <span>{isAr ? 'أقساط لسه باقية' : 'Pending (A/R)'}</span>
                      </div>
                      <div style={{
                        fontSize: '0.86rem',
                        fontWeight: 800,
                        color: isFullyPaid ? '#64748b' : '#b45309',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        marginTop: '0.25rem'
                      }}>
                        {D(remaining).formatEGP(isAr)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Progress Bar & Collection Telemetry */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.72rem',
                    marginBottom: '0.35rem'
                  }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>
                      {isAr ? 'نسبة اللي اتدفع:' : 'Collection Rate:'}
                    </span>
                    <span style={{
                      fontWeight: 800,
                      color: isFullyPaid ? '#15803d' : '#946f23',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#e2e8f0',
                    borderRadius: '999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: isFullyPaid ? '#15803d' : 'linear-gradient(90deg, #c5a059, #15803d)',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* 5. Footer: Tranches Info & Inspect CTA */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.74rem',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid #f1f5f9',
                  marginTop: 'auto'
                }}>
                  {isFullyPaid ? (
                    <span style={{ color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle2 size={13} /> {isAr ? 'مدفوع بالكامل (100%)' : 'Paid in full'}
                    </span>
                  ) : (
                    <span style={{ color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={13} />
                      <span>{pendingSchedules.length} {isAr ? 'أقساط لسه باقية' : 'pending tranches'}</span>
                    </span>
                  )}

                  <span style={{
                    color: '#946f23',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: 'rgba(184, 144, 62, 0.08)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px'
                  }}>
                    <Eye size={13} />
                    <span>{isAr ? 'عرض تفاصيل العقد' : 'Inspect'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. VIEW MODE 2: DENSE ACCOUNTING TABLE */}
      {contractViewMode === 'table' && sortedContracts.length > 0 && (
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
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'رقم العقد' : 'Contract #'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'الشقة / الوحدة' : 'Unit ID'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'العميل' : 'Buyer'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'سعر العقد' : 'Gross (V)'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'المتحصل كاش' : 'Collected (C)'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'الأقساط الباقية' : 'Remaining (A/R)'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'نسبة التحصيل' : 'Progress'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'حالة التسليم' : 'Handover'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'تاريخ العقد' : 'Date'}</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{isAr ? 'تفاصيل' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedContracts.map(c => {
                  const gross = D(c.gross_contract_value || '0');
                  const collected = D(c.total_cash_collected || '0');
                  const remaining = gross.minus(collected).isNegative() ? '0.00' : gross.minus(collected).toFixed(2);
                  const progress = gross.isZero() ? 0 : Math.min(100, Math.max(0, collected.div(gross).times(100).toNumber()));
                  const isFullyPaid = collected.greaterThanOrEqual(gross) && !gross.isZero();

                  return (
                    <tr 
                      key={c.contract_id}
                      onClick={() => onInspectContract(c)}
                      style={{ borderBottom: '1px solid #cbd5e1', cursor: 'pointer', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>{c.contract_number}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{c.unit_id}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>{c.buyer_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><MoneyCell amount={c.gross_contract_value} isAr={isAr} /></td>
                      <td style={{ padding: '0.75rem 1rem', color: '#15803d', fontWeight: 700 }}>
                        <MoneyCell amount={c.total_cash_collected} isAr={isAr} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: isFullyPaid ? '#15803d' : '#0f172a', fontWeight: isFullyPaid ? 700 : 500 }}>
                        <MoneyCell amount={remaining} isAr={isAr} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: isFullyPaid ? '#15803d' : '#946f23' }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isFullyPaid ? '#15803d' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}><StatusBadge domain="unit" status={c.handover_status} isAr={isAr} /></td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.74rem' }}>{c.contract_date}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectContract(c);
                          }}
                          style={{
                            background: 'rgba(184, 144, 62, 0.08)',
                            border: '1px solid rgba(184, 144, 62, 0.25)',
                            color: '#946f23',
                            borderRadius: '6px',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={12} />
                          <span>{isAr ? 'عرض' : 'View'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. PAGINATION BAR (SHARED BETWEEN CARDS AND TABLE) */}
      {sortedContracts.length > 0 && (
        <ZFPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedContracts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          isAr={isAr}
          itemLabel={{ ar: 'عقد بيع', en: 'contracts' }}
        />
      )}
    </div>
  );
};
