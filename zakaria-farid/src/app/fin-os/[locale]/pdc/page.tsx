import React from 'react';
import { HandInstallmentsVaultRouteView } from '@/components/admin/erp/views/HandInstallmentsVaultRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'أجندة المستحقات' : 'Dues agenda',
  };
}

export default function PDCPage() {
  return <HandInstallmentsVaultRouteView />;
}
