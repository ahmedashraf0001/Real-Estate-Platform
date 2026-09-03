'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart3, 
  Users, 
  Sparkles, 
  Building, 
  DollarSign, 
  CheckCircle2, 
  ArrowUpRight,
  Eye,
  Layers,
  Calculator
} from 'lucide-react';
import { CashflowHorizonChart } from '@/components/erp/CashflowHorizonChart';
import { RSVAllocationRing } from '@/components/erp/RSVAllocationRing';
import { TranchePipelineChart } from '@/components/erp/TranchePipelineChart';
import { PartnerCapitalCards } from './PartnerCapitalCards';
import { ERPCostAllocation, ERPPartnerCall, ERPTaxRecord } from '@/lib/erp/types';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { D } from '@/lib/erp/math';

interface DashboardAnalyticalStudioProps {
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
  totalWipIncurred: string;
  totalSafePDCs?: string;
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
  costAllocations: ERPCostAllocation[];
  partnerCalls: ERPPartnerCall[];
  taxRecords?: ERPTaxRecord[];
  totalInjectedCapital?: string;
  registeredPartners: Array<{ name: string; role: string }>;
  onInjectCapital: (partnerName: string) => void;
  onInspectRSV: (allocation: ERPCostAllocation) => void;
}

export const DashboardAnalyticalStudio: React.FC<DashboardAnalyticalStudioProps> = ({
  isAr,
  kpis,
  totalGrossContractValue,
  totalCollectedCash,
  totalWipIncurred,
  totalSafePDCs = '0.00',
  totalInjectedCapital = '0.00',
  wipAccounts,
  trancheStats,
  costAllocations,
  partnerCalls,
  taxRecords = [],
  registeredPartners,
  onInjectCapital,
  onInspectRSV
}) => {
  const [activeStudioTab, setActiveStudioTab] = useState<'cashflow' | 'wip' | 'sales' | 'partners'>('cashflow');

  const renderMoneyParts = (val: string | number) => {
    const parts = D(val).toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.2rem' }}>
        <span style={{ fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>{integerPart}</span>
        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>.{parts[1]}</span>
        <span style={{ fontSize: '0.66rem', color: '#94a3b8', marginInlineStart: '0.2rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      background: 'linear-gradient(180deg, rgba(16, 21, 34, 0.75) 0%, rgba(10, 14, 24, 0.95) 100%)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      padding: '1.4rem',
      boxShadow: '0 12px 36px -10px rgba(0, 0, 0, 0.6)'
    }}>
      <style>{`
        @keyframes studioTabSlideFade {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.995);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .studio-tab-content {
          animation: studioTabSlideFade 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Studio Header & Segmented Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        paddingBottom: '1.1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              color: '#e2c974',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={16} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              {isAr ? 'استوديو التحليل المالي والمخططات التنفيذية' : 'Executive Financial Analytics Studio'}
            </h3>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '0.2rem' }}>
            {isAr ? 'نمذجة رسومية ديناميكية متخصصة لمسار السيولة والتكاليف والمبيعات' : 'Dynamic domain-focused visualizations and projections'}
          </span>
        </div>

        {/* Refined Segmented Controller */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: 'rgba(0, 0, 0, 0.55)',
          padding: '0.25rem',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'cashflow', icon: TrendingUp, labelAr: 'مسار السيولة', labelEn: 'Cashflow Spline' },
            { id: 'wip', icon: PieIcon, labelAr: 'الإنشاءات و RSV', labelEn: 'WIP & RSV Allocation' },
            { id: 'sales', icon: BarChart3, labelAr: 'المبيعات والأقساط', labelEn: 'Sales & Tranches' },
            { id: 'partners', icon: Users, labelAr: 'حقوق الشركاء', labelEn: 'Partner Equity' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeStudioTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStudioTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '9px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: isActive ? '1px solid rgba(212, 175, 55, 0.45)' : '1px solid transparent',
                  cursor: 'pointer',
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.08) 100%)' 
                    : 'transparent',
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  boxShadow: isActive ? '0 4px 14px rgba(212, 175, 55, 0.12)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon size={14} color={isActive ? '#e2c974' : undefined} />
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CASHFLOW & LIQUIDITY TRAJECTORY                                    */}
      {/* ========================================================================= */}
      {activeStudioTab === 'cashflow' && (
        <div key="cashflow" className="studio-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Hero Spline Chart */}
          <div style={{
            background: 'linear-gradient(180deg, rgba(20, 26, 42, 0.75) 0%, rgba(12, 16, 26, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderTop: '2.5px solid #10b981',
            borderRadius: '16px',
            padding: '1.35rem',
            position: 'relative',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  {isAr ? 'منحنى التدفقات النقدية وتوقيت الاعتراف بالإيراد (IFRS 15 Horizon)' : 'Cashflow Horizon & Revenue Recognition Trajectory'}
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                  {isAr ? 'مقارنة حية: إجمالي المبيعات التعاقدية مقابل المتحصلات الفعلية والالتزام المؤجل' : 'Spline projection: Gross commitments vs actual cash collected vs deferred revenue'}
                </p>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#e2c974',
                background: 'rgba(212, 175, 55, 0.1)',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                border: '1px solid rgba(212, 175, 55, 0.25)'
              }}>
                <Sparkles size={12} />
                <span>{isAr ? 'محاكاة ديناميكية متصلة بالدفاتر' : 'Ledger-Connected Model'}</span>
              </div>
            </div>

            <CashflowHorizonChart 
              totalGrossContractValue={totalGrossContractValue}
              totalCollectedCash={totalCollectedCash}
              deferredRevenue={kpis.deferredRevenue}
              realizedRevenue={kpis.realizedRevenue}
              isAr={isAr}
            />
          </div>

          {/* Liquidity Composition 3-Pillar Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem'
          }}>
            {/* Pillar 1: Bank Cash */}
            <div style={{
              background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 20, 32, 0.75) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderTop: '2px solid #10b981',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 700 }}>
                  {isAr ? 'السيولة البنكية الجارية (حساب ١٠٢٠٠٠)' : 'Operating Bank Cash (102000)'}
                </span>
                <span style={{ fontSize: '0.64rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                  {isAr ? 'سيولة فورية' : 'Liquid'}
                </span>
              </div>
              <div style={{ fontSize: '1.35rem' }}>
                {renderMoneyParts(kpis.cashBank || totalCollectedCash)}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? 'نقدية سائلة جاهزة للصرف التشغيلي' : 'Immediately deployable operating cash'}
              </span>
            </div>

            {/* Pillar 2: Safe Vault PDCs */}
            <div style={{
              background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 20, 32, 0.75) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderTop: '2px solid #38bdf8',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#7dd3fc', fontWeight: 700 }}>
                  {isAr ? 'شيكات الخزينة الحديدية (حساب ١٠٤٠٠٠)' : 'Safe Vault PDCs (104000)'}
                </span>
                <span style={{ fontSize: '0.64rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                  {isAr ? 'بالخزينة' : 'In Vault'}
                </span>
              </div>
              <div style={{ fontSize: '1.35rem' }}>
                {renderMoneyParts(totalSafePDCs)}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? 'شيكات مودعة بالخزينة لحين تاريخ الاستحقاق' : 'Cheques held in safe awaiting due dates'}
              </span>
            </div>

            {/* Pillar 3: Receivables */}
            <div style={{
              background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, rgba(15, 20, 32, 0.75) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderTop: '2px solid #d4af37',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#fcd34d', fontWeight: 700 }}>
                  {isAr ? 'مستحقات تعاقدية قادمة (مدينو عقود ١٠٣٠٠٠)' : 'Contract Receivables (103000)'}
                </span>
                <span style={{ fontSize: '0.64rem', color: '#d4af37', background: 'rgba(212, 175, 55, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                  {isAr ? 'أقساط مجدولة' : 'Pipeline'}
                </span>
              </div>
              <div style={{ fontSize: '1.35rem' }}>
                {renderMoneyParts(Math.max(0, parseFloat(totalGrossContractValue) - parseFloat(totalCollectedCash)).toString())}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? 'أقساط تعاقدية مستحقة التحصيل مستقبلاً' : 'Scheduled future installment inflows'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WIP CAPITALIZATION & RSV COST RELIEF                               */}
      {/* ========================================================================= */}
      {activeStudioTab === 'wip' && (
        <div key="wip" className="studio-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* WIP Cost Allocation Ring */}
            <div style={{
              background: 'linear-gradient(180deg, rgba(20, 26, 42, 0.75) 0%, rgba(12, 16, 26, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderTop: '2.5px solid #d4af37',
              borderRadius: '16px',
              padding: '1.35rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#e2c974', marginBottom: '0.25rem' }}>
                <PieIcon size={17} />
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                  {isAr ? 'توزيع تكاليف الإنشاء المتكبدة (WIP Accounts)' : 'WIP Cost Element Distribution'}
                </h4>
              </div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                {isAr ? 'توزيع التكاليف المباشرة بين الأراضي، الأعمال المدنية، الكهروميكانيك، والتشطيبات' : 'Capitalized project assets across Land, Civil, MEP & Finishing'}
              </p>

              <RSVAllocationRing 
                wipAccounts={wipAccounts}
                totalWip={kpis.totalWip}
                totalSalesValue={totalGrossContractValue}
                isAr={isAr}
              />
            </div>

            {/* Active RSV Projects Overview */}
            <div style={{
              background: 'linear-gradient(180deg, rgba(20, 26, 42, 0.75) 0%, rgba(12, 16, 26, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderTop: '2.5px solid #38bdf8',
              borderRadius: '16px',
              padding: '1.35rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#7dd3fc' }}>
                    <Calculator size={17} />
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                      {isAr ? 'معاملات الرسملة المعتمدة للمشاريع (RSV Factors)' : 'Audited Project RSV Allocations'}
                    </h4>
                  </div>
                  <span style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#7dd3fc',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    {costAllocations.length} {isAr ? 'مشروعات' : 'Projects'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                  {isAr 
                    ? 'المعامل المعتمد لاستنزال تكلفة البضاعة المباعة (COGS 501000) من حساب (WIP 105000) فور تسليم كل وحدة' 
                    : 'Audited RSV ratios used to relieve WIP into COGS upon physical unit delivery'}
                </p>
              </div>

              {/* Projects List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {costAllocations.slice(0, 3).map(ca => {
                  const grossMarginPct = D(1).minus(ca.rsv_factor || '0').times(100).toFixed(1);
                  return (
                    <div
                      key={ca.allocation_id}
                      onClick={() => onInspectRSV(ca)}
                      style={{
                        background: 'rgba(0, 0, 0, 0.45)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '12px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div>
                        <strong style={{ color: '#ffffff', fontSize: '0.85rem', display: 'block' }}>{ca.project_name}</strong>
                        <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                          WIP: <span style={{ color: '#e2c974', fontWeight: 700 }}>{D(ca.total_incurred_wip).formatEGP(isAr)}</span>
                        </span>
                      </div>
                      <div style={{ textAlign: isAr ? 'left' : 'right', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div>
                          <span style={{ color: '#e2c974', fontWeight: 900, fontSize: '1.05rem', fontFamily: 'monospace', display: 'block', lineHeight: 1.1 }}>
                            {ca.rsv_factor}
                          </span>
                          <span style={{ color: '#10b981', fontSize: '0.68rem', fontWeight: 700 }}>
                            {grossMarginPct}% {isAr ? 'هامش ربح' : 'margin'}
                          </span>
                        </div>
                        <button
                          type="button"
                          style={{
                            background: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid rgba(212, 175, 55, 0.25)',
                            color: '#e2c974',
                            borderRadius: '6px',
                            padding: '0.35rem 0.55rem',
                            fontSize: '0.68rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SALES PIPELINE & TRANCHE LIFECYCLE                                 */}
      {/* ========================================================================= */}
      {activeStudioTab === 'sales' && (
        <div key="sales" className="studio-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            background: 'linear-gradient(180deg, rgba(20, 26, 42, 0.75) 0%, rgba(12, 16, 26, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderTop: '2.5px solid #d4af37',
            borderRadius: '16px',
            padding: '1.35rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#e2c974', marginBottom: '0.25rem' }}>
              <BarChart3 size={17} />
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                {isAr ? 'دورة حياة أقساط العقود والتدفقات النقدية' : 'Tranche Maturity & Cash Collection Pipeline'}
              </h4>
            </div>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.72rem', color: '#94a3b8' }}>
              {isAr ? 'مقارنة حجم الأقساط المحصلة والمسددة مقابل الجارية والمستبدلة عبر عقود البيع' : 'Volume comparison of Settled Cash vs Active Receivables vs Superseded Tranches'}
            </p>

            <TranchePipelineChart 
              trancheStats={trancheStats}
              totalCollectedCash={totalCollectedCash}
              totalGrossContractValue={totalGrossContractValue}
              isAr={isAr}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PARTNER EQUITY & CAPITAL CONTRIBUTIONS                            */}
      {/* ========================================================================= */}
      {activeStudioTab === 'partners' && (
        <div key="partners" className="studio-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <PartnerCapitalCards 
            partnerCalls={partnerCalls}
            totalWipIncurred={totalWipIncurred}
            onInjectCapital={onInjectCapital}
            isAr={isAr}
            registeredPartners={registeredPartners}
          />
        </div>
      )}
    </div>
  );
};
