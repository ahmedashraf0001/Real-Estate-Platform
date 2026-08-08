import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Award, Building2, MapPin, MessageCircle, ArrowRight, CheckCircle2, Sparkles, ShieldCheck, PhoneCall, Key, FileCheck } from 'lucide-react';
import { WHATSAPP_NUMBER, whatsappUrl } from '@/lib/utils/formatting';
import { getAllProperties } from '@/lib/supabase/queries';
import styles from './about.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: `${t('title')} — Zakaria Farid Real Estate`,
    description: 'Learn about Zakaria Farid — Egypt\'s premier direct real estate portfolio owner with decades of luxury real estate mastery.',
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  const isAr = locale === 'ar';

  const properties = await getAllProperties().catch(() => []);

  // Dynamically extract real locations and active property counts from site offers
  const locationCountsMap = new Map<string, number>();
  properties.forEach((p) => {
    if (p.location) {
      const locName = p.location.trim();
      locationCountsMap.set(locName, (locationCountsMap.get(locName) || 0) + 1);
    }
  });

  const dynamicLocations = Array.from(locationCountsMap.entries()).map(([locName, count]) => {
    const norm = locName.toLowerCase();
    let name_en = locName;
    let name_ar = locName;

    if (norm.includes('zayed')) {
      name_en = 'Sheikh Zayed';
      name_ar = 'الشيخ زايد';
    } else if (norm.includes('cairo') || norm.includes('fifth')) {
      name_en = 'Fifth Settlement, New Cairo';
      name_ar = 'التجمع الخامس، القاهرة الجديدة';
    } else if (norm.includes('north') || norm.includes('sidi')) {
      name_en = 'North Coast (Sidi Abdel Rahman)';
      name_ar = 'الساحل الشمالي (سيدي عبد الرحمن)';
    }

    return {
      name_en: `${name_en} (${count} ${count === 1 ? 'Listing' : 'Listings'})`,
      name_ar: `${name_ar} (${count} ${count === 1 ? 'عقار متاح' : 'عقارات متاحة'})`,
      rawLoc: locName,
      count,
    };
  });

  const locationsList = dynamicLocations.length > 0 ? dynamicLocations : [
    { name_en: 'Sheikh Zayed & 6th October', name_ar: 'الشيخ زايد و٦ أكتوبر', rawLoc: 'Sheikh Zayed', count: 0 },
    { name_en: 'Fifth Settlement, New Cairo', name_ar: 'التجمع الخامس، القاهرة الجديدة', rawLoc: 'New Cairo', count: 0 },
    { name_en: 'North Coast (Sidi Abdel Rahman)', name_ar: 'الساحل الشمالي (سيدي عبد الرحمن)', rawLoc: 'North Coast', count: 0 },
  ];

  const pillars = [
    {
      icon: Key,
      title_en: 'Direct Owner Dealings',
      title_ar: 'التعامل المباشر مع المالك',
      desc_en: '0% broker commission fees. Transact directly with Zakaria Farid for absolute financial transparency.',
      desc_ar: 'بدون أي عمولات وساطة (0%). التعامل المباشر مع المالك لضمان الشفافية والوضوح المالي التام.',
    },
    {
      icon: FileCheck,
      title_en: 'Verified Legal Titles',
      title_ar: 'عقود وملكية مسجلة رسمياً',
      desc_en: 'All properties possess clear legal titles, unencumbered deeds, and instant property transfer.',
      desc_ar: 'جميع العقارات مسجلة بعقود ملكية خالية من أي التزامات وقابلة للتسجيل الفوري.',
    },
    {
      icon: MapPin,
      title_en: 'Prime Strategic Locations',
      title_ar: 'مواقع استراتيجية في أرقى الأحياء',
      desc_en: 'Curated residences in top-tier compounds across Sheikh Zayed, New Cairo, and Sidi Abdel Rahman.',
      desc_ar: 'اختيار دقيق لأحدث الوحدات في بيفرلي هيلز، ويست تاون، التجمع الخامس، والساحل الشمالي.',
    },
    {
      icon: ShieldCheck,
      title_en: 'Bespoke Handover & Care',
      title_ar: 'تسليم مخصص ودعم مستمر',
      desc_en: 'Tailored finishing consultation, architectural customization, and long-term owner support.',
      desc_ar: 'استشارات تشطيب هندسية، تعديلات معمارية مخصصة، ودعم استشاري دائم بعد الاستلام.',
    },
  ];

  return (
    <div className={styles.root}>
      {/* ─── Parallax Cinematic Hero Banner ───────────────── */}
      <section className={styles.heroSection}>
        <div className={styles.heroBgWrap}>
          <Image
            src="/images/about-hero.png"
            alt="Zakaria Farid Real Estate"
            fill
            sizes="100vw"
            className={styles.heroBgImg}
            priority
          />
          <div className={styles.heroOverlay} />
        </div>

        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <Sparkles size={14} />
              <span>{isAr ? 'زكريا فريد للاستثمار العقاري' : 'Zakaria Farid Real Estate Mastery'}</span>
            </div>
            
            <h1 className={styles.heroTitle}>
              {isAr ? 'صناعة التميز المعماري والعقاري في مصر ' : 'Crafting Exceptional Residences Across Egypt, '}
              <span className={styles.goldGradientText}>
                {isAr ? 'مباشرة من المالك' : 'Direct From The Owner'}
              </span>
            </h1>

            <p className={styles.heroSub}>
              {t('story')}
            </p>

            {/* Floating Glass Metrics Bar */}
            <div className={styles.metricsBar}>
              <div className={styles.metricItem}>
                <Award size={20} style={{ color: '#C9A96A' }} />
                <span className={styles.metricVal}>20+</span>
                <span className={styles.metricLabel}>{t('stat_years')}</span>
              </div>

              <div className={styles.metricDivider} />

              <div className={styles.metricItem}>
                <Building2 size={20} style={{ color: '#C9A96A' }} />
                <span className={styles.metricVal}>150+</span>
                <span className={styles.metricLabel}>{t('stat_units')}</span>
              </div>

              <div className={styles.metricDivider} />

              <div className={styles.metricItem}>
                <MapPin size={20} style={{ color: '#C9A96A' }} />
                <span className={styles.metricVal}>5</span>
                <span className={styles.metricLabel}>{t('stat_areas')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Split-Screen Story Section ─────────────────── */}
      <section className={styles.storySection}>
        <div className="container">
          <div className={styles.storyGrid}>
            {/* Left Column: Image Card */}
            <div className={styles.storyImageWrap}>
              <Image
                src="/images/about-interior.png"
                alt="Luxury Real Estate Design"
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                className={styles.storyImg}
              />
              <div className={styles.storyImageOverlay} />
              
              <div className={styles.storyBadgeFloat}>
                <div className={styles.storyBadgeIcon}>
                  <ShieldCheck size={22} />
                </div>
                <p className={styles.storyBadgeText}>
                  {isAr
                    ? 'ضمان التعامل المباشر مع المالك • ٠٪ عمولات وساطة'
                    : 'Verified Direct Owner Transaction • 0% Broker Commission'}
                </p>
              </div>
            </div>

            {/* Right Column: Narrative */}
            <div className={styles.storyContent}>
              <div className={styles.sectionTag}>
                <Sparkles size={14} />
                <span>{isAr ? 'قصة المالك والرؤية' : 'Our Heritage & Philosophy'}</span>
              </div>

              <h2 className={styles.storyHeading}>
                {isAr ? 'عقارات فاخرة من المالك مباشرة بدون وسيط' : 'Uncompromising Architectural Luxury Direct To You'}
              </h2>

              <p className={styles.storyParagraph}>
                {isAr
                  ? 'على مدى أكثر من عقدين من الزمان، ارتبط اسم زكريا فريد بتقديم أرقى الوحدات السكنية والفيلات في أهم المجتمعات السكنية في مصر. نؤمن بأن اقتناء العقار يجب أن يكون تجربة سلسة، شفافة، ومباشرة تمنحك القيمة الحقيقية للاستثمار.'
                  : 'For over two decades, Zakaria Farid has curated an extraordinary portfolio of standalone villas, penthouses, and beachfront chalets in Egypt’s prime residential developments. We believe acquiring real estate should be an inspiring, transparent experience—free of redundant intermediaries.'}
              </p>

              <div className={styles.ownerGuaranteeList}>
                <div className={styles.guaranteeItem}>
                  <CheckCircle2 size={18} className={styles.guaranteeIcon} />
                  <span>{isAr ? 'تواصل مباشر مع المالك لتحديد السعر وأنظمة السداد' : 'Direct price & payment negotiations with the owner'}</span>
                </div>
                <div className={styles.guaranteeItem}>
                  <CheckCircle2 size={18} className={styles.guaranteeIcon} />
                  <span>{isAr ? 'وحدات وجاهزية استلام فورية في الشيخ زايد والقاهرة الجديدة' : 'Ready-to-move-in luxury units in Sheikh Zayed & New Cairo'}</span>
                </div>
                <div className={styles.guaranteeItem}>
                  <CheckCircle2 size={18} className={styles.guaranteeIcon} />
                  <span>{isAr ? 'استشارات تشطيب معمارية مخصصة حسب رغبة العميل' : 'Custom architectural finishing tailored to your lifestyle'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4 Pillars Grid Section ───────────────────── */}
      <section className={styles.pillarsSection}>
        <div className="container">
          <div className={styles.pillarsHeader}>
            <h2 className={styles.pillarsTitle}>
              {isAr ? 'ركائز تميزنا في السوق العقاري' : 'Pillars of Our Portfolio'}
            </h2>
            <p className={styles.pillarsSub}>
              {isAr ? 'نلتزم بأعلى معايير المصداقية والجودة في كافة تعاملاتنا العقارية' : 'Every property in our collection is backed by four non-negotiable promises'}
            </p>
          </div>

          <div className={styles.pillarsGrid}>
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div key={idx} className={styles.pillarCard}>
                  <div className={styles.pillarIconBox}>
                    <Icon size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className={styles.pillarTitle}>{isAr ? p.title_ar : p.title_en}</h3>
                  <p className={styles.pillarDesc}>{isAr ? p.desc_ar : p.desc_en}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Locations Showcase & Direct Call CTA ───────── */}
      <section className={styles.locationsSection}>
        <div className="container">
          <div className={styles.locHeader}>
            <h2 className={styles.locHeading}>{isAr ? 'تغطيتنا الجغرافية' : 'Strategic Operating Hubs'}</h2>
            <p className={styles.locSub}>{isAr ? 'تتواجد وحداتنا الفاخرة المباشرة في أهم وأرقى المدن والمجتمعات' : 'Spanning Egypt’s most coveted residential compounds and coastal retreats'}</p>
          </div>

          <div className={styles.locationsGrid}>
            {locationsList.map((loc, idx) => (
              <Link
                key={idx}
                href={`/${locale}/properties?location=${encodeURIComponent(loc.rawLoc)}`}
                className={styles.locCard}
              >
                <MapPin size={20} className={styles.locIcon} />
                <span className={styles.locName}>{isAr ? loc.name_ar : loc.name_en}</span>
              </Link>
            ))}
          </div>

          <div className={styles.ctaBanner}>
            <div className={styles.ctaText}>
              <h3>{isAr ? 'هل تود استكشاف العقارات المتاحة حالياً؟' : 'Ready to Explore Our Direct Listings?'}</h3>
              <p>{isAr ? 'تواصل معنا مباشرة عبر الهاتف أو الواتساب للحصول على استشارة خاصة' : 'Connect directly with Mr. Zakaria Farid for private viewings & inquiries'}</p>
            </div>
            
            <div className={styles.ctaActions}>
              <a
                href={whatsappUrl(WHATSAPP_NUMBER, isAr ? 'مرحباً، أود استكشاف العقارات المتاحة' : 'Hello, I would like to explore available properties')}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ctaBtnPrimary}
              >
                <MessageCircle size={16} />
                <span>{isAr ? 'مراسلة الواتساب' : 'WhatsApp Direct'}</span>
              </a>
              <a href={`tel:+${WHATSAPP_NUMBER}`} className={styles.ctaBtnSecondary}>
                <PhoneCall size={16} />
                <span>{isAr ? 'اتصال مباشر' : 'Direct Call'}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
