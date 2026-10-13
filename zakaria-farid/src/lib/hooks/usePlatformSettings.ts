'use client';

import { createContext, createElement, useContext, type ReactNode } from 'react';
import { type PlatformDisplaySettings, DEFAULT_PLATFORM_SETTINGS } from '@/lib/services/marketIntelligence';

const PlatformSettingsContext = createContext<PlatformDisplaySettings>(DEFAULT_PLATFORM_SETTINGS);

export function PlatformSettingsProvider({ settings, children }: { settings: PlatformDisplaySettings; children?: ReactNode }) {
  return createElement(PlatformSettingsContext.Provider, { value: settings }, children);
}

export function usePlatformSettings(): PlatformDisplaySettings {
  return useContext(PlatformSettingsContext);
}
