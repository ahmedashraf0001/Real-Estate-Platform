'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  className = '',
  onClick
}) => {
  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48
  };

  const currentIconSize = iconSizes[size];

  return (
    <div 
      className={`luxury-brand-logo size-${size} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Bespoke Sovereign Crest Emblem SVG */}
      <div className="brand-emblem-wrap">
        <svg
          width={currentIconSize}
          height={currentIconSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="brand-emblem-svg"
        >
          <defs>
            <linearGradient id="zfGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF4D4" />
              <stop offset="35%" stopColor="#FCD34D" />
              <stop offset="70%" stopColor="#DDA752" />
              <stop offset="100%" stopColor="#9E7226" />
            </linearGradient>
            <linearGradient id="zfInnerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(252, 211, 77, 0.25)" />
              <stop offset="100%" stopColor="rgba(158, 114, 38, 0.05)" />
            </linearGradient>
          </defs>

          {/* Outer Geometric Architectural Seal */}
          <rect
            x="4"
            y="4"
            width="40"
            height="40"
            rx="10"
            fill="url(#zfInnerGlow)"
            stroke="url(#zfGoldGrad)"
            strokeWidth="1.5"
            className="seal-outer-rect"
          />

          {/* Micro Corner Accents */}
          <circle cx="8" cy="8" r="1" fill="#DDA752" />
          <circle cx="40" cy="8" r="1" fill="#DDA752" />
          <circle cx="8" cy="40" r="1" fill="#DDA752" />
          <circle cx="40" cy="40" r="1" fill="#DDA752" />

          {/* Interlocking Monogram ZF Paths */}
          {/* Z Top Bar */}
          <path
            d="M14 16H34L20 32H34"
            stroke="url(#zfGoldGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* F Crossbar & Stem Accent */}
          <path
            d="M20 16V32M20 24H30"
            stroke="url(#zfGoldGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Diamond Central Core Anchor */}
          <polygon
            points="24,21 26,24 24,27 22,24"
            fill="#FFF4D4"
          />
        </svg>
      </div>

      {/* Brand Wordmark */}
      <div className="brand-wordmark-wrap">
        <div className="brand-primary-name">
          <span className="name-gold">ZAKARIA</span>
          <span className="name-primary">FARID</span>
        </div>
        {showSubtitle && (
          <span className="brand-tagline">SOVEREIGN REAL ESTATE</span>
        )}
      </div>

      <style>{`
        .luxury-brand-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
          text-decoration: none;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .luxury-brand-logo:hover {
          transform: translateY(-1px);
        }

        .brand-emblem-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .brand-emblem-svg {
          filter: drop-shadow(0 0 10px rgba(221, 167, 82, 0.35));
          transition: filter 0.25s ease, transform 0.25s ease;
        }

        .luxury-brand-logo:hover .brand-emblem-svg {
          filter: drop-shadow(0 0 14px rgba(221, 167, 82, 0.6));
          transform: scale(1.04);
        }

        .brand-wordmark-wrap {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .brand-primary-name {
          display: flex;
          align-items: baseline;
          gap: 5px;
          font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
          font-weight: 800;
          letter-spacing: 0.12em;
          line-height: 1;
        }

        .size-sm .brand-primary-name { font-size: 0.9375rem; }
        .size-md .brand-primary-name { font-size: 1.125rem; }
        .size-lg .brand-primary-name { font-size: 1.45rem; }

        .name-gold {
          color: var(--gold-primary, #DDA752);
          text-shadow: 0 0 14px rgba(221, 167, 82, 0.3);
        }

        [data-theme="light"] .name-gold {
          color: #B8860B;
          text-shadow: none;
        }

        .name-primary {
          color: #FFFFFF;
        }

        [data-theme="light"] .name-primary {
          color: #0D1117;
        }

        .brand-tagline {
          font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
          font-size: 0.5625rem;
          font-weight: 700;
          letter-spacing: 0.24em;
          color: var(--gold-primary, #DDA752);
          opacity: 0.85;
          text-transform: uppercase;
        }

        [data-theme="light"] .brand-tagline {
          color: #8C6207;
        }
      `}</style>
    </div>
  );
};
