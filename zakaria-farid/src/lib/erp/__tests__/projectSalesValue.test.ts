import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateProjectSalesValue } from '../projectStatusHelper';
import type { Property } from '@/lib/supabase/types';
import type { ERPContract, ERPPropertyCostItem } from '../types';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as portfolioCalculations from '../propertiesPortfolioCalculations';

describe('calculateProjectSalesValue (fin-b4-price-basis)', () => {
  const buildingWith4Units: Property = {
    id: 'bldg-1',
    title_ar: 'عمارة سكنية تجريبية',
    title_en: 'Test Building',
    type: 'building',
    price_egp: 6_000_000,
    building_units: [
      { unit_id: 'apt-1', unit_number: '1A', floor: 1, area_sqm: 150, price_egp: 1_500_000, tax_amount_egp: 0, status: 'contracted' },
      { unit_id: 'apt-2', unit_number: '1B', floor: 1, area_sqm: 150, price_egp: 1_500_000, tax_amount_egp: 0, status: 'available' },
      { unit_id: 'apt-3', unit_number: '2A', floor: 2, area_sqm: 150, price_egp: 1_500_000, tax_amount_egp: 0, status: 'available' },
      { unit_id: 'apt-4', unit_number: '2B', floor: 2, area_sqm: 150, price_egp: 1_500_000, tax_amount_egp: 0, status: 'available' },
    ]
  } as unknown as Property;

  const liveContractApt1: ERPContract = {
    contract_id: 'cnt-1',
    property_id: 'bldg-1',
    building_unit_id: 'apt-1',
    building_unit_number: '1A',
    gross_contract_value: '1500010',
    status: 'Active'
  } as unknown as ERPContract;

  const costItems: ERPPropertyCostItem[] = [
    {
      item_id: 'cost-1',
      property_id: 'bldg-1',
      total_cost_egp: '500000',
      adjustments: [
        {
          adjustment_id: 'adj-1',
          adjustment_type: 'REFUND_OVERPAYMENT',
          amount_egp: '20000',
          created_at: '2026-10-07T00:00:00.000Z'
        }
      ]
    } as unknown as ERPPropertyCostItem,
    {
      item_id: 'cost-2',
      property_id: 'bldg-1',
      total_cost_egp: '1320001',
      adjustments: []
    } as unknown as ERPPropertyCostItem
  ];

  it('T1: building with 4 units, 1 live contract, and net cost items', () => {
    const result = calculateProjectSalesValue(buildingWith4Units, [liveContractApt1], costItems);
    assert.equal(result.salesValue.toFixed(2), '6000010.00');
    assert.equal(result.contractedSales.toFixed(2), '1500010.00');
    assert.equal(result.netCost.toFixed(2), '1800001.00');
  });

  it('T2: same building with rescinded contract', () => {
    const rescindedContract: ERPContract = {
      ...liveContractApt1,
      status: 'Rescinded'
    };
    const result = calculateProjectSalesValue(buildingWith4Units, [rescindedContract], costItems);
    assert.equal(result.salesValue.toFixed(2), '6000000.00');
    assert.equal(result.contractedSales.toFixed(2), '0.00');
  });

  it('T6: legacy whole-building contract without the flag covers all units (no double count)', () => {
    const master = { contract_id: 'cnt-m', property_id: 'bldg-1', gross_contract_value: '6000010', status: 'Active' } as unknown as ERPContract;
    const result = calculateProjectSalesValue(buildingWith4Units, [master], []);
    assert.equal(result.salesValue.toFixed(2), '6000010.00');
    assert.equal(result.contractedSales.toFixed(2), '6000010.00');
  });

  it('T7: a contract with another property_id is not matched by title', () => {
    const other = { contract_id: 'cnt-o', property_id: 'bldg-2', unit_id: 'عمارة سكنية تجريبية', gross_contract_value: '900000', status: 'Active' } as unknown as ERPContract;
    const result = calculateProjectSalesValue(buildingWith4Units, [other], []);
    assert.equal(result.salesValue.toFixed(2), '6000000.00');
    assert.equal(result.contractedSales.toFixed(2), '0.00');
  });

  it('T3: non-building property with price 2,000,000 and no contract', () => {
    const standaloneVilla: Property = {
      id: 'villa-1',
      title_ar: 'فيلا تجريبية',
      type: 'villa',
      price_egp: 2_000_000,
      building_units: []
    } as unknown as Property;

    const result = calculateProjectSalesValue(standaloneVilla, [], []);
    assert.equal(result.salesValue.toFixed(2), '2000000.00');
    assert.equal(result.contractedSales.toFixed(2), '0.00');
  });

  it('T4: cost on another property_id is excluded', () => {
    const costForOther: ERPPropertyCostItem = {
      item_id: 'cost-other',
      property_id: 'other-property',
      total_cost_egp: '999999',
      adjustments: []
    } as unknown as ERPPropertyCostItem;

    const result = calculateProjectSalesValue(buildingWith4Units, [liveContractApt1], [...costItems, costForOther]);
    assert.equal(result.netCost.toFixed(2), '1800001.00');
  });
  it('T5: production building card shows whole-building price, not unit price', () => {
    const file = 'src/components/admin/erp/v2/views/properties/ProjectShowcaseCard.tsx';
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const exports: Record<string, any> = {};
    const require = createRequire(import.meta.url);
    vm.runInNewContext(code, { exports, require: (id: string) => {
      if (id.endsWith('.module.css')) return {};
      if (id === '@/lib/erp/propertiesPortfolioCalculations') return portfolioCalculations;
      return require(id);
    } }, { filename: file });
    const html = renderToStaticMarkup(React.createElement(exports.ProjectShowcaseCard, {
      property: buildingWith4Units, contracts: [liveContractApt1], isAr: false,
    }));
    assert.match(html, /title="6,000,000 EGP"/);
    assert.match(html, />6 M EGP<\/strong>/);
    assert.doesNotMatch(html, /title="1,500,000 EGP"/);
  });

});
