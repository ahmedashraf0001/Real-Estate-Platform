import { getTranslations } from 'next-intl/server';
import { getFeaturedProperties, getAllProperties } from '@/lib/supabase/queries';
import HeroSection from '@/components/home/HeroSection';
import BrandAboutSection from '@/components/home/BrandAboutSection';
import BrandStatsSection from '@/components/home/BrandStatsSection';
import FeaturedProperties from '@/components/home/FeaturedProperties';
import MapPreview from '@/components/home/MapPreview';
import CtaBand from '@/components/home/CtaBand';
import type { Metadata } from 'next';
import styles from './home.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hero' });
  return {
    title: 'Zakaria Farid Real Estate | Premium Properties in Egypt',
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

  return (
    <div className={styles.snapContainer}>
      <section className={styles.snapSection}>
        <HeroSection locale={locale} />
      </section>
      <section className={styles.snapSection}>
        <BrandAboutSection locale={locale} />
      </section>
      <section className={styles.snapSection}>
        <BrandStatsSection locale={locale} />
      </section>
      <section className={styles.snapSection}>
        <FeaturedProperties properties={featuredProperties} locale={locale} />
      </section>
      <section className={styles.snapSection}>
        <MapPreview locale={locale} properties={allProperties.length > 0 ? allProperties : featuredProperties} />
      </section>
      <section className={styles.snapSection}>
        <CtaBand locale={locale} />
      </section>
    </div>
  );
}
