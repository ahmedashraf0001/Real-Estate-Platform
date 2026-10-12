import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as markdown from '../../markdown/miniMarkdown';
import { adaptProperty } from '../../utils/propertyAdapter';
import { adminHarness, nodes, textOf } from './adminWizardHarness';

const req = createRequire(import.meta.url);
const oldCss = req.extensions['.css'];
req.extensions['.css'] = module => { module.exports = { __esModule: true, default: new Proxy({}, { get: (_, k) => String(k) }) }; };
const Blueprint = req('../../../components/blueprint/BuildingBlueprintPreview').default;
if (oldCss) req.extensions['.css'] = oldCss; else delete req.extensions['.css'];

test('public blueprint sold tile, reserved tile, legend and selected status use shared badge; admin unchanged', () => {
  const zones = ['sold', 'reserved'].map((status, i) => ({ id: status, zone_template_id: 'bld.unit', sort_order: i, trades: [], floor_number: 1, level_label: 'Floor 1', images: ['/test.jpg'], unit: { unit_code: status } }));
  const inventory = ['sold', 'reserved'].map(status => ({ unit_id: status, unit_number: status, floor: 1, status: status === 'sold' ? 'contracted' : 'reserved', area_sqm: 100, bedrooms: 2, bathrooms: 1 }));
  const props = { zones, inventory, view: { mode: 'floor', floorKey: 'Floor 1' }, isAr: false, selectedId: 'sold', onSelect() {}, onViewChange() {} };
  const out = renderToStaticMarkup(React.createElement(Blueprint, props));
  assert.match(out, /class="unit tileWithPhoto public-sold-media"/);
  assert.equal((out.match(/data-public-status="sold"/g) ?? []).length, 3, 'tile, selected panel, legend');
  assert.equal((out.match(/data-public-status="reserved"/g) ?? []).length, 2, 'tile, legend');
  const admin = renderToStaticMarkup(React.createElement(Blueprint, { ...props, selectedId: null, edit: { onChange() {} } }));
  assert.doesNotMatch(admin, /public-status|public-sold-media/);
  assert.match(admin, /Sold \/ Reserved/);
});

test('adapter preserves Markdown for detail; shared excerpts strip markers', () => {
  const p = adaptProperty({ slug: 'test', title_en: 'Test', title_ar: 'اختبار', description_en: '### Title\n**Bold** text', description_ar: '*وصف*' } as any, 'en');
  assert.equal(p.description_en, '### Title\n**Bold** text');
  assert.equal(p.description, 'Title Bold text');
  assert.equal(p.narrative, 'Title Bold text');
});

test('real detail header/banner and grid/list cards render sold badge and limited Markdown', () => {
  const imports: Record<string, any> = {
    'next/navigation': { useRouter: () => ({}), useParams: () => ({ locale: 'en' }) },
    '@/lib/context/FavoritesContext': { useFavorites: () => ({ isFavorite: () => false }) },
  };
  const load = (name: string) => {
    const code = ts.transpileModule(fs.readFileSync(`src/components/property/${name}.tsx`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const exports: any = {};
    const local = createRequire(`${process.cwd()}/src/components/property/${name}.tsx`);
    req.extensions['.css'] = module => { module.exports = { __esModule: true, default: new Proxy({}, { get: (_, k) => String(k) }) }; };
    try { vm.runInNewContext(code, { exports, console, URL, Intl, process, require: (id: string) => imports[id] ?? local(id) }); }
    finally { if (oldCss) req.extensions['.css'] = oldCss; else delete req.extensions['.css']; }
    return exports[name];
  };
  const Detail = load('PropertyDetailView'), Card = load('PropertyCard');
  const property = adaptProperty({ id: 'test', slug: 'test', title_en: 'Title', description_en: '### Heading\n**Bold** text', listing_status: 'sold', property_images: [{ url: '/test.jpg' }], type: 'apartment' } as any);
  const detail = renderToStaticMarkup(React.createElement(Detail, { property, locale: 'en' }));
  assert.match(detail, /data-public-status="sold"/);
  assert.match(detail, /This unit has been sold \(Sold\)/);
  assert.match(detail, /<h3 dir="auto" style="text-align:start">Heading<\/h3>/);
  assert.match(detail, /<strong>Bold<\/strong> text/);
  for (const viewMode of ['grid', 'list']) {
    const card = renderToStaticMarkup(React.createElement(Card, { property, locale: 'en', viewMode, onSelect() {} }));
    assert.match(card, /public-sold-media/);
    assert.match(card, /data-public-status="sold"/);
    assert.doesNotMatch(card, /\*\*Bold\*\*|### Heading/);
  }
});

test('real metadata and route JSON-LD use stripped Markdown for both locales', async () => {
  const source = fs.readFileSync('src/app/[locale]/properties/[slug]/page.tsx', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const property = { slug: 'test', title_ar: 'عنوان', title_en: 'Title', description_ar: '<h3>عنوان</h3><p><strong>وصف</strong></p>', description_en: '<h4>Title</h4><p><em>Description</em></p>' };
  const imports: Record<string, any> = { '@/lib/markdown/miniMarkdown': markdown,
    'next/navigation': { notFound() { throw new Error('unexpected missing property'); } },
    '@/lib/supabase/queries': { getPropertyBySlug: async () => property, getAllProperties: async () => [] },
    '@/lib/utils/propertyAdapter': { adaptProperty, adaptProperties: () => [] },
    '@/components/property/PropertyDetailView': { PropertyDetailView: 'Detail' },
    'react/jsx-runtime': req('react/jsx-runtime') };
  const exports: any = {};
  vm.runInNewContext(code, { exports, URL, process: { env: {} }, require(id: string) { assert.ok(id in imports, id); return imports[id]; } });
  for (const locale of ['ar', 'en']) {
    const params = Promise.resolve({ locale, slug: 'test' });
    const result = await exports.generateMetadata({ params });
    const expected = locale === 'ar' ? 'عنوان وصف' : 'Title Description';
    assert.equal(result.description, expected);
    assert.equal(result.openGraph.description, expected);
    const tree = await exports.default({ params });
    const script = nodes(tree).find(n => n.type === 'script');
    assert.equal(JSON.parse(script.props.dangerouslySetInnerHTML.__html).description, expected);
  }
});

test('real admin language tabs retain independent Markdown edits and review shows plain description', () => {
  const h = adminHarness('AdminPropertyForm', '?step=3');
  const props = { property: { description_ar: 'عربي', description_en: 'English', type: 'building' }, isAr: true };
  try {
    let tree = h.render(props);
    let editor = nodes(tree).find(n => n.type === 'MarkdownDescriptionEditor');
    assert.equal(editor.props.value, 'عربي');
    editor.props.onChange('**عربي معدل**');
    tree = h.render(props);
    nodes(tree).find(n => n.type === 'button' && textOf(n) === '🇬🇧English').props.onClick();
    tree = h.render(props);
    editor = nodes(tree).find(n => n.type === 'MarkdownDescriptionEditor');
    assert.equal(editor.props.value, 'English');
    editor.props.onChange('*Edited English*');
    tree = h.render(props);
    nodes(tree).find(n => n.type === 'button' && textOf(n) === '🇪🇬العربية').props.onClick();
    tree = h.render(props);
    assert.equal(nodes(tree).find(n => n.type === 'MarkdownDescriptionEditor').props.value, '**عربي معدل**');
    nodes(tree).find(n => n.type === 'button' && textOf(n).includes('المراجعة والنشر')).props.onClick();
    tree = h.render(props);
    assert.match(textOf(tree), /عربي معدل/);
    assert.doesNotMatch(textOf(tree), /\*\*عربي معدل\*\*/);
  } finally { h.cleanup(); }
});
