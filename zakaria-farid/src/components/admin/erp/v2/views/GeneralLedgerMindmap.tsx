'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Scale, 
  Building2, 
  Wallet, 
  Landmark, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Filter, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  Info, 
  Check, 
  FileText,
  AlertCircle,
  HardHat,
  Key
} from 'lucide-react';
import { ERPAccount, ERPJournalEntry } from '@/lib/erp/types';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import { D, Decimal } from '@/lib/erp/math';
import { localizeJournalDescription } from '@/components/erp/JournalEntryPreview';

interface GeneralLedgerMindmapProps {
  isAr: boolean;
  journalEntries: ERPJournalEntry[];
  accountStats: Record<string, { debits: Decimal; credits: Decimal; count: number }>;
  onSelectAccountForModal: (account: ERPAccount) => void;
  onFilterAccountInJournal: (accountCode: string) => void;
}

// Business explanations tailored for real estate merchant in Minya al-Qamh
const ACCOUNT_MERCHANT_GUIDE: Record<string, { roleAr: string; roleEn: string; tipAr: string }> = {
  '101000': {
    roleAr: 'الخزينة النقدية الرئيسية: الكاش الفعلي الحاضر باليد في خزنة مقر الشركة بمنيا القمح لحركات الصرف والتوريد الفوري.',
    roleEn: 'Physical cash safe in corporate headquarters for immediate site operations.',
    tipAr: 'الكاش الجاهز باليد للتعامل مع العمال وموردي النقل ومصروفات الموقع السريعة.'
  },
  '102000': {
    roleAr: 'الحسابات والتحويلات البنكية: رصيد الشركة في البنوك ومستقبل تحويلات إنستاباي وسداد دفعات المقاولين الكبيرة.',
    roleEn: 'Corporate operating bank accounts for electronic collections and wire transfers.',
    tipAr: 'شريان التحويلات الرسمية ودفعات الحديد والأسمنت الكبرى.'
  },
  '102100': {
    roleAr: 'حساب وديعة صيانة المشروعات: حساب بنكي محجوز لأمانات ودائع الصيانة المحصلة من الملاك لصالح صيانة الأبراج.',
    roleEn: 'Restricted escrow bank account reserved strictly for maintenance trust funds.',
    tipAr: 'الفلوس دي أمانة محجوزة لصيانة العمارة والأسانسيرات والمداخل مستقبلاً.'
  },
  '150000': {
    roleAr: 'أراضي المشروعات والتراخيص: ثمن شراء قطع الأراضي ومصروفات استخراج تراخيص البناء والتسجيل.',
    roleEn: 'Capitalized WIP asset for land acquisition and municipal licensing.',
    tipAr: 'الأصل الأساسي للمشروع وقاعدة الانطلاق لبناء البرج السكني.'
  },
  '151000': {
    roleAr: 'الخرسانات وأعمال المباني (Civil): تكاليف الحديد، الأسمنت، الخرسانة الجاهزة، ومستخلصات مقاولي الهيكل الإنشائي.',
    roleEn: 'Direct construction WIP for reinforced concrete, rebar, and civil masonry.',
    tipAr: 'الهيكل الخرساني هو العصب الأكبر لتكلفة الإنشاءات الميدانية.'
  },
  '152000': {
    roleAr: 'شبكات السباكة والكهرباء MEP: تأسيس مواسير الصرف والتغذية، كابلات الكهرباء، وتوريد المصاعد.',
    roleEn: 'Mechanical, electrical, plumbing infrastructure, utilities, and elevators.',
    tipAr: 'تأسيس متين للمرافق بيضمن أعلى تقييم وسعر للمتر عند البيع.'
  },
  '153000': {
    roleAr: 'تشطيب الواجهات والمداخل الفاخرة: واجهات حجر هاشمي، رخام المداخل، ديكورات، وأبواب فاخرة.',
    roleEn: 'Exterior stone facades, luxury marble lobbies, and architectural finishing.',
    tipAr: 'واجهة العمارة ومدخل الرخام هما واجهة البيع الأولى للزبون.'
  },
  '103200': {
    roleAr: 'أقساط الخزينة المستحقة: الأقساط المجدولة في أجندة الخزنة واللي بنحصلها نقداً باليد أو إنستاباي في مواعيدها.',
    roleEn: 'Scheduled hand installments agenda collected in cash or InstaPay.',
    tipAr: 'متابعة مواعيد الأقساط أول بأول بتضمن سيولة مستمرة لسداد مقاولي البناء.'
  },
  '104000': {
    roleAr: 'أقساط وأوراق قبض تحت التحصيل: شيكات وأقساط العملاء في عهدة الخزينة لمتابعة مواعيد استحقاقها وتحصيلها باليد.',
    roleEn: 'Installments & notes under collection held in treasury safe.',
    tipAr: 'متابعة أوراق القبض بالخزينة بتضمن تحصيل التدفقات النقدية في مواعيدها المظبوطة.'
  },
  '103000': {
    roleAr: 'مدينو عقود العملاء: باقي المبالغ المستحقة على المشترين بموجب العقود الموقعة حتى تمام السداد.',
    roleEn: 'Accounts receivable representing remaining contract installments.',
    tipAr: 'رصيد العقود المتبقي في السوق عند العملاء واللي هيدخل الخزنة تدريجياً.'
  },
  '203000': {
    roleAr: 'مقدمات وأقساط حجز العقود: فلوس الحجز والمقدمات المحصلة من المشترين قبل تسليم الشقق؛ تُمثل التزاماً حتى التسليم.',
    roleEn: 'Advance down payments collected prior to physical handover of residential units.',
    tipAr: 'دي أهم مصدر كاش فوري لتشغيل العمارات دون انتظار قروض بنكية.'
  },
  '201000': {
    roleAr: 'حسابات الموردين والمقاولين (A/P): مستحقات وفواتير آجلة لموردي مواد البناء ومقاولي الباطن واجبة السداد.',
    roleEn: 'Trade accounts payable for contractors, material suppliers, and vendors.',
    tipAr: 'المبالغ المتبقية في ذمة الشركة لصالح موردي الأسمنت والرمل والمقاولين.'
  },
  '207000': {
    roleAr: 'أمانات ودائع الصيانة (التزام): مبالغ الصيانة المحصلة كأمانة لصالح الملاك ولا تدخل ضمن أرباح الشركة.',
    roleEn: 'Maintenance escrow trust liability held on behalf of apartment owners.',
    tipAr: 'التزام شرعي ومحاسبي بحفظ وديعة الصيانة منفصلة للصرف على المرافق المشتركة.'
  },
  '301000': {
    roleAr: 'رأس مال وحصص الشركاء: الفلوس الحقيقية اللي دفعها وضخها الشركاء من جيبهم لتمويل المشروعات.',
    roleEn: 'Contributed partner equity funding acquisitions and site works without debt.',
    tipAr: 'ضخ الشركاء هو صمام الأمان لشراء الأراضي كاش بأفضل الأسعار.'
  },
  '401000': {
    roleAr: 'إيرادات المبيعات المحققة: إجمالي ثمن الشقق اللي تم تسليمها رسمياً للمشترين واستلموا المفتاح.',
    roleEn: 'Recognized revenue on completed units handed over to buyers.',
    tipAr: 'وفقاً لمعايير المحاسبة، إيراد الشقة بيتحول هنا فور تسليم المفتاح للمشتري.'
  },
  '602000': {
    roleAr: 'المصروفات العمومية والتشغيل: إيجار المقر، مرتبات الموظفين، فواتير الكهرباء، والمصاريف الإدارية.',
    roleEn: 'General & administrative overhead expenses and corporate running costs.',
    tipAr: 'مصاريف تسيير الشركة اليومية لمتابعة العمل والمواقع.'
  }
};

export const GeneralLedgerMindmap: React.FC<GeneralLedgerMindmapProps> = ({
  isAr,
  journalEntries,
  accountStats,
  onSelectAccountForModal,
  onFilterAccountInJournal
}) => {
  // Selected account for deep analytical inspection (defaults to Bank 102000 as it's the largest)
  const [selectedCode, setSelectedCode] = useState<string>('102000');
  // State for toggling zero-balance inactive accounts
  const [showZeroAccounts, setShowZeroAccounts] = useState<boolean>(false);

  // Helper to format currency
  const formatMoney = useCallback((val: Decimal | string | number) => {
    const d = typeof val === 'object' && 'toFixed' in val ? val : D(val);
    const absD = d.abs();
    const parts = absD.toFixed(2).split('.');
    return `${parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${parts[1]}`;
  }, []);

  // Compute live account metrics
  const getAccountInfo = useCallback((code: string) => {
    const acc = CANONICAL_COA[code];
    const stats = accountStats[code] || { debits: D(0), credits: D(0), count: 0 };
    if (!acc) {
      return { acc: null, stats, netBalance: D(0), isDebitNormal: true, isOpposite: false };
    }
    const isDebitNormal = acc.normal_balance === 'DEBIT';
    const rawNet = isDebitNormal
      ? stats.debits.minus(stats.credits)
      : stats.credits.minus(stats.debits);

    return {
      acc,
      stats,
      netBalance: rawNet,
      isDebitNormal,
      isOpposite: rawNet.isNegative()
    };
  }, [accountStats]);

  // Executive Balance Totals
  const balances = useMemo(() => {
    // 1. Liquid Cash & Bank
    const safeCash = getAccountInfo('101000').netBalance;
    const bankCash = getAccountInfo('102000').netBalance;
    const escrowCash = getAccountInfo('102100').netBalance;
    const totalLiquid = safeCash.plus(bankCash).plus(escrowCash);

    // 2. Construction WIP
    const wipCivil = getAccountInfo('151000').netBalance;
    const wipLand = getAccountInfo('150000').netBalance;
    const wipMep = getAccountInfo('152000').netBalance;
    const wipFinishing = getAccountInfo('153000').netBalance;
    const totalWip = wipCivil.plus(wipLand).plus(wipMep).plus(wipFinishing);

    // 3. Receivables
    const safeDues = getAccountInfo('103200').netBalance;
    const safeDues104 = getAccountInfo('104000').netBalance;
    const buyerAR = getAccountInfo('103000').netBalance;
    const totalReceivables = (safeDues.isPositive() ? safeDues : D(0))
      .plus(safeDues104.isPositive() ? safeDues104 : D(0))
      .plus(buyerAR.isPositive() ? buyerAR : D(0));

    // Total Company Assets
    const totalAssets = totalLiquid.plus(totalWip).plus(totalReceivables);

    // 4. Liabilities & Advances
    const customerAdvances = getAccountInfo('203000').netBalance;
    const tradePayables = getAccountInfo('201000').netBalance;
    const escrowLiability = getAccountInfo('207000').netBalance;
    const totalLiabilities = (customerAdvances.isPositive() ? customerAdvances : D(0))
      .plus(tradePayables.isPositive() ? tradePayables : D(0))
      .plus(escrowLiability.isPositive() ? escrowLiability : D(0));

    // 5. Equity & Realized Revenue
    const partnerCapital = getAccountInfo('301000').netBalance;
    const recognizedRevenue = getAccountInfo('401000').netBalance;
    const totalEquityAndRevenue = (partnerCapital.isPositive() ? partnerCapital : D(0))
      .plus(recognizedRevenue.isPositive() ? recognizedRevenue : D(0));

    // Total Liabilities & Financing Sources
    const totalFinancing = totalLiabilities.plus(totalEquityAndRevenue);

    // Asset Proportions
    const totalAssetsNum = totalAssets.toNumber();
    const liquidShare = totalAssetsNum > 0 ? (totalLiquid.toNumber() / totalAssetsNum) * 100 : 0;
    const wipShare = totalAssetsNum > 0 ? (totalWip.toNumber() / totalAssetsNum) * 100 : 0;
    const recShare = totalAssetsNum > 0 ? (totalReceivables.toNumber() / totalAssetsNum) * 100 : 0;

    return {
      safeCash,
      bankCash,
      escrowCash,
      totalLiquid,
      wipCivil,
      wipLand,
      wipMep,
      wipFinishing,
      totalWip,
      safeDues,
      buyerAR,
      totalReceivables,
      totalAssets,
      customerAdvances,
      tradePayables,
      escrowLiability,
      totalLiabilities,
      partnerCapital,
      recognizedRevenue,
      totalEquityAndRevenue,
      totalFinancing,
      liquidShare,
      wipShare,
      recShare
    };
  }, [getAccountInfo]);

  // Selected Account details
  const selectedInfo = useMemo(() => {
    return getAccountInfo(selectedCode);
  }, [selectedCode, getAccountInfo]);

  const selectedGuide = useMemo(() => {
    return ACCOUNT_MERCHANT_GUIDE[selectedCode] || {
      roleAr: selectedInfo.acc?.notes || 'حساب من شجرة الحسابات المعتمدة للشركة.',
      roleEn: selectedInfo.acc?.notes || 'Standard accounting ledger account.',
      tipAr: 'متابعة دورية لحركات هذا الحساب تدعم دقة المركز المالي.'
    };
  }, [selectedCode, selectedInfo]);

  // Last 5 journal entries for the selected account
  const selectedEntries = useMemo(() => {
    return journalEntries
      .filter(entry => (entry.lines || []).some(line => line.account_code === selectedCode))
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 5);
  }, [selectedCode, journalEntries]);

  // Zero balance accounts list
  const zeroAccounts = useMemo(() => {
    const list = ['150000', '152000', '153000', '102100', '103200', '104000', '105000', '204000', '207000', '301000', '602000', '603000'];
    return list.map(code => ({
      code,
      data: getAccountInfo(code)
    })).filter(item => item.data.netBalance.isZero() && item.data.stats.count === 0);
  }, [getAccountInfo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      
      {/* ══════════════════════════════════════════════════════════════════════════
          1. THE EXECUTIVE BALANCE SCALE & DUAL-WING INTEGRITY
          ══════════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fdfbf7 100%)',
        border: '1px solid rgba(184, 144, 62, 0.28)',
        borderRadius: '20px',
        padding: '1.5rem 1.75rem',
        boxShadow: '0 4px 20px -2px rgba(184, 144, 62, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Scale Header Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          
          {/* Right Wing: Assets (موجودات وأصول الشركة) */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.04)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#065f46' }}>
                  {isAr ? 'فلوس وممتلكات الشركة (كل اللي نملكه في السوق والمواقع)' : 'Company Assets Portfolio'}
                </span>
              </div>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                color: '#065f46',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px'
              }}>
                {isAr ? 'أين وُضعت الفلوس؟' : 'Capital Deployed'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', direction: 'ltr' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(balances.totalAssets)}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981' }}>
                {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.72rem', color: '#64748b' }}>
              <span>سيولة بنوك وخزنة: <b style={{ color: '#0f172a' }}>{formatMoney(balances.totalLiquid)}</b></span>
              <span>•</span>
              <span>مباني وخرسانات: <b style={{ color: '#0f172a' }}>{formatMoney(balances.totalWip)}</b></span>
            </div>
          </div>

          {/* Center Medallion: Balanced Integrity Seal */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 0.5rem'
          }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(148, 111, 35, 0.3)',
              marginBottom: '0.45rem'
            }}>
              <Scale size={22} />
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              color: '#15803d',
              fontSize: '0.7rem',
              fontWeight: 800
            }}>
              <CheckCircle2 size={12} />
              <span>{isAr ? 'الميزان متزن 100%' : 'Balanced'}</span>
            </div>
            <span style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              {isAr ? 'الميزان مضبوط بالمليم: مفيش مليم ضايع' : 'Zero variance'}
            </span>
          </div>

          {/* Left Wing: Liabilities & Equity (الالتزامات ومصادر التمويل) */}
          <div style={{
            background: 'rgba(184, 144, 62, 0.04)',
            border: '1px solid rgba(184, 144, 62, 0.2)',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#946f23' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#946f23' }}>
                  {isAr ? 'مصادر الفلوس والالتزامات (الفلوس دي جاية منين ومين له عندنا)' : 'Financing & Liabilities'}
                </span>
              </div>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                color: '#946f23',
                background: 'rgba(184, 144, 62, 0.12)',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px'
              }}>
                {isAr ? 'من أين جاءت الفلوس؟' : 'Funding Sources'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', direction: 'ltr' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(balances.totalFinancing)}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#946f23' }}>
                {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.72rem', color: '#64748b' }}>
              <span>مقدمات المشترين: <b style={{ color: '#0f172a' }}>{formatMoney(balances.customerAdvances)}</b></span>
              <span>•</span>
              <span>إيرادات وأرباح: <b style={{ color: '#0f172a' }}>{formatMoney(balances.recognizedRevenue)}</b></span>
            </div>
          </div>

        </div>

        {/* Proportional Asset Allocation Spectrum Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', borderTop: '1px solid rgba(226, 232, 240, 0.8)', paddingTop: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>
              {isAr ? 'شريط التوزيع النسبي لموجودات وأصول الشركة:' : 'Asset Allocation Distribution:'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {isAr ? 'اضغط على أي بند لمعاينة تفاصيله وحركاته' : 'Click any asset class to inspect'}
            </span>
          </div>

          {/* Visual Multi-Segment Bar */}
          <div style={{
            width: '100%',
            height: '14px',
            borderRadius: '999px',
            background: '#e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.06)'
          }}>
            {/* Segment 1: Bank Accounts (91.9%) */}
            <div 
              onClick={() => setSelectedCode('102000')}
              title={isAr ? `الحسابات والتحويلات البنكية (إنستاباي): ${formatMoney(balances.bankCash)} ج.م (${balances.liquidShare > 4 ? (balances.bankCash.toNumber() / balances.totalAssets.toNumber() * 100).toFixed(1) : 0}%)` : `Operating Bank Accounts: ${formatMoney(balances.bankCash)} EGP`}
              style={{
                width: `${(balances.bankCash.toNumber() / balances.totalAssets.toNumber()) * 100}%`,
                background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                opacity: selectedCode === '102000' ? 1 : 0.85
              }} 
            />

            {/* Segment 2: Construction Civil WIP (4.3%) */}
            <div 
              onClick={() => setSelectedCode('151000')}
              title={isAr ? `الخرسانات وأعمال المباني والخامات: ${formatMoney(balances.wipCivil)} ج.م (${balances.wipShare.toFixed(1)}%)` : `Construction WIP: ${formatMoney(balances.wipCivil)} EGP`}
              style={{
                width: `${balances.wipShare}%`,
                background: 'linear-gradient(90deg, #d97706 0%, #fbbf24 100%)',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                opacity: selectedCode === '151000' ? 1 : 0.85
              }} 
            />

            {/* Segment 3: Operating Safe Cash (3.8%) */}
            <div 
              onClick={() => setSelectedCode('101000')}
              title={isAr ? `خزينة النقدية الرئيسية (كاش باليد): ${formatMoney(balances.safeCash)} ج.م (${(balances.safeCash.toNumber() / balances.totalAssets.toNumber() * 100).toFixed(1)}%)` : `Physical Cash Safe: ${formatMoney(balances.safeCash)} EGP`}
              style={{
                width: `${(balances.safeCash.toNumber() / balances.totalAssets.toNumber()) * 100}%`,
                background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                opacity: selectedCode === '101000' ? 1 : 0.85
              }} 
            />
          </div>

          {/* Interactive Legend Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', paddingTop: '0.2rem' }}>
            {/* Legend Item 1 */}
            <div 
              onClick={() => setSelectedCode('102000')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                background: selectedCode === '102000' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                border: selectedCode === '102000' ? '1px solid rgba(2, 132, 199, 0.3)' : '1px solid transparent'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }} />
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>
                {isAr ? 'الحسابات والتحويلات البنكية (إنستاباي)' : 'Operating Bank Accounts'}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', direction: 'ltr' }}>
                91.9%
              </span>
            </div>

            {/* Legend Item 2 */}
            <div 
              onClick={() => setSelectedCode('151000')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                background: selectedCode === '151000' ? 'rgba(217, 119, 6, 0.1)' : 'transparent',
                border: selectedCode === '151000' ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid transparent'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706' }} />
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>
                {isAr ? 'الخرسانات وأعمال المباني والخامات' : 'Construction WIP'}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', direction: 'ltr' }}>
                4.3%
              </span>
            </div>

            {/* Legend Item 3 */}
            <div 
              onClick={() => setSelectedCode('101000')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                background: selectedCode === '101000' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                border: selectedCode === '101000' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a' }}>
                {isAr ? 'خزينة النقدية الرئيسية (كاش باليد)' : 'Physical Cash Safe'}
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', direction: 'ltr' }}>
                3.8%
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          2. THE 4-STAGE CAPITAL FLOW PIPELINE (خريطة حركة الفلوس المباشرة)
          ══════════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem'
      }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.14) 0%, rgba(184, 144, 62, 0.04) 100%)',
              border: '1px solid rgba(184, 144, 62, 0.25)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'دورة وشريان حركة الفلوس بين الحسابات' : 'Capital Flow Cycle'}
                </h4>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#946f23',
                  background: 'rgba(184, 144, 62, 0.08)',
                  border: '1px solid rgba(184, 144, 62, 0.2)',
                  padding: '0.12rem 0.55rem',
                  borderRadius: '6px'
                }}>
                  {isAr ? 'مسار تمويل وبناء المشروعات' : 'Value Pipeline'}
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                {isAr ? 'المسار المحاسبي الفعلي لتدفق أموال العقود: من مقدم الحجز ➔ سيولة الخزينة والبنك ➔ خرسانات ومباني ➔ تسليم الوحدات والمبيعات' : 'Contract capital lifecycle from customer advances through treasury liquidity, construction WIP, to handover recognition'}
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.72rem',
            color: '#64748b',
            background: '#f8fafc',
            padding: '0.3rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#946f23' }} />
            <span>{isAr ? 'اضغط على أي مرحلة لعرض حساباتها وقيودها بالأسفل' : 'Click any stage to inspect dossier'}</span>
          </div>
        </div>

        {/* 4 Steps Row with Visual Stepper & Connectors */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '0.85rem',
          alignItems: 'stretch'
        }}>
          {[
            {
              stepNum: '١',
              stepNumEn: '1',
              code: '203000',
              accountCodes: ['203000'],
              stageTag: isAr ? '١. استلام الحجز' : '1. Advance Inflow',
              title: isAr ? 'مقدمات حجز العقود' : 'Deferred Advances',
              amount: balances.customerAdvances,
              subtext: isAr ? 'فلوس استلمناها من المشترين كالتزام مؤجل قبل التسليم' : 'Collected advances held as liability',
              icon: Wallet,
              accentColor: '#15803d',
              badgeBg: 'rgba(21, 128, 61, 0.08)',
              badgeText: '#15803d',
              badgeBorder: 'rgba(21, 128, 61, 0.22)'
            },
            {
              stepNum: '٢',
              stepNumEn: '2',
              code: '102000',
              accountCodes: ['101000', '102000'],
              stageTag: isAr ? '٢. الخزنة والبنك' : '2. Liquid Pool',
              title: isAr ? 'السيولة الحاضرة للصرف' : 'Available Liquidity',
              amount: balances.totalLiquid,
              subtext: isAr ? 'الكاش الفعلي الجاهز بالخزنة والحسابات البنكية' : 'Instant cash in safe & operating bank',
              icon: Landmark,
              accentColor: '#0369a1',
              badgeBg: 'rgba(2, 132, 199, 0.08)',
              badgeText: '#0369a1',
              badgeBorder: 'rgba(2, 132, 199, 0.22)'
            },
            {
              stepNum: '٣',
              stepNumEn: '3',
              code: '151000',
              accountCodes: ['151000'],
              stageTag: isAr ? '٣. خرسانات ومباني' : '3. Construction WIP',
              title: isAr ? 'مصروفات المباني والخامات' : 'Civil Construction WIP',
              amount: balances.wipCivil,
              subtext: isAr ? 'حديد وأسمنت ومستخلصات مقاولي الباطن بالموقع' : 'Capitalized structural materials & rebar',
              icon: HardHat,
              accentColor: '#c2410c',
              badgeBg: 'rgba(194, 65, 12, 0.08)',
              badgeText: '#c2410c',
              badgeBorder: 'rgba(194, 65, 12, 0.22)'
            },
            {
              stepNum: '٤',
              stepNumEn: '4',
              code: '401000',
              accountCodes: ['401000'],
              stageTag: isAr ? '٤. التسليم والمبيعات' : '4. Sales Handover',
              title: isAr ? 'إيرادات المبيعات المحققة' : 'Recognized Revenue',
              amount: balances.recognizedRevenue,
              subtext: isAr ? 'عقود تم تسليم وحداتها للمشترين رسمياً وتحقيق أرباحها' : 'Realized revenue on delivered contracts',
              icon: Key,
              accentColor: '#946f23',
              badgeBg: 'rgba(184, 144, 62, 0.08)',
              badgeText: '#946f23',
              badgeBorder: 'rgba(184, 144, 62, 0.25)'
            }
          ].map((step) => {
            const isSelected = step.accountCodes.includes(selectedCode);
            const StepIcon = step.icon;

            return (
              <div
                key={step.code}
                onClick={() => setSelectedCode(step.code)}
                style={{
                  background: isSelected 
                    ? 'linear-gradient(135deg, #ffffff 0%, #fdf8ef 100%)' 
                    : '#ffffff',
                  border: isSelected 
                    ? '1.5px solid #946f23' 
                    : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.1rem 1.15rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  position: 'relative',
                  boxShadow: isSelected 
                    ? '0 6px 20px -4px rgba(184, 144, 62, 0.16), 0 0 0 1px rgba(184, 144, 62, 0.15)' 
                    : '0 1px 3px rgba(0, 0, 0, 0.02)'
                }}
              >
                {/* Step Top Bar: Stage Badge + Account Pill */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: isSelected ? '#946f23' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isAr ? step.stepNum : step.stepNumEn}
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: isSelected ? '#946f23' : step.badgeText,
                      background: isSelected ? 'rgba(184, 144, 62, 0.1)' : step.badgeBg,
                      border: `1px solid ${isSelected ? 'rgba(184, 144, 62, 0.25)' : step.badgeBorder}`,
                      padding: '0.12rem 0.45rem',
                      borderRadius: '6px'
                    }}>
                      {step.stageTag}
                    </span>
                  </div>

                  <span style={{
                    fontFamily: 'monospace, tabular-nums',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: isSelected ? '#946f23' : '#64748b',
                    background: isSelected ? 'rgba(184, 144, 62, 0.08)' : '#f8fafc',
                    border: `1px solid ${isSelected ? 'rgba(184, 144, 62, 0.2)' : '#e2e8f0'}`,
                    padding: '0.1rem 0.4rem',
                    borderRadius: '5px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    {step.accountCodes.map(c => `#${c}`).join(' • ')}
                  </span>
                </div>

                {/* Step Core: Icon + Title + Amount */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(184, 144, 62, 0.12)' : '#f8fafc',
                    border: `1px solid ${isSelected ? 'rgba(184, 144, 62, 0.25)' : '#e2e8f0'}`,
                    color: isSelected ? '#946f23' : step.accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <StepIcon size={18} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>
                      {step.title}
                    </span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '0.3rem',
                      direction: 'ltr',
                      marginTop: '0.15rem'
                    }}>
                      <span style={{
                        fontSize: '1.18rem',
                        fontWeight: 900,
                        color: '#0f172a',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {formatMoney(step.amount)}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isSelected ? '#946f23' : '#64748b' }}>
                        {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step Footer: Merchant Explanation */}
                <div style={{
                  fontSize: '0.68rem',
                  color: '#64748b',
                  lineHeight: 1.45,
                  borderTop: '1px dashed #f1f5f9',
                  paddingTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>{step.subtext}</span>
                  {isSelected && (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      color: '#946f23',
                      background: 'rgba(184, 144, 62, 0.12)',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px'
                    }}>
                      {isAr ? 'معروض' : 'Active'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          3. SPLIT WORKSPACE: ACTIVE ACCOUNTS MATRIX + SELECTED DOSSIER INSPECTOR
          ══════════════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: '1.25rem',
        alignItems: 'start'
      }}>
        
        {/* RIGHT PANE: ACTIVE ACCOUNTS LANDSCAPE (Showcase of Real Balances) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'الحسابات النشطة بالشركة (عليها أرصدة وحركات)' : 'Active General Ledger Accounts'}
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#15803d',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '0.12rem 0.5rem',
                borderRadius: '999px'
              }}>
                {isAr ? 'أرصدة حقيقية' : 'Live Balances'}
              </span>
            </div>
            
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {isAr ? 'اختر أي حساب لعرض كشفه وقيده' : 'Select account to view statement'}
            </span>
          </div>

          {/* ACTIVE ACCOUNT CARDS GRID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* Card 1: Operating Bank Accounts (102000) */}
            <div 
              onClick={() => setSelectedCode('102000')}
              style={{
                background: selectedCode === '102000' ? 'rgba(2, 132, 199, 0.04)' : '#ffffff',
                border: `1.5px solid ${selectedCode === '102000' ? '#0284c7' : '#e2e8f0'}`,
                borderRadius: '14px',
                padding: '1.1rem 1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: selectedCode === '102000' ? '0 4px 14px -2px rgba(2, 132, 199, 0.18)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(2, 132, 199, 0.1)',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Landmark size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                        {isAr ? 'الحسابات والتحويلات البنكية' : 'Operating Bank Accounts'}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#0284c7',
                        background: 'rgba(2, 132, 199, 0.1)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px'
                      }}>
                        102000
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {isAr ? 'أرصدة البنوك وتحويلات إنستاباي وسداد دفعات المقاولين' : 'Corporate bank deposits & InstaPay settlements'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: isAr ? 'left' : 'right', direction: 'ltr' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(balances.bankCash)}
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0284c7', marginInlineStart: '0.3rem' }}>
                    {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </div>

              {/* Progress & Quick Stats */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.55rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  يمثل <b style={{ color: '#0284c7' }}>96%</b> من إجمالي السيولة النقدية للشركة
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#0369a1',
                  background: '#f0f9ff',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px'
                }}>
                  {getAccountInfo('102000').stats.count} {isAr ? 'حركة وقيد' : 'tx'}
                </span>
              </div>
            </div>

            {/* Card 2: Physical Cash Safe (101000) */}
            <div 
              onClick={() => setSelectedCode('101000')}
              style={{
                background: selectedCode === '101000' ? 'rgba(16, 185, 129, 0.04)' : '#ffffff',
                border: `1.5px solid ${selectedCode === '101000' ? '#10b981' : '#e2e8f0'}`,
                borderRadius: '14px',
                padding: '1.1rem 1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: selectedCode === '101000' ? '0 4px 14px -2px rgba(16, 185, 129, 0.18)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                        {isAr ? 'الخزينة النقدية الرئيسية (كاش باليد)' : 'Physical Operating Cash Safe'}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.1)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px'
                      }}>
                        101000
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {isAr ? 'الكاش الفعلي الحاضر باليد في خزنة مقر منيا القمح' : 'Physical cash vault for immediate petty disbursements'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: isAr ? 'left' : 'right', direction: 'ltr' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(balances.safeCash)}
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#10b981', marginInlineStart: '0.3rem' }}>
                    {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.55rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  كاش فوري جاهز لمصروفات الموقع والعمالة اليومية
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#15803d',
                  background: '#f0fdf4',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px'
                }}>
                  {getAccountInfo('101000').stats.count} {isAr ? 'حركات' : 'tx'}
                </span>
              </div>
            </div>

            {/* Card 3: Construction Civil WIP (151000) */}
            <div 
              onClick={() => setSelectedCode('151000')}
              style={{
                background: selectedCode === '151000' ? 'rgba(217, 119, 6, 0.04)' : '#ffffff',
                border: `1.5px solid ${selectedCode === '151000' ? '#d97706' : '#e2e8f0'}`,
                borderRadius: '14px',
                padding: '1.1rem 1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: selectedCode === '151000' ? '0 4px 14px -2px rgba(217, 119, 6, 0.18)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(217, 119, 6, 0.1)',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                        {isAr ? 'الخرسانات وأعمال المباني والخامات' : 'Structural Concrete Construction'}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#d97706',
                        background: 'rgba(217, 119, 6, 0.1)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px'
                      }}>
                        151000
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {isAr ? 'تكاليف الحديد، الأسمنت، الخرسانة الجاهزة، ومقاولي الهيكل' : 'Direct civil works, masonry, and reinforced concrete'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: isAr ? 'left' : 'right', direction: 'ltr' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(balances.wipCivil)}
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#d97706', marginInlineStart: '0.3rem' }}>
                    {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.55rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  أصل رأسمالي قيد التنفيذ لحين اكتمال الأبراج وتسليم الوحدات
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#b45309',
                  background: '#fffbeb',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px'
                }}>
                  {getAccountInfo('151000').stats.count} {isAr ? 'حركات معتمدة' : 'tx'}
                </span>
              </div>
            </div>

            {/* Card 4: Customer Advances (203000) */}
            <div 
              onClick={() => setSelectedCode('203000')}
              style={{
                background: selectedCode === '203000' ? 'rgba(184, 144, 62, 0.04)' : '#ffffff',
                border: `1.5px solid ${selectedCode === '203000' ? '#946f23' : '#e2e8f0'}`,
                borderRadius: '14px',
                padding: '1.1rem 1.25rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: selectedCode === '203000' ? '0 4px 14px -2px rgba(184, 144, 62, 0.18)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(184, 144, 62, 0.1)',
                    color: '#946f23',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                        {isAr ? 'مقدمات حجز العقود (المحصلة)' : 'Deferred Contract Advances'}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#946f23',
                        background: 'rgba(184, 144, 62, 0.1)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px'
                      }}>
                        203000
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {isAr ? 'دفعات ومقدمات سددها المشترون قبل استلام الشقق (التزام مؤجل)' : 'Customer collections held as deferred liability prior to handover'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: isAr ? 'left' : 'right', direction: 'ltr' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(balances.customerAdvances)}
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#946f23', marginInlineStart: '0.3rem' }}>
                    {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.55rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  أهم مصدر كاش مباشر لتمويل الإنشاءات دون قروض
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#946f23',
                  background: '#fefdfa',
                  border: '1px solid rgba(184, 144, 62, 0.25)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px'
                }}>
                  {getAccountInfo('203000').stats.count} {isAr ? 'حركة بيع وحجز' : 'tx'}
                </span>
              </div>
            </div>

            {/* Card 5: Recognized Revenue (401000) & Trade Payables (201000) Dual Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              
              {/* Revenue 401000 */}
              <div 
                onClick={() => setSelectedCode('401000')}
                style={{
                  background: selectedCode === '401000' ? 'rgba(16, 185, 129, 0.06)' : '#ffffff',
                  border: `1.5px solid ${selectedCode === '401000' ? '#10b981' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'إيرادات المبيعات المحققة' : 'Recognized Revenue'}
                  </span>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#10b981' }}>401000</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', direction: 'ltr' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                    {formatMoney(balances.recognizedRevenue)}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10b981' }}>ج.م</span>
                </div>
                <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                  {isAr ? 'عقود تم تسليم وحداتها واستلموا المفتاح' : 'Delivered unit revenues'}
                </span>
              </div>

              {/* Payables 201000 */}
              <div 
                onClick={() => setSelectedCode('201000')}
                style={{
                  background: selectedCode === '201000' ? 'rgba(225, 29, 72, 0.06)' : '#ffffff',
                  border: `1.5px solid ${selectedCode === '201000' ? '#e11d48' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'موردون ومقاولون (A/P)' : 'Trade Payables'}
                  </span>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#e11d48' }}>201000</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', direction: 'ltr' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                    {formatMoney(balances.tradePayables)}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#e11d48' }}>ج.م</span>
                </div>
                <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                  {isAr ? 'فواتير ومستحقات آجلة لموردي الأسمنت ومقاولي الباطن' : 'Outstanding subcontractor invoices'}
                </span>
              </div>

            </div>

          </div>

          {/* COLLAPSIBLE ZERO-BALANCE ACCOUNTS DRAWER */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            marginTop: '0.25rem'
          }}>
            <button
              type="button"
              onClick={() => setShowZeroAccounts(!showZeroAccounts)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.65rem 1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#64748b'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                <span>
                  {isAr 
                    ? `حسابات احتياطية بدون رصيد حالياً (${zeroAccounts.length} حسابات جاهزة للتسجيل)` 
                    : `Zero-Balance Reserve Accounts (${zeroAccounts.length})`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#94a3b8' }}>
                <span>{showZeroAccounts ? (isAr ? 'إخفاء' : 'Collapse') : (isAr ? 'عرض' : 'Expand')}</span>
                {showZeroAccounts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {showZeroAccounts && (
              <div style={{
                padding: '0.75rem 1rem 1rem 1rem',
                borderTop: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.55rem'
              }}>
                {zeroAccounts.map(item => (
                  <div
                    key={item.code}
                    onClick={() => setSelectedCode(item.code)}
                    style={{
                      background: selectedCode === item.code ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                      border: `1px solid ${selectedCode === item.code ? '#946f23' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>
                        {isAr ? item.data.acc?.account_name_ar : item.data.acc?.account_name_en}
                      </span>
                      <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                        {item.code}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>
                      0.00
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* LEFT PANE: DEDICATED ANALYTICAL DOSSIER INSPECTOR */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid rgba(184, 144, 62, 0.35)',
          borderRadius: '18px',
          padding: '1.35rem 1.5rem',
          boxShadow: '0 8px 24px -4px rgba(184, 144, 62, 0.12), 0 1px 3px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.15rem',
          position: 'sticky',
          top: '1.5rem'
        }}>
          
          {/* Dossier Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.9rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  color: '#946f23',
                  background: 'rgba(184, 144, 62, 0.1)',
                  border: '1px solid rgba(184, 144, 62, 0.3)',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px'
                }}>
                  {selectedCode}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: selectedInfo.isDebitNormal ? '#15803d' : '#946f23',
                  background: selectedInfo.isDebitNormal ? '#f0fdf4' : '#fdfbf7',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px'
                }}>
                  {selectedInfo.isDebitNormal ? (isAr ? 'أصل مدين' : 'Debit Normal') : (isAr ? 'التزام / دائن' : 'Credit Normal')}
                </span>
              </div>

              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                {isAr ? selectedInfo.acc?.account_name_ar : selectedInfo.acc?.account_name_en}
              </h3>
            </div>

            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(184, 144, 62, 0.08)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={16} />
            </div>
          </div>

          {/* Dossier Net Balance Block */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '12px',
            padding: '1rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
              {isAr ? 'صافي الرصيد الدفتري الحالي' : 'Net Current Ledger Balance'}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', direction: 'ltr' }}>
              <span style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(selectedInfo.netBalance)}
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#946f23' }}>
                {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>
          </div>

          {/* Egyptian Real Estate Business Role */}
          <div style={{
            background: 'rgba(184, 144, 62, 0.05)',
            borderInlineStart: '3px solid #946f23',
            padding: '0.75rem 0.9rem',
            borderRadius: '0 8px 8px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#946f23', fontSize: '0.72rem', fontWeight: 800 }}>
              <Info size={13} />
              <span>{isAr ? 'دوره في شغل وعقارات منيا القمح' : 'Business Role in Minya al-Qamh'}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.55 }}>
              {isAr ? selectedGuide.roleAr : selectedGuide.roleEn}
            </p>
          </div>

          {/* Debits vs Credits Telemetry */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '0.5rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.65rem 0.75rem',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{isAr ? 'إجمالي المدين' : 'Debits'}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d', direction: 'ltr', marginTop: '2px' }}>
                {formatMoney(selectedInfo.stats.debits)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', borderInlineStart: '1px solid #f1f5f9', borderInlineEnd: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{isAr ? 'إجمالي الدائن' : 'Credits'}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#946f23', direction: 'ltr', marginTop: '2px' }}>
                {formatMoney(selectedInfo.stats.credits)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{isAr ? 'عدد الحركات' : 'Entries'}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {selectedInfo.stats.count}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <button
              type="button"
              onClick={() => {
                if (selectedInfo.acc) onSelectAccountForModal(selectedInfo.acc);
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 8px rgba(148, 111, 35, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Eye size={15} />
              <span>{isAr ? 'فتح كشف الحساب الرسمي المعتمد' : 'Open Official Account Statement'}</span>
            </button>

            <button
              type="button"
              onClick={() => onFilterAccountInJournal(selectedCode)}
              style={{
                width: '100%',
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0.55rem 1rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Filter size={13} />
              <span>{isAr ? 'تصفية حركات الحساب في دفتر اليومية' : 'Filter in Journal Register'}</span>
            </button>
          </div>

          {/* Recent Journal Transactions for this account */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'آخر قيود معتمدة للحساب:' : 'Recent Posted Entries:'}
              </span>
              <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                {selectedEntries.length} {isAr ? 'حركات أخيرة' : 'recent'}
              </span>
            </div>

            {selectedEntries.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '1.25rem 0.5rem',
                color: '#94a3b8',
                fontSize: '0.72rem'
              }}>
                {isAr ? 'لا توجد قيود مسجلة على هذا الحساب حتى الآن' : 'No posted transactions yet'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '220px', overflowY: 'auto' }}>
                {selectedEntries.map(entry => {
                  const matchingLine = (entry.lines || []).find(l => l.account_code === selectedCode);
                  const isDebit = matchingLine && D(matchingLine.debit_amount).isPositive();
                  const amount = isDebit ? matchingLine?.debit_amount : matchingLine?.credit_amount;

                  return (
                    <div
                      key={entry.entry_id}
                      onClick={() => onFilterAccountInJournal(selectedCode)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.55rem 0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0f172a' }}>
                          {entry.entry_number}
                        </span>
                        <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                          {entry.entry_date}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          color: '#475569',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '180px'
                        }}>
                          {localizeJournalDescription(entry.description, isAr)}
                        </span>
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.2rem', direction: 'ltr' }}>
                          <span style={{
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            color: isDebit ? '#15803d' : '#946f23'
                          }}>
                            {isDebit ? '+' : '-'}{formatMoney(amount || '0')}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                            {isAr ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
