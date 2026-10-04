'use client';

import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false, 
  loading: () => (
    <div
      style={{
        height: '300px',
        width: '100%',
        borderRadius: '16px',
        background: 'var(--admin-card-bg-subtle, #f8fafc)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--admin-card-border, #cbd5e1)',
        color: 'var(--admin-text-muted, #64748b)',
        fontWeight: 600,
        fontSize: '0.9rem',
        boxShadow: 'none',
      }}
    >
      Loading map...
    </div>
  ),
});

interface DynamicMapPickerProps {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number, lng: number) => void;
  isAr?: boolean;
}

export default function DynamicMapPicker(props: DynamicMapPickerProps) {
  return <MapPicker {...props} />;
}
