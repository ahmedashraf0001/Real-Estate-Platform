'use client';

import Link from 'next/link';
import { MessageCircle, ArrowRight, Phone, ShieldCheck, Key, Sparkles, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { whatsappUrl, WHATSAPP_NUMBER } from '@/lib/utils/formatting';
import styles from './CtaBand.module.css';

export default function CtaBand({ locale }: { locale: string }) {
  const isAr = locale === 'ar';

  return (
    <section className={styles.band}>
      {/* Background texture */}
      <div className={styles.bgPattern} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <motion.div
          className={styles.content}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* Label */}
          <div className={styles.labelRow}>
            <span className={styles.labelDot} />
            <span className={styles.label}>{isAr ? 'ابدأ رحلتك العقارية' : 'Start Your Property Journey'}</span>
          </div>

          <h2 className={styles.headline}>
            {isAr ? 'هل أنت جاهز للعثور على منزل أحلامك؟' : 'Ready to Find Your Dream Home?'}
          </h2>

          <p className={styles.sub}>
            {isAr
              ? 'تواصل معنا مباشرة عبر الواتساب أو الهاتف للحصول على معاينة خاصة واستشارة معمارية مجانية مع المالك مباشرة.'
              : 'Connect directly with Zakaria Farid for private property viewings and direct owner price negotiations — 0% broker fees.'}
          </p>

          <div className={styles.actions}>
            <a
              href={whatsappUrl(WHATSAPP_NUMBER, isAr ? 'مرحباً، أنا مستعد للعثور على منزلي' : 'Hello, I am ready to find my home.')}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnWhatsapp}
            >
              <MessageCircle size={18} strokeWidth={1.5} />
              {isAr ? 'واتساب المالك المباشر' : 'Direct WhatsApp Concierge'}
            </a>
            <Link href={`/${locale}/properties`} className={styles.btnBrowse}>
              {isAr ? 'تصفح كافة العقارات' : 'Explore All Listings'}
              <ArrowRight size={16} strokeWidth={2} className={isAr ? styles.arrowRtl : ''} />
            </Link>
            <a href={`tel:${WHATSAPP_NUMBER}`} className={styles.btnCall}>
              <Phone size={16} strokeWidth={1.5} />
              {isAr ? 'اتصال مباشر' : 'Direct Call'}
            </a>
          </div>
        </motion.div>

        {/* Revamped Luxury Guarantee Concierge Card */}
        <motion.div
          className={styles.deco}
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, delay: 0.15, ease: 'easeOut' }}
        >
          <div className={styles.luxuryCard}>
            <div className={styles.cardHeader}>
              <div className={styles.statusPill}>
                <span className={styles.statusDot} />
                <span>{isAr ? 'متاح للاستشارة الفورية' : 'Available For Inquiry'}</span>
              </div>
              <Sparkles size={16} className={styles.cardSparkle} />
            </div>

            <div className={styles.cardHero}>
              <div className={styles.ownerAvatar}>
                <span>ZF</span>
              </div>
              <div className={styles.ownerInfo}>
                <span className={styles.ownerName}>{isAr ? 'زكريا فريد' : 'Zakaria Farid'}</span>
                <span className={styles.ownerTitle}>{isAr ? 'مالك المحفظة العقارية' : 'Direct Portfolio Owner'}</span>
              </div>
            </div>

            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <Key size={16} />
                </div>
                <div className={styles.featureText}>
                  <strong>{isAr ? '٠٪ عمولات وساطة' : '0% Broker Fees'}</strong>
                  <span>{isAr ? 'تعامل مباشر وحقيقي' : 'Pure direct owner pricing'}</span>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <ShieldCheck size={16} />
                </div>
                <div className={styles.featureText}>
                  <strong>{isAr ? 'عقود موثقة ومسجلة' : 'Verified Legal Title'}</strong>
                  <span>{isAr ? 'ملكية مسجلة ونقل فوري' : 'Instant & unencumbered deed'}</span>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <Clock size={16} />
                </div>
                <div className={styles.featureText}>
                  <strong>{isAr ? 'استجابة خلال ١٥ دقيقة' : 'Under 15 Min Response'}</strong>
                  <span>{isAr ? 'دعم واستشارة سريعة' : 'Instant private viewings'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
