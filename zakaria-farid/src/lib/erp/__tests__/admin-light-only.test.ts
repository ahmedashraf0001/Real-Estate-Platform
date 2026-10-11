import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
const root = join(process.cwd(), 'src');
function sources(dir: string): string[] { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? sources(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : []); }
test('admin renders light before hydration without accessing public theme preference', () => {
 const layout = readFileSync(join(root, 'app/admin/layout.tsx'), 'utf8');
 assert.match(layout, /<html[^>]*data-theme="light"/);
 assert.match(layout, /setAttribute\('data-theme', 'light'\)/);
 assert.doesNotMatch(layout, /zf_theme|localStorage|document\.cookie/);
 const attributes = new Map([['data-theme', 'dark']]);
 const document = { documentElement: { setAttribute: (name: string, value: string) => attributes.set(name, value) } };
 const script = layout.match(/__html: `([^`]+)`/)?.[1];
 assert.ok(script);
 runInNewContext(script, { document });
 assert.equal(attributes.get('data-theme'), 'light');
});
test('admin readers and controls do not access or toggle public theme', () => {
 for (const file of sources(join(root, 'components/admin'))) {
  assert.doesNotMatch(readFileSync(file, 'utf8'), /zf_theme|toggleTheme|setTheme\(|getAttribute\(['"]data-theme['"]\)/, file);
 }
});
test('admin accent menu retains preset selection and light tokens', () => {
 const menu = readFileSync(join(root, 'components/admin/AdminPaletteMenu.tsx'), 'utf8');
 assert.match(menu, /useAccentPreset/); assert.match(menu, /select\(/); assert.match(menu, /accentTokens\([^,]+, 'light'\)/);
 const bridge = readFileSync(join(root, 'components/admin/AdminAccentBridge.tsx'), 'utf8');
 assert.match(bridge, /accentTokens\(preset, 'light'\)/);
});
