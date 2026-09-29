'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Info,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Filter,
  ExternalLink,
  Layers,
  Receipt,
  Sparkles,
  ArrowUpRight,
  ChevronsUpDown,
  CreditCard,
  AlertTriangle,
  Maximize2,
  FilePlus,
  Coins,
  Activity,
  UserCheck,
  FileText,
  Users,
  HardHat,
  BarChart3,
  Banknote,
  SlidersHorizontal
} from 'lucide-react';
import { 
  ERPContract, 
  ERPPDCRecord, 
  ERPInstallmentSchedule, 
  ERPJournalEntry, 
  ERPPropertyCostItem,
  ERPCostAllocation,
  ERPTaxRecord, 
  ERPPartnerCall 
} from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D, Decimal } from '@/lib/erp/math';
import { getAvailableCash, getConstructionWIP } from '@/lib/erp/canonicalMetrics';
import { ERPApexChart } from '../charts/ERPApexChart';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { ZFSearchBar } from '../common/ZFSearchBar';
import { ZFKpiCard, ZFKpiGrid } from '../ZFKpiCard';
import { ZFWorkstationSideWidgets, ZFWidgetCard } from '../common/ZFWorkstationSideWidgets';
import { ZFModalShell } from '../common/ZFModalShell';
import styles from '../ZFWorkstationShell.module.css';
import { useERPWorkstation } from '../../context/ERPWorkstationContext';

interface CockpitViewProps {
  isAr: boolean;
  kpis: {
    cashBank: string;
    totalWip: string;
    accountsReceivable: string;
    deferredRevenue: string;
    realizedRevenue: string;
  };
  totalGrossContractValue: string;
  totalCollectedCash: string;
  totalWipIncurred: string;
  totalSafePDCs?: string;
  totalInjectedCapital?: string;
  wipAccounts: {
    land: string;
    civil: string;
    mep: string;
    finishing: string;
    financing: string;
  };
  contracts: ERPContract[];
  pdcRecords: ERPPDCRecord[];
  schedules: ERPInstallmentSchedule[];
  journalEntries: ERPJournalEntry[];
  propertyCosts?: ERPPropertyCostItem[];
  costAllocations?: ERPCostAllocation[];
  properties?: Property[];
  taxRecords?: ERPTaxRecord[];
  partnerCalls?: ERPPartnerCall[];
  onOpenProjectExpense?: () => void;
  onInspectContract: (contract: ERPContract) => void;
  onInspectCheque: (cheque: ERPPDCRecord) => void;
  onCollectItem?: (item: ERPPDCRecord) => void;
  onOpenNewCheque?: () => void;
  onOpenNewContract?: () => void;
  onNavigateTab?: (tab: string, filterParams?: any) => void;
}

export const CockpitView: React.FC<CockpitViewProps> = ({
  isAr = true,
  kpis,
  totalGrossContractValue,
  totalCollectedCash,
  totalWipIncurred,
  totalSafePDCs = '0.00',
  totalInjectedCapital = '0.00',
  contracts = [],
  pdcRecords = [],
  schedules = [],
  journalEntries = [],
  propertyCosts = [],
  costAllocations = [],
  properties = [],
  taxRecords = [],
  partnerCalls = [],
  onOpenProjectExpense,
  onInspectContract,
  onInspectCheque,
  onCollectItem,
  onOpenNewCheque,
  onOpenNewContract,
  onNavigateTab,
}) => {
  const { activePreset } = useERPWorkstation();
  const currentAccent = activePreset?.accent || '#2563eb';

  // Open the operational collection agenda, never the quarantined cheque workflow.
  const handleOpenInstallmentCollection = useCallback(() => {
    if (onNavigateTab) onNavigateTab('pdc');
    else if (contracts[0]) onInspectContract(contracts[0]);
  }, [contracts, onNavigateTab, onInspectContract]);

  // Stat block interactive filters
  const [statPeriodFilter, setStatPeriodFilter] = useState<'month' | 'quarter' | 'year'>('month');
  const [statProjectFilter, setStatProjectFilter] = useState('all');

  // Table active dataset tab
  type CockpitTableTab = 'all' | 'collections' | 'contractors' | 'pdc' | 'ledger';
  const [activeTableTab, setActiveTableTab] = useState<CockpitTableTab>('all');
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('all');
  const [isFullScreenTableOpen, setIsFullScreenTableOpen] = useState(false);

  // Dedicated in-page modals for side widgets
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleFilterTab, setScheduleFilterTab] = useState<'all' | 'installments' | 'contractors' | 'pdc'>('all');
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);

  // Interactive column sorting state
  const [tableSortField, setTableSortField] = useState<string | null>(null);
  const [tableSortAsc, setTableSortAsc] = useState<boolean>(true);

  const handleTableSort = useCallback((field: string) => {
    setTableSortField((prevField) => {
      if (prevField === field) {
        setTableSortAsc((prevAsc) => !prevAsc);
        return field;
      }
      setTableSortAsc(true);
      return field;
    });
  }, []);

  // Dynamic table page size (adapts to 8 rows on wide viewports >= 1600px)
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1600) {
      return 8;
    }
    return 5;
  });

  // Table active page index (1-based)
  const [currentPage, setCurrentPage] = useState(1);

  // Auto-adapt default page size on window resize if at defaults
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1600) {
        setPageSize(prev => (prev === 5 ? 8 : prev));
      } else {
        setPageSize(prev => (prev === 8 ? 5 : prev));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset page to 1 and sort state whenever tab, search query, status filter, project filter, or page size changes
  useEffect(() => {
    setCurrentPage(1);
    setTableSortField(null);
    setTableSortAsc(true);
  }, [activeTableTab, tableSearchQuery, tableStatusFilter, statProjectFilter, statPeriodFilter, pageSize]);

  // Mini Calendar Month View State (matches media_1789556994349.jpg)
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  const miniCalendarMonthTitle = useMemo(() => {
    return calendarViewDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
      month: 'long',
      year: 'numeric'
    });
  }, [calendarViewDate, isAr]);

  const handlePrevMonth = useCallback(() => {
    setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedCalendarDay(null);
    setCurrentPage(1);
  }, []);

  const handleNextMonth = useCallback(() => {
    setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedCalendarDay(null);
    setCurrentPage(1);
  }, []);

  const selectedDateStr = useMemo(() => {
    if (selectedCalendarDay === null) return null;
    const year = calendarViewDate.getFullYear();
    const month = String(calendarViewDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedCalendarDay).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [calendarViewDate, selectedCalendarDay]);

  const miniCalendarCells = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Arabic business week starts on Saturday
    // getDay(): Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    const standardDay = firstDay.getDay();
    const startDayIndex = (standardDay + 1) % 7; // Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6

    const cells: { day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Filler from previous month
    for (let i = startDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    const todayObj = new Date();
    const isCurrentYearMonth = year === todayObj.getFullYear() && month === todayObj.getMonth();

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = isCurrentYearMonth && d === todayObj.getDate();
      cells.push({
        day: d,
        isCurrentMonth: true,
        isToday,
      });
    }

    // Filler for next month up to multiple of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return cells;
  }, [calendarViewDate]);

  // Helper: Match item to selected project
  const isPropertyInProject = useCallback((propertyId?: string, unitId?: string) => {
    if (statProjectFilter === 'all') return true;
    if (propertyId === statProjectFilter) return true;
    const property = (properties || []).find(p => p.id === statProjectFilter);
    return !!unitId && !!property?.building_units?.some(u => u.unit_id === unitId || (u as any).unit_number === unitId);
  }, [statProjectFilter, properties]);

  // Date parsing & period helper
  const now = calendarViewDate;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
  const prevQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear;

  const prevYear = currentYear - 1;

  const parseDateParts = useCallback((dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      quarter: Math.floor(d.getMonth() / 3),
      timestamp: d.getTime()
    };
  }, []);

  const isInCurrentPeriod = useCallback((dateStr?: string) => {
    const parts = parseDateParts(dateStr);
    if (!parts) return false;
    if (statPeriodFilter === 'month') {
      return parts.year === currentYear && parts.month === currentMonth;
    }
    if (statPeriodFilter === 'quarter') {
      return parts.year === currentYear && parts.quarter === currentQuarter;
    }
    return parts.year === currentYear;
  }, [parseDateParts, statPeriodFilter, currentYear, currentMonth, currentQuarter]);

  const isInPriorPeriod = useCallback((dateStr?: string) => {
    const parts = parseDateParts(dateStr);
    if (!parts) return false;
    if (statPeriodFilter === 'month') {
      return parts.year === prevMonthYear && parts.month === prevMonth;
    }
    if (statPeriodFilter === 'quarter') {
      return parts.year === prevQuarterYear && parts.quarter === prevQuarter;
    }
    return parts.year === prevYear;
  }, [parseDateParts, statPeriodFilter, prevMonthYear, prevMonth, prevQuarterYear, prevQuarter, prevYear]);

  const formatDelta = useCallback((current: Decimal, prior: Decimal): string | null => {
    if (prior.isZero()) {
      if (current.isZero()) return '0.0%';
      return '+100.0%';
    }
    const diff = current.minus(prior);
    const pct = diff.dividedBy(prior.abs()).times(100);
    const sign = pct.gte(0) ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }, []);

  // 1. Available Cash (Canonical metric: real ledger aggregation for accounts 101000 & 102000)
  const { cashNum, cashDelta, safeCashFormatted, bankCashFormatted } = useMemo(() => {
    const projectJournal = journalEntries.filter(e => {
      if (statProjectFilter === 'all') return true;
      if (isPropertyInProject(e.source_entity_id)) return true;
      return (e.lines || []).some(l => 
        isPropertyInProject(undefined, l.unit_id) ||
        (l.contract_id && isPropertyInProject(contracts.find(c => c.contract_id === l.contract_id)?.property_id))
      );
    });

    const periodEnd = new Date(currentYear, statPeriodFilter === 'year' ? 12 : statPeriodFilter === 'quarter' ? currentQuarter * 3 + 3 : currentMonth + 1, 1);
    const { totalCash, safeCash, bankCash } = getAvailableCash(projectJournal, { filter: e => new Date(e.entry_date) < periodEnd });
    const currentPeriodNet = getAvailableCash(projectJournal, { filter: e => isInCurrentPeriod(e.entry_date) }).totalCash;
    const priorPeriodNet = getAvailableCash(projectJournal, { filter: e => isInPriorPeriod(e.entry_date) }).totalCash;
    const delta = formatDelta(currentPeriodNet, priorPeriodNet);

    return {
      cashNum: Math.round(totalCash.toNumber()),
      cashDelta: delta,
      safeCashFormatted: Math.round(safeCash.toNumber()).toLocaleString('en-US'),
      bankCashFormatted: Math.round(bankCash.toNumber()).toLocaleString('en-US')
    };
  }, [journalEntries, statProjectFilter, isPropertyInProject, contracts, isInCurrentPeriod, isInPriorPeriod, formatDelta]);

  // 2. Gross Contract Value (Real aggregation from contracts signed in period and matching project)
  const { grossContractsNum, contractsDelta } = useMemo(() => {
    const projectContracts = contracts.filter(c => isPropertyInProject(c.property_id, c.unit_id));

    let currentPeriodSum = D(0);
    let priorPeriodSum = D(0);
    let totalAllTimeSum = D(0);

    projectContracts.forEach(c => {
      const gv = D(c.gross_contract_value || 0);
      totalAllTimeSum = totalAllTimeSum.plus(gv);

      const dStr = c.contract_date || (c as any).created_at;
      if (isInCurrentPeriod(dStr)) {
        currentPeriodSum = currentPeriodSum.plus(gv);
      } else if (isInPriorPeriod(dStr)) {
        priorPeriodSum = priorPeriodSum.plus(gv);
      }
    });

    const delta = formatDelta(currentPeriodSum, priorPeriodSum);
    const val = currentPeriodSum;

    return {
      grossContractsNum: Math.round(val.toNumber()),
      contractsDelta: delta
    };
  }, [contracts, isPropertyInProject, isInCurrentPeriod, isInPriorPeriod, formatDelta]);

  // 3. Construction WIP (Canonical metric: tiered fallback across approved allocations -> property costs -> GL WIP accounts)
  const { wipNum, wipDelta } = useMemo(() => {
    const isAllocationInProject = (ca: ERPCostAllocation) => {
      if (statProjectFilter === 'all') return true;
      const property = (properties || []).find(p => p.id === statProjectFilter);
      return !!property && [property.title_ar, property.title_en].includes(ca.project_name);
    };

    const projectAllocations = costAllocations.filter(isAllocationInProject);
    const projectCosts = propertyCosts.filter(c => isPropertyInProject(c.property_id));

    let currentPeriodSum = D(0);
    let priorPeriodSum = D(0);
    let totalAllTimeSum = D(0);

    if (projectAllocations.length > 0) {
      // Tier 1: Audited milestone-level cost allocations
      totalAllTimeSum = getConstructionWIP(projectAllocations);
      currentPeriodSum = getConstructionWIP(projectAllocations, { filter: c => isInCurrentPeriod(c.calculated_at) });
      priorPeriodSum = getConstructionWIP(projectAllocations, { filter: c => isInPriorPeriod(c.calculated_at) });
    } else if (projectCosts.length > 0) {
      // Tier 2: Real-time itemized site expenditures
      totalAllTimeSum = getConstructionWIP(projectCosts);
      currentPeriodSum = getConstructionWIP(projectCosts, { filter: c => isInCurrentPeriod(c.logged_date) });
      priorPeriodSum = getConstructionWIP(projectCosts, { filter: c => isInPriorPeriod(c.logged_date) });
    } else {
      // Tier 3: General Ledger double-entry movements
      const projectJournal = journalEntries.filter(e => {
        if (statProjectFilter === 'all') return true;
        if (isPropertyInProject(e.source_entity_id)) return true;
        return (e.lines || []).some(l => 
          isPropertyInProject(undefined, l.unit_id) ||
          (l.contract_id && isPropertyInProject(contracts.find(c => c.contract_id === l.contract_id)?.property_id))
        );
      });
      totalAllTimeSum = getConstructionWIP(projectJournal);
      currentPeriodSum = getConstructionWIP(projectJournal, { filter: e => isInCurrentPeriod(e.entry_date) });
      priorPeriodSum = getConstructionWIP(projectJournal, { filter: e => isInPriorPeriod(e.entry_date) });
    }

    const delta = formatDelta(currentPeriodSum, priorPeriodSum);
    const val = currentPeriodSum;

    return {
      wipNum: Math.round(val.toNumber()),
      wipDelta: delta
    };
  }, [costAllocations, propertyCosts, journalEntries, contracts, statProjectFilter, properties, isPropertyInProject, isInCurrentPeriod, isInPriorPeriod, formatDelta]);

  // Contract schedules are the sole source of operational collections; legacy cheques stay quarantined.
  const outstandingSchedules = useMemo(() => schedules.filter(s => {
    const contract = contracts.find(c => c.contract_id === s.contract_id);
    return !['Paid', 'Void', 'SUPERSEDED'].includes(s.status) && contract?.status !== 'Rescinded'
      && isPropertyInProject(contract?.property_id, contract?.unit_id);
  }), [schedules, contracts, isPropertyInProject]);
  const { safePdcNum, pdcDelta } = useMemo(() => {
    const sum = (matches: (date?: string) => boolean) => outstandingSchedules.reduce((total, s) =>
      matches(s.due_date) ? total.plus(D(s.nominal_value || 0).minus(s.amount_paid || 0).max(0)) : total, D(0));
    const current = sum(isInCurrentPeriod);
    return { safePdcNum: current.toNumber(), pdcDelta: formatDelta(current, sum(isInPriorPeriod)) };
  }, [outstandingSchedules, isInCurrentPeriod, isInPriorPeriod, formatDelta]);

  const chartData = useMemo(() => {
    const start = new Date(currentYear, statPeriodFilter === 'year' ? 0 : statPeriodFilter === 'quarter' ? currentQuarter * 3 : currentMonth, 1);
    const end = new Date(currentYear, statPeriodFilter === 'year' ? 12 : statPeriodFilter === 'quarter' ? currentQuarter * 3 + 3 : currentMonth + 1, 1);
    const buckets: Date[] = [];
    for (let date = new Date(start); date < end;) {
      buckets.push(new Date(date));
      if (statPeriodFilter === 'month') date.setDate(date.getDate() + 7);
      else if (statPeriodFilter === 'quarter') date.setDate(date.getDate() + 14);
      else date.setMonth(date.getMonth() + 1);
    }
    const bucketFor = (date: string) => buckets.findIndex((b, i) => new Date(date) >= b && new Date(date) < (buckets[i + 1] || end));
    const inflows = buckets.map(() => 0);
    const outflows = buckets.map(() => 0);
    outstandingSchedules.forEach(s => {
      const i = bucketFor(s.due_date);
      if (i >= 0) inflows[i] += Math.max(0, Number(s.nominal_value || 0) - Number(s.amount_paid || 0)) / 1000000;
    });
    propertyCosts.filter(c => isPropertyInProject(c.property_id)).forEach(c => {
      if (c.payable_installments?.length) c.payable_installments.filter(i => i.status !== 'PAID').forEach(inst => {
        const i = bucketFor(inst.due_date);
        if (i >= 0) outflows[i] += Math.max(0, Number(inst.amount_egp || 0) - Number(inst.paid_amount_egp || 0)) / 1000000;
      });
      else if (c.due_date) {
        const i = bucketFor(c.due_date);
        if (i >= 0) outflows[i] += Math.max(0, Number(c.remaining_amount_egp || 0)) / 1000000;
      }
    });
    return { categories: buckets.map(date => date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', statPeriodFilter === 'year' ? { month: 'short' } : { month: 'short', day: 'numeric' })), inflows, outflows };
  }, [isAr, currentYear, currentQuarter, currentMonth, statPeriodFilter, outstandingSchedules, propertyCosts, isPropertyInProject]);

  const kpiWaves = useMemo(() => {
    const start = new Date(currentYear, statPeriodFilter === 'year' ? 0 : statPeriodFilter === 'quarter' ? currentQuarter * 3 : currentMonth, 1).getTime();
    const end = new Date(currentYear, statPeriodFilter === 'year' ? 12 : statPeriodFilter === 'quarter' ? currentQuarter * 3 + 3 : currentMonth + 1, 1).getTime();
    const cutoffs = Array.from({ length: 6 }, (_, index) => start + (end - start) * (index + 1) / 6);
    const journal = journalEntries.filter(entry => statProjectFilter === 'all' || isPropertyInProject(entry.source_entity_id) || entry.lines?.some(line => isPropertyInProject(undefined, line.unit_id) || isPropertyInProject(contracts.find(c => c.contract_id === line.contract_id)?.property_id)));
    const costs = propertyCosts.filter(cost => isPropertyInProject(cost.property_id));
    const property = (properties || []).find(p => p.id === statProjectFilter);
    const allocations = costAllocations.filter(a => statProjectFilter === 'all' || !!property && [property.title_ar, property.title_en].includes(a.project_name));
    const within = (date: string | undefined, cutoff: number) => !!date && new Date(date).getTime() >= start && new Date(date).getTime() < cutoff;
    return {
      cash: cutoffs.map(cutoff => getAvailableCash(journal, { filter: e => new Date(e.entry_date).getTime() < cutoff }).totalCash.toNumber()),
      contracts: cutoffs.map(cutoff => contracts.filter(c => c.status !== 'Rescinded' && isPropertyInProject(c.property_id, c.unit_id) && within(c.contract_date, cutoff)).reduce((total, c) => total.plus(c.gross_contract_value || 0), D(0)).toNumber()),
      wip: cutoffs.map(cutoff => allocations.length ? getConstructionWIP(allocations, { filter: a => within(a.calculated_at, cutoff) }).toNumber() : costs.length ? getConstructionWIP(costs, { filter: c => within(c.logged_date, cutoff) }).toNumber() : getConstructionWIP(journal, { filter: e => within(e.entry_date, cutoff) }).toNumber()),
      dues: cutoffs.map(cutoff => outstandingSchedules.filter(s => within(s.due_date, cutoff)).reduce((total, s) => total.plus(D(s.nominal_value || 0).minus(s.amount_paid || 0).max(0)), D(0)).toNumber()),
    };
  }, [currentYear, currentMonth, currentQuarter, statPeriodFilter, statProjectFilter, journalEntries, contracts, propertyCosts, costAllocations, properties, isPropertyInProject, outstandingSchedules]);

  const apexChartSeries = useMemo(() => [
    {
      name: isAr ? 'التدفق النقدي المتوقع' : 'Projected Inflow',
      type: 'line',
      data: chartData.inflows,
    },
    {
      name: isAr ? 'المصروفات المتوقعة' : 'Projected Outflow',
      type: 'line',
      data: chartData.outflows,
    },
  ], [chartData, isAr]);

  const apexChartOptions = useMemo<ApexCharts.ApexOptions>(() => ({
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 2,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '11px',
          fontWeight: 500,
        },
      },
      axisBorder: { show: true, color: '#cbd5e1' },
      axisTicks: { show: true, color: '#cbd5e1' },
    },
    yaxis: {
      opposite: isAr,
      axisBorder: { show: true, color: '#cbd5e1' },
      labels: {
        style: {
          colors: '#64748b',
          fontSize: '11px',
          fontWeight: 500,
        },
        formatter: (val: number) => val === 0 ? '0' : val < 1 ? `${Math.round(val * 1000)} ${isAr ? 'ألف' : 'k'}` : `${Number(val.toFixed(1))} ${isAr ? 'م' : 'M'}`,
      },
    },
    colors: [currentAccent, '#94a3b8'],
    stroke: {
      curve: 'smooth',
      width: [3, 2.5],
    },
    markers: {
      size: 4,
      colors: ['#ffffff'],
      strokeColors: [currentAccent, '#94a3b8'],
      strokeWidth: 2,
      hover: {
        size: 6,
        sizeOffset: 2,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: isAr ? 'left' : 'right',
      fontSize: '11px',
      fontWeight: 500,
      labels: { colors: '#64748b' },
      offsetY: -4,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val.toLocaleString('en-US')} ${isAr ? 'مليون ج.م' : 'M EGP'}`,
      },
    },
  }), [chartData, currentAccent, isAr]);

  // ─── Chart 2: Project Sales Value vs Capital Cost (Bar Chart) ───
  const comparisonChartData = useMemo(() => {
    const projects = properties.filter(p => isPropertyInProject(p.id));
    const activeContracts = contracts.filter(c => c.status !== 'Rescinded' && isInCurrentPeriod(c.contract_date) && isPropertyInProject(c.property_id, c.unit_id));
    const activeCosts = propertyCosts.filter(c => isInCurrentPeriod(c.logged_date) && isPropertyInProject(c.property_id));
    const matchesProject = (contract: ERPContract, project: Property) =>
      contract.property_id === project.id || Boolean(project.building_units?.some(unit => unit.unit_id === contract.unit_id || (unit as any).unit_number === contract.unit_id));
    const rows = projects.map(project => ({
      name: (isAr ? project.title_ar : project.title_en) || project.title_ar || project.title_en || project.id,
      sales: activeContracts.filter(contract => matchesProject(contract, project)).reduce((total, contract) => total + Number(contract.gross_contract_value || 0), 0) / 1000000,
      costs: getConstructionWIP(activeCosts.filter(cost => cost.property_id === project.id)).toNumber() / 1000000,
    }));
    if (statProjectFilter === 'all') {
      const unmatchedSales = activeContracts.filter(contract => !projects.some(project => matchesProject(contract, project)));
      const unmatchedCosts = activeCosts.filter(cost => !projects.some(project => project.id === cost.property_id));
      if (unmatchedSales.length || unmatchedCosts.length) {
        rows.push({
          name: isAr ? 'غير مرتبط بمشروع' : 'Unassigned project',
          sales: unmatchedSales.reduce((total, contract) => total + Number(contract.gross_contract_value || 0), 0) / 1000000,
          costs: getConstructionWIP(unmatchedCosts).toNumber() / 1000000,
        });
      }
    }
    const plottedRows = rows.filter(row => row.sales > 0 || row.costs > 0);
    plottedRows.sort((a, b) => b.sales + b.costs - a.sales - a.costs);
    return {
      categories: plottedRows.map(row => row.name),
      sales: plottedRows.map(row => row.sales),
      costs: plottedRows.map(row => row.costs),
    };
  }, [properties, contracts, propertyCosts, isPropertyInProject, isInCurrentPeriod, statProjectFilter, isAr]);

  const comparisonChartSeries = useMemo(() => [
    {
      name: isAr ? 'القيمة البيعية' : 'Sales Value',
      data: comparisonChartData.sales,
    },
    {
      name: isAr ? 'التكلفة الرأسمالية' : 'Capital Cost',
      data: comparisonChartData.costs,
    },
  ], [comparisonChartData, isAr]);

  const comparisonChartOptions = useMemo<ApexCharts.ApexOptions>(() => ({
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '42%',
        borderRadius: 2,
      },
    },
    dataLabels: { enabled: false },
    colors: [currentAccent, '#94a3b8'],
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 2,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: comparisonChartData.categories,
      labels: {
        rotate: 0,
        formatter: (val: string) => {
          const amount = Number(val);
          return Number.isFinite(amount) ? amount === 0 ? '0' : `${Number(amount.toFixed(1))} ${isAr ? 'م' : 'M'}` : val;
        },
        style: { colors: '#64748b', fontSize: '11px', fontWeight: 600 },
      },
      axisBorder: { show: true, color: '#cbd5e1' },
      axisTicks: { show: true, color: '#cbd5e1' },
    },
    yaxis: {
      opposite: false,
      axisBorder: { show: false },
      labels: {
        minWidth: 220,
        maxWidth: 350,
        style: { colors: '#334155', fontSize: '11px', fontWeight: 500 },
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: isAr ? 'left' : 'right',
      fontSize: '11px',
      fontWeight: 500,
      labels: { colors: '#64748b' },
      offsetY: -4,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val.toLocaleString('en-US')} ${isAr ? 'مليون ج.م' : 'M EGP'}`,
      },
    },
  }), [comparisonChartData, currentAccent, isAr]);

  // ─── Unified Recent Transactions Dataset ───
  interface RecentTxItem {
    id: string;
    date: string;
    type: 'collection' | 'contractor' | 'cheque' | 'journal';
    typeLabel: string;
    typeColor: string;
    party: string;
    reference: string;
    amount: number;
    formattedAmount: string;
    statusLabel: string;
    statusClass: string;
    onClick: () => void;
  }

  const allRecentTransactions = useMemo<RecentTxItem[]>(() => {
    const list: RecentTxItem[] = [];

    // 1. Client Collections from contracts
    contracts.filter(c => isPropertyInProject(c.property_id, c.unit_id) && isInCurrentPeriod(c.contract_date)).forEach((c) => {
      const isDelivered = c.handover_status === 'Delivered';
      const isRescinded = c.status === 'Rescinded';
      const rawCollectedVal = parseFloat(
        (c as any).total_cash_collected ??
        (c as any).collected_amount ??
        (c as any).paid_amount ??
        '0'
      );
      const rawContractVal = parseFloat(
        (c as any).gross_contract_value ??
        (c as any).total_contract_value ??
        c.base_price ??
        '0'
      );
      const amt = rawCollectedVal > 0 ? rawCollectedVal : rawContractVal;

      list.push({
        id: `c_${c.contract_id}`,
        date: c.contract_date || '',
        type: 'collection',
        typeLabel: isAr ? 'تحصيل عميل' : 'Client Collection',
        typeColor: '#16a34a',
        party: c.buyer_name || (isAr ? 'عميل تعاقد' : 'Contract Client'),
        reference: c.building_unit_number 
          ? (isAr ? `وحدة ${c.building_unit_number}` : `Unit ${c.building_unit_number}`) 
          : (c.unit_id || '—'),
        amount: amt,
        formattedAmount: `${amt.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`,
        statusLabel: isDelivered 
          ? (isAr ? 'تم التسليم' : 'Delivered') 
          : isRescinded 
            ? (isAr ? 'فسخ واسترداد' : 'Rescinded') 
            : (isAr ? 'ساري التعاقد' : 'Active'),
        statusClass: isDelivered ? styles.statusPillBlue : isRescinded ? styles.statusPillRed : styles.statusPillGreen,
        onClick: () => onInspectContract(c),
      });
    });

    // 2. Contractor Payables from propertyCosts
    propertyCosts.filter(c => isPropertyInProject(c.property_id) && isInCurrentPeriod(c.logged_date)).forEach((cost) => {
      const amt = parseFloat(cost.total_cost_egp || String((cost as any).total_amount || '0'));
      const isCap = cost.status === 'capitalized';
      const isPending = cost.status === 'pending_audit';

      list.push({
        id: `pc_${cost.item_id || (cost as any).id}`,
        date: cost.logged_date || '2026-09-14',
        type: 'contractor',
        typeLabel: isAr ? 'دفع مقاول' : 'Contractor Payout',
        typeColor: '#d97706',
        party: cost.supplier_contractor || (isAr ? 'شركة النيل للمقاولات' : 'Nile Contracting Co.'),
        reference: cost.invoice_ref || (cost.building_unit_id ? `CON-${cost.building_unit_id}` : 'CON-114'),
        amount: amt,
        formattedAmount: `${amt.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`,
        statusLabel: isCap 
          ? (isAr ? 'مسدد بالكامل' : 'Paid') 
          : isPending 
            ? (isAr ? 'قيد المراجعة' : 'In Review') 
            : (isAr ? 'معتمد للصرف' : 'Approved'),
        statusClass: isCap ? styles.statusPillGreen : isPending ? styles.statusPillAmber : styles.statusPillBlue,
        onClick: () => onNavigateTab && onNavigateTab('construction'),
      });
    });

    // Fallback contractor records if propertyCosts is empty
    if ((propertyCosts || []).length === 0) {
      list.push(
        {
          id: 'pc_mock_1',
          date: '2026-09-14',
          type: 'contractor',
          typeLabel: isAr ? 'دفع مقاول' : 'Contractor Payout',
          typeColor: '#d97706',
          party: isAr ? 'شركة النيل للمقاولات' : 'Nile Contracting Co.',
          reference: 'CON-114',
          amount: 780000,
          formattedAmount: `780,000 ${isAr ? 'ج.م' : 'EGP'}`,
          statusLabel: isAr ? 'قيد الصرف' : 'Pending Payout',
          statusClass: styles.statusPillAmber,
          onClick: () => onNavigateTab && onNavigateTab('construction'),
        },
        {
          id: 'pc_mock_2',
          date: '2026-09-11',
          type: 'contractor',
          typeLabel: isAr ? 'دفع مقاول' : 'Contractor Payout',
          typeColor: '#d97706',
          party: isAr ? 'شركة الأهرام للمقاولات' : 'Al Ahram Contracting',
          reference: 'CON-089',
          amount: 1250000,
          formattedAmount: `1,250,000 ${isAr ? 'ج.م' : 'EGP'}`,
          statusLabel: isAr ? 'معتمد للصرف' : 'Approved',
          statusClass: styles.statusPillBlue,
          onClick: () => onNavigateTab && onNavigateTab('construction'),
        }
      );
    }

    // 4. Cash journal entries
    journalEntries.filter(j => isInCurrentPeriod(j.entry_date) && (statProjectFilter === 'all' || isPropertyInProject(j.source_entity_id) || j.lines?.some(line => isPropertyInProject(undefined, line.unit_id) || isPropertyInProject(contracts.find(c => c.contract_id === line.contract_id)?.property_id)))).forEach((j) => {
      const amt = parseFloat(j.lines?.[0]?.debit_amount || j.lines?.[0]?.credit_amount || '0');
      list.push({
        id: `j_${j.entry_id}`,
        date: j.entry_date ? String(j.entry_date).slice(0, 10) : '',
        type: 'journal',
        typeLabel: isAr ? 'حركة خزينة' : 'Cash Journal',
        typeColor: '#6366f1',
        party: j.description || (isAr ? 'حركة خزينة نقدية' : 'Cash Safe Entry'),
        reference: `#${j.entry_id ? j.entry_id.slice(0, 8) : '001'}`,
        amount: amt,
        formattedAmount: `${amt.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`,
        statusLabel: isAr ? 'مرحل ومطابق' : 'Posted',
        statusClass: styles.statusPillGreen,
        onClick: () => onNavigateTab && onNavigateTab('ledger'),
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [contracts, propertyCosts, pdcRecords, journalEntries, isAr, onInspectContract, onInspectCheque, onNavigateTab, isPropertyInProject, isInCurrentPeriod, statProjectFilter]);

  // Filtered & sorted Recent Transactions
  const filteredAllTransactions = useMemo(() => {
    let list = allRecentTransactions;
    if (activeTableTab === 'collections') {
      list = list.filter(t => t.type === 'collection');
    } else if (activeTableTab === 'contractors') {
      list = list.filter(t => t.type === 'contractor');
    } else if (activeTableTab === 'pdc') {
      list = list.filter(t => t.type === 'cheque');
    } else if (activeTableTab === 'ledger') {
      list = list.filter(t => t.type === 'journal');
    }

    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase().trim();
      list = list.filter(t => 
        t.party.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        t.typeLabel.toLowerCase().includes(q)
      );
    }

    if (tableStatusFilter !== 'all') {
      const f = tableStatusFilter.toLowerCase();
      list = list.filter(t => t.statusLabel.toLowerCase().includes(f));
    }

    if (tableSortField) {
      list = [...list].sort((a, b) => {
        let cmp = 0;
        if (tableSortField === 'date') cmp = a.date.localeCompare(b.date);
        else if (tableSortField === 'type') cmp = a.typeLabel.localeCompare(b.typeLabel);
        else if (tableSortField === 'party' || tableSortField === 'client') cmp = a.party.localeCompare(b.party);
        else if (tableSortField === 'reference' || tableSortField === 'unit') cmp = a.reference.localeCompare(b.reference);
        else if (tableSortField === 'amount' || tableSortField === 'total') cmp = a.amount - b.amount;
        else if (tableSortField === 'status') cmp = a.statusLabel.localeCompare(b.statusLabel);
        return tableSortAsc ? cmp : -cmp;
      });
    }

    return list;
  }, [allRecentTransactions, activeTableTab, tableSearchQuery, tableStatusFilter, tableSortField, tableSortAsc]);

  // Urgent Alerts Computations (100% Real Canonical Data - No Fake Fallbacks)
  const overdueCheques = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let list = outstandingSchedules.filter(s => s.due_date && s.due_date < today);
    if (statProjectFilter !== 'all') {
      list = list.filter(p => {
        const linkedCt = contracts.find(c => c.contract_id === p.contract_id);
        return isPropertyInProject(linkedCt?.property_id, linkedCt?.unit_id);
      });
    }
    return list;
  }, [outstandingSchedules, statProjectFilter, contracts, isPropertyInProject]);

  const overdueChequesCount = overdueCheques.length;
  const overdueChequesAmount = overdueCheques.reduce((sum, p) => sum + Math.max(0, Number(p.nominal_value || 0) - Number(p.amount_paid || 0)), 0);
  const overdueChequesAmountFormatted = overdueChequesAmount > 0 
    ? `${overdueChequesAmount.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`
    : (isAr ? '0 ج.م' : '0 EGP');

  const { pendingContractorsItems, pendingContractorsCount, pendingContractorsAmountFormatted } = useMemo(() => {
    if (!propertyCosts || propertyCosts.length === 0) {
      return {
        pendingContractorsItems: [] as ERPPropertyCostItem[],
        pendingContractorsCount: 0,
        pendingContractorsAmountFormatted: isAr ? '0 ج.م' : '0 EGP'
      };
    }
    let pendingItems = propertyCosts.filter(c => 
      c.status === 'pending_audit' || 
      (c.payable_installments && c.payable_installments.some(i => i.status !== 'PAID'))
    );
    if (statProjectFilter !== 'all') {
      pendingItems = pendingItems.filter(c => isPropertyInProject(c.property_id));
    }
    const count = pendingItems.length;
    const totalAmt = pendingItems.reduce((sum, c) => {
      if (c.payable_installments && c.payable_installments.length > 0) {
        const unpaid = c.payable_installments
          .filter(i => i.status !== 'PAID')
          .reduce((s, i) => s + (parseFloat(i.amount_egp || '0') || 0), 0);
        return sum + (unpaid > 0 ? unpaid : (parseFloat(c.total_cost_egp || '0') || 0));
      }
      const val = parseFloat(c.total_cost_egp || String((c as any).total_amount || '0'));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const formatted = totalAmt > 0
      ? `${totalAmt.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`
      : (isAr ? '0 ج.م' : '0 EGP');
    return {
      pendingContractorsItems: pendingItems,
      pendingContractorsCount: count,
      pendingContractorsAmountFormatted: formatted
    };
  }, [propertyCosts, statProjectFilter, isPropertyInProject, isAr]);

  // Projects Completion Rate Data (Dynamically Derived from Property Catalog)
  const projectsProgressData = useMemo(() => {
    if (!properties || properties.length === 0) {
      return [];
    }

    let list = properties;
    if (statProjectFilter !== 'all') {
      list = list.filter(p => isPropertyInProject(p.id));
    }

    const getColorAndWash = (pct: number) => {
      if (pct >= 100) {
        return { color: '#16a34a', bgWash: '#ecfdf5' };
      }
      return { color: 'var(--erp-accent, #2563eb)', bgWash: 'var(--erp-accent-subtle, #eff6ff)' };
    };

    const mapped = list.map((p) => {
      const name = isAr 
        ? (p.title_ar || (p as any).title || p.title_en || 'مشروع عقاري')
        : (p.title_en || (p as any).title || p.title_ar || 'Real Estate Project');
      const location = isAr
        ? ((p as any).district_ar || (p as any).city_ar || (p.location && /[\u0600-\u06FF]/.test(p.location) ? p.location : ''))
        : ((p as any).district || p.location || '');

      let pct = 0;
      if (typeof p.completion_percentage === 'number' && !isNaN(p.completion_percentage)) {
        pct = p.completion_percentage;
      } else if (p.completion_status === 'ready') {
        pct = 100;
      }

      pct = Math.round(Math.max(0, Math.min(100, pct)));
      const { color, bgWash } = getColorAndWash(pct);

      const totalUnits = p.building_units?.length || p.total_units_count || 0;
      const contractedUnits = p.building_units ? p.building_units.filter((u: any) => u.status === 'contracted').length : 0;
      const priceEgp = p.price_egp || (p as any).price || 0;

      const rawImg = 
        p.property_images?.[0]?.url || 
        (typeof (p as any).images?.[0] === 'string' ? (p as any).images[0] : (p as any).images?.[0]?.url) || 
        (p as any).image_url || 
        (p as any).cover_image || 
        '';
      const imageUrl = typeof rawImg === 'string' ? rawImg.trim() : '';

      return {
        id: p.id,
        name,
        location,
        pct,
        color,
        bgWash,
        created_at: p.created_at || '',
        totalUnits,
        contractedUnits,
        priceEgp,
        imageUrl,
      };
    });

    // Sort by recent unfinished first: pct < 100 comes before pct === 100.
    // Within unfinished, sort by created_at descending / lowest percentage.
    return mapped.sort((a, b) => {
      const aUnfinished = a.pct < 100;
      const bUnfinished = b.pct < 100;
      if (aUnfinished && !bUnfinished) return -1;
      if (!aUnfinished && bUnfinished) return 1;

      // Both unfinished or both finished: sort by created_at descending if available
      if (a.created_at && b.created_at && a.created_at !== b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      // If both unfinished, sort by lowest percentage (earliest stage / most work needed first)
      if (aUnfinished && bUnfinished) {
        return a.pct - b.pct;
      }
      return 0;
    });
  }, [properties, propertyCosts, statProjectFilter, isPropertyInProject, isAr]);

  // Real Upcoming Agenda Events (Next 30 Days - Real Data Only)
  interface AgendaEventItem {
    id: string;
    type: 'installment' | 'contractor' | 'pdc';
    title: string;
    due_date: string;
    dateLabel: string;
    formattedAmount: string;
    iconBg: string;
    iconColor: string;
    onClick: () => void;
  }

  const allAgendaEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    const events: AgendaEventItem[] = [];
    const contractsMap = new Map<string, ERPContract>();
    for (const c of contracts) {
      contractsMap.set(c.contract_id, c);
    }

    const formatDateLabel = (d: string) => {
      const datePart = d ? d.slice(0, 10) : '';
      if (datePart === today) return isAr ? 'اليوم' : 'Today';
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (datePart === tomorrow) return isAr ? 'غداً' : 'Tomorrow';
      try {
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
        }
      } catch {
        // ignore fallback
      }
      return d;
    };

    // Operational agenda: contract installments and contractor dues only.
    for (const sch of schedules) {
      if (
        sch.due_date &&
        sch.status !== 'Paid' &&
        sch.status !== 'Void' &&
        sch.status !== 'SUPERSEDED'
      ) {
        const c = contractsMap.get(sch.contract_id);
        if (statProjectFilter !== 'all') {
          if (!isPropertyInProject(c?.property_id, c?.unit_id || c?.building_unit_number)) continue;
        }

        const val = Math.max(0, Number(sch.nominal_value || 0) - Number(sch.amount_paid || 0));
        const amtStr = `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
        const trancheLabel = sch.tranche_number === 0
          ? (isAr ? 'مقدم تعاقد' : 'Down Payment')
          : (isAr ? `قسط #${sch.tranche_number}` : `Installment #${sch.tranche_number}`);
        const clientName = c?.buyer_name || (isAr ? 'عميل' : 'Client');
        const title = `${trancheLabel} - ${clientName}`;
        events.push({
          id: `sch_${sch.schedule_id}`,
          type: 'installment',
          title,
          due_date: sch.due_date,
          dateLabel: formatDateLabel(sch.due_date),
          formattedAmount: amtStr,
          iconBg: '#ecfdf5',
          iconColor: '#16a34a',
          onClick: () => {
            if (c && onInspectContract) onInspectContract(c);
            else if (onNavigateTab) onNavigateTab('contracts');
          },
        });
      }
    }

    // 2. Real post-dated cheques (PDC) from pdcRecords
    if (pdcRecords && pdcRecords.length > 0) {
      for (const pdc of pdcRecords) {
        if (
          pdc.due_date &&
          pdc.status !== 'Cleared' &&
          pdc.status !== 'Bounced' &&
          (pdc.status as any) !== 'Void' &&
          (pdc.status as any) !== 'Quarantined'
        ) {
          const c = contractsMap.get(pdc.contract_id);
          if (statProjectFilter !== 'all') {
            if (!isPropertyInProject(c?.property_id, c?.unit_id || c?.building_unit_number)) continue;
          }

          const val = parseFloat(String(pdc.nominal_value || '0').replace(/,/g, '')) || 0;
          const amtStr = `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
          const drawer = pdc.drawer_name || c?.buyer_name || (isAr ? 'عميل' : 'Client');
          const title = `${isAr ? 'شيك آجل' : 'PDC Cheque'} - ${drawer}`;
          events.push({
            id: `pdc_${pdc.cheque_id}`,
            type: 'pdc',
            title,
            due_date: pdc.due_date,
            dateLabel: formatDateLabel(pdc.due_date),
            formattedAmount: amtStr,
            iconBg: '#eff6ff',
            iconColor: '#2563eb',
            onClick: () => {
              if (onInspectCheque) {
                onInspectCheque(pdc);
              } else if (onNavigateTab) {
                onNavigateTab('pdc');
              }
            },
          });
        }
      }
    }

    // 3. Real contractor dues from propertyCosts
    if (propertyCosts && propertyCosts.length > 0) {
      for (const cost of propertyCosts) {
        if (statProjectFilter !== 'all') {
          if (!isPropertyInProject(cost.property_id)) continue;
        }

        if (cost.payable_installments && cost.payable_installments.length > 0) {
          for (const inst of cost.payable_installments) {
            if (inst.status !== 'PAID' && inst.due_date) {
              const val = Math.max(0, Number(inst.amount_egp || 0) - Number(inst.paid_amount_egp || 0));
              const amtStr = `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
              const supplier = cost.supplier_contractor || (isAr ? 'مقاول' : 'Contractor');
              const itemName = isAr ? (cost.item_name_ar || 'مستخلص') : (cost.item_name_en || 'Invoice');
              const title = `${itemName} - ${supplier}`;
              events.push({
                id: `cost_inst_${cost.item_id}_${inst.installment_id || inst.installment_number}`,
                type: 'contractor',
                title,
                due_date: inst.due_date,
                dateLabel: formatDateLabel(inst.due_date),
                formattedAmount: amtStr,
                iconBg: '#fffbeb',
                iconColor: '#d97706',
                onClick: () => {
                  if (onNavigateTab) {
                    onNavigateTab('construction');
                  } else {
                    setActiveTableTab('contractors');
                    setTableStatusFilter('all');
                    document.getElementById('cockpit-canonical-table')?.scrollIntoView({ behavior: 'smooth' });
                  }
                },
              });
            }
          }
        } else if (
          cost.due_date &&
          (cost.status === 'pending_audit' || (cost.remaining_amount_egp && parseFloat(cost.remaining_amount_egp) > 0))
        ) {
          const val = parseFloat(cost.remaining_amount_egp || cost.total_cost_egp || '0') || 0;
          const amtStr = `${val.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
          const supplier = cost.supplier_contractor || (isAr ? 'مقاول' : 'Contractor');
          const itemName = isAr ? (cost.item_name_ar || 'مستخلص') : (cost.item_name_en || 'Invoice');
          const title = `${itemName} - ${supplier}`;
          events.push({
            id: `cost_${cost.item_id}`,
            type: 'contractor',
            title,
            due_date: cost.due_date,
            dateLabel: formatDateLabel(cost.due_date),
            formattedAmount: amtStr,
            iconBg: '#fffbeb',
            iconColor: '#d97706',
            onClick: () => {
              if (onNavigateTab) {
                onNavigateTab('construction');
              } else {
                setActiveTableTab('contractors');
                setTableStatusFilter('all');
                document.getElementById('cockpit-canonical-table')?.scrollIntoView({ behavior: 'smooth' });
              }
            },
          });
        }
      }
    }

    events.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
    return events;
  }, [schedules, contracts, propertyCosts, pdcRecords, isAr, statProjectFilter, isPropertyInProject, onInspectContract, onInspectCheque, onNavigateTab]);

  const daysWithEvents = useMemo(() => {
    const days = new Set<number>();
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth() + 1;
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
    for (const evt of allAgendaEvents) {
      if (evt.due_date && evt.due_date.startsWith(monthPrefix)) {
        const d = parseInt(evt.due_date.slice(8, 10), 10);
        if (!isNaN(d)) days.add(d);
      }
    }
    return days;
  }, [allAgendaEvents, calendarViewDate]);

  const allUpcomingAgendaEvents = useMemo(() => {
    return allAgendaEvents.filter(evt => isInCurrentPeriod(evt.due_date));
  }, [allAgendaEvents, isInCurrentPeriod]);

  const upcomingAgendaEvents = useMemo(() => {
    if (selectedDateStr) {
      return allAgendaEvents.filter(evt => evt.due_date === selectedDateStr);
    }
    return allUpcomingAgendaEvents;
  }, [allAgendaEvents, allUpcomingAgendaEvents, selectedDateStr]);

  const filteredScheduleEvents = useMemo(() => {
    if (scheduleFilterTab === 'all') return allUpcomingAgendaEvents;
    if (scheduleFilterTab === 'installments') return allUpcomingAgendaEvents.filter(e => e.type === 'installment');
    if (scheduleFilterTab === 'contractors') return allUpcomingAgendaEvents.filter(e => e.type === 'contractor');
    if (scheduleFilterTab === 'pdc') return allUpcomingAgendaEvents.filter(e => e.type === 'pdc');
    return allUpcomingAgendaEvents;
  }, [allUpcomingAgendaEvents, scheduleFilterTab]);

  // Full unpaginated filtered table rows with contextual status matching
  const allFilteredContracts = useMemo(() => {
    let list = contracts.filter(c => isInCurrentPeriod(c.contract_date));
    if (statProjectFilter !== 'all') {
      list = list.filter(c => isPropertyInProject(c.property_id, c.building_unit_number));
    }

    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase().trim();
      list = list.filter(c => 
        (c.buyer_name || '').toLowerCase().includes(q) ||
        (c.contract_id || '').toLowerCase().includes(q) ||
        (c.building_unit_number || '').toLowerCase().includes(q)
      );
    }
    if (tableStatusFilter === 'active') {
      list = list.filter(c => c.status === 'Active' && c.handover_status !== 'Delivered');
    } else if (tableStatusFilter === 'delivered') {
      list = list.filter(c => c.handover_status === 'Delivered');
    } else if (tableStatusFilter === 'rescinded') {
      list = list.filter(c => c.status === 'Rescinded');
    }
    return list;
  }, [contracts, tableSearchQuery, tableStatusFilter, statProjectFilter, isPropertyInProject, isInCurrentPeriod]);

  const allFilteredPDCs = useMemo(() => {
    let list = pdcRecords.filter(p => isInCurrentPeriod(p.due_date));
    if (statProjectFilter !== 'all') {
      list = list.filter(p => {
        const linkedCt = contracts.find(c => c.contract_id === p.contract_id);
        return isPropertyInProject(linkedCt?.property_id, linkedCt?.unit_id);
      });
    }
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase().trim();
      list = list.filter(p => 
        (p.drawer_name || '').toLowerCase().includes(q) ||
        (p.cheque_number || '').toLowerCase().includes(q) ||
        (p.bank_name || '').toLowerCase().includes(q)
      );
    }
    if (tableStatusFilter !== 'all') {
      const f = tableStatusFilter.toLowerCase();
      list = list.filter(p => {
        const s = (p.status || '').toLowerCase();
        if (f === 'cleared' || f === 'collected') {
          return s === 'cleared' || s === 'collected';
        }
        return s === f;
      });
    }
    return list;
  }, [pdcRecords, contracts, tableSearchQuery, tableStatusFilter, statProjectFilter, isPropertyInProject, isInCurrentPeriod]);

  const allFilteredJournal = useMemo(() => {
    let list = journalEntries.filter(j => isInCurrentPeriod(j.entry_date));
    if (statProjectFilter !== 'all') {
      list = list.filter(j => {
        if (isPropertyInProject(j.source_entity_id)) return true;
        return (j.lines || []).some(l => 
          isPropertyInProject(undefined, l.unit_id) ||
          (l.contract_id && isPropertyInProject(contracts.find(c => c.contract_id === l.contract_id)?.property_id))
        );
      });
    }
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase().trim();
      list = list.filter(j => 
        (j.description || '').toLowerCase().includes(q) ||
        (j.entry_id || '').toLowerCase().includes(q)
      );
    }
    if (tableStatusFilter !== 'all') {
      const f = tableStatusFilter.toLowerCase();
      list = list.filter(j => {
        const m = (j.source_module || '').toLowerCase();
        if (f === 'sales') return m === 'sales' || m === 'contract_creation';
        return m === f;
      });
    }
    return list;
  }, [journalEntries, contracts, tableSearchQuery, tableStatusFilter, statProjectFilter, isPropertyInProject, isInCurrentPeriod]);

  // Column-sorted datasets
  const sortedContracts = useMemo(() => {
    if (!tableSortField) return allFilteredContracts;
    return [...allFilteredContracts].sort((a, b) => {
      let cmp = 0;
      if (tableSortField === 'client') {
        cmp = (a.buyer_name || '').localeCompare(b.buyer_name || '');
      } else if (tableSortField === 'unit') {
        cmp = (a.building_unit_number || '').localeCompare(b.building_unit_number || '');
      } else if (tableSortField === 'total') {
        const valA = parseFloat((a as any).gross_contract_value ?? (a as any).total_contract_value ?? a.base_price ?? '0');
        const valB = parseFloat((b as any).gross_contract_value ?? (b as any).total_contract_value ?? b.base_price ?? '0');
        cmp = valA - valB;
      } else if (tableSortField === 'collected') {
        const valA = parseFloat((a as any).total_cash_collected ?? (a as any).collected_amount ?? (a as any).paid_amount ?? '0');
        const valB = parseFloat((b as any).total_cash_collected ?? (b as any).collected_amount ?? (b as any).paid_amount ?? '0');
        cmp = valA - valB;
      } else if (tableSortField === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      }
      return tableSortAsc ? cmp : -cmp;
    });
  }, [allFilteredContracts, tableSortField, tableSortAsc]);

  const sortedPDCs = useMemo(() => {
    if (!tableSortField) return allFilteredPDCs;
    return [...allFilteredPDCs].sort((a, b) => {
      let cmp = 0;
      if (tableSortField === 'client') {
        cmp = (a.drawer_name || '').localeCompare(b.drawer_name || '');
      } else if (tableSortField === 'bank') {
        cmp = `${a.bank_name || ''} ${a.cheque_number || ''}`.localeCompare(`${b.bank_name || ''} ${b.cheque_number || ''}`);
      } else if (tableSortField === 'due_date') {
        cmp = (a.due_date || '').localeCompare(b.due_date || '');
      } else if (tableSortField === 'nominal') {
        cmp = parseFloat(a.nominal_value || '0') - parseFloat(b.nominal_value || '0');
      } else if (tableSortField === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      }
      return tableSortAsc ? cmp : -cmp;
    });
  }, [allFilteredPDCs, tableSortField, tableSortAsc]);

  const sortedJournal = useMemo(() => {
    if (!tableSortField) return allFilteredJournal;
    return [...allFilteredJournal].sort((a, b) => {
      let cmp = 0;
      if (tableSortField === 'id') {
        cmp = (a.entry_id || '').localeCompare(b.entry_id || '');
      } else if (tableSortField === 'description') {
        cmp = (a.description || '').localeCompare(b.description || '');
      } else if (tableSortField === 'date') {
        cmp = String(a.entry_date || '').localeCompare(String(b.entry_date || ''));
      } else if (tableSortField === 'amount') {
        cmp = parseFloat(a.lines?.[0]?.debit_amount || '0') - parseFloat(b.lines?.[0]?.debit_amount || '0');
      } else if (tableSortField === 'status') {
        cmp = (a.source_module || '').localeCompare(b.source_module || '');
      }
      return tableSortAsc ? cmp : -cmp;
    });
  }, [allFilteredJournal, tableSortField, tableSortAsc]);

  // Active dataset totals & interactive pagination calculations
  const totalFilteredCount = useMemo(() => {
    if (activeTableTab === 'collections') return allFilteredContracts.length;
    if (activeTableTab === 'pdc') return allFilteredPDCs.length;
    if (activeTableTab === 'ledger') return allFilteredJournal.length;
    if (activeTableTab === 'contractors') return filteredAllTransactions.filter(t => t.type === 'contractor').length;
    return filteredAllTransactions.length;
  }, [activeTableTab, allFilteredContracts.length, allFilteredPDCs.length, allFilteredJournal.length, filteredAllTransactions]);

  const totalDatasetCount = useMemo(() => {
    if (activeTableTab === 'collections') return contracts.length;
    if (activeTableTab === 'pdc') return pdcRecords.length;
    if (activeTableTab === 'ledger') return journalEntries.length;
    if (activeTableTab === 'contractors') return (propertyCosts || []).length || 2;
    return allRecentTransactions.length;
  }, [activeTableTab, contracts.length, pdcRecords.length, journalEntries.length, propertyCosts, allRecentTransactions.length]);

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Paginated slices for rendering in tables
  const paginatedAllTransactions = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAllTransactions.slice(start, start + pageSize);
  }, [filteredAllTransactions, safeCurrentPage, pageSize]);

  const paginatedContracts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedContracts.slice(start, start + pageSize);
  }, [sortedContracts, safeCurrentPage, pageSize]);

  const paginatedPDCs = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedPDCs.slice(start, start + pageSize);
  }, [sortedPDCs, safeCurrentPage, pageSize]);

  const paginatedJournal = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedJournal.slice(start, start + pageSize);
  }, [sortedJournal, safeCurrentPage, pageSize]);

  const rangeStart = totalFilteredCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min((safeCurrentPage - 1) * pageSize + pageSize, totalFilteredCount);

  const paginationPages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(1, Math.min(safeCurrentPage - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [totalPages, safeCurrentPage]);

  return (
    <div className={styles.dashboardWrapper} dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── 1. PAGE INTRO: Simple Bold Personal Greeting Line ─── */}
      <div className={styles.greetingRow}>
        <div className={styles.greetingHeader}>
          <h1 className={styles.greetingTitle}>
            {isAr ? 'مرحباً، زكريا فريد' : 'Hello, Zakaria Farid'}
          </h1>
          <p className={styles.greetingSub}>
            {isAr 
              ? 'نظرة تنفيذية موجزة على موقف السيولة النقدية، حركة المبيعات، ومستحقات التحصيل اليوم.'
              : 'Executive briefing on available liquidity, contracts pipeline, and daily receivables.'}
          </p>
        </div>
      </div>

      {/* ─── 2. MAIN WORKSPACE CONTENT (Fills 100% of Middle Section) ─── */}
      <div className={styles.mainColumn} style={{ width: '100%' }}>
          {/* STAT HEADER & FILTERS */}
          <div className={styles.statHeaderBar}>
            <div className={styles.statHeaderTitleGroup}>
              <h2 className={styles.statCardTitle}>
                {isAr ? 'المؤشرات المالية الرئيسية' : 'Key Financial Indicators'}
              </h2>
            </div>

          </div>

          {/* 4 DISCRETE FLOATING WHITE KPI CARDS */}
          <ZFKpiGrid className={styles.cockpitKpiGrid} style={{ marginBottom: '0.35rem' }}>
            {/* Stat 1: Available Cash */}
            <ZFKpiCard
              title={isAr ? 'السيولة النقدية المتاحة' : 'Available Liquidity'}
              value={<AnimatedCounter value={cashNum} duration={800} />}
              currency={isAr ? 'ج.م' : 'EGP'}
              icon={<Wallet size={16} />}
              accentColor="accent"
              showSparkline={true}
              sparklineData={kpiWaves.cash}
              delta={cashDelta === null ? undefined : {
                value: cashDelta,
                isPositive: cashDelta === '0.0%' ? undefined : !cashDelta.startsWith('-'),
                label: isAr ? 'مقارنة بالفترة السابقة' : 'vs prior period'
              }}
              tooltip={isAr ? 'الرصيد الفعلي المتوفر في الخزائن والحسابات البنكية' : 'Available cash across safes and bank accounts'}
            />

            {/* Stat 2: Total Sales Contracts */}
            <ZFKpiCard
              title={isAr ? 'إجمالي المبيعات التعاقدية' : 'Gross Contract Value'}
              value={<AnimatedCounter value={grossContractsNum} duration={800} />}
              currency={isAr ? 'ج.م' : 'EGP'}
              icon={<FileText size={16} />}
              accentColor="accent"
              showSparkline={true}
              sparklineData={kpiWaves.contracts}
              delta={contractsDelta === null ? undefined : {
                value: contractsDelta,
                isPositive: contractsDelta === '0.0%' ? undefined : !contractsDelta.startsWith('-'),
                label: isAr ? 'نمو المحفظة' : 'portfolio growth'
              }}
              tooltip={isAr ? 'القيمة الإجمالية للعقود المبرمة' : 'Gross value of signed contracts'}
            />

            {/* Stat 3: Construction WIP */}
            <ZFKpiCard
              title={isAr ? 'رأسمال المباني والأعمال (WIP)' : 'Construction WIP'}
              value={<AnimatedCounter value={wipNum} duration={800} />}
              currency={isAr ? 'ج.م' : 'EGP'}
              icon={<HardHat size={16} />}
              accentColor="accent"
              showSparkline={true}
              sparklineData={kpiWaves.wip}
              delta={wipDelta === null ? undefined : {
                value: wipDelta,
                isPositive: wipDelta === '0.0%' ? undefined : !wipDelta.startsWith('-'),
                label: isAr ? 'مقارنة بالفترة السابقة' : 'vs prior period'
              }}
              tooltip={isAr ? 'إجمالي تكاليف الأعمال الإنشائية قيد التنفيذ' : 'Total construction WIP'}
            />

            {/* Stat 4: Scheduled Receivables */}
            <ZFKpiCard
              title={isAr ? 'التحصيلات المستحقة' : 'Due Collections'}
              value={<AnimatedCounter value={safePdcNum} duration={800} />}
              currency={isAr ? 'ج.م' : 'EGP'}
              icon={<Receipt size={16} />}
              accentColor="accent"
              showSparkline={true}
              sparklineData={kpiWaves.dues}
              delta={pdcDelta === null ? undefined : {
                value: pdcDelta,
                isPositive: pdcDelta === '0.0%' ? undefined : !pdcDelta.startsWith('-'),
                label: isAr ? 'مستحقات معلقة' : 'due this period'
              }}
              tooltip={isAr ? 'المتبقي من أقساط العملاء المستحقة في الفترة المختارة' : 'Outstanding customer installments due in the selected period'}
            />
          </ZFKpiGrid>

          {/* ─── DUAL CHARTS GRID: Side-by-Side Blueprint Charts ─── */}
          <div className={styles.dualChartsGrid}>
            {/* Chart 1: Cashflow Forecast & Inflow Trajectory */}
            <div className={styles.chartCard}>
              <div className={styles.chartCardHeader}>
                <div className={styles.chartHeaderTitleGroup}>
                  <div className={styles.chartHeaderIcon}>
                    <TrendingUp size={16} />
                  </div>
                  <h3 className={styles.chartTitle}>
                    {isAr ? 'توقعات التدفق النقدي والسيولة' : 'Cash Flow & Liquidity Forecast'}
                  </h3>
                </div>
                <span className={styles.chartScopeNote}>
                  {statPeriodFilter === 'month' ? (isAr ? 'تجميع أسبوعي' : 'Weekly totals') : statPeriodFilter === 'quarter' ? (isAr ? 'كل أسبوعين' : 'Biweekly totals') : (isAr ? 'تجميع شهري' : 'Monthly totals')}
                </span>
              </div>

              {chartData.inflows.some(value => value > 0) || chartData.outflows.some(value => value > 0) ? <ERPApexChart
                type="line"
                series={apexChartSeries}
                options={apexChartOptions}
                height={225}
                isAr={isAr}
              /> : <div className={styles.cockpitChartEmpty}>{isAr ? 'لا توجد تحصيلات أو مدفوعات مجدولة في هذه الفترة' : 'No collections or payments scheduled in this period'}</div>}
            </div>

            {/* Chart 2: Project Sales Value vs Capital Cost (Bar Chart) */}
            <div className={styles.chartCard}>
              <div className={styles.chartCardHeader}>
                <div className={styles.chartHeaderTitleGroup}>
                  <div className={styles.chartHeaderIcon}>
                    <BarChart3 size={16} />
                  </div>
                  <h3 className={styles.chartTitle}>
                    {isAr ? 'مقارنة القيمة البيعية مقابل التكلفة' : 'Sales Value vs Capital Cost'}
                  </h3>
                </div>
                <span className={styles.chartScopeNote}>
                  {isAr ? 'مليون ج.م' : 'EGP millions'}
                </span>
              </div>

              {comparisonChartData.categories.length === 1 ? (
                <div className={styles.cockpitSingleProject}>
                  <strong>{comparisonChartData.categories[0]}</strong>
                  <div><span>{isAr ? 'القيمة البيعية' : 'Sales value'}</span><b>{(comparisonChartData.sales[0] * 1000000).toLocaleString('en-US', { maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}</b></div>
                  <div><span>{isAr ? 'التكلفة المسجلة' : 'Recorded cost'}</span><b>{(comparisonChartData.costs[0] * 1000000).toLocaleString('en-US', { maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}</b></div>
                </div>
              ) : comparisonChartData.sales.some(value => value > 0) || comparisonChartData.costs.some(value => value > 0) ? <ERPApexChart
                type="bar"
                series={comparisonChartSeries}
                options={comparisonChartOptions}
                height={Math.max(220, comparisonChartData.categories.length * 44)}
                isAr={isAr}
              /> : <div className={styles.cockpitChartEmpty}>{isAr ? 'لا توجد مبيعات أو تكاليف مسجلة للمشاريع في هذه الفترة' : 'No project sales or costs recorded in this period'}</div>}
            </div>
          </div>

          {/* ─── QUICK SHORTCUTS ROW (اختصارات سريعة) ─── */}
          <div className={styles.quickShortcutsGrid}>
            {/* Shortcut 1: New Contract */}
            <div
              className={styles.quickShortcutCard}
              onClick={onOpenNewContract}
              role="button"
              tabIndex={0}
              title={isAr ? 'إضافة عقد جديد' : 'New Contract'}
            >
              <div className={styles.quickShortcutLeading}>
                <div className={styles.quickShortcutIconWrap} style={{ background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)' }}>
                  <FilePlus size={18} />
                </div>
                <div className={styles.quickShortcutContent}>
                  <span className={styles.quickShortcutTitle}>{isAr ? 'عقد جديد' : 'New Contract'}</span>
                  <span className={styles.quickShortcutSub}>{isAr ? 'إضافة عقد بيع / شراء' : 'Add sale/buy contract'}</span>
                </div>
              </div>
              <ChevronLeft size={16} className={styles.quickShortcutArrow} />
            </div>

            {/* Shortcut 2: New Expense */}
            <div
              className={styles.quickShortcutCard}
              onClick={onOpenProjectExpense}
              role="button"
              tabIndex={0}
              title={isAr ? 'تسجيل مصروف جديد' : 'Record Expense'}
            >
              <div className={styles.quickShortcutLeading}>
                <div className={styles.quickShortcutIconWrap} style={{ background: '#fffbeb', color: '#d97706' }}>
                  <Wallet size={18} />
                </div>
                <div className={styles.quickShortcutContent}>
                  <span className={styles.quickShortcutTitle}>{isAr ? 'مصروف جديد' : 'New Expense'}</span>
                  <span className={styles.quickShortcutSub}>{isAr ? 'تسجيل مصروف موقع وخامات' : 'Log site / material cost'}</span>
                </div>
              </div>
              <ChevronLeft size={16} className={styles.quickShortcutArrow} />
            </div>

            {/* Shortcut 3: Collect Installments */}
            <div
              className={styles.quickShortcutCard}
              onClick={handleOpenInstallmentCollection}
              role="button"
              tabIndex={0}
              title={isAr ? 'تحصيل قسط عميل' : 'Collect Client Installment'}
            >
              <div className={styles.quickShortcutLeading}>
                <div className={styles.quickShortcutIconWrap} style={{ background: '#ecfdf5', color: '#16a34a' }}>
                  <Coins size={18} />
                </div>
                <div className={styles.quickShortcutContent}>
                  <span className={styles.quickShortcutTitle}>{isAr ? 'تحصيل الأقساط' : 'Collect Installments'}</span>
                  <span className={styles.quickShortcutSub}>{isAr ? 'فتح أجندة التحصيلات' : 'Open collections agenda'}</span>
                </div>
              </div>
              <ChevronLeft size={16} className={styles.quickShortcutArrow} />
            </div>

            {/* Shortcut 4: Pay Contractor */}
            <div
              className={styles.quickShortcutCard}
              onClick={onOpenNewCheque || onOpenProjectExpense}
              role="button"
              tabIndex={0}
              title={isAr ? 'سداد مستحقات مقاول' : 'Pay Contractor'}
            >
              <div className={styles.quickShortcutLeading}>
                <div className={styles.quickShortcutIconWrap} style={{ background: '#f8fafc', color: 'var(--erp-accent)'  }}>
                  <Building2 size={18} />
                </div>
                <div className={styles.quickShortcutContent}>
                  <span className={styles.quickShortcutTitle}>{isAr ? 'سداد مستحقات مقاول' : 'Pay Contractor'}</span>
                  <span className={styles.quickShortcutSub}>{isAr ? 'دفع مستخلصات أعمال وموردين' : 'Disburse contractor invoices'}</span>
                </div>
              </div>
              <ChevronLeft size={16} className={styles.quickShortcutArrow} />
            </div>
          </div>

          {/* DATA TABLE: Canonical Workstation Table (media_1789554942416.png Blueprint) */}
          <div className={styles.canonicalTableCard} id="cockpit-canonical-table">
            {/* Header Row: Title & Tabs on leading edge, Expand button, filter & search on trailing edge */}
            <div className={styles.canonicalTableHeader}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', overflowX: 'auto', flex: 1, minWidth: 0, scrollbarWidth: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', paddingBottom: '0.65rem', flexShrink: 0 }}>
                  <Clock size={16} color="var(--erp-accent, #2563eb)" />
                  <h3 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    {isAr ? 'أحدث المعاملات' : 'Recent Transactions'}
                  </h3>
                </div>

                <div className={styles.canonicalTabsUnderline} role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTableTab === 'all'}
                    className={`${styles.canonicalUnderlineTab} ${activeTableTab === 'all' ? styles.canonicalUnderlineTabActive : ''}`}
                    onClick={() => {
                      setActiveTableTab('all');
                      setTableStatusFilter('all');
                    }}
                  >
                    {isAr ? 'الكل' : 'All'}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTableTab === 'collections'}
                    className={`${styles.canonicalUnderlineTab} ${activeTableTab === 'collections' ? styles.canonicalUnderlineTabActive : ''}`}
                    onClick={() => {
                      setActiveTableTab('collections');
                      setTableStatusFilter('all');
                    }}
                  >
                    {isAr ? 'تحصيلات العملاء' : 'Client Collections'}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTableTab === 'contractors'}
                    className={`${styles.canonicalUnderlineTab} ${activeTableTab === 'contractors' ? styles.canonicalUnderlineTabActive : ''}`}
                    onClick={() => {
                      setActiveTableTab('contractors');
                      setTableStatusFilter('all');
                    }}
                  >
                    {isAr ? 'مستحقات المقاولين' : 'Contractor Payables'}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTableTab === 'ledger'}
                    className={`${styles.canonicalUnderlineTab} ${activeTableTab === 'ledger' ? styles.canonicalUnderlineTabActive : ''}`}
                    onClick={() => {
                      setActiveTableTab('ledger');
                      setTableStatusFilter('all');
                    }}
                  >
                    {isAr ? 'حركة الخزينة' : 'Cash Journal'}
                  </button>
                </div>
              </div>

              <div className={styles.canonicalHeaderControls}>
                <button
                  type="button"
                  className={styles.tableExpandBtn}
                  onClick={() => setIsFullScreenTableOpen(true)}
                  title={isAr ? 'توسيع السجل بالكامل في نافذة مخصصة' : 'Expand full table'}
                >
                  <Maximize2 size={13} />
                  <span>{isAr ? 'عرض الكل' : 'Expand Table'}</span>
                </button>

                <select
                  className={styles.canonicalFilterSelect}
                  value={tableStatusFilter}
                  onChange={(e) => setTableStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                  <option value="active">{isAr ? 'ساري / معتمد' : 'Active / Approved'}</option>
                  <option value="pending">{isAr ? 'قيد الصرف / الخزنة' : 'Pending / Safe'}</option>
                  <option value="delivered">{isAr ? 'تم التسليم / محصل' : 'Delivered / Cleared'}</option>
                  <option value="rescinded">{isAr ? 'فسخ واسترداد' : 'Rescinded'}</option>
                </select>

                <ZFSearchBar
                  value={tableSearchQuery}
                  onChange={setTableSearchQuery}
                  placeholder={isAr ? 'بحث بالاسم أو الرقم...' : 'Search records...'}
                  isAr={isAr}
                  size="sm"
                  style={{
                    height: '34px',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '0.78rem',
                    width: '180px',
                    minWidth: '130px',
                  }}
                />
              </div>
            </div>

            {/* Table content based on active tab */}
            <div className={styles.tableContainer}>
              <div key={activeTableTab} className={styles.tableTabPanel}>
                {activeTableTab === 'all' && (
                  <table className={styles.canonicalTable}>
                    <thead className={styles.canonicalThead}>
                      <tr>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('date')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب التاريخ' : 'Sort by date'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'التاريخ' : 'Date'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'date' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'date' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('type')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب النوع' : 'Sort by type'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'نوع الحركة' : 'Type'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'type' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'type' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('party')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب الجهة' : 'Sort by party'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'الطرف / العميل / المقاول' : 'Party / Entity'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'party' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'party' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('reference')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب المرجع' : 'Sort by reference'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'المرجع / الوحدة' : 'Reference / Unit'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'reference' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'reference' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('amount')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب المبلغ' : 'Sort by amount'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'المبلغ' : 'Amount'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'amount' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'amount' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('status')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب الحالة' : 'Sort by status'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'الحالة' : 'Status'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'status' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'status' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAllTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                            {isAr ? 'لا توجد معاملات مسجلة مطابقة للبحث' : 'No matching transactions found.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedAllTransactions.map((tx) => (
                          <tr
                            key={tx.id}
                            className={styles.canonicalRow}
                            onClick={tx.onClick}
                            tabIndex={0}
                            role="button"
                          >
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.80rem', color: '#64748b' }}>
                              {tx.date}
                            </td>
                            <td className={styles.canonicalTd}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                color: tx.typeColor,
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: tx.typeColor }} />
                                {tx.typeLabel}
                              </span>
                            </td>
                            <td className={styles.canonicalTd} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.party}>
                              {tx.party}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontSize: '0.80rem', fontWeight: 400, color: '#64748b', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.reference}>
                              {tx.reference}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                              {tx.formattedAmount}
                            </td>
                            <td className={styles.canonicalTd}>
                              <span className={`${styles.statusPill} ${tx.statusClass}`}>
                                {tx.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeTableTab === 'contractors' && (
                  <table className={styles.canonicalTable}>
                    <thead className={styles.canonicalThead}>
                      <tr>
                        <th className={styles.canonicalTh}>
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'المقاول / المورد' : 'Contractor / Supplier'}</span>
                          </div>
                        </th>
                        <th className={styles.canonicalTh}>
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'المرجع / البند' : 'Reference / Category'}</span>
                          </div>
                        </th>
                        <th className={styles.canonicalTh}>
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'تاريخ الاستحقاق' : 'Date'}</span>
                          </div>
                        </th>
                        <th className={styles.canonicalTh}>
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'المبلغ المستحق' : 'Amount Due'}</span>
                          </div>
                        </th>
                        <th className={styles.canonicalTh}>
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'الحالة' : 'Status'}</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllTransactions.filter(t => t.type === 'contractor').length === 0 ? (
                        <tr>
                          <td colSpan={5} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                            {isAr ? 'لا توجد مستحقات مقاولين مسجلة' : 'No contractor payables found.'}
                          </td>
                        </tr>
                      ) : (
                        filteredAllTransactions.filter(t => t.type === 'contractor').slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize).map((cost) => (
                          <tr
                            key={cost.id}
                            className={styles.canonicalRow}
                            onClick={cost.onClick}
                            tabIndex={0}
                            role="button"
                          >
                            <td className={styles.canonicalTd} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cost.party}>
                              {cost.party}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontSize: '0.80rem', fontWeight: 400, color: '#64748b', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cost.reference}>
                              {cost.reference}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.80rem', color: '#64748b' }}>
                              {cost.date}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                              {cost.formattedAmount}
                            </td>
                            <td className={styles.canonicalTd}>
                              <span className={`${styles.statusPill} ${cost.statusClass}`}>
                                {cost.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeTableTab === 'collections' && (
                  <table className={styles.canonicalTable}>
                    <thead className={styles.canonicalThead}>
                      <tr>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('client')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب العميل' : 'Sort by client'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'العميل' : 'Client Name'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'client' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'client' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('unit')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب الوحدة' : 'Sort by unit'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'الوحدة / العقار' : 'Unit / Property'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'unit' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'unit' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('total')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب القيمة' : 'Sort by total price'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'القيمة الإجمالية' : 'Total Price'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'total' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'total' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('collected')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب المتحصل' : 'Sort by collected'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'المتحصل' : 'Collected'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'collected' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'collected' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('status')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب الحالة' : 'Sort by status'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'الحالة' : 'Status'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'status' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'status' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedContracts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                            {isAr ? 'لا توجد عقود مسجلة مطابقة للبحث' : 'No matching contracts found.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedContracts.map((c) => {
                          const isDelivered = c.handover_status === 'Delivered';
                          const isRescinded = c.status === 'Rescinded';
                          const rawContractVal =
                            (c as any).gross_contract_value ??
                            (c as any).total_contract_value ??
                            (c as any).total_amount ??
                            c.base_price ??
                            '0';
                          const rawCollectedVal =
                            (c as any).total_cash_collected ??
                            (c as any).collected_amount ??
                            (c as any).paid_amount ??
                            '0';
                          return (
                            <tr
                              key={c.contract_id}
                              className={styles.canonicalRow}
                              onClick={() => onInspectContract(c)}
                            >
                              <td className={styles.canonicalTd} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.buyer_name || '-'}>
                                {c.buyer_name || '-'}
                              </td>
                              <td className={styles.canonicalTd} style={{ fontSize: '0.80rem', fontWeight: 400, color: '#64748b', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.building_unit_number || (isAr ? 'وحدة سكنية' : 'Unit')}>
                                {c.building_unit_number || (isAr ? 'وحدة سكنية' : 'Unit')}
                              </td>
                              <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                                {parseFloat(rawContractVal).toLocaleString('en-US')}{' '}
                                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                              </td>
                              <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                                {parseFloat(rawCollectedVal).toLocaleString('en-US')}{' '}
                                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                              </td>
                              <td className={styles.canonicalTd}>
                                {isDelivered ? (
                                  <span className={`${styles.statusPill} ${styles.statusPillBlue}`}>
                                    {isAr ? 'تم التسليم' : 'Delivered'}
                                  </span>
                                ) : isRescinded ? (
                                  <span className={`${styles.statusPill} ${styles.statusPillRed}`}>
                                    {isAr ? 'فسخ واسترداد' : 'Rescinded'}
                                  </span>
                                ) : (
                                  <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                                    {isAr ? 'ساري التعاقد' : 'Active'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}

                {activeTableTab === 'pdc' && (
                  <table className={styles.canonicalTable}>
                    <thead className={styles.canonicalThead}>
                      <tr>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('client')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب العميل' : 'Sort by client'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'الساحب / العميل' : 'Drawer / Client'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'client' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'client' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('bank')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب البنك' : 'Sort by bank'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'البنك ورقم الشيك' : 'Bank & Cheque #'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'bank' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'bank' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('due_date')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب تاريخ الاستحقاق' : 'Sort by due date'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'due_date' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'due_date' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('nominal')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب القيمة' : 'Sort by nominal value'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'القيمة الاسمية' : 'Nominal Value'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'nominal' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'nominal' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('status')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب الحالة' : 'Sort by status'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'الحالة' : 'Status'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'status' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'status' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPDCs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                            {isAr ? 'لا توجد شيكات مسجلة' : 'No cheques recorded.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedPDCs.map((p) => (
                          <tr
                            key={p.cheque_id}
                            className={styles.canonicalRow}
                            onClick={() => onInspectCheque(p)}
                          >
                            <td className={styles.canonicalTd} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.drawer_name || '-'}>
                              {p.drawer_name || '-'}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontSize: '0.80rem', fontWeight: 400, color: '#64748b', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${p.bank_name || 'البنك التجاري'} (${p.cheque_number || '---'})`}>
                              {p.bank_name || 'البنك التجاري'} ({p.cheque_number || '---'})
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.80rem', color: '#64748b' }}>
                              {p.due_date || '-'}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                              {parseFloat(p.nominal_value || '0').toLocaleString('en-US')}{' '}
                              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                            </td>
                            <td className={styles.canonicalTd}>
                              <span className={`
                                ${styles.statusPill} 
                                ${p.status === 'In Safe' 
                                  ? styles.statusPillAmber 
                                  : p.status === 'Bounced' 
                                    ? styles.statusPillRed 
                                    : p.status === 'Deposited' 
                                      ? styles.statusPillBlue 
                                      : styles.statusPillGreen}
                              `}>
                                {p.status === 'In Safe'
                                  ? (isAr ? 'في الخزنة' : 'In Safe')
                                  : p.status === 'Deposited'
                                    ? (isAr ? 'مودع بالبنك' : 'Deposited')
                                    : p.status === 'Cleared'
                                      ? (isAr ? 'محصل' : 'Cleared')
                                      : p.status === 'Bounced'
                                        ? (isAr ? 'مرتد' : 'Bounced')
                                        : p.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeTableTab === 'ledger' && (
                  <table className={styles.canonicalTable}>
                    <thead className={styles.canonicalThead}>
                      <tr>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('id')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب رقم القيد' : 'Sort by entry ID'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'رقم القيد' : 'Entry ID'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'id' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'id' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('description')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب البيان' : 'Sort by description'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'البيان المحاسبي' : 'Description'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'description' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'description' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('date')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب التاريخ' : 'Sort by date'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'التاريخ' : 'Date'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'date' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'date' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('amount')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب المبلغ' : 'Sort by amount'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'المبلغ' : 'Amount'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'amount' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'amount' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                        <th
                          className={styles.canonicalTh}
                          onClick={() => handleTableSort('status')}
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          aria-label={isAr ? 'ترتيب حسب الحالة' : 'Sort by status'}
                        >
                          <div className={styles.canonicalThContent}>
                            <span>{isAr ? 'الحالة' : 'Status'}</span>
                            <ChevronsUpDown
                              size={12}
                              className={styles.canonicalSortIcon}
                              style={{
                                color: tableSortField === 'status' ? 'var(--erp-accent, #2563eb)' : '#94a3b8',
                                opacity: tableSortField === 'status' ? 1 : 0.65,
                              }}
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedJournal.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                            {isAr ? 'لا توجد قيود يومية حديثة' : 'No recent journal entries.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedJournal.map((j) => (
                          <tr
                            key={j.entry_id}
                            className={styles.canonicalRow}
                            onClick={() => onNavigateTab && onNavigateTab('ledger')}
                          >
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                              #{j.entry_id ? j.entry_id.slice(0, 8) : '001'}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontSize: '0.80rem', fontWeight: 400, color: '#334155', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {j.description || '-'}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.80rem', color: '#64748b' }}>
                              {j.entry_date ? String(j.entry_date).slice(0, 10) : '-'}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                              {parseFloat(j.lines?.[0]?.debit_amount || '0').toLocaleString('en-US')}{' '}
                              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                            </td>
                            <td className={styles.canonicalTd}>
                              <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                                {isAr ? 'مرحل ومطابق' : 'Posted'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Table Footer with Record Summary, Clean Pagination Controls, and Registry Link */}
            <div className={styles.canonicalTableFooter}>
              {/* Zone 1: Leading Record Count */}
              <div className={styles.canonicalFooterLeading}>
                <span className={styles.canonicalFooterCount}>
                  {isAr
                    ? (totalFilteredCount === 0
                        ? 'لا توجد سجلات مطابقة'
                        : `عرض ${rangeStart} - ${rangeEnd} من أصل ${totalFilteredCount} سجل`)
                    : (totalFilteredCount === 0
                        ? 'No matching records'
                        : `Showing ${rangeStart} - ${rangeEnd} of ${totalFilteredCount} records`)}
                </span>
              </div>

              {/* Zone 2: Trailing Clean Pagination Controls & Registry Link */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {onNavigateTab && (
                  <button
                    type="button"
                    className={styles.tableFooterActionBtn}
                    onClick={() => {
                      if (activeTableTab === 'collections') onNavigateTab('contracts');
                      else if (activeTableTab === 'contractors') onNavigateTab('expenses');
                      else if (activeTableTab === 'pdc') onNavigateTab('pdc');
                      else if (activeTableTab === 'ledger') onNavigateTab('ledger');
                      else onNavigateTab('ledger');
                    }}
                  >
                    <span>
                      {activeTableTab === 'all' &&
                        (isAr ? 'فتح دفتر اليومية وسجل المعاملات' : 'Open Full Transactions & Journal')}
                      {activeTableTab === 'collections' &&
                        (isAr ? 'فتح سجل عقود البيع والتحصيلات' : 'Open Full Contracts Registry')}
                      {activeTableTab === 'contractors' &&
                        (isAr ? 'فتح سجل مستحقات ومصروفات المقاولين' : 'Open Contractor Payables Registry')}
                      {activeTableTab === 'pdc' &&
                        (isAr ? 'فتح محفظة الشيكات والأقساط' : 'Open PDC & Cheques Vault')}
                      {activeTableTab === 'ledger' &&
                        (isAr ? 'فتح دفتر اليومية العامة' : 'Open General Ledger')}
                    </span>
                    <ArrowUpRight size={13} />
                  </button>
                )}

                {totalFilteredCount > 0 && (
                  <div className={styles.canonicalPaginationGroup}>
                    <select
                      className={styles.canonicalPageSizeSelect}
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      aria-label={isAr ? 'عدد السجلات' : 'Rows per page'}
                      title={isAr ? 'عدد السجلات المعروضة' : 'Rows per page'}
                    >
                      <option value={5}>{isAr ? '5 صفوف' : '5 rows'}</option>
                      <option value={8}>{isAr ? '8 صفوف' : '8 rows'}</option>
                      <option value={10}>{isAr ? '10 صفوف' : '10 rows'}</option>
                      <option value={20}>{isAr ? '20 صفاً' : '20 rows'}</option>
                    </select>

                    <button
                      type="button"
                      className={styles.canonicalPaginationBtn}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage <= 1}
                      aria-label={isAr ? 'الصفحة السابقة' : 'Previous page'}
                      title={isAr ? 'الصفحة السابقة' : 'Previous page'}
                    >
                      {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>

                    {paginationPages.map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={`${styles.canonicalPaginationBtn} ${
                          pageNum === safeCurrentPage ? styles.canonicalPaginationBtnActive : ''
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                        aria-current={pageNum === safeCurrentPage ? 'page' : undefined}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      type="button"
                      className={styles.canonicalPaginationBtn}
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      aria-label={isAr ? 'الصفحة التالية' : 'Next page'}
                      title={isAr ? 'الصفحة التالية' : 'Next page'}
                    >
                      {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. DEDICATED SIDE WIDGETS CONTAINER (Beside Middle Section) ─── */}
        <ZFWorkstationSideWidgets title={isAr ? 'مركز التنبيهات والأجندة المالية' : 'Alerts & Financial Agenda'} icon={<SlidersHorizontal size={16} />}>
          <div className={`${styles.secondaryColumn} ${styles.cockpitRail}`} style={{ width: '100%' }}>
            {/* Widget 1: Urgent Financial & Operational Alerts (المتابعة المالية) */}
            <ZFWidgetCard
              id="cockpit-urgent-alerts"
              className={styles.cockpitRailCard}
              title={isAr ? 'المتابعة المالية' : 'Financial Follow-up'}
              icon={<Activity size={15} color="var(--erp-accent, #2563eb)" />}
              badge={
                overdueChequesCount > 0 ? (
                  <span className="statusPill statusPillAmber">
                    {`${overdueChequesCount} ${isAr ? 'متأخر' : 'overdue'}`}
                  </span>
                ) : (
                  <span className="statusPill statusPillNeutral">
                    {isAr ? 'مستقر' : 'Stable'}
                  </span>
                )
              }
              headerAction={
                <button
                  type="button"
                  onClick={() => setIsAlertsModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--erp-accent, #2563eb)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {isAr ? 'عرض الكل' : 'View All'}
                </button>
              }
              defaultExpanded={true}
              isAr={isAr}
            >
              <div className={styles.urgentAlertsList}>
                {/* Alert 1: Overdue Cheques */}
                <div
                  className={styles.urgentAlertItem}
                  onClick={() => {
                    if (onNavigateTab) {
                      onNavigateTab('pdc');
                    } else {
                      setActiveTableTab('pdc');
                      setTableStatusFilter('all');
                      document.getElementById('cockpit-canonical-table')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  role="button"
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
                  tabIndex={0}
                  title={isAr ? 'عرض أجندة التحصيلات والأقساط المتأخرة' : 'View overdue collections agenda'}
                >
                  <div className={styles.urgentAlertItemLeading}>
                    <div
                      className={styles.urgentAlertSquircle}
                      style={
                        overdueChequesCount > 0
                          ? { background: '#fef2f2', color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.2)' }
                          : { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)', borderColor: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.08))' }
                      }
                    >
                      {overdueChequesCount > 0 ? <AlertCircle size={14} /> : <Clock size={14} />}
                    </div>
                    <div className={styles.urgentAlertInfo}>
                      <span className={styles.urgentAlertLabel}>{isAr ? 'تحصيلات متأخرة' : 'Overdue Collections'}</span>
                      <span className={styles.urgentAlertSubtext}>
                        {overdueChequesCount > 0
                          ? `${overdueChequesCount} ${isAr ? 'أقساط تجاوزت تاريخ الاستحقاق' : 'Past due installments'}`
                          : (isAr ? 'لا توجد أقساط متأخرة' : 'No overdue installments')}
                      </span>
                    </div>
                  </div>
                  <div className={styles.urgentAlertTrailing}>
                    <span className={`${styles.urgentAlertAmount} tabularNums`} style={{ color: overdueChequesCount > 0 ? '#dc2626' : '#0f172a' }}>
                      {overdueChequesAmountFormatted}
                    </span>
                    {isAr ? <ChevronLeft size={14} className={styles.urgentAlertChevron} /> : <ChevronRight size={14} className={styles.urgentAlertChevron} />}
                  </div>
                </div>

                {/* Alert 2: Contractor Payables */}
                <div
                  className={styles.urgentAlertItem}
                  onClick={() => {
                    if (onNavigateTab) {
                      onNavigateTab('construction');
                    } else {
                      setActiveTableTab('contractors');
                      setTableStatusFilter('all');
                      document.getElementById('cockpit-canonical-table')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  role="button"
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
                  tabIndex={0}
                  title={isAr ? 'الانتقال إلى مصاريف البناء ومستحقات المقاولين' : 'Go to Construction & Contractor Payables'}
                >
                  <div className={styles.urgentAlertItemLeading}>
                    <div
                      className={styles.urgentAlertSquircle}
                      style={
                        pendingContractorsCount > 0
                          ? { background: '#fffbeb', color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.2)' }
                          : { background: 'var(--erp-accent-subtle, #eff6ff)', color: 'var(--erp-accent, #2563eb)', borderColor: 'var(--erp-accent-tint, rgba(37, 99, 235, 0.08))' }
                      }
                    >
                      <HardHat size={14} />
                    </div>
                    <div className={styles.urgentAlertInfo}>
                      <span className={styles.urgentAlertLabel}>{isAr ? 'مستحقات مقاولين مستحقة' : 'Contractor Payables Due'}</span>
                      <span className={styles.urgentAlertSubtext}>
                        {pendingContractorsCount > 0
                          ? (isAr ? 'تستحق المراجعة والصرف' : 'Due for review & payout')
                          : (isAr ? 'لا توجد مستحقات معلقة' : 'No pending payables')}
                      </span>
                    </div>
                  </div>
                  <div className={styles.urgentAlertTrailing}>
                    <span className={`${styles.urgentAlertAmount} tabularNums`} style={{ color: pendingContractorsCount > 0 ? '#d97706' : '#64748b' }}>
                      {pendingContractorsAmountFormatted}
                    </span>
                    {isAr ? <ChevronLeft size={14} className={styles.urgentAlertChevron} /> : <ChevronRight size={14} className={styles.urgentAlertChevron} />}
                  </div>
                </div>

                {/* Alert 3: Liquidity Balance */}
                <div
                  className={styles.urgentAlertItem}
                  onClick={() => {
                    if (onNavigateTab) {
                      onNavigateTab('ledger');
                    } else {
                      setActiveTableTab('ledger');
                      setTableStatusFilter('all');
                      document.getElementById('cockpit-canonical-table')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  role="button"
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
                  tabIndex={0}
                  title={isAr ? 'عرض دفتر الأستاذ وحركات الخزينة والسيولة' : 'View General Ledger & Cash Liquidity'}
                >
                  <div className={styles.urgentAlertItemLeading}>
                    <div
                      className={styles.urgentAlertSquircle}
                      style={{
                        background: '#f0fdf4',
                        color: '#16a34a',
                        borderColor: 'rgba(22, 163, 74, 0.2)',
                      }}
                    >
                      <Wallet size={14} />
                    </div>
                    <div className={styles.urgentAlertInfo}>
                      <span className={styles.urgentAlertLabel}>{isAr ? 'رصيد السيولة النقدية' : 'Liquidity Balance'}</span>
                      <span className={styles.urgentAlertSubtext}>
                        {isAr ? `خزينة: ${safeCashFormatted} • بنك: ${bankCashFormatted}` : `Safe: ${safeCashFormatted} • Bank: ${bankCashFormatted}`}
                      </span>
                    </div>
                  </div>
                  <div className={styles.urgentAlertTrailing}>
                    <span className={`${styles.urgentAlertAmount} tabularNums`} style={{ color: '#16a34a' }}>
                      {`${cashNum.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`}
                    </span>
                    {isAr ? <ChevronLeft size={14} className={styles.urgentAlertChevron} /> : <ChevronRight size={14} className={styles.urgentAlertChevron} />}
                  </div>
                </div>
              </div>
            </ZFWidgetCard>

            {/* Widget 2: Upcoming Schedule & Mini Calendar */}
            <ZFWidgetCard
              id="cockpit-mini-calendar"
              className={styles.cockpitRailCard}
              title={isAr ? 'التقويم المالي' : 'Financial Calendar'}
              icon={<Calendar size={15} color="var(--erp-accent, #2563eb)" />}
              headerAction={
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--erp-accent, #2563eb)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {isAr ? 'عرض الكل' : 'View All'}
                </button>
              }
              defaultExpanded={true}
              isAr={isAr}
            >
              {/* Month Navigation */}
              <div className={styles.miniCalendarMonthNav}>
                <button
                  type="button"
                  className={styles.miniCalendarNavBtn}
                  onClick={handlePrevMonth}
                  aria-label={isAr ? 'الشهر السابق' : 'Previous Month'}
                  title={isAr ? 'الشهر السابق' : 'Previous Month'}
                >
                  {isAr ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                </button>
                <span className={styles.miniCalendarMonthTitle}>
                  {miniCalendarMonthTitle}
                </span>
                <button
                  type="button"
                  className={styles.miniCalendarNavBtn}
                  onClick={handleNextMonth}
                  aria-label={isAr ? 'الشهر القادم' : 'Next Month'}
                  title={isAr ? 'الشهر القادم' : 'Next Month'}
                >
                  {isAr ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>

              {/* Mini Calendar 7-Day Grid */}
              <div className={styles.miniCalendarGrid}>
                {(isAr ? ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'] : ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr']).map((dayName, idx) => (
                  <div key={idx} className={styles.miniCalendarDayHeader}>
                    {dayName}
                  </div>
                ))}
                {miniCalendarCells.map((cell, idx) => {
                  const isSelected = cell.isCurrentMonth && selectedCalendarDay === cell.day;
                  const hasEvent = cell.isCurrentMonth && daysWithEvents.has(cell.day);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!cell.isCurrentMonth}
                      className={`${styles.miniCalendarDayCell} ${
                        !cell.isCurrentMonth ? styles.miniCalendarDayCellMuted : ''
                      } ${cell.isToday ? styles.miniCalendarDayCellToday : ''} ${
                        isSelected ? styles.miniCalendarDayCellActive : ''
                      }`}
                      onClick={() => {
                        if (!cell.isCurrentMonth) return;
                        setSelectedCalendarDay(prev => prev === cell.day ? null : cell.day);
                      }}
                      aria-label={`${cell.day} ${miniCalendarMonthTitle}`}
                      aria-pressed={isSelected}
                    >
                      <span>{cell.day}</span>
                      {hasEvent && <span className={styles.miniCalendarEventDot} />}
                    </button>
                  );
                })}
              </div>

              {/* Today's Agenda Underneath Calendar */}
              <div className={styles.miniCalendarAgenda}>
                {selectedCalendarDay !== null && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    marginBottom: '4px',
                    background: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    color: 'var(--erp-accent, #2563eb)'
                  }}>
                    <span style={{ fontWeight: 600 }}>
                      {isAr ? `استحقاقات ${selectedCalendarDay} ${miniCalendarMonthTitle}` : `Dues on ${miniCalendarMonthTitle} ${selectedCalendarDay}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarDay(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--erp-accent, #2563eb)',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '0 4px',
                      }}
                    >
                      {isAr ? 'عرض الكل' : 'Clear'}
                    </button>
                  </div>
                )}
                {upcomingAgendaEvents.length > 0 ? (
                  <>
                    {upcomingAgendaEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className={styles.miniCalendarAgendaItem}
                        onClick={evt.onClick}
                        role="button"
                        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
                        tabIndex={0}
                        title={evt.title}
                      >
                        <div
                          className={styles.miniCalendarAgendaIconWrap}
                          style={{
                            background: evt.iconBg,
                            color: evt.iconColor,
                            borderColor:
                              evt.type === 'installment'
                                ? 'rgba(22, 163, 74, 0.2)'
                                : evt.type === 'contractor'
                                ? 'rgba(217, 119, 6, 0.2)'
                                : 'var(--erp-accent-tint, rgba(37, 99, 235, 0.2))',
                          }}
                        >
                          {evt.type === 'installment' && <Banknote size={13} />}
                          {evt.type === 'contractor' && <HardHat size={13} />}
                          {evt.type === 'pdc' && <CreditCard size={13} />}
                        </div>
                        <div className={styles.miniCalendarAgendaContent}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <span className={styles.miniCalendarAgendaTitle}>
                              {evt.title}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', marginTop: '2px' }}>
                            <span className={styles.miniCalendarAgendaTime} style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                              {evt.dateLabel}
                            </span>
                            <span className={`${styles.urgentAlertAmount} tabularNums`} style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginInlineStart: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                              {evt.formattedAmount}
                            </span>
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, opacity: 0.5 }}>
                          {isAr ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
                        </div>
                      </div>
                    ))}
                    {upcomingAgendaEvents.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setIsScheduleModalOpen(true)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          marginTop: '4px',
                          background: 'transparent',
                          border: '1px dashed #cbd5e1',
                          borderRadius: '6px',
                          color: 'var(--erp-accent, #2563eb)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {isAr ? `+${upcomingAgendaEvents.length - 3} استحقاقات إضافية (عرض الكل)` : `+${upcomingAgendaEvents.length - 3} more dues (view all)`}
                      </button>
                    )}
                  </>
                ) : (
                  <div className={styles.miniCalendarAgendaEmpty}>
                    <div>
                      {selectedCalendarDay !== null
                        ? (isAr ? `لا توجد استحقاقات مسجلة في هذا اليوم (${selectedCalendarDay})` : `No dues recorded on this day (${selectedCalendarDay})`)
                        : (isAr ? 'لا توجد استحقاقات في الفترة المحددة' : 'No dues in the selected period')}
                    </div>
                    {selectedCalendarDay !== null && (
                      <button
                        type="button"
                        onClick={() => setSelectedCalendarDay(null)}
                        style={{
                          marginTop: '6px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--erp-accent, #2563eb)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {isAr ? 'عرض كل الاستحقاقات' : 'Show all upcoming dues'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </ZFWidgetCard>

            {/* Widget 3: Projects by Completion Rate (موقف المشروعات) */}
            <ZFWidgetCard
              id="cockpit-projects-progress"
              className={styles.cockpitRailCard}
              title={isAr ? 'موقف المشروعات' : 'Project Status'}
              icon={<Building2 size={15} color="var(--erp-accent, #2563eb)" />}
              badge={
                <span className="statusPill statusPillNeutral">
                  {`${projectsProgressData.length} ${isAr ? 'مشروع' : 'projects'}`}
                </span>
              }
              headerAction={
                <button
                  type="button"
                  onClick={() => setIsProjectsModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--erp-accent, #2563eb)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {isAr ? 'عرض الكل' : 'View All'}
                </button>
              }
              defaultExpanded={true}
              isAr={isAr}
            >
              <div className={styles.projectsProgressList}>
                {projectsProgressData.length > 0 ? (
                  projectsProgressData.slice(0, 4).map((proj) => (
                    <div
                      key={proj.id}
                      className={styles.projectProgressItem}
                      onClick={() => {
                        if (onNavigateTab) {
                          onNavigateTab('properties', { propertyId: proj.id });
                        } else {
                          setIsProjectsModalOpen(true);
                        }
                      }}
                      role="button"
                      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
                      tabIndex={0}
                      title={proj.name}
                    >
                      <div className={styles.projectProgressThumb}>
                        {proj.imageUrl ? (
                          <img
                            key={proj.id}
                            src={proj.imageUrl}
                            alt={proj.name}
                            loading="lazy"
                            decoding="async"
                            className={styles.projectProgressImg}
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          style={{
                            display: proj.imageUrl ? 'none' : 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%',
                            background: proj.pct >= 100 ? '#ecfdf5' : 'var(--erp-accent-subtle, #eff6ff)',
                            color: proj.pct >= 100 ? '#16a34a' : 'var(--erp-accent, #2563eb)',
                          }}
                        >
                          <Building2 size={20} />
                        </div>
                      </div>
                      <div className={styles.projectProgressMain}>
                        <div className={styles.projectProgressTopRow}>
                          <span className={styles.projectProgressName} title={proj.name}>{proj.name}</span>
                          <span className={styles.projectProgressPct}>{Math.min(100, Math.max(0, proj.pct))}%</span>
                        </div>
                        <div className={styles.projectProgressMetaRow}>
                          {proj.location ? <span className={styles.projectProgressLoc}>{proj.location}</span> : <span />}
                          {proj.totalUnits > 0 ? (
                            <span className={styles.projectProgressUnits}>
                              {`${proj.contractedUnits}/${proj.totalUnits} ${isAr ? 'وحدة متعاقد عليها' : 'units contracted'}`}
                            </span>
                          ) : null}
                        </div>
                        <div className={styles.projectProgressBarTrack}>
                          <div
                            className={styles.projectProgressBarFill}
                            style={{
                              width: `${Math.min(100, Math.max(0, proj.pct))}%`,
                              backgroundColor: 'var(--erp-accent, #2563eb)'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.projectsProgressEmpty}>
                    {isAr ? 'لا توجد مشاريع مسجلة حالياً' : 'No properties registered'}
                  </div>
                )}
              </div>
            </ZFWidgetCard>
          </div>
        </ZFWorkstationSideWidgets>

      {/* ─── 4. FULL-SCREEN EXPANDED TABLE MODAL (Popup View) ─── */}
      {isFullScreenTableOpen && (
        <ZFModalShell
          isOpen={isFullScreenTableOpen}
          onClose={() => setIsFullScreenTableOpen(false)}
          title={isAr ? 'سجل العمليات والمعاملات الشامل' : 'Full Operations & Transactions Register'}
          subtitle={
            isAr
              ? 'عرض تفصيلي للمعاملات والتحصيلات ومستحقات المقاولين وحركة الخزينة في الفترة المختارة'
              : 'Transactions, client collections, contractor payables and treasury movements in the selected period'
          }
          icon={<Maximize2 size={18} color="var(--erp-accent, #2563eb)" />}
          maxWidth="1180px"
          maxHeight="88vh"
          isAr={isAr}
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.80rem', color: '#64748b' }}>
                {isAr
                  ? `إجمالي السجلات المتاحة: ${totalFilteredCount} سجل`
                  : `Total available records: ${totalFilteredCount} records`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullScreenTableOpen(false);
                      if (activeTableTab === 'collections') onNavigateTab('contracts');
                      else if (activeTableTab === 'contractors') onNavigateTab('expenses');
                      else if (activeTableTab === 'pdc') onNavigateTab('pdc');
                      else if (activeTableTab === 'ledger') onNavigateTab('ledger');
                      else onNavigateTab('ledger');
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div className={styles.canonicalTabsUnderline} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTableTab === 'all'}
                  className={`${styles.canonicalUnderlineTab} ${activeTableTab === 'all' ? styles.canonicalUnderlineTabActive : ''}`}
                  onClick={() => {
                    setActiveTableTab('all');
                    setTableStatusFilter('all');
                  }}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTableTab === 'collections'}
                  className={`${styles.canonicalUnderlineTab} ${activeTableTab === 'collections' ? styles.canonicalUnderlineTabActive : ''}`}
                  onClick={() => {
                    setActiveTableTab('collections');
                    setTableStatusFilter('all');
                  }}
                >
                  {isAr ? 'تحصيلات العملاء' : 'Client Collections'}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTableTab === 'contractors'}
                  className={`${styles.canonicalUnderlineTab} ${activeTableTab === 'contractors' ? styles.canonicalUnderlineTabActive : ''}`}
                  onClick={() => {
                    setActiveTableTab('contractors');
                    setTableStatusFilter('all');
                  }}
                >
                  {isAr ? 'مستحقات المقاولين' : 'Contractor Payables'}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTableTab === 'ledger'}
                  className={`${styles.canonicalUnderlineTab} ${activeTableTab === 'ledger' ? styles.canonicalUnderlineTabActive : ''}`}
                  onClick={() => {
                    setActiveTableTab('ledger');
                    setTableStatusFilter('all');
                  }}
                >
                  {isAr ? 'حركة الخزينة' : 'Cash Journal'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  className={styles.canonicalFilterSelect}
                  value={tableStatusFilter}
                  onChange={(e) => setTableStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                  <option value="active">{isAr ? 'ساري / معتمد' : 'Active / Approved'}</option>
                  <option value="pending">{isAr ? 'قيد الصرف / الخزنة' : 'Pending / Safe'}</option>
                  <option value="delivered">{isAr ? 'تم التسليم / محصل' : 'Delivered / Cleared'}</option>
                  <option value="rescinded">{isAr ? 'فسخ واسترداد' : 'Rescinded'}</option>
                </select>

                <ZFSearchBar
                  value={tableSearchQuery}
                  onChange={setTableSearchQuery}
                  placeholder={isAr ? 'بحث بالاسم أو الرقم...' : 'Search records...'}
                  isAr={isAr}
                  size="sm"
                  style={{
                    height: '34px',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '0.78rem',
                    width: '200px',
                  }}
                />
              </div>
            </div>

            {/* Scrollable Modal Table Area */}
            <div style={{ maxHeight: '52vh', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              {activeTableTab === 'all' && (
                <table className={styles.canonicalTable}>
                  <thead className={styles.canonicalThead}>
                    <tr>
                      <th className={styles.canonicalTh}>{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'نوع الحركة' : 'Type'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'الطرف / العميل / المقاول' : 'Party / Entity'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'المرجع / الوحدة' : 'Reference / Unit'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'المبلغ' : 'Amount'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          {isAr ? 'لا توجد معاملات مسجلة مطابقة للبحث' : 'No matching transactions found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredAllTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className={styles.canonicalRow}
                          onClick={() => {
                            setIsFullScreenTableOpen(false);
                            tx.onClick();
                          }}
                          tabIndex={0}
                          role="button"
                        >
                          <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.80rem', color: '#64748b' }}>
                            {tx.date}
                          </td>
                          <td className={styles.canonicalTd}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              color: tx.typeColor,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: tx.typeColor }} />
                              {tx.typeLabel}
                            </span>
                          </td>
                          <td className={styles.canonicalTd} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.party}>
                            {tx.party}
                          </td>
                          <td className={styles.canonicalTd} style={{ fontSize: '0.80rem', fontWeight: 400, color: '#64748b', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.reference}>
                            {tx.reference}
                          </td>
                          <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                            {tx.formattedAmount}
                          </td>
                          <td className={styles.canonicalTd}>
                            <span className={`${styles.statusPill} ${tx.statusClass}`}>
                              {tx.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTableTab === 'contractors' && (
                <table className={styles.canonicalTable}>
                  <thead className={styles.canonicalThead}>
                    <tr>
                      <th className={styles.canonicalTh}>{isAr ? 'المقاول / المورد' : 'Contractor / Supplier'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'المرجع / البند' : 'Reference / Category'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'تاريخ الاستحقاق' : 'Date'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'المبلغ المستحق' : 'Amount Due'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllTransactions.filter(t => t.type === 'contractor').length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          {isAr ? 'لا توجد مستحقات مقاولين مسجلة' : 'No contractor payables found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredAllTransactions.filter(t => t.type === 'contractor').map((cost) => (
                        <tr
                          key={cost.id}
                          className={styles.canonicalRow}
                          onClick={() => {
                            setIsFullScreenTableOpen(false);
                            cost.onClick();
                          }}
                          tabIndex={0}
                          role="button"
                        >
                          <td className={styles.canonicalTd} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cost.party}>
                            {cost.party}
                          </td>
                          <td className={styles.canonicalTd} style={{ fontSize: '0.80rem', fontWeight: 400, color: '#64748b', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cost.reference}>
                            {cost.reference}
                          </td>
                          <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.80rem', color: '#64748b' }}>
                            {cost.date}
                          </td>
                          <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                            {cost.formattedAmount}
                          </td>
                          <td className={styles.canonicalTd}>
                            <span className={`${styles.statusPill} ${cost.statusClass}`}>
                              {cost.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTableTab === 'collections' && (
                <table className={styles.canonicalTable}>
                  <thead className={styles.canonicalThead}>
                    <tr>
                      <th className={styles.canonicalTh}>{isAr ? 'العميل' : 'Client Name'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'الوحدة / العقار' : 'Unit / Property'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'القيمة الإجمالية' : 'Total Price'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'المتحصل' : 'Collected'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedContracts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          {isAr ? 'لا توجد عقود مسجلة مطابقة للبحث' : 'No matching contracts found.'}
                        </td>
                      </tr>
                    ) : (
                      sortedContracts.map((c) => {
                        const isDelivered = c.handover_status === 'Delivered';
                        const isRescinded = c.status === 'Rescinded';
                        const rawContractVal =
                          (c as any).gross_contract_value ??
                          (c as any).total_contract_value ??
                          (c as any).total_amount ??
                          c.base_price ??
                          '0';
                        const rawCollectedVal =
                          (c as any).total_cash_collected ??
                          (c as any).collected_amount ??
                          (c as any).paid_amount ??
                          '0';
                        return (
                          <tr
                            key={c.contract_id}
                            className={styles.canonicalRow}
                            onClick={() => {
                              setIsFullScreenTableOpen(false);
                              onInspectContract(c);
                            }}
                          >
                            <td className={styles.canonicalTd} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.buyer_name || '-'}>
                              {c.buyer_name || '-'}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontSize: '0.80rem', fontWeight: 400, color: '#64748b', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.building_unit_number || (isAr ? 'وحدة سكنية' : 'Unit')}>
                              {c.building_unit_number || (isAr ? 'وحدة سكنية' : 'Unit')}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                              {parseFloat(rawContractVal).toLocaleString('en-US')}{' '}
                              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                              {parseFloat(rawCollectedVal).toLocaleString('en-US')}{' '}
                              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                            </td>
                            <td className={styles.canonicalTd}>
                              {isDelivered ? (
                                <span className={`${styles.statusPill} ${styles.statusPillBlue}`}>
                                  {isAr ? 'تم التسليم' : 'Delivered'}
                                </span>
                              ) : isRescinded ? (
                                <span className={`${styles.statusPill} ${styles.statusPillRed}`}>
                                  {isAr ? 'فسخ واسترداد' : 'Rescinded'}
                                </span>
                              ) : (
                                <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                                  {isAr ? 'ساري التعاقد' : 'Active'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {activeTableTab === 'pdc' && (
                <table className={styles.canonicalTable}>
                  <thead className={styles.canonicalThead}>
                    <tr>
                      <th className={styles.canonicalTh}>{isAr ? 'الساحب / العميل' : 'Drawer / Client'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'البنك ورقم الشيك' : 'Bank & Cheque #'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'القيمة الاسمية' : 'Nominal Value'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPDCs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          {isAr ? 'لا توجد شيكات مسجلة' : 'No cheques recorded.'}
                        </td>
                      </tr>
                    ) : (
                      sortedPDCs.map((p) => (
                        <tr
                          key={p.cheque_id}
                          className={styles.canonicalRow}
                          onClick={() => {
                            setIsFullScreenTableOpen(false);
                            onInspectCheque(p);
                          }}
                        >
                          <td className={styles.canonicalTd} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.drawer_name || '-'}>
                            {p.drawer_name || '-'}
                          </td>
                          <td className={styles.canonicalTd} style={{ fontSize: '0.80rem', fontWeight: 400, color: '#64748b', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${p.bank_name || 'البنك التجاري'} (${p.cheque_number || '---'})`}>
                            {p.bank_name || 'البنك التجاري'} ({p.cheque_number || '---'})
                          </td>
                          <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.80rem', color: '#64748b' }}>
                            {p.due_date || '-'}
                          </td>
                          <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                            {parseFloat(p.nominal_value || '0').toLocaleString('en-US')}{' '}
                            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                          </td>
                          <td className={styles.canonicalTd}>
                            <span className={`
                              ${styles.statusPill} 
                              ${p.status === 'In Safe' 
                                ? styles.statusPillAmber 
                                : p.status === 'Bounced' 
                                  ? styles.statusPillRed 
                                  : p.status === 'Deposited' 
                                    ? styles.statusPillBlue 
                                    : styles.statusPillGreen}
                            `}>
                              {p.status === 'In Safe'
                                ? (isAr ? 'في الخزنة' : 'In Safe')
                                : p.status === 'Deposited'
                                  ? (isAr ? 'مودع بالبنك' : 'Deposited')
                                  : p.status === 'Cleared'
                                    ? (isAr ? 'محصل' : 'Cleared')
                                    : p.status === 'Bounced'
                                      ? (isAr ? 'مرتد' : 'Bounced')
                                      : p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTableTab === 'ledger' && (
                <table className={styles.canonicalTable}>
                  <thead className={styles.canonicalThead}>
                    <tr>
                      <th className={styles.canonicalTh}>{isAr ? 'رقم القيد' : 'Entry ID'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'البيان المحاسبي' : 'Description'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'المبلغ' : 'Amount'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedJournal.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                          {isAr ? 'لا توجد قيود يومية حديثة' : 'No recent journal entries.'}
                        </td>
                      </tr>
                    ) : (
                      sortedJournal.map((j) => (
                        <tr
                          key={j.entry_id}
                          className={styles.canonicalRow}
                          onClick={() => {
                            setIsFullScreenTableOpen(false);
                            if (onNavigateTab) onNavigateTab('ledger');
                          }}
                        >
                          <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                            #{j.entry_id ? j.entry_id.slice(0, 8) : '001'}
                          </td>
                          <td className={styles.canonicalTd} style={{ fontSize: '0.80rem', fontWeight: 400, color: '#334155', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {j.description || '-'}
                          </td>
                          <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.80rem', color: '#64748b' }}>
                            {j.entry_date ? String(j.entry_date).slice(0, 10) : '-'}
                          </td>
                          <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                            {parseFloat(j.lines?.[0]?.debit_amount || '0').toLocaleString('en-US')}{' '}
                            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                          </td>
                          <td className={styles.canonicalTd}>
                            <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                              {isAr ? 'مرحل ومطابق' : 'Posted'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </ZFModalShell>
      )}

      {/* ─── MODAL 1: URGENT ALERTS REGISTER ─── */}
      {isAlertsModalOpen && (
        <ZFModalShell
          isOpen={isAlertsModalOpen}
          onClose={() => setIsAlertsModalOpen(false)}
          title={isAr ? 'مركز التنبيهات المالية والتشغيلية العاجلة' : 'Urgent Financial & Operational Alerts Center'}
          subtitle={
            isAr
              ? 'متابعة التحصيلات المتأخرة ومستحقات المقاولين المعلقة ورصيد السيولة المسجل'
              : 'Overdue collections, pending contractor payables and recorded liquidity'
          }
          icon={<AlertTriangle size={18} color="#dc2626" />}
          maxWidth="1080px"
          maxHeight="86vh"
          isAr={isAr}
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={styles.statusPill} style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                  {overdueChequesCount + pendingContractorsCount} {isAr ? 'تنبيه عاجل' : 'Urgent Alerts'}
                </span>
                <span style={{ fontSize: '0.80rem', color: '#64748b' }}>
                  {isAr ? 'يتم التحديث فورياً وفقاً لبيانات الدفاتر والقيود' : 'Live updated from real ledgers & registers'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {onNavigateTab && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAlertsModalOpen(false);
                        onNavigateTab('pdc');
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
                      <span>{isAr ? 'فتح أجندة التحصيلات' : 'Open Collections Agenda'}</span>
                      <ExternalLink size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAlertsModalOpen(false);
                        onNavigateTab('construction');
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
                        color: '#d97706',
                        cursor: 'pointer',
                      }}
                    >
                      <span>{isAr ? 'الانتقال إلى المقاولين' : 'Open Contractors'}</span>
                      <ExternalLink size={13} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsAlertsModalOpen(false)}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Stat Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
              {/* Card 1: Overdue Client Cheques */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AlertCircle size={15} color="#dc2626" />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                      {isAr ? 'أقساط العملاء المتأخرة' : 'Overdue Client Installments'}
                    </span>
                  </div>
                  <span className={`${styles.statusPill} ${styles.statusPillRed}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {overdueChequesCount} {isAr ? 'قسط متأخر' : 'Overdue'}
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', margin: '0.35rem 0 0.15rem 0' }}>
                  {overdueChequesAmountFormatted}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {isAr ? 'أقساط تجاوزت تاريخ الاستحقاق المحدد' : 'Installments past their due date'}
                </div>
              </div>

              {/* Card 2: Due Contractor Payables */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <HardHat size={15} color="#d97706" />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                      {isAr ? 'مستحقات مقاولين تستحق الصرف' : 'Due Contractor Payables'}
                    </span>
                  </div>
                  <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {pendingContractorsCount} {isAr ? 'مستخلص' : 'Payables'}
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', margin: '0.35rem 0 0.15rem 0' }}>
                  {pendingContractorsAmountFormatted}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {isAr ? 'مستخلصات معلقة تنتظر الصرف' : 'Pending review and payout'}
                </div>
              </div>

              {/* Card 3: Safe & Bank Liquidity */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wallet size={15} color="#16a34a" />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                      {isAr ? 'رصيد السيولة' : 'Liquidity Balance'}
                    </span>
                  </div>
                  <span className={`${styles.statusPill} ${styles.statusPillGreen}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {`${cashNum.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`}
                  </span>
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', margin: '0.35rem 0 0.15rem 0' }}>
                  {isAr ? `خزينة: ${safeCashFormatted} • بنك: ${bankCashFormatted}` : `Safe: ${safeCashFormatted} • Bank: ${bankCashFormatted}`}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {isAr ? 'إجمالي السيولة النقدية الحالية بالجنيه' : 'Current working liquidity in EGP'}
                </div>
              </div>
            </div>

            <section>
              <h5 style={{ margin: '0 0 12px', color: '#0f172a' }}>{isAr ? 'الأقساط المتأخرة' : 'Overdue Installments'}</h5>
              {overdueCheques.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>{isAr ? 'لا توجد أقساط متأخرة' : 'No overdue installments'}</p> : (
                <div style={{ overflowX: 'auto' }}><table className={styles.canonicalTable}>
                  <thead className={styles.canonicalThead}><tr>
                    <th className={styles.canonicalTh}>{isAr ? 'العميل' : 'Client'}</th>
                    <th className={styles.canonicalTh}>{isAr ? 'القسط' : 'Installment'}</th>
                    <th className={styles.canonicalTh}>{isAr ? 'الاستحقاق' : 'Due date'}</th>
                    <th className={styles.canonicalTh}>{isAr ? 'المتبقي' : 'Remaining'}</th>
                  </tr></thead>
                  <tbody>{overdueCheques.map(schedule => {
                    const contract = contracts.find(c => c.contract_id === schedule.contract_id);
                    return <tr key={schedule.schedule_id} className={styles.canonicalRow} role="button" tabIndex={0}
                      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
                      onClick={() => { setIsAlertsModalOpen(false); if (contract) onInspectContract(contract); else onNavigateTab?.('pdc'); }}>
                      <td className={styles.canonicalTd}>{contract?.buyer_name || '—'}</td>
                      <td className={styles.canonicalTd}>{schedule.tranche_number}</td>
                      <td className={styles.canonicalTd}>{schedule.due_date}</td>
                      <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.max(0, Number(schedule.nominal_value || 0) - Number(schedule.amount_paid || 0)).toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}</td>
                    </tr>;
                  })}</tbody>
                </table></div>
              )}
            </section>

            {/* Section 2: Pending Contractor Payables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <HardHat size={15} color="#d97706" />
                  {isAr ? 'مستحقات مقاولين وموردي تنفيذ معلقة' : 'Pending Contractor & Supplier Payables'}
                </h5>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {pendingContractorsItems.length} {isAr ? 'بند معلق' : 'pending items'}
                </span>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table className={styles.canonicalTable} style={{ margin: 0 }}>
                  <thead className={styles.canonicalThead}>
                    <tr>
                      <th className={styles.canonicalTh}>{isAr ? 'بيان البند / المستخلص' : 'Cost Item / Invoice'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'المقاول / المورد' : 'Contractor / Supplier'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'المبلغ المستحق' : 'Amount Due'}</th>
                      <th className={styles.canonicalTh}>{isAr ? 'الحالة' : 'Status'}</th>
                      <th className={styles.canonicalTh} style={{ textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingContractorsItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '1.75rem', color: '#94a3b8' }}>
                          <CheckCircle2 size={24} color="#10b981" style={{ display: 'block', margin: '0 auto 0.4rem auto' }} />
                          {isAr ? 'لا توجد مستحقات مقاولين معلقة في الوقت الحالي.' : 'No pending contractor payables at this time.'}
                        </td>
                      </tr>
                    ) : (
                      pendingContractorsItems.map((cost) => {
                        const unpaidAmt = cost.payable_installments && cost.payable_installments.length > 0
                          ? cost.payable_installments.filter(i => i.status !== 'PAID').reduce((s, i) => s + (parseFloat(i.amount_egp || '0') || 0), 0)
                          : parseFloat(cost.remaining_amount_egp || cost.total_cost_egp || '0') || 0;
                        return (
                          <tr
                            key={cost.item_id}
                            className={styles.canonicalRow}
                            onClick={() => {
                              setIsAlertsModalOpen(false);
                              if (onNavigateTab) onNavigateTab('construction');
                            }}
                          >
                            <td className={styles.canonicalTd} style={{ fontWeight: 600, color: '#0f172a' }}>
                              {isAr ? (cost.item_name_ar || 'مستخلص أعمال') : (cost.item_name_en || 'Work Certificate')}
                            </td>
                            <td className={styles.canonicalTd} style={{ color: '#334155' }}>
                              {cost.supplier_contractor || (isAr ? 'مقاول' : 'Contractor')}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                              {cost.due_date || '-'}
                            </td>
                            <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#d97706' }}>
                              {unpaidAmt.toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}
                            </td>
                            <td className={styles.canonicalTd}>
                              <span className={`${styles.statusPill} ${styles.statusPillAmber}`}>
                                {cost.status === 'pending_audit' ? (isAr ? 'قيد المراجعة' : 'Pending Audit') : (isAr ? 'غير مسدد' : 'Unpaid')}
                              </span>
                            </td>
                            <td className={styles.canonicalTd} style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsAlertsModalOpen(false);
                                  if (onNavigateTab) onNavigateTab('construction');
                                }}
                                style={{
                                  background: '#fffbeb',
                                  border: '1px solid #fde68a',
                                  color: '#d97706',
                                  borderRadius: '4px',
                                  padding: '0.25rem 0.55rem',
                                  fontSize: '0.73rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {isAr ? 'متابعة الصرف' : 'Process Payout'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ZFModalShell>
      )}

      {/* ─── MODAL 2: UPCOMING SCHEDULE & DUES REGISTER ─── */}
      {isScheduleModalOpen && (
        <ZFModalShell
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          title={isAr ? 'الأجندة والمواعيد والاستحقاقات القادمة' : 'Upcoming Dues & Schedules Register'}
          subtitle={
            isAr
              ? 'أقساط العملاء ومستخلصات المقاولين في الفترة والمشروع المختارين من التقويم'
              : 'Customer installments and contractor invoices in the calendar’s selected period and project'
          }
          icon={<Calendar size={18} color="var(--erp-accent, #2563eb)" />}
          maxWidth="1080px"
          maxHeight="86vh"
          isAr={isAr}
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.80rem', color: '#64748b' }}>
                {isAr
                  ? `إجمالي الاستحقاقات القادمة: ${filteredScheduleEvents.length} استحقاق`
                  : `Total upcoming dues: ${filteredScheduleEvents.length} items`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsScheduleModalOpen(false);
                      onNavigateTab('operations');
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
                    <span>{isAr ? 'الانتقال إلى الأجندة الكاملة' : 'Open Operations Agenda'}</span>
                    <ExternalLink size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Filter Tabs */}
            <div className={styles.canonicalTabsUnderline} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={scheduleFilterTab === 'all'}
                className={`${styles.canonicalUnderlineTab} ${scheduleFilterTab === 'all' ? styles.canonicalUnderlineTabActive : ''}`}
                onClick={() => setScheduleFilterTab('all')}
              >
                {isAr ? 'الكل' : 'All'} ({allUpcomingAgendaEvents.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scheduleFilterTab === 'installments'}
                className={`${styles.canonicalUnderlineTab} ${scheduleFilterTab === 'installments' ? styles.canonicalUnderlineTabActive : ''}`}
                onClick={() => setScheduleFilterTab('installments')}
              >
                {isAr ? 'أقساط عقود' : 'Contract Installments'} ({allUpcomingAgendaEvents.filter(e => e.type === 'installment').length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scheduleFilterTab === 'contractors'}
                className={`${styles.canonicalUnderlineTab} ${scheduleFilterTab === 'contractors' ? styles.canonicalUnderlineTabActive : ''}`}
                onClick={() => setScheduleFilterTab('contractors')}
              >
                {isAr ? 'مستحقات مقاولين' : 'Contractor Dues'} ({allUpcomingAgendaEvents.filter(e => e.type === 'contractor').length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scheduleFilterTab === 'pdc'}
                className={`${styles.canonicalUnderlineTab} ${scheduleFilterTab === 'pdc' ? styles.canonicalUnderlineTabActive : ''}`}
                onClick={() => setScheduleFilterTab('pdc')}
              >
                {isAr ? 'شيكات آجلة' : 'PDC Cheques'} ({allUpcomingAgendaEvents.filter(e => e.type === 'pdc').length})
              </button>
            </div>

            {/* Dues Canonical Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className={styles.canonicalTable} style={{ margin: 0 }}>
                <thead className={styles.canonicalThead}>
                  <tr>
                    <th className={styles.canonicalTh}>{isAr ? 'النوع' : 'Type'}</th>
                    <th className={styles.canonicalTh}>{isAr ? 'البيان والتفاصيل' : 'Title & Description'}</th>
                    <th className={styles.canonicalTh}>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                    <th className={styles.canonicalTh}>{isAr ? 'المبلغ' : 'Amount'}</th>
                    <th className={styles.canonicalTh} style={{ textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScheduleEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                        {isAr ? 'لا توجد استحقاقات مسجلة في الفترة المختارة.' : 'No dues recorded in the selected period.'}
                      </td>
                    </tr>
                  ) : (
                    filteredScheduleEvents.map((evt) => (
                      <tr
                        key={evt.id}
                        className={styles.canonicalRow}
                        onClick={() => {
                          setIsScheduleModalOpen(false);
                          evt.onClick();
                        }}
                      >
                        <td className={styles.canonicalTd}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: evt.iconBg, color: evt.iconColor }}>
                              {evt.type === 'installment' && <Banknote size={13} />}
                              {evt.type === 'contractor' && <HardHat size={13} />}
                              {evt.type === 'pdc' && <CreditCard size={13} />}
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: evt.iconColor }}>
                              {evt.type === 'installment' ? (isAr ? 'قسط' : 'Installment') : evt.type === 'contractor' ? (isAr ? 'مقاول' : 'Contractor') : (isAr ? 'شيك آجل' : 'PDC Cheque')}
                            </span>
                          </div>
                        </td>
                        <td className={styles.canonicalTd} style={{ fontWeight: 600, color: '#0f172a' }}>
                          {evt.title}
                        </td>
                        <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{evt.dateLabel}</span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>{evt.due_date}</span>
                        </td>
                        <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a' }}>
                          {evt.formattedAmount}
                        </td>
                        <td className={styles.canonicalTd} style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsScheduleModalOpen(false);
                              evt.onClick();
                            }}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              padding: '0.25rem 0.65rem',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              color: 'var(--erp-accent, #2563eb)',
                              cursor: 'pointer',
                            }}
                          >
                            {isAr ? 'معاينة' : 'Inspect'}
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
      )}

      {/* ─── MODAL 3: PROJECTS BY COMPLETION RATE REGISTER ─── */}
      {isProjectsModalOpen && (
        <ZFModalShell
          isOpen={isProjectsModalOpen}
          onClose={() => setIsProjectsModalOpen(false)}
          title={isAr ? 'سجل المشاريع ونسب الإنجاز الإنشائي' : 'Construction Projects & Completion Register'}
          subtitle={
            isAr
              ? 'عرض تفصيلي لجميع المشاريع العقارية مرتبة حسب المشاريع قيد التنفيذ أولاً مع نسب الإنجاز ومعدلات التعاقد'
              : 'Detailed register of all properties sorted by unfinished first with completion rates and contracted units'
          }
          icon={<Building2 size={18} color="var(--erp-accent, #2563eb)" />}
          maxWidth="1080px"
          maxHeight="86vh"
          isAr={isAr}
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.80rem', color: '#64748b' }}>
                {isAr
                  ? `إجمالي المشاريع المسجلة: ${projectsProgressData.length} مشروع (${projectsProgressData.filter(p => p.pct < 100).length} قيد التنفيذ)`
                  : `Total projects: ${projectsProgressData.length} (${projectsProgressData.filter(p => p.pct < 100).length} in progress)`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectsModalOpen(false);
                      onNavigateTab('properties');
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
                    <span>{isAr ? 'الانتقال إلى كتالوج المشاريع' : 'Open Properties Catalog'}</span>
                    <ExternalLink size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsProjectsModalOpen(false)}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Quick Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
              {/* Card 1: In Progress Projects */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={15} color="var(--erp-accent, #2563eb)" />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                      {isAr ? 'مشاريع قيد التنفيذ' : 'In Progress'}
                    </span>
                  </div>
                  <span className={`${styles.statusPill} ${styles.statusPillBlue}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {projectsProgressData.filter(p => p.pct < 100).length} {isAr ? 'مشروع' : 'Projects'}
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', margin: '0.35rem 0 0.15rem 0' }}>
                  {projectsProgressData.filter(p => p.pct < 100).length}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {isAr ? 'تحت أعمال البناء والتشييد حالياً' : 'Currently under construction'}
                </div>
              </div>

              {/* Card 2: Completed Projects */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={15} color="#16a34a" />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                      {isAr ? 'مشاريع مكتملة 100%' : '100% Completed'}
                    </span>
                  </div>
                  <span className={`${styles.statusPill} ${styles.statusPillGreen}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {projectsProgressData.filter(p => p.pct >= 100).length} {isAr ? 'مكتمل' : 'Completed'}
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', margin: '0.35rem 0 0.15rem 0' }}>
                  {projectsProgressData.filter(p => p.pct >= 100).length}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {isAr ? 'جاهزة للتسليم والتشغيل النهائي' : 'Ready for handover & occupancy'}
                </div>
              </div>

              {/* Card 3: Total Portfolio */}
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={15} color="#475569" />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                      {isAr ? 'إجمالي المحفظة العقارية' : 'Total Properties'}
                    </span>
                  </div>
                  <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {projectsProgressData.length} {isAr ? 'عقار' : 'Properties'}
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', margin: '0.35rem 0 0.15rem 0' }}>
                  {projectsProgressData.length}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {isAr ? 'إجمالي أصول ومشاريع الشركة' : 'Total enterprise asset portfolio'}
                </div>
              </div>
            </div>

            {/* Projects Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className={styles.canonicalTable} style={{ margin: 0 }}>
                <thead className={styles.canonicalThead}>
                  <tr>
                    <th className={styles.canonicalTh}>{isAr ? 'المشروع' : 'Project'}</th>
                    <th className={styles.canonicalTh}>{isAr ? 'الموقع' : 'Location'}</th>
                    <th className={styles.canonicalTh} style={{ minWidth: '180px' }}>{isAr ? 'نسبة الإنجاز الإنشائي' : 'Completion Rate'}</th>
                    <th className={styles.canonicalTh}>{isAr ? 'الوحدات المتعاقدة' : 'Contracted Units'}</th>
                    <th className={styles.canonicalTh}>{isAr ? 'القيمة التقديرية' : 'Estimated Price'}</th>
                    <th className={styles.canonicalTh}>{isAr ? 'الحالة' : 'Status'}</th>
                    <th className={styles.canonicalTh} style={{ textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {projectsProgressData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.canonicalTd} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                        {isAr ? 'لا توجد مشاريع مسجلة في المحفظة العقارية.' : 'No properties registered in portfolio.'}
                      </td>
                    </tr>
                  ) : (
                    projectsProgressData.map((proj) => (
                      <tr
                        key={proj.id}
                        className={styles.canonicalRow}
                        onClick={() => {
                          setIsProjectsModalOpen(false);
                          if (onNavigateTab) onNavigateTab('properties', { propertyId: proj.id });
                        }}
                      >
                        <td className={styles.canonicalTd} style={{ fontWeight: 700, color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: proj.bgWash, color: proj.color }}>
                              <Building2 size={15} />
                            </div>
                            <span>{proj.name}</span>
                          </div>
                        </td>
                        <td className={styles.canonicalTd} style={{ color: '#475569' }}>
                          {proj.location}
                        </td>
                        <td className={styles.canonicalTd}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: proj.color, fontVariantNumeric: 'tabular-nums' }}>
                                {`${proj.pct}%`}
                              </span>
                              <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
                                {proj.pct >= 100 ? (isAr ? 'مكتمل' : 'Done') : (isAr ? 'قيد التنفيذ' : 'In Progress')}
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, Math.max(0, proj.pct))}%`, height: '100%', background: proj.color, borderRadius: '999px', transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        </td>
                        <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#334155' }}>
                          {proj.totalUnits > 0 ? `${proj.contractedUnits} / ${proj.totalUnits}` : '-'}
                        </td>
                        <td className={styles.canonicalTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a' }}>
                          {proj.priceEgp > 0 ? `${proj.priceEgp.toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}` : '-'}
                        </td>
                        <td className={styles.canonicalTd}>
                          <span className={`
                            ${styles.statusPill}
                            ${proj.pct >= 100 ? styles.statusPillGreen : styles.statusPillBlue}
                          `}>
                            {proj.pct >= 100 ? (isAr ? 'جاهز للتسليم' : 'Ready') : (isAr ? 'قيد الإنشاء' : 'Under Construction')}
                          </span>
                        </td>
                        <td className={styles.canonicalTd} style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsProjectsModalOpen(false);
                              if (onNavigateTab) onNavigateTab('properties', { propertyId: proj.id });
                            }}
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: 'var(--erp-accent, #2563eb)',
                              borderRadius: '4px',
                              padding: '0.25rem 0.65rem',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isAr ? 'عرض الكتالوج' : 'View Catalog'}
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
      )}
    </div>
  );
};

export default CockpitView;
