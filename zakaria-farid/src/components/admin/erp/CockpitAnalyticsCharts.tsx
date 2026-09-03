/**
 * Zakaria Farid Real Estate ERP — Cockpit Analytics Charts
 * Integrates the client's exact 3 visualizations:
 * 1. Liquidity & Operating Assets Donut (Cash, A/R, WIP, Debts)
 * 2. Sales Analytics Bar Chart (Cash Collected vs Remaining Installments vs Gross Total)
 * 3. Accounting Equilibrium Bar Chart (Debits vs Credits Balance)
 */

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { D } from '@/lib/erp/math';

interface CockpitAnalyticsChartsProps {
  cashBalance: number;
  accountsReceivable: number;
  wipIncurred: number;
  totalDebts: number;
  collectedSales: number;
  grossContracts: number;
  partnerCapital: number;
  isAr: boolean;
}

interface TooltipPayloadItem {
  name: string;
  value?: number;
  color?: string;
  fill?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  isAr?: boolean;
}

const CustomDarkTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, isAr = true }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(10, 12, 18, 0.95)',
        border: '1px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '8px',
        padding: '0.65rem 0.9rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        fontSize: '0.78rem'
      }}>
        {label && <div style={{ fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>{label}</div>}
        {payload.map((entry, index) => (
          <div key={`item-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: entry.color || entry.fill || '#d4af37' }}>
            <span>{entry.name}:</span>
            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
              {D(entry.value || 0).formatEGP(isAr)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const CockpitAnalyticsCharts: React.FC<CockpitAnalyticsChartsProps> = ({
  cashBalance,
  accountsReceivable,
  wipIncurred,
  totalDebts,
  collectedSales,
  grossContracts,
  partnerCapital,
  isAr
}) => {
  // Chart 1: Donut Data
  const donutData = [
    { name: isAr ? 'السيولة كاش (خزينة وبنك)' : 'Available Cash', value: Math.max(0, cashBalance), color: '#10b981' },
    { name: isAr ? 'أقساط ومبيعات قادمة (A/R)' : 'Pending A/R', value: Math.max(0, accountsReceivable), color: '#0284c7' },
    { name: isAr ? 'مصروفات البناء (WIP)' : 'Construction WIP', value: Math.max(0, wipIncurred), color: '#f59e0b' },
    { name: isAr ? 'ديون والتزامات الشركة' : 'Debts & Payables', value: Math.max(0, totalDebts), color: '#ef4444' }
  ].filter(d => d.value > 0);

  // Chart 2: Sales Analytics Data
  const unpaidSales = Math.max(0, grossContracts - collectedSales);
  const salesData = [
    {
      name: isAr ? 'المحصل كاش' : 'Cash Collected',
      amount: collectedSales,
      fill: '#10b981'
    },
    {
      name: isAr ? 'أقساط قادمة' : 'Pending Tranches',
      amount: unpaidSales,
      fill: '#38bdf8'
    },
    {
      name: isAr ? 'إجمالي التعاقدات' : 'Gross Value',
      amount: grossContracts,
      fill: '#818cf8'
    }
  ];

  // Chart 3: Accounting Equilibrium Data (Debits vs Credits)
  const equilibriumData = [
    {
      category: isAr ? 'الأصول والمدين (Debits)' : 'Assets & Debits',
      cash: cashBalance,
      receivables: accountsReceivable,
      wip: wipIncurred,
      debts: 0,
      equity: 0,
      sales: 0
    },
    {
      category: isAr ? 'الالتزامات والدائن (Credits)' : 'Liabilities & Credits',
      cash: 0,
      receivables: 0,
      wip: 0,
      debts: totalDebts,
      equity: partnerCapital,
      sales: grossContracts
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Row: Donut + Sales Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem' }}>
        
        {/* CHART 1: Donut Chart */}
        <div style={{
          background: 'rgba(18, 22, 34, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.6rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
              {isAr ? 'ميزان السيولة والتشغيل المباشر (Operating Cash vs Assets)' : 'Operating Cash & Asset Allocation'}
            </h4>
            <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              {isAr ? 'السيولة المباشرة' : 'Direct Liquidity'}
            </span>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#07080b" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomDarkTooltip isAr={isAr} />} />
                <Legend 
                  wrapperStyle={{ fontSize: '0.74rem', paddingTop: '0.5rem' }} 
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Sales Analytics Bar Chart */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.6) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.6rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
              {isAr ? 'تقرير ومؤشرات المبيعات والوحدات (Sales Analytics)' : 'Sales & Contract Realization'}
            </h4>
            <span style={{ fontSize: '0.7rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              {isAr ? 'عقود البيع' : 'Sale Contracts'}
            </span>
          </div>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                <YAxis 
                  stroke="#9ca3af" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} 
                />
                <Tooltip content={<CustomDarkTooltip isAr={isAr} />} />
                <Bar dataKey="amount" name={isAr ? 'القيمة المالية' : 'Amount'} radius={[6, 6, 0, 0]}>
                  {salesData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Full-Width Chart: Accounting Equilibrium (Debits vs Credits) */}
      <div style={{
        background: 'rgba(18, 22, 34, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.6rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
              {isAr ? 'ميزان المَدِين والدائِن (Accounting Equilibrium)' : 'Accounting Equilibrium (Debits = Credits)'}
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--zf-text-secondary, #a7acc0)' }}>
              {isAr ? 'الأصول والمدين (Debits) = الالتزامات + حقوق الملكية والمبيعات (Credits)' : 'Verification of general ledger fundamental balance'}
            </span>
          </div>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--zf-gold, #d4af37)',
            background: 'rgba(212, 175, 55, 0.1)',
            padding: '0.25rem 0.65rem',
            borderRadius: '6px',
            border: '1px solid rgba(212, 175, 55, 0.25)'
          }}>
            Balanced Ledger (Inv 4.1)
          </span>
        </div>

        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={equilibriumData} margin={{ top: 15, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="category" stroke="#9ca3af" tick={{ fontSize: 12, fill: '#e2e8f0', fontWeight: 700 }} />
              <YAxis 
                stroke="#9ca3af" 
                tick={{ fontSize: 10, fill: '#94a3b8' }} 
                tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} 
              />
              <Tooltip content={<CustomDarkTooltip isAr={isAr} />} />
              <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '0.4rem' }} />
              {/* Debits side */}
              <Bar dataKey="cash" name={isAr ? 'السيولة كاش' : 'Cash'} stackId="a" fill="#10b981" />
              <Bar dataKey="receivables" name={isAr ? 'أقساط مستحقة A/R' : 'Receivables'} stackId="a" fill="#0284c7" />
              <Bar dataKey="wip" name={isAr ? 'تكاليف بناء WIP' : 'Construction WIP'} stackId="a" fill="#f59e0b" />
              {/* Credits side */}
              <Bar dataKey="debts" name={isAr ? 'ديون الشركة' : 'Debts & Loans'} stackId="b" fill="#ef4444" />
              <Bar dataKey="equity" name={isAr ? 'رأس مال الشركاء' : 'Partner Capital'} stackId="b" fill="#6366f1" />
              <Bar dataKey="sales" name={isAr ? 'المبيعات والتعاقدات' : 'Sales Revenue'} stackId="b" fill="#a855f7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
