'use client';
import { useRouter } from 'next/navigation';
import React from 'react';
import { motion } from 'framer-motion';

interface NotFoundViewProps {
  locale?: string;
  onBackToHome?: () => void;
  onContactSupport?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ 
  locale = 'en',
  onBackToHome: propOnBack, 
  onContactSupport: propOnContact 
}) => {
  const router = useRouter();
  const onBackToHome = propOnBack || (() => router.push('/' + locale));
  const onContactSupport = propOnContact || (() => router.push('/' + locale + '/contact'));
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

      {/* Center 404 Card */}
      <motion.div 
        className="status-card"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="status-code">404</h1>
        <h2 className="status-title">PAGE NOT FOUND</h2>

        <p className="status-description">
          The sovereign portfolio asset or admin route you are seeking does not exist or has been relocated to private ledgers.
        </p>

        <div className="status-buttons-row">
          <button 
            className="status-primary-btn"
            onClick={onBackToHome}
          >
            Return to Homepage
          </button>
          
          <button 
            className="status-secondary-btn"
            onClick={onContactSupport || onBackToHome}
          >
            Contact Support
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
          margin-bottom: 2.25rem;
          max-width: 480px;
        }

        .status-buttons-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          justify-content: center;
        }

        .status-primary-btn {
          padding: 0.8125rem 1.65rem;
          background: var(--gold-primary);
          color: #0A0C10;
          font-size: 0.9375rem;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .status-primary-btn:hover {
          background: var(--gold-light);
          box-shadow: 0 4px 18px var(--gold-glow);
        }

        .status-secondary-btn {
          padding: 0.8125rem 1.65rem;
          background: var(--bg-surface);
          color: var(--text-primary);
          border: 1px solid var(--gold-border);
          font-size: 0.9375rem;
          font-weight: 600;
          border-radius: 10px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .status-secondary-btn:hover {
          border-color: var(--gold-primary);
          color: var(--gold-primary);
          background: rgba(197, 142, 54, 0.1);
        }

        @media (max-width: 600px) {
          .status-card {
            padding: 2.5rem 1.5rem;
          }
          .status-buttons-row {
            flex-direction: column;
          }
          .status-primary-btn, .status-secondary-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
