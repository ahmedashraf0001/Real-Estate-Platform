'use client';

import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowRight, MapPin, MessageCircle, Sparkles, Award, Building2, ShieldCheck, Star } from 'lucide-react';
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

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end start'],
  });

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={targetRef} className={styles.hero}>
      {/* Background Image Slideshow with Smooth Crossfade & Ken Burns Scale */}
      <motion.div style={{ scale: bgScale }} className={styles.bgImg}>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1.02 }}
            exit={{ opacity: 0, scale: 1 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
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
          {/* Eyebrow Pill */}
          <div className={styles.labelWrap}>
            <Sparkles size={12} className={styles.labelDot} />
            <span className={styles.labelText}>{isAr ? 'زكريا فريد للعقارات الفاخرة' : 'Zakaria Farid Real Estate'}</span>
          </div>

          {/* Headline */}
          <h1 className={styles.headline}>
            {t('headline')}
          </h1>

          {/* Sub */}
          <p className={styles.sub}>
            {t('subheadline')}
          </p>

          {/* Real-Time Smart Search Dock */}
          <div>
            <SmartSearchDock locale={locale} />
          </div>

          {/* CTA Buttons */}
          <div className={styles.actions}>
            <Link href={`/${locale}/properties`} className={styles.btnSecondary}>
              {t('cta_browse')}
              <ArrowRight size={15} strokeWidth={2} className={isAr ? styles.arrowRtl : ''} />
            </Link>
            <Link href={`/${locale}/map`} className={styles.btnSecondary} style={{ background: 'rgba(255, 255, 255, 0.15)', borderColor: 'rgba(255, 255, 255, 0.3)' }}>
              <MapPin size={15} strokeWidth={2} />
              <span>{isAr ? 'استكشف الخريطة التفاعلية' : 'Explore Interactive Map'}</span>
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className={styles.statsBar}>
          {[
            { value: '20+', label: isAr ? 'سنة خبرة وتطوير' : 'Years Mastery', icon: Award },
            { value: '150+', label: isAr ? 'وحدة تم تسليمها' : 'Estates Delivered', icon: ShieldCheck },
            { value: '0%', label: isAr ? 'عمولة وساطة' : 'Broker Commission', icon: Building2 },
            { value: '5★', label: isAr ? 'تقييم العملاء المميزين' : 'VIP Client Rating', icon: Star },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className={styles.stat}>
              <div className={styles.statIconWrap}>
                <Icon size={18} strokeWidth={1.5} />
              </div>
              <div className={styles.statMeta}>
                <span className={styles.statValue}>{value}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
