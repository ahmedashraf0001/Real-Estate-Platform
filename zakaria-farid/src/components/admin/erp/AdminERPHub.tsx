'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TAB_REDIRECT_MAP } from '@/lib/erp/routing/tabRedirectMap';
import { ZFERPLoadingWorkstation } from './v2/ZFERPLoadingWorkstation';

export type { ERPWorkspaceTab } from './context/ERPWorkstationContext';

export interface AdminERPHubProps {
  adminLocale: string;
  initialTab?: string;
}

export function resolveERPWorkspaceTab(raw?: string | null): string {
  if (!raw) return 'dashboard';
  const lower = raw.toLowerCase();
  return TAB_REDIRECT_MAP[lower]?.path || 'dashboard';
}

/**
 * Backward-compatibility wrapper for legacy AdminERPHub imports.
 * Performs client redirection to the semantic FIN-OS App Router paths.
 */
export default function AdminERPHub({ adminLocale, initialTab }: AdminERPHubProps) {
  const router = useRouter();

  useEffect(() => {
    const mapping = initialTab ? TAB_REDIRECT_MAP[initialTab.toLowerCase()] : null;
    const subPath = mapping?.path ? `/${mapping.path}` : '';
    const extraQuery = mapping?.defaultSub ? `?sub=${mapping.defaultSub}` : '';
    router.replace(`/fin-os/${adminLocale}${subPath}${extraQuery}`);
  }, [adminLocale, initialTab, router]);

  return <ZFERPLoadingWorkstation isAr={adminLocale === 'ar'} />;
}
