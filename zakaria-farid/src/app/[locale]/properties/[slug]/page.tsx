import { notFound } from 'next/navigation';
import { getPropertyBySlug, getAllProperties } from '@/lib/supabase/queries';
import { adaptProperty, adaptProperties } from '@/lib/utils/propertyAdapter';
import { PropertyDetailView } from '@/components/property/PropertyDetailView';
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

  const title = (locale === 'ar' ? property.title_ar : property.title_en) || 'Luxury Masterpiece';
  const rawDesc = locale === 'ar' ? property.description_ar : property.description_en;
  const description = rawDesc ? rawDesc.replace(/<[^>]*>/g, '').slice(0, 160) : '';
  const coverImage = property.property_images?.[0]?.url;

  return {
    metadataBase: new URL(baseUrl),
    title: `${title} | Zakaria Farid`,
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

  const property = await getPropertyBySlug(slug).catch(() => null);
  if (!property) notFound();

  // Similar properties
  const allProperties = await getAllProperties({ type: property.type }).catch(() => []);
  const similar = allProperties.filter((p) => p.slug !== slug).slice(0, 3);

  const uiProperty = adaptProperty(property, locale as 'en' | 'ar');
  const uiSimilar = adaptProperties(similar, locale as 'en' | 'ar');

  const title = locale === 'ar' ? property.title_ar : property.title_en;
  const cleanDescription = (locale === 'ar' ? property.description_ar : property.description_en)?.replace(/<[^>]*>/g, '') || '';

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description: cleanDescription,
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
    <div key={`property-detail-${slug}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PropertyDetailView
        property={uiProperty}
        similarProperties={uiSimilar}
        locale={locale}
      />
    </div>
  );
}
