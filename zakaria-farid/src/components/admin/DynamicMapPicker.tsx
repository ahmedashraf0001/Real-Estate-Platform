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
        background: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1.5px solid #D8D2C4',
        color: '#475569',
        fontWeight: 600,
        fontSize: '0.9rem',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
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
