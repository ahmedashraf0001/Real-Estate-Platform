import type { Property as SupabaseProperty } from '@/lib/supabase/types';
import type { Property } from '@/types';

export type UIProperty = Property;

const PROPERTY_TYPE_MAP: Record<string, string> = {
  villa: 'Standalone Villa',
  apartment: 'Apartment',
  townhouse: 'Townhouse',
  duplex: 'Duplex',
  chalet: 'Chalet',
};

export function adaptProperty(property: SupabaseProperty, locale: 'en' | 'ar' = 'en'): Property {
  const isAr = locale === 'ar';

  const images = property.property_images
    ? property.property_images
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((img: any) => img.url)
    : [];

  const amenities = property.property_amenities
    ? property.property_amenities.map((am: any) => ({
        icon: 'check',
        title: isAr ? (am.amenity_ar || am.amenity_en) : am.amenity_en,
      }))
    : [];

  const locationStr = property.location || 'New Cairo, Egypt';
  const districtName = locationStr.split(',')[0].trim() || 'New Cairo';

  const descEn = (property.description_en || '')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();

  const descAr = (property.description_ar || '')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();

  const narrativeText = isAr ? (descAr || descEn) : (descEn || descAr);

  return {
    id: property.slug,
    slug: property.slug,
    title: isAr ? property.title_ar : property.title_en,
    title_en: property.title_en,
    title_ar: property.title_ar,
    location: locationStr,
    district: districtName,
    estateName: districtName,
    description: narrativeText,
    description_en: descEn,
    description_ar: descAr,
    narrative: narrativeText,
    price: property.price_egp || 0,
    price_egp: property.price_egp || 0,
    currency: isAr ? 'ج.م' : 'EGP',
    beds: property.bedrooms || 0,
    baths: property.bathrooms || 0,
    sqm: property.area_sqm || 0,
    propertyType: (PROPERTY_TYPE_MAP[property.type] || property.type || 'Standalone Villa') as any,
    type: property.type,
    builtYear: 2025,
    featured: property.is_featured,
    is_featured: property.is_featured,
    is_archived: property.is_archived,
    completion_status: property.completion_status,
    listing_status: property.listing_status,
    floor_number: property.floor_number ?? null,
    view: property.view ?? null,
    finishing: property.finishing ?? (property.completion_status === 'off_plan' ? 'red_brick' : 'fully_finished'),
    furnishing: property.furnishing ?? 'unfurnished',
    images: images.length > 0 ? images : [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85'
    ],
    amenities,
    mapCoordinates: {
      x: 50,
      y: 50,
      lat: property.latitude ?? 30.0444,
      lng: property.longitude ?? 31.2357,
    },
    spec_layers: property.spec_layers,
    property_images: property.property_images,
    property_amenities: property.property_amenities,
    created_at: property.created_at,
    broker: {
      name: isAr ? 'زكريا فريد' : 'Zakaria Farid',
      role: isAr ? 'المالك المباشر' : 'Direct Owner & Principal',
      phone: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
        ? `+${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`
        : '+201000000000',
      email: 'contact@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
    },
  };
}

export function adaptProperties(properties: SupabaseProperty[], locale: 'en' | 'ar' = 'en'): Property[] {
  return properties.map((p) => adaptProperty(p, locale));
}
