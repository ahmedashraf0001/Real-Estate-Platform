import { Decimal, D } from '@/lib/erp/math';
import { 
  ERPContract, 
  ERPPDCRecord, 
  ERPJournalEntry, 
  ERPPropertyCostItem,
  ERPPayableInstallment
} from '@/lib/erp/types';

export interface CashMovementTransaction {
  id: string;
  date: string;
  timeStr: string;
  fullDateTimeStr: string;
  type: 'COLLECTION' | 'DISBURSEMENT' | 'TRANSFER' | 'EXPENSE' | 'PARTNER';
  typeLabelAr: string;
  typeLabelEn: string;
  description: string;
  counterparty: string;
  accountLabel: string;
  accountCode: string;
  reference_number?: string;
  payment_method?: string;
  amount: Decimal;
  direction: 'IN' | 'OUT' | 'NEUTRAL';
  status: 'COMPLETED' | 'RECORDED' | 'PENDING';
  statusLabelAr: string;
  statusLabelEn: string;
  category: 'collection' | 'supplier' | 'expense' | 'other';
  rawEntry?: ERPJournalEntry;
  rawPdc?: ERPPDCRecord;
  rawCost?: ERPPropertyCostItem;
  rawContract?: ERPContract;
}

export type StreamFilterId = 
  | 'in-0' 
  | 'in-1' 
  | 'in-2' 
  | 'in-3' 
  | 'in-total' 
  | 'out-0' 
  | 'out-1' 
  | 'out-2' 
  | 'out-3' 
  | 'out-total';

// ─── STREAM MATCHERS ──────────────────────────────────────────────────────────

// in-1: Partner Contributions & Equity (account 301000, partner type, or capital injection descriptions)
export const matchesIn1 = (tx: CashMovementTransaction): boolean =>
  tx.direction === 'IN' && (
    tx.type === 'PARTNER' ||
    tx.accountCode?.startsWith('301') ||
    tx.description.includes('شريك') ||
    tx.description.includes('رأس مال')
  );

// in-0: Client Installments & Collections (customer collections, booking down payments)
// Real developer ERP: any inflow that is not partner equity is client collections/installments
export const matchesIn0 = (tx: CashMovementTransaction): boolean =>
  tx.direction === 'IN' && !matchesIn1(tx) && (
    tx.type === 'COLLECTION' ||
    tx.category === 'collection' ||
    true
  );

// in-2 & in-3: Deprecated legacy streams preserved as safe fallbacks
export const matchesIn2 = (tx: CashMovementTransaction): boolean =>
  tx.direction === 'IN' && !matchesIn0(tx) && !matchesIn1(tx);

export const matchesIn3 = (_tx: CashMovementTransaction): boolean => false;

// out-3: Taxes, Permits & Government Dues (city authority dues, building permits, taxes)
export const matchesOut3 = (tx: CashMovementTransaction): boolean => {
  if (tx.direction !== 'OUT') return false;
  if (tx.rawCost?.category) {
    return tx.rawCost.category === 'permits_engineering' || tx.rawCost.category === 'taxes_fees';
  }
  return (
    tx.accountCode?.startsWith('204') ||
    tx.accountCode?.startsWith('150') ||
    tx.description.includes('ضرائب') ||
    tx.description.includes('رسوم') ||
    tx.description.includes('تراخيص') ||
    tx.description.includes('جهاز المدينة')
  );
};

// out-2: MEP & Infrastructure (plumbing, electrical networks, water insulation, electromechanical)
export const matchesOut2 = (tx: CashMovementTransaction): boolean => {
  if (tx.direction !== 'OUT') return false;
  if (matchesOut3(tx)) return false;
  if (tx.rawCost?.category) {
    return tx.rawCost.category === 'mep_infrastructure';
  }
  return (
    tx.description.includes('كهروميكانيك') ||
    tx.description.includes('سباكة') ||
    tx.description.includes('كهرباء') ||
    tx.description.includes('عزل')
  );
};

// out-1: Finishes & Facades (entrance marble, alumital, ceramics, elevators, site facades)
export const matchesOut1 = (tx: CashMovementTransaction): boolean => {
  if (tx.direction !== 'OUT') return false;
  if (matchesOut3(tx) || matchesOut2(tx)) return false;
  if (tx.rawCost?.category) {
    return tx.rawCost.category === 'finishing_interior' || tx.rawCost.category === 'site_facade';
  }
  return (
    tx.description.includes('تشطيب') ||
    tx.description.includes('واجه') ||
    tx.description.includes('ألوميتال') ||
    tx.description.includes('رخام') ||
    tx.description.includes('سيراميك') ||
    tx.description.includes('مصاعد')
  );
};

// out-0: Civil Structure & Concrete (steel, cement, concrete casting, structure labor)
// Primary construction pillar; also acts as default site construction outflow fallback
export const matchesOut0 = (tx: CashMovementTransaction): boolean => {
  if (tx.direction !== 'OUT') return false;
  if (matchesOut3(tx) || matchesOut2(tx) || matchesOut1(tx)) return false;
  if (tx.rawCost?.category) {
    return (
      tx.rawCost.category === 'civil_structure' ||
      tx.rawCost.category === 'labor_subcontractor' ||
      (tx.rawCost.category as string) === 'materials' ||
      true
    );
  }
  return (
    tx.description.includes('خرسان') ||
    tx.description.includes('حديد') ||
    tx.description.includes('أسمنت') ||
    tx.description.includes('عظم') ||
    tx.description.includes('مصنعيات') ||
    true
  );
};

// General Stream Filter Matcher
export const matchesStreamFilter = (tx: CashMovementTransaction, streamId: string | null): boolean => {
  if (!streamId) return true;
  switch (streamId) {
    case 'in-0':
      return matchesIn0(tx);
    case 'in-1':
      return matchesIn1(tx);
    case 'in-2':
      return matchesIn2(tx);
    case 'in-3':
      return matchesIn3(tx);
    case 'in-total':
      return tx.direction === 'IN';
    case 'out-0':
      return matchesOut0(tx);
    case 'out-1':
      return matchesOut1(tx);
    case 'out-2':
      return matchesOut2(tx);
    case 'out-3':
      return matchesOut3(tx);
    case 'out-total':
      return tx.direction === 'OUT';
    default:
      return true;
  }
};

// Stream Filter Label Provider
export const getStreamFilterLabel = (streamId: string | null, isAr: boolean = true): string => {
  if (!streamId) return '';
  switch (streamId) {
    case 'in-0':
      return isAr ? 'أقساط ومقدمات العملاء' : 'Client Installments & Collections';
    case 'in-1':
      return isAr ? 'تمويل وسيولة الشركاء' : 'Partner Capital & Funding';
    case 'in-2':
      return isAr ? 'متحصلات أخرى' : 'Other Misc Receipts';
    case 'in-3':
      return isAr ? 'إعادة تمويل / قروض' : 'Loans & Financing';
    case 'in-total':
      return isAr ? 'إجمالي التدفقات الداخلة' : 'Total Inflows';
    case 'out-0':
      return isAr ? 'خرسانات وبناء عظم' : 'Civil Structure & Concrete';
    case 'out-1':
      return isAr ? 'تشطيبات وواجهات' : 'Finishes & Facades';
    case 'out-2':
      return isAr ? 'تأسيس وكهروميكانيك' : 'MEP & Infrastructure';
    case 'out-3':
      return isAr ? 'تراخيص ورسوم حكومية' : 'Permits & Government Fees';
    case 'out-total':
      return isAr ? 'إجمالي التدفقات الخارجة' : 'Total Outflows';
    default:
      return '';
  }
};

/**
 * Clean thousand-separator integer number formatting (no decimals/cents).
 */
export function formatNumberWithCommas(val: Decimal | string | number | bigint | undefined | null): string {
  if (val === undefined || val === null) return '0';
  const d = val instanceof Decimal ? val : D(val);
  const rounded = Math.round(d.abs().toNumber()).toLocaleString('en-US');
  if (rounded === '0') return '0';
  return d.isNegative() ? `-${rounded}` : rounded;
}

/**
 * Clean integer Egyptian Pound currency formatting (e.g. 103,600,000 ج.م, no cents).
 */
export function formatEGPInteger(val: Decimal | string | number | bigint | undefined | null, isAr: boolean = true): string {
  if (val === undefined || val === null) return `0 ${isAr ? 'ج.م' : 'EGP'}`;
  const d = val instanceof Decimal ? val : D(val);
  const rounded = Math.round(d.toNumber()).toLocaleString('en-US');
  return `${rounded} ${isAr ? 'ج.م' : 'EGP'}`;
}

/**
 * Parses and formats military time string (e.g. '14:30', '11:00') into 12-hour format with Arabic/English AM/PM.
 * Example: '14:30' -> '02:30 م' (or '02:30 PM')
 * Example: '11:00' -> '11:00 ص' (or '11:00 AM')
 */
export function formatTime12h(timeStr?: string | null, isAr: boolean = true): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const parts = trimmed.split(':');
  if (parts.length < 2) return trimmed;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hours)) return trimmed;

  const isPM = hours >= 12;
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const paddedHours = hours < 10 ? `0${hours}` : `${hours}`;
  const suffix = isAr ? (isPM ? 'م' : 'ص') : (isPM ? 'PM' : 'AM');
  return `${paddedHours}:${minutes} ${suffix}`;
}

export interface UpcomingDueItem {
  id: string;
  title: string;
  party: string;
  dueDate: string;
  amount: Decimal;
  direction: 'IN' | 'OUT';
  typeLabelAr: string;
  typeLabelEn: string;
  rawPdc?: ERPPDCRecord;
  rawCost?: ERPPropertyCostItem;
  rawInstallment?: ERPPayableInstallment;
}

export interface UpcomingDuesSummary {
  items: UpcomingDueItem[];
  totalIn: Decimal;
  totalOut: Decimal;
  totalCount: number;
}

/**
 * Computes upcoming maturing dues and collections across PDCs and contractor WIP installments.
 * - Filters out Cleared, Void, and Bounced PDCs.
 * - Filters out PAID installments and installments where remaining balance <= 0.
 * - Accurately subtracts paid_amount_egp from installment amount.
 * - Sorts items ascending by due date and slices top 4 for widget view.
 */
export function computeUpcomingDues(
  pdcRecords?: ERPPDCRecord[] | null,
  effectivePropertyCosts?: ERPPropertyCostItem[] | null,
  isAr: boolean = true,
  todayStr?: string
): UpcomingDuesSummary {
  const currentToday = todayStr || new Date().toISOString().split('T')[0];
  const list: UpcomingDueItem[] = [];

  // 1. Pending PDCs (Receivables and Payables)
  (pdcRecords || []).forEach(pdc => {
    if (pdc.status !== 'Cleared' && pdc.status !== 'Void' && pdc.status !== 'Bounced') {
      const isPayable = (pdc as any).type === 'Payable';
      const pdcId = pdc.cheque_id || (pdc as any).id || Math.random().toString();
      const party = (pdc as any).client_name || (pdc as any).issuer_name || pdc.drawer_name || (isAr ? 'طرف تعامل' : 'Counterparty');
      const dueDate = pdc.due_date || (pdc as any).created_at?.split('T')[0] || currentToday;
      const amount = D(pdc.nominal_value || (pdc as any).amount || 0);
      if (amount.lte(0)) return;

      list.push({
        id: `pdc-${pdcId}`,
        title: pdc.cheque_number
          ? (isAr ? `شيك رقم ${pdc.cheque_number}` : `Cheque #${pdc.cheque_number}`)
          : (isAr ? 'شيك آجل برسم التحصيل' : 'PDC Cheque'),
        party,
        dueDate,
        amount,
        direction: isPayable ? 'OUT' : 'IN',
        typeLabelAr: isPayable ? 'شيك صادر' : 'شيك وارد',
        typeLabelEn: isPayable ? 'Issued Cheque' : 'Incoming PDC',
        rawPdc: pdc
      });
    }
  });

  // 2. Pending contractor payable installments
  (effectivePropertyCosts || []).forEach(cost => {
    (cost.payable_installments || []).forEach(inst => {
      if (inst.status !== 'PAID') {
        const costId = cost.item_id || cost.id || Math.random().toString();
        const instId = inst.installment_id || (inst as any).id || Math.random().toString();
        const instTitle = (isAr ? inst.title_ar : (inst.title_en || inst.title_ar)) || (isAr ? cost.item_name_ar : (cost.item_name_en || cost.item_name_ar)) || (isAr ? 'مستخلص أعمال' : 'WIP Due');
        const party = cost.supplier_contractor || (cost as any).contractor_name || (cost as any).vendor_name || (isAr ? 'مقاول / مورد' : 'Contractor');
        const instAmount = D(inst.amount_egp || (inst as any).amount || 0);
        const paidAmount = D(inst.paid_amount_egp || 0);
        const remaining = instAmount.minus(paidAmount);
        if (remaining.lte(0)) return;
        const amount = remaining;

        list.push({
          id: `inst-${costId}-${instId}`,
          title: instTitle,
          party,
          dueDate: inst.due_date || currentToday,
          amount,
          direction: 'OUT',
          typeLabelAr: 'مستخلص مقاول',
          typeLabelEn: 'Contractor Due',
          rawCost: cost,
          rawInstallment: inst
        });
      }
    });
  });

  // Sort by due date ascending
  const sorted = list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const totalIn = sorted.filter(x => x.direction === 'IN').reduce((acc, curr) => acc.plus(curr.amount), D(0));
  const totalOut = sorted.filter(x => x.direction === 'OUT').reduce((acc, curr) => acc.plus(curr.amount), D(0));

  return {
    items: sorted.slice(0, 4),
    totalIn,
    totalOut,
    totalCount: sorted.length
  };
}

/**
 * Constructs a safe double-entry journal inspection payload from a CashMovementTransaction.
 * Guarantees a fallback entry and entry_number even if rawEntry is undefined.
 */
export function buildTransactionInspectionPayload(tx: CashMovementTransaction) {
  const safeEntry = tx.rawEntry || {
    entry_number: tx.id || 'JE-AUTO',
    description: tx.description || tx.counterparty,
    posting_date: tx.date,
    lines: []
  };
  return {
    type: 'journal' as const,
    entry: safeEntry,
    journalEntry: safeEntry,
    amount: (tx.amount && typeof tx.amount.abs === 'function') ? tx.amount.abs().toFixed(2) : D(tx.amount || 0).abs().toFixed(2),
    title: tx.description,
    party: tx.counterparty
  };
}


