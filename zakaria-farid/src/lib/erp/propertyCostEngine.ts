import { ERPPropertyCostItem, PropertyCostCategory, PropertyLifecyclePhase } from './types';
import { Property } from '@/lib/supabase/types';
import { D } from './math';

export interface CategoryMeta {
  key: PropertyCostCategory;
  nameAr: string;
  nameEn: string;
  color: string;
  accountCode: string;
  badgeBg: string;
  badgeBorder: string;
}

export const PROPERTY_COST_CATEGORIES: CategoryMeta[] = [
  {
    key: 'civil_structure',
    nameAr: 'خرسانات وهيكل إنشائي',
    nameEn: 'Civil & Structure',
    color: '#3b82f6',
    accountCode: '151000',
    badgeBg: 'rgba(59, 130, 246, 0.12)',
    badgeBorder: 'rgba(59, 130, 246, 0.25)'
  },
  {
    key: 'mep_infrastructure',
    nameAr: 'كهروميكانيك وتأسيسات',
    nameEn: 'MEP Infrastructure',
    color: '#06b6d4',
    accountCode: '152000',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    badgeBorder: 'rgba(6, 182, 212, 0.25)'
  },
  {
    key: 'finishing_interior',
    nameAr: 'تشطيبات معمارية وديكور',
    nameEn: 'Finishing & Interiors',
    color: '#10b981',
    accountCode: '153000',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeBorder: 'rgba(16, 185, 129, 0.25)'
  },
  {
    key: 'site_facade',
    nameAr: 'واجهات ومداخل ومصاعد',
    nameEn: 'Façade & Vertical Access',
    color: '#8b5cf6',
    accountCode: '153000',
    badgeBg: 'rgba(139, 92, 246, 0.12)',
    badgeBorder: 'rgba(139, 92, 246, 0.25)'
  },
  {
    key: 'permits_engineering',
    nameAr: 'تراخيص ومخططات واستشارات',
    nameEn: 'Permits & Engineering',
    color: '#d4af37',
    accountCode: '150000',
    badgeBg: 'rgba(212, 175, 55, 0.12)',
    badgeBorder: 'rgba(212, 175, 55, 0.25)'
  },
  {
    key: 'taxes_fees',
    nameAr: 'ضرائب ورسوم إنشائية وحكومية',
    nameEn: 'Taxes, Levies & Fees',
    color: '#0ea5e9',
    accountCode: '150000',
    badgeBg: 'rgba(14, 165, 233, 0.12)',
    badgeBorder: 'rgba(14, 165, 233, 0.25)'
  },
  {
    key: 'land_allocation',
    nameAr: 'حصة الأرض المحملة',
    nameEn: 'Land Cost Allocation',
    color: '#f59e0b',
    accountCode: '150000',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
    badgeBorder: 'rgba(245, 158, 11, 0.25)'
  },
  {
    key: 'labor_subcontractor',
    nameAr: 'مصنعيات ومقاولو باطن',
    nameEn: 'Labor & Subcontractors',
    color: '#ec4899',
    accountCode: '151000',
    badgeBg: 'rgba(236, 72, 153, 0.12)',
    badgeBorder: 'rgba(236, 72, 153, 0.25)'
  }
];

export interface PhaseMeta {
  key: PropertyLifecyclePhase;
  order: number;
  nameAr: string;
  nameEn: string;
  shortAr: string;
  icon: string;
}

export const PROPERTY_LIFECYCLE_PHASES: PhaseMeta[] = [
  {
    key: 'planning_permits',
    order: 1,
    nameAr: '1. التراخيص والمخططات والجسات',
    nameEn: '1. Planning, Permits & Surveys',
    shortAr: 'التراخيص والتخطيط',
    icon: '📋'
  },
  {
    key: 'excavation_foundation',
    order: 2,
    nameAr: '2. الحفر والأساسات والعزل',
    nameEn: '2. Excavation & Foundations',
    shortAr: 'الأساسات والحفر',
    icon: '🏗️'
  },
  {
    key: 'structural_skeleton',
    order: 3,
    nameAr: '3. الهيكل الخرساني وحديد التسليح',
    nameEn: '3. Structural Skeleton & Rebar',
    shortAr: 'الهيكل والخرسانات',
    icon: '🏛️'
  },
  {
    key: 'masonry_roughing',
    order: 4,
    nameAr: '4. المباني وتأسيس الكهروميكانيك',
    nameEn: '4. Masonry & Roughing MEP',
    shortAr: 'المباني والتأسيس',
    icon: '🧱'
  },
  {
    key: 'finishing_interiors',
    order: 5,
    nameAr: '5. التشطيبات المعمارية والكسوات',
    nameEn: '5. Architectural Finishing',
    shortAr: 'التشطيبات والديكور',
    icon: '🎨'
  },
  {
    key: 'final_inspection_handover',
    order: 6,
    nameAr: '6. المعاينة النهائية والجاهزية للبيع',
    nameEn: '6. Handover Audit & Ready to Sell',
    shortAr: 'الجاهزية للبيع',
    icon: '✨'
  }
];

/**
 * Generates an authentic Egyptian real estate construction lifecycle audit trail
 * for a list of properties, proportional to their actual built-up area and catalog specs.
 */
export function generateMockPropertyCosts(properties: Property[]): ERPPropertyCostItem[] {
  const allCosts: ERPPropertyCostItem[] = [];

  properties.forEach((prop, propIndex) => {
    const area = prop.area_sqm || 200;
    const propId = prop.id;

    // Dates staggered across 2024 - 2025 to create a chronological progression
    const yearOffset = propIndex % 2 === 0 ? 0 : 1;
    const baseYear = 2024 + yearOffset;

    // 1. Planning & Permits
    allCosts.push({
      item_id: `cost-${propId}-01`,
      property_id: propId,
      category: 'permits_engineering',
      phase: 'planning_permits',
      item_name_ar: 'إصدار تراخيص البناء والرسومات التنفيذية المعتمدة وجهاز المدينة',
      item_name_en: 'Architectural Blueprint Approvals & Municipal Permits',
      supplier_contractor: 'جهاز المدينة وإدارة الشؤون الهندسية',
      invoice_ref: `LIC-${baseYear}-${100 + propIndex}`,
      quantity: 1,
      unit: 'ترخيص معتمد',
      unit_cost_egp: D(area).times(950).toFixed(2),
      total_cost_egp: D(area).times(950).toFixed(2),
      logged_date: `${baseYear}-02-15`,
      logged_by: 'م. أحمد عبد العزيز - مدير المشروعات',
      linked_account_code: '150000',
      status: 'verified',
      notes: 'تم استيفاء مراجعة المجمعة العشرية والسلامة الإنشائية'
    });

    allCosts.push({
      item_id: `cost-${propId}-02`,
      property_id: propId,
      category: 'permits_engineering',
      phase: 'planning_permits',
      item_name_ar: 'جسات واختبارات ميكانيكا التربة وأتعاب الإشراف الاستشاري العام',
      item_name_en: 'Geotechnical Soil Borings & Structural Consultation',
      supplier_contractor: 'مركز الأهرام للاستشارات والبحوث الهندسية',
      invoice_ref: `GEO-${baseYear}-${200 + propIndex}`,
      quantity: 3,
      unit: 'جسات فنية',
      unit_cost_egp: '35000.00',
      total_cost_egp: '105000.00',
      logged_date: `${baseYear}-03-02`,
      logged_by: 'م. حسام الشامي - مهندس التربة والأساسات',
      linked_account_code: '150000',
      status: 'verified',
      notes: 'تقرير التربة يوصي بالأساسات السطحية مع لبشة مسلحة سمك 90 سم'
    });

    // 2. Excavation & Foundations
    const excavationVol = Math.round(area * 3.5);
    allCosts.push({
      item_id: `cost-${propId}-03`,
      property_id: propId,
      category: 'civil_structure',
      phase: 'excavation_foundation',
      item_name_ar: 'أعمال الحفر الميكانيكي وسند جوانب الحفر والتطهير ونقل المخلفات',
      item_name_en: 'Mechanical Excavation, Shoring & Site Earthworks',
      supplier_contractor: 'شركة النيل المتخصصة في الأساسات وأعمال الحفر',
      invoice_ref: `EXC-${baseYear}-${300 + propIndex}`,
      quantity: excavationVol,
      unit: 'م³',
      unit_cost_egp: '165.00',
      total_cost_egp: D(excavationVol).times(165).toFixed(2),
      logged_date: `${baseYear}-04-10`,
      logged_by: 'م. فاروق النجار - مهندس الموقع',
      linked_account_code: '151000',
      status: 'verified',
      notes: 'تم الوصول إلى منسوب التأسيس المعتمد ومطابق لتقرير الجسات'
    });

    const foundationConcreteVol = Math.round(area * 0.75);
    allCosts.push({
      item_id: `cost-${propId}-04`,
      property_id: propId,
      category: 'civil_structure',
      phase: 'excavation_foundation',
      item_name_ar: 'توريد وصب خرسانة عادية ومسلحة للأساسات واللبشة (مقاوم للكبريتات SRC)',
      item_name_en: 'SRC Sulfate-Resistant Concrete Pouring for Foundations',
      supplier_contractor: 'الشركة المصرية للخرسانة الجاهزة (مصر سمنت)',
      invoice_ref: `CON-FND-${baseYear}-${400 + propIndex}`,
      quantity: foundationConcreteVol,
      unit: 'م³',
      unit_cost_egp: '1850.00',
      total_cost_egp: D(foundationConcreteVol).times(1850).toFixed(2),
      logged_date: `${baseYear}-05-18`,
      logged_by: 'م. فاروق النجار - مهندس الموقع',
      linked_account_code: '151000',
      status: 'verified',
      notes: 'تم تكسير مكعبات الخرسانة بعمر 7 و 28 يوم والنتائج أعلى من المجهد التصميمي'
    });

    const insulationArea = Math.round(area * 1.5);
    allCosts.push({
      item_id: `cost-${propId}-05`,
      property_id: propId,
      category: 'civil_structure',
      phase: 'excavation_foundation',
      item_name_ar: 'عزل مائي بمستحلب بيتوميني وممبرين مقوى 4 مم للأساسات وسرداب الجراج',
      item_name_en: '4mm Bituminous Waterproofing Membrane for Foundations',
      supplier_contractor: 'إنسومات تكنولوجي مصر للعوازل المائية',
      invoice_ref: `INS-${baseYear}-${500 + propIndex}`,
      quantity: insulationArea,
      unit: 'م²',
      unit_cost_egp: '230.00',
      total_cost_egp: D(insulationArea).times(230).toFixed(2),
      logged_date: `${baseYear}-06-05`,
      logged_by: 'م. إبراهيم كمال - مهندس مراقبة الجودة',
      linked_account_code: '151000',
      status: 'verified',
      notes: 'تم إجراء اختبار الغمر المائي لمدة 72 ساعة ونجاح العزل بنسبة 100%'
    });

    // 3. Structural Skeleton
    const rebarTons = Math.max(8, Math.round(area * 0.11));
    allCosts.push({
      item_id: `cost-${propId}-06`,
      property_id: propId,
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'توريد حديد عز تسليح عالي المقاومة للأعمدة والأسقف والكمرات (B500D)',
      item_name_en: 'Ezz High-Tensile Steel Rebar Supply (B500D Grade)',
      supplier_contractor: 'شركة العز لصناعة حديد التسليح والدخيلة',
      invoice_ref: `EZZ-STL-${baseYear}-${600 + propIndex}`,
      quantity: rebarTons,
      unit: 'طن',
      unit_cost_egp: '41800.00',
      total_cost_egp: D(rebarTons).times(41800).toFixed(2),
      logged_date: `${baseYear}-07-22`,
      logged_by: 'م. فاروق النجار - مهندس الموقع',
      linked_account_code: '151000',
      status: 'capitalized',
      notes: 'حديد درجة أولى بشهادات اختبار الشد والثني المعتمدة من المصنع'
    });

    const skeletonConcreteVol = Math.round(area * 0.85);
    allCosts.push({
      item_id: `cost-${propId}-07`,
      property_id: propId,
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'توريد وصب خرسانة جاهزة رتبة C35 للأعمدة والحوائط والأسقف والكمرات',
      item_name_en: 'Ready-Mix Concrete C35 Pouring for Columns & Slabs',
      supplier_contractor: 'لافارج مصر للأسمنت والخرسانة الجاهزة',
      invoice_ref: `LAF-${baseYear}-${700 + propIndex}`,
      quantity: skeletonConcreteVol,
      unit: 'م³',
      unit_cost_egp: '1750.00',
      total_cost_egp: D(skeletonConcreteVol).times(1750).toFixed(2),
      logged_date: `${baseYear}-08-30`,
      logged_by: 'م. فاروق النجار - مهندس الموقع',
      linked_account_code: '151000',
      status: 'capitalized',
      notes: 'صب الأسقف بنظام البمب الهيدروليكي والمعالجة بالمياه لمدة 10 أيام'
    });

    allCosts.push({
      item_id: `cost-${propId}-08`,
      property_id: propId,
      category: 'labor_subcontractor',
      phase: 'structural_skeleton',
      item_name_ar: 'مصنعيات مقاولة النجارة المسلحة والحدادة وتجهيز الفورم الإنشائية',
      item_name_en: 'Formwork Carpentry & Blacksmithing Structural Labor',
      supplier_contractor: 'مقاولات الأمل للبناء والإنشاءات الخرسانية',
      invoice_ref: `LAB-STR-${baseYear}-${800 + propIndex}`,
      quantity: area,
      unit: 'م² مسطح',
      unit_cost_egp: '820.00',
      total_cost_egp: D(area).times(820).toFixed(2),
      logged_date: `${baseYear}-09-25`,
      logged_by: 'م. أحمد عبد العزيز - مدير المشروعات',
      linked_account_code: '151000',
      status: 'verified',
      notes: 'صرف المستخلص الختامي لمقاول الهيكل الإنشائي بعد الاستلام'
    });

    // 4. Masonry & Roughing MEP
    const brickQty = Math.round(area * 32);
    allCosts.push({
      item_id: `cost-${propId}-09`,
      property_id: propId,
      category: 'civil_structure',
      phase: 'masonry_roughing',
      item_name_ar: 'توريد طوب طفلي أحمر وبناء القواطع الداخلية والجدران الخارجية المزدوجة',
      item_name_en: 'Red Clay Bricks Supply & Masonry Double Wall Construction',
      supplier_contractor: 'مصانع الصفوة للطوب الطفلي والأسمنتي',
      invoice_ref: `BRK-${baseYear}-${900 + propIndex}`,
      quantity: brickQty,
      unit: 'طوبة',
      unit_cost_egp: '2.40',
      total_cost_egp: D(brickQty).times(2.40).toFixed(2),
      logged_date: `${baseYear}-11-05`,
      logged_by: 'م. فاروق النجار - مهندس الموقع',
      linked_account_code: '151000',
      status: 'verified',
      notes: 'تنفيذ الربط بأعتاب خرسانية مسلحة وشبك تمدد معدني'
    });

    allCosts.push({
      item_id: `cost-${propId}-10`,
      property_id: propId,
      category: 'mep_infrastructure',
      phase: 'masonry_roughing',
      item_name_ar: 'تأسيس شبكة الكهرباء والمواسير والعلب وكابلات السويدي النحاسية الأصلية',
      item_name_en: 'El Sewedy Certified Electrical Conduits & Copper Cabling',
      supplier_contractor: 'السويدي إليكتريك مصر - التوزيع المعتمد',
      invoice_ref: `ELC-${baseYear}-${1000 + propIndex}`,
      quantity: Math.round(area * 1.6),
      unit: 'متر طولي',
      unit_cost_egp: '380.00',
      total_cost_egp: D(area).times(1.6).times(380).toFixed(2),
      logged_date: `${baseYear}-12-12`,
      logged_by: 'م. شريف مدحت - مهندس كهروميكانيك',
      linked_account_code: '152000',
      status: 'verified',
      notes: 'تأريض معتمد ولوحات شنايدر إلكتريك وقواطع حماية تفاضلية'
    });

    allCosts.push({
      item_id: `cost-${propId}-11`,
      property_id: propId,
      category: 'mep_infrastructure',
      phase: 'masonry_roughing',
      item_name_ar: 'تأسيس شبكة التغذية المائية والصرف الصحي ومواسير البولي بروبلين المقاومة',
      item_name_en: 'PPR Water Supply & Sound-Insulated Drainage Networks',
      supplier_contractor: 'مجموعة الشريف لأنظمة السباكة المتقدمة',
      invoice_ref: `PLM-${baseYear}-${1100 + propIndex}`,
      quantity: 1,
      unit: 'شبكة كاملة',
      unit_cost_egp: D(area).times(420).toFixed(2),
      total_cost_egp: D(area).times(420).toFixed(2),
      logged_date: `${baseYear + 1}-01-18`,
      logged_by: 'م. شريف مدحت - مهندس كهروميكانيك',
      linked_account_code: '152000',
      status: 'verified',
      notes: 'تم إجراء اختبار الضغط المائي 15 بار لمدة 24 ساعة وتسليم شهادة الضمان'
    });

    // 5. Architectural Finishing & Interiors
    allCosts.push({
      item_id: `cost-${propId}-12`,
      property_id: propId,
      category: 'finishing_interior',
      phase: 'finishing_interiors',
      item_name_ar: 'أعمال البياض والمحارة الأسمنتية الداخلية وتأكيس الحوائط على البؤج والأوتار',
      item_name_en: 'Laser-Leveled Interior Cement Plastering & Rendering',
      supplier_contractor: 'شركة الفردوس المتخصصة للمحارة والتشطيبات',
      invoice_ref: `PLS-${baseYear + 1}-${1200 + propIndex}`,
      quantity: Math.round(area * 3.2),
      unit: 'م² مسطح',
      unit_cost_egp: '145.00',
      total_cost_egp: D(area).times(3.2).times(145).toFixed(2),
      logged_date: `${baseYear + 1}-02-28`,
      logged_by: 'م. فاروق النجار - مهندس الموقع',
      linked_account_code: '153000',
      status: 'verified',
      notes: 'استلام بالقدة وميزان المياه الليزري، عدم وجود أي تموجات'
    });

    allCosts.push({
      item_id: `cost-${propId}-13`,
      property_id: propId,
      category: 'finishing_interior',
      phase: 'finishing_interiors',
      item_name_ar: 'توريد وتركيب أرضيات رخام كرارة إيطالي للريسبشن وبورسلين إسباني لغرف النوم',
      item_name_en: 'Imported Italian Carrara Marble & Spanish Porcelain Flooring',
      supplier_contractor: 'مظلوم للرخام والبورسلين الفاخر',
      invoice_ref: `MRB-${baseYear + 1}-${1300 + propIndex}`,
      quantity: Math.round(area * 0.85),
      unit: 'م²',
      unit_cost_egp: '2150.00',
      total_cost_egp: D(area).times(0.85).times(2150).toFixed(2),
      logged_date: `${baseYear + 1}-04-15`,
      logged_by: 'م. إبراهيم كمال - مهندس التشطيبات',
      linked_account_code: '153000',
      status: 'capitalized',
      notes: 'جلي وتلميع بالكريستال الإيطالي وفواصل تمدد ستانلس ستيل'
    });

    allCosts.push({
      item_id: `cost-${propId}-14`,
      property_id: propId,
      category: 'finishing_interior',
      phase: 'finishing_interiors',
      item_name_ar: 'دهانات داخلية جوتن فينوماستيك والأسقف المعلقة جبسوم بورد كناوف مضاد للرطوبة',
      item_name_en: 'Jotun Fenomastic Paints & Knauf Moisture-Resistant Gypsum Ceilings',
      supplier_contractor: 'توكيل دهانات جوتن العالمية مصر',
      invoice_ref: `JOT-${baseYear + 1}-${1400 + propIndex}`,
      quantity: Math.round(area * 2.8),
      unit: 'م² مسطح',
      unit_cost_egp: '280.00',
      total_cost_egp: D(area).times(2.8).times(280).toFixed(2),
      logged_date: `${baseYear + 1}-05-30`,
      logged_by: 'م. إبراهيم كمال - مهندس التشطيبات',
      linked_account_code: '153000',
      status: 'verified',
      notes: 'تأسيس 3 سكاكين معجون جوتن و 2 وش دهان حريري ناعم قابل للغسيل'
    });

    allCosts.push({
      item_id: `cost-${propId}-15`,
      property_id: propId,
      category: 'site_facade',
      phase: 'finishing_interiors',
      item_name_ar: 'توريد وتركيب قطاعات ألوميتال جامبو عازل للصوت وزجاج دبل سيكوريت عاكس',
      item_name_en: 'Jumbo Acoustic Thermal Double-Glazed Aluminum Systems',
      supplier_contractor: 'المصرية الألمانية لصناعة الألومنيوم (EG-ALU)',
      invoice_ref: `ALU-${baseYear + 1}-${1500 + propIndex}`,
      quantity: Math.round(area * 0.35),
      unit: 'م²',
      unit_cost_egp: '5200.00',
      total_cost_egp: D(area).times(0.35).times(5200).toFixed(2),
      logged_date: `${baseYear + 1}-07-14`,
      logged_by: 'م. إبراهيم كمال - مهندس التشطيبات',
      linked_account_code: '153000',
      status: 'capitalized',
      notes: 'إكسسوارات إيطالية وسلك بليسيه مدمج مانع للأتربة والحشرات'
    });

    // 6. Final Handover & Audit
    allCosts.push({
      item_id: `cost-${propId}-16`,
      property_id: propId,
      category: 'labor_subcontractor',
      phase: 'final_inspection_handover',
      item_name_ar: 'أعمال التنظيف الكيميائي الشامل وضبط المعايرة وتجهيز شهادة المطابقة البيعية',
      item_name_en: 'Comprehensive Deep Cleaning, Calibration & Sales Readiness Audit',
      supplier_contractor: 'المكتب الفني الاستشاري لشركة زكريا فريد',
      invoice_ref: `AUD-FNL-${baseYear + 1}-${1600 + propIndex}`,
      quantity: 1,
      unit: 'شهادة تسليم واعتماد',
      unit_cost_egp: '65000.00',
      total_cost_egp: '65000.00',
      logged_date: `${baseYear + 1}-08-20`,
      logged_by: 'م. أحمد عبد العزيز - مدير المشروعات',
      linked_account_code: '153000',
      status: 'verified',
      notes: 'تم فحص جميع المفاتيح والمحابس والشبابيك والأسطح وجاهزية تامة للعرض والبيع'
    });
  });

  return allCosts;
}

/**
 * Calculates aggregated lifecycle metrics for a specific property.
 */
export function calculatePropertyAuditMetrics(
  propertyId: string,
  areaSqm: number,
  allCosts: ERPPropertyCostItem[]
) {
  const propertyCosts = allCosts.filter(c => c.property_id === propertyId);
  const area = areaSqm > 0 ? areaSqm : 1;

  let totalLogged = D(0);
  const byCategory: { [key in PropertyCostCategory]?: { total: string; count: number } } = {};
  const byPhase: { [key in PropertyLifecyclePhase]?: { total: string; count: number } } = {};

  propertyCosts.forEach(item => {
    const cost = D(item.total_cost_egp || 0);
    totalLogged = totalLogged.plus(cost);

    if (!byCategory[item.category]) {
      byCategory[item.category] = { total: '0.00', count: 0 };
    }
    byCategory[item.category]!.total = D(byCategory[item.category]!.total).plus(cost).toFixed(2);
    byCategory[item.category]!.count += 1;

    if (!byPhase[item.phase]) {
      byPhase[item.phase] = { total: '0.00', count: 0 };
    }
    byPhase[item.phase]!.total = D(byPhase[item.phase]!.total).plus(cost).toFixed(2);
    byPhase[item.phase]!.count += 1;
  });

  const costPerSqm = totalLogged.dividedBy(area).toFixed(2);

  return {
    propertyCosts,
    itemsCount: propertyCosts.length,
    totalLoggedCost: totalLogged.toFixed(2),
    costPerSqm,
    byCategory,
    byPhase
  };
}

/**
 * Calculates the Estimated Selling Price of an Already Built Property
 * Formula requested by user:
 *   Estimated Selling Price = Total Logged Incurred Costs + Target Profit Money
 * With benchmark comparison against Current Market Meter Price * Area.
 */
export interface BuiltPropertySellingPriceCalculation {
  totalLoggedCost: string;
  costPerSqm: string;
  builtUpAreaSqm: number;
  currentMarketMeterPrice: string;
  marketBenchmarkValue: string;
  targetProfitMoney: string;
  profitMarginOnCostPct: string;
  estimatedSellingPrice: string;
  estimatedSellingPricePerSqm: string;
  marketVariancePct: string;
  returnOnCostPct: string;
  grossMarginPct: string;
}

export function calculateBuiltPropertySellingPrice({
  totalLoggedCost,
  builtUpAreaSqm,
  currentMarketMeterPrice,
  profitMode,
  profitPercentage,
  profitFixedAmount
}: {
  totalLoggedCost: number | string;
  builtUpAreaSqm: number;
  currentMarketMeterPrice: number | string;
  profitMode: 'PERCENTAGE' | 'FIXED_AMOUNT';
  profitPercentage: number | string;
  profitFixedAmount: number | string;
}): BuiltPropertySellingPriceCalculation {
  const area = builtUpAreaSqm > 0 ? builtUpAreaSqm : 1;
  const cost = D(totalLoggedCost || 0);
  const costPerM2 = cost.dividedBy(area);
  const marketM2 = D(currentMarketMeterPrice || 0);
  const marketValue = marketM2.times(area);

  let profit = D(0);
  if (profitMode === 'PERCENTAGE') {
    const pct = D(profitPercentage || 0).dividedBy(100);
    profit = cost.times(pct);
  } else {
    profit = D(profitFixedAmount || 0);
  }

  const sellingPrice = cost.plus(profit);
  const sellingPricePerM2 = sellingPrice.dividedBy(area);

  const profitMarginOnCost = cost.isZero() ? D(0) : profit.dividedBy(cost).times(100);
  const grossMargin = sellingPrice.isZero() ? D(0) : profit.dividedBy(sellingPrice).times(100);
  
  const marketVariance = marketM2.isZero() 
    ? D(0) 
    : sellingPricePerM2.minus(marketM2).dividedBy(marketM2).times(100);

  return {
    totalLoggedCost: cost.toFixed(2),
    costPerSqm: costPerM2.toFixed(2),
    builtUpAreaSqm: area,
    currentMarketMeterPrice: marketM2.toFixed(2),
    marketBenchmarkValue: marketValue.toFixed(2),
    targetProfitMoney: profit.toFixed(2),
    profitMarginOnCostPct: profitMarginOnCost.toFixed(1),
    estimatedSellingPrice: sellingPrice.toFixed(2),
    estimatedSellingPricePerSqm: sellingPricePerM2.toFixed(2),
    marketVariancePct: marketVariance.toFixed(1),
    returnOnCostPct: profitMarginOnCost.toFixed(1),
    grossMarginPct: grossMargin.toFixed(1)
  };
}
