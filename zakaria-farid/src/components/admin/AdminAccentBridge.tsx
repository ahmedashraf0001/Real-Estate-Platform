'use client';

import { useEffect } from 'react';
import { useAccentPreset, accentTokens } from '@/lib/theme/accentPalette';

export function AdminAccentBridge(): null {
  const [preset] = useAccentPreset();

  useEffect(() => {
    const apply = () => {
      const el = document.querySelector<HTMLElement>('[data-admin-wrapper="true"]');
      if (!el) return;
      const mode = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const t = accentTokens(preset, mode);
      el.style.setProperty('--admin-accent', t.accent);
      el.style.setProperty('--admin-accent-hover', t.hover);
      el.style.setProperty('--admin-accent-subtle', t.subtle);
      el.style.setProperty('--admin-accent-tint', t.tint);
      el.style.setProperty('--admin-accent-border', t.border);
      el.style.setProperty('--admin-on-accent', t.onAccent);
    };

    apply();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          apply();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, [preset]);

  return null;
}

export default AdminAccentBridge;
