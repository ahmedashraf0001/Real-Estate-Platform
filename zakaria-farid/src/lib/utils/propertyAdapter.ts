import type { Property as SupabaseProperty } from '@/lib/supabase/types';
import type { Property } from '@/types';

export type UIProperty = Property;

const PROPERTY_TYPE_MAP: Record<string, string> = {
  apartment: 'Apartment',
  building:  'Building',
  garage:    'Garage',
};

/**
 * Decodes all common named, decimal, and hexadecimal HTML entities.
 * Handles single and multi-pass double-encoded entities (e.g., &amp;amp; -> &amp; -> &).
 */
export function decodeHtmlEntities(raw: string): string {
  if (!raw) return '';
  let result = String(raw);

  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lsquo;': '‘',
    '&rsquo;': '’',
    '&sbquo;': '‚',
    '&ldquo;': '“',
    '&rdquo;': '”',
    '&bdquo;': '„',
    '&hellip;': '…',
    '&prime;': '′',
    '&Prime;': '″',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&deg;': '°',
    '&plusmn;': '±',
    '&sup2;': '²',
    '&sup3;': '³',
    '&frac12;': '½',
    '&frac14;': '¼',
    '&frac34;': '¾',
    '&bull;': '•',
    '&middot;': '·',
  };

  // Perform multi-pass decoding to handle double-escaped entities like &amp;amp;
  for (let pass = 0; pass < 3; pass++) {
    const prev = result;
    // Named entities
    result = result.replace(/&(?:amp|lt|gt|quot|apos|nbsp|ndash|mdash|lsquo|rsquo|sbquo|ldquo|rdquo|bdquo|hellip|prime|Prime|copy|reg|trade|deg|plusmn|sup2|sup3|frac12|frac14|frac34|bull|middot|#39|#039);/gi, (match) => {
      const lower = match.toLowerCase();
      return entityMap[lower] || match;
    });

    // Decimal numeric entities &#123;
    result = result.replace(/&#(\d+);/g, (_, dec) => {
      try {
        const code = parseInt(dec, 10);
        return (code > 0 && code <= 0x10ffff) ? String.fromCodePoint(code) : _;
      } catch {
        return _;
      }
    });

    // Hexadecimal numeric entities &#x1aF;
    result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      try {
        const code = parseInt(hex, 16);
        return (code > 0 && code <= 0x10ffff) ? String.fromCodePoint(code) : _;
      } catch {
        return _;
      }
    });

    if (result === prev) break;
  }

  return result;
}

/**
 * Strips HTML tags, preserves paragraph breaks, and fully decodes HTML entities into clean plain text.
 */
export function cleanHtmlToPlainText(html: string): string {
  if (!html) return '';
  return decodeHtmlEntities(
    html
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
  ).trim();
}

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
        title: decodeHtmlEntities(isAr ? (am.amenity_ar || am.amenity_en) : am.amenity_en),
      }))
    : [];

  const locationStr = decodeHtmlEntities(property.location || 'New Cairo, Egypt');
  const districtName = locationStr.split(',')[0].trim() || 'New Cairo';

  const descEn = cleanHtmlToPlainText(property.description_en || '');
  const descAr = cleanHtmlToPlainText(property.description_ar || '');

  const narrativeText = isAr ? (descAr || descEn) : (descEn || descAr);

  const rawTitle = ((property.title_en || '') + ' ' + (property.title_ar || '')).toLowerCase();
  const derivedType = (() => {
    if (property.type === 'building' || property.type === 'garage' || property.type === 'apartment') {
      return property.type;
    }
    if (rawTitle.includes('building') || rawTitle.includes('عمارة')) return 'building';
    if (rawTitle.includes('garage') || rawTitle.includes('جراج')) return 'garage';
    return property.type || 'apartment';
  })();

  return {
    id: property.slug,
    slug: property.slug,
    title: decodeHtmlEntities(isAr ? property.title_ar : property.title_en),
    title_en: decodeHtmlEntities(property.title_en),
    title_ar: decodeHtmlEntities(property.title_ar),
    location: locationStr,
    district: decodeHtmlEntities(districtName),
    estateName: decodeHtmlEntities(districtName),
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
    propertyType: (PROPERTY_TYPE_MAP[derivedType] || derivedType || 'Apartment') as any,
    type: derivedType as any,
    builtYear: property.construction_completed_at ? new Date(property.construction_completed_at).getFullYear() : undefined,
    floors: property.building_units?.length
      ? Math.max(...property.building_units.map(unit => unit.floor).filter(Number.isFinite)) + 1
      : undefined,
    building_units: property.building_units,
    total_units_count: property.total_units_count,
    calcom_event_link: property.calcom_event_link,
    featured: property.is_featured,
    is_featured: property.is_featured,
    is_archived: property.is_archived,
    completion_status: property.completion_status,
    listing_status: property.listing_status,
    floor_number: property.floor_number ?? null,
    view: property.view ?? null,
    finishing: property.finishing ?? undefined,
    furnishing: property.furnishing ?? 'unfurnished',
    // Neutral "no photos yet" graphic, never a stock photo of another building.
    images: images.length > 0 ? images : ['/images/no-photo.svg'],
    amenities,
    mapCoordinates: property.latitude != null && property.longitude != null
      ? { x: 50, y: 50, lat: Number(property.latitude), lng: Number(property.longitude) }
      : undefined,
    spec_layers: property.spec_layers,
    property_images: property.property_images,
    property_amenities: property.property_amenities,
    videos: property.videos || (property.video_url ? [{
      id: 'v-primary',
      url: property.video_url,
      title_en: 'Property Video Tour',
      title_ar: 'جولة الفيديو داخل العقار',
      category: 'tour',
    }] : undefined),
    video_url: property.video_url || (property.videos && property.videos[0]?.url) || undefined,
    created_at: property.created_at,
    broker: {
      name: isAr ? 'زكريا فريد' : 'Zakaria Farid',
      role: isAr ? 'المالك المباشر' : 'Direct Owner & Principal',
      phone: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
        ? `+${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.replace(/\D/g, '')}`
        : '',
      email: '',
      avatar: '',
    },
  };
}

export function adaptProperties(properties: SupabaseProperty[], locale: 'en' | 'ar' = 'en'): Property[] {
  return properties.map((p) => adaptProperty(p, locale));
}
