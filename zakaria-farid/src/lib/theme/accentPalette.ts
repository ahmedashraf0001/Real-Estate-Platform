import { useState, useEffect, useCallback } from 'react';
import { 
  ERPPalettePreset, 
  DEFAULT_PALETTE_PRESET, 
  getPresetById, 
  FIN_OS_PALETTE_STORAGE_KEY 
} from '@/lib/erp/erpPalettePresets';

export const ACCENT_CHANGE_EVENT = 'zf:accent-change';
export type AccentMode = 'light' | 'dark';
export interface AccentTokens { 
  accent: string; 
  hover: string; 
  subtle: string; 
  tint: string; 
  border: string; 
  onAccent: string; 
}

export function accentTokens(preset: ERPPalettePreset, mode: AccentMode): AccentTokens {
  if (mode === 'dark') {
    return preset.dark;
  }
  return {
    accent: preset.accent,
    hover: preset.hover,
    subtle: preset.subtle,
    tint: preset.tint,
    border: preset.border,
    onAccent: preset.onAccent,
  };
}

export function readStoredPresetId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(FIN_OS_PALETTE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storePresetId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FIN_OS_PALETTE_STORAGE_KEY, id);
  } catch {
    // swallow storage errors
  }
  try {
    window.dispatchEvent(new CustomEvent(ACCENT_CHANGE_EVENT, { detail: id }));
  } catch {
    // swallow event errors
  }
}

export function useAccentPreset(): [ERPPalettePreset, (id: string) => void] {
  const [preset, setPreset] = useState<ERPPalettePreset>(DEFAULT_PALETTE_PRESET);

  useEffect(() => {
    const id = readStoredPresetId();
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreset(getPresetById(id));
    }

    const handleAccentChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setPreset(getPresetById(customEvent.detail));
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === FIN_OS_PALETTE_STORAGE_KEY && e.newValue) {
        setPreset(getPresetById(e.newValue));
      }
    };

    window.addEventListener(ACCENT_CHANGE_EVENT, handleAccentChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(ACCENT_CHANGE_EVENT, handleAccentChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const select = useCallback((id: string) => {
    const p = getPresetById(id);
    setPreset(p);
    storePresetId(p.id);
  }, []);

  return [preset, select];
}
