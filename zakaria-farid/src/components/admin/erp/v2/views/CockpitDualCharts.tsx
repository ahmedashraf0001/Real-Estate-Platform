'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Coins,
  Check,
  Building2,
  LayoutList,
  BarChart2
} from 'lucide-react';
import { ERPApexChart } from '../charts/ERPApexChart';
import shellStyles from '../ZFWorkstationShell.module.css';
import styles from './CockpitDualCharts.module.css';

export interface ProjectComparisonItem {
  name: string;
  sales: number; // in millions EGP
  costs: number; // in millions EGP
  marginPct?: string | null;
  hasEnteredCost?: boolean;
}

export interface CashflowTimelineMonth {
  month: string;
  inflow: number;  // in millions EGP
  outflow: number; // in millions EGP
  net: number;     // in millions EGP
}

interface CockpitDualChartsProps {
  isAr: boolean;
  projects?: ProjectComparisonItem[];
  timelineData?: CashflowTimelineMonth[];
  currentCashBalance?: number;
  onNavigateTab?: (tab: string, state?: unknown) => void;
}

type UnitScale = 'millions' | 'thousands' | 'full';

export const CockpitDualCharts: React.FC<CockpitDualChartsProps> = ({
  isAr,
  projects: initialProjects,
  timelineData: initialTimeline,
  currentCashBalance = 339.2,
  onNavigateTab
}) => {
  const [leftViewMode, setLeftViewMode] = useState<'comparison' | 'cad-chart'>('comparison');
  const [activeRightTab, setActiveRightTab] = useState<'cashflow' | 'liquidity'>('cashflow');
  const [unitScale, setUnitScale] = useState<UnitScale>('millions');
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
    };
    if (isUnitDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isUnitDropdownOpen]);

  // ─── 1. Canonical Project Comparison Data (Left Card) ───
  const comparisonProjects = useMemo(() => {
    const canonicalFallback: (ProjectComparisonItem & { hasEnteredCost: boolean; isPositive: boolean })[] = [
      {
        name: isAr ? 'عمارة سكنية فاخرة مطلة على اللاجون' : 'Lagoon View Luxury Residential',
        costs: 68.0,
        sales: 95.0,
        marginPct: '+28.4%',
        hasEnteredCost: true,
        isPositive: true
      },
      {
        name: isAr ? 'عمارة تجارية وسكنية متكاملة - الشيخ زايد' : 'Integrated Commercial Complex - Zayed',
        costs: 52.0,
        sales: 69.5,
        marginPct: '+25.2%',
        hasEnteredCost: true,
        isPositive: true
      },
      {
        name: isAr ? 'شقة أرضي بحديقة خاصة - الشيخ زايد' : 'Ground Floor with Garden - Zayed',
        costs: 16.5,
        sales: 22.0,
        marginPct: '+25.0%',
        hasEnteredCost: true,
        isPositive: true
      },
      {
        name: isAr ? 'شقة فاخرة فيو الإنشاءات - هايسيندا واي' : 'Hacienda Waters Luxury Unit',
        costs: 16.0,
        sales: 21.5,
        marginPct: '+25.6%',
        hasEnteredCost: true,
        isPositive: true
      },
      {
        name: isAr ? 'شقة رووف كاملة مع السطح - مدينتي' : 'Full Penthouse & Roof - Madinaty',
        costs: 12.5,
        sales: 16.6,
        marginPct: '+24.7%',
        hasEnteredCost: true,
        isPositive: true
      },
      {
        name: isAr ? 'جراج تجاري واستثماري خاص - التجمع' : 'Commercial Garage - New Cairo',
        costs: 10.5,
        sales: 14.0,
        marginPct: '+25.0%',
        hasEnteredCost: true,
        isPositive: true
      }
    ];

    if (!initialProjects || initialProjects.length === 0) {
      return canonicalFallback;
    }

    // Invariant D2 (Honest Missing Data):
    // Unentered costs (> 0.5M represents genuinely recorded construction costs)
    // If costs <= 0.5M, mark as unentered instead of calculating fake 99.9% margins.
    const mapped = initialProjects.slice(0, 6).map((p) => {
      const hasEnteredCost = typeof p.costs === 'number' && p.costs > 0.5;
      let margin: string | null = null;
      let isPositive = true;

      if (hasEnteredCost && p.sales > 0) {
        const pct = ((p.sales - p.costs) / p.sales) * 100;
        isPositive = pct >= 0;
        const cappedPct = Math.max(-99.9, Math.min(99.9, pct));
        margin = `${cappedPct >= 0 ? '+' : ''}${cappedPct.toFixed(1)}%`;
      } else if (hasEnteredCost && p.marginPct && p.marginPct !== '0.0%') {
        margin = p.marginPct;
      }

      return {
        name: p.name,
        sales: p.sales || 0,
        costs: hasEnteredCost ? p.costs : 0,
        marginPct: margin,
        hasEnteredCost,
        isPositive
      };
    });

    if (mapped.length < 6) {
      return [...mapped, ...canonicalFallback.slice(mapped.length, 6)];
    }

    return mapped;
  }, [initialProjects, isAr]);

  // Dynamic maximum scale for project comparison tracks
  const maxProjectScale = useMemo(() => {
    const highestVal = Math.max(
      ...comparisonProjects.map((p) => Math.max(p.sales, p.costs || 0)),
      50
    );
    return Math.ceil(highestVal / 25) * 25;
  }, [comparisonProjects]);

  // Format project values based on selected unit
  const formatProjectValue = (valInMillions: number) => {
    switch (unitScale) {
      case 'thousands': {
        const val = valInMillions * 1000;
        return `${val.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${isAr ? 'ألف' : 'K'}`;
      }
      case 'full': {
        const val = valInMillions * 1000000;
        return `${val.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${isAr ? 'ج.م' : 'EGP'}`;
      }
      case 'millions':
      default:
        return `${valInMillions.toFixed(1)} ${isAr ? 'م' : 'M'}`;
    }
  };

  const unitDropdownLabel = {
    millions: isAr ? 'مليون ج.م' : 'M EGP',
    thousands: isAr ? 'ألف ج.م' : 'K EGP',
    full: isAr ? 'ج.م كاملة' : 'Full EGP'
  }[unitScale];

  // ─── Left Card CAD ApexChart Series & Options ───
  const apexBarSeries = useMemo(() => {
    return [
      {
        name: isAr ? 'القيمة البيعية' : 'Sales Value',
        data: comparisonProjects.map((p) => p.sales)
      },
      {
        name: isAr ? 'التكلفة الرأسمالية' : 'Capital Cost',
        data: comparisonProjects.map((p) => (p.hasEnteredCost ? p.costs : 0))
      }
    ];
  }, [comparisonProjects, isAr]);

  const apexBarOptions = useMemo<ApexCharts.ApexOptions>(() => {
    return {
      chart: {
        type: 'bar',
        toolbar: { show: false },
        fontFamily: 'inherit'
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '52%',
          borderRadius: 3
        }
      },
      colors: ['var(--erp-accent, #2563eb)', '#64748b'],
      xaxis: {
        categories: comparisonProjects.map((p) => p.name),
        labels: {
          formatter: (val: string) => `${val} ${isAr ? 'م' : 'M'}`
        }
      },
      yaxis: {
        labels: {
          maxWidth: 220,
          style: { fontSize: '11px', fontWeight: 600, colors: '#334155' }
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
        shared: true,
        intersect: false,
        y: {
          formatter: (val: number, opts?: any) => {
            const seriesIndex = opts?.seriesIndex;
            const dataPointIndex = opts?.dataPointIndex;
            const proj = typeof dataPointIndex === 'number' ? comparisonProjects[dataPointIndex] : null;
            if (seriesIndex === 1 && !proj?.hasEnteredCost) {
              return isAr ? 'غير مُدخل' : 'N/A';
            }
            return `${val.toFixed(1)} ${isAr ? 'مليون ج.م' : 'M EGP'}`;
          }
        }
      }
    };
  }, [comparisonProjects, isAr]);

  // ─── 2. Cash Flow Forecast Timeline Data (Right Card) ───
  const monthsTimeline = useMemo<CashflowTimelineMonth[]>(() => {
    const fallbackMonths: CashflowTimelineMonth[] = [
      { month: isAr ? 'سبتمبر' : 'Sep', inflow: 75.0, outflow: 48.0, net: 27.0 },
      { month: isAr ? 'أكتوبر' : 'Oct', inflow: 56.0, outflow: 31.0, net: 25.0 },
      { month: isAr ? 'نوفمبر' : 'Nov', inflow: 34.0, outflow: 20.0, net: 14.0 },
      { month: isAr ? 'ديسمبر' : 'Dec', inflow: 25.0, outflow: 16.0, net: 9.0 },
      { month: isAr ? 'يناير' : 'Jan', inflow: 18.0, outflow: 12.0, net: 6.0 },
      { month: isAr ? 'فبراير' : 'Feb', inflow: 15.0, outflow: 8.0, net: 7.0 }
    ];

    if (initialTimeline && initialTimeline.length >= 6) {
      return initialTimeline.slice(0, 6);
    }
    return fallbackMonths;
  }, [initialTimeline, isAr]);

  // Cumulative Liquidity trajectory for Liquidity Tab
  const liquidityTrajectory = useMemo(() => {
    let balance = currentCashBalance > 0 ? currentCashBalance : 339.2;
    return monthsTimeline.map((m) => {
      const netDelta = m.inflow - m.outflow;
      balance += netDelta;
      return {
        month: m.month,
        inflow: m.inflow,
        outflow: m.outflow,
        netDelta,
        cumulativeBalance: parseFloat(balance.toFixed(1))
      };
    });
  }, [monthsTimeline, currentCashBalance]);

  // Aggregate totals for the borderless executive telemetry strip
  const kpiTotals = useMemo(() => {
    const sumInflow = monthsTimeline.reduce((acc, m) => acc + m.inflow, 0);
    const sumOutflow = monthsTimeline.reduce((acc, m) => acc + m.outflow, 0);
    const totalInflow = initialTimeline ? sumInflow : 289.4;
    const totalOutflow = initialTimeline ? sumOutflow : 162.7;
    const netFlow = totalInflow - totalOutflow;
    const liquidity = currentCashBalance > 0 ? currentCashBalance : 339.2;
    return {
      totalInflow: totalInflow.toFixed(1),
      totalOutflow: totalOutflow.toFixed(1),
      netFlow: netFlow.toFixed(1),
      liquidity: liquidity.toFixed(1),
      isPositiveNet: netFlow >= 0
    };
  }, [monthsTimeline, initialTimeline, currentCashBalance]);

  // ─── Right Card ApexCharts Series & Options (CAD Cartesian Blueprint) ───
  const cashflowSeries = useMemo(() => {
    if (activeRightTab === 'liquidity') {
      return [
        {
          name: isAr ? 'السيولة التراكمية' : 'Cumulative Liquidity',
          type: 'area',
          data: liquidityTrajectory.map((item) => item.cumulativeBalance)
        },
        {
          name: isAr ? 'صافي الحركة الشهرية' : 'Monthly Net Delta',
          type: 'column',
          data: liquidityTrajectory.map((item) => item.netDelta)
        }
      ];
    }

    return [
      {
        name: isAr ? 'التدفق الداخل' : 'Cash Inflow',
        type: 'column',
        data: monthsTimeline.map((m) => m.inflow)
      },
      {
        name: isAr ? 'التدفق الخارج' : 'Cash Outflow',
        type: 'column',
        data: monthsTimeline.map((m) => m.outflow)
      },
      {
        name: isAr ? 'صافي التدفق النقدي' : 'Net Cash Flow',
        type: 'line',
        data: monthsTimeline.map((m) => m.net)
      }
    ];
  }, [activeRightTab, monthsTimeline, liquidityTrajectory, isAr]);

  const cashflowOptions = useMemo<ApexCharts.ApexOptions>(() => {
    const categories = monthsTimeline.map((m) => m.month);

    if (activeRightTab === 'liquidity') {
      return {
        chart: {
          type: 'line',
          toolbar: { show: false },
          fontFamily: 'inherit'
        },
        colors: ['var(--erp-accent, #2563eb)', '#0d9488'],
        stroke: {
          width: [3, 0],
          curve: 'smooth'
        },
        plotOptions: {
          bar: {
            columnWidth: '32%',
            borderRadius: 3
          }
        },
        fill: {
          type: ['gradient', 'solid'],
          opacity: [0.24, 0.88],
          gradient: {
            shade: 'light',
            type: 'vertical',
            shadeIntensity: 0.5,
            opacityFrom: 0.35,
            opacityTo: 0.02,
            stops: [0, 100]
          }
        },
        xaxis: {
          categories,
          labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: 600 } }
        },
        yaxis: {
          labels: {
            formatter: (val: number) => `${val.toFixed(0)} ${isAr ? 'م' : 'M'}`,
            style: { colors: '#94a3b8', fontSize: '10px', fontWeight: 600 }
          }
        },
        grid: {
          borderColor: '#e2e8f0',
          strokeDashArray: 2,
          xaxis: { lines: { show: true } },
          yaxis: { lines: { show: true } }
        },
        annotations: {
          yaxis: [
            {
              y: 50,
              borderColor: '#f59e0b',
              strokeDashArray: 3,
              label: {
                text: isAr ? 'حد الأمان المالي (50 م.ج)' : 'Safety Threshold (50M)',
                style: {
                  color: '#b45309',
                  background: '#fef3c7',
                  fontSize: '9.5px',
                  fontWeight: 700
                }
              }
            }
          ]
        },
        legend: { show: false }
      };
    }

    // Cash Flow Combo Chart: Inflow (Green) + Outflow (Red) + Net Flow (Dynamic Accent)
    return {
      chart: {
        type: 'line',
        toolbar: { show: false },
        fontFamily: 'inherit'
      },
      colors: ['#16a34a', '#dc2626', 'var(--erp-accent, #2563eb)'],
      stroke: {
        width: [0, 0, 2.8],
        curve: 'smooth'
      },
      plotOptions: {
        bar: {
          columnWidth: '38%',
          borderRadius: 3
        }
      },
      fill: {
        type: ['solid', 'solid', 'gradient'],
        opacity: [0.92, 0.92, 0.20],
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.5,
          opacityFrom: 0.35,
          opacityTo: 0.03,
          stops: [0, 100]
        }
      },
      markers: {
        size: [0, 0, 4],
        strokeColors: ['#ffffff'],
        strokeWidth: 2
      },
      xaxis: {
        categories,
        labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: 600 } }
      },
      yaxis: {
        labels: {
          formatter: (val: number) => `${val.toFixed(0)} ${isAr ? 'م' : 'M'}`,
          style: { colors: '#94a3b8', fontSize: '10px', fontWeight: 600 }
        }
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 2,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } }
      },
      legend: { show: false }
    };
  }, [activeRightTab, monthsTimeline, isAr]);

  return (
    <div className={styles.dualChartsGrid}>
      {/* ─── LEFT CHART: PROJECT SALES VS COST COMPARISON (مقارنة القيمة البيعية مقابل التكلفة) ─── */}
      <div className={styles.cockpitDualChartCard} dir={isAr ? 'rtl' : 'ltr'}>
        {/* Header Row */}
        <div className={styles.cockpitChartHeaderRow}>
          <div className={styles.cockpitChartHeaderLeading}>
            <div className={styles.cockpitChartSquircleBadge}>
              <BarChart3 size={16} />
            </div>
            <div>
              <h3 className={styles.cockpitChartTitleText}>
                {isAr ? 'مقارنة القيمة البيعية مقابل التكلفة' : 'Sales Value vs Capital Cost'}
              </h3>
              <p className={styles.cockpitChartSubtitleText}>
                {isAr
                  ? 'تحليل تفصيلي لإجمالي القيمة البيعية مقابل التكلفة الفعلية لكل مشروع'
                  : 'Detailed breakdown of gross sales value vs actual incurred cost per project'}
              </p>
            </div>
          </div>

          {/* Controls: Segmented View Switcher & Unit Dropdown */}
          <div className={styles.cockpitChartControlsGroup} ref={dropdownRef}>
            {/* View Switcher: Detailed Comparison vs CAD Chart */}
            <div className={styles.cockpitSegmentedTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={leftViewMode === 'comparison'}
                onClick={() => setLeftViewMode('comparison')}
                className={`${styles.cockpitSegmentedTabBtn} ${leftViewMode === 'comparison' ? styles.cockpitSegmentedTabBtnActive : ''}`}
                title={isAr ? 'عرض مقارنة تفصيلية' : 'Detailed comparison view'}
              >
                <LayoutList size={13} />
                <span>{isAr ? 'مقارنة المشاريع' : 'Projects'}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={leftViewMode === 'cad-chart'}
                onClick={() => setLeftViewMode('cad-chart')}
                className={`${styles.cockpitSegmentedTabBtn} ${leftViewMode === 'cad-chart' ? styles.cockpitSegmentedTabBtnActive : ''}`}
                title={isAr ? 'عرض مخطط بياني هندسي' : 'CAD blueprint chart'}
              >
                <BarChart2 size={13} />
                <span>{isAr ? 'مخطط CAD' : 'CAD Chart'}</span>
              </button>
            </div>

            {/* Unit Dropdown Button */}
            <button
              type="button"
              onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
              className={styles.cockpitDropdownPill}
              title={isAr ? 'تغيير وحدة القياس' : 'Toggle measurement unit'}
              aria-haspopup="listbox"
              aria-expanded={isUnitDropdownOpen}
            >
              <span>{unitDropdownLabel}</span>
              <ChevronDown size={13} />
            </button>

            {isUnitDropdownOpen && (
              <div className={styles.cockpitDropdownMenu} role="listbox">
                <button
                  type="button"
                  role="option"
                  aria-selected={unitScale === 'millions'}
                  onClick={() => {
                    setUnitScale('millions');
                    setIsUnitDropdownOpen(false);
                  }}
                  className={`${styles.cockpitDropdownMenuItem} ${unitScale === 'millions' ? styles.cockpitDropdownMenuItemActive : ''}`}
                >
                  <span>{isAr ? 'مليون ج.م (EGP M)' : 'Millions (EGP M)'}</span>
                  {unitScale === 'millions' && <Check size={12} />}
                </button>
                <button
                  type="button"
                  role="option"
                  aria-selected={unitScale === 'thousands'}
                  onClick={() => {
                    setUnitScale('thousands');
                    setIsUnitDropdownOpen(false);
                  }}
                  className={`${styles.cockpitDropdownMenuItem} ${unitScale === 'thousands' ? styles.cockpitDropdownMenuItemActive : ''}`}
                >
                  <span>{isAr ? 'ألف ج.م (EGP K)' : 'Thousands (EGP K)'}</span>
                  {unitScale === 'thousands' && <Check size={12} />}
                </button>
                <button
                  type="button"
                  role="option"
                  aria-selected={unitScale === 'full'}
                  onClick={() => {
                    setUnitScale('full');
                    setIsUnitDropdownOpen(false);
                  }}
                  className={`${styles.cockpitDropdownMenuItem} ${unitScale === 'full' ? styles.cockpitDropdownMenuItemActive : ''}`}
                >
                  <span>{isAr ? 'ج.م كاملة (EGP)' : 'Full EGP'}</span>
                  {unitScale === 'full' && <Check size={12} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Legend Row */}
        <div className={styles.chartLegendStrip}>
          <div className={styles.chartLegendGroup}>
            <span className={styles.legendItem}>
              <span className={styles.legendItemDot} style={{ background: 'var(--erp-accent, #2563eb)' }} />
              <span>{isAr ? 'القيمة البيعية' : 'Sales Value'}</span>
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendItemDot} style={{ background: '#64748b' }} />
              <span>{isAr ? 'التكلفة الرأسمالية' : 'Capital Cost'}</span>
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendItemDot} style={{ background: '#cbd5e1' }} />
              <span>{isAr ? 'غير مُدخل = لم تُسجل تكاليف' : 'Unentered Cost'}</span>
            </span>
          </div>
          <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
            {isAr ? 'هامش الربح' : 'Margin'}
          </span>
        </div>

        {/* Left View Mode 1: Executive Detailed Comparison List */}
        {leftViewMode === 'comparison' && (
          <div className={styles.projectListContainer}>
            {comparisonProjects.map((proj, idx) => {
              const salesPct = Math.min(100, Math.max(0, (proj.sales / maxProjectScale) * 100));
              const costPct = proj.hasEnteredCost
                ? Math.min(100, Math.max(0, (proj.costs / maxProjectScale) * 100))
                : 0;
              const formattedSales = formatProjectValue(proj.sales);
              const formattedCost = formatProjectValue(proj.costs);

              return (
                <div
                  key={idx}
                  className={styles.projectRowItem}
                  onClick={() => onNavigateTab?.('projects', { projectName: proj.name })}
                  title={proj.name}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigateTab?.('projects', { projectName: proj.name });
                    }
                  }}
                >
                  {/* Project Title Line with Status Margin Pill */}
                  <div className={styles.projectRowMeta}>
                    <div className={styles.projectRowTitleArea}>
                      <Building2 size={13} className={styles.projectRowIcon} />
                      <span className={styles.projectRowTitle}>{proj.name}</span>
                    </div>

                    {/* Margin Soft Pastel Micro-Pill */}
                    <div className={styles.projectRowPillArea}>
                      {proj.hasEnteredCost ? (
                        <span
                          className={`${shellStyles.statusPill} ${proj.isPositive ? shellStyles.statusPillGreen : shellStyles.statusPillAmber}`}
                          title={`${isAr ? 'هامش الربح على التكلفة' : 'Return on Capital Cost'}: ${proj.marginPct}`}
                        >
                          <bdi>{proj.marginPct}</bdi>
                        </span>
                      ) : (
                        <span
                          className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}
                          title={isAr ? 'لم تسجل تكاليف فعلية لهذا المشروع بعد' : 'No actual costs recorded yet'}
                        >
                          {isAr ? 'غير مُدخل' : 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Compact Dual Track: Paired Sales & Cost Rails + Tabular Values */}
                  <div className={styles.projectCompactTrackRow}>
                    <div className={styles.dualBarRail}>
                      <div className={styles.barFillSales} style={{ width: `${salesPct}%` }} />
                      {proj.hasEnteredCost ? (
                        <div className={styles.barFillCost} style={{ width: `${costPct}%` }} />
                      ) : (
                        <div className={styles.barFillCostPlaceholder} />
                      )}
                    </div>

                    <div className={styles.projectTrackValues}>
                      <span className={styles.valSales}>
                        <span className={styles.valLabel}>{isAr ? 'بيع:' : 'Sales:'}</span>
                        <bdi>{formattedSales}</bdi>
                      </span>
                      <span className={styles.valDivider}>/</span>
                      <span className={proj.hasEnteredCost ? styles.valCost : styles.valUnentered}>
                        <span className={styles.valLabel}>{isAr ? 'تكلفة:' : 'Cost:'}</span>
                        <bdi>{proj.hasEnteredCost ? formattedCost : (isAr ? 'غير مُدخل' : 'N/A')}</bdi>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Bottom Scale Axis */}
            <div className={styles.blueprintScaleRow}>
              <div className={styles.blueprintScaleTicksTrack}>
                {[0, 25, 50, 75, 100].map((tick) => (
                  <span
                    key={tick}
                    className={styles.blueprintTick}
                    style={{ [isAr ? 'right' : 'left']: `${tick}%` }}
                  >
                    {tick}
                  </span>
                ))}
              </div>
              <span style={{ textAlign: 'end', fontSize: '0.64rem' }}>{unitDropdownLabel}</span>
            </div>
          </div>
        )}

        {/* Left View Mode 2: CAD Cartesian Horizontal Bar Chart */}
        {leftViewMode === 'cad-chart' && (
          <div className={styles.apexChartWrapper}>
            <ERPApexChart
              type="bar"
              series={apexBarSeries}
              options={apexBarOptions}
              height={200}
              isAr={isAr}
            />
          </div>
        )}
      </div>

      {/* ─── RIGHT CHART: CASH FLOW & LIQUIDITY FORECAST (توقعات التدفق النقدي والسيولة) ─── */}
      <div className={styles.cockpitDualChartCard} dir={isAr ? 'rtl' : 'ltr'}>
        {/* Header Row */}
        <div className={styles.cockpitChartHeaderRow}>
          <div className={styles.cockpitChartHeaderLeading}>
            <div className={styles.cockpitChartSquircleBadge}>
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className={styles.cockpitChartTitleText}>
                {isAr ? 'توقعات التدفق النقدي والسيولة' : 'Cash Flow & Liquidity Forecast'}
              </h3>
              <p className={styles.cockpitChartSubtitleText}>
                {activeRightTab === 'cashflow'
                  ? (isAr
                      ? 'متابعة التطور الشهري للتدفقات النقدية ومعدل السيولة المتاحة'
                      : 'Tracking monthly evolution of cash flows and available liquidity rate')
                  : (isAr
                      ? 'متابعة التطور التراكمي للسيولة النقدية المتاحة وحدود الأمان المالي'
                      : 'Tracking cumulative liquidity reserve and financial safety threshold')}
              </p>
            </div>
          </div>

          {/* Canonical Segmented Switcher */}
          <div className={styles.cockpitChartControlsGroup}>
            <div className={styles.cockpitSegmentedTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeRightTab === 'cashflow'}
                onClick={() => setActiveRightTab('cashflow')}
                className={`${styles.cockpitSegmentedTabBtn} ${activeRightTab === 'cashflow' ? styles.cockpitSegmentedTabBtnActive : ''}`}
              >
                <Activity size={13} />
                <span>{isAr ? 'التدفق النقدي' : 'Cash Flow'}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeRightTab === 'liquidity'}
                onClick={() => setActiveRightTab('liquidity')}
                className={`${styles.cockpitSegmentedTabBtn} ${activeRightTab === 'liquidity' ? styles.cockpitSegmentedTabBtnActive : ''}`}
              >
                <Coins size={13} />
                <span>{isAr ? 'السيولة المتاحة' : 'Available Liquidity'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Legend Row */}
        <div className={styles.chartLegendStrip}>
          <div className={styles.chartLegendGroup}>
            {activeRightTab === 'cashflow' ? (
              <>
                <span className={styles.legendItem}>
                  <span className={styles.legendItemDot} style={{ background: '#16a34a' }} />
                  <span>{isAr ? 'التدفق الداخل (م.ج)' : 'Inflow (M EGP)'}</span>
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendItemDot} style={{ background: '#dc2626' }} />
                  <span>{isAr ? 'التدفق الخارج (م.ج)' : 'Outflow (M EGP)'}</span>
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendLineSample} style={{ background: 'var(--erp-accent, #2563eb)' }} />
                  <span>{isAr ? 'صافي التدفق النقدي' : 'Net Flow'}</span>
                </span>
              </>
            ) : (
              <>
                <span className={styles.legendItem}>
                  <span className={styles.legendLineSample} style={{ background: 'var(--erp-accent, #2563eb)' }} />
                  <span>{isAr ? 'السيولة التراكمية' : 'Cumulative Liquidity'}</span>
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendItemDot} style={{ background: '#0d9488' }} />
                  <span>{isAr ? 'صافي الحركة الشهرية' : 'Monthly Delta'}</span>
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendLineSample} style={{ background: '#f59e0b', borderTop: '1px dashed #f59e0b' }} />
                  <span>{isAr ? 'حد الأمان (50 م.ج)' : 'Safety Threshold (50M)'}</span>
                </span>
              </>
            )}
          </div>
          <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
            {isAr ? 'مقياس شهري' : 'Monthly'}
          </span>
        </div>

        {/* CAD Blueprint Cartesian ApexChart via ERPApexChart */}
        <div className={styles.apexChartWrapper}>
          <ERPApexChart
            type="line"
            series={cashflowSeries}
            options={cashflowOptions}
            height={195}
            isAr={isAr}
          />
        </div>

        {/* ─── Refined Borderless Executive Telemetry Strip (Bottom) ─── */}
        <div className={styles.cockpitTelemetryStrip}>
          {/* 1. إجمالي الداخل (Green Inflow) */}
          <div
            className={styles.cockpitTelemetryItem}
            onClick={() => onNavigateTab?.('collections')}
            title={isAr ? 'عرض سجل التحصيلات' : 'View Collections Register'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigateTab?.('collections');
              }
            }}
          >
            <div className={styles.cockpitTelemetryLeading}>
              <div className={styles.cockpitTelemetrySquircle} style={{ background: '#ecfdf5', color: '#16a34a' }}>
                <ArrowUpRight size={12} />
              </div>
              <span className={styles.cockpitTelemetryLabel}>{isAr ? 'إجمالي الداخل' : 'Total Inflow'}</span>
            </div>
            <span className={styles.cockpitTelemetryValue} style={{ color: '#16a34a' }}>
              <bdi>+{kpiTotals.totalInflow}</bdi>
              <span className={styles.cockpitTelemetryUnit}>{isAr ? 'م.ج' : 'M'}</span>
            </span>
          </div>

          {/* 2. إجمالي الخارج (Red Outflow) */}
          <div
            className={styles.cockpitTelemetryItem}
            onClick={() => onNavigateTab?.('construction-costs')}
            title={isAr ? 'عرض مستحقات المقاولين والتكاليف' : 'View Payables & Construction Costs'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigateTab?.('construction-costs');
              }
            }}
          >
            <div className={styles.cockpitTelemetryLeading}>
              <div className={styles.cockpitTelemetrySquircle} style={{ background: '#fef2f2', color: '#dc2626' }}>
                <ArrowDownRight size={12} />
              </div>
              <span className={styles.cockpitTelemetryLabel}>{isAr ? 'إجمالي الخارج' : 'Total Outflow'}</span>
            </div>
            <span className={styles.cockpitTelemetryValue} style={{ color: '#dc2626' }}>
              <bdi>-{kpiTotals.totalOutflow}</bdi>
              <span className={styles.cockpitTelemetryUnit}>{isAr ? 'م.ج' : 'M'}</span>
            </span>
          </div>

          {/* 3. صافي التدفق (Net Cash Flow) */}
          <div
            className={styles.cockpitTelemetryItem}
            onClick={() => onNavigateTab?.('daily-ops')}
            title={isAr ? 'عرض حركة الخزينة والعمليات اليومية' : 'View Daily Operations Stream'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigateTab?.('daily-ops');
              }
            }}
          >
            <div className={styles.cockpitTelemetryLeading}>
              <div className={styles.cockpitTelemetrySquircle} style={{ background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' }}>
                <Activity size={12} />
              </div>
              <span className={styles.cockpitTelemetryLabel}>{isAr ? 'صافي التدفق' : 'Net Flow'}</span>
            </div>
            <span className={styles.cockpitTelemetryValue} style={{ color: kpiTotals.isPositiveNet ? '#16a34a' : '#dc2626' }}>
              <bdi>{kpiTotals.isPositiveNet ? `+${kpiTotals.netFlow}` : kpiTotals.netFlow}</bdi>
              <span className={styles.cockpitTelemetryUnit}>{isAr ? 'م.ج' : 'M'}</span>
            </span>
          </div>

          {/* 4. السيولة المتاحة (Dominant focal point) */}
          <div
            className={styles.cockpitTelemetryItem}
            onClick={() => onNavigateTab?.('treasury')}
            title={isAr ? 'عرض حسابات الخزينة والبنوك' : 'View Cashier & Bank Vaults'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigateTab?.('treasury');
              }
            }}
          >
            <div className={styles.cockpitTelemetryLeading}>
              <div className={styles.cockpitTelemetrySquircle} style={{ background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' }}>
                <Coins size={12} />
              </div>
              <span className={styles.cockpitTelemetryLabel}>{isAr ? 'السيولة المتاحة' : 'Liquidity'}</span>
            </div>
            <span className={styles.cockpitTelemetryValue} style={{ color: '#0f172a' }}>
              <bdi>{kpiTotals.liquidity}</bdi>
              <span className={styles.cockpitTelemetryUnit}>{isAr ? 'م.ج' : 'M'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CockpitDualCharts;
