// ─── Shared zone category buckets ────────────────────────────────────────────
// One source of truth for how rooms are grouped in the admin UIs (rooms
// sidebar, finishing wizard, review step) so all steps organize identically.

import { PropertyTypeId } from './templates';

export interface ZoneCategoryBucket {
  key: string;
  en: string;
  ar: string;
  emoji: string;
  addTemplates: string[];
  match: (id: string, label?: string) => boolean;
}

const text = (id: string, label?: string) => `${id} ${label ?? ''}`.toLowerCase();

export const SMART_ZONE_SUGGESTIONS: Record<PropertyTypeId, Array<{ en: string; ar: string }>> = {
  apartment: [
    { en: 'Laundry Room', ar: 'غرفة غسيل' },
    { en: 'Storage Room', ar: 'مخزن' },
    { en: 'Guest Toilet', ar: 'حمام ضيوف' },
    { en: 'Dressing Room', ar: 'غرفة ملابس' },
    { en: 'Servant Room', ar: 'غرفة خادمة' },
    { en: 'Open Kitchen', ar: 'مطبخ أمريكي' },
    { en: 'Balcony', ar: 'بلكونة' },
  ],
  building: [
    { en: 'Generator Room', ar: 'غرفة مولد' },
    { en: 'Guard Room', ar: 'غرفة حارس' },
    { en: 'Water Pump Room', ar: 'غرفة طلمبات' },
    { en: 'Meter Room', ar: 'غرفة عدادات' },
    { en: 'Storage Room', ar: 'مخزن' },
  ],
  garage: [
    { en: 'Extra Parking Bay', ar: 'باكية إضافية' },
    { en: 'Storage Room', ar: 'مخزن' },
    { en: 'Washing Area', ar: 'منطقة غسيل' },
  ],
};

export const ZONE_CATEGORY_BUCKETS: Record<PropertyTypeId, ZoneCategoryBucket[]> = {
  apartment: [
    {
      key: 'living',
      en: 'Living & Reception',
      ar: 'المعيشة والاستقبال',
      emoji: '🛋️',
      addTemplates: ['apt.reception', 'apt.corridor', 'apt.laundry'],
      match: (id, label) =>
        /reception|living|dining|corridor|entrance|foyer|salon|office|storage|laundry|family|media/.test(text(id, label)),
    },
    {
      key: 'bedrooms',
      en: 'Bedrooms & Suites',
      ar: 'غرف النوم والأجنحة',
      emoji: '🛏️',
      addTemplates: ['apt.master_bed', 'apt.std_bed', 'apt.dressing'],
      match: (id, label) => /bed|suite|dressing|maid|driver/.test(text(id, label)),
    },
    {
      key: 'baths_kitchen',
      en: 'Bathrooms & Kitchen',
      ar: 'الحمامات والمطبخ',
      emoji: '🛁',
      addTemplates: ['apt.master_bath', 'apt.main_bath', 'apt.guest_bath', 'apt.kitchen'],
      match: (id, label) => /bath|kitchen|powder|toilet|wc|pantry/.test(text(id, label)),
    },
    {
      key: 'outdoor',
      en: 'Balconies & Outdoor',
      ar: 'البلكونات والمساحات الخارجية',
      emoji: '🌿',
      addTemplates: ['apt.balcony'],
      match: (id, label) =>
        /balcony|terrace|roof|exterior|garden|grounds|landscap|pool|fence|jacuzzi/.test(text(id, label)) || id.startsWith('ext.'),
    },
  ],
  building: [
    {
      key: 'structure',
      en: 'Structural & Common',
      ar: 'الهيكل والمناطق المشتركة',
      emoji: '🏗️',
      addTemplates: ['bld.basement', 'bld.ground_lobby', 'bld.typical_floors', 'bld.roof'],
      match: (id, label) => /bld\.|lobby|stair|corridor|entrance|basement|roof/.test(text(id, label)),
    },
    {
      key: 'units',
      en: 'Residential Units',
      ar: 'الوحدات السكنية',
      emoji: '🏠',
      addTemplates: ['apt.reception', 'apt.master_bed', 'apt.std_bed', 'apt.main_bath', 'apt.kitchen'],
      match: (id, label) => /apt\.|unit|flat|شقة/.test(text(id, label)),
    },
  ],
  garage: [
    {
      key: 'access',
      en: 'Access & Entry',
      ar: 'المدخل والبوابة',
      emoji: '🚪',
      addTemplates: ['grg.ramp', 'grg.security_booth'],
      match: (id, label) => /ramp|gate|entrance|security/.test(text(id, label)),
    },
    {
      key: 'bays',
      en: 'Parking Bays',
      ar: 'أماكن الانتظار',
      emoji: '🚗',
      addTemplates: ['grg.bay', 'grg.storage'],
      match: (id, label) => /bay|parking|storage/.test(text(id, label)),
    },
    {
      key: 'electrical',
      en: 'Lighting & Electrical',
      ar: 'الإنارة والكهرباء',
      emoji: '💡',
      addTemplates: ['grg.elec'],
      match: (id, label) => /elec|light/.test(text(id, label)),
    },
  ],
};
