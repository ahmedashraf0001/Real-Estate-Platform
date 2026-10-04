'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Coins, 
  Receipt, 
  Search, 
  Eye, 
  Plus, 
  Crown, 
  Phone, 
  Building2, 
  Wallet, 
  ArrowUpDown, 
  CheckCircle2, 
  CreditCard,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';
import { 
  PartnerFinancialSummary 
} from '@/lib/erp/partnersEngine';
import { ERPPartnerProfile } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { PRIMARY_DEVELOPER_NAME } from '@/lib/erp/partnersDirectory';
import styles from '../../ZFWorkstationShell.module.css';

export interface PartnersDirectoryViewProps {
  partnerProfiles?: ERPPartnerProfile[];
  partnerSummaries: PartnerFinancialSummary[];
  isAr?: boolean;
  isMutating?: boolean;
  onOpenDossier: (partner: PartnerFinancialSummary) => void;
  onOpenInjection: (partnerName?: string) => void;
  onOpenPayout: (partnerName?: string) => void;
  onOpenNewPartner?: () => void;
}

export const PartnersDirectoryView: React.FC<PartnersDirectoryViewProps> = ({
  partnerProfiles = [],
  partnerSummaries = [],
  isAr = true,
  isMutating = false,
  onOpenDossier,
  onOpenInjection,
  onOpenPayout,
  onOpenNewPartner,
}) => {
  const [roleFilter, setRoleFilter] = useState<'all' | 'developer' | 'equity' | 'land' | 'silent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'balance_desc' | 'capital_desc' | 'roi_desc' | 'name_asc'>('balance_desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Role Counts
  const roleCounts = useMemo(() => {
    let dev = 0, eq = 0, lnd = 0, slt = 0;
    partnerSummaries.forEach(s => {
      if (s.isPermanent || s.partnerName.includes('زكريا فريد')) dev++;
      else if (s.roleTitleAr.includes('ممول') || s.roleTitleAr.includes('بالمشروع')) eq++;
      else if (s.roleTitleAr.includes('أرض') || s.roleTitleAr.includes('الأرض')) lnd++;
      else slt++;
    });
    return { all: partnerSummaries.length, developer: dev, equity: eq, land: lnd, silent: slt };
  }, [partnerSummaries]);

  // Filtering and Sorting
  const filteredPartners = useMemo(() => {
    let list = [...partnerSummaries];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.partnerName.toLowerCase().includes(q) ||
        p.roleTitleAr.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        p.holdings.some(h => h.propertyTitle.toLowerCase().includes(q))
      );
    }

    // Role tab filter
    if (roleFilter !== 'all') {
      list = list.filter(s => {
        const isDev = s.isPermanent || s.role === 'primary_developer' || s.partnerName.includes('زكريا فريد');
        if (roleFilter === 'developer') return isDev;
        if (isDev) return false;
        if (roleFilter === 'equity') return s.role === 'equity_partner' || s.roleTitleAr.includes('ممول') || s.roleTitleAr.includes('بالمشروع');
        if (roleFilter === 'land') return s.role === 'land_partner' || s.roleTitleAr.includes('أرض') || s.roleTitleAr.includes('الأرض');
        if (roleFilter === 'silent') return s.role === 'silent_financier' || (!s.roleTitleAr.includes('ممول') && !s.roleTitleAr.includes('أرض'));
        return true;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (a.isPermanent) return -1;
      if (b.isPermanent) return 1;

      if (sortBy === 'balance_desc') {
        return D(b.netCurrentBalance).minus(D(a.netCurrentBalance)).toNumber();
      }
      if (sortBy === 'capital_desc') {
        return D(b.totalContributedCapital).minus(D(a.totalContributedCapital)).toNumber();
      }
      if (sortBy === 'roi_desc') {
        return b.roiPercent - a.roiPercent;
      }
      if (sortBy === 'name_asc') {
        return a.partnerName.localeCompare(b.partnerName, 'ar');
      }
      return 0;
    });

    return list;
  }, [partnerSummaries, searchQuery, roleFilter, sortBy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. FILTER TABS & TOOLBAR */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '0.75rem 1rem',
        boxShadow: 'none'
      }}>
        {/* Role Tabs */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: '#f1f5f9',
          padding: '0.25rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
          maxWidth: '100%'
        }}>
          {[
            { id: 'all', label: isAr ? 'كافة الشركاء' : 'All', count: roleCounts.all },
            { id: 'developer', label: isAr ? 'المطور الرئيسي' : 'Developer', count: roleCounts.developer },
            { id: 'equity', label: isAr ? 'شركاء تمويل' : 'Equity', count: roleCounts.equity },
            { id: 'land', label: isAr ? 'مساهمو الأرض' : 'Land', count: roleCounts.land },
            { id: 'silent', label: isAr ? 'ممولون صامتون' : 'Silent', count: roleCounts.silent },
          ].map(tab => {
            const isActive = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.7rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#0f172a' : '#64748b',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: '0.1rem 0.4rem',
                  borderRadius: '12px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: isActive ? 'var(--erp-accent-tint, rgba(37, 99, 235, 0.12))' : '#e2e8f0',
                  color: isActive ? 'var(--erp-accent, #2563eb)' : '#64748b'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Sort, View Toggle, & New Partner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '180px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو الهاتف...' : 'Search partner...'}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
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
                left: isAr ? '0.65rem' : 'auto', 
                right: isAr ? 'auto' : '0.65rem' 
              }} 
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="balance_desc">{isAr ? 'الترتيب: الأعلى رصيداً' : 'Sort: Highest Balance'}</option>
            <option value="capital_desc">{isAr ? 'الترتيب: الأكثر مساهمة' : 'Sort: Most Contributed'}</option>
            <option value="roi_desc">{isAr ? 'الترتيب: الأعلى عائداً ROI' : 'Sort: Highest ROI'}</option>
            <option value="name_asc">{isAr ? 'الترتيب: أبجدياً' : 'Sort: Name (A-Z)'}</option>
          </select>

          {/* View Mode Toggle */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                border: 'none',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0f172a' : '#64748b',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
              title={isAr ? 'عرض جدول' : 'Table View'}
            >
              <TableIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                border: 'none',
                background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                color: viewMode === 'cards' ? '#0f172a' : '#64748b',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
              title={isAr ? 'عرض بطاقات' : 'Cards View'}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. DIRECTORY VIEW CONTENT: TABLE OR CARDS */}
      {viewMode === 'table' ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          overflowX: 'auto',
          boxShadow: 'none'
        }}>
          <table style={{
            width: '100%',
            minWidth: '1200px',
            borderCollapse: 'collapse',
            fontSize: '0.78rem',
            textAlign: isAr ? 'right' : 'left'
          }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{isAr ? 'الشريك / الفئة' : 'Partner'}</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'الصفة' : 'Role'}</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'الحالة' : 'Status'}</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'المشاريع' : 'Projects'}</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'نسبة الحصة' : 'Investment Share'}</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700 }}>{isAr ? 'المسدد (301000)' : 'Paid (EGP)'}</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700 }}>{isAr ? 'المتأخرات' : 'Arrears (EGP)'}</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700 }}>{isAr ? 'المنصرف (303000)' : 'Distributions (EGP)'}</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700 }}>{isAr ? 'صافي الرصيد الجاري' : 'Net Balance (EGP)'}</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700, textAlign: 'center' }}>ROI %</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'طريقة الصرف' : 'Payment Method'}</th>
                <th style={{ padding: '0.75rem 0.65rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'آخر حركة' : 'Last Activity'}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, textAlign: 'center' }}>{isAr ? 'الملف' : 'Dossier'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    {isAr ? 'لا يوجد شركاء مطابقين للبحث والفلاتر' : 'No partners matching criteria'}
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner, idx) => {
                  const isFounder = partner.isPermanent || partner.role === 'primary_developer' || partner.partnerName.includes('زكريا فريد');
                  const netDec = D(partner.netCurrentBalance);
                  const arrearsDec = D(partner.totalArrears || '0.00');
                  const hasArrears = arrearsDec.gt(0);

                  return (
                    <tr
                      key={partner.partnerName}
                      onClick={() => onOpenDossier(partner)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 1 ? '#fafbfc' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Name & Avatar */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: isFounder ? 'rgba(217, 119, 6, 0.12)' : 'color-mix(in srgb, var(--erp-accent) 10%, transparent)',
                            color: isFounder ? '#d97706' : 'var(--erp-accent, #2563eb)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            flexShrink: 0
                          }}>
                            {isFounder ? <Crown size={15} /> : partner.partnerName.slice(0, 1)}
                          </div>
                          <div>
                            <strong style={{ color: '#0f172a' }}>{partner.partnerName}</strong>
                            {partner.phone && (
                              <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                                {partner.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Pill */}
                      <td style={{ padding: '0.75rem 0.65rem', textAlign: 'center' }}>
                        <span className={`${styles.statusPill} ${
                          isFounder ? styles.statusPillAmber :
                          partner.role === 'equity_partner' ? styles.statusPillBlue :
                          partner.role === 'land_partner' ? styles.statusPillGreen :
                          styles.statusPillNeutral
                        }`} style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                          {partner.roleTitleAr}
                        </span>
                      </td>

                      {/* Status Pill */}
                      <td style={{ padding: '0.75rem 0.65rem', textAlign: 'center' }}>
                        {hasArrears ? (
                          <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                            {isAr ? 'عجز تمويل' : 'Has Arrears'}
                          </span>
                        ) : partner.holdings.length > 0 ? (
                          <span className={`${styles.statusPill} ${styles.statusPillGreen}`} style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                            {isAr ? 'نشط (مستوفٍ) ✓' : 'Active (Funded)'}
                          </span>
                        ) : (
                          <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                            {isAr ? 'مسجل' : 'Registered'}
                          </span>
                        )}
                      </td>

                      {/* Projects Count */}
                      <td style={{ padding: '0.75rem 0.65rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          color: '#334155'
                        }}>
                          {partner.holdings.length} {isAr ? 'مشاريع' : 'projects'}
                        </span>
                      </td>

                      {/* Investment Share */}
                      <td style={{ padding: '0.75rem 0.65rem', textAlign: 'center', fontWeight: 800, color: 'var(--erp-accent, #2563eb)' }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {partner.investmentShareLabel || (partner.holdings[0] ? `${partner.holdings[0].sharePct}%` : '—')}
                        </span>
                      </td>

                      {/* Contributed Capital (Paid) */}
                      <td style={{ padding: '0.75rem 0.65rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {D(partner.totalContributedCapital).formatEGP(isAr)}
                      </td>

                      {/* Arrears */}
                      <td style={{
                        padding: '0.75rem 0.65rem',
                        fontWeight: 700,
                        color: hasArrears ? '#dc2626' : '#64748b',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {arrearsDec.formatEGP(isAr)}
                      </td>

                      {/* Distributions Paid */}
                      <td style={{ padding: '0.75rem 0.65rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {D(partner.totalDistributionsPaid).formatEGP(isAr)}
                      </td>

                      {/* Net Current Balance */}
                      <td style={{ padding: '0.75rem 0.65rem', fontWeight: 800, color: netDec.isNegative() ? '#dc2626' : 'var(--erp-accent, #2563eb)', fontVariantNumeric: 'tabular-nums' }}>
                        {netDec.formatEGP(isAr)}
                      </td>

                      {/* ROI % */}
                      <td style={{ padding: '0.75rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#d97706' }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{partner.roiPercent}%</span>
                      </td>

                      {/* Payment Method Badge */}
                      <td style={{ padding: '0.75rem 0.65rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: partner.preferred_payout_method === 'INSTAPAY' ? 'color-mix(in srgb, var(--erp-accent) 10%, transparent)' : '#f1f5f9',
                          color: partner.preferred_payout_method === 'INSTAPAY' ? 'var(--erp-accent, #2563eb)' : '#475569',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}>
                          {partner.preferred_payout_method === 'INSTAPAY' ? 'InstaPay' :
                           partner.preferred_payout_method === 'CASH' ? (isAr ? 'خزينة' : 'Cash') : (isAr ? 'بنكي' : 'Bank')}
                        </span>
                      </td>

                      {/* Last Activity Date */}
                      <td style={{ padding: '0.75rem 0.65rem', textAlign: 'center', color: '#64748b', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                        {partner.lastActivityDate || '—'}
                      </td>

                      {/* Dossier Trigger Action */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDossier(partner);
                          }}
                          style={{
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Eye size={12} color="var(--erp-accent, #2563eb)" />
                          <span>{isAr ? 'عرض الملف' : 'View'}</span>
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
        /* CARDS GRID VIEW */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1rem'
        }}>
          {filteredPartners.map(partner => {
            const isFounder = partner.isPermanent || partner.role === 'primary_developer' || partner.partnerName.includes('زكريا فريد');
            const netDec = D(partner.netCurrentBalance);
            const arrearsDec = D(partner.totalArrears || '0.00');
            const hasArrears = arrearsDec.gt(0);

            return (
              <div
                key={partner.partnerName}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1.15rem',
                  boxShadow: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '9px',
                      background: isFounder ? 'rgba(217, 119, 6, 0.12)' : 'color-mix(in srgb, var(--erp-accent) 10%, transparent)',
                      color: isFounder ? '#d97706' : 'var(--erp-accent, #2563eb)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.9rem'
                    }}>
                      {isFounder ? <Crown size={18} /> : partner.partnerName.slice(0, 1)}
                    </div>
                    <div>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>
                        {partner.partnerName}
                      </strong>
                      <span className={`${styles.statusPill} ${
                        isFounder ? styles.statusPillAmber :
                        partner.role === 'equity_partner' ? styles.statusPillBlue :
                        partner.role === 'land_partner' ? styles.statusPillGreen :
                        styles.statusPillNeutral
                      }`} style={{ fontSize: '0.64rem', marginTop: '2px', display: 'inline-flex' }}>
                        {partner.roleTitleAr}
                      </span>
                    </div>
                  </div>

                  {hasArrears ? (
                    <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={{ fontSize: '0.68rem' }}>
                      {isAr ? 'عجز تمويل' : 'Arrears'}
                    </span>
                  ) : partner.holdings.length > 0 ? (
                    <span className={`${styles.statusPill} ${styles.statusPillGreen}`} style={{ fontSize: '0.68rem' }}>
                      {isAr ? 'نشط (مستوفٍ) ✓' : 'Active'}
                    </span>
                  ) : (
                    <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.68rem' }}>
                      {isAr ? 'مسجل' : 'Registered'}
                    </span>
                  )}
                </div>

                {/* Financial Metrics Strip */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.5rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.65rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'المسدد (301000)' : 'Paid'}
                    </span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {D(partner.totalContributedCapital).formatEGP(isAr)}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'المتأخرات' : 'Arrears'}
                    </span>
                    <strong style={{ fontSize: '0.88rem', color: hasArrears ? '#dc2626' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                      {arrearsDec.formatEGP(isAr)}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'المنصرف (303000)' : 'Distributions'}
                    </span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {D(partner.totalDistributionsPaid).formatEGP(isAr)}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'صافي الرصيد المستحق' : 'Net Balance'}
                    </span>
                    <strong style={{ fontSize: '0.88rem', color: netDec.isNegative() ? '#dc2626' : 'var(--erp-accent, #2563eb)', fontVariantNumeric: 'tabular-nums' }}>
                      {netDec.formatEGP(isAr)}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      {isAr ? 'الحصة' : 'Share %'}
                    </span>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--erp-accent, #2563eb)', fontVariantNumeric: 'tabular-nums' }}>
                      {partner.investmentShareLabel || (partner.holdings[0] ? `${partner.holdings[0].sharePct}%` : '—')}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                      ROI %
                    </span>
                    <strong style={{ fontSize: '0.88rem', color: '#d97706', fontVariantNumeric: 'tabular-nums' }}>
                      {partner.roiPercent}%
                    </strong>
                  </div>
                </div>

                {/* Sub info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                  <span>
                    {partner.holdings.length} {isAr ? 'مشاريع مسجلة' : 'properties'}
                  </span>
                  <span>
                    {isAr ? `آخر حركة: ${partner.lastActivityDate || '—'}` : `Last: ${partner.lastActivityDate || '—'}`}
                  </span>
                </div>

                {/* Card Actions */}
                <div style={{ marginTop: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => onOpenDossier(partner)}
                    style={{
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem',
                      borderRadius: '6px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={13} color="var(--erp-accent, #2563eb)" />
                    <span>{isAr ? 'عرض الملف' : 'View Dossier'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
