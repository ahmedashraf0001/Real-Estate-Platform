'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Compass, ArrowRight, MapPin, Building2, Layers, Sparkles, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';
import styles from './MapPreview.module.css';
import type { Property } from '@/lib/supabase/types';

const MiniMap = dynamic(() => import('@/components/map/MiniMap'), {
  ssr: false,
  loading: () => <div className={styles.mapPlaceholder} />
});

const REGIONS = [
  { id: 'all',          en: 'Greater Cairo & Coast', ar: 'القاهرة والساحل',      center: [30.2, 30.5] as [number, number], zoom: 9 },
  { id: 'zayed',        en: 'Sheikh Zayed',          ar: 'الشيخ زايد',           center: [30.044, 30.983] as [number, number], zoom: 13 },
  { id: 'new_cairo',    en: 'New Cairo',             ar: 'القاهرة الجديدة',       center: [30.03, 31.47] as [number, number], zoom: 13 },
  { id: 'north_coast',  en: 'North Coast',           ar: 'الساحل الشمالي',       center: [31.02, 28.52] as [number, number], zoom: 11 },
];

export default function MapPreview({ locale, properties = [] }: { locale: string; properties?: Property[] }) {
  const isAr = locale === 'ar';
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0]);

  const getRegionCount = (regId: string) => {
    if (regId === 'all') return properties.length;
    return properties.filter((p) => {
      const loc = (p.location || '').toLowerCase();
      if (regId === 'zayed') return loc.includes('zayed') || loc.includes('beverly') || loc.includes('westown');
      if (regId === 'new_cairo') return loc.includes('cairo') || loc.includes('fifth');
      if (regId === 'north_coast') return loc.includes('north') || loc.includes('sidi');
      return false;
    }).length;
  };

  return (
    <section className={styles.section} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="container">
        <motion.div
          className={styles.cardContainer}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
        >
          {/* Left Column: Explorer Content & Region Selector */}
          <div className={styles.textCol}>
            <div className={styles.badgeLive}>
              <span className={styles.dotPulse} />
              <span>{isAr ? 'خريطة GIS الجغرافية المباشرة' : 'Live Interactive GIS Map'}</span>
            </div>

            <h2 className={styles.title}>
              {isAr ? 'استكشف مواضع فيلاتنا وعقاراتنا الاستثنائية' : 'Locate Signature Estates Across Egypt'}
            </h2>

            <p className={styles.subtitle}>
              {isAr
                ? 'خريطة تفاعلية دقيقة تمكنك من تحديد الفيلات الفاخرة، البنتهاوس، والمنتجعات الشاطئية في أبرز المجتمعات العمرانية الراقية.'
                : 'Interactive spatial map enabling you to pinpoint luxury villas, penthouses, and coastal retreats across Egypt’s most exclusive enclaves.'}
            </p>

            {/* Interactive Region Quick Pills */}
            <div className={styles.regionFilterWrap}>
              <span className={styles.regionFilterLabel}>
                <Navigation size={13} style={{ color: '#C9A96A' }} />
                <span>{isAr ? 'تصفح حسب المنطقة:' : 'Quick Focus Region:'}</span>
              </span>
              <div className={styles.regionPillGrid}>
                {REGIONS.map((reg) => {
                  const isActive = selectedRegion.id === reg.id;
                  const count = getRegionCount(reg.id);
                  return (
                    <button
                      key={reg.id}
                      type="button"
                      className={`${styles.regionPill} ${isActive ? styles.regionPillActive : ''}`}
                      onClick={() => setSelectedRegion(reg)}
                    >
                      <MapPin size={12} />
                      <span>{isAr ? reg.ar : reg.en} {count > 0 ? `(${count})` : ''}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Link href={`/${locale}/map`} className={styles.exploreBtn}>
              <Compass size={18} />
              <span>{isAr ? 'فتح الخريطة التفاعلية الشاملة' : 'Explore Full Interactive Map'}</span>
              <ArrowRight size={16} className={isAr ? styles.arrowRtl : ''} />
            </Link>
          </div>

          {/* Right Column: Dynamic Custom Leaflet Map Frame */}
          <div className={styles.mapCol}>
            <div className={styles.mapFrame}>
              <div className={styles.mapBadgeHeader}>
                <Building2 size={13} style={{ color: '#C9A96A' }} />
                <span>{isAr ? 'عقارات مميزة محددة' : 'Signature Listings Pinned'}</span>
              </div>

              <MiniMap
                properties={properties}
                center={selectedRegion.center}
                zoom={selectedRegion.zoom}
                locale={locale}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
