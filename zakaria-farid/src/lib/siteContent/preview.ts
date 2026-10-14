import { mergeSiteContent, type SiteContentMap } from './defaults';
import type { DraftPath, SettingsGroup } from './settingsDraft';

export function previewRoute(group: SettingsGroup, locale: string, target: string, slug?: string): string | null {
  if (group === 'whatsapp') return null;
  const suffix = group === 'home' ? '' : group === 'about' || group === 'contact' ? `/${group}`
    : `/properties${group === 'listings' && ['plans', 'commute'].includes(target) && slug ? `/${encodeURIComponent(slug)}` : ''}`;
  return `/${locale === 'ar' ? 'ar' : 'en'}${suffix}?preview=1`;
}

export function isSettingsPreview(view: Window): boolean {
  return view.parent !== view && new URLSearchParams(view.location.search).get('preview') === '1';
}

export interface PreviewDraft {
  draft: SiteContentMap;
  theme: 'light' | 'dark';
  target: string;
  focusedPath: DraftPath;
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function installSettingsPreview(view: Window, apply: (value: PreviewDraft) => void): () => void {
  if (!isSettingsPreview(view)) return () => {};
  const receive = (event: MessageEvent) => {
    if (event.origin !== view.location.origin || event.source !== view.parent) return;
    const data: unknown = event.data;
    if (!object(data) || data.type !== 'settings-preview-draft' || !object(data.draft)
      || !object(data.draft.platform_settings) || !object(data.draft.about_page)
      || (data.theme !== 'light' && data.theme !== 'dark') || typeof data.target !== 'string'
      || !/^[a-z]+$/.test(data.target) || !Array.isArray(data.focusedPath)
      || !data.focusedPath.every(key => typeof key === 'string' || (typeof key === 'number' && Number.isInteger(key)))) return;
    apply({ draft: {
      platform_settings: mergeSiteContent('platform_settings', data.draft.platform_settings),
      about_page: mergeSiteContent('about_page', data.draft.about_page),
    }, theme: data.theme as PreviewDraft['theme'], target: data.target, focusedPath: data.focusedPath });
  };
  view.addEventListener('message', receive);
  view.parent.postMessage({ type: 'settings-preview-ready' }, view.location.origin);
  return () => view.removeEventListener('message', receive);
}

// Capture phase prevents both native links/submits and React click handlers (including router.push).
export function blockPreviewInteraction(event: Event): void {
  event.preventDefault();
  event.stopImmediatePropagation();
}
