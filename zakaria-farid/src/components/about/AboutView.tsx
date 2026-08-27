'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  ShieldCheck,
  Award,
  Sparkles,
  TrendingUp,
  Compass,
  Scale,
  ChevronRight,
  ChevronLeft,
  Building2,
  Layers,
  Clock,
  ArrowRight
} from 'lucide-react';
import { usePlatformSettings } from '@/lib/hooks/usePlatformSettings';
import { DEFAULT_ABOUT_SETTINGS } from '@/lib/services/marketIntelligence';

interface AboutViewProps {
  locale: string;
  onNavigateToCatalog?: () => void;
  onOpenInquiry?: (subject?: string) => void;
}

export function AboutView({ locale, onNavigateToCatalog, onOpenInquiry = () => {} }: AboutViewProps) {
  const isAr = locale === 'ar';
  const settings = usePlatformSettings();
  const about = settings.about || DEFAULT_ABOUT_SETTINGS;

  const [activeFolio, setActiveFolio] = useState<number>(0);
  const [lightboxMode, setLightboxMode] = useState<'standard' | 'exclusion'>('standard');

  const folios = [
    {
      id: 'genesis',
      roman: 'I',
      year: '2016',
      tagEn: 'GENESIS & ADVISORY CHARTER',
      tagAr: 'التأسيس وميثاق الاستشارات',
      titleEn: 'Founding the Architectural Advisory Desk',
      titleAr: 'تأسيس المكتب الاستشاري المعماري الأول',
      subtitleEn: 'Challenging speculative brokerage through structural due diligence and legal title forensic audits.',
      subtitleAr: 'إعادة تعريف الاستشارات العقارية بإنهاء عصر السمسرة العشوائية وتكريس الفحص الهندسي والتدقيق القانوني المستقل.',
      narrativeEn: 'Established in Cairo as a private practice under Eng. Farid Zakaria, our charter was born out of an uncompromising conviction: luxury real estate in Egypt demanded engineering precision, not marketing hyperbole.',
      narrativeAr: 'انطلقت مسيرتنا في القاهرة كمكتب استشاري خاص بقيادة المهندس فريد زكريا، برؤية واضحة: العقارات الفاخرة في مصر تستحق معايير هندسية صارمة وتدقيقاً قانونياً شاملاً يحمي استثمارات العائلات ورواد الأعمال.',
      metrics: [
        { val: '100%', labelEn: 'CAD Title Verified', labelAr: 'مخططات مدققة' },
        { val: '0', labelEn: 'Compromised Titles', labelAr: 'نزاعات قانونية' },
        { val: '12', labelEn: 'Founding Estates', labelAr: 'عقارات تأسيسية' }
      ]
    },
    {
      id: 'charter',
      roman: 'II',
      year: '2019',
      tagEn: 'INSTITUTIONAL METROPOLIS',
      tagAr: 'التوسع المؤسسي في العواصم',
      titleEn: 'Expansion into Sovereign Urban Corridors',
      titleAr: 'التوسع في المحاور والمجتمعات العمرانية الراقية',
      subtitleEn: 'Curating flagship architectural statements across New Cairo Golden Square and Sheikh Zayed West Belt.',
      subtitleAr: 'انتقاء الصروح السكنية في المربع الذهبي بالقاهرة الجديدة وحزام غرب القاهرة بالشيخ زايد.',
      narrativeEn: 'As Greater Cairo expanded eastward and westward, AL ZAKARIA instituted the 70% Exclusion Rule, rejecting hundreds of developer offerings that failed acoustic attenuation, freehold documentation, or long-term liquidity benchmarks.',
      narrativeAr: 'مع التوسع العمراني شرقاً وغرباً، أرسينا "قاعدة استبعاد الـ ٧٠٪"، رافضين المئات من المشاريع التي لا ترقى لمواصفات العزل الصوتي والإنشائي وسندات الملكية الحرة الموثقة.',
      metrics: [
        { val: '70%+', labelEn: 'Market Disqualification', labelAr: 'نسبة الاستبعاد' },
        { val: '1.2B', labelEn: 'EGP Portfolio Curated', labelAr: 'حجم التدقيق' },
        { val: '98.5%', labelEn: 'Retention Rate', labelAr: 'استمرارية العملاء' }
      ]
    },
    {
      id: 'cadence',
      roman: 'III',
      year: '2022',
      tagEn: 'DIGITAL LAYER CAD PROTOCOL',
      tagAr: 'بروتوكول التحليل المعماري الرقمي',
      titleEn: 'Proprietary Layering & CAD Due Diligence',
      titleAr: 'إطلاق منظومة التحليل الطبقي والمخططات التفاعلية',
      subtitleEn: 'Engineering 1:1 blueprint inspectors, zone sun-path orientations, and private capital yield models.',
      subtitleAr: 'تطوير تقنيات فحص المساقط الأفقية، مسارات الإضاءة الطبيعية، ونماذج التقييم الرأسمالي الحقيقي.',
      narrativeEn: 'Pioneered Egypt’s first interactive Architectural CAD Blueprint Inspector, providing international buyers with exact structural dimensions, load-bearing verification, and verified secondary market yield forecasts.',
      narrativeAr: 'أطلقنا أول منصة رقمية متطورة تتيح للمشترين والمستثمرين الدوليين فحص المخططات الإنشائية والمساقط بدقة ١:١ مع تدقيق بيانات السيولة والعائد الاستثماري المتوقع.',
      metrics: [
        { val: '1:1', labelEn: 'CAD Metric Precision', labelAr: 'دقة المخططات' },
        { val: '15+', labelEn: 'Prime Districts', labelAr: 'مناطق مغطاة' },
        { val: '< 2hr', labelEn: 'Concierge SLA', labelAr: 'سرعة الاستجابة' }
      ]
    },
    {
      id: 'frontiers',
      roman: 'IV',
      year: '2025–2026',
      tagEn: 'THE SOVEREIGN HORIZON',
      tagAr: 'الريادة والآفاق المستقبلية',
      titleEn: 'Mediterranean Riviera & Ultra-Prime Frontiers',
      titleAr: 'تغطية الساحل الشمالي ورأس الحكمة والبحر الأحمر',
      subtitleEn: 'Directing private capital into Ras El Hekma, Sidi Heneish, and Red Sea lagoon trophy estates.',
      subtitleAr: 'توجيه الاستثمارات الخاصة نحو قصور رأس الحكمة، سيدي حنيش، وبحيرات الجونة الساحرة.',
      narrativeEn: 'Today, the atelier represents Egypt’s most discerning patrons, orchestrating confidential acquisitions of waterfront villas and generational trophy assets with absolute legal sovereignty and enduring architectural prestige.',
      narrativeAr: 'اليوم، يُمثل مكتب زكريا فريد المرجع الأول لنخبة العملاء والمستثمرين، موفراً استشارات سرية واستحواذات آمنة على أرقى القصور والفيلات في أبرز الوجهات السياحية والاستثمارية في مصر.',
      metrics: [
        { val: '2.5B+', labelEn: 'EGP Asset Volume', labelAr: 'حجم المحفظة' },
        { val: '10+', labelEn: 'Years Experience', labelAr: 'سنوات من الريادة' },
        { val: '100%', labelEn: 'Freehold Assured', labelAr: 'ملكية حرة مؤكدة' }
      ]
    }
  ];

  const pillars = [
    {
      id: 0,
      roman: 'I',
      title: isAr ? 'الفحص الإنشائي والمعماري' : 'Forensic Structural & Material Audits',
      subtitle: isAr ? 'تدقيق دقيق لجودة الخرسانة والمساقط والعزل' : 'CAD blueprint verification, structural load integrity, and certified envelopes',
      desc: isAr ? 'نقوم بفحص كل عقار عبر مهندسين معتمدين للتأكد من سلامة الهيكل الإنشائي وأنظمة العزل وجودة التشطيبات قبل إدراجه.' : 'We inspect every property with licensed structural consultants, verifying spatial layouts, moisture barriers, and acoustic attenuation before representation.',
      icon: Layers,
      points: isAr
        ? ['فحص مطابقة المساقط الأفقية للمواصفات', 'اختبار أنظمة العزل الحراري والمائي المعتمدة', 'مراجعة نسب التحميل وجودة المواد المستخدمة']
        : ['1:1 CAD layout accuracy & scale verification', 'Thermal insulation & certified moisture barriers', 'Net-to-gross usable area audits']
    },
    {
      id: 1,
      roman: 'II',
      title: isAr ? 'التوثيق القانوني والملكية الحرة' : 'Freehold Title & Legal Cadastral Clearance',
      subtitle: isAr ? 'ضمان خلو العقار من النزاعات وصحة التسجيل' : '100% Registered freehold ownership deeds with zero encumbrances',
      desc: isAr ? 'مراجعة تسلسل الملكية وتراخيص البناء وسندات الشهر العقاري لضمان عملية شراء آمنة تماماً بدون أي التزامات معلقة.' : 'Comprehensive legal title chain scrutiny, municipal permit ratification, and developer covenant audits to ensure zero legal liability.',
      icon: ShieldCheck,
      points: isAr
        ? ['مراجعة تسلسل الملكية وتراخيص البناء الرسمية', 'التأكد من خلو العقار من أي رهونات أو نزاعات', 'توثيق رسمي شامل يحمي حقوق المشتري القانونية']
        : ['Title chain vetting & building permit verification', 'Zero municipal liens, tax liabilities, or encumbrances', 'Institutional-grade contract protection']
    },
    {
      id: 2,
      roman: 'III',
      title: isAr ? 'دراسة الجدوى والسيولة المالية' : 'Capital Valuation & Yield Liquidity',
      subtitle: isAr ? 'بيانات حقيقية لمعدلات نمو الأسعار والعائد الإيجاري المتوقع' : 'Data-backed price appreciation modeling and rental liquidity',
      desc: isAr ? 'نساعد المشترين على اتخاذ قرارات استثمارية مدروسة من خلال تحليلات دقيقة لحركة الأسعار والسيولة في أرقى مناطق مصر.' : 'We provide discerning patrons with micro-market pricing analyses, historical capital gains forecasting, and secondary market liquidity benchmarks.',
      icon: TrendingUp,
      points: isAr
        ? ['تحليلات ارتفاع القيمة الرأسمالية عبر ٥ سنوات', 'تقديرات دقيقة للعائد الإيجاري الصافي المتوقع', 'رصد سيولة السوق والطلب المستمر في المناطق الراقية']
        : ['5-Year compound capital growth projections', 'Audited net rental yield forecasting', 'Secondary market liquidity & exit analysis']
    }
  ];

  return (
    <div className="atelier-about-page" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── 1. Parisian Architectural Masthead Hero ─── */}
      {about.showHero !== false && (
        <section className="atelier-hero-section">
          <div className="atelier-hero-bg">
            <img 
              src="/assets/hero-bg.webp" 
              alt="AL ZAKARIA Architectural Atelier" 
              className="atelier-hero-img"
            />
            <div className="atelier-hero-overlay" />
            <div className="atelier-hero-grid" />
          </div>

          <div className="container atelier-hero-container">
            <div className="atelier-hero-content">
              {/* Minimalist Parisian Coordinates Bar */}
              <motion.div
                className="atelier-coordinates-bar"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="coord-text">
                  {isAr ? '٢٩.٩٨٧٠° شمالاً، ٣١.٤٢٨٥° شرقاً • القاهرة • رأس الحكمة • البحر الأحمر' : '29.9870° N, 31.4285° E • CAIRO • RAS EL HEKMA • RED SEA'}
                </span>
                <span className="coord-sep">•</span>
                <span className="coord-charter">
                  {isAr ? (about.badgeAr || DEFAULT_ABOUT_SETTINGS.badgeAr) : (about.badgeEn || DEFAULT_ABOUT_SETTINGS.badgeEn)}
                </span>
              </motion.div>

              {/* Monumental Headline */}
              <motion.h1 
                className="atelier-hero-title"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="title-lead-line">
                  {isAr ? (about.heroTitle1Ar || DEFAULT_ABOUT_SETTINGS.heroTitle1Ar) : (about.heroTitle1En || DEFAULT_ABOUT_SETTINGS.heroTitle1En)}
                </span>
                <span className="title-gold-serif">
                  {isAr ? (about.heroTitle2Ar || DEFAULT_ABOUT_SETTINGS.heroTitle2Ar) : (about.heroTitle2En || DEFAULT_ABOUT_SETTINGS.heroTitle2En)}
                </span>
              </motion.h1>

              {/* Editorial Manifesto */}
              <motion.div 
                className="atelier-manifesto-wrap"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="manifesto-hairline-rule" />
                <p className="manifesto-lead-text">
                  {isAr 
                    ? (about.manifestoAr || DEFAULT_ABOUT_SETTINGS.manifestoAr)
                    : (about.manifestoEn || DEFAULT_ABOUT_SETTINGS.manifestoEn)
                  }
                </p>
              </motion.div>

              {/* Haute Actions */}
              <motion.div 
                className="atelier-hero-actions"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <button 
                  type="button" 
                  onClick={onNavigateToCatalog} 
                  className="atelier-btn-primary"
                >
                  <span>{isAr ? 'استعراض الدليل المعماري' : 'Explore Sovereign Portfolio'}</span>
                  <ArrowUpRight size={15} />
                </button>

                <button 
                  type="button" 
                  onClick={() => onOpenInquiry('Private Architectural Advisory')} 
                  className="atelier-btn-ghost"
                >
                  <Compass size={14} className="ghost-icon-bronze" />
                  <span>{isAr ? 'المكتب الاستشاري الخاص' : 'Private Advisory Desk'}</span>
                </button>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 2. Integrated Metrology Ribbon (Authority & Scale) ─── */}
      {about.showMetrology !== false && (
        <section className="atelier-metrology-section">
          <div className="container">
            <div className="metrology-grid">
              <div className="metrology-cell">
                <span className="metrology-roman">I</span>
                <span className="metrology-num">
                  {isAr 
                    ? (about.stat1ValueAr || (about.stat1Value && !about.stat1Value.includes('EGP') ? about.stat1Value : '٢.٥+ مليار ج.م'))
                    : (about.stat1Value || DEFAULT_ABOUT_SETTINGS.stat1Value)}
                </span>
                <span className="metrology-lbl">{isAr ? (about.stat1LabelAr || DEFAULT_ABOUT_SETTINGS.stat1LabelAr) : (about.stat1LabelEn || DEFAULT_ABOUT_SETTINGS.stat1LabelEn)}</span>
              </div>

              <div className="metrology-sep" />

              <div className="metrology-cell">
                <span className="metrology-roman">II</span>
                <span className="metrology-num">
                  {isAr 
                    ? (about.stat2ValueAr || (about.stat2Value && !about.stat2Value.toLowerCase().includes('district') ? about.stat2Value : '+١٥ منطقة'))
                    : (about.stat2Value || DEFAULT_ABOUT_SETTINGS.stat2Value)}
                </span>
                <span className="metrology-lbl">{isAr ? (about.stat2LabelAr || DEFAULT_ABOUT_SETTINGS.stat2LabelAr) : (about.stat2LabelEn || DEFAULT_ABOUT_SETTINGS.stat2LabelEn)}</span>
              </div>

              <div className="metrology-sep" />

              <div className="metrology-cell">
                <span className="metrology-roman">III</span>
                <span className="metrology-num">
                  {isAr 
                    ? (about.stat3ValueAr || (about.stat3Value === '98%' ? '٩٨٪' : about.stat3Value || '٩٨٪'))
                    : (about.stat3Value || DEFAULT_ABOUT_SETTINGS.stat3Value)}
                </span>
                <span className="metrology-lbl">{isAr ? (about.stat3LabelAr || DEFAULT_ABOUT_SETTINGS.stat3LabelAr) : (about.stat3LabelEn || DEFAULT_ABOUT_SETTINGS.stat3LabelEn)}</span>
              </div>

              <div className="metrology-sep" />

              <div className="metrology-cell">
                <span className="metrology-roman">IV</span>
                <span className="metrology-num">
                  {isAr 
                    ? (about.stat4ValueAr || (about.stat4Value && !about.stat4Value.toLowerCase().includes('year') ? about.stat4Value : '+١٠ سنوات'))
                    : (about.stat4Value || DEFAULT_ABOUT_SETTINGS.stat4Value)}
                </span>
                <span className="metrology-lbl">{isAr ? (about.stat4LabelAr || DEFAULT_ABOUT_SETTINGS.stat4LabelAr) : (about.stat4LabelEn || DEFAULT_ABOUT_SETTINGS.stat4LabelEn)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 3. The "Paravent" Foldable Architectural Folio (2016 → 2026) ─── */}
      {about.showParavent !== false && (
        <section className="atelier-paravent-section">
          <div className="container">
            <div className="atelier-section-header">
              <span className="atelier-eyebrow">{isAr ? 'سردية العقد الأول • ٢٠١٦ – ٢٠٢٦' : 'DECADE MONOGRAPH • 2016–2026'}</span>
              <h2 className="atelier-title">{isAr ? 'عقد من الريادة والاستحواذ السيادي' : 'A Decade of Unfolding Mastery'}</h2>
              <p className="atelier-subtext">
                {isAr 
                  ? 'استكشف الفصول الأربعة التي رسخت مكانة زكريا فريد كمرجع هندسي واستشاري أول لمشتري العقارات الفاخرة في مصر.'
                  : 'Unfold the four defining chapters that established our private architectural advisory across Egypt’s premier frontiers.'}
              </p>
            </div>

            {/* Interactive 4-Panel Paravent Accordion */}
            <div className="paravent-deck-container">
              {folios.map((folio, idx) => {
                const isOpen = activeFolio === idx;
                return (
                  <div
                    key={folio.id}
                    className={`paravent-panel ${isOpen ? 'expanded' : 'collapsed'}`}
                    onClick={() => setActiveFolio(idx)}
                  >
                    {/* Collapsed Spine Header */}
                    <div className="paravent-spine">
                      <div className="spine-top">
                        <span className="spine-roman">{folio.roman}</span>
                        <span className="spine-year">{folio.year}</span>
                      </div>
                      <span className="spine-tag">{isAr ? folio.tagAr : folio.tagEn}</span>
                      <div className="spine-indicator">
                        {isOpen ? <ChevronRight size={14} className="spine-arr active" /> : <ChevronLeft size={14} className="spine-arr" />}
                      </div>
                    </div>

                    {/* Expanded Content Body */}
                    {isOpen && (
                      <motion.div 
                        className="paravent-body"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className="paravent-content-inner">
                          <div className="paravent-body-top">
                            <div className="panel-chapter-stamp">
                              <span>{isAr ? `المحطة ${folio.roman}` : `CHAPTER ${folio.roman}`}</span>
                              <span>•</span>
                              <span>{folio.year}</span>
                            </div>
                            <span className="panel-tag-badge">{isAr ? folio.tagAr : folio.tagEn}</span>
                          </div>

                          <h3 className="panel-headline">
                            {isAr ? folio.titleAr : folio.titleEn}
                          </h3>

                          <p className="panel-subtitle">
                            {isAr ? folio.subtitleAr : folio.subtitleEn}
                          </p>

                          <p className="panel-narrative">
                            {isAr ? folio.narrativeAr : folio.narrativeEn}
                          </p>

                          {/* Metrics Bar */}
                          <div className="panel-metrics-strip">
                            {folio.metrics.map((m, i) => (
                              <div key={i} className="panel-metric-box">
                                <span className="metric-box-val">{m.val}</span>
                                <span className="metric-box-lbl">{isAr ? m.labelAr : m.labelEn}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── 4. The Architectural Lightbox & Curation Protocol ─── */}
      {about.showCuration !== false && (
        <section className="atelier-curation-section">
          <div className="container">
            <div className="atelier-section-header">
              <span className="atelier-eyebrow">{isAr ? 'مختبر المعايير الهندسية' : 'THE CURATION STANDARD'}</span>
              <h2 className="atelier-title">{isAr ? 'ميثاق الانتقاء والفحص المعماري' : 'The Architectural Due Diligence Protocol'}</h2>
              <p className="atelier-subtext">
                {isAr 
                  ? 'استكشف معايير الفحص الثلاثة التي تحدد قبول أو استبعاد أي عقار من دليلنا الحصري.'
                  : 'Every estate in our private directory must pass three forensic inspection protocols before representation.'}
              </p>
            </div>

            {/* Interactive Tactile Lightbox Specimen */}
            <div className="curation-lightbox-card">
              <div className="lightbox-nav-bar">
                <div className="lightbox-nav-title">
                  <Compass size={15} className="lightbox-title-icon" />
                  <span>{isAr ? 'مخطط الفحص والتدقيق المعماري' : 'Architectural Audit Protocol & Title Clearance'}</span>
                </div>

                {/* Minimalist Mode Selector */}
                <div className="lightbox-toggle-pill">
                  <button
                    type="button"
                    onClick={() => setLightboxMode('standard')}
                    className={`lightbox-toggle-btn ${lightboxMode === 'standard' ? 'active' : ''}`}
                  >
                    <span>{isAr ? 'ميثاق الجودة المعتمد (المقبول)' : 'The Sovereign Standard (Accepted)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxMode('exclusion')}
                    className={`lightbox-toggle-btn ${lightboxMode === 'exclusion' ? 'active' : ''}`}
                  >
                    <span>{isAr ? 'معايير الاستبعاد (٧٠٪+ مستبعد)' : 'The 70% Exclusion Benchmark'}</span>
                  </button>
                </div>
              </div>

              {/* Lightbox Blueprint Content */}
              <div className="lightbox-stage">
                <div className="lightbox-grid-pattern" />
                
                <AnimatePresence mode="wait">
                  {lightboxMode === 'standard' ? (
                    <motion.div
                      key="standard"
                      className="lightbox-view-grid"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="lightbox-callout">
                        <div className="callout-header">
                          <span className="callout-roman">01</span>
                          <h4 className="callout-title">{isAr ? 'فحص متانة الهيكل والعزل' : 'Structural & Thermal Envelope'}</h4>
                        </div>
                        <p className="callout-desc">
                          {isAr 
                            ? 'مراجعة خرسانية دقيقة، فحص أنظمة العزل المائي والحراري، والتأكد من مطابقة المواد لأعلى المعايير العالمية.'
                            : 'Comprehensive structural load verification, high-performance thermal insulation audits, and certified acoustic attenuation.'}
                        </p>
                        <div className="callout-spec-tag">
                          <span>{isAr ? 'مخططات ١:١ مدققة' : '1:1 CAD Blueprints Verified'}</span>
                        </div>
                      </div>

                      <div className="lightbox-callout">
                        <div className="callout-header">
                          <span className="callout-roman">02</span>
                          <h4 className="callout-title">{isAr ? 'التوثيق القانوني والملكية الحرة' : 'Freehold Title & Cadastral Clearance'}</h4>
                        </div>
                        <p className="callout-desc">
                          {isAr 
                            ? 'سندات ملكية حرة مسجلة ١٠٠٪ بدون أي رهونات أو التزامات مالية أو نزاعات بلدية.'
                            : '100% Registered freehold ownership deeds with zero encumbrances, liens, or municipal pending approvals.'}
                        </p>
                        <div className="callout-spec-tag">
                          <span>{isAr ? 'خلو تام من الرهونات' : 'Zero Encumbrance Guaranteed'}</span>
                        </div>
                      </div>

                      <div className="lightbox-callout">
                        <div className="callout-header">
                          <span className="callout-roman">03</span>
                          <h4 className="callout-title">{isAr ? 'الخصوصية ودراسة العائد' : 'Sightline Privacy & Yield Forecast'}</h4>
                        </div>
                        <p className="callout-desc">
                          {isAr 
                            ? 'زوايا رؤية مفتوحة غير مجروحة، تقييم حقيقي لحركة السوق والطلب، ودراسة دقيقة لنمو القيمة الرأسمالية.'
                            : 'Unobstructed panoramic sightlines, private buffer corridors, and audited secondary market liquidity models.'}
                        </p>
                        <div className="callout-spec-tag">
                          <span>{isAr ? 'عوائد وسيولة موثقة' : 'Audited Market Liquidity'}</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="exclusion"
                      className="lightbox-view-grid exclusion-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="lightbox-callout exclusion-box">
                        <div className="callout-header">
                          <span className="callout-roman">✕</span>
                          <h4 className="callout-title">{isAr ? 'عيوب البناء والتشطيب' : 'Masonry & Insulation Deficiencies'}</h4>
                        </div>
                        <p className="callout-desc">
                          {isAr 
                            ? 'استبعاد فوري لأي عقار يعاني من شروخ إنشائية، ضعف في العزل المائي، أو استخدام مواد تشطيب رديئة.'
                            : 'Immediate disqualification for unverified concrete grades, thermal bridging, or substandard cosmetic cover-ups.'}
                        </p>
                        <div className="callout-spec-tag exclusion-tag">
                          <span>{isAr ? 'مستبعد في الفحص الإنشائي' : 'Disqualified on Inspection'}</span>
                        </div>
                      </div>

                      <div className="lightbox-callout exclusion-box">
                        <div className="callout-header">
                          <span className="callout-roman">✕</span>
                          <h4 className="callout-title">{isAr ? 'غموض سندات الملكية' : 'Ambiguous Legal & Municipal Status'}</h4>
                        </div>
                        <p className="callout-desc">
                          {isAr 
                            ? 'رفض أي عقار لا يمتلك تسلسلاً قانونياً واضحاً للملكية أو يتضمن التزامات بنكية معلقة.'
                            : 'Rejection of unregistered contracts, unclear inheritance chains, or unresolved developer liens.'}
                        </p>
                        <div className="callout-spec-tag exclusion-tag">
                          <span>{isAr ? 'مستبعد في الفحص القانوني' : 'Disqualified on Legal Audit'}</span>
                        </div>
                      </div>

                      <div className="lightbox-callout exclusion-box">
                        <div className="callout-header">
                          <span className="callout-roman">✕</span>
                          <h4 className="callout-title">{isAr ? 'انتهاك الخصوصية والأسعار الوهمية' : 'Compromised Privacy & Speculation'}</h4>
                        </div>
                        <p className="callout-desc">
                          {isAr 
                            ? 'استبعاد العقارات الملاصقة بدون حرم خصوصية كافٍ، أو تلك المدرجة بأسعار مضاربة غير واقعية.'
                            : 'Exclusion of units with overlooked sightlines or speculative artificial pricing detached from reality.'}
                        </p>
                        <div className="callout-spec-tag exclusion-tag">
                          <span>{isAr ? 'مستبعد في تقييم الخصوصية' : 'Disqualified on Spatial Review'}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* The 3 Pillars Folio Cards */}
            <div className="pillars-folio-grid">
              {pillars.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.id} className="pillar-folio-card">
                    <div className="pillar-folio-header">
                      <div className="pillar-folio-icon">
                        <Icon size={20} />
                      </div>
                      <span className="pillar-folio-roman">{isAr ? `الركيزة ${p.roman}` : `PILLAR ${p.roman}`}</span>
                    </div>

                    <h3 className="pillar-folio-title">{p.title}</h3>
                    <p className="pillar-folio-sub">{p.subtitle}</p>
                    <p className="pillar-folio-desc">{p.desc}</p>

                    <div className="pillar-folio-checklist">
                      {p.points.map((pt, i) => (
                        <div key={i} className="pillar-point-row">
                          <span className="pillar-point-bullet">•</span>
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── 5. Founder’s "Lettre d'Intention" (Eng. Farid Zakaria) ─── */}
      {about.showFounder !== false && (
        <section className="atelier-founder-section">
          <div className="container">
            <div className="founder-letter-card">
              <div className="founder-letter-watermark">“</div>

              <div className="founder-letter-content">
                <div className="founder-letter-top">
                  <span className="letter-eyebrow">
                    {isAr ? 'رسالة ورؤية المؤسس' : 'FOUNDER’S ARCHITECTURAL MONOGRAPH'}
                  </span>
                  <span className="letter-est">{isAr ? 'تأسست ٢٠١٦ • القاهرة' : 'EST. 2016 • CAIRO'}</span>
                </div>

                <blockquote className="founder-quote-serif">
                  {isAr 
                    ? (about.founderQuoteAr || DEFAULT_ABOUT_SETTINGS.founderQuoteAr)
                    : (about.founderQuoteEn || DEFAULT_ABOUT_SETTINGS.founderQuoteEn)
                  }
                </blockquote>

                <div className="founder-letter-signoff">
                  <div className="signoff-meta">
                    <h4 className="signoff-name">
                      {isAr ? (about.founderNameAr || DEFAULT_ABOUT_SETTINGS.founderNameAr) : (about.founderNameEn || DEFAULT_ABOUT_SETTINGS.founderNameEn)}
                    </h4>
                    <p className="signoff-role">
                      {isAr ? (about.founderTitleAr || DEFAULT_ABOUT_SETTINGS.founderTitleAr) : (about.founderTitleEn || DEFAULT_ABOUT_SETTINGS.founderTitleEn)}
                    </p>
                  </div>

                  <div className="signoff-stamp">
                    <Award size={16} className="stamp-icon" />
                    <span>{isAr ? 'مستشار معماري معتمد' : 'Chartered Architectural Desk'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── 6. Confidential Acquisitions Office (Private Portal CTA) ─── */}
      {about.showPortal !== false && (
        <section className="atelier-portal-section">
          <div className="container">
            <div className="atelier-portal-card">
              <div className="portal-watermark-scale">
                <Scale size={260} strokeWidth={0.8} />
              </div>

              <div className="portal-inner-wrap">
                <div className="portal-tag-row">
                  <ShieldCheck size={15} className="portal-tag-icon" />
                  <span>{isAr ? 'المكتب الاستشاري للاستحواذ الخاص' : 'CONFIDENTIAL ACQUISITIONS OFFICE'}</span>
                </div>

                <h2 className="portal-heading-text">
                  {isAr ? 'امتلك صرحك المعماري للأجيال القادمة' : 'Own Your Generational Architectural Statement'}
                </h2>
                
                <p className="portal-paragraph-text">
                  {isAr
                    ? 'تواصل مباشرة مع مدير الأصول الخاصة للحصول على ملفات العقارات الحصرية غير المعلنة أو لتمثيل عقارك الاستثنائي بأعلى درجات السرية.'
                    : 'Connect directly with our Private Assets Director for a bespoke, unreleased portfolio presentation or discrete representation of your exceptional estate.'}
                </p>

                <div className="portal-actions-group">
                  <button 
                    type="button" 
                    className="portal-btn-gold"
                    onClick={() => onOpenInquiry('Private Wealth Consultation')}
                  >
                    <span>{isAr ? 'طلب استشارة شراء خاصة' : 'Request Private Consultation'}</span>
                    <ArrowUpRight size={15} />
                  </button>

                  <button 
                    type="button" 
                    className="portal-btn-outline"
                    onClick={onNavigateToCatalog}
                  >
                    <Building2 size={15} />
                    <span>{isAr ? 'استعراض الدليل الحصري' : 'Explore Sovereign Directory'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <style>{`
        .atelier-about-page {
          background: var(--bg-primary, #F7F4EE);
          color: var(--text-primary, #141210);
          min-height: 100vh;
          overflow-x: hidden;
          transition: background var(--transition-smooth);
        }

        /* ─── 1. Parisian Architectural Hero ─── */
        .atelier-hero-section {
          position: relative;
          min-height: 700px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: 145px;
          padding-bottom: 5rem;
          overflow: hidden;
          background: #0B0C10;
        }

        [data-theme="light"] .atelier-hero-section {
          background: #F7F4EE;
        }

        .atelier-hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .atelier-hero-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.18;
          filter: grayscale(100%) contrast(120%);
        }

        [data-theme="light"] .atelier-hero-img {
          opacity: 0.08;
          filter: grayscale(80%) contrast(110%);
        }

        .atelier-hero-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 30%, rgba(20, 18, 16, 0.4) 0%, rgba(11, 12, 16, 0.95) 75%);
        }

        [data-theme="light"] .atelier-hero-overlay {
          background: radial-gradient(circle at 50% 20%, rgba(247, 244, 238, 0.4) 0%, rgba(244, 241, 234, 0.92) 80%);
        }

        .atelier-hero-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(184, 147, 74, 0.06) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(184, 147, 74, 0.06) 1px, transparent 1px);
          background-size: 60px 60px;
          opacity: 0.7;
          pointer-events: none;
        }

        [data-theme="light"] .atelier-hero-grid {
          background-image: linear-gradient(rgba(140, 104, 38, 0.08) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(140, 104, 38, 0.08) 1px, transparent 1px);
          opacity: 0.45;
        }

        .atelier-hero-container {
          position: relative;
          z-index: 1;
        }

        .atelier-hero-content {
          max-width: 920px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .atelier-coordinates-bar {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 7px 18px;
          border-radius: 999px;
          background: rgba(20, 22, 30, 0.85);
          border: 1px solid rgba(184, 147, 74, 0.35);
          font-family: monospace;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          color: #E5B869;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
        }

        [data-theme="light"] .atelier-coordinates-bar {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(140, 104, 38, 0.35);
          box-shadow: 0 4px 18px rgba(30, 24, 16, 0.06);
          color: #8C6826;
        }

        .coord-sep {
          opacity: 0.4;
        }

        .coord-charter {
          font-weight: 700;
          color: #FFF0C2;
        }

        [data-theme="light"] .coord-charter {
          color: #141210;
        }

        .atelier-hero-title {
          font-family: var(--font-heading);
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -0.02em;
          margin: 0 0 1.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .title-lead-line {
          color: #FFFFFF;
        }

        [data-theme="light"] .title-lead-line {
          color: #141210;
        }

        .title-gold-serif {
          font-family: Georgia, var(--font-heading), serif;
          font-weight: 400;
          font-style: italic;
          background: linear-gradient(135deg, #FFF0C2 0%, #E5B869 50%, #B8934A 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        [data-theme="light"] .title-gold-serif {
          background: linear-gradient(135deg, #8C6826 0%, #B8934A 50%, #684A12 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .atelier-manifesto-wrap {
          max-width: 760px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2.25rem;
        }

        .manifesto-hairline-rule {
          width: 50px;
          height: 1.5px;
          background: #B8934A;
          margin-bottom: 1.25rem;
        }

        .manifesto-lead-text {
          font-size: 1.05rem;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
          font-weight: 400;
        }

        [data-theme="light"] .manifesto-lead-text {
          color: #334155;
          font-weight: 500;
        }

        .atelier-hero-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .atelier-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 28px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9375rem;
          background: linear-gradient(135deg, #E5B869 0%, #B8934A 100%);
          color: #0B0C10;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 20px rgba(184, 147, 74, 0.35);
        }

        .atelier-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(184, 147, 74, 0.5);
        }

        .atelier-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 24px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9375rem;
          background: rgba(255, 255, 255, 0.06);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: all var(--transition-fast);
        }

        [data-theme="light"] .atelier-btn-ghost {
          background: #FFFFFF;
          color: #141210;
          border: 1px solid rgba(30, 24, 16, 0.15);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .atelier-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: #B8934A;
          color: #E5B869;
        }

        [data-theme="light"] .atelier-btn-ghost:hover {
          background: #FCFAF7;
          border-color: #B8934A;
          color: #8C6826;
        }

        .ghost-icon-bronze {
          color: #B8934A;
        }

        /* ─── 2. Metrology Ribbon ─── */
        .atelier-metrology-section {
          background: #0E1017;
          border-top: 1px solid rgba(184, 147, 74, 0.25);
          border-bottom: 1px solid rgba(184, 147, 74, 0.25);
          padding: 2.5rem 0;
        }

        [data-theme="light"] .atelier-metrology-section {
          background: #FFFFFF;
          border-top: 1px solid rgba(184, 147, 74, 0.3);
          border-bottom: 1px solid rgba(184, 147, 74, 0.3);
          box-shadow: 0 4px 20px rgba(30, 24, 16, 0.04);
        }

        .metrology-grid {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .metrology-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 160px;
        }

        .metrology-roman {
          font-family: Georgia, serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: #B8934A;
          letter-spacing: 0.15em;
        }

        [data-theme="light"] .metrology-roman {
          color: #8C6826;
        }

        .metrology-num {
          font-family: var(--font-heading);
          font-size: 2.25rem;
          font-weight: 800;
          color: #E5B869;
          line-height: 1;
        }

        [data-theme="light"] .metrology-num {
          color: #8C6826;
        }

        .metrology-lbl {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-secondary, #64748B);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        [data-theme="light"] .metrology-lbl {
          color: #475569;
        }

        .metrology-sep {
          width: 1px;
          height: 48px;
          background: rgba(184, 147, 74, 0.25);
        }

        @media (max-width: 768px) {
          .atelier-hero-section {
            padding-top: 96px;
            min-height: 0;
          }
          .atelier-hero-title {
            font-size: 2.25rem;
          }
          .metrology-sep {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .atelier-coordinates-bar {
            max-width: 100%;
            padding: 6px 14px;
            font-size: 0.72rem;
            justify-content: center;
            text-align: center;
            margin-bottom: 1.25rem;
          }
          .coord-text, .coord-sep {
            display: none;
          }
          .coord-charter {
            font-size: 0.75rem;
            white-space: normal;
            text-align: center;
          }
          .atelier-hero-title {
            font-size: 1.85rem;
            line-height: 1.25;
          }
          .manifesto-lead-text {
            font-size: 0.92rem;
            line-height: 1.65;
          }
          .atelier-btn-primary, .atelier-btn-ghost {
            width: 100%;
            justify-content: center;
          }
          .metrology-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem 1rem;
          }
          .metrology-cell {
            min-width: 0;
            align-items: center;
            text-align: center;
          }
          .metrology-num {
            font-size: 1.65rem;
          }
          .metrology-lbl {
            font-size: 0.72rem;
            text-align: center;
          }
        }

        /* ─── 3. Paravent Foldable Accordion Section ─── */
        .atelier-paravent-section {
          padding: 6rem 0;
          background: var(--bg-primary, #F7F4EE);
        }

        .atelier-section-header {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 3.5rem auto;
        }

        .atelier-eyebrow {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #B8934A;
          text-transform: uppercase;
          display: block;
          margin-bottom: 0.5rem;
        }

        [data-theme="light"] .atelier-eyebrow {
          color: #8C6826;
        }

        .atelier-title {
          font-family: var(--font-heading);
          font-size: 2.35rem;
          font-weight: 800;
          color: var(--text-primary, #141210);
          margin: 0 0 0.85rem 0;
        }

        .atelier-subtext {
          font-size: 0.95rem;
          line-height: 1.65;
          color: var(--text-secondary, #475569);
          margin: 0;
        }

        /* Paravent Deck Layout */
        .paravent-deck-container {
          display: flex;
          gap: 1.25rem;
          height: 480px;
          min-height: 480px;
          max-height: 480px;
          max-width: 1080px;
          width: 100%;
          margin: 0 auto;
          overflow: hidden;
        }

        .paravent-panel {
          height: 100%;
          border-radius: 18px;
          cursor: pointer;
          overflow: hidden;
          position: relative;
          display: flex;
          min-width: 0;
          transition: flex 0.65s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
        }

        .paravent-panel.collapsed {
          flex: 0 0 88px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(184, 147, 74, 0.2);
        }

        [data-theme="light"] .paravent-panel.collapsed {
          background: #FFFFFF;
          border: 1px solid rgba(30, 24, 16, 0.1);
        }

        .paravent-panel.collapsed:hover {
          border-color: rgba(184, 147, 74, 0.5);
          background: rgba(184, 147, 74, 0.04);
        }

        .paravent-panel.expanded {
          flex: 1 1 0%;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(184, 147, 74, 0.45);
          box-shadow: 0 16px 44px rgba(0, 0, 0, 0.35);
          cursor: default;
        }

        [data-theme="light"] .paravent-panel.expanded {
          background: #FFFFFF;
          border: 1.5px solid rgba(140, 104, 38, 0.35);
          box-shadow: 0 16px 44px rgba(30, 24, 16, 0.08);
        }

        /* Spine Vertical Header */
        .paravent-spine {
          width: 88px;
          height: 100%;
          padding: 1.75rem 0.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          flex-shrink: 0;
          box-sizing: border-box;
        }

        [dir="rtl"] .paravent-spine {
          border-right: none;
          border-left: 1px solid rgba(255, 255, 255, 0.06);
        }

        [data-theme="light"] .paravent-spine {
          border-color: rgba(30, 24, 16, 0.08);
        }

        .spine-top {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .spine-roman {
          font-family: Georgia, serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #B8934A;
        }

        [data-theme="light"] .spine-roman {
          color: #8C6826;
        }

        .spine-year {
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--text-muted, #94A3B8);
          font-weight: 600;
        }

        .spine-tag {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #B8934A;
          text-transform: uppercase;
        }

        [data-theme="light"] .spine-tag {
          color: #8C6826;
        }

        .spine-indicator {
          color: #B8934A;
        }

        /* Expanded Body */
        .paravent-body {
          flex: 1;
          min-width: 0;
          height: 100%;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          box-sizing: border-box;
        }

        .paravent-content-inner {
          min-width: 520px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .paravent-body-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .panel-chapter-stamp {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: Georgia, serif;
          font-size: 0.8125rem;
          font-weight: 700;
          color: #B8934A;
          letter-spacing: 0.1em;
        }

        [data-theme="light"] .panel-chapter-stamp {
          color: #8C6826;
        }

        .panel-tag-badge {
          font-size: 0.6875rem;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 6px;
          background: rgba(184, 147, 74, 0.12);
          color: #E5B869;
          border: 1px solid rgba(184, 147, 74, 0.3);
          letter-spacing: 0.05em;
        }

        [data-theme="light"] .panel-tag-badge {
          background: rgba(140, 104, 38, 0.08);
          color: #8C6826;
          border-color: rgba(140, 104, 38, 0.25);
        }

        .panel-headline {
          font-family: var(--font-heading);
          font-size: 1.65rem;
          font-weight: 800;
          line-height: 1.25;
          color: var(--text-primary, #141210);
          margin: 0 0 0.5rem 0;
        }

        .panel-subtitle {
          font-size: 0.9375rem;
          color: #B8934A;
          font-weight: 600;
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }

        [data-theme="light"] .panel-subtitle {
          color: #8C6826;
        }

        .panel-narrative {
          font-size: 0.9375rem;
          line-height: 1.7;
          color: var(--text-secondary, #64748B);
          margin: 0 0 1.5rem 0;
        }

        [data-theme="light"] .panel-narrative {
          color: #475569;
        }

        .panel-metrics-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(184, 147, 74, 0.2);
        }

        .panel-metric-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .metric-box-val {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          color: #E5B869;
        }

        [data-theme="light"] .metric-box-val {
          color: #8C6826;
        }

        .metric-box-lbl {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-muted, #94A3B8);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        [data-theme="light"] .metric-box-lbl {
          color: #64748B;
        }

        @media (max-width: 900px) {
          .paravent-deck-container {
            flex-direction: column;
            height: auto;
            min-height: auto;
            max-height: none;
          }
          .paravent-panel.collapsed {
            flex: 0 0 52px;
          }
          .paravent-panel.expanded {
            flex: 1 1 auto;
          }
          .paravent-spine {
            width: 100%;
            height: 52px;
            flex-direction: row;
            padding: 0 1rem;
            border-right: none;
            border-bottom: 1px solid rgba(184, 147, 74, 0.2);
            align-items: center;
            justify-content: flex-start;
            gap: 14px;
          }
          .paravent-body {
            height: auto;
            padding: 1.25rem;
          }
          .spine-top {
            flex-direction: row;
            align-items: center;
            gap: 8px;
          }
          .spine-roman {
            font-size: 1.1rem;
          }
          .spine-tag {
            writing-mode: horizontal-tb;
            transform: none;
            font-size: 0.65rem;
          }
          .spine-year {
            display: none;
          }
          .paravent-content-inner {
            min-width: 0;
          }
        }

        /* ─── 4. Architectural Lightbox & Due Diligence ─── */
        .atelier-curation-section {
          padding: 6rem 0;
          background: #0E1017;
          border-top: 1px solid rgba(184, 147, 74, 0.2);
          border-bottom: 1px solid rgba(184, 147, 74, 0.2);
        }

        [data-theme="light"] .atelier-curation-section {
          background: #FFFFFF;
          border-color: rgba(140, 104, 38, 0.2);
        }

        .curation-lightbox-card {
          border-radius: 20px;
          background: #090B0F;
          border: 1px solid rgba(184, 147, 74, 0.3);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          margin-bottom: 3.5rem;
        }

        [data-theme="light"] .curation-lightbox-card {
          background: #FCFAF7;
          border: 1.5px solid rgba(140, 104, 38, 0.3);
          box-shadow: 0 16px 40px rgba(30, 24, 16, 0.06);
        }

        .lightbox-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2rem;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(184, 147, 74, 0.2);
          flex-wrap: wrap;
          gap: 1rem;
        }

        [data-theme="light"] .lightbox-nav-bar {
          background: #FFFFFF;
          border-bottom: 1px solid rgba(140, 104, 38, 0.18);
        }

        .lightbox-nav-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 0.875rem;
          color: #E5B869;
          letter-spacing: 0.04em;
        }

        [data-theme="light"] .lightbox-nav-title {
          color: #8C6826;
        }

        .lightbox-title-icon {
          color: #B8934A;
        }

        .lightbox-toggle-pill {
          display: inline-flex;
          padding: 4px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(184, 147, 74, 0.2);
          gap: 4px;
        }

        [data-theme="light"] .lightbox-toggle-pill {
          background: #EFEAE1;
          border-color: rgba(140, 104, 38, 0.2);
        }

        .lightbox-toggle-btn {
          padding: 7px 16px;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 700;
          border: none;
          background: transparent;
          color: var(--text-secondary, #94A3B8);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="light"] .lightbox-toggle-btn {
          color: #64748B;
        }

        .lightbox-toggle-btn.active {
          background: linear-gradient(135deg, #E5B869 0%, #B8934A 100%);
          color: #0B0C10;
          box-shadow: 0 2px 10px rgba(184, 147, 74, 0.35);
        }

        .lightbox-stage {
          position: relative;
          padding: 2.75rem 2rem;
          overflow: hidden;
        }

        .lightbox-grid-pattern {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(184, 147, 74, 0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(184, 147, 74, 0.05) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
        }

        [data-theme="light"] .lightbox-grid-pattern {
          background-image: linear-gradient(rgba(140, 104, 38, 0.06) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(140, 104, 38, 0.06) 1px, transparent 1px);
        }

        .lightbox-view-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .lightbox-view-grid {
            grid-template-columns: 1fr;
          }
        }

        .lightbox-callout {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(184, 147, 74, 0.25);
          border-radius: 14px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1rem;
        }

        [data-theme="light"] .lightbox-callout {
          background: #FFFFFF;
          border: 1px solid rgba(140, 104, 38, 0.25);
          box-shadow: 0 4px 16px rgba(30, 24, 16, 0.04);
        }

        .lightbox-callout.exclusion-box {
          border-color: rgba(148, 163, 184, 0.3);
          background: rgba(15, 23, 42, 0.4);
        }

        [data-theme="light"] .lightbox-callout.exclusion-box {
          border-color: rgba(148, 163, 184, 0.4);
          background: #F8FAFC;
        }

        .callout-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .callout-roman {
          font-family: Georgia, serif;
          font-weight: 700;
          font-size: 1.1rem;
          color: #B8934A;
        }

        [data-theme="light"] .callout-roman {
          color: #8C6826;
        }

        .exclusion-box .callout-roman {
          color: #94A3B8;
        }

        .callout-title {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 800;
          color: var(--text-primary, #141210);
          margin: 0;
        }

        .callout-desc {
          font-size: 0.875rem;
          line-height: 1.65;
          color: var(--text-secondary, #94A3B8);
          margin: 0;
        }

        [data-theme="light"] .callout-desc {
          color: #475569;
        }

        .callout-spec-tag {
          display: inline-block;
          align-self: flex-start;
          font-size: 0.6875rem;
          font-weight: 800;
          font-family: monospace;
          letter-spacing: 0.05em;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(184, 147, 74, 0.12);
          color: #E5B869;
          border: 1px solid rgba(184, 147, 74, 0.3);
        }

        [data-theme="light"] .callout-spec-tag {
          background: rgba(140, 104, 38, 0.08);
          color: #8C6826;
          border-color: rgba(140, 104, 38, 0.25);
        }

        .callout-spec-tag.exclusion-tag {
          background: rgba(148, 163, 184, 0.1);
          color: #94A3B8;
          border-color: rgba(148, 163, 184, 0.25);
        }

        /* Pillars Folio Grid */
        .pillars-folio-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 900px) {
          .pillars-folio-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          /* Horizontal swipe row instead of stacked cards */
          .pillars-folio-grid {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            gap: 0.75rem;
            margin: 0 -1rem;
            padding: 0 1rem 8px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .pillars-folio-grid::-webkit-scrollbar {
            display: none;
          }
          .pillar-folio-card {
            flex: 0 0 82%;
            scroll-snap-align: center;
            padding: 1.35rem 1.4rem;
          }
        }

        .pillar-folio-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(184, 147, 74, 0.2);
          border-radius: 16px;
          padding: 2.25rem;
          transition: all var(--transition-fast);
        }

        [data-theme="light"] .pillar-folio-card {
          background: #FFFFFF;
          border: 1px solid rgba(140, 104, 38, 0.2);
          box-shadow: 0 4px 20px rgba(30, 24, 16, 0.04);
        }

        .pillar-folio-card:hover {
          border-color: rgba(184, 147, 74, 0.45);
          transform: translateY(-3px);
        }

        .pillar-folio-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }

        .pillar-folio-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: rgba(184, 147, 74, 0.12);
          color: #E5B869;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(184, 147, 74, 0.25);
        }

        [data-theme="light"] .pillar-folio-icon {
          background: rgba(140, 104, 38, 0.08);
          color: #8C6826;
          border-color: rgba(140, 104, 38, 0.2);
        }

        .pillar-folio-roman {
          font-family: Georgia, serif;
          font-size: 0.75rem;
          font-weight: 700;
          color: #B8934A;
          letter-spacing: 0.1em;
        }

        [data-theme="light"] .pillar-folio-roman {
          color: #8C6826;
        }

        .pillar-folio-title {
          font-family: var(--font-heading);
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-primary, #141210);
          margin: 0 0 0.5rem 0;
        }

        .pillar-folio-sub {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #B8934A;
          margin: 0 0 0.85rem 0;
        }

        [data-theme="light"] .pillar-folio-sub {
          color: #8C6826;
        }

        .pillar-folio-desc {
          font-size: 0.875rem;
          line-height: 1.6;
          color: var(--text-secondary, #94A3B8);
          margin: 0 0 1.25rem 0;
        }

        [data-theme="light"] .pillar-folio-desc {
          color: #475569;
        }

        .pillar-folio-checklist {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 1rem;
          border-top: 1px solid rgba(184, 147, 74, 0.15);
        }

        .pillar-point-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.8125rem;
          color: var(--text-primary, #141210);
          font-weight: 500;
        }

        .pillar-point-bullet {
          color: #B8934A;
          font-weight: 800;
        }

        /* ─── 5. Founder’s Lettre d'Intention ─── */
        .atelier-founder-section {
          padding: 6rem 0;
          background: var(--bg-primary, #F7F4EE);
        }

        .founder-letter-card {
          max-width: 840px;
          margin: 0 auto;
          background: #FFFFFF;
          border: 1.5px solid rgba(184, 147, 74, 0.35);
          border-radius: 20px;
          padding: 3.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(30, 24, 16, 0.08);
        }

        [data-theme="dark"] .founder-letter-card {
          background: #0E1017;
          border-color: rgba(184, 147, 74, 0.35);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
        }

        .founder-letter-watermark {
          position: absolute;
          top: -20px;
          right: 25px;
          font-family: Georgia, serif;
          font-size: 16rem;
          color: rgba(184, 147, 74, 0.06);
          line-height: 1;
          pointer-events: none;
          user-select: none;
        }

        .founder-letter-content {
          position: relative;
          z-index: 1;
        }

        .founder-letter-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(184, 147, 74, 0.2);
          padding-bottom: 1rem;
        }

        .letter-eyebrow {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #8C6826;
          text-transform: uppercase;
        }

        [data-theme="dark"] .letter-eyebrow {
          color: #E5B869;
        }

        .letter-est {
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--text-muted, #94A3B8);
          font-weight: 600;
        }

        .founder-quote-serif {
          font-family: Georgia, serif;
          font-size: 1.45rem;
          line-height: 1.7;
          color: #141210;
          font-style: italic;
          margin: 0 0 2.5rem 0;
        }

        [data-theme="dark"] .founder-quote-serif {
          color: #FFFFFF;
        }

        .founder-letter-signoff {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
        }

        .signoff-name {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 800;
          color: #141210;
          margin: 0 0 4px 0;
        }

        [data-theme="dark"] .signoff-name {
          color: #FFFFFF;
        }

        .signoff-role {
          font-size: 0.8125rem;
          color: #8C6826;
          font-weight: 600;
          margin: 0;
        }

        [data-theme="dark"] .signoff-role {
          color: #E5B869;
        }

        .signoff-stamp {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(184, 147, 74, 0.1);
          border: 1px solid rgba(184, 147, 74, 0.35);
          font-size: 0.75rem;
          font-weight: 700;
          color: #8C6826;
        }

        [data-theme="dark"] .signoff-stamp {
          color: #E5B869;
        }

        .stamp-icon {
          color: #B8934A;
        }

        /* ─── 6. Confidential Acquisitions Office (CTA Portal) ─── */
        .atelier-portal-section {
          padding: 6rem 0 7.5rem 0;
          background: var(--bg-primary, #F7F4EE);
        }

        .atelier-portal-card {
          position: relative;
          border-radius: 24px;
          background: #0B0C10;
          border: 1.5px solid rgba(184, 147, 74, 0.4);
          padding: 4.5rem 3.5rem;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
          text-align: center;
        }

        [data-theme="light"] .atelier-portal-card {
          background: linear-gradient(
            135deg,
            #1A1208 0%,
            #2C1E0A 50%,
            #1A1208 100%
          );
          border: 1.5px solid rgba(184, 147, 74, 0.55);
          box-shadow: 0 24px 60px rgba(30, 24, 16, 0.22), inset 0 1px 1.5px rgba(229, 184, 105, 0.15);
        }

        .portal-watermark-scale {
          position: absolute;
          right: -40px;
          bottom: -40px;
          color: rgba(184, 147, 74, 0.05);
          pointer-events: none;
          user-select: none;
        }

        .portal-inner-wrap {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .portal-tag-row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: rgba(184, 147, 74, 0.12);
          border: 1px solid rgba(184, 147, 74, 0.3);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #E5B869;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
        }

        .portal-tag-icon {
          color: #B8934A;
        }

        .portal-heading-text {
          font-family: var(--font-heading);
          font-size: 2.4rem;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.25;
          margin: 0 0 1.25rem 0;
        }

        .portal-paragraph-text {
          font-size: 1rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 2.25rem 0;
        }

        .portal-actions-group {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .portal-btn-gold {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 30px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9375rem;
          background: linear-gradient(135deg, #E5B869 0%, #B8934A 100%);
          color: #0B0C10;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 20px rgba(184, 147, 74, 0.35);
        }

        .portal-btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(184, 147, 74, 0.5);
        }

        .portal-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 26px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9375rem;
          background: rgba(255, 255, 255, 0.06);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all var(--transition-fast);
        }

        .portal-btn-outline:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: #B8934A;
          color: #E5B869;
        }

        @media (max-width: 640px) {
          .founder-letter-card {
            padding: 1.75rem 1.25rem;
          }
          .founder-letter-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.35rem;
            margin-bottom: 1.25rem;
          }
          .founder-letter-watermark {
            font-size: 8rem;
            top: -10px;
            right: 10px;
          }
          .atelier-paravent-section,
          .atelier-curation-section,
          .atelier-founder-section,
          .atelier-portal-section {
            padding: 3.5rem 0;
          }
          .atelier-title {
            font-size: 1.75rem;
          }
          .curation-lightbox-card {
            border-radius: 16px;
            margin-bottom: 2rem;
          }
          .lightbox-nav-bar {
            padding: 1rem 1.25rem;
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .lightbox-toggle-pill {
            width: 100%;
            display: flex;
            flex-direction: column;
          }
          .lightbox-toggle-btn {
            width: 100%;
            text-align: center;
          }
          .lightbox-stage {
            padding: 1.25rem 1rem;
          }
          .lightbox-callout {
            padding: 1.25rem 1rem;
          }
          .pillar-folio-card {
            padding: 1.5rem 1.25rem;
          }
          .founder-quote-serif {
            font-size: 1.15rem;
            line-height: 1.6;
            margin-bottom: 1.5rem;
          }
          .atelier-portal-card {
            padding: 2.5rem 1.25rem;
            border-radius: 20px;
          }
          .portal-heading-text {
            font-size: 1.65rem;
          }
          .portal-btn-gold,
          .portal-btn-outline {
            width: 100%;
            justify-content: center;
          }
        }

        /* ── RTL & Arabic Typography Safety Overrides ── */
        [dir="rtl"] .atelier-hero-title,
        [dir="rtl"] .title-gold-serif,
        [dir="rtl"] .founder-quote-serif,
        [dir="rtl"] .portal-heading-text,
        [dir="rtl"] .atelier-title {
          font-style: normal !important;
          letter-spacing: normal !important;
          line-height: 1.4 !important;
          padding-bottom: 4px;
        }

        [dir="rtl"] .atelier-coordinates-bar {
          letter-spacing: normal !important;
          font-family: inherit !important;
          max-width: 95%;
          margin-left: auto;
          margin-right: auto;
        }

        [dir="rtl"] .founder-quote-serif {
          font-family: var(--font-heading), 'Tajawal', sans-serif !important;
        }
      `}</style>
    </div>
  );
}
