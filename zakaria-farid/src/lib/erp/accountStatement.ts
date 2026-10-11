import { D, Decimal } from './math';

export interface AccountStatementLineInput {
  entry_id: string;
  entry_number?: string;
  entry_date: string;
  debit_amount: string | number | Decimal;
  credit_amount: string | number | Decimal;
  description?: string;
  memo?: string;
  source_module?: string;
  created_at?: string;
  contract_id?: string;
  unit_id?: string;
  counter_codes?: string[];
  [key: string]: any;
}

export interface AccountStatementLineOutput extends AccountStatementLineInput {
  runningBalance: Decimal;
}

export interface AccountStatementOptions {
  normalBalance: 'DEBIT' | 'CREDIT';
  period?: string; // 'all' or 'YYYY-MM'
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string; // 'YYYY-MM-DD'
  sortBy?: 'date_asc' | 'date_desc' | 'amount_desc';
}

export interface AccountStatementResult {
  openingBalance: Decimal;
  totalDebits: Decimal;
  totalCredits: Decimal;
  closingBalance: Decimal;
  closingBalanceNature: 'DEBIT' | 'CREDIT';
  closingBalanceLabelAr: 'مدين' | 'دائن';
  closingBalanceLabelEn: 'Debit' | 'Credit';
  lines: AccountStatementLineOutput[];
}

/**
 * Pure accounting statement calculation engine.
 * Computes opening balance, running balance, and closing balance using D() decimal arithmetic.
 */
export function calculateAccountStatement(
  allLines: AccountStatementLineInput[],
  options: AccountStatementOptions
): AccountStatementResult {
  const { normalBalance, period, sortBy = 'date_asc' } = options;

  let effectiveStartDate = options.startDate;
  let effectiveEndDate = options.endDate;

  if (period && period !== 'all') {
    if (!effectiveStartDate) {
      effectiveStartDate = `${period}-01`;
    }
    if (!effectiveEndDate) {
      const [yearStr, monthStr] = period.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const lastDay = new Date(y, m, 0).getDate();
      effectiveEndDate = `${period}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  // 1. Separate prior lines from period lines
  let openingBalance = D(0);
  const periodLinesWithIndex: { line: AccountStatementLineInput; originalIndex: number }[] = [];

  allLines.forEach((line, idx) => {
    const d = line.entry_date || '';
    const dr = D(line.debit_amount || '0');
    const cr = D(line.credit_amount || '0');

    if (effectiveStartDate && d < effectiveStartDate) {
      if (normalBalance === 'DEBIT') {
        openingBalance = openingBalance.plus(dr).minus(cr);
      } else {
        openingBalance = openingBalance.plus(cr).minus(dr);
      }
    } else if (!effectiveEndDate || d <= effectiveEndDate) {
      periodLinesWithIndex.push({ line, originalIndex: idx });
    }
  });

  // 2. Sort by date and creation time; retain source order for lines within one entry.
  periodLinesWithIndex.sort((a, b) => {
    const cmp = (a.line.entry_date || '').localeCompare(b.line.entry_date || '');
    if (cmp !== 0) return cmp;
    if (a.line.created_at && b.line.created_at) {
      const created = a.line.created_at.localeCompare(b.line.created_at);
      if (created !== 0) return created;
    }
    return a.originalIndex - b.originalIndex;
  });

  // 3. Compute running balances and totals in chronological ASC order
  let currentRunning = openingBalance;
  let totalDebits = D(0);
  let totalCredits = D(0);

  const chronologicalLines: AccountStatementLineOutput[] = periodLinesWithIndex.map(({ line }) => {
    const dr = D(line.debit_amount || '0');
    const cr = D(line.credit_amount || '0');

    totalDebits = totalDebits.plus(dr);
    totalCredits = totalCredits.plus(cr);

    if (normalBalance === 'DEBIT') {
      currentRunning = currentRunning.plus(dr).minus(cr);
    } else {
      currentRunning = currentRunning.plus(cr).minus(dr);
    }

    return {
      ...line,
      runningBalance: currentRunning
    };
  });

  // 4. Calculate closing balance and normal nature
  const netNormal = normalBalance === 'DEBIT'
    ? openingBalance.plus(totalDebits).minus(totalCredits)
    : openingBalance.plus(totalCredits).minus(totalDebits);

  let closingBalance: Decimal;
  let closingBalanceNature: 'DEBIT' | 'CREDIT';
  let closingBalanceLabelAr: 'مدين' | 'دائن';
  let closingBalanceLabelEn: 'Debit' | 'Credit';

  if (netNormal.gte(0)) {
    closingBalance = netNormal;
    closingBalanceNature = normalBalance;
    closingBalanceLabelAr = normalBalance === 'DEBIT' ? 'مدين' : 'دائن';
    closingBalanceLabelEn = normalBalance === 'DEBIT' ? 'Debit' : 'Credit';
  } else {
    closingBalance = netNormal.abs();
    closingBalanceNature = normalBalance === 'DEBIT' ? 'CREDIT' : 'DEBIT';
    closingBalanceLabelAr = normalBalance === 'DEBIT' ? 'دائن' : 'مدين';
    closingBalanceLabelEn = normalBalance === 'DEBIT' ? 'Credit' : 'Debit';
  }

  // 5. Handle non-chronological sorting for presentation (running balance column hidden in UI)
  let outputLines = chronologicalLines;
  if (sortBy === 'date_desc') {
    outputLines = [...chronologicalLines].reverse();
  } else if (sortBy === 'amount_desc') {
    outputLines = [...chronologicalLines].sort((a, b) => {
      const amtA = D(a.debit_amount || '0').plus(a.credit_amount || '0');
      const amtB = D(b.debit_amount || '0').plus(b.credit_amount || '0');
      return amtB.minus(amtA).toNumber();
    });
  }

  return {
    openingBalance,
    totalDebits,
    totalCredits,
    closingBalance,
    closingBalanceNature,
    closingBalanceLabelAr,
    closingBalanceLabelEn,
    lines: outputLines
  };
}

/**
 * Paginate pre-computed statement lines preserving running balances.
 */
export function paginateStatementLines<T>(lines: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return lines.slice(start, start + pageSize);
}
