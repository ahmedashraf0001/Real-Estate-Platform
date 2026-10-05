import React from 'react';
import { PropertiesPortfolioRouteView } from '@/components/admin/erp/views/PropertiesPortfolioRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'العقارات والوحدات' : 'Properties & units',
  };
}

export default function PropertiesPage() {
  return <PropertiesPortfolioRouteView />;
}
