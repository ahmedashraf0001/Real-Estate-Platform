'use client';

import React, { useMemo } from 'react';
import { 
  BarChart3, 
  Percent, 
  TrendingUp
} from 'lucide-react';
import { ERPCostAllocation } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { ERPApexChart } from '../../charts/ERPApexChart';

interface CostAllocationAnalyticsChartsProps {
  allocations: ERPCostAllocation[];
  isAr?: boolean;
}

export const CostAllocationAnalyticsCharts: React.FC<CostAllocationAnalyticsChartsProps> = ({
  allocations,
  isAr = true
}) => {
  // 1. Chart 1: Capitalized WIP vs Sales Ceiling Comparison
  const wipVsSalesData = useMemo(() => {
    if (!allocations || allocations.length === 0) {
      return {
        categories: [isAr ? 'لا توجد بيانات' : 'No Data'],
        series: [
          { name: isAr ? 'المصروف على المباني (WIP)' : 'Incurred WIP', data: [0] },
          { name: isAr ? 'سقف المبيعات المقدر' : 'Sales Ceiling', data: [0] }
        ]
      };
    }

    const categories = allocations.map(a => {
      const name = a.project_name || (isAr ? 'مشروع بدون اسم' : 'Unnamed Project');
      return name.length > 20 ? `${name.substring(0, 18)}...` : name;
    });

    const wipData = allocations.map(a => D(a.total_incurred_wip || '0').toNumber());
    const salesData = allocations.map(a => D(a.total_sales_value || '0').toNumber());

    return {
      categories,
      series: [
        {
          name: isAr ? 'المصروف على المباني (WIP)' : 'Incurred Construction WIP',
          data: wipData
        },
        {
          name: isAr ? 'سقف المبيعات المقدر' : 'Target Sales Ceiling',
          data: salesData
        }
      ]
    };
  }, [allocations, isAr]);

  // 2. Chart 2: RSV Factor Distribution Across Projects
  const rsvDistributionData = useMemo(() => {
    if (!allocations || allocations.length === 0) {
      return {
        categories: [isAr ? 'لا توجد بيانات' : 'No Data'],
        series: [{ name: isAr ? 'معامل RSV' : 'RSV Factor', data: [0] }]
      };
    }

    const categories = allocations.map(a => {
      const name = a.project_name || (isAr ? 'مشروع بدون اسم' : 'Unnamed Project');
      return name.length > 20 ? `${name.substring(0, 18)}...` : name;
    });

    const rsvPctData = allocations.map(a => {
      const sales = D(a.total_sales_value || '0');
      if (sales.isZero()) return 0;
      const factor = parseFloat(a.rsv_factor || '0');
      if (isNaN(factor) || factor < 0) return 0;
      return parseFloat((factor * 100).toFixed(2));
    });

    return {
      categories,
      series: [
        {
          name: isAr ? 'نسبة تكلفة المباني (RSV %)' : 'Building Cost Ratio (RSV %)',
          data: rsvPctData
        }
      ]
    };
  }, [allocations, isAr]);

  // 3. Chart 3: Project Gross Margin Analytics
  const marginAnalyticsData = useMemo(() => {
    if (!allocations || allocations.length === 0) {
      return {
        categories: [isAr ? 'لا توجد بيانات' : 'No Data'],
        series: [
          { name: isAr ? 'هامش الربح الإجمالي' : 'Gross Margin %', data: [0] }
        ]
      };
    }

    const categories = allocations.map(a => {
      const name = a.project_name || (isAr ? 'مشروع بدون اسم' : 'Unnamed Project');
      return name.length > 20 ? `${name.substring(0, 18)}...` : name;
    });

    const marginPctData = allocations.map(a => {
      const sales = D(a.total_sales_value || '0');
      if (sales.isZero()) return 0;
      const factor = parseFloat(a.rsv_factor || '0');
      if (isNaN(factor)) return 0;
      const margin = (1 - factor) * 100;
      return parseFloat(margin.toFixed(2));
    });

    return {
      categories,
      series: [
        {
          name: isAr ? 'صافي هامش الربح المقدر (%)' : 'Expected Gross Margin (%)',
          data: marginPctData
        }
      ]
    };
  }, [allocations, isAr]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
      gap: '1.25rem',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box'
    }}>
      {/* 1. Capitalized WIP vs Sales Ceiling Comparison */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        boxShadow: 'none'
      }}>
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
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <BarChart3 size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'المصروف الفعلي مقابل سقف المبيعات' : 'Incurred WIP vs Sales Ceiling'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'مقارنة رأس المال المحمل بالسقف البيعي الكلي' : 'Capitalized WIP vs gross catalog valuation'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: '260px' }}>
          <ERPApexChart
            type="bar"
            height={260}
            series={wipVsSalesData.series}
            options={{
              colors: ['var(--erp-accent, #2563eb)', '#475569'],
              xaxis: {
                categories: wipVsSalesData.categories,
                labels: {
                  style: { fontSize: '11px' },
                  rotate: -20
                }
              },
              yaxis: {
                labels: {
                  formatter: (val) => `${(Number(val) / 1000000).toFixed(1)}M`
                }
              },
              plotOptions: {
                bar: {
                  horizontal: false,
                  columnWidth: '50%',
                  borderRadius: 4
                }
              }
            }}
            isAr={isAr}
          />
        </div>
      </div>

      {/* 2. RSV Factor Distribution Across Projects */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        boxShadow: 'none'
      }}>
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
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Percent size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'توزيع نسبة تكلفة المباني (معامل RSV)' : 'RSV Factor Distribution'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'نسبة تكلفة البناء والخامات من سعر بيع كل شقة' : 'Construction cost to sales price ratio per project'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: '260px' }}>
          <ERPApexChart
            type="bar"
            height={260}
            series={rsvDistributionData.series}
            options={{
              colors: ['var(--erp-accent, #2563eb)'],
              xaxis: {
                categories: rsvDistributionData.categories,
                labels: {
                  style: { fontSize: '11px' },
                  rotate: -20
                }
              },
              yaxis: {
                labels: {
                  formatter: (val) => `${Number(val).toFixed(0)}%`
                }
              },
              plotOptions: {
                bar: {
                  horizontal: false,
                  columnWidth: '40%',
                  borderRadius: 4
                }
              }
            }}
            isAr={isAr}
          />
        </div>
      </div>

      {/* 3. Project Gross Margin Analytics */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        boxShadow: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: '#ecfdf5',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'تحليل هوامش الربح الإجمالية للمشروعات' : 'Project Gross Margin Analytics'}
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'صافي هامش الربح المحقق بعد استنزال تكلفة البناء' : 'Net margin recognized after WIP relief'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: '260px' }}>
          <ERPApexChart
            type="bar"
            height={260}
            series={marginAnalyticsData.series}
            options={{
              colors: ['#16a34a'],
              xaxis: {
                categories: marginAnalyticsData.categories,
                labels: {
                  style: { fontSize: '11px' },
                  rotate: -20
                }
              },
              yaxis: {
                labels: {
                  formatter: (val) => `${Number(val).toFixed(0)}%`
                }
              },
              plotOptions: {
                bar: {
                  horizontal: false,
                  columnWidth: '40%',
                  borderRadius: 4
                }
              }
            }}
            isAr={isAr}
          />
        </div>
      </div>
    </div>
  );
};
