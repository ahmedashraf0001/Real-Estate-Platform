'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ZFERPLoadingWorkstation } from '@/components/admin/erp/v2/ZFERPLoadingWorkstation';

export default function FinOSLoading() {
  const pathname = usePathname() || '';
  const isAr = !pathname.includes('/en');

  return <ZFERPLoadingWorkstation isAr={isAr} />;
}
