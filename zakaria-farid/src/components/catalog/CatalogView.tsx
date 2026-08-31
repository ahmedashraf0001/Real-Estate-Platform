'use client';
import { useRouter } from 'next/navigation';
import { triggerNavigationStart } from '@/components/NavigationProgress';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PropertyCard } from '@/components/property/PropertyCard';
import { MarketChart } from '@/components/MarketChart';
import { CompareDrawer } from '@/components/property/CompareDrawer';
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { Property } from '@/types';
import { useFavorites } from '@/lib/context/FavoritesContext';
import { usePlatformSettings } from '@/lib/hooks/usePlatformSettings';
import { getDynamicDestinationPills, identifyPropertyDestinationKey } from '@/lib/utils/dynamicLocations';
import {
  SlidersHorizontal,
  ChevronDown,
  Bell,
  TrendingUp,
  Search,
  MapPin,
  Building2,
  Banknote,
  Bed,
  Check,
  X,
  LayoutGrid,
  List,
  Sparkles,
  Scale,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Waves,
  Car,
  Palmtree,
  Crown,
  Calendar,
  ArrowUpRight,
  Shield,
  ShieldCheck,
  Layers,
  Compass,
  Paintbrush,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface CatalogViewProps {
  properties?: Property[];
  locale?: string;
  initialFilters?: {
    location?: string;
    propertyType?: string;
    priceTier?: string;
    minPrice?: string;
    maxPrice?: string;
  };
  onSelectProperty?: (id: string) => void;
  onOpenInquiry?: (title?: string) => void;
}

export type SortOption = 'highest' | 'lowest' | 'newest' | 'largest';
export type ViewMode = 'grid' | 'compact' | 'list';

const SORT_OPTIONS: { id: SortOption; label: string; shortLabel: string; labelAr: string; shortLabelAr: string }[] = [
  { id: 'highest', label: 'Highest Guide Price', shortLabel: 'Highest Price', labelAr: 'السعر: من الأعلى للأقل', shortLabelAr: 'السعر الأعلى' },
  { id: 'lowest', label: 'Lowest Guide Price', shortLabel: 'Lowest Price', labelAr: 'السعر: من الأقل للأعلى', shortLabelAr: 'السعر الأقل' },
  { id: 'newest', label: 'Newest Delivery Year', shortLabel: 'Newest Delivery', labelAr: 'سنة الاستلام: الأحدث', shortLabelAr: 'الأحدث تسليماً' },
  { id: 'largest', label: 'Largest Built-Up Area', shortLabel: 'Largest Area', labelAr: 'المساحة: الأكبر مساحة', shortLabelAr: 'الأكبر مساحة' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'All', label: 'All Typologies', shortLabel: 'All Types', labelAr: 'جميع أنواع العقارات', shortLabelAr: 'جميع العقارات' },
  { value: 'mansion_villa', label: 'Palaces & Standalone Villas', shortLabel: 'Mansions & Villas', labelAr: 'قصور وفيلات مستقلة', shortLabelAr: 'قصور وفيلات' },
  { value: 'penthouse_duplex', label: 'Penthouses & Sky Duplexes', shortLabel: 'Penthouses', labelAr: 'بنتهاوس ودوبلكس سحابي', shortLabelAr: 'بنتهاوس' },
  { value: 'apartment', label: 'Luxury Apartments & Suites', shortLabel: 'Apartments', labelAr: 'شقق سكنية فاخرة', shortLabelAr: 'شقق فاخرة' },
  { value: 'building', label: 'Whole Buildings (صرح كامل)', shortLabel: 'Buildings', labelAr: 'عمائر وصروح كاملة', shortLabelAr: 'عمائر كاملة' },
  { value: 'garage', label: 'Private Garages & Bays', shortLabel: 'Garages', labelAr: 'جراجات وباكيات خاصة', shortLabelAr: 'جراجات' },
];

const PRICE_FILTER_OPTIONS = [
  { value: 'All', label: 'All Price Tiers', shortLabel: 'All Tiers', labelAr: 'جميع النطاقات السعرية', shortLabelAr: 'كل الأسعار' },
  { value: 'Under 25M EGP', label: 'Under 25M EGP', shortLabel: '< 25M EGP', labelAr: 'أقل من ٢٥ مليون ج.م', shortLabelAr: '< ٢٥ م ج.م' },
  { value: '25M - 50M+ EGP', label: '25M – 50M+ EGP', shortLabel: '25M–50M EGP', labelAr: 'من ٢٥ إلى ٥٠+ مليون ج.م', shortLabelAr: '٢٥–٥٠ م ج.م' },
  { value: '50M+ EGP', label: 'Ultra-Luxury (50M+ EGP)', shortLabel: '50M+ EGP', labelAr: 'فائقة الفخامة (+٥٠ مليون ج.م)', shortLabelAr: '+٥٠ م ج.م' },
];

const BEDROOM_FILTER_OPTIONS = [
  { value: 'All', label: 'All Bedrooms', shortLabel: 'All Beds', labelAr: 'جميع غرف النوم', shortLabelAr: 'كل الغرف' },
  { value: '3', label: '3 Bedrooms', shortLabel: '3 Beds', labelAr: '٣ غرف نوم', shortLabelAr: '٣ غرف' },
  { value: '4+', label: '4+ Bedrooms', shortLabel: '4+ Beds', labelAr: '٤+ غرف نوم', shortLabelAr: '٤+ غرف' },
  { value: '5+', label: '5+ Bedrooms', shortLabel: '5+ Beds', labelAr: '٥+ غرف نوم', shortLabelAr: '٥+ غرف' },
];

const cardsContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

export const CatalogView: React.FC<CatalogViewProps> = ({
  properties: propProperties,
  locale = 'en',
  initialFilters,
  onSelectProperty: propOnSelectProperty,
  onOpenInquiry: propOnOpenInquiry
}) => {
  const isAr = locale === 'ar';
  const router = useRouter();
  const onSelectProperty = propOnSelectProperty || ((id: string) => {
    triggerNavigationStart();
    router.push('/' + locale + '/properties/' + id);
  });
  const onOpenInquiry = propOnOpenInquiry || ((title?: string) => {
    window.location.href = 'https://wa.me/201009998888?text=' + encodeURIComponent('Hello, I am inquiring about ' + (title || 'sovereign acquisitions'));
  });

  // Use server-passed real DB properties; fall back to adapted FALLBACK_PROPERTIES
  const adaptedFallback = React.useMemo(() => adaptProperties(FALLBACK_PROPERTIES, locale as 'en' | 'ar'), [locale]);
  const allPropertiesList: Property[] = (propProperties && propProperties.length > 0) ? (propProperties as Property[]) : adaptedFallback;

  // Dynamically compute destination pills and filter options directly from active database properties
  const dynamicDestinationPills = useMemo(() => {
    return getDynamicDestinationPills(allPropertiesList);
  }, [allPropertiesList]);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState(initialFilters?.location || 'All');
  const [propertyType, setPropertyType] = useState(initialFilters?.propertyType || 'All');
  const [priceTier, setPriceTier] = useState(initialFilters?.priceTier || 'All');
  const [bedrooms, setBedrooms] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('highest');
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<string>('All');
  const [selectedDelivery, setSelectedDelivery] = useState<string>('All');
  const [selectedFinishing, setSelectedFinishing] = useState<string>('All');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { registerProperties } = useFavorites();
  const platformSettings = usePlatformSettings();
  const showSidebar = Boolean(
    platformSettings.showMarketRadar !== false || platformSettings.showVIPAlerts !== false
  );

  const dynamicLocationFilterOptions = useMemo(() => {
    return dynamicDestinationPills.map((d) => ({
      value: d.id,
      label: d.id === 'All' ? 'All Destinations' : d.label,
      shortLabel: d.shortLabel || d.label,
      labelAr: d.id === 'All' ? 'جميع الوجهات والمدن' : d.labelAr,
      shortLabelAr: d.shortLabelAr || d.labelAr,
      count: d.count
    }));
  }, [dynamicDestinationPills]);

  useEffect(() => {
    setMounted(true);
    if (allPropertiesList && allPropertiesList.length > 0) {
      registerProperties(allPropertiesList);
    }
  }, [allPropertiesList, registerProperties]);
  const [openDropdown, setOpenDropdown] = useState<'location' | 'type' | 'price' | 'beds' | null>(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Mobile Valuation Radar opens as a bottom sheet from the search row
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [dropdownPlacement, setDropdownPlacement] = useState<'down' | 'up'>('down');
  const sortRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleToggleDropdown = (type: 'location' | 'type' | 'price' | 'beds', e: React.MouseEvent<HTMLButtonElement>) => {
    if (openDropdown === type) {
      setOpenDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const requiredSpace = 260;
    if (spaceBelow < requiredSpace && rect.top > spaceBelow) {
      setDropdownPlacement('up');
    } else {
      setDropdownPlacement('down');
    }
    setOpenDropdown(type);
  };
  const [emailAlertSaved, setEmailAlertSaved] = useState(false);
  const [isEmailInputOpen, setIsEmailInputOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [searchSaved, setSearchSaved] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      if (sortRef.current && !sortRef.current.contains(target as Node)) {
        setIsSortOpen(false);
      }
      if (openDropdown) {
        const closestDropdown = target.closest?.('.custom-filter-dropdown');
        if (!closestDropdown) {
          setOpenDropdown(null);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setIsSortOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDropdown]);

  useEffect(() => {
    if (isAdvancedModalOpen || isMobileFiltersOpen) {
      if (typeof window !== 'undefined' && window.__masrLenis) {
        window.__masrLenis.stop();
      }
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      return () => {
        if (typeof window !== 'undefined' && window.__masrLenis) {
          window.__masrLenis.start();
        }
        document.documentElement.style.overflow = originalHtmlOverflow || '';
        document.body.style.overflow = originalBodyOverflow || '';
      };
    }
  }, [isAdvancedModalOpen, isMobileFiltersOpen]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const removeCompare = (id: string) => {
    setCompareIds((prev) => prev.filter((item) => item !== id));
  };

  const clearCompare = () => {
    setCompareIds([]);
  };

  const selectedCompareProperties = useMemo(() => {
    return allPropertiesList.filter((p: Property) => compareIds.includes(p.id));
  }, [compareIds, allPropertiesList]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    location !== 'All' ||
    propertyType !== 'All' ||
    priceTier !== 'All' ||
    bedrooms !== 'All' ||
    selectedAmenity !== 'All' ||
    selectedFinishing !== 'All' ||
    selectedDelivery !== 'All';

  const resetAllFilters = () => {
    setSearchQuery('');
    setLocation('All');
    setPropertyType('All');
    setPriceTier('All');
    setBedrooms('All');
    setSelectedAmenity('All');
    setSelectedFinishing('All');
    setSelectedDelivery('All');
  };

  // Filter and Sort Logic — uses adapted DB field names (price = price_egp, beds = bedrooms, sqm = area_sqm, etc.)
  const filteredProperties = useMemo(() => {
    return allPropertiesList.filter((p: Property) => {
      // Free-Text Keyword Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matches =
          (p.title || p.title_en || '').toLowerCase().includes(query) ||
          (p.district || '').toLowerCase().includes(query) ||
          (p.location || '').toLowerCase().includes(query) ||
          (p.estateName || '').toLowerCase().includes(query) ||
          (p.propertyType || p.type || '').toLowerCase().includes(query) ||
          (p.narrative || p.description_en || '').toLowerCase().includes(query) ||
          (p.amenities || []).some((a: any) => (a.title || '').toLowerCase().includes(query)) ||
          (p.property_amenities || []).some((a: any) => (a.amenity_en || '').toLowerCase().includes(query));
        if (!matches) return false;
      }

      // Location Filter
      if (location !== 'All') {
        const destKey = identifyPropertyDestinationKey(p).toLowerCase();
        const destKeyNormalized = destKey.replace(/[-_]/g, ' ');
        const locLower = location.toLowerCase();
        const locNormalized = locLower.replace(/[-_]/g, ' ');

        const locationMatches =
          (p.district || '').toLowerCase().includes(locLower) ||
          (p.district || '').toLowerCase().includes(locNormalized) ||
          (p.location || '').toLowerCase().includes(locLower) ||
          (p.location || '').toLowerCase().includes(locNormalized) ||
          ((p as any).city_en || '').toLowerCase().includes(locLower) ||
          ((p as any).city_ar || '').toLowerCase().includes(locLower) ||
          ((p as any).district_ar || '').toLowerCase().includes(locLower) ||
          destKey.includes(locLower) ||
          destKey.includes(locNormalized) ||
          destKeyNormalized.includes(locLower) ||
          destKeyNormalized.includes(locNormalized) ||
          locLower.includes(destKey) ||
          locNormalized.includes(destKeyNormalized);
        if (!locationMatches) return false;
      }

      // Property Type Filter — matches authentic luxury typologies
      if (propertyType !== 'All') {
        const pt = (p.propertyType || '').toLowerCase();
        const rawType = (p.type || '').toLowerCase();
        const title = ((p.title || '') + ' ' + (p.title_en || '') + ' ' + (p.title_ar || '')).toLowerCase();
        const filterVal = propertyType.toLowerCase();

        if (filterVal === 'mansion_villa') {
          const isMansionVilla = rawType.includes('villa') || rawType.includes('mansion') || pt.includes('villa') || pt.includes('mansion') || title.includes('villa') || title.includes('mansion') || title.includes('pavilion') || title.includes('sanctuary') || title.includes('قصر') || title.includes('فيلا');
          if (!isMansionVilla) return false;
        } else if (filterVal === 'penthouse_duplex') {
          const isPenthouse = rawType.includes('penthouse') || rawType.includes('duplex') || rawType.includes('roof') || pt.includes('penthouse') || pt.includes('duplex') || title.includes('penthouse') || title.includes('duplex') || title.includes('roof') || title.includes('بنتهاوس') || title.includes('دوبلكس') || title.includes('روف');
          if (!isPenthouse) return false;
        } else if (filterVal === 'apartment') {
          const isApartment = rawType === 'apartment' || pt.includes('apartment') || title.includes('apartment') || title.includes('شقة');
          if (!isApartment) return false;
        } else if (filterVal === 'building') {
          const isBuilding = rawType.includes('building') || pt.includes('building') || title.includes('building') || title.includes('عمارة');
          if (!isBuilding) return false;
        } else if (filterVal === 'garage') {
          const isGarage = rawType.includes('garage') || pt.includes('garage') || title.includes('garage') || title.includes('جراج');
          if (!isGarage) return false;
        } else {
          if (rawType !== filterVal && !pt.includes(filterVal) && !filterVal.includes(rawType)) {
            return false;
          }
        }
      }

      // Price Tier Filter — use adapted price (= price_egp) or raw price_egp
      const priceVal = p.price || p.price_egp || 0;
      if (priceTier !== 'All') {
        if (priceTier === 'Under 25M EGP' && priceVal >= 25000000) return false;
        if (priceTier === '25M - 50M+ EGP' && (priceVal < 25000000 || priceVal > 50000000)) return false;
        if (priceTier === '50M+ EGP' && priceVal < 50000000) return false;
      }

      // Bedrooms Filter — use adapted beds or raw bedrooms field
      const bedsVal = p.beds || (p as any).bedrooms || 0;
      if (bedrooms !== 'All') {
        if (bedrooms === '4+' && bedsVal < 4) return false;
        if (bedrooms === '5+' && bedsVal < 5) return false;
        if (bedrooms === '3' && bedsVal !== 3) return false;
      }

      // Delivery Status Filter — map to completion_status from DB
      if (selectedDelivery !== 'All') {
        const isReady = p.completion_status === 'ready' || (p.builtYear && p.builtYear <= 2025);
        const isOffPlan = p.completion_status === 'off_plan';
        if (selectedDelivery === 'Immediate' && !isReady) return false;
        if (selectedDelivery === 'OffPlan' && !isOffPlan && isReady) return false;
      }

      // Finishing Level Filter
      if (selectedFinishing !== 'All') {
        const finStr = ((p.finishing || '') + ' ' + (p.completion_status || '') + ' ' + JSON.stringify(p.spec_layers || [])).toLowerCase();
        if (selectedFinishing === 'fully') {
          const isFull = finStr.includes('full') || finStr.includes('ultra') || finStr.includes('super') || p.completion_status === 'ready';
          if (!isFull) return false;
        } else if (selectedFinishing === 'semi') {
          const isSemi = finStr.includes('semi') || finStr.includes('shell') || finStr.includes('محارة');
          if (!isSemi) return false;
        } else if (selectedFinishing === 'brick') {
          const isBrick = finStr.includes('brick') || finStr.includes('red') || finStr.includes('طوب') || p.completion_status === 'off_plan';
          if (!isBrick) return false;
        }
      }

      // Signature Architectural Specs & Lifestyle Filter
      if (selectedAmenity !== 'All') {
        const corpus = (
          JSON.stringify(p.amenities || []) + ' ' +
          JSON.stringify(p.property_amenities || []) + ' ' +
          JSON.stringify(p.spec_layers || []) + ' ' +
          (p.narrative || '') + ' ' +
          (p.description_en || '') + ' ' +
          (p.description_ar || '') + ' ' +
          (p.title_en || '') + ' ' +
          (p.title_ar || '') + ' ' +
          (p.location || '') + ' ' +
          (p.district || '')
        ).toLowerCase();

        if (selectedAmenity === 'cad') {
          const hasCad = Array.isArray(p.spec_layers) && p.spec_layers.length > 0;
          if (!hasCad && !corpus.includes('cad') && !corpus.includes('مخطط')) return false;
        } else if (selectedAmenity === 'pool') {
          if (!corpus.includes('pool') && !corpus.includes('سباحة') && !corpus.includes('lagoon') && !corpus.includes('لاجون')) return false;
        } else if (selectedAmenity === 'beach') {
          if (!corpus.includes('beach') && !corpus.includes('sea') && !corpus.includes('شاطئ') && !corpus.includes('بحر') && !corpus.includes('coast') && !corpus.includes('sokhna') && !corpus.includes('gouna')) return false;
        } else if (selectedAmenity === 'smart') {
          if (!corpus.includes('smart') && !corpus.includes('automation') && !corpus.includes('أتمتة') && !corpus.includes('ذكي') && !(p.price && p.price > 25000000)) return false;
        } else if (selectedAmenity === 'garage') {
          if (!corpus.includes('garage') && !corpus.includes('parking') && !corpus.includes('جراج') && !corpus.includes('موقف') && !corpus.includes('bay')) return false;
        } else if (selectedAmenity === 'garden') {
          if (!corpus.includes('garden') && !corpus.includes('terrace') && !corpus.includes('حديقة') && !corpus.includes('تراس') && (p.floor_number !== 0 && !corpus.includes('ground'))) return false;
        }
      }
return true;
    }).sort((a: Property, b: Property) => {
      const aPrice = a.price || a.price_egp || 0;
      const bPrice = b.price || b.price_egp || 0;
      const aSqm = a.sqm || (a as any).area_sqm || 0;
      const bSqm = b.sqm || (b as any).area_sqm || 0;
      if (sortBy === 'highest') return bPrice - aPrice;
      if (sortBy === 'lowest') return aPrice - bPrice;
      if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'largest') return bSqm - aSqm;
      return 0;
    });
  }, [allPropertiesList, searchQuery, location, propertyType, priceTier, bedrooms, selectedAmenity, selectedFinishing, selectedDelivery, sortBy]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage) || 1;
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProperties.slice(start, start + itemsPerPage);
  }, [filteredProperties, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, location, propertyType, priceTier, bedrooms, sortBy]);

  const renderOmnibarSlots = (isMobileSheet = false) => (
    <>
      {isMobileSheet && (
        <div className="mobile-sheet-head">
          <span className="mobile-sheet-title">{isAr ? 'الفلاتر' : 'Filters'}</span>
          <div className="mobile-sheet-head-actions">
            <button
              className={`omnibar-filter-btn mobile-head-filter-btn ${isAdvancedModalOpen ? 'active' : ''} ${(selectedDelivery !== 'All' || selectedAmenity !== 'All' || selectedFinishing !== 'All') ? 'has-extra-filters' : ''}`}
              title={isAr ? "الفلاتر المعمارية المتقدمة" : "Advanced Architectural Filters"}
              onClick={() => setIsAdvancedModalOpen(true)}
              type="button"
              aria-label={isAr ? 'الفلاتر المتقدمة' : 'Advanced Filters'}
            >
              <SlidersHorizontal size={16} />
              {(selectedDelivery !== 'All' || selectedAmenity !== 'All' || selectedFinishing !== 'All') && (
                <span className="omnibar-filter-badge" />
              )}
            </button>
            <button
              type="button"
              className="mobile-sheet-close"
              onClick={() => setIsMobileFiltersOpen(false)}
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {!isMobileSheet && <div className="omnibar-divider" />}

      {/* Slot 2: Location Dropdown */}
      <div className="omnibar-filter-slot custom-filter-dropdown">
        <label className="omnibar-slot-label">{isAr ? 'المدينة / المنطقة' : 'LOCATION'}</label>
        <button
          type="button"
          className={`omnibar-trigger-btn ${openDropdown === 'location' ? 'open' : ''} ${location !== 'All' ? 'has-value' : ''}`}
          onClick={(e) => handleToggleDropdown('location', e)}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === 'location'}
        >
          <div className="trigger-left">
            <MapPin size={15} className="slot-icon" />
            <span className="trigger-value">
              {(() => {
                const opt = dynamicLocationFilterOptions.find((o) => o.value === location);
                return opt ? (isAr ? opt.shortLabelAr : opt.shortLabel) : (isAr ? 'جميع المدن' : 'All Cities');
              })()}
            </span>
          </div>
          <ChevronDown size={13} className={`slot-chevron ${openDropdown === 'location' ? 'rotate' : ''}`} />
        </button>

        <AnimatePresence>
          {openDropdown === 'location' && (
            <motion.div
              className={`filter-custom-menu placement-${dropdownPlacement}`}
              data-lenis-prevent="true"
              initial={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {dynamicLocationFilterOptions.map((opt: any) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-menu-option ${location === opt.value ? 'selected' : ''}`}
                  onClick={() => {
                    setLocation(opt.value);
                    setOpenDropdown(null);
                  }}
                >
                  <span className="option-label">{isAr ? opt.labelAr : opt.label}</span>
                  {location === opt.value && <Check size={14} className="option-check" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="omnibar-divider" />

      {/* Slot 3: Property Type Dropdown */}
      <div className="omnibar-filter-slot custom-filter-dropdown">
        <label className="omnibar-slot-label">{isAr ? 'نوع العقار' : 'PROPERTY TYPE'}</label>
        <button
          type="button"
          className={`omnibar-trigger-btn ${openDropdown === 'type' ? 'open' : ''} ${propertyType !== 'All' ? 'has-value' : ''}`}
          onClick={(e) => handleToggleDropdown('type', e)}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === 'type'}
        >
          <div className="trigger-left">
            <Building2 size={15} className="slot-icon" />
            <span className="trigger-value">
              {(() => {
                const opt = TYPE_FILTER_OPTIONS.find((o) => o.value === propertyType);
                return opt ? (isAr ? opt.shortLabelAr : opt.shortLabel) : (isAr ? 'جميع الأنواع' : 'All Types');
              })()}
            </span>
          </div>
          <ChevronDown size={13} className={`slot-chevron ${openDropdown === 'type' ? 'rotate' : ''}`} />
        </button>

        <AnimatePresence>
          {openDropdown === 'type' && (
            <motion.div
              className={`filter-custom-menu placement-${dropdownPlacement}`}
              data-lenis-prevent="true"
              initial={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {TYPE_FILTER_OPTIONS.map((opt: any) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-menu-option ${propertyType === opt.value ? 'selected' : ''}`}
                  onClick={() => {
                    setPropertyType(opt.value);
                    setOpenDropdown(null);
                  }}
                >
                  <span className="option-label">{isAr ? opt.labelAr : opt.label}</span>
                  {propertyType === opt.value && <Check size={14} className="option-check" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="omnibar-divider" />

      {/* Slot 4: Price Tier Dropdown */}
      <div className="omnibar-filter-slot custom-filter-dropdown">
        <label className="omnibar-slot-label">{isAr ? 'نطاق السعر' : 'PRICE TIER'}</label>
        <button
          type="button"
          className={`omnibar-trigger-btn ${openDropdown === 'price' ? 'open' : ''} ${priceTier !== 'All' ? 'has-value' : ''}`}
          onClick={(e) => handleToggleDropdown('price', e)}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === 'price'}
        >
          <div className="trigger-left">
            <Banknote size={15} className="slot-icon" />
            <span className="trigger-value">
              {(() => {
                const opt = PRICE_FILTER_OPTIONS.find((o) => o.value === priceTier);
                return opt ? (isAr ? opt.shortLabelAr : opt.shortLabel) : (isAr ? 'كل الأسعار' : 'All Tiers');
              })()}
            </span>
          </div>
          <ChevronDown size={13} className={`slot-chevron ${openDropdown === 'price' ? 'rotate' : ''}`} />
        </button>

        <AnimatePresence>
          {openDropdown === 'price' && (
            <motion.div
              className={`filter-custom-menu placement-${dropdownPlacement}`}
              data-lenis-prevent="true"
              initial={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {PRICE_FILTER_OPTIONS.map((opt: any) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-menu-option ${priceTier === opt.value ? 'selected' : ''}`}
                  onClick={() => {
                    setPriceTier(opt.value);
                    setOpenDropdown(null);
                  }}
                >
                  <span className="option-label">{isAr ? opt.labelAr : opt.label}</span>
                  {priceTier === opt.value && <Check size={14} className="option-check" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="omnibar-divider" />

      {/* Slot 5: Bedrooms Dropdown */}
      <div className="omnibar-filter-slot custom-filter-dropdown">
        <label className="omnibar-slot-label">{isAr ? 'غرف النوم' : 'BEDROOMS'}</label>
        <button
          type="button"
          className={`omnibar-trigger-btn ${openDropdown === 'beds' ? 'open' : ''} ${bedrooms !== 'All' ? 'has-value' : ''}`}
          onClick={(e) => handleToggleDropdown('beds', e)}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === 'beds'}
        >
          <div className="trigger-left">
            <Bed size={15} className="slot-icon" />
            <span className="trigger-value">
              {(() => {
                const opt = BEDROOM_FILTER_OPTIONS.find((o) => o.value === bedrooms);
                return opt ? (isAr ? opt.shortLabelAr : opt.shortLabel) : (isAr ? 'كل الغرف' : 'All Bedrooms');
              })()}
            </span>
          </div>
          <ChevronDown size={13} className={`slot-chevron ${openDropdown === 'beds' ? 'rotate' : ''}`} />
        </button>

        <AnimatePresence>
          {openDropdown === 'beds' && (
            <motion.div
              className={`filter-custom-menu placement-${dropdownPlacement}`}
              data-lenis-prevent="true"
              initial={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {BEDROOM_FILTER_OPTIONS.map((opt: any) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-menu-option ${bedrooms === opt.value ? 'selected' : ''}`}
                  onClick={() => {
                    setBedrooms(opt.value);
                    setOpenDropdown(null);
                  }}
                >
                  <span className="option-label">{isAr ? opt.labelAr : opt.label}</span>
                  {bedrooms === opt.value && <Check size={14} className="option-check" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isMobileSheet && (
        <>
          <div className="omnibar-divider" />

          {/* Slot 6: Action Controls */}
          <div className="omnibar-actions-slot">
            {hasActiveFilters && (
              <button
                className="omnibar-reset-btn"
                title={isAr ? "إعادة ضبط جميع الفلاتر" : "Reset All Filters"}
                onClick={resetAllFilters}
                type="button"
              >
                <RotateCcw size={13} />
                <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            )}

            <button
              className={`omnibar-filter-btn ${isAdvancedModalOpen ? 'active' : ''} ${(selectedDelivery !== 'All' || selectedAmenity !== 'All' || selectedFinishing !== 'All') ? 'has-extra-filters' : ''}`}
              title={isAr ? "الفلاتر المعمارية المتقدمة" : "Advanced Architectural Filters"}
              onClick={() => setIsAdvancedModalOpen(true)}
              type="button"
            >
              <SlidersHorizontal size={17} />
              {(selectedDelivery !== 'All' || selectedAmenity !== 'All' || selectedFinishing !== 'All') && (
                <span className="omnibar-filter-badge" />
              )}
            </button>
          </div>
        </>
      )}

      {isMobileSheet && (
        <button
          type="button"
          className="btn-gold mobile-sheet-apply"
          onClick={() => setIsMobileFiltersOpen(false)}
        >
          {isAr ? `عرض ${filteredProperties.length} نتيجة` : `Show ${filteredProperties.length} results`}
        </button>
      )}
    </>
  );

  return (
    <div className="catalog-view" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Dedicated Header & Filter Banner */}
      <div className="catalog-header-banner">
        <div className="catalog-header-glow" />
        <div className="container relative-container">
          <div className="catalog-header">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="eyebrow">{isAr ? 'دليل الصروح العقارية الفاخرة' : 'CURATED REAL ESTATE DIRECTORY'}</span>
            </motion.div>

            <motion.h1
              className="catalog-main-title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="header-scan-glow">{isAr ? 'أندر الصروح والعقارات المعمارية في مصر' : "Egypt's Prime Listings"}</span>
            </motion.h1>
          </div>

          {/* Quick Destination Jump Pills */}
          <motion.div
            className="catalog-destination-pills"
            role="tablist"
            aria-label="Destination Quick Jump"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            {dynamicDestinationPills.map((dest) => {
              const isActive = location === dest.id || (dest.id === 'All' && location === 'All');
              return (
                <button
                  key={dest.id}
                  className={`dest-jump-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setLocation(dest.id)}
                  role="tab"
                  aria-selected={isActive}
                >
                  <span>{isAr ? dest.labelAr : dest.label}</span>
                  {isActive && (
                    <motion.div
                      className="dest-jump-pill-active"
                      layoutId="activeCatalogDestPill"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </motion.div>

          {/* The Sovereign Architectural Omnibar (Unified Master Console) */}
          <motion.div
            className={`catalog-master-omnibar ${isSearchFocused || searchQuery.trim().length > 0 ? 'search-active' : ''}`}
            ref={toolbarRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            {/* Slot 1: Integrated Keyword Search */}
            <div className="omnibar-search-slot">
              <label className="omnibar-slot-label">{isAr ? 'البحث' : 'SEARCH'}</label>
              <div className="omnibar-search-inner">
                <Search size={15} className="slot-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    setIsSearchFocused(true);
                    setOpenDropdown(null);
                  }}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={
                    isSearchFocused
                      ? (isAr ? "ابحث بالصرح، الكمبوند، أو المزايا..." : "Search estates, compounds, architects, amenities (e.g. Sodic, Sea Cliff)...")
                      : (isAr ? "ابحث بالاسم، الكمبوند، المزايا..." : "Estates, compounds, amenities...")
                  }
                  className="omnibar-search-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="omnibar-clear-btn"
                    title={isAr ? "مسح البحث" : "Clear search"}
                    type="button"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Mobile: filters toggle lives inside the search pill (opens bottom sheet) */}
              <button
                type="button"
                className="mobile-filters-toggle"
                onClick={() => setIsMobileFiltersOpen(true)}
                aria-label={isAr ? 'الفلاتر' : 'Filters'}
              >
                <SlidersHorizontal size={15} />
                <span>{isAr ? 'الفلاتر' : 'Filters'}</span>
                {(() => {
                  const n =
                    [location, propertyType, priceTier, bedrooms, selectedDelivery, selectedAmenity].filter((v) => v !== 'All').length +
                    (searchQuery.trim() ? 1 : 0);
                  return n > 0 ? <span className="mobile-filters-count">{n}</span> : null;
                })()}
              </button>
            </div>

            {/* Mobile: market radar trigger next to the search pill (opens bottom sheet) */}
            <button
              type="button"
              className="radar-top-trigger"
              onClick={() => setIsRadarOpen(true)}
              aria-label={isAr ? 'مؤشرات السوق' : 'Market Radar'}
              title={isAr ? 'مؤشرات السوق' : 'Market Radar'}
            >
              <TrendingUp size={16} />
            </button>

            <div className="omnibar-slots-group desktop-omnibar-slots">
              {renderOmnibarSlots(false)}
            </div>
          </motion.div>

          {/* Active Dismissible Filter Tags */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                className="active-filter-tags-row"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="active-tags-heading">{isAr ? 'الفلاتر النشطة:' : 'Active Filters:'}</span>

                {searchQuery.trim() && (
                  <span className="filter-tag">
                    <span className="tag-text">"{searchQuery}"</span>
                    <button onClick={() => setSearchQuery('')} className="tag-remove-btn" title={isAr ? "إزالة البحث" : "Remove keyword search"}>
                      <X size={12} />
                    </button>
                  </span>
                )}

                {location !== 'All' && (
                  <span className="filter-tag">
                    <MapPin size={12} className="tag-gold-icon" />
                    <span className="tag-text">{isAr ? (dynamicLocationFilterOptions.find(o => o.value === location)?.shortLabelAr || location) : location}</span>
                    <button onClick={() => setLocation('All')} className="tag-remove-btn" title={isAr ? "إزالة فلتر الموقع" : "Remove location filter"}>
                      <X size={12} />
                    </button>
                  </span>
                )}

                {propertyType !== 'All' && (
                  <span className="filter-tag">
                    <Building2 size={12} className="tag-gold-icon" />
                    <span className="tag-text">{isAr ? (TYPE_FILTER_OPTIONS.find(o => o.value === propertyType)?.shortLabelAr || propertyType) : propertyType}</span>
                    <button onClick={() => setPropertyType('All')} className="tag-remove-btn" title={isAr ? "إزالة فلتر النوع" : "Remove type filter"}>
                      <X size={12} />
                    </button>
                  </span>
                )}

                {priceTier !== 'All' && (
                  <span className="filter-tag">
                    <Banknote size={12} className="tag-gold-icon" />
                    <span className="tag-text">{isAr ? (PRICE_FILTER_OPTIONS.find(o => o.value === priceTier)?.shortLabelAr || priceTier) : priceTier}</span>
                    <button onClick={() => setPriceTier('All')} className="tag-remove-btn" title={isAr ? "إزالة فلتر السعر" : "Remove price filter"}>
                      <X size={12} />
                    </button>
                  </span>
                )}

                {bedrooms !== 'All' && (
                  <span className="filter-tag">
                    <Bed size={12} className="tag-gold-icon" />
                    <span className="tag-text">{isAr ? (BEDROOM_FILTER_OPTIONS.find(o => o.value === bedrooms)?.shortLabelAr || bedrooms) : bedrooms}</span>
                    <button onClick={() => setBedrooms('All')} className="tag-remove-btn" title={isAr ? "إزالة فلتر الغرف" : "Remove bedrooms filter"}>
                      <X size={12} />
                    </button>
                  </span>
                )}

                {selectedDelivery !== 'All' && (
                  <span className="filter-tag">
                    <Calendar size={12} className="tag-gold-icon" />
                    <span className="tag-text">
                      {isAr
                        ? (selectedDelivery === 'Immediate' ? 'استلام فوري' : 'تحت الإنشاء')
                        : (selectedDelivery === 'Immediate' ? 'Immediate Handover' : 'Under Construction')}
                    </span>
                    <button onClick={() => setSelectedDelivery('All')} className="tag-remove-btn" title={isAr ? "إزالة فلتر الاستلام" : "Remove delivery filter"}>
                      <X size={12} />
                    </button>
                  </span>
                )}

                {selectedFinishing !== 'All' && (
                  <span className="filter-tag">
                    <Layers size={12} className="tag-gold-icon" />
                    <span className="tag-text">
                      {isAr
                        ? (selectedFinishing === 'fully' ? 'تشطيب كامل' : selectedFinishing === 'semi' ? 'نصف تشطيب' : 'طوب أحمر')
                        : (selectedFinishing === 'fully' ? 'Fully Finished' : selectedFinishing === 'semi' ? 'Semi-Finished' : 'Core & Shell')}
                    </span>
                    <button onClick={() => setSelectedFinishing('All')} className="tag-remove-btn" title={isAr ? "إزالة فلتر التشطيب" : "Remove finishing filter"}>
                      <X size={12} />
                    </button>
                  </span>
                )}

                {selectedAmenity !== 'All' && (
                  <span className="filter-tag">
                    <Sparkles size={12} className="tag-gold-icon" />
                    <span className="tag-text">
                      {(() => {
                        const amenityLabels: Record<string, { ar: string; en: string }> = {
                          cad: { ar: 'مخططات CAD معتمدة', en: '1:1 CAD Blueprints' },
                          pool: { ar: 'حمام سباحة خاص', en: 'Private Pool' },
                          beach: { ar: 'واجهة بحرية وشاطئية', en: 'Beachfront Access' },
                          smart: { ar: 'نظام تحكم ذكي', en: 'Smart Automation' },
                          garage: { ar: 'جراج سفلي مؤمن', en: 'Secured Garage' },
                          garden: { ar: 'حديقة وتراس خاص', en: 'Private Garden' },
                        };
                        const found = amenityLabels[selectedAmenity];
                        return isAr ? (found?.ar || selectedAmenity) : (found?.en || selectedAmenity);
                      })()}
                    </span>
                    <button onClick={() => setSelectedAmenity('All')} className="tag-remove-btn" title={isAr ? "إزالة فلتر المواصفات" : "Remove spec filter"}>
                      <X size={12} />
                    </button>
                  </span>
                )}

                <button onClick={resetAllFilters} className="clear-all-tags-btn">
                  {isAr ? 'مسح الكل' : 'Clear All'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Catalog Content Body */}
      <div className="container">
        {/* Results Bar */}
        <div className="results-meta-bar">
          <div className="results-count-badge">
            <span className="results-live-dot" />
            <div className="results-count-text">
              {isAr ? (
                <>
                  <span>عرض</span>
                  <strong className="gold-count">{filteredProperties.length}</strong>
                  <span>من أصل</span>
                  <strong className="total-count">{allPropertiesList.length}</strong>
                  <span>صروح معمارية</span>
                </>
              ) : (
                <>
                  <span>Showing</span>
                  <strong className="gold-count">{filteredProperties.length}</strong>
                  <span>of</span>
                  <strong className="total-count">{allPropertiesList.length}</strong>
                  <span>Masterpieces</span>
                </>
              )}
            </div>
          </div>

          <div className="results-controls">
            {/* View Mode & Density Switcher */}
            <div className="view-mode-toggle" role="group" aria-label="Layout Density Switcher">
              <button
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title={isAr ? "عرض رحب (عمودين)" : "Spacious Gallery (2-Col)"}
                aria-pressed={viewMode === 'grid'}
                type="button"
              >
                <LayoutGrid size={14} />
                <span className="view-mode-text">{isAr ? 'عرض رحب' : 'Spacious'}</span>
                {viewMode === 'grid' && (
                  <motion.div
                    className="view-mode-indicator"
                    layoutId="catalogViewModeIndicator"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
              </button>

              <button
                className={`view-mode-btn ${viewMode === 'compact' ? 'active' : ''}`}
                onClick={() => setViewMode('compact')}
                title={isAr ? "عرض مدمج (٣ أعمدة)" : "Compact Density Grid (3-Col)"}
                aria-pressed={viewMode === 'compact'}
                type="button"
              >
                <SlidersHorizontal size={13} />
                <span className="view-mode-text">{isAr ? 'عرض مدمج' : 'Compact'}</span>
                {viewMode === 'compact' && (
                  <motion.div
                    className="view-mode-indicator"
                    layoutId="catalogViewModeIndicator"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
              </button>

              <button
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title={isAr ? "عرض قائمة تفصيلي" : "Architectural Row List"}
                aria-pressed={viewMode === 'list'}
                type="button"
              >
                <List size={14} />
                <span className="view-mode-text">{isAr ? 'عرض قائمة' : 'List'}</span>
                {viewMode === 'list' && (
                  <motion.div
                    className="view-mode-indicator"
                    layoutId="catalogViewModeIndicator"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
              </button>
            </div>

            {/* Custom Gold Sort Dropdown */}
            <div className="custom-sort-container" ref={sortRef}>
              {isSortOpen && (
                <div className="sort-sheet-backdrop" onClick={() => setIsSortOpen(false)} />
              )}
              <span className="sort-label">{isAr ? 'الترتيب حسب:' : 'Sort:'}</span>
              <button
                className={`custom-sort-trigger ${isSortOpen ? 'open' : ''}`}
                onClick={() => setIsSortOpen(!isSortOpen)}
                aria-haspopup="listbox"
                aria-expanded={isSortOpen}
                type="button"
              >
                <span className="current-sort-label">
                  {(() => {
                    const opt = SORT_OPTIONS.find((o) => o.id === sortBy);
                    return opt ? (isAr ? opt.shortLabelAr : opt.shortLabel) : '';
                  })()}
                </span>
                <ChevronDown
                  size={14}
                  className={`sort-chevron ${isSortOpen ? 'rotate' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    className="custom-sort-menu"
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    role="listbox"
                  >
                    {SORT_OPTIONS.map((opt: any) => {
                      const isSelected = sortBy === opt.id;
                      return (
                        <button
                          key={opt.id}
                          className={`sort-menu-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSortBy(opt.id);
                            setIsSortOpen(false);
                          }}
                          role="option"
                          aria-selected={isSelected}
                          type="button"
                        >
                          <span>{isAr ? opt.labelAr : opt.label}</span>
                          {isSelected && <Check size={14} className="sort-item-check" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Main Body: Grid + Sidebar */}
        <div className={`catalog-body-layout ${!showSidebar ? 'no-sidebar' : ''}`}>
          {/* Properties Grid Column */}
          <div className="catalog-grid-col">
            {filteredProperties.length > 0 ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${viewMode}-${currentPage}`}
                  className={`catalog-cards-${viewMode}`}
                  variants={cardsContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {paginatedProperties.map((property: any, idx: number) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      index={idx}
                      onSelect={onSelectProperty}
                      viewMode={viewMode}
                      onToggleCompare={toggleCompare}
                      isCompared={compareIds.includes(property.id)}
                      locale={locale}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="no-results-box">
                <Search size={40} className="no-results-icon" />
                <h3>No architectural matches found</h3>
                <p>Try broadening your filters or clearing price tier constraints.</p>
                <button
                  className="btn-gold-outline reset-filters-btn"
                  onClick={resetAllFilters}
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Dynamic Luxury Pagination Bar */}
            {filteredProperties.length > 0 && (
              <div className="catalog-pagination-wrap">
                <div className="catalog-pagination">
                  <button
                    className="page-btn nav-arr"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    title="Previous Page"
                    type="button"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                      type="button"
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    className="page-btn nav-arr"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    title="Next Page"
                    type="button"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Insights Widgets */}
          {showSidebar && (
            <aside className="catalog-sidebar">
              {/* Interactive Data Visualization Widget (mobile: opens as bottom sheet) */}
              {platformSettings.showMarketRadar !== false && (
                <div className="radar-mobile-wrap">
                  {isRadarOpen && (
                    <div className="radar-sheet-backdrop" onClick={() => setIsRadarOpen(false)} />
                  )}
                  <div className={`radar-chart-holder ${isRadarOpen ? 'open' : ''}`}>
                    <MarketChart locale={locale} />
                  </div>
                </div>
              )}

              {/* Alert Subscription Card with Direct Email Input */}
              {platformSettings.showVIPAlerts !== false && (
                <div className="sidebar-widget alert-widget">
                  <div className="widget-header-row">
                    <div className="widget-icon-wrap">
                      <Bell size={18} className="alert-bell-icon" />
                    </div>
                    <div className="vip-concierge-badge">
                      <Sparkles size={11} className="vip-sparkle" />
                      <span>VIP DOSSIER</span>
                    </div>
                  </div>
                  <h3 className="widget-title">{locale === 'ar' ? 'تنبيهات العقارات الفاخرة' : 'Property Alerts'}</h3>
                  <p className="widget-desc">
                    {locale === 'ar' 
                      ? 'احفظ معايير بحثك واستلم إشعارات فورية عند إدراج عقارات جديدة تناسب اهتماماتك.' 
                      : 'Save your search and get notified when new properties matching your criteria become available.'}
                  </p>

                  {/* Email Form / Input */}
                  {isEmailInputOpen ? (
                    <form 
                      className="alert-email-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!alertEmail || !alertEmail.includes('@')) return;
                        setIsSubmittingEmail(true);
                        const searchCriteria = [
                          location ? `Location: ${location}` : '',
                          propertyType ? `Type: ${propertyType}` : '',
                          priceTier ? `Price: ${priceTier}` : '',
                        ].filter(Boolean).join(', ');
                        try {
                          // Primary: store in newsletter_subscribers table
                          await fetch('/api/subscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              email: alertEmail,
                              name: 'VIP Alert Subscriber',
                              source: 'Property Alert Subscription (Catalog Sidebar)',
                              locale,
                              search_criteria: searchCriteria || null,
                            })
                          });
                          setEmailAlertSaved(true);
                          setIsEmailInputOpen(false);
                        } catch (err) {
                          console.warn('Alert subscription error, falling back:', err);
                          // Fallback: store in leads CRM directly
                          try {
                            await fetch('/api/leads', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                name: 'VIP Alert Subscriber',
                                email: alertEmail,
                                phone: 'N/A - Email Only',
                                source: 'Property Alert Subscription',
                                message: `Subscribed to VIP property alerts. ${searchCriteria}`,
                                preferred_channel: 'email'
                              })
                            });
                          } catch { /* non-fatal */ }
                          setEmailAlertSaved(true);
                          setIsEmailInputOpen(false);
                        } finally {
                          setIsSubmittingEmail(false);
                        }
                      }}
                    >
                      <input 
                        type="email" 
                        required
                        placeholder={locale === 'ar' ? 'أدخل بريدك الإلكتروني...' : 'Enter your email address...'}
                        value={alertEmail}
                        onChange={(e) => setAlertEmail(e.target.value)}
                        className="alert-email-input"
                        autoFocus
                      />
                      <div className="alert-form-actions">
                        <button type="submit" className="btn-gold alert-submit-btn" disabled={isSubmittingEmail}>
                          {isSubmittingEmail ? (locale === 'ar' ? 'جاري التفعيل...' : 'Subscribing...') : (locale === 'ar' ? 'تأكيد الاشتراك' : 'Confirm Alerts')}
                        </button>
                        <button type="button" className="alert-cancel-btn" onClick={() => setIsEmailInputOpen(false)}>
                          {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="widget-actions">
                      <button
                        className={`btn-gold widget-cta ${searchSaved ? 'saved' : ''}`}
                        onClick={() => setSearchSaved(!searchSaved)}
                        type="button"
                      >
                        {searchSaved 
                          ? <><Check size={16} /> {locale === 'ar' ? 'تم حفظ البحث' : 'Search Saved'}</> 
                          : (locale === 'ar' ? 'حفظ معايير البحث' : 'Save Search')}
                      </button>
                      <button
                        className={`widget-secondary-btn ${emailAlertSaved ? 'enabled' : ''}`}
                        onClick={() => {
                          if (emailAlertSaved) {
                            setEmailAlertSaved(false);
                          } else {
                            setIsEmailInputOpen(true);
                          }
                        }}
                        type="button"
                      >
                        {emailAlertSaved 
                          ? <><Check size={16} /> {locale === 'ar' ? 'التنبيهات مفعلة' : 'Alerts Active'}</> 
                          : (locale === 'ar' ? 'تفعيل تنبيهات البريد' : 'Enable Email Alerts')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      {/* 3. Sleek Architectural Advisory Bar */}
      <section className="catalog-ender-section">
        <div className="container">
          <motion.div 
            className="catalog-ender-strip"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="catalog-ender-left">
              <div className="catalog-ender-eyebrow">
                <Sparkles size={13} className="ender-sparkle-icon" />
                <span>{isAr ? 'المكتب الخاص للاستشارات السيادية' : 'PRIVATE CLIENT ADVISORY'}</span>
              </div>
              <h3 className="catalog-ender-heading">
                {isAr ? 'هل تبحث عن صرح بمواصفات خاصة؟' : "Haven't found the right estate?"}
              </h3>
              <p className="catalog-ender-sub">
                {isAr 
                  ? 'تواصل مع فريقنا الخاص للاطلاع على العقارات غير المعلنة والتكليفات المعمارية الحصرية.' 
                  : 'Contact our private team for unlisted properties and bespoke custom commissions.'}
              </p>
            </div>

            <div className="catalog-ender-right">
              <button 
                type="button"
                className="btn-gold catalog-ender-btn"
                onClick={() => onOpenInquiry ? onOpenInquiry('Bespoke Architectural Property Inquiry') : null}
              >
                <span>{isAr ? 'طلب تكليف وبحث خاص' : 'Request Custom Search'}</span>
                <ArrowUpRight size={15} />
              </button>

              <a 
                href="https://wa.me/201000000000?text=Hello%2C%20I%20am%20looking%20for%20a%20luxury%20property." 
                target="_blank" 
                rel="noopener noreferrer" 
                className="catalog-ender-wa-pill"
              >
                <MessageSquare size={14} />
                <span>{isAr ? 'تواصل واتساب' : 'WhatsApp'}</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mobile Quick Filters Bottom Sheet (Portaled to document.body to prevent stacking context clipping) */}
      {mounted && createPortal(
        <AnimatePresence>
          {isMobileFiltersOpen && (
            <motion.div
              className="mobile-filters-portal-container"
              dir={isAr ? 'rtl' : 'ltr'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              data-lenis-prevent="true"
            >
              <div
                className="mobile-filters-backdrop"
                onClick={() => setIsMobileFiltersOpen(false)}
              />
              <motion.div
                className="omnibar-slots-group sheet-open"
                data-lenis-prevent="true"
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              >
                {renderOmnibarSlots(true)}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Advanced Architectural Filters Modal (Portaled to document.body) */}
      {mounted && createPortal(
        <AnimatePresence>
          {isAdvancedModalOpen && (
            <motion.div
              className="advanced-filter-backdrop"
              onClick={() => setIsAdvancedModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              data-lenis-prevent="true"
              dir={isAr ? 'rtl' : 'ltr'}
            >
              <motion.div
                className="advanced-filter-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                data-lenis-prevent="true"
              >
                {/* Modal Header */}
                <div className="adv-modal-header">
                  <div className="adv-header-left">
                    <div className="adv-icon-badge">
                      <SlidersHorizontal size={18} className="adv-gold-icon" />
                    </div>
                    <div>
                      <span className="adv-eyebrow">
                        {isAr ? 'خيارات التصفية المعمارية' : 'FILTER OPTIONS'}
                      </span>
                      <h3 className="adv-title">
                        {isAr ? 'الفلاتر المعمارية المتقدمة' : 'Advanced Architectural Filters'}
                      </h3>
                    </div>
                  </div>
                  <button
                    className="adv-close-btn"
                    onClick={() => setIsAdvancedModalOpen(false)}
                    title={isAr ? 'إغلاق' : 'Close Filters'}
                    type="button"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="adv-modal-body" data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()}>
                  {/* Section 1: Delivery Status & Handover */}
                  <div className="adv-filter-group">
                    <label className="adv-group-label">
                      {isAr ? 'موعد الاستلام وجاهزية الصرح' : 'HANDOVER & DELIVERY TIMELINE'}
                    </label>
                    <div className="adv-chips-row">
                      {[
                        { id: 'All', labelEn: 'All Timelines', labelAr: 'جميع المواعيد' },
                        { id: 'Immediate', labelEn: 'Immediate Handover (Ready)', labelAr: 'استلام فوري (جاهز للسكن)' },
                        { id: 'OffPlan', labelEn: 'Under Construction (Milestones)', labelAr: 'تحت الإنشاء (خطط سداد)' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`adv-chip-btn ${selectedDelivery === item.id ? 'active' : ''}`}
                          onClick={() => setSelectedDelivery(item.id)}
                        >
                          {isAr ? item.labelAr : item.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Finishing Level & Fitout */}
                  <div className="adv-filter-group">
                    <label className="adv-group-label">
                      {isAr ? 'درجة التشطيب والتدقيق الإنشائي' : 'FINISHING & STRUCTURAL FITOUT'}
                    </label>
                    <div className="adv-chips-row">
                      {[
                        { id: 'All', labelEn: 'All Finishing Tiers', labelAr: 'جميع درجات التشطيب', icon: null },
                        { id: 'fully', labelEn: 'Ultra-Luxury Fully Finished', labelAr: 'تشطيب ألترا لوكس فاخر', icon: Sparkles },
                        { id: 'semi', labelEn: 'Semi-Finished (Shell & Core)', labelAr: 'نصف تشطيب (محارة وحلوق)', icon: Layers },
                        { id: 'brick', labelEn: 'Core Frame (Red Brick)', labelAr: 'طوب أحمر / هيكل خرساني', icon: Building2 },
                      ].map((item) => {
                        const IconComp = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`adv-chip-btn ${selectedFinishing === item.id ? 'active' : ''}`}
                            onClick={() => setSelectedFinishing(item.id)}
                          >
                            {IconComp && <IconComp size={14} className="chip-gold-icon" />}
                            <span>{isAr ? item.labelAr : item.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: Signature Specs & Architectural Features */}
                  <div className="adv-filter-group">
                    <label className="adv-group-label">
                      {isAr ? 'المواصفات الهندسية والمزايا الحصرية' : 'ARCHITECTURAL SPECS & AMENITIES'}
                    </label>
                    <div className="adv-chips-row">
                      {[
                        { id: 'All', labelEn: 'All Specs & Features', labelAr: 'جميع المواصفات', icon: null },
                        { id: 'cad', labelEn: '1:1 CAD Blueprints Verified', labelAr: 'مخططات CAD مدققة', icon: Layers },
                        { id: 'pool', labelEn: 'Private Infinity Pool / Lagoon', labelAr: 'حمام سباحة أو لاجون خاص', icon: Waves },
                        { id: 'beach', labelEn: 'Direct Beachfront & Sea View', labelAr: 'واجهة شاطئية وبحرية مباشرة', icon: Compass },
                        { id: 'smart', labelEn: 'Smart Automation System', labelAr: 'نظام تحكم ذكي (Smart Home)', icon: Sparkles },
                        { id: 'garage', labelEn: 'Secured Underground Garage', labelAr: 'جراج سفلي مؤمن', icon: Car },
                        { id: 'garden', labelEn: 'Private Landscaped Garden', labelAr: 'حديقة خاصة وتراس واسع', icon: Palmtree },
                      ].map((item) => {
                        const IconComp = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`adv-chip-btn ${selectedAmenity === item.id ? 'active' : ''}`}
                            onClick={() => setSelectedAmenity(item.id)}
                          >
                            {IconComp && <IconComp size={14} className="chip-gold-icon" />}
                            <span>{isAr ? item.labelAr : item.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="adv-modal-footer">
                  <button
                    type="button"
                    className="adv-reset-btn"
                    onClick={resetAllFilters}
                  >
                    <RotateCcw size={14} />
                    <span>{isAr ? 'إعادة ضبط الكل' : 'Reset All'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-gold adv-apply-btn"
                    onClick={() => setIsAdvancedModalOpen(false)}
                  >
                    <span>{isAr ? `عرض ${filteredProperties.length} عقارات متطابقة` : `Show ${filteredProperties.length} Matches`}</span>
                    <Check size={16} />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Estate Comparison Drawer & Modal */}
      <CompareDrawer
        selectedProperties={selectedCompareProperties}
        onRemove={removeCompare}
        onClear={clearCompare}
        onSelectProperty={onSelectProperty}
        locale={locale}
        hidden={isMobileFiltersOpen || isAdvancedModalOpen}
      />

      <style>{`
        .catalog-view {
          padding-top: 0;
          padding-bottom: 6rem;
          background: var(--bg-primary);
          min-height: 100vh;
          transition: background var(--transition-smooth);
        }

        /* 1. Header Banner Container */
        .catalog-header-banner {
          position: relative;
          background: transparent;
          padding-top: 145px;
          padding-bottom: 0;
          margin-bottom: 0.75rem;
        }

        .catalog-header-glow {
          position: absolute;
          top: 60px;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 1100px;
          height: 380px;
          background: radial-gradient(
            ellipse at center,
            rgba(221, 167, 82, 0.08) 0%,
            rgba(221, 167, 82, 0.015) 45%,
            transparent 70%
          );
          pointer-events: none;
          filter: blur(55px);
          z-index: 1;
        }

        .relative-container {
          position: relative;
          z-index: 2;
        }

        .catalog-header {
          margin-bottom: 1.5rem;
        }

        .title-mask-container {
          overflow: hidden;
          padding-bottom: 6px;
          display: block;
        }

        .catalog-main-title {
          font-family: var(--font-heading);
          font-size: clamp(2.25rem, 4vw, 3.25rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.15;
          margin: 0.4rem 0 0;
          color: var(--text-primary);
        }

        /* Destination Jump Pills */
        .catalog-destination-pills {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }

        .dest-jump-pill {
          position: relative;
          border-radius: 9999px;
          padding: 0.5rem 1.25rem;
          font-family: var(--font-heading);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        [data-theme="dark"] .dest-jump-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #94A3B8;
        }

        [data-theme="dark"] .dest-jump-pill:hover {
          color: #ffffff;
          border-color: rgba(221, 167, 82, 0.45);
          background: rgba(255, 255, 255, 0.09);
        }

        [data-theme="dark"] .dest-jump-pill.active {
          color: #ffffff;
          font-weight: 700;
          border-color: rgba(221, 167, 82, 0.65);
        }

        [data-theme="dark"] .dest-jump-pill-active {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(221, 167, 82, 0.32) 0%,
            rgba(20, 24, 34, 0.85) 100%
          );
          border: 1px solid #DDA752;
          border-radius: 9999px;
          z-index: -1;
          box-shadow: 0 4px 14px rgba(221, 167, 82, 0.25);
        }

        [data-theme="light"] .dest-jump-pill {
          background: #FFFFFF;
          border: 1px solid rgba(184, 133, 48, 0.20);
          color: var(--text-secondary);
          box-shadow: 0 2px 8px rgba(30, 24, 16, 0.04);
        }

        [data-theme="light"] .dest-jump-pill:hover {
          background: #FFFFFF;
          color: var(--gold-dark);
          border-color: var(--gold-primary);
          box-shadow: 0 4px 14px rgba(184, 133, 48, 0.16);
        }

        [data-theme="light"] .dest-jump-pill.active {
          color: #0A0C10;
          font-weight: 700;
          border-color: transparent;
        }

        [data-theme="light"] .dest-jump-pill-active {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 50%, #C59A45 100%);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 9999px;
          z-index: -1;
          box-shadow: 0 4px 14px rgba(197, 154, 69, 0.25), inset 0 1px 1px #FFFFFF;
        }

        /* The Sovereign Architectural Omnibar (Unified Master Console) */
        .catalog-master-omnibar {
          display: flex;
          align-items: center;
          min-height: 68px;
          border-radius: 20px;
          padding: 0.6rem 1.1rem;
          gap: 0.85rem;
          margin-bottom: 1.75rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .catalog-master-omnibar {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.06) 25%,
            rgba(18, 24, 38, 0.42) 60%,
            rgba(10, 14, 24, 0.65) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.38),
            0 4px 14px rgba(0, 0, 0, 0.18),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .catalog-master-omnibar {
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

        .omnibar-search-slot {
          flex: 1.35;
          min-width: 210px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 0.35rem 0.75rem;
          border-radius: 14px;
          border: 1px solid transparent;
          transition: flex 480ms cubic-bezier(0.16, 1, 0.3, 1),
                      min-width 480ms cubic-bezier(0.16, 1, 0.3, 1),
                      background 320ms ease,
                      border-color 320ms ease,
                      box-shadow 480ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .catalog-master-omnibar.search-active .omnibar-search-slot {
          flex: 2.35;
          min-width: 320px;
        }

        [data-theme="dark"] .omnibar-search-slot:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        [data-theme="dark"] .catalog-master-omnibar.search-active .omnibar-search-slot {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(221, 167, 82, 0.45);
          box-shadow: 0 4px 22px rgba(0, 0, 0, 0.4), 0 0 16px rgba(221, 167, 82, 0.16);
        }

        [data-theme="light"] .omnibar-search-slot:hover {
          background: rgba(255, 255, 255, 0.35);
        }

        [data-theme="light"] .catalog-master-omnibar.search-active .omnibar-search-slot {
          background: rgba(255, 255, 255, 0.65);
          border-color: rgba(184, 134, 11, 0.38);
          box-shadow: 0 4px 20px rgba(184, 134, 11, 0.12), inset 0 1px 2px #FFFFFF;
        }

        .omnibar-search-inner {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .omnibar-search-slot .slot-icon {
          transition: transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1), color 300ms ease;
          flex-shrink: 0;
        }

        .catalog-master-omnibar.search-active .omnibar-search-slot .slot-icon {
          transform: scale(1.12) translateY(-0.5px);
          color: var(--gold-primary);
        }

        [data-theme="light"] .catalog-master-omnibar.search-active .omnibar-search-slot .slot-icon {
          color: #B8860B;
        }

        .omnibar-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 500;
          font-family: inherit;
          min-width: 0;
        }

        [data-theme="dark"] .omnibar-search-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.825rem;
        }

        [data-theme="light"] .omnibar-search-input::placeholder {
          color: #64748B;
          font-size: 0.825rem;
        }

        .omnibar-clear-btn {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        [data-theme="dark"] .omnibar-clear-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #C7D2DF;
        }

        [data-theme="light"] .omnibar-clear-btn {
          background: rgba(0, 0, 0, 0.06);
          color: #64748B;
        }

        .omnibar-clear-btn:hover {
          background: var(--gold-primary);
          color: #0A0C10;
        }

        .omnibar-divider {
          width: 1px;
          height: 34px;
          flex-shrink: 0;
          transition: opacity 400ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        [data-theme="dark"] .omnibar-divider {
          background: rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .omnibar-divider {
          background: rgba(0, 0, 0, 0.08);
        }

        .catalog-master-omnibar.search-active .omnibar-divider {
          opacity: 0.45;
        }

        .omnibar-filter-slot {
          flex: 1;
          min-width: 120px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 0.25rem 0.55rem;
          border-radius: 12px;
          transition: flex 480ms cubic-bezier(0.16, 1, 0.3, 1),
                      min-width 480ms cubic-bezier(0.16, 1, 0.3, 1),
                      padding 480ms cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 350ms ease;
        }

        .catalog-master-omnibar.search-active .omnibar-filter-slot {
          flex: 0.85;
          min-width: 100px;
          padding: 0.25rem 0.4rem;
        }

        .omnibar-slot-label {
          font-family: var(--font-heading);
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: font-size 0.35s ease, letter-spacing 0.35s ease;
        }

        [data-theme="dark"] .omnibar-slot-label {
          color: #E8C87A;
        }

        [data-theme="light"] .omnibar-slot-label {
          color: #B8860B;
        }

        .custom-filter-dropdown {
          position: relative;
        }

        .omnibar-trigger-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 0.2rem 0;
          color: var(--text-primary);
          font-family: inherit;
          cursor: pointer;
          border-radius: 8px;
          transition: all var(--transition-fast);
          text-align: left;
        }

        [dir="rtl"] .omnibar-trigger-btn {
          text-align: right;
        }

        .trigger-left {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          padding-bottom: 2px;
        }

        .slot-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        .trigger-value {
          font-size: 0.875rem;
          font-weight: 600;
          line-height: 1.5;
          color: var(--text-primary);
          transition: color var(--transition-fast);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-bottom: 2px;
        }

        [dir="rtl"] .trigger-value {
          line-height: 1.6;
          padding-bottom: 3px;
        }

        .omnibar-trigger-btn:hover .trigger-value,
        .omnibar-trigger-btn.open .trigger-value,
        .omnibar-trigger-btn.has-value .trigger-value {
          color: var(--gold-primary);
        }

        .slot-chevron {
          color: var(--text-muted);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), color var(--transition-fast);
          flex-shrink: 0;
        }

        .slot-chevron.rotate {
          transform: rotate(180deg);
          color: var(--gold-primary);
        }

        .omnibar-trigger-btn:hover .slot-chevron {
          color: var(--gold-primary);
        }

        .omnibar-actions-slot {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding-left: 0.35rem;
          flex-shrink: 0;
        }

        .omnibar-reset-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0.5rem 0.95rem;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .omnibar-reset-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #ffffff;
        }

        [data-theme="light"] .omnibar-reset-btn {
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.12);
          color: #0D1117;
        }

        .omnibar-reset-btn:hover {
          border-color: var(--gold-primary);
          color: var(--gold-primary);
        }

        .omnibar-filter-btn {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 45%, #C59A45 100%);
          color: #0A0C10;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 14px rgba(197, 154, 69, 0.28), inset 0 1px 1px #FFFFFF;
          transition: all var(--transition-smooth);
        }

        .omnibar-filter-btn:hover {
          background: linear-gradient(135deg, #FFF0C8 0%, #E5BE7A 45%, #D4AF37 100%);
          box-shadow: 0 6px 20px rgba(197, 154, 69, 0.42);
          transform: translateY(-2px);
        }

        .omnibar-filter-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0A0C10;
          border: 1.5px solid #FFFFFF;
        }

        /* Dropdown Menu */
        .filter-custom-menu {
          position: absolute;
          left: 0;
          min-width: 235px;
          max-height: 240px;
          overflow-y: auto;
          overscroll-behavior: contain;
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border-radius: 16px;
          padding: 6px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 3px;
          scrollbar-width: thin;
          scrollbar-color: rgba(221, 167, 82, 0.35) transparent;
        }

        .filter-custom-menu.placement-down {
          top: calc(100% + 10px);
          bottom: auto;
          transform-origin: top center;
        }

        .filter-custom-menu.placement-up {
          bottom: calc(100% + 10px);
          top: auto;
          transform-origin: bottom center;
        }

        .filter-custom-menu::-webkit-scrollbar {
          width: 5px;
        }

        .filter-custom-menu::-webkit-scrollbar-track {
          background: transparent;
          margin: 6px 0;
        }

        .filter-custom-menu::-webkit-scrollbar-thumb {
          background: rgba(221, 167, 82, 0.3);
          border-radius: 9999px;
        }

        .filter-custom-menu::-webkit-scrollbar-thumb:hover {
          background: var(--gold-primary);
        }

        [data-theme="dark"] .filter-custom-menu {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(20, 24, 34, 0.96) 40%,
            rgba(10, 14, 22, 0.98) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 
            0 16px 40px rgba(0, 0, 0, 0.7),
            0 0 20px rgba(221, 167, 82, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }

        [data-theme="light"] .filter-custom-menu {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12), inset 0 1px 1px #FFFFFF;
        }

        .filter-menu-option {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0.55rem 0.85rem;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .filter-menu-option:hover {
          background: rgba(221, 167, 82, 0.12);
          color: #ffffff;
        }

        [data-theme="dark"] .filter-menu-option.selected {
          background: rgba(221, 167, 82, 0.22);
          color: #E8C87A;
          font-weight: 700;
        }

        [data-theme="light"] .filter-menu-option:hover {
          background: rgba(0, 0, 0, 0.04);
          color: #0D1117;
        }

        [data-theme="light"] .filter-menu-option.selected {
          background: rgba(197, 154, 69, 0.12);
          color: #8A6114;
          font-weight: 700;
        }

        .option-label {
          white-space: nowrap;
        }

        .option-check {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        /* Active Filter Tags */
        .active-filter-tags-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.65rem;
          margin-top: 0.85rem;
          padding: 0.25rem 0.25rem;
        }

        .active-tags-heading {
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-right: 0.35rem;
        }

        .filter-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          backdrop-filter: blur(12px);
          border-radius: 9999px;
          padding: 0.35rem 0.75rem;
          font-size: 0.8125rem;
          font-weight: 600;
          animation: tagFadeIn 0.2s ease-out;
        }

        [data-theme="dark"] .filter-tag {
          background: linear-gradient(
            135deg,
            rgba(221, 167, 82, 0.15) 0%,
            rgba(20, 24, 34, 0.6) 100%
          );
          border: 1px solid rgba(221, 167, 82, 0.35);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }

        [data-theme="light"] .filter-tag {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid var(--gold-border);
          color: var(--text-primary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        @keyframes tagFadeIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }

        .tag-text {
          color: var(--text-primary);
        }

        .tag-remove-btn {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          color: var(--text-secondary);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          margin-left: 2px;
        }

        .tag-remove-btn:hover {
          background: var(--gold-primary);
          color: #0A0C10;
        }

        .clear-all-tags-btn {
          background: transparent;
          border: none;
          color: var(--gold-primary);
          font-size: 0.8125rem;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
          padding: 0.35rem 0.65rem;
          transition: opacity var(--transition-fast);
        }

        .clear-all-tags-btn:hover {
          opacity: 0.75;
        }

        /* Responsive Omnibar */
        @media (max-width: 1100px) {
          .catalog-master-omnibar {
            flex-wrap: wrap;
            padding: 0.85rem;
            gap: 0.75rem;
          }

          .omnibar-search-slot {
            flex: 1 1 65%;
          }

          .omnibar-actions-slot {
            flex: 0 0 auto;
            margin-left: auto;
          }

          .omnibar-divider {
            display: none;
          }

          .omnibar-filter-slot {
            flex: 1 1 calc(50% - 0.75rem);
            background: rgba(0, 0, 0, 0.03);
            padding: 0.5rem 0.75rem;
          }

          [data-theme="dark"] .omnibar-filter-slot {
            background: rgba(255, 255, 255, 0.04);
          }
        }

        /* Mobile filter bottom sheet: wrapper is transparent on desktop */
        .omnibar-slots-group {
          display: contents;
        }

        .sort-sheet-backdrop {
          display: none;
        }

        /* Radar: desktop renders the plain widget; mobile trigger/backdrop hidden */
        .radar-mobile-wrap,
        .radar-chart-holder {
          display: contents;
        }

        .radar-top-trigger,
        .radar-sheet-backdrop {
          display: none;
        }

        .mobile-filters-toggle,
        .mobile-filters-portal-container,
        .mobile-filters-backdrop,
        .mobile-sheet-head,
        .mobile-sheet-apply {
          display: none;
        }

        @media (max-width: 768px) {
          /* Flat layout: no container card — just the search pill + filter button on the page.
             (Also keeps the fixed bottom sheet working: no backdrop-filter ancestor.) */
          .catalog-master-omnibar,
          [data-theme="dark"] .catalog-master-omnibar,
          [data-theme="light"] .catalog-master-omnibar {
            flex-wrap: nowrap;
            align-items: center;
            gap: 0.5rem;
            padding: 0;
            background: transparent;
            border: none;
            box-shadow: none;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }

          /* Small glass search pill */
          .catalog-master-omnibar,
          [data-theme="dark"] .catalog-master-omnibar,
          [data-theme="light"] .catalog-master-omnibar {
            min-height: 0;
          }

          .omnibar-search-slot,
          .catalog-master-omnibar.search-active .omnibar-search-slot,
          [data-theme="dark"] .omnibar-search-slot,
          [data-theme="light"] .omnibar-search-slot,
          [data-theme="dark"] .catalog-master-omnibar.search-active .omnibar-search-slot,
          [data-theme="light"] .catalog-master-omnibar.search-active .omnibar-search-slot {
            flex: 1 1 auto;
            min-width: 0;
            flex-direction: row;
            align-items: center;
            gap: 0.35rem;
            padding: 0.3rem;
            border-radius: 9999px;
            backdrop-filter: blur(18px) saturate(190%);
            -webkit-backdrop-filter: blur(18px) saturate(190%);
          }

          [data-theme="dark"] .omnibar-search-slot,
          [data-theme="dark"] .catalog-master-omnibar.search-active .omnibar-search-slot {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          [data-theme="light"] .omnibar-search-slot,
          [data-theme="light"] .catalog-master-omnibar.search-active .omnibar-search-slot {
            background: rgba(255, 255, 255, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.85);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1.5px 1.5px #FFFFFF;
          }

          .omnibar-search-inner {
            flex: 1;
            min-width: 0;
            padding: 0.55rem 0.5rem 0.55rem 0.9rem;
          }

          [dir="rtl"] .omnibar-search-inner {
            padding: 0.55rem 0.9rem 0.55rem 0.5rem;
          }

          .omnibar-search-input {
            font-size: 0.9rem;
          }

          /* Icon-only search pill: no "SEARCH" label */
          .omnibar-search-slot .omnibar-slot-label {
            display: none;
          }

          /* Filters button: icon only */
          .mobile-filters-toggle span:not(.mobile-filters-count) {
            display: none;
          }
          .mobile-filters-toggle,
          [data-theme="light"] .mobile-filters-toggle {
            width: 38px;
            height: 38px;
            padding: 0;
            justify-content: center;
            flex-shrink: 0;
            background: transparent;
            border: none;
            color: var(--text-primary);
          }

          .mobile-filters-toggle svg {
            width: 15px;
            height: 15px;
            flex-shrink: 0;
          }
          .mobile-filters-count {
            position: absolute;
            top: -5px;
            inset-inline-end: -5px;
          }

          /* Layout density switcher: mobile always uses Spacious */
          .results-controls .view-mode-toggle {
            display: none;
          }

          /* Results row: inline count below the divider line, sort on the other side */
          .results-meta-bar {
            border-bottom: none;
            border-top: 1px solid var(--border-subtle);
            padding-top: 1rem;
            padding-bottom: 0;
            margin-bottom: 1.25rem;
            flex-wrap: nowrap;
            justify-content: space-between;
          }

          .results-meta-bar .results-count-badge,
          [data-theme="dark"] .results-meta-bar .results-count-badge,
          [data-theme="light"] .results-meta-bar .results-count-badge {
            background: transparent;
            border: none;
            box-shadow: none;
            padding: 0;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }

          .results-count-text {
            font-size: 0.78rem;
          }

          .sort-label {
            display: none;
          }

          /* Sort menu opens as a bottom sheet */
          .sort-sheet-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            z-index: 1290;
          }

          .custom-sort-menu,
          [data-theme="dark"] .custom-sort-menu,
          [data-theme="light"] .custom-sort-menu {
            position: fixed;
            left: 0.5rem;
            right: 0.5rem;
            bottom: 0;
            top: auto;
            min-width: 0;
            max-height: 70dvh;
            overflow-y: auto;
            border-radius: 22px 22px 0 0;
            border-bottom: none;
            padding: 0.9rem 0.9rem 1.2rem;
            z-index: 1300;
          }

          .sort-menu-item {
            padding: 0.85rem 0.9rem;
            font-size: 0.9rem;
          }

          .mobile-filters-toggle {
            display: inline-flex;
            position: relative;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
            padding: 0.55rem 0.9rem;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
            color: var(--text-primary);
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.18);
          }

          [data-theme="light"] .mobile-filters-toggle {
            background: rgba(255, 255, 255, 0.75);
            border-color: rgba(0, 0, 0, 0.1);
          }

          .mobile-filters-count {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 18px;
            padding: 0 4px;
            border-radius: 9999px;
            font-size: 0.65rem;
            font-weight: 900;
            background: var(--gold-primary, #DDA752);
            color: #0A0C10;
          }

          .mobile-filters-portal-container {
            display: flex !important;
            position: fixed;
            inset: 0;
            z-index: 99998;
            align-items: flex-end;
            justify-content: center;
            pointer-events: auto;
          }

          .mobile-filters-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 99999;
          }

          .omnibar-slots-group.desktop-omnibar-slots {
            display: none !important;
          }

          .omnibar-slots-group.sheet-open {
            display: flex !important;
            flex-direction: column;
            gap: 0.75rem;
            position: fixed;
            left: 0.5rem;
            right: 0.5rem;
            bottom: 0;
            z-index: 100000;
            max-height: 84dvh;
            overflow-y: auto;
            border-radius: 24px 24px 0 0;
            padding: 1.15rem 1.15rem 1.4rem;
            backdrop-filter: blur(28px) saturate(210%);
            -webkit-backdrop-filter: blur(28px) saturate(210%);
          }

          [data-theme="dark"] .omnibar-slots-group.sheet-open {
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.18) 0%,
              rgba(255, 255, 255, 0.06) 30%,
              rgba(18, 24, 38, 0.92) 65%,
              rgba(10, 14, 24, 0.98) 100%
            );
            border: 1px solid rgba(255, 255, 255, 0.28);
            border-bottom: none;
            box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.75);
          }

          [data-theme="light"] .omnibar-slots-group.sheet-open {
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.96) 0%,
              rgba(255, 255, 255, 0.92) 100%
            );
            border: 1.5px solid rgba(255, 255, 255, 0.95);
            border-bottom: none;
            box-shadow: 0 -20px 60px rgba(15, 23, 42, 0.25);
          }

          .omnibar-slots-group.sheet-open .mobile-sheet-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            margin-bottom: 0.25rem;
          }

          .mobile-sheet-head-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .mobile-head-filter-btn {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            background: rgba(229, 184, 105, 0.14) !important;
            border: 1px solid rgba(229, 184, 105, 0.35) !important;
            color: #E5B869 !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            position: relative !important;
          }

          .mobile-head-filter-btn.active {
            background: #E5B869 !important;
            color: #0A0C10 !important;
          }

          [data-theme="light"] .mobile-head-filter-btn {
            background: rgba(184, 147, 74, 0.12) !important;
            border-color: rgba(140, 104, 38, 0.3) !important;
            color: #8C6826 !important;
          }

          [data-theme="light"] .mobile-head-filter-btn.active {
            background: #B8860B !important;
            color: #FFFFFF !important;
          }

          .omnibar-slots-group.sheet-open .omnibar-actions-slot {
            display: none !important;
          }

          .mobile-sheet-title {
            font-family: var(--font-heading);
            font-size: 1rem;
            font-weight: 800;
            color: var(--text-primary);
          }

          .mobile-sheet-close {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: var(--text-primary);
            cursor: pointer;
          }

          [data-theme="light"] .mobile-sheet-close {
            background: rgba(0, 0, 0, 0.04);
            border-color: rgba(0, 0, 0, 0.1);
          }

          .omnibar-slots-group.sheet-open .mobile-sheet-apply {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 48px;
            border-radius: 9999px;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            flex-shrink: 0;
          }

          .omnibar-slots-group.sheet-open .omnibar-divider {
            display: none;
          }

          .omnibar-slots-group.sheet-open .omnibar-filter-slot {
            width: 100%;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            padding: 0.6rem 0.8rem;
          }

          [data-theme="light"] .omnibar-slots-group.sheet-open .omnibar-filter-slot {
            background: rgba(0, 0, 0, 0.03);
            border-color: rgba(0, 0, 0, 0.08);
          }

          .omnibar-slots-group.sheet-open .omnibar-actions-slot {
            width: 100%;
            justify-content: space-between;
          }
        }

        /* Advanced Filters Modal Backdrop */
        .advanced-filter-backdrop {
          position: fixed !important;
          inset: 0 !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: rgba(4, 6, 12, 0.82) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          z-index: 99999999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 1.5rem !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }

        .advanced-filter-modal {
          position: relative !important;
          z-index: 10 !important;
          border-radius: 28px !important;
          width: 100% !important;
          max-width: 600px !important;
          max-height: 88vh !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
          background: rgba(10, 14, 24, 0.98) !important;
          border: 1px solid rgba(221, 167, 82, 0.45) !important;
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.8), 0 0 30px rgba(221, 167, 82, 0.18) !important;
        }

        [data-theme="light"] .advanced-filter-modal {
          background: #FAF8F5 !important;
          border: 1px solid rgba(184, 133, 48, 0.35) !important;
          box-shadow: 0 32px 80px rgba(15, 23, 42, 0.18), 0 0 30px rgba(184, 133, 48, 0.12) !important;
        }

        .adv-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .adv-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .adv-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(197, 142, 54, 0.15);
          border: 1px solid var(--gold-border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .adv-gold-icon, .badge-gold-icon {
          color: var(--gold-primary);
        }

        [data-theme="light"] .adv-gold-icon,
        [data-theme="light"] .badge-gold-icon {
          color: #B8860B;
        }

        .adv-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--gold-primary);
          text-transform: uppercase;
          display: block;
          margin-bottom: 2px;
        }

        [data-theme="light"] .adv-eyebrow {
          color: #B8860B;
        }

        .adv-title, .adv-modal-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.2;
        }

        .adv-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .adv-close-btn:hover {
          background: var(--gold-primary);
          color: #0A0C10;
        }

        .adv-modal-body {
          padding: 1.75rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          overflow-y: auto;
          flex: 1 1 auto;
          min-height: 0;
          overscroll-behavior: contain;
        }

        .adv-filter-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .adv-group-label {
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--gold-primary);
          text-transform: uppercase;
        }

        .adv-chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .adv-chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0.55rem 1.15rem;
          border-radius: 9999px;
          font-family: inherit;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .adv-chip-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #94A3B8;
        }

        [data-theme="light"] .adv-chip-btn {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: var(--text-secondary);
        }

        .chip-gold-icon, .tag-gold-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        .adv-chip-btn:hover {
          border-color: var(--gold-primary);
          color: var(--text-primary);
        }

        .adv-chip-btn.active {
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 50%, #C59A45 100%);
          color: #0A0C10;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 14px rgba(197, 154, 69, 0.25), inset 0 1px 1px #FFFFFF;
        }

        .adv-chip-btn.active .chip-gold-icon {
          color: #0A0C10;
        }

        .adv-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2rem;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-surface);
        }

        .adv-reset-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .adv-reset-btn:hover {
          color: var(--text-primary);
        }

        .adv-apply-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.65rem 1.4rem;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 12px;
        }

        /* Results Bar */
        .results-meta-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-subtle);
          gap: 1rem;
          flex-wrap: wrap;
        }

        .results-count-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 0.45rem 1.15rem;
          border-radius: 9999px;
        }

        [data-theme="dark"] .results-count-badge {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        }

        [data-theme="light"] .results-count-badge {
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        }

        .results-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--gold-primary);
          box-shadow: 0 0 10px var(--gold-primary);
          animation: livePulse 2s infinite ease-in-out;
          flex-shrink: 0;
        }

        .results-count-text {
          display: inline-flex;
          align-items: baseline;
          gap: 0.35rem;
          font-family: var(--font-heading);
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1;
        }

        .results-count-text span {
          color: var(--text-secondary);
        }

        .results-count-text .gold-count {
          color: var(--gold-primary);
          font-weight: 700;
        }

        .results-count-text .total-count {
          color: var(--text-primary);
          font-weight: 700;
        }

        .results-controls {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .view-mode-toggle {
          display: flex;
          align-items: center;
          border-radius: 12px;
          padding: 3px;
          gap: 2px;
        }

        [data-theme="dark"] .view-mode-toggle {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .view-mode-toggle {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }

        .view-mode-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.35rem 0.75rem;
          border-radius: 9px;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
          z-index: 1;
        }

        [data-theme="dark"] .view-mode-btn.active {
          color: #ffffff;
        }

        [data-theme="light"] .view-mode-btn.active {
          color: #0A0C10;
        }

        .view-mode-indicator {
          position: absolute;
          inset: 0;
          border-radius: 9px;
          z-index: -1;
        }

        [data-theme="dark"] .view-mode-indicator {
          background: linear-gradient(
            135deg,
            rgba(221, 167, 82, 0.3) 0%,
            rgba(20, 24, 34, 0.85) 100%
          );
          border: 1px solid rgba(221, 167, 82, 0.55);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        [data-theme="light"] .view-mode-indicator {
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 50%, #C59A45 100%);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 2px 8px rgba(197, 154, 69, 0.25);
        }

        /* Custom Gold Sort Dropdown */
        .custom-sort-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sort-label {
          font-size: 0.84375rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .custom-sort-trigger {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 12px;
          padding: 0.45rem 1rem;
          font-size: 0.84375rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .custom-sort-trigger {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        [data-theme="light"] .custom-sort-trigger {
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: var(--text-primary);
        }

        .custom-sort-trigger:hover,
        .custom-sort-trigger.open {
          border-color: var(--gold-primary);
        }

        .sort-chevron {
          color: var(--text-muted);
          transition: transform 0.25s ease, color 0.2s ease;
        }

        .sort-chevron.rotate {
          transform: rotate(180deg);
          color: var(--gold-primary);
        }

        .custom-sort-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 230px;
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border-radius: 16px;
          padding: 6px;
          z-index: 1000;
        }

        [data-theme="dark"] .custom-sort-menu {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(20, 24, 34, 0.92) 50%,
            rgba(10, 14, 22, 0.98) 100%
          );
          border: 1px solid rgba(221, 167, 82, 0.4);
          box-shadow: 
            0 16px 36px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(221, 167, 82, 0.35);
        }

        [data-theme="light"] .custom-sort-menu {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
        }

        .sort-menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.85rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .sort-menu-item:hover {
          background: rgba(197, 142, 54, 0.08);
          color: var(--text-primary);
        }

        .sort-menu-item.selected {
          background: rgba(197, 142, 54, 0.18);
          color: var(--gold-primary);
          font-weight: 700;
        }

        .sort-item-check {
          color: var(--gold-primary);
        }

        .custom-sort-trigger:focus-visible,
        .sort-menu-item:focus-visible,
        .view-mode-btn:focus-visible,
        .omnibar-search-input:focus-visible,
        .omnibar-filter-btn:focus-visible,
        .adv-filter-btn:focus-visible,
        .adv-modal-close:focus-visible,
        .active-tag-chip:focus-visible,
        .clear-all-tags-btn:focus-visible,
        .page-btn:focus-visible,
        .reset-filters-btn:focus-visible {
          outline: 2px solid var(--gold-primary) !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 16px var(--gold-glow) !important;
        }

        /* Body Layout */
        .catalog-body-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 350px;
          gap: 2.25rem;
          align-items: start;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .catalog-body-layout.no-sidebar {
          grid-template-columns: 1fr;
        }

        .catalog-grid-col {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }

        .catalog-body-layout.no-sidebar .catalog-cards-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        @media (max-width: 1200px) {
          .catalog-body-layout.no-sidebar .catalog-cards-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .catalog-body-layout.no-sidebar .catalog-cards-grid {
            grid-template-columns: 1fr;
          }
        }

        .catalog-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 2rem;
          width: 100%;
          min-width: 0;
        }

        .catalog-cards-compact {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.15rem;
          width: 100%;
          min-width: 0;
        }

        @media (max-width: 1200px) {
          .catalog-cards-compact {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .catalog-cards-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          min-width: 0;
          max-width: 100%;
        }

        .no-results-box {
          backdrop-filter: blur(24px) saturate(190%);
          -webkit-backdrop-filter: blur(24px) saturate(190%);
          border-radius: 20px;
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        [data-theme="dark"] .no-results-box {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.08) 0%,
            rgba(20, 24, 34, 0.45) 50%,
            rgba(10, 14, 22, 0.65) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 
            0 16px 36px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(221, 167, 82, 0.35);
        }

        [data-theme="light"] .no-results-box {
          background: rgba(255, 255, 255, 0.90);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.05);
        }

        .no-results-icon {
          color: var(--gold-primary);
          opacity: 0.9;
        }

        .reset-filters-btn {
          margin-top: 1rem;
        }

        /* Sidebar */
        .catalog-sidebar {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          position: sticky;
          top: 100px;
          width: 350px;
          min-width: 350px;
          max-width: 100%;
          box-sizing: border-box;
          flex-shrink: 0;
        }

        .sidebar-widget {
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          border-radius: 22px;
          padding: 1.6rem 1.45rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .sidebar-widget {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.18) 0%,
            rgba(255, 255, 255, 0.04) 20%,
            rgba(18, 24, 38, 0.60) 50%,
            rgba(10, 14, 24, 0.88) 100%
          );
          border: 1px solid rgba(229, 184, 105, 0.25);
          box-shadow: 
            0 24px 54px rgba(0, 0, 0, 0.55),
            0 4px 18px rgba(0, 0, 0, 0.28),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.10),
            inset 0 0 24px rgba(229, 184, 105, 0.04);
        }

        [data-theme="light"] .sidebar-widget {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.92) 0%,
            rgba(250, 248, 243, 0.82) 100%
          );
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(184, 147, 74, 0.32);
          box-shadow: 
            0 18px 44px rgba(30, 24, 16, 0.08), 
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(184, 147, 74, 0.15);
        }

        .alert-widget {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .widget-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .widget-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(229, 184, 105, 0.15);
          border: 1px solid rgba(229, 184, 105, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3);
        }

        [data-theme="light"] .widget-icon-wrap {
          background: rgba(184, 147, 74, 0.12);
          border-color: rgba(184, 147, 74, 0.3);
        }

        .alert-bell-icon {
          color: #E5B869;
        }

        [data-theme="light"] .alert-bell-icon {
          color: #8C6826;
        }

        .vip-concierge-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-heading);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #E5B869;
          background: rgba(229, 184, 105, 0.12);
          border: 1px solid rgba(229, 184, 105, 0.35);
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2);
        }

        [data-theme="light"] .vip-concierge-badge {
          color: #8C6826;
          background: rgba(184, 147, 74, 0.10);
          border-color: rgba(184, 147, 74, 0.25);
        }

        .vip-sparkle {
          color: #E5B869;
        }

        [data-theme="light"] .vip-sparkle {
          color: #8C6826;
        }

        .widget-title {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .widget-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.55;
        }

        .widget-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .widget-cta {
          width: 100%;
          padding: 0.8125rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 12px;
        }

        .widget-secondary-btn {
          width: 100%;
          padding: 0.8125rem 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .widget-secondary-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        [data-theme="light"] .widget-secondary-btn {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: var(--text-primary);
        }

        .widget-secondary-btn:hover {
          border-color: var(--gold-primary);
          color: var(--gold-primary);
        }

        .alert-email-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .alert-email-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          font-size: 0.875rem;
          font-family: inherit;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        [data-theme="light"] .alert-email-input {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.12);
        }

        .alert-email-input:focus {
          border-color: var(--gold-primary);
          box-shadow: 0 0 12px rgba(221, 167, 82, 0.25);
        }

        .alert-form-actions {
          display: flex;
          gap: 0.5rem;
        }

        .alert-submit-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          font-size: 0.8125rem;
          font-weight: 700;
          border-radius: 10px;
          border: none;
          cursor: pointer;
        }

        .alert-cancel-btn {
          padding: 0.75rem 1rem;
          font-size: 0.8125rem;
          font-weight: 600;
          border-radius: 10px;
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .alert-cancel-btn:hover {
          color: var(--text-primary);
          border-color: var(--gold-primary);
        }

        .widget-secondary-btn.enabled {
          background: rgba(197, 142, 54, 0.2);
          border-color: var(--gold-primary);
          color: var(--gold-primary);
        }

        /* Luxury Dynamic Liquid Glass Pagination Suite */
        .catalog-pagination-wrap {
          margin-top: 3.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .catalog-pagination {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          padding: 6px 8px;
          border-radius: 9999px;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .catalog-pagination {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.18) 0%,
            rgba(255, 255, 255, 0.04) 20%,
            rgba(18, 24, 38, 0.60) 50%,
            rgba(10, 14, 24, 0.88) 100%
          );
          border: 1px solid rgba(229, 184, 105, 0.25);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.5),
            0 4px 14px rgba(0, 0, 0, 0.25),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.10),
            inset 0 0 20px rgba(229, 184, 105, 0.04);
        }

        [data-theme="light"] .catalog-pagination {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.92) 0%,
            rgba(250, 248, 243, 0.82) 100%
          );
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(184, 147, 74, 0.32);
          box-shadow: 
            0 16px 40px rgba(30, 24, 16, 0.08), 
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(184, 147, 74, 0.15);
        }

        .page-btn {
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(255, 255, 255, 0.7);
          font-family: Georgia, var(--font-heading), serif;
          font-weight: 700;
          font-size: 0.9375rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
        }

        [data-theme="light"] .page-btn {
          color: #475569;
        }

        .page-btn:hover:not(:disabled):not(.active) {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(229, 184, 105, 0.35);
          color: #E5B869;
          transform: translateY(-1px);
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.2);
        }

        [data-theme="light"] .page-btn:hover:not(:disabled):not(.active) {
          background: rgba(184, 147, 74, 0.10);
          border-color: rgba(184, 147, 74, 0.35);
          color: #8C6826;
        }

        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .page-btn.active {
          background: linear-gradient(
            135deg, 
            rgba(255, 253, 245, 0.35) 0%, 
            rgba(229, 184, 105, 0.38) 35%, 
            rgba(184, 147, 74, 0.25) 100%
          );
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(229, 184, 105, 0.65);
          color: #FFFDF5;
          font-weight: 800;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
          box-shadow: 
            0 4px 18px rgba(229, 184, 105, 0.35), 
            inset 0 1.5px 2px rgba(255, 255, 255, 0.7), 
            inset 0 -1px 1px rgba(229, 184, 105, 0.3);
          transform: scale(1.05);
        }

        [data-theme="light"] .page-btn.active {
          background: linear-gradient(
            135deg, 
            rgba(229, 184, 105, 0.22) 0%, 
            rgba(184, 147, 74, 0.15) 100%
          );
          border: 1px solid rgba(140, 104, 38, 0.45);
          color: #8C6826;
          text-shadow: none;
          box-shadow: 
            0 4px 14px rgba(140, 104, 38, 0.18), 
            inset 0 1.5px 2px #FFFFFF;
        }

        /* 3. Sleek Architectural Advisory Bar */
        .catalog-ender-section {
          padding-top: 2.5rem;
          padding-bottom: 1.5rem;
        }

        .catalog-ender-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          border-radius: 20px;
          padding: 1.6rem 2.25rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .catalog-ender-strip {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.06) 0%,
            rgba(20, 24, 34, 0.6) 50%,
            rgba(10, 14, 22, 0.75) 100%
          );
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
        }

        [data-theme="light"] .catalog-ender-strip {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(24px) saturate(190%);
          -webkit-backdrop-filter: blur(24px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.90);
          box-shadow: 0 12px 35px rgba(30, 24, 16, 0.06), inset 0 1.5px 2px #FFFFFF;
        }

        .catalog-ender-left {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .catalog-ender-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        [data-theme="dark"] .catalog-ender-eyebrow {
          color: #F5D382;
        }

        [data-theme="light"] .catalog-ender-eyebrow {
          color: #B8860B;
        }

        .ender-sparkle-icon {
          color: var(--gold-primary);
        }

        .catalog-ender-heading {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.015em;
          margin: 0;
          color: var(--text-primary);
        }

        .catalog-ender-sub {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0;
          font-weight: 500;
        }

        .catalog-ender-right {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-shrink: 0;
        }

        .catalog-ender-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.75rem 1.4rem;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 12px;
          cursor: pointer;
        }

        .catalog-ender-wa-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          font-family: var(--font-heading);
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .catalog-ender-wa-pill {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #FFFFFF;
        }

        [data-theme="light"] .catalog-ender-wa-pill {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.12);
          color: #0D1117;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .catalog-ender-wa-pill:hover {
          transform: translateY(-2px);
          border-color: var(--gold-primary);
          color: var(--gold-primary);
        }

        @media (max-width: 860px) {
          .catalog-ender-strip {
            flex-direction: column;
            align-items: flex-start;
            padding: 1.5rem;
            gap: 1.25rem;
          }
          .catalog-ender-right {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }
        }

        @media (max-width: 1140px) {
          .catalog-body-layout {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .catalog-sidebar {
            position: static;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            width: 100%;
            min-width: 0;
            gap: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .catalog-header-banner {
            padding-top: 96px;
          }
          .catalog-header-area {
            padding-top: 1.5rem;
          }
          .catalog-main-title {
            font-size: 1.65rem;
            line-height: 1.25;
            margin-bottom: 1rem;
          }
          .catalog-destination-pills {
            flex-wrap: nowrap;
            overflow-x: auto;
            padding: 4px 1rem 12px 1rem;
            margin: 0 -1rem 1.25rem -1rem;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .catalog-destination-pills::-webkit-scrollbar {
            display: none;
          }
          .dest-jump-pill {
            flex-shrink: 0;
            white-space: nowrap;
            padding: 0.45rem 1rem;
            font-size: 0.78rem;
          }
          .filter-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
            padding: 1.25rem;
          }
          .toolbar-divider {
            width: 100%;
            height: 1px;
          }
          .catalog-cards-grid {
            grid-template-columns: 1fr;
          }
          .catalog-sidebar {
            grid-template-columns: 1fr;
          }

          /* Mobile Valuation Radar: bottom sheet opened from the search row */
          .radar-chart-holder {
            display: none;
          }

          .radar-top-trigger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            flex-shrink: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: var(--text-primary);
            backdrop-filter: blur(18px) saturate(190%);
            -webkit-backdrop-filter: blur(18px) saturate(190%);
            cursor: pointer;
          }

          [data-theme="light"] .radar-top-trigger {
            background: rgba(255, 255, 255, 0.65);
            border-color: rgba(255, 255, 255, 0.85);
          }

          .radar-sheet-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            z-index: 1290;
          }

          .radar-chart-holder.open {
            display: block;
            position: fixed;
            left: 0.5rem;
            right: 0.5rem;
            bottom: 0;
            z-index: 1300;
            max-height: 84dvh;
            overflow-y: auto;
            border-radius: 22px 22px 0 0;
          }

          .radar-chart-holder.open .market-chart-widget {
            border-radius: 22px 22px 0 0;
          }
          .sidebar-widget.alert-widget {
            padding: 1.1rem 1.1rem 1.2rem;
          }
          .alert-widget .widget-desc {
            font-size: 0.8rem;
            margin-bottom: 0.85rem;
          }
          .alert-widget .widget-actions {
            flex-direction: row;
            gap: 0.6rem;
          }
          .alert-widget .widget-cta,
          .alert-widget .widget-secondary-btn {
            flex: 1;
            min-height: 44px;
            white-space: nowrap;
            font-size: 0.82rem;
            padding: 0.6rem 0.75rem;
          }

          /* Advisory ender: buttons in one row, tighter padding */
          .catalog-ender-strip {
            padding: 1.25rem 1.15rem;
          }
        }
      `}</style>
    </div>
  );
};
