import React from 'react';
import { PropertyAnalysisRouteView } from '@/components/admin/erp/views/PropertyAnalysisRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'تحليل العقارات' : 'Property analysis',
  };
}

export default function AnalysisPage() {
  return <PropertyAnalysisRouteView />;
}
