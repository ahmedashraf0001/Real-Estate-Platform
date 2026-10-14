import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mergeSiteContent, DEFAULT_ABOUT_CONTENT } from '../../siteContent/defaults';
import { DEFAULT_PLATFORM_SETTINGS } from '../../services/marketIntelligence';

const req = createRequire(import.meta.url);
const Module = req('node:module');
const originalLoad = Module._load;
let user: { id: string; role: string } | null = null;
let writes: unknown[] = [];
let dbError: { message: string } | null = null;
let row: unknown = null;
let reads = 0;
const propertyRecord = { id: 'test-property', slug: 'test', title_en: 'Test residence', title_ar: 'عقار اختبار', description_en: 'Residence description', description_ar: 'وصف العقار', price_egp: 1234567, area_sqm: 100, location: 'Cairo', property_images: [], property_amenities: [], type: 'apartment', completion_status: 'ready', listing_status: 'active', bedrooms: 2, bathrooms: 1 };
Module._load = function (id: string, ...args: unknown[]) {
  if (id === '@/lib/supabase/server') return { createClient: async () => ({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table: string) => ({
      upsert: async (value: unknown) => { writes.push({ table, value }); return { error: dbError }; },
      delete: () => ({ eq: async (_field: string, key: string) => { writes.push({ table, key }); return { error: dbError }; } }),
      select: () => ({ eq: () => ({ maybeSingle: async () => { reads++; return { data: row, error: dbError }; } }) }),
    }),
  }) };
  if (id === 'next/cache') return { revalidatePath() {} };
  if (id === '@/lib/supabase/queries') return { getPropertyBySlug: async () => propertyRecord, getAllProperties: async () => [] };
  if (id === 'next/navigation') return { useParams: () => ({ locale: 'en' }), useRouter: () => ({ refresh() {} }) };
  return originalLoad.call(this, id, ...args);
};
req.extensions['.css'] = module => { module.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }; };
const { saveSiteContent, resetSiteContent } = req('../../../app/actions/siteContent');
const { getSiteContent } = req('../../siteContent/server');
const { AboutView } = req('../../../components/about/AboutView');
const AdminPageContent = req('../../../components/admin/AdminPageContent').default;
const { PlatformSettingsProvider } = req('../../hooks/usePlatformSettings');
const { FavoritesProvider } = req('../../context/FavoritesContext');
const { PropertyCard } = req('../../../components/property/PropertyCard');
const PropertyDetailPage = req('../../../app/[locale]/properties/[slug]/page').default;

test('merge rejects unknown, missing and wrong-type fields at every depth without mutating defaults', () => {
  const merged = mergeSiteContent('platform_settings', { showMarketRadar: false, hidePropertyPrices: 'yes', contact: { phone: '123', email: 4 }, home: null, unknown: 1, marketDistricts: [null, { district: 'Edited', pricePerSqm: 'bad' }] });
  assert.equal(merged.showMarketRadar, false);
  assert.equal(merged.hidePropertyPrices, false);
  assert.equal(merged.contact.phone, '123');
  assert.equal(merged.contact.email, DEFAULT_PLATFORM_SETTINGS.contact.email);
  assert.deepEqual(merged.home, DEFAULT_PLATFORM_SETTINGS.home);
  assert.equal('unknown' in merged, false);
  assert.equal(merged.marketDistricts[1].district, 'Edited');
  assert.equal(typeof merged.marketDistricts[1].pricePerSqm, 'number');
  for (const value of [null, false, [], 123, 'bad']) assert.deepEqual(mergeSiteContent('about_page', value), DEFAULT_ABOUT_CONTENT);
  assert.equal(DEFAULT_PLATFORM_SETTINGS.contact.phone, '+20 2 19688');
});

test('merge keeps list order/removal, validates nested bilingual items, and empty fields use defaults', () => {
  const content = mergeSiteContent('about_page', { heroTitle1Ar: '', stages: [{ title: { ar: 'مرحلة جديدة', en: 5 }, accept: [{ ar: 'مقبول', en: null }], reject: [] }], stats: [{ value: { ar: '', en: '' }, label: { ar: 'مخفي', en: 'Hidden' } }] });
  assert.equal(content.heroTitle1Ar, DEFAULT_ABOUT_CONTENT.heroTitle1Ar);
  assert.equal(content.stages.length, 1);
  assert.equal(content.stages[0].title.ar, 'مرحلة جديدة');
  assert.equal(content.stages[0].title.en, DEFAULT_ABOUT_CONTENT.stages[0].title.en);
  assert.equal(content.stages[0].accept[0].ar, 'مقبول');
  assert.equal(content.stages[0].accept[0].en, DEFAULT_ABOUT_CONTENT.stages[0].accept[0].en);
  assert.deepEqual(content.stages[0].reject, []);
  const html = renderToStaticMarkup(React.createElement(AboutView, { locale: 'en', content }));
  assert.doesNotMatch(html, />Hidden</);
});

test('server reads persisted content with defaults and safely handles missing/malformed rows', async () => {
  row = { content: { hidePropertyPrices: true } }; dbError = null;
  assert.equal((await getSiteContent('platform_settings')).hidePropertyPrices, true);
  row = { content: ['invalid'] };
  assert.equal((await getSiteContent('platform_settings')).hidePropertyPrices, false);
  row = null;
  assert.deepEqual(await getSiteContent('about_page'), DEFAULT_ABOUT_CONTENT);
  assert.ok(reads >= 3);
});

test('save and reset reject unauthenticated/non-admin sessions without a database write', async () => {
  for (const session of [null, { id: 'visitor', role: 'anon' }]) {
    user = session; writes = [];
    assert.equal((await saveSiteContent('platform_settings', {})).success, false);
    assert.equal((await resetSiteContent('about_page')).success, false);
    assert.deepEqual(writes, []);
  }
});

test('admin save upserts validated content with actor; reset deletes only the selected key; errors propagate', async () => {
  user = { id: 'admin-user', role: 'authenticated' }; writes = []; dbError = null;
  assert.deepEqual(await saveSiteContent('platform_settings', { hidePropertyPrices: true, extra: true }), { success: true });
  const write = writes[0] as { table: string; value: { key: string; content: Record<string, unknown>; updated_by: string } };
  assert.equal(write.table, 'site_content'); assert.equal(write.value.key, 'platform_settings');
  assert.equal(write.value.updated_by, 'admin-user'); assert.equal(write.value.content.hidePropertyPrices, true);
  assert.equal('extra' in write.value.content, false);
  assert.deepEqual(await resetSiteContent('about_page'), { success: true });
  assert.deepEqual(writes[1], { table: 'site_content', key: 'about_page' });
  dbError = { message: 'write denied' };
  assert.equal((await saveSiteContent('about_page', {})).error, 'write denied');
  dbError = null;
});

test('public content never carries provider credentials; save rejects them instead of publishing them', async () => {
  user = { id: 'admin-user', role: 'authenticated' }; writes = [];
  const result = await saveSiteContent('platform_settings', { whatsappAutomation: { metaAccessToken: 'private-test-token' } });
  assert.equal(result.success, false); assert.deepEqual(writes, []);
  assert.equal(mergeSiteContent('platform_settings', { whatsappAutomation: { metaAccessToken: 'private-test-token' } }).whatsappAutomation?.metaAccessToken, '');
});

test('About defaults preserve editorial strings in both languages; overrides and markdown render server-side', () => {
  // Fixture captured from HEAD before this task, excluding the approved charter replacement.
  const snapshot = JSON.parse(readFileSync('src/lib/erp/__tests__/fixtures/aboutEditorialStrings.json', 'utf8'));
  for (const [locale, strings] of [['en', ['Curating Egypt’s', 'Premier Living & Estates', 'Founding the Architectural Advisory Desk', 'Eng. Farid Zakaria', 'Explore Sovereign Directory']], ['ar', ['ريادة التميز في', 'السوق العقاري الراقي', 'تأسيس المكتب الاستشاري المعماري الأول', 'م. فريد زكريا', 'استعراض الدليل الحصري']]] as const) {
    const html = renderToStaticMarkup(React.createElement(AboutView, { locale, content: DEFAULT_ABOUT_CONTENT }));
    for (const text of strings) assert.ok(html.includes(text.replaceAll('&', '&amp;')), text);
    for (const section of ['hero', 'metrology', 'paravent', 'founder', 'portal']) {
      const body = html.match(new RegExp(`<section class="atelier-${section}-section"[^>]*>([\\s\\S]*?)</section>`))![1];
      const displayed = body.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      assert.equal(displayed, snapshot[locale][section], `${locale}/${section} editorial string snapshot`);
    }
  }
  const content = mergeSiteContent('about_page', { heroTitle1En: 'Edited heading', manifestoEn: '**Edited paragraph**' });
  const html = renderToStaticMarkup(React.createElement(AboutView, { locale: 'en', content }));
  assert.match(html, /Edited heading/); assert.match(html, /<strong>Edited paragraph<\/strong>/);
  assert.doesNotMatch(html, /Curating Egypt’s/);
});

test('charter renders three unboxed stages with accept/reject columns, contact link and no unsupported claim', () => {
  const html = renderToStaticMarkup(React.createElement(AboutView, { locale: 'ar', content: DEFAULT_ABOUT_CONTENT }));
  assert.equal((html.match(/data-charter-stage=/g) || []).length, 3);
  assert.equal((html.match(/data-charter-accept=/g) || []).length, 3);
  assert.equal((html.match(/data-charter-reject=/g) || []).length, 3);
  assert.match(html, /مساقط مطابقة للمواصفات/); assert.match(html, /مخالفات بلدية معلقة/);
  assert.match(html, /href="\/ar\/contact"/);
  assert.doesNotMatch(html, /70%|٧٠٪|lightbox-toggle|pillar-folio|role="tab"/);
});

test('server-provided settings hide property card price in SSR, with no hydration flash', () => {
  const property = { id: 'test-property', slug: 'test', title_en: 'Test residence', title: 'Test residence', price: 1234567, price_egp: 1234567, area: 100, area_sqm: 100, location: 'Cairo', images: [], type: 'apartment', bedrooms: 2, bathrooms: 1 };
  const render = (hidePropertyPrices: boolean) => renderToStaticMarkup(React.createElement(PlatformSettingsProvider, { settings: { ...DEFAULT_PLATFORM_SETTINGS, hidePropertyPrices } }, React.createElement(FavoritesProvider, null, React.createElement(PropertyCard, { property, locale: 'en', onSelect() {} }))));
  assert.doesNotMatch(render(true), /1,234,567/);
  assert.match(render(false), /1,234,567/);
});

test('real property server route omits JSON-LD price and renders detail prices hidden when DB setting is true', async () => {
  for (const hidePropertyPrices of [true, false]) {
    row = { content: { hidePropertyPrices } }; dbError = null;
    const result = await PropertyDetailPage({ params: Promise.resolve({ locale: 'en', slug: 'test' }) });
    const html = renderToStaticMarkup(React.createElement(PlatformSettingsProvider, { settings: { ...DEFAULT_PLATFORM_SETTINGS, hidePropertyPrices } }, React.createElement(FavoritesProvider, null, result)));
    const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1]);
    if (hidePropertyPrices) {
      assert.equal('price' in jsonLd.offers, false); assert.doesNotMatch(html, /1,234,567/); assert.match(html, /Price on Application/);
    } else {
      assert.equal(jsonLd.offers.price, 1234567); assert.match(html, /1,234,567/);
    }
  }
});

test('admin SSR exposes each block, AR/EN inputs and list add/remove/reorder', () => {
  const html = renderToStaticMarkup(React.createElement(AdminPageContent, { adminLocale: 'ar', initialContent: DEFAULT_ABOUT_CONTENT, savedContent: DEFAULT_ABOUT_CONTENT, onChange() {}, onFocus() {} }));
  for (const block of ['hero', 'stats', 'story', 'charter', 'founder', 'portal']) assert.match(html, new RegExp(`data-content-block="${block}"`));
  assert.match(html, /EN/); assert.match(html, /العربية/);
  for (const label of ['إضافة', 'حذف', 'لأعلى', 'لأسفل', 'معاينة']) assert.ok(html.includes(label), label);
  const buttons = html.match(/<button\b[^>]*>/g) || [];
  assert.ok(buttons.length > 20); assert.ok(buttons.every(button => button.includes('type="button"')));
  assert.doesNotMatch(html, /<form/);
});

test('migration contract: public read, existing admin expression on each write, actor FK, update trigger, no seed', () => {
  const sql = readFileSync('supabase/migrations/20261013100000_site_content.sql', 'utf8');
  assert.match(sql, /key text primary key/i); assert.match(sql, /content jsonb not null default '\{\}'::jsonb/i);
  assert.match(sql, /updated_by uuid references auth.users/i); assert.match(sql, /enable row level security/i);
  assert.match(sql, /for select to anon, authenticated\s+using \(true\)/i);
  for (const operation of ['insert', 'update', 'delete']) assert.match(sql, new RegExp(`for ${operation} to authenticated`, 'i'));
  assert.equal((sql.match(/\(SELECT auth.role\(\)\) = 'authenticated'/g) || []).length, 4);
  assert.match(sql, /before update/i); assert.doesNotMatch(sql, /insert into/i);
});
