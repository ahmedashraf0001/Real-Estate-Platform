'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Eye, 
  Percent, 
  Plus, 
  TrendingUp, 
  BarChart3,
  HardHat,
  ShieldCheck
} from 'lucide-react';
import { ERPCostAllocation, ERPContract } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { RSVEngine } from '@/lib/erp/rsv';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFPagination } from '../ZFPagination';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
import { ZFPageHeader } from '../common/ZFPageHeader';
import { ZFKpiCard, ZFKpiGrid } from '../ZFKpiCard';
import { CostAllocationAnalyticsCharts } from './cost-allocation/CostAllocationAnalyticsCharts';
import { CostAllocationDetailDrawer } from './cost-allocation/CostAllocationDetailDrawer';
import styles from '../ZFWorkstationShell.module.css';

export type CostAllocationSortOption = 'date_desc' | 'date_asc' | 'rsv_desc' | 'rsv_asc' | 'wip_desc' | 'name_asc';

export interface CostAllocationViewProps {
  costAllocations: ERPCostAllocation[];
  contracts?: ERPContract[];
  properties?: Property[];
  isAr?: boolean;
  onOpenNewAllocation: () => void;
  onInspectRSV?: (allocation: ERPCostAllocation) => void;
  initialInspectingAllocationId?: string;
}

export const CostAllocationView: React.FC<CostAllocationViewProps> = ({
  costAllocations,
  contracts = [],
  properties = [],
  isAr = true,
  onOpenNewAllocation,
  onInspectRSV,
  initialInspectingAllocationId
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [activeTab, setActiveTab] = useState<'all' | 'high_margin' | 'moderate' | 'capital_intensive'>('all');
  const [sortBy, setSortBy] = useState<CostAllocationSortOption>('date_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string | null>(initialInspectingAllocationId || null);

  // Derive active inspecting allocation without cascading renders in useEffect
  const inspectingAllocation = useMemo(() => {
    if (!selectedAllocationId) return null;
    return costAllocations.find(a => a.allocation_id === selectedAllocationId || a.project_name === selectedAllocationId) || null;
  }, [selectedAllocationId, costAllocations]);

  // Find associated property for the inspecting allocation
  const inspectingProperty = useMemo(() => {
    if (!inspectingAllocation) return undefined;
    const name = (inspectingAllocation.project_name || '').trim().toLowerCase();
    return properties.find(p => 
      p.id === inspectingAllocation.project_name ||
      (p.title_ar && p.title_ar.trim().toLowerCase() === name) ||
      (p.title_en && p.title_en.trim().toLowerCase() === name) ||
      (p.slug && p.slug.trim().toLowerCase() === name) ||
      (p.title_ar && p.title_ar.trim().toLowerCase().includes(name)) ||
      (p.title_en && p.title_en.trim().toLowerCase().includes(name))
    );
  }, [inspectingAllocation, properties]);

  // 1. Executive KPI Aggregations (RSV Engine Portfolio Suite)
  const kpis = useMemo(() => {
    return RSVEngine.calculatePortfolioAllocationKPIs(costAllocations);
  }, [costAllocations]);

  // 2. Filtered allocations based on Search and Margin Tabs
  const filteredCostAllocations = useMemo(() => {
    return costAllocations.filter(ca => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const project = (ca.project_name || '').toLowerCase();
        const id = (ca.allocation_id || '').toLowerCase();
        if (!project.includes(q) && !id.includes(q)) return false;
      }

      // Margin Tab filter
      const factor = parseFloat(ca.rsv_factor || '0');
      const margin = 1 - factor;

      if (activeTab === 'high_margin') {
        return margin >= 0.50; // Margin >= 50%
      } else if (activeTab === 'moderate') {
        return margin >= 0.40 && margin < 0.50; // Margin 40% - 49.99%
      } else if (activeTab === 'capital_intensive') {
        return factor > 0.60; // Construction cost ratio > 60%
      }

      return true;
    });
  }, [costAllocations, searchQuery, activeTab]);

  // 3. Sorted allocations
  const sortedCostAllocations = useMemo(() => {
    const list = [...filteredCostAllocations];
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        const tB = b.calculated_at ? new Date(b.calculated_at).getTime() : 0;
        const tA = a.calculated_at ? new Date(a.calculated_at).getTime() : 0;
        return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
      }
      if (sortBy === 'date_asc') {
        const tB = b.calculated_at ? new Date(b.calculated_at).getTime() : 0;
        const tA = a.calculated_at ? new Date(a.calculated_at).getTime() : 0;
        return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
      }
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

  const activeFiltersCount = (searchQuery.trim() ? 1 : 0) + (sortBy !== 'date_desc' ? 1 : 0) + (activeTab !== 'all' ? 1 : 0);

  const handleResetFilters = () => {
    setActiveTab('all');
    setSortBy('date_desc');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSelectAllocation = (ca: ERPCostAllocation) => {
    setSelectedAllocationId(ca.allocation_id || ca.project_name);
    onInspectRSV?.(ca);
  };

  const handleCloseDrawer = () => {
    setSelectedAllocationId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('inspect') || url.searchParams.has('allocationId')) {
        url.searchParams.delete('inspect');
        url.searchParams.delete('allocationId');
        window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
      }
    }
  };

  return (
    <div className={styles.stageContainer} style={{ minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* 1. Header & Stage Breadcrumb */}
      <ZFPageHeader
        title={isAr ? 'توزيع تكاليف البناء على الوحدات' : 'Construction cost allocation'}
        subtitle={isAr ? 'توزيع تكلفة كل مبنى على وحداته حسب القيمة البيعية، لمعرفة تكلفة الوحدة وربحها عند التسليم.' : "Spread each building's cost over its units by sales value to get unit cost and profit at handover."}
        actions={(
          <button type="button" className={styles.btnPrimary} onClick={onOpenNewAllocation}>
            <Plus size={14} />
            <span>{isAr ? 'توزيع جديد' : 'New allocation'}</span>
          </button>
        )}
      />

      {/* 2. 4 DISCRETE FLOATING STAT CARDS */}
      <ZFKpiGrid>
        {/* Stat 1: Weighted RSV Factor */}
        <ZFKpiCard
          title={isAr ? 'نسبة تكلفة المباني (معامل RSV)' : 'Building Cost Ratio (RSV)'}
          value={kpis.avgRsvPct}
          icon={<Percent size={16} />}
          accentColor="accent"
          subtitleLabel={isAr ? 'معامل RSV' : 'RSV Factor'}
          subtitleValue={isAr ? 'الموزون للمحفظة' : 'Weighted Portfolio'}
          tooltip={isAr ? 'نسبة إجمالي تكلفة البناء والخامات من إجمالي القيمة البيعية للمشروعات' : 'Portfolio-wide ratio of construction costs to gross sales'}
        />

        {/* Stat 2: Incurred Construction WIP */}
        <ZFKpiCard
          title={isAr ? 'إجمالي المصروف الفعلي على المباني' : 'Incurred Construction WIP'}
          value={kpis.totalWip.formatEGP(isAr)}
          unitLabel={isAr ? 'ج.م' : 'EGP'}
          icon={<HardHat size={16} />}
          accentColor="blue"
          subtitleLabel={isAr ? 'أصل استثماري محمل' : 'Capitalized Asset'}
          subtitleValue={isAr ? 'حساب 150000' : 'Account 150000'}
          tooltip={isAr ? 'إجمالي تكاليف البناء والخامات المتكبدة والرسملة بحساب 150000' : 'Total capitalized construction WIP in Account 150000'}
        />

        {/* Stat 3: Total Sales Ceiling */}
        <ZFKpiCard
          title={isAr ? 'سقف القيمة البيعية الكلية' : 'Gross Sales Ceiling'}
          value={kpis.totalSales.formatEGP(isAr)}
          unitLabel={isAr ? 'ج.م' : 'EGP'}
          icon={<TrendingUp size={16} />}
          accentColor="emerald"
          subtitleLabel={isAr ? 'مقام التوزيع' : 'Denominator'}
          subtitleValue={isAr ? 'سقف المبيعات المقدر' : 'Total Gross Ceiling'}
          tooltip={isAr ? 'إجمالي القيمة البيعية المتوقعة لكل شقق ووحدات المشروعات' : 'Total projected catalog sales value across all projects'}
        />

        {/* Stat 4: Portfolio Gross Profit Margin */}
        <ZFKpiCard
          title={isAr ? 'صافي هامش الربح الإجمالي' : 'Gross Profit Margin'}
          value={kpis.avgGrossMarginPct}
          icon={<Calculator size={16} />}
          accentColor="emerald"
          subtitleLabel={isAr ? 'صافي الربح المقدر' : 'Expected Profit'}
          subtitleValue={kpis.totalGrossMarginValue.formatEGP(isAr) + (isAr ? ' ج.م' : ' EGP')}
          tooltip={isAr ? 'صافي الأرباح المحققة المتوقعة للمكتب بعد استنزال تكلفة البناء' : 'Net anticipated profits after WIP relief'}
        />
      </ZFKpiGrid>

      {/* 3. MARGIN CATEGORY FILTER TABS & TOOLBAR */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '0.85rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {/* Category Tabs */}
        <div className={styles.tableTabsUnderline} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`${styles.underlineTab} ${activeTab === 'all' ? styles.underlineTabActive : ''}`}
            onClick={() => {
              setActiveTab('all');
              setCurrentPage(1);
            }}
          >
            <span>{isAr ? 'كافة المشروعات' : 'All Projects'}</span>
            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '999px', background: '#f1f5f9', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              {costAllocations.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'high_margin'}
            className={`${styles.underlineTab} ${activeTab === 'high_margin' ? styles.underlineTabActive : ''}`}
            onClick={() => {
              setActiveTab('high_margin');
              setCurrentPage(1);
            }}
          >
            <span>{isAr ? 'هامش ربح مرتفع (≥ 50%)' : 'High Margin (≥ 50%)'}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'moderate'}
            className={`${styles.underlineTab} ${activeTab === 'moderate' ? styles.underlineTabActive : ''}`}
            onClick={() => {
              setActiveTab('moderate');
              setCurrentPage(1);
            }}
          >
            <span>{isAr ? 'هامش ربح معتدل (40% - 50%)' : 'Moderate Margin (40-50%)'}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'capital_intensive'}
            className={`${styles.underlineTab} ${activeTab === 'capital_intensive' ? styles.underlineTabActive : ''}`}
            onClick={() => {
              setActiveTab('capital_intensive');
              setCurrentPage(1);
            }}
          >
            <span>{isAr ? 'تكلفة مباني مرتفعة (> 60%)' : 'Capital Intensive (> 60%)'}</span>
          </button>
        </div>

        {/* Toolbar: Search, Sort, and View Mode */}
        <ZFFilterToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          searchPlaceholder={isAr ? 'بحث باسم المشروع أو كود التوزيع...' : 'Search allocations...'}
          sortBy={sortBy}
          onSortChange={(val) => {
            setSortBy(val as CostAllocationSortOption);
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
          onViewModeChange={(mode) => setViewMode(mode === 'cards' ? 'cards' : 'table')}
          isAr={isAr}
        />
      </div>

      {/* 4. MAIN CONTENT: TABLE OR CARDS VIEW */}
      {filteredCostAllocations.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <Calculator size={36} color="var(--erp-accent)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, color: 'var(--erp-text-title)', fontSize: '0.88rem', fontWeight: 700 }}>
            {isAr ? 'لا توجد حسابات توزيع مصاريف مسجلة' : 'No cost allocations found'}
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
            {isAr 
              ? 'اضغط على "+ توزيع مصاريف جديد لمشروع" للبدء في حساب تكلفة وأرباح العمارة والشقق.' 
              : 'Click "New RSV Allocation" to create your first project allocation.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={styles.canonicalTableCard}>
          <div className={styles.tableContainer}>
            <table className={styles.canonicalTable}>
              <thead className={styles.canonicalThead}>
                <tr>
                  <th className={styles.canonicalTh}>{isAr ? 'المشروع' : 'Project'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'المصروف الفعلي (WIP)' : 'Incurred WIP'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'سقف المبيعات الكلي' : 'Sales Value Ceiling'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'نسبة تكلفة المباني (RSV)' : 'Building Cost Ratio'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'صافي هامش الربح' : 'Gross Margin'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'الحالة المحاسبية' : 'Accounting Status'}</th>
                  <th className={styles.canonicalTh}>{isAr ? 'تاريخ الحساب' : 'Calculated Date'}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCostAllocations.map(ca => {
                  const factor = parseFloat(ca.rsv_factor || '0');
                  const rsvPct = (factor * 100).toFixed(2);
                  const grossMarginPct = ((1 - factor) * 100).toFixed(2);
                  const isOverrun = factor >= 1.0;
                  const isHighCost = !isOverrun && factor > 0.60;

                  return (
                    <tr 
                      key={ca.allocation_id}
                      className={styles.canonicalRow}
                      onClick={() => handleSelectAllocation(ca)}
                      tabIndex={0}
                      role="button"
                    >
                      <td className={styles.canonicalTd} style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span>{ca.project_name}</span>
                          <span dir="ltr" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            #{ca.allocation_id.slice(0, 6)}
                          </span>
                        </div>
                      </td>
                      <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                        <MoneyCell amount={ca.total_incurred_wip} isAr={isAr} />
                      </td>
                      <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                        <MoneyCell amount={ca.total_sales_value} isAr={isAr} />
                      </td>
                      <td className={styles.canonicalTd}>
                        <span style={{
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          color: isOverrun ? '#dc2626' : isHighCost ? '#d97706' : 'var(--erp-accent)',
                          fontSize: '0.85rem'
                        }}>
                          {rsvPct}%
                        </span>
                      </td>
                      <td className={styles.canonicalTd}>
                        <span style={{
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          color: isOverrun ? '#dc2626' : '#16a34a',
                          fontSize: '0.85rem'
                        }}>
                          {grossMarginPct}%
                        </span>
                      </td>
                      <td className={styles.canonicalTd}>
                        <span className={`${styles.statusPill} ${isOverrun ? styles.statusPillRed : isHighCost ? styles.statusPillAmber : styles.statusPillGreen}`}>
                          <ShieldCheck size={11} />
                          <span>{isOverrun ? (isAr ? 'تجاوز تكاليف (خسارة)' : 'Cost Overrun / Loss') : isHighCost ? (isAr ? 'تكلفة مرتفعة' : 'High Cost Ratio') : (isAr ? 'هامش آمن معتمد' : 'IFRS 15 Certified')}</span>
                        </span>
                      </td>
                      <td className={styles.canonicalTd} style={{ color: '#64748b', fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(ca.calculated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {paginatedCostAllocations.map(ca => {
            const factor = parseFloat(ca.rsv_factor || '0');
            const rsvPct = (factor * 100).toFixed(2);
            const grossMarginPct = ((1 - factor) * 100).toFixed(2);

            return (
              <div
                key={ca.allocation_id}
                onClick={() => handleSelectAllocation(ca)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--erp-text-title)', lineHeight: 1.4 }}>
                      {ca.project_name}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
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

                {/* Dual Split Pods */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))',
                  gap: '0.75rem'
                }}>
                  {/* Building Cost Ratio */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem'
                  }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                      {isAr ? 'نسبة تكلفة المباني:' : 'Cost Ratio (RSV):'}
                    </span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--erp-accent)', fontVariantNumeric: 'tabular-nums', margin: '0.2rem 0' }}>
                      {rsvPct}%
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--erp-accent)', display: 'inline-block' }} />
                      {isAr ? 'من ثمن الشقة مباني' : 'construction cost'}
                    </span>
                  </div>

                  {/* Net Profit Margin */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem'
                  }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                      {isAr ? 'صافي هامش الربح:' : 'Gross Margin:'}
                    </span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: factor >= 1.0 ? '#dc2626' : '#16a34a', fontVariantNumeric: 'tabular-nums', margin: '0.2rem 0' }}>
                      {grossMarginPct}%
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: factor >= 1.0 ? '#dc2626' : '#16a34a', display: 'inline-block' }} />
                      {isAr ? (factor >= 1.0 ? 'خسارة إنشائية للمكتب' : 'مكسب صافي للمكتب') : (factor >= 1.0 ? 'project loss' : 'net profit')}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: factor >= 1.0 ? '#dc2626' : 'var(--erp-accent)', fontWeight: 700 }}>
                      {isAr ? `تكلفة المباني: ${rsvPct}%` : `WIP: ${rsvPct}%`}
                    </span>
                    <span style={{ color: factor >= 1.0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                      {isAr ? `هامش الربح: ${grossMarginPct}%` : `Margin: ${grossMarginPct}%`}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
                    {factor >= 1.0 ? (
                      <div style={{ width: '100%', background: '#dc2626', height: '100%' }} />
                    ) : (
                      <>
                        <div style={{ width: `${Math.max(0, Math.min(parseFloat(rsvPct) || 0, 100))}%`, background: 'var(--erp-accent)', height: '100%' }} />
                        <div style={{ width: `${Math.max(0, Math.min(parseFloat(grossMarginPct) || 0, 100))}%`, background: '#16a34a', height: '100%' }} />
                      </>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAllocation(ca);
                  }}
                  style={{ marginTop: 'auto' }}
                >
                  <Eye size={13} />
                  <span>{isAr ? 'فحص تفاصيل المشروع واستنزال التكلفة' : 'Inspect Allocation & Relief'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
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

      {/* 5. CAD CARTESIAN BLUEPRINT CHARTS */}
      <div style={{ marginTop: '1.75rem', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={16} color="var(--erp-accent)" />
            <h2 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--erp-text-title)' }}>
              {isAr ? 'التحليلات البيانية والرسملة الهندسية (CAD Analytics)' : 'CAD Cartesian Analytics & Capitalization'}
            </h2>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {isAr ? 'مخططات بيانية تفصيلية لتوزيع التكاليف وهوامش الأرباح' : 'Detailed cost distribution & margin blueprints'}
          </span>
        </div>

        <CostAllocationAnalyticsCharts
          allocations={filteredCostAllocations.length > 0 ? filteredCostAllocations : costAllocations}
          isAr={isAr}
        />
      </div>

      {/* 6. DEDICATED SLIDE-OVER DETAIL DRAWER */}
      <CostAllocationDetailDrawer
        isOpen={Boolean(inspectingAllocation)}
        onClose={handleCloseDrawer}
        allocation={inspectingAllocation}
        contracts={contracts}
        property={inspectingProperty}
        isAr={isAr}
      />
    </div>
  );
};

