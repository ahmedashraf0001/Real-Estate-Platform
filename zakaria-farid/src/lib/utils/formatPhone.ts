/**
 * Luxury Phone Number Formatting & Sanitization Utility
 * Formats Egyptian and international numbers with readable spacing and correct LTR direction.
 */

/**
 * Clean phone number for tel: and wa.me links (digits and optional leading +)
 */
export function cleanPhoneNumber(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  let digits = trimmed.replace(/\D/g, '');

  // Fix accidental duplicate country code prefix like 20010... -> 2010...
  if (digits.startsWith('2001') && digits.length === 13) {
    digits = '201' + digits.slice(4);
  } else if (digits.startsWith('01') && digits.length === 11) {
    digits = '20' + digits.slice(1);
  }

  return digits ? `+${digits}` : '';
}

/**
 * Format phone number for luxury UI display with clean spacing and direction
 * e.g.
 * '+2001009970776' -> '+20 100 997 0776'
 * '+201009970776'  -> '+20 100 997 0776'
 * '201009970776'   -> '+20 100 997 0776'
 * '01009970776'    -> '+20 100 997 0776'
 * '+20219688'      -> '+20 2 19688'
 * '19688'          -> '19688'
 */
export function formatDisplayPhoneNumber(raw: string | undefined | null): string {
  if (!raw) return '+20 2 19688';
  const trimmed = String(raw).trim();

  // If short hotline e.g. "19688"
  if (/^\d{5}$/.test(trimmed)) {
    return trimmed;
  }

  // Extract digits only
  let digits = trimmed.replace(/\D/g, '');

  // Fix accidental "2001..." prefix (country code 20 + mobile 01...)
  if (digits.startsWith('2001') && digits.length === 13) {
    digits = '201' + digits.slice(4); // becomes 201009970776 (12 digits)
  }

  // Egyptian Mobile: 12 digits starting with 201 (e.g. 20 100 997 0776)
  if (digits.startsWith('201') && digits.length === 12) {
    const country = '+20';
    const op = digits.slice(2, 5); // 100, 101, 111, 122, etc.
    const part1 = digits.slice(5, 8); // 997
    const part2 = digits.slice(8, 12); // 0776
    return `${country} ${op} ${part1} ${part2}`;
  }

  // Egyptian Mobile starting with 01 (11 digits: 01009970776)
  if (digits.startsWith('01') && digits.length === 11) {
    const country = '+20';
    const op = digits.slice(1, 4); // 100
    const part1 = digits.slice(4, 7); // 997
    const part2 = digits.slice(7, 11); // 0776
    return `${country} ${op} ${part1} ${part2}`;
  }

  // Egyptian Landline with 5-digit hotline (e.g. 20219688)
  if (digits.startsWith('202') && digits.length === 8) {
    return `+20 2 ${digits.slice(3)}`;
  }

  // Egyptian Cairo Landline: 202 followed by 8 digits (20 2 xxxx xxxx)
  if (digits.startsWith('202') && digits.length === 11) {
    return `+20 2 ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
  }

  // General 12-digit numbers with +20
  if (digits.startsWith('20') && digits.length === 12) {
    return `+20 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }

  // General international formatting
  if (digits.length >= 10) {
    const prefix = trimmed.startsWith('+') ? '+' : '+';
    const lead = digits.slice(0, digits.length - 8);
    const mid = digits.slice(-8, -4);
    const end = digits.slice(-4);
    return `${prefix}${lead} ${mid} ${end}`;
  }

  return trimmed;
}
