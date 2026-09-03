'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart3, 
  Sparkles 
} from 'lucide-react';
import styles from './AdminERPHub.module.css';
import { CashflowHorizonChart } from '@/components/erp/CashflowHorizonChart';
import { RSVAllocationRing } from '@/components/erp/RSVAllocationRing';
import { TranchePipelineChart } from '@/components/erp/TranchePipelineChart';

interface ERPFinancialChartsProps {
  isAr: boolean;
  kpis: {
    cashBank: string;
    totalWip: string;
    accountsReceivable: string;
    deferredRevenue: string;
    realizedRevenue: string;
  };
  totalGrossContractValue: string;
  totalCollectedCash: string;
  wipAccounts: {
    land: string;
    civil: string;
    mep: string;
    finishing: string;
    financing: string;
  };
  trancheStats: {
    total: number;
    paid: number;
    pending: number;
    superseded: number;
    voidCount: number;
  };
}

export const ERPFinancialCharts: React.FC<ERPFinancialChartsProps> = ({
  isAr,
  kpis,
  totalGrossContractValue,
  totalCollectedCash,
  wipAccounts,
  trancheStats
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Chart 1: Cashflow Horizon Chart (Hero Interactive Visualization) */}
      <motion.div 
        className={styles.chartCard}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          borderRadius: '18px',
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--zf-gold, #d4af37)' }}>
              <TrendingUp size={20} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'مسار التدفقات النقدية وتوقيت الاعتراف بالإيراد (IFRS 15 / Model B)' : 'Cashflow Horizon & Revenue Recognition Trajectory'}
              </h3>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              {isAr 
                ? 'محاكاة ديناميكية للمقبوضات الفعلية والالتزامات التعاقدية عبر الأرباع السنوية'
                : 'Interactive dynamic spline: Gross sales commitments vs actual collections vs deferred contract liability'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              color: '#946f23',
              background: '#fffbeb',
              padding: '0.25rem 0.6rem',
              borderRadius: '9999px',
              border: '1px solid rgba(184, 144, 62, 0.25)'
            }}>
              <Sparkles size={12} />
              <span>{isAr ? 'رسم بياني حي تفاعلي' : 'Live Recharts Engine'}</span>
            </span>
          </div>
        </div>

        <CashflowHorizonChart 
          totalGrossContractValue={totalGrossContractValue}
          totalCollectedCash={totalCollectedCash}
          deferredRevenue={kpis.deferredRevenue}
          realizedRevenue={kpis.realizedRevenue}
          isAr={isAr}
        />
      </motion.div>

      {/* Grid: 2 Side-by-Side Luxury Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Ring Chart: WIP Allocation Ring & RSV */}
        <motion.div 
          className={styles.chartCard}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            borderRadius: '18px',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--zf-gold, #d4af37)', marginBottom: '0.25rem' }}>
            <PieIcon size={18} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {isAr ? 'توزيع تكاليف التنفيذ ومعامل RSV' : 'WIP Cost Allocation Ring (RSV)'}
            </h3>
          </div>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#64748b' }}>
            {isAr 
              ? 'توزيع تكاليف الأراضي والإنشاءات والتشطيبات والتمويل مع حساب معامل الاسترداد'
              : 'Capitalized development assets across Land, Civil, MEP, Finishing & Financing.'}
          </p>

          <RSVAllocationRing 
            wipAccounts={wipAccounts}
            totalWip={kpis.totalWip}
            totalSalesValue={totalGrossContractValue}
            isAr={isAr}
          />
        </motion.div>

        {/* Bar Chart: Tranche Maturity Pipeline */}
        <motion.div 
          className={styles.chartCard}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            borderRadius: '18px',
            padding: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--zf-gold, #d4af37)', marginBottom: '0.25rem' }}>
            <BarChart3 size={18} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {isAr ? 'حالة محفظة الأقساط والسيولة' : 'Tranche Lifecycle & Cash Pipeline'}
            </h3>
          </div>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: '#64748b' }}>
            {isAr 
              ? 'توزيع الأقساط المحصلة والجارية وتلك المستبدلة بالتصعيد'
              : 'Volume comparison of Settled Cash vs Active Receivables vs Superseded.'}
          </p>

          <TranchePipelineChart 
            trancheStats={trancheStats}
            totalCollectedCash={totalCollectedCash}
            totalGrossContractValue={totalGrossContractValue}
            isAr={isAr}
          />
        </motion.div>
      </div>
    </div>
  );
};
