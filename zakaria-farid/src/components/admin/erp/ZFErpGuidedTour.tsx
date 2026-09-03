'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Check,
  Wallet
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
      'التقويم المالي التفاعلي لشهر كامل لمتابعة استحقاقات الأقساط والتحصيل باليد يوماً بيوم',
      'أجندة واستحقاقات اليوم والتحذيرات الرقابية مع أزرار التحصيل والمعاينة الفورية',
      'استوديو التحليل المالي ومنحنيات هورايزون للتنبؤ المستقبلي (IFRS 15 Horizon)'
    ],
    capabilitiesEn: [
      'Capital Flow Mindmap tracking booked sales, liquidity, and WIP outflows',
      'Full monthly financial calendar mapping contract installment dues and hand collections',
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
    titleAr: 'حافظة بنود التحصيل والأقساط باليد',
    titleEn: 'Hand Installments & Cash Dues Vault',
    badgeLabelAr: 'الخزينة والأقساط باليد',
    badgeLabelEn: 'HAND INSTALLMENTS',
    purposeAr: 'منظومة إدارة ومتابعة الأقساط وبنود الاستحقاق المستلمة نقداً باليد (حساب ١٠٤٠٠٠)؛ مع معالجة التحصيل اليدوي المباشر وتوريد النقدية بالخزينة الرئيسية [١٠١٠٠٠] بدون أي تعاملات بنكية.',
    purposeEn: 'Management of contract installment items collected in cash by hand (GL 104000); records physical receipts directly into Main Safe [101000] with no banking intermediaries.',
    capabilitiesAr: [
      'جدولة وحصر بنود الأقساط المستحقة باليد وربطها التلقائي بالعقود',
      'تصنيف فوري للحالة: مسدد في حينه، مستحق لاحقاً باليد، أو متأخر عن موعده',
      'إجراء تحصيل نقدي باليد بضغطة زر مع تسجيل رقم إيصال الاستلام والتوريد بالخزينة',
      'إنشاء قيود يومية تلقائية متوازنة لحساب الخزينة الرئيسية (١٠١٠٠٠)'
    ],
    capabilitiesEn: [
      'Schedule and track installment dues linked directly to sales contracts',
      'Status tracking: Paid in-time, Due later by hand, or Overdue',
      'Interactive hand collection modal capturing receipt voucher #, date, and safe deposit',
      'Automated balanced GL journal entry posting to Main Safe (101000)'
    ],
    accountingImpactAr: 'تحصيل القسط نقداً باليد (مدين الخزينة الرئيسية 101000 ودائن أقساط مستحقة 104000).',
    accountingImpactEn: 'Hand cash collection (Dr Main Cash Safe 101000 / Cr Installments Receivable 104000).',
    icon: Wallet
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardMeasuredHeight, setCardMeasuredHeight] = useState(460);

  const currentStep = SIDEBAR_TOUR_STEPS[currentStepIndex];

  // Dynamically measure actual card height so placement never overflows viewport
  useEffect(() => {
    if (!cardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height;
        if (height > 50) {
          setCardMeasuredHeight(height);
        }
      }
    });
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [currentStepIndex]);

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
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  const tooltipWidth = 420;
  let tooltipTop = 20;
  let tooltipLeft = 20;

  if (targetRect && typeof window !== 'undefined') {
    // Determine whether the dock is on the right (Arabic RTL) or left (LTR)
    const isDockOnRight = targetRect.left > (window.innerWidth / 2);

    if (isDockOnRight) {
      // Place tooltip to the left of the sidebar dock with comfortable clearance
      tooltipLeft = Math.max(16, targetRect.left - tooltipWidth - 20);
    } else {
      // Place tooltip to the right of the sidebar dock with comfortable clearance
      tooltipLeft = Math.min(window.innerWidth - tooltipWidth - 16, targetRect.right + 20);
    }

    // Vertical placement:
    // Try to align with the top of the highlighted target item
    let desiredTop = targetRect.top - 10;

    // Strict boundary enforcement: NEVER allow card bottom to clip past window bottom
    const maxAllowedTop = Math.max(16, window.innerHeight - cardMeasuredHeight - 20);
    if (desiredTop > maxAllowedTop) {
      desiredTop = maxAllowedTop;
    }

    // Strict boundary enforcement: NEVER allow card top to clip past window top
    if (desiredTop < 16) {
      desiredTop = 16;
    }

    tooltipTop = desiredTop;
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
        ref={cardRef}
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: tooltipLeft,
          width: `${tooltipWidth}px`,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 36px)',
          overflowY: 'auto',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.97) 0%, rgba(9, 13, 22, 0.99) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.38)',
          borderRadius: '16px',
          padding: '1.15rem 1.25rem',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(212, 175, 55, 0.14)',
          backdropFilter: 'blur(24px)',
          color: '#ffffff',
          zIndex: 1000001,
          animation: 'fadeIn 0.25s ease-out',
          transition: 'top 0.2s cubic-bezier(0.16, 1, 0.3, 1), left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(212, 175, 55, 0.35) transparent'
        }}
      >
        {/* Card Header: Group Badge & Step Counter & Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              padding: '0.18rem 0.55rem',
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
              fontVariantNumeric: 'tabular-nums'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.45rem' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e2c974',
            flexShrink: 0
          }}>
            <Icon size={15} />
          </div>
          <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.3 }}>
            {isAr ? currentStep.titleAr : currentStep.titleEn}
          </h3>
        </div>

        {/* Card Purpose Brief */}
        <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.55 }}>
          {isAr ? currentStep.purposeAr : currentStep.purposeEn}
        </p>

        {/* Key Capabilities List */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '11px',
          padding: '0.65rem 0.8rem',
          marginBottom: '0.65rem'
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#e2c974', display: 'block', marginBottom: '0.35rem' }}>
            {isAr ? 'أبرز الإجراءات والعمليات المتاحة في هذه الشاشة:' : 'Key Capabilities & Workflows:'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
            {(isAr ? currentStep.capabilitiesAr : currentStep.capabilitiesEn).map((cap, cIdx) => (
              <div key={cIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
                <span style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }}>
                  <Check size={11} />
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
          padding: '0.45rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          marginBottom: '0.75rem'
        }}>
          <Sparkles size={12} color="#d4af37" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.68rem', color: '#e2e8f0', lineHeight: 1.4 }}>
            <strong style={{ color: '#e2c974' }}>{isAr ? 'الأثر المالي والرقابي: ' : 'Financial Impact: '}</strong>
            {isAr ? currentStep.accountingImpactAr : currentStep.accountingImpactEn}
          </span>
        </div>

        {/* Progress Bar Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.85rem' }}>
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
