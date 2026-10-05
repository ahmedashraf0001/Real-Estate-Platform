import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { accentTokens, readStoredPresetId } from '../accentPalette';
import { getPresetById } from '../../erp/erpPalettePresets';

describe('accentPalette', () => {
  it('accentTokens(royal_blue, light).accent === #2563eb; accentTokens(royal_blue, dark).accent === #3b82f6', () => {
    const royal = getPresetById('royal_blue');
    assert.equal(accentTokens(royal, 'light').accent, '#2563eb');
    assert.equal(accentTokens(royal, 'dark').accent, '#3b82f6');
  });

  it('accentTokens(obsidian_charcoal, dark).onAccent === #18181b', () => {
    const obsidian = getPresetById('obsidian_charcoal');
    assert.equal(accentTokens(obsidian, 'dark').onAccent, '#18181b');
  });

  it('readStoredPresetId() returns null when window is undefined (node test env)', () => {
    assert.equal(readStoredPresetId(), null);
  });
});
