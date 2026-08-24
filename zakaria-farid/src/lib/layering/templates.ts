// ─── Egyptian Property Construction-Layering System ─────────────────────────
// Supports 3 types: apartment (شقة) | building (عمارة) | garage (جراج)
// ─────────────────────────────────────────────────────────────────────────────

export type PropertyTypeId = 'apartment' | 'building' | 'garage';

export type ZoneCategory =
  | 'wet_room'       // Bathrooms, Kitchens
  | 'living_space'   // Reception, Bedrooms, Living
  | 'transit'        // Corridors, Balconies
  | 'infrastructure' // Building shared zones (lobby, stairwell, roof)
  | 'garage_unit';   // Standalone garage

export interface ZoneTemplate {
  id: string;
  property_type_id: PropertyTypeId;
  parent_zone_id?: string;
  label_en: string;
  label_ar: string;
  category: ZoneCategory;
  is_container?: boolean;
  is_repeatable?: boolean;
  is_optional?: boolean;
  default_count?: number;
  sort_order: number;
}

export interface TradeTemplate {
  id: string;
  categories: ZoneCategory[];
  label_en: string;
  label_ar: string;
  status_values: string[];
}

export interface AttributeTemplate {
  id: string;
  trade_id: string;
  label_en: string;
  label_ar: string;
  data_type: 'boolean' | 'text' | 'enum' | 'integer' | 'numeric';
  enum_values?: string[];
  applies_to_zone_ids?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY TYPE LABELS
// ─────────────────────────────────────────────────────────────────────────────
export const PROPERTY_TYPE_LABELS: Record<PropertyTypeId, { en: string; ar: string }> = {
  apartment: { en: 'Apartment', ar: 'شقة' },
  building:  { en: 'Building (عمارة)', ar: 'عمارة' },
  garage:    { en: 'Garage', ar: 'جراج' },
};

// ─────────────────────────────────────────────────────────────────────────────
// ZONE TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export const ZONE_TEMPLATES: ZoneTemplate[] = [

  // ── APARTMENT (شقة) ────────────────────────────────────────────────────────
  // Flat zone list — no floor containers
  { id: 'apt.reception',    property_type_id: 'apartment', label_en: 'Reception / Living Room', label_ar: 'الصالة / الاستقبال',         category: 'living_space', sort_order: 1 },
  { id: 'apt.master_bed',   property_type_id: 'apartment', label_en: 'Master Bedroom',          label_ar: 'غرفة النوم الرئيسية',        category: 'living_space', sort_order: 2 },
  { id: 'apt.master_bath',  property_type_id: 'apartment', label_en: 'Master Bathroom',         label_ar: 'الحمام الملحق بالغرفة الرئيسية', category: 'wet_room',  sort_order: 3 },
  { id: 'apt.std_bed',      property_type_id: 'apartment', label_en: 'Bedroom',                 label_ar: 'غرفة نوم',                   category: 'living_space', is_repeatable: true, default_count: 2, sort_order: 4 },
  { id: 'apt.main_bath',    property_type_id: 'apartment', label_en: 'Main Bathroom',           label_ar: 'الحمام الرئيسي',             category: 'wet_room',    sort_order: 5 },
  { id: 'apt.kitchen',      property_type_id: 'apartment', label_en: 'Kitchen',                 label_ar: 'المطبخ',                     category: 'wet_room',    sort_order: 6 },
  { id: 'apt.balcony',      property_type_id: 'apartment', label_en: 'Balcony',                 label_ar: 'البلكونة',                   category: 'transit',     is_repeatable: true, default_count: 1, sort_order: 7 },
  { id: 'apt.corridor',     property_type_id: 'apartment', label_en: 'Internal Corridor',       label_ar: 'الردهة الداخلية',            category: 'transit',     sort_order: 8 },
  { id: 'apt.guest_bath',   property_type_id: 'apartment', label_en: 'Guest Toilet',            label_ar: 'حمام الضيوف',                category: 'wet_room',    is_optional: true, sort_order: 9 },
  { id: 'apt.laundry',      property_type_id: 'apartment', label_en: 'Laundry / Storage Room',  label_ar: 'غرفة الغسيل / المخزن',      category: 'transit',     is_optional: true, sort_order: 10 },
  { id: 'apt.dressing',     property_type_id: 'apartment', label_en: 'Dressing Room',           label_ar: 'غرفة الدريسنج',              category: 'living_space', is_optional: true, sort_order: 11 },
  { id: 'apt.level',        property_type_id: 'apartment', label_en: 'Level',                   label_ar: 'الطابق',                     category: 'transit',     is_container: true, is_optional: true, sort_order: 12 },

  // ── BUILDING (عمارة) ────────────────────────────────────────────────────────
  // Floor-level groups (containers)
  { id: 'bld.basement',        property_type_id: 'building', label_en: 'Basement / Parking',         label_ar: 'البدروم / الجراج',           category: 'infrastructure', is_optional: true, sort_order: 1 },
  { id: 'bld.ground_lobby',    property_type_id: 'building', label_en: 'Ground Floor & Entrance',    label_ar: 'الدور الأرضي والمدخل',       category: 'infrastructure', sort_order: 2 },
  { id: 'bld.typical_floors',  property_type_id: 'building', label_en: 'Typical Floors & Stairwell', label_ar: 'الأدوار المتكررة والسلم',    category: 'infrastructure', sort_order: 3 },
  { id: 'bld.roof',            property_type_id: 'building', label_en: 'Roof',                       label_ar: 'السطح',                      category: 'infrastructure', sort_order: 4 },
  { id: 'bld.unit',            property_type_id: 'building', label_en: 'Residential Unit',           label_ar: 'وحدة سكنية',                 category: 'infrastructure', is_container: true, is_optional: true, sort_order: 5 },

  // Ground Floor & Common Egyptian Building Components
  { id: 'bld.entrance_gate',   property_type_id: 'building', label_en: 'Entrance Gate & Fence',      label_ar: 'بوابة وسور المدخل',          category: 'infrastructure', is_optional: true, sort_order: 10 },
  { id: 'bld.entrance_lobby',  property_type_id: 'building', label_en: 'Main Entrance & Lobby',      label_ar: 'مدخل العمارة والردهة',      category: 'infrastructure', is_optional: true, sort_order: 11 },
  { id: 'bld.staircase',       property_type_id: 'building', label_en: 'Building Staircase',         label_ar: 'السلم وبيت السلم',           category: 'infrastructure', is_optional: true, sort_order: 12 },
  { id: 'bld.elevator',        property_type_id: 'building', label_en: 'Elevator & Shaft',           label_ar: 'الأسانسير والمصعد',          category: 'infrastructure', is_optional: true, sort_order: 13 },
  { id: 'bld.electric_box',    property_type_id: 'building', label_en: 'Electric Meters & Board',    label_ar: 'غرفة ولوحة الكهرباء والعدادات', category: 'infrastructure', is_optional: true, sort_order: 14 },
  { id: 'bld.water_motors',    property_type_id: 'building', label_en: 'Water Motors & Pumps Box',   label_ar: 'غرفة مواتير ومضخات المياه',   category: 'infrastructure', is_optional: true, sort_order: 15 },
  { id: 'bld.garage_bays',     property_type_id: 'building', label_en: 'Ground Garage & Parking',    label_ar: 'باكيات الجراج الأرضي',       category: 'infrastructure', is_optional: true, sort_order: 16 },
  { id: 'bld.guard_room',      property_type_id: 'building', label_en: 'Guard Room / Booth',         label_ar: 'غرفة الحارس والأمن',         category: 'infrastructure', is_optional: true, sort_order: 17 },
  { id: 'bld.commercial_shop', property_type_id: 'building', label_en: 'Commercial Shop / Retail',   label_ar: 'محل تجاري',                  category: 'infrastructure', is_optional: true, sort_order: 18 },

  // Typical Floor Components
  { id: 'bld.central_corridor', property_type_id: 'building', label_en: 'Central Floor Corridor',    label_ar: 'طرقة التوزيع بالدور',        category: 'infrastructure', is_optional: true, sort_order: 20 },
  { id: 'bld.lightwell',       property_type_id: 'building', label_en: 'Building Lightwell & Duct',  label_ar: 'منور العمارة والخدمات',      category: 'infrastructure', is_optional: true, sort_order: 21 },
  { id: 'bld.balcony',         property_type_id: 'building', label_en: 'Exterior Balcony / Terrace', label_ar: 'البلكونة والتراس الخارجي',   category: 'infrastructure', is_optional: true, sort_order: 22 },

  // Roof Components
  { id: 'bld.roof_terrace',    property_type_id: 'building', label_en: 'Panoramic Roof Terrace',     label_ar: 'تراس السطح والبرجولا',       category: 'infrastructure', is_optional: true, sort_order: 30 },
  { id: 'bld.roof_service',    property_type_id: 'building', label_en: 'Elevator Machine & Tanks',   label_ar: 'غرفة محرك الأسانسير وخزانات المياه', category: 'infrastructure', is_optional: true, sort_order: 31 },

  // ── GARAGE (جراج) ──────────────────────────────────────────────────────────
  { id: 'grg.garage', property_type_id: 'garage', label_en: 'Garage', label_ar: 'الجراج', category: 'garage_unit', sort_order: 0 },
  { id: 'grg.ramp',  property_type_id: 'garage', label_en: 'Ramp & Gate',    label_ar: 'الرامب والبوابة',  category: 'garage_unit', is_optional: true, sort_order: 1 },
  { id: 'grg.bay',   property_type_id: 'garage', label_en: 'Parking Bay',    label_ar: 'باكية الجراج',    category: 'garage_unit', is_optional: true, sort_order: 2 },
  { id: 'grg.elec',  property_type_id: 'garage', label_en: 'Lighting & Electrical', label_ar: 'الإنارة والكهرباء', category: 'garage_unit', is_optional: true, sort_order: 3 },
  { id: 'grg.security_booth', property_type_id: 'garage', label_en: 'Security Booth', label_ar: 'كابينة الحراسة والأمن', category: 'garage_unit', is_optional: true, sort_order: 4 },
  { id: 'grg.storage',        property_type_id: 'garage', label_en: 'Storage Annex',  label_ar: 'المخزن الملحق',        category: 'garage_unit', is_optional: true, sort_order: 5 },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRADE TEMPLATES — Egyptian middle-class construction reality
// ─────────────────────────────────────────────────────────────────────────────

export const TRADE_TEMPLATES: TradeTemplate[] = [
  // ── wet_room (بلوكات / حمامات ومطبخ) ──────────────────────────────────────
  {
    id: 'wet.plumbing',
    categories: ['wet_room'],
    label_en: 'Plumbing (سباكة)', label_ar: 'السباكة',
    status_values: ['NotStarted', 'RoughIn', 'Finished'],
  },
  {
    id: 'wet.electrical',
    categories: ['wet_room'],
    label_en: 'Electrical (كهرباء)', label_ar: 'الكهرباء',
    status_values: ['NotStarted', 'ConduitsOnly', 'Wired', 'Finished'],
  },
  {
    id: 'wet.walls',
    categories: ['wet_room'],
    label_en: 'Walls & Tiling (حوائط وبلاط)', label_ar: 'الحوائط والبلاط',
    status_values: ['RedBrick', 'Plastered', 'Tiled', 'Finished'],
  },
  {
    id: 'wet.flooring',
    categories: ['wet_room'],
    label_en: 'Flooring (أرضيات)', label_ar: 'الأرضيات',
    status_values: ['SandBed', 'Tiled', 'Finished'],
  },

  // ── living_space (غرف معيشة) ───────────────────────────────────────────────
  {
    id: 'liv.electrical',
    categories: ['living_space'],
    label_en: 'Electrical (كهرباء)', label_ar: 'الكهرباء',
    status_values: ['NotStarted', 'ConduitsOnly', 'Wired', 'Finished'],
  },
  {
    id: 'liv.walls',
    categories: ['living_space'],
    label_en: 'Walls & Paint (حوائط ودهان)', label_ar: 'الحوائط والدهان',
    status_values: ['RedBrick', 'Plastered', 'Putty', 'FinalPaint'],
  },
  {
    id: 'liv.flooring',
    categories: ['living_space'],
    label_en: 'Flooring (أرضيات)', label_ar: 'الأرضيات',
    status_values: ['SandBed', 'Tiled', 'Finished'],
  },
  {
    id: 'liv.carpentry',
    categories: ['living_space'],
    label_en: 'Doors & Windows (نجارة وألوميتال)', label_ar: 'النجارة والألوميتال',
    status_values: ['None', 'SubFrames', 'Installed'],
  },
  {
    id: 'liv.hvac',
    categories: ['living_space'],
    label_en: 'AC Prep (تكييف)', label_ar: 'تمديدات التكييف',
    status_values: ['NotStarted', 'CopperPrep', 'Installed'],
  },

  // ── transit (بلكونات وردهات) ───────────────────────────────────────────────
  {
    id: 'trn.electrical',
    categories: ['transit'],
    label_en: 'Electrical (كهرباء)', label_ar: 'الكهرباء',
    status_values: ['NotStarted', 'Wired', 'Finished'],
  },
  {
    id: 'trn.walls',
    categories: ['transit'],
    label_en: 'Walls & Paint (حوائط ودهان)', label_ar: 'الحوائط والدهان',
    status_values: ['RedBrick', 'Plastered', 'FinalPaint'],
  },
  {
    id: 'trn.flooring',
    categories: ['transit'],
    label_en: 'Flooring (أرضيات)', label_ar: 'الأرضيات',
    status_values: ['SandBed', 'Tiled', 'Finished'],
  },

  // ── infrastructure (عمارة مشتركة) ─────────────────────────────────────────
  {
    id: 'inf.ramp_access',
    categories: ['infrastructure'],
    label_en: 'Ramp & Parking Access', label_ar: 'الرامب ومدخل الجراج',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
  {
    id: 'inf.parking',
    categories: ['infrastructure'],
    label_en: 'Parking Bays', label_ar: 'باكيات الجراج',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
  {
    id: 'inf.drainage',
    categories: ['infrastructure'],
    label_en: 'Drainage (صرف)', label_ar: 'الصرف الصحي',
    status_values: ['NotStarted', 'Installed'],
  },
  {
    id: 'inf.lobby',
    categories: ['infrastructure'],
    label_en: 'Ground Floor Finish (تشطيب الأرضي)', label_ar: 'تشطيب الدور الأرضي',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
  {
    id: 'inf.security',
    categories: ['infrastructure'],
    label_en: 'Entrance & Intercom', label_ar: 'مدخل وإنتركم',
    status_values: ['NotStarted', 'Installed'],
  },
  {
    id: 'inf.elevator',
    categories: ['infrastructure'],
    label_en: 'Elevator (أسانسير)', label_ar: 'الأسانسير',
    status_values: ['NotStarted', 'Shaft', 'Installed'],
  },
  {
    id: 'inf.common_finish',
    categories: ['infrastructure'],
    label_en: 'Stairwell & Common Finish', label_ar: 'تشطيب السلم والمناطق المشتركة',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
  {
    id: 'inf.insulation',
    categories: ['infrastructure'],
    label_en: 'Roof Insulation (عزل السطح)', label_ar: 'عزل السطح',
    status_values: ['NotStarted', 'Applied', 'Finished'],
  },
  {
    id: 'inf.water_systems',
    categories: ['infrastructure'],
    label_en: 'Water Tanks & Motor', label_ar: 'خزانات المياه والموتور',
    status_values: ['NotStarted', 'Installed'],
  },

  // ── garage_unit (جراج مستقل) ───────────────────────────────────────────────
  {
    id: 'grg.electrical',
    categories: ['garage_unit'],
    label_en: 'Electrical', label_ar: 'الكهرباء',
    status_values: ['NotStarted', 'ConduitsOnly', 'Wired', 'Finished'],
  },
  {
    id: 'grg.paint',
    categories: ['garage_unit'],
    label_en: 'Paint', label_ar: 'الدهانات',
    status_values: ['NotStarted', 'Primed', 'Finished'],
  },
  {
    id: 'grg.flooring',
    categories: ['garage_unit'],
    label_en: 'Flooring', label_ar: 'الأرضيات',
    status_values: ['NotStarted', 'Screed', 'Epoxy', 'Finished'],
  },
  {
    id: 'grg.door',
    categories: ['garage_unit'],
    label_en: 'Garage Door', label_ar: 'باب الجراج',
    status_values: ['NotStarted', 'FrameFixed', 'Installed'],
  },
  {
    id: 'grg.ramp_construction',
    categories: ['garage_unit'],
    label_en: 'Ramp & Gate Construction', label_ar: 'إنشاء الرامب والبوابة',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
  {
    id: 'grg.bay_finish',
    categories: ['garage_unit'],
    label_en: 'Bay Finish (تشطيب الباكية)', label_ar: 'تشطيب الباكية',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTE TEMPLATES — Egyptian middle-class relevant specs
// ─────────────────────────────────────────────────────────────────────────────

export const ATTRIBUTE_TEMPLATES: AttributeTemplate[] = [
  // wet.plumbing
  { id: 'wet.plumbing.brand',           trade_id: 'wet.plumbing',   label_en: 'Pipe Brand',           label_ar: 'ماركة الأنابيب',     data_type: 'enum',
    enum_values: ['Wavin', 'Oscar', 'Benghazi', 'Other'] },
  { id: 'wet.plumbing.pressure_tested', trade_id: 'wet.plumbing',   label_en: 'Pressure Tested',      label_ar: 'تم اختبار الضغط',    data_type: 'boolean' },
  { id: 'wet.plumbing.water_heater',    trade_id: 'wet.plumbing',   label_en: 'Water Heater',         label_ar: 'السخان',              data_type: 'enum',
    enum_values: ['Gas (بوتاجاز)', 'Electric (كهرباء)', 'Solar (شمسي)', 'None'] },
  { id: 'wet.plumbing.shower_type',     trade_id: 'wet.plumbing',   label_en: 'Shower Type',          label_ar: 'نوع الدش',            data_type: 'enum',
    enum_values: ['Shower (دش)', 'Bathtub (بانيو)', 'Both', 'None'],
    applies_to_zone_ids: ['apt.master_bath', 'apt.main_bath', 'apt.guest_bath'] },

  // wet.electrical
  { id: 'wet.elec.wiring_brand',        trade_id: 'wet.electrical', label_en: 'Wiring Brand',         label_ar: 'ماركة الأسلاك',      data_type: 'enum',
    enum_values: ['El-Sewedy', 'Elsewedy', 'Lapp', 'Other'] },
  { id: 'wet.elec.exhaust_fan',         trade_id: 'wet.electrical', label_en: 'Exhaust Fan',          label_ar: 'شفاط',                data_type: 'boolean' },

  // wet.walls
  { id: 'wet.walls.tile_height',        trade_id: 'wet.walls',      label_en: 'Wall Tile Height',     label_ar: 'ارتفاع البلاط',       data_type: 'enum',
    enum_values: ['Full Height (حتى السقف)', '2.4m', '1.8m', 'Half'] },
  { id: 'wet.walls.tile_brand',         trade_id: 'wet.walls',      label_en: 'Tile Brand',           label_ar: 'ماركة البلاط',        data_type: 'enum',
    enum_values: ['Cleopatra', 'RAK', 'Porcelanosa', 'Local (محلي)'] },

  // wet.flooring
  { id: 'wet.floor.material',           trade_id: 'wet.flooring',   label_en: 'Material',             label_ar: 'الخامة',              data_type: 'enum',
    enum_values: ['Ceramic (سيراميك)', 'Porcelain (بورسلين)', 'Mosaic'] },
  { id: 'wet.floor.grade',              trade_id: 'wet.flooring',   label_en: 'Grade',                label_ar: 'الفرز',               data_type: 'enum',
    enum_values: ['First Choice (فرز أول)', 'Second Choice (فرز ثاني)'] },

  // liv.electrical
  { id: 'liv.elec.wiring_brand',        trade_id: 'liv.electrical', label_en: 'Wiring Brand',         label_ar: 'ماركة الأسلاك',      data_type: 'enum',
    enum_values: ['El-Sewedy', 'Elsewedy', 'Lapp', 'Other'] },
  { id: 'liv.elec.breaker_brand',       trade_id: 'liv.electrical', label_en: 'Breaker Brand',        label_ar: 'ماركة الفيش',         data_type: 'enum',
    enum_values: ['Schneider', 'ABB', 'Legrand', 'Local (محلي)'] },

  // liv.walls
  { id: 'liv.walls.gypsum_ceiling',     trade_id: 'liv.walls',      label_en: 'Gypsum Ceiling (أسقف جبسية)', label_ar: 'أسقف جبسية معلقة',   data_type: 'boolean' },
  { id: 'liv.walls.paint_brand',        trade_id: 'liv.walls',      label_en: 'Paint Brand',          label_ar: 'ماركة الدهان',        data_type: 'enum',
    enum_values: ['Jotun', 'Dulux', 'Sikkens', 'Local (محلي)'] },

  // liv.flooring
  { id: 'liv.floor.material',           trade_id: 'liv.flooring',   label_en: 'Material',             label_ar: 'الخامة',              data_type: 'enum',
    enum_values: ['Ceramic (سيراميك)', 'Porcelain (بورسلين)', 'Marble (رخام)', 'HDF (باركيه)'] },
  { id: 'liv.floor.grade',              trade_id: 'liv.flooring',   label_en: 'Grade',                label_ar: 'الفرز',               data_type: 'enum',
    enum_values: ['First Choice (فرز أول)', 'Second Choice (فرز ثاني)'] },

  // liv.carpentry
  { id: 'liv.carp.window_profile',      trade_id: 'liv.carpentry',  label_en: 'Window Profile',       label_ar: 'بروفيل النافذة',      data_type: 'enum',
    enum_values: ['PS Profile', 'Jumbo Profile', 'Standard'] },
  { id: 'liv.carp.glazing',             trade_id: 'liv.carpentry',  label_en: 'Glazing',              label_ar: 'نوع الزجاج',          data_type: 'enum',
    enum_values: ['Single (عادي)', 'Double (دبل جلاس)'] },
  { id: 'liv.carp.main_door',           trade_id: 'liv.carpentry',  label_en: 'Main Door',            label_ar: 'الباب الرئيسي',       data_type: 'enum',
    enum_values: ['Armored (مصفح)', 'Wood (خشب)', 'PVC'],
    applies_to_zone_ids: ['apt.reception'] },

  // liv.hvac
  { id: 'liv.hvac.ac_prep',             trade_id: 'liv.hvac',       label_en: 'AC Copper Prep',       label_ar: 'تمديد نحاس التكييف', data_type: 'boolean' },
  { id: 'liv.hvac.ac_brand',            trade_id: 'liv.hvac',       label_en: 'AC Brand (preferred)', label_ar: 'ماركة التكييف',       data_type: 'enum',
    enum_values: ['Carrier', 'Gree', 'Toshiba', 'Samsung', 'Other'] },

  // trn.flooring
  { id: 'trn.floor.material',           trade_id: 'trn.flooring',   label_en: 'Material',             label_ar: 'الخامة',              data_type: 'enum',
    enum_values: ['Ceramic (سيراميك)', 'Porcelain (بورسلين)', 'Outdoor Tile'] },

  // infrastructure
  { id: 'inf.elev.brand',               trade_id: 'inf.elevator',   label_en: 'Elevator Brand',       label_ar: 'ماركة الأسانسير',     data_type: 'enum',
    enum_values: ['Sigma', 'Otis', 'Schindler', 'Local (محلي)'] },
  { id: 'inf.elev.capacity',            trade_id: 'inf.elevator',   label_en: 'Capacity (kg)',        label_ar: 'الحمولة (كجم)',       data_type: 'integer' },
  { id: 'inf.sec.intercom',             trade_id: 'inf.security',   label_en: 'Intercom Type',        label_ar: 'نوع الإنتركم',        data_type: 'enum',
    enum_values: ['Audio (صوت)', 'Video (صورة وصوت)', 'None'] },
  { id: 'inf.sec.guard_room',           trade_id: 'inf.security',   label_en: 'Security Guard Room',  label_ar: 'حجرة الأمن',          data_type: 'boolean' },
  { id: 'inf.water.tank_count',         trade_id: 'inf.water_systems', label_en: 'Water Tank Count',  label_ar: 'عدد الخزانات',        data_type: 'integer' },
  { id: 'inf.water.motor',              trade_id: 'inf.water_systems', label_en: 'Water Motor',       label_ar: 'موتور المياه',         data_type: 'boolean' },
  { id: 'inf.lobby.material',           trade_id: 'inf.lobby',      label_en: 'Lobby Floor Material', label_ar: 'خامة أرضية المدخل',   data_type: 'enum',
    enum_values: ['Marble (رخام)', 'Granite (جرانيت)', 'Ceramic (سيراميك)'] },
  { id: 'inf.park.bay_count',           trade_id: 'inf.parking',    label_en: 'Parking Bay Count',   label_ar: 'عدد الباكيات',         data_type: 'integer' },
  { id: 'inf.ramp.auto_gate',           trade_id: 'inf.ramp_access', label_en: 'Auto Gate',          label_ar: 'بوابة أوتوماتيك',     data_type: 'boolean' },

  // garage_unit
  { id: 'grg.ramp.auto_gate',           trade_id: 'grg.ramp_construction', label_en: 'Automatic Gate', label_ar: 'بوابة أوتوماتيك',  data_type: 'boolean' },
  { id: 'grg.bay.size',                 trade_id: 'grg.bay_finish', label_en: 'Bay Size (sqm)',        label_ar: 'مساحة الباكية (م²)', data_type: 'numeric' },
  { id: 'grg.bay.numbered',             trade_id: 'grg.bay_finish', label_en: 'Numbered Bays',         label_ar: 'باكيات مرقمة',       data_type: 'boolean' },
  { id: 'grg.bay.covered',              trade_id: 'grg.bay_finish', label_en: 'Covered / Roofed',      label_ar: 'مظللة',              data_type: 'boolean' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ZONE → TRADES mapping (overrides for infrastructure zones)
// ─────────────────────────────────────────────────────────────────────────────

export const ZONE_TRADE_OVERRIDES: Record<string, string[]> = {
  // Building zones — specific trade subsets
  'bld.basement':        ['inf.ramp_access', 'inf.parking', 'inf.drainage'],
  'bld.ground_lobby':    ['inf.lobby', 'inf.security', 'inf.elevator'],
  'bld.typical_floors':  ['inf.common_finish'],
  'bld.roof':            ['inf.insulation'],
  // Garage zones
  'grg.ramp':            ['grg.ramp_construction'],
  'grg.bay':             ['grg.bay_finish'],
  'grg.elec':            ['trn.electrical'],
  'grg.garage':          ['grg.electrical', 'grg.paint', 'grg.flooring', 'grg.door'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
export function getTradesForZone(zone: ZoneTemplate): TradeTemplate[] {
  const overrideIds = ZONE_TRADE_OVERRIDES[zone.id];
  if (overrideIds) {
    return overrideIds
      .map(id => TRADE_TEMPLATES.find(t => t.id === id))
      .filter(Boolean) as TradeTemplate[];
  }
  return TRADE_TEMPLATES.filter(t => t.categories.includes(zone.category));
}

export function getAttributesForTrade(tradeId: string, zoneId?: string): AttributeTemplate[] {
  return ATTRIBUTE_TEMPLATES.filter(a => {
    if (a.trade_id !== tradeId) return false;
    if (a.applies_to_zone_ids && zoneId) {
      return a.applies_to_zone_ids.includes(zoneId);
    }
    if (a.applies_to_zone_ids && !zoneId) return false;
    return true;
  });
}

export function getZonesForType(typeId: PropertyTypeId): ZoneTemplate[] {
  return ZONE_TEMPLATES
    .filter(z => z.property_type_id === typeId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getChildZones(parentId: string): ZoneTemplate[] {
  return ZONE_TEMPLATES
    .filter(z => z.parent_zone_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order);
}
