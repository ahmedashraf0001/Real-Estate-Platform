/**
 * Zakaria Farid Real Estate ERP — Portfolio Map Modal (FIN-OS v2 Overhaul)
 * Authoritative Light-Mode Real Interactive Cartography Modal.
 * Integrates Leaflet with CartoDB Voyager light tiles, Satellite toggle,
 * interactive markers with accent beacons, floating property previews,
 * and property cards with prominent image thumbnails in the sidebar.
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Filter,
  CheckCircle2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { Property } from '@/lib/supabase/types';
import { ERPContract } from '@/lib/erp/types';
import { ZFModalShell } from '../../common/ZFModalShell';
import { 
  getPropertyCoordinates, 
  getPropertyStats, 
  getCuratedProjectImage 
} from '@/lib/erp/propertiesPortfolioCalculations';
import { getPropertyTypeLabel } from '../PropertiesPortfolioView';
import { createCachedTileLayer } from '@/lib/mapCache';
import shellStyles from '../../ZFWorkstationShell.module.css';

export { getPropertyCoordinates, getPropertyStats };

let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSatelliteMode, setIsSatelliteMode] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  // Sync selectedPropertyId if prop changes
  useEffect(() => {
    if (selectedProjectId) {
      setSelectedPropertyId(selectedProjectId);
    }
  }, [selectedProjectId]);

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

    const Leaflet = L || require('leaflet');

    // Clean up if already initialized
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {
        // Safe ignore
      }
      mapInstanceRef.current = null;
    }

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
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
    const loadTiles = (url: string, opts: any) => {
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
        attribution: '&copy; Esri, HERE, Garmin, USGS, NGA'
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
    const Leaflet = L || require('leaflet');

    if (tileLayerRef.current) {
      try {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      } catch {
        // ignore
      }
    }

    const loadTiles = (url: string, opts: any) => {
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
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>{isAr ? 'خريطة مواقع المشروعات والمحفظة العقارية' : 'Projects & Portfolio Cartography'}</span>
          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`} style={{ fontSize: '0.68rem' }}>
            {properties.length} {isAr ? 'موقع نشط' : 'active sites'}
          </span>
        </div>
      }
      subtitle={
        isAr 
          ? 'المسح الجغرافي التفاعلي لمواقع المشروعات وتوزيع الوحدات المتاحة والمعروضة بالمحفظة' 
          : 'Interactive geographical survey of development sites and portfolio inventory distribution'
      }
      icon={<MapPin size={16} />}
      headerExtra={
        <button
          type="button"
          onClick={() => setIsMaximized(prev => !prev)}
          title={isMaximized ? (isAr ? 'استعادة الحجم' : 'Restore Size') : (isAr ? 'ملء الشاشة' : 'Maximize')}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      }
      maxWidth={isMaximized ? '98vw' : '1240px'}
      maxHeight={isMaximized ? '96vh' : '88vh'}
      bodyStyle={{
        padding: 0,
        height: isMaximized ? 'calc(96vh - 65px)' : 'calc(88vh - 65px)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
      }}
      isAr={isAr}
    >
      {/* ─── SCOPED LEAFLET LIGHT THEME CSS ─── */}
      <style>{`
        .custom-erp-leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }

        .erp-map-pin {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transform: translateY(-8px);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          z-index: 100;
        }

        .erp-map-pin:hover,
        .erp-map-pin.active {
          transform: translateY(-8px) scale(1.15);
          z-index: 9999 !important;
        }

        .erp-pin-beacon {
          position: relative;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .erp-pin-core {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--erp-accent, #2563eb);
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25), 0 0 10px rgba(37, 99, 235, 0.5);
          z-index: 2;
          transition: all 0.2s ease;
        }

        .erp-map-pin:hover .erp-pin-core,
        .erp-map-pin.active .erp-pin-core {
          background: #1d4ed8;
          border-color: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35), 0 0 16px rgba(37, 99, 235, 0.85);
          transform: scale(1.25);
        }

        .erp-pin-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.2);
          border: 1.5px solid rgba(37, 99, 235, 0.6);
          animation: erpPinPulse 2.4s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }

        .erp-map-pin.active .erp-pin-pulse {
          animation: erpPinPulseActive 1.4s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }

        @keyframes erpPinPulse {
          0% { transform: scale(0.8); opacity: 0.9; }
          70% { transform: scale(2.0); opacity: 0; }
          100% { transform: scale(2.0); opacity: 0; }
        }

        @keyframes erpPinPulseActive {
          0% { transform: scale(0.8); opacity: 1; }
          70% { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }

        .erp-pin-label {
          margin-top: 3px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 9999px;
          padding: 2px 8px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
          white-space: nowrap;
          pointer-events: none;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .erp-pin-label span {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }

        .erp-map-pin:hover .erp-pin-label,
        .erp-map-pin.active .erp-pin-label {
          border-color: var(--erp-accent, #2563eb);
          box-shadow: 0 6px 18px rgba(37, 99, 235, 0.25);
          transform: translateY(1px);
        }

        /* Map Controls Floating Strip */
        .erp-map-controls-bar {
          position: absolute;
          top: 1rem;
          inset-inline-start: 1rem;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          pointer-events: auto;
        }

        .erp-map-ctrl-pill {
          background: #ffffff !important;
          border: 1px solid #cbd5e1;
          border-radius: 9999px;
          padding: 3px 6px;
          display: flex;
          align-items: center;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        }

        .erp-map-ctrl-btn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .erp-map-ctrl-btn:hover {
          background: #f1f5f9;
          color: var(--erp-accent, #2563eb);
        }

        .erp-map-ctrl-divider {
          width: 1px;
          height: 16px;
          background: #e2e8f0;
          margin: 0 3px;
        }

        .erp-map-mode-pill {
          background: #ffffff !important;
          border: 1px solid #cbd5e1;
          border-radius: 9999px;
          padding: 0.4rem 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.45rem;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
          font-size: 0.76rem;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .erp-map-mode-pill:hover {
          background: #f8fafc !important;
          border-color: var(--erp-accent, #2563eb);
          color: var(--erp-accent, #2563eb);
        }
      `}</style>

      {/* ─── MODAL SPLIT CONTAINER: SIDEBAR + MAP VIEWPORT ─── */}
      <div 
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ─── SIDEBAR: FILTER & PROPERTY CARDS WITH IMAGES ─── */}
        <aside
          style={{
            width: '360px',
            flexShrink: 0,
            background: '#ffffff',
            borderInlineEnd: '1px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          {/* Top Search & Filter Bar */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid #f1f5f9',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                {isAr ? 'دليل المشروعات العقارية' : 'Properties Directory'}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                {filteredProperties.length} {isAr ? 'صرح ممثل' : 'curated sites'}
              </span>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [isAr ? 'right' : 'left']: '0.65rem',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث بالاسم، المدينة، السعر...' : 'Filter by name, city, price...'}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.45rem 0.65rem',
                  paddingInlineStart: '2rem',
                  paddingInlineEnd: searchQuery ? '2rem' : '0.65rem',
                  fontSize: '0.78rem',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    [isAr ? 'left' : 'right']: '0.65rem',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Property Cards List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              scrollbarWidth: 'thin',
              background: '#f8fafc',
            }}
          >
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
                    style={{
                      background: '#ffffff',
                      border: isSelected 
                        ? '1.5px solid var(--erp-accent, #2563eb)' 
                        : '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '0.65rem',
                      cursor: 'pointer',
                      boxShadow: isSelected 
                        ? '0 4px 12px rgba(37, 99, 235, 0.12)' 
                        : '0 1px 3px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                      {/* Prominent Image Thumbnail (User command: make cards have images) */}
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '1px solid #cbd5e1',
                          background: '#e2e8f0',
                          position: 'relative',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbUrl}
                          alt={p.title_ar || p.title_en}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                          onError={(e) => {
                            const fallback = getCuratedProjectImage(p, idx + 1);
                            if (e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />
                      </div>

                      {/* Card Content */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
                        {/* Title & Status Pill */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                          <span
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: 800,
                              color: isSelected ? 'var(--erp-accent, #2563eb)' : '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={p.title_ar || p.title_en}
                          >
                            {isAr ? p.title_ar : p.title_en}
                          </span>

                          <span 
                            className={`${shellStyles.statusPill} ${stats.isSoldOut ? shellStyles.statusPillNeutral : shellStyles.statusPillGreen}`}
                            style={{ fontSize: '0.62rem', flexShrink: 0, padding: '0.12rem 0.45rem' }}
                          >
                            {stats.isSoldOut 
                              ? (isAr ? 'مكتمل البيع' : 'Sold Out') 
                              : (isAr ? 'متاح للتعاقد' : 'Available')}
                          </span>
                        </div>

                        {/* Location */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#64748b' }}>
                          <MapPin size={11} color="var(--erp-accent, #2563eb)" style={{ flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.location || (isAr ? 'موقع متميز' : 'Prime Location')}
                          </span>
                        </div>

                        {/* Price & Units Specs */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.1rem' }}>
                          <span
                            style={{
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              color: 'var(--erp-accent, #2563eb)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formattedPrice} <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{isAr ? 'ج.م' : 'EGP'}</span>
                          </span>

                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
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
                      style={{
                        width: '100%',
                        marginTop: '0.5rem',
                        padding: '0.38rem 0.65rem',
                        borderRadius: '6px',
                        background: isSelected ? 'var(--erp-accent, #2563eb)' : '#f8fafc',
                        color: isSelected ? '#ffffff' : 'var(--erp-accent, #2563eb)',
                        border: '1px solid var(--erp-accent, #2563eb)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{isAr ? 'تحديد المشروع والتصفية' : 'Select Project & Filter'}</span>
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                }}
              >
                <Building2 size={28} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                  {isAr ? 'لا توجد مشروعات مطابقة للبحث' : 'No properties matched'}
                </span>
                <span style={{ display: 'block', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                  {isAr ? 'يرجى تغيير كلمة البحث' : 'Try a different search query'}
                </span>
              </div>
            )}
          </div>
        </aside>

        {/* ─── REAL LEAFLET MAP VIEWPORT ─── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            alignSelf: 'stretch',
            position: 'relative',
            background: '#e2e8f0',
            overflow: 'hidden',
          }}
        >
          {/* Map Target Container */}
          <div
            ref={mapContainerRef}
            id="erp-leaflet-map-container"
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              inset: 0,
              zIndex: 1,
            }}
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
            <div
              style={{
                position: 'absolute',
                bottom: '1.25rem',
                insetInlineStart: '1.25rem',
                zIndex: 1000,
                width: 'min(360px, calc(100% - 2.5rem))',
                background: '#ffffff !important',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '0.85rem',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                animation: 'previewCardIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <style>{`
                @keyframes previewCardIn {
                  from { opacity: 0; transform: translateY(12px) scale(0.97); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
              `}</style>

              {/* Header with Title & Dismiss Button */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: '1px solid #cbd5e1',
                      background: '#f1f5f9',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getCuratedProjectImage(selectedProperty, properties.indexOf(selectedProperty))}
                      alt={selectedProperty.title_ar || selectedProperty.title_en}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {isAr ? selectedProperty.title_ar : selectedProperty.title_en}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                      <MapPin size={11} color="var(--erp-accent, #2563eb)" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedProperty.location || (isAr ? 'موقع متميز' : 'Prime Location')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--erp-accent, #2563eb)', marginTop: '0.2rem', fontVariantNumeric: 'tabular-nums' }}>
                      {(selectedProperty.price_egp || 0).toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPropertyId(null)}
                  title={isAr ? 'إغلاق المعاينة' : 'Dismiss Preview'}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <X size={12} />
                </button>
              </div>

              {/* Action Button: Filter Table */}
              <button
                type="button"
                onClick={() => onSelectProjectAndFilter(selectedProperty.id)}
                className={shellStyles.btnPrimary}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontSize: '0.76rem',
                  padding: '0.45rem',
                }}
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
