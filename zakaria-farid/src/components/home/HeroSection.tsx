'use client';

import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, MessageCircle, Sparkles, Award, Building2, ShieldCheck, Star, ChevronDown } from 'lucide-react';
import { whatsappUrl, WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import SmartSearchDock from '@/components/search/SmartSearchDock';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  locale: string;
}

const HERO_SLIDES = [
  { src: '/images/about-hero.png', alt: 'Ultra-Luxury Mansion' },
  { src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=85&w=1920&auto=format&fit=crop', alt: 'Modern Estate Villa with Swimming Pool' },
  { src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=85&w=1920&auto=format&fit=crop', alt: 'Grand Standalone Villa Night View' },
  { src: '/images/sunlit-hero-villa.png', alt: 'Sunlit Waterfront Estate' },
  { src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=85&w=1920&auto=format&fit=crop', alt: 'Modern Interior Living Space' },
  { src: '/images/about-interior.png', alt: 'Luxury Master Suite Lounge' },
];

export default function HeroSection({ locale }: HeroSectionProps) {
  const t = useTranslations('hero');
  const isAr = locale === 'ar';
  const targetRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [spotlightIdx, setSpotlightIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end start'],
  });

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section ref={targetRef} className={styles.hero}>
      {/* Background Image Slideshow */}
      <motion.div style={{ scale: bgScale }} className={styles.bgImg}>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1.01 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Image
              src={HERO_SLIDES[activeSlide].src}
              alt={HERO_SLIDES[activeSlide].alt}
              fill
              priority={activeSlide === 0}
              sizes="100vw"
              className={styles.bgImgFile}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <div className={styles.overlay} />

      {/* Content */}
      <motion.div style={{ y: contentY, opacity }} className={`container ${styles.content}`}>
        <div className={styles.inner}>
          {/* Rotating Decorative Circle Element */}
          <div className={styles.rotatingBadgeWrap}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              className={styles.rotatingBadge}
            >
              <svg viewBox="0 0 100 100" width="80" height="80">
                <path
                  id="circlePath"
                  d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                  fill="none"
                />
                <text fill="#AC8054" fontSize="9.5" fontWeight="700" letterSpacing="1.8">
                  <textPath href="#circlePath">
                    {isAr ? '• زكريا فريد للعقارات الفاخرة • التميز' : '• ZAKARIA FARID • REAL ESTATE • ART'}
                  </textPath>
                </text>
              </svg>
            </motion.div>
          </div>

          {/* Headline */}
          <h1 className={styles.headline}>
            {isAr ? (
              <>
                الفخامة في <span className={styles.camelWord}>أرقى العقارات</span> المباشرة
              </>
            ) : (
              <>
                THE ART OF <span className={styles.camelWord}>LUXURY REAL ESTATE</span>
              </>
            )}
          </h1>

          {/* Subheadline */}
          <p className={styles.sub}>
            {t('subheadline')}
          </p>

          {/* Search Dock sitting below fold */}
          <div className={styles.searchDockWrap}>
            <SmartSearchDock locale={locale} />
          </div>
        </div>

        {/* Floating Spotlight Card (Bottom Right) */}
        <div className={styles.spotlightCard}>
          <div className={styles.spotlightImgWrap}>
            <Image
              src={HERO_SLIDES[spotlightIdx].src}
              alt="Featured Spotlight"
              fill
              style={{ objectFit: 'cover' }}
            />
          </div>
          <div className={styles.spotlightMeta}>
            <span className={styles.spotlightBadge}>{isAr ? 'مشروع مميز' : 'FEATURED ESTATE'}</span>
            <p className={styles.spotlightTitle}>
              {isAr ? 'فيلا مائية فاخرة بالشيخ زايد' : 'Waterfront Villa · Sheikh Zayed'}
            </p>
          </div>
          <div className={styles.spotlightNav}>
            <button
              onClick={() => setSpotlightIdx((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              className={styles.spotlightArrow}
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              onClick={() => setSpotlightIdx((prev) => (prev + 1) % HERO_SLIDES.length)}
              className={styles.spotlightArrow}
              aria-label="Next"
            >
              ›
            </button>
          </div>
        </div>
      </motion.div>

      {/* Line-Art Animated Scroll Chevron */}
      <motion.button
        type="button"
        aria-label="Scroll Down"
        className={styles.scrollDownBtn}
        onClick={() => {
          const el = document.getElementById('brand-about-section') || document.getElementById('trust-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' });
          }
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{
          y: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
          opacity: { duration: 0.8 },
        }}
      >
        <span className={styles.scrollText}>{isAr ? 'اسحب للأسفل' : 'SCROLL DOWN'}</span>
        <ChevronDown size={16} className={styles.scrollIcon} />
      </motion.button>
    </section>
  );
}
