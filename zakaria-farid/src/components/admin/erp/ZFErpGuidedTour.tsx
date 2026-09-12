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
  BookOpen,
  PieChart,
  Users,
  RotateCcw,
  Check,
  Wallet,
  Zap,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Compass,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Layers,
  Info
} from 'lucide-react';

export interface TourStepMetric {
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  tagAr?: string;
  tagEn?: string;
}

export interface TourStepButton {
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
}

export interface TourStep {
  moduleId: string;
  targetSelector: string;
  stepNumber: number;
  groupAr: string;
  groupEn: string;
  titleAr: string;
  titleEn: string;
  badgeLabelAr: string;
  badgeLabelEn: string;
  purposeAr: string;
  purposeEn: string;
  keyMetrics: TourStepMetric[];
  keyButtons: TourStepButton[];
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
  onNavigateToModule?: (module: string) => void;
  isAr?: boolean;
}

export const SIDEBAR_TOUR_STEPS: TourStep[] = [
  // 1. قمرة القيادة والتحكم المالي (Executive Financial Cockpit - dashboard)
  {
    moduleId: 'dashboard',
    targetSelector: '[data-tour="nav-item-cockpit"]',
    stepNumber: 1,
    groupAr: 'القيادة والتحليل المالي',
    groupEn: 'COMMAND & ANALYTICS',
    titleAr: 'قمرة القيادة والتحكم المالي (Executive Cockpit)',
    titleEn: 'Executive Financial Cockpit & Analytics',
    badgeLabelAr: 'المركز الرئيسي',
    badgeLabelEn: 'COMMAND HUB',
    purposeAr: 'الشاشة المركزية للمدير التنفيذي والمالي؛ تجمع خريطة تدفقات رأس المال اللحظية، والتقويم المالي الشهري، وأجندة العمليات والمستحقات اليومية العاجلة في لوحة بانورامية واحدة لمراقبة نبض الشركة لحظة بلحظة.',
    purposeEn: 'The executive command center for leadership; renders real-time capital flow mindmaps, 30-day maturity calendar, and today’s operational action ledger into a single panoramic telemetry hub.',
    keyMetrics: [
      {
        nameAr: 'السيولة النقدية الجاهزة (خزينة وبنوك 101000 / 102000)',
        nameEn: 'Available Liquid Cash (Vault 101000 / Bank 102000)',
        descAr: 'الكاش الفعلي المتاح فوراً بالخزينة وحسابات البنوك؛ يمثل شريان الحياة للصرف وسداد المستخلصات والالتزامات دون انتظار.',
        descEn: 'Unallocated liquid cash in treasury vaults and banks available for immediate expenditure and contractor dues.',
        tagAr: 'سيولة حرة فورية',
        tagEn: 'Liquid Cash'
      },
      {
        nameAr: 'أقساط ومستحقات العملاء (103000)',
        nameEn: 'Outstanding Installments & Receivables (103000)',
        descAr: 'إجمالي المديونية الآجلة والمتأخرة في ذمة المشترين؛ تزيد مع كل بيع وتقل عند التحصيل وتوريد النقدية بالخزنة.',
        descEn: 'Total uncollected dues owed by buyers; increases on new sales and decreases upon cashier collection.',
        tagAr: 'مديونية المشترين',
        tagEn: 'Receivables'
      },
      {
        nameAr: 'تكاليف الإنشاء المتراكمة (WIP 120000)',
        nameEn: 'Capitalized Construction WIP (120000)',
        descAr: 'إجمالي ما تم إنفاقه رأسمالياً على الأراضي والخرسانات والتشطيبات؛ أصول متداولة تزيد من قيمة المشروعات حتى التسليم.',
        descEn: 'Cumulative capital expenditures across land, concrete, MEP and finishes; asset value recognized into COGS at handover.',
        tagAr: 'أصول رأسمالية',
        tagEn: 'Capitalized WIP'
      },
      {
        nameAr: 'توازن ميزان المراجعة (قيد الصفر 0.00)',
        nameEn: 'Double-Entry Invariant (Dr = Cr 0.00)',
        descAr: 'صمام الأمان المحاسبي الآلي؛ يؤكد تطابق إجمالي المدين مع الدائن بالمليم ويضمن عدم وجود أي هللة تائهة بالدفاتر.',
        descEn: 'Continuous mathematical audit confirming exact debit and credit equality across the General Ledger.',
        tagAr: 'سلامة الدفاتر',
        tagEn: 'GL Invariant'
      }
    ],
    keyButtons: [
      {
        nameAr: 'زر [+ تسجيل قيد / مصروف]',
        nameEn: 'Button [+ Add Transaction / Expense]',
        descAr: 'يتيح لك تسجيل أي نفقة موقعية أو حركة نقدية أو تسوية دفترياً فوراً مع التوجيه المحاسبي التلقائي.',
        descEn: 'Instantly logs site expenses or financial movements with automated double-entry GL routing.'
      },
      {
        nameAr: 'زر [تحصيل فوري]',
        nameEn: 'Button [Instant Collection]',
        descAr: 'في جدول استحقاقات اليوم، يتيح لك تحصيل القسط المستحق وتوريده للخزنة مباشرة بضغطة زر واحدة.',
        descEn: 'In today’s dues ledger, collects pending installments and deposits them into treasury with 1-click.'
      },
      {
        nameAr: 'زر [معاينة العقد]',
        nameEn: 'Button [Inspect Contract]',
        descAr: 'يتيح لك فحص السجل المالي للمشتري وجدول دفعاته المسددة والمتبقية وأي ملاحق سعرية فورياً.',
        descEn: 'Opens the client’s detailed financial profile, paid vs remaining tranches, and legal escalations.'
      },
      {
        nameAr: 'زر [تبديل العملة EGP / USD]',
        nameEn: 'Button [Currency Toggle EGP / USD]',
        descAr: 'يتيح لك إعادة تقييم مؤشرات التدفقات النقدية ومحفظة المشروعات بالجنيه المصري أو الدولار الأمريكي.',
        descEn: 'Revalues portfolio metrics and cashflow indicators between Egyptian Pounds and US Dollars.'
      }
    ],
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

  // 2. حركة الخزنة والعمليات اليومية (Daily Desk & Cashier - operations)
  {
    moduleId: 'operations',
    targetSelector: '[data-tour="nav-item-operations"]',
    stepNumber: 2,
    groupAr: 'المكتب اليومي وحركة النقدية',
    groupEn: 'DAILY DESK & CASHIER',
    titleAr: 'حركة الخزنة والعمليات اليومية (Daily Desk & Cashier)',
    titleEn: 'Daily Desk & Cashier Operations',
    badgeLabelAr: 'الخزينة المباشرة',
    badgeLabelEn: 'CASHIER DESK',
    purposeAr: 'شاشة العمليات السريعة لمسؤول الخزينة والصندوق؛ متابعة النقدية الحاضرة بالدرج لحظياً، إثبات المقبوضات والمصروفات اليومية، وتحصيل الأقساط العاجلة باليد مع إقفال ومطابقة الوردية.',
    purposeEn: 'Rapid operations hub for cashiers and collectors; tracks drawer cash balance, records daily receipts/expenses, and processes immediate hand collections.',
    keyMetrics: [
      {
        nameAr: 'رصيد الخزينة الرئيسية الفعلي (101000)',
        nameEn: 'Main Safe Physical Cash Balance (101000)',
        descAr: 'النقدية الحية المتواجدة فعلياً في خزينة الشركة ودرج الصندوق في هذه اللحظة.',
        descEn: 'Exact physical liquid cash residing in the company vault and cashier drawer right now.',
        tagAr: 'كاش الدرج',
        tagEn: 'Drawer Cash'
      },
      {
        nameAr: 'إجمالي المقبوضات المحصلة اليوم',
        nameEn: 'Daily Collections Received Today',
        descAr: 'حجم النقدية التي تم استلامها وإيداعها اليوم بسندات قبض رسمية عبر الخزينة أو InstaPay.',
        descEn: 'Total cash and instant transfers collected and receipted across today’s transactions.',
        tagAr: 'مقبوضات اليوم',
        tagEn: 'Today Inflows'
      },
      {
        nameAr: 'المصروفات والعهد اليومية المنصرفة',
        nameEn: 'Daily Operational Expenses & Advances',
        descAr: 'المبالغ النقدية الخارجة لشراء مواد طارئة أو مستخلصات مقاولين أو مصاريف موقع.',
        descEn: 'Outgoing cash disbursements for site expenses, materials, or petty cash advances.',
        tagAr: 'منصرفات اليوم',
        tagEn: 'Today Outflows'
      },
      {
        nameAr: 'حالة الفترة المحاسبية (مفتوحة / مقفلة)',
        nameEn: 'Fiscal Period Status (Open / Locked)',
        descAr: 'صمام الرقابة الصارم؛ يؤكد أن الشهر المالي مفتوح لإثبات الحركات ويحظر المساس بالفترات المقفلة.',
        descEn: 'Governance gate ensuring transactions are logged strictly within authorized open fiscal periods.',
        tagAr: 'صمام الرقابة',
        tagEn: 'Period Lock'
      }
    ],
    keyButtons: [
      {
        nameAr: 'زر [تحصيل قسط باليد]',
        nameEn: 'Button [Hand Cash Collection]',
        descAr: 'يتيح لك تسجيل تحصيل نقدي فوري أو عبر InstaPay وطباعة إيصال الاستلام وسند القبض وإثبات القيد المزدوج.',
        descEn: 'Captures physical cash or InstaPay collections, prints official receipts, and posts double-entry GL journals.'
      },
      {
        nameAr: 'زر [تسجيل مصروف خزينة]',
        nameEn: 'Button [Record Safe Expense]',
        descAr: 'يتيح لك توثيق خروج نقدية من الخزينة مع تحديد المستفيد وبند الصرف في ثوانٍ مع التحقق من الرصيد.',
        descEn: 'Logs outgoing vault payments with payee tracking, cost category routing, and liquidity validation.'
      },
      {
        nameAr: 'زر [تحديث البيانات اللحظي]',
        nameEn: 'Button [Live Data Refresh]',
        descAr: 'يتيح لك مزامنة رصيد الخزينة والعمليات المعلقة فورياً مع قاعدة البيانات السحابية.',
        descEn: 'Resynchronizes drawer balances and pending operational records directly with Supabase cloud.'
      },
      {
        nameAr: 'زر [طباعة كشف حركة اليومية]',
        nameEn: 'Button [Print Daily Register]',
        descAr: 'يتيح لك تصدير كشف الحركات اليومية للمطابقة الدفترية مع الجرد الفعلي للنقدية.',
        descEn: 'Exports the daily transaction ledger to reconcile physical drawer cash with general ledger totals.'
      }
    ],
    capabilitiesAr: [
      'متابعة رصيد الخزينة النقدية الرئيسية (101000) والأقساط المستحقة للتحصيل اليوم',
      'تسجيل المصروفات الموقعية والتشغيلية المباشرة مع التحقق التلقائي من إقفال الفترة',
      'تحصيل الأقساط المستحقة نقداً باليد وطباعة سند القبض وإثبات القيد المزدوج فوراً',
      'سجل حركات اليومية السريعة والعمليات المعلقة لليوم الجاري'
    ],
    capabilitiesEn: [
      'Monitor Main Cash Safe balance (101000) and urgent due installments today',
      'Instant site and operational expense logging with active fiscal period checks',
      'One-click cash collection with automated receipt vouchers and GL posting',
      'Daily quick audit register for today’s pending operations'
    ],
    accountingImpactAr: 'إثبات الحركات النقدية اللحظية بالخزينة (حساب 101000) مع منع التعديل بأثر رجعي للفترات المقفلة.',
    accountingImpactEn: 'Immediate real-time posting to Main Safe (101000) with strict locked fiscal period enforcement.',
    icon: Zap
  },

  // 3. محفظة المشاريع والعقارات (Projects & Properties Portfolio - properties)
  {
    moduleId: 'properties',
    targetSelector: '[data-tour="nav-item-properties"]',
    stepNumber: 3,
    groupAr: 'المشاريع والأصول الإنشائية',
    groupEn: 'PROJECTS & ASSETS',
    titleAr: 'محفظة المشاريع والعقارات (Projects & Properties)',
    titleEn: 'Projects & Properties Portfolio',
    badgeLabelAr: 'الأصول والمشروعات',
    badgeLabelEn: 'WIP ASSETS',
    purposeAr: 'السجل الشامل لمحفظة المباني والأراضي والمشروعات؛ حصر دقيق لحالة كل شقة ووحدة (متاحة، محجوزة، مباعة، مسلّمة)، ومراقبة نفقات الإنشاء المصروفة على كل أصل (WIP) ونسب الشركاء المستثمرين.',
    purposeEn: 'Master catalog of all development projects, buildings, and plots; monitors real-time inventory states (Available, Reserved, Sold, Handed Over) and incurred construction WIP.',
    keyMetrics: [
      {
        nameAr: 'القيمة البيعية الإجمالية للمحفظة (Gross GDV)',
        nameEn: 'Total Portfolio GDV Valuation',
        descAr: 'إجمالي القيمة البيعية التقديرية لكافة وحدات وعقارات المشروعات المسجلة بالمنظومة.',
        descEn: 'Gross Development Value calculated across all units, apartments, and commercial units in the catalog.',
        tagAr: 'قيمة المحفظة',
        tagEn: 'Gross GDV'
      },
      {
        nameAr: 'معدل بيع الوحدات (Sales Velocity)',
        nameEn: 'Inventory Sales Velocity & Occupancy',
        descAr: 'نسبة الوحدات المتعاقد عليها والمحجوزة مقارنة بالوحدات المتبقية والمتاحة للبيع.',
        descEn: 'Percentage of units contracted and reserved versus inventory remaining available for sale.',
        tagAr: 'معدل الدوران',
        tagEn: 'Sales Rate'
      },
      {
        nameAr: 'رصيد تكلفة الإنشاء الرأسمالية (WIP)',
        nameEn: 'Capitalized Construction WIP Balance',
        descAr: 'النفقات الرأسمالية المتراكمة على المشروع (أراضي 120100، خرسانات 120200، تشطيب 120400).',
        descEn: 'Accumulated capital costs on land, structural concrete, MEP, and finishes for active projects.',
        tagAr: 'تكلفة البناء',
        tagEn: 'Project WIP'
      },
      {
        nameAr: 'العائد الاستثماري المتوقع للمشروع',
        nameEn: 'Project Target Profit Yield',
        descAr: 'هامش الربح الإجمالي المستهدف تحقيقه بعد استكمال البناء والبيع بالكامل وخصم التكاليف.',
        descEn: 'Target gross profit margin projected upon complete development delivery and inventory realization.',
        tagAr: 'هامش الربحية',
        tagEn: 'Yield Margin'
      }
    ],
    keyButtons: [
      {
        nameAr: 'زر [+ إضافة مشروع / عمارة جديدة]',
        nameEn: 'Button [+ Add Project / Building]',
        descAr: 'يتيح لك تكويد مشروع جديد وتحديد موقعه ورخصته وعدد طوابقه ووحداته وتكلفة الأرض.',
        descEn: 'Sets up a new development project, location, construction license, floor count, and land cost.'
      },
      {
        nameAr: 'زر [+ إضافة وحدة عقارية]',
        nameEn: 'Button [+ Add Property Unit]',
        descAr: 'يتيح لك إضافة شقة أو محل تجاري مع تحديد المساحة ورقم الدور والسعر الاسترشادي والواجهة.',
        descEn: 'Registers an apartment or commercial unit with square meters, floor level, and price baseline.'
      },
      {
        nameAr: 'زر [بدء حجز / تعاقد للوحدة]',
        nameEn: 'Button [Start Contract for Unit]',
        descAr: 'يتيح لك نقل الوحدة المحددة مباشرة إلى معالج البيع لإبرام العقد وتوليد خطة السداد.',
        descEn: 'Passes the selected unit directly into the contract booking wizard to structure customer payment plans.'
      },
      {
        nameAr: 'زر [تصفية الوحدات المتاحة]',
        nameEn: 'Button [Filter Available Units]',
        descAr: 'يتيح لك فلترة سريعة لاستعراض الشقق الجاهزة للبيع فوراً دون غيرها لعرضها على العملاء.',
        descEn: 'Quick filter isolating strictly uncontracted inventory ready for immediate marketing and sales.'
      }
    ],
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
    accountingImpactAr: 'رسملة نفقات المقاولين والمواد الخام في حساب مخزون تطوير عقاري (WIP 120000) كأصول متداولة.',
    accountingImpactEn: 'Capitalizes raw contractor and material expenses into GL 120000 project inventory.',
    icon: Building2
  },

  // 4. حاسبة تكلفة المباني والجدوى الإنشائية (Construction Feasibility & Calculator - calculator)
  {
    moduleId: 'calculator',
    targetSelector: '[data-tour="nav-item-calculator"]',
    stepNumber: 4,
    groupAr: 'الهيكلة والتسعير والجدوى',
    groupEn: 'FEASIBILITY & PRICING',
    titleAr: 'حاسبة تكلفة المباني والجدوى الإنشائية (Construction Feasibility)',
    titleEn: 'Construction Feasibility & Calculator',
    badgeLabelAr: 'الهيكلة والجدوى',
    badgeLabelEn: 'FEASIBILITY',
    purposeAr: 'المحاكي المالي والهندسي الذكي؛ يتيح حساب تكاليف البناء (خرسانة، حديد، تشطيب، مرافق) بدقة بمعدلات استهلاك واقعية، وتصميم أنظمة وأقساط سداد مريحة ومربحة للمشترين.',
    purposeEn: 'Financial & engineering simulation engine; computes structural milestone costs and designs customized, high-yield installment payment structures.',
    keyMetrics: [
      {
        nameAr: 'متوسط تكلفة المتر المسطح (Cost / m²)',
        nameEn: 'Average Construction Cost per m²',
        descAr: 'مؤشر التكلفة الإنشائية المباشرة للمتر المربع الواحد بالمبنى طبقاً لأسعار الخامات والمقاولات.',
        descEn: 'Direct engineering cost per square meter computed against current steel, concrete, and contractor rates.',
        tagAr: 'تكلفة المتر',
        tagEn: 'Cost / m²'
      },
      {
        nameAr: 'إجمالي التكلفة الإنشائية المباشرة',
        nameEn: 'Total Direct Construction Budget',
        descAr: 'التكلفة التقديرية لكافة بنود الحفر والهيكل والواجهات والتشطيبات للمشروع بالكامل.',
        descEn: 'Estimated direct civil, structural, facade, and finishing budget for the entire building.',
        tagAr: 'تكلفة المشروع',
        tagEn: 'Budget Total'
      },
      {
        nameAr: 'هامش الربح الإنشائي المستهدف',
        nameEn: 'Target Construction Profit Margin',
        descAr: 'الفارق المستهدف بين تكلفة البناء الفعلية وإجمالي سعر البيع التعاقدي للمشروع.',
        descEn: 'Target spread between direct execution costs and gross contractual sales valuation.',
        tagAr: 'هامش الربح',
        tagEn: 'Profit Margin'
      },
      {
        nameAr: 'جدول التدفقات النقدية المتوقعة',
        nameEn: 'Cashflow Inflow vs Outflow Alignment',
        descAr: 'موازنة مواعيد تحصيل أقساط العملاء مع مواعيد سداد مستخلصات المقاولين لتجنب عجز السيولة.',
        descEn: 'Synchronization between incoming customer installment tranches and contractor payment milestones.',
        tagAr: 'تناغم السيولة',
        tagEn: 'Liquidity Sync'
      }
    ],
    keyButtons: [
      {
        nameAr: 'زر [حساب جدول الأقساط]',
        nameEn: 'Button [Calculate Schedule]',
        descAr: 'يتيح لك توليد خطة سداد فورية (مقدم، أقساط ربع سنوية، دفعة استلام) بنقرة زر واحدة.',
        descEn: 'Instantly generates customer payment structures (down payment, quarterly tranches, delivery balloon).'
      },
      {
        nameAr: 'زر [محاكاة خصم السداد الكاش]',
        nameEn: 'Button [Simulate Cash Discount]',
        descAr: 'يتيح لك احتساب السعر المخفض للعميل حال السداد الفوري دفعة واحدة كاش.',
        descEn: 'Calculates the discounted selling price for buyers opting for 100% upfront cash payment.'
      },
      {
        nameAr: 'زر [ترحيل إلى عقد بيع]',
        nameEn: 'Button [Export to Sales Contract]',
        descAr: 'يتيح لك تحويل الخطة المالية والجدول المحسوب مباشرة إلى مسودة عقد بيع رسمي جديد.',
        descEn: 'Transfers the finalized payment plan directly into a formal new sales contract wizard.'
      },
      {
        nameAr: 'زر [إعادة ضبط الحاسبة]',
        nameEn: 'Button [Reset Calculator]',
        descAr: 'يتيح لك تفريغ الحقول لإجراء دراسة جدوى ومحاكاة تسعيرية جديدة لمشروع آخر.',
        descEn: 'Clears input parameters to run a fresh financial simulation for a different property.'
      }
    ],
    capabilitiesAr: [
      'محاكاة خطط السداد وتوليد سيناريوهات أقساط مرنة تناسب المشتري',
      'احتساب نسب الدفعة المقدمة ودفعات الاستلام وضبط التوزيع الزمني',
      'حساب تكاليف البناء والخرسانات والتشطيبات للمشروع بالكامل بدقة',
      'المعاينة الفورية لجدول الدفعات ومقارنتها بالتدفقات النقدية المستهدفة'
    ],
    capabilitiesEn: [
      'Simulate flexible payment plans and custom installment scenarios',
      'Calculate down payment and delivery balloon payments with precise timing',
      'Accurate structural and finishing cost estimation per square meter',
      'Preview cash inflow schedules against project construction milestones'
    ],
    accountingImpactAr: 'ضمان توافق فترات استحقاق الأقساط مع احتياجات السيولة التشغيلية وصرف مستخلصات المقاولين.',
    accountingImpactEn: 'Aligns installment inflow maturities directly with project operational cash expenditure milestones.',
    icon: Calculator
  },

  // 5. عقود البيع وجداول الأقساط (Sales Contracts & Installments - contracts)
  {
    moduleId: 'contracts',
    targetSelector: '[data-tour="nav-item-contracts"]',
    stepNumber: 5,
    groupAr: 'المبيعات والعمليات التعاقدية',
    groupEn: 'SALES & CONTRACTS',
    titleAr: 'عقود البيع وجداول الأقساط (Sales Contracts Registry)',
    titleEn: 'Sales Contracts Registry & Pipeline',
    badgeLabelAr: 'العقود والبيع',
    badgeLabelEn: 'SALES DEALS',
    purposeAr: 'المستودع القانوني والمالي الموثق لكافة عقود البيع؛ تحرير العقود بمعالج تنفيذي من ٣ خطوات، متابعة أقساط كل عميل، إثبات الملاحق السعرية، وإدارة محاضر التسليم (Handover).',
    purposeEn: 'Audited legal and financial registry for sales contracts; book contracts via a 3-step wizard, monitor payment schedules, apply escalations, and record handovers.',
    keyMetrics: [
      {
        nameAr: 'إجمالي قيمة العقود المبرمة',
        nameEn: 'Total Booked Contracts Value',
        descAr: 'إجمالي المبيعات التعاقدية الموقعة رسمياً مع المشترين لكافة الوحدات المباعة.',
        descEn: 'Gross nominal value across all signed buyer contracts currently active in the platform.',
        tagAr: 'إجمالي المبيعات',
        tagEn: 'Gross Sales'
      },
      {
        nameAr: 'مدينو عقود البيع (حساب 103000)',
        nameEn: 'Contract Receivables Ledger (103000)',
        descAr: 'الأقساط الآجلة المتبقية في ذمة المشترين والتي لم تسدد بعد.',
        descEn: 'Outstanding contract installments owed by clients (both upcoming tranches and overdue dues).',
        tagAr: 'أقساط مستقبلية',
        tagEn: 'Receivables'
      },
      {
        nameAr: 'الإيراد المؤجل (حساب 203000)',
        nameEn: 'Deferred Contract Revenue (203000)',
        descAr: 'التزامات الشركة التعاقدية تجاه المشترين حتى يتم تسليم الشقق فعلياً.',
        descEn: 'Contract liability representing customer payments received prior to actual physical unit handover.',
        tagAr: 'التزام تعاقدي',
        tagEn: 'Deferred Revenue'
      },
      {
        nameAr: 'نسبة الوحدات المسلّمة (Delivered %)',
        nameEn: 'Handover Delivery Rate (IFRS 15)',
        descAr: 'مؤشر إنجاز التسليم وتحول الإيراد المؤجل إلى إيراد نهائي محقق في الأرباح والخسائر.',
        descEn: 'Percentage of units officially handed over, recognizing deferred revenue into final net revenue.',
        tagAr: 'إنجاز التسليم',
        tagEn: 'Handover Rate'
      }
    ],
    keyButtons: [
      {
        nameAr: 'زر [+ تحرير عقد بيع جديد]',
        nameEn: 'Button [+ Book New Contract]',
        descAr: 'يتيح لك فتح معالج العقود الذكي لربط الوحدة بالمشتري وجدول الأقساط ومنع تكرار البيع.',
        descEn: 'Launches the 3-step contract booking wizard linking property, client, and installment terms.'
      },
      {
        nameAr: 'زر [تسجيل ملحق زيادة سعر (Escalation)]',
        nameEn: 'Button [Add Escalation Addendum]',
        descAr: 'يتيح لك تعديل قيمة العقد قانونياً مع امتصاص الزيادة في الأقساط المتبقية تلقائياً.',
        descEn: 'Documents legal price adjustments and absorbs Delta V into active pending tranches.'
      },
      {
        nameAr: 'زر [محضر تسليم الوحدة (Handover)]',
        nameEn: 'Button [Unit Handover Execution]',
        descAr: 'يتيح لك إثبات تسليم الشقة والاعتراف بالإيراد النهائي محاسبياً وفق معيار EAS 48.',
        descEn: 'Executes handover to relieve WIP to COGS and recognize deferred revenue into net income.'
      },
      {
        nameAr: 'زر [طباعة العقد وجدول الأقساط]',
        nameEn: 'Button [Print Contract & Schedule]',
        descAr: 'يتيح لك استخراج العقد وجدول الدفعات بصيغة رسمية معتمدة للتوقيع والأرشفة.',
        descEn: 'Generates print-ready formal sales contracts with verified payment tranche tables.'
      }
    ],
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

  // 6. خزانة الأقساط والشيكات وسندات القبض (Installments Vault & PDCs - pdc)
  {
    moduleId: 'pdc',
    targetSelector: '[data-tour="nav-item-pdc"]',
    stepNumber: 6,
    groupAr: 'الخزينة والأقساط باليد',
    groupEn: 'INSTALLMENTS VAULT & PDCS',
    titleAr: 'خزانة الأقساط والشيكات وسندات القبض (Installments Vault)',
    titleEn: 'Installments Vault, PDCs & Hand Receipts',
    badgeLabelAr: 'الأقساط وسندات القبض',
    badgeLabelEn: 'HAND RECEIVABLES',
    purposeAr: 'خزانة متابعة الأقساط وبنود الاستحقاق المستلمة نقداً باليد أو شيكات؛ جدولة الاستحقاقات، استوديو سندات القبض المباشرة، والتفقيط القانوني الآلي باللغة العربية مع ترحيل القيد للخزينة.',
    purposeEn: 'Secure vault for contract installment tranches and physical receipts; due-date agenda, live receipt voucher studio, and automated Egyptian Arabic legal Tafqeet.',
    keyMetrics: [
      {
        nameAr: 'الأقساط المستحقة خلال الشهر',
        nameEn: 'Installments Due This Month',
        descAr: 'التدفقات النقدية المتوقع دخولها الخزينة خلال الشهر الحالي لسداد التزامات الشركة.',
        descEn: 'Anticipated cash inflows scheduled for hand collection across the current calendar month.',
        tagAr: 'مستحق هذا الشهر',
        tagEn: 'Due This Month'
      },
      {
        nameAr: 'الأقساط المتأخرة عن موعدها',
        nameEn: 'Overdue Installment Arrears',
        descAr: 'مبالغ العملاء المتأخرين عن السداد لاتخاذ إجراءات الاتصال والمتابعة العاجلة.',
        descEn: 'Critical delinquent installment amounts past maturity requiring immediate collection actions.',
        tagAr: 'متأخرات حرجة',
        tagEn: 'Overdue'
      },
      {
        nameAr: 'إجمالي المحصل بسندات قبض',
        nameEn: 'Total Realized Collections in Safe',
        descAr: 'المبالغ التي تم استلامها وإيداعها فعلياً في حساب الخزينة الرئيسية (101000).',
        descEn: 'Total cash and deposits confirmed with issued vouchers and settled in the safe ledger.',
        tagAr: 'كاش محصل',
        tagEn: 'Collected'
      },
      {
        nameAr: 'نسبة التحصيل في الموعد المحدد',
        nameEn: 'On-Time Collection Compliance Rate',
        descAr: 'مؤشر التزام المشترين بالسداد في مواعيدهم المحددة دون تأخير أو تعثر.',
        descEn: 'Percentage of customer installment tranches settled within the contractual grace period.',
        tagAr: 'كفاءة التحصيل',
        tagEn: 'Compliance'
      }
    ],
    keyButtons: [
      {
        nameAr: 'زر [تحصيل مباشر وسند قبض]',
        nameEn: 'Button [Direct Receipt Voucher]',
        descAr: 'يتيح لك فتح استوديو سند القبض مع التفقيط التلقائي وإثبات القيد في الخزينة بضغطة واحدة.',
        descEn: 'Opens the receipt voucher studio with automatic Arabic Tafqeet and GL safe posting.'
      },
      {
        nameAr: 'زر [اختيار القسط من العقد]',
        nameEn: 'Button [Autofill from Contract]',
        descAr: 'يتيح لك استعراض أقساط العقد غير المسددة وملء بيانات المبلغ وتاريخ الاستحقاق بنقرة زر.',
        descEn: 'Reads pending contract schedule tranches and auto-populates amounts and due dates.'
      },
      {
        nameAr: 'زر [طباعة إيصال وسند الاستلام]',
        nameEn: 'Button [Print Voucher Receipt]',
        descAr: 'يتيح لك إصدار سند مالي مذهب للعميل يحمل رقماً مرجعياً معتمداً وإثبات السداد.',
        descEn: 'Exports an executive gold-accented customer receipt voucher with verified audit numbering.'
      },
      {
        nameAr: 'زر [تصفية حسب حالة القسط]',
        nameEn: 'Button [Filter Tranche Status]',
        descAr: 'يتيح لك فلترة سريعة (مسدد بالكامل، مستحق لاحقاً باليد، متأخر عن الموعد).',
        descEn: 'Filters the dues register by status: Paid, Due Soon by Hand, or Overdue.'
      }
    ],
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

  // 7. حسابات الشركة ودفتر اليومية والأستاذ (General Ledger & Trial Balance - ledger)
  {
    moduleId: 'ledger',
    targetSelector: '[data-tour="nav-item-ledger"]',
    stepNumber: 7,
    groupAr: 'المحاسبة والرقابة المالية',
    groupEn: 'ACCOUNTING & GOVERNANCE',
    titleAr: 'حسابات الشركة ودفتر اليومية والأستاذ (General Ledger & Trial Balance)',
    titleEn: 'General Ledger, COA & Trial Balance',
    badgeLabelAr: 'الأستاذ والميزان',
    badgeLabelEn: 'GENERAL LEDGER',
    purposeAr: 'العصب المحاسبي والمالي الصارم للمنظومة؛ دليل الحسابات الموحد (COA)، ميزان المراجعة الرباعي، التحقق الحتمي من القيد المزدوج، وقفل الفترات لمنع التعديل بأثر رجعي حمايةً للدفاتر.',
    purposeEn: 'Canonical double-entry accounting engine; live 4-column trial balance, Chart of Accounts, immutable audit journal, and tamper-proof fiscal period locking.',
    keyMetrics: [
      {
        nameAr: 'توازن ميزان المراجعة (مدين = دائن 0.00)',
        nameEn: 'Trial Balance Parity (Dr = Cr 0.00)',
        descAr: 'التحقق اللحظي من تطابق طرفي القيد المحاسبي بالمليم دون أي انحراف في الدفاتر.',
        descEn: 'Real-time verification that cumulative debit and credit entries balance to exactly zero variance.',
        tagAr: 'صمام الاتزان',
        tagEn: 'Balanced 0.00'
      },
      {
        nameAr: 'رصيد حسابات الخزينة والبنوك',
        nameEn: 'Cash & Bank Ledgers (101000 & 102000)',
        descAr: 'مطابقة النقدية الدفترية مع الأرصدة الفعلية بالخزينة (101000) والبنوك (102000).',
        descEn: 'Reconciliation of ledger cash accounts against physical safe counts and bank statements.',
        tagAr: 'الأصول النقدية',
        tagEn: 'Cash Assets'
      },
      {
        nameAr: 'إجمالي الالتزامات وحقوق الملكية',
        nameEn: 'Liabilities & Equity Balances (300000)',
        descAr: 'مراقبة مستحقات الموردين والمقاولين ورؤوس أموال الشركاء المستثمرين.',
        descEn: 'Auditing supplier accounts payable, contractor retentions, and shareholder equity.',
        tagAr: 'الخصوم والملكية',
        tagEn: 'Equity & Dues'
      },
      {
        nameAr: 'حالة الفترة المالية (مفتوحة / مقفلة)',
        nameEn: 'Accounting Period Lock Status',
        descAr: 'صمام أمان يمنع أي تعديل أو حذف على القيود القديمة في الفترات المقفلة.',
        descEn: 'Tamper-proof period lock preventing retroactive entry insertion or schedule mutations.',
        tagAr: 'حماية الدفاتر',
        tagEn: 'Period Lock'
      }
    ],
    keyButtons: [
      {
        nameAr: 'زر [+ إضافة قيد يومية يدوي]',
        nameEn: 'Button [+ Add Manual Journal Entry]',
        descAr: 'يتيح لك تسجيل قيد تسوية أو إثبات حركة مع التحقق الآلي من اتزان طرفي القيد قبل الحفظ.',
        descEn: 'Creates custom adjustment entries with real-time balance validation before commit.'
      },
      {
        nameAr: 'زر [قفل الفترة المالية (Lock Period)]',
        nameEn: 'Button [Lock Fiscal Period]',
        descAr: 'يتيح لك إغلاق الشهر المالي لمنع أي تعديل أو حذف مستقبلي حمايةً لسلامة الدفاتر.',
        descEn: 'Enforces statutory fiscal close, locking the month against retroactive accounting changes.'
      },
      {
        nameAr: 'زر [تصدير ميزان المراجعة]',
        nameEn: 'Button [Export Trial Balance]',
        descAr: 'يتيح لك تحميل تقرير الحسابات والأرصدة إلى ملف Excel أو PDF بضغطة زر واحدة.',
        descEn: 'Downloads a comprehensive 4-column trial balance directly into Excel or PDF format.'
      },
      {
        nameAr: 'زر [قيد عكسي للتصحيح]',
        nameEn: 'Button [Reverse Entry Correction]',
        descAr: 'يتيح لك معالجة أي خطأ محاسبي عبر قيد عكسي معتمد دون كسر مبدأ عدم حذف القيود.',
        descEn: 'Generates an offsetting reverse journal to correct entries without violating immutability.'
      }
    ],
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

  // 8. توزيع مصاريف المباني على الشقق RSV (WIP Cost Allocation - cost-allocation)
  {
    moduleId: 'cost-allocation',
    targetSelector: '[data-tour="nav-item-cost-allocation"]',
    stepNumber: 8,
    groupAr: 'تكاليف المشروعات والرسملة',
    groupEn: 'COST ALLOCATION & WIP',
    titleAr: 'توزيع مصاريف المباني على الشقق (WIP Cost Allocation RSV)',
    titleEn: 'WIP Cost Allocation & Relative Sales Value (RSV)',
    badgeLabelAr: 'تكاليف المشروعات',
    badgeLabelEn: 'COST ALLOCATION',
    purposeAr: 'التطبيق المحاسبي لمعيار المحاسبة المصري رقم 48 (EAS 48 / IFRS 15)؛ رسملة مصروفات البناء وتوزيعها على الشقق بمعامل RSV واستنزال تكلفة المبيعات عند التسليم لحماية هوامش الربح.',
    purposeEn: 'Implementation of EAS 48 / IFRS 15; capitalizes construction expenses, computes Relative Sales Value factor, and relieves unit WIP to COGS at handover.',
    keyMetrics: [
      {
        nameAr: 'إجمالي تكاليف أعمال تحت التنفيذ (WIP)',
        nameEn: 'Total Capitalized Project WIP',
        descAr: 'ما تم إنفاقه على الأراضي والهيكل الخرساني والكهروميكانيك والتشطيبات للمشروع.',
        descEn: 'Accumulated construction expenditures across land, structural, MEP, and finishes.',
        tagAr: 'أصول WIP',
        tagEn: 'WIP Assets'
      },
      {
        nameAr: 'معامل القيمة البيعية النسبية (RSV Factor)',
        nameEn: 'Relative Sales Value (RSV) Factor',
        descAr: 'نسبة تكلفة المبنى الإجمالية إلى إجمالي قيمته البيعية لتوزيع التكلفة بعدالة على كل وحدة.',
        descEn: 'Statutory ratio of total building cost to gross catalog sales value for fair unit allocation.',
        tagAr: 'معامل RSV',
        tagEn: 'RSV Factor'
      },
      {
        nameAr: 'تكلفة البضاعة المباعة (COGS 501000)',
        nameEn: 'Cost of Goods Sold Relief (501000)',
        descAr: 'التكاليف المستنزلة من WIP إلى الأرباح والخسائر فور تسليم الشقق للعملاء.',
        descEn: 'Cumulative cost relieved from WIP into income statement upon unit delivery.',
        tagAr: 'تكلفة المبيعات',
        tagEn: 'COGS Relief'
      },
      {
        nameAr: 'صافي هامش الربح المحقق للمشروع',
        nameEn: 'Realized Gross Profit Margin',
        descAr: 'الربح الفعلي بعد استنزال تكلفة البناء الحقيقية لكل شقة مسلمة طبقاً لمعامل RSV.',
        descEn: 'Actual gross margin recognized upon delivery against unit-specific capitalized costs.',
        tagAr: 'هامش الربح',
        tagEn: 'Realized Margin'
      }
    ],
    keyButtons: [
      {
        nameAr: 'زر [+ تسجيل مصروف موقع / مقاول]',
        nameEn: 'Button [+ Add WIP Contractor Cost]',
        descAr: 'يتيح لك رسملة فواتير ومستخلصات البناء وتوجيهها للمشروع بدقة دون التأثير على المصروفات الإيرادية.',
        descEn: 'Capitalizes raw contractor invoices directly into WIP sub-accounts without expense pollution.'
      },
      {
        nameAr: 'زر [تحديث واحتساب معامل RSV]',
        nameEn: 'Button [Recalculate RSV Factor]',
        descAr: 'يتيح لك إعادة احتساب معامل التوزيع بنقرة زر واحدة عند تعديل أسعار بيع الشقق أو التكاليف.',
        descEn: 'Updates the Relative Sales Value allocation factor upon pricing or budget revisions.'
      },
      {
        nameAr: 'زر [استنزال تكلفة الوحدات المسلمة]',
        nameEn: 'Button [Relieve Delivered Unit COGS]',
        descAr: 'يتيح لك ترحيل تكلفة الشقق المسلمة تلقائياً من WIP إلى تكلفة المبيعات (COGS).',
        descEn: 'Automates journal posting transferring delivered unit costs from WIP into COGS.'
      },
      {
        nameAr: 'زر [معاينة كشف تكلفة الشقق]',
        nameEn: 'Button [Inspect Unit Cost Ledger]',
        descAr: 'يتيح لك استعراض كشف تفصيلي بنصيب كل شقة من التكلفة الإنشائية للمبنى بالكامل.',
        descEn: 'Displays the unit-by-unit capitalized cost allocation breakdown across the building.'
      }
    ],
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
    accountingImpactAr: 'استنزال تكلفة الوحدة المسلمة بالقيد: مدين تكلفة مبيعات 501000 ودائن أعمال تحت التنفيذ 120000.',
    accountingImpactEn: 'Relieves unit cost: Dr Cost of Goods Sold (501000) / Cr Work in Progress (120000).',
    icon: PieChart
  },

  // 9. الشركاء وممولو المشاريع وتوزيعات الأرباح (Partners & Equity Management - partners)
  {
    moduleId: 'partners',
    targetSelector: '[data-tour="nav-item-partners"]',
    stepNumber: 9,
    groupAr: 'الشركاء وحقوق الملكية',
    groupEn: 'PARTNERS & EQUITY',
    titleAr: 'الشركاء وممولو المشاريع وتوزيعات الأرباح (Partners & Equity)',
    titleEn: 'Partners, Financiers & Equity Distributions',
    badgeLabelAr: 'الشركاء والممولون',
    badgeLabelEn: 'PARTNERS & EQUITY',
    purposeAr: 'المنظومة المتكاملة لحقوق الشركاء وممولي المشروعات؛ حصر حصص الملكية (100% Equity Invariant)، توثيق رؤوس الأموال، وصرف الأرباح النقدية بعد فحص كفاية السيولة النقدية.',
    purposeEn: 'Complete shareholder and project financier equity management; enforces 100% equity invariant, capital injections, and cash-gated dividend payouts.',
    keyMetrics: [
      {
        nameAr: 'إجمالي رأس مال الشركاء (حساب 301000)',
        nameEn: 'Total Partner Capital Injected (301000)',
        descAr: 'إجمالي المبالغ النقدية المودعة من الشركاء للاستثمار في مشروعات التطوير العقاري.',
        descEn: 'Total equity capital contributed by shareholders and financiers toward project execution.',
        tagAr: 'رأس المال',
        tagEn: 'Capital Equity'
      },
      {
        nameAr: 'الأرباح المستحقة للشركاء (حساب 303000)',
        nameEn: 'Accrued Partner Dividend Share (303000)',
        descAr: 'حصص الشركاء المحققة من تدفقات ومتحصلات بيع الوحدات الجاهزة للتوزيع.',
        descEn: 'Share of collected contract revenues accrued to partners based on contract split terms.',
        tagAr: 'أرباح مستحقة',
        tagEn: 'Accrued Profit'
      },
      {
        nameAr: 'فحص كفاية السيولة النقدية (INV-14.B)',
        nameEn: 'Cash Liquidity Gate Check (INV-14.B)',
        descAr: 'التحقق التلقائي من وجود رصيد كاش حقيقي بالخزينة قبل السماح بصرف أي توزيعات.',
        descEn: 'Automated invariant blocking profit payouts if company liquid cash is insufficient.',
        tagAr: 'صمام السيولة',
        tagEn: 'Cash Gated'
      },
      {
        nameAr: 'اكتمال حصص المشروع بنسبة 100%',
        nameEn: '100% Equity Total Invariant',
        descAr: 'التحقق الصارم من أن مجموع نسب الشركاء بكل مشروع يعادل 100% تماماً دون أي خلل.',
        descEn: 'Audit invariant enforcing that total shareholder equity across any project sums to 100.00%.',
        tagAr: 'حصر الملكية',
        tagEn: '100% Parity'
      }
    ],
    keyButtons: [
      {
        nameAr: 'زر [+ إضافة شريك أو ممول جديد]',
        nameEn: 'Button [+ Add Partner / Financier]',
        descAr: 'يتيح لك تسجيل شريك جديد وتحديد مشاريعه ونسبته في رأس المال وتوزيعات الأرباح.',
        descEn: 'Enrolls a new investor, assigning project associations and equity/profit percentages.'
      },
      {
        nameAr: 'زر [ضخ رأس مال جديد (Capital Call)]',
        nameEn: 'Button [Capital Injection]',
        descAr: 'يتيح لك إثبات استثمار نقدي وارد للشركة وتوليد قيد الإيداع المحاسبي تلقائياً.',
        descEn: 'Books partner equity funding entries (Dr Bank 102000 / Cr Partner Capital 301000).'
      },
      {
        nameAr: 'زر [صرف أرباح لشريك]',
        nameEn: 'Button [Disburse Profit Payout]',
        descAr: 'يتيح لك صرف أرباح نقدية للشريك مع فحص السيولة وتوليد سند الصرف والقيد المحاسبي.',
        descEn: 'Processes cash-gated dividend payments with automated debit to 303000 and receipt generation.'
      },
      {
        nameAr: 'زر [كشف حساب الشريك]',
        nameEn: 'Button [Partner Statement of Account]',
        descAr: 'يتيح لك استخراج تقرير مفصل بحصص الشريك ومتحصلاته والأرباح المسددة له عبر المشروعات.',
        descEn: 'Generates comprehensive partner statement showing capital contributions, collections, and net balances.'
      }
    ],
    capabilitiesAr: [
      'إدارة وتوزيع نسب الشركاء وحصص رأس المال لكل مشروع استثماري بدقة 100%',
      'توثيق قيود ضخ رأس المال والتمويل الرأسمالي بالبنوك والخزينة',
      'فحص كفاية الرصيد النقدي قبل اعتماد صرف أي أرباح (INV-14.B)',
      'استخراج كشوف الحسابات وتاريخ التوزيعات المسددة لكل شريك'
    ],
    capabilitiesEn: [
      'Manage partner equity splits and capital calls strictly balancing to 100%',
      'Book capital injection journals (Dr Bank 102000 / Cr Equity 301000)',
      'Enforce cash liquidity checks before any dividend payout (INV-14.B)',
      'Export detailed partner account statements and payout audit histories'
    ],
    accountingImpactAr: 'قيد صرف الأرباح: مدين أرباح موزعة 303000 ودائن الخزينة 101000 مع حظر الصرف إذا تجاوز الرصيد المتاح.',
    accountingImpactEn: 'Dividend payout entry: Dr Dividends 303000 / Cr Safe 101000 with mandatory liquidity gating.',
    icon: Users
  },

  // 10. فسخ واسترداد العقود والتسويات (Rescissions - bonus step)
  {
    moduleId: 'rescissions',
    targetSelector: '[data-tour="nav-item-rescissions"]',
    stepNumber: 10,
    groupAr: 'الإقالات والفسخ الرقابي',
    groupEn: 'RESCISSIONS GOVERNANCE',
    titleAr: 'فسخ واسترداد العقود والتسويات (Rescissions & Settlement)',
    titleEn: 'Rescissions & Settlement Governance',
    badgeLabelAr: 'الإقالات والفسخ',
    badgeLabelEn: 'RESCISSIONS',
    purposeAr: 'منظومة الإقالات والفسخ الرقابي المتوافقة مع المادة ١٥ من قانون حماية المستهلك المصري؛ احتساب الحد الأدنى لرد أموال العميل (Forfeiture Floor)، الخصم الإداري، والاعتماد الثنائي (Maker-Checker).',
    purposeEn: 'Rescission & refund engine compliant with Egyptian Consumer Protection Law Art. 15; statutory refund floor, administrative fee, and Maker-Checker dual control.',
    keyMetrics: [
      {
        nameAr: 'الحد الأدنى القانوني للرد النقدي (Forfeiture Floor)',
        nameEn: 'Statutory Refund Floor (Law 15)',
        descAr: 'ضمان عدم تجاوز الخصم الإداري الحد الأقصى القانوني المصرح به، وألا ينتج أي استرداد سالب.',
        descEn: 'Protects consumer equity by ensuring administrative penalties never exceed statutory caps.',
        tagAr: 'حماية المستهلك',
        tagEn: 'Statutory Floor'
      },
      {
        nameAr: 'إجمالي المبالغ المستردة للعملاء',
        nameEn: 'Approved Customer Refund Amounts',
        descAr: 'حجم السيولة المعتمدة للإرجاع بعد إنهاء العقد رسمياً وتسوية المدفوعات.',
        descEn: 'Total cash disbursements authorized for buyer refund settlement upon contract rescission.',
        tagAr: 'استردادات نقدية',
        tagEn: 'Refund Balance'
      },
      {
        nameAr: 'الأقساط المسقطة والملغاة',
        nameEn: 'Voided Future Schedule Tranches',
        descAr: 'الأقساط الآجلة التي تم إسقاطها من ذمة العميل بأمان وتأكيد تسليم سندات القبض.',
        descEn: 'Pending installment receivables safely voided without breaking historical lineage.',
        tagAr: 'إسقاط مستحقات',
        tagEn: 'Voided Dues'
      },
      {
        nameAr: 'نظام الاعتماد الثنائي (Maker-Checker)',
        nameEn: 'Maker-Checker Dual Governance',
        descAr: 'اشتراط توقيع واعتماد مسؤولين اثنين قبل صرف أي تسوية نقدية لمنع التلاعب.',
        descEn: 'Dual-control workflow requiring creator initiation and manager authorization before cash release.',
        tagAr: 'رقابة ثنائية',
        tagEn: 'Dual Control'
      }
    ],
    keyButtons: [
      {
        nameAr: 'زر [بدء طلب تسوية / فسخ عقد]',
        nameEn: 'Button [Initiate Rescission]',
        descAr: 'يتيح لك اختيار العقد المتعثر واحتساب الحد الأدنى للرد والخصم الإداري آلياً.',
        descEn: 'Selects the defaulted contract and automatically calculates the statutory refund floor.'
      },
      {
        nameAr: 'زر [اعتماد التسوية (Checker)]',
        nameEn: 'Button [Approve Settlement]',
        descAr: 'يتيح للمدير المالي مراجعة الحسابات وتأكيد الصرف النقدي رسمياً.',
        descEn: 'Allows finance manager to inspect rescission calculations and authorize disbursements.'
      },
      {
        nameAr: 'زر [إسقاط سندات القبض والأقساط]',
        nameEn: 'Button [Void Dues & Hand Receipts]',
        descAr: 'يتيح لك إلغاء الأقساط المتبقية بأمان وتوثيق رد السندات للمشتري.',
        descEn: 'Voids outstanding tranches and archives receipt returns in the immutable audit log.'
      },
      {
        nameAr: 'زر [إعادة طرح الوحدة للبيع]',
        nameEn: 'Button [Restore Property to Catalog]',
        descAr: 'يتيح لك تحويل حالة الوحدة إلى متاحة مجدداً في الكتالوج فور إنهاء الفسخ.',
        descEn: 'Restores the rescinded unit back to Available inventory for public sales marketing.'
      }
    ],
    capabilitiesAr: [
      'تطبيق الحد الأدنى القانوني الصارم للرد النقدي للعميل وفقاً لمرحلة التسليم',
      'احتساب وتطبيق الخصم الإداري ورسم الاسترداد القانوني المعتمد',
      'إلغاء وإسقاط الأقساط والمستحقات المتبقية في ذمة العميل بأمان وتأكيد تسليم سندات القبض',
      'دورة الاعتماد الثنائي الإلزامية (Maker-Checker) لمنع أي صرف نقدي غير معتمد'
    ],
    capabilitiesEn: [
      'Enforce statutory refund floor (Pre-Delivery vs Post-Delivery handover rules)',
      'Deduct allowable administrative penalty fees with legal documentation',
      'Safely void outstanding customer installments and return receipts to the buyer',
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
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(10);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const AUTO_PLAY_SECONDS = 10;

  const currentStep = SIDEBAR_TOUR_STEPS[currentStepIndex] || SIDEBAR_TOUR_STEPS[0];
  const totalSteps = SIDEBAR_TOUR_STEPS.length;

  // Responsive mobile detector
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigate to module automatically when step changes
  useEffect(() => {
    if (isActive && currentStep && onNavigateToModule) {
      onNavigateToModule(currentStep.moduleId);
    }
  }, [isActive, currentStep, onNavigateToModule]);

  // Update target rect & scroll targeted sidebar item into view
  const updateSpotlight = useCallback((shouldScroll = false) => {
    if (!isActive || !currentStep || isMinimized) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
      if (isVisible) {
        setTargetRect(rect);
        if (shouldScroll) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          const t = setTimeout(() => {
            const updated = el.getBoundingClientRect();
            if (updated.width > 0 && updated.height > 0) {
              setTargetRect(updated);
            }
          }, 250);
          return () => clearTimeout(t);
        }
        return;
      }
    }
    setTargetRect(null);
  }, [isActive, currentStep, isMinimized]);

  // When step changes or tour activates, scroll element into view
  useEffect(() => {
    if (isActive && !isMinimized) {
      updateSpotlight(true);
    }
  }, [currentStepIndex, isActive, isMinimized, updateSpotlight]);

  // When window resizes or user scrolls, update rect WITHOUT scrollIntoView
  useEffect(() => {
    if (!isActive || isMinimized) return;

    const handleScrollOrResize = (e: Event) => {
      // Ignore scroll events originating from inside the tour card body
      if (e.target && cardRef.current && cardRef.current.contains(e.target as Node)) {
        return;
      }
      updateSpotlight(false);
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isActive, isMinimized, updateSpotlight]);

  // Auto-play timer countdown
  useEffect(() => {
    if (!isActive || !isAutoPlay) return;

    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isAutoPlay]);

  // When timer reaches 0, advance to next step or finish
  useEffect(() => {
    if (!isActive || !isAutoPlay || timerSeconds !== 0) return;

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setTimerSeconds(AUTO_PLAY_SECONDS);
    } else {
      setIsAutoPlay(false);
      setTimerSeconds(AUTO_PLAY_SECONDS);
    }
  }, [isActive, isAutoPlay, timerSeconds, currentStepIndex, totalSteps]);

  // Reset timer on manual step change
  useEffect(() => {
    setTimerSeconds(AUTO_PLAY_SECONDS);
  }, [currentStepIndex]);

  // Keyboard navigation support
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      const isInputActive = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

      if (e.key === 'Escape') {
        handleSkipTour();
      } else if (e.key === 'ArrowRight' && !isInputActive) {
        if (isAr) handlePrev();
        else handleNext();
      } else if (e.key === 'ArrowLeft' && !isInputActive) {
        if (isAr) handleNext();
        else handlePrev();
      } else if (e.key === ' ' && !isInputActive && activeTag !== 'BUTTON') {
        e.preventDefault();
        setIsAutoPlay(p => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isAr, currentStepIndex]);

  if (!isActive || !currentStep) return null;

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
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

  const handleJumpToStep = (index: number) => {
    setCurrentStepIndex(index);
    setTimerSeconds(AUTO_PLAY_SECONDS);
  };

  const Icon = currentStep.icon;

  // Placement calculation:
  // In RTL, dock is on right side. Card sits on opposite side (left).
  // In LTR, dock is on left side. Card sits on opposite side (right).
  const isDockOnRight = isAr;
  const cardWidth = 520;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        pointerEvents: isMinimized ? 'none' : 'auto',
        direction: isAr ? 'rtl' : 'ltr',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* SOFT BACKDROP WITH SPOTLIGHT HOLE CUTOUT OVER SIDEBAR ITEM - ONLY WHEN EXPANDED */}
      {!isMinimized && (
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
            <mask id="sovereign-spotlight-mask">
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
            fill="rgba(15, 23, 42, 0.40)"
            mask="url(#sovereign-spotlight-mask)"
          />
        </svg>
      )}

      {/* GLOWING SOVEREIGN GOLD BORDER AROUND TARGETED DOCK BUTTON - ONLY WHEN EXPANDED */}
      {!isMinimized && targetRect && (
        <div
          style={{
            position: 'fixed',
            left: targetRect.left - 6,
            top: targetRect.top - 4,
            width: targetRect.width + 12,
            height: targetRect.height + 8,
            borderRadius: '10px',
            border: '2.5px solid #946F23',
            boxShadow: '0 0 24px rgba(148, 111, 35, 0.65), inset 0 0 10px rgba(197, 160, 89, 0.35)',
            pointerEvents: 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 1000000
          }}
        />
      )}

      {/* MINIMIZED FLOATING PILL BAR (When user wants to interact with page directly) */}
      {isMinimized ? (
        <div
          style={{
            position: 'fixed',
            bottom: isMobile ? '16px' : '24px',
            left: isMobile ? '16px' : (isDockOnRight ? '24px' : 'auto'),
            right: isMobile ? '16px' : (isDockOnRight ? 'auto' : '24px'),
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1.5px solid #D8D2C4',
            borderRadius: '999px',
            padding: '0.6rem 1.1rem',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(216, 210, 196, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'center' : 'flex-start',
            gap: '0.85rem',
            zIndex: 1000001,
            pointerEvents: 'auto',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #946F23 0%, #C5A059 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.78rem',
              fontWeight: 800
            }}>
              {currentStepIndex + 1}
            </span>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                {isAr ? currentStep.titleAr : currentStep.titleEn}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                {isAr ? `خطوة ${currentStepIndex + 1} من ${totalSteps}` : `Step ${currentStepIndex + 1} of ${totalSteps}`}
              </div>
            </div>
          </div>

          <div style={{ height: '24px', width: '1px', background: '#D8D2C4' }} />

          {/* Auto Play Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoPlay(p => !p)}
            style={{
              background: isAutoPlay ? 'rgba(4, 120, 87, 0.12)' : 'rgba(148, 111, 35, 0.1)',
              border: `1px solid ${isAutoPlay ? 'rgba(4, 120, 87, 0.3)' : 'rgba(148, 111, 35, 0.3)'}`,
              color: isAutoPlay ? '#047857' : '#946F23',
              borderRadius: '8px',
              padding: '0.35rem 0.65rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            {isAutoPlay ? <Pause size={13} /> : <Play size={13} />}
            <span>{isAutoPlay ? (isAr ? `تشغيل (${timerSeconds}ث)` : `Auto (${timerSeconds}s)`) : (isAr ? 'تشغيل تلقائي' : 'Auto-play')}</span>
          </button>

          {/* Prev / Next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              style={{
                background: '#F1EFEA',
                border: '1px solid #D8D2C4',
                color: currentStepIndex === 0 ? '#CBD5E1' : '#0F172A',
                borderRadius: '8px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {isAr ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
            <button
              type="button"
              onClick={handleNext}
              style={{
                background: 'linear-gradient(135deg, #946F23 0%, #78581C 100%)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '8px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {isAr ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            </button>
          </div>

          <div style={{ height: '24px', width: '1px', background: '#D8D2C4' }} />

          {/* Expand */}
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            style={{
              background: '#F8F7F4',
              border: '1px solid #D8D2C4',
              color: '#0F172A',
              borderRadius: '8px',
              padding: '0.35rem 0.65rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Maximize2 size={13} />
            <span>{isAr ? 'توسيع الشرح' : 'Expand'}</span>
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={handleSkipTour}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '0.2rem'
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        /* FULL SOVEREIGN ALABASTER WALKTHROUGH CARD */
        <div 
          ref={cardRef}
          style={{
            position: 'fixed',
            top: isMobile ? '16px' : '20px',
            bottom: isMobile ? '16px' : '20px',
            left: isMobile ? '16px' : (isDockOnRight ? '24px' : 'auto'),
            right: isMobile ? '16px' : (isDockOnRight ? 'auto' : '24px'),
            width: isMobile ? 'calc(100vw - 32px)' : `min(${cardWidth}px, calc(100vw - 32px))`,
            maxWidth: 'calc(100vw - 32px)',
            margin: isMobile ? '0 auto' : undefined,
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(24px) saturate(180%)',
            border: '1.5px solid #D8D2C4',
            borderRadius: '20px',
            boxShadow: '0 24px 64px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(216, 210, 196, 0.8), 0 12px 32px -4px rgba(148, 111, 35, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#0F172A',
            zIndex: 1000001,
            pointerEvents: 'auto',
            animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* TOP ROYAL GOLD LUXURY ACCENT STRIP */}
          <div style={{
            height: '4px',
            width: '100%',
            background: 'linear-gradient(90deg, #946F23 0%, #C5A059 50%, #946F23 100%)',
            flexShrink: 0
          }} />

          {/* CARD HEADER: BRANDING, PROGRESS, AUTO-PLAY, MINIMIZE, CLOSE */}
          <div style={{
            padding: '1rem 1.35rem 0.75rem 1.35rem',
            borderBottom: '1px solid #E5E0D8',
            background: 'rgba(250, 249, 246, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #946F23 0%, #C5A059 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(148, 111, 35, 0.28)',
                  flexShrink: 0
                }}>
                  <Compass size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A' }}>
                      {isAr ? 'دليل وجولة المنظومة الشاملة' : 'FIN-OS Master Guided Tour'}
                    </span>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      padding: '0.12rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(148, 111, 35, 0.12)',
                      border: '1px solid rgba(148, 111, 35, 0.3)',
                      color: '#946F23'
                    }}>
                      {isAr ? '9 شاشات أساسية + ملحق الإقالات' : '9 Core Modules + Rescissions'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    {isAr ? `استعراض وظائف ومؤشرات شاشة (${currentStepIndex + 1} من ${totalSteps})` : `Module Telemetry & Action Guide (${currentStepIndex + 1} of ${totalSteps})`}
                  </div>
                </div>
              </div>

              {/* Utility buttons: AutoPlay, Minimize, Close */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {/* Auto Play Toggle */}
                <button
                  type="button"
                  onClick={() => setIsAutoPlay(p => !p)}
                  title={isAr ? 'تشغيل الانتقال التلقائي بين الشاشات' : 'Toggle auto-transition between pages'}
                  style={{
                    background: isAutoPlay ? 'rgba(4, 120, 87, 0.12)' : 'rgba(148, 111, 35, 0.08)',
                    border: `1px solid ${isAutoPlay ? 'rgba(4, 120, 87, 0.3)' : 'rgba(148, 111, 35, 0.25)'}`,
                    color: isAutoPlay ? '#047857' : '#946F23',
                    borderRadius: '8px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isAutoPlay ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isAutoPlay ? `${timerSeconds}s` : (isAr ? 'تلقائي' : 'Auto')}</span>
                </button>

                {/* Minimize button */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  title={isAr ? 'تصغير الدليل لرؤية الشاشة كاملة' : 'Minimize tour card'}
                  style={{
                    background: '#F1EFEA',
                    border: '1px solid #D8D2C4',
                    color: '#475569',
                    borderRadius: '8px',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Minimize2 size={13} />
                </button>

                {/* Close / Skip button */}
                <button
                  type="button"
                  onClick={handleSkipTour}
                  title={isAr ? 'إغلاق الجولة' : 'Close walkthrough'}
                  style={{
                    background: '#F1EFEA',
                    border: '1px solid #D8D2C4',
                    color: '#64748B',
                    borderRadius: '8px',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* QUICK JUMP PILL NAVIGATION (1 TO 9 + BONUS) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              overflowX: 'auto',
              paddingBottom: '0.2rem',
              scrollbarWidth: 'none'
            }}>
              {SIDEBAR_TOUR_STEPS.map((step, sIdx) => {
                const isCurrent = sIdx === currentStepIndex;
                const isPassed = sIdx < currentStepIndex;
                const isBonus = sIdx === 9;
                return (
                  <button
                    key={step.moduleId}
                    type="button"
                    onClick={() => handleJumpToStep(sIdx)}
                    style={{
                      flex: isBonus ? 'none' : 1,
                      minWidth: isBonus ? 'auto' : '32px',
                      padding: isBonus ? '0 0.55rem' : '0',
                      height: '28px',
                      borderRadius: '8px',
                      border: isCurrent 
                        ? '1.5px solid #946F23' 
                        : isPassed 
                          ? '1px solid rgba(148, 111, 35, 0.35)' 
                          : isBonus 
                            ? '1px dashed #D8D2C4' 
                            : '1px solid #E5E0D8',
                      background: isCurrent 
                        ? 'linear-gradient(135deg, #946F23 0%, #78581C 100%)' 
                        : isPassed 
                          ? 'rgba(148, 111, 35, 0.12)' 
                          : '#FFFFFF',
                      color: isCurrent 
                        ? '#FFFFFF' 
                        : isPassed 
                          ? '#946F23' 
                          : '#64748B',
                      fontSize: isBonus ? '0.68rem' : '0.74rem',
                      fontWeight: isCurrent ? 900 : 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    title={isAr ? step.titleAr : step.titleEn}
                  >
                    {isPassed ? <Check size={12} color="#047857" /> : (isBonus ? (isAr ? '10 • الإقالات' : '10 • Rescissions') : sIdx + 1)}
                  </button>
                );
              })}
            </div>

            {/* AUTO-PLAY COUNTDOWN BAR */}
            {isAutoPlay && (
              <div style={{
                height: '3px',
                width: '100%',
                background: '#E5E0D8',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(timerSeconds / AUTO_PLAY_SECONDS) * 100}%`,
                  background: 'linear-gradient(90deg, #047857 0%, #10B981 100%)',
                  transition: 'width 1s linear'
                }} />
              </div>
            )}
          </div>

          {/* MAIN SCROLLABLE CONTENT BODY */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.35rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.15rem'
          }}>
            {/* STEP TITLE & BADGE */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                <span style={{
                  background: 'rgba(148, 111, 35, 0.1)',
                  border: '1px solid rgba(148, 111, 35, 0.28)',
                  color: '#946F23',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px'
                }}>
                  {isAr ? currentStep.badgeLabelAr : currentStep.badgeLabelEn}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                  • {isAr ? currentStep.groupAr : currentStep.groupEn}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(148, 111, 35, 0.12)',
                  border: '1px solid rgba(148, 111, 35, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#946F23',
                  flexShrink: 0
                }}>
                  <Icon size={18} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.3 }}>
                  {isAr ? currentStep.titleAr : currentStep.titleEn}
                </h2>
              </div>
            </div>

            {/* PURPOSE: WHAT THIS PAGE SHOWS & DOES */}
            <div style={{
              background: '#FAF9F6',
              border: '1px solid #E5E0D8',
              borderRadius: '12px',
              padding: '0.9rem 1.1rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                marginBottom: '0.35rem',
                fontSize: '0.76rem',
                fontWeight: 800,
                color: '#946F23'
              }}>
                <Info size={14} />
                <span>{isAr ? 'وظيفة هذه الشاشة وما تقدمه لك:' : 'What this page shows & does:'}</span>
              </div>
              <p style={{
                margin: 0,
                fontSize: '0.82rem',
                lineHeight: 1.65,
                color: '#334155'
              }}>
                {isAr ? currentStep.purposeAr : currentStep.purposeEn}
              </p>
            </div>

            {/* SECTION 1: KEY METRICS TO WATCH (أهم المؤشرات التي يجب وضع عينك عليها) */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.65rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  color: '#0F172A'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#047857',
                    display: 'inline-block'
                  }} />
                  <span>{isAr ? 'أهم المؤشرات الواجب مراقبتها في هذه الشاشة:' : 'Key Metrics You Should Monitor:'}</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>
                  {currentStep.keyMetrics.length} {isAr ? 'مؤشرات رئيسية' : 'Metrics'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {currentStep.keyMetrics.map((metric, mIdx) => (
                  <div
                    key={mIdx}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E0D8',
                      borderRadius: '11px',
                      padding: '0.75rem 0.95rem',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          background: 'rgba(4, 120, 87, 0.1)',
                          color: '#047857',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {mIdx + 1}
                        </span>
                        <strong style={{ fontSize: '0.82rem', color: '#0F172A', fontWeight: 800 }}>
                          {isAr ? metric.nameAr : metric.nameEn}
                        </strong>
                      </div>
                      {metric.tagAr && (
                        <span style={{
                          background: 'rgba(4, 120, 87, 0.08)',
                          border: '1px solid rgba(4, 120, 87, 0.25)',
                          color: '#047857',
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap'
                        }}>
                          {isAr ? metric.tagAr : metric.tagEn}
                        </span>
                      )}
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '0.76rem',
                      lineHeight: 1.55,
                      color: '#475569',
                      paddingInlineStart: '1.75rem'
                    }}>
                      {isAr ? metric.descAr : metric.descEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: KEY BUTTONS & ACTIONS (أهم الأزرار وماذا تتيح لك) */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.65rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.84rem',
                  fontWeight: 900,
                  color: '#0F172A'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#946F23',
                    display: 'inline-block'
                  }} />
                  <span>{isAr ? 'أهم الأزرار والإجراءات وماذا تتيح لك:' : 'Key Buttons & What They Allow You To Do:'}</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700 }}>
                  {currentStep.keyButtons.length} {isAr ? 'أزرار حيوية' : 'Buttons'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {currentStep.keyButtons.map((btn, bIdx) => (
                  <div
                    key={bIdx}
                    style={{
                      background: '#FAF9F6',
                      border: '1px solid #E5E0D8',
                      borderRadius: '11px',
                      padding: '0.75rem 0.95rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.65rem'
                    }}
                  >
                    <span style={{
                      background: 'linear-gradient(135deg, rgba(148, 111, 35, 0.15) 0%, rgba(197, 160, 89, 0.08) 100%)',
                      border: '1px solid rgba(148, 111, 35, 0.3)',
                      color: '#946F23',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}>
                      {isAr ? btn.nameAr : btn.nameEn}
                    </span>
                    <div style={{
                      fontSize: '0.76rem',
                      lineHeight: 1.55,
                      color: '#334155',
                      fontWeight: 500
                    }}>
                      {isAr ? btn.descAr : btn.descEn}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: STATUTORY & ACCOUNTING IMPACT (الأثر المحاسبي والرقابي) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(148, 111, 35, 0.08) 0%, rgba(197, 160, 89, 0.03) 100%)',
              border: '1px solid rgba(148, 111, 35, 0.25)',
              borderRadius: '12px',
              padding: '0.85rem 1.1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.7rem'
            }}>
              <ShieldCheck size={18} color="#946F23" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#946F23', marginBottom: '0.2rem' }}>
                  {isAr ? 'الأثر المحاسبي وقواعد الرقابة المالية:' : 'Statutory & Accounting Impact:'}
                </div>
                <div style={{ fontSize: '0.75rem', lineHeight: 1.55, color: '#1E293B' }}>
                  {isAr ? currentStep.accountingImpactAr : currentStep.accountingImpactEn}
                </div>
              </div>
            </div>
          </div>

          {/* CARD FOOTER: NAVIGATION CONTROLS */}
          <div style={{
            padding: '0.9rem 1.35rem',
            borderTop: '1px solid #E5E0D8',
            background: 'rgba(250, 249, 246, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={handleSkipTour}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0.4rem 0.6rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
            >
              {isAr ? 'تخطي الجولة' : 'Skip Tour'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Previous button */}
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #D8D2C4',
                    color: '#334155',
                    borderRadius: '10px',
                    padding: '0.5rem 0.9rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 5px rgba(15, 23, 42, 0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F8F7F4';
                    e.currentTarget.style.borderColor = '#946F23';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#D8D2C4';
                  }}
                >
                  {isAr ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                  <span>{isAr ? 'السابق' : 'Previous'}</span>
                </button>
              )}

              {/* Next / Finish button */}
              <button
                type="button"
                onClick={handleNext}
                style={{
                  background: 'linear-gradient(135deg, #946F23 0%, #78581C 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 14px rgba(148, 111, 35, 0.35)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span>
                  {currentStepIndex >= totalSteps - 1 
                    ? (isAr ? 'إنهاء الجولة' : 'Finish Tour') 
                    : (isAr ? 'التالي' : 'Next')}
                </span>
                {currentStepIndex >= totalSteps - 1 ? (
                  <CheckCircle2 size={15} />
                ) : (
                  isAr ? <ChevronLeft size={15} /> : <ChevronRight size={15} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
