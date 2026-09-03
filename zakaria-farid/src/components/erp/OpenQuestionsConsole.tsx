'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export interface OpenQuestionItem {
  id: string;
  title: string;
  titleAr: string;
  status: 'OPEN' | 'CLOSED' | 'BLOCKED';
  blockedModules: string[];
  blockedModulesAr: string[];
  interimDefault: string;
  interimDefaultAr: string;
  specCitation: string;
  description: string;
  descriptionAr: string;
  proposedOptions: string[];
  proposedOptionsAr: string[];
}

export const OPEN_QUESTIONS_DATA: OpenQuestionItem[] = [
  {
    id: 'Q1',
    title: 'Accounting Period Locking & Exception Mechanism',
    titleAr: 'آلية قفل الفترات المالية وحالات الاستثناء الرقابي (Period Locking & Override)',
    status: 'OPEN',
    blockedModules: ['Module 1 (General Ledger)', 'Module 8 (Amendments)'],
    blockedModulesAr: ['الوحدة ١ (الأستاذ العام)', 'الوحدة ٨ (تعديلات العقود)'],
    interimDefault: 'Strict period locking (no back-dated postings allowed to LOCKED/CLOSED periods).',
    interimDefaultAr: 'قفل صارم تام: يُحظر قيد أي حركات محاسبية سابقة أو لاحقة على الفترات المقفلة أو المغلقة (المعيار 0.9).',
    specCitation: 'AGENT_BUILD_SPEC.md §0.9, §4.1',
    description: 'The spec mandates that periods can be marked LOCKED or CLOSED, and mutations are rejected. However, standard ERPs provide an audit-logged override for CFO role. Does an override path exist?',
    descriptionAr: 'المواصفة تلزم بقفل الفترات ومنع أي قيد محاسبي عليها نهائياً. هل يُسمح بمسار استثنائي مدقق بتوقيع مزدوج للمدير المالي، أم يُطبق القفل الصارم دون أي استثناء؟',
    proposedOptions: [
      'Option A: Hard lock. No overrides permitted under any circumstance.',
      'Option B: Supervised override requiring dual CFO + Auditor sign-off.'
    ],
    proposedOptionsAr: [
      'الخيار أ: قفل حديدي صارم دون أي استثناء تحت أي ظرف.',
      'الخيار ب: مسار استثنائي مدقق يتطلب اعتماداً مزدوجاً من المدير المالي ومراقب الحسابات.'
    ]
  },
  {
    id: 'Q2',
    title: 'Post-Handover Payment Default & Repossession Trigger',
    titleAr: 'شروط تعثر السداد واسترداد الوحدة بعد التسليم (Post-Handover Repossession)',
    status: 'OPEN',
    blockedModules: ['Module 5 (Rescission)', 'Module 3 (Contracts)'],
    blockedModulesAr: ['الوحدة ٥ (الفسخ والاسترداد)', 'الوحدة ٣ (العقود)'],
    interimDefault: 'Repossession triggered only upon formal legal rescission entry.',
    interimDefaultAr: 'الاسترداد لا يتم إلا بموجب قيد فسخ رسمي صادر ومعتمد من الشؤون القانونية.',
    specCitation: 'AGENT_BUILD_SPEC.md §4.10 (Branch 2), §14.G',
    description: 'For units already delivered, what is the exact default threshold that legally triggers inventory repossession?',
    descriptionAr: 'بالنسبة للوحدات المسلمة فعلياً للعميل، ما هو الحد الزمني والقانوني الدقيق لتعثر السداد الذي يطلق إجراءات استرداد العقار وإلغاء التسليم؟',
    proposedOptions: [
      'Option A: 90 days past due on 2 consecutive tranches.',
      'Option B: Judicial court order required before physical repossession.'
    ],
    proposedOptionsAr: [
      'الخيار أ: تأخر سداد قسطين متتاليين لمدة تجاوزت ٩٠ يوماً.',
      'الخيار ب: صدور حكم قضائي نهائي بالفسخ قبل اتخاذ إجراءات الاسترداد الميداني.'
    ]
  },
  {
    id: 'Q3',
    title: 'Down Payment & Installment Cash Receipt Account Routing',
    titleAr: 'توجيه النقدية المحصلة للمقدمات والأقساط (حساب الخزينة ١٠١٠٠٠ أم البنك ١٠٢٠٠٠)',
    status: 'OPEN',
    blockedModules: ['Module 3 (Contracts)', 'Module 4 (PDC)'],
    blockedModulesAr: ['الوحدة ٣ (العقود)', 'الوحدة ٤ (خزينة الشيكات)'],
    interimDefault: 'Manual dropdown requiring explicit selection of 101000 vs 102000; no silent default.',
    interimDefaultAr: 'قائمة اختيار يدوية إلزامية تتطلب تحديد الحساب صراحة دون أي اختيار افتراضي صامت.',
    specCitation: 'AGENT_BUILD_SPEC.md §14.A, §14.D',
    description: 'Should cash payments default to 101000 Cash on Hand (safe) or 102000 Operating Bank Account?',
    descriptionAr: 'هل توجه النقدية المحصلة مباشرة إلى حساب الخزينة النقدية (١٠١٠٠٠) أم إلى الحساب البنكي التشغيلي (١٠٢٠٠٠)؟',
    proposedOptions: [
      'Option A: Always deposit directly into 102000 Operating Bank.',
      'Option B: Route to 101000 Cash on Hand first, requiring a secondary bank deposit entry.'
    ],
    proposedOptionsAr: [
      'الخيار أ: الإيداع المباشر دائماً في الحساب البنكي التشغيلي (١٠٢٠٠٠).',
      'الخيار ب: التوجيه أولاً لخزينة النقدية (١٠١٠٠٠) ثم إجراء قيد إيداع بنكي لاحق.'
    ]
  },
  {
    id: 'Q4',
    title: 'Scope & Settlement of Account 103300 (Customer Tax Clearing)',
    titleAr: 'نطاق وتسوية حساب وسيط ضرائب العملاء (حساب ١٠٣٣٠٠)',
    status: 'OPEN',
    blockedModules: ['Module 1 (GL)', 'Module 7 (Tax)'],
    blockedModulesAr: ['الوحدة ١ (الأستاذ العام)', 'الوحدة ٧ (الضرائب)'],
    interimDefault: 'Postings to 103300 are strictly blocked until business resolution is reached.',
    interimDefaultAr: 'حظر القيد التام على هذا الحساب وتعطيل اختياره حتى حسم المعالجة المحاسبية من الإدارة.',
    specCitation: 'AGENT_BUILD_SPEC.md §3 (Canonical COA)',
    description: 'Account 103300 was declared in Rev 1 COA but lacked clear business clearing rules in Rev 2.',
    descriptionAr: 'الحساب ١٠٣٣٠٠ وُجد في الدليل الأصلي ولكن لم تتحدد قواعد تسويته التشغيلية مع مصلحة الضرائب والمشترين.',
    proposedOptions: [
      'Option A: Retire account 103300 completely.',
      'Option B: Retain for cross-charging disposal taxes back to buyers.'
    ],
    proposedOptionsAr: [
      'الخيار أ: حذف الحساب ١٠٣٣٠٠ نهائياً من دليل الحسابات.',
      'الخيار ب: الإبقاء عليه لتحميل ضريبة التصرفات العقارية على المشتري عند الاتفاق.'
    ]
  },
  {
    id: 'Q5',
    title: 'Rescission Penalty Cap & Floor Precedence',
    titleAr: 'قاعدة الحد الأدنى لغرامة الفسخ والرد المالي (Forfeiture Floor)',
    status: 'CLOSED',
    blockedModules: ['Module 5 (Rescission)'],
    blockedModulesAr: ['الوحدة ٥ (الفسخ والاسترداد)'],
    interimDefault: 'Forfeiture Floor implemented: penalty_retained = min(10% * V, C), net_refund >= 0.00.',
    interimDefaultAr: 'مطبق ومحصن دفترياً: الغرامة المحتجزة = الأدنى بين (١٠٪ × V والنقدية C)، وصافي رد العميل (٢٠٦٢٠٠) لا يقل عن ٠.٠٠ ج.م.',
    specCitation: 'AGENT_BUILD_SPEC.md §4.10, Invariant 4.10',
    description: 'Resolved in Revision 2: If customer collected cash is less than 10% penalty, developer caps penalty at collected cash and does not pursue negative liability.',
    descriptionAr: 'محسوم في التعديل ٢: إذا كانت النقدية المحصلة أقل من غرامة ١٠٪، تحتجز الشركة النقدية فقط ولا تُطالب العميل بمبالغ سالبة.',
    proposedOptions: ['Resolved via Invariant 4.10 Forfeiture Floor.'],
    proposedOptionsAr: ['محسوم نظامياً بموجب المعيار المحاسبي والقانوني Invariant 4.10.']
  },
  {
    id: 'Q6',
    title: 'PDC Bounced Cheque Operational Workflow',
    titleAr: 'المسار الإجرائي للشيك المرتد من البنك (Bounced Cheque Protocol)',
    status: 'OPEN',
    blockedModules: ['Module 4 (PDC Vault)'],
    blockedModulesAr: ['الوحدة ٤ (خزينة الشيكات)'],
    interimDefault: 'Cheque marked Bounced; linked installment schedule remains in Pending state.',
    interimDefaultAr: 'يُسجل الشيك كمرتد بالخزينة، ويظل القسط في حالة "معلق (Pending)" بانتظار الإجراء القانوني.',
    specCitation: 'AGENT_BUILD_SPEC.md §14.F.16',
    description: 'When a PDC bounces at the bank, does it automatically transition the installment tranche to Defaulted?',
    descriptionAr: 'عند ارتداد الشيك من البنك لعدم كفاية الرصيد، هل ينتقل قسط العقد فوراً إلى حالة "متعثر (Defaulted)"؟',
    proposedOptions: [
      'Option A: Immediate transition to Defaulted with legal notice generation.',
      'Option B: 15-day grace period allowing replacement cheque before defaulting.'
    ],
    proposedOptionsAr: [
      'الخيار أ: التحويل الفوري لحالة متعثر وتوجيه إنذار قانوني للمشتري.',
      'الخيار ب: مهلة سماح ١٥ يوماً لتقديم شيك بديل قبل إعلان التعثر رسمياً.'
    ]
  },
  {
    id: 'Q9',
    title: 'Installment Rescheduling & Defaulted State Transition Trigger',
    titleAr: 'جدولة الأقساط ومعيار التحول لحالة التعثر (Defaulted State Trigger)',
    status: 'OPEN',
    blockedModules: ['Module 3 (Contracts)', 'Module 8 (Amendments)'],
    blockedModulesAr: ['الوحدة ٣ (العقود)', 'الوحدة ٨ (التعديلات)'],
    interimDefault: 'Defaulted state transition is stubbed and not automated; manual action only.',
    interimDefaultAr: 'التحول التلقائي معطل برمجياً؛ التحويل يتطلب قراراً يدوياً صريحاً من لجنة الائتمان.',
    specCitation: 'AGENT_BUILD_SPEC.md §7 (State Machines)',
    description: 'What exact elapsed days past due date triggers an automated transition from Pending to Defaulted?',
    descriptionAr: 'ما هو عدد الأيام الدقيق بعد تاريخ الاستحقاق الذي يطلق تحول القسط تلقائياً من معلق إلى متعثر؟',
    proposedOptions: [
      'Option A: Automatic batch job marks Defaulted at 60 days overdue.',
      'Option B: Human credit committee review required to mark Defaulted.'
    ],
    proposedOptionsAr: [
      'الخيار أ: تشغيل دوري تلقائي يعلن التعثر بعد ٦٠ يوماً من تاريخ الاستحقاق.',
      'الخيار ب: مراجعة يدوية إلزامية من إدارة الائتمان والمراجعة قبل إثبات التعثر.'
    ]
  },
  {
    id: 'Q11',
    title: 'Relative Sales Value (RSV) Allocation Distortion Across Phases',
    titleAr: 'تشوه معامل التكلفة النسبية (RSV) بين مراحل المشروع المتعددة',
    status: 'OPEN',
    blockedModules: ['Module 6 (RSV / WIP)'],
    blockedModulesAr: ['الوحدة ٦ (تخصيص التكاليف و RSV)'],
    interimDefault: 'RSV factor calculated across active phase sales ceiling (§14.C.7).',
    interimDefaultAr: 'حساب معامل RSV بناءً على سقف مبيعات الميزانية التقديرية المعتمدة للمشروع ككل (§14.C.7).',
    specCitation: 'AGENT_BUILD_SPEC.md §14.C.7',
    description: 'In multi-phase developments where land cost is incurred upfront in Phase 1, RSV factor can distort early phase margins.',
    descriptionAr: 'في المشروعات متعددة المراحل ذات تكلفة الأرض المرتفعة بالمرحلة الأولى، قد يتشوه هامش ربح المراحل المبكرة.',
    proposedOptions: [
      'Option A: Phase-independent master budget RSV.',
      'Option B: Ring-fenced phase-by-phase RSV allocation.'
    ],
    proposedOptionsAr: [
      'الخيار أ: تطبيق معامل موحد للمشروع ككل بمعزل عن توقيت المراحل.',
      'الخيار ب: حيازة وتخصيص مستقل ومغلق لكل مرحلة تطويرية على حدة.'
    ]
  },
  {
    id: 'Q12',
    title: 'Partner Equity Capital Call Ceiling & Default Dilution',
    titleAr: 'سقف طلبات تمويل الشركاء ونسبة التخفيف عند التعثر (Capital Call Dilution)',
    status: 'OPEN',
    blockedModules: ['Module 10 (Partner Equity)'],
    blockedModulesAr: ['الوحدة ١٠ (حقوق الشركاء)'],
    interimDefault: 'Ceiling enforced against approved project budget; dilution calculation stubbed.',
    interimDefaultAr: 'الالتزام بسقف ميزانية المشروع المعتمدة، مع تجميد معادلة التخفيف العقابية مؤقتاً.',
    specCitation: 'AGENT_BUILD_SPEC.md §14.B',
    description: 'When a joint venture partner fails to fund a pro-rata capital call within 30 days, what is the exact dilution formula?',
    descriptionAr: 'عند تخلف شريك في مشروع مشترك عن سداد حصته النقدية خلال ٣٠ يوماً، ما هي معادلة تخفيف حصته بدقة؟',
    proposedOptions: [
      'Option A: Standard pro-rata dilution of ownership percentage.',
      'Option B: Penalty dilution at 1.5x of unfunded amount.'
    ],
    proposedOptionsAr: [
      'الخيار أ: تخفيف نسبي مباشر يعادل النقص في رأس المال المسدد.',
      'الخيار ب: تخفيف عقابي بنسبة ١.٥ ضعف المبلغ غير الممول.'
    ]
  },
  {
    id: 'Q13',
    title: 'Real Estate Disposal Tax (2.5%) Cash Float Timing',
    titleAr: 'تمويل فجوة سيولة ضريبة التصرفات العقارية (٢.٥٪) لمصلحة الضرائب',
    status: 'OPEN',
    blockedModules: ['Module 7 (Tax)'],
    blockedModulesAr: ['الوحدة ٧ (الضرائب)'],
    interimDefault: 'Case B disposal tax recognized upon contract execution with 30-day remittance.',
    interimDefaultAr: 'إثبات استحقاق الضريبة عند توقيع العقد، وتقديم دفعة نقدية مؤقتة من الشركة لمصلحة الضرائب.',
    specCitation: 'AGENT_BUILD_SPEC.md §14.E',
    description: 'Case B contracts trigger 2.5% disposal tax due within 30 days to ETA, but developer may not have collected 2.5% in cash yet.',
    descriptionAr: 'عقود الحالة B تلزم بتوريد ضريبة ٢.٥٪ للمصلحة خلال ٣٠ يوماً، بينما قد لا يكون العميل قد سدد ما يكفي لتغطيتها.',
    proposedOptions: [
      'Option A: Developer advances cash float to ETA.',
      'Option B: Minimum down payment policy enforced at >= 10% to cover tax.'
    ],
    proposedOptionsAr: [
      'الخيار أ: تمويل مؤقت من رأس مال الشركة العامل لمصلحة الضرائب المصرية.',
      'الخيار ب: اشتراط حد أدنى للدفعة المقدمة لا يقل عن ١٠٪ لتغطية الضريبة.'
    ]
  },
  {
    id: 'Q14',
    title: 'Foreign Currency (USD) Contract Settlement & Exchange Loss',
    titleAr: 'تسوية عقود العملات الأجنبية (الدولار) وفروق التقريب المحاسبي',
    status: 'OPEN',
    blockedModules: ['Module 9 (Multi-Currency)'],
    blockedModulesAr: ['الوحدة ٩ (العملات الأجنبية)'],
    interimDefault: 'FX gain/loss marked pending rounding rule; CBE official rate used.',
    interimDefaultAr: 'تسجيل فروق العملة مع تعليق قاعدة التقريب مؤقتاً واعتماد سعر البنك المركزي الرسمي المعلن.',
    specCitation: 'AGENT_BUILD_SPEC.md §14.A, §14.D',
    description: 'For contracts denominated in USD settled in EGP, what is the exact rounding rule for daily CBE rate fluctuations?',
    descriptionAr: 'بالنسبة للعقود المقومة بالدولار والمسددة بالجنيه المصري، ما هي قاعدة التقريب الدقيقة لفروق الصرف اليومية؟',
    proposedOptions: [
      'Option A: Standard round-half-up to 2 decimal places.',
      'Option B: Truncation to 2 decimal places with remainder absorbed in final tranche.'
    ],
    proposedOptionsAr: [
      'الخيار أ: التقريب الحسابي القياسي لأقرب قرشين (Round-half-up).',
      'الخيار ب: البتر لأقرب منزلتين مع امتصاص الفارق بالكامل في القسط الأخير.'
    ]
  }
];

interface OpenQuestionsConsoleProps {
  isAr?: boolean;
  selectedQuestionId?: string | null;
}

export const OpenQuestionsConsole: React.FC<OpenQuestionsConsoleProps> = ({
  isAr = false,
  selectedQuestionId = null
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(selectedQuestionId || 'Q1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#946f23' }}>
          <AlertTriangle size={20} />
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
            {isAr ? 'لوحة المسائل المفتوحة والحوكمة القانونية (OPEN_QUESTIONS.md)' : 'Open Questions & Statutory Gating Console'}
          </h2>
        </div>
        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#475569' }}>
          {isAr 
            ? 'سجل الحوكمة الصارمة: منع الاجتهاد البرمجي والتخمين الافتراضي في المسائل المالية والقانونية الجوهرية (UI_BUILD.md §5.5).'
            : 'Operational Boundary Register: Eliminating silent assumptions and plausible-sounding guesses on critical financial & statutory logic.'}
        </p>

        {/* 5 Core Architectural Boundaries Callout Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#946f23' }}>
              {isAr ? '١. استئصال الاختراع الصامت' : '1. Zero Silent Invention'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
              {isAr ? 'لا تخمين للنسب أو الحسابات؛ يُسجل الفارق فوراً كمسألة معلقة.' : 'Ambiguity halts code. No AI or engineer guessing on COA or tax rates.'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
              {isAr ? '٢. عزل المعوقات دون تعطيل' : '2. Quarantined Blockers'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
              {isAr ? 'حجر الحالات الشائكة مؤقتاً مع مواصلة بناء بقية المنظومة.' : 'Isolates blocked sub-tasks while unaffected modules run smoothly.'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626' }}>
              {isAr ? '٣. تعثر صريح (Hard Fail)' : '3. Hard-Failing Stubs'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
              {isAr ? 'استدعاء المسارات غير المحسومة يطلق خطأ نظامياً صريحاً.' : 'Throws explicit invariant errors instead of dangerous silent fallbacks.'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309' }}>
              {isAr ? '٤. فصل الملكية القانونية' : '4. Legal / Business Ownership'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
              {isAr ? 'السياسات العقارية والضريبية حصرياً بيد أصحاب المصلحة.' : 'Engineers implement rules; human CFO/counsel sets statutory policy.'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d' }}>
              {isAr ? '٥. مسار رقابي موثق' : '5. Traceable Audit Trail'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
              {isAr ? 'الإغلاق يتم فقط بقرار رسمي موثق يُعدل المواصفة.' : 'Closed only via explicit business directive, permanently verifiable.'}
            </div>
          </div>
        </div>
      </div>

      {/* Questions Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {OPEN_QUESTIONS_DATA.map(q => {
          const isExpanded = expandedId === q.id;
          const isClosed = q.status === 'CLOSED';
          const title = isAr ? q.titleAr : q.title;
          const desc = isAr ? q.descriptionAr : q.description;
          const interim = isAr ? q.interimDefaultAr : q.interimDefault;
          const options = isAr ? q.proposedOptionsAr : q.proposedOptions;
          const modules = isAr ? q.blockedModulesAr : q.blockedModules;

          return (
            <div 
              key={q.id}
              style={{
                background: '#ffffff',
                border: isExpanded ? '1.5px solid #946f23' : '1px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <div 
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: isExpanded ? 'rgba(148, 111, 35, 0.04)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span 
                    style={{ 
                      fontVariantNumeric: 'tabular-nums', 
                      fontSize: '0.85rem', 
                      fontWeight: 800, 
                      color: isClosed ? '#15803d' : '#b45309',
                      background: isClosed ? '#f0fdf4' : '#fffbeb',
                      border: isClosed ? '1px solid #bbf7d0' : '1px solid rgba(217, 119, 6, 0.3)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px'
                    }}
                  >
                    {q.id}
                  </span>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {title}
                  </h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span 
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: isClosed ? '#15803d' : '#b45309',
                      background: isClosed ? '#f0fdf4' : '#fffbeb',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      border: `1px solid ${isClosed ? '#bbf7d0' : 'rgba(217, 119, 6, 0.3)'}`
                    }}
                  >
                    {isClosed ? (isAr ? 'محسوم' : 'CLOSED') : (isAr ? 'معلق قيد الحسم' : 'OPEN')}
                  </span>
                  {isExpanded ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                      {isAr ? 'البيان والمسألة المطروحة:' : 'Detailed Question:'}
                    </div>
                    <div style={{ color: '#0f172a', marginTop: '0.25rem', lineHeight: 1.5, fontWeight: 500 }}>
                      {desc}
                    </div>
                  </div>

                  <div style={{ background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.25)', padding: '0.85rem', borderRadius: '8px' }}>
                    <div style={{ color: '#946f23', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      {isAr ? 'الإجراء المؤقت المطبق بالنظام حالياً (Interim Default):' : 'Active Interim Default in System:'}
                    </div>
                    <div style={{ color: '#78350f', marginTop: '0.25rem', fontWeight: 700, lineHeight: 1.4 }}>
                      {interim}
                    </div>
                    <div style={{ color: '#92400e', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                      {isAr ? 'المرجع بالمواصفة:' : 'Spec Citation:'} {q.specCitation}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 700 }}>
                      {isAr ? 'الخيارات المعروضة على الإدارة القانونية والمالية:' : 'Proposed Options for Stakeholder Resolution:'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {options.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155' }}>
                          <span style={{ color: '#946f23', fontWeight: 800 }}>•</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      {isAr ? 'الوحدات المقيدة بهذا القرار:' : 'Gated Modules:'}
                    </span>
                    {modules.map(m => (
                      <span 
                        key={m} 
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          color: '#946f23',
                          background: 'rgba(148, 111, 35, 0.08)',
                          border: '1px solid rgba(148, 111, 35, 0.25)',
                          borderRadius: '4px'
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
