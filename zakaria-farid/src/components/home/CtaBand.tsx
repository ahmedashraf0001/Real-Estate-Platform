'use client';

import Link from 'next/link';
import { MessageCircle, ArrowRight, Phone } from 'lucide-react';
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
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
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
              ? 'راسلنا الآن وسنرد عليك خلال ساعة واحدة. لا عمولات، لا وسطاء.'
              : 'Message us now and get a response within the hour. No commissions, no intermediaries.'}
          </p>

          <div className={styles.actions}>
            <a
              href={whatsappUrl(WHATSAPP_NUMBER, isAr ? 'مرحباً، أنا مستعد للعثور على منزلي' : 'Hello, I am ready to find my home.')}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnWhatsapp}
            >
              <MessageCircle size={18} strokeWidth={1.5} />
              {isAr ? 'واتساب' : 'WhatsApp Us'}
            </a>
            <Link href={`/${locale}/properties`} className={styles.btnBrowse}>
              {isAr ? 'تصفح العقارات' : 'Browse Properties'}
              <ArrowRight size={16} strokeWidth={2} className={isAr ? styles.arrowRtl : ''} />
            </Link>
            <a href={`tel:${WHATSAPP_NUMBER}`} className={styles.btnCall}>
              <Phone size={16} strokeWidth={1.5} />
              {isAr ? 'اتصل بنا' : 'Call Now'}
            </a>
          </div>
        </motion.div>

        {/* Decorative image side */}
        <motion.div
          className={styles.deco}
          initial={{ opacity: 0, x: isAr ? -30 : 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, delay: 0.15, ease: 'easeOut' }}
          aria-hidden="true"
        >
          <div className={styles.decoCard}>
            <div className={styles.decoStat}>
              <span className={styles.decoNum}>200+</span>
              <span className={styles.decoStatLabel}>{isAr ? 'وحدة مباعة' : 'Units Sold'}</span>
            </div>
            <div className={styles.decoStat}>
              <span className={styles.decoNum}>0%</span>
              <span className={styles.decoStatLabel}>{isAr ? 'عمولة' : 'Commission'}</span>
            </div>
            <div className={styles.decoStat}>
              <span className={styles.decoNum}>15+</span>
              <span className={styles.decoStatLabel}>{isAr ? 'سنة خبرة' : 'Years'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
