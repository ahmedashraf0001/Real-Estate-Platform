import { SITE_CONTENT_DEFAULTS, type SiteContentMap, type SiteContentKey } from './defaults';

export const SETTINGS_GROUPS = [
  { id: 'home', ar: 'الصفحة الرئيسية', en: 'Home', descriptionAr: 'الأقسام والنصوص التي تظهر في الصفحة الرئيسية.', descriptionEn: 'Sections and editorial text on the home page.' },
  { id: 'about', ar: 'صفحة من نحن', en: 'About', descriptionAr: 'السردية والإحصاءات وميثاق الفحص ورسالة المؤسس.', descriptionEn: 'Story, statistics, inspection charter and founder message.' },
  { id: 'listings', ar: 'عرض العقارات', en: 'Listings display', descriptionAr: 'تحكم في الأسعار والمخططات وأوقات الوصول والتنبيهات.', descriptionEn: 'Control prices, plans, travel times and alerts.' },
  { id: 'contact', ar: 'التواصل والمقر', en: 'Contact', descriptionAr: 'بيانات التواصل وعنوان المكتب على الموقع.', descriptionEn: 'Public contact details and office address.' },
  { id: 'radar', ar: 'مؤشر الأسعار', en: 'Price index', descriptionAr: 'رتّب المناطق وحرّر بيانات المؤشر المعروضة للزوار.', descriptionEn: 'Order districts and edit the public market index.' },
  { id: 'whatsapp', ar: 'تنبيهات واتساب', en: 'WhatsApp alerts', descriptionAr: 'إعدادات إرسال الاستفسارات. البيانات السرية تضبط على الخادم.', descriptionEn: 'Inquiry delivery settings. Credentials are configured on the server.' },
] as const;
export type SettingsGroup = typeof SETTINGS_GROUPS[number]['id'];
export type DraftPath = (string | number)[];
export type DraftValue = string | number | boolean | DraftValue[] | { [key: string]: DraftValue };
const groupPaths: Record<SettingsGroup, DraftPath[]> = {
  home: [['platform_settings', 'home']], about: [['about_page']], contact: [['platform_settings', 'contact']],
  radar: [['platform_settings', 'marketDistricts']], whatsapp: [['platform_settings', 'whatsappAutomation']],
  listings: ['hidePropertyPrices','showFloorPlans','showCommuteTimes','showVIPAlerts','showMarketRadar'].map(key => ['platform_settings',key]),
};
export function readDraft(draft: unknown, path: DraftPath): DraftValue {
  return path.reduce((value, key) => (value as Record<string | number, unknown>)?.[key], draft) as DraftValue;
}
export function updateDraft(draft: SiteContentMap, path: DraftPath, value: DraftValue): SiteContentMap {
  const next = structuredClone(draft);
  let target = next as unknown as Record<string | number, DraftValue>;
  for (const key of path.slice(0, -1)) target = target[key] as Record<string | number, DraftValue>;
  target[path.at(-1)!] = value;
  return next;
}
function countChanges(a: unknown, b: unknown): number {
  if (JSON.stringify(a) === JSON.stringify(b)) return 0;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
    return [...new Set([...Object.keys(left), ...Object.keys(right)])].reduce((sum,key) => sum + countChanges(left[key],right[key]),0);
  }
  return 1;
}
export function dirtySettings(saved: SiteContentMap, draft: SiteContentMap) {
  const groups = SETTINGS_GROUPS.filter(group => groupPaths[group.id].some(path => countChanges(readDraft(saved,path),readDraft(draft,path)) > 0)).map(group => group.id);
  return { count: countChanges(saved,draft), groups };
}
export function resetGroup(draft: SiteContentMap, group: SettingsGroup): SiteContentMap {
  return groupPaths[group].reduce((next,path) => updateDraft(next,path,structuredClone(readDraft(SITE_CONTENT_DEFAULTS,path))),draft);
}
export async function saveSettingsDraft(saved: SiteContentMap, draft: SiteContentMap, save: (key: SiteContentKey, content: SiteContentMap[SiteContentKey]) => Promise<{success: boolean; error?: string}>) {
  const next = structuredClone(saved), errors: Partial<Record<SiteContentKey,string>> = {};
  for (const key of ['platform_settings','about_page'] as const) {
    if (!countChanges(saved[key],draft[key])) continue;
    try {
      const result = await save(key,draft[key]);
      if (result.success) Object.assign(next,{[key]:structuredClone(draft[key])});
      else errors[key] = result.error || 'Save failed';
    } catch (error) { errors[key] = error instanceof Error ? error.message : 'Save failed'; }
  }
  return { saved: next, errors };
}
export function settingsGroupFromUrl(search: string): SettingsGroup {
  const group = new URLSearchParams(search).get('group');
  return SETTINGS_GROUPS.find(item => item.id === group)?.id || 'home';
}
export function shouldWarnNavigation(dirty: boolean, current: string, target: string) {
  const from = new URL(current), to = new URL(target,from);
  return dirty && (from.origin !== to.origin || from.pathname !== to.pathname);
}
export const ABOUT_BLOCKS = [
  { id:'hero', ar: 'الواجهة الرئيسية', en: 'Hero', toggle:'showHero', fields:['coordinates','imageAlt','badge','heroTitle1','heroTitle2','manifesto','heroCta1Text','heroCta2Text'] },
  { id:'stats', ar: 'الإحصاءات', en: 'Statistics', toggle:'showMetrology', fields:['stats'] },
  { id:'story', ar: 'السردية والفصول', en: 'Story & chapters', toggle:'showParavent', fields:['paraventEyebrow','paraventTitle','paraventDesc','chapterLabel','chapters'] },
  { id:'charter', ar: 'ميثاق الفحص', en: 'Inspection charter', toggle:'showCuration', fields:['curationEyebrow','curationTitle','curationDesc','acceptLabel','rejectLabel','stages','reportPrompt','reportLink'] },
  { id:'founder', ar: 'رسالة المؤسس', en: 'Founder', toggle:'showFounder', fields:['founderEyebrow','founderEst','founderQuote','founderName','founderTitle','founderStamp'] },
  { id:'portal', ar: 'التواصل والاستشارة', en: 'Contact & advisory', toggle:'showPortal', fields:['portalEyebrow','portalHeading','portalParagraph','portalCtaBtn','portalCatalog'] },
] as const;
export function previewTarget(group: SettingsGroup, path: DraftPath): string {
  const field = String(path[group === 'about' || group === 'listings' ? 1 : 2] || '');
  if (group === 'about') return ABOUT_BLOCKS.find(block => block.toggle === field || block.fields.some(prefix => field.startsWith(prefix)))?.id || 'hero';
  if (group === 'home') return /Stats/.test(field) ? 'stats' : /Featured|featured/.test(field) ? 'featured' : /Map/.test(field) ? 'map' : /Sovereign/.test(field) ? 'advisory' : /Seller|seller/.test(field) ? 'seller' : 'hero';
  if (group === 'listings') return field === 'showCommuteTimes' ? 'commute' : field === 'showFloorPlans' ? 'plans' : field === 'showVIPAlerts' ? 'vip' : field === 'showMarketRadar' ? 'radar' : 'price';
  return group;
}
