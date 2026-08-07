'use client';

import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('./MapPicker'), { 
  ssr: false, 
  loading: () => <div style={{ height: '300px', width: '100%', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>Loading map...</div> 
});

interface DynamicMapPickerProps {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number, lng: number) => void;
}

export default function DynamicMapPicker(props: DynamicMapPickerProps) {
  return <MapPicker {...props} />;
}
