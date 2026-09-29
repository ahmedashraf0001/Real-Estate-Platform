import React from 'react';
import { HandInstallmentsVaultRouteView } from '@/components/admin/erp/views/HandInstallmentsVaultRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'أجندة الشيكات والتحصيلات | FIN-OS' : 'Installment Dues & PDC Vault | FIN-OS',
  };
}

export default function PDCPage() {
  return <HandInstallmentsVaultRouteView />;
}
