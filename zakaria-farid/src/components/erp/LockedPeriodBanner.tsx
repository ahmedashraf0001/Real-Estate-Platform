'use client';

import React from 'react';
import { Lock, Unlock, AlertOctagon } from 'lucide-react';
import { ERPAccountingPeriod } from '@/lib/erp/types';

export interface LockedPeriodBannerProps {
  period?: ERPAccountingPeriod;
  isAr?: boolean;
  onUnlockPeriod?: (periodId: string) => void | Promise<void>;
  isMutating?: boolean;
}

export const LockedPeriodBanner: React.FC<LockedPeriodBannerProps> = ({
  period,
  isAr = true,
  onUnlockPeriod,
  isMutating = false
}) => {
  if (!period || period.status === 'OPEN') return null;

  return (
    <div 
      style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        width: '100%',
        boxSizing: 'border-box'
      }}
      role="alert"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
        {/* Semantic Squircle Icon */}
        <div 
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#b45309',
            flexShrink: 0
          }}
        >
          <Lock size={15} />
        </div>

        {/* Text Details */}
        <div style={{ minWidth: 0 }}>
          <div style={{ 
            fontWeight: 700, 
            fontSize: '0.86rem', 
            color: '#0f172a', 
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            <span>
              {isAr 
                ? `الفترة المالية (${period.fiscal_year}-M${period.period_number}) مقفلة بموجب المعيار Invariant 0.9` 
                : `Fiscal Period (${period.fiscal_year}-M${period.period_number}) is ${period.status} (Invariant 0.9)`}
            </span>
            <span 
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#991b1b',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                padding: '0.12rem 0.5rem',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <AlertOctagon size={11} />
              <span>{isAr ? 'القيد معطل' : 'Mutations Blocked'}</span>
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.15rem', fontWeight: 500, lineHeight: 1.4 }}>
            {isAr
              ? 'يُحظر تسجيل أي قيود محاسبية أو تعديل حركات مالية داخل فترات مقفلة لحماية تكامل الدفاتر.'
              : 'Mutations into LOCKED or CLOSED accounting periods are strictly blocked to protect ledger integrity.'}
          </div>
        </div>
      </div>

      {/* Trailing Interactive Controls */}
      {typeof onUnlockPeriod === 'function' && (
        <div style={{ flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onUnlockPeriod(period.period_id)}
            disabled={isMutating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'var(--erp-accent, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem 0.85rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: isMutating ? 'not-allowed' : 'pointer',
              opacity: isMutating ? 0.6 : 1,
              transition: 'background-color 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Unlock size={13} />
            <span>{isAr ? 'إلغاء قفل الفترة' : 'Unlock Period'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
