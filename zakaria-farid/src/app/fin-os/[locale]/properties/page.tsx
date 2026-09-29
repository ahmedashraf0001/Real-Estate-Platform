import React from 'react';
import { PropertiesPortfolioRouteView } from '@/components/admin/erp/views/PropertiesPortfolioRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'محفظة المشاريع والوحدات | FIN-OS' : 'Properties & Units Portfolio | FIN-OS',
  };
}

export default function PropertiesPage() {
  return <PropertiesPortfolioRouteView />;
}
