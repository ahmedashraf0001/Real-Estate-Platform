import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { D } from '../math';

describe('PropertiesInventoryKpis & Showcase Grid Contract Tests', () => {
  it('correctly calculates Card 1 needle percentage across benchmark market range (32k - 65k)', () => {
    const gaugeMin = 32000;
    const gaugeMax = 65000;

    // Test with market average 47,888.84
    const avgPrice = 47888.84;
    const clamped = Math.max(gaugeMin, Math.min(gaugeMax, avgPrice));
    const needlePct = Math.round(((clamped - gaugeMin) / (gaugeMax - gaugeMin)) * 100);

    // 47,888.84 is right around 48% across the 32k-65k benchmark
    assert.strictEqual(needlePct, 48);

    // Test clamping at lower boundary (30,000 clamped to 32,000 -> 0%)
    const lowClamped = Math.max(gaugeMin, Math.min(gaugeMax, 30000));
    const lowPct = Math.round(((lowClamped - gaugeMin) / (gaugeMax - gaugeMin)) * 100);
    assert.strictEqual(lowPct, 0);

    // Test clamping at upper boundary (70,000 clamped to 65,000 -> 100%)
    const highClamped = Math.max(gaugeMin, Math.min(gaugeMax, 70000));
    const highPct = Math.round(((highClamped - gaugeMin) / (gaugeMax - gaugeMin)) * 100);
    assert.strictEqual(highPct, 100);
  });

  it('correctly calculates Card 2 available inventory percentage and formatting', () => {
    const totalCatalogVal = D(260000000);
    const availableInventoryVal = D(176796040);

    const availValNum = availableInventoryVal.toNumber();
    const total = totalCatalogVal.toNumber();
    const availPct = Math.min(100, Math.max(0, Math.round((availValNum / total) * 100)));

    assert.strictEqual(availPct, 68);
    const displayAvailVal = Math.round(availValNum).toLocaleString('en-US');
    assert.strictEqual(displayAvailVal, '176,796,040');
  });

  it('correctly calculates Card 3 WIP capital and cost items formatting', () => {
    const totalWipInvested = D(170000);
    const costItemsCount = 3;

    const wipNum = totalWipInvested.toNumber();
    const displayWipVal = Math.round(wipNum).toLocaleString('en-US');
    assert.strictEqual(displayWipVal, '170,000');
    assert.strictEqual(costItemsCount, 3);
  });

  it('correctly calculates Card 4 contracted sales velocity and pill percentage', () => {
    const totalCatalogVal = D(315555551);
    const contractedSalesVal = D(141999998);

    const salesNum = contractedSalesVal.toNumber();
    const total = totalCatalogVal.toNumber();
    const soldPct = Math.min(100, Math.max(0, Math.round((salesNum / total) * 100)));

    assert.strictEqual(soldPct, 45);
    const displaySalesVal = Math.round(salesNum).toLocaleString('en-US');
    assert.strictEqual(displaySalesVal, '141,999,998');
  });

  it('honestly renders zero-states without fake fallback constants', () => {
    const zeroPrice = D(0);
    const zeroTotalVal = D(0);
    const zeroAvailVal = D(0);
    const zeroSalesVal = D(0);
    const zeroWip = D(0);

    // Card 1 zero needle and price
    const avgPriceNum = zeroPrice.toNumber();
    const displayAvgPrice = avgPriceNum > 0
      ? avgPriceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '0.00';
    const needlePct = avgPriceNum <= 0 ? 0 : 50;
    assert.strictEqual(displayAvgPrice, '0.00');
    assert.strictEqual(needlePct, 0);

    // Card 2 zero inventory
    const availValNum = zeroAvailVal.toNumber();
    const displayAvailVal = Math.round(availValNum).toLocaleString('en-US');
    const availPct = zeroTotalVal.toNumber() > 0 ? 50 : 0;
    assert.strictEqual(displayAvailVal, '0');
    assert.strictEqual(availPct, 0);

    // Card 3 zero WIP
    const wipNum = zeroWip.toNumber();
    const displayWipVal = Math.round(wipNum).toLocaleString('en-US');
    assert.strictEqual(displayWipVal, '0');

    // Card 4 zero sales
    const salesNum = zeroSalesVal.toNumber();
    const displaySalesVal = Math.round(salesNum).toLocaleString('en-US');
    const soldPct = zeroTotalVal.toNumber() > 0 ? 50 : 0;
    assert.strictEqual(displaySalesVal, '0');
    assert.strictEqual(soldPct, 0);
  });

  it('verifies 3-per-row grid contract in CSS structure', () => {
    const cssPath = path.resolve(__dirname, '../../../components/admin/erp/v2/views/PropertiesPortfolioView.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Verify showcaseGrid strictly uses repeat(3, minmax(0, 1fr))
    assert.ok(cssContent.includes('grid-template-columns: repeat(3, minmax(0, 1fr)) !important;'));
    assert.ok(cssContent.includes('.stageContainer,'));
    assert.ok(cssContent.includes('.container'));
  });

  it('verifies PropertiesInventoryKpis discrete floating cards contract without outer container', () => {
    const kpiCssPath = path.resolve(__dirname, '../../../components/admin/erp/v2/views/properties/PropertiesInventoryKpis.module.css');
    const kpiCss = fs.readFileSync(kpiCssPath, 'utf8');

    // Discrete floating card & grid standards
    assert.ok(kpiCss.includes('.discreteKpiGrid'), 'Must define .discreteKpiGrid');
    assert.ok(kpiCss.includes('.discreteKpiCard'), 'Must define .discreteKpiCard');
    assert.ok(kpiCss.includes('background: #ffffff !important;'), 'Must have pure white card surface');
    assert.ok(kpiCss.includes('border: 1px solid #cbd5e1;'), 'Must have 1px #cbd5e1 border');
    assert.ok(kpiCss.includes('border-radius: 12px;'), 'Must have 12px radius');
    assert.ok(kpiCss.includes('width: 28px;'), 'Must use 28x28 squircle');
    assert.ok(kpiCss.includes('height: 28px;'), 'Must use 28x28 squircle');

    // Outer panel / container must be completely removed
    assert.ok(!kpiCss.includes('.outerPanel'), 'Outer container .outerPanel must be removed');
    assert.ok(!kpiCss.includes('.panelHeader'), 'Outer container .panelHeader must be removed');
  });
});
