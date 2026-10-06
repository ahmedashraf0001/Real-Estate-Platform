'use client';

import React, { useState, useMemo } from 'react';
import { usePropertyCosts } from '../../../context/ERPWorkstationContext';
import { 
  Building2, 
  Coins, 
  Receipt, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRightLeft, 
  Search, 
  History,
  Users,
  Eye,
  CheckCircle2,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { ERPContract, ERPPartnerTransaction, ERPPartnerCommitment } from '@/lib/erp/types';
import { 
  computeDynamicBuildingCapital, 
  checkBuildingEquityBalance,
  PartnerFinancialSummary
} from '@/lib/erp/partnersEngine';
import { D } from '@/lib/erp/math';
import { PartnersAnalyticsCharts } from './PartnersAnalyticsCharts';
import styles from '../../ZFWorkstationShell.module.css';

export interface PartnersProjectsViewProps {
  properties: Property[];
  contracts?: ERPContract[];
  transactions?: ERPPartnerTransaction[];
  commitments?: ERPPartnerCommitment[];
  summaries?: PartnerFinancialSummary[];
  selectedBuildingId: string;
  onSelectBuildingId: (id: string) => void;
  isAr?: boolean;
  isMutating?: boolean;
  onOpenInjection: (partnerName?: string, propertyId?: string, commitmentId?: string) => void;
  onOpenPayout: (partnerName?: string) => void;
  onOpenReallocation: (property: Property, sellerName?: string) => void;
  onOpenDossier: (partnerName: string) => void;
  onOpenCommitmentModal?: (propertyId?: string, partnerName?: string) => void;
  onSaveProperty?: (property: Property) => Promise<void> | void;
}

export const PartnersProjectsView: React.FC<PartnersProjectsViewProps> = ({
  properties = [],
  contracts = [],
  transactions = [],
  commitments = [],
  summaries = [],
  selectedBuildingId,
  onSelectBuildingId,
  isAr = true,
  isMutating = false,
  onOpenInjection,
  onOpenPayout,
  onOpenReallocation,
  onOpenDossier,
  onOpenCommitmentModal,
  onSaveProperty,
}) => {
  const propertyCosts = usePropertyCosts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterId, setSelectedFilterId] = useState<'ALL' | string>('ALL');

  // Filter building properties
  const buildingProperties = useMemo(() => {
    return properties.filter(p => p.type === 'building' || (p as any).is_building);
  }, [properties]);

  // Filtered buildings for the canonical table
  const filteredBuildings = useMemo(() => {
    let list = buildingProperties;
    if (selectedFilterId !== 'ALL') {
      list = list.filter(b => b.id === selectedFilterId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b => 
        (b.title_ar && b.title_ar.toLowerCase().includes(q)) ||
        (b.title_en && b.title_en.toLowerCase().includes(q)) ||
        (b.location && b.location.toLowerCase().includes(q))
      );
    }
    return list;
  }, [buildingProperties, selectedFilterId, searchQuery]);

  // Compute metrics for each building row in the canonical table
  const buildingRowsData = useMemo(() => {
    return filteredBuildings.map(b => {
      const bBalance = checkBuildingEquityBalance(b);
      const capInfo = computeDynamicBuildingCapital(b, transactions, propertyCosts);

      // Milestone commitments
      const bCommitments = (commitments || []).filter(c => c.property_id === b.id);
      const committedEgp = bCommitments.reduce((sum, c) => sum.plus(c.committed_amount || 0), D(0));
      const committedPaidEgp = bCommitments.reduce((sum, c) => sum.plus(c.paid_amount || 0), D(0));

      // Unit collections from contracts
      const bContracts = (contracts || []).filter(c => c.property_id === b.id);
      const collectionsEgp = bContracts.reduce((sum, c) => sum.plus(c.total_cash_collected || 0), D(0));

      // Distributions for this building
      const distributionsEgp = transactions
        .filter(t => t.property_id === b.id && t.type === 'PROFIT_DISTRIBUTION')
        .reduce((sum, t) => sum.plus(t.amount || 0), D(0));

      // Required capital
      const requiredCapitalEgp = b.target_budget_egp ? D(b.target_budget_egp) : D(capInfo.impliedTotalCapitalEgp);
      const actualPaidEgp = D(capInfo.totalActualInjectedEgp);

      // Arrears
      const arrearsEgp = capInfo.partnerStatuses.reduce(
        (sum, p) => p.hasArrears ? sum.plus(p.arrearsEgp || 0) : sum,
        D(0)
      );

      // Active partner count
      const partnersCount = bBalance.activePartnersCount || capInfo.partnerStatuses.length || (b.partner_splits?.length || 0);

      // Funding status: consistently computed against requiredCapitalEgp
      const fundingRatio = requiredCapitalEgp.gt(0)
        ? Number(actualPaidEgp.times(100).div(requiredCapitalEgp).toFixed(1))
        : capInfo.fundingRatioPct;

      return {
        building: b,
        balanceReport: bBalance,
        capInfo,
        partnersCount,
        requiredCapitalEgp,
        committedEgp,
        actualPaidEgp,
        arrearsEgp,
        collectionsEgp,
        distributionsEgp,
        fundingRatio
      };
    });
  }, [filteredBuildings, transactions, commitments, contracts, propertyCosts]);

  // Overall totals across displayed rows
  const totals = useMemo(() => {
    let req = D(0);
    let committed = D(0);
    let paid = D(0);
    let arrears = D(0);
    let collections = D(0);
    let distributions = D(0);

    buildingRowsData.forEach(r => {
      req = req.plus(r.requiredCapitalEgp);
      committed = committed.plus(r.committedEgp);
      paid = paid.plus(r.actualPaidEgp);
      arrears = arrears.plus(r.arrearsEgp);
      collections = collections.plus(r.collectionsEgp);
      distributions = distributions.plus(r.distributionsEgp);
    });

    return { req, committed, paid, arrears, collections, distributions };
  }, [buildingRowsData]);

  const allBalanced = useMemo(() => {
    return buildingRowsData.length > 0 && buildingRowsData.every(r => r.balanceReport.isBalanced);
  }, [buildingRowsData]);

  const totalsPartnersCount = useMemo(() => {
    return buildingRowsData.reduce((sum, r) => sum + r.partnersCount, 0);
  }, [buildingRowsData]);

  // Recent activity feed across projects (combining transactions and property reallocations)
  const recentActivityLogs = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      type: 'INJECTION' | 'DISTRIBUTION' | 'REALLOCATION';
      typeLabel: string;
      projectTitle: string;
      partnerName: string;
      amount: string;
      method: string;
    }> = [];

    // 1. Transactions
    transactions.forEach(t => {
      list.push({
        id: t.id || t.transaction_number,
        date: t.date || '',
        type: t.type === 'CAPITAL_INJECTION' ? 'INJECTION' : 'DISTRIBUTION',
        typeLabel: t.type === 'CAPITAL_INJECTION' ? (isAr ? 'ضخ مساهمة' : 'Capital Injection') : (isAr ? 'صرف أرباح' : 'Distribution'),
        projectTitle: t.property_title || (isAr ? 'مشروع استثماري' : 'Project'),
        partnerName: t.partner_name,
        amount: t.amount,
        method: t.payment_method === 'DEBT_OFFSET' ? (isAr ? 'خصم من الأرباح' : 'Offset from profit') :
                t.payment_method === 'CASH_101000' ? (isAr ? 'كاش (خزينة 101000)' : 'Cash (Safe 101000)') :
                t.payment_method === 'INSTAPAY_102000' ? (isAr ? 'إنستاباي (102000)' : 'InstaPay (102000)') : (isAr ? 'بنكي 102000' : 'Bank 102000')
      });
    });

    // 2. Ownership reallocations from properties
    buildingProperties.forEach(prop => {
      if (prop.ownership_history && prop.ownership_history.length > 0) {
        prop.ownership_history.forEach(log => {
          list.push({
            id: log.log_id,
            date: log.effective_date || log.created_at?.slice(0, 10) || '',
            type: 'REALLOCATION',
            typeLabel: log.action_type === 'FULL_INTERNAL_BUYOUT' ? (isAr ? 'تخارج كامل' : 'Buyout') :
                       log.action_type === 'PARTIAL_SALE' ? (isAr ? 'تنازل جزئي' : 'Partial Sale') : (isAr ? 'إحلال شريك' : 'Substitution'),
            projectTitle: prop.title_ar || prop.title_en || (isAr ? 'مشروع عقاري' : 'Building'),
            partnerName: `${log.from_partner_name} ➔ ${log.to_partner_name}`,
            amount: log.transfer_value_egp || '0.00',
            method: isAr ? 'تسوية دفترية' : 'Equity Reallocation'
          });
        });
      }
    });

    // Sort descending by date
    list.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());

    return list.slice(0, 8);
  }, [transactions, buildingProperties, isAr]);

  const handleSelectBuilding = (bId: string) => {
    onSelectBuildingId(bId);
    if (selectedFilterId !== 'ALL' && selectedFilterId !== bId) {
      setSelectedFilterId(bId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. ANALYTICS & CAD CARTESIAN CHARTS */}
      <PartnersAnalyticsCharts
        properties={buildingProperties}
        transactions={transactions}
        summaries={summaries}
        selectedBuildingId={selectedBuildingId}
        isAr={isAr}
      />

      {/* 2. PROJECT FILTER PILLS AT TOP & SEARCH */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '0.75rem 1rem'
      }}>
        {/* Pills scrollable strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          maxWidth: '100%',
          paddingBottom: '2px'
        }}>
          {/* All Projects Pill */}
          <button
            type="button"
            onClick={() => {
              setSelectedFilterId('ALL');
              if (buildingProperties[0]) onSelectBuildingId(buildingProperties[0].id);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '20px',
              border: selectedFilterId === 'ALL' ? '1px solid var(--erp-accent)' : '1px solid #cbd5e1',
              background: selectedFilterId === 'ALL' ? 'var(--erp-accent-tint, color-mix(in srgb, var(--erp-accent) 8%, transparent))' : '#ffffff',
              color: selectedFilterId === 'ALL' ? 'var(--erp-accent)' : '#334155',
              fontWeight: selectedFilterId === 'ALL' ? 800 : 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <Building2 size={14} color={selectedFilterId === 'ALL' ? 'var(--erp-accent)' : '#64748b'} />
            <span>{isAr ? 'جميع المشروعات' : 'All Projects'}</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '10px',
              background: selectedFilterId === 'ALL' ? 'var(--erp-accent)' : '#f1f5f9',
              color: selectedFilterId === 'ALL' ? '#ffffff' : '#64748b',
              fontWeight: 700
            }}>
              {buildingProperties.length}
            </span>
          </button>

          {/* Individual Building Pills */}
          {buildingProperties.map(b => {
            const isSelected = selectedFilterId === b.id || (selectedFilterId === 'ALL' && b.id === selectedBuildingId);
            const bBalance = checkBuildingEquityBalance(b);

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedFilterId(b.id);
                  onSelectBuildingId(b.id);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid var(--erp-accent)' : '1px solid #cbd5e1',
                  background: isSelected ? 'var(--erp-accent-tint, color-mix(in srgb, var(--erp-accent) 8%, transparent))' : '#ffffff',
                  color: isSelected ? 'var(--erp-accent)' : '#334155',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{b.title_ar || b.title_en}</span>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: bBalance.isBalanced ? '#16a34a' : '#dc2626'
                }} />
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في المشروعات...' : 'Search projects...'}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.75rem',
              outline: 'none',
              background: '#f8fafc'
            }}
          />
          <Search 
            size={14} 
            color="#64748b" 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              left: isAr ? '0.75rem' : 'auto', 
              right: isAr ? 'auto' : '0.75rem' 
            }} 
          />
        </div>
      </div>

      {/* 2. ONE CLEAN CANONICAL TABLE: أداء المشروعات والعمائر */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        {/* Table Header Controls Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #cbd5e1',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--erp-accent-subtle, rgba(37, 99, 235, 0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--erp-accent, #2563eb)'
            }}>
              <Building2 size={16} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'أداء المشروعات والعمائر' : 'Project Equity & Performance'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {isAr ? 'مؤشرات رؤوس الأموال، نسب الحصص، التحصيلات، والمنصرف لكل مشروع' : 'Capital, equity splits, collections, and payouts across projects'}
              </span>
            </div>
          </div>

          <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            {filteredBuildings.length} {isAr ? 'مشروع مسجل' : 'projects'}
          </span>
        </div>

        {/* Minimal Canonical Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            minWidth: '1380px',
            borderCollapse: 'collapse',
            fontSize: '0.75rem',
            textAlign: isAr ? 'right' : 'left'
          }}>
            <thead>
              <tr style={{ background: '#fafbfc', borderBottom: '1px solid #cbd5e1', color: '#475569', height: '46px' }}>
                <th style={{ padding: '0.75rem 1rem', minWidth: '260px', fontWeight: 700, whiteSpace: 'nowrap' }}>{isAr ? 'المشروع والعمارة' : 'Project / Building'}</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '100px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>{isAr ? 'الشركاء' : 'Partners'}</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '120px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>{isAr ? 'ميزان الحصص' : 'Equity Invariant'}</th>
                <th style={{ padding: '0.75rem 0.75rem', minWidth: '140px', fontWeight: 700, whiteSpace: 'nowrap' }}>{isAr ? 'رأس المال المستهدف' : 'Required (EGP)'}</th>
                <th style={{ padding: '0.75rem 0.75rem', minWidth: '140px', fontWeight: 700, whiteSpace: 'nowrap' }}>{isAr ? 'المطلوب بالمراحل' : 'Committed (EGP)'}</th>
                <th style={{ padding: '0.75rem 0.75rem', minWidth: '140px', fontWeight: 700, whiteSpace: 'nowrap' }}>{isAr ? 'المسدد فعلياً' : 'Paid (EGP)'}</th>
                <th style={{ padding: '0.75rem 0.75rem', minWidth: '140px', fontWeight: 700, whiteSpace: 'nowrap' }}>{isAr ? 'المتأخرات' : 'Arrears (EGP)'}</th>
                <th style={{ padding: '0.75rem 0.75rem', minWidth: '140px', fontWeight: 700, whiteSpace: 'nowrap' }}>{isAr ? 'التحصيلات' : 'Collections (EGP)'}</th>
                <th style={{ padding: '0.75rem 0.75rem', minWidth: '140px', fontWeight: 700, whiteSpace: 'nowrap' }}>{isAr ? 'المنصرف أرباح' : 'Distributions (EGP)'}</th>
                <th style={{ padding: '0.75rem 0.5rem', width: '120px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>{isAr ? 'حالة التمويل' : 'Status'}</th>
                <th style={{ padding: '0.75rem 0.75rem', width: '100px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>{isAr ? 'إجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {buildingRowsData.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    {isAr ? 'لا توجد مشروعات مطابقة للبحث' : 'No projects matching criteria'}
                  </td>
                </tr>
              ) : (
                buildingRowsData.map((row, idx) => {
                  const b = row.building;
                  const isSelected = b.id === selectedBuildingId;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => handleSelectBuilding(b.id)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? 'var(--erp-accent-tint, rgba(37, 99, 235, 0.05))' : (idx % 2 === 1 ? '#fafbfc' : '#ffffff'),
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        height: '54px'
                      }}
                    >
                      {/* Project title + location + thumbnail */}
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {b.property_images?.[0]?.url ? (
                            <img
                              src={b.property_images[0].url}
                              alt=""
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '7px',
                                objectFit: 'cover',
                                border: '1px solid #cbd5e1',
                                flexShrink: 0
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '7px',
                              background: isSelected ? 'var(--erp-accent, #2563eb)' : '#f1f5f9',
                              color: isSelected ? '#ffffff' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Building2 size={14} />
                            </div>
                          )}
                          <div>
                            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.75rem' }}>
                              {b.title_ar || b.title_en}
                            </strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {b.total_units_count ? `${b.total_units_count} ${isAr ? 'وحدة' : 'units'}` : ''} 
                              {b.location ? ` • ${b.location}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Partners Count */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#334155'
                        }}>
                          {row.partnersCount} {isAr ? 'شركاء' : 'partners'}
                        </span>
                      </td>

                      {/* 100% Equity Split Invariant */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span className={`${styles.statusPill} ${row.balanceReport.isBalanced ? styles.statusPillGreen : styles.statusPillRed}`} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {row.balanceReport.isBalanced ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>{isAr ? '100% متطابق' : '100% Balanced'}</span>
                            </>
                          ) : (
                            <span>{isAr ? `خلل (${row.balanceReport.totalActiveSharePct}%)` : `Imbalanced (${row.balanceReport.totalActiveSharePct}%)`}</span>
                          )}
                        </span>
                      </td>

                      {/* Required / Target Budget */}
                      <td style={{ padding: '0.75rem 0.75rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {row.requiredCapitalEgp.formatEGP(isAr)}
                      </td>

                      {/* Milestone Committed */}
                      <td style={{ padding: '0.75rem 0.75rem', fontWeight: 600, color: '#334155', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {row.committedEgp.formatEGP(isAr)}
                      </td>

                      {/* Actual Paid (GL 301000) */}
                      <td style={{ padding: '0.75rem 0.75rem', fontWeight: 800, color: 'var(--erp-accent, #2563eb)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {row.actualPaidEgp.formatEGP(isAr)}
                      </td>

                      {/* Arrears */}
                      <td style={{
                        padding: '0.75rem 0.75rem',
                        fontWeight: 700,
                        color: row.arrearsEgp.gt(0) ? '#dc2626' : '#64748b',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap'
                      }}>
                        {row.arrearsEgp.formatEGP(isAr)}
                      </td>

                      {/* Collections */}
                      <td style={{ padding: '0.75rem 0.75rem', fontWeight: 600, color: '#334155', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {row.collectionsEgp.formatEGP(isAr)}
                      </td>

                      {/* Profit Distributions Paid (GL 303000) */}
                      <td style={{ padding: '0.75rem 0.75rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {row.distributionsEgp.formatEGP(isAr)}
                      </td>

                      {/* Funding Status Pill */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {row.fundingRatio >= 100 ? (
                          <span className={`${styles.statusPill} ${styles.statusPillGreen}`} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {isAr ? 'مكتمل التمويل' : 'Fully Funded'}
                          </span>
                        ) : row.fundingRatio > 0 ? (
                          <span className={`${styles.statusPill} ${styles.statusPillBlue}`} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {isAr ? `تمويل ${row.fundingRatio}%` : `${row.fundingRatio}% Funded`}
                          </span>
                        ) : (
                          <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {isAr ? 'قيد التأسيس' : 'Pending'}
                          </span>
                        )}
                      </td>

                      {/* Single Action Trigger */}
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReallocation(b);
                          }}
                        >
                          <ArrowRightLeft size={11} />
                          <span>{isAr ? 'إعادة هيكلة' : 'Reallocate'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Summary Bar */}
            <tfoot>
              <tr style={{ background: '#fafbfc', borderTop: '2px solid #cbd5e1', fontWeight: 800, height: '54px' }}>
                <td style={{ padding: '0.75rem 1rem', color: '#0f172a', whiteSpace: 'nowrap' }}>
                  {isAr ? `الإجمالي (${buildingRowsData.length} مشروع)` : `Totals (${buildingRowsData.length} projects)`}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  {totalsPartnersCount} {isAr ? 'شريك' : 'partners'}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  <span className={`${styles.statusPill} ${allBalanced ? styles.statusPillGreen : styles.statusPillAmber}`} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={12} />
                    <span>{allBalanced ? (isAr ? '100% منضبط' : '100% Balanced') : (isAr ? 'مراجعة' : 'Review')}</span>
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.75rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {totals.req.formatEGP(isAr)}
                </td>
                <td style={{ padding: '0.75rem 0.75rem', color: '#334155', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {totals.committed.formatEGP(isAr)}
                </td>
                <td style={{ padding: '0.75rem 0.75rem', color: 'var(--erp-accent, #2563eb)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {totals.paid.formatEGP(isAr)}
                </td>
                <td style={{ padding: '0.75rem 0.75rem', color: totals.arrears.gt(0) ? '#dc2626' : '#64748b', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {totals.arrears.formatEGP(isAr)}
                </td>
                <td style={{ padding: '0.75rem 0.75rem', color: '#334155', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {totals.collections.formatEGP(isAr)}
                </td>
                <td style={{ padding: '0.75rem 0.75rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {totals.distributions.formatEGP(isAr)}
                </td>
                <td colSpan={2} style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY FEED TABLE (أحدث الحركات) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        {/* Activity Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #cbd5e1',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569'
            }}>
              <History size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'أحدث الحركات والتوريدات' : 'Recent Transactions & Equity Activity'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {isAr ? 'سجل العمليات الرأسمالية الأخيرة والتعديلات المنفذة' : 'Latest capital injections, dividends, and equity adjustments'}
              </span>
            </div>
          </div>

          <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            {recentActivityLogs.length} {isAr ? 'حركة حديثة' : 'recent logs'}
          </span>
        </div>

        {/* Minimal Table */}
        {recentActivityLogs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
            {isAr ? 'لا توجد حركات رأسمالية مسجلة حديثاً' : 'No recent transactions recorded'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              minWidth: '780px',
              borderCollapse: 'collapse',
              fontSize: '0.75rem',
              textAlign: isAr ? 'right' : 'left'
            }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#64748b' }}>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>{isAr ? 'المرجع والتاريخ' : 'Ref & Date'}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'نوع الحركة' : 'Action Type'}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>{isAr ? 'المشروع' : 'Project'}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>{isAr ? 'الشريك / الأطراف' : 'Partner / Parties'}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>{isAr ? 'حساب السداد / الطريقة' : 'Method / Account'}</th>
                  <th style={{ padding: '0.5rem 0.75rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {recentActivityLogs.map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: idx % 2 === 1 ? '#fafbfc' : '#ffffff'
                    }}
                  >
                    <td style={{ padding: '0.5rem 1rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.75rem' }}>
                        {log.id.length > 14 ? `${log.id.slice(0, 12)}...` : log.id}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        {log.date || '—'}
                      </span>
                    </td>

                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <span className={`${styles.statusPill} ${
                        log.type === 'INJECTION' ? styles.statusPillBlue :
                        log.type === 'DISTRIBUTION' ? styles.statusPillGreen :
                        styles.statusPillAmber
                      }`} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {log.typeLabel}
                      </span>
                    </td>

                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#334155' }}>
                      {log.projectTitle}
                    </td>

                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>
                      {log.partnerName}
                    </td>

                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {D(log.amount).formatEGP(isAr)}
                    </td>

                    <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontSize: '0.75rem' }}>
                      {log.method}
                    </td>

                    <td style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
                      <span className={`${styles.statusPill} ${styles.statusPillGreen}`} style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={12} />
                        <span>{isAr ? 'مكتمل' : 'Completed'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
