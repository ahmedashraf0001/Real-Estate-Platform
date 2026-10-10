'use client';

import { useEffect } from 'react';
import { useAccentPreset, accentTokens } from '@/lib/theme/accentPalette';

export function AdminAccentBridge(): null {
  const [preset] = useAccentPreset();

  useEffect(() => {
    const apply = () => {
      const el = document.querySelector<HTMLElement>('[data-admin-wrapper="true"]');
      if (!el) return;
      const t = accentTokens(preset, 'light');
      el.style.setProperty('--admin-accent', t.accent);
      el.style.setProperty('--admin-accent-hover', t.hover);
      el.style.setProperty('--admin-accent-subtle', t.subtle);
      el.style.setProperty('--admin-accent-tint', t.tint);
      el.style.setProperty('--admin-accent-border', t.border);
      el.style.setProperty('--admin-on-accent', t.onAccent);
    };

    apply();

  }, [preset]);

  return null;
}

export default AdminAccentBridge;
