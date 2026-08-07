'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin, ArrowUpRight, Building2 } from 'lucide-react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { formatPrice } from '@/lib/utils/formatting';
import type { Property } from '@/lib/supabase/types';

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
    const timer = setTimeout(() => {
      try {
        if (map && map.getContainer()) {
          map.invalidateSize();
        }
      } catch {
        // Safe catch
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [map, center, zoom]);
  return null;
}

function makePricePin(price?: number, isFeatured?: boolean) {
  const priceText = price ? (price >= 1000000 ? `${(price / 1000000).toFixed(0)}M` : `${(price / 1000).toFixed(0)}k`) : 'EGP';
  
  const html = renderToStaticMarkup(
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: '#091712',
      color: '#FFFFFF',
      border: '1.5px solid #C9A96A',
      borderRadius: '20px',
      padding: '4px 10px',
      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
      fontSize: '11px',
      fontWeight: 800,
      fontFamily: 'Outfit, sans-serif',
      whiteSpace: 'nowrap'
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A96A' }} />
      <span>{priceText} EGP</span>
    </div>
  );

  return divIcon({
    html,
    className: '',
    iconSize: [80, 26],
    iconAnchor: [40, 13],
    popupAnchor: [0, -14],
  });
}

interface MiniMapProps {
  properties?: Property[];
  center?: [number, number];
  zoom?: number;
  locale?: string;
}

const DEFAULT_PINS = [
  { id: '1', title_en: 'Ultra-Luxury Smart Mansion', title_ar: 'قصر فاخر بالشيخ زايد', price_egp: 45000000, location: 'Beverly Hills, Sheikh Zayed', latitude: 30.044, longitude: 30.983, slug: 'villa-sheikh-zayed', type: 'villa' },
  { id: '2', title_en: 'Grand Standalone Villa', title_ar: 'فيلا مستقلة راقية', price_egp: 19000000, location: 'Beverly Hills, Sheikh Zayed', latitude: 30.052, longitude: 30.975, slug: 'grand-villa', type: 'villa' },
  { id: '3', title_en: 'Modern Luxury Penthouse', title_ar: 'بنتهاوس حديث بالشيخ زايد', price_egp: 12500000, location: 'Sheikh Zayed Center', latitude: 30.038, longitude: 30.991, slug: 'penthouse-zayed', type: 'apartment' },
  { id: '4', title_en: 'Exclusive Lake View Mansion', title_ar: 'قصر إطلالة البحيرة بالقاهرة الجديدة', price_egp: 60000000, location: 'Fifth Settlement, New Cairo', latitude: 30.03, longitude: 31.47, slug: 'lake-view-mansion', type: 'villa' },
  { id: '5', title_en: 'Mediterranean Beachfront Villa', title_ar: 'فيلا شاطئية بالساحل الشمالي', price_egp: 35000000, location: 'Ras El Hekma, North Coast', latitude: 31.02, longitude: 28.52, slug: 'coastal-villa', type: 'chalet' },
];

export default function MiniMap({ properties = [], center = [30.044, 30.983], zoom = 12, locale = 'en' }: MiniMapProps) {
  const isAr = locale === 'ar';
  const displayProperties = properties.length > 0 ? properties : DEFAULT_PINS;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
      zoomControl={false}
      scrollWheelZoom={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />

      {displayProperties.map((p: any) => {
        const lat = p.latitude || 30.044;
        const lng = p.longitude || 30.983;
        const title = isAr && p.title_ar ? p.title_ar : p.title_en;

        return (
          <Marker key={p.id} position={[lat, lng]} icon={makePricePin(p.price_egp, p.is_featured)}>
            <Popup>
              <div style={{ fontFamily: 'Outfit, sans-serif', padding: '4px', minWidth: '180px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#C9A96A', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                  {p.type || 'ESTATE'}
                </span>
                <strong style={{ fontWeight: 800, fontSize: '12px', color: '#091712', display: 'block', margin: '2px 0 4px', lineHeight: 1.3 }}>
                  {title}
                </strong>
                <p style={{ fontSize: '10px', color: '#64748B', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <MapPin size={10} color="#1E4D3D" />
                  <span>{p.location}</span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '6px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '13px', color: '#1E4D3D' }}>
                    {formatPrice(p.price_egp, locale)}
                  </span>
                  <Link
                    href={`/${locale}/properties/${p.slug}`}
                    style={{ fontSize: '10px', fontWeight: 700, color: '#1E4D3D', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                  >
                    <span>{isAr ? 'التفاصيل' : 'Details'}</span>
                    <ArrowUpRight size={11} />
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      <MapController center={center} zoom={zoom} />
    </MapContainer>
  );
}
