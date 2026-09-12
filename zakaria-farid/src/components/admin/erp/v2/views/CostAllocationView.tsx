'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  FileText, 
  DollarSign, 
  Search, 
  LayoutGrid, 
  List, 
  Eye, 
  Percent,
  Plus,
  RotateCcw,
  ArrowUpDown,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { ERPCostAllocation } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
import { ZFErpBreadcrumb } from '../common/ZFErpBreadcrumb';
import styles from '../ZFWorkstationShell.module.css';

interface CostAllocationViewProps {
  costAllocations: ERPCostAllocation[];
  isAr?: boolean;
  onOpenNewAllocation: () => void;
  onInspectRSV: (allocation: ERPCostAllocation) => void;
}

export const CostAllocationView: React.FC<CostAllocationViewProps> = ({
  costAllocations,
  isAr = true,
  onOpenNewAllocation,
  onInspectRSV
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'rsv_desc' | 'rsv_asc' | 'wip_desc' | 'name_asc'>('date_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  // Executive KPI Aggregations
  const kpis = useMemo(() => {
    const totalWip = costAllocations.reduce((acc, ca) => acc.plus(ca.total_incurred_wip || '0'), D(0));
    const totalSales = costAllocations.reduce((acc, ca) => acc.plus(ca.total_sales_value || '0'), D(0));
    const avgRsv = totalSales.isZero() ? '0.00%' : `${totalWip.div(totalSales).times(100).toFixed(2)}%`;

    return {
      totalWip,
      totalSales,
      avgRsv,
      count: costAllocations.length
    };
  }, [costAllocations]);

  // Filtered allocations
  const filteredCostAllocations = useMemo(() => {
    return costAllocations.filter(ca => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const project = (ca.project_name || '').toLowerCase();
        const id = (ca.allocation_id || '').toLowerCase();
        return project.includes(q) || id.includes(q);
      }
      return true;
    });
  }, [costAllocations, searchQuery]);

  // Sorted allocations
  const sortedCostAllocations = useMemo(() => {
    const list = [...filteredCostAllocations];
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime();
      if (sortBy === 'date_asc') return new Date(a.calculated_at).getTime() - new Date(b.calculated_at).getTime();
      if (sortBy === 'rsv_desc') return D(b.rsv_factor || '0').minus(D(a.rsv_factor || '0')).toNumber();
      if (sortBy === 'rsv_asc') return D(a.rsv_factor || '0').minus(D(b.rsv_factor || '0')).toNumber();
      if (sortBy === 'wip_desc') return D(b.total_incurred_wip || '0').minus(D(a.total_incurred_wip || '0')).toNumber();
      if (sortBy === 'name_asc') return (a.project_name || '').localeCompare(b.project_name || '', isAr ? 'ar' : 'en');
      return 0;
    });
    return list;
  }, [filteredCostAllocations, sortBy, isAr]);

  const totalPages = Math.ceil(sortedCostAllocations.length / pageSize) || 1;
  const paginatedCostAllocations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCostAllocations.slice(start, start + pageSize);
  }, [sortedCostAllocations, currentPage, pageSize]);

  const activeFiltersCount = (searchQuery.trim() ? 1 : 0) + (sortBy !== 'date_desc' ? 1 : 0);

  const handleResetFilters = () => {
    setSortBy('date_desc');
    setSearchQuery('');
    setCurrentPage(1);
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
          <ZFErpBreadcrumb sectionTitle={isAr ? 'توزيع مصاريف المباني على الشقق' : 'WIP Cost Allocation (RSV)'} icon={<BarChart3 size={13} color="#946f23" />} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle}>
              {isAr ? 'توزيع مصاريف المباني على الشقق وحساب الأرباح' : 'WIP Capitalization & Relative Sales Value (RSV)'}
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
              {isAr ? 'حساب تكلفة كل شقة بدقة' : 'IFRS 15 Standard'}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isAr 
              ? 'توزيع مصاريف المباني على كل شقة لمعرفة تكلفتها وصافي ربحها عند البيع والتسليم.' 
              : 'Determine COGS relief factors upon unit handover and track capitalized WIP vs total catalog sales ceilings.'}
          </p>
        </div>

        <div className={styles.stageActions}>
          <button
            onClick={onOpenNewAllocation}
            style={{
              background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.65rem 1.25rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 14px rgba(197, 160, 89, 0.35)'
            }}
          >
            <Plus size={15} />
            <span>{isAr ? '+ توزيع مصاريف جديد لمشروع' : '+ New RSV Allocation'}</span>
          </button>
        </div>
      </div>

      {/* 2. ASYMMETRIC RSV CAPITALIZATION RADAR (Engineering Cost Archetype) */}
      <div className={styles.asymmetricBentoGrid}>
        {/* Left / Hero Card: Weighted RSV Factor */}
        <ZFKpiCard
          variant="double-bezel"
          isFlagship={true}
          title={isAr ? 'نسبة تكلفة البناء من سعر البيع' : 'Weighted RSV Capitalization Factor'}
          value={kpis.avgRsv}
          icon={<Calculator size={20} />}
          accentColor="gold"
          progress={parseFloat(kpis.avgRsv) || 0}
          progressColor="#b8903e"
          badge={{ text: isAr ? 'نسبة التكلفة من البيع' : 'IFRS 15 Compliant', variant: 'gold' }}
          subtitleLabel={isAr ? 'طريقة الخصم' : 'Accounting Impact'}
          subtitleValue={isAr ? 'بتتخصم تكلفة المباني تلقائياً لما نسلم الشقة للعميل' : 'Relieved at unit handover'}
        />

        {/* Right Stack: 2 Compact Telemetry Instruments */}
        <div className={styles.telemetryStack}>
          <ZFKpiCard
            variant="compact"
            title={isAr ? 'إجمالي المصروف على المباني والتشطيب' : 'Total Incurred Construction WIP'}
            value={kpis.totalWip.formatEGP(isAr)}
            icon={<FileText size={16} />}
            accentColor="slate"
            subtitleLabel={isAr ? 'نوع البند' : 'Type'}
            subtitleValue={isAr ? 'مصاريف مباني فعلية' : 'capitalized'}
          />

          <ZFKpiCard
            variant="compact"
            title={isAr ? 'إجمالي مبيعات الشقق المتوقعة' : 'Project Sales Ceiling (Denominator)'}
            value={kpis.totalSales.formatEGP(isAr)}
            icon={<TrendingUp size={16} />}
            accentColor="emerald"
            subtitleLabel={isAr ? 'إجمالي المبيعات' : 'Valuation'}
            subtitleValue={isAr ? 'قيمة كل الشقق بالأسعار الحالية' : 'estimated gross'}
          />
        </div>
      </div>

      {/* 3. Toolbar: Search, Sort, Filters & View Mode Switcher */}
      <ZFFilterToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder={isAr ? 'دوّر باسم المشروع أو كود التوزيع...' : 'Search allocations...'}
        sortBy={sortBy}
        onSortChange={(val) => {
          setSortBy(val as any);
          setCurrentPage(1);
        }}
        sortOptions={[
          { value: 'date_desc', label: isAr ? 'التاريخ: الأحدث الأول' : 'Newest Date' },
          { value: 'date_asc', label: isAr ? 'التاريخ: الأقدم الأول' : 'Oldest Date' },
          { value: 'rsv_desc', label: isAr ? 'نسبة تكلفة المباني: الأعلى الأول' : 'Highest RSV Factor' },
          { value: 'rsv_asc', label: isAr ? 'نسبة تكلفة المباني: الأقل الأول' : 'Lowest RSV Factor' },
          { value: 'wip_desc', label: isAr ? 'المصروف على المباني: الأكبر الأول' : 'Highest Incurred WIP' },
          { value: 'name_asc', label: isAr ? 'اسم المشروع: أ - ي' : 'Project Name (A-Z)' }
        ]}
        sortAriaLabel={isAr ? 'ترتيب المشروعات' : 'Sort Allocations'}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode as any)}
        isAr={isAr}
      />

      {/* 4. Main Content: Cards or Dense Table */}
      {filteredCostAllocations.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <Calculator size={36} color="#946f23" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
            {isAr ? 'مفيش حسابات توزيع مصاريف مسجلة' : 'No cost allocations recorded'}
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
            {isAr ? 'اضغط على "+ توزيع مصاريف جديد لمشروع" عشان تبدأ تحسب تكلفة وأرباح العمارة والشقق.' : 'Click "New RSV Allocation" to create your first project allocation.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{isAr ? 'المشروع' : 'Project'}</th>
                <th>{isAr ? 'المصروف على المباني' : 'Incurred WIP'}</th>
                <th>{isAr ? 'إجمالي سعر بيع الشقق' : 'Sales Value Ceiling'}</th>
                <th>{isAr ? 'نسبة تكلفة المباني' : 'Building Cost Ratio'}</th>
                <th>{isAr ? 'صافي مكسب المكتب' : 'Gross Margin'}</th>
                <th>{isAr ? 'تاريخ الحساب' : 'Calculated Date'}</th>
                <th style={{ textAlign: 'center' }}>{isAr ? 'تفاصيل' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCostAllocations.map(ca => {
                const rsvPct = D(ca.rsv_factor || '0').times(100).toFixed(2);
                const grossMarginPct = D(1).minus(ca.rsv_factor || '0').times(100).toFixed(2);
                return (
                  <tr 
                    key={ca.allocation_id}
                    onClick={() => onInspectRSV(ca)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>{ca.project_name}</td>
                    <td><MoneyCell amount={ca.total_incurred_wip} isAr={isAr} /></td>
                    <td><MoneyCell amount={ca.total_sales_value} isAr={isAr} /></td>
                    <td>
                      <span style={{
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 800,
                        color: '#946f23',
                        background: 'rgba(184, 144, 62, 0.08)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(184, 144, 62, 0.25)'
                      }}>
                        {rsvPct}%
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 800,
                        color: '#15803d',
                        background: 'rgba(21, 128, 61, 0.08)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(21, 128, 61, 0.25)'
                      }}>
                        {grossMarginPct}%
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{new Date(ca.calculated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectRSV(ca);
                        }}
                        style={{
                          background: 'rgba(184, 144, 62, 0.08)',
                          border: '1px solid rgba(184, 144, 62, 0.25)',
                          borderRadius: '6px',
                          padding: '0.25rem 0.55rem',
                          color: '#946f23',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={12} />
                        <span>{isAr ? 'عرض التفاصيل' : 'Inspect'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {paginatedCostAllocations.map(ca => {
            const rsvPct = D(ca.rsv_factor || '0').times(100).toFixed(2);
            const grossMarginPct = D(1).minus(ca.rsv_factor || '0').times(100).toFixed(2);

            return (
              <div
                key={ca.allocation_id}
                onClick={() => onInspectRSV(ca)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Header with spacious title and micro ID pill */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                      {ca.project_name}
                    </h3>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                      {isAr ? 'تاريخ الحساب: ' : 'Calculated: '}
                      {new Date(ca.calculated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                  <span dir="ltr" style={{
                    fontVariantNumeric: 'tabular-nums',
                    unicodeBidi: 'isolate',
                    whiteSpace: 'nowrap',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#64748b',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.15rem 0.45rem',
                    flexShrink: 0
                  }}>
                    #{ca.allocation_id.slice(0, 8)}
                  </span>
                </div>

                {/* Dual Split Analytics HUD Pods - Unified with RSVAllocationModal */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))',
                  gap: '0.75rem'
                }}>
                  {/* Pod 1: Building Cost Ratio (Brand Gold) */}
                  <div style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
                    border: '1.5px solid rgba(184, 144, 62, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    boxShadow: '0 2px 8px rgba(184, 144, 62, 0.04)'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: '#946f23', display: 'block', fontWeight: 800 }}>
                      {isAr ? 'نسبة تكلفة المباني من السعر:' : 'Building Cost Ratio:'}
                    </span>
                    <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#946f23', fontVariantNumeric: 'tabular-nums', margin: '0.2rem 0' }}>
                      {rsvPct}%
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#946f23', display: 'inline-block' }} />
                      {isAr ? 'من ثمن الشقة مباني وخامات' : 'construction cost'}
                    </span>
                  </div>

                  {/* Pod 2: Gross Profit Margin (Forest Jade) */}
                  <div style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f7fdf9 100%)',
                    border: '1.5px solid rgba(21, 128, 61, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    boxShadow: '0 2px 8px rgba(21, 128, 61, 0.04)'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: '#15803d', display: 'block', fontWeight: 800 }}>
                      {isAr ? 'مكسبنا الصافي المتوقع:' : 'Net Profit Margin:'}
                    </span>
                    <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#15803d', fontVariantNumeric: 'tabular-nums', margin: '0.2rem 0' }}>
                      {grossMarginPct}%
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803d', display: 'inline-block' }} />
                      {isAr ? 'مكسب صافي للمكتب' : 'net profit'}
                    </span>
                  </div>
                </div>

                {/* Dual Spectrum Progress Bar (Brand Gold vs Forest Jade) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: '#946f23', fontWeight: 800 }}>
                      {isAr ? `تكلفة المباني: ${rsvPct}%` : `WIP: ${rsvPct}%`}
                    </span>
                    <span style={{ color: '#15803d', fontWeight: 800 }}>
                      {isAr ? `مكسبنا الصافي: ${grossMarginPct}%` : `Margin: ${grossMarginPct}%`}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${Math.min(parseFloat(rsvPct) || 0, 100)}%`, background: 'linear-gradient(90deg, #c5a059, #946f23)', height: '100%' }} />
                    <div style={{ flex: 1, background: 'linear-gradient(90deg, #15803d, #16a34a)', height: '100%' }} />
                  </div>
                </div>

                {/* Financial Pool Ceiling Breakdown */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))',
                  gap: '0.75rem',
                  fontSize: '0.74rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                      {isAr ? 'المصروف على المباني:' : 'Incurred WIP:'}
                    </span>
                    <strong style={{ color: '#946f23', fontSize: '0.88rem', fontVariantNumeric: 'tabular-nums' }}>
                      <MoneyCell amount={ca.total_incurred_wip} isAr={isAr} />
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                      {isAr ? 'إجمالي مبيعات الشقق:' : 'Sales Ceiling:'}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '0.88rem', fontVariantNumeric: 'tabular-nums' }}>
                      <MoneyCell amount={ca.total_sales_value} isAr={isAr} />
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectRSV(ca);
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid rgba(184, 144, 62, 0.35)',
                    color: '#946f23',
                    borderRadius: '10px',
                    padding: '0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer',
                    marginTop: 'auto',
                    boxShadow: '0 1px 2px rgba(184, 144, 62, 0.08)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Eye size={14} color="#946f23" />
                  <span>{isAr ? 'عرض تفاصيل تكلفة العمارة والشقق' : 'Inspect Factor & Release'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Unified Pagination Bar */}
      <ZFPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedCostAllocations.length}
        pageSize={pageSize}
        pageSizeOptions={[6, 12, 24]}
        onPageChange={setCurrentPage}
        onPageSizeChange={sz => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
        isAr={isAr}
        itemLabel={{ ar: 'مشروع', en: 'allocations' }}
      />
    </div>
  );
};
