// ─── Egyptian Property Construction-Layering System ─────────────────────────
// Seed templates — the fixed, system-defined tree.
// Source: layeringsystemplan.md §§2–4
// ─────────────────────────────────────────────────────────────────────────────

export type PropertyTypeId = 'apartment' | 'villa' | 'building' | 'tower' | 'garage' | 'townhouse' | 'duplex' | 'chalet';

export type ZoneCategory =
  | 'wet_room'       // Bathrooms, Kitchens
  | 'living_space'   // Reception, Bedrooms, Dining, Living
  | 'transit'        // Corridors, Balconies, Terraces
  | 'exterior'       // Garden, Fence, Pool (Villa only)
  | 'infrastructure' // Building/Tower shared zones
  | 'garage_unit';   // Standalone garage

export interface ZoneTemplate {
  id: string;
  property_type_id: PropertyTypeId;
  parent_zone_id?: string;   // for Villa floor containers
  label_en: string;
  label_ar: string;
  category: ZoneCategory;
  is_container?: boolean;    // floor containers (Ground Floor, First Floor…) — no trades of their own
  is_repeatable?: boolean;
  is_optional?: boolean;
  default_count?: number;
  sort_order: number;
}

export interface TradeTemplate {
  id: string;
  categories: ZoneCategory[];  // which zone categories this trade appears in
  label_en: string;
  label_ar: string;
  status_values: string[];     // ordered enum, first = least done, last = fully done
}

export interface AttributeTemplate {
  id: string;
  trade_id: string;
  label_en: string;
  label_ar: string;
  data_type: 'boolean' | 'text' | 'enum' | 'integer' | 'numeric';
  enum_values?: string[];
  applies_to_zone_ids?: string[];  // if set, only show for these zone IDs
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY TYPE LABELS
// ─────────────────────────────────────────────────────────────────────────────
export const PROPERTY_TYPE_LABELS: Record<PropertyTypeId, { en: string; ar: string }> = {
  apartment: { en: 'Apartment', ar: 'شقة' },
  villa:     { en: 'Villa',     ar: 'فيلا' },
  townhouse: { en: 'Townhouse', ar: 'تاون هاوس' },
  duplex:    { en: 'Duplex',    ar: 'دوبلكس' },
  chalet:    { en: 'Chalet',    ar: 'شاليه' },
  building:  { en: 'Residential Building', ar: 'عمارة' },
  tower:     { en: 'Tower',     ar: 'برج' },
  garage:    { en: 'Garage Unit', ar: 'جراج' },
};

// ─────────────────────────────────────────────────────────────────────────────
// ZONE TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export const ZONE_TEMPLATES: ZoneTemplate[] = [

  // ── APARTMENT ──────────────────────────────────────────────────────────────
  { id: 'apt.reception',       property_type_id: 'apartment', label_en: 'Reception',              label_ar: 'الاستقبال / الريسبشن',        category: 'living_space', sort_order: 1 },
  { id: 'apt.master_bed',      property_type_id: 'apartment', label_en: 'Master Bedroom',         label_ar: 'غرفة النوم الرئيسية',         category: 'living_space', sort_order: 2 },
  { id: 'apt.master_bath',     property_type_id: 'apartment', label_en: 'Master En-Suite Bathroom', label_ar: 'الحمام الملحق بالغرفة الرئيسية', category: 'wet_room',   sort_order: 3 },
  { id: 'apt.std_bed',         property_type_id: 'apartment', label_en: 'Standard Bedroom',       label_ar: 'غرفة النوم',                  category: 'living_space', is_repeatable: true,  default_count: 2, sort_order: 4 },
  { id: 'apt.main_bath',       property_type_id: 'apartment', label_en: 'Main Bathroom',          label_ar: 'الحمام الرئيسي',              category: 'wet_room',    sort_order: 5 },
  { id: 'apt.guest_bath',      property_type_id: 'apartment', label_en: 'Guest Bathroom',         label_ar: 'حمام الضيوف',                 category: 'wet_room',    is_optional: true, sort_order: 6 },
  { id: 'apt.kitchen',         property_type_id: 'apartment', label_en: 'Kitchen',                label_ar: 'المطبخ',                      category: 'wet_room',    sort_order: 7 },
  { id: 'apt.balcony',         property_type_id: 'apartment', label_en: 'Balcony / Terrace',      label_ar: 'البلكونة / التراس',           category: 'transit',     is_repeatable: true, default_count: 1, sort_order: 8 },
  { id: 'apt.corridor',        property_type_id: 'apartment', label_en: 'Corridors',              label_ar: 'طرق التوزيع',                 category: 'transit',     sort_order: 9 },
  { id: 'apt.open_terrace',    property_type_id: 'apartment', label_en: 'Open Terrace (Penthouse)', label_ar: 'التراس المكشوف (بنتهاوس)',  category: 'transit',     is_optional: true, sort_order: 10 },

  // ── VILLA — floor containers ────────────────────────────────────────────────
  { id: 'vil.exterior',        property_type_id: 'villa', label_en: 'Garden & Fence',             label_ar: 'الحديقة والسور',              category: 'exterior',    sort_order: 1 },
  // Ground floor container
  { id: 'vil.ground',          property_type_id: 'villa', label_en: 'Ground Floor',               label_ar: 'الدور الأرضي',                category: 'living_space', is_container: true, sort_order: 2 },
  { id: 'vil.g.entrance',      property_type_id: 'villa', parent_zone_id: 'vil.ground', label_en: 'Entrance Hall',         label_ar: 'مدخل الفيلا',              category: 'living_space', sort_order: 1 },
  { id: 'vil.g.reception',     property_type_id: 'villa', parent_zone_id: 'vil.ground', label_en: 'Reception',             label_ar: 'الاستقبال',                category: 'living_space', sort_order: 2 },
  { id: 'vil.g.dining',        property_type_id: 'villa', parent_zone_id: 'vil.ground', label_en: 'Dining Room',           label_ar: 'غرفة السفرة',              category: 'living_space', sort_order: 3 },
  { id: 'vil.g.powder_room',   property_type_id: 'villa', parent_zone_id: 'vil.ground', label_en: 'Guest Powder Room',    label_ar: 'حمام الضيوف',              category: 'wet_room',    sort_order: 4 },
  { id: 'vil.g.kitchen',       property_type_id: 'villa', parent_zone_id: 'vil.ground', label_en: 'Main Kitchen',         label_ar: 'المطبخ الرئيسي',           category: 'wet_room',    sort_order: 5 },
  // First floor container
  { id: 'vil.first',           property_type_id: 'villa', label_en: 'First Floor',                label_ar: 'الدور الأول',                 category: 'living_space', is_container: true, sort_order: 3 },
  { id: 'vil.f.master_suite',  property_type_id: 'villa', parent_zone_id: 'vil.first', label_en: 'Master Suite',          label_ar: 'الجناح الرئيسي',           category: 'living_space', sort_order: 1 },
  { id: 'vil.f.master_bath',   property_type_id: 'villa', parent_zone_id: 'vil.first', label_en: 'Master En-Suite',      label_ar: 'الحمام الملحق',            category: 'wet_room',    sort_order: 2 },
  { id: 'vil.f.std_bed',       property_type_id: 'villa', parent_zone_id: 'vil.first', label_en: 'Standard Bedroom',     label_ar: 'غرفة النوم',               category: 'living_space', is_repeatable: true, default_count: 2, sort_order: 3 },
  { id: 'vil.f.family_room',   property_type_id: 'villa', parent_zone_id: 'vil.first', label_en: 'Family Living Room',   label_ar: 'الصالة العائلية',          category: 'living_space', sort_order: 4 },
  { id: 'vil.f.main_bath',     property_type_id: 'villa', parent_zone_id: 'vil.first', label_en: 'Main Bathroom',        label_ar: 'الحمام الرئيسي',           category: 'wet_room',    sort_order: 5 },
  // Basement container (optional)
  { id: 'vil.basement',        property_type_id: 'villa', label_en: 'Basement',                   label_ar: 'البدروم',                     category: 'living_space', is_container: true, is_optional: true, sort_order: 4 },
  { id: 'vil.b.garage',        property_type_id: 'villa', parent_zone_id: 'vil.basement', label_en: 'Garage',               label_ar: 'الجراج',                   category: 'infrastructure', sort_order: 1 },
  { id: 'vil.b.game_room',     property_type_id: 'villa', parent_zone_id: 'vil.basement', label_en: 'Entertainment / Game Room', label_ar: 'غرفة الترفيه والألعاب', category: 'living_space', sort_order: 2 },
  { id: 'vil.b.driver_room',   property_type_id: 'villa', parent_zone_id: 'vil.basement', label_en: "Driver / Maid's Room", label_ar: 'غرفة السائق / الخادمة',   category: 'living_space', sort_order: 3 },
  { id: 'vil.b.storage',       property_type_id: 'villa', parent_zone_id: 'vil.basement', label_en: 'Storage & Laundry',    label_ar: 'المخزن والغسيل',           category: 'transit',     sort_order: 4 },
  // Roof container
  { id: 'vil.roof',            property_type_id: 'villa', label_en: 'Roof Level',                 label_ar: 'الرووف',                      category: 'transit',     is_container: true, sort_order: 5 },
  { id: 'vil.r.guest_suite',   property_type_id: 'villa', parent_zone_id: 'vil.roof', label_en: 'Roof Annex / Guest Suite', label_ar: 'ملحق الرووف / جناح الضيوف', category: 'living_space', is_optional: true, sort_order: 1 },
  { id: 'vil.r.terrace',       property_type_id: 'villa', parent_zone_id: 'vil.roof', label_en: 'Outdoor Terrace',         label_ar: 'التراس الخارجي',            category: 'transit',     sort_order: 2 },

  // ── BUILDING ───────────────────────────────────────────────────────────────
  { id: 'bld.basement',        property_type_id: 'building', label_en: 'Basement Garage',           label_ar: 'البدروم والجراج',             category: 'infrastructure', sort_order: 1 },
  { id: 'bld.ground_lobby',    property_type_id: 'building', label_en: 'Ground Floor & Lobby',      label_ar: 'الدور الأرضي والمدخل',        category: 'infrastructure', sort_order: 2 },
  { id: 'bld.typical_floors',  property_type_id: 'building', label_en: 'Typical Floors & Stairwell', label_ar: 'الأدوار المتكررة والسلم',    category: 'infrastructure', sort_order: 3 },
  { id: 'bld.roof',            property_type_id: 'building', label_en: 'Roof & Utilities',           label_ar: 'السطح والمرافق',              category: 'infrastructure', sort_order: 4 },

  // ── TOWER ──────────────────────────────────────────────────────────────────
  { id: 'twr.basement',        property_type_id: 'tower', label_en: 'Multi-Level Basement',        label_ar: 'البدروم متعدد المستويات',      category: 'infrastructure', sort_order: 1 },
  { id: 'twr.mezzanine',       property_type_id: 'tower', label_en: 'Commercial Mezzanine',        label_ar: 'الميزانين التجاري',            category: 'infrastructure', sort_order: 2 },
  { id: 'twr.typical_floors',  property_type_id: 'tower', label_en: 'Typical Floors',              label_ar: 'الأدوار المتكررة',             category: 'infrastructure', sort_order: 3 },
  { id: 'twr.service_core',    property_type_id: 'tower', label_en: 'Service / Emergency Core',    label_ar: 'نواة الخدمة والطوارئ',         category: 'infrastructure', sort_order: 4 },
  { id: 'twr.safety',          property_type_id: 'tower', label_en: 'Advanced Safety Systems',     label_ar: 'أنظمة السلامة',                category: 'infrastructure', sort_order: 5 },

  // ── GARAGE ─────────────────────────────────────────────────────────────────
  { id: 'grg.ramp',            property_type_id: 'garage', label_en: 'Access Ramp',                label_ar: 'الرامب',                       category: 'garage_unit', sort_order: 1 },
  { id: 'grg.bay',             property_type_id: 'garage', label_en: 'Parking Bay',                label_ar: 'باكية الجراج',                  category: 'garage_unit', sort_order: 2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRADE TEMPLATES  (§4)
// ─────────────────────────────────────────────────────────────────────────────

export const TRADE_TEMPLATES: TradeTemplate[] = [
  // ── wet_room ────────────────────────────────────────────────────────────────
  {
    id: 'wet.plumbing',
    categories: ['wet_room'],
    label_en: 'Plumbing', label_ar: 'السباكة',
    status_values: ['NotStarted', 'RoughIn', 'Finished'],
  },
  {
    id: 'wet.electrical',
    categories: ['wet_room'],
    label_en: 'Electrical', label_ar: 'الكهرباء',
    status_values: ['NotStarted', 'ConduitsOnly', 'Wired', 'Finished'],
  },
  {
    id: 'wet.walls',
    categories: ['wet_room'],
    label_en: 'Walls & Tiling', label_ar: 'الحوائط والبلاط',
    status_values: ['RedBrick', 'Plastered', 'Tiled', 'Finished'],
  },
  {
    id: 'wet.flooring',
    categories: ['wet_room'],
    label_en: 'Flooring', label_ar: 'الأرضيات',
    status_values: ['SandBed', 'Tiled', 'Finished'],
  },
  {
    id: 'wet.hvac',
    categories: ['wet_room'],
    label_en: 'HVAC (Kitchen Extraction)', label_ar: 'تهوية المطبخ',
    status_values: ['NotStarted', 'Installed'],
  },

  // ── living_space ────────────────────────────────────────────────────────────
  {
    id: 'liv.electrical',
    categories: ['living_space'],
    label_en: 'Electrical', label_ar: 'الكهرباء',
    status_values: ['NotStarted', 'ConduitsOnly', 'Wired', 'Finished'],
  },
  {
    id: 'liv.walls',
    categories: ['living_space'],
    label_en: 'Walls & Painting', label_ar: 'الحوائط والدهانات',
    status_values: ['RedBrick', 'Plastered', 'Putty', 'FinalPaint'],
  },
  {
    id: 'liv.flooring',
    categories: ['living_space'],
    label_en: 'Flooring', label_ar: 'الأرضيات',
    status_values: ['SandBed', 'Tiled', 'Finished'],
  },
  {
    id: 'liv.carpentry',
    categories: ['living_space'],
    label_en: 'Carpentry & Openings', label_ar: 'النجارة والألوميتال',
    status_values: ['None', 'SubFrames', 'Installed'],
  },
  {
    id: 'liv.hvac',
    categories: ['living_space'],
    label_en: 'HVAC', label_ar: 'التكييفات',
    status_values: ['NotStarted', 'CopperPrep', 'Installed'],
  },

  // ── transit ─────────────────────────────────────────────────────────────────
  {
    id: 'trn.electrical',
    categories: ['transit'],
    label_en: 'Electrical', label_ar: 'الكهرباء',
    status_values: ['NotStarted', 'Wired', 'Finished'],
  },
  {
    id: 'trn.walls',
    categories: ['transit'],
    label_en: 'Walls & Painting', label_ar: 'الحوائط والدهانات',
    status_values: ['RedBrick', 'Plastered', 'FinalPaint'],
  },
  {
    id: 'trn.flooring',
    categories: ['transit'],
    label_en: 'Flooring', label_ar: 'الأرضيات',
    status_values: ['SandBed', 'Tiled', 'Finished'],
  },

  // ── exterior ────────────────────────────────────────────────────────────────
  {
    id: 'ext.landscaping',
    categories: ['exterior'],
    label_en: 'Landscaping', label_ar: 'تنسيق الحديقة',
    status_values: ['NotStarted', 'Rough', 'Finished'],
  },
  {
    id: 'ext.fence_gate',
    categories: ['exterior'],
    label_en: 'Fence & Gate', label_ar: 'السور والبوابة',
    status_values: ['NotStarted', 'Built', 'Finished'],
  },
  {
    id: 'ext.pool',
    categories: ['exterior'],
    label_en: 'Pool', label_ar: 'المسبح',
    status_values: ['NotStarted', 'Shell', 'Tiled', 'Finished'],
  },

  // ── infrastructure (Basement Garage) ────────────────────────────────────────
  {
    id: 'inf.ramp_access',
    categories: ['infrastructure'],
    label_en: 'Ramp & Access', label_ar: 'الرامب والمدخل',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
  {
    id: 'inf.parking',
    categories: ['infrastructure'],
    label_en: 'Parking Infrastructure', label_ar: 'منظومة الجراج',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
  {
    id: 'inf.drainage',
    categories: ['infrastructure'],
    label_en: 'Drainage', label_ar: 'الصرف الصحي',
    status_values: ['NotStarted', 'Installed'],
  },
  {
    id: 'inf.lobby',
    categories: ['infrastructure'],
    label_en: 'Lobby Finish', label_ar: 'تشطيب الردهة',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
  {
    id: 'inf.security',
    categories: ['infrastructure'],
    label_en: 'Security & Access', label_ar: 'الأمن والدخول',
    status_values: ['NotStarted', 'Installed'],
  },
  {
    id: 'inf.elevator',
    categories: ['infrastructure'],
    label_en: 'Elevator', label_ar: 'المصعد',
    status_values: ['NotStarted', 'Shaft', 'Installed'],
  },
  {
    id: 'inf.common_finish',
    categories: ['infrastructure'],
    label_en: 'Common Area Finish', label_ar: 'تشطيب المناطق المشتركة',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
  {
    id: 'inf.insulation',
    categories: ['infrastructure'],
    label_en: 'Insulation & Waterproofing', label_ar: 'العزل والحماية',
    status_values: ['NotStarted', 'Applied', 'Finished'],
  },
  {
    id: 'inf.water_systems',
    categories: ['infrastructure'],
    label_en: 'Water Systems', label_ar: 'منظومة المياه',
    status_values: ['NotStarted', 'Installed'],
  },
  {
    id: 'inf.retail_shell',
    categories: ['infrastructure'],
    label_en: 'Retail Shell Finish', label_ar: 'تشطيب الشيل التجاري',
    status_values: ['CoreAndShell', 'Fitted'],
  },
  {
    id: 'inf.emergency',
    categories: ['infrastructure'],
    label_en: 'Emergency Systems', label_ar: 'أنظمة الطوارئ',
    status_values: ['NotStarted', 'Installed'],
  },
  {
    id: 'inf.fire_safety',
    categories: ['infrastructure'],
    label_en: 'Fire & Backup Systems', label_ar: 'أنظمة الإطفاء والطاقة الاحتياطية',
    status_values: ['NotStarted', 'Installed'],
  },

  // ── garage_unit ─────────────────────────────────────────────────────────────
  {
    id: 'grg.ramp_construction',
    categories: ['garage_unit'],
    label_en: 'Ramp Construction', label_ar: 'إنشاء الرامب',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
  {
    id: 'grg.bay_finish',
    categories: ['garage_unit'],
    label_en: 'Bay Finish', label_ar: 'تشطيب الباكية',
    status_values: ['NotStarted', 'InProgress', 'Finished'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTE TEMPLATES  (§4)
// ─────────────────────────────────────────────────────────────────────────────

export const ATTRIBUTE_TEMPLATES: AttributeTemplate[] = [
  // wet.plumbing
  { id: 'wet.plumbing.piping_brand',        trade_id: 'wet.plumbing',  label_en: 'Piping Brand',          label_ar: 'ماركة الأنابيب',    data_type: 'text' },
  { id: 'wet.plumbing.pressure_tested',     trade_id: 'wet.plumbing',  label_en: 'Pressure Tested',       label_ar: 'تم اختبار الضغط',   data_type: 'boolean' },
  { id: 'wet.plumbing.concealed_cistern',   trade_id: 'wet.plumbing',  label_en: 'Concealed Cistern (خزان مخفي)', label_ar: 'خزان مخفي', data_type: 'boolean',
    applies_to_zone_ids: ['apt.master_bath','apt.main_bath','apt.guest_bath','vil.g.powder_room','vil.f.master_bath','vil.f.main_bath'] },
  { id: 'wet.plumbing.shower_type',         trade_id: 'wet.plumbing',  label_en: 'Shower Type',           label_ar: 'نوع الدش',           data_type: 'enum',
    enum_values: ['Walk-in', 'Bathtub', 'None'],
    applies_to_zone_ids: ['apt.master_bath','apt.main_bath','apt.guest_bath','vil.g.powder_room','vil.f.master_bath','vil.f.main_bath'] },
  { id: 'wet.plumbing.water_heater',        trade_id: 'wet.plumbing',  label_en: 'Water Heater Provision', label_ar: 'مصدر السخان',       data_type: 'enum',
    enum_values: ['Gas', 'Electric', 'Solar', 'None'] },

  // wet.electrical
  { id: 'wet.elec.wiring_brand',            trade_id: 'wet.electrical', label_en: 'Wiring Brand',         label_ar: 'ماركة الأسلاك',     data_type: 'text' },
  { id: 'wet.elec.heavy_outlets',           trade_id: 'wet.electrical', label_en: 'Heavy-Duty Outlets',   label_ar: 'مقابس ثقيلة',       data_type: 'boolean' },

  // wet.walls
  { id: 'wet.walls.tile_height',            trade_id: 'wet.walls',     label_en: 'Wall Tile Height',      label_ar: 'ارتفاع البلاط',      data_type: 'enum',
    enum_values: ['Full Ceiling', 'Half', 'None'] },

  // wet.flooring
  { id: 'wet.floor.material',               trade_id: 'wet.flooring',  label_en: 'Material',              label_ar: 'الخامة',             data_type: 'enum',
    enum_values: ['Ceramic', 'Porcelain', 'Marble', 'Epoxy'] },
  { id: 'wet.floor.grade',                  trade_id: 'wet.flooring',  label_en: 'Grade',                 label_ar: 'الفرز',              data_type: 'enum',
    enum_values: ['First Choice (فرز أول)', 'Second Choice (فرز ثاني)'] },

  // liv.electrical
  { id: 'liv.elec.wiring_brand',            trade_id: 'liv.electrical', label_en: 'Wiring Brand',         label_ar: 'ماركة الأسلاك',     data_type: 'text' },
  { id: 'liv.elec.smart_home',              trade_id: 'liv.electrical', label_en: 'Smart Home Prepped',   label_ar: 'تمديدات الذكاء الاصطناعي', data_type: 'boolean' },

  // liv.walls
  { id: 'liv.walls.gypsum_board',           trade_id: 'liv.walls',     label_en: 'Gypsum Board Ceiling (أسقف معلقة)', label_ar: 'أسقف جبسية معلقة', data_type: 'boolean' },

  // liv.flooring
  { id: 'liv.floor.material',               trade_id: 'liv.flooring',  label_en: 'Material',              label_ar: 'الخامة',             data_type: 'enum',
    enum_values: ['Ceramic', 'Porcelain', 'Marble', 'HDF'] },
  { id: 'liv.floor.grade',                  trade_id: 'liv.flooring',  label_en: 'Grade',                 label_ar: 'الفرز',              data_type: 'enum',
    enum_values: ['First Choice (فرز أول)', 'Second Choice (فرز ثاني)'] },

  // liv.carpentry
  { id: 'liv.carp.window_profile',          trade_id: 'liv.carpentry', label_en: 'Window Profile',        label_ar: 'نوع بروفيل النافذة', data_type: 'enum',
    enum_values: ['PS Profile', 'Jumbo Profile', 'Standard'] },
  { id: 'liv.carp.glazing',                 trade_id: 'liv.carpentry', label_en: 'Glazing',               label_ar: 'نوع الزجاج',         data_type: 'enum',
    enum_values: ['Single Glass', 'Double Glass'] },
  { id: 'liv.carp.main_door',               trade_id: 'liv.carpentry', label_en: 'Main Door Type',        label_ar: 'نوع الباب الرئيسي',  data_type: 'enum',
    enum_values: ['Armored (مصفح)', 'Wood'] },

  // liv.hvac
  { id: 'liv.hvac.copper_brand',            trade_id: 'liv.hvac',      label_en: 'Copper Piping Brand',   label_ar: 'ماركة النحاس',       data_type: 'text' },

  // trn.flooring (transit zone flooring has material/grade too)
  { id: 'trn.floor.material',               trade_id: 'trn.flooring',  label_en: 'Material',              label_ar: 'الخامة',             data_type: 'enum',
    enum_values: ['Ceramic', 'Porcelain', 'Marble', 'Outdoor Tile'] },
  { id: 'trn.floor.grade',                  trade_id: 'trn.flooring',  label_en: 'Grade',                 label_ar: 'الفرز',              data_type: 'enum',
    enum_values: ['First Choice (فرز أول)', 'Second Choice (فرز ثاني)'] },

  // exterior
  { id: 'ext.land.irrigation',              trade_id: 'ext.landscaping', label_en: 'Irrigation System',   label_ar: 'نظام الري',          data_type: 'boolean' },
  { id: 'ext.fence.gate_type',              trade_id: 'ext.fence_gate',  label_en: 'Gate Type',           label_ar: 'نوع البوابة',        data_type: 'enum',
    enum_values: ['Automatic Remote', 'Manual'] },
  { id: 'ext.pool.pool_type',               trade_id: 'ext.pool',        label_en: 'Pool Type',           label_ar: 'نوع المسبح',         data_type: 'enum',
    enum_values: ['Skimmer', 'Overflow'] },
  { id: 'ext.pool.heated',                  trade_id: 'ext.pool',        label_en: 'Heated',              label_ar: 'تسخين مياه',         data_type: 'boolean' },

  // infrastructure — Basement Garage
  { id: 'inf.ramp.gradient',                trade_id: 'inf.ramp_access', label_en: 'Ramp Gradient',       label_ar: 'ميل الرامب',         data_type: 'text' },
  { id: 'inf.ramp.auto_gate',               trade_id: 'inf.ramp_access', label_en: 'Automatic Remote Gate', label_ar: 'بوابة أوتوماتيك', data_type: 'boolean' },
  { id: 'inf.park.bay_count',               trade_id: 'inf.parking',     label_en: 'Parking Bay Count',   label_ar: 'عدد باكيات الجراج',  data_type: 'integer' },
  { id: 'inf.park.numbered',                trade_id: 'inf.parking',     label_en: 'Numbered Slots',      label_ar: 'أرقام مسلسلة',       data_type: 'boolean' },
  { id: 'inf.drain.sump_pump',              trade_id: 'inf.drainage',    label_en: 'Sump Pump Installed (طلمبة غاطسة)', label_ar: 'طلمبة غاطسة', data_type: 'boolean' },

  // infrastructure — Ground Floor & Lobby
  { id: 'inf.lobby.material',               trade_id: 'inf.lobby',       label_en: 'Lobby Finish Material', label_ar: 'خامة الردهة',      data_type: 'enum',
    enum_values: ['Marble', 'Granite', 'Ceramic'] },
  { id: 'inf.sec.concierge',                trade_id: 'inf.security',    label_en: 'Concierge Room',      label_ar: 'حجرة الكونسيرج',     data_type: 'boolean' },
  { id: 'inf.sec.intercom',                 trade_id: 'inf.security',    label_en: 'Intercom System',     label_ar: 'نظام الإنتركم',      data_type: 'enum',
    enum_values: ['Audio', 'Video', 'None'] },
  { id: 'inf.elev.count',                   trade_id: 'inf.elevator',    label_en: 'Elevator Count',      label_ar: 'عدد المصاعد',        data_type: 'integer' },
  { id: 'inf.elev.capacity',                trade_id: 'inf.elevator',    label_en: 'Capacity (kg)',       label_ar: 'الحمولة (كجم)',      data_type: 'integer' },
  { id: 'inf.elev.brand',                   trade_id: 'inf.elevator',    label_en: 'Motor Brand',         label_ar: 'ماركة الموتور',      data_type: 'text' },
  { id: 'inf.elev.service',                 trade_id: 'inf.elevator',    label_en: 'Dedicated Service Elevator', label_ar: 'مصعد خدمة منفصل', data_type: 'boolean' },

  // infrastructure — Roof & Utilities
  { id: 'inf.ins.thermal',                  trade_id: 'inf.insulation',  label_en: 'Thermal Insulation',  label_ar: 'عزل حراري',          data_type: 'boolean' },
  { id: 'inf.ins.bitumen',                  trade_id: 'inf.insulation',  label_en: 'Bitumen Waterproofing', label_ar: 'عزل بيتوميني',     data_type: 'boolean' },
  { id: 'inf.water.motor',                  trade_id: 'inf.water_systems', label_en: 'Central Water Motor', label_ar: 'موتور مياه مركزي', data_type: 'boolean' },
  { id: 'inf.water.tank_count',             trade_id: 'inf.water_systems', label_en: 'Water Tank Count',   label_ar: 'عدد خزانات المياه',  data_type: 'integer' },

  // infrastructure — Tower specific
  { id: 'inf.retail.shell_level',           trade_id: 'inf.retail_shell', label_en: 'Shell Finish Level', label_ar: 'مستوى التشطيب',      data_type: 'enum',
    enum_values: ['Core & Shell', 'Fitted'] },
  { id: 'inf.emrg.pressurized_stairs',      trade_id: 'inf.emergency',    label_en: 'Pressurized Emergency Stairs', label_ar: 'سلم طوارئ مضغوط', data_type: 'boolean' },
  { id: 'inf.emrg.garbage_chutes',          trade_id: 'inf.emergency',    label_en: 'Garbage Chutes',      label_ar: 'مزالق القمامة',      data_type: 'boolean' },
  { id: 'inf.fire.sprinklers',              trade_id: 'inf.fire_safety',  label_en: 'Fire Suppression Sprinklers', label_ar: 'رشاشات إطفاء', data_type: 'boolean' },
  { id: 'inf.fire.generator',               trade_id: 'inf.fire_safety',  label_en: 'Backup Generator',    label_ar: 'مولد كهربائي',       data_type: 'boolean' },
  { id: 'inf.fire.cctv',                    trade_id: 'inf.fire_safety',  label_en: 'CCTV Surveillance',   label_ar: 'كاميرات المراقبة',   data_type: 'boolean' },

  // garage_unit
  { id: 'grg.ramp.gradient',                trade_id: 'grg.ramp_construction', label_en: 'Ramp Gradient Type', label_ar: 'نوع ميل الرامب', data_type: 'text' },
  { id: 'grg.ramp.auto_gate',               trade_id: 'grg.ramp_construction', label_en: 'Automatic Remote Gate', label_ar: 'بوابة أوتوماتيك', data_type: 'boolean' },
  { id: 'grg.bay.size',                     trade_id: 'grg.bay_finish',        label_en: 'Bay Size (sqm)',    label_ar: 'مساحة الباكية (م²)',  data_type: 'numeric' },
  { id: 'grg.bay.numbered',                 trade_id: 'grg.bay_finish',        label_en: 'Numbered',          label_ar: 'مرقمة',              data_type: 'boolean' },
  { id: 'grg.bay.covered',                  trade_id: 'grg.bay_finish',        label_en: 'Covered',           label_ar: 'مظللة',              data_type: 'boolean' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ZONE → TRADES mapping
// Maps each zone ID to the specific trade IDs that apply to it.
// Zones inherit all trades from their category UNLESS overridden here.
// This map handles Infrastructure zones that have specific trade subsets.
// ─────────────────────────────────────────────────────────────────────────────

export const ZONE_TRADE_OVERRIDES: Record<string, string[]> = {
  // Villa exterior has all exterior trades
  'vil.exterior':       ['ext.landscaping', 'ext.fence_gate', 'ext.pool'],
  // Villa basement garage (infrastructure category, but specific trades)
  'vil.b.garage':       ['inf.ramp_access', 'inf.parking', 'inf.drainage'],
  // Building
  'bld.basement':       ['inf.ramp_access', 'inf.parking', 'inf.drainage'],
  'bld.ground_lobby':   ['inf.lobby', 'inf.security', 'inf.elevator'],
  'bld.typical_floors': ['inf.common_finish'],
  'bld.roof':           ['inf.insulation', 'inf.water_systems'],
  // Tower
  'twr.basement':       ['inf.ramp_access', 'inf.parking', 'inf.drainage'],
  'twr.mezzanine':      ['inf.retail_shell'],
  'twr.typical_floors': ['inf.common_finish', 'inf.elevator'],
  'twr.service_core':   ['inf.emergency'],
  'twr.safety':         ['inf.fire_safety'],
  // Garage unit
  'grg.ramp':           ['grg.ramp_construction'],
  'grg.bay':            ['grg.bay_finish'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get all trade templates that apply to a given zone
// ─────────────────────────────────────────────────────────────────────────────
export function getTradesForZone(zone: ZoneTemplate): TradeTemplate[] {
  const overrideIds = ZONE_TRADE_OVERRIDES[zone.id];
  if (overrideIds) {
    return overrideIds
      .map(id => TRADE_TEMPLATES.find(t => t.id === id))
      .filter(Boolean) as TradeTemplate[];
  }
  // Default: all trades whose categories include this zone's category
  return TRADE_TEMPLATES.filter(t => t.categories.includes(zone.category));
}

// Helper: get attributes for a trade, optionally filtered to a specific zone
export function getAttributesForTrade(tradeId: string, zoneId?: string): AttributeTemplate[] {
  return ATTRIBUTE_TEMPLATES.filter(a => {
    if (a.trade_id !== tradeId) return false;
    if (a.applies_to_zone_ids && zoneId) {
      return a.applies_to_zone_ids.includes(zoneId);
    }
    // If applies_to_zone_ids is set but zoneId not provided, exclude zone-specific attrs
    if (a.applies_to_zone_ids && !zoneId) return false;
    return true;
  });
}

// Helper: get all top-level zone templates for a property type
export function getZonesForType(typeId: PropertyTypeId): ZoneTemplate[] {
  return ZONE_TEMPLATES
    .filter(z => z.property_type_id === typeId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

// Helper: get child zones of a container zone
export function getChildZones(parentId: string): ZoneTemplate[] {
  return ZONE_TEMPLATES
    .filter(z => z.parent_zone_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order);
}
