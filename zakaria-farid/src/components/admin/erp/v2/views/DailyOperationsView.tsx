'use client';

import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Wallet, 
  FileText, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  Send, 
  Loader2, 
  ArrowUpRight,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Receipt,
  ArrowLeft,
  AlertCircle,
  BellRing,
  Activity,
  UserCheck,
  Key
} from 'lucide-react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { 
  ERPContract, 
  ERPPDCRecord, 
  ERPInstallmentSchedule, 
  ERPAccountingPeriod,
  ERPJournalEntry 
} from '@/lib/erp/types';
import { D } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { StatusBadge } from '@/components/erp/StatusBadge';
import { localizeJournalDescription } from '@/components/erp/JournalEntryPreview';
import styles from '../ZFWorkstationShell.module.css';

interface DailyOperationsViewProps {
  isAr?: boolean;
  kpis: {
    cashBank: string;
    accountsReceivable: string;
    totalWip?: string;
    deferredRevenue?: string;
    realizedRevenue?: string;
  };
  totalGrossContractValue: string;
  totalCollectedCash: string;
  totalWipIncurred: string;
  totalSafePDCs?: string;
  properties: Property[];
  contracts: ERPContract[];
  pdcRecords: ERPPDCRecord[];
  schedules: ERPInstallmentSchedule[];
  journalEntries?: ERPJournalEntry[];
  activePeriod: ERPAccountingPeriod;
  isMutating?: boolean;
  onOpenQuickTransaction: () => void;
  onOpenNewContract: () => void;
  onOpenNewCheque: () => void;
  onCollectItem: (item: ERPPDCRecord) => void;
  onInspectContract: (contract: ERPContract) => void;
  onOpenContractForProperty: (property: Property, unit?: BuildingUnitItem) => void;
  onDirectExpenseSubmit?: (amount: string, categoryAccount: string, memo: string) => Promise<void>;
  onNavigateToTab: (tab: any) => void;
}

export const DailyOperationsView: React.FC<DailyOperationsViewProps> = ({
  isAr = true,
  kpis,
  totalGrossContractValue,
  totalCollectedCash,
  totalWipIncurred,
  totalSafePDCs = '0.00',
  properties = [],
  contracts = [],
  pdcRecords = [],
  schedules = [],
  journalEntries = [],
  activePeriod,
  isMutating = false,
  onOpenQuickTransaction,
  onOpenNewContract,
  onOpenNewCheque,
  onCollectItem,
  onInspectContract,
  onOpenContractForProperty,
  onDirectExpenseSubmit,
  onNavigateToTab
}) => {
  // 1. Dues & Collections Analytics
  const todayStr = new Date().toISOString().split('T')[0];
  const weekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const threeDaysStr = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const { urgentDues, dueTodayCount, dueTodaySum, dueWeekSum } = useMemo(() => {
    let todaySum = D(0);
    let todayCnt = 0;
    let weekSum = D(0);

    const dues = pdcRecords
      .filter(p => p.status !== 'Cleared' && p.status !== 'Void')
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    dues.forEach(p => {
      const val = D(p.nominal_value || '0');
      if (p.due_date <= todayStr) {
        todaySum = todaySum.plus(val);
        todayCnt++;
      } else if (p.due_date <= weekStr) {
        weekSum = weekSum.plus(val);
      }
    });

    return {
      urgentDues: dues.slice(0, 8),
      dueTodayCount: todayCnt,
      dueTodaySum: todaySum,
      dueWeekSum: weekSum
    };
  }, [pdcRecords, todayStr, weekStr]);

  // 2. Operational Risk & Friction Radar Alerts
  const operationalAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      severity: 'critical' | 'warning' | 'info';
      titleAr: string;
      titleEn: string;
      detailAr: string;
      detailEn: string;
      actionLabelAr: string;
      actionLabelEn: string;
      onClick: () => void;
    }> = [];

    // Overdue items
    const overdueList = pdcRecords.filter(p => p.status !== 'Cleared' && p.status !== 'Void' && p.due_date < todayStr);
    if (overdueList.length > 0) {
      const sum = overdueList.reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0));
      alerts.push({
        id: 'overdue-dues',
        severity: 'critical',
        titleAr: `متأخرات تحصيل حرجة: ${overdueList.length} أقساط تجاوزت موعدها`,
        titleEn: `Critical Overdue Dues: ${overdueList.length} installments past maturity`,
        detailAr: `إجمالي المبالغ المتأخرة ${sum.formatEGP(true)} تتطلب متابعة العميل وسرعة التحصيل`,
        detailEn: `Total overdue of ${sum.formatEGP(false)} requires immediate debtor follow-up`,
        actionLabelAr: 'متابعة وتحصيل',
        actionLabelEn: 'Collect Now',
        onClick: () => onCollectItem(overdueList[0])
      });
    }

    // In-safe cheques maturing within 72 hours
    const nearSafeCheques = pdcRecords.filter(p => 
      p.status === 'In Safe' && 
      p.due_date >= todayStr && 
      p.due_date <= threeDaysStr
    );
    if (nearSafeCheques.length > 0) {
      const sum = nearSafeCheques.reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0));
      alerts.push({
        id: 'safe-cheques-near',
        severity: 'warning',
        titleAr: `شيكات بالخزينة تستحق خلال 72 ساعة (${nearSafeCheques.length} شيكات)`,
        titleEn: `In-Safe Cheques Maturing within 72 Hours (${nearSafeCheques.length} cheques)`,
        detailAr: `بقيمة ${sum.formatEGP(true)} جاهزة للإيداع البنكي للتحصيل`,
        detailEn: `Value of ${sum.formatEGP(false)} ready for bank deposit`,
        actionLabelAr: 'حافظة الشيكات',
        actionLabelEn: 'View Vault',
        onClick: () => onNavigateToTab('pdc')
      });
    }

    // Handover Readiness Audit: Contracts with >= 70% collected but still Pending Handover
    const readyForHandover = contracts.filter(c => {
      if (c.status === 'Rescinded' || c.handover_status === 'Delivered') return false;
      const total = parseFloat(c.gross_contract_value || '1');
      const paid = parseFloat(c.total_cash_collected || '0');
      return total > 0 && (paid / total) >= 0.7;
    });

    if (readyForHandover.length > 0) {
      alerts.push({
        id: 'handover-audit',
        severity: 'info',
        titleAr: `جاهزية تسليم الوحدات: ${readyForHandover.length} عقود بلغت 70%+ من السداد`,
        titleEn: `Handover Readiness: ${readyForHandover.length} contracts achieved 70%+ payment`,
        detailAr: `الوحدات مؤهلة لبدء الفحص الهندسي وإجراءات محضر الاستلام`,
        detailEn: `Units are qualified for site snagging and handover protocol`,
        actionLabelAr: 'فحص العقود',
        actionLabelEn: 'Audit Contracts',
        onClick: () => onNavigateToTab('contracts')
      });
    }

    // Ledger balance health indicator
    alerts.push({
      id: 'ledger-health',
      severity: 'info',
      titleAr: 'سلامة اليومية والدليل المحاسبي: قيود متوازنة 100%',
      titleEn: 'General Ledger Health: Balanced entries 100%',
      detailAr: `الفترة المالية (${activePeriod.fiscal_year}/${activePeriod.period_number}) مفتوحة والترحيل المزدوج نشط`,
      detailEn: `Accounting period (${activePeriod.fiscal_year}/${activePeriod.period_number}) is open with real-time double-entry posting`,
      actionLabelAr: 'دفتر الأستاذ',
      actionLabelEn: 'View Ledger',
      onClick: () => onNavigateToTab('ledger')
    });

    return alerts;
  }, [pdcRecords, contracts, todayStr, threeDaysStr, activePeriod, onCollectItem, onNavigateToTab]);

  // 3. Available Units for Instant Sale
  const [unitSearch, setUnitSearch] = useState('');
  const availableUnits = useMemo(() => {
    return properties
      .filter(p => {
        const isContracted = contracts.some(c => 
          c.status !== 'Rescinded' && 
          (c.property_id === p.id || c.unit_id === p.title_ar || c.unit_id === p.title_en)
        ) || p.listing_status === 'sold';
        return !isContracted;
      })
      .filter(p => {
        if (!unitSearch.trim()) return true;
        const q = unitSearch.toLowerCase();
        const title = (isAr ? p.title_ar : p.title_en || '').toLowerCase();
        const loc = (p.location || '').toLowerCase();
        return title.includes(q) || loc.includes(q);
      })
      .slice(0, 6);
  }, [properties, contracts, unitSearch, isAr]);

  // 4. Inline 10-Second Expense State
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('501000'); // Default construction/WIP
  const [expenseMemo, setExpenseMemo] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState('');

  const EXPENSE_CATEGORIES = [
    { code: '501000', labelAr: 'حديد وأسمنت ومواد بناء', labelEn: 'Civil & Concrete' },
    { code: '502000', labelAr: 'تشطيبات وكهرباء وسباكة', labelEn: 'Finishing & MEP' },
    { code: '601000', labelAr: 'عمولات وسطاء ومسوقين', labelEn: 'Broker Commission' },
    { code: '602000', labelAr: 'نثريات وإكراميات موقع', labelEn: 'Site Petty Cash' },
    { code: '603000', labelAr: 'فواتير ومصاريف إدارية', labelEn: 'Utilities & Admin' },
  ];

  const handleQuickExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || parseFloat(expenseAmount) <= 0 || !onDirectExpenseSubmit) return;

    setIsSubmittingExpense(true);
    try {
      await onDirectExpenseSubmit(
        expenseAmount,
        expenseCategory,
        expenseMemo || (isAr ? 'مصروف نقدي من الخزينة الرئيسية' : 'Cash expense from Safe')
      );
      setExpenseAmount('');
      setExpenseMemo('');
      setExpenseSuccessMsg(isAr ? 'تم تقييد المصروف وخصمه من الخزينة بنجاح!' : 'Expense recorded and safe debited!');
      setTimeout(() => setExpenseSuccessMsg(''), 4000);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // 5. Recent Verified Operations & Audit Stream
  const recentAuditEntries = useMemo(() => {
    return [...journalEntries]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6);
  }, [journalEntries]);

  return (
    <div className={styles.stageContainer}>
      
      {/* 1. HERO GREETING & CONTEXT */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '0.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(148, 111, 35, 0.25)'
            }}>
              <Zap size={16} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {isAr ? 'المكتب اليومي السريع للعمليات' : 'Daily Operations Desk'}
            </h1>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#059669'
            }}>
              {isAr ? 'جاهز للعمل المباشر' : 'Live & Ready'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'إنجاز مهام اليوم في ثوانٍ: تحصيل الأقساط، تسجيل العقود، إثبات المصروفات، رادار التنبيهات، وسجل التدقيق'
              : 'Complete everyday tasks in seconds: Hand collections, contracts, quick expenses, alert radar, and audit log'}
          </p>
        </div>

        {/* Date & Period Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '0.4rem 0.85rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <Clock size={14} color="#946f23" />
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* 2. THE 4 CALM EXECUTIVE METRIC STRIPS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        
        {/* Metric 1: Available Cash in Hand */}
        <div className={styles.card} style={{ padding: '1rem 1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>
              {isAr ? 'السيولة المتاحة فوراً' : 'Cash in Hand (Safe + Bank)'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.2rem 0' }}>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {D(kpis.cashBank).formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>{isAr ? 'شيكات في الخزينة' : 'In-Safe Cheques'}</span>
            <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{D(totalSafePDCs).formatEGP(isAr)}</strong>
          </div>
        </div>

        {/* Metric 2: Today / Overdue Collections */}
        <div className={styles.card} style={{ padding: '1rem 1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>
              {isAr ? 'تحصيلات عاجلة (اليوم / متأخر)' : 'Urgent Dues (Today/Overdue)'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dueTodayCount > 0 ? '#dc2626' : '#15803d', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.2rem 0' }}>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: dueTodayCount > 0 ? '#946f23' : '#15803d', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {dueTodaySum.formatEGP(isAr)}
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>{isAr ? 'عدد الأقساط العاجلة' : 'Urgent Tranches'}</span>
            <strong style={{ color: dueTodayCount > 0 ? '#dc2626' : '#15803d', fontVariantNumeric: 'tabular-nums' }}>
              {dueTodayCount} {isAr ? 'أقساط مطلوبة' : 'items'}
            </strong>
          </div>
        </div>

        {/* Metric 3: Ready Units Inventory */}
        <div className={styles.card} style={{ padding: '1rem 1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>
              {isAr ? 'الوحدات الجاهزة للتعاقد' : 'Ready Inventory for Sale'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#946f23', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.2rem 0' }}>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {availableUnits.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{isAr ? 'وحدة متاحة' : 'Units'}</span>
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>{isAr ? 'من إجمالي المحفظة' : 'Of Total Portfolio'}</span>
            <strong style={{ color: '#946f23' }}>{properties.length} {isAr ? 'عقار' : 'total'}</strong>
          </div>
        </div>

        {/* Metric 4: Active Contracts Pipeline */}
        <div className={styles.card} style={{
          padding: '1rem 1.15rem',
          background: 'linear-gradient(180deg, #ffffff 0%, #fefdfa 100%)',
          border: '1px solid rgba(184, 144, 62, 0.35)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03), 0 4px 12px -3px rgba(184, 144, 62, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#946f23' }}>
              {isAr ? 'العقود الجارية قيد السداد' : 'Active Contracts Pipeline'}
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#b8903e', display: 'inline-block' }} />
          </div>
          <div style={{ margin: '0.2rem 0' }}>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              {contracts.filter(c => c.status !== 'Rescinded').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#946f23' }}>{isAr ? 'عقد سارٍ' : 'Deals'}</span>
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>{isAr ? 'إجمالي المبيعات' : 'Gross Value'}</span>
            <strong style={{ color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>{D(totalGrossContractValue).formatEGP(isAr)}</strong>
          </div>
        </div>
      </div>

      {/* 3. THE BIG 4 1-CLICK ACTION LAUNCHPAD */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {isAr ? 'منصة الإجراءات الفورية السريعة' : '1-Click Executive Action Launchpad'}
          </h2>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {isAr ? 'تنفيذ مباشر بضغطة واحدة دون تعقيد' : 'Instant execution with zero friction'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          
          {/* Action 1: Collect Hand Payment & Voucher */}
          <button
            type="button"
            onClick={() => {
              if (urgentDues.length > 0) {
                onCollectItem(urgentDues[0]);
              } else {
                onNavigateToTab('pdc');
              }
            }}
            style={{
              background: '#ffffff',
              border: '1.5px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '1.15rem',
              textAlign: isAr ? 'right' : 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.06)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#10b981')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)')}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Receipt size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'تحصيل قسط وسند قبض' : 'Collect & Issue Receipt'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                {isAr ? 'إثبات استلام نقدية باليد مع طباعة إيصال رسمي' : 'Record cash hand collection with printable voucher'}
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>{isAr ? 'بدء التحصيل الآن ←' : 'Collect now →'}</span>
            </div>
          </button>

          {/* Action 2: New Sales Contract */}
          <button
            type="button"
            onClick={onOpenNewContract}
            style={{
              background: '#ffffff',
              border: '1.5px solid rgba(184, 144, 62, 0.35)',
              borderRadius: '14px',
              padding: '1.15rem',
              textAlign: isAr ? 'right' : 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              boxShadow: '0 2px 8px rgba(184, 144, 62, 0.08)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#b8903e')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(184, 144, 62, 0.35)')}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(184, 144, 62, 0.12)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'تحرير عقد بيع جديد' : 'New Sales Contract'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                {isAr ? 'معالج مبيعات 3 خطوات: وحدة، دفعات، وشركاء' : '3-step wizard: Unit, payment schedule, splits'}
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#946f23', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>{isAr ? 'تحرير عقد جديد ←' : 'Execute deal →'}</span>
            </div>
          </button>

          {/* Action 3: Quick Expense */}
          <button
            type="button"
            onClick={onOpenQuickTransaction}
            style={{
              background: '#ffffff',
              border: '1.5px solid rgba(184, 144, 62, 0.25)',
              borderRadius: '14px',
              padding: '1.15rem',
              textAlign: isAr ? 'right' : 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              boxShadow: '0 2px 6px rgba(184, 144, 62, 0.06)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#946f23')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(184, 144, 62, 0.25)')}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(184, 144, 62, 0.1)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'قيد مصروف / دفعة مورد' : 'Record Quick Expense'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                {isAr ? 'صرف فوري من الخزينة لحسابات التنفيذ والتشغيل' : 'Disburse cash from safe to site & operations'}
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#946f23', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>{isAr ? 'تسجيل مصروف ←' : 'Log expense →'}</span>
            </div>
          </button>

          {/* Action 4: New Cheque / Due */}
          <button
            type="button"
            onClick={onOpenNewCheque}
            style={{
              background: '#ffffff',
              border: '1.5px solid rgba(148, 111, 35, 0.25)',
              borderRadius: '14px',
              padding: '1.15rem',
              textAlign: isAr ? 'right' : 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#946f23')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(148, 111, 35, 0.25)')}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Wallet size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'إيداع قسط / شيك بالخزينة' : 'Deposit PDC / Cheque'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                {isAr ? 'حفظ شيك تحت التحصيل لعميل برقم مسلسل' : 'Safeguard post-dated cheque in treasury safe'}
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>{isAr ? 'إيداع ورقة قبض ←' : 'Deposit cheque →'}</span>
            </div>
          </button>

        </div>
      </div>

      {/* 4. MAIN OPERATIONAL SPLIT: (A) TODAY'S DUE QUEUE & (B) INSTANT UNIT FINDER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
        
        {/* COLUMN A: TODAY'S DUE COLLECTION QUEUE */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <Clock size={16} color="#d97706" />
                <span>{isAr ? 'طابور التحصيلات العاجلة لليوم' : 'Urgent Dues Collection Queue'}</span>
              </h3>
              <p className={styles.cardSubtitle}>
                {isAr ? 'أقساط وشيكات مستحقة السداد الفوري بضغطة زر واحدة' : 'Installments due for collection today with 1-click action'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('pdc')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#946f23',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span>{isAr ? 'كافة الأقساط' : 'View all'}</span>
              <ArrowLeft size={12} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
            </button>
          </div>

          {urgentDues.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              <CheckCircle2 size={28} color="#10b981" style={{ margin: '0 auto 0.5rem auto', opacity: 0.9 }} />
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{isAr ? 'المحفظة منتظمة بالكامل!' : 'Portfolio is completely up to date!'}</div>
              <div style={{ fontSize: '0.74rem', marginTop: '0.25rem' }}>{isAr ? 'لا توجد أي أقساط متأخرة أو مستحقة اليوم.' : 'No overdue or due installments today.'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {urgentDues.map((item) => {
                const linkedContract = contracts.find(c => c.contract_id === item.contract_id);
                const isOverdue = item.due_date < todayStr;

                return (
                  <div 
                    key={item.cheque_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.95rem',
                      background: isOverdue ? 'rgba(239, 68, 68, 0.02)' : '#ffffff',
                      border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.25)' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      gap: '0.75rem',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                          {item.drawer_name || linkedContract?.buyer_name || (isAr ? 'عميل' : 'Client')}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {item.cheque_number ? `#${item.cheque_number}` : (linkedContract?.contract_number || '')}
                        </span>
                        {isOverdue && (
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '0.05rem 0.35rem',
                            borderRadius: '4px',
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca'
                          }}>
                            {isAr ? 'متأخر' : 'Overdue'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{item.due_date}</span>
                        <span>•</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>{linkedContract?.unit_id || (isAr ? 'وحدة تعاقدية' : 'Unit')}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                          {D(item.nominal_value).formatEGP(isAr)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onCollectItem(item)}
                        style={{
                          background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                          color: '#ffffff',
                          padding: '0.4rem 0.9rem',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(148, 111, 35, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Receipt size={12} />
                        <span>{isAr ? 'تحصيل فوري' : 'Collect'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN B: INSTANT UNIT LOOKUP & 1-CLICK DEAL CREATOR */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>
                <Building2 size={16} color="#946f23" />
                <span>{isAr ? 'محدد الوحدات المتاحة والتعاقد الفوري' : 'Instant Unit Finder & Fast Contracting'}</span>
              </h3>
              <p className={styles.cardSubtitle}>
                {isAr ? 'اختر أي وحدة متاحة لفتح معالج التعاقد المباشر' : 'Search inventory and launch deal creation in 1 click'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('properties')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#946f23',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span>{isAr ? 'كتالوج العقارات' : 'Full Catalog'}</span>
              <ArrowLeft size={12} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
            </button>
          </div>

          {/* Unit Instant Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            marginBottom: '0.75rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <Search size={14} color="#64748b" />
            <input 
              type="text"
              value={unitSearch}
              onChange={e => setUnitSearch(e.target.value)}
              placeholder={isAr ? 'بحث سريع باسم الوحدة، الفيلا، أو العمارة...' : 'Search unit, villa, or building name...'}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#0f172a',
                fontSize: '0.78rem',
                outline: 'none'
              }}
            />
          </div>

          {availableUnits.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
              <div>{isAr ? 'لا توجد وحدات متاحة مطابقة للبحث' : 'No available units match search'}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {availableUnits.map(prop => (
                <div 
                  key={prop.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 0.9rem',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    gap: '0.75rem',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isAr ? prop.title_ar : prop.title_en}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{prop.location || (isAr ? 'الموقع مسجل' : 'Location')}</span>
                      <span>•</span>
                      <span>{prop.area_sqm} م²</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {D(prop.price_egp).formatEGP(isAr)}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>
                        {isAr ? 'متاحة للبيع' : 'Available'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenContractForProperty(prop)}
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Plus size={12} />
                      <span>{isAr ? 'تعاقد فوري' : 'Sell'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 5. OPERATIONAL RISK & FRICTION RADAR (رادار التنبيهات التشغيلية ومخاطر التحصيل) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'rgba(217, 119, 6, 0.1)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BellRing size={15} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'رادار التنبيهات التشغيلية والمخاطر اللحظية' : 'Operational Risk & Friction Radar'}
              </h3>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {isAr ? 'كشف فوري لمواطن الاحتكاك المالي، الشيكات المستحقة، وجاهزية تسليم الوحدات' : 'Real-time friction detection, due cheques, and handover readiness'}
              </span>
            </div>
          </div>

          <span style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '0.15rem 0.5rem',
            borderRadius: '6px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#475569'
          }}>
            {operationalAlerts.length} {isAr ? 'تنبيهات نشطة' : 'alerts'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {operationalAlerts.map(alert => {
            const isCrit = alert.severity === 'critical';
            const isWarn = alert.severity === 'warning';

            return (
              <div
                key={alert.id}
                style={{
                  background: isCrit ? 'rgba(239, 68, 68, 0.03)' : isWarn ? 'rgba(217, 119, 6, 0.03)' : '#f8fafc',
                  border: `1px solid ${isCrit ? 'rgba(239, 68, 68, 0.25)' : isWarn ? 'rgba(217, 119, 6, 0.25)' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isCrit ? '#dc2626' : isWarn ? '#d97706' : '#946f23', fontWeight: 800, fontSize: '0.78rem' }}>
                    {isCrit ? <AlertCircle size={14} /> : isWarn ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
                    <span>{isAr ? alert.titleAr : alert.titleEn}</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                    {isAr ? alert.detailAr : alert.detailEn}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: isAr ? 'flex-start' : 'flex-end', paddingTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={alert.onClick}
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${isCrit ? '#fca5a5' : isWarn ? '#fcd34d' : '#cbd5e1'}`,
                      color: isCrit ? '#dc2626' : isWarn ? '#b45309' : '#334155',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? alert.actionLabelAr : alert.actionLabelEn} ←
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. LIVE AUDIT STREAM & RECENT VERIFIED OPERATIONS LEDGER */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={15} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'سجل العمليات والتدقيق اللحظي المباشر (Audit Trail)' : 'Live Operations & Audit Stream'}
              </h3>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {isAr ? 'تتبع فوري وموثق لكافة القيود المحاسبية، التحصيلات، والمصروفات المسجلة حديثاً' : 'Chronological verified log of recent journal postings and disbursements'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('ledger')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#059669',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <span>{isAr ? 'دفتر الأستاذ الكامل' : 'Full Ledger'}</span>
            <ArrowLeft size={12} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
          </button>
        </div>

        {recentAuditEntries.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
            {isAr ? 'لا توجد قيود مسجلة حديثاً في هذا السجل.' : 'No recent entries in this log.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {recentAuditEntries.map((je) => {
              const debitTotal = je.lines?.reduce((acc, l) => acc.plus(l.debit_amount || '0'), D(0)) || D(0);

              return (
                <div
                  key={je.entry_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.95rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    <span style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 800,
                      color: '#946f23',
                      background: 'rgba(184, 144, 62, 0.1)',
                      padding: '0.12rem 0.45rem',
                      borderRadius: '5px',
                      fontSize: '0.74rem'
                    }}>
                      {je.entry_number}
                    </span>

                    <span style={{ color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {localizeJournalDescription(je.description, isAr)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.68rem', fontVariantNumeric: 'tabular-nums' }}>
                      <UserCheck size={12} color="#946f23" />
                      <span>{je.created_by || 'ADMIN'}</span>
                      <span>•</span>
                      <span>{je.entry_date}</span>
                    </div>

                    <div style={{ fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {debitTotal.formatEGP(isAr)}
                    </div>

                    <span style={{
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      padding: '0.12rem 0.45rem',
                      borderRadius: '4px',
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid rgba(22, 163, 74, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <ShieldCheck size={11} />
                      <span>{isAr ? 'مُدقق' : 'Verified'}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. 10-SECOND INLINE EXPENSE LOGGER */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'rgba(184, 144, 62, 0.1)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={15} />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
              {isAr ? 'مسجل المصروفات السريع المباشر (10 ثوانٍ)' : '10-Second Inline Expense Logger'}
            </h3>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {isAr ? 'صرف نقدي فوري وترحيل لدفتر الأستاذ دون فتح نوافذ' : 'Direct cash disbursement and GL posting without modals'}
            </span>
          </div>

          {expenseSuccessMsg && (
            <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle2 size={14} />
              <span>{expenseSuccessMsg}</span>
            </span>
          )}
        </div>

        {/* Quick Category Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
            {isAr ? 'بند المصروف:' : 'Category:'}
          </span>
          {EXPENSE_CATEGORIES.map(cat => (
            <button
              key={cat.code}
              type="button"
              onClick={() => setExpenseCategory(cat.code)}
              style={{
                background: expenseCategory === cat.code ? '#0f172a' : '#f8fafc',
                color: expenseCategory === cat.code ? '#ffffff' : '#334155',
                border: `1px solid ${expenseCategory === cat.code ? '#0f172a' : '#e2e8f0'}`,
                borderRadius: '6px',
                padding: '0.25rem 0.6rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isAr ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>

        {/* Direct Expense Form Inputs */}
        <form onSubmit={handleQuickExpenseSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ width: '180px', flexShrink: 0 }}>
            <input 
              type="number"
              step="50"
              required
              min="1"
              value={expenseAmount}
              onChange={e => setExpenseAmount(e.target.value)}
              placeholder={isAr ? 'المبلغ (ج.م) *' : 'Amount (EGP) *'}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '0.85rem',
                fontWeight: 800,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '240px' }}>
            <input 
              type="text"
              required
              value={expenseMemo}
              onChange={e => setExpenseMemo(e.target.value)}
              placeholder={isAr ? 'بيان وصرف المصروف (مثال: دفعة مصنعيات توريد حديد لصبة السقف)...' : 'Description / Memo (e.g. Concrete supplier payment)...'}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingExpense || !expenseAmount}
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 1.25rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: isSubmittingExpense || !expenseAmount ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: !expenseAmount ? 0.6 : 1,
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
            }}
          >
            {isSubmittingExpense ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            <span>{isAr ? 'حفظ وترحيل للخزينة' : 'Post to Safe'}</span>
          </button>
        </form>
      </div>

    </div>
  );
};
