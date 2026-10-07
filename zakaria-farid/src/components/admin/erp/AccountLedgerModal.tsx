'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
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
  FileSpreadsheet
} from 'lucide-react';
import { ERPAccount, ERPJournalEntry, ERPContract } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D, Decimal } from '@/lib/erp/math';
import { formatUnitWithFloor } from '@/lib/erp/projectStatusHelper';
import { toast } from 'sonner';
import { localizeJournalDescription, localizeJournalMemo, localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { exportAccountLedgerExcel } from '@/lib/erp/excelExporter';
import { ZFPrintDocumentLayout } from './v2/common/ZFPrintDocumentLayout';
import { ZFPagination } from './v2/ZFPagination';
import { ZFModalShell } from './v2/common/ZFModalShell';
import { ZFFacts, ZFEffect, ZFFormFooter, zfForm } from './v2/common/ZFForm';
import shellStyles from './v2/ZFWorkstationShell.module.css';
import styles from './AccountLedgerModal.module.css';

interface AccountLedgerModalProps {
  account: ERPAccount;
  journalEntries: ERPJournalEntry[];
  contracts?: ERPContract[];
  properties?: Property[];
  onClose: () => void;
  isAr: boolean;
}

const ACCOUNT_EXPLANATIONS: Record<string, { roleAr: string; roleEn: string; whenDebitedAr: string; whenCreditedAr: string }> = {
  '101000': {
    roleAr: 'الخزينة النقدية الرئيسية: الكاش الحاضر باليد في خزنة مقر الشركة بمنيا القمح لحركات القبض والصرف الفوري ونثريات الموقع.',
    roleEn: 'Physical cash safe in corporate headquarters for immediate receipts and petty operations.',
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
    case 'instapay': return <Zap size={11} aria-hidden="true" />;
    case 'down_payment': return <Coins size={11} aria-hidden="true" />;
    case 'installment': return <Coins size={11} aria-hidden="true" />;
    case 'handover': return <Key size={11} aria-hidden="true" />;
    case 'supplement': return <FileText size={11} aria-hidden="true" />;
    case 'expense': return <Hammer size={11} aria-hidden="true" />;
    case 'transfer': return <RotateCcw size={11} aria-hidden="true" />;
    default: return <BookOpen size={11} aria-hidden="true" />;
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

  const resolvePropertyAndUnit = useCallback((ct: ERPContract): { propTitle: string; unitInfo: string } => {
    let prop: Property | undefined;
    let unitInfo = ct.building_unit_number || '';

    if (ct.property_id && propertyLookup.byId.has(ct.property_id)) {
      prop = propertyLookup.byId.get(ct.property_id);
    }

    if (ct.unit_id && propertyLookup.byUnitId.has(ct.unit_id)) {
      const match = propertyLookup.byUnitId.get(ct.unit_id)!;
      if (!prop) prop = match.prop;
      if (!unitInfo && match.unitNumber) unitInfo = match.unitNumber;
    }

    if (!prop && ct.unit_id && propertyLookup.byId.has(ct.unit_id)) {
      prop = propertyLookup.byId.get(ct.unit_id);
    }

    if (prop && !unitInfo && prop.building_units && ct.unit_id) {
      const matchedUnit = prop.building_units.find(u => u.unit_id === ct.unit_id);
      if (matchedUnit) unitInfo = matchedUnit.unit_number;
    }

    if (!unitInfo && ct.unit_id) {
      unitInfo = ct.unit_id;
    }

    if (unitInfo) {
      const matchedUnit = prop?.building_units?.find(u => u.unit_id === ct.building_unit_id || u.unit_id === ct.unit_id || u.unit_number === unitInfo);
      if (matchedUnit) {
        unitInfo = formatUnitWithFloor(matchedUnit.unit_number, matchedUnit.floor, isAr);
      } else if (ct.building_unit_number && prop?.type === 'building') {
        unitInfo = formatUnitWithFloor(unitInfo, undefined, isAr);
      } else if (isAr) {
        // Retain existing standalone/generic-unit wording.
        unitInfo = unitInfo.replace(/^.*?apt-(\d+)/i, 'شقة $1').replace(/^.*?unit-(\d+)/i, 'وحدة $1');
        if (/^\d+$/.test(unitInfo.trim())) unitInfo = `شقة ${unitInfo.trim()}`;
      }
    }

    const propTitle = prop 
      ? (isAr ? (prop.title_ar || prop.title_en) : (prop.title_en || prop.title_ar)) 
      : '';

    return { propTitle, unitInfo };
  }, [propertyLookup, isAr]);

  const enrichDescription = useCallback((line: {
    description: string;
    entry_number: string;
    memo?: string;
    contract_id?: string;
  }): string => {
    const origDesc = line.description || '';
    if (!isAr) return origDesc;

    if (origDesc.includes('من العميل:') && (origDesc.includes('مرجع') || origDesc.includes('إنستاباي') || origDesc.includes('تحويل'))) {
      return origDesc;
    }

    const ct = resolveContract(line.contract_id, origDesc, line.entry_number, line.memo);

    if (ct) {
      const buyerName = localizeBuyerName(ct.buyer_name || 'العميل');
      const { propTitle, unitInfo } = resolvePropertyAndUnit(ct);
      
      const badgeParts: string[] = [];
      if (unitInfo) badgeParts.push(unitInfo);
      if (propTitle) badgeParts.push(propTitle);
      const detailsBadge = badgeParts.length > 0 ? ` [${badgeParts.join(' • ')}]` : '';

      const text = `${origDesc} ${line.memo || ''} ${line.entry_number || ''}`;

      const trancheMatch = text.match(/(?:Installment\s*#|القسط\s*رقم\s*|قسط\s*رقم\s*)(\d+)/i);
      if (trancheMatch) {
        const trancheNum = parseInt(trancheMatch[1], 10);
        if (trancheNum === 0) {
          return `تحصيل دفعة مقدم التعاقد بموجب عقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
        }
        return `تحصيل القسط رقم ${trancheNum} بموجب عقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
      }

      const isDownPayment = /(?:Advance Collection|الدفعة المقدمة|دفعة مقدم|مقدم الحجز|Customer advance|JE-PAY)/i.test(text);
      if (isDownPayment) {
        return `تحصيل دفعة مقدم التعاقد بموجب عقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
      }

      if (/(?:Handover|محضر تسليم|تسليم الوحدة|تسليم الشقة)/i.test(text)) {
        return `محضر تسليم الشقة النهائي واعتراف بإيراد المبيعات للعقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
      }

      if (/(?:Rescission|فسخ)/i.test(text)) {
        const hasForfeiture = /(?:Forfeiture|استقطاع)/i.test(text);
        return `فسخ وإلغاء التعاقد ${hasForfeiture ? '(مع استقطاع نسبة الفسخ) ' : ''}للعقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
      }

      return `تحصيل دفعة تعاقدية بموجب عقد رقم ${ct.contract_number} من العميل: ${buyerName}${detailsBadge}`;
    }

    const advMatch = origDesc.match(/(?:Advance Collection for Contract|تحصيل الدفعة المقدمة لعقد البيع رقم)\s*([A-Za-z0-9_-]+)(?:\s*\((.*?)\))?/i);
    if (advMatch) {
      const contractNum = advMatch[1];
      const rawBuyer = advMatch[2];
      const buyerName = rawBuyer ? localizeBuyerName(rawBuyer) : '';
      if (buyerName) {
        return `تحصيل دفعة مقدم التعاقد بموجب عقد رقم ${contractNum} من العميل: ${buyerName}`;
      }
    }

    return localizeJournalDescription(origDesc, isAr);
  }, [isAr, resolveContract, resolvePropertyAndUnit]);

  const enrichMemo = useCallback((line: {
    memo?: string;
    description: string;
    entry_number: string;
    contract_id?: string;
  }): string | undefined => {
    if (!isAr) return line.memo;

    const rawMemo = (line.memo || '').trim();

    if (rawMemo.includes('إنستاباي') || rawMemo.includes('مرجع') || rawMemo.includes('IP-')) {
      return localizeJournalMemo(rawMemo, isAr);
    }

    const textToScan = `${rawMemo} ${line.description || ''} ${line.entry_number || ''}`;
    const isDownPayment = /(?:Advance Collection|الدفعة المقدمة|دفعة مقدم|مقدم الحجز|قسط رقم 0|Installment\s*#0|Customer advance|JE-PAY)/i.test(textToScan);

    if (account.account_code === '102000') {
      if (isDownPayment || rawMemo.includes('Operating Bank') || rawMemo.includes('Customer advance') || rawMemo.includes('إيداع')) {
        return 'إيداع بنكي مباشر بحساب الشركة التشغيلي (102000) • إثبات دفعة التعاقد';
      }
    }

    if (account.account_code === '101000') {
      if (isDownPayment || rawMemo.includes('Treasury Safe') || rawMemo.includes('Safe') || rawMemo.includes('خزينة')) {
        return 'توريد كاش باليد لخزينة الشركة الرئيسية (101000) • إثبات دفعة التعاقد';
      }
    }

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

  const parseTransaction = useCallback((line: {
    description: string;
    entry_number: string;
    memo?: string;
    contract_id?: string;
    counter_codes?: string[];
  }): ParsedTransaction => {
    const rawDesc = line.description || '';
    const rawMemo = (line.memo || '').trim();
    const entryNum = line.entry_number || '';
    const combinedText = `${rawDesc} ${rawMemo} ${entryNum}`;

    const ct = resolveContract(line.contract_id, rawDesc, entryNum, rawMemo);
    const resolvedBuyer = ct ? localizeBuyerName(ct.buyer_name || '') : '';
    const { propTitle: resolvedProp, unitInfo: resolvedUnit } = ct 
      ? resolvePropertyAndUnit(ct) 
      : { propTitle: '', unitInfo: '' };

    const refMatch = combinedText.match(/(?:مرجع\s*رقم|مرجع\s*#|مرجع|Ref\s*#?)\s*[:#]?\s*([A-Za-z0-9_-]+)/i) ||
                     combinedText.match(/\b(IP-\d{4}-\d+)\b/i) ||
                     combinedText.match(/\b(SUP-[A-Za-z0-9_-]+)\b/i);
    const referenceNumber = refMatch ? (refMatch[1] || refMatch[0]).trim() : undefined;

    const ctMatch = combinedText.match(/\b((?:ZF|CONT|CT)-\d{4}-\d+)\b/i) ||
                    combinedText.match(/(?:عقد\s*رقم|عقد|Contract\s*#?)\s*[:#]?\s*([A-Za-z0-9_-]+)/i);
    const contractNumber = ct?.contract_number || (ctMatch ? (ctMatch[1] || ctMatch[0]).trim() : undefined);

    let clientName = resolvedBuyer;
    if (!clientName) {
      const clientMatch = combinedText.match(/(?:من العميل|العميل|المشتري|Client)\s*[:#]?\s*([^-\[\(,\n\r]+)/i);
      if (clientMatch) {
        clientName = localizeBuyerName(clientMatch[1].trim());
      }
    }

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

    const localizedMemo = enrichMemo(line);

    // Label from the accounts on the entry first; memo-text guessing below is only a fallback
    // (it labelled a cash down payment as a handover because the memo said "استلام").
    const counters = line.counter_codes || [];
    const isTreasury = (code: string) => code === '101000' || code === '102000';
    const own = account.account_code;
    const base = { contractNumber, referenceNumber, clientName, unitInfo, propertyTitle, memo: localizedMemo };
    if (isTreasury(own) && counters.some(isTreasury)) {
      return { ...base, actionBadge: { label: isAr ? 'تحويل' : 'Transfer', icon: 'transfer' },
        headline: isAr ? 'تحويل بين الخزينة وإنستاباي' : 'Transfer between Safe and InstaPay' };
    }
    if (isTreasury(own) && counters.some(c => c.startsWith('203'))) {
      const tranche = combinedText.match(/(?:Installment\s*#|القسط\s*رقم\s*|قسط\s*رقم\s*)(\d+)/i);
      const n = tranche ? parseInt(tranche[1], 10) : null;
      const isDown = n === 0 || /(?:الدفعة المقدمة|دفعة مقدم|مقدم|Advance|Down payment)/i.test(combinedText);
      return { ...base,
        actionBadge: { label: own === '102000' ? (isAr ? 'إنستاباي' : 'InstaPay') : (isAr ? 'نقدي' : 'Cash'), icon: own === '102000' ? 'instapay' : 'down_payment' },
        headline: isDown ? (isAr ? 'تحصيل دفعة المقدم من العميل' : 'Down payment collected')
          : n ? (isAr ? `تحصيل القسط رقم ${n}` : `Installment #${n} collected`)
          : (isAr ? 'تحصيل من عميل' : 'Client collection') };
    }
    if (isTreasury(own) && counters.some(c => c.startsWith('2062'))) {
      return { ...base, actionBadge: { label: isAr ? 'فسخ' : 'Refund', icon: 'expense' },
        headline: isAr ? 'رد مبلغ لعميل بعد فسخ العقد' : 'Refund to client after rescission' };
    }
    if (isTreasury(own) && counters.some(c => c.startsWith('303'))) {
      return { ...base, actionBadge: { label: isAr ? 'صرف للشريك' : 'Payout', icon: 'expense' },
        headline: isAr ? 'صرف أرباح لشريك' : 'Partner payout' };
    }
    if (isTreasury(own) && counters.some(c => c.startsWith('301') || c.startsWith('302'))) {
      return { ...base, actionBadge: { label: isAr ? 'تمويل شريك' : 'Funding', icon: 'transfer' },
        headline: isAr ? 'تمويل من شريك' : 'Partner funding' };
    }

    if (combinedText.includes('إنستاباي') || combinedText.includes('IP-') || combinedText.includes('InstaPay')) {
      return {
        actionBadge: {
          label: isAr ? 'إنستاباي' : 'InstaPay',
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

    const trancheMatch = combinedText.match(/(?:Installment\s*#|القسط\s*رقم\s*|قسط\s*رقم\s*)(\d+)/i);
    if (trancheMatch) {
      const trancheNum = parseInt(trancheMatch[1], 10);
      if (trancheNum === 0) {
        return {
          actionBadge: {
            label: isAr ? 'مقدم تعاقد' : 'Advance',
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
          label: isAr ? `قسط #${trancheNum}` : `Tranche #${trancheNum}`,
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

    if (/(?:Advance Collection|الدفعة المقدمة|دفعة مقدم|مقدم الحجز|Customer advance|JE-PAY)/i.test(combinedText)) {
      return {
        actionBadge: {
          label: isAr ? 'مقدم تعاقد' : 'Advance',
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

    if (/(?:Handover|محضر تسليم|تسليم الوحدة|تسليم الشقة)/i.test(combinedText)) {
      return {
        actionBadge: {
          label: isAr ? 'تسليم' : 'Handover',
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

    if (/(?:SUP-|ملحق|تشطيبات|تعديلات|Supplement)/i.test(combinedText)) {
      return {
        actionBadge: {
          label: isAr ? 'ملحق تعاقدي' : 'Supplement',
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

    if (account.account_code === '105000' || /(?:خرسانات|حديد|أسمنت|تشطيبات|مقاول|موقع|WIP|construction|materials)/i.test(combinedText)) {
      return {
        actionBadge: {
          label: isAr ? 'خامات ومباني' : 'WIP Costs',
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

    if (/(?:تحويل|نقل نقدية|Internal Transfer|Transfer)/i.test(combinedText)) {
      return {
        actionBadge: {
          label: isAr ? 'تحويل داخلي' : 'Transfer',
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

    return {
      actionBadge: {
        label: isAr ? 'قيد يومية' : 'Journal',
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

  const { accountLines, totalDebits, totalCredits, netBalance } = useMemo(() => {
    const lines: {
      entry_id: string;
      entry_number: string;
      entry_date: string;
      description: string;
      debit_amount: string;
      credit_amount: string;
      memo?: string;
      contract_id?: string;
      unit_id?: string;
      counter_codes?: string[];
    }[] = [];
    let debits = D(0);
    let credits = D(0);

    journalEntries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        const isExact = line.account_code === account.account_code;
        const isChild = account.account_code.endsWith('000') && line.account_code.startsWith(account.account_code.slice(0, 3));
        if (!isExact && !isChild) return;
        debits = debits.plus(D(line.debit_amount));
        credits = credits.plus(D(line.credit_amount));
        lines.push({
          entry_id: entry.entry_id,
          entry_number: entry.entry_number,
          entry_date: entry.entry_date,
          description: entry.description,
          debit_amount: line.debit_amount,
          credit_amount: line.credit_amount,
          memo: line.memo,
          contract_id: line.contract_id || (entry.source_module === 'SALES' ? entry.source_entity_id : undefined),
          unit_id: line.unit_id,
          counter_codes: (entry.lines || []).filter(other => other !== line).map(other => other.account_code)
        });
      });
    });
    const net = account.normal_balance === 'DEBIT'
      ? debits.minus(credits)
      : credits.minus(debits);
    return { accountLines: lines, totalDebits: debits, totalCredits: credits, netBalance: net };
  }, [journalEntries, account.account_code, account.normal_balance]);

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
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء تصدير الملف' : 'Export failed');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleResetFilters = () => {
    setSortBy('date_desc');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const explanation = ACCOUNT_EXPLANATIONS[account.account_code] || {
    roleAr: `حساب ${account.account_name_ar} ضمن شجرة الحسابات المالية المعتمدة للشركة.`,
    roleEn: `${account.account_name_en} account within standard chart of accounts.`,
    whenDebitedAr: account.normal_balance === 'DEBIT' ? 'بيزيد لما بتدخل فيه فلوس أو أصول أو مصاريف للشركة.' : 'بينقص لما بنسدد التزام أو بنسوي الرصيد.',
    whenCreditedAr: account.normal_balance === 'CREDIT' ? 'بيزيد لما بتثبت التزامات أو إيرادات جديدة.' : 'بينقص لما بيخرج كاش أو بيتم استهلاك الأصل.'
  };

  const fmtMoney = (val: string | number | Decimal) => {
    const n = Number(D(val).toNumber());
    return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${isAr ? 'ج.م' : 'EGP'}`;
  };

  const generatedAt = new Date();
  const voucherCode = `STM-${account.account_code}-${generatedAt.toISOString().slice(0, 10)}`;
  const statementDate = generatedAt.toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

  const printableLedgerBody = (
    <div className={styles.printableStack} dir={isAr ? 'rtl' : 'ltr'}>
      <div className={styles.printKpiGrid}>
        <div>
          <span className={styles.printKpiLabel}>{isAr ? 'كود الحساب' : 'Account Code'}</span>
          <strong className={styles.printKpiValue}>{account.account_code}</strong>
        </div>
        <div>
          <span className={styles.printKpiLabel}>{isAr ? 'طبيعة الحساب' : 'Normal Balance'}</span>
          <strong className={styles.printKpiValue}>
            {isAr ? (account.normal_balance === 'DEBIT' ? 'مدين' : 'دائن') : account.normal_balance}
          </strong>
        </div>
        <div>
          <span className={styles.printKpiLabel}>{isAr ? 'إجمالي الحركات' : 'Transactions'}</span>
          <strong className={styles.printKpiValue}>{enrichedLines.length}</strong>
        </div>
        <div>
          <span className={styles.printKpiLabel}>{isAr ? 'الرصيد الصافي الحالي' : 'Net Balance'}</span>
          <strong className={styles.printKpiValue}>{fmtMoney(netBalance)}</strong>
        </div>
      </div>

      <table className={styles.printTable}>
        <thead>
          <tr>
            <th className={styles.printThCenter}>#</th>
            <th className={styles.printThCenter}>{isAr ? 'التاريخ' : 'Date'}</th>
            <th className={styles.printThCenter}>{isAr ? 'رقم القيد' : 'Entry #'}</th>
            <th className={styles.printTh}>{isAr ? 'البيان وشرح الحركة' : 'Description'}</th>
            <th className={styles.printThNum}>{isAr ? 'مدين' : 'Debit'}</th>
            <th className={styles.printThNum}>{isAr ? 'دائن' : 'Credit'}</th>
          </tr>
        </thead>
        <tbody>
          {enrichedLines.map((line, idx) => (
            <tr key={idx} className={styles.printTr}>
              <td className={styles.printTdCenter}>{idx + 1}</td>
              <td className={styles.printTdCenter}>{line.entry_date}</td>
              <td className={styles.printTdCenter}>{line.entry_number}</td>
              <td className={styles.printTd}>
                <div>{line.parsed.headline}</div>
                {line.parsed.memo && <div className={styles.memoRow}>{line.parsed.memo}</div>}
              </td>
              <td className={styles.printTdNum}>
                {D(line.debit_amount).isZero() ? '—' : fmtMoney(line.debit_amount)}
              </td>
              <td className={styles.printTdNum}>
                {D(line.credit_amount).isZero() ? '—' : fmtMoney(line.credit_amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className={styles.printTfoot}>
          <tr>
            <td colSpan={4} className={styles.printTd}>
              {isAr ? 'إجمالي طرفي الحركة:' : 'Debit and credit totals:'}
            </td>
            <td className={styles.printTdNum}>{fmtMoney(totalDebits)}</td>
            <td className={styles.printTdNum}>{fmtMoney(totalCredits)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const activeFiltersCount = (searchQuery.trim() ? 1 : 0) + (sortBy !== 'date_desc' ? 1 : 0);

  const footer = (
    <ZFFormFooter aside={<span className={styles.footerCount}>{isAr ? `${accountLines.length} حركة مسجلة` : `${accountLines.length} recorded movements`}</span>}>
      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={handleExportExcel}
        disabled={isExportingExcel}
      >
        <FileSpreadsheet size={14} aria-hidden="true" />
        <span>{isExportingExcel ? (isAr ? 'جاري التصدير…' : 'Exporting…') : (isAr ? 'تصدير Excel' : 'Export Excel')}</span>
      </button>

      <button
        type="button"
        className={shellStyles.btnSecondary}
        onClick={() => setShowPrintPreview(true)}
      >
        <FileText size={14} aria-hidden="true" />
        <span>{isAr ? 'معاينة للطباعة' : 'Print preview'}</span>
      </button>

      <button
        type="button"
        className={shellStyles.btnPrimary}
        onClick={onClose}
      >
        {isAr ? 'إغلاق' : 'Close'}
      </button>
    </ZFFormFooter>
  );

  return (
    <>
      <ZFModalShell
        isOpen={true}
        onClose={onClose}
        isAr={isAr}
        maxWidth="min(1100px, 94vw)"
        title={isAr ? account.account_name_ar : account.account_name_en}
        subtitle={
          isAr
            ? `حركات ورصيد الحساب بدفتر الأستاذ العام.`
            : `Movements and balance for ${account.account_name_en}.`
        }
        icon={<BookOpen size={18} aria-hidden="true" />}
        footer={footer}
      >
        <div className={zfForm.form}>
          {/* 1. Account Facts */}
          <ZFFacts
            items={[
              { label: isAr ? 'كود الحساب' : 'Account code', value: account.account_code },
              {
                label: isAr ? 'طبيعة الحساب' : 'Normal balance',
                value: isAr ? (account.normal_balance === 'DEBIT' ? 'مدين' : 'دائن') : account.normal_balance
              },
              { label: isAr ? 'إجمالي المدين' : 'Total debits', value: fmtMoney(totalDebits) },
              { label: isAr ? 'إجمالي الدائن' : 'Total credits', value: fmtMoney(totalCredits) },
              {
                label: isAr ? 'الرصيد الصافي' : 'Net balance',
                value: fmtMoney(netBalance),
                tone: netBalance.lt(0) ? 'neg' : netBalance.gt(0) ? 'pos' : undefined
              }
            ]}
          />

          {/* 2. Transactions Section */}
          <div className={zfForm.section}>
            <div className={styles.tableHeaderRow}>
              <h4 className={zfForm.sectionTitle}>
                {isAr ? 'حركات وقيود الحساب' : 'Account movements'}
              </h4>

              <div className={styles.filterControls}>
                {/* Sort */}
                <div className={styles.sortWrap}>
                  <ArrowUpDown size={12} color="#94a3b8" aria-hidden="true" />
                  <select
                    value={sortBy}
                    onChange={e => {
                      setSortBy(e.target.value as typeof sortBy);
                      setCurrentPage(1);
                    }}
                    className={styles.sortSelect}
                    aria-label={isAr ? 'ترتيب الحركات' : 'Sort lines'}
                  >
                    <option value="date_desc">{isAr ? 'الأحدث تاريخاً' : 'Newest First'}</option>
                    <option value="date_asc">{isAr ? 'الأقدم تاريخاً' : 'Oldest First'}</option>
                    <option value="amount_desc">{isAr ? 'أعلى قيمة' : 'Highest Value'}</option>
                  </select>
                </div>

                {/* Reset Filters */}
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className={styles.resetBtn}
                    title={isAr ? 'إعادة ضبط' : 'Reset'}
                  >
                    <RotateCcw size={11} aria-hidden="true" />
                    <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
                  </button>
                )}

                {/* Search Box */}
                <div className={styles.searchWrap}>
                  <Search size={12} className={styles.searchIcon} aria-hidden="true" />
                  <input
                    type="text"
                    placeholder={isAr ? 'بحث بالقيد أو البيان…' : 'Search entry or memo…'}
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={styles.searchInput}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className={styles.clearSearchBtn}
                      aria-label={isAr ? 'مسح البحث' : 'Clear search'}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <span className={styles.countPill}>
                  {isAr ? `${sortedLines.length} حركة` : `${sortedLines.length} entries`}
                </span>
              </div>
            </div>

            {sortedLines.length === 0 ? (
              <div className={styles.emptyState}>
                {accountLines.length === 0 
                  ? (isAr ? 'لا توجد حركات مسجلة على هذا الحساب حتى الآن.' : 'No movements recorded for this account yet.')
                  : (isAr ? 'لا توجد حركات تطابق نص البحث المحدد.' : 'No movements match the search criteria.')}
              </div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>
                          {isAr ? 'التاريخ ورقم القيد' : 'Date & Entry #'}
                        </th>
                        <th className={styles.th}>
                          {isAr ? 'البيان وشرح الحركة' : 'Description & Memo'}
                        </th>
                        <th className={styles.thNum}>
                          {isAr ? 'مدين' : 'Debit'}
                        </th>
                        <th className={styles.thNum}>
                          {isAr ? 'دائن' : 'Credit'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLines.map((line, idx) => {
                        const hasDebit = D(line.debit_amount).isPositive();
                        const hasCredit = D(line.credit_amount).isPositive();

                        return (
                          <tr key={`${line.entry_id}-${idx}`} className={styles.tr}>
                            <td className={styles.tdDate}>
                              <div className={styles.dateText}>{line.entry_date}</div>
                              <div className={styles.entryNum}>{line.entry_number}</div>
                            </td>
                            <td className={styles.tdDesc}>
                              <div className={styles.descStack}>
                                {/* Headline and Action Badge */}
                                <div className={styles.headlineRow}>
                                  <span className={styles.actionBadge}>
                                    {renderBadgeIcon(line.parsed.actionBadge.icon)}
                                    <span>{line.parsed.actionBadge.label}</span>
                                  </span>

                                  <span className={styles.headline}>
                                    {line.parsed.headline}
                                  </span>
                                </div>

                                {/* Tags */}
                                {(line.parsed.contractNumber || line.parsed.referenceNumber || line.parsed.clientName || line.parsed.unitInfo || line.parsed.propertyTitle) && (
                                  <div className={styles.tagsRow}>
                                    {line.parsed.contractNumber && (
                                      <span className={styles.tagPill}>
                                        <FileText size={11} aria-hidden="true" />
                                        <span>#{line.parsed.contractNumber.replace(/^#/, '')}</span>
                                      </span>
                                    )}

                                    {line.parsed.referenceNumber && (
                                      <span className={styles.tagPill}>
                                        <Zap size={11} aria-hidden="true" />
                                        <span>#{line.parsed.referenceNumber.replace(/^#/, '')}</span>
                                      </span>
                                    )}

                                    {line.parsed.clientName && (
                                      <span className={styles.tagPill}>
                                        <User size={11} aria-hidden="true" />
                                        <span>{line.parsed.clientName}</span>
                                      </span>
                                    )}

                                    {(line.parsed.unitInfo || line.parsed.propertyTitle) && (
                                      <span className={styles.tagPill}>
                                        <Building2 size={11} aria-hidden="true" />
                                        <span>
                                          {line.parsed.unitInfo ? `${line.parsed.unitInfo}` : ''}
                                          {line.parsed.unitInfo && line.parsed.propertyTitle ? ' • ' : ''}
                                          {line.parsed.propertyTitle || ''}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Memo */}
                                {line.parsed.memo && (
                                  <div className={styles.memoRow}>
                                    <span className={styles.memoArrow} aria-hidden="true">↳</span>
                                    <span>{line.parsed.memo.replace(/^↳\s*/, '')}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className={styles.tdDebit}>
                              {hasDebit ? fmtMoney(line.debit_amount) : <span className={styles.emptyAmount}>—</span>}
                            </td>
                            <td className={styles.tdCredit}>
                              {hasCredit ? fmtMoney(line.credit_amount) : <span className={styles.emptyAmount}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.paginationWrap}>
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

          {/* 3. Account Guide Section */}
          <details className={styles.guideDetails}>
            <summary className={styles.guideSummary}>
              {isAr ? 'دليل استخدام الحساب' : 'How this account works'}
            </summary>
            <div className={styles.guideContent}>
              <ZFEffect>
                <p>{isAr ? explanation.roleAr : explanation.roleEn}</p>
                <p>
                  <strong>{isAr ? 'عند المدين: ' : 'When debited: '}</strong>
                  {isAr ? explanation.whenDebitedAr : 'Debit postings increase the debit side.'}
                </p>
                <p>
                  <strong>{isAr ? 'عند الدائن: ' : 'When credited: '}</strong>
                  {isAr ? explanation.whenCreditedAr : 'Credit postings increase the credit side.'}
                </p>
              </ZFEffect>
            </div>
          </details>
        </div>
      </ZFModalShell>

      {/* Screen Preview Modal */}
      {showPrintPreview && (
        <div 
          className={styles.printOverlay}
          onClick={() => setShowPrintPreview(false)}
        >
          <div 
            className={styles.printCard}
            onClick={e => e.stopPropagation()}
          >
            <ZFPrintDocumentLayout
              documentTitle={isAr ? 'كشف حساب الأستاذ' : 'General Ledger Statement'}
              documentSubtitle={isAr ? `حساب: ${account.account_code} — ${account.account_name_ar}` : `Account: ${account.account_code} — ${account.account_name_en}`}
              voucherCode={voucherCode}
              date={statementDate}
              onClose={() => setShowPrintPreview(false)}
              isAr={isAr}
              isReport
            >
              {printableLedgerBody}
            </ZFPrintDocumentLayout>
          </div>
        </div>
      )}

      {/* Hidden print container: rendered for @media print */}
      <div className="zf-print-only">
        <ZFPrintDocumentLayout
          documentTitle={isAr ? 'كشف حساب الأستاذ' : 'General Ledger Statement'}
          documentSubtitle={isAr ? `حساب: ${account.account_code} — ${account.account_name_ar}` : `Account: ${account.account_code} — ${account.account_name_en}`}
          voucherCode={voucherCode}
          date={statementDate}
          isAr={isAr}
          isReport
        >
          {printableLedgerBody}
        </ZFPrintDocumentLayout>
      </div>
    </>
  );
};
