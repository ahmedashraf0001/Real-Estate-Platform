'use client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface MaintenanceViewProps {
  locale?: string;
  onBackToHome?: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ locale = 'en', onBackToHome: propOnBack }) => {
  const router = useRouter();
  const onBackToHome = propOnBack || (() => router.push('/' + locale));
  const [lang, setLang] = useState<'EN' | 'AR'>('EN');

  return (
    <div className="status-page-layout">
      {/* Brand Header */}
      <div className="status-page-header" onClick={onBackToHome} style={{ cursor: 'pointer' }}>
        <div className="status-logo">
          <span className="logo-gold">ZAKARIA</span>
          <span className="logo-white">FARID</span>
        </div>
        <span className="status-sub-badge">PRIVATE CLIENT PORTFOLIO</span>
      </div>

      {/* Center 503 Card */}
      <motion.div 
        className="status-card"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="status-code">503</h1>
        <h2 className="status-title">UNDER MAINTENANCE</h2>

        <p className="status-description">
          {lang === 'EN' 
            ? 'Our sovereign portal is currently undergoing scheduled cryptographic synchronization and database optimization to preserve optimal ledger fidelity.'
            : 'يخضع البوابة العقارية السيادية حالياً لعملية تزامن وتحديث مجدولة لتحسين قاعدة البيانات والحفاظ على أعلى معايير الأمان.'}
        </p>

        <div className="maintenance-time-info">
          <span className="time-line-en">Estimated return time: <strong>14:00 GMT+2</strong></span>
          <span className="time-line-ar" dir="rtl">الوقت المقدر للعودة: <strong>الساعة ٢:٠٠ ظهراً بتوقيت القاهرة</strong></span>
        </div>

        {/* Language Pill Switcher */}
        <div className="lang-toggle-pills">
          <button 
            className={`lang-pill ${lang === 'EN' ? 'active' : ''}`}
            onClick={() => setLang('EN')}
          >
            EN
          </button>
          <button 
            className={`lang-pill ${lang === 'AR' ? 'active' : ''}`}
            onClick={() => setLang('AR')}
          >
            AR
          </button>
        </div>
      </motion.div>

      <style>{`
        .status-page-layout {
          min-height: 100vh;
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: var(--text-primary);
          transition: background var(--transition-smooth);
        }

        .status-page-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          margin-bottom: 2.5rem;
        }

        .status-logo {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .logo-gold {
          color: var(--gold-primary);
          margin-right: 6px;
        }

        .logo-white {
          color: var(--text-primary);
        }

        .status-sub-badge {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .status-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 24px;
          padding: 4rem 3rem;
          width: 100%;
          max-width: 600px;
          box-shadow: var(--shadow-glass);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: background var(--transition-smooth);
        }

        .status-code {
          font-family: var(--font-heading);
          font-size: clamp(4.5rem, 8vw, 5.5rem);
          font-weight: 800;
          color: var(--gold-primary);
          line-height: 1;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .status-title {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: 0.06em;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
        }

        .status-description {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          line-height: 1.65;
          margin-bottom: 2rem;
          max-width: 480px;
        }

        .maintenance-time-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.875rem;
          color: var(--gold-primary);
          margin-bottom: 2rem;
        }

        .time-line-en strong, .time-line-ar strong {
          color: var(--text-primary);
        }

        .lang-toggle-pills {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-surface);
          padding: 4px;
          border-radius: 10px;
          border: 1px solid var(--border-subtle);
        }

        .lang-pill {
          padding: 0.35rem 1rem;
          font-size: 0.8125rem;
          font-weight: 700;
          border-radius: 6px;
          color: var(--text-secondary);
          background: transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .lang-pill.active {
          background: var(--gold-primary);
          color: #0A0C10;
        }

        @media (max-width: 600px) {
          .status-card {
            padding: 2.5rem 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};
