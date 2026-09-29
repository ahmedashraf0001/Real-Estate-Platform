import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  ERP_PALETTE_PRESETS, 
  DEFAULT_PALETTE_PRESET, 
  getPresetById, 
  FIN_OS_PALETTE_STORAGE_KEY 
} from '../erpPalettePresets';

// WCAG relative luminance and contrast formula
function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('FIN-OS Curated Palette Customization System', () => {
  it('defines between 6 and 8 curated enterprise presets', () => {
    assert.ok(ERP_PALETTE_PRESETS.length >= 6 && ERP_PALETTE_PRESETS.length <= 8, 
      `Expected between 6 and 8 presets, found ${ERP_PALETTE_PRESETS.length}`);
  });

  it('ensures every preset accent has at least WCAG AA contrast (>= 4.5:1) against white #ffffff', () => {
    for (const preset of ERP_PALETTE_PRESETS) {
      const ratio = getContrastRatio(preset.accent, '#ffffff');
      assert.ok(
        ratio >= 4.5,
        `Preset ${preset.id} (${preset.accent}) has contrast ratio ${ratio.toFixed(2)}:1, which is below WCAG AA 4.5:1`
      );
    }
  });

  it('precomputes valid non-empty tokens for accent, hover, subtle, tint, and chartPrimary', () => {
    for (const preset of ERP_PALETTE_PRESETS) {
      assert.ok(preset.id && typeof preset.id === 'string');
      assert.ok(preset.nameEn && typeof preset.nameEn === 'string');
      assert.ok(preset.nameAr && typeof preset.nameAr === 'string');
      assert.match(preset.accent, /^#[0-9a-fA-F]{6}$/, `Invalid accent hex in ${preset.id}`);
      assert.match(preset.hover, /^#[0-9a-fA-F]{6}$/, `Invalid hover hex in ${preset.id}`);
      assert.ok(preset.subtle.startsWith('#') || preset.subtle.startsWith('rgb'), `Invalid subtle in ${preset.id}`);
      assert.ok(preset.tint.startsWith('rgba'), `Invalid tint rgba in ${preset.id}`);
      assert.match(preset.chartPrimary, /^#[0-9a-fA-F]{6}$/, `Invalid chartPrimary in ${preset.id}`);
    }
  });

  it('guarantees fixed semantic status colors do not collide with preset accents', () => {
    const FIXED_STATUS_COLORS = {
      success: '#16a34a',
      danger: '#dc2626',
      warning: '#d97706',
      info: '#0284c7',
    };

    for (const preset of ERP_PALETTE_PRESETS) {
      for (const [name, color] of Object.entries(FIXED_STATUS_COLORS)) {
        assert.notEqual(
          preset.accent.toLowerCase(), 
          color.toLowerCase(), 
          `Preset ${preset.id} accent cannot collide with fixed ${name} status color ${color}`
        );
      }
    }
  });

  it('getPresetById resolves presets correctly and falls back to default on invalid ID', () => {
    const royal = getPresetById('royal_blue');
    assert.equal(royal.id, 'royal_blue');
    assert.equal(royal.accent, '#2563eb');

    const navy = getPresetById('midnight_navy');
    assert.equal(navy.id, 'midnight_navy');

    const fallback = getPresetById('non_existent_fake_color');
    assert.equal(fallback.id, DEFAULT_PALETTE_PRESET.id);
  });

  it('uses standard storage key for localStorage persistence', () => {
    assert.equal(FIN_OS_PALETTE_STORAGE_KEY, 'fin_os_accent_preset_v1');
  });
});
