import React from 'react';
import { ContractRescissionsRouteView } from '@/components/admin/erp/views/ContractRescissionsRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'فسخ واسترداد العقود | FIN-OS' : 'Contract Rescissions & Settlements | FIN-OS',
  };
}

export default function RescissionsPage() {
  return <ContractRescissionsRouteView />;
}
