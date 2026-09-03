'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp,
  Building2,
  FileText,
  Calculator,
  Landmark,
  BookOpen,
  PieChart,
  ShieldCheck,
  RotateCcw,
  Layers,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';
import { ERPNavModule } from './ZFNavigationDock';

export interface TourStep {
  moduleId: ERPNavModule;
  targetSelector: string;
  groupAr: string;
  groupEn: string;
  titleAr: string;
  titleEn: string;
  badgeLabelAr: string;
  badgeLabelEn: string;
  purposeAr: string;
  purposeEn: string;
  capabilitiesAr: string[];
  capabilitiesEn: string[];
  accountingImpactAr: string;
  accountingImpactEn: string;
  icon: React.ElementType;
}

interface ZFErpGuidedTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onNavigateToModule?: (module: ERPNavModule) => void;
  isAr?: boolean;
}

const SIDEBAR_TOUR_STEPS: TourStep[] = [
  {
    moduleId: 'cockpit',
    targetSelector: '[data-tour="nav-item-cockpit"]',
    groupAr: 'القيادة والتحليل المالي',
    groupEn: 'COMMAND & ANALYTICS',
    titleAr: 'لوحة القيادة المالية والمنحنى المالي',
    titleEn: 'Financial Cockpit & Horizon Forecast',
    badgeLabelAr: 'المركز الرئيسي',
    badgeLabelEn: 'COMMAND HUB',
    purposeAr: 'شاشة القيادة والمراقبة التنفيذية البانورامية للمنظومة بالكامل؛ تعرض التدفقات النقدية اللحظية، والتقويم المالي الشهري، وأجندة العمليات اليومية.',
    purposeEn: 'Executive cockpit providing real-time panoramic telemetry across platform liquidity, capital mindmap, monthly calendar, and today’s action ledger.',
    capabilitiesAr: [
      'خريطة تدفقات رأس المال (Mindmap) لرصد المبيعات والسيولة النقدية وتكاليف WIP',
      'التقويم المالي التفاعلي لشهر كامل لمتابعة استحقاقات الشيكات والأقساط يوماً بيوم',
      'أجندة واستحقاقات اليوم والتحذيرات الرقابية مع أزرار التحصيل والمعاينة الفورية',
      'استوديو التحليل المالي ومنحنيات هورايزون للتنبؤ المستقبلي (IFRS 15 Horizon)'
    ],
    capabilitiesEn: [
      'Capital Flow Mindmap tracking booked sales, liquidity, and WIP outflows',
      'Full monthly financial calendar mapping cheque maturities and contract tranches',
      'Today’s Action Ledger with instant collection and contract inspection buttons',
      'Analytical Studio with IFRS 15 Cashflow Horizon & S-Curve projections'
    ],
    accountingImpactAr: 'المراقبة المستمرة لتوازن الأستاذ العام (مدين = دائن 0.00) وحجم السيولة النقدية الحرة بالخزينة.',
    accountingImpactEn: 'Continuous monitoring of Double-Entry invariant (Dr = Cr 0.00) and unallocated treasury liquidity.',
    icon: TrendingUp
  },
  {
    moduleId: 'properties',
    targetSelector: '[data-tour="nav-item-properties"]',
    groupAr: 'القيادة والتحليل المالي',
    groupEn: 'COMMAND & ANALYTICS',
    titleAr: 'المشاريع والأصول الإنشائية (WIP)',
    titleEn: 'Projects & Capitalized Assets (WIP)',
    badgeLabelAr: 'الأصول والمشروعات',
    badgeLabelEn: 'WIP ASSETS',
    purposeAr: 'السجل الشامل لمحفظة المشروعات والأصول العقارية؛ يتيح تتبع تكاليف التطوير المتكبدة (WIP)، حصر الوحدات المتاحة والمباعة، وتوزيع نسب أرباح الشركاء.',
    purposeEn: 'Comprehensive project catalog tracking incurred development costs (WIP), inventory status, and shareholder equity distributions.',
    capabilitiesAr: [
      'متابعة التكاليف الإنشائية المتراكمة على كل مشروع عبر حسابات الأصول (120100 - 120400)',
      'حصر حالة كل وحدة عقارية بدقة (متاحة للبيع، محجوزة، متعاقد عليها، مسلمة)',
      'إدارة وتوزيع نسب الشركاء وحصص رأس المال لكل مشروع استثماري',
      'استعراض القيمة التقديرية للمحفظة الإجمالية ومؤشرات التسعير'
    ],
    capabilitiesEn: [
      'Track capitalized construction WIP across Land, Civil, MEP & Finishes',
      'Monitor real-time unit statuses (Available, Reserved, Contracted, Handed Over)',
      'Manage partner equity splits and capital calls per project',
      'Review total catalog valuation and inventory pricing'
    ],
    accountingImpactAr: 'رسملة نفقات المقاولين والمواد الخام في حساب مخزون تطوير عقاري (WIP 105000) كأصول متداولة.',
    accountingImpactEn: 'Capitalizes raw contractor and material expenses into GL 105000 project inventory.',
    icon: Building2
  },
  {
    moduleId: 'contracts',
    targetSelector: '[data-tour="nav-item-contracts"]',
    groupAr: 'المبيعات والعمليات التعاقدية',
    groupEn: 'SALES & DEALS PIPELINE',
    titleAr: 'سجل عقود البيع وتتبع الأقساط',
    titleEn: 'Sales Contracts Registry & Pipeline',
    badgeLabelAr: 'العقود والبيع',
    badgeLabelEn: 'SALES DEALS',
    purposeAr: 'المركز القانوني والمالي الموثق لكافة عقود البيع؛ تحرير العقود الجديدة عبر معالج ذكي من ٣ خطوات، متابعة خطط السداد، وجداول الأقساط، وإدارة التسليمات.',
    purposeEn: 'Audited legal and financial registry for all sales contracts; book new contracts via 3-step wizard, manage installments, and track handovers.',
    capabilitiesAr: [
      'تحرير عقود بيع رسمية بمعالج تنفيذي فاخر مع منع تكرار بيع الوحدة المتعاقد عليها',
      'توليد جداول الأقساط الربع سنوية ونصف السنوية وتواريخ استحقاقها آلياً',
      'إدارة محاضر تسليم الوحدات (Handover) والتحول من مرحلة الإنشاء للتشغيل',
      'توثيق التعديلات السعرية (Escalations) بملحق رسمي واعتماد محاسبي'
    ],
    capabilitiesEn: [
      'Book sales contracts with validation preventing duplicate unit sales',
      'Automatically generate quarterly installment schedules and maturity dates',
      'Process unit handovers to trigger completion and delivery recognition',
      'Document construction cost escalations with formal addenda'
    ],
    accountingImpactAr: 'قيد إثبات المديونية التعاقدية (مدينو عقود 103000) والتزام إيراد مؤجل (203000) حتى التسليم الفعلي.',
    accountingImpactEn: 'Recognizes contract receivables (103000) and deferred revenue liability (203000) until delivery.',
    icon: FileText
  },
  {
    moduleId: 'calculator',
    targetSelector: '[data-tour="nav-item-calculator"]',
    groupAr: 'المبيعات والعمليات التعاقدية',
    groupEn: 'SALES & DEALS PIPELINE',
    titleAr: 'حاسبة وهيكلة الأقساط المالية',
    titleEn: 'Installment Structuring & Calculator',
    badgeLabelAr: 'الهيكلة والتسعير',
    badgeLabelEn: 'STRUCTURING',
    purposeAr: 'المحاكي المالي لتسعير وتصميم عروض السداد؛ يتيح هيكلة الأقساط، تخصيص نسب المقدم والاستلام، واحتساب خصومات الدفع الفوري (Cash Discounts).',
    purposeEn: 'Financial pricing simulator to design installment schedules, customize down payments, handover tranches, and compute upfront cash discounts.',
    capabilitiesAr: [
      'محاكاة خطط السداد وتوليد سيناريوهات أقساط مرنة تناسب المشتري',
      'احتساب نسب الدفعة المقدمة ودفعات الاستلام وضبط التوزيع الزمني',
      'محاكاة واحتساب خصومات السداد الكاش الفوري بدقة محاسبية',
      'المعاينة الفورية لجدول الدفعات ومقارنتها بالتدفقات النقدية المستهدفة'
    ],
    capabilitiesEn: [
      'Simulate flexible payment plans and custom installment scenarios',
      'Calculate down payment and delivery balloon payments with precise timing',
      'Compute upfront cash discounts with audited financial accuracy',
      'Preview cash inflow schedules against project construction milestones'
    ],
    accountingImpactAr: 'ضمان توافق فترات استحقاق الأقساط مع احتياجات السيولة التشغيلية للمشروع.',
    accountingImpactEn: 'Aligns installment inflow maturities directly with project operational cash expenditure milestones.',
    icon: Calculator
  },
  {
    moduleId: 'pdc',
    targetSelector: '[data-tour="nav-item-pdc"]',
    groupAr: 'المبيعات والعمليات التعاقدية',
    groupEn: 'SALES & DEALS PIPELINE',
    titleAr: 'حافظة شيكات الخزينة المؤجلة (PDC)',
    titleEn: 'PDC Cheques Vault & Life-Cycle',
    badgeLabelAr: 'الخزينة والشيكات',
    badgeLabelEn: 'CHEQUES VAULT',
    purposeAr: 'الخزينة الإلكترونية للشيكات المؤجلة (حساب ١٠٤٠٠٠)؛ إدارة دورة حياة الشيك كاملة (بالخزينة، مودع، محصل، مرتد) مع استوديو الشيك الواقعي والتفقيط العربي.',
    purposeEn: 'Central electronic safe for post-dated cheques (GL 104000); tracks full lifecycle (In Safe, Deposited, Cleared, Bounced) with realistic cheque studio.',
    capabilitiesAr: [
      'استلام وحفظ شيكات العملاء بالخزينة الحديدية مع ربطها تلقائياً بالقسط التعاقدي',
      'استوديو المعاينة الواقعية للشيك البنكي الورقي مع التفقيط التلقائي بالجنيه المصري',
      'تحصيل الشيك بضغطة زر واحدة وترحيل القيد لحساب البنك (١٠٢٠٠٠)',
      'إدارة حالات الارتداد والتحصيل وإعادة الإيداع وحصر الشيكات حسب البنك المسحوب عليه'
    ],
    capabilitiesEn: [
      'Vault incoming client cheques with automatic linkage to contract schedules',
      'Realistic physical cheque studio with automatic Arabic Tafqeet currency phrasing',
      'One-click cheque clearance automatically posting entries to Bank Cash (102000)',
      'Manage bank deposits, bounces, representation, and drawer bank analytics'
    ],
    accountingImpactAr: 'إيداع الشيك بالخزينة (مدين أوراق قبض 104000) وتحصيله بالبنك (مدين بنك 102000 ودائن 104000).',
    accountingImpactEn: 'Safe deposit (Dr Cheques Vault 104000) and clearance (Dr Operating Bank 102000 / Cr 104000).',
    icon: Landmark
  },
  {
    moduleId: 'ledger',
    targetSelector: '[data-tour="nav-item-ledger"]',
    groupAr: 'المحاسبة والرقابة المالية',
    groupEn: 'ACCOUNTING & GOVERNANCE',
    titleAr: 'دفتر الأستاذ والدليل المحاسبي (COA)',
    titleEn: 'General Ledger & Chart of Accounts',
    badgeLabelAr: 'الأستاذ والميزان',
    badgeLabelEn: 'GENERAL LEDGER',
    purposeAr: 'العصب المحاسبي الصارم للمنظومة؛ دليل الحسابات الموحد (COA)، ميزان المراجعة الرباعي، والتحقق الحتمي من قاعدة القيد المزدوج (مدين = دائن 0.00).',
    purposeEn: 'The core accounting engine; canonical Chart of Accounts, live trial balance, and absolute double-entry balance verification (Dr = Cr 0.00).',
    capabilitiesAr: [
      'دليل الحسابات المالي القياسي الموحد (أصول، التزامات، حقوق ملكية، إيرادات، تكاليف)',
      'ميزان المراجعة الرباعي الحي الشامل للأرصدة الافتتاحية والحركات والأرصدة الختامية',
      'سجل القيود اليومية التلقائية واليدوية مع كشف موازنة القيود اللحظي',
      'آلية إقفال الفترات المحاسبية لمنع التعديل بأثر رجعي وحماية سلامة الدفاتر'
    ],
    capabilitiesEn: [
      'Standard canonical Chart of Accounts (Assets, Liabilities, Equity, Revenue, WIP)',
      'Live 4-column Trial Balance tracking opening balances, debits, credits, and ending totals',
      'Immutable journal ledger with live verification tag (Dr = Cr invariant)',
      'Fiscal period lock mechanism preventing unauthorized retroactive tampering'
    ],
    accountingImpactAr: 'حظر الحذف نهائياً في النظام المالي، وتصحيح أي خطأ يتم عبر القيود العكسية المعتمدة فقط.',
    accountingImpactEn: 'Immutable accounting invariant: deletion is prohibited; corrections require reverse entries.',
    icon: BookOpen
  },
  {
    moduleId: 'cost-allocation',
    targetSelector: '[data-tour="nav-item-cost-allocation"]',
    groupAr: 'المحاسبة والرقابة المالية',
    groupEn: 'ACCOUNTING & GOVERNANCE',
    titleAr: 'تخصيص التكاليف ومعامل الرسملة (RSV)',
    titleEn: 'WIP Cost Allocation & RSV Factor',
    badgeLabelAr: 'تكاليف المشروعات',
    badgeLabelEn: 'COST ALLOCATION',
    purposeAr: 'تطبيق معيار المحاسبة المصري ٤٨ (EAS 48 / IFRS 15)؛ احتساب معامل RSV المعتمد لاستنزال التكاليف الإنشائية من حساب WIP إلى تكلفة المبيعات (COGS) عند التسليم.',
    purposeEn: 'Implementation of EAS 48 / IFRS 15; computes Relative Sales Value (RSV) factor to relieve capitalized WIP into COGS upon unit handover.',
    capabilitiesAr: [
      'تخصيص التكاليف الإنشائية المباشرة (أراضي، خرسانات، كهروميكانيك، تشطيبات)',
      'احتساب وتحديث معامل RSV (Relative Sales Value) المعتمد لكل مشروع',
      'الاستنزال الآلي لتكلفة البضاعة المباعة (COGS 501000) فور تسليم كل وحدة',
      'حماية ومراقبة هوامش الربح الإجمالية للمشروع طوال فترة التنفيذ'
    ],
    capabilitiesEn: [
      'Allocate direct development costs across Land, Civil, MEP, and Finishes',
      'Calculate and audit project-specific RSV factors',
      'Automate cost of sales relief (COGS 501000) upon unit delivery',
      'Preserve and audit project gross profit margins across execution milestones'
    ],
    accountingImpactAr: 'استنزال تكلفة الوحدة المسلمة بالقيد: مدين تكلفة مبيعات 501000 ودائن أعمال تحت التنفيذ 105000.',
    accountingImpactEn: 'Relieves unit cost: Dr Cost of Goods Sold (501000) / Cr Work in Progress (105000).',
    icon: PieChart
  },
  {
    moduleId: 'tax',
    targetSelector: '[data-tour="nav-item-tax"]',
    groupAr: 'المحاسبة والرقابة المالية',
    groupEn: 'ACCOUNTING & GOVERNANCE',
    titleAr: 'الضرائب السيادية واستقطاعات نموذج ٤١',
    titleEn: 'Statutory Taxes & ETA Form 41',
    badgeLabelAr: 'الضرائب السيادية',
    badgeLabelEn: 'STATUTORY TAXES',
    purposeAr: 'المركز الرقابي للالتزامات الضريبية؛ حصر ضريبة التصرفات العقارية (٢.٥٪) واستقطاعات نموذج ٤١ (١٪) من المقاولين، وتوثيق السداد لمصلحة الضرائب المصرية.',
    purposeEn: 'Statutory tax governance; tracking 2.5% real estate disposal tax, Form 41 contractor withholding (1%), and remittance to the Egyptian Tax Authority.',
    capabilitiesAr: [
      'حصر واستقطاع مبالغ نموذج ٤١ القانونية على مستخلصات المقاولين والموردين',
      'احتساب وتوثيق ضريبة التصرفات العقارية الرسمية (٢.٥٪) المقررة قانوناً',
      'إدارة عمليات التوريد المباشر لمصلحة الضرائب وتوثيق أرقام وتواريخ الإيصالات',
      'تصدير الكشوفات الضريبية الرسمية الجاهزة للفحص الضريبي والتقديم الربع سنوي'
    ],
    capabilitiesEn: [
      'Withhold statutory Form 41 tax on sub-contractor and vendor invoices',
      'Calculate and track statutory 2.5% real estate disposal tax on sales contracts',
      'Record direct remittances to the tax authority with receipt numbers and dates',
      'Export quarterly tax audit schedules compliant with ETA regulatory standards'
    ],
    accountingImpactAr: 'إثبات التزام الضريبة (دائن مصلحة الضرائب 205000) وسدادها (دائن البنك 102000 ومدين 205000).',
    accountingImpactEn: 'Tax liability recognized (Cr Tax Authority 205000) and settled (Dr 205000 / Cr Bank 102000).',
    icon: ShieldCheck
  },
  {
    moduleId: 'rescissions',
    targetSelector: '[data-tour="nav-item-rescissions"]',
    groupAr: 'المحاسبة والرقابة المالية',
    groupEn: 'ACCOUNTING & GOVERNANCE',
    titleAr: 'فسخ واسترداد العقود (Rescissions Floor)',
    titleEn: 'Rescissions & Settlement Governance',
    badgeLabelAr: 'الإقالات والفسخ',
    badgeLabelEn: 'RESCISSIONS',
    purposeAr: 'منظومة الإقالات والفسخ الرقابي المتوافقة مع المادة ١٥ من قانون حماية المستهلك المصري؛ احتساب الحد الأدنى لرد أموال العميل، الخصم الإداري، والاعتماد الثنائي.',
    purposeEn: 'Rescission & refund engine compliant with Egyptian Consumer Protection Law Art. 15; statutory refund floor, administrative fee, and Maker-Checker dual control.',
    capabilitiesAr: [
      'تطبيق الحد الأدنى القانوني الصارم للرد النقدي للعميل وفقاً لمرحلة التسليم',
      'احتساب وتطبيق الخصم الإداري ورسم الاسترداد القانوني المعتمد',
      'رد وإلغاء شيكات الخزينة المتبقية في ذمة العميل بأمان وتأكيد تسليمها',
      'دورة الاعتماد الثنائي الإلزامية (Maker-Checker) لمنع أي صرف نقدي غير معتمد'
    ],
    capabilitiesEn: [
      'Enforce statutory refund floor (Pre-Delivery vs Post-Delivery handover rules)',
      'Deduct allowable administrative penalty fees with legal documentation',
      'Safely void and return outstanding safe vault PDCs to the buyer',
      'Mandatory Maker-Checker dual approval workflow before any cash disbursement'
    ],
    accountingImpactAr: 'إلغاء المديونية وإجراء التسوية العكسية بين المبالغ المستردة، الخصم الإداري، والوحدة المطروحة مجدداً.',
    accountingImpactEn: 'Reverses contract receivables, records administrative penalty revenue, and restores property availability.',
    icon: RotateCcw
  }
];

export const ZFErpGuidedTour: React.FC<ZFErpGuidedTourProps> = ({
  isActive,
  onComplete,
  onSkip,
  onNavigateToModule,
  isAr = true
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = SIDEBAR_TOUR_STEPS[currentStepIndex];

  // Navigate to module automatically when active step changes
  useEffect(() => {
    if (isActive && currentStep && onNavigateToModule) {
      onNavigateToModule(currentStep.moduleId);
    }
  }, [isActive, currentStep, onNavigateToModule]);

  // Update target rect & scroll into view smoothly
  const updateSpotlight = useCallback(() => {
    if (!isActive || !currentStep) return;

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Short delay for smooth scroll to settle
      const t = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 150);
      return () => clearTimeout(t);
    } else {
      setTargetRect(null);
    }
  }, [isActive, currentStep]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [updateSpotlight]);

  if (!isActive || !currentStep) return null;

  const handleNext = () => {
    if (currentStepIndex < SIDEBAR_TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('zf_fin_os_tour_completed_v1', 'true');
      }
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkipTour = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zf_fin_os_tour_completed_v1', 'true');
    }
    onSkip();
  };

  const Icon = currentStep.icon;

  // Calculate Tooltip Box Coordinates adjacent to the sidebar
  const tooltipWidth = 430;
  let tooltipTop = 80;
  let tooltipLeft = 80;

  if (targetRect) {
    // Determine whether the dock is on the right (Arabic RTL) or left (LTR)
    const isDockOnRight = targetRect.left > (window.innerWidth / 2);

    if (isDockOnRight) {
      // Place tooltip to the left of the sidebar dock
      tooltipLeft = Math.max(20, targetRect.left - tooltipWidth - 24);
    } else {
      // Place tooltip to the right of the sidebar dock
      tooltipLeft = Math.min(window.innerWidth - tooltipWidth - 20, targetRect.right + 24);
    }

    // Align vertically near the targeted button
    tooltipTop = Math.max(20, Math.min(window.innerHeight - 480, targetRect.top - 20));
  }

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        pointerEvents: 'auto',
        direction: isAr ? 'rtl' : 'ltr',
        transition: 'all 0.3s ease'
      }}
    >
      {/* SEMI-TRANSPARENT BACKDROP WITH SPOTLIGHT HOLE CUTOUT */}
      <svg 
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 4}
                width={targetRect.width + 12}
                height={targetRect.height + 8}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(3, 7, 18, 0.76)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* GLOWING SPOTLIGHT BORDER AROUND TARGETED SIDEBAR BUTTON */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            left: targetRect.left - 6,
            top: targetRect.top - 4,
            width: targetRect.width + 12,
            height: targetRect.height + 8,
            borderRadius: '10px',
            border: '2px solid rgba(212, 175, 55, 0.95)',
            boxShadow: '0 0 24px rgba(212, 175, 55, 0.5), inset 0 0 12px rgba(212, 175, 55, 0.25)',
            pointerEvents: 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 1000000
          }}
        />
      )}

      {/* FLOATING GLASSMORPHIC TOUR TOOLTIP CARD */}
      <div 
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: tooltipLeft,
          width: `${tooltipWidth}px`,
          maxWidth: 'calc(100vw - 40px)',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(9, 13, 22, 0.98) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.38)',
          borderRadius: '18px',
          padding: '1.35rem 1.45rem',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(212, 175, 55, 0.14)',
          backdropFilter: 'blur(24px)',
          color: '#ffffff',
          zIndex: 1000001,
          animation: 'fadeIn 0.25s ease-out'
        }}
      >
        {/* Card Header: Group Badge & Step Counter & Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              color: '#e2c974',
              letterSpacing: '0.04em'
            }}>
              {isAr ? currentStep.groupAr : currentStep.groupEn}
            </span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#94a3b8',
              fontFamily: 'monospace'
            }}>
              {isAr ? `صفحة ${currentStepIndex + 1} من ${SIDEBAR_TOUR_STEPS.length}` : `PAGE ${currentStepIndex + 1} OF ${SIDEBAR_TOUR_STEPS.length}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkipTour}
            title={isAr ? 'تخطي الجولة' : 'Skip Tour'}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Card Title & Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.55rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e2c974',
            flexShrink: 0
          }}>
            <Icon size={16} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.3 }}>
            {isAr ? currentStep.titleAr : currentStep.titleEn}
          </h3>
        </div>

        {/* Card Purpose Brief */}
        <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          {isAr ? currentStep.purposeAr : currentStep.purposeEn}
        </p>

        {/* Key Capabilities List */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '12px',
          padding: '0.75rem 0.9rem',
          marginBottom: '0.85rem'
        }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#e2c974', display: 'block', marginBottom: '0.45rem' }}>
            {isAr ? 'أبرز الإجراءات والعمليات المتاحة في هذه الشاشة:' : 'Key Capabilities & Workflows:'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {(isAr ? currentStep.capabilitiesAr : currentStep.capabilitiesEn).map((cap, cIdx) => (
              <div key={cIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.45 }}>
                <span style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }}>
                  <Check size={12} />
                </span>
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Accounting & Governance Impact Pill */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.02) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.22)',
          borderRadius: '9px',
          padding: '0.55rem 0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          marginBottom: '1rem'
        }}>
          <Sparkles size={13} color="#d4af37" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.7rem', color: '#e2e8f0', lineHeight: 1.4 }}>
            <strong style={{ color: '#e2c974' }}>{isAr ? 'الأثر المالي والرقابي: ' : 'Financial Impact: '}</strong>
            {isAr ? currentStep.accountingImpactAr : currentStep.accountingImpactEn}
          </span>
        </div>

        {/* Progress Bar Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.1rem' }}>
          {SIDEBAR_TOUR_STEPS.map((step, idx) => (
            <div
              key={step.moduleId}
              onClick={() => setCurrentStepIndex(idx)}
              style={{
                height: '4px',
                flex: 1,
                borderRadius: '999px',
                background: idx === currentStepIndex 
                  ? '#d4af37' 
                  : idx < currentStepIndex 
                    ? 'rgba(212, 175, 55, 0.45)' 
                    : 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={isAr ? step.titleAr : step.titleEn}
            />
          ))}
        </div>

        {/* Card Footer: Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleSkipTour}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0.35rem 0.6rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#cbd5e1'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
          >
            {isAr ? 'تخطي الجولة' : 'Skip Tour'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                <span>{isAr ? 'السابق' : 'Back'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              style={{
                background: 'linear-gradient(135deg, #d4af37 0%, #b38f26 100%)',
                border: 'none',
                color: '#000000',
                borderRadius: '8px',
                padding: '0.45rem 1rem',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.25)'
              }}
            >
              <span>
                {currentStepIndex === SIDEBAR_TOUR_STEPS.length - 1 
                  ? (isAr ? 'إنهاء الجولة' : 'Finish Tour') 
                  : (isAr ? 'التالي' : 'Next')}
              </span>
              {currentStepIndex === SIDEBAR_TOUR_STEPS.length - 1 ? (
                <CheckCircle2 size={14} />
              ) : (
                isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
