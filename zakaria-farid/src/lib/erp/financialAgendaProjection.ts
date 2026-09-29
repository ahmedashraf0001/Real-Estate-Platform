import { ERPPropertyCostItem, ERPPayableInstallment } from './types';
import { Property } from '@/lib/supabase/types';
import { D, Decimal } from './math';
import { ProjectedVaultItem, getLocalTodayStr } from './installmentsVaultProjection';

export type AgendaOutflowStatus = 'overdue' | 'due_today' | 'upcoming' | 'paid';

export interface ProjectedOutflowItem {
  id: string;
  costItemId: string;
  installmentId?: string;
  propertyId: string;
  projectTitle: string;
  beneficiary: string; // Contractor, supplier or payee
  costCategory: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  status: AgendaOutflowStatus;
  paymentMethod: 'CASH' | 'INSTAPAY';
  invoiceRef?: string;
  rawCostItem: ERPPropertyCostItem;
  rawInstallment?: ERPPayableInstallment;
}

export interface FinancialAgendaKPIs {
  // Inflows (Client Dues)
  inflowsTotal: Decimal;
  inflowsCount: number;
  inflowsOverdue: Decimal;
  inflowsOverdueCount: number;
  inflowsDueToday: Decimal;
  inflowsDueTodayCount: number;
  inflowsDueWeek: Decimal;
  inflowsDueWeekCount: number;
  inflowsCleared: Decimal;
  inflowsClearedCount: number;
  inflowsCollectionRate: number;

  // Outflows (Contractor & Expenses Payables)
  outflowsTotal: Decimal;
  outflowsCount: number;
  outflowsOverdue: Decimal;
  outflowsOverdueCount: number;
  outflowsDueToday: Decimal;
  outflowsDueTodayCount: number;
  outflowsDueWeek: Decimal;
  outflowsDueWeekCount: number;
  outflowsPaid: Decimal;
  outflowsPaidCount: number;
  outflowsSettlementRate: number;

  // Net Liquidity Position
  netProjectedCashflow: Decimal; // Inflows - Outflows
  urgentCount: number; // overdue + due today across both
  urgentSum: Decimal;
}

export interface AgendaProjectionOptions {
  isAr?: boolean;
  referenceDate?: string;
}

/**
 * Normalizes date strings to strict YYYY-MM-DD
 */
function normalizeDateStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
}

/**
 * Builds projected Outflow items from property cost items and scheduled payable installments.
 */
export function buildProjectedOutflowItems(
  propertyCosts: ERPPropertyCostItem[] = [],
  properties: Property[] = [],
  options: AgendaProjectionOptions = {}
): ProjectedOutflowItem[] {
  const { isAr = true, referenceDate = getLocalTodayStr() } = options;
  const projectMap = new Map<string, string>();
  properties.forEach(p => {
    projectMap.set(p.id, isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar));
  });

  const outflows: ProjectedOutflowItem[] = [];

  for (const cost of propertyCosts) {
    const propertyId = cost.property_id || '';
    const projectTitle = projectMap.get(propertyId) || (isAr ? 'مشروع عقاري عام' : 'General Property');
    const beneficiary = cost.supplier_contractor || (isAr ? 'مقاول / مورد معتمد' : 'Contractor / Vendor');
    const costCategory = cost.category || 'CONSTRUCTION';

    // If cost item has discrete scheduled payable installments
    if (cost.payable_installments && cost.payable_installments.length > 0) {
      for (const inst of cost.payable_installments) {
        const dueDate = normalizeDateStr(inst.due_date || cost.due_date || cost.logged_date || referenceDate);
        const totalVal = inst.amount_egp || '0.00';
        const paidVal = inst.paid_amount_egp || '0.00';
        const remainingVal = Math.max(0, D(totalVal).minus(D(paidVal)).toNumber()).toFixed(2);

        let status: AgendaOutflowStatus = 'upcoming';
        if (inst.status === 'PAID' || D(remainingVal).lte(0.001)) {
          status = 'paid';
        } else if (dueDate < referenceDate) {
          status = 'overdue';
        } else if (dueDate === referenceDate) {
          status = 'due_today';
        } else {
          status = 'upcoming';
        }

        // Strictly Cash or InstaPay
        const method: 'CASH' | 'INSTAPAY' = inst.payment_method?.includes('INSTAPAY') ? 'INSTAPAY' : 'CASH';

        outflows.push({
          id: inst.installment_id || `${cost.item_id || cost.id}_inst_${inst.installment_number}`,
          costItemId: cost.item_id || cost.id || '',
          installmentId: inst.installment_id,
          propertyId,
          projectTitle,
          beneficiary,
          costCategory,
          description: isAr ? (inst.title_ar || cost.item_name_ar) : (inst.title_en || cost.item_name_en || cost.item_name_ar),
          dueDate,
          totalAmount: D(totalVal).toFixed(2),
          paidAmount: D(paidVal).toFixed(2),
          remainingAmount: remainingVal,
          status,
          paymentMethod: method,
          invoiceRef: cost.invoice_ref,
          rawCostItem: cost,
          rawInstallment: inst
        });
      }
    } else {
      // Direct / single cost item with payment term
      const totalVal = cost.total_cost_egp || String(cost.total_amount || '0.00');
      const paidVal = cost.paid_amount_egp || (cost.payment_term === 'FULL_CASH' ? totalVal : '0.00');
      const remainingVal = cost.remaining_amount_egp !== undefined 
        ? cost.remaining_amount_egp 
        : Math.max(0, D(totalVal).minus(D(paidVal)).toNumber()).toFixed(2);
      const dueDate = normalizeDateStr(cost.due_date || cost.logged_date || referenceDate);

      let status: AgendaOutflowStatus = 'upcoming';
      if (D(remainingVal).lte(0.001)) {
        status = 'paid';
      } else if (dueDate < referenceDate) {
        status = 'overdue';
      } else if (dueDate === referenceDate) {
        status = 'due_today';
      } else {
        status = 'upcoming';
      }

      outflows.push({
        id: cost.item_id || cost.id || `cost-${Math.random()}`,
        costItemId: cost.item_id || cost.id || '',
        propertyId,
        projectTitle,
        beneficiary,
        costCategory,
        description: isAr ? cost.item_name_ar : (cost.item_name_en || cost.item_name_ar),
        dueDate,
        totalAmount: D(totalVal).toFixed(2),
        paidAmount: D(paidVal).toFixed(2),
        remainingAmount: remainingVal,
        status,
        paymentMethod: 'CASH',
        invoiceRef: cost.invoice_ref,
        rawCostItem: cost
      });
    }
  }

  return outflows;
}

/**
 * Calculates consolidated KPIs across both Inflows (Client Dues) and Outflows (Contractor Payables).
 */
export function calculateFinancialAgendaKPIs(
  inflows: ProjectedVaultItem[] = [],
  outflows: ProjectedOutflowItem[] = [],
  referenceDate: string = getLocalTodayStr()
): FinancialAgendaKPIs {
  const nextWeek = new Date(referenceDate);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  // 1. Inflows Calculation
  let inflowsTotal = D(0);
  let inflowsCount = 0;
  let inflowsOverdue = D(0);
  let inflowsOverdueCount = 0;
  let inflowsDueToday = D(0);
  let inflowsDueTodayCount = 0;
  let inflowsDueWeek = D(0);
  let inflowsDueWeekCount = 0;
  let inflowsCleared = D(0);
  let inflowsClearedCount = 0;

  for (const item of inflows) {
    const nominal = D(item.nominalValue || 0);
    const remaining = D(item.remainingAmount || 0);
    const paid = D(item.amountPaid || (item.status === 'cleared' ? item.nominalValue : 0));

    inflowsTotal = inflowsTotal.plus(nominal);
    inflowsCount += 1;

    if (item.status === 'cleared') {
      inflowsCleared = inflowsCleared.plus(paid);
      inflowsClearedCount += 1;
    } else if (item.status === 'overdue') {
      inflowsOverdue = inflowsOverdue.plus(remaining);
      inflowsOverdueCount += 1;
    } else if (item.status === 'due_today') {
      inflowsDueToday = inflowsDueToday.plus(remaining);
      inflowsDueTodayCount += 1;
    }

    if (item.status !== 'cleared' && item.dueDate >= referenceDate && item.dueDate <= nextWeekStr) {
      inflowsDueWeek = inflowsDueWeek.plus(remaining);
      inflowsDueWeekCount += 1;
    }
  }

  const inflowsCollectionRate = inflowsTotal.gt(0)
    ? Math.round((inflowsCleared.toNumber() / inflowsTotal.toNumber()) * 100)
    : 0;

  // 2. Outflows Calculation
  let outflowsTotal = D(0);
  let outflowsCount = 0;
  let outflowsOverdue = D(0);
  let outflowsOverdueCount = 0;
  let outflowsDueToday = D(0);
  let outflowsDueTodayCount = 0;
  let outflowsDueWeek = D(0);
  let outflowsDueWeekCount = 0;
  let outflowsPaid = D(0);
  let outflowsPaidCount = 0;

  for (const item of outflows) {
    const total = D(item.totalAmount || 0);
    const remaining = D(item.remainingAmount || 0);
    const paid = D(item.paidAmount || 0);

    outflowsTotal = outflowsTotal.plus(total);
    outflowsCount += 1;

    if (item.status === 'paid') {
      outflowsPaid = outflowsPaid.plus(paid);
      outflowsPaidCount += 1;
    } else if (item.status === 'overdue') {
      outflowsOverdue = outflowsOverdue.plus(remaining);
      outflowsOverdueCount += 1;
    } else if (item.status === 'due_today') {
      outflowsDueToday = outflowsDueToday.plus(remaining);
      outflowsDueTodayCount += 1;
    }

    if (item.status !== 'paid' && item.dueDate >= referenceDate && item.dueDate <= nextWeekStr) {
      outflowsDueWeek = outflowsDueWeek.plus(remaining);
      outflowsDueWeekCount += 1;
    }
  }

  const outflowsSettlementRate = outflowsTotal.gt(0)
    ? Math.round((outflowsPaid.toNumber() / outflowsTotal.toNumber()) * 100)
    : 0;

  // 3. Consolidated Net Liquidity
  const netProjectedCashflow = inflowsTotal.minus(outflowsTotal);
  const urgentCount = inflowsOverdueCount + inflowsDueTodayCount + outflowsOverdueCount + outflowsDueTodayCount;
  const urgentSum = inflowsOverdue.plus(inflowsDueToday).plus(outflowsOverdue).plus(outflowsDueToday);

  return {
    inflowsTotal,
    inflowsCount,
    inflowsOverdue,
    inflowsOverdueCount,
    inflowsDueToday,
    inflowsDueTodayCount,
    inflowsDueWeek,
    inflowsDueWeekCount,
    inflowsCleared,
    inflowsClearedCount,
    inflowsCollectionRate,

    outflowsTotal,
    outflowsCount,
    outflowsOverdue,
    outflowsOverdueCount,
    outflowsDueToday,
    outflowsDueTodayCount,
    outflowsDueWeek,
    outflowsDueWeekCount,
    outflowsPaid,
    outflowsPaidCount,
    outflowsSettlementRate,

    netProjectedCashflow,
    urgentCount,
    urgentSum
  };
}

/**
 * Universal multi-criteria column sorter for Inflows
 */
export function sortInflowItems(
  items: ProjectedVaultItem[],
  sortBy: string,
  isAr: boolean = true
): ProjectedVaultItem[] {
  const list = [...items];
  list.sort((a, b) => {
    switch (sortBy) {
      case 'due_date_asc':
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      case 'due_date_desc':
        return (b.dueDate || '').localeCompare(a.dueDate || '');
      case 'counterparty_asc':
        return (a.buyerName || '').localeCompare(b.buyerName || '', isAr ? 'ar' : 'en');
      case 'counterparty_desc':
        return (b.buyerName || '').localeCompare(a.buyerName || '', isAr ? 'ar' : 'en');
      case 'project_asc':
        return (a.projectTitle || '').localeCompare(b.projectTitle || '', isAr ? 'ar' : 'en');
      case 'project_desc':
        return (b.projectTitle || '').localeCompare(a.projectTitle || '', isAr ? 'ar' : 'en');
      case 'nominal_desc':
        return D(b.nominalValue || 0).minus(D(a.nominalValue || 0)).toNumber();
      case 'nominal_asc':
        return D(a.nominalValue || 0).minus(D(b.nominalValue || 0)).toNumber();
      case 'remaining_desc':
        return D(b.remainingAmount || 0).minus(D(a.remainingAmount || 0)).toNumber();
      case 'remaining_asc':
        return D(a.remainingAmount || 0).minus(D(b.remainingAmount || 0)).toNumber();
      case 'status_asc':
        return (a.status || '').localeCompare(b.status || '');
      case 'priority':
      default: {
        const getPriorityRank = (status: string) => {
          if (status === 'overdue') return 1;
          if (status === 'due_today') return 2;
          if (status === 'upcoming' || status === 'in_safe') return 3;
          if (status === 'cleared') return 4;
          return 5;
        };
        const rankA = getPriorityRank(a.status);
        const rankB = getPriorityRank(b.status);
        if (rankA !== rankB) return rankA - rankB;
        if (rankA === 1) return (a.dueDate || '').localeCompare(b.dueDate || '');
        return D(b.nominalValue || 0).minus(D(a.nominalValue || 0)).toNumber();
      }
    }
  });
  return list;
}

/**
 * Universal multi-criteria column sorter for Outflows
 */
export function sortOutflowItems(
  items: ProjectedOutflowItem[],
  sortBy: string,
  isAr: boolean = true
): ProjectedOutflowItem[] {
  const list = [...items];
  list.sort((a, b) => {
    switch (sortBy) {
      case 'due_date_asc':
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      case 'due_date_desc':
        return (b.dueDate || '').localeCompare(a.dueDate || '');
      case 'counterparty_asc':
        return (a.beneficiary || '').localeCompare(b.beneficiary || '', isAr ? 'ar' : 'en');
      case 'counterparty_desc':
        return (b.beneficiary || '').localeCompare(a.beneficiary || '', isAr ? 'ar' : 'en');
      case 'project_asc':
        return (a.projectTitle || '').localeCompare(b.projectTitle || '', isAr ? 'ar' : 'en');
      case 'project_desc':
        return (b.projectTitle || '').localeCompare(a.projectTitle || '', isAr ? 'ar' : 'en');
      case 'total_desc':
      case 'nominal_desc':
        return D(b.totalAmount || 0).minus(D(a.totalAmount || 0)).toNumber();
      case 'total_asc':
      case 'nominal_asc':
        return D(a.totalAmount || 0).minus(D(b.totalAmount || 0)).toNumber();
      case 'remaining_desc':
        return D(b.remainingAmount || 0).minus(D(a.remainingAmount || 0)).toNumber();
      case 'remaining_asc':
        return D(a.remainingAmount || 0).minus(D(b.remainingAmount || 0)).toNumber();
      case 'status_asc':
        return (a.status || '').localeCompare(b.status || '');
      case 'priority':
      default: {
        const getPriorityRank = (status: string) => {
          if (status === 'overdue') return 1;
          if (status === 'due_today') return 2;
          if (status === 'upcoming') return 3;
          if (status === 'paid') return 4;
          return 5;
        };
        const rankA = getPriorityRank(a.status);
        const rankB = getPriorityRank(b.status);
        if (rankA !== rankB) return rankA - rankB;
        if (rankA === 1) return (a.dueDate || '').localeCompare(b.dueDate || '');
        return D(b.totalAmount || 0).minus(D(a.totalAmount || 0)).toNumber();
      }
    }
  });
  return list;
}
