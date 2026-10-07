import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { ERPSupabaseService } from '../supabaseService';
import * as helpers from '../projectStatusHelper';
import * as partners from '../partnersDirectory';
import * as calculations from '../propertiesPortfolioCalculations';
import * as contracts from '../contracts';
import * as math from '../math';
import * as treasury from '../treasuryLedger';
import { loadSaveProperty } from './buildingUnitsHarness';

function compileModule(file: string, imports: Record<string, any>, globals: Record<string, any> = {}) {
  const source = fs.readFileSync(path.resolve(file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports: any = {};
  vm.runInNewContext(code, { ...globals, exports, process: { env: {} }, console,
    require(id: string) {
      if (id in imports) return imports[id];
      throw new Error(`Unexpected test import ${id}`);
    },
  }, { filename: file });
  return exports;
}

function hookRunner() {
  const slots: any[] = [];
  let index = 0;
  let dirty = false;
  let pending: Array<() => void> = [];
  const same = (a: any[], b: any[]) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react: any = {
    useState(initial: any) {
      const i = index++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, (next: any) => {
        const value = typeof next === 'function' ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; }
      }];
    },
    useRef(value: any) { const i = index++; return slots[i] ||= { current: value }; },
    useMemo(fn: any, deps: any[]) {
      const i = index++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() };
      return slots[i].value;
    },
    useCallback(fn: any, deps: any[]) { return react.useMemo(() => fn, deps); },
    useEffect(fn: any, deps: any[]) {
      const i = index++;
      if (!slots[i] || !same(slots[i].deps, deps)) pending.push(() => {
        slots[i]?.cleanup?.();
        slots[i] = { deps, cleanup: fn() };
      });
    },
  };
  return { react,
    render(component: any, props: any) { index = 0; dirty = false; pending = []; return component(props); },
    settle(component: any, props: any) {
      let result: any;
      for (let i = 0; i < 12; i++) {
        result = this.render(component, props);
        for (const effect of pending) effect();
        if (!dirty) return result;
      }
      throw new Error('Effects did not settle');
    },
    cleanup() { for (const slot of slots) slot?.cleanup?.(); },
  };
}

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (value: any) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function leadController(runner: ReturnType<typeof hookRunner>, fetchContracts: any) {
  const source = fs.readFileSync('src/components/admin/LeadPipeline.tsx', 'utf8');
  const sf = ts.createSourceFile('LeadPipeline.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let pendingExpression = '';
  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node) && node.name.getText(sf) === 'isLoadingContracts' && node.initializer && ts.isJsxExpression(node.initializer)) {
      pendingExpression = node.initializer.expression!.getText(sf);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(pendingExpression);
  const loader = source.slice(source.indexOf('  const [convertingLead'), source.indexOf('  // The wizard needs'));
  const code = ts.transpileModule(`function controller({properties,adminLocale}:any) {
    const isAr = adminLocale === 'ar'; ${loader}
    return { open: setConvertingLead, contracts: liveContracts, contractsError, isLoadingContracts: (${pendingExpression}) };
  }`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(`${code}; controller`, { ...runner.react,
    createClient: () => ({}), ERPSupabaseService: { fetchContracts }, normalizeERPProperty: helpers.normalizeERPProperty, console,
  });
}

it('F1: first opening is blocked before effects; stale close/reopen results and SDK errors cannot enable sales', async () => {
  const first = deferred(); const second = deferred(); const recovery = deferred();
  const queue = [first, second, recovery];
  const runner = hookRunner();
  const controller = leadController(runner, () => queue.shift()!.promise);
  const props = { properties: [], adminLocale: 'ar' };
  let state = runner.settle(controller, props);
  const lead = { id: 'l1' };
  state.open(lead);
  state = runner.render(controller, props);
  assert.equal(state.isLoadingContracts, true, 'Opening render must block BEFORE loader effect');
  state = runner.settle(controller, props);
  state.open(null); state = runner.settle(controller, props);
  state.open(lead); state = runner.settle(controller, props);
  first.resolve([{ contract_id: 'stale' }]); await new Promise(resolve => setImmediate(resolve));
  state = runner.settle(controller, props);
  assert.equal(state.isLoadingContracts, true);
  assert.equal(state.contracts.length, 0);
  second.reject({ message: 'permission denied', code: '42501' }); await new Promise(resolve => setImmediate(resolve));
  state = runner.settle(controller, props);
  assert.equal(state.contractsError, 'permission denied');
  assert.equal(state.contracts.length, 0);
  state.open(null); state = runner.settle(controller, props);
  state.open(lead); state = runner.settle(controller, props);
  recovery.resolve([{ contract_id: 'fresh' }]); await new Promise(resolve => setImmediate(resolve));
  state = runner.settle(controller, props);
  assert.equal(state.isLoadingContracts, false);
  assert.equal(state.contractsError, null);
  assert.equal(state.contracts[0].contract_id, 'fresh');
  runner.cleanup();
});

function datasetClient(contractError: any = null) {
  const calls: any[] = [];
  return { calls, auth: { getSession: async () => ({ data: { session: {} } }) }, from(table: string) {
    const query: any = {
      select(columns: string) { calls.push([table, 'select', columns]); return query; },
      order(column: string, options: any) { calls.push([table, 'order', column, options]); return query; },
      then(yes: any, no: any) { return Promise.resolve({ data: table === 'erp_contracts' && !contractError ? [{
        contract_id: 'c1', property_id: 'p1', building_unit_id: 'p1-apt-1', status: 'Active', gross_contract_value: '1000001',
      }] : [], error: table === 'erp_contracts' ? contractError : null }).then(yes, no); },
    };
    return query;
  } };
}

it('F4: dataset uses the shared contracts read once and rejects SDK/auth failures', async () => {
  for (const error of [{ message: 'permission denied', code: '42501' }, { message: 'JWT expired', code: 'PGRST301' }]) {
    await assert.rejects(() => ERPSupabaseService.fetchLiveERPData(datasetClient(error) as any), (actual: any) => actual === error);
  }
  const client = datasetClient();
  const dataset = await ERPSupabaseService.fetchLiveERPData(client as any);
  assert.equal(dataset.contracts[0].property_id, 'p1');
  assert.equal(dataset.contracts[0].building_unit_id, 'p1-apt-1');
  assert.equal(dataset.contracts[0].status, 'Active');
  assert.equal(client.calls.filter(c => c[0] === 'erp_contracts' && c[1] === 'select').length, 1);
  assert.deepEqual(client.calls.find(c => c[0] === 'erp_contracts' && c[1] === 'order'), ['erp_contracts', 'order', 'created_at', { ascending: false }]);
});

it('Regression: saveProperty cannot accept a client override or bypass authentication', async () => {
  let writes = 0;
  const client = { from() { writes++; throw new Error('Unauthenticated write'); } };
  const save = loadSaveProperty(client, null);
  const result = await save({ type: 'building' }, false, undefined, [], [], client);
  assert.equal(result.error, 'Unauthorized: Please log in first.');
  assert.equal(writes, 0);
});

it('Regression: saveProperty preserves cache invalidation errors instead of test-only silent success', async () => {
  const client = { from() { return {
    select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p1', type: 'apartment', building_units: [] }, error: null }) }) }),
    update: () => ({ eq: async () => ({ error: null }) }), delete: () => ({ eq: async () => ({ error: null }) }),
  }; } };
  const result = await loadSaveProperty(client, undefined, () => { throw new Error('cache unavailable'); })({ type: 'apartment' }, true, 'p1');
  assert.equal(result.success, false);
  assert.equal(result.error, 'cache unavailable');
});

it('R3 regression: production create saves returned-id units, strips transient columns and returns unit-update errors', async () => {
  for (const error of [null, { message: 'unit initialization denied', code: '42501' }]) {
    let inserted: any; let updated: any;
    const client = { from(table: string) {
      assert.equal(table, 'properties');
      return {
        insert(payload: any) { inserted = payload; return { select: () => ({ single: async () => ({ data: { id: 'new-id', slug: 'new-building' }, error: null }) }) }; },
        update(payload: any) { updated = payload; return { eq: async (column: string, id: string) => {
          assert.equal(column, 'id'); assert.equal(id, 'new-id'); return { error };
        } }; },
      };
    } };
    const result = await loadSaveProperty(client)({ type: 'building', total_floors: 3, units_per_floor: 2, area_sqm: 600, price_egp: 1000001 }, false);
    assert.equal(inserted.total_units_count, 4);
    assert.ok(!('total_floors' in inserted) && !('units_per_floor' in inserted));
    assert.equal(updated.total_units_count, 4);
    assert.deepEqual(updated.building_units.map((u: any) => u.unit_id), ['new-id-apt-1', 'new-id-apt-2', 'new-id-apt-3', 'new-id-apt-4']);
    assert.deepEqual(updated.building_units.map((u: any) => u.price_egp), [250000, 250000, 250000, 250001]);
    assert.equal(result.success, !error);
    if (error) assert.equal(result.error, error.message);
  }
});

it('F3 regression: actual ledger formatter preserves generic units and resolves clean/legacy apartment floors', () => {
  const source = fs.readFileSync('src/components/admin/erp/AccountLedgerModal.tsx', 'utf8');
  const sf = ts.createSourceFile('AccountLedgerModal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback = '';
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sf) === 'resolvePropertyAndUnit' && node.initializer && ts.isCallExpression(node.initializer)) callback = node.initializer.arguments[0].getText(sf);
    ts.forEachChild(node, visit);
  }
  visit(sf); assert.ok(callback);
  const building = { id: 'p1', type: 'building', title_ar: 'عمارة', title_en: 'Building', building_units: [
    { unit_id: 'p1-apt-1', unit_number: '1A', floor: 1 }, { unit_id: 'p1-apt-2', unit_number: 'شقة 0A - الدور 0', floor: 0 },
  ] };
  const propertyLookup = { byId: new Map([['p1', building]]), byUnitId: new Map() };
  const code = ts.transpileModule(`(${callback})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const isAr of [true, false]) {
    const resolve = vm.runInNewContext(code, { propertyLookup, isAr, formatUnitWithFloor: helpers.formatUnitWithFloor });
    assert.equal(resolve({ property_id: 'p1', building_unit_id: 'p1-apt-1', building_unit_number: '1A' }).unitInfo, isAr ? 'شقة 1A - الدور 1' : 'Apt 1A - Floor 1');
    assert.equal(resolve({ property_id: 'p1', building_unit_id: 'p1-apt-2', building_unit_number: 'شقة 0A - الدور 0' }).unitInfo, isAr ? 'شقة 0A - الدور 0' : 'Apt 0A - Floor 0');
    assert.equal(resolve({ unit_id: 'unit-4' }).unitInfo, isAr ? 'وحدة 4' : 'unit-4');
    assert.equal(resolve({ unit_id: 'standalone-property' }).unitInfo, 'standalone-property');
  }
});

function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object' || !tree.props) return [];
  return [tree, ...nodes(tree.props.children), ...nodes(tree.props.footer)];
}

function wizardHarness() {
  const runner = hookRunner();
  let timers: Array<() => void> = [];
  const jsx = (type: any, props: any) => ({ type, props });
  const component = compileModule('src/components/admin/erp/v2/modals/NewContractWizardModal.tsx', {
    react: { __esModule: true, default: runner.react, ...runner.react },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': new Proxy({}, { get: (_t, name) => String(name) }),
    '@/lib/erp/treasuryLedger': treasury,
    '@/lib/erp/contracts': contracts,
    '@/lib/erp/partnersDirectory': partners,
    '@/lib/erp/math': math,
    '@/lib/erp/propertiesPortfolioCalculations': calculations,
    '@/lib/erp/projectStatusHelper': helpers,
    '../common/ZFCustomSelect': { ZFCustomSelect: 'ZFCustomSelect' },
    '../common/ZFModalShell': { ZFModalShell: 'ZFModalShell' },
    '../common/ZFForm': { ZFField: 'ZFField', ZFMoneyInput: 'ZFMoneyInput', ZFChoices: 'ZFChoices',
      ZFFacts: 'ZFFacts', ZFEffect: 'ZFEffect', ZFFormFooter: 'ZFFormFooter', zfForm: {} },
    '../ZFWorkstationShell.module.css': { default: {} },
    './NewContractWizardModal.module.css': { default: {} },
  }, { window: { setTimeout(fn: () => void) { timers.push(fn); return fn; },
    clearTimeout(fn: () => void) { timers = timers.filter(timer => timer !== fn); } } }).NewContractWizardModal;
  return { runner, render(props: any) {
    let tree = runner.settle(component, props);
    const batch = timers; timers = [];
    for (const timer of batch) timer();
    tree = runner.settle(component, props);
    return tree;
  } };
}

it('F1/F3: actual wizard blocks pending/error handlers, renders localized clean/legacy options and submits available units', async () => {
  const building = helpers.normalizeERPProperty({ id: 'p1', type: 'building', title_ar: 'عمارة الاختبار', title_en: 'Test building',
    building_units: helpers.buildBuildingUnits({ propertyId: 'p1', totalFloors: 2, unitsPerFloor: 2, areaSqm: 600, priceEgp: 1000001 }) } as any);
  const live = [{ property_id: 'p1', building_unit_id: 'p1-apt-1', status: 'Active' },
    { property_id: 'p1', building_unit_id: 'p1-apt-2', status: 'Rescinded' }];
  for (const isAr of [true, false]) {
    const harness = wizardHarness();
    let submitted: any[] = [];
    const props: any = { isOpen: true, initialPropertyId: 'p1', initialBuyerName: 'Buyer', properties: [building], contracts: [],
      activePeriod: {}, unifiedPartners: [{ name: partners.PRIMARY_DEVELOPER_NAME }], isAr, onClose() {}, onContractCreated: async (payload: any) => { submitted.push(payload); } };
    for (const status of [{ isLoadingContracts: true, contractsError: null }, { isLoadingContracts: false, contractsError: 'permission denied' }]) {
      let tree = harness.render({ ...props, ...status });
      let all = nodes(tree);
      const selector = all.find(n => n.type === 'ZFCustomSelect' && n.props.placeholderEn === 'Choose an available property');
      assert.equal(selector.props.disabled, true);
      selector.props.onChange('p1');
      const next = all.find(n => n.type === 'button' && n.props.children === (isAr ? 'التالي' : 'Next'));
      assert.equal(next.props.disabled, true);
      next.props.onClick();
      await all.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
      tree = harness.render({ ...props, ...status });
      assert.equal(nodes(tree).find(n => n.type === 'ZFFormFooter').props.aside, isAr ? 'الخطوة 1 من 3' : 'Step 1 of 3');
      assert.equal(submitted.length, 0);
      assert.equal(nodes(tree).find(n => n.type === 'select')?.props.value || '', '');
      if (status.contractsError) assert.ok(JSON.stringify(tree).includes('permission denied'));
    }
    let tree = harness.render({ ...props, contracts: live });
    let all = nodes(tree);
    const unitSelect = all.find(n => n.type === 'select' && n.props.value === 'p1-apt-2');
    assert.ok(unitSelect, 'Fresh live contracts select first available apt-2');
    const options = nodes(unitSelect).filter(n => n.type === 'option');
    assert.ok(!options.some(n => n.props.value === 'p1-apt-1'));
    assert.equal(options[0].props.children, isAr ? 'شقة 1B • الدور 1 • 250,000 ج.م' : 'Apt 1B • Floor 1 • 250,000 EGP');
    const legacy = { ...building, building_units: building.building_units!.map(u => ({ ...u, unit_number: `شقة ${u.unit_number} - الدور ${u.floor}` })) };
    tree = harness.render({ ...props, properties: [legacy], contracts: live });
    assert.equal(nodes(tree).find(n => n.type === 'option' && n.props.value === 'p1-apt-2').props.children, options[0].props.children);
    all = nodes(tree);
    const idField = all.find(n => n.type === 'ZFField' && n.props.label === (isAr ? 'الرقم القومي أو جواز السفر' : 'National ID or passport'));
    const idInput = nodes(idField).find(n => n.type === 'input');
    assert.ok(idInput, 'Production buyer identity field exists');
    idInput.props.onChange({ target: { value: '12345678901234' } });
    tree = harness.render({ ...props, contracts: live });
    nodes(tree).find(n => n.type === 'button' && n.props.children === (isAr ? 'التالي' : 'Next')).props.onClick();
    tree = harness.render({ ...props, contracts: live });
    nodes(tree).find(n => n.type === 'button' && n.props.children === (isAr ? 'التالي' : 'Next')).props.onClick();
    tree = harness.render({ ...props, contracts: live });
    assert.equal(nodes(tree).find(n => n.type === 'ZFFormFooter').props.aside, isAr ? 'الخطوة 3 من 3' : 'Step 3 of 3');
    await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0].buildingUnitId, 'p1-apt-2');
    harness.runner.cleanup();
  }
});
