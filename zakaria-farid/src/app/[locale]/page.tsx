import { getTranslations } from 'next-intl/server';
import { getFeaturedProperties, getAllProperties } from '@/lib/supabase/queries';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { HomeView } from '@/components/home/HomeView';
import type { Metadata } from 'next';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hero' });
  return {
    title: locale === 'ar' ? 'زكريا فريد | العقارات المعمارية الفاخرة في مصر' : 'Zakaria Farid | Sovereign Luxury Real Estate in Egypt',
    description: t('subheadline'),
    openGraph: {
      title: 'Zakaria Farid Real Estate',
      description: t('subheadline'),
      images: [{ url: '/og-home.jpg', width: 1200, height: 630 }],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const [featuredProperties, allProperties] = await Promise.all([
    getFeaturedProperties().catch(() => []),
    getAllProperties().catch(() => []),
  ]);

  const rawList = allProperties.length > 0 ? allProperties : featuredProperties;
  const uiProperties = adaptProperties(rawList, locale as 'en' | 'ar');

  return (
    <HomeView
      properties={uiProperties}
      locale={locale}
    />
  );
}
