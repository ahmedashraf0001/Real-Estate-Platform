import React from 'react';
import { ConstructionPayablesRouteView } from '@/components/admin/erp/views/ConstructionPayablesRouteView';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'تكاليف البناء ومستحقات المقاولين' : 'Construction costs & contractor dues',
  };
}

export default function ConstructionPage() {
  return <ConstructionPayablesRouteView />;
}
