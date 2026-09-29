'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  Building2,
  Maximize2,
  X
} from 'lucide-react';
import { ProjectedVaultItem, VaultKPIs } from '@/lib/erp/installmentsVaultProjection';
import { D } from '@/lib/erp/math';
import { ERPApexChart } from '../../charts/ERPApexChart';
import { ZFWidgetCard } from '../../common/ZFWorkstationSideWidgets';

export interface InstallmentsAnalyticsChartsProps {
  items: ProjectedVaultItem[];
  kpis: VaultKPIs;
  isAr?: boolean;
  variant?: 'rail' | 'grid';
}

/**
 * Cleanly trims project names to maxLen with ellipsis (e.g. max 16 chars)
 * so horizontal bars have generous horizontal space in narrow side widgets rail.
 */
export function formatProjectLabel(name: string, maxLen = 16): string {
  const trimmed = (name || '').trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.substring(0, maxLen - 1)}…`;
}

/**
 * Executive-grade dynamic height: minimum 260px or 42px per project category bar.
 * Ensures horizontal bars never squash flat even with 150M axis scale.
 */
export function calculateProjectChartHeight(categoriesCount: number): number {
  return Math.max(260, categoriesCount * 42);
}

/**
 * Formats YYYY-MM into localized month with 2-digit year (e.g. 'سبتمبر 26', 'Oct 26')
 * for compact, clean X-axis readability without angled rotation.
 */
export function formatMonthCategory(ym: string, isAr = true): string {
  if (!ym || !ym.includes('-')) return ym || '';
  const [year, month] = ym.split('-');
  const mIdx = parseInt(month, 10) - 1;
  const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mName = isAr ? (monthNamesAr[mIdx] || month) : (monthNamesEn[mIdx] || month);
  const shortYear = year && year.length === 4 ? year.slice(-2) : (year || '');
  return shortYear ? `${mName} ${shortYear}` : mName;
}

/**
 * Formats large financial metrics for compact axis ticks (e.g. 150M, 1.5M, 200k, 0)
 */
export function formatAxisNumber(val: any): string {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return `${val ?? ''}`;
  if (Math.abs(num) >= 1_000_000) {
    const m = num / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    const k = num / 1_000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(0)}k`;
  }
  return `${num}`;
}

export const InstallmentsAnalyticsCharts: React.FC<InstallmentsAnalyticsChartsProps> = ({
  items,
  kpis,
  isAr = true,
  variant = 'rail'
}) => {
  const [expandedChart, setExpandedChart] = useState<'trend' | 'status' | 'project' | null>(null);

  // 1. Chart 1: Dues vs Collections Trend (Real Record Timeline)
  const trendData = useMemo(() => {
    // Collect all month buckets (YYYY-MM)
    const monthSet = new Set<string>();
    
    // Group dues by due_date month
    const duesByMonth = new Map<string, number>();
    // Group collections by paymentDate/clearedDate month
    const collectionsByMonth = new Map<string, number>();

    for (const item of items) {
      if (item.dueDate && /^\d{4}-\d{2}/.test(item.dueDate)) {
        const ym = item.dueDate.substring(0, 7);
        monthSet.add(ym);
        duesByMonth.set(ym, (duesByMonth.get(ym) || 0) + D(item.nominalValue || '0').toNumber());
      }

      const collectedVal = D(
        item.status === 'cleared' 
          ? (item.amountPaid && D(item.amountPaid).gt(0) ? item.amountPaid : item.nominalValue) 
          : (item.amountPaid || '0')
      ).toNumber();

      if (collectedVal > 0) {
        const payDate = item.paymentDate || item.clearedDate || item.dueDate;
        if (payDate && /^\d{4}-\d{2}/.test(payDate)) {
          const ym = payDate.substring(0, 7);
          monthSet.add(ym);
          collectionsByMonth.set(ym, (collectionsByMonth.get(ym) || 0) + collectedVal);
        }
      }
    }

    // Sort months chronologically
    const sortedMonths = Array.from(monthSet).sort();

    // If empty, generate default honest zero-month
    if (sortedMonths.length === 0) {
      const nowYM = new Date().toISOString().substring(0, 7);
      sortedMonths.push(nowYM);
    }

    // Format categories with short 2-digit year for compact, clean X-axis readability
    const categories = sortedMonths.map(ym => formatMonthCategory(ym, isAr));

    const duesSeries = sortedMonths.map(ym => duesByMonth.get(ym) || 0);
    const collectionsSeries = sortedMonths.map(ym => collectionsByMonth.get(ym) || 0);

    return {
      categories,
      series: [
        {
          name: isAr ? 'المستحقات المجدولة' : 'Scheduled Dues',
          data: duesSeries
        },
        {
          name: isAr ? 'التحصيلات الفعلية' : 'Actual Collections',
          data: collectionsSeries
        }
      ]
    };
  }, [items, isAr]);

  // 2. Chart 2: Status Distribution Donut
  const donutData = useMemo(() => {
    let overdueCount = 0;
    let dueTodayCount = 0;
    let upcomingCount = 0;
    let depositedCount = 0;
    let clearedCount = 0;
    let bouncedCount = 0;

    for (const item of items) {
      switch (item.status) {
        case 'overdue': overdueCount++; break;
        case 'due_today': dueTodayCount++; break;
        case 'deposited': depositedCount++; break;
        case 'cleared': clearedCount++; break;
        case 'bounced': bouncedCount++; break;
        default: upcomingCount++; break;
      }
    }

    const labels = [
      isAr ? 'مستحق اليوم' : 'Due Today',
      isAr ? 'متأخرات' : 'Overdue',
      isAr ? 'مجدول قادم' : 'Upcoming',
      isAr ? 'مودع بالبنك' : 'Deposited',
      isAr ? 'محصل بالكامل' : 'Cleared',
      isAr ? 'مرتد / متعثر' : 'Bounced'
    ];

    const series = [
      dueTodayCount,
      overdueCount,
      upcomingCount,
      depositedCount,
      clearedCount,
      bouncedCount
    ];

    const total = series.reduce((a, b) => a + b, 0);
    const colors = ['#d97706', '#dc2626', '#64748b', '#2563eb', '#16a34a', '#991b1b'];
    const legendItems = labels.map((label, idx) => {
      const count = series[idx];
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        key: `status-${idx}`,
        label,
        count,
        percent,
        color: colors[idx]
      };
    }).filter(i => i.count > 0);

    return { labels, series, legendItems, colors, total };
  }, [items, isAr]);

  // 3. Chart 3: Project Breakdown Bar Chart
  const projectBreakdownData = useMemo(() => {
    const projectMap = new Map<string, { dues: number; collected: number }>();

    for (const item of items) {
      const proj = item.projectTitle?.trim() || (isAr ? 'مشروع عقاري' : 'Project');
      const prev = projectMap.get(proj) || { dues: 0, collected: 0 };

      const val = D(item.nominalValue || '0').toNumber();
      prev.dues += val;

      const collectedVal = D(
        item.status === 'cleared'
          ? (item.amountPaid && D(item.amountPaid).gt(0) ? item.amountPaid : item.nominalValue)
          : (item.amountPaid || '0')
      ).toNumber();

      if (collectedVal > 0) {
        prev.collected += collectedVal;
      }

      projectMap.set(proj, prev);
    }

    const rawProjects = Array.from(projectMap.keys());
    const projectCount = items.length > 0 ? rawProjects.length : 0;
    const fullProjects = rawProjects.length > 0 ? rawProjects : [isAr ? 'لا توجد مشاريع' : 'No Projects'];

    // Cleanly trim category labels to max 16 chars with ellipsis so horizontal bars have ample room
    const categories = fullProjects.map(p => formatProjectLabel(p, 16));

    const duesData = fullProjects.map(p => projectMap.get(p)?.dues || 0);
    const collectedData = fullProjects.map(p => projectMap.get(p)?.collected || 0);

    return {
      projectCount,
      categories,
      fullCategories: fullProjects,
      series: [
        {
          name: isAr ? 'إجمالي الأقساط' : 'Total Dues',
          data: duesData
        },
        {
          name: isAr ? 'المحصل' : 'Collected',
          data: collectedData
        }
      ]
    };
  }, [items, isAr]);

  // Executive-grade dynamic height: minimum 260px or 42px per project category bar
  const projectChartHeight = calculateProjectChartHeight(projectBreakdownData.categories.length);

  const renderExpandedModal = () => {
    if (!expandedChart) return null;

    let modalTitle = '';
    let modalSubtitle = '';
    let chartContent: React.ReactNode = null;

    if (expandedChart === 'trend') {
      modalTitle = isAr ? 'حركة التحصيلات والمستحقات (عرض تفصيلي مكبّر)' : 'Dues vs Collections Trend (Full View)';
      modalSubtitle = isAr ? 'مقارنة دقيقة للاستحقاقات التعاقدية بالتحصيل الفعلي بالشهور' : 'Detailed monthly comparison of dues and collections';
      chartContent = (
        <div style={{ width: '100%', height: '400px' }}>
          <ERPApexChart
            type="area"
            height={400}
            series={trendData.series}
            options={{
              chart: { toolbar: { show: true } },
              colors: ['var(--erp-accent, #2563eb)', '#10b981'],
              xaxis: {
                categories: trendData.categories,
                labels: { style: { colors: '#64748b', fontSize: '12px' } }
              },
              yaxis: {
                opposite: isAr,
                labels: { style: { colors: '#64748b', fontSize: '12px' }, formatter: formatAxisNumber }
              },
              stroke: { curve: 'smooth', width: [3, 2.5] }
            }}
            isAr={isAr}
          />
        </div>
      );
    } else if (expandedChart === 'status') {
      modalTitle = isAr ? 'توزيع حالات الاستحقاقات (عرض تفصيلي مكبّر)' : 'Status Distribution (Full View)';
      modalSubtitle = isAr ? 'تحليل نسبي لحالات التحصيل والمستحقات والمتأخرات بالمحفظة' : 'Proportional breakdown of all portfolio dues and collections';
      chartContent = (
        <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ERPApexChart
            type="donut"
            height={380}
            series={donutData.series}
            options={{
              labels: donutData.labels,
              colors: donutData.colors,
              legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '13px' },
              plotOptions: {
                pie: {
                  donut: {
                    size: '65%',
                    labels: {
                      show: true,
                      total: {
                        show: true,
                        label: isAr ? 'الإجمالي' : 'Total',
                        fontSize: '14px',
                        fontWeight: 700,
                        formatter: () => `${donutData.total}`
                      }
                    }
                  }
                }
              }
            }}
            isAr={isAr}
          />
        </div>
      );
    } else if (expandedChart === 'project') {
      modalTitle = isAr ? 'التحصيلات حسب المشروع (عرض تفصيلي مكبّر)' : 'Dues & Collections by Project (Full View)';
      modalSubtitle = isAr ? 'توزيع المحفظة الاستثمارية والمبالغ المحصلة لكل مشروع عقاري' : 'Portfolio dues and collections distribution by real estate project';
      chartContent = (
        <div style={{ width: '100%', height: '420px', overflowY: 'auto' }}>
          <ERPApexChart
            type="bar"
            height={Math.max(400, projectBreakdownData.categories.length * 48)}
            series={projectBreakdownData.series}
            options={{
              colors: ['var(--erp-accent, #2563eb)', '#10b981'],
              plotOptions: { bar: { horizontal: true, barHeight: '55%', borderRadius: 4 } },
              xaxis: {
                categories: projectBreakdownData.categories,
                labels: { style: { colors: '#64748b', fontSize: '12px' }, formatter: formatAxisNumber }
              },
              yaxis: {
                opposite: isAr,
                labels: { style: { colors: '#475569', fontSize: '12px', fontWeight: 600 } }
              }
            }}
            isAr={isAr}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}
        onClick={() => setExpandedChart(null)}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '850px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafbfc'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{modalTitle}</h3>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{modalSubtitle}</span>
            </div>
            <button
              type="button"
              onClick={() => setExpandedChart(null)}
              style={{
                background: 'none',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '4px',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ padding: '1.25rem' }}>
            {chartContent}
          </div>
        </div>
      </div>
    );
  };

  if (variant === 'rail') {
    return (
      <div className="sideWidgetsWrap" style={{ display: 'contents' }}>
        {/* 1. Dues vs Collections Area Chart Card */}
        <ZFWidgetCard
          id="zf-side-widget-dues-trend"
          title={isAr ? 'حركة التحصيلات والمستحقات' : 'Dues vs Collections'}
          icon={<TrendingUp size={15} />}
          headerAction={
            <button
              type="button"
              onClick={() => setExpandedChart('trend')}
              title={isAr ? 'تكبير الرسم البياني' : 'Expand chart'}
              aria-label={isAr ? 'تكبير الرسم البياني' : 'Expand chart'}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Maximize2 size={13} />
            </button>
          }
          defaultExpanded={true}
          isAr={isAr}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              flexWrap: 'wrap',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.45rem 0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.72rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--erp-accent, #2563eb)', display: 'inline-block' }} />
                  <span style={{ color: '#475569', fontWeight: 600 }}>{isAr ? 'المستحقات' : 'Dues'}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span style={{ color: '#475569', fontWeight: 600 }}>{isAr ? 'المحصل' : 'Collected'}</span>
                </span>
              </div>
            </div>

            <div style={{ width: '100%', minHeight: '230px' }}>
              <ERPApexChart
                type="area"
                height={230}
                series={trendData.series}
                options={{
                  chart: {
                    toolbar: { show: false },
                    zoom: { enabled: false }
                  },
                  colors: ['var(--erp-accent, #2563eb)', '#10b981'],
                  xaxis: {
                    categories: trendData.categories,
                    axisBorder: { show: true, color: '#cbd5e1' },
                    axisTicks: { show: true, color: '#cbd5e1' },
                    labels: {
                      style: { colors: '#64748b', fontSize: '10px' },
                      rotate: 0,
                      hideOverlappingLabels: true
                    }
                  },
                  yaxis: {
                    opposite: isAr,
                    axisBorder: { show: true, color: '#cbd5e1' },
                    labels: {
                      style: { colors: '#64748b', fontSize: '10px' },
                      formatter: formatAxisNumber
                    }
                  },
                  grid: {
                    borderColor: '#e2e8f0',
                    strokeDashArray: 2,
                    xaxis: { lines: { show: true } },
                    yaxis: { lines: { show: true } }
                  },
                  stroke: {
                    curve: 'smooth',
                    width: [2.5, 2]
                  }
                }}
                isAr={isAr}
              />
            </div>
          </div>
        </ZFWidgetCard>

        {/* 2. Status Distribution Donut Card */}
        <ZFWidgetCard
          id="zf-side-widget-status-dist"
          title={isAr ? 'توزيع حالات الأقساط' : 'Status Distribution'}
          icon={<PieIcon size={15} />}
          badge={
            <span className="statusPill statusPillNeutral" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>
              {kpis.totalCount} {isAr ? 'سجل' : 'items'}
            </span>
          }
          headerAction={
            <button
              type="button"
              onClick={() => setExpandedChart('status')}
              title={isAr ? 'تكبير الرسم البياني' : 'Expand chart'}
              aria-label={isAr ? 'تكبير الرسم البياني' : 'Expand chart'}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Maximize2 size={13} />
            </button>
          }
          defaultExpanded={true}
          isAr={isAr}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {donutData.legendItems.length > 0 && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.5rem 0.65rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                {donutData.legendItems.map((item) => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                      <span style={{ color: '#475569', fontWeight: 600 }}>{item.label}</span>
                    </div>
                    <span style={{ color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {item.percent}% <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.68rem' }}>({item.count})</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {donutData.total === 0 ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                color: '#64748b',
                fontSize: '0.75rem',
                textAlign: 'center'
              }}>
                <PieIcon size={20} style={{ color: '#94a3b8' }} />
                <span>{isAr ? 'لا توجد أوراق أو أقساط مسجلة حالياً' : 'No installments or PDCs recorded'}</span>
              </div>
            ) : (
              <div style={{ width: '100%', minHeight: '185px' }}>
                <ERPApexChart
                  type="donut"
                  height={185}
                  series={donutData.series}
                  options={{
                    chart: {
                      toolbar: { show: false }
                    },
                    labels: donutData.labels,
                    colors: donutData.colors,
                    legend: { show: false },
                    plotOptions: {
                      pie: {
                        donut: {
                          size: '70%',
                          labels: {
                            show: true,
                            total: {
                              show: true,
                              label: isAr ? 'الإجمالي' : 'Total',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#64748b',
                              formatter: () => `${donutData.total}`
                            },
                            value: {
                              fontSize: '16px',
                              fontWeight: 800,
                              color: '#0f172a',
                              fontFamily: 'inherit'
                            }
                          }
                        }
                      }
                    }
                  }}
                  isAr={isAr}
                />
              </div>
            )}
          </div>
        </ZFWidgetCard>

        {/* 3. Project Breakdown Bar Card */}
        <ZFWidgetCard
          id="zf-side-widget-projects-dist"
          title={isAr ? 'التحصيلات حسب المشروع' : 'Breakdown by Project'}
          icon={<Building2 size={15} />}
          badge={
            <span className="statusPill statusPillNeutral" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>
              {projectBreakdownData.projectCount} {isAr ? 'مشاريع' : 'projects'}
            </span>
          }
          headerAction={
            <button
              type="button"
              onClick={() => setExpandedChart('project')}
              title={isAr ? 'تكبير الرسم البياني' : 'Expand chart'}
              aria-label={isAr ? 'تكبير الرسم البياني' : 'Expand chart'}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Maximize2 size={13} />
            </button>
          }
          defaultExpanded={true}
          isAr={isAr}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.45rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--erp-accent, #2563eb)', display: 'inline-block' }} />
                <span style={{ color: '#475569', fontWeight: 600 }}>{isAr ? 'إجمالي الأقساط' : 'Total Dues'}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981', display: 'inline-block' }} />
                <span style={{ color: '#475569', fontWeight: 600 }}>{isAr ? 'المحصل' : 'Collected'}</span>
              </span>
            </div>

            {projectBreakdownData.projectCount === 0 ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                color: '#64748b',
                fontSize: '0.75rem',
                textAlign: 'center'
              }}>
                <Building2 size={20} style={{ color: '#94a3b8' }} />
                <span>{isAr ? 'لا توجد بيانات مشاريع مسجلة حالياً' : 'No project data recorded'}</span>
              </div>
            ) : (
              <div style={{ width: '100%', minHeight: `${projectChartHeight}px` }}>
                <ERPApexChart
                  type="bar"
                  height={projectChartHeight}
                  series={projectBreakdownData.series}
                  options={{
                    chart: {
                      toolbar: { show: false }
                    },
                    colors: ['var(--erp-accent, #2563eb)', '#10b981'],
                    plotOptions: {
                      bar: {
                        horizontal: true,
                        barHeight: '50%',
                        borderRadius: 3
                      }
                    },
                    xaxis: {
                      categories: projectBreakdownData.categories,
                      axisBorder: { show: true, color: '#cbd5e1' },
                      axisTicks: { show: true, color: '#cbd5e1' },
                      labels: {
                        style: { colors: '#64748b', fontSize: '10px' },
                        formatter: formatAxisNumber
                      }
                    },
                    yaxis: {
                      opposite: isAr,
                      axisBorder: { show: true, color: '#cbd5e1' },
                      labels: {
                        style: { colors: '#475569', fontSize: '10px', fontWeight: 500 },
                        maxWidth: 120,
                        formatter: (val: any) => {
                          if (!val && val !== 0) return '';
                          return formatProjectLabel(String(val), 16);
                        }
                      }
                    },
                    grid: {
                      borderColor: '#e2e8f0',
                      strokeDashArray: 2,
                      xaxis: { lines: { show: true } },
                      yaxis: { lines: { show: true } }
                    },
                    tooltip: {
                      custom: function({ series, dataPointIndex }: any) {
                        const projName = projectBreakdownData.fullCategories?.[dataPointIndex] || projectBreakdownData.categories[dataPointIndex] || '';
                        const dues = (series && series[0] && series[0][dataPointIndex] !== undefined)
                          ? series[0][dataPointIndex]
                          : (projectBreakdownData.series[0]?.data?.[dataPointIndex] ?? 0);
                        const collected = (series && series[1] && series[1][dataPointIndex] !== undefined)
                          ? series[1][dataPointIndex]
                          : (projectBreakdownData.series[1]?.data?.[dataPointIndex] ?? 0);

                        return `
                          <div style="
                            background: #ffffff;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            padding: 8px 12px;
                            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
                            direction: ${isAr ? 'rtl' : 'ltr'};
                            text-align: ${isAr ? 'right' : 'left'};
                            font-family: inherit;
                            min-width: 190px;
                          ">
                            <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                              ${projName}
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 5px;">
                              <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--erp-accent, #2563eb); display: inline-block;"></span>
                                <span style="font-size: 11px; color: #64748b; font-weight: 500;">${isAr ? 'إجمالي الأقساط' : 'Total Dues'}</span>
                              </div>
                              <span style="font-size: 12px; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums;">
                                ${(Number(dues) || 0).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}
                              </span>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 5px;">
                              <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #10b981; display: inline-block;"></span>
                                <span style="font-size: 11px; color: #64748b; font-weight: 500;">${isAr ? 'المحصل' : 'Collected'}</span>
                              </div>
                              <span style="font-size: 12px; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums;">
                                ${(Number(collected) || 0).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}
                              </span>
                            </div>
                          </div>
                        `;
                      }
                    }
                  }}
                  isAr={isAr}
                />
              </div>
            )}
          </div>
        </ZFWidgetCard>
        {renderExpandedModal()}
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '1.25rem',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box'
    }}>
      {/* 1. Dues vs Collections Area Chart */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--erp-accent-subtle, #eff6ff)',
              color: 'var(--erp-accent, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'التحصيلات المستحقة مقابل المحصلة' : 'Dues vs Collections Trend'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'مقارنة الاستحقاق التعاقدي بالتحصيل الفعلي بالتواريخ الحقيقية' : 'Truthful contract due date vs collection date'}
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ flex: 1, minHeight: '260px' }}>
          <ERPApexChart
            type="area"
            height={260}
            series={trendData.series}
            options={{
              colors: ['var(--erp-accent, #2563eb)', '#16a34a'],
              xaxis: {
                categories: trendData.categories,
                labels: {
                  style: { colors: '#64748b', fontSize: '11px' }
                }
              },
              yaxis: {
                opposite: isAr,
                labels: {
                  style: { colors: '#64748b', fontSize: '11px' },
                  formatter: formatAxisNumber
                }
              },
              stroke: {
                curve: 'smooth',
                width: [2.5, 2.5]
              }
            }}
            isAr={isAr}
          />
        </div>
      </div>

      {/* 2. Status Distribution Donut Chart */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--erp-accent-subtle, #eff6ff)',
              color: 'var(--erp-accent, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PieIcon size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'توزيع حالات الأقساط والأوراق' : 'Installment Status Distribution'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? `إجمالي السجلات: ${kpis.totalCount} قسط وسند` : `Total items: ${kpis.totalCount}`}
              </span>
            </div>
          </div>
        </div>

        {/* Chart or Honest Zero State */}
        {donutData.total === 0 ? (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '2.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: '#64748b',
            fontSize: '0.82rem',
            textAlign: 'center',
            flex: 1,
            minHeight: '260px'
          }}>
            <PieIcon size={24} style={{ color: '#94a3b8' }} />
            <span>{isAr ? 'لا توجد أوراق أو أقساط مسجلة حالياً' : 'No installments or PDCs recorded'}</span>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: '260px' }}>
            <ERPApexChart
              type="donut"
              height={260}
              series={donutData.series}
              options={{
                labels: donutData.labels,
                colors: ['#d97706', '#dc2626', '#64748b', '#2563eb', '#16a34a', '#991b1b']
              }}
              isAr={isAr}
            />
          </div>
        )}
      </div>

      {/* 3. Project Breakdown Bar Chart */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--erp-accent-subtle, #eff6ff)',
              color: 'var(--erp-accent, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'المستحقات والتحصيلات حسب المشروع' : 'Dues & Collections by Project'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'توزيع المحفظة مع تجنب التكرار بين الجداول والشيكات' : 'Deduplicated portfolio metrics by project'}
              </span>
            </div>
          </div>

          <span className="statusPill statusPillNeutral" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
            {projectBreakdownData.projectCount} {isAr ? 'مشاريع' : 'projects'}
          </span>
        </div>

        {/* Legend */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.45rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          fontSize: '0.74rem',
          marginBottom: '0.75rem'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--erp-accent, #2563eb)', display: 'inline-block' }} />
            <span style={{ color: '#475569', fontWeight: 600 }}>{isAr ? 'إجمالي الأقساط' : 'Total Dues'}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981', display: 'inline-block' }} />
            <span style={{ color: '#475569', fontWeight: 600 }}>{isAr ? 'المحصل' : 'Collected'}</span>
          </span>
        </div>

        {/* Chart or Honest Zero State */}
        {projectBreakdownData.projectCount === 0 ? (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '2.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: '#64748b',
            fontSize: '0.82rem',
            textAlign: 'center',
            flex: 1,
            minHeight: '260px'
          }}>
            <Building2 size={24} style={{ color: '#94a3b8' }} />
            <span>{isAr ? 'لا توجد بيانات مشاريع مسجلة حالياً' : 'No project data recorded'}</span>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: `${projectChartHeight}px` }}>
            <ERPApexChart
              type="bar"
              height={projectChartHeight}
              series={projectBreakdownData.series}
              options={{
                colors: ['var(--erp-accent, #2563eb)', '#10b981'],
                plotOptions: {
                  bar: {
                    horizontal: true,
                    barHeight: '50%',
                    borderRadius: 3
                  }
                },
                xaxis: {
                  categories: projectBreakdownData.categories,
                  axisBorder: { show: true, color: '#cbd5e1' },
                  axisTicks: { show: true, color: '#cbd5e1' },
                  labels: {
                    style: { colors: '#64748b', fontSize: '11px' },
                    formatter: formatAxisNumber
                  }
                },
                yaxis: {
                  opposite: isAr,
                  axisBorder: { show: true, color: '#cbd5e1' },
                  labels: {
                    style: { colors: '#475569', fontSize: '11px', fontWeight: 500 },
                    maxWidth: 160,
                    formatter: (val: any) => {
                      if (!val && val !== 0) return '';
                      return formatProjectLabel(String(val), 16);
                    }
                  }
                },
                grid: {
                  borderColor: '#e2e8f0',
                  strokeDashArray: 2,
                  xaxis: { lines: { show: true } },
                  yaxis: { lines: { show: true } }
                },
                tooltip: {
                  custom: function({ series, dataPointIndex }: any) {
                    const projName = projectBreakdownData.fullCategories?.[dataPointIndex] || projectBreakdownData.categories[dataPointIndex] || '';
                    const dues = (series && series[0] && series[0][dataPointIndex] !== undefined)
                      ? series[0][dataPointIndex]
                      : (projectBreakdownData.series[0]?.data?.[dataPointIndex] ?? 0);
                    const collected = (series && series[1] && series[1][dataPointIndex] !== undefined)
                      ? series[1][dataPointIndex]
                      : (projectBreakdownData.series[1]?.data?.[dataPointIndex] ?? 0);

                    return `
                      <div style="
                        background: #ffffff;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 8px 12px;
                        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
                        direction: ${isAr ? 'rtl' : 'ltr'};
                        text-align: ${isAr ? 'right' : 'left'};
                        font-family: inherit;
                        min-width: 190px;
                      ">
                        <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                          ${projName}
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 5px;">
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--erp-accent, #2563eb); display: inline-block;"></span>
                            <span style="font-size: 11px; color: #64748b; font-weight: 500;">${isAr ? 'إجمالي الأقساط' : 'Total Dues'}</span>
                          </div>
                          <span style="font-size: 12px; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums;">
                            ${(Number(dues) || 0).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 5px;">
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #10b981; display: inline-block;"></span>
                            <span style="font-size: 11px; color: #64748b; font-weight: 500;">${isAr ? 'المحصل' : 'Collected'}</span>
                          </div>
                          <span style="font-size: 12px; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums;">
                            ${(Number(collected) || 0).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                      </div>
                    `;
                  }
                }
              }}
              isAr={isAr}
            />
          </div>
        )}
      </div>
    </div>
  );
};
