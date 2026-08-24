'use client';
import React, { useEffect, useRef, useState } from 'react';
let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { Property } from '@/types';
import { createCachedTileLayer } from '@/lib/mapCache';
import { Sparkles, ArrowRight, Compass, MapPin } from 'lucide-react';

interface MapSectionProps {
  onOpenMapModal: () => void;
  properties?: Property[];
  locale?: string;
}

const FLY_DESTINATIONS = [
  { id: 'all', label: 'All Corridors', labelAr: 'جميع المناطق', center: [29.2, 31.0] as [number, number], zoom: 7 },
  { id: 'new-cairo', label: 'New Cairo', labelAr: 'القاهرة الجديدة', center: [30.0131, 31.4913] as [number, number], zoom: 12 },
  { id: 'sahel', label: 'North Coast (Sahel)', labelAr: 'الساحل الشمالي', center: [30.9856, 28.7690] as [number, number], zoom: 12 },
  { id: 'gouna', label: 'El Gouna Sanctuary', labelAr: 'الجونة والبحر الأحمر', center: [27.3949, 33.6766] as [number, number], zoom: 13 },
  { id: 'sokhna', label: 'Ain Sokhna Peak', labelAr: 'العين السخنة', center: [29.6010, 32.3380] as [number, number], zoom: 12 },
  { id: 'zayed', label: 'Sheikh Zayed', labelAr: 'الشيخ زايد', center: [30.0385, 30.9784] as [number, number], zoom: 12 }
];

export const MapSection: React.FC<MapSectionProps> = ({ onOpenMapModal, properties, locale = 'en' }) => {
  const isAr = locale === 'ar';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [activeFlyZone, setActiveFlyZone] = useState('all');

  // Use server-passed real DB properties, fall back to adapted FALLBACK_PROPERTIES
  const propertiesList = React.useMemo(() => {
    if (properties && properties.length > 0) return properties;
    return adaptProperties(FALLBACK_PROPERTIES, locale as 'en' | 'ar');
  }, [properties, locale]);

  const handleFlyTo = (dest: typeof FLY_DESTINATIONS[0]) => {
    setActiveFlyZone(dest.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(dest.center, dest.zoom, {
        duration: 1.6,
        easeLinearity: 0.25
      });
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize real Leaflet map centered on Greater Cairo & Egypt Luxury Corridor
    const map = L.map(mapContainerRef.current, {
      center: [30.02, 31.35],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: false
    });

    // High-Res ESRI World Satellite Imagery (Cached)
    createCachedTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(map);

    // Add luxury gold pins for properties
    const pinHtml = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(10, 12, 16, 0.9);
        border: 2px solid #E5B869;
        box-shadow: 0 0 16px rgba(229, 184, 105, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #E5B869;"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: pinHtml,
      className: 'luxury-map-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    propertiesList.forEach((prop) => {
      const lat = prop.mapCoordinates?.lat ?? (prop as any).latitude;
      const lng = prop.mapCoordinates?.lng ?? (prop as any).longitude;
      if (!lat || !lng) return;
      const label = prop.title || prop.title_en || '';
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.bindTooltip(
        `<div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 700; color: #E5B869; background: #11141B; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(229, 184, 105, 0.4);">${label}</div>`,
        { direction: 'top', offset: [0, -14], className: 'luxury-leaflet-tooltip' }
      );
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [propertiesList]);


  return (
    <section className="map-section section-padding" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="map-horizon-glow" />
      <div className="container">
        {/* Header */}
        <div className="map-section-header">
          <div>
            <div className="section-eyebrow-pill">
              <span className="eyebrow-dot" />
              <span>{isAr ? 'الحصرية الجغرافية والمسح السيادي' : 'GEOGRAPHIC EXCLUSIVITY'}</span>
            </div>
            <h2 className="section-title">
              <span>{isAr ? 'خريطة الصروح الفاخرة في ' : 'Cairo & Coast '}</span>
              <span className="title-serif-accent">{isAr ? 'مصر والساحل' : 'Cartography'}</span>
            </h2>
          </div>
          <button 
            className="explore-map-btn"
            onClick={onOpenMapModal}
            type="button"
          >
            <span>{isAr ? 'فتح الخريطة التفاعلية' : 'Open Interactive Map'}</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Real Interactive Map Canvas Card */}
        <div className="real-map-card">
          <div ref={mapContainerRef} className="leaflet-map-canvas" />
          <div className="map-inner-vignette" />

          {/* Top Floating Fly-To Quick Destination Pills */}
          <div className="map-fly-pills-bar" data-lenis-prevent="true">
            {FLY_DESTINATIONS.map((dest) => {
              const isActive = activeFlyZone === dest.id;
              return (
                <button
                  key={dest.id}
                  onClick={() => handleFlyTo(dest)}
                  className={`map-fly-pill ${isActive ? 'active' : ''}`}
                  type="button"
                >
                  <MapPin size={12} className="fly-pin-icon" />
                  <span>{isAr ? dest.labelAr : dest.label}</span>
                </button>
              );
            })}
          </div>

          {/* Frosted Glass Overlay Teaser */}
          <div className="map-glass-badge">
            <div className="glass-badge-header">
              <Compass size={18} className="badge-compass-icon" />
              <span>{isAr ? 'المسح الجغرافي اللحظي للصروح' : 'Real-Time Prime Cartography'}</span>
            </div>
            <p className="glass-badge-sub">
              {isAr 
                ? 'استكشف، كبّر وتفقد مواقع وتوزيع الأصول والقصور عبر القاهرة الكبرى، الساحل الشمالي والجونة.' 
                : 'Drag, zoom, and inspect architectural parcels across Greater Cairo, North Coast, and El Gouna.'}
            </p>
            <button 
              className="btn-gold map-launch-btn"
              onClick={onOpenMapModal}
              type="button"
            >
              <Sparkles size={15} />
              <span>{isAr ? 'استكشاف الدليل الجغرافي الكامل' : 'Full Directory Exploration'}</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .map-section {
          background: transparent;
          position: relative;
        }

        .map-horizon-glow {
          position: absolute;
          top: 30px;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 1050px;
          height: 320px;
          background: radial-gradient(
            ellipse at center,
            rgba(229, 184, 105, 0.08) 0%,
            rgba(229, 184, 105, 0.015) 45%,
            transparent 70%
          );
          pointer-events: none;
          filter: blur(55px);
          z-index: 1;
        }

        .map-section .container {
          position: relative;
          z-index: 2;
        }

        .map-section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 2.5rem;
          gap: 1.5rem;
        }

        .section-eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #E5B869;
          background: rgba(229, 184, 105, 0.08);
          border: 1px solid rgba(229, 184, 105, 0.25);
          margin-bottom: 0.85rem;
          text-transform: uppercase;
        }

        [data-theme="light"] .section-eyebrow-pill {
          color: #8C6826;
          background: rgba(184, 147, 74, 0.08);
          border-color: rgba(140, 104, 38, 0.22);
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #E5B869;
          display: inline-block;
        }

        [data-theme="light"] .eyebrow-dot {
          background: #8C6826;
        }

        .section-title {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 3.5vw, 2.75rem);
          font-weight: 800;
          color: var(--text-primary, #FFFFFF);
          line-height: 1.2;
        }

        [data-theme="light"] .section-title {
          color: #141210;
        }

        .title-serif-accent {
          font-family: Georgia, serif;
          font-weight: 400;
          font-style: italic;
          color: #E5B869;
        }

        [data-theme="light"] .title-serif-accent {
          color: #8C6826;
        }

        .explore-map-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #E5B869;
          font-size: 0.9375rem;
          font-weight: 700;
          transition: all var(--transition-fast);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        [data-theme="light"] .explore-map-btn {
          color: #8C6826;
        }

        .explore-map-btn:hover {
          color: #FFF0C2;
          transform: translateX(4px);
        }

        [data-theme="light"] .explore-map-btn:hover {
          color: #593D0E;
        }

        /* Real Map Card */
        .real-map-card {
          position: relative;
          width: 100%;
          height: 480px;
          border-radius: 24px;
          overflow: hidden;
          background: #0C0E14;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .real-map-card {
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.2);
        }

        [data-theme="light"] .real-map-card {
          border: 1px solid rgba(184, 133, 48, 0.22);
          box-shadow: 0 16px 45px rgba(30, 24, 16, 0.08), 0 2px 8px rgba(0, 0, 0, 0.02);
        }

        .map-inner-vignette {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          pointer-events: none;
          z-index: 100;
          box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.25);
        }

        /* Top Floating Quick Fly-To Destination Pills */
        .map-fly-pills-bar {
          position: absolute;
          top: 1.25rem;
          left: 1.25rem;
          right: 1.25rem;
          z-index: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 2px;
        }

        .map-fly-pills-bar::-webkit-scrollbar {
          display: none;
        }

        .map-fly-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.45rem 0.95rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: var(--radius-full);
          white-space: nowrap;
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        [data-theme="dark"] .map-fly-pill {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(10, 14, 22, 0.75);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
        }

        [data-theme="dark"] .map-fly-pill:hover {
          color: #ffffff;
          border-color: var(--gold-primary);
          background: rgba(16, 22, 34, 0.88);
          transform: translateY(-1px);
        }

        [data-theme="light"] .map-fly-pill {
          color: #12151B;
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 4px 12px rgba(30, 24, 16, 0.06), inset 0 1px 1px #FFFFFF;
        }

        [data-theme="light"] .map-fly-pill:hover {
          color: var(--gold-dark);
          border-color: var(--gold-primary);
          background: #FFFFFF;
          transform: translateY(-1px);
        }

        .map-fly-pill.active {
          color: #0A0C10 !important;
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 50%, #C59A45 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.6) !important;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(197, 154, 69, 0.28), inset 0 1px 1px #FFFFFF !important;
        }

        .fly-pin-icon {
          flex-shrink: 0;
          color: var(--gold-primary);
          transition: color var(--transition-fast);
        }

        .map-fly-pill.active .fly-pin-icon {
          color: #0A0C10 !important;
        }

        .leaflet-map-canvas {
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        /* Glass Badge Teaser */
        .map-glass-badge {
          position: absolute;
          bottom: 2rem;
          left: 2rem;
          z-index: 500;
          backdrop-filter: blur(24px) saturate(190%);
          -webkit-backdrop-filter: blur(24px) saturate(190%);
          border-radius: 18px;
          padding: 1.5rem 1.75rem;
          max-width: 380px;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .map-glass-badge {
          background: rgba(17, 20, 27, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        }

        [data-theme="light"] .map-glass-badge {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 16px 36px rgba(30, 24, 16, 0.08), inset 0 1.5px 2px #FFFFFF;
        }

        .glass-badge-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .badge-compass-icon {
          flex-shrink: 0;
          color: var(--gold-primary);
        }

        .glass-badge-sub {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 1.25rem;
        }

        .map-launch-btn {
          width: 100%;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        /* Leaflet Overrides */
        .luxury-leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .luxury-leaflet-tooltip::before {
          display: none !important;
        }

        @media (max-width: 768px) {
          .map-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }
          .section-title {
            font-size: 1.75rem;
            line-height: 1.25;
          }
          .real-map-card {
            height: 420px;
            border-radius: 20px;
          }
          .map-fly-pills-bar {
            top: 0.85rem;
            left: 0.85rem;
            right: 0.85rem;
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 4px;
          }
          .map-fly-pill {
            flex-shrink: 0;
            white-space: nowrap;
            padding: 0.4rem 0.85rem;
            font-size: 0.72rem;
          }
          .map-glass-badge {
            left: 0.75rem;
            right: 0.75rem;
            bottom: 0.75rem;
            max-width: none;
            padding: 1.15rem 1.25rem;
            border-radius: 16px;
          }
          .glass-badge-sub {
            font-size: 0.75rem;
            margin-bottom: 0.85rem;
          }
        }
      `}</style>
    </section>
  );
};
