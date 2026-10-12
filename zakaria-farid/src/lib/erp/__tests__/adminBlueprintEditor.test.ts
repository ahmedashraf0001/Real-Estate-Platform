import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as editor from '../../layering/blueprintEditor';
import * as metrics from '../../layering/zoneMetrics';
import type { ZoneInstance } from '../../layering/instances';
import { buildingFloorKey } from '../../layering/buildingBlueprint';

test('history pushes, undoes, redoes, drops redo branches and caps at 100', () => {
 let h = editor.createBlueprintHistory(0);
 assert.equal(editor.undoBlueprintHistory(h), h);
 for (let i = 1; i <= 105; i++) h = editor.pushBlueprintHistory(h, i);
 assert.equal(h.past.length, 100);
 h = editor.undoBlueprintHistory(h); assert.equal(h.present, 104);
 h = editor.redoBlueprintHistory(h); assert.equal(h.present, 105);
 h = editor.pushBlueprintHistory(editor.undoBlueprintHistory(h), 200);
 assert.deepEqual(h.future, []); assert.equal(h.present, 200);
 assert.equal(editor.pushBlueprintHistory(h, 200), h);
});
test('history coalesces one field until blur, preserves independent fields and resets', () => {
 let h = editor.createBlueprintHistory('a');
 h = editor.pushBlueprintHistory(h, 'ab', 'name');
 h = editor.pushBlueprintHistory(h, 'abc', 'name');
 assert.equal(h.past.length, 1);
 h = editor.sealBlueprintHistory(h);
 h = editor.pushBlueprintHistory(h, 'abcd', 'name');
 assert.equal(h.past.length, 2);
 h = editor.pushBlueprintHistory(h, 'other', 'width');
 assert.equal(editor.undoBlueprintHistory(h).present, 'abcd');
 assert.deepEqual(editor.createBlueprintHistory('loaded').past, []);
});
test('keyboard maps commands and ignores typing and unrelated modifiers', () => {
 const key = (key: string, ctrlKey = false, shiftKey = false, typing = false, metaKey = false) => editor.blueprintKeyboardCommand({ key, ctrlKey, shiftKey, metaKey, altKey: false }, typing);
 assert.equal(key('z', true), 'undo'); assert.equal(key('z', true, true), 'redo');
 assert.equal(key('y', true), 'redo'); assert.equal(key('z', false, false, false, true), 'undo');
 assert.equal(key('d', true), 'duplicate'); assert.equal(key('Delete'), 'delete');
 assert.equal(key('Enter'), 'inspect'); assert.equal(key('ArrowLeft'), 'previous');
 assert.equal(key('ArrowDown'), 'next'); assert.equal(key('z', true, false, true), null);
 assert.equal(key('Delete', false, false, true), null); assert.equal(key('d'), null);
});
test('ceiling parsing and AR/EN formatting preserve legacy input', () => {
 for (const raw of ['3.0m Flush', '3.6m Flush']) {
  const parsed = metrics.parseCeiling(raw);
  assert.deepEqual(parsed, { height_m: Number(raw.slice(0, 3)), type: 'flush' });
  assert.equal(metrics.formatCeiling(parsed, true), `${raw.slice(0, 3)} م · سقف مستوٍ`);
  assert.equal(metrics.formatCeiling(parsed, false), `${raw.slice(0, 3)} m · Flush ceiling`);
 }
 assert.deepEqual(metrics.parseCeiling('3.0 م · سقف معلق'), { height_m: 3, type: 'suspended' });
 assert.equal(metrics.formatCeiling(metrics.parseCeiling('Open Sky Pergola'), true), 'مفتوح · برجولا');
 assert.equal(metrics.formatCeiling(metrics.parseCeiling('custom imported ceiling'), true), 'سقف غير محدد');
});

const req = createRequire(import.meta.url);
const css = req.extensions['.css'];
req.extensions['.css'] = module => { module.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }; };
const Blueprint = req('../../../components/blueprint/BuildingBlueprintPreview').default;
if (css) req.extensions['.css'] = css; else delete req.extensions['.css'];
const zones: ZoneInstance[] = [
 { id: 'stairs', zone_template_id: 'bld.staircase', floor_number: 2, sort_order: 1, trades: [] },
 { id: 'unit', zone_template_id: 'bld.unit', floor_number: 2, instance_label: '2A', unit: { unit_code: '2A' }, sort_order: 2, trades: [], children: [] },
];
function render(editing: boolean, selectedId: string | null = 'stairs') {
 return renderToStaticMarkup(React.createElement(Blueprint, { zones, view: { mode: 'floor', floorKey: 'Floor 2' }, selectedId, isAr: true, onSelect() {}, onViewChange() {}, ...(editing ? { edit: { onChange() {} } } : {}) }));
}
test('edit SSR has history, clean tiles, tree apartments and docked full inspector', () => {
 const html = render(true);
 assert.match(html, /data-blueprint-editor/); assert.match(html, /تراجع/); assert.match(html, /إعادة/);
 assert.match(html, /0 تغييرات/); assert.match(html, /data-tile-menu/);
 assert.doesNotMatch(html, /tileActions|نقل للأمام|نقل للخلف/);
 assert.match(html, /data-floor-tree/); assert.match(html, /data-tree-unit="unit"/);
 for (const name of ['الاسم', 'النوع', 'الطول', 'العرض', 'الارتفاع', 'أنظمة التشطيب']) assert.ok(html.includes(name), name);
 assert.match(html, /data-media-manager/); assert.doesNotMatch(html, /<form|<button(?![^>]*type="button")/);
 assert.match(html, /3\.0 م · سقف مستوٍ/); assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /\bm²|Flush/);
 assert.match(render(true, null), /اختر مساحة لتعديلها/);
});
test('edit token block uses admin surfaces and accents without public gold', () => {
 const css = readFileSync('src/components/blueprint/BuildingBlueprintPreview.module.css', 'utf8');
 const block = css.slice(css.indexOf('/* Admin blueprint editor */'));
 assert.match(block, /--admin-accent/); assert.match(block, /--admin-card-bg/);
 assert.doesNotMatch(block, /var\(--gold-|#[\da-f]{3,8}\b/i);
});
test('public preview SSR snapshot includes approved sold and reserved legend badges', () => {
 assert.equal(createHash('sha256').update(render(false)).digest('hex'), 'bdf90054173915ea676d3a51f9c556c33141fd0f92d44be454d4b91665f4ca66');
});
