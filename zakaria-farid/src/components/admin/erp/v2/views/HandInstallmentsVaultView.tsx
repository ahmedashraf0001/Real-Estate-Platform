'use client';

import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  RotateCcw,
  Calendar,
  Coins,
  Printer,
  Layers,
  Building2,
  FileCheck,
  Send,
  CreditCard,
  ShieldCheck,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ERPPDCRecord, ERPContract, ERPInstallmentSchedule, ERPPropertyCostItem, ERPPayableInstallment } from '@/lib/erp/types';
import { Property } from '@/lib/supabase/types';
import { monthlySeries } from '@/lib/erp/realDisplayValues';
import { D, Decimal } from '@/lib/erp/math';
import { tafqeetEGP } from '@/lib/erp/tafqeet';
import { MoneyCell } from '@/components/erp/MoneyCell';
import { ZFPagination } from '../ZFPagination';
import { ZFKpiCard, ZFKpiGrid } from '../ZFKpiCard';
import { ZFFilterToolbar } from '../ZFFilterToolbar';
import { ZFWorkstationSideWidgets, ZFWidgetCard } from '../common/ZFWorkstationSideWidgets';
import { ZFPrintDocumentLayout } from '../common/ZFPrintDocumentLayout';
import { ZFPageHeader } from '../common/ZFPageHeader';
import { 
  buildProjectedVaultItems, 
  calculateVaultKPIs, 
  ProjectedVaultItem,
  VaultItemStatus,
  getLocalTodayStr,
  getDistinctiveUnit
} from '@/lib/erp/installmentsVaultProjection';
import {
  ProjectedOutflowItem,
  buildProjectedOutflowItems,
  calculateFinancialAgendaKPIs,
  FinancialAgendaKPIs,
  AgendaOutflowStatus
} from '@/lib/erp/financialAgendaProjection';
import {
  UnifiedAgendaRow,
  AgendaDirectionFilter,
  AgendaMaturityTab,
  AgendaStatusFilter,
  buildUnifiedAgendaRows,
  filterAgendaRows,
  calculateAgendaChipCounts,
  sortAgendaRows,
  calculateAgendaFooter
} from '@/lib/erp/agendaRows';
import { InstallmentDetailDrawer } from './installments/InstallmentDetailDrawer';
import { InstallmentsMonthCalendar } from './installments/InstallmentsMonthCalendar';
import { InstallmentsAnalyticsCharts } from './installments/InstallmentsAnalyticsCharts';
import { useERPWorkstationContext } from '../../context/ERPWorkstationContext';
import { getAvailableCash } from '@/lib/erp/canonicalMetrics';
import styles from '../ZFWorkstationShell.module.css';

// Format number with thousands commas
function formatNumberWithCommas(val: Decimal | string | number | bigint | undefined | null): string {
  if (val === undefined || val === null) return '0.00';
  const d = val instanceof Decimal ? val : D(val);
  const parts = d.abs().toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${integerPart}.${parts[1]}`;
}

function formatNoDecimals(val: Decimal | string | number | bigint | undefined | null): string {
  if (val === undefined || val === null) return '0';
  const d = val instanceof Decimal ? val : D(val);
  const rounded = Math.round(d.toNumber());
  return rounded.toLocaleString('en-US');
}

export interface HandInstallmentsVaultViewProps {
  pdcRecords: ERPPDCRecord[];
  contracts: ERPContract[];
  schedules?: ERPInstallmentSchedule[];
  properties?: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  isAr?: boolean;
  isMutating?: boolean;
  onCollectItem: (item: ERPPDCRecord) => void;
  onCollectDueToday?: () => void;
  onOpenNewCheque?: () => void;
  onOpenNewSupplement?: (contractId?: string) => void;
  onBounceItem?: (item: ERPPDCRecord) => void | Promise<void>;
  onPDCStatusChange?: (chequeId: string, newStatus: 'In Safe' | 'Deposited' | 'Cleared' | 'Bounced') => Promise<void>;
  onRecordPayablePayment?: (updatedItem: ERPPropertyCostItem) => Promise<void>;
}

export const HandInstallmentsVaultView: React.FC<HandInstallmentsVaultViewProps> = ({
  pdcRecords,
  contracts,
  schedules = [],
  properties = [],
  propertyCosts = [],
  isAr = true,
  isMutating = false,
  onCollectItem,
  onOpenNewCheque: _onOpenNewCheque,
  onOpenNewSupplement,
  onBounceItem,
  onPDCStatusChange,
  onRecordPayablePayment
}) => {
  // Stable reference today date in local timezone
  const [todayStr] = useState<string>(() => getLocalTodayStr());

  // Selected date filter from calendar strip / month
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Drawer & Modal Inspection state (tracking by ID guarantees reactivity when item status mutates)
  const [inspectingItemId, setInspectingItemId] = useState<string | null>(null);

  // Truthful Document Printing state ('receipt' vs 'due_notice')
  const [printingItemId, setPrintingItemId] = useState<string | null>(null);
  const [printingDocType, setPrintingDocType] = useState<'receipt' | 'due_notice'>('receipt');

  // View mode & selection state (Unified One-Table Architecture)
  const [directionFilter, setDirectionFilter] = useState<AgendaDirectionFilter>('all');
  const [maturityTab, setMaturityTab] = useState<AgendaMaturityTab>('all');
  const [statusFilter, setStatusFilter] = useState<AgendaStatusFilter>('all');
  const [sortBy, setSortBy] = useState<string>('priority');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Outflow settlement modal state (Strictly Cash or InstaPay)
  const [settlingOutflowItem, setSettlingOutflowItem] = useState<ProjectedOutflowItem | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleMethod, setSettleMethod] = useState<'CASH' | 'INSTAPAY'>('CASH');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [isSettling, setIsSettling] = useState<boolean>(false);

  // 1. RECONCILED DEDUPLICATED INFLOW PROJECTION (Client Receivables)
  const projectedItems = useMemo(() => {
    return buildProjectedVaultItems(pdcRecords, schedules, contracts, properties, {
      isAr,
      referenceDate: todayStr
    });
  }, [pdcRecords, schedules, contracts, properties, isAr, todayStr]);

  // 2. RECONCILED OUTFLOW PROJECTION (Contractors, Vendors & Expenses Payables)
  const projectedOutflows = useMemo(() => {
    return buildProjectedOutflowItems(propertyCosts, properties, {
      isAr,
      referenceDate: todayStr
    });
  }, [propertyCosts, properties, isAr, todayStr]);

  // Derived current inspecting and printing items (always reactive to latest mutations)
  const inspectingItem = useMemo(() => {
    if (!inspectingItemId) return null;
    return projectedItems.find(i => i.id === inspectingItemId) || null;
  }, [projectedItems, inspectingItemId]);

  const printingItem = useMemo(() => {
    if (!printingItemId) return null;
    return projectedItems.find(i => i.id === printingItemId) || null;
  }, [projectedItems, printingItemId]);

  // 3. CONSOLIDATED VAULT KPIS (Compatibility for companion widgets)
  const vaultKPIs = useMemo(() => {
    return calculateVaultKPIs(projectedItems, todayStr);
  }, [projectedItems, todayStr]);

  // 4. CONSOLIDATED FINANCIAL AGENDA KPIS (Dual Inflow & Outflow Treasury Math)
  const agendaKPIs = useMemo(() => {
    return calculateFinancialAgendaKPIs(projectedItems, projectedOutflows, todayStr);
  }, [projectedItems, projectedOutflows, todayStr]);

  // Cash-basis projected liquidity: GL cash (101000 + 102000) + open scheduled collections − open payables
  const erpCtx = useERPWorkstationContext();
  const glJournalEntries = erpCtx?.data?.journalEntries;
  const projectedLiquidity = useMemo(() => {
    const glCash = getAvailableCash(glJournalEntries || []).totalCash;
    return glCash.plus(agendaKPIs.netScheduledFlow);
  }, [glJournalEntries, agendaKPIs.netScheduledFlow]);

  // Current balances grouped by contractual due month, not historical balances.
  const kpiSeries = useMemo(() => {
    const inflows = projectedItems.map(item => ({ date: item.dueDate, amount: item.remainingAmount }));
    const outflows = projectedOutflows.map(item => ({ date: item.dueDate, amount: item.totalAmount }));
    const net = [
      ...inflows,
      ...projectedOutflows.map(item => ({ date: item.dueDate, amount: D(0).minus(D(item.remainingAmount)) })),
      ...(glJournalEntries || []).map(entry => ({ date: entry.entry_date, amount: getAvailableCash([entry]).totalCash })),
    ];
    const urgent = [
      ...projectedItems.filter(item => item.status === 'overdue' || item.status === 'due_today').map(item => ({ date: item.dueDate, amount: item.remainingAmount })),
      ...projectedOutflows.filter(item => item.status === 'overdue' || item.status === 'due_today').map(item => ({ date: item.dueDate, amount: item.remainingAmount })),
    ];
    return [inflows, outflows, net, urgent].map(rows => monthlySeries(rows, todayStr, 8));
  }, [projectedItems, projectedOutflows, glJournalEntries, todayStr]);

  // 5. TODAY'S AGENDA REAL DUES
  const todayAgendaItems = useMemo(() => {
    return projectedItems
      .filter(item => item.status === 'due_today')
      .sort((a, b) => D(b.nominalValue).minus(D(a.nominalValue)).toNumber());
  }, [projectedItems]);

  // 6. OVERDUE DUES (Urgent Operator Follow-up)
  const overdueItems = useMemo(() => {
    return projectedItems
      .filter(item => item.status === 'overdue')
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  }, [projectedItems]);

  // 7. UNIFIED ROWS & DUES FILTERING ENGINE
  const allUnifiedRows = useMemo(() => {
    return buildUnifiedAgendaRows(projectedItems, projectedOutflows, isAr);
  }, [projectedItems, projectedOutflows, isAr]);

  // Direction switch counts (evaluated before direction filter is applied)
  const directionCounts = useMemo(() => {
    const base = filterAgendaRows(allUnifiedRows, {
      direction: 'all',
      maturityTab: 'all',
      statusFilter,
      searchQuery,
      calendarDate: selectedCalendarDate,
      todayStr
    });
    const inflows = base.filter(r => r.direction === 'in').length;
    const outflows = base.filter(r => r.direction === 'out').length;
    return {
      all: base.length,
      inflows,
      outflows
    };
  }, [allUnifiedRows, statusFilter, searchQuery, selectedCalendarDate, todayStr]);

  // Chip counts: computed strictly from the SAME rows matching current direction + search + status + calendar date
  const chipCounts = useMemo(() => {
    return calculateAgendaChipCounts(allUnifiedRows, {
      direction: directionFilter,
      statusFilter,
      searchQuery,
      calendarDate: selectedCalendarDate,
      todayStr
    });
  }, [allUnifiedRows, directionFilter, statusFilter, searchQuery, selectedCalendarDate, todayStr]);

  // Filtered unified rows for display
  const filteredUnifiedRows = useMemo(() => {
    return filterAgendaRows(allUnifiedRows, {
      direction: directionFilter,
      maturityTab,
      statusFilter,
      searchQuery,
      calendarDate: selectedCalendarDate,
      todayStr
    });
  }, [allUnifiedRows, directionFilter, maturityTab, statusFilter, searchQuery, selectedCalendarDate, todayStr]);

  // Sorted unified rows
  const sortedUnifiedRows = useMemo(() => {
    return sortAgendaRows(filteredUnifiedRows, sortBy, isAr);
  }, [filteredUnifiedRows, sortBy, isAr]);

  // Pagination for unified table & cards
  const totalPages = Math.ceil(sortedUnifiedRows.length / pageSize) || 1;
  const paginatedUnifiedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUnifiedRows.slice(start, start + pageSize);
  }, [sortedUnifiedRows, currentPage, pageSize]);

  // Footer exact decimal summary
  const footerSummary = useMemo(() => {
    return calculateAgendaFooter(filteredUnifiedRows);
  }, [filteredUnifiedRows]);

  const activeFiltersCount = (directionFilter !== 'all' ? 1 : 0) +
    (maturityTab !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    (selectedCalendarDate ? 1 : 0) +
    (sortBy !== 'priority' ? 1 : 0);

  const handleResetFilters = () => {
    setDirectionFilter('all');
    setMaturityTab('all');
    setStatusFilter('all');
    setSortBy('priority');
    setSearchQuery('');
    setSelectedCalendarDate(null);
    setCurrentPage(1);
  };

  // Convert projected item to ERPPDCRecord equivalent for collection modal
  const handleTriggerCollect = (item: ProjectedVaultItem) => {
    const amountToCollect = D(item.remainingAmount).gt(0) ? item.remainingAmount : item.nominalValue;
    const pdcEquivalent: ERPPDCRecord = item.linkedCheque 
      ? { ...item.linkedCheque, nominal_value: amountToCollect }
      : {
          cheque_id: item.chequeId || item.id,
          contract_id: item.contractId,
          schedule_id: item.scheduleId,
          cheque_number: item.instrumentNumber,
          bank_name: item.bankName,
          drawer_name: item.buyerName,
          nominal_value: amountToCollect,
          due_date: item.dueDate,
          status: 'In Safe'
        };
    onCollectItem(pdcEquivalent);
  };

  // Settle Outflow Item (Contractor / Vendor / Expense Payable)
  const handleSettleOutflow = async () => {
    if (!settlingOutflowItem || !onRecordPayablePayment) return;
    const raw = settlingOutflowItem.rawCostItem;
    if (!raw) return;

    const payVal = D(settleAmount || settlingOutflowItem.remainingAmount);
    if (payVal.lte(0)) return;

    setIsSettling(true);
    try {
      let updatedCost: ERPPropertyCostItem;

      if (settlingOutflowItem.installmentId && raw.payable_installments) {
        const updatedInsts = raw.payable_installments.map(inst => {
          if (inst.installment_id === settlingOutflowItem.installmentId) {
            const curPaid = D(inst.paid_amount_egp || 0);
            const newPaid = curPaid.plus(payVal).toFixed(2);
            const isFullyPaid = D(newPaid).gte(D(inst.amount_egp));
            return {
              ...inst,
              paid_amount_egp: newPaid,
              status: isFullyPaid ? ('PAID' as const) : ('PARTIALLY_PAID' as const),
              payment_date: todayStr,
              payment_method: settleMethod === 'INSTAPAY' ? ('INSTAPAY_102000' as const) : ('CASH_101000' as const),
              notes: settleNotes || inst.notes
            };
          }
          return inst;
        });

        const totalPaid = updatedInsts.reduce((acc, i) => acc.plus(D(i.paid_amount_egp || 0)), D(0));
        const totalCost = D(raw.total_cost_egp || raw.total_amount || 0);
        const remaining = Math.max(0, totalCost.minus(totalPaid).toNumber()).toFixed(2);

        updatedCost = {
          ...raw,
          payable_installments: updatedInsts,
          paid_amount_egp: totalPaid.toFixed(2),
          remaining_amount_egp: remaining
        };
      } else {
        const curPaid = D(raw.paid_amount_egp || 0);
        const newPaid = curPaid.plus(payVal).toFixed(2);
        const totalCost = D(raw.total_cost_egp || raw.total_amount || 0);
        const remaining = Math.max(0, totalCost.minus(D(newPaid)).toNumber()).toFixed(2);

        updatedCost = {
          ...raw,
          paid_amount_egp: newPaid,
          remaining_amount_egp: remaining
        };
      }

      await onRecordPayablePayment(updatedCost);
      setSettlingOutflowItem(null);
      setSettleAmount('');
      setSettleNotes('');
    } finally {
      setIsSettling(false);
    }
  };

  // Clickable Sortable Header Component
  const renderSortHeader = (
    colKey: string,
    label: string,
    currentSort: string,
    onToggle: (newSort: string) => void,
    align: 'right' | 'left' | 'center' = isAr ? 'right' : 'left'
  ) => {
    const isAsc = currentSort === `${colKey}_asc`;
    const isDesc = currentSort === `${colKey}_desc`;
    const isActive = isAsc || isDesc;

    const handleSort = () => {
      if (isAsc) {
        onToggle(`${colKey}_desc`);
      } else {
        onToggle(`${colKey}_asc`);
      }
    };

    return (
      <th
        onClick={handleSort}
        style={{
          padding: '0.75rem 1rem',
          textAlign: align,
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          transition: 'color 0.15s ease'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: isActive ? 'var(--erp-accent, #2563eb)' : '#475569', fontWeight: isActive ? 800 : 700 }}>
          <span>{label}</span>
          <span style={{ fontSize: '0.72rem', opacity: isActive ? 1 : 0.45 }}>
            {isAsc ? '▲' : isDesc ? '▼' : '⇅'}
          </span>
        </div>
      </th>
    );
  };

  // Status Badge Helper for Inflows (Strict Cash/InstaPay)
  const renderStatusPill = (status: VaultItemStatus, compact?: boolean) => {
    const compactStyle: React.CSSProperties = compact ? { fontSize: '0.66rem', padding: '1px 6px' } : {};
    switch (status) {
      case 'cleared':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillGreen}`} style={compactStyle}>
            <CheckCircle2 size={compact ? 10 : 11} />
            <span>{isAr ? 'محصل بالكامل' : 'Cleared'}</span>
          </span>
        );
      case 'overdue':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillRed}`} style={compactStyle}>
            <AlertCircle size={compact ? 10 : 11} />
            <span>{isAr ? 'متأخر' : 'Overdue'}</span>
          </span>
        );
      case 'due_today':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={compactStyle}>
            <Clock size={compact ? 10 : 11} />
            <span>{isAr ? 'مستحق اليوم' : 'Due Today'}</span>
          </span>
        );
      case 'bounced':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillRed}`} style={compactStyle}>
            <RotateCcw size={compact ? 10 : 11} />
            <span>{isAr ? 'متعثر بالسداد' : 'Defaulted'}</span>
          </span>
        );
      case 'deposited':
      case 'upcoming':
      case 'in_safe':
      default:
        return (
          <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={compactStyle}>
            <Calendar size={compact ? 10 : 11} />
            <span>{isAr ? 'قيد السداد' : 'Pending'}</span>
          </span>
        );
    }
  };

  // Status Badge Helper for Outflows
  const renderOutflowStatusPill = (status: AgendaOutflowStatus, compact?: boolean) => {
    const compactStyle: React.CSSProperties = compact ? { fontSize: '0.66rem', padding: '1px 6px' } : {};
    switch (status) {
      case 'paid':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillGreen}`} style={compactStyle}>
            <CheckCircle2 size={compact ? 10 : 11} />
            <span>{isAr ? 'مسدد بالكامل' : 'Paid'}</span>
          </span>
        );
      case 'overdue':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillRed}`} style={compactStyle}>
            <AlertCircle size={compact ? 10 : 11} />
            <span>{isAr ? 'متأخر بالسداد' : 'Overdue'}</span>
          </span>
        );
      case 'due_today':
        return (
          <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={compactStyle}>
            <Clock size={compact ? 10 : 11} />
            <span>{isAr ? 'مستحق اليوم' : 'Due Today'}</span>
          </span>
        );
      case 'upcoming':
      default:
        return (
          <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={compactStyle}>
            <Calendar size={compact ? 10 : 11} />
            <span>{isAr ? 'قيد الاستحقاق' : 'Upcoming'}</span>
          </span>
        );
    }
  };

  // Payment Channel badge (Strictly Cash or InstaPay)
  const renderPaymentChannelPill = (method?: string) => {
    const isInstapay = method?.toUpperCase().includes('INSTAPAY');
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.12rem 0.5rem',
        borderRadius: '6px',
        fontSize: '0.7rem',
        fontWeight: 700,
        background: isInstapay ? 'color-mix(in srgb, var(--erp-accent) 8%, transparent)' : 'rgba(100, 116, 139, 0.08)',
        color: isInstapay ? 'var(--erp-accent)' : '#334155',
        border: `1px solid ${isInstapay ? 'color-mix(in srgb, var(--erp-accent) 20%, transparent)' : '#e2e8f0'}`
      }}>
        {isInstapay ? <CreditCard size={11} /> : <Wallet size={11} />}
        <span>{isInstapay ? (isAr ? 'إنستاباي' : 'InstaPay') : (isAr ? 'نقدي' : 'Cash')}</span>
      </span>
    );
  };

  // 8. TRUTHFUL DOCUMENT PRINT BODY
  const printingProperty = useMemo(() => {
    if (!printingItem?.propertyId) return null;
    return properties.find(p => p.id === printingItem.propertyId) || null;
  }, [printingItem, properties]);

  const printingPropertyImageUrl = useMemo(() => {
    if (!printingProperty) return null;
    if (printingProperty.property_images && printingProperty.property_images.length > 0) {
      const sorted = [...printingProperty.property_images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      return sorted[0]?.url || null;
    }
    return null;
  }, [printingProperty]);

  const printDocumentBody = printingItem ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', direction: isAr ? 'rtl' : 'ltr' }}>
      {/* 1. Legal Warning Notice when printing a Due Notice (before collection) */}
      {printingDocType === 'due_notice' && (
        <div style={{
          background: 'rgba(217, 119, 6, 0.08)',
          border: '1.5px solid rgba(217, 119, 6, 0.35)',
          borderRadius: '10px',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#92400e',
          fontSize: '0.82rem',
          lineHeight: 1.5
        }}>
          <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', color: '#b45309', fontWeight: 800 }}>
              {isAr ? 'تنبيه محاسبي وقانوني معتمد:' : 'Important Notice:'}
            </strong>
            {isAr 
              ? 'هذا المستند إشعار رسمي بموعد وقيمة استحقاق القسط، ولا يعتبر إيصال استلام أو سند قبض نقدية حتى يتم السداد الفعلي وتوريد المبلغ بالخزينة أو الحساب البنكي رسمياً.'
              : 'This is an official payment due notice and does NOT constitute a cash receipt until funds are officially cleared.'}
          </div>
        </div>
      )}

      {/* 2. Architectural Property Strip */}
      <div style={{
        border: '1.5px solid #D8D2C4',
        borderRadius: '12px',
        padding: '0.85rem 1.15rem',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}>
          {printingPropertyImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={printingPropertyImageUrl}
              alt={printingItem.projectTitle}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: '1.5px solid #D8D2C4',
                flexShrink: 0
              }}
            />
          ) : (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '8px',
              background: '#F8FAFC',
              border: '1.5px solid var(--erp-border, #cbd5e1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--erp-accent)',
              flexShrink: 0
            }}>
              <Building2 size={30} />
              <span style={{ fontSize: '0.64rem', fontWeight: 800, marginTop: '0.2rem', color: '#64748b' }}>
                {isAr ? 'مشروع عقاري' : 'Property'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: 'var(--erp-accent, #2563eb)',
                background: 'var(--erp-accent-subtle, #eff6ff)',
                border: '1px solid color-mix(in srgb, var(--erp-accent) 20%, transparent)',
                padding: '0.15rem 0.55rem',
                borderRadius: '6px'
              }}>
                {isAr ? 'بيانات الأصل والوحدة' : 'Verified Real Estate Asset'}
              </span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                {printingItem.projectTitle}
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.82rem', color: '#475569' }}>
              <span>
                <strong style={{ color: '#64748b' }}>{isAr ? 'الوحدة: ' : 'Unit: '}</strong>
                <span style={{ color: '#0F172A', fontWeight: 800 }}>{printingItem.unitId}</span>
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>
                <strong style={{ color: '#64748b' }}>{isAr ? 'رقم العقد: ' : 'Contract: '}</strong>
                <span style={{ color: 'var(--erp-accent)', fontWeight: 800 }}>#{printingItem.contractNumber}</span>
              </span>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--erp-accent-subtle)',
              border: '1px solid color-mix(in srgb, var(--erp-accent) 20%, transparent)',
              padding: '0.15rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 800,
              color: 'var(--erp-accent)',
              width: 'fit-content'
            }}>
              <Layers size={12} />
              <span>{printingItem.description}</span>
            </div>
          </div>
        </div>

        <div style={{
          textAlign: isAr ? 'left' : 'right',
          borderLeft: isAr ? 'none' : '1px solid #E2E8F0',
          borderRight: isAr ? '1px solid #E2E8F0' : 'none',
          paddingLeft: isAr ? 0 : '1.25rem',
          paddingRight: isAr ? '1.25rem' : 0,
          flexShrink: 0
        }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block' }}>
            {isAr ? 'نوع المستند الرسمي:' : 'Document Nature:'}
          </span>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            color: printingDocType === 'receipt' ? '#16a34a' : 'var(--erp-accent)',
            display: 'inline-block',
            marginTop: '0.2rem'
          }}>
            {printingDocType === 'receipt' ? (isAr ? 'سند قبض معتمد ✓' : 'Official Receipt ✓') : (isAr ? 'إشعار استحقاق ومطالبة' : 'Formal Due Notice')}
          </span>
        </div>
      </div>

      {/* 3. Amount Box with Digits & Tafqeet */}
      <div style={{
        border: '1.5px solid var(--erp-border, #cbd5e1)',
        borderRadius: '12px',
        padding: '1.15rem 1.4rem',
        background: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', display: 'block' }}>
            {printingDocType === 'receipt' 
              ? (isAr ? 'المبلغ المسدد والمثبت رسمياً بالدفاتر:' : 'Settled & Verified Cash Amount:')
              : (isAr ? 'المبلغ المستحق والمطلوب سداده:' : 'Outstanding Amount Due:')}
          </span>
          {(() => {
            const printAmount = printingDocType === 'receipt'
              ? (D(printingItem.amountPaid).gt(0) ? printingItem.amountPaid : printingItem.nominalValue)
              : (D(printingItem.remainingAmount).gt(0) ? printingItem.remainingAmount : printingItem.nominalValue);
            return (
              <>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  fontVariantNumeric: 'tabular-nums',
                  marginTop: '0.2rem',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.35rem'
                }}>
                  <span>{formatNumberWithCommas(printAmount)}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--erp-accent)' }}>{isAr ? 'ج.م' : 'EGP'}</span>
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--erp-accent)', marginTop: '0.35rem' }}>
                  {isAr 
                    ? `فقط وقدره: ${tafqeetEGP(printAmount)} لا غير`
                    : tafqeetEGP(printAmount)}
                </div>
              </>
            );
          })()}
        </div>

        <div style={{ textAlign: isAr ? 'left' : 'right', flexShrink: 0 }}>
          <span style={{
            display: 'inline-block',
            background: printingDocType === 'receipt' ? '#16a34a' : 'var(--erp-accent)',
            color: '#ffffff',
            padding: '0.45rem 0.95rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 800
          }}>
            {printingDocType === 'receipt' ? (isAr ? 'مُسدد بالخزينة' : 'Receipt Settled') : (isAr ? 'واجب السداد' : 'Payment Required')}
          </span>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 600 }}>
            {printingItem.paymentMethod === 'INSTAPAY' ? (isAr ? 'قناة الدفع: إنستاباي' : 'Channel: InstaPay') : (isAr ? 'قناة الدفع: نقدي' : 'Channel: Cash')}
          </div>
        </div>
      </div>

      {/* 4. Certification Metadata Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1.5px solid var(--erp-border, #cbd5e1)',
        fontSize: '0.82rem',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid var(--erp-border, #cbd5e1)', background: '#F8FAFC' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '22%', color: '#64748b' }}>
              {isAr ? 'اسم العميل المتعاقد:' : 'Buyer Name:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '38%', color: '#0F172A' }}>
              {printingItem.buyerName}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, width: '18%', color: '#64748b' }}>
              {isAr ? 'رقم السند / الدفعة:' : 'Voucher / Ref #:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, width: '22%', color: '#0F172A' }}>
              #{printingItem.instrumentNumber}
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--erp-border, #cbd5e1)' }}>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#64748b' }}>
              {isAr ? 'تاريخ الاستحقاق التعاقدي:' : 'Due Date:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
              {printingItem.dueDate}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#64748b' }}>
              {isAr ? 'تاريخ الحركة / التسوية:' : 'Settlement Date:'}
            </td>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
              {printingDocType === 'receipt' ? (printingItem.clearedDate || todayStr) : todayStr}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#64748b' }}>
              {isAr ? 'طرق وقنوات السداد المعتمدة:' : 'Approved Payment Channels:'}
            </td>
            <td colSpan={3} style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: 600 }}>
              {isAr
                ? '١. التوريد النقدي الفوري بخزينة الشركة الرئيسية (كاش) • ٢. التحويل المباشر عبر تطبيق إنستاباي (InstaPay)'
                : '1. Cash Safe at HQ • 2. InstaPay Instant Transfer'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 5. Official Double-Entry Accounting Routing Strip (Only for Cleared Receipts) */}
      {printingDocType === 'receipt' && (
        <div style={{
          background: '#F8FAFC',
          border: '1.5px solid var(--erp-border, #cbd5e1)',
          borderRadius: '10px',
          padding: '0.85rem 1.15rem',
          fontSize: '0.78rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.45rem' }}>
            <span style={{ fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={15} color="var(--erp-accent, #2563eb)" />
              <span>{isAr ? 'التوجيه المحاسبي المعتمد (Double-Entry GL Posting)' : 'Double-Entry Balanced GL Posting'}</span>
            </span>
            <span style={{
              background: 'var(--erp-accent-subtle, #eff6ff)',
              color: 'var(--erp-accent, #2563eb)',
              border: '1px solid color-mix(in srgb, var(--erp-accent) 20%, transparent)',
              padding: '0.12rem 0.55rem',
              borderRadius: '12px',
              fontSize: '0.68rem',
              fontWeight: 800
            }}>
              {isAr ? 'قيد يومية متزن 100%' : 'Balanced Journal Entry'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '0.2rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>{isAr ? 'الطرف المدين (Dr):' : 'Debit (Dr):'}</span>
              <div style={{ color: '#0F172A', fontWeight: 800, marginTop: '0.15rem' }}>
                {isAr ? 'الخزينة النقدية الرئيسية' : 'Cash Safe at HQ'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>{isAr ? 'الطرف الدائن (Cr):' : 'Credit (Cr):'}</span>
              <div style={{ color: '#0F172A', fontWeight: 800, marginTop: '0.15rem' }}>
                {isAr ? 'أوراق القبض والتسويات التعاقدية' : 'Notes Receivable'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={styles.stageContainer} style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
      <ZFPageHeader
        title={isAr ? 'أجندة المستحقات' : 'Dues agenda'}
        subtitle={isAr ? 'الأقساط المستحقة من العملاء والمبالغ المستحقة للمقاولين، كاش أو إنستاباي.' : 'Installments due from clients and amounts due to contractors, cash or InstaPay.'}
      />

      {/* 2. THE 4 DISCRETE FLOATING VAULT METRICS (With Wave Sparklines & Interactive Table Links) */}
      <ZFKpiGrid>
        {/* Card 1: Inflows (Client Dues) */}
        <ZFKpiCard
          title={isAr ? 'تحصيلات مجدولة (خارج الدفاتر)' : 'Scheduled collections (off-ledger)'}
          value={agendaKPIs.inflowsRemaining}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Wallet size={16} />}
          accentColor="emerald"
          showSparkline={kpiSeries[0].filter(value => value !== 0).length >= 2}
          sparklineData={kpiSeries[0]}
          delta={{
            value: `${agendaKPIs.inflowsCollectionRate}%`,
            label: isAr ? 'معدل التحصيل' : 'Collection rate'
          }}
          subtitleLabel={isAr ? 'المحصل' : 'Collected'}
          subtitleValue={`${agendaKPIs.inflowsClearedCount} / ${agendaKPIs.inflowsCount} ${isAr ? 'دفعة' : 'records'}`}
          onClick={() => {
            setDirectionFilter('inflows');
            setMaturityTab('all');
          }}
          style={directionFilter === 'inflows' ? { borderColor: '#10b981', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.2)' } : undefined}
          tooltip={isAr ? 'انقر لتصفية العرض على المقبوضات الواردة فقط' : 'Click to filter on Inflows only'}
        />

        {/* Card 2: Outflows (Contractors & Payables) */}
        <ZFKpiCard
          title={isAr ? 'المدفوعات والالتزامات (المقاولون والمصروفات)' : 'Outflow Payables (Contractors)'}
          value={agendaKPIs.outflowsTotal}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Coins size={16} />}
          accentColor="amber"
          showSparkline={kpiSeries[1].filter(value => value !== 0).length >= 2}
          sparklineData={kpiSeries[1]}
          delta={{
            value: `${agendaKPIs.outflowsSettlementRate}%`,
            label: isAr ? 'معدل التسوية' : 'Settlement rate'
          }}
          subtitleLabel={isAr ? 'المسدد' : 'Settled'}
          subtitleValue={`${agendaKPIs.outflowsPaidCount} / ${agendaKPIs.outflowsCount} ${isAr ? 'مستحق' : 'payables'}`}
          onClick={() => {
            setDirectionFilter('outflows');
            setMaturityTab('all');
          }}
          style={directionFilter === 'outflows' ? { borderColor: '#f59e0b', boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)' } : undefined}
          tooltip={isAr ? 'انقر لتصفية العرض على المدفوعات الصادرة فقط' : 'Click to filter on Outflows only'}
        />

        {/* Card 3: Net Cashflow (Treasury Spread) */}
        <ZFKpiCard
          title={isAr ? 'السيولة المتوقعة (نقدية + مجدول)' : 'Projected liquidity (cash + scheduled)'}
          value={projectedLiquidity}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<Layers size={16} />}
          accentColor={projectedLiquidity.gte(0) ? 'blue' : 'rose'}
          showSparkline={kpiSeries[2].filter(value => value !== 0).length >= 2}
          sparklineData={kpiSeries[2]}
          delta={{
            value: isAr ? (projectedLiquidity.gte(0) ? 'فائض سيولة' : 'عجز سيولة') : (projectedLiquidity.gte(0) ? 'Surplus' : 'Deficit'),
            isPositive: undefined
          }}
          subtitleLabel={isAr ? 'صافي المجدول' : 'Net scheduled'}
          subtitleValue={agendaKPIs.netScheduledFlow.formatEGP(isAr)}
          onClick={() => {
            setDirectionFilter('all');
            setMaturityTab('all');
          }}
          style={directionFilter === 'all' ? { borderColor: 'var(--erp-accent)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--erp-accent) 20%, transparent)' } : undefined}
          tooltip={isAr ? 'انقر لعرض الكل (المقبوضات + المدفوعات)' : 'Click to view all'}
        />

        {/* Card 4: Urgent Dues (Overdue + Due Today) */}
        <ZFKpiCard
          title={isAr ? 'الاستحقاقات العاجلة (متأخرات + اليوم)' : 'Urgent Dues (Overdue & Today)'}
          value={agendaKPIs.urgentSum}
          currency={isAr ? 'ج.م' : 'EGP'}
          icon={<AlertCircle size={16} />}
          accentColor={agendaKPIs.urgentCount > 0 ? 'rose' : 'slate'}
          showSparkline={kpiSeries[3].filter(value => value !== 0).length >= 2}
          sparklineData={kpiSeries[3]}
          delta={{
            value: `${agendaKPIs.urgentCount}`,
            isPositive: undefined
          }}
          subtitleLabel={isAr ? 'الحالات العاجلة' : 'Urgent Items'}
          subtitleValue={`${agendaKPIs.urgentCount} ${isAr ? 'استحقاق مطلوب' : 'urgent items'}`}
          onClick={() => {
            setMaturityTab('overdue');
            setSelectedCalendarDate(null);
          }}
          style={maturityTab === 'overdue' ? { borderColor: '#dc2626', boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.2)' } : undefined}
          tooltip={isAr ? 'انقر لتصفية كافة المتأخرات العاجلة' : 'Click to filter on urgent overdue dues'}
        />
      </ZFKpiGrid>

      {/* 3. DIRECTION SWITCH (Segmented Control) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem'
      }}>
        <div style={{
          display: 'inline-flex',
          background: '#f1f5f9',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1'
        }}>
          <button
            type="button"
            onClick={() => {
              setDirectionFilter('all');
              setCurrentPage(1);
            }}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              background: directionFilter === 'all' ? '#ffffff' : 'transparent',
              color: directionFilter === 'all' ? 'var(--erp-accent, #2563eb)' : '#64748b',
              fontWeight: directionFilter === 'all' ? 800 : 600,
              fontSize: '0.74rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isAr ? `الكل ${directionCounts.all}` : `All ${directionCounts.all}`}
          </button>

          <button
            type="button"
            onClick={() => {
              setDirectionFilter('inflows');
              setCurrentPage(1);
            }}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              background: directionFilter === 'inflows' ? '#ffffff' : 'transparent',
              color: directionFilter === 'inflows' ? '#10b981' : '#64748b',
              fontWeight: directionFilter === 'inflows' ? 800 : 600,
              fontSize: '0.74rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isAr ? `وارد من العملاء ${directionCounts.inflows}` : `Client Inflows ${directionCounts.inflows}`}
          </button>

          <button
            type="button"
            onClick={() => {
              setDirectionFilter('outflows');
              setCurrentPage(1);
            }}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              background: directionFilter === 'outflows' ? '#ffffff' : 'transparent',
              color: directionFilter === 'outflows' ? '#dc2626' : '#64748b',
              fontWeight: directionFilter === 'outflows' ? 800 : 600,
              fontSize: '0.74rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isAr ? `صادر للمقاولين ${directionCounts.outflows}` : `Payables Outflows ${directionCounts.outflows}`}
          </button>
        </div>

        <div style={{ fontSize: '0.74rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
          {isAr 
            ? `المعاملات المعروضة: ${sortedUnifiedRows.length} معاملة` 
            : `Showing: ${sortedUnifiedRows.length} records`}
        </div>
      </div>

      {/* 4. UNIFIED FILTER TOOLBAR */}
      <ZFFilterToolbar
        tabs={[
          { id: 'all', label: isAr ? 'الكل' : 'All', count: chipCounts.all },
          { id: 'overdue', label: isAr ? 'متأخر' : 'Overdue', count: chipCounts.overdue },
          { id: 'due_today', label: isAr ? 'مستحق اليوم' : 'Due Today', count: chipCounts.due_today },
          { id: 'due_week', label: isAr ? 'خلال 7 أيام' : 'Next 7 Days', count: chipCounts.due_week },
          { id: 'upcoming', label: isAr ? 'قادم' : 'Upcoming', count: chipCounts.upcoming },
          { id: 'cleared', label: isAr ? 'مسدد بالكامل' : 'Cleared / Paid', count: chipCounts.cleared }
        ]}
        activeTab={maturityTab}
        onTabChange={(tabId) => {
          setMaturityTab(tabId as any);
          setCurrentPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        searchPlaceholder={isAr ? 'بحث بالعميل، المستفيد، المشروع، رقم العقد أو الفاتورة...' : 'Search counterparty, project, contract or invoice...'}
        filters={[
          {
            id: 'agenda_status_select',
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val as any);
              setCurrentPage(1);
            },
            ariaLabel: isAr ? 'تصفية حسب الحالة' : 'Filter by status',
            options: [
              { value: 'all', label: isAr ? 'كل الحالات' : 'Status: All' },
              { value: 'pending', label: isAr ? 'قيد السداد والتحصيل' : 'Pending' },
              { value: 'overdue', label: isAr ? 'متأخر' : 'Overdue' },
              { value: 'cleared', label: isAr ? 'تم التحصيل والسداد' : 'Cleared / Settled' }
            ]
          }
        ]}
        sortBy={sortBy}
        onSortChange={(val) => {
          setSortBy(val);
        }}
        sortOptions={[
          { value: 'priority', label: isAr ? 'الأولوية: المتأخر ثم اليوم ثم الأقرب' : 'Priority: Overdue First' },
          { value: 'due_date_asc', label: isAr ? 'التاريخ: الأقرب الأول' : 'Date: Soonest First' },
          { value: 'due_date_desc', label: isAr ? 'التاريخ: الأبعد الأول' : 'Date: Latest First' },
          { value: 'nominal_desc', label: isAr ? 'المبلغ: الأكبر الأول' : 'Amount: High to Low' },
          { value: 'nominal_asc', label: isAr ? 'المبلغ: الأقل الأول' : 'Amount: Low to High' },
          { value: 'counterparty_asc', label: isAr ? 'الاسم: أ - ي' : 'Name: A to Z' }
        ]}
        sortAriaLabel={isAr ? 'ترتيب المعاملات' : 'Sort transactions'}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
        onViewModeChange={(m) => setViewMode(m)}
        customActions={selectedCalendarDate ? (
          <button
            type="button"
            onClick={() => {
              setSelectedCalendarDate(null);
              setCurrentPage(1);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              background: 'var(--erp-accent-subtle, #eff6ff)',
              color: 'var(--erp-accent, #2563eb)',
              border: '1px solid color-mix(in srgb, var(--erp-accent) 25%, transparent)',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <span>{isAr ? `يوم ${selectedCalendarDate} ✕` : `Date ${selectedCalendarDate} ✕`}</span>
          </button>
        ) : undefined}
        isAr={isAr}
      />

      {/* 5. EMPTY STATE */}
      {sortedUnifiedRows.length === 0 && (
        <div style={{
          padding: '3.5rem 2rem',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <Wallet size={36} color="var(--erp-accent, #2563eb)" style={{ margin: '0 auto 0.75rem auto' }} />
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            {isAr ? 'لا توجد تعاملات أو استحقاقات مالية مطابقة لشروط البحث أو التصفية' : 'No matching transactions found'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
            {isAr ? 'جرب تغيير شروط التصفية أو مسح خانة البحث والتقويم.' : 'Try changing the filters or clearing the date selection.'}
          </div>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className={styles.resetFilterBtn}
              style={{ marginTop: '1rem' }}
            >
              <RotateCcw size={13} />
              <span>{isAr ? 'إلغاء التصفية والرجوع للكل' : 'Reset all filters'}</span>
            </button>
          )}
        </div>
      )}

      {/* 6. REGISTER VIEW 1: UNIFIED SINGLE CANONICAL TABLE */}
      {viewMode === 'table' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            overflow: 'hidden',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box'
          }}>
            {/* Section Header Bar */}
            <div style={{
              padding: '0.85rem 1.15rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#fafbfc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: 'var(--erp-accent-subtle, #eff6ff)',
                  color: 'var(--erp-accent, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Wallet size={14} />
                </div>
                <div>
                  <h2 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {isAr ? 'أجندة المستحقات والمعاملات المالية' : 'Transactions & Financial Dues Agenda'}
                  </h2>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {isAr ? 'جدول موحد للمقبوضات والتحصيلات الواردة والمدفوعات والالتزامات الصادرة' : 'Unified ledger for scheduled incoming collections and outgoing contractor dues'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`${styles.statusPill} ${styles.statusPillNeutral}`} style={{ fontSize: '0.72rem', padding: '0.2rem 0.65rem' }}>
                  {sortedUnifiedRows.length} {isAr ? 'معاملة' : 'records'}
                </span>
              </div>
            </div>

            {/* Table Data */}
            {sortedUnifiedRows.length > 0 ? (
              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <table style={{ width: '100%', minWidth: '940px', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', color: '#475569' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'الاتجاه' : 'Direction'}</th>
                      {renderSortHeader('due_date', isAr ? 'تاريخ الاستحقاق' : 'Due Date', sortBy, setSortBy)}
                      {renderSortHeader('counterparty', isAr ? 'الطرف' : 'Party', sortBy, setSortBy)}
                      <th style={{ padding: '0.75rem 1rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'المشروع / الوحدة' : 'Project / Unit'}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'البيان' : 'Description'}</th>
                      {renderSortHeader('nominal', isAr ? 'القيمة' : 'Amount', sortBy, setSortBy)}
                      {renderSortHeader('remaining', isAr ? 'المتبقي' : 'Remaining', sortBy, setSortBy)}
                      <th style={{ padding: '0.75rem 1rem', textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'الحالة' : 'Status'}</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{isAr ? 'الإجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUnifiedRows.map((row) => {
                      const isInflow = row.direction === 'in';
                      const isCleared = isInflow ? row.status === 'cleared' : row.status === 'paid';

                      return (
                        <tr
                          key={row.id}
                          onClick={() => {
                            if (isInflow) {
                              setInspectingItemId(row.sourceItem.id);
                            }
                          }}
                          style={{
                            borderBottom: '1px solid #cbd5e1',
                            cursor: isInflow ? 'pointer' : 'default',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                        >
                          {/* 1. Direction Pill */}
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                            {isInflow ? (
                              <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                                {isAr ? '↓ وارد' : '↓ In'}
                              </span>
                            ) : (
                              <span className={`${styles.statusPill} ${styles.statusPillRed}`}>
                                {isAr ? '↑ صادر' : '↑ Out'}
                              </span>
                            )}
                          </td>

                          {/* 2. Due Date */}
                          <td style={{ padding: '0.75rem 1rem', color: row.status === 'overdue' ? '#dc2626' : '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Clock size={12} color={row.status === 'overdue' ? '#dc2626' : '#64748b'} />
                              <span>{row.dueDate}</span>
                            </div>
                          </td>

                          {/* 3. Counterparty */}
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>
                              {row.party}
                            </div>
                          </td>

                          {/* 4. Project / Unit */}
                          <td style={{ padding: '0.75rem 1rem', minWidth: '180px', maxWidth: '260px' }}>
                            <div style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row.projectLabel}
                            </div>
                            {row.unitLabel && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--erp-accent, #2563eb)', fontWeight: 600 }}>
                                {row.unitLabel}
                              </div>
                            )}
                          </td>

                          {/* 5. Description (Cost category Arabic label for outflow) */}
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                            {isInflow ? (
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '0.12rem 0.5rem',
                                borderRadius: '5px',
                                background: row.isDownPayment ? 'rgba(56, 189, 248, 0.08)' : 'var(--erp-accent-subtle, #eff6ff)',
                                color: row.isDownPayment ? '#0284c7' : 'var(--erp-accent, #2563eb)',
                                border: row.isDownPayment ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid color-mix(in srgb, var(--erp-accent) 20%, transparent)'
                              }}>
                                {row.description}
                              </span>
                            ) : (
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                  {row.costCategoryLabel}
                                </div>
                                {row.description && row.description !== row.costCategory && row.description !== row.costCategoryLabel && (
                                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px' }}>
                                    {row.description}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 6. Total Nominal Amount (No Decimals) */}
                          <td style={{ padding: '0.75rem 1rem', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {formatNoDecimals(row.total)}
                          </td>

                          {/* 7. Remaining Amount (No Decimals) */}
                          <td style={{
                            padding: '0.75rem 1rem',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 800,
                            color: isCleared ? '#16a34a' : (row.status === 'overdue' ? '#dc2626' : '#0f172a'),
                            whiteSpace: 'nowrap'
                          }}>
                            {formatNoDecimals(row.remaining)}
                          </td>

                          {/* 8. Status Pill */}
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                            {isInflow 
                              ? renderStatusPill(row.status)
                              : renderOutflowStatusPill(row.status)}
                          </td>

                          {/* 9. Actions */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                            {isInflow ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                                {isCleared ? (
                                  <>
                                    <button
                                      type="button"
                                      className={styles.btnSecondary}
                                      onClick={() => {
                                        setPrintingItemId(row.sourceItem.id);
                                        setPrintingDocType('receipt');
                                      }}
                                      title={isAr ? 'طباعة سند القبض الرسمي المعتمد' : 'Print Official Receipt Voucher'}
                                      style={{ padding: '0.32rem 0.55rem' }}
                                    >
                                      <Printer size={12} />
                                      <span>{isAr ? 'سند القبض' : 'Receipt'}</span>
                                    </button>
                                    <span style={{
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      color: '#16a34a',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}>
                                      <CheckCircle2 size={13} />
                                      <span>{isAr ? 'محصل بالكامل' : 'Cleared'}</span>
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className={styles.btnPrimary}
                                      onClick={() => handleTriggerCollect(row.sourceItem)}
                                      disabled={isMutating}
                                    >
                                      <Wallet size={12} />
                                      <span>{isAr ? 'تحصيل (كاش / إنستاباي)' : 'Collect'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.btnSecondary}
                                      onClick={() => {
                                        setPrintingItemId(row.sourceItem.id);
                                        setPrintingDocType('due_notice');
                                      }}
                                      title={isAr ? 'طباعة إشعار استحقاق ومطالبة سداد' : 'Print Installment Due Notice'}
                                      style={{ padding: '0.32rem 0.55rem' }}
                                    >
                                      <FileCheck size={12} />
                                      <span>{isAr ? 'إشعار استحقاق' : 'Notice'}</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                                {isCleared ? (
                                  <span style={{
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    color: '#16a34a',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}>
                                    <CheckCircle2 size={13} />
                                    <span>{isAr ? 'مسدد بالكامل' : 'Paid'}</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSettlingOutflowItem(row.sourceItem);
                                      setSettleAmount(row.sourceItem.remainingAmount);
                                      setSettleMethod(row.sourceItem.paymentMethod || 'CASH');
                                    }}
                                    disabled={isMutating}
                                    style={{
                                      background: '#d97706',
                                      border: 'none',
                                      color: '#ffffff',
                                      padding: '0.32rem 0.75rem',
                                      borderRadius: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <Coins size={12} />
                                    <span>{isAr ? 'سداد (كاش / إنستاباي)' : 'Settle'}</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1.5px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>
                      <td colSpan={5} style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                        <span>{isAr ? `المعروض: ${footerSummary.count}` : `Showing: ${footerSummary.count}`}</span>
                        <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>•</span>
                        <span>{isAr ? 'متبقٍ وارد ' : 'Remaining Inflows '}</span>
                        <span className="num" style={{ fontVariantNumeric: 'tabular-nums', color: '#16a34a' }}>
                          {formatNoDecimals(footerSummary.inflowsRemaining)}
                        </span>
                        <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>•</span>
                        <span>{isAr ? 'متبقٍ صادر ' : 'Remaining Outflows '}</span>
                        <span className="num" style={{ fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>
                          {formatNoDecimals(footerSummary.outflowsRemaining)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}></td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 800,
                        color: footerSummary.net.gte(0) ? '#16a34a' : '#dc2626',
                        direction: 'ltr',
                        textAlign: isAr ? 'left' : 'right',
                        whiteSpace: 'nowrap'
                      }}>
                        {footerSummary.net.gte(0) ? '+' : '−'}{formatNoDecimals(footerSummary.net.abs())}
                      </td>
                      <td colSpan={2} style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.74rem' }}>
                        {isAr ? 'صافي المتبقي' : 'Net Remaining'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                {isAr ? 'لا توجد معاملات مطابقة لشروط التصفية الحالية' : 'No matching transactions found'}
              </div>
            )}

            {/* Table Footer Pagination */}
            {sortedUnifiedRows.length > 0 && (
              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #cbd5e1', background: '#fafbfc' }}>
                <ZFPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={sortedUnifiedRows.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(sz) => {
                    setPageSize(sz);
                    setCurrentPage(1);
                  }}
                  isAr={isAr}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. REGISTER VIEW 2: CARDS GRID */}
      {viewMode === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className={styles.cardsGrid}>
            {paginatedUnifiedRows.map((row) => {
              const isInflow = row.direction === 'in';
              const isCleared = isInflow ? row.status === 'cleared' : row.status === 'paid';

              return (
                <div
                  key={row.id}
                  onClick={() => {
                    if (isInflow) {
                      setInspectingItemId(row.sourceItem.id);
                    }
                  }}
                  style={{
                    background: '#ffffff',
                    border: row.status === 'overdue' ? '1.5px solid rgba(220, 38, 38, 0.4)' : '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    cursor: isInflow ? 'pointer' : 'default',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--erp-accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = row.status === 'overdue' ? 'rgba(220, 38, 38, 0.4)' : '#cbd5e1')}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        {isInflow ? (
                          <span className={`${styles.statusPill} ${styles.statusPillGreen}`}>
                            {isAr ? '↓ وارد' : '↓ In'}
                          </span>
                        ) : (
                          <span className={`${styles.statusPill} ${styles.statusPillRed}`}>
                            {isAr ? '↑ صادر' : '↑ Out'}
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                          {row.dueDate}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                        {row.party}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                        {row.projectLabel}{row.unitLabel ? ` • ${row.unitLabel}` : (row.direction === 'out' ? ` • ${row.costCategoryLabel}` : '')}
                      </div>
                    </div>

                    {isInflow ? renderStatusPill(row.status) : renderOutflowStatusPill(row.status)}
                  </div>

                  {/* Amount Box */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                        {isAr ? 'القيمة:' : 'Amount:'}
                      </span>
                      <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {formatNoDecimals(row.total)}
                      </strong>
                    </div>

                    <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                        {isAr ? 'المتبقي:' : 'Remaining:'}
                      </span>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: isCleared ? '#16a34a' : (row.status === 'overdue' ? '#dc2626' : '#0f172a'),
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {formatNoDecimals(row.remaining)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.25rem' }} onClick={e => e.stopPropagation()}>
                    {isInflow ? (
                      <>
                        {!isCleared ? (
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={() => handleTriggerCollect(row.sourceItem)}
                            disabled={isMutating}
                            style={{ flex: 1 }}
                          >
                            <Wallet size={13} />
                            <span>{isAr ? 'تحصيل (كاش / إنستاباي)' : 'Collect'}</span>
                          </button>
                        ) : (
                          <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem',
                            borderRadius: '8px',
                            background: '#ecfdf5',
                            color: '#16a34a',
                            fontSize: '0.74rem',
                            fontWeight: 800
                          }}>
                            <CheckCircle2 size={13} />
                            <span>{isAr ? 'محصل بالكامل' : 'Cleared'}</span>
                          </div>
                        )}

                        {isCleared ? (
                          <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={() => {
                              setPrintingItemId(row.sourceItem.id);
                              setPrintingDocType('receipt');
                            }}
                          >
                            <Printer size={13} />
                            <span>{isAr ? 'سند القبض' : 'Receipt'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={() => {
                              setPrintingItemId(row.sourceItem.id);
                              setPrintingDocType('due_notice');
                            }}
                          >
                            <FileCheck size={13} />
                            <span>{isAr ? 'إشعار' : 'Notice'}</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {!isCleared ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSettlingOutflowItem(row.sourceItem);
                              setSettleAmount(row.sourceItem.remainingAmount);
                              setSettleMethod(row.sourceItem.paymentMethod || 'CASH');
                            }}
                            disabled={isMutating}
                            style={{
                              flex: 1,
                              background: '#d97706',
                              border: 'none',
                              color: '#ffffff',
                              padding: '0.42rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.3rem',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Coins size={13} />
                            <span>{isAr ? 'سداد (كاش / إنستاباي)' : 'Settle'}</span>
                          </button>
                        ) : (
                          <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem',
                            borderRadius: '8px',
                            background: '#ecfdf5',
                            color: '#16a34a',
                            fontSize: '0.74rem',
                            fontWeight: 800
                          }}>
                            <CheckCircle2 size={13} />
                            <span>{isAr ? 'مسدد بالكامل' : 'Paid'}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: '0.75rem 0' }}>
            <ZFPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedUnifiedRows.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
              isAr={isAr}
            />
          </div>
        </div>
      )}

      {/* 7.5 SETTLE OUTFLOW MODAL (Direct Settlement for Contractors & Payables) */}
      {settlingOutflowItem && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setSettlingOutflowItem(null)}
        >
          <div 
            style={{ 
              maxWidth: '520px', 
              width: '100%', 
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#fafbfc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Coins size={18} color="#d97706" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {isAr ? 'سداد مستحقات المقاول / المورد' : 'Settle Contractor / Supplier Payable'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettlingOutflowItem(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Item Info Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#64748b' }}>{isAr ? 'المستفيد / المقاول:' : 'Beneficiary:'}</span>
                  <strong style={{ color: '#0f172a' }}>{settlingOutflowItem.beneficiary}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#64748b' }}>{isAr ? 'المشروع والبيان:' : 'Project & Item:'}</span>
                  <strong style={{ color: '#0f172a' }}>{settlingOutflowItem.projectTitle} • {settlingOutflowItem.description}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#64748b' }}>{isAr ? 'القيمة الإجمالية:' : 'Total Amount:'}</span>
                  <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{D(settlingOutflowItem.totalAmount).formatEGP(isAr)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '0.4rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>{isAr ? 'المتبقي المستحق للسداد:' : 'Remaining Due:'}</span>
                  <strong style={{ color: '#d97706', fontVariantNumeric: 'tabular-nums', fontSize: '0.92rem' }}>
                    {D(settlingOutflowItem.remainingAmount).formatEGP(isAr)}
                  </strong>
                </div>
              </div>

              {/* Amount to pay */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'المبلغ المراد سداده الآن (ج.م):' : 'Amount to pay now (EGP):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    fontVariantNumeric: 'tabular-nums',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Payment Method Selector (Strictly Cash or InstaPay) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'طريقة وقناة السداد المعتمدة (الخزينة النقدية 101000):' : 'Payment Method (Safe 101000):'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setSettleMethod('CASH')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: settleMethod === 'CASH' ? '2px solid var(--erp-accent)' : '1px solid #cbd5e1',
                      background: settleMethod === 'CASH' ? 'var(--erp-accent-subtle)' : '#ffffff',
                      color: settleMethod === 'CASH' ? 'var(--erp-accent)' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Wallet size={15} />
                    <span>{isAr ? 'نقدي' : 'Cash'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettleMethod('INSTAPAY')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: settleMethod === 'INSTAPAY' ? '2px solid var(--erp-accent)' : '1px solid #cbd5e1',
                      background: settleMethod === 'INSTAPAY' ? 'var(--erp-accent-subtle)' : '#ffffff',
                      color: settleMethod === 'INSTAPAY' ? 'var(--erp-accent)' : '#334155',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <CreditCard size={15} />
                    <span>{isAr ? 'إنستاباي' : 'InstaPay'}</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {isAr ? 'ملاحظات السداد أو مرجع التحويل:' : 'Payment Memo / Ref:'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: سداد دفعة خرسانة مسلحة نقدياً بالخزينة...' : 'Optional memo or ref...'}
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSettlingOutflowItem(null)}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={handleSettleOutflow}
                  disabled={isSettling || !settleAmount || D(settleAmount).lte(0)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#d97706',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    opacity: isSettling || !settleAmount || D(settleAmount).lte(0) ? 0.6 : 1
                  }}
                >
                  {isSettling ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تأكيد السداد وتوريد القيد' : 'Confirm Settlement')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. SIDEBAR COMPANION WIDGETS (Portaled into dedicated 3rd column) */}
      <ZFWorkstationSideWidgets
        title={isAr ? 'أجندة الخزينة والتحليلات' : 'Vault Agenda & Analytics'}
        badge={todayAgendaItems.length > 0 ? (isAr ? `${todayAgendaItems.length} اليوم` : `${todayAgendaItems.length} Today`) : undefined}
        icon={<Calendar size={15} />}
      >
        <div className="sideWidgetsWrap" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
          {/* Card 1: Calendar & Today's Real Dues Agenda */}
          <ZFWidgetCard
            id="zf-side-widget-calendar"
            title={isAr ? 'أجندة الاستحقاقات والتقويم' : 'Dues Agenda & Calendar'}
            icon={<Calendar size={15} />}
            badge={todayAgendaItems.length > 0 ? (
              <span className={`${styles.statusPill} ${styles.statusPillAmber}`} style={{ fontSize: '0.68rem', padding: '1px 7px' }}>
                {todayAgendaItems.length} {isAr ? 'مستحق اليوم' : 'due today'}
              </span>
            ) : undefined}
            defaultExpanded={true}
            isAr={isAr}
          >
            <InstallmentsMonthCalendar
              rows={allUnifiedRows}
              selectedDate={selectedCalendarDate}
              onSelectDate={(date) => {
                setSelectedCalendarDate(date);
                setCurrentPage(1);
              }}
              isAr={isAr}
              onInspectItem={(id) => {
                setInspectingItemId(id);
              }}
            />
          </ZFWidgetCard>

          {/* Cards 2, 3, 4: Analytics Charts (Trend, Status Donut, Project Breakdown) */}
          <InstallmentsAnalyticsCharts
            items={projectedItems}
            kpis={vaultKPIs}
            isAr={isAr}
            variant="rail"
          />
        </div>
      </ZFWorkstationSideWidgets>

      {/* 9. SLIDE-OVER DETAIL INSPECTION DRAWER (Slice 3) */}
      <InstallmentDetailDrawer
        isOpen={Boolean(inspectingItem)}
        onClose={() => setInspectingItemId(null)}
        item={inspectingItem}
        isAr={isAr}
        isMutating={isMutating}
        onCollect={handleTriggerCollect}
        onStatusChange={onPDCStatusChange}
        onBounce={(pdc) => onBounceItem ? onBounceItem(pdc) : undefined}
        onPrintReceipt={(it) => {
          setPrintingItemId(it.id);
          setPrintingDocType('receipt');
        }}
        onPrintDueNotice={(it) => {
          setPrintingItemId(it.id);
          setPrintingDocType('due_notice');
        }}
      />

      {/* 10. TRUTHFUL DOCUMENT PRINT & PREVIEW MODAL */}
      {printingItem && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}
          onClick={() => setPrintingItemId(null)}
        >
          <div 
            style={{ 
              maxWidth: '850px', 
              width: '100%', 
              maxHeight: '94vh', 
              overflowY: 'auto',
              borderRadius: '12px',
              border: '1.5px solid #D8D2C4',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <ZFPrintDocumentLayout
              documentTitle={printingDocType === 'receipt' ? (isAr ? 'سند قبض نقدية رسمي معتمد' : 'Official Cash Receipt Voucher') : (isAr ? 'إشعار استحقاق ومطالبة سداد قسط تعاقدي' : 'Contract Installment Due Notice')}
              documentSubtitle={printingDocType === 'receipt' ? (isAr ? 'توريد نقدي فوري بالخزينة الرئيسية مثبت محاسبياً' : 'Verified Safe Receipt') : (isAr ? 'مطالبة رسمية بسداد دفعة مستحقة بموجب عقد البيع' : 'Formal Payment Demand')}
              voucherCode={printingDocType === 'receipt' ? printingItem.instrumentNumber : `NOT-${printingItem.instrumentNumber}`}
              date={printingDocType === 'receipt' ? (printingItem.clearedDate || todayStr) : todayStr}
              onClose={() => setPrintingItemId(null)}
              isAr={isAr}
            >
              {printDocumentBody}
            </ZFPrintDocumentLayout>
          </div>
        </div>
      )}

      {/* Hidden print container: rendered for @media print */}
      {printingItem && (
        <div className="zf-print-only">
          <ZFPrintDocumentLayout
            documentTitle={printingDocType === 'receipt' ? (isAr ? 'سند قبض نقدية رسمي معتمد' : 'Official Cash Receipt Voucher') : (isAr ? 'إشعار استحقاق ومطالبة سداد قسط تعاقدي' : 'Contract Installment Due Notice')}
            documentSubtitle={printingDocType === 'receipt' ? (isAr ? 'توريد نقدي فوري بالخزينة الرئيسية مثبت محاسبياً' : 'Verified Safe Receipt') : (isAr ? 'مطالبة رسمية بسداد دفعة مستحقة بموجب عقد البيع' : 'Formal Payment Demand')}
            voucherCode={printingDocType === 'receipt' ? printingItem.instrumentNumber : `NOT-${printingItem.instrumentNumber}`}
            date={printingDocType === 'receipt' ? (printingItem.clearedDate || todayStr) : todayStr}
            isAr={isAr}
          >
            {printDocumentBody}
          </ZFPrintDocumentLayout>
        </div>
      )}
    </div>
  );
};
