import { ATTRIBUTE_TEMPLATES, TRADE_TEMPLATES, ZONE_TEMPLATES } from './templates';
import type { ZoneInstance } from './instances';
import { FALLBACK_ZONE_TITLES } from './zoneMetrics';

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  NotStarted: { en: 'Not started', ar: 'لم يبدأ' }, RoughIn: { en: 'Rough-in', ar: 'تمديدات خام' },
  Finished: { en: 'Finished', ar: 'مكتمل' }, ConduitsOnly: { en: 'Conduits only', ar: 'مواسير فقط' },
  Wired: { en: 'Wired', ar: 'تم تركيب الأسلاك' }, RedBrick: { en: 'Red brick', ar: 'طوب أحمر' },
  Plastered: { en: 'Plastered', ar: 'محارة' }, Tiled: { en: 'Tiled', ar: 'تم تركيب البلاط' },
  FinalPaint: { en: 'Final paint', ar: 'دهان نهائي' }, Putty: { en: 'Putty', ar: 'معجون' },
  SandBed: { en: 'Sand bed', ar: 'فرشة رمل' }, None: { en: 'None', ar: 'لا يوجد' },
  SubFrames: { en: 'Sub-frames', ar: 'حلوق' }, Installed: { en: 'Installed', ar: 'مركب' },
  CopperPrep: { en: 'Copper preparation', ar: 'تمديد نحاس' }, InProgress: { en: 'In progress', ar: 'جارٍ التنفيذ' },
  Shaft: { en: 'Shaft ready', ar: 'بئر المصعد جاهز' }, Applied: { en: 'Applied', ar: 'تم التطبيق' },
  Primed: { en: 'Primed', ar: 'دهان تأسيسي' }, Screed: { en: 'Screed', ar: 'طبقة تسوية' },
  Epoxy: { en: 'Epoxy', ar: 'إيبوكسي' }, FrameFixed: { en: 'Frame fixed', ar: 'تم تثبيت الإطار' },
  available: { en: 'Available', ar: 'متاحة' }, reserved: { en: 'Reserved', ar: 'محجوزة' },
  sold: { en: 'Sold', ar: 'مباعة' }, contracted: { en: 'Sold', ar: 'مباعة' },
  red_brick: { en: 'Red brick', ar: 'طوب أحمر' }, semi_finished: { en: 'Semi-finished', ar: 'نصف تشطيب' },
  fully_finished: { en: 'Fully finished', ar: 'تشطيب كامل' },
};

/** Resolve system labels in one language. Technical identifiers never leak as labels. */
export function blueprintLabel(kind: 'zone' | 'trade' | 'attribute' | 'status', id: string, isAr: boolean): string {
  if (kind === 'status') return STATUS_LABELS[id]?.[isAr ? 'ar' : 'en'] ?? (isAr ? 'غير محدد' : 'Unspecified');
  const templates = kind === 'zone' ? ZONE_TEMPLATES : kind === 'trade' ? TRADE_TEMPLATES : ATTRIBUTE_TEMPLATES;
  const template = templates.find(t => t.id === id);
  if (template) return isAr ? template.label_ar : template.label_en.replace(/\s*\([^)]*[\u0600-\u06ff][^)]*\)/g, '');
  if (kind === 'zone' && FALLBACK_ZONE_TITLES[id]) return FALLBACK_ZONE_TITLES[id][isAr ? 'ar' : 'en'];
  return isAr ? 'غير محدد' : 'Unspecified';
}

export function unitCode(raw: string): string {
  return raw.replace(/^(?:Flat|Apt|Apartment|Unit|شقة|وحدة)\s*/i, '').replace(/\s*[-(]\s*(?:Floor|الدور).*$/i, '').trim();
}

export function zoneLabel(zone: ZoneInstance, isAr: boolean): string {
  if (zone.zone_template_id === 'bld.unit') {
    const code = unitCode(zone.unit?.unit_code ?? zone.instance_label ?? '');
    return code ? `${isAr ? 'شقة' : 'Apartment'} ${code}` : blueprintLabel('zone', zone.zone_template_id, isAr);
  }
  const label = zone.instance_label?.trim();
  if (label && (isAr ? !/[A-Za-z]/.test(label) : !/[\u0600-\u06ff]/.test(label))) return label;
  const base = blueprintLabel('zone', zone.zone_template_id, isAr);
  const suffix = label?.match(/\s(\d+)$/)?.[1];
  return suffix ? `${base} ${suffix}` : base;
}
