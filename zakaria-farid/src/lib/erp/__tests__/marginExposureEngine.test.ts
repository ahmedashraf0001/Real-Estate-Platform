import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateContractMarginExposure,
  evaluatePortfolioMarginExposure,
  getAttributableUnitCosts,
  getLatestUnitEstimate,
  getEstimateAgeDays,
  DEFAULT_MARGIN_CONFIG,
} from '../marginExposureEngine';
import { ERPContract, ERPPropertyCostItem, ERPUnitEstimate } from '../types';
import { Property } from '@/lib/supabase/types';

describe('Margin Exposure Engine — Business Logic & Risk Invariants', () => {
  const propertyId = '11111111-2222-3333-4444-555555555555';
  const unitId = 'unit-101';

  const mockProperty: Property = {
    id: propertyId,
    title_ar: 'مشروع برج الأندلس',
    title_en: 'Alandalus Tower',
    total_units_count: 4,
    building_units: [
      { unit_id: 'unit-101', unit_number: '101', area_sqm: 100, price_egp: 3000000 },
      { unit_id: 'unit-102', unit_number: '102', area_sqm: 100, price_egp: 3000000 },
      { unit_id: 'unit-201', unit_number: '201', area_sqm: 100, price_egp: 3200000 },
      { unit_id: 'unit-202', unit_number: '202', area_sqm: 100, price_egp: 3200000 },
    ],
  } as unknown as Property;

  const realCosts: ERPPropertyCostItem[] = [
    // Direct unit cost
    {
      item_id: 'cost-1',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      category: 'finishing_interior',
      phase: 'finishing_interiors',
      item_name_ar: 'أرضيات سيراميك شقة 101',
      item_name_en: 'Ceramic Flooring Unit 101',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '150000.00',
      total_cost_egp: '150000.00',
      logged_date: '2026-08-01',
      logged_by: 'ENGINEER',
      status: 'verified',
    },
    // Common building cost (no building_unit_id)
    {
      item_id: 'cost-2',
      property_id: propertyId,
      category: 'civil_structure',
      phase: 'structural_skeleton',
      item_name_ar: 'أعمال خرسانة الهيكل الإنشائي',
      item_name_en: 'Concrete Structure Skeleton',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '800000.00',
      total_cost_egp: '800000.00',
      logged_date: '2026-07-01',
      logged_by: 'ENGINEER',
      status: 'verified',
    },
    // Synthetic cost item (MUST BE EXCLUDED)
    {
      item_id: 'cost-synth',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      category: 'mep_infrastructure',
      phase: 'masonry_roughing',
      item_name_ar: 'تأسيس سباكة وهمي',
      item_name_en: 'Synthetic Plumbing',
      quantity: 1,
      unit: 'مقطوعية',
      unit_cost_egp: '999999.00',
      total_cost_egp: '999999.00',
      logged_date: '2026-07-01',
      logged_by: 'SYSTEM',
      status: 'synthetic' as any,
    },
  ];

  it('1. Invariant: Historical unclassified contracts default strictly to UNKNOWN', () => {
    const unclassifiedContract: ERPContract = {
      contract_id: 'c-unclass',
      contract_number: 'ZF-HISTORIC-01',
      unit_id: '101',
      buyer_name: 'عميل تجريبي',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2025-01-15',
      handover_status: 'Pending',
      total_cash_collected: '1000000.00',
      status: 'Active',
      // sale_model left undefined
    };

    const res = evaluateContractMarginExposure(unclassifiedContract, realCosts, []);
    assert.equal(res.sale_model, 'UNCLASSIFIED');
    assert.equal(res.signal, 'UNKNOWN');
    assert.ok(res.notes?.includes('unclassified'));
  });

  it('2. Invariant: Attributable cost calculation excludes synthetic items and shares common costs', () => {
    const contract: ERPContract = {
      contract_id: 'c-offplan-1',
      contract_number: 'ZF-OFFPLAN-01',
      unit_id: '101',
      buyer_name: 'عميل تجريبي',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-06-01',
      handover_status: 'Pending',
      total_cash_collected: '500000.00',
      status: 'Active',
      sale_model: 'OFF_PLAN_INSTALLMENTS',
    };

    const costs = getAttributableUnitCosts(contract, realCosts, mockProperty);

    // Direct unit cost: 150,000 (synthetic 999,999 excluded)
    assert.equal(costs.directUnitCost.toFixed(2), '150000.00');

    // Common cost: 800,000. Unit area = 100 / total = 400 => share = 25% => 200,000
    assert.equal(costs.commonAllocatedCost.toFixed(2), '200000.00');
    assert.equal(costs.commonAllocationSharePercent.toFixed(0), '25');

    // Total attributable = 150,000 + 200,000 = 350,000
    assert.equal(costs.totalAttributableCost.toFixed(2), '350000.00');
  });

  it('3. Invariant: Off-plan contracts with missing estimates default to UNKNOWN, never healthy', () => {
    const contract: ERPContract = {
      contract_id: 'c-offplan-missing',
      contract_number: 'ZF-OFFPLAN-02',
      unit_id: '101',
      buyer_name: 'عميل تجريبي',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-06-01',
      handover_status: 'Pending',
      total_cash_collected: '500000.00',
      status: 'Active',
      sale_model: 'OFF_PLAN_INSTALLMENTS',
    };

    const res = evaluateContractMarginExposure(contract, realCosts, [], mockProperty);
    assert.equal(res.signal, 'UNKNOWN');
    assert.ok(res.notes?.includes('Missing estimate-to-complete'));
  });

  it('4. Invariant: Off-plan contracts with stale estimates (>90 days) default to UNKNOWN', () => {
    const contract: ERPContract = {
      contract_id: 'c-offplan-stale',
      contract_number: 'ZF-OFFPLAN-03',
      unit_id: '101',
      buyer_name: 'عميل تجريبي',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-01-01',
      handover_status: 'Pending',
      total_cash_collected: '500000.00',
      status: 'Active',
      sale_model: 'OFF_PLAN_INSTALLMENTS',
    };

    const staleEstimate: ERPUnitEstimate = {
      estimate_id: 'est-old',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      as_of_date: '2026-01-01', // >200 days old as of Sep 2026
      forecast_cost_to_complete: '1000000.00',
    };

    const res = evaluateContractMarginExposure(
      contract,
      realCosts,
      [staleEstimate],
      mockProperty,
      { referenceDate: '2026-09-26' }
    );

    assert.equal(res.signal, 'UNKNOWN');
    assert.equal(res.is_estimate_stale, true);
    assert.ok(res.notes?.includes('stale'));
  });

  it('5. Signal: Healthy margin corridor (>= 20%)', () => {
    const contract: ERPContract = {
      contract_id: 'c-offplan-healthy',
      contract_number: 'ZF-OFFPLAN-04',
      unit_id: '101',
      buyer_name: 'عميل تجريبي',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-08-01',
      handover_status: 'Pending',
      total_cash_collected: '500000.00',
      status: 'Active',
      sale_model: 'OFF_PLAN_INSTALLMENTS',
    };

    // Incurred = 350,000. Estimate = 1,500,000. Total = 1,850,000. Margin = 1,150,000 (38.3% >= 20%)
    const freshEstimate: ERPUnitEstimate = {
      estimate_id: 'est-fresh',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      as_of_date: '2026-09-01', // ~25 days old
      forecast_cost_to_complete: '1500000.00',
    };

    const res = evaluateContractMarginExposure(
      contract,
      realCosts,
      [freshEstimate],
      mockProperty,
      { referenceDate: '2026-09-26' }
    );

    assert.equal(res.signal, 'HEALTHY');
    assert.equal(res.is_estimate_stale, false);
    assert.equal(res.projected_margin_amount, '1150000.00');
    assert.equal(res.projected_margin_percentage, '38.33');
  });

  it('6. Signal: Review required band (0% - 20% margin)', () => {
    const contract: ERPContract = {
      contract_id: 'c-offplan-review',
      contract_number: 'ZF-OFFPLAN-05',
      unit_id: '101',
      buyer_name: 'عميل تجريبي',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-08-01',
      handover_status: 'Pending',
      total_cash_collected: '500000.00',
      status: 'Active',
      sale_model: 'OFF_PLAN_INSTALLMENTS',
    };

    // Incurred = 350,000. Estimate = 2,350,000. Total = 2,700,000. Margin = 300,000 (10% < 20%)
    const tightEstimate: ERPUnitEstimate = {
      estimate_id: 'est-tight',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      as_of_date: '2026-09-01',
      forecast_cost_to_complete: '2350000.00',
    };

    const res = evaluateContractMarginExposure(
      contract,
      realCosts,
      [tightEstimate],
      mockProperty,
      { referenceDate: '2026-09-26' }
    );

    assert.equal(res.signal, 'REVIEW_REQUIRED');
    assert.equal(res.projected_margin_amount, '300000.00');
    assert.equal(res.projected_margin_percentage, '10.00');
  });

  it('7. Signal: Distinct LOSS_EXPOSURE signal when projected cost exceeds sale price', () => {
    const contract: ERPContract = {
      contract_id: 'c-offplan-loss',
      contract_number: 'ZF-OFFPLAN-06',
      unit_id: '101',
      buyer_name: 'عميل تجريبي',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-08-01',
      handover_status: 'Pending',
      total_cash_collected: '500000.00',
      status: 'Active',
      sale_model: 'OFF_PLAN_INSTALLMENTS',
    };

    // Incurred = 350,000. Estimate = 3,150,000. Total = 3,500,000. Margin = -500,000 (< 0)
    const overrunEstimate: ERPUnitEstimate = {
      estimate_id: 'est-overrun',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      as_of_date: '2026-09-01',
      forecast_cost_to_complete: '3150000.00',
    };

    const res = evaluateContractMarginExposure(
      contract,
      realCosts,
      [overrunEstimate],
      mockProperty,
      { referenceDate: '2026-09-26' }
    );

    assert.equal(res.signal, 'LOSS_EXPOSURE');
    assert.equal(res.projected_margin_amount, '-500000.00');
    assert.ok(res.notes?.includes('Negative projected margin'));
  });

  it('8. Cash on Delivery (على المفتاح): Evaluates margin against completed costs without off-plan escalation', () => {
    const codContract: ERPContract = {
      contract_id: 'c-cod-1',
      contract_number: 'ZF-COD-01',
      unit_id: '101',
      buyer_name: 'عميل تجريبي',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-09-01',
      handover_status: 'Pending',
      total_cash_collected: '3000000.00',
      status: 'Active',
      sale_model: 'CASH_ON_DELIVERY',
    };

    // Incurred = 350,000. Forecast = 0. Margin = 2,650,000 (88.3% >= 20%)
    const res = evaluateContractMarginExposure(codContract, realCosts, [], mockProperty);

    assert.equal(res.sale_model, 'CASH_ON_DELIVERY');
    assert.equal(res.signal, 'HEALTHY');
    assert.equal(res.forecast_cost_to_complete, '0.00');
    assert.ok(res.notes?.includes('Cash on Delivery'));
  });

  it('9. Portfolio Summary: Correctly classifies contract distribution and calculates net loss exposure', () => {
    const contracts: ERPContract[] = [
      // 1. Healthy off-plan
      {
        contract_id: 'c1',
        contract_number: 'ZF-1',
        unit_id: '101',
        buyer_name: 'عميل تجريبي 1',
        property_id: propertyId,
        building_unit_id: 'unit-101',
        gross_contract_value: '3000000.00',
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2026-08-01',
        handover_status: 'Pending',
        total_cash_collected: '0',
        status: 'Active',
        sale_model: 'OFF_PLAN_INSTALLMENTS',
      },
      // 2. Loss exposure off-plan
      {
        contract_id: 'c2',
        contract_number: 'ZF-2',
        unit_id: '102',
        buyer_name: 'عميل تجريبي 2',
        property_id: propertyId,
        building_unit_id: 'unit-102',
        gross_contract_value: '2000000.00',
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2026-08-01',
        handover_status: 'Pending',
        total_cash_collected: '0',
        status: 'Active',
        sale_model: 'OFF_PLAN_INSTALLMENTS',
      },
      // 3. Unclassified historical
      {
        contract_id: 'c3',
        contract_number: 'ZF-3',
        unit_id: '201',
        buyer_name: 'عميل تجريبي 3',
        property_id: propertyId,
        gross_contract_value: '4000000.00',
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2025-01-01',
        handover_status: 'Pending',
        total_cash_collected: '0',
        status: 'Active',
      },
      // 4. Rescinded contract (must be reconciled and safely excluded from active exposure)
      {
        contract_id: 'c4',
        contract_number: 'ZF-4',
        unit_id: '202',
        buyer_name: 'عميل مفسوخ',
        property_id: propertyId,
        gross_contract_value: '3500000.00',
        currency: 'EGP',
        exchange_rate: '1.0000',
        contract_date: '2025-06-01',
        handover_status: 'Pending',
        total_cash_collected: '0',
        status: 'Rescinded',
        sale_model: 'OFF_PLAN_INSTALLMENTS',
      },
    ];

    const estimates: ERPUnitEstimate[] = [
      {
        estimate_id: 'e1',
        property_id: propertyId,
        building_unit_id: 'unit-101',
        as_of_date: '2026-09-01',
        forecast_cost_to_complete: '1500000.00',
      },
      {
        estimate_id: 'e2',
        property_id: propertyId,
        building_unit_id: 'unit-102',
        as_of_date: '2026-09-01',
        forecast_cost_to_complete: '2500000.00', // exceeds 2,000,000 + 200,000 common
      },
    ];

    const summary = evaluatePortfolioMarginExposure(
      contracts,
      realCosts,
      estimates,
      [mockProperty],
      { referenceDate: '2026-09-26' }
    );

    // Full reconciliation checks
    assert.equal(summary.totalContractsSubmitted, 4);
    assert.equal(summary.activeContractsEvaluated, 3);
    assert.equal(summary.rescindedContractsExcluded, 1);
    assert.equal(summary.totalOffPlanContracts, 2);
    assert.equal(summary.totalUnclassifiedContracts, 1);
    assert.equal(summary.healthyCount, 1);
    assert.equal(summary.lossExposureCount, 1);
    assert.equal(summary.unknownCount, 1); // unclassified
    assert.ok(summary.totalExposureLossAmount.gt(0));
    assert.equal(summary.appliedConfig.reviewThresholdPercent, 20);
  });

  it('10. Configurable Thresholds: Verifies reviewThresholdPercent can be tuned dynamically', () => {
    const contract: ERPContract = {
      contract_id: 'c-tune',
      contract_number: 'ZF-TUNE-01',
      unit_id: '101',
      buyer_name: 'عميل المعايرة',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2026-08-01',
      handover_status: 'Pending',
      total_cash_collected: '500000.00',
      status: 'Active',
      sale_model: 'OFF_PLAN_INSTALLMENTS',
    };

    // Incurred = 350,000. Estimate = 2,200,000. Total = 2,550,000. Margin = 450,000 (15%)
    const estimate: ERPUnitEstimate = {
      estimate_id: 'est-tune',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      as_of_date: '2026-09-01',
      forecast_cost_to_complete: '2200000.00',
    };

    // Under default 20% threshold: 15% margin triggers REVIEW_REQUIRED
    const defaultRes = evaluateContractMarginExposure(
      contract,
      realCosts,
      [estimate],
      mockProperty,
      { referenceDate: '2026-09-26' }
    );
    assert.equal(defaultRes.signal, 'REVIEW_REQUIRED');
    assert.equal(defaultRes.projected_margin_percentage, '15.00');

    // Under adjusted 10% threshold (e.g. 90% cost-to-proceeds policy): 15% margin is HEALTHY
    const tunedRes = evaluateContractMarginExposure(
      contract,
      realCosts,
      [estimate],
      mockProperty,
      { referenceDate: '2026-09-26', reviewThresholdPercent: 10 }
    );
    assert.equal(tunedRes.signal, 'HEALTHY');
    assert.equal(tunedRes.projected_margin_percentage, '15.00');
  });

  it('11. Direct Rescinded Contract Evaluation: Safely flags terminated contract as UNKNOWN/excluded', () => {
    const rescindedContract: ERPContract = {
      contract_id: 'c-rescinded-single',
      contract_number: 'ZF-RESCINDED-01',
      unit_id: '101',
      buyer_name: 'عميل مفسوخ مباشر',
      property_id: propertyId,
      building_unit_id: 'unit-101',
      gross_contract_value: '3000000.00',
      currency: 'EGP',
      exchange_rate: '1.0000',
      contract_date: '2025-01-01',
      handover_status: 'Pending',
      total_cash_collected: '0',
      status: 'Rescinded',
      sale_model: 'OFF_PLAN_INSTALLMENTS',
    };

    const res = evaluateContractMarginExposure(rescindedContract, realCosts, []);
    assert.equal(res.signal, 'UNKNOWN');
    assert.ok(res.notes?.includes('rescinded/terminated'));
  });
});
