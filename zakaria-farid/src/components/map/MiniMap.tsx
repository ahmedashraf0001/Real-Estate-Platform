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

function makePricePin(price: number, locale: string) {
  const formattedPrice = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(price);

  const priceText = `${locale === 'ar' ? 'ج.م' : 'EGP'} ${formattedPrice}`;

  const html = renderToStaticMarkup(
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: '#1E4D3D',
        color: '#FFFFFF',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 800,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.95)',
        fontFamily: "'Outfit', 'Cairo', sans-serif",
        cursor: 'pointer',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span>{priceText}</span>
    </div>
  );

  return divIcon({
    html,
    className: '',
    iconAnchor: [45, 16],
    popupAnchor: [0, -20],
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
          <Marker key={p.id} position={[lat, lng]} icon={makePricePin(p.price_egp, locale)}>
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
