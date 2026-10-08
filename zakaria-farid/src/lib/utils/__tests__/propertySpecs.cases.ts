import assert from 'node:assert/strict';
import { buildPropertySpecs, getSpecGridColumns } from '../propertySpecs';
import { adaptProperty } from '../propertyAdapter';
import type { Property } from '../../supabase/types';

export function propertySpecTests(test: (name: string, run: () => void) => unknown) {
test('building specs show real floors and area, never bedrooms or bathrooms', () => {
  const cards = buildPropertySpecs({ type: 'building', floors: 6, sqm: 350, beds: 3, baths: 2 }, 'ar');
  assert.deepEqual(cards.map(c => c.id), ['floors', 'area', 'type']);
  assert.equal(cards[0].value, '6 أدوار');
  assert.equal(cards[1].value, '350 م²');
  assert.doesNotMatch(cards[2].value, /[a-z]/i);
});
test('apartment specs use plain Arabic values and omit absent year and zero area', () => {
  const cards = buildPropertySpecs({ type: 'apartment', beds: 3, baths: 2, sqm: 0 }, 'ar');
  assert.equal(cards.find(c => c.id === 'bedrooms')?.value, '3 غرف');
  assert.equal(cards.find(c => c.id === 'bathrooms')?.value, '2 حمام');
  assert.equal(cards.some(c => c.id === 'year' || c.id === 'area'), false);
});
test('all supported types have single-language labels, unknown types omitted', () => {
  for (const type of ['apartment','building','garage','villa','duplex','penthouse','townhouse','commercial','chalet']) {
    assert.doesNotMatch(buildPropertySpecs({ type }, 'ar')[0].value, /[a-z]/i);
    assert.doesNotMatch(buildPropertySpecs({ type }, 'en')[0].value, /[\u0600-\u06ff]/);
  }
  assert.deepEqual(buildPropertySpecs({ type: 'unknown' }, 'ar'), []);
});
test('specs omit invalid values and localize real finishing and year', () => {
  assert.deepEqual(buildPropertySpecs({ beds: NaN, baths: -2, floors: 0, sqm: Infinity }, 'en'), []);
  const cards = buildPropertySpecs({ type: 'villa', builtYear: 2024, finishing: 'semi_finished' }, 'en');
  assert.equal(cards.find(c => c.id === 'year')?.value, '2024');
  assert.equal(cards.find(c => c.id === 'finishing')?.value, 'Semi finished');
});
test('grid columns for counts 1 through 6 fill rows', () => {
  assert.deepEqual([1,2,3,4,5,6].map(getSpecGridColumns), [1,2,3,2,3,3]);
});
test('adapter retains persisted units and calendar, never invents finishing', () => {
  const units = [{ unit_id: 'a', floor: 1 }, { unit_id: 'b', floor: 5 }];
  const adapted = adaptProperty({ type: 'building', slug: 'building', title_ar: 'عمارة', title_en: 'Building', building_units: units, calcom_event_link: 'advisor/viewing', completion_status: 'ready' } as Property, 'ar');
  assert.deepEqual(adapted.building_units, units);
  assert.equal(adapted.floors, 6);
  assert.equal(adapted.calcom_event_link, 'advisor/viewing');
  assert.equal(adapted.finishing, undefined);
  assert.equal(buildPropertySpecs(adapted, 'ar').find(c => c.id === 'units')?.value, '2 وحدات');
});
}
