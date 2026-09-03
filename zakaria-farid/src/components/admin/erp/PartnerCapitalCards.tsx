/**
 * Zakaria Farid Real Estate ERP — Partner Capital Cards Component
 * Implements the client's visual partner contribution grid.
 * Tracks partner share %, required capital against project WIP, contributed capital, and remaining calls.
 */

import React from 'react';
import { Users, PlusCircle } from 'lucide-react';
import { ERPPartnerCall } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';

interface PartnerCapitalCardsProps {
  partnerCalls: ERPPartnerCall[];
  totalWipIncurred: string;
  onInjectCapital: (partnerName: string) => void;
  isAr: boolean;
  registeredPartners?: Array<{ name: string; role: string }>;
}

export interface PartnerSummary {
  name: string;
  sharePercent: number;
  requiredCapital: string;
  paidCapital: string;
  remainingCapital: string;
  progressPercent: number;
  isFulfilled: boolean;
}

export const PartnerCapitalCards: React.FC<PartnerCapitalCardsProps> = ({
  partnerCalls,
  totalWipIncurred,
  onInjectCapital,
  isAr,
  registeredPartners = []
}) => {
  // Aggregate partners from live partnerCalls and registered system partners
  const partnersMap = new Map<string, { share: number; paid: string; committed: string }>();

  // Filter out any legacy dummy 'شريك 2'
  const validCalls = (partnerCalls || []).filter(p => p.partner_name && p.partner_name !== 'شريك 2');
  const validRegistered = (registeredPartners || []).filter(p => p.name && p.name !== 'شريك 2');

  const otherCount = validCalls.filter(p => p.partner_name !== 'زكريا فريد').length + 
    validRegistered.filter(p => p.name !== 'زكريا فريد').length;

  // If no other partner has been introduced yet, Zakaria Farid is 100%
  const primaryShare = otherCount === 0 ? 100 : Math.round(100 / (otherCount + 1));
  partnersMap.set('زكريا فريد', { share: primaryShare, paid: '0.00', committed: '0.00' });

  // Add all registered partners
  validRegistered.forEach(rp => {
    if (rp.name !== 'زكريا فريد' && !partnersMap.has(rp.name)) {
      partnersMap.set(rp.name, { share: primaryShare, paid: '0.00', committed: '0.00' });
    }
  });

  // Aggregate live partnerCalls
  validCalls.forEach(call => {
    const existing = partnersMap.get(call.partner_name) || {
      share: parseFloat(call.pro_rata_percentage) || primaryShare,
      paid: '0.00',
      committed: call.project_budget_ceiling || '0.00'
    };
    const callPaid = call.paid_amount || (call.status === 'Funded' ? call.call_amount : '0.00');
    existing.paid = D(existing.paid).plus(callPaid).toFixed(2);
    partnersMap.set(call.partner_name, existing);
  });

  const totalWip = D(totalWipIncurred);

  const partnerSummaries: PartnerSummary[] = Array.from(partnersMap.entries()).map(([name, data]) => {
    const shareRatio = data.share / 100;
    // Required capital is either share of total WIP incurred or at least paid amount
    const required = totalWip.greaterThan(0) 
      ? totalWip.times(shareRatio).toFixed(2) 
      : D(data.paid).greaterThan(0) ? data.paid : '1000000.00';

    const paid = data.paid;
    const remainingVal = D(required).minus(paid);
    const remaining = remainingVal.greaterThan(0) ? remainingVal.toFixed(2) : '0.00';
    const isFulfilled = D(remaining).lessThanOrEqual(0);
    const progress = D(required).greaterThan(0)
      ? Math.min(100, Math.max(0, D(paid).div(required).times(100).toNumber()))
      : 100;

    return {
      name,
      sharePercent: data.share,
      requiredCapital: required,
      paidCapital: paid,
      remainingCapital: remaining,
      progressPercent: Math.round(progress),
      isFulfilled
    };
  });

  // Calculate totals
  const totalRequiredAll = partnerSummaries.reduce((acc, p) => acc.plus(p.requiredCapital), D(0));
  const totalPaidAll = partnerSummaries.reduce((acc, p) => acc.plus(p.paidCapital), D(0));
  const totalRemainingAll = partnerSummaries.reduce((acc, p) => acc.plus(p.remainingCapital), D(0));
  const overallFulfillment = totalRequiredAll.greaterThan(0)
    ? Math.min(100, Math.round(totalPaidAll.div(totalRequiredAll).times(100).toNumber()))
    : 0;

  const renderMoneyParts = (val: string | number) => {
    const parts = D(val).toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (
      <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.2rem' }}>
        <span style={{ fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>{integerPart}</span>
        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>.{parts[1]}</span>
        <span style={{ fontSize: '0.66rem', color: '#94a3b8', marginInlineStart: '0.2rem' }}>{isAr ? 'ج.م' : 'EGP'}</span>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>
      {/* Executive Overview 3-Pillar Header Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem'
      }}>
        {/* Pillar 1: Total Equity Required */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, rgba(15, 20, 32, 0.75) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '2px solid #d4af37',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700 }}>
            {isAr ? 'إجمالي مساهمة رأس المال المطلوبة' : 'Total Capital Requirement'}
          </span>
          <div style={{ fontSize: '1.4rem' }}>
            {renderMoneyParts(totalRequiredAll.toString())}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {isAr ? 'مقابل إجمالي التكاليف المنفذة بالمشاريع' : 'Committed against active WIP budget'}
          </span>
        </div>

        {/* Pillar 2: Total Paid In */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 20, 32, 0.75) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '2px solid #10b981',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 700 }}>
              {isAr ? 'إجمالي المنصرف والمضخوخ فعلياً' : 'Total Injected Capital'}
            </span>
            <span style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              {overallFulfillment}% {isAr ? 'مستوفى' : 'Funded'}
            </span>
          </div>
          <div style={{ fontSize: '1.4rem' }}>
            {renderMoneyParts(totalPaidAll.toString())}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {isAr ? 'سيولة مودعة بحسابات الشركة' : 'Cleared into corporate accounts'}
          </span>
        </div>

        {/* Pillar 3: Remaining Calls */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 20, 32, 0.75) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>
            {isAr ? 'متبقي طلبات التمويل (Capital Calls)' : 'Outstanding Capital Calls'}
          </span>
          <div style={{ fontSize: '1.4rem' }}>
            {renderMoneyParts(totalRemainingAll.toString())}
          </div>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            {isAr ? 'التزامات جارية قيد السداد' : 'Pending partner fulfillment'}
          </span>
        </div>
      </div>

      {/* Partners Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.15rem'
      }}>
        {partnerSummaries.map(partner => {
          // Monogram initials
          const initials = partner.name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('');

          return (
            <div
              key={partner.name}
              style={{
                background: 'linear-gradient(180deg, rgba(20, 26, 42, 0.75) 0%, rgba(12, 16, 26, 0.9) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '1.25rem',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              {/* Partner Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    color: '#e2c974',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}>
                    {initials || 'ZF'}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                      {partner.name}
                    </h4>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      {isAr ? 'شريك استراتيجي ومؤسس' : 'Managing Equity Partner'}
                    </span>
                  </div>
                </div>

                <span style={{
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#e2c974'
                }}>
                  {partner.sharePercent}% {isAr ? 'حصة' : 'Equity'}
                </span>
              </div>

              {/* Metrics Table / Rows */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                  <span style={{ color: '#94a3b8' }}>{isAr ? 'رأس المال المطلوب:' : 'Required Capital:'}</span>
                  {renderMoneyParts(partner.requiredCapital)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                  <span style={{ color: '#6ee7b7', fontWeight: 600 }}>{isAr ? 'المضخوخ فعلياً:' : 'Contributed Capital:'}</span>
                  {renderMoneyParts(partner.paidCapital)}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '0.45rem'
                }}>
                  <span style={{ color: partner.isFulfilled ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                    {isAr ? 'المتبقي عليه:' : 'Remaining Call:'}
                  </span>
                  {partner.isFulfilled ? (
                    <span style={{ color: '#10b981', fontWeight: 800 }}>
                      {isAr ? 'مستوفى بالكامل' : 'Fully Funded'}
                    </span>
                  ) : (
                    renderMoneyParts(partner.remainingCapital)
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                  <span>{isAr ? 'نسبة استيفاء الحصة من إجمالي التكاليف' : 'Funding Fulfillment'}</span>
                  <span style={{ fontWeight: 800, color: partner.isFulfilled ? '#10b981' : '#e2c974' }}>
                    {partner.progressPercent}%
                  </span>
                </div>
                <div style={{
                  height: '5px',
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '999px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${partner.progressPercent}%`,
                    background: partner.isFulfilled 
                      ? 'linear-gradient(90deg, #059669, #34d399)' 
                      : 'linear-gradient(90deg, #b8860b, #d4af37)',
                    borderRadius: '999px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onInjectCapital(partner.name)}
                style={{
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--zf-gold, #d4af37)';
                  e.currentTarget.style.color = '#e2c974';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#ffffff';
                }}
              >
                <PlusCircle size={14} />
                <span>{isAr ? `تسجيل ضخ رأس مال لـ ${partner.name}` : `Record Capital Inflow for ${partner.name}`}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
