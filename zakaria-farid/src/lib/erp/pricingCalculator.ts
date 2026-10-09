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
  /** Optional override for total price (e.g. sum of unit prices for multi-unit buildings). */
  overrideTotalPrice?: Num;
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
  const totalPrice = input.overrideTotalPrice != null ? D(input.overrideTotalPrice) : chosen.times(area);
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
  contract_id?: string | null;
}

export interface UnitPriceResult {
  unit_id: string;
  currentPrice: string;
  newPrice: string;
  change: string;
}

export interface RepriceUnitRowResult extends UnitPriceResult {
  locked: boolean;
}

export interface RepriceBuildingResult {
  blocked?: 'RATE_TOO_LOW';
  units: RepriceUnitRowResult[];
  totalPrice: string;
  lockedTotal: string;
  repricedTotal: string;
  lockedCount: number;
  repricedCount: number;
}

/** Default price per m² from the current list price, 2 decimals (a whole-EGP rate drifts the total). */
export function defaultPricePerSqm(listPrice: Num, areaSqm: Num): string {
  const list = D(listPrice || 0);
  const area = D(areaSqm || 0);
  if (!list.isPositive() || !area.isPositive()) return '0';
  return list.dividedBy(area).toFixed(2);
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

/**
 * Reprice a building with units (BINDING RULE 2026-10-08):
 * - available units get new price per m² × their area (whole EGP, half-up using integer piastres)
 * - reserved/contracted units keep their current price (locked)
 * - total building price = sum of ALL units (locked + repriced)
 * - [user-confirmed 2026-10-08] the last available unit absorbs the whole-EGP rounding remainder, so the
 *   repriced units sum to rate × their total area (or to exactTotal, when given, no unit is locked and the
 *   gap is only the 2-decimal rate rounding)
 */
export function repriceBuilding(
  units: UnitPriceRow[],
  pricePerSqm: Num,
  contractsOrContractedIds?: Iterable<string> | Array<{ building_unit_id?: string | null; status?: string }>,
  exactTotal?: Num,
  targetAreaSqm?: Num
): RepriceBuildingResult {
  const rate = D(pricePerSqm || 0);

  const contractedIds = new Set<string>();
  for (const item of contractsOrContractedIds ?? []) {
    if (typeof item === 'string') contractedIds.add(item);
    else if (item.status !== 'Rescinded' && item.building_unit_id) contractedIds.add(item.building_unit_id);
  }
  const roundWholeProduct = (area: ReturnType<typeof D>) => {
    // Both operands have two decimals. Round their exact product directly to EGP,
    // without first rounding it to piastres (99.50 × 1.01 = 100.495 -> 100).
    const product = rate.toCents() * area.toCents();
    const whole = ((product < BigInt(0) ? -product : product) + BigInt(5000)) / BigInt(10000);
    return D(product < BigInt(0) ? -whole : whole);
  };

  let lockedTotal = D(0);
  let repricedTotal = D(0);
  let lockedCount = 0;
  let repricedCount = 0;
  let repricedArea = D(0);
  let lastRepricedIdx = -1;

  const unitResults: RepriceUnitRowResult[] = units.map((u, i) => {
    const current = D(u.price_egp || 0);
    const isLocked =
      Boolean(u.status && u.status !== 'available') ||
      Boolean(u.contract_id) ||
      contractedIds.has(u.unit_id);

    if (isLocked) {
      lockedTotal = lockedTotal.plus(current);
      lockedCount++;
      return {
        unit_id: u.unit_id,
        currentPrice: current.toFixed(2),
        newPrice: current.toFixed(2),
        change: '0.00',
        locked: true,
      };
    }

    const area = D(u.area_sqm > 0 ? u.area_sqm : 0);
    const next = roundWholeProduct(area);
    repricedTotal = repricedTotal.plus(next);
    repricedCount++;
    repricedArea = repricedArea.plus(area);
    lastRepricedIdx = i;

    return {
      unit_id: u.unit_id,
      currentPrice: current.toFixed(2),
      newPrice: next.toFixed(2),
      change: next.minus(current).toFixed(2),
      locked: false,
    };
  });

  // Last available unit absorbs the rounding remainder (whole EGP).
  if (lastRepricedIdx >= 0) {
    const atRate = roundWholeProduct(repricedArea);
    // exactTotal only covers the 2-decimal rate rounding; unit areas that do not add up to the
    // building area must not be pushed onto one unit.
    const useExact = exactTotal != null && lockedCount === 0 && targetAreaSqm != null &&
      repricedArea.eq(targetAreaSqm) && D(exactTotal).toCents() % BigInt(100) === BigInt(0);
    const target = useExact ? D(exactTotal as Num) : atRate;
    const diff = target.minus(repricedTotal);
    const last = unitResults[lastRepricedIdx];
    const absorbed = D(last.newPrice).plus(diff);
    if (absorbed.lt(0)) {
      return { blocked: 'RATE_TOO_LOW', units: [], totalPrice: '0.00', lockedTotal: lockedTotal.toFixed(2),
        repricedTotal: '0.00', lockedCount, repricedCount };
    }
    if (!diff.isZero()) {
      last.newPrice = absorbed.toFixed(2);
      last.change = absorbed.minus(last.currentPrice).toFixed(2);
      repricedTotal = target;
    }
  }

  const totalPrice = lockedTotal.plus(repricedTotal);

  return {
    units: unitResults,
    totalPrice: totalPrice.toFixed(2),
    lockedTotal: lockedTotal.toFixed(2),
    repricedTotal: repricedTotal.toFixed(2),
    lockedCount,
    repricedCount,
  };
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
