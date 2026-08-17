'use client';
import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

// Static testimonial content — not stored in DB (no testimonials table)
const TESTIMONIALS = [
  {
    id: 't-1',
    name: 'Karim El-Sewedy',
    role: 'Managing Director, Infrastructure Capital',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    comment: 'Zakaria Farid understood our need for absolute discretion and structural authenticity. The property acquisition was nothing short of an architectural sculpture experience.',
    rating: 5
  },
  {
    id: 't-2',
    name: 'Nour Mansour',
    role: 'Principal, Contemporary Design Atelier',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    comment: 'The only real estate platform in Egypt that treats architecture as high art. The private viewing experience was impeccable.',
    rating: 5
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
        <div className="section-header">
          <span className="eyebrow">DISTINGUISHED OPINIONS</span>
          <h2 className="section-title">Patron Testimonials</h2>
        </div>

        {/* Testimonials 2-Column Grid */}
        <div className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.id} className="testimonial-card">
              {/* Star Rating */}
              <div className="star-rating">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} size={15} className="star-icon filled" />
                ))}
              </div>

              {/* Quote Text */}
              <p className="testimonial-comment">{t.comment}</p>

              {/* Author Info */}
              <div className="author-row">
                <img src={t.avatar} alt={t.name} className="author-avatar" />
                <div className="author-meta">
                  <h4 className="author-name">{t.name}</h4>
                  <span className="author-role">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Panoramic Pre-Footer Seller Banner */}
        <div className="seller-banner">
          <img 
            src="/assets/seller-banner-raw.png" 
            alt="Own an Architectural Statement" 
            className="seller-banner-bg"
          />
          <div className="seller-banner-overlay" />
          
          <div className="seller-banner-content">
            <div className="seller-text-wrap">
              <h2 className="seller-title">Own an Architectural Statement?</h2>
              <p className="seller-desc">
                List your luxury asset on Egypt's premier digital gallery. Access private institutional capital and discerning sovereign buyers.
              </p>
            </div>
            <button 
              className="seller-cta-btn"
              onClick={onOpenListEstate}
            >
              List Your Estate
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
          top: 30px;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 1050px;
          height: 320px;
          background: radial-gradient(
            ellipse at center,
            rgba(221, 167, 82, 0.065) 0%,
            rgba(221, 167, 82, 0.012) 45%,
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
          margin-bottom: 2.5rem;
        }

        .section-title {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 3.5vw, 2.75rem);
          font-weight: 800;
          color: var(--text-primary);
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
          margin-bottom: 4.5rem;
        }

        .testimonial-card {
          background: var(--bg-glass-card);
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border: 1px solid var(--border-glass);
          box-shadow: var(--shadow-glass);
          border-radius: 20px;
          padding: 2.5rem 2.25rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .testimonial-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4);
        }

        [data-theme="light"] .testimonial-card {
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

        .testimonial-card:hover {
          border-color: var(--gold-primary);
          transform: translateY(-3px);
        }

        [data-theme="dark"] .testimonial-card:hover {
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.5);
        }

        [data-theme="light"] .testimonial-card:hover {
          background: rgba(255, 255, 255, 0.94);
          border-color: var(--gold-primary);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.10), 0 0 16px rgba(184, 133, 48, 0.18), inset 0 1.5px 2px #FFFFFF;
        }

        .star-rating {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .star-icon.filled {
          color: var(--gold-primary);
          fill: var(--gold-primary);
        }

        .testimonial-comment {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          line-height: 1.65;
          font-style: italic;
          flex-grow: 1;
        }

        .author-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border-subtle);
        }

        .author-avatar {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-full);
          object-fit: cover;
          border: 2px solid var(--gold-border);
        }

        .author-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .author-role {
          font-size: 0.8125rem;
          color: var(--gold-primary);
          font-weight: 600;
        }

        /* Panoramic Seller Banner */
        .seller-banner {
          position: relative;
          min-height: 240px;
          overflow: hidden;
          border-radius: 24px;
          display: flex;
          align-items: center;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .seller-banner {
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.3);
        }

        [data-theme="light"] .seller-banner {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.90) 0%,
            rgba(253, 248, 238, 0.85) 50%,
            rgba(247, 238, 220, 0.75) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 20px 50px rgba(0, 0, 0, 0.06), 
            0 2px 8px rgba(0, 0, 0, 0.02),
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(0, 0, 0, 0.03);
        }

        .seller-banner-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 30%;
          transition: opacity var(--transition-smooth);
        }

        [data-theme="dark"] .seller-banner-bg {
          opacity: 1;
        }

        [data-theme="light"] .seller-banner-bg {
          opacity: 0.08;
          mix-blend-mode: multiply;
        }

        .seller-banner-overlay {
          position: absolute;
          inset: 0;
        }

        [data-theme="dark"] .seller-banner-overlay {
          background: linear-gradient(
            to right,
            rgba(10, 12, 16, 0.94) 0%,
            rgba(10, 12, 16, 0.78) 50%,
            rgba(10, 12, 16, 0.30) 100%
          );
        }

        [data-theme="light"] .seller-banner-overlay {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.75) 0%,
            rgba(255, 255, 255, 0.40) 60%,
            rgba(250, 242, 226, 0.35) 100%
          );
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
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
        }

        .seller-title {
          font-family: var(--font-heading);
          font-size: clamp(2rem, 3.2vw, 2.75rem);
          font-weight: 800;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
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
          line-height: 1.55;
        }

        [data-theme="dark"] .seller-desc {
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
        }

        [data-theme="light"] .seller-desc {
          color: #334155;
        }

        .seller-cta-btn {
          white-space: nowrap;
          padding: 0.9375rem 2rem;
          font-size: 0.9375rem;
          font-weight: 700;
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 45%, #C59A45 100%);
          color: #0A0C10;
          border-radius: 12px;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 18px rgba(197, 154, 69, 0.25), inset 0 1px 1.5px rgba(255, 255, 255, 0.7);
          transition: all var(--transition-smooth);
        }

        .seller-cta-btn:hover {
          background: linear-gradient(135deg, #FFF0C8 0%, #E5BE7A 45%, #D4AF37 100%);
          box-shadow: 0 6px 24px rgba(197, 154, 69, 0.38), inset 0 1px 1.5px #FFFFFF;
          transform: translateY(-2px);
        }

        @media (max-width: 900px) {
          .testimonials-grid {
            grid-template-columns: 1fr;
          }
          .seller-banner-content {
            flex-direction: column;
            align-items: flex-start;
            padding: 2.5rem 2rem;
          }
          .seller-cta-btn {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
};
