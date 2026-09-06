import { getPropertiesByIds } from '@/lib/supabase/queries';
import { notFound } from 'next/navigation';
import PropertyCompareClient from '@/components/property/PropertyCompareClient';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { ids } = await searchParams;

  const idList = ids ? ids.split(',').slice(0, 3).filter(Boolean) : [];
  let properties: any[] = [];

  if (idList.length >= 2) {
    properties = await getPropertiesByIds(idList).catch(() => []);
  }

  // If no properties or less than 2, fetch all properties so user can pick
  let allProps: any[] = [];
  if (properties.length < 2) {
    const { getAllProperties } = await import('@/lib/supabase/queries');
    allProps = await getAllProperties().catch(() => []);
  }

  return (
    <PropertyCompareClient 
      properties={properties} 
      allAvailableProperties={allProps} 
      locale={locale} 
      tProps={{}} 
    />
  );
}
