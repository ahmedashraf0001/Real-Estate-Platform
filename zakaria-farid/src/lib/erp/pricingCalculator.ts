import { D } from './math';

/**
 * Cost & pricing calculator (PROJECT_SPEC 2026-10-05, user-confirmed).
 * Built property: cost floor vs market — the user picks a price per m² between break-even and market.
 * Feasibility: land + construction + extras vs expected sales.
 * All money values are returned as fixed 2-decimal strings.
 */

type Num = string | number;

// D() is cent-precision and its toFixed truncates: compute per-mille in cents, then round to one decimal.
const pct = (part: ReturnType<typeof D>, whole: ReturnType<typeof D>): string | null =>
  whole.isZero() ? null : (Math.round(Number(part.times(1000).dividedBy(whole).toFixed(2))) / 10).toFixed(1);

export interface BuiltPricingInput {
  /** Actual recorded cost for the property (sum of cost items). */
  totalCost: Num;
  areaSqm: number;
  /** Market price per m² (defaults to current list price / area in the UI). */
  marketPricePerSqm: Num;
  /** Price per m² the user chose. */
  chosenPricePerSqm: Num;
  /** Current catalog price for the whole property (price_egp). */
  currentListPrice: Num;
}

export interface BuiltPricingResult {
  costPerSqm: string;
  breakEvenPricePerSqm: string;
  marketTotal: string;
  totalPrice: string;
  profit: string;
  /** Profit / price, in %. Null when price is 0. */
  marginPct: string | null;
  /** Profit / cost, in %. Null when there is no recorded cost. */
  returnOnCostPct: string | null;
  changeVsList: string;
  changeVsListPct: string | null;
  /** Chosen price relative to market, in % (negative = below market). Null when market is 0. */
  vsMarketPct: string | null;
  belowCost: boolean;
  hasCost: boolean;
}

export function priceBuiltProperty(input: BuiltPricingInput): BuiltPricingResult {
  const area = D(input.areaSqm > 0 ? input.areaSqm : 0);
  const cost = D(input.totalCost || 0);
  const market = D(input.marketPricePerSqm || 0);
  const chosen = D(input.chosenPricePerSqm || 0);
  const list = D(input.currentListPrice || 0);

  const costPerSqm = area.isZero() ? D(0) : cost.dividedBy(area);
  const totalPrice = chosen.times(area);
  const profit = totalPrice.minus(cost);
  const change = totalPrice.minus(list);

  return {
    costPerSqm: costPerSqm.toFixed(2),
    breakEvenPricePerSqm: costPerSqm.toFixed(2),
    marketTotal: market.times(area).toFixed(2),
    totalPrice: totalPrice.toFixed(2),
    profit: profit.toFixed(2),
    marginPct: pct(profit, totalPrice),
    returnOnCostPct: pct(profit, cost),
    changeVsList: change.toFixed(2),
    changeVsListPct: pct(change, list),
    vsMarketPct: pct(chosen.minus(market), market),
    belowCost: !cost.isZero() && totalPrice.lessThan(cost),
    hasCost: !cost.isZero(),
  };
}

/** Price per m² that yields the given markup on cost (e.g. 20 -> cost × 1.2). */
export function pricePerSqmForMarkup(costPerSqm: Num, markupPct: Num): string {
  return D(costPerSqm || 0).times(D(100).plus(D(markupPct || 0))).dividedBy(100).toFixed(2);
}

export interface UnitPriceRow {
  unit_id: string;
  area_sqm: number;
  price_egp?: number;
  status?: string;
}

export interface UnitPriceResult {
  unit_id: string;
  currentPrice: string;
  newPrice: string;
  change: string;
}

/** Unit prices at a uniform price per m² (whole-property choice spread by area). */
export function priceUnitsAtRate(units: UnitPriceRow[], pricePerSqm: Num): UnitPriceResult[] {
  const rate = D(pricePerSqm || 0);
  return units.map((u) => {
    const current = D(u.price_egp || 0);
    const next = rate.times(D(u.area_sqm > 0 ? u.area_sqm : 0));
    return {
      unit_id: u.unit_id,
      currentPrice: current.toFixed(2),
      newPrice: next.toFixed(2),
      change: next.minus(current).toFixed(2),
    };
  });
}

/** Slider bounds: from 80% of the lower anchor to 130% of the higher anchor, rounded to 100 EGP/m². */
export function priceSliderBounds(costPerSqm: Num, marketPricePerSqm: Num): { min: number; max: number; step: number } {
  const c = D(costPerSqm || 0);
  const m = D(marketPricePerSqm || 0);
  const lo = c.isZero() ? m : (m.isZero() ? c : (c.lessThan(m) ? c : m));
  const hi = c.greaterThan(m) ? c : m;
  const min = Math.max(0, Math.floor(lo.times(0.8).dividedBy(100).toNumber()) * 100);
  const max = Math.max(min + 100, Math.ceil(hi.times(1.3).dividedBy(100).toNumber()) * 100);
  return { min, max, step: 100 };
}

export interface FeasibilityInput {
  landCost: Num;
  builtAreaSqm: number;
  constructionCostPerSqm: Num;
  /** Permits, design, supervision, utilities… as % of construction cost. */
  extraCostsPct: Num;
  salePricePerSqm: Num;
}

export interface FeasibilityResult {
  constructionCost: string;
  extraCosts: string;
  totalCost: string;
  costPerSqm: string;
  revenue: string;
  profit: string;
  marginPct: string | null;
  returnOnCostPct: string | null;
  breakEvenPricePerSqm: string;
}

export function estimateFeasibility(input: FeasibilityInput): FeasibilityResult {
  const area = D(input.builtAreaSqm > 0 ? input.builtAreaSqm : 0);
  const land = D(input.landCost || 0);
  const construction = D(input.constructionCostPerSqm || 0).times(area);
  const extras = construction.times(D(input.extraCostsPct || 0)).dividedBy(100);
  const total = land.plus(construction).plus(extras);
  const revenue = D(input.salePricePerSqm || 0).times(area);
  const profit = revenue.minus(total);
  const perSqm = area.isZero() ? D(0) : total.dividedBy(area);

  return {
    constructionCost: construction.toFixed(2),
    extraCosts: extras.toFixed(2),
    totalCost: total.toFixed(2),
    costPerSqm: perSqm.toFixed(2),
    revenue: revenue.toFixed(2),
    profit: profit.toFixed(2),
    marginPct: pct(profit, revenue),
    returnOnCostPct: pct(profit, total),
    breakEvenPricePerSqm: perSqm.toFixed(2),
  };
}
