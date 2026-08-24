// ─── Shared fallback zone metrics ────────────────────────────────────────────
// Single source of truth for room dimensions when a zone has no admin-entered
// `spatial` block. Used by BOTH the admin CAD builder (edit form preview) and
// the public ArchitecturalBlueprintInspector, so the two always show the same
// numbers for the same property.

export interface FallbackZoneMetric {
  length_m: number;
  width_m: number;
  sqm: number;
  ceiling: string;
}

export const FALLBACK_ZONE_METRICS: Record<string, FallbackZoneMetric> = {
  'vil.g.reception':   { length_m: 14.2, width_m: 10.2, sqm: 145, ceiling: '4.4m Double-Height' },
  'vil.g.entrance':    { length_m: 6.5,  width_m: 5.8,  sqm: 38,  ceiling: '5.2m Atrium' },
  'vil.g.dining':      { length_m: 8.0,  width_m: 6.5,  sqm: 52,  ceiling: '3.8m Coffered' },
  'vil.g.kitchen':     { length_m: 7.5,  width_m: 6.4,  sqm: 48,  ceiling: '3.6m Flush' },
  'vil.g.powder_room': { length_m: 4.2,  width_m: 3.3,  sqm: 14,  ceiling: '3.4m Ambient' },
  'vil.exterior':      { length_m: 35.0, width_m: 22.0, sqm: 520, ceiling: 'Open Sky' },
  'vil.f.master_suite': { length_m: 11.5, width_m: 8.2, sqm: 95,  ceiling: '3.8m Tray Cove' },
  'vil.f.master_bath':  { length_m: 6.0,  width_m: 4.6, sqm: 28,  ceiling: '3.6m Lightwell' },
  'vil.f.std_bed':      { length_m: 7.0,  width_m: 6.0, sqm: 42,  ceiling: '3.4m Flush' },
  'vil.f.family_room':  { length_m: 9.5,  width_m: 6.8, sqm: 65,  ceiling: '3.6m Linear' },
  'vil.f.main_bath':    { length_m: 4.8,  width_m: 3.8, sqm: 18,  ceiling: '3.4m Flush' },
  'vil.r.guest_suite':  { length_m: 8.5,  width_m: 6.8, sqm: 58,  ceiling: '3.4m Panoramic' },
  'vil.r.terrace':      { length_m: 18.5, width_m: 10.0, sqm: 185, ceiling: 'Open Sky Pergola' },
  'vil.b.garage':       { length_m: 14.0, width_m: 7.8, sqm: 110, ceiling: '3.2m Epoxy' },
  'vil.b.game_room':    { length_m: 10.5, width_m: 8.0, sqm: 85,  ceiling: '3.4m Acoustic' },
  'vil.b.driver_room':  { length_m: 6.0,  width_m: 5.3, sqm: 32,  ceiling: '3.0m Flush' },
  'vil.b.storage':      { length_m: 6.0,  width_m: 4.0, sqm: 24,  ceiling: '3.0m Flush' },

  'apt.reception':   { length_m: 11.0, width_m: 8.6, sqm: 95, ceiling: '3.6m Flush' },
  'apt.master_bed':  { length_m: 7.2,  width_m: 6.2, sqm: 45, ceiling: '3.4m Cove' },
  'apt.master_bath': { length_m: 4.0,  width_m: 3.0, sqm: 12, ceiling: '3.2m Flush' },
  'apt.std_bed':     { length_m: 5.5,  width_m: 4.0, sqm: 22, ceiling: '3.4m Flush' },
  'apt.main_bath':   { length_m: 4.5,  width_m: 3.5, sqm: 16, ceiling: '3.2m Flush' },
  'apt.kitchen':     { length_m: 5.5,  width_m: 5.0, sqm: 28, ceiling: '3.2m Flush' },
  'apt.balcony':     { length_m: 8.0,  width_m: 3.0, sqm: 24, ceiling: 'Open Sky' },
  'apt.corridor':    { length_m: 6.0,  width_m: 2.0, sqm: 12, ceiling: '3.2m Flush' },
  'apt.guest_bath':  { length_m: 3.0,  width_m: 2.0, sqm: 6,  ceiling: '3.0m Flush' },
  'apt.laundry':     { length_m: 3.0,  width_m: 3.0, sqm: 9,  ceiling: '3.0m Flush' },
  'apt.dressing':    { length_m: 4.0,  width_m: 3.0, sqm: 12, ceiling: '3.2m Flush' },

  'bld.basement':       { length_m: 20.0, width_m: 12.0, sqm: 240, ceiling: '2.8m Low' },
  'bld.ground_lobby':   { length_m: 20.0, width_m: 12.0, sqm: 240, ceiling: '3.2m Flush' },
  'bld.typical_floors': { length_m: 20.0, width_m: 12.0, sqm: 240, ceiling: '3.0m Flush' },
  'bld.roof':           { length_m: 20.0, width_m: 12.0, sqm: 240, ceiling: 'Open Roof' },
  'bld.unit':           { length_m: 14.0, width_m: 10.0, sqm: 140, ceiling: '3.0m Flush' },
  'bld.entrance_gate':   { length_m: 4.0,  width_m: 1.5,  sqm: 6,   ceiling: 'Open Sky' },
  'bld.entrance_lobby':  { length_m: 6.0,  width_m: 4.0,  sqm: 24,  ceiling: '3.6m Flush' },
  'bld.staircase':       { length_m: 5.0,  width_m: 3.0,  sqm: 15,  ceiling: '3.0m Flush' },
  'bld.elevator':        { length_m: 2.2,  width_m: 2.0,  sqm: 4.4, ceiling: '3.0m Flush' },
  'bld.electric_box':    { length_m: 2.5,  width_m: 1.8,  sqm: 4.5, ceiling: '3.0m Flush' },
  'bld.water_motors':    { length_m: 2.5,  width_m: 1.8,  sqm: 4.5, ceiling: '3.0m Flush' },
  'bld.garage_bays':     { length_m: 6.0,  width_m: 5.5,  sqm: 33,  ceiling: '3.0m Flush' },
  'bld.guard_room':      { length_m: 3.0,  width_m: 2.5,  sqm: 7.5, ceiling: '3.0m Flush' },
  'bld.commercial_shop': { length_m: 8.0,  width_m: 5.0,  sqm: 40,  ceiling: '3.8m Flush' },
  'bld.central_corridor': { length_m: 6.0, width_m: 2.5,  sqm: 15,  ceiling: '3.0m Flush' },
  'bld.lightwell':       { length_m: 3.0,  width_m: 2.5,  sqm: 7.5, ceiling: 'Open Duct' },
  'bld.balcony':         { length_m: 4.0,  width_m: 1.5,  sqm: 6,   ceiling: 'Open Balcony' },
  'bld.roof_terrace':    { length_m: 12.0, width_m: 8.0,  sqm: 96,  ceiling: 'Open Sky' },
  'bld.roof_service':    { length_m: 5.0,  width_m: 4.0,  sqm: 20,  ceiling: '3.0m Flush' },

  'grg.garage':         { length_m: 12.0, width_m: 6.0, sqm: 72, ceiling: '2.8m Low' },
  'grg.ramp':           { length_m: 6.0, width_m: 3.5, sqm: 21, ceiling: '2.8m Low' },
  'grg.bay':            { length_m: 5.5, width_m: 2.5, sqm: 14, ceiling: '2.8m Low' },
  'grg.elec':           { length_m: 2.0, width_m: 1.5, sqm: 3,  ceiling: '2.8m Low' },
  'grg.security_booth': { length_m: 2.5, width_m: 2.0, sqm: 5,  ceiling: '2.8m Low' },
  'grg.storage':        { length_m: 4.0, width_m: 3.0, sqm: 12, ceiling: '2.8m Low' },
};

export const GENERIC_ZONE_METRIC: FallbackZoneMetric = {
  length_m: 8.0,
  width_m: 6.5,
  sqm: 52,
  ceiling: '3.6m Architectural Flush',
};

export function fallbackMetricFor(templateId: string): FallbackZoneMetric | null {
  return FALLBACK_ZONE_METRICS[templateId] ?? null;
}

// Bilingual display titles shared by the admin builder and the public
// inspector, covering legacy villa-era template ids that have no ZoneTemplate.
export const FALLBACK_ZONE_TITLES: Record<string, { en: string; ar: string }> = {
  'vil.ground': { en: 'Ground Floor', ar: 'الدور الأرضي' },
  'vil.first': { en: 'First Floor', ar: 'الدور الأول' },
  'vil.basement': { en: 'Basement Level', ar: 'البدروم' },
  'vil.roof': { en: 'Roof Level', ar: 'السطح' },
  'vil.exterior': { en: 'Private Grounds & Landscape', ar: 'الحدائق والمساحات الخارجية' },
  'vil.g.entrance': { en: 'Double-Height Entrance Foyer', ar: 'بهو المدخل الرئيسي المزدوج' },
  'vil.g.reception': { en: 'Grand Reception & Salon', ar: 'صالون الاستقبال الرئيسي الفاخر' },
  'vil.g.dining': { en: 'Formal Dining Salon', ar: 'غرفة الطعام الملكية' },
  'vil.g.powder_room': { en: 'Guest Powder Room & Spa', ar: 'حمام الضيوف الفاخر' },
  'vil.g.kitchen': { en: 'Chef Show Kitchen & Pantry', ar: 'مطبخ الاستعراض الرئيسي ومخزن التحضير' },
  'vil.f.master_suite': { en: 'Master Royal Suite', ar: 'الجناح الملكي الرئيسي' },
  'vil.f.master_bath': { en: 'Master En-Suite Spa Bath', ar: 'حمام السبا الملحق بالجناح الرئيسي' },
  'vil.f.std_bed': { en: 'Executive Bedroom Suite', ar: 'غرفة النوم التنفيذية' },
  'vil.f.family_room': { en: 'Family Living & Media Lounge', ar: 'الصالة العائلية وغرفة السينما' },
  'vil.f.main_bath': { en: 'Main Luxury Bathroom', ar: 'الحمام الرئيسي الفاخر' },
  'vil.b.garage': { en: '4-Car Integrated Garage', ar: 'جراج سيارات خاص يتسع لـ ٤ سيارات' },
  'vil.b.game_room': { en: 'Entertainment & Gaming Salon', ar: 'صالة الألعاب والترفيه' },
  'vil.b.driver_room': { en: 'Maid & Driver Quarters', ar: 'غرف السائق والمساعدين' },
  'vil.b.storage': { en: 'Storage & Laundry Atelier', ar: 'غرفة الغسيل والتخزين الفاخرة' },
  'vil.r.guest_suite': { en: 'Skyline Roof Annex / Guest Suite', ar: 'ملحق الرووف وجناح الضيوف' },
  'vil.r.terrace': { en: 'Panoramic Sky Terrace & Pergola', ar: 'تراس السطح البانورامي مع البرجولا' },
  'apt.reception': { en: 'Grand Reception', ar: 'الاستقبال الرئيسي' },
  'apt.master_bed': { en: 'Master Bedroom Suite', ar: 'غرفة النوم الرئيسية' },
  'apt.master_bath': { en: 'Master En-Suite Bathroom', ar: 'الحمام الملحق الرئيسي' },
  'apt.std_bed': { en: 'Guest Bedroom', ar: 'غرفة النوم الإضافية' },
  'apt.kitchen': { en: 'Designer Kitchen', ar: 'المطبخ الفاخر' },
  'apt.main_bath': { en: 'Main Bathroom', ar: 'الحمام الرئيسي' },
  'apt.guest_bath': { en: 'Guest Powder Room', ar: 'حمام الضيوف' },
  'apt.balcony': { en: 'Panoramic Balcony', ar: 'الشرفة البانورامية' },
  'apt.open_terrace': { en: 'Penthouse Open Terrace', ar: 'التراس البانورامي المفتوح' },
  'bld.unit': { en: 'Residential Unit', ar: 'وحدة سكنية' },
  'bld.entrance_gate': { en: 'Entrance Gate & Fence', ar: 'بوابة وسور المدخل' },
  'bld.entrance_lobby': { en: 'Entrance Lobby & Hall', ar: 'مدخل العمارة والردهة' },
  'bld.staircase': { en: 'Building Staircase', ar: 'السلم وبيت السلم' },
  'bld.elevator': { en: 'Elevator & Shaft', ar: 'الأسانسير والمصعد' },
  'bld.electric_box': { en: 'Electric Meters & Board Box', ar: 'غرفة ولوحة الكهرباء والعدادات' },
  'bld.water_motors': { en: 'Water Motors & Pumps Box', ar: 'غرفة مواتير ومضخات المياه' },
  'bld.garage_bays': { en: 'Ground Garage & Parking', ar: 'باكيات الجراج الأرضي' },
  'bld.guard_room': { en: 'Guard Room / Booth', ar: 'غرفة الحارس والأمن' },
  'bld.commercial_shop': { en: 'Commercial Shop / Retail', ar: 'محل تجاري' },
  'bld.central_corridor': { en: 'Central Floor Corridor', ar: 'طرقة التوزيع بالدور' },
  'bld.lightwell': { en: 'Building Lightwell & Duct', ar: 'منور العمارة والخدمات' },
  'bld.balcony': { en: 'Exterior Balcony / Terrace', ar: 'البلكونة والتراس الخارجي' },
  'bld.roof_terrace': { en: 'Panoramic Roof Terrace', ar: 'تراس السطح والبرجولا' },
  'bld.roof_service': { en: 'Elevator Machine & Water Tanks', ar: 'غرفة محرك الأسانسير وخزانات المياه' },
};
