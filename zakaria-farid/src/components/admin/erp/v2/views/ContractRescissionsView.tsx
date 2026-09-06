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
  TrendingUp
} from 'lucide-react';
import { ERPRescissionRecord, ERPContract } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { StatusBadge } from '@/components/erp/StatusBadge';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
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
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'refund_desc' | 'refund_asc' | 'penalty_desc' | 'gross_desc'>('date_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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
    <div className={styles.stageContainer}>
      {/* 1. Header & Stage Breadcrumb */}
      <div className={styles.stageHeader}>
        <div className={styles.stageTitleArea}>
          <div className={styles.stageBreadcrumb}>
            <span>FIN-OS</span>
            <span>/</span>
            <span>{isAr ? 'إلغاء العقود وترجيع الفلوس' : 'Contract Rescissions'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className={styles.stageTitle}>
              {isAr ? 'إلغاء العقود وترجيع الفلوس' : 'Contract Rescissions & Forfeiture Floor'}
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
              {isAr ? 'تسوية عقود وإعادة الشقق للمعروض' : 'Audited Legal Settlement'}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {isAr 
              ? 'تسوية العقود الملغاة: خصم غرامة الإلغاء، حساب الفلوس اللي هترجع للعميل، وتنزيل الشقة للبيع تاني.' 
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
            <span>{isAr ? 'الرجوع لعقود البيع' : 'Back to Active Contracts'}</span>
            <ArrowRight size={14} />
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
          badge={{ text: isAr ? 'غرامات إلغاء' : 'Retained Earnings', variant: 'gold' }}
          subtitleLabel={isAr ? 'عقود اتلغت' : 'Total Rescissions'}
          subtitleValue={`${kpis.count} ${isAr ? 'عقود ملغاة' : 'deals legally voided'}`}
        />

        {/* Right Stack: 2 Compact Telemetry Instruments */}
        <div className={styles.telemetryStack}>
          <ZFKpiCard
            variant="compact"
            title={isAr ? 'الفلوس اللي هترجع للعميل' : 'Customer Refund Liability'}
            value={kpis.totalRefund.formatEGP(isAr)}
            icon={<CheckCircle2 size={16} />}
            accentColor="emerald"
            subtitleLabel={isAr ? 'موقف الفلوس' : 'Status'}
            subtitleValue={isAr ? 'باقي الفلوس اللي هترجع بعد خصم الغرامة' : 'due for refund'}
          />

          <ZFKpiCard
            variant="compact"
            title={isAr ? 'قيمة الشقق اللي رجعت للمعروض' : 'Voided Sales & Asset Recovery'}
            value={kpis.totalGrossVoid.formatEGP(isAr)}
            icon={<FileText size={16} />}
            accentColor="rose"
            subtitleLabel={isAr ? 'موقف الشقق' : 'Inventory'}
            subtitleValue={isAr ? 'شقق رجعت للمعروض ومتاحة للبيع' : 'restored to inventory'}
          />
        </div>
      </div>

      {/* 3. Toolbar: Filter Tabs, Sort, Search & View Switcher */}
      <ZFFilterToolbar
        tabs={[
          { id: 'all', label: isAr ? 'كل العقود الملغاة' : 'All Branches', count: rescissions.length },
          { id: 'Pre-Delivery', label: isAr ? 'إلغاء قبل استلام الشقة' : 'Pre-Delivery', count: kpis.preDeliveryCount },
          { id: 'Post-Delivery', label: isAr ? 'إلغاء بعد استلام الشقة' : 'Post-Delivery', count: kpis.postDeliveryCount }
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
        searchPlaceholder={isAr ? 'دوّر برقم العقد، الشقة، أو اسم العميل...' : 'Search rescissions...'}
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
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <ShieldAlert size={36} color="#946f23" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>
            {isAr ? 'مفيش عقود ملغاة مطابقة للبحث أو الفلتر' : 'No matching rescinded contracts recorded'}
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem' }}>
            {isAr ? 'كل العقود شغالة ومفيش أي إلغاءات مسجلة.' : 'All registered contracts remain in active status.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className={styles.tableCard}>
          <table className={styles.table} style={{ minWidth: '960px' }}>
            <thead>
              <tr>
                <th style={{ width: '80px', whiteSpace: 'nowrap' }}>{isAr ? 'رقم الإلغاء' : 'Rescission ID'}</th>
                <th style={{ minWidth: '160px' }}>{isAr ? 'الشقة ورقم العقد' : 'Contract & Unit'}</th>
                <th style={{ minWidth: '130px' }}>{isAr ? 'العميل' : 'Customer'}</th>
                <th style={{ minWidth: '110px' }}>{isAr ? 'وقت الإلغاء' : 'Branch'}</th>
                <th style={{ minWidth: '100px' }}>{isAr ? 'سعر العقد' : 'Gross (V)'}</th>
                <th style={{ minWidth: '100px' }}>{isAr ? 'المتحصل كاش' : 'Collected (C)'}</th>
                <th style={{ minWidth: '110px' }}>{isAr ? 'غرامة الإلغاء (10%)' : 'Penalty Retained'}</th>
                <th style={{ minWidth: '110px' }}>{isAr ? 'المسترد للعميل' : 'Net Refund'}</th>
                <th style={{ minWidth: '110px' }}>{isAr ? 'حالة الشقة' : 'Unit State'}</th>
                <th style={{ width: '70px', textAlign: 'center' }}>{isAr ? 'تفاصيل' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRescissions.map(r => {
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
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem', lineHeight: 1.4 }}>
                        {linked?.unit_id || (isAr ? 'شقة' : 'Property Unit')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', marginTop: '0.15rem', fontWeight: 600 }}>
                        #{linked?.contract_number || r.contract_id.slice(0, 8)}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#334155' }}>
                      {linked?.buyer_name || '—'}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: r.branch === 'Pre-Delivery' ? '#0369a1' : '#b45309',
                        background: r.branch === 'Pre-Delivery' ? '#f0f9ff' : '#fffbeb',
                        border: `1px solid ${r.branch === 'Pre-Delivery' ? 'rgba(3, 105, 161, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        {r.branch === 'Pre-Delivery' ? (isAr ? 'قبل الاستلام' : 'Pre-Delivery') : (isAr ? 'بعد الاستلام' : 'Post-Delivery')}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong style={{ color: '#0f172a' }}>
                        <MoneyCell amount={r.gross_contract_value} isAr={isAr} />
                      </strong>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#475569', fontWeight: 700 }}>
                        <MoneyCell amount={r.total_cash_collected} isAr={isAr} />
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <strong style={{ color: '#d97706' }}>
                          <MoneyCell amount={r.penalty_retained} isAr={isAr} />
                        </strong>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#d97706',
                          background: 'rgba(217, 119, 6, 0.08)',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px'
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
                    <td style={{ whiteSpace: 'nowrap' }}>
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
                        <span>{isAr ? 'عرض' : 'View'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {paginatedRescissions.map(r => {
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
                      marginBottom: '0.35rem',
                      whiteSpace: 'nowrap',
                      direction: 'ltr',
                      unicodeBidi: 'isolate'
                    }}>
                      #{r.rescission_id.slice(0, 8)}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                      {linked?.unit_id || (isAr ? 'شقة' : 'Property Unit')}
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
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))',
                  gap: '0.5rem',
                  fontSize: '0.75rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{isAr ? 'سعر العقد:' : 'Gross:'}</span>
                    <strong style={{ color: '#0f172a' }}><MoneyCell amount={r.gross_contract_value} isAr={isAr} /></strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{isAr ? 'المتحصل كاش:' : 'Collected:'}</span>
                    <strong style={{ color: '#0f172a' }}><MoneyCell amount={r.total_cash_collected} isAr={isAr} /></strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{isAr ? 'غرامة الإلغاء (10%):' : 'Penalty:'}</span>
                    <strong style={{ color: '#946f23' }}><MoneyCell amount={r.penalty_retained} isAr={isAr} /></strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{isAr ? 'المسترد للعميل:' : 'Refund:'}</span>
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
        itemLabel={{ ar: 'عقد ملغي', en: 'rescissions' }}
      />
    </div>
  );
};
