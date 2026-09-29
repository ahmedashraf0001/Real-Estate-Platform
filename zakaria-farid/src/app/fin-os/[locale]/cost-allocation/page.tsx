import React from 'react';
import { CostAllocationRouteView } from '@/components/admin/erp/views/CostAllocationRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'رسملة التكاليف ومعامل RSV | FIN-OS' : 'Cost Allocation & RSV Factor | FIN-OS',
  };
}

export default function CostAllocationPage() {
  return <CostAllocationRouteView />;
}
