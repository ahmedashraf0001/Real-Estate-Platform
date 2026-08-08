/**
 * Utilities for Smart, Flexible, and Cross-Lingual Real Estate Search
 */

export const PROPERTY_TYPE_MAP: Record<string, string> = {
  // Arabic to English type mappings
  'فيلا': 'villa',
  'فيلات': 'villa',
  'فيلل': 'villa',
  'شقة': 'apartment',
  'شقق': 'apartment',
  'تاون هاوس': 'townhouse',
  'تاونهاوس': 'townhouse',
  'دوبلكس': 'duplex',
  'دوبلكسات': 'duplex',
  'شاليه': 'chalet',
  'شاليهات': 'chalet',
  // English mappings
  'villa': 'villa',
  'villas': 'villa',
  'apartment': 'apartment',
  'apartments': 'apartment',
  'townhouse': 'townhouse',
  'townhouses': 'townhouse',
  'duplex': 'duplex',
  'chalet': 'chalet',
  'chalets': 'chalet',
};

export const LOCATION_TRANSLATIONS: Record<string, string[]> = {
  // Sheikh Zayed mappings
  'شيخ زايد': ['Sheikh Zayed', 'Beverly Hills', 'Westown', 'Zayed'],
  'الشيخ زايد': ['Sheikh Zayed', 'Beverly Hills', 'Westown', 'Zayed'],
  'زايد': ['Sheikh Zayed', 'Beverly Hills', 'Westown', 'Zayed'],
  'zayed': ['Sheikh Zayed', 'الشيخ زايد'],
  'sheikh zayed': ['Sheikh Zayed', 'الشيخ زايد', 'بيفرلي هيلز'],
  
  // Compounds in Zayed
  'بيفرلي هيلز': ['Beverly Hills', 'Sheikh Zayed'],
  'beverly hills': ['Beverly Hills', 'بيفرلي هيلز'],
  'ويست تاون': ['Westown', 'Sheikh Zayed'],
  'westown': ['Westown', 'ويست تاون'],

  // New Cairo / Fifth Settlement mappings
  'التجمع': ['New Cairo', 'Fifth Settlement', 'التجمع الخامس'],
  'التجمع الخامس': ['New Cairo', 'Fifth Settlement', 'التجمع الخامس'],
  'القاهرة الجديدة': ['New Cairo', 'Fifth Settlement'],
  'fifth settlement': ['Fifth Settlement', 'New Cairo', 'التجمع الخامس'],
  'new cairo': ['New Cairo', 'Fifth Settlement', 'القاهرة الجديدة'],

  // North Coast / Sidi Abdel Rahman
  'الساحل': ['North Coast', 'Sidi Abdel Rahman', 'الساحل الشمالي'],
  'الساحل الشمالي': ['North Coast', 'Sidi Abdel Rahman', 'الساحل الشمالي'],
  'north coast': ['North Coast', 'الساحل الشمالي'],
  'سيدي عبد الرحمن': ['Sidi Abdel Rahman', 'North Coast'],
  'sidi abdel rahman': ['Sidi Abdel Rahman', 'سيدي عبد الرحمن'],
};

/**
 * Normalizes Arabic text for flexible matching:
 * - Replaces alef with hamza variations (أ, إ, آ) with plain alef (ا)
 * - Replaces taa marboota (ة) with haa (ه)
 * - Replaces alef maqsura (ى) with yaa (ي)
 * - Strips tashkeel (diacritics)
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // remove tashkeel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

export interface ParsedSearchQuery {
  rawQuery: string;
  detectedType?: string;
  searchTerms: string[];
}

/**
 * Parses raw search input to extract potential property types,
 * cross-lingual location equivalents, and individual search tokens.
 */
export function parseSmartQuery(rawQuery: string): ParsedSearchQuery {
  const trimmed = rawQuery ? rawQuery.trim() : '';
  if (!trimmed) {
    return { rawQuery: '', searchTerms: [] };
  }

  const normalized = normalizeArabicText(trimmed);
  const termsSet = new Set<string>([trimmed, normalized]);

  let detectedType: string | undefined = undefined;

  // Split into tokens by spaces or commas
  const tokens = trimmed.split(/[\s,]+/).filter((t) => t.length > 0);

  for (const token of tokens) {
    const normToken = normalizeArabicText(token);

    // Check if token matches a property type
    if (PROPERTY_TYPE_MAP[normToken]) {
      detectedType = PROPERTY_TYPE_MAP[normToken];
    }
    if (PROPERTY_TYPE_MAP[token.toLowerCase()]) {
      detectedType = PROPERTY_TYPE_MAP[token.toLowerCase()];
    }

    // Check location translations for token
    for (const [key, equivalents] of Object.entries(LOCATION_TRANSLATIONS)) {
      const normKey = normalizeArabicText(key);
      if (normToken.includes(normKey) || normKey.includes(normToken)) {
        equivalents.forEach((eq) => termsSet.add(eq));
      }
    }
  }

  // Check whole query against location translations
  for (const [key, equivalents] of Object.entries(LOCATION_TRANSLATIONS)) {
    const normKey = normalizeArabicText(key);
    if (normalized.includes(normKey) || normKey.includes(normalized)) {
      equivalents.forEach((eq) => termsSet.add(eq));
    }
  }

  // Also add original tokens
  tokens.forEach((t) => {
    if (t.length >= 2) {
      termsSet.add(t);
      termsSet.add(normalizeArabicText(t));
    }
  });

  return {
    rawQuery: trimmed,
    detectedType,
    searchTerms: Array.from(termsSet).filter((t) => t.length > 0),
  };
}

/**
 * Evaluates whether a Property object matches a raw search query string using
 * Arabic normalization, cross-lingual translation tokens, and multi-field inspection.
 */
export function matchesSmartQuery(property: any, rawQuery: string): boolean {
  const trimmed = rawQuery ? rawQuery.trim() : '';
  if (!trimmed) return true;

  const parsed = parseSmartQuery(trimmed);
  if (parsed.searchTerms.length === 0) return true;

  // Build searchable text corpus from property fields
  const corpusParts: string[] = [
    property.title_en || '',
    property.title_ar || '',
    property.location || '',
    property.description_en || '',
    property.description_ar || '',
    property.type || '',
  ];

  const fullCorpusRaw = corpusParts.join(' ').toLowerCase();
  const fullCorpusNormalized = normalizeArabicText(fullCorpusRaw);

  // If query specifies a property type, match on property type
  if (parsed.detectedType && property.type) {
    if (property.type.toLowerCase() === parsed.detectedType.toLowerCase()) {
      return true;
    }
  }

  // Inspect terms across raw and normalized corpus
  for (const term of parsed.searchTerms) {
    const normTerm = normalizeArabicText(term);
    if (!normTerm || normTerm.length < 2) continue;

    if (
      fullCorpusRaw.includes(term.toLowerCase()) ||
      fullCorpusNormalized.includes(normTerm)
    ) {
      return true;
    }
  }

  return false;
}

