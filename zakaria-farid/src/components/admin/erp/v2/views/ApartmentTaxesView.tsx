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
  Building,
  RotateCcw,
  ArrowUpDown
} from 'lucide-react';
import { ERPTaxRecord, ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
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
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'amount_desc' | 'amount_asc' | 'rate_desc' | 'unit_asc'>('amount_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Available Tax Types for dropdown
  const availableTaxTypes = useMemo(() => {
    const set = new Set<string>();
    taxRecords.forEach(t => {
      if (t.tax_type) set.add(t.tax_type);
    });
    return Array.from(set);
  }, [taxRecords]);

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
      pendingCount: taxRecords.filter(t => t.remittance_status !== 'Remitted to ETA').length,
      remittedCount: taxRecords.filter(t => t.remittance_status === 'Remitted to ETA').length
    };
  }, [taxRecords]);

  // Filtered Taxes
  const filteredTaxes = useMemo(() => {
    return taxRecords.filter(t => {
      const isRemitted = t.remittance_status === 'Remitted to ETA';
      if (statusFilter === 'pending' && isRemitted) return false;
      if (statusFilter === 'remitted' && !isRemitted) return false;
      if (typeFilter !== 'all' && t.tax_type !== typeFilter) return false;

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
  }, [taxRecords, contracts, statusFilter, typeFilter, searchQuery]);

  // Sorted Taxes
  const sortedTaxes = useMemo(() => {
    const list = [...filteredTaxes];
    list.sort((a, b) => {
      if (sortBy === 'amount_desc') return D(b.tax_amount || '0').minus(D(a.tax_amount || '0')).toNumber();
      if (sortBy === 'amount_asc') return D(a.tax_amount || '0').minus(D(b.tax_amount || '0')).toNumber();
      if (sortBy === 'rate_desc') return D(b.tax_rate || '0').minus(D(a.tax_rate || '0')).toNumber();
      if (sortBy === 'unit_asc') {
        const cA = contracts.find(c => c.contract_id === a.contract_id)?.unit_id || '';
        const cB = contracts.find(c => c.contract_id === b.contract_id)?.unit_id || '';
        return cA.localeCompare(cB);
      }
      return 0;
    });
    return list;
  }, [filteredTaxes, sortBy, contracts]);

  // Pagination
  const totalPages = Math.ceil(sortedTaxes.length / pageSize) || 1;
  const paginatedTaxes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTaxes.slice(start, start + pageSize);
  }, [sortedTaxes, currentPage, pageSize]);

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    (sortBy !== 'amount_desc' ? 1 : 0);

  const handleResetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSortBy('amount_desc');
    setSearchQuery('');
    setCurrentPage(1);
  };

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
            <span>{isAr ? 'الضرائب والرسوم على الشقق' : 'Apartment Taxes & Fees'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle}>
              {isAr ? 'الضرائب والرسوم على الشقق وعقود البيع' : 'Manual Apartment Taxes & Fees Ledger'}
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
              {isAr ? 'ضريبة التصرفات العقارية (2.5%) ورسوم العقود' : 'GL 204000 Ledger'}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isAr 
              ? 'متابعة ضريبة التصرفات العقارية (2.5%) ورسوم العقود، وموقف تحصيلها وسدادها.' 
              : 'Detailed tracking ledger of custom taxes added manually per apartment and calculated directly into gross contract pricing.'}
          </p>
        </div>
      </div>

      {/* 2. ASYMMETRIC TAX COMPLIANCE & POOL RADAR (Tax & Regulatory Archetype) */}
      <div className={styles.asymmetricBentoGrid}>
        {/* Left / Hero Card: Total Taxes Pool & Settlement Progress */}
        <ZFKpiCard
          variant="double-bezel"
          isFlagship={true}
          title={isAr ? 'إجمالي الضرائب والرسوم' : 'Total Apartment Taxes Pool'}
          value={kpis.totalTax.formatEGP(isAr)}
          icon={<Landmark size={20} />}
          accentColor="gold"
          progress={kpis.totalTax.isZero() ? 0 : kpis.remittedTax.div(kpis.totalTax).times(100).toFixed(1)}
          progressColor="#10b981"
          badge={{ text: `${kpis.totalCount} ${isAr ? 'شقة وعقد' : 'tax records'}`, variant: 'gold' }}
          subtitleLabel={isAr ? 'المسدد فعلياً' : 'Settlement Ratio'}
          subtitleValue={`${kpis.totalTax.isZero() ? '0' : kpis.remittedTax.div(kpis.totalTax).times(100).toFixed(1)}% (${kpis.remittedTax.formatEGP(isAr)})`}
        />

        {/* Right Stack: 2 Compact Telemetry Instruments */}
        <div className={styles.telemetryStack}>
          <ZFKpiCard
            variant="compact"
            title={isAr ? 'ضرائب ورسوم باقية ما اتسددتش' : 'Pending Taxes & Fees'}
            value={kpis.pendingTax.formatEGP(isAr)}
            icon={<FileText size={16} />}
            accentColor="rose"
            subtitleLabel={isAr ? 'الموقف الحالي' : 'Status'}
            subtitleValue={`${kpis.pendingCount} ${isAr ? 'عقود لسه عليها رسوم' : 'pending collection'}`}
          />

          <ZFKpiCard
            variant="compact"
            title={isAr ? 'اتحصلت ودخلت الخزنة' : 'Settled Taxes in Safe'}
            value={kpis.remittedTax.formatEGP(isAr)}
            icon={<CheckCircle2 size={16} />}
            accentColor="emerald"
            subtitleLabel={isAr ? 'حساب الإيداع' : 'GL Account'}
            subtitleValue={isAr ? 'اتحصلت في الخزنة' : 'collected in 101000'}
          />
        </div>
      </div>

      {/* 3. Toolbar: Status Tabs, Search & View Switcher */}
      <ZFFilterToolbar
        tabs={[
          { id: 'all', label: isAr ? 'كل الشقق والعقود' : 'All Records', count: taxRecords.length },
          { id: 'pending', label: isAr ? 'مستحق وما اتسددش' : 'Pending', count: kpis.pendingCount },
          { id: 'remitted', label: isAr ? 'متسدد خلاص' : 'Settled', count: kpis.remittedCount }
        ]}
        activeTab={statusFilter}
        onTabChange={(tabId) => {
          setStatusFilter(tabId as any);
          setCurrentPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder={isAr ? 'دوّر برقم العقد، الشقة، أو اسم العميل...' : 'Search taxes...'}
        filters={
          availableTaxTypes.length > 1
            ? [
                {
                  id: 'tax_type',
                  value: typeFilter,
                  onChange: (val) => {
                    setTypeFilter(val);
                    setCurrentPage(1);
                  },
                  ariaLabel: isAr ? 'نوع الرسم' : 'Tax Type',
                  options: [
                    { value: 'all', label: isAr ? 'كل الرسوم والضرائب' : 'All Tax Types' },
                    ...availableTaxTypes.map(t => ({ value: t, label: t }))
                  ]
                }
              ]
            : undefined
        }
        sortBy={sortBy}
        onSortChange={(val) => {
          setSortBy(val as any);
          setCurrentPage(1);
        }}
        sortOptions={[
          { value: 'amount_desc', label: isAr ? 'المبلغ: الأكبر الأول' : 'Highest Tax Amount' },
          { value: 'amount_asc', label: isAr ? 'المبلغ: الأقل الأول' : 'Lowest Tax Amount' },
          { value: 'rate_desc', label: isAr ? 'النسبة: الأكبر الأول' : 'Highest Rate' },
          { value: 'unit_asc', label: isAr ? 'رقم الشقة: أ - ي' : 'Unit ID (A-Z)' }
        ]}
        sortAriaLabel={isAr ? 'ترتيب الرسوم' : 'Sort Taxes'}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode as any)}
        isAr={isAr}
      />

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
          <Landmark size={36} color="#946f23" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
            {isAr ? 'مفيش ضرائب أو رسوم مطابقة للبحث أو الفلتر' : 'No matching tax records found'}
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
            {isAr ? 'كل الضرائب والرسوم متسددة ومضبوطة بالدفاتر.' : 'All apartment tax records have been reconciled.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{isAr ? 'رقم القيد' : 'Tax ID'}</th>
                <th>{isAr ? 'نوع الرسم أو الضريبة' : 'Tax Label'}</th>
                <th>{isAr ? 'الشقة والعقد' : 'Contract & Unit'}</th>
                <th>{isAr ? 'سعر الشقة الأصلي' : 'Base Price'}</th>
                <th>{isAr ? 'نسبة الرسم / الضريبة' : 'Rate'}</th>
                <th>{isAr ? 'قيمة الضريبة' : 'Manual Tax'}</th>
                <th>{isAr ? 'إجمالي السعر شامل الرسوم' : 'Total Price with Tax'}</th>
                <th>{isAr ? 'موقف السداد' : 'Status'}</th>
                <th style={{ textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTaxes.map(t => {
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
                    <td style={{ minWidth: '130px', fontWeight: 700, color: '#0f172a', fontSize: '0.8rem' }}>
                      {isAr ? 'ضريبة تصرفات عقارية (2.5%)' : t.tax_type}
                    </td>
                    <td style={{ minWidth: '150px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem', lineHeight: 1.35 }}>
                          {linkedContract?.unit_id || (isAr ? 'عقد مباشر' : 'Direct')}
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
                        <span>{isRemitted ? (isAr ? 'اتسددت في الخزنة' : 'Settled in Safe') : (isAr ? 'مستحق وما اتسددش' : 'Pending')}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      {isRemitted ? (
                        <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={13} color="#15803d" />
                          <span>{isAr ? 'متسدد خلاص' : 'Settled'}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRemitTax(t.tax_id)}
                          disabled={isMutating}
                          className={styles.settleBtn}
                        >
                          <CheckCircle2 size={12} color="#ffffff" />
                          <span>{isAr ? 'تسجيل السداد كاش' : 'Settle'}</span>
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
        <div className={styles.cardsGrid}>
          {paginatedTaxes.map(t => {
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
                      {isAr ? 'تفاصيل الضريبة والرسوم' : 'TAX & FEES LEDGER'}
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
                    <span>{isRemitted ? (isAr ? 'متسدد خلاص' : 'Settled') : (isAr ? 'مستحق وما اتسددش' : 'Pending')}</span>
                  </span>
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                    {linkedContract?.unit_id || (isAr ? 'شقة' : 'Unit')}
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {isAr ? 'رقم العقد: ' : 'Contract: '}
                    <span style={{
                      fontVariantNumeric: 'tabular-nums',
                      color: '#946f23',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      direction: 'ltr',
                      unicodeBidi: 'isolate',
                      display: 'inline-block'
                    }}>
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
                      {isAr ? 'قيمة الضريبة والرسوم:' : 'Manual Tax Added:'}
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
                  <span style={{ color: '#64748b' }}>{isAr ? 'إجمالي السعر شامل الرسوم:' : 'Total with tax:'}</span>
                  <strong style={{ color: '#0f172a' }}><MoneyCell amount={totalVal} isAr={isAr} /></strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  {isRemitted ? (
                    <span style={{ color: '#15803d', fontWeight: 800, fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle2 size={13} color="#15803d" />
                      <span>{isAr ? 'متسدد خلاص' : 'Settled in Safe'}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemitTax(t.tax_id);
                      }}
                      disabled={isMutating}
                      className={styles.settleBtn}
                    >
                      <CheckCircle2 size={13} color="#ffffff" />
                      <span>{isAr ? 'تسجيل السداد في الخزنة' : 'Settle in Safe'}</span>
                    </button>
                  )}

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#946f23', fontSize: '0.74rem', fontWeight: 800 }}>
                    <span>{isAr ? 'عرض التفاصيل' : 'Inspect'}</span>
                    <ArrowUpRight size={13} color="#946f23" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Unified Pagination Bar */}
      <ZFPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedTaxes.length}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={sz => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
        isAr={isAr}
        itemLabel={{ ar: 'شقة وعقد', en: 'tax records' }}
      />
    </div>
  );
};
