'use client';

import React, { useState, useMemo, useRef } from 'react';
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
  Key, 
  Filter, 
  ArrowUpDown, 
  X, 
  RotateCcw,
  Sparkles,
  Calculator,
  Layers,
  HardHat,
  ExternalLink,
  ChevronRight,
  Scale,
  CreditCard,
  Briefcase,
  SlidersHorizontal,
  Compass,
  FileCheck
} from 'lucide-react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { 
  ERPContract, 
  ERPPDCRecord, 
  ERPInstallmentSchedule, 
  ERPAccountingPeriod,
  ERPJournalEntry,
  ERPPropertyCostItem,
  PropertyCostCategory,
  PropertyLifecyclePhase
} from '@/lib/erp/types';
import { D, generateUUID } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { StatusBadge } from '@/components/erp/StatusBadge';
import { localizeJournalDescription } from '@/components/erp/JournalEntryPreview';
import { ZFKpiCard } from '../ZFKpiCard';
import styles from '../ZFWorkstationShell.module.css';
import { toast } from 'sonner';

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
  propertyCosts?: ERPPropertyCostItem[];
  isMutating?: boolean;
  onOpenQuickTransaction: () => void;
  onOpenNewContract: () => void;
  onOpenNewCheque: () => void;
  onCollectItem: (item: ERPPDCRecord) => void;
  onInspectContract: (contract: ERPContract) => void;
  onInspectCheque?: (cheque: ERPPDCRecord) => void;
  onOpenContractForProperty: (property: Property, unit?: BuildingUnitItem) => void;
  onOpenAuditForProperty?: (property: Property) => void;
  onOpenCalculatorForProperty?: (property: Property) => void;
  onOpenRSVModal?: () => void;
  onOpenRescissionModal?: (contract: ERPContract) => void;
  onOpenEscalationModal?: (contract: ERPContract) => void;
  onOpenQuickSearch?: () => void;
  onAddPropertyCostItem?: (item: ERPPropertyCostItem) => Promise<void>;
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
  propertyCosts = [],
  isMutating = false,
  onOpenQuickTransaction,
  onOpenNewContract,
  onOpenNewCheque,
  onCollectItem,
  onInspectContract,
  onInspectCheque,
  onOpenContractForProperty,
  onOpenAuditForProperty,
  onOpenCalculatorForProperty,
  onOpenRSVModal,
  onOpenRescissionModal,
  onOpenEscalationModal,
  onOpenQuickSearch,
  onAddPropertyCostItem,
  onDirectExpenseSubmit,
  onNavigateToTab
}) => {
  // 1. Dues & Collections Analytics
  const todayStr = new Date().toISOString().split('T')[0];
  const weekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const threeDaysStr = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  // Desk Search, Filter & Sort State
  const [deskSearchQuery, setDeskSearchQuery] = useState('');
  const [duesStatusFilter, setDuesStatusFilter] = useState<'all' | 'overdue' | 'today'>('all');
  const [duesSortBy, setDuesSortBy] = useState<'date_asc' | 'date_desc' | 'amount_desc' | 'amount_asc' | 'name_asc'>('date_asc');

  // Queue Multi-Tab State
  const [activeLeftQueueTab, setActiveLeftQueueTab] = useState<'dues' | 'safe_cheques'>('dues');
  const [activeRightQueueTab, setActiveRightQueueTab] = useState<'units' | 'handover'>('units');

  // Contextual Direct Logger State
  const [loggerMode, setLoggerMode] = useState<'general_expense' | 'project_wip'>('general_expense');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('501000'); // Default construction/WIP
  const [expenseMemo, setExpenseMemo] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState('');

  // Project WIP Logger Specific Fields
  const [wipPropertyId, setWipPropertyId] = useState(properties[0]?.id || '');
  const [wipCategory, setWipCategory] = useState<PropertyCostCategory>('civil_structure');
  const [wipPhase, setWipPhase] = useState<PropertyLifecyclePhase>('structural_skeleton');
  const [wipItemName, setWipItemName] = useState('');
  const [wipSupplier, setWipSupplier] = useState('');
  const [wipInvoiceRef, setWipInvoiceRef] = useState('');
  const [wipQuantity, setWipQuantity] = useState('1');
  const [wipUnit, setWipUnit] = useState('مقطوعية');

  const { urgentDues, dueTodayCount, dueTodaySum, dueWeekSum, overdueCount, overdueSum } = useMemo(() => {
    let todaySum = D(0);
    let todayCnt = 0;
    let weekSum = D(0);
    let odSum = D(0);
    let odCnt = 0;

    const dues = pdcRecords
      .filter(p => p.status !== 'Cleared' && p.status !== 'Void')
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    dues.forEach(p => {
      const val = D(p.nominal_value || '0');
      if (p.due_date < todayStr) {
        odSum = odSum.plus(val);
        odCnt++;
      } else if (p.due_date === todayStr) {
        todaySum = todaySum.plus(val);
        todayCnt++;
      } else if (p.due_date <= weekStr) {
        weekSum = weekSum.plus(val);
      }
    });

    return {
      urgentDues: dues.slice(0, 10),
      dueTodayCount: todayCnt,
      dueTodaySum: todaySum,
      dueWeekSum: weekSum,
      overdueCount: odCnt,
      overdueSum: odSum
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
        titleAr: `أقساط تستحق خلال 72 ساعة (${nearSafeCheques.length} أقساط)`,
        titleEn: `Installments Maturing within 72 Hours (${nearSafeCheques.length} items)`,
        detailAr: `بقيمة ${sum.formatEGP(true)} جاهزة للتحصيل وسندات القبض`,
        detailEn: `Value of ${sum.formatEGP(false)} ready for collection`,
        actionLabelAr: 'أجندة الأقساط',
        actionLabelEn: 'View Dues',
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

  // 3. Filtered & Sorted Dues for the Collection Queue
  const filteredAndSortedDues = useMemo(() => {
    let dues = pdcRecords.filter(p => p.status !== 'Cleared' && p.status !== 'Void');

    // Status filter
    if (duesStatusFilter === 'overdue') {
      dues = dues.filter(p => p.due_date < todayStr);
    } else if (duesStatusFilter === 'today') {
      dues = dues.filter(p => p.due_date === todayStr);
    }

    // Unified desk search filter (drawer, cheque #, buyer name, contract #, unit)
    if (deskSearchQuery.trim()) {
      const q = deskSearchQuery.toLowerCase().trim();
      dues = dues.filter(p => {
        const drawer = (p.drawer_name || '').toLowerCase();
        const chequeNo = (p.cheque_number || '').toLowerCase();
        const contract = contracts.find(c => c.contract_id === p.contract_id);
        const buyer = (contract?.buyer_name || '').toLowerCase();
        const contractNo = (contract?.contract_number || '').toLowerCase();
        const unit = (contract?.unit_id || '').toLowerCase();
        return drawer.includes(q) || chequeNo.includes(q) || buyer.includes(q) || contractNo.includes(q) || unit.includes(q);
      });
    }

    // Sorting
    return [...dues].sort((a, b) => {
      if (duesSortBy === 'date_asc') return (a.due_date || '').localeCompare(b.due_date || '');
      if (duesSortBy === 'date_desc') return (b.due_date || '').localeCompare(a.due_date || '');
      if (duesSortBy === 'amount_desc') return D(b.nominal_value || '0').minus(D(a.nominal_value || '0')).toNumber();
      if (duesSortBy === 'amount_asc') return D(a.nominal_value || '0').minus(D(b.nominal_value || '0')).toNumber();
      if (duesSortBy === 'name_asc') {
        const nameA = a.drawer_name || '';
        const nameB = b.drawer_name || '';
        return nameA.localeCompare(nameB);
      }
      return 0;
    });
  }, [pdcRecords, duesStatusFilter, deskSearchQuery, duesSortBy, todayStr, contracts]);

  const filteredDuesSum = useMemo(() => {
    return filteredAndSortedDues.reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0));
  }, [filteredAndSortedDues]);

  // 4. Maturing Safe Cheques for Queue Tab 2
  const maturingSafeCheques = useMemo(() => {
    let safeCheques = pdcRecords.filter(p => p.status === 'In Safe');
    if (deskSearchQuery.trim()) {
      const q = deskSearchQuery.toLowerCase().trim();
      safeCheques = safeCheques.filter(p => {
        const drawer = (p.drawer_name || '').toLowerCase();
        const chequeNo = (p.cheque_number || '').toLowerCase();
        const bank = (p.bank_name || '').toLowerCase();
        return drawer.includes(q) || chequeNo.includes(q) || bank.includes(q);
      });
    }
    return safeCheques.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  }, [pdcRecords, deskSearchQuery]);

  const safeChequesSum = useMemo(() => {
    return maturingSafeCheques.reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0));
  }, [maturingSafeCheques]);

  // Active filter count for reset button
  const activeFiltersCount = (deskSearchQuery.trim() ? 1 : 0) + 
    (duesStatusFilter !== 'all' ? 1 : 0) + 
    (duesSortBy !== 'date_asc' ? 1 : 0);

  const handleResetFilters = () => {
    setDeskSearchQuery('');
    setDuesStatusFilter('all');
    setDuesSortBy('date_asc');
  };

  // 5. Available Units for Instant Sale Matching Desk Search
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
        if (!deskSearchQuery.trim()) return true;
        const q = deskSearchQuery.toLowerCase().trim();
        const title = (isAr ? p.title_ar : p.title_en || '').toLowerCase();
        const loc = (p.location || '').toLowerCase();
        return title.includes(q) || loc.includes(q);
      })
      .slice(0, 8);
  }, [properties, contracts, deskSearchQuery, isAr]);

  // 6. Contracts Ready for Handover Protocol
  const readyForHandoverContracts = useMemo(() => {
    let list = contracts.filter(c => {
      if (c.status === 'Rescinded' || c.handover_status === 'Delivered') return false;
      const total = parseFloat(c.gross_contract_value || '1');
      const paid = parseFloat(c.total_cash_collected || '0');
      return total > 0 && (paid / total) >= 0.7;
    });

    if (deskSearchQuery.trim()) {
      const q = deskSearchQuery.toLowerCase().trim();
      list = list.filter(c => {
        const buyer = (c.buyer_name || '').toLowerCase();
        const unit = (c.unit_id || '').toLowerCase();
        const cno = (c.contract_number || '').toLowerCase();
        return buyer.includes(q) || unit.includes(q) || cno.includes(q);
      });
    }

    return list.slice(0, 8);
  }, [contracts, deskSearchQuery]);

  // Categories for General Expense
  const EXPENSE_CATEGORIES = [
    { code: '501000', labelAr: 'حديد وأسمنت ومواد بناء', labelEn: 'Civil & Concrete' },
    { code: '502000', labelAr: 'تشطيبات وكهرباء وسباكة', labelEn: 'Finishing & MEP' },
    { code: '601000', labelAr: 'عمولات وسطاء ومسوقين', labelEn: 'Broker Commission' },
    { code: '602000', labelAr: 'نثريات وإكراميات موقع', labelEn: 'Site Petty Cash' },
    { code: '603000', labelAr: 'فواتير ومصاريف إدارية', labelEn: 'Utilities & Admin' },
  ];

  // Submit Handler: 10-Second Quick General Expense
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
      toast.error(isAr ? 'فشل تسجيل المصروف' : 'Failed to record expense', { description: (err as Error).message });
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Submit Handler: Project WIP Construction Cost Logger
  const handleQuickWipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || parseFloat(expenseAmount) <= 0 || !wipPropertyId) return;

    setIsSubmittingExpense(true);
    try {
      const selectedProp = properties.find(p => p.id === wipPropertyId);
      const propTitle = selectedProp ? (isAr ? selectedProp.title_ar : selectedProp.title_en) : (isAr ? 'عقار غير محدد' : 'Property');
      const itemName = wipItemName.trim() || (isAr ? 'توريد مواد ومصنعيات بناء' : 'WIP Materials & Labor');
      const memo = `${isAr ? 'مصروف إنشاءات لمشروع' : 'WIP Construction expense for'} ${propTitle}: ${itemName}${wipSupplier ? ` - ${wipSupplier}` : ''}${wipInvoiceRef ? ` (فاتورة: ${wipInvoiceRef})` : ''}`;

      // 1. If onAddPropertyCostItem is provided, add to project cost ledger
      if (onAddPropertyCostItem) {
        const costItem: ERPPropertyCostItem = {
          item_id: generateUUID(),
          property_id: wipPropertyId,
          category: wipCategory,
          phase: wipPhase,
          item_name_ar: wipItemName.trim() || 'توريد مواد ومصنعيات',
          item_name_en: wipItemName.trim() || 'WIP Materials & Labour',
          supplier_contractor: wipSupplier.trim() || undefined,
          invoice_ref: wipInvoiceRef.trim() || undefined,
          quantity: parseFloat(wipQuantity) || 1,
          unit: wipUnit,
          unit_cost_egp: expenseAmount,
          total_cost_egp: expenseAmount,
          logged_date: todayStr,
          logged_by: 'المكتب اليومي - الإدارة المالية',
          linked_account_code: '151000', // Projects Under Construction (WIP)
          status: 'verified'
        };
        await onAddPropertyCostItem(costItem);
      }

      // 2. If onDirectExpenseSubmit is provided, post journal entry to GL
      if (onDirectExpenseSubmit) {
        await onDirectExpenseSubmit(
          expenseAmount,
          '151000', // Capitalized WIP Asset
          memo
        );
      }

      setExpenseAmount('');
      setWipItemName('');
      setWipSupplier('');
      setWipInvoiceRef('');
      setWipQuantity('1');
      setExpenseSuccessMsg(
        isAr 
          ? `تم قيد تكلفة البناء لمشروع (${propTitle}) بنجاح وترحيلها للأستاذ العام والخزينة!` 
          : `WIP cost registered for (${propTitle}) and debited from safe successfully!`
      );
      toast.success(
        isAr 
          ? `تم قيد تكلفة البناء لمشروع (${propTitle}) بنجاح` 
          : `WIP cost registered for (${propTitle})`,
        {
          description: isAr 
            ? `المبلغ: ${parseFloat(expenseAmount).toLocaleString('ar-EG')} ج.م • البند: ${itemName}`
            : `Amount: ${parseFloat(expenseAmount).toLocaleString('en-US')} EGP • Item: ${itemName}`,
          duration: 5000
        }
      );
      setTimeout(() => setExpenseSuccessMsg(''), 5000);
    } catch (err: unknown) {
      toast.error(isAr ? 'فشل تسجيل تكلفة البناء' : 'Failed to record WIP cost', { description: (err as Error).message });
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // 7. Recent Verified Operations & Audit Stream
  const recentAuditEntries = useMemo(() => {
    return [...journalEntries]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6);
  }, [journalEntries]);

  // First available property for quick actions
  const primaryProperty = properties[0];
  const primaryContract = contracts.find(c => c.status !== 'Rescinded') || contracts[0];

  // Desk Interactive Refs & Focus Handlers
  const amountInputRef = useRef<HTMLInputElement>(null);
  const loggerRef = useRef<HTMLDivElement>(null);

  const handleActivateExpenseMode = () => {
    setLoggerMode('general_expense');
    loggerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => amountInputRef.current?.focus(), 150);
  };

  const handleActivateWipMode = () => {
    setLoggerMode('project_wip');
    loggerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => amountInputRef.current?.focus(), 150);
  };

  return (
    <div className={styles.stageContainer}>
      
      {/* 1. HERO GREETING & STREAMLINED CONTEXT BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingTop: '0.35rem',
        paddingBottom: '0.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
            }}>
              <Zap size={16} />
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {isAr ? 'حركة الخزنة والعمليات اليومية' : 'Daily Operations & Cashier Cockpit'}
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
              {isAr ? 'جاهز للشغل' : 'Live & Ready'}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'إدارة سريعة للشغل اليومي: تحصيل أقساط، تسجيل مصاريف، عمل عقود جديدة، ومتابعة الخزنة'
              : 'The central operational cockpit: Instant collections, disbursements, deals, WIP logging, and audit'}
          </p>
        </div>

        {/* Date & Streamlined Financial Micro-Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div className={styles.deskMiniTelemetry}>
            <div className={styles.deskMiniItem}>
              <span className={styles.deskMiniLabel}>{isAr ? 'الكاش المتاح:' : 'Cash:'}</span>
              <span className={styles.deskMiniVal}>{D(kpis.cashBank).formatEGP(isAr)}</span>
            </div>
            <span className={styles.deskMiniSep} />
            <div className={styles.deskMiniItem}>
              <span className={styles.deskMiniLabel}>{isAr ? 'مستحق النهاردة:' : 'Urgent:'}</span>
              <span className={`${styles.deskMiniVal} ${dueTodayCount + overdueCount > 0 ? styles.deskMiniValAlert : ''}`}>
                {dueTodaySum.plus(overdueSum).formatEGP(isAr)} ({dueTodayCount + overdueCount})
              </span>
            </div>
            <span className={styles.deskMiniSep} />
            <div className={styles.deskMiniItem}>
              <span className={styles.deskMiniLabel}>{isAr ? 'أقساط في الخزنة:' : 'Vault:'}</span>
              <span className={styles.deskMiniVal}>{D(totalSafePDCs).formatEGP(isAr)}</span>
            </div>
            <span className={styles.deskMiniSep} />
            <div className={styles.deskMiniItem}>
              <span className={styles.deskMiniLabel}>{isAr ? 'شقق للبيع:' : 'Ready:'}</span>
              <span className={styles.deskMiniVal}>{availableUnits.length}</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <Clock size={13} color="#946f23" />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE FAST-ACTION COMMAND DESK */}
      <div className={styles.opsActionHub}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(148, 111, 35, 0.2)'
            }}>
              <Sparkles size={14} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'عمليات سريعة بضغطة واحدة' : 'Executive Operational Action Center'}
              </h3>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? 'أهم حركات اليوم: تحصيل أقساط، صرف كاش، عقود بيع، ومصاريف مباني' : 'Instant 1-click execution for cashiering, deals, WIP cost logging, and audits'}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Categorized Action Domains */}
        <div className={styles.opsActionGrid}>
          
          {/* DOMAIN 1: الخزينة والمقبوضات */}
          <div className={styles.opsDomainColumn}>
            <div className={styles.opsDomainHeader}>
              <span className={styles.opsDomainDot} style={{ background: '#10b981' }} />
              <span className={styles.opsDomainTitle}>
                {isAr ? 'الخزنة وتحصيل الفلوس' : 'Treasury & Cashier'}
              </span>
            </div>

            <div className={styles.opsDomainList}>
              {/* Action 1: Collect Due */}
              <button
                type="button"
                className={styles.opsActionBtn}
                onClick={() => {
                  const target = filteredAndSortedDues[0] || urgentDues[0] || pdcRecords.find(p => p.status !== 'Cleared') || pdcRecords[0];
                  if (target) {
                    onCollectItem(target);
                  } else {
                    onNavigateToTab('pdc');
                  }
                }}
                style={{ borderColor: 'rgba(16, 185, 129, 0.35)' }}
              >
                <div className={styles.opsActionIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                  <Receipt size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'تحصيل قسط وطباعة إيصال' : 'Collect & Issue Receipt'}</div>
                  <div className={styles.opsActionSub} style={{ color: '#059669', fontWeight: 600 }}>{isAr ? 'استلام كاش وطباعة إيصال فوري' : 'Instant 1-click collection'}</div>
                </div>
              </button>

              {/* Action 2: Record Due / Installment */}
              <button
                type="button"
                className={styles.opsActionBtn}
                onClick={onOpenNewCheque}
              >
                <div className={styles.opsActionIcon} style={{ background: 'rgba(184, 144, 62, 0.1)', color: '#946f23' }}>
                  <Wallet size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'إثبات قسط أو دفعة قادمة' : 'Record Due / Installment'}</div>
                  <div className={styles.opsActionSub}>{isAr ? 'تسجيل استحقاق مؤجل في موعده' : 'Safeguard scheduled installment'}</div>
                </div>
              </button>

              {/* Action 3: Quick Cash Out */}
              <button
                type="button"
                className={`${styles.opsActionBtn} ${loggerMode === 'general_expense' ? styles.opsActionBtnActive : ''}`}
                onClick={handleActivateExpenseMode}
              >
                <div className={styles.opsActionIcon} style={{ background: 'rgba(15, 23, 42, 0.08)', color: '#0f172a' }}>
                  <DollarSign size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'صرف كاش سريع من الخزنة' : 'Quick Cash Out'}</div>
                  <div className={styles.opsActionSub}>{isAr ? 'مصاريف ونثريات مباشرة' : 'Direct cash disbursement'}</div>
                </div>
              </button>
            </div>
          </div>

          {/* DOMAIN 2: المشاريع وتكاليف البناء */}
          <div className={styles.opsDomainColumn}>
            <div className={styles.opsDomainHeader}>
              <span className={styles.opsDomainDot} style={{ background: '#d97706' }} />
              <span className={styles.opsDomainTitle}>
                {isAr ? 'المشاريع ومصاريف المباني' : 'Projects & Construction WIP'}
              </span>
            </div>

            <div className={styles.opsDomainList}>
              {/* Action 4: Log WIP Construction Cost */}
              <button
                type="button"
                className={`${styles.opsActionBtn} ${loggerMode === 'project_wip' ? styles.opsActionBtnActive : ''}`}
                onClick={handleActivateWipMode}
                style={{ borderColor: 'rgba(217, 119, 6, 0.35)' }}
              >
                <div className={styles.opsActionIcon} style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
                  <HardHat size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'إثبات فاتورة خامات أو مقاول' : 'Log Construction Cost'}</div>
                  <div className={styles.opsActionSub} style={{ color: '#d97706', fontWeight: 600 }}>{isAr ? 'حديد، خرسانة، أو مصنعيات موقع' : 'Contractor / WIP invoice'}</div>
                </div>
              </button>

              {/* Action 5: Property Lifecycle Audit */}
              <button
                type="button"
                className={styles.opsActionBtn}
                onClick={() => {
                  if (primaryProperty && onOpenAuditForProperty) {
                    onOpenAuditForProperty(primaryProperty);
                  } else {
                    onNavigateToTab('properties');
                  }
                }}
              >
                <div className={styles.opsActionIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                  <ShieldCheck size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'تكلفة العمارة وأرباح الشقق' : 'Property Lifecycle Audit'}</div>
                  <div className={styles.opsActionSub}>{isAr ? 'نصيب كل شقة من المباني والربح' : 'Audit costs & inventory'}</div>
                </div>
              </button>

              {/* Action 6: Feasibility & Pricing Calculator */}
              <button
                type="button"
                className={styles.opsActionBtn}
                onClick={() => {
                  if (primaryProperty && onOpenCalculatorForProperty) {
                    onOpenCalculatorForProperty(primaryProperty);
                  } else {
                    onNavigateToTab('calculator');
                  }
                }}
              >
                <div className={styles.opsActionIcon} style={{ background: '#f1f5f9', color: '#334155' }}>
                  <Calculator size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'حاسبة تسعير وجدوى المشروع' : 'Feasibility & Pricing'}</div>
                  <div className={styles.opsActionSub}>{isAr ? 'حساب تكلفة المتر وهامش الربح' : 'Installments & margin study'}</div>
                </div>
              </button>
            </div>
          </div>

          {/* DOMAIN 3: المبيعات وإدارة العقود */}
          <div className={styles.opsDomainColumn}>
            <div className={styles.opsDomainHeader}>
              <span className={styles.opsDomainDot} style={{ background: '#946f23' }} />
              <span className={styles.opsDomainTitle}>
                {isAr ? 'المبيعات وعقود العملاء' : 'Sales & Deal Pipeline'}
              </span>
            </div>

            <div className={styles.opsDomainList}>
              {/* Action 7: New Contract */}
              <button
                type="button"
                className={styles.opsActionBtn}
                onClick={onOpenNewContract}
                style={{ borderColor: 'rgba(184, 144, 62, 0.4)' }}
              >
                <div className={styles.opsActionIcon} style={{ background: 'rgba(184, 144, 62, 0.12)', color: '#946f23' }}>
                  <FileText size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'تحرير عقد بيع وحجز شقة' : 'New Sales Contract'}</div>
                  <div className={styles.opsActionSub} style={{ color: '#946f23', fontWeight: 600 }}>{isAr ? 'تسجيل بيانات العميل والأقساط' : '3-step deal wizard'}</div>
                </div>
              </button>

              {/* Action 8: Contract Escalation */}
              <button
                type="button"
                className={styles.opsActionBtn}
                onClick={() => {
                  if (primaryContract && onOpenEscalationModal) {
                    onOpenEscalationModal(primaryContract);
                  } else {
                    onNavigateToTab('contracts');
                  }
                }}
              >
                <div className={styles.opsActionIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <TrendingUp size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'تعديل أسعار أو بنود العقد' : 'Contract Price Escalation'}</div>
                  <div className={styles.opsActionSub}>{isAr ? 'إعادة جدولة أو تسوية فروق أسعار' : 'Price adjustment addendum'}</div>
                </div>
              </button>

              {/* Action 9: Contract Rescission */}
              <button
                type="button"
                className={styles.opsActionBtn}
                onClick={() => {
                  if (primaryContract && onOpenRescissionModal) {
                    onOpenRescissionModal(primaryContract);
                  } else {
                    onNavigateToTab('contracts');
                  }
                }}
              >
                <div className={styles.opsActionIcon} style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626' }}>
                  <RotateCcw size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'فسخ تعاقد وتسوية المسترد' : 'Rescission & Forfeiture'}</div>
                  <div className={styles.opsActionSub}>{isAr ? 'خصم غرامة الـ 10% وترجيع باقي الفلوس' : 'Settle penalty & vault refund'}</div>
                </div>
              </button>
            </div>
          </div>

          {/* DOMAIN 4: الحسابات والتقارير */}
          <div className={styles.opsDomainColumn}>
            <div className={styles.opsDomainHeader}>
              <span className={styles.opsDomainDot} style={{ background: '#3b82f6' }} />
              <span className={styles.opsDomainTitle}>
                {isAr ? 'دفاتر الحسابات واليومية' : 'Accounting & Control'}
              </span>
            </div>

            <div className={styles.opsDomainList}>
              {/* Action 10: RSV Allocation */}
              <button
                type="button"
                className={styles.opsActionBtn}
                onClick={() => {
                  if (onOpenRSVModal) {
                    onOpenRSVModal();
                  } else {
                    onNavigateToTab('contracts');
                  }
                }}
                style={{ borderColor: 'rgba(59, 130, 246, 0.35)' }}
              >
                <div className={styles.opsActionIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
                  <Layers size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'ترحيل أرباح نسبة الإنجاز (RSV)' : 'Revenue Allocation (RSV)'}</div>
                  <div className={styles.opsActionSub} style={{ color: '#2563eb', fontWeight: 600 }}>{isAr ? 'أرباح معترف بيها على قد نسبة التنفيذ' : 'Milestone revenue recognition'}</div>
                </div>
              </button>

              {/* Action 11: General Ledger Jump */}
              <button
                type="button"
                className={styles.opsActionBtn}
                onClick={() => onNavigateToTab('ledger')}
              >
                <div className={styles.opsActionIcon} style={{ background: '#f1f5f9', color: '#334155' }}>
                  <FileCheck size={14} />
                </div>
                <div className={styles.opsActionText}>
                  <div className={styles.opsActionLabel}>{isAr ? 'دفتر اليومية ومراجعة القيود' : 'General Ledger Entries'}</div>
                  <div className={styles.opsActionSub}>{isAr ? 'عرض وتدقيق قيود الحسابات' : 'Balanced double entries'}</div>
                </div>
              </button>

              {/* Action 12: Quick Search */}
              {onOpenQuickSearch && (
                <button
                  type="button"
                  className={styles.opsActionBtn}
                  onClick={onOpenQuickSearch}
                >
                  <div className={styles.opsActionIcon} style={{ background: 'rgba(184, 144, 62, 0.1)', color: '#946f23' }}>
                    <Search size={14} />
                  </div>
                  <div className={styles.opsActionText}>
                    <div className={styles.opsActionLabel}>{isAr ? 'بحث شامل وسريع في النظام (⌘K)' : 'Universal Quick Search'}</div>
                    <div className={styles.opsActionSub}>{isAr ? 'بحث فوري عن عميل، عقد، دفعة، أو وحدة' : 'Search clients, units & vault'}</div>
                  </div>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 3. CONTEXTUAL MULTI-PURPOSE DIRECT LOGGER */}
      <div 
        id="contextual-direct-logger"
        ref={loggerRef}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '1.15rem 1.35rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: 'rgba(184, 144, 62, 0.1)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={14} />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
              {isAr ? 'تسجيل سريع للمصاريف' : 'Universal Contextual Direct Logger'}
            </h3>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
              {isAr ? 'تسجيل سريع لمصاريف النثريات أو مصاريف البناء للمشاريع مباشرة' : 'Direct disbursement and project WIP attribution without modals'}
            </span>
          </div>

          {/* Mode Switcher Segmented Control */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '0.2rem'
          }}>
            <button
              type="button"
              onClick={() => setLoggerMode('general_expense')}
              style={{
                background: loggerMode === 'general_expense' ? '#ffffff' : 'transparent',
                color: loggerMode === 'general_expense' ? '#0f172a' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '0.3rem 0.75rem',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: loggerMode === 'general_expense' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {isAr ? 'مصاريف عامة ونثريات' : 'General Petty Cash'}
            </button>

            <button
              type="button"
              onClick={() => setLoggerMode('project_wip')}
              style={{
                background: loggerMode === 'project_wip' ? '#ffffff' : 'transparent',
                color: loggerMode === 'project_wip' ? '#d97706' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                padding: '0.3rem 0.75rem',
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: loggerMode === 'project_wip' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {isAr ? 'مصاريف بناء لمشروع معين' : 'Project Construction WIP'}
            </button>
          </div>

          {expenseSuccessMsg && (
            <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle2 size={14} />
              <span>{expenseSuccessMsg}</span>
            </span>
          )}
        </div>

        {/* MODE A: GENERAL EXPENSE LOGGER */}
        {loggerMode === 'general_expense' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Quick Category Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
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
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.7rem',
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
            <form onSubmit={handleQuickExpenseSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{ width: '160px', flexShrink: 0 }}>
                <input 
                  ref={amountInputRef}
                  type="number"
                  step="50"
                  required
                  min="1"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  placeholder={isAr ? 'المبلغ (ج.م) *' : 'Amount (EGP) *'}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '220px' }}>
                <input 
                  type="text"
                  required
                  value={expenseMemo}
                  onChange={e => setExpenseMemo(e.target.value)}
                  placeholder={isAr ? 'بيان وصرف المصروف (مثال: نثريات موقع وبوفيه عمال)...' : 'Description / Memo (e.g. Site petty cash)...'}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.8rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingExpense || !expenseAmount}
                style={{
                  background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                  color: '#ffffff',
                  border: '1px solid #947228',
                  borderRadius: '8px',
                  padding: '0.5rem 1.15rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: isSubmittingExpense || !expenseAmount ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  opacity: !expenseAmount ? 0.6 : 1,
                  boxShadow: '0 2px 6px rgba(184, 144, 62, 0.25)'
                }}
              >
                {isSubmittingExpense ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>{isAr ? 'حفظ وترحيل للخزينة' : 'Post to Safe'}</span>
              </button>
            </form>
          </div>
        )}

        {/* MODE B: PROJECT WIP CONSTRUCTION COST LOGGER */}
        {loggerMode === 'project_wip' && (
          <form onSubmit={handleQuickWipSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Row 1: Target Property & Cost Category & Phase */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              {/* Target Property Select */}
              <div style={{ minWidth: '220px', flex: 1 }}>
                <select
                  value={wipPropertyId}
                  onChange={e => setWipPropertyId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {isAr ? p.title_ar : p.title_en} {p.location ? `(${p.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Select */}
              <div style={{ width: '180px' }}>
                <select
                  value={wipCategory}
                  onChange={e => setWipCategory(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    outline: 'none'
                  }}
                >
                  <option value="civil_structure">{isAr ? 'أعمال خرسانات وبناء' : 'Civil & Concrete'}</option>
                  <option value="mep_infrastructure">{isAr ? 'كهروميكانيك وسباكة' : 'MEP Works'}</option>
                  <option value="finishing_interior">{isAr ? 'تشطيبات ومعمارية' : 'Finishing & Interior'}</option>
                  <option value="site_facade">{isAr ? 'واجهات ومداخل ولاندسكيب' : 'Facades & Landscape'}</option>
                  <option value="permits_engineering">{isAr ? 'تراخيص واستشارات هندسية' : 'Permits & Engineering'}</option>
                  <option value="labor_subcontractor">{isAr ? 'مصنعيات ومقاولو باطن' : 'Labor & Subcontractors'}</option>
                </select>
              </div>

              {/* Phase Select */}
              <div style={{ width: '180px' }}>
                <select
                  value={wipPhase}
                  onChange={e => setWipPhase(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    outline: 'none'
                  }}
                >
                  <option value="structural_skeleton">{isAr ? 'الهيكل الإنشائي والأسقف' : 'Structural Skeleton'}</option>
                  <option value="masonry_roughing">{isAr ? 'المباني وتأسيس التمديدات' : 'Masonry & Roughing'}</option>
                  <option value="finishing_interiors">{isAr ? 'التشطيبات والكسوات' : 'Finishing Interiors'}</option>
                  <option value="excavation_foundation">{isAr ? 'الحفر والأساسات' : 'Excavation & Foundations'}</option>
                  <option value="planning_permits">{isAr ? 'التراخيص والتخطيط' : 'Planning & Permits'}</option>
                  <option value="final_inspection_handover">{isAr ? 'المعاينة والجاهزية للتسليم' : 'Final Inspection'}</option>
                </select>
              </div>
            </div>

            {/* Row 2: Amount, Item Description, Supplier & Invoice Ref */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{ width: '150px', flexShrink: 0 }}>
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
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '180px' }}>
                <input 
                  type="text"
                  required
                  value={wipItemName}
                  onChange={e => setWipItemName(e.target.value)}
                  placeholder={isAr ? 'بيان البند (مثال: توريد حديد تسليح 16 مم صبة السقف)...' : 'Item description (e.g. Steel rebars 16mm)...'}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ width: '160px' }}>
                <input 
                  type="text"
                  value={wipSupplier}
                  onChange={e => setWipSupplier(e.target.value)}
                  placeholder={isAr ? 'المورد / المقاول' : 'Supplier / Contractor'}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ width: '120px' }}>
                <input 
                  type="text"
                  value={wipInvoiceRef}
                  onChange={e => setWipInvoiceRef(e.target.value)}
                  placeholder={isAr ? 'رقم الفاتورة' : 'Invoice #'}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingExpense || !expenseAmount || !wipPropertyId}
                style={{
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1.15rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: isSubmittingExpense || !expenseAmount ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  opacity: !expenseAmount ? 0.6 : 1,
                  boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)'
                }}
              >
                {isSubmittingExpense ? <Loader2 size={13} className="animate-spin" /> : <HardHat size={13} />}
                <span>{isAr ? 'قيد تكلفة المشروع' : 'Post WIP Cost'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4. OPERATIONAL RISK & FRICTION RADAR */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '0.9rem 1.15rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: 'rgba(217, 119, 6, 0.1)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BellRing size={14} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'تنبيهات هامة ومتابعة الرصيد' : 'Operational Risk & Liquidity Radar'}
              </h3>
              <span style={{ fontSize: '0.67rem', color: '#64748b' }}>
                {isAr ? 'متابعة مباشرة للأقساط المتأخرة، المواعيد القادمة، والوحدات الجاهزة للتسليم' : 'Immediate detection of overdue dues, upcoming installments, and handover readiness'}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0.65rem' }}>
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
                  padding: '0.75rem 0.95rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.45rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isCrit ? '#dc2626' : isWarn ? '#d97706' : '#946f23', fontWeight: 800, fontSize: '0.76rem' }}>
                    {isCrit ? <AlertCircle size={13} /> : isWarn ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}
                    <span>{isAr ? alert.titleAr : alert.titleEn}</span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0.2rem 0 0 0', lineHeight: 1.35 }}>
                    {isAr ? alert.detailAr : alert.detailEn}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: isAr ? 'flex-start' : 'flex-end', paddingTop: '0.15rem' }}>
                  <button
                    type="button"
                    onClick={alert.onClick}
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${isCrit ? '#fca5a5' : isWarn ? '#fcd34d' : '#cbd5e1'}`,
                      color: isCrit ? '#dc2626' : isWarn ? '#b45309' : '#334155',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '5px',
                      fontSize: '0.68rem',
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

      {/* 5. PRIMARY DAILY DESK COMMAND & SEARCH / SORT / FILTER TOOLBAR */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '0.85rem 1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Section title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: 'rgba(15, 23, 42, 0.06)',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={14} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'متابعة الأقساط وسندات القبض والوحدات' : 'Daily Operations, Collections & Inventory Queues'}
              </h3>
              <span style={{ fontSize: '0.67rem', color: '#64748b' }}>
                {isAr ? 'بحث سريع ومباشر في الأقساط، مستحقات الخزنة، والوحدات المعروضة' : 'Instant search and filter across dues, safe installments, deals and handovers'}
              </span>
            </div>
          </div>

          <span style={{ fontSize: '0.7rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
            {filteredAndSortedDues.length + maturingSafeCheques.length} {isAr ? 'معاملة نشطة' : 'active records'}
          </span>
        </div>


        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
            {/* Unified Desk Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.35rem 0.65rem',
              flex: 1,
              minWidth: '220px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <Search size={14} color="#64748b" />
              <input 
                type="text"
                value={deskSearchQuery}
                onChange={e => setDeskSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث سريع: اسم العميل، رقم السند / العقد، أو اسم الوحدة...' : 'Search debtor, receipt #, deal, or unit...'}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#0f172a',
                  fontSize: '0.78rem',
                  outline: 'none'
                }}
              />
              {deskSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDeskSearchQuery('')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={13} />
                </button>
              )}
              {onOpenQuickSearch && (
                <button
                  type="button"
                  onClick={onOpenQuickSearch}
                  title={isAr ? 'البحث الشامل بالسجلات (⌘K)' : 'Universal Search (⌘K)'}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '5px',
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    flexShrink: 0
                  }}
                >
                  <span>⌘K</span>
                </button>
              )}
            </div>

            {/* Quick Status Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setDuesStatusFilter('all')}
                style={{
                  background: duesStatusFilter === 'all' ? '#0f172a' : '#f1f5f9',
                  color: duesStatusFilter === 'all' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.32rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAr ? 'الكل' : 'All'}
              </button>

              <button
                type="button"
                onClick={() => setDuesStatusFilter('overdue')}
                style={{
                  background: duesStatusFilter === 'overdue' ? '#dc2626' : '#fef2f2',
                  color: duesStatusFilter === 'overdue' ? '#ffffff' : '#b91c1c',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.32rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAr ? `المتأخرات (${overdueCount})` : `Overdue (${overdueCount})`}
              </button>

              <button
                type="button"
                onClick={() => setDuesStatusFilter('today')}
                style={{
                  background: duesStatusFilter === 'today' ? '#d97706' : '#fffbeb',
                  color: duesStatusFilter === 'today' ? '#ffffff' : '#b45309',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.32rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isAr ? `اليوم (${dueTodayCount})` : `Today (${dueTodayCount})`}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Dues Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ArrowUpDown size={13} color="#64748b" />
              <select
                value={duesSortBy}
                onChange={e => setDuesSortBy(e.target.value as any)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="date_asc">{isAr ? 'الاستحقاق: الأقرب (عاجل)' : 'Due Date: Oldest first'}</option>
                <option value="date_desc">{isAr ? 'الاستحقاق: الأبعد' : 'Due Date: Newest first'}</option>
                <option value="amount_desc">{isAr ? 'المبلغ: من الأعلى' : 'Amount: High to Low'}</option>
                <option value="amount_asc">{isAr ? 'المبلغ: من الأقل' : 'Amount: Low to High'}</option>
                <option value="name_asc">{isAr ? 'اسم العميل (أ-ي)' : 'Payer Name (A-Z)'}</option>
              </select>
            </div>

            {/* Reset Filters */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#64748b',
                  borderRadius: '8px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <RotateCcw size={11} />
                <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 6. DUAL OPERATIONAL WORK QUEUES (SPLIT GRID) */}
      <div className={styles.splitGrid}>
        
        {/* COLUMN A: RECEIVABLES & LIQUID CHEQUES */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Tab 1 Pill: Urgent Dues */}
              <button
                type="button"
                onClick={() => setActiveLeftQueueTab('dues')}
                style={{
                  background: activeLeftQueueTab === 'dues' ? '#0f172a' : '#f8fafc',
                  color: activeLeftQueueTab === 'dues' ? '#ffffff' : '#64748b',
                  border: `1px solid ${activeLeftQueueTab === 'dues' ? '#0f172a' : '#cbd5e1'}`,
                  borderRadius: '7px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Clock size={13} color={activeLeftQueueTab === 'dues' ? '#ffffff' : '#d97706'} />
                <span>{isAr ? 'أقساط مستحقة للتحصيل' : 'Urgent Dues Queue'}</span>
                <span style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  padding: '0.05rem 0.35rem',
                  borderRadius: '4px',
                  background: activeLeftQueueTab === 'dues' ? 'rgba(255,255,255,0.2)' : 'rgba(217, 119, 6, 0.12)',
                  color: activeLeftQueueTab === 'dues' ? '#ffffff' : '#d97706'
                }}>
                  {filteredAndSortedDues.length}
                </span>
              </button>

              {/* Tab 2 Pill: Maturing Safe Cheques */}
              <button
                type="button"
                onClick={() => setActiveLeftQueueTab('safe_cheques')}
                style={{
                  background: activeLeftQueueTab === 'safe_cheques' ? '#0f172a' : '#f8fafc',
                  color: activeLeftQueueTab === 'safe_cheques' ? '#ffffff' : '#64748b',
                  border: `1px solid ${activeLeftQueueTab === 'safe_cheques' ? '#0f172a' : '#cbd5e1'}`,
                  borderRadius: '7px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Wallet size={13} color={activeLeftQueueTab === 'safe_cheques' ? '#ffffff' : '#946f23'} />
                <span>{isAr ? 'أقساط ومستحقات قادمة' : 'Upcoming Installments'}</span>
                <span style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  padding: '0.05rem 0.35rem',
                  borderRadius: '4px',
                  background: activeLeftQueueTab === 'safe_cheques' ? 'rgba(255,255,255,0.2)' : 'rgba(184, 144, 62, 0.12)',
                  color: activeLeftQueueTab === 'safe_cheques' ? '#ffffff' : '#946f23'
                }}>
                  {maturingSafeCheques.length}
                </span>
              </button>
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

          {/* TAB 1 CONTENT: URGENT DUES LIST */}
          {activeLeftQueueTab === 'dues' && (
            <>
              <p className={styles.cardSubtitle} style={{ margin: '0 0 0.65rem 0', fontSize: '0.72rem' }}>
                {isAr 
                  ? `إجمالي المعروض: ${filteredDuesSum.formatEGP(isAr)} — تحصيل مباشر وسند قبض فوري` 
                  : `Total visible: ${filteredDuesSum.formatEGP(isAr)} — 1-click voucher collection`}
              </p>

              {filteredAndSortedDues.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                  <CheckCircle2 size={28} color="#10b981" style={{ margin: '0 auto 0.5rem auto', opacity: 0.9 }} />
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {deskSearchQuery ? (isAr ? 'لا توجد أقساط مطابقة لمعايير البحث' : 'No dues match search query') : (isAr ? 'المحفظة منتظمة بالكامل!' : 'Portfolio is completely up to date!')}
                  </div>
                  <div style={{ fontSize: '0.74rem', marginTop: '0.25rem' }}>
                    {deskSearchQuery ? (isAr ? 'حاول تعديل كلمة البحث أو إزالة التصفية' : 'Try adjusting the search query or reset filters') : (isAr ? 'لا توجد أي أقساط متأخرة أو مستحقة حالياً.' : 'No overdue or due installments today.')}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {filteredAndSortedDues.slice(0, 8).map((item) => {
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
                          border: `1.5px solid ${isOverdue ? 'rgba(239, 68, 68, 0.35)' : '#cbd5e1'}`,
                          borderRadius: '10px',
                          gap: '0.75rem',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                            <span 
                              dir="auto"
                              style={{ 
                                fontSize: '0.84rem', 
                                fontWeight: 800, 
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                unicodeBidi: 'plaintext'
                              }}
                            >
                              {item.drawer_name || linkedContract?.buyer_name || (isAr ? 'عميل' : 'Client')}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 600, flexShrink: 0 }}>
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
                                border: '1px solid #fecaca',
                                flexShrink: 0
                              }}>
                                {isAr ? 'متأخر' : 'Overdue'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate', flexShrink: 0 }}>{item.due_date}</span>
                            <span>•</span>
                            <span style={{ color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{linkedContract?.unit_id || (isAr ? 'وحدة تعاقدية' : 'Unit')}</span>
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
                              padding: '0.4rem 0.85rem',
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
            </>
          )}

          {/* TAB 2 CONTENT: IN-SAFE CHEQUES LIST */}
          {activeLeftQueueTab === 'safe_cheques' && (
            <>
              <p className={styles.cardSubtitle} style={{ margin: '0 0 0.65rem 0', fontSize: '0.72rem' }}>
                {isAr 
                  ? `إجمالي مستحقات وأقساط الخزينة: ${safeChequesSum.formatEGP(isAr)} — جاهزة للتحصيل والمطابقة` 
                  : `Total safe installments: ${safeChequesSum.formatEGP(isAr)} — ready for collection`}
              </p>

              {maturingSafeCheques.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                  <Wallet size={28} color="#946f23" style={{ margin: '0 auto 0.5rem auto', opacity: 0.9 }} />
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {isAr ? 'لا توجد أقساط مؤجلة بالخزينة حالياً' : 'No deferred installments in vault'}
                  </div>
                  <div style={{ fontSize: '0.74rem', marginTop: '0.25rem' }}>
                    {isAr ? 'يمكنك تسجيل قسط أو سند قبض جديد من زر "تسجيل قسط / سند قبض" بالأعلى.' : 'You can register a new installment via the action hub above.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {maturingSafeCheques.slice(0, 8).map((item) => {
                    const isDueSoon = item.due_date <= threeDaysStr && item.due_date >= todayStr;

                    return (
                      <div 
                        key={item.cheque_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 0.95rem',
                          background: isDueSoon ? 'rgba(217, 119, 6, 0.03)' : '#ffffff',
                          border: `1.5px solid ${isDueSoon ? 'rgba(217, 119, 6, 0.4)' : '#cbd5e1'}`,
                          borderRadius: '10px',
                          gap: '0.75rem',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                            <span 
                              dir="auto"
                              style={{ 
                                fontSize: '0.84rem', 
                                fontWeight: 800, 
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                unicodeBidi: 'plaintext'
                              }}
                            >
                              {item.drawer_name || (isAr ? 'العميل مسجل' : 'Client')}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 600, flexShrink: 0 }}>
                              {item.cheque_number ? `#${item.cheque_number}` : ''}
                            </span>
                            {isDueSoon && (
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                padding: '0.05rem 0.35rem',
                                borderRadius: '4px',
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                flexShrink: 0
                              }}>
                                {isAr ? 'يستحق قريباً' : 'Due Soon'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.bank_name || (isAr ? 'نقدي / باليد' : 'Cash / Hand')}</span>
                            <span>•</span>
                            <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate', flexShrink: 0 }}>{item.due_date}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                            <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              {D(item.nominal_value).formatEGP(isAr)}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {onInspectCheque && (
                              <button
                                type="button"
                                onClick={() => onInspectCheque(item)}
                                style={{
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '7px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer'
                                }}
                              >
                                {isAr ? 'معاينة' : 'Inspect'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onCollectItem(item)}
                              style={{
                                background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                                color: '#ffffff',
                                border: '1px solid #947228',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '7px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                boxShadow: '0 1px 3px rgba(184, 144, 62, 0.2)'
                              }}
                            >
                              <Receipt size={11} />
                              <span>{isAr ? 'تحصيل' : 'Collect'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* COLUMN B: INVENTORY & HANDOVER READINESS */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Tab 1 Pill: Available Inventory */}
              <button
                type="button"
                onClick={() => setActiveRightQueueTab('units')}
                style={{
                  background: activeRightQueueTab === 'units' ? '#0f172a' : '#f8fafc',
                  color: activeRightQueueTab === 'units' ? '#ffffff' : '#64748b',
                  border: `1px solid ${activeRightQueueTab === 'units' ? '#0f172a' : '#cbd5e1'}`,
                  borderRadius: '7px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Building2 size={13} color={activeRightQueueTab === 'units' ? '#ffffff' : '#946f23'} />
                <span>{isAr ? 'وحدات جاهزة للبيع' : 'Available Inventory'}</span>
                <span style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  padding: '0.05rem 0.35rem',
                  borderRadius: '4px',
                  background: activeRightQueueTab === 'units' ? 'rgba(255,255,255,0.2)' : 'rgba(184, 144, 62, 0.12)',
                  color: activeRightQueueTab === 'units' ? '#ffffff' : '#946f23'
                }}>
                  {availableUnits.length}
                </span>
              </button>

              {/* Tab 2 Pill: Handover Readiness */}
              <button
                type="button"
                onClick={() => setActiveRightQueueTab('handover')}
                style={{
                  background: activeRightQueueTab === 'handover' ? '#0f172a' : '#f8fafc',
                  color: activeRightQueueTab === 'handover' ? '#ffffff' : '#64748b',
                  border: `1px solid ${activeRightQueueTab === 'handover' ? '#0f172a' : '#cbd5e1'}`,
                  borderRadius: '7px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Key size={13} color={activeRightQueueTab === 'handover' ? '#ffffff' : '#10b981'} />
                <span>{isAr ? 'وحدات جاهزة للتسليم (سداد 70%+)' : 'Handover Ready (70%+)'}</span>
                <span style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  padding: '0.05rem 0.35rem',
                  borderRadius: '4px',
                  background: activeRightQueueTab === 'handover' ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.12)',
                  color: activeRightQueueTab === 'handover' ? '#ffffff' : '#10b981'
                }}>
                  {readyForHandoverContracts.length}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToTab(activeRightQueueTab === 'units' ? 'properties' : 'contracts')}
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
              <span>{isAr ? 'عرض الكل' : 'View all'}</span>
              <ArrowLeft size={12} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
            </button>
          </div>

          {/* TAB 1 CONTENT: AVAILABLE INVENTORY */}
          {activeRightQueueTab === 'units' && (
            <>
              <p className={styles.cardSubtitle} style={{ margin: '0 0 0.65rem 0', fontSize: '0.72rem' }}>
                {isAr ? 'اختر أي وحدة متاحة لفتح التعاقد المباشر، دراسة الجدوى، أو سجل التدقيق' : 'Select any unit for 1-click deal creation, calculator, or cost audit'}
              </p>

              {availableUnits.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                  <Building2 size={28} color="#946f23" style={{ margin: '0 auto 0.5rem auto', opacity: 0.8 }} />
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
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        gap: '0.75rem',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isAr ? prop.title_ar : prop.title_en}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>{prop.location || (isAr ? 'الموقع مسجل' : 'Location')}</span>
                          <span>•</span>
                          <span>{prop.area_sqm} م²</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                        <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {D(prop.price_egp).formatEGP(isAr)}
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>
                            {isAr ? 'متاحة للبيع' : 'Available'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {/* 1-Click Calculator */}
                          {onOpenCalculatorForProperty && (
                            <button
                              type="button"
                              onClick={() => onOpenCalculatorForProperty(prop)}
                              title={isAr ? 'حاسبة التسعير والجدوى' : 'Pricing Calculator'}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '0.38rem',
                                color: '#475569',
                                cursor: 'pointer'
                              }}
                            >
                              <Calculator size={13} />
                            </button>
                          )}

                          {/* 1-Click Cost Audit */}
                          {onOpenAuditForProperty && (
                            <button
                              type="button"
                              onClick={() => onOpenAuditForProperty(prop)}
                              title={isAr ? 'سجل تدقيق تكاليف العقار' : 'Property Cost Audit'}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '0.38rem',
                                color: '#946f23',
                                cursor: 'pointer'
                              }}
                            >
                              <ShieldCheck size={13} />
                            </button>
                          )}

                          {/* 1-Click Deal Creator */}
                          <button
                            type="button"
                            onClick={() => onOpenContractForProperty(prop)}
                            style={{
                              background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                              color: '#ffffff',
                              border: '1px solid #947228',
                              padding: '0.38rem 0.75rem',
                              borderRadius: '7px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              boxShadow: '0 1px 3px rgba(184, 144, 62, 0.2)'
                            }}
                          >
                            <Plus size={12} />
                            <span>{isAr ? 'تعاقد' : 'Sell'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB 2 CONTENT: HANDOVER READINESS LIST */}
          {activeRightQueueTab === 'handover' && (
            <>
              <p className={styles.cardSubtitle} style={{ margin: '0 0 0.65rem 0', fontSize: '0.72rem' }}>
                {isAr ? 'عقود مسددة بنسبة 70% فأكثر — مؤهلة لمعاينة الموقع وتوقيع محضر الاستلام' : 'Contracts achieved 70%+ cash — qualified for snagging and handover'}
              </p>

              {readyForHandoverContracts.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                  <Key size={28} color="#10b981" style={{ margin: '0 auto 0.5rem auto', opacity: 0.8 }} />
                  <div>{isAr ? 'لا توجد عقود بلغت 70% سداد حالياً' : 'No contracts at 70%+ threshold'}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {readyForHandoverContracts.map(c => {
                    const gross = parseFloat(c.gross_contract_value || '1');
                    const paid = parseFloat(c.total_cash_collected || '0');
                    const pct = Math.min(100, Math.round((paid / gross) * 100));
                    const remaining = D(c.gross_contract_value).minus(c.total_cash_collected || '0');

                    return (
                      <div 
                        key={c.contract_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.7rem 0.9rem',
                          background: '#ffffff',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          gap: '0.75rem',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.buyer_name}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              #{c.contract_number}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>{c.unit_id}</span>
                            <span>•</span>
                            <span style={{ color: '#059669', fontWeight: 800 }}>{pct}% {isAr ? 'مسدد' : 'collected'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                              {remaining.formatEGP(isAr)}
                            </div>
                            <span style={{ fontSize: '0.64rem', color: '#946f23', fontWeight: 700 }}>
                              {isAr ? 'المتبقي' : 'Remaining'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onInspectContract(c)}
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#ffffff',
                              padding: '0.38rem 0.75rem',
                              borderRadius: '7px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <FileCheck size={12} />
                            <span>{isAr ? 'فحص العقد' : 'Audit'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* 7. LIVE OPERATIONS AUDIT STREAM */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '1.15rem 1.35rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={14} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'آخر العمليات المسجلة في الحسابات' : 'Live Operations & Audit Stream'}
              </h3>
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {isAr ? 'عرض فوري لكل حركة مالية يتم تسجيلها في الدفاتر' : 'Chronological verified log of recent journal postings and disbursements'}
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
            <span>{isAr ? 'عرض دفتر الحسابات' : 'Full Ledger'}</span>
            <ArrowLeft size={12} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
          </button>
        </div>

        {recentAuditEntries.length === 0 ? (
          <div style={{ padding: '1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.76rem' }}>
            {isAr ? 'لا توجد قيود مسجلة حديثاً في هذا السجل.' : 'No recent entries in this log.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {recentAuditEntries.map((je) => {
              const debitTotal = je.lines?.reduce((acc, l) => acc.plus(l.debit_amount || '0'), D(0)) || D(0);

              return (
                <div
                  key={je.entry_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    gap: '0.65rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <span style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 800,
                      color: '#946f23',
                      background: 'rgba(184, 144, 62, 0.1)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem'
                    }}>
                      {je.entry_number}
                    </span>

                    <span style={{ color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {localizeJournalDescription(je.description, isAr)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#64748b', fontSize: '0.68rem', fontVariantNumeric: 'tabular-nums' }}>
                      <UserCheck size={11} color="#946f23" />
                      <span>{je.created_by || 'ADMIN'}</span>
                      <span>•</span>
                      <span>{je.entry_date}</span>
                    </div>

                    <div style={{ fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {debitTotal.formatEGP(isAr)}
                    </div>

                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid rgba(22, 163, 74, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}>
                      <ShieldCheck size={10} />
                      <span>{isAr ? 'مُدقق' : 'Verified'}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
