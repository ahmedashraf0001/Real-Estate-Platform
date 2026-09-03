'use client';

import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  Search, 
  LayoutGrid, 
  List, 
  Eye, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { ERPRescissionRecord, ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { StatusBadge } from '@/components/erp/StatusBadge';
import styles from '../ZFWorkstationShell.module.css';

interface ContractRescissionsViewProps {
  rescissions: ERPRescissionRecord[];
  contracts: ERPContract[];
  isAr?: boolean;
  onInspectRescission: (rescission: ERPRescissionRecord) => void;
  onNavigateToContracts: () => void;
}

export const ContractRescissionsView: React.FC<ContractRescissionsViewProps> = ({
  rescissions,
  contracts,
  isAr = true,
  onInspectRescission,
  onNavigateToContracts
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [branchFilter, setBranchFilter] = useState<'all' | 'Pre-Delivery' | 'Post-Delivery'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 4 Executive KPIs
  const kpis = useMemo(() => {
    let totalPenalty = D(0);
    let totalRefund = D(0);
    let totalGrossVoid = D(0);

    rescissions.forEach(r => {
      totalPenalty = totalPenalty.plus(r.penalty_retained || '0');
      totalRefund = totalRefund.plus(r.net_refund_liability || '0');
      totalGrossVoid = totalGrossVoid.plus(r.gross_contract_value || '0');
    });

    return {
      totalPenalty,
      totalRefund,
      totalGrossVoid,
      count: rescissions.length
    };
  }, [rescissions]);

  // Filtered list
  const filteredRescissions = useMemo(() => {
    return rescissions.filter(r => {
      if (branchFilter !== 'all' && r.branch !== branchFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const linked = contracts.find(c => c.contract_id === r.contract_id);
        const buyer = (linked?.buyer_name || '').toLowerCase();
        const unit = (linked?.unit_id || '').toLowerCase();
        const contractNum = (linked?.contract_number || '').toLowerCase();
        const id = (r.rescission_id || '').toLowerCase();
        return buyer.includes(q) || unit.includes(q) || contractNum.includes(q) || id.includes(q);
      }
      return true;
    });
  }, [rescissions, contracts, branchFilter, searchQuery]);

  // Format helper for calm executive KPI typography
  const splitAmount = (dec: any) => {
    const str = dec.formatEGP(isAr);
    const lastSpaceIdx = str.lastIndexOf(' ');
    if (lastSpaceIdx === -1) return { num: str, cur: '' };
    return { num: str.substring(0, lastSpaceIdx), cur: str.substring(lastSpaceIdx + 1) };
  };

  return (
    <div className={styles.stageContainer}>
      {/* 1. Header & Stage Breadcrumb */}
      <div className={styles.stageHeader}>
        <div className={styles.stageTitleArea}>
          <div className={styles.stageBreadcrumb}>
            <span>FIN-OS</span>
            <span>/</span>
            <span>{isAr ? 'فسخ العقود' : 'Contract Rescissions'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle}>
              {isAr ? 'سجل فسخ العقود وتطبيق الحد الأدنى للاسترداد (Forfeiture Floor)' : 'Contract Rescissions & Forfeiture Floor'}
            </h1>
            <span style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#dc2626',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {isAr ? 'تسوية قانونية معتمدة' : 'Audited Legal Settlement'}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isAr 
              ? 'السجل الرسمي لكافة العقود المفسوخة، احتجاز غرامة الـ 10%، تسوية حساب رد العملاء 206200، واسترداد الوحدات للمخزون.' 
              : 'Official registry for rescinded contracts, 10% forfeiture retention, customer refund liability (206200), and unit repossession.'}
          </p>
        </div>

        <div className={styles.stageActions}>
          <button
            onClick={onNavigateToContracts}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
              borderRadius: '10px',
              padding: '0.6rem 1.1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <span>{isAr ? 'العودة لسجل العقود السارية' : 'Back to Active Contracts'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 2. 4 Executive Rescission KPI Cards */}
      <div className={styles.kpiGrid}>
        {/* Card 1: Rescissions Count */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>{isAr ? 'إجمالي العقود المفسوخة' : 'Total Rescissions'}</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RotateCcw size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {kpis.count}
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              {isAr ? 'فسخ قانوني' : 'Legal Rescission'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'وحدات مستردة للمخزون' : 'repossessed'}</span>
          </div>
        </div>

        {/* Card 2: Voided Gross Sales (Gold Card) */}
        <div className={`${styles.kpiCard} ${styles.flagshipCard}`}>
          <div className={styles.kpiHeader}>
            <span className={`${styles.kpiLabel} ${styles.flagshipLabel}`}>
              {isAr ? 'إجمالي المبيعات الملغاة (V)' : 'Voided Sales Value (V)'}
            </span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(184, 144, 62, 0.12)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            <span>{splitAmount(kpis.totalGrossVoid).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.totalGrossVoid).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ background: 'rgba(184, 144, 62, 0.1)', color: '#946f23', borderColor: 'rgba(184, 144, 62, 0.25)' }}>
              {isAr ? 'إعادة طرح' : 'Re-listing'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'أصول استردت لمحفظة الشركة' : 'restored to inventory'}</span>
          </div>
        </div>

        {/* Card 3: Retained Penalty (10%) */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>{isAr ? 'الغرامات المحتجزة للشركة (10%)' : 'Retained Penalties (10%)'}</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(217, 119, 6, 0.08)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            <span>{splitAmount(kpis.totalPenalty).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.totalPenalty).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ background: 'rgba(217, 119, 6, 0.08)', color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.2)' }}>
              {isAr ? 'إيراد قطعي ٤٣٠١٠٠' : 'GL 430100'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'أرباح تعويضية للشركة' : 'retained earnings'}</span>
          </div>
        </div>

        {/* Card 4: Customer Refund Liability */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>{isAr ? 'صافي الرد للعملاء (206200)' : 'Customer Refund Liability'}</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#f0fdf4',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            <span>{splitAmount(kpis.totalRefund).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.totalRefund).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ background: '#f0fdf4', color: '#15803d', borderColor: 'rgba(22, 163, 74, 0.25)' }}>
              {isAr ? 'حسابات ٢٠٦٢٠٠' : 'GL 206200'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'مستحقات عملاء للرد' : 'refundable'}</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Filter Tabs, Search & View Switcher */}
      <div className={styles.toolbar}>
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${branchFilter === 'all' ? styles.tabBtnActive : ''}`}
            onClick={() => setBranchFilter('all')}
          >
            {isAr ? 'كافة المسارات' : 'All Branches'}
          </button>
          <button
            className={`${styles.tabBtn} ${branchFilter === 'Pre-Delivery' ? styles.tabBtnActive : ''}`}
            onClick={() => setBranchFilter('Pre-Delivery')}
          >
            {isAr ? 'المسار ١ (قبل التسليم)' : 'Pre-Delivery'}
          </button>
          <button
            className={`${styles.tabBtn} ${branchFilter === 'Post-Delivery' ? styles.tabBtnActive : ''}`}
            onClick={() => setBranchFilter('Post-Delivery')}
          >
            {isAr ? 'المسار ٢ (بعد التسليم)' : 'Post-Delivery'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className={styles.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث برقم الفسخ، العقد، أو اسم العميل...' : 'Search rescissions...'}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.viewModeGroup}>
            <button
              className={`${styles.viewModeBtn} ${viewMode === 'cards' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setViewMode('cards')}
              title={isAr ? 'عرض البطاقات' : 'Cards'}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`${styles.viewModeBtn} ${viewMode === 'table' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setViewMode('table')}
              title={isAr ? 'عرض الجدول' : 'Table'}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Content: Cards or Dense Table */}
      {filteredRescissions.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <ShieldAlert size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
            {isAr ? 'لا توجد عقود مفسوخة مسجلة مطابقة للبحث' : 'No matching rescinded contracts recorded'}
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
            {isAr ? 'جميع العقود السارية موثقة بحالة منتظمة في الدفاتر المحاسبية.' : 'All registered contracts remain in active status.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={styles.tableCard}>
          <table className={styles.table} style={{ minWidth: '1240px' }}>
            <thead>
              <tr>
                <th style={{ width: '95px', whiteSpace: 'nowrap' }}>{isAr ? 'كود الفسخ' : 'Rescission ID'}</th>
                <th style={{ minWidth: '260px' }}>{isAr ? 'العقد والوحدة' : 'Contract & Unit'}</th>
                <th style={{ minWidth: '160px' }}>{isAr ? 'العميل' : 'Customer'}</th>
                <th style={{ minWidth: '150px' }}>{isAr ? 'المسار' : 'Branch'}</th>
                <th style={{ minWidth: '130px' }}>{isAr ? 'قيمة العقد (V)' : 'Gross (V)'}</th>
                <th style={{ minWidth: '130px' }}>{isAr ? 'المحصل (C)' : 'Collected (C)'}</th>
                <th style={{ minWidth: '140px' }}>{isAr ? 'الغرامة المحتجزة' : 'Penalty Retained'}</th>
                <th style={{ minWidth: '140px' }}>{isAr ? 'صافي الرد (206200)' : 'Net Refund'}</th>
                <th style={{ minWidth: '170px' }}>{isAr ? 'حالة الوحدة' : 'Unit State'}</th>
                <th style={{ width: '90px', textAlign: 'center' }}>{isAr ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRescissions.map(r => {
                const linked = contracts.find(ct => ct.contract_id === r.contract_id);
                return (
                  <tr key={r.rescission_id} onClick={() => onInspectRescission(r)} style={{ cursor: 'pointer' }}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#64748b',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.15rem 0.45rem'
                      }}>
                        #{r.rescission_id.slice(0, 8)}
                      </span>
                    </td>
                    <td style={{ minWidth: '260px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem', lineHeight: 1.4 }}>
                        {linked?.unit_id || (isAr ? 'وحدة عقارية' : 'Property Unit')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem', fontWeight: 600 }}>
                        #{linked?.contract_number || r.contract_id.slice(0, 8)}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#334155', minWidth: '160px' }}>
                      {linked?.buyer_name || '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: r.branch === 'Pre-Delivery' ? '#f8fafc' : 'rgba(184, 144, 62, 0.08)',
                        color: r.branch === 'Pre-Delivery' ? '#475569' : '#946f23',
                        border: r.branch === 'Pre-Delivery' ? '1px solid #e2e8f0' : '1px solid rgba(184, 144, 62, 0.25)'
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.branch === 'Pre-Delivery' ? '#475569' : '#946f23', display: 'inline-block' }} />
                        <span>{r.branch === 'Pre-Delivery' ? (isAr ? 'المسار ١ (قبل التسليم)' : 'Pre-Delivery') : (isAr ? 'المسار ٢ (بعد التسليم)' : 'Post-Delivery')}</span>
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}><MoneyCell amount={r.gross_contract_value} isAr={isAr} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}><MoneyCell amount={r.total_cash_collected} isAr={isAr} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MoneyCell amount={r.penalty_retained} isAr={isAr} highlight />
                        <span style={{
                          fontSize: '0.68rem',
                          background: 'rgba(184, 144, 62, 0.1)',
                          color: '#946f23',
                          border: '1px solid rgba(184, 144, 62, 0.25)',
                          borderRadius: '4px',
                          padding: '0.1rem 0.35rem',
                          fontWeight: 800
                        }}>
                          {isAr ? '١٠٪' : '10%'}
                        </span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong style={{ color: '#0f172a', fontWeight: 900 }}>
                        <MoneyCell amount={r.net_refund_liability} isAr={isAr} />
                      </strong>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', minWidth: '170px' }}>
                      <StatusBadge domain="unit" status={r.unit_state} isAr={isAr} />
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '90px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectRescission(r);
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          color: '#946f23',
                          borderRadius: '8px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Eye size={12} color="#946f23" />
                        <span>{isAr ? 'فحص' : 'View'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredRescissions.map(r => {
            const linked = contracts.find(ct => ct.contract_id === r.contract_id);
            return (
              <div 
                key={r.rescission_id}
                onClick={() => onInspectRescission(r)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#64748b',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.15rem 0.45rem',
                      display: 'inline-block',
                      marginBottom: '0.35rem'
                    }}>
                      #{r.rescission_id.slice(0, 8)}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                      {linked?.unit_id || (isAr ? 'وحدة عقارية' : 'Property Unit')}
                    </h3>
                  </div>
                  <StatusBadge domain="unit" status={r.unit_state} isAr={isAr} />
                </div>

                <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                  <span style={{ color: '#64748b' }}>{isAr ? 'العميل: ' : 'Buyer: '}</span>
                  <strong>{linked?.buyer_name || '—'}</strong>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.75rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{isAr ? 'قيمة العقد (V):' : 'Gross:'}</span>
                    <strong style={{ color: '#0f172a' }}><MoneyCell amount={r.gross_contract_value} isAr={isAr} /></strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{isAr ? 'المحصل (C):' : 'Collected:'}</span>
                    <strong style={{ color: '#0f172a' }}><MoneyCell amount={r.total_cash_collected} isAr={isAr} /></strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{isAr ? 'الغرامة (10%):' : 'Penalty:'}</span>
                    <strong style={{ color: '#946f23' }}><MoneyCell amount={r.penalty_retained} isAr={isAr} /></strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{isAr ? 'صافي الرد:' : 'Refund:'}</span>
                    <strong style={{ color: '#0f172a', fontWeight: 900 }}><MoneyCell amount={r.net_refund_liability} isAr={isAr} /></strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectRescission(r);
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#946f23',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    marginTop: 'auto',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Eye size={13} color="#946f23" />
                  <span>{isAr ? 'فحص ملف وتفاصيل الفسخ' : 'Inspect Rescission'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
