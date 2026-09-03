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
  Plus
} from 'lucide-react';
import { ERPCostAllocation } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
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
  const [searchQuery, setSearchQuery] = useState<string>('');

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
            <span>{isAr ? 'تخصيص التكاليف' : 'Cost Allocation'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle}>
              {isAr ? 'تخصيص التكاليف ورسملة الأعمال تحت التنفيذ (RSV)' : 'WIP Capitalization & Relative Sales Value (RSV)'}
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
              {isAr ? 'معيار IFRS 15 الدولي' : 'IFRS 15 Standard'}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isAr 
              ? 'تحديد نسبة تكلفة المبيعات (COGS) المستنزلة عند تسليم كل وحدة واحتساب هوامش الربح المقدرة.' 
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
            <span>{isAr ? '+ حساب معامل رسملة جديد (RSV)' : '+ New RSV Allocation'}</span>
          </button>
        </div>
      </div>

      {/* 2. 3 Executive Allocation KPI Cards */}
      <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* Card 1: Total Incurred WIP */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>{isAr ? 'إجمالي أعمال التنفيذ المتكبدة (WIP)' : 'Total Incurred WIP'}</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(184, 144, 62, 0.1)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            <span>{splitAmount(kpis.totalWip).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.totalWip).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ background: 'rgba(184, 144, 62, 0.08)', color: '#946f23', borderColor: 'rgba(184, 144, 62, 0.25)' }}>
              {isAr ? 'أستاذ ١٠٥٠٠٠' : 'GL 105000'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'تكاليف مرسملة بالدفاتر' : 'capitalized costs'}</span>
          </div>
        </div>

        {/* Card 2: Total Sales Ceiling */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>{isAr ? 'سقف المبيعات المقدر للمشاريع' : 'Total Project Sales Ceiling'}</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(184, 144, 62, 0.08)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            <span>{splitAmount(kpis.totalSales).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.totalSales).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ background: 'rgba(184, 144, 62, 0.08)', color: '#946f23', borderColor: 'rgba(184, 144, 62, 0.25)' }}>
              {isAr ? 'الوعاء البيعي' : 'Sales Denominator'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'سقف إيرادات المشروعات' : 'estimated gross'}</span>
          </div>
        </div>

        {/* Card 3: Weighted RSV Factor (Flagship Card) */}
        <div className={`${styles.kpiCard} ${styles.flagshipCard}`}>
          <div className={styles.kpiHeader}>
            <span className={`${styles.kpiLabel} ${styles.flagshipLabel}`}>
              {isAr ? 'متوسط معامل الـ RSV (نسبة تكلفة الإنشاء)' : 'Weighted RSV Factor'}
            </span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(184, 144, 62, 0.12)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calculator size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {kpis.avgRsv}
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ background: 'rgba(184, 144, 62, 0.1)', color: '#946f23', borderColor: 'rgba(184, 144, 62, 0.25)' }}>
              {isAr ? 'معدل استنزال COGS' : 'COGS Relief Rate'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'تستنزل عند تسليم كل وحدة' : 'relieved at handover'}</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search & View Mode Switcher */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث باسم المشروع أو كود التخصيص...' : 'Search allocations...'}
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

        <div className={styles.viewModeGroup}>
          <button
            className={`${styles.viewModeBtn} ${viewMode === 'cards' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('cards')}
            title={isAr ? 'عرض البطاقات' : 'Cards'}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            className={`${styles.viewModeBtn} ${viewMode === 'table' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('table')}
            title={isAr ? 'عرض الجدول' : 'Table'}
          >
            <List size={15} />
          </button>
        </div>
      </div>

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
          <Calculator size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
            {isAr ? 'لا توجد معاملات تخصيص تكاليف مسجلة' : 'No cost allocations recorded'}
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
            {isAr ? 'انقر على زر "حساب معامل رسملة جديد" لإنشاء أول تخصيص للمشروع.' : 'Click "New RSV Allocation" to create your first project allocation.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{isAr ? 'المشروع' : 'Project'}</th>
                <th>{isAr ? 'أعمال التنفيذ المتكبدة (WIP)' : 'Incurred WIP'}</th>
                <th>{isAr ? 'سقف المبيعات المقدر' : 'Sales Value Ceiling'}</th>
                <th>{isAr ? 'معامل RSV' : 'RSV Factor'}</th>
                <th>{isAr ? 'نسبة تكلفة المبيعات' : 'COGS Relief Rate'}</th>
                <th>{isAr ? 'هامش الربح المقدر' : 'Gross Margin'}</th>
                <th>{isAr ? 'تاريخ الحساب' : 'Calculated Date'}</th>
                <th style={{ textAlign: 'center' }}>{isAr ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCostAllocations.map(ca => {
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
                        padding: '0.15rem 0.45rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(184, 144, 62, 0.2)'
                      }}>
                        {ca.rsv_factor}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#1e293b', fontWeight: 800 }}>
                        {D(ca.rsv_factor || '0').times(100).toFixed(2)}% {isAr ? 'من قيمة العقد' : 'of contract'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#946f23', fontWeight: 800 }}>
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
                        <span>{isAr ? 'فحص' : 'Inspect'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredCostAllocations.map(ca => {
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
                      {isAr ? 'تاريخ الاحتساب: ' : 'Calculated: '}
                      {new Date(ca.calculated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                  <span style={{
                    fontVariantNumeric: 'tabular-nums',
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

                {/* Dual Split Analytics HUD Pods (Calm Alabaster & Egyptian Gold) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem'
                }}>
                  {/* Pod 1: WIP Ratio */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                      {isAr ? 'معامل RSV (تكلفة WIP):' : 'RSV Factor (COGS):'}
                    </span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums', margin: '0.2rem 0' }}>
                      {ca.rsv_factor}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1e293b', display: 'inline-block' }} />
                      {rsvPct}% {isAr ? 'من قيمة الوحدة' : 'cost ratio'}
                    </span>
                  </div>

                  {/* Pod 2: Gross Profit Margin */}
                  <div style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
                    border: '1.5px solid rgba(184, 144, 62, 0.35)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    boxShadow: '0 2px 8px rgba(184, 144, 62, 0.06)'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: '#946f23', display: 'block', fontWeight: 800 }}>
                      {isAr ? 'هامش الربح المقدر:' : 'Gross Profit Margin:'}
                    </span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#946f23', fontVariantNumeric: 'tabular-nums', margin: '0.2rem 0' }}>
                      {grossMarginPct}%
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#946f23', display: 'inline-block' }} />
                      {isAr ? 'عائد ربحي معترف به' : 'profit margin'}
                    </span>
                  </div>
                </div>

                {/* Dual Spectrum Progress Bar (Obsidian Slate vs Egyptian Gold) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: '#1e293b', fontWeight: 800 }}>{isAr ? `تكلفة إنشاء WIP: ${rsvPct}%` : `WIP: ${rsvPct}%`}</span>
                    <span style={{ color: '#946f23', fontWeight: 800 }}>{isAr ? `هامش ربح: ${grossMarginPct}%` : `Margin: ${grossMarginPct}%`}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${Math.min(parseFloat(rsvPct) || 0, 100)}%`, background: '#1e293b', height: '100%' }} />
                    <div style={{ flex: 1, background: 'linear-gradient(90deg, #c5a059, #946f23)', height: '100%' }} />
                  </div>
                </div>

                {/* Financial Pool Ceiling Breakdown */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  fontSize: '0.74rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block', marginBottom: '0.15rem' }}>
                      {isAr ? 'تكاليف الإنشاء المتكبدة (105000):' : 'Incurred WIP:'}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '0.82rem' }}><MoneyCell amount={ca.total_incurred_wip} isAr={isAr} /></strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block', marginBottom: '0.15rem' }}>
                      {isAr ? 'سقف المبيعات المقدر:' : 'Sales Ceiling:'}
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '0.82rem' }}><MoneyCell amount={ca.total_sales_value} isAr={isAr} /></strong>
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
                    border: '1px solid #e2e8f0',
                    color: '#946f23',
                    borderRadius: '9px',
                    padding: '0.55rem',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer',
                    marginTop: 'auto',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Eye size={13} color="#946f23" />
                  <span>{isAr ? 'فحص تفاصيل المعامل والتسليم' : 'Inspect Factor & Release'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
