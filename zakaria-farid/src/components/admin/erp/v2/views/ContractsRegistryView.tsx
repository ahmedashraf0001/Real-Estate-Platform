'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  Search, 
  Plus, 
  RotateCcw, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  SlidersHorizontal,
  PieChart
} from 'lucide-react';
import { ERPContract, ERPInstallmentSchedule, ERPRescissionRecord } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';
import { localizeBuyerName } from '@/components/erp/JournalEntryPreview';
import { ZFKpiCard } from '../ZFKpiCard';
import { ERPApexChart } from '../charts/ERPApexChart';
import { ZFContractInspectionModal } from '../modals/ZFContractInspectionModal';
import shellStyles from '../ZFWorkstationShell.module.css';
import { ZFPageHeader } from '../common/ZFPageHeader';
import css from './ContractsRegistryView.module.css';
import { 
  getContractPaymentStatus, 
  getContractMeta, 
  calculateUnitTypesBreakdown,
  formatCompactNumber,
  ContractPaymentStatus 
} from '@/lib/erp/contractsPipeline';

export type ContractsFilterStatus = 'all' | 'active' | 'overdue' | 'handover' | 'completed' | 'rescissions';
type ContractsSort = 'date_desc' | 'date_asc' | 'gross_desc' | 'gross_asc' | 'collected_desc' | 'remaining_desc' | 'buyer_asc';

export interface ContractsRegistryViewProps {
  contracts: ERPContract[];
  schedules: ERPInstallmentSchedule[];
  rescissions?: ERPRescissionRecord[];
  properties?: Property[];
  isAr?: boolean;
  initialMasterTab?: 'contracts' | 'handover' | 'rescissions';
  inspectedContract?: ERPContract | null;
  onCloseInspection?: () => void;
  onInspectContract?: (contract: ERPContract) => void;
  onInspectRescission?: (rescission: ERPRescissionRecord) => void;
  onOpenNewContract?: () => void;
  onOpenHandoverModal?: (contract: ERPContract) => void;
  onOpenCollectionModal?: (contract: ERPContract, schedule?: ERPInstallmentSchedule) => void;
}

export const ContractsRegistryView: React.FC<ContractsRegistryViewProps> = ({
  contracts,
  schedules,
  rescissions = [],
  properties = [],
  isAr = true,
  initialMasterTab = 'contracts',
  inspectedContract,
  onCloseInspection,
  onInspectContract,
  onInspectRescission,
  onOpenNewContract,
  onOpenHandoverModal,
  onOpenCollectionModal
}) => {
  // Primary status filter (derived initially from URL parameter if provided)
  const [statusFilter, setStatusFilter] = useState<ContractsFilterStatus>(() => {
    if (initialMasterTab === 'handover') return 'handover';
    if (initialMasterTab === 'rescissions') return 'rescissions';
    return 'all';
  });

  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ContractsSort>('date_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [showDonutSection, setShowDonutSection] = useState<boolean>(false);

  // Modal inspection state
  const [internalInspectedContract, setInternalInspectedContract] = useState<ERPContract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'details' | 'schedules'>('details');

  // Handle external inspectedContract passed via props
  useEffect(() => {
    if (inspectedContract) {
      setInternalInspectedContract(inspectedContract);
      setIsModalOpen(true);
      setModalTab('details');
    }
  }, [inspectedContract]);

  const activeInspectingContract = internalInspectedContract || inspectedContract || null;

  const handleOpenInspection = useCallback((c: ERPContract, tab: 'details' | 'schedules' = 'details') => {
    if (c.status === 'Rescinded') {
      const resc = rescissions.find(r => r.contract_id === c.contract_id);
      if (resc && onInspectRescission) {
        onInspectRescission(resc);
        return;
      }
    }
    setInternalInspectedContract(c);
    setModalTab(tab);
    setIsModalOpen(true);
    if (onInspectContract) {
      onInspectContract(c);
    }
  }, [rescissions, onInspectRescission, onInspectContract]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setInternalInspectedContract(null);
    if (onCloseInspection) {
      onCloseInspection();
    }
  }, [onCloseInspection]);

  // Status mapping for all contracts
  const contractStatusMap = useMemo(() => {
    const map = new Map<string, ContractPaymentStatus>();
    contracts.forEach(c => {
      map.set(c.contract_id, getContractPaymentStatus(c, schedules));
    });
    return map;
  }, [contracts, schedules]);

  // Contract Metadata mapping
  const contractMetaMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getContractMeta>>();
    contracts.forEach(c => {
      map.set(c.contract_id, getContractMeta(c, properties, isAr));
    });
    return map;
  }, [contracts, properties, isAr]);

  // Available unique projects for dropdown
  const availableProjects = useMemo(() => {
    const set = new Set<string>();
    const list: Array<{ id: string; name: string }> = [];

    // First from properties
    properties.forEach(p => {
      const name = isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar);
      if (name && !set.has(name)) {
        set.add(name);
        list.push({ id: p.id, name });
      }
    });

    // Then from contracts meta
    contractMetaMap.forEach((meta) => {
      if (meta.project && !set.has(meta.project)) {
        set.add(meta.project);
        list.push({ id: meta.project, name: meta.project });
      }
    });

    return list;
  }, [properties, contractMetaMap, isAr]);

  // Segmented toolbar tab counts (all 6 modes)
  const statusCounts = useMemo(() => {
    let all = 0;
    let active = 0;
    let overdue = 0;
    let handover = 0;
    let completed = 0;
    let rescissionsCnt = 0;

    contracts.forEach(c => {
      all++;
      if (c.status === 'Rescinded') {
        rescissionsCnt++;
        return;
      }
      const gross = D(c.gross_contract_value || '0');
      const col = D(c.total_cash_collected || '0');
      const isDelivered = c.handover_status === 'Delivered';
      const isReady = gross.gt(0) && col.div(gross).gte(0.7);

      if (isDelivered || isReady) {
        handover++;
      }

      const s = contractStatusMap.get(c.contract_id) || 'active';
      if (s === 'completed') {
        completed++;
      } else if (s === 'overdue') {
        overdue++;
      } else {
        active++;
      }
    });

    return { 
      all, 
      active, 
      overdue, 
      handover, 
      completed, 
      rescissions: rescissionsCnt 
    };
  }, [contracts, contractStatusMap]);

  // Contracts scoped strictly to status filter for dynamic KPIs
  const statusScopedContracts = useMemo(() => {
    if (statusFilter === 'all') {
      return contracts.filter(c => c.status !== 'Rescinded');
    }
    if (statusFilter === 'rescissions') {
      return contracts.filter(c => c.status === 'Rescinded');
    }
    if (statusFilter === 'handover') {
      return contracts.filter(c => {
        if (c.status === 'Rescinded') return false;
        const gross = D(c.gross_contract_value || '0');
        const col = D(c.total_cash_collected || '0');
        return c.handover_status === 'Delivered' || (gross.gt(0) && col.div(gross).gte(0.7));
      });
    }
    return contracts.filter(c => {
      if (c.status === 'Rescinded') return false;
      const s = contractStatusMap.get(c.contract_id) || 'active';
      return s === statusFilter;
    });
  }, [contracts, contractStatusMap, statusFilter]);

  // Dynamic Top 4 KPI Metrics reacting strictly to active status filter
  const activeKPIs = useMemo(() => {
    let grossTotal = D(0);
    let collectedTotal = D(0);
    let remainingTotal = D(0);

    statusScopedContracts.forEach(c => {
      const g = D(c.gross_contract_value || '0');
      const col = D(c.total_cash_collected || '0');
      grossTotal = grossTotal.plus(g);
      collectedTotal = collectedTotal.plus(col);
      const rem = g.minus(col);
      if (rem.gt(0)) {
        remainingTotal = remainingTotal.plus(rem);
      }
    });

    const collectionPct = grossTotal.gt(0)
      ? Math.round(collectedTotal.div(grossTotal).times(100).toNumber())
      : 0;

    let card1Title = isAr ? 'إجمالي قيمة العقود المباعة' : 'Gross Sold Contracts';
    const card1SubtitleLabel = isAr ? 'العقود النشطة' : 'Active deals';
    const card1SubtitleValue = `${statusScopedContracts.length} ${isAr ? 'عقد' : 'deals'}`;

    let card2Title = isAr ? 'إجمالي المحصل من العملاء' : 'Total Cash Collected';
    const card2DeltaLabel = isAr ? 'نسبة التحصيل' : 'collection rate';

    let card3Title = isAr ? 'عدد العقود' : 'Active Contracts';
    let card3AccentColor: 'accent' | 'blue' | 'emerald' | 'amber' | 'rose' = 'blue';
    const card3SubtitleLabel = isAr ? 'إجمالي التعاقدات' : 'Total portfolio';
    const card3SubtitleValue = `${contracts.length} ${isAr ? 'عقد مسجل' : 'contracts'}`;

    let card4Title = isAr ? 'متبقي من الأقساط' : 'Outstanding Receivables';
    let card4SubtitleLabel = isAr ? 'أقساط متأخرة' : 'Overdue tranches';
    let card4SubtitleValue = `${statusCounts.overdue} ${isAr ? 'عقد متأخر' : 'overdue'}`;

    if (statusFilter === 'active') {
      card1Title = isAr ? 'قيمة العقود النشطة المنتظمة' : 'Active Contracts Gross';
      card3Title = isAr ? 'العقود النشطة المنتظمة' : 'Active Regular Contracts';
      card3AccentColor = 'blue';
      card4SubtitleLabel = isAr ? 'أقساط قادمة' : 'Upcoming tranches';
      card4SubtitleValue = `${statusScopedContracts.length} ${isAr ? 'عقد منتظم' : 'active'}`;
    } else if (statusFilter === 'overdue') {
      card1Title = isAr ? 'قيمة العقود المتأخرة' : 'Overdue Contracts Value';
      card3Title = isAr ? 'عدد العقود المتأخرة' : 'Overdue Contracts Count';
      card3AccentColor = 'rose';
      card4Title = isAr ? 'إجمالي الأقساط المتأخرة' : 'Overdue Outstanding';
      card4SubtitleLabel = isAr ? 'إجراءات فورية' : 'Immediate action';
      card4SubtitleValue = isAr ? 'تتطلب متابعة هاتفية' : 'Requires follow-up';
    } else if (statusFilter === 'handover') {
      card1Title = isAr ? 'قيمة وحدات جاهزية التسليم' : 'Handover Units Value';
      card3Title = isAr ? 'جاهزة أو تم تسليمها' : 'Ready or Delivered';
      card3AccentColor = 'emerald';
      card4Title = isAr ? 'متبقي قبل التسليم النهائي' : 'Dues Before Handover';
      card4SubtitleLabel = isAr ? 'محاضر الاستلام' : 'Protocols';
      card4SubtitleValue = isAr ? 'جاهزة للتوثيق' : 'Ready to sign';
    } else if (statusFilter === 'completed') {
      card1Title = isAr ? 'قيمة العقود المسددة بالكامل' : 'Completed Contracts Value';
      card3Title = isAr ? 'عقود مكتملة السداد' : 'Fully Paid Contracts';
      card3AccentColor = 'emerald';
      card4Title = isAr ? 'مستحقات متبقية' : 'Remaining Dues';
      card4SubtitleLabel = isAr ? 'حالة السداد' : 'Payment Status';
      card4SubtitleValue = isAr ? 'سداد كامل 100%' : '100% Fully Settled';
    } else if (statusFilter === 'rescissions') {
      card1Title = isAr ? 'قيمة العقود المفسوخة' : 'Rescinded Contracts Value';
      card2Title = isAr ? 'المبالغ المحتجزة والمسددة' : 'Collected Deposits';
      card3Title = isAr ? 'عدد العقود المفسوخة' : 'Rescinded Count';
      card3AccentColor = 'rose';
      card4Title = isAr ? 'التزامات وتسويات متبقية' : 'Settlement Liabilities';
      card4SubtitleLabel = isAr ? 'حالة المخزون' : 'Inventory State';
      card4SubtitleValue = isAr ? 'معاد طرحها للبيع' : 'Relisted in Stock';
    }

    return {
      totalGross: grossTotal.toFixed(2),
      totalCollected: collectedTotal.toFixed(2),
      totalRemaining: remainingTotal.toFixed(2),
      collectionPct,
      count: statusScopedContracts.length,
      card1Title,
      card1SubtitleLabel,
      card1SubtitleValue,
      card2Title,
      card2DeltaLabel,
      card3Title,
      card3AccentColor,
      card3SubtitleLabel,
      card3SubtitleValue,
      card4Title,
      card4SubtitleLabel,
      card4SubtitleValue,
    };
  }, [statusScopedContracts, statusFilter, contracts.length, statusCounts.overdue, isAr]);

  // Sales breakdown by property & unit type for Donut Widget
  const unitTypesBreakdown = useMemo(() => {
    return calculateUnitTypesBreakdown(contracts, properties, isAr);
  }, [contracts, properties, isAr]);

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      // 1. Status Filter
      if (statusFilter === 'rescissions') {
        if (c.status !== 'Rescinded') return false;
      } else if (statusFilter === 'handover') {
        if (c.status === 'Rescinded') return false;
        const gross = D(c.gross_contract_value || '0');
        const col = D(c.total_cash_collected || '0');
        const isDelivered = c.handover_status === 'Delivered';
        const isReady = gross.gt(0) && col.div(gross).gte(0.7);
        if (!isDelivered && !isReady) return false;
      } else {
        if (c.status === 'Rescinded') return false;
        const pStatus = contractStatusMap.get(c.contract_id) || 'active';
        if (statusFilter !== 'all' && pStatus !== statusFilter) {
          return false;
        }
      }

      // 2. Project Filter
      if (projectFilter !== 'all') {
        const meta = contractMetaMap.get(c.contract_id);
        const matchesProp = c.property_id === projectFilter;
        const matchesName = meta?.project === projectFilter;
        if (!matchesProp && !matchesName) return false;
      }

      // 3. Live Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = (c.contract_number || '').toLowerCase();
        const buyerRaw = (c.buyer_name || '').toLowerCase();
        const buyerLoc = localizeBuyerName(c.buyer_name || '').toLowerCase();
        const unit = (c.unit_id || '').toLowerCase();
        const meta = contractMetaMap.get(c.contract_id);
        const proj = (meta?.project || '').toLowerCase();
        const typeStr = (meta?.unitTypeLabel || '').toLowerCase();

        return (
          num.includes(q) ||
          buyerRaw.includes(q) ||
          buyerLoc.includes(q) ||
          unit.includes(q) ||
          proj.includes(q) ||
          typeStr.includes(q)
        );
      }

      return true;
    });
  }, [contracts, contractStatusMap, contractMetaMap, statusFilter, projectFilter, searchQuery]);

  // Sorted contracts
  const sortedContracts = useMemo(() => {
    const list = [...filteredContracts];
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return (b.contract_date || '').localeCompare(a.contract_date || '');
      if (sortBy === 'date_asc') return (a.contract_date || '').localeCompare(b.contract_date || '');
      if (sortBy === 'gross_desc') return D(b.gross_contract_value || '0').minus(D(a.gross_contract_value || '0')).toNumber();
      if (sortBy === 'gross_asc') return D(a.gross_contract_value || '0').minus(D(b.gross_contract_value || '0')).toNumber();
      if (sortBy === 'collected_desc') return D(b.total_cash_collected || '0').minus(D(a.total_cash_collected || '0')).toNumber();
      if (sortBy === 'remaining_desc') {
        const remA = D(a.gross_contract_value || '0').minus(D(a.total_cash_collected || '0'));
        const remB = D(b.gross_contract_value || '0').minus(D(b.total_cash_collected || '0'));
        return remB.minus(remA).toNumber();
      }
      if (sortBy === 'buyer_asc') {
        const nameA = isAr ? localizeBuyerName(a.buyer_name || '') : (a.buyer_name || '');
        const nameB = isAr ? localizeBuyerName(b.buyer_name || '') : (b.buyer_name || '');
        return nameA.localeCompare(nameB, isAr ? 'ar' : 'en');
      }
      return 0;
    });
    return list;
  }, [filteredContracts, sortBy, isAr]);

  // Pagination
  const totalPages = Math.ceil(sortedContracts.length / pageSize) || 1;
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedContracts.slice(start, start + pageSize);
  }, [sortedContracts, currentPage, pageSize]);

  // Reset all filters
  const handleResetFilters = () => {
    setStatusFilter('all');
    setProjectFilter('all');
    setSearchQuery('');
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  // Helper: Status Pill renderer
  const renderStatusPill = (status: ContractPaymentStatus, contract?: ERPContract) => {
    if (contract?.status === 'Rescinded') {
      return (
        <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}>
          {isAr ? 'مفسوخ' : 'Rescinded'}
        </span>
      );
    }
    if (contract?.handover_status === 'Delivered') {
      return (
        <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
          {isAr ? 'تم التسليم' : 'Delivered'}
        </span>
      );
    }
    const gross = D(contract?.gross_contract_value || '0');
    const col = D(contract?.total_cash_collected || '0');
    const isReady = gross.gt(0) && col.div(gross).gte(0.7);
    if (isReady && status !== 'completed') {
      return (
        <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`}>
          {isAr ? 'جاهز للتسليم' : 'Ready'}
        </span>
      );
    }
    switch (status) {
      case 'completed':
        return (
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
            {isAr ? 'مكتمل' : 'Completed'}
          </span>
        );
      case 'overdue':
        return (
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillRed}`}>
            {isAr ? 'متأخر' : 'Overdue'}
          </span>
        );
      case 'active':
      default:
        return (
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
            {isAr ? 'نشط' : 'Active'}
          </span>
        );
    }
  };

  // Donut Chart Config (only positive active values so slices match legend 1-to-1)
  const activeBreakdownItems = useMemo(() => {
    return unitTypesBreakdown.filter(u => u.count > 0);
  }, [unitTypesBreakdown]);

  const donutSeries = useMemo(() => {
    const activeValues = activeBreakdownItems.map(u => u.count);
    return activeValues.length > 0 ? activeValues : [1];
  }, [activeBreakdownItems]);

  const donutOptions: ApexCharts.ApexOptions = useMemo(() => {
    const hasData = activeBreakdownItems.length > 0;
    return {
      chart: {
        type: 'donut',
        fontFamily: "'ThmanyahSans', 'Cairo', 'Plus Jakarta Sans', sans-serif",
        toolbar: { show: false },
        animations: { enabled: false }
      },
      labels: hasData ? activeBreakdownItems.map(u => u.label) : [isAr ? 'لا توجد مبيعات' : 'No sales'],
      colors: hasData ? activeBreakdownItems.map(u => u.color) : ['#e2e8f0'],
      dataLabels: { enabled: false },
      legend: { show: false },
      stroke: { width: 2, colors: ['#ffffff'] },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '11px',
                color: '#64748b',
                offsetY: 14
              },
              value: {
                show: true,
                fontSize: '18px',
                fontWeight: 800,
                color: '#0f172a',
                offsetY: -10,
                formatter: () => `${statusCounts.all}`
              },
              total: {
                show: true,
                label: isAr ? 'عقد' : 'Deals',
                fontSize: '11px',
                color: '#64748b',
                formatter: () => `${statusCounts.all}`
              }
            }
          }
        }
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val: number) => `${val} ${isAr ? 'عقد' : 'deals'}`
        }
      }
    };
  }, [activeBreakdownItems, statusCounts.all, isAr]);

  return (
    <div className={css.container}>
      {/* ─── 1. TOP HEADER ─── */}
      <ZFPageHeader
        title={isAr ? 'عقود البيع' : 'Sales contracts'}
        subtitle={isAr ? 'كل عقود البيع، الأقساط المستحقة، وموقف تحصيل كل عميل.' : "All sales contracts, installments due, and each client's collection status."}
      />

      {/* ─── 2. 4 DISCRETE FLOATING KPI STAT CARDS (100% FULL WIDTH) ─── */}
      <div className={css.kpiGrid}>
        {/* Stat 1: Gross Sales */}
        <ZFKpiCard
          title={activeKPIs.card1Title}
          value={formatCompactNumber(activeKPIs.totalGross)}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<TrendingUp size={16} />}
          accentColor="accent"
          subtitleLabel={activeKPIs.card1SubtitleLabel}
          subtitleValue={activeKPIs.card1SubtitleValue}
        />

        {/* Stat 2: Collected Cash */}
        <ZFKpiCard
          title={activeKPIs.card2Title}
          value={formatCompactNumber(activeKPIs.totalCollected)}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Wallet size={16} />}
          accentColor="emerald"
          delta={{
            value: `+${activeKPIs.collectionPct}%`,
            isPositive: true,
            label: activeKPIs.card2DeltaLabel
          }}
          subtitleLabel={isAr ? 'نسبة التحصيل' : 'Collection rate'}
          subtitleValue={`${activeKPIs.collectionPct}% ${isAr ? 'محصل' : 'collected'}`}
        />

        {/* Stat 3: Contracts Count */}
        <ZFKpiCard
          title={activeKPIs.card3Title}
          value={`${activeKPIs.count}`}
          unitLabel={isAr ? 'عقد' : 'deals'}
          icon={<CheckCircle2 size={16} />}
          accentColor={activeKPIs.card3AccentColor}
          subtitleLabel={activeKPIs.card3SubtitleLabel}
          subtitleValue={activeKPIs.card3SubtitleValue}
        />

        {/* Stat 4: Remaining Receivables */}
        <ZFKpiCard
          title={activeKPIs.card4Title}
          value={formatCompactNumber(activeKPIs.totalRemaining)}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Clock size={16} />}
          accentColor="amber"
          subtitleLabel={activeKPIs.card4SubtitleLabel}
          subtitleValue={activeKPIs.card4SubtitleValue}
        />
      </div>

      {/* ─── 3. COLLAPSIBLE SALES BREAKDOWN DONUT BANNER ─── */}
      {showDonutSection && (
        <div className={css.donutBannerCard}>
          <div className={css.donutBannerHeader}>
            <div className={css.donutBannerTitleGroup}>
              <PieChart size={16} className={css.donutBannerIcon} />
              <h3 className={css.donutBannerTitle}>
                {isAr ? 'توزيع المبيعات حسب نوع العقار والوحدات' : 'Sales Distribution by Property & Unit Type'}
              </h3>
            </div>
            <button
              type="button"
              className={css.donutBannerCloseBtn}
              onClick={() => setShowDonutSection(false)}
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={14} />
            </button>
          </div>

          <div className={css.donutBannerBody}>
            <div className={css.donutBannerChart}>
              <ERPApexChart
                type="donut"
                series={donutSeries}
                options={donutOptions}
                height={160}
                width={160}
                isAr={isAr}
              />
            </div>

            <div className={css.donutBannerLegendGrid}>
              {activeBreakdownItems.map(item => (
                <div key={item.key} className={css.donutLegendCard}>
                  <div className={css.donutLegendCardHeader}>
                    <span className={css.donutLegendDot} style={{ background: item.color }} />
                    <span className={css.donutLegendCardLabel}>{item.label}</span>
                  </div>
                  <div className={css.donutLegendCardValues}>
                    <span className={css.donutLegendCardCount}>
                      {item.count} <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{isAr ? 'عقد' : 'deals'}</span>
                    </span>
                    <span className={css.donutLegendCardPct}>{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. FILTER & SEARCH TOOLBAR ─── */}
      <div className={css.toolbarCard}>
        <div className={css.toolbarLeading}>
          {onOpenNewContract && (
            <button
              type="button"
              className={css.btnNewContract}
              onClick={onOpenNewContract}
            >
              <Plus size={14} />
              <span>{isAr ? 'عقد جديد' : 'New Contract'}</span>
            </button>
          )}

          <button
            type="button"
            className={`${css.donutToggleBtn} ${showDonutSection ? css.donutToggleBtnActive : ''}`}
            onClick={() => setShowDonutSection(prev => !prev)}
            title={isAr ? 'توزيع المبيعات حسب نوع العقار' : 'Toggle Sales Breakdown'}
          >
            <PieChart size={14} />
            <span>{isAr ? 'توزيع المبيعات' : 'Sales Distribution'}</span>
          </button>

          <select
            className={css.projectSelect}
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label={isAr ? 'فلترة حسب المشروع' : 'Filter by project'}
          >
            <option value="all">{isAr ? 'كل المشاريع' : 'All Projects'}</option>
            {availableProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className={css.searchBox}>
            <Search size={14} className={css.searchIcon} />
            <input
              type="text"
              className={css.searchInput}
              placeholder={isAr ? 'ابحث باسم العميل أو رقم العقد أو رقم الوحدة...' : 'Search buyer, contract #, unit...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className={css.searchClearBtn}
                title={isAr ? 'مسح البحث' : 'Clear search'}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className={css.toolbarTrailing}>
          {/* Segmented Status Pill Tabs (6 Options) */}
          <div className={css.statusTabsSegmented} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              className={`${css.statusTab} ${statusFilter === 'all' ? css.statusTabActive : ''}`}
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
            >
              <span>{isAr ? 'الكل' : 'All'}</span>
              <span className={css.statusTabCount}>{statusCounts.all}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'active'}
              className={`${css.statusTab} ${statusFilter === 'active' ? css.statusTabActive : ''}`}
              onClick={() => {
                setStatusFilter('active');
                setCurrentPage(1);
              }}
            >
              <span>{isAr ? 'نشط' : 'Active'}</span>
              <span className={css.statusTabCount}>{statusCounts.active}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'overdue'}
              className={`${css.statusTab} ${statusFilter === 'overdue' ? css.statusTabActive : ''}`}
              onClick={() => {
                setStatusFilter('overdue');
                setCurrentPage(1);
              }}
            >
              <span>{isAr ? 'متأخر' : 'Overdue'}</span>
              <span className={`${css.statusTabCount} ${statusCounts.overdue > 0 ? css.statusTabCountRed : ''}`}>
                {statusCounts.overdue}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'handover'}
              className={`${css.statusTab} ${statusFilter === 'handover' ? css.statusTabActive : ''}`}
              onClick={() => {
                setStatusFilter('handover');
                setCurrentPage(1);
              }}
            >
              <span>{isAr ? 'جاهز للتسليم' : 'Handover'}</span>
              <span className={css.statusTabCount}>{statusCounts.handover}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'completed'}
              className={`${css.statusTab} ${statusFilter === 'completed' ? css.statusTabActive : ''}`}
              onClick={() => {
                setStatusFilter('completed');
                setCurrentPage(1);
              }}
            >
              <span>{isAr ? 'مكتمل' : 'Completed'}</span>
              <span className={css.statusTabCount}>{statusCounts.completed}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'rescissions'}
              className={`${css.statusTab} ${statusFilter === 'rescissions' ? css.statusTabActive : ''}`}
              onClick={() => {
                setStatusFilter('rescissions');
                setCurrentPage(1);
              }}
            >
              <span>{isAr ? 'فسخ وتسويات' : 'Rescissions'}</span>
              <span className={`${css.statusTabCount} ${statusCounts.rescissions > 0 ? css.statusTabCountRed : ''}`}>
                {statusCounts.rescissions}
              </span>
            </button>
          </div>

          <button
            type="button"
            className={css.filterIconBtn}
            onClick={handleResetFilters}
            title={isAr ? 'إعادة تعيين الفلاتر' : 'Reset filters'}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* ─── 5. CANONICAL 10-COLUMN DATA TABLE (100% FULL WIDTH) ─── */}
      <div className={css.tableCard}>
        <div className={css.tableHeader}>
          <div className={css.tableHeaderTitleGroup}>
            <h2 className={css.tableTitle}>
              {statusFilter === 'handover'
                ? (isAr ? 'عقود جاهزية التسليم والمعاينة' : 'Handover & Inspection Registry')
                : statusFilter === 'rescissions'
                ? (isAr ? 'عقود الفسخ والتسويات القانونية' : 'Rescissions & Settlements')
                : (isAr ? 'عقود البيع والعملاء' : 'Sales Contracts')}
            </h2>
            <span className={css.tableCountBadge}>
              {isAr ? `${filteredContracts.length} عقد` : `${filteredContracts.length} contracts`}
            </span>
          </div>

          <div className={css.tableControls}>
            <select
              className={css.pageSizeSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ContractsSort)}
              aria-label={isAr ? 'ترتيب السجلات' : 'Sort contracts'}
            >
              <option value="date_desc">{isAr ? 'التاريخ: الأحدث' : 'Date: Newest'}</option>
              <option value="date_asc">{isAr ? 'التاريخ: الأقدم' : 'Date: Oldest'}</option>
              <option value="gross_desc">{isAr ? 'قيمة العقد: الأعلى' : 'Gross: Highest'}</option>
              <option value="gross_asc">{isAr ? 'قيمة العقد: الأقل' : 'Gross: Lowest'}</option>
              <option value="collected_desc">{isAr ? 'المحصل: الأعلى' : 'Collected: Highest'}</option>
              <option value="remaining_desc">{isAr ? 'المتبقي: الأعلى' : 'Remaining: Highest'}</option>
              <option value="buyer_asc">{isAr ? 'اسم العميل: أ - ي' : 'Buyer: A - Z'}</option>
            </select>
          </div>
        </div>

        {sortedContracts.length === 0 ? (
          <div className={css.emptyStateCard}>
            <FileText size={36} color="#94a3b8" style={{ margin: '0 auto' }} />
            <div className={css.emptyTitle}>
              {isAr ? 'لا توجد عقود مطابقة للبحث أو التصفية' : 'No matching contracts found'}
            </div>
            <div className={css.emptySubtitle}>
              {isAr 
                ? 'جرّب تغيير حالة السداد، المشروع، أو مسح خانة البحث.' 
                : 'Try changing the status tab, project selector, or clearing the search query.'}
            </div>
            {(statusFilter !== 'all' || projectFilter !== 'all' || searchQuery.trim()) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className={css.emptyResetBtn}
              >
                <RotateCcw size={13} />
                <span>{isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className={shellStyles.tableContainer}>
            <table className={css.contractsTable}>
              <thead>
                <tr>
                  <th className={css.contractsTh} style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th className={css.contractsTh}>{isAr ? 'رقم العقد' : 'Contract #'}</th>
                  <th className={css.contractsTh}>{isAr ? 'العميل' : 'Client'}</th>
                  <th className={css.contractsTh}>{isAr ? 'المشروع' : 'Project'}</th>
                  <th className={css.contractsTh}>{isAr ? 'نوع الوحدة' : 'Unit Type'}</th>
                  <th className={css.contractsTh} style={{ textAlign: 'center' }}>
                    {isAr ? 'المساحة (م²)' : 'Area (m²)'}
                  </th>
                  <th className={css.contractsTh}>{isAr ? 'قيمة العقد' : 'Gross Value'}</th>
                  <th className={css.contractsTh}>{isAr ? 'المدفوع' : 'Collected'}</th>
                  <th className={css.contractsTh}>{isAr ? 'المتبقي' : 'Remaining'}</th>
                  <th className={css.contractsTh} style={{ textAlign: 'center' }}>
                    {isAr ? 'حالة السداد' : 'Payment Status'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedContracts.map((c, idx) => {
                  const status = contractStatusMap.get(c.contract_id) || 'active';
                  const meta = contractMetaMap.get(c.contract_id) || getContractMeta(c, properties, isAr);
                  const gross = D(c.gross_contract_value || '0');
                  const collected = D(c.total_cash_collected || '0');
                  const remaining = gross.minus(collected).isNegative() ? D(0) : gross.minus(collected);
                  const serialNum = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={c.contract_id}
                      className={shellStyles.canonicalRow}
                      onClick={() => handleOpenInspection(c, 'details')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleOpenInspection(c, 'details');
                        }
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      <td className={css.contractsTd} style={{ textAlign: 'center', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {serialNum}
                      </td>
                      <td className={css.contractsTd}>
                        <span dir="ltr" className={css.contractNumberBadge}>
                          #{c.contract_number}
                        </span>
                      </td>
                      <td className={css.contractsTd} style={{ fontWeight: 700, color: '#0f172a' }}>
                        {localizeBuyerName(c.buyer_name)}
                      </td>
                      <td className={css.contractsTd} style={{ color: '#475569' }}>
                        {meta.project}
                      </td>
                      <td className={css.contractsTd} style={{ color: '#64748b' }}>
                        {meta.unitTypeLabel}
                      </td>
                      <td className={css.contractsTd} style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#334155' }}>
                        {meta.area} {isAr ? 'م²' : 'm²'}
                      </td>
                      <td className={css.contractsTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 750, color: '#0f172a' }}>
                        {formatCompactNumber(c.gross_contract_value)}{' '}
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>{isAr ? 'ج.م' : 'EGP'}</span>
                      </td>
                      <td className={css.contractsTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 750, color: '#16a34a' }}>
                        {formatCompactNumber(c.total_cash_collected)}{' '}
                        <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>{isAr ? 'ج.م' : 'EGP'}</span>
                      </td>
                      <td className={css.contractsTd} style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 750, color: status === 'completed' ? '#16a34a' : '#0f172a' }}>
                        {formatCompactNumber(remaining)}{' '}
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>{isAr ? 'ج.م' : 'EGP'}</span>
                      </td>
                      <td className={css.contractsTd} style={{ textAlign: 'center' }}>
                        {renderStatusPill(status, c)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer with Numeric Pagination */}
        {sortedContracts.length > 0 && (
          <div className={css.tableFooter}>
            <div className={css.footerLeading}>
              {isAr 
                ? `عرض ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, sortedContracts.length)} من أصل ${sortedContracts.length} عقد`
                : `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, sortedContracts.length)} of ${sortedContracts.length} contracts`}
            </div>

            <div className={css.footerTrailing}>
              <select
                className={css.pageSizeSelect}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label={isAr ? 'عدد السجلات بالصفحة' : 'Rows per page'}
              >
                <option value={10}>10 / {isAr ? 'صفحة' : 'page'}</option>
                <option value={25}>25 / {isAr ? 'صفحة' : 'page'}</option>
                <option value={50}>50 / {isAr ? 'صفحة' : 'page'}</option>
              </select>

              <div className={shellStyles.canonicalPaginationGroup}>
                <button
                  type="button"
                  className={shellStyles.canonicalPaginationBtn}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  title={isAr ? 'الصفحة السابقة' : 'Previous Page'}
                >
                  {isAr ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  if (
                    p === 1 || 
                    p === totalPages || 
                    (p >= currentPage - 1 && p <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={p}
                        type="button"
                        className={`${shellStyles.canonicalPaginationBtn} ${p === currentPage ? shellStyles.canonicalPaginationBtnActive : ''}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    );
                  } else if (p === currentPage - 2 || p === currentPage + 2) {
                    return <span key={p} style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>;
                  }
                  return null;
                })}

                <button
                  type="button"
                  className={shellStyles.canonicalPaginationBtn}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  title={isAr ? 'الصفحة التالية' : 'Next Page'}
                >
                  {isAr ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 6. DEDICATED CONTRACT INSPECTION MODAL (MATCHING REFERENCE DESIGN) ─── */}
      <ZFContractInspectionModal
        isOpen={isModalOpen && !!activeInspectingContract}
        onClose={handleCloseModal}
        contract={activeInspectingContract}
        schedules={schedules}
        properties={properties}
        isAr={isAr}
        initialTab={modalTab}
        onOpenCollectionModal={onOpenCollectionModal}
        onOpenHandoverModal={onOpenHandoverModal}
      />
    </div>
  );
};

export default ContractsRegistryView;
