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
    // Only enable smooth scrolling on desktop devices (width >= 1024px and non-touch)
    const isMobileOrTouch = () => {
      if (typeof window === 'undefined') return true;
      return (
        window.innerWidth < 1024 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };

    if (isMobileOrTouch()) {
      return;
    }

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
    (window as any).__masrLenis = lenis;

    let animId: number;
    function raf(time: number) {
      lenis.raf(time);
      animId = requestAnimationFrame(raf);
    }

    animId = requestAnimationFrame(raf);

    const handleResize = () => {
      if (isMobileOrTouch()) {
        if (lenisRef.current) {
          lenisRef.current.destroy();
          lenisRef.current = null;
          (window as any).__masrLenis = null;
          cancelAnimationFrame(animId);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      lenis.destroy();
      (window as any).__masrLenis = null;
    };
  }, []);

  return <>{children}</>;
};

export default LenisProvider;
