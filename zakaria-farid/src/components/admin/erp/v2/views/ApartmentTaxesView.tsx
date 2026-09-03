'use client';

import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  CheckCircle2, 
  FileText, 
  Search, 
  LayoutGrid, 
  List, 
  Clock, 
  ArrowUpRight, 
  ShieldCheck,
  Building
} from 'lucide-react';
import { ERPTaxRecord, ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import styles from '../ZFWorkstationShell.module.css';

interface ApartmentTaxesViewProps {
  taxRecords: ERPTaxRecord[];
  contracts: ERPContract[];
  isAr?: boolean;
  isMutating?: boolean;
  onRemitTax: (taxId: string) => void;
  onInspectTax: (tax: ERPTaxRecord) => void;
}

export const ApartmentTaxesView: React.FC<ApartmentTaxesViewProps> = ({
  taxRecords,
  contracts,
  isAr = true,
  isMutating = false,
  onRemitTax,
  onInspectTax
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'remitted'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3 Executive KPIs
  const kpis = useMemo(() => {
    const pendingTax = taxRecords
      .filter(t => t.remittance_status !== 'Remitted to ETA')
      .reduce((acc, t) => acc.plus(t.tax_amount || '0'), D(0));
    const remittedTax = taxRecords
      .filter(t => t.remittance_status === 'Remitted to ETA')
      .reduce((acc, t) => acc.plus(t.tax_amount || '0'), D(0));
    const totalTax = pendingTax.plus(remittedTax);

    return {
      pendingTax,
      remittedTax,
      totalTax,
      totalCount: taxRecords.length,
      pendingCount: taxRecords.filter(t => t.remittance_status !== 'Remitted to ETA').length
    };
  }, [taxRecords]);

  // Filtered Taxes
  const filteredTaxes = useMemo(() => {
    return taxRecords.filter(t => {
      const isRemitted = t.remittance_status === 'Remitted to ETA';
      if (statusFilter === 'pending' && isRemitted) return false;
      if (statusFilter === 'remitted' && !isRemitted) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const linked = contracts.find(c => c.contract_id === t.contract_id);
        const id = (t.tax_id || '').toLowerCase();
        const type = (t.tax_type || '').toLowerCase();
        const unit = (linked?.unit_id || '').toLowerCase();
        const contractNum = (linked?.contract_number || '').toLowerCase();
        const buyer = (linked?.buyer_name || '').toLowerCase();
        return id.includes(q) || type.includes(q) || unit.includes(q) || contractNum.includes(q) || buyer.includes(q);
      }

      return true;
    });
  }, [taxRecords, contracts, statusFilter, searchQuery]);

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
            <span>{isAr ? 'الضرائب والرسوم المضافة' : 'Apartment Taxes & Fees'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle}>
              {isAr ? 'سجل الضرائب والرسوم المضافة للوحدات والعقود' : 'Manual Apartment Taxes & Fees Ledger'}
            </h1>
            <span style={{
              background: 'rgba(184, 144, 62, 0.08)',
              border: '1px solid rgba(184, 144, 62, 0.25)',
              color: '#946f23',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {isAr ? 'حسابات أستاذ ٢٠٤٠٠٠' : 'GL 204000 Ledger'}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isAr 
              ? 'سجل متابعة تفصيلي بالضرائب والرسوم المضافة يدوياً لكل شقة والمحسوبة تلقائياً ضمن إجمالي سعر التعاقد.' 
              : 'Detailed tracking ledger of custom taxes added manually per apartment and calculated directly into gross contract pricing.'}
          </p>
        </div>
      </div>

      {/* 2. 3 Executive Tax KPI Cards */}
      <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* Card 1: Pending Taxes */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>{isAr ? 'الضرائب والرسوم قيد الاستيفاء' : 'Pending Taxes & Fees'}</span>
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
              <Landmark size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            <span>{splitAmount(kpis.pendingTax).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.pendingTax).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              {isAr ? 'حساب ٢٠٤٠٠٠' : 'GL 204000'}
            </span>
            <span className={styles.kpiNote}>{isAr ? `${kpis.pendingCount} قيد تحصيل مع السداد` : `${kpis.pendingCount} pending collection`}</span>
          </div>
        </div>

        {/* Card 2: Settled / Collected Taxes */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>{isAr ? 'الضرائب والرسوم المستوفاة' : 'Settled / Collected Taxes'}</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            <span>{splitAmount(kpis.remittedTax).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.remittedTax).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#059669', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
              {isAr ? 'مستوفاة بالخزينة' : 'Settled in Safe'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'محصلة بحساب ١٠١٠٠٠' : 'GL 101000 collected'}</span>
          </div>
        </div>

        {/* Card 3: Total Tax Pool (Flagship Gold Card) */}
        <div className={`${styles.kpiCard} ${styles.flagshipCard}`}>
          <div className={styles.kpiHeader}>
            <span className={`${styles.kpiLabel} ${styles.flagshipLabel}`}>
              {isAr ? 'إجمالي محفظة الضرائب المضافة للشقق' : 'Total Apartment Taxes Pool'}
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
            <span>{splitAmount(kpis.totalTax).num}</span>
            <span className={styles.kpiCurrency}>{splitAmount(kpis.totalTax).cur}</span>
          </div>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiBadge} style={{ background: 'rgba(184, 144, 62, 0.1)', color: '#946f23', borderColor: 'rgba(184, 144, 62, 0.25)' }}>
              {kpis.totalCount} {isAr ? 'سجلات ضريبية' : 'tax records'}
            </span>
            <span className={styles.kpiNote}>{isAr ? 'ضمن أسعار البيع الإجمالية' : 'in gross prices'}</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Status Tabs, Search & View Switcher */}
      <div className={styles.toolbar}>
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${statusFilter === 'all' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            {isAr ? 'كافة السجلات' : 'All Records'}
          </button>
          <button
            className={`${styles.tabBtn} ${statusFilter === 'pending' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            {isAr ? 'قيد الاستيفاء والتحصيل' : 'Pending'}
          </button>
          <button
            className={`${styles.tabBtn} ${statusFilter === 'remitted' ? styles.tabBtnActive : ''}`}
            onClick={() => setStatusFilter('remitted')}
          >
            {isAr ? 'مستوفاة ومسددة بالخزينة' : 'Settled'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className={styles.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بكود الضريبة، العقد، أو الوحدة...' : 'Search taxes...'}
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

      {/* 4. Main Content: Table or Cards */}
      {filteredTaxes.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <Landmark size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
            {isAr ? 'لا توجد سجلات ضريبية مطابقة لمعايير البحث' : 'No matching tax records found'}
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
            {isAr ? 'كافة الرسوم والضرائب مستوفاة ومسجلة بحالة نظامية.' : 'All apartment tax records have been reconciled.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{isAr ? 'كود القيد' : 'Tax ID'}</th>
                <th>{isAr ? 'بيان / مسمى الضريبة' : 'Tax Label'}</th>
                <th>{isAr ? 'العقد والوحدة' : 'Contract & Unit'}</th>
                <th>{isAr ? 'سعر الشقة الأساسي' : 'Base Price'}</th>
                <th>{isAr ? 'النسبة المحسوبة' : 'Rate'}</th>
                <th>{isAr ? 'الضريبة المضافة (يدوياً)' : 'Manual Tax'}</th>
                <th>{isAr ? 'إجمالي السعر شامل الضريبة' : 'Total Price with Tax'}</th>
                <th>{isAr ? 'حالة الاستيفاء' : 'Status'}</th>
                <th style={{ textAlign: 'center' }}>{isAr ? 'إجراء التسوية' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTaxes.map(t => {
                const linkedContract = contracts.find(c => c.contract_id === t.contract_id);
                const totalVal = D(t.taxable_base).plus(t.tax_amount).toFixed(2);
                const isRemitted = t.remittance_status === 'Remitted to ETA';

                return (
                  <tr 
                    key={t.tax_id}
                    onClick={() => onInspectTax(t)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span style={{
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#64748b',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.15rem 0.45rem',
                        whiteSpace: 'nowrap'
                      }}>
                        #{t.tax_id.slice(0, 8)}
                      </span>
                    </td>
                    <td style={{ minWidth: '160px', fontWeight: 700, color: '#0f172a', fontSize: '0.8rem' }}>
                      {isAr ? 'رسوم وضرائب تصرفات للوحدة' : t.tax_type}
                    </td>
                    <td style={{ minWidth: '220px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem', lineHeight: 1.35 }}>
                          {linkedContract?.unit_id || (isAr ? 'تسوية مباشرة' : 'Direct')}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                          #{linkedContract?.contract_number || '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}><MoneyCell amount={t.taxable_base} isAr={isAr} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 800, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                        {D(t.tax_rate).times(100).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}><MoneyCell amount={t.tax_amount} isAr={isAr} highlight /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 900, color: '#0f172a' }}>
                        <MoneyCell amount={totalVal} isAr={isAr} />
                      </span>
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
                        background: isRemitted ? '#f0fdf4' : '#fffbeb',
                        color: isRemitted ? '#15803d' : '#b45309',
                        border: isRemitted ? '1px solid rgba(22, 163, 74, 0.25)' : '1px solid rgba(245, 158, 11, 0.3)'
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isRemitted ? '#15803d' : '#b45309', display: 'inline-block' }} />
                        <span>{isRemitted ? (isAr ? 'مستوفاة بالخزينة' : 'Settled in Safe') : (isAr ? 'قيد التحصيل' : 'Pending')}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      {isRemitted ? (
                        <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={13} color="#15803d" />
                          <span>{isAr ? 'مسدد ومستوفى' : 'Settled'}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRemitTax(t.tax_id)}
                          disabled={isMutating}
                          style={{
                            background: '#0f172a',
                            border: '1px solid #0f172a',
                            borderRadius: '8px',
                            color: '#ffffff',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: isMutating ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <CheckCircle2 size={12} color="#10b981" />
                          <span>{isAr ? 'إثبات الاستيفاء' : 'Settle'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredTaxes.map(t => {
            const linkedContract = contracts.find(c => c.contract_id === t.contract_id);
            const totalVal = D(t.taxable_base).plus(t.tax_amount).toFixed(2);
            const isRemitted = t.remittance_status === 'Remitted to ETA';

            return (
              <div
                key={t.tax_id}
                onClick={() => onInspectTax(t)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ShieldCheck size={14} color="#946f23" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#946f23' }}>
                      {isAr ? 'حافظة الرسوم والضرائب المضافة' : 'TAX & FEES LEDGER'}
                    </span>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    background: isRemitted ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${isRemitted ? 'rgba(22, 163, 74, 0.25)' : 'rgba(245, 158, 11, 0.3)'}`,
                    color: isRemitted ? '#15803d' : '#b45309',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isRemitted ? '#15803d' : '#b45309', display: 'inline-block' }} />
                    <span>{isRemitted ? (isAr ? 'مُستوفاة ومسددة' : 'Settled') : (isAr ? 'قيد الاستيفاء' : 'Pending')}</span>
                  </span>
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                    {linkedContract?.unit_id || (isAr ? 'وحدة عقارية' : 'Unit')}
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {isAr ? 'رقم العقد: ' : 'Contract: '}
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#946f23', fontWeight: 700 }}>
                      #{linkedContract?.contract_number || t.contract_id.slice(0, 8)}
                    </span>
                  </div>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                      {isAr ? 'الضريبة المضافة للوحدة:' : 'Manual Tax Added:'}
                    </span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>
                      <MoneyCell amount={t.tax_amount} isAr={isAr} highlight />
                    </div>
                  </div>
                  <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                      {isAr ? 'النسبة:' : 'Rate:'}
                    </span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                      {D(t.tax_rate).times(100).toFixed(1)}%
                    </strong>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '0.75rem'
                }}>
                  <span style={{ color: '#64748b' }}>{isAr ? 'الإجمالي مع الضريبة:' : 'Total with tax:'}</span>
                  <strong style={{ color: '#0f172a' }}><MoneyCell amount={totalVal} isAr={isAr} /></strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  {isRemitted ? (
                    <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle2 size={13} color="#15803d" />
                      <span>{isAr ? 'مسدد ومستوفى' : 'Settled in Safe'}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemitTax(t.tax_id);
                      }}
                      disabled={isMutating}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #0f172a',
                        borderRadius: '8px',
                        color: '#ffffff',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: isMutating ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <CheckCircle2 size={13} color="#10b981" />
                      <span>{isAr ? 'إثبات الاستيفاء بالخزينة' : 'Settle in Safe'}</span>
                    </button>
                  )}

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#946f23', fontSize: '0.74rem', fontWeight: 800 }}>
                    <span>{isAr ? 'فحص التفاصيل' : 'Inspect'}</span>
                    <ArrowUpRight size={13} color="#946f23" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
