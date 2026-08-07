import { getTranslations } from 'next-intl/server';
import { getAllProperties } from '@/lib/supabase/queries';
import DynamicFullMap from '@/components/map/DynamicFullMap';
import type { Metadata } from 'next';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'map' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function MapPage({ params }: Props) {
  const { locale } = await params;
  const properties = await getAllProperties().catch(() => []);
  // Pass all properties — the client component will filter by has-coords for markers
  // but we still want all visible in the sidebar for browsing
  const propertiesWithCoords = properties.filter((p) => p.latitude && p.longitude);

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <DynamicFullMap properties={propertiesWithCoords} locale={locale} />
    </div>
  );
}
