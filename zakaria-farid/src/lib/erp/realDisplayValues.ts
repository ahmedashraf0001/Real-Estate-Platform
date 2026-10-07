import { D, Decimal } from './math';

/** No percentage comparison exists without a nonzero prior period. */
export function previousPeriodDelta(current: Decimal | string | number, prior: Decimal | string | number): string | null {
  const previous = D(prior);
  if (previous.isZero()) return null;
  const pct = D(current).minus(previous).times(100).dividedBy(previous.abs());
  return `${pct.gte(0) ? '+' : ''}${pct.toFixed(1)}%`;
}

/** Calendar-month buckets ending in referenceDate's month; convert only at the chart boundary. */
export function monthlySeries(
  rows: readonly { date?: string | null; amount: Decimal | string | number }[],
  referenceDate: string,
  months: number,
): number[] {
  const [year, month] = referenceDate.split('-').map(Number);
  const last = year * 12 + month - 1;
  const buckets = Array.from({ length: months }, () => D(0));
  for (const row of rows) {
    if (!row.date || !/^\d{4}-\d{2}-\d{2}/.test(row.date) || Number.isNaN(Date.parse(row.date))) continue;
    const [rowYear, rowMonth] = row.date.split('-').map(Number);
    const index = rowYear * 12 + rowMonth - 1 - (last - months + 1);
    if (index >= 0 && index < months) buckets[index] = buckets[index].plus(D(row.amount));
  }
  return buckets.map(amount => amount.toNumber());
}
