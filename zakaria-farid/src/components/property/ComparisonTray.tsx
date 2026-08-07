'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { X, GitCompare } from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatting';
import type { Property } from '@/lib/supabase/types';
import styles from './ComparisonTray.module.css';

interface ComparisonTrayProps {
  properties: Property[];
  locale: string;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function ComparisonTray({ properties, locale, onRemove, onClose }: ComparisonTrayProps) {
  const t = useTranslations('properties');
  const tp = useTranslations('property');

  if (properties.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.tray}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      >
        <div className="container">
          <div className={styles.inner}>
            <div className={styles.left}>
              <GitCompare size={18} strokeWidth={1.5} />
              <span className={styles.title}>{t('compare_tray_title')} ({properties.length}/3)</span>
            </div>

            <div className={styles.cards}>
              {properties.map((p) => {
                const cover = p.property_images?.[0];
                const title = locale === 'ar' ? p.title_ar : p.title_en;
                return (
                  <div key={p.id} className={styles.mini}>
                    {cover && (
                      <Image src={cover.url} alt={title} width={48} height={48} className={styles.miniImg} />
                    )}
                    <div className={styles.miniInfo}>
                      <span className={styles.miniTitle}>{title}</span>
                      <span className={styles.miniPrice}>{formatPrice(p.price_egp, locale)}</span>
                    </div>
                    <button className={styles.removeBtn} onClick={() => onRemove(p.id)}>
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className={styles.actions}>
              {properties.length >= 2 && (
                <Link
                  href={`/${locale}/properties/compare?ids=${properties.map((p) => p.id).join(',')}`}
                  className="btn btn-primary btn-sm"
                >
                  {t('compare_now')}
                </Link>
              )}
              <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(255,255,255,0.2)' }}>
                {t('close_compare')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
