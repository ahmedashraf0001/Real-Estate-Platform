'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { HandshakeIcon, MapPin, ShieldCheck, Clock, Sparkles, CheckCircle2, ArrowRight, Banknote } from 'lucide-react';
import Link from 'next/link';
import styles from './TrustPillars.module.css';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
}

function SpotlightCard({ children, className = '' }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${styles.spotlightCard} ${className}`}
    >
      <div
        className={styles.spotlightGlow}
        style={{
          opacity,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, rgba(201, 169, 106, 0.16), transparent 45%)`,
        }}
      />
      <div className={styles.cardInner}>{children}</div>
    </div>
  );
}

export default function TrustPillars({ locale }: { locale: string }) {
  const t = useTranslations('trust');
  const isAr = locale === 'ar';

  return (
    <section className={styles.section}>
      <div className="container">
        {/* Section Header */}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className={styles.sectionBadge}>
            <Sparkles size={13} style={{ color: '#C9A96A' }} />
            <span>{isAr ? 'لماذا تختارنا' : 'Why Choose Us'}</span>
          </div>
          <h2 className={styles.sectionTitle}>
            {isAr ? 'معايير الفخامة والشفافية التامة' : 'Unmatched Excellence & Total Transparency'}
          </h2>
          <p className={styles.sectionSub}>
            {isAr
              ? 'نحدث فارقاً حقيقياً في السوق العقاري المصري — تعاقد مباشر من المالك بدون أي عمولات وساطة.'
              : 'Setting a new benchmark for Egyptian real estate — direct owner contracts with zero broker commissions.'}
          </p>
        </motion.div>

        {/* React Bits Bento Spotlight Grid (5 Cards perfectly aligned) */}
        <div className={styles.bentoGrid}>
          {/* Card 1: Featured 2-Column Hero Card */}
          <div className={styles.bentoFeaturedCol}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              style={{ height: '100%' }}
            >
              <SpotlightCard className={styles.cardFeatured}>
                <div className={styles.featuredBadge}>
                  <HandshakeIcon size={16} />
                  <span>{isAr ? '٠٪ عمولات وساطة' : '0% Brokerage Commission'}</span>
                </div>
                <h3 className={styles.featuredTitle}>
                  {isAr ? 'تعاقد مباشر من المالك وبأفضل سعر في السوق' : 'Direct Contracts From Owner at True Market Value'}
                </h3>
                <p className={styles.featuredDesc}>
                  {isAr
                    ? 'نوفر عليك مئات الآلاف من الجنيهات في عمولات السمسرة. جميع عقاراتنا ملك مباشر لشركة زكريا فريد، بعقود موثقة وشفافية مطلقة.'
                    : 'Save hundreds of thousands in broker commissions. Every property is owned directly by Zakaria Farid Real Estate with 100% legal verification.'}
                </p>

                <div className={styles.featureChecklist}>
                  {[
                    isAr ? 'عقود موثقة رسمياً ومسجلة بالشهر العقاري' : 'Official contracts registered with legal title guarantees',
                    isAr ? 'أسعار حقيقية بدون أي زيادة أو رسوم خفية' : 'True direct pricing with zero hidden surcharge',
                    isAr ? 'إمكانية الاستلام الفوري والمعاينة الميدانية' : 'Instant physical inspection & immediate delivery options',
                  ].map((item) => (
                    <div key={item} className={styles.checkItem}>
                      <CheckCircle2 size={16} className={styles.checkIcon} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.featuredFooter}>
                  <Link href={`/${locale}/about`} className={styles.learnMoreLink}>
                    <span>{isAr ? 'تعرف على فلسفة التميز لدينا' : 'Discover Our Heritage'}</span>
                    <ArrowRight size={14} className={isAr ? styles.arrowRtl : ''} />
                  </Link>
                </div>
              </SpotlightCard>
            </motion.div>
          </div>

          {/* Card 2: Strategic Prime Locations */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <SpotlightCard className={styles.cardStandard}>
              <div className={styles.cardIconHeader}>
                <div className={styles.iconWrap}>
                  <MapPin size={22} />
                </div>
                <div className={styles.statTag}>
                  <span className={styles.pulseDot} />
                  <span>10+ {isAr ? 'مناطق فاخرة' : 'Prime Destinations'}</span>
                </div>
              </div>
              <h3 className={styles.cardTitle}>
                {isAr ? 'أرقى المناطق في مصر' : 'Strategic Locations'}
              </h3>
              <p className={styles.cardDesc}>
                {isAr
                  ? 'مجموعة مختارة بعناية في الشيخ زايد، القاهرة الجديدة (التجمع الخامس)، والساحل الشمالي.'
                  : 'Handpicked prime estates in Sheikh Zayed, 5th Settlement, Beverly Hills, and Sidi Abdel Rahman.'}
              </p>
            </SpotlightCard>
          </motion.div>

          {/* Card 3: 100% Legal Ownership Title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <SpotlightCard className={styles.cardStandard}>
              <div className={styles.cardIconHeader}>
                <div className={styles.iconWrap}>
                  <ShieldCheck size={22} />
                </div>
                <div className={styles.statTagGold}>
                  <span>100% {isAr ? 'مسجل وموثق' : 'Verified Title'}</span>
                </div>
              </div>
              <h3 className={styles.cardTitle}>
                {isAr ? 'توثيق قانوني متكامل' : 'Verified Ownership'}
              </h3>
              <p className={styles.cardDesc}>
                {isAr
                  ? 'جميع المستندات ورخص البناء مراجعة قانونياً، مع ضمان النقل الفوري للملكية.'
                  : 'Rigorous legal vetting on title deeds and building permits ensuring seamless ownership transfer.'}
              </p>
            </SpotlightCard>
          </motion.div>

          {/* Card 4: Rapid VIP Response */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <SpotlightCard className={styles.cardStandard}>
              <div className={styles.cardIconHeader}>
                <div className={styles.iconWrap}>
                  <Clock size={22} />
                </div>
                <div className={styles.statTagLive}>
                  <span className={styles.liveDot} />
                  <span>&lt; 15 {isAr ? 'دقيقة استجابة' : 'Min VIP SLA'}</span>
                </div>
              </div>
              <h3 className={styles.cardTitle}>
                {isAr ? 'خدمة استشارية فورية' : 'Instant VIP Response'}
              </h3>
              <p className={styles.cardDesc}>
                {isAr
                  ? 'فريقنا متاح على مدار الساعة للإجابة على جميع استفساراتك وتنظيم الزيارات الميدانية.'
                  : 'Direct line to expert consultants available 24/7 for instant inquiries and private tours.'}
              </p>
            </SpotlightCard>
          </motion.div>

          {/* Card 5: Flexible Direct Payment Plans (Added Card) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <SpotlightCard className={styles.cardStandard}>
              <div className={styles.cardIconHeader}>
                <div className={styles.iconWrap}>
                  <Banknote size={22} />
                </div>
                <div className={styles.statTagGold}>
                  <span>{isAr ? 'تسهيلات سداد' : 'Flexible Terms'}</span>
                </div>
              </div>
              <h3 className={styles.cardTitle}>
                {isAr ? 'خطط سداد مباشرة وتنافسية' : 'Tailored Payment Schedules'}
              </h3>
              <p className={styles.cardDesc}>
                {isAr
                  ? 'مرونة عالية في نظم السداد والدفعات بالشروط المباشرة بدون أي فوائد بنكية.'
                  : 'Customizable installment structures tailored directly with the owner without bank interest.'}
              </p>
            </SpotlightCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
