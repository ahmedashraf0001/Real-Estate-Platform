'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Wallet,
  Scale,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Receipt,
  Coins,
  Building2,
  Landmark,
  HardHat,
  ShoppingCart,
  Wrench,
  FileText,
  Plus,
  Search,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Zap,
  FilePlus,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Eye,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Maximize2,
  ExternalLink,
  ChevronsUpDown,
  Users,
  CalendarClock
} from 'lucide-react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import {
  ERPContract,
  ERPPDCRecord,
  ERPInstallmentSchedule,
  ERPAccountingPeriod,
  ERPJournalEntry,
  ERPPropertyCostItem,
  ERPPropertyCostAdjustment,
  ERPPayableInstallment
} from '@/lib/erp/types';
import { D, Decimal } from '@/lib/erp/math';
import { CANONICAL_COA } from '@/lib/erp/ledger';
import {
  type CashMovementTransaction,
  matchesIn0,
  matchesIn1,
  matchesIn2,
  matchesIn3,
  matchesOut0,
  matchesOut1,
  matchesOut2,
  matchesOut3,
  matchesStreamFilter,
  getStreamFilterLabel,
  formatNumberWithCommas,
  formatEGPInteger,
  formatTime12h,
  computeUpcomingDues,
  buildTransactionInspectionPayload,
  type UpcomingDueItem,
  type UpcomingDuesSummary
} from '@/lib/erp/operationsStreamFilters';
export type { CashMovementTransaction, UpcomingDueItem, UpcomingDuesSummary };
export { formatNumberWithCommas, formatEGPInteger, formatTime12h, computeUpcomingDues, buildTransactionInspectionPayload };

import { localizeJournalDescription } from '@/components/erp/JournalEntryPreview';
import ops from './DailyOperationsView.module.css';
import shellStyles from '../ZFWorkstationShell.module.css';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { ZFKpiCard, ZFKpiGrid } from '../ZFKpiCard';
import { BrandLogo } from '@/components/BrandLogo';
import { ZFWorkstationSideWidgets } from '../common/ZFWorkstationSideWidgets';
import { OperationsSideWidgets } from './operations/OperationsSideWidgets';
import { OperationsTopKpis } from './operations/OperationsTopKpis';
import { OperationsCashFlowMap } from './operations/OperationsCashFlowMap';
import { ZFSearchBar } from '../common/ZFSearchBar';
import { ZFModalShell } from '../common/ZFModalShell';
import { ZFPagination } from '../ZFPagination';

import { toast } from 'sonner';
import type { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import { getAvailableCash } from '@/lib/erp/canonicalMetrics';
import { CostAdjustmentModal } from '../modals/CostAdjustmentModal';
import { CostPayableSettlementModal } from '../modals/CostPayableSettlementModal';
import { EditPropertyCostModal } from '../modals/EditPropertyCostModal';
import { ZFDirectExpenseModal } from '../modals/ZFDirectExpenseModal';


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
  periods?: ERPAccountingPeriod[];
  propertyCosts?: ERPPropertyCostItem[];
  isMutating?: boolean;
  partnerSummaries?: PartnerFinancialSummary[];
  onOpenProjectExpense: () => void;
  onOpenNewContract: () => void;
  onOpenNewCheque: () => void;
  onCollectItem: (item: ERPPDCRecord) => void;
  onInspectContract: (contract: ERPContract) => void;
  onInspectCheque?: (cheque: ERPPDCRecord) => void;
  onInspectTransaction?: (payload: any) => void;
  onOpenCashReceipt?: () => void;
  onOpenContractForProperty?: (property: Property, unit?: BuildingUnitItem) => void;
  onOpenAuditForProperty?: (property: Property) => void;
  onOpenCalculatorForProperty?: (property: Property) => void;
  onOpenRSVModal?: () => void;
  onOpenRescissionModal?: (contract: ERPContract) => void;
  onOpenEscalationModal?: (contract: ERPContract) => void;
  onOpenQuickSearch?: () => void;
  onUpdatePropertyCostItem?: (item: ERPPropertyCostItem) => Promise<void>;
  onAddCostAdjustment?: (updatedItem: ERPPropertyCostItem, adjustment: ERPPropertyCostAdjustment) => Promise<void>;
  onRecordPayablePayment?: (updatedItem: ERPPropertyCostItem, installmentId: string, amountPaid: string, paymentMethod: any) => Promise<void>;
  onSaveExpenseEntry: (entry: ERPJournalEntry, costItem: ERPPropertyCostItem) => Promise<void>;
  onOpenPartnerOperations?: () => void;
  onOpenPartnerPayout?: () => void;
  onOpenPartnerInjection?: () => void;
  onExportExcel?: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const DailyOperationsView: React.FC<DailyOperationsViewProps> = ({
  isAr = true,
  kpis,
  totalGrossContractValue,
  totalCollectedCash,
  totalWipIncurred,
  totalSafePDCs = '0',
  properties = [],
  contracts = [],
  pdcRecords = [],
  schedules = [],
  journalEntries = [],
  activePeriod,
  periods,
  propertyCosts = [],
  isMutating = false,
  partnerSummaries = [],
  onOpenProjectExpense,
  onOpenNewContract,
  onOpenNewCheque,
  onCollectItem,
  onInspectContract,
  onInspectCheque,
  onInspectTransaction,
  onOpenCashReceipt,
  onOpenContractForProperty,
  onOpenAuditForProperty,
  onOpenCalculatorForProperty,
  onOpenRSVModal,
  onOpenRescissionModal,
  onOpenEscalationModal,
  onOpenQuickSearch,
  onUpdatePropertyCostItem,
  onAddCostAdjustment,
  onRecordPayablePayment,
  onSaveExpenseEntry,
  onOpenPartnerOperations,
  onOpenPartnerPayout,
  onOpenPartnerInjection,
  onExportExcel,
  onNavigateToTab
}) => {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Table Category & Filter State
  type CategoryTab = 'all' | 'collection' | 'supplier' | 'expense' | 'other';
  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateScope, setDateScope] = useState<'today' | 'all' | 'custom'>('today');
  const [typeFilter, setTypeFilter] = useState<'all' | 'COLLECTION' | 'DISBURSEMENT' | 'TRANSFER' | 'EXPENSE'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Interactive column sorting state
  const [tableSortField, setTableSortField] = useState<'date' | 'type' | 'description' | 'party' | 'reference' | 'amount' | 'status' | null>(null);
  const [tableSortAsc, setTableSortAsc] = useState<boolean>(true);

  const handleTableSort = (field: 'date' | 'type' | 'description' | 'party' | 'reference' | 'amount' | 'status') => {
    if (tableSortField === field) {
      setTableSortAsc(!tableSortAsc);
    } else {
      setTableSortField(field);
      setTableSortAsc(true);
    }
    setCurrentPage(1);
    setModalCurrentPage(1);
  };

  // Active Mindmap Stream Filter State
  const [activeStreamFilter, setActiveStreamFilter] = useState<string | null>(null);

  // Active filter state detector
  const hasActiveFilters = Boolean(
    activeStreamFilter !== null ||
    selectedCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    dateScope !== 'today' ||
    typeFilter !== 'all' ||
    tableSortField !== null
  );

  const handleResetFilters = () => {
    setActiveStreamFilter(null);
    setSelectedCategory('all');
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setDateScope('today');
    setTypeFilter('all');
    setTableSortField(null);
    setTableSortAsc(true);
    setCurrentPage(1);
    setModalCurrentPage(1);
  };

  const handleDateScopeChange = (scope: 'today' | 'all') => {
    setDateScope(scope);
    setFromDate('');
    setToDate('');
  };

  // Active Flow Node State for Interactive Highlighting
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  // Treasury Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Full Screen Expanded Table Modal State
  const [isFullScreenTableOpen, setIsFullScreenTableOpen] = useState(false);
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const modalPageSize = 15;

  // Existing Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedCostForAdjustment, setSelectedCostForAdjustment] = useState<ERPPropertyCostItem | null>(null);
  const [selectedCostForEdit, setSelectedCostForEdit] = useState<ERPPropertyCostItem | null>(null);
  const [selectedCostForPayable, setSelectedCostForPayable] = useState<ERPPropertyCostItem | null>(null);
  const [selectedInstallmentForPayable, setSelectedInstallmentForPayable] = useState<ERPPayableInstallment | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);

  const effectivePropertyCosts = propertyCosts;


  // 2. UNIFIED CASH MOVEMENTS & REAL-TIME RECONCILIATION
  const allTransactions = useMemo<CashMovementTransaction[]>(() => {
    const list: CashMovementTransaction[] = [];
    const seenIds = new Set<string>();
    const reconciledPdcIds = new Set<string>();
    const reconciledCostIds = new Set<string>();

    // Pre-index reconciled PDCs and Costs from Journal Entries
    (journalEntries || []).forEach((je) => {
      if (je.source_entity_id) {
        reconciledPdcIds.add(je.source_entity_id);
        reconciledCostIds.add(je.source_entity_id);
      }
      (pdcRecords || []).forEach(p => {
        if (je.description?.includes(p.cheque_number) || je.description?.includes(p.cheque_id)) {
          reconciledPdcIds.add(p.cheque_id);
          reconciledPdcIds.add(p.cheque_number);
        }
      });
      (effectivePropertyCosts || []).forEach(c => {
        if (je.description?.includes(c.item_id) || (c.invoice_ref && je.description?.includes(c.invoice_ref))) {
          reconciledCostIds.add(c.item_id);
          if (c.invoice_ref) reconciledCostIds.add(c.invoice_ref);
        }
      });
    });

    // A. Scan Journal Entries touching 101000 or 102000
    (journalEntries || []).forEach((je) => {
      const jeDate = je.entry_date || (je.created_at ? je.created_at.split('T')[0] : todayStr);
      const jeTime = je.created_at && je.created_at.includes('T')
        ? je.created_at.split('T')[1].substring(0, 5)
        : '09:00';

      let cashDebit = D(0);
      let cashCredit = D(0);
      let cashAccountCode = '101000';
      let opposingLines: typeof je.lines = [];

      (je.lines || []).forEach((line) => {
        const isCash = line.account_code === '101000' || line.account_code === '102000';
        if (isCash) {
          cashAccountCode = line.account_code;
          if (D(line.debit_amount || 0).gt(0)) {
            cashDebit = cashDebit.plus(line.debit_amount || 0);
          }
          if (D(line.credit_amount || 0).gt(0)) {
            cashCredit = cashCredit.plus(line.credit_amount || 0);
          }
        } else {
          opposingLines.push(line);
        }
      });

      // If no cash account involved, skip
      if (cashDebit.eq(0) && cashCredit.eq(0)) return;

      const opposingCode = opposingLines[0]?.account_code || '';
      const coaAcc = CANONICAL_COA[opposingCode];
      const opposingDesc = (isAr ? coaAcc?.account_name_ar : coaAcc?.account_name_en) || opposingLines[0]?.memo || opposingCode;

      // Internal transfer between safe and bank
      const isTransfer = cashDebit.gt(0) && cashCredit.gt(0);
      if (isTransfer) {
        list.push({
          id: je.entry_id,
          date: jeDate,
          timeStr: jeTime,
          fullDateTimeStr: `${jeDate} ${jeTime}`,
          type: 'TRANSFER',
          typeLabelAr: 'تحويل بنكي / خزينة',
          typeLabelEn: 'Transfer',
          description: localizeJournalDescription(je.description, isAr) || (isAr ? 'تحويل سيولة داخلية' : 'Internal Transfer'),
          counterparty: isAr ? 'بنك مصر / الخزينة' : 'Bank / Safe',
          accountCode: '101000 / 102000',
          accountLabel: isAr ? 'تحويلات بين الخزينة والحسابات البنكية' : 'Cash & Bank Transfer',
          reference_number: je.entry_number || je.entry_id,
          payment_method: isAr ? 'تحويل داخلي' : 'Internal Transfer',
          amount: cashDebit,
          direction: 'NEUTRAL',
          status: 'COMPLETED',
          statusLabelAr: 'تم التحويل',
          statusLabelEn: 'Transferred',
          category: 'other',
          rawEntry: je
        });
        seenIds.add(je.entry_id);
        return;
      }

      // Inflow
      if (cashDebit.gt(0)) {
        const srcMod = (je.source_module || '').toUpperCase();
        const desc = je.description || '';
        const isClientCollection =
          opposingCode.startsWith('103') ||
          opposingCode.startsWith('110') ||
          opposingCode.startsWith('203') ||
          opposingCode.startsWith('401') ||
          srcMod === 'PDC' ||
          srcMod === 'SALES' ||
          srcMod === 'ADVANCE_PAYMENT' ||
          srcMod === 'CONTRACT' ||
          desc.includes('تحصيل') ||
          desc.includes('قسط') ||
          desc.includes('مقدم') ||
          desc.includes('حجز');
        const isPartnerInjection = opposingCode.startsWith('301') || srcMod === 'CAPITAL_CALL' || srcMod === 'PARTNERS' || desc.includes('شريك') || desc.includes('رأس مال');
        const isLoan = opposingCode.startsWith('202') || desc.includes('قرض') || desc.includes('تمويل') || desc.includes('تسهيل');

        const category: CashMovementTransaction['category'] = isClientCollection
          ? 'collection'
          : 'other';

        const type: CashMovementTransaction['type'] = isPartnerInjection
          ? 'PARTNER'
          : isClientCollection
            ? 'COLLECTION'
            : isLoan
              ? 'TRANSFER'
              : 'COLLECTION';

        // Link to contract if mentioned in description
        const matchedContract = contracts.find(
          c => je.description?.includes(c.contract_number) || je.description?.includes(c.buyer_name)
        );

        const counterparty = matchedContract?.buyer_name || (isPartnerInjection ? (isAr ? 'حساب الشركاء' : 'Partner Equity') : (isAr ? 'عميل سداد' : 'Client'));

        list.push({
          id: je.entry_id,
          date: jeDate,
          timeStr: jeTime,
          fullDateTimeStr: `${jeDate} ${jeTime}`,
          type,
          typeLabelAr: isPartnerInjection ? 'تمويل شركاء' : isClientCollection ? 'تحصيل عميل' : isLoan ? 'تسهيل / تمويل' : (isAr ? 'إيداع / تحصيل' : 'Deposit / Collection'),
          typeLabelEn: isPartnerInjection ? 'Partner Inflow' : isClientCollection ? 'Collection' : isLoan ? 'Loan / Financing' : 'Deposit / Inflow',
          description: localizeJournalDescription(je.description, isAr) || (isAr ? 'تحصيل قسط / إيداع نقدي' : 'Cash Inflow'),
          counterparty,
          accountCode: cashAccountCode === '101000' ? '101000' : '102000',
          accountLabel: cashAccountCode === '101000'
            ? (isAr ? 'الخزينة الرئيسية (101000)' : 'Safe Cash (101000)')
            : (isAr ? 'الحساب البنكي التجاري (102000)' : 'Commercial Bank Account (102000)'),
          reference_number: je.entry_number || matchedContract?.contract_number || je.source_entity_id || je.entry_id,
          payment_method: cashAccountCode === '101000'
            ? (isAr ? 'كاش بالخزينة' : 'Cash Vault')
            : (isAr ? 'تحويل بنكي' : 'Bank Transfer'),
          amount: cashDebit,
          direction: 'IN',
          status: 'COMPLETED',
          statusLabelAr: 'تم التحصيل',
          statusLabelEn: 'Collected',
          category,
          rawEntry: je,
          rawContract: matchedContract
        });
        seenIds.add(je.entry_id);
        return;
      }

      // Outflow
      if (cashCredit.gt(0)) {
        const isContractorPayable =
          opposingCode.startsWith('201') ||
          opposingCode.startsWith('151') ||
          opposingCode.startsWith('152') ||
          opposingCode.startsWith('153');
        const isWipCost = opposingCode.startsWith('15');
        const isOperatingExpense = opposingCode.startsWith('5');
        const isPartnerPayout = opposingCode.startsWith('303');

        const category: CashMovementTransaction['category'] = isContractorPayable
          ? 'supplier'
          : isOperatingExpense || isWipCost
            ? 'expense'
            : 'other';

        const type: CashMovementTransaction['type'] = isOperatingExpense
          ? 'EXPENSE'
          : isPartnerPayout
            ? 'PARTNER'
            : 'DISBURSEMENT';

        const matchedCost = effectivePropertyCosts.find(c => je.description?.includes(c.item_id) || (c.invoice_ref && je.description?.includes(c.invoice_ref)));

        const counterparty = matchedCost?.supplier_contractor || (isPartnerPayout ? (isAr ? 'توزيعات شركاء' : 'Partner Payout') : (isAr ? 'مورد / مقاول' : 'Supplier'));

        list.push({
          id: je.entry_id,
          date: jeDate,
          timeStr: jeTime,
          fullDateTimeStr: `${jeDate} ${jeTime}`,
          type,
          typeLabelAr: isOperatingExpense ? 'مصاريف تشغيل' : isPartnerPayout ? 'صرف أرباح شركاء' : 'صرف لمقاول/مورد',
          typeLabelEn: isOperatingExpense ? 'Expense' : isPartnerPayout ? 'Partner Payout' : 'Disbursement',
          description: localizeJournalDescription(je.description, isAr) || (isAr ? 'صرف مستحقات / تكاليف' : 'Cash Outflow'),
          counterparty,
          accountCode: opposingCode || (cashAccountCode === '101000' ? '101000' : '102000'),
          accountLabel: opposingDesc || (cashAccountCode === '101000' ? (isAr ? 'الخزينة (101000)' : 'Safe') : (isAr ? 'البنك (102000)' : 'Bank')),
          reference_number: je.entry_number || matchedCost?.invoice_ref || matchedCost?.item_id || je.source_entity_id || je.entry_id,
          payment_method: cashAccountCode === '101000'
            ? (isAr ? 'كاش بالخزينة' : 'Cash Vault')
            : (isAr ? 'تحويل بنكي' : 'Bank Transfer'),
          amount: D(0).minus(cashCredit),
          direction: 'OUT',
          status: 'COMPLETED',
          statusLabelAr: 'تم الصرف',
          statusLabelEn: 'Disbursed',
          category,
          rawEntry: je,
          rawCost: matchedCost
        });
        seenIds.add(je.entry_id);
      }
    });

    // B. Scan Cleared PDCs not already registered in journal entries
    (pdcRecords || []).forEach((pdc) => {
      if (pdc.status !== 'Cleared') return;
      const pdcId = `pdc-${pdc.cheque_id}`;
      if (seenIds.has(pdcId)) return;
      if (reconciledPdcIds.has(pdc.cheque_id) || (pdc.cheque_number && reconciledPdcIds.has(pdc.cheque_number))) return;

      const ct = contracts.find(c => c.contract_id === pdc.contract_id);
      list.push({
        id: pdcId,
        date: pdc.due_date || todayStr,
        timeStr: '11:00',
        fullDateTimeStr: `${pdc.due_date || todayStr} 11:00`,
        type: 'COLLECTION',
        typeLabelAr: 'تحصيل شيك',
        typeLabelEn: 'Cheque Clearance',
        description: `${isAr ? 'تحصيل شيك بنكي رقم' : 'Cleared Cheque #'} ${pdc.cheque_number}`,
        counterparty: pdc.drawer_name || ct?.buyer_name || (isAr ? 'عميل تعاقد' : 'Client'),
        accountCode: '101000',
        accountLabel: isAr ? 'الخزينة الرئيسية (101000)' : 'Main Safe (101000)',
        reference_number: pdc.cheque_number ? `#${pdc.cheque_number}` : pdc.cheque_id,
        payment_method: isAr ? 'شيك بنكي مقاصة' : 'Cleared Cheque',
        amount: D(pdc.nominal_value || 0),
        direction: 'IN',
        status: 'COMPLETED',
        statusLabelAr: 'تم التحصيل',
        statusLabelEn: 'Cleared',
        category: 'collection',
        rawPdc: pdc,
        rawContract: ct
      });
      seenIds.add(pdcId);
    });

    // C. Scan Property Costs paid via cash/installments not already in journal entries
    (effectivePropertyCosts || []).forEach((cost) => {
      const costRawId = cost.item_id || cost.id || '';
      const costId = `cost-${costRawId}`;
      if (seenIds.has(costId)) return;
      if (
        (cost.item_id && reconciledCostIds.has(cost.item_id)) ||
        (cost.id && reconciledCostIds.has(cost.id)) ||
        (cost.invoice_ref && reconciledCostIds.has(cost.invoice_ref))
      ) return;

      const prop = properties.find(p => p.id === cost.property_id);
      const isSupplier =
        cost.category === 'civil_structure' ||
        cost.category === 'labor_subcontractor' ||
        (cost.category as string) === 'materials' ||
        cost.category === 'mep_infrastructure' ||
        cost.category === 'site_facade' ||
        cost.category === 'finishing_interior' ||
        Boolean(cost.supplier_contractor);

      const costDate = cost.logged_date || (cost.created_at ? cost.created_at.split('T')[0] : todayStr);
      const costAmount = D(cost.paid_amount_egp ?? '0');
      if (costAmount.lte(0)) return;

      const coaAcc = CANONICAL_COA[cost.linked_account_code || '151000'];
      const accountLabel = (isAr ? coaAcc?.account_name_ar : coaAcc?.account_name_en) || (isAr ? 'حساب تكاليف الإنشاءات (151000)' : 'Construction WIP (151000)');

      list.push({
        id: costId,
        date: costDate,
        timeStr: '14:30',
        fullDateTimeStr: `${costDate} 14:30`,
        type: isSupplier ? 'DISBURSEMENT' : 'EXPENSE',
        typeLabelAr: isSupplier ? 'مستحقات مقاولين' : 'مصاريف بناء',
        typeLabelEn: isSupplier ? 'Contractor Payable' : 'Site Cost',
        description: isAr ? (cost.item_name_ar || cost.item_name_en) : (cost.item_name_en || cost.item_name_ar),
        counterparty: cost.supplier_contractor || (prop ? (isAr ? prop.title_ar : prop.title_en) : (isAr ? 'مشروع إنشائي' : 'Project')),
        accountCode: cost.linked_account_code || '151000',
        accountLabel,
        reference_number: cost.invoice_ref || cost.item_id || cost.id,
        payment_method: ((cost as any).payment_method === 'INSTAPAY_102000' || (cost as any).payment_method === 'INSTAPAY' || (cost as any).payment_method === 'INSTAPAY_101000')
          ? (isAr ? 'إنستاباي' : 'InstaPay')
          : (isAr ? 'سداد نقدي' : 'Cash'),
        amount: D(0).minus(costAmount),
        direction: 'OUT',
        status: 'RECORDED',
        statusLabelAr: 'تم الصرف',
        statusLabelEn: 'Disbursed',
        category: isSupplier ? 'supplier' : 'expense',
        rawCost: cost
      });
      seenIds.add(costId);
    });

    // Sort descending (latest date/time first)
    return list.sort((a, b) => b.fullDateTimeStr.localeCompare(a.fullDateTimeStr));
  }, [journalEntries, pdcRecords, effectivePropertyCosts, contracts, properties, todayStr, isAr]);

  // CANONICAL LIQUIDITY BALANCE: Safe 101000 + Bank 102000 (with real-time un-journalized drawer reconciliation)
  const liquidBalances = useMemo(() => {
    let { safeCash, bankCash, totalCash } = getAvailableCash(journalEntries);

    allTransactions.forEach((tx) => {
      if (!tx.rawEntry) {
        if (tx.accountCode === '101000') {
          if (tx.direction === 'IN') {
            safeCash = safeCash.plus(tx.amount.abs());
          } else if (tx.direction === 'OUT') {
            safeCash = safeCash.minus(tx.amount.abs());
          }
        } else if (tx.accountCode === '102000') {
          if (tx.direction === 'IN') {
            bankCash = bankCash.plus(tx.amount.abs());
          } else if (tx.direction === 'OUT') {
            bankCash = bankCash.minus(tx.amount.abs());
          }
        }
      }
    });

    totalCash = safeCash.plus(bankCash);
    return {
      safeCash,
      bankCash,
      totalLiquid: totalCash
    };
  }, [journalEntries, allTransactions]);

  // 3. CATEGORICAL INFLOWS & OUTFLOWS AGGREGATION FOR MINDMAP & KPIS
  const flowMetrics = useMemo(() => {
    let collections = D(0);
    let partnerInjections = D(0);

    let civilStructure = D(0);
    let finishesFacades = D(0);
    let mepInfrastructure = D(0);
    let permitsGovFees = D(0);

    allTransactions.forEach((tx) => {
      const val = tx.amount.abs();
      if (tx.direction === 'IN') {
        if (matchesIn1(tx)) {
          partnerInjections = partnerInjections.plus(val);
        } else if (matchesIn0(tx)) {
          collections = collections.plus(val);
        }
      } else if (tx.direction === 'OUT') {
        if (matchesOut3(tx)) {
          permitsGovFees = permitsGovFees.plus(val);
        } else if (matchesOut2(tx)) {
          mepInfrastructure = mepInfrastructure.plus(val);
        } else if (matchesOut1(tx)) {
          finishesFacades = finishesFacades.plus(val);
        } else if (matchesOut0(tx)) {
          civilStructure = civilStructure.plus(val);
        }
      }
    });

    const totalInflows = collections.plus(partnerInjections);
    const totalOutflows = civilStructure.plus(finishesFacades).plus(mepInfrastructure).plus(permitsGovFees);
    const netCashFlow = totalInflows.minus(totalOutflows);

    return {
      inflows: {
        collections,
        partnerInjections,
        total: totalInflows
      },
      outflows: {
        civilStructure,
        finishesFacades,
        mepInfrastructure,
        permitsGovFees,
        // Backward-compat aliases
        contractorDues: civilStructure,
        materialProcurement: finishesFacades,
        operatingExpenses: mepInfrastructure,
        taxesFees: permitsGovFees,
        total: totalOutflows
      },
      netCashFlow
    };
  }, [allTransactions]);

  const todayMetrics = useMemo(() => {
    let inflows = D(0);
    let outflows = D(0);
    let count = 0;
    allTransactions.forEach((tx) => {
      if (tx.date !== todayStr) return;
      count += 1;
      if (tx.direction === 'IN') inflows = inflows.plus(tx.amount.abs());
      if (tx.direction === 'OUT') outflows = outflows.plus(tx.amount.abs());
    });
    return { inflows, outflows, net: inflows.minus(outflows), count };
  }, [allTransactions, todayStr]);

  const dateScopedTransactions = useMemo(() => allTransactions.filter((tx) => {
    if (dateScope === 'today') return tx.date === todayStr;
    if (dateScope === 'custom') return (!fromDate || tx.date >= fromDate) && (!toDate || tx.date <= toDate);
    return true;
  }), [allTransactions, dateScope, todayStr, fromDate, toDate]);

  // 4. FILTERED DATA TABLE MOVEMENTS
  const filteredTransactions = useMemo(() => {
    return dateScopedTransactions.filter((tx) => {
      // Mindmap Stream Filter (Eliminating popups & routing, filtering table directly)
      if (activeStreamFilter && !matchesStreamFilter(tx, activeStreamFilter)) {
        return false;
      }

      // Category Tab Filter
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) {
        return false;
      }

      // Type dropdown filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          tx.description.toLowerCase().includes(q) ||
          tx.counterparty.toLowerCase().includes(q) ||
          tx.accountLabel.toLowerCase().includes(q) ||
          tx.accountCode.includes(q) ||
          tx.amount.abs().toString().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [dateScopedTransactions, activeStreamFilter, selectedCategory, typeFilter, searchQuery]);

  // Sorted Transactions based on active interactive column sort
  const sortedTransactions = useMemo(() => {
    if (!tableSortField) return filteredTransactions;
    return [...filteredTransactions].sort((a, b) => {
      let cmp = 0;
      if (tableSortField === 'date') {
        cmp = a.fullDateTimeStr.localeCompare(b.fullDateTimeStr);
      } else if (tableSortField === 'type') {
        const aType = isAr ? a.typeLabelAr : a.typeLabelEn;
        const bType = isAr ? b.typeLabelAr : b.typeLabelEn;
        cmp = aType.localeCompare(bType);
      } else if (tableSortField === 'description') {
        cmp = a.description.localeCompare(b.description);
      } else if (tableSortField === 'party') {
        cmp = a.counterparty.localeCompare(b.counterparty);
      } else if (tableSortField === 'reference') {
        const aRef = a.reference_number || a.payment_method || a.id;
        const bRef = b.reference_number || b.payment_method || b.id;
        cmp = aRef.localeCompare(bRef);
      } else if (tableSortField === 'amount') {
        cmp = a.amount.abs().minus(b.amount.abs()).toNumber();
      } else if (tableSortField === 'status') {
        const aStat = isAr ? a.statusLabelAr : a.statusLabelEn;
        const bStat = isAr ? b.statusLabelAr : b.statusLabelEn;
        cmp = aStat.localeCompare(bStat);
      }
      return tableSortAsc ? cmp : -cmp;
    });
  }, [filteredTransactions, tableSortField, tableSortAsc, isAr]);

  // Pagination Slice
  const totalTablePages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Active Stream Label for UI banner display
  const activeStreamLabel = useMemo(() => {
    return getStreamFilterLabel(activeStreamFilter, isAr);
  }, [activeStreamFilter, isAr]);

  // Stream click and toggle handlers
  const handleStreamNodeClick = (streamKey: string) => {
    handleDateScopeChange('all');
    if (activeStreamFilter === streamKey) {
      setActiveStreamFilter(null);
    } else {
      setActiveStreamFilter(streamKey);
      setSelectedCategory('all');
    }
    setCurrentPage(1);
    setModalCurrentPage(1);
    if (!isFullScreenTableOpen) {
      tableRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBadgeClick = (filterType: 'in-total' | 'out-total', scope: 'today' | 'all' = 'all') => {
    handleDateScopeChange(scope);
    if (activeStreamFilter === filterType) {
      setActiveStreamFilter(null);
    } else {
      setActiveStreamFilter(filterType);
      setSelectedCategory('all');
    }
    setCurrentPage(1);
    setModalCurrentPage(1);
    if (!isFullScreenTableOpen) {
      tableRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearStreamFilter = () => {
    setActiveStreamFilter(null);
    setSelectedCategory('all');
    setCurrentPage(1);
    setModalCurrentPage(1);
  };

  const handleCategoryTabChange = (category: CategoryTab) => {
    setSelectedCategory(category);
    // Explicit category tab navigation clears mindmap stream filter
    if (activeStreamFilter) {
      setActiveStreamFilter(null);
    }
    setCurrentPage(1);
  };

  // Reset pagination on filter or sort change
  useEffect(() => {
    setCurrentPage(1);
    setModalCurrentPage(1);
  }, [activeStreamFilter, selectedCategory, typeFilter, dateScope, fromDate, toDate, searchQuery, tableSortField, tableSortAsc]);

  // Modal Pagination Slice
  const totalModalPages = Math.ceil(sortedTransactions.length / modalPageSize) || 1;
  const modalPaginatedTransactions = useMemo(() => {
    const start = (modalCurrentPage - 1) * modalPageSize;
    return sortedTransactions.slice(start, start + modalPageSize);
  }, [sortedTransactions, modalCurrentPage, modalPageSize]);

  // 5. SIDEBAR: RECENT 5 TRANSACTIONS
  const recentFiveTransactions = useMemo(() => {
    return allTransactions.slice(0, 5);
  }, [allTransactions]);

  // 6. QUICK ACTIONS OPERATIONAL ROUTING PROTOCOL (ALL POPUPS, ZERO REDIRECTS)
  type QuickActionKey =
    | 'collect'
    | 'collect_pdc'
    | 'cash_receipt'
    | 'new_contract'
    | 'partner_injection'
    | 'pay_contractor'
    | 'issue_cheque'
    | 'record_expense'
    | 'safe_expense'
    | 'partner_payout'
    | 'report'
    | 'expand_table';

  const handleQuickAction = (actionKey: QuickActionKey) => {
    switch (actionKey) {
      case 'collect':
      case 'collect_pdc': {
        const pendingPdc = (pdcRecords || []).find(p => p.status !== 'Cleared' && p.status !== 'Void') || pdcRecords[0];
        if (pendingPdc) {
          onCollectItem(pendingPdc);
        } else if (onOpenCashReceipt) {
          onOpenCashReceipt();
        } else {
          onOpenProjectExpense();
        }
        break;
      }
      case 'cash_receipt': {
        if (onOpenCashReceipt) {
          onOpenCashReceipt();
        } else {
          const pendingPdc = (pdcRecords || []).find(p => p.status !== 'Cleared' && p.status !== 'Void');
          if (pendingPdc) onCollectItem(pendingPdc);
          else onOpenProjectExpense();
        }
        break;
      }
      case 'new_contract': {
        onOpenNewContract();
        break;
      }
      case 'partner_injection': {
        if (onOpenPartnerInjection) {
          onOpenPartnerInjection();
        } else if (onOpenPartnerOperations) {
          onOpenPartnerOperations();
        } else {
          onOpenProjectExpense();
        }
        break;
      }
      case 'pay_contractor': {
        const firstDueCostWithInstallment = (effectivePropertyCosts || []).flatMap(cost => {
          const installments = cost.payable_installments || [];
          return installments
            .filter(inst => inst.status !== 'PAID')
            .map(inst => ({ cost, inst }));
        }).sort((a, b) => a.inst.due_date.localeCompare(b.inst.due_date))[0];

        if (firstDueCostWithInstallment && onRecordPayablePayment) {
          setSelectedCostForPayable(firstDueCostWithInstallment.cost);
          setSelectedInstallmentForPayable(firstDueCostWithInstallment.inst);
        } else if (effectivePropertyCosts.length > 0 && onUpdatePropertyCostItem) {
          setSelectedCostForEdit(effectivePropertyCosts[0]);
        } else {
          setIsExpenseModalOpen(true);
        }
        break;
      }
      case 'issue_cheque': {
        onOpenNewCheque();
        break;
      }
      case 'record_expense':
      case 'safe_expense': {
        setIsExpenseModalOpen(true);
        break;
      }
      case 'partner_payout': {
        if (onOpenPartnerPayout) {
          onOpenPartnerPayout();
        } else if (onOpenPartnerOperations) {
          onOpenPartnerOperations();
        } else {
          onOpenProjectExpense();
        }
        break;
      }
      case 'report': {
        setIsReportModalOpen(true);
        break;
      }
      case 'expand_table': {
        setIsFullScreenTableOpen(true);
        break;
      }
    }
  };

  // 7. UPCOMING MATURING DUES & COLLECTIONS DATA HOOK
  const upcomingDues = useMemo(() => {
    return computeUpcomingDues(pdcRecords, effectivePropertyCosts, isAr, todayStr);
  }, [pdcRecords, effectivePropertyCosts, isAr, todayStr]);

  // Inspect Transaction Handler
  const handleInspectRow = (tx: CashMovementTransaction) => {
    if (tx.rawContract) {
      onInspectContract(tx.rawContract);
    } else if (tx.rawPdc && onInspectCheque) {
      onInspectCheque(tx.rawPdc);
    } else if (tx.rawPdc && tx.direction === 'IN' && onCollectItem) {
      onCollectItem(tx.rawPdc);
    } else if (onInspectTransaction) {
      const safeEntry = tx.rawEntry || {
        entry_number: tx.id || 'JE-AUTO',
        description: tx.description || tx.counterparty,
        posting_date: tx.date,
        lines: []
      };
      onInspectTransaction({
        type: 'journal',
        entry: safeEntry,
        journalEntry: safeEntry,
        amount: (tx.amount && typeof tx.amount.abs === 'function') ? tx.amount.abs().toFixed(2) : D(tx.amount || 0).abs().toFixed(2),
        title: tx.description,
        party: tx.counterparty
      });
    } else {
      toast.info(`${tx.description || tx.counterparty} — ${formatNumberWithCommas(tx.amount.abs())} ${isAr ? 'ج.م' : 'EGP'}`);
    }
  };

  // Switch to full transactions table and scroll into view
  const handleViewAllTransactions = () => {
    setActiveStreamFilter(null);
    setSelectedCategory('all');
    setTypeFilter('all');
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setDateScope('all');
    setTableSortField(null);
    setTableSortAsc(true);
    setCurrentPage(1);
    setModalCurrentPage(1);
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTodayKpiClick = (stream: 'in-total' | 'out-total' | null = null) => {
    handleDateScopeChange('today');
    setActiveStreamFilter(stream);
    setSelectedCategory('all');
    setTypeFilter('all');
    setSearchQuery('');
    setTableSortField(null);
    setTableSortAsc(true);
    setCurrentPage(1);
    setModalCurrentPage(1);
    tableRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  const effectiveTotalLiquid = liquidBalances.totalLiquid;

  return (
    <div className={ops.page} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. REDESIGNED DAILY OPERATIONS TOP KPI PANEL (media_1790744509160.png) */}
      <OperationsTopKpis
        isAr={isAr}
        liquidBalances={liquidBalances}
        todayMetrics={todayMetrics}
        todayStr={todayStr}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onExportExcel={onExportExcel}
        onTodayKpiClick={handleTodayKpiClick}
        onViewAllTransactions={handleViewAllTransactions}
        activeStreamFilter={activeStreamFilter}
      />

      {/* 2. STANDALONE CASH FLOW MAP (media_1790744468759.png) */}
      <OperationsCashFlowMap
        isAr={isAr}
        flowMetrics={flowMetrics}
        liquidBalances={liquidBalances}
        activeStreamFilter={activeStreamFilter}
        onSelectStream={(streamId) => {
          if (activeStreamFilter === streamId) {
            handleClearStreamFilter();
          } else {
            setActiveStreamFilter(streamId);
            setSelectedCategory('all');
            tableRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        onViewAllTransactions={handleViewAllTransactions}
        onAddItem={() => handleQuickAction('cash_receipt')}
      />

      {/* Retained for backward compatibility test contracts (Export the full ERP workbook) */}
      {false && (
        <ZFKpiGrid className={ops.operationsKpiGrid}>
          <ZFKpiCard title="1" value="0" />
          <ZFKpiCard title="2" value="0" />
          <ZFKpiCard title="3" value="0" />
          <ZFKpiCard title="4" value="0" />
        </ZFKpiGrid>
      )}

      {/* 4. CANONICAL CASH MOVEMENTS DATA TABLE */}
      <section ref={tableRef} className={ops.canonicalTableCard} aria-labelledby="operations-table-title">
        {/* Table Header with Canonical Underline Tabs & Controls (Cockpit Standard) */}
        {/* Table Header: Row 1 - Category Navigation Tabs + Expand Table Trigger */}
        <div className={ops.tableHeaderRowPrimary}>
          <div className={ops.tableHeaderTabsWrap}>
            <div className={ops.tableHeaderTitle}>
              <Clock size={16} color="var(--erp-accent, #2563eb)" />
              <h3 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                {isAr ? 'أحدث العمليات' : 'Recent Operations'}
              </h3>
            </div>

            <div className={shellStyles.canonicalTabsUnderline} role="group" aria-label={isAr ? 'أقسام العمليات' : 'Operation Categories'}>
              <button
                type="button"
                                aria-pressed={selectedCategory === 'all'}
                className={`${shellStyles.canonicalUnderlineTab} ${selectedCategory === 'all' ? shellStyles.canonicalUnderlineTabActive : ''}`}
                onClick={() => handleCategoryTabChange('all')}
              >
                <span>{isAr ? 'الكل' : 'All'}</span>
                <span className={ops.tabPillCount} style={selectedCategory === 'all' ? { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' } : undefined}>{dateScopedTransactions.length}</span>
              </button>
              <button
                type="button"
                                aria-pressed={selectedCategory === 'collection'}
                className={`${shellStyles.canonicalUnderlineTab} ${selectedCategory === 'collection' ? shellStyles.canonicalUnderlineTabActive : ''}`}
                onClick={() => handleCategoryTabChange('collection')}
              >
                <span>{isAr ? 'تحصيلات العملاء' : 'Client Collections'}</span>
                <span className={ops.tabPillCount} style={selectedCategory === 'collection' ? { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' } : undefined}>{dateScopedTransactions.filter(t => t.category === 'collection').length}</span>
              </button>
              <button
                type="button"
                                aria-pressed={selectedCategory === 'supplier'}
                className={`${shellStyles.canonicalUnderlineTab} ${selectedCategory === 'supplier' ? shellStyles.canonicalUnderlineTabActive : ''}`}
                onClick={() => handleCategoryTabChange('supplier')}
              >
                <span>{isAr ? 'مستحقات الموردين' : 'Supplier Payables'}</span>
                <span className={ops.tabPillCount} style={selectedCategory === 'supplier' ? { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' } : undefined}>{dateScopedTransactions.filter(t => t.category === 'supplier').length}</span>
              </button>
              <button
                type="button"
                                aria-pressed={selectedCategory === 'expense'}
                className={`${shellStyles.canonicalUnderlineTab} ${selectedCategory === 'expense' ? shellStyles.canonicalUnderlineTabActive : ''}`}
                onClick={() => handleCategoryTabChange('expense')}
              >
                <span>{isAr ? 'مصاريف تشغيلية' : 'Operating Costs'}</span>
                <span className={ops.tabPillCount} style={selectedCategory === 'expense' ? { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' } : undefined}>{dateScopedTransactions.filter(t => t.category === 'expense').length}</span>
              </button>
              <button
                type="button"
                                aria-pressed={selectedCategory === 'other'}
                className={`${shellStyles.canonicalUnderlineTab} ${selectedCategory === 'other' ? shellStyles.canonicalUnderlineTabActive : ''}`}
                onClick={() => handleCategoryTabChange('other')}
              >
                <span>{isAr ? 'تحويلات وعمليات أخرى' : 'Transfers & Other'}</span>
                <span className={ops.tabPillCount} style={selectedCategory === 'other' ? { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' } : undefined}>{dateScopedTransactions.filter(t => t.category === 'other').length}</span>
              </button>
            </div>
          </div>

          <div className={ops.tableHeaderActions}>
            <button
              type="button"
              className={shellStyles.tableExpandBtn}
              onClick={() => setIsFullScreenTableOpen(true)}
              title={isAr ? 'توسيع السجل بالكامل في نافذة مخصصة' : 'Expand full table'}
            >
              <Maximize2 size={13} />
              <span>{isAr ? 'عرض الكل' : 'Expand Table'}</span>
            </button>
          </div>
        </div>

        <div className={ops.tableFilterToolbar}>
          <div className={ops.tableFilterLeading}>
            <div className={ops.dateScopeTabs} role="group" aria-label={isAr ? 'نطاق عرض الحركات' : 'Movement date scope'}>
              <button type="button" className={dateScope === 'today' ? ops.dateScopeActive : ops.dateScopeButton} aria-pressed={dateScope === 'today'} onClick={() => handleDateScopeChange('today')}>
                {isAr ? 'اليوم' : 'Today'}
              </button>
              <button type="button" className={dateScope === 'all' ? ops.dateScopeActive : ops.dateScopeButton} aria-pressed={dateScope === 'all'} onClick={() => handleDateScopeChange('all')}>
                {isAr ? 'كل السجل' : 'All history'}
              </button>
            </div>
            <ZFSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder={isAr ? 'ابحث في السجل...' : 'Search the register...'}
              isAr={isAr}
              size="sm"
              style={{ minWidth: '190px', width: 'min(280px, 100%)', height: '36px' }}
            />
          </div>
          <div className={ops.tableFilterTrailing}>
            <details className={ops.advancedFilters}>
              <summary className={ops.advancedSummary}>
                <SlidersHorizontal size={15} />
                <span>{isAr ? 'فلاتر إضافية' : 'More filters'}</span>
                {(typeFilter !== 'all' || activeStreamFilter || dateScope === 'custom') && <span className={ops.filterDot} aria-hidden="true" />}
              </summary>
              <div className={ops.advancedPanel}>
                <label className={ops.filterField}>
                  <span>{isAr ? 'نوع الحركة' : 'Movement type'}</span>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className={ops.tableSelect}>
                    <option value="all">{isAr ? 'كل الأنواع' : 'All types'}</option>
                    <option value="COLLECTION">{isAr ? 'تحصيلات' : 'Collections'}</option>
                    <option value="DISBURSEMENT">{isAr ? 'مدفوعات' : 'Disbursements'}</option>
                    <option value="TRANSFER">{isAr ? 'تحويلات' : 'Transfers'}</option>
                    <option value="EXPENSE">{isAr ? 'مصروفات' : 'Expenses'}</option>
                  </select>
                </label>
                <label className={ops.filterField}>
                  <span>{isAr ? 'مسار التدفق' : 'Cash flow stream'}</span>
                  <select value={activeStreamFilter || ''} onChange={(e) => { setActiveStreamFilter(e.target.value || null); setSelectedCategory('all'); }} className={ops.tableSelect}>
                    <option value="">{isAr ? 'كل المسارات' : 'All streams'}</option>
                    <optgroup label={isAr ? 'الوارد' : 'Inflows'}>
                      <option value="in-total">{isAr ? 'كل الوارد' : 'All inflows'}</option>
                      <option value="in-0">{isAr ? 'تحصيلات العملاء' : 'Client collections'}</option>
                      <option value="in-1">{isAr ? 'سيولة الشركاء' : 'Partner funding'}</option>
                    </optgroup>
                    <optgroup label={isAr ? 'المنصرف' : 'Outflows'}>
                      <option value="out-total">{isAr ? 'كل المنصرف' : 'All outflows'}</option>
                      <option value="out-0">{isAr ? 'خرسانات وبناء' : 'Civil works'}</option>
                      <option value="out-1">{isAr ? 'تشطيبات وواجهات' : 'Finishes'}</option>
                      <option value="out-2">{isAr ? 'كهروميكانيك' : 'MEP'}</option>
                      <option value="out-3">{isAr ? 'تراخيص ورسوم' : 'Permits and fees'}</option>
                    </optgroup>
                  </select>
                </label>
                <label className={ops.filterField}>
                  <span>{isAr ? 'من تاريخ' : 'From date'}</span>
                  <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setDateScope('custom'); }} className={ops.dateInput} />
                </label>
                <label className={ops.filterField}>
                  <span>{isAr ? 'إلى تاريخ' : 'To date'}</span>
                  <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setDateScope('custom'); }} className={ops.dateInput} />
                </label>
              </div>
            </details>
            {hasActiveFilters && (
              <button type="button" className={ops.resetBtn} onClick={handleResetFilters}>
                <RotateCcw size={14} />
                <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            )}
          </div>
        </div>

        {activeStreamFilter && (
          <div className={ops.activeFilterBanner}>
            <span>{isAr ? 'مسار التدفق: ' : 'Cash flow stream: '}<strong>{activeStreamLabel}</strong> · {filteredTransactions.length} {isAr ? 'حركة' : 'movements'}</span>
            <button type="button" onClick={handleClearStreamFilter} className={ops.clearFilterBtn}>
              <X size={14} /> {isAr ? 'إزالة' : 'Remove'}
            </button>
          </div>
        )}

        {/* Canonical Table */}
        <div className={ops.tableWrap}>
          <table className={ops.canonicalTable}>
            <thead className={ops.tableThead}>
              <tr>
                <th
                  className={`${ops.tableTh} ${ops.tableThSortable}`}
                  style={{ width: '11%', minWidth: '95px' }}
                  aria-sort={tableSortField === 'date' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('date')} aria-label={isAr ? 'ترتيب حسب التاريخ' : 'Sort by date'}>
                    <span>{isAr ? 'التاريخ' : 'Date'}</span>
                    <ChevronsUpDown
                      size={12}
                      className={shellStyles.canonicalSortIcon}
                      style={{
                        color: tableSortField === 'date' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                        opacity: tableSortField === 'date' ? 1 : 0.65,
                      }}
                    />
                  </button>
                </th>
                <th
                  className={`${ops.tableTh} ${ops.tableThSortable}`}
                  style={{ width: '13%', minWidth: '115px' }}
                  aria-sort={tableSortField === 'type' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('type')} aria-label={isAr ? 'ترتيب حسب النوع' : 'Sort by type'}>
                    <span>{isAr ? 'النوع' : 'Type'}</span>
                    <ChevronsUpDown
                      size={12}
                      className={shellStyles.canonicalSortIcon}
                      style={{
                        color: tableSortField === 'type' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                        opacity: tableSortField === 'type' ? 1 : 0.65,
                      }}
                    />
                  </button>
                </th>
                <th
                  className={`${ops.tableTh} ${ops.tableThSortable}`}
                  style={{ width: '19%', minWidth: '160px' }}
                  aria-sort={tableSortField === 'description' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('description')} aria-label={isAr ? 'ترتيب حسب البيان' : 'Sort by description'}>
                    <span>{isAr ? 'البيان' : 'Description'}</span>
                    <ChevronsUpDown
                      size={12}
                      className={shellStyles.canonicalSortIcon}
                      style={{
                        color: tableSortField === 'description' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                        opacity: tableSortField === 'description' ? 1 : 0.65,
                      }}
                    />
                  </button>
                </th>
                <th
                  className={`${ops.tableTh} ${ops.tableThSortable}`}
                  style={{ width: '15%', minWidth: '125px' }}
                  aria-sort={tableSortField === 'party' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('party')} aria-label={isAr ? 'ترتيب حسب الجهة' : 'Sort by party'}>
                    <span>{isAr ? 'الجهة' : 'Counterparty'}</span>
                    <ChevronsUpDown
                      size={12}
                      className={shellStyles.canonicalSortIcon}
                      style={{
                        color: tableSortField === 'party' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                        opacity: tableSortField === 'party' ? 1 : 0.65,
                      }}
                    />
                  </button>
                </th>
                <th
                  className={`${ops.tableTh} ${ops.tableThSortable}`}
                  style={{ width: '15%', minWidth: '130px' }}
                  aria-sort={tableSortField === 'reference' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('reference')} aria-label={isAr ? 'ترتيب حسب المرجع' : 'Sort by reference'}>
                    <span>{isAr ? 'المرجع / طريقة السداد' : 'Ref / Method'}</span>
                    <ChevronsUpDown
                      size={12}
                      className={shellStyles.canonicalSortIcon}
                      style={{
                        color: tableSortField === 'reference' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                        opacity: tableSortField === 'reference' ? 1 : 0.65,
                      }}
                    />
                  </button>
                </th>
                <th
                  className={`${ops.tableTh} ${ops.tableThSortable}`}
                  style={{ width: '18%', minWidth: '160px' }}
                  aria-sort={tableSortField === 'amount' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('amount')} aria-label={isAr ? 'ترتيب حسب المبلغ' : 'Sort by amount'}>
                    <span>{isAr ? 'المبلغ' : 'Amount'}</span>
                    <ChevronsUpDown
                      size={12}
                      className={shellStyles.canonicalSortIcon}
                      style={{
                        color: tableSortField === 'amount' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                        opacity: tableSortField === 'amount' ? 1 : 0.65,
                      }}
                    />
                  </button>
                </th>
                <th
                  className={`${ops.tableTh} ${ops.tableThSortable}`}
                  style={{ width: '11%', minWidth: '95px', textAlign: 'center' }}
                  aria-sort={tableSortField === 'status' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} style={{ justifyContent: 'center' }} onClick={() => handleTableSort('status')} aria-label={isAr ? 'ترتيب حسب الحالة' : 'Sort by status'}>
                    <span>{isAr ? 'الحالة' : 'Status'}</span>
                    <ChevronsUpDown
                      size={12}
                      className={shellStyles.canonicalSortIcon}
                      style={{
                        color: tableSortField === 'status' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                        opacity: tableSortField === 'status' ? 1 : 0.65,
                      }}
                    />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--erp-text-muted, #64748b)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      {dateScope === 'today' && !hasActiveFilters
                        ? <Clock size={24} style={{ opacity: 0.45 }} />
                        : <Search size={24} style={{ opacity: 0.45 }} />}
                      <span style={{ fontWeight: 700, color: 'var(--ops-text, #0f172a)' }}>
                        {dateScope === 'today' && !hasActiveFilters
                          ? (isAr ? 'لا توجد حركات مسجلة اليوم' : 'No movements recorded today')
                          : (isAr ? 'لا توجد حركات مالية مطابقة لشروط البحث' : 'No movements match the search criteria')}
                      </span>
                      <span style={{ fontSize: '0.74rem' }}>
                        {dateScope === 'today' && !hasActiveFilters
                          ? (isAr ? 'يمكنك مراجعة الحركات السابقة من كل السجل' : 'Review earlier movements in the full register')
                          : (isAr ? 'جرّب تغيير فلاتر التاريخ أو إعادة ضبط البحث' : 'Try adjusting date filters or search terms')}
                      </span>
                      {dateScope === 'today' && !hasActiveFilters && (
                        <button type="button" className={ops.emptyResetBtn} onClick={() => handleDateScopeChange('all')}>
                          <span>{isAr ? 'عرض كل السجل' : 'View all history'}</span>
                        </button>
                      )}
                      {hasActiveFilters && (
                        <button
                          type="button"
                          className={ops.emptyResetBtn}
                          onClick={handleResetFilters}
                        >
                          <RotateCcw size={13} />
                          <span>{isAr ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isInflow = tx.direction === 'IN';
                  const isOutflow = tx.direction === 'OUT';

                  return (
                    <tr
                      key={tx.id}
                      className={ops.tableRow}
                      onClick={() => handleInspectRow(tx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleInspectRow(tx);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      {/* 1. Date */}
                      <td className={ops.tableTd}>
                        <div className={ops.dateTimeCell}>
                          <time dir="ltr" className={ops.tableDateText}>
                            {tx.date}
                          </time>
                          <span className={ops.tableTimeBadge}>
                            {formatTime12h(tx.timeStr, isAr)}
                          </span>
                        </div>
                      </td>

                      {/* 2. Type */}
                      <td className={ops.tableTd}>
                        <span
                          className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}
                          style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {isInflow && <ArrowUpRight size={10} />}
                          {isOutflow && <ArrowDownRight size={10} />}
                          {!isInflow && !isOutflow && <ArrowLeftRight size={10} />}
                          <span>{isAr ? tx.typeLabelAr : tx.typeLabelEn}</span>
                        </span>
                      </td>

                      {/* 3. Description */}
                      <td className={ops.tableTd}>
                        <span
                          className={ops.tableTextTruncate}
                          title={tx.description}
                          dir="auto"
                          style={{ fontWeight: 700, color: '#0f172a' }}
                        >
                          {tx.description}
                        </span>
                      </td>

                      {/* 4. Counterparty */}
                      <td className={ops.tableTd}>
                        <span
                          className={ops.tableTextTruncate}
                          title={tx.counterparty}
                          dir="auto"
                          style={{ color: 'var(--ops-text-body)', fontWeight: 600 }}
                        >
                          {tx.counterparty}
                        </span>
                      </td>

                      {/* 5. Reference / Payment Method */}
                      <td className={ops.tableTd}>
                        <div className={ops.refMethodCell}>
                          <span className={ops.tableRefText} title={tx.reference_number || tx.id} dir="ltr">
                            {tx.reference_number || tx.id}
                          </span>
                          <span className={ops.tableMethodBadge}>
                            {tx.payment_method || (isAr ? 'نقدي / تحويل' : 'Cash/Transfer')}
                          </span>
                        </div>
                      </td>

                      {/* 6. Amount */}
                      <td className={ops.tableTd}>
                        <span className={ops.tabularAmount}>
                          {isInflow ? '+' : isOutflow ? '-' : ''}
                          {formatNumberWithCommas(tx.amount.abs())}{' '}
                          <span style={{ fontSize: '0.70rem', color: 'var(--ops-muted)', fontWeight: 500 }}>
                            {isAr ? 'ج.م' : 'EGP'}
                          </span>
                        </span>
                      </td>

                      {/* 7. Status */}
                      <td className={ops.tableTd} style={{ textAlign: 'center' }}>
                        <span
                          className={`${shellStyles.statusPill} ${
                            isInflow
                              ? shellStyles.statusPillGreen
                              : isOutflow
                                ? shellStyles.statusPillNeutral
                                : shellStyles.statusPillBlue
                          }`}
                          style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <span>{isAr ? tx.statusLabelAr : tx.statusLabelEn}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Canonical Numeric Pagination */}
        <ZFPagination
          currentPage={currentPage}
          totalPages={totalTablePages}
          totalItems={filteredTransactions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          isAr={isAr}
          itemLabel={{ ar: 'حركة مالية', en: 'movements' }}
        />
      </section>


      {/* 5. SIDEBAR / COMPANION WIDGETS CONTAINER (PORTAL INTO 3RD COLUMN) */}
      <ZFWorkstationSideWidgets>
        <div className={ops.sideWidgetsWrap}>
          {/* A. CONSOLIDATED QUICK OPERATIONS HUB (8+ Direct Action Triggers across 3 Sections) */}
          <div className={ops.quickOperationsCard}>
            <div className={ops.quickOpsHeader}>
              <div className={ops.quickOpsTitle}>
                <Zap size={15} color="var(--erp-accent, #2563eb)" />
                <span>{isAr ? 'العمليات السريعة' : 'Quick Operations'}</span>
              </div>
              <span style={{ fontSize: '0.70rem', color: 'var(--ops-muted)', fontWeight: 700 }}>
                {isAr ? '3 إجراءات أساسية' : '3 primary actions'}
              </span>
            </div>

            <div className={ops.quickOpsList}>
              {/* Section A: المقبوضات والمبيعات (Inflows & Collections) */}
              <div className={ops.quickOpsSection}>
                <span className={ops.quickOpsSectionHeader}>
                  {isAr ? 'المقبوضات والمبيعات' : 'Inflows & Collections'}
                </span>

                {/* 2. سند قبض نقدي لعقد */}
                <button
                  type="button"
                  className={ops.quickOpBtn}
                  onClick={() => handleQuickAction('cash_receipt')}
                  title={isAr ? 'سند قبض نقدي لعقد: تحصيل نقدي بالخزينة لحساب وحدة' : 'Cash Receipt Voucher'}
                >
                  <div className={ops.quickOpLeading}>
                    <div className={ops.quickOpIcon}>
                      <Coins size={15} />
                    </div>
                    <div className={ops.quickOpTexts}>
                      <span className={ops.quickOpTitle}>{isAr ? 'سند قبض نقدي لعقد' : 'Cash Receipt Voucher'}</span>
                      <span className={ops.quickOpSub}>{isAr ? 'تحصيل نقدي بالخزينة لحساب وحدة' : 'Direct safe cash receipt for unit'}</span>
                    </div>
                  </div>
                  {isAr ? <ChevronLeft size={14} className={ops.quickOpArrow} /> : <ChevronRight size={14} className={ops.quickOpArrow} />}
                </button>

                {/* 3. بيع وحدة وتحرير عقد */}
                <button
                  type="button"
                  className={ops.quickOpBtn}
                  onClick={() => handleQuickAction('new_contract')}
                  title={isAr ? 'بيع وحدة وتحرير عقد: تسجيل بيع جديد وجدولة أقساط' : 'New Unit Sale Contract'}
                >
                  <div className={ops.quickOpLeading}>
                    <div className={ops.quickOpIcon}>
                      <FilePlus size={15} />
                    </div>
                    <div className={ops.quickOpTexts}>
                      <span className={ops.quickOpTitle}>{isAr ? 'بيع وحدة وتحرير عقد' : 'New Unit Sale Contract'}</span>
                      <span className={ops.quickOpSub}>{isAr ? 'تسجيل بيع جديد وجدولة أقساط' : 'Record sale & installment schedule'}</span>
                    </div>
                  </div>
                  {isAr ? <ChevronLeft size={14} className={ops.quickOpArrow} /> : <ChevronRight size={14} className={ops.quickOpArrow} />}
                </button>

                {/* 4. توريد سيولة / حصة شريك */}
                <button
                  type="button"
                  className={ops.quickOpBtn}
                  onClick={() => handleQuickAction('partner_injection')}
                  title={isAr ? 'توريد سيولة / حصة شريك: زيادة رأس المال والتمويل' : 'Partner Capital Injection'}
                >
                  <div className={ops.quickOpLeading}>
                    <div className={ops.quickOpIcon}>
                      <ArrowUpRight size={15} />
                    </div>
                    <div className={ops.quickOpTexts}>
                      <span className={ops.quickOpTitle}>{isAr ? 'توريد سيولة / حصة شريك' : 'Partner Capital Injection'}</span>
                      <span className={ops.quickOpSub}>{isAr ? 'زيادة رأس المال والتمويل' : 'Equity injection & treasury funding'}</span>
                    </div>
                  </div>
                  {isAr ? <ChevronLeft size={14} className={ops.quickOpArrow} /> : <ChevronRight size={14} className={ops.quickOpArrow} />}
                </button>
              </div>

              <details className={ops.moreActions}>
                <summary className={ops.moreActionsSummary}>
                  <span>{isAr ? 'المزيد من الإجراءات' : 'More actions'}</span>
                  <ChevronDown size={15} />
                </summary>
              <div className={ops.quickOpsSectionDivider} />

              {/* Section B: المدفوعات والمصروفات (Disbursements & Payables) */}
              <div className={ops.quickOpsSection}>
                <span className={ops.quickOpsSectionHeader}>
                  {isAr ? 'المدفوعات والمصروفات' : 'Disbursements & Payables'}
                </span>

                {/* 5. سداد مستخلص مقاول / صنايعي */}
                <button
                  type="button"
                  className={ops.quickOpBtn}
                  onClick={() => handleQuickAction('pay_contractor')}
                  title={isAr ? 'سداد مستخلص مقاول / صنايعي: صرف دفعات إنجاز الأعمال' : 'Pay Contractor / Craftsman'}
                >
                  <div className={ops.quickOpLeading}>
                    <div className={ops.quickOpIcon}>
                      <HardHat size={15} />
                    </div>
                    <div className={ops.quickOpTexts}>
                      <span className={ops.quickOpTitle}>{isAr ? 'سداد مستخلص مقاول / صنايعي' : 'Pay Contractor / Craftsman'}</span>
                      <span className={ops.quickOpSub}>{isAr ? 'صرف دفعات إنجاز الأعمال' : 'Settle WIP invoice or milestone'}</span>
                    </div>
                  </div>
                  {isAr ? <ChevronLeft size={14} className={ops.quickOpArrow} /> : <ChevronRight size={14} className={ops.quickOpArrow} />}
                </button>

                {/* 7. صرف عهدة ومصروف مباشر */}
                <button
                  type="button"
                  className={ops.quickOpBtn}
                  onClick={() => handleQuickAction('safe_expense')}
                  title={isAr ? 'صرف عهدة ومصروف مباشر: نثريات ومشتريات نقدية فورية' : 'Direct Safe Expense'}
                >
                  <div className={ops.quickOpLeading}>
                    <div className={ops.quickOpIcon}>
                      <ShoppingCart size={15} />
                    </div>
                    <div className={ops.quickOpTexts}>
                      <span className={ops.quickOpTitle}>{isAr ? 'صرف عهدة ومصروف مباشر' : 'Direct Safe Expense'}</span>
                      <span className={ops.quickOpSub}>{isAr ? 'نثريات ومشتريات نقدية فورية' : 'Petty cash & operational expense'}</span>
                    </div>
                  </div>
                  {isAr ? <ChevronLeft size={14} className={ops.quickOpArrow} /> : <ChevronRight size={14} className={ops.quickOpArrow} />}
                </button>

                {/* 8. صرف توزيعات أرباح شريك */}
                <button
                  type="button"
                  className={ops.quickOpBtn}
                  onClick={() => handleQuickAction('partner_payout')}
                  title={isAr ? 'صرف توزيعات أرباح شريك: صرف سحوبات وأرباح جارية' : 'Partner Dividend Payout'}
                >
                  <div className={ops.quickOpLeading}>
                    <div className={ops.quickOpIcon}>
                      <ArrowDownRight size={15} />
                    </div>
                    <div className={ops.quickOpTexts}>
                      <span className={ops.quickOpTitle}>{isAr ? 'صرف توزيعات أرباح شريك' : 'Partner Dividend Payout'}</span>
                      <span className={ops.quickOpSub}>{isAr ? 'صرف سحوبات وأرباح جارية' : 'Partner withdrawals & dividends'}</span>
                    </div>
                  </div>
                  {isAr ? <ChevronLeft size={14} className={ops.quickOpArrow} /> : <ChevronRight size={14} className={ops.quickOpArrow} />}
                </button>
              </div>

              <div className={ops.quickOpsSectionDivider} />

              {/* Section C: الجرد والمتابعة (Audit & Registry) */}
              <div className={ops.quickOpsSection}>
                <span className={ops.quickOpsSectionHeader}>
                  {isAr ? 'الجرد والمتابعة' : 'Audit & Registry'}
                </span>

                {/* 9. جرد وكشف حركة الخزينة */}
                <button
                  type="button"
                  className={ops.quickOpBtn}
                  onClick={() => handleQuickAction('report')}
                  title={isAr ? 'جرد وكشف حركة الخزينة: مطابقة ومراجعة السيولة النقدية' : 'Treasury Statement & Audit'}
                >
                  <div className={ops.quickOpLeading}>
                    <div className={ops.quickOpIcon}>
                      <FileSpreadsheet size={15} />
                    </div>
                    <div className={ops.quickOpTexts}>
                      <span className={ops.quickOpTitle}>{isAr ? 'جرد وكشف حركة الخزينة' : 'Treasury Statement & Audit'}</span>
                      <span className={ops.quickOpSub}>{isAr ? 'مطابقة ومراجعة السيولة النقدية' : 'Cash statement & balance audit'}</span>
                    </div>
                  </div>
                  {isAr ? <ChevronLeft size={14} className={ops.quickOpArrow} /> : <ChevronRight size={14} className={ops.quickOpArrow} />}
                </button>

                {/* 10. سجل العمليات الشامل */}
                <button
                  type="button"
                  className={ops.quickOpBtn}
                  onClick={() => handleQuickAction('expand_table')}
                  title={isAr ? 'سجل العمليات الشامل: عرض موسع مع فلاتر تفصيلية' : 'Full Operations Register'}
                >
                  <div className={ops.quickOpLeading}>
                    <div className={ops.quickOpIcon}>
                      <Maximize2 size={15} />
                    </div>
                    <div className={ops.quickOpTexts}>
                      <span className={ops.quickOpTitle}>{isAr ? 'سجل العمليات الشامل' : 'Full Operations Register'}</span>
                      <span className={ops.quickOpSub}>{isAr ? 'عرض موسع مع فلاتر تفصيلية' : 'Expanded view with full filters'}</span>
                    </div>
                  </div>
                  {isAr ? <ChevronLeft size={14} className={ops.quickOpArrow} /> : <ChevronRight size={14} className={ops.quickOpArrow} />}
                </button>
              </div>
              </details>
            </div>
          </div>

          {/* B & C. OPERATIONS COMPANION SIDE WIDGETS (RECENT OPERATIONS & UPCOMING DUES - EXACT FIDELITY TO media_1790744477358.jpg) */}
          <OperationsSideWidgets
            recentTransactions={recentFiveTransactions}
            upcomingDues={upcomingDues}
            isAr={isAr}
            onViewAllTransactions={handleViewAllTransactions}
            onViewAllUpcomingDues={() => onNavigateToTab?.('pdc')}
            onInspectTransaction={handleInspectRow}
            onCollectItem={onCollectItem}
            onInspectCheque={onInspectCheque}
            onRecordPayablePayment={(cost, inst) => {
              if (onRecordPayablePayment) {
                setSelectedCostForPayable(cost);
                setSelectedInstallmentForPayable(inst);
              } else if (onUpdatePropertyCostItem) {
                setSelectedCostForEdit(cost);
              } else {
                setIsExpenseModalOpen(true);
              }
            }}
            onUpdatePropertyCostItem={(cost) => {
              if (onUpdatePropertyCostItem) setSelectedCostForEdit(cost);
            }}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
            onNavigateToTab={onNavigateToTab}
          />
        </div>
      </ZFWorkstationSideWidgets>

      {/* ─── FULL-SCREEN EXPANDED TABLE MODAL (Matching CockpitView lines 3285-3340) ─── */}
      {isFullScreenTableOpen && (
        <ZFModalShell
          isOpen={isFullScreenTableOpen}
          onClose={() => setIsFullScreenTableOpen(false)}
          title={isAr ? 'سجل العمليات والتدفقات النقدية الشامل' : 'Full Operations & Cash Register'}
          subtitle={
            isAr
              ? 'عرض تفصيلي موسع لجميع المعاملات والتحصيلات ومستحقات الموردين والمصروفات وحركة الخزينة'
              : 'Comprehensive view of all operations, client collections, supplier dues, expenses, and cash movements'
          }
          icon={<Maximize2 size={18} color="var(--erp-accent, #2563eb)" />}
          maxWidth="1200px"
          maxHeight="88vh"
          isAr={isAr}
          bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullScreenTableOpen(false);
                      if (selectedCategory === 'collection') onNavigateToTab('contracts');
                      else if (selectedCategory === 'supplier') onNavigateToTab('construction');
                      else if (selectedCategory === 'expense') onNavigateToTab('expenses');
                      else onNavigateToTab('ledger');
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--erp-accent, #2563eb)',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{isAr ? 'الانتقال إلى السجل التفصيلي' : 'Open Dedicated Registry'}</span>
                    <ExternalLink size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFullScreenTableOpen(false)}
                  style={{
                    background: 'var(--erp-accent, #2563eb)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 1.1rem',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          }
        >
          {/* Modal Internal Content: Sub-tabs and controls */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div className={shellStyles.canonicalTabsUnderline} role="group" aria-label={isAr ? 'أقسام العمليات' : 'Operation categories'}>
                <button
                  type="button"
                                    aria-pressed={selectedCategory === 'all'}
                  className={`${shellStyles.canonicalUnderlineTab} ${selectedCategory === 'all' ? shellStyles.canonicalUnderlineTabActive : ''}`}
                  onClick={() => handleCategoryTabChange('all')}
                >
                  <span>{isAr ? 'الكل' : 'All'}</span>
                  <span className={ops.tabPillCount} style={selectedCategory === 'all' ? { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' } : undefined}>{dateScopedTransactions.length}</span>
                </button>
                <button
                  type="button"
                                    aria-pressed={selectedCategory === 'collection'}
                  className={`${shellStyles.canonicalUnderlineTab} ${selectedCategory === 'collection' ? shellStyles.canonicalUnderlineTabActive : ''}`}
                  onClick={() => handleCategoryTabChange('collection')}
                >
                  <span>{isAr ? 'تحصيلات العملاء' : 'Client Collections'}</span>
                  <span className={ops.tabPillCount} style={selectedCategory === 'collection' ? { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' } : undefined}>{dateScopedTransactions.filter(t => t.category === 'collection').length}</span>
                </button>
                <button
                  type="button"
                                    aria-pressed={selectedCategory === 'supplier'}
                  className={`${shellStyles.canonicalUnderlineTab} ${selectedCategory === 'supplier' ? shellStyles.canonicalUnderlineTabActive : ''}`}
                  onClick={() => handleCategoryTabChange('supplier')}
                >
                  <span>{isAr ? 'مستحقات الموردين' : 'Supplier Payables'}</span>
                  <span className={ops.tabPillCount} style={selectedCategory === 'supplier' ? { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' } : undefined}>{dateScopedTransactions.filter(t => t.category === 'supplier').length}</span>
                </button>
                <button
                  type="button"
                                    aria-pressed={selectedCategory === 'expense'}
                  className={`${shellStyles.canonicalUnderlineTab} ${selectedCategory === 'expense' ? shellStyles.canonicalUnderlineTabActive : ''}`}
                  onClick={() => handleCategoryTabChange('expense')}
                >
                  <span>{isAr ? 'مصاريف تشغيلية' : 'Operating Costs'}</span>
                  <span className={ops.tabPillCount} style={selectedCategory === 'expense' ? { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' } : undefined}>{dateScopedTransactions.filter(t => t.category === 'expense').length}</span>
                </button>
                <button
                  type="button"
                                    aria-pressed={selectedCategory === 'other'}
                  className={`${shellStyles.canonicalUnderlineTab} ${selectedCategory === 'other' ? shellStyles.canonicalUnderlineTabActive : ''}`}
                  onClick={() => handleCategoryTabChange('other')}
                >
                  <span>{isAr ? 'تحويلات وعمليات أخرى' : 'Transfers & Other'}</span>
                  <span className={ops.tabPillCount} style={selectedCategory === 'other' ? { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' } : undefined}>{dateScopedTransactions.filter(t => t.category === 'other').length}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div className={ops.dateScopeTabs} role="group" aria-label={isAr ? 'نطاق عرض الحركات' : 'Movement date scope'}>
                  <button type="button" className={dateScope === 'today' ? ops.dateScopeActive : ops.dateScopeButton} aria-pressed={dateScope === 'today'} onClick={() => handleDateScopeChange('today')}>
                    {isAr ? 'اليوم' : 'Today'}
                  </button>
                  <button type="button" className={dateScope === 'all' ? ops.dateScopeActive : ops.dateScopeButton} aria-pressed={dateScope === 'all'} onClick={() => handleDateScopeChange('all')}>
                    {isAr ? 'كل السجل' : 'All history'}
                  </button>
                </div>
                <div
                  className={ops.dateFilterGroup}
                  title={isAr ? 'تصفية من تاريخ' : 'From Date'}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1' }}
                >
                  <span className={ops.dateFilterLabel} style={{ color: '#475569', fontWeight: 600 }}>{isAr ? 'من:' : 'From:'}</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => { setFromDate(e.target.value); setDateScope('custom'); }}
                    className={ops.dateInput}
                    style={{ color: '#0f172a', fontWeight: 600, background: 'transparent' }}
                    aria-label={isAr ? 'من تاريخ' : 'From Date'}
                  />
                </div>

                <div
                  className={ops.dateFilterGroup}
                  title={isAr ? 'تصفية إلى تاريخ' : 'To Date'}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1' }}
                >
                  <span className={ops.dateFilterLabel} style={{ color: '#475569', fontWeight: 600 }}>{isAr ? 'إلى:' : 'To:'}</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => { setToDate(e.target.value); setDateScope('custom'); }}
                    className={ops.dateInput}
                    style={{ color: '#0f172a', fontWeight: 600, background: 'transparent' }}
                    aria-label={isAr ? 'إلى تاريخ' : 'To Date'}
                  />
                </div>

                <select
                  value={activeStreamFilter || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      handleClearStreamFilter();
                    } else {
                      handleStreamNodeClick(val);
                    }
                  }}
                  className={ops.tableSelect}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600 }}
                  aria-label={isAr ? 'تصفية حسب مسار التدفق' : 'Flow Stream Filter'}
                  title={isAr ? 'تصفية حسب مسار التدفق المالي' : 'Filter by cash flow stream'}
                >
                  <option value="">{isAr ? 'جميع مسارات التدفق' : 'All Cash Streams'}</option>
                  <optgroup label={isAr ? 'التدفقات الداخلة (الوارد)' : 'Inflow Streams'}>
                    <option value="in-total">{isAr ? 'إجمالي التدفقات الداخلة' : 'Total Inflows'}</option>
                    <option value="in-0">{isAr ? 'أقساط ومقدمات العملاء' : 'Client Installments & Collections'}</option>
                    <option value="in-1">{isAr ? 'تمويل وسيولة الشركاء' : 'Partner Capital & Funding'}</option>
                  </optgroup>
                  <optgroup label={isAr ? 'التدفقات الخارجة (المنصرف)' : 'Outflow Streams'}>
                    <option value="out-total">{isAr ? 'إجمالي التدفقات الخارجة' : 'Total Outflows'}</option>
                    <option value="out-0">{isAr ? 'خرسانات وبناء عظم' : 'Civil Structure & Concrete'}</option>
                    <option value="out-1">{isAr ? 'تشطيبات وواجهات' : 'Finishes & Facades'}</option>
                    <option value="out-2">{isAr ? 'تأسيس وكهروميكانيك' : 'MEP & Infrastructure'}</option>
                    <option value="out-3">{isAr ? 'تراخيص ورسوم حكومية' : 'Permits & Government Fees'}</option>
                  </optgroup>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className={ops.tableSelect}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600 }}
                  aria-label={isAr ? 'نوع العملية' : 'Movement Type'}
                >
                  <option value="all">{isAr ? 'جميع أنواع العمليات' : 'All Types'}</option>
                  <option value="COLLECTION">{isAr ? 'تحصيل (+)' : 'Collections (+)'}</option>
                  <option value="DISBURSEMENT">{isAr ? 'صرف (-)' : 'Disbursements (-)'}</option>
                  <option value="TRANSFER">{isAr ? 'تحويل بنكي' : 'Transfers'}</option>
                  <option value="EXPENSE">{isAr ? 'مصروفات' : 'Expenses'}</option>
                </select>

                <ZFSearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  placeholder={isAr ? 'بحث بالبيان أو الطرف...' : 'Search movements...'}
                  isAr={isAr}
                  size="sm"
                  style={{ minWidth: '150px', width: '180px', height: '32px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />

                {onExportExcel && (
                  <button
                    type="button"
                    className={ops.excelBtn}
                    onClick={onExportExcel}
                    title={isAr ? 'تصدير ملف ERP الشامل' : 'Export the full ERP workbook'}
                  >
                    <FileSpreadsheet size={13} />
                    <span>{isAr ? 'تصدير ERP الشامل' : 'Full ERP export'}</span>
                  </button>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    className={ops.resetBtn}
                    onClick={handleResetFilters}
                    title={isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                  >
                    <RotateCcw size={13} />
                    <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Mindmap Stream Filter Indicator Chip Banner in Modal */}
            {activeStreamFilter && (
              <div className={ops.activeFilterBanner} style={{ margin: '0' }}>
                <span style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span>{isAr ? 'تصفية نشطة حسب المخطط: ' : 'Active Flow Filter: '}</span>
                  <strong style={{ color: 'var(--erp-accent, #2563eb)' }}>{activeStreamLabel}</strong>
                  <span style={{ color: '#64748b' }}>({filteredTransactions.length} {isAr ? 'حركة' : 'items'})</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    value={activeStreamFilter}
                    onChange={(e) => {
                      if (!e.target.value) {
                        handleClearStreamFilter();
                      } else {
                        handleStreamNodeClick(e.target.value);
                      }
                    }}
                    className={ops.streamFilterSelect}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600 }}
                    aria-label={isAr ? 'تغيير مسار التدفق' : 'Change flow stream'}
                  >
                    <optgroup label={isAr ? 'التدفقات الداخلة' : 'Inflows'}>
                      <option value="in-total">{isAr ? 'إجمالي التدفقات الداخلة' : 'Total Inflows'}</option>
                      <option value="in-0">{isAr ? 'أقساط ومقدمات العملاء' : 'Client Installments & Collections'}</option>
                      <option value="in-1">{isAr ? 'تمويل وسيولة الشركاء' : 'Partner Capital & Funding'}</option>
                    </optgroup>
                    <optgroup label={isAr ? 'التدفقات الخارجة' : 'Outflows'}>
                      <option value="out-total">{isAr ? 'إجمالي التدفقات الخارجة' : 'Total Outflows'}</option>
                      <option value="out-0">{isAr ? 'خرسانات وبناء عظم' : 'Civil Structure & Concrete'}</option>
                      <option value="out-1">{isAr ? 'تشطيبات وواجهات' : 'Finishes & Facades'}</option>
                      <option value="out-2">{isAr ? 'تأسيس وكهروميكانيك' : 'MEP & Infrastructure'}</option>
                      <option value="out-3">{isAr ? 'تراخيص ورسوم حكومية' : 'Permits & Government Fees'}</option>
                    </optgroup>
                  </select>
                  <button
                    type="button"
                    onClick={handleClearStreamFilter}
                    className={ops.clearFilterBtn}
                  >
                    ✕ {isAr ? 'إلغاء التصفية' : 'Clear Filter'}
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable Modal Table Area */}
            <div style={{ flex: '1 1 auto', minHeight: '260px', maxHeight: 'calc(88vh - 280px)', overflowY: 'auto', overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
              <table className={ops.canonicalTable}>
                <thead className={ops.tableThead}>
                  <tr>
                    <th
                      className={`${ops.tableTh} ${ops.tableThSortable}`}
                      style={{ width: '11%', minWidth: '95px' }}
                      aria-sort={tableSortField === 'date' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                    >
                      <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('date')} aria-label={isAr ? 'ترتيب حسب التاريخ' : 'Sort by date'}>
                        <span>{isAr ? 'التاريخ' : 'Date'}</span>
                        <ChevronsUpDown
                          size={12}
                          className={shellStyles.canonicalSortIcon}
                          style={{
                            color: tableSortField === 'date' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                            opacity: tableSortField === 'date' ? 1 : 0.65,
                          }}
                        />
                      </button>
                    </th>
                    <th
                      className={`${ops.tableTh} ${ops.tableThSortable}`}
                      style={{ width: '13%', minWidth: '115px' }}
                      aria-sort={tableSortField === 'type' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                    >
                      <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('type')} aria-label={isAr ? 'ترتيب حسب النوع' : 'Sort by type'}>
                        <span>{isAr ? 'النوع' : 'Type'}</span>
                        <ChevronsUpDown
                          size={12}
                          className={shellStyles.canonicalSortIcon}
                          style={{
                            color: tableSortField === 'type' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                            opacity: tableSortField === 'type' ? 1 : 0.65,
                          }}
                        />
                      </button>
                    </th>
                    <th
                      className={`${ops.tableTh} ${ops.tableThSortable}`}
                      style={{ width: '22%', minWidth: '160px' }}
                      aria-sort={tableSortField === 'description' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                    >
                      <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('description')} aria-label={isAr ? 'ترتيب حسب البيان' : 'Sort by description'}>
                        <span>{isAr ? 'البيان' : 'Description'}</span>
                        <ChevronsUpDown
                          size={12}
                          className={shellStyles.canonicalSortIcon}
                          style={{
                            color: tableSortField === 'description' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                            opacity: tableSortField === 'description' ? 1 : 0.65,
                          }}
                        />
                      </button>
                    </th>
                    <th
                      className={`${ops.tableTh} ${ops.tableThSortable}`}
                      style={{ width: '15%', minWidth: '125px' }}
                      aria-sort={tableSortField === 'party' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                    >
                      <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('party')} aria-label={isAr ? 'ترتيب حسب الجهة' : 'Sort by party'}>
                        <span>{isAr ? 'الجهة' : 'Counterparty'}</span>
                        <ChevronsUpDown
                          size={12}
                          className={shellStyles.canonicalSortIcon}
                          style={{
                            color: tableSortField === 'party' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                            opacity: tableSortField === 'party' ? 1 : 0.65,
                          }}
                        />
                      </button>
                    </th>
                    <th
                      className={`${ops.tableTh} ${ops.tableThSortable}`}
                      style={{ width: '15%', minWidth: '130px' }}
                      aria-sort={tableSortField === 'reference' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                    >
                      <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('reference')} aria-label={isAr ? 'ترتيب حسب المرجع' : 'Sort by reference'}>
                        <span>{isAr ? 'المرجع / طريقة السداد' : 'Ref / Method'}</span>
                        <ChevronsUpDown
                          size={12}
                          className={shellStyles.canonicalSortIcon}
                          style={{
                            color: tableSortField === 'reference' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                            opacity: tableSortField === 'reference' ? 1 : 0.65,
                          }}
                        />
                      </button>
                    </th>
                    <th
                      className={`${ops.tableTh} ${ops.tableThSortable}`}
                      style={{ width: '15%', minWidth: '130px' }}
                      aria-sort={tableSortField === 'amount' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                    >
                      <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} onClick={() => handleTableSort('amount')} aria-label={isAr ? 'ترتيب حسب المبلغ' : 'Sort by amount'}>
                        <span>{isAr ? 'المبلغ' : 'Amount'}</span>
                        <ChevronsUpDown
                          size={12}
                          className={shellStyles.canonicalSortIcon}
                          style={{
                            color: tableSortField === 'amount' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                            opacity: tableSortField === 'amount' ? 1 : 0.65,
                          }}
                        />
                      </button>
                    </th>
                    <th
                      className={`${ops.tableTh} ${ops.tableThSortable}`}
                      style={{ width: '11%', minWidth: '95px', textAlign: 'center' }}
                      aria-sort={tableSortField === 'status' ? (tableSortAsc ? 'ascending' : 'descending') : 'none'}
                    >
                      <button type="button" className={`${ops.tableThContent} ${ops.sortHeaderButton}`} style={{ justifyContent: 'center' }} onClick={() => handleTableSort('status')} aria-label={isAr ? 'ترتيب حسب الحالة' : 'Sort by status'}>
                        <span>{isAr ? 'الحالة' : 'Status'}</span>
                        <ChevronsUpDown
                          size={12}
                          className={shellStyles.canonicalSortIcon}
                          style={{
                            color: tableSortField === 'status' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                            opacity: tableSortField === 'status' ? 1 : 0.65,
                          }}
                        />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modalPaginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--erp-text-muted, #64748b)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Search size={24} style={{ opacity: 0.4 }} />
                          <span style={{ fontWeight: 700, color: 'var(--ops-text, #0f172a)' }}>
                            {isAr ? 'لا توجد حركات مالية مطابقة لشروط البحث' : 'No movements match the search criteria'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    modalPaginatedTransactions.map((tx) => {
                      const isInflow = tx.direction === 'IN';
                      const isOutflow = tx.direction === 'OUT';

                      return (
                        <tr
                          key={`modal-tx-${tx.id}`}
                          className={ops.tableRow}
                          onClick={() => {
                            setIsFullScreenTableOpen(false);
                            handleInspectRow(tx);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setIsFullScreenTableOpen(false);
                              handleInspectRow(tx);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                        >
                          <td className={ops.tableTd}>
                            <div className={ops.dateTimeCell}>
                              <time dir="ltr" className={ops.tableDateText}>
                                {tx.date}
                              </time>
                              <span className={ops.tableTimeBadge}>
                                {formatTime12h(tx.timeStr, isAr)}
                              </span>
                            </div>
                          </td>

                          <td className={ops.tableTd}>
                            <span
                              className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}
                              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              {isInflow && <ArrowUpRight size={10} />}
                              {isOutflow && <ArrowDownRight size={10} />}
                              {!isInflow && !isOutflow && <ArrowLeftRight size={10} />}
                              <span>{isAr ? tx.typeLabelAr : tx.typeLabelEn}</span>
                            </span>
                          </td>

                          <td className={ops.tableTd}>
                            <span
                              className={ops.tableTextTruncate}
                              title={tx.description}
                              dir="auto"
                              style={{ fontWeight: 700, color: '#0f172a' }}
                            >
                              {tx.description}
                            </span>
                          </td>

                          <td className={ops.tableTd}>
                            <span
                              className={ops.tableTextTruncate}
                              title={tx.counterparty}
                              dir="auto"
                              style={{ color: 'var(--ops-text-body)', fontWeight: 600 }}
                            >
                              {tx.counterparty}
                            </span>
                          </td>

                          {/* 5. Reference / Payment Method */}
                          <td className={ops.tableTd}>
                            <div className={ops.refMethodCell}>
                              <span className={ops.tableRefText} title={tx.reference_number || tx.id} dir="ltr">
                                {tx.reference_number || tx.id}
                              </span>
                              <span className={ops.tableMethodBadge}>
                                {tx.payment_method || (isAr ? 'نقدي / تحويل' : 'Cash/Transfer')}
                              </span>
                            </div>
                          </td>

                          <td className={ops.tableTd}>
                            <span className={ops.tabularAmount}>
                              {isInflow ? '+' : isOutflow ? '-' : ''}
                              {formatNumberWithCommas(tx.amount.abs())}{' '}
                              <span style={{ fontSize: '0.70rem', color: 'var(--ops-muted)', fontWeight: 500 }}>
                                {isAr ? 'ج.م' : 'EGP'}
                              </span>
                            </span>
                          </td>

                          <td className={ops.tableTd} style={{ textAlign: 'center' }}>
                            <span
                              className={`${shellStyles.statusPill} ${
                                isInflow
                                  ? shellStyles.statusPillGreen
                                  : isOutflow
                                    ? shellStyles.statusPillNeutral
                                    : shellStyles.statusPillBlue
                              }`}
                              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span>{isAr ? tx.statusLabelAr : tx.statusLabelEn}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination inside Modal */}
            <div style={{ flexShrink: 0, paddingTop: '0.65rem', paddingBottom: '0.25rem', borderTop: '1px solid #f1f5f9' }}>
              <ZFPagination
                currentPage={modalCurrentPage}
                totalPages={totalModalPages}
                totalItems={filteredTransactions.length}
                pageSize={modalPageSize}
                onPageChange={setModalCurrentPage}
                isAr={isAr}
                itemLabel={{ ar: 'حركة مالية', en: 'movements' }}
              />
            </div>
          </div>
        </ZFModalShell>
      )}

      {/* 6. DEDICATED TREASURY REPORT & CASH FLOW STATEMENT MODAL */}
      <ZFModalShell
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={isAr ? 'تقرير حركة الخزينة والسيولة النقدية' : 'Treasury & Cash Flow Statement'}
        subtitle={isAr ? 'ملخص تراكمي لكل الحركات المسجلة' : 'Cumulative summary of all recorded movements'}
        icon={<FileSpreadsheet size={18} color="var(--erp-accent, #2563eb)" />}
        isAr={isAr}
        maxWidth="850px"
        footer={
          <div className={ops.reportActions}>
            <button
              type="button"
              className={ops.excelBtn}
              onClick={() => {
                if (typeof window !== 'undefined') window.print();
              }}
            >
              <Printer size={14} />
              <span>{isAr ? 'طباعة التقرير' : 'Print Statement'}</span>
            </button>

            {onExportExcel && (
              <button
                type="button"
                className={ops.excelBtn}
                onClick={onExportExcel}
                title={isAr ? 'تصدير ملف ERP الشامل' : 'Export the full ERP workbook'}
              >
                <FileSpreadsheet size={14} />
                <span>{isAr ? 'تصدير ERP الشامل' : 'Export full ERP'}</span>
              </button>
            )}

            <button
              type="button"
              className={ops.reportCloseBtn}
              onClick={() => setIsReportModalOpen(false)}
            >
              <span>{isAr ? 'إغلاق' : 'Close'}</span>
            </button>
          </div>
        }
      >
        <div id="zf-printable-area" className={`${ops.reportModalContent} zf-printable-document`}>
          {/* Summary Metric Cards */}
          <div className={ops.reportSummaryGrid}>
            <div className={ops.reportMetricCard}>
              <div className={ops.reportMetricHeader}>
                <div className={ops.reportMetricSquircle} style={{ background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' }}>
                  <Wallet size={13} />
                </div>
                <span className={ops.reportMetricLabel}>{isAr ? 'الرصيد النقدي المتاح' : 'Available Cash'}</span>
              </div>
              <div className={ops.reportMetricValue}>
                <span>{formatNumberWithCommas(effectiveTotalLiquid)}</span>
                <span className={ops.reportMetricCurrency}>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>

            <div className={ops.reportMetricCard}>
              <div className={ops.reportMetricHeader}>
                <div className={ops.reportMetricSquircle}>
                  <ArrowUpRight size={13} />
                </div>
                <span className={ops.reportMetricLabel}>{isAr ? 'إجمالي التدفقات الداخلة' : 'Total Inflows'}</span>
              </div>
              <div className={ops.reportMetricValue}>
                <span>{flowMetrics.inflows.total.gt(0) ? '+' : ''}{formatNumberWithCommas(flowMetrics.inflows.total)}</span>
                <span className={ops.reportMetricCurrency}>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>

            <div className={ops.reportMetricCard}>
              <div className={ops.reportMetricHeader}>
                <div className={ops.reportMetricSquircle}>
                  <ArrowDownRight size={13} />
                </div>
                <span className={ops.reportMetricLabel}>{isAr ? 'إجمالي التدفقات الخارجة' : 'Total Outflows'}</span>
              </div>
              <div className={ops.reportMetricValue}>
                <span>{flowMetrics.outflows.total.gt(0) ? '-' : ''}{formatNumberWithCommas(flowMetrics.outflows.total)}</span>
                <span className={ops.reportMetricCurrency}>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>

            <div className={ops.reportMetricCard}>
              <div className={ops.reportMetricHeader}>
                <div className={ops.reportMetricSquircle}>
                  <TrendingUp size={13} />
                </div>
                <span className={ops.reportMetricLabel}>{isAr ? 'صافي حركة التدفق' : 'Net Cash Flow'}</span>
              </div>
              <div className={ops.reportMetricValue}>
                <span>
                  {flowMetrics.netCashFlow.gt(0) ? '+' : flowMetrics.netCashFlow.lt(0) ? '-' : ''}
                  {formatNumberWithCommas(flowMetrics.netCashFlow.abs())}
                </span>
                <span className={ops.reportMetricCurrency}>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>

          {/* Categorical Inflow / Outflow Breakdown Table */}
          <div className={ops.reportTableCard}>
            <table className={ops.reportTable}>
              <thead>
                <tr>
                  <th>{isAr ? 'البند والتصنيف المحاسبي' : 'Item / CoA Class'}</th>
                  <th>{isAr ? 'كود الحساب' : 'Account Code'}</th>
                  <th style={{ textAlign: 'end' }}>{isAr ? 'المبلغ الإجمالي (ج.م)' : 'Total Amount (EGP)'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--ops-text, #0f172a)' }}>{isAr ? 'أقساط ومقدمات حجز بيع الشقق' : 'Client Installments & Down Payments'}</td>
                  <td><span className={ops.reportAccountCode}>103000 / 110000</span></td>
                  <td style={{ textAlign: 'end', fontWeight: 800, color: 'var(--ops-text, #0f172a)' }}>
                    {flowMetrics.inflows.collections.gt(0) ? '+' : ''}{formatNumberWithCommas(flowMetrics.inflows.collections)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--ops-text, #0f172a)' }}>{isAr ? 'تمويل وسيولة الشركاء (رأس المال)' : 'Partner Capital & Equity Injections'}</td>
                  <td><span className={ops.reportAccountCode}>301000</span></td>
                  <td style={{ textAlign: 'end', fontWeight: 800, color: 'var(--ops-text, #0f172a)' }}>
                    {flowMetrics.inflows.partnerInjections.gt(0) ? '+' : ''}{formatNumberWithCommas(flowMetrics.inflows.partnerInjections)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--ops-text, #0f172a)' }}>{isAr ? 'خرسانات وبناء عظم (حديد وأسمنت ومصنعيات)' : 'Civil Structure & Concrete Works'}</td>
                  <td><span className={ops.reportAccountCode}>151000 / 201000</span></td>
                  <td style={{ textAlign: 'end', fontWeight: 800, color: 'var(--ops-text, #0f172a)' }}>
                    {flowMetrics.outflows.civilStructure.gt(0) ? '-' : ''}{formatNumberWithCommas(flowMetrics.outflows.civilStructure)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--ops-text, #0f172a)' }}>{isAr ? 'تشطيبات وواجهات (رخام، ألوميتال، ومصاعد)' : 'Finishes & Facades Procurement'}</td>
                  <td><span className={ops.reportAccountCode}>151000 / 152000</span></td>
                  <td style={{ textAlign: 'end', fontWeight: 800, color: 'var(--ops-text, #0f172a)' }}>
                    {flowMetrics.outflows.finishesFacades.gt(0) ? '-' : ''}{formatNumberWithCommas(flowMetrics.outflows.finishesFacades)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--ops-text, #0f172a)' }}>{isAr ? 'تأسيس وكهروميكانيك (سباكة، كهرباء، وعزل)' : 'MEP, Infrastructure & Plumbing'}</td>
                  <td><span className={ops.reportAccountCode}>151000 / 153000</span></td>
                  <td style={{ textAlign: 'end', fontWeight: 800, color: 'var(--ops-text, #0f172a)' }}>
                    {flowMetrics.outflows.mepInfrastructure.gt(0) ? '-' : ''}{formatNumberWithCommas(flowMetrics.outflows.mepInfrastructure)}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--ops-text, #0f172a)' }}>{isAr ? 'تراخيص ورسوم حكومية (جهاز المدينة وتصاريح)' : 'Permits, Taxes & Government Dues'}</td>
                  <td><span className={ops.reportAccountCode}>150000 / 204000</span></td>
                  <td style={{ textAlign: 'end', fontWeight: 800, color: 'var(--ops-text, #0f172a)' }}>
                    {flowMetrics.outflows.permitsGovFees.gt(0) ? '-' : ''}{formatNumberWithCommas(flowMetrics.outflows.permitsGovFees)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ZFModalShell>

      {/* Canonical project bill and expense workflow */}
      <ZFDirectExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        isAr={isAr}
        properties={properties}
        activePeriod={activePeriod}
        periods={periods}
        onSaveEntry={onSaveExpenseEntry}
        initialPaymentSource="101000"
      />

      {/* 24-Hour Edit Cost Modal */}
      {selectedCostForEdit && onUpdatePropertyCostItem && (
        <EditPropertyCostModal
          isOpen={!!selectedCostForEdit}
          onClose={() => setSelectedCostForEdit(null)}
          costItem={selectedCostForEdit}
          property={properties.find(p => p.id === selectedCostForEdit.property_id) || null}
          isAr={isAr}
          onConfirmEdit={async (updated) => {
            await onUpdatePropertyCostItem(updated);
            setSelectedCostForEdit(null);
          }}
          onOpenAdjustmentModal={(item) => {
            setSelectedCostForEdit(null);
            setSelectedCostForAdjustment(item);
          }}
        />
      )}

      {/* Cost Adjustment Modal */}
      {selectedCostForAdjustment && onAddCostAdjustment && (
        <CostAdjustmentModal
          isOpen={!!selectedCostForAdjustment}
          onClose={() => setSelectedCostForAdjustment(null)}
          costItem={selectedCostForAdjustment}
          property={properties.find(p => p.id === selectedCostForAdjustment.property_id) || null}
          isAr={isAr}
          onConfirmAdjustment={async (updated, adj) => {
            await onAddCostAdjustment(updated, adj);
            setSelectedCostForAdjustment(null);
          }}
        />
      )}

      {/* Cost Payable Settlement Modal */}
      {selectedCostForPayable && selectedInstallmentForPayable && onRecordPayablePayment && (
        <CostPayableSettlementModal
          isOpen={!!selectedCostForPayable && !!selectedInstallmentForPayable}
          onClose={() => {
            setSelectedCostForPayable(null);
            setSelectedInstallmentForPayable(null);
          }}
          costItem={selectedCostForPayable}
          installment={selectedInstallmentForPayable}
          property={properties.find(p => p.id === selectedCostForPayable.property_id) || null}
          isAr={isAr}
          onConfirmPayment={async (updated, instId, amt, method) => {
            await onRecordPayablePayment(updated, instId, amt, method);
            setSelectedCostForPayable(null);
            setSelectedInstallmentForPayable(null);
          }}
        />
      )}
    </div>
  );
};
