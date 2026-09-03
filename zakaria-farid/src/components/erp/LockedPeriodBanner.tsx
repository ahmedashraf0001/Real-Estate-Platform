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
        background: 'rgba(185, 140, 255, 0.08)',
        border: '1px solid var(--zf-state-locked, #b98cff)',
        borderRadius: '12px',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        marginBottom: '1rem'
      }}
    >
      <div style={{ color: 'var(--zf-state-locked, #b98cff)' }}>
        <Lock size={20} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
          {isAr 
            ? `تنبيه: الفترة المالية (${period.fiscal_year}-M${period.period_number}) مغلقة / مقفلة` 
            : `Accounting Period Lock: Period ${period.fiscal_year}-M${period.period_number} is ${period.status}`}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--zf-text-secondary, #a7acc0)', marginTop: '0.15rem' }}>
          {isAr
            ? 'بموجب المعيار المحاسبي Invariant 0.9: يُحظر قيد أي حركات مالية جديدة أو تعديل حسابات داخل فترات مقفلة.'
            : 'Per ERP Invariant 0.9: Mutations into LOCKED or CLOSED accounting periods are strictly blocked.'}
        </div>
      </div>
      <div style={{ marginLeft: isAr ? undefined : 'auto', marginRight: isAr ? 'auto' : undefined }}>
        <span 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            fontSize: '0.72rem', 
            fontWeight: 700,
            color: 'var(--zf-state-locked, #b98cff)',
            background: 'rgba(185, 140, 255, 0.15)',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px'
          }}
        >
          <AlertOctagon size={12} />
          <span>{isAr ? 'القيد معطل' : 'Submissions Disabled'}</span>
        </span>
      </div>
    </div>
  );
};
