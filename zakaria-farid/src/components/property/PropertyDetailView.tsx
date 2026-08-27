'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}
import { Property } from '@/types';
import { useRouter } from 'next/navigation';
import { triggerNavigationStart } from '@/components/NavigationProgress';
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';
import { adaptProperties, cleanHtmlToPlainText, decodeHtmlEntities } from '@/lib/utils/propertyAdapter';
import { PropertyCard } from './PropertyCard';
import ArchitecturalBlueprintInspector from './ArchitecturalBlueprintInspector';
import ViewingScheduler from './ViewingScheduler';
import { InquiryModal } from '@/components/InquiryModal';
import { useFavorites } from '@/lib/context/FavoritesContext';
import { toast } from 'sonner';
import { createCachedTileLayer } from '@/lib/mapCache';
import { 
  Bed, 
  Bath, 
  Maximize2, 
  Calendar, 
  Building2, 
  MapPin,
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
  Landmark,
  Send
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

    // Street Names, Roads & Compound Labels Overlay (Cached)
    createCachedTileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, opacity: 0.95 }
    ).addTo(map);

    createCachedTileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, opacity: 0.95 }
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

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
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
    setIsInquiryModalOpen(true);
  });

  const rawNarrative = isAr 
    ? (rawProperty.description_ar || rawProperty.narrative || rawProperty.description_en || '')
    : (rawProperty.description_en || rawProperty.narrative || rawProperty.description_ar || '');

  // Strip raw HTML tags cleanly from narrative and decode all HTML entities
  const cleanNarrative = cleanHtmlToPlainText(rawNarrative) || (isAr ? 'تحفة معمارية استثنائية صُممت بأعلى معايير الفخامة والدقة الهندسية.' : 'An extraordinary architectural masterpiece crafted with the highest standards of luxury and precision.');

  const property: Property = {
    id: rawProperty.slug || rawProperty.id || 'the-obsidian-pavilion',
    slug: rawProperty.slug || rawProperty.id || 'the-obsidian-pavilion',
    title: decodeHtmlEntities(isAr ? (rawProperty.title_ar || rawProperty.title) : (rawProperty.title_en || rawProperty.title || 'The Obsidian Pavilion')),
    location: decodeHtmlEntities(rawProperty.location || 'Sodic East Estate, New Cairo, Egypt'),
    district: rawProperty.district || (rawProperty.location ? rawProperty.location.split(',')[0].trim() : 'New Cairo'),
    estateName: rawProperty.estateName || (rawProperty.district ? rawProperty.district : 'Four Seasons Privado'),
    price: rawProperty.price || rawProperty.price_egp || 42500000,
    currency: rawProperty.currency || (isAr ? 'ج.م' : 'EGP'),
    beds: rawProperty.beds || rawProperty.bedrooms || 5,
    baths: rawProperty.baths || rawProperty.bathrooms || 6,
    sqm: rawProperty.sqm || rawProperty.area_sqm || 720,
    propertyType: rawProperty.propertyType || rawProperty.type || 'Apartment',
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const lightboxTouchX = useRef<number | null>(null);

  // Pinch-zoom / pan state for the fullscreen single-image view
  const [zoomView, setZoomView] = useState({ scale: 1, x: 0, y: 0 });
  const zoomGesture = useRef({
    mode: 'none' as 'none' | 'pinch' | 'pan',
    startDist: 0,
    startScale: 1,
    startTouchX: 0,
    startTouchY: 0,
    startX: 0,
    startY: 0,
    moved: false,
    lastTap: 0,
  });

  const openZoom = (url: string) => {
    setZoomView({ scale: 1, x: 0, y: 0 });
    setZoomedImage(url);
  };

  const handleZoomTouchStart = (e: React.TouchEvent) => {
    const g = zoomGesture.current;
    g.moved = false;
    if (e.touches.length === 2) {
      g.mode = 'pinch';
      g.startDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      g.startScale = zoomView.scale;
    } else if (e.touches.length === 1 && zoomView.scale > 1) {
      g.mode = 'pan';
      g.startTouchX = e.touches[0].clientX;
      g.startTouchY = e.touches[0].clientY;
      g.startX = zoomView.x;
      g.startY = zoomView.y;
    } else {
      g.mode = 'none';
    }
  };

  const handleZoomTouchMove = (e: React.TouchEvent) => {
    const g = zoomGesture.current;
    if (g.mode === 'pinch' && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = Math.min(4, Math.max(1, g.startScale * (dist / g.startDist)));
      g.moved = true;
      setZoomView((v) => (scale === 1 ? { scale: 1, x: 0, y: 0 } : { ...v, scale }));
    } else if (g.mode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - g.startTouchX;
      const dy = e.touches[0].clientY - g.startTouchY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) g.moved = true;
      const limit = (zoomView.scale - 1) * 400;
      setZoomView((v) => ({
        ...v,
        x: Math.min(limit, Math.max(-limit, g.startX + dx)),
        y: Math.min(limit, Math.max(-limit, g.startY + dy)),
      }));
    }
  };

  const handleZoomTouchEnd = (e: React.TouchEvent) => {
    const g = zoomGesture.current;
    if (e.touches.length > 0) return;
    if (!g.moved && g.mode !== 'pinch') {
      const now = Date.now();
      if (now - g.lastTap < 300) {
        // Double tap: toggle zoom
        setZoomView((v) => (v.scale > 1 ? { scale: 1, x: 0, y: 0 } : { ...v, scale: 2.5 }));
        g.lastTap = 0;
      } else {
        g.lastTap = now;
        // Single tap at rest closes back to the lightbox
        if (zoomView.scale === 1) {
          setTimeout(() => {
            if (Date.now() - zoomGesture.current.lastTap >= 280 && zoomGesture.current.lastTap !== 0) {
              setZoomedImage(null);
              zoomGesture.current.lastTap = 0;
            }
          }, 300);
        }
      }
    }
    g.mode = 'none';
  };

  // Mobile sticky lead bar: hide on scroll down, show on scroll up or when scrolling stops
  const [isLeadBarHidden, setIsLeadBarHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    let idleTimer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsLeadBarHidden(false), 400);
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (Math.abs(delta) > 8) {
          setIsLeadBarHidden(delta > 0 && y > 120);
          lastY = y;
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const goToImage = (idx: number, dir?: number) => {
    const total = property.images.length;
    const target = ((idx % total) + total) % total;
    setSlideDirection(dir ?? (target > activeImageIndex ? 1 : target < activeImageIndex ? -1 : 0));
    setActiveImageIndex(target);
  };
  const { isFavorite, toggleFavorite, setIsDrawerOpen, registerProperties } = useFavorites();
  const isBookmarked = isFavorite(property.id) || (rawProperty?.id ? isFavorite(rawProperty.id) : false) || (rawProperty?.slug ? isFavorite(rawProperty.slug) : false);

  useEffect(() => {
    if (property) {
      registerProperties([property]);
    }
  }, [property, registerProperties]);
  
  const handleToggleBookmark = () => {
    const isNowSaved = toggleFavorite(rawProperty || property);
    if (isNowSaved) {
      toast.success(
        isAr ? 'تمت إضافة العقار إلى المحفظة المحفوظة' : 'Saved to Private Portfolio Shortlist',
        {
          description: property.title,
          action: {
            label: isAr ? 'عرض المحفظة' : 'View Shortlist',
            onClick: () => setIsDrawerOpen(true),
          },
        }
      );
    } else {
      toast.info(
        isAr ? 'تمت إزالة العقار من المحفظة' : 'Removed from Saved Portfolio'
      );
    }
  };
  const [isAmbientGlow, setIsAmbientGlow] = useState(true);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  
  // Live User Geolocation & Distance State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'located' | 'fallback'>('idle');

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
      if (e.key === 'Escape') {
        if (zoomedImage) {
          setZoomedImage(null);
          return;
        }
        setIsLightboxOpen(false);
      }
      if (e.key === 'ArrowRight') {
        setSlideDirection(1);
        setActiveImageIndex((prev) => (prev + 1) % property.images.length);
      }
      if (e.key === 'ArrowLeft') {
        setSlideDirection(-1);
        setActiveImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, zoomedImage, property.images.length]);

  // Lock body scroll when Lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  // Preload all property images for instant zero-latency slide transitions
  useEffect(() => {
    if (property?.images?.length) {
      property.images.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  }, [property.images]);

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

          </div>

          {/* Main Hero Split Row: Title & Location (Left) + Acquisition Value & Actions (Right) */}
          <div className="header-main-hero-row">
            <div className="top-header-left">
              <h1 className="property-main-title">{property.title}</h1>
              <div className="property-location-bar">
                <MapPin size={15} className="location-pin" />
                <span>{property.location}</span>
                <span className="verified-trust-inline">
                  <ShieldCheck size={14} />
                  <span>{isAr ? 'عقار موثق' : 'Verified'}</span>
                </span>
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
                    onClick={handleToggleBookmark}
                    title={isAr ? 'حفظ في المفضلات' : 'Save to Favorites'}
                    type="button"
                  >
                    <Bookmark size={17} fill={isBookmarked ? 'currentColor' : 'none'} />
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

          <div className="main-image-frame">
            <AnimatePresence initial={false} custom={slideDirection}>
              <motion.img
                key={activeImageIndex}
                src={property.images[activeImageIndex] || property.images[0]}
                alt={property.title}
                className="main-hero-img"
                custom={slideDirection}
                variants={{
                  enter: (dir: number) => ({ x: dir > 0 ? '100%' : dir < 0 ? '-100%' : '0%', opacity: dir === 0 ? 0 : 1, scale: dir === 0 ? 1 : 0.96 }),
                  center: { x: '0%', opacity: 1, scale: 1 },
                  exit: (dir: number) => ({ x: dir > 0 ? '-70%' : dir < 0 ? '70%' : '0%', opacity: 0, scale: dir === 0 ? 1 : 0.9 })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.85 }}
              />
            </AnimatePresence>

            <div className="gallery-stage-overlay">
              <div className="gallery-counter-pill">
                <span>{String(activeImageIndex + 1).padStart(2, '0')} / {String(property.images.length).padStart(2, '0')}</span>
                <span className="counter-vista-label"> • ARCHITECTURAL VISTA</span>
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

                <button 
                  className="gallery-fullscreen-btn" 
                  type="button" 
                  title="Open Fullscreen Lightbox"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <Maximize size={14} />
                  <span className="fullscreen-btn-label">Fullscreen Stage</span>
                </button>
              </div>
            </div>

            {/* Gallery Step Arrows */}
            <button 
              className="gallery-nav-arrow arrow-left"
              onClick={(e) => {
                e.stopPropagation();
                goToImage(activeImageIndex - 1, -1);
              }}
              type="button"
            >
              <ChevronLeft size={20} />
            </button>

            <button 
              className="gallery-nav-arrow arrow-right"
              onClick={(e) => {
                e.stopPropagation();
                goToImage(activeImageIndex + 1, 1);
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
                onClick={() => goToImage(idx)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="thumb-img" />
                {idx === 2 && property.images.length > 3 && (
                  <button
                    type="button"
                    className="thumb-more-overlay"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(true);
                    }}
                    title={isAr ? 'عرض كل الصور' : 'View all photos'}
                  >
                    +{property.images.length - 3}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 4. Fullscreen Lightbox Modal with 3D Cinematic Liquid Carousel & Ambient Aurora */}
        {mounted && typeof document !== 'undefined' && createPortal(
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

                <div
                  className="lightbox-carousel-stage"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Tapping the empty/blurred stage area exits fullscreen
                    if (e.target === e.currentTarget) setIsLightboxOpen(false);
                  }}
                >
                  
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

                  {/* Flat Clean Carousel Cards Deck (swipeable on touch) */}
                  <div
                    className="lightbox-deck-container"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) setIsLightboxOpen(false);
                    }}
                    onTouchStart={(e) => {
                      lightboxTouchX.current = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      if (lightboxTouchX.current === null) return;
                      const delta = e.changedTouches[0].clientX - lightboxTouchX.current;
                      lightboxTouchX.current = null;
                      if (Math.abs(delta) < 48) return;
                      // Swipe left reveals the card on the right, and vice versa
                      if (delta < 0) goToImage(activeImageIndex + 1, 1);
                      else goToImage(activeImageIndex - 1, -1);
                    }}
                  >
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
                            if (!isCenter) goToImage(idx);
                            else openZoom(imgUrl);
                          }}
                        >
                          <img src={imgUrl} alt={`${property.title} - Plate ${idx + 1}`} className="carousel-card-img" />
                        </motion.div>
                      );
                    })}

                    {/* Left & Right Floating Navigation Control Arrows */}
                    <button 
                      className="lightbox-nav-arrow arrow-prev"
                      onClick={() => goToImage(activeImageIndex - 1, -1)}
                      type="button"
                      title="Previous Plate (Left Arrow)"
                    >
                      <ChevronLeft size={22} />
                    </button>

                    <button 
                      className="lightbox-nav-arrow arrow-next"
                      onClick={() => goToImage(activeImageIndex + 1, 1)}
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
                          {property.district && property.district !== property.estateName && (
                            <>
                              <span className="dock-dot">•</span>
                              <span className="dock-district">{property.district}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Interactive Thumbnail Navigation Pills */}
                      <div className="dock-thumbnails-row">
                        {property.images.map((thumb, idx) => (
                          <button
                            key={idx}
                            className={`dock-thumb-btn ${activeImageIndex === idx ? 'active' : ''}`}
                            onClick={() => goToImage(idx)}
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

                {/* Single-image fullscreen view: pinch to zoom, drag to pan,
                    double-tap toggles zoom, single tap (unzoomed) returns to lightbox */}
                <AnimatePresence>
                  {zoomedImage && (
                    <motion.div
                      className="lightbox-zoom-layer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={() =>
                        setZoomView((v) => (v.scale > 1 ? { scale: 1, x: 0, y: 0 } : { ...v, scale: 2.5 }))
                      }
                      onWheel={(e) => {
                        const scale = Math.min(4, Math.max(1, zoomView.scale - e.deltaY * 0.0025));
                        setZoomView((v) => (scale === 1 ? { scale: 1, x: 0, y: 0 } : { ...v, scale }));
                      }}
                      onTouchStart={handleZoomTouchStart}
                      onTouchMove={handleZoomTouchMove}
                      onTouchEnd={handleZoomTouchEnd}
                    >
                      <img
                        src={zoomedImage}
                        alt={property.title}
                        className="lightbox-zoom-img"
                        style={{
                          transform: `translate(${zoomView.x}px, ${zoomView.y}px) scale(${zoomView.scale})`,
                        }}
                        draggable={false}
                      />
                      <button
                        type="button"
                        className="lightbox-zoom-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedImage(null);
                        }}
                        aria-label="Back to gallery"
                      >
                        <X size={18} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

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

              <h4 className="narrative-heading">{isAr ? 'عن العقار' : 'About this Estate'}</h4>
              <div className="narrative-text">
                {property.narrative.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="narrative-para">{paragraph}</p>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column Sticky Advisory Suite */}
          <aside className="detail-sidebar-col">
            
            {/* Unified Private Acquisition & Advisory Suite Card */}
            <div className="broker-card unified-advisory-card" id="request-viewing-section">
              <div className="broker-profile">
                <img src={property.broker.avatar} alt={property.broker.name} className="broker-avatar" />
                <div className="broker-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 className="broker-name">{property.broker.name}</h3>
                    <ShieldCheck size={14} className="badge-gold-icon" />
                  </div>
                  <span className="broker-role">{property.broker.role}</span>
                  <span className="broker-stat">{isAr ? 'المكتب الاستشاري الحصري • توثيق فوري' : 'Direct Advisory Desk • Instant Verification'}</span>
                </div>
              </div>

              {/* All communication funnels through the Private Acquisition lead form */}
              <div className="broker-action-stack">
                <button
                  type="button"
                  onClick={() => setIsInquiryModalOpen(true)}
                  className="btn-gold broker-primary-btn"
                  title={isAr ? 'تقديم طلب شراء رسمي وسري' : 'Submit Private Acquisition Inquiry'}
                >
                  <Send size={15} />
                  <span>{isAr ? 'طلب استشارة أو شراء' : 'Private Acquisition Request'}</span>
                </button>
                <p className="broker-protocol-note">
                  {isAr
                    ? 'قدّم طلبك وحدد وسيلة التواصل المفضلة لديك، وسيتواصل معك زكريا فريد مباشرة.'
                    : 'Submit your request with your preferred contact method. Zakaria Farid will reach out to you directly.'}
                </p>
              </div>

              {/* Optional Cal.com VIP Viewing Scheduler (Only shown if calendar is active) */}
              {rawProperty.calcom_event_link && (
                <div className="broker-calendar-section">
                  <div className="calendar-section-header">
                    <span className="calendar-eyebrow">
                      {isAr ? 'معاينة ميدانية خاصة' : 'VIP PRIVATE VIEWING'}
                    </span>
                    <p className="calendar-subtext">
                      {isAr ? 'اختر موعد الجولة التفقدية مباشرة من التقويم.' : 'Schedule an on-site walkthrough directly.'}
                    </p>
                  </div>
                  <ViewingScheduler
                    calLink={rawProperty.calcom_event_link}
                    propertyId={rawProperty.id}
                    propertySlug={rawProperty.slug}
                    propertyTitle={property.title}
                    isAr={isAr}
                    whatsappHref={`https://wa.me/${property.broker.phone.replace(/[^0-9]/g, '')}`}
                  />
                </div>
              )}
            </div>

          </aside>
        </div>

        {/* 6. Location & Connectivity Suite (Full-Width Row with Big Map & Aligned Radar) */}
        <div className="location-suite-section" id="location-section">
          {/* Main Section Header above the 2-column grid */}
          <div className="section-title-wrap proximity-header-row" style={{ marginBottom: '1.75rem' }}>
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

          <div className="location-suite-grid">
            
            {/* Left Main Column: Big Satellite Map */}
            <div className="location-suite-main">
              <div className="sanctum-map-full-wrap">
                <SanctumSatelliteMap 
                  lat={property.mapCoordinates.lat} 
                  lng={property.mapCoordinates.lng} 
                  title={property.title} 
                  district={property.district} 
                  isAr={isAr}
                />
              </div>
            </div>

            {/* Right Side Column: Aligned Commute Times Card */}
            <div className="location-suite-side">
              
              {/* Commute Times Card — Top Aligned with the Map */}
              <div className="sidebar-radar-card aligned-map-radar-card">
                <div className="radar-stack-header">
                  <div className="radar-stack-header-text">
                    <span className="radar-stack-eyebrow">{isAr ? 'المسافات وسهولة الوصول' : 'PROXIMITY & CONNECTIVITY'}</span>
                    <h4 className="radar-stack-title">{isAr ? 'أوقات الوصول والتنقل' : 'Estimated Travel Times'}</h4>
                  </div>
                  <span className="radar-stack-status">
                    <span className="live-radar-dot" />
                    <span>
                      {geoStatus === 'located' 
                        ? (isAr ? 'موقعك المباشر' : 'Live GPS') 
                        : (isAr ? 'من وسط القاهرة' : 'From Downtown Cairo')}
                    </span>
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

        {/* E. Architectural CAD Blueprint Section — Full-Width Concluding Showcase Section */}
        <div className="content-section cad-blueprint-full-section" id="architectural-cad-section">
          <ArchitecturalBlueprintInspector 
            zones={rawProperty.spec_layers || []} 
            propertyTitle={property.title} 
            locale={locale} 
            propertyType={rawProperty.type} 
            propertyImages={property.images} 
          />
        </div>

        {/* 6. Similar Architectural Statements */}
        <section className="similar-section">
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
                locale={locale}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Mobile Sticky Bottom Lead Bar (portaled: the page-transition wrapper's filter breaks position:fixed) */}
      {mounted && typeof document !== 'undefined' && createPortal(
      <div className={`mobile-bottom-lead-bar ${isLeadBarHidden ? 'lead-bar-hidden' : ''}`}>
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
              onClick={handleToggleBookmark}
              title={isAr ? 'حفظ في المفضلات' : 'Save to Favorites'}
              type="button"
            >
              <Bookmark size={17} fill={isBookmarked ? 'currentColor' : 'none'} />
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
      </div>,
      document.body
      )}

      {/* Global Confidential Acquisition Inquiry Modal */}
      <InquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        title={isAr ? `طلب استحواذ — ${property.title}` : `Private Acquisition — ${property.title}`}
        propertyName={property.title}
        propertyId={rawProperty.id || property.id}
        locale={locale}
      />

      <style>{`
        .property-detail-view {
          padding-top: 140px;
          padding-bottom: 3.5rem;
          background: var(--bg-primary);
          min-height: 100vh;
          transition: background var(--transition-smooth);
        }

        /* 1. Above-the-Fold Sovereign Property Header */
        .property-top-header {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
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
          flex-wrap: wrap;
          gap: 6px;
          font-size: 0.9375rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        /* Inline trust note next to the location (no badge chrome) */
        .verified-trust-inline {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.8125rem;
          font-weight: 600;
          white-space: nowrap;
          color: var(--gold-primary);
          margin-inline-start: 8px;
        }

        .verified-trust-inline svg {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        @media (min-width: 769px) {
          .verified-trust-inline {
            font-size: 0.9375rem;
            font-weight: 800;
          }
          .property-location-bar {
            font-size: 1.0625rem;
            font-weight: 600;
          }
        }

        .location-pin {
          color: currentColor;
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

        /* 3. Cinematic Gallery Stage with Luxury Ambient Cinema Mode */
        .gallery-section {
          position: relative;
          margin-bottom: 2.25rem;
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

        /* Compact icon-only gallery controls (all screen sizes) */
        .counter-vista-label,
        .ambient-btn-label,
        .fullscreen-btn-label,
        .gallery-ambient-btn .ambient-dot-pulse {
          display: none;
        }

        .gallery-ambient-btn,
        .gallery-fullscreen-btn {
          width: 44px;
          height: 44px;
          padding: 0;
          gap: 0;
          justify-content: center;
          border-radius: 50%;
        }

        .gallery-ambient-btn,
        .gallery-ambient-btn.active,
        [data-theme="dark"] .gallery-ambient-btn,
        [data-theme="light"] .gallery-ambient-btn,
        [data-theme="dark"] .gallery-ambient-btn.active,
        [data-theme="light"] .gallery-ambient-btn.active {
          background: rgba(10, 14, 22, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: none;
          color: #ffffff;
        }

        .gallery-ambient-btn:hover {
          transform: none;
          border-color: #DDA752;
        }

        .gallery-ambient-btn.active,
        [data-theme="dark"] .gallery-ambient-btn.active,
        [data-theme="light"] .gallery-ambient-btn.active {
          border-color: #DDA752;
        }

        .gallery-ambient-btn .ambient-sparkle-icon {
          color: #ffffff;
          filter: none;
        }

        .gallery-ambient-btn.active .ambient-sparkle-icon {
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

        /* keep vertical centering on press (global button:active resets transform) */
        .gallery-nav-arrow:active {
          transform: translateY(-50%) scale(0.94);
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
          position: relative;
          height: 100px;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
          opacity: 0.6;
          background: #0E121A;
        }

        /* WhatsApp-style "+N" overlay on the last visible thumbnail (mobile) */
        .thumb-more-overlay {
          display: none;
          position: absolute;
          inset: 0;
          align-items: center;
          justify-content: center;
          background: rgba(8, 10, 14, 0.62);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          border: none;
          color: #FFFFFF;
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          cursor: pointer;
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

        .lightbox-nav-arrow:active {
          transform: translateY(-50%) scale(0.94);
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
          gap: 2.5rem;
          align-items: start;
          margin-bottom: 2.5rem;
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
          gap: 1.5rem;
        }

        .content-section {
          margin-bottom: 2.5rem;
          width: 100%;
          min-width: 0;
        }

        .content-section:last-child {
          margin-bottom: 0;
        }

        .location-suite-section {
          margin-bottom: 2.5rem;
          width: 100%;
        }

        .cad-blueprint-full-section {
          margin-bottom: 2.5rem;
          width: 100%;
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

        /* Key Specification Glass Pills */
        .property-spec-matrix-grid {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          padding-bottom: 1.75rem;
          border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
        }

        .spec-stat-card {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.5rem 1.15rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(18px) saturate(190%);
          -webkit-backdrop-filter: blur(18px) saturate(190%);
        }

        [data-theme="dark"] .spec-stat-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        [data-theme="dark"] .spec-stat-card:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(221, 167, 82, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 12px rgba(221, 167, 82, 0.15);
        }

        [data-theme="light"] .spec-stat-card {
          background: rgba(255, 255, 255, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1.5px 1.5px #FFFFFF;
        }

        [data-theme="light"] .spec-stat-card:hover {
          border-color: rgba(184, 134, 11, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(30, 24, 16, 0.08);
        }

        .spec-stat-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .spec-stat-icon-wrap svg {
          width: 16px;
          height: 16px;
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
          align-items: center;
          gap: 6px;
          flex-wrap: nowrap;
        }

        .spec-stat-label {
          font-family: var(--font-heading);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold-primary, #DDA752);
          opacity: 0.85;
          white-space: nowrap;
        }

        [data-theme="light"] .spec-stat-label {
          color: #B8860B;
        }

        .spec-stat-value {
          font-family: var(--font-heading);
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
        }

        /* Gold highlighted card */
        [data-theme="dark"] .spec-stat-card.card-highlight-gold {
          background: rgba(197, 142, 54, 0.12);
          border-color: var(--gold-border, rgba(221, 167, 82, 0.35));
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

        @media (max-width: 768px) {
          /* Always two pills per row (labels ellipsize instead of wrapping the row) */
          .property-spec-matrix-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
          .spec-stat-card {
            width: 100%;
            min-width: 0;
            justify-content: flex-start;
            padding: 0.5rem 0.85rem;
          }
          .spec-stat-info {
            min-width: 0;
            overflow: hidden;
          }
          .spec-stat-value {
            overflow: hidden;
            text-overflow: ellipsis;
          }
          /* English labels/values are longer — shrink them so pills don't truncate */
          [dir="ltr"] .spec-stat-label {
            font-size: 0.56rem;
            letter-spacing: 0.06em;
          }
          [dir="ltr"] .spec-stat-value {
            font-size: 0.76rem;
          }
          [dir="ltr"] .spec-stat-card {
            gap: 6px;
            padding: 0.5rem 0.7rem;
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

        /* Location & Connectivity Suite (Aligned 2-Column Grid) */
        .location-suite-section {
          margin-bottom: 5rem;
          width: 100%;
        }

        .location-suite-grid {
          display: grid;
          grid-template-columns: 1fr 390px;
          gap: 2.25rem;
          align-items: stretch;
        }

        .location-suite-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .sanctum-map-full-wrap {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .location-suite-main .sanctum-map-frame {
          width: 100%;
          height: 100%;
          min-height: 420px;
          margin-bottom: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .location-suite-side {
          min-width: 0;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        @media (max-width: 1024px) {
          .location-suite-grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .location-suite-main .sanctum-map-frame {
            height: 380px;
            min-height: 380px;
          }
          .location-suite-side {
            padding-top: 0;
          }
        }

        @media (max-width: 768px) {
          /* Compact info panel under the map: swipeable commute chips */
          .location-suite-grid {
            gap: 0.85rem;
          }
          .location-suite-side .sidebar-radar-card {
            padding: 1rem 1rem 0.85rem;
            border-radius: 18px;
          }
          .location-suite-side .radar-cards-list {
            flex-direction: row;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            gap: 0.6rem;
            margin: 0 -1rem;
            padding: 0 1rem 6px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .location-suite-side .radar-cards-list::-webkit-scrollbar {
            display: none;
          }
          .location-suite-side .proximity-card {
            flex: 0 0 220px;
            scroll-snap-align: start;
            padding: 0.7rem 0.85rem;
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
          height: 100%;
          box-sizing: border-box;
          justify-content: space-between;
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
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 0.85rem;
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
          white-space: nowrap;
        }

        .radar-stack-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 700;
          padding: 0.3rem 0.7rem;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          white-space: nowrap;
          flex-shrink: 0;
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

        .broker-action-stack {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }

        .broker-primary-btn {
          width: 100%;
          padding: 0.95rem 1.25rem;
          font-size: 0.9375rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 14px;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: none;
          box-shadow: 0 4px 18px rgba(221, 167, 82, 0.35);
        }

        .broker-primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 26px rgba(221, 167, 82, 0.5);
        }

        /* Single-image fullscreen view inside the lightbox */
        .lightbox-zoom-layer {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(4, 6, 10, 0.98);
          overflow: hidden;
          touch-action: none;
          cursor: zoom-out;
        }

        .lightbox-zoom-img {
          width: 100vw;
          height: 100dvh;
          object-fit: contain;
          transform-origin: center center;
          transition: transform 0.12s ease-out;
          will-change: transform;
          user-select: none;
          -webkit-user-drag: none;
        }

        .lightbox-zoom-close {
          position: absolute;
          top: 1rem;
          inset-inline-end: 1rem;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          cursor: pointer;
        }

        .narrative-heading {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 0.75rem;
        }

        .broker-protocol-note {
          font-size: 0.78rem;
          color: var(--text-muted);
          line-height: 1.55;
          margin: 0;
          text-align: center;
        }

        .broker-calendar-section {
          margin-top: 1.25rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border-subtle);
        }

        .calendar-section-header {
          margin-bottom: 0.75rem;
        }

        .calendar-eyebrow {
          font-size: 0.625rem;
          font-weight: 800;
          color: var(--gold-primary);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: block;
        }

        .calendar-subtext {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 2px 0 0 0;
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
          margin-top: 0;
          padding-top: 3.5rem;
          padding-bottom: 2rem;
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
          bottom: 0.75rem;
          left: 0.75rem;
          right: 0.75rem;
          z-index: 99;
          border-radius: 18px;
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          padding: 0.875rem 1.15rem 1rem;
          flex-direction: column;
          align-items: stretch;
          gap: 0.65rem;
          transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .mobile-bottom-lead-bar.lead-bar-hidden {
          transform: translateY(130%);
          opacity: 0;
          pointer-events: none;
        }

        /* Sticky bar text: white in dark, black in light */
        [data-theme="dark"] .mobile-bottom-lead-bar .price-label,
        [data-theme="dark"] .mobile-bottom-lead-bar .price-tax-note {
          color: #FFFFFF;
        }

        [data-theme="light"] .mobile-bottom-lead-bar .price-label,
        [data-theme="light"] .mobile-bottom-lead-bar .price-tax-note {
          color: #000000;
        }

        [data-theme="dark"] .mobile-bottom-lead-bar {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.25) 0%,
            rgba(255, 255, 255, 0.08) 30%,
            rgba(18, 24, 38, 0.42) 65%,
            rgba(10, 14, 24, 0.65) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow:
            0 20px 48px rgba(0, 0, 0, 0.38),
            0 4px 14px rgba(0, 0, 0, 0.18),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .mobile-bottom-lead-bar {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.65) 0%,
            rgba(255, 255, 255, 0.32) 40%,
            rgba(255, 255, 255, 0.52) 100%
          );
          backdrop-filter: blur(32px) saturate(210%) contrast(106%);
          -webkit-backdrop-filter: blur(32px) saturate(210%) contrast(106%);
          border: 1.5px solid rgba(255, 255, 255, 0.75);
          box-shadow:
            0 24px 56px rgba(15, 23, 42, 0.14),
            0 4px 16px rgba(0, 0, 0, 0.04),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.95),
            inset 0 -1px 1px rgba(0, 0, 0, 0.05);
        }



        /* 7. Similar Recommended Properties */
        .similar-section {
          margin-top: 0.5rem;
          margin-bottom: 0;
          padding-top: 0;
        }

        .similar-header {
          margin-bottom: 1.25rem;
        }

        .similar-title {
          font-family: var(--font-heading);
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin: 0.25rem 0 0;
        }

        .similar-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
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
            gap: 1.25rem;
          }
          .top-header-right {
            align-items: stretch;
            width: 100%;
            gap: 1rem;
          }
          .property-price-card {
            text-align: start;
          }
          .price-value {
            font-size: 1.85rem;
          }
          /* Price + actions live in the sticky bottom card on mobile */
          .header-main-hero-row .property-price-card,
          .header-main-hero-row .top-action-group {
            display: none;
          }
          .top-action-group {
            width: 100%;
            gap: 0.6rem;
          }
          .top-inquire-btn {
            flex: 1;
            min-height: 48px;
          }
          .header-icon-btn {
            width: 46px;
            height: 46px;
            flex-shrink: 0;
          }
          /* Keep long breadcrumbs on one line */
          .breadcrumb-bar {
            max-width: 100%;
            overflow: hidden;
          }
          .crumb-text {
            white-space: nowrap;
          }
          .crumb-text.active {
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
            flex: 1;
          }
          .thumbnails-strip {
            grid-template-columns: repeat(3, 1fr);
          }
          /* WhatsApp-style: one row of 3, "+N" on the last tile */
          .thumb-item:nth-child(n+4) {
            display: none;
          }
          .thumb-more-overlay {
            display: flex;
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

          /* Clean, minimal fullscreen lightbox on mobile */
          .lightbox-dossier-tag {
            font-size: 0.6rem;
            padding: 0.3rem 0.6rem;
          }

          /* Swipe navigation replaces the arrows */
          .lightbox-nav-arrow {
            display: none;
          }
          .lightbox-close-btn span {
            display: none;
          }
          .lightbox-close-btn {
            width: 42px;
            height: 42px;
            padding: 0;
            gap: 0;
            justify-content: center;
            border-radius: 50%;
          }
          .dock-title-group {
            display: none;
          }
          .dock-meta-row {
            justify-content: center;
            gap: 0;
          }
          .lightbox-bottom-dock {
            padding: 0.6rem 0.75rem;
          }
          .lightbox-nav-arrow {
            width: 44px;
            height: 44px;
          }
          .lightbox-nav-arrow.arrow-prev {
            left: 0.6rem;
          }
          .lightbox-nav-arrow.arrow-next {
            right: 0.6rem;
          }

          /* Tighter gallery overlay on mobile */
          .gallery-stage-overlay {
            bottom: 0.75rem;
            left: 0.75rem;
            right: 0.75rem;
          }
          .gallery-counter-pill {
            padding: 0.4rem 0.85rem;
            font-size: 0.7rem;
          }
          .gallery-nav-arrow {
            width: 40px;
            height: 40px;
          }
          .arrow-left { left: 0.75rem; }
          .arrow-right { right: 0.75rem; }

          .mobile-bottom-lead-bar {
            display: flex;
          }
          .property-detail-view {
            padding-top: 96px;
            padding-bottom: 7rem;
          }
          .property-top-header {
            gap: 0.85rem;
            margin-bottom: 1.1rem;
            padding-bottom: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
};
