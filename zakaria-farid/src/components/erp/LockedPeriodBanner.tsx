'use client';

import React from 'react';
import { Lock, AlertOctagon } from 'lucide-react';
import { ERPAccountingPeriod } from '@/lib/erp/types';

interface LockedPeriodBannerProps {
  period?: ERPAccountingPeriod;
  isAr?: boolean;
}

export const LockedPeriodBanner: React.FC<LockedPeriodBannerProps> = ({
  period,
  isAr = false
}) => {
  if (!period || period.status === 'OPEN') return null;

  return (
    <div 
      style={{
        background: '#fffbeb',
        border: '1px solid rgba(217, 119, 6, 0.35)',
        borderRadius: '14px',
        padding: '0.9rem 1.35rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 6px rgba(217, 119, 6, 0.06)'
      }}
    >
      <div style={{
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        background: '#fef3c7',
        border: '1px solid rgba(217, 119, 6, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#b45309',
        flexShrink: 0
      }}>
        <Lock size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#92400e', letterSpacing: '-0.01em' }}>
          {isAr 
            ? `تنبيه: الفترة المالية (${period.fiscal_year}-M${period.period_number}) مغلقة / مقفلة` 
            : `Accounting Period Lock: Period ${period.fiscal_year}-M${period.period_number} is ${period.status}`}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#78350f', marginTop: '0.2rem', fontWeight: 500, lineHeight: 1.4 }}>
          {isAr
            ? 'بموجب المعيار المحاسبي Invariant 0.9: يُحظر قيد أي حركات مالية جديدة أو تعديل حسابات داخل فترات مقفلة.'
            : 'Per ERP Invariant 0.9: Mutations into LOCKED or CLOSED accounting periods are strictly blocked.'}
        </div>
      </div>
      <div style={{ marginLeft: isAr ? undefined : 'auto', marginRight: isAr ? 'auto' : undefined, flexShrink: 0 }}>
        <span 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            fontSize: '0.74rem', 
            fontWeight: 800,
            color: '#991b1b',
            background: '#fee2e2',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            padding: '0.28rem 0.65rem',
            borderRadius: '6px'
          }}
        >
          <AlertOctagon size={13} />
          <span>{isAr ? 'القيد معطل' : 'Submissions Disabled'}</span>
        </span>
      </div>
    </div>
  );
};
