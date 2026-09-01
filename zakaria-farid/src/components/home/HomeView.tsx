'use client';

import React, { useState } from 'react';
import { QuickSearchBar } from '@/components/QuickSearchBar';
import { StatsSection } from '@/components/home/StatsSection';
import { PropertyCard } from '@/components/property/PropertyCard';
import { MapSection } from '@/components/map/MapSection';
import { SovereignAdvisorySection } from '@/components/home/SovereignAdvisorySection';
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { Property } from '@/types';
import { useFavorites } from '@/lib/context/FavoritesContext';
import { usePlatformSettings } from '@/lib/hooks/usePlatformSettings';
import { DEFAULT_HOME_SETTINGS } from '@/lib/services/marketIntelligence';
import { getDynamicDestinationPills, identifyPropertyDestinationKey } from '@/lib/utils/dynamicLocations';
import { ArrowRight, ArrowUpRight, ShieldCheck, Building2, Scale, Compass, Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { triggerNavigationStart } from '@/components/NavigationProgress';

interface HomeViewProps {
  properties?: Property[];
  locale?: string;
  onSelectProperty?: (id: string) => void;
  onNavigateToCatalog?: (filters?: { location?: string; propertyType?: string; priceTier?: string }) => void;
  onOpenMapModal?: () => void;
  onOpenListEstate?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  properties: propProperties,
  locale = 'en',
  onSelectProperty: propOnSelectProperty,
  onNavigateToCatalog: propOnNavigateToCatalog,
  onOpenMapModal: propOnOpenMapModal,
  onOpenListEstate: propOnOpenListEstate
}) => {
  const isAr = locale === 'ar';
  const router = useRouter();
  const platformSettings = usePlatformSettings();
  const homeSettings = platformSettings.home || DEFAULT_HOME_SETTINGS;

  const onSelectProperty = propOnSelectProperty || ((id: string) => {
    triggerNavigationStart();
    router.push('/' + locale + '/properties/' + id);
  });

  const onNavigateToCatalog = propOnNavigateToCatalog || ((filters?: { location?: string; propertyType?: string; priceTier?: string }) => {
    triggerNavigationStart();
    let url = '/' + locale + '/properties';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.location) params.set('location', filters.location);
      if (filters.propertyType) params.set('type', filters.propertyType);
      if (filters.priceTier) params.set('price', filters.priceTier);
      const qs = params.toString();
      if (qs) url += '?' + qs;
    }
    router.push(url);
  });

  const onOpenMapModal = propOnOpenMapModal || (() => {
    triggerNavigationStart();
    router.push('/' + locale + '/map');
  });

  const onOpenListEstate = propOnOpenListEstate || (() => {
    triggerNavigationStart();
    router.push('/' + locale + '/contact');
  });

  // Use server-fetched real DB properties, fall back to adapted FALLBACK_PROPERTIES
  const fallbackAdapted = React.useMemo(() => adaptProperties(FALLBACK_PROPERTIES, locale as 'en' | 'ar'), [locale]);
  const allProps = (propProperties && propProperties.length > 0) ? propProperties : fallbackAdapted;

  // Guarantee balanced 6-card collection for the showcase grid
  const featuredProperties = React.useMemo(() => {
    const featured = allProps.filter((p) => p.featured || p.is_featured);
    if (featured.length >= 6) return featured.slice(0, 6);
    const nonFeatured = allProps.filter((p) => !p.featured && !p.is_featured);
    const combined = [...featured, ...nonFeatured];
    if (combined.length >= 6) return combined.slice(0, 6);
    const extraFallback = fallbackAdapted.filter(fb => !combined.some(c => c.id === fb.id));
    return [...combined, ...extraFallback].slice(0, 6);
  }, [allProps, fallbackAdapted]);

  const { registerProperties } = useFavorites();

  React.useEffect(() => {
    if (allProps && allProps.length > 0) {
      registerProperties(allProps);
    }
  }, [allProps, registerProperties]);

  // Destination filter state for Featured Masterpieces (derived dynamically from database properties)
  const [activeDestination, setActiveDestination] = React.useState<string>('All');

  const dynamicDestinationPills = React.useMemo(() => {
    return getDynamicDestinationPills(allProps);
  }, [allProps]);

  const destinationFilters = React.useMemo(() => {
    return dynamicDestinationPills.map((d) => ({
      id: d.id,
      label: isAr ? (d.id === 'All' ? 'جميع العقارات' : d.labelAr) : (d.id === 'All' ? 'All Masterpieces' : d.label)
    }));
  }, [dynamicDestinationPills, isAr]);

  const filteredFeaturedProperties = featuredProperties.filter((property) => {
    if (activeDestination === 'All' || activeDestination === 'all') return true;
    const destKey = identifyPropertyDestinationKey(property);
    const filterLower = activeDestination.toLowerCase();
    const loc = (property.location || '').toLowerCase();
    const dist = (property.district || '').toLowerCase();
    return (
      destKey.includes(filterLower) ||
      filterLower.includes(destKey) ||
      dist.includes(filterLower) ||
      loc.includes(filterLower)
    );
  });

  // Compact hero copy on mobile
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobileViewport(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Typewriter animation state for Hero Title
  const line1Text = isMobileViewport
    ? (isAr ? (homeSettings.heroTitle1Ar?.includes('استكشف') ? 'أندر الصروح المعمارية' : homeSettings.heroTitle1Ar || 'أندر الصروح المعمارية')
            : (homeSettings.heroTitle1En?.includes('Discover') ? "Egypt's Premier Residences" : homeSettings.heroTitle1En || "Egypt's Premier Residences"))
    : (isAr ? (homeSettings.heroTitle1Ar || 'استكشف أندر الصروح المعمارية و')
            : (homeSettings.heroTitle1En || "Discover Egypt's Premier Residences &"));

  const line2Text = isMobileViewport
    ? (isAr ? (homeSettings.heroTitle2Ar || 'القصور الفاخرة في مصر')
            : (homeSettings.heroTitle2En?.includes('Living') ? 'Sovereign Luxury Estates' : homeSettings.heroTitle2En || 'Sovereign Luxury Estates'))
    : (isAr ? (homeSettings.heroTitle2Ar || 'القصور الفاخرة في مصر')
            : (homeSettings.heroTitle2En || 'Luxury Living & Sovereign Estates'));

  const heroSubtitle = isMobileViewport
    ? (isAr
        ? (
            <>
              ننتقي ونمثل أندر القصور والعقارات الفاخرة
              <br />
              بتدقيق إنشائي وقانوني موثق في مصر.
            </>
          )
        : (
            <>
              Curating Egypt’s premier luxury estates
              <br />
              and architectural sanctuaries.
            </>
          ))
    : (isAr
        ? (homeSettings.heroSubtitleAr || DEFAULT_HOME_SETTINGS.heroSubtitleAr)
        : (homeSettings.heroSubtitleEn || DEFAULT_HOME_SETTINGS.heroSubtitleEn));

  const line1Len = line1Text.length;
  const totalChars = line1Len + line2Text.length;

  const [charCount, setCharCount] = React.useState(0);
  const [isDoneTyping, setIsDoneTyping] = React.useState(false);

  React.useEffect(() => {
    setCharCount(0);
    setIsDoneTyping(false);
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setCharCount(current);
      if (current >= totalChars) {
        clearInterval(interval);
        setTimeout(() => setIsDoneTyping(true), 2200);
      }
    }, 22);

    return () => clearInterval(interval);
  }, [totalChars, locale, line1Text, line2Text]);

  const display1 = line1Text.slice(0, Math.min(charCount, line1Len));
  const display2 = charCount > line1Len
    ? line2Text.slice(0, charCount - line1Len)
    : '';

  const showCursorOnLine1 = charCount <= line1Len && !isDoneTyping;
  const showCursorOnLine2 = charCount > line1Len && !isDoneTyping;

  // Quick destination shortcuts for mobile hero
  const quickHeroDestinations = [
    { label: isAr ? 'القاهرة الجديدة' : 'New Cairo', value: 'New Cairo, Fifth Settlement' },
    { label: isAr ? 'الساحل الشمالي' : 'North Coast', value: 'North Coast' },
    { label: isAr ? 'الجونة' : 'El Gouna', value: 'El Gouna' },
    { label: isAr ? 'الشيخ زايد' : 'Sheikh Zayed', value: 'Sheikh Zayed' },
  ];

  return (
    <div className="home-view" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── 1. Full-Bleed Viewport Cinematic Hero ─── */}
      {homeSettings.showHero !== false && (
        <section className="hero-section">
          <div className="hero-bg-media">
            <div className="hero-bg-cinematic-stage">
              <img 
                src="/images/hero-dark.jpg" 
                alt="Al Zakaria Luxury Architectural Estate - Night" 
                className="hero-image hero-image-dark"
                loading="eager"
                decoding="sync"
              />
              <img 
                src="/images/hero-light.jpg" 
                alt="Al Zakaria Luxury Architectural Estate - Day" 
                className="hero-image hero-image-light"
                loading="eager"
                decoding="sync"
              />
            </div>
            {/* Multi-Stop Cinematic Dimming & Vignette (Synchronized Opacity Layers) */}
            <div className="hero-dim-overlay hero-dim-dark" />
            <div className="hero-dim-overlay hero-dim-light" />
            {/* Progressive Seamless Bottom Dissolve (Synchronized Opacity Layers) */}
            <div className="hero-bottom-fade hero-fade-dark" />
            <div className="hero-bottom-fade hero-fade-light" />
          </div>

          <div className="container hero-container">
            <div className="hero-content">
              {/* Royal Baroque Architectural Medallion Crest */}
              <div className="hero-mobile-crest" aria-hidden="true">
                <svg className="crest-baroque-svg" width="176" height="106" viewBox="0 0 176 106" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="baroque-gold-hero" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFFDF7" />
                      <stop offset="22%" stopColor="#FFE8A3" />
                      <stop offset="55%" stopColor="#E5B869" />
                      <stop offset="85%" stopColor="#C99837" />
                      <stop offset="100%" stopColor="#9E7428" />
                    </linearGradient>
                    <radialGradient id="aura-glow-hero" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(246, 212, 132, 0.45)" />
                      <stop offset="55%" stopColor="rgba(229, 184, 105, 0.15)" />
                      <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                  </defs>

                  {/* Ambient Soft Gold Radial Glow */}
                  <ellipse cx="88" cy="54" rx="55" ry="42" fill="url(#aura-glow-hero)" />

                  {/* Central Medallion Double Oval Ring */}
                  <ellipse cx="88" cy="54" rx="25" ry="22.5" stroke="url(#baroque-gold-hero)" strokeWidth="1.5" />
                  <ellipse cx="88" cy="54" rx="21.5" ry="19" stroke="url(#baroque-gold-hero)" strokeWidth="0.75" strokeDasharray="1.5 2.2" />

                  {/* Classical Mansion / Pediment Architecture */}
                  <path d="M88 41L77 47.5H99L88 41Z" stroke="url(#baroque-gold-hero)" strokeWidth="1.25" strokeLinejoin="round" fill="none" />
                  <path d="M80 48.5V56M84 48.5V56M88 48.5V56M92 48.5V56M96 48.5V56" stroke="url(#baroque-gold-hero)" strokeWidth="1.05" strokeLinecap="round" />
                  <path d="M75.5 57H100.5M73 58.5H103" stroke="url(#baroque-gold-hero)" strokeWidth="1.25" strokeLinecap="round" />

                  {/* Royal Crown / Crest Tiara at Top */}
                  <path d="M88 20C86 25 83 28 78 29C72 30.5 67 27.5 66 23C65 18 69 13 74 13C79 13 84 18 88 23C92 18 97 13 102 13C107 13 111 18 110 23C109 27.5 104 30.5 98 29C93 28 90 25 88 20Z" stroke="url(#baroque-gold-hero)" strokeWidth="1.15" fill="none" />
                  <path d="M88 12V19M88 12L84 15.5M88 12L92 15.5" stroke="url(#baroque-gold-hero)" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="88" cy="9" r="1.5" fill="url(#baroque-gold-hero)" />

                  {/* Left Symmetrical Baroque Vine Scrolls & Acanthus Swirls */}
                  <path d="M60 54C60 41 66 31 77 28C67 29 55 36 52 46C49 55 53 65 62 70C70 75 79 77 84 79C75 77 65 72 61 65C56 59 58 48 67 41C74 35 83 37 85 43" stroke="url(#baroque-gold-hero)" strokeWidth="1.15" fill="none" />
                  <path d="M48 46C42 50 39 57 41 64C44 71 52 76 60 76C54 74 47 69 46 62C44 56 47 50 52 46" stroke="url(#baroque-gold-hero)" strokeWidth="1" fill="none" />
                  <path d="M56 34C48 34 41 40 41 48C41 53 45 57 49 57C53 57 56 53 55 49C53 44 47 43 46 47" stroke="url(#baroque-gold-hero)" strokeWidth="0.85" fill="none" />
                  <path d="M36 52C28 56 25 64 28 72C31 78 39 82 48 80C41 79 34 74 33 67C32 60 36 55 42 53" stroke="url(#baroque-gold-hero)" strokeWidth="0.85" fill="none" />
                  <circle cx="26" cy="74" r="1.4" fill="url(#baroque-gold-hero)" />
                  <circle cx="39" cy="32" r="1.4" fill="url(#baroque-gold-hero)" />

                  {/* Right Symmetrical Baroque Vine Scrolls & Acanthus Swirls */}
                  <path d="M116 54C116 41 110 31 99 28C109 29 121 36 124 46C127 55 123 65 114 70C106 75 97 77 92 79C101 77 111 72 115 65C120 59 118 48 109 41C102 35 93 37 91 43" stroke="url(#baroque-gold-hero)" strokeWidth="1.15" fill="none" />
                  <path d="M128 46C134 50 137 57 135 64C132 71 124 76 116 76C122 74 129 69 130 62C132 56 129 50 124 46" stroke="url(#baroque-gold-hero)" strokeWidth="1" fill="none" />
                  <path d="M120 34C128 34 135 40 135 48C135 53 131 57 127 57C123 57 120 53 121 49C123 44 129 43 130 47" stroke="url(#baroque-gold-hero)" strokeWidth="0.85" fill="none" />
                  <path d="M140 52C148 56 151 64 148 72C145 78 137 82 128 80C135 79 142 74 143 67C144 60 140 55 134 53" stroke="url(#baroque-gold-hero)" strokeWidth="0.85" fill="none" />
                  <circle cx="150" cy="74" r="1.4" fill="url(#baroque-gold-hero)" />
                  <circle cx="137" cy="32" r="1.4" fill="url(#baroque-gold-hero)" />

                  {/* Bottom Center Rosette / Flourish Terminal */}
                  <path d="M76 79C82 83 88 87 88 93C88 87 94 83 100 79C94 81 88 83 88 87C88 83 82 81 76 79Z" stroke="url(#baroque-gold-hero)" strokeWidth="1.1" fill="none" />
                  <circle cx="88" cy="97" r="1.7" fill="url(#baroque-gold-hero)" />
                </svg>
              </div>

              {/* Liquid Frosted Glass Capsule Card */}
              <div className="hero-title-glass-card">
                {/* Luminous Center Ambient Highlight Glow */}
                <div className="glass-center-glow" aria-hidden="true" />
                <div className="glass-edge-glint glint-left" aria-hidden="true" />
                <div className="glass-edge-glint glint-right" aria-hidden="true" />
                
                {/* Monumental Headline with Living Typewriter Animation */}
                <motion.h1 
                  className="hero-title"
                  aria-label={`${line1Text} ${line2Text}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="hero-title-main">
                    <span className="hero-title-main-text">{display1}</span>
                    {showCursorOnLine1 && <span className="typewriter-cursor">|</span>}
                  </span>
                  <span className="hero-title-serif">
                    <span className="hero-title-serif-inner">{display2}</span>
                    {showCursorOnLine2 && <span className="typewriter-cursor">|</span>}
                  </span>
                </motion.h1>
              </div>

              {/* Mobile Sparkling Star Divider with Glowing Symmetrical Hairlines */}
              <div className="hero-mobile-divider" aria-hidden="true">
                <span className="divider-glow-line divider-line-start" />
                <span className="divider-sparkle">✦</span>
                <span className="divider-glow-line divider-line-end" />
              </div>

              {/* Crisp Subtitle */}
              <motion.p 
                className="hero-subtitle"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {heroSubtitle}
              </motion.p>
            </div>

            {/* Floating Frosted Glass QuickSearchBar */}
            <motion.div 
              className="hero-search-wrapper"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 100, delay: 0.28 }}
            >
              <QuickSearchBar locale={locale} onSearch={(filters) => onNavigateToCatalog(filters)} />
            </motion.div>
          </div>
        </section>
      )}

      {/* ─── 2. Authority & Metrology Ribbon (Directly Below Hero Fold) ─── */}
      {homeSettings.showStatsRibbon !== false && (
        <StatsSection locale={locale} hideHeader={true} compact={true} />
      )}

      {/* ─── 3. Featured Masterpieces Section (Primary Discovery Gallery) ─── */}
      {homeSettings.showFeaturedGrid !== false && (
        <section className="featured-section">
          <div className="featured-horizon-glow" />
          <div className="container">
            <motion.div 
              className="featured-header"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div>
                <div className="section-eyebrow-pill">
                  <span className="eyebrow-dot" />
                  <span>{isAr ? (homeSettings.featuredEyebrowAr || 'مجموعة منتقاة • دليل ٢٠٢٦') : (homeSettings.featuredEyebrowEn || 'CURATED SELECTION • 2026 DIRECTORY')}</span>
                </div>
                <h2 className="section-title">
                  <span>{isAr ? (homeSettings.featuredTitle1Ar || 'أحدث الصروح المعمارية و ') : (homeSettings.featuredTitle1En || 'Featured Architectural ')}</span>
                  <span className="title-serif-accent" style={isAr ? { marginInlineStart: '0.45rem', display: 'inline-block' } : undefined}>
                    {isAr ? (homeSettings.featuredTitle2Ar || 'القصور الاستثنائية') : (homeSettings.featuredTitle2En || 'Masterpieces')}
                  </span>
                </h2>
              </div>
              <button 
                className="explore-catalog-btn"
                onClick={() => onNavigateToCatalog()}
                type="button"
              >
                <span>{isAr ? 'عرض جميع العقارات' : 'Browse Complete Collection'}</span>
                <ArrowUpRight size={16} />
              </button>
            </motion.div>

          {/* Destination Filter Pills */}
          <motion.div 
            className="destination-pills-bar"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {destinationFilters.map((tab) => {
              const isActive = activeDestination === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDestination(tab.id)}
                  className={`destination-pill ${isActive ? 'active' : ''}`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeFeaturedDestinationPill"
                      className="destination-pill-indicator"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </motion.div>

          {/* 6-Card Animated Grid */}
          <motion.div layout className="featured-grid">
            <AnimatePresence mode="popLayout">
              {filteredFeaturedProperties.map((property, idx) => (
                <motion.div
                  key={property.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PropertyCard
                    property={property}
                    index={idx}
                    onSelect={onSelectProperty}
                    locale={locale}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
      )}

      {/* ─── 4. Interactive Real Cartography Map Explorer ─── */}
      {homeSettings.showMapExplorer !== false && (
        <MapSection onOpenMapModal={onOpenMapModal} properties={allProps} locale={locale} />
      )}

      {/* ─── 5. Unified Sovereign Advisory & Client Provenance ─── */}
      {homeSettings.showSovereignAdvisory !== false && (
        <SovereignAdvisorySection locale={locale} onOpenListEstate={onOpenListEstate} />
      )}

      {/* ─── 6. Panoramic Confidential Placement & Consignment Portal ─── */}
      {homeSettings.showSellerConsignment !== false && (
        <section className="seller-banner-section">
          <div className="seller-ambient-glow" />
          <div className="container">
            <div className="seller-consignment-banner">
              <div className="banner-watermark-scale">
                <Scale size={240} strokeWidth={0.8} />
              </div>

              <div className="seller-banner-content">
                <div className="seller-text-wrap">
                  <div className="seller-eyebrow-row">
                    <div className="section-eyebrow-pill">
                      <span className="eyebrow-dot" />
                      <span>{isAr ? 'خدمات التمثيل والبيع الخاص' : 'PRIVATE CONSIGNMENT & PLACEMENT'}</span>
                    </div>
                    <span className="seller-confidential-tag">
                      <ShieldCheck size={13} />
                      <span>{isAr ? 'سرية تامة ١٠٠٪' : '100% Confidential'}</span>
                    </span>
                  </div>

                  <h2 className="seller-title">
                    <span>{isAr ? (homeSettings.sellerTitle1Ar || 'هل ترغب في بيع أو تمثيل ') : (homeSettings.sellerTitle1En || 'Looking to List or Consign Your ')}</span>
                    <span className="title-serif-accent">{isAr ? (homeSettings.sellerTitle2Ar || 'قصرك واستثمارك؟') : (homeSettings.sellerTitle2En || 'Generational Estate?')}</span>
                  </h2>
                  
                  <p className="seller-desc">
                    {isAr 
                      ? (homeSettings.sellerDescAr || 'اعرض عقارك عبر مكتب زكريا فريد وتواصل مباشرة مع نخبة المشترين والمستثمرين والمكاتب العائلية الباحثة عن الأصول النادرة بأعلى درجات السرية.')
                      : (homeSettings.sellerDescEn || 'Entrust your architectural statement to our private placement practice. Reach verified buyers, family offices, and sovereign wealth trustees actively seeking rare trophy assets.')}
                  </p>

                  <div className="seller-stats-strip">
                    <div className="seller-stat-item">
                      <span className="stat-val">{isAr ? '٤٨ ساعة' : '48 Hours'}</span>
                      <span className="stat-lbl">{isAr ? 'طرح استشاري خاص' : 'Private Placement SLA'}</span>
                    </div>
                    <div className="seller-stat-sep" />
                    <div className="seller-stat-item">
                      <span className="stat-val">{isAr ? '+٢.٥ مليار ج.م' : '2.5B+ EGP'}</span>
                      <span className="stat-lbl">{isAr ? 'صفقات تم إغلاقها' : 'Transaction Volume'}</span>
                    </div>
                    <div className="seller-stat-sep" />
                    <div className="seller-stat-item">
                      <span className="stat-val">{isAr ? '١٠٠٪' : '100%'}</span>
                      <span className="stat-lbl">{isAr ? 'ملكية حرة مؤكدة' : 'Freehold Verified'}</span>
                    </div>
                  </div>
                </div>

                <div className="seller-cta-group">
                  <button 
                    className="seller-cta-btn btn-gold"
                    onClick={onOpenListEstate}
                    type="button"
                  >
                    <span>{isAr ? 'طلب تسجيل وتمثيل عقار' : 'Request Private Consignment'}</span>
                    <ArrowUpRight size={16} />
                  </button>

                  <button 
                    className="seller-outline-btn"
                    onClick={() => onNavigateToCatalog()}
                    type="button"
                  >
                    <Building2 size={15} />
                    <span>{isAr ? 'استعراض الدليل الحصري' : 'Explore Portfolio'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <style>{`
        .home-view {
          min-height: 100vh;
          background: var(--bg-primary, #0A0C10);
          color: var(--text-primary, #FFFFFF);
          overflow-x: hidden;
          transition: background var(--transition-smooth);
        }

        [data-theme="light"] .home-view {
          background: var(--bg-primary, #F7F4EE);
          color: var(--text-primary, #141210);
        }

        /* ─── 1. Full-Bleed Viewport Cinematic Hero ─── */
        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: flex-end;
          padding-top: 130px;
          padding-bottom: 4.5rem;
          background: transparent;
          overflow: hidden;
        }

        .hero-bg-media {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 1;
        }

        .hero-bg-cinematic-stage {
          position: absolute;
          top: -24px;
          left: -24px;
          width: calc(100% + 48px);
          height: calc(100% + 48px);
          transform: scale(1.02);
          transform-origin: center center;
          animation: heroCinematicZoom 24s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          will-change: transform;
        }

        .hero-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 38%;
          user-select: none;
          pointer-events: none;
          transform: translateZ(0);
          backface-visibility: hidden;
          will-change: opacity;
          transition: opacity var(--transition-smooth);
        }

        .hero-image-dark {
          opacity: 1;
          filter: brightness(0.88) contrast(1.06);
        }

        .hero-image-light {
          opacity: 0;
          filter: brightness(0.96) contrast(1.04);
        }

        [data-theme="dark"] .hero-image-dark { opacity: 1; }
        [data-theme="dark"] .hero-image-light { opacity: 0; }
        [data-theme="light"] .hero-image-dark { opacity: 0; }
        [data-theme="light"] .hero-image-light { opacity: 1; }

        @keyframes heroCinematicZoom {
          0% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1.08);
          }
        }

        /* Multi-Stop Cinematic Dimming & Vignette (Synchronized Layers) */
        .hero-dim-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          will-change: opacity;
          transition: opacity var(--transition-smooth);
        }

        .hero-dim-dark {
          background: 
            radial-gradient(
              ellipse at 50% 40%,
              rgba(10, 12, 16, 0.2) 0%,
              rgba(10, 12, 16, 0.55) 65%,
              rgba(10, 12, 16, 0.85) 100%
            ),
            linear-gradient(
              to bottom,
              rgba(10, 12, 16, 0.45) 0%,
              transparent 35%,
              rgba(10, 12, 16, 0.35) 70%,
              rgba(10, 12, 16, 0.85) 100%
            );
        }

        .hero-dim-light {
          background: 
            radial-gradient(
              ellipse at 50% 35%,
              rgba(20, 24, 32, 0.12) 0%,
              rgba(20, 24, 32, 0.35) 60%,
              rgba(20, 24, 32, 0.65) 100%
            ),
            linear-gradient(
              to bottom,
              rgba(20, 24, 32, 0.35) 0%,
              transparent 30%,
              rgba(20, 24, 32, 0.25) 70%,
              rgba(247, 244, 238, 0.65) 100%
            );
        }

        [data-theme="dark"] .hero-dim-dark { opacity: 1; }
        [data-theme="dark"] .hero-dim-light { opacity: 0; }
        [data-theme="light"] .hero-dim-dark { opacity: 0; }
        [data-theme="light"] .hero-dim-light { opacity: 1; }

        /* Smooth Bottom Progressive Dissolve (Synchronized Layers) */
        .hero-bottom-fade {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 180px;
          pointer-events: none;
          z-index: 3;
          will-change: opacity;
          transition: opacity var(--transition-smooth);
        }

        .hero-fade-dark {
          background: linear-gradient(to bottom, transparent 0%, rgba(14, 16, 23, 0.85) 70%, #0E1017 100%);
        }

        .hero-fade-light {
          background: linear-gradient(to bottom, transparent 0%, rgba(247, 244, 238, 0.75) 70%, #F7F4EE 100%);
        }

        [data-theme="dark"] .hero-fade-dark { opacity: 1; }
        [data-theme="dark"] .hero-fade-light { opacity: 0; }
        [data-theme="light"] .hero-fade-dark { opacity: 0; }
        [data-theme="light"] .hero-fade-light { opacity: 1; }

        .hero-container {
          position: relative;
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-end;
          width: 100%;
          gap: 2.25rem;
        }

        .hero-content {
          max-width: 1180px;
          width: 100%;
        }

        .hero-title {
          font-family: var(--font-heading);
          font-size: clamp(2.2rem, 3.8vw, 3.65rem);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.025em;
          margin: 0 0 1.25rem 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          min-height: calc(1.15em * 2 + 2px);
        }

        .hero-title-main {
          color: #FFFFFF;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          line-height: 1.15;
          min-height: 1.15em;
          margin: 0;
          padding: 0;
          text-align: start;
          align-self: flex-start;
        }

        [data-theme="light"] .hero-title-main {
          color: #0F172A;
          text-shadow: none;
        }

        .hero-title-serif {
          font-family: Georgia, var(--font-heading), serif;
          font-weight: 800;
          font-style: italic;
          background: linear-gradient(135deg, #FFFDF7 0%, #FFF0C2 22%, #F6D484 55%, #E5B869 85%, #D49F33 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: none;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          line-height: 1.15;
          min-height: 1.15em;
          margin: 0;
          padding: 0;
          text-align: start;
          align-self: flex-start;
          overflow: visible;
        }

        [data-theme="light"] .hero-title-serif {
          background: linear-gradient(135deg, #B8860B 0%, #996515 50%, #7B4F0F 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: none;
        }

        .hero-title-serif-inner {
          display: inline-block;
          padding: 0.05em 0.2em;
          margin: -0.05em -0.2em;
          overflow: visible;
        }

        /* Desktop RTL Overrides */
        @media (min-width: 769px) {
          :global([dir="rtl"]) .hero-title,
          [dir="rtl"] .hero-title,
          .home-view[dir="rtl"] .hero-title {
            font-size: clamp(2.45rem, 4.2vw, 3.95rem) !important;
            line-height: 1.24 !important;
            letter-spacing: 0 !important;
            min-height: calc(1.24em * 2 + 4px);
            align-items: flex-start !important;
            text-align: start !important;
          }

          :global([dir="rtl"]) .hero-title-main,
          [dir="rtl"] .hero-title-main,
          .home-view[dir="rtl"] .hero-title-main {
            font-size: 1em !important;
            font-style: normal !important;
            letter-spacing: 0 !important;
            padding: 0.1em 0.35em !important;
            margin: -0.1em -0.35em !important;
            overflow: visible !important;
            display: inline-block !important;
            text-align: start !important;
            align-self: flex-start !important;
          }

          :global([dir="rtl"]) .hero-title-serif,
          [dir="rtl"] .hero-title-serif,
          .home-view[dir="rtl"] .hero-title-serif {
            font-family: 'ThmanyahSerifDisplay', 'Amiri', 'Traditional Arabic', serif !important;
            font-size: 1em !important;
            font-style: normal !important;
            font-weight: 900 !important;
            line-height: 1.25 !important;
            min-height: 1.25em !important;
            letter-spacing: 0 !important;
            padding: 0.12em 0.45em !important;
            margin: -0.12em -0.45em !important;
            overflow: visible !important;
            filter: none !important;
            text-shadow: none !important;
            display: inline-block !important;
            text-align: start !important;
            align-self: flex-start !important;
          }

          .hero-mobile-crest,
          .hero-mobile-divider,
          .glass-edge-glint {
            display: none !important;
          }

          .hero-title-glass-card {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 0 1.25rem 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }

        .typewriter-cursor {
          display: inline-block;
          font-family: monospace, sans-serif;
          font-weight: 300;
          font-style: normal;
          color: var(--gold-primary, #DDA752);
          margin-inline-start: 4px;
          animation: blinkCursor 0.75s infinite ease-in-out;
          vertical-align: 0.05em;
          -webkit-text-fill-color: var(--gold-primary, #DDA752);
          text-shadow: 0 0 10px rgba(221, 167, 82, 0.85);
        }

        @keyframes blinkCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Desktop: mobile-only hero elements hidden */
        .hero-mobile-crest,
        .hero-mobile-divider,
        .hero-mobile-eyebrow,
        .hero-mobile-quick-chips,
        .hero-mobile-trust-bar,
        .hero-mobile-explore-btn,
        .glass-edge-glint {
          display: none;
        }

        @media (max-width: 768px) {
          .hero-section {
            min-height: 100vh;
            min-height: 100dvh;
            padding-top: 98px;
            padding-bottom: 2.25rem;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: stretch;
            box-sizing: border-box;
          }

          .hero-container,
          .home-view .hero-container,
          .home-view[dir="rtl"] .hero-container,
          [dir="rtl"] .hero-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 1.15rem !important;
            margin: 0 auto !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            gap: 1.15rem !important;
            align-items: center !important;
            text-align: center !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-end !important;
          }

          .hero-content,
          .home-view .hero-content,
          .home-view[dir="rtl"] .hero-content,
          [dir="rtl"] .hero-content {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            justify-content: center !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
          }

          /* Royal Baroque Architectural Medallion Crest */
          .hero-mobile-crest {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
            z-index: 6 !important;
            width: 100% !important;
            margin: 0 auto -2.1rem auto !important;
            filter: drop-shadow(0 0 16px rgba(229, 184, 105, 0.45)) !important;
            pointer-events: none !important;
          }

          .crest-baroque-svg {
            display: block !important;
            width: 176px !important;
            max-width: 176px !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Liquid Frosted Glass Capsule Card (Identical Translucent Specular Recipe) */
          .hero-title-glass-card {
            position: relative !important;
            z-index: 5 !important;
            width: 100% !important;
            max-width: 350px !important;
            margin: 0 auto 0.75rem auto !important;
            padding: 1.15rem 1.45rem 1.05rem !important;
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.28) 0%,
              rgba(255, 255, 255, 0.09) 35%,
              rgba(18, 24, 38, 0.35) 70%,
              rgba(10, 14, 24, 0.55) 100%
            ) !important;
            backdrop-filter: blur(28px) saturate(220%) brightness(112%) contrast(105%) !important;
            -webkit-backdrop-filter: blur(28px) saturate(220%) brightness(112%) contrast(105%) !important;
            border: 1.2px solid rgba(255, 255, 255, 0.35) !important;
            border-radius: 22px !important;
            box-shadow: 
              0 20px 48px rgba(0, 0, 0, 0.4),
              0 4px 16px rgba(0, 0, 0, 0.16),
              inset 0 2px 2px rgba(255, 255, 255, 0.7),
              inset 0 -1px 1px rgba(255, 255, 255, 0.2) !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }

          /* Highlight glow centered in the card */
          .glass-center-glow {
            display: block !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 230px !important;
            height: 95px !important;
            border-radius: 50% !important;
            background: radial-gradient(ellipse at center, rgba(246, 212, 132, 0.32) 0%, rgba(229, 184, 105, 0.12) 45%, transparent 75%) !important;
            filter: blur(14px) !important;
            pointer-events: none !important;
            z-index: 1 !important;
          }

          .glass-edge-glint {
            display: block !important;
            position: absolute !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 3px !important;
            height: 48px !important;
            background: linear-gradient(180deg, transparent 0%, rgba(255, 245, 220, 0.95) 50%, transparent 100%) !important;
            filter: drop-shadow(0 0 10px rgba(255, 235, 180, 0.9)) !important;
            pointer-events: none !important;
            border-radius: 3px !important;
            z-index: 3 !important;
          }

          .glint-left {
            left: -1.5px !important;
          }

          .glint-right {
            right: -1.5px !important;
          }

          /* Majestic Title with Living Presence inside Glass */
          .hero-title,
          :global([dir="rtl"]) .hero-title,
          [dir="rtl"] .hero-title,
          .home-view[dir="rtl"] .hero-title {
            font-size: clamp(1.48rem, 6.2vw, 1.88rem) !important;
            font-weight: 800 !important;
            line-height: 1.25 !important;
            letter-spacing: 0 !important;
            margin: 0 auto !important;
            min-height: calc(1.25em * 2 + 2px) !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            justify-content: center !important;
            gap: 2px !important;
            width: 100% !important;
            max-width: 100% !important;
            position: relative !important;
            z-index: 2 !important;
          }

          /* Line 1: Golden Metallic Headline */
          .hero-title-main,
          .hero-title-main-text,
          :global([dir="rtl"]) .hero-title-main,
          :global([dir="rtl"]) .hero-title-main-text,
          [dir="rtl"] .hero-title-main,
          [dir="rtl"] .hero-title-main-text,
          .home-view[dir="rtl"] .hero-title-main,
          .home-view[dir="rtl"] .hero-title-main-text {
            background: linear-gradient(135deg, #FFFDF7 0%, #FFE599 22%, #F6D484 55%, #E5B869 85%, #C99632 100%) !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            color: #F6D484 !important;
            font-weight: 700 !important;
            line-height: 1.25 !important;
            min-height: 1.25em !important;
            margin: 0 auto !important;
            padding: 0 !important;
            text-align: center !important;
            align-self: center !important;
            justify-content: center !important;
            display: flex !important;
            white-space: nowrap !important;
            text-shadow: none !important;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45)) !important;
            font-size: 1em !important;
          }

          [data-theme="light"] .hero-title-main,
          [data-theme="light"] .hero-title-main-text {
            background: linear-gradient(135deg, #B8860B 0%, #996515 50%, #7B4F0F 100%) !important;
            -webkit-background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
          }

          /* Line 2: Crisp Pure White Headline */
          .hero-title-serif,
          .hero-title-serif-inner,
          :global([dir="rtl"]) .hero-title-serif,
          :global([dir="rtl"]) .hero-title-serif-inner,
          [dir="rtl"] .hero-title-serif,
          [dir="rtl"] .hero-title-serif-inner,
          .home-view[dir="rtl"] .hero-title-serif,
          .home-view[dir="rtl"] .hero-title-serif-inner {
            color: #FFFFFF !important;
            background: none !important;
            -webkit-background-clip: unset !important;
            -webkit-text-fill-color: #FFFFFF !important;
            font-family: inherit !important;
            font-style: normal !important;
            font-weight: 800 !important;
            line-height: 1.25 !important;
            min-height: 1.25em !important;
            margin: 0 auto !important;
            padding: 0 !important;
            text-align: center !important;
            align-self: center !important;
            justify-content: center !important;
            display: flex !important;
            white-space: nowrap !important;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45) !important;
            font-size: 1em !important;
          }

          [data-theme="light"] .hero-title-serif,
          [data-theme="light"] .hero-title-serif-inner {
            color: #0F172A !important;
            -webkit-text-fill-color: #0F172A !important;
            text-shadow: none !important;
          }

          /* Mobile Sparkling Star Divider with Symmetrical Glowing Lines */
          .hero-mobile-divider {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 12px !important;
            width: 100% !important;
            max-width: 220px !important;
            margin: 0.5rem auto 0.65rem auto !important;
          }

          .divider-glow-line {
            display: block !important;
            flex: 1 !important;
            height: 1px !important;
            min-width: 35px !important;
          }

          .divider-line-start {
            background: linear-gradient(to right, transparent 0%, rgba(229, 184, 105, 0.85) 100%) !important;
          }

          .divider-line-end {
            background: linear-gradient(to left, transparent 0%, rgba(229, 184, 105, 0.85) 100%) !important;
          }

          .divider-sparkle {
            color: #F6D484 !important;
            font-size: 0.82rem !important;
            line-height: 1 !important;
            filter: drop-shadow(0 0 8px rgba(246, 212, 132, 0.95)) !important;
            flex-shrink: 0 !important;
          }

          .hero-subtitle,
          :global([dir="rtl"]) .hero-subtitle,
          [dir="rtl"] .hero-subtitle,
          .home-view[dir="rtl"] .hero-subtitle {
            font-size: 0.84rem !important;
            line-height: 1.55 !important;
            color: rgba(255, 255, 255, 0.92) !important;
            margin-bottom: 0 !important;
            margin-inline: auto !important;
            text-align: center !important;
            max-width: 44ch !important;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9) !important;
            display: block !important;
            width: 100% !important;
          }

          [data-theme="light"] .hero-subtitle {
            color: #334155 !important;
            text-shadow: 0 1px 4px rgba(255, 255, 255, 0.85) !important;
          }

          /* Search & Modules Container */
          .hero-search-wrapper {
            width: 100%;
            background: transparent;
            border: none;
            box-shadow: none;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          /* Quick Destination Chips */
          .hero-mobile-quick-chips {
            display: flex;
            flex-direction: column;
            gap: 0.45rem;
            width: 100%;
          }

          .hero-chips-heading {
            font-size: 0.6875rem;
            font-weight: 700;
            letter-spacing: 0.05em;
            color: rgba(255, 255, 255, 0.65);
            text-transform: uppercase;
          }

          [data-theme="light"] .hero-chips-heading {
            color: #64748B;
          }

          .hero-chips-scroll {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            overflow-x: auto;
            padding-bottom: 4px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .hero-chips-scroll::-webkit-scrollbar {
            display: none;
          }

          .hero-dest-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            color: #FFFFFF;
            background: rgba(255, 255, 255, 0.07);
            border: 1px solid rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            transition: all 0.2s ease;
          }

          .hero-dest-chip:active {
            transform: scale(0.96);
            background: rgba(229, 184, 105, 0.2);
            border-color: rgba(229, 184, 105, 0.5);
            color: #E5B869;
          }

          [data-theme="light"] .hero-dest-chip {
            color: #1E293B;
            background: rgba(255, 255, 255, 0.8);
            border-color: rgba(0, 0, 0, 0.1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          }

          .dest-chip-arrow {
            opacity: 0.6;
            color: #E5B869;
          }

          [data-theme="light"] .dest-chip-arrow {
            color: #B8860B;
          }

          /* Trust Guarantee Badges Bar */
          .hero-mobile-trust-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 0.65rem 0.85rem;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          }

          [data-theme="light"] .hero-mobile-trust-bar {
            background: rgba(255, 255, 255, 0.7);
            border-color: rgba(0, 0, 0, 0.08);
            box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
          }

          .hero-trust-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.6875rem;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.9);
          }

          [data-theme="light"] .hero-trust-item {
            color: #1E293B;
          }

          .hero-trust-icon {
            color: #E5B869;
            flex-shrink: 0;
          }

          [data-theme="light"] .hero-trust-icon {
            color: #B8860B;
          }

          .hero-trust-divider {
            width: 1px;
            height: 14px;
            background: rgba(255, 255, 255, 0.15);
          }

          [data-theme="light"] .hero-trust-divider {
            background: rgba(0, 0, 0, 0.1);
          }

          /* Bottom Explore Discovery Button */
          .hero-mobile-explore-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            padding: 0.5rem;
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.65);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 0.25rem;
            transition: color 0.2s ease;
          }

          [data-theme="light"] .hero-mobile-explore-btn {
            color: #64748B;
          }

          .hero-mobile-explore-btn:active {
            color: #E5B869;
          }

          .hero-explore-chevron {
            display: flex;
            align-items: center;
            justify-content: center;
            animation: bounceChevron 1.8s infinite ease-in-out;
          }

          @keyframes bounceChevron {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(3px); }
          }
        }
        }

        .hero-subtitle {
          font-size: 1.05rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.65;
          max-width: 680px;
          margin: 0;
          font-weight: 400;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
        }

        .hero-search-wrapper {
          width: 100%;
          position: relative;
          z-index: 10;
        }

        /* ─── 3. Featured Masterpieces Section ─── */
        .featured-section {
          position: relative;
          background: transparent;
          padding-top: 4.5rem;
          padding-bottom: 6rem;
        }

        .featured-horizon-glow {
          position: absolute;
          top: 60px;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 1000px;
          height: 320px;
          background: radial-gradient(
            ellipse at center,
            rgba(184, 147, 74, 0.08) 0%,
            rgba(184, 147, 74, 0.015) 45%,
            transparent 70%
          );
          pointer-events: none;
          filter: blur(55px);
          z-index: 1;
        }

        .featured-section .container {
          position: relative;
          z-index: 2;
        }

        .featured-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 2.25rem;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .section-eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #E5B869;
          background: rgba(229, 184, 105, 0.08);
          border: 1px solid rgba(229, 184, 105, 0.25);
          margin-bottom: 0.85rem;
          text-transform: uppercase;
        }

        [data-theme="light"] .section-eyebrow-pill {
          color: #8C6826;
          background: rgba(184, 147, 74, 0.08);
          border-color: rgba(140, 104, 38, 0.22);
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #E5B869;
          display: inline-block;
        }

        [data-theme="light"] .eyebrow-dot {
          background: #8C6826;
        }

        .section-title {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 3.2vw, 2.5rem);
          font-weight: 800;
          color: var(--text-primary, #FFFFFF);
          letter-spacing: -0.02em;
          margin: 0;
          line-height: 1.2;
        }

        [data-theme="light"] .section-title {
          color: #141210;
        }

        .title-serif-accent {
          font-family: Georgia, serif;
          font-weight: 400;
          font-style: italic;
          color: #E5B869;
        }

        [data-theme="light"] .title-serif-accent {
          color: #8C6826;
        }

        .explore-catalog-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #E5B869;
          font-size: 0.9375rem;
          font-weight: 700;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.5rem 0;
          transition: all var(--transition-fast);
        }

        [data-theme="light"] .explore-catalog-btn {
          color: #8C6826;
        }

        .explore-catalog-btn:hover {
          color: #FFF0C2;
          transform: translateY(-1px);
        }

        [data-theme="light"] .explore-catalog-btn:hover {
          color: #593D0E;
        }

        /* Destination Filter Pills (Liquid Glass) */
        .destination-pills-bar {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
          margin-bottom: 2.5rem;
        }

        .destination-pill {
          position: relative;
          padding: 0.55rem 1.25rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary, #94A3B8);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          transition: all var(--transition-fast);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        [data-theme="light"] .destination-pill {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.78) 0%,
            rgba(255, 255, 255, 0.45) 100%
          );
          border: 1.5px solid rgba(255, 255, 255, 0.88);
          color: #475569;
          box-shadow: 0 4px 14px rgba(30, 24, 16, 0.05), inset 0 1px 1px #FFFFFF;
        }

        .destination-pill:hover {
          color: var(--text-primary, #141210);
          border-color: rgba(184, 147, 74, 0.5);
        }

        .destination-pill.active {
          color: #0A0C10;
          font-weight: 700;
          border-color: transparent;
          background: transparent;
        }

        .destination-pill-indicator {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, #FFF4D4 0%, #E5B869 50%, #B8934A 100%);
          box-shadow: 0 4px 16px rgba(184, 147, 74, 0.35);
          z-index: 0;
        }

        .destination-pill span {
          position: relative;
          z-index: 1;
        }

        .featured-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        @media (max-width: 1024px) {
          .featured-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          /* Uniform mobile section rhythm (3rem between sections) */
          .featured-section {
            padding-top: 3rem;
            padding-bottom: 3rem;
          }
          .seller-banner-section {
            padding: 3rem 0;
          }
          /* Uniform gaps: eyebrow→title == title→button == button→pills (0.85rem) */
          .featured-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.85rem;
            margin-bottom: 0.85rem;
          }
          .destination-pills-bar {
            flex-wrap: nowrap;
            overflow-x: auto;
            padding: 4px 1rem 12px 1rem;
            margin: 0 -1rem 1.75rem -1rem;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .destination-pills-bar::-webkit-scrollbar {
            display: none;
          }
          .destination-pill {
            flex-shrink: 0;
            white-space: nowrap;
            padding: 0.5rem 1.1rem;
            font-size: 0.8rem;
          }
          .featured-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        /* ─── 6. Panoramic Confidential Consignment Pavilion (Liquid Glass) ─── */
        .seller-banner-section {
          padding: 4rem 0 6.5rem;
          position: relative;
          z-index: 2;
          overflow: hidden;
        }

        .seller-ambient-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }

        [data-theme="light"] .seller-ambient-glow {
          background: 
            radial-gradient(ellipse 650px 320px at 25% 50%, rgba(229, 184, 105, 0.25) 0%, transparent 65%),
            radial-gradient(ellipse 550px 280px at 75% 50%, rgba(184, 147, 74, 0.20) 0%, transparent 65%);
        }

        [data-theme="dark"] .seller-ambient-glow {
          background: 
            radial-gradient(ellipse 600px 300px at 30% 50%, rgba(184, 147, 74, 0.12) 0%, transparent 65%);
        }

        .seller-banner-section .container {
          position: relative;
          z-index: 2;
        }

        .seller-consignment-banner {
          position: relative;
          border-radius: 26px;
          padding: 4rem 3.5rem;
          overflow: hidden;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .seller-consignment-banner {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(18, 24, 38, 0.55) 50%,
            rgba(10, 14, 24, 0.80) 100%
          );
          backdrop-filter: blur(32px) saturate(210%);
          -webkit-backdrop-filter: blur(32px) saturate(210%);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 
            0 28px 64px rgba(0, 0, 0, 0.5),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.6);
        }

        [data-theme="light"] .seller-consignment-banner {
          background: linear-gradient(135deg, #FFFFFF 0%, #FAF7F2 100%);
          border: 1.5px solid rgba(184, 147, 74, 0.35);
          box-shadow: 
            0 16px 48px rgba(30, 24, 16, 0.06),
            0 2px 8px rgba(0, 0, 0, 0.02);
        }

        .banner-watermark-scale {
          position: absolute;
          right: -40px;
          bottom: -40px;
          color: rgba(184, 147, 74, 0.06);
          pointer-events: none;
          user-select: none;
        }

        [data-theme="light"] .banner-watermark-scale {
          color: rgba(140, 104, 38, 0.08);
        }

        .seller-banner-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 3rem;
        }

        .seller-text-wrap {
          max-width: 680px;
        }

        .seller-eyebrow-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 0.75rem;
        }

        .seller-eyebrow {
          font-size: 0.75rem;
          font-weight: 800;
          color: #B8934A;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        [data-theme="light"] .seller-eyebrow {
          color: #8C6826;
        }

        .seller-confidential-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.7rem;
          font-weight: 800;
          color: #E5B869;
          background: rgba(184, 147, 74, 0.12);
          padding: 3px 9px;
          border-radius: 6px;
          border: 1px solid rgba(184, 147, 74, 0.3);
          letter-spacing: 0.04em;
        }

        [data-theme="light"] .seller-confidential-tag {
          color: #8C6826;
          background: rgba(184, 147, 74, 0.1);
          border-color: rgba(140, 104, 38, 0.25);
        }

        .seller-title {
          font-family: var(--font-heading);
          font-size: clamp(1.75rem, 2.6vw, 2.35rem);
          font-weight: 800;
          color: var(--text-primary, #FFFFFF);
          line-height: 1.25;
          margin: 0 0 0.85rem 0;
        }

        [data-theme="light"] .seller-title {
          color: #141210;
        }

        .seller-desc {
          font-size: 0.95rem;
          line-height: 1.65;
          color: var(--text-secondary, rgba(255, 255, 255, 0.8));
          margin: 0 0 1.75rem 0;
        }

        [data-theme="light"] .seller-desc {
          color: #475569;
        }

        .seller-stats-strip {
          display: flex;
          align-items: center;
          gap: 1.75rem;
        }

        .seller-stat-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-val {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: #E5B869;
        }

        [data-theme="light"] .stat-val {
          color: #8C6826;
        }

        .stat-lbl {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        [data-theme="light"] .stat-lbl {
          color: #64748B;
        }

        .seller-stat-sep {
          width: 1px;
          height: 34px;
          background: rgba(184, 147, 74, 0.3);
        }

        [data-theme="light"] .seller-stat-sep {
          background: rgba(140, 104, 38, 0.25);
        }

        .seller-cta-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
        }

        .seller-cta-btn {
          white-space: nowrap;
          padding: 14px 28px;
          font-size: 0.9375rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 10px;
          background: linear-gradient(135deg, #E5B869 0%, #B8934A 100%);
          color: #0B0C10;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 20px rgba(184, 147, 74, 0.35);
        }

        .seller-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(184, 147, 74, 0.5);
        }

        .seller-outline-btn {
          white-space: nowrap;
          padding: 13px 24px;
          font-size: 0.9375rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: all var(--transition-fast);
        }

        [data-theme="light"] .seller-outline-btn {
          background: rgba(255, 255, 255, 0.65);
          border-color: rgba(30, 24, 16, 0.15);
          color: #141210;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        }

        .seller-outline-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: #B8934A;
          color: #E5B869;
        }

        [data-theme="light"] .seller-outline-btn:hover {
          background: #FFFFFF;
          color: #8C6826;
          border-color: rgba(140, 104, 38, 0.4);
        }

        @media (max-width: 960px) {
          .seller-consignment-banner {
            padding: 2.5rem 1.75rem;
          }
          .seller-banner-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 2rem;
          }
          .seller-cta-group {
            width: 100%;
          }
          .seller-cta-btn, .seller-outline-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .seller-consignment-banner {
            padding: 1.75rem 1.25rem;
            border-radius: 20px;
          }
          .banner-watermark-scale {
            opacity: 0.25;
            right: -60px;
            bottom: -60px;
          }
          .seller-eyebrow-row {
            flex-wrap: wrap;
            gap: 8px;
          }
          .seller-title {
            font-size: 1.5rem;
          }
          .seller-desc {
            font-size: 0.875rem;
            margin-bottom: 1.25rem;
          }
          .seller-stats-strip {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
            width: 100%;
            text-align: center;
          }
          .seller-stat-item {
            align-items: center;
          }
          .seller-stat-sep {
            display: none;
          }
          .stat-val {
            font-size: 1.05rem;
          }
          .stat-lbl {
            font-size: 0.65rem;
          }
        }
      `}</style>
    </div>
  );
};
