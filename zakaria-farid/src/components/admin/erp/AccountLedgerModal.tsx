'use client';

import React from 'react';
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
  FileText
} from 'lucide-react';
import { ERPAccount, ERPJournalEntry } from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { localizeJournalDescription, localizeJournalMemo } from '@/components/erp/JournalEntryPreview';

interface AccountLedgerModalProps {
  account: ERPAccount | null;
  journalEntries: ERPJournalEntry[];
  onClose: () => void;
  isAr: boolean;
}

// Business Purpose & Educational Real Estate Guide
const ACCOUNT_EXPLANATIONS: Record<string, { roleAr: string; roleEn: string; whenDebitedAr: string; whenCreditedAr: string }> = {
  '101000': {
    roleAr: 'خزينة النقدية التشغيلية: مخصصة للمبالغ النقدية والكاش السائل الموجود فعلياً بمقر الشركة لحركات السداد الفوري والمصروفات اليومية.',
    roleEn: 'Physical cash safe in the corporate headquarters for immediate receipts and petty operations.',
    whenDebitedAr: 'تزيد وتصبح مدينة عند استلام كاش فعلي من عميل أو توريد نقدية من البنك.',
    whenCreditedAr: 'تنقص وتصبح دائنة عند سداد مصروفات نثرية أو إيداع الكاش في الحساب البنكي للشركة.'
  },
  '102000': {
    roleAr: 'الحسابات البنكية التشغيلية: الشريان المالي للشركة؛ يستقبل تحويلات العملاء النقدية وشيكات الدفعات المقدمة، ويتم الصرف منه على المشاريع والرواتب.',
    roleEn: 'Primary corporate bank accounts receiving buyer contract advances and funding operations.',
    whenDebitedAr: 'تزيد وتصبح مدينة عند تحصيل أي دفعة تعاقدية أو شيك أو تحويل بنكي من مشتري.',
    whenCreditedAr: 'تنقص وتصبح دائنة عند تحويل أموال لمقاولي البناء أو الموردين أو مصاريف التشغيل.'
  },
  '102100': {
    roleAr: 'حساب بنكي وديعة الصيانة: حساب مصرفي ائتماني محمي قانونياً مخصص لحفظ ودائع الصيانة (8-10%) المحصلة من المشترين لضمان صيانة المجمع مستقبلاً.',
    roleEn: 'Restricted escrow trust bank account strictly reserved for buyer maintenance fund deposits.',
    whenDebitedAr: 'تزيد عند استلام وديعة الصيانة من المشتري وإيداعها في الحساب المحمي.',
    whenCreditedAr: 'تُصرف فقط على أعمال الصيانة والخدمات الدورية للمشروع العقاري بعد التسليم.'
  },
  '103000': {
    roleAr: 'مدينو عقود العملاء (A/R): يمثل إجمالي الأقساط والمستحقات المتبقية على المشترين بعد تسليم وحداتهم حتى اكتمال السداد بالكامل.',
    roleEn: 'Accounts receivable for remaining billed installment schedules on delivered units.',
    whenDebitedAr: 'تزيد وتصبح مدينة عند تسليم الوحدة للمشتري بالمبلغ المتبقي من ثمن العقد غير المسدد.',
    whenCreditedAr: 'تنقص وتصبح دائنة كلما قام المشتري بسداد قسط من الأقساط المستحقة عليه.'
  },
  '103200': {
    roleAr: 'شيكات مؤجلة الخزينة (PDC): محفظة الشيكات البنكية الآجلة التي وقعها المشترون كضمان لأقساطهم المستقبلية والمحفوظة في خزنة الشركة.',
    roleEn: 'Physical post-dated cheques vault in company custody awaiting bank presentation.',
    whenDebitedAr: 'تزيد عند استلام دفتر الشيكات الآجلة من العميل أثناء توقيع العقد.',
    whenCreditedAr: 'تنقص وتصبح دائنة عند استحقاق موعد الشيك وإرساله للبنك للتحصيل أو استبداله.'
  },
  '103300': {
    roleAr: 'وسيط ضرائب العملاء: حساب معلق يخضع لحوكمة محاسبية مشددة (Q4) لمعالجة أي فروق ضرائبية تعاقدية محتملة.',
    roleEn: 'Gated customer tax clearing receivable under strict governance.',
    whenDebitedAr: 'يُحظر الترحيل المباشر إليه إلا بعد اعتماد سياسة الضرائب المؤسسية.',
    whenCreditedAr: 'يُسوى مع الجهات الضريبية المختصة.'
  },
  '150000': {
    roleAr: 'أعمال تحت التنفيذ - الأراضي: أصل رأسمالي تُجمع فيه تكلفة شراء قطع الأراضي للمشاريع ومصروفات التسجيل العقاري والتراخيص الأولية.',
    roleEn: 'Capitalized WIP asset representing land parcel acquisition and initial zoning licensing.',
    whenDebitedAr: 'تزيد عند سداد ثمن شراء أرض جديدة أو رسوم التسجيل والتراخيص الرسمية.',
    whenCreditedAr: 'تُقفل بالتوزيع على تكلفة الوحدات المبيعة (COGS) عند تسليم المبنى للملاك.'
  },
  '151000': {
    roleAr: 'أعمال تحت التنفيذ - أعمال البناء (Civil): أصل رأسمالي تُسجل فيه كافة تكاليف الهيكل الإنشائي والخرسانات والحديد والمباني للمشاريع.',
    roleEn: 'Direct construction WIP asset for civil works, concrete, structural steel, and masonry.',
    whenDebitedAr: 'تزيد عند اعتماد مستخلصات مقاولي الخرسانات وفواتير توريد الحديد والأسمنت.',
    whenCreditedAr: 'تتحول إلى تكلفة مبيعات محققة (501000) عند تسليم الوحدات المباعة.'
  },
  '152000': {
    roleAr: 'أعمال تحت التنفيذ - الكهروميكانيك (MEP): أصل رأسمالي لأعمال المصاعد وشبكات الكهرباء والإنارة، السباكة، وأنظمة مكافحة الحريق والتكييف.',
    roleEn: 'WIP asset for mechanical, electrical, plumbing, elevators, and fire-suppression infrastructure.',
    whenDebitedAr: 'تزيد مع سداد مستخلصات مقاولي الكهرباء والسباكة والتكييف وتوريد المصاعد.',
    whenCreditedAr: 'تُقفل مع تكلفة المبيعات عند التسليم النهائي للمشروع.'
  },
  '153000': {
    roleAr: 'أعمال تحت التنفيذ - التشطيبات الفاخرة: أصل رأسمالي لأعمال الواجهات المعمارية، الرخام، الديكورات، والأبواب والأرضيات الفاخرة.',
    roleEn: 'WIP asset for bespoke marble, stone facades, interior finishing, and luxury architectural detailing.',
    whenDebitedAr: 'تزيد عند الصرف على واجهات المبنى والرخام وتشطيب المداخل والوحدات.',
    whenCreditedAr: 'تُحول لتكلفة المبيعات عند تسليم الوحدات.'
  },
  '156000': {
    roleAr: 'أعمال تحت التنفيذ - تكاليف التمويل المباشرة: فوائد وتكاليف القروض والتسهيلات البنكية المرتبطة مباشرة بفترة بناء المشروع العقاري.',
    roleEn: 'Borrowing costs capitalized directly during the construction phase of qualifying real estate projects.',
    whenDebitedAr: 'تزيد عند سداد فوائد قروض تمويل المشروع قبل اكتمال البناء.',
    whenCreditedAr: 'تتحول لتكلفة مبيعات مع تسليم المشروع للمشترين.'
  },
  '201000': {
    roleAr: 'موردون ومقاولون (A/P): التزامات الشركة المالية تجاه شركات المقاولات وتوريد مواد البناء واجبة السداد.',
    roleEn: 'Trade accounts payable for structural contractors, architects, and building material suppliers.',
    whenCreditedAr: 'تزيد وتصبح دائنة عند استلام فواتير ومستخلصات المقاولين المعتمدة.',
    whenDebitedAr: 'تنقص وتصبح مدينة عند قيام الشركة بسداد الشيك أو التحويل البنكي للمقاول.'
  },
  '203000': {
    roleAr: 'إيرادات عقود مؤجلة (دفعات مقدمة): المبالغ المحصلة من المشترين قبل التسليم؛ تُمثل التزاماً قانونياً على الشركة حتى تسليم المفتاح رسمياً.',
    roleEn: 'Deferred contract revenue representing pre-handover buyer collections (unearned contract liabilities).',
    whenCreditedAr: 'تزيد عند توقيع عقد بيع جديد واستلام الدفعة المقدمة أو أقساط ما قبل التسليم.',
    whenDebitedAr: 'تُقفل وتنقص عند تسليم الوحدة وتحويلها لإيراد مبيعات محقق (401000) أو في حال الفسخ.'
  },
  '206200': {
    roleAr: 'التزامات استرداد العملاء: التزام مالي واجب الأداء للعميل يُمثل صافي المبالغ المستردة بعد فسخ العقد واقتطاع غرامة الـ 10%.',
    roleEn: 'Customer net refund liability payable post-rescission after deducting forfeiture penalties.',
    whenCreditedAr: 'تثبت عند فسخ العقد كالتزام واجب رده للعميل في الحسابات الدائنة.',
    whenDebitedAr: 'تنقص وتُقفل عند تحويل الشيك أو المبلغ المالي للعميل.'
  },
  '207000': {
    roleAr: 'أمانات وديعة الصيانة: التزام تعاقدي يمثل أمانة أموال الصيانة المحصلة من الملاك لصالح صندوق صيانة المجمع السكني.',
    roleEn: 'Homeowner maintenance fund obligation held in trust for ongoing building services.',
    whenCreditedAr: 'تزيد عند استلام وديعة الصيانة من كل مالك عند الاستلام.',
    whenDebitedAr: 'تُصرف على أعمال صيانة المشروع لصالح الملاك.'
  },
  '301000': {
    roleAr: 'رأس مال الشركاء: حقوق الملكية ورأس المال الأساسي المستثمر في تأسيس وتطوير الشركة العقارية.',
    roleEn: 'Shareholder equity and initial paid-in developer partner capital.',
    whenCreditedAr: 'تزيد عند ضخ استثمارات أو مساهمات رأسمالية جديدة من الشركاء.',
    whenDebitedAr: 'تنقص عند تخفيض رأس المال أو توزيعات الأرباح المعتمدة.'
  },
  '401000': {
    roleAr: 'إيرادات مبيعات الوحدات العقارية: الإيراد المحقق الفعلي المعترف به محاسبياً وقانونياً عند تسليم الوحدة رسمياً للمشتري وفق معيار IFRS 15.',
    roleEn: 'Recognized revenue on completed sales upon physical unit handover protocol execution.',
    whenCreditedAr: 'تزيد وتثبت في قائمة الدخل عند تسليم مفتاح الوحدة للمشتري.',
    whenDebitedAr: 'لا تُخفض إلا في حال حدوث فسخ عقد واسترداد حيازة (Branch 2).'
  },
  '501000': {
    roleAr: 'تكلفة المبيعات - الأراضي: نصيب الوحدة المسلمة من تكلفة شراء الأرض الأساسية.',
    roleEn: 'Cost of goods sold representing pro-rata allocated land cost on delivered units.',
    whenDebitedAr: 'تُثبت كمصروف في قائمة الدخل عند تسليم الوحدة للمشتري.',
    whenCreditedAr: 'تُعكس في حال الفسخ واسترداد الوحدة للمخزون.'
  },
  '502000': {
    roleAr: 'تكلفة المبيعات - البناء الإنشائي: نصيب الوحدة المسلمة من تكاليف الخرسانات والحديد المنفذة.',
    roleEn: 'Cost of goods sold for structural and civil construction on delivered units.',
    whenDebitedAr: 'تُثبت كمصروف مبيعات عند تسليم الوحدة للمشتري.',
    whenCreditedAr: 'تُعكس في حال الفسخ واسترداد الوحدة.'
  }
};

export const AccountLedgerModal: React.FC<AccountLedgerModalProps> = ({
  account,
  journalEntries,
  onClose,
  isAr
}) => {
  if (!account) return null;

  // 1. Gather all journal lines touching this account
  const accountLines: {
    entry_id: string;
    entry_number: string;
    entry_date: string;
    description: string;
    debit_amount: string;
    credit_amount: string;
    memo?: string;
    contract_id?: string;
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
          contract_id: line.contract_id
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

  const explanation = ACCOUNT_EXPLANATIONS[account.account_code] || {
    roleAr: `حساب ${account.account_name_ar} ضمن شجرة الحسابات المالية الموحدة للشركة.`,
    roleEn: `${account.account_name_en} account within the standard chart of accounts.`,
    whenDebitedAr: account.normal_balance === 'DEBIT' ? 'يزيد بالمديونية عند تسجيل العمليات الخاصة به.' : 'ينقص بالمديونية عند تسوية الرصيد.',
    whenCreditedAr: account.normal_balance === 'CREDIT' ? 'يزيد بالدائنية عند تسجيل التزامات أو إيرادات.' : 'ينقص بالدائنية عند خروج النقدية أو استهلاك الأصل.'
  };

  const typeColorMap: Record<string, { bg: string; text: string; border: string }> = {
    ASSET: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    LIABILITY: { bg: '#fffbeb', text: '#b45309', border: 'rgba(217, 119, 6, 0.25)' },
    CONTRA_LIABILITY: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    EQUITY: { bg: '#f8fafc', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' },
    REVENUE: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    EXPENSE: { bg: '#fffbeb', text: '#946f23', border: 'rgba(184, 144, 62, 0.25)' }
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
                  {account.account_type}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#475569',
                  background: '#f1f5f9',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px'
                }}>
                  {account.normal_balance}
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

          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              borderRadius: '10px',
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={18} />
          </button>
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
                {isAr ? 'الرصيد الدفتري الحالي (Net Balance)' : 'Current Ledger Balance'}
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
                {isAr ? `طبيعة الحساب: ${account.normal_balance}` : `Normal Balance: ${account.normal_balance}`}
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
                {isAr ? 'إجمالي الحركات المدينة (Σ Debits)' : 'Total Cumulative Debits'}
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
                {isAr ? 'إجمالي الحركات الدائنة (Σ Credits)' : 'Total Cumulative Credits'}
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
                {isAr ? 'الوظيفة والدور المحاسبي في التطوير العقاري:' : 'Real Estate Accounting Function:'}
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
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{isAr ? 'متى يكون مديناً؟ ' : 'When Debited: '}</span>
                <span>{isAr ? explanation.whenDebitedAr : 'Increases / Debited on inflows.'}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                <span style={{ color: '#15803d', fontWeight: 700 }}>{isAr ? 'متى يكون دائناً؟ ' : 'When Credited: '}</span>
                <span>{isAr ? explanation.whenCreditedAr : 'Decreases / Credited on outflows.'}</span>
              </div>
            </div>
          </div>

          {/* Account Statement (Transactions) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--zf-gold, #d4af37)" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'كشف حساب الحركات والقيود المرحلة (Account Statement)' : 'Account Statement Transactions'}
                </h3>
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
                {isAr ? `${accountLines.length} حركة مسجلة` : `${accountLines.length} Entries`}
              </span>
            </div>

            {accountLines.length === 0 ? (
              <div style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                color: '#64748b',
                fontSize: '0.82rem'
              }}>
                {isAr 
                  ? 'لم يتم ترحيل أي قيود يومية على هذا الحساب حتى الآن في الفترة الحالية.'
                  : 'No journal transactions have been posted to this account yet in the active period.'}
              </div>
            ) : (
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
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: isAr ? 'right' : 'left', color: '#64748b' }}>
                        {isAr ? 'بيان وشرح الحركة' : 'Description & Memo'}
                      </th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: isAr ? 'left' : 'right', color: '#0f172a' }}>
                        {isAr ? 'مدين (Debit)' : 'Debit'}
                      </th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: isAr ? 'left' : 'right', color: '#15803d' }}>
                        {isAr ? 'دائن (Credit)' : 'Credit'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountLines.map((line, idx) => {
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
                          <td style={{ padding: '0.75rem 0.85rem' }}>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{line.entry_date}</div>
                            <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#946f23', fontSize: '0.76rem', marginTop: '2px' }}>
                              {line.entry_number}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {localizeJournalDescription(line.description, isAr)}
                            </div>
                            {line.memo && (
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                ↳ {localizeJournalMemo(line.memo, isAr)}
                              </div>
                            )}
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
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
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
    </div>
  );
};
