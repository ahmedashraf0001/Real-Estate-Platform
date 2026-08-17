'use client';
import React, { useState, useEffect, useRef } from 'react';
let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}
import { Property } from '@/types';
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { createCachedTileLayer } from '@/lib/mapCache';
import { X, MapPin, Bed, Bath, Maximize2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProperty: (id: string) => void;
  properties?: Property[];
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  onSelectProperty,
  properties
}) => {
  // Use server-passed real DB properties, fall back to adapted FALLBACK_PROPERTIES
  const propertiesList = React.useMemo(() => {
    if (properties && properties.length > 0) return properties;
    return adaptProperties(FALLBACK_PROPERTIES, 'en');
  }, [properties]);

  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [activeProperty, setActiveProperty] = useState<Property | null>(propertiesList[0] ?? null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const districts = ['All', 'New Cairo', 'Sheikh Zayed', 'North Coast', 'Gouna', 'Ain Sokhna'];

  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    // Initialize Leaflet map with a slight delay for modal DOM render
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [30.0131, 31.4913],
        zoom: 11,
        zoomControl: true,
        attributionControl: false
      });

      createCachedTileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      const customIcon = L.divIcon({
        html: `
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(10, 12, 16, 0.95);
            border: 2px solid #DDA752;
            box-shadow: 0 0 16px rgba(221, 167, 82, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #DDA752;"></div>
          </div>
        `,
        className: 'custom-gold-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      propertiesList.forEach((prop) => {
        const lat = prop.mapCoordinates?.lat ?? (prop as any).latitude;
        const lng = prop.mapCoordinates?.lng ?? (prop as any).longitude;
        if (!lat || !lng) return;
        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          setActiveProperty(prop);
        });
        markersRef.current[prop.id] = marker;
      });

      mapInstanceRef.current = map;
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  const handleDistrictFilter = (district: string) => {
    setSelectedDistrict(district);
    if (!mapInstanceRef.current) return;

    const fly = (center: [number, number], zoom: number, districtKey: string) => {
      mapInstanceRef.current!.flyTo(center, zoom, { duration: 1.2 });
      const found = propertiesList.find((p) => {
        const loc = (p.location || '').toLowerCase();
        const dist = (p.district || '').toLowerCase();
        return loc.includes(districtKey) || dist.includes(districtKey);
      });
      if (found) setActiveProperty(found);
    };

    if (district === 'New Cairo') fly([30.0131, 31.4913], 12, 'new cairo');
    else if (district === 'Sheikh Zayed') fly([30.0385, 30.9784], 12, 'sheikh zayed');
    else if (district === 'North Coast') fly([30.9856, 28.7690], 11, 'north coast');
    else if (district === 'Gouna') fly([27.3949, 33.6766], 12, 'gouna');
    else if (district === 'Ain Sokhna') fly([29.6010, 32.3380], 12, 'sokhna');
    else mapInstanceRef.current.flyTo([30.02, 31.35], 9, { duration: 1.2 });
  };

  if (!isOpen) return null;

  return (
    <div className="map-modal-backdrop" onClick={onClose}>
      <motion.div 
        className="map-modal-container"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        {/* Modal Top Header */}
        <div className="map-modal-header">
          <div className="modal-title-wrap">
            <span className="modal-eyebrow">INTERACTIVE CARTOGRAPHY</span>
            <h2 className="modal-heading">Prime Architectural Directory</h2>
          </div>

          <div className="modal-header-actions">
            {/* District Filter Pills */}
            <div className="district-pills-list">
              {districts.map((district) => (
                <button
                  key={district}
                  className={`district-pill ${selectedDistrict === district ? 'active' : ''}`}
                  onClick={() => handleDistrictFilter(district)}
                >
                  {district}
                </button>
              ))}
            </div>

            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Real Leaflet Map Viewport */}
        <div className="map-modal-viewport">
          <div ref={mapContainerRef} className="leaflet-modal-map" />

          {/* Floating Property Preview Card with High Z-Index to prevent pin overlaps */}
          <AnimatePresence>
            {activeProperty && (
              <motion.div 
                className="floating-property-popup-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                key={activeProperty.id}
              >
                <div className="popup-thumb-wrap">
                  <img src={activeProperty.images?.[0] || (activeProperty.property_images?.[0] as any)?.url || ''} alt={activeProperty.title || activeProperty.title_en || ''} className="popup-thumb-img" />
                  <span className="popup-district-badge">{activeProperty.district || activeProperty.location?.split(',')[0]}</span>
                </div>

                <div className="popup-details">
                  <h3 className="popup-title">{activeProperty.title || activeProperty.title_en}</h3>
                  <div className="popup-price">
                    {new Intl.NumberFormat('en-US').format(activeProperty.price || activeProperty.price_egp || 0)} {activeProperty.currency || 'EGP'}
                  </div>

                  <div className="popup-specs-strip">
                    <span><Bed size={13} /> {activeProperty.beds || (activeProperty as any).bedrooms || 0} Beds</span>
                    <span><Bath size={13} /> {activeProperty.baths || (activeProperty as any).bathrooms || 0} Baths</span>
                    <span><Maximize2 size={13} /> {activeProperty.sqm || (activeProperty as any).area_sqm || 0} sqm</span>
                  </div>

                  <button 
                    className="popup-cta-btn"
                    onClick={() => {
                      onSelectProperty(activeProperty.id);
                      onClose();
                    }}
                  >
                    <span>View Architectural Details</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`
        .map-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(10, 12, 16, 0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .map-modal-container {
          background: #11141B;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          width: 100%;
          max-width: 1200px;
          height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.8);
        }

        [data-theme="dark"] .map-modal-container {
          background: #0A0C10;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        [data-theme="light"] .map-modal-container {
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .map-modal-header {
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-subtle);
        }

        [data-theme="dark"] .map-modal-header {
          background: #0A0C10;
        }

        [data-theme="light"] .map-modal-header {
          background: #FAF7F2;
        }

        .modal-eyebrow {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--gold-primary);
          display: block;
        }

        .modal-heading {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 800;
        }

        [data-theme="dark"] .modal-heading {
          color: #ffffff;
        }

        [data-theme="light"] .modal-heading {
          color: #0D1117;
        }

        .modal-header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .district-pills-list {
          display: flex;
          gap: 0.5rem;
          padding: 4px;
          border-radius: var(--radius-full);
        }

        [data-theme="dark"] .district-pills-list {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        [data-theme="light"] .district-pills-list {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .district-pill {
          padding: 0.4rem 0.95rem;
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }

        .district-pill.active {
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 45%, #C59A45 100%);
          color: #0A0C10;
          font-weight: 700;
        }

        .modal-close-btn {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .modal-close-btn {
          background: rgba(255, 255, 255, 0.05);
          color: #8E9BAE;
        }

        [data-theme="dark"] .modal-close-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .modal-close-btn {
          background: rgba(0, 0, 0, 0.05);
          color: #475569;
        }

        [data-theme="light"] .modal-close-btn:hover {
          color: #0D1117;
          background: rgba(0, 0, 0, 0.1);
        }

        .map-modal-viewport {
          position: relative;
          flex-grow: 1;
          width: 100%;
          height: 100%;
          background: #080A0E;
        }

        .leaflet-modal-map {
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        /* Floating Preview Card */
        .floating-property-popup-card {
          position: absolute;
          bottom: 2rem;
          left: 2rem;
          z-index: 1000;
          width: 360px;
          border-radius: 20px;
          overflow: hidden;
        }

        [data-theme="dark"] .floating-property-popup-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.06) 30%,
            rgba(18, 24, 38, 0.42) 65%,
            rgba(10, 14, 24, 0.70) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.45),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .floating-property-popup-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.65) 0%,
            rgba(255, 255, 255, 0.30) 35%,
            rgba(255, 255, 255, 0.48) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.75);
          box-shadow: 
            0 18px 44px rgba(15, 23, 42, 0.08), 
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(255, 255, 255, 0.25);
        }

        .popup-thumb-wrap {
          position: relative;
          width: 100%;
          height: 170px;
        }

        .popup-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .popup-district-badge {
          position: absolute;
          top: 1rem;
          left: 1rem;
          border-radius: var(--radius-full);
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          background: rgba(197, 154, 69, 0.14);
          border: 1px solid rgba(197, 154, 69, 0.35);
          color: var(--gold-primary);
        }

        .popup-details {
          padding: 1.25rem 1.5rem;
        }

        .popup-title {
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        [data-theme="dark"] .popup-title {
          color: #ffffff;
        }

        [data-theme="light"] .popup-title {
          color: #0D1117;
        }

        .popup-price {
          font-family: var(--font-heading);
          font-size: 1.125rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
          color: var(--gold-primary);
        }

        .popup-specs-strip {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 1rem;
        }

        [data-theme="dark"] .popup-specs-strip {
          color: #C7D2DF;
          border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .popup-specs-strip {
          color: #1E293B;
          border-bottom-color: rgba(184, 133, 48, 0.2);
        }

        .popup-specs-strip span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .popup-cta-btn {
          width: 100%;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 45%, #C59A45 100%);
          color: #0A0C10;
          font-weight: 700;
          font-size: 0.875rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 18px rgba(197, 154, 69, 0.25), inset 0 1px 1.5px rgba(255, 255, 255, 0.7);
          transition: all var(--transition-fast);
        }

        .popup-cta-btn:hover {
          background: linear-gradient(135deg, #FFF0C8 0%, #E5BE7A 45%, #D4AF37 100%);
          transform: translateY(-1px);
        }

        @media (max-width: 900px) {
          .map-modal-container {
            height: 95vh;
          }
          .map-modal-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .floating-property-popup-card {
            left: 1rem;
            right: 1rem;
            bottom: 1rem;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
};
