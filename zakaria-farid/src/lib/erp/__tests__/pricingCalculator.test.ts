import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  priceBuiltProperty,
  pricePerSqmForMarkup,
  priceUnitsAtRate,
  priceSliderBounds,
  estimateFeasibility,
  repriceBuilding,
} from '../pricingCalculator';
import { ERPSupabaseService } from '../supabaseService';
import { D } from '../math';

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

describe('repriceBuilding & save handler (T1-T4)', () => {
  // T1: 6 units × 100 m², unit 1 contracted at 1,000,000, rate 9,000 -> five units 900,000, locked 1,000,000, total 5,500,000, Σunits == total
  it('T1 repriceBuilding: 6 units × 100 m², unit 1 contracted at 1,000,000, rate 9,000 -> five units 900,000, locked 1,000,000, total 5,500,000, Σunits == total', () => {
    const units = [
      { unit_id: 'u1', area_sqm: 100, price_egp: 1000000, status: 'contracted' },
      { unit_id: 'u2', area_sqm: 100, price_egp: 1000000, status: 'available' },
      { unit_id: 'u3', area_sqm: 100, price_egp: 1000000, status: 'available' },
      { unit_id: 'u4', area_sqm: 100, price_egp: 1000000, status: 'available' },
      { unit_id: 'u5', area_sqm: 100, price_egp: 1000000, status: 'available' },
      { unit_id: 'u6', area_sqm: 100, price_egp: 1000000, status: 'available' },
    ];

    const res = repriceBuilding(units, 9000);

    assert.equal(res.units.length, 6);
    assert.equal(res.units[0].locked, true);
    assert.equal(res.units[0].newPrice, '1000000.00');
    assert.equal(res.units[0].change, '0.00');

    for (let i = 1; i < 6; i++) {
      assert.equal(res.units[i].locked, false);
      assert.equal(res.units[i].newPrice, '900000.00');
      assert.equal(res.units[i].change, '-100000.00');
    }

    assert.equal(res.lockedTotal, '1000000.00');
    assert.equal(res.repricedTotal, '4500000.00');
    assert.equal(res.totalPrice, '5500000.00');

    // Σunits == total
    const sumUnits = res.units.reduce((acc, u) => acc.plus(u.newPrice), D(0));
    assert.equal(sumUnits.toFixed(2), res.totalPrice);
  });

  // T2: all available: 6 × 66.67/66.65 m² (from buildBuildingUnits 400 m²) at 10,000/m² -> total == Σ rounded unit prices, every unit whole EGP
  it('T2 all available: 6 × 66.67/66.65 m² (from buildBuildingUnits 400 m²) at 10,000/m² -> total == Σ rounded unit prices, every unit whole EGP', () => {
    const units = [
      { unit_id: 'u1', area_sqm: 66.67, price_egp: 666700, status: 'available' },
      { unit_id: 'u2', area_sqm: 66.67, price_egp: 666700, status: 'available' },
      { unit_id: 'u3', area_sqm: 66.67, price_egp: 666700, status: 'available' },
      { unit_id: 'u4', area_sqm: 66.67, price_egp: 666700, status: 'available' },
      { unit_id: 'u5', area_sqm: 66.67, price_egp: 666700, status: 'available' },
      { unit_id: 'u6', area_sqm: 66.65, price_egp: 666500, status: 'available' },
    ];

    const res = repriceBuilding(units, 10000);

    assert.equal(res.units.length, 6);
    // Every unit whole EGP
    for (const u of res.units) {
      const num = Number(u.newPrice);
      assert.equal(Number.isInteger(num), true, `Unit ${u.unit_id} newPrice ${u.newPrice} must be whole EGP`);
    }

    assert.equal(res.units[0].newPrice, '666700.00');
    assert.equal(res.units[5].newPrice, '666500.00');
    assert.equal(res.totalPrice, '4000000.00');

    // Total == Σ rounded unit prices
    const sumUnits = res.units.reduce((acc, u) => acc.plus(u.newPrice), D(0));
    assert.equal(sumUnits.toFixed(2), res.totalPrice);
  });

  // T3: reserved unit stays at its price; status 'available' but contracted (contract with building_unit_id) also stays locked
  it('T3 reserved unit stays at its price; status "available" but contracted (contract with building_unit_id) also stays locked', () => {
    const units = [
      { unit_id: 'u1', area_sqm: 100, price_egp: 800000, status: 'reserved' },
      { unit_id: 'u2', area_sqm: 100, price_egp: 850000, status: 'available' }, // has contract
      { unit_id: 'u3', area_sqm: 100, price_egp: 850000, status: 'available' }, // no contract
    ];

    const contracts = [
      { building_unit_id: 'u2', status: 'Active' },
    ];

    const res = repriceBuilding(units, 10000, contracts);

    // Reserved unit stays locked
    assert.equal(res.units[0].locked, true);
    assert.equal(res.units[0].newPrice, '800000.00');
    assert.equal(res.units[0].change, '0.00');

    // Available unit with contract stays locked
    assert.equal(res.units[1].locked, true);
    assert.equal(res.units[1].newPrice, '850000.00');
    assert.equal(res.units[1].change, '0.00');

    // Available unit without contract gets repriced
    assert.equal(res.units[2].locked, false);
    assert.equal(res.units[2].newPrice, '1000000.00');
    assert.equal(res.units[2].change, '150000.00');

    assert.equal(res.lockedTotal, '1650000.00');
    assert.equal(res.repricedTotal, '1000000.00');
    assert.equal(res.totalPrice, '2650000.00');
  });

  // T4: save handler: non-finalize save with unitPrices updates only available units and sets property price to the passed total; contracted/reserved unchanged
  it('T4 save handler: non-finalize save with unitPrices updates only available units and sets property price to the passed total; contracted/reserved unchanged', async () => {
    const updatePayloads: any[] = [];
    const rpcCalls: any[] = [];

    const mockSupabase: any = {
      rpc: async (fn: string, args: any) => {
        rpcCalls.push({ fn, args });
        return { data: { stage: 'revised', units_repriced: 0 }, error: null };
      },
      from: (table: string) => ({
        select: (_cols: string) => ({
          eq: (_col: string, _val: any) => ({
            single: async () => ({
              data: {
                building_units: [
                  { unit_id: 'u1', area_sqm: 100, price_egp: 800000, status: 'available' },
                  { unit_id: 'u2', area_sqm: 100, price_egp: 950000, status: 'reserved' },
                  { unit_id: 'u3', area_sqm: 100, price_egp: 1000000, status: 'contracted', contract_id: 'c1' },
                ],
              },
              error: null,
            }),
          }),
        }),
        update: (payload: any) => ({
          eq: async (_col: string, _val: any) => {
            updatePayloads.push(payload);
            return { error: null };
          },
        }),
      }),
    };

    const res = await ERPSupabaseService.recordPropertyPrice(mockSupabase, {
      propertyId: 'p-1',
      priceEgp: 2750000,
      finalize: false,
      unitPrices: {
        u1: 900000, // available unit repriced
        u2: 900000, // reserved unit MUST NOT be updated
        u3: 900000, // contracted unit MUST NOT be updated
      },
      costBasisEgp: '1500000',
    });

    // Assert RPC called to log price history with total
    assert.equal(rpcCalls.length, 1);
    assert.equal(rpcCalls[0].fn, 'record_property_price');
    assert.equal(rpcCalls[0].args.p_price_egp, 2750000);
    assert.equal(rpcCalls[0].args.p_finalize, false);

    // Assert exact update payload: property price and updated available units only
    assert.equal(updatePayloads.length, 1);
    const payload = updatePayloads[0];
    assert.equal(payload.price_egp, 2750000);
    assert.equal(payload.building_units.length, 3);
    assert.equal(payload.building_units[0].price_egp, 900000); // available: updated
    assert.equal(payload.building_units[1].price_egp, 950000); // reserved: unchanged
    assert.equal(payload.building_units[2].price_egp, 1000000); // contracted: unchanged
    assert.equal(res.units_repriced, 1);
  });
});
