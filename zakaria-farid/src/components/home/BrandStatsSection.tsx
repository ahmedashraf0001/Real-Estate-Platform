'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import SectionEyebrow from '@/components/common/SectionEyebrow';
import styles from './BrandStatsSection.module.css';

interface BrandStatsSectionProps {
  locale: string;
}

export default function BrandStatsSection({ locale }: BrandStatsSectionProps) {
  const isAr = locale === 'ar';

  const stats = [
    {
      value: '0%',
      label: isAr ? 'عمولة سمسرة ووساطة' : 'BROKER COMMISSION',
      desc: isAr ? 'تعاقد مباشر من المالك وبأعلى قدر من الشفافية' : 'Direct developer contract with 100% legal title',
      highlighted: true,
    },
    {
      value: '20+',
      label: isAr ? 'عاماً من الخبرة والتطوير' : 'YEARS MASTERY',
      desc: isAr ? 'خبرة معماريّة ممتدة في بناء الفيلات والمجمعات' : 'Decades of structural engineering & architectural excellence',
      highlighted: false,
    },
    {
      value: '150+',
      label: isAr ? 'وحدة سكنية وتجارية مسلمة' : 'ESTATES DELIVERED',
      desc: isAr ? 'تسليم في المواعيد المحددة بمواصفات قياسية' : 'On-time delivery with rigorous quality assurances',
      highlighted: false,
    },
    {
      value: '100%',
      label: isAr ? 'تسجيل بالشهر العقاري' : 'LEGAL VERIFICATION',
      desc: isAr ? 'عقود موثقة رسمياً وضمان حقوق الملكية' : 'Full registration and official title guarantees',
      highlighted: false,
    },
  ];

  return (
    <section id="trust-section" className={styles.section}>
      <div className="container">
        {/* Section Header */}
        <div className={styles.header}>
          <SectionEyebrow>{isAr ? 'الركائز الإستراتيجية' : 'PERFORMANCE & GUARANTEES'}</SectionEyebrow>
          <h2 className={styles.title}>
            {isAr ? 'أرقام تتحدث عن ريادتنا في السوق العقاري' : 'NUMBERS THAT DEFINE OUR ARCHITECTURAL LEGACY'}
          </h2>
        </div>

        {/* 4-Card Horizontal Stat Row */}
        <div className={styles.statsRow}>
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`${styles.statCard} ${stat.highlighted ? styles.cardHighlight : styles.cardDark}`}
            >
              <span className={styles.statVal}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
              <p className={styles.statDesc}>{stat.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Full-Bleed Manifesto Slide */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className={styles.manifestoBox}
        >
          <div className={styles.manifestoBg}>
            <Image
              src="/images/about-hero.png"
              alt="Architecture Manifesto"
              fill
              style={{ objectFit: 'cover', filter: 'brightness(0.4)' }}
            />
          </div>
          <div className={styles.manifestoContent}>
            <div className={styles.manifestoLeft}>
              <span className={styles.manifestoBadge}>{isAr ? 'بيان الفلسفة المعمارية' : 'MANIFESTO'}</span>
              <h3 className={styles.manifestoQuote}>
                {isAr
                  ? '«نحن لا نبني مجرد جدران، بل نصيغ مساحات حيوية فاخرة تعكس ذوق ساكنيها وتضمن استثماراً مستداماً»'
                  : '“We do not construct static structures; we curate timeless living environments built on uncompromising luxury and enduring investment value.”'}
              </h3>
            </div>
            <div className={styles.manifestoRight}>
              <p className={styles.manifestoText}>
                {isAr
                  ? 'كل مشروع يحمل توقيع زكريا فريد يخضع لأعلى معايير الدقة المعمارية والتنفيذ، مع ضمان التعاقد المباشر.'
                  : 'Every estate bearing the Zakaria Farid mark undergoes meticulous architectural review, direct owner contracting, and turnkey execution.'}
              </p>
              <Link href={`/${locale}/about`} className="btn btn-ghost">
                {isAr ? 'اعرف المزيد عن رؤيتنا' : 'Learn More About Us'} →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
