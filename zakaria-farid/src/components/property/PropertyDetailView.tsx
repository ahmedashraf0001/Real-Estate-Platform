'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}
import { Property } from '@/types';
import { useRouter } from 'next/navigation';
import { triggerNavigationStart } from '@/components/NavigationProgress';
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { PropertyCard } from './PropertyCard';
import ArchitecturalBlueprintInspector from './ArchitecturalBlueprintInspector';
import { createCachedTileLayer } from '@/lib/mapCache';
import { 
  Bed, 
  Bath, 
  Maximize2, 
  Calendar, 
  Building2, 
  MapPin, 
  PhoneCall, 
  MessageCircle, 
  ShieldCheck, 
  Waves, 
  Flower2, 
  Car, 
  Dumbbell, 
  CheckCircle, 
  ArrowLeft, 
  ChevronRight,
  ChevronLeft,
  Share2,
  Bookmark,
  Sparkles,
  Train,
  Footprints,
  Navigation,
  Maximize,
  X,
  Compass,
  LocateFixed,
  RefreshCw,
  Clock,
  Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PropertyDetailViewProps {
  propertyId?: string;
  property?: Property | any;
  similarProperties?: (Property | any)[];
  locale?: string;
  onBack?: () => void;
  onSelectProperty?: (id: string) => void;
  onOpenInquiry?: (type: string, propertyName?: string) => void;
}

const SanctumSatelliteMap: React.FC<{ lat: number; lng: number; title: string; district: string; isAr?: boolean }> = ({
  lat,
  lng,
  title,
  district,
  isAr = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // High-Res ESRI World Satellite Imagery (Cached)
    createCachedTileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ).addTo(map);

    // Custom Glowing Beacon Pin
    const pinHtml = `
      <div class="sanctum-pin-wrapper">
        <div class="sanctum-beacon-pulse"></div>
        <div class="sanctum-pin-core"></div>
        <div class="sanctum-pin-tag">${title}</div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: pinHtml,
      className: 'sanctum-custom-marker',
      iconSize: [220, 50],
      iconAnchor: [110, 25]
    });

    L.marker([lat, lng], { icon: customIcon }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, title]);

  return (
    <div className="sanctum-map-frame">
      <div ref={mapContainerRef} className="sanctum-leaflet-container" />
      <div className="sanctum-inner-vignette" />
      <div className="sanctum-overlay-badge">
        <span className="sanctum-badge-mode">{isAr ? 'عرض الأقمار الصناعية' : 'LIVE SATELLITE VIEW'}</span>
        <span className="sanctum-badge-coords">{lat.toFixed(4)}° N, {lng.toFixed(4)}° E • {district}</span>
      </div>
    </div>
  );
};

export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  property: propProperty,
  similarProperties: propSimilar,
  locale = 'en',
  onBack: propOnBack,
  onSelectProperty: propOnSelectProperty,
  onOpenInquiry: propOnOpenInquiry
}) => {
  const router = useRouter();
  const isAr = locale === 'ar';
  const effectiveId = propertyId || propProperty?.slug || propProperty?.id;
  const fallbackAdapted = adaptProperties(FALLBACK_PROPERTIES, locale as 'en' | 'ar');
  const rawProperty = propProperty || fallbackAdapted.find((p: Property) => p.id === effectiveId || p.slug === effectiveId) || fallbackAdapted[0];

  const onBack = propOnBack || (() => {
    triggerNavigationStart();
    router.push('/' + locale + '/properties');
  });
  const onSelectProperty = propOnSelectProperty || ((id: string) => {
    triggerNavigationStart();
    router.push('/' + locale + '/properties/' + id);
  });
  const onOpenInquiry = propOnOpenInquiry || ((type: string, propertyName?: string) => {
    const phone = (rawProperty.broker?.phone || '+201009970776').replace(/[^0-9]/g, '');
    window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent('Hello, I am inquiring about ' + (propertyName || rawProperty.title_en || rawProperty.title))}`;
  });

  const rawNarrative = isAr 
    ? (rawProperty.description_ar || rawProperty.narrative || rawProperty.description_en || '')
    : (rawProperty.description_en || rawProperty.narrative || rawProperty.description_ar || '');

  // Strip raw HTML tags cleanly from narrative if entered via rich-text editor
  const cleanNarrative = rawNarrative
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim() || (isAr ? 'تحفة معمارية استثنائية صُممت بأعلى معايير الفخامة والدقة الهندسية.' : 'An extraordinary architectural masterpiece crafted with the highest standards of luxury and precision.');

  const property: Property = {
    id: rawProperty.slug || rawProperty.id || 'the-obsidian-pavilion',
    slug: rawProperty.slug || rawProperty.id || 'the-obsidian-pavilion',
    title: isAr ? (rawProperty.title_ar || rawProperty.title) : (rawProperty.title_en || rawProperty.title || 'The Obsidian Pavilion'),
    location: rawProperty.location || 'Sodic East Estate, New Cairo, Egypt',
    district: rawProperty.district || (rawProperty.location ? rawProperty.location.split(',')[0].trim() : 'New Cairo'),
    estateName: rawProperty.estateName || (rawProperty.district ? rawProperty.district : 'Four Seasons Privado'),
    price: rawProperty.price || rawProperty.price_egp || 42500000,
    currency: rawProperty.currency || (isAr ? 'ج.م' : 'EGP'),
    beds: rawProperty.beds || rawProperty.bedrooms || 5,
    baths: rawProperty.baths || rawProperty.bathrooms || 6,
    sqm: rawProperty.sqm || rawProperty.area_sqm || 720,
    propertyType: rawProperty.propertyType || rawProperty.type || 'Standalone Villa',
    builtYear: rawProperty.builtYear || rawProperty.year_built || 2025,
    featured: rawProperty.featured ?? rawProperty.is_featured ?? true,
    images: (rawProperty.images && rawProperty.images.length > 0) 
      ? rawProperty.images 
      : (rawProperty.property_images && rawProperty.property_images.length > 0)
        ? rawProperty.property_images.map((img: any) => typeof img === 'string' ? img : img.url)
        : [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
            'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85',
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
            'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85'
          ],
    narrative: cleanNarrative,
    amenities: rawProperty.amenities || [
      { icon: 'waves', title: isAr ? 'مسبح لا متناهي مدفأ' : 'Heated Infinity Pool' },
      { icon: 'flower-2', title: isAr ? 'حدائق نباتية منسقة' : 'Manicured Botanical Gardens' },
      { icon: 'shield-check', title: isAr ? 'أمن وحراسة مشددة ٢٤/٧' : '24/7 Armed Security & Concierge' },
      { icon: 'car', title: isAr ? 'جراج يتسع لـ ٤ سيارات' : '4-Car Integrated Garage' },
      { icon: 'dumbbell', title: isAr ? 'صالة رياضية خاصة' : 'Private TechnoGym Studio' },
      { icon: 'building', title: isAr ? 'مصعد هيدروليكي خاص' : 'Internal Hydraulic Elevator' }
    ],
    mapCoordinates: rawProperty.mapCoordinates || (rawProperty.latitude && rawProperty.longitude ? { x: 38, y: 44, lat: Number(rawProperty.latitude), lng: Number(rawProperty.longitude) } : { x: 38, y: 44, lat: 30.0131, lng: 31.4913 }),
    broker: rawProperty.broker || {
      name: isAr ? 'زكريا فريد' : 'Zakaria Farid',
      role: isAr ? 'المالك المباشر والمستشار الأول' : 'Senior Acquisition Lead',
      phone: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ? `+${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}` : '+201009970776',
      email: 'contact@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80'
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if ((window as any).__masrLenis) {
      (window as any).__masrLenis.scrollTo(0, { immediate: true });
    }
  }, [propertyId]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isAmbientGlow, setIsAmbientGlow] = useState(true);
  
  // Live User Geolocation & Distance State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'located' | 'fallback'>('idle');

  // Viewing Scheduler States
  const [viewingSlot, setViewingSlot] = useState<string>('morning');
  const [viewingDate, setViewingDate] = useState<string>('');
  const [viewingBooked, setViewingBooked] = useState<boolean>(false);

  const formattedPrice = new Intl.NumberFormat('en-US').format(property.price);
  const similarProperties = propSimilar || fallbackAdapted.filter((p: Property) => p.id !== property.id).slice(0, 3);

  // Geolocation Detection
  const requestLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoStatus('fallback');
      return;
    }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGeoStatus('located');
      },
      () => {
        // Fallback default: Downtown Cairo (30.0444, 31.2357)
        setUserCoords({ lat: 30.0444, lng: 31.2357 });
        setGeoStatus('fallback');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  // Haversine Distance Calculation
  const activeOrigin = userCoords || { lat: 30.0444, lng: 31.2357 };
  const directDistanceKm = useMemo(() => {
    const R = 6371; // Earth radius in km
    const dLat = ((property.mapCoordinates.lat - activeOrigin.lat) * Math.PI) / 180;
    const dLon = ((property.mapCoordinates.lng - activeOrigin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((activeOrigin.lat * Math.PI) / 180) *
      Math.cos((property.mapCoordinates.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, [property.mapCoordinates, activeOrigin]);

  const roadDistanceKm = directDistanceKm * 1.28;

  const formatDuration = (mins: number) => {
    if (mins < 1) return isAr ? 'أقل من دقيقة' : '< 1 min';
    if (mins < 60) return isAr ? `${Math.round(mins)} دقيقة` : `${Math.round(mins)} mins`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = Math.round(mins % 60);
    if (isAr) {
      return remainingMins > 0 ? `${hrs} ساعة و ${remainingMins} دقيقة` : `${hrs} ساعات`;
    }
    return remainingMins > 0 ? `${hrs} hr ${remainingMins} mins` : `${hrs} hrs`;
  };

  const travelEstimates = useMemo(() => {
    const isNearby = roadDistanceKm <= 3.5;
    return [
      {
        mode: isAr ? 'بالسيارة' : 'Driving',
        sub: isAr 
          ? `${roadDistanceKm.toFixed(1)} كم عبر الطرق السريعة` 
          : `${roadDistanceKm.toFixed(1)} km via main highway`,
        time: formatDuration((roadDistanceKm / 65) * 60),
        icon: Car
      },
      {
        mode: isAr ? 'مواصلات / تاكسي' : 'Transit & Cab',
        sub: isAr 
          ? 'عبر المحاور الرئيسية والطريق الدائري' 
          : 'Via ring road & main arterials',
        time: formatDuration((roadDistanceKm / 45) * 60 + 8),
        icon: Train
      },
      isNearby ? {
        mode: isAr ? 'سيراً على الأقدام' : 'Walking',
        sub: isAr 
          ? `${roadDistanceKm.toFixed(1)} كم مسار مشي مباشر` 
          : `${roadDistanceKm.toFixed(1)} km direct walking route`,
        time: formatDuration((roadDistanceKm / 4.8) * 60),
        icon: Footprints
      } : {
        mode: isAr ? 'أهم الخدمات والمحاور' : 'Nearby Hubs & Services',
        sub: isAr 
          ? 'مدارس، مراكز تجارية، ومستشفيات قريبة' 
          : 'Minutes to local retail, schools & medical',
        time: isAr ? '5 - 10 دقائق' : '5–10 mins',
        icon: Landmark
      }
    ];
  }, [roadDistanceKm, isAr]);

  // Real Estate JSON-LD Schema
  useEffect(() => {
    const jsonLdData = {
      "@context": "https://schema.org",
      "@type": "SingleFamilyResidence",
      "name": property.title,
      "description": property.narrative,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": property.district,
        "addressCountry": "EG"
      },
      "numberOfBedrooms": property.beds,
      "numberOfBathroomsTotal": property.baths,
      "floorSize": {
        "@type": "QuantitativeValue",
        "value": property.sqm,
        "unitCode": "MTK"
      },
      "offers": {
        "@type": "Offer",
        "price": property.price,
        "priceCurrency": property.currency,
        "availability": "https://schema.org/InStock"
      },
      "image": property.images
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLdData);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [property]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev + 1) % property.images.length);
      }
      if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, property.images.length]);

  // Preload all property images for instant zero-latency slide transitions
  useEffect(() => {
    if (property?.images?.length) {
      property.images.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  }, [property.images]);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingDate) return;
    setViewingBooked(true);
  };

  // Price per SQM calculation
  const pricePerSqm = property.sqm && property.sqm > 0 
    ? Math.round(property.price / property.sqm).toLocaleString() 
    : null;


  return (
    <div className="property-detail-view">
      <div className="container">
        
        {/* 1. Sovereign Property Header & Quick Actions */}
        <div className="property-top-header">
          {/* Top Breadcrumb & Badge Metadata Bar */}
          <div className="header-meta-top-row">
            <div className="breadcrumb-bar">
              <button className="back-link-btn" onClick={onBack} type="button">
                <ArrowLeft size={14} />
                <span>{isAr ? 'الكتالوج' : 'Catalog'}</span>
              </button>
              <ChevronRight size={13} className="crumb-chevron" />
              <span className="crumb-text">{property.district}</span>
              <ChevronRight size={13} className="crumb-chevron" />
              <span className="crumb-text active">{property.title}</span>
            </div>

            <div className="property-eyebrow-row">
              <span className="property-compound-badge">
                <Building2 size={13} className="badge-compound-icon" />
                <span>{property.estateName}</span>
              </span>
              <span className="property-id-badge">
                <ShieldCheck size={13} className="badge-gold-icon" />
                <span>ID: MP-{property.id.toUpperCase()} • {isAr ? 'تسجيل ملكية حرة' : 'FREEHOLD REGISTERED'}</span>
              </span>
            </div>
          </div>

          {/* Main Hero Split Row: Title & Location (Left) + Acquisition Value & Actions (Right) */}
          <div className="header-main-hero-row">
            <div className="top-header-left">
              <h1 className="property-main-title">{property.title}</h1>
              <div className="property-location-bar">
                <MapPin size={15} className="location-pin" />
                <span>{property.location}</span>
              </div>
            </div>

            <div className="top-header-right">
              <div className="property-price-card">
                <span className="price-label">{isAr ? 'قيمة الاستحواذ المعتمدة' : 'ACQUISITION VALUE'}</span>
                <div className="price-value">
                  {formattedPrice} <span className="price-currency">{property.currency}</span>
                </div>
                <span className="price-tax-note">
                  {pricePerSqm ? `~ ${pricePerSqm} ${property.currency} / m² • ` : ''}
                  {isAr ? 'تسجيل عقاري موثق • ٠٪ عمولات خفية' : 'Freehold Escrow Verified • 0% Hidden Fees'}
                </span>
              </div>

              <div className="top-action-group">
                <button 
                  className="btn-gold top-inquire-btn"
                  onClick={() => onOpenInquiry('Acquisition Inquiry', property.title)}
                  type="button"
                >
                  <span>{isAr ? 'طلب الاستحواذ' : 'Inquire for Acquisition'}</span>
                </button>

                <div className="header-icon-actions">
                  <button 
                    className={`header-icon-btn ${isBookmarked ? 'active' : ''}`}
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    title={isAr ? 'حفظ في المفضلات' : 'Save to Favorites'}
                    type="button"
                  >
                    <Bookmark size={17} />
                  </button>
                  <button 
                    className="header-icon-btn"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      alert(isAr ? 'تم نسخ رابط العقار الخاص إلى الحافظة.' : 'Private sovereign listing link copied to clipboard.');
                    }}
                    title={isAr ? 'مشاركة الملف' : 'Share Dossier'}
                    type="button"
                  >
                    <Share2 size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Quick Specs Glass Strip */}
        <div className="property-quick-specs-bar">
          <div className="spec-pill">
            <Bed size={16} className="pill-icon" />
            <span><strong>{property.beds}</strong> Bedrooms</span>
          </div>
          <div className="spec-pill">
            <Bath size={16} className="pill-icon" />
            <span><strong>{property.baths}</strong> Bathrooms</span>
          </div>
          <div className="spec-pill">
            <Maximize2 size={16} className="pill-icon" />
            <span><strong>{property.sqm}</strong> SQM Built-up</span>
          </div>
          <div className="spec-pill">
            <Calendar size={16} className="pill-icon" />
            <span>Built in <strong>{property.builtYear}</strong></span>
          </div>
          <div className="spec-pill">
            <Building2 size={16} className="pill-icon" />
            <span><strong>{property.propertyType}</strong></span>
          </div>
          <div className="spec-pill verified-pill">
            <ShieldCheck size={16} className="pill-icon-gold" />
            <span><strong>Verified Property</strong></span>
          </div>
        </div>

        {/* 3. Cinematic Gallery Stage with Luxury Ambient Cinema Mode */}
        <div className="gallery-section">
          {/* Luxury Ambient Cinema Backdrop Layer */}
          <div className="gallery-ambient-wrapper" aria-hidden="true">
            <AnimatePresence initial={false}>
              {isAmbientGlow && (
                <motion.div 
                  key={activeImageIndex}
                  className="ambient-glow-fade-slot"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div 
                    className="ambient-aurora-mesh mesh-alpha"
                    style={{
                      backgroundImage: `url(${property.images[activeImageIndex] || property.images[0]})`
                    }}
                  />
                  <div 
                    className="ambient-aurora-mesh mesh-beta"
                    style={{
                      backgroundImage: `url(${property.images[activeImageIndex] || property.images[0]})`
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="main-image-frame" onClick={() => setIsLightboxOpen(true)}>
            <AnimatePresence initial={false}>
              <motion.img 
                key={activeImageIndex}
                src={property.images[activeImageIndex] || property.images[0]} 
                alt={property.title} 
                className="main-hero-img"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              />
            </AnimatePresence>

            <div className="gallery-stage-overlay">
              <div className="gallery-counter-pill">
                <span>{String(activeImageIndex + 1).padStart(2, '0')} / {String(property.images.length).padStart(2, '0')} • ARCHITECTURAL VISTA</span>
              </div>

              <div className="gallery-actions-right">
                {/* Luxury Ambient Mode Toggle Button */}
                <button
                  className={`gallery-ambient-btn ${isAmbientGlow ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAmbientGlow(!isAmbientGlow);
                  }}
                  type="button"
                  title={isAr ? 'تبديل الإضاءة السينمائية المحيطية' : 'Toggle Luxury Ambient Cinema Illumination'}
                >
                  <Sparkles size={15} className="ambient-sparkle-icon" />
                  <span className="ambient-btn-label">{isAr ? `إضاءة محيطية: ${isAmbientGlow ? 'مفعلة' : 'معطلة'}` : `Ambient: ${isAmbientGlow ? 'ON' : 'OFF'}`}</span>
                  <span className={`ambient-dot-pulse ${isAmbientGlow ? 'active' : 'off'}`} />
                </button>

                <button className="gallery-fullscreen-btn" type="button" title="Open Fullscreen Lightbox">
                  <Maximize size={14} />
                  <span>Fullscreen Stage</span>
                </button>
              </div>
            </div>

            {/* Gallery Step Arrows */}
            <button 
              className="gallery-nav-arrow arrow-left"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
              }}
              type="button"
            >
              <ChevronLeft size={20} />
            </button>

            <button 
              className="gallery-nav-arrow arrow-right"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev + 1) % property.images.length);
              }}
              type="button"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Thumbnail Selector Strip */}
          <div className="thumbnails-strip">
            {property.images.map((imgUrl, idx) => (
              <motion.div 
                key={idx}
                className={`thumb-item ${activeImageIndex === idx ? 'active' : ''}`}
                onClick={() => setActiveImageIndex(idx)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="thumb-img" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* 4. Fullscreen Lightbox Modal with 3D Cinematic Liquid Carousel & Ambient Aurora */}
        <AnimatePresence>
          {isLightboxOpen && (
            <motion.div 
              className="lightbox-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLightboxOpen(false)}
            >
              {/* Fullscreen Lightbox Ambient Glow with Smooth Morphing Transition */}
              <AnimatePresence initial={false}>
                <motion.div 
                  key={activeImageIndex}
                  className="lightbox-ambient-fade-slot"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div 
                    className="lightbox-aurora-mesh mesh-alpha"
                    style={{
                      backgroundImage: `url(${property.images[activeImageIndex] || property.images[0]})`
                    }}
                  />
                  <div 
                    className="lightbox-aurora-mesh mesh-beta"
                    style={{
                      backgroundImage: `url(${property.images[activeImageIndex] || property.images[0]})`
                    }}
                  />
                </motion.div>
              </AnimatePresence>

              <div className="lightbox-carousel-stage" onClick={(e) => e.stopPropagation()}>
                
                {/* Floating Top Header Bar */}
                <div className="lightbox-top-bar">
                  <div className="lightbox-top-left">
                    <span className="lightbox-dossier-tag">
                      <ShieldCheck size={14} className="tag-gold-icon" />
                      <span>PROPERTY PHOTOS</span>
                    </span>
                    <span className="lightbox-counter-pill">
                      {String(activeImageIndex + 1).padStart(2, '0')} / {String(property.images.length).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="lightbox-top-right">
                    <button 
                      className="lightbox-close-btn" 
                      onClick={() => setIsLightboxOpen(false)}
                      type="button"
                      title="Close Fullscreen Stage (Esc)"
                    >
                      <X size={18} />
                      <span>Close</span>
                    </button>
                  </div>
                </div>

                {/* Flat Clean Carousel Cards Deck */}
                <div className="lightbox-deck-container">
                  {property.images.map((imgUrl, idx) => {
                    const total = property.images.length;
                    let diff = idx - activeImageIndex;
                    if (diff > total / 2) diff -= total;
                    if (diff < -total / 2) diff += total;

                    const isCenter = diff === 0;
                    const isPrev = diff === -1;
                    const isNext = diff === 1;
                    const isVisible = Math.abs(diff) <= 1;

                    return (
                      <motion.div
                        key={idx}
                        className={`carousel-card-slot ${isCenter ? 'slot-center' : isPrev ? 'slot-prev' : isNext ? 'slot-next' : 'slot-hidden'}`}
                        animate={{
                          x: diff === 0 ? '0%' : diff === -1 ? '-70%' : diff === 1 ? '70%' : diff < -1 ? '-120%' : '120%',
                          scale: isCenter ? 1 : 0.82,
                          opacity: isCenter ? 1 : isVisible ? 0.38 : 0,
                          zIndex: isCenter ? 10 : isVisible ? 4 : 1
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 260,
                          damping: 28,
                          mass: 0.85
                        }}
                        onClick={() => {
                          if (!isCenter) setActiveImageIndex(idx);
                        }}
                      >
                        <img src={imgUrl} alt={`${property.title} - Plate ${idx + 1}`} className="carousel-card-img" />
                      </motion.div>
                    );
                  })}

                  {/* Left & Right Floating Navigation Control Arrows */}
                  <button 
                    className="lightbox-nav-arrow arrow-prev"
                    onClick={() => setActiveImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length)}
                    type="button"
                    title="Previous Plate (Left Arrow)"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <button 
                    className="lightbox-nav-arrow arrow-next"
                    onClick={() => setActiveImageIndex((prev) => (prev + 1) % property.images.length)}
                    type="button"
                    title="Next Plate (Right Arrow)"
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>

                {/* Bottom Floating Curated Info & Thumbnail Dock */}
                <div className="lightbox-bottom-dock">
                  <div className="dock-meta-row">
                    <div className="dock-title-group">
                      <h3 className="dock-property-title">{property.title}</h3>
                      <div className="dock-sub-tags">
                        <span className="dock-estate">{property.estateName}</span>
                        <span className="dock-dot">•</span>
                        <span className="dock-district">{property.district}</span>
                        <span className="dock-dot">•</span>
                        <span className="dock-badge">Plate {activeImageIndex + 1} of {property.images.length}</span>
                      </div>
                    </div>

                    {/* Interactive Thumbnail Navigation Pills */}
                    <div className="dock-thumbnails-row">
                      {property.images.map((thumb, idx) => (
                        <button
                          key={idx}
                          className={`dock-thumb-btn ${activeImageIndex === idx ? 'active' : ''}`}
                          onClick={() => setActiveImageIndex(idx)}
                          type="button"
                          title={`Jump to Plate ${idx + 1}`}
                        >
                          <img src={thumb} alt={`Thumb ${idx + 1}`} className="dock-thumb-img" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Main Detail Grid: Left Body + Sticky Right Advisory Desk */}
        <div className="detail-layout">
          {/* Left Column Body */}
          <div className="detail-main-col">

            {/* A. Architectural Narrative */}
            <div className="content-section">
              <div className="section-title-wrap">
                <span className="section-eyebrow">{isAr ? 'الملف المعماري الحصري' : 'CURATED MONOGRAPH'}</span>
                <h3 className="section-subtitle">{isAr ? 'وصف العقار والتفاصيل' : 'Property Description'}</h3>
              </div>

              {/* Luxury Key Specification Cards Matrix */}
              <div className="property-spec-matrix-grid">
                {property.beds > 0 && (
                  <div className="spec-stat-card">
                    <div className="spec-stat-icon-wrap">
                      <Bed size={18} className="spec-stat-icon" />
                    </div>
                    <div className="spec-stat-info">
                      <span className="spec-stat-label">{isAr ? 'غرف النوم' : 'BEDROOMS'}</span>
                      <span className="spec-stat-value">{property.beds} {isAr ? 'أجنحة خاصة' : 'Suites'}</span>
                    </div>
                  </div>
                )}
                {property.baths > 0 && (
                  <div className="spec-stat-card">
                    <div className="spec-stat-icon-wrap">
                      <Bath size={18} className="spec-stat-icon" />
                    </div>
                    <div className="spec-stat-info">
                      <span className="spec-stat-label">{isAr ? 'الحمامات' : 'BATHROOMS'}</span>
                      <span className="spec-stat-value">{property.baths} {isAr ? 'حمامات فاخرة' : 'Bathrooms'}</span>
                    </div>
                  </div>
                )}
                {property.sqm > 0 && (
                  <div className="spec-stat-card">
                    <div className="spec-stat-icon-wrap">
                      <Maximize2 size={18} className="spec-stat-icon" />
                    </div>
                    <div className="spec-stat-info">
                      <span className="spec-stat-label">{isAr ? 'مساحة المباني' : 'BUILT-UP AREA'}</span>
                      <span className="spec-stat-value">{property.sqm} {isAr ? 'م²' : 'SQM'}</span>
                    </div>
                  </div>
                )}
                {property.builtYear && (
                  <div className="spec-stat-card">
                    <div className="spec-stat-icon-wrap">
                      <Calendar size={18} className="spec-stat-icon" />
                    </div>
                    <div className="spec-stat-info">
                      <span className="spec-stat-label">{isAr ? 'سنة الإنجاز' : 'COMPLETION'}</span>
                      <span className="spec-stat-value">{isAr ? `تسليم ${property.builtYear}` : `Built in ${property.builtYear}`}</span>
                    </div>
                  </div>
                )}
                {property.propertyType && (
                  <div className="spec-stat-card">
                    <div className="spec-stat-icon-wrap">
                      <Building2 size={18} className="spec-stat-icon" />
                    </div>
                    <div className="spec-stat-info">
                      <span className="spec-stat-label">{isAr ? 'نوع العقار' : 'TYPOLOGY'}</span>
                      <span className="spec-stat-value">{isAr ? (rawProperty.type === 'villa' ? 'فيلا مستقلة' : rawProperty.type === 'apartment' ? 'شقة سكنية' : rawProperty.type === 'duplex' ? 'دوبلكس' : rawProperty.type === 'townhouse' ? 'تاون هاوس' : rawProperty.type === 'chalet' ? 'شاليه' : property.propertyType) : property.propertyType}</span>
                    </div>
                  </div>
                )}
                <div className="spec-stat-card card-highlight-gold">
                  <div className="spec-stat-icon-wrap gold-icon-wrap">
                    <ShieldCheck size={18} className="spec-stat-icon gold-icon" />
                  </div>
                  <div className="spec-stat-info">
                    <span className="spec-stat-label gold-label">{isAr ? 'حالة التوثيق' : 'VERIFICATION'}</span>
                    <span className="spec-stat-value gold-val">{isAr ? 'عقار موثق' : 'Verified Property'}</span>
                  </div>
                </div>
              </div>

              <div className="narrative-text">
                {property.narrative.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="narrative-para">{paragraph}</p>
                ))}
              </div>
            </div>



            {/* C. Interactive Architectural Blueprint & Space Specifications */}
            <ArchitecturalBlueprintInspector 
              zones={rawProperty.spec_layers || []} 
              propertyTitle={property.title} 
              locale={locale} 
              propertyType={rawProperty.type} 
              propertyImages={property.images} 
            />

            {/* D. Location & Surroundings */}
            <div className="content-section">
              <div className="section-title-wrap proximity-header-row">
                <div>
                  <span className="section-eyebrow">{isAr ? 'الموقع والمناطق المحيطة' : 'LOCATION & SURROUNDINGS'}</span>
                  <h3 className="section-subtitle">{isAr ? 'الموقع وسهولة الوصول' : 'Location & Accessibility'}</h3>
                </div>

                <button 
                  className={`gps-locate-btn ${geoStatus === 'locating' ? 'locating' : ''}`}
                  onClick={requestLocation}
                  type="button"
                  title={isAr ? 'حساب المسافة الدقيقة من موقعك الحالي' : 'Calculate travel distance from your current coordinates'}
                >
                  <LocateFixed size={14} className={geoStatus === 'locating' ? 'spin' : ''} />
                  <span>
                    {geoStatus === 'locating' 
                      ? (isAr ? 'جاري تحديد موقعك...' : 'Detecting Location...') 
                      : geoStatus === 'located' 
                        ? (isAr ? 'تم تحديد موقعك' : 'Live Location Set') 
                        : (isAr ? 'احسب المسافة من موقعك' : 'Calculate Distance')}
                  </span>
                </button>
              </div>

              <div className="sanctum-map-and-transit-layout">
                <div className="sanctum-map-col">
                  <SanctumSatelliteMap 
                    lat={property.mapCoordinates.lat} 
                    lng={property.mapCoordinates.lng} 
                    title={property.title} 
                    district={property.district} 
                    isAr={isAr}
                  />
                </div>

                <div className="sanctum-transit-col">
                  {/* Commute Times & Proximity Radar Card attached to Map */}
                  <div className="sidebar-radar-card attached-radar-card">
                    <div className="radar-stack-header">
                      <div>
                        <span className="radar-stack-eyebrow">{isAr ? 'سهولة الوصول والتنقل' : 'CONNECTIVITY & COMMUTE'}</span>
                        <h4 className="radar-stack-title">{isAr ? 'أوقات التنقل التقريبية' : 'Commute Times'}</h4>
                      </div>
                      <span className="radar-stack-status">
                        <span className="live-radar-dot" />
                        {geoStatus === 'located' 
                          ? (isAr ? 'موقعك المباشر' : 'Live GPS') 
                          : (isAr ? 'من وسط القاهرة' : 'From Downtown Cairo')}
                      </span>
                    </div>

                    <div className="radar-cards-list">
                      {travelEstimates.map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <div key={i} className="proximity-card">
                            <div className="poi-icon-box">
                              <Icon size={17} />
                            </div>
                            <div className="poi-info">
                              <div className="poi-mode-row">
                                <span className="poi-mode-title">{item.mode}</span>
                                <span className="poi-time-val">{item.time}</span>
                              </div>
                              <span className="poi-sub-detail">{item.sub}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="radar-stack-footer">
                      <Compass size={13} className="compass-icon" />
                      <span>{isAr ? `وصول مباشر وسريع عبر المحاور الرئيسية في ${property.district}` : `Direct access via ${property.district} main arterials`}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column Sticky Advisory Suite */}
          <aside className="detail-sidebar-col">
            
            {/* Broker & Concierge Card */}
            <div className="broker-card">
              <div className="broker-profile">
                <img src={property.broker.avatar} alt={property.broker.name} className="broker-avatar" />
                <div className="broker-meta">
                  <h3 className="broker-name">{property.broker.name}</h3>
                  <span className="broker-role">{property.broker.role}</span>
                  <span className="broker-stat">Senior Acquisition Lead • 40+ Closed Mansions</span>
                </div>
              </div>

              <div className="broker-action-buttons">
                <a href={`tel:${property.broker.phone}`} className="btn-gold broker-btn">
                  <PhoneCall size={15} />
                  <span>Direct Private Call</span>
                </a>
                <a 
                  href={`https://wa.me/${property.broker.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(property.broker.name)},%20I%20am%20inquiring%20about%20the%20sovereign%20estate:%20${encodeURIComponent(property.title)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-dark broker-btn"
                >
                  <MessageCircle size={15} />
                  <span>Encrypted WhatsApp Desk</span>
                </a>
              </div>
            </div>

            {/* Request Private Viewing Appointment Suite */}
            <div className="viewing-form-card" id="request-viewing-section">
              <div className="viewing-header">
                <span className="viewing-eyebrow">CHAUFFEURED INSPECTION</span>
                <h3 className="viewing-title">Book Private Viewing</h3>
                <p className="viewing-sub">
                  Select your preferred window for an executive chauffeured walkthrough of {property.title}.
                </p>
              </div>

              {!viewingBooked ? (
                <form className="viewing-form" onSubmit={handleBookingSubmit}>
                  
                  {/* Curated Viewing Slot Window */}
                  <div className="viewing-input-group">
                    <label className="viewing-label">INSPECTION WINDOW</label>
                    <div className="viewing-slots-stack">
                      {[
                        { id: 'morning', label: 'Morning Natural Light', time: '11:00 AM - 01:00 PM' },
                        { id: 'sunset', label: 'Golden Sunset Tour', time: '05:30 PM - 07:30 PM' },
                        { id: 'night', label: 'Architectural Lighting Walkthrough', time: '08:00 PM - 09:30 PM' }
                      ].map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          className={`slot-choice-btn ${viewingSlot === slot.id ? 'active' : ''}`}
                          onClick={() => setViewingSlot(slot.id)}
                        >
                          <div className="slot-btn-info">
                            <span className="slot-title">{slot.label}</span>
                            <span className="slot-time">{slot.time}</span>
                          </div>
                          {viewingSlot === slot.id && <CheckCircle size={15} className="slot-check" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="viewing-input-group">
                    <label className="viewing-label">PREFERRED DATE</label>
                    <div className="viewing-input-wrap">
                      <Calendar size={16} className="input-icon" />
                      <input 
                        type="date" 
                        required
                        value={viewingDate}
                        onChange={(e) => setViewingDate(e.target.value)}
                        className="viewing-input"
                      />
                    </div>
                  </div>

                  <button type="submit" className="book-viewing-submit-btn btn-gold">
                    <span>Confirm Private Chauffeur & Viewing</span>
                  </button>
                </form>
              ) : (
                <div className="booking-confirmed-box">
                  <CheckCircle size={38} className="booked-check-icon" />
                  <h4 className="booked-title">Viewing Scheduled</h4>
                  <p className="booked-details">
                    Date: <strong>{viewingDate}</strong><br />
                    Window: <strong>{viewingSlot.toUpperCase()} TOUR</strong>
                  </p>
                  <p className="booked-note">
                    Your concierge will dispatch a private chauffeur to your residence 45 minutes prior to the appointment.
                  </p>
                  <button 
                    className="btn-dark reset-view-btn"
                    onClick={() => setViewingBooked(false)}
                    type="button"
                  >
                    Modify Viewing Window
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* 6. Similar Architectural Statements */}
        <section className="similar-section section-padding">
          <div className="similar-header">
            <span className="eyebrow-gold">RECOMMENDED PROPERTIES</span>
            <h2 className="similar-title">Similar Properties</h2>
          </div>
          <div className="similar-grid">
            {similarProperties.map((p: Property, idx: number) => (
              <PropertyCard
                key={p.id}
                property={p}
                index={idx}
                onSelect={(id) => onSelectProperty(id || p.id || p.slug || '')}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Mobile Sticky Bottom Lead Bar */}
      <div className="mobile-bottom-lead-bar">
        <div className="mobile-lead-price">
          <span className="mlp-val">{formattedPrice}</span>
          <span className="mlp-cur">{property.currency}</span>
        </div>
        <div className="mobile-lead-actions">
          <a 
            href={`https://wa.me/${property.broker.phone.replace(/[^0-9]/g, '')}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="mobile-wa-btn"
            title="WhatsApp Desk"
          >
            <MessageCircle size={18} />
          </a>
          <button 
            className="btn-gold mobile-book-btn"
            onClick={() => {
              document.getElementById('request-viewing-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            type="button"
          >
            Book Viewing
          </button>
        </div>
      </div>

      <style>{`
        .property-detail-view {
          padding-top: 155px;
          padding-bottom: 6rem;
          background: var(--bg-primary);
          min-height: 100vh;
          transition: background var(--transition-smooth);
        }

        /* 1. Above-the-Fold Sovereign Property Header */
        .property-top-header {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.75rem;
          padding-bottom: 1.75rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .header-meta-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-main-hero-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 2.5rem;
        }

        .top-header-left {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          flex: 1;
          min-width: 0;
        }

        .breadcrumb-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .back-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--gold-primary);
          font-weight: 600;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .back-link-btn:hover {
          color: var(--text-primary);
        }

        .crumb-chevron {
          color: var(--text-muted);
        }

        .crumb-text.active {
          color: var(--text-primary);
          font-weight: 600;
        }

        .property-eyebrow-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 0.25rem;
          flex-wrap: wrap;
        }

        .property-compound-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold-primary);
          background: rgba(197, 142, 54, 0.12);
          border: 1px solid var(--gold-border);
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
        }

        .property-id-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
        }

        [data-theme="dark"] .property-id-badge {
          color: #C7D2DF;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        [data-theme="light"] .property-id-badge {
          color: var(--text-secondary);
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .badge-gold-icon {
          color: var(--gold-primary);
        }

        .property-main-title {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 3.5vw, 3rem);
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.025em;
          line-height: 1.15;
          margin: 0;
        }

        .property-location-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9375rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .location-pin {
          color: var(--gold-primary);
        }

        .top-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1.15rem;
          flex-shrink: 0;
        }

        .property-price-card {
          text-align: right;
        }

        .price-label {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--text-muted);
          display: block;
          margin-bottom: 0.25rem;
        }

        .price-value {
          font-family: var(--font-heading);
          font-size: 2.25rem;
          font-weight: 800;
          line-height: 1.1;
          color: var(--gold-primary);
        }

        .price-currency {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--gold-primary);
          opacity: 0.9;
          margin-left: 4px;
        }

        .price-tax-note {
          font-size: 0.6875rem;
          color: var(--text-muted);
          display: block;
          margin-top: 0.25rem;
        }

        .top-action-group {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .top-inquire-btn {
          padding: 0.75rem 1.6rem;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 9999px;
          cursor: pointer;
        }

        .header-icon-actions {
          display: flex;
          gap: 8px;
        }

        .header-icon-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .header-icon-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #C7D2DF;
        }

        [data-theme="light"] .header-icon-btn {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: var(--text-secondary);
        }

        .header-icon-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-primary);
        }

        .header-icon-btn.active {
          color: #0A0C10;
          background: linear-gradient(135deg, #FFF4D4 0%, var(--gold-primary) 50%, var(--gold-dark) 100%);
          border-color: transparent;
        }

        /* 2. Quick Specs Glass Strip */
        .property-quick-specs-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2.25rem;
        }

        .spec-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(18px) saturate(190%);
          -webkit-backdrop-filter: blur(18px) saturate(190%);
          border-radius: 9999px;
          padding: 0.5rem 1.15rem;
          font-size: 0.8125rem;
        }

        [data-theme="dark"] .spec-pill {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #C7D2DF;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        [data-theme="light"] .spec-pill {
          background: rgba(255, 255, 255, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.85);
          color: var(--text-secondary);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1.5px 1.5px #FFFFFF;
        }

        .spec-pill strong {
          color: var(--text-primary);
          font-weight: 700;
        }

        .pill-icon {
          flex-shrink: 0;
        }

        .pill-icon,
        .pill-icon-gold,
        .location-pin {
          color: var(--gold-primary);
        }

        .spec-pill.verified-pill {
          border-color: var(--gold-border);
          background: rgba(197, 142, 54, 0.12);
          color: var(--gold-primary);
        }

        /* 3. Cinematic Gallery Stage with Luxury Ambient Cinema Mode */
        .gallery-section {
          position: relative;
          margin-bottom: 4.5rem;
        }

        /* Ambient Cinema Illumination Projection */
        .gallery-ambient-wrapper {
          position: absolute;
          top: -16px;
          left: -48px;
          right: -48px;
          bottom: 8px;
          pointer-events: none;
          z-index: 0;
          overflow: visible;
          border-radius: 36px;
        }

        .ambient-glow-fade-slot {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        @keyframes auroraDriftAlpha {
          0% {
            transform: scale(1.02) translate(0px, 0px) rotate(0deg);
            filter: blur(56px) saturate(165%) brightness(0.96);
          }
          33% {
            transform: scale(1.06) translate(18px, -10px) rotate(0.8deg);
            filter: blur(66px) saturate(185%) brightness(1.02);
          }
          66% {
            transform: scale(1.03) translate(-16px, 10px) rotate(-0.6deg);
            filter: blur(58px) saturate(165%) brightness(0.95);
          }
          100% {
            transform: scale(1.02) translate(0px, 0px) rotate(0deg);
            filter: blur(56px) saturate(165%) brightness(0.96);
          }
        }

        @keyframes auroraDriftBeta {
          0% {
            transform: scale(1.05) translate(0px, 0px) rotate(0deg);
            opacity: 0.20;
          }
          50% {
            transform: scale(1.10) translate(-14px, -8px) rotate(-1deg);
            opacity: 0.40;
          }
          100% {
            transform: scale(1.05) translate(0px, 0px) rotate(0deg);
            opacity: 0.20;
          }
        }

        .ambient-aurora-mesh {
          position: absolute;
          inset: -8px -32px -8px -32px;
          background-size: cover;
          background-position: center;
          border-radius: 36px;
          will-change: transform, filter, opacity;
          pointer-events: none;
        }

        .ambient-aurora-mesh.mesh-alpha {
          opacity: 0.45;
          animation: auroraDriftAlpha 7.5s infinite ease-in-out;
        }

        .ambient-aurora-mesh.mesh-beta {
          animation: auroraDriftBeta 10s infinite ease-in-out;
          filter: blur(72px) saturate(175%) brightness(0.94);
        }

        [data-theme="light"] .ambient-aurora-mesh.mesh-alpha {
          filter: blur(64px) saturate(185%) brightness(1.03) contrast(1.02);
          opacity: 0.38;
        }

        [data-theme="light"] .ambient-aurora-mesh.mesh-beta {
          filter: blur(82px) saturate(165%) brightness(1.04) contrast(1.01);
          opacity: 0.20;
        }

        .main-image-frame {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 540px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
          margin-bottom: 1.25rem;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
          background: #080A0E;
          cursor: pointer;
        }

        .main-hero-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          will-change: opacity;
        }

        .gallery-stage-overlay {
          position: absolute;
          bottom: 1.25rem;
          left: 1.25rem;
          right: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 2;
          pointer-events: none;
        }

        .gallery-counter-pill {
          background: rgba(10, 14, 22, 0.8);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          padding: 0.45rem 1.15rem;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #DDA752;
        }

        .gallery-actions-right {
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: auto;
        }

        .gallery-ambient-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(24px) saturate(210%);
          -webkit-backdrop-filter: blur(24px) saturate(210%);
          border-radius: 9999px;
          padding: 0.55rem 1.25rem;
          font-family: var(--font-heading);
          font-size: 0.8125rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45), 0 0 14px rgba(221, 167, 82, 0.2), inset 0 1px 1.5px rgba(255, 255, 255, 0.3);
        }

        [data-theme="dark"] .gallery-ambient-btn {
          background: rgba(8, 12, 20, 0.92);
          border: 1.5px solid rgba(221, 167, 82, 0.55);
          color: #FFFFFF;
        }

        [data-theme="light"] .gallery-ambient-btn {
          background: rgba(255, 255, 255, 0.96);
          border: 1.5px solid rgba(184, 134, 11, 0.55);
          color: #0D1117;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.14), inset 0 1.5px 1.5px #FFFFFF;
        }

        .gallery-ambient-btn:hover {
          transform: translateY(-2px) scale(1.03);
          border-color: var(--gold-primary, #DDA752);
          box-shadow: 0 8px 24px rgba(221, 167, 82, 0.4), 0 0 16px rgba(221, 167, 82, 0.3);
        }

        .gallery-ambient-btn.active {
          border-color: var(--gold-primary, #DDA752);
          background: linear-gradient(135deg, rgba(221, 167, 82, 0.32) 0%, rgba(10, 14, 24, 0.96) 100%);
          color: #FFF0C2;
          box-shadow: 0 0 22px rgba(221, 167, 82, 0.45), inset 0 1px 1.5px rgba(255, 255, 255, 0.4);
        }

        [data-theme="light"] .gallery-ambient-btn.active {
          background: linear-gradient(135deg, #FFF5DB 0%, #FFFFFF 100%);
          border-color: #B8860B;
          color: #7A5200;
          box-shadow: 0 4px 20px rgba(184, 134, 11, 0.28), inset 0 1.5px 1.5px #FFFFFF;
        }

        .ambient-sparkle-icon {
          color: var(--gold-primary, #DDA752);
          flex-shrink: 0;
          filter: drop-shadow(0 0 6px rgba(221, 167, 82, 0.8));
        }

        [data-theme="light"] .ambient-sparkle-icon {
          color: #B8860B;
        }

        .ambient-dot-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .ambient-dot-pulse.active {
          background: #10B981;
          box-shadow: 0 0 10px #10B981, 0 0 4px #FFFFFF;
          animation: livePulse 2s infinite ease-in-out;
        }

        .ambient-dot-pulse.off {
          background: #64748B;
          opacity: 0.5;
        }

        .gallery-fullscreen-btn {
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(10, 14, 22, 0.8);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          padding: 0.45rem 1.15rem;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 700;
          color: #ffffff;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .gallery-fullscreen-btn:hover {
          border-color: #DDA752;
          color: #DDA752;
        }

        .gallery-nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(10, 14, 22, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          z-index: 3;
        }

        .gallery-nav-arrow:hover {
          background: rgba(221, 167, 82, 0.25);
          color: #DDA752;
          border-color: #DDA752;
        }

        .arrow-left { left: 1.25rem; }
        .arrow-right { right: 1.25rem; }

        .thumbnails-strip {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 1rem;
        }

        .thumb-item {
          height: 100px;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
          opacity: 0.6;
          background: #0E121A;
        }

        .thumb-item:hover {
          opacity: 0.95;
          transform: translateY(-2px);
        }

        .thumb-item.active {
          border-color: var(--gold-primary);
          opacity: 1;
          box-shadow: 0 0 24px var(--gold-glow);
        }

        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* 4. Fullscreen 3D Liquid Carousel Stage */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          overflow: hidden;
          transition: background var(--transition-smooth);
        }

        [data-theme="dark"] .lightbox-overlay {
          background: rgba(5, 7, 12, 0.94);
        }

        [data-theme="light"] .lightbox-overlay {
          background: rgba(245, 247, 250, 0.94);
        }

        .lightbox-ambient-fade-slot {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        @keyframes lightboxAurora1 {
          0% {
            transform: scale(1.05) translate(0px, 0px) rotate(0deg);
          }
          33% {
            transform: scale(1.10) translate(18px, -10px) rotate(0.8deg);
          }
          66% {
            transform: scale(1.07) translate(-16px, 10px) rotate(-0.6deg);
          }
          100% {
            transform: scale(1.05) translate(0px, 0px) rotate(0deg);
          }
        }

        @keyframes lightboxAurora2 {
          0% {
            transform: scale(1.08) translate(0px, 0px) rotate(0deg);
            opacity: 0.18;
          }
          50% {
            transform: scale(1.14) translate(-14px, -10px) rotate(-1deg);
            opacity: 0.38;
          }
          100% {
            transform: scale(1.08) translate(0px, 0px) rotate(0deg);
            opacity: 0.18;
          }
        }

        .lightbox-aurora-mesh {
          position: absolute;
          inset: 3% -8% 3% -8%;
          background-size: cover;
          background-position: center;
          border-radius: 48px;
          pointer-events: none;
          will-change: transform, opacity;
        }

        .lightbox-aurora-mesh.mesh-alpha {
          filter: blur(75px) saturate(180%) brightness(0.96);
          opacity: 0.45;
          animation: lightboxAurora1 8s infinite ease-in-out;
        }

        .lightbox-aurora-mesh.mesh-beta {
          filter: blur(88px) saturate(160%) brightness(0.92);
          animation: lightboxAurora2 10.5s infinite ease-in-out;
        }

        [data-theme="light"] .lightbox-aurora-mesh.mesh-alpha {
          filter: blur(85px) saturate(185%) brightness(1.03);
          opacity: 0.38;
        }

        [data-theme="light"] .lightbox-aurora-mesh.mesh-beta {
          filter: blur(105px) saturate(165%) brightness(1.04);
          opacity: 0.18;
        }

        @media (prefers-reduced-motion: reduce) {
          .ambient-glow-layer,
          .lightbox-ambient-glow {
            animation: none !important;
          }
        }

        .lightbox-carousel-stage {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1380px;
          height: 92vh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }

        /* Top Header Bar */
        .lightbox-top-bar {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          border-radius: 9999px;
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          z-index: 20;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .lightbox-top-bar {
          background: rgba(18, 24, 38, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.20);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.28);
        }

        [data-theme="light"] .lightbox-top-bar {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06), inset 0 1.5px 2px #FFFFFF;
        }

        .lightbox-top-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .lightbox-dossier-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--gold-primary);
          text-transform: uppercase;
        }

        [data-theme="light"] .lightbox-dossier-tag {
          color: #B8860B;
        }

        .tag-gold-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        [data-theme="light"] .tag-gold-icon {
          color: #B8860B;
        }

        .lightbox-counter-pill {
          background: rgba(197, 142, 54, 0.15);
          border: 1px solid var(--gold-border);
          border-radius: 9999px;
          padding: 0.25rem 0.75rem;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--gold-primary);
        }

        [data-theme="light"] .lightbox-counter-pill {
          background: rgba(184, 134, 11, 0.12);
          border-color: rgba(184, 134, 11, 0.35);
          color: #B8860B;
        }

        .lightbox-close-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 9999px;
          padding: 0.45rem 1rem;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .lightbox-close-btn {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: #FFFFFF;
        }

        [data-theme="light"] .lightbox-close-btn {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.10);
          color: #0F172A;
        }

        .lightbox-close-btn:hover {
          background: rgba(221, 167, 82, 0.25);
          border-color: var(--gold-primary);
          color: var(--gold-primary);
        }

        /* Carousel Cards Deck */
        .lightbox-deck-container {
          position: relative;
          width: 100%;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          margin: 0.75rem 0;
        }

        .carousel-card-slot {
          position: absolute;
          width: 72vw;
          max-width: 960px;
          height: 58vh;
          max-height: 600px;
          border-radius: 24px;
          overflow: hidden;
          will-change: transform, opacity;
          cursor: pointer;
          transition: border-color var(--transition-fast), box-shadow var(--transition-smooth), opacity var(--transition-fast);
        }

        [data-theme="dark"] .carousel-card-slot {
          background: #080A0E;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
        }

        [data-theme="light"] .carousel-card-slot {
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
        }

        .carousel-card-slot:not(.slot-center):hover {
          opacity: 0.65 !important;
        }

        .carousel-card-slot.slot-center {
          cursor: default;
          border-color: rgba(221, 167, 82, 0.6);
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.85), 0 0 28px var(--gold-glow);
        }

        [data-theme="light"] .carousel-card-slot.slot-center {
          border: 2.5px solid var(--gold-primary);
          box-shadow: 0 32px 80px rgba(15, 23, 42, 0.18), 0 0 32px rgba(197, 142, 54, 0.35);
        }

        .carousel-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Floating Nav Arrows */
        .lightbox-nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 52px;
          height: 52px;
          border-radius: 50%;
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          z-index: 30;
        }

        [data-theme="dark"] .lightbox-nav-arrow {
          background: rgba(18, 24, 38, 0.48);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
        }

        [data-theme="light"] .lightbox-nav-arrow {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.10);
          color: #0F172A;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
        }

        .lightbox-nav-arrow:hover {
          background: var(--gold-primary);
          color: #0A0C10;
          border-color: var(--gold-primary);
          box-shadow: 0 0 20px var(--gold-glow);
          transform: translateY(-50%) scale(1.08);
        }

        .lightbox-nav-arrow.arrow-prev {
          left: 2rem;
        }

        .lightbox-nav-arrow.arrow-next {
          right: 2rem;
        }

        /* Bottom Floating Curated Info & Thumbnail Dock */
        .lightbox-bottom-dock {
          width: 100%;
          border-radius: 24px;
          padding: 0.9rem 1.5rem;
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          z-index: 20;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .lightbox-bottom-dock {
          background: rgba(18, 24, 38, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.20);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.28);
        }

        [data-theme="light"] .lightbox-bottom-dock {
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.07), inset 0 1.5px 2px #FFFFFF;
        }

        .dock-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .dock-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dock-property-title {
          font-family: var(--font-heading);
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0;
        }

        [data-theme="dark"] .dock-property-title {
          color: #FFFFFF;
        }

        [data-theme="light"] .dock-property-title {
          color: #0F172A;
          font-weight: 800;
        }

        .dock-sub-tags {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
        }

        .dock-estate,
        .dock-district {
          color: var(--gold-primary);
          font-weight: 600;
        }

        [data-theme="light"] .dock-estate,
        [data-theme="light"] .dock-district {
          color: #B8860B;
          font-weight: 700;
        }

        .dock-dot {
          color: var(--text-muted);
          opacity: 0.6;
        }

        .dock-badge {
          color: var(--text-secondary);
          font-weight: 500;
        }

        [data-theme="light"] .dock-badge {
          color: #475569;
          font-weight: 600;
        }

        .dock-thumbnails-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dock-thumb-btn {
          width: 54px;
          height: 38px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          opacity: 0.5;
          padding: 0;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .dock-thumb-btn {
          background: #0E121A;
        }

        [data-theme="light"] .dock-thumb-btn {
          background: #E2E8F0;
          opacity: 0.6;
        }

        .dock-thumb-btn:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }

        .dock-thumb-btn.active {
          border-color: var(--gold-primary);
          opacity: 1;
          box-shadow: 0 0 14px var(--gold-glow);
          transform: translateY(-2px);
        }

        [data-theme="light"] .dock-thumb-btn.active {
          border-color: #B8860B;
          box-shadow: 0 0 16px rgba(184, 134, 11, 0.4);
        }

        .dock-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* 5. Detail Layout */
        .detail-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 3.5rem;
          align-items: start;
          margin-bottom: 5rem;
        }

        .detail-main-col {
          min-width: 0;
          max-width: 100%;
          display: flex;
          flex-direction: column;
        }

        .detail-sidebar-col {
          position: sticky;
          top: 110px;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .content-section {
          margin-bottom: 4rem;
          width: 100%;
          min-width: 0;
        }

        .section-title-wrap {
          margin-bottom: 1.5rem;
        }

        .section-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: var(--gold-primary);
          text-transform: uppercase;
          display: block;
          margin-bottom: 0.35rem;
        }

        [data-theme="light"] .section-eyebrow {
          color: #B8860B;
        }

        .section-subtitle {
          font-family: var(--font-heading);
          font-size: 1.65rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin: 0;
        }

        .narrative-text {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .narrative-para {
          font-size: 1rem;
          color: var(--text-secondary);
          line-height: 1.75;
        }

        /* Luxury Key Specification Cards Matrix */
        .property-spec-matrix-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.9rem;
          margin-bottom: 2rem;
          padding-bottom: 1.75rem;
          border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
        }

        .spec-stat-card {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          padding: 0.9rem 1.15rem;
          border-radius: 16px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        [data-theme="dark"] .spec-stat-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.08);
        }

        [data-theme="dark"] .spec-stat-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(221, 167, 82, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 12px rgba(221, 167, 82, 0.15);
        }

        [data-theme="light"] .spec-stat-card {
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.07);
          box-shadow: 0 4px 16px rgba(30, 24, 16, 0.05);
        }

        [data-theme="light"] .spec-stat-card:hover {
          border-color: rgba(184, 134, 11, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(30, 24, 16, 0.08);
        }

        .spec-stat-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(221, 167, 82, 0.1);
          border: 1px solid rgba(221, 167, 82, 0.25);
        }

        .spec-stat-icon {
          color: var(--gold-primary, #DDA752);
        }

        [data-theme="light"] .spec-stat-icon-wrap {
          background: rgba(184, 134, 11, 0.08);
          border-color: rgba(184, 134, 11, 0.2);
        }

        [data-theme="light"] .spec-stat-icon {
          color: #B8860B;
        }

        .spec-stat-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .spec-stat-label {
          font-family: var(--font-heading);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold-primary, #DDA752);
          opacity: 0.85;
        }

        [data-theme="light"] .spec-stat-label {
          color: #B8860B;
        }

        .spec-stat-value {
          font-family: var(--font-heading);
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Gold highlighted card */
        [data-theme="dark"] .spec-stat-card.card-highlight-gold {
          background: linear-gradient(135deg, rgba(221, 167, 82, 0.12) 0%, rgba(255, 255, 255, 0.03) 100%);
          border-color: rgba(221, 167, 82, 0.35);
        }

        [data-theme="dark"] .spec-stat-card.card-highlight-gold .gold-val {
          color: #FCD34D;
        }

        [data-theme="light"] .spec-stat-card.card-highlight-gold {
          background: linear-gradient(135deg, rgba(255, 246, 224, 0.9) 0%, #FFFFFF 100%);
          border-color: rgba(184, 134, 11, 0.35);
        }

        [data-theme="light"] .spec-stat-card.card-highlight-gold .gold-val {
          color: #7A5200;
        }

        @media (max-width: 900px) {
          .property-spec-matrix-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 550px) {
          .property-spec-matrix-grid {
            grid-template-columns: 1fr;
          }
        }

        [data-theme="light"] .spec-feature-pill {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #475569;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04), inset 0 1px 1px #FFFFFF;
        }

        [data-theme="light"] .spec-feature-pill:hover {
          background: #FFFFFF;
          border-color: rgba(212, 160, 52, 0.4);
          color: #0D1117;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        }

        [data-theme="light"] .spec-feature-pill strong {
          color: #0D1117;
          font-weight: 700;
        }

        [data-theme="light"] .spec-feature-pill .spec-pill-icon {
          color: #B8860B;
        }

        [data-theme="light"] .spec-feature-pill.pill-highlight-gold {
          background: rgba(212, 160, 52, 0.08);
          border-color: rgba(212, 160, 52, 0.35);
          box-shadow: 0 2px 10px rgba(212, 160, 52, 0.1), inset 0 1px 1px #FFFFFF;
        }

        [data-theme="light"] .spec-feature-pill.pill-highlight-gold strong {
          color: #996515;
        }

        [data-theme="light"] .spec-feature-pill.pill-highlight-gold .spec-pill-icon-gold {
          color: #B8860B;
        }

        /* Specification Matrix */
        .spec-matrix-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        .spec-matrix-card {
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border-radius: 20px;
          padding: 1.75rem 1.5rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .spec-matrix-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55);
        }

        [data-theme="light"] .spec-matrix-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.48) 0%,
            rgba(255, 255, 255, 0.28) 50%,
            rgba(255, 255, 255, 0.38) 100%
          );
          backdrop-filter: blur(14px) saturate(180%) contrast(102%);
          -webkit-backdrop-filter: blur(14px) saturate(180%) contrast(102%);
          border: 1px solid rgba(255, 255, 255, 0.65);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.06), inset 0 1.5px 2px #FFFFFF;
        }

        .spec-matrix-header {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 1rem;
          padding-bottom: 0.65rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .spec-matrix-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .spec-matrix-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .spec-check-gold {
          color: var(--gold-primary);
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* Calculator Glass Card */
        .calculator-glass-card {
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border-radius: 24px;
          padding: 2.25rem 2rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .calculator-glass-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55);
        }

        [data-theme="light"] .calculator-glass-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.48) 0%,
            rgba(255, 255, 255, 0.28) 50%,
            rgba(255, 255, 255, 0.38) 100%
          );
          backdrop-filter: blur(14px) saturate(180%) contrast(102%);
          -webkit-backdrop-filter: blur(14px) saturate(180%) contrast(102%);
          border: 1px solid rgba(255, 255, 255, 0.65);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.06), inset 0 1.5px 2px #FFFFFF;
        }

        .calc-mode-toggle {
          display: flex;
          gap: 0.75rem;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        [data-theme="dark"] .calc-mode-toggle {
          background: rgba(0, 0, 0, 0.35);
        }

        [data-theme="light"] .calc-mode-toggle {
          background: rgba(0, 0, 0, 0.04);
        }

        .calc-toggle-btn {
          flex: 1;
          padding: 0.65rem 1rem;
          font-family: var(--font-heading);
          font-size: 0.8125rem;
          font-weight: 700;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .calc-toggle-btn.active {
          background: rgba(197, 142, 54, 0.2);
          color: var(--gold-primary);
          border: 1px solid var(--gold-border);
        }

        .calc-body-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 2.5rem;
          align-items: center;
        }

        .calc-input-group {
          margin-bottom: 1.5rem;
        }

        .calc-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .calc-val-badge {
          color: var(--gold-primary);
          font-weight: 700;
          font-size: 0.8125rem;
        }

        .calc-range-slider {
          width: 100%;
          accent-color: var(--gold-primary);
          cursor: pointer;
        }

        .tenure-pills-row {
          display: flex;
          gap: 0.5rem;
        }

        .tenure-pill {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .tenure-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        [data-theme="light"] .tenure-pill {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: var(--text-primary);
        }

        .tenure-pill.active {
          background: var(--gold-primary);
          color: #0A0C10;
          border-color: var(--gold-primary);
          font-weight: 700;
        }

        .calc-summary-col {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-radius: 16px;
          padding: 1.5rem;
        }

        [data-theme="dark"] .calc-summary-col {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        [data-theme="light"] .calc-summary-col {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .calc-stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .calc-stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .calc-stat-value {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .calc-stat-value.gold-text {
          color: var(--gold-primary);
        }

        .calc-stat-value.sub-val {
          font-size: 1rem;
          color: var(--text-secondary);
        }

        .calc-cash-summary {
          border-radius: 16px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        [data-theme="dark"] .calc-cash-summary {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(221, 167, 82, 0.25);
        }

        [data-theme="light"] .calc-cash-summary {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid var(--gold-border);
        }

        .cash-price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .cash-orig-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .cash-full-val {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 800;
          color: var(--gold-primary);
        }

        .cash-benefits-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(197, 142, 54, 0.12);
          border: 1px solid var(--gold-border);
          border-radius: 9999px;
          padding: 0.45rem 1.15rem;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--gold-primary);
        }

        .gold-check {
          color: var(--gold-primary);
        }

        .cash-terms-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .cash-term-pill {
          display: flex;
          flex-direction: column;
          gap: 3px;
          border-radius: 12px;
          padding: 0.85rem 1rem;
        }

        [data-theme="dark"] .cash-term-pill {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        [data-theme="light"] .cash-term-pill {
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .term-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .term-val {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .cash-note {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          font-style: italic;
          margin: 0;
        }

        /* Location Sanctum Satellite Map */
        .proximity-header-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .gps-locate-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(197, 142, 54, 0.12);
          border: 1px solid var(--gold-border);
          border-radius: 9999px;
          padding: 0.45rem 1rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--gold-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .gps-locate-btn:hover {
          background: rgba(197, 142, 54, 0.22);
          border-color: var(--gold-primary);
          color: var(--text-primary);
        }

        .gps-locate-btn.locating {
          opacity: 0.75;
        }

        .spin {
          animation: spin 1.2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .sanctum-map-frame {
          position: relative;
          width: 100%;
          height: 440px;
          border-radius: 24px;
          overflow: hidden;
          background: #080A0E;
          margin-bottom: 1.5rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .sanctum-map-frame {
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.2);
        }

        [data-theme="light"] .sanctum-map-frame {
          border: 1px solid rgba(184, 133, 48, 0.22);
          box-shadow: 0 10px 28px rgba(30, 24, 16, 0.05), 0 2px 6px rgba(0, 0, 0, 0.02);
        }

        .sanctum-inner-vignette {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          pointer-events: none;
          z-index: 100;
          box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.25);
        }

        .sanctum-leaflet-container {
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .sanctum-overlay-badge {
          position: absolute;
          top: 1.25rem;
          left: 1.25rem;
          z-index: 500;
          display: flex;
          flex-direction: column;
          gap: 3px;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-radius: 12px;
          padding: 0.55rem 0.95rem;
          pointer-events: none;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .sanctum-overlay-badge {
          background: rgba(10, 14, 22, 0.85);
          border: 1px solid rgba(221, 167, 82, 0.4);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        }

        [data-theme="light"] .sanctum-overlay-badge {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(184, 133, 48, 0.25);
          box-shadow: 0 8px 24px rgba(30, 24, 16, 0.08), inset 0 1px 1px #FFFFFF;
        }

        .sanctum-badge-mode {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--gold-primary);
          text-transform: uppercase;
        }

        .sanctum-badge-coords {
          font-size: 0.75rem;
          font-weight: 600;
        }

        [data-theme="dark"] .sanctum-badge-coords {
          color: #ffffff;
        }

        [data-theme="light"] .sanctum-badge-coords {
          color: #0D1117;
        }

        /* Custom Marker */
        .sanctum-pin-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .sanctum-pin-core {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #DDA752;
          border: 3px solid #0A0C10;
          box-shadow: 0 0 18px rgba(221, 167, 82, 0.9);
          z-index: 2;
        }

        .sanctum-beacon-pulse {
          position: absolute;
          top: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(221, 167, 82, 0.4);
          animation: sanctumPulse 2s infinite ease-out;
          transform: translateY(-8px);
          z-index: 1;
        }

        @keyframes sanctumPulse {
          0% { transform: translateY(-8px) scale(0.5); opacity: 1; }
          100% { transform: translateY(-8px) scale(2.2); opacity: 0; }
        }

        .sanctum-pin-tag {
          background: rgba(10, 14, 22, 0.92);
          border: 1px solid var(--gold-primary, #DDA752);
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
          -webkit-backdrop-filter: blur(8px);
        }

        .sanctum-map-frame .leaflet-control-zoom {
          border: none !important;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 1.25rem !important;
          margin-right: 1.25rem !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .sanctum-map-frame .leaflet-control-zoom a {
          background: rgba(10, 14, 22, 0.85) !important;
          color: var(--gold-primary, #DDA752) !important;
          border: 1px solid rgba(221, 167, 82, 0.3) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: all 0.2s ease;
        }

        .sanctum-map-frame .leaflet-control-zoom a:hover {
          background: var(--gold-primary, #DDA752) !important;
          color: #0A0C10 !important;
        }

        [data-theme="light"] .sanctum-map-frame .leaflet-control-zoom a {
          background: rgba(255, 255, 255, 0.92) !important;
          color: #B8860B !important;
          border: 1px solid rgba(184, 133, 48, 0.3) !important;
        }

        [data-theme="light"] .sanctum-map-frame .leaflet-control-zoom a:hover {
          background: #B8860B !important;
          color: #FFFFFF !important;
        }

        /* Location Sanctum Map & Attached Transit Sidebar */
        .sanctum-map-and-transit-layout {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1.5rem;
          align-items: stretch;
          margin-top: 1rem;
        }

        .sanctum-map-col {
          min-width: 0;
        }

        .sanctum-transit-col {
          min-width: 0;
          display: flex;
        }

        .attached-radar-card {
          width: 100%;
          margin: 0 !important;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .attached-radar-card .radar-cards-list {
          flex: 1;
        }

        @media (max-width: 1024px) {
          .sanctum-map-and-transit-layout {
            grid-template-columns: 1fr;
          }
        }

        /* Sidebar Radar Card */
        .sidebar-radar-card {
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border-radius: 24px;
          padding: 1.85rem 1.65rem;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .sidebar-radar-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55);
        }

        [data-theme="light"] .sidebar-radar-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.48) 0%,
            rgba(255, 255, 255, 0.28) 50%,
            rgba(255, 255, 255, 0.38) 100%
          );
          backdrop-filter: blur(14px) saturate(180%) contrast(102%);
          -webkit-backdrop-filter: blur(14px) saturate(180%) contrast(102%);
          border: 1px solid rgba(255, 255, 255, 0.65);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.06), inset 0 1.5px 2px #FFFFFF;
        }

        .radar-stack-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(212, 160, 52, 0.2);
        }

        .radar-stack-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--gold-primary);
          text-transform: uppercase;
          display: block;
          margin-bottom: 0.2rem;
        }

        [data-theme="light"] .radar-stack-eyebrow {
          color: #B8860B;
        }

        .radar-stack-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .radar-stack-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
          padding: 0.25rem 0.6rem;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .live-radar-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 8px #10B981;
        }

        .radar-cards-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .proximity-card {
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 14px;
          padding: 0.95rem 1.1rem;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .proximity-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .proximity-card {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 2px 8px rgba(30, 24, 16, 0.03);
        }

        .proximity-card:hover {
          border-color: var(--gold-primary);
          transform: translateX(2px);
        }

        .poi-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(197, 142, 54, 0.15);
          color: var(--gold-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        [data-theme="light"] .poi-icon-box {
          background: rgba(184, 134, 11, 0.1);
          color: #B8860B;
        }

        .poi-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .poi-mode-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .poi-mode-title {
          font-family: var(--font-heading);
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .poi-time-val {
          font-family: var(--font-heading);
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--gold-primary);
        }

        [data-theme="light"] .poi-time-val {
          color: #B8860B;
        }

        .poi-sub-detail {
          font-size: 0.72rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .radar-stack-footer {
          display: flex;
          align-items: center;
          gap: 7px;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(212, 160, 52, 0.15);
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .compass-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        [data-theme="light"] .compass-icon {
          color: #B8860B;
        }

        /* Sidebar Styles */
        .detail-sidebar-col {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          position: sticky;
          top: 110px;
        }

        .broker-card {
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border-radius: 24px;
          padding: 2rem 1.75rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .broker-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55);
        }

        [data-theme="light"] .broker-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.48) 0%,
            rgba(255, 255, 255, 0.28) 50%,
            rgba(255, 255, 255, 0.38) 100%
          );
          backdrop-filter: blur(14px) saturate(180%) contrast(102%);
          -webkit-backdrop-filter: blur(14px) saturate(180%) contrast(102%);
          border: 1px solid rgba(255, 255, 255, 0.65);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.06), inset 0 1.5px 2px #FFFFFF;
        }

        .broker-profile {
          display: flex;
          align-items: center;
          gap: 1.15rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 1.25rem;
        }

        .broker-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--gold-primary);
        }

        .broker-name {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 2px 0;
        }

        .broker-role {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--gold-primary);
          display: block;
        }

        .broker-stat {
          font-size: 0.6875rem;
          color: var(--text-secondary);
          display: block;
          margin-top: 2px;
        }

        .broker-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .broker-btn {
          width: 100%;
          padding: 0.85rem;
          font-size: 0.875rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 12px;
          text-decoration: none;
          cursor: pointer;
        }

        .btn-dark {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          transition: all var(--transition-fast);
        }

        .btn-dark:hover {
          border-color: var(--gold-primary);
          color: var(--gold-primary);
        }

        /* Viewing Form Card */
        .viewing-form-card {
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border-radius: 24px;
          padding: 2.25rem 1.85rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .viewing-form-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55);
        }

        [data-theme="light"] .viewing-form-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.48) 0%,
            rgba(255, 255, 255, 0.28) 50%,
            rgba(255, 255, 255, 0.38) 100%
          );
          backdrop-filter: blur(14px) saturate(180%) contrast(102%);
          -webkit-backdrop-filter: blur(14px) saturate(180%) contrast(102%);
          border: 1px solid rgba(255, 255, 255, 0.65);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.06), inset 0 1.5px 2px #FFFFFF;
        }

        .viewing-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--gold-primary);
          text-transform: uppercase;
          display: block;
          margin-bottom: 0.25rem;
        }

        .viewing-title {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .viewing-sub {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        .viewing-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .viewing-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .viewing-label {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .viewing-slots-stack {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .slot-choice-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .slot-choice-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .slot-choice-btn {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .slot-choice-btn:hover {
          border-color: var(--gold-border);
        }

        .slot-choice-btn.active {
          background: rgba(197, 142, 54, 0.15);
          border-color: var(--gold-primary);
        }

        .slot-btn-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .slot-title {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .slot-time {
          font-size: 0.6875rem;
          color: var(--text-muted);
        }

        .slot-check {
          color: var(--gold-primary);
        }

        .viewing-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .viewing-input-wrap .input-icon {
          position: absolute;
          left: 14px;
          color: var(--gold-primary);
          pointer-events: none;
          z-index: 2;
        }

        .viewing-input {
          width: 100%;
          border-radius: 10px;
          padding: 0.75rem 1rem 0.75rem 2.65rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color var(--transition-fast), background var(--transition-fast);
        }

        [data-theme="dark"] .viewing-input {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          color-scheme: dark;
        }

        [data-theme="light"] .viewing-input {
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.12);
          color: var(--text-primary);
          color-scheme: light;
        }

        .viewing-input:focus {
          border-color: var(--gold-primary);
        }

        .book-viewing-submit-btn {
          margin-top: 0.5rem;
          width: 100%;
          height: 48px;
          padding: 0 1.25rem;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 12px;
          cursor: pointer;
        }

        /* Booking Confirmed State */
        .booking-confirmed-box {
          text-align: center;
          padding: 1rem 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .booked-check-icon {
          color: var(--gold-primary);
        }

        .booked-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .booked-details {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          background: rgba(197, 142, 54, 0.1);
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid var(--gold-border);
          width: 100%;
          line-height: 1.5;
        }

        .booked-note {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .reset-view-btn {
          margin-top: 0.5rem;
          width: 100%;
          padding: 0.65rem;
          font-size: 0.8125rem;
        }

        /* Similar Section */
        .similar-section {
          border-top: 1px solid var(--border-subtle);
          margin-top: 2.25rem;
          padding-top: 2.25rem;
        }

        .similar-header {
          margin-bottom: 2rem;
        }

        .eyebrow-gold {
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: var(--gold-primary);
          text-transform: uppercase;
          display: inline-block;
        }

        [data-theme="light"] .eyebrow-gold {
          color: #B8860B;
        }

        [data-theme="dark"] .eyebrow-gold {
          color: #F5D382;
        }

        .similar-title {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 3vw, 2.5rem);
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.025em;
          margin-top: 0.35rem;
        }

        .similar-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        /* Mobile Sticky Lead Bar */
        .mobile-bottom-lead-bar {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 99;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          padding: 0.875rem 1.25rem;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        [data-theme="dark"] .mobile-bottom-lead-bar {
          background: rgba(9, 12, 18, 0.95);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.6);
        }

        [data-theme="light"] .mobile-bottom-lead-bar {
          background: rgba(255, 255, 255, 0.96);
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.08);
        }

        .mobile-lead-price {
          display: flex;
          flex-direction: column;
        }

        .mlp-val {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--gold-primary);
          line-height: 1.1;
        }

        .mlp-cur {
          font-size: 0.6875rem;
          color: var(--text-muted);
        }

        .mobile-lead-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .mobile-wa-btn {
          width: 42px;
          height: 42px;
          border-radius: 8px;
          background: rgba(197, 142, 54, 0.12);
          border: 1px solid var(--gold-border);
          color: var(--gold-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-book-btn {
          padding: 0.6875rem 1.25rem;
          font-size: 0.875rem;
          white-space: nowrap;
          border-radius: 8px;
        }

        @media (max-width: 1024px) {
          .detail-layout {
            grid-template-columns: 1fr;
          }
          .detail-sidebar-col {
            position: static;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }
          .main-image-frame {
            height: 440px;
          }
          .sanctum-map-frame {
            height: 360px;
          }
          .similar-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .header-meta-top-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .header-main-hero-row {
            flex-direction: column;
            gap: 1.5rem;
          }
          .top-header-right {
            align-items: flex-start;
            width: 100%;
          }
          .property-price-card {
            text-align: left;
          }
          .thumbnails-strip {
            grid-template-columns: repeat(3, 1fr);
          }
          .detail-sidebar-col {
            grid-template-columns: 1fr;
          }
          .spec-matrix-grid {
            grid-template-columns: 1fr;
          }
          .legal-dossier-grid {
            grid-template-columns: 1fr;
          }
          .calc-body-grid {
            grid-template-columns: 1fr;
          }
          .similar-grid {
            grid-template-columns: 1fr;
          }
          .main-image-frame {
            height: 320px;
          }
          .mobile-bottom-lead-bar {
            display: flex;
          }
          .property-detail-view {
            padding-bottom: 7rem;
          }
        }
      `}</style>
    </div>
  );
};
