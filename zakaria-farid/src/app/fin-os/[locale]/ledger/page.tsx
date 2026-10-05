import React from 'react';
import { GeneralLedgerRouteView } from '@/components/admin/erp/views/GeneralLedgerRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'الحسابات ودفتر اليومية' : 'Accounts & journal',
  };
}

export default function LedgerPage() {
  return <GeneralLedgerRouteView />;
}
