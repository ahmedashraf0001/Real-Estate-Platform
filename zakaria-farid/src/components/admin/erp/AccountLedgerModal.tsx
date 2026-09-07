'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  X, 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Landmark, 
  ShieldCheck, 
  Calendar, 
  FileText, 
  Search, 
  ArrowUpDown, 
  RotateCcw,
  User,
  Building2,
  Zap,
  Coins,
  Key,
  Hammer,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { ERPAccount, ERPJournalEntry, ERPContract } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { toast } from 'sonner';
import { localizeJournalDescription, localizeJournalMemo, localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { exportAccountLedgerExcel } from '@/lib/erp/excelExporter';
import { ZFPrintDocumentLayout } from './v2/common/ZFPrintDocumentLayout';
import { ZFPagination } from './v2/ZFPagination';
import styles from './v2/ZFWorkstationShell.module.css';

interface AccountLedgerModalProps {
  account: ERPAccount | null;
  journalEntries: ERPJournalEntry[];
  contracts?: ERPContract[];
  properties?: Property[];
  onClose: () => void;
  isAr: boolean;
}

// Business Purpose & Educational Real Estate Guide for Egyptian Merchant Operations
const ACCOUNT_EXPLANATIONS: Record<string, { roleAr: string; roleEn: string; whenDebitedAr: string; whenCreditedAr: string }> = {
  '101000': {
    roleAr: 'الخزينة النقدية الرئيسية: الكاش الحاضر باليد في خزنة مقر الشركة بمنيا القمح لحركات القبض والصرف الفوري ونثريات الموقع.',
    roleEn: 'Physical cash safe in the corporate headquarters for immediate receipts and petty operations.',
    whenDebitedAr: 'بيزيد ويدخل فيه كاش لما بنحصل دفعة مقدم أو قسط من مشتري نقداً باليد، أو بنسحب كاش من البنك للخزنة.',
    whenCreditedAr: 'بينقص ويخرج منه كاش لما بنسدد مصاريف ونثريات، أو بنورد الكاش لحساب الشركة في البنك.'
  },
  '102000': {
    roleAr: 'حسابات البنوك والتحويلات: رصيد الشركة في البنك؛ بيستقبل تحويلات المشترين والإنستاباي، وبندفع منه دفعات مقاولي البناء ومصانع الحديد والأسمنت.',
    roleEn: 'Primary corporate bank accounts receiving buyer contract advances and funding operations.',
    whenDebitedAr: 'بيزيد بالفلوس لما العميل يحول دفعة حجز أو قسط عن طريق البنك أو إنستاباي.',
    whenCreditedAr: 'بينقص لما بنحول لمقاولي الخرسانات، أو لمصانع الأسمنت والحديد، أو بنسحب منه للخزنة.'
  },
  '102100': {
    roleAr: 'حساب وديعة صيانة المشروعات: حساب بنكي محجوز لأمانات ودائع الصيانة (8-10%) المحصلة من الملاك؛ ودي فلوس أمانة لصيانة الأبراج والأسانسيرات مستقبلاً.',
    roleEn: 'Restricted escrow trust bank account strictly reserved for buyer maintenance fund deposits.',
    whenDebitedAr: 'بيزيد لما المشتري يسدد وديعة الصيانة المقررة في العقد قبل استلام شقته.',
    whenCreditedAr: 'بيصرف منه حصرياً على صيانة المبنى والأسانسيرات والمرافق المشتركة بعد تسليم العمارة.'
  },
  '103000': {
    roleAr: 'باقي أقساط المشترين بالعقود: إجمالي المبالغ والأقساط المؤجلة المتبقية على العملاء بعد استلام شققهم حتى انتهاء سداد كامل ثمن العقد.',
    roleEn: 'Accounts receivable for remaining billed installment schedules on delivered units.',
    whenDebitedAr: 'بيزيد ويثبت عليه المبلغ المتبقي من ثمن الشقة وقت تحرير محضر التسليم للعميل.',
    whenCreditedAr: 'بينقص كل ما العميل يسدد قسط من أقساطه المستحقة ويدخل الخزنة أو البنك.'
  },
  '103200': {
    roleAr: 'أقساط الخزينة المستحقة: جدول الأقساط الميدانية المسجلة بأجندة الخزنة، لمتابعة مواعيد استحقاقها وتحصيلها كاش باليد أو إنستاباي.',
    roleEn: 'Physical hand installments agenda and receipt vouchers in company custody.',
    whenDebitedAr: 'بيسجل فيه إجمالي الأقساط المجدولة على المشترين بمجرد توقيع العقد.',
    whenCreditedAr: 'بينقص فور حلول موعد القسط وتحصيله فعلياً وتوريده في خزنة الشركة.'
  },
  '103300': {
    roleAr: 'وسيط تسويات الضرائب: حساب مؤقت مخصص لمعالجة أي فروق ضريبية رسمية تخضع للمراجعة والاعتماد.',
    roleEn: 'Gated customer tax clearing receivable under strict governance.',
    whenDebitedAr: 'يُسجل فيه أي فروق أو مستحقات ضريبية معتمدة من الإدارة المالية.',
    whenCreditedAr: 'يُقفل عند تسوية المبالغ وتوريدها للجهات المختصة.'
  },
  '104000': {
    roleAr: 'شيكات وأوراق قبض تحت التحصيل: شيكات وأوراق الأقساط المحفوظة في خزنة الشركة لمتابعة مواعيد صرفها من البنوك في تاريخ استحقاقها.',
    roleEn: 'Installments and notes under collection held safely in treasury custody for scheduled collection.',
    whenDebitedAr: 'بيزيد لما نستلم شيكات آجلة من المشتري ونحفظها في خزنة الشركة كأمانة تحت التحصيل.',
    whenCreditedAr: 'بينقص لما الشيك يجي ميعاده ويتحصل كاش أو يدخل رصيد الشركة في البنك.'
  },
  '105000': {
    roleAr: 'مصاريف ومواد البناء الجارية: الحساب المجمع لكل مصاريف وتكاليف البناء والتشييد وشراء الخامات حتى انتهاء المشروع وتسليم الوحدات.',
    roleEn: 'Consolidated real estate development work-in-progress capital asset account.',
    whenDebitedAr: 'بيزيد بكل جنيه بنصرفه على البناء من حديد وأسمنت وخرسانات ومصنعيات مقاولين.',
    whenCreditedAr: 'بينقص لما نسلم الشقق لأصحابها، وتتحول تكلفة البناء المنفذة إلى تكلفة مبيعات.'
  },
  '150000': {
    roleAr: 'أراضي المشروعات والتراخيص: تكلفة شراء قطع الأراضي ومصروفات استخراج تراخيص البناء والرسوم الهندسية للمشروع.',
    roleEn: 'Capitalized WIP asset representing land parcel acquisition and initial zoning licensing.',
    whenDebitedAr: 'بيزيد عند سداد ثمن شراء قطعة أرض جديدة للمشروع أو دفع رسوم التراخيص والمكتب الهندسي.',
    whenCreditedAr: 'بينقص ويتقفل تدريجياً بنصيب كل شقة مباعة عند تسليمها للمشتري.'
  },
  '151000': {
    roleAr: 'الخرسانات وأعمال المباني: تكاليف صب الخرسانات، حديد التسليح، الأسمنت، الرمل، ومستخلصات مقاولي الهيكل الإنشائي بالمواقع.',
    roleEn: 'Direct construction WIP asset for civil works, concrete, structural steel, and masonry.',
    whenDebitedAr: 'بيزيد مع كل صبة خرسانة وتوريد حديد وأسمنت واعتماد مستخلصات مقاول الخرسانة والمباني.',
    whenCreditedAr: 'بينقص ويتحول لتكلفة مبيعات فعلية عند تسليم الوحدات المباعة لأصحابها.'
  },
  '152000': {
    roleAr: 'تأسيس السباكة والكهرباء والمصاعد: تكاليف تمديد شبكات التغذية والصرف، كابلات الكهرباء، وتوريد وتركيب أسانسيرات الأبراج.',
    roleEn: 'WIP asset for mechanical, electrical, plumbing, elevators, and fire-suppression infrastructure.',
    whenDebitedAr: 'بيزيد مع سداد فواتير مواسير السباكة وسلك الكهرباء ومستخلصات مقاولي المرافق ومصنعية تركيب المصاعد.',
    whenCreditedAr: 'بينقص بتوزيع تكلفته على الشقق المباعة عند التسليم النهائي للملاك.'
  },
  '153000': {
    roleAr: 'تشطيب الواجهات والمداخل الفاخرة: تكاليف تجليد الواجهات بالحجر الهاشمي، رخام المداخل، الجبس، ودهانات العمارة الخارجية الفاخرة.',
    roleEn: 'WIP asset for bespoke marble, stone facades, interior finishing, and luxury architectural detailing.',
    whenDebitedAr: 'بيزيد مع شراء الحجر الهاشمي والرخام ومصنعيات تشطيب مدخل العمارة والواجهة.',
    whenCreditedAr: 'بينقص ويتقفل ضمن تكلفة الشقق عند تسليم المبنى للمشترين.'
  },
  '156000': {
    roleAr: 'تكاليف التمويل المباشرة: أي مصاريف بنكية أو رسوم تمويل مرتبطة مباشرة بفترة تنفيذ وبناء المشروع العقاري.',
    roleEn: 'Borrowing costs capitalized directly during the construction phase of qualifying real estate projects.',
    whenDebitedAr: 'بيزيد عند سداد أي تكاليف أو رسوم بنكية مرتبطة بتمويل تنفيذ المشروع.',
    whenCreditedAr: 'بينقص ويتحول لتكلفة مبيعات مع اكتمال وتسليم شقق المشروع.'
  },
  '201000': {
    roleAr: 'حسابات الموردين والمقاولين: المبالغ المستحقة لمقاولي الباطن وموردي مواد البناء (الحديد، الأسمنت، والتشوينات) الواجب سدادها لهم.',
    roleEn: 'Trade accounts payable for structural contractors, architects, and building material suppliers.',
    whenCreditedAr: 'بيزيد ويبقى التزام علينا لما نستلم فواتير حديد أو أسمنت أو نعتمد مستخلص لمقاول وما دفعناهوش لسه.',
    whenDebitedAr: 'بينقص لما نسدد للمقاول أو المورد حسابه كاش من الخزنة أو بتحويل بنكي.'
  },
  '203000': {
    roleAr: 'مقدمات وأقساط حجز العقود: فلوس مقدمات الحجز والأقساط اللي دفعها المشترون قبل استلام شققهم؛ وتعتبر التزاماً على الشركة حتى تسليم المفتاح.',
    roleEn: 'Deferred contract revenue representing pre-handover buyer collections (unearned contract liabilities).',
    whenCreditedAr: 'بيزيد ويثبت التزام علينا لما المشتري يدفع مقدم حجز الشقة أو يسدد قسط من أقساط فترة الإنشاء.',
    whenDebitedAr: 'بينقص ويتقفل لما نسلم العميل شقته رسمياً وتتحول الفلوس لإيراد مبيعات، أو في حالة فسخ العقد وترجيع فلوسه.'
  },
  '204000': {
    roleAr: 'مستحقات ضريبة التصرفات العقارية: الالتزام القانوني بنسبة (2.5%) المستحقة على مبيعات الوحدات العقارية ورسوم الشهر العقاري.',
    roleEn: 'Accrued real estate disposition taxes and statutory registration obligations.',
    whenCreditedAr: 'بيزيد ويثبت التزام على الشركة عند تحرير عقود بيع الوحدات السكنية.',
    whenDebitedAr: 'بينقص عند سداد الضريبة وتوريدها للضرائب العقارية واستلام إيصال السداد الرسمي.'
  },
  '206200': {
    roleAr: 'مستحقات المشترين في فسخ العقود: صافي المبلغ الواجب رده للعميل بعد إلغاء العقد وخصم نسبة الـ 10% المتفق عليها.',
    roleEn: 'Customer net refund liability payable post-rescission after deducting forfeiture penalties.',
    whenCreditedAr: 'بيزيد ويثبت التزام على الشركة لصالح العميل فور اعتماد محضر فسخ العقد.',
    whenDebitedAr: 'بينقص ويتقفل لما العميل يستلم شيكه أو فلوسه كاش من الخزنة أو البنك.'
  },
  '207000': {
    roleAr: 'أمانات ودائع الصيانة (التزام): مبالغ الصيانة اللي دفعها الملاك كأمانة محجوزة لصندوق العمارة؛ ولا تدخل أبداً ضمن أرباح الشركة.',
    roleEn: 'Homeowner maintenance fund obligation held in trust for ongoing building services.',
    whenCreditedAr: 'بيزيد لما نستلم وديعة الصيانة من المشتري عند الاستلام كأمانة للعمارة.',
    whenDebitedAr: 'بينقص لما نصرف من الفلوس دي على أعمال صيانة البرج أو نقلها لوديعة الملاك.'
  },
  '301000': {
    roleAr: 'رأس مال وحصص الشركاء: الفلوس الحقيقية اللي ضخها الشركاء والمؤسسون من مالهم الخاص لتمويل شراء الأراضي وبدء البناء.',
    roleEn: 'Shareholder equity and initial paid-in developer partner capital.',
    whenCreditedAr: 'بيزيد لما أحد الشركاء يضخ فلوس جديدة في الشركة أو يزود حصته في رأس المال.',
    whenDebitedAr: 'بينقص في حال سحب شريك لجزء من حصته أو إجراء توزيعات أرباح معتمدة.'
  },
  '303000': {
    roleAr: 'توزيعات أرباح ومسحوبات الشركاء: الفلوس اللي بتتسدد وتتصرف للشركاء وممولي المشاريع كأرباح من حصيلة المبيعات أو تسديد مستحقاتهم.',
    roleEn: 'Partner dividend payouts, profit distributions, and capital withdrawals.',
    whenDebitedAr: 'بيزيد لما نسدد دفعة أرباح للشريك كاش من الخزينة أو بتحويل بنكي/إنستاباي.',
    whenCreditedAr: 'بيتقفل في حساب الأرباح المرحلة ورأس المال في نهاية الدورة المحاسبية.'
  },
  '401000': {
    roleAr: 'إيرادات مبيعات الشقق المحققة: إجمالي ثمن الشقق اللي اتباعت وتسلمت مفاتيحها رسمياً للمشترين بمحاضر تسليم معتمدة.',
    roleEn: 'Recognized revenue on completed sales upon physical unit handover protocol execution.',
    whenCreditedAr: 'بيزيد ويتحسب كمكسب ومبيعات حقيقية للشركة بمجرد توقيع محضر تسليم الشقة للمشتري.',
    whenDebitedAr: 'مش بينقص إلا لو اتفسخ عقد شقة كانت متسلمة واستردينا حيازتها للشركة.'
  },
  '501000': {
    roleAr: 'تكلفة مبيعات - نصيب الأرض: نصيب الشقة المباعة والمسلمة من ثمن قطعة الأرض الأساسية.',
    roleEn: 'Cost of goods sold representing pro-rata allocated land cost on delivered units.',
    whenDebitedAr: 'بيتحسب كمصروف في حساب الأرباح عند تسليم الشقة للمشتري لمقابلة إيراد بيعها.',
    whenCreditedAr: 'بيتعكس ويقل في حالة فسخ عقد شقة مسلمة واستردادها لممتلكات الشركة.'
  },
  '502000': {
    roleAr: 'تكلفة مبيعات - أعمال البناء: نصيب الشقة المباعة والمسلمة من إجمالي تكاليف الخرسانات والحديد ومصاريف الإنشاء.',
    roleEn: 'Cost of goods sold for structural and civil construction on delivered units.',
    whenDebitedAr: 'بيتحسب كمصروف تكلفة مباني في الأرباح عند تسليم الشقة للمشتري.',
    whenCreditedAr: 'بيتعكس ويقل لو اتفسخ عقد الشقة ورجعت لممتلكات الشركة.'
  },
  '601000': {
    roleAr: 'عمولات ومصاريف التسويق: عمولات وسطاء البيع والمسوقين العقاريين وتكاليف الدعاية والإعلانات واللافتات للمشاريع.',
    roleEn: 'Sales commission, brokerage fees, and marketing campaign expenses.',
    whenDebitedAr: 'بيزيد عند صرف عمولة بيع لوسيط عقاري أو سداد فواتير حملات الدعاية والتسويق.',
    whenCreditedAr: 'بيتقفل في حساب أرباح وخسائر الشركة في نهاية السنة المالية.'
  },
  '602000': {
    roleAr: 'المصاريف العمومية والإدارية: مرتبات الموظفين، إيجار مقر الشركة بمنيا القمح، فواتير الكهرباء والإنترنت ونثريات العمل اليومية.',
    roleEn: 'General & administrative corporate overhead, staff salaries, and office rent.',
    whenDebitedAr: 'بيزيد عند سداد المرتبات أول الشهر أو دفع إيجار المقر والمصاريف الإدارية.',
    whenCreditedAr: 'بيتقفل في حساب الأرباح والخسائر بنهاية الفترة المالية.'
  },
  '603000': {
    roleAr: 'مصاريف تشغيل وخدمات المواقع: فواتير كهرباء ومياه البناء، نثريات الموقع، حراسة الأراضي، ومصروفات التشوين اليومية.',
    roleEn: 'Site utilities, electricity, water, internet, and site operational running expenses.',
    whenDebitedAr: 'بيزيد عند سداد فواتير مياه وكهرباء المباني أو إكراميات ونثريات وأمن الموقع.',
    whenCreditedAr: 'بيتقفل في حساب الأرباح والخسائر بنهاية الفترة المالية.'
  }
};

export interface ParsedTransaction {
  actionBadge: {
    label: string;
    bg: string;
    text: string;
    border: string;
    icon: string;
  };
  headline: string;
  contractNumber?: string;
  referenceNumber?: string;
  clientName?: string;
  unitInfo?: string;
  propertyTitle?: string;
  memo?: string;
}

const renderBadgeIcon = (icon: string) => {
  switch (icon) {
    case 'instapay': return <Zap size={11} />;
    case 'down_payment': return <CheckCircle2 size={11} />;
    case 'installment': return <Coins size={11} />;
    case 'handover': return <Key size={11} />;
    case 'rescission': return <AlertCircle size={11} />;
    case 'supplement': return <FileText size={11} />;
    case 'expense': return <Hammer size={11} />;
    case 'transfer': return <RotateCcw size={11} />;
    default: return <BookOpen size={11} />;
  }
};

export const AccountLedgerModal: React.FC<AccountLedgerModalProps> = ({
  account,
  journalEntries,
  contracts = [],
  properties = [],
  onClose,
  isAr
}) => {
  if (!account) return null;

  // 1. Fast Lookup Indexes for Contracts and Properties
  const contractLookup = useMemo(() => {
    const byId = new Map<string, ERPContract>();
    const byNumber = new Map<string, ERPContract>();

    (contracts || []).forEach(ct => {
      if (ct.contract_id) {
        byId.set(ct.contract_id, ct);
      }
      if (ct.contract_number) {
        byNumber.set(ct.contract_number.toUpperCase().trim(), ct);
      }
    });

    return { byId, byNumber };
  }, [contracts]);

  const propertyLookup = useMemo(() => {
    const byId = new Map<string, Property>();
    const byUnitId = new Map<string, { prop: Property; unitNumber?: string }>();

    (properties || []).forEach(prop => {
      if (prop.id) {
        byId.set(prop.id, prop);
      }
      if (prop.building_units && Array.isArray(prop.building_units)) {
        prop.building_units.forEach(u => {
          if (u.unit_id) {
            byUnitId.set(u.unit_id, { prop, unitNumber: u.unit_number });
          }
        });
      }
    });

    return { byId, byUnitId };
  }, [properties]);

  // Match contract by ID or by scanning string text (e.g. ZF-2026-XXXX)
  const resolveContract = useCallback((
    contractId?: string,
    description?: string,
    entryNumber?: string,
    memo?: string
  ): ERPContract | undefined => {
    if (contractId) {
      if (contractLookup.byId.has(contractId)) {
        return contractLookup.byId.get(contractId);
      }
      if (contractLookup.byNumber.has(contractId.toUpperCase().trim())) {
        return contractLookup.byNumber.get(contractId.toUpperCase().trim());
      }
    }

    const textToScan = `${description || ''} ${entryNumber || ''} ${memo || ''}`;
    const numMatch = textToScan.match(/(?:ZF|CONT|CT)-\d{4}-\d+/i) ||
                     textToScan.match(/\b(?:ZF|CONT|CT)-[A-Za-z0-9_-]+/i) ||
                     textToScan.match(/(?:عقد\s*رقم|عقد|Contract\s*(?:#|number|no\.?)?)\s*[:#]?\s*([A-Za-z0-9_-]+)/i);

    if (numMatch) {
      const candidate = (numMatch[1] || numMatch[0]).toUpperCase().trim();
      if (contractLookup.byNumber.has(candidate)) {
        return contractLookup.byNumber.get(candidate);
      }
      if (contractLookup.byId.has(candidate)) {
        return contractLookup.byId.get(candidate);
      }
      const found = (contracts || []).find(c => 
        (c.contract_number && c.contract_number.toUpperCase().includes(candidate)) ||
        (c.contract_id && c.contract_id.toUpperCase() === candidate)
      );
      if (found) return found;
    }

    return undefined;
  }, [contractLookup, contracts]);

  // Resolve property title and building unit label
  const resolvePropertyAndUnit = useCallback((ct: ERPContract): { propTitle: string; unitInfo: string } => {
    let prop: Property | undefined;
    let unitInfo = ct.building_unit_number || '';

    // A. Direct property_id
    if (ct.property_id && propertyLookup.byId.has(ct.property_id)) {
      prop = propertyLookup.byId.get(ct.property_id);
    }

    // B. Unit ID in propertyLookup
    if (ct.unit_id && propertyLookup.byUnitId.has(ct.unit_id)) {
      const match = propertyLookup.byUnitId.get(ct.unit_id)!;
      if (!prop) prop = match.prop;
      if (!unitInfo && match.unitNumber) unitInfo = match.unitNumber;
    }

    // C. Unit ID is property ID
    if (!prop && ct.unit_id && propertyLookup.byId.has(ct.unit_id)) {
      prop = propertyLookup.byId.get(ct.unit_id);
    }

    // D. In prop.building_units
    if (prop && !unitInfo && prop.building_units && ct.unit_id) {
      const matchedUnit = prop.building_units.find(u => u.unit_id === ct.unit_id);
      if (matchedUnit) unitInfo = matchedUnit.unit_number;
    }

    // E. Fallback unit_id
    if (!unitInfo && ct.unit_id) {
      unitInfo = ct.unit_id;
    }

    if (unitInfo && isAr) {
      unitInfo = unitInfo
        .replace(/^.*?apt-(\d+)/i, 'شقة $1')
        .replace(/^.*?unit-(\d+)/i, 'وحدة $1');
      if (/^\d+$/.test(unitInfo.trim())) {
        unitInfo = `شقة ${unitInfo.trim()}`;
      }
    }

    const propTitle = prop 
      ? (isAr ? (prop.title_ar || prop.title_en) : (prop.title_en || prop.title_ar)) 
      : '';

    return { propTitle, unitInfo };
  }, [propertyLookup, isAr]);

  // Enrich description for crystal-clear merchant legibility matching Row 1 standard
  const enrichDescription = useCallback((line: {
    description: string;
    entry_number: string;
    memo?: string;
    contract_id?: string;
  }): string => {
    const origDesc = line.description || '';
    if (!isAr) return origDesc;

    // Row 1 pattern: If already contains rich buyer & transaction references (e.g. InstaPay row), keep intact
    if (origDesc.includes('من العميل:') && (origDesc.includes('مرجع') || origDesc.includes('إنستاباي') || origDesc.includes('تحويل'))) {
      return origDesc;
    }

    // Try finding linked contract
    const ct = resolveContract(line.contract_id, origDesc, line.entry_number, line.memo);

    if (ct) {
      const buyerName = localizeBuyerName(ct.buyer_name || 'العميل');
      const { propTitle, unitInfo } = resolvePropertyAndUnit(ct);
      
      const badgeParts: string[] = [];
      if (unitInfo) badgeParts.push(unitInfo);
      if (propTitle) badgeParts.push(propTitle);
      const detailsBadge = badgeParts.length > 0 ? ` [${badgeParts.join(' • ')}]` : '';

      const text = `${origDesc} ${line.memo || ''} ${line.entry_number || ''}`;

      // 1. Tranche check (Down payment is tranche 0)
      const trancheMatch = text.match(/(?:Installment\s*#|القسط\s*رقم\s*|قسط\s*رقم\s*)(\d+)/i);
      if (trancheMatch) {
        const trancheNum = parseInt(trancheMatch[1], 10);
        if (trancheNum === 0) {
          return `تحصيل دفعة مقدم التعاقد بموجب عقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
        }
        return `تحصيل القسط رقم ${trancheNum} بموجب عقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
      }

      // 2. Down payment / Advance collection
      const isDownPayment = /(?:Advance Collection|الدفعة المقدمة|دفعة مقدم|مقدم الحجز|Customer advance|JE-PAY)/i.test(text);
      if (isDownPayment) {
        return `تحصيل دفعة مقدم التعاقد بموجب عقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
      }

      // 3. Physical Handover
      if (/(?:Handover|تسليم|استلام)/i.test(text)) {
        return `محضر تسليم الشقة النهائي واعتراف بإيراد المبيعات للعقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
      }

      // 4. Contract Rescission
      if (/(?:Rescission|فسخ)/i.test(text)) {
        const hasForfeiture = /(?:Forfeiture|استقطاع)/i.test(text);
        return `فسخ وإلغاء التعاقد ${hasForfeiture ? '(مع استقطاع نسبة الفسخ) ' : ''}للعقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
      }

      // 5. Default contract movement
      return `تحصيل دفعة تعاقدية بموجب عقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
    }

    // Fallback: If contract not found in array, but description has contract number & buyer
    const advMatch = origDesc.match(/(?:Advance Collection for Contract|تحصيل الدفعة المقدمة لعقد البيع رقم)\s*([A-Za-z0-9_-]+)(?:\s*\((.*?)\))?/i);
    if (advMatch) {
      const contractNum = advMatch[1];
      const rawBuyer = advMatch[2];
      const buyerName = rawBuyer ? localizeBuyerName(rawBuyer) : '';
      if (buyerName) {
        return `تحصيل دفعة مقدم التعاقد بموجب عقد رقم ${contractNum} من العميل: ${buyerName}`;
      }
    }

    // Fallback: Use standard journal description localizer
    return localizeJournalDescription(origDesc, isAr);
  }, [isAr, resolveContract, resolvePropertyAndUnit]);

  // Enrich memo / subtext
  const enrichMemo = useCallback((line: {
    memo?: string;
    description: string;
    entry_number: string;
    contract_id?: string;
  }): string | undefined => {
    if (!isAr) return line.memo;

    const rawMemo = (line.memo || '').trim();

    // 1. If memo is already InstaPay or specific voucher reference:
    if (rawMemo.includes('إنستاباي') || rawMemo.includes('مرجع') || rawMemo.includes('IP-')) {
      return localizeJournalMemo(rawMemo, isAr);
    }

    const textToScan = `${rawMemo} ${line.description || ''} ${line.entry_number || ''}`;
    const isDownPayment = /(?:Advance Collection|الدفعة المقدمة|دفعة مقدم|مقدم الحجز|قسط رقم 0|Installment\s*#0|Customer advance|JE-PAY)/i.test(textToScan);

    // Account 102000 (Corporate Operating Bank & InstaPay)
    if (account.account_code === '102000') {
      if (isDownPayment || rawMemo.includes('Operating Bank') || rawMemo.includes('Customer advance') || rawMemo.includes('إيداع')) {
        return 'إيداع بنكي مباشر بحساب الشركة التشغيلي (102000) • إثبات دفعة التعاقد';
      }
    }

    // Account 101000 (Treasury Cash Safe)
    if (account.account_code === '101000') {
      if (isDownPayment || rawMemo.includes('Treasury Safe') || rawMemo.includes('Safe') || rawMemo.includes('خزينة')) {
        return 'توريد كاش باليد لخزينة الشركة الرئيسية (101000) • إثبات دفعة التعاقد';
      }
    }

    // Account 203000 (Deferred Contract Revenue)
    if (account.account_code === '203000') {
      if (isDownPayment || rawMemo.includes('Deferred Contract Revenue') || rawMemo.includes('إثبات دفعة الحجز')) {
        return 'قيد التزام تعاقدي مؤجل حتى الاستلام (203000) • إثبات دفعة التعاقد';
      }
    }

    if (rawMemo) {
      return localizeJournalMemo(rawMemo, isAr);
    }

    if (account.account_code === '102000' && isDownPayment) {
      return 'إيداع بنكي مباشر بحساب الشركة التشغيلي (102000) • إثبات دفعة التعاقد';
    }

    return undefined;
  }, [isAr, account.account_code]);

  // 2. Structured transaction parser for clear, highlighted metadata separation
  const parseTransaction = useCallback((line: {
    description: string;
    entry_number: string;
    memo?: string;
    contract_id?: string;
  }): ParsedTransaction => {
    const rawDesc = line.description || '';
    const rawMemo = (line.memo || '').trim();
    const entryNum = line.entry_number || '';
    const combinedText = `${rawDesc} ${rawMemo} ${entryNum}`;

    // 1. Check if linked to a contract
    const ct = resolveContract(line.contract_id, rawDesc, entryNum, rawMemo);
    const resolvedBuyer = ct ? localizeBuyerName(ct.buyer_name || '') : '';
    const { propTitle: resolvedProp, unitInfo: resolvedUnit } = ct 
      ? resolvePropertyAndUnit(ct) 
      : { propTitle: '', unitInfo: '' };

    // 2. Extract references (e.g. IP-2026-6001 or SUP-...)
    const refMatch = combinedText.match(/(?:مرجع\s*رقم|مرجع\s*#|مرجع|Ref\s*#?)\s*[:#]?\s*([A-Za-z0-9_-]+)/i) ||
                     combinedText.match(/\b(IP-\d{4}-\d+)\b/i) ||
                     combinedText.match(/\b(SUP-[A-Za-z0-9_-]+)\b/i);
    const referenceNumber = refMatch ? (refMatch[1] || refMatch[0]).trim() : undefined;

    // 3. Extract contract number (from ct or from text)
    const ctMatch = combinedText.match(/\b((?:ZF|CONT|CT)-\d{4}-\d+)\b/i) ||
                    combinedText.match(/(?:عقد\s*رقم|عقد|Contract\s*#?)\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
    const contractNumber = ct?.contract_number || (ctMatch ? (ctMatch[1] || ctMatch[0]).trim() : undefined);

    // 4. Extract client name (from ct or from text)
    let clientName = resolvedBuyer;
    if (!clientName) {
      const clientMatch = combinedText.match(/(?:من العميل|العميل|المشتري|Client)\s*[:#]?\s*([^-\[\(,\n\r]+)/i);
      if (clientMatch) {
        clientName = localizeBuyerName(clientMatch[1].trim());
      }
    }

    // 5. Extract unit / property (from ct or from brackets `[...]`)
    let unitInfo = resolvedUnit;
    let propertyTitle = resolvedProp;
    if (!unitInfo && !propertyTitle) {
      const bracketMatch = combinedText.match(/\[(.*?)\]/);
      if (bracketMatch) {
        const parts = bracketMatch[1].split(/[•·,-]/).map(s => s.trim());
        if (parts.length >= 2) {
          unitInfo = parts[0];
          propertyTitle = parts.slice(1).join(' • ');
        } else if (parts.length === 1) {
          if (/شقة|وحدة|محل|Unit|Apt/i.test(parts[0])) {
            unitInfo = parts[0];
          } else {
            propertyTitle = parts[0];
          }
        }
      }
    }

    // 6. Format memo / subtext
    const localizedMemo = enrichMemo(line);

    // 7. Determine Action Type, Badge & Headline
    // A. InstaPay / Quick Bank Transfer
    if (combinedText.includes('إنستاباي') || combinedText.includes('IP-') || combinedText.includes('InstaPay')) {
      return {
        actionBadge: {
          label: isAr ? 'إنستاباي فوري' : 'InstaPay',
          bg: 'rgba(37, 99, 235, 0.08)',
          text: '#1d4ed8',
          border: 'rgba(37, 99, 235, 0.25)',
          icon: 'instapay'
        },
        headline: isAr ? 'تحصيل قسط بنكي فوري عبر إنستاباي' : 'Instant InstaPay Tranche Collection',
        contractNumber,
        referenceNumber,
        clientName,
        unitInfo,
        propertyTitle,
        memo: localizedMemo || (isAr ? 'إيداع بنكي فوري بحساب الشركة التشغيلي (102000)' : 'Direct corporate bank deposit')
      };
    }

    // B. Tranche Check (Down payment is tranche 0)
    const trancheMatch = combinedText.match(/(?:Installment\s*#|القسط\s*رقم\s*|قسط\s*رقم\s*)(\d+)/i);
    if (trancheMatch) {
      const trancheNum = parseInt(trancheMatch[1], 10);
      if (trancheNum === 0) {
        return {
          actionBadge: {
            label: isAr ? 'مقدم تعاقد' : 'Advance',
            bg: 'rgba(21, 128, 61, 0.08)',
            text: '#15803d',
            border: 'rgba(21, 128, 61, 0.25)',
            icon: 'down_payment'
          },
          headline: isAr ? 'تحصيل دفعة مقدم التعاقد وحجز الوحدة' : 'Contract Booking Advance Collection',
          contractNumber,
          referenceNumber,
          clientName,
          unitInfo,
          propertyTitle,
          memo: localizedMemo || (isAr ? 'إيداع بنكي/نقدي للدفعة المقدمة بحساب الشركة' : 'Contract advance collection')
        };
      }
      return {
        actionBadge: {
          label: isAr ? `قسط دوري #${trancheNum}` : `Tranche #${trancheNum}`,
          bg: 'rgba(184, 144, 62, 0.08)',
          text: '#946f23',
          border: 'rgba(184, 144, 62, 0.28)',
          icon: 'installment'
        },
        headline: isAr ? `تحصيل القسط رقم ${trancheNum} من جدول السداد` : `Collection of Scheduled Tranche #${trancheNum}`,
        contractNumber,
        referenceNumber,
        clientName,
        unitInfo,
        propertyTitle,
        memo: localizedMemo
      };
    }

    // C. Down payment without explicit tranche number
    if (/(?:Advance Collection|الدفعة المقدمة|دفعة مقدم|مقدم الحجز|Customer advance|JE-PAY)/i.test(combinedText)) {
      return {
        actionBadge: {
          label: isAr ? 'مقدم تعاقد' : 'Advance',
          bg: 'rgba(21, 128, 61, 0.08)',
          text: '#15803d',
          border: 'rgba(21, 128, 61, 0.25)',
          icon: 'down_payment'
        },
        headline: isAr ? 'تحصيل دفعة مقدم التعاقد وحجز الوحدة' : 'Contract Booking Advance Collection',
        contractNumber,
        referenceNumber,
        clientName,
        unitInfo,
        propertyTitle,
        memo: localizedMemo
      };
    }

    // D. Handover
    if (/(?:Handover|تسليم|استلام)/i.test(combinedText)) {
      return {
        actionBadge: {
          label: isAr ? 'تسليم ومحضر' : 'Handover',
          bg: 'rgba(67, 56, 202, 0.08)',
          text: '#4338ca',
          border: 'rgba(67, 56, 202, 0.25)',
          icon: 'handover'
        },
        headline: isAr ? 'محضر تسليم الشقة النهائي واعتراف بإيراد المبيعات' : 'Final Handover Protocol & Revenue Recognition',
        contractNumber,
        referenceNumber,
        clientName,
        unitInfo,
        propertyTitle,
        memo: localizedMemo
      };
    }

    // E. Rescission
    if (/(?:Rescission|فسخ)/i.test(combinedText)) {
      const hasForfeiture = /(?:Forfeiture|استقطاع)/i.test(combinedText);
      return {
        actionBadge: {
          label: isAr ? 'فسخ تعاقد' : 'Rescission',
          bg: 'rgba(190, 18, 60, 0.08)',
          text: '#be123c',
          border: 'rgba(190, 18, 60, 0.25)',
          icon: 'rescission'
        },
        headline: isAr 
          ? `فسخ وإلغاء التعاقد ${hasForfeiture ? '(مع استقطاع نسبة الفسخ القانونية)' : ''}` 
          : 'Contract Rescission & Settlement',
        contractNumber,
        referenceNumber,
        clientName,
        unitInfo,
        propertyTitle,
        memo: localizedMemo
      };
    }

    // F. Contract Supplement / Addendum
    if (/(?:SUP-|ملحق|تشطيبات|تعديلات|Supplement)/i.test(combinedText)) {
      return {
        actionBadge: {
          label: isAr ? 'ملحق تعاقدي' : 'Supplement',
          bg: 'rgba(133, 77, 14, 0.08)',
          text: '#854d0e',
          border: 'rgba(133, 77, 14, 0.25)',
          icon: 'supplement'
        },
        headline: isAr ? 'إثبات ملحق أو دفعة أعمال إضافية للعقد' : 'Contract Addendum & Supplement Tranche',
        contractNumber,
        referenceNumber,
        clientName,
        unitInfo,
        propertyTitle,
        memo: localizedMemo
      };
    }

    // G. WIP Construction / Materials Expense
    if (account.account_code === '105000' || /(?:خرسانات|حديد|أسمنت|تشطيبات|مقاول|موقع|WIP|construction|materials)/i.test(combinedText)) {
      return {
        actionBadge: {
          label: isAr ? 'خامات ومباني' : 'WIP Costs',
          bg: 'rgba(194, 65, 12, 0.08)',
          text: '#c2410c',
          border: 'rgba(194, 65, 12, 0.25)',
          icon: 'expense'
        },
        headline: localizeJournalDescription(rawDesc, isAr),
        contractNumber,
        referenceNumber,
        clientName,
        unitInfo,
        propertyTitle: propertyTitle || (ct ? ct.property_id : undefined),
        memo: localizedMemo
      };
    }

    // H. Internal Transfer between Safe & Bank
    if (/(?:تحويل|نقل نقدية|Internal Transfer|Transfer)/i.test(combinedText)) {
      return {
        actionBadge: {
          label: isAr ? 'تحويل داخلي' : 'Transfer',
          bg: 'rgba(2, 132, 199, 0.08)',
          text: '#0284c7',
          border: 'rgba(2, 132, 199, 0.25)',
          icon: 'transfer'
        },
        headline: isAr ? 'تحويل نقدي داخلي بين الخزينة والبنك' : 'Internal Treasury Cash Transfer',
        contractNumber,
        referenceNumber,
        clientName,
        unitInfo,
        propertyTitle,
        memo: localizedMemo
      };
    }

    // I. Fallback General Entry
    return {
      actionBadge: {
        label: isAr ? 'قيد يومية' : 'Journal',
        bg: '#f1f5f9',
        text: '#475569',
        border: '#e2e8f0',
        icon: 'default'
      },
      headline: localizeJournalDescription(rawDesc, isAr),
      contractNumber,
      referenceNumber,
      clientName,
      unitInfo,
      propertyTitle,
      memo: localizedMemo
    };
  }, [resolveContract, resolvePropertyAndUnit, enrichMemo, isAr, account.account_code]);

  // 3. Gather all journal lines touching this account
  const accountLines: {
    entry_id: string;
    entry_number: string;
    entry_date: string;
    description: string;
    debit_amount: string;
    credit_amount: string;
    memo?: string;
    contract_id?: string;
    unit_id?: string;
  }[] = [];

  let totalDebits = D(0);
  let totalCredits = D(0);

  journalEntries.forEach(entry => {
    (entry.lines || []).forEach(line => {
      if (line.account_code === account.account_code) {
        const dr = D(line.debit_amount);
        const cr = D(line.credit_amount);
        totalDebits = totalDebits.plus(dr);
        totalCredits = totalCredits.plus(cr);

        accountLines.push({
          entry_id: entry.entry_id,
          entry_number: entry.entry_number,
          entry_date: entry.entry_date,
          description: entry.description,
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount,
          memo: line.memo,
          contract_id: line.contract_id || (entry.source_module === 'SALES' ? entry.source_entity_id : undefined),
          unit_id: line.unit_id
        });
      }
    });
  });

  // Calculate Running Balance
  const netBalance = account.normal_balance === 'DEBIT' 
    ? totalDebits.minus(totalCredits) 
    : totalCredits.minus(totalDebits);

  const isPositive = netBalance.greaterThan(0);
  const isZero = netBalance.isZero();

  // Search, Sort, and Pagination for Account Transactions with enriched text & parsed tags
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc'>('date_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const enrichedLines = useMemo(() => {
    return accountLines.map(line => {
      const enrichedDescription = enrichDescription(line);
      const enrichedMemo = enrichMemo(line);
      const parsed = parseTransaction(line);
      return {
        ...line,
        enrichedDescription,
        enrichedMemo,
        parsed
      };
    });
  }, [accountLines, enrichDescription, enrichMemo, parseTransaction]);

  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return enrichedLines;
    const q = searchQuery.toLowerCase();
    return enrichedLines.filter(line => 
      (line.entry_number || '').toLowerCase().includes(q) ||
      (line.description || '').toLowerCase().includes(q) ||
      (line.enrichedDescription || '').toLowerCase().includes(q) ||
      (line.memo || '').toLowerCase().includes(q) ||
      (line.enrichedMemo || '').toLowerCase().includes(q) ||
      (line.parsed.clientName || '').toLowerCase().includes(q) ||
      (line.parsed.contractNumber || '').toLowerCase().includes(q) ||
      (line.parsed.referenceNumber || '').toLowerCase().includes(q) ||
      (line.parsed.unitInfo || '').toLowerCase().includes(q) ||
      (line.parsed.propertyTitle || '').toLowerCase().includes(q) ||
      (line.parsed.headline || '').toLowerCase().includes(q)
    );
  }, [enrichedLines, searchQuery]);

  const sortedLines = useMemo(() => {
    const list = [...filteredLines];
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return (b.entry_date || '').localeCompare(a.entry_date || '');
      if (sortBy === 'date_asc') return (a.entry_date || '').localeCompare(b.entry_date || '');
      if (sortBy === 'amount_desc') {
        const valA = D(a.debit_amount || '0').plus(a.credit_amount || '0');
        const valB = D(b.debit_amount || '0').plus(b.credit_amount || '0');
        return valB.minus(valA).toNumber();
      }
      return 0;
    });
    return list;
  }, [filteredLines, sortBy]);

  const totalPages = Math.ceil(sortedLines.length / pageSize) || 1;
  const paginatedLines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLines.slice(start, start + pageSize);
  }, [sortedLines, currentPage, pageSize]);

  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportAccountLedgerExcel(
        account,
        journalEntries,
        netBalance.toNumber(),
        contracts,
        properties,
        isAr
      );
      toast.success(isAr ? 'تم تصدير كشف الحساب بنجاح إلى Excel' : 'Statement exported to Excel');
    } catch (err) {
      toast.error(isAr ? 'حدث خطأ أثناء تصدير الملف' : 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const voucherCode = `STM-${account.account_code}-${new Date().getFullYear()}`;
  const statementDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

  const printableLedgerBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* 1. Account Summary KPI Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '1rem',
        background: '#f8fafc'
      }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'كود الحساب' : 'Account Code'}
          </span>
          <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{account.account_code}</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'طبيعة الحساب' : 'Normal Balance'}
          </span>
          <strong style={{ fontSize: '0.95rem', color: '#334155' }}>
            {isAr ? (account.normal_balance === 'DEBIT' ? 'مدين (له فلوس)' : 'دائن (التزام عليه)') : account.normal_balance}
          </strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'إجمالي الحركات' : 'Transactions'}
          </span>
          <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{sortedLines.length}</strong>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
            {isAr ? 'الرصيد الصافي الحالي' : 'Net Balance'}
          </span>
          <strong style={{ fontSize: '1.2rem', color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
            {netBalance.formatEGP(isAr)}
          </strong>
        </div>
      </div>

      {/* 2. Statements Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}>
        <thead>
          <tr style={{ background: '#0f172a', color: '#ffffff' }}>
            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '5%' }}>#</th>
            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '12%' }}>{isAr ? 'التاريخ' : 'Date'}</th>
            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', width: '14%' }}>{isAr ? 'رقم القيد' : 'Entry #'}</th>
            <th style={{ padding: '0.6rem 0.75rem', textAlign: isAr ? 'right' : 'left', width: '37%' }}>{isAr ? 'البيان وشرح الحركة' : 'Description'}</th>
            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', width: '16%' }}>{isAr ? 'مدين (+)' : 'Debit'}</th>
            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', width: '16%' }}>{isAr ? 'دائن (-)' : 'Credit'}</th>
          </tr>
        </thead>
        <tbody>
          {sortedLines.map((line, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
              <td style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
              <td style={{ padding: '0.5rem', textAlign: 'center', color: '#334155' }}>{line.entry_date}</td>
              <td style={{ padding: '0.5rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{line.entry_number}</td>
              <td style={{ padding: '0.5rem 0.75rem', color: '#0f172a' }}>
                <div style={{ fontWeight: 700 }}>{line.parsed.headline}</div>
                {line.parsed.memo && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{line.parsed.memo}</div>}
              </td>
              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: D(line.debit_amount).isZero() ? '#94a3b8' : '#059669' }}>
                {D(line.debit_amount).isZero() ? '—' : D(line.debit_amount).formatEGP(isAr)}
              </td>
              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: D(line.credit_amount).isZero() ? '#94a3b8' : '#d97706' }}>
                {D(line.credit_amount).isZero() ? '—' : D(line.credit_amount).formatEGP(isAr)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a', fontWeight: 800 }}>
            <td colSpan={4} style={{ padding: '0.65rem 1rem', textAlign: isAr ? 'left' : 'right' }}>
              {isAr ? 'إجمالي الحركات والرصيد الصافي المعتمد:' : 'Totals & Audited Net Balance:'}
            </td>
            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#059669' }}>
              {totalDebits.formatEGP(isAr)}
            </td>
            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#d97706' }}>
              {totalCredits.formatEGP(isAr)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const activeFiltersCount = (searchQuery.trim() ? 1 : 0) + (sortBy !== 'date_desc' ? 1 : 0);

  const handleResetFilters = () => {
    setSortBy('date_desc');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const explanation = ACCOUNT_EXPLANATIONS[account.account_code] || {
    roleAr: `حساب ${account.account_name_ar} ضمن شجرة الحسابات المالية المعتمدة للشركة.`,
    roleEn: `${account.account_name_en} account within the standard chart of accounts.`,
    whenDebitedAr: account.normal_balance === 'DEBIT' ? 'بيزيد لما بتدخل فيه فلوس أو أصول أو مصاريف للشركة.' : 'بينقص لما بنسدد التزام أو بنسوي الرصيد.',
    whenCreditedAr: account.normal_balance === 'CREDIT' ? 'بيزيد لما بتثبت التزامات أو إيرادات جديدة.' : 'بينقص لما بيخرج كاش أو بيتم استهلاك الأصل.'
  };

  const typeColorMap: Record<string, { bg: string; text: string; border: string }> = {
    ASSET: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    LIABILITY: { bg: '#fffbeb', text: '#b45309', border: 'rgba(217, 119, 6, 0.25)' },
    CONTRA_LIABILITY: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    EQUITY: { bg: '#f8fafc', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' },
    REVENUE: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    EXPENSE: { bg: '#fffbeb', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' }
  };

  const getCategoryLabel = (type: string, isArLang: boolean) => {
    if (!isArLang) return type;
    switch (type) {
      case 'ASSET': return 'أصول وفلوس';
      case 'LIABILITY': return 'التزامات علينا';
      case 'CONTRA_LIABILITY': return 'تخفيض التزام';
      case 'EQUITY': return 'رأس مال';
      case 'REVENUE': return 'إيرادات ومبيعات';
      case 'EXPENSE': return 'مصاريف وتشغيل';
      default: return type;
    }
  };

  const colors = typeColorMap[account.account_type] || typeColorMap.ASSET;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        direction: isAr ? 'rtl' : 'ltr',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              padding: '0.65rem',
              borderRadius: '12px'
            }}>
              <Landmark size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: '#946f23',
                  background: '#fffbeb',
                  border: '1px solid rgba(184, 144, 62, 0.25)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px'
                }}>
                  {account.account_code}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: colors.text,
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px'
                }}>
                  {getCategoryLabel(account.account_type, isAr)}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#475569',
                  background: '#f1f5f9',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px'
                }}>
                  {isAr ? (account.normal_balance === 'DEBIT' ? 'مدين (له فلوس)' : 'دائن (التزام عليه)') : account.normal_balance}
                </span>
              </div>
              <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? account.account_name_ar : account.account_name_en}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {isAr ? account.account_name_en : account.account_name_ar}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#047857',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: isExportingExcel ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
              title={isAr ? 'تصدير كشف حساب كامل إلى Excel مع المخططات' : 'Export Statement to Excel'}
            >
              <FileSpreadsheet size={14} />
              <span>{isExportingExcel ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير Excel' : 'Export Excel')}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
              title={isAr ? 'طباعة كشف الحساب المعتمد' : 'Print Statement'}
            >
              <Printer size={14} />
              <span>{isAr ? 'طباعة الكشف' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrintPreview(true)}
              style={{
                background: 'rgba(184, 144, 62, 0.08)',
                border: '1px solid rgba(184, 144, 62, 0.25)',
                color: '#946f23',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease'
              }}
              title={isAr ? 'معاينة كشف الحساب المعتمد للطباعة' : 'Preview Statement'}
            >
              <FileText size={14} />
              <span>{isAr ? 'معاينة' : 'Preview'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                borderRadius: '8px',
                padding: '0.45rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Analytics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}>
            {/* Net Balance Card */}
            <div style={{
              background: isPositive ? '#f0fdf4' : '#f8fafc',
              border: isPositive ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                {isAr ? 'الرصيد الصافي الحالي بالحساب' : 'Current Ledger Balance'}
              </span>
              <div style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                fontFamily: 'var(--font-sans), sans-serif',
                fontVariantNumeric: 'tabular-nums',
                color: isZero ? '#64748b' : (isPositive ? '#15803d' : '#dc2626'),
                marginTop: '0.2rem'
              }}>
                {netBalance.formatEGP(isAr)}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {isAr 
                  ? (account.normal_balance === 'DEBIT' ? 'طبيعة الحساب: مدين (له فلوس / أصل ومصروف)' : 'طبيعة الحساب: دائن (التزام عليه / رأس مال وإيراد)')
                  : `Normal Balance: ${account.normal_balance}`}
              </span>
            </div>

            {/* Total Debits Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                {isAr ? 'إجمالي الفلوس اللي دخلت أو انصرفت له (مدين)' : 'Total Cumulative Debits'}
              </span>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: '#0f172a',
                marginTop: '0.2rem'
              }}>
                {totalDebits.formatEGP(isAr)}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? 'مدخلات أو أصول واردة' : 'Inflow / Debit postings'}
              </span>
            </div>

            {/* Total Credits Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                {isAr ? 'إجمالي الفلوس اللي خرجت أو التزمنا بيها (دائن)' : 'Total Cumulative Credits'}
              </span>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: '#15803d',
                marginTop: '0.2rem'
              }}>
                {totalCredits.formatEGP(isAr)}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? 'مخرجات أو التزامات قائمة' : 'Outflow / Credit postings'}
              </span>
            </div>
          </div>

          {/* Business Explanation Card */}
          <div style={{
            background: '#fffbeb',
            border: '1px solid rgba(184, 144, 62, 0.25)',
            borderRadius: '14px',
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#946f23' }}>
              <BookOpen size={16} />
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>
                {isAr ? 'إيه وظيفة الحساب ده وفلوسه رايحة فين؟' : 'Real Estate Accounting Function:'}
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
              {isAr ? explanation.roleAr : explanation.roleEn}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid rgba(184, 144, 62, 0.2)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{isAr ? 'إمتى بيزيد ويدخل فيه فلوس (مدين)؟ ' : 'When Debited: '}</span>
                <span>{isAr ? explanation.whenDebitedAr : 'Increases / Debited on inflows.'}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                <span style={{ color: '#15803d', fontWeight: 700 }}>{isAr ? 'إمتى بينقص ويخرج منه فلوس (دائن)؟ ' : 'When Credited: '}</span>
                <span>{isAr ? explanation.whenCreditedAr : 'Decreases / Credited on outflows.'}</span>
              </div>
            </div>
          </div>

          {/* Account Statement (Transactions) */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--zf-gold, #d4af37)" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'كشف حساب الحركات والقيود المرحلة' : 'Account Statement Transactions'}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Sort By */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ArrowUpDown size={12} color="#94a3b8" />
                  <select
                    value={sortBy}
                    onChange={e => {
                      setSortBy(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className={styles.sortSelect}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                    aria-label={isAr ? 'ترتيب الحركات' : 'Sort lines'}
                  >
                    <option value="date_desc">{isAr ? 'الأحدث تاريخاً' : 'Newest First'}</option>
                    <option value="date_asc">{isAr ? 'الأقدم تاريخاً' : 'Oldest First'}</option>
                    <option value="amount_desc">{isAr ? 'أعلى قيمة للحركة' : 'Highest Value'}</option>
                  </select>
                </div>

                {/* Reset Filters */}
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className={styles.resetFilterBtn}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                    title={isAr ? 'إعادة ضبط' : 'Reset'}
                  >
                    <RotateCcw size={11} />
                    <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
                  </button>
                )}

                {/* Search Box */}
                <div className={styles.searchBox} style={{ minWidth: '150px', height: '30px', padding: '0 0.5rem' }}>
                  <Search size={12} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder={isAr ? 'بحث بالقيد أو الوصف...' : 'Search entry or memo...'}
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={styles.searchInput}
                    style={{ fontSize: '0.72rem' }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <span style={{
                  fontSize: '0.72rem',
                  color: '#946f23',
                  background: '#fffbeb',
                  border: '1px solid rgba(184, 144, 62, 0.25)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  fontWeight: 700
                }}>
                  {isAr ? `${sortedLines.length} حركة` : `${sortedLines.length} Entries`}
                </span>
              </div>
            </div>

            {sortedLines.length === 0 ? (
              <div style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                color: '#64748b',
                fontSize: '0.82rem'
              }}>
                {accountLines.length === 0 
                  ? (isAr 
                    ? 'لم يتم ترحيل أي قيود يومية على هذا الحساب حتى الآن في الفترة الحالية.'
                    : 'No journal transactions have been posted to this account yet in the active period.')
                  : (isAr
                    ? 'لا توجد حركات تطابق نص البحث المحدد.'
                    : 'No transactions match the specified search term.')}
              </div>
            ) : (
              <>
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#ffffff'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: isAr ? 'right' : 'left', color: '#64748b' }}>
                          {isAr ? 'التاريخ ورقم القيد' : 'Date & Entry #'}
                        </th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: isAr ? 'right' : 'left', color: '#64748b', minWidth: '360px' }}>
                          {isAr ? 'بيان وشرح الحركة' : 'Description & Memo'}
                        </th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: isAr ? 'left' : 'right', color: '#0f172a' }}>
                          {isAr ? 'مدين (له فلوس)' : 'Debit'}
                        </th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: isAr ? 'left' : 'right', color: '#15803d' }}>
                          {isAr ? 'دائن (التزام عليه)' : 'Credit'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLines.map((line, idx) => {
                        const hasDebit = D(line.debit_amount).isPositive();
                        const hasCredit = D(line.credit_amount).isPositive();

                        return (
                          <tr 
                            key={`${line.entry_id}-${idx}`}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                            }}
                          >
                            <td style={{ padding: '0.75rem 0.85rem', verticalAlign: 'top' }}>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{line.entry_date}</div>
                              <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#946f23', fontSize: '0.76rem', marginTop: '2px' }}>
                                {line.entry_number}
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 0.95rem', verticalAlign: 'top', minWidth: '360px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.42rem' }}>
                                {/* Line 1: Action Badge + Main Headline */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    padding: '0.15rem 0.55rem',
                                    borderRadius: '6px',
                                    background: line.parsed.actionBadge.bg,
                                    color: line.parsed.actionBadge.text,
                                    border: `1px solid ${line.parsed.actionBadge.border}`,
                                    flexShrink: 0
                                  }}>
                                    {renderBadgeIcon(line.parsed.actionBadge.icon)}
                                    <span>{line.parsed.actionBadge.label}</span>
                                  </span>

                                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.84rem' }}>
                                    {line.parsed.headline}
                                  </span>
                                </div>

                                {/* Line 2: Entity Badges (Contract #, Reference #, Client, Unit/Property) */}
                                {(line.parsed.contractNumber || line.parsed.referenceNumber || line.parsed.clientName || line.parsed.unitInfo || line.parsed.propertyTitle) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    
                                    {/* Contract Code */}
                                    {line.parsed.contractNumber && (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        color: '#946f23',
                                        background: 'rgba(184, 144, 62, 0.08)',
                                        border: '1px solid rgba(184, 144, 62, 0.28)',
                                        padding: '0.12rem 0.45rem',
                                        borderRadius: '6px',
                                        fontFamily: 'monospace, tabular-nums'
                                      }}>
                                        <FileText size={11} />
                                        <span>#{line.parsed.contractNumber.replace(/^#/, '')}</span>
                                      </span>
                                    )}

                                    {/* Reference Code (e.g. InstaPay #IP-2026-6001) */}
                                    {line.parsed.referenceNumber && (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        color: '#2563eb',
                                        background: 'rgba(37, 99, 235, 0.08)',
                                        border: '1px solid rgba(37, 99, 235, 0.22)',
                                        padding: '0.12rem 0.45rem',
                                        borderRadius: '6px',
                                        fontFamily: 'monospace, tabular-nums'
                                      }}>
                                        <Zap size={11} />
                                        <span>#{line.parsed.referenceNumber.replace(/^#/, '')}</span>
                                      </span>
                                    )}

                                    {/* Client Name */}
                                    {line.parsed.clientName && (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontSize: '0.71rem',
                                        fontWeight: 700,
                                        color: '#1e3a8a',
                                        background: '#eff6ff',
                                        border: '1px solid #dbeafe',
                                        padding: '0.12rem 0.5rem',
                                        borderRadius: '6px'
                                      }}>
                                        <User size={11} style={{ flexShrink: 0 }} />
                                        <span>{line.parsed.clientName}</span>
                                      </span>
                                    )}

                                    {/* Unit and/or Property */}
                                    {(line.parsed.unitInfo || line.parsed.propertyTitle) && (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontSize: '0.71rem',
                                        fontWeight: 700,
                                        color: '#334155',
                                        background: '#f8fafc',
                                        border: '1px solid #cbd5e1',
                                        padding: '0.12rem 0.5rem',
                                        borderRadius: '6px'
                                      }}>
                                        <Building2 size={11} style={{ flexShrink: 0 }} />
                                        <span>
                                          {line.parsed.unitInfo ? `${line.parsed.unitInfo}` : ''}
                                          {line.parsed.unitInfo && line.parsed.propertyTitle ? ' • ' : ''}
                                          {line.parsed.propertyTitle || ''}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Line 3: Banking / Accounting Memo */}
                                {line.parsed.memo && (
                                  <div style={{
                                    fontSize: '0.71rem',
                                    color: '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    marginTop: '0.05rem',
                                    lineHeight: 1.4
                                  }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', transform: isAr ? 'scaleX(-1)' : 'none', display: 'inline-block' }}>↳</span>
                                    <span>{line.parsed.memo.replace(/^↳\s*/, '')}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', textAlign: isAr ? 'left' : 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: hasDebit ? '#0f172a' : '#94a3b8' }}>
                              {hasDebit ? D(line.debit_amount).formatEGP(isAr) : '—'}
                            </td>
                            <td style={{ padding: '0.75rem 0.85rem', textAlign: isAr ? 'left' : 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: hasCredit ? '#15803d' : '#94a3b8' }}>
                              {hasCredit ? D(line.credit_amount).formatEGP(isAr) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Modal Transactions */}
                <div style={{ marginTop: '0.75rem' }}>
                  <ZFPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={sortedLines.length}
                    pageSize={pageSize}
                    pageSizeOptions={[5, 10, 25, 50]}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={sz => {
                      setPageSize(sz);
                      setCurrentPage(1);
                    }}
                    isAr={isAr}
                    itemLabel={{ ar: 'حركة', en: 'entries' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#047857',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: isExportingExcel ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <FileSpreadsheet size={14} />
              <span>{isExportingExcel ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير كشف حساب Excel' : 'Export Excel')}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Printer size={14} />
              <span>{isAr ? 'طباعة كشف الحساب' : 'Print Statement'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, var(--zf-gold, #d4af37) 0%, #b89628 100%)',
              color: '#0a0c12',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1.25rem',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isAr ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>
      </div>

      {/* Screen Preview Modal */}
      {showPrintPreview && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto'
          }}
          onClick={() => setShowPrintPreview(false)}
        >
          <div 
            style={{ 
              maxWidth: '900px', 
              width: '100%', 
              maxHeight: '94vh', 
              overflowY: 'auto',
              borderRadius: '12px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <ZFPrintDocumentLayout
              documentTitle={isAr ? 'كشف حساب أستاذ معتمد' : 'Audited General Ledger Statement'}
              documentSubtitle={isAr ? `حساب: ${account.account_code} — ${account.account_name_ar}` : `Account: ${account.account_code} — ${account.account_name_en}`}
              voucherCode={voucherCode}
              date={statementDate}
              onClose={() => setShowPrintPreview(false)}
              isAr={isAr}
            >
              {printableLedgerBody}
            </ZFPrintDocumentLayout>
          </div>
        </div>
      )}

      {/* Hidden print container: rendered for @media print */}
      <div className="zf-print-only">
        <ZFPrintDocumentLayout
          documentTitle={isAr ? 'كشف حساب أستاذ معتمد' : 'Audited General Ledger Statement'}
          documentSubtitle={isAr ? `حساب: ${account.account_code} — ${account.account_name_ar}` : `Account: ${account.account_code} — ${account.account_name_en}`}
          voucherCode={voucherCode}
          date={statementDate}
          isAr={isAr}
        >
          {printableLedgerBody}
        </ZFPrintDocumentLayout>
      </div>
    </div>
  );
};
