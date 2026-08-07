'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopLoaderBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href && !target.href.startsWith('tel:') && !target.href.startsWith('mailto:') && target.target !== '_blank') {
        try {
          const url = new URL(target.href, window.location.href);
          if (url.origin === window.location.origin && (url.pathname !== window.location.pathname || url.search !== window.location.search)) {
            setLoading(true);
          }
        } catch {
          // ignore invalid URLs
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, true);
    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
    };
  }, [pathname]);

  if (!loading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 99999,
        background: 'linear-gradient(90deg, #1E4D3D 0%, #C9A96A 50%, #1E4D3D 100%)',
        boxShadow: '0 0 10px #C9A96A, 0 0 5px #1E4D3D',
        animation: 'topLoaderAnim 1.2s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes topLoaderAnim {
          0% { opacity: 0.4; transform: scaleX(0.1); transform-origin: left; }
          50% { opacity: 1; transform: scaleX(0.7); transform-origin: left; }
          100% { opacity: 0.8; transform: scaleX(1); transform-origin: right; }
        }
      `}</style>
    </div>
  );
}
