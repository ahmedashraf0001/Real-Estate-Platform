import { 
  ERPPropertyCostItem, 
  PropertyCostCategory, 
  PropertyLifecyclePhase,
  ERPPropertyCostAdjustment,
  ERPPayableInstallment,
  CostPaymentTerm
} from './types';
import { Property } from '@/lib/supabase/types';
import { D, Decimal, generateUUID } from './math';
import { toLocalDateStr } from './installmentsVaultProjection';

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
    color: '#c2410c',
    accountCode: '151000',
    badgeBg: 'rgba(194, 65, 12, 0.08)',
    badgeBorder: 'rgba(194, 65, 12, 0.22)'
  },
  {
    key: 'mep_infrastructure',
    nameAr: 'كهروميكانيك وتأسيسات',
    nameEn: 'MEP Infrastructure',
    color: '#1d4ed8',
    accountCode: '152000',
    badgeBg: 'rgba(29, 78, 216, 0.08)',
    badgeBorder: 'rgba(29, 78, 216, 0.22)'
  },
  {
    key: 'finishing_interior',
    nameAr: 'تشطيبات معمارية وديكور',
    nameEn: 'Finishing & Interiors',
    color: '#701a75',
    accountCode: '153000',
    badgeBg: 'rgba(112, 26, 117, 0.08)',
    badgeBorder: 'rgba(112, 26, 117, 0.22)'
  },
  {
    key: 'site_facade',
    nameAr: 'واجهات ومداخل ومصاعد',
    nameEn: 'Façade & Vertical Access',
    color: '#4338ca',
    accountCode: '153000',
    badgeBg: 'rgba(67, 56, 202, 0.08)',
    badgeBorder: 'rgba(67, 56, 202, 0.22)'
  },
  {
    key: 'permits_engineering',
    nameAr: 'تراخيص ومخططات واستشارات',
    nameEn: 'Permits & Engineering',
    color: '#946f23',
    accountCode: '150000',
    badgeBg: 'rgba(184, 144, 62, 0.08)',
    badgeBorder: 'rgba(184, 144, 62, 0.22)'
  },
  {
    key: 'taxes_fees',
    nameAr: 'ضرائب ورسوم إنشائية وحكومية',
    nameEn: 'Taxes, Levies & Fees',
    color: '#475569',
    accountCode: '150000',
    badgeBg: 'rgba(71, 85, 105, 0.08)',
    badgeBorder: 'rgba(71, 85, 105, 0.22)'
  },
  {
    key: 'land_allocation',
    nameAr: 'حصة الأرض المحملة',
    nameEn: 'Land Cost Allocation',
    color: '#92400e',
    accountCode: '150000',
    badgeBg: 'rgba(146, 64, 14, 0.08)',
    badgeBorder: 'rgba(146, 64, 14, 0.22)'
  },
  {
    key: 'labor_subcontractor',
    nameAr: 'مصنعيات ومقاول باطن',
    nameEn: 'Labor & Subcontractors',
    color: '#047857',
    accountCode: '151000',
    badgeBg: 'rgba(4, 120, 87, 0.08)',
    badgeBorder: 'rgba(4, 120, 87, 0.22)'
  }
];

export type ConstructionExpensePaymentSource = '101000' | '102000' | '201000';

export interface ConstructionExpenseJournalLine {
  account_code: string;
  debit_amount: string;
  credit_amount: string;
  memo: string;
}

export function getPropertyCostAccountCode(category: PropertyCostCategory): string {
  return PROPERTY_COST_CATEGORIES.find(meta => meta.key === category)?.accountCode || '151000';
}

/**
 * Builds balanced double-entry correction lines for cost-item edits, adjustments, and deletions.
 * Keeping the general ledger in exact alignment with the cost sub-ledger.
 */
export function buildCostCorrectionJournalLines(params: {
  category: PropertyCostCategory;
  delta: string | number;
  memo: string;
}): ConstructionExpenseJournalLine[] {
  const d = D(params.delta);
  if (d.isZero()) {
    return [];
  }

  const categoryAccount = getPropertyCostAccountCode(params.category);

  if (d.gt(0)) {
    const amt = d.toFixed(2);
    return [
      {
        account_code: categoryAccount,
        debit_amount: amt,
        credit_amount: '0.00',
        memo: params.memo
      },
      {
        account_code: '201000',
        debit_amount: '0.00',
        credit_amount: amt,
        memo: params.memo
      }
    ];
  }

  const absAmt = d.abs().toFixed(2);
  return [
    {
      account_code: '201000',
      debit_amount: absAmt,
      credit_amount: '0.00',
      memo: params.memo
    },
    {
      account_code: categoryAccount,
      debit_amount: '0.00',
      credit_amount: absAmt,
      memo: params.memo
    }
  ];
}

/**
 * Builds the balanced posting for a construction cost.
 *
 * Immediate cash/bank purchases credit the selected treasury account. Supplier
 * bills credit AP for the unpaid balance and, when present, credit the selected
 * treasury account for the down payment.
 */
export function buildConstructionExpenseJournalLines(params: {
  category: PropertyCostCategory;
  totalAmount: string | number;
  paymentSource: ConstructionExpensePaymentSource;
  downPayment?: string | number;
  downPaymentSource?: Exclude<ConstructionExpensePaymentSource, '201000'>;
  memo: string;
}): ConstructionExpenseJournalLine[] {
  const total = D(params.totalAmount);
  if (!total.gt(0)) {
    throw new Error('Construction expense total must be greater than zero.');
  }

  const debitAccount = getPropertyCostAccountCode(params.category);
  const totalAmount = total.toFixed(2);
  const lines: ConstructionExpenseJournalLine[] = [{
    account_code: debitAccount,
    debit_amount: totalAmount,
    credit_amount: '0.00',
    memo: params.memo
  }];

  if (params.paymentSource !== '201000') {
    lines.push({
      account_code: params.paymentSource,
      debit_amount: '0.00',
      credit_amount: totalAmount,
      memo: params.memo
    });
    return lines;
  }

  const downPayment = D(params.downPayment || 0);
  if (downPayment.lt(0) || downPayment.gt(total)) {
    throw new Error('Construction expense down payment must be between zero and the invoice total.');
  }

  if (downPayment.gt(0)) {
    lines.push({
      account_code: params.downPaymentSource || '101000',
      debit_amount: '0.00',
      credit_amount: downPayment.toFixed(2),
      memo: params.memo
    });
  }

  const payableBalance = total.minus(downPayment);
  if (payableBalance.gt(0)) {
    lines.push({
      account_code: '201000',
      debit_amount: '0.00',
      credit_amount: payableBalance.toFixed(2),
      memo: params.memo
    });
  }

  return lines;
}

export interface PhaseMeta {
  key: PropertyLifecyclePhase;
  order: number;
  nameAr: string;
  nameEn: string;
  shortAr: string;
  icon: string;
  color?: string;
  bgColor?: string;
  borderColor?: string;
}

export const PROPERTY_LIFECYCLE_PHASES: PhaseMeta[] = [
  {
    key: 'planning_permits',
    order: 1,
    nameAr: '1. التراخيص والمخططات والجسات',
    nameEn: '1. Planning, Permits & Surveys',
    shortAr: 'التراخيص والتخطيط',
    icon: '📋',
    color: '#1e40af',
    bgColor: 'rgba(30, 64, 175, 0.08)',
    borderColor: 'rgba(30, 64, 175, 0.25)'
  },
  {
    key: 'excavation_foundation',
    order: 2,
    nameAr: '2. الحفر والأساسات والعزل',
    nameEn: '2. Excavation & Foundations',
    shortAr: 'الأساسات والحفر',
    icon: '🏗️',
    color: '#b45309',
    bgColor: 'rgba(180, 83, 9, 0.08)',
    borderColor: 'rgba(180, 83, 9, 0.25)'
  },
  {
    key: 'structural_skeleton',
    order: 3,
    nameAr: '3. الهيكل الخرساني وحديد التسليح',
    nameEn: '3. Structural Skeleton & Rebar',
    shortAr: 'الهيكل والخرسانات',
    icon: '🏛️',
    color: '#c2410c',
    bgColor: 'rgba(194, 65, 12, 0.08)',
    borderColor: 'rgba(194, 65, 12, 0.25)'
  },
  {
    key: 'masonry_roughing',
    order: 4,
    nameAr: '4. المباني وتأسيس الكهروميكانيك',
    nameEn: '4. Masonry & Roughing MEP',
    shortAr: 'المباني والتأسيس',
    icon: '🧱',
    color: '#946f23',
    bgColor: 'rgba(184, 144, 62, 0.08)',
    borderColor: 'rgba(184, 144, 62, 0.25)'
  },
  {
    key: 'finishing_interiors',
    order: 5,
    nameAr: '5. التشطيبات المعمارية والكسوات',
    nameEn: '5. Architectural Finishing',
    shortAr: 'التشطيبات والديكور',
    icon: '🎨',
    color: '#701a75',
    bgColor: 'rgba(112, 26, 117, 0.08)',
    borderColor: 'rgba(112, 26, 117, 0.25)'
  },
  {
    key: 'final_inspection_handover',
    order: 6,
    nameAr: '6. المعاينة النهائية والجاهزية للبيع',
    nameEn: '6. Handover Audit & Ready to Sell',
    shortAr: 'الجاهزية للتسليم',
    icon: '✨',
    color: '#047857',
    bgColor: 'rgba(4, 120, 87, 0.08)',
    borderColor: 'rgba(4, 120, 87, 0.25)'
  }
];

/**
 * Generates an authentic Egyptian real estate construction lifecycle audit trail
 * for a list of properties, proportional to their actual built-up area and catalog specs.
 */
export function generateMockPropertyCosts(properties?: Property[]): ERPPropertyCostItem[] {
  const activeProps = properties || [];
  const allCosts: ERPPropertyCostItem[] = [];

  activeProps.forEach((prop, propIndex) => {
    const area = prop.area_sqm || 200;
    const propId = prop.id;

    // Dates staggered across 2024 - 2025 to create a chronological progression
    const yearOffset = propIndex % 2 === 0 ? 0 : 1;
    const baseYear = 2024 + yearOffset;

    // 0. Land Acquisition & Allocation (حصة وتكلفة الأرض المحملة)
    const landRatePerSqm = propIndex === 0 ? 5500 : (4500 + ((propIndex * 400) % 2500));
    const landTotal = D(area).times(landRatePerSqm).toFixed(2);
    allCosts.push({
      item_id: `cost-${propId}-00`,
      id: `cost-${propId}-00`,
      property_id: propId,
      category: 'land_allocation',
      phase: 'planning_permits',
      item_name_ar: 'تخصيص وشراء أرض المشروع ورسوم جهاز المدينة والمساحة',
      item_name_en: 'Land Plot Acquisition & Allocation',
      supplier_contractor: 'هيئة المجتمعات العمرانية وجهاز المدينة',
      invoice_ref: `LND-${baseYear - 1}-${100 + propIndex}`,
      quantity: area,
      unit: 'م²',
      unit_cost_egp: landRatePerSqm.toFixed(2),
      total_cost_egp: landTotal,
      logged_date: `${baseYear - 1}-10-15`,
      logged_by: 'م. زكريا فريد - المطور العقاري',
      linked_account_code: '150000',
      status: 'verified',
      payment_term: 'FULL_CASH',
      paid_amount_egp: landTotal,
      remaining_amount_egp: '0.00',
      net_effective_cost_egp: landTotal,
      notes: 'تم سداد ثمن قطعة الأرض ورسوم التخصيص واستلام محضر الاستلام الرسمي المعتمد'
    });

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

    // 1.b Statutory Taxes, Contractor Social Insurance & Municipal Charges
    allCosts.push({
      item_id: `cost-${propId}-02b`,
      property_id: propId,
      category: 'taxes_fees',
      phase: 'planning_permits',
      item_name_ar: 'تأمينات مقاولات وعمالة البناء الإلزامية وصندوق العاملين بالتشييد',
      item_name_en: 'Mandatory Contractor Social Insurance & Construction Labor Fund',
      supplier_contractor: 'الهيئة القومية للتأمين الاجتماعي - مكتب مقاولات البناء',
      invoice_ref: `INS-${baseYear}-${150 + propIndex}`,
      quantity: 1,
      unit: 'شهادة تأمينية',
      unit_cost_egp: D(area).times(280).toFixed(2),
      total_cost_egp: D(area).times(280).toFixed(2),
      logged_date: `${baseYear}-03-18`,
      logged_by: 'م. أحمد عبد العزيز - مدير المشروعات',
      linked_account_code: '150000',
      status: 'verified',
      notes: 'تم سداد تأمينات عمالة البناء واستخراج شهادة السداد الرسمية لملف الترخيص'
    });

    allCosts.push({
      item_id: `cost-${propId}-02c`,
      property_id: propId,
      category: 'taxes_fees',
      phase: 'planning_permits',
      item_name_ar: 'رسوم جهاز المدينة وتصاريح إشغال الطريق وتوصيل مرافق المياه والكهرباء الإنشائية',
      item_name_en: 'City Council Fees, Temporary Street Occupancy & Site Utility Meters',
      supplier_contractor: 'مجلس المدينة والإدارة الهندسية وشركات المرافق',
      invoice_ref: `MUN-${baseYear}-${180 + propIndex}`,
      quantity: 1,
      unit: 'إيصال مرافق وتصريح',
      unit_cost_egp: D(area).times(210).toFixed(2),
      total_cost_egp: D(area).times(210).toFixed(2),
      logged_date: `${baseYear}-03-25`,
      logged_by: 'م. أحمد عبد العزيز - مدير المشروعات',
      linked_account_code: '150000',
      status: 'verified',
      notes: 'رسوم إشغال طريق مؤقت لمعدات الحفر وعداد مياه وكهرباء موقع إنشائي'
    });

    // 2. Excavation & Foundations
    const excavationVol = Math.round(area * 3.5);
    const excTotal = propIndex === 0 ? '7890000.00' : D(excavationVol).times(165).toFixed(2);
    const excPaid = propIndex === 0 ? '0.00' : excTotal;
    const excRem = propIndex === 0 ? '7890000.00' : '0.00';
    allCosts.push({
      item_id: `cost-${propId}-03`,
      property_id: propId,
      category: 'civil_structure',
      phase: 'excavation_foundation',
      item_name_ar: 'أعمال الحفر الميكانيكي وسند جوانب الحفر والتطهير ونقل المخلفات',
      item_name_en: 'Mechanical Excavation, Shoring & Site Earthworks',
      supplier_contractor: 'شركة النيل للمقاولات',
      invoice_ref: propIndex === 0 ? 'INV-2025-031' : `EXC-${baseYear}-${300 + propIndex}`,
      quantity: excavationVol,
      unit: 'م³',
      unit_cost_egp: '165.00',
      total_cost_egp: excTotal,
      paid_amount_egp: excPaid,
      remaining_amount_egp: excRem,
      payment_term: propIndex === 0 ? 'FULL_DEFERRED' : 'FULL_CASH',
      due_date: propIndex === 0 ? '2025-03-20' : `${baseYear}-04-10`,
      payable_installments: propIndex === 0 ? [
        {
          installment_id: `inst-${propId}-03-1`,
          cost_item_id: `cost-${propId}-03`,
          installment_number: 1,
          title_ar: 'مستخلص أعمال الحفر وسند الجوانب الختامي',
          due_date: '2025-03-20',
          amount_egp: '7890000.00',
          paid_amount_egp: '0.00',
          status: 'OVERDUE',
          notes: 'مستخلص معتمد قيد تدبير السيولة'
        }
      ] : undefined,
      logged_date: `${baseYear}-04-10`,
      logged_by: 'م. فاروق النجار - مهندس الموقع',
      linked_account_code: propIndex === 0 ? '201000' : '151000',
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
    const con7Total = propIndex === 0 ? '6750000.00' : D(skeletonConcreteVol).times(1750).toFixed(2);
    const con7Paid = propIndex === 0 ? '2750000.00' : con7Total;
    const con7Rem = propIndex === 0 ? '4000000.00' : '0.00';
    allCosts.push({
      item_id: `cost-${propId}-07`,
      property_id: propId,
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'توريد وصب خرسانة جاهزة رتبة C35 للأعمدة والحوائط والأسقف والكمرات',
      item_name_en: 'Ready-Mix Concrete C35 Pouring for Columns & Slabs',
      supplier_contractor: 'شركة النيل للمقاولات',
      invoice_ref: propIndex === 0 ? 'INV-2025-014' : `LAF-${baseYear}-${700 + propIndex}`,
      quantity: skeletonConcreteVol,
      unit: 'م³',
      unit_cost_egp: '1750.00',
      total_cost_egp: con7Total,
      paid_amount_egp: con7Paid,
      remaining_amount_egp: con7Rem,
      payment_term: propIndex === 0 ? 'DOWN_PAYMENT_INSTALLMENTS' : 'FULL_CASH',
      due_date: propIndex === 0 ? '2025-03-08' : `${baseYear}-08-30`,
      payable_installments: propIndex === 0 ? [
        {
          installment_id: `inst-${propId}-07-1`,
          cost_item_id: `cost-${propId}-07`,
          installment_number: 1,
          title_ar: 'دفعة مقدمة توريد الخرسانة',
          due_date: '2025-02-01',
          amount_egp: '2750000.00',
          paid_amount_egp: '2750000.00',
          status: 'PAID',
          payment_date: '2025-02-01'
        },
        {
          installment_id: `inst-${propId}-07-2`,
          cost_item_id: `cost-${propId}-07`,
          installment_number: 2,
          title_ar: 'مستخلص صب خرسانة السقف الرابع',
          due_date: '2025-03-08',
          amount_egp: '4000000.00',
          paid_amount_egp: '0.00',
          status: 'OVERDUE',
          notes: 'مستحق السداد لشركة النيل'
        }
      ] : undefined,
      logged_date: `${baseYear}-08-30`,
      logged_by: 'م. فاروق النجار - مهندس الموقع',
      linked_account_code: propIndex === 0 ? '201000' : '151000',
      status: 'capitalized',
      notes: 'صب الأسقف بنظام البمب الهيدروليكي والمعالجة بالمياه لمدة 10 أيام'
    });

    const labTotal = propIndex === 2 ? '4670000.00' : D(area).times(820).toFixed(2);
    const labPaid = propIndex === 2 ? '1670000.00' : labTotal;
    const labRem = propIndex === 2 ? '3000000.00' : '0.00';
    allCosts.push({
      item_id: `cost-${propId}-08`,
      property_id: propId,
      category: 'labor_subcontractor',
      phase: 'structural_skeleton',
      item_name_ar: 'مصنعيات مقاولة النجارة المسلحة والحدادة وتجهيز الفورم الإنشائية',
      item_name_en: 'Formwork Carpentry & Blacksmithing Structural Labor',
      supplier_contractor: 'البركة للمقاولات',
      invoice_ref: propIndex === 2 ? 'INV-2025-033' : `LAB-STR-${baseYear}-${800 + propIndex}`,
      quantity: area,
      unit: 'م² مسطح',
      unit_cost_egp: '820.00',
      total_cost_egp: labTotal,
      paid_amount_egp: labPaid,
      remaining_amount_egp: labRem,
      payment_term: propIndex === 2 ? 'DOWN_PAYMENT_INSTALLMENTS' : 'FULL_CASH',
      due_date: propIndex === 2 ? '2025-03-22' : `${baseYear}-09-25`,
      payable_installments: propIndex === 2 ? [
        {
          installment_id: `inst-${propId}-08-1`,
          cost_item_id: `cost-${propId}-08`,
          installment_number: 1,
          title_ar: 'دفعة تحضيرية لمقاول النجارة',
          due_date: '2025-02-15',
          amount_egp: '1670000.00',
          paid_amount_egp: '1670000.00',
          status: 'PAID',
          payment_date: '2025-02-15'
        },
        {
          installment_id: `inst-${propId}-08-2`,
          cost_item_id: `cost-${propId}-08`,
          installment_number: 2,
          title_ar: 'مستخلص الأعمال المنفذة للهيكل',
          due_date: '2025-03-22',
          amount_egp: '3000000.00',
          paid_amount_egp: '0.00',
          status: 'PENDING',
          notes: 'قيد المراجعة الفنية'
        }
      ] : undefined,
      logged_date: `${baseYear}-09-25`,
      logged_by: 'م. أحمد عبد العزيز - مدير المشروعات',
      linked_account_code: propIndex === 2 ? '201000' : '151000',
      status: propIndex === 2 ? 'pending_audit' : 'verified',
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

    const elcTotal = propIndex === 1 ? '4320000.00' : D(area).times(1.6).times(380).toFixed(2);
    const elcPaid = elcTotal;
    const elcRem = '0.00';
    allCosts.push({
      item_id: `cost-${propId}-10`,
      property_id: propId,
      category: 'mep_infrastructure',
      phase: 'masonry_roughing',
      item_name_ar: 'تأسيس شبكة الكهرباء والمواسير والعلب وكابلات السويدي النحاسية الأصلية',
      item_name_en: 'El Sewedy Certified Electrical Conduits & Copper Cabling',
      supplier_contractor: 'البركة للمقاولات',
      invoice_ref: propIndex === 1 ? 'INV-2025-017' : `ELC-${baseYear}-${1000 + propIndex}`,
      quantity: Math.round(area * 1.6),
      unit: 'متر طولي',
      unit_cost_egp: '380.00',
      total_cost_egp: elcTotal,
      paid_amount_egp: elcPaid,
      remaining_amount_egp: elcRem,
      payment_term: 'FULL_CASH',
      due_date: propIndex === 1 ? '2025-03-10' : `${baseYear}-12-12`,
      payable_installments: propIndex === 1 ? [
        {
          installment_id: `inst-${propId}-10-1`,
          cost_item_id: `cost-${propId}-10`,
          installment_number: 1,
          title_ar: 'سداد كامل مستخلص شبكة الكهرباء',
          due_date: '2025-03-10',
          amount_egp: '4320000.00',
          paid_amount_egp: '4320000.00',
          status: 'PAID',
          payment_date: '2025-03-10'
        }
      ] : undefined,
      logged_date: `${baseYear}-12-12`,
      logged_by: 'م. شريف مدحت - مهندس كهروميكانيك',
      linked_account_code: '152000',
      status: 'verified',
      notes: 'تأريض معتمد ولوحات شنايدر إلكتريك وقواطع حماية تفاضلية'
    });

    const plmTotal = propIndex === 0 ? '8910000.00' : propIndex === 1 ? '5120000.00' : D(area).times(420).toFixed(2);
    const plmPaid = propIndex === 0 ? '5000000.00' : '0.00';
    const plmRem = propIndex === 0 ? '3910000.00' : (propIndex === 1 ? '5120000.00' : '0.00');
    allCosts.push({
      item_id: `cost-${propId}-11`,
      property_id: propId,
      category: 'mep_infrastructure',
      phase: 'masonry_roughing',
      item_name_ar: 'تأسيس شبكة التغذية المائية والصرف الصحي ومواسير البولي بروبلين المقاومة',
      item_name_en: 'PPR Water Supply & Sound-Insulated Drainage Networks',
      supplier_contractor: 'المنار للمقاولات',
      invoice_ref: propIndex === 0 ? 'INV-2025-021' : propIndex === 1 ? 'INV-2025-036' : `PLM-${baseYear}-${1100 + propIndex}`,
      quantity: 1,
      unit: 'شبكة كاملة',
      unit_cost_egp: plmTotal,
      total_cost_egp: plmTotal,
      paid_amount_egp: plmPaid,
      remaining_amount_egp: plmRem,
      payment_term: propIndex === 0 ? 'DOWN_PAYMENT_INSTALLMENTS' : propIndex === 1 ? 'FULL_DEFERRED' : 'FULL_CASH',
      due_date: propIndex === 0 ? '2025-03-12' : propIndex === 1 ? '2025-03-25' : `${baseYear + 1}-01-18`,
      payable_installments: propIndex === 0 ? [
        {
          installment_id: `inst-${propId}-11-1`,
          cost_item_id: `cost-${propId}-11`,
          installment_number: 1,
          title_ar: 'دفعة توريد شبكة المواسير والمحابس',
          due_date: '2025-02-10',
          amount_egp: '5000000.00',
          paid_amount_egp: '5000000.00',
          status: 'PAID',
          payment_date: '2025-02-10'
        },
        {
          installment_id: `inst-${propId}-11-2`,
          cost_item_id: `cost-${propId}-11`,
          installment_number: 2,
          title_ar: 'مستخلص تجارب الضغط والتسليم النهائي',
          due_date: '2025-03-12',
          amount_egp: '3910000.00',
          paid_amount_egp: '0.00',
          status: 'PENDING',
          notes: 'قيد المراجعة الفنية'
        }
      ] : propIndex === 1 ? [
        {
          installment_id: `inst-${propId}-11-3`,
          cost_item_id: `cost-${propId}-11`,
          installment_number: 1,
          title_ar: 'مستخلص أعمال الكهروميكانيك المؤجل',
          due_date: '2025-03-25',
          amount_egp: '5120000.00',
          paid_amount_egp: '0.00',
          status: 'PENDING',
          notes: 'مستخلص معلق'
        }
      ] : undefined,
      logged_date: `${baseYear + 1}-01-18`,
      logged_by: 'م. شريف مدحت - مهندس كهروميكانيك',
      linked_account_code: (propIndex === 0 || propIndex === 1) ? '201000' : '152000',
      status: (propIndex === 0 || propIndex === 1) ? 'pending_audit' : 'verified',
      notes: 'تم إجراء اختبار الضغط المائي 15 بار لمدة 24 ساعة وتسليم شهادة الضمان'
    });

    // 5. Architectural Finishing & Interiors
    const plsTotal = propIndex === 2 ? '5670000.00' : D(area).times(3.2).times(145).toFixed(2);
    const plsPaid = propIndex === 2 ? '0.00' : plsTotal;
    const plsRem = propIndex === 2 ? '5670000.00' : '0.00';
    allCosts.push({
      item_id: `cost-${propId}-12`,
      property_id: propId,
      category: 'finishing_interior',
      phase: 'finishing_interiors',
      item_name_ar: 'أعمال البياض والمحارة الأسمنتية الداخلية وتأكيس الحوائط على البؤج والأوتار',
      item_name_en: 'Laser-Leveled Interior Cement Plastering & Rendering',
      supplier_contractor: 'الأفق للمقاولات',
      invoice_ref: propIndex === 2 ? 'INV-2025-024' : `PLS-${baseYear + 1}-${1200 + propIndex}`,
      quantity: Math.round(area * 3.2),
      unit: 'م² مسطح',
      unit_cost_egp: '145.00',
      total_cost_egp: plsTotal,
      paid_amount_egp: plsPaid,
      remaining_amount_egp: plsRem,
      payment_term: propIndex === 2 ? 'FULL_DEFERRED' : 'FULL_CASH',
      due_date: propIndex === 2 ? '2025-03-15' : `${baseYear + 1}-02-28`,
      payable_installments: propIndex === 2 ? [
        {
          installment_id: `inst-${propId}-12-1`,
          cost_item_id: `cost-${propId}-12`,
          installment_number: 1,
          title_ar: 'مستخلص المحارة الداخلية المؤجل',
          due_date: '2025-03-15',
          amount_egp: '5670000.00',
          paid_amount_egp: '0.00',
          status: 'PENDING',
          notes: 'مستخلص معلق'
        }
      ] : undefined,
      logged_date: `${baseYear + 1}-02-28`,
      logged_by: 'م. فاروق النجار - مهندس الموقع',
      linked_account_code: propIndex === 2 ? '201000' : '153000',
      status: propIndex === 2 ? 'pending_audit' : 'verified',
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

    const aluTotal = propIndex === 1 ? '3240000.00' : D(area).times(0.35).times(5200).toFixed(2);
    const aluPaid = propIndex === 1 ? '1000000.00' : aluTotal;
    const aluRem = propIndex === 1 ? '2240000.00' : '0.00';
    allCosts.push({
      item_id: `cost-${propId}-15`,
      property_id: propId,
      category: 'site_facade',
      phase: 'finishing_interiors',
      item_name_ar: 'توريد وتركيب قطاعات ألوميتال جامبو عازل للصوت وزجاج دبل سيكوريت عاكس ولاندسكيب',
      item_name_en: 'Jumbo Acoustic Thermal Double-Glazed Aluminum Systems & Site Works',
      supplier_contractor: 'الصفا للمقاولات',
      invoice_ref: propIndex === 1 ? 'INV-2025-028' : `ALU-${baseYear + 1}-${1500 + propIndex}`,
      quantity: Math.round(area * 0.35),
      unit: 'م²',
      unit_cost_egp: '5200.00',
      total_cost_egp: aluTotal,
      paid_amount_egp: aluPaid,
      remaining_amount_egp: aluRem,
      payment_term: propIndex === 1 ? 'DOWN_PAYMENT_INSTALLMENTS' : 'FULL_CASH',
      due_date: propIndex === 1 ? '2025-03-18' : `${baseYear + 1}-07-14`,
      payable_installments: propIndex === 1 ? [
        {
          installment_id: `inst-${propId}-15-1`,
          cost_item_id: `cost-${propId}-15`,
          installment_number: 1,
          title_ar: 'دفعة مقدمة تشغيل قطاعات الألوميتال واللاندسكيب',
          due_date: '2025-02-15',
          amount_egp: '1000000.00',
          paid_amount_egp: '1000000.00',
          status: 'PAID',
          payment_date: '2025-02-15'
        },
        {
          installment_id: `inst-${propId}-15-2`,
          cost_item_id: `cost-${propId}-15`,
          installment_number: 2,
          title_ar: 'مستخلص تركيب الواجهات والأعمال الخارجية',
          due_date: '2025-03-18',
          amount_egp: '2240000.00',
          paid_amount_egp: '0.00',
          status: 'PENDING',
          notes: 'جاري السداد والتدقيق'
        }
      ] : undefined,
      logged_date: `${baseYear + 1}-07-14`,
      logged_by: 'م. إبراهيم كمال - مهندس التشطيبات',
      linked_account_code: propIndex === 1 ? '201000' : '153000',
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

  return allCosts.map(c => {
    const total = c.total_cost_egp;
    return {
      ...c,
      created_at: c.created_at || `${c.logged_date}T10:00:00.000Z`,
      payment_term: c.payment_term || 'FULL_CASH',
      paid_amount_egp: c.paid_amount_egp !== undefined ? c.paid_amount_egp : total,
      remaining_amount_egp: c.remaining_amount_egp !== undefined ? c.remaining_amount_egp : '0.00',
      net_effective_cost_egp: c.net_effective_cost_egp || total,
      adjustments: c.adjustments || []
    };
  });
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
    // Net of refunds/supplements (user-confirmed 2026-10-07): same basis as construction WIP.
    const cost = D(calculateCostItemEffectiveTotals(item).netEffectiveCost);
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

  const profitMarginOnCost = cost.isZero() ? D(0) : profit.times(100).dividedBy(cost);
  const grossMargin = sellingPrice.isZero() ? D(0) : profit.times(100).dividedBy(sellingPrice);
  
  const marketVariance = marketM2.isZero() 
    ? D(0) 
    : sellingPricePerM2.minus(marketM2).times(100).dividedBy(marketM2);

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

// ============================================================================
// 24-Hour Edit Grace Period & Accounting Immutability Guard
// ============================================================================

/**
 * Checks whether a cost item or partner transaction is within the 24-hour edit window.
 */
export function isItemWithinGracePeriod(createdAt?: string, graceHours: number = 24): boolean {
  if (!createdAt) return true; // If missing timestamp, allow initial modification
  try {
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return true;
    const elapsedMs = Date.now() - createdTime;
    return elapsedMs >= 0 && elapsedMs <= graceHours * 3600 * 1000;
  } catch {
    return false;
  }
}

/**
 * Returns remaining grace period hours (e.g. 14.2 hours). Returns 0 if expired.
 */
export function getRemainingGraceHours(createdAt?: string, graceHours: number = 24): number {
  if (!createdAt) return graceHours;
  try {
    const createdTime = new Date(createdAt).getTime();
    if (isNaN(createdTime)) return 0;
    const elapsedMs = Date.now() - createdTime;
    const remainingMs = (graceHours * 3600 * 1000) - elapsedMs;
    if (remainingMs <= 0) return 0;
    return Math.round((remainingMs / (3600 * 1000)) * 10) / 10;
  } catch {
    return 0;
  }
}

// ============================================================================
// Sub-Items & Cost Adjustments Calculator (استردادات وملاحق السداد)
// ============================================================================

export interface CostItemEffectiveTotals {
  baseCost: string;
  totalRefunds: string;
  totalSupplements: string;
  netAdjustments: string;
  netEffectiveCost: string;
  paidAmount: string;
  remainingAmount: string;
  isFullyPaid: boolean;
  isPartiallyPaid: boolean;
  isUnpaid: boolean;
}

/**
 * Calculates net effective cost and payment status including all sub-item adjustments.
 */
export function calculateCostItemEffectiveTotals(item: ERPPropertyCostItem): CostItemEffectiveTotals {
  const baseCost = D(item.total_cost_egp || item.total_amount || 0);
  
  let totalRefunds = D(0);
  let totalSupplements = D(0);

  if (item.adjustments && item.adjustments.length > 0) {
    for (const adj of item.adjustments) {
      const amt = D(adj.amount_egp || 0).abs();
      if (adj.adjustment_type === 'REFUND_OVERPAYMENT') {
        totalRefunds = totalRefunds.plus(amt);
      } else if (adj.adjustment_type === 'SUPPLEMENT_UNDERPAYMENT') {
        totalSupplements = totalSupplements.plus(amt);
      }
    }
  }

  const netAdjustments = totalSupplements.minus(totalRefunds);
  const netEffectiveCost = Decimal.max(0, baseCost.plus(netAdjustments));

  // Determine paid amount
  let paidAmount = D(0);
  if (item.payable_installments && item.payable_installments.length > 0) {
    paidAmount = item.payable_installments.reduce((acc, inst) => acc.plus(inst.paid_amount_egp || 0), D(0));
  } else if (item.paid_amount_egp !== undefined) {
    paidAmount = D(item.paid_amount_egp || 0);
  } else if (item.payment_term === 'FULL_CASH' || !item.payment_term) {
    paidAmount = netEffectiveCost; // Spot cash is fully paid by default
  }

  const remainingAmount = Decimal.max(0, netEffectiveCost.minus(paidAmount));

  return {
    baseCost: baseCost.toFixed(2),
    totalRefunds: totalRefunds.toFixed(2),
    totalSupplements: totalSupplements.toFixed(2),
    netAdjustments: netAdjustments.toFixed(2),
    netEffectiveCost: netEffectiveCost.toFixed(2),
    paidAmount: paidAmount.toFixed(2),
    remainingAmount: remainingAmount.toFixed(2),
    isFullyPaid: remainingAmount.isZero(),
    isPartiallyPaid: paidAmount.gt(0) && remainingAmount.gt(0),
    isUnpaid: paidAmount.isZero() && remainingAmount.gt(0)
  };
}

/**
 * Appends an adjustment sub-item to a cost item and returns the updated item.
 */
export function addCostAdjustment(
  item: ERPPropertyCostItem,
  adjustment: Omit<ERPPropertyCostAdjustment, 'adjustment_id' | 'created_at'>
): ERPPropertyCostItem {
  const newAdjustment: ERPPropertyCostAdjustment = {
    ...adjustment,
    adjustment_id: generateUUID(),
    created_at: new Date().toISOString()
  };

  const existingAdjustments = item.adjustments || [];
  const updatedAdjustments = [...existingAdjustments, newAdjustment];

  const updatedItem: ERPPropertyCostItem = {
    ...item,
    adjustments: updatedAdjustments
  };

  const totals = calculateCostItemEffectiveTotals(updatedItem);
  updatedItem.net_effective_cost_egp = totals.netEffectiveCost;
  updatedItem.remaining_amount_egp = totals.remainingAmount;
  updatedItem.paid_amount_egp = totals.paidAmount;

  return updatedItem;
}

// ============================================================================
// Cost Payables & Installment Structuring (جدولة التزامات وأقساط البناء)
// ============================================================================

/**
 * Generates an installment payment schedule for a project cost item.
 */
export function generatePayableInstallmentSchedule(params: {
  costItemId: string;
  totalAmount: string | number;
  downPayment: string | number;
  numberOfInstallments: number;
  firstDueDate: string;
  frequencyMonths?: number;
}): ERPPayableInstallment[] {
  const {
    costItemId,
    totalAmount,
    downPayment,
    numberOfInstallments,
    firstDueDate,
    frequencyMonths = 1
  } = params;

  const total = D(totalAmount);
  const dp = Decimal.min(total, D(downPayment));
  const remaining = total.minus(dp);

  const installments: ERPPayableInstallment[] = [];
  let seq = 1;

  // Down Payment tranche if > 0
  if (dp.gt(0)) {
    installments.push({
      installment_id: generateUUID(),
      cost_item_id: costItemId,
      installment_number: 0,
      title_ar: 'الدفعة المقدمة الإنشائية',
      title_en: 'Construction Advance Payment',
      due_date: toLocalDateStr(new Date()),
      amount_egp: dp.toFixed(2),
      paid_amount_egp: dp.toFixed(2), // Down payment is considered paid at contract
      status: 'PAID',
      payment_date: toLocalDateStr(new Date())
    });
  }

  if (numberOfInstallments > 0 && remaining.gt(0)) {
    const baseInstallment = remaining.dividedBy(numberOfInstallments);
    let accumulated = D(0);

    const [startYear, startMonth, startDay] = firstDueDate.split('-').map(Number);

    for (let i = 0; i < numberOfInstallments; i++) {
      const isLast = i === numberOfInstallments - 1;
      const instAmount = isLast ? remaining.minus(accumulated) : baseInstallment;
      accumulated = accumulated.plus(instAmount);

      const targetMonth = (startMonth - 1) + (i * frequencyMonths);
      const dueDateObj = new Date(startYear, targetMonth, startDay || 1);
      const dueDateStr = toLocalDateStr(dueDateObj);

      installments.push({
        installment_id: generateUUID(),
        cost_item_id: costItemId,
        installment_number: seq++,
        title_ar: `القسط الإنشائي رقم ${i + 1}`,
        title_en: `Construction Tranche #${i + 1}`,
        due_date: dueDateStr,
        amount_egp: instAmount.toFixed(2),
        paid_amount_egp: '0.00',
        status: 'PENDING'
      });
    }
  }

  return installments;
}

/**
 * Records full or partial payment against a specific payable installment.
 * Fix 2: Settlement Modal Protection Against Silent Data Loss:
 * - If an invoice has no existing payable_installments or the target installment ID is not found,
 *   instantiates the payment tranche with the paid amount, status 'PAID', and payment details.
 * - Preserves any historical paid amounts (such as down payments) not represented in installments.
 * - Recalculates paid_amount_egp and remaining_amount_egp accurately.
 */
export function recordPayableInstallmentPayment(
  item: ERPPropertyCostItem,
  installmentId: string,
  amountPaid: string | number,
  paymentMethod?: 'CASH_101000' | 'INSTAPAY_101000' | 'INSTAPAY_102000' | 'BANK_102000',
  paymentDate?: string,
  notes?: string,
  meta?: Partial<ERPPayableInstallment>
): ERPPropertyCostItem {
  const pDate = paymentDate || new Date().toISOString().split('T')[0];
  const paidDelta = D(amountPaid);

  if (paidDelta.lte(0)) return item;

  let existingInstallments = [...(item.payable_installments || [])];

  // Safeguard: Preserve any existing paid_amount_egp on the invoice that isn't represented in installments
  const priorPaid = D(item.paid_amount_egp || 0);
  const existingPaidSum = existingInstallments.reduce((acc, inst) => acc.plus(inst.paid_amount_egp || 0), D(0));
  if (priorPaid.gt(existingPaidSum)) {
    const unrepresentedPaid = priorPaid.minus(existingPaidSum);
    const priorTranche: ERPPayableInstallment = {
      installment_id: `inst-prior-${item.item_id || Date.now()}`,
      cost_item_id: item.item_id || 'unknown',
      installment_number: 0,
      title_ar: 'الدفعة المسددة مسبقاً',
      title_en: 'Prior Settled Payment',
      due_date: item.logged_date || pDate,
      amount_egp: unrepresentedPaid.toFixed(2),
      paid_amount_egp: unrepresentedPaid.toFixed(2),
      status: 'PAID',
      payment_date: item.logged_date || pDate,
      payment_method: (item.linked_account_code === '102000' ? 'BANK_102000' : 'CASH_101000') as any
    };
    existingInstallments = [priorTranche, ...existingInstallments];
  }

  const installmentIndex = existingInstallments.findIndex(inst => inst.installment_id === installmentId);

  let updatedInstallments: ERPPayableInstallment[];

  if (installmentIndex >= 0) {
    updatedInstallments = existingInstallments.map((inst, idx) => {
      if (idx !== installmentIndex) return inst;

      const currentPaid = D(inst.paid_amount_egp || 0);
      const newPaid = currentPaid.plus(paidDelta);
      const instTotal = D(inst.amount_egp);
      const newStatus: ERPPayableInstallment['status'] = newPaid.gte(instTotal)
        ? 'PAID'
        : 'PARTIALLY_PAID';

      return {
        ...inst,
        paid_amount_egp: newPaid.toFixed(2),
        status: newStatus,
        payment_date: pDate,
        payment_method: paymentMethod || inst.payment_method || 'CASH_101000',
        notes: notes?.trim() || inst.notes,
        payment_id: meta?.payment_id,
        treasury_account_code: meta?.treasury_account_code
      };
    });
  } else {
    // Fallback: If target installment is not found or array was empty,
    // instantiate the payment tranche with paid amount, status 'PAID', and payment details
    const paidAmountStr = paidDelta.toFixed(2);
    const trancheTotal = meta?.amount_egp && D(meta.amount_egp).gte(paidDelta)
      ? D(meta.amount_egp).toFixed(2)
      : paidAmountStr;
    const trancheStatus: ERPPayableInstallment['status'] = D(paidAmountStr).gte(trancheTotal) ? 'PAID' : 'PARTIALLY_PAID';

    const newTranche: ERPPayableInstallment = {
      installment_id: installmentId || generateUUID(),
      cost_item_id: item.item_id || meta?.cost_item_id || 'unknown',
      installment_number: existingInstallments.length + 1,
      title_ar: meta?.title_ar || 'دفعة سداد مستحقات',
      title_en: meta?.title_en || 'Payment Tranche',
      due_date: meta?.due_date || pDate,
      amount_egp: trancheTotal,
      paid_amount_egp: paidAmountStr,
      status: trancheStatus,
      payment_date: pDate,
      payment_method: paymentMethod || 'CASH_101000',
      notes: notes?.trim() || meta?.notes,
      payment_id: meta?.payment_id,
      treasury_account_code: meta?.treasury_account_code
    };
    updatedInstallments = [...existingInstallments, newTranche];
  }

  const updatedItem: ERPPropertyCostItem = {
    ...item,
    payable_installments: updatedInstallments
  };

  const totals = calculateCostItemEffectiveTotals(updatedItem);
  updatedItem.paid_amount_egp = totals.paidAmount;
  updatedItem.remaining_amount_egp = totals.remainingAmount;
  updatedItem.updated_at = new Date().toISOString();

  return updatedItem;
}

/**
 * Fix 1: Creates a direct construction expense with smart cash/bank logic.
 * When payment source is Cash (101000) or Bank (102000):
 * - paymentTerm = 'FULL_CASH'
 * - dpAmount = totalNum.toFixed(2)
 * - payableInstallments = []
 * - paid_amount_egp = dpAmount (100% paid upon creation)
 * - remaining_amount_egp = '0.00'
 */
export function createDirectConstructionExpense(params: {
  propertyId: string;
  category: PropertyCostCategory;
  phase: PropertyLifecyclePhase;
  itemName: string;
  supplier?: string;
  invoiceRef?: string;
  totalAmount: number | string;
  paymentSource: '101000' | '102000' | '201000';
  scheduleNow?: boolean;
  downPayment?: number | string;
  numberOfInstallments?: number;
  firstDueDate?: string;
  frequencyMonths?: number;
  quantity?: number;
  unit?: string;
  notes?: string;
  loggedDate?: string;
  loggedBy?: string;
}): ERPPropertyCostItem {
  const {
    propertyId,
    category,
    phase,
    itemName,
    supplier,
    invoiceRef,
    totalAmount,
    paymentSource,
    scheduleNow = false,
    downPayment = 0,
    numberOfInstallments = 3,
    firstDueDate,
    frequencyMonths = 1,
    quantity = 1,
    unit = 'مقطوعية',
    notes,
    loggedDate = new Date().toISOString().split('T')[0],
    loggedBy = 'CFO_FARID'
  } = params;

  const totalNum = D(totalAmount);
  const costId = generateUUID();
  let paymentTerm: CostPaymentTerm = 'FULL_CASH';
  let payableInstallments: ERPPayableInstallment[] = [];
  let dpAmount = '0.00';
  let remainingAmount = '0.00';

  if (paymentSource === '101000' || paymentSource === '102000') {
    paymentTerm = 'FULL_CASH';
    dpAmount = totalNum.toFixed(2);
    remainingAmount = '0.00';
    payableInstallments = [];
  } else if (paymentSource === '201000') {
    if (scheduleNow) {
      const dpNum = Decimal.min(totalNum, D(downPayment || 0));
      dpAmount = dpNum.toFixed(2);
      remainingAmount = Decimal.max(0, totalNum.minus(dpNum)).toFixed(2);
      const tranchesCount = numberOfInstallments > 0 ? numberOfInstallments : 1;

      paymentTerm = dpNum.gt(0) ? 'DOWN_PAYMENT_INSTALLMENTS' : 'FULL_DEFERRED';

      payableInstallments = generatePayableInstallmentSchedule({
        costItemId: costId,
        totalAmount: totalNum.toNumber(),
        downPayment: dpNum.toNumber(),
        numberOfInstallments: tranchesCount,
        firstDueDate: firstDueDate || new Date().toISOString().split('T')[0],
        frequencyMonths: frequencyMonths
      });
    } else {
      paymentTerm = 'FULL_DEFERRED';
      dpAmount = '0.00';
      remainingAmount = totalNum.toFixed(2);
      payableInstallments = [];
    }
  }

  return {
    item_id: costId,
    id: costId,
    property_id: propertyId,
    category,
    phase,
    item_name_ar: itemName.trim(),
    item_name_en: itemName.trim(),
    supplier_contractor: supplier?.trim() || undefined,
    invoice_ref: invoiceRef?.trim() || undefined,
    quantity: Number(quantity) || 1,
    unit: unit || 'مقطوعية',
    unit_cost_egp: totalNum.dividedBy(Number(quantity) || 1).toFixed(2),
    total_cost_egp: totalNum.toFixed(2),
    logged_date: loggedDate,
    logged_by: loggedBy,
    created_at: new Date().toISOString(),
    status: 'verified',
    linked_account_code: paymentSource,
    payment_term: paymentTerm,
    paid_amount_egp: dpAmount,
    remaining_amount_egp: remainingAmount,
    due_date: paymentSource === '201000' ? firstDueDate : undefined,
    payable_installments: payableInstallments,
    adjustments: [],
    net_effective_cost_egp: totalNum.toFixed(2),
    notes: notes?.trim() || undefined
  };
}

/**
 * Fix 3: Sorts payables table items across priority, project, contractor, dueDate, totalCost, and remaining.
 */
export type PayableSortField = 'priority' | 'project' | 'contractor' | 'dueDate' | 'totalCost' | 'remaining';
export type SortDirection = 'asc' | 'desc';

export function sortPayableItems<T extends {
  projectName?: string;
  contractor?: string;
  dueDate?: string;
  totalNum?: Decimal | number | string;
  remainingNum?: Decimal | number | string;
  statusKey?: string;
  hasInstallments?: boolean;
}>(items: T[], field: PayableSortField, direction: SortDirection = 'asc', isAr: boolean = true): T[] {
  return [...items].sort((a, b) => {
    let comparison = 0;
    switch (field) {
      case 'priority': {
        const getPriorityScore = (item: T) => {
          const rem = D(item.remainingNum || 0);
          if (rem.isZero() || item.statusKey === 'paid') return 4;
          if (item.statusKey === 'overdue') return 1;
          if (item.hasInstallments) return 2;
          return 3;
        };
        const scoreA = getPriorityScore(a);
        const scoreB = getPriorityScore(b);
        if (scoreA !== scoreB) {
          comparison = scoreA - scoreB;
        } else {
          // Secondary tie-breaker within same priority tier
          if (scoreA === 1 || scoreA === 2) {
            // Overdue and upcoming: earliest due date first
            const dateA = a.dueDate || '';
            const dateB = b.dueDate || '';
            comparison = dateA.localeCompare(dateB);
          } else if (scoreA === 3) {
            // Unscheduled: largest remaining balance first
            const remA = D(a.remainingNum || 0);
            const remB = D(b.remainingNum || 0);
            comparison = remB.minus(remA).toNumber();
          } else {
            // Settled: latest due date first
            const dateA = a.dueDate || '';
            const dateB = b.dueDate || '';
            comparison = dateB.localeCompare(dateA);
          }
        }
        break;
      }
      case 'project':
        comparison = (a.projectName || '').localeCompare(b.projectName || '', isAr ? 'ar' : 'en');
        break;
      case 'contractor':
        comparison = (a.contractor || '').localeCompare(b.contractor || '', isAr ? 'ar' : 'en');
        break;
      case 'dueDate': {
        const dateA = a.dueDate || '';
        const dateB = b.dueDate || '';
        comparison = dateA.localeCompare(dateB);
        break;
      }
      case 'totalCost': {
        const costA = D(a.totalNum || 0);
        const costB = D(b.totalNum || 0);
        comparison = costA.minus(costB).toNumber();
        break;
      }
      case 'remaining': {
        const remA = D(a.remainingNum || 0);
        const remB = D(b.remainingNum || 0);
        comparison = remA.minus(remB).toNumber();
        break;
      }
    }
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Updates a cost item directly, strictly guarded by the 24-hour grace period rule.
 */
export function updateCostItemDirectly(
  item: ERPPropertyCostItem,
  updates: Partial<ERPPropertyCostItem>,
  forceOverride: boolean = false
): ERPPropertyCostItem {
  if (!forceOverride && !isItemWithinGracePeriod(item.created_at, 24)) {
    throw new Error('Accounting Lock: Item cannot be modified directly after the 24-hour grace period. Please use an adjustment sub-item.');
  }

  const updated: ERPPropertyCostItem = {
    ...item,
    ...updates,
    updated_at: new Date().toISOString()
  };

  const totals = calculateCostItemEffectiveTotals(updated);
  updated.net_effective_cost_egp = totals.netEffectiveCost;
  updated.paid_amount_egp = totals.paidAmount;
  updated.remaining_amount_egp = totals.remainingAmount;

  return updated;
}



/**
 * Re-splits the unpaid remainder of a cost item's payable schedule across its unpaid tranches.
 * Follows user-confirmed rule (2026-10-07):
 * - Fully paid tranches remain untouched.
 * - Partly paid tranches keep their paid amounts as floor; each partly paid tranche keeps amount_egp = paid_amount_egp + its share.
 * - Remaining to split = newNetTotal - sum(paid_amount_egp of all tranches).
 * - Split evenly in piastres over tranches that are not fully paid; the last such tranche absorbs rounding.
 */
export function resplitUnpaidInstallments(
  installments: undefined,
  newNetTotal: string | number | Decimal
): undefined;
export function resplitUnpaidInstallments(
  installments: ERPPayableInstallment[],
  newNetTotal: string | number | Decimal
): ERPPayableInstallment[];
export function resplitUnpaidInstallments(
  installments: ERPPayableInstallment[] | undefined,
  newNetTotal: string | number | Decimal
): ERPPayableInstallment[] | undefined;
export function resplitUnpaidInstallments(
  installments: ERPPayableInstallment[] | undefined,
  newNetTotal: string | number | Decimal
): ERPPayableInstallment[] | undefined {
  if (!installments || installments.length === 0) {
    return installments;
  }

  const netTotalDec = D(newNetTotal);
  let totalPaidDec = D(0);
  for (const inst of installments) {
    totalPaidDec = totalPaidDec.plus(inst.paid_amount_egp || 0);
  }

  const remainingToSplit = netTotalDec.minus(totalPaidDec);
  if (remainingToSplit.lt(0)) {
    throw new Error(`New total (${netTotalDec.toFixed(2)}) cannot be less than total paid amount (${totalPaidDec.toFixed(2)}).`);
  }

  const isTrancheFullyPaid = (inst: ERPPayableInstallment): boolean => {
    const paid = D(inst.paid_amount_egp || 0);
    const amount = D(inst.amount_egp || 0);
    return inst.status === 'PAID' || (amount.gt(0) && paid.gte(amount));
  };

  const unpaidCount = installments.filter(inst => !isTrancheFullyPaid(inst)).length;

  if (unpaidCount === 0) {
    if (remainingToSplit.isZero()) {
      return installments.map(inst => ({ ...inst }));
    }
    throw new Error('No unpaid tranches available to absorb the remaining cost.');
  }

  const baseCents = remainingToSplit.toCents() / BigInt(unpaidCount);
  const baseShare = Decimal.fromCents(baseCents);
  let allocatedShare = D(0);
  let unpaidSeen = 0;

  return installments.map(inst => {
    if (isTrancheFullyPaid(inst)) {
      return { ...inst, status: 'PAID' };
    }

    unpaidSeen += 1;
    const isLastUnpaid = unpaidSeen === unpaidCount;
    const trancheShare = isLastUnpaid ? remainingToSplit.minus(allocatedShare) : baseShare;
    allocatedShare = allocatedShare.plus(trancheShare);

    const paid = D(inst.paid_amount_egp || 0);
    // Rule: each partly paid tranche keeps amount_egp = paid_amount_egp + its allocated share.
    const newAmount = paid.plus(trancheShare);

    let status: ERPPayableInstallment['status'] = 'PENDING';
    if (newAmount.gt(0) && paid.gte(newAmount)) {
      status = 'PAID';
    } else if (paid.gt(0)) {
      status = 'PARTIALLY_PAID';
    }

    return {
      ...inst,
      amount_egp: newAmount.toFixed(2),
      paid_amount_egp: paid.toFixed(2),
      status
    };
  });
}
