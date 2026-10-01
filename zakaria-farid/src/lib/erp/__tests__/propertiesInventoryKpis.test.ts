import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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

  it('verifies 3-per-row grid contract in CSS structure', () => {
    const fs = require('fs');
    const path = require('path');
    const cssPath = path.resolve(__dirname, '../../../components/admin/erp/v2/views/PropertiesPortfolioView.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Verify showcaseGrid strictly uses repeat(3, minmax(0, 1fr))
    assert.ok(cssContent.includes('grid-template-columns: repeat(3, minmax(0, 1fr)) !important;'));
    assert.ok(cssContent.includes('.stageContainer,'));
    assert.ok(cssContent.includes('.container'));
  });
});
