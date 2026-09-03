'use client';

import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { ERPPDCRecord, ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import styles from '../ZFWorkstationShell.module.css';

interface HandInstallmentsVaultViewProps {
  pdcRecords: ERPPDCRecord[];
  contracts: ERPContract[];
  isAr?: boolean;
  isMutating?: boolean;
  onCollectItem: (item: ERPPDCRecord) => void;
  onCollectDueToday: () => void;
  onOpenNewCheque: () => void;
  onInspectCheque: (item: ERPPDCRecord) => void;
}

export const HandInstallmentsVaultView: React.FC<HandInstallmentsVaultViewProps> = ({
  pdcRecords,
  contracts,
  isAr = true,
  isMutating = false,
  onCollectItem,
  onCollectDueToday,
  onOpenNewCheque,
  onInspectCheque
}) => {
  const [chequeMaturityFilter, setChequeMaturityFilter] = useState<'all' | 'due_now' | 'due_30'>('all');
  const [chequeSearchQuery, setChequeSearchQuery] = useState('');
  const [chequeViewMode, setChequeViewMode] = useState<'cards' | 'table'>('cards');

  // Vault KPIs
  const vaultKPIs = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const weekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    let dueTodaySum = D(0);
    let dueTodayCount = 0;
    let dueWeekSum = D(0);
    let dueWeekCount = 0;
    let clearedSum = D(0);
    let clearedCount = 0;
    let totalSum = D(0);

    pdcRecords.forEach(p => {
      const val = D(p.nominal_value || '0');
      totalSum = totalSum.plus(val);

      if (p.status === 'Cleared') {
        clearedSum = clearedSum.plus(val);
        clearedCount++;
      } else if (p.status !== 'Bounced') {
        if (p.due_date <= todayStr) {
          dueTodaySum = dueTodaySum.plus(val);
          dueTodayCount++;
        } else if (p.due_date <= weekStr) {
          dueWeekSum = dueWeekSum.plus(val);
          dueWeekCount++;
        }
      }
    });

    return {
      dueTodaySum,
      dueTodayCount,
      dueWeekSum,
      dueWeekCount,
      clearedSum,
      clearedCount,
      totalSum,
      totalCount: pdcRecords.length
    };
  }, [pdcRecords]);

  // Filtered Cheques / Hand Dues
  const filteredCheques = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    return pdcRecords.filter(p => {
      // 1. Maturity Filter
      if (chequeMaturityFilter === 'due_now') {
        if (p.status === 'Cleared' || p.status === 'Bounced' || p.due_date > todayStr) return false;
      } else if (chequeMaturityFilter === 'due_30') {
        if (p.status === 'Cleared' || p.status === 'Bounced' || p.due_date > thirtyDaysStr) return false;
      }

      // 2. Search Query
      if (chequeSearchQuery.trim()) {
        const q = chequeSearchQuery.toLowerCase();
        const code = (p.cheque_number || '').toLowerCase();
        const client = (p.drawer_name || '').toLowerCase();
        const linked = contracts.find(c => c.contract_id === p.contract_id);
        const contractNum = (linked?.contract_number || '').toLowerCase();
        const unit = (linked?.unit_id || '').toLowerCase();

        return code.includes(q) || client.includes(q) || contractNum.includes(q) || unit.includes(q);
      }

      return true;
    });
  }, [pdcRecords, contracts, chequeMaturityFilter, chequeSearchQuery]);

  return (
    <div className={styles.stageContainer}>
      {/* 1. STAGE HEADER & ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {isAr ? 'حافظة بنود التحصيل والأقساط المستحقة باليد' : 'Hand Installments & Cash Dues Vault'}
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
              {isAr ? 'خزينة أوراق القبض' : 'Cash Receivables'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'متابعة وجدولة استحقاقات الأقساط النقدية باليد، سندات التحصيل، والإيداع الفوري بالخزينة'
              : 'Tracking hand-collected installments, payment dues aging, and instant safe deposits'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className={styles.btnSecondary}
            onClick={onCollectDueToday}
            disabled={isMutating || vaultKPIs.dueTodayCount === 0}
            title={isAr ? 'تحصيل كافة الأقساط المستحقة اليوم باليد دفعة واحدة' : 'Batch collect today dues'}
          >
            <Wallet size={14} color="#059669" />
            <span>{isAr ? `تحصيل مستحقات اليوم (${vaultKPIs.dueTodayCount})` : `Collect Today (${vaultKPIs.dueTodayCount})`}</span>
          </button>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={onOpenNewCheque}
          >
            <Plus size={14} />
            <span>{isAr ? 'تسجيل قسط / استحقاق جديد' : 'New Installment'}</span>
          </button>
        </div>
      </div>

      {/* 2. THE 4 EXECUTIVE VAULT KPI CARDS (Apple / Mercury Elegance) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Urgent Overdue / Due Today — Elevated Egyptian Gold */}
        <div className={styles.card} style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fefdfa 100%)',
          border: '1px solid rgba(132, 106, 44, 0.35)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 4px 16px -4px rgba(132, 106, 44, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#846a2c' }}>
              {isAr ? 'المستحق اليوم والمتأخرات باليد' : 'Due Today & Overdue'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#846a2c', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#846a2c', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {vaultKPIs.dueTodaySum.formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid rgba(132, 106, 44, 0.18)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'جاهزة للتحصيل فوراً' : 'Ready to collect'}</span>
            <strong style={{ color: '#846a2c' }}>{vaultKPIs.dueTodayCount} {isAr ? 'أقساط مستحقة' : 'items'}</strong>
          </div>
        </div>

        {/* Card 2: Due This Week */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              {isAr ? 'تحصيلات الأسبوع الجاري' : 'Due This Week'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#946f23', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {vaultKPIs.dueWeekSum.formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'استحقاقات قريبة (خلال ٧ أيام)' : 'Next 7 days'}</span>
            <strong style={{ color: '#946f23' }}>{vaultKPIs.dueWeekCount} {isAr ? 'بنود' : 'items'}</strong>
          </div>
        </div>

        {/* Card 3: Cleared in Safe */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              {isAr ? 'المحصل بالخزينة [101000]' : 'Collected in Safe'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#15803d', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#15803d', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {vaultKPIs.clearedSum.formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'مسدد ومودع بالخزينة' : 'Cleared Cash'}</span>
            <strong style={{ color: '#15803d' }}>{vaultKPIs.clearedCount} {isAr ? 'بند مسدد' : 'cleared'}</strong>
          </div>
        </div>

        {/* Card 4: Total Vault Portfolio */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              {isAr ? 'إجمالي محفظة الأقساط' : 'Total Hand Vault Value'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.25rem 0' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {vaultKPIs.totalSum.formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{isAr ? 'إجمالي عدد البنود المسجلة' : 'Total Recorded Items'}</span>
            <strong style={{ color: '#0f172a' }}>{vaultKPIs.totalCount} {isAr ? 'بند' : 'items'}</strong>
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
          {/* Maturity Filter Tabs */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button
              type="button"
              onClick={() => setChequeMaturityFilter('all')}
              style={{
                background: chequeMaturityFilter === 'all' ? '#0f172a' : 'transparent',
                color: chequeMaturityFilter === 'all' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isAr ? 'كافة التواريخ' : 'All Dates'}
            </button>
            <button
              type="button"
              onClick={() => setChequeMaturityFilter('due_now')}
              style={{
                background: chequeMaturityFilter === 'due_now' ? '#946f23' : 'transparent',
                color: chequeMaturityFilter === 'due_now' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isAr ? `مستحق اليوم أو متأخر (${vaultKPIs.dueTodayCount})` : `Due / Overdue (${vaultKPIs.dueTodayCount})`}
            </button>
            <button
              type="button"
              onClick={() => setChequeMaturityFilter('due_30')}
              style={{
                background: chequeMaturityFilter === 'due_30' ? '#946f23' : 'transparent',
                color: chequeMaturityFilter === 'due_30' ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isAr ? 'يستحق خلال ٣٠ يوم' : 'Next 30 Days'}
            </button>
          </div>

          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            minWidth: '240px',
            maxWidth: '380px',
            flex: '1 1 auto'
          }}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              value={chequeSearchQuery}
              onChange={e => setChequeSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بكود البند، اسم العميل، أو رقم العقد...' : 'Search item code, client, or contract...'}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#0f172a',
                fontSize: '0.76rem',
                outline: 'none'
              }}
            />
            {chequeSearchQuery && (
              <button
                type="button"
                onClick={() => setChequeSearchQuery('')}
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
            onClick={() => setChequeViewMode('cards')}
            title={isAr ? 'عرض بطاقات السندات والأقساط' : 'Cards view'}
            style={{
              background: chequeViewMode === 'cards' ? '#ffffff' : 'transparent',
              color: chequeViewMode === 'cards' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.55rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: chequeViewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <LayoutGrid size={14} />
          </button>
          <button 
            type="button"
            onClick={() => setChequeViewMode('table')}
            title={isAr ? 'عرض جدول محاسبي تفصيلي' : 'Table view'}
            style={{
              background: chequeViewMode === 'table' ? '#ffffff' : 'transparent',
              color: chequeViewMode === 'table' ? '#0f172a' : '#64748b',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.55rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: chequeViewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* 4. EMPTY STATE */}
      {filteredCheques.length === 0 && (
        <div style={{
          padding: '3.5rem 2rem',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px dashed #cbd5e1'
        }}>
          <Wallet size={36} color="#946f23" style={{ margin: '0 auto 0.75rem auto' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            {isAr ? 'لا توجد بنود أو أقساط مطابقة' : 'No matching installment items found'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
            {isAr ? 'جرب تغيير شرط التصفية أو تفريغ خانة البحث.' : 'Try changing the filter or clearing the search box.'}
          </div>
          {chequeSearchQuery && (
            <button
              type="button"
              onClick={() => setChequeSearchQuery('')}
              className={styles.btnSecondary}
              style={{ marginTop: '1rem' }}
            >
              {isAr ? 'مسح البحث' : 'Clear search'}
            </button>
          )}
        </div>
      )}

      {/* 5. VIEW MODE 1: EXECUTIVE CARDS */}
      {chequeViewMode === 'cards' && filteredCheques.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredCheques.map(pdc => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isOverdue = pdc.status !== 'Cleared' && pdc.due_date < todayStr;
            const isDueToday = pdc.status !== 'Cleared' && pdc.due_date === todayStr;
            const isCollected = pdc.status === 'Cleared';
            const linkedContract = contracts.find(c => c.contract_id === pdc.contract_id);

            return (
              <div 
                key={pdc.cheque_id}
                onClick={() => onInspectCheque(pdc)}
                style={{
                  background: '#ffffff',
                  border: isDueToday || isOverdue ? '1px solid rgba(184, 144, 62, 0.4)' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header: Item Code & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#946f23', fontSize: '0.88rem' }} dir="ltr">
                      #{pdc.cheque_number}
                    </span>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                      {pdc.drawer_name}
                    </div>
                  </div>

                  <span style={{
                    padding: '0.22rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    background: isCollected ? '#f0fdf4' : isOverdue ? '#fef2f2' : 'rgba(184, 144, 62, 0.08)',
                    color: isCollected ? '#15803d' : isOverdue ? '#dc2626' : '#946f23',
                    border: isCollected ? '1px solid rgba(22, 163, 74, 0.25)' : isOverdue ? '1px solid rgba(220, 38, 38, 0.25)' : '1px solid rgba(184, 144, 62, 0.25)'
                  }}>
                    {isCollected ? (isAr ? 'تم التحصيل' : 'Cleared') : isOverdue ? (isAr ? 'متأخر' : 'Overdue') : (isAr ? 'قيد التحصيل' : 'Pending')}
                  </span>
                </div>

                {/* Amount & Due Date Box */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'قيمة القسط المطلوب:' : 'Due Amount:'}
                    </span>
                    <strong style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {D(pdc.nominal_value).formatEGP(isAr)}
                    </strong>
                  </div>

                  <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'تاريخ الاستحقاق:' : 'Due Date:'}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isOverdue ? '#dc2626' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {pdc.due_date}
                    </span>
                  </div>
                </div>

                {/* Contract Link */}
                {linkedContract && (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>{isAr ? 'عقد:' : 'Contract:'}</span>
                    <strong style={{ color: '#0f172a' }}>{linkedContract.contract_number}</strong>
                    <span>•</span>
                    <span style={{ color: '#946f23' }}>{linkedContract.unit_id}</span>
                  </div>
                )}

                {/* Action Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem', marginTop: 'auto' }}>
                  {!isCollected ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCollectItem(pdc);
                      }}
                      disabled={isMutating}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                        color: '#ffffff',
                        border: '1px solid #947228',
                        borderRadius: '8px',
                        padding: '0.45rem',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(184, 144, 62, 0.25)'
                      }}
                    >
                      <Wallet size={13} />
                      <span>{isAr ? 'تحصيل البند نقداً باليد' : 'Collect Cash by Hand'}</span>
                    </button>
                  ) : (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem',
                      borderRadius: '8px',
                      background: '#ecfdf5',
                      color: '#065f46',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      border: '1px solid #a7f3d0'
                    }}>
                      <CheckCircle2 size={13} />
                      <span>{isAr ? 'مورد بالخزينة [101000]' : 'In Safe [101000]'}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectCheque(pdc);
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      color: '#475569',
                      borderRadius: '8px',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={isAr ? 'عرض التفاصيل' : 'Inspect details'}
                  >
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. VIEW MODE 2: DENSE ACCOUNTING TABLE */}
      {chequeViewMode === 'table' && filteredCheques.length > 0 && (
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
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'كود البند' : 'Item Code'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'العميل الملتزم بالسداد' : 'Client / Payer'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'العقد والوحدة' : 'Contract & Unit'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'قيمة القسط المطلوبة' : 'Installment Value'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'تاريخ الاستحقاق' : 'Due Date & Aging'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isAr ? 'حالة التحصيل' : 'Status'}</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheques.map(pdc => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isOverdue = pdc.status !== 'Cleared' && pdc.due_date < todayStr;
                  const isCollected = pdc.status === 'Cleared';
                  const linkedContract = contracts.find(c => c.contract_id === pdc.contract_id);

                  return (
                    <tr 
                      key={pdc.cheque_id} 
                      onClick={() => onInspectCheque(pdc)} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fdfbf7')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#946f23' }}>
                        #{pdc.cheque_number}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {pdc.drawer_name}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {linkedContract ? (
                          <div>
                            <span style={{ color: '#946f23', fontWeight: 700, fontSize: '0.78rem' }}>{linkedContract.contract_number}</span>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{linkedContract.unit_id}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <MoneyCell amount={pdc.nominal_value} isAr={isAr} highlight />
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: isOverdue ? '#dc2626' : '#0f172a' }}>
                          {pdc.due_date}
                        </div>
                        {isOverdue && (
                          <span style={{ color: '#dc2626', fontSize: '0.68rem', fontWeight: 800 }}>
                            {isAr ? 'متأخر' : 'Overdue'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isCollected ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid rgba(22, 163, 74, 0.25)',
                            fontSize: '0.7rem',
                            fontWeight: 800
                          }}>
                            <CheckCircle2 size={11} /> {isAr ? 'تم التحصيل' : 'Collected'}
                          </span>
                        ) : isOverdue ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            fontSize: '0.7rem',
                            fontWeight: 800
                          }}>
                            <AlertTriangle size={11} /> {isAr ? 'متأخر' : 'Overdue'}
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            background: 'rgba(184, 144, 62, 0.08)',
                            color: '#946f23',
                            border: '1px solid rgba(184, 144, 62, 0.25)',
                            fontSize: '0.7rem',
                            fontWeight: 800
                          }}>
                            <Clock size={11} /> {isAr ? 'مستحق لاحقاً' : 'Due Later'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {!isCollected ? (
                            <button
                              type="button"
                              onClick={() => onCollectItem(pdc)}
                              disabled={isMutating}
                              style={{
                                background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                                border: '1px solid #947228',
                                color: '#ffffff',
                                padding: '0.3rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Wallet size={12} />
                              <span>{isAr ? 'تحصيل نقداً' : 'Collect'}</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>
                              {isAr ? 'مورد بالخزينة' : 'In Safe'}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => onInspectCheque(pdc)}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              color: '#475569',
                              padding: '0.25rem 0.45rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                            title={isAr ? 'فحص التفاصيل' : 'Inspect'}
                          >
                            <Eye size={12} />
                          </button>
                        </div>
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
