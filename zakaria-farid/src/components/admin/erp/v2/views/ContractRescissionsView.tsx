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
  ArrowRight,
  ArrowUpDown,
  TrendingUp,
  Building2,
  Scale,
  Sparkles
} from 'lucide-react';
import { ERPRescissionRecord, ERPContract } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { StatusBadge } from '@/components/erp/StatusBadge';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
import { ZFErpBreadcrumb } from '../common/ZFErpBreadcrumb';
import styles from '../ZFWorkstationShell.module.css';

interface ContractRescissionsViewProps {
  rescissions: ERPRescissionRecord[];
  contracts: ERPContract[];
  properties?: Property[];
  isAr?: boolean;
  onInspectRescission: (rescission: ERPRescissionRecord) => void;
  onNavigateToContracts: () => void;
}

export const ContractRescissionsView: React.FC<ContractRescissionsViewProps> = ({
  rescissions,
  contracts,
  properties = [],
  isAr = true,
  onInspectRescission,
  onNavigateToContracts
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [branchFilter, setBranchFilter] = useState<'all' | 'Pre-Delivery' | 'Post-Delivery'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'refund_desc' | 'refund_asc' | 'penalty_desc' | 'gross_desc'>('date_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Properties map for building title lookup
  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>();
    properties.forEach(p => map.set(p.id, p));
    return map;
  }, [properties]);

  // 4 Executive KPIs
  const kpis = useMemo(() => {
    let totalPenalty = D(0);
    let totalRefund = D(0);
    let totalGrossVoid = D(0);
    let preDeliveryCount = 0;
    let postDeliveryCount = 0;

    rescissions.forEach(r => {
      totalPenalty = totalPenalty.plus(r.penalty_retained || '0');
      totalRefund = totalRefund.plus(r.net_refund_liability || '0');
      totalGrossVoid = totalGrossVoid.plus(r.gross_contract_value || '0');
      if (r.branch === 'Pre-Delivery') preDeliveryCount++;
      if (r.branch === 'Post-Delivery') postDeliveryCount++;
    });

    return {
      totalPenalty,
      totalRefund,
      totalGrossVoid,
      count: rescissions.length,
      preDeliveryCount,
      postDeliveryCount
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
      <div className={styles.stageHeader}>
        <div className={styles.stageTitleArea}>
          <ZFErpBreadcrumb sectionTitle={isAr ? 'فسخ العقود والتسويات القانونية' : 'Contract Rescissions & Settlements'} icon={<Scale size={13} color="#946f23" />} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span>{isAr ? 'فسخ وإلغاء العقود' : 'Contract Rescissions'}</span>
              <span style={{ 
                background: 'linear-gradient(135deg, #946f23 0%, #c5a059 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                fontWeight: 900
              }}>
                {isAr ? 'والتسويات المالية القانونية' : '& Forfeiture Floor'}
              </span>
            </h1>
            <span style={{
              background: 'rgba(197, 160, 89, 0.09)',
              border: '1px solid rgba(197, 160, 89, 0.28)',
              color: '#946f23',
              padding: '0.2rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Sparkles size={11} color="#946f23" />
              <span>{isAr ? 'تسويات قانونية معتمدة' : 'Audited Legal Settlement'}</span>
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
            {isAr ? (
              <>
                تسوية العقود القانونية: خصم <strong style={{ color: '#946f23' }}>غرامة الفسخ المستحقة (10%)</strong>، واحتساب <strong style={{ color: '#047857' }}>صافي التزامات الرد للعميل (حساب 206200)</strong>، وتطبيق <strong style={{ color: '#946f23' }}>حد حظر المطالبة بعجز (Forfeiture Floor)</strong> وإعادة إدراج الشقق ضمن محفظة المعروض المتاح.
              </>
            ) : (
              'Official registry for rescinded contracts, 10% forfeiture retention, customer refund liability (206200), and unit repossession.'
            )}
          </p>
        </div>

        <div className={styles.stageActions}>
          <button
            onClick={onNavigateToContracts}
            style={{
              background: 'rgba(197, 160, 89, 0.04)',
              border: '1px solid rgba(197, 160, 89, 0.3)',
              color: '#946f23',
              borderRadius: '10px',
              padding: '0.6rem 1.1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 1px 2px rgba(197, 160, 89, 0.06)',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{isAr ? 'الرجوع لعقود البيع' : 'Back to Active Contracts'}</span>
            <ArrowRight size={14} color="#946f23" />
          </button>
        </div>
      </div>

      {/* 2. ASYMMETRIC LEGAL SETTLEMENT RADAR (Legal Disputes Archetype) */}
      <div className={styles.asymmetricBentoGrid}>
        {/* Left / Hero Card: Retained Penalties & Income Yield */}
        <ZFKpiCard
          variant="double-bezel"
          isFlagship={true}
          title={isAr ? 'غرامات الإلغاء المستحقة للشركة' : 'Retained Penalties & Settlement Yield'}
          value={kpis.totalPenalty.formatEGP(isAr)}
          icon={<DollarSign size={20} />}
          accentColor="gold"
          badge={{ text: isAr ? 'غرامات فسخ مستحقة' : 'Retained Earnings', variant: 'gold' }}
          subtitleLabel={isAr ? 'عقود مفسوخة معتمدة' : 'Total Rescissions'}
          subtitleValue={
            <span style={{ color: '#946f23', fontWeight: 800 }}>
              {`${kpis.count} ${isAr ? 'عقود ملغاة قانونياً' : 'deals legally voided'}`}
            </span>
          }
        />

        {/* Right Stack: 2 Compact Telemetry Instruments */}
        <div className={styles.telemetryStack}>
          <ZFKpiCard
            variant="compact"
            title={isAr ? 'صافي التزامات الرد للعميل' : 'Customer Refund Liability'}
            value={kpis.totalRefund.formatEGP(isAr)}
            icon={<CheckCircle2 size={16} />}
            accentColor="emerald"
            badge={{ text: isAr ? 'التزام رد نقدي' : 'Refund Liability', variant: 'positive' }}
            subtitleLabel={isAr ? 'موقف الفلوس' : 'Status'}
            subtitleValue={isAr ? 'التزام رد نقدي (حساب 206200)' : 'due for refund'}
          />

          <ZFKpiCard
            variant="compact"
            title={isAr ? 'قيمة الأصول والشقق المستردة' : 'Voided Sales & Asset Recovery'}
            value={kpis.totalGrossVoid.formatEGP(isAr)}
            icon={<Building2 size={16} color="#946f23" />}
            accentColor="gold"
            badge={{ text: isAr ? 'مخزون مسترد' : 'Asset Recovery', variant: 'gold' }}
            subtitleLabel={isAr ? 'موقف الشقق' : 'Inventory'}
            subtitleValue={isAr ? 'شقق أعيدت للمعروض المتاح للبيع' : 'restored to inventory'}
          />
        </div>
      </div>

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
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <ShieldAlert size={36} color="#946f23" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
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
                <th style={{ minWidth: '135px', textAlign: isAr ? 'left' : 'right', whiteSpace: 'nowrap', color: '#946f23' }}>
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
                          color: '#946f23',
                          background: 'rgba(197, 160, 89, 0.06)',
                          border: '1px solid rgba(197, 160, 89, 0.2)',
                          borderRadius: '6px',
                          padding: '0.2rem 0.5rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <RotateCcw size={11} color="#946f23" />
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
                            <Building2 size={13} color="#946f23" style={{ flexShrink: 0 }} />
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
                            <FileText size={11} color="#946f23" />
                            <span>{isAr ? 'عقد رقم: ' : 'Contract #'}</span>
                            <span style={{ fontWeight: 800, color: '#946f23' }}>
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
                          color: r.branch === 'Pre-Delivery' ? '#1e40af' : '#b45309',
                          background: r.branch === 'Pre-Delivery' ? 'rgba(30, 64, 175, 0.08)' : 'rgba(180, 83, 9, 0.08)',
                          border: `1px solid ${r.branch === 'Pre-Delivery' ? 'rgba(30, 64, 175, 0.22)' : 'rgba(180, 83, 9, 0.22)'}`,
                          padding: '0.22rem 0.65rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.branch === 'Pre-Delivery' ? '#1e40af' : '#b45309' }} />
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
                          <strong style={{ color: '#946f23', fontWeight: 800 }}>
                            <MoneyCell amount={r.penalty_retained} isAr={isAr} highlight />
                          </strong>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: '#946f23',
                            background: 'rgba(197, 160, 89, 0.1)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(197, 160, 89, 0.25)'
                          }}>
                            {isAr ? '١٠٪' : '10%'}
                          </span>
                        </div>
                      </td>

                      {/* 8. Net Refund Liability */}
                      <td style={{ whiteSpace: 'nowrap', minWidth: '125px', textAlign: isAr ? 'left' : 'right' }}>
                        <strong style={{ color: '#047857', fontWeight: 800 }}>
                          <MoneyCell amount={r.net_refund_liability} isAr={isAr} />
                        </strong>
                      </td>

                      {/* 9. Unit State */}
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'center', minWidth: '100px' }}>
                        <StatusBadge domain="unit" status={r.unit_state} isAr={isAr} />
                      </td>

                      {/* 10. Action Button */}
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '95px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onInspectRescission(r)}
                          style={{
                            background: 'rgba(197, 160, 89, 0.05)',
                            border: '1px solid rgba(197, 160, 89, 0.28)',
                            color: '#946f23',
                            borderRadius: '7px',
                            padding: '0.32rem 0.75rem',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(197, 160, 89, 0.05)',
                            transition: 'all 0.15s ease'
                          }}
                          title={isAr ? 'عرض تفاصيل الفسخ وحساب المسترد' : 'Inspect Rescission Settlement'}
                        >
                          <Eye size={12} color="#946f23" />
                          <span>{isAr ? 'عرض التسوية' : 'Inspect'}</span>
                        </button>
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

            return (
              <div 
                key={r.rescission_id}
                onClick={() => onInspectRescission(r)}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--zf2-border-subtle, #e2e8f0)',
                  borderRadius: '16px',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)',
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
                      color: '#946f23',
                      background: 'rgba(197, 160, 89, 0.06)',
                      border: '1px solid rgba(197, 160, 89, 0.2)',
                      borderRadius: '6px',
                      padding: '0.15rem 0.45rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      marginBottom: '0.4rem',
                      whiteSpace: 'nowrap'
                    }}>
                      <RotateCcw size={10} color="#946f23" />
                      <span>#RS-{r.rescission_id.slice(0, 8).toUpperCase()}</span>
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                      {buyerDisplayName}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      <Building2 size={12} color="#946f23" />
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
                            color: '#946f23',
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
                  background: '#fafaf9',
                  border: '1px solid rgba(197, 160, 89, 0.16)',
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
                    <span style={{ color: '#946f23', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>{isAr ? 'غرامة الفسخ (١٠٪):' : 'Penalty:'}</span>
                    <strong style={{ color: '#946f23', fontWeight: 800 }}><MoneyCell amount={r.penalty_retained} isAr={isAr} highlight /></strong>
                  </div>
                  <div>
                    <span style={{ color: '#047857', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>{isAr ? 'المسترد للعميل:' : 'Refund:'}</span>
                    <strong style={{ color: '#047857', fontWeight: 800 }}><MoneyCell amount={r.net_refund_liability} isAr={isAr} /></strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectRescission(r);
                  }}
                  style={{
                    background: 'rgba(197, 160, 89, 0.05)',
                    border: '1px solid rgba(197, 160, 89, 0.28)',
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
                    boxShadow: '0 1px 2px rgba(197, 160, 89, 0.04)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Eye size={13} color="#946f23" />
                  <span>{isAr ? 'عرض تفاصيل الإلغاء والتسوية' : 'Inspect Rescission'}</span>
                </button>
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
    </div>
  );
};
