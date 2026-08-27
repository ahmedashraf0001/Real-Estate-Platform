'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Compass, TrendingUp, Sparkles, ChevronRight, ChevronLeft, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

const ADVISORY_PILLARS = [
  {
    id: 'p-1',
    roman: 'I',
    icon: ShieldCheck,
    titleEn: 'Structural Forensic & CAD Audits',
    titleAr: 'التدقيق الهندسي الإنشائي والمخططات المعتمدة',
    descEn: 'Every represented estate undergoes on-site structural stress tests, MEP blueprint validation, and 100% verified CAD architectural auditing before catalog listing.',
    descAr: 'فحص إنشائي ميداني شامل ومطابقة دقيقة لمخططات البناء المعتمدة وخلو العقار من أي عيوب قبل العرض.',
    metricEn: '100% Structural Assurance',
    metricAr: 'ضمان إنشائي ١٠٠٪'
  },
  {
    id: 'p-2',
    roman: 'II',
    icon: Compass,
    titleEn: 'Freehold Title & Cadastral Sovereignty',
    titleAr: 'توثيق الملكية الحرة والسندات المساحية',
    descEn: 'We decline 70%+ of market offerings to present strictly unencumbered freehold titles, verified municipal licenses, and absolute legal sovereign clearance.',
    descAr: 'نستبعد أكثر من ٧٠٪ من العروض لنقدم فقط عقارات ذات سندات ملكية حرة مسجلة وخالية تماماً من أي نزاعات.',
    metricEn: '70% Strict Exclusion Rule',
    metricAr: 'معيار استبعاد صارم ٧٠٪'
  },
  {
    id: 'p-3',
    roman: 'III',
    icon: TrendingUp,
    titleEn: 'Discreet Wealth & Portfolio Yield Modeling',
    titleAr: 'استشارات الثروات الخاصة ونماذج العائد',
    descEn: 'Confidential off-market acquisitions, 5-year capital appreciation modeling, and bespoke negotiation protocols for family offices and sovereign wealth trustees.',
    descAr: 'تمثيل حصري وسري للصفقات الكبرى غير المعلنة مع دراسات النمو الرأسمالي والعائد الاستثماري للمحافظ العائلية.',
    metricEn: 'Confidential Advisory SLA',
    metricAr: 'سرية تامة وموثوقية'
  }
];

const PATRON_REVIEWS = [
  {
    id: 't-1',
    nameEn: 'Karim El-Sewedy',
    nameAr: 'كريم السويدي',
    roleEn: 'Managing Director, Infrastructure Capital',
    roleAr: 'العضو المنتدب للاستثمار والتطوير',
    acquisitionEn: 'Katameya Dunes Signature Palace',
    acquisitionAr: 'قصر قطامية ديونز الفاخر',
    quoteEn: '“AL ZAKARIA understood our need for absolute discretion and structural authenticity. The engineering audit and private acquisition process was executed with sovereign precision.”',
    quoteAr: '“أظهر مكتب آل زكريا احترافية استثنائية في التدقيق الهندسي وسرية التفاوض حتى استلام القصر بالكامل بضمانات قانونية صارمة.”',
    year: '2025'
  },
  {
    id: 't-2',
    nameEn: 'Nour Mansour',
    nameAr: 'نور منصور',
    roleEn: 'Principal, Contemporary Design Atelier',
    roleAr: 'مؤسس استوديو التصميم المعماري المعاصر',
    acquisitionEn: 'Palm Hills Sanctuary Villa',
    acquisitionAr: 'فيلا بالم هيلز الخاصة',
    quoteEn: '“The only real estate advisory in Egypt that treats architecture as high art. The private viewing experience, technical audit, and finishing provenance were impeccably handled.”',
    quoteAr: '“المكتب الوحيد الذي يقيم العقار كعمل فني ومعماري فريد. دقة الفحص الفني وجودة التشطيبات كانت على أعلى مستوى من الاحترافية.”',
    year: '2024'
  },
  {
    id: 't-3',
    nameEn: 'Sultan Al-Otaibi',
    nameAr: 'سلطان العتيبي',
    roleEn: 'Family Office Trustee (Riyadh & Cairo)',
    roleAr: 'مستشار المحافظ العائلية (الرياض والقاهرة)',
    acquisitionEn: 'El Gouna Waterfront Estate',
    acquisitionAr: 'قصر الواجهة المائية بالجونة',
    quoteEn: '“Representing generational capital requires absolute precision. AL ZAKARIA secured an off-market coastal sanctuary with total legal and architectural sovereignty.”',
    quoteAr: '“إدارة الاستثمارات العائلية تتطلب ثقة مطلقة وسرية تامة. نجح آل زكريا في تأمين عقار ساحلي نادر بأعلى درجات الأمان القانوني.”',
    year: '2025'
  }
];

interface SovereignAdvisorySectionProps {
  locale?: string;
  onOpenListEstate?: () => void;
}

export const SovereignAdvisorySection: React.FC<SovereignAdvisorySectionProps> = ({ 
  locale = 'en',
  onOpenListEstate 
}) => {
  const isAr = locale === 'ar';
  const [activePillarIdx, setActivePillarIdx] = useState(0);
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);
  const currentReview = PATRON_REVIEWS[activeReviewIdx];

  const handleNextReview = () => {
    setActiveReviewIdx((prev) => (prev + 1) % PATRON_REVIEWS.length);
  };

  const handlePrevReview = () => {
    setActiveReviewIdx((prev) => (prev - 1 + PATRON_REVIEWS.length) % PATRON_REVIEWS.length);
  };

  // Swipe between patron reviews on touch screens
  const reviewTouchX = useRef<number | null>(null);

  return (
    <section className="sovereign-advisory-section" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="advisory-ambient-radial" />

      <div className="container">
        {/* Editorial Section Header */}
        <div className="advisory-section-header">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-eyebrow-pill"
          >
            <span className="eyebrow-dot" />
            <span>{isAr ? 'ميثاق الاستشارة والتدقيق • تأسس ٢٠١٦' : 'SOVEREIGN ADVISORY CHARTER • EST. 2016'}</span>
          </motion.div>

          <motion.h2 
            className="advisory-heading"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.08 }}
          >
            <span>{isAr ? 'التدقيق المعماري و ' : 'Precision Due Diligence & '}</span>
            <span className="title-serif-accent" style={isAr ? { marginInlineStart: '0.45rem', display: 'inline-block' } : undefined}>
              {isAr ? 'ضمان السيادة العقارية' : 'Verified Assurance'}
            </span>
          </motion.h2>

          <motion.p 
            className="advisory-lead-text"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.14 }}
          >
            {isAr 
              ? 'بروتوكول هندسي وقانوني معتمد يحمي رؤوس الأموال الخاصة ويضمن سلامة الأصول العقارية قبل الطرح.'
              : 'A forensic architectural, legal, and cadastral protocol engineered to protect private capital and sovereign wealth acquisitions.'}
          </motion.p>
        </div>

        {/* 2-Wing Integrated Liquid Glass Architectural Folio */}
        <div className="advisory-folio-grid">
          
          {/* Wing 1: The 3 Liquid Glass Specimen Plates */}
          <div className="pillars-folio-wing">
            {ADVISORY_PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              const isActive = activePillarIdx === idx;
              return (
                <motion.div
                  key={pillar.id}
                  className={`pillar-glass-plate ${isActive ? 'active' : ''}`}
                  onClick={() => setActivePillarIdx(idx)}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                >
                  <div className="plate-header-row">
                    <div className="plate-roman-seal">
                      <span>{pillar.roman}</span>
                    </div>

                    <span className="plate-metric-tag">
                      <CheckCircle2 size={12} className="tag-check" />
                      <span>{isAr ? pillar.metricAr : pillar.metricEn}</span>
                    </span>
                  </div>

                  <h3 className="plate-title">
                    {isAr ? pillar.titleAr : pillar.titleEn}
                  </h3>

                  <p className="plate-desc">
                    {isAr ? pillar.descAr : pillar.descEn}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Wing 2: The Sovereign Patron Monograph (Liquid Glass) */}
          <div className="monograph-folio-wing">
            <motion.div 
              className="patron-monograph-card"
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              {/* Card Header & Controls */}
              <div className="monograph-top-bar">
                <div className="monograph-seal-badge">
                  <span className="seal-dot" />
                  <span className="seal-text">{isAr ? 'شهادة ثقة معتمدة' : 'PATRON ENDORSEMENT MONOGRAPH'}</span>
                </div>

                <div className="monograph-nav-btns">
                  <button 
                    onClick={handlePrevReview}
                    className="mono-nav-btn"
                    aria-label="Previous Review"
                    type="button"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="mono-counter">{activeReviewIdx + 1} / {PATRON_REVIEWS.length}</span>
                  <button 
                    onClick={handleNextReview}
                    className="mono-nav-btn"
                    aria-label="Next Review"
                    type="button"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Monograph Quote Area (swipe to browse reviews on touch) */}
              <div
                className="monograph-body"
                onTouchStart={(e) => {
                  reviewTouchX.current = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  if (reviewTouchX.current === null) return;
                  const delta = e.changedTouches[0].clientX - reviewTouchX.current;
                  reviewTouchX.current = null;
                  if (Math.abs(delta) < 48) return;
                  if (delta < 0) handleNextReview();
                  else handlePrevReview();
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentReview.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <blockquote className="monograph-quote">
                      {isAr ? currentReview.quoteAr : currentReview.quoteEn}
                    </blockquote>

                    {/* Acquisition Provenance Tag */}
                    <div className="acquisition-tag">
                      <Building2 size={13} className="tag-icon" />
                      <span>{isAr ? currentReview.acquisitionAr : currentReview.acquisitionEn} ({currentReview.year})</span>
                    </div>

                    {/* Sign-off Patron Details */}
                    <div className="patron-signoff">
                      <div className="patron-avatar-seal">
                        <span>{currentReview.nameEn.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div className="patron-info">
                        <span className="patron-name">{isAr ? currentReview.nameAr : currentReview.nameEn}</span>
                        <span className="patron-role">{isAr ? currentReview.roleAr : currentReview.roleEn}</span>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Card Footer Callout */}
              <div className="monograph-footer">
                <div className="footer-text-col">
                  <span className="footer-title">{isAr ? 'هل تملك قصراً أو عقاراً استثنائياً؟' : 'Own an architectural statement?'}</span>
                  <span className="footer-subtitle">{isAr ? 'تمثيل استشاري خاص وسري' : 'Confidential advisory & private placement'}</span>
                </div>
                {onOpenListEstate && (
                  <button 
                    onClick={onOpenListEstate}
                    className="monograph-cta-btn"
                    type="button"
                  >
                    <span>{isAr ? 'تسجيل عقار' : 'List Estate'}</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      <style>{`
        .sovereign-advisory-section {
          padding: 5.5rem 0 6rem;
          position: relative;
          background: transparent;
          overflow: hidden;
        }

        .advisory-ambient-radial {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        [data-theme="light"] .advisory-ambient-radial {
          background: 
            radial-gradient(ellipse 700px 420px at 20% 50%, rgba(229, 184, 105, 0.24) 0%, transparent 65%),
            radial-gradient(ellipse 650px 380px at 80% 55%, rgba(184, 147, 74, 0.20) 0%, transparent 65%),
            radial-gradient(circle 400px at 50% 15%, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
        }

        [data-theme="dark"] .advisory-ambient-radial {
          background: 
            radial-gradient(ellipse 600px 350px at 30% 40%, rgba(184, 147, 74, 0.12) 0%, transparent 65%),
            radial-gradient(ellipse 550px 300px at 70% 60%, rgba(184, 147, 74, 0.08) 0%, transparent 65%);
        }

        .sovereign-advisory-section .container {
          position: relative;
          z-index: 2;
        }

        .advisory-section-header {
          text-align: center;
          max-width: 780px;
          margin: 0 auto 3.5rem;
        }

        .section-eyebrow-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: #E5B869;
          background: rgba(229, 184, 105, 0.08);
          border: 1px solid rgba(229, 184, 105, 0.25);
          margin-bottom: 1rem;
          text-transform: uppercase;
        }

        [data-theme="light"] .section-eyebrow-pill {
          color: #8C6826;
          background: rgba(184, 147, 74, 0.08);
          border-color: rgba(140, 104, 38, 0.22);
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #E5B869;
          display: inline-block;
        }

        [data-theme="light"] .eyebrow-dot {
          background: #8C6826;
        }

        .advisory-heading {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 3.2vw, 2.65rem);
          font-weight: 800;
          color: var(--text-primary, #FFFFFF);
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin: 0 0 1rem 0;
        }

        [data-theme="light"] .advisory-heading {
          color: #141210;
        }

        .title-serif-accent {
          font-family: Georgia, serif;
          font-weight: 400;
          font-style: italic;
          color: #E5B869;
        }

        [data-theme="light"] .title-serif-accent {
          color: #8C6826;
        }

        .advisory-lead-text {
          font-size: 1.05rem;
          color: var(--text-secondary, #94A3B8);
          line-height: 1.65;
          margin: 0;
        }

        [data-theme="light"] .advisory-lead-text {
          color: #475569;
        }

        /* 2-Wing Folio Grid */
        .advisory-folio-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: stretch;
        }

        @media (max-width: 960px) {
          .advisory-folio-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Wing 1: Liquid Glass Specimen Plates */
        .pillars-folio-wing {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .pillar-glass-plate {
          padding: 1.65rem 1.85rem;
          border-radius: 20px;
          cursor: pointer;
          transition: all var(--transition-smooth);
          position: relative;
        }

        [data-theme="dark"] .pillar-glass-plate {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.10) 0%,
            rgba(18, 24, 38, 0.45) 50%,
            rgba(10, 14, 24, 0.65) 100%
          );
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          border: 1px solid rgba(255, 255, 255, 0.20);
          box-shadow: 
            0 16px 36px rgba(0, 0, 0, 0.35),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.5);
        }

        [data-theme="light"] .pillar-glass-plate {
          background: #FFFFFF;
          border: 1px solid rgba(184, 147, 74, 0.22);
          box-shadow: 
            0 4px 18px rgba(30, 24, 16, 0.04),
            0 1px 3px rgba(0, 0, 0, 0.02);
        }

        .pillar-glass-plate:hover,
        .pillar-glass-plate.active {
          border-color: rgba(184, 147, 74, 0.55);
        }

        [data-theme="dark"] .pillar-glass-plate.active {
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45), 0 0 20px rgba(184, 147, 74, 0.2);
        }

        [data-theme="light"] .pillar-glass-plate.active,
        [data-theme="light"] .pillar-glass-plate:hover {
          border-color: #B8934A;
          box-shadow: 
            0 12px 32px rgba(184, 147, 74, 0.12), 
            0 2px 8px rgba(0, 0, 0, 0.04);
          transform: translateY(-2px);
        }

        .plate-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.85rem;
        }

        .plate-roman-seal {
          font-family: Georgia, serif;
          font-size: 0.8125rem;
          font-weight: 700;
          color: #B8934A;
          letter-spacing: 0.1em;
        }

        [data-theme="light"] .plate-roman-seal {
          color: #8C6826;
        }

        .plate-metric-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #E5B869;
          background: rgba(184, 147, 74, 0.12);
          border: 1px solid rgba(184, 147, 74, 0.25);
        }

        [data-theme="light"] .plate-metric-tag {
          color: #8C6826;
          background: rgba(184, 147, 74, 0.08);
          border-color: rgba(184, 147, 74, 0.25);
        }

        .tag-check {
          color: #B8934A;
        }

        [data-theme="light"] .tag-check {
          color: #8C6826;
        }

        .plate-title {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary, #FFFFFF);
          margin: 0 0 0.45rem 0;
          line-height: 1.3;
        }

        [data-theme="light"] .plate-title {
          color: #141210;
        }

        .plate-desc {
          font-size: 0.875rem;
          line-height: 1.55;
          color: var(--text-secondary, #94A3B8);
          margin: 0;
        }

        [data-theme="light"] .plate-desc {
          color: #475569;
        }

        /* Wing 2: Liquid Glass Patron Monograph */
        .monograph-folio-wing {
          display: flex;
          flex-direction: column;
        }

        .patron-monograph-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.25rem 2.25rem;
          border-radius: 24px;
        }

        [data-theme="dark"] .patron-monograph-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(18, 24, 38, 0.55) 50%,
            rgba(10, 14, 24, 0.75) 100%
          );
          backdrop-filter: blur(32px) saturate(210%);
          -webkit-backdrop-filter: blur(32px) saturate(210%);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 
            0 24px 56px rgba(0, 0, 0, 0.45),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.6);
        }

        [data-theme="light"] .patron-monograph-card {
          background: #FFFFFF;
          border: 1px solid rgba(184, 147, 74, 0.25);
          box-shadow: 
            0 12px 36px rgba(30, 24, 16, 0.05),
            0 2px 6px rgba(0, 0, 0, 0.02);
        }

        .monograph-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .monograph-seal-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #B8934A;
        }

        [data-theme="light"] .monograph-seal-badge {
          color: #8C6826;
        }

        .seal-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #E5B869;
        }

        [data-theme="light"] .seal-dot {
          background: #8C6826;
        }

        .monograph-nav-btns {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mono-nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: var(--text-primary);
          transition: all var(--transition-fast);
        }

        [data-theme="light"] .mono-nav-btn {
          background: rgba(255, 255, 255, 0.6);
          border-color: rgba(30, 24, 16, 0.15);
          color: #141210;
        }

        .mono-nav-btn:hover {
          border-color: #B8934A;
          color: #E5B869;
          transform: scale(1.05);
        }

        [data-theme="light"] .mono-nav-btn:hover {
          color: #8C6826;
        }

        .mono-counter {
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .monograph-body {
          margin-bottom: 2rem;
        }

        .monograph-quote {
          font-family: Georgia, serif;
          font-size: clamp(1.15rem, 1.8vw, 1.35rem);
          font-style: italic;
          line-height: 1.6;
          color: var(--text-primary, #FFFFFF);
          margin: 0 0 1.5rem 0;
        }

        [data-theme="light"] .monograph-quote {
          color: #141210;
        }

        .acquisition-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #E5B869;
          background: rgba(184, 147, 74, 0.1);
          border: 1px solid rgba(184, 147, 74, 0.25);
          margin-bottom: 1.5rem;
        }

        [data-theme="light"] .acquisition-tag {
          color: #8C6826;
          background: rgba(184, 147, 74, 0.08);
          border-color: rgba(140, 104, 38, 0.2);
        }

        .patron-signoff {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .patron-avatar-seal {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFF4D4 0%, #E5B869 50%, #B8934A 100%);
          color: #0B0C10;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-heading);
          font-size: 0.875rem;
          font-weight: 800;
          box-shadow: 0 4px 14px rgba(184, 147, 74, 0.35);
        }

        .patron-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .patron-name {
          font-family: var(--font-heading);
          font-size: 0.9375rem;
          font-weight: 800;
          color: var(--text-primary, #FFFFFF);
        }

        [data-theme="light"] .patron-name {
          color: #141210;
        }

        .patron-role {
          font-size: 0.78rem;
          color: var(--text-secondary, #94A3B8);
        }

        [data-theme="light"] .patron-role {
          color: #64748B;
        }

        .monograph-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          gap: 1rem;
        }

        [data-theme="light"] .monograph-footer {
          border-top: 1px solid rgba(30, 24, 16, 0.1);
        }

        .footer-text-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .footer-title {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-primary, #FFFFFF);
        }

        [data-theme="light"] .footer-title {
          color: #141210;
        }

        .footer-subtitle {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .monograph-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, #E5B869 0%, #B8934A 100%);
          color: #0B0C10;
          font-size: 0.8125rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 4px 14px rgba(184, 147, 74, 0.3);
          white-space: nowrap;
        }

        .monograph-cta-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(184, 147, 74, 0.45);
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .sovereign-advisory-section {
            padding: 3rem 0;
          }

          /* Header: tighter type hierarchy */
          .advisory-section-header {
            margin-bottom: 2rem;
          }
          .advisory-heading {
            font-size: 1.55rem;
            line-height: 1.25;
            margin-bottom: 0.75rem;
          }
          .advisory-lead-text {
            font-size: 0.85rem;
            line-height: 1.6;
            max-width: 38ch;
            margin: 0 auto;
          }
          .advisory-folio-grid {
            gap: 1rem;
          }

          /* Pillars: horizontal scroll, snapping one full card per swipe */
          .pillars-folio-wing {
            flex-direction: row;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            scroll-padding-inline: 1rem;
            gap: 0.75rem;
            margin: 0 -1rem;
            padding: 0 1rem 8px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .pillars-folio-wing::-webkit-scrollbar {
            display: none;
          }
          .pillar-glass-plate {
            flex: 0 0 calc(100% - 2rem);
            scroll-snap-align: start;
            scroll-snap-stop: always;
            padding: 1.25rem 1.35rem;
          }

          /* Monograph card: compact and uncramped */
          .patron-monograph-card {
            padding: 1.35rem 1.2rem;
            border-radius: 20px;
          }
          .monograph-body {
            touch-action: pan-y;
          }
          .patron-avatar-seal {
            width: 38px;
            height: 38px;
            font-size: 0.78rem;
          }
          .patron-name {
            font-size: 0.875rem;
          }
          .patron-role {
            font-size: 0.72rem;
          }
          .mono-counter {
            font-size: 0.7rem;
          }
          .monograph-top-bar {
            margin-bottom: 1.1rem;
            gap: 0.6rem;
          }
          .monograph-seal-badge {
            font-size: 0.6rem;
            letter-spacing: 0.08em;
            min-width: 0;
          }
          .monograph-seal-badge span:not(.seal-dot) {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .monograph-nav-btns {
            flex-shrink: 0;
          }
          .mono-nav-btn {
            width: 36px;
            height: 36px;
          }
          .monograph-body {
            margin-bottom: 1.25rem;
          }
          .monograph-quote {
            font-size: 1rem;
            line-height: 1.55;
            margin-bottom: 1rem;
          }
          .acquisition-tag {
            margin-bottom: 1rem;
            font-size: 0.68rem;
          }
          .monograph-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 0.85rem;
            text-align: center;
          }
          .monograph-cta-btn {
            justify-content: center;
            min-height: 44px;
          }
        }
      `}</style>
    </section>
  );
};
