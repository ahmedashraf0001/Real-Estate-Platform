import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  priceBuiltProperty,
  pricePerSqmForMarkup,
  priceUnitsAtRate,
  priceSliderBounds,
  estimateFeasibility,
} from '../pricingCalculator';

describe('pricingCalculator — built property (cost floor vs market)', () => {
  it('prices at the chosen rate and reports profit against recorded cost', () => {
    const r = priceBuiltProperty({ totalCost: 100000, areaSqm: 150, marketPricePerSqm: 20000, chosenPricePerSqm: 18000, currentListPrice: 3000000 });
    assert.equal(r.costPerSqm, '666.67');
    assert.equal(r.breakEvenPricePerSqm, '666.67');
    assert.equal(r.marketTotal, '3000000.00');
    assert.equal(r.totalPrice, '2700000.00');
    assert.equal(r.profit, '2600000.00');
    assert.equal(r.marginPct, '96.3');
    assert.equal(r.returnOnCostPct, '2600.0');
    assert.equal(r.changeVsList, '-300000.00');
    assert.equal(r.changeVsListPct, '-10.0');
    assert.equal(r.vsMarketPct, '-10.0');
    assert.equal(r.belowCost, false);
    assert.equal(r.hasCost, true);
  });

  it('flags a price below cost', () => {
    const r = priceBuiltProperty({ totalCost: 1000000, areaSqm: 100, marketPricePerSqm: 9000, chosenPricePerSqm: 9000, currentListPrice: 0 });
    assert.equal(r.profit, '-100000.00');
    assert.equal(r.belowCost, true);
    assert.equal(r.changeVsListPct, null);
  });

  it('handles no recorded cost and zero area without dividing by zero', () => {
    const r = priceBuiltProperty({ totalCost: 0, areaSqm: 0, marketPricePerSqm: 0, chosenPricePerSqm: 0, currentListPrice: 0 });
    assert.equal(r.costPerSqm, '0.00');
    assert.equal(r.marginPct, null);
    assert.equal(r.returnOnCostPct, null);
    assert.equal(r.vsMarketPct, null);
    assert.equal(r.belowCost, false);
    assert.equal(r.hasCost, false);
  });
});

describe('pricingCalculator — helpers', () => {
  it('markup on cost', () => {
    assert.equal(pricePerSqmForMarkup('666.67', 20), '800.00');
    assert.equal(pricePerSqmForMarkup(10000, 0), '10000.00');
  });

  it('unit prices at a uniform rate', () => {
    const rows = priceUnitsAtRate([{ unit_id: 'a', area_sqm: 120, price_egp: 2000000 }, { unit_id: 'b', area_sqm: 0 }], 18000);
    assert.deepEqual(rows[0], { unit_id: 'a', currentPrice: '2000000.00', newPrice: '2160000.00', change: '160000.00' });
    assert.equal(rows[1].newPrice, '0.00');
  });

  it('slider bounds span cost and market', () => {
    assert.deepEqual(priceSliderBounds(666.67, 20000), { min: 500, max: 26000, step: 100 });
    assert.deepEqual(priceSliderBounds(0, 0), { min: 0, max: 100, step: 100 });
    assert.deepEqual(priceSliderBounds(12000, 10000), { min: 8000, max: 15600, step: 100 });
  });
});

describe('pricingCalculator — feasibility', () => {
  it('totals land, construction and extras against expected sales', () => {
    const r = estimateFeasibility({ landCost: 2000000, builtAreaSqm: 1000, constructionCostPerSqm: 7500, extraCostsPct: 10, salePricePerSqm: 15000 });
    assert.equal(r.constructionCost, '7500000.00');
    assert.equal(r.extraCosts, '750000.00');
    assert.equal(r.totalCost, '10250000.00');
    assert.equal(r.costPerSqm, '10250.00');
    assert.equal(r.revenue, '15000000.00');
    assert.equal(r.profit, '4750000.00');
    assert.equal(r.marginPct, '31.7');
    assert.equal(r.returnOnCostPct, '46.3');
    assert.equal(r.breakEvenPricePerSqm, '10250.00');
  });

  it('zero area gives zeros, not NaN', () => {
    const r = estimateFeasibility({ landCost: 0, builtAreaSqm: 0, constructionCostPerSqm: 0, extraCostsPct: 0, salePricePerSqm: 0 });
    assert.equal(r.totalCost, '0.00');
    assert.equal(r.marginPct, null);
  });
});
