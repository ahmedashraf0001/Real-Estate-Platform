import React from 'react';
import { GeneralLedgerRouteView } from '@/components/admin/erp/views/GeneralLedgerRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'الدفتر العام واليومية المحاسبية | FIN-OS' : 'General Ledger & Journal Entries | FIN-OS',
  };
}

export default function LedgerPage() {
  return <GeneralLedgerRouteView />;
}
