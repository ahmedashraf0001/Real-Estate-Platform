/**
 * Zakaria Farid Real Estate ERP — Portfolio Map Modal (FIN-OS v2 Overhaul)
 * Authoritative Light-Mode Real Interactive Cartography Modal.
 * Integrates Leaflet with CartoDB Voyager light tiles, Satellite toggle,
 * interactive markers with accent beacons, floating property previews,
 * and property cards with prominent image thumbnails in the sidebar.
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type L from 'leaflet';
import { 
  MapPin, 
  Building2, 
  Search, 
  X, 
  Plus, 
  Minus, 
  Compass, 
  Globe, 
  Layers, 
  Maximize2, 
  Minimize2,
  ArrowUpRight
} from 'lucide-react';

import { Property } from '@/lib/supabase/types';
import { ERPContract } from '@/lib/erp/types';
import { ZFModalShell } from '../../common/ZFModalShell';
import { 
  getPropertyCoordinates, 
  getPropertyStats, 
  getCuratedProjectImage 
} from '@/lib/erp/propertiesPortfolioCalculations';
import { createCachedTileLayer } from '@/lib/mapCache';
import shellStyles from '../../ZFWorkstationShell.module.css';
import styles from './ERPPortfolioMapModal.module.css';

export { getPropertyCoordinates, getPropertyStats };

let LeafletModule: typeof L | null = null;
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  LeafletModule = require('leaflet');
}

function getLeaflet(): typeof L | null {
  if (LeafletModule) return LeafletModule;
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    LeafletModule = require('leaflet');
    return LeafletModule;
  }
  return null;
}

export interface ERPPortfolioMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  contracts?: ERPContract[];
  selectedProjectId?: string | null;
  onSelectProjectAndFilter: (projectId: string) => void;
  isAr?: boolean;
}

export const ERPPortfolioMapModal: React.FC<ERPPortfolioMapModalProps> = ({
  isOpen,
  onClose,
  properties,
  contracts = [],
  selectedProjectId,
  onSelectProjectAndFilter,
  isAr = true,
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(selectedProjectId || null);
  const [prevSelectedProjectId, setPrevSelectedProjectId] = useState<string | null>(selectedProjectId || null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSatelliteMode, setIsSatelliteMode] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // Sync selectedPropertyId if prop changes during rendering (React recommended pattern)
  if (selectedProjectId !== prevSelectedProjectId) {
    setPrevSelectedProjectId(selectedProjectId || null);
    if (selectedProjectId) {
      setSelectedPropertyId(selectedProjectId);
    }
  }

  // Filtered properties based on search query
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const q = searchQuery.toLowerCase().trim();
    return properties.filter(p => {
      const title = `${p.title_ar || ''} ${p.title_en || ''}`.toLowerCase();
      const loc = (p.location || '').toLowerCase();
      const type = (p.type || '').toLowerCase();
      const price = String(p.price_egp || '');
      return title.includes(q) || loc.includes(q) || type.includes(q) || price.includes(q);
    });
  }, [properties, searchQuery]);

  // Selected property object
  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return null;
    return properties.find(p => p.id === selectedPropertyId) || null;
  }, [selectedPropertyId, properties]);

  // Initialize Real Leaflet Map
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !mapContainerRef.current) return;

    const Leaflet = getLeaflet();
    if (!Leaflet) return;

    // Clean up if already initialized
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {
        // Safe ignore
      }
      mapInstanceRef.current = null;
    }

    const containerEl = mapContainerRef.current as (HTMLDivElement & { _leaflet_id?: number }) | null;
    if (containerEl?._leaflet_id) {
      delete containerEl._leaflet_id;
    }

    // Determine initial center
    let initialCenter: [number, number] = [30.025, 31.25];
    let initialZoom = 10;

    if (selectedPropertyId) {
      const target = properties.find(p => p.id === selectedPropertyId);
      if (target) {
        const coords = getPropertyCoordinates(target, properties.indexOf(target));
        initialCenter = [coords.lat, coords.lng];
        initialZoom = 14;
      }
    }

    const map = Leaflet.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
    });

    // Helper to safely load cached or regular tiles
    const loadTiles = (url: string, opts: L.TileLayerOptions): L.TileLayer => {
      try {
        const cached = createCachedTileLayer(url, opts);
        if (cached) return cached;
      } catch {
        // Fallback to standard Leaflet tile layer
      }
      return Leaflet.tileLayer(url, opts);
    };

    // Real Light Map Tiles: ESRI World Street Map by default (crisp, accurate Egyptian roads & places, no watermarks)
    const streetTiles = loadTiles(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: '&copy; Esri, HERE, Garmin, USGS, NGA',
      }
    ).addTo(map);

    tileLayerRef.current = streetTiles;
    mapInstanceRef.current = map;

    // Render Markers for all properties
    markersRef.current = {};
    properties.forEach((prop, idx) => {
      const { lat, lng } = getPropertyCoordinates(prop, idx);
      const label = (isAr ? prop.title_ar : prop.title_en) || prop.title_ar || prop.title_en || 'مشروع عقاري';

      const isCurrentActive = selectedPropertyId === prop.id;

      const pinIcon = Leaflet.divIcon({
        html: `
          <div class="erp-map-pin ${isCurrentActive ? 'active' : ''}" id="erp-pin-${prop.id}">
            <div class="erp-pin-beacon">
              <div class="erp-pin-core"></div>
              <div class="erp-pin-pulse"></div>
            </div>
            <div class="erp-pin-label">
              <span>${label}</span>
            </div>
          </div>
        `,
        className: 'custom-erp-leaflet-div-icon',
        iconSize: [160, 48],
        iconAnchor: [80, 11],
      });

      const marker = Leaflet.marker([lat, lng], { icon: pinIcon }).addTo(map);
      marker.on('click', () => {
        setSelectedPropertyId(prop.id);
        map.flyTo([lat, lng], 15, { duration: 1.2 });

        // Smooth scroll corresponding card in sidebar
        const cardEl = document.getElementById(`erp-sidebar-card-${prop.id}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      markersRef.current[prop.id] = marker;
    });

    // Invalidate size after layout stabilization with multiple staggered intervals
    const timers = [
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50),
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200),
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 500),
    ];

    return () => {
      timers.forEach(clearTimeout);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Map initialized on mount/properties change; selection handled via flyTo
  }, [isOpen, properties, isAr]);

  // Sync marker active classes whenever selectedPropertyId changes
  useEffect(() => {
    properties.forEach(prop => {
      const el = document.getElementById(`erp-pin-${prop.id}`);
      if (el) {
        if (selectedPropertyId === prop.id) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });
  }, [selectedPropertyId, properties]);

  // Switch between CartoDB Voyager Light Tiles & ESRI World Imagery Satellite
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const Leaflet = getLeaflet();
    if (!Leaflet) return;

    if (tileLayerRef.current) {
      try {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      } catch {
        // ignore
      }
    }

    const loadTiles = (url: string, opts: L.TileLayerOptions): L.TileLayer => {
      try {
        const cached = createCachedTileLayer(url, opts);
        if (cached) return cached;
      } catch {
        // fallback
      }
      return Leaflet.tileLayer(url, opts);
    };

    if (isSatelliteMode) {
      const satelliteLayer = loadTiles(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: '&copy; Esri, Maxar, Earthstar Geographics' }
      ).addTo(mapInstanceRef.current);
      tileLayerRef.current = satelliteLayer;
    } else {
      const streetLayer = loadTiles(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: '&copy; Esri, HERE, Garmin, USGS, NGA' }
      ).addTo(mapInstanceRef.current);
      tileLayerRef.current = streetLayer;
    }
  }, [isSatelliteMode]);

  // Re-invalidate map size when maximized toggled
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 150);
    }
  }, [isMaximized]);

  // Handle Card Click in Sidebar
  const handleSelectCard = useCallback((property: Property) => {
    setSelectedPropertyId(property.id);
    const idx = properties.findIndex(p => p.id === property.id);
    const coords = getPropertyCoordinates(property, idx >= 0 ? idx : 0);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1.2 });
    }
  }, [properties]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetCenter = () => {
    mapInstanceRef.current?.flyTo([30.025, 31.25], 10, { duration: 1 });
  };

  if (!isOpen) return null;

  return (
    <ZFModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'خريطة المحفظة العقارية' : 'Portfolio Map'}
      subtitle={
        isAr 
          ? 'المسح الجغرافي لمواقع المشروعات وتوزيع الوحدات بالمحفظة' 
          : 'Interactive geographical survey of projects and inventory distribution'
      }
      icon={<MapPin size={16} />}
      headerExtra={
        <div className={styles.headerExtraWrap}>
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral} ${styles.headerPill}`}>
            {properties.length} {isAr ? 'موقع نشط' : 'active sites'}
          </span>
          <button
            type="button"
            onClick={() => setIsMaximized(prev => !prev)}
            title={isMaximized ? (isAr ? 'استعادة الحجم' : 'Restore Size') : (isAr ? 'ملء الشاشة' : 'Maximize')}
            className={styles.headerBtn}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      }
      maxWidth={isMaximized ? '98vw' : '1240px'}
      maxHeight={isMaximized ? '96vh' : '88vh'}
      className={`${styles.modalCard} ${isMaximized ? styles.isMaximized : ''}`}
      isAr={isAr}
    >
      {/* ─── MODAL SPLIT CONTAINER: SIDEBAR + MAP VIEWPORT ─── */}
      <div className={styles.splitContainer}>
        {/* ─── SIDEBAR: FILTER & PROPERTY CARDS WITH IMAGES ─── */}
        <aside className={styles.sidebar}>
          {/* Top Search & Filter Bar */}
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarHeaderTop}>
              <span className={styles.sidebarTitle}>
                {isAr ? 'دليل المشروعات العقارية' : 'Properties Directory'}
              </span>
              <span className={styles.sidebarCount}>
                {filteredProperties.length} {isAr ? 'صرح ممثل' : 'curated sites'}
              </span>
            </div>

            {/* Search Input */}
            <div className={styles.searchWrapper}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث بالاسم، المدينة، السعر...' : 'Filter by name, city, price...'}
                className={`${styles.searchInput} ${searchQuery ? styles.searchInputWithClear : ''}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={styles.searchClearBtn}
                  aria-label={isAr ? 'مسح البحث' : 'Clear search'}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Property Cards List */}
          <div className={styles.cardsList}>
            {filteredProperties.length > 0 ? (
              filteredProperties.map((p, idx) => {
                const isSelected = selectedPropertyId === p.id;
                const stats = getPropertyStats(p, contracts);
                const thumbUrl = getCuratedProjectImage(p, idx);
                const formattedPrice = (p.price_egp || 0).toLocaleString('en-US');

                return (
                  <div
                    key={p.id}
                    id={`erp-sidebar-card-${p.id}`}
                    onClick={() => handleSelectCard(p)}
                    className={`${styles.propertyCard} ${isSelected ? styles.propertyCardSelected : ''}`}
                  >
                    <div className={styles.cardInner}>
                      {/* Prominent Image Thumbnail */}
                      <div className={styles.cardThumb}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbUrl}
                          alt={p.title_ar || p.title_en}
                          className={styles.thumbImg}
                          onError={(e) => {
                            const fallback = getCuratedProjectImage(p, idx + 1);
                            if (e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />
                      </div>

                      {/* Card Content */}
                      <div className={styles.cardContent}>
                        {/* Title & Status Pill */}
                        <div className={styles.cardContentTop}>
                          <span
                            className={`${styles.cardTitle} ${isSelected ? styles.cardTitleSelected : ''}`}
                            title={p.title_ar || p.title_en}
                          >
                            {isAr ? p.title_ar : p.title_en}
                          </span>

                          <span 
                            className={`${shellStyles.statusPill} ${stats.isSoldOut ? shellStyles.statusPillNeutral : shellStyles.statusPillGreen} ${styles.cardStatusPill}`}
                          >
                            {stats.isSoldOut 
                              ? (isAr ? 'مكتمل البيع' : 'Sold Out') 
                              : (isAr ? 'متاح للتعاقد' : 'Available')}
                          </span>
                        </div>

                        {/* Location */}
                        <div className={styles.cardLocation}>
                          <MapPin size={11} className={styles.cardLocationIcon} />
                          <span className={styles.cardLocationText}>
                            {p.location || (isAr ? 'موقع متميز' : 'Prime Location')}
                          </span>
                        </div>

                        {/* Price & Units Specs */}
                        <div className={styles.cardFooter}>
                          <span className={styles.cardPrice}>
                            {formattedPrice} <span className={styles.currencyText}>{isAr ? 'ج.م' : 'EGP'}</span>
                          </span>

                          <span className={styles.cardUnits}>
                            {stats.available} {isAr ? 'متاح' : 'avail'} / {stats.total} {isAr ? 'إجمالي' : 'units'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button: Filter and Close Modal */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProjectAndFilter(p.id);
                      }}
                      className={`${styles.filterBtn} ${isSelected ? styles.filterBtnSelected : ''}`}
                    >
                      <span>{isAr ? 'تحديد المشروع والتصفية' : 'Select Project & Filter'}</span>
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>
                <Building2 size={28} className={styles.emptyIcon} />
                <span className={styles.emptyTitle}>
                  {isAr ? 'لا توجد مشروعات مطابقة للبحث' : 'No properties matched'}
                </span>
                <span className={styles.emptySubtitle}>
                  {isAr ? 'يرجى تغيير كلمة البحث' : 'Try a different search query'}
                </span>
              </div>
            )}
          </div>
        </aside>

        {/* ─── REAL LEAFLET MAP VIEWPORT ─── */}
        <div className={styles.mapViewport}>
          {/* Map Target Container */}
          <div
            ref={mapContainerRef}
            id="erp-leaflet-map-container"
            className={styles.leafletContainer}
          />

          {/* Floating Map Controls in Crisp White Pills */}
          <div className="erp-map-controls-bar">
            {/* Zoom & Reset Pill */}
            <div className="erp-map-ctrl-pill">
              <button
                type="button"
                className="erp-map-ctrl-btn"
                onClick={handleZoomIn}
                title={isAr ? 'تكبير الخريطة' : 'Zoom In'}
              >
                <Plus size={15} />
              </button>
              <div className="erp-map-ctrl-divider" />
              <button
                type="button"
                className="erp-map-ctrl-btn"
                onClick={handleZoomOut}
                title={isAr ? 'تصغير الخريطة' : 'Zoom Out'}
              >
                <Minus size={15} />
              </button>
              <div className="erp-map-ctrl-divider" />
              <button
                type="button"
                className="erp-map-ctrl-btn"
                onClick={handleResetCenter}
                title={isAr ? 'إعادة ضبط المركز' : 'Reset Center'}
              >
                <Compass size={15} />
              </button>
            </div>

            {/* Satellite / Street Mode Pill */}
            <button
              type="button"
              className="erp-map-mode-pill"
              onClick={() => setIsSatelliteMode(prev => !prev)}
            >
              {isSatelliteMode ? (
                <>
                  <Layers size={14} color="var(--erp-accent, #2563eb)" />
                  <span>{isAr ? 'خريطة الشوارع' : 'Street Map'}</span>
                </>
              ) : (
                <>
                  <Globe size={14} color="var(--erp-accent, #2563eb)" />
                  <span>{isAr ? 'الأقمار الصناعية' : 'Satellite'}</span>
                </>
              )}
            </button>
          </div>

          {/* ─── FLOATING SELECTED PROPERTY PREVIEW CARD ─── */}
          {selectedProperty && (
            <div className={styles.previewCard}>
              {/* Header with Title & Dismiss Button */}
              <div className={styles.previewHeader}>
                <div className={styles.previewHeaderLeft}>
                  <div className={styles.previewThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getCuratedProjectImage(selectedProperty, properties.indexOf(selectedProperty))}
                      alt={selectedProperty.title_ar || selectedProperty.title_en}
                      className={styles.previewThumbImg}
                    />
                  </div>

                  <div className={styles.previewInfo}>
                    <h4 className={styles.previewTitle}>
                      {isAr ? selectedProperty.title_ar : selectedProperty.title_en}
                    </h4>

                    <div className={styles.previewLocation}>
                      <MapPin size={11} className={styles.previewLocationIcon} />
                      <span className={styles.previewLocationText}>
                        {selectedProperty.location || (isAr ? 'موقع متميز' : 'Prime Location')}
                      </span>
                    </div>

                    <div className={styles.previewPrice}>
                      {(selectedProperty.price_egp || 0).toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPropertyId(null)}
                  title={isAr ? 'إغلاق المعاينة' : 'Dismiss Preview'}
                  className={styles.previewCloseBtn}
                >
                  <X size={12} />
                </button>
              </div>

              {/* Action Button: Filter Table */}
              <button
                type="button"
                onClick={() => onSelectProjectAndFilter(selectedProperty.id)}
                className={`${shellStyles.btnPrimary} ${styles.previewFilterBtn}`}
              >
                <span>{isAr ? 'تحديد المشروع وتصفية الجدول' : 'Select Project & Filter Table'}</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </ZFModalShell>
  );
};

export default ERPPortfolioMapModal;
