import test from 'node:test';
import assert from 'node:assert/strict';
import { isInsideEgypt, rankGeocodeCandidates } from '../../geocodeCandidates';
import { propertyWizardSteps, requiredFieldsForStep } from '../../propertyWizardSteps';
import { adminHarness, nodes, textOf } from './adminWizardHarness';
import { POST } from '../../../app/api/admin/geocode/route';
import { NextRequest } from 'next/server';

const property: any = { id: 'test-only', type: 'building', title_en: 'Test building', title_ar: 'مبنى الاختبار',
  location: 'منيا القمح', latitude: 30.51, longitude: 31.35, price_egp: 100, area_sqm: 100,
  bedrooms: 2, bathrooms: 1, completion_status: 'ready', listing_status: 'active',
  description_ar: '<p>وصف محفوظ</p>', description_en: '<p>Saved description</p>',
  property_images: [{ url: '/test-only-cover.jpg' }], property_amenities: [{ amenity_en: 'Lift' }],
  videos: [{ id: 'video-test', url: 'https://youtu.be/test-only', title_ar: 'Saved tour', category: 'tour' }],
};

function button(tree: any, label: string): any {
  const result = nodes(tree).find(n => n.type === 'button' && textOf(n).includes(label));
  assert.ok(result, `Missing button ${label}`);
  assert.equal(result.props.type, 'button');
  return result;
}

test('real wizard location/media steps hydrate edit values, validate only location and retain back input', async () => {
  const h = adminHarness('AdminPropertyForm');
  const props = { property, isAr: true };
  try {
    let tree = h.render(props);
    assert.ok(nodes(tree).some(n => n.type === 'DynamicMapPicker' && n.props.latitude === 30.51));
    assert.ok(!nodes(tree).some(n => n.type === 'EditorContent'));
    const location = nodes(tree).find(n => n.type === 'input' && n.props.name === 'location');
    assert.equal(location.props.defaultValue, 'منيا القمح');
    location.props.onChange({ target: { value: '' } });
    await button(tree, 'الخطوة التالية').props.onClick();
    tree = h.render(props);
    assert.ok(h.form.errors.location);
    assert.equal(new URL(h.location.href).searchParams.get('step'), '2');
    location.props.onChange({ target: { value: 'موقع معدل' } });
    await button(tree, 'الخطوة التالية').props.onClick();
    tree = h.render(props);
    assert.deepEqual(h.validationCalls, [['location'], ['location']]);
    assert.equal(new URL(h.location.href).searchParams.get('step'), '3');
    assert.ok(nodes(tree).some(n => n.type === 'EditorContent' && n.props.editor.getText() === 'وصف محفوظ'));
    assert.ok(!nodes(tree).some(n => n.type === 'DynamicMapPicker'));
    assert.equal(nodes(tree).find(n => n.type === 'MediaManager').props.videos[0].url, 'https://youtu.be/test-only');
    assert.ok(nodes(tree).some(n => n.type === 'img' && n.props.src === '/test-only-cover.jpg'));
    await button(tree, 'السابق').props.onClick();
    tree = h.render(props);
    assert.equal(nodes(tree).find(n => n.type === 'input' && n.props.name === 'location').props.defaultValue, 'موقع معدل');
    assert.equal(nodes(tree).filter(n => n.type === 'form').length, 1);
    assert.ok(nodes(tree).filter(n => n.type === 'button').every(n => n.props.type === 'button'));
  } finally { h.cleanup(); }
});

test('real review sections use new order and edit targets; step 5 does not imply saved', () => {
  for (const [label, target] of [['تعديل الموقع', 2], ['تعديل الوصف والوسائط', 3], ['تعديل المخططات والتشطيب', 4]] as const) {
    const h = adminHarness('AdminPropertyForm', '?step=5');
    try {
      const tree = h.render({ property, isAr: true });
      const text = textOf(tree);
      assert.ok(text.indexOf('تعديل الموقع') < text.indexOf('تعديل الوصف والوسائط'));
      assert.ok(text.indexOf('تعديل الوصف والوسائط') < text.indexOf('تعديل المخططات والتشطيب'));
      assert.ok(button(tree, 'نشر'));
      button(tree, label).props.onClick();
      h.render({ property, isAr: true });
      assert.equal(new URL(h.location.href).searchParams.get('step'), String(target));
    } finally { h.cleanup(); }
  }
});

test('real wizard validates step 1 only; English labels and blueprint deep link use new indices', async () => {
  const h = adminHarness('AdminPropertyForm', '?step=1');
  const props = { property, isAr: false };
  try {
    let tree = h.render(props);
    assert.ok(button(tree, 'Location'));
    assert.ok(button(tree, 'Description & media'));
    h.form.values.title_en = '';
    await button(tree, 'Next Step').props.onClick();
    tree = h.render(props);
    assert.ok(h.form.errors.title_en);
    assert.equal(h.form.errors.location, undefined);
    h.form.values.title_en = 'Test building';
    await button(tree, 'Next Step').props.onClick();
    assert.deepEqual(h.validationCalls, [
      ['title_en', 'title_ar', 'price_egp', 'area_sqm'], ['title_en', 'title_ar', 'price_egp', 'area_sqm'],
    ]);
    assert.equal(new URL(h.location.href).searchParams.get('step'), '2');
  } finally { h.cleanup(); }
  const cad = adminHarness('AdminPropertyForm', '?step=4');
  try { assert.ok(nodes(cad.render(props)).some(n => n.type === 'CADBlueprintBuilder')); } finally { cad.cleanup(); }
});

test('apartment wizard prompt is deferred until leaving description/media and opens blueprint step 4', async () => {
  const h = adminHarness('AdminPropertyForm', '?step=2');
  const props = { property: { ...property, type: 'apartment' }, isAr: false };
  try {
    let tree = h.render(props);
    await button(tree, 'Next Step').props.onClick(); tree = h.render(props);
    assert.equal(new URL(h.location.href).searchParams.get('step'), '3');
    assert.ok(!textOf(tree).includes('STEP 4: BLUEPRINT SETUP'));
    await button(tree, 'Next Step').props.onClick(); tree = h.render(props);
    assert.ok(textOf(tree).includes('STEP 4: BLUEPRINT SETUP'));
    const card = nodes(tree).find(n => n.type === 'div' && n.props.onClick && textOf(n).includes('Generate with Wizard'));
    assert.ok(card);
    card.props.onClick(); tree = h.render(props);
    assert.equal(new URL(h.location.href).searchParams.get('step'), '4');
    assert.equal(nodes(tree).find(n => n.type === 'CADBlueprintBuilder').props.autoOpenWizardOnEmpty, true);
  } finally { h.cleanup(); }
});

test('picker ignores a single-result response after the search text changes', async () => {
  let resolve!: (value: any) => void;
  const changes: number[][] = [];
  const h = adminHarness('MapPicker', '', () => new Promise(yes => { resolve = yes; }));
  const props = { isAr: false, onChange: (lat: number, lon: number) => changes.push([lat, lon]) };
  try {
    let tree = h.render(props);
    nodes(tree).find(n => n.type === 'input').props.onChange({ target: { value: 'Old query' } }); tree = h.render(props);
    const pending = button(tree, 'Find & Pin').props.onClick();
    nodes(tree).find(n => n.type === 'input').props.onChange({ target: { value: 'New query' } });
    resolve({ ok: true, json: async () => ({ results: [{ place_id: 'old', lat: '30.51', lon: '31.35', display_name: 'Old result' }] }) });
    await pending; tree = h.render(props);
    assert.equal(changes.length, 0);
    assert.equal(nodes(tree).filter(n => n.props.className === 'dropdown-item').length, 0);
    assert.equal(nodes(tree).find(n => n.type === 'input').props.value, 'New query');
  } finally { h.cleanup(); }
});

test('real picker never pins multiple results until selected; caps list at eight; single/empty/error states', async () => {
  let response: any = { results: Array.from({ length: 10 }, (_, i) => ({ place_id: i, lat: '30.51', lon: (31.35 + i / 100).toFixed(2), display_name: `Hospital ${i} — Minya El Qamh` })) };
  let ok = true;
  const changes: number[][] = [];
  const h = adminHarness('MapPicker', '', async () => ({ ok, status: ok ? 200 : 500, json: async () => response }));
  const props = { isAr: true, onChange: (lat: number, lon: number) => changes.push([lat, lon]) };
  try {
    let tree = h.render(props);
    const search = () => button(tree, 'بحث وانتقال').props.onClick();
    nodes(tree).find(n => n.type === 'input').props.onChange({ target: { value: 'Minya El Qamh' } });
    tree = h.render(props);
    await search(); tree = h.render(props);
    assert.equal(changes.length, 0);
    assert.equal(nodes(tree).filter(n => n.props.className === 'dropdown-item').length, 8);
    button(tree, 'Hospital 1').props.onClick(); tree = h.render(props);
    assert.deepEqual(changes, [[30.51, 31.36]]);
    response = { results: [{ place_id: 'one', lat: '30.51', lon: '31.35', display_name: 'one' }] };
    await search(); tree = h.render(props);
    assert.deepEqual(changes[1], [30.51, 31.35]);
    response = { results: [{ place_id: 'Sanaa', lat: '15.36', lon: '44.19', display_name: 'Sanaa' }] };
    await search(); tree = h.render(props);
    assert.equal(changes.length, 2);
    assert.match(textOf(tree), /لا توجد نتائج داخل مصر — جرّب اسم المدينة أو اسحب الدبوس/);
    ok = false; await search(); tree = h.render(props);
    assert.match(textOf(tree), /تعذر إتمام البحث/);
    assert.equal(changes.length, 2);
  } finally { h.cleanup(); }
});

test('Egypt box drops Sanaa and invalid coordinates, keeps Minya El Qamh and boundaries', () => {
  assert.equal(isInsideEgypt('15.36', '44.19'), false);
  assert.equal(isInsideEgypt('30.51', '31.35'), true);
  assert.equal(isInsideEgypt('22', '24.7'), true);
  assert.equal(isInsideEgypt('31.7', '36.9'), true);
  assert.equal(isInsideEgypt('NaN', '31.35'), false);
});

test('query city/address phrase ranks first, preserves tied provider order and input', () => {
  const candidates = [
    { display_name: 'مستشفى العاصمة — القاهرة' },
    { display_name: 'مستشفى عام — منيا القمح، الشرقية' },
    { display_name: 'مستشفى آخر — منيا القمح' },
  ];
  const result = rankGeocodeCandidates('شارع مستشفى العاصمة, منيا القمح', candidates);
  assert.deepEqual(result, [candidates[1], candidates[2], candidates[0]]);
  assert.equal(candidates[0].display_name, 'مستشفى العاصمة — القاهرة');
  assert.equal(rankGeocodeCandidates('مستشفى مِنيا القمح العام', candidates)[0], candidates[1]);
  assert.deepEqual(rankGeocodeCandidates('unknown', candidates), candidates);
});

test('five steps and current-step validation retain original required fields', () => {
  assert.deepEqual(propertyWizardSteps.map(s => [s.num, s.title_en]), [
    [1, 'Building & Partners'], [2, 'Location'], [3, 'Description & media'],
    [4, 'Floor Plan & Finishes'], [5, 'Review & Publish'],
  ]);
  assert.deepEqual(requiredFieldsForStep(1), ['title_en', 'title_ar', 'price_egp', 'area_sqm']);
  assert.deepEqual(requiredFieldsForStep(2), ['location']);
  for (const step of [3, 4, 5]) assert.deepEqual(requiredFieldsForStep(step), []);
});

test('real route filters Google and every fallback engine, sends Photon bbox, preserves pasted URL exception', async () => {
  const previousFetch = globalThis.fetch;
  const previousPublic = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const previousServer = process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  const request = (body: any) => new NextRequest('http://localhost/api/admin/geocode', { method: 'POST', body: JSON.stringify(body) });
  try {
    let mode = 'google';
    let photonURL = '';
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes('maps.googleapis.com')) return Response.json({ status: 'OK', results: [
        { place_id: 'outside', name: 'Sanaa', geometry: { location: { lat: 15.36, lng: 44.19 } } },
        ...(mode === 'google' ? [{ place_id: 'inside', name: 'Hospital', formatted_address: 'Minya El Qamh', geometry: { location: { lat: 30.51, lng: 31.35 } } }] : []),
      ] });
      if (url.includes('nominatim')) return Response.json([
        { place_id: 'outside-osm', lat: '15.36', lon: '44.19', display_name: 'Sanaa' },
        { place_id: 'inside-osm', lat: '30.51', lon: '31.35', display_name: 'Hospital, Minya El Qamh', name: 'Hospital', address: { town: 'Minya El Qamh' } },
      ]);
      if (url.includes('photon')) {
        photonURL = url;
        return Response.json({ features: [
          { properties: { name: 'Sanaa', osm_id: 1 }, geometry: { coordinates: [44.19, 15.36] } },
          { properties: { name: 'Clinic', city: 'Minya El Qamh', osm_id: 2 }, geometry: { coordinates: [31.36, 30.52] } },
        ] });
      }
      if (url.includes('arcgis')) return Response.json({ candidates: [
        { score: 90, address: 'Sanaa', location: { y: 15.36, x: 44.19 } },
        { score: 90, address: 'Street', attributes: { City: 'Minya El Qamh' }, location: { y: 30.53, x: 31.37 } },
      ] });
      throw new Error(`Unexpected URL ${url}`);
    }) as typeof fetch;
    const google = await (await POST(request({ query: 'Hospital Minya El Qamh', googleApiKey: 'test-only' }))).json();
    assert.equal(google.total, 1);
    assert.equal(google.results[0].place_id, 'google-inside');
    mode = 'fallback';
    const fallback = await (await POST(request({ query: 'Hospital Minya El Qamh', googleApiKey: 'test-only' }))).json();
    assert.deepEqual(fallback.results.map((r: any) => r.source), ['osm', 'photon', 'arcgis']);
    assert.ok(fallback.results.every((r: any) => isInsideEgypt(r.lat, r.lon)));
    assert.equal(new URL(photonURL).searchParams.get('bbox'), '24.7,22.0,36.9,31.7');
    const pasted = await (await POST(request({ query: 'https://google.com/maps/@15.36,44.19,17z' }))).json();
    assert.equal(pasted.results[0].lat, '15.36');
    assert.equal(pasted.isUrl, true);
    const raw = await (await POST(request({ query: '@15.36,44.19' }))).json();
    assert.equal(raw.isUrl, undefined);
    assert.ok(raw.results.every((r: any) => isInsideEgypt(r.lat, r.lon)));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; else process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = previousPublic;
    if (previousServer === undefined) delete process.env.GOOGLE_MAPS_API_KEY; else process.env.GOOGLE_MAPS_API_KEY = previousServer;
  }
});
