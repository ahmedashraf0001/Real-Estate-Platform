'use client';

import React, { useState, useMemo } from 'react';
import { 
  PieChart as PieChartIcon, 
  BarChart3, 
  Layers, 
  Home, 
  Building2, 
  ShoppingBag, 
  Briefcase, 
  TrendingUp, 
  Coins, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { ERPContract } from '@/lib/erp/types';
import { 
  FlatInventoryUnit, 
  calculateAnalyticsBreakdown, 
  AnalyticsBreakdown 
} from '@/lib/erp/propertiesPortfolioCalculations';
import { ERPApexChart } from '../../charts/ERPApexChart';
import shellStyles from '../../ZFWorkstationShell.module.css';

export interface PropertiesAnalyticsViewProps {
  units: FlatInventoryUnit[];
  properties: Property[];
  contracts?: ERPContract[];
  isAr?: boolean;
}

export const PropertiesAnalyticsView: React.FC<PropertiesAnalyticsViewProps> = ({
  units,
  properties,
  contracts = [],
  isAr = true,
}) => {
  const [priceMetricMode, setPriceMetricMode] = useState<'perSqm' | 'perUnit'>('perSqm');

  const analytics = useMemo<AnalyticsBreakdown>(() => {
    return calculateAnalyticsBreakdown(units, properties, isAr);
  }, [units, properties, isAr]);

  const {
    statusBreakdown,
    projectStacks,
    unitTypesDistribution,
    areaHistogram,
    averagePricePerType,
  } = analytics;

  // 1. Status Donut Series & Options
  const statusSeries = [
    statusBreakdown.contracted,
    statusBreakdown.available,
    statusBreakdown.reserved,
  ];
  const statusLabels = [
    isAr ? 'مباعة' : 'Sold',
    isAr ? 'معروضة ومتاحة' : 'Available',
    isAr ? 'قيد التعاقد والحجز' : 'Reserved',
  ];
  const statusColors = ['#10b981', '#2563eb', '#f59e0b'];

  // 2. Units by Project Stacked Bar Series
  const topProjects = projectStacks.slice(0, 8);
  const projectNames = topProjects.map(p => {
    const raw = p.projectTitle || '';
    if (raw.includes('الجونة')) return isAr ? 'عمارة الجونة (اللاجون)' : 'El Gouna Lagoon';
    if (raw.includes('زايد')) return isAr ? 'عمارة الشيخ زايد' : 'Sheikh Zayed Block';
    if (raw.includes('النرجس')) return isAr ? 'عمارة النرجس (التجمع)' : 'Al-Narges New Cairo';
    if (raw.includes('هاسيندا')) return isAr ? 'شقة هاسيندا ووترز' : 'Hacienda Waters';
    if (raw.includes('السخنة') || raw.includes('Galala')) return isAr ? 'شقة الجلالة السخنة' : 'Monte Galala';
    if (raw.includes('التجمع') || raw.includes('جراج')) return isAr ? 'جراج التجمع الخامس' : 'New Cairo Commercial';
    return raw.length > 25 ? `${raw.slice(0, 24)}...` : raw;
  });

  const stackedSeries = [
    {
      name: isAr ? 'مباعة' : 'Sold',
      data: topProjects.map(p => p.contracted),
      color: '#10b981',
    },
    {
      name: isAr ? 'معروضة ومتاحة' : 'Available',
      data: topProjects.map(p => p.available),
      color: '#2563eb',
    },
    {
      name: isAr ? 'قيد التعاقد والحجز' : 'Reserved',
      data: topProjects.map(p => p.reserved),
      color: '#f59e0b',
    },
  ];

  // 4. Area Histogram Series
  const areaLabels = areaHistogram.map(a => a.label);
  const areaCounts = areaHistogram.map(a => a.count);

  const formatEgp = (val: number): string => {
    return `${Math.round(val).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', width: '100%' }}>
      
      {/* ─── ROW 1: STATUS DONUT (LEFT/RIGHT) & UNITS BY PROJECT STACKED BARS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.45fr)', gap: '1.15rem' }}>
        
        {/* CHART 1: UNIT STATUS BREAKDOWN DONUT */}
        <div style={{
          background: '#ffffff !important',
          border: '1px solid var(--erp-border, #cbd5e1)',
          borderRadius: '12px',
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--erp-accent, #2563eb)',
              }}>
                <PieChartIcon size={15} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'توزيع الوحدات حسب الحالة' : 'Units Breakdown by Status'}
                </h4>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {isAr ? 'نسب المباع والمعروض وقيد التعاقد' : 'Sold, Available, & Reserved percentages'}
                </span>
              </div>
            </div>

            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`} style={{ fontSize: '0.7rem' }}>
              {statusBreakdown.total} {isAr ? 'وحدة إجمالية' : 'total units'}
            </span>
          </div>

          {/* Donut Chart with Zero-Overlap Typography */}
          <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {statusBreakdown.total > 0 ? (
              <ERPApexChart
                type="donut"
                height={220}
                series={statusSeries}
                options={{
                  chart: { sparkline: { enabled: false } },
                  labels: statusLabels,
                  colors: statusColors,
                  plotOptions: {
                    pie: {
                      customScale: 0.98,
                      donut: {
                        size: '76%',
                        labels: {
                          show: true,
                          total: {
                            show: true,
                            label: isAr ? 'إجمالي الوحدات' : 'Total Units',
                            color: '#64748b',
                            fontSize: '11px',
                            fontWeight: 600,
                            formatter: () => `${statusBreakdown.total}`,
                          },
                          value: {
                            fontSize: '22px',
                            fontWeight: 800,
                            color: '#0f172a',
                            offsetY: 4,
                            formatter: (val) => `${val}`,
                          },
                        },
                      },
                    },
                  },
                  dataLabels: { enabled: false },
                  legend: { show: false },
                  stroke: { width: 2, colors: ['#ffffff'] },
                  tooltip: {
                    y: {
                      formatter: (val) => `${val} ${isAr ? 'وحدة' : 'units'}`,
                    },
                  },
                }}
                isAr={isAr}
              />
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{isAr ? 'لا توجد وحدات' : 'No units'}</div>
            )}
          </div>

          {/* Side / Bottom Detailed Legend (Matching Reference Mockup) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
            {/* Sold */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>{isAr ? 'مباعة' : 'Sold'}</span>
              </div>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {statusBreakdown.contracted} <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>({statusBreakdown.contractedPct}%)</span>
              </strong>
            </div>

            {/* Available */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
                <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>{isAr ? 'معروضة' : 'Available'}</span>
              </div>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {statusBreakdown.available} <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>({statusBreakdown.availablePct}%)</span>
              </strong>
            </div>

            {/* Reserved */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>{isAr ? 'قيد التعاقد' : 'Reserved'}</span>
              </div>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {statusBreakdown.reserved} <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>({statusBreakdown.reservedPct}%)</span>
              </strong>
            </div>
          </div>
        </div>

        {/* CHART 2: UNITS BY PROJECT STACKED BAR CHART */}
        <div style={{
          background: '#ffffff !important',
          border: '1px solid var(--erp-border, #cbd5e1)',
          borderRadius: '12px',
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--erp-accent, #2563eb)',
              }}>
                <BarChart3 size={15} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'الوحدات حسب المشروع' : 'Units by Project'}
                </h4>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {isAr ? 'توزيع الوحدات وموقف البيع لكل مشروع إداري وعماري' : 'Inventory breakdown across active projects'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.72rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                <span>{isAr ? 'مباعة' : 'Sold'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563eb' }} />
                <span>{isAr ? 'معروضة' : 'Available'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b' }} />
                <span>{isAr ? 'قيد التعاقد' : 'Reserved'}</span>
              </div>
            </div>
          </div>

          {/* Stacked Horizontal Bar Chart (No Clipped Labels) */}
          <div style={{ minHeight: '260px', width: '100%' }}>
            {topProjects.length > 0 ? (
              <ERPApexChart
                type="bar"
                height={260}
                series={stackedSeries}
                options={{
                  chart: {
                    stacked: true,
                    toolbar: { show: false },
                  },
                  plotOptions: {
                    bar: {
                      horizontal: true,
                      barHeight: '52%',
                      borderRadius: 4,
                    },
                  },
                  xaxis: {
                    categories: projectNames,
                    labels: {
                      style: {
                        fontSize: '11px',
                        colors: '#64748b',
                      },
                    },
                  },
                  yaxis: {
                    labels: {
                      style: {
                        fontSize: '11px',
                        fontWeight: 600,
                        colors: '#334155',
                      },
                      maxWidth: 160,
                    },
                  },
                  grid: {
                    borderColor: '#f1f5f9',
                    strokeDashArray: 3,
                  },
                  legend: { show: false },
                  dataLabels: { enabled: false },
                  tooltip: {
                    shared: true,
                    intersect: false,
                    y: {
                      formatter: (val) => `${val} ${isAr ? 'وحدة' : 'units'}`,
                    },
                  },
                }}
                isAr={isAr}
              />
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', paddingTop: '3rem' }}>
                {isAr ? 'لا توجد مشاريع نشطة' : 'No active projects'}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── ROW 2: UNIT TYPES BARS, AREA HISTOGRAM, & AVERAGE PRICE BENCHMARKS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1.15fr) minmax(0, 1.2fr)', gap: '1.15rem' }}>
        
        {/* CHART 3: UNIT TYPES DISTRIBUTION (Horizontal Bars) */}
        <div style={{
          background: '#ffffff !important',
          border: '1px solid var(--erp-border, #cbd5e1)',
          borderRadius: '12px',
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--erp-accent, #2563eb)',
              }}>
                <Layers size={15} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'أنواع الوحدات' : 'Unit Types Breakdown'}
                </h4>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {isAr ? 'تصنيف الوحدات سكنية وتجارية وإدارية' : 'Apartments, duplex, commercial, & offices'}
                </span>
              </div>
            </div>
          </div>

          {/* Horizontal Progress Bars List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.35rem' }}>
            {unitTypesDistribution.length > 0 ? (
              unitTypesDistribution.map((t) => (
                <div key={t.typeKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color }} />
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{t.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontVariantNumeric: 'tabular-nums' }}>
                      <strong style={{ color: '#0f172a' }}>{t.count}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{t.pct}%</span>
                    </div>
                  </div>

                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#f1f5f9',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}>
                    <div 
                      style={{
                        width: `${Math.max(5, t.pct)}%`,
                        height: '100%',
                        background: t.color,
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', padding: '1.5rem 0' }}>
                {isAr ? 'لا توجد تصنيفات وحدات مسجلة' : 'No unit types recorded'}
              </div>
            )}
          </div>
        </div>

        {/* CHART 4: AREA HISTOGRAM (<100, 100-150, 150-200, 200-300, >300 m²) */}
        <div style={{
          background: '#ffffff !important',
          border: '1px solid var(--erp-border, #cbd5e1)',
          borderRadius: '12px',
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--erp-accent, #2563eb)',
              }}>
                <BarChart3 size={15} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'المساحات المعروضة (م²)' : 'Area Distribution (m²)'}
                </h4>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {isAr ? 'توزيع الوحدات حسب شرائح المساحة' : 'Unit counts across area brackets'}
                </span>
              </div>
            </div>
          </div>

          {/* Column Chart */}
          <div style={{ minHeight: '220px', width: '100%' }}>
            <ERPApexChart
              type="bar"
              height={220}
              series={[
                {
                  name: isAr ? 'عدد الوحدات' : 'Units Count',
                  data: areaCounts,
                  color: '#6366f1',
                },
              ]}
              options={{
                chart: {
                  toolbar: { show: false },
                },
                plotOptions: {
                  bar: {
                    columnWidth: '45%',
                    borderRadius: 5,
                    dataLabels: { position: 'top' },
                  },
                },
                dataLabels: {
                  enabled: true,
                  offsetY: -18,
                  style: {
                    fontSize: '11px',
                    fontWeight: 700,
                    colors: ['#0f172a'],
                  },
                },
                xaxis: {
                  categories: areaLabels,
                  labels: {
                    style: {
                      fontSize: '10.5px',
                      fontWeight: 600,
                      colors: '#64748b',
                    },
                  },
                },
                yaxis: {
                  labels: {
                    style: {
                      fontSize: '11px',
                      colors: '#64748b',
                    },
                  },
                },
                grid: {
                  borderColor: '#f1f5f9',
                  strokeDashArray: 3,
                },
              }}
              isAr={isAr}
            />
          </div>
        </div>

        {/* CHART 5: AVERAGE PRICE BENCHMARKS BY UNIT TYPE */}
        <div style={{
          background: '#ffffff !important',
          border: '1px solid var(--erp-border, #cbd5e1)',
          borderRadius: '12px',
          padding: '1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--erp-accent, #2563eb)',
              }}>
                <TrendingUp size={15} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'متوسط أسعار الوحدات' : 'Average Price Benchmarks'}
                </h4>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {isAr ? 'تسعير المتر والقيمة الإجمالية' : 'Average price per m² and unit'}
                </span>
              </div>
            </div>

            {/* Toggle: ج.م / م² vs ج.م / وحدة */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f1f5f9',
              borderRadius: '6px',
              padding: '2px',
            }}>
              <button
                type="button"
                onClick={() => setPriceMetricMode('perSqm')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: priceMetricMode === 'perSqm' ? 'var(--erp-accent, #2563eb)' : 'transparent',
                  color: priceMetricMode === 'perSqm' ? '#ffffff' : '#64748b',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isAr ? 'ج.م / م²' : 'EGP/m²'}
              </button>
              <button
                type="button"
                onClick={() => setPriceMetricMode('perUnit')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: priceMetricMode === 'perUnit' ? 'var(--erp-accent, #2563eb)' : 'transparent',
                  color: priceMetricMode === 'perUnit' ? '#ffffff' : '#64748b',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {isAr ? 'ج.م / وحدة' : 'EGP/Unit'}
              </button>
            </div>
          </div>

          {/* Benchmark Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.2rem' }}>
            {averagePricePerType.length > 0 ? (
              averagePricePerType.map((item) => (
                <div
                  key={item.typeKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#334155',
                    }}>
                      {item.iconType === 'home' ? <Home size={12} /> :
                       item.iconType === 'shopping-bag' ? <ShoppingBag size={12} /> :
                       item.iconType === 'briefcase' ? <Briefcase size={12} /> :
                       <Building2 size={12} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                        {item.count} {isAr ? 'وحدة مسجلة' : 'units'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontVariantNumeric: 'tabular-nums' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                      {priceMetricMode === 'perSqm'
                        ? formatEgp(item.avgPricePerSqm)
                        : formatEgp(item.avgUnitPrice)}
                    </strong>
                    <span style={{ fontSize: '0.65rem', color: 'var(--erp-accent, #2563eb)', fontWeight: 600 }}>
                      {priceMetricMode === 'perSqm' ? (isAr ? 'لكل متر مربع' : 'per sqm') : (isAr ? 'متوسط سعر الوحدة' : 'average unit')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', padding: '1.5rem 0' }}>
                {isAr ? 'لا توجد بيانات تسعير مسجلة' : 'No pricing data recorded'}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default PropertiesAnalyticsView;
