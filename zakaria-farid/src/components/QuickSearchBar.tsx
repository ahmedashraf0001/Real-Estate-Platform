'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Building2, Banknote, ChevronDown, Check, Search, X } from 'lucide-react';
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

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSheetOpen(false);
    onSearch({ location, propertyType, priceTier });
  };

  return (
    <form ref={barRef} className="quick-search-bar" onSubmit={handleSubmit} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Mobile: compact launcher that opens the search sheet */}
      <button
        type="button"
        className="qsb-mobile-launcher"
        onClick={() => setIsSheetOpen(true)}
      >
        <Search size={16} />
        <span>{isAr ? 'ابحث في الصروح الفاخرة...' : 'Search luxury estates...'}</span>
      </button>

      {isSheetOpen && (
        <div className="qsb-sheet-backdrop" onClick={() => setIsSheetOpen(false)} />
      )}

      <div className={`qsb-slots-group ${isSheetOpen ? 'sheet-open' : ''}`}>
        <div className="qsb-sheet-head">
          <span className="qsb-sheet-title">{isAr ? 'بحث في الصروح' : 'Search Properties'}</span>
          <button
            type="button"
            className="qsb-sheet-close"
            onClick={() => setIsSheetOpen(false)}
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>

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
        <label className="field-label">{isAr ? 'نوع العقار' : 'PROPERTY TYPE'}</label>
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

      {/* 3. Price Range Custom Dropdown */}
      <div className="search-field custom-filter-dropdown">
        <label className="field-label">{isAr ? 'نطاق السعر' : 'PRICE RANGE'}</label>
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
        <span>{isAr ? 'بحث في الصروح' : 'Search Properties'}</span>
      </button>
      </div>

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

        [data-theme="light"] .chevron-icon {
          color: rgba(15, 23, 42, 0.55);
        }

        .chevron-icon.rotate {
          transform: rotate(180deg);
          color: var(--gold-primary);
        }

        .filter-custom-trigger:hover .chevron-icon {
          color: var(--gold-primary);
        }

        /* Floating Custom Glass Menu */
        .filter-custom-menu {
          position: absolute;
          left: 0;
          min-width: 240px;
          max-height: 240px;
          overflow-y: auto;
          overscroll-behavior: contain;
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border-radius: 16px;
          padding: 6px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .filter-custom-menu.placement-down {
          top: calc(100% + 12px);
          bottom: auto;
          transform-origin: top center;
        }

        .filter-custom-menu.placement-up {
          bottom: calc(100% + 12px);
          top: auto;
          transform-origin: bottom center;
        }

        .filter-custom-menu::-webkit-scrollbar {
          width: 5px;
        }

        .filter-custom-menu::-webkit-scrollbar-track {
          background: transparent;
        }

        .filter-custom-menu::-webkit-scrollbar-thumb {
          background: rgba(212, 160, 52, 0.35);
          border-radius: 9999px;
        }

        .filter-custom-menu::-webkit-scrollbar-thumb:hover {
          background: var(--gold-primary);
        }

        [data-theme="dark"] .filter-custom-menu {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.18) 0%,
            rgba(22, 28, 42, 0.92) 40%,
            rgba(10, 14, 22, 0.96) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 
            0 20px 48px rgba(0, 0, 0, 0.6),
            inset 0 1.5px 1.5px rgba(255, 255, 255, 0.45);
        }

        [data-theme="light"] .filter-custom-menu {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.88) 0%,
            rgba(255, 255, 255, 0.68) 50%,
            rgba(255, 255, 255, 0.82) 100%
          );
          backdrop-filter: blur(28px) saturate(210%);
          -webkit-backdrop-filter: blur(28px) saturate(210%);
          border: 1.5px solid rgba(255, 255, 255, 0.85);
          box-shadow: 
            0 24px 56px rgba(15, 23, 42, 0.16),
            0 4px 16px rgba(0, 0, 0, 0.04),
            inset 0 1.5px 2px #FFFFFF;
        }

        .filter-menu-option {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0.6rem 0.9rem;
          background: transparent;
          border: none;
          border-radius: 10px;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: all var(--transition-fast);
        }

        [data-theme="light"] .filter-menu-option {
          color: #141210;
        }

        [data-theme="dark"] .filter-menu-option {
          color: #E2E8F0;
        }

        .filter-menu-option:hover {
          background: rgba(229, 184, 105, 0.15);
          color: #E5B869;
          transform: translateX(2px);
        }

        [data-theme="light"] .filter-menu-option:hover {
          background: rgba(184, 147, 74, 0.12);
          color: #8C6826;
        }

        .filter-menu-option.selected {
          background: rgba(229, 184, 105, 0.20);
          color: #E5B869;
          font-weight: 700;
        }

        [data-theme="light"] .filter-menu-option.selected {
          background: rgba(184, 147, 74, 0.18);
          color: #8C6826;
          font-weight: 800;
        }

        .option-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .option-check {
          color: #E5B869;
          flex-shrink: 0;
        }

        [data-theme="light"] .option-check {
          color: #8C6826;
        }

        .search-divider {
          width: 1px;
          height: 34px;
          background: var(--border-subtle);
        }

        [data-theme="light"] .search-divider {
          background: rgba(184, 147, 74, 0.20);
        }

        .search-submit-btn {
          white-space: nowrap;
          padding: 0.8125rem 1.75rem;
          font-size: 0.9375rem;
          font-weight: 800;
          background: linear-gradient(135deg, #FFF0C2 0%, #E5B869 50%, #B8934A 100%);
          color: #0A0C10;
          border-radius: 10px;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 18px rgba(229, 184, 105, 0.35), inset 0 1px 1.5px rgba(255, 255, 255, 0.7);
          transition: all var(--transition-smooth);
          cursor: pointer;
        }

        [data-theme="light"] .search-submit-btn {
          background: linear-gradient(135deg, #FFF0C2 0%, #E5B869 50%, #B8934A 100%);
          color: #0A0C10;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 4px 18px rgba(184, 147, 74, 0.30), inset 0 1px 1.5px rgba(255, 255, 255, 0.8);
        }

        .search-submit-btn:hover {
          background: linear-gradient(135deg, #FFFFFF 0%, #FFF0C2 40%, #E5B869 100%);
          box-shadow: 0 6px 24px rgba(229, 184, 105, 0.5);
          transform: translateY(-1px);
        }

        .filter-custom-trigger:focus-visible,
        .search-input-field:focus-visible,
        .filter-menu-option:focus-visible,
        .search-submit-btn:focus-visible {
          outline: 2px solid var(--gold-primary) !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 16px var(--gold-glow) !important;
        }

        /* RTL overrides */
        [dir="rtl"].quick-search-bar,
        .quick-search-bar[dir="rtl"] {
          text-align: right;
        }

        .quick-search-bar[dir="rtl"] .filter-custom-trigger {
          text-align: right;
        }

        .quick-search-bar[dir="rtl"] .field-label {
          letter-spacing: normal;
        }

        .quick-search-bar[dir="rtl"] .trigger-value {
          line-height: 1.5;
          padding-bottom: 2px;
        }

        .quick-search-bar[dir="rtl"] .search-submit-btn {
          font-family: inherit;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .quick-search-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.875rem;
            padding: 1.15rem;
          }

          .search-divider {
            width: 100%;
            height: 1px;
          }

          .search-submit-btn {
            width: 100%;
          }

          .filter-custom-menu {
            position: static;
            width: 100%;
            min-width: 100%;
            margin-top: 6px;
          }
        }

        @media (max-width: 600px) {
          .trigger-value {
            font-size: 0.875rem;
          }
          .search-submit-btn {
            padding: 0.75rem 1.25rem;
            font-size: 0.875rem;
          }
        }

        /* Desktop: mobile sheet chrome hidden, group is transparent */
        .qsb-mobile-launcher,
        .qsb-sheet-backdrop,
        .qsb-sheet-head {
          display: none;
        }

        .qsb-slots-group {
          display: contents;
        }

        @media (max-width: 768px) {
          /* Flat: the launcher IS the visible search bar */
          .quick-search-bar,
          [data-theme="dark"] .quick-search-bar,
          [data-theme="light"] .quick-search-bar {
            background: transparent;
            border: none;
            box-shadow: none;
            padding: 0;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }

          .qsb-mobile-launcher {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 0.9rem 1.15rem;
            border-radius: 9999px;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-secondary, #C7D2DF);
            cursor: pointer;
            backdrop-filter: blur(18px) saturate(190%);
            -webkit-backdrop-filter: blur(18px) saturate(190%);
          }

          [data-theme="dark"] .qsb-mobile-launcher {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.18);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          [data-theme="light"] .qsb-mobile-launcher {
            background: rgba(255, 255, 255, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.85);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04), inset 0 1.5px 1.5px #FFFFFF;
            color: #475569;
          }

          .qsb-mobile-launcher svg {
            color: var(--gold-primary, #DDA752);
            flex-shrink: 0;
          }

          .qsb-sheet-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            z-index: 1290;
          }

          .qsb-slots-group {
            display: none;
          }

          .qsb-slots-group.sheet-open {
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
            position: fixed;
            left: 0.5rem;
            right: 0.5rem;
            bottom: 0;
            z-index: 1300;
            max-height: 84dvh;
            overflow-y: auto;
            border-radius: 22px 22px 0 0;
            padding: 1rem 1rem 1.15rem;
            backdrop-filter: blur(28px) saturate(210%);
            -webkit-backdrop-filter: blur(28px) saturate(210%);
          }

          [data-theme="dark"] .qsb-slots-group.sheet-open {
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.18) 0%,
              rgba(255, 255, 255, 0.06) 30%,
              rgba(18, 24, 38, 0.72) 65%,
              rgba(10, 14, 24, 0.88) 100%
            );
            border: 1px solid rgba(255, 255, 255, 0.28);
            border-bottom: none;
            box-shadow: 0 -20px 48px rgba(0, 0, 0, 0.5);
          }

          [data-theme="light"] .qsb-slots-group.sheet-open {
            background: linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.9) 0%,
              rgba(255, 255, 255, 0.75) 100%
            );
            border: 1.5px solid rgba(255, 255, 255, 0.85);
            border-bottom: none;
            box-shadow: 0 -20px 48px rgba(15, 23, 42, 0.18);
          }

          .qsb-slots-group.sheet-open .qsb-sheet-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .qsb-sheet-title {
            font-family: var(--font-heading);
            font-size: 1rem;
            font-weight: 800;
            color: var(--text-primary);
          }

          .qsb-sheet-close {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: var(--text-primary);
            cursor: pointer;
          }

          [data-theme="light"] .qsb-sheet-close {
            background: rgba(0, 0, 0, 0.04);
            border-color: rgba(0, 0, 0, 0.1);
          }

          .qsb-slots-group.sheet-open .search-divider {
            display: none;
          }

          .qsb-slots-group.sheet-open .search-field {
            width: 100%;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            padding: 0.6rem 0.8rem;
          }

          [data-theme="light"] .qsb-slots-group.sheet-open .search-field {
            background: rgba(0, 0, 0, 0.03);
            border-color: rgba(0, 0, 0, 0.08);
          }

          .qsb-slots-group.sheet-open .search-submit-btn {
            width: 100%;
            min-height: 48px;
            border-radius: 9999px;
            flex-shrink: 0;
          }
        }
      `}</style>
    </form>
  );
};
