'use client';

import React, { useMemo } from 'react';
import { usePropertyCosts } from '../../../context/ERPWorkstationContext';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Users, 
  Coins, 
  Receipt, 
  Wallet,
  FileSpreadsheet, 
  ChevronLeft,
  ChevronRight,
  Building2,
  ArrowRightLeft,
  Zap,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { Property } from '@/lib/supabase/types';
import { 
  PartnerFinancialSummary, 
  computeDynamicBuildingCapital,
  checkBuildingEquityBalance
} from '@/lib/erp/partnersEngine';
import { ERPPartnerTransaction } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { ZFWorkstationSideWidgets, ZFWidgetCard } from '../../common/ZFWorkstationSideWidgets';
import styles from '../../ZFWorkstationShell.module.css';

export interface PartnersSideWidgetsProps {
  properties?: Property[];
  summaries?: PartnerFinancialSummary[];
  transactions?: ERPPartnerTransaction[];
  isAr?: boolean;
  onOpenNewPartner?: () => void;
  onOpenInjection?: (partnerName?: string, propertyId?: string) => void;
  onOpenPayout?: () => void;
  onOpenReallocation?: (property: Property) => void;
  onExportExcel?: () => void;
}

export const PartnersSideWidgets: React.FC<PartnersSideWidgetsProps> = ({
  properties = [],
  summaries = [],
  transactions = [],
  isAr = true,
  onOpenNewPartner,
  onOpenInjection,
  onOpenPayout,
  onOpenReallocation,
  onExportExcel
}) => {
  const propertyCosts = usePropertyCosts();
  const buildingProperties = useMemo(() => {
    return properties.filter(p => p.type === 'building' || (p as any).is_building);
  }, [properties]);

  // Check equity balance and arrears
  const { imbalancedBuildings, partnersWithArrears } = useMemo(() => {
    const imbalanced: Array<{ property: Property; totalPct: number; deviationPct: number }> = [];
    const inArrears: Array<{ partnerName: string; propertyId: string; buildingTitle: string; arrearsEgp: string }> = [];

    buildingProperties.forEach(b => {
      const balanceReport = checkBuildingEquityBalance(b);
      if (!balanceReport.isBalanced) {
        imbalanced.push({
          property: b,
          totalPct: balanceReport.totalActiveSharePct,
          deviationPct: balanceReport.deviationPct
        });
      }

      const capInfo = computeDynamicBuildingCapital(b, transactions, propertyCosts);
      capInfo.partnerStatuses.forEach(p => {
        if (p.hasArrears && D(p.arrearsEgp).gt(100)) {
          inArrears.push({
            partnerName: p.partnerName,
            propertyId: b.id,
            buildingTitle: b.title_ar || b.title_en || 'مشروع عقاري',
            arrearsEgp: p.arrearsEgp
          });
        }
      });
    });

    return { imbalancedBuildings: imbalanced, partnersWithArrears: inArrears };
  }, [buildingProperties, transactions, propertyCosts]);

  const hasUrgentAlerts = imbalancedBuildings.length > 0 || partnersWithArrears.length > 0;

  // Equity Structure Status metrics (replaces duplicate donut chart)
  const totalProjects = buildingProperties.length;
  const imbalancedCount = imbalancedBuildings.length;
  const arrearsCount = partnersWithArrears.length;
  const balancedCount = Math.max(0, totalProjects - imbalancedCount);
  const balancedPercent = totalProjects > 0 ? Math.round((balancedCount / totalProjects) * 100) : 100;
  const imbalancedPercent = totalProjects > 0 ? Math.round((imbalancedCount / totalProjects) * 100) : 0;

  // Linked ledger balances
  const { totalInjections, totalDistributions, netVaultBalance } = useMemo(() => {
    let inj = D(0);
    let dist = D(0);
    transactions.forEach(t => {
      if (t.type === 'CAPITAL_INJECTION') inj = inj.plus(t.amount || 0);
      else if (t.type === 'PROFIT_DISTRIBUTION') dist = dist.plus(t.amount || 0);
    });
    return {
      totalInjections: inj,
      totalDistributions: dist,
      netVaultBalance: inj.minus(dist)
    };
  }, [transactions]);

  return (
    <ZFWorkstationSideWidgets
      title={isAr ? 'إحصائيات الشركاء والعمليات السريعة' : 'Partner Analytics & Shortcuts'}
      badge={isAr ? 'مباشر' : 'LIVE'}
      icon={<Users size={16} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        
        {/* WIDGET 1: ACTIONABLE ALERTS & COMPLIANCE */}
        <ZFWidgetCard
          id="partners-urgent-alerts"
          title={isAr ? 'تنبيهات تحتاج إجراء' : 'Actionable Alerts'}
          icon={hasUrgentAlerts ? <AlertTriangle size={15} color="#dc2626" /> : <ShieldCheck size={15} color="#64748b" />}
          badge={
            hasUrgentAlerts ? (
              <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={{ fontSize: '0.75rem' }}>
                {imbalancedBuildings.length + partnersWithArrears.length} {isAr ? 'تنبيه' : 'alerts'}
              </span>
            ) : (
              <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.75rem' }}>
                {isAr ? 'مستقر' : 'Stable'}
              </span>
            )
          }
          isAr={isAr}
        >
          {imbalancedBuildings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626' }}>
                {isAr ? 'خلل في مجموع حصص العماير التالية:' : 'Imbalanced Equity Splits:'}
              </span>
              {imbalancedBuildings.map(({ property, totalPct, deviationPct }) => (
                <div
                  key={property.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '7px',
                      background: '#fef2f2',
                      border: '1px solid rgba(220, 38, 38, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      flexShrink: 0
                    }}>
                      <Building2 size={14} />
                    </div>
                    <div>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.75rem' }}>
                        {property.title_ar || property.title_en}
                      </strong>
                      <span className={`${styles.statusPill} ${styles.statusPillRed}`} style={{ fontSize: '0.75rem', marginTop: '2px', display: 'inline-block' }}>
                        {isAr ? `إجمالي الحصص: ${totalPct}% (${deviationPct > 0 ? '+' : ''}${deviationPct}%)` : `Total: ${totalPct}%`}
                      </span>
                    </div>
                  </div>
                  {onOpenReallocation && (
                    <button
                      type="button"
                      onClick={() => onOpenReallocation(property)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        background: '#ffffff',
                        color: 'var(--erp-accent, #2563eb)',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <ArrowRightLeft size={11} />
                      <span>{isAr ? 'ضبط الحصص' : 'Rebalance'}</span>
                      {isAr ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {partnersWithArrears.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706' }}>
                {isAr ? 'متأخرات مساهمات تمويل معلقة:' : 'Pending Capital Arrears:'}
              </span>
              {partnersWithArrears.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0.75rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '7px',
                      background: '#fffbeb',
                      border: '1px solid rgba(217, 119, 6, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#d97706',
                      flexShrink: 0
                    }}>
                      <Coins size={14} />
                    </div>
                    <div>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.75rem' }}>{item.partnerName}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.buildingTitle}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {D(item.arrearsEgp).formatEGP(isAr)}
                    </strong>
                    {onOpenInjection && (
                      <button
                        type="button"
                        onClick={() => onOpenInjection(item.partnerName, item.propertyId)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          background: '#ffffff',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <span>{isAr ? 'تسوية' : 'Settle'}</span>
                        {isAr ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasUrgentAlerts && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '0.75rem'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: '#f1f5f9',
                border: '1px solid rgba(71, 85, 105, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                flexShrink: 0
              }}>
                <ShieldCheck size={14} />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                {isAr ? 'لا توجد متأخرات أو تنبيهات معلقة حالياً' : 'No pending alerts or arrears'}
              </span>
            </div>
          )}
        </ZFWidgetCard>

        {/* WIDGET 2: EQUITY STRUCTURE STATUS (NO DUPLICATE CHART) */}
        <ZFWidgetCard
          id="partners-equity-structure-status"
          title={isAr ? 'حالة هياكل الملكية' : 'Equity Structure Status'}
          icon={<Building2 size={15} color="var(--erp-accent, #2563eb)" />}
          badge={
            <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.75rem' }}>
              {totalProjects} {isAr ? 'مشروع' : 'projects'}
            </span>
          }
          isAr={isAr}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Status counts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className={`${styles.statusPill} ${styles.statusPillGreen}`} style={{ fontSize: '0.75rem' }}>
                {isAr ? `سليمة: ${balancedCount}` : `Balanced: ${balancedCount}`}
              </span>
              {imbalancedCount > 0 && (
                <span className={`${styles.statusPill} ${styles.statusPillRed}`} style={{ fontSize: '0.75rem' }}>
                  {isAr ? `تحتاج مراجعة: ${imbalancedCount}` : `Needs Review: ${imbalancedCount}`}
                </span>
              )}
              {arrearsCount > 0 && (
                <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={{ fontSize: '0.75rem' }}>
                  {isAr ? `متأخرات معلقة: ${arrearsCount}` : `Arrears: ${arrearsCount}`}
                </span>
              )}
            </div>

            {/* Segmented bar */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#64748b',
                marginBottom: '0.25rem'
              }}>
                <span>{isAr ? 'نسبة انضباط هياكل الملكية' : 'Equity Invariant Compliance'}</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#0f172a' }}>{balancedPercent}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                background: '#e2e8f0',
                borderRadius: '3px',
                overflow: 'hidden',
                display: 'flex'
              }}>
                <div style={{ width: `${balancedPercent}%`, background: 'var(--erp-accent, #2563eb)' }} />
                {imbalancedCount > 0 && (
                  <div style={{ width: `${imbalancedPercent}%`, background: '#dc2626' }} />
                )}
              </div>
            </div>

            <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
              {isAr
                ? 'متابعة التوازن الهندسي لملكية كافة عماير المحفظة ومطابقة شرط الـ 100% الإلزامي.'
                : 'Enforcing the strict 100% equity balance invariant across all portfolio properties.'}
            </span>
          </div>
        </ZFWidgetCard>

        {/* WIDGET 3: QUICK OPERATIONAL SHORTCUTS */}
        <ZFWidgetCard
          id="partners-quick-actions"
          title={isAr ? 'العمليات السريعة' : 'Quick Operations'}
          icon={<Zap size={15} color="var(--erp-accent, #2563eb)" />}
          isAr={isAr}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {onOpenNewPartner && (
              <button
                type="button"
                onClick={onOpenNewPartner}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    background: 'var(--erp-accent-subtle, #eff6ff)',
                    border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--erp-accent, #2563eb)',
                    flexShrink: 0
                  }}>
                    <Users size={14} />
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.75rem' }}>
                      {isAr ? 'إضافة شريك جديد' : 'New Partner'}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {isAr ? 'تسجيل ملف شريك أو ممول جديد' : 'Register new partner profile'}
                    </span>
                  </div>
                </div>
                {isAr ? <ChevronLeft size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
              </button>
            )}

            {onOpenInjection && (
              <button
                type="button"
                onClick={() => onOpenInjection()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    background: 'var(--erp-accent-subtle, #eff6ff)',
                    border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--erp-accent, #2563eb)',
                    flexShrink: 0
                  }}>
                    <Coins size={14} />
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.75rem' }}>
                      {isAr ? 'ضخ رأس مال / مساهمة' : 'Capital Injection'}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {isAr ? 'توريد دفعة نقدية أو إنستاباي' : 'Deposit cash or InstaPay'}
                    </span>
                  </div>
                </div>
                {isAr ? <ChevronLeft size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
              </button>
            )}

            {onOpenPayout && (
              <button
                type="button"
                onClick={onOpenPayout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    background: 'var(--erp-accent-subtle, #eff6ff)',
                    border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--erp-accent, #2563eb)',
                    flexShrink: 0
                  }}>
                    <Receipt size={14} />
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.75rem' }}>
                      {isAr ? 'صرف أرباح للشركاء' : 'Pay Dividend'}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {isAr ? 'سداد مسحوبات وأرباح من الخزينة' : 'Distribute profit dividend'}
                    </span>
                  </div>
                </div>
                {isAr ? <ChevronLeft size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
              </button>
            )}

            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    flexShrink: 0
                  }}>
                    <FileSpreadsheet size={14} />
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.75rem' }}>
                      {isAr ? 'تصدير دليل الشركاء Excel' : 'Export Excel Directory'}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {isAr ? 'كشف حساب ومطابقات الحصص' : 'Full statement and splits'}
                    </span>
                  </div>
                </div>
                {isAr ? <ChevronLeft size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
              </button>
            )}
          </div>
        </ZFWidgetCard>

        {/* WIDGET 4: GENERAL LEDGER DIRECT LINKS (HUMAN TITLES + TABULAR BALANCES) */}
        <ZFWidgetCard
          id="partners-gl-links"
          title={isAr ? 'دفتر الأستاذ والقيود المرتبطة' : 'Linked Ledger Accounts'}
          icon={<BookOpen size={15} color="#64748b" />}
          isAr={isAr}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
            <Link
              href={`/fin-os/${isAr ? 'ar' : 'en'}/ledger?account=301000`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                textDecoration: 'none',
                color: '#0f172a',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: 'var(--erp-accent-subtle, #eff6ff)',
                  border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--erp-accent, #2563eb)',
                  flexShrink: 0
                }}>
                  <Coins size={14} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.75rem' }}>
                      {isAr ? 'حساب رأس مال الشركاء' : 'Partner Capital'}
                    </strong>
                    <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.75rem' }}>
                      301000
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {isAr ? 'حقوق الملكية والمساهمات الرأسمالية' : 'Contributed Equity'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ display: 'block', color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem' }}>
                  {totalInjections.formatEGP(isAr)}
                </strong>
                {isAr ? <ChevronLeft size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
              </div>
            </Link>

            <Link
              href={`/fin-os/${isAr ? 'ar' : 'en'}/ledger?account=303000`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                textDecoration: 'none',
                color: '#0f172a',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: 'var(--erp-accent-subtle, #eff6ff)',
                  border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--erp-accent, #2563eb)',
                  flexShrink: 0
                }}>
                  <Receipt size={14} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.75rem' }}>
                      {isAr ? 'توزيعات وأرباح الشركاء' : 'Partner Distributions'}
                    </strong>
                    <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.75rem' }}>
                      303000
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {isAr ? 'المسحوبات والأرباح المنصرفة' : 'Profit Distributions Paid'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ display: 'block', color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem' }}>
                  {totalDistributions.formatEGP(isAr)}
                </strong>
                {isAr ? <ChevronLeft size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
              </div>
            </Link>

            <Link
              href={`/fin-os/${isAr ? 'ar' : 'en'}/operations`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                textDecoration: 'none',
                color: '#0f172a',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: 'var(--erp-accent-subtle, #eff6ff)',
                  border: '1px solid var(--erp-accent-tint, rgba(37, 99, 235, 0.08))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--erp-accent, #2563eb)',
                  flexShrink: 0
                }}>
                  <Wallet size={14} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.75rem' }}>
                      {isAr ? 'حسابات البنوك والخزينة' : 'Bank & Vault Liquidity'}
                    </strong>
                    <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.75rem' }}>
                      101000
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {isAr ? 'الخزينة النقدية ومطابقة إنستاباي' : 'Cash Vault & InstaPay'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ display: 'block', color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem' }}>
                  {netVaultBalance.formatEGP(isAr)}
                </strong>
                {isAr ? <ChevronLeft size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
              </div>
            </Link>
          </div>
        </ZFWidgetCard>

      </div>
    </ZFWorkstationSideWidgets>
  );
};
