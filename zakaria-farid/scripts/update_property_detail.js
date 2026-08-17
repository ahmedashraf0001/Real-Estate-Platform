const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'src', 'components', 'property', 'PropertyDetailView.tsx');

const content = `'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}
import { Property } from '@/types';
import { PROPERTIES } from '@/data/properties';
import { PropertyCard } from './PropertyCard';
import FinishingDetailsDisplay from './FinishingDetailsDisplay';
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
  CheckCircle2,
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
  Layers,
  KeyRound,
  Home,
  Tag,
  Check,
  Award,
  Hammer,
  Eye,
  FileText,
  TrendingUp,
  Landmark,
  Tv,
  Sofa,
  Utensils,
  Sun,
  Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface PropertyDetailViewProps {
  propertyId?: string;
  property?: Property | any;
  similarProperties?: (Property | any)[];
  locale?: string;
  onBack?: () => void;
  onSelectProperty?: (id: string) => void;
  onOpenInquiry?: (type: string, propertyName?: string) => void;
}

const SanctumSatelliteMap: React.FC<{ lat: number; lng: number; title: string; district: string }> = ({
  lat,
  lng,
  title,
  district
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

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
    const pinHtml = \`
      <div class="sanctum-pin-wrapper">
        <div class="sanctum-beacon-pulse"></div>
        <div class="sanctum-pin-core"></div>
        <div class="sanctum-pin-tag">\${title}</div>
      </div>
    \`;

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
        <span className="sanctum-badge-mode">SATELLITE ORTHO-SURVEY</span>
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
  const rawProperty = propProperty || PROPERTIES.find((p: any) => p.id === effectiveId) || PROPERTIES[0];
  
  // Normalize property fields seamlessly
  const property: Property & {
    completionStatus: 'ready' | 'off_plan';
    listingStatus: string;
    floorNumber: number | string | null;
    view: string | null;
    finishing: string;
    furnishing: string;
    spec_layers: any[];
    property_amenities: any[];
  } = {
    id: rawProperty.slug || rawProperty.id || 'the-obsidian-pavilion',
    slug: rawProperty.slug || rawProperty.id || 'the-obsidian-pavilion',
    title: isAr ? (rawProperty.title_ar || rawProperty.title) : (rawProperty.title_en || rawProperty.title || 'The Obsidian Pavilion'),
    title_en: rawProperty.title_en || rawProperty.title || 'The Obsidian Pavilion',
    title_ar: rawProperty.title_ar || rawProperty.title || 'القصر المعماري الفريد',
    location: rawProperty.location || 'Sodic East Estate, New Cairo, Egypt',
    district: rawProperty.district || (rawProperty.location ? rawProperty.location.split(',')[0].trim() : 'New Cairo'),
    estateName: rawProperty.estateName || (rawProperty.district ? rawProperty.district : 'Four Seasons Privado'),
    description: isAr ? (rawProperty.description_ar || rawProperty.description_en || rawProperty.narrative) : (rawProperty.description_en || rawProperty.description_ar || rawProperty.narrative),
    description_en: rawProperty.description_en || rawProperty.narrative || '',
    description_ar: rawProperty.description_ar || rawProperty.narrative || '',
    narrative: isAr ? (rawProperty.description_ar || rawProperty.narrative || rawProperty.description_en) : (rawProperty.description_en || rawProperty.narrative || rawProperty.description_ar || 'An extraordinary architectural masterpiece crafted with the highest standards of luxury and precision.'),
    price: rawProperty.price || rawProperty.price_egp || 42500000,
    price_egp: rawProperty.price_egp || rawProperty.price || 42500000,
    currency: rawProperty.currency || (isAr ? 'ج.م' : 'EGP'),
    beds: rawProperty.beds || rawProperty.bedrooms || 5,
    baths: rawProperty.baths || rawProperty.bathrooms || 6,
    sqm: rawProperty.sqm || rawProperty.area_sqm || 720,
    propertyType: rawProperty.propertyType || rawProperty.type || 'Standalone Villa',
    type: rawProperty.type || 'villa',
    builtYear: rawProperty.builtYear || rawProperty.year_built || 2025,
    featured: rawProperty.featured ?? rawProperty.is_featured ?? true,
    is_featured: rawProperty.is_featured ?? true,
    completionStatus: rawProperty.completion_status || rawProperty.completionStatus || 'ready',
    listingStatus: rawProperty.listing_status || rawProperty.listingStatus || 'active',
    floorNumber: rawProperty.floor_number !== undefined && rawProperty.floor_number !== null ? rawProperty.floor_number : (rawProperty.floorNumber ?? null),
    view: rawProperty.view || null,
    finishing: rawProperty.finishing || (rawProperty.completion_status === 'off_plan' ? 'red_brick' : 'fully_finished'),
    furnishing: rawProperty.furnishing || 'unfurnished',
    spec_layers: rawProperty.spec_layers || [],
    property_amenities: rawProperty.property_amenities || rawProperty.amenities || [],
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
      role: isAr ? 'المالك المباشر والمستشار الأول' : 'Direct Owner & Senior Acquisition Lead',
      phone: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ? \`+\${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}\` : '+201009970776',
      email: 'contact@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80'
    }
  };

  const onBack = propOnBack || (() => router.push('/' + locale + '/properties'));
  const onSelectProperty = propOnSelectProperty || ((id: string) => router.push('/' + locale + '/properties/' + id));
  const onOpenInquiry = propOnOpenInquiry || ((type: string, propertyName?: string) => {
    window.location.href = 'https://wa.me/' + (property.broker?.phone || '+201009970776').replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hello, I am inquiring about ' + (propertyName || property.title));
  });

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
  const [viewingSlot, setViewingSlot] = useState<'morning' | 'sunset' | 'night'>('sunset');
  const [viewingDate, setViewingDate] = useState('2026-08-25');
  const [viewingBooked, setViewingBooked] = useState(false);

  // GPS Distance Live Proximity calculation
  const [geoDistanceKm, setGeoDistanceKm] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'located' | 'denied'>('idle');

  const requestLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const pLat = property.mapCoordinates.lat;
        const pLng = property.mapCoordinates.lng;
        
        // Haversine formula
        const R = 6371; // Earth radius in km
        const dLat = (pLat - userLat) * (Math.PI / 180);
        const dLng = (pLng - userLng) * (Math.PI / 180);
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLat * (Math.PI / 180)) * Math.cos(pLat * (Math.PI / 180)) * 
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        setGeoDistanceKm(Math.round(d * 10) / 10);
        setGeoStatus('located');
      },
      () => {
        setGeoStatus('denied');
      },
      { timeout: 8000 }
    );
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setViewingBooked(true);
  };

  // Calculations
  const formattedPrice = property.price ? property.price.toLocaleString() : '0';
  const pricePerSqm = property.sqm && property.sqm > 0 
    ? Math.round(property.price / property.sqm).toLocaleString() 
    : null;

  // Floor level representation
  const floorText = useMemo(() => {
    if (property.floorNumber !== null && property.floorNumber !== undefined && String(property.floorNumber).trim() !== '') {
      const fn = Number(property.floorNumber);
      if (fn === 0) return isAr ? 'الطابق الأرضي + حديقة خاصة' : 'Ground Level + Private Garden';
      return isAr ? \`الطابق \${fn}\` : \`Floor Level \${fn}\`;
    }
    if (property.type === 'villa') return isAr ? 'فيلا مستقلة (أرضي + أول + روف)' : 'Standalone Villa (G + 1 + Roof)';
    if (property.type === 'townhouse') return isAr ? 'تاون هاوس (أرضي + أول + روف)' : 'Townhouse (G + 1 + Roof)';
    if (property.type === 'duplex') return isAr ? 'دوبلكس طابقين' : 'Two-Level Duplex Residence';
    if (property.type === 'chalet') return isAr ? 'شاليه أرضي مع حديقة' : 'Ground Coastal Chalet + Garden';
    return isAr ? 'طابق سكني فاخر' : 'Luxury Residence Level';
  }, [property.floorNumber, property.type, isAr]);

  // View representation
  const viewText = property.view 
    ? property.view 
    : isAr ? 'إطلالة معمارية مفتوحة على المساحات الخضراء' : 'Open Panoramic Architectural Vista';

  // Finishing grade representation
  const finishingText = useMemo(() => {
    if (property.finishing === 'fully_finished') {
      return isAr ? 'تشطيب فاخر بالكامل (الترا سوبر لوكس)' : 'Ultra-Luxury Fully Finished';
    }
    if (property.finishing === 'semi_finished') {
      return isAr ? 'نصف تشطيب (محارة وتمديدات)' : 'Semi-Finished (Plaster & Utilities)';
    }
    if (property.finishing === 'red_brick') {
      return isAr ? 'طوب أحمر (على الهيكل الخرساني)' : 'Core & Shell (Red Brick Canvas)';
    }
    return isAr ? 'تشطيب فاخر معتمد' : 'Verified Prime Finishing';
  }, [property.finishing, isAr]);

  // Furnishing representation
  const furnishingText = useMemo(() => {
    if (property.furnishing === 'furnished') {
      return isAr ? 'مفروش بالكامل بأرقى الماركات' : 'Fully Furnished & Curated';
    }
    if (property.furnishing === 'semi_furnished') {
      return isAr ? 'شامل خزائن المطبخ والتكييفات' : 'Semi-Furnished (Built-ins & HVAC)';
    }
    return isAr ? 'غير مفروش (مساحة قابلة للتخصيص)' : 'Unfurnished (Bespoke Canvas)';
  }, [property.furnishing, isAr]);

  // Dynamic Amenities compilation
  const dynamicAmenitiesList = useMemo(() => {
    if (property.property_amenities && property.property_amenities.length > 0) {
      return property.property_amenities.map((am: any) => {
        const titleStr = typeof am === 'string' 
          ? am 
          : isAr 
            ? (am.amenity_ar || am.amenity_en || am.title || '') 
            : (am.amenity_en || am.amenity_ar || am.title || '');
        return {
          title: titleStr,
          icon: titleStr.toLowerCase().includes('pool') || titleStr.toLowerCase().includes('مسبح') ? 'waves'
            : titleStr.toLowerCase().includes('garden') || titleStr.toLowerCase().includes('حديق') ? 'flower-2'
            : titleStr.toLowerCase().includes('security') || titleStr.toLowerCase().includes('أمن') ? 'shield-check'
            : titleStr.toLowerCase().includes('gym') || titleStr.toLowerCase().includes('رياض') ? 'dumbbell'
            : titleStr.toLowerCase().includes('garage') || titleStr.toLowerCase().includes('جراج') || titleStr.toLowerCase().includes('سيار') ? 'car'
            : titleStr.toLowerCase().includes('smart') || titleStr.toLowerCase().includes('ذكي') ? 'sparkles'
            : 'check'
        };
      });
    }
    return property.amenities || [];
  }, [property.property_amenities, property.amenities, isAr]);

  const similar = propSimilar || PROPERTIES.filter(p => p.id !== property.id).slice(0, 3);

  return (
    <div className="property-detail-view">
      <div className="container">
        
        {/* 1. Sovereign Property Header & Eyebrows */}
        <div className="property-top-header">
          <div className="top-header-left">
            <div className="breadcrumb-bar">
              <button className="back-link-btn" onClick={onBack} type="button">
                <ArrowLeft size={14} />
                <span>{isAr ? 'كتالوج العقارات' : 'Catalog'}</span>
              </button>
              <ChevronRight size={13} className="crumb-chevron" />
              <span className="crumb-text">{property.district}</span>
              <ChevronRight size={13} className="crumb-chevron" />
              <span className="crumb-text active">{property.title}</span>
            </div>

            {/* Dynamic Eyebrow Badges Row */}
            <div className="property-eyebrow-row">
              <span className="property-compound-badge">
                <Building2 size={13} className="badge-compound-icon" />
                <span>{property.estateName}</span>
              </span>

              {/* Completion Status Badge */}
              <span className={\`status-badge-capsule \${property.completionStatus === 'ready' ? 'status-ready' : 'status-offplan'}\`}>
                <KeyRound size={12} />
                <span>
                  {property.completionStatus === 'ready' 
                    ? (isAr ? 'جاهز للسكن الفوري' : 'Ready to Move') 
                    : (isAr ? 'قيد الإنشاء (على المخطط)' : 'Off-Plan')}
                </span>
              </span>

              {/* Listing Status Badge */}
              <span className="status-badge-capsule status-active">
                <span className="live-status-dot" />
                <span>
                  {property.listingStatus === 'active' 
                    ? (isAr ? 'متاح حصرياً' : 'Active Sovereign Listing')
                    : property.listingStatus === 'under_offer'
                      ? (isAr ? 'تحت التفاوض' : 'Under Private Negotiation')
                      : (isAr ? 'مُباع' : 'Acquired')}
                </span>
              </span>

              <span className="property-id-badge">
                <ShieldCheck size={13} className="badge-gold-icon" />
                <span>ID: MP-{property.id.toUpperCase()} • FREEHOLD ESCROW</span>
              </span>
            </div>

            <h1 className="property-main-title">{property.title}</h1>

            <div className="property-location-bar">
              <MapPin size={15} className="location-pin" />
              <span>{property.location}</span>
            </div>
          </div>

          {/* Top Header Right: Price Valuation Monograph */}
          <div className="top-header-right">
            <div className="property-price-card">
              <span className="price-label">{isAr ? 'قيمة الاستحواذ المعتمدة' : 'ACQUISITION VALUE'}</span>
              <div className="price-value">
                {formattedPrice} <span className="price-currency">{property.currency}</span>
              </div>
              {pricePerSqm && (
                <div className="price-rate-pill">
                  <TrendingUp size={12} className="rate-icon" />
                  <span>{pricePerSqm} {property.currency} / m²</span>
                </div>
              )}
              <span className="price-tax-note">{isAr ? 'تسجيل عقاري موثق • ٠٪ عمولات خفية' : 'Freehold Escrow Verified • 0% Hidden Fees'}</span>
            </div>

            <div className="top-action-group">
              <button 
                className="btn-gold top-inquire-btn"
                onClick={() => onOpenInquiry('Acquisition Inquiry', property.title)}
                type="button"
              >
                <span>{isAr ? 'طلب الاستحواذ المباشر' : 'Inquire for Acquisition'}</span>
              </button>

              <div className="header-icon-actions">
                <button 
                  className={\`header-icon-btn \${isBookmarked ? 'active' : ''}\`}
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  title="Save to Portfolio"
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
                  title="Share Dossier"
                  type="button"
                >
                  <Share2 size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Comprehensive Architectural Quick Specs Strip */}
        <div className="property-quick-specs-bar">
          <div className="spec-pill">
            <Bed size={16} className="pill-icon" />
            <span><strong>{property.beds}</strong> {isAr ? 'أجنحة نوم' : 'Bedrooms'}</span>
          </div>
          <div className="spec-pill">
            <Bath size={16} className="pill-icon" />
            <span><strong>{property.baths}</strong> {isAr ? 'حمامات فاخرة' : 'Bathrooms'}</span>
          </div>
          <div className="spec-pill">
            <Maximize2 size={16} className="pill-icon" />
            <span><strong>{property.sqm}</strong> {isAr ? 'م² مساحة مباني' : 'SQM Built-up'}</span>
          </div>
          <div className="spec-pill">
            <Layers size={16} className="pill-icon" />
            <span><strong>{floorText}</strong></span>
          </div>
          <div className="spec-pill">
            <Eye size={16} className="pill-icon" />
            <span><strong>{viewText}</strong></span>
          </div>
          <div className="spec-pill">
            <Hammer size={16} className="pill-icon" />
            <span><strong>{finishingText}</strong></span>
          </div>
          <div className="spec-pill verified-pill">
            <ShieldCheck size={16} className="pill-icon-gold" />
            <span><strong>{isAr ? 'أصل عقاري سيادي موثق' : 'Verified Sovereign Asset'}</strong></span>
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
                      backgroundImage: \`url(\${property.images[activeImageIndex] || property.images[0]})\`
                    }}
                  />
                  <div 
                    className="ambient-aurora-mesh mesh-beta"
                    style={{
                      backgroundImage: \`url(\${property.images[activeImageIndex] || property.images[0]})\`
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
                <span>{String(activeImageIndex + 1).padStart(2, '0')} / {String(property.images.length).padStart(2, '0')} • {isAr ? 'المعرض المعماري' : 'ARCHITECTURAL VISTA'}</span>
              </div>

              <div className="gallery-actions-right">
                {/* Luxury Ambient Mode Toggle Button */}
                <button
                  className={\`gallery-ambient-btn \${isAmbientGlow ? 'active' : ''}\`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAmbientGlow(!isAmbientGlow);
                  }}
                  type="button"
                  title="Toggle Luxury Ambient Cinema Illumination"
                >
                  <Sparkles size={13} className="ambient-sparkle-icon" />
                  <span>Ambient {isAmbientGlow ? 'ON' : 'OFF'}</span>
                  {isAmbientGlow && <span className="ambient-dot-pulse" />}
                </button>

                <button className="gallery-fullscreen-btn" type="button" title="Open Fullscreen Lightbox">
                  <Maximize size={14} />
                  <span>{isAr ? 'عرض ملء الشاشة' : 'Fullscreen Stage'}</span>
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
            {property.images.map((imgUrl: string, idx: number) => (
              <motion.div 
                key={idx}
                className={\`thumb-item \${activeImageIndex === idx ? 'active' : ''}\`}
                onClick={() => setActiveImageIndex(idx)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <img src={imgUrl} alt={\`Thumbnail \${idx + 1}\`} className="thumb-img" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* 4. Fullscreen Lightbox Modal */}
        <AnimatePresence>
          {isLightboxOpen && (
            <motion.div 
              className="lightbox-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLightboxOpen(false)}
            >
              <div className="lightbox-carousel-stage" onClick={(e) => e.stopPropagation()}>
                
                {/* Floating Top Header Bar */}
                <div className="lightbox-top-bar">
                  <div className="lightbox-top-left">
                    <span className="lightbox-dossier-tag">
                      <ShieldCheck size={14} className="tag-gold-icon" />
                      <span>{isAr ? 'أرشيف الملف السيادي' : 'SOVEREIGN DOSSIER ARCHIVE'}</span>
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
                      <span>{isAr ? 'إغلاق' : 'Close'}</span>
                    </button>
                  </div>
                </div>

                {/* Flat Clean Carousel Cards Deck */}
                <div className="lightbox-deck-container">
                  {property.images.map((imgUrl: string, idx: number) => {
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
                        className={\`carousel-card-slot \${isCenter ? 'slot-center' : isPrev ? 'slot-prev' : isNext ? 'slot-next' : 'slot-hidden'}\`}
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
                        <img src={imgUrl} alt={\`\${property.title} - Plate \${idx + 1}\`} className="carousel-card-img" />
                      </motion.div>
                    );
                  })}

                  <button 
                    className="lightbox-nav-arrow arrow-prev"
                    onClick={() => setActiveImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length)}
                    type="button"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <button 
                    className="lightbox-nav-arrow arrow-next"
                    onClick={() => setActiveImageIndex((prev) => (prev + 1) % property.images.length)}
                    type="button"
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>

                {/* Bottom Curated Dock */}
                <div className="lightbox-bottom-dock">
                  <div className="dock-meta-row">
                    <div className="dock-title-group">
                      <h3 className="dock-property-title">{property.title}</h3>
                      <div className="dock-sub-tags">
                        <span className="dock-estate">{property.estateName}</span>
                        <span className="dock-dot">•</span>
                        <span className="dock-district">{property.district}</span>
                        <span className="dock-dot">•</span>
                        <span className="dock-badge">{isAr ? \`لوحة \${activeImageIndex + 1} من \${property.images.length}\` : \`Plate \${activeImageIndex + 1} of \${property.images.length}\`}</span>
                      </div>
                    </div>

                    <div className="dock-thumbnails-row">
                      {property.images.map((thumb: string, idx: number) => (
                        <button
                          key={idx}
                          className={\`dock-thumb-btn \${activeImageIndex === idx ? 'active' : ''}\`}
                          onClick={() => setActiveImageIndex(idx)}
                          type="button"
                        >
                          <img src={thumb} alt={\`Thumb \${idx + 1}\`} className="dock-thumb-img" />
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

            {/* A. Architectural Monograph Narrative */}
            <div className="content-section">
              <div className="section-title-wrap">
                <span className="section-eyebrow">{isAr ? 'البيان المعماري الحصري' : 'CURATED MONOGRAPH'}</span>
                <h3 className="section-subtitle">{isAr ? 'السرد المعماري والوصفي' : 'Architectural Narrative'}</h3>
              </div>
              <div className="narrative-text">
                {property.narrative.split('\\n\\n').map((paragraph: string, i: number) => (
                  <p key={i} className="narrative-para">{paragraph}</p>
                ))}
              </div>
            </div>

            {/* B. Deep Technical Specifications & Financial Architecture Grid */}
            <div className="content-section">
              <div className="section-title-wrap">
                <span className="section-eyebrow">{isAr ? 'المواصفات الفنية والهندسية' : 'TECHNICAL & VALUATION ARCHITECTURE'}</span>
                <h3 className="section-subtitle">{isAr ? 'جدول المواصفات والبيانات الهندسية' : 'Architectural & Financial Specifications'}</h3>
              </div>

              <div className="specs-detail-table-card">
                <div className="specs-table-grid">
                  
                  {/* Property Type */}
                  <div className="spec-table-row">
                    <span className="spec-table-label">{isAr ? 'نوع العقار' : 'Property Type'}</span>
                    <span className="spec-table-value">{property.propertyType}</span>
                  </div>

                  {/* Built-up Area */}
                  <div className="spec-table-row">
                    <span className="spec-table-label">{isAr ? 'المساحة المبنية' : 'Built-Up Area'}</span>
                    <span className="spec-table-value">{property.sqm} m²</span>
                  </div>

                  {/* Bedrooms */}
                  <div className="spec-table-row">
                    <span className="spec-table-label">{isAr ? 'أجنحة النوم' : 'Bedrooms'}</span>
                    <span className="spec-table-value">{property.beds} {isAr ? 'غرف نوم رئيسية' : 'Executive Suites'}</span>
                  </div>

                  {/* Bathrooms */}
                  <div className="spec-table-row">
                    <span className="spec-table-label">{isAr ? 'الحمامات' : 'Bathrooms'}</span>
                    <span className="spec-table-value">{property.baths} {isAr ? 'حمامات كاملة' : 'Full Luxury Baths'}</span>
                  </div>

                  {/* Floor Level */}
                  <div className="spec-table-row">
                    <span className="spec-table-label">{isAr ? 'مستوى الطابق' : 'Floor Level'}</span>
                    <span className="spec-table-value">{floorText}</span>
                  </div>

                  {/* Primary View */}
                  <div className="spec-table-row">
                    <span className="spec-table-label">{isAr ? 'الإطلالة والواجهة' : 'Primary Orientation & View'}</span>
                    <span className="spec-table-value">{viewText}</span>
                  </div>

                  {/* Completion Status */}
                  <div className="spec-table-row">
                    <span className="spec-table-label">{isAr ? 'حالة التنفيذ والتسليم' : 'Completion & Handover'}</span>
                    <span className="spec-table-value">
                      <span className={\`table-status-tag \${property.completionStatus === 'ready' ? 'tag-ready' : 'tag-offplan'}\`}>
                        {property.completionStatus === 'ready' 
                          ? (isAr ? 'جاهز للاستلام الفوري' : 'Ready to Move') 
                          : (isAr ? 'قيد الإنشاء (على المخطط)' : 'Off-Plan Milestone')}
                      </span>
                    </span>
                  </div>

                  {/* Finishing Standard */}
                  <div className="spec-table-row">
                    <span className="spec-table-label">{isAr ? 'مستوى التشطيب' : 'Finishing Standard'}</span>
                    <span className="spec-table-value">{finishingText}</span>
                  </div>

                  {/* Furnishing */}
                  <div className="spec-table-row">
                    <span className="spec-table-label">{isAr ? 'حالة الفرش' : 'Furnishing State'}</span>
                    <span className="spec-table-value">{furnishingText}</span>
                  </div>

                  {/* Rate Valuation */}
                  {pricePerSqm && (
                    <div className="spec-table-row">
                      <span className="spec-table-label">{isAr ? 'سعر المتر المربع' : 'Unit Rate per m²'}</span>
                      <span className="spec-table-value gold-value">{pricePerSqm} {property.currency} / m²</span>
                    </div>
                  )}

                  {/* Title & Escrow */}
                  <div className="spec-table-row">
                    <span className="spec-table-label">{isAr ? 'التسجيل والملكية' : 'Title & Escrow'}</span>
                    <span className="spec-table-value">{isAr ? 'تسجيل عقاري حر موثق ١٠٠٪' : '100% Freehold Registered Title'}</span>
                  </div>

                </div>
              </div>
            </div>

            {/* C. Verified Amenities & Lifestyle Matrix */}
            <div className="content-section">
              <div className="section-title-wrap">
                <span className="section-eyebrow">{isAr ? 'المرافق والخدمات المعتمدة' : 'VERIFIED LIFESTYLE & AMENITIES'}</span>
                <h3 className="section-subtitle">{isAr ? 'المرافق والتجهيزات الخاصة بالعقار' : 'Exclusive Property Amenities'}</h3>
              </div>

              <div className="amenities-luxury-grid">
                {dynamicAmenitiesList.map((am: any, idx: number) => {
                  const IconComp = am.icon === 'waves' ? Waves
                    : am.icon === 'flower-2' ? Flower2
                    : am.icon === 'shield-check' ? ShieldCheck
                    : am.icon === 'dumbbell' ? Dumbbell
                    : am.icon === 'car' ? Car
                    : am.icon === 'sparkles' ? Sparkles
                    : CheckCircle;

                  return (
                    <div key={idx} className="amenity-luxury-card">
                      <div className="amenity-icon-slot">
                        <IconComp size={18} className="amenity-gold-icon" />
                      </div>
                      <span className="amenity-card-title">{am.title}</span>
                      <Check size={14} className="amenity-check-gold" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* D. Interactive Layered Finishing & Engineering Blueprint Inspector */}
            {property.spec_layers && property.spec_layers.length > 0 && (
              <div className="content-section" id="architectural-finishing-section">
                <div className="section-title-wrap">
                  <span className="section-eyebrow">{isAr ? 'المخطط الهندسي الدقيق' : 'ENGINEERING & FINISHES BLUEPRINT'}</span>
                  <h3 className="section-subtitle">{isAr ? 'مستويات التشطيب للغرف والبنود الهندسية' : 'Interactive Architectural Finishing Breakdown'}</h3>
                </div>

                <FinishingDetailsDisplay 
                  zones={property.spec_layers} 
                  propertyTitle={property.title} 
                  locale={locale} 
                  propertyImages={property.images}
                />
              </div>
            )}

            {/* E. Location Sanctum */}
            <div className="content-section">
              <div className="section-title-wrap proximity-header-row">
                <div>
                  <span className="section-eyebrow">{isAr ? 'الموقع والمحيط الجغرافي' : 'GEOSPATIAL CARTOGRAPHY'}</span>
                  <h3 className="section-subtitle">{isAr ? 'الموقع الدقيق على الخريطة' : 'Location Sanctum'}</h3>
                </div>

                <button 
                  className={\`gps-locate-btn \${geoStatus === 'locating' ? 'locating' : ''}\`}
                  onClick={requestLocation}
                  type="button"
                  title="Detect exact travel distance from your current coordinates"
                >
                  <LocateFixed size={14} className={geoStatus === 'locating' ? 'spin' : ''} />
                  <span>
                    {geoStatus === 'locating' 
                      ? (isAr ? 'جاري تحديد الموقع...' : 'Triangulating GPS...') 
                      : geoStatus === 'located' 
                        ? (isAr ? \`المسافة: \${geoDistanceKm} كم\` : \`\${geoDistanceKm} km Away\`) 
                        : (isAr ? 'حساب المسافة الدقيقة' : 'Calibrate Distance')}
                  </span>
                </button>
              </div>

              <SanctumSatelliteMap 
                lat={property.mapCoordinates.lat} 
                lng={property.mapCoordinates.lng} 
                title={property.title} 
                district={property.district} 
              />
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
                  <span className="broker-stat">{isAr ? 'المشرف على الصفقات السيادية الفاخرة' : 'Senior Acquisition Lead • Direct Owner Representative'}</span>
                </div>
              </div>

              <div className="broker-action-buttons">
                <a href={\`tel:\${property.broker.phone}\`} className="btn-gold broker-btn">
                  <PhoneCall size={15} />
                  <span>{isAr ? 'اتصال هاتفي خاص' : 'Direct Private Call'}</span>
                </a>
                <a 
                  href={\`https://wa.me/\${property.broker.phone.replace(/[^0-9]/g, '')}?text=Hello%20\${encodeURIComponent(property.broker.name)},%20I%20am%20inquiring%20about%20the%20sovereign%20estate:%20\${encodeURIComponent(property.title)}\`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-dark broker-btn"
                >
                  <MessageCircle size={15} />
                  <span>{isAr ? 'محادثة واتساب مشفرة' : 'Encrypted WhatsApp Desk'}</span>
                </a>
              </div>
            </div>

            {/* Request Private Viewing Appointment Suite */}
            <div className="viewing-form-card" id="request-viewing-section">
              <div className="viewing-header">
                <span className="viewing-eyebrow">{isAr ? 'معاينة خاصة وسرية' : 'CHAUFFEURED INSPECTION'}</span>
                <h3 className="viewing-title">{isAr ? 'حجز موعد معاينة خاصة' : 'Book Private Viewing'}</h3>
                <p className="viewing-sub">
                  {isAr 
                    ? \`حدد الفترة المفضلة لمعاينة خاصة مع سائق خاص لعقار \${property.title}.\`
                    : \`Select your preferred window for an executive chauffeured walkthrough of \${property.title}.\`}
                </p>
              </div>

              {!viewingBooked ? (
                <form className="viewing-form" onSubmit={handleBookingSubmit}>
                  
                  {/* Curated Viewing Slot Window */}
                  <div className="viewing-input-group">
                    <label className="viewing-label">{isAr ? 'فترة المعاينة' : 'INSPECTION WINDOW'}</label>
                    <div className="viewing-slots-stack">
                      {[
                        { id: 'morning', label: isAr ? 'معاينة الإضاءة الصباحية' : 'Morning Natural Light', time: '11:00 AM - 01:00 PM' },
                        { id: 'sunset', label: isAr ? 'جولة الغروب الذهبية' : 'Golden Sunset Tour', time: '05:30 PM - 07:30 PM' },
                        { id: 'night', label: isAr ? 'معاينة الإضاءة الليلية' : 'Architectural Lighting Walkthrough', time: '08:00 PM - 09:30 PM' }
                      ].map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          className={\`slot-choice-btn \${viewingSlot === slot.id ? 'active' : ''}\`}
                          onClick={() => setViewingSlot(slot.id as any)}
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
                    <label className="viewing-label">{isAr ? 'التاريخ المفضل' : 'PREFERRED DATE'}</label>
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
                    <span>{isAr ? 'تأكيد حجز المعاينة والسائق الخاص' : 'Confirm Private Chauffeur & Viewing'}</span>
                  </button>
                </form>
              ) : (
                <div className="booking-confirmed-box">
                  <CheckCircle size={38} className="booked-check-icon" />
                  <h4 className="booked-title">{isAr ? 'تم تأكيد الموعد' : 'Viewing Scheduled'}</h4>
                  <p className="booked-details">
                    {isAr ? 'التاريخ:' : 'Date:'} <strong>{viewingDate}</strong><br />
                    {isAr ? 'الفترة:' : 'Window:'} <strong>{viewingSlot.toUpperCase()} TOUR</strong>
                  </p>
                  <p className="booked-note">
                    {isAr 
                      ? 'سيقوم فريق الكونسيرج بالتواصل وإرسال سيارة خاصة قبل الموعد بـ ٤٥ دقيقة.'
                      : 'Your concierge will dispatch a private chauffeur to your residence 45 minutes prior to the appointment.'}
                  </p>
                  <button 
                    className="btn-dark reset-view-btn"
                    onClick={() => setViewingBooked(false)}
                    type="button"
                  >
                    <span>{isAr ? 'حجز موعد آخر' : 'Change Date / Re-book'}</span>
                  </button>
                </div>
              )}
            </div>

          </aside>
        </div>

        {/* 6. Similar Sovereign Masterpieces */}
        {similar.length > 0 && (
          <div className="similar-properties-section">
            <div className="section-title-wrap">
              <span className="section-eyebrow">{isAr ? 'عقارات مشابهة' : 'EXCLUSIVE PEERS'}</span>
              <h3 className="section-subtitle">{isAr ? 'عقارات سيادية مماثلة في نفس المنطقة' : 'Similar Sovereign Masterpieces'}</h3>
            </div>

            <div className="similar-grid">
              {similar.map((simProp: any) => (
                <PropertyCard 
                  key={simProp.id} 
                  property={simProp} 
                  onSelect={(id) => onSelectProperty(id || simProp.id || simProp.slug)}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      <style>{\`
        .property-detail-view {
          min-height: 100vh;
          padding: 6.5rem 0 5rem;
          background: var(--bg-primary);
        }

        .container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* 1. Header */
        .property-top-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .top-header-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .breadcrumb-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          margin-bottom: 0.25rem;
          word-spacing: 0.04em;
        }

        .back-link-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--gold-primary);
          font-weight: 600;
          cursor: pointer;
        }

        .crumb-chevron {
          color: var(--text-muted);
          opacity: 0.6;
        }

        .crumb-text {
          color: var(--text-secondary);
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
          letter-spacing: 0.06em;
          word-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--gold-primary);
          background: rgba(197, 142, 54, 0.12);
          border: 1px solid var(--gold-border);
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
        }

        .status-badge-capsule {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
          word-spacing: 0.04em;
        }

        .status-ready {
          background: rgba(16, 185, 129, 0.12);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .status-offplan {
          background: rgba(245, 158, 11, 0.12);
          color: #F59E0B;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .status-active {
          background: rgba(221, 167, 82, 0.12);
          color: var(--gold-primary);
          border: 1px solid var(--gold-border);
        }

        .live-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 8px #10B981;
        }

        .property-id-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          word-spacing: 0.04em;
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
          letter-spacing: -0.008em;
          word-spacing: 0.06em;
          line-height: 1.2;
          margin: 0;
        }

        .property-location-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9375rem;
          color: var(--text-secondary);
          margin-top: 0.35rem;
          word-spacing: 0.04em;
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

        .price-rate-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--gold-light);
          background: rgba(221, 167, 82, 0.15);
          border: 1px solid var(--gold-border);
          padding: 0.2rem 0.6rem;
          border-radius: 4px;
          margin-top: 0.35rem;
        }

        .rate-icon {
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
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
        }

        [data-theme="light"] .header-icon-btn {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: var(--text-primary);
        }

        .header-icon-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-border);
          transform: translateY(-2px);
        }

        .header-icon-btn.active {
          color: var(--gold-primary);
          background: rgba(221, 167, 82, 0.15);
          border-color: var(--gold-primary);
        }

        /* 2. Quick Specs Bar */
        .property-quick-specs-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 1rem 1.4rem;
          border-radius: var(--radius-lg);
          margin-bottom: 2rem;
          overflow-x: auto;
          scrollbar-width: none;
        }

        [data-theme="dark"] .property-quick-specs-bar {
          background: rgba(22, 28, 42, 0.45);
          border: 1px solid var(--border-subtle);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        [data-theme="light"] .property-quick-specs-bar {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: var(--shadow-sm);
        }

        .spec-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.84rem;
          color: var(--text-secondary);
          white-space: nowrap;
          padding-right: 14px;
          border-right: 1px solid var(--border-subtle);
        }

        .spec-pill:last-child {
          border-right: none;
          padding-right: 0;
        }

        .pill-icon {
          color: var(--gold-primary);
        }

        .pill-icon-gold {
          color: var(--gold-primary);
        }

        .verified-pill {
          color: var(--gold-primary);
          margin-left: auto;
        }

        /* 3. Cinematic Gallery */
        .gallery-section {
          position: relative;
          margin-bottom: 3.5rem;
        }

        .gallery-ambient-wrapper {
          position: absolute;
          inset: -40px -20px;
          pointer-events: none;
          overflow: visible;
          z-index: 0;
        }

        .ambient-glow-fade-slot {
          position: absolute;
          inset: 0;
        }

        .ambient-aurora-mesh {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: blur(75px) saturate(240%) brightness(0.65);
          opacity: 0.55;
          transform: scale(1.08);
          border-radius: 40px;
        }

        .mesh-alpha {
          animation: auroraPulse 12s ease-in-out infinite alternate;
        }

        .mesh-beta {
          filter: blur(95px) saturate(280%) brightness(0.5);
          opacity: 0.4;
          animation: auroraPulse 16s ease-in-out infinite alternate-reverse;
        }

        @keyframes auroraPulse {
          0% { transform: scale(1.04) rotate(0deg); }
          100% { transform: scale(1.12) rotate(1.5deg); }
        }

        .main-image-frame {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 600px;
          border-radius: 24px;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid var(--border-glass);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
        }

        .main-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .main-image-frame:hover .main-hero-img {
          transform: scale(1.02);
        }

        .gallery-stage-overlay {
          position: absolute;
          bottom: 1.5rem;
          left: 1.5rem;
          right: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 5;
        }

        .gallery-counter-pill {
          background: rgba(10, 14, 24, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          padding: 0.45rem 0.95rem;
          border-radius: 9999px;
          color: #FFFFFF;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .gallery-actions-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .gallery-ambient-btn,
        .gallery-fullscreen-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(10, 14, 24, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #FFFFFF;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.45rem 0.95rem;
          border-radius: 9999px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .gallery-ambient-btn.active {
          border-color: var(--gold-primary);
          color: var(--gold-primary);
          background: rgba(221, 167, 82, 0.18);
        }

        .ambient-dot-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold-primary);
          box-shadow: 0 0 6px var(--gold-primary);
        }

        .gallery-nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: rgba(10, 14, 24, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 5;
          transition: all var(--transition-fast);
        }

        .gallery-nav-arrow.arrow-left { left: 1.5rem; }
        .gallery-nav-arrow.arrow-right { right: 1.5rem; }

        .gallery-nav-arrow:hover {
          background: var(--gold-primary);
          color: #0A0C10;
          transform: translateY(-50%) scale(1.08);
        }

        .thumbnails-strip {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 12px;
          margin-top: 1rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          scrollbar-width: thin;
        }

        .thumb-item {
          flex: 0 0 130px;
          height: 85px;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          opacity: 0.6;
          transition: all var(--transition-fast);
        }

        .thumb-item.active {
          opacity: 1;
          border-color: var(--gold-primary);
          box-shadow: 0 0 16px var(--gold-glow);
        }

        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* 4. Fullscreen Lightbox */
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(4, 6, 10, 0.94);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-carousel-stage {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          box-sizing: border-box;
        }

        .lightbox-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 20;
        }

        .lightbox-top-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .lightbox-dossier-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--gold-primary);
          background: rgba(221, 167, 82, 0.12);
          border: 1px solid var(--gold-border);
          padding: 0.35rem 0.85rem;
          border-radius: 6px;
        }

        .lightbox-counter-pill {
          color: #C7D2DF;
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .lightbox-close-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          cursor: pointer;
          font-size: 0.8125rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .lightbox-close-btn:hover {
          background: #DC2626;
          border-color: #DC2626;
        }

        .lightbox-deck-container {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .carousel-card-slot {
          position: absolute;
          width: 75vw;
          max-width: 1080px;
          height: 65vh;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .carousel-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .lightbox-nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(10, 14, 24, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 25;
          transition: all var(--transition-fast);
        }

        .lightbox-nav-arrow.arrow-prev { left: 2rem; }
        .lightbox-nav-arrow.arrow-next { right: 2rem; }

        .lightbox-nav-arrow:hover {
          background: var(--gold-primary);
          color: #0A0C10;
          transform: translateY(-50%) scale(1.1);
        }

        .lightbox-bottom-dock {
          z-index: 20;
          background: rgba(12, 16, 26, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 1rem 1.5rem;
        }

        .dock-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }

        .dock-property-title {
          font-family: var(--font-heading);
          font-size: 1.1rem;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0 0 3px;
        }

        .dock-sub-tags {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .dock-thumbnails-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          max-width: 450px;
        }

        .dock-thumb-btn {
          flex: 0 0 60px;
          height: 42px;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          border: 1.5px solid transparent;
          opacity: 0.5;
        }

        .dock-thumb-btn.active {
          opacity: 1;
          border-color: var(--gold-primary);
        }

        .dock-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* 5. Main Content Detail Layout */
        .detail-layout {
          display: grid;
          grid-template-columns: 1fr 390px;
          gap: 3.5rem;
          margin-bottom: 5rem;
          align-items: start;
        }

        .detail-main-col {
          display: flex;
          flex-direction: column;
          gap: 3.5rem;
        }

        .content-section {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .section-title-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .section-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: var(--gold-primary);
          text-transform: uppercase;
        }

        .section-subtitle {
          font-family: var(--font-heading);
          font-size: 1.65rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
          letter-spacing: -0.008em;
          word-spacing: 0.04em;
        }

        .narrative-para {
          font-size: 1.05rem;
          line-height: 1.8;
          color: var(--text-secondary);
          margin: 0 0 1rem;
        }

        /* B. Specifications Table Card */
        .specs-detail-table-card {
          border-radius: 20px;
          padding: 1.5rem;
          overflow: hidden;
        }

        [data-theme="dark"] .specs-detail-table-card {
          background: rgba(22, 28, 42, 0.5);
          border: 1px solid var(--border-subtle);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
        }

        [data-theme="light"] .specs-detail-table-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: var(--shadow-sm);
        }

        .specs-table-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem 2rem;
        }

        .spec-table-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .spec-table-label {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .spec-table-value {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-primary);
          text-align: right;
        }

        .spec-table-value.gold-value {
          color: var(--gold-primary);
        }

        .table-status-tag {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
        }

        .tag-ready {
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .tag-offplan {
          background: rgba(245, 158, 11, 0.15);
          color: #F59E0B;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        /* C. Amenities Luxury Grid */
        .amenities-luxury-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
        }

        .amenity-luxury-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 1rem 1.25rem;
          border-radius: 14px;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .amenity-luxury-card {
          background: rgba(22, 28, 42, 0.45);
          border: 1px solid var(--border-subtle);
        }

        [data-theme="light"] .amenity-luxury-card {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .amenity-luxury-card:hover {
          border-color: var(--gold-border);
          transform: translateY(-2px);
        }

        .amenity-icon-slot {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(221, 167, 82, 0.12);
          border: 1px solid var(--gold-border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .amenity-gold-icon {
          color: var(--gold-primary);
        }

        .amenity-card-title {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .amenity-check-gold {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        /* E. Location Sanctum */
        .proximity-header-row {
          flex-direction: row;
          justify-content: space-between;
          align-items: flex-end;
        }

        .gps-locate-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--gold-primary);
          background: rgba(221, 167, 82, 0.12);
          border: 1px solid var(--gold-border);
          padding: 0.45rem 0.95rem;
          border-radius: 9999px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .gps-locate-btn:hover {
          background: var(--gold-primary);
          color: #0A0C10;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .sanctum-map-frame {
          position: relative;
          width: 100%;
          height: 440px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-md);
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
          gap: 4px;
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

        .sanctum-map-frame .leaflet-control-zoom {
          border: 1px solid var(--border-subtle) !important;
          border-radius: 10px !important;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
          margin-bottom: 1.25rem !important;
          margin-right: 1.25rem !important;
        }

        .sanctum-map-frame .leaflet-control-zoom a {
          background: rgba(13, 17, 23, 0.85) !important;
          color: #DDA752 !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          transition: all 0.2s ease;
        }

        .sanctum-map-frame .leaflet-control-zoom a:hover {
          background: rgba(221, 167, 82, 0.2) !important;
          color: #FFFFFF !important;
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
          border: 3px solid #FFFFFF;
          box-shadow: 0 0 12px #DDA752;
          z-index: 2;
        }

        .sanctum-beacon-pulse {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(221, 167, 82, 0.35);
          animation: beaconPulse 2s ease-out infinite;
          z-index: 1;
        }

        @keyframes beaconPulse {
          0% { transform: translateX(-50%) scale(0.5); opacity: 1; }
          100% { transform: translateX(-50%) scale(1.6); opacity: 0; }
        }

        .sanctum-pin-tag {
          background: rgba(10, 14, 24, 0.85);
          color: #FFFFFF;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(221, 167, 82, 0.4);
          white-space: nowrap;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        }

        /* Right Column Advisory Suite */
        .detail-sidebar-col {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          position: sticky;
          top: 6rem;
        }

        .broker-card {
          border-radius: 20px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        [data-theme="dark"] .broker-card {
          background: rgba(22, 28, 42, 0.5);
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-md);
        }

        [data-theme="light"] .broker-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: var(--shadow-sm);
        }

        .broker-profile {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .broker-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--gold-primary);
        }

        .broker-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .broker-name {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .broker-role {
          font-size: 0.8125rem;
          color: var(--gold-primary);
          font-weight: 600;
        }

        .broker-stat {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .broker-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .broker-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.8rem 1.25rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-dark {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          transition: all var(--transition-fast);
        }

        .btn-dark:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: var(--gold-border);
          color: var(--gold-primary);
        }

        /* Viewing Scheduler Card */
        .viewing-form-card {
          border-radius: 20px;
          padding: 1.75rem;
        }

        [data-theme="dark"] .viewing-form-card {
          background: rgba(22, 28, 42, 0.5);
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-md);
        }

        [data-theme="light"] .viewing-form-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: var(--shadow-sm);
        }

        .viewing-header {
          margin-bottom: 1.25rem;
        }

        .viewing-eyebrow {
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--gold-primary);
          display: block;
          margin-bottom: 4px;
        }

        .viewing-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 6px;
        }

        .viewing-sub {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
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
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }

        .viewing-slots-stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .slot-choice-btn {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }

        [data-theme="dark"] .slot-choice-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
        }

        [data-theme="light"] .slot-choice-btn {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .slot-choice-btn:hover {
          border-color: var(--gold-border);
        }

        .slot-choice-btn.active {
          border-color: var(--gold-primary);
          background: rgba(221, 167, 82, 0.12);
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
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .slot-check {
          color: var(--gold-primary);
        }

        .viewing-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          color: var(--gold-primary);
          pointer-events: none;
        }

        .viewing-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.4rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          outline: none;
        }

        [data-theme="dark"] .viewing-input {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
        }

        [data-theme="light"] .viewing-input {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .book-viewing-submit-btn {
          padding: 0.85rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 0.5rem;
        }

        .booking-confirmed-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 1.5rem 0.5rem;
          gap: 0.75rem;
        }

        .booked-check-icon {
          color: #10B981;
        }

        .booked-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .booked-details {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .booked-note {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
        }

        .reset-view-btn {
          margin-top: 0.75rem;
          padding: 0.6rem 1.25rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          cursor: pointer;
        }

        /* 6. Similar Properties */
        .similar-properties-section {
          margin-top: 5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .similar-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 2rem;
        }

        @media (max-width: 1024px) {
          .detail-layout {
            grid-template-columns: 1fr;
            gap: 3rem;
          }
          .detail-sidebar-col {
            position: static;
          }
          .main-image-frame {
            height: 440px;
          }
        }

        @media (max-width: 768px) {
          .property-top-header {
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
          .top-action-group {
            width: 100%;
          }
          .top-inquire-btn {
            flex: 1;
          }
          .main-image-frame {
            height: 320px;
          }
        }
      \`}</style>
    </div>
  );
};
`;

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully wrote updated PropertyDetailView.tsx');
