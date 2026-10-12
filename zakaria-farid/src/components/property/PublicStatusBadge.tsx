import React from 'react';
import { BadgeCheck } from 'lucide-react';

export function PublicStatusBadge({ status, isAr, children }: { status: 'sold' | 'reserved' | 'under_offer'; isAr: boolean; children?: React.ReactNode }) {
  const sold = status === 'sold';
  return <span data-public-status={sold ? 'sold' : 'reserved'} className={`public-status-badge public-status-${sold ? 'sold' : 'reserved'}`}>
    {sold && <BadgeCheck size={16} aria-hidden="true" />}
    {children ?? (sold ? isAr ? 'تم البيع' : 'Sold' : status === 'under_offer' ? isAr ? 'تحت العرض' : 'Under offer' : isAr ? 'محجوزة' : 'Reserved')}
  </span>;
}
