'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import Image from 'next/image';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import type { Property } from '@/lib/supabase/types';
import { formatPrice } from '@/lib/utils/formatting';
import { matchesSmartQuery } from '@/lib/utils/searchUtils';
import {
  Search, X, Bed, Bath, Maximize2, MapPin, SlidersHorizontal,
  ChevronRight, Building2, Home, RotateCcw
} from 'lucide-react';
import styles from './MapExplorer.module.css';

// ─── Custom Marker Icon (Branded Gold/Emerald Location Pin Badge) ────────────
function makeMarkerIcon(price: number, locale: string, active: boolean, compact: boolean) {
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
        background: active ? '#C9A96A' : '#1E4D3D',
        color: active ? '#102A21' : '#FFFFFF',
        padding: active ? '7px 14px' : '6px 12px',
        borderRadius: '20px',
        fontSize: active ? '13px' : '12px',
        fontWeight: 800,
        whiteSpace: 'nowrap',
        boxShadow: active
          ? '0 8px 24px rgba(201,169,106,0.65), 0 0 0 3px #FFFFFF'
          : '0 4px 16px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.95)',
        border: 'none',
        transform: active ? 'scale(1.18)' : 'scale(1)',
        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
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
    iconAnchor: [48, 16],
    popupAnchor: [0, -22],
  });
}

// ─── Map auto-fly-to ──────────────────────────────────────────────────────────
function FlyTo({ lat, lng, onComplete }: { lat: number; lng: number; onComplete: () => void }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1.2 });
    const timer = setTimeout(() => {
      onComplete();
    }, 1300);
    return () => clearTimeout(timer);
  }, [lat, lng, map, onComplete]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (map && map.getContainer()) {
          map.invalidateSize();
        }
      } catch {
        // Safe catch
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapController({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterType = 'all' | 'villa' | 'apartment' | 'townhouse' | 'duplex' | 'chalet';

interface MapExplorerProps {
  properties: Property[];
  locale: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapExplorer({ properties, locale }: MapExplorerProps) {
  const isAr = locale === 'ar';
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(11);
  const listRef = useRef<HTMLDivElement>(null);

  const initialCenter: [number, number] = [30.044, 31.235];

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filtered = properties.filter((p) => {
    const matchSearch = matchesSmartQuery(p, search);
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const typeOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: isAr ? 'الكل' : 'All' },
    { value: 'villa', label: isAr ? 'فيلا' : 'Villa' },
    { value: 'apartment', label: isAr ? 'شقة' : 'Apartment' },
    { value: 'townhouse', label: isAr ? 'تاون هاوس' : 'Townhouse' },
    { value: 'duplex', label: isAr ? 'دوبلكس' : 'Duplex' },
    { value: 'chalet', label: isAr ? 'شاليه' : 'Chalet' },
  ];

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCardClick = useCallback((p: Property) => {
    setActiveId(p.id);
    if (p.latitude && p.longitude) {
      setFlyTarget({ lat: p.latitude, lng: p.longitude });
    }
  }, []);

  const handleMarkerClick = useCallback((p: Property) => {
    setActiveId(p.id);
    // scroll list to the card
    const el = document.getElementById(`map-card-${p.id}`);
    if (el && listRef.current) {
      listRef.current.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
    }
  }, []);

  const handleResetView = useCallback(() => {
    setActiveId(null);
    setFlyTarget({ lat: initialCenter[0], lng: initialCenter[1] });
  }, [initialCenter]);

  const center: [number, number] =
    filtered.length > 0 && filtered[0].latitude && filtered[0].longitude
      ? [filtered[0].latitude, filtered[0].longitude]
      : [30.044, 31.235];

  return (
    <div className={styles.explorer} dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        {/* Sidebar Header */}
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitle}>
            <MapPin size={16} strokeWidth={2} />
            <span>{isAr ? 'استكشاف الخريطة' : 'Map Explorer'}</span>
          </div>
          <span className={styles.resultCount}>
            {filtered.length} {isAr ? 'عقار' : 'listings'}
          </span>
        </div>

        {/* Search */}
        <div className={styles.searchBox}>
          <Search size={15} strokeWidth={2} className={styles.searchIcon} />
          <input
            type="text"
            placeholder={isAr ? 'ابحث بالموقع، الكمبوند أو نوع العقار...' : 'Search by location, compound, or type...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button className={styles.clearSearch} onClick={() => setSearch('')}>
              <X size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div className={styles.filterPills}>
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.pill} ${typeFilter === opt.value ? styles.pillActive : ''}`}
              onClick={() => setTypeFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Property list */}
        <div className={styles.list} ref={listRef}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <Home size={32} strokeWidth={1.2} />
              <p>{isAr ? 'لا توجد عقارات تطابق البحث' : 'No properties match your search'}</p>
            </div>
          ) : (
            filtered.map((p) => {
              const title = isAr ? p.title_ar : p.title_en;
              const cover = p.property_images?.[0];
              const isActive = activeId === p.id;

              return (
                <div
                  id={`map-card-${p.id}`}
                  key={p.id}
                  className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                  onClick={() => handleCardClick(p)}
                >
                  <div className={styles.cardImg}>
                    {cover ? (
                      <Image src={cover.url} alt={title} fill className={styles.cardImgEl} sizes="100px" />
                    ) : (
                      <div className={styles.cardImgPlaceholder}>
                        <Building2 size={20} strokeWidth={1.2} />
                      </div>
                    )}
                    <span className={`badge badge-${p.listing_status === 'active' ? 'active' : p.listing_status === 'under_offer' ? 'offer' : 'sold'} ${styles.cardBadge}`}>
                      {p.listing_status === 'active' ? (isAr ? 'متاح' : 'Available') :
                        p.listing_status === 'under_offer' ? (isAr ? 'تحت العرض' : 'Under Offer') :
                          (isAr ? 'مُباع' : 'Sold')}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <p className={styles.cardLoc}>
                      <MapPin size={11} strokeWidth={2} />
                      {p.location}
                    </p>
                    <h3 className={styles.cardTitle}>{title}</h3>
                    <p className={styles.cardPrice}>{formatPrice(p.price_egp, locale)}</p>
                    <div className={styles.cardStats}>
                      <span><Bed size={12} strokeWidth={1.8} /> {p.bedrooms}</span>
                      <span><Bath size={12} strokeWidth={1.8} /> {p.bathrooms}</span>
                      <span><Maximize2 size={12} strokeWidth={1.8} /> {p.area_sqm}m²</span>
                    </div>
                  </div>
                  <Link
                    href={`/${locale}/properties/${p.slug}`}
                    className={styles.cardArrow}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Sidebar toggle on mobile ─────────────────────────────────── */}
      <button
        className={styles.sidebarToggle}
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle sidebar"
      >
        <SlidersHorizontal size={18} strokeWidth={2} />
        {!sidebarOpen && (
          <span>{filtered.length} {isAr ? 'عقار' : 'listings'}</span>
        )}
      </button>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div className={styles.mapArea}>
        <button
          className={styles.resetViewBtn}
          onClick={handleResetView}
          title={isAr ? 'إعادة ضبط الخريطة' : 'Reset Map View'}
        >
          <RotateCcw size={16} strokeWidth={2} />
          <span>{isAr ? 'الافتراضي' : 'Reset View'}</span>
        </button>

        <MapContainer
          center={center}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          <ZoomControl position={isAr ? 'bottomleft' : 'bottomright'} />
          <MapController onZoomChange={(z) => setZoomLevel(z)} />

          {flyTarget && (
            <FlyTo
              lat={flyTarget.lat}
              lng={flyTarget.lng}
              onComplete={() => setFlyTarget(null)}
            />
          )}
          <MapResizer />

          {filtered.map((p) => {
            if (!p.latitude || !p.longitude) return null;
            const isActive = activeId === p.id;
            const isCompact = zoomLevel >= 14;
            const title = isAr ? p.title_ar : p.title_en;
            const cover = p.property_images?.[0];

            return (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                icon={makeMarkerIcon(p.price_egp, locale, isActive, isCompact)}
                eventHandlers={{ click: () => handleMarkerClick(p) }}
                zIndexOffset={isActive ? 1000 : 0}
              >
                <Popup className={styles.popup} maxWidth={280}>
                  <div className={styles.popupCard}>
                    {cover && (
                      <div className={styles.popupImgWrap}>
                        <Image src={cover.url} alt={title} fill className={styles.popupImg} sizes="280px" />
                      </div>
                    )}
                    <div className={styles.popupBody}>
                      <p className={styles.popupLoc}>
                        <MapPin size={11} strokeWidth={2} />
                        {p.location}
                      </p>
                      <p className={styles.popupTitle}>{title}</p>
                      <p className={styles.popupPrice}>{formatPrice(p.price_egp, locale)}</p>
                      <div className={styles.popupStats}>
                        <span><Bed size={12} strokeWidth={1.8} /> {p.bedrooms}</span>
                        <span><Bath size={12} strokeWidth={1.8} /> {p.bathrooms}</span>
                        <span><Maximize2 size={12} strokeWidth={1.8} /> {p.area_sqm}m²</span>
                      </div>
                      <Link href={`/${locale}/properties/${p.slug}`} className={styles.popupBtn}>
                        {isAr ? 'عرض العقار' : 'View Property'}
                        <ChevronRight size={14} strokeWidth={2.5} />
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
