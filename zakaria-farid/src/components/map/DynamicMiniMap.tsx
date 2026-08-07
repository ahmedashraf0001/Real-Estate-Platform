'use client';

import dynamic from 'next/dynamic';

const MiniMap = dynamic(() => import('./MiniMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        width: '100%',
        background: '#f4f5f4',
        borderRadius: 'inherit',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: '13px',
      }}
    >
      Loading map...
    </div>
  ),
});

interface DynamicMiniMapProps {
  latitude?: number;
  longitude?: number;
  title?: string;
  price?: number;
  location?: string;
  locale?: string;
}

export default function DynamicMiniMap(props: DynamicMiniMapProps) {
  return <MiniMap {...props} />;
}
