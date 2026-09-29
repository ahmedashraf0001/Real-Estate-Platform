'use client';

import React from 'react';
import { Decimal } from '@/lib/erp/math';

export interface ERPLedgerAmountProps {
  value: Decimal | number | string;
  isAr?: boolean;
  showCurrency?: boolean;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  zeroAsDash?: boolean;
}

export const ERPLedgerAmount: React.FC<ERPLedgerAmountProps> = ({
  value,
  isAr = true,
  showCurrency = true,
  className,
  style,
  color,
  zeroAsDash = false
}) => {
  const d = value instanceof Decimal ? value : new Decimal(value || 0);
  if (zeroAsDash && d.isZero()) {
    return (
      <span className={className} style={{ ...style, color: color || '#94a3b8' }}>
        —
      </span>
    );
  }

  const isNeg = d.isNegative();
  const absDec = d.abs();
  const parts = absDec.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedNumber = `${integerPart}.${parts[1]}`;
  const currencySymbol = isAr ? 'ج.م' : 'EGP';

  return (
    <span
      className={className}
      dir="ltr"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.28rem',
        direction: 'ltr',
        unicodeBidi: 'isolate',
        fontVariantNumeric: 'tabular-nums',
        color: color || (isNeg ? '#dc2626' : undefined),
        ...style
      }}
    >
      <span
        dir="ltr"
        style={{
          direction: 'ltr',
          unicodeBidi: 'isolate',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 'inherit'
        }}
      >
        {isNeg ? `-${formattedNumber}` : formattedNumber}
      </span>
      {showCurrency && (
        <span
          style={{
            fontSize: '0.80em',
            fontWeight: 500,
            color: '#64748b',
            direction: isAr ? 'rtl' : 'ltr',
            unicodeBidi: 'isolate'
          }}
        >
          {currencySymbol}
        </span>
      )}
    </span>
  );
};

export default ERPLedgerAmount;
