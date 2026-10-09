import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as pricing from '../pricingCalculator';
import * as math from '../math';
import * as costs from '../propertyCostEngine';
import * as status from '../projectStatusHelper';
import ExcelJS from 'exceljs';
import { exportAccountLedgerExcel } from '../excelExporter';
import { calculateAccountStatement } from '../accountStatement';
import { CANONICAL_COA } from '../ledger';
import { ERPSupabaseService } from '../supabaseService';
import * as statements from '../statements/builders';

// Execute the production component and its handlers; only rendering boundaries and hooks are adapted.
function calculator(property: any, propertyCosts: any[] = [], contracts: any[] = [], isAr = true) {
  const slots: any[] = [];
  let cursor = 0;
  const effects: Array<() => void> = [];
  const same = (a: any[], b: any[]) => a?.length === b?.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial: any) {
      const i = cursor++;
      slots[i] ||= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, (next: any) => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }];
    },
    useRef(value: any) { return slots[cursor++] ||= { current: value }; },
    useMemo(fn: any, deps: any[]) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() };
      return slots[i].value;
    },
    useEffect(fn: any, deps: any[]) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) effects.push(() => {
        slots[i]?.cleanup?.();
        slots[i] = { deps, cleanup: fn() };
      });
    },
  };
  const file = 'src/components/admin/erp/v2/views/calculator/CostPricingCalculator.tsx';
  const code = ts.transpileModule(fs.readFileSync(path.resolve(file), 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports: any = {};
  const components = new Proxy({}, { get: (_, name) => String(name) });
  const imports: Record<string, any> = {
    react, 'react/jsx-runtime': jsx, 'lucide-react': components,
    '@/lib/erp/pricingCalculator': pricing, '@/lib/erp/math': math,
    '@/lib/erp/propertyCostEngine': costs, '@/lib/erp/projectStatusHelper': status,
    '@/lib/erp/statements/builders': statements,
    '../../../context/ERPWorkstationContext': { useERPWorkstationContext: () => ({ data: { contracts } }) },
  };
  vm.runInNewContext(code, { exports, console, require(id: string) {
    if (id in imports) return imports[id];
    if (id.startsWith('../../') || id.endsWith('.css')) return components;
    throw Error(`Unexpected calculator dependency ${id}`);
  } }, { filename: file });
  const saves: any[][] = [];
  const props = { properties: [property], propertyCosts, isAr,
    onUpdateSellingPrice: async (...args: any[]) => { saves.push(args); return true; } };
  return {
    saves,
    render() {
      cursor = 0;
      const tree = exports.CostPricingCalculator(props);
      effects.splice(0).forEach(effect => effect());
      return tree;
    },
    cleanup() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

function nodes(tree: any): any[] {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.footer)];
}
function label(node: any): string {
  if (Array.isArray(node)) return node.map(label).join('');
  if (node && typeof node === 'object') return label(node.props?.children);
  return node == null ? '' : String(node);
}
function button(tree: any, text: string) {
  const found = nodes(tree).find(node => node.type === 'button' && label(node) === text);
  assert.ok(found, `Missing button ${text}`);
  return found;
}
const property = { id: 'p1', title_ar: 'عقار الاختبار', area_sqm: 10, price_egp: 100, completion_status: 'ready' };

it('real workstation handler reloads authoritative units when the RPC reprices fewer units than requested', async () => {
  const before = { ...property, price_egp: 200, building_units: [
    { unit_id: 'u1', status: 'available', price_egp: 100 },
    { unit_id: 'u2', status: 'available', price_egp: 100 },
  ] };
  const saved = { ...before, price_egp: 300, building_units: [
    { unit_id: 'u1', status: 'reserved', price_egp: 100 },
    { unit_id: 'u2', status: 'available', price_egp: 200 },
  ] };
  let dataset = { properties: [before], recordedProperties: [before] };
  let reads = 0;
  const supabase = {
    rpc: async () => ({ data: { stage: 'revised', units_repriced: 1, price_egp: 300 }, error: null }),
    from(table: string) {
      assert.equal(table, 'properties'); reads++;
      return { select: () => ({ eq: (_: string, id: string) => {
        assert.equal(id, 'p1'); return { single: async () => ({ data: saved, error: null }) };
      } }) };
    },
  };
  const file = 'src/components/admin/erp/context/ERPWorkstationContext.tsx';
  const source = fs.readFileSync(path.resolve(file), 'utf8');
  const start = source.indexOf('const handleUpdatePropertySellingPrice = useCallback');
  const end = source.indexOf('const handleInternalTransfer = useCallback', start);
  assert.ok(start >= 0 && end > start);
  const code = ts.transpileModule(source.slice(start, end) + '\nexports.handler = handleUpdatePropertySellingPrice;', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: any = {};
  vm.runInNewContext(code, { exports, console, supabase, ERPSupabaseService, D: math.D, isAr: true,
    useCallback: (fn: any) => fn, setIsMutating() {},
    setData: (update: any) => { dataset = update(dataset); },
    toast: { success() {}, error() {}, warning() {} },
  }, { filename: file });
  assert.equal(await exports.handler('p1', 400, { unitPrices: { u1: 200, u2: 200 } }), true);
  assert.equal(reads, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(dataset.properties[0])), saved);
  assert.deepEqual(JSON.parse(JSON.stringify(dataset.recordedProperties[0])), saved);
  assert.equal(dataset.properties[0].building_units.reduce((total, unit) => total.plus(unit.price_egp), math.D(0)).toNumber(), 300);
});

it('calculator saves changed unit allocations even when the building total stays the same', async () => {
  const app = calculator({ ...property, building_units: [
    { unit_id: 'u1', unit_number: '1', area_sqm: 5, price_egp: 40, status: 'available' },
    { unit_id: 'u2', unit_number: '2', area_sqm: 5, price_egp: 60, status: 'available' },
  ] });
  try {
    const save = button(app.render(), 'حفظ السعر');
    assert.equal(save.props.disabled, false);
    save.props.onClick();
    await button(app.render(), 'تأكيد الحفظ').props.onClick();
    assert.equal(app.saves.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(app.saves[0])), ['p1', 100, { unitPrices: { u1: 50, u2: 50 }, costBasisEgp: '0.00' }]);
  } finally { app.cleanup(); }
});

it('calculator save preserves piastres for properties without units', async () => {
  const app = calculator(property);
  try {
    nodes(app.render()).find(node => node.type === 'input' && node.props['aria-label'] === 'سعر المتر').props.onChange({ target: { value: '10.25' } });
    button(app.render(), 'حفظ السعر').props.onClick();
    await button(app.render(), 'تأكيد الحفظ').props.onClick();
    assert.equal(app.saves.length, 1);
    assert.equal(app.saves[0][1], 102.5);
  } finally { app.cleanup(); }
});

it('calculator final approval rejects net zero cost even when a cost item exists', async () => {
  const app = calculator({ ...property, completion_status: 'off_plan' }, [{
    item_id: 'cost1', property_id: 'p1', total_cost_egp: '100', category: 'civil_structure',
    adjustments: [{ adjustment_type: 'REFUND_OVERPAYMENT', amount_egp: '100' }],
  }]);
  try {
    button(app.render(), 'إنهاء الإنشاء واعتماد السعر النهائي').props.onClick();
    assert.equal(button(app.render(), 'اعتماد السعر النهائي').props.disabled, true);
    await button(app.render(), 'اعتماد السعر النهائي').props.onClick();
    assert.equal(app.saves.length, 0);
  } finally { app.cleanup(); }
});

it('calculator final approval rejects a negative rate even when locked prices keep the total positive', async () => {
  const app = calculator({ ...property, completion_status: 'off_plan', building_units: [
    { unit_id: 'locked', unit_number: '1', area_sqm: 5, price_egp: 100, status: 'reserved' },
    { unit_id: 'free', unit_number: '2', area_sqm: 5, price_egp: 50, status: 'available' },
  ] }, [{ item_id: 'c1', property_id: 'p1', total_cost_egp: '10', category: 'civil_structure' }]);
  try {
    nodes(app.render()).find(node => node.type === 'input' && node.props['aria-label'] === 'سعر المتر').props.onChange({ target: { value: '-1' } });
    button(app.render(), 'إنهاء الإنشاء واعتماد السعر النهائي').props.onClick();
    assert.equal(button(app.render(), 'اعتماد السعر النهائي').props.disabled, true);
    await button(app.render(), 'اعتماد السعر النهائي').props.onClick();
    assert.equal(app.saves.length, 0);
  } finally { app.cleanup(); }
});

it('calculator break-even chip retains the decimal cost rate', () => {
  const app = calculator(property, [{ item_id: 'c1', property_id: 'p1', total_cost_egp: '104', category: 'civil_structure' }]);
  try {
    const chip = nodes(app.render()).find(node => node.type === 'button' && label(node).startsWith('التعادل'));
    assert.ok(chip);
    chip.props.onClick();
    const input = nodes(app.render()).find(node => node.type === 'input' && node.props['aria-label'] === 'سعر المتر');
    assert.equal(input.props.value, '10.40');
  } finally { app.cleanup(); }
});

it('calculator sends zero-valued available unit prices alongside locked prices', async () => {
  const app = calculator({ ...property, price_egp: 150, building_units: [
    { unit_id: 'locked', unit_number: '1', area_sqm: 5, price_egp: 100, status: 'reserved' },
    { unit_id: 'free', unit_number: '2', area_sqm: 5, price_egp: 50, status: 'available' },
  ] });
  try {
    nodes(app.render()).find(node => node.type === 'input' && node.props['aria-label'] === 'سعر المتر').props.onChange({ target: { value: '0' } });
    button(app.render(), 'حفظ السعر').props.onClick();
    await button(app.render(), 'تأكيد الحفظ').props.onClick();
    assert.equal(app.saves.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(app.saves[0][2].unitPrices)), { free: 0 });
  } finally { app.cleanup(); }
});

it('statement Excel exports selected-period opening, lines and signed closing from the real workbook', async () => {
  for (const sortBy of ['date_asc', 'date_desc'] as const) {
  const statement = calculateAccountStatement([
    { entry_id: 'prior', entry_number: 'PRIOR', entry_date: '2026-09-01', debit_amount: '10.10', credit_amount: '0' },
    { entry_id: 'earlier', entry_number: 'EARLIER', entry_date: '2026-10-01', debit_amount: '5.50', credit_amount: '0' },
    { entry_id: 'now', entry_number: 'NOW', entry_date: '2026-10-02', debit_amount: '0', credit_amount: '20.20', description: 'Period movement' },
  ], { period: '2026-10', normalBalance: 'DEBIT', sortBy });
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  let downloaded: Blob | undefined;
  Object.assign(globalThis, {
    window: { URL: { createObjectURL: (blob: Blob) => { downloaded = blob; return 'blob:test'; }, revokeObjectURL() {} } },
    document: { createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } },
  });
  try {
    await exportAccountLedgerExcel(CANONICAL_COA['101000'], [], '-10.10', [], [], false, statement);
    assert.ok(downloaded);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await downloaded.arrayBuffer()) as any);
    const sheet = wb.worksheets[0];
    assert.equal(sheet.getCell('D6').value, 'Opening Balance');
    assert.equal(sheet.getCell('G6').value, 10.1);
    assert.equal(sheet.getCell('C7').value, sortBy === 'date_asc' ? 'EARLIER' : 'NOW');
    assert.equal(sheet.getCell(sortBy === 'date_asc' ? 'F8' : 'F7').value, 20.2);
    assert.equal(sheet.getCell('G9').value, -4.6);
    assert.ok(!JSON.stringify(sheet.getSheetValues()).includes('PRIOR'));
  } finally {
    Object.assign(globalThis, { window: originalWindow, document: originalDocument });
  }
  }
});


it('RATE_TOO_LOW blocks both save handlers and renders bilingual notice', async () => {
  for (const isAr of [true, false]) {
    const app = calculator({ ...property, area_sqm: 250, price_egp: 500, completion_status: 'off_plan', building_units:
      Array.from({ length: 5 }, (_, i) => ({ unit_id: `u${i}`, unit_number: String(i), area_sqm: 50, price_egp: 100, status: 'available' })) },
      [{ item_id: 'c', property_id: 'p1', total_cost_egp: '1', category: 'civil_structure' }], [], isAr);
    try {
      nodes(app.render()).find(n => n.type === 'input' && n.props['aria-label'] === (isAr ? 'سعر المتر' : 'Price per m²')).props.onChange({ target: { value: '0.01' } });
      let tree = app.render();
      assert.ok(label(tree).includes(isAr ? 'السعر للمتر منخفض جداً لتسعير الوحدات بالجنيه الكامل' : 'Rate too low to price units in whole EGP'));
      const save = button(tree, isAr ? 'حفظ السعر المبدئي' : 'Save initial price');
      const finish = button(tree, isAr ? 'إنهاء الإنشاء واعتماد السعر النهائي' : 'Finish construction & set final price');
      assert.equal(save.props.disabled, true); assert.equal(finish.props.disabled, true);
      save.props.onClick(); finish.props.onClick(); tree = app.render();
      const confirm = button(tree, isAr ? 'تأكيد الحفظ' : 'Confirm save');
      const approve = button(tree, isAr ? 'اعتماد السعر النهائي' : 'Approve final price');
      assert.equal(confirm.props.disabled, true); assert.equal(approve.props.disabled, true);
      await confirm.props.onClick(); await approve.props.onClick(); assert.equal(app.saves.length, 0);
    } finally { app.cleanup(); }
  }
});

it('live whole-building contracts disable both save paths; rescinded and other-property contracts do not', async () => {
  for (const building_unit_id of [null, 'p1']) {
    const contracts = [{ property_id: 'p1', building_unit_id, status: 'Active' }];
    const app = calculator({ ...property, completion_status: 'off_plan' },
      [{ item_id: 'c', property_id: 'p1', total_cost_egp: '1', category: 'civil_structure' }], contracts);
    try {
      nodes(app.render()).find(n => n.type === 'input' && n.props['aria-label'] === 'سعر المتر').props.onChange({ target: { value: '10.25' } });
      const tree = app.render(); assert.ok(label(tree).includes('مباع'));
      const save = button(tree, 'حفظ السعر المبدئي'), finish = button(tree, 'إنهاء الإنشاء واعتماد السعر النهائي');
      assert.equal(save.props.disabled, true); assert.equal(finish.props.disabled, true);
      save.props.onClick(); finish.props.onClick();
      await button(app.render(), 'تأكيد الحفظ').props.onClick();
      await button(app.render(), 'اعتماد السعر النهائي').props.onClick();
      assert.equal(app.saves.length, 0);
    } finally { app.cleanup(); }
  }
  for (const contract of [{ property_id: 'p1', status: 'Rescinded' }, { property_id: 'p2', status: 'Active' }]) {
    const app = calculator(property, [], [contract]);
    try {
      nodes(app.render()).find(n => n.type === 'input' && n.props['aria-label'] === 'سعر المتر').props.onChange({ target: { value: '10.25' } });
      assert.equal(button(app.render(), 'حفظ السعر').props.disabled, false);
    } finally { app.cleanup(); }
  }
});

it('both confirmation dialogs show submitted old/new/difference piastres', async () => {
  const app = calculator({ ...property, price_egp: 100.25, completion_status: 'off_plan' },
    [{ item_id: 'c', property_id: 'p1', total_cost_egp: '1', category: 'civil_structure' }]);
  try {
    nodes(app.render()).find(n => n.type === 'input' && n.props['aria-label'] === 'سعر المتر').props.onChange({ target: { value: '10.25' } });
    button(app.render(), 'حفظ السعر المبدئي').props.onClick();
    button(app.render(), 'إنهاء الإنشاء واعتماد السعر النهائي').props.onClick();
    const facts = nodes(app.render()).filter(n => n.type === 'ZFFacts').map(n => n.props.items);
    assert.equal(facts.length, 2);
    for (const items of facts) {
      assert.ok(items.some((i: any) => i.value === '100.25 ج.م'));
      assert.ok(items.some((i: any) => i.value === '102.50 ج.م'));
      assert.ok(items.some((i: any) => i.value === '+2.25 ج.م'));
    }
    await button(app.render(), 'تأكيد الحفظ').props.onClick();
    await button(app.render(), 'اعتماد السعر النهائي').props.onClick();
    assert.deepEqual(app.saves.map(args => args[1]), [102.5, 102.5]);
    assert.ok(app.saves.every(args => args[2].unitPrices === undefined));
  } finally { app.cleanup(); }
});

it('price RPC money guard errors produce bilingual toasts and zero fallback writes', async () => {
  const messages = {
    PROPERTY_SOLD_WHOLE: ['العقار مباع بالكامل بعقد سارٍ ولا يمكن إعادة تسعيره.', 'The property is sold under a live whole-building contract and cannot be repriced.'],
    INVALID_UNIT_PRICE: ['أسعار الوحدات يجب أن تكون أرقاماً صحيحة بالجنيه وغير سالبة.', 'Unit prices must be nonnegative whole EGP numbers.'],
    UNKNOWN_UNIT: ['إحدى الوحدات غير مسجلة في هذا العقار. حدّث الصفحة قبل إعادة التسعير.', 'A unit is not recorded in this property. Reload before repricing.'],
    UNPRICED_UNIT: ['توجد وحدة بدون سعر مسجل. سجّل أسعار كل الوحدات أولاً.', 'A unit has no recorded price. Record prices for all units first.'],
  };
  const file = 'src/components/admin/erp/context/ERPWorkstationContext.tsx';
  const source = fs.readFileSync(path.resolve(file), 'utf8');
  const start = source.indexOf('const handleUpdatePropertySellingPrice = useCallback');
  const end = source.indexOf('const handleInternalTransfer = useCallback', start);
  const code = ts.transpileModule(source.slice(start, end) + '\nexports.handler = handleUpdatePropertySellingPrice;', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  for (const [error, texts] of Object.entries(messages)) for (const isAr of [true, false]) {
    let writes = 0, rpcs = 0; const toasts: any[] = []; const mutating: boolean[] = [];
    const exports: any = {};
    vm.runInNewContext(code, { exports, console: { error() {} }, D: math.D, ERPSupabaseService, isAr,
      supabase: { rpc: async () => { rpcs++; return { data: null, error: { message: `record_property_price: ${error}` } }; }, from: () => { writes++; throw Error('fallback forbidden'); } },
      useCallback: (fn: any) => fn, setIsMutating: (v: boolean) => mutating.push(v), setData: () => { writes++; },
      toast: { error: (...args: any[]) => toasts.push(args), success: () => assert.fail('false success') },
    });
    assert.equal(await exports.handler('p1', 100), false);
    assert.equal(writes, 0); assert.equal(rpcs, 1); assert.deepEqual(mutating, [true, false]);
    assert.equal(toasts.length, 1); assert.equal(toasts[0][1].description, texts[isAr ? 0 : 1]);
  }
});


it('recorded inventory reaches calculator without normalized fallback units or money', async () => {
  const raw = { ...property, type: 'building', area_sqm: 10, price_egp: 100, building_units: null };
  const client = { from: (table: string) => ({ select: () => ({ order: async () => ({ data: table === 'properties' ? [raw] : [], error: null }) }) }),
    auth: { getSession: async () => ({ data: { session: null } }) } };
  const previous = process.env.NODE_ENV;
  try {
    Object.assign(process.env, { NODE_ENV: 'development' });
    const data = await ERPSupabaseService.fetchLiveERPData(client as any);
    assert.equal(data.properties[0].building_units?.length, 6, 'wizard normalization retained');
    assert.deepEqual(data.recordedProperties, [raw]);
    const file = 'src/components/admin/erp/views/ConstructionFeasibilityRouteView.tsx';
    const code = ts.transpileModule(fs.readFileSync(path.resolve(file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const exports: any = {};
    vm.runInNewContext(code, { exports, require: (id: string) => {
      if (id === 'react') return {};
      if (id === 'react/jsx-runtime') return jsx;
      if (id === 'next/navigation') return { useSearchParams: () => new URLSearchParams() };
      if (id.endsWith('ERPWorkstationContext')) return { useERPWorkstation: () => ({ data, isAr: true }) };
      if (id.endsWith('ConstructionFeasibilityView')) return { ConstructionFeasibilityView: 'View' };
      throw Error(id);
    } });
    const rendered = exports.ConstructionFeasibilityRouteView();
    assert.deepEqual(rendered.props.properties, [raw]);
    const app = calculator(rendered.props.properties[0]);
    try {
      nodes(app.render()).find(n => n.type === 'input' && n.props['aria-label'] === 'سعر المتر').props.onChange({ target: { value: '10.25' } });
      button(app.render(), 'حفظ السعر').props.onClick();
      await button(app.render(), 'تأكيد الحفظ').props.onClick();
      assert.equal(app.saves.length, 1); assert.equal(app.saves[0][1], 102.5);
      assert.equal(app.saves[0][2].unitPrices, undefined);
      const calls: any[] = [];
      const saved = await ERPSupabaseService.recordPropertyPrice({
        rpc: async (name: string, args: any) => {
          calls.push({ name, args });
          return { data: { stage: 'revised', units_repriced: 0, price_egp: 102.5 }, error: null };
        },
        from: () => assert.fail('whole-property save must stay atomic'),
      } as any, { propertyId: app.saves[0][0], priceEgp: app.saves[0][1], ...app.saves[0][2] });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].name, 'record_property_price');
      assert.equal(calls[0].args.p_price_egp, 102.5);
      assert.equal('p_unit_prices' in calls[0].args, false);
      assert.equal(saved.price_egp, 102.5);
    } finally { app.cleanup(); }
  } finally { if (previous === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV'); else Object.assign(process.env, { NODE_ENV: previous }); }
});
