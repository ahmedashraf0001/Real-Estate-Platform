'use client';
import React from 'react';
import { QuickSearchBar } from '@/components/QuickSearchBar';
import { StatsSection } from '@/components/home/StatsSection';
import { PropertyCard } from '@/components/property/PropertyCard';
import { MapSection } from '@/components/map/MapSection';
import { WhyUsSection } from '@/components/home/WhyUsSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';
import { adaptProperties } from '@/lib/utils/propertyAdapter';
import { Property } from '@/types';
import { ArrowRight, Sparkles } from 'lucide-react';
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
  const featuredProperties = allProps.filter((p) => p.featured || p.is_featured).slice(0, 6);

  // Destination filter state for Featured Masterpieces
  const [activeDestination, setActiveDestination] = React.useState<'all' | 'new-cairo' | 'sahel' | 'gouna' | 'zayed'>('all');

  const destinationFilters: { id: 'all' | 'new-cairo' | 'sahel' | 'gouna' | 'zayed'; label: string }[] = [
    { id: 'all', label: 'All Properties' },
    { id: 'new-cairo', label: 'New Cairo' },
    { id: 'sahel', label: 'North Coast (Sahel)' },
    { id: 'gouna', label: 'El Gouna & Red Sea' },
    { id: 'zayed', label: 'Sheikh Zayed' },
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

  // Typewriter state for Hero Title
  const [charCount, setCharCount] = React.useState(0);
  const [isDoneTyping, setIsDoneTyping] = React.useState(false);

  const line1WhiteText = "Discover Egypt's "; // includes natural space
  const line1GoldText = "Finest";
  const line2Text = "Luxury Properties";
  const line1WhiteLen = line1WhiteText.length;
  const line1GoldLen = line1GoldText.length;
  const line1Total = line1WhiteLen + line1GoldLen;
  const totalChars = line1Total + line2Text.length;

  React.useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setCharCount(current);
      if (current >= totalChars) {
        clearInterval(interval);
        setTimeout(() => setIsDoneTyping(true), 1400);
      }
    }, 45); // 45ms natural typewriter cadence

    return () => clearInterval(interval);
  }, [totalChars]);

  const display1A = line1WhiteText.slice(0, Math.min(charCount, line1WhiteLen));
  const display1B = charCount > line1WhiteLen 
    ? line1GoldText.slice(0, Math.min(charCount - line1WhiteLen, line1GoldLen))
    : '';
  const display2 = charCount > line1Total
    ? line2Text.slice(0, charCount - line1Total)
    : '';

  const showCursorOnLine1 = charCount <= line1Total && !isDoneTyping;
  const showCursorOnLine2 = charCount > line1Total && !isDoneTyping;

  return (
    <div className="home-view">
      {/* 1. Full Viewport Hero Section with Modern Bottom Gradient Transition */}
      <section className="hero-section">
        <div className="hero-bg-media">
          <img 
            src="/assets/hero-bg.webp" 
            alt="Egyptian Luxury Architectural Masterpiece" 
            className="hero-image"
            loading="eager"
          />
          {/* Cinematic Dimming / Vignette Layer */}
          <div className="hero-dim-overlay" />
          {/* Smooth Bottom Dissolve */}
          <div className="hero-bottom-fade" />
        </div>

        <div className="container hero-container">
          <div className="hero-content">
            <motion.h1 
              className="hero-title"
              aria-label="Discover Egypt's Finest Luxury Properties"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="hero-title-line line-1">
                <span className="masked-text-white">{display1A}</span>
                {display1B && <span className="masked-text-gold">{display1B}</span>}
                {showCursorOnLine1 && <span className="typewriter-cursor">|</span>}
              </span>
              <span className="hero-title-line line-2">
                {display2 && <span className="masked-text-gradient">{display2}</span>}
                {showCursorOnLine2 && <span className="typewriter-cursor">|</span>}
              </span>
            </motion.h1>

            <motion.p 
              className="hero-subtitle"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              We curate stunning design-led real estate estates that merge classical majesty with avant-garde modern luxury.
            </motion.p>
          </div>

          {/* Floating Frosted Glass Search Bar */}
          <motion.div 
            className="hero-search-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 100, delay: 0.25 }}
          >
            <QuickSearchBar onSearch={(filters) => onNavigateToCatalog(filters)} />
          </motion.div>
        </div>
      </section>

      {/* 2. Authority & Stats Section */}
      <StatsSection />

      {/* 3. Featured Masterpieces Section */}
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
              <span className="eyebrow">CURATED SELECTION</span>
              <h2 className="section-title">Featured Properties</h2>
            </div>
            <button 
              className="explore-catalog-btn"
              onClick={() => onNavigateToCatalog()}
            >
              <span>Browse All Properties</span>
              <ArrowRight size={16} />
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PropertyCard
                    property={property}
                    index={idx}
                    onSelect={onSelectProperty}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* 4. Interactive Real Cartography Map */}
      <MapSection onOpenMapModal={onOpenMapModal} properties={allProps} />

      {/* 5. Why Masr Properties */}
      <WhyUsSection />

      {/* 6. Testimonials & Pre-Footer Banner */}
      <TestimonialsSection onOpenListEstate={onOpenListEstate} />

      <style>{`
        .home-view {
          min-height: 100vh;
          background: var(--bg-primary);
          overflow-x: clip;
          transition: background var(--transition-smooth);
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: flex-end;
          padding-top: 110px;
          padding-bottom: 4.5rem;
          background: transparent;
        }

        .hero-bg-media {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 1;
        }

        .hero-image {
          position: absolute;
          top: -20px;
          left: -20px;
          width: calc(100% + 40px);
          height: calc(100% + 40px);
          object-fit: cover;
          object-position: center top;
          filter: brightness(0.84) contrast(1.05);
          transform: scale(1.02);
          transform-origin: center top;
          animation: heroCinematicZoom 16s ease-out forwards;
          will-change: transform;
        }

        @keyframes heroCinematicZoom {
          0% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1.08);
          }
        }

        /* Cinematic Dimming & Vignette Layer */
        .hero-dim-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 2;
        }

        [data-theme="dark"] .hero-dim-overlay {
          background: 
            radial-gradient(
              ellipse at 55% 45%,
              rgba(10, 12, 16, 0.15) 0%,
              rgba(10, 12, 16, 0.45) 60%,
              rgba(10, 12, 16, 0.75) 100%
            ),
            linear-gradient(
              to bottom,
              rgba(10, 12, 16, 0.35) 0%,
              transparent 35%,
              transparent 70%,
              rgba(10, 12, 16, 0.30) 100%
            );
        }

        [data-theme="light"] .hero-dim-overlay {
          background: 
            radial-gradient(
              ellipse at 55% 45%,
              rgba(15, 20, 30, 0.05) 0%,
              rgba(20, 24, 32, 0.16) 60%,
              rgba(20, 24, 32, 0.38) 100%
            ),
            linear-gradient(
              to bottom,
              rgba(15, 20, 30, 0.16) 0%,
              transparent 30%,
              transparent 70%,
              transparent 100%
            );
        }

        /* Seamless Progressive Feathered Bottom Dissolve */
        .hero-bottom-fade {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 340px;
          pointer-events: none;
          z-index: 3;
        }

        [data-theme="dark"] .hero-bottom-fade {
          background: linear-gradient(
            to bottom,
            rgba(10, 12, 16, 0) 0%,
            rgba(10, 12, 16, 0.015) 15%,
            rgba(10, 12, 16, 0.05) 30%,
            rgba(10, 12, 16, 0.12) 45%,
            rgba(10, 12, 16, 0.24) 60%,
            rgba(10, 12, 16, 0.42) 72%,
            rgba(10, 12, 16, 0.65) 82%,
            rgba(10, 12, 16, 0.88) 92%,
            #0A0C10 100%
          );
        }

        [data-theme="light"] .hero-bottom-fade {
          display: none;
        }

        .hero-container {
          position: relative;
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-end;
          width: 100%;
          gap: clamp(2.75rem, 5.5vh, 4.25rem);
        }

        .hero-content {
          max-width: 1100px;
          margin-bottom: 0.5rem;
        }

        .hero-title {
          font-family: var(--font-heading);
          font-size: clamp(2.65rem, 4.2vw, 3.85rem);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.025em;
          margin-bottom: 0.85rem;
          min-height: calc(2 * 1.15em);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
        }

        .hero-title-line {
          display: block;
          white-space: pre-wrap;
          word-spacing: 0.1em;
          min-height: 1.15em;
        }

        .hero-title-line.line-1 {
          white-space: nowrap;
        }

        .masked-text-white {
          color: #ffffff;
          text-shadow: 0 2px 14px rgba(0, 0, 0, 0.7);
        }

        .masked-text-gold {
          background: linear-gradient(
            135deg, 
            #FFFDF5 0%, 
            #FEE8A0 25%, 
            #FCD34D 50%, 
            var(--gold-primary, #DDA752) 80%, 
            #B8860B 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 800;
          filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 16px rgba(221, 167, 82, 0.5));
        }

        .masked-text-gradient {
          background: linear-gradient(
            135deg, 
            #FFFFFF 0%, 
            #FFFFFF 35%, 
            #E5BE7A 70%, 
            var(--gold-primary) 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.75));
        }

        .typewriter-cursor {
          display: inline-block;
          font-weight: 300;
          color: var(--gold-primary);
          margin-left: 2px;
          animation: blinkCursor 0.75s infinite ease-in-out;
          vertical-align: 0.05em;
        }

        @keyframes blinkCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .hero-subtitle {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.6;
          max-width: 540px;
          font-weight: 400;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
        }

        .hero-search-wrapper {
          width: 100%;
          position: relative;
          z-index: 5;
        }

        /* Featured Section */
        .featured-section {
          position: relative;
          background: transparent;
          padding-top: 3.5rem;
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
            rgba(221, 167, 82, 0.07) 0%,
            rgba(221, 167, 82, 0.015) 45%,
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
          margin-bottom: 2.5rem;
          gap: 1.5rem;
        }

        .section-title {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 3.2vw, 2.65rem);
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .explore-catalog-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--gold-primary);
          font-size: 0.9375rem;
          font-weight: 700;
          padding: 0.5rem 0;
          transition: all var(--transition-fast);
        }

        .explore-catalog-btn:hover {
          color: var(--gold-light);
          transform: translateX(4px);
        }

        /* Destination Filter Pills */
        .destination-pills-bar {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          flex-wrap: wrap;
          margin-bottom: 2.25rem;
        }

        .destination-pill {
          position: relative;
          padding: 0.55rem 1.25rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          border-radius: var(--radius-full);
          background: var(--bg-glass-card);
          border: 1px solid var(--border-subtle);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: all var(--transition-fast);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .destination-pill:hover {
          color: var(--text-primary);
          border-color: var(--gold-border);
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
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, #FFF4D4 0%, var(--gold-primary) 50%, var(--gold-dark) 100%);
          box-shadow: 0 4px 16px var(--gold-glow), inset 0 1px 1px rgba(255, 255, 255, 0.6);
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

        @media (max-width: 680px) {
          .hero-section {
            min-height: 600px;
            padding-top: 90px;
            padding-bottom: 1.75rem;
          }
          .hero-title {
            font-size: 2.15rem;
            min-height: auto;
          }
          .hero-title-line {
            white-space: normal;
            min-height: auto;
          }
          .featured-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .featured-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
