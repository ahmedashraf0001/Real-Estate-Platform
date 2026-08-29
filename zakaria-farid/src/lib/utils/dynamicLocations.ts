import { Property } from '@/types';

export interface DynamicDestinationPill {
  id: string;
  label: string;
  labelAr: string;
  shortLabel?: string;
  shortLabelAr?: string;
  count?: number;
}

// Curated dictionary of known Egyptian luxury markets & their bilingual names
const KNOWN_DESTINATIONS: Record<string, { en: string; ar: string; shortEn?: string; shortAr?: string; keywords: string[] }> = {
  'soma-bay': {
    en: 'Soma Bay',
    ar: 'سوما باي',
    shortEn: 'Soma Bay',
    shortAr: 'سوما باي',
    keywords: ['soma bay', 'somabay', 'سوما باي']
  },
  'makadi-bay': {
    en: 'Makadi Bay',
    ar: 'مكادي باي',
    shortEn: 'Makadi Bay',
    shortAr: 'مكادي باي',
    keywords: ['makadi', 'makadi bay', 'مكادي باي']
  },
  'gouna': {
    en: 'El Gouna',
    ar: 'الجونة',
    shortEn: 'El Gouna',
    shortAr: 'الجونة',
    keywords: ['gouna', 'el gouna', 'el-gouna', 'abu tig', 'الجونة', 'أبو تيج']
  },
  'ain-sokhna': {
    en: 'Ain Sokhna',
    ar: 'العين السخنة',
    shortEn: 'Ain Sokhna',
    shortAr: 'العين السخنة',
    keywords: ['ain sokhna', 'sokhna', 'galala', 'السخنة', 'العين السخنة', 'الجلالة']
  },
  'madinaty': {
    en: 'Madinaty',
    ar: 'مدينتي',
    shortEn: 'Madinaty',
    shortAr: 'مدينتي',
    keywords: ['madinaty', 'madinty', 'مدينتي']
  },
  'new-capital': {
    en: 'New Administrative Capital',
    ar: 'العاصمة الإدارية',
    shortEn: 'New Capital',
    shortAr: 'العاصمة الإدارية',
    keywords: ['new capital', 'administrative capital', 'العاصمة', 'العاصمة الإدارية']
  },
  'mostakbal-city': {
    en: 'Mostakbal City',
    ar: 'مدينة المستقبل',
    shortEn: 'Mostakbal',
    shortAr: 'المستقبل',
    keywords: ['mostakbal', 'mostakbal city', 'المستقبل', 'مدينة المستقبل']
  },
  'north-coast': {
    en: 'North Coast (Sahel)',
    ar: 'الساحل الشمالي',
    shortEn: 'North Coast',
    shortAr: 'الساحل الشمالي',
    keywords: ['north coast', 'sahel', 'sidi abdel rahman', 'ras el hekma', 'sidi heneish', 'marassi', 'hacienda', 'الساحل', 'الساحل الشمالي', 'رأس الحكمة', 'سيدي عبد الرحمن', 'سيدي حنيش']
  },
  'sheikh-zayed': {
    en: 'Sheikh Zayed',
    ar: 'الشيخ زايد',
    shortEn: 'Sheikh Zayed',
    shortAr: 'الشيخ زايد',
    keywords: ['sheikh zayed', 'zayed', '6th of october', 'october', 'زايد', 'الشيخ زايد', 'أكتوبر', 'السادس من أكتوبر']
  },
  'new-cairo': {
    en: 'New Cairo',
    ar: 'القاهرة الجديدة',
    shortEn: 'New Cairo',
    shortAr: 'القاهرة الجديدة',
    keywords: ['new cairo', 'fifth settlement', 'tagamoa', 'katameya', 'golden square', 'قاهرة جديدة', 'القاهرة الجديدة', 'التجمع', 'المربع الذهبي', 'القطامية']
  },
  'zamalek': {
    en: 'Zamalek',
    ar: 'الزمالك',
    shortEn: 'Zamalek',
    shortAr: 'الزمالك',
    keywords: ['zamalek', 'الزمالك']
  },
  'maadi': {
    en: 'Maadi',
    ar: 'المعادي',
    shortEn: 'Maadi',
    shortAr: 'المعادي',
    keywords: ['maadi', 'sarayat', 'المعادي', 'سرايات المعادي']
  }
};

/**
 * Identify destination key from property's district / location strings
 */
export function identifyPropertyDestinationKey(property: Property): string {
  const district = (property.district || '').toLowerCase().trim();
  const location = (property.location || '').toLowerCase().trim();
  const cityEn = ((property as any).city_en || '').toLowerCase().trim();
  const cityAr = ((property as any).city_ar || '').toLowerCase().trim();
  const districtAr = ((property as any).district_ar || '').toLowerCase().trim();
  const address = ((property as any).address || '').toLowerCase().trim();

  // Priority 1: Check district directly
  for (const [key, config] of Object.entries(KNOWN_DESTINATIONS)) {
    if (config.keywords.some((kw) => district === kw || district.includes(kw) || districtAr.includes(kw))) {
      return key;
    }
  }

  // Priority 2: Check city fields
  for (const [key, config] of Object.entries(KNOWN_DESTINATIONS)) {
    if (config.keywords.some((kw) => cityEn.includes(kw) || cityAr.includes(kw))) {
      return key;
    }
  }

  // Priority 3: Combined string search (district + location + address)
  const combined = `${district} ${location} ${address}`;
  for (const [key, config] of Object.entries(KNOWN_DESTINATIONS)) {
    if (config.keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
      return key;
    }
  }

  // Fallback: Use clean district if non-empty
  if (property.district && property.district.trim().length > 0) {
    return property.district.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-');
  }

  // Fallback: First segment of location
  if (property.location && property.location.trim().length > 0) {
    const firstPart = property.location.split(',')[0].trim();
    if (firstPart) return firstPart.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-');
  }

  return 'other';
}

/**
 * Dynamically compute destination pills based on properties currently in the database
 */
export function getDynamicDestinationPills(properties: Property[]): DynamicDestinationPill[] {
  const counts: Record<string, number> = {};
  const rawDistricts: Record<string, { rawEn: string; rawAr?: string }> = {};

  properties.forEach((p) => {
    const key = identifyPropertyDestinationKey(p);
    counts[key] = (counts[key] || 0) + 1;
    if (!rawDistricts[key]) {
      rawDistricts[key] = {
        rawEn: p.district || p.location?.split(',')[0]?.trim() || key,
        rawAr: (p as any).district_ar || (p as any).city_ar || undefined
      };
    }
  });

  const pills: DynamicDestinationPill[] = [
    {
      id: 'All',
      label: 'All Destinations',
      labelAr: 'جميع الوجهات',
      shortLabel: 'All Cities',
      shortLabelAr: 'جميع المدن',
      count: properties.length
    }
  ];

  // Add all destination keys that have at least 1 property in database
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1]) // Sort by number of properties descending
    .forEach(([key, count]) => {
      const known = KNOWN_DESTINATIONS[key];
      if (known) {
        pills.push({
          id: known.en, // Use canonical English name as filter ID for seamless matching
          label: known.en,
          labelAr: known.ar,
          shortLabel: known.shortEn || known.en,
          shortLabelAr: known.shortAr || known.ar,
          count
        });
      } else {
        // Dynamic unknown location added in Supabase
        const raw = rawDistricts[key];
        const formattedEn = raw?.rawEn || key;
        const formattedAr = raw?.rawAr || formattedEn;
        pills.push({
          id: formattedEn,
          label: formattedEn,
          labelAr: formattedAr,
          shortLabel: formattedEn,
          shortLabelAr: formattedAr,
          count
        });
      }
    });

  return pills;
}
