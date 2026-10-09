import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const css = readFileSync('src/app/globals.css', 'utf8');
test('public glass option B tokens and fallback match the approved tiers', () => {
  const dark = css.match(/:root\s*\{([\s\S]*?)\n\}/)![1];
  for (const declaration of [
    '--bg-glass: rgba(12, 15, 22, 0.36)',
    '--bg-glass-card: linear-gradient(180deg, rgba(12, 15, 22, 0.30), rgba(12, 15, 22, 0.42))',
    '--glass-border: 1px solid rgba(255, 255, 255, 0.16)',
    '--glass-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.28)',
    '--glass-shadow: 0 20px 50px rgba(0, 0, 0, 0.35)',
    '--glass-blur: blur(16px) saturate(140%)',
    '--glass-blur-nav: blur(14px) saturate(140%)',
    '--glass-strong: linear-gradient(180deg, rgba(12, 15, 22, 0.58), rgba(12, 15, 22, 0.70))',
  ]) assert.ok(dark.includes(declaration), declaration);
  assert.doesNotMatch(dark.match(/--glass-blur:[^;]+/)![0], /contrast|brightness/);
  assert.match(css, /@supports not \(backdrop-filter: blur\(1px\)\)/);
  assert.match(css, /--glass-fallback: rgba\(12, 15, 22, 0\.86\)/);
});

test('public photo glass uses tokens and descendants inherit the outer blur suppression', () => {
  for (const file of ['Navbar.tsx', 'QuickSearchBar.tsx', 'property/PropertyCard.tsx', 'property/PropertyDetailView.tsx', 'map/MapView.tsx', 'InquiryModal.tsx']) {
    const source = readFileSync(`src/components/${file}`, 'utf8');
    const dormant = /[^{}]*\.(?:spec-matrix-card|calculator-glass-card|viewing-form-card)\s*\{[^{}]*\}/g;
    assert.doesNotMatch(source.replace(dormant, ''), /backdrop-filter:\s*blur\(/, file);
    assert.match(source, /background: var\(--glass-(?:card-)?strong\)/, file);
  }
  assert.match(css, /\.app-root :is\([\s\S]*?\) > \* \{\s*--glass-blur: none;\s*--glass-blur-nav: none;/);
});
