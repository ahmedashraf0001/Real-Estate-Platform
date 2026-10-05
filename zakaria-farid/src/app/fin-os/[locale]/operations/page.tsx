import React from 'react';
import { DailyOperationsRouteView } from '@/components/admin/erp/views/DailyOperationsRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'الخزينة والعمليات اليومية' : 'Treasury & daily operations',
  };
}

export default function DailyOperationsPage() {
  return <DailyOperationsRouteView />;
}
