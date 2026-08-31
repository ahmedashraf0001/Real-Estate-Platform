'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Building2, Banknote, ChevronDown, Check, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickSearchBarProps {
  onSearch: (filters: { location: string; propertyType: string; priceTier: string }) => void;
  locale?: string;
}

const LOCATION_OPTIONS = [
  { 
    value: 'New Cairo, Fifth Settlement', 
    label: 'New Cairo, Fifth Settlement', 
    shortLabel: 'New Cairo, Fifth Settlement',
    labelAr: 'القاهرة الجديدة والتجمع الخامس',
    shortLabelAr: 'القاهرة الجديدة والتجمع'
  },
  { 
    value: 'Sheikh Zayed', 
    label: 'Sheikh Zayed & 6th of October', 
    shortLabel: 'Sheikh Zayed',
    labelAr: 'الشيخ زايد والسادس من أكتوبر',
    shortLabelAr: 'الشيخ زايد وأكتوبر'
  },
  { 
    value: 'North Coast', 
    label: 'North Coast (Sahel)', 
    shortLabel: 'North Coast (Sahel)',
    labelAr: 'الساحل الشمالي (سيدي عبد الرحمن)',
    shortLabelAr: 'الساحل الشمالي'
  },
  { 
    value: 'Ain Sokhna', 
    label: 'Ain Sokhna (Red Sea)', 
    shortLabel: 'Ain Sokhna',
    labelAr: 'العين السخنة (ساحل البحر الأحمر)',
    shortLabelAr: 'العين السخنة'
  },
  { 
    value: 'El Gouna', 
    label: 'El Gouna (Red Sea)', 
    shortLabel: 'El Gouna',
    labelAr: 'الجونة (البحر الأحمر)',
    shortLabelAr: 'الجونة'
  },
  { 
    value: 'Madinaty', 
    label: 'Madinaty (East Cairo)', 
    shortLabel: 'Madinaty',
    labelAr: 'مدينتي (شرق القاهرة)',
    shortLabelAr: 'مدينتي'
  },
];

const TYPE_OPTIONS = [
  { 
    value: 'apartment', 
    label: 'Apartment / Duplex', 
    shortLabel: 'Apartment',
    labelAr: 'شقق وأجنحة ودوبلكس',
    shortLabelAr: 'شقق سكنية'
  },
  { 
    value: 'building', 
    label: 'Whole Building', 
    shortLabel: 'Building',
    labelAr: 'عمارة سكنية / تجارية',
    shortLabelAr: 'عمارة كاملة'
  },
  { 
    value: 'garage', 
    label: 'Garage & Bays', 
    shortLabel: 'Garage',
    labelAr: 'جراجات وباكيات خاصة',
    shortLabelAr: 'جراجات'
  },
];

const PRICE_OPTIONS = [
  { 
    value: '15,000,000 - 45,000,000 EGP', 
    label: '15M – 45M EGP', 
    shortLabel: '15M – 45M EGP',
    labelAr: '١٥ – ٤٥ مليون ج.م',
    shortLabelAr: '١٥ – ٤٥ مليون ج.م'
  },
  { 
    value: 'Under 20,000,000 EGP', 
    label: 'Under 20M EGP', 
    shortLabel: '< 20M EGP',
    labelAr: 'أقل من ٢٠ مليون ج.م',
    shortLabelAr: '< ٢٠ مليون ج.م'
  },
  { 
    value: '20,000,000 - 35,000,000 EGP', 
    label: '20M – 35M EGP', 
    shortLabel: '20M – 35M EGP',
    labelAr: '٢٠ – ٣٥ مليون ج.م',
    shortLabelAr: '٢٠ – ٣٥ مليون ج.م'
  },
  { 
    value: '35,000,000 - 60,000,000 EGP', 
    label: '35M – 60M EGP', 
    shortLabel: '35M – 60M EGP',
    labelAr: '٣٥ – ٦٠ مليون ج.م',
    shortLabelAr: '٣٥ – ٦٠ مليون ج.م'
  },
  { 
    value: '60,000,000+ EGP', 
    label: 'Ultra-Luxury (60M+ EGP)', 
    shortLabel: '60M+ EGP',
    labelAr: 'قصور فائقة (٦٠ مليون+ ج.م)',
    shortLabelAr: '٦٠ مليون+ ج.م'
  },
];

export const QuickSearchBar: React.FC<QuickSearchBarProps> = ({ onSearch, locale: propLocale }) => {
  const isAr = propLocale === 'ar' || (typeof document !== 'undefined' && (document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl'));

  const [location, setLocation] = useState('New Cairo, Fifth Settlement');
  const [propertyType, setPropertyType] = useState('apartment');
  const [priceTier, setPriceTier] = useState('15,000,000 - 45,000,000 EGP');
  const [openDropdown, setOpenDropdown] = useState<'location' | 'type' | 'price' | null>(null);
  const [dropdownPlacement, setDropdownPlacement] = useState<'down' | 'up'>('down');

  const barRef = useRef<HTMLFormElement>(null);

  const handleToggleDropdown = (type: 'location' | 'type' | 'price', e: React.MouseEvent<HTMLButtonElement>) => {
    if (openDropdown === type) {
      setOpenDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const requiredSpace = 260;
    if (spaceBelow < requiredSpace && rect.top > spaceBelow) {
      setDropdownPlacement('up');
    } else {
      setDropdownPlacement('down');
    }
    setOpenDropdown(type);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      if (openDropdown) {
        const closest = target.closest?.('.custom-filter-dropdown');
        if (!closest) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openDropdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ location, propertyType, priceTier });
  };

  return (
    <form ref={barRef} className="quick-search-bar" onSubmit={handleSubmit} dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Location Custom Dropdown */}
      <div className="search-field custom-filter-dropdown">
        <label className="field-label">{isAr ? 'المدينة / المنطقة' : 'LOCATION'}</label>
        <button
          type="button"
          className={`filter-custom-trigger ${openDropdown === 'location' ? 'open' : ''}`}
          onClick={(e) => handleToggleDropdown('location', e)}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === 'location'}
        >
          <div className="trigger-left">
            <MapPin size={15} className="field-icon" />
            <span className="trigger-value">
              {(() => {
                const opt = LOCATION_OPTIONS.find((o) => o.value === location);
                return opt ? (isAr ? opt.shortLabelAr : opt.shortLabel) : location;
              })()}
            </span>
          </div>
          <ChevronDown size={14} className={`chevron-icon ${openDropdown === 'location' ? 'rotate' : ''}`} />
        </button>

        <AnimatePresence>
          {openDropdown === 'location' && (
            <motion.div
              className={`filter-custom-menu placement-${dropdownPlacement}`}
              data-lenis-prevent="true"
              initial={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {LOCATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-menu-option ${location === opt.value ? 'selected' : ''}`}
                  onClick={() => {
                    setLocation(opt.value);
                    setOpenDropdown(null);
                  }}
                >
                  <span className="option-label">{isAr ? opt.labelAr : opt.label}</span>
                  {location === opt.value && <Check size={14} className="option-check" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="search-divider" />

      {/* 2. Property Type Custom Dropdown */}
      <div className="search-field custom-filter-dropdown">
        <label className="field-label">{isAr ? 'نوع الصرح' : 'PROPERTY TYPE'}</label>
        <button
          type="button"
          className={`filter-custom-trigger ${openDropdown === 'type' ? 'open' : ''}`}
          onClick={(e) => handleToggleDropdown('type', e)}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === 'type'}
        >
          <div className="trigger-left">
            <Building2 size={15} className="field-icon" />
            <span className="trigger-value">
              {(() => {
                const opt = TYPE_OPTIONS.find((o) => o.value === propertyType);
                return opt ? (isAr ? opt.shortLabelAr : opt.shortLabel) : propertyType;
              })()}
            </span>
          </div>
          <ChevronDown size={14} className={`chevron-icon ${openDropdown === 'type' ? 'rotate' : ''}`} />
        </button>

        <AnimatePresence>
          {openDropdown === 'type' && (
            <motion.div
              className={`filter-custom-menu placement-${dropdownPlacement}`}
              data-lenis-prevent="true"
              initial={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-menu-option ${propertyType === opt.value ? 'selected' : ''}`}
                  onClick={() => {
                    setPropertyType(opt.value);
                    setOpenDropdown(null);
                  }}
                >
                  <span className="option-label">{isAr ? opt.labelAr : opt.label}</span>
                  {propertyType === opt.value && <Check size={14} className="option-check" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="search-divider" />

      {/* 3. Price Tier Custom Dropdown */}
      <div className="search-field custom-filter-dropdown">
        <label className="field-label">{isAr ? 'النطاق السعري' : 'PRICE RANGE'}</label>
        <button
          type="button"
          className={`filter-custom-trigger ${openDropdown === 'price' ? 'open' : ''}`}
          onClick={(e) => handleToggleDropdown('price', e)}
          aria-haspopup="listbox"
          aria-expanded={openDropdown === 'price'}
        >
          <div className="trigger-left">
            <Banknote size={15} className="field-icon" />
            <span className="trigger-value">
              {(() => {
                const opt = PRICE_OPTIONS.find((o) => o.value === priceTier);
                return opt ? (isAr ? opt.shortLabelAr : opt.shortLabel) : priceTier;
              })()}
            </span>
          </div>
          <ChevronDown size={14} className={`chevron-icon ${openDropdown === 'price' ? 'rotate' : ''}`} />
        </button>

        <AnimatePresence>
          {openDropdown === 'price' && (
            <motion.div
              className={`filter-custom-menu placement-${dropdownPlacement}`}
              data-lenis-prevent="true"
              initial={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: dropdownPlacement === 'up' ? -8 : 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {PRICE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`filter-menu-option ${priceTier === opt.value ? 'selected' : ''}`}
                  onClick={() => {
                    setPriceTier(opt.value);
                    setOpenDropdown(null);
                  }}
                >
                  <span className="option-label">{isAr ? opt.labelAr : opt.label}</span>
                  {priceTier === opt.value && <Check size={14} className="option-check" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit Button */}
      <button type="submit" className="search-submit-btn">
        <span className="search-btn-icon">
          {isAr ? <ArrowLeft size={16} strokeWidth={2.4} /> : <ArrowRight size={16} strokeWidth={2.4} />}
        </span>
        <span>{isAr ? 'بحث في الصروح' : 'Search Properties'}</span>
      </button>

      <style>{`
        .quick-search-bar {
          display: flex;
          align-items: center;
          background: var(--bg-glass);
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          border: 1px solid var(--border-glass);
          border-radius: 18px;
          padding: 0.75rem 1.15rem;
          gap: 1.25rem;
          box-shadow: var(--shadow-glass);
          width: 100%;
          max-width: 100%;
          position: relative;
          z-index: 40;
          transition: background var(--transition-smooth), border-color var(--transition-smooth);
        }

        [data-theme="dark"] .quick-search-bar {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.25) 0%,
            rgba(255, 255, 255, 0.08) 30%,
            rgba(18, 24, 38, 0.42) 65%,
            rgba(10, 14, 24, 0.65) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.38),
            0 4px 14px rgba(0, 0, 0, 0.18),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.12);
        }

        [data-theme="light"] .quick-search-bar {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.65) 0%,
            rgba(255, 255, 255, 0.32) 40%,
            rgba(255, 255, 255, 0.52) 100%
          );
          backdrop-filter: blur(32px) saturate(210%) contrast(106%);
          -webkit-backdrop-filter: blur(32px) saturate(210%) contrast(106%);
          border: 1.5px solid rgba(255, 255, 255, 0.75);
          box-shadow: 
            0 24px 56px rgba(15, 23, 42, 0.14), 
            0 4px 16px rgba(0, 0, 0, 0.04),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.95),
            inset 0 -1px 1px rgba(0, 0, 0, 0.05);
        }

        .search-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
          position: relative;
        }

        .field-label {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition: color var(--transition-fast);
        }

        [data-theme="dark"] .field-label {
          color: #E5B869;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        [data-theme="light"] .field-label {
          color: #8C6826;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .filter-custom-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 0.15rem 0;
          color: var(--text-primary);
          font-family: inherit;
          cursor: pointer;
          border-radius: 8px;
          transition: all var(--transition-fast);
          text-align: left;
        }

        [dir="rtl"] .filter-custom-trigger {
          text-align: right;
        }

        .trigger-left {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          overflow: hidden;
        }

        .field-icon {
          flex-shrink: 0;
          transition: color var(--transition-fast);
        }

        [data-theme="dark"] .field-icon {
          color: #E5B869;
        }

        [data-theme="light"] .field-icon {
          color: #8C6826;
        }

        .trigger-value {
          font-size: 0.9375rem;
          font-weight: 700;
          transition: color var(--transition-fast);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        [data-theme="dark"] .trigger-value {
          color: #FFFFFF;
        }

        [data-theme="light"] .trigger-value {
          color: #141210;
          font-weight: 700;
        }

        .filter-custom-trigger:hover .trigger-value,
        .filter-custom-trigger.open .trigger-value {
          color: var(--gold-primary);
        }

        .chevron-icon {
          color: var(--text-muted);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), color var(--transition-fast);
          flex-shrink: 0;
        }

        [data-theme="dark"] .chevron-icon {
          color: rgba(255, 255, 255, 0.6);
        }

        .chevron-icon.rotate {
          transform: rotate(180deg);
        }

        .search-divider {
          width: 1px;
          height: 38px;
          background: var(--border-subtle);
          opacity: 0.6;
          flex-shrink: 0;
        }

        [data-theme="dark"] .search-divider {
          background: rgba(255, 255, 255, 0.15);
        }

        [data-theme="light"] .search-divider {
          background: rgba(0, 0, 0, 0.08);
        }

        .search-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          background: linear-gradient(135deg, #FDE68A 0%, #E5B869 45%, #D97706 100%);
          color: #0F172A;
          font-family: inherit;
          font-size: 0.9375rem;
          font-weight: 800;
          letter-spacing: 0.02em;
          padding: 0.85rem 1.6rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(221, 167, 82, 0.45);
          transition: all var(--transition-fast);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .search-submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(221, 167, 82, 0.6);
          filter: brightness(1.06);
        }

        .search-submit-btn:active {
          transform: translateY(0);
        }

        /* ── Custom Dropdown Menu ── */
        .filter-custom-menu {
          position: absolute;
          left: 0;
          right: 0;
          min-width: 250px;
          background: var(--bg-surface-elevated, #161A22);
          backdrop-filter: blur(28px) saturate(200%);
          -webkit-backdrop-filter: blur(28px) saturate(200%);
          border: 1px solid var(--border-glass, rgba(255, 255, 255, 0.15));
          border-radius: 14px;
          padding: 0.4rem;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
          z-index: 1000;
          max-height: 270px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .filter-custom-menu.placement-down {
          top: calc(100% + 12px);
        }

        .filter-custom-menu.placement-up {
          bottom: calc(100% + 12px);
        }

        [data-theme="dark"] .filter-custom-menu {
          background: rgba(18, 22, 32, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6);
        }

        [data-theme="light"] .filter-custom-menu {
          background: rgba(255, 255, 255, 0.96);
          border: 1.5px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
        }

        .filter-menu-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          padding: 0.65rem 0.85rem;
          border-radius: 9px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }

        [dir="rtl"] .filter-menu-option {
          text-align: right;
        }

        .filter-menu-option:hover {
          background: rgba(221, 167, 82, 0.12);
          color: var(--text-primary);
        }

        .filter-menu-option.selected {
          background: rgba(221, 167, 82, 0.18);
          color: var(--gold-primary);
          font-weight: 700;
        }

        .option-check {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        /* ── Responsive Vertical Card on Mobile (Original Design from Reference) ── */
        @media (max-width: 768px) {
          .quick-search-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.6rem;
            padding: 1.15rem 1.15rem 1.05rem;
            border-radius: 20px;
            width: 100%;
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.14) 0%,
              rgba(255, 255, 255, 0.04) 30%,
              rgba(18, 24, 38, 0.5) 65%,
              rgba(10, 14, 24, 0.78) 100%
            );
            backdrop-filter: blur(28px) saturate(200%);
            -webkit-backdrop-filter: blur(28px) saturate(200%);
            border: 1.5px solid rgba(255, 255, 255, 0.22);
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45), inset 0 1.5px 2px rgba(255, 255, 255, 0.45);
          }

          [data-theme="light"] .quick-search-bar {
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.88) 0%,
              rgba(255, 255, 255, 0.65) 50%,
              rgba(247, 244, 238, 0.82) 100%
            );
            border: 1.5px solid rgba(255, 255, 255, 0.95);
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12), inset 0 1.5px 2px #FFFFFF;
          }

          .search-field {
            width: 100%;
            padding: 0.15rem 0;
          }

          .field-label {
            font-size: 0.6875rem;
            letter-spacing: 0.12em;
          }

          .trigger-value {
            font-size: 0.92rem;
          }

          .search-divider {
            display: block;
            width: 100%;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 0.05rem 0;
          }

          [data-theme="light"] .search-divider {
            background: rgba(0, 0, 0, 0.08);
          }

          .search-submit-btn {
            width: 100%;
            height: 48px;
            margin-top: 0.35rem;
            border-radius: 12px;
            font-size: 0.95rem;
          }

          .filter-custom-menu {
            position: absolute;
            left: 0;
            right: 0;
            width: 100%;
            min-width: 0;
          }
        }
      `}</style>
    </form>
  );
};
