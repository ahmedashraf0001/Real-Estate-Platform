'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { icon } from 'leaflet';
import { Search, LocateFixed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

const customIcon = icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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

      {/* Map */}
      <div style={{ height: '500px', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)', position: 'relative' }}>
        <MapContainer
          center={targetCenter}
          zoom={latitude ? 14 : 10}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapEvents onLocationSelect={(lat, lng) => {
            setTargetCenter([lat, lng]);
            onChange(lat, lng);
          }} />
          <MapUpdater center={targetCenter} />
          {latitude && longitude && (
            <Marker position={[latitude, longitude]} icon={customIcon} />
          )}
          <MapResizer />
        </MapContainer>
      </div>
    </div>
  );
}
