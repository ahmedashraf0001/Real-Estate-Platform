'use client';

import React, { useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Users, 
  Coins, 
  Receipt, 
  FileSpreadsheet, 
  ArrowUpRight,
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

      const capInfo = computeDynamicBuildingCapital(b, transactions);
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
  }, [buildingProperties, transactions]);

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
              <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={{ fontSize: '0.65rem' }}>
                {imbalancedBuildings.length + partnersWithArrears.length} {isAr ? 'تنبيه' : 'alerts'}
              </span>
            ) : (
              <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.65rem' }}>
                {isAr ? 'مستقر' : 'Stable'}
              </span>
            )
          }
          isAr={isAr}
        >
          {imbalancedBuildings.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626' }}>
                {isAr ? 'خلل في مجموع حصص العماير التالية:' : 'Imbalanced Equity Splits:'}
              </span>
              {imbalancedBuildings.map(({ property, totalPct, deviationPct }) => (
                <div
                  key={property.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.55rem 0.75rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.72rem'
                  }}
                >
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.76rem' }}>
                      {property.title_ar || property.title_en}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                      {isAr ? `إجمالي الحصص: ${totalPct}% (${deviationPct > 0 ? '+' : ''}${deviationPct}%)` : `Total: ${totalPct}%`}
                    </span>
                  </div>
                  {onOpenReallocation && (
                    <button
                      type="button"
                      onClick={() => onOpenReallocation(property)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        background: '#ffffff',
                        color: 'var(--erp-accent, #2563eb)',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <ArrowRightLeft size={11} />
                      <span>{isAr ? 'ضبط الحصص' : 'Rebalance'}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {partnersWithArrears.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706' }}>
                {isAr ? 'متأخرات مساهمات تمويل معلقة:' : 'Pending Capital Arrears:'}
              </span>
              {partnersWithArrears.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.55rem 0.75rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.72rem'
                  }}
                >
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.76rem' }}>{item.partnerName}</strong>
                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{item.buildingTitle}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.78rem' }}>
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
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {isAr ? 'تسوية' : 'Settle'}
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
              padding: '0.55rem 0.75rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '0.74rem'
            }}>
              <ShieldCheck size={14} color="#64748b" />
              <span>{isAr ? 'لا توجد متأخرات أو تنبيهات معلقة حالياً' : 'No pending alerts or arrears'}</span>
            </div>
          )}
        </ZFWidgetCard>

        {/* WIDGET 2: EQUITY STRUCTURE STATUS (NO DUPLICATE CHART) */}
        <ZFWidgetCard
          id="partners-equity-structure-status"
          title={isAr ? 'حالة هياكل الملكية' : 'Equity Structure Status'}
          icon={<Building2 size={15} color="var(--erp-accent, #2563eb)" />}
          badge={
            <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.65rem' }}>
              {totalProjects} {isAr ? 'مشروع' : 'projects'}
            </span>
          }
          isAr={isAr}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Status counts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              <span className={`${styles.statusPill} ${styles.statusPillGreen}`} style={{ fontSize: '0.7rem' }}>
                {isAr ? `سليمة: ${balancedCount}` : `Balanced: ${balancedCount}`}
              </span>
              {imbalancedCount > 0 && (
                <span className={`${styles.statusPill} ${styles.statusPillRed}`} style={{ fontSize: '0.7rem' }}>
                  {isAr ? `تحتاج مراجعة: ${imbalancedCount}` : `Needs Review: ${imbalancedCount}`}
                </span>
              )}
              {arrearsCount > 0 && (
                <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={{ fontSize: '0.7rem' }}>
                  {isAr ? `متأخرات معلقة: ${arrearsCount}` : `Arrears: ${arrearsCount}`}
                </span>
              )}
            </div>

            {/* Segmented bar */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                color: '#64748b',
                marginBottom: '0.35rem'
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

            <span style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.4 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {onOpenNewPartner && (
              <button
                type="button"
                onClick={onOpenNewPartner}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.65rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left'
                }}
              >
                <Users size={13} color="var(--erp-accent, #2563eb)" />
                <span>{isAr ? 'شريك جديد' : 'New Partner'}</span>
              </button>
            )}

            {onOpenInjection && (
              <button
                type="button"
                onClick={() => onOpenInjection()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.65rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left'
                }}
              >
                <Coins size={13} color="var(--erp-accent, #2563eb)" />
                <span>{isAr ? 'ضخ رأس مال' : 'Capital Injection'}</span>
              </button>
            )}

            {onOpenPayout && (
              <button
                type="button"
                onClick={onOpenPayout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.65rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left'
                }}
              >
                <Receipt size={13} color="var(--erp-accent, #2563eb)" />
                <span>{isAr ? 'صرف أرباح' : 'Pay Dividend'}</span>
              </button>
            )}

            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.65rem',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: isAr ? 'right' : 'left'
                }}
              >
                <FileSpreadsheet size={13} color="#64748b" />
                <span>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
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
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                color: '#0f172a'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <strong style={{ color: '#0f172a', fontSize: '0.78rem' }}>
                    {isAr ? 'حساب رأس مال الشركاء' : 'Partner Capital'}
                  </strong>
                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    background: '#f1f5f9',
                    color: '#475569'
                  }}>
                    301000
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  {isAr ? 'حقوق الملكية والمساهمات الرأسمالية' : 'Contributed Equity'}
                </span>
              </div>
              <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                <strong style={{ display: 'block', color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.78rem' }}>
                  {totalInjections.formatEGP(isAr)}
                </strong>
                <ArrowUpRight size={13} color="#94a3b8" style={{ marginInlineStart: 'auto' }} />
              </div>
            </Link>

            <Link
              href={`/fin-os/${isAr ? 'ar' : 'en'}/ledger?account=303000`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                color: '#0f172a'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <strong style={{ color: '#0f172a', fontSize: '0.78rem' }}>
                    {isAr ? 'توزيعات وأرباح الشركاء' : 'Partner Distributions'}
                  </strong>
                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    background: '#f1f5f9',
                    color: '#475569'
                  }}>
                    303000
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  {isAr ? 'المسحوبات والأرباح المنصرفة' : 'Profit Distributions Paid'}
                </span>
              </div>
              <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                <strong style={{ display: 'block', color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.78rem' }}>
                  {totalDistributions.formatEGP(isAr)}
                </strong>
                <ArrowUpRight size={13} color="#94a3b8" style={{ marginInlineStart: 'auto' }} />
              </div>
            </Link>

            <Link
              href={`/fin-os/${isAr ? 'ar' : 'en'}/operations`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                color: '#0f172a'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <strong style={{ color: '#0f172a', fontSize: '0.78rem' }}>
                    {isAr ? 'حسابات البنوك والخزينة' : 'Bank & Vault Liquidity'}
                  </strong>
                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    background: '#f1f5f9',
                    color: '#475569'
                  }}>
                    102000 / 101000
                  </span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  {isAr ? 'الخزينة النقدية ومطابقة إنستاباي' : 'Cash Vault & InstaPay'}
                </span>
              </div>
              <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                <strong style={{ display: 'block', color: '#0f172a', fontVariantNumeric: 'tabular-nums', fontSize: '0.78rem' }}>
                  {netVaultBalance.formatEGP(isAr)}
                </strong>
                <ArrowUpRight size={13} color="#94a3b8" style={{ marginInlineStart: 'auto' }} />
              </div>
            </Link>
          </div>
        </ZFWidgetCard>

      </div>
    </ZFWorkstationSideWidgets>
  );
};
