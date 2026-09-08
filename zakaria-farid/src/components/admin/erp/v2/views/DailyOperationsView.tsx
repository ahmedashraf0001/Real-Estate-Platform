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
  ArrowDownLeft,
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
  FileCheck,
  Paintbrush,
  Hammer,
  Smartphone,
  Info,
  Landmark,
  Users
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
import { ZFCustomSelect, ZFCustomSelectItem } from '../common/ZFCustomSelect';
import { ZFPagination } from '../ZFPagination';
import { toast } from 'sonner';
import { tafqeetEGP } from '@/lib/erp/tafqeet';

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
  onDirectExpenseSubmit?: (amount: string, categoryAccount: string, memo: string, creditAccount?: string) => Promise<void>;
  onOpenPartnerOperations?: () => void;
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
  onOpenPartnerOperations,
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

  // Unified Workbench Tab State
  type WorkbenchTab = 'urgent_dues' | 'upcoming_dues' | 'available_units' | 'handover_ready' | 'recent_expenses' | 'audit_stream';
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<WorkbenchTab>('urgent_dues');

  // Workbench Pagination State
  const [workbenchPage, setWorkbenchPage] = useState(1);
  const [workbenchPageSize, setWorkbenchPageSize] = useState(8);

  // Reset workbench page to 1 when changing tabs or search filters
  React.useEffect(() => {
    setWorkbenchPage(1);
  }, [activeWorkbenchTab, deskSearchQuery, duesStatusFilter, duesSortBy]);

  // Contextual Direct Logger State (Unified Real Estate Project Cost Logger)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expensePaymentSource, setExpensePaymentSource] = useState<'101000' | '102000' | '201000'>('101000');
  const [hoveredPaymentTooltip, setHoveredPaymentTooltip] = useState<'101000' | '102000' | '201000' | null>(null);
  const [wipPropertyId, setWipPropertyId] = useState('');
  const [wipCategory, setWipCategory] = useState<PropertyCostCategory>('civil_structure');
  const [wipPhase, setWipPhase] = useState<PropertyLifecyclePhase>('structural_skeleton');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [wipItemName, setWipItemName] = useState('');
  const [wipSupplier, setWipSupplier] = useState('');
  const [wipInvoiceRef, setWipInvoiceRef] = useState('');
  const [wipQuantity, setWipQuantity] = useState('1');
  const [wipUnit, setWipUnit] = useState('مقطوعية');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState('');
  const [expensePropertyError, setExpensePropertyError] = useState('');

  // Under-Construction Real Estate Projects (off_plan or development buildings)
  const underConstructionProperties = useMemo(() => {
    const active = (properties || []).filter(p => 
      p.completion_status === 'off_plan' || 
      p.type === 'building' || 
      (p.building_units && p.building_units.some(u => u.status !== 'contracted'))
    );
    return active.length > 0 ? active : properties;
  }, [properties]);

  // Sync default target property to first under-construction project
  React.useEffect(() => {
    if (!wipPropertyId && underConstructionProperties.length > 0) {
      setWipPropertyId(underConstructionProperties[0].id);
    }
  }, [underConstructionProperties, wipPropertyId]);

  // 0. Unified Dues: Combine PDC records with any pending installment schedules that lack a PDC
  const allDuesRecords = useMemo(() => {
    const map = new Map<string, ERPPDCRecord>();
    (pdcRecords || []).forEach(p => {
      map.set(p.cheque_id, p);
    });

    (schedules || []).forEach(s => {
      if (s.status === 'Pending') {
        const alreadyHas = Array.from(map.values()).some(p => 
          p.schedule_id === s.schedule_id || 
          (p.contract_id === s.contract_id && p.due_date === s.due_date)
        );
        if (!alreadyHas) {
          const ct = contracts.find(c => c.contract_id === s.contract_id);
          const numDigits = ct?.contract_number ? ct.contract_number.replace(/\D/g, '') : '789';
          const newPdc: ERPPDCRecord = {
            cheque_id: s.schedule_id,
            contract_id: s.contract_id,
            schedule_id: s.schedule_id,
            cheque_number: `SND-${numDigits}-T${s.tranche_number}`,
            bank_name: 'الخزينة الرئيسية (أمانات نقداً باليد - 101000)',
            drawer_name: ct?.buyer_name || 'العميل المتعاقد',
            nominal_value: s.nominal_value,
            due_date: s.due_date,
            status: 'In Safe'
          };
          map.set(s.schedule_id, newPdc);
        }
      }
    });
    return Array.from(map.values());
  }, [pdcRecords, schedules, contracts]);

  const { urgentDues, dueTodayCount, dueTodaySum, dueWeekSum, overdueCount, overdueSum } = useMemo(() => {
    let todaySum = D(0);
    let todayCnt = 0;
    let weekSum = D(0);
    let odSum = D(0);
    let odCnt = 0;

    const dues = allDuesRecords
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
  }, [allDuesRecords, todayStr, weekStr]);

  // Executive Liquidity Breakdown: Account 101000 (Safe) + Account 102000 (Bank)
  const liquidBalances = useMemo(() => {
    let safeCash = D(0);
    let bankCash = D(0);
    
    if (journalEntries && journalEntries.length > 0) {
      journalEntries.forEach(entry => {
        (entry.lines || []).forEach(line => {
          if (line.account_code === '101000') {
            safeCash = safeCash.plus(line.debit_amount || '0').minus(line.credit_amount || '0');
          } else if (line.account_code === '102000') {
            bankCash = bankCash.plus(line.debit_amount || '0').minus(line.credit_amount || '0');
          }
        });
      });
    }
    
    const totalLiquid = safeCash.plus(bankCash).gt(0) 
      ? safeCash.plus(bankCash) 
      : D(kpis.cashBank || '0');

    return {
      safeCash,
      bankCash,
      totalLiquid
    };
  }, [journalEntries, kpis.cashBank]);

  // 1. Dynamic Daily Operational Metrics (Today's Direct Cash Movements & Pending Dues)
  const {
    todayCollectionsSum,
    todayCollectionsCount,
    todayDisbursementsSum,
    todayDisbursementsCount,
    todayNetFlow,
    todayPendingDueSum,
    todayPendingDueCount
  } = useMemo(() => {
    let inSum = D(0);
    let inCount = 0;
    let outSum = D(0);
    let outCount = 0;

    // Direct Cash Inflows and Outflows from Journal Entries for Today
    (journalEntries || []).forEach(entry => {
      const isToday = entry.entry_date === todayStr || (entry.created_at && entry.created_at.startsWith(todayStr));
      if (isToday) {
        let hadDebit = false;
        let hadCredit = false;

        (entry.lines || []).forEach(line => {
          if (line.account_code === '101000' || line.account_code === '102000') {
            const deb = D(line.debit_amount || '0');
            const cred = D(line.credit_amount || '0');
            if (deb.gt(0)) {
              inSum = inSum.plus(deb);
              hadDebit = true;
            }
            if (cred.gt(0)) {
              outSum = outSum.plus(cred);
              hadCredit = true;
            }
          }
        });

        if (hadDebit) inCount++;
        if (hadCredit) outCount++;
      }
    });

    // Also factor in property costs logged today (in case payment source is safe or bank)
    (propertyCosts || []).forEach(cost => {
      const isToday = cost.logged_date === todayStr || (cost.created_at && cost.created_at.startsWith(todayStr));
      const isLiquidPayment = cost.linked_account_code === '101000' || cost.linked_account_code === '102000';
      if (isToday && isLiquidPayment) {
        const alreadyCounted = (journalEntries || []).some(
          je => (je.entry_date === todayStr || (je.created_at && je.created_at.startsWith(todayStr))) &&
                (je.description?.includes(cost.item_id) || je.description?.includes(cost.invoice_ref || '---'))
        );
        if (!alreadyCounted) {
          outSum = outSum.plus(cost.total_cost_egp || '0');
          outCount++;
        }
      }
    });

    // Pending Dues maturing today that are not yet collected
    let pendingDueSum = D(0);
    let pendingDueCount = 0;
    (pdcRecords || []).forEach(p => {
      if (p.status !== 'Cleared' && p.status !== 'Void' && p.due_date === todayStr) {
        pendingDueSum = pendingDueSum.plus(p.nominal_value || '0');
        pendingDueCount++;
      }
    });

    return {
      todayCollectionsSum: inSum,
      todayCollectionsCount: inCount,
      todayDisbursementsSum: outSum,
      todayDisbursementsCount: outCount,
      todayNetFlow: inSum.minus(outSum),
      todayPendingDueSum: pendingDueSum,
      todayPendingDueCount: pendingDueCount
    };
  }, [journalEntries, propertyCosts, pdcRecords, todayStr]);

  // 2. Operational Risk & Friction Radar Alerts (High-Context Debtor Specifics)
  const operationalAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      severity: 'critical' | 'warning' | 'info';
      badgeLabelAr?: string;
      badgeLabelEn?: string;
      titleAr: string;
      titleEn: string;
      debtorName?: string;
      unitDetail?: string;
      amountFormatted?: string;
      secondaryNoteAr?: string;
      secondaryNoteEn?: string;
      actionLabelAr: string;
      actionLabelEn: string;
      onClick: () => void;
    }> = [];

    // Overdue items
    const overdueList = allDuesRecords.filter(p => p.status !== 'Cleared' && p.status !== 'Void' && p.due_date < todayStr);
    if (overdueList.length > 0) {
      const topOverdue = overdueList[0];
      const linkedContract = contracts.find(c => c.contract_id === topOverdue.contract_id);
      const totalOverdueSum = overdueList.reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0));
      const daysOverdue = Math.max(1, Math.floor((Date.now() - new Date(topOverdue.due_date).getTime()) / 86400000));
      const debtor = topOverdue.drawer_name || linkedContract?.buyer_name || (isAr ? 'عميل مسجل' : 'Client');
      const unit = linkedContract?.unit_id || (isAr ? 'وحدة تعاقدية' : 'Unit');

      alerts.push({
        id: 'overdue-dues',
        severity: 'critical',
        badgeLabelAr: `متأخر منذ ${daysOverdue} يوم`,
        badgeLabelEn: `${daysOverdue}d overdue`,
        titleAr: `متأخرات تحصيل حرجة: ${debtor}`,
        titleEn: `Critical Overdue: ${debtor}`,
        debtorName: debtor,
        unitDetail: `${unit}${linkedContract ? ` • عقد #${linkedContract.contract_number}` : ''}`,
        amountFormatted: D(topOverdue.nominal_value).formatEGP(isAr),
        secondaryNoteAr: overdueList.length > 1 
          ? `+ ${overdueList.length - 1} أقساط أخرى متأخرة (إجمالي ${totalOverdueSum.formatEGP(true)})` 
          : `استحقاق ${topOverdue.due_date} — يتطلب سرعة التواصل والتحصيل المباشر`,
        secondaryNoteEn: overdueList.length > 1 
          ? `+ ${overdueList.length - 1} more overdue (Total ${totalOverdueSum.formatEGP(false)})` 
          : `Due ${topOverdue.due_date}`,
        actionLabelAr: 'تحصيل القسط فوراً',
        actionLabelEn: 'Collect Installment',
        onClick: () => onCollectItem(topOverdue)
      });
    }

    // In-safe cheques maturing within 72 hours
    const nearSafeCheques = allDuesRecords.filter(p => 
      p.status === 'In Safe' && 
      p.due_date >= todayStr && 
      p.due_date <= threeDaysStr
    );
    if (nearSafeCheques.length > 0) {
      const topNear = nearSafeCheques[0];
      const linkedContract = contracts.find(c => c.contract_id === topNear.contract_id);
      const totalNearSum = nearSafeCheques.reduce((acc, p) => acc.plus(p.nominal_value || '0'), D(0));
      const debtor = topNear.drawer_name || linkedContract?.buyer_name || (isAr ? 'عميل مسجل' : 'Client');
      const unit = linkedContract?.unit_id || (isAr ? 'وحدة تعاقدية' : 'Unit');

      alerts.push({
        id: 'safe-cheques-near',
        severity: 'warning',
        badgeLabelAr: topNear.due_date === todayStr ? 'يستحق اليوم' : 'خلال 48-72 ساعة',
        badgeLabelEn: topNear.due_date === todayStr ? 'Due Today' : 'Within 48-72h',
        titleAr: `أقساط تقترب من الاستحقاق: ${debtor}`,
        titleEn: `Approaching Maturity: ${debtor}`,
        debtorName: debtor,
        unitDetail: `${unit} • استحقاق ${topNear.due_date}`,
        amountFormatted: D(topNear.nominal_value).formatEGP(isAr),
        secondaryNoteAr: nearSafeCheques.length > 1 
          ? `+ ${nearSafeCheques.length - 1} أقساط قادمة بالخزينة (إجمالي ${totalNearSum.formatEGP(true)})` 
          : 'جاهز للإيداع بالخزينة أو التحويل عبر إنستاباي',
        secondaryNoteEn: nearSafeCheques.length > 1 
          ? `+ ${nearSafeCheques.length - 1} more upcoming (Total ${totalNearSum.formatEGP(false)})` 
          : 'Ready for cash or InstaPay collection',
        actionLabelAr: 'تحصيل القسط',
        actionLabelEn: 'Collect Due',
        onClick: () => onCollectItem(topNear)
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
      const topReady = readyForHandover[0];
      const gross = parseFloat(topReady.gross_contract_value || '1');
      const paid = parseFloat(topReady.total_cash_collected || '0');
      const pct = Math.min(100, Math.round((paid / gross) * 100));

      alerts.push({
        id: 'handover-audit',
        severity: 'info',
        badgeLabelAr: `${pct}% مسدد`,
        badgeLabelEn: `${pct}% Paid`,
        titleAr: `جاهزية تسليم: ${topReady.buyer_name}`,
        titleEn: `Handover Ready: ${topReady.buyer_name}`,
        debtorName: topReady.buyer_name,
        unitDetail: `${topReady.unit_id} • عقد #${topReady.contract_number}`,
        amountFormatted: D(topReady.total_cash_collected).formatEGP(isAr),
        secondaryNoteAr: readyForHandover.length > 1 
          ? `+ ${readyForHandover.length - 1} عقود أخرى مؤهلة للتسليم وإجراء محاضر الاستلام` 
          : 'الوحدة مؤهلة للمعاينة الميدانية وإصدار محضر الاستلام واعتراف الإيراد',
        secondaryNoteEn: readyForHandover.length > 1 
          ? `+ ${readyForHandover.length - 1} more units ready for handover` 
          : 'Unit qualified for physical handover and revenue recognition',
        actionLabelAr: 'فحص العقد وبدء التسليم',
        actionLabelEn: 'Start Handover',
        onClick: () => onInspectContract(topReady)
      });
    }

    return alerts;
  }, [pdcRecords, contracts, todayStr, threeDaysStr, onCollectItem, onInspectContract, isAr]);

  // 3. Filtered & Sorted Dues for the Collection Queue
  const filteredAndSortedDues = useMemo(() => {
    let dues = allDuesRecords.filter(p => p.status !== 'Cleared' && p.status !== 'Void');

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
  }, [allDuesRecords, duesStatusFilter, deskSearchQuery, duesSortBy, todayStr, contracts]);

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
  const filteredAvailableUnits = useMemo(() => {
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
      });
  }, [properties, contracts, deskSearchQuery, isAr]);

  const availableUnits = filteredAvailableUnits;

  // 6. Contracts Ready for Handover Protocol
  const filteredReadyContracts = useMemo(() => {
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

    return list;
  }, [contracts, deskSearchQuery]);

  const readyForHandoverContracts = filteredReadyContracts;

  // 7. Recent WIP Expenses & Materials
  const filteredPropertyCosts = useMemo(() => {
    let list = [...(propertyCosts || [])];
    if (deskSearchQuery.trim()) {
      const q = deskSearchQuery.toLowerCase().trim();
      list = list.filter(c => {
        const name = (c.item_name_ar || c.item_name_en || '').toLowerCase();
        const supplier = (c.supplier_contractor || '').toLowerCase();
        const inv = (c.invoice_ref || '').toLowerCase();
        const prop = properties.find(p => p.id === c.property_id);
        const propTitle = (prop?.title_ar || prop?.title_en || '').toLowerCase();
        return name.includes(q) || supplier.includes(q) || inv.includes(q) || propTitle.includes(q);
      });
    }
    return list;
  }, [propertyCosts, deskSearchQuery, properties]);

  const recentPropertyCosts = filteredPropertyCosts;

  // 1. Target Property Items for ZFCustomSelect (Filtered to Under-Construction Projects)
  const propertySelectItems: ZFCustomSelectItem[] = useMemo(() => {
    return underConstructionProperties.map(p => {
      const isOffPlan = p.completion_status === 'off_plan';
      const isBuilding = p.type === 'building';
      const unitsCount = p.building_units?.length || p.total_units_count;

      const sublabelAr = [
        p.location || (isAr ? 'الموقع مسجل' : 'Location recorded'),
        p.area_sqm ? `${p.area_sqm} م²` : null,
        unitsCount ? `${unitsCount} وحدات` : null
      ].filter(Boolean).join(' • ');

      const sublabelEn = [
        p.location || 'Location recorded',
        p.area_sqm ? `${p.area_sqm} sqm` : null,
        unitsCount ? `${unitsCount} units` : null
      ].filter(Boolean).join(' • ');

      return {
        value: p.id,
        labelAr: p.title_ar,
        labelEn: p.title_en,
        sublabelAr,
        sublabelEn,
        badge: isOffPlan ? (isAr ? 'تحت الإنشاء' : 'Under Construction') : (isAr ? 'قيد التطوير' : 'In Development'),
        badgeColor: isOffPlan ? '#fef3c7' : '#dbeafe',
        icon: isOffPlan ? HardHat : Building2,
        iconColor: isOffPlan ? '#b45309' : '#1d4ed8',
        iconBg: isOffPlan ? '#fef3c7' : '#dbeafe',
      };
    });
  }, [underConstructionProperties, isAr]);

  // 2. Cost Category Items for ZFCustomSelect (Everyday Egyptian Arabic)
  const categorySelectItems: ZFCustomSelectItem[] = useMemo(() => {
    return [
      {
        value: 'civil_structure',
        labelAr: 'حديد وأسمنت وخرسانة ومباني',
        labelEn: 'Civil Structure & Concrete',
        sublabelAr: 'حديد تسليح، أسمنت، خرسانة جاهزة، طوب، رمل وسن وخشب',
        sublabelEn: 'Rebar, cement, ready-mix, brick, sand, timber',
        icon: HardHat,
        iconColor: '#d97706',
        iconBg: '#fef3c7',
      },
      {
        value: 'mep_infrastructure',
        labelAr: 'سباكة وكهرباء وتأسيسات وعزل',
        labelEn: 'MEP Infrastructure & Plumbing',
        sublabelAr: 'خراطيم وسلوك وكابلات، مواسير مياه وصرف، عزل حمامات وأسطح',
        sublabelEn: 'Electrical, plumbing, cables, waterproofing',
        icon: Zap,
        iconColor: '#0284c7',
        iconBg: '#e0f2fe',
      },
      {
        value: 'finishing_interior',
        labelAr: 'تشطيبات ومحارة ودهانات وسيراميك',
        labelEn: 'Finishing & Architectural',
        sublabelAr: 'بياض ومحارة، سيراميك ورخام، نقاشة ودهانات، ألوميتال وأبواب',
        sublabelEn: 'Plaster, ceramics, marble, paint, doors, aluminum',
        icon: Paintbrush,
        iconColor: '#7c3aed',
        iconBg: '#f3e8ff',
      },
      {
        value: 'labor_subcontractor',
        labelAr: 'يوميات عمالة ومصنعيات مقاولين',
        labelEn: 'Labor & Subcontractor Wages',
        sublabelAr: 'يوميات حداد ونجار، بنايين، مصنعية مقاول، بوفيه وشاي الموقع',
        sublabelEn: 'Daily wages, subcontractors, site labor & tea cash',
        icon: Hammer,
        iconColor: '#059669',
        iconBg: '#d1fae5',
      },
      {
        value: 'permits_engineering',
        labelAr: 'تراخيص ورسوم هندسية ومجلس المدينة',
        labelEn: 'Permits & Engineering Fees',
        sublabelAr: 'رسوم رخصة البناء، إشراف ومخططات هندسية، تقرير جسات تربة',
        sublabelEn: 'City council permits, engineering supervision, blueprints',
        icon: FileCheck,
        iconColor: '#2563eb',
        iconBg: '#dbeafe',
      },
      {
        value: 'taxes_fees',
        labelAr: 'ضرائب وتأمينات ورسوم حكومية',
        labelEn: 'Taxes, Insurance & Municipal Fees',
        sublabelAr: 'تأمينات المقاولات، رسوم توصيل عدادات ومرافق، ضرائب',
        sublabelEn: 'Contractor insurance, utilities connection, municipal taxes',
        icon: Scale,
        iconColor: '#dc2626',
        iconBg: '#fee2e2',
      },
      {
        value: 'site_facade',
        labelAr: 'واجهات ومداخل رخام وأسانسير',
        labelEn: 'Facades, Elevators & Entrances',
        sublabelAr: 'تشطيب الواجهة الخارجية، توريد وتركيب أسانسير، مدخل رخام وبوابة',
        sublabelEn: 'Exterior facade, elevator installation, marble entrance',
        icon: Building2,
        iconColor: '#b45309',
        iconBg: '#ffedd5',
      }
    ];
  }, []);

  // 3. Execution Phase Items for ZFCustomSelect (Everyday Egyptian Arabic)
  const phaseSelectItems: ZFCustomSelectItem[] = useMemo(() => {
    return [
      { 
        value: 'structural_skeleton', 
        labelAr: 'الهيكل والصبات والأسقف', 
        labelEn: 'Structural Skeleton', 
        icon: HardHat,
        iconColor: '#d97706',
        iconBg: '#fef3c7'
      },
      { 
        value: 'masonry_roughing', 
        labelAr: 'المباني وتأسيس المواسير والكهرباء', 
        labelEn: 'Masonry & Roughing', 
        icon: Hammer,
        iconColor: '#0284c7',
        iconBg: '#e0f2fe'
      },
      { 
        value: 'finishing_interiors', 
        labelAr: 'التشطيبات والدهانات', 
        labelEn: 'Finishing & Painting', 
        icon: Paintbrush,
        iconColor: '#7c3aed',
        iconBg: '#f3e8ff'
      },
      { 
        value: 'excavation_foundation', 
        labelAr: 'الحفر والقواعد والأساسات', 
        labelEn: 'Excavation & Foundations', 
        icon: Layers,
        iconColor: '#b45309',
        iconBg: '#ffedd5'
      },
      { 
        value: 'planning_permits', 
        labelAr: 'الرخص والمخططات الهندسية', 
        labelEn: 'Planning & Permits', 
        icon: FileCheck,
        iconColor: '#2563eb',
        iconBg: '#dbeafe'
      },
      { 
        value: 'final_inspection_handover', 
        labelAr: 'المعاينة والجاهزية للتسليم', 
        labelEn: 'Inspection & Delivery', 
        icon: CheckCircle2,
        iconColor: '#059669',
        iconBg: '#d1fae5'
      },
    ];
  }, []);

  // 4. Dues Sort Items for ZFCustomSelect
  const duesSortSelectItems: ZFCustomSelectItem[] = useMemo(() => [
    { value: 'date_asc', labelAr: 'الاستحقاق: الأقرب أولاً', labelEn: 'Due Date: Earliest First' },
    { value: 'date_desc', labelAr: 'الاستحقاق: الأبعد أولاً', labelEn: 'Due Date: Furthest First' },
    { value: 'amount_desc', labelAr: 'المبلغ: من الأعلى للأقل', labelEn: 'Amount: High to Low' },
    { value: 'amount_asc', labelAr: 'المبلغ: من الأقل للأعلى', labelEn: 'Amount: Low to High' },
    { value: 'name_asc', labelAr: 'اسم العميل: أبجدياً (أ-ي)', labelEn: 'Client Name (A-Z)' },
  ], []);

  // Submit Handler: Unified Real Estate Project Cost & Expense Logger
  const handleProjectCostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wipPropertyId) {
      setExpensePropertyError(isAr ? 'يرجى اختيار المشروع العقاري المستهدف' : 'Please select target property');
      return;
    }
    setExpensePropertyError('');

    if (!expenseAmount || parseFloat(expenseAmount) <= 0) return;

    setIsSubmittingExpense(true);
    try {
      const selectedProp = properties.find(p => p.id === wipPropertyId);
      const propTitle = selectedProp ? (isAr ? selectedProp.title_ar : selectedProp.title_en) : (isAr ? 'مشروع عقاري' : 'Project');
      const itemName = wipItemName.trim() || (isAr ? 'تكلفة ومصروفات مشروع' : 'Project Cost');

      const paymentLabel = expensePaymentSource === '101000'
        ? (isAr ? 'كاش من الخزنة' : 'Cash Safe')
        : expensePaymentSource === '102000'
          ? (isAr ? 'تحويل إنستاباي' : 'InstaPay')
          : (isAr ? 'على الحساب (بالدَّين)' : 'On Credit');

      const fullMemo = `${isAr ? 'مصروف مشروع' : 'Project Cost'} [${propTitle}]: ${itemName}${wipSupplier ? ` - تاجر/مقاول: ${wipSupplier}` : ''}${wipInvoiceRef ? ` (فاتورة: ${wipInvoiceRef})` : ''} [${paymentLabel}]`;

      // 1. If onAddPropertyCostItem is provided, add to project cost ledger
      if (onAddPropertyCostItem) {
        const costItem: ERPPropertyCostItem = {
          item_id: generateUUID(),
          property_id: wipPropertyId,
          category: wipCategory,
          phase: wipPhase,
          item_name_ar: itemName,
          item_name_en: itemName,
          supplier_contractor: wipSupplier.trim() || undefined,
          invoice_ref: wipInvoiceRef.trim() || undefined,
          quantity: parseFloat(wipQuantity) || 1,
          unit: wipUnit || 'مقطوعية',
          unit_cost_egp: D(expenseAmount).toFixed(2),
          total_cost_egp: D(expenseAmount).toFixed(2),
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
          '151000', // Capitalized WIP Asset (مشروعات تحت التنفيذ)
          fullMemo,
          expensePaymentSource // '101000' | '102000' | '201000'
        );
      }

      setExpenseAmount('');
      setWipItemName('');
      setWipSupplier('');
      setWipInvoiceRef('');
      setWipQuantity('1');
      setIsExpenseModalOpen(false);

      toast.success(
        isAr 
          ? `تم تسجيل المصروف على مشروع (${propTitle}) بنجاح` 
          : `Project cost recorded for (${propTitle})`,
        {
          description: isAr 
            ? `المبلغ: ${D(expenseAmount).formatEGP(true)} • البند: ${itemName} • طريقة الدفع: ${paymentLabel}`
            : `Amount: ${D(expenseAmount).formatEGP(false)} • Item: ${itemName} • Method: ${paymentLabel}`,
          duration: 5000
        }
      );
    } catch (err: unknown) {
      toast.error(
        isAr ? 'فشل تسجيل تكلفة المشروع' : 'Failed to record project cost', 
        { description: (err as Error).message }
      );
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // 7. Recent Verified Operations & Audit Stream (Tab 6)
  const filteredAuditEntries = useMemo(() => {
    let list = [...journalEntries].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    if (deskSearchQuery.trim()) {
      const q = deskSearchQuery.toLowerCase().trim();
      list = list.filter(je => {
        const num = (je.entry_number || '').toLowerCase();
        const desc = (je.description || '').toLowerCase();
        const by = (je.created_by || '').toLowerCase();
        const src = (je.source_module || '').toLowerCase();
        return num.includes(q) || desc.includes(q) || by.includes(q) || src.includes(q);
      });
    }
    return list;
  }, [journalEntries, deskSearchQuery]);

  const recentAuditEntries = useMemo(() => {
    return filteredAuditEntries.slice(0, 6);
  }, [filteredAuditEntries]);

  // Paginated Slices for Workbench Tabs
  const paginatedDues = useMemo(() => {
    return filteredAndSortedDues.slice((workbenchPage - 1) * workbenchPageSize, workbenchPage * workbenchPageSize);
  }, [filteredAndSortedDues, workbenchPage, workbenchPageSize]);

  const paginatedSafeCheques = useMemo(() => {
    return maturingSafeCheques.slice((workbenchPage - 1) * workbenchPageSize, workbenchPage * workbenchPageSize);
  }, [maturingSafeCheques, workbenchPage, workbenchPageSize]);

  const paginatedAvailableUnits = useMemo(() => {
    return filteredAvailableUnits.slice((workbenchPage - 1) * workbenchPageSize, workbenchPage * workbenchPageSize);
  }, [filteredAvailableUnits, workbenchPage, workbenchPageSize]);

  const paginatedReadyContracts = useMemo(() => {
    return filteredReadyContracts.slice((workbenchPage - 1) * workbenchPageSize, workbenchPage * workbenchPageSize);
  }, [filteredReadyContracts, workbenchPage, workbenchPageSize]);

  const paginatedPropertyCosts = useMemo(() => {
    return filteredPropertyCosts.slice((workbenchPage - 1) * workbenchPageSize, workbenchPage * workbenchPageSize);
  }, [filteredPropertyCosts, workbenchPage, workbenchPageSize]);

  const paginatedAuditEntries = useMemo(() => {
    return filteredAuditEntries.slice((workbenchPage - 1) * workbenchPageSize, workbenchPage * workbenchPageSize);
  }, [filteredAuditEntries, workbenchPage, workbenchPageSize]);

  const totalActiveWorkbenchItems = useMemo(() => {
    switch (activeWorkbenchTab) {
      case 'urgent_dues':
        return filteredAndSortedDues.length;
      case 'upcoming_dues':
        return maturingSafeCheques.length;
      case 'available_units':
        return filteredAvailableUnits.length;
      case 'handover_ready':
        return filteredReadyContracts.length;
      case 'recent_expenses':
        return filteredPropertyCosts.length;
      case 'audit_stream':
        return filteredAuditEntries.length;
      default:
        return 0;
    }
  }, [
    activeWorkbenchTab,
    filteredAndSortedDues.length,
    maturingSafeCheques.length,
    filteredAvailableUnits.length,
    filteredReadyContracts.length,
    filteredPropertyCosts.length,
    filteredAuditEntries.length
  ]);

  // First available property for quick actions
  const primaryProperty = properties[0];
  const primaryContract = contracts.find(c => c.status !== 'Rescinded') || contracts[0];

  // Desk Interactive Refs & Focus Handlers
  const amountInputRef = useRef<HTMLInputElement>(null);
  const loggerRef = useRef<HTMLDivElement>(null);

  // Merged Quick Action: Record Project Expenses & Materials (Unified Cash, Bank/InstaPay, Credit Logger)
  const handleOpenProjectExpenses = () => {
    setExpensePaymentSource('101000');
    setWipCategory('civil_structure');
    setExpensePropertyError('');
    setIsExpenseModalOpen(true);
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
          <div className={styles.stageBreadcrumb} style={{ marginBottom: '0.45rem' }}>
            <span>FIN-OS</span>
            <span>/</span>
            <span>{isAr ? 'حركة الخزنة والعمليات اليومية' : 'Daily Operations & Cashier Cockpit'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div 
              title={isAr ? 'حركة الخزينة والعمليات اليومية المباشرة' : 'Daily Cashier & Operations'}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.16) 0%, rgba(184, 144, 62, 0.05) 100%)',
                border: '1px solid rgba(184, 144, 62, 0.3)',
                boxShadow: '0 2px 8px rgba(184, 144, 62, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#946f23',
                flexShrink: 0
              }}
            >
              <Zap size={20} color="#946f23" />
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {isAr ? 'حركة الخزنة والعمليات اليومية' : 'Daily Operations & Cashier Cockpit'}
            </h1>
            <span 
              title={isAr ? 'الخزينة التشغيلية ومحطة العمل متصلة بالنظام المالي المزدوج وتعمل بنظام الترحيل الفوري' : 'Live dual-entry system connected'}
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                background: 'rgba(21, 128, 61, 0.07)',
                border: '1px solid rgba(21, 128, 61, 0.2)',
                color: '#15803d'
              }}
            >
              {isAr ? 'جاهز للشغل' : 'Live & Ready'}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            {isAr 
              ? 'إدارة سريعة للشغل اليومي: تحصيل أقساط، تسجيل مصاريف، عمل عقود جديدة، ومتابعة الخزنة'
              : 'The central operational cockpit: Instant collections, disbursements, deals, WIP logging, and audit'}
          </p>
        </div>

        {/* Date & Streamlined Financial Micro-Telemetry: Dynamic Daily Operational Movements */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div className={styles.deskMiniTelemetry}>
            {/* 1. Today's Collections */}
            <div className={styles.deskMiniItem}>
              <span className={styles.deskMiniIconBadge} style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                <ArrowDownLeft size={13} />
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span className={styles.deskMiniLabel}>{isAr ? 'تحصيلات اليوم' : 'Collections'}</span>
                <span className={styles.deskMiniVal} style={{ color: '#059669' }}>
                  +{todayCollectionsSum.formatEGP(isAr)}
                </span>
              </div>
              {todayCollectionsCount > 0 && (
                <span style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 800,
                  color: '#059669', 
                  background: 'rgba(5, 150, 105, 0.12)', 
                  border: '1px solid rgba(5, 150, 105, 0.2)',
                  padding: '0.08rem 0.38rem', 
                  borderRadius: '5px' 
                }}>
                  {todayCollectionsCount}
                </span>
              )}
            </div>

            {/* 2. Today's Disbursements */}
            <div className={styles.deskMiniItem}>
              <span className={styles.deskMiniIconBadge} style={{ background: 'rgba(180, 83, 9, 0.1)', color: '#b45309' }}>
                <ArrowUpRight size={13} />
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span className={styles.deskMiniLabel}>{isAr ? 'مصروفات وخامات' : 'Disbursements'}</span>
                <span className={styles.deskMiniVal} style={{ color: todayDisbursementsSum.gt(0) ? '#b45309' : '#475569' }}>
                  -{todayDisbursementsSum.formatEGP(isAr)}
                </span>
              </div>
              {todayDisbursementsCount > 0 && (
                <span style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 800,
                  color: '#b45309', 
                  background: 'rgba(180, 83, 9, 0.12)', 
                  border: '1px solid rgba(180, 83, 9, 0.2)',
                  padding: '0.08rem 0.38rem', 
                  borderRadius: '5px' 
                }}>
                  {todayDisbursementsCount}
                </span>
              )}
            </div>

            {/* 3. Today's Net Cash Flow */}
            <div className={styles.deskMiniItem}>
              <span className={styles.deskMiniIconBadge} style={{ 
                background: todayNetFlow.gt(0) ? 'rgba(5, 150, 105, 0.1)' : todayNetFlow.lt(0) ? 'rgba(220, 38, 38, 0.1)' : 'rgba(71, 85, 105, 0.1)', 
                color: todayNetFlow.gt(0) ? '#059669' : todayNetFlow.lt(0) ? '#dc2626' : '#475569' 
              }}>
                <Wallet size={13} />
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span className={styles.deskMiniLabel}>{isAr ? 'صافي الحركة' : 'Net Flow'}</span>
                <span className={styles.deskMiniVal} style={{ color: todayNetFlow.gt(0) ? '#059669' : todayNetFlow.lt(0) ? '#dc2626' : '#0f172a' }}>
                  {todayNetFlow.gt(0) ? '+' : ''}{todayNetFlow.formatEGP(isAr)}
                </span>
              </div>
            </div>

            {/* 4. Dues Today */}
            <div className={styles.deskMiniItem}>
              <span className={styles.deskMiniIconBadge} style={{ 
                background: todayPendingDueCount > 0 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(71, 85, 105, 0.1)', 
                color: todayPendingDueCount > 0 ? '#dc2626' : '#64748b' 
              }}>
                <BellRing size={13} />
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span className={styles.deskMiniLabel}>{isAr ? 'مستحق اليوم' : 'Due Today'}</span>
                <span className={`${styles.deskMiniVal} ${todayPendingDueCount > 0 ? styles.deskMiniValAlert : ''}`}>
                  {todayPendingDueSum.formatEGP(isAr)}
                </span>
              </div>
              {todayPendingDueCount > 0 && (
                <span style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 800,
                  color: '#dc2626', 
                  background: 'rgba(220, 38, 38, 0.12)', 
                  border: '1px solid rgba(220, 38, 38, 0.2)',
                  padding: '0.08rem 0.38rem', 
                  borderRadius: '5px' 
                }}>
                  {todayPendingDueCount}
                </span>
              )}
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#ffffff',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '11px',
            padding: '0.55rem 0.85rem',
            boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.05)'
          }}>
            <Clock size={14} color="#946f23" />
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. SPACIOUS EXECUTIVE FAST-ACTION LAUNCHPAD */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem 1.4rem',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem'
      }}>
        {/* Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(184, 144, 62, 0.08)',
              border: '1px solid rgba(184, 144, 62, 0.22)',
              color: '#946f23',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={17} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {isAr ? 'مركز العمليات اليومية السريعة' : 'Executive Operational Action Launchpad'}
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: '#475569',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.12rem 0.55rem',
                  borderRadius: '20px'
                }}>
                  {isAr ? '٩ إجراءات مباشرة' : '9 Actions'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                {isAr ? 'إنجاز فوري لحركات التحصيل، مصاريف المباني، تحرير العقود، ودراسات الجدوى دون تعقيد' : 'Instant 1-click execution for cashiering, construction WIP, deals, and financial audits'}
              </span>
            </div>
          </div>
        </div>

        {/* Spacious Launchpad Responsive Grid (Ample Room & Zero Clutter) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
          gap: '0.85rem'
        }}>
          {/* Action 1: Collect Due */}
          <button
            type="button"
            className={styles.opsActionBtn}
            title={isAr 
              ? 'تحصيل قسط مستحق أو دفعة تعاقد كاش بالخزنة (101000) أو إنستاباي (102000)، وتوليد سند قبض رسمي وإيصال فوري للعميل' 
              : 'Collect installment into cash safe or InstaPay, issue official receipt'}
            style={{
              padding: '0.95rem 1.15rem',
              minHeight: '78px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={() => {
              const target = filteredAndSortedDues[0] || urgentDues[0] || pdcRecords.find(p => p.status !== 'Cleared') || pdcRecords[0];
              if (target) {
                onCollectItem(target);
              } else {
                onNavigateToTab('pdc');
              }
            }}
          >
            <div 
              data-action-icon="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(21, 128, 61, 0.07)',
                color: '#15803d',
                border: '1px solid rgba(21, 128, 61, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease'
              }}
            >
              <Receipt size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
              <div data-action-title="true" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', transition: 'color 0.2s ease' }}>
                {isAr ? 'تحصيل قسط وطباعة إيصال' : 'Collect & Issue Receipt'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                {isAr ? 'استلام كاش بالخزنة (101000) أو إنستاباي وإصدار سند قبض' : 'Instant 1-click collection'}
              </div>
            </div>
          </button>

          {/* Action 2: Add Contract Supplement */}
          <button
            type="button"
            className={styles.opsActionBtn}
            title={isAr 
              ? 'إضافة ملحق مالي للعقد (دفعة تشطيبات، تعديلات معمارية، أو إشعار مدين جديد) بنظام الشقين وربطه بجدول الأقساط' 
              : 'Add contract supplement or finishing installment to contract'}
            style={{
              padding: '0.95rem 1.15rem',
              minHeight: '78px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={onOpenNewCheque}
          >
            <div 
              data-action-icon="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(184, 144, 62, 0.08)',
                color: '#946f23',
                border: '1px solid rgba(184, 144, 62, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease'
              }}
            >
              <Plus size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
              <div data-action-title="true" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', transition: 'color 0.2s ease' }}>
                {isAr ? 'إضافة ملحق أو دفعة للعقد' : 'Add Contract Supplement'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                {isAr ? 'تشطيبات، تعديلات معمارية، أو مبالغ طارئة بنظام الشقين' : 'Finishing, alterations or annex'}
              </div>
            </div>
          </button>

          {/* Action 3: Record Project Expenses & Materials */}
          <button
            type="button"
            className={`${styles.opsActionBtn} ${isExpenseModalOpen ? styles.opsActionBtnActive : ''}`}
            title={isAr 
              ? 'تسجيل فواتير ومصروفات وخامات المباني (حديد، أسمنت، خرسانة، سباكة، مصنعيات) كاش أو إنستاباي أو آجل على الحساب' 
              : 'Record building materials, contractor labor, or site expenses'}
            style={{
              padding: '0.95rem 1.15rem',
              minHeight: '78px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={handleOpenProjectExpenses}
          >
            <div 
              data-action-icon="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(180, 83, 9, 0.07)',
                color: '#b45309',
                border: '1px solid rgba(180, 83, 9, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease'
              }}
            >
              <HardHat size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
              <div data-action-title="true" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', transition: 'color 0.2s ease' }}>
                {isAr ? 'تسجيل مصاريف وخامات المشروع' : 'Record Project Expenses'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                {isAr ? 'كاش، إنستاباي، أو فواتير مقاولين على الحساب ومتابعة المباني' : 'Cash, InstaPay, or credit invoice'}
              </div>
            </div>
          </button>

          {/* Action 4: Property Lifecycle Cost Audit */}
          <button
            type="button"
            className={styles.opsActionBtn}
            title={isAr 
              ? 'تدقيق ومراجعة مصاريف مباني كل عمارة، تكلفة المتر الفعلي، ونسبة الربح الصافي المحقق من بيع الشقق' 
              : 'Audit building WIP costs, per-sqm rates, and apartment profit margins'}
            style={{
              padding: '0.95rem 1.15rem',
              minHeight: '78px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={() => {
              if (primaryProperty && onOpenAuditForProperty) {
                onOpenAuditForProperty(primaryProperty);
              } else {
                onNavigateToTab('properties');
              }
            }}
          >
            <div 
              data-action-icon="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(51, 65, 85, 0.06)',
                color: '#334155',
                border: '1px solid rgba(51, 65, 85, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease'
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
              <div data-action-title="true" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', transition: 'color 0.2s ease' }}>
                {isAr ? 'تكلفة العمارة وأرباح الشقق' : 'Property Cost Audit'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                {isAr ? 'تدقيق مصاريف المباني، تكلفة المتر الفعلي، وربحية كل شقة' : 'Audit costs & unit profit'}
              </div>
            </div>
          </button>

          {/* Action 5: Feasibility & Pricing Calculator */}
          <button
            type="button"
            className={styles.opsActionBtn}
            title={isAr 
              ? 'حاسبة الجدوى وتسعير الشقق والمشاريع، دراسة تكلفة المتر المسطح، واحتساب هامش الربح المستهدف وخطط الأقساط' 
              : 'Feasibility study and apartment pricing simulator'}
            style={{
              padding: '0.95rem 1.15rem',
              minHeight: '78px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={() => {
              if (primaryProperty && onOpenCalculatorForProperty) {
                onOpenCalculatorForProperty(primaryProperty);
              } else {
                onNavigateToTab('calculator');
              }
            }}
          >
            <div 
              data-action-icon="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(30, 58, 138, 0.06)',
                color: '#1e40af',
                border: '1px solid rgba(30, 58, 138, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease'
              }}
            >
              <Calculator size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
              <div data-action-title="true" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', transition: 'color 0.2s ease' }}>
                {isAr ? 'حاسبة تسعير وجدوى المشروع' : 'Feasibility & Pricing'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                {isAr ? 'دراسة تكلفة المتر المسطح، هامش الربح المستهدف، وجدولة الأقساط' : 'Installments & margin study'}
              </div>
            </div>
          </button>

          {/* Action 6: New Contract Deal Wizard */}
          <button
            type="button"
            className={styles.opsActionBtn}
            title={isAr 
              ? 'فتح معالج تحرير عقد بيع جديد لشقة: تسجيل بيانات العميل، تحصيل مقدم الحجز بالخزنة، وتوليد جدول الأقساط آلياً' 
              : 'Create new sales contract, record down payment, and build installment schedule'}
            style={{
              padding: '0.95rem 1.15rem',
              minHeight: '78px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={onOpenNewContract}
          >
            <div 
              data-action-icon="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(184, 144, 62, 0.08)',
                color: '#946f23',
                border: '1px solid rgba(184, 144, 62, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease'
              }}
            >
              <FileText size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
              <div data-action-title="true" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', transition: 'color 0.2s ease' }}>
                {isAr ? 'تحرير عقد بيع وحجز شقة' : 'New Sales Contract'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                {isAr ? 'تسجيل بيانات العميل، دفعة الحجز بالخزنة، وجدول الأقساط بالمليم' : '3-step deal wizard'}
              </div>
            </div>
          </button>

          {/* Action 7: RSV Milestone Recognition */}
          <button
            type="button"
            className={styles.opsActionBtn}
            title={isAr 
              ? 'معادلة الرسملة والاعتراف بالإيراد (RSV): حساب نسبة الإنجاز الفعلي وتوزيع مصاريف المباني وإثبات أرباح الشقق بالدفاتر' 
              : 'Recognize project progress and revenue via the RSV Factor'}
            style={{
              padding: '0.95rem 1.15rem',
              minHeight: '78px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={() => {
              if (onOpenRSVModal) {
                onOpenRSVModal();
              } else {
                onNavigateToTab('contracts');
              }
            }}
          >
            <div 
              data-action-icon="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(30, 58, 138, 0.06)',
                color: '#1e3a8a',
                border: '1px solid rgba(30, 58, 138, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease'
              }}
            >
              <Layers size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
              <div data-action-title="true" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', transition: 'color 0.2s ease' }}>
                {isAr ? 'حساب أرباح ونسبة إنجاز المشروع' : 'Milestone Recognition (RSV)'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                {isAr ? 'توزيع مصاريف المباني واعتراف مكسب الشقق بالدفاتر' : 'Milestone revenue recognition'}
              </div>
            </div>
          </button>

          {/* Action 8: Contract Escalation */}
          <button
            type="button"
            className={styles.opsActionBtn}
            title={isAr 
              ? 'إجراء تعديل سعري أو تطبيق فروق زيادة التكاليف على العقد (Delta V)، وإعادة جدولة الفروق على الأقساط المتبقية بنظام الشقين' 
              : 'Adjust contract price and re-amortize installment deltas with two-sided layout'}
            style={{
              padding: '0.95rem 1.15rem',
              minHeight: '78px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={() => {
              if (primaryContract && onOpenEscalationModal) {
                onOpenEscalationModal(primaryContract);
              } else {
                onNavigateToTab('contracts');
              }
            }}
          >
            <div 
              data-action-icon="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(71, 85, 105, 0.06)',
                color: '#475569',
                border: '1px solid rgba(71, 85, 105, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease'
              }}
            >
              <TrendingUp size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
              <div data-action-title="true" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', transition: 'color 0.2s ease' }}>
                {isAr ? 'تعديل أسعار أو بنود العقد' : 'Price Escalation'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                {isAr ? 'إضافة ملحق سعري Delta V وجدولة الفروق' : 'Price adjustment addendum'}
              </div>
            </div>
          </button>

          {/* Action 9: Contract Rescission */}
          <button
            type="button"
            className={styles.opsActionBtn}
            title={isAr 
              ? 'تسوية فسخ أو استرداد شقة: حساب الخصم القانوني (10% قبل التسليم) أو استرداد الوحدة، وصرف مستحقات العميل من الخزنة' 
              : 'Settle contract cancellation, calculate statutory deduction, and refund'}
            style={{
              padding: '0.95rem 1.15rem',
              minHeight: '78px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={() => {
              if (primaryContract && onOpenRescissionModal) {
                onOpenRescissionModal(primaryContract);
              } else {
                onNavigateToTab('contracts');
              }
            }}
          >
            <div 
              data-action-icon="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(159, 18, 57, 0.06)',
                color: '#9f1239',
                border: '1px solid rgba(159, 18, 57, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease'
              }}
            >
              <RotateCcw size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
              <div data-action-title="true" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', transition: 'color 0.2s ease' }}>
                {isAr ? 'فسخ تعاقد وتسوية المسترد' : 'Contract Rescission'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                {isAr ? 'تطبيق غرامة الـ 10% القانونية ورد باقي الفلوس نقدياً' : 'Settle penalty & vault refund'}
              </div>
            </div>
          </button>

          {/* Action 10: Partner Management & Distributions */}
          <button
            type="button"
            className={styles.opsActionBtn}
            title={isAr 
              ? 'إدارة وتوزيعات الشركاء والممولين: متابعة الأرصدة، ضخ مساهمات رأس مال، وصرف أرباح بنظام الشقين المزدوج' 
              : 'Manage partners, capital injections, and profit distributions'}
            style={{
              padding: '0.95rem 1.15rem',
              minHeight: '78px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              cursor: 'pointer',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={() => {
              if (onOpenPartnerOperations) {
                onOpenPartnerOperations();
              } else {
                onNavigateToTab('partners');
              }
            }}
          >
            <div 
              data-action-icon="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(184, 144, 62, 0.08)',
                color: '#946f23',
                border: '1px solid rgba(184, 144, 62, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.2s ease'
              }}
            >
              <Users size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, flex: 1 }}>
              <div data-action-title="true" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', transition: 'color 0.2s ease' }}>
                {isAr ? 'إدارة وتوزيعات الشركاء والممولين' : 'Partner Operations'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.35 }}>
                {isAr ? 'متابعة الأرصدة، ضخ مساهمات، وصرف أرباح بنظام الشقين' : 'Balances, dividends & capital'}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 3. EXECUTIVE LIQUIDITY & ACTION RADAR */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1.25rem 1.4rem',
        boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.1rem'
      }}>
        {/* Radar Header & Live Liquidity Breakdown */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.95rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, rgba(4, 120, 87, 0.12) 0%, rgba(4, 120, 87, 0.04) 100%)',
              border: '1px solid rgba(4, 120, 87, 0.25)',
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(4, 120, 87, 0.1)'
            }}>
              <Activity size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {isAr ? 'رادار السيولة والتنبيهات التشغيلية الفورية' : 'Executive Liquidity & Action Radar'}
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '20px',
                  background: 'rgba(4, 120, 87, 0.08)',
                  border: '1px solid rgba(4, 120, 87, 0.25)',
                  color: '#047857'
                }}>
                  {isAr ? 'محدث لحظياً بالمليم' : 'Live Sync'}
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                {isAr 
                  ? 'مراقبة فورية للسيولة الحاضرة بالخزينة والبنك، مع تنبيهات الأقساط المتأخرة والوحدات الجاهزة للتسليم' 
                  : 'Instant detection of liquid reserves, critical overdue installments, and delivery readiness'}
              </span>
            </div>
          </div>

          {/* Live Liquid Treasury Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Safe 101000 */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '9px',
              padding: '0.4rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                {isAr ? 'خزينة المركز الرئيسي (101000):' : 'Main Safe (101000):'}
              </span>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {liquidBalances.safeCash.formatEGP(isAr)}
              </span>
            </div>

            {/* Bank 102000 */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '9px',
              padding: '0.4rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                {isAr ? 'البنك وإنستاباي (102000):' : 'Bank & InstaPay (102000):'}
              </span>
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {liquidBalances.bankCash.formatEGP(isAr)}
              </span>
            </div>

            {/* Total Liquid Capital */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(184, 144, 62, 0.09) 0%, rgba(184, 144, 62, 0.03) 100%)',
              border: '1.5px solid rgba(184, 144, 62, 0.3)',
              borderRadius: '9px',
              padding: '0.4rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <Wallet size={14} color="#946f23" />
              <span style={{ fontSize: '0.72rem', color: '#946f23', fontWeight: 800 }}>
                {isAr ? 'إجمالي السيولة المتاحة:' : 'Total Liquid:'}
              </span>
              <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                {liquidBalances.totalLiquid.formatEGP(isAr)}
              </span>
            </div>
          </div>
        </div>

        {/* High-Contrast Actionable Alerts Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '0.8rem'
        }}>
          {operationalAlerts.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(5, 150, 105, 0.1)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'كافة العمليات التشغيلية منتظمة ولا توجد متأخرات حرجة' : 'All operational queues are regular'}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.2rem' }}>
                    {isAr ? 'الخزينة والحسابات البنكية مطابقة بالمليم، وكافة الأقساط محصلة في مواعيدها المحددة.' : 'Safe and banks reconciled; all schedules collected on time.'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('ledger')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>{isAr ? 'فتح دفتر الأستاذ' : 'View Ledger'}</span>
                <ArrowLeft size={12} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
              </button>
            </div>
          ) : (
            operationalAlerts.map(alert => {
              const isCrit = alert.severity === 'critical';
              const isWarn = alert.severity === 'warning';
              const accentColor = isCrit ? '#dc2626' : isWarn ? '#d97706' : '#059669';

              return (
                <div
                  key={alert.id}
                  className={styles.radarAlertCard}
                >
                  {/* Subtle architectural leading edge indicator */}
                  <div 
                    className={styles.radarAlertLeadingEdge} 
                    style={{ background: accentColor }} 
                  />

                  <div>
                    {/* Top Badge & Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', gap: '0.5rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '7px',
                          background: isCrit ? 'rgba(220, 38, 38, 0.08)' : isWarn ? 'rgba(217, 119, 6, 0.08)' : 'rgba(5, 150, 105, 0.08)',
                          color: accentColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isCrit ? <AlertCircle size={14} /> : isWarn ? <AlertTriangle size={14} /> : <Key size={14} />}
                        </div>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b' }}>
                          {isCrit ? (isAr ? 'تنبيه تحصيل متأخر' : 'Overdue Alert') : isWarn ? (isAr ? 'استحقاق قريب' : 'Maturing Alert') : (isAr ? 'جاهزية تسليم' : 'Handover Ready')}
                        </span>
                      </div>

                      {alert.badgeLabelAr && (
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.55rem',
                          borderRadius: '6px',
                          background: isCrit ? 'rgba(220, 38, 38, 0.06)' : isWarn ? 'rgba(217, 119, 6, 0.06)' : 'rgba(5, 150, 105, 0.06)',
                          color: isCrit ? '#dc2626' : isWarn ? '#b45309' : '#047857',
                          border: `1px solid ${isCrit ? 'rgba(220, 38, 38, 0.18)' : isWarn ? 'rgba(217, 119, 6, 0.18)' : 'rgba(5, 150, 105, 0.18)'}`,
                          flexShrink: 0
                        }}>
                          {isAr ? alert.badgeLabelAr : alert.badgeLabelEn}
                        </span>
                      )}
                    </div>

                    {/* Debtor Name & Title */}
                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                      {isAr ? alert.titleAr : alert.titleEn}
                    </div>

                    {/* Unit & Contract Details */}
                    {alert.unitDetail && (
                      <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '0.3rem', fontWeight: 600 }}>
                        {alert.unitDetail}
                      </div>
                    )}

                    {/* Secondary Note */}
                    <div style={{ fontSize: '0.71rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.45 }}>
                      {isAr ? alert.secondaryNoteAr : alert.secondaryNoteEn}
                    </div>
                  </div>

                  {/* Footer: Amount & Action Trigger */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid rgba(15, 23, 42, 0.06)',
                    marginTop: '0.25rem'
                  }}>
                    {alert.amountFormatted ? (
                      <div>
                        <span style={{ fontSize: '0.63rem', color: '#64748b', display: 'block', fontWeight: 700 }}>
                          {isCrit ? (isAr ? 'المبلغ المتأخر:' : 'Due Amount:') : isWarn ? (isAr ? 'قيمة القسط:' : 'Amount:') : (isAr ? 'المسدد حتى الآن:' : 'Collected:')}
                        </span>
                        <span style={{
                          fontSize: '1rem',
                          fontWeight: 900,
                          color: accentColor,
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: '-0.02em'
                        }}>
                          {alert.amountFormatted}
                        </span>
                      </div>
                    ) : <div />}

                    <button
                      type="button"
                      onClick={alert.onClick}
                      className={styles.radarAlertButton}
                    >
                      <span>{isAr ? alert.actionLabelAr : alert.actionLabelEn}</span>
                      <span className={styles.radarAlertButtonIcon}>
                        <ArrowLeft size={11} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. UNIFIED EXECUTIVE DAILY DESK WORKBENCH */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Workbench Header & Command Toolbar */}
        <div style={{
          padding: '1.25rem 1.4rem',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Top Row: Title & Record Counter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.06)',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Layers size={16} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
                    {isAr ? 'طاولة العمليات وسجلات المتابعة اليومية الموحدة' : 'Unified Daily Operations Workbench'}
                  </h3>
                  {journalEntries.length > 0 && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'rgba(5, 150, 105, 0.08)',
                      border: '1px solid rgba(5, 150, 105, 0.25)',
                      padding: '0.12rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.66rem',
                      color: '#059669',
                      fontWeight: 700
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                      <span>{isAr ? `آخر قيد: ${journalEntries[0]?.entry_number || ''}` : `Latest: ${journalEntries[0]?.entry_number || ''}`}</span>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {isAr ? 'متابعة مباشرة للأقساط، الوحدات المعروضة، العقود الجاهزة للتسليم، مصاريف المباني، وسجل القيود اللحظية' : 'Real-time multi-queue workbench with verified audit stream'}
                </span>
              </div>
            </div>

            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#475569',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px'
            }}>
              {totalActiveWorkbenchItems} {isAr ? 'معاملة في هذا القسم' : 'records in tab'}
            </span>
          </div>

          {/* Search, Filter & Sort Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
              {/* Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.38rem 0.75rem',
                flex: 1,
                minWidth: '240px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <Search size={14} color="#64748b" />
                <input 
                  type="text"
                  value={deskSearchQuery}
                  onChange={e => setDeskSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث سريع: اسم العميل، رقم السند أو العقد، اسم الوحدة، أو المورد...' : 'Search debtor, receipt #, deal, unit, or supplier...'}
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

              {/* Status Filter for Dues */}
              {(activeWorkbenchTab === 'urgent_dues' || activeWorkbenchTab === 'upcoming_dues') && (
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
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              {/* Sort Dropdown */}
              <div style={{ minWidth: '190px' }}>
                <ZFCustomSelect
                  value={duesSortBy}
                  onChange={(val) => setDuesSortBy(val as any)}
                  items={duesSortSelectItems}
                  isAr={isAr}
                  searchable={false}
                  placeholderAr="ترتيب حسب..."
                  placeholderEn="Sort by..."
                />
              </div>

              {/* Reset */}
              {(activeFiltersCount > 0 || deskSearchQuery.trim()) && (
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

          {/* Workbench Tab Navigation Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            overflowX: 'auto',
            paddingTop: '0.25rem',
            paddingBottom: '0.15rem'
          }}>
            {/* Tab 1: Urgent Dues */}
            <button
              type="button"
              onClick={() => setActiveWorkbenchTab('urgent_dues')}
              title={isAr ? 'عرض الأقساط المستحقة اليوم أو المتأخرة التي تتطلب تحصيلاً عاجلاً' : 'View urgent and overdue collections'}
              style={{
                background: activeWorkbenchTab === 'urgent_dues' ? '#0f172a' : '#f8fafc',
                color: activeWorkbenchTab === 'urgent_dues' ? '#ffffff' : '#64748b',
                border: `1.5px solid ${activeWorkbenchTab === 'urgent_dues' ? '#0f172a' : '#cbd5e1'}`,
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Clock size={14} color={activeWorkbenchTab === 'urgent_dues' ? '#ffffff' : '#d97706'} />
              <span>{isAr ? 'أقساط ومستحقات التحصيل العاجلة' : 'Urgent Collections'}</span>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '0.08rem 0.4rem',
                borderRadius: '5px',
                background: activeWorkbenchTab === 'urgent_dues' ? 'rgba(255,255,255,0.2)' : 'rgba(217, 119, 6, 0.12)',
                color: activeWorkbenchTab === 'urgent_dues' ? '#ffffff' : '#d97706'
              }}>
                {filteredAndSortedDues.length}
              </span>
            </button>

            {/* Tab 2: Upcoming Dues */}
            <button
              type="button"
              onClick={() => setActiveWorkbenchTab('upcoming_dues')}
              title={isAr ? 'عرض محفظة كل الأقساط المستقبلية المجدولة على العملاء' : 'View portfolio of all scheduled future dues'}
              style={{
                background: activeWorkbenchTab === 'upcoming_dues' ? '#0f172a' : '#f8fafc',
                color: activeWorkbenchTab === 'upcoming_dues' ? '#ffffff' : '#64748b',
                border: `1.5px solid ${activeWorkbenchTab === 'upcoming_dues' ? '#0f172a' : '#cbd5e1'}`,
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Wallet size={14} color={activeWorkbenchTab === 'upcoming_dues' ? '#ffffff' : '#946f23'} />
              <span>{isAr ? 'محفظة الأقساط القادمة' : 'Upcoming Installments'}</span>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '0.08rem 0.4rem',
                borderRadius: '5px',
                background: activeWorkbenchTab === 'upcoming_dues' ? 'rgba(255,255,255,0.2)' : 'rgba(184, 144, 62, 0.12)',
                color: activeWorkbenchTab === 'upcoming_dues' ? '#ffffff' : '#946f23'
              }}>
                {maturingSafeCheques.length}
              </span>
            </button>

            {/* Tab 3: Available Inventory */}
            <button
              type="button"
              onClick={() => setActiveWorkbenchTab('available_units')}
              title={isAr ? 'استعراض الشقق والوحدات المتاحة للبيع وجاهزيتها وأسعارها' : 'Browse available units and inventory for sale'}
              style={{
                background: activeWorkbenchTab === 'available_units' ? '#0f172a' : '#f8fafc',
                color: activeWorkbenchTab === 'available_units' ? '#ffffff' : '#64748b',
                border: `1.5px solid ${activeWorkbenchTab === 'available_units' ? '#0f172a' : '#cbd5e1'}`,
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Building2 size={14} color={activeWorkbenchTab === 'available_units' ? '#ffffff' : '#1e40af'} />
              <span>{isAr ? 'الوحدات والشقق المتاحة للبيع' : 'Available Inventory'}</span>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '0.08rem 0.4rem',
                borderRadius: '5px',
                background: activeWorkbenchTab === 'available_units' ? 'rgba(255,255,255,0.2)' : 'rgba(30, 64, 175, 0.12)',
                color: activeWorkbenchTab === 'available_units' ? '#ffffff' : '#1e40af'
              }}>
                {availableUnits.length}
              </span>
            </button>

            {/* Tab 4: Handover Ready */}
            <button
              type="button"
              onClick={() => setActiveWorkbenchTab('handover_ready')}
              title={isAr ? 'عرض العقود التي استوفت 70%+ من السداد وجاهزة للتسليم النهائي' : 'View contracts ready for unit handover (70%+ paid)'}
              style={{
                background: activeWorkbenchTab === 'handover_ready' ? '#0f172a' : '#f8fafc',
                color: activeWorkbenchTab === 'handover_ready' ? '#ffffff' : '#64748b',
                border: `1.5px solid ${activeWorkbenchTab === 'handover_ready' ? '#0f172a' : '#cbd5e1'}`,
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Key size={14} color={activeWorkbenchTab === 'handover_ready' ? '#ffffff' : '#059669'} />
              <span>{isAr ? 'عقود جاهزة للتسليم (سداد 70%+)' : 'Handover Ready (70%+)'}</span>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '0.08rem 0.4rem',
                borderRadius: '5px',
                background: activeWorkbenchTab === 'handover_ready' ? 'rgba(255,255,255,0.2)' : 'rgba(5, 150, 105, 0.12)',
                color: activeWorkbenchTab === 'handover_ready' ? '#ffffff' : '#059669'
              }}>
                {readyForHandoverContracts.length}
              </span>
            </button>

            {/* Tab 5: Recent WIP Costs */}
            <button
              type="button"
              onClick={() => setActiveWorkbenchTab('recent_expenses')}
              title={isAr ? 'استعراض أحدث فواتير وخامات المباني والمصنعيات المسجلة ع المشاريع' : 'View recent WIP material and contractor invoices'}
              style={{
                background: activeWorkbenchTab === 'recent_expenses' ? '#0f172a' : '#f8fafc',
                color: activeWorkbenchTab === 'recent_expenses' ? '#ffffff' : '#64748b',
                border: `1.5px solid ${activeWorkbenchTab === 'recent_expenses' ? '#0f172a' : '#cbd5e1'}`,
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <HardHat size={14} color={activeWorkbenchTab === 'recent_expenses' ? '#ffffff' : '#b45309'} />
              <span>{isAr ? 'آخر مصاريف وخامات المباني' : 'Recent WIP Costs'}</span>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '0.08rem 0.4rem',
                borderRadius: '5px',
                background: activeWorkbenchTab === 'recent_expenses' ? 'rgba(255,255,255,0.2)' : 'rgba(180, 83, 9, 0.12)',
                color: activeWorkbenchTab === 'recent_expenses' ? '#ffffff' : '#b45309'
              }}>
                {filteredPropertyCosts.length}
              </span>
            </button>

            {/* Tab 6: Live Operations & Audit Stream */}
            <button
              type="button"
              onClick={() => setActiveWorkbenchTab('audit_stream')}
              title={isAr ? 'شريط مباشر للقيود اليومية المحاسبية المزدوجة المتوازنة بالمليم' : 'Live stream of balanced double-entry journal postings'}
              style={{
                background: activeWorkbenchTab === 'audit_stream' ? '#0f172a' : '#f8fafc',
                color: activeWorkbenchTab === 'audit_stream' ? '#ffffff' : '#64748b',
                border: `1.5px solid ${activeWorkbenchTab === 'audit_stream' ? '#0f172a' : '#cbd5e1'}`,
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Activity size={14} color={activeWorkbenchTab === 'audit_stream' ? '#ffffff' : '#059669'} />
              <span>{isAr ? 'سجل العمليات والقيود المنفذة' : 'Live Journal Stream'}</span>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '0.08rem 0.4rem',
                borderRadius: '5px',
                background: activeWorkbenchTab === 'audit_stream' ? 'rgba(255,255,255,0.2)' : 'rgba(5, 150, 105, 0.12)',
                color: activeWorkbenchTab === 'audit_stream' ? '#ffffff' : '#059669'
              }}>
                {filteredAuditEntries.length}
              </span>
            </button>
          </div>
        </div>

        {/* Workbench Body (Full Width 100%) */}
        <div style={{ padding: '1.25rem 1.4rem' }}>
          {/* TAB 1: URGENT DUES QUEUE */}
          {activeWorkbenchTab === 'urgent_dues' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                  {isAr 
                    ? `إجمالي المعروض: ${filteredDuesSum.formatEGP(isAr)} — تحصيل مباشر وسند قبض فوري` 
                    : `Total visible: ${filteredDuesSum.formatEGP(isAr)} — 1-click collection`}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('pdc')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#946f23',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{isAr ? 'فتح جدول الأقساط الكامل' : 'Open full PDC register'}</span>
                  <ArrowLeft size={12} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
                </button>
              </div>

              {filteredAndSortedDues.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 0.65rem auto', opacity: 0.9 }} />
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                    {deskSearchQuery ? (isAr ? 'لا توجد أقساط مطابقة لمعايير البحث' : 'No dues match search query') : (isAr ? 'المحفظة منتظمة بالكامل!' : 'Portfolio is completely up to date!')}
                  </div>
                  <div style={{ fontSize: '0.76rem', marginTop: '0.3rem', color: '#64748b' }}>
                    {deskSearchQuery ? (isAr ? 'حاول تعديل كلمة البحث أو إزالة التصفية' : 'Try adjusting the search query or reset filters') : (isAr ? 'لا توجد أي أقساط متأخرة أو مستحقة حالياً.' : 'No overdue or due installments today.')}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {paginatedDues.map((item) => {
                    const linkedContract = contracts.find(c => c.contract_id === item.contract_id);
                    const isOverdue = item.due_date < todayStr;
                    const isToday = item.due_date === todayStr;

                    return (
                      <div 
                        key={item.cheque_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1.15rem',
                          background: isOverdue ? 'rgba(239, 68, 68, 0.02)' : '#ffffff',
                          border: `1.5px solid ${isOverdue ? 'rgba(239, 68, 68, 0.35)' : '#e2e8f0'}`,
                          borderRadius: '12px',
                          gap: '1rem',
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                            <span 
                              dir="auto"
                              style={{ 
                                fontSize: '0.88rem', 
                                fontWeight: 800, 
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {item.drawer_name || linkedContract?.buyer_name || (isAr ? 'عميل مسجل' : 'Client')}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 700, flexShrink: 0 }}>
                              {item.cheque_number ? `#${item.cheque_number}` : (linkedContract?.contract_number ? `#${linkedContract.contract_number}` : '')}
                            </span>
                            {isOverdue && (
                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '0.08rem 0.4rem',
                                borderRadius: '4px',
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                flexShrink: 0
                              }}>
                                {isAr ? 'متأخر' : 'Overdue'}
                              </span>
                            )}
                            {isToday && (
                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '0.08rem 0.4rem',
                                borderRadius: '4px',
                                background: '#fffbeb',
                                color: '#d97706',
                                border: '1px solid #fde68a',
                                flexShrink: 0
                              }}>
                                {isAr ? 'مستحق اليوم' : 'Due Today'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, flexShrink: 0 }}>{item.due_date}</span>
                            <span>•</span>
                            <span style={{ color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {linkedContract?.unit_id || (isAr ? 'وحدة تعاقدية' : 'Unit')}
                            </span>
                            {linkedContract && (
                              <>
                                <span>•</span>
                                <span style={{ color: '#64748b' }}>عقد #{linkedContract.contract_number}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#946f23', fontVariantNumeric: 'tabular-nums' }}>
                              {D(item.nominal_value).formatEGP(isAr)}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                              {isAr ? 'كاش الخزنة / إنستاباي' : 'Cash / InstaPay'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {onInspectCheque && (
                              <button
                                type="button"
                                onClick={() => onInspectCheque(item)}
                                title={isAr ? 'معاينة تفاصيل وبيانات هذا القسط وحالته المالية' : 'Inspect installment details'}
                                style={{
                                  background: '#f8fafc',
                                  color: '#334155',
                                  padding: '0.42rem 0.75rem',
                                  borderRadius: '7px',
                                  fontSize: '0.74rem',
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
                              title={isAr ? 'تحصيل هذا القسط نقداً بالخزينة (101000) أو عبر إنستاباي (102000) وطباعة إيصال رسمي' : 'Collect installment into cash safe or InstaPay, issue receipt'}
                              style={{
                                background: 'linear-gradient(135deg, #c5a059 0%, #946f23 100%)',
                                color: '#ffffff',
                                padding: '0.42rem 0.95rem',
                                borderRadius: '8px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(148, 111, 35, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <Receipt size={13} />
                              <span>{isAr ? 'تحصيل فوري' : 'Collect'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPCOMING DUES QUEUE */}
          {activeWorkbenchTab === 'upcoming_dues' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                  {isAr 
                    ? `إجمالي مستحقات وأقساط الخزينة: ${safeChequesSum.formatEGP(isAr)} — جاهزة للتحصيل والمطابقة` 
                    : `Total upcoming installments: ${safeChequesSum.formatEGP(isAr)}`}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('pdc')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#946f23',
                    fontSize: '0.74rem',
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

              {maturingSafeCheques.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <Wallet size={32} color="#946f23" style={{ margin: '0 auto 0.65rem auto', opacity: 0.9 }} />
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                    {isAr ? 'لا توجد أقساط مؤجلة بالخزينة حالياً' : 'No deferred installments in vault'}
                  </div>
                  <div style={{ fontSize: '0.76rem', marginTop: '0.3rem', color: '#64748b' }}>
                    {isAr ? 'يمكنك إضافة قسط أو ملحق تعاقدي جديد من زر "إضافة ملحق أو دفعة للعقد" بالأعلى.' : 'Register new installments via the action launchpad above.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {paginatedSafeCheques.map((item) => {
                    const isDueSoon = item.due_date <= threeDaysStr && item.due_date >= todayStr;

                    return (
                      <div 
                        key={item.cheque_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1.15rem',
                          background: isDueSoon ? 'rgba(217, 119, 6, 0.03)' : '#ffffff',
                          border: `1.5px solid ${isDueSoon ? 'rgba(217, 119, 6, 0.4)' : '#e2e8f0'}`,
                          borderRadius: '12px',
                          gap: '1rem',
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                            <span 
                              dir="auto"
                              style={{ 
                                fontSize: '0.88rem', 
                                fontWeight: 800, 
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {item.drawer_name || (isAr ? 'العميل مسجل' : 'Client')}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 700, flexShrink: 0 }}>
                              {item.cheque_number ? `#${item.cheque_number}` : ''}
                            </span>
                            {isDueSoon && (
                              <span style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '0.08rem 0.4rem',
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
                          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.bank_name || (isAr ? 'نقدي / باليد' : 'Cash / Hand')}
                            </span>
                            <span>•</span>
                            <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, flexShrink: 0 }}>{item.due_date}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              {D(item.nominal_value).formatEGP(isAr)}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                              {isAr ? 'مستحق بالخزينة' : 'Safe Portfolio'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {onInspectCheque && (
                              <button
                                type="button"
                                onClick={() => onInspectCheque(item)}
                                title={isAr ? 'معاينة تفاصيل وبيانات هذا القسط وحالته المالية' : 'Inspect installment details'}
                                style={{
                                  background: '#f8fafc',
                                  color: '#334155',
                                  padding: '0.42rem 0.75rem',
                                  borderRadius: '7px',
                                  fontSize: '0.74rem',
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
                              title={isAr ? 'تحصيل هذا القسط نقداً بالخزينة (101000) أو عبر إنستاباي (102000) وطباعة إيصال رسمي' : 'Collect installment into cash safe or InstaPay, issue receipt'}
                              style={{
                                background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                                color: '#ffffff',
                                border: '1px solid #947228',
                                padding: '0.42rem 0.95rem',
                                borderRadius: '8px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: '0 1px 3px rgba(184, 144, 62, 0.2)'
                              }}
                            >
                              <Receipt size={12} />
                              <span>{isAr ? 'تحصيل' : 'Collect'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AVAILABLE INVENTORY */}
          {activeWorkbenchTab === 'available_units' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                  {isAr 
                    ? 'اختر أي وحدة متاحة لفتح التعاقد المباشر، دراسة الجدوى، أو سجل تدقيق التكاليف' 
                    : 'Select any unit for 1-click deal creation, calculator, or cost audit'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('properties')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#946f23',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{isAr ? 'محفظة العقارات الكاملة' : 'Properties Portfolio'}</span>
                  <ArrowLeft size={12} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
                </button>
              </div>

              {availableUnits.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <Building2 size={32} color="#946f23" style={{ margin: '0 auto 0.65rem auto', opacity: 0.8 }} />
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                    {isAr ? 'لا توجد وحدات متاحة مطابقة للبحث' : 'No available units match search'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {paginatedAvailableUnits.map(prop => (
                    <div 
                      key={prop.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1.15rem',
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        gap: '1rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isAr ? prop.title_ar : prop.title_en}
                        </span>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{prop.location || (isAr ? 'الموقع مسجل' : 'Location')}</span>
                          <span>•</span>
                          <span>{prop.area_sqm} م²</span>
                          <span>•</span>
                          <span style={{ color: '#059669', fontWeight: 700 }}>
                            {prop.completion_status === 'ready' ? (isAr ? 'جاهز للتسليم' : 'Ready') : (isAr ? 'قيد التطوير والإنشاء' : 'Under Development')}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                        <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {D(prop.price_egp).formatEGP(isAr)}
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>
                            {isAr ? 'متاحة للبيع' : 'Available for sale'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {onOpenCalculatorForProperty && (
                            <button
                              type="button"
                              onClick={() => onOpenCalculatorForProperty(prop)}
                              title={isAr ? 'فتح حاسبة التسعير والجدوى التقديرية لهذه الوحدة' : 'Pricing & Feasibility Calculator'}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '7px',
                                padding: '0.45rem',
                                color: '#475569',
                                cursor: 'pointer'
                              }}
                            >
                              <Calculator size={14} />
                            </button>
                          )}

                          {onOpenAuditForProperty && (
                            <button
                              type="button"
                              onClick={() => onOpenAuditForProperty(prop)}
                              title={isAr ? 'فتح سجل تدقيق تكاليف المباني وخامات هذا المشروع' : 'Property Cost Audit'}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '7px',
                                padding: '0.45rem',
                                color: '#946f23',
                                cursor: 'pointer'
                              }}
                            >
                              <ShieldCheck size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenContractForProperty(prop)}
                            title={isAr ? 'بدء تحرير عقد بيع وحجز فوري لهذه الشقة' : 'Draft sales contract for this unit'}
                            style={{
                              background: 'linear-gradient(135deg, #c5a059 0%, #a48135 100%)',
                              color: '#ffffff',
                              border: '1px solid #947228',
                              padding: '0.42rem 0.95rem',
                              borderRadius: '8px',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              boxShadow: '0 1px 3px rgba(184, 144, 62, 0.2)'
                            }}
                          >
                            <Plus size={13} />
                            <span>{isAr ? 'تحرير عقد بيع' : 'Sell'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HANDOVER READINESS */}
          {activeWorkbenchTab === 'handover_ready' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                  {isAr 
                    ? 'عقود مسددة بنسبة 70% فأكثر — مؤهلة لمعاينة الموقع وبدء إجراءات محضر الاستلام' 
                    : 'Contracts achieved 70%+ cash — qualified for snagging and handover protocol'}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('contracts')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#059669',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{isAr ? 'سجل العقود والمبيعات' : 'All Contracts'}</span>
                  <ArrowLeft size={12} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
                </button>
              </div>

              {readyForHandoverContracts.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <Key size={32} color="#10b981" style={{ margin: '0 auto 0.65rem auto', opacity: 0.8 }} />
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                    {isAr ? 'لا توجد عقود بلغت 70% سداد حالياً' : 'No contracts at 70%+ threshold'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {paginatedReadyContracts.map(c => {
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
                          padding: '0.85rem 1.15rem',
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '12px',
                          gap: '1rem',
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.buyer_name}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                              #{c.contract_number}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#0f172a', fontWeight: 700 }}>{c.unit_id}</span>
                            <span>•</span>
                            <span style={{ color: '#059669', fontWeight: 800 }}>{pct}% {isAr ? 'مسدد' : 'collected'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                              {remaining.formatEGP(isAr)}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#946f23', fontWeight: 700 }}>
                              {isAr ? 'المتبقي' : 'Remaining'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onInspectContract(c)}
                            title={isAr ? 'فحص بنود العقد ونسبة السداد والتجهيز لمحضر التسليم الرسمي' : 'Inspect contract details for handover readiness'}
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#ffffff',
                              padding: '0.42rem 0.95rem',
                              borderRadius: '8px',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <FileCheck size={13} />
                            <span>{isAr ? 'فحص العقد' : 'Audit'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RECENT WIP EXPENSES & MATERIALS */}
          {activeWorkbenchTab === 'recent_expenses' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                  {isAr 
                    ? 'آخر فواتير ومصروفات خامات المباني المقيدة على المشاريع (حساب 150000 / 151000)' 
                    : 'Recent verified project WIP expenses, materials, and contractor invoices'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenProjectExpenses}
                  title={isAr ? 'تسجيل فاتورة خامات أو مصاريف مقاول جديدة وحفظها بالخزينة' : 'Log new project WIP expense'}
                  style={{
                    background: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Plus size={12} />
                  <span>{isAr ? '+ تسجيل فاتورة خامات جديدة' : '+ Log Expense'}</span>
                </button>
              </div>

              {recentPropertyCosts.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <HardHat size={32} color="#b45309" style={{ margin: '0 auto 0.65rem auto', opacity: 0.8 }} />
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                    {isAr ? 'لا توجد فواتير أو مصاريف مسجلة مطابقة للبحث' : 'No recent expenses match search'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {paginatedPropertyCosts.map(cost => {
                    const prop = properties.find(p => p.id === cost.property_id);

                    return (
                      <div 
                        key={cost.item_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1.15rem',
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '12px',
                          gap: '1rem',
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cost.item_name_ar}
                            </span>
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              padding: '0.08rem 0.4rem',
                              borderRadius: '4px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#475569',
                              flexShrink: 0
                            }}>
                              {cost.category === 'civil_structure' ? (isAr ? 'خرسانات وهيكل' : 'Structure') :
                               cost.category === 'mep_infrastructure' ? (isAr ? 'كهروميكانيك' : 'MEP') :
                               cost.category === 'finishing_interior' ? (isAr ? 'تشطيبات' : 'Finishing') :
                               cost.category === 'taxes_fees' ? (isAr ? 'ضرائب وتأمينات' : 'Taxes') :
                               cost.category === 'permits_engineering' ? (isAr ? 'تراخيص ورسوم' : 'Permits') :
                               (isAr ? 'مصاريف موقع' : 'Site WIP')}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>{prop?.title_ar || (isAr ? 'مشروع عقاري' : 'Project')}</span>
                            <span>•</span>
                            <span>{cost.supplier_contractor}</span>
                            {cost.invoice_ref && (
                              <>
                                <span>•</span>
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>فاتورة #{cost.invoice_ref}</span>
                              </>
                            )}
                            <span>•</span>
                            <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{cost.logged_date}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              {D(cost.total_cost_egp).formatEGP(isAr)}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#047857', fontWeight: 700 }}>
                              {isAr ? 'محمل على المباني' : 'WIP Capitalized'}
                            </span>
                          </div>

                          {prop && onOpenAuditForProperty && (
                            <button
                              type="button"
                              onClick={() => onOpenAuditForProperty(prop)}
                              title={isAr ? 'فتح تدقيق تكاليف المشروع' : 'Open project cost audit'}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '7px',
                                padding: '0.42rem 0.75rem',
                                color: '#946f23',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {isAr ? 'تدقيق' : 'Audit'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: LIVE OPERATIONS & AUDIT STREAM */}
          {activeWorkbenchTab === 'audit_stream' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                  {isAr 
                    ? `سجل القيود المزدوجة المتوازنة بالمليم (${filteredAuditEntries.length} قيد مسجل) — ترحيل لحظي مباشر` 
                    : `Verified chronological stream of double-entry postings (${filteredAuditEntries.length} entries)`}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('ledger')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#059669',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{isAr ? 'فتح دفتر الأستاذ العام الكامل' : 'Open full general ledger'}</span>
                  <ArrowLeft size={12} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
                </button>
              </div>

              {filteredAuditEntries.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <Activity size={32} color="#059669" style={{ margin: '0 auto 0.65rem auto', opacity: 0.8 }} />
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                    {isAr ? 'لا توجد قيود مسجلة مطابقة لمعايير البحث' : 'No journal entries match search'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {paginatedAuditEntries.map(je => {
                    const debitTotal = je.lines?.reduce((acc, l) => acc.plus(l.debit_amount || '0'), D(0)) || D(0);

                    return (
                      <div
                        key={je.entry_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1.15rem',
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '12px',
                          gap: '1rem',
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <span style={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 800,
                              color: '#946f23',
                              background: 'rgba(184, 144, 62, 0.1)',
                              border: '1px solid rgba(184, 144, 62, 0.25)',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '5px',
                              fontSize: '0.72rem'
                            }}>
                              {je.entry_number}
                            </span>
                            <span style={{
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {localizeJournalDescription(je.description, isAr)}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.73rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <UserCheck size={11} color="#946f23" />
                              <span>{je.created_by || 'ADMIN'}</span>
                            </span>
                            <span>•</span>
                            <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums' }}>{je.entry_date}</span>
                            {je.source_module && (
                              <>
                                <span>•</span>
                                <span style={{
                                  fontSize: '0.64rem',
                                  padding: '0.05rem 0.35rem',
                                  borderRadius: '4px',
                                  background: '#f1f5f9',
                                  color: '#475569'
                                }}>
                                  {je.source_module}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                          <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              {debitTotal.formatEGP(isAr)}
                            </div>
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              color: '#15803d',
                              background: '#f0fdf4',
                              border: '1px solid rgba(22, 163, 74, 0.25)',
                              padding: '0.08rem 0.4rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}>
                              <ShieldCheck size={10} />
                              <span>{isAr ? 'مُعتمد ومحمي بالمليم' : 'Verified'}</span>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onNavigateToTab('ledger')}
                            title={isAr ? 'الانتقال لدفتر الأستاذ العام لمراجعة قيود اليومية الكاملة' : 'View in General Ledger'}
                            style={{
                              background: '#f8fafc',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              padding: '0.42rem 0.75rem',
                              borderRadius: '7px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Scale size={13} />
                            <span>{isAr ? 'مراجعة في اليومية' : 'View Ledger'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workbench Pagination Bar */}
        <div style={{ padding: '0 1.4rem 1.1rem 1.4rem' }}>
          <ZFPagination
            currentPage={workbenchPage}
            totalPages={Math.ceil(totalActiveWorkbenchItems / workbenchPageSize) || 1}
            totalItems={totalActiveWorkbenchItems}
            pageSize={workbenchPageSize}
            onPageChange={setWorkbenchPage}
            onPageSizeChange={(newSize) => {
              setWorkbenchPageSize(newSize);
              setWorkbenchPage(1);
            }}
            pageSizeOptions={[8, 15, 30, 50]}
            isAr={isAr}
            itemLabel={{
              ar: activeWorkbenchTab === 'audit_stream' ? 'قيد محاسبي' : 'معاملة',
              en: 'records'
            }}
          />
        </div>
      </div>

      {/* 8. POPUP MODAL: QUICK EXPENSE & WIP DISBURSEMENT LOGGER */}
      {isExpenseModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem',
            direction: isAr ? 'rtl' : 'ltr'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsExpenseModalOpen(false);
          }}
        >
          <div 
            id="contextual-direct-logger"
            ref={loggerRef}
            role="dialog"
            aria-modal="true"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '660px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 65px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.04)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: expensePaymentSource === '101000'
                    ? 'rgba(16, 185, 129, 0.12)' 
                    : expensePaymentSource === '102000'
                      ? 'rgba(37, 99, 235, 0.12)'
                      : 'rgba(217, 119, 6, 0.12)',
                  color: expensePaymentSource === '101000'
                    ? '#059669'
                    : expensePaymentSource === '102000'
                      ? '#2563eb'
                      : '#d97706',
                  border: `1px solid ${
                    expensePaymentSource === '101000'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : expensePaymentSource === '102000'
                        ? 'rgba(37, 99, 235, 0.3)'
                        : 'rgba(217, 119, 6, 0.3)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {expensePaymentSource === '101000' ? (
                    <DollarSign size={22} />
                  ) : expensePaymentSource === '102000' ? (
                    <Smartphone size={22} />
                  ) : (
                    <HardHat size={22} />
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {isAr ? 'تسجيل مصاريف وخامات المشروع' : 'Record Project Expenses & Materials'}
                  </h3>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                    {isAr 
                      ? 'تسجيل فواتير وخامات ومصنعيات البناء لحساب العمارة' 
                      : 'Record construction materials, contractor wages, and site costs'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Disbursal / Settlement Method Selector (3-way with Interactive Hover Explanations) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>{isAr ? 'الفلوس اتدفعت إزاي؟' : 'Payment Method:'}</span>
                </label>
                <span style={{ fontSize: '0.66rem', color: '#946f23', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Info size={12} />
                  <span>{isAr ? 'قف على أي طريقة لمعرفة معناها وتأثيرها' : 'Hover over any option for explanation'}</span>
                </span>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                background: '#f1f5f9',
                borderRadius: '10px',
                padding: '0.25rem',
                gap: '0.25rem',
                position: 'relative'
              }}>
                {/* 1. Cash Safe Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setExpensePaymentSource('101000')}
                    onMouseEnter={() => setHoveredPaymentTooltip('101000')}
                    onMouseLeave={() => setHoveredPaymentTooltip(null)}
                    style={{
                      width: '100%',
                      background: expensePaymentSource === '101000' ? '#ffffff' : 'transparent',
                      color: expensePaymentSource === '101000' ? '#059669' : '#64748b',
                      border: expensePaymentSource === '101000' ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                      borderRadius: '8px',
                      padding: '0.45rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: expensePaymentSource === '101000' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <DollarSign size={13} />
                    <span>{isAr ? 'كاش من الخزنة' : 'Cash Safe'}</span>
                  </button>

                  {/* Tooltip Popup for 101000 */}
                  {hoveredPaymentTooltip === '101000' && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      [isAr ? 'right' : 'left']: 0,
                      width: '270px',
                      background: '#ffffff',
                      border: '1.5px solid #10b981',
                      borderRadius: '10px',
                      padding: '0.65rem 0.8rem',
                      boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(16, 185, 129, 0.12)',
                      zIndex: 9999,
                      textAlign: isAr ? 'right' : 'left',
                      pointerEvents: 'none',
                      direction: isAr ? 'rtl' : 'ltr'
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        [isAr ? 'right' : 'left']: '1.5rem',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderBottom: '6px solid #10b981'
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669', fontWeight: 800, fontSize: '0.76rem', marginBottom: '0.25rem' }}>
                        <DollarSign size={14} />
                        <span>{isAr ? '💵 نقداً من الخزينة' : 'Cash from Safe'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#334155', lineHeight: 1.45 }}>
                        {isAr 
                          ? 'المقاول أو العامل أخذ حسابه في يده فوراً «كاش» من درج الخزينة.' 
                          : 'The contractor or worker received immediate cash payment from the safe drawer.'}
                      </p>
                      <div style={{ marginTop: '0.35rem', fontSize: '0.67rem', color: '#047857', fontWeight: 700, background: '#ecfdf5', padding: '0.2rem 0.45rem', borderRadius: '5px' }}>
                        {isAr ? '💡 (رصيد الخزينة يقل فوراً في نفس اللحظة).' : '(Safe balance decreases immediately).'}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. InstaPay Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setExpensePaymentSource('102000')}
                    onMouseEnter={() => setHoveredPaymentTooltip('102000')}
                    onMouseLeave={() => setHoveredPaymentTooltip(null)}
                    style={{
                      width: '100%',
                      background: expensePaymentSource === '102000' ? '#ffffff' : 'transparent',
                      color: expensePaymentSource === '102000' ? '#2563eb' : '#64748b',
                      border: expensePaymentSource === '102000' ? '1px solid rgba(37, 99, 235, 0.3)' : 'none',
                      borderRadius: '8px',
                      padding: '0.45rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: expensePaymentSource === '102000' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Smartphone size={13} />
                    <span>{isAr ? 'تحويل إنستاباي' : 'InstaPay'}</span>
                  </button>

                  {/* Tooltip Popup for 102000 */}
                  {hoveredPaymentTooltip === '102000' && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '270px',
                      background: '#ffffff',
                      border: '1.5px solid #2563eb',
                      borderRadius: '10px',
                      padding: '0.65rem 0.8rem',
                      boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(37, 99, 235, 0.12)',
                      zIndex: 9999,
                      textAlign: isAr ? 'right' : 'left',
                      pointerEvents: 'none',
                      direction: isAr ? 'rtl' : 'ltr'
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderBottom: '6px solid #2563eb'
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb', fontWeight: 800, fontSize: '0.76rem', marginBottom: '0.25rem' }}>
                        <Smartphone size={14} />
                        <span>{isAr ? '📱 إنستاباي / بنك' : 'InstaPay / Bank'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#334155', lineHeight: 1.45 }}>
                        {isAr 
                          ? 'تم تحويل الحساب له لحظياً عن طريق تطبيق إنستاباي أو تحويل بنكي على هاتفه.' 
                          : 'Account settled instantly via InstaPay mobile application or bank transfer.'}
                      </p>
                      <div style={{ marginTop: '0.35rem', fontSize: '0.67rem', color: '#1d4ed8', fontWeight: 700, background: '#eff6ff', padding: '0.2rem 0.45rem', borderRadius: '5px' }}>
                        {isAr ? '💡 (رصيد البنك / إنستاباي يقل فوراً).' : '(Bank / InstaPay balance decreases immediately).'}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. On Credit Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setExpensePaymentSource('201000')}
                    onMouseEnter={() => setHoveredPaymentTooltip('201000')}
                    onMouseLeave={() => setHoveredPaymentTooltip(null)}
                    style={{
                      width: '100%',
                      background: expensePaymentSource === '201000' ? '#ffffff' : 'transparent',
                      color: expensePaymentSource === '201000' ? '#d97706' : '#64748b',
                      border: expensePaymentSource === '201000' ? '1px solid rgba(217, 119, 6, 0.3)' : 'none',
                      borderRadius: '8px',
                      padding: '0.45rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: expensePaymentSource === '201000' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <HardHat size={13} />
                    <span>{isAr ? 'على الحساب (بالدَّين)' : 'On Credit'}</span>
                  </button>

                  {/* Tooltip Popup for 201000 */}
                  {hoveredPaymentTooltip === '201000' && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      [isAr ? 'left' : 'right']: 0,
                      width: '320px',
                      background: '#ffffff',
                      border: '1.5px solid #d97706',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(217, 119, 6, 0.12)',
                      zIndex: 9999,
                      textAlign: isAr ? 'right' : 'left',
                      pointerEvents: 'none',
                      direction: isAr ? 'rtl' : 'ltr'
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        [isAr ? 'left' : 'right']: '1.5rem',
                        width: 0,
                        height: 0,
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderBottom: '6px solid #d97706'
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#d97706', fontWeight: 800, fontSize: '0.76rem', marginBottom: '0.25rem' }}>
                        <HardHat size={14} />
                        <span>{isAr ? '🏗️ آجل / فاتورة مقاول' : 'On Credit / Contractor Invoice'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.71rem', color: '#334155', lineHeight: 1.45 }}>
                        {isAr 
                          ? 'تاجر الحديد، محطة الخرسانة الجاهزة، أو مقاول الباطن ورّد خامات أو نفّذ مرحلة في العمارة اليوم، وجلب حسابه أو فاتورته.. لكن لم يأخذ فلوسه في لحظتها (اتفاق على السداد بعد أسبوع، أو بعد الصب، أو في دفعة قادمة).' 
                          : 'Supplier or contractor delivered materials or executed a phase today and presented invoice, but was not paid cash immediately (settlement deferred).'}
                      </p>
                      <div style={{ marginTop: '0.35rem', fontSize: '0.66rem', color: '#92400e', fontWeight: 700, background: '#fffbeb', padding: '0.25rem 0.45rem', borderRadius: '5px', lineHeight: 1.4 }}>
                        {isAr 
                          ? '💡 النتيجة المحاسبية: لا يخرج قرش واحد من الخزنة اليوم؛ بل يُثبت النظام أن المشروع تحمّل هذه التكلفة، وأن للمقاول أو المورّد فلوس في ذمة المكتب (حساب الموردين والمقاولين) حتى يتم سدادها له لاحقاً.' 
                          : 'Accounting effect: Zero cash leaves safe today. System capitalizes WIP cost on the property and registers liability in Accounts Payable.'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* UNIFIED FORM */}
            <form onSubmit={handleProjectCostSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              
              {/* Target Property Select (Powered by ZFCustomSelect & Filtered to Under-Construction) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>
                    {isAr ? 'اسم العمارة أو المشروع *' : 'Target Project *'}
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#946f23', fontWeight: 700 }}>
                    {isAr ? 'المشاريع اللي شغالة حالياً' : 'Active Projects'}
                  </span>
                </div>

                <ZFCustomSelect
                  value={wipPropertyId}
                  onChange={(val) => {
                    setWipPropertyId(val);
                    setExpensePropertyError('');
                  }}
                  items={propertySelectItems}
                  placeholderAr="-- اختار العمارة أو المشروع اللي بنصرف عليه --"
                  placeholderEn="-- Select Under-Construction Project --"
                  isAr={isAr}
                  hasError={!!expensePropertyError}
                  errorMessage={expensePropertyError}
                  searchable={true}
                />
              </div>

              {/* Category & Phase Selects (Using ZFCustomSelect) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                    {isAr ? 'نوع المصاريف أو الخامات *' : 'Cost Category *'}
                  </label>
                  <ZFCustomSelect
                    value={wipCategory}
                    onChange={(val) => setWipCategory(val as PropertyCostCategory)}
                    items={categorySelectItems}
                    placeholderAr="-- اختار نوع البند --"
                    isAr={isAr}
                    searchable={true}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                    {isAr ? 'مرحلة الشغل الحالية *' : 'Current Phase *'}
                  </label>
                  <ZFCustomSelect
                    value={wipPhase}
                    onChange={(val) => setWipPhase(val as PropertyLifecyclePhase)}
                    items={phaseSelectItems}
                    placeholderAr="-- اختار المرحلة --"
                    isAr={isAr}
                    searchable={false}
                  />
                </div>
              </div>

              {/* Amount Input with Tafqeet */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'المبلغ المطلوب تسجيله (جنيه مصري) *' : 'Cost Amount (EGP) *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    ref={amountInputRef}
                    type="number"
                    step="any"
                    required
                    min="1"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: isAr ? '0.6rem 0.85rem 0.6rem 3.5rem' : '0.6rem 3.5rem 0.6rem 0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    [isAr ? 'left' : 'right']: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#64748b'
                  }}>
                    {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>

                {/* Real-Time Arabic Tafqeet */}
                {expenseAmount && parseFloat(expenseAmount) > 0 && (
                  <div style={{
                    marginTop: '0.35rem',
                    fontSize: '0.72rem',
                    color: expensePaymentSource === '101000' ? '#059669' : expensePaymentSource === '102000' ? '#2563eb' : '#d97706',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <Sparkles size={12} />
                    <span>{tafqeetEGP(expenseAmount)}</span>
                  </div>
                )}
              </div>

              {/* Item description & Quick Suggestion Chips */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                    {isAr ? 'تفاصيل الصرف / اشتريت إيه؟ *' : 'Details / Notes *'}
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {isAr ? 'اختار بند جاهز أو اكتب براحتك' : 'Quick preset or custom text'}
                  </span>
                </div>

                {/* Suggestion Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                  {[
                    'توريد حديد تسليح',
                    'صبة خرسانة جاهزة',
                    'يوميات عمال ومصنعيات',
                    'مواسير وخراطيم تأسيس',
                    'تشطيب وبياض محارة',
                    'بوفيه وشاي الموقع',
                    'رسوم تراخيص'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWipItemName(preset)}
                      title={isAr ? `اختيار بند سريع: ${preset}` : `Quick select: ${preset}`}
                      style={{
                        background: wipItemName === preset ? '#0f172a' : '#f8fafc',
                        color: wipItemName === preset ? '#ffffff' : '#475569',
                        border: `1px solid ${wipItemName === preset ? '#0f172a' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <input 
                  type="text"
                  required
                  value={wipItemName}
                  onChange={e => setWipItemName(e.target.value)}
                  placeholder={isAr ? 'مثال: توريد حديد تسليح لصبة سقف الدور الثاني...' : 'e.g. Steel rebars 16mm for 2nd floor slab...'}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
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

              {/* Supplier & Invoice */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                    {isAr ? 'اسم التاجر أو المقاول (اختياري)' : 'Supplier / Contractor'}
                  </label>
                  <input 
                    type="text"
                    value={wipSupplier}
                    onChange={e => setWipSupplier(e.target.value)}
                    placeholder={isAr ? 'مثال: المعلم صبحي / تاجر الحديد' : 'Contractor Co.'}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem' }}>
                    {isAr ? 'رقم الفاتورة أو الإيصال (لو موجود)' : 'Invoice / Notice #'}
                  </label>
                  <input 
                    type="text"
                    value={wipInvoiceRef}
                    onChange={e => setWipInvoiceRef(e.target.value)}
                    placeholder="INV-081"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
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
              </div>

              {/* GL Posting Note Banner */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                color: '#64748b'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={14} color="#059669" />
                  <span>
                    {isAr 
                      ? (expensePaymentSource === '101000'
                          ? 'بيتخصم فوراً من كاش الخزنة ويتسجل على تكلفة العمارة'
                          : expensePaymentSource === '102000'
                            ? 'بيتحسب كتحويل إلكتروني ويتسجل على تكلفة العمارة'
                            : 'بيتسجل كدين للمقاول على حساب العمارة (بدون سحب كاش من الخزنة)')
                      : `GL Posting: Dr [151000] • Cr [${expensePaymentSource}]`}
                  </span>
                </div>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {isAr ? 'حسابات مضبوطة تلقائياً' : 'Balanced'}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  title={isAr ? 'إلغاء وإغلاق نافذة تسجيل المصروفات دون حفظ' : 'Cancel without saving'}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense || !expenseAmount || !wipPropertyId}
                  title={isAr ? 'حفظ وترحيل هذا البند إلى حساب تكاليف المشروع وإجراء القيد المحاسبي المزدوج' : 'Post immutable journal entry and save project expense'}
                  style={{
                    background: expensePaymentSource === '101000'
                      ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                      : expensePaymentSource === '102000'
                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.55rem 1.45rem',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: isSubmittingExpense || !expenseAmount || !wipPropertyId ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    opacity: !expenseAmount || !wipPropertyId ? 0.6 : 1,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  {isSubmittingExpense ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>
                    {isAr 
                      ? (expensePaymentSource === '101000' 
                          ? 'صرف كاش من الخزنة وحفظ' 
                          : expensePaymentSource === '102000'
                            ? 'تسجيل تحويل إنستاباي وحفظ'
                            : 'تسجيل على الحساب للمقاول وحفظ')
                      : (expensePaymentSource === '101000'
                          ? 'Disburse Cash & Post Cost'
                          : expensePaymentSource === '102000'
                            ? 'Post InstaPay Transfer'
                            : 'Post Contractor Invoice')}
                  </span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
