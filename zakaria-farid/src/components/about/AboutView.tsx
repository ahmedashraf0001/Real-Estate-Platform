'use client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Compass, 
  TrendingUp, 
  ArrowUpRight, 
  CheckCircle2, 
  Layers,
  ChevronRight, 
  Scale,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AboutViewProps {
  locale?: string;
  onOpenInquiry?: (type: string) => void;
  onNavigateToCatalog?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  locale = 'en',
  onOpenInquiry: propOnOpenInquiry,
  onNavigateToCatalog: propOnNavigateToCatalog
}) => {
  const isAr = locale === 'ar';
  const router = useRouter();
  const onNavigateToCatalog = propOnNavigateToCatalog || (() => router.push('/' + locale + '/properties'));
  const onOpenInquiry = propOnOpenInquiry || ((type: string) => {
    window.location.href = 'https://wa.me/201009998888?text=' + encodeURIComponent('Hello, I am inquiring about ' + type);
  });
  const [activePillar, setActivePillar] = useState<number>(0);

  const stats = [
    { value: '2.5B+', unit: 'EGP', label: 'Curated Asset Volume', desc: 'Represented exclusively across Greater Cairo & Coasts' },
    { value: '15+', unit: 'Districts', label: 'Prime Areas', desc: 'From New Cairo to El Gouna Red Sea' },
    { value: '98%', unit: 'Retention', label: 'Client Retention Rate', desc: 'Long-term advisory for local and international high-net-worth clients' },
    { value: '10+', unit: 'Years', label: 'Industry Experience', desc: 'Bespoke luxury real estate consultancy founded in Cairo in 2016' }
  ];

  const pillars = [
    {
      id: 0,
      number: '01',
      title: 'Quality & Structural Integrity',
      subtitle: 'Rigorous inspection of materials, finishes, and property condition',
      desc: 'We don’t list just any property. Every villa, mansion, and penthouse in our collection is inspected for build quality, premium materials, and unobstructed views.',
      icon: Layers,
      metrics: ['Verified Build Quality', 'Premium Materials Check', 'Clear Sightlines & Privacy']
    },
    {
      id: 1,
      number: '02',
      title: 'Legal Verification & Transparency',
      subtitle: 'Clean title deeds and full legal clearance on every property',
      desc: 'Our legal team thoroughly reviews every property to confirm clean freehold ownership, zero encumbrances, transparent payment terms, and smooth handover.',
      icon: Lock,
      metrics: ['100% Verified Title Deeds', 'No Hidden Fees', 'Smooth Handover Guarantee']
    },
    {
      id: 2,
      number: '03',
      title: 'Investment & Market Insights',
      subtitle: 'Data-backed guidance on price trends and growth potential',
      desc: 'We help buyers make smart investments by advising on price appreciation, rental yields, and market trends across Egypt’s top luxury real estate markets.',
      icon: TrendingUp,
      metrics: ['Price Appreciation Data', 'Rental Yield Estimates', 'Market Liquidity Insight']
    }
  ];

  const milestones = [
    {
      year: '2016',
      badge: 'FOUNDING',
      title: 'Established in Cairo',
      desc: 'Zakaria Farid launched as a private luxury property consultancy and buyer advisory in New Cairo, pioneering design-led real estate representation.'
    },
    {
      year: '2019',
      badge: 'EXPANSION',
      title: 'Premium Property Portfolio',
      desc: 'Focused exclusively on hand-selected luxury properties valued above 25 Million EGP, with in-house legal and quality inspection teams.'
    },
    {
      year: '2022',
      badge: 'INNOVATION',
      title: 'Interactive Maps & Virtual Tours',
      desc: 'Introduced full-scale interactive satellite mapping and immersive digital walkthrough portals for local and international buyers.'
    },
    {
      year: '2025',
      badge: 'MILESTONE',
      title: 'Red Sea & North Coast Expansion',
      desc: 'Formally integrated luxury coastal properties across El Gouna, Ain Sokhna, and Ras El Hekma, crossing EGP 2.5 Billion in total sales.'
    }
  ];

  return (
    <div className="about-page">
      {/* 1. Hero Banner with Architectural Heritage Metadata */}
      <section className="about-hero-section">
        <div className="about-hero-bg">
          <img 
            src="/assets/hero-bg.webp" 
            alt="About Zakaria Farid" 
            className="about-hero-img"
          />
          <div className="about-hero-overlay" />
          <div className="about-hero-glow" />
        </div>

        <div className="container about-hero-container">
          <div className="about-hero-text">
            {/* Heritage Badge */}
            <motion.div
              className="hero-heritage-badge"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Compass size={15} className="badge-icon" />
              <span>{isAr ? 'تأسست ٢٠١٦ • القاهرة الكبرى • البحر الأحمر • الساحل الشمالي' : 'EST. 2016 • GREATER CAIRO • RED SEA • NORTH COAST'}</span>
            </motion.div>

            <motion.h1 
              className="about-hero-title"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="title-white-line">{isAr ? 'ريادة التميز في' : 'Curating Egypt’s'}</span>
              <span className="title-gold-accent">{isAr ? 'السوق العقاري الراقي' : 'Premier Living & Estates'}</span>
            </motion.h1>

            {/* Sovereign Manifesto Monograph Box */}
            <motion.div 
              className="about-hero-manifesto-card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="manifesto-decorative-quote">“</div>
              <p className="manifesto-quote-text">
                {isAr 
                  ? 'نحن لا نُبرم مجرد معاملات عقارية، بل نُمثّل أعلى معايير الجودة والشفافية. يلتزم مكتب زكريا فريد بتقديم الاستشارات المتخصصة وتدقيق وتأمين أفضل الفرص السكنية والاستثمارية في مصر.'
                  : 'We do not facilitate ordinary transactions; we deliver trust, precision, and verified quality. Zakaria Farid is a premier property consultancy—auditing, securing, and representing Egypt’s finest residential and commercial opportunities.'
                }
              </p>
              <div className="manifesto-footer-row">
                <div className="manifesto-divider" />
                <div className="manifesto-signoff">
                  <span className="signoff-dot" />
                  <span className="signoff-text">{isAr ? 'زكريا فريد — ميثاق الثقة والشفافية' : 'ZAKARIA FARID • CHARTER OF EXCELLENCE'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. 4-Column High-Impact Stats Strip */}
      <section className="about-stats-section section-padding">
        <div className="container">
          <div className="stats-strip-grid">
            {stats.map((stat, idx) => (
              <motion.div 
                key={idx} 
                className="about-stat-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
              >
                <div className="stat-num-row">
                  <span className="stat-num">{stat.value}</span>
                  <span className="stat-unit">{stat.unit}</span>
                </div>
                <div className="stat-label">{stat.label}</div>
                <p className="stat-desc">{stat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. The 3 Pillars of Curation (Interactive Protocol Tabs) */}
      <section className="curation-pillars-section section-padding">
        <div className="container">
          <div className="section-header-center">
            <span className="eyebrow-gold">THE SOVEREIGN PROTOCOL</span>
            <h2 className="section-heading">The Three Pillars of Zakaria Farid Curation</h2>
            <p className="section-subtext">
              Every estate in our private directory must pass three non-negotiable standards before representation.
            </p>
          </div>

          <div className="pillars-interactive-layout">
            {/* Left Pillar Selectors */}
            <div className="pillars-nav-list">
              {pillars.map((pillar) => {
                const isActive = activePillar === pillar.id;
                return (
                  <button
                    key={pillar.id}
                    className={`pillar-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActivePillar(pillar.id)}
                    type="button"
                  >
                    <div className="pillar-btn-left">
                      <span className="pillar-num">{pillar.number}</span>
                      <div className="pillar-tab-info">
                        <span className="pillar-tab-title">{pillar.title}</span>
                        <span className="pillar-tab-sub">{pillar.subtitle}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="pillar-chevron" />
                  </button>
                );
              })}
            </div>

            {/* Right Pillar Active Focus Card */}
            <div className="pillar-display-card">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePillar}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.28 }}
                  className="pillar-card-inner"
                >
                  <div className="pillar-card-header">
                    <span className="pillar-card-num">{pillars[activePillar].number}</span>
                    <h3 className="pillar-card-title">{pillars[activePillar].title}</h3>
                  </div>

                  <p className="pillar-card-desc">{pillars[activePillar].desc}</p>

                  <div className="pillar-metrics-grid">
                    {pillars[activePillar].metrics.map((metric, i) => (
                      <div key={i} className="pillar-metric-chip">
                        <CheckCircle2 size={15} className="metric-check-icon" />
                        <span>{metric}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Company Milestones — Connected Golden Laser Timeline Spine */}
      <section className="milestones-section section-padding">
        <div className="container">
          <div className="section-header-center">
            <span className="eyebrow-gold">CHRONOLOGY OF EXCELLENCE</span>
            <h2 className="section-heading">Our Journey Through Time</h2>
            <p className="section-subtext">
              A decade of advancing the standards of Egyptian architectural representation.
            </p>
          </div>

          <div className="timeline-spine-wrapper">
            <div className="timeline-gold-conduit" />

            <div className="timeline-milestones-list">
              {milestones.map((item, idx) => (
                <motion.div 
                  key={idx} 
                  className="timeline-milestone-node"
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -25 : 25 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.12, duration: 0.4 }}
                >
                  {/* Glowing Node Dot on the Central Conduit */}
                  <div className="timeline-beacon">
                    <div className="beacon-core" />
                    <div className="beacon-glow" />
                  </div>

                  {/* Content Card */}
                  <div className="milestone-glass-card">
                    <div className="milestone-card-top">
                      <span className="milestone-year">{item.year}</span>
                      <span className="milestone-badge">{item.badge}</span>
                    </div>
                    <h4 className="milestone-title">{item.title}</h4>
                    <p className="milestone-desc">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Sculpted Private Wealth Advisory Consultation Portal (Bottom CTA) */}
      <section className="private-advisory-portal section-padding">
        <div className="container">
          <div className="advisory-portal-card">
            <div className="portal-watermark">
              <Scale size={230} strokeWidth={1.4} />
            </div>

            <div className="portal-content">
              <div className="portal-eyebrow-row">
                <ShieldCheck size={16} className="portal-gold-icon" />
                <span className="portal-eyebrow">CONFIDENTIAL ACQUISITIONS OFFICE</span>
              </div>

              <h2 className="portal-heading">Own Your Generational Architectural Statement</h2>
              
              <p className="portal-sub">
                Connect directly with our Private Assets Director for a bespoke, unreleased portfolio presentation or discrete representation of your exceptional estate.
              </p>

              <div className="portal-actions-row">
                <button 
                  className="portal-primary-btn btn-gold"
                  onClick={() => onOpenInquiry('Private Wealth Consultation')}
                  type="button"
                >
                  <span>Request Private Consultation</span>
                  <ArrowUpRight size={15} />
                </button>

                <button 
                  className="portal-secondary-btn"
                  onClick={onNavigateToCatalog}
                  type="button"
                >
                  <Building2 size={15} />
                  <span>Explore Sovereign Directory</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .about-page {
          background: var(--bg-primary);
          min-height: 100vh;
          overflow-x: hidden;
          transition: background var(--transition-smooth);
        }

        /* 1. Hero Banner */
        .about-hero-section {
          position: relative;
          min-height: 560px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: 135px;
          padding-bottom: 2.5rem;
          overflow: hidden;
          background: var(--bg-primary);
        }

        .about-hero-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 1;
        }

        .about-hero-img {
          position: absolute;
          top: -20px;
          left: -20px;
          width: calc(100% + 40px);
          height: calc(100% + 40px);
          object-fit: cover;
          object-position: center top;
          filter: brightness(0.88) contrast(1.08);
        }

        [data-theme="light"] .about-hero-img {
          filter: brightness(0.88) contrast(1.15) saturate(1.1);
        }

        .about-hero-overlay {
          position: absolute;
          inset: 0;
        }

        [data-theme="dark"] .about-hero-overlay {
          background: linear-gradient(
            to bottom,
            rgba(10, 12, 16, 0.90) 0%,
            rgba(10, 12, 16, 0.50) 30%,
            rgba(10, 12, 16, 0.65) 70%,
            #0A0C10 100%
          );
        }

        [data-theme="light"] .about-hero-overlay {
          background: 
            radial-gradient(
              ellipse at 50% 35%,
              rgba(15, 20, 30, 0.04) 0%,
              rgba(20, 24, 32, 0.12) 60%,
              rgba(20, 24, 32, 0.28) 100%
            ),
            linear-gradient(
              to bottom,
              rgba(244, 241, 234, 0.20) 0%,
              transparent 25%,
              transparent 70%,
              #F4F1EA 100%
            );
        }

        .about-hero-glow {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 320px;
          background: radial-gradient(circle, rgba(252, 211, 77, 0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        [data-theme="light"] .about-hero-glow {
          display: none;
        }

        .about-hero-container {
          position: relative;
          z-index: 2;
          text-align: center;
          display: flex;
          justify-content: center;
        }

        .about-hero-text {
          max-width: 840px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hero-heritage-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(24px) saturate(210%) contrast(108%);
          -webkit-backdrop-filter: blur(24px) saturate(210%) contrast(108%);
          border-radius: 9999px;
          padding: 0.55rem 1.35rem;
          font-family: var(--font-heading);
          font-size: 0.78125rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #FFF0C2;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.85);
          margin-bottom: 1.5rem;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .hero-heritage-badge {
          background: rgba(10, 14, 24, 0.88);
          border: 1.5px solid rgba(221, 167, 82, 0.5);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55), 0 0 16px rgba(221, 167, 82, 0.22), inset 0 1px 1.5px rgba(255, 255, 255, 0.35);
        }

        [data-theme="dark"] .hero-heritage-badge:hover {
          border-color: var(--gold-primary);
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.6), 0 0 20px rgba(221, 167, 82, 0.35);
          transform: translateY(-1px);
        }

        [data-theme="light"] .hero-heritage-badge {
          background: rgba(255, 255, 255, 0.94);
          border: 1.5px solid rgba(184, 134, 11, 0.5);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12), inset 0 1.5px 2px #FFFFFF;
          color: #7A5200;
          text-shadow: none;
        }

        .badge-icon {
          flex-shrink: 0;
          color: var(--gold-primary, #DDA752);
          filter: drop-shadow(0 0 4px rgba(221, 167, 82, 0.8));
        }

        [data-theme="light"] .badge-icon {
          color: #B8860B;
          filter: none;
        }

        .about-hero-title {
          font-family: var(--font-heading);
          font-size: clamp(2.4rem, 4.5vw, 3.85rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.18;
          margin-bottom: 1.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          text-align: center;
        }

        .title-white-line {
          color: #FFFFFF;
          text-shadow: 0 3px 18px rgba(0, 0, 0, 0.7);
        }

        [data-theme="light"] .title-white-line {
          color: #0F172A;
          text-shadow: none;
        }

        .title-gold-accent {
          display: block;
          text-shadow: none !important;
          background: linear-gradient(
            135deg, 
            #FFFFFF 0%, 
            #FFF2C2 20%, 
            #F6D075 45%, 
            #E5A93C 75%, 
            #C48A22 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45));
        }

        [data-theme="light"] .title-gold-accent {
          background: linear-gradient(
            135deg, 
            #B8860B 0%, 
            #996515 50%, 
            #7A5200 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: none;
        }

        /* Sovereign Manifesto Monograph Box */
        .about-hero-manifesto-card {
          position: relative;
          max-width: 800px;
          width: 100%;
          margin-top: 0.5rem;
          padding: 2.25rem 2.5rem 1.75rem;
          border-radius: 24px;
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        [data-theme="dark"] .about-hero-manifesto-card {
          background: rgba(10, 14, 24, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.5), 
            0 0 20px rgba(221, 167, 82, 0.08),
            inset 0 1px 1.5px rgba(255, 255, 255, 0.25);
        }

        [data-theme="light"] .about-hero-manifesto-card {
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 
            0 16px 40px rgba(30, 24, 16, 0.08), 
            inset 0 1.5px 2px #FFFFFF;
        }

        .manifesto-decorative-quote {
          position: absolute;
          top: -16px;
          left: 50%;
          transform: translateX(-50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Georgia, serif;
          font-size: 1.75rem;
          line-height: 1;
          font-weight: 700;
        }

        [data-theme="dark"] .manifesto-decorative-quote {
          background: #0E131F;
          color: var(--gold-primary, #DDA752);
          border: 1px solid rgba(221, 167, 82, 0.5);
          box-shadow: 0 0 12px rgba(221, 167, 82, 0.3);
        }

        [data-theme="light"] .manifesto-decorative-quote {
          background: #FFFFFF;
          color: #B8860B;
          border: 1px solid rgba(184, 134, 11, 0.4);
          box-shadow: 0 4px 12px rgba(30, 24, 16, 0.08);
        }

        .manifesto-quote-text {
          font-size: 1.0625rem;
          line-height: 1.85;
          letter-spacing: -0.01em;
          font-weight: 500;
          margin: 0;
          padding-top: 0.25rem;
        }

        [data-theme="dark"] .manifesto-quote-text {
          color: #E2E8F0;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        [data-theme="light"] .manifesto-quote-text {
          color: #1E293B;
        }

        .manifesto-footer-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
        }

        .manifesto-divider {
          width: 60px;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, var(--gold-primary, #DDA752), transparent);
        }

        [data-theme="light"] .manifesto-divider {
          background: linear-gradient(90deg, transparent, #B8860B, transparent);
        }

        .manifesto-signoff {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .signoff-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold-primary, #DDA752);
          box-shadow: 0 0 6px var(--gold-primary, #DDA752);
        }

        [data-theme="light"] .signoff-dot {
          background: #B8860B;
          box-shadow: none;
        }

        .signoff-text {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: var(--gold-primary, #DDA752);
          text-transform: uppercase;
        }

        [data-theme="light"] .signoff-text {
          color: #8C6207;
        }

        /* 2. Stats Strip */
        .about-stats-section {
          position: relative;
          z-index: 3;
          margin-top: -2.75rem;
          padding-bottom: 4.5rem;
        }

        .stats-strip-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .about-stat-card {
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border-radius: 22px;
          padding: 2.25rem 1.6rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .about-stat-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.06) 30%,
            rgba(18, 24, 38, 0.42) 65%,
            rgba(10, 14, 24, 0.65) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.38), inset 0 1.5px 2px rgba(255, 255, 255, 0.65);
        }

        [data-theme="light"] .about-stat-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.65) 0%,
            rgba(255, 255, 255, 0.30) 35%,
            rgba(255, 255, 255, 0.48) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.75);
          box-shadow: 
            0 16px 40px rgba(0, 0, 0, 0.07),
            0 2px 8px rgba(0, 0, 0, 0.03),
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(0, 0, 0, 0.04);
        }

        .about-stat-card:hover {
          border-color: var(--gold-primary);
          transform: translateY(-3px);
        }

        .stat-num-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .stat-num {
          font-family: var(--font-heading);
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--gold-primary);
          line-height: 1;
        }

        .stat-unit {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
        }

        [data-theme="dark"] .stat-unit {
          color: #ffffff;
        }

        [data-theme="light"] .stat-unit {
          color: #0D1117;
        }

        .stat-label {
          font-family: var(--font-heading);
          font-size: 0.9375rem;
          font-weight: 700;
          margin-top: 0.25rem;
        }

        [data-theme="dark"] .stat-label {
          color: #ffffff;
        }

        [data-theme="light"] .stat-label {
          color: #0D1117;
        }

        .stat-desc {
          font-size: 0.8125rem;
          line-height: 1.5;
        }

        [data-theme="dark"] .stat-desc {
          color: #8E9BAE;
        }

        [data-theme="light"] .stat-desc {
          color: #64748B;
        }

        /* Center Section Headers */
        .section-header-center {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 3.5rem;
        }

        .eyebrow-gold {
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: var(--gold-primary);
          text-transform: uppercase;
          margin-bottom: 0.75rem;
          display: block;
        }

        .section-heading {
          font-family: var(--font-heading);
          font-size: clamp(2.15rem, 3.5vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.18;
          margin-bottom: 0.85rem;
        }

        [data-theme="dark"] .section-heading {
          color: #ffffff;
        }

        [data-theme="light"] .section-heading {
          color: #0D1117;
        }

        .section-subtext {
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        [data-theme="dark"] .section-subtext {
          color: #8E9BAE;
        }

        [data-theme="light"] .section-subtext {
          color: #64748B;
        }

        /* 3. Curation Pillars Interactive */
        .curation-pillars-section {
          background: var(--bg-primary);
        }

        .pillars-interactive-layout {
          display: grid;
          grid-template-columns: 1fr 1.25fr;
          gap: 2rem;
          align-items: stretch;
        }

        .pillars-nav-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pillar-tab-btn {
          border-radius: 18px;
          padding: 1.35rem 1.6rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-smooth);
          color: inherit;
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
        }

        [data-theme="dark"] .pillar-tab-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        }

        [data-theme="dark"] .pillar-tab-btn:hover {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(221, 167, 82, 0.4);
          transform: translateX(3px);
        }

        [data-theme="dark"] .pillar-tab-btn.active {
          background: linear-gradient(135deg, rgba(221, 167, 82, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%);
          border-color: #DDA752;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), inset 0 1px 1.5px rgba(255, 255, 255, 0.45);
        }

        [data-theme="light"] .pillar-tab-btn {
          background: rgba(255, 255, 255, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
        }

        [data-theme="light"] .pillar-tab-btn:hover {
          background: rgba(255, 255, 255, 0.90);
          border-color: rgba(184, 134, 11, 0.35);
          transform: translateX(3px);
        }

        [data-theme="light"] .pillar-tab-btn.active {
          background: #FFFFFF;
          border-color: var(--gold-primary);
          box-shadow: 0 10px 28px rgba(197, 142, 54, 0.16), inset 0 1px 2px #FFFFFF;
        }

        .pillar-btn-left {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .pillar-num {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--gold-primary);
        }

        [data-theme="light"] .pillar-num {
          color: #B8860B;
        }

        .pillar-tab-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .pillar-tab-title {
          font-family: var(--font-heading);
          font-size: 1rem;
          font-weight: 700;
        }

        [data-theme="dark"] .pillar-tab-title {
          color: #ffffff;
        }

        [data-theme="light"] .pillar-tab-title {
          color: #0D1117;
        }

        .pillar-tab-sub {
          font-size: 0.75rem;
        }

        [data-theme="dark"] .pillar-tab-sub {
          color: #8E9BAE;
        }

        [data-theme="light"] .pillar-tab-sub {
          color: #64748B;
        }

        .pillar-chevron {
          transition: transform var(--transition-fast), color var(--transition-fast);
          flex-shrink: 0;
        }

        [data-theme="dark"] .pillar-chevron {
          color: #8E9BAE;
        }

        [data-theme="light"] .pillar-chevron {
          color: #94A3B8;
        }

        .pillar-tab-btn.active .pillar-chevron {
          color: var(--gold-primary);
          transform: translateX(4px);
        }

        /* Right Pillar Focus Card (sidebar-radar-card glass styling) */
        .pillar-display-card {
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border-radius: 24px;
          padding: 2.75rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .pillar-display-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55);
        }

        [data-theme="light"] .pillar-display-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.52) 0%,
            rgba(255, 255, 255, 0.30) 50%,
            rgba(255, 255, 255, 0.42) 100%
          );
          backdrop-filter: blur(16px) saturate(190%) contrast(104%);
          -webkit-backdrop-filter: blur(16px) saturate(190%) contrast(104%);
          border: 1px solid rgba(255, 255, 255, 0.70);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.07), inset 0 1.5px 2px #FFFFFF;
        }

        .pillar-card-inner {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .pillar-card-header {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .pillar-card-num {
          font-family: var(--font-heading);
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1;
          color: var(--gold-primary);
        }

        [data-theme="light"] .pillar-card-num {
          color: #B8860B;
        }

        .pillar-card-title {
          font-family: var(--font-heading);
          font-size: 1.65rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 1.25;
        }

        .pillar-card-desc {
          font-size: 1rem;
          color: var(--text-secondary);
          line-height: 1.75;
        }

        .pillar-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.85rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-subtle);
        }

        .pillar-metric-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0.85rem 1.15rem;
          border-radius: 14px;
          font-size: 0.84rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .pillar-metric-chip {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #E2E8F0;
        }

        [data-theme="light"] .pillar-metric-chip {
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 2px 8px rgba(30, 24, 16, 0.03);
          color: #1E293B;
        }

        .metric-check-icon {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        [data-theme="light"] .metric-check-icon {
          color: #B8860B;
        }

        /* 4. Company Milestones Timeline */
        .milestones-section {
          background: var(--bg-primary);
        }

        .timeline-spine-wrapper {
          position: relative;
          max-width: 900px;
          margin: 0 auto;
        }

        .timeline-gold-conduit {
          position: absolute;
          top: 20px;
          bottom: 20px;
          left: 20px;
          width: 2px;
          background: linear-gradient(180deg, var(--gold-primary) 0%, rgba(221, 167, 82, 0.15) 100%);
          z-index: 1;
        }

        .timeline-milestones-list {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .timeline-milestone-node {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 2rem;
          z-index: 2;
        }

        .timeline-beacon {
          position: relative;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .beacon-core {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--gold-primary);
          box-shadow: 0 0 12px var(--gold-glow);
          z-index: 2;
        }

        .beacon-glow {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(197, 142, 54, 0.25);
          border: 1px solid var(--gold-primary);
          animation: pulseRing 2.4s infinite;
        }

        @keyframes pulseRing {
          0% { transform: scale(0.7); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        .milestone-glass-card {
          flex: 1;
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border-radius: 20px;
          padding: 1.85rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .milestone-glass-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.55);
        }

        [data-theme="dark"] .milestone-glass-card:hover {
          border-color: var(--gold-primary);
          transform: translateY(-2px);
        }

        [data-theme="light"] .milestone-glass-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.52) 0%,
            rgba(255, 255, 255, 0.30) 50%,
            rgba(255, 255, 255, 0.42) 100%
          );
          backdrop-filter: blur(16px) saturate(190%) contrast(104%);
          -webkit-backdrop-filter: blur(16px) saturate(190%) contrast(104%);
          border: 1px solid rgba(255, 255, 255, 0.70);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.07), inset 0 1.5px 2px #FFFFFF;
        }

        [data-theme="light"] .milestone-glass-card:hover {
          border-color: rgba(184, 134, 11, 0.35);
          transform: translateY(-2px);
        }

        .milestone-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .milestone-year {
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--gold-primary);
          letter-spacing: -0.01em;
        }

        [data-theme="light"] .milestone-year {
          color: #B8860B;
        }

        .milestone-badge {
          font-family: var(--font-heading);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--gold-primary);
          background: rgba(221, 167, 82, 0.12);
          border: 1px solid var(--gold-border);
          padding: 0.2rem 0.65rem;
          border-radius: 9999px;
        }

        [data-theme="light"] .milestone-badge {
          color: #B8860B;
        }

        .milestone-title {
          font-family: var(--font-heading);
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .milestone-desc {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          line-height: 1.65;
        }

        /* 5. Sculpted Private Wealth Advisory Consultation Portal (Bottom CTA) */
        .private-advisory-portal {
          background: var(--bg-primary);
          padding-bottom: 6rem;
        }

        .advisory-portal-card {
          position: relative;
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border-radius: 28px;
          padding: 4.25rem 3.5rem;
          overflow: hidden;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .advisory-portal-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 
            0 24px 60px rgba(0, 0, 0, 0.5), 
            0 0 35px rgba(252, 211, 77, 0.18),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65);
        }

        [data-theme="light"] .advisory-portal-card {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.55) 0%,
            rgba(255, 255, 255, 0.32) 50%,
            rgba(255, 255, 255, 0.45) 100%
          );
          backdrop-filter: blur(18px) saturate(190%) contrast(104%);
          -webkit-backdrop-filter: blur(18px) saturate(190%) contrast(104%);
          border: 1px solid rgba(255, 255, 255, 0.75);
          box-shadow: 
            0 24px 60px rgba(15, 23, 42, 0.09),
            0 0 35px rgba(184, 133, 48, 0.12),
            inset 0 2px 2.5px #FFFFFF;
        }

        .portal-watermark {
          position: absolute;
          right: 2rem;
          bottom: -15px;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .portal-watermark {
          color: rgba(221, 167, 82, 0.20);
          filter: drop-shadow(0 0 25px rgba(221, 167, 82, 0.25));
        }

        [data-theme="light"] .portal-watermark {
          color: rgba(197, 154, 69, 0.20);
          filter: drop-shadow(0 4px 14px rgba(197, 154, 69, 0.15));
        }

        .portal-content {
          position: relative;
          z-index: 2;
          max-width: 680px;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .portal-eyebrow-row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .portal-gold-icon {
          color: var(--gold-primary);
        }

        [data-theme="light"] .portal-gold-icon {
          color: #B8860B;
        }

        .portal-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: var(--gold-primary);
        }

        [data-theme="light"] .portal-eyebrow {
          color: #B8860B;
        }

        .portal-heading {
          font-family: var(--font-heading);
          font-size: clamp(2.25rem, 3.5vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.15;
        }

        [data-theme="dark"] .portal-heading {
          color: #ffffff;
        }

        [data-theme="light"] .portal-heading {
          color: #0D1117;
        }

        .portal-sub {
          font-size: 0.9375rem;
          line-height: 1.7;
        }

        [data-theme="dark"] .portal-sub {
          color: #C7D2DF;
        }

        [data-theme="light"] .portal-sub {
          color: #475569;
        }

        .portal-actions-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }

        .portal-primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.9rem 2.25rem;
          font-size: 0.9375rem;
          font-weight: 700;
          border-radius: 9999px;
          cursor: pointer;
        }

        .portal-secondary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.9rem 2rem;
          font-size: 0.9375rem;
          font-weight: 700;
          border-radius: 9999px;
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        [data-theme="dark"] .portal-secondary-btn {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        [data-theme="light"] .portal-secondary-btn {
          background: rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #0D1117;
        }

        .portal-secondary-btn:hover {
          border-color: var(--gold-primary);
          color: var(--gold-primary);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .stats-strip-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .pillars-interactive-layout {
            grid-template-columns: 1fr;
          }
          .advisory-portal-card {
            padding: 3rem 2rem;
          }
        }

        @media (max-width: 640px) {
          .stats-strip-grid {
            grid-template-columns: 1fr;
          }
          .portal-actions-row {
            flex-direction: column;
            width: 100%;
          }
          .portal-primary-btn, .portal-secondary-btn {
            width: 100%;
            justify-content: center;
          }
          .timeline-milestone-node {
            gap: 1.25rem;
          }
          .milestone-glass-card {
            padding: 1.25rem 1.4rem;
          }
        }
      `}</style>
    </div>
  );
};
