/**
 * Format a price in EGP using Western Arabic numerals (standard for Egyptian real estate).
 */
export function formatPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
    numberingSystem: 'latn', // Western numerals per addendum §1 note
  }).format(price);
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
