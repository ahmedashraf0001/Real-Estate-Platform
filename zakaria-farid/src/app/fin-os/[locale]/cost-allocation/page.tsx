import React from 'react';
import { CostAllocationRouteView } from '@/components/admin/erp/views/CostAllocationRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'توزيع تكاليف البناء' : 'Cost allocation',
  };
}

export default function CostAllocationPage() {
  return <CostAllocationRouteView />;
}
