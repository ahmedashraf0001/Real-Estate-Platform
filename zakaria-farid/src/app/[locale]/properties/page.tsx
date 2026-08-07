import { getTranslations } from 'next-intl/server';
import { getAllProperties } from '@/lib/supabase/queries';
import PropertiesClient from '@/components/property/PropertiesClient';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    location?: string;
    min_price?: string;
    max_price?: string;
    bedrooms?: string;
    type?: string;
    status?: string;
    sort?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'properties' });
  return {
    title: t('title'),
    description: 'Browse premium properties in Egypt — villas, apartments, townhouses and chalets across Sheikh Zayed, New Cairo and the North Coast.',
    alternates: {
      canonical: `/${locale}/properties`,
      languages: { en: '/en/properties', ar: '/ar/properties' },
    },
  };
}

export default async function PropertiesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const properties = await getAllProperties({
    location: sp.location,
    min_price: sp.min_price ? Number(sp.min_price) : undefined,
    max_price: sp.max_price ? Number(sp.max_price) : undefined,
    bedrooms: sp.bedrooms ? Number(sp.bedrooms) : undefined,
    type: sp.type,
    listing_status: sp.status,
    sort: sp.sort as 'newest' | 'price_asc' | 'price_desc' | undefined,
  }).catch(() => []);

  return <PropertiesClient properties={properties} locale={locale} initialParams={sp} />;
}
