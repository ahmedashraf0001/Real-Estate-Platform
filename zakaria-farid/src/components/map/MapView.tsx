'use client';
import { useRouter } from 'next/navigation';
import { triggerNavigationStart } from '@/components/NavigationProgress';
import React, { useState, useEffect, useRef, useMemo } from 'react';
let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}
import { 
  Moon, 
  Sun, 
  Search, 
  Plus, 
  Minus, 
  MapPin, 
  Building2, 
  ArrowUpRight, 
  PanelRightClose, 
  PanelRightOpen,
  Maximize2,
  X,
  Compass,
  Bed,
  Bath,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { Property } from '@/types';
import { createCachedTileLayer } from '@/lib/mapCache';

interface MapViewProps {
  properties?: Property[];
  locale?: string;
  onSelectProperty?: (id: string) => void;
  onOpenInquiry?: (type?: string, propertyName?: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  properties: propProperties,
  locale = 'en',
  onSelectProperty: propOnSelectProperty,
  onOpenInquiry: propOnOpenInquiry
}) => {
  const router = useRouter();
  const onSelectProperty = propOnSelectProperty || ((id: string) => {
    triggerNavigationStart();
    router.push('/' + locale + '/properties/' + id);
  });
  const onOpenInquiry = propOnOpenInquiry || ((type?: string, propertyName?: string) => {
    window.location.href = 'https://wa.me/201009998888?text=' + encodeURIComponent('Hello, I am inquiring about ' + (propertyName || 'cartography acquisition'));
  });
  // Use server-passed real DB properties, fall back to adapted FALLBACK_PROPERTIES
  const adaptedFallback = useMemo(() => adaptProperties(FALLBACK_PROPERTIES, locale as 'en' | 'ar'), [locale]);
  const allPropertiesList: Property[] = (propProperties && propProperties.length > 0) ? (propProperties as Property[]) : adaptedFallback;

  // 1. Unselected by default as requested
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState<number>(0);
  const [isSatelliteMode, setIsSatelliteMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarClosing, setIsSidebarClosing] = useState(false);
  const closeSidebar = () => {
    setIsSidebarClosing(true);
    setTimeout(() => {
      setIsSidebarOpen(false);
      setIsSidebarClosing(false);
    }, 260);
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return null;
    return allPropertiesList.find((p: Property) => p.id === selectedPropertyId) || null;
  }, [selectedPropertyId, allPropertiesList]);

  // Reset image index when selected property changes
  useEffect(() => {
    setPreviewImageIndex(0);
  }, [selectedPropertyId]);

  const filteredProperties = useMemo(() => {
    return allPropertiesList.filter((p: Property) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (p.title || p.title_en || '').toLowerCase().includes(q) ||
        (p.district || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.propertyType || p.type || '').toLowerCase().includes(q) ||
        (p.price || p.price_egp || 0).toString().includes(q)
      );
    });
  }, [searchQuery, allPropertiesList]);

  // Initialize Real Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.025, 31.25],
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    const initialSatelliteTiles = createCachedTileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ).addTo(map);

    createCachedTileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, opacity: 0.95 }
    ).addTo(map);

    createCachedTileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, opacity: 0.95 }
    ).addTo(map);

    tileLayerRef.current = initialSatelliteTiles;
    mapInstanceRef.current = map;

    // Render Markers for all properties
    allPropertiesList.forEach((prop: Property) => {
      const lat = prop.mapCoordinates?.lat ?? (prop as any).latitude;
      const lng = prop.mapCoordinates?.lng ?? (prop as any).longitude;
      if (!lat || !lng) return;
      const label = prop.title || prop.title_en || '';

      const pinIcon = L.divIcon({
        html: `
          <div class="leaflet-gold-pin-wrapper" id="marker-${prop.id}">
            <div class="pin-beacon">
              <div class="pin-core-dot"></div>
              <div class="pin-glow-ring"></div>
            </div>
            <div class="pin-title-pill">
              <span>${label}</span>
            </div>
          </div>
        `,
        className: 'custom-gold-leaflet-marker',
        iconSize: [160, 48],
        iconAnchor: [80, 20]
      });

      const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      marker.on('click', () => {
        setSelectedPropertyId(prop.id);
        map.flyTo([lat, lng], 16.5, { duration: 1.4, easeLinearity: 0.25 });
      });

      markersRef.current[prop.id] = marker;
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync marker active classes whenever selectedPropertyId changes
  useEffect(() => {
    allPropertiesList.forEach((prop: Property) => {
      const el = document.getElementById(`marker-${prop.id}`);
      if (el) {
        if (selectedPropertyId === prop.id) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });
  }, [selectedPropertyId, allPropertiesList]);

  // Switch between Dark Neon Vector Map & Real High-Res Satellite Imagery
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    if (isSatelliteMode) {
      const satelliteLayer = createCachedTileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      ).addTo(mapInstanceRef.current);
      tileLayerRef.current = satelliteLayer;
    } else {
      const darkLayer = createCachedTileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      ).addTo(mapInstanceRef.current);
      tileLayerRef.current = darkLayer;
    }
  }, [isSatelliteMode]);

  // Handle Card Click -> Pan & Zoom Map Close to Property
  const handleSelectCard = (property: Property) => {
    setSelectedPropertyId(property.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [property.mapCoordinates.lat, property.mapCoordinates.lng],
        16.5,
        { duration: 1.4, easeLinearity: 0.25 }
      );
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetCenter = () => {
    mapInstanceRef.current?.flyTo([30.025, 31.25], 11, { duration: 1 });
  };

  return (
    <div className="map-view-page" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div 
        ref={mapContainerRef} 
        className="real-leaflet-viewport" 
        data-lenis-prevent="true" 
      />

      {/* 4. Horizontal Map Control Strip (Docked Beside the Sidebar) */}
      <div className={`map-floating-controls-row ${isSidebarOpen ? 'sidebar-is-open' : 'sidebar-is-closed'}`}>
        <div className="map-glass-ctrl-pill">
          <button 
            className="map-glass-ctrl-btn"
            onClick={handleZoomIn}
            title={locale === 'ar' ? 'تكبير الخريطة' : 'Zoom In'}
            type="button"
          >
            <Plus size={15} />
          </button>
          <div className="ctrl-divider-v" />
          <button 
            className="map-glass-ctrl-btn"
            onClick={handleZoomOut}
            title={locale === 'ar' ? 'تصغير الخريطة' : 'Zoom Out'}
            type="button"
          >
            <Minus size={15} />
          </button>
          <div className="ctrl-divider-v" />
          <button 
            className="map-glass-ctrl-btn"
            onClick={handleResetCenter}
            title={locale === 'ar' ? 'إعادة ضبط المركز' : 'Reset Map Center'}
            type="button"
          >
            <Compass size={15} />
          </button>
        </div>

        <button 
          className="map-mode-pill-btn"
          onClick={() => setIsSatelliteMode(!isSatelliteMode)}
          type="button"
        >
          {isSatelliteMode ? <Sun size={14} className="mode-gold-icon" /> : <Moon size={14} className="mode-gold-icon" />}
          <span>{isSatelliteMode ? (locale === 'ar' ? 'نمط النيون' : 'Neon View') : (locale === 'ar' ? 'الأقمار الصناعية' : 'Satellite')}</span>
        </button>
      </div>

      {/* 2. Selected Property Bottom-Left Glass Preview Card (Pure Hardware-Accelerated CSS - No Framer Motion) */}
      {selectedProperty && (
        <div 
          className="map-selected-preview-card"
          data-lenis-prevent="true"
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Top Bar with Badges & Dismiss */}
          <div className="preview-top-row">
            <div className="preview-badges-wrap">
              <span className="preview-district-badge">
                <Building2 size={11} className="badge-icon-gold" />
                <span>{selectedProperty.estateName}</span>
              </span>
              <span className="preview-id-badge">
                <ShieldCheck size={11} className="badge-icon-gold" />
                <span>{locale === 'ar' ? 'ملكية حرة' : 'FREEHOLD'}</span>
              </span>
            </div>

            <button 
              className="preview-close-btn"
              onClick={() => setSelectedPropertyId(null)}
              title={locale === 'ar' ? 'إغلاق المعاينة' : 'Dismiss Preview'}
              type="button"
            >
              <X size={13} />
            </button>
          </div>

          {/* Image Gallery Stage with Mini Carousel */}
          <div className="preview-gallery-stage">
            <img 
              src={selectedProperty.images[previewImageIndex] || selectedProperty.images[0]} 
              alt={selectedProperty.title}
              className="preview-hero-img"
            />

            <div className="preview-gallery-overlay" />

            {/* Counter Pill */}
            <div className="preview-counter-pill">
              <span>{String(previewImageIndex + 1).padStart(2, '0')} / {String(selectedProperty.images.length).padStart(2, '0')}</span>
            </div>

            {/* Step Navigation Arrows */}
            {selectedProperty.images.length > 1 && (
              <>
                <button 
                  className="preview-nav-arrow arrow-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImageIndex((prev) => (prev - 1 + selectedProperty.images.length) % selectedProperty.images.length);
                  }}
                  title={locale === 'ar' ? 'الصورة السابقة' : 'Previous Image'}
                  type="button"
                >
                  <ChevronLeft size={14} />
                </button>
                <button 
                  className="preview-nav-arrow arrow-right"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImageIndex((prev) => (prev + 1) % selectedProperty.images.length);
                  }}
                  title={locale === 'ar' ? 'الصورة التالية' : 'Next Image'}
                  type="button"
                >
                  <ChevronRight size={14} />
                </button>
              </>
            )}

            <span className="preview-type-pill">{selectedProperty.propertyType}</span>
          </div>

          {/* Information Body */}
          <div className="preview-info-body">
            <div className="preview-title-block">
              <h3 className="preview-title">{selectedProperty.title}</h3>
              <div className="preview-price" dir="ltr">
                {new Intl.NumberFormat('en-US').format(selectedProperty.price)}{' '}
                <span className="preview-currency">{locale === 'ar' ? 'ج.م' : selectedProperty.currency}</span>
              </div>
            </div>

            <div className="preview-location-line">
              <MapPin size={13} className="pin-icon" />
              <span>{selectedProperty.location}</span>
            </div>

            {/* Tight 3-Column Spec Pills - Pure White & Gold */}
            <div className="preview-specs-pills">
              <div className="spec-item">
                <Bed size={12} className="spec-icon" />
                <span><strong>{selectedProperty.beds}</strong> {locale === 'ar' ? 'غرف' : 'Beds'}</span>
              </div>
              <div className="spec-item">
                <Bath size={12} className="spec-icon" />
                <span><strong>{selectedProperty.baths}</strong> {locale === 'ar' ? 'حمامات' : 'Baths'}</span>
              </div>
              <div className="spec-item">
                <Maximize2 size={12} className="spec-icon" />
                <span><strong>{selectedProperty.sqm}</strong> {locale === 'ar' ? 'م²' : 'SQM'}</span>
              </div>
            </div>

            {/* Full-width Single Action Button */}
            <div className="preview-actions-row">
              <button
                type="button"
                className="btn-gold preview-explore-btn-full"
                onClick={() => onSelectProperty(selectedProperty.id)}
              >
                <span>{locale === 'ar' ? 'معاينة الملف الكامل للصرح' : 'Explore Full Dossier'}</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Sidebar Open Trigger */}
      {!isSidebarOpen && (
        <button
          className="floating-sidebar-trigger"
          onClick={() => setIsSidebarOpen(true)}
          title={locale === 'ar' ? 'فتح دليل الصروح' : 'Open Sovereign Directory'}
          type="button"
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        >
          <Building2 size={16} className="trigger-gold-icon" />
          <span>{locale === 'ar' ? `دليل الصروح (${filteredProperties.length})` : `Directory (${filteredProperties.length})`}</span>
          <PanelRightOpen size={16} />
        </button>
      )}

      {/* Right Floating Sovereign Directory (Pure CSS Animation - No Framer Motion) */}
      {isSidebarOpen && (
        <aside
          className={`floating-glass-directory ${isSidebarClosing ? 'closing' : ''}`}
          data-lenis-prevent="true"
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="glass-directory-header">
            <div className="dir-header-top">
              <div>
                <span className="dir-eyebrow">{locale === 'ar' ? 'الخريطة المعمارية والمسح الجغرافي' : 'ARCHITECTURAL CARTOGRAPHY'}</span>
                <h2 className="dir-title">{locale === 'ar' ? 'دليل الصروح السيادية' : 'Sovereign Directory'}</h2>
              </div>
              <button
                className="dir-collapse-btn"
                onClick={closeSidebar}
                title={locale === 'ar' ? 'تصغير الدليل' : 'Minimize Directory'}
                type="button"
              >
                <PanelRightClose size={18} />
              </button>
            </div>

            <span className="dir-sub">
              {locale === 'ar' 
                ? `${filteredProperties.length} صروح معمارية ممثلة على الخريطة` 
                : `${filteredProperties.length} Curated estates represented in map`}
            </span>

            <div className="dir-search-wrap">
              <Search size={15} className="dir-search-icon" />
              <input 
                type="text"
                placeholder={locale === 'ar' ? 'ابحث بالصرح، الكمبوند، أو السعر...' : 'Filter by estate, compound, price...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dir-search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="dir-search-clear"
                  type="button"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div 
            className="glass-cards-scroll" 
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
          >
            {filteredProperties.map((property: Property) => {
              const isSelected = selectedPropertyId === property.id;
              const formattedPrice = new Intl.NumberFormat('en-US').format(property.price);

              return (
                <div
                  key={property.id}
                  className={`floating-estate-card ${isSelected ? 'active-pin' : ''}`}
                  onClick={() => handleSelectCard(property)}
                >
                  <div className="estate-thumb-wrap">
                    <img 
                      src={property.images[0]} 
                      alt={property.title} 
                      className="estate-thumb-img" 
                      loading="lazy" 
                    />
                    <div className="estate-thumb-overlay" />
                    <span className="estate-district-pill">
                      <MapPin size={11} className="pin-icon" />
                      <span>{property.district}</span>
                    </span>
                  </div>

                  <div className="estate-content-wrap">
                    <div className="estate-title-row">
                      <h3 className="estate-card-title">{property.title}</h3>
                      <span className="estate-type-tag">{property.propertyType}</span>
                    </div>

                    <div className="estate-price-row">
                      <span className="estate-price-val" dir="ltr">
                        {formattedPrice} <span className="estate-currency">{locale === 'ar' ? 'ج.م' : property.currency}</span>
                      </span>
                    </div>

                    <div className="estate-specs-row">
                      <span>{property.beds} {locale === 'ar' ? 'غرف' : 'Beds'}</span>
                      <span className="spec-dot">•</span>
                      <span>{property.baths} {locale === 'ar' ? 'حمامات' : 'Baths'}</span>
                      <span className="spec-dot">•</span>
                      <span>{property.sqm} {locale === 'ar' ? 'م²' : 'sqm'}</span>
                    </div>

                    <div className="estate-card-actions">
                      <button
                        type="button"
                        className="estate-open-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProperty(property.id);
                        }}
                      >
                        <span>{locale === 'ar' ? 'معاينة الصرح' : 'Explore Estate'}</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      <style>{`
        @keyframes sidebarSlideIn {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes sidebarSlideInRTL {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes sidebarSlideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sidebarSlideOut {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(32px); }
        }
        @keyframes sidebarSlideOutRTL {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-32px); }
        }
        @keyframes sidebarSlideDown {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(100%); }
        }
        @keyframes previewCardSlideIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes previewCardSlideInRTL {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .map-view-page {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: var(--bg-primary);
        }

        .real-leaflet-viewport {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        /* =========================================================
           BALANCED TRANSLUCENT LIQUID CRYSTAL GLASS OVER MAP
           ========================================================= */
        [data-theme="dark"] .map-glass-ctrl-pill,
        [data-theme="dark"] .map-mode-pill-btn,
        [data-theme="dark"] .map-selected-preview-card,
        [data-theme="dark"] .floating-sidebar-trigger,
        [data-theme="dark"] .floating-glass-directory {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.16) 0%,
            rgba(255, 255, 255, 0.05) 25%,
            rgba(18, 24, 38, 0.46) 60%,
            rgba(10, 14, 24, 0.62) 100%
          ) !important;
          backdrop-filter: blur(24px) saturate(200%) contrast(105%) brightness(105%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(200%) contrast(105%) brightness(105%) !important;
          border: 1px solid rgba(255, 255, 255, 0.24) !important;
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.38), 
            0 4px 14px rgba(0, 0, 0, 0.22),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.55),
            inset 0 -1px 1px rgba(255, 255, 255, 0.08) !important;
        }

        [data-theme="light"] .map-glass-ctrl-pill,
        [data-theme="light"] .map-mode-pill-btn,
        [data-theme="light"] .map-selected-preview-card,
        [data-theme="light"] .floating-sidebar-trigger,
        [data-theme="light"] .floating-glass-directory {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.58) 0%,
            rgba(255, 255, 255, 0.32) 40%,
            rgba(248, 246, 240, 0.48) 100%
          ) !important;
          backdrop-filter: blur(22px) saturate(180%) contrast(102%) brightness(102%) !important;
          -webkit-backdrop-filter: blur(22px) saturate(180%) contrast(102%) brightness(102%) !important;
          border: 1px solid rgba(255, 255, 255, 0.70) !important;
          box-shadow: 
            0 16px 40px rgba(15, 23, 42, 0.08), 
            0 2px 8px rgba(15, 23, 42, 0.03),
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(255, 255, 255, 0.35) !important;
        }

        /* Keyframe entrance animations */
        @keyframes previewCardSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes sidebarSlideIn {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes sidebarSlideInRTL {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes previewCardSlideIn {
          from {
            opacity: 0;
            transform: translateX(-30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes previewCardSlideInRTL {
          from {
            opacity: 0;
            transform: translateX(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        /* 4. Horizontal Map Control Strip Docked Beside Sidebar */
        .map-floating-controls-row {
          position: absolute;
          bottom: 1.5rem;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1), left 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease;
        }

        .map-floating-controls-row.sidebar-is-open {
          right: calc(420px + 2.5rem);
          left: auto;
        }

        .map-floating-controls-row.sidebar-is-closed {
          right: 1.5rem;
          left: auto;
        }

        .map-view-page[dir="rtl"] .map-floating-controls-row.sidebar-is-open,
        [dir="rtl"] .map-floating-controls-row.sidebar-is-open {
          right: auto;
          left: calc(420px + 2.5rem);
        }

        .map-view-page[dir="rtl"] .map-floating-controls-row.sidebar-is-closed,
        [dir="rtl"] .map-floating-controls-row.sidebar-is-closed {
          right: auto;
          left: 1.5rem;
        }

        .map-glass-ctrl-pill {
          display: flex;
          align-items: center;
          border-radius: 9999px;
          padding: 4px 6px;
        }

        .map-glass-ctrl-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 50%;
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        [data-theme="dark"] .map-glass-ctrl-btn {
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        [data-theme="light"] .map-glass-ctrl-btn {
          color: #0D1117;
        }

        .map-glass-ctrl-btn:hover {
          background: rgba(197, 142, 54, 0.2);
          color: var(--gold-primary);
        }

        .ctrl-divider-v {
          width: 1px;
          height: 16px;
          margin: 0 3px;
        }

        [data-theme="dark"] .ctrl-divider-v {
          background: rgba(255, 255, 255, 0.25);
        }

        [data-theme="light"] .ctrl-divider-v {
          background: rgba(0, 0, 0, 0.12);
        }

        .map-mode-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 9999px;
          padding: 0.65rem 1.25rem;
          font-family: inherit;
          font-size: 0.8125rem;
          font-weight: 700;
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        [data-theme="dark"] .map-mode-pill-btn {
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        [data-theme="light"] .map-mode-pill-btn {
          color: #0D1117;
        }

        .map-mode-pill-btn:hover {
          border-color: var(--gold-primary) !important;
          color: var(--gold-primary);
          transform: translateY(-2px);
        }

        .mode-gold-icon {
          color: var(--gold-primary);
        }

        /* 2 & 5. Selected Property Compact Glass Preview Card */
        .map-selected-preview-card {
          position: absolute;
          bottom: 1.5rem;
          left: 1.5rem;
          right: auto;
          z-index: 1001;
          width: min(320px, calc(100vw - 2.5rem));
          border-radius: 24px;
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          animation: previewCardSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .map-view-page[dir="rtl"] .map-selected-preview-card,
        [dir="rtl"] .map-selected-preview-card {
          left: auto;
          right: 1.5rem;
          animation: previewCardSlideInRTL 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .preview-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .preview-badges-wrap {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .preview-district-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }

        [data-theme="dark"] .preview-district-badge {
          color: #F5C672;
          background: rgba(221, 167, 82, 0.22);
          border: 1px solid rgba(221, 167, 82, 0.55);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
        }

        [data-theme="light"] .preview-district-badge {
          color: var(--gold-primary);
          background: rgba(197, 154, 69, 0.12);
          border: 1px solid rgba(197, 154, 69, 0.35);
        }

        .preview-id-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.58rem;
          font-weight: 800;
          padding: 0.25rem 0.55rem;
          border-radius: 6px;
        }

        [data-theme="dark"] .preview-id-badge {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.35);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        }

        [data-theme="light"] .preview-id-badge {
          color: #1E293B;
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .badge-icon-gold {
          color: var(--gold-primary);
        }

        .preview-close-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        [data-theme="dark"] .preview-close-btn {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        [data-theme="dark"] .preview-close-btn:hover {
          color: #DDA752;
          border-color: rgba(221, 167, 82, 0.5);
          background: rgba(221, 167, 82, 0.25);
        }

        [data-theme="light"] .preview-close-btn {
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #475569;
        }

        [data-theme="light"] .preview-close-btn:hover {
          color: #0D1117;
          background: rgba(0, 0, 0, 0.1);
          border-color: rgba(0, 0, 0, 0.15);
        }

        .preview-gallery-stage {
          position: relative;
          width: 100%;
          height: 155px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }

        .preview-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.2s ease;
        }

        .preview-gallery-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%);
          pointer-events: none;
        }

        .preview-counter-pill {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(10, 14, 22, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 9999px;
          padding: 0.15rem 0.55rem;
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 800;
          color: #F5C672;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        }

        .preview-nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(10, 14, 22, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          z-index: 2;
        }

        .preview-nav-arrow:hover {
          background: rgba(221, 167, 82, 0.35);
          color: #DDA752;
          border-color: #DDA752;
        }

        .preview-nav-arrow.arrow-left { left: 6px; }
        .preview-nav-arrow.arrow-right { right: 6px; }

        .preview-type-pill {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(10, 14, 22, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(221, 167, 82, 0.5);
          border-radius: 6px;
          padding: 0.15rem 0.5rem;
          font-size: 0.625rem;
          font-weight: 800;
          color: #F5C672;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        }

        .preview-info-body {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .preview-title-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .preview-title {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 800;
          margin: 0;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        [data-theme="dark"] .preview-title {
          color: #FFFFFF;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
        }

        [data-theme="light"] .preview-title {
          color: #0D1117;
        }

        .preview-price {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--gold-primary);
        }

        .preview-currency {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--gold-primary);
          opacity: 0.9;
        }

        .preview-location-line {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        [data-theme="dark"] .preview-location-line {
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        }

        [data-theme="light"] .preview-location-line {
          color: #1E293B;
        }

        /* 3-Column Grid */
        .preview-specs-pills {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5px;
        }

        .spec-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border-radius: 8px;
          padding: 0.35rem 0.2rem;
          font-size: 0.72rem;
          font-weight: 600;
          white-space: nowrap;
        }

        [data-theme="dark"] .spec-item {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        }

        [data-theme="light"] .spec-item {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #0D1117;
        }

        .spec-item strong {
          font-weight: 800;
        }

        [data-theme="dark"] .spec-item strong {
          color: #FFFFFF;
        }

        [data-theme="light"] .spec-item strong {
          color: #0D1117;
        }

        .spec-icon {
          flex-shrink: 0;
          color: var(--gold-primary);
        }

        .preview-actions-row {
          margin-top: 0.2rem;
        }

        .preview-explore-btn-full {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0.65rem 1rem;
          font-size: 0.8125rem;
          font-weight: 700;
          border-radius: 12px;
          cursor: pointer;
        }

        /* 3. Floating Sidebar Open Trigger */
        .floating-sidebar-trigger {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          z-index: 1000;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border-radius: 9999px;
          padding: 0.7rem 1.45rem;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .map-view-page[dir="rtl"] .floating-sidebar-trigger,
        [dir="rtl"] .floating-sidebar-trigger {
          right: auto;
          left: 1.5rem;
        }

        [data-theme="dark"] .floating-sidebar-trigger {
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        [data-theme="light"] .floating-sidebar-trigger {
          color: #0D1117;
        }

        .floating-sidebar-trigger:hover {
          border-color: var(--gold-primary) !important;
          color: var(--gold-primary);
          transform: translateY(-2px);
        }

        .trigger-gold-icon {
          color: var(--gold-primary);
        }

        /* 4. Floating Frosted Crystal Glass Directory Dock */
        .floating-glass-directory {
          position: absolute;
          top: 1.5rem;
          bottom: 1.5rem;
          right: 1.5rem;
          left: auto;
          width: min(420px, calc(100vw - 3rem));
          z-index: 50;
          border-radius: 28px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: sidebarSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .map-view-page[dir="rtl"] .floating-glass-directory,
        [dir="rtl"] .floating-glass-directory {
          right: auto;
          left: 1.5rem;
          animation: sidebarSlideInRTL 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Exit animations (state-driven, applied before unmount) */
        .floating-glass-directory.closing {
          animation: sidebarSlideOut 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        }

        .map-view-page[dir="rtl"] .floating-glass-directory.closing,
        [dir="rtl"] .floating-glass-directory.closing {
          animation: sidebarSlideOutRTL 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        }

        .glass-directory-header {
          padding: 1.6rem 1.6rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        [data-theme="dark"] .glass-directory-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.18);
        }

        [data-theme="light"] .glass-directory-header {
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .dir-header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .dir-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--gold-primary);
          text-transform: uppercase;
        }

        .dir-title {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          margin: 0;
          line-height: 1.2;
        }

        [data-theme="dark"] .dir-title {
          color: #FFFFFF;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
        }

        [data-theme="light"] .dir-title {
          color: #0D1117;
        }

        .dir-collapse-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        [data-theme="dark"] .dir-collapse-btn {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
        }

        [data-theme="light"] .dir-collapse-btn {
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #0D1117;
        }

        .dir-collapse-btn:hover {
          background: rgba(197, 142, 54, 0.2);
          color: var(--gold-primary);
          border-color: var(--gold-primary);
        }

        .dir-sub {
          font-size: 0.8125rem;
          font-weight: 600;
          margin-bottom: 0.4rem;
        }

        [data-theme="dark"] .dir-sub {
          color: #CBD5E1;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        }

        [data-theme="light"] .dir-sub {
          color: #64748B;
        }

        .dir-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          margin-top: 0.25rem;
        }

        .dir-search-icon {
          position: absolute;
          left: 12px;
          color: var(--gold-primary);
          pointer-events: none;
        }

        .map-view-page[dir="rtl"] .dir-search-icon,
        [dir="rtl"] .dir-search-icon {
          left: auto;
          right: 12px;
        }

        .dir-search-input {
          width: 100%;
          border-radius: 12px;
          padding: 0.65rem 2rem 0.65rem 2.25rem;
          font-size: 0.8125rem;
          font-weight: 600;
          outline: none;
          transition: all var(--transition-fast);
        }

        .map-view-page[dir="rtl"] .dir-search-input,
        [dir="rtl"] .dir-search-input {
          padding: 0.65rem 2.25rem 0.65rem 2rem;
          text-align: right;
        }

        [data-theme="dark"] .dir-search-input {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
        }

        [data-theme="dark"] .dir-search-input::placeholder {
          color: rgba(255, 255, 255, 0.65);
        }

        [data-theme="light"] .dir-search-input {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.85);
          color: #0D1117;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 1px #FFFFFF;
        }

        [data-theme="light"] .dir-search-input::placeholder {
          color: #94A3B8;
        }

        .dir-search-input:focus {
          border-color: var(--gold-primary);
          box-shadow: 0 0 14px var(--gold-glow);
        }

        .dir-search-clear {
          position: absolute;
          right: 10px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .map-view-page[dir="rtl"] .dir-search-clear,
        [dir="rtl"] .dir-search-clear {
          right: auto;
          left: 10px;
        }

        /* 5. Scrollable Floating Cards */
        .glass-cards-scroll {
          padding: 1.25rem 1.4rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
          flex: 1 1 auto;
          min-height: 0;
          overscroll-behavior: contain;
        }

        .floating-estate-card {
          flex-shrink: 0;
          width: 100%;
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .floating-estate-card {
          background: rgba(18, 24, 36, 0.40);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.25);
        }

        [data-theme="light"] .floating-estate-card {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04), inset 0 1px 1px #FFFFFF;
        }

        .floating-estate-card:hover {
          border-color: var(--gold-primary);
          transform: translateY(-2px);
        }

        [data-theme="dark"] .floating-estate-card:hover {
          background: rgba(26, 34, 48, 0.55);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.4);
        }

        [data-theme="light"] .floating-estate-card:hover {
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
        }

        .floating-estate-card.active-pin {
          border-color: var(--gold-primary);
          box-shadow: 0 0 24px var(--gold-glow);
        }

        [data-theme="dark"] .floating-estate-card.active-pin {
          background: rgba(221, 167, 82, 0.18);
        }

        [data-theme="light"] .floating-estate-card.active-pin {
          background: rgba(197, 142, 54, 0.08);
        }

        .estate-thumb-wrap {
          width: 100%;
          height: 140px;
          overflow: hidden;
          position: relative;
        }

        .estate-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 400ms ease;
        }

        .floating-estate-card:hover .estate-thumb-img {
          transform: scale(1.05);
        }

        .estate-thumb-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.05) 0%,
            rgba(0, 0, 0, 0.45) 100%
          );
        }

        .estate-district-pill {
          position: absolute;
          top: 10px;
          left: 10px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(10, 14, 22, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 9999px;
          padding: 0.25rem 0.65rem;
          font-size: 0.6875rem;
          font-weight: 700;
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        }

        .map-view-page[dir="rtl"] .estate-district-pill,
        [dir="rtl"] .estate-district-pill {
          left: auto;
          right: 10px;
        }

        .pin-icon {
          color: var(--gold-primary);
        }

        .estate-content-wrap {
          padding: 1.15rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .estate-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .estate-card-title {
          font-family: var(--font-heading);
          font-size: 0.9375rem;
          font-weight: 800;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        [data-theme="dark"] .estate-card-title {
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        }

        [data-theme="light"] .estate-card-title {
          color: #0D1117;
        }

        .estate-type-tag {
          font-size: 0.6875rem;
          font-weight: 800;
          border-radius: 6px;
          padding: 0.18rem 0.5rem;
          white-space: nowrap;
          color: var(--gold-primary);
          background: rgba(197, 142, 54, 0.12);
          border: 1px solid var(--gold-border);
        }

        .estate-price-val {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--gold-primary);
        }

        .estate-currency {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--gold-primary);
          opacity: 0.9;
        }

        .estate-specs-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          font-weight: 600;
        }

        [data-theme="dark"] .estate-specs-row {
          color: #FFFFFF;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        }

        [data-theme="light"] .estate-specs-row {
          color: #1E293B;
        }

        .spec-dot {
          color: var(--gold-primary);
        }

        .estate-card-actions {
          margin-top: 0.35rem;
          padding-top: 0.65rem;
          display: flex;
          justify-content: flex-end;
        }

        .map-view-page[dir="rtl"] .estate-card-actions,
        [dir="rtl"] .estate-card-actions {
          justify-content: flex-start;
        }

        [data-theme="dark"] .estate-card-actions {
          border-top: 1px solid rgba(255, 255, 255, 0.18);
        }

        [data-theme="light"] .estate-card-actions {
          border-top: 1px solid rgba(0, 0, 0, 0.08);
        }

        .estate-open-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: none;
          font-family: var(--font-heading);
          font-size: 0.78rem;
          font-weight: 800;
          cursor: pointer;
          color: var(--gold-primary);
          transition: all var(--transition-fast);
        }

        .estate-open-btn:hover {
          color: var(--text-primary);
          transform: translateX(2px);
        }

        .map-view-page[dir="rtl"] .estate-open-btn:hover,
        [dir="rtl"] .estate-open-btn:hover {
          transform: translateX(-2px);
        }

        /* 6. Custom Leaflet Pin Styling */
        .custom-gold-leaflet-marker {
          background: transparent !important;
          border: none !important;
        }

        .leaflet-gold-pin-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transform: translateY(-5px);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          z-index: 100;
        }

        .leaflet-gold-pin-wrapper:hover,
        .leaflet-gold-pin-wrapper.active {
          transform: translateY(-5px) scale(1.1);
          z-index: 99999 !important;
        }

        .pin-beacon {
          position: relative;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pin-core-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #E5B869;
          border: 1.5px solid #0A0C10;
          box-shadow: 0 0 8px #E5B869;
          z-index: 2;
          transition: all 0.25s ease;
        }

        .leaflet-gold-pin-wrapper:hover .pin-core-dot,
        .leaflet-gold-pin-wrapper.active .pin-core-dot {
          background: #FFFFFF;
          border-color: #E5B869;
          box-shadow: 0 0 12px #FFFFFF, 0 0 18px #E5B869;
          transform: scale(1.2);
        }

        .pin-glow-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(229, 184, 105, 0.25);
          border: 1px solid rgba(229, 184, 105, 0.7);
          animation: pulseRing 2.6s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }

        .leaflet-gold-pin-wrapper.active .pin-glow-ring {
          animation: pulseRingFast 1.4s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }

        @keyframes pulseRing {
          0% { transform: scale(0.9); opacity: 0.85; }
          70% { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }

        @keyframes pulseRingFast {
          0% { transform: scale(0.9); opacity: 0.95; }
          70% { transform: scale(2.0); opacity: 0; }
          100% { transform: scale(2.0); opacity: 0; }
        }

        .pin-title-pill {
          position: absolute;
          top: 22px;
          left: 50%;
          transform: translateX(-50%) translateY(-4px) scale(0.92);
          opacity: 0;
          pointer-events: none;
          background: rgba(10, 14, 24, 0.92);
          backdrop-filter: blur(20px) saturate(200%);
          -webkit-backdrop-filter: blur(20px) saturate(200%);
          border: 1px solid rgba(229, 184, 105, 0.45);
          border-radius: var(--radius-full);
          padding: 0.28rem 0.68rem;
          white-space: nowrap;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.65), 0 0 12px rgba(229, 184, 105, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.3);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1000;
        }

        [data-theme="light"] .pin-title-pill {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(144, 107, 39, 0.4);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12), inset 0 1.5px 1.5px #FFFFFF;
        }

        .pin-title-pill span {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 700;
          color: #FFF0C2;
          letter-spacing: 0.02em;
        }

        [data-theme="light"] .pin-title-pill span {
          color: #0D1117;
        }

        .leaflet-gold-pin-wrapper:hover .pin-title-pill,
        .leaflet-gold-pin-wrapper.active .pin-title-pill {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(-50%) translateY(0) scale(1);
          z-index: 999999;
        }

        @media (max-width: 1024px) {
          .map-floating-controls-row.sidebar-is-open {
            right: 1.5rem;
            left: auto;
            bottom: auto;
            top: 5.5rem;
          }

          .map-view-page[dir="rtl"] .map-floating-controls-row.sidebar-is-open,
          [dir="rtl"] .map-floating-controls-row.sidebar-is-open {
            right: auto;
            left: 1.5rem;
            bottom: auto;
            top: 5.5rem;
          }
        }

        @media (max-width: 768px) {
          .floating-glass-directory {
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            max-height: 74dvh !important;
            border-radius: 24px 24px 0 0 !important;
            border-bottom: none !important;
            animation: sidebarSlideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          }

          .floating-glass-directory.closing {
            animation: sidebarSlideDown 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          }

          /* Lighter, clearer glass on mobile */
          [data-theme="dark"] .floating-glass-directory {
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.14) 0%,
              rgba(255, 255, 255, 0.05) 25%,
              rgba(18, 24, 38, 0.68) 60%,
              rgba(10, 14, 24, 0.82) 100%
            ) !important;
            backdrop-filter: blur(14px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(14px) saturate(180%) !important;
          }

          .glass-directory-header {
            padding: 1.1rem 1.25rem 0.75rem;
          }

          .dir-title {
            font-size: 1.15rem;
          }

          /* Clearer header text */
          .dir-eyebrow {
            font-size: 0.72rem;
            color: #F0C987;
          }

          .dir-search-wrap input {
            color: var(--text-primary) !important;
          }

          .dir-search-wrap input::placeholder {
            color: rgba(255, 255, 255, 0.65);
          }

          [data-theme="light"] .dir-search-wrap input::placeholder {
            color: rgba(15, 23, 42, 0.55);
          }

          .glass-cards-scroll {
            padding: 0.75rem 1rem 1.75rem;
            gap: 0.85rem;
          }

          /* Shorter cards so one fits fully in the sheet */
          .estate-thumb-wrap {
            height: 96px;
          }

          .floating-sidebar-trigger {
            top: auto;
            bottom: 1.25rem;
            left: 1rem;
            right: 1rem;
            width: auto;
            justify-content: center;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
          }

          .map-selected-preview-card {
            left: 0.75rem !important;
            right: 0.75rem !important;
            bottom: 0.75rem !important;
            width: auto !important;
            border-radius: 20px !important;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
          }

          /* One row, spread to opposite edges */
          .map-floating-controls-row,
          .map-floating-controls-row.sidebar-is-open,
          .map-floating-controls-row.sidebar-is-closed,
          .map-view-page[dir="rtl"] .map-floating-controls-row,
          [dir="rtl"] .map-floating-controls-row {
            top: 5rem;
            bottom: auto;
            left: 0.85rem;
            right: 0.85rem;
            gap: 6px;
            justify-content: space-between;
            transform: none;
          }

          /* Hide map controls while the navbar drawer is open (it overlaps them) */
          body:has(.mobile-drawer-backdrop) .map-floating-controls-row {
            opacity: 0;
            pointer-events: none;
          }

          .map-glass-ctrl-btn {
            width: 32px;
            height: 32px;
          }

          .map-mode-pill-btn {
            padding: 0.35rem 0.75rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};
