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

  if (!ids) notFound();

  const idList = ids.split(',').slice(0, 3).filter(Boolean);
  if (idList.length < 2) notFound();

  const properties = await getPropertiesByIds(idList).catch(() => []);
  if (properties.length < 2) notFound();

  return <PropertyCompareClient properties={properties} locale={locale} tProps={{}} />;
}
