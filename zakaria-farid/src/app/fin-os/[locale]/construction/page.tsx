import React from 'react';
import { ConstructionPayablesRouteView } from '@/components/admin/erp/views/ConstructionPayablesRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'مصاريف البناء ومستحقات المقاولين | FIN-OS' : 'Construction WIP & Contractor Payables | FIN-OS',
  };
}

export default function ConstructionPage() {
  return <ConstructionPayablesRouteView />;
}
