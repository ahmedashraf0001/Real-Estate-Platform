import type { PropertyVideo } from './supabase/types';

export function autoVideoTitle(context: string, number: number, isAr: boolean): string {
  return `${context} — ${isAr ? 'فيديو' : 'video'} ${number}`;
}

export function validateMediaUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) return null;
  } catch { /* Invalid input stays inline. */ }
  return 'Use a valid HTTPS video URL';
}

export function validateVideoFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) return 'MP4, WebM or QuickTime only';
  if (file.size > 200 * 1024 * 1024) return 'Maximum video size: 200 MB';
  return null;
}

export function reorderMedia<T>(items: T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

export function propertyMediaVideos(videos?: PropertyVideo[] | null, legacyUrl?: string | null): PropertyVideo[] {
  return videos?.length ? videos : legacyUrl ? [{ id: 'v-init', url: legacyUrl, category: 'tour' }] : [];
}
