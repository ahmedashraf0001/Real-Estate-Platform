'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
  ArrowRight,
  ArrowUpDown,
  TrendingUp,
  Building2,
  Scale,
  Calendar,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { ERPRescissionRecord, ERPContract, ERPJournalEntry } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D, maxDecimal } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { StatusBadge } from '@/components/erp/StatusBadge';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard, ZFKpiGrid } from '../ZFKpiCard';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
import { ZFPageHeader } from '../common/ZFPageHeader';
import { ZFModalShell } from '../common/ZFModalShell';
import { useERPWorkstationContext } from '../../context/ERPWorkstationContext';
import styles from '../ZFWorkstationShell.module.css';

interface ContractRescissionsViewProps {
  rescissions: ERPRescissionRecord[];
  contracts: ERPContract[];
  properties?: Property[];
  journalEntries?: ERPJournalEntry[];
  isAr?: boolean;
  hideHeader?: boolean;
  isMutating?: boolean;
  onInspectRescission: (rescission: ERPRescissionRecord) => void;
  onNavigateToContracts: () => void;
  onOpenRescissionModal?: (contract: ERPContract) => void;
  onPayRefund?: (params: {
    rescission: ERPRescissionRecord;
    amount: string;
    sourceAccount: '101000' | '102000';
    paymentDate: string;
    notes?: string;
  }) => Promise<void>;
}

export const ContractRescissionsView: React.FC<ContractRescissionsViewProps> = ({
  rescissions,
  contracts,
  properties = [],
  journalEntries,
  isAr = true,
  hideHeader = false,
  isMutating: isMutatingProp,
  onInspectRescission,
  onNavigateToContracts,
  onOpenRescissionModal,
  onPayRefund
}) => {
  const erp = useERPWorkstationContext?.();
  const effectiveJournalEntries = useMemo(() => {
    return journalEntries || erp?.data?.journalEntries || [];
  }, [journalEntries, erp?.data?.journalEntries]);
  const effectiveOnPayRefund = onPayRefund || erp?.handlePayRefund;
  const isMutating = isMutatingProp ?? erp?.isMutating ?? false;

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [branchFilter, setBranchFilter] = useState<'all' | 'Pre-Delivery' | 'Post-Delivery'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'refund_desc' | 'refund_asc' | 'penalty_desc' | 'gross_desc'>('date_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isContractPickerOpen, setIsContractPickerOpen] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');

  // Refund payout modal state
  const [payRefundTarget, setPayRefundTarget] = useState<ERPRescissionRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundSource, setRefundSource] = useState<'101000' | '102000'>('101000');
  const [refundDate, setRefundDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [refundError, setRefundError] = useState<string>('');

  // Properties map for building title lookup
  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>();
    properties.forEach(p => map.set(p.id, p));
    return map;
  }, [properties]);

  // Helper to compute outstanding refund per rescission record
  const getRescissionRefundInfo = useCallback((r: ERPRescissionRecord) => {
    const originalRefund = D(r.net_refund_liability || '0');
    let paidSum = D(0);
    for (const j of effectiveJournalEntries) {
      const isLinked = j.source_entity_id === r.contract_id || 
                       j.source_entity_id === r.rescission_id ||
                       j.lines.some(l => l.contract_id === r.contract_id);
      if (!isLinked) continue;

      for (const line of j.lines) {
        if (line.account_code === '206200' && D(line.debit_amount || '0').gt(0)) {
          paidSum = paidSum.plus(line.debit_amount);
        }
      }
    }
    const outstanding = maxDecimal(D(0), originalRefund.minus(paidSum));
    return {
      originalRefund,
      paidSum,
      outstandingRefund: outstanding
    };
  }, [effectiveJournalEntries]);

  const handleOpenPayRefund = (r: ERPRescissionRecord) => {
    const { outstandingRefund } = getRescissionRefundInfo(r);
    setPayRefundTarget(r);
    setRefundAmount(outstandingRefund.toFixed(2));
    setRefundSource('101000');
    setRefundDate(new Date().toISOString().split('T')[0]);
    setRefundNotes('');
    setRefundError('');
  };

  const handleConfirmPayRefund = async () => {
    if (!payRefundTarget || !effectiveOnPayRefund) return;
    const { outstandingRefund } = getRescissionRefundInfo(payRefundTarget);
    const amt = D(refundAmount || '0');
    if (amt.lte(0)) {
      setRefundError(isAr ? 'المبلغ يجب أن يكون أكبر من 0' : 'Amount must be greater than 0');
      return;
    }
    if (amt.gt(outstandingRefund)) {
      setRefundError(
        isAr
          ? `المبلغ المدخل (${amt.formatEGP(true)}) يتجاوز رصيد المسترد المتبقي (${outstandingRefund.formatEGP(true)})`
          : `Amount exceeds outstanding refund (${outstandingRefund.toFixed(2)})`
      );
      return;
    }

    try {
      await effectiveOnPayRefund({
        rescission: payRefundTarget,
        amount: amt.toFixed(2),
        sourceAccount: refundSource,
        paymentDate: refundDate,
        notes: refundNotes
      });
      setPayRefundTarget(null);
    } catch (e) {
      setRefundError((e as Error).message || String(e));
    }
  };

  // 4 Executive KPIs (Customer Refund Liability shows outstanding, not original)
  const kpis = useMemo(() => {
    let totalPenalty = D(0);
    let totalOutstandingRefund = D(0);
    let totalGrossVoid = D(0);
    let preDeliveryCount = 0;
    let postDeliveryCount = 0;

    rescissions.forEach(r => {
      totalPenalty = totalPenalty.plus(r.penalty_retained || '0');
      const { outstandingRefund } = getRescissionRefundInfo(r);
      totalOutstandingRefund = totalOutstandingRefund.plus(outstandingRefund);
      totalGrossVoid = totalGrossVoid.plus(r.gross_contract_value || '0');
      if (r.branch === 'Pre-Delivery') preDeliveryCount++;
      if (r.branch === 'Post-Delivery') postDeliveryCount++;
    });

    return {
      totalPenalty,
      totalRefund: totalOutstandingRefund,
      totalGrossVoid,
      count: rescissions.length,
      preDeliveryCount,
      postDeliveryCount
    };
  }, [rescissions, getRescissionRefundInfo]);

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

  // Sorted list
  const sortedRescissions = useMemo(() => {
    const list = [...filteredRescissions];
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'refund_desc') return D(b.net_refund_liability || '0').minus(D(a.net_refund_liability || '0')).toNumber();
      if (sortBy === 'refund_asc') return D(a.net_refund_liability || '0').minus(D(b.net_refund_liability || '0')).toNumber();
      if (sortBy === 'penalty_desc') return D(b.penalty_retained || '0').minus(D(a.penalty_retained || '0')).toNumber();
      if (sortBy === 'gross_desc') return D(b.gross_contract_value || '0').minus(D(a.gross_contract_value || '0')).toNumber();
      return 0;
    });
    return list;
  }, [filteredRescissions, sortBy]);

  const totalPages = Math.ceil(sortedRescissions.length / pageSize) || 1;
  const paginatedRescissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRescissions.slice(start, start + pageSize);
  }, [sortedRescissions, currentPage, pageSize]);

  const activeFiltersCount = (branchFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    (sortBy !== 'date_desc' ? 1 : 0);

  const handleResetFilters = () => {
    setBranchFilter('all');
    setSortBy('date_desc');
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
    <div 
      className={styles.stageContainer}
      style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}
    >
      {/* 1. Header & Stage Breadcrumb */}
      {!hideHeader && (
        <ZFPageHeader
          title={isAr ? 'فسخ العقود والتسويات' : 'Contract rescissions'}
          subtitle={isAr ? 'تسجيل فسخ العقد، خصم غرامة الفسخ، رد المستحق للعميل، وإعادة الوحدة للبيع.' : 'Record a rescission, deduct the penalty, refund the client, and return the unit to sale.'}
          actions={(
            <>
              {onOpenRescissionModal && (
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => {
                    const eligible = contracts.filter(c => c.status !== 'Rescinded');
                    if (eligible.length === 1) {
                      onOpenRescissionModal(eligible[0]);
                    } else {
                      setIsContractPickerOpen(true);
                    }
                  }}
                >
                  <RotateCcw size={14} />
                  <span>{isAr ? 'تسجيل فسخ عقد' : 'New rescission'}</span>
                </button>
              )}
              <button type="button" className={styles.btnSecondary} onClick={onNavigateToContracts}>
                <span>{isAr ? 'عقود البيع' : 'Sales contracts'}</span>
                <ArrowRight size={14} />
              </button>
            </>
          )}
        />
      )}

      {/* 2. EXECUTIVE LEGAL SETTLEMENT KPIS (4 Discrete Floating Stat Cards) */}
      <ZFKpiGrid>
        {/* Card 1: Retained Penalties & Income Yield */}
        <ZFKpiCard
          title={isAr ? 'غرامات الإلغاء المستحقة للشركة' : 'Retained Penalties & Settlement Yield'}
          value={splitAmount(kpis.totalPenalty).num}
          unitLabel={splitAmount(kpis.totalPenalty).cur}
          icon={<DollarSign size={16} />}
          accentColor="accent"
          subtitleLabel={isAr ? 'أرباح تسوية' : 'Settlement'}
          subtitleValue={isAr ? 'غرامات فسخ مستحقة للشركة' : 'Retained company earnings'}
        />

        {/* Card 2: Customer Refund Liability */}
        <ZFKpiCard
          title={isAr ? 'صافي التزامات الرد المتبقية' : 'Customer Refund Liability (Outstanding)'}
          value={splitAmount(kpis.totalRefund).num}
          unitLabel={splitAmount(kpis.totalRefund).cur}
          icon={<CheckCircle2 size={16} />}
          accentColor="amber"
          subtitleLabel={isAr ? 'موقف الفلوس' : 'Status'}
          subtitleValue={isAr ? 'التزام رد نقدي متبقٍ (حساب 206200)' : 'Outstanding refund (GL 206200)'}
        />

        {/* Card 3: Voided Sales & Asset Recovery */}
        <ZFKpiCard
          title={isAr ? 'قيمة الأصول والشقق المستردة' : 'Voided Sales & Asset Recovery'}
          value={splitAmount(kpis.totalGrossVoid).num}
          unitLabel={splitAmount(kpis.totalGrossVoid).cur}
          icon={<Building2 size={16} />}
          accentColor="blue"
          subtitleLabel={isAr ? 'موقف المخزون' : 'Inventory'}
          subtitleValue={isAr ? 'شقق أعيدت للمعروض المتاح للبيع' : 'Restored to active inventory'}
        />

        {/* Card 4: Total Rescissions Count */}
        <ZFKpiCard
          title={isAr ? 'عدد العقود المفسوخة قانونياً' : 'Total Legally Voided Contracts'}
          value={kpis.count}
          unitLabel={isAr ? 'عقد ملغى' : 'deals'}
          icon={<Scale size={16} />}
          accentColor="slate"
          subtitleLabel={isAr ? 'حالة القضايا' : 'Legal Status'}
          subtitleValue={isAr ? `${kpis.count} عقود ملغاة ومعتمدة` : `${kpis.count} legally voided`}
        />
      </ZFKpiGrid>

      {/* 3. Toolbar: Filter Tabs, Sort, Search & View Switcher */}
      <ZFFilterToolbar
        tabs={[
          { id: 'all', label: isAr ? 'كافة العقود المفسوخة' : 'All Branches', count: rescissions.length },
          { id: 'Pre-Delivery', label: isAr ? 'فسخ قبل التسليم (غرامة ١٠٪)' : 'Pre-Delivery', count: kpis.preDeliveryCount },
          { id: 'Post-Delivery', label: isAr ? 'فسخ بعد التسليم (تسوية شاملة)' : 'Post-Delivery', count: kpis.postDeliveryCount }
        ]}
        activeTab={branchFilter}
        onTabChange={(tabId) => {
          setBranchFilter(tabId as any);
          setCurrentPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder={isAr ? 'بحث برقم العقد، كود التسوية، أو اسم العميل...' : 'Search rescissions...'}
        sortBy={sortBy}
        onSortChange={(val) => {
          setSortBy(val as any);
          setCurrentPage(1);
        }}
        sortOptions={[
          { value: 'date_desc', label: isAr ? 'التاريخ: الأحدث الأول' : 'Newest Date' },
          { value: 'date_asc', label: isAr ? 'التاريخ: الأقدم الأول' : 'Oldest Date' },
          { value: 'refund_desc', label: isAr ? 'المبلغ المسترد: الأكبر الأول' : 'Highest Net Refund' },
          { value: 'refund_asc', label: isAr ? 'المبلغ المسترد: الأقل الأول' : 'Lowest Net Refund' },
          { value: 'penalty_desc', label: isAr ? 'الغرامة: الأكبر الأول' : 'Highest Penalty Retained' },
          { value: 'gross_desc', label: isAr ? 'سعر العقد: الأكبر الأول' : 'Highest Gross Contract' }
        ]}
        sortAriaLabel={isAr ? 'ترتيب العقود الملغاة' : 'Sort Rescissions'}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode as any)}
        isAr={isAr}
      />

      {/* 4. Main Content: Cards or Dense Table */}
      {filteredRescissions.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--zf2-border-subtle, #e2e8f0)',
          borderRadius: '12px',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <ShieldAlert size={36} color="var(--erp-accent)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, color: 'var(--erp-text-title)', fontSize: '0.88rem', fontWeight: 700 }}>
            {isAr ? 'لا توجد عقود مفسوخة مطابقة للبحث أو الفلتر' : 'No matching rescinded contracts recorded'}
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
            {isAr ? 'كافة العقود المسجلة سارية ومنتظمة دون أي تسويات فسخ مسجلة.' : 'All registered contracts remain in active status.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div 
          className={styles.tableCard}
          style={{
            maxWidth: '100%',
            width: '100%',
            minWidth: 0,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            boxSizing: 'border-box'
          }}
        >
          <table className={styles.table} style={{ minWidth: '1160px', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '120px', whiteSpace: 'nowrap' }}>{isAr ? 'كود التسوية' : 'Rescission ID'}</th>
                <th style={{ minWidth: '200px' }}>{isAr ? 'الشقة والعقد والمشروع' : 'Contract & Property'}</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>{isAr ? 'المشتري / العميل' : 'Customer'}</th>
                <th style={{ minWidth: '140px', textAlign: 'center', whiteSpace: 'nowrap' }}>{isAr ? 'مرحلة الفسخ' : 'Branch'}</th>
                <th style={{ minWidth: '120px', textAlign: isAr ? 'left' : 'right', whiteSpace: 'nowrap' }}>{isAr ? 'إجمالي قيمة العقد' : 'Gross Value'}</th>
                <th style={{ minWidth: '115px', textAlign: isAr ? 'left' : 'right', whiteSpace: 'nowrap' }}>{isAr ? 'المسدد من العميل' : 'Cash Collected'}</th>
                <th style={{ minWidth: '135px', textAlign: isAr ? 'left' : 'right', whiteSpace: 'nowrap', color: 'var(--erp-accent)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>{isAr ? 'غرامة الفسخ (١٠٪)' : 'Penalty Retained'}</span>
                  </span>
                </th>
                <th style={{ minWidth: '125px', textAlign: isAr ? 'left' : 'right', whiteSpace: 'nowrap', color: '#047857' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>{isAr ? 'المسترد للعميل' : 'Net Refund'}</span>
                  </span>
                </th>
                <th style={{ minWidth: '100px', textAlign: 'center', whiteSpace: 'nowrap' }}>{isAr ? 'حالة الوحدة' : 'Unit State'}</th>
                <th style={{ width: '95px', textAlign: 'center', whiteSpace: 'nowrap' }}>{isAr ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRescissions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                    {isAr ? 'لا توجد عقود مفسوخة مطابقة للبحث أو الفلتر المالي الحالي.' : 'No rescinded contracts match the current filter.'}
                  </td>
                </tr>
              ) : (
                paginatedRescissions.map(r => {
                  const linked = contracts.find(ct => ct.contract_id === r.contract_id);
                  const refundInfo = getRescissionRefundInfo(r);
                  const propertyTitle = linked?.property_id ? (propertyMap.get(linked.property_id)?.title_ar || propertyMap.get(linked.property_id)?.title_en) : '';
                  const buyerDisplayName = isAr ? localizeBuyerName(linked?.buyer_name || 'عميل مباشر') : (linked?.buyer_name || 'Direct Client');

                  // Deduplicate unit_id and propertyTitle so it never prints twice
                  const unitIdStr = linked?.unit_id || '';
                  const propTitleStr = propertyTitle || '';
                  let displayUnit = unitIdStr;
                  let displaySubProperty = '';

                  if (propTitleStr && unitIdStr) {
                    if (unitIdStr.trim() === propTitleStr.trim() || unitIdStr.includes(propTitleStr)) {
                      displayUnit = unitIdStr;
                    } else if (propTitleStr.includes(unitIdStr)) {
                      displayUnit = propTitleStr;
                    } else {
                      displayUnit = unitIdStr;
                      displaySubProperty = propTitleStr;
                    }
                  } else {
                    displayUnit = unitIdStr || propTitleStr || (isAr ? 'وحدة سكنية' : 'Property Unit');
                  }

                  return (
                    <tr 
                      key={r.rescission_id} 
                      onClick={() => onInspectRescission(r)} 
                      style={{ cursor: 'pointer' }}
                    >
                      {/* 1. Rescission ID */}
                      <td style={{ whiteSpace: 'nowrap', width: '120px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: 'var(--erp-accent)',
                          background: 'color-mix(in srgb, var(--erp-accent) 6%, transparent)',
                          border: '1px solid color-mix(in srgb, var(--erp-accent) 20%, transparent)',
                          borderRadius: '6px',
                          padding: '0.2rem 0.5rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <RotateCcw size={11} color="var(--erp-accent)" />
                          <span>#RS-{r.rescission_id.slice(0, 8).toUpperCase()}</span>
                        </span>
                      </td>

                      {/* 2. Contract, Unit & Property */}
                      <td style={{ minWidth: '200px', maxWidth: '300px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.35rem', 
                            fontWeight: 800, 
                            color: '#0f172a', 
                            fontSize: '0.84rem', 
                            lineHeight: 1.35 
                          }}>
                            <Building2 size={13} color="var(--erp-accent)" style={{ flexShrink: 0 }} />
                            <span 
                              style={{ 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis' 
                              }}
                              title={displayUnit}
                            >
                              {displayUnit}
                            </span>
                            {displaySubProperty && (
                              <span 
                                style={{ 
                                  color: '#475569', 
                                  fontWeight: 700, 
                                  fontSize: '0.76rem',
                                  whiteSpace: 'nowrap', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis',
                                  flexShrink: 0
                                }}
                                title={displaySubProperty}
                              >
                                • {displaySubProperty}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <FileText size={11} color="var(--erp-accent)" />
                            <span>{isAr ? 'عقد رقم: ' : 'Contract #'}</span>
                            <span style={{ fontWeight: 800, color: '#0f172a' }}>
                              #{linked?.contract_number || r.contract_id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Customer */}
                      <td style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84rem' }}>
                          {buyerDisplayName}
                        </div>
                      </td>

                      {/* 4. Settlement Branch Badge */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', minWidth: '140px' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: r.branch === 'Pre-Delivery' ? 'var(--erp-accent-hover)' : '#b45309',
                          background: r.branch === 'Pre-Delivery' ? 'rgba(30, 64, 175, 0.08)' : 'rgba(180, 83, 9, 0.08)',
                          border: `1px solid ${r.branch === 'Pre-Delivery' ? 'rgba(30, 64, 175, 0.22)' : 'rgba(180, 83, 9, 0.22)'}`,
                          padding: '0.22rem 0.65rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.branch === 'Pre-Delivery' ? 'var(--erp-accent-hover)' : '#b45309' }} />
                          <span>{r.branch === 'Pre-Delivery' ? (isAr ? 'قبل الاستلام (غرامة ١٠٪)' : 'Pre-Delivery (10% Floor)') : (isAr ? 'بعد الاستلام (تسوية شاملة)' : 'Post-Delivery (Full Audit)')}</span>
                        </span>
                      </td>

                      {/* 5. Gross Contract Value */}
                      <td style={{ whiteSpace: 'nowrap', minWidth: '120px', textAlign: isAr ? 'left' : 'right' }}>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>
                          <MoneyCell amount={r.gross_contract_value} isAr={isAr} />
                        </strong>
                      </td>

                      {/* 6. Collected Cash */}
                      <td style={{ whiteSpace: 'nowrap', minWidth: '115px', textAlign: isAr ? 'left' : 'right' }}>
                        <span style={{ color: '#334155', fontWeight: 700 }}>
                          <MoneyCell amount={r.total_cash_collected} isAr={isAr} />
                        </span>
                      </td>

                      {/* 7. Retained Penalty */}
                      <td style={{ whiteSpace: 'nowrap', minWidth: '135px', textAlign: isAr ? 'left' : 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <strong style={{ color: 'var(--erp-accent)', fontWeight: 800 }}>
                            <MoneyCell amount={r.penalty_retained} isAr={isAr} highlight />
                          </strong>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: 'var(--erp-accent)',
                            background: 'color-mix(in srgb, var(--erp-accent) 10%, transparent)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            border: '1px solid color-mix(in srgb, var(--erp-accent) 25%, transparent)'
                          }}>
                            {isAr ? '١٠٪' : '10%'}
                          </span>
                        </div>
                      </td>

                      {/* 8. Net Refund Liability & Outstanding */}
                      <td style={{ whiteSpace: 'nowrap', minWidth: '135px', textAlign: isAr ? 'left' : 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: '#047857', fontWeight: 800 }}>
                            <MoneyCell amount={r.net_refund_liability} isAr={isAr} />
                          </strong>
                          {refundInfo.paidSum.gt(0) && (
                            <span style={{ fontSize: '0.68rem', color: refundInfo.outstandingRefund.gt(0) ? '#b45309' : '#059669', fontWeight: 700 }}>
                              {isAr ? 'المتبقي: ' : 'Rem: '}
                              <MoneyCell amount={refundInfo.outstandingRefund.toFixed(2)} isAr={isAr} />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 9. Unit State */}
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'center', minWidth: '100px' }}>
                        <StatusBadge domain="unit" status={r.unit_state} isAr={isAr} />
                      </td>

                      {/* 10. Action Button */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', minWidth: '145px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                          {refundInfo.outstandingRefund.gt(0) && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayRefund(r)}
                              style={{
                                background: '#059669',
                                border: 'none',
                                color: '#ffffff',
                                borderRadius: '7px',
                                padding: '0.32rem 0.65rem',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={isAr ? 'سداد المسترد للعميل' : 'Pay Refund'}
                            >
                              <DollarSign size={12} color="#ffffff" />
                              <span>{isAr ? 'سداد المسترد' : 'Pay refund'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onInspectRescission(r)}
                            style={{
                              background: 'color-mix(in srgb, var(--erp-accent) 5%, transparent)',
                              border: '1px solid color-mix(in srgb, var(--erp-accent) 28%, transparent)',
                              color: 'var(--erp-accent)',
                              borderRadius: '7px',
                              padding: '0.32rem 0.65rem',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title={isAr ? 'عرض تفاصيل الفسخ وحساب المسترد' : 'Inspect Rescission Settlement'}
                          >
                            <Eye size={12} color="var(--erp-accent)" />
                            <span>{isAr ? 'عرض' : 'Inspect'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {paginatedRescissions.map(r => {
            const linked = contracts.find(ct => ct.contract_id === r.contract_id);
            const propertyTitle = linked?.property_id ? (propertyMap.get(linked.property_id)?.title_ar || propertyMap.get(linked.property_id)?.title_en) : '';
            const buyerDisplayName = isAr ? localizeBuyerName(linked?.buyer_name || 'عميل مباشر') : (linked?.buyer_name || 'Direct Client');
            const refundInfo = getRescissionRefundInfo(r);

            return (
              <div 
                key={r.rescission_id}
                onClick={() => onInspectRescission(r)}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--zf2-border-subtle, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: 'var(--erp-accent)',
                      background: 'var(--erp-accent-tint)',
                      border: '1px solid color-mix(in srgb, var(--erp-accent) 20%, transparent)',
                      borderRadius: '6px',
                      padding: '0.15rem 0.45rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      marginBottom: '0.4rem',
                      whiteSpace: 'nowrap'
                    }}>
                      <RotateCcw size={10} color="var(--erp-accent)" />
                      <span>#RS-{r.rescission_id.slice(0, 8).toUpperCase()}</span>
                    </span>
                    <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--erp-text-title)', lineHeight: 1.4 }}>
                      {buyerDisplayName}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      <Building2 size={12} color="var(--erp-accent)" />
                      <span style={{ fontWeight: 700, color: '#334155' }}>
                        {linked?.unit_id || (isAr ? 'شقة' : 'Property Unit')}
                      </span>
                      {propertyTitle && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#475569' }}>{propertyTitle}</span>
                        </>
                      )}
                      {linked?.contract_number && (
                        <>
                          <span>•</span>
                          <span style={{
                            fontVariantNumeric: 'tabular-nums',
                            color: 'var(--erp-accent)',
                            fontWeight: 800
                          }}>
                            #{linked.contract_number}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <StatusBadge domain="unit" status={r.unit_state} isAr={isAr} />
                </div>

                <div style={{
                  background: '#fafbfc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))',
                  gap: '0.5rem',
                  fontSize: '0.75rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>{isAr ? 'قيمة العقد:' : 'Gross:'}</span>
                    <strong style={{ color: '#0f172a' }}><MoneyCell amount={r.gross_contract_value} isAr={isAr} /></strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>{isAr ? 'المسدد من العميل:' : 'Collected:'}</span>
                    <strong style={{ color: '#0f172a' }}><MoneyCell amount={r.total_cash_collected} isAr={isAr} /></strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--erp-accent)', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>{isAr ? 'غرامة الفسخ:' : 'Penalty:'}</span>
                    <strong style={{ color: 'var(--erp-accent)', fontWeight: 800 }}><MoneyCell amount={r.penalty_retained} isAr={isAr} highlight /></strong>
                  </div>
                  <div>
                    <span style={{ color: '#047857', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>{isAr ? 'المسترد الأصلي:' : 'Original Refund:'}</span>
                    <strong style={{ color: '#047857', fontWeight: 800 }}><MoneyCell amount={r.net_refund_liability} isAr={isAr} /></strong>
                  </div>
                  <div>
                    <span style={{ color: refundInfo.outstandingRefund.gt(0) ? '#dc2626' : '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                      {isAr ? 'المتبقي للرد:' : 'Outstanding:'}
                    </span>
                    <strong style={{ color: refundInfo.outstandingRefund.gt(0) ? '#dc2626' : '#64748b', fontWeight: 800 }}>
                      <MoneyCell amount={refundInfo.outstandingRefund.toFixed(2)} isAr={isAr} />
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.45rem', marginTop: 'auto' }}>
                  {refundInfo.outstandingRefund.gt(0) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPayRefund(r);
                      }}
                      style={{
                        flex: 1,
                        background: '#059669',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <DollarSign size={13} color="#ffffff" />
                      <span>{isAr ? 'سداد المسترد' : 'Pay refund'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectRescission(r);
                    }}
                    style={{
                      flex: 1,
                      background: 'color-mix(in srgb, var(--erp-accent) 5%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--erp-accent) 28%, transparent)',
                      color: 'var(--erp-accent)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Eye size={13} color="var(--erp-accent)" />
                    <span>{isAr ? 'عرض التفاصيل' : 'Inspect'}</span>
                  </button>
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
        totalItems={sortedRescissions.length}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={sz => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
        isAr={isAr}
        itemLabel={{ ar: 'تسوية فسخ', en: 'rescissions' }}
      />

      {/* Contract Selection Modal for Rescission */}
      {isContractPickerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsContractPickerOpen(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.15rem 1.35rem',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(220, 38, 38, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <RotateCcw size={18} color="#dc2626" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--erp-text-title)' }}>
                    {isAr ? 'اختيار عقد للتسوية والفسخ' : 'Select Contract for Rescission'}
                  </h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                    {isAr ? 'اختر العقد المطلوب حساب غرامة الفسخ ورد مستحقاته' : 'Select contract to compute forfeiture & refunds'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsContractPickerOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0.85rem 1.35rem', borderBottom: '1px solid #f1f5f9' }}>
              <input
                type="text"
                placeholder={isAr ? 'ابحث باسم العميل أو رقم العقد أو الوحدة...' : 'Search by buyer, contract #, unit...'}
                value={pickerSearchQuery}
                onChange={(e) => setPickerSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            <div style={{ overflowY: 'auto', padding: '0.75rem 1.35rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {contracts
                .filter(c => c.status !== 'Rescinded')
                .filter(c => {
                  if (!pickerSearchQuery.trim()) return true;
                  const q = pickerSearchQuery.toLowerCase();
                  return (
                    (c.buyer_name || '').toLowerCase().includes(q) ||
                    (c.contract_number || '').toLowerCase().includes(q) ||
                    (c.unit_id || '').toLowerCase().includes(q)
                  );
                })
                .map(c => {
                  const gross = D(c.gross_contract_value || '0');
                  const col = D(c.total_cash_collected || '0');
                  return (
                    <div
                      key={c.contract_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                          {c.buyer_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {isAr ? 'عقد' : 'Contract'} #{c.contract_number} • {isAr ? 'وحدة' : 'Unit'} {c.unit_id}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700, marginTop: '0.2rem' }}>
                          {isAr ? 'المحصل كاش:' : 'Collected:'} {col.formatEGP(isAr)} / {gross.formatEGP(isAr)}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => {
                          setIsContractPickerOpen(false);
                          onOpenRescissionModal?.(c);
                        }}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <RotateCcw size={12} />
                        <span>{isAr ? 'بدء التسوية والفسخ' : 'Rescind'}</span>
                      </button>
                    </div>
                  );
                })}
              {contracts.filter(c => c.status !== 'Rescinded').length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.82rem' }}>
                  {isAr ? 'لا توجد عقود سارية قابلة للفسخ' : 'No active contracts available for rescission'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pay Refund Confirm Modal */}
      {payRefundTarget && (
        <ZFModalShell
          isOpen={!!payRefundTarget}
          onClose={() => setPayRefundTarget(null)}
          title={isAr ? 'سداد مسترد الفسخ للعميل' : 'Pay Rescission Refund'}
          subtitle={
            isAr
              ? `عقد #${contracts.find(c => c.contract_id === payRefundTarget.contract_id)?.contract_number || payRefundTarget.contract_id.slice(0, 8)} — العميل: ${localizeBuyerName(contracts.find(c => c.contract_id === payRefundTarget.contract_id)?.buyer_name || '')}`
              : `Contract #${contracts.find(c => c.contract_id === payRefundTarget.contract_id)?.contract_number || payRefundTarget.contract_id.slice(0, 8)} — Buyer: ${contracts.find(c => c.contract_id === payRefundTarget.contract_id)?.buyer_name || 'Client'}`
          }
          icon={<DollarSign size={20} color="#059669" />}
          maxWidth="560px"
          isAr={isAr}
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', width: '100%' }}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setPayRefundTarget(null)}
                disabled={isMutating}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmPayRefund}
                disabled={isMutating || D(refundAmount || '0').lte(0)}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: isMutating || D(refundAmount || '0').lte(0) ? 'not-allowed' : 'pointer',
                  opacity: isMutating || D(refundAmount || '0').lte(0) ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {isMutating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>{isAr ? 'جاري المعالجة والترحيل...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>{isAr ? 'تأكيد وترحيل السداد' : 'Confirm Payout'}</span>
                  </>
                )}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Refund Balances Summary */}
            {(() => {
              const info = getRescissionRefundInfo(payRefundTarget);
              return (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.65rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                      {isAr ? 'إجمالي المسترد الأصلي:' : 'Original Refund:'}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                      {info.originalRefund.formatEGP(isAr)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                      {isAr ? 'المسدد سابقاً:' : 'Already Paid:'}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#047857', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                      {info.paidSum.formatEGP(isAr)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700 }}>
                      {isAr ? 'المتبقي المستحق للرد:' : 'Outstanding Refund:'}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#dc2626', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem' }}>
                      {info.outstandingRefund.formatEGP(isAr)}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Error banner if any */}
            {refundError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}
              >
                <AlertCircle size={16} />
                <span>{refundError}</span>
              </div>
            )}

            {/* Inputs: Amount & Source */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'مبلغ السداد (ج.م) *' : 'Payout Amount (EGP) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={getRescissionRefundInfo(payRefundTarget).outstandingRefund.toString()}
                  value={refundAmount}
                  onChange={(e) => {
                    setRefundAmount(e.target.value);
                    setRefundError('');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  {isAr ? 'يمكن تعديل المبلغ للسداد الجزئي بما لا يتجاوز المتبقي' : 'Editable for partial refund up to outstanding balance'}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'مصدر الصرف (حساب السداد) *' : 'Payment Source Account *'}
                </label>
                <select
                  value={refundSource}
                  onChange={(e) => setRefundSource(e.target.value as '101000' | '102000')}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    outline: 'none',
                    background: '#ffffff'
                  }}
                >
                  <option value="101000">{isAr ? '101000 - الخزينة الرئيسية (Main Safe)' : '101000 - Main Safe'}</option>
                  <option value="102000">{isAr ? '102000 - الحساب البنكي (Bank Account)' : '102000 - Bank Account'}</option>
                </select>
                <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  {isAr ? 'الخصم من الخزينة أو البنك' : 'Disburse from Main Safe or Bank'}
                </span>
              </div>
            </div>

            {/* Inputs: Date & Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'تاريخ السداد *' : 'Payment Date *'}
                </label>
                <input
                  type="date"
                  value={refundDate}
                  onChange={(e) => setRefundDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'ملاحظات السداد (اختياري)' : 'Payment Notes (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: شيك مصرفي رقم / تحويل...' : 'e.g. Cheque / wire ref...'}
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Live Accounting Preview (Dr 206200 / Cr 101000|102000) */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                  {isAr ? 'معاينة القيد المحاسبي المتوازن (Cash Disbursal):' : 'Balanced Journal Entry Preview:'}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#047857', background: '#d1fae5', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  {isAr ? 'متزن Dr = Cr' : 'Balanced Dr = Cr'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.74rem', fontVariantNumeric: 'tabular-nums' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.5rem', background: '#ffffff', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>
                    {isAr ? 'مدين (Dr) 206200 — أمانات ورد مستحقات عملاء الفسخ' : 'Dr 206200 — Customer Refund Liability'}
                  </span>
                  <strong style={{ color: '#047857' }}>
                    {D(refundAmount || '0').formatEGP(isAr)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0.5rem', background: '#ffffff', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>
                    {refundSource === '101000'
                      ? (isAr ? 'دائن (Cr) 101000 — الخزينة الرئيسية' : 'Cr 101000 — Main Safe')
                      : (isAr ? 'دائن (Cr) 102000 — الحساب البنكي' : 'Cr 102000 — Bank Account')}
                  </span>
                  <strong style={{ color: '#dc2626' }}>
                    {D(refundAmount || '0').formatEGP(isAr)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </ZFModalShell>
      )}
    </div>
  );
};
