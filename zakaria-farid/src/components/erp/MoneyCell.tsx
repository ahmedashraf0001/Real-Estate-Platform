'use client';

import React from 'react';
import { D, Decimal } from '@/lib/erp/math';

interface MoneyCellProps {
  amount: string | Decimal | number;
  currency?: string;
  exchangeRate?: string;
  className?: string;
  highlight?: boolean;
  isAr?: boolean;
}

export const MoneyCell: React.FC<MoneyCellProps> = ({
  amount,
  currency = 'EGP',
  exchangeRate,
  className = '',
  highlight = false,
  isAr = false
}) => {
  const dec = amount instanceof Decimal ? amount : D(amount);
  const formattedEGP = dec.formatEGP(isAr);

  const isUSD = currency === 'USD' && exchangeRate && exchangeRate !== '1.0000' && exchangeRate !== '1';
  const usdAmount = isUSD ? dec.div(exchangeRate).toFixed(2) : null;

  return (
    <div 
      className={className}
      data-zf-money="true"
      style={{ 
        fontVariantNumeric: 'tabular-nums', 
        display: 'inline-flex', 
        flexDirection: 'column',
        fontWeight: highlight ? 700 : 600,
        color: highlight ? 'var(--zf-gold, #d4af37)' : 'inherit'
      }}
    >
      <span>{formattedEGP}</span>
      {isUSD && (
        <span style={{ fontSize: '0.72rem', color: 'var(--zf-text-muted, #6b7086)', marginTop: '-2px' }}>
          ${usdAmount} USD (@ {exchangeRate})
        </span>
      )}
    </div>
  );
};
