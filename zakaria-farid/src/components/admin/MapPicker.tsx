'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { divIcon, LeafletEvent } from 'leaflet';
import { 
  Search, 
  LocateFixed, 
  Loader2, 
  Eye, 
  MapPin, 
  X, 
  Navigation, 
  ExternalLink, 
  Globe, 
  Building2,
  Hospital,
  ShoppingBag,
  Sparkles,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

const sanctumIcon = (label: string) => divIcon({
  html: `
    <div class="sanctum-pin-wrapper">
      <div class="sanctum-beacon-pulse"></div>
      <div class="sanctum-pin-core"></div>
      <div class="sanctum-pin-tag">${label}</div>
    </div>
  `,
  className: 'sanctum-custom-marker',
  iconSize: [220, 50],
  iconAnchor: [110, 25],
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (map && map.getContainer()) {
          map.invalidateSize();
        }
      } catch {}
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

interface MapUpdaterProps {
  center: [number, number];
  zoom?: number;
}

function MapUpdater({ center, zoom = 16 }: MapUpdaterProps) {
  const map = useMap();
  useEffect(() => {
    try {
      if (map && map.getContainer()) {
        map.flyTo(center, zoom, { duration: 1.2 });
      }
    } catch {}
  }, [center, zoom, map]);
  return null;
}

interface MapEventsProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

function MapEvents({ onLocationSelect }: MapEventsProps) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// 2 Clean Modes: Google Maps (Default) and Google Satellite Hybrid
type MapMode = 'google' | 'satellite';

interface QuickDistrict {
  id: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
}

const QUICK_DISTRICTS: QuickDistrict[] = [
  { id: 'mq-downtown', nameEn: 'Downtown / Station', nameAr: 'وسط البلد / المحطة', lat: 30.5180, lng: 31.3521 },
  { id: 'mq-saad-zaghloul', nameEn: 'Saad Zaghloul St', nameAr: 'شارع سعد زغلول', lat: 30.5185, lng: 31.3515 },
  { id: 'mq-corniche', nameEn: 'Corniche (Wagih Abaza)', nameAr: 'الكورنيش (وجيه أباظة)', lat: 30.5160, lng: 31.3480 },
  { id: 'mq-horreya', nameEn: 'El Horreya St', nameAr: 'شارع الحرية', lat: 30.5170, lng: 31.3540 },
  { id: 'mq-hospital', nameEn: 'General Hospital', nameAr: 'مستشفى منيا القمح العام', lat: 30.5220, lng: 31.3580 },
  { id: 'mq-shohada', nameEn: 'El Shohada Square', nameAr: 'ميدان الشهداء', lat: 30.5190, lng: 31.3500 },
  { id: 'mq-sagha', nameEn: 'El Sagha District', nameAr: 'حي الصاغة', lat: 30.5175, lng: 31.3530 },
  { id: 'mq-zagazig-rd', nameEn: 'Zagazig Entrance Rd', nameAr: 'طريق الزقازيق', lat: 30.5260, lng: 31.3650 },
  { id: 'mq-banha-rd', nameEn: 'Banha Entrance Rd', nameAr: 'طريق بنها', lat: 30.5080, lng: 31.3400 },
];

const EGYPT_PRESET_LOCATIONS: Record<string, { lat: number; lng: number; nameAr: string; nameEn: string }> = {
  'منيا القمح': { lat: 30.5180, lng: 31.3521, nameAr: 'مدينة منيا القمح، الشرقية', nameEn: 'Minya El Qamh City, Al Sharqia' },
  'شارع سعد زغلول': { lat: 30.5185, lng: 31.3515, nameAr: 'شارع سعد زغلول، مدينة منيا القمح', nameEn: 'Saad Zaghloul St, Minya El Qamh' },
  'شارع وجيه اباظة': { lat: 30.5160, lng: 31.3480, nameAr: 'شارع وجيه أباظة (الكورنيش)، منيا القمح', nameEn: 'Wagih Abaza St (Corniche), Minya El Qamh' },
  'شارع وجيه أباظة': { lat: 30.5160, lng: 31.3480, nameAr: 'شارع وجيه أباظة (الكورنيش)، منيا القمح', nameEn: 'Wagih Abaza St (Corniche), Minya El Qamh' },
  'الكورنيش': { lat: 30.5160, lng: 31.3480, nameAr: 'كورنيش بحر مويس، منيا القمح', nameEn: 'Corniche Bahr Moweis, Minya El Qamh' },
  'شارع الحرية': { lat: 30.5170, lng: 31.3540, nameAr: 'شارع الحرية، منيا القمح', nameEn: 'El Horreya St, Minya El Qamh' },
  'مستشفى منيا القمح': { lat: 30.5220, lng: 31.3580, nameAr: 'مستشفى منيا القمح المركزي/العام', nameEn: 'Minya El Qamh Central Hospital' },
  'مستشفى العاصمة': { lat: 30.5220, lng: 31.3580, nameAr: 'مستشفى العاصمة، منيا القمح', nameEn: 'Capital Hospital, Minya El Qamh' },
  'ميدان الشهداء': { lat: 30.5190, lng: 31.3500, nameAr: 'ميدان الشهداء (مجلس المدينة)، منيا القمح', nameEn: 'El Shohada Sq (City Council), Minya El Qamh' },
  'حي الصاغة': { lat: 30.5175, lng: 31.3530, nameAr: 'حي الصاغة، منيا القمح', nameEn: 'El Sagha District, Minya El Qamh' },
  'المحطة': { lat: 30.5180, lng: 31.3521, nameAr: 'محطة قطار منيا القمح / وسط البلد', nameEn: 'Minya El Qamh Train Station' },
  'الزقازيق': { lat: 30.5877, lng: 31.5020, nameAr: 'مدينة الزقازيق، الشرقية', nameEn: 'Zagazig City, Al Sharqia' },
  'بلبيس': { lat: 30.4194, lng: 31.5647, nameAr: 'بلبيس، الشرقية', nameEn: 'Belbeis, Al Sharqia' },
  'الشرقية': { lat: 30.5877, lng: 31.5020, nameAr: 'محافظة الشرقية', nameEn: 'Al Sharqia Governorate' },
};

interface SearchResultItem {
  place_id: number | string;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  source?: string;
  rating?: number;
}

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number, lng: number) => void;
  isAr?: boolean;
}

export default function MapPicker({ latitude, longitude, onChange, isAr = false }: MapPickerProps) {
  const [targetCenter, setTargetCenter] = useState<[number, number]>([
    latitude ?? 30.5180, 
    longitude ?? 31.3521
  ]);
  // Default to Google Maps as requested
  const [mapMode, setMapMode] = useState<MapMode>('google');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [searchNotFoundMsg, setSearchNotFoundMsg] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (latitude && longitude) {
      setTargetCenter([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResultsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeSearch = useCallback(async (queryToSearch: string) => {
    const rawQuery = queryToSearch.trim();
    if (!rawQuery) return;

    setIsSearching(true);
    setSearchNotFoundMsg(null);
    setShowResultsDropdown(false);

    try {
      // 1. Direct Coordinates Regex Check (e.g. 30.5180, 31.3521)
      const coordMatch = rawQuery.match(/@?(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/);
      if (coordMatch && !rawQuery.includes('http')) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        if (lat >= 20 && lat <= 33 && lon >= 24 && lon <= 37) {
          setTargetCenter([lat, lon]);
          onChange(lat, lon);
          setIsSearching(false);
          toast.success(isAr ? 'تم تثبيت الإحداثيات مباشرة على الخريطة' : 'Direct coordinates pinned on map');
          return;
        }
      }

      // Check Preset Egyptian shortcuts
      const cleanQ = rawQuery.replace(/[،,]/g, ' ').replace(/\s+/g, ' ').trim();
      const presetMatch = EGYPT_PRESET_LOCATIONS[cleanQ];

      // Call backend geocoding endpoint
      const response = await fetch('/api/admin/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: rawQuery,
          biasLat: targetCenter[0],
          biasLng: targetCenter[1],
        }),
      });

      const data = await response.json();

      if (data.isUrl && data.results && data.results.length > 0) {
        // Instant Pin from Google Maps link
        const item = data.results[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        setTargetCenter([lat, lon]);
        onChange(lat, lon);
        setSearchNotFoundMsg(null);
        toast.success(isAr ? 'تم استخراج الموقع بنجاح من رابط Google Maps' : 'Location resolved from Google Maps link');
        setIsSearching(false);
        return;
      }

      const results: SearchResultItem[] = data.results || [];

      // Append preset location at top if exact match found
      if (presetMatch) {
        const exists = results.some(r => Math.abs(parseFloat(r.lat) - presetMatch.lat) < 0.01);
        if (!exists) {
          results.unshift({
            place_id: `preset-${cleanQ}`,
            lat: String(presetMatch.lat),
            lon: String(presetMatch.lng),
            display_name: isAr ? presetMatch.nameAr : presetMatch.nameEn,
            type: 'district',
            source: 'preset'
          });
        }
      }

      if (results.length > 0) {
        setSearchResults(results);
        setShowResultsDropdown(true);
        setSearchNotFoundMsg(null);

        // Auto fly to top match
        const topLat = parseFloat(results[0].lat);
        const topLon = parseFloat(results[0].lon);
        setTargetCenter([topLat, topLon]);
        onChange(topLat, topLon);

        toast.success(isAr ? `تم تحديد الموقع بدقة: ${results[0].display_name.split('—')[0]}` : `Location pinned: ${results[0].display_name.split('—')[0]}`);
      } else {
        setSearchResults([]);
        setShowResultsDropdown(false);
        const notFoundText = isAr
          ? `لم يتم العثور على "${rawQuery}". يمكنك فتح Google Maps بالزر المرفق ونسخ رابط المكان ولصقه هنا مباشرة.`
          : `No exact matches for "${rawQuery}". You can open Google Maps with the button above and paste the place link here!`;
        setSearchNotFoundMsg(notFoundText);
      }
    } catch (err) {
      console.error('Search error:', err);
      const errText = isAr ? 'تعذر إتمام البحث حالياً، تأكد من اتصال الإنترنت' : 'Could not complete location search';
      setSearchNotFoundMsg(errText);
    } finally {
      setIsSearching(false);
    }
  }, [isAr, onChange, targetCenter]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await executeSearch(searchQuery);
  };

  const handleSelectResult = (item: SearchResultItem) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setTargetCenter([lat, lon]);
    onChange(lat, lon);
    setShowResultsDropdown(false);
    setSearchNotFoundMsg(null);
    setSearchQuery(item.display_name.split(/[—,]/)[0].trim() || item.display_name);
    toast.success(isAr ? 'تم تثبيت الموقع المختار على الخريطة' : 'Location pinned successfully');
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    setSearchNotFoundMsg(null);

    const resolveWithNetwork = async () => {
      try {
        const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          setTargetCenter([data.latitude, data.longitude]);
          onChange(data.latitude, data.longitude);
          toast.info(isAr 
            ? `تم تحديد النطاق التقريبي (${data.city || 'الشرقية / مصر'}).` 
            : `Located near ${data.city || 'Egypt'}.`);
          return true;
        }
      } catch {}

      setTargetCenter([30.5180, 31.3521]);
      onChange(30.5180, 31.3521);
      toast.info(isAr 
        ? 'تم توجيه الخريطة لمدينة منيا القمح. اسحب الدبوس للموقع المحدد.' 
        : 'Centered on Minya El Qamh City. Drag the pin to your property location.');
      return true;
    };

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lon } = position.coords;
          setTargetCenter([lat, lon]);
          onChange(lat, lon);
          setIsLocating(false);
          toast.success(isAr ? 'تم تحديد موقعك الحالي بدقة عبر GPS' : 'Current location pinned via GPS');
        },
        async () => {
          await resolveWithNetwork();
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    } else {
      await resolveWithNetwork();
      setIsLocating(false);
    }
  };

  const handleQuickDistrictJump = (district: QuickDistrict) => {
    setTargetCenter([district.lat, district.lng]);
    onChange(district.lat, district.lng);
    setSearchNotFoundMsg(null);
    setSearchQuery(isAr ? district.nameAr : district.nameEn);
    toast.info(isAr ? `الانتقال إلى: ${district.nameAr}` : `Navigated to: ${district.nameEn}`);
  };

  const getPlaceIcon = (type?: string, source?: string) => {
    if (type?.includes('hospital') || type?.includes('health') || type?.includes('doctor') || type?.includes('clinic')) {
      return <Hospital size={16} className="item-icon-hospital" />;
    }
    if (type?.includes('compound') || type?.includes('subdivision') || type?.includes('real_estate') || type?.includes('residential')) {
      return <Building2 size={16} className="item-icon-compound" />;
    }
    if (type?.includes('shopping') || type?.includes('store') || type?.includes('mall')) {
      return <ShoppingBag size={16} className="item-icon-shopping" />;
    }
    if (source === 'google_places' || source === 'google_maps_url') {
      return <Sparkles size={16} className="item-icon-google" />;
    }
    return <MapPin size={16} className="item-icon-generic" />;
  };

  return (
    <div className="sanctum-map-picker-root">
      {/* Top Search & Location Toolbar */}
      <div className="sanctum-map-toolbar">
        <div className="sanctum-search-wrap" ref={searchContainerRef}>
          <div className="search-input-box">
            <Search size={15} className="search-input-icon" />
            <input 
              type="text" 
              placeholder={isAr 
                ? "ابحث عن شارع، مستشفى، كمبوند، أو الصق رابط Google Maps مباشرة..." 
                : "Search street, hospital, compound, or paste Google Maps link..."} 
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (searchNotFoundMsg) setSearchNotFoundMsg(null);
                if (!val.trim()) {
                  setShowResultsDropdown(false);
                  setSearchResults([]);
                }
                // Automatic trigger when pasting Google Maps link
                if (val.includes('maps.app.goo.gl') || val.includes('goo.gl/maps') || val.includes('google.com/maps')) {
                  executeSearch(val);
                }
              }}
              className="sanctum-map-search-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            {searchQuery && (
              <button 
                type="button" 
                className="clear-search-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSearchNotFoundMsg(null);
                  setShowResultsDropdown(false);
                  setSearchResults([]);
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button 
            type="button" 
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="sanctum-map-search-btn"
          >
            {isSearching ? <Loader2 size={15} className="spinner" /> : <Navigation size={14} />}
            <span>{isSearching ? (isAr ? 'جاري البحث...' : 'Searching...') : (isAr ? 'بحث وانتقال' : 'Find & Pin')}</span>
          </button>

          {/* Autocomplete Search Dropdown */}
          {showResultsDropdown && searchResults.length > 0 && (
            <div className="search-dropdown-menu">
              <div className="dropdown-header">
                <span>{isAr ? 'المواقع المطابقة:' : 'Matching Locations:'}</span>
                <span className="google-badge">
                  <Globe size={11} /> Google Maps
                </span>
              </div>
              {searchResults.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  className="dropdown-item"
                  onClick={() => handleSelectResult(item)}
                >
                  <div className="item-icon-box">
                    {getPlaceIcon(item.type, item.source)}
                  </div>
                  <div className="item-meta">
                    <div className="item-title-row">
                      <span className="item-title">{item.display_name.split(/[—,]/)[0].trim()}</span>
                      {item.rating && (
                        <span className="item-rating">
                          <Star size={11} className="star-icon" fill="#DDA752" /> {item.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <span className="item-subtitle">{item.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button 
          type="button" 
          onClick={handleLocateMe}
          disabled={isLocating}
          className="sanctum-map-locate-btn"
          title={isAr ? "استخدام موقعي الحالي" : "Use my current location"}
        >
          {isLocating ? <Loader2 size={15} className="spinner" /> : <LocateFixed size={15} />}
          <span>{isLocating ? (isAr ? 'جاري التحديد...' : 'Locating...') : (isAr ? 'موقعي الحالي' : 'Locate Me')}</span>
        </button>

        {/* Google Maps Search Link Helper */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery || (latitude && longitude ? `${latitude},${longitude}` : 'منيا القمح'))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="sanctum-map-gmaps-btn"
          title={isAr ? "فتح البحث في تطبيق Google Maps لنسخ الرابط ولصقه هنا" : "Open Search in Google Maps to copy link & paste here"}
        >
          <ExternalLink size={14} />
          <span>{isAr ? 'خرائط Google' : 'Google Maps'}</span>
        </a>
      </div>

      {/* Prominent In-Place Location Notice Banner */}
      {searchNotFoundMsg && (
        <div className="sanctum-location-alert">
          <div className="alert-badge">📍</div>
          <div className="alert-content">
            <div className="alert-heading">{isAr ? 'لم يتم العثور على المكان بالاسم المكتوب' : 'Location Refinement Needed'}</div>
            <div className="alert-text">{searchNotFoundMsg}</div>

            {/* Quick District Suggestions inside the Alert */}
            <div className="alert-quick-districts">
              <span className="quick-label">{isAr ? 'انتقال سريع لأبرز المناطق:' : 'Quick Jump to Area:'}</span>
              <div className="quick-chips-row">
                {QUICK_DISTRICTS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="alert-chip-btn"
                    onClick={() => handleQuickDistrictJump(d)}
                  >
                    {isAr ? d.nameAr : d.nameEn}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button 
            type="button" 
            className="alert-close-btn"
            onClick={() => setSearchNotFoundMsg(null)}
            title={isAr ? 'إغلاق' : 'Dismiss'}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Quick Jump District Chips */}
      <div className="quick-chips-row">
        <span className="quick-chips-label">
          {isAr ? 'انتقال سريع:' : 'Quick Jump:'}
        </span>
        <div className="quick-chips-scroll">
          {QUICK_DISTRICTS.map((d) => (
            <button
              key={d.id}
              type="button"
              className="quick-chip-btn"
              onClick={() => handleQuickDistrictJump(d)}
            >
              <MapPin size={11} />
              <span>{isAr ? d.nameAr : d.nameEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Container */}
      <div className="sanctum-map-frame sanctum-picker-frame">
        {/* Loading Spinner Overlay with Visual Feedback */}
        {(isSearching || isLocating) && (
          <div className="sanctum-map-loading-overlay">
            <div className="loading-card">
              <Loader2 size={24} className="spinner gold-spinner" />
              <span className="loading-text">
                {isSearching 
                  ? (isAr ? 'جاري تحديد المكان على خرائط Google بدقة...' : 'Pinpointing place on Google Maps...') 
                  : (isAr ? 'جاري جلب إحداثيات الموقع وتثبيت الدبوس...' : 'Detecting current coordinates...')}
              </span>
            </div>
          </div>
        )}

        <MapContainer
          center={targetCenter}
          zoom={latitude ? 16 : 13}
          zoomControl={true}
          attributionControl={false}
          className="sanctum-leaflet-container"
          style={{ height: '100%', width: '100%', zIndex: 1 }}
        >
          {/* Default Mode: Google Maps Road Map / Satellite Mode: Google Hybrid Satellite */}
          {mapMode === 'google' ? (
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar"
              maxZoom={20}
            />
          ) : (
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=ar"
              maxZoom={20}
            />
          )}

          <MapEvents onLocationSelect={(lat, lng) => {
            setTargetCenter([lat, lng]);
            onChange(lat, lng);
            setSearchNotFoundMsg(null);
          }} />

          <MapUpdater center={targetCenter} />

          {latitude && longitude && (
            <Marker 
              position={[latitude, longitude]} 
              icon={sanctumIcon(isAr ? 'الموقع المحدد (قابل للسحب)' : 'Selected Location (Draggable)')} 
              draggable={true}
              eventHandlers={{
                dragend: (e: LeafletEvent) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  setTargetCenter([position.lat, position.lng]);
                  onChange(position.lat, position.lng);
                  toast.success(isAr ? 'تم تحديث الإحداثيات' : 'Coordinates updated');
                }
              }}
            />
          )}
          
          <MapResizer />
        </MapContainer>

        <div className="sanctum-inner-vignette" />

        {/* 2 Clean Modes: Google Maps (Default) and Satellite View */}
        <div className="map-mode-switcher">
          <button
            type="button"
            className={`mode-btn ${mapMode === 'google' ? 'active' : ''}`}
            onClick={() => setMapMode('google')}
            title={isAr ? "خرائط Google القياسية (افتراضي)" : "Google Maps (Default)"}
          >
            <Globe size={13} />
            <span>{isAr ? 'خرائط Google (افتراضي)' : 'Google Maps'}</span>
          </button>
          <button
            type="button"
            className={`mode-btn ${mapMode === 'satellite' ? 'active' : ''}`}
            onClick={() => setMapMode('satellite')}
            title={isAr ? "صور الأقمار الصناعية عالية الدقة مع أسماء الشوارع" : "Google Satellite View"}
          >
            <Eye size={13} />
            <span>{isAr ? 'قمر صناعي' : 'Satellite View'}</span>
          </button>
        </div>

        {/* Sleek Bottom-Left Coordinates Pill (Non-intrusive) */}
        <div className="sanctum-coords-pill" dir="ltr">
          <MapPin size={12} className="coords-icon" />
          <span>
            {latitude && longitude 
              ? `${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E` 
              : (isAr ? 'انقر لتحديد الموقع' : 'Click map to place pin')}
          </span>
        </div>
      </div>

      <style>{`
        .sanctum-map-picker-root {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          position: relative;
        }

        .sanctum-map-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          flex-wrap: wrap;
        }

        .sanctum-search-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 280px;
          position: relative;
        }

        .search-input-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .search-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #DDA752;
          pointer-events: none;
          z-index: 3;
        }

        [dir="rtl"] .search-input-icon {
          left: auto;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
        }

        .search-input-box input.sanctum-map-search-input {
          width: 100% !important;
          height: 44px !important;
          background: rgba(14, 18, 27, 0.95) !important;
          border: 1px solid rgba(221, 167, 82, 0.35) !important;
          border-radius: 12px !important;
          padding-left: 44px !important;
          padding-right: 44px !important;
          box-sizing: border-box !important;
          color: #F8FAFC !important;
          font-size: 0.85rem !important;
          font-weight: 500 !important;
          outline: none !important;
          transition: all 0.25s ease;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3) !important;
        }

        [dir="rtl"] .search-input-box input.sanctum-map-search-input {
          padding-right: 44px !important;
          padding-left: 44px !important;
        }

        .search-input-box input.sanctum-map-search-input:focus {
          border-color: #DDA752 !important;
          box-shadow: 0 0 0 3px rgba(221, 167, 82, 0.25), 0 6px 18px rgba(0, 0, 0, 0.4) !important;
          background: rgba(18, 24, 38, 0.98) !important;
        }

        .clear-search-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #94A3B8;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 3;
        }

        [dir="rtl"] .clear-search-btn {
          right: auto;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
        }

        .clear-search-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          color: #EF4444;
        }

        .sanctum-map-search-btn, 
        .sanctum-map-locate-btn, 
        .sanctum-map-gmaps-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          text-decoration: none;
        }

        .sanctum-map-search-btn {
          background: linear-gradient(135deg, #DDA752 0%, #C8923D 100%);
          color: #0A0C10;
          border: 1px solid #DDA752;
          box-shadow: 0 4px 12px rgba(221, 167, 82, 0.25);
        }

        .sanctum-map-search-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(221, 167, 82, 0.4);
        }

        .sanctum-map-locate-btn {
          background: rgba(18, 24, 38, 0.85);
          color: #E2E8F0;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .sanctum-map-locate-btn:hover:not(:disabled) {
          background: rgba(30, 41, 59, 0.95);
          border-color: rgba(221, 167, 82, 0.4);
          color: #DDA752;
        }

        .sanctum-map-gmaps-btn {
          background: rgba(18, 24, 38, 0.85);
          color: #38BDF8;
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .sanctum-map-gmaps-btn:hover {
          background: rgba(56, 189, 248, 0.15);
          border-color: #38BDF8;
          color: #7DD3FC;
        }

        /* Search Dropdown */
        .search-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: rgba(10, 14, 22, 0.98);
          border: 1px solid rgba(221, 167, 82, 0.4);
          border-radius: 14px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(20px);
          z-index: 1000;
          max-height: 280px;
          overflow-y: auto;
          padding: 6px;
        }

        .dropdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #DDA752;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 4px;
        }

        .google-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(221, 167, 82, 0.2);
          color: #DDA752;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 0.65rem;
          font-weight: 800;
        }

        .dropdown-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: #E2E8F0;
          text-align: inherit;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .dropdown-item:hover {
          background: rgba(221, 167, 82, 0.12);
          transform: translateX(3px);
        }

        [dir="rtl"] .dropdown-item:hover {
          transform: translateX(-3px);
        }

        .item-icon-box {
          margin-top: 2px;
          flex-shrink: 0;
        }

        .item-icon-hospital { color: #EF4444; }
        .item-icon-compound { color: #10B981; }
        .item-icon-shopping { color: #F59E0B; }
        .item-icon-google { color: #DDA752; }
        .item-icon-generic { color: #94A3B8; }

        .item-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .item-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .item-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #F8FAFC;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-rating {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #DDA752;
          flex-shrink: 0;
        }

        .item-subtitle {
          font-size: 0.74rem;
          color: #94A3B8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Alert Banner */
        .sanctum-location-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(221, 167, 82, 0.08);
          border: 1px solid rgba(221, 167, 82, 0.3);
          border-radius: 14px;
          padding: 12px 16px;
          position: relative;
        }

        .alert-badge {
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .alert-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .alert-heading {
          font-size: 0.84rem;
          font-weight: 700;
          color: #DDA752;
        }

        .alert-text {
          font-size: 0.78rem;
          color: #CBD5E1;
          line-height: 1.5;
        }

        .alert-quick-districts {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 6px;
        }

        .quick-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94A3B8;
        }

        .alert-chip-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #F1F5F9;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .alert-chip-btn:hover {
          background: rgba(221, 167, 82, 0.25);
          border-color: #DDA752;
          color: #DDA752;
        }

        .alert-close-btn {
          position: absolute;
          top: 10px;
          right: 12px;
          background: transparent;
          border: none;
          color: #94A3B8;
          cursor: pointer;
        }

        [dir="rtl"] .alert-close-btn {
          right: auto;
          left: 12px;
        }

        /* Quick Chips Row */
        .quick-chips-row {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 6px 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .quick-chips-row::-webkit-scrollbar {
          display: none;
        }

        .quick-chips-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94A3B8;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .quick-chips-scroll {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: nowrap;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .quick-chips-scroll::-webkit-scrollbar {
          display: none;
        }

        .quick-chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(18, 24, 38, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
          padding: 5px 12px;
          color: #CBD5E1;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .quick-chip-btn:hover {
          background: rgba(221, 167, 82, 0.2);
          border-color: rgba(221, 167, 82, 0.4);
          color: #DDA752;
        }

        /* Map Frame */
        .sanctum-map-frame {
          position: relative;
          height: 480px;
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(221, 167, 82, 0.25);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
          background: #0A0C10;
        }

        .sanctum-map-loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(10, 14, 22, 0.85);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          background: rgba(18, 24, 38, 0.95);
          border: 1px solid rgba(221, 167, 82, 0.4);
          border-radius: 16px;
          padding: 20px 30px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
        }

        .gold-spinner {
          color: #DDA752;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          font-size: 0.84rem;
          font-weight: 600;
          color: #E2E8F0;
          text-align: center;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        /* Mode Switcher */
        .map-mode-switcher {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 500;
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(10, 14, 22, 0.88);
          border: 1px solid rgba(221, 167, 82, 0.35);
          border-radius: 12px;
          padding: 4px;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        [dir="rtl"] .map-mode-switcher {
          right: auto;
          left: 1rem;
        }

        .mode-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #94A3B8;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-btn:hover {
          color: #F8FAFC;
          background: rgba(255, 255, 255, 0.08);
        }

        .mode-btn.active {
          background: linear-gradient(135deg, #DDA752 0%, #C8923D 100%);
          color: #0A0C10;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(221, 167, 82, 0.3);
        }

        /* Coordinates Pill */
        .sanctum-coords-pill {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          z-index: 500;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          backdrop-filter: blur(20px);
          border-radius: 9999px;
          padding: 6px 14px;
          pointer-events: none;
          background: rgba(10, 14, 22, 0.88);
          border: 1px solid rgba(221, 167, 82, 0.4);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
          font-size: 0.75rem;
          font-weight: 700;
          color: #FFFFFF;
        }

        [dir="rtl"] .sanctum-coords-pill {
          left: auto;
          right: 1rem;
        }

        .sanctum-coords-pill .coords-icon {
          color: #DDA752;
          flex-shrink: 0;
        }

        /* Custom Marker */
        .sanctum-picker-frame .sanctum-pin-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: grab;
        }

        .sanctum-picker-frame .sanctum-pin-wrapper:active {
          cursor: grabbing;
        }

        .sanctum-picker-frame .sanctum-pin-core {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #DDA752;
          border: 3px solid #0A0C10;
          box-shadow: 0 0 18px rgba(221, 167, 82, 0.95);
          z-index: 2;
        }

        .sanctum-picker-frame .sanctum-beacon-pulse {
          position: absolute;
          top: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(221, 167, 82, 0.4);
          animation: sanctumPickerPulse 2s infinite ease-out;
          transform: translateY(-8px);
          z-index: 1;
        }

        @keyframes sanctumPickerPulse {
          0% { transform: translateY(-8px) scale(0.5); opacity: 1; }
          100% { transform: translateY(-8px) scale(2.2); opacity: 0; }
        }

        .sanctum-picker-frame .sanctum-pin-tag {
          background: rgba(10, 14, 22, 0.95);
          border: 1px solid #DDA752;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
        }

        @media (max-width: 768px) {
          .map-mode-switcher {
            top: auto;
            bottom: 1rem;
            right: 0.5rem;
            left: 0.5rem;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
