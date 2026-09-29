'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  Filter, 
  Search, 
  PieChart as PieChartIcon, 
  Building2, 
  Map as MapIcon, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  RotateCcw,
  SlidersHorizontal,
  Plus,
  Zap,
  X
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { FlatInventoryUnit } from '@/lib/erp/propertiesPortfolioCalculations';
import { ZFWorkstationSideWidgets, ZFWidgetCard } from '../../common/ZFWorkstationSideWidgets';
import { ERPApexChart } from '../../charts/ERPApexChart';
import { createCachedTileLayer } from '@/lib/mapCache';
import styles from '../PropertiesPortfolioView.module.css';
import shellStyles from '../../ZFWorkstationShell.module.css';

let L: any = null;
if (typeof window !== 'undefined') {
  try {
    L = require('leaflet');
  } catch {
    // SSR safe
  }
}

export interface PropertiesSideWidgetsProps {
  properties: Property[];
  allInventoryUnits: FlatInventoryUnit[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filterUnitType: string;
  onFilterUnitTypeChange: (type: string) => void;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  filterPropertyId: string;
  onFilterPropertyIdChange: (id: string) => void;
  filterCity: string;
  onFilterCityChange: (city: string) => void;
  uniqueCities: string[];
  onResetAllFilters: () => void;
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onOpenFullMap: () => void;
  onOpenNewContract?: () => void;
  isAr?: boolean;
  filterCompletionStatus?: string;
  onFilterCompletionStatusChange?: (status: string) => void;
  minPrice?: string;
  onMinPriceChange?: (val: string) => void;
  maxPrice?: string;
  onMaxPriceChange?: (val: string) => void;
  onApplyFilters?: () => void;
}

export const getProjectThumbnail = (property: Property, index: number = 0): string => {
  if (property.property_images && property.property_images.length > 0 && property.property_images[0]?.url) {
    const rawUrl = property.property_images[0].url;
    if (rawUrl.startsWith('http') && !rawUrl.includes('supabase.co/storage/v1/object/public/properties/broken')) {
      return rawUrl;
    }
  }

  const title = ((property.title_ar || '') + ' ' + (property.title_en || '')).toLowerCase();
  if (title.includes('جونة') || title.includes('لاجون') || title.includes('gouna') || title.includes('lagoon')) {
    return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80';
  }
  if (title.includes('ساحل') || title.includes('ووترز') || title.includes('coast') || title.includes('waters')) {
    return 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80';
  }
  if (title.includes('سخنة') || title.includes('جبل') || title.includes('sokhna')) {
    return 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=400&q=80';
  }

  const buildingImages = [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80',
  ];
  return buildingImages[index % buildingImages.length];
};

export const PropertiesSideWidgets: React.FC<PropertiesSideWidgetsProps> = ({
  properties,
  allInventoryUnits,
  searchQuery,
  onSearchQueryChange,
  filterUnitType,
  onFilterUnitTypeChange,
  filterStatus,
  onFilterStatusChange,
  filterPropertyId,
  onFilterPropertyIdChange,
  filterCity,
  onFilterCityChange,
  uniqueCities,
  onResetAllFilters,
  selectedProjectId,
  onSelectProject,
  onOpenFullMap,
  onOpenNewContract,
  isAr = true,
  filterCompletionStatus = 'all',
  onFilterCompletionStatusChange,
  minPrice = '',
  onMinPriceChange,
  maxPrice = '',
  onMaxPriceChange,
  onApplyFilters,
}) => {
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !miniMapContainerRef.current) return;
    if (miniMapInstanceRef.current) return;

    try {
      if (L && miniMapContainerRef.current) {
        const map = L.map(miniMapContainerRef.current, {
          center: [29.6, 31.3],
          zoom: 6,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          dragging: true,
        });

        const tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
        const tileOpts = {
          maxZoom: 19,
          attribution: '&copy; Esri',
        };
        try {
          const cached = createCachedTileLayer(tileUrl, tileOpts);
          if (cached) {
            cached.addTo(map);
          } else {
            L.tileLayer(tileUrl, tileOpts).addTo(map);
          }
        } catch {
          L.tileLayer(tileUrl, tileOpts).addTo(map);
        }

        properties.forEach((p, idx) => {
          let lat = p.latitude;
          let lng = p.longitude;
          if (!lat || !lng) {
            const loc = (p.location || '').toLowerCase();
            if (loc.includes('زايد') || loc.includes('zayed')) { lat = 30.0520; lng = 30.9830; }
            else if (loc.includes('قاهرة') || loc.includes('cairo') || loc.includes('التجمع')) { lat = 30.0131; lng = 31.4913; }
            else if (loc.includes('جونة') || loc.includes('gouna')) { lat = 27.3949; lng = 33.6765; }
            else if (loc.includes('ساحل') || loc.includes('coast')) { lat = 30.9333; lng = 28.7500; }
            else if (loc.includes('سخنة') || loc.includes('sokhna')) { lat = 29.6010; lng = 32.3380; }
            else { lat = 29.8 + ((idx % 4) * 0.2); lng = 31.0 + ((idx % 3) * 0.3); }
          }

          const isSelected = selectedProjectId === p.id;
          const pinColor = isSelected ? '#1d4ed8' : '#2563eb';
          const pinSize = isSelected ? 16 : 12;

          const customIcon = L.divIcon({
            html: `<div style="
              width: ${pinSize}px;
              height: ${pinSize}px;
              border-radius: 50%;
              background: ${pinColor};
              border: 2px solid #ffffff;
              box-shadow: 0 0 0 2px ${isSelected ? '#2563eb' : 'rgba(37,99,235,0.4)'}, 0 2px 5px rgba(0,0,0,0.3);
              cursor: pointer;
            "></div>`,
            className: 'mini-map-pin',
            iconSize: [pinSize, pinSize],
            iconAnchor: [pinSize / 2, pinSize / 2],
          });

          const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
          marker.on('click', () => {
            onSelectProject(selectedProjectId === p.id ? null : p.id);
          });
        });

        miniMapInstanceRef.current = map;

        setTimeout(() => {
          map.invalidateSize();
        }, 250);
      }
    } catch {
      // Leaflet fallback
    }

    return () => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
    };
  }, [properties, selectedProjectId, onSelectProject]);

  const isAnyFilterActive = Boolean(
    searchQuery ||
    filterUnitType !== 'all' ||
    filterPropertyId !== 'all' ||
    filterStatus !== 'all' ||
    (filterCompletionStatus && filterCompletionStatus !== 'all') ||
    minPrice ||
    maxPrice ||
    filterCity !== 'all' ||
    selectedProjectId !== null
  );

  // Distribution Pie Data
  const distributionData = useMemo(() => {
    let residentialCount = 0;
    let villasCount = 0;
    let duplexRoofCount = 0;
    let commercialCount = 0;
    let otherCount = 0;

    allInventoryUnits.forEach(u => {
      const t = (u.unitType || '').toLowerCase();
      if (t.includes('فيلا') || t.includes('villa') || t.includes('قصر')) {
        villasCount++;
      } else if (t.includes('دوبلكس') || t.includes('بنتهاوس') || t.includes('رووف') || t.includes('roof')) {
        duplexRoofCount++;
      } else if (t.includes('مكتب') || t.includes('تجاري') || t.includes('إداري') || t.includes('office')) {
        commercialCount++;
      } else if (t.includes('شقة') || t.includes('apartment')) {
        residentialCount++;
      } else {
        otherCount++;
      }
    });

    const total = allInventoryUnits.length || 1;
    const rawCategories = [
      { name: isAr ? 'شقق سكنية' : 'Apartments', count: residentialCount, color: '#2563eb' },
      { name: isAr ? 'فلل وقصور' : 'Villas', count: villasCount, color: '#10b981' },
      { name: isAr ? 'دوبلكس وبنتهاوس' : 'Duplex/Roof', count: duplexRoofCount, color: '#f59e0b' },
      { name: isAr ? 'تجاري وإداري' : 'Commercial', count: commercialCount, color: '#8b5cf6' },
      { name: isAr ? 'وحدات أخرى' : 'Others', count: otherCount, color: '#64748b' },
    ];

    const activeItems = rawCategories
      .filter(item => item.count > 0)
      .map(item => ({
        ...item,
        pct: Math.round((item.count / total) * 100),
      }));

    const series = activeItems.map(item => item.count);
    const labels = activeItems.map(item => item.name);
    const colors = activeItems.map(item => item.color);

    return { series, labels, colors, items: activeItems };
  }, [allInventoryUnits, isAr]);

  // Geographic coordinates projection helper for Egypt locations
  const getProjectCoordinates = useCallback((p: Property, idx: number): { cx: number; cy: number; locLabel: string } => {
    let lat = p.latitude;
    let lng = p.longitude;

    if (!lat || !lng) {
      const loc = (p.location || '').toLowerCase();
      if (loc.includes('زايد') || loc.includes('zayed')) {
        lat = 30.0520; lng = 30.9830;
      } else if (loc.includes('قاهرة') || loc.includes('cairo') || loc.includes('sodic') || loc.includes('التجمع')) {
        lat = 30.0131; lng = 31.4913;
      } else if (loc.includes('ساحل') || loc.includes('hacienda') || loc.includes('coast')) {
        lat = 30.9333; lng = 28.7500;
      } else if (loc.includes('جونة') || loc.includes('gouna')) {
        lat = 27.3949; lng = 33.6765;
      } else if (loc.includes('سخنة') || loc.includes('sokhna') || loc.includes('galala')) {
        lat = 29.6010; lng = 32.3380;
      } else if (loc.includes('مدينتي') || loc.includes('madinaty')) {
        lat = 30.1250; lng = 31.6250;
      } else if (loc.includes('قمح') || loc.includes('minya') || loc.includes('شرقية') || loc.includes('الزقازيق')) {
        lat = 30.5160; lng = 31.3480;
      } else {
        lat = 29.8 + ((idx % 5) * 0.25);
        lng = 31.0 + ((idx % 4) * 0.35);
      }
    }

    // Bounding Box Egypt: Longitude 28.0°E to 35.0°E, Latitude 26.0°N to 32.0°N
    const xPct = Math.max(8, Math.min(92, ((lng - 28.0) / (35.0 - 28.0)) * 100));
    const yPct = Math.max(10, Math.min(88, (1 - (lat - 26.0) / (32.0 - 26.0)) * 100));
    const cx = (xPct / 100) * 320;
    const cy = (yPct / 100) * 180;

    return { cx, cy, locLabel: p.location || '' };
  }, []);

  return (
    <ZFWorkstationSideWidgets
      title={isAr ? 'أدوات وفلاتر المحفظة العقارية' : 'Portfolio Controls & Filters'}
      icon={<SlidersHorizontal size={16} />}
      badge={isAr ? `${allInventoryUnits.length} وحدة` : `${allInventoryUnits.length} units`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
        
        {/* ─── WIDGET 0: QUICK ACTIONS ─── */}
        {onOpenNewContract && (
          <ZFWidgetCard
            id="properties-quick-actions"
            title={isAr ? 'الإجراءات السريعة للمحفظة' : 'Quick Actions'}
            icon={<Zap size={14} />}
            isAr={isAr}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.1rem 0' }}>
              <button
                type="button"
                onClick={onOpenNewContract}
                className={shellStyles.btnPrimary}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)',
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                <span>{isAr ? 'تحرير عقد بيع جديد' : 'New Contract'}</span>
              </button>
            </div>
          </ZFWidgetCard>
        )}

        {/* ─── WIDGET 1: ADVANCED SEARCH FILTER CARD (REDESIGNED) ─── */}
        <ZFWidgetCard
          id="properties-advanced-search"
          title={isAr ? 'البحث والتصفية المتقدمة' : 'Advanced Search & Filter'}
          icon={<Filter size={14} />}
          isAr={isAr}
          headerAction={
            isAnyFilterActive ? (
              <button
                type="button"
                onClick={onResetAllFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--erp-accent, #2563eb)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <RotateCcw size={11} />
                <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            ) : undefined
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.1rem 0' }}>
            {/* 1. Search Query Input with Squircle Icon and Clear Button */}
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                [isAr ? 'right' : 'left']: '0.45rem',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'var(--erp-accent-soft, #eff6ff)',
                color: 'var(--erp-accent, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <Search size={12} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder={isAr ? 'ابحث باسم المشروع أو رقم الوحدة...' : 'Search project or unit #...'}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  border: '1px solid var(--erp-border, #cbd5e1)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.65rem',
                  paddingInlineStart: '2.2rem',
                  paddingInlineEnd: searchQuery ? '1.8rem' : '0.65rem',
                  fontSize: '0.78rem',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchQueryChange('')}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    [isAr ? 'left' : 'right']: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                  title={isAr ? 'مسح البحث' : 'Clear search'}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* 2. Sale Status Segmented Toggle Pills */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                {isAr ? 'حالة البيع والتعاقد:' : 'Sales Status:'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem', background: '#f8fafc', padding: '0.2rem', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
                {[
                  { key: 'all', labelAr: 'الكل', labelEn: 'All' },
                  { key: 'available', labelAr: 'متاح', labelEn: 'Avail.' },
                  { key: 'reserved', labelAr: 'محجوز', labelEn: 'Rsrv.' },
                  { key: 'contracted', labelAr: 'مباع', labelEn: 'Sold' },
                ].map(item => {
                  const isActive = filterStatus === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onFilterStatusChange(item.key)}
                      style={{
                        padding: '0.3rem 0.2rem',
                        borderRadius: '5px',
                        border: 'none',
                        background: isActive ? 'var(--erp-accent, #2563eb)' : 'transparent',
                        color: isActive ? '#ffffff' : '#475569',
                        fontSize: '0.69rem',
                        fontWeight: isActive ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isAr ? item.labelAr : item.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Completion Status Segmented Toggle Pills */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                {isAr ? 'حالة الإنجاز والإنشاء:' : 'Completion Status:'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.25rem', background: '#f8fafc', padding: '0.2rem', borderRadius: '7px', border: '1px solid #e2e8f0' }}>
                {[
                  { key: 'all', labelAr: 'كافة الحالات', labelEn: 'All' },
                  { key: 'ready', labelAr: 'جاهز للتسليم', labelEn: 'Ready' },
                  { key: 'off_plan', labelAr: 'قيد الإنشاء', labelEn: 'Off-Plan' },
                ].map(item => {
                  const isActive = (filterCompletionStatus || 'all') === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onFilterCompletionStatusChange && onFilterCompletionStatusChange(item.key)}
                      style={{
                        padding: '0.3rem 0.2rem',
                        borderRadius: '5px',
                        border: 'none',
                        background: isActive ? 'var(--erp-accent, #2563eb)' : 'transparent',
                        color: isActive ? '#ffffff' : '#475569',
                        fontSize: '0.68rem',
                        fontWeight: isActive ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isAr ? item.labelAr : item.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Dropdowns Grid: Unit Type & City */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
                  {isAr ? 'نوع الوحدة:' : 'Unit Type:'}
                </label>
                <select
                  value={filterUnitType}
                  onChange={(e) => onFilterUnitTypeChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--erp-border, #cbd5e1)',
                    borderRadius: '7px',
                    padding: '0.38rem 0.45rem',
                    fontSize: '0.73rem',
                    color: '#0f172a',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">{isAr ? 'الكل' : 'All'}</option>
                  <option value="apartment">{isAr ? 'شقة سكنية' : 'Apartment'}</option>
                  <option value="villa">{isAr ? 'فيلا فاخرة' : 'Villa'}</option>
                  <option value="duplex">{isAr ? 'دوبلكس' : 'Duplex'}</option>
                  <option value="penthouse">{isAr ? 'بنتهاوس رووف' : 'Penthouse'}</option>
                  <option value="chalet">{isAr ? 'شاليه ساحلي' : 'Chalet'}</option>
                  <option value="office">{isAr ? 'مكتب إداري' : 'Office'}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
                  {isAr ? 'المدينة / الموقع:' : 'City:'}
                </label>
                <select
                  value={filterCity}
                  onChange={(e) => onFilterCityChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--erp-border, #cbd5e1)',
                    borderRadius: '7px',
                    padding: '0.38rem 0.45rem',
                    fontSize: '0.73rem',
                    color: '#0f172a',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">{isAr ? 'كافة المدن' : 'All Cities'}</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Project Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
                {isAr ? 'تصفية المشروع:' : 'Select Project:'}
              </label>
              <select
                value={filterPropertyId}
                onChange={(e) => onFilterPropertyIdChange(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid var(--erp-border, #cbd5e1)',
                  borderRadius: '7px',
                  padding: '0.38rem 0.45rem',
                  fontSize: '0.73rem',
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">{isAr ? 'كافة المشروعات والأصول' : 'All Properties'}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{isAr ? p.title_ar : p.title_en}</option>
                ))}
              </select>
            </div>

            {/* 6. Price Range Inputs (Min & Max EGP) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                {isAr ? 'نطاق السعر (ج.م):' : 'Price Range (EGP):'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <input
                  type="number"
                  placeholder={isAr ? 'الحد الأدنى' : 'Min Price'}
                  value={minPrice}
                  onChange={(e) => onMinPriceChange && onMinPriceChange(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    border: '1px solid var(--erp-border, #cbd5e1)',
                    borderRadius: '7px',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.73rem',
                    color: '#0f172a',
                    outline: 'none',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
                <input
                  type="number"
                  placeholder={isAr ? 'الحد الأقصى' : 'Max Price'}
                  value={maxPrice}
                  onChange={(e) => onMaxPriceChange && onMaxPriceChange(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    border: '1px solid var(--erp-border, #cbd5e1)',
                    borderRadius: '7px',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.73rem',
                    color: '#0f172a',
                    outline: 'none',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { labelAr: '< 3M', min: '', max: '3000000' },
                  { labelAr: '3M - 6M', min: '3000000', max: '6000000' },
                  { labelAr: '6M - 10M', min: '6000000', max: '10000000' },
                  { labelAr: '> 10M', min: '10000000', max: '' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (onMinPriceChange) onMinPriceChange(chip.min);
                      if (onMaxPriceChange) onMaxPriceChange(chip.max);
                    }}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '5px',
                      padding: '0.15rem 0.45rem',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    {chip.labelAr}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. Action Buttons (Apply & Clear) */}
            <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.2rem' }}>
              <button
                type="button"
                onClick={onApplyFilters || (() => {})}
                className={shellStyles.btnPrimary}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Filter size={13} />
                <span>{isAr ? 'تطبيق التصفية اللحظية' : 'Apply Filters'}</span>
              </button>
              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={onResetAllFilters}
                  className={shellStyles.btnSecondary}
                  style={{
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title={isAr ? 'مسح كافة الفلاتر' : 'Reset All'}
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>

          </div>
        </ZFWidgetCard>

        {/* ─── WIDGET 3: PROPERTY DISTRIBUTION DONUT CHART ─── */}
        <ZFWidgetCard
          id="properties-distribution"
          title={isAr ? 'توزيع الوحدات بالمحفظة' : 'Portfolio Distribution'}
          icon={<PieChartIcon size={14} />}
          badge={
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              {allInventoryUnits.length} {isAr ? 'وحدة' : 'units'}
            </span>
          }
          isAr={isAr}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Donut Chart: Height 215px, Size 76%, CustomScale 0.98, Zero-Overlap Typography */}
            <div style={{ height: '215px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {distributionData.series.length > 0 ? (
                <ERPApexChart
                  type="donut"
                  height={215}
                  series={distributionData.series}
                  options={{
                    chart: {
                      sparkline: { enabled: false },
                      animations: { enabled: true, speed: 400 },
                    },
                    labels: distributionData.labels,
                    colors: distributionData.colors,
                    plotOptions: {
                      pie: {
                        customScale: 0.98,
                        donut: {
                          size: '76%',
                          labels: {
                            show: true,
                            name: {
                              show: true,
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#64748b',
                              offsetY: -6,
                            },
                            value: {
                              show: true,
                              fontSize: '20px',
                              fontWeight: 800,
                              color: '#0f172a',
                              offsetY: 6,
                              formatter: (val) => `${val}`,
                            },
                            total: {
                              show: true,
                              label: isAr ? 'إجمالي الوحدات' : 'Total Units',
                              color: '#64748b',
                              fontSize: '11px',
                              fontWeight: 600,
                              formatter: () => `${allInventoryUnits.length}`,
                            },
                          },
                        },
                      },
                    },
                    dataLabels: { enabled: false },
                    legend: { show: false },
                    stroke: { width: 2, colors: ['#ffffff'] },
                    tooltip: {
                      y: {
                        formatter: (val) => `${val} ${isAr ? 'وحدة' : 'units'}`,
                      },
                    },
                  }}
                  isAr={isAr}
                />
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {isAr ? 'لا توجد بيانات توزيع' : 'No distribution data'}
                </div>
              )}
            </div>

            {/* Side / Bottom Legend with counts and percentages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
              {distributionData.items.map((item) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ color: '#334155', fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: '#64748b' }}>({item.count})</span>
                    <strong style={{ color: '#0f172a' }}>{item.pct}%</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ZFWidgetCard>

        {/* ─── WIDGET 4: INTERACTIVE REAL MINI MAP ─── */}
        <ZFWidgetCard
          id="properties-mini-map"
          title={isAr ? 'المشاريع على الخريطة' : 'Projects on Map'}
          icon={<MapIcon size={14} />}
          badge={
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              {properties.length} {isAr ? 'موقع' : 'sites'}
            </span>
          }
          isAr={isAr}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {/* Interactive Real Leaflet Mini Map Container */}
            <div 
              ref={miniMapContainerRef}
              style={{
                width: '100%',
                height: '160px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--erp-border, #cbd5e1)',
                position: 'relative',
                background: '#f8fafc',
                zIndex: 1,
              }}
            />

            {/* View Full Map Trigger */}
            <button
              type="button"
              onClick={onOpenFullMap}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.45rem',
                borderRadius: '7px',
                background: '#ffffff',
                border: '1px solid var(--erp-border, #cbd5e1)',
                color: 'var(--erp-accent, #2563eb)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Maximize2 size={13} />
              <span>{isAr ? 'عرض الخريطة الكاملة' : 'View Full Map'}</span>
            </button>
          </div>
        </ZFWidgetCard>

      </div>
    </ZFWorkstationSideWidgets>
  );
};

export default PropertiesSideWidgets;
