import { D, Decimal } from './math';
import { ProjectedVaultItem, VaultItemStatus, getDistinctiveUnit, getLocalTodayStr } from './installmentsVaultProjection';
import { ProjectedOutflowItem, AgendaOutflowStatus } from './financialAgendaProjection';
import { PROPERTY_COST_CATEGORIES } from './propertyCostEngine';

export type AgendaDirection = 'in' | 'out';
export type AgendaDirectionFilter = 'all' | 'inflows' | 'outflows';
export type AgendaMaturityTab = 'all' | 'overdue' | 'due_today' | 'due_week' | 'upcoming' | 'cleared';
export type AgendaStatusFilter = 'all' | 'pending' | 'cleared' | 'overdue';

export interface UnifiedAgendaRowInflow {
  id: string;
  direction: 'in';
  dueDate: string;
  party: string;
  projectLabel: string;
  unitLabel?: string;
  description: string;
  total: string;
  paid: string;
  remaining: string;
  status: VaultItemStatus;
  paymentMethod: 'CASH' | 'INSTAPAY';
  isDownPayment?: boolean;
  sourceItem: ProjectedVaultItem;
}

export interface UnifiedAgendaRowOutflow {
  id: string;
  direction: 'out';
  dueDate: string;
  party: string;
  projectLabel: string;
  unitLabel?: undefined;
  description: string;
  costCategory: string;
  costCategoryLabel: string;
  total: string;
  paid: string;
  remaining: string;
  status: AgendaOutflowStatus;
  paymentMethod: 'CASH' | 'INSTAPAY';
  sourceItem: ProjectedOutflowItem;
}

export type UnifiedAgendaRow = UnifiedAgendaRowInflow | UnifiedAgendaRowOutflow;

export interface AgendaFilterOptions {
  direction?: AgendaDirectionFilter;
  maturityTab?: AgendaMaturityTab;
  statusFilter?: AgendaStatusFilter;
  searchQuery?: string;
  calendarDate?: string | null;
  todayStr?: string;
}

export interface AgendaFooterSummary {
  count: number;
  inflowsRemaining: Decimal;
  outflowsRemaining: Decimal;
  net: Decimal;
}

export interface CalendarDayBucket {
  dots: Array<'in' | 'out' | 'late'>;
  items: UnifiedAgendaRow[];
  dayNet: Decimal;
  hasInflow: boolean;
  hasOutflow: boolean;
  hasOverdue: boolean;
}

/**
 * Maps raw cost category code to localized label
 */
export function getCostCategoryLabel(category?: string, isAr: boolean = true): string {
  if (!category) return isAr ? 'مصروفات وتكاليف عامة' : 'General Costs';
  const match = PROPERTY_COST_CATEGORIES.find(c => c.key === category);
  if (match) return isAr ? match.nameAr : match.nameEn;
  if (category === 'civil_structure') return isAr ? 'خرسانات وهيكل إنشائي' : 'Civil & Structure';
  return category;
}

/**
 * Builds the canonical unified row model from discrete inflow and outflow projections.
 */
export function buildUnifiedAgendaRows(
  inflows: ProjectedVaultItem[] = [],
  outflows: ProjectedOutflowItem[] = [],
  isAr: boolean = true
): UnifiedAgendaRow[] {
  const rows: UnifiedAgendaRow[] = [];

  for (const item of inflows) {
    const distinctiveUnit = getDistinctiveUnit(item.projectTitle, item.unitId);
    rows.push({
      id: item.id,
      direction: 'in',
      dueDate: item.dueDate || '',
      party: item.buyerName || '',
      projectLabel: item.projectTitle || '',
      unitLabel: distinctiveUnit || undefined,
      description: item.description || '',
      total: item.nominalValue || '0.00',
      paid: item.amountPaid || '0.00',
      remaining: item.remainingAmount || '0.00',
      status: item.status,
      paymentMethod: item.paymentMethod === 'INSTAPAY' ? 'INSTAPAY' : 'CASH',
      isDownPayment: item.isDownPayment,
      sourceItem: item
    });
  }

  for (const item of outflows) {
    rows.push({
      id: item.id,
      direction: 'out',
      dueDate: item.dueDate || '',
      party: item.beneficiary || '',
      projectLabel: item.projectTitle || '',
      unitLabel: undefined,
      description: item.description || '',
      costCategory: item.costCategory || '',
      costCategoryLabel: getCostCategoryLabel(item.costCategory, isAr),
      total: item.totalAmount || '0.00',
      paid: item.paidAmount || '0.00',
      remaining: item.remainingAmount || '0.00',
      status: item.status,
      paymentMethod: item.paymentMethod || 'CASH',
      sourceItem: item
    });
  }

  return rows;
}

/**
 * Filters unified agenda rows based on direction, maturity, status, search, and calendar date.
 */
export function filterAgendaRows(
  rows: UnifiedAgendaRow[],
  options: AgendaFilterOptions = {}
): UnifiedAgendaRow[] {
  const {
    direction = 'all',
    maturityTab = 'all',
    statusFilter = 'all',
    searchQuery = '',
    calendarDate = null,
    todayStr = getLocalTodayStr()
  } = options;

  const nextWeek = new Date(todayStr);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  const q = searchQuery.trim().toLowerCase();

  return rows.filter(row => {
    // 1. Direction Filter
    if (direction === 'inflows' && row.direction !== 'in') return false;
    if (direction === 'outflows' && row.direction !== 'out') return false;

    // 2. Calendar Date Filter
    if (calendarDate && row.dueDate !== calendarDate) return false;

    // 3. Status Filter Dropdown
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue' && row.status !== 'overdue') return false;
      if (statusFilter === 'cleared') {
        if (row.direction === 'in' && row.status !== 'cleared') return false;
        if (row.direction === 'out' && row.status !== 'paid') return false;
      }
      if (statusFilter === 'pending') {
        if (row.direction === 'in' && row.status === 'cleared') return false;
        if (row.direction === 'out' && row.status === 'paid') return false;
      }
    }

    // 4. Search Query
    if (q) {
      const matchParty = (row.party || '').toLowerCase().includes(q);
      const matchProject = (row.projectLabel || '').toLowerCase().includes(q);
      const matchUnit = (row.unitLabel || '').toLowerCase().includes(q);
      const matchDesc = (row.description || '').toLowerCase().includes(q);
      let matchSpecific = false;
      if (row.direction === 'in') {
        const inst = (row.sourceItem.instrumentNumber || '').toLowerCase();
        const cnt = (row.sourceItem.contractNumber || '').toLowerCase();
        matchSpecific = inst.includes(q) || cnt.includes(q);
      } else {
        const cat = (row.costCategory || '').toLowerCase();
        const catLbl = (row.costCategoryLabel || '').toLowerCase();
        const inv = (row.sourceItem.invoiceRef || '').toLowerCase();
        matchSpecific = cat.includes(q) || catLbl.includes(q) || inv.includes(q);
      }

      if (!matchParty && !matchProject && !matchUnit && !matchDesc && !matchSpecific) {
        return false;
      }
    }

    // 5. Maturity Tab Filter
    if (maturityTab === 'overdue') {
      if (row.status !== 'overdue') return false;
    } else if (maturityTab === 'due_today') {
      if (row.status !== 'due_today') return false;
    } else if (maturityTab === 'due_week') {
      const isCleared = row.direction === 'in' ? row.status === 'cleared' : row.status === 'paid';
      if (row.dueDate < todayStr || row.dueDate > nextWeekStr || isCleared) {
        return false;
      }
    } else if (maturityTab === 'upcoming') {
      if (row.direction === 'in') {
        if (row.status !== 'upcoming' && row.status !== 'in_safe') return false;
      } else {
        if (row.status !== 'upcoming') return false;
      }
    } else if (maturityTab === 'cleared') {
      if (row.direction === 'in' && row.status !== 'cleared') return false;
      if (row.direction === 'out' && row.status !== 'paid') return false;
    }

    return true;
  });
}

/**
 * Computes exact maturity tab chip counts derived from the SAME subset of rows
 * matching the current direction, search, status, and calendar date filter.
 */
export function calculateAgendaChipCounts(
  rows: UnifiedAgendaRow[],
  options: Omit<AgendaFilterOptions, 'maturityTab'> = {}
): Record<AgendaMaturityTab, number> {
  const { todayStr = getLocalTodayStr() } = options;
  const nextWeek = new Date(todayStr);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  // Base rows matching everything EXCEPT the maturity tab itself
  const baseRows = filterAgendaRows(rows, {
    ...options,
    maturityTab: 'all'
  });

  let overdue = 0;
  let due_today = 0;
  let due_week = 0;
  let upcoming = 0;
  let cleared = 0;

  for (const row of baseRows) {
    if (row.status === 'overdue') {
      overdue += 1;
    }
    if (row.status === 'due_today') {
      due_today += 1;
    }

    const isCleared = row.direction === 'in' ? row.status === 'cleared' : row.status === 'paid';
    if (!isCleared && row.dueDate >= todayStr && row.dueDate <= nextWeekStr) {
      due_week += 1;
    }

    if (row.direction === 'in') {
      if (row.status === 'upcoming' || row.status === 'in_safe') upcoming += 1;
      if (row.status === 'cleared') cleared += 1;
    } else {
      if (row.status === 'upcoming') upcoming += 1;
      if (row.status === 'paid') cleared += 1;
    }
  }

  return {
    all: baseRows.length,
    overdue,
    due_today,
    due_week,
    upcoming,
    cleared
  };
}

/**
 * Universal multi-criteria column sorter for Unified Agenda Rows.
 * BUG FIX: 'priority' orders overdue first, then today, then ASCENDING due date.
 */
export function sortAgendaRows(
  rows: UnifiedAgendaRow[],
  sortBy: string,
  isAr: boolean = true
): UnifiedAgendaRow[] {
  const list = [...rows];
  list.sort((a, b) => {
    switch (sortBy) {
      case 'due_date_asc':
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      case 'due_date_desc':
        return (b.dueDate || '').localeCompare(a.dueDate || '');
      case 'nominal_desc':
      case 'total_desc':
        return D(b.total || 0).minus(D(a.total || 0)).toNumber();
      case 'nominal_asc':
      case 'total_asc':
        return D(a.total || 0).minus(D(b.total || 0)).toNumber();
      case 'remaining_desc':
        return D(b.remaining || 0).minus(D(a.remaining || 0)).toNumber();
      case 'remaining_asc':
        return D(a.remaining || 0).minus(D(b.remaining || 0)).toNumber();
      case 'counterparty_asc':
        return (a.party || '').localeCompare(b.party || '', isAr ? 'ar' : 'en');
      case 'counterparty_desc':
        return (b.party || '').localeCompare(a.party || '', isAr ? 'ar' : 'en');
      case 'priority':
      default: {
        const getPriorityRank = (status: string) => {
          if (status === 'overdue') return 1;
          if (status === 'due_today') return 2;
          return 3;
        };
        const rankA = getPriorityRank(a.status);
        const rankB = getPriorityRank(b.status);
        if (rankA !== rankB) return rankA - rankB;

        // Invariant: when ranks are identical, sort by ascending due date
        const dateCmp = (a.dueDate || '').localeCompare(b.dueDate || '');
        if (dateCmp !== 0) return dateCmp;

        return D(b.remaining || 0).minus(D(a.remaining || 0)).toNumber();
      }
    }
  });
  return list;
}

/**
 * Computes footer summary: count, remaining inflows, remaining outflows, and net.
 */
export function calculateAgendaFooter(rows: UnifiedAgendaRow[]): AgendaFooterSummary {
  let inflowsRemaining = D(0);
  let outflowsRemaining = D(0);

  for (const row of rows) {
    if (row.direction === 'in') {
      inflowsRemaining = inflowsRemaining.plus(D(row.remaining || '0'));
    } else {
      outflowsRemaining = outflowsRemaining.plus(D(row.remaining || '0'));
    }
  }

  const net = inflowsRemaining.minus(outflowsRemaining);

  return {
    count: rows.length,
    inflowsRemaining,
    outflowsRemaining,
    net
  };
}

/**
 * Derives calendar day dots and signed day net for a given date.
 */
export function getCalendarDayBuckets(
  rows: UnifiedAgendaRow[],
  dateStr: string,
  _todayStr: string = getLocalTodayStr()
): CalendarDayBucket {
  const items = rows.filter(r => r.dueDate === dateStr);
  const hasOverdue = items.some(r => r.status === 'overdue');
  const hasInflow = items.some(r => r.direction === 'in' && r.status !== 'overdue');
  const hasOutflow = items.some(r => r.direction === 'out' && r.status !== 'overdue');

  const dots: Array<'in' | 'out' | 'late'> = [];
  if (hasInflow) dots.push('in');
  if (hasOutflow) dots.push('out');
  if (hasOverdue) dots.push('late');

  let dayNet = D(0);
  for (const item of items) {
    const rem = D(item.remaining || '0');
    if (item.direction === 'in') {
      dayNet = dayNet.plus(rem);
    } else {
      dayNet = dayNet.minus(rem);
    }
  }

  return {
    dots,
    items,
    dayNet,
    hasInflow,
    hasOutflow,
    hasOverdue
  };
}
