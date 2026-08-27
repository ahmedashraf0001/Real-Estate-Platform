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
import { ArrowRight, ArrowUpRight, ShieldCheck, Building2, Scale, Compass, Sparkles } from 'lucide-react';
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

  // Destination filter state for Featured Masterpieces
  const [activeDestination, setActiveDestination] = React.useState<'all' | 'new-cairo' | 'sahel' | 'gouna' | 'zayed'>('all');

  const destinationFilters: { id: 'all' | 'new-cairo' | 'sahel' | 'gouna' | 'zayed'; label: string }[] = [
    { id: 'all', label: isAr ? 'جميع العقارات' : 'All Masterpieces' },
    { id: 'new-cairo', label: isAr ? 'القاهرة الجديدة' : 'New Cairo' },
    { id: 'sahel', label: isAr ? 'الساحل الشمالي' : 'North Coast (Sahel)' },
    { id: 'gouna', label: isAr ? 'الجونة والبحر الأحمر' : 'El Gouna & Red Sea' },
    { id: 'zayed', label: isAr ? 'الشيخ زايد' : 'Sheikh Zayed' },
  ];

  const filteredFeaturedProperties = featuredProperties.filter((property) => {
    if (activeDestination === 'all') return true;
    const loc = (property.location || '').toLowerCase();
    const dist = (property.district || '').toLowerCase();
    if (activeDestination === 'new-cairo') return dist.includes('new cairo') || dist.includes('madinaty') || loc.includes('new cairo') || loc.includes('madinaty');
    if (activeDestination === 'sahel') return dist.includes('north coast') || loc.includes('north coast') || loc.includes('sahel');
    if (activeDestination === 'gouna') return dist.includes('gouna') || dist.includes('sokhna') || loc.includes('gouna') || loc.includes('sokhna') || loc.includes('red sea');
    if (activeDestination === 'zayed') return dist.includes('sheikh zayed') || dist.includes('zayed') || loc.includes('sheikh zayed') || loc.includes('zayed');
    return true;
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
    ? (isAr ? 'أندر الصروح المعمارية' : "Egypt's Premier Residences")
    : (isAr ? 'استكشف أندر الصروح المعمارية و' : "Discover Egypt's Premier Residences &");
  const line2Text = isMobileViewport
    ? (isAr ? 'والقصور الفاخرة في مصر' : '& Sovereign Estates')
    : (isAr ? 'القصور الفاخرة في مصر' : 'Luxury Living & Sovereign Estates');

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
    }, 38);

    return () => clearInterval(interval);
  }, [totalChars, locale]);

  const display1 = line1Text.slice(0, Math.min(charCount, line1Len));
  const display2 = charCount > line1Len
    ? line2Text.slice(0, charCount - line1Len)
    : '';

  const showCursorOnLine1 = charCount <= line1Len && !isDoneTyping;
  const showCursorOnLine2 = charCount > line1Len && !isDoneTyping;

  return (
    <div className="home-view" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── 1. Full-Bleed Viewport Cinematic Hero ─── */}
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
            {/* Monumental Headline with Living Typewriter Animation */}
            <motion.h1 
              className="hero-title"
              aria-label={isAr ? 'استكشف أندر الصروح المعمارية و القصور الفاخرة في مصر' : "Discover Egypt's Premier Residences & Luxury Living & Sovereign Estates"}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="hero-title-main">
                <span>{display1}</span>
                {showCursorOnLine1 && <span className="typewriter-cursor">|</span>}
              </span>
              <span className="hero-title-serif">
                {display2 && <span>{display2}</span>}
                {showCursorOnLine2 && <span className="typewriter-cursor">|</span>}
              </span>
            </motion.h1>

            {/* Crisp Subtitle */}
            <motion.p 
              className="hero-subtitle"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {isMobileViewport
                ? (isAr
                    ? 'عقارات موثقة بملكية حرة وتدقيق معماري صارم.'
                    : 'Verified freehold estates with forensic architectural audits.')
                : (isAr
                    ? 'ننتقي ونمثل أندر العقارات والقصور الفاخرة التي تجمع بين الهيبة المعمارية، التدقيق الإنشائي الصارم، وسندات الملكية الحرة الموثقة.'
                    : 'Curating and representing architecturally significant residences, coastal sanctuaries, and prime estates with forensic CAD audits and freehold ownership assurance.')}
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

      {/* ─── 2. Authority & Metrology Ribbon (Directly Below Hero Fold) ─── */}
      <StatsSection locale={locale} hideHeader={true} compact={true} />

      {/* ─── 3. Featured Masterpieces Section (Primary Discovery Gallery) ─── */}
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
                <span>{isAr ? 'مجموعة منتقاة • دليل ٢٠٢٦' : 'CURATED SELECTION • 2026 DIRECTORY'}</span>
              </div>
              <h2 className="section-title">
                <span>{isAr ? 'أحدث الصروح المعمارية و ' : 'Featured Architectural '}</span>
                <span className="title-serif-accent" style={isAr ? { marginInlineStart: '0.45rem', display: 'inline-block' } : undefined}>
                  {isAr ? 'القصور الاستثنائية' : 'Masterpieces'}
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

      {/* ─── 4. Interactive Real Cartography Map Explorer ─── */}
      <MapSection onOpenMapModal={onOpenMapModal} properties={allProps} locale={locale} />

      {/* ─── 5. Unified Sovereign Advisory & Client Provenance ─── */}
      <SovereignAdvisorySection locale={locale} onOpenListEstate={onOpenListEstate} />

      {/* ─── 6. Panoramic Confidential Placement & Consignment Portal ─── */}
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
                  <span>{isAr ? 'هل ترغب في بيع أو تمثيل ' : 'Looking to List or Consign Your '}</span>
                  <span className="title-serif-accent">{isAr ? 'قصرك واستثمارك؟' : 'Generational Estate?'}</span>
                </h2>
                
                <p className="seller-desc">
                  {isAr 
                    ? 'اعرض عقارك عبر مكتب زكريا فريد وتواصل مباشرة مع نخبة المشترين والمستثمرين والمكاتب العائلية الباحثة عن الأصول النادرة بأعلى درجات السرية.'
                    : 'Entrust your architectural statement to our private placement practice. Reach verified buyers, family offices, and sovereign wealth trustees actively seeking rare trophy assets.'}
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
          line-height: 1.18;
          letter-spacing: -0.025em;
          margin: 0 0 1.25rem 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: calc(2.2 * 1.18em);
        }

        .hero-title-main {
          color: #FFFFFF;
          text-shadow: 0 2px 18px rgba(0, 0, 0, 0.85);
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
        }

        .hero-title-serif {
          font-family: Georgia, var(--font-heading), serif;
          font-weight: 400;
          font-style: italic;
          background: linear-gradient(135deg, #FFFDF5 0%, #FEE8A0 30%, #E5B869 65%, #B8934A 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 2px 14px rgba(0, 0, 0, 0.9));
          white-space: nowrap;
          min-height: 1.18em;
          display: inline-flex;
          align-items: center;
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

        @media (max-width: 768px) {
          .hero-section {
            min-height: 100svh;
            padding-top: 96px;
            padding-bottom: 2rem;
            align-items: center;
          }
          .hero-container {
            gap: 1.15rem;
          }
          /* Stronger headline hierarchy on mobile */
          .hero-title {
            font-size: clamp(2.1rem, 8.5vw, 2.7rem);
            line-height: 1.16;
            letter-spacing: -0.03em;
            margin-top: 0.5rem;
            margin-bottom: 0.9rem;
          }
          .hero-title-main,
          .hero-title-serif {
            white-space: normal;
          }
          .hero-subtitle {
            font-size: 0.84rem;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.72);
            max-width: 34ch;
            margin-bottom: 0.5rem;
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
