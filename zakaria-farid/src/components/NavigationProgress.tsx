'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function triggerNavigationStart() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masr:navigate-start'));
  }
}

export const NavigationProgress: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or searchParams change, finish the progress bar
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Global listener for link clicks & programmatic navigation
  useEffect(() => {
    const startProgress = () => {
      setIsNavigating(true);
      setProgress(18);
      
      const t1 = setTimeout(() => setProgress((p) => (p >= 18 && p < 100 ? 48 : p)), 120);
      const t2 = setTimeout(() => setProgress((p) => (p >= 48 && p < 100 ? 78 : p)), 380);
      const t3 = setTimeout(() => setProgress((p) => (p >= 78 && p < 100 ? 92 : p)), 900);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    };

    const handleAnchorClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href) return;

      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        target.target === '_blank' ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        if (
          url.origin === window.location.origin &&
          (url.pathname !== window.location.pathname || url.search !== window.location.search)
        ) {
          startProgress();
        }
      } catch {}
    };

    const handleCustomNavigate = () => {
      startProgress();
    };

    window.addEventListener('click', handleAnchorClick, true);
    window.addEventListener('masr:navigate-start', handleCustomNavigate);

    return () => {
      window.removeEventListener('click', handleAnchorClick, true);
      window.removeEventListener('masr:navigate-start', handleCustomNavigate);
    };
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div className="sovereign-nav-progress-root" aria-hidden="true">
      <div
        className="sovereign-nav-progress-bar"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100
            ? 'width 0.18s ease-out, opacity 0.25s ease-out 0.08s'
            : 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease',
        }}
      >
        <div className="progress-laser-glow" />
      </div>

      <style>{`
        .sovereign-nav-progress-root {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          z-index: 9999999;
          pointer-events: none;
          background: rgba(221, 167, 82, 0.06);
        }

        .sovereign-nav-progress-bar {
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(221, 167, 82, 0.5) 0%,
            var(--gold-primary, #DDA752) 60%,
            #FFF4D4 100%
          );
          box-shadow: 0 0 14px rgba(221, 167, 82, 0.85), 0 0 4px #FFFFFF;
          position: relative;
        }

        .progress-laser-glow {
          position: absolute;
          right: 0;
          top: -3px;
          bottom: -3px;
          width: 70px;
          background: radial-gradient(circle at right, #FFFFFF 0%, rgba(221, 167, 82, 0.9) 45%, transparent 100%);
          filter: blur(1.5px);
        }
      `}</style>
    </div>
  );
};
