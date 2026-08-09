'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin, ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
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

function makePricePin() {
  const width = 30;
  const height = 38;
  const html = renderToStaticMarkup(
    <div
      style={{
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.35))',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={width} height={height} viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M18 0C8.05887 0 0 8.05887 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.05887 27.9411 0 18 0Z"
          fill="#1E4D3D"
          stroke="#C9A96A"
          strokeWidth="2.5"
        />
        <circle cx="18" cy="17" r="7" fill="#FFFFFF" />
        <circle cx="18" cy="17" r="3.5" fill="#1E4D3D" />
      </svg>
    </div>
  );

  return divIcon({
    html,
    className: '',
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height + 4],
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
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      {displayProperties.map((p: any) => {
        const lat = p.latitude || 30.044;
        const lng = p.longitude || 30.983;
        const title = isAr && p.title_ar ? p.title_ar : p.title_en;
        const cover = p.property_images?.[0];

        return (
          <Marker key={p.id} position={[lat, lng]} icon={makePricePin()}>
            <Popup maxWidth={260}>
              <div style={{ fontFamily: 'Outfit, sans-serif', padding: '2px', minWidth: '200px' }}>
                {cover && (
                  <div style={{ position: 'relative', width: '100%', height: '110px', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                    <Image src={cover.url} alt={title} fill style={{ objectFit: 'cover' }} sizes="240px" />
                  </div>
                )}
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#C9A96A', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                  {p.type || 'ESTATE'}
                </span>
                <strong style={{ fontWeight: 800, fontSize: '13px', color: '#091712', display: 'block', margin: '2px 0 4px', lineHeight: 1.3 }}>
                  {title}
                </strong>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={11} color="#1E4D3D" />
                  <span>{p.location}</span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '8px', marginTop: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#1E4D3D' }}>
                    {formatPrice(p.price_egp, locale)}
                  </span>
                  <Link
                    href={`/${locale}/properties/${p.slug}`}
                    style={{ fontSize: '11px', fontWeight: 700, color: '#1E4D3D', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                  >
                    <span>{isAr ? 'التفاصيل' : 'Details'}</span>
                    <ArrowUpRight size={13} />
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
