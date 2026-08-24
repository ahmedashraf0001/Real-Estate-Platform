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
      key: 'ground_entrance',
      en: 'Ground & Entrance',
      ar: 'المدخل والدور الأرضي',
      emoji: '🚪',
      addTemplates: ['bld.entrance_gate', 'bld.entrance_lobby', 'bld.staircase', 'bld.elevator', 'bld.guard_room', 'bld.commercial_shop'],
      match: (id, label) =>
        /entrance|gate|lobby|guard|shop|commercial|مدخل|بوابة|ردهة|حارس|محل/.test(text(id, label)) ||
        id === 'bld.ground_lobby' || id === 'bld.entrance_gate' || id === 'bld.entrance_lobby' || id === 'bld.guard_room' || id === 'bld.commercial_shop',
    },
    {
      key: 'utilities_parking',
      en: 'Utilities & Parking',
      ar: 'الخدمات والمرافق والجراج',
      emoji: '⚡',
      addTemplates: ['bld.electric_box', 'bld.water_motors', 'bld.garage_bays'],
      match: (id, label) =>
        /electric|meter|motor|pump|water|garage|bay|parking|كهرباء|عداد|موتور|طلمبة|مضخة|جراج|باكية/.test(text(id, label)) ||
        id === 'bld.electric_box' || id === 'bld.water_motors' || id === 'bld.garage_bays' || id === 'bld.basement',
    },
    {
      key: 'floor_core',
      en: 'Floor Core & Transit',
      ar: 'الممرات والمناور والسلم',
      emoji: '🏢',
      addTemplates: ['bld.central_corridor', 'bld.staircase', 'bld.elevator', 'bld.lightwell', 'bld.balcony'],
      match: (id, label) =>
        id !== 'bld.unit' &&
        (/corridor|stair|elevator|lightwell|duct|balcony|terrace|طرقة|ممر|سلم|مصعد|أسانسير|منور|بلكونة|تراس/.test(text(id, label)) ||
         id === 'bld.central_corridor' || id === 'bld.staircase' || id === 'bld.elevator' || id === 'bld.lightwell' || id === 'bld.balcony' || id === 'bld.typical_floors'),
    },
    {
      key: 'units',
      en: 'Residential Units',
      ar: 'الوحدات السكنية',
      emoji: '🏠',
      addTemplates: ['bld.unit'],
      match: (id, label) => id === 'bld.unit' || /unit|flat|شقة|apt\./.test(text(id, label)),
    },
    {
      key: 'roof_outdoor',
      en: 'Roof & Sky Terrace',
      ar: 'السطح وتراس الروف',
      emoji: '🌿',
      addTemplates: ['bld.roof_terrace', 'bld.roof_service', 'bld.staircase'],
      match: (id, label) =>
        /roof|tank|pergola|سطح|روف|خزان|برجولا/.test(text(id, label)) ||
        id === 'bld.roof' || id === 'bld.roof_terrace' || id === 'bld.roof_service',
    },
  ],
  garage: [
    {
      key: 'garage',
      en: 'Garage',
      ar: 'الجراج',
      emoji: '🚗',
      addTemplates: ['grg.garage', 'grg.ramp', 'grg.bay', 'grg.elec', 'grg.security_booth', 'grg.storage'],
      match: (id, label) => /grg\.|garage|ramp|gate|bay|parking|elec|light|security|storage/.test(text(id, label)),
    },
  ],
};
