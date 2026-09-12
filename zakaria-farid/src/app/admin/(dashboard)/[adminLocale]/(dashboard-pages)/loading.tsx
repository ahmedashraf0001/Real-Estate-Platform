'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ZFSkeletonTable, ZFSkeletonDashboard } from '@/components/admin/ui/ZFSkeletonLoader';

export default function AdminLoading() {
  const pathname = usePathname() || '';
  const isAr =
    pathname.startsWith('/admin/ar') ||
    pathname.includes('/ar') ||
    (typeof document !== 'undefined' &&
      (document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl'));

  // If loading the analytics or business intelligence page
  if (pathname.includes('/analytics')) {
    return <ZFSkeletonDashboard isAr={isAr} />;
  }

  // Default for all other pages (/properties, /leads, /settings, /erp, etc.)
  return <ZFSkeletonTable isAr={isAr} />;
}
