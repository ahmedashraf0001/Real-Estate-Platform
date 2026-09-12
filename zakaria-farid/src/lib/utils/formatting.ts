/**
 * Break price into numeric formatted value and currency symbol per ERP standard.
 */
export function formatPriceParts(price: number, locale: string): { num: string; cur: string } {
  const num = Number(price || 0).toLocaleString('en-US');
  const cur = locale === 'ar' ? 'ج.م' : 'EGP';
  return { num, cur };
}

/**
 * Format a price in EGP using Western Arabic numerals with thousands separator and non-breaking currency symbol.
 */
export function formatPrice(price: number, locale: string): string {
  const { num, cur } = formatPriceParts(price, locale);
  return `${num}\u00A0${cur}`;
}

/**
 * Format a number (e.g. area_sqm) with locale-aware separators but Western numerals.
 */
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    numberingSystem: 'latn',
  }).format(value);
}

/**
 * Format a date string using locale-aware formatting.
 */
export function formatDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    numberingSystem: 'latn',
  }).format(new Date(dateStr));
}

/**
 * Build a WhatsApp deep-link URL.
 */
export function whatsappUrl(phone: string, message?: string): string {
  const encoded = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${phone.replace(/\D/g, '')}${encoded ? `?text=${encoded}` : ''}`;
}

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '201009970776';
