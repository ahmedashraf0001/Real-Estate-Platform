import React from 'react';
import { ApartmentTaxesRouteView } from '@/components/admin/erp/views/ApartmentTaxesRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'الضرائب والرسوم والتراخيص' : 'Taxes, fees & permits',
  };
}

export default function TaxPage() {
  return <ApartmentTaxesRouteView />;
}
