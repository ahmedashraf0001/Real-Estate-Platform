import React from 'react';
import { PartnersManagementRouteView } from '@/components/admin/erp/views/PartnersManagementRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'الشركاء وممولو المشاريع | FIN-OS' : 'Partners & Financiers Management | FIN-OS',
  };
}

export default function PartnersPage() {
  return <PartnersManagementRouteView />;
}
