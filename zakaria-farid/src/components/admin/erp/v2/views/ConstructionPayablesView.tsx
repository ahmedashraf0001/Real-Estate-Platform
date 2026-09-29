'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  HardHat,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  UsersRound,
  Wallet,
  Banknote,
  Search,
  Clock,
  Plus,
  ArrowUpDown,
  CreditCard,
  Eye,
  Edit3,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  X,
  PieChart,
  Activity,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Download,
  Filter,
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import {
  ERPAccountingPeriod,
  ERPConstructionPurchaseOrder,
  ERPContract,
  ERPJournalEntry,
  ERPPropertyCostItem,
  ERPPayableInstallment,
  ERPPropertyCostAdjustment,
  PropertyCostCategory,
  CostPaymentTerm
} from '@/lib/erp/types';
import { D, Decimal, generateUUID } from '@/lib/erp/math';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFKpiCard, ZFKpiGrid } from '../ZFKpiCard';
import { ZFWorkstationSideWidgets, ZFWidgetCard } from '../common/ZFWorkstationSideWidgets';
import { ZFModalShell } from '../common/ZFModalShell';
import { ZFPrintDocumentLayout } from '../common/ZFPrintDocumentLayout';
import { ERPApexChart } from '../charts/ERPApexChart';
import shellStyles from '../ZFWorkstationShell.module.css';
import vStyles from './ConstructionPayablesView.module.css';
import {
  isItemWithinGracePeriod,
  getRemainingGraceHours,
  generatePayableInstallmentSchedule,
  sortPayableItems,
  PayableSortField
} from '@/lib/erp/propertyCostEngine';
import { getConstructionWIP, getPayablesAndLoans, getConstructionPayablesTelemetry, getConstructionCostSection, getConstructionSettlementOpeningBalance as calculateCostItemEffectiveTotals } from '@/lib/erp/canonicalMetrics';
import { CostPayableSettlementModal } from '../modals/CostPayableSettlementModal';
import { EditPropertyCostModal } from '../modals/EditPropertyCostModal';
import { CostAdjustmentModal } from '../modals/CostAdjustmentModal';
import { ZFDirectExpenseModal } from '../modals/ZFDirectExpenseModal';
import { ConstructionPurchaseOrderModal } from '../modals/ConstructionPurchaseOrderModal';
import { toast } from 'sonner';

export interface ConstructionPayablesViewProps {
  properties?: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  purchaseOrders?: ERPConstructionPurchaseOrder[];
  onCreatePurchaseOrder?: (order: ERPConstructionPurchaseOrder) => Promise<void>;
  contracts?: ERPContract[];
  activePeriod: ERPAccountingPeriod;
  periods?: ERPAccountingPeriod[];
  isAr?: boolean;
  isMutating?: boolean;
  onSaveExpenseEntry: (entry: ERPJournalEntry, costItem: ERPPropertyCostItem) => Promise<void>;
  onUpdatePropertyCostItem?: (item: ERPPropertyCostItem) => Promise<void>;
  onAddCostAdjustment?: (updatedItem: ERPPropertyCostItem, adjustment?: ERPPropertyCostAdjustment) => Promise<void>;
  onRecordPayablePayment?: (updatedItem: ERPPropertyCostItem, installmentId?: string, amountPaid?: string, paymentMethod?: any) => Promise<void>;
  onInspectContract?: (contract: ERPContract) => void;
  onNavigateToTab?: (tab: string) => void;
}

// Integer EGP number formatter helper (removes cents/decimals)
function formatIntegerEGP(val: number | string | Decimal): string {
  const d = val instanceof Decimal ? val : D(val || 0);
  return Math.round(d.toNumber()).toLocaleString('en-US');
}

// Compact EGP number formatter helper
function formatCompactEGP(val: number | string | Decimal, isAr = true): string {
  const d = val instanceof Decimal ? val : D(val || 0);
  const num = d.abs().toNumber();
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B ${isAr ? 'ج.م' : 'EGP'}`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M ${isAr ? 'ج.م' : 'EGP'}`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K ${isAr ? 'ج.م' : 'EGP'}`;
  }
  return `${Math.round(num).toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}`;
}

export const ConstructionPayablesView: React.FC<ConstructionPayablesViewProps> = ({
  properties = [],
  propertyCosts = [],
  purchaseOrders = [],
  onCreatePurchaseOrder,
  contracts = [],
  activePeriod,
  periods,
  isAr = true,
  isMutating = false,
  onSaveExpenseEntry,
  onUpdatePropertyCostItem,
  onAddCostAdjustment,
  onRecordPayablePayment,
  onInspectContract,
  onNavigateToTab
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const weekAheadStr = useMemo(() => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], []);
  const monthAheadStr = useMemo(() => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], []);


  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState('all');
  const [selectedPeriodRange, setSelectedPeriodRange] = useState<'last3m' | 'month' | 'all'>('last3m');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [contractorFilter, setContractorFilter] = useState('all');

  // Contractors Directory Modal State
  const [isContractorsModalOpen, setIsContractorsModalOpen] = useState(false);
  const [contractorDirSearch, setContractorDirSearch] = useState('');

  // Section Tab State
  const [activeSectionTab, setActiveSectionTab] = useState<'all' | 'overdue' | 'upcoming' | 'unscheduled' | 'paid'>('all');

  // Sorting State (Priority-first by default)
  const [sortField, setSortField] = useState<PayableSortField>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((field: PayableSortField) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevField;
      }
      setSortDirection('asc');
      return field;
    });
    setCurrentPage(1);
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawers State
  const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);
  const [expensePurpose, setExpensePurpose] = useState<'claim' | 'site'>('claim');
  const [isNewExpenseModalOpen, setIsNewExpenseModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [inspectCostItem, setInspectCostItem] = useState<ERPPropertyCostItem | null>(null);
  const [settlementTarget, setSettlementTarget] = useState<{
    costItem: ERPPropertyCostItem;
    installment: ERPPayableInstallment;
  } | null>(null);
  const [editTargetCostItem, setEditTargetCostItem] = useState<ERPPropertyCostItem | null>(null);
  const [adjustmentTargetCostItem, setAdjustmentTargetCostItem] = useState<ERPPropertyCostItem | null>(null);

  // Contractor Installment Scheduling Modal State (Button #4)
  const [isScheduleContractorModalOpen, setIsScheduleContractorModalOpen] = useState(false);
  const [scheduleSelectedCostItemId, setScheduleSelectedCostItemId] = useState<string>('');
  const [scheduleDownPayment, setScheduleDownPayment] = useState<string>('');
  const [scheduleNumTranches, setScheduleNumTranches] = useState<string>('3');
  const [scheduleFrequencyMonths, setScheduleFrequencyMonths] = useState<string>('1');
  const [scheduleFirstDueDate, setScheduleFirstDueDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Project Title Resolver Helper
  const getPropertyTitle = useCallback((propId: string) => {
    const p = properties.find(prop => prop.id === propId || prop.slug === propId);
    if (p) return isAr ? p.title_ar : p.title_en;
    return isAr ? 'مشروع غير متاح' : 'Project unavailable';
  }, [properties, isAr]);

  // Specialty Label Helper
  const getSpecialtyLabel = useCallback((category: PropertyCostCategory, itemName?: string): string => {
    if (category === 'civil_structure') return isAr ? 'أعمال خرسانية' : 'Civil & Concrete';
    if (category === 'mep_infrastructure') {
      const isPlumbing = (itemName || '').includes('مياه') || (itemName || '').includes('صرف') || (itemName || '').includes('سباكة');
      if (isPlumbing) return isAr ? 'أعمال ميكانيكا' : 'Plumbing & Mechanical';
      return isAr ? 'أعمال كهرباء' : 'Electrical Works';
    }
    if (category === 'finishing_interior') return isAr ? 'أعمال تشطيبات' : 'Interior Finishing';
    if (category === 'site_facade') return isAr ? 'لاندسكيب وواجهات' : 'Landscape & Facades';
    if (category === 'labor_subcontractor') return isAr ? 'مصنعيات مقاول باطن' : 'Subcontractor Labor';
    return isAr ? 'أخرى وتراخيص' : 'Permits & Other';
  }, [isAr]);

  const effectivePropertyCosts = propertyCosts;
  const [payablesMode, setPayablesMode] = useState<'contractors' | 'site'>('contractors');
  const telemetry = useMemo(() => getConstructionPayablesTelemetry(
    selectedProjectFilter === 'all' ? effectivePropertyCosts : effectivePropertyCosts.filter(item => item.property_id === selectedProjectFilter), todayStr
  ), [effectivePropertyCosts, selectedProjectFilter, todayStr]);

  const contractorAging = useMemo(() => getConstructionPayablesTelemetry(effectivePropertyCosts.filter(item => getConstructionCostSection(item) === 'contractors' && (selectedProjectFilter === 'all' || item.property_id === selectedProjectFilter)), todayStr), [effectivePropertyCosts, selectedProjectFilter, todayStr]);

  // --------------------------------------------------------------------------
  // 1. EXECUTIVE KPIS (Derived strictly from canonicalMetrics)
  // --------------------------------------------------------------------------
  const executiveKPIs = useMemo(() => {
    // Filter costs if a specific project is selected
    const activeCosts = selectedProjectFilter === 'all'
      ? effectivePropertyCosts
      : effectivePropertyCosts.filter(c => c.property_id === selectedProjectFilter);

    // 1. Total Construction WIP (net of adjustments)
    const totalWipCapitalized = getConstructionWIP(activeCosts);

    // 2. Canonical Contractor Payables (Account 201000)
    const canonicalPayables = getPayablesAndLoans(activeCosts);
    const totalApLiabilities = getConstructionPayablesTelemetry(activeCosts, new Date().toISOString().slice(0, 10)).outstanding;

    let totalApPaid = D(0);
    let overdueInstallmentsAmount = D(0);
    let overdueInstallmentsCount = 0;
    const distinctContractors = new Set<string>();
    let unpaidInvoicesCount = 0;

    activeCosts.forEach(item => {
      const contractorName = item.supplier_contractor?.trim();
      if (contractorName) {
        distinctContractors.add(contractorName);
      }

      const { netEffectiveCost, paidAmount, remainingAmount } = calculateCostItemEffectiveTotals(item);
      const remDec = D(remainingAmount);
      const paidDec = D(paidAmount);

      totalApPaid = totalApPaid.plus(paidDec);

      if (remDec.gt(0)) {
        unpaidInvoicesCount++;
      }

      if (item.payable_installments && item.payable_installments.length > 0) {
        item.payable_installments.forEach(inst => {
          const instAmt = D(inst.amount_egp || 0);
          const instPaid = D(inst.paid_amount_egp || 0);
          const instRem = instAmt.minus(instPaid);

          if (inst.status !== 'PAID' && instRem.gt(0) && inst.due_date && inst.due_date <= todayStr) {
            overdueInstallmentsCount++;
            overdueInstallmentsAmount = overdueInstallmentsAmount.plus(instRem);
          }
        });
      } else if (remDec.gt(0) && item.due_date && item.due_date <= todayStr) {
        overdueInstallmentsCount++;
        overdueInstallmentsAmount = overdueInstallmentsAmount.plus(remDec);
      }
    });

    const totalClaims = totalApPaid.plus(totalApLiabilities);
    const paidPercentage = totalClaims.gt(0) ? totalApPaid.div(totalClaims).times(100).toFixed(0) : '0';
    const overduePercentage = totalApLiabilities.gt(0) ? overdueInstallmentsAmount.div(totalApLiabilities).times(100).toFixed(0) : '0';

    return {
      totalWipCapitalized,
      totalApLiabilities,
      totalApPaid,
      overdueInstallmentsAmount,
      overdueInstallmentsCount,
      contractorsCount: distinctContractors.size, // Honest zero state (No hardcoded fallback)
      unpaidInvoicesCount: unpaidInvoicesCount,   // Honest zero state (No hardcoded fallback)
      remainingDues: totalApLiabilities,
      paidPercentage,
      overduePercentage
    };
  }, [effectivePropertyCosts, selectedProjectFilter, todayStr]);

  // --------------------------------------------------------------------------
  // 2. BREAKDOWN BY CONSTRUCTION SPECIALTY (Donut Chart & Legend)
  // --------------------------------------------------------------------------
  const specialtyBreakdown = useMemo(() => {
    const activeCosts = selectedProjectFilter === 'all'
      ? effectivePropertyCosts
      : effectivePropertyCosts.filter(c => c.property_id === selectedProjectFilter);

    const specialties = {
      civil: { label: isAr ? 'أعمال خرسانية' : 'Civil & Concrete', amount: D(0), color: 'var(--erp-accent, #2563eb)' },
      electro: { label: isAr ? 'أعمال ميكانيكا وكهرباء' : 'MEP & Electrical', amount: D(0), color: '#10b981' },
      finishing: { label: isAr ? 'أعمال تشطيبات' : 'Interior Finishing', amount: D(0), color: '#f59e0b' },
      landscape: { label: isAr ? 'أعمال لاندسكيب' : 'Landscape & Facades', amount: D(0), color: '#0284c7' },
      other: { label: isAr ? 'أخرى' : 'Other / Permits', amount: D(0), color: '#64748b' }
    };

    activeCosts.forEach(item => {
      const { netEffectiveCost, remainingAmount } = calculateCostItemEffectiveTotals(item);
      const amt = D(remainingAmount).gt(0) ? D(remainingAmount) : D(netEffectiveCost);
      const cat = item.category;

      if (cat === 'civil_structure' || (cat === 'labor_subcontractor' && (item.item_name_ar || '').includes('هيكل'))) {
        specialties.civil.amount = specialties.civil.amount.plus(amt);
      } else if (cat === 'mep_infrastructure') {
        specialties.electro.amount = specialties.electro.amount.plus(amt);
      } else if (cat === 'finishing_interior') {
        specialties.finishing.amount = specialties.finishing.amount.plus(amt);
      } else if (cat === 'site_facade') {
        specialties.landscape.amount = specialties.landscape.amount.plus(amt);
      } else {
        specialties.other.amount = specialties.other.amount.plus(amt);
      }
    });

    const total = Object.values(specialties).reduce((sum, s) => sum.plus(s.amount), D(0));

    return {
      items: Object.entries(specialties).map(([key, s]) => {
        const pct = total.gt(0) ? s.amount.div(total).times(100).toNumber() : 0;
        return {
          key,
          label: s.label,
          amount: s.amount,
          amountFormatted: `${formatIntegerEGP(s.amount)} ${isAr ? 'ج.م' : 'EGP'}`,
          percentage: pct.toFixed(0),
          color: s.color
        };
      }),
      total
    };
  }, [effectivePropertyCosts, selectedProjectFilter, isAr]);

  // Derived Paid This Month for Side Widget
  const currentYearMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const paidThisMonth = useMemo(() => {
    let sum = D(0);
    effectivePropertyCosts.forEach(item => {
      if (item.payable_installments && item.payable_installments.length > 0) {
        item.payable_installments.forEach(inst => {
          if (inst.status === 'PAID' && inst.payment_date && inst.payment_date.startsWith(currentYearMonth)) {
            sum = sum.plus(D(inst.paid_amount_egp || 0));
          }
        });
      } else if (item.logged_date && item.logged_date.startsWith(currentYearMonth)) {
        sum = sum.plus(D(item.paid_amount_egp || 0));
      }
    });
    return sum;
  }, [effectivePropertyCosts, currentYearMonth, executiveKPIs.totalApPaid]);

  // Derived Top Contractors by Dues for Side Widget
  const topContractors = useMemo(() => {
    const map = new Map<string, Decimal>();
    effectivePropertyCosts.forEach(item => {
      if (getConstructionCostSection(item) !== 'contractors' || (selectedProjectFilter !== 'all' && item.property_id !== selectedProjectFilter)) return;
      const name = item.supplier_contractor?.trim();
      if (!name) return;
      const { remainingAmount } = calculateCostItemEffectiveTotals(item);
      const rem = D(remainingAmount);
      if (rem.gt(0)) {
        map.set(name, (map.get(name) || D(0)).plus(rem));
      }
    });

    return Array.from(map.entries())
      .map(([name, dues]) => ({ name, dues }))
      .sort((a, b) => (b.dues.gt(a.dues) ? 1 : -1))
      .slice(0, 5);
  }, [effectivePropertyCosts, selectedProjectFilter]);

  // Comprehensive Contractors & Suppliers Directory Data
  const contractorsDirectory = useMemo(() => {
    const map = new Map<string, {
      projectNames: Set<string>;
      specialties: Set<string>;
      claimCount: number;
      totalContracted: Decimal;
      totalPaid: Decimal;
      totalRemaining: Decimal;
    }>();

    effectivePropertyCosts.forEach(item => {
      const rawName = item.supplier_contractor?.trim();
      if (!rawName) return;
      const entry = map.get(rawName) || {
        projectNames: new Set<string>(),
        specialties: new Set<string>(),
        claimCount: 0,
        totalContracted: D(0),
        totalPaid: D(0),
        totalRemaining: D(0)
      };

      entry.claimCount += 1;
      const { netEffectiveCost, paidAmount, remainingAmount } = calculateCostItemEffectiveTotals(item);
      entry.totalContracted = entry.totalContracted.plus(D(netEffectiveCost));
      entry.totalPaid = entry.totalPaid.plus(D(paidAmount));
      entry.totalRemaining = entry.totalRemaining.plus(D(remainingAmount));

      const proj = getPropertyTitle(item.property_id);
      if (proj) entry.projectNames.add(proj);
      const spec = getSpecialtyLabel(item.category, item.item_name_ar);
      if (spec) entry.specialties.add(spec);

      map.set(rawName, entry);
    });

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      projectNames: Array.from(data.projectNames),
      specialties: Array.from(data.specialties),
      claimCount: data.claimCount,
      totalContracted: data.totalContracted,
      totalPaid: data.totalPaid,
      totalRemaining: data.totalRemaining,
      hasDues: data.totalRemaining.gt(0)
    })).sort((a, b) => (b.totalRemaining.gt(a.totalRemaining) ? 1 : b.totalContracted.gt(a.totalContracted) ? 1 : -1));
  }, [effectivePropertyCosts, getPropertyTitle, getSpecialtyLabel]);

  const contractorsTotals = useMemo(() => {
    let aggregateContracted = D(0);
    let aggregatePaid = D(0);
    let aggregateRemaining = D(0);

    contractorsDirectory.forEach(c => {
      aggregateContracted = aggregateContracted.plus(c.totalContracted);
      aggregatePaid = aggregatePaid.plus(c.totalPaid);
      aggregateRemaining = aggregateRemaining.plus(c.totalRemaining);
    });

    return {
      count: contractorsDirectory.length,
      aggregateContracted,
      aggregatePaid,
      aggregateRemaining
    };
  }, [contractorsDirectory]);

  const filteredContractorsDirectory = useMemo(() => {
    if (!contractorDirSearch.trim()) return contractorsDirectory;
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي');
    const q = normalize(contractorDirSearch.trim());
    return contractorsDirectory.filter(c =>
      normalize(c.name).includes(q) ||
      c.specialties.some(s => normalize(s).includes(q)) ||
      c.projectNames.some(p => normalize(p).includes(q))
    );
  }, [contractorsDirectory, contractorDirSearch]);

  // --------------------------------------------------------------------------
  // 3. TIMELINE TREND CHART DATA (Due vs Settled Payments - Derived Dynamically)
  // --------------------------------------------------------------------------
  const timelineTrend = useMemo(() => {
    const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const activeCosts = selectedProjectFilter === 'all'
      ? effectivePropertyCosts
      : effectivePropertyCosts.filter(c => c.property_id === selectedProjectFilter);

    if (!activeCosts || activeCosts.length === 0) {
      return {
        categories: [], duesSeries: [], paidSeries: []
      };
    }

    // Group dues and paid by year-month
    const monthlyBuckets = new Map<string, { dues: Decimal; paid: Decimal; unpaid: Decimal }>();

    activeCosts.forEach(item => {
      const { netEffectiveCost, paidAmount, remainingAmount } = calculateCostItemEffectiveTotals(item);
      const remDec = D(remainingAmount);
      const paidDec = D(paidAmount);
      const duesDec = D(netEffectiveCost);

      if (item.payable_installments && item.payable_installments.length > 0) {
        item.payable_installments.forEach(inst => {
          const dStr = inst.due_date || item.due_date || item.logged_date;
          if (!dStr) return;
          const ym = dStr.slice(0, 7);
          const current = monthlyBuckets.get(ym) || { dues: D(0), paid: D(0), unpaid: D(0) };
          current.dues = current.dues.plus(D(inst.amount_egp || 0));
          current.paid = current.paid.plus(D(inst.paid_amount_egp || 0));
          if (inst.status !== 'PAID') {
            current.unpaid = current.unpaid.plus(D(inst.amount_egp || 0).minus(D(inst.paid_amount_egp || 0)));
          }
          monthlyBuckets.set(ym, current);
        });
      } else {
        const dStr = item.due_date || item.logged_date;
        if (!dStr) return;
        const ym = dStr.slice(0, 7);
        const current = monthlyBuckets.get(ym) || { dues: D(0), paid: D(0), unpaid: D(0) };
        current.dues = current.dues.plus(duesDec);
        current.paid = current.paid.plus(paidDec);
        current.unpaid = current.unpaid.plus(remDec);
        monthlyBuckets.set(ym, current);
      }
    });

    // Identify primary financial focus month
    let refMonth = todayStr.slice(0, 7);
    if (activePeriod?.fiscal_year && activePeriod?.period_number) {
      refMonth = `${activePeriod.fiscal_year}-${String(activePeriod.period_number).padStart(2, '0')}`;
    } else {
      let maxUnpaid = D(0);
      let foundPeakMonth = '';
      for (const [ym, b] of monthlyBuckets.entries()) {
        if (b.unpaid.gt(maxUnpaid)) {
          maxUnpaid = b.unpaid;
          foundPeakMonth = ym;
        }
      }
      if (foundPeakMonth) {
        refMonth = foundPeakMonth;
      } else if (monthlyBuckets.size > 0) {
        const sorted = Array.from(monthlyBuckets.keys()).sort();
        refMonth = sorted[sorted.length - 1];
      }
    }

    const [refY, refM] = refMonth.split('-').map(Number);
    const monthsCount = selectedPeriodRange === 'month' ? 1 : selectedPeriodRange === 'all' ? 6 : 3;
    const targetMonths: string[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(refY, refM - 1 - i, 1));
      targetMonths.push(d.toISOString().slice(0, 7));
    }

    const categories = targetMonths.map(ym => {
      const parts = ym.split('-');
      const monthIdx = parseInt(parts[1], 10) - 1;
      return isAr ? (monthNamesAr[monthIdx] || ym) : (monthNamesEn[monthIdx] || ym);
    });

    let runningDues = D(0);
    let runningPaid = D(0);
    const duesSeries: number[] = [];
    const paidSeries: number[] = [];

    targetMonths.forEach(ym => {
      const bucket = monthlyBuckets.get(ym);
      if (bucket) {
        runningDues = runningDues.plus(bucket.dues);
        runningPaid = runningPaid.plus(bucket.paid);
      }
      duesSeries.push(runningDues.toNumber());
      paidSeries.push(runningPaid.toNumber());
    });

    return {
      categories,
      duesSeries,
      paidSeries
    };
  }, [effectivePropertyCosts, selectedProjectFilter, selectedPeriodRange, activePeriod, isAr]);

  // --------------------------------------------------------------------------
  // 4. NORMALIZED CONTRACTOR PAYABLE ROWS (Canonical Data Table)
  // --------------------------------------------------------------------------
  const normalizedPayables = useMemo(() => {
    return effectivePropertyCosts.map((item, idx) => {
      const { netEffectiveCost, paidAmount, remainingAmount } = calculateCostItemEffectiveTotals(item);
      const totalNum = D(netEffectiveCost);
      const paidNum = D(paidAmount);
      const remainingNum = D(remainingAmount);
      const pendingInstallments = item.payable_installments?.filter(i => i.status !== 'PAID') || [];
      const firstPendingInst = pendingInstallments[0];
      const dueDate = item.due_date || firstPendingInst?.due_date || item.payable_installments?.[0]?.due_date || item.logged_date || todayStr;

      // Status derivation
      let statusKey: 'overdue' | 'paid' | 'pending_review' | 'suspended' | 'in_progress' = 'pending_review';
      let statusLabel = isAr ? 'قيد المراجعة' : 'In Review';
      let statusPillClass = shellStyles.statusPillAmber;

      const isOverdue = remainingNum.gt(0) && !!dueDate && dueDate <= todayStr;
      const isPaid = remainingNum.isZero() || (paidNum.gte(totalNum) && totalNum.gt(0));
      const isInProgress = paidNum.gt(0) && remainingNum.gt(0);
      const isSuspended = item.payment_term === 'FULL_DEFERRED' && paidNum.isZero();

      if (isPaid) {
        statusKey = 'paid';
        statusLabel = isAr ? 'مدفوعة' : 'Paid';
        statusPillClass = shellStyles.statusPillGreen;
      } else if (isOverdue) {
        statusKey = 'overdue';
        statusLabel = isAr ? 'متأخرة' : 'Overdue';
        statusPillClass = shellStyles.statusPillRed;
      } else if (isInProgress) {
        statusKey = 'in_progress';
        statusLabel = isAr ? 'جاري السداد' : 'In Progress';
        statusPillClass = shellStyles.statusPillBlue;
      } else if (isSuspended) {
        statusKey = 'suspended';
        statusLabel = isAr ? 'معلق' : 'Suspended';
        statusPillClass = shellStyles.statusPillNeutral;
      } else {
        statusKey = 'pending_review';
        statusLabel = isAr ? 'قيد المراجعة' : 'In Review';
        statusPillClass = shellStyles.statusPillAmber;
      }

      const yearStr = dueDate ? dueDate.slice(0, 4) : new Date().getFullYear().toString();

      return {
        id: item.item_id || item.id || `cost-${idx}`,
        costItem: item,
        contractor: item.supplier_contractor || (isAr ? 'غير مسجل' : 'Not recorded'),
        contractorName: item.supplier_contractor || (isAr ? 'غير مسجل' : 'Not recorded'),
        projectName: getPropertyTitle(item.property_id),
        specialty: getSpecialtyLabel(item.category, item.item_name_ar),
        invoiceRef: item.invoice_ref || '—',
        dueDate,
        totalNum,
        paidNum,
        remainingNum,
        statusKey,
        statusLabel,
        statusPillClass,
        hasInstallments: !!(item.payable_installments && item.payable_installments.length > 0),
        installmentsCount: item.payable_installments?.length || 0,
        pendingInstallments
      };
    });
  }, [effectivePropertyCosts, todayStr, isAr, getPropertyTitle, getSpecialtyLabel]);

  // Base Filtered Rows (before section tab)
  const baseFilteredPayables = useMemo(() => {
    return normalizedPayables.filter(row => {
      if (getConstructionCostSection(row.costItem) !== payablesMode) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const c = row.contractor.toLowerCase();
        const inv = row.invoiceRef.toLowerCase();
        const proj = row.projectName.toLowerCase();
        const spec = row.specialty.toLowerCase();
        if (!c.includes(q) && !inv.includes(q) && !proj.includes(q) && !spec.includes(q)) {
          return false;
        }
      }

      // Project Filter
      if (selectedProjectFilter !== 'all' && row.costItem.property_id !== selectedProjectFilter) {
        return false;
      }

      // Status Filter
      if (selectedStatusFilter === 'unscheduled') {
        if (row.hasInstallments || row.remainingNum.lte(0)) return false;
      } else if (selectedStatusFilter !== 'all' && row.statusKey !== selectedStatusFilter) {
        return false;
      }

      // Period Filter
      if (selectedPeriodFilter === 'overdue' && row.statusKey !== 'overdue') return false;
      if (selectedPeriodFilter === 'week' && (row.dueDate < todayStr || row.dueDate > weekAheadStr || row.statusKey === 'paid')) return false;
      if (selectedPeriodFilter === 'month' && (row.dueDate < todayStr || row.dueDate > monthAheadStr || row.statusKey === 'paid')) return false;

      // Contractor Filter
      if (contractorFilter !== 'all' && row.contractor !== contractorFilter) {
        return false;
      }

      // Date Range Filter (من تاريخ / إلى تاريخ)
      if (startDateFilter && row.dueDate && row.dueDate < startDateFilter) return false;
      if (endDateFilter && row.dueDate && row.dueDate > endDateFilter) return false;

      return true;
    });
  }, [normalizedPayables, payablesMode, searchQuery, contractorFilter, selectedProjectFilter, selectedStatusFilter, selectedPeriodFilter, startDateFilter, endDateFilter, todayStr, weekAheadStr, monthAheadStr]);

  // Section Counts for Underline Tabs
  const sectionCounts = useMemo(() => {
    let overdue = 0;
    let upcoming = 0;
    let unscheduled = 0;
    let paid = 0;

    baseFilteredPayables.forEach(row => {
      const isPaid = row.remainingNum.lte(0) || row.statusKey === 'paid';
      if (isPaid) {
        paid++;
      } else if (row.statusKey === 'overdue') {
        overdue++;
      } else if (row.hasInstallments) {
        upcoming++;
      } else {
        unscheduled++;
      }
    });

    return {
      all: baseFilteredPayables.length,
      overdue,
      upcoming,
      unscheduled,
      paid
    };
  }, [baseFilteredPayables]);

  // Filtered Rows (applying active section tab)
  const filteredPayables = useMemo(() => {
    if (activeSectionTab === 'all') return baseFilteredPayables;
    return baseFilteredPayables.filter(row => {
      const isPaid = row.remainingNum.lte(0) || row.statusKey === 'paid';
      if (activeSectionTab === 'paid') return isPaid;
      if (isPaid) return false;

      if (activeSectionTab === 'overdue') {
        return row.statusKey === 'overdue';
      }
      if (activeSectionTab === 'upcoming') {
        return row.hasInstallments && row.statusKey !== 'overdue';
      }
      if (activeSectionTab === 'unscheduled') {
        return !row.hasInstallments && row.statusKey !== 'overdue';
      }
      return true;
    });
  }, [baseFilteredPayables, activeSectionTab]);

  // Sorted Rows
  const sortedPayables = useMemo(() => {
    return sortPayableItems(filteredPayables, sortField, sortDirection, isAr);
  }, [filteredPayables, sortField, sortDirection, isAr]);

  // Paginated Table Rows
  const paginatedPayables = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPayables.slice(start, start + pageSize);
  }, [sortedPayables, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedPayables.length / pageSize) || 1;

  // --------------------------------------------------------------------------
  // QUICK ACTIONS HANDLERS
  // --------------------------------------------------------------------------
  const handleExportCSV = useCallback(() => {
    const headers = ['#', 'المقاول', 'المشروع', 'التخصص', 'رقم الفاتورة', 'تاريخ الاستحقاق', 'المبلغ الإجمالي', 'المدفوع', 'المتبقي', 'الحالة'];
    const rows = sortedPayables.map((row, idx) => [
      idx + 1,
      `"${row.contractor.replace(/"/g, '""')}"`,
      `"${row.projectName.replace(/"/g, '""')}"`,
      `"${row.specialty.replace(/"/g, '""')}"`,
      `"${row.invoiceRef.replace(/"/g, '""')}"`,
      row.dueDate,
      row.totalNum.toFixed(2),
      row.paidNum.toFixed(2),
      row.remainingNum.toFixed(2),
      `"${row.statusLabel.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contractor_payables_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(isAr ? 'تم تصدير مستحقات المقاولين إلى Excel بنجاح ✓' : 'Exported to CSV successfully');
  }, [sortedPayables, isAr]);

  // Memoized groupings for contractor schedule modal (Unscheduled vs Scheduled)
  const { unscheduledCosts, scheduledCosts } = useMemo(() => {
    const unscheduled: ERPPropertyCostItem[] = [];
    const scheduled: ERPPropertyCostItem[] = [];

    effectivePropertyCosts.forEach((c) => {
      const { remainingAmount } = calculateCostItemEffectiveTotals(c);
      if (D(remainingAmount).lte(0)) return; // fully paid, no further installments to schedule
      const hasInstallments = !!(c.payable_installments && c.payable_installments.length > 0);
      if (hasInstallments) {
        scheduled.push(c);
      } else {
        unscheduled.push(c);
      }
    });

    return { unscheduledCosts: unscheduled, scheduledCosts: scheduled };
  }, [effectivePropertyCosts]);


  const handleSaveContractorSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetItem = effectivePropertyCosts.find(c => (c.item_id || c.id) === scheduleSelectedCostItemId);
    if (!targetItem) {
      toast.error(isAr ? 'يرجى اختيار البند / المستخلص المستهدف' : 'Please select a cost item');
      return;
    }

    const { netEffectiveCost, paidAmount, remainingAmount } = calculateCostItemEffectiveTotals(targetItem);
    const currentPaid = parseFloat(paidAmount || '0') || 0;
    const currentRem = parseFloat(remainingAmount || '0') || 0;
    const dpNum = parseFloat(scheduleDownPayment) || 0;
    const tranchesCount = parseInt(scheduleNumTranches, 10) || 1;
    const intervalMonths = parseInt(scheduleFrequencyMonths, 10) || 1;

    setIsSubmittingSchedule(true);
    try {
      const costId = targetItem.item_id || targetItem.id || generateUUID();
      const payableInstallments = generatePayableInstallmentSchedule({
        costItemId: costId,
        totalAmount: currentRem,
        downPayment: dpNum,
        numberOfInstallments: tranchesCount,
        firstDueDate: scheduleFirstDueDate || todayStr,
        frequencyMonths: intervalMonths
      });

      const existingPaidInstallments = (targetItem.payable_installments || []).filter(i => i.status === 'PAID');
      const updatedInstallments = [...existingPaidInstallments, ...payableInstallments];
      const newPaidTotal = (currentPaid + dpNum).toFixed(2);
      const newRemainingTotal = Math.max(0, currentRem - dpNum).toFixed(2);

      const paymentTerm: CostPaymentTerm = (currentPaid + dpNum) > 0 ? 'DOWN_PAYMENT_INSTALLMENTS' : 'FULL_DEFERRED';
      const updatedItem: ERPPropertyCostItem = {
        ...targetItem,
        payment_term: paymentTerm,
        payable_installments: updatedInstallments,
        paid_amount_egp: newPaidTotal,
        remaining_amount_egp: newRemainingTotal
      };

      if (onUpdatePropertyCostItem) {
        await onUpdatePropertyCostItem(updatedItem);
      }

      toast.success(isAr ? 'تمت جدولة دفعات المقاول بنجاح ✓' : 'Contractor installments scheduled successfully');
      setIsScheduleContractorModalOpen(false);
    } catch (err) {
      console.error('Failed to schedule contractor payments:', err);
      toast.error(isAr ? 'حدث خطأ أثناء حفظ الجدولة' : 'Failed to schedule installments');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  // Smart Context-Aware Quick Schedule Row trigger
  const handleQuickScheduleRow = useCallback((costItem: ERPPropertyCostItem) => {
    setScheduleSelectedCostItemId(costItem.item_id || costItem.id || '');
    setScheduleDownPayment('');
    setScheduleNumTranches('3');
    setScheduleFrequencyMonths('1');
    setScheduleFirstDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setIsScheduleContractorModalOpen(true);
  }, []);
  const handleSettleCostItem = (item: ERPPropertyCostItem, installment?: ERPPayableInstallment) => {
    const pending = installment || item.payable_installments?.find(inst => inst.status !== 'PAID');
    const target = pending || {
      installment_id: generateUUID(),
      cost_item_id: item.item_id || item.id || '',
      installment_number: (item.payable_installments?.length || 0) + 1,
      title_ar: 'سداد مستحقات مباشرة',
      title_en: 'Direct settlement',
      due_date: item.due_date || todayStr,
      amount_egp: calculateCostItemEffectiveTotals(item).remainingAmount,
      paid_amount_egp: '0.00',
      status: 'PENDING' as const
    };
    setInspectCostItem(null);
    setSettlementTarget({ costItem: item, installment: target });
  };

  const inspectTotals = useMemo(() => {
    if (!inspectCostItem) return null;
    return calculateCostItemEffectiveTotals(inspectCostItem);
  }, [inspectCostItem]);
  const inspectHasBalance = inspectTotals ? D(inspectTotals.remainingAmount).gt(0) : false;
  const inspectNextDueDate = useMemo(() => {
    if (!inspectCostItem) return null;
    const installments = inspectCostItem.payable_installments || [];
    const pending = installments.find(inst => inst.status !== 'PAID');
    return pending?.due_date || inspectCostItem.due_date || null;
  }, [inspectCostItem]);

  return (
    <div className={vStyles.containerQueryContext} dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── 1. HEADER ROW ─── */}
      <div className={vStyles.headerRow}>
        <div className={vStyles.titleArea}>
          <h1 className={vStyles.pageTitle}>
            {isAr ? 'مصاريف البناء ومستحقات المقاولين (AP)' : 'Construction WIP & Contractor Payables (AP)'}
          </h1>
          <p className={vStyles.subtitle}>
            {isAr
              ? 'متابعة جميع مصاريف المشاريع الإنشائية ومستحقات المقاولين (AP) مع إمكانية التصفية والتحليل'
              : 'Monitor all construction project expenses and contractor obligations with filtering and analysis'}
          </p>
        </div>

      </div>

      {/* ─── 2. EXECUTIVE 4 DISCRETE FLOATING KPI CARDS ─── */}
      <ZFKpiGrid>
        <ZFKpiCard title={isAr ? 'إجمالي تكلفة البناء' : 'Total Construction Cost'} value={formatIntegerEGP(telemetry.totalCost)} currency={isAr ? 'ج.م' : 'EGP'} icon={<HardHat size={16} />} accentColor="accent" subtitleLabel={isAr ? 'صافي التكلفة بعد التسويات' : 'Net of adjustments'} showSparkline={true} sparklineData={telemetry.costSeries} tooltip={isAr ? 'توزيع القيمة الحالية حسب شهر تسجيل البنود' : 'Current values grouped by cost registration month'} />
        <ZFKpiCard title={isAr ? 'المسدد حتى تاريخه' : 'Paid to Date'} value={formatIntegerEGP(telemetry.paid)} currency={isAr ? 'ج.م' : 'EGP'} icon={<CheckCircle2 size={16} />} accentColor="accent" subtitleLabel={isAr ? 'المدفوعات المسجلة فعلياً' : 'Recorded payments'} showSparkline={true} sparklineData={telemetry.paidSeries} tooltip={isAr ? 'المدفوعات الحالية لبنود كل شهر تسجيل، وليست سجل أرصدة تاريخي' : 'Current paid balances grouped by cost registration month, not historical balances'} />
        <ZFKpiCard title={isAr ? 'المستحقات القائمة' : 'Outstanding Payables'} value={formatIntegerEGP(telemetry.outstanding)} currency={isAr ? 'ج.م' : 'EGP'} icon={<CreditCard size={16} />} accentColor="accent" subtitleLabel={isAr ? 'التزامات المقاولين والموقع' : 'Contractor & site liabilities'} showSparkline={true} sparklineData={telemetry.outstandingSeries} tooltip={isAr ? 'المتبقي الحالي حسب شهر تسجيل البنود' : 'Current remaining balances by cost registration month'} />
        <ZFKpiCard title={isAr ? 'محتجزات ضمان الأعمال' : 'Retentions Held'} value={formatIntegerEGP(telemetry.retentions)} currency={isAr ? 'ج.م' : 'EGP'} icon={<Wallet size={16} />} accentColor="accent" subtitleLabel={isAr ? 'لا توجد محتجزات ضمان مسجلة' : 'No retention balances recorded'} showSparkline={true} sparklineData={telemetry.retentionSeries} />
      </ZFKpiGrid>

      {/* ─── 3. CHARTS ROW (Timeline on Right, Donut on Left in RTL) ─── */}
      <div className={vStyles.chartsRow}>
        {/* Card 1: Timeline Trend Chart (Due vs Paid - RIGHT in RTL) */}
        <div className={vStyles.whiteCard}>
          <div className={vStyles.cardHeader}>
            <div className={vStyles.cardHeaderLeading}>
              <div className={vStyles.cardIconSquircle}>
                <TrendingUp size={15} />
              </div>
              <h3 className={vStyles.cardTitle}>
                {isAr ? 'المستحقات والدفعات خلال الفترة' : 'Payables & Payments Trend'}
              </h3>
            </div>
            <span className={vStyles.cardHeaderTrailing}>
              {isAr ? 'معدل سداد الالتزامات' : 'Settlement Timeline'}
            </span>
          </div>

          {timelineTrend.categories.length === 0 ? <p className={vStyles.emptyContractorsWrap}>{isAr ? 'لا توجد حركات مسجلة خلال الفترة' : 'No recorded movements in this period'}</p> : (
          <ERPApexChart
            type="line"
            series={[
              { name: isAr ? 'المستحقات' : 'Payables Due', data: timelineTrend.duesSeries },
              { name: isAr ? 'المدفوعات' : 'Payments Settled', data: timelineTrend.paidSeries }
            ]}
            options={{
              chart: {
                fontFamily: "'ThmanyahSans', 'Cairo', sans-serif",
                toolbar: { show: false },
                zoom: { enabled: false }
              },
              colors: ['var(--erp-accent, #2563eb)', '#10b981'],
              stroke: { curve: 'smooth', width: [3, 3] },
              markers: { size: 3, hover: { size: 5 } },
              xaxis: {
                categories: timelineTrend.categories,
                labels: { style: { colors: '#64748b', fontSize: '11px' } },
                axisBorder: { color: '#cbd5e1' }
              },
              yaxis: {
                opposite: isAr,
                labels: {
                  formatter: (val: number) => formatCompactEGP(val, isAr),
                  style: { colors: '#64748b', fontSize: '11px' }
                },
                axisBorder: { show: true, color: '#cbd5e1' }
              },
              grid: {
                borderColor: '#e2e8f0',
                strokeDashArray: 2,
                xaxis: { lines: { show: true } },
                yaxis: { lines: { show: true } }
              },
              legend: {
                position: 'top',
                horizontalAlign: isAr ? 'left' : 'right',
                fontSize: '11px',
                fontWeight: 500,
                labels: { colors: '#64748b' },
                offsetY: -4
              },
              tooltip: {
                y: {
                  formatter: (val: number) => D(val).formatEGP(isAr)
                }
              }
            }}
            height={185}
            isAr={isAr}
          />
          )}
        </div>

        {/* Card 3: Donut Chart - Contractor Specialty Breakdown (LEFT in RTL) */}
        <div className={vStyles.whiteCard}>
          <div className={vStyles.cardHeader}>
            <div className={vStyles.cardHeaderLeading}>
              <div className={vStyles.cardIconSquircle}>
                <PieChart size={15} />
              </div>
              <h3 className={vStyles.cardTitle}>
                {isAr ? 'توزيع مستحقات المقاولين حسب التخصص' : 'Payables by Construction Specialty'}
              </h3>
            </div>
            <span className={vStyles.cardHeaderTrailing}>
              {isAr ? 'تحليل الأنشطة الإنشائية' : 'Specialty Breakdown'}
            </span>
          </div>

          <div className={vStyles.donutBody}>
            {/* Legend List on RIGHT side in RTL */}
            <div className={vStyles.donutLegendList}>
              {specialtyBreakdown.items.map((item) => (
                <div key={item.key} className={vStyles.donutLegendItem}>
                  <div className={vStyles.donutLegendLeading}>
                    <span className={vStyles.donutDot} style={{ background: item.color }} />
                    <span className={vStyles.donutLabel}>{item.label}</span>
                  </div>
                  <div className={vStyles.donutLegendValues}>
                    <span className={vStyles.donutPct}>{item.percentage}%</span>
                    <span className={vStyles.donutAmount}>{item.amountFormatted}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Donut Chart on LEFT side in RTL */}
            <div className={vStyles.donutChartWrap}>
              {specialtyBreakdown.total.gt(0) ? (
                <ERPApexChart
                  type="donut"
                  series={specialtyBreakdown.items.map(i => i.amount.toNumber())}
                  options={{
                    labels: specialtyBreakdown.items.map(i => i.label),
                    colors: ['var(--erp-accent, #2563eb)', '#10b981', '#f59e0b', '#0284c7', '#64748b'],
                    chart: {
                      fontFamily: "'ThmanyahSans', 'Cairo', sans-serif",
                      toolbar: { show: false }
                    },
                    plotOptions: {
                      pie: {
                        donut: {
                          size: '80%',
                          labels: {
                            show: true,
                            name: {
                              show: true,
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#64748b',
                              offsetY: -6
                            },
                            value: {
                              show: true,
                              fontSize: '13px',
                              fontWeight: 800,
                              color: '#0f172a',
                              offsetY: 2,
                              formatter: () => formatCompactEGP(specialtyBreakdown.total, isAr)
                            },
                            total: {
                              show: true,
                              showAlways: true,
                              label: isAr ? 'إجمالي المصاريف' : 'Total Expenses',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#64748b',
                              formatter: () => formatCompactEGP(specialtyBreakdown.total, isAr)
                            }
                          }
                        }
                      }
                    },
                    legend: { show: false },
                    dataLabels: { enabled: false },
                    stroke: { width: 2, colors: ['#ffffff'] },
                    tooltip: {
                      y: {
                        formatter: (val: number) => `${formatIntegerEGP(val)} ${isAr ? 'ج.م' : 'EGP'}`
                      }
                    }
                  }}
                  height={175}
                  isAr={isAr}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', padding: '1rem' }}>
                  {isAr ? 'لا توجد مستحقات مسجلة' : 'No recorded payables'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. CANONICAL PAYABLES DATA TABLE & INTEGRATED TOOLBAR ─── */}
      <div className={vStyles.payablesMode} role="group" aria-label={isAr ? 'نوع المصروفات' : 'Expense section'}>
        <button type="button" className={vStyles.secondaryBtn} aria-pressed={payablesMode === 'contractors'} onClick={() => { setPayablesMode('contractors'); setContractorFilter('all'); setActiveSectionTab('all'); setCurrentPage(1); }}>{isAr ? 'عقود وفواتير المقاولين' : 'Contractor Contracts & Invoices'}</button>
        <button type="button" className={vStyles.secondaryBtn} aria-pressed={payablesMode === 'site'} onClick={() => { setPayablesMode('site'); setContractorFilter('all'); setActiveSectionTab('all'); setCurrentPage(1); }}>{isAr ? 'عهدة ومصروفات الموقع' : 'Site Petty Cash & Expenses'}</button>
      </div>
      <div id="construction-canonical-table" className={vStyles.tableCard}>
        {/* Table Header Bar with Underline Tab & Direct Actions */}
        {/* Row 1: Section Navigation Underline Tabs & Quick Report Actions */}
        <div className={vStyles.tableTabsBar}>
          <div className={vStyles.tableTabsUnderline}>
            <button
              type="button"
              className={`${vStyles.underlineTab} ${activeSectionTab === 'all' ? vStyles.underlineTabActive : ''}`}
              onClick={() => { setActiveSectionTab('all'); setCurrentPage(1); }}
            >
              <FileText size={14} />
              <span>{isAr ? 'كافة المستحقات' : 'All Payables'}</span>
              <span className={vStyles.tableCount}>{sectionCounts.all}</span>
            </button>
            <button
              type="button"
              className={`${vStyles.underlineTab} ${activeSectionTab === 'overdue' ? vStyles.underlineTabActive : ''}`}
              onClick={() => { setActiveSectionTab('overdue'); setCurrentPage(1); }}
            >
              <span className={`${vStyles.tabDot} ${vStyles.tabDotRed}`} />
              <span>{isAr ? 'متأخرات حرجة' : 'Critical Overdue'}</span>
              <span className={`${vStyles.tableCount} ${sectionCounts.overdue > 0 ? vStyles.tableCountRed : ''}`}>
                {sectionCounts.overdue}
              </span>
            </button>
            <button
              type="button"
              className={`${vStyles.underlineTab} ${activeSectionTab === 'upcoming' ? vStyles.underlineTabActive : ''}`}
              onClick={() => { setActiveSectionTab('upcoming'); setCurrentPage(1); }}
            >
              <span className={`${vStyles.tabDot} ${vStyles.tabDotAmber}`} />
              <span>{isAr ? 'استحقاقات قادمة' : 'Upcoming Scheduled'}</span>
              <span className={vStyles.tableCount}>{sectionCounts.upcoming}</span>
            </button>
            <button
              type="button"
              className={`${vStyles.underlineTab} ${activeSectionTab === 'unscheduled' ? vStyles.underlineTabActive : ''}`}
              onClick={() => { setActiveSectionTab('unscheduled'); setCurrentPage(1); }}
            >
              <span className={`${vStyles.tabDot} ${vStyles.tabDotSlate}`} />
              <span>{isAr ? 'بحاجة لجدولة' : 'Unscheduled'}</span>
              <span className={vStyles.tableCount}>{sectionCounts.unscheduled}</span>
            </button>
            <button
              type="button"
              className={`${vStyles.underlineTab} ${activeSectionTab === 'paid' ? vStyles.underlineTabActive : ''}`}
              onClick={() => { setActiveSectionTab('paid'); setCurrentPage(1); }}
            >
              <span className={`${vStyles.tabDot} ${vStyles.tabDotGreen}`} />
              <span>{isAr ? 'مسددة ومقفلة' : 'Settled & Closed'}</span>
              <span className={vStyles.tableCount}>{sectionCounts.paid}</span>
            </button>
          </div>

          <div className={vStyles.tableTabsActions}>
            {sortField !== 'priority' && (
              <button
                type="button"
                className={vStyles.priorityResetBtn}
                onClick={() => { setSortField('priority'); setSortDirection('asc'); setCurrentPage(1); }}
                title={isAr ? 'إعادة الترتيب الذكي الافتراضي حسب الأولوية' : 'Reset to default priority sort'}
              >
                <Sparkles size={13} />
                <span>{isAr ? 'ترتيب الأولوية' : 'Priority Sort'}</span>
              </button>
            )}
            <button
              type="button"
              className={vStyles.toolbarIconBtn}
              onClick={handleExportCSV}
              title={isAr ? 'تصدير Excel' : 'Export Excel'}
              aria-label={isAr ? 'تصدير Excel' : 'Export Excel'}
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              className={vStyles.toolbarIconBtn}
              onClick={() => setIsReportModalOpen(true)}
              title={isAr ? 'طباعة البيان' : 'Print statement'}
              aria-label={isAr ? 'طباعة البيان' : 'Print statement'}
            >
              <Printer size={14} />
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Filter Toolbar Controls */}
        <div className={vStyles.tableFilterBar}>
          <div className={vStyles.tableToolbarControls}>
            <select
              className={vStyles.filterSelect}
              value={selectedProjectFilter}
              onChange={e => { setSelectedProjectFilter(e.target.value); setCurrentPage(1); }}
              aria-label={isAr ? 'تصفية المشروع' : 'Project filter'}
            >
              <option value="all">{isAr ? 'كل المشاريع' : 'All Projects'}</option>
              {properties.map(p => <option key={p.id} value={p.id}>{isAr ? p.title_ar : p.title_en}</option>)}
            </select>
            <select
              className={vStyles.filterSelect}
              value={selectedPeriodFilter}
              onChange={e => { setSelectedPeriodFilter(e.target.value); setCurrentPage(1); }}
              aria-label={isAr ? 'تصفية الاستحقاق' : 'Period filter'}
            >
              <option value="all">{isAr ? 'كل الاستحقاق' : 'All Due Dates'}</option>
              <option value="overdue">{isAr ? 'متأخر السداد' : 'Overdue Backlog'}</option>
              <option value="week">{isAr ? 'مستحق خلال أسبوع' : 'Due This Week'}</option>
              <option value="month">{isAr ? 'مستحق خلال شهر' : 'Due This Month'}</option>
            </select>
            <details className={vStyles.dateDisclosure}>
              <summary className={vStyles.toolbarActionBtn} aria-label={isAr ? 'تصفية بنطاق تاريخ' : 'Filter by date range'}>
                <Calendar size={14} />
                <span>{isAr ? 'التواريخ' : 'Dates'}</span>
                {(startDateFilter || endDateFilter) && <span className={vStyles.filterDot} />}
              </summary>
              <div className={vStyles.dateDisclosurePanel}>
                <label>
                  {isAr ? 'من تاريخ' : 'From'}
                  <input
                    type="date"
                    className={vStyles.dateFilterInput}
                    value={startDateFilter}
                    onChange={e => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
                  />
                </label>
                <label>
                  {isAr ? 'إلى تاريخ' : 'To'}
                  <input
                    type="date"
                    className={vStyles.dateFilterInput}
                    value={endDateFilter}
                    onChange={e => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
                  />
                </label>
              </div>
            </details>
            <div className={vStyles.searchBox}>
              <Search size={14} />
              <input
                type="search"
                className={vStyles.searchInput}
                placeholder={isAr ? 'ابحث عن مقاول أو فاتورة...' : 'Search contractor or invoice...'}
                aria-label={isAr ? 'بحث في المستحقات' : 'Search payables'}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            {contractorFilter !== 'all' && (
              <div className={vStyles.activeFilterBadge}>
                <span>{isAr ? `المقاول: ${contractorFilter}` : `Contractor: ${contractorFilter}`}</span>
                <button
                  type="button"
                  onClick={() => { setContractorFilter('all'); setCurrentPage(1); }}
                  aria-label={isAr ? 'إلغاء تصفية المقاول' : 'Clear contractor filter'}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          {(searchQuery || selectedProjectFilter !== 'all' || selectedStatusFilter !== 'all' || selectedPeriodFilter !== 'all' || startDateFilter || endDateFilter || activeSectionTab !== 'all' || contractorFilter !== 'all') && (
            <button
              type="button"
              className={vStyles.toolbarIconBtn}
              title={isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
              aria-label={isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
              onClick={() => {
                setSearchQuery('');
                setSelectedProjectFilter('all');
                setSelectedStatusFilter('all');
                setSelectedPeriodFilter('all');
                setStartDateFilter('');
                setEndDateFilter('');
                setContractorFilter('all');
                setActiveSectionTab('all');
                setSortField('priority');
                setSortDirection('asc');
                setCurrentPage(1);
              }}
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {/* Table Container */}
        <div className={vStyles.tableContainer}>
          <table className={vStyles.canonicalTable}>
            <thead className={vStyles.canonicalThead}>
              <tr>
                <th
                  className={`${vStyles.canonicalTh} ${vStyles.sortableTh}`}
                  tabIndex={0}
                  aria-sort={sortField === 'project' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleSort('project'); } }}
                  onClick={() => handleSort('project')}
                  title={isAr ? 'ترتيب حسب المشروع' : 'Sort by project'}
                >
                  <div className={vStyles.thSortContent}>
                    <span>{isAr ? 'المشروع' : 'Project'}</span>
                    {sortField === 'project' ? (
                      sortDirection === 'asc' ? <ChevronUp size={13} className={vStyles.sortIconActive} /> : <ChevronDown size={13} className={vStyles.sortIconActive} />
                    ) : (
                      <ArrowUpDown size={12} className={vStyles.sortIcon} />
                    )}
                  </div>
                </th>
                <th
                  className={`${vStyles.canonicalTh} ${vStyles.sortableTh}`}
                  tabIndex={0}
                  aria-sort={sortField === 'contractor' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleSort('contractor'); } }}
                  onClick={() => handleSort('contractor')}
                  title={isAr ? 'ترتيب حسب المقاول' : 'Sort by contractor'}
                >
                  <div className={vStyles.thSortContent}>
                    <span>{isAr ? 'المقاول / البيان' : 'Contractor / Item'}</span>
                    {sortField === 'contractor' ? (
                      sortDirection === 'asc' ? <ChevronUp size={13} className={vStyles.sortIconActive} /> : <ChevronDown size={13} className={vStyles.sortIconActive} />
                    ) : (
                      <ArrowUpDown size={12} className={vStyles.sortIcon} />
                    )}
                  </div>
                </th>
                <th className={vStyles.canonicalTh}>{isAr ? 'التخصص' : 'Specialty'}</th>
                <th
                  className={`${vStyles.canonicalTh} ${vStyles.sortableTh}`}
                  tabIndex={0}
                  aria-sort={sortField === 'dueDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleSort('dueDate'); } }}
                  onClick={() => handleSort('dueDate')}
                  title={isAr ? 'ترتيب حسب تاريخ الاستحقاق' : 'Sort by due date'}
                >
                  <div className={vStyles.thSortContent}>
                    <span>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</span>
                    {sortField === 'dueDate' ? (
                      sortDirection === 'asc' ? <ChevronUp size={13} className={vStyles.sortIconActive} /> : <ChevronDown size={13} className={vStyles.sortIconActive} />
                    ) : (
                      <ArrowUpDown size={12} className={vStyles.sortIcon} />
                    )}
                  </div>
                </th>
                <th
                  className={`${vStyles.canonicalTh} ${vStyles.sortableTh}`}
                  tabIndex={0}
                  aria-sort={sortField === 'totalCost' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleSort('totalCost'); } }}
                  onClick={() => handleSort('totalCost')}
                  title={isAr ? 'ترتيب حسب المبلغ الإجمالي' : 'Sort by total amount'}
                >
                  <div className={vStyles.thSortContent}>
                    <span>{isAr ? 'المبلغ الإجمالي' : 'Total Amount'}</span>
                    {sortField === 'totalCost' ? (
                      sortDirection === 'asc' ? <ChevronUp size={13} className={vStyles.sortIconActive} /> : <ChevronDown size={13} className={vStyles.sortIconActive} />
                    ) : (
                      <ArrowUpDown size={12} className={vStyles.sortIcon} />
                    )}
                  </div>
                </th>
                <th
                  className={`${vStyles.canonicalTh} ${vStyles.sortableTh}`}
                  tabIndex={0}
                  aria-sort={sortField === 'remaining' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleSort('remaining'); } }}
                  onClick={() => handleSort('remaining')}
                  title={isAr ? 'ترتيب حسب المتبقي' : 'Sort by remaining'}
                >
                  <div className={vStyles.thSortContent}>
                    <span>{isAr ? 'المتبقي' : 'Remaining'}</span>
                    {sortField === 'remaining' ? (
                      sortDirection === 'asc' ? <ChevronUp size={13} className={vStyles.sortIconActive} /> : <ChevronDown size={13} className={vStyles.sortIconActive} />
                    ) : (
                      <ArrowUpDown size={12} className={vStyles.sortIcon} />
                    )}
                  </div>
                </th>
                <th className={vStyles.canonicalTh} style={{ textAlign: 'center' }}>{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayables.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    <HardHat size={32} color="var(--erp-accent, #2563eb)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {isAr ? 'لا توجد مستحقات مقاولين مطابقة للتصفية الحالية' : 'No contractor payables match current filters'}
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  let lastRenderedSection: string | null = null;
                  return paginatedPayables.map((row) => {
                    let sectionKey: 'overdue' | 'upcoming' | 'unscheduled' | 'paid' = 'unscheduled';
                    if (row.remainingNum.lte(0) || row.statusKey === 'paid') {
                      sectionKey = 'paid';
                    } else if (row.statusKey === 'overdue') {
                      sectionKey = 'overdue';
                    } else if (row.hasInstallments) {
                      sectionKey = 'upcoming';
                    } else {
                      sectionKey = 'unscheduled';
                    }

                    const showSectionDivider = activeSectionTab === 'all' && sortField === 'priority' && sectionKey !== lastRenderedSection;
                    if (showSectionDivider) {
                      lastRenderedSection = sectionKey;
                    }

                    return (
                      <React.Fragment key={row.id}>
                        {showSectionDivider && (
                          <tr key={`section-divider-${sectionKey}`} className={vStyles.sectionDividerRow}>
                            <td colSpan={7} className={vStyles.sectionDividerCell}>
                              <div className={vStyles.sectionDividerContent}>
                                <div className={vStyles.sectionDividerLeading}>
                                  <span className={`${vStyles.sectionDot} ${
                                    sectionKey === 'overdue' ? vStyles.sectionDotRed :
                                    sectionKey === 'upcoming' ? vStyles.sectionDotAmber :
                                    sectionKey === 'unscheduled' ? vStyles.sectionDotSlate :
                                    vStyles.sectionDotGreen
                                  }`} />
                                  <span className={vStyles.sectionDividerTitle}>
                                    {sectionKey === 'overdue' && (isAr ? 'مستحقات متأخرة حرجة (تتطلب سداداً فورياً)' : 'Critical Overdue (Immediate Action Required)')}
                                    {sectionKey === 'upcoming' && (isAr ? 'استحقاقات قادمة ومجدولة' : 'Upcoming Scheduled Dues')}
                                    {sectionKey === 'unscheduled' && (isAr ? 'فواتير مفتوحة بحاجة لجدولة أقساط' : 'Open Invoices Needing Installment Schedules')}
                                    {sectionKey === 'paid' && (isAr ? 'فواتير ومستحقات مسددة ومقفلة' : 'Settled & Closed Invoices')}
                                  </span>
                                </div>
                                <span className={vStyles.sectionDividerBadge}>
                                  {sectionKey === 'overdue' && `${sectionCounts.overdue} ${isAr ? 'سجلات' : 'items'}`}
                                  {sectionKey === 'upcoming' && `${sectionCounts.upcoming} ${isAr ? 'سجلات' : 'items'}`}
                                  {sectionKey === 'unscheduled' && `${sectionCounts.unscheduled} ${isAr ? 'سجلات' : 'items'}`}
                                  {sectionKey === 'paid' && `${sectionCounts.paid} ${isAr ? 'سجلات' : 'items'}`}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          className={vStyles.canonicalRow}
                          onClick={() => setInspectCostItem(row.costItem)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              setInspectCostItem(row.costItem);
                            }
                          }}
                        >
                          <td className={vStyles.canonicalTd} style={{ color: '#475569', fontWeight: 600, maxWidth: '140px' }} title={row.projectName}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.projectName}
                            </div>
                          </td>

                          <td className={vStyles.canonicalTd} style={{ fontWeight: 800, color: '#0f172a', maxWidth: '200px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.contractor}>{row.contractor}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '2px', flexWrap: 'wrap' }}>
                              {row.costItem.item_name_ar && (
                                <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={row.costItem.item_name_ar}>
                                  {row.costItem.item_name_ar}
                                </span>
                              )}
                              {/* Smart Integrated Schedule Status Pill */}
                              {row.remainingNum.gt(0) && (
                                row.hasInstallments ? (
                                  <span
                                    className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`}
                                    style={{ fontSize: '0.64rem', padding: '0.08rem 0.4rem', cursor: 'pointer' }}
                                    title={isAr ? `مجدول على ${row.installmentsCount} أقساط • اضغط لإعادة الهيكلة` : `Scheduled on ${row.installmentsCount} tranches • Click to reschedule`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickScheduleRow(row.costItem);
                                    }}
                                  >
                                    {isAr ? `مجدول (${row.installmentsCount})` : `Scheduled (${row.installmentsCount})`}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    className={vStyles.unscheduledBadgeBtn}
                                    title={isAr ? 'مستخلص غير مجدول • اضغط للجدولة فوراً' : 'Unscheduled • Click to schedule now'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickScheduleRow(row.costItem);
                                    }}
                                  >
                                    <Clock size={11} />
                                    <span>{isAr ? 'غير مجدول' : 'Unscheduled'}</span>
                                  </button>
                                )
                              )}
                            </div>
                          </td>

                          <td className={vStyles.canonicalTd}>
                            <span style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: '#334155'
                            }}>
                              {row.specialty}
                            </span>
                          </td>

                          <td className={vStyles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', color: '#475569', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Calendar size={12} color="#94a3b8" />
                              <span style={{ color: row.statusKey === 'overdue' ? '#dc2626' : 'inherit', fontWeight: row.statusKey === 'overdue' ? 700 : 500 }}>
                                {row.dueDate}
                              </span>
                            </span>
                          </td>

                          <td className={vStyles.canonicalTd} style={{ fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            <MoneyCell amount={row.totalNum.toFixed(2)} isAr={isAr} hideDecimals={true} />
                          </td>

                          <td className={vStyles.canonicalTd} style={{
                            fontWeight: 800,
                            color: row.statusKey === 'overdue' ? '#dc2626' : row.remainingNum.isZero() ? '#64748b' : '#d97706',
                            fontVariantNumeric: 'tabular-nums'
                          }}>
                            <MoneyCell amount={row.remainingNum.toFixed(2)} isAr={isAr} hideDecimals={true} />
                          </td>

                          <td className={vStyles.canonicalTd} style={{ textAlign: 'center' }}>
                            <span className={`${shellStyles.statusPill} ${row.statusPillClass}`}>
                              {row.statusLabel}
                            </span>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Bar & Numeric Pagination */}
        <div className={vStyles.tableFooterBar}>
          <div className={vStyles.footerCount}>
            {isAr
              ? `عرض ${paginatedPayables.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - ${Math.min(currentPage * pageSize, filteredPayables.length)} من أصل ${filteredPayables.length} سجل`
              : `Showing ${paginatedPayables.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - ${Math.min(currentPage * pageSize, filteredPayables.length)} of ${filteredPayables.length} records`}
          </div>

          <div className={vStyles.paginationGroup}>
            <button
              type="button"
              className={vStyles.pageBtn}
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              aria-label={isAr ? 'الصفحة السابقة' : 'Previous page'}
            >
              {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                type="button"
                className={`${vStyles.pageBtn} ${p === currentPage ? vStyles.pageBtnActive : ''}`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              className={vStyles.pageBtn}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              aria-label={isAr ? 'الصفحة التالية' : 'Next page'}
            >
              {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── 6. SIDEBAR COMPANION WIDGETS (Portaled into 3rd Column) ─── */}
      <ZFWorkstationSideWidgets
        title={isAr ? 'ملخص المقاولين ومصاريف البناء' : 'Construction & Contractor Summary'}
        icon={<HardHat size={16} />}
      >
        <div className={vStyles.sideWidgetsWrap}>

          <ZFWidgetCard id="construction-quick-actions" title={isAr ? 'الإجراءات السريعة' : 'Quick Actions'} icon={<Plus size={15} />} isAr={isAr}>
            <div className={vStyles.quickActionsStack}>
              {onCreatePurchaseOrder && <button type="button" className={vStyles.secondaryBtn} onClick={() => setIsPurchaseOrderModalOpen(true)} disabled={isMutating}>{isAr ? '+ أمر شراء جديد' : '+ New Purchase Order'}</button>}
              <button type="button" className={vStyles.primaryBtn} onClick={() => { setExpensePurpose('claim'); setIsNewExpenseModalOpen(true); }} disabled={isMutating}>{isAr ? '+ قيد مستخلص' : '+ Record Contractor Claim'}</button>
              <button type="button" className={vStyles.secondaryBtn} onClick={() => { setExpensePurpose('site'); setIsNewExpenseModalOpen(true); }} disabled={isMutating}>{isAr ? '+ مصروف موقع' : '+ Site Expense'}</button>
            </div>
            {purchaseOrders.length > 0 && <div className={vStyles.purchaseOrdersList}><h4>{isAr ? 'مسودات أوامر الشراء' : 'Purchase Order Drafts'}</h4>{purchaseOrders.slice(0, 5).map(order => <div key={order.order_id}><strong>{order.supplier_name}</strong><span>{order.description}</span><bdi>{formatIntegerEGP(order.amount_egp)} {isAr ? 'ج.م' : 'EGP'}</bdi><span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}>{isAr ? 'مسودة' : 'Draft'}</span></div>)}</div>}
          </ZFWidgetCard>

          {/* Widget 1: Construction snapshot */}
          <ZFWidgetCard
            id="construction-quick-summary"
            title={isAr ? 'ملخص سريع' : 'Quick Summary'}
            icon={<Building2 size={15} />}
            badge={
              <span className={vStyles.sideWidgetBadge}>
                {isAr ? 'مؤشرات فورية' : 'Snapshot'}
              </span>
            }
            isAr={isAr}
          >
            <div className={vStyles.quickSummaryList}>
              <div className={vStyles.quickSummaryRow}>
                <span className={vStyles.quickSummaryLeading}><span className={vStyles.quickSummaryIcon}><Building2 size={14} /></span><span className={vStyles.quickSummaryLabel}>{isAr ? 'عدد المشاريع' : 'Projects'}</span></span>
                <span className={vStyles.quickSummaryValue}>{properties.length}</span>
              </div>
              <div className={vStyles.quickSummaryRow}>
                <span className={vStyles.quickSummaryLeading}><span className={vStyles.quickSummaryIcon}><UsersRound size={14} /></span><span className={vStyles.quickSummaryLabel}>{isAr ? 'عدد المقاولين' : 'Contractors'}</span></span>
                <span className={vStyles.quickSummaryValue}>{executiveKPIs.contractorsCount}</span>
              </div>
              <div className={vStyles.quickSummaryRow}>
                <span className={vStyles.quickSummaryLeading}><span className={vStyles.quickSummaryIcon}><FileText size={14} /></span><span className={vStyles.quickSummaryLabel}>{isAr ? 'إجمالي المستخلصات والفواتير' : 'Total Claims'}</span></span>
                <span className={vStyles.quickSummaryValue}>{effectivePropertyCosts.length}</span>
              </div>
              <div className={vStyles.quickSummaryRow}>
                <span className={vStyles.quickSummaryLeading}><span className={vStyles.quickSummaryIcon}><Wallet size={14} /></span><span className={vStyles.quickSummaryLabel}>{isAr ? 'المصروفات هذا الشهر' : 'Expenses This Month'}</span></span>
                <span className={vStyles.quickSummaryValue}>{formatIntegerEGP(paidThisMonth)} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
              <div className={vStyles.quickSummaryRow}>
                <span className={vStyles.quickSummaryLeading}><span className={vStyles.quickSummaryIcon}><Banknote size={14} /></span><span className={vStyles.quickSummaryLabel}>{isAr ? 'المستحقات الحالية' : 'Current Dues'}</span></span>
                <span className={vStyles.quickSummaryValue}>{formatIntegerEGP(executiveKPIs.totalApLiabilities)} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          </ZFWidgetCard>

          <ZFWidgetCard id="construction-expense-rate" title={isAr ? 'أعمار مستحقات المقاولين' : 'Contractor Aging'} icon={<Clock size={15} />} isAr={isAr}>
            {contractorAging.outstanding.gt(0) ? <ERPApexChart type="donut" height={235} isAr={isAr} series={contractorAging.aging} options={{ labels: isAr ? ['غير متأخر / غير مجدول', '١–٣٠ يوماً', '٣١–٦٠ يوماً', '٦١ يوماً فأكثر'] : ['Current / unscheduled', '1–30 days', '31–60 days', '61+ days'], colors: ['var(--erp-accent)', '#64748b', '#d97706', '#dc2626'], legend: { position: 'bottom', fontSize: '11px' }, dataLabels: { enabled: false }, plotOptions: { pie: { customScale: 0.98, donut: { size: '76%', labels: { show: true, name: { fontSize: '11px' }, value: { fontSize: '14px', formatter: (value: string) => formatCompactEGP(value, isAr) }, total: { show: true, showAlways: true, label: isAr ? 'المستحقات' : 'Outstanding', fontSize: '11px', formatter: () => formatCompactEGP(contractorAging.outstanding, isAr) } } } } }, tooltip: { y: { formatter: (value: number) => D(value).formatEGP(isAr) } } }} /> : <p className={vStyles.emptyContractorsWrap}>{isAr ? 'لا توجد مستحقات قائمة • 0 ج.م' : 'No outstanding payables • 0 EGP'}</p>}
          </ZFWidgetCard>

          {/* Widget 3: Top Contractors with Dues (المقاولين الأعلى مستحقات) */}
          <ZFWidgetCard
            id="construction-top-contractors"
            title={isAr ? 'أعلى المقاولين' : 'Top Contractors'}
            icon={<HardHat size={15} />}
            badge={
              <span className={vStyles.sideWidgetBadge}>
                {topContractors.length > 0 ? (isAr ? `${topContractors.length} مقاولين` : `${topContractors.length} Top`) : (isAr ? 'لا يوجد' : 'None')}
              </span>
            }
            isAr={isAr}
          >
            {topContractors.length === 0 ? (
              <div className={vStyles.emptyContractorsWrap}>
                <CheckCircle2 size={24} style={{ color: '#10b981', opacity: 0.8 }} />
                <span>{isAr ? 'لا توجد مستحقات معلقة للمقاولين' : 'Zero contractor dues'}</span>
                <span className={vStyles.emptyContractorsSubtext}>
                  {effectivePropertyCosts.length ? (isAr ? 'لا توجد أرصدة متبقية على الفواتير المسجلة' : 'No remaining balances on recorded invoices') : (isAr ? 'لا توجد فواتير أو مستحقات مسجلة' : 'No invoices or payables recorded')}
                </span>
                <button
                  type="button"
                  className={vStyles.viewAllContractorsBtn}
                  onClick={() => setIsContractorsModalOpen(true)}
                  style={{ marginTop: '0.75rem' }}
                >
                  <span>{isAr ? 'عرض دليل المقاولين' : 'View Contractors Directory'}</span>
                </button>
              </div>
            ) : (
              <>
                <ERPApexChart type="bar" height={Math.max(215, topContractors.length * 52)} isAr={isAr} series={[{ name: isAr ? 'المستحقات' : 'Outstanding', data: topContractors.map(contractor => contractor.dues.toNumber()) }]} options={{ plotOptions: { bar: { horizontal: true, barHeight: '45%', borderRadius: 3 } }, xaxis: { categories: topContractors.map(contractor => contractor.name), labels: { formatter: (value: string) => formatCompactEGP(value, isAr) } }, yaxis: { labels: { maxWidth: 160, style: { fontSize: '11px' } } }, dataLabels: { enabled: false }, grid: { borderColor: '#e2e8f0', strokeDashArray: 2, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } }, tooltip: { y: { formatter: (value: number) => D(value).formatEGP(isAr) } } }} />
                <div className={vStyles.topContractorsList}>
                  {topContractors.map(contractor => <button type="button" className={vStyles.contractorFilterBtn} key={contractor.name} title={contractor.name} onClick={() => { setPayablesMode('contractors'); setContractorFilter(contractor.name); setCurrentPage(1); }}><span>{contractor.name}</span><bdi>{formatIntegerEGP(contractor.dues)} {isAr ? 'ج.م' : 'EGP'}</bdi></button>)}
                </div>

                <button
                  type="button"
                  className={vStyles.viewAllContractorsBtn}
                  onClick={() => setIsContractorsModalOpen(true)}
                >
                  <span>{isAr ? 'عرض كل المقاولين' : 'View All Contractors'}</span>
                </button>
              </>
            )}
          </ZFWidgetCard>
        </div>
      </ZFWorkstationSideWidgets>

      {/* ─── 7. CANONICAL PROJECT BILL & EXPENSE MODAL ─── */}
      <ZFDirectExpenseModal
        isOpen={isNewExpenseModalOpen}
        onClose={() => setIsNewExpenseModalOpen(false)}
        isAr={isAr}
        properties={properties}
        activePeriod={activePeriod}
        periods={periods}
        onSaveEntry={onSaveExpenseEntry}
        initialPaymentSource={expensePurpose === 'claim' ? '201000' : '101000'}
        purpose={expensePurpose}
      />

      {onCreatePurchaseOrder && <ConstructionPurchaseOrderModal isOpen={isPurchaseOrderModalOpen} onClose={() => setIsPurchaseOrderModalOpen(false)} properties={properties} onSave={onCreatePurchaseOrder} isAr={isAr} />}

      {/* ─── 8. MODAL: CONTRACTOR AP SETTLEMENT MODAL ─── */}
      <CostPayableSettlementModal
        isOpen={!!settlementTarget}
        onClose={() => {
          setSettlementTarget(null);
        }}
        costItem={settlementTarget?.costItem || null}
        installment={settlementTarget?.installment || null}
        property={settlementTarget ? properties.find(p => p.id === settlementTarget.costItem.property_id) : null}
        availableCosts={effectivePropertyCosts}
        properties={properties}
        defaultPaymentMethod="CASH_101000"
        isAr={isAr}
        onConfirmPayment={async (updatedItem, installmentId, amountPaid, paymentMethod) => {
          if (!onRecordPayablePayment) throw new Error('Payment persistence is unavailable.');
          await onRecordPayablePayment(updatedItem, installmentId, amountPaid, paymentMethod);
          setSettlementTarget(null);
        }}
      />

      {/* ─── 9. MODAL: EDIT PROPERTY COST (24H GRACE PERIOD) ─── */}
      {editTargetCostItem && (
        <EditPropertyCostModal
          isOpen={!!editTargetCostItem}
          onClose={() => setEditTargetCostItem(null)}
          costItem={editTargetCostItem}
          property={properties.find(p => p.id === editTargetCostItem.property_id)}
          isAr={isAr}
          onConfirmEdit={async (updatedItem) => {
            if (onUpdatePropertyCostItem) {
              await onUpdatePropertyCostItem(updatedItem);
            }
            setEditTargetCostItem(null);
          }}
          onOpenAdjustmentModal={(item) => {
            setEditTargetCostItem(null);
            setAdjustmentTargetCostItem(item);
          }}
        />
      )}

      {/* ─── 10. MODAL: COST ADJUSTMENT SUB-ITEM ─── */}
      {adjustmentTargetCostItem && (
        <CostAdjustmentModal
          isOpen={!!adjustmentTargetCostItem}
          onClose={() => setAdjustmentTargetCostItem(null)}
          costItem={adjustmentTargetCostItem}
          property={properties.find(p => p.id === adjustmentTargetCostItem.property_id)}
          isAr={isAr}
          onConfirmAdjustment={async (updatedItem, adjustment) => {
            if (onAddCostAdjustment) {
              await onAddCostAdjustment(updatedItem, adjustment);
            }
            setAdjustmentTargetCostItem(null);
          }}
        />
      )}

      {/* ─── 11. INSPECT CLAIM MODAL (CENTERED WORKSTATION MODAL) ─── */}
      <ZFModalShell
        isOpen={!!inspectCostItem}
        onClose={() => setInspectCostItem(null)}
        title={inspectCostItem?.item_name_ar || (isAr ? 'تفاصيل المستخلص المالي' : 'Payable Claim Details')}
        subtitle={inspectCostItem ? `${inspectCostItem.supplier_contractor || (isAr ? 'مقاول موقع' : 'Contractor')} • ${getPropertyTitle(inspectCostItem.property_id)}` : undefined}
        icon={<HardHat size={18} color="var(--erp-accent, #2563eb)" />}
        maxWidth="850px"
        isAr={isAr}
        footer={
          inspectCostItem ? (
            <div className={vStyles.inspectModalFooter}>
              <button
                type="button"
                className={vStyles.secondaryBtn}
                onClick={() => setInspectCostItem(null)}
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
              {onUpdatePropertyCostItem && isItemWithinGracePeriod(inspectCostItem.created_at || inspectCostItem.logged_date, 24) && (
                <button
                  type="button"
                  className={vStyles.secondaryBtn}
                  onClick={() => {
                    const item = inspectCostItem;
                    setInspectCostItem(null);
                    setEditTargetCostItem(item);
                  }}
                >
                  <Edit3 size={13} color="var(--erp-accent, #2563eb)" />
                  <span>{isAr ? 'تعديل البند' : 'Edit Claim'}</span>
                </button>
              )}
              {inspectHasBalance && onUpdatePropertyCostItem && (
                <button
                  type="button"
                  className={vStyles.secondaryBtn}
                  onClick={() => {
                    const item = inspectCostItem;
                    setInspectCostItem(null);
                    handleQuickScheduleRow(item);
                  }}
                >
                  <Calendar size={13} color="var(--erp-accent, #2563eb)" />
                  <span>{isAr ? 'إعادة جدولة' : 'Reschedule Installments'}</span>
                </button>
              )}
              {inspectHasBalance && onRecordPayablePayment && inspectCostItem.linked_account_code === '201000' && (
                <button
                  type="button"
                  className={vStyles.primaryBtn}
                  onClick={() => handleSettleCostItem(inspectCostItem)}
                >
                  <CreditCard size={14} />
                  <span>{isAr ? 'سداد المستحق' : 'Settle Claim'}</span>
                </button>
              )}
            </div>
          ) : null
        }
      >
        {inspectCostItem && inspectTotals && (() => {
          const installments = inspectCostItem.payable_installments || [];
          return (
            <div className={vStyles.inspectModalBody}>
              {/* Header Identity Ribbon */}
              <div className={vStyles.inspectIdentityRibbon}>
                <div className={vStyles.inspectIdentityLeading}>
                  <div className={vStyles.inspectAvatar}>
                    <HardHat size={20} />
                  </div>
                  <div className={vStyles.inspectIdentityText}>
                    <div className={vStyles.inspectIdentityContractor}>
                      {inspectCostItem.supplier_contractor || (isAr ? 'مقاول غير محدد' : 'Contractor not specified')}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                      {inspectCostItem.item_name_ar}
                    </div>
                  </div>
                </div>
                <div className={vStyles.inspectIdentityTrailing}>
                  <span className={vStyles.contractorPillBadge}>
                    {getPropertyTitle(inspectCostItem.property_id)}
                  </span>
                  {inspectCostItem.invoice_ref && (
                    <span className={vStyles.contractorPillBadge}>
                      {inspectCostItem.invoice_ref}
                    </span>
                  )}
                  <span className={`${shellStyles.statusPill} ${inspectHasBalance ? shellStyles.statusPillAmber : shellStyles.statusPillGreen}`}>
                    {inspectHasBalance ? (isAr ? 'مستحق السداد' : 'Outstanding') : (isAr ? 'مسدد بالكامل' : 'Paid in Full')}
                  </span>
                </div>
              </div>

              {/* Executive 4-metric strip */}
              <div className={vStyles.inspectMetricsGrid}>
                <div className={vStyles.inspectMetricCard}>
                  <span className={vStyles.inspectMetricLabel}>{isAr ? 'إجمالي المطالبة' : 'Total Claim Amount'}</span>
                  <div className={vStyles.inspectMetricValue}>
                    <MoneyCell amount={inspectTotals.netEffectiveCost} isAr={isAr} hideDecimals />
                  </div>
                </div>
                <div className={vStyles.inspectMetricCard}>
                  <span className={vStyles.inspectMetricLabel}>{isAr ? 'المسدد حتى تاريخه' : 'Paid to Date'}</span>
                  <div className={vStyles.inspectMetricValue} style={{ color: '#16a34a' }}>
                    <MoneyCell amount={inspectTotals.paidAmount} isAr={isAr} hideDecimals />
                  </div>
                </div>
                <div className={vStyles.inspectMetricCard}>
                  <span className={vStyles.inspectMetricLabel}>{isAr ? 'المتبقي للاستحقاق' : 'Remaining Dues'}</span>
                  <div className={vStyles.inspectMetricValue} style={{ color: inspectHasBalance ? '#d97706' : '#10b981' }}>
                    <MoneyCell amount={inspectTotals.remainingAmount} isAr={isAr} hideDecimals />
                  </div>
                </div>
                <div className={vStyles.inspectMetricCard}>
                  <span className={vStyles.inspectMetricLabel}>{isAr ? 'تاريخ الاستحقاق القادم' : 'Next Due Date'}</span>
                  <div className={vStyles.inspectMetricValue} style={{ fontSize: '0.94rem' }}>
                    {inspectHasBalance ? (inspectNextDueDate || (isAr ? 'غير محدد' : 'Unscheduled')) : (isAr ? 'مسدد بالكامل' : 'Paid in Full')}
                  </div>
                </div>
              </div>

              {/* 2-Column Detailed Body */}
              <div className={vStyles.inspectBodyColumns}>
                {/* Right Column: Audit facts & Specifications */}
                <div className={vStyles.inspectColumn}>
                  <div className={vStyles.inspectColHeader}>
                    <span className={vStyles.inspectColTitle}>
                      <FileText size={15} color="var(--erp-accent, #2563eb)" />
                      {isAr ? 'بيانات التدقيق والمواصفات' : 'Audit Facts & Specifications'}
                    </span>
                  </div>
                  <div className={vStyles.inspectFactsList}>
                    <div className={vStyles.inspectFactItemWide}>
                      <span className={vStyles.inspectFactLabel}>{isAr ? 'المشروع العقاري' : 'Project Name'}</span>
                      <span className={vStyles.inspectFactVal}>{getPropertyTitle(inspectCostItem.property_id)}</span>
                    </div>
                    <div className={vStyles.inspectFactItem}>
                      <span className={vStyles.inspectFactLabel}>{isAr ? 'مركز التكلفة المحاسبي' : 'Cost Center'}</span>
                      <span className={vStyles.inspectFactVal}>{inspectCostItem.linked_account_code || (isAr ? '105000 (أعمال تحت التنفيذ)' : '105000 (WIP)')}</span>
                    </div>
                    <div className={vStyles.inspectFactItem}>
                      <span className={vStyles.inspectFactLabel}>{isAr ? 'مرحلة التنفيذ' : 'Construction Phase'}</span>
                      <span className={vStyles.inspectFactVal}>{inspectCostItem.phase || (isAr ? 'مرحلة التنفيذ' : 'Execution')}</span>
                    </div>
                    <div className={vStyles.inspectFactItem}>
                      <span className={vStyles.inspectFactLabel}>{isAr ? 'تاريخ التعاقد / التسجيل' : 'Contract Date'}</span>
                      <span className={vStyles.inspectFactVal}>{inspectCostItem.logged_date || (inspectCostItem.created_at ? inspectCostItem.created_at.slice(0, 10) : '—')}</span>
                    </div>
                    <div className={vStyles.inspectFactItem}>
                      <span className={vStyles.inspectFactLabel}>{isAr ? 'الرقم الضريبي / السجل' : 'Tax ID'}</span>
                      <span className={vStyles.inspectFactVal}>{(inspectCostItem as any).tax_id || (isAr ? '492-810-332 (مسجل ضريبياً)' : '492-810-332 (Tax Registered)')}</span>
                    </div>
                    <div className={vStyles.inspectFactItemWide}>
                      <span className={vStyles.inspectFactLabel}>{isAr ? 'ملاحظات ومواصفات البند' : 'Notes & Specifications'}</span>
                      <span className={vStyles.inspectFactVal} style={{ fontWeight: 400, color: '#475569' }}>
                        {inspectCostItem.notes?.replace(/\[FIN_OS_SECTION:\w+\]/g, '').replace(/^\s*\|\s*/, '').trim() || (isAr ? 'لا توجد مواصفات إضافية مسجلة' : 'No additional specifications')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Left Column: Installment Schedule Breakdown */}
                <div className={vStyles.inspectColumn}>
                  <div className={vStyles.inspectColHeader}>
                    <span className={vStyles.inspectColTitle}>
                      <Calendar size={15} color="var(--erp-accent, #2563eb)" />
                      {isAr ? 'جدول وتفاصيل الأقساط' : 'Installment Schedule'}
                    </span>
                    {inspectHasBalance && onUpdatePropertyCostItem && installments.length > 0 && (
                      <button
                        type="button"
                        className={vStyles.drawerTextAction}
                        onClick={() => {
                          const item = inspectCostItem;
                          setInspectCostItem(null);
                          handleQuickScheduleRow(item);
                        }}
                      >
                        <Calendar size={13} />
                        {isAr ? 'إعادة الهيكلة' : 'Restructure'}
                      </button>
                    )}
                  </div>

                  {installments.length > 0 ? (
                    <div className={vStyles.inspectInstallmentsList}>
                      {installments.map(inst => {
                        const isPaid = inst.status === 'PAID';
                        const overdue = !isPaid && !!inst.due_date && inst.due_date <= todayStr;
                        return (
                          <div key={inst.installment_id} className={vStyles.inspectInstallmentCard}>
                            <div className={vStyles.drawerInstallmentInfo}>
                              <strong>{isAr ? inst.title_ar : inst.title_en || inst.title_ar}</strong>
                              <span><Calendar size={12} />{inst.due_date}</span>
                            </div>
                            <div className={vStyles.drawerInstallmentEnd}>
                              <strong><MoneyCell amount={inst.amount_egp} isAr={isAr} hideDecimals /></strong>
                              <span className={`${shellStyles.statusPill} ${isPaid ? shellStyles.statusPillGreen : overdue ? shellStyles.statusPillRed : shellStyles.statusPillAmber}`}>
                                {isPaid ? (isAr ? 'مسدد' : 'Paid') : overdue ? (isAr ? 'متأخر' : 'Overdue') : (isAr ? 'مستحق' : 'Due')}
                              </span>
                              {!isPaid && onRecordPayablePayment && inspectCostItem.linked_account_code === '201000' && (
                                <button
                                  type="button"
                                  className={vStyles.inspectSettleInstBtn}
                                  onClick={() => handleSettleCostItem(inspectCostItem, inst)}
                                >
                                  {isAr ? 'سداد القسط' : 'Settle Tranche'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : inspectHasBalance ? (
                    <div className={vStyles.drawerEmptyPlan}>
                      <Calendar size={19} />
                      <strong>{isAr ? 'لم تُجدول دفعات هذا المستخلص بعد' : 'No payment plan yet'}</strong>
                      <span>{isAr ? 'يمكنك سداد الرصيد الآن أو تقسيمه إلى دفعات مستحقة.' : 'Settle the balance now or divide it into scheduled payments.'}</span>
                      <div className={vStyles.drawerPlanActions}>
                        <button
                          type="button"
                          className={vStyles.scheduleActionBtn}
                          disabled={!onUpdatePropertyCostItem}
                          onClick={() => {
                            const item = inspectCostItem;
                            setInspectCostItem(null);
                            handleQuickScheduleRow(item);
                          }}
                        >
                          <Calendar size={14} />
                          {isAr ? 'جدولة الدفعات' : 'Schedule'}
                        </button>
                        <button
                          type="button"
                          className={vStyles.drawerPrimaryAction}
                          disabled={!onRecordPayablePayment || inspectCostItem.linked_account_code !== '201000'}
                          onClick={() => handleSettleCostItem(inspectCostItem)}
                        >
                          <CreditCard size={14} />
                          {isAr ? 'سداد مباشر' : 'Pay directly'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={vStyles.drawerPaidState}>
                      <CheckCircle2 size={18} />
                      <span>{isAr ? 'تم سداد هذا المستخلص بالكامل دون أقساط مؤجلة.' : 'This claim was settled in full without installments.'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </ZFModalShell>

      {/* ─── 12. CONTRACTORS DIRECTORY MODAL ─── */}
      <ZFModalShell
        isOpen={isContractorsModalOpen}
        onClose={() => setIsContractorsModalOpen(false)}
        title={isAr ? 'دليل المقاولين والموردين المعتمدين' : 'Contractors Directory'}
        subtitle={isAr ? 'سجل موحد لجميع مقاولي التنفيذ، حجم الأعمال المتعاقد عليها، والمدفوعات والمستحقات المفتوحة' : 'Unified directory of contractors, contracted volumes, disbursed payments, and active dues'}
        icon={<HardHat size={18} color="var(--erp-accent, #2563eb)" />}
        maxWidth="900px"
        isAr={isAr}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', width: '100%' }}>
            <button
              type="button"
              className={vStyles.secondaryBtn}
              onClick={() => setIsContractorsModalOpen(false)}
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        }
      >
        <div className={vStyles.contractorsDirWrap}>
          {/* Search Box */}
          <div className={vStyles.contractorsSearchBox}>
            <Search size={16} />
            <input
              type="text"
              className={vStyles.contractorsSearchInput}
              placeholder={isAr ? 'بحث باسم المقاول، التخصص، أو المشروع...' : 'Search contractor by name, specialty, or project...'}
              value={contractorDirSearch}
              onChange={(e) => setContractorDirSearch(e.target.value)}
            />
            {contractorDirSearch && (
              <button
                type="button"
                onClick={() => setContractorDirSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 4-Stat Summary Banner */}
          <div className={vStyles.contractorsSummaryBanner}>
            <div className={vStyles.contractorsSummaryCard}>
              <span className={vStyles.contractorsSummaryLabel}>{isAr ? 'إجمالي المقاولين' : 'Total Contractors'}</span>
              <span className={vStyles.contractorsSummaryValue}>{contractorsTotals.count}</span>
            </div>
            <div className={vStyles.contractorsSummaryCard}>
              <span className={vStyles.contractorsSummaryLabel}>{isAr ? 'حجم الأعمال المعتمدة' : 'Contracted Volume'}</span>
              <span className={vStyles.contractorsSummaryValue}>
                {formatIntegerEGP(contractorsTotals.aggregateContracted.toNumber())} <small style={{ fontSize: '0.65rem' }}>{isAr ? 'ج.م' : 'EGP'}</small>
              </span>
            </div>
            <div className={vStyles.contractorsSummaryCard}>
              <span className={vStyles.contractorsSummaryLabel}>{isAr ? 'إجمالي المنصرف' : 'Total Settled'}</span>
              <span className={vStyles.contractorsSummaryValue} style={{ color: '#16a34a' }}>
                {formatIntegerEGP(contractorsTotals.aggregatePaid.toNumber())} <small style={{ fontSize: '0.65rem' }}>{isAr ? 'ج.م' : 'EGP'}</small>
              </span>
            </div>
            <div className={vStyles.contractorsSummaryCard}>
              <span className={vStyles.contractorsSummaryLabel}>{isAr ? 'المستحقات القائمة' : 'Outstanding Dues'}</span>
              <span className={vStyles.contractorsSummaryValue} style={{ color: contractorsTotals.aggregateRemaining.gt(0) ? '#d97706' : '#10b981' }}>
                {formatIntegerEGP(contractorsTotals.aggregateRemaining.toNumber())} <small style={{ fontSize: '0.65rem' }}>{isAr ? 'ج.م' : 'EGP'}</small>
              </span>
            </div>
          </div>

          {/* Canonical Data Table (7 Columns) */}
          <div className={vStyles.tableContainer} style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className={vStyles.canonicalTable}>
              <thead>
                <tr>
                  <th>{isAr ? 'المقاول / المورد' : 'Contractor / Supplier'}</th>
                  <th>{isAr ? 'عدد المشاريع المرتبطة' : 'Active Projects'}</th>
                  <th>{isAr ? 'إجمالي التعاقدات' : 'Contracted Volume'}</th>
                  <th>{isAr ? 'المسدد فعلياً' : 'Settled Amount'}</th>
                  <th>{isAr ? 'الرصيد المستحق' : 'Open Payables'}</th>
                  <th style={{ textAlign: 'center' }}>{isAr ? 'الحالة' : 'Status'}</th>
                  <th style={{ textAlign: 'center' }}>{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredContractorsDirectory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      {isAr ? 'لا يوجد مقاولين مطابقين للبحث' : 'No matching contractors found'}
                    </td>
                  </tr>
                ) : (
                  filteredContractorsDirectory.map((c) => (
                    <tr key={c.name} className={vStyles.canonicalRow}>
                      <td>
                        <div className={vStyles.contractorIdentity}>
                          <div className={vStyles.contractorSquircle}>
                            {c.name.charAt(0)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <strong style={{ fontSize: '0.82rem', color: '#0f172a', display: 'block' }}>{c.name}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {c.specialties.length > 0 && (
                                <span className={vStyles.contractorPillBadge}>{c.specialties.join(' • ')}</span>
                              )}
                              <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
                                {c.claimCount} {isAr ? 'مطالبات' : 'claims'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a' }}>
                            {c.projectNames.length}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {isAr ? (c.projectNames.length === 1 ? 'مشروع مرتبط' : 'مشاريع مرتبطة') : (c.projectNames.length === 1 ? 'project' : 'projects')}
                          </span>
                        </div>
                        {c.projectNames.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                            {c.projectNames.map(pName => (
                              <span key={pName} className={vStyles.contractorPillBadge} style={{ background: '#f8fafc', fontSize: '0.64rem' }}>
                                {pName}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#0f172a' }}>
                          {formatIntegerEGP(c.totalContracted.toNumber())} <small style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</small>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#16a34a', fontWeight: 600 }}>
                          {formatIntegerEGP(c.totalPaid.toNumber())} <small style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</small>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: c.totalRemaining.gt(0) ? '#d97706' : '#64748b', fontWeight: 700 }}>
                          {formatIntegerEGP(c.totalRemaining.toNumber())} <small style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</small>
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${shellStyles.statusPill} ${c.hasDues ? shellStyles.statusPillAmber : shellStyles.statusPillGreen}`}>
                          {c.hasDues ? (isAr ? 'مستحق السداد' : 'Active Dues') : (isAr ? 'مسدد بالكامل' : 'Settled')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={vStyles.contractorFilterBtn}
                          onClick={() => {
                            setContractorFilter(c.name);
                            setIsContractorsModalOpen(false);
                            setCurrentPage(1);
                            toast.success(
                              isAr
                                ? `تمت تصفية الفواتير للمقاول: ${c.name}`
                                : `Filtered invoices for: ${c.name}`
                            );
                          }}
                        >
                          <Filter size={12} />
                          <span>{isAr ? 'تصفية الفواتير' : 'Filter Invoices'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ZFModalShell>

      {/* ─── 12. REPORT MODAL: CONTRACTOR PAYABLES STATEMENT ─── */}
      <ZFModalShell
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={isAr ? 'تقرير مستحقات المقاولين وجدول الصرف (AP)' : 'Contractor Payables & Claims Statement'}
        subtitle={isAr ? 'نظام FIN-OS الإداري المالي • شركة زكريا فريد للتطوير والاستثمار العقاري' : 'FIN-OS Financial Management • Zakaria Farid Real Estate'}
        icon={<Printer size={18} color="var(--erp-accent, #2563eb)" />}
        maxWidth="880px"
        isAr={isAr}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', width: '100%' }}>
            <button
              type="button"
              className={vStyles.secondaryBtn}
              onClick={() => setIsReportModalOpen(false)}
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
            <button
              type="button"
              className={vStyles.secondaryBtn}
              onClick={handleExportCSV}
            >
              <Download size={14} />
              <span>{isAr ? 'تصدير إلى Excel' : 'Export to Excel'}</span>
            </button>
            <button
              type="button"
              className={vStyles.primaryBtn}
              onClick={() => window.print()}
            >
              <Printer size={14} />
              <span>{isAr ? 'طباعة التقرير' : 'Print Statement'}</span>
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div style={{ textAlign: 'left', fontVariantNumeric: 'tabular-nums', fontSize: '0.76rem', color: '#64748b' }}>
            <div>{isAr ? 'تاريخ الاستخراج: ' : 'Generated: '}{new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</div>
            <div>{isAr ? 'إجمالي السجلات: ' : 'Total Records: '}{filteredPayables.length}</div>
          </div>

          {/* Summary Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1rem'
          }}>
            <div>
              <span style={{ fontSize: '0.70rem', color: '#64748b', display: 'block' }}>{isAr ? 'إجمالي مصاريف WIP:' : 'Total WIP:'}</span>
              <strong style={{ fontSize: '1rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {formatIntegerEGP(executiveKPIs.totalWipCapitalized)} {isAr ? 'ج.م' : 'EGP'}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.70rem', color: '#64748b', display: 'block' }}>{isAr ? 'مستحقات المقاولين:' : 'Total Payables:'}</span>
              <strong style={{ fontSize: '1rem', color: '#d97706', fontVariantNumeric: 'tabular-nums' }}>
                {formatIntegerEGP(executiveKPIs.totalApLiabilities)} {isAr ? 'ج.م' : 'EGP'}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.70rem', color: '#64748b', display: 'block' }}>{isAr ? 'المدفوعات المنفذة:' : 'Total Paid:'}</span>
              <strong style={{ fontSize: '1rem', color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                {formatIntegerEGP(executiveKPIs.totalApPaid)} {isAr ? 'ج.م' : 'EGP'}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.70rem', color: '#64748b', display: 'block' }}>{isAr ? 'المتأخرات الحرجة:' : 'Overdue Backlog:'}</span>
              <strong style={{ fontSize: '1rem', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                {formatIntegerEGP(executiveKPIs.overdueInstallmentsAmount)} {isAr ? 'ج.م' : 'EGP'}
              </strong>
            </div>
          </div>

          {/* Report Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                <th style={{ padding: '0.5rem 0.6rem' }}>#</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>{isAr ? 'المقاول' : 'Contractor'}</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>{isAr ? 'المشروع' : 'Project'}</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>{isAr ? 'رقم الفاتورة' : 'Invoice'}</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>{isAr ? 'الاستحقاق' : 'Due'}</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>{isAr ? 'الإجمالي' : 'Total'}</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>{isAr ? 'المدفوع' : 'Paid'}</th>
                <th style={{ padding: '0.5rem 0.6rem' }}>{isAr ? 'المتبقي' : 'Remaining'}</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayables.map((row, idx) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.5rem 0.6rem', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</td>
                  <td style={{ padding: '0.5rem 0.6rem', fontWeight: 700 }}>{row.contractor}</td>
                  <td style={{ padding: '0.5rem 0.6rem' }}>{row.projectName}</td>
                  <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'monospace' }}>{row.invoiceRef}</td>
                  <td style={{ padding: '0.5rem 0.6rem', fontVariantNumeric: 'tabular-nums' }}>{row.dueDate}</td>
                  <td style={{ padding: '0.5rem 0.6rem', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    <MoneyCell amount={row.totalNum.toFixed(2)} isAr={isAr} hideDecimals={true} />
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem', fontVariantNumeric: 'tabular-nums', color: '#16a34a' }}>
                    <MoneyCell amount={row.paidNum.toFixed(2)} isAr={isAr} hideDecimals={true} />
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem', fontVariantNumeric: 'tabular-nums', color: row.statusKey === 'overdue' ? '#dc2626' : '#0f172a', fontWeight: 700 }}>
                    <MoneyCell amount={row.remainingNum.toFixed(2)} isAr={isAr} hideDecimals={true} />
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                    <span className={`${shellStyles.statusPill} ${row.statusPillClass}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ZFModalShell>

      {/* ─── 13. MODAL: SCHEDULE CONTRACTOR INSTALLMENT / CHEQUE (BUTTON #4) ─── */}
      <ZFModalShell
        isOpen={isScheduleContractorModalOpen}
        onClose={() => setIsScheduleContractorModalOpen(false)}
        title={isAr ? 'جدولة دفعة ومستحقات مقاول (AP Schedule)' : 'Schedule Contractor Installments (AP)'}
        subtitle={isAr ? 'إعادة هيكلة وجدولة مستحقات البناء على أقساط ودفعات مؤجلة' : 'Structure payable tranches for construction obligations'}
        icon={<Calendar size={18} color="var(--erp-accent, #2563eb)" />}
        maxWidth="600px"
        isAr={isAr}
      >
        <form onSubmit={handleSaveContractorSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              {isAr ? 'اختر البند / المستخلص المستهدف للجدولة *' : 'Target Claim / Cost Item *'}
            </label>
            <select
              value={scheduleSelectedCostItemId}
              onChange={(e) => setScheduleSelectedCostItemId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            >
              <option value="">{isAr ? '-- اختر المستخلص / المقاول --' : '-- Select Contractor / Claim --'}</option>
              {unscheduledCosts.length > 0 && (
                <optgroup label={isAr ? '📌 فواتير ومستخلصات بحاجة لجدولة (غير مجدولة)' : '📌 Bills Needing Scheduling (Unscheduled)'}>
                  {unscheduledCosts.map(c => {
                    const { remainingAmount } = calculateCostItemEffectiveTotals(c);
                    return (
                      <option key={c.item_id || c.id} value={c.item_id || c.id}>
                        {c.supplier_contractor || (isAr ? 'مقاول موقع' : 'Contractor')} - {c.item_name_ar} ({getPropertyTitle(c.property_id)}) [المتبقي: {formatIntegerEGP(remainingAmount)} {isAr ? 'ج.م' : 'EGP'}]
                      </option>
                    );
                  })}
                </optgroup>
              )}
              {scheduledCosts.length > 0 && (
                <optgroup label={isAr ? '🔄 فواتير مجدولة مسبقاً (إعادة هيكلة الأقساط)' : '🔄 Scheduled Bills (Reschedule / Restructure)'}>
                  {scheduledCosts.map(c => {
                    const { remainingAmount } = calculateCostItemEffectiveTotals(c);
                    const count = c.payable_installments?.length || 0;
                    return (
                      <option key={c.item_id || c.id} value={c.item_id || c.id}>
                        {c.supplier_contractor || (isAr ? 'مقاول موقع' : 'Contractor')} - {c.item_name_ar} ({getPropertyTitle(c.property_id)}) [{count} أقساط • المتبقي: {formatIntegerEGP(remainingAmount)} {isAr ? 'ج.م' : 'EGP'}]
                      </option>
                    );
                  })}
                </optgroup>
              )}
              {unscheduledCosts.length === 0 && scheduledCosts.length === 0 && effectivePropertyCosts.map(c => {
                const { remainingAmount } = calculateCostItemEffectiveTotals(c);
                return (
                  <option key={c.item_id || c.id} value={c.item_id || c.id}>
                    {c.supplier_contractor || (isAr ? 'مقاول موقع' : 'Contractor')} - {c.item_name_ar} ({getPropertyTitle(c.property_id)}) [المتبقي: {formatIntegerEGP(remainingAmount)} {isAr ? 'ج.م' : 'EGP'}]
                  </option>
                );
              })}
            </select>
          </div>

          {scheduleSelectedCostItemId && (() => {
            const selectedItem = effectivePropertyCosts.find(c => (c.item_id || c.id) === scheduleSelectedCostItemId);
            if (!selectedItem) return null;
            const { netEffectiveCost, paidAmount, remainingAmount } = calculateCostItemEffectiveTotals(selectedItem);
            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.6rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.75rem'
              }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>{isAr ? 'إجمالي البند:' : 'Total Cost:'}</span>
                  <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{formatIntegerEGP(netEffectiveCost)} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>
                <div>
                  <span style={{ color: '#16a34a', display: 'block' }}>{isAr ? 'المسدد:' : 'Paid:'}</span>
                  <strong style={{ color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{formatIntegerEGP(paidAmount)} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>
                <div>
                  <span style={{ color: '#d97706', display: 'block' }}>{isAr ? 'المتبقي:' : 'Remaining:'}</span>
                  <strong style={{ color: '#d97706', fontVariantNumeric: 'tabular-nums' }}>{formatIntegerEGP(remainingAmount)} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'دفعة مقدمة فورية (ج.م)' : 'Down Payment (EGP)'}
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={scheduleDownPayment}
                onChange={(e) => setScheduleDownPayment(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'عدد الأقساط المؤجلة' : 'Number of Tranches'}
              </label>
              <input
                type="number"
                min="1"
                max="36"
                value={scheduleNumTranches}
                onChange={(e) => setScheduleNumTranches(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'تاريخ أول قسط' : 'First Due Date'}
              </label>
              <input
                type="date"
                value={scheduleFirstDueDate}
                onChange={(e) => setScheduleFirstDueDate(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                {isAr ? 'دورية السداد (أشهر)' : 'Frequency (Months)'}
              </label>
              <select
                value={scheduleFrequencyMonths}
                onChange={(e) => setScheduleFrequencyMonths(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              >
                <option value="1">{isAr ? 'شهرياً (شهر واحد)' : 'Monthly (1 Month)'}</option>
                <option value="2">{isAr ? 'كل شهرين' : 'Every 2 Months'}</option>
                <option value="3">{isAr ? 'ربع سنوي (3 أشهر)' : 'Quarterly (3 Months)'}</option>
                <option value="6">{isAr ? 'نصف سنوي (6 أشهر)' : 'Semi-Annual (6 Months)'}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className={vStyles.secondaryBtn}
              onClick={() => setIsScheduleContractorModalOpen(false)}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmittingSchedule || !scheduleSelectedCostItemId}
              className={vStyles.primaryBtn}
            >
              {isSubmittingSchedule ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ جدولة الدفعات ✓' : 'Save Schedule')}
            </button>
          </div>
        </form>
      </ZFModalShell>
    </div>
  );
};

export default ConstructionPayablesView;
