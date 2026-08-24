'use client';

import { useState, useEffect } from 'react';
import { 
  PlatformDisplaySettings, 
  DEFAULT_PLATFORM_SETTINGS, 
  getStoredPlatformSettings 
} from '@/lib/services/marketIntelligence';

export function usePlatformSettings(): PlatformDisplaySettings {
  const [settings, setSettings] = useState<PlatformDisplaySettings>(DEFAULT_PLATFORM_SETTINGS);

  useEffect(() => {
    setSettings(getStoredPlatformSettings());

    const handleUpdate = () => {
      setSettings(getStoredPlatformSettings());
    };

    window.addEventListener('zf_platform_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('zf_platform_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return settings;
}
