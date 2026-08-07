'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Heart, Bed, Bath, Maximize2, MapPin, GitCompare, Paintbrush, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { formatPrice, formatNumber } from '@/lib/utils/formatting';
import type { Property } from '@/lib/supabase/types';
import styles from './PropertyCard.module.css';

interface PropertyCardProps {
  property: Property;
  locale: string;
  onCompare?: (property: Property) => void;
  isInCompare?: boolean;
  viewMode?: 'grid' | 'list';
}

const LOCATION_TRANSLATIONS: Record<string, string> = {
  'Sheikh Zayed': 'الشيخ زايد',
  'New Cairo': 'القاهرة الجديدة',
  'Fifth Settlement': 'التجمع الخامس',
  'Beverly Hills': 'بيفرلي هيلز',
  'North Coast': 'الساحل الشمالي',
  'Sidi Abdel Rahman': 'سيدي عبد الرحمن',
  '6th of October': '٦ أكتوبر',
};


export default function PropertyCard({ property, locale, onCompare, isInCompare, viewMode = 'grid' }: PropertyCardProps) {
  const t = useTranslations('properties');
  const tp = useTranslations('property');
  const [saved, setSaved] = useState(false);
  const isAr = locale === 'ar';

  const title = isAr ? property.title_ar : property.title_en;
  const coverImage = property.property_images?.[0];
  const imgSrc = coverImage?.url ?? '/placeholder-property.png';
  const imgAlt = isAr
    ? (coverImage?.alt_text_ar ?? `${title} — صورة`)
    : (coverImage?.alt_text_en ?? `${title} — photo`);

  const statusLabel: Record<string, string> = {
    active: isAr ? 'من المالك مباشرة' : 'Direct Owner',
    under_offer: t('status_under_offer'),
    sold: t('status_sold'),
  };

  const typeLabel: Record<string, string> = {
    villa: t('type_villa'),
    apartment: t('type_apartment'),
    townhouse: t('type_townhouse'),
    duplex: t('type_duplex'),
    chalet: t('type_chalet'),
  };

  // Format Location cleanly with Arabic comma instead of dots
  let displayLocation = property.location;
  if (isAr) {
    displayLocation = displayLocation.replace(/\./g, '،').replace(/,/g, '،');
    Object.entries(LOCATION_TRANSLATIONS).forEach(([en, ar]) => {
      displayLocation = displayLocation.replace(new RegExp(en, 'gi'), ar);
    });
  }

  // Exact Labels without slice bugs
  const bedLabel = isAr ? 'غرف' : (property.bedrooms === 1 ? 'Bed' : 'Beds');
  const bathLabel = isAr ? 'حمام' : (property.bathrooms === 1 ? 'Bath' : 'Baths');
  const areaLabel = isAr ? 'م²' : 'sqm';



  const isList = viewMode === 'list';

  return (
    <motion.div
      className={`${styles.card} ${isList ? styles.cardList : ''}`}
      whileHover={{ y: isList ? -2 : -6 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Image Wrapper ────────────────────────────── */}
      <Link href={`/${locale}/properties/${property.slug}`} className={`${styles.imgWrapper} ${isList ? styles.imgWrapperList : ''}`}>
        <Image
          src={imgSrc}
          alt={imgAlt}
          fill
          className={styles.img}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Soft top gradient for badges */}
        <div className={styles.imgGradientTop} />

        {/* Top Header Row */}
        <div className={styles.badgeTopRow}>
          <div className={styles.topBadgesGroup}>
            <div className={styles.statusBadge}>
              <ShieldCheck size={12} className={styles.statusIcon} />
              <span>{statusLabel[property.listing_status]}</span>
            </div>
            <span className={styles.typeTag}>{typeLabel[property.type]}</span>
          </div>

          <button
            className={`${styles.saveBtn} ${saved ? styles.saveBtnActive : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSaved(!saved);
            }}
            aria-label={saved ? tp('unfavorite') : tp('favorite')}
          >
            <Heart size={14} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </Link>

      {/* ── Card Body ─────────────────────────────── */}
      <div className={styles.body}>
        <div className={styles.bodyTop}>
          <div className={styles.locationRow}>
            <MapPin size={13} className={styles.pinIcon} />
            <span>{displayLocation}</span>
          </div>

          <Link href={`/${locale}/properties/${property.slug}`} className={styles.title}>
            {title}
          </Link>
        </div>

        {/* Specs Bar */}
        <div className={styles.specsBar}>
          <div className={styles.specItem}>
            <Bed size={14} className={styles.specIcon} />
            <span className={styles.specText}>{property.bedrooms} {bedLabel}</span>
          </div>

          <div className={styles.specDivider} />

          <div className={styles.specItem}>
            <Bath size={14} className={styles.specIcon} />
            <span className={styles.specText}>{property.bathrooms} {bathLabel}</span>
          </div>

          <div className={styles.specDivider} />

          <div className={styles.specItem}>
            <Maximize2 size={14} className={styles.specIcon} />
            <span className={styles.specText}>{formatNumber(property.area_sqm, locale)} {areaLabel}</span>
          </div>

        </div>

        {/* Card Footer */}
        <div className={styles.footer}>
          <div className={styles.priceBlock}>
            <span className={styles.priceLabel}>{isAr ? 'السعر المطلوب' : 'Price'}</span>
            <span className={styles.priceValue}>
              {formatPrice(property.price_egp, locale)}
            </span>
          </div>

          <div className={styles.footerActions}>
            {onCompare && (
              <button
                className={`${styles.compareBtn} ${isInCompare ? styles.compareBtnActive : ''}`}
                onClick={() => onCompare(property)}
                aria-label={isInCompare ? (isAr ? 'إزالة من المقارنة' : 'Remove from compare') : (isAr ? 'إضافة للمقارنة' : 'Add to compare')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="6" cy="6" r="3" />
                  <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                  <path d="M11 18H8a2 2 0 0 1-2-2V9" />
                </svg>
              </button>
            )}

            <Link href={`/${locale}/properties/${property.slug}`} className={styles.detailsBtn}>
              <span>{isAr ? 'التفاصيل' : 'Details'}</span>
              {isAr ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
