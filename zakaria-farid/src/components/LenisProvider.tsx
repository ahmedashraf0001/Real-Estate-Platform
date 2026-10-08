'use client';

import React, { useEffect, useRef } from 'react';
import Lenis from 'lenis';

interface LenisProviderProps {
  children: React.ReactNode;
  locale?: string;
}

export const LenisProvider: React.FC<LenisProviderProps> = ({ children }) => {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktopPointer = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
    // Only enable smooth scrolling on desktop devices (width >= 1024px and non-touch)
    const isMobileOrTouch = () => {
      if (typeof window === 'undefined') return true;
      return (
        reducedMotion.matches ||
        !desktopPointer.matches ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };

    let animId: number | null = null;
    const destroy = () => {
      if (animId !== null) cancelAnimationFrame(animId);
      animId = null;
      lenisRef.current?.destroy();
      lenisRef.current = null;
      window.__masrLenis = null;
    };
    const sync = () => {
      if (isMobileOrTouch()) {
        destroy();
        return;
      }
      if (lenisRef.current) return;
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 0,
      });

      lenisRef.current = lenis;
      window.__masrLenis = lenis;

      function raf(time: number) {
        lenis.raf(time);
        animId = requestAnimationFrame(raf);
      }

      animId = requestAnimationFrame(raf);
    };
    sync();
    reducedMotion.addEventListener('change', sync);
    desktopPointer.addEventListener('change', sync);

    return () => {
      reducedMotion.removeEventListener('change', sync);
      desktopPointer.removeEventListener('change', sync);
      destroy();
    };
  }, []);

  return <>{children}</>;
};

export default LenisProvider;
