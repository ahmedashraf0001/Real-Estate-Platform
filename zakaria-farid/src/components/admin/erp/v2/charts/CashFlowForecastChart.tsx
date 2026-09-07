'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  ArrowUpRight, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { ERPContract, ERPInstallmentSchedule, ERPPDCRecord } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';

interface CashFlowForecastChartProps {
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  pdcRecords?: ERPPDCRecord[];
  currentCashBalance?: number;
  isAr?: boolean;
  embeddedInStudio?: boolean;
  onInspectContract?: (contract: ERPContract) => void;
  onNavigateToMonth?: (monthKey: string) => void;
}

interface MonthForecastData {
  monthKey: string;      // YYYY-MM
  label: string;         // e.g. "أكتوبر 2026"
  shortLabel: string;    // e.g. "أكتوبر"
  inflows: number;       // Scheduled collections
  outflows: number;      // Projected construction disbursements
  netFlow: number;       // Inflows - Outflows
  cumulative: number;    // Rolling treasury balance
  dealCount: number;     // Number of installments due
  contractsDue: Array<{
    contractNumber: string;
    buyerName: string;
    unitId: string;
    amount: number;
  }>;
}

const AR_MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const EN_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const CashFlowForecastChart: React.FC<CashFlowForecastChartProps> = ({
  contracts = [],
  schedules = [],
  pdcRecords = [],
  currentCashBalance = 0,
  isAr = true,
  embeddedInStudio = false,
  onInspectContract,
  onNavigateToMonth
}) => {
  // Configurable burn-rate percentage for construction disbursements (Default 45%)
  const [disbursementRate, setDisbursementRate] = useState<number>(45);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  // Compute 6-Month Rolling Forecast Window
  const forecastData: MonthForecastData[] = useMemo(() => {
    const today = new Date();
    const result: MonthForecastData[] = [];
    let rollingCash = currentCashBalance;

    for (let i = 0; i < 6; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = targetDate.getFullYear();
      const monthIdx = targetDate.getMonth();
      const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const monthName = isAr ? AR_MONTH_NAMES[monthIdx] : EN_MONTH_NAMES[monthIdx];
      const fullLabel = `${monthName} ${year}`;

      // Inflows: find all scheduled installments due in this month
      let monthInflows = D(0);
      const matchedDeals: MonthForecastData['contractsDue'] = [];

      // 1. From installment schedules
      schedules.forEach(sch => {
        if (sch.due_date && sch.due_date.startsWith(monthKey) && sch.status !== 'SUPERSEDED' && sch.status !== 'Void') {
          const val = D(sch.nominal_value || '0');
          monthInflows = monthInflows.plus(val);

          const c = contracts.find(con => con.contract_id === sch.contract_id);
          if (c) {
            matchedDeals.push({
              contractNumber: c.contract_number,
              buyerName: c.buyer_name,
              unitId: c.unit_id,
              amount: parseFloat(sch.nominal_value || '0')
            });
          }
        }
      });

      // 2. From PDC cheques not already linked to schedules
      pdcRecords.forEach(pdc => {
        if (pdc.due_date && pdc.due_date.startsWith(monthKey) && pdc.status !== 'Cleared' && pdc.status !== 'Void') {
          if (!pdc.schedule_id) {
            const val = D(pdc.nominal_value || '0');
            monthInflows = monthInflows.plus(val);
          }
        }
      });

      const inflowsNum = Math.round(monthInflows.toNumber());
      // Outflows: estimated construction & site burn rate percentage of expected revenue
      const outflowsNum = Math.round(inflowsNum * (disbursementRate / 100));
      const netFlowNum = inflowsNum - outflowsNum;
      rollingCash += netFlowNum;

      result.push({
        monthKey,
        label: fullLabel,
        shortLabel: monthName,
        inflows: inflowsNum,
        outflows: outflowsNum,
        netFlow: netFlowNum,
        cumulative: Math.round(rollingCash),
        dealCount: matchedDeals.length,
        contractsDue: matchedDeals
      });
    }

    return result;
  }, [contracts, schedules, pdcRecords, currentCashBalance, disbursementRate, isAr]);

  // Executive Summary Metrics
  const summary = useMemo(() => {
    const totalInflows = forecastData.reduce((acc, m) => acc + m.inflows, 0);
    const totalOutflows = forecastData.reduce((acc, m) => acc + m.outflows, 0);
    const netSurplus = totalInflows - totalOutflows;
    
    let peakMonth = forecastData[0];
    forecastData.forEach(m => {
      if (m.inflows > (peakMonth?.inflows || 0)) {
        peakMonth = m;
      }
    });

    const minCumulative = Math.min(...forecastData.map(m => m.cumulative));
    const isSafe = minCumulative >= 0;

    return {
      totalInflows,
      totalOutflows,
      netSurplus,
      peakMonth,
      isSafe,
      minCumulative
    };
  }, [forecastData]);

  // Selected month detail
  const activeMonthData = useMemo(() => {
    if (!selectedMonthKey) return forecastData[0] || null;
    return forecastData.find(m => m.monthKey === selectedMonthKey) || forecastData[0] || null;
  }, [forecastData, selectedMonthKey]);

  return (
    <div style={{
      background: embeddedInStudio ? 'transparent' : '#ffffff',
      border: embeddedInStudio ? 'none' : '1px solid #e2e8f0',
      borderRadius: embeddedInStudio ? 0 : '16px',
      padding: embeddedInStudio ? 0 : '1.5rem',
      boxShadow: embeddedInStudio ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: embeddedInStudio ? '0.85rem' : '1.25rem'
    }}>
      
      {/* 1. Header & Stage Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        {embeddedInStudio ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(184, 144, 62, 0.12)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={15} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
              {isAr ? 'توقعات الكاش والتحصيلات (الـ 6 شهور الجاية)' : 'Cash Flow Forecast & 6-Month Timeline'}
            </span>
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              background: 'rgba(184, 144, 62, 0.1)',
              border: '1px solid rgba(184, 144, 62, 0.25)',
              color: '#946f23'
            }}>
              {isAr ? 'رؤية مستقبلية' : 'Predictive Runway'}
            </span>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(184, 144, 62, 0.12)',
                color: '#946f23',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={18} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {isAr ? 'توقعات الكاش والتحصيلات (الـ 6 شهور الجاية)' : 'Cash Flow Forecast & 6-Month Inflow Timeline'}
              </h2>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                background: 'rgba(184, 144, 62, 0.1)',
                border: '1px solid rgba(184, 144, 62, 0.25)',
                color: '#946f23'
              }}>
                {isAr ? 'رؤية مستقبلية' : 'Predictive Runway'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
              {isAr 
                ? 'مقارنة بين مواعيد تحصيل أقساط الزباين ومصاريف المباني عشان نتأكد إن في كاش كافي دايماً'
                : 'Forward-looking installment dues vs construction WIP disbursements ensuring contractor milestone coverage'}
            </p>
          </div>
        )}

        {/* Burn-rate percentage control */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: embeddedInStudio ? '0.25rem 0.55rem' : '0.35rem 0.65rem'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
            {isAr ? 'نسبة الصرف على المباني:' : 'Est. WIP Burn Rate:'}
          </span>
          {[35, 45, 55].map(rate => (
            <button
              key={rate}
              type="button"
              onClick={() => setDisbursementRate(rate)}
              style={{
                background: disbursementRate === rate ? '#0f172a' : 'transparent',
                color: disbursementRate === rate ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '5px',
                padding: '0.15rem 0.45rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {rate}%
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top 3 Quick Summary KPI Metric Chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: embeddedInStudio ? '0.75rem' : '1rem' }}>
        
        {/* Chip 1: Total 6-Month Inflows */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fefdfa 100%)',
          border: '1px solid rgba(184, 144, 62, 0.3)',
          borderRadius: '12px',
          padding: embeddedInStudio ? '0.65rem 0.95rem' : '0.85rem 1.15rem',
          boxShadow: '0 2px 8px rgba(184, 144, 62, 0.06)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#946f23', display: 'block' }}>
            {isAr ? 'إجمالي الفلوس المتوقع تحصيلها (6 شهور):' : 'Total 6-Month Inflows:'}
          </span>
          <div style={{ fontSize: embeddedInStudio ? '1.25rem' : '1.45rem', fontWeight: 900, color: '#0f172a', marginTop: '0.15rem', fontVariantNumeric: 'tabular-nums' }}>
            {D(summary.totalInflows).formatEGP(isAr)}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
            {isAr ? 'حسب مواعيد أقساط عقود البيع' : 'From verified contract schedules'}
          </span>
        </div>

        {/* Chip 2: Peak Cash Flow Month */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: embeddedInStudio ? '0.65rem 0.95rem' : '0.85rem 1.15rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#946f23', display: 'block' }}>
            {isAr ? 'أكتر شهر هيدخل فيه فلوس:' : 'Peak Inflow Month:'}
          </span>
          <div style={{ fontSize: embeddedInStudio ? '1.15rem' : '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
            {summary.peakMonth?.label || '—'}
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#946f23', fontVariantNumeric: 'tabular-nums', marginTop: '0.2rem', display: 'block' }}>
            {D(summary.peakMonth?.inflows || 0).formatEGP(isAr)}
          </span>
        </div>

        {/* Chip 3: Net Cash Surplus */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: embeddedInStudio ? '0.65rem 0.95rem' : '0.85rem 1.15rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', display: 'block' }}>
            {isAr ? 'صافي الفلوس الزيادة المتوقعة:' : 'Net Projected Surplus:'}
          </span>
          <div style={{ fontSize: embeddedInStudio ? '1.25rem' : '1.45rem', fontWeight: 900, color: '#15803d', marginTop: '0.15rem', fontVariantNumeric: 'tabular-nums' }}>
            {D(summary.netSurplus).formatEGP(isAr)}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
            {isAr ? `بعد خصم ${disbursementRate}% لمصاريف المباني والتشطيب` : `After ${disbursementRate}% WIP disbursements`}
          </span>
        </div>

        {/* Chip 4: Runway Health */}
        <div style={{
          background: summary.isSafe ? 'rgba(21, 128, 61, 0.06)' : 'rgba(239, 68, 68, 0.05)',
          border: `1px solid ${summary.isSafe ? 'rgba(21, 128, 61, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
          borderRadius: '12px',
          padding: embeddedInStudio ? '0.65rem 0.95rem' : '0.85rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: summary.isSafe ? '#15803d' : '#dc2626' }}>
            {summary.isSafe ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
            <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>
              {summary.isSafe 
                ? (isAr ? 'حالة الكاش: متغطي ومطمئن' : 'Runway Health: Fully Covered') 
                : (isAr ? 'تنبيه: عجز مؤقت متوقع في الرصيد' : 'Deficit Warning in Runway')}
            </span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
            {summary.isSafe 
              ? (isAr ? 'الكاش في الخزنة والبنك مكفي وزيادة طول الـ 6 شهور الجاية' : 'Treasury cash remains positive across all 6 months')
              : (isAr ? 'محتاجين نوزع بعض دفعات مقاولين البناء عشان الكاش يفضل مرتاح' : 'Consider staggering contractor disbursements')}
          </span>
        </div>

      </div>

      {/* 3. Interactive Chart (Recharts) */}
      <div style={{ width: '100%', height: embeddedInStudio ? 270 : 320, marginTop: embeddedInStudio ? '0.25rem' : '0.5rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={forecastData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="goldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c5a059" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#c5a059" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="shortLabel" 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={{ stroke: '#e2e8f0' }} 
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as MonthForecastData;
                  return (
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      fontSize: '0.78rem',
                      minWidth: '200px'
                    }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.45rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
                        {data.label} ({data.dealCount} {isAr ? 'أقساط مستحقة' : 'deals'})
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#946f23', fontWeight: 700, margin: '0.2rem 0' }}>
                        <span>{isAr ? 'الفلوس المتوقع تحصيلها:' : 'Expected Inflow:'}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{D(data.inflows).formatEGP(isAr)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', margin: '0.2rem 0' }}>
                        <span>{isAr ? 'مصاريف المباني التقديرية:' : 'Disbursements:'}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{D(data.outflows).formatEGP(isAr)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: data.netFlow >= 0 ? '#15803d' : '#dc2626', fontWeight: 700, margin: '0.2rem 0', borderTop: '1px dashed #e2e8f0', paddingTop: '0.25rem' }}>
                        <span>{isAr ? 'صافي الفلوس للشهر ده:' : 'Net Monthly Flow:'}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{D(data.netFlow).formatEGP(isAr)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800, margin: '0.2rem 0', paddingTop: '0.25rem' }}>
                        <span>{isAr ? 'الكاش المتوقع في الخزنة والبنك:' : 'Rolling Treasury:'}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{D(data.cumulative).formatEGP(isAr)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '0.74rem', paddingTop: '0.5rem' }} 
              formatter={(value) => <span style={{ color: '#334155', fontWeight: 600 }}>{value}</span>}
            />
            
            {/* Inflows Area with subtle gold fill */}
            <Area 
              type="monotone" 
              dataKey="inflows" 
              fill="url(#goldAreaGrad)" 
              stroke="#c5a059" 
              strokeWidth={2.5} 
              name={isAr ? 'الفلوس المتوقع تحصيلها' : 'Expected Collections'} 
            />

            {/* Outflows Bar */}
            <Bar 
              dataKey="outflows" 
              fill="#cbd5e1" 
              radius={[6, 6, 0, 0]} 
              barSize={20} 
              name={isAr ? 'مصاريف المباني التقديرية' : 'Projected Disbursements'} 
            />

            {/* Rolling Cumulative Cash Balance Line */}
            <Line 
              type="monotone" 
              dataKey="cumulative" 
              stroke="#0f172a" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#0f172a', strokeWidth: 1, stroke: '#ffffff' }} 
              name={isAr ? 'الكاش المتوقع في الخزنة والبنك' : 'Rolling Cash Balance'} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 4. 6-Month Timeline Horizon Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
        {forecastData.map(m => {
          const isSelected = activeMonthData?.monthKey === m.monthKey;

          return (
            <div
              key={m.monthKey}
              onClick={() => setSelectedMonthKey(m.monthKey)}
              style={{
                background: isSelected ? 'rgba(184, 144, 62, 0.05)' : '#f8fafc',
                border: `1.5px solid ${isSelected ? '#946f23' : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: isSelected ? '#946f23' : '#0f172a' }}>
                  {m.shortLabel}
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontVariantNumeric: 'tabular-nums',
                  background: isSelected ? 'rgba(184, 144, 62, 0.15)' : '#e2e8f0',
                  color: isSelected ? '#946f23' : '#64748b',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  fontWeight: 700
                }}>
                  {m.dealCount} {isAr ? 'أقساط' : 'tranches'}
                </span>
              </div>

              <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                {D(m.inflows).formatEGP(isAr)}
              </div>

              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{isAr ? 'الصافي:' : 'Net:'}</span>
                <strong style={{ color: m.netFlow >= 0 ? '#15803d' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                  {D(m.netFlow).formatEGP(isAr)}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Selected Month Forwarding CTA */}
      {activeMonthData && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(184, 144, 62, 0.1)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800
            }}>
              <Calendar size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {activeMonthData.label}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: 'rgba(184, 144, 62, 0.12)',
                  color: '#946f23',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '4px',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {activeMonthData.dealCount} {isAr ? 'أقساط مستحقة' : 'deals due'}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {isAr ? 'إجمالي المتحصل المتوقع: ' : 'Expected Inflows: '}
                <strong style={{ color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                  {D(activeMonthData.inflows).formatEGP(isAr)}
                </strong>
              </span>
            </div>
          </div>

          {onNavigateToMonth && (
            <button
              type="button"
              onClick={() => onNavigateToMonth(activeMonthData.monthKey)}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
              onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}
            >
              <span>{isAr ? `عرض ومتابعة أقساط شهر (${activeMonthData.shortLabel}) في العمليات` : `View ${activeMonthData.shortLabel} Installments in Operations`}</span>
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      )}

    </div>
  );
};
