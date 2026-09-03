'use client';

import React, { useSyncExternalStore } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { D } from '@/lib/erp/math';

interface RSVAllocationRingProps {
  wipAccounts: {
    land: string;
    civil: string;
    mep: string;
    finishing: string;
    financing: string;
  };
  totalWip: string;
  totalSalesValue?: string;
  isAr?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    payload?: {
      color?: string;
      pct?: number;
      code?: string;
    };
  }>;
}

// Sophisticated architectural material palette
const WIP_PALETTE = [
  { key: 'land', code: '١٥٠٠٠٠', codeEn: '150000', nameEn: 'Land Asset', nameAr: 'أراضي وموقع', color: '#d4af37' },
  { key: 'civil', code: '١٥١٠٠٠', codeEn: '151000', nameEn: 'Civil & Concrete', nameAr: 'خرسانات وإنشاءات', color: '#64748b' },
  { key: 'mep', code: '١٥٢٠٠٠', codeEn: '152000', nameEn: 'MEP Utilities', nameAr: 'كهروميكانيك ومرافق', color: '#10b981' },
  { key: 'finishing', code: '١٥٣٠٠٠', codeEn: '153000', nameEn: 'Finishes & Facades', nameAr: 'تشطيبات وواجهات', color: '#f59e0b' },
  { key: 'financing', code: '١٥٦٠٠٠', codeEn: '156000', nameEn: 'Capitalized Financing', nameAr: 'تكاليف تمويل مرسملة', color: '#6366f1' }
];

const emptySubscribe = () => () => {};
const useIsMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

// Custom luxury tooltip
const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const color = item.payload?.color || '#d4af37';
    const pct = item.payload?.pct || 0;
    return (
      <div style={{
        background: 'rgba(15, 20, 32, 0.95)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${color}`,
        borderRadius: '12px',
        padding: '0.75rem 1rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 15px rgba(212,175,55,0.1)',
        fontSize: '0.78rem',
        minWidth: '170px'
      }}>
        <div style={{ fontWeight: 800, color, marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{item.name}</span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.payload?.code}</span>
        </div>
        <div style={{ fontWeight: 800, color: '#ffffff', fontVariantNumeric: 'tabular-nums', fontSize: '0.95rem' }}>
          {D(Number(item.value) || 0).formatEGP()}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.25rem' }}>
          {pct.toFixed(1)}% من إجمالي التكاليف المرسملة
        </div>
      </div>
    );
  }
  return null;
};

export const RSVAllocationRing: React.FC<RSVAllocationRingProps> = ({
  wipAccounts,
  totalWip,
  totalSalesValue = '150000000.00',
  isAr = false
}) => {
  const isMounted = useIsMounted();

  const totalWipD = D(totalWip);
  const totalWipNum = totalWipD.toNumber() || 1;
  const totalSalesD = D(totalSalesValue).isZero() ? D(1) : D(totalSalesValue);
  const rsvFactor = totalWipD.div(totalSalesD).toFixed(4);

  const data = WIP_PALETTE.map(item => {
    const rawVal = (wipAccounts as Record<string, string>)[item.key] || '0.00';
    const numVal = parseFloat(rawVal) || 0;
    return {
      name: isAr ? item.nameAr : item.nameEn,
      code: isAr ? item.code : item.codeEn,
      value: numVal,
      pct: (numVal / totalWipNum) * 100,
      formatted: D(rawVal).formatEGP(isAr),
      color: item.color
    };
  }).filter(d => d.value > 0);

  // Fallback if zero WIP
  const finalData = data.length > 0 ? data : [
    { name: isAr ? 'أصول تحت الإنشاء' : 'WIP Assets', code: '105000', value: 1, pct: 100, formatted: '0.00', color: '#d4af37' }
  ];

  if (!isMounted) {
    return (
      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        {isAr ? 'جاري تحميل حلقة توزيع التكاليف...' : 'Loading WIP allocation ring...'}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%' }}>
      <div style={{ width: '100%', height: 260, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={finalData}
              cx="50%"
              cy="50%"
              innerRadius={78}
              outerRadius={108}
              paddingAngle={4}
              cornerRadius={6}
              dataKey="value"
              stroke="rgba(10, 14, 24, 0.95)"
              strokeWidth={3}
              isAnimationActive={true}
              animationDuration={850}
              animationEasing="ease-out"
            >
              {finalData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Donut Center KPI HUD */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.1rem'
        }}>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
            {isAr ? 'معامل RSV' : 'RSV Factor'}
          </span>
          <span style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--zf-gold, #d4af37)', fontFamily: 'monospace', lineHeight: 1.1 }}>
            {rsvFactor}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#cbd5e1', fontWeight: 600, background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.45rem', borderRadius: '4px', marginTop: '0.15rem' }}>
            {totalWipD.formatEGP(isAr)}
          </span>
        </div>
      </div>

      {/* Structured Material Breakdown Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '0.5rem',
        marginTop: '0.85rem',
        width: '100%'
      }}>
        {finalData.map((item, idx) => (
          <div 
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.025)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              padding: '0.45rem 0.65rem',
              fontSize: '0.72rem',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{item.name}</span>
                <span style={{ fontSize: '0.64rem', color: '#64748b' }}>{item.code}</span>
              </div>
            </div>
            <span style={{ color: item.color, fontWeight: 800, fontFamily: 'monospace' }}>
              {item.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
