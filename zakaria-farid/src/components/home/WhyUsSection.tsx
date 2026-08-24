'use client';
import React from 'react';
import { ShieldCheck, Compass, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface WhyUsSectionProps {
  locale?: string;
}

export const WhyUsSection: React.FC<WhyUsSectionProps> = ({ locale = 'en' }) => {
  const isAr = locale === 'ar';
  const pillars = [
    {
      number: '01',
      icon: ShieldCheck,
      title: 'Verified Legal & Quality Inspection',
      description: 'Every property is thoroughly inspected and legally verified — confirming clean title deeds, structural quality, and zero hidden fees before you buy.',
      tag: 'Verified Freehold Titles'
    },
    {
      number: '02',
      icon: Compass,
      title: 'Interactive Location & Maps',
      description: 'Explore properties with detailed satellite maps, neighborhood views, and virtual walkthroughs — so you know exactly what you\'re getting before you visit.',
      tag: 'Satellite & Street Views'
    },
    {
      number: '03',
      icon: TrendingUp,
      title: 'Investment & Market Guidance',
      description: 'Our team helps you understand property values, market trends, and growth potential across Egypt\'s top real estate zones — so you invest with confidence.',
      tag: 'Smart Investment'
    }
  ];

  return (
    <section className="why-us-section section-padding">
      <div className="why-subtle-glow" />

      <div className="container">
        {/* Section Header */}
        <div className="why-header">
          <div className="section-eyebrow-pill">
            <span className="eyebrow-dot" />
            <span>{isAr ? 'معيار آل زكريا السيادي' : 'THE AL ZAKARIA STANDARD'}</span>
          </div>
          <h2 className="why-title">
            <span>{isAr ? 'لماذا تختار ' : 'Why Choose '}</span>
            <span className="title-serif-accent">{isAr ? 'آل زكريا' : 'AL ZAKARIA'}</span>
          </h2>
          <p className="why-subtitle">
            {isAr 
              ? 'ثلاثة التزامات جوهرية ترسم ميثاقنا في التدقيق والاختيار والتمثيل العقاري الحصري.'
              : 'Three core commitments that guide how we find, verify, and present every property in our collection.'}
          </p>
        </div>

        {/* 3 Refined Minimalist Cards */}
        <div className="why-pillars-grid">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.number}
                className="why-pillar-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.1 }}
                whileHover={{ y: -3 }}
              >
                <div className="pillar-top-row">
                  <span className="pillar-number">{pillar.number}</span>
                  <div className="pillar-icon-wrap">
                    <Icon size={20} className="pillar-icon" />
                  </div>
                </div>

                <div className="pillar-content">
                  <h3 className="pillar-heading">{pillar.title}</h3>
                  <p className="pillar-body">{pillar.description}</p>
                </div>

                <div className="pillar-footer">
                  <span className="pillar-tag">{pillar.tag}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style>{`
        .why-us-section {
          background: var(--bg-primary);
          position: relative;
          padding-top: 5rem;
          padding-bottom: 5.5rem;
          transition: background var(--transition-smooth);
        }

        .why-subtle-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          max-width: 900px;
          height: 280px;
          background: radial-gradient(
            ellipse at center,
            rgba(221, 167, 82, 0.04) 0%,
            transparent 70%
          );
          pointer-events: none;
          filter: blur(50px);
          z-index: 1;
        }

        .why-us-section .container {
          position: relative;
          z-index: 2;
        }

        .why-header {
          text-align: center;
          max-width: 680px;
          margin: 0 auto 3.5rem;
        }

        .why-eyebrow {
          display: block;
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--gold-primary);
          text-transform: uppercase;
          margin-bottom: 0.75rem;
        }

        .why-title {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 3.2vw, 2.75rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          color: var(--text-primary);
          line-height: 1.2;
          margin-bottom: 1rem;
        }

        [data-theme="dark"] .why-title {
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85);
        }

        .why-subtitle {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* 3-Column Clean Grid */
        .why-pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.75rem;
        }

        .why-pillar-card {
          background: var(--bg-glass-card);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--border-glass);
          box-shadow: var(--shadow-glass);
          border-radius: 18px;
          padding: 2.25rem 2rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1.5rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        [data-theme="dark"] .why-pillar-card {
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 
            0 16px 36px rgba(0, 0, 0, 0.3),
            inset 0 1px 1px rgba(255, 255, 255, 0.35);
        }

        [data-theme="light"] .why-pillar-card {
          background: rgba(255, 255, 255, 0.58);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 
            0 16px 40px rgba(0, 0, 0, 0.07),
            0 2px 8px rgba(0, 0, 0, 0.03),
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(0, 0, 0, 0.03);
        }

        .why-pillar-card:hover {
          border-color: var(--gold-primary);
          transform: translateY(-4px);
        }

        [data-theme="dark"] .why-pillar-card:hover {
          background: rgba(255, 255, 255, 0.055);
          box-shadow: 
            0 20px 45px rgba(0, 0, 0, 0.45),
            0 0 16px rgba(221, 167, 82, 0.15),
            inset 0 1px 1.5px rgba(255, 255, 255, 0.5);
        }

        [data-theme="light"] .why-pillar-card:hover {
          background: rgba(255, 255, 255, 0.94);
          border-color: var(--gold-primary);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.10),
            0 0 16px rgba(184, 133, 48, 0.18),
            inset 0 1.5px 2px #FFFFFF;
        }

        .pillar-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pillar-number {
          font-family: var(--font-heading);
          font-size: 0.875rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--gold-primary);
          opacity: 0.95;
        }

        .pillar-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: rgba(197, 142, 54, 0.1);
          border: 1px solid var(--gold-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pillar-icon {
          color: var(--gold-primary);
        }

        .pillar-content {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .pillar-heading {
          font-family: var(--font-heading);
          font-size: 1.1875rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.3;
        }

        [data-theme="dark"] .pillar-heading {
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
        }

        .pillar-body {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .pillar-footer {
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-subtle);
        }

        .pillar-tag {
          display: inline-block;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--gold-primary);
          background: rgba(197, 142, 54, 0.08);
          border: 1px solid var(--gold-border);
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
        }

        @media (max-width: 900px) {
          .why-pillars-grid {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
          .why-pillar-card {
            padding: 1.75rem 1.5rem;
          }
          .why-header {
            margin-bottom: 2.5rem;
          }
        }
      `}</style>
    </section>
  );
};
