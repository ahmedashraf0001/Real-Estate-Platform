'use client';

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Search, 
  LayoutGrid, 
  List, 
  Eye, 
  Scale, 
  Building,
  Plus
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { StatusBadge } from '@/components/erp/StatusBadge';
import { MoneyCell } from '@/components/erp/MoneyCell';
import styles from '../ZFWorkstationShell.module.css';

interface ContractsRegistryViewProps {
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  isAr?: boolean;
  onInspectContract: (contract: ERPContract) => void;
  onNavigateToProperties: () => void;
  onOpenNewContract?: () => void;
}

export const ContractsRegistryView: React.FC<ContractsRegistryViewProps> = ({
  contracts,
  schedules,
  isAr = true,
  onInspectContract,
  onNavigateToProperties,
  onOpenNewContract
}) => {
  const [contractFilter, setContractFilter] = useState<'All' | 'Delivered' | 'Pending' | 'Rescinded'>('All');
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [contractViewMode, setContractViewMode] = useState<'cards' | 'table'>('cards');

  // Calculate Contracts Portfolio KPIs
  const contractKPIs = useMemo(() => {
    let grossTotal = D(0);
    let collectedTotal = D(0);
    let activeCnt = 0;
    let deliveredCnt = 0;
    let pendingCnt = 0;
    let rescindedCnt = 0;

    contracts.forEach(c => {
      if (c.status === 'Rescinded') {
        rescindedCnt++;
        return;
      }
      activeCnt++;
      grossTotal = grossTotal.plus(c.gross_contract_value || '0');
      collectedTotal = collectedTotal.plus(c.total_cash_collected || '0');

      if (c.handover_status === 'Delivered') {
        deliveredCnt++;
      } else {
        pendingCnt++;
      }
    });

    const remainingTotal = grossTotal.minus(collectedTotal).isNegative() ? D(0) : grossTotal.minus(collectedTotal);
    const avgCollectionPct = grossTotal.gt(0) 
      ? Math.round(collectedTotal.dividedBy(grossTotal).times(100).toNumber()) 
      : 0;

    return {
      totalGross: grossTotal.toFixed(2),
      totalCollected: collectedTotal.toFixed(2),
      totalRemaining: remainingTotal.toFixed(2),
      avgCollectionPct,
      totalCount: contracts.length,
      activeCount: activeCnt,
      deliveredCount: deliveredCnt,
      pendingCount: pendingCnt,
      rescindedCount: rescindedCnt
    };
  }, [contracts]);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      // 1. Status Filter
      if (contractFilter === 'All' && c.status === 'Rescinded') return false;
      if (contractFilter === 'Delivered' && (c.status === 'Rescinded' || c.handover_status !== 'Delivered')) return false;
      if (contractFilter === 'Pending' && (c.status === 'Rescinded' || c.handover_status === 'Delivered')) return false;
      if (contractFilter === 'Rescinded' && c.status !== 'Rescinded') return false;

      // 2. Search Query
      if (contractSearchQuery.trim()) {
        const q = contractSearchQuery.toLowerCase();
        const num = (c.contract_number || '').toLowerCase();
        const buyer = (c.buyer_name || '').toLowerCase();
        const unit = (c.unit_id || '').toLowerCase();
        return num.includes(q) || buyer.includes(q) || unit.includes(q);
      }

      return true;
    });
  }, [contracts, contractFilter, contractSearchQuery]);

  return (
    <div className={styles.stageContainer}>
      {/* 1. STAGE HEADER & ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {isAr ? 'سجل عقود البيع وتتبع إصدارات الأقساط' : 'Sales Contracts & Installment Pipeline'}
            </h1>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.18rem 0.55rem',
              borderRadius: '6px',
              background: 'rgba(184, 144, 62, 0.09)',
              border: '1px solid rgba(184, 144, 62, 0.28)',
              color: '#946f23'
            }}>
              {isAr ? 'إدارة المبيعات والتعاقدات' : 'Contract Escrow'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'المتابعة المركزية لكافة عقود البيع الموثقة، خطط التقسيط، نسب التحصيل الفعلي، وحالة تسليم الوحدات (IFRS 15)' 
              : 'Centralized registry of booked sales contracts, installment schedules, cash collection, and unit handovers'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className={styles.btnSecondary}
            onClick={onNavigateToProperties}
            title={isAr ? 'الانتقال إلى الموقف المالي للعقارات لتحرير عقد جديد لوحدة' : 'Go to Property Portfolio to originate a contract'}
          >
            <Building size={14} color="#946f23" />
            <span>{isAr ? 'تحرير عقد لوحدة (عبر المحفظة)' : 'Originate Contract'}</span>
          </button>

          {onOpenNewContract && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onOpenNewContract}
            >
              <Plus size={14} />
              <span>{isAr ? 'عقد بيع جديد' : 'New Contract'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THE 4 EXECUTIVE CONTRACT KPI CARDS (Apple / Mercury Elegance) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {/* KPI 1: Gross Portfolio Sales (V) */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              {isAr ? 'إجمالي المبيعات التعاقدية (V)' : 'Gross Contract Value (V)'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {D(contractKPIs.totalGross).formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'محفظة العقود السارية' : 'Active Contracts'}</span>
            <strong style={{ color: '#0f172a' }}>{contractKPIs.activeCount} {isAr ? 'عقد موثق' : 'contracts'}</strong>
          </div>
        </div>

        {/* KPI 2: Cash Collected (C) */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              {isAr ? 'السيولة المحصلة بالبنك (C)' : 'Total Cash Collected (C)'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#15803d', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#15803d', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {D(contractKPIs.totalCollected).formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'تحصيلات نقدية مودعة' : 'Collected Cash'}</span>
            <strong style={{ color: '#15803d' }}>{isAr ? 'حسابات البنوك [102000]' : 'GL Bank 102000'}</strong>
          </div>
        </div>

        {/* KPI 3: Outstanding Receivables (A/R) */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              {isAr ? 'أوراق القبض والذمم المدينة (A/R)' : 'Outstanding Receivables (A/R)'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#946f23', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {D(contractKPIs.totalRemaining).formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'متبقي أقساط قيد التحصيل' : 'Pending Installments'}</span>
            <strong style={{ color: '#946f23' }}>{contractKPIs.pendingCount} {isAr ? 'عقد قيد السداد' : 'in progress'}</strong>
          </div>
        </div>

        {/* KPI 4: Collection Rate — Premier Gold Accent */}
        <div className={styles.card} style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fefdfa 100%)',
          border: '1px solid rgba(184, 144, 62, 0.35)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 4px 16px -4px rgba(184, 144, 62, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#946f23' }}>
              {isAr ? 'متوسط نسبة التحصيل العام' : 'Portfolio Collection Rate'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#b8903e', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {contractKPIs.avgCollectionPct}%
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid rgba(184, 144, 62, 0.18)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'المسلم / قيد الإنشاء' : 'Delivered / WIP'}</span>
            <strong style={{ color: '#946f23' }}>{contractKPIs.deliveredCount} {isAr ? 'مسلم' : 'handed over'}</strong>
          </div>
        </div>
      </div>

      {/* 3. FILTER TOOLBAR & VIEW SWITCHER */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '0.85rem 1.15rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', flex: 1 }}>
          {/* Status Tabs */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '2px'
          }}>
            {(['All', 'Delivered', 'Pending', 'Rescinded'] as const).map(f => {
              const count = f === 'All' ? contractKPIs.activeCount :
                            f === 'Delivered' ? contractKPIs.deliveredCount :
                            f === 'Pending' ? contractKPIs.pendingCount :
                            contractKPIs.rescindedCount;
              const isActive = contractFilter === f;

              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setContractFilter(f)}
                  style={{
                    background: isActive ? (f === 'Rescinded' ? '#dc2626' : '#0f172a') : 'transparent',
                    color: isActive ? '#ffffff' : '#64748b',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>
                    {f === 'All' && (isAr ? 'السارية (الكل)' : 'Active Pipeline')}
                    {f === 'Delivered' && (isAr ? 'مسلّم' : 'Delivered')}
                    {f === 'Pending' && (isAr ? 'قيد الإنشاء' : 'Under Construction')}
                    {f === 'Rescinded' && (isAr ? 'عقود مفسوخة' : 'Rescinded')}
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '0.05rem 0.35rem',
                    borderRadius: '999px',
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#475569'
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Instant Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            minWidth: '220px',
            maxWidth: '360px',
            flex: '1 1 auto'
          }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              value={contractSearchQuery}
              onChange={(e) => setContractSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث برقم العقد، اسم العميل، أو الوحدة...' : 'Search contract #, buyer, or unit...'}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#0f172a',
                fontSize: '0.76rem',
                outline: 'none'
              }}
            />
            {contractSearchQuery && (
              <button
                type="button"
                onClick={() => setContractSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '2px'
        }}>
          <button 
            type="button"
            onClick={() => setContractViewMode('cards')}
            title={isAr ? 'عرض بطاقات تنفيذية' : 'Cards View'}
            style={{
              background: contractViewMode === 'cards' ? '#ffffff' : 'transparent',
              color: contractViewMode === 'cards' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.55rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: contractViewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <LayoutGrid size={14} />
          </button>
          <button 
            type="button"
            onClick={() => setContractViewMode('table')}
            title={isAr ? 'عرض جدول تفصيلي' : 'Table View'}
            style={{
              background: contractViewMode === 'table' ? '#ffffff' : 'transparent',
              color: contractViewMode === 'table' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.55rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: contractViewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* 4. EMPTY STATE */}
      {filteredContracts.length === 0 && (
        <div style={{
          padding: '3.5rem 2rem',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px dashed #cbd5e1'
        }}>
          <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            {isAr ? 'لا توجد عقود مطابقة لشروط التصفية' : 'No matching contracts found'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
            {isAr ? 'جرب تغيير التبويب أو مسح عبارة البحث.' : 'Try changing the status tab or clearing the search box.'}
          </div>
          {contractSearchQuery && (
            <button
              type="button"
              onClick={() => setContractSearchQuery('')}
              className={styles.btnSecondary}
              style={{ marginTop: '1rem' }}
            >
              {isAr ? 'مسح البحث' : 'Clear search'}
            </button>
          )}
        </div>
      )}

      {/* 5. VIEW MODE 1: EXECUTIVE CARDS */}
      {contractViewMode === 'cards' && filteredContracts.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredContracts.map(c => {
            const contractSchedules = schedules.filter(s => s.contract_id === c.contract_id && s.status !== 'SUPERSEDED');
            const pendingSchedules = contractSchedules.filter(s => s.status === 'Pending');
            
            const gross = D(c.gross_contract_value || '0');
            const collected = D(c.total_cash_collected || '0');
            const remaining = gross.minus(collected).isNegative() ? '0.00' : gross.minus(collected).toFixed(2);
            const progress = gross.isZero() ? 0 : Math.min(100, Math.max(0, collected.div(gross).times(100).toNumber()));
            const isFullyPaid = collected.greaterThanOrEqual(gross) && !gross.isZero();

            return (
              <div 
                key={c.contract_id}
                onClick={() => onInspectContract(c)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header Row: Contract #, Unit, Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#946f23', fontSize: '0.88rem' }} dir="ltr">
                        #{c.contract_number}
                      </span>
                      <StatusBadge domain="unit" status={c.handover_status} isAr={isAr} />
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                      {c.buyer_name}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '6px'
                  }}>
                    {c.unit_id}
                  </div>
                </div>

                {/* Financial Escrow Breakdown */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}>
                  <div style={{
                    fontSize: '0.65rem',
                    color: '#64748b',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    paddingBottom: '0.25rem',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <Scale size={11} color="#946f23" />
                    <span>{isAr ? 'الذمة المالية للتعاقد والتحصيل' : 'CONTRACT ESCROW'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'قيمة التعاقد (V):' : 'Gross Value (V):'}</span>
                    <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {D(c.gross_contract_value || '0').formatEGP(isAr)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                    <span style={{ color: '#15803d' }}>{isAr ? 'المحصل بالبنك (C):' : 'Collected (C):'}</span>
                    <strong style={{ color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                      {D(c.total_cash_collected || '0').formatEGP(isAr)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.35rem' }}>
                    <span style={{ color: isFullyPaid ? '#15803d' : '#d97706' }}>{isAr ? 'المتبقي كأقساط (A/R):' : 'Remaining (A/R):'}</span>
                    <strong style={{ color: isFullyPaid ? '#15803d' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {D(remaining).formatEGP(isAr)}
                    </strong>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#64748b' }}>{isAr ? 'نسبة التحصيل التعاقدي:' : 'Collection Rate:'}</span>
                    <strong style={{ color: isFullyPaid ? '#15803d' : '#946f23' }}>{progress.toFixed(1)}%</strong>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: isFullyPaid ? '#15803d' : 'linear-gradient(90deg, #c5a059, #15803d)',
                      borderRadius: '999px'
                    }} />
                  </div>
                </div>

                {/* Footer: Tranches hint & Inspect link */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  {isFullyPaid ? (
                    <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={12} /> {isAr ? 'مسدد بالكامل' : 'Paid in full'}
                    </span>
                  ) : (
                    <span style={{ color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> {pendingSchedules.length} {isAr ? 'أقساط قيد السداد' : 'pending tranches'}
                    </span>
                  )}

                  <span style={{ color: '#946f23', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Eye size={12} /> {isAr ? 'فحص العقد' : 'Inspect'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. VIEW MODE 2: DENSE ACCOUNTING TABLE */}
      {contractViewMode === 'table' && filteredContracts.length > 0 && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: isAr ? 'right' : 'left' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'رقم العقد' : 'Contract #'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'الوحدة' : 'Unit ID'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'العميل / المشتري' : 'Buyer'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'قيمة العقد (V)' : 'Gross (V)'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'المحصل (C)' : 'Collected (C)'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'المتبقي (A/R)' : 'Remaining (A/R)'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'نسبة التحصيل' : 'Progress'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'التسليم' : 'Handover'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map(c => {
                  const gross = D(c.gross_contract_value || '0');
                  const collected = D(c.total_cash_collected || '0');
                  const remaining = gross.minus(collected).isNegative() ? '0.00' : gross.minus(collected).toFixed(2);
                  const progress = gross.isZero() ? 0 : Math.min(100, Math.max(0, collected.div(gross).times(100).toNumber()));
                  const isFullyPaid = collected.greaterThanOrEqual(gross) && !gross.isZero();

                  return (
                    <tr 
                      key={c.contract_id} 
                      onClick={() => onInspectContract(c)} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fdfbf7')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#946f23' }} dir="ltr">
                        #{c.contract_number}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{c.unit_id}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontWeight: 600 }}>{c.buyer_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><MoneyCell amount={c.gross_contract_value} isAr={isAr} highlight /></td>
                      <td style={{ padding: '0.75rem 1rem' }}><MoneyCell amount={c.total_cash_collected} isAr={isAr} /></td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ color: isFullyPaid ? '#15803d' : '#d97706', fontWeight: 600 }}>
                          <MoneyCell amount={remaining} isAr={isAr} />
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '45px', height: '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: isFullyPaid ? '#15803d' : '#946f23' }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isFullyPaid ? '#15803d' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}><StatusBadge domain="unit" status={c.handover_status} isAr={isAr} /></td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.74rem' }}>{c.contract_date}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectContract(c);
                          }}
                          style={{
                            background: 'rgba(184, 144, 62, 0.08)',
                            border: '1px solid rgba(184, 144, 62, 0.25)',
                            color: '#946f23',
                            borderRadius: '6px',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={12} />
                          <span>{isAr ? 'فحص' : 'View'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
