import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { loadSaveProperty } from './buildingUnitsHarness';

// Execute the form's actual mapping expressions; do not duplicate their field lists.
const formFile = 'src/components/admin/AdminPropertyForm.tsx';
const source = fs.readFileSync(formFile, 'utf8');
const ast = ts.createSourceFile(formFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function expression(name: string) {
  let result = '';
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name && node.initializer) {
      result = node.initializer.getText(ast);
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === name) result = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(result, `Missing production expression: ${name}`);
  return result;
}
const functions = ast.statements.filter((node): node is ts.FunctionDeclaration =>
  ts.isFunctionDeclaration(node) && ['hydrateBuildingConfig', 'inferSubtype'].includes(node.name?.text || '')
).map(node => node.getText(ast).replace(/^export /, '')).join('\n');
function mapForm(name: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`${functions}\nconst result = (${expression(name)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return vm.runInNewContext(`${code}\nresult`, context, { filename: formFile });
}

for (const type of ['building', 'apartment']) {
  it(`T1: ${type} create/save/edit round-trip retains area 400 and other basic fields`, async () => {
    const data = {
      type, area_sqm: 400, price_egp: 4000000, title_en: 'Area round-trip', title_ar: 'اختبار المساحة',
      bedrooms: 3, bathrooms: 2, location: 'Cairo', latitude: 30, longitude: 31,
      completion_status: 'ready', listing_status: 'active', is_featured: false,
      view: 'Sea', floor_number: 2, total_floors: 4, units_per_floor: 2,
    };
    const payload = mapForm('payloadBase', {
      data, editorEn: null, editorAr: null, zoneInstances: [], videos: [], partnerSplits: [],
    });
    let stored: any;
    const client = { from(table: string) {
      assert.equal(table, 'properties');
      return {
        insert(value: any) {
          stored = { ...value, id: 'area-round-trip', slug: 'area-round-trip' };
          return { select: () => ({ single: async () => ({ data: stored, error: null }) }) };
        },
        update(value: any) {
          return { eq: async (_column: string, id: string) => {
            assert.equal(id, stored.id);
            stored = { ...stored, ...value };
            return { error: null };
          } };
        },
      };
    } };
    const result = await loadSaveProperty(client)(payload, false);
    assert.equal(result.success, true);
    assert.equal(stored.area_sqm, 400);

    // Execute the production edit-page loader, including its row-to-form wiring.
    const pageFile = 'src/app/admin/(dashboard)/[adminLocale]/(dashboard-pages)/properties/[id]/edit/page.tsx';
    const pageCode = ts.transpileModule(fs.readFileSync(pageFile, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const exports: any = {};
    vm.runInNewContext(pageCode, { exports, require(id: string) {
      if (id === 'react/jsx-runtime') return jsx;
      if (id === 'next/navigation') return { notFound() { throw new Error('Property not found'); } };
      if (id === '@/components/admin/AdminPropertyForm') return { default: () => null };
      if (id === '@/lib/supabase/server') return { createClient: async () => ({ from(table: string) {
        assert.equal(table, 'properties');
        return { select(columns: string) {
          assert.equal(columns, '*, property_images(*), property_amenities(*)');
          return { eq: (_column: string, id: string) => {
            assert.equal(id, stored.id);
            return { single: async () => ({ data: stored, error: null }) };
          } };
        } };
      } }) };
      throw new Error(`Unexpected test import ${id}`);
    } }, { filename: pageFile });
    const page = await exports.default({ params: Promise.resolve({ id: stored.id, adminLocale: 'ar' }) });
    const property = page.props.children.props.property;
    const initialBuildingConfig = mapForm('initialBuildingConfig', { property });
    const defaults = mapForm('defaultValues', { property, initialBuildingConfig });
    assert.equal(defaults.area_sqm, 400);
    for (const field of ['title_en', 'title_ar', 'price_egp', 'bedrooms', 'bathrooms', 'type',
      'location', 'latitude', 'longitude', 'completion_status', 'listing_status', 'is_featured', 'view', 'floor_number']) {
      assert.equal(defaults[field], data[field as keyof typeof data], field);
    }
    if (type === 'building') {
      assert.equal(defaults.total_floors, 4);
      assert.equal(defaults.units_per_floor, 2);
      assert.equal(stored.building_units.length, 6);
      assert.deepEqual(stored.building_units.map((unit: any) => unit.area_sqm), [67, 67, 67, 67, 67, 67]);
    }
  });
}
