import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getPropertyBySlug, getAllProperties } from '@/lib/supabase/queries';
import PropertyDetailClient from '@/components/property/PropertyDetailClient';
import MobileLeadBar from '@/components/layout/MobileLeadBar';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const { getAllPropertySlugs } = await import('@/lib/supabase/queries');
  const slugs = await getAllPropertySlugs().catch(() => []);
  return slugs.flatMap(({ slug }) => [
    { locale: 'en', slug },
    { locale: 'ar', slug },
  ]);
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const property = await getPropertyBySlug(slug).catch(() => null);
  if (!property) return { title: 'Property Not Found' };

  const title = (locale === 'ar' ? property.title_ar : property.title_en) || 'Property';
  const rawDesc = locale === 'ar' ? property.description_ar : property.description_en;
  const description = rawDesc ? rawDesc.slice(0, 160) : '';
  const coverImage = property.property_images?.[0]?.url;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      images: coverImage ? [{ url: coverImage, width: 1200, height: 630, alt: title }] : [],
    },
    alternates: {
      canonical: `/${locale}/properties/${slug}`,
      languages: {
        en: `/en/properties/${slug}`,
        ar: `/ar/properties/${slug}`,
      },
    },
  };
}

export default async function PropertyDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'property' });

  const property = await getPropertyBySlug(slug).catch(() => null);
  if (!property) notFound();

  // Similar properties (same type, different slug, max 3)
  const allProperties = await getAllProperties({ type: property.type }).catch(() => []);
  const similar = allProperties.filter((p) => p.slug !== slug).slice(0, 3);

  const title = locale === 'ar' ? property.title_ar : property.title_en;

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description: locale === 'ar' ? property.description_ar : property.description_en,
    url: `https://zakariafarid.com/${locale}/properties/${slug}`,
    image: property.property_images?.map((img) => img.url) ?? [],
    offers: {
      '@type': 'Offer',
      price: property.price_egp,
      priceCurrency: 'EGP',
      availability: property.listing_status === 'active'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    numberOfBedrooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    floorSize: {
      '@type': 'QuantitativeValue',
      value: property.area_sqm,
      unitCode: 'MTK',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.location,
      addressCountry: 'EG',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PropertyDetailClient property={property} locale={locale} similar={similar} />
    </>
  );
}
