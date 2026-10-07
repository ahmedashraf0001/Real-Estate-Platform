import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildBuildingUnits, normalizeERPProperty } from '../projectStatusHelper';
import { D } from '../math';
import { priceUnitsAtRate } from '../pricingCalculator';
import { loadSaveProperty } from './buildingUnitsHarness';
import type { Property, BuildingUnitItem } from '@/lib/supabase/types';

const require = createRequire(import.meta.url);
require.extensions['.css'] = (module) => { module.exports = {}; };
const { ProjectShowcaseCard } = require('../../../components/admin/erp/v2/views/properties/ProjectShowcaseCard');

const generate = (areaSqm: number, count: number, priceEgp = 1000001.55) =>
  buildBuildingUnits({ propertyId: 'area-test', totalFloors: 1, unitsPerFloor: count, areaSqm, priceEgp });
const property = (units: BuildingUnitItem[], area = 400): Property => ({
  id: 'area-test', slug: 'area-test', type: 'building', title_ar: 'عمارة اختبار', title_en: 'Area test',
  description_ar: '', description_en: '', price_egp: 1000001.55, area_sqm: area,
  bedrooms: 0, bathrooms: 0, location: '', latitude: null, longitude: null,
  completion_status: 'ready', listing_status: 'active', is_featured: false, created_at: '2026-10-08',
  total_units_count: units.length, building_units: units,
});
const sum = (values: number[]) => values.reduce((total, value) => total.plus(value), D(0)).toFixed(2);
const cardArea = (p: Property, isAr = true) => {
  const html = renderToStaticMarkup(React.createElement(ProjectShowcaseCard, { property: p, isAr }));
  const label = isAr ? 'المساحات' : 'Areas';
  const match = html.match(new RegExp(`${label}</span><strong[^>]*>(.*?)</strong>`));
  assert.ok(match, 'production card must render an area metric');
  return match[1].replace(/<[^>]+>/g, '');
};

test('T1: 400 / 6 uses five 66.67 areas and a final 66.65, exactly 400', () => {
  const units = generate(400, 6);
  assert.deepEqual(units.map(u => u.area_sqm), [66.67, 66.67, 66.67, 66.67, 66.67, 66.65]);
  assert.equal(sum(units.map(u => u.area_sqm)), '400.00');
});

test('T1: even, single and zero-unit generation; decimal building area', () => {
  assert.deepEqual(generate(400, 4).map(u => u.area_sqm), [100, 100, 100, 100]);
  assert.deepEqual(generate(400.25, 1).map(u => u.area_sqm), [400.25]);
  assert.deepEqual(generate(400, 0), []);
  assert.deepEqual(generate(100.01, 3).map(u => u.area_sqm), [33.34, 33.34, 33.33]);
  assert.equal(sum(generate(100.01, 3).map(u => u.area_sqm)), '100.01');
});

test('T2: building priced per m² retains exact generated price total and last-unit piastres', () => {
  const price = D(400).times('2500.03');
  const units = generate(400, 6, price.toNumber());
  assert.equal(sum(units.map(u => u.price_egp)), price.toFixed(2));
  assert.deepEqual(units.map(u => u.price_egp), [166668, 166668, 166668, 166668, 166668, 166672]);
  const preview = priceUnitsAtRate(units, 2500);
  assert.equal(preview.reduce((total, row) => total.plus(row.newPrice), D(0)).toFixed(2), '1000000.00');
  assert.equal(sum(generate(400, 6).map(u => u.price_egp)), '1000001.55');
});

test('T3: equal stored units show building total plus a single unit area', () => {
  const units = generate(400, 6).map(u => ({ ...u, area_sqm: 66.67 }));
  assert.equal(cardArea(property(units)), '400 م² · الوحدات 66.67 م²');
});

test('T3: mixed units show range; trailing zeros dropped and stored total used', () => {
  assert.equal(cardArea(property(generate(400, 6))), '400 م² · الوحدات 66.65 - 66.67 م²');
  assert.equal(cardArea(property(generate(400, 4), 400.5)), '400.5 م² · الوحدات 100 م²');
  assert.equal(cardArea(property(generate(400, 6)), false), '400 m² · Units 66.65 - 66.67 m²');
});

test('R3/R4: empty inventory shows stored total only; persisted protected units stay byte-identical', () => {
  assert.equal(cardArea(property([], 0)), '0 م²');
  const units = generate(400, 6).map((u, i) => ({ ...u, area_sqm: 67,
    status: i === 0 ? 'reserved' as const : 'contracted' as const, contract_id: `contract-${i}` }));
  const p = property(units);
  const before = JSON.stringify(p);
  const normalized = normalizeERPProperty(p);
  assert.strictEqual(normalized.building_units, units);
  assert.equal(JSON.stringify(p), before);
  assert.equal(cardArea(p), '400 م² · الوحدات 67 م²');
});

test('R1: real saveProperty create persists the canonical six-unit area split', async () => {
  let saved: any;
  const client = { from: (table: string) => table === 'properties' ? {
    insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'area-test' }, error: null }) }) }),
    update: (payload: any) => { saved = payload; return { eq: async () => ({ error: null }) }; },
  } : { delete: () => ({ eq: async () => ({ error: null }) }), insert: async () => ({ error: null }) } };
  const result = await loadSaveProperty(client)({ type: 'building', total_floors: 4,
    units_per_floor: 2, area_sqm: 400, price_egp: 1000001.55 }, false, undefined, [], []);
  assert.equal(result.success, true);
  assert.deepEqual(saved.building_units.map((u: BuildingUnitItem) => u.area_sqm), [66.67, 66.67, 66.67, 66.67, 66.67, 66.65]);
  assert.equal(sum(saved.building_units.map((u: BuildingUnitItem) => u.price_egp)), '1000001.55');
});
