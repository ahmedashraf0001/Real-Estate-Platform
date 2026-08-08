'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, MapPin, MessageCircle, Sparkles, Award, Building2, ShieldCheck, Star } from 'lucide-react';
import { whatsappUrl, WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import SmartSearchDock from '@/components/search/SmartSearchDock';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  locale: string;
}

export default function HeroSection({ locale }: HeroSectionProps) {
  const t = useTranslations('hero');
  const isAr = locale === 'ar';
  const targetRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end start'],
  });

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const tickerItems = isAr
    ? [
        'الشيخ زايد',
        'القاهرة الجديدة (التجمع الخامس)',
        '٠٪ عمولات وساطة',
        'من المالك مباشرة',
        'سيدي عبد الرحمن (الساحل الشمالي)',
        'بيفرلي هيلز ويست تاون',
        'فيلات وشاليهات فاخرة',
        'عقود موثقة ومسجلة',
      ]
    : [
        'SHEIKH ZAYED',
        'NEW CAIRO (5TH SETTLEMENT)',
        '0% BROKER COMMISSION',
        'DIRECT FROM OWNER',
        'NORTH COAST SIDI ABDEL RAHMAN',
        'BEVERLY HILLS & WESTOWN',
        'LUXURY VILLAS & CHALETS',
        'VERIFIED LEGAL TITLES',
      ];

  return (
    <section ref={targetRef} className={styles.hero}>
      {/* Background Image with Parallax & Dark Overlay */}
      <motion.div style={{ scale: bgScale }} className={styles.bgImg}>
        <Image
          src="/images/about-hero.png"
          alt="Zakaria Farid Luxury Estates"
          fill
          priority
          sizes="100vw"
          className={styles.bgImgFile}
        />
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
            { value: '20+', label: isAr ? 'سنة خبرة واستثمار' : 'Years Mastery', icon: Award },
            { value: '150+', label: isAr ? 'وحدة تم تسليمها' : 'Estates Delivered', icon: Building2 },
            { value: '0%', label: isAr ? 'عمولة وساطة' : 'Broker Commission', icon: ShieldCheck },
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

      {/* React Bits Infinite Scrolling Marquee Ticker */}
      <div className={styles.tickerWrap}>
        <div className={styles.tickerTrack}>
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={idx} className={styles.tickerItem}>
              <Sparkles size={12} className={styles.tickerStar} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
