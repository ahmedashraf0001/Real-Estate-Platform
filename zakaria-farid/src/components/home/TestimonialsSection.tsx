'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Sparkles, Building, Lock } from 'lucide-react';

const PATRON_TESTIMONIALS = [
  {
    id: 't-1',
    name: 'Karim El-Sewedy',
    role: 'Managing Director, Infrastructure Capital',
    acquisition: 'Katameya Dunes Signature Palace',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    quote: 'Zakaria Farid understood our need for absolute discretion and structural authenticity. The engineering audit and private acquisition process was nothing short of an architectural masterpiece.',
    year: '2025'
  },
  {
    id: 't-2',
    name: 'Nour Mansour',
    role: 'Principal, Contemporary Design Atelier',
    acquisition: 'Palm Hills Sanctuary Villa',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    quote: 'The only real estate advisory in Egypt that treats architecture as high art. The private viewing experience, VRF technical audit, and finishing provenance were impeccably handled.',
    year: '2024'
  },
  {
    id: 't-3',
    name: 'Sultan Al-Otaibi',
    role: 'Family Office Trustee (Riyadh & Cairo)',
    acquisition: 'El Gouna Waterfront Estate',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    quote: 'Representing generational capital requires absolute precision. Zakaria Farid secured an off-market coastal sanctuary with total legal and architectural sovereignty.',
    year: '2025'
  }
];

interface TestimonialsSectionProps {
  onOpenListEstate: () => void;
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ onOpenListEstate }) => {
  return (
    <section className="testimonials-section section-padding">
      <div className="testimonials-horizon-glow" />
      
      <div className="container">
        {/* Section Header */}
        <div className="section-header text-center">
          <span className="eyebrow">
            <Sparkles size={13} className="sparkle-gold" />
            <span>CLIENT REVIEWS</span>
          </span>
          <h2 className="section-title">What Our Clients Say</h2>
          <p className="section-subtitle">
            Trusted by buyers, sellers, and investors across Egypt's luxury real estate market.
          </p>
        </div>

        {/* Testimonials 3-Column Sovereign Grid */}
        <div className="patron-grid">
          {PATRON_TESTIMONIALS.map((t, idx) => (
            <motion.div 
              key={t.id} 
              className="patron-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
            >
              {/* Top Row: Quote Glyph & Verified Badge */}
              <div className="patron-card-top">
                <div className="patron-quote-mark">“</div>
                <div className="patron-verified-pill">
                  <ShieldCheck size={12} className="shield-icon" />
                  <span>Verified Client</span>
                </div>
              </div>

              {/* Quote Text */}
              <p className="patron-quote-text">
                {t.quote}
              </p>

              {/* Acquisition Tag */}
              <div className="patron-acquisition-tag">
                <Building size={12} className="tag-building-icon" />
                <span>{t.acquisition}</span>
              </div>

              {/* Author Info */}
              <div className="patron-author-row">
                <img src={t.avatar} alt={t.name} className="patron-avatar" />
                <div className="patron-meta">
                  <h4 className="patron-name">{t.name}</h4>
                  <span className="patron-role">{t.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Panoramic Pre-Footer Sovereign Consignment Banner */}
        <div className="seller-banner">
          <img 
            src="/assets/seller-banner-raw.png" 
            alt="Own an Architectural Statement" 
            className="seller-banner-bg"
          />
          <div className="seller-banner-overlay" />
          
          <div className="seller-banner-content">
            <div className="seller-text-wrap">
              <div className="seller-eyebrow-row">
                <span className="seller-eyebrow">LIST YOUR PROPERTY WITH US</span>
                <span className="seller-confidential-tag">
                  <Lock size={12} />
                  <span>100% Confidential</span>
                </span>
              </div>

              <h2 className="seller-title">Looking to Sell or List Your Property?</h2>
              <p className="seller-desc">
                List your property on Egypt's premier luxury real estate platform. Reach serious buyers, private investors, and family offices actively looking in your area.
              </p>

              <div className="seller-stats-strip">
                <div className="seller-stat-item">
                  <span className="stat-val">48 Hours</span>
                  <span className="stat-lbl">Private Placement</span>
                </div>
                <div className="seller-stat-sep" />
                <div className="seller-stat-item">
                  <span className="stat-val">EGP 2.5B+</span>
                  <span className="stat-lbl">Transactions Closed</span>
                </div>
              </div>
            </div>

            <button 
              className="seller-cta-btn"
              onClick={onOpenListEstate}
              type="button"
            >
              <span>List Your Property</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .testimonials-section {
          background: transparent;
          position: relative;
        }

        .testimonials-horizon-glow {
          position: absolute;
          top: 40px;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 1050px;
          height: 320px;
          background: radial-gradient(
            ellipse at center,
            rgba(221, 167, 82, 0.08) 0%,
            rgba(221, 167, 82, 0.015) 45%,
            transparent 70%
          );
          pointer-events: none;
          filter: blur(55px);
          z-index: 1;
        }

        .testimonials-section .container {
          position: relative;
          z-index: 2;
        }

        .section-header {
          margin-bottom: 3.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .section-title {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 3.5vw, 2.75rem);
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          margin: 0;
        }

        .section-subtitle {
          font-size: 1rem;
          color: var(--text-secondary);
          max-width: 600px;
          line-height: 1.6;
          margin: 0;
        }

        /* 3-Column Sovereign Patron Grid */
        .patron-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.75rem;
          margin-bottom: 4.5rem;
        }

        .patron-card {
          border-radius: 24px;
          padding: 2.25rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          transition: all var(--transition-smooth);
          position: relative;
        }

        [data-theme="dark"] .patron-card {
          background: rgba(10, 14, 24, 0.65);
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.25);
        }

        [data-theme="light"] .patron-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 
            0 16px 40px rgba(30, 24, 16, 0.06), 
            inset 0 1.5px 2px #FFFFFF;
        }

        .patron-card:hover {
          border-color: var(--gold-primary);
          transform: translateY(-4px);
        }

        [data-theme="dark"] .patron-card:hover {
          background: rgba(15, 20, 32, 0.85);
          box-shadow: 0 24px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(221, 167, 82, 0.15);
        }

        [data-theme="light"] .patron-card:hover {
          background: #FFFFFF;
          box-shadow: 0 20px 48px rgba(30, 24, 16, 0.10), 0 0 16px rgba(184, 133, 48, 0.15);
        }

        .patron-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .patron-quote-mark {
          font-family: Georgia, serif;
          font-size: 2.25rem;
          line-height: 1;
          color: var(--gold-primary);
          opacity: 0.9;
          font-weight: 700;
        }

        .patron-verified-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        [data-theme="dark"] .patron-verified-pill {
          background: rgba(16, 185, 129, 0.12);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        [data-theme="light"] .patron-verified-pill {
          background: #ECFDF5;
          color: #059669;
          border: 1px solid #A7F3D0;
        }

        .patron-quote-text {
          font-size: 0.9375rem;
          line-height: 1.75;
          color: var(--text-secondary);
          flex-grow: 1;
          margin: 0;
          font-weight: 500;
        }

        .patron-acquisition-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--gold-primary);
        }

        [data-theme="dark"] .patron-acquisition-tag {
          background: rgba(221, 167, 82, 0.1);
          border: 1px solid rgba(221, 167, 82, 0.25);
        }

        [data-theme="light"] .patron-acquisition-tag {
          background: #FFF9EB;
          border: 1px solid rgba(184, 134, 11, 0.2);
          color: #8C6207;
        }

        .tag-building-icon {
          flex-shrink: 0;
        }

        .patron-author-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-top: 1.15rem;
          border-top: 1px solid var(--border-subtle);
        }

        .patron-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--gold-primary);
        }

        .patron-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .patron-name {
          font-size: 0.9375rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .patron-role {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 600;
        }

        /* Panoramic Sovereign Consignment Banner */
        .seller-banner {
          position: relative;
          min-height: 260px;
          overflow: hidden;
          border-radius: 28px;
          display: flex;
          align-items: center;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .seller-banner {
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 1.5px rgba(255, 255, 255, 0.3);
        }

        [data-theme="light"] .seller-banner {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.92) 0%,
            rgba(253, 248, 238, 0.88) 50%,
            rgba(247, 238, 220, 0.80) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 20px 50px rgba(30, 24, 16, 0.08), inset 0 1.5px 2px #FFFFFF;
        }

        .seller-banner-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 30%;
        }

        [data-theme="light"] .seller-banner-bg {
          opacity: 0.07;
          mix-blend-mode: multiply;
        }

        .seller-banner-overlay {
          position: absolute;
          inset: 0;
        }

        [data-theme="dark"] .seller-banner-overlay {
          background: linear-gradient(
            to right,
            rgba(10, 12, 16, 0.96) 0%,
            rgba(10, 12, 16, 0.82) 50%,
            rgba(10, 12, 16, 0.35) 100%
          );
        }

        [data-theme="light"] .seller-banner-overlay {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(255, 255, 255, 0.45) 60%,
            rgba(250, 242, 226, 0.35) 100%
          );
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .seller-banner-content {
          position: relative;
          z-index: 2;
          padding: 3.5rem 4rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 2.5rem;
        }

        .seller-text-wrap {
          max-width: 680px;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .seller-eyebrow-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .seller-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--gold-primary);
          text-transform: uppercase;
        }

        .seller-confidential-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.625rem;
          font-weight: 800;
          background: rgba(221, 167, 82, 0.15);
          color: var(--gold-primary);
          border: 1px solid rgba(221, 167, 82, 0.3);
        }

        .seller-title {
          font-family: var(--font-heading);
          font-size: clamp(1.85rem, 3vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0;
        }

        [data-theme="dark"] .seller-title {
          color: #ffffff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
        }

        [data-theme="light"] .seller-title {
          color: #0D1117;
        }

        .seller-desc {
          font-size: 0.9375rem;
          line-height: 1.6;
          margin: 0;
          color: var(--text-secondary);
        }

        .seller-stats-strip {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding-top: 0.5rem;
        }

        .seller-stat-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-val {
          font-family: var(--font-heading);
          font-size: 1.125rem;
          font-weight: 800;
          color: var(--gold-primary);
        }

        .stat-lbl {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .seller-stat-sep {
          width: 1px;
          height: 28px;
          background: rgba(221, 167, 82, 0.25);
        }

        .seller-cta-btn {
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 1rem 2.25rem;
          font-size: 0.9375rem;
          font-weight: 800;
          background: linear-gradient(135deg, #FFF4D4 0%, var(--gold-primary, #DDA752) 50%, #9E7226 100%);
          color: #0A0C10;
          border-radius: 9999px;
          flex-shrink: 0;
          border: none;
          box-shadow: 0 4px 20px rgba(221, 167, 82, 0.35);
          cursor: pointer;
          transition: all var(--transition-smooth);
        }

        .seller-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(221, 167, 82, 0.5);
        }

        @media (max-width: 1024px) {
          .patron-grid {
            grid-template-columns: 1fr;
          }
          .seller-banner-content {
            flex-direction: column;
            align-items: flex-start;
            padding: 2.5rem 2rem;
          }
          .seller-cta-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
};

export default TestimonialsSection;
