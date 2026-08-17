import { getTranslations } from 'next-intl/server';
import { getAllProperties } from '@/lib/supabase/queries';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { CatalogView } from '@/components/property/CatalogView';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    location?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'properties' });
  return {
    title: locale === 'ar' ? 'العقارات الفاخرة | زكريا فريد' : 'Luxury Masterpieces | Zakaria Farid',
    description: 'Browse premium properties in Egypt — villas, penthouses, chalets across Sheikh Zayed, New Cairo and the North Coast.',
    alternates: {
      canonical: `/${locale}/properties`,
      languages: { en: '/en/properties', ar: '/ar/properties' },
    },
  };
}

export default async function PropertiesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const rawProperties = await getAllProperties().catch(() => []);
  const uiProperties = adaptProperties(rawProperties, locale as 'en' | 'ar');

  return (
    <CatalogView
      properties={uiProperties}
      initialFilters={{
        location: sp.location,
        propertyType: sp.type,
        minPrice: sp.minPrice,
        maxPrice: sp.maxPrice,
      }}
      locale={locale}
    />
  );
}
