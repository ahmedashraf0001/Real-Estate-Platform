'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import PropertyCard from '@/components/property/PropertyCard';
import type { Property } from '@/lib/supabase/types';
import styles from './FeaturedProperties.module.css';

interface FeaturedPropertiesProps {
  properties: Property[];
  locale: string;
}

const CATEGORIES = [
  { id: 'all',       label_en: 'All Properties',   label_ar: 'جميع العقارات'    },
  { id: 'villa',     label_en: 'Villas',            label_ar: 'فيلات'             },
  { id: 'apartment', label_en: 'Apartments',        label_ar: 'شقق فاخرة'        },
  { id: 'townhouse', label_en: 'Townhouses',        label_ar: 'تاون هاوس'        },
  { id: 'chalet',    label_en: 'Coastal Chalets',   label_ar: 'شاليهات ساحلية'   },
];

/* Stagger container */
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

/* Each card animates in from bottom with slight blur */
const cardVariants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(4px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)',
    transition: { duration: 0.5, ease: 'easeOut' as const } },
  exit:   { opacity: 0, scale: 0.94, filter: 'blur(2px)',
    transition: { duration: 0.25 } },
};

export default function FeaturedProperties({ properties, locale }: FeaturedPropertiesProps) {
  const t = useTranslations('featured');
  const isAr = locale === 'ar';
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredProperties = properties.filter((p) => {
    if (activeCategory === 'all') return true;
    return p.type.toLowerCase() === activeCategory;
  });

  return (
    <section className={styles.section}>
      <div className="container">

        {/* ── Section Header ─────────────────────── */}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55 }}
        >
          <div className={styles.headerLeft}>
            <div className={styles.labelRow}>
              <Sparkles size={13} strokeWidth={1.5} style={{ color: '#a67c33' }} />
              <span className={styles.sectionLabel}>
                {isAr ? 'معرض العقارات المباشرة' : 'Featured Luxury Listings'}
              </span>
            </div>
            <h2 className={styles.sectionTitle}>{t('title')}</h2>
          </div>

          <Link href={`/${locale}/properties`} className={styles.viewAll}>
            {t('view_all')}
            <ArrowRight size={15} strokeWidth={2} />
          </Link>
        </motion.div>

        {/* ── Filter Tabs ─────────────────────────── */}
        <motion.div
          className={styles.filterTabs}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBg"
                    className={styles.activeTabBg}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className={styles.tabText}>
                  {isAr ? cat.label_ar : cat.label_en}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Property Grid ──────────────────────── */}
        {filteredProperties.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🏡</div>
            <p>{isAr ? 'لا توجد عقارات مطابقة لهذا التصنيف حالياً.' : 'No properties match this category at the moment.'}</p>
          </div>
        ) : (
          <motion.div
            className={styles.grid}
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            layout
          >
            <AnimatePresence mode="popLayout">
              {filteredProperties.map((property) => (
                <motion.div
                  key={property.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  layout
                >
                  <PropertyCard property={property} locale={locale} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Bottom CTA ─────────────────────────── */}
        {properties.length > 0 && (
          <motion.div
            className={styles.bottomCta}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Link href={`/${locale}/properties`} className={styles.browseBtn}>
              {isAr ? 'تصفح جميع العقارات المتاحة' : 'Browse All Luxury Listings'}
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
