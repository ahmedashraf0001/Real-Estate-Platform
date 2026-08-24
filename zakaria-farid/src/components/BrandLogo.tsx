'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showSubtitle?: boolean;
  locale?: string;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  locale = 'en',
  className = '',
  onClick
}) => {
  const isAr = locale === 'ar';

  const iconSizes = {
    sm: 36,
    md: 46,
    lg: 64,
    hero: 96
  };

  const currentIconSize = iconSizes[size];

  return (
    <div 
      className={`luxury-brand-logo size-${size} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Official AL ZAKARIA Dark & Light Mode Vector Crest Emblem */}
      <div className="brand-emblem-wrap">
        <img
          src="/images/logo_darkmode.svg"
          alt="Al Zakaria Luxury Crest - Dark"
          className="brand-emblem-img brand-emblem-dark"
          width={currentIconSize}
          height={currentIconSize}
          loading="eager"
          decoding="sync"
        />
        <img
          src="/images/logo_lightmode.svg"
          alt="Al Zakaria Luxury Crest - Light"
          className="brand-emblem-img brand-emblem-light"
          width={currentIconSize}
          height={currentIconSize}
          loading="eager"
          decoding="sync"
        />
      </div>

      {/* Brand Wordmark Lockup */}
      <div className="brand-wordmark-wrap">
        {/* Main Title: AL ZAKARIA in Classic Roman Serif Egyptian Gold */}
        <div className="brand-primary-name">
          {isAr ? (
            <span className="name-serif-gold name-ar">آل زكريا</span>
          ) : (
            <span className="name-serif-gold">AL ZAKARIA</span>
          )}
        </div>

        {/* Sub-bar: LUXURY ESTATES with Hairline & Diamond Node */}
        <div className="brand-sub-row">
          <span className="brand-sub-text">
            {isAr ? 'للعقارات الفاخرة' : 'LUXURY ESTATES'}
          </span>
          <div className="brand-hairline">
            <span className="hairline-node" />
          </div>
        </div>

        {/* Arabic Calligraphic Signature on larger variants */}
        {(showSubtitle || size === 'lg' || size === 'hero') && !isAr && (
          <div className="brand-arabic-line">
            <span>الزكريا للعقارات الفاخرة</span>
          </div>
        )}
      </div>

      <style>{`
        .luxury-brand-logo {
          display: inline-flex;
          align-items: center;
          gap: 14px;
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
          flex-shrink: 0;
        }

        .brand-emblem-img {
          display: block;
          object-fit: contain;
          user-select: none;
          pointer-events: none;
          transition: filter 0.25s ease, transform 0.25s ease, opacity var(--transition-smooth);
        }

        .brand-emblem-dark {
          display: block;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.85));
        }

        .brand-emblem-light {
          display: none;
          filter: drop-shadow(0 1.5px 6px rgba(0, 0, 0, 0.65));
        }

        [data-theme="dark"] .brand-emblem-dark {
          display: block;
        }

        [data-theme="dark"] .brand-emblem-light {
          display: none;
        }

        [data-theme="light"] .brand-emblem-dark {
          display: none;
        }

        [data-theme="light"] .brand-emblem-light {
          display: block;
        }

        .luxury-brand-logo:hover .brand-emblem-dark {
          filter: drop-shadow(0 0 16px rgba(229, 184, 105, 0.85));
          transform: scale(1.04);
        }

        .luxury-brand-logo:hover .brand-emblem-light {
          filter: drop-shadow(0 0 16px rgba(144, 107, 39, 0.75));
          transform: scale(1.04);
        }

        .brand-wordmark-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }

        /* 1. Main Title: AL ZAKARIA */
        .brand-primary-name {
          margin: 0;
          padding: 0;
          line-height: 1.05;
        }

        .name-serif-gold {
          font-family: 'Cinzel', 'Playfair Display', Georgia, 'Times New Roman', serif;
          font-weight: 700;
          letter-spacing: 0.10em;
          word-spacing: 0.25em;
          text-transform: uppercase;
          background: linear-gradient(
            135deg,
            #FFFDF5 0%,
            #FEE8A0 22%,
            #E5B869 55%,
            #C59A45 85%,
            #9E7428 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.9));
          display: inline-block;
          white-space: nowrap;
        }

        .name-serif-gold.name-ar {
          font-family: 'Cairo', 'Amiri', Georgia, serif;
          letter-spacing: 0.02em;
          word-spacing: 0.15em;
          font-weight: 800;
        }

        [data-theme="light"] .name-serif-gold {
          background: linear-gradient(135deg, #A87A28 0%, #8C6826 60%, #684812 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: none;
        }

        .hero-blended .name-serif-gold {
          background: linear-gradient(
            135deg,
            #FFFDF5 0%,
            #FEE8A0 22%,
            #E5B869 55%,
            #C59A45 85%,
            #9E7428 100%
          ) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.95)) !important;
        }

        /* Responsive Size Scales */
        .size-sm .name-serif-gold { font-size: 1.05rem; }
        .size-md .name-serif-gold { font-size: 1.28rem; }
        .size-lg .name-serif-gold { font-size: 1.85rem; }
        .size-hero .name-serif-gold { font-size: 2.65rem; }

        /* 2. Sub-row: LUXURY ESTATES with Hairline */
        .brand-sub-row {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          margin-top: 3px;
        }

        .brand-sub-text {
          font-family: var(--font-heading, 'Plus Jakarta Sans', sans-serif);
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.28em;
          background: linear-gradient(
            135deg,
            #FFFDF5 0%,
            #FEE8A0 22%,
            #E5B869 55%,
            #C59A45 85%,
            #9E7428 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-transform: uppercase;
          white-space: nowrap;
          filter: drop-shadow(0 1.5px 5px rgba(0, 0, 0, 0.85));
        }

        [data-theme="light"] .brand-sub-text {
          background: linear-gradient(135deg, #A87A28 0%, #8C6826 60%, #684812 100%) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          filter: none !important;
        }

        .hero-blended .brand-sub-text {
          background: linear-gradient(
            135deg,
            #FFFDF5 0%,
            #FEE8A0 22%,
            #E5B869 55%,
            #C59A45 85%,
            #9E7428 100%
          ) !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          filter: drop-shadow(0 1.5px 5px rgba(0, 0, 0, 0.85)) !important;
        }

        .size-sm .brand-sub-text { font-size: 0.5rem; letter-spacing: 0.22em; }
        .size-md .brand-sub-text { font-size: 0.58rem; letter-spacing: 0.28em; }
        .size-lg .brand-sub-text { font-size: 0.72rem; letter-spacing: 0.32em; }
        .size-hero .brand-sub-text { font-size: 0.95rem; letter-spacing: 0.38em; }

        .brand-hairline {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, rgba(255, 253, 245, 0.9) 0%, rgba(229, 184, 105, 0.75) 30%, rgba(229, 184, 105, 0.25) 80%, transparent 100%);
          position: relative;
          min-width: 28px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
        }

        [dir="rtl"] .brand-hairline {
          background: linear-gradient(to left, rgba(255, 253, 245, 0.9) 0%, rgba(229, 184, 105, 0.75) 30%, rgba(229, 184, 105, 0.25) 80%, transparent 100%);
        }

        [data-theme="light"] .brand-hairline {
          background: linear-gradient(to right, rgba(168, 122, 40, 0.85) 0%, rgba(140, 104, 38, 0.6) 35%, rgba(104, 72, 18, 0.2) 80%, transparent 100%);
          box-shadow: none;
        }

        [data-theme="light"][dir="rtl"] .brand-hairline,
        [data-theme="light"] [dir="rtl"] .brand-hairline {
          background: linear-gradient(to left, rgba(168, 122, 40, 0.85) 0%, rgba(140, 104, 38, 0.6) 35%, rgba(104, 72, 18, 0.2) 80%, transparent 100%);
        }

        .hero-blended .brand-hairline {
          background: linear-gradient(to right, rgba(255, 253, 245, 0.9) 0%, rgba(229, 184, 105, 0.75) 30%, rgba(229, 184, 105, 0.25) 80%, transparent 100%) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6) !important;
        }

        .hero-blended[dir="rtl"] .brand-hairline,
        .hero-blended [dir="rtl"] .brand-hairline {
          background: linear-gradient(to left, rgba(255, 253, 245, 0.9) 0%, rgba(229, 184, 105, 0.75) 30%, rgba(229, 184, 105, 0.25) 80%, transparent 100%) !important;
        }

        .hairline-node {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 4.5px;
          height: 4.5px;
          background: #FFFDF5;
          box-shadow: 0 0 6px rgba(229, 184, 105, 0.95), 0 1px 3px rgba(0, 0, 0, 0.8);
        }

        [dir="rtl"] .hairline-node {
          left: auto;
          right: 12px;
          transform: translate(50%, -50%) rotate(45deg);
        }

        [data-theme="light"] .hairline-node {
          background: #8C6826;
          box-shadow: 0 0 4px rgba(140, 104, 38, 0.4);
        }

        .hero-blended .hairline-node {
          background: #FFFDF5 !important;
          box-shadow: 0 0 6px rgba(229, 184, 105, 0.95), 0 1px 3px rgba(0, 0, 0, 0.8) !important;
        }

        /* 3. Arabic Signature Line */
        .brand-arabic-line {
          font-family: Georgia, 'Amiri', 'Traditional Arabic', 'Cairo', serif;
          font-size: 0.72rem;
          color: #E5B869;
          opacity: 0.92;
          margin-top: 4px;
          letter-spacing: 0.02em;
          white-space: nowrap;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
        }

        [data-theme="light"] .brand-arabic-line {
          color: #8C6826;
          text-shadow: none;
        }

        .size-sm .brand-arabic-line { font-size: 0.625rem; }
        .size-md .brand-arabic-line { font-size: 0.72rem; }
        .size-lg .brand-arabic-line { font-size: 0.95rem; }

        @media (max-width: 640px) {
          .luxury-brand-logo {
            gap: 8px;
          }
          .luxury-brand-logo.size-md .brand-emblem-wrap img {
            width: 34px !important;
            height: 34px !important;
          }
          .luxury-brand-logo.size-md .brand-primary-name .name-serif-gold {
            font-size: 0.98rem;
          }
          .luxury-brand-logo.size-md .brand-sub-text {
            font-size: 0.5rem;
            letter-spacing: 0.16em;
          }
          .luxury-brand-logo.size-md .brand-hairline {
            min-width: 18px;
          }
        }
      `}</style>
    </div>
  );
};
