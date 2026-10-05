import React from 'react';
import { ContractsRegistryRouteView } from '@/components/admin/erp/views/ContractsRegistryRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'عقود البيع' : 'Sales contracts',
  };
}

export default function ContractsPage() {
  return <ContractsRegistryRouteView />;
}
