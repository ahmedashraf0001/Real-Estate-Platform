import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import * as legacyMarkdown from '../../markdown/legacyHtmlToMarkdown';
import * as markdown from '../../markdown/miniMarkdown';
import * as steps from '../../propertyWizardSteps';
import * as geocode from '../../geocodeCandidates';
import * as partners from '../partnersDirectory';
import * as layering from '../../layering';
import * as blueprint from '../../layering/buildingBlueprint';
import * as metrics from '../../layering/zoneMetrics';
import * as media from '../../media';
import { parseVideoUrl } from '../../../components/video/LuxuryAmbientVideoPlayer';

const requireActual = createRequire(import.meta.url);
export function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree?.props ? [tree, ...nodes(tree.props.children)] : [];
}
export function textOf(tree: any): string {
  if (Array.isArray(tree)) return tree.map(textOf).join('');
  return tree?.props ? textOf(tree.props.children) : typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
}

// Run complete production components with hook state and explicit dependency adapters.
// Effects clean up on changed dependencies and unmount. No real network or DB writes.
export function adminHarness(file: 'AdminPropertyForm' | 'MapPicker' | 'media/MediaManager', search = '?step=2', fetchImpl: any = () => { throw new Error('Unexpected network'); }, adapters: Record<string, any> = {}) {
  const slots: any[] = [];
  let index = 0, dirty = false;
  let pending: Array<() => void> = [];
  const same = (a: any[], b: any[]) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react: any = {
    Fragment: 'Fragment',
    useState(initial: any) {
      const i = index++;
      slots[i] ||= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, (next: any) => { const value = typeof next === 'function' ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; } }];
    },
    useRef(value: any) { const i = index++; return slots[i] ||= { current: value }; },
    useMemo(fn: any, deps: any[]) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback(fn: any, deps: any[]) { return react.useMemo(() => fn, deps); },
    useEffect(fn: any, deps: any[]) { const i = index++; if (!slots[i] || !same(slots[i].deps, deps)) pending.push(() => {
      slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const location = { search, href: 'http://localhost/admin/test' + search };
  let form: any;
  const validationCalls: string[][] = [];
  const imports: Record<string, any> = {
    react: { __esModule: true, default: react, ...react },
    'react/jsx-runtime': { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) },
    'react-hook-form': { useForm(options: any) {
      form ||= { values: { ...options.defaultValues }, errors: {} };
      return { register: (name: string) => ({ name, defaultValue: form.values[name], onChange: (e: any) => { form.values[name] = e.target.value; } }),
        watch: (name: string) => form.values[name], setValue: (name: string, value: any) => { form.values[name] = value; },
        trigger: async (fields: string[]) => {
          validationCalls.push(fields);
          const result = await options.resolver(form.values, {}, { fields: {}, shouldUseNativeValidation: false });
          form.errors = Object.fromEntries(Object.entries(result.errors).filter(([key]) => fields.includes(key)));
          return !Object.keys(form.errors).length;
        }, setError: (key: string, error: any) => { form.errors[key] = error; }, clearErrors: (key: string) => { delete form.errors[key]; },
        formState: { errors: form.errors }, handleSubmit: () => () => { throw new Error('Save must never be invoked'); },
      };
    } },
    '@hookform/resolvers/zod': requireActual('@hookform/resolvers/zod'), zod: requireActual('zod'),
    'lucide-react': new Proxy({}, { get: (_t, name) => String(name) }),
    sonner: { toast: { success() {}, info() {} } }, 'next/navigation': { useRouter: () => ({}) },
    '@tiptap/react': { useEditor: (opts: any) => react.useMemo(() => ({ getText: () => opts.content.replace(/<[^>]*>/g, ''), getHTML: () => opts.content }), []), EditorContent: 'EditorContent' },
    '@tiptap/starter-kit': {}, '@tiptap/extension-placeholder': { default: { configure: () => ({}) } },
    'react-dropzone': { useDropzone: () => ({ getRootProps: () => ({}), getInputProps: () => ({}), isDragActive: false }) },
    'browser-image-compression': {}, '@/lib/supabase/client': { createClient: () => { throw new Error('DB forbidden'); } },
    '@/app/actions/properties': { saveProperty: () => { throw new Error('DB write forbidden'); } },
    '@/lib/propertyWizardSteps': steps, '@/lib/geocodeCandidates': geocode,
    '@/lib/erp/partnersDirectory': partners, '@/lib/layering': layering,
    '@/lib/layering/buildingBlueprint': blueprint, '@/lib/layering/zoneMetrics': metrics,
    '@/lib/media': media,
    './media/MediaManager': { default: 'MediaManager' },
    '@/components/admin/erp/v2/common/ZFModalShell': { ZFModalShell: 'Modal' },
    './MediaManager.module.css': { default: new Proxy({}, { get: (_t, key) => String(key) }) },
    './MarkdownDescriptionEditor': { default: 'MarkdownDescriptionEditor' }, '@/lib/markdown/miniMarkdown': markdown, '@/lib/markdown/legacyHtmlToMarkdown': legacyMarkdown,
    './CADBlueprintBuilder': { default: 'CADBlueprintBuilder' }, './ZoneInspector': { default: 'ZoneInspector' },
    './DynamicMapPicker': { default: 'DynamicMapPicker' }, '@/components/video/LuxuryAmbientVideoPlayer': { default: 'VideoPlayer', parseVideoUrl },
    './AdminPropertyForm.module.css': { default: new Proxy({}, { get: (_t, key) => String(key) }) },
    'react-leaflet': { MapContainer: 'MapContainer', TileLayer: 'TileLayer', Marker: 'Marker' },
    leaflet: { divIcon: () => ({}) }, 'leaflet/dist/leaflet.css': {},
  };
  const source = fs.readFileSync(`src/components/admin/${file}.tsx`, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: any = {};
  vm.runInNewContext(code, { exports, console, URL, URLSearchParams, fetch: fetchImpl,
    crypto: globalThis.crypto,
    window: { location, confirm: () => true, history: { replaceState: (_a: any, _b: any, url: string) => { location.href = url; location.search = new URL(url).search; } } },
    document: { body: { setAttribute() {}, removeAttribute() {} }, addEventListener() {}, removeEventListener() {} },
    require(id: string) { if (id in adapters) return adapters[id]; if (id in imports) return imports[id]; throw new Error(`Unexpected import ${id}`); },
  }, { filename: file });
  return { location, validationCalls, get form() { return form; },
    render(props: any) {
      for (let attempt = 0; attempt < 12; attempt++) {
        index = 0; dirty = false; pending = [];
        const tree = exports.default(props);
        for (const effect of pending) effect();
        if (!dirty) return tree;
      }
      throw new Error('Effects failed to settle');
    }, cleanup() { for (const slot of slots) slot?.cleanup?.(); },
  };
}
