'use client';

import dynamic from 'next/dynamic';
import type { Property } from '@/lib/supabase/types';

const MapExplorer = dynamic(() => import('./FullMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        width: '100%',
        background: 'linear-gradient(135deg, #0c1c16 0%, #1a2e24 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '14px',
        fontFamily: 'Outfit, sans-serif',
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    >
      Loading map...
    </div>
  ),
});

interface DynamicFullMapProps {
  properties: Property[];
  locale: string;
}

export default function DynamicFullMap({ properties, locale }: DynamicFullMapProps) {
  return <MapExplorer properties={properties} locale={locale} />;
}
