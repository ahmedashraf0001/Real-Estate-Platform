'use client';

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { type PlatformDisplaySettings, DEFAULT_PLATFORM_SETTINGS } from '@/lib/services/marketIntelligence';
import { installSettingsPreview, isSettingsPreview, blockPreviewInteraction, type PreviewDraft } from '@/lib/siteContent/preview';
import { readDraft } from '@/lib/siteContent/settingsDraft';
import { stripMarkdown } from '@/lib/markdown/miniMarkdown';

const PlatformSettingsContext = createContext<PlatformDisplaySettings>(DEFAULT_PLATFORM_SETTINGS);
const SettingsPreviewContext = createContext<{ active: boolean; value: PreviewDraft | null }>({ active: false, value: null });

export function useSettingsPreview() { return useContext(SettingsPreviewContext); }

export function PlatformSettingsProvider({ settings, children }: { settings: PlatformDisplaySettings; children?: ReactNode }) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState<PreviewDraft | null>(null);
  const [missingTarget, setMissingTarget] = useState(false);
  useEffect(() => {
    if (!isSettingsPreview(window)) return;
    setActive(true);
    document.documentElement.dataset.settingsPreview = '';
    const page = document.querySelector<HTMLElement>('.app-root');
    if (page) page.inert = true;
    for (const name of ['click', 'submit', 'auxclick']) window.addEventListener(name, blockPreviewInteraction, true);
    const dispose = installSettingsPreview(window, setValue);
    return () => {
      dispose(); delete document.documentElement.dataset.settingsPreview;
      if (page) page.inert = false;
      for (const name of ['click', 'submit', 'auxclick']) window.removeEventListener(name, blockPreviewInteraction, true);
    };
  }, []);
  useEffect(() => {
    if (!value) return;
    document.documentElement.dataset.theme = value.theme;
    const focus = () => {
      document.querySelectorAll('[data-preview-focus]').forEach(el => el.removeAttribute('data-preview-focus'));
      const path = value.focusedPath.map(key => typeof key === 'string' ? key.replace(/(Ar|En)$/, document.documentElement.lang === 'ar' ? 'Ar' : 'En').replace(/^(ar|en)$/, document.documentElement.lang) : key);
      const textValue = readDraft(value.draft, path);
      const text = typeof textValue === 'string' ? stripMarkdown(textValue).trim() : '';
      const region = document.querySelector<HTMLElement>(`[data-preview-target="${value.target}"]:not([data-preview-missing])`);
      setMissingTarget(!region);
      const candidates = [...(region || document.body).querySelectorAll<HTMLElement>('h1,h2,h3,p,span,a,bdi,pre')].filter(el => el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden');
      const phoneField = /phone|whatsapp/i.test(String(path.at(-1)));
      const match = text ? candidates.find(el => el.textContent?.trim() === text || (phoneField && el.textContent?.replace(/\D/g, '') === text.replace(/\D/g, ''))) : null;
      const numericPrice = path[1] === 'marketDistricts' && path.at(-1) === 'pricePerSqm' ? region?.querySelector<HTMLElement>('.snapshot-metric-cell:nth-child(2) .cell-value') : null;
      const whatsapp = path[1] === 'contact' && path.at(-1) === 'whatsapp' ? region?.querySelector<HTMLElement>('.chat-agent-link') : null;
      const focused = region ? numericPrice || whatsapp || match || region.querySelector<HTMLElement>('.card-price') || candidates[0] || region : document.querySelector<HTMLElement>('[data-preview-missing]');
      if (focused) { focused.dataset.previewFocus = ''; focused.scrollIntoView({ block: 'center', behavior: 'instant' }); }
    };
    let timer = window.setTimeout(focus, 80);
    const resized = () => { clearTimeout(timer); timer = window.setTimeout(focus, 80); };
    window.addEventListener('resize', resized);
    return () => { clearTimeout(timer); window.removeEventListener('resize', resized); };
  }, [value, missingTarget]);
  return createElement(SettingsPreviewContext.Provider, { value: { active, value } },
    createElement(PlatformSettingsContext.Provider, { value: value?.draft.platform_settings || settings },
      active && createElement('div', { className: 'settings-preview-badge', 'aria-hidden': true }, document.documentElement.lang === 'ar' ? 'معاينة — لم تُحفظ بعد' : 'Preview — not saved yet'), children,
      active && missingTarget && value && createElement('p', { 'data-preview-target': value.target, 'data-preview-missing': '', className: 'settings-preview-missing' }, document.documentElement.lang === 'ar' ? 'هذا القسم مخفي أو لا تتوفر بيانات لعرضه في المعاينة.' : 'This section is hidden or has no data to preview.')));
}

export function usePlatformSettings(): PlatformDisplaySettings {
  return useContext(PlatformSettingsContext);
}
