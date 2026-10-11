/**
 * Determines whether the in-photo thumbnail strip should render.
 * Requirement A.5: One image and no video -> no strip at all.
 * One image + video -> strip with two thumbs.
 * > 1 images -> strip rendered.
 */
export function shouldRenderThumbnailStrip(imagesCount: number, videosCount: number): boolean {
  return imagesCount + videosCount >= 2;
}

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicNumerals(num: number | string): string {
  return String(num).replace(/\d/g, (d) => AR_DIGITS[Number(d)] ?? d);
}

/**
 * Format thumbnail position counter (e.g. "٢ / ١٤" in Arabic, "2 / 14" in English).
 */
export function formatThumbnailCounter(current: number, total: number, locale: string): string {
  if (locale === 'ar') {
    return `${toArabicNumerals(current)} / ${toArabicNumerals(total)}`;
  }
  return `${current} / ${total}`;
}
