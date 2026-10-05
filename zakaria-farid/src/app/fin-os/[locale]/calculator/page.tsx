import React from 'react';
import { ConstructionFeasibilityRouteView } from '@/components/admin/erp/views/ConstructionFeasibilityRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'حاسبة التكاليف والتسعير' : 'Cost & pricing calculator',
  };
}

export default function CalculatorPage() {
  return <ConstructionFeasibilityRouteView />;
}
