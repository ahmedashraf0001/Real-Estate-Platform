'use client';

import React, { useMemo, useState } from 'react';
import { usePropertyCosts } from '../../../context/ERPWorkstationContext';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  Building2, 
  Users, 
  Coins, 
  ArrowUpRight 
} from 'lucide-react';
import { ERPApexChart } from '../../charts/ERPApexChart';
import { Property } from '@/lib/supabase/types';
import { 
  ERPPartnerProfile, 
  ERPPartnerTransaction 
} from '@/lib/erp/types';
import { 
  computeDynamicBuildingCapital, 
  PartnerFinancialSummary 
} from '@/lib/erp/partnersEngine';
import { D } from '@/lib/erp/math';

export interface PartnersAnalyticsChartsProps {
  properties: Property[];
  transactions: ERPPartnerTransaction[];
  summaries: PartnerFinancialSummary[];
  selectedBuildingId?: string;
  isAr?: boolean;
}

export const PartnersAnalyticsCharts: React.FC<PartnersAnalyticsChartsProps> = ({
  properties = [],
  transactions = [],
  summaries = [],
  selectedBuildingId,
  isAr = true,
}) => {
  const propertyCosts = usePropertyCosts();
  const [chartScope, setChartScope] = useState<'selected' | 'all'>('selected');

  const buildingProperties = useMemo(() => {
    return properties.filter(p => p.type === 'building' || (p as any).is_building);
  }, [properties]);

  const activeBuilding = useMemo(() => {
    if (selectedBuildingId) {
      const found = buildingProperties.find(p => p.id === selectedBuildingId);
      if (found) return found;
    }
    return buildingProperties[0] || null;
  }, [buildingProperties, selectedBuildingId]);

  // 1. Grouped Bar Chart: Required vs Paid Capital
  const capitalComparisonData = useMemo(() => {
    if (chartScope === 'selected' && activeBuilding) {
      const capInfo = computeDynamicBuildingCapital(activeBuilding, transactions, propertyCosts);
      const categories = capInfo.partnerStatuses.map(p => {
        const name = p.partnerName;
        return name.length > 16 ? `${name.slice(0, 15)}...` : name;
      });

      const requiredSeries = capInfo.partnerStatuses.map(p => D(p.requiredContributionEgp).toNumber());
      const paidSeries = capInfo.partnerStatuses.map(p => D(p.paidContributionEgp).toNumber());

      return {
        categories: categories.length > 0 ? categories : [isAr ? 'لا يوجد شركاء' : 'No Partners'],
        series: [
          { name: isAr ? 'رأس المال المطلوب (ج.م)' : 'Required Capital (EGP)', data: requiredSeries.length > 0 ? requiredSeries : [0] },
          { name: isAr ? 'المسدد فعلياً (ج.م)' : 'Paid Capital (EGP)', data: paidSeries.length > 0 ? paidSeries : [0] }
        ]
      };
    }

    // All buildings view
    const categories = buildingProperties.map(b => {
      const title = b.title_ar || b.title_en || 'عمارة';
      return title.length > 16 ? `${title.slice(0, 15)}...` : title;
    });

    const requiredSeries = buildingProperties.map(b => {
      const info = computeDynamicBuildingCapital(b, transactions, propertyCosts);
      return D(info.impliedTotalCapitalEgp).toNumber();
    });

    const paidSeries = buildingProperties.map(b => {
      const info = computeDynamicBuildingCapital(b, transactions, propertyCosts);
      return D(info.totalActualInjectedEgp).toNumber();
    });

    return {
      categories: categories.length > 0 ? categories : [isAr ? 'لا توجد مشاريع' : 'No Projects'],
      series: [
        { name: isAr ? 'رأس المال المستهدف (ج.م)' : 'Implied Capital (EGP)', data: requiredSeries.length > 0 ? requiredSeries : [0] },
        { name: isAr ? 'إجمالي المودع (ج.م)' : 'Injected Capital (EGP)', data: paidSeries.length > 0 ? paidSeries : [0] }
      ]
    };
  }, [chartScope, activeBuilding, buildingProperties, transactions, isAr, propertyCosts]);

  // 2. Partner Roles Donut Chart: Capital contribution by role
  const roleDistributionData = useMemo(() => {
    const roleTotals: Record<string, number> = {
      primary_developer: 0,
      equity_partner: 0,
      land_partner: 0,
      silent_financier: 0
    };

    summaries.forEach(s => {
      const capital = D(s.totalContributedCapital).toNumber();
      if (s.isPermanent || s.partnerName.includes('زكريا فريد')) {
        roleTotals.primary_developer += capital;
      } else if (s.roleTitleAr.includes('ممول') || s.roleTitleAr.includes('بالمشروع')) {
        roleTotals.equity_partner += capital;
      } else if (s.roleTitleAr.includes('أرض') || s.roleTitleAr.includes('الأرض')) {
        roleTotals.land_partner += capital;
      } else {
        roleTotals.silent_financier += capital;
      }
    });

    const labels = [
      isAr ? 'المطور الرئيسي' : 'Primary Developer',
      isAr ? 'شركاء التمويل' : 'Equity Partners',
      isAr ? 'مساهمو الأرض' : 'Land Partners',
      isAr ? 'ممولون صامتون' : 'Silent Financiers'
    ];

    const series = [
      roleTotals.primary_developer,
      roleTotals.equity_partner,
      roleTotals.land_partner,
      roleTotals.silent_financier
    ];

    const hasData = series.some(v => v > 0);

    return {
      labels,
      series: hasData ? series : [1, 0, 0, 0]
    };
  }, [summaries, isAr]);

  const barChartOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: {
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '38%',
        borderRadius: 4,
      }
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    colors: ['var(--erp-accent, #2563eb)', '#64748b'],
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 2,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } }
    },
    xaxis: {
      categories: capitalComparisonData.categories,
      labels: {
        style: { fontSize: '11px', fontWeight: 600, colors: '#64748b' }
      }
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#64748b' },
        formatter: (val: number) => {
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
          return `${val}`;
        }
      }
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: isAr ? 'right' : 'left',
      labels: { colors: '#334155' }
    }
  }), [capitalComparisonData.categories, isAr]);

  const donutChartOptions: ApexCharts.ApexOptions = useMemo(() => ({
    chart: {
      fontFamily: 'inherit',
    },
    labels: roleDistributionData.labels,
    colors: ['var(--erp-accent, #2563eb)', '#0d9488', '#d97706', '#64748b'],
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: isAr ? 'إجمالي المساهمات' : 'Total Capital',
              fontSize: '12px',
              fontFamily: 'inherit',
              color: '#64748b',
              formatter: (w) => {
                const sum = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                if (sum >= 1000000) return `${(sum / 1000000).toFixed(1)} ${isAr ? 'مليون ج.م' : 'M EGP'}`;
                return `${sum.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
              }
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`
    },
    legend: {
      position: 'bottom',
      labels: { colors: '#334155' }
    },
    stroke: { width: 2, colors: ['#ffffff'] },
    tooltip: {
      y: {
        formatter: (val: number) => `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`
      }
    }
  }), [roleDistributionData.labels, isAr]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
      gap: '1.25rem',
      marginBottom: '1.5rem'
    }}>
      {/* Chart 1: Grouped Bar Chart */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: 'none'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--erp-accent-subtle, rgba(37, 99, 235, 0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--erp-accent, #2563eb)'
            }}>
              <BarChart3 size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'مقارنة رأس المال المطلوب مقابل المودع' : 'Required vs Injected Capital'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {chartScope === 'selected' 
                  ? (activeBuilding ? (activeBuilding.title_ar || activeBuilding.title_en) : '') 
                  : (isAr ? 'كافة المشروعات المقيدة' : 'All Recorded Projects')}
              </span>
            </div>
          </div>

          {/* Scope Toggle */}
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '2px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => setChartScope('selected')}
              style={{
                border: 'none',
                background: chartScope === 'selected' ? '#ffffff' : 'transparent',
                color: chartScope === 'selected' ? '#0f172a' : '#64748b',
                fontWeight: chartScope === 'selected' ? 700 : 500,
                fontSize: '0.72rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: chartScope === 'selected' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {isAr ? 'المشروع المحدد' : 'Selected'}
            </button>
            <button
              type="button"
              onClick={() => setChartScope('all')}
              style={{
                border: 'none',
                background: chartScope === 'all' ? '#ffffff' : 'transparent',
                color: chartScope === 'all' ? '#0f172a' : '#64748b',
                fontWeight: chartScope === 'all' ? 700 : 500,
                fontSize: '0.72rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: chartScope === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {isAr ? 'كافة العماير' : 'All Buildings'}
            </button>
          </div>
        </div>

        <ERPApexChart
          type="bar"
          height={260}
          series={capitalComparisonData.series}
          options={barChartOptions}
          isAr={isAr}
        />
      </div>

      {/* Chart 2: Partner Role Donut Chart */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: 'none'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--erp-accent-subtle, rgba(37, 99, 235, 0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--erp-accent, #2563eb)'
            }}>
              <PieChartIcon size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'توزيع رؤوس الأموال حسب فئة الشريك' : 'Capital Allocation by Partner Role'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'نسب مساهمة الشركاء في إجمالي المحفظة' : 'Portfolio Contributed Capital Distribution'}
              </span>
            </div>
          </div>
        </div>

        <ERPApexChart
          type="donut"
          height={260}
          series={roleDistributionData.series}
          options={donutChartOptions}
          isAr={isAr}
        />
      </div>
    </div>
  );
};
