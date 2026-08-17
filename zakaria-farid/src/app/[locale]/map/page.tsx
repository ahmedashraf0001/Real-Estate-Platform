import { getTranslations } from 'next-intl/server';
import { getAllProperties } from '@/lib/supabase/queries';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { MapView } from '@/components/map/MapView';
import type { Metadata } from 'next';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'map' });
  return { 
    title: locale === 'ar' ? 'الخريطة التفاعلية | زكريا فريد' : 'Interactive Cartography | Zakaria Farid',
    description: t('subtitle') 
  };
}

export default async function MapPage({ params }: Props) {
  const { locale } = await params;
  const properties = await getAllProperties().catch(() => []);
  const uiProperties = adaptProperties(properties, locale as 'en' | 'ar');

  return (
    <MapView
      properties={uiProperties}
      locale={locale}
    />
  );
}
