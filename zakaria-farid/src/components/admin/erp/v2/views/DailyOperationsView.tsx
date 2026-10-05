'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Landmark,
  Layers,
  BookOpen,
  Download,
  Zap,
  Coins,
  Users,
  HardHat,
  Receipt,
  HandCoins,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowLeftRight,
  X,
  CalendarClock
} from 'lucide-react';
import type {
  ERPContract,
  ERPPDCRecord,
  ERPInstallmentSchedule,
  ERPAccountingPeriod,
  ERPJournalEntry,
  ERPPropertyCostItem,
  ERPPropertyCostAdjustment,
  ERPPayableInstallment
} from '@/lib/erp/types';
import type { Property, BuildingUnitItem } from '@/lib/supabase/types';
import type { PartnerFinancialSummary } from '@/lib/erp/partnersEngine';
import {
  buildTreasuryMovements,
  summarizeTreasury,
  getTreasuryPeriodRange,
  isInTreasuryPeriod,
  toLocalDateStr,
  buildUpcomingDues,
  CASH_MOVEMENT_KIND_LABELS,
  CASH_ACCOUNT_LABELS,
  TREASURY_PERIOD_LABELS,
  type TreasuryMovement,
  type TreasuryPeriod,
  type CashMovementKind,
  type CashAccountCode,
  type UpcomingDue
} from '@/lib/erp/treasuryLedger';
import {
  formatNumberWithCommas,
  formatEGPInteger,
  formatTime12h,
  computeUpcomingDues,
  buildTransactionInspectionPayload,
  type CashMovementTransaction,
  type UpcomingDueItem,
  type UpcomingDuesSummary
} from '@/lib/erp/operationsStreamFilters';
import ops from './DailyOperationsView.module.css';
import shellStyles from '../ZFWorkstationShell.module.css';
import { ZFKpiCard } from '../ZFKpiCard';
import { ZFWorkstationSideWidgets } from '../common/ZFWorkstationSideWidgets';
import { ZFSearchBar } from '../common/ZFSearchBar';
import { ZFPagination } from '../ZFPagination';
import { CostAdjustmentModal } from '../modals/CostAdjustmentModal';
import { CostPayableSettlementModal } from '../modals/CostPayableSettlementModal';
import { EditPropertyCostModal } from '../modals/EditPropertyCostModal';
import { ZFDirectExpenseModal } from '../modals/ZFDirectExpenseModal';
import { D } from '@/lib/erp/math';
import { toast } from 'sonner';
import { calculateCostItemEffectiveTotals } from '@/lib/erp/propertyCostEngine';

export type { CashMovementTransaction, UpcomingDueItem, UpcomingDuesSummary };
export { formatNumberWithCommas, formatEGPInteger, formatTime12h, computeUpcomingDues, buildTransactionInspectionPayload };

export interface DailyOperationsViewProps {
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
  onOpenNewCheque?: () => void;
  onCollectItem: (item: ERPPDCRecord) => void;
  onInspectContract: (contract: ERPContract) => void;
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
  onOpenPartnerPayout?: () => void;
  onOpenPartnerInjection?: () => void;
  onOpenCashTransfer?: () => void;
  onExportExcel?: () => void;
  onNavigateToTab: (tab: any) => void;
}

const fmt = (v: Parameters<typeof formatNumberWithCommas>[0]) => formatNumberWithCommas(v);
const displayDate = (s: string) => s.split('-').reverse().join('/');

export const DailyOperationsView: React.FC<DailyOperationsViewProps> = ({
  isAr = true,
  properties = [],
  contracts = [],
  pdcRecords = [],
  schedules = [],
  journalEntries = [],
  activePeriod,
  periods,
  propertyCosts = [],
  isMutating = false,
  onOpenProjectExpense,
  onCollectItem,
  onInspectTransaction,
  onOpenCashReceipt,
  onUpdatePropertyCostItem,
  onAddCostAdjustment,
  onRecordPayablePayment,
  onSaveExpenseEntry,
  onOpenPartnerPayout,
  onOpenPartnerInjection,
  onOpenCashTransfer,
  onExportExcel,
  onNavigateToTab
}) => {
  const [period, setPeriod] = useState<TreasuryPeriod>('today');
  const [direction, setDirection] = useState<'all' | 'IN' | 'OUT' | 'TRANSFER'>('all');
  const [kindFilter, setKindFilter] = useState<CashMovementKind | null>(null);
  const [accountFilter, setAccountFilter] = useState<'all' | CashAccountCode>('all');
  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDesc, setSortDesc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [selectedCostForEdit, setSelectedCostForEdit] = useState<ERPPropertyCostItem | null>(null);
  const [selectedCostForAdjustment, setSelectedCostForAdjustment] = useState<ERPPropertyCostItem | null>(null);
  const [selectedCostForPayable, setSelectedCostForPayable] = useState<ERPPropertyCostItem | null>(null);
  const [selectedInstallmentForPayable, setSelectedInstallmentForPayable] = useState<ERPPayableInstallment | null>(null);
  const [isPayablePickerOpen, setIsPayablePickerOpen] = useState<boolean>(false);

  const ledgerRef = useRef<HTMLDivElement>(null);

  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);
  const movements = useMemo(() => buildTreasuryMovements(journalEntries, contracts, isAr), [journalEntries, contracts, isAr]);
  const allSummary = useMemo(() => summarizeTreasury(movements, 'all', todayStr), [movements, todayStr]);
  const summary = useMemo(() => summarizeTreasury(movements, period, todayStr), [movements, period, todayStr]);
  const range = useMemo(() => getTreasuryPeriodRange(period, todayStr), [period, todayStr]);
  const periodMovements = useMemo(() => movements.filter(m => isInTreasuryPeriod(m, range)), [movements, range]);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodMovements.filter(m => {
      if (kindFilter !== null && m.kind !== kindFilter) return false;
      if (accountFilter !== 'all') {
        const matchesAccount = m.account === accountFilter || m.fromAccount === accountFilter;
        if (!matchesAccount) return false;
      }
      if (q) {
        const descMatch = m.description.toLowerCase().includes(q);
        const origMatch = m.originalDescription.toLowerCase().includes(q);
        const partyMatch = m.counterparty.toLowerCase().includes(q);
        const entryMatch = m.entryNumber.toLowerCase().includes(q);
        const contractMatch = m.contract?.contract_number?.toLowerCase().includes(q) ?? false;
        if (!descMatch && !origMatch && !partyMatch && !entryMatch && !contractMatch) {
          return false;
        }
      }
      return true;
    });
  }, [periodMovements, kindFilter, accountFilter, search]);

  const directionCounts = useMemo(() => ({
    all: baseFiltered.length,
    IN: baseFiltered.filter(m => m.direction === 'IN').length,
    OUT: baseFiltered.filter(m => m.direction === 'OUT').length,
    TRANSFER: baseFiltered.filter(m => m.direction === 'TRANSFER').length
  }), [baseFiltered]);

  const filtered = useMemo(() => {
    return direction === 'all' ? baseFiltered : baseFiltered.filter(m => m.direction === direction);
  }, [baseFiltered, direction]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = a.timestamp - b.timestamp;
      } else {
        cmp = a.amount.minus(b.amount).toNumber();
      }
      if (cmp !== 0) {
        return sortDesc ? -cmp : cmp;
      }
      return a.id.localeCompare(b.id);
    });
  }, [filtered, sortField, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    return sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [sorted, safePage, pageSize]);

  const dues = useMemo(() => buildUpcomingDues({ schedules, contracts, propertyCosts, todayStr, isAr }), [schedules, contracts, propertyCosts, todayStr, isAr]);

  const handleDueClick = (d: UpcomingDue) => {
    if (d.direction === 'IN' && d.schedule && d.contract) {
      onCollectItem({
        cheque_id: `SCH-${d.schedule.schedule_id}`,
        contract_id: d.contract.contract_id,
        schedule_id: d.schedule.schedule_id,
        cheque_number: '',
        bank_name: '',
        drawer_name: d.contract.buyer_name,
        nominal_value: d.amount.toFixed(2),
        due_date: d.dueDate,
        status: 'In Safe',
      } as ERPPDCRecord);
      return;
    }
    if (d.direction === 'OUT' && d.cost && d.installment) {
      if (onRecordPayablePayment) { setSelectedCostForPayable(d.cost); setSelectedInstallmentForPayable(d.installment); }
      else if (onUpdatePropertyCostItem) { setSelectedCostForEdit(d.cost); }
    }
  };

  const periodLabel = TREASURY_PERIOD_LABELS[period][isAr ? 'ar' : 'en'];
  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${todayStr}T00:00:00`));
  }, [isAr, todayStr]);

  const safeRow = summary.accounts[0];
  const bankRow = summary.accounts[1];
  const totalRow = summary.accounts[2];

  const safeNow = allSummary.accounts[0].closing;
  const bankNow = allSummary.accounts[1].closing;
  const hasNegative = safeNow.lt(0) || bankNow.lt(0);

  const cur = isAr ? 'ج.م' : 'EGP';
  const lang = isAr ? 'ar' : 'en';

  const directionPillClass = (d: string) =>
    d === 'IN'
      ? `${shellStyles.statusPill} ${shellStyles.statusPillGreen}`
      : d === 'OUT'
      ? `${shellStyles.statusPill} ${shellStyles.statusPillRed}`
      : `${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`;

  const amountClass = (d: string) =>
    d === 'IN' ? ops.amountIn : d === 'OUT' ? ops.amountOut : ops.amountNeutral;

  const signedText = (m: TreasuryMovement) =>
    m.direction === 'IN'
      ? `+${fmt(m.amount)}`
      : m.direction === 'OUT'
      ? `-${fmt(m.amount)}`
      : fmt(m.amount);

  const accountText = (m: TreasuryMovement) => {
    const A = (code?: CashAccountCode) => (code ? CASH_ACCOUNT_LABELS[code][lang] : '');
    if (m.direction === 'TRANSFER' && m.fromAccount) {
      return isAr ? `من ${A(m.fromAccount)} إلى ${A(m.account)}` : `${A(m.fromAccount)} → ${A(m.account)}`;
    }
    return A(m.account);
  };

  const resetPage = () => setPage(1);
  const scrollToLedger = () => ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const focusDirection = (d: 'IN' | 'OUT') => {
    setDirection(d);
    setKindFilter(null);
    resetPage();
    scrollToLedger();
  };

  const toggleKind = (k: CashMovementKind) => {
    setKindFilter(prev => (prev === k ? null : k));
    setDirection('all');
    resetPage();
    scrollToLedger();
  };

  const clearFilters = () => {
    setKindFilter(null);
    setAccountFilter('all');
    setSearch('');
    setDirection('all');
    resetPage();
  };

  const toggleSort = (f: 'date' | 'amount') => {
    if (f === sortField) {
      setSortDesc(v => !v);
    } else {
      setSortField(f);
      setSortDesc(true);
    }
    resetPage();
  };

  const inspect = (m: TreasuryMovement) => {
    onInspectTransaction?.({
      type: 'journal',
      entry: m.entry,
      journalEntry: m.entry,
      amount: m.amount.toFixed(2),
      title: m.description,
      party: m.counterparty
    });
  };

  const handleQuickAction = (key: 'cash_receipt' | 'partner_injection' | 'pay_contractor' | 'record_expense' | 'partner_payout' | 'transfer') => {
    switch (key) {
      case 'cash_receipt': {
        if (onOpenCashReceipt) onOpenCashReceipt();
        break;
      }
      case 'partner_injection': {
        if (onOpenPartnerInjection) onOpenPartnerInjection();
        break;
      }
      case 'pay_contractor': {
        const open = (propertyCosts || []).filter(
          c => c.linked_account_code === '201000' && D(calculateCostItemEffectiveTotals(c).remainingAmount).gt(0)
        );
        if (open.length === 0) {
          toast.info(isAr ? 'لا توجد مستحقات مقاولين مفتوحة للسداد' : 'No open contractor payables');
          return;
        }
        setIsPayablePickerOpen(true);
        break;
      }
      case 'record_expense': {
        setIsExpenseModalOpen(true);
        break;
      }
      case 'partner_payout': {
        if (onOpenPartnerPayout) onOpenPartnerPayout();
        break;
      }
      case 'transfer': {
        if (onOpenCashTransfer) onOpenCashTransfer();
        break;
      }
    }
  };

  const renderAction = (
    key: 'cash_receipt' | 'partner_injection' | 'pay_contractor' | 'record_expense' | 'partner_payout' | 'transfer',
    icon: React.ReactNode,
    title: string,
    sub: string
  ) => (
    <button
      type="button"
      className={ops.actionBtn}
      disabled={isMutating}
      onClick={() => handleQuickAction(key)}
    >
      <span className={ops.iconSquircle}>{icon}</span>
      <span className={ops.actionTexts}>
        <span className={ops.actionTitle}>{title}</span>
        <span className={ops.actionSub}>{sub}</span>
      </span>
      {isAr ? <ChevronLeft size={14} className={ops.actionArrow} /> : <ChevronRight size={14} className={ops.actionArrow} />}
    </button>
  );

  const sortIcon = (f: 'date' | 'amount') => {
    if (sortField !== f) return <ArrowUpDown size={12} />;
    return sortDesc ? <ArrowDown size={12} /> : <ArrowUp size={12} />;
  };

  return (
    <div className={ops.page} dir={isAr ? 'rtl' : 'ltr'}>
      <header className={ops.header}>
        <div className={ops.headerTitles}>
          <h1 className={ops.title}>{isAr ? 'الخزينة والعمليات اليومية' : 'Treasury & Daily Operations'}</h1>
          <p className={ops.subtitle}>
            {dateLabel} · {isAr ? `${summary.count} حركة — ${periodLabel}` : `${summary.count} movements — ${periodLabel}`}
          </p>
        </div>
        <div className={ops.headerControls}>
          <div className={ops.periodTabs} role="tablist" aria-label={isAr ? 'الفترة' : 'Period'}>
            {(['today', '7d', 'month', 'all'] as TreasuryPeriod[]).map(p => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={period === p}
                className={`${ops.periodTab} ${period === p ? ops.periodTabActive : ''}`}
                onClick={() => { setPeriod(p); resetPage(); }}
              >
                {TREASURY_PERIOD_LABELS[p][lang]}
              </button>
            ))}
          </div>
          {onExportExcel && (
            <button type="button" className={ops.ghostBtn} onClick={onExportExcel}>
              <Download size={14} />
              {isAr ? 'تصدير Excel' : 'Export Excel'}
            </button>
          )}
        </div>
      </header>

      <section className={ops.kpiGrid}>
        <ZFKpiCard
          title={isAr ? 'الرصيد النقدي الحالي' : 'Cash on hand'}
          value={fmt(allSummary.accounts[2].closing)}
          currency={cur}
          icon={<Wallet size={16} />}
          accentColor="accent"
          subtitleLabel={isAr ? 'الخزينة · إنستاباي' : 'Safe · InstaPay'}
          subtitleValue={`${fmt(safeNow)} · ${fmt(bankNow)}`}
          badge={hasNegative ? { text: isAr ? 'رصيد سالب — راجع القيود' : 'Negative balance — review entries', variant: 'danger' } : undefined}
          tooltip={isAr ? 'من القيود المرحّلة على حسابي 101000 و102000 فقط' : 'From posted entries on 101000 and 102000 only'}
        />
        <ZFKpiCard
          title={isAr ? `المقبوضات — ${periodLabel}` : `Receipts — ${periodLabel}`}
          value={fmt(summary.inflow)}
          currency={cur}
          icon={<ArrowDownLeft size={16} />}
          accentColor="accent"
          subtitleLabel={isAr ? 'عدد الحركات' : 'Movements'}
          subtitleValue={String(periodMovements.filter(m => m.direction === 'IN').length)}
          onClick={() => focusDirection('IN')}
        />
        <ZFKpiCard
          title={isAr ? `المدفوعات — ${periodLabel}` : `Payments — ${periodLabel}`}
          value={fmt(summary.outflow)}
          currency={cur}
          icon={<ArrowUpRight size={16} />}
          accentColor="accent"
          subtitleLabel={isAr ? 'عدد الحركات' : 'Movements'}
          subtitleValue={String(periodMovements.filter(m => m.direction === 'OUT').length)}
          onClick={() => focusDirection('OUT')}
        />
        <ZFKpiCard
          title={isAr ? `صافي التدفق — ${periodLabel}` : `Net flow — ${periodLabel}`}
          value={fmt(summary.net)}
          currency={cur}
          icon={<Scale size={16} />}
          accentColor="accent"
          subtitleLabel={isAr ? 'رصيد أول الفترة' : 'Opening balance'}
          subtitleValue={`${fmt(totalRow.opening)} ${cur}`}
        />
      </section>

      <section className={ops.analyticsRow}>
        <div className={ops.card}>
          <div className={ops.cardHeader}>
            <div className={ops.cardTitleGroup}>
              <span className={ops.iconSquircle}><Landmark size={15} /></span>
              <h2 className={ops.cardTitle}>{isAr ? 'أرصدة الخزينة' : 'Cash balances'}</h2>
            </div>
            <span className={ops.cardHint}>{periodLabel}</span>
          </div>
          <table className={ops.miniTable}>
            <thead>
              <tr>
                <th>{isAr ? 'الحساب' : 'Account'}</th>
                <th className={ops.numCell}>{isAr ? 'أول الفترة' : 'Opening'}</th>
                <th className={ops.numCell}>{isAr ? 'وارد' : 'In'}</th>
                <th className={ops.numCell}>{isAr ? 'منصرف' : 'Out'}</th>
                <th className={ops.numCell}>{isAr ? 'الرصيد' : 'Closing'}</th>
              </tr>
            </thead>
            <tbody>
              {[safeRow, bankRow].map(row => {
                const code = row.code as CashAccountCode;
                return (
                  <tr key={code}>
                    <td>
                      <span className={ops.accountName}>{CASH_ACCOUNT_LABELS[code][lang]}</span>
                      <span className={ops.mono}>{code}</span>
                    </td>
                    <td className={ops.numCell}>
                      <span className={`${ops.amount} ${row.opening.lt(0) ? ops.amountOut : ''}`}>{fmt(row.opening)}</span>
                    </td>
                    <td className={ops.numCell}>
                      <span className={`${ops.amount} ${row.inflow.lt(0) ? ops.amountOut : ''}`}>{fmt(row.inflow)}</span>
                    </td>
                    <td className={ops.numCell}>
                      <span className={`${ops.amount} ${row.outflow.lt(0) ? ops.amountOut : ''}`}>{fmt(row.outflow)}</span>
                    </td>
                    <td className={ops.numCell}>
                      <span className={`${ops.amount} ${row.closing.lt(0) ? ops.amountOut : ''}`}>{fmt(row.closing)}</span>
                    </td>
                  </tr>
                );
              })}
              <tr className={ops.totalRow}>
                <td>{isAr ? 'الإجمالي' : 'Total'}</td>
                <td className={ops.numCell}>
                  <span className={`${ops.amount} ${totalRow.opening.lt(0) ? ops.amountOut : ''}`}>{fmt(totalRow.opening)}</span>
                </td>
                <td className={ops.numCell}>
                  <span className={`${ops.amount} ${totalRow.inflow.lt(0) ? ops.amountOut : ''}`}>{fmt(totalRow.inflow)}</span>
                </td>
                <td className={ops.numCell}>
                  <span className={`${ops.amount} ${totalRow.outflow.lt(0) ? ops.amountOut : ''}`}>{fmt(totalRow.outflow)}</span>
                </td>
                <td className={ops.numCell}>
                  <span className={`${ops.amount} ${totalRow.closing.lt(0) ? ops.amountOut : ''}`}>{fmt(totalRow.closing)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={ops.card}>
          <div className={ops.cardHeader}>
            <div className={ops.cardTitleGroup}>
              <span className={ops.iconSquircle}><Layers size={15} /></span>
              <h2 className={ops.cardTitle}>{isAr ? 'توزيع الحركة حسب النوع' : 'Movements by type'}</h2>
            </div>
            <span className={ops.cardHint}>{isAr ? 'اضغط على نوع لتصفية الدفتر' : 'Click a type to filter the book'}</span>
          </div>
          {summary.byKind.length === 0 ? (
            <div className={ops.empty}>{isAr ? 'لا توجد حركات في هذه الفترة' : 'No movements in this period'}</div>
          ) : (
            <table className={ops.miniTable}>
              <thead>
                <tr>
                  <th>{isAr ? 'النوع' : 'Type'}</th>
                  <th className={ops.numCell}>{isAr ? 'العدد' : 'Count'}</th>
                  <th className={ops.numCell}>{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th className={ops.numCell}>{isAr ? 'النسبة' : 'Share'}</th>
                </tr>
              </thead>
              <tbody>
                {summary.byKind.map(row => (
                  <tr
                    key={row.kind}
                    className={`${ops.kindRow} ${kindFilter === row.kind ? ops.kindRowActive : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={kindFilter === row.kind}
                    onClick={() => toggleKind(row.kind)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleKind(row.kind);
                      }
                    }}
                  >
                    <td>
                      <span className={directionPillClass(row.direction)}>{CASH_MOVEMENT_KIND_LABELS[row.kind][lang]}</span>
                    </td>
                    <td className={ops.numCell}><span className={ops.amount}>{row.count}</span></td>
                    <td className={ops.numCell}><span className={`${ops.amount} ${amountClass(row.direction)}`}>{fmt(row.amount)}</span></td>
                    <td className={ops.numCell}>
                      {row.share === null ? (
                        <span className={ops.shareText}>—</span>
                      ) : (
                        <span className={ops.shareCell}>
                          <span className={ops.shareTrack}>
                            <span className={ops.shareFill} style={{ width: `${Math.min(100, row.share)}%` }} />
                          </span>
                          <span className={ops.shareText}>{row.share.toFixed(1)}%</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className={ops.card} ref={ledgerRef}>
        <div className={ops.cardHeader}>
          <div className={ops.cardTitleGroup}>
            <span className={ops.iconSquircle}><BookOpen size={15} /></span>
            <h2 className={ops.cardTitle}>{isAr ? 'دفتر حركة الخزينة' : 'Treasury cash book'}</h2>
          </div>
          <span className={ops.cardHint}>{isAr ? `${filtered.length} حركة · ${periodLabel}` : `${filtered.length} movements · ${periodLabel}`}</span>
        </div>
        <div className={ops.ledgerToolbar}>
          <div className={ops.tabs} role="tablist">
            {([
              { key: 'all', label: isAr ? 'الكل' : 'All' },
              { key: 'IN', label: isAr ? 'المقبوضات' : 'Receipts' },
              { key: 'OUT', label: isAr ? 'المدفوعات' : 'Payments' },
              { key: 'TRANSFER', label: isAr ? 'التحويلات' : 'Transfers' }
            ] as const).map(({ key: d, label }) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={direction === d}
                className={`${ops.tab} ${direction === d ? ops.tabActive : ''}`}
                onClick={() => { setDirection(d); resetPage(); }}
              >
                {label}
                <span className={ops.tabCount}>{directionCounts[d]}</span>
              </button>
            ))}
          </div>
          <div className={ops.filters}>
            {kindFilter && (
              <span className={ops.chip}>
                {CASH_MOVEMENT_KIND_LABELS[kindFilter][lang]}
                <button
                  type="button"
                  className={ops.chipClear}
                  aria-label={isAr ? 'إزالة التصفية' : 'Clear filter'}
                  onClick={() => { setKindFilter(null); resetPage(); }}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <select
              className={ops.select}
              value={accountFilter}
              aria-label={isAr ? 'الحساب' : 'Account'}
              onChange={e => { setAccountFilter(e.target.value as 'all' | CashAccountCode); resetPage(); }}
            >
              <option value="all">{isAr ? 'كل الحسابات' : 'All accounts'}</option>
              <option value="101000">{CASH_ACCOUNT_LABELS['101000'][lang]}</option>
              <option value="102000">{CASH_ACCOUNT_LABELS['102000'][lang]}</option>
            </select>
            <ZFSearchBar
              value={search}
              onChange={v => { setSearch(v); resetPage(); }}
              isAr={isAr}
              placeholder={isAr ? 'بحث بالبيان أو الجهة أو رقم القيد' : 'Search description, party, entry #'}
            />
          </div>
        </div>
        {movements.length === 0 ? (
          <div className={ops.empty}>
            {isAr
              ? 'لا توجد حركات نقدية مسجلة بعد. أي تحصيل أو صرف يظهر هنا فور ترحيل قيده.'
              : 'No cash movements yet. Any receipt or payment appears here once its entry is posted.'}
          </div>
        ) : sorted.length === 0 ? (
          <div className={ops.empty}>
            <span>{isAr ? 'لا توجد حركات تطابق الفلاتر الحالية' : 'No movements match the current filters'}</span>
            <button type="button" className={ops.ghostBtn} onClick={clearFilters}>
              {isAr ? 'مسح الفلاتر' : 'Clear filters'}
            </button>
          </div>
        ) : (
          <>
            <div className={ops.tableScroll}>
              <table className={ops.table}>
                <thead>
                  <tr>
                    <th>
                      <button type="button" className={ops.sortBtn} onClick={() => toggleSort('date')}>
                        {isAr ? 'التاريخ' : 'Date'}
                        {sortIcon('date')}
                      </button>
                    </th>
                    <th>{isAr ? 'النوع' : 'Type'}</th>
                    <th>{isAr ? 'البيان' : 'Description'}</th>
                    <th>{isAr ? 'الجهة' : 'Party'}</th>
                    <th>{isAr ? 'الحساب' : 'Account'}</th>
                    <th>{isAr ? 'رقم القيد' : 'Entry #'}</th>
                    <th className={ops.numCell}>
                      <button type="button" className={ops.sortBtn} onClick={() => toggleSort('amount')}>
                        {isAr ? 'المبلغ' : 'Amount'}
                        {sortIcon('amount')}
                      </button>
                    </th>
                    <th
                      className={ops.numCell}
                      title={isAr ? 'إجمالي الخزينة وإنستاباي بعد الحركة' : 'Safe + InstaPay after this movement'}
                    >
                      {isAr ? 'الرصيد بعد الحركة' : 'Balance after'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(m => (
                    <tr
                      key={m.id}
                      className={ops.row}
                      tabIndex={0}
                      onClick={() => inspect(m)}
                      onKeyDown={e => { if (e.key === 'Enter') inspect(m); }}
                    >
                      <td>
                        <div className={ops.dateCell}>
                          <span className={ops.dateMain}>{displayDate(m.date)}</span>
                          {m.time && <span className={ops.dateSub}>{formatTime12h(m.time, isAr)}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={directionPillClass(m.direction)}>
                          {CASH_MOVEMENT_KIND_LABELS[m.kind][lang]}
                        </span>
                      </td>
                      <td>
                        <div className={ops.descCell}>
                          <span className={ops.descMain} title={m.description}>{m.description}</span>
                          {m.originalDescription && m.originalDescription !== m.description && (
                            <span className={ops.descSub} title={m.originalDescription}>
                              {m.originalDescription}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{m.counterparty}</td>
                      <td>{accountText(m)}</td>
                      <td><span className={ops.mono}>{m.entryNumber}</span></td>
                      <td className={ops.numCell}>
                        <span className={`${ops.amount} ${amountClass(m.direction)}`}>{signedText(m)}</span>
                      </td>
                      <td className={ops.numCell}>
                        <span className={`${ops.amount} ${m.balanceAfter.lt(0) ? ops.amountOut : ''}`}>
                          {fmt(m.balanceAfter)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={ops.footer}>
              <ZFPagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={sorted.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={s => { setPageSize(s); resetPage(); }}
                pageSizeOptions={[15, 30, 60]}
                isAr={isAr}
                itemLabel={{ ar: 'حركة', en: 'movements' }}
              />
            </div>
          </>
        )}
      </section>

      <ZFWorkstationSideWidgets>
        <div className={ops.side}>
          <div className={ops.card}>
            <div className={ops.cardHeader}>
              <div className={ops.cardTitleGroup}>
                <span className={ops.iconSquircle}><Zap size={15} /></span>
                <h2 className={ops.cardTitle}>{isAr ? 'إجراءات الخزينة' : 'Treasury actions'}</h2>
              </div>
            </div>
            <div className={ops.actionGroupLabel}>{isAr ? 'قبض' : 'Receive'}</div>
            <div className={ops.actionList}>
              {renderAction('cash_receipt', <Coins size={15} />, isAr ? 'تحصيل قسط' : 'Collect installment', isAr ? 'نقداً أو بإنستاباي فور الاستلام' : 'Cash or InstaPay, on receipt')}
              {renderAction('partner_injection', <Users size={15} />, isAr ? 'تمويل من شريك' : 'Partner funding', isAr ? 'إيداع حصة أو زيادة رأس المال' : 'Capital contribution')}
            </div>
            <div className={ops.actionGroupLabel}>{isAr ? 'صرف' : 'Pay'}</div>
            <div className={ops.actionList}>
              {renderAction('pay_contractor', <HardHat size={15} />, isAr ? 'سداد مستخلص مقاول' : 'Pay contractor', isAr ? 'أقرب دفعة مستحقة' : 'Earliest due installment')}
              {renderAction('record_expense', <Receipt size={15} />, isAr ? 'مصروف مباشر' : 'Direct expense', isAr ? 'تكاليف موقع أو تشغيل' : 'Site or operating cost')}
              {renderAction('partner_payout', <HandCoins size={15} />, isAr ? 'توزيع على الشركاء' : 'Partner distribution', isAr ? 'أرباح أو مسحوبات' : 'Profit or drawings')}
            </div>
            {onOpenCashTransfer && (
              <>
                <div className={ops.actionGroupLabel}>{isAr ? 'تحويل' : 'Transfer'}</div>
                <div className={ops.actionList}>
                  {renderAction('transfer', <ArrowLeftRight size={15} />, isAr ? 'تحويل بين الخزينة وإنستاباي' : 'Safe ⇄ InstaPay transfer', isAr ? 'إيداع نقدية أو سحب من إنستاباي' : 'Deposit cash or withdraw from InstaPay')}
                </div>
              </>
            )}
          </div>
          <div className={ops.card}>
            <div className={ops.cardHeader}>
              <div className={ops.cardTitleGroup}>
                <span className={ops.iconSquircle}><CalendarClock size={15} /></span>
                <div className={ops.cardTitleStack}>
                  <h2 className={ops.cardTitle}>{isAr ? 'مستحقات قادمة' : 'Upcoming dues'}</h2>
                  <span className={ops.cardHint}>{isAr ? 'المتأخر + الـ٣٠ يوماً القادمة' : 'Overdue + next 30 days'}</span>
                </div>
              </div>
              <button type="button" className={ops.linkBtn} onClick={() => onNavigateToTab('pdc')}>{isAr ? 'عرض الكل' : 'View all'}</button>
            </div>
            <dl className={ops.dueSummary}>
              <div className={ops.dueSummaryRow}>
                <dt>{isAr ? 'تحصيلات متوقعة' : 'Expected receipts'} <span className={ops.dueCount}>{dues.inCount}</span></dt>
                <dd><span className={`${ops.amount} ${ops.amountIn}`}>{fmt(dues.inTotal)}</span> <span className={ops.dueCur}>{cur}</span></dd>
              </div>
              <div className={ops.dueSummaryRow}>
                <dt>{isAr ? 'مدفوعات مستحقة' : 'Payments due'} <span className={ops.dueCount}>{dues.outCount}</span></dt>
                <dd><span className={`${ops.amount} ${ops.amountOut}`}>{fmt(dues.outTotal)}</span> <span className={ops.dueCur}>{cur}</span></dd>
              </div>
            </dl>
            {dues.items.length === 0 ? (
              <div className={ops.empty}>{isAr ? 'لا توجد أقساط أو مستحقات خلال الـ٣٠ يوماً القادمة' : 'No installments or payables due in the next 30 days'}</div>
            ) : (
              <ul className={ops.dueList}>
                {dues.items.slice(0, 6).map(d => (
                  <li key={d.id}>
                    <button type="button" className={ops.dueItem} disabled={isMutating} onClick={() => handleDueClick(d)}>
                      <span className={ops.dueTexts}>
                        <span className={ops.dueTitle}>{d.title}</span>
                        <span className={ops.dueMeta}>{d.party} · {displayDate(d.dueDate)}</span>
                      </span>
                      <span className={ops.dueAmountCol}>
                        <span className={`${ops.amount} ${d.direction === 'IN' ? ops.amountIn : ops.amountOut}`}>{d.direction === 'IN' ? '+' : '-'}{fmt(d.amount)}</span>
                        {d.isOverdue && <span className={`${shellStyles.statusPill} ${shellStyles.statusPillRed}`}>{isAr ? 'متأخر' : 'Overdue'}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {dues.items.length > 6 && (
              <div className={ops.dueMore}>{isAr ? `+ ${dues.items.length - 6} مستحقات أخرى` : `+ ${dues.items.length - 6} more`}</div>
            )}
          </div>
        </div>
      </ZFWorkstationSideWidgets>

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

      {onRecordPayablePayment && (
        <CostPayableSettlementModal
          isOpen={isPayablePickerOpen}
          onClose={() => setIsPayablePickerOpen(false)}
          costItem={null}
          installment={null}
          availableCosts={propertyCosts}
          properties={properties}
          isAr={isAr}
          onConfirmPayment={async (updated, instId, amt, method) => {
            await onRecordPayablePayment?.(updated, instId, amt, method);
            setIsPayablePickerOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default DailyOperationsView;
