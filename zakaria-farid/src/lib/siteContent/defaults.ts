import { DEFAULT_PLATFORM_SETTINGS, type PlatformDisplaySettings } from '@/lib/services/marketIntelligence';
import { DEFAULT_ABOUT_CONTENT, type AboutPageContent } from './aboutDefaults';
export { DEFAULT_ABOUT_CONTENT } from './aboutDefaults';
export type { AboutPageContent, BilingualText, AboutStat, AboutChapter, CharterStage } from './aboutDefaults';

export type SiteContentMap = { platform_settings: PlatformDisplaySettings; about_page: AboutPageContent };
export type SiteContentKey = keyof SiteContentMap;
export const SITE_CONTENT_DEFAULTS: SiteContentMap = { platform_settings: DEFAULT_PLATFORM_SETTINGS, about_page: DEFAULT_ABOUT_CONTENT };
export const PRIVATE_AUTOMATION_FIELDS = ['metaAccessToken', 'ultraMsgToken', 'twilioAuthToken'] as const;

// Traverse the defaults as a schema. Unknown keys never enter public props.
function merge(defaultValue: unknown, value: unknown, path: string): unknown {
  if (Array.isArray(defaultValue)) {
    if (!Array.isArray(value)) return structuredClone(defaultValue);
    return value.map((item, index) => merge(defaultValue[index] ?? defaultValue[0], item, `${path}.${index}`));
  }
  if (defaultValue !== null && typeof defaultValue === 'object') {
    const source = value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    return Object.fromEntries(Object.entries(defaultValue).map(([key, fallback]) => [key, merge(fallback, source[key], `${path}.${key}`)]));
  }
  if (typeof value !== typeof defaultValue || (typeof value === 'number' && !Number.isFinite(value))) return defaultValue;
  if (typeof value === 'string' && !value.trim() && !/\.(stats|metrics)\.\d+\.value\.(ar|en)$/.test(path)) return defaultValue;
  return value;
}

export function mergeSiteContent<K extends SiteContentKey>(key: K, value: unknown): SiteContentMap[K] {
  const result = merge(SITE_CONTENT_DEFAULTS[key], value, key) as SiteContentMap[K];
  if (key === 'platform_settings') {
    const config = (result as PlatformDisplaySettings).whatsappAutomation;
    if (config) for (const field of PRIVATE_AUTOMATION_FIELDS) config[field] = '';
    if (config && !['meta_cloud_api', 'ultramsg', 'twilio', 'custom_webhook', 'direct_link'].includes(config.provider)) {
      config.provider = DEFAULT_PLATFORM_SETTINGS.whatsappAutomation!.provider;
    }
  }
  return result;
}
