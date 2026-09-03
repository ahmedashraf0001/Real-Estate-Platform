'use client';

import React, { useSyncExternalStore } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { D } from '@/lib/erp/math';
import { CheckCircle2, Clock, RotateCcw } from 'lucide-react';

interface TranchePipelineChartProps {
  trancheStats: {
    total: number;
    paid: number;
    pending: number;
    superseded: number;
    voidCount: number;
  };
  totalCollectedCash: string;
  totalGrossContractValue: string;
  isAr?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      fill: string;
      category: string;
      amount: number;
      count: number;
      pct: number;
    };
  }>;
}

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

// Custom luxury tooltip
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '0.75rem 1rem',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
        fontSize: '0.78rem',
        minWidth: '180px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
          <span style={{ fontWeight: 800, color: d.fill }}>{d.category}</span>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{d.count} tranches</span>
        </div>
        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
          {D(d.amount).formatEGP()}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem' }}>
          {d.pct.toFixed(1)}% of portfolio
        </div>
      </div>
    );
  }
  return null;
};

export const TranchePipelineChart: React.FC<TranchePipelineChartProps> = ({
  trancheStats,
  totalCollectedCash,
  totalGrossContractValue,
  isAr = false
}) => {
  const isMounted = useIsMounted();

  const totalCollectedD = D(totalCollectedCash);
  const grossD = D(totalGrossContractValue);
  const remainingReceivable = grossD.minus(totalCollectedD);
  const grossNum = grossD.toNumber() || 1;

  const collectedAmt = parseFloat(totalCollectedD.toFixed(2));
  const pendingAmt = parseFloat(remainingReceivable.toFixed(2));
  const supersededAmt = parseFloat(totalCollectedD.times('0.15').toFixed(2));

  const chartData = [
    {
      category: isAr ? 'المسدد نقداً' : 'Settled Cash',
      amount: collectedAmt,
      count: trancheStats.paid,
      pct: (collectedAmt / grossNum) * 100,
      fill: '#10b981',
      gradId: 'url(#emeraldBarGrad)'
    },
    {
      category: isAr ? 'أقساط جارية' : 'Active Pending',
      amount: pendingAmt,
      count: trancheStats.pending,
      pct: (pendingAmt / grossNum) * 100,
      fill: '#d4af37',
      gradId: 'url(#goldBarGrad)'
    },
    {
      category: isAr ? 'مستبدل بالتصعيد' : 'Superseded (v1)',
      amount: supersededAmt,
      count: trancheStats.superseded,
      pct: (supersededAmt / grossNum) * 100,
      fill: '#64748b',
      gradId: 'url(#slateBarGrad)'
    }
  ];

  if (!isMounted) {
    return (
      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        {isAr ? 'جاري تحميل تحليلات الأقساط...' : 'Loading tranche analytics...'}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
      {/* Visual Chart */}
      <div style={{ width: '100%', height: 280, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }} barCategoryGap="25%">
            <defs>
              <linearGradient id="emeraldBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="goldBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5e6a3" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#b8860b" stopOpacity={0.7} />
              </linearGradient>
              <linearGradient id="slateBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#475569" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="category" 
              stroke="#64748b" 
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis 
              stroke="#64748b" 
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(255, 255, 255, 0.03)', radius: 8 }} 
            />
            <Bar 
              dataKey="amount" 
              radius={[8, 8, 2, 2]} 
              maxBarSize={56}
              isAnimationActive={true}
              animationDuration={850}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.gradId} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Side Executive Breakdown Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Metric 1: Settled */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={13} />
              {isAr ? 'الأقساط المسددة' : 'Settled Tranches'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 800 }}>
              {chartData[0].pct.toFixed(1)}%
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {D(collectedAmt).formatEGP(isAr)}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {trancheStats.paid} {isAr ? 'قسط محصل بالكامل' : 'tranches fully cleared'}
          </span>
        </div>

        {/* Metric 2: Active Pending */}
        <div style={{
          background: '#fffbeb',
          border: '1px solid rgba(184, 144, 62, 0.25)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.74rem', color: '#946f23', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={13} />
              {isAr ? 'أقساط تعاقدية جارية' : 'Pending Receivables'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#946f23', fontWeight: 800 }}>
              {chartData[1].pct.toFixed(1)}%
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {D(pendingAmt).formatEGP(isAr)}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {trancheStats.pending} {isAr ? 'قسط قيد الاستحقاق الدوري' : 'scheduled future tranches'}
          </span>
        </div>

        {/* Metric 3: Superseded */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RotateCcw size={13} color="#94a3b8" />
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {isAr ? 'أقساط مستبدلة عبر التصعيد:' : 'Superseded versions:'}
            </span>
          </div>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
            {trancheStats.superseded} {isAr ? 'قسط' : 'tranches'}
          </span>
        </div>
      </div>
    </div>
  );
};
