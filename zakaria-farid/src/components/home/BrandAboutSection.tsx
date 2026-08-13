'use client';

import { motion } from 'framer-motion';
import SectionEyebrow from '@/components/common/SectionEyebrow';
import styles from './BrandAboutSection.module.css';

interface BrandAboutSectionProps {
  locale: string;
}

export default function BrandAboutSection({ locale }: BrandAboutSectionProps) {
  const isAr = locale === 'ar';

  return (
    <section id="brand-about-section" className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          {/* Left Column: Eyebrow & Headline */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={styles.colLeft}
          >
            <SectionEyebrow>{isAr ? 'عن زكريا فريد' : 'ABOUT ZAKARIA FARID'}</SectionEyebrow>
            <h2 className={styles.title}>
              {isAr
                ? 'إعادة تعريف العقارات الفاخرة بالتعاقد المباشر الشفاف'
                : 'REDEFINING ARCHITECTURAL LUXURY WITH ZERO BROKER COMMISSION'}
            </h2>
          </motion.div>

          {/* Right Column: Narrative Copy & Project Brief Grid */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className={styles.colRight}
          >
            <p className={styles.leadText}>
              {isAr
                ? 'نقدم منظومة عقارية فريدة تضمن وصول المشتري مباشرة للمالك بدون رسوم وساطة، مع الالتزام بأعلى معايير التصميم المعماري والجودة التنفيذية في أرقى أحياء مصر.'
                : 'We pioneer a direct developer-to-client estate model eliminating intermediary costs while guaranteeing signature architectural design, uncompromised structural integrity, and transparent legal title transfers across Egypt’s premier enclaves.'}
            </p>

            {/* Brief Metadata Spec List */}
            <div className={styles.briefGrid}>
              <div className={styles.briefItem}>
                <span className={styles.briefLabel}>{isAr ? 'تأسست' : 'FOUNDED'}</span>
                <span className={styles.briefVal}>2004</span>
              </div>
              <div className={styles.briefItem}>
                <span className={styles.briefLabel}>{isAr ? 'المنطقة' : 'REGION'}</span>
                <span className={styles.briefVal}>{isAr ? 'القاهرة الكبرى والساحل' : 'Greater Cairo & Coast'}</span>
              </div>
              <div className={styles.briefItem}>
                <span className={styles.briefLabel}>{isAr ? 'المشاريع المسلمة' : 'PROJECTS DELIVERED'}</span>
                <span className={styles.briefVal}>150+</span>
              </div>
              <div className={styles.briefItem}>
                <span className={styles.briefLabel}>{isAr ? 'عمولة السمسرة' : 'COMMISSION'}</span>
                <span className={styles.briefVal}>{isAr ? '٠٪ مباشر' : '0% Direct'}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
