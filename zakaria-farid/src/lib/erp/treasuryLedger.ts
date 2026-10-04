import { D, Decimal } from '@/lib/erp/math';
import type { ERPJournalEntry, ERPContract } from '@/lib/erp/types';

export type CashAccountCode = '101000' | '102000';
export type TreasuryPeriod = 'today' | '7d' | 'month' | 'all';
export type CashMovementKind =
  | 'customer_collection' | 'partner_injection' | 'loan_inflow' | 'other_inflow'
  | 'contractor_payment' | 'site_expense' | 'operating_expense' | 'tax_remittance'
  | 'customer_refund' | 'partner_distribution' | 'loan_repayment' | 'other_outflow'
  | 'internal_transfer';
export type CashDirection = 'IN' | 'OUT' | 'TRANSFER';

export interface TreasuryMovement {
  id: string;                 // entry.entry_id
  entryNumber: string;        // entry.entry_number || entry.entry_id
  date: string;               // entry.entry_date (YYYY-MM-DD); fallback toLocalDateStr(new Date(entry.created_at))
  time: string;               // local HH:mm from entry.created_at; '' if created_at missing/invalid
  timestamp: number;          // Date.parse(entry.created_at); if NaN -> Date.parse(date + 'T00:00:00'); if NaN -> 0
  kind: CashMovementKind;
  direction: CashDirection;
  account: CashAccountCode;           // IN/OUT: the cash account moved. TRANSFER: the DEBITED cash account (destination)
  fromAccount?: CashAccountCode;      // TRANSFER only: the CREDITED cash account (source)
  amount: Decimal;            // always positive
  signedAmount: Decimal;      // IN: +amount, OUT: -amount, TRANSFER: D(0)
  opposingAccountCode: string; // see rule 3; '' for TRANSFER
  originalDescription: string; // entry.description || ''
  description: string;        // see rule 5
  counterparty: string;       // see rule 6
  contract?: ERPContract;
  entry: ERPJournalEntry;
  balanceAfter: Decimal;      // total cash (101000+102000) after this movement, chronological (rule 7)
}

export interface TreasuryAccountSummary {
  code: CashAccountCode | 'TOTAL';
  opening: Decimal; inflow: Decimal; outflow: Decimal; closing: Decimal;
}
export interface TreasuryKindSummary {
  kind: CashMovementKind; direction: CashDirection; count: number; amount: Decimal;
  share: number | null;       // amount / total of same direction * 100, rounded to 1 decimal; null for TRANSFER or when direction total is 0
}
export interface TreasurySummary {
  period: TreasuryPeriod; from: string | null; to: string | null;
  accounts: TreasuryAccountSummary[];   // exactly 3 rows in order: '101000', '102000', 'TOTAL'
  inflow: Decimal; outflow: Decimal; net: Decimal; count: number;  // company level, TRANSFER excluded from inflow/outflow, included in count
  byKind: TreasuryKindSummary[];        // only kinds with count > 0; order: IN rows, then OUT rows, then TRANSFER; inside each group amount desc, tie -> kind asc
}

export const CASH_MOVEMENT_KIND_LABELS: Record<CashMovementKind, { ar: string; en: string }> = {
  customer_collection:  { ar: 'تحصيل من عميل',        en: 'Customer collection' },
  partner_injection:    { ar: 'تمويل من الشركاء',     en: 'Partner funding' },
  loan_inflow:          { ar: 'قرض / تسهيل',          en: 'Loan drawdown' },
  other_inflow:         { ar: 'إيداع آخر',            en: 'Other receipt' },
  contractor_payment:   { ar: 'سداد مستحقات مقاول',   en: 'Contractor payment' },
  site_expense:         { ar: 'تكاليف إنشاء مباشرة',  en: 'Direct construction cost' },
  operating_expense:    { ar: 'مصروفات تشغيل',        en: 'Operating expense' },
  tax_remittance:       { ar: 'سداد ضرائب',           en: 'Tax remittance' },
  customer_refund:      { ar: 'رد مبالغ لعميل',       en: 'Customer refund' },
  partner_distribution: { ar: 'توزيعات / مسحوبات شركاء', en: 'Partner distribution' },
  loan_repayment:       { ar: 'سداد قرض',             en: 'Loan repayment' },
  other_outflow:        { ar: 'صرف آخر',              en: 'Other payment' },
  internal_transfer:    { ar: 'تحويل بين الخزينة وإنستاباي', en: 'Safe ⇄ InstaPay transfer' },
};

export const CASH_ACCOUNT_LABELS: Record<CashAccountCode, { ar: string; en: string }> = {
  '101000': { ar: 'الخزينة', en: 'Safe' },
  '102000': { ar: 'إنستاباي', en: 'InstaPay' },
};

export const TREASURY_PERIOD_LABELS: Record<TreasuryPeriod, { ar: string; en: string }> = {
  today: { ar: 'اليوم', en: 'Today' },
  '7d':  { ar: 'آخر ٧ أيام', en: 'Last 7 days' },
  month: { ar: 'هذا الشهر', en: 'This month' },
  all:   { ar: 'كل الفترات', en: 'All time' },
};

export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTreasuryPeriodRange(
  period: TreasuryPeriod,
  todayStr: string
): { from: string | null; to: string | null } {
  if (period === 'all') {
    return { from: null, to: null };
  }
  if (period === 'today') {
    return { from: todayStr, to: todayStr };
  }
  if (period === 'month') {
    return { from: `${todayStr.slice(0, 7)}-01`, to: todayStr };
  }
  // period === '7d'
  const parts = todayStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const targetDate = new Date(y, m - 1, d - 6);
  return { from: toLocalDateStr(targetDate), to: todayStr };
}

export function isInTreasuryPeriod(
  m: TreasuryMovement,
  range: { from: string | null; to: string | null }
): boolean {
  return (!range.from || m.date >= range.from) && (!range.to || m.date <= range.to);
}

function matchContract(
  entry: ERPJournalEntry,
  contracts?: ERPContract[] | null
): ERPContract | undefined {
  if (!contracts || contracts.length === 0) return undefined;

  const lines = entry.lines || [];
  for (const line of lines) {
    if (line && line.contract_id) {
      const match = contracts.find((c) => c && c.contract_id === line.contract_id);
      if (match) return match;
    }
  }

  if (entry.source_entity_id) {
    const match = contracts.find((c) => c && c.contract_id === entry.source_entity_id);
    if (match) return match;
  }

  const desc = entry.description || '';
  if (desc) {
    const match = contracts.find((c) => c && c.contract_number && desc.includes(c.contract_number));
    if (match) return match;
  }

  return undefined;
}

function startsWithAny(code: string, prefixes: string[]): boolean {
  if (!code) return false;
  return prefixes.some((p) => code.startsWith(p));
}

function getCounterparty(
  contract: ERPContract | undefined,
  kind: CashMovementKind,
  isAr: boolean
): string {
  if (contract && contract.buyer_name) {
    return contract.buyer_name;
  }
  if (kind === 'partner_injection' || kind === 'partner_distribution') {
    return isAr ? 'الشركاء' : 'Partners';
  }
  if (kind === 'tax_remittance') {
    return isAr ? 'مصلحة الضرائب' : 'Tax authority';
  }
  if (kind === 'internal_transfer') {
    return isAr ? 'داخلي' : 'Internal';
  }
  if (kind === 'loan_inflow' || kind === 'loan_repayment') {
    return isAr ? 'البنك' : 'Bank';
  }
  return '—';
}

function getMovementEffectOnAccount(m: TreasuryMovement, code: CashAccountCode): Decimal {
  if (m.direction === 'TRANSFER') {
    if (m.account === code) {
      return m.amount;
    }
    if (m.fromAccount === code) {
      return D(0).minus(m.amount);
    }
    return D(0);
  }
  if (m.account === code) {
    return m.signedAmount;
  }
  return D(0);
}

export function buildTreasuryMovements(
  entries: ERPJournalEntry[] | null | undefined,
  contracts: ERPContract[] | null | undefined,
  isAr: boolean
): TreasuryMovement[] {
  if (!entries || !Array.isArray(entries)) {
    return [];
  }

  const rawMovements: TreasuryMovement[] = [];

  for (const entry of entries) {
    if (!entry) continue;

    const lines = entry.lines || [];
    let dr101 = D(0);
    let cr101 = D(0);
    let dr102 = D(0);
    let cr102 = D(0);

    for (const line of lines) {
      if (!line) continue;
      if (line.account_code === '101000') {
        dr101 = dr101.plus(D(line.debit_amount || 0));
        cr101 = cr101.plus(D(line.credit_amount || 0));
      } else if (line.account_code === '102000') {
        dr102 = dr102.plus(D(line.debit_amount || 0));
        cr102 = cr102.plus(D(line.credit_amount || 0));
      }
    }

    const net101 = dr101.minus(cr101);
    const net102 = dr102.minus(cr102);

    let direction: CashDirection;
    let account: CashAccountCode;
    let fromAccount: CashAccountCode | undefined;
    let amount: Decimal;
    let signedAmount: Decimal;
    let kind: CashMovementKind;
    let opposingAccountCode = '';

    const isTransfer =
      !net101.isZero() &&
      !net102.isZero() &&
      ((net101.isPositive() && net102.isNegative()) || (net101.isNegative() && net102.isPositive()));

    if (isTransfer) {
      direction = 'TRANSFER';
      if (net101.isPositive()) {
        account = '101000';
        fromAccount = '102000';
        amount = net101;
      } else {
        account = '102000';
        fromAccount = '101000';
        amount = net102;
      }
      signedAmount = D(0);
      kind = 'internal_transfer';
      opposingAccountCode = '';
    } else {
      const totalNet = net101.plus(net102);
      if (totalNet.isZero()) {
        continue;
      }

      if (totalNet.isPositive()) {
        direction = 'IN';
        amount = totalNet;
        signedAmount = totalNet;
      } else {
        direction = 'OUT';
        amount = totalNet.abs();
        signedAmount = D(0).minus(amount);
      }

      const abs101 = net101.abs();
      const abs102 = net102.abs();
      if (abs101.gte(abs102)) {
        account = '101000';
      } else {
        account = '102000';
      }

      type LineType = ERPJournalEntry['lines'][number];
      let opposingLine: LineType | null = null;
      let opposingMax = D(-1);

      for (const line of lines) {
        if (!line) continue;
        if (line.account_code === '101000' || line.account_code === '102000') continue;

        const deb = D(line.debit_amount || 0);
        const cr = D(line.credit_amount || 0);
        const m = deb.gte(cr) ? deb : cr;

        if (!opposingLine) {
          opposingLine = line;
          opposingMax = m;
        } else if (m.gt(opposingMax)) {
          opposingLine = line;
          opposingMax = m;
        } else if (m.eq(opposingMax)) {
          const currNum = typeof line.line_number === 'number' ? line.line_number : null;
          const oppNum = typeof opposingLine.line_number === 'number' ? opposingLine.line_number : null;
          if (currNum !== null && oppNum !== null) {
            if (currNum < oppNum) {
              opposingLine = line;
              opposingMax = m;
            }
          }
        }
      }

      opposingAccountCode = opposingLine ? opposingLine.account_code || '' : '';

      if (direction === 'IN') {
        if (startsWithAny(opposingAccountCode, ['301', '302'])) {
          kind = 'partner_injection';
        } else if (startsWithAny(opposingAccountCode, ['202'])) {
          kind = 'loan_inflow';
        } else if (startsWithAny(opposingAccountCode, ['103', '104', '203', '4'])) {
          kind = 'customer_collection';
        } else {
          kind = 'other_inflow';
        }
      } else {
        if (startsWithAny(opposingAccountCode, ['201'])) {
          kind = 'contractor_payment';
        } else if (startsWithAny(opposingAccountCode, ['105', '15', '603'])) {
          kind = 'site_expense';
        } else if (startsWithAny(opposingAccountCode, ['204', '604'])) {
          kind = 'tax_remittance';
        } else if (startsWithAny(opposingAccountCode, ['206'])) {
          kind = 'customer_refund';
        } else if (startsWithAny(opposingAccountCode, ['303'])) {
          kind = 'partner_distribution';
        } else if (startsWithAny(opposingAccountCode, ['202'])) {
          kind = 'loan_repayment';
        } else if (startsWithAny(opposingAccountCode, ['5', '6'])) {
          kind = 'operating_expense';
        } else {
          kind = 'other_outflow';
        }
      }
    }

    const matchedContract = matchContract(entry, contracts);

    let date = entry.entry_date || '';
    let time = '';
    let createdAtTs = NaN;

    if (entry.created_at) {
      const cd = new Date(entry.created_at);
      const t = cd.getTime();
      if (!Number.isNaN(t)) {
        createdAtTs = t;
        const hours = String(cd.getHours()).padStart(2, '0');
        const minutes = String(cd.getMinutes()).padStart(2, '0');
        time = `${hours}:${minutes}`;
        if (!date) {
          date = toLocalDateStr(cd);
        }
      }
    }

    let timestamp = createdAtTs;
    if (Number.isNaN(timestamp)) {
      if (date) {
        const dt = Date.parse(date + 'T00:00:00');
        timestamp = Number.isNaN(dt) ? 0 : dt;
      } else {
        timestamp = 0;
      }
    }

    const originalDescription = entry.description || '';
    const hasArabic = /[\u0600-\u06FF]/.test(originalDescription);
    const label = CASH_MOVEMENT_KIND_LABELS[kind];
    let description = '';

    if (!isAr) {
      description = originalDescription || label.en;
    } else if (hasArabic) {
      description = originalDescription;
    } else {
      description = label.ar + (matchedContract ? ` — عقد ${matchedContract.contract_number}` : '');
    }

    const counterparty = getCounterparty(matchedContract, kind, isAr);

    const movement: TreasuryMovement = {
      id: entry.entry_id,
      entryNumber: entry.entry_number || entry.entry_id,
      date,
      time,
      timestamp,
      kind,
      direction,
      account,
      amount,
      signedAmount,
      opposingAccountCode,
      originalDescription,
      description,
      counterparty,
      entry,
      balanceAfter: D(0),
    };

    if (fromAccount !== undefined) {
      movement.fromAccount = fromAccount;
    }
    if (matchedContract !== undefined) {
      movement.contract = matchedContract;
    }

    rawMovements.push(movement);
  }

  rawMovements.sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.id.localeCompare(b.id);
  });

  let running = D(0);
  for (const m of rawMovements) {
    if (m.direction !== 'TRANSFER') {
      running = running.plus(m.signedAmount);
    }
    m.balanceAfter = running;
  }

  rawMovements.reverse();
  return rawMovements;
}

export function summarizeTreasury(
  movements: TreasuryMovement[] | null | undefined,
  period: TreasuryPeriod,
  todayStr: string
): TreasurySummary {
  const list = Array.isArray(movements) ? movements : [];
  const range = getTreasuryPeriodRange(period, todayStr);

  const summarizeCode = (code: CashAccountCode): TreasuryAccountSummary => {
    let closing = D(0);
    for (const m of list) {
      if (!range.to || m.date <= range.to) {
        closing = closing.plus(getMovementEffectOnAccount(m, code));
      }
    }

    let inflow = D(0);
    let outflow = D(0);
    for (const m of list) {
      if (isInTreasuryPeriod(m, range)) {
        const eff = getMovementEffectOnAccount(m, code);
        if (eff.isPositive()) {
          inflow = inflow.plus(eff);
        } else if (eff.isNegative()) {
          outflow = outflow.plus(eff.abs());
        }
      }
    }

    const opening = closing.minus(inflow).plus(outflow);

    return {
      code,
      opening,
      inflow,
      outflow,
      closing,
    };
  };

  const summary101 = summarizeCode('101000');
  const summary102 = summarizeCode('102000');

  const inPeriodMovements = list.filter((m) => isInTreasuryPeriod(m, range));

  let companyInflow = D(0);
  let companyOutflow = D(0);

  for (const m of inPeriodMovements) {
    if (m.direction === 'IN') {
      companyInflow = companyInflow.plus(m.amount);
    } else if (m.direction === 'OUT') {
      companyOutflow = companyOutflow.plus(m.amount);
    }
  }

  const net = companyInflow.minus(companyOutflow);
  const count = inPeriodMovements.length;

  const totalOpening = summary101.opening.plus(summary102.opening);
  const totalClosing = summary101.closing.plus(summary102.closing);
  const totalInflow = companyInflow;
  const totalOutflow = companyOutflow;

  const summaryTotal: TreasuryAccountSummary = {
    code: 'TOTAL',
    opening: totalOpening,
    inflow: totalInflow,
    outflow: totalOutflow,
    closing: totalClosing,
  };

  const accounts: TreasuryAccountSummary[] = [summary101, summary102, summaryTotal];

  const kindMap = new Map<
    CashMovementKind,
    {
      kind: CashMovementKind;
      direction: CashDirection;
      count: number;
      amount: Decimal;
    }
  >();

  for (const m of inPeriodMovements) {
    const existing = kindMap.get(m.kind);
    if (existing) {
      existing.count += 1;
      existing.amount = existing.amount.plus(m.amount);
    } else {
      kindMap.set(m.kind, {
        kind: m.kind,
        direction: m.direction,
        count: 1,
        amount: m.amount,
      });
    }
  }

  const inRows: TreasuryKindSummary[] = [];
  const outRows: TreasuryKindSummary[] = [];
  const transferRows: TreasuryKindSummary[] = [];

  for (const item of kindMap.values()) {
    let share: number | null = null;
    if (item.direction === 'IN') {
      if (!companyInflow.isZero()) {
        share = Number(((item.amount.toNumber() / companyInflow.toNumber()) * 100).toFixed(1));
      }
      inRows.push({ ...item, share });
    } else if (item.direction === 'OUT') {
      if (!companyOutflow.isZero()) {
        share = Number(((item.amount.toNumber() / companyOutflow.toNumber()) * 100).toFixed(1));
      }
      outRows.push({ ...item, share });
    } else {
      transferRows.push({ ...item, share: null });
    }
  }

  const sortGroup = (a: TreasuryKindSummary, b: TreasuryKindSummary) => {
    if (!a.amount.eq(b.amount)) {
      return b.amount.gt(a.amount) ? 1 : -1;
    }
    return a.kind.localeCompare(b.kind);
  };

  inRows.sort(sortGroup);
  outRows.sort(sortGroup);
  transferRows.sort(sortGroup);

  const byKind = [...inRows, ...outRows, ...transferRows];

  return {
    period,
    from: range.from,
    to: range.to,
    accounts,
    inflow: companyInflow,
    outflow: companyOutflow,
    net,
    count,
    byKind,
  };
}
