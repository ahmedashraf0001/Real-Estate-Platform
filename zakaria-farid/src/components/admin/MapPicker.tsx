'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Search, LocateFixed, Loader2 } from 'lucide-react';
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
      } catch {
        // Safe catch if map or container unmounted
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

interface MapUpdaterProps {
  center: [number, number];
  zoom?: number;
}

function MapUpdater({ center, zoom = 14 }: MapUpdaterProps) {
  const map = useMap();
  useEffect(() => {
    try {
      if (map && map.getContainer()) {
        map.flyTo(center, zoom, { duration: 1.5 });
      }
    } catch {
      // Safe catch if map unmounted
    }
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

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const [targetCenter, setTargetCenter] = useState<[number, number]>([
    latitude ?? 30.0444, 
    longitude ?? 31.2357
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setTargetCenter([lat, lon]);
        onChange(lat, lon); // Drop pin at result
      } else {
        toast.error('Location not found. Try a different search term.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      toast.error('Error searching for location.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setTargetCenter([lat, lon]);
        onChange(lat, lon);
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err.message, err.code);
        
        let errorMessage = 'Could not fetch your location.';
        if (err.code === 1) errorMessage = 'Location access denied. Please allow permissions in your browser.';
        else if (err.code === 2) errorMessage = 'Location unavailable. Please check your device settings.';
        else if (err.code === 3) errorMessage = 'Location request timed out.';
        
        toast.error(errorMessage);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flex: 1, gap: '8px', minWidth: '250px' }}>
          <input 
            type="text" 
            placeholder="Search for a city, neighborhood, or street..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <button 
            type="button" 
            onClick={handleSearch}
            disabled={isSearching}
            className="btn btn-primary"
            style={{ padding: '0 16px', height: '42px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isSearching ? <Loader2 size={16} /> : <Search size={16} />}
            Search
          </button>
        </div>
        
        <button 
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="btn btn-outline"
          style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          title="Use my current location"
        >
          {isLocating ? <Loader2 size={16} /> : <LocateFixed size={16} />}
          Locate Me
        </button>
      </div>

      {/* Map — Sanctum satellite frame, identical to the public property page */}
      <div className="sanctum-map-frame sanctum-picker-frame">
        <MapContainer
          center={targetCenter}
          zoom={latitude ? 16 : 10}
          zoomControl={true}
          attributionControl={false}
          className="sanctum-leaflet-container"
          style={{ height: '100%', width: '100%', zIndex: 1 }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          <MapEvents onLocationSelect={(lat, lng) => {
            setTargetCenter([lat, lng]);
            onChange(lat, lng);
          }} />
          <MapUpdater center={targetCenter} />
          {latitude && longitude && (
            <Marker position={[latitude, longitude]} icon={sanctumIcon('Selected Location')} />
          )}
          <MapResizer />
        </MapContainer>
        <div className="sanctum-inner-vignette" />
        <div className="sanctum-overlay-badge">
          <span className="sanctum-badge-mode">LIVE SATELLITE VIEW</span>
          <span className="sanctum-badge-coords" dir="ltr">
            {latitude && longitude ? `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E` : 'Click the map to drop the pin'}
          </span>
        </div>
      </div>

      <style>{`
        .sanctum-picker-frame {
          position: relative;
          width: 100%;
          height: 440px;
          border-radius: 24px;
          overflow: hidden;
          background: #080A0E;
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.2);
        }
        .sanctum-picker-frame .sanctum-inner-vignette {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          pointer-events: none;
          z-index: 400;
          box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.25);
        }
        .sanctum-picker-frame .sanctum-overlay-badge {
          position: absolute;
          top: 1.25rem;
          left: 1.25rem;
          z-index: 500;
          display: flex;
          flex-direction: column;
          gap: 3px;
          backdrop-filter: blur(20px) saturate(180%);
          border-radius: 12px;
          padding: 0.55rem 0.95rem;
          pointer-events: none;
          background: rgba(10, 14, 22, 0.85);
          border: 1px solid rgba(221, 167, 82, 0.4);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        }
        .sanctum-picker-frame .sanctum-badge-mode {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #DDA752;
          text-transform: uppercase;
        }
        .sanctum-picker-frame .sanctum-badge-coords {
          font-size: 0.75rem;
          font-weight: 600;
          color: #FFFFFF;
        }
        .sanctum-picker-frame .sanctum-pin-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .sanctum-picker-frame .sanctum-pin-core {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #DDA752;
          border: 3px solid #0A0C10;
          box-shadow: 0 0 18px rgba(221, 167, 82, 0.9);
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
          background: rgba(10, 14, 22, 0.92);
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
        .sanctum-picker-frame .leaflet-control-zoom {
          border: none !important;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }
        .sanctum-picker-frame .leaflet-control-zoom a {
          background: rgba(10, 14, 22, 0.85) !important;
          color: #DDA752 !important;
          border: 1px solid rgba(221, 167, 82, 0.3) !important;
          backdrop-filter: blur(12px);
        }
      `}</style>
    </div>
  );
}
