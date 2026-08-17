'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Building2, Banknote, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickSearchBarProps {
  onSearch: (filters: { location: string; propertyType: string; priceTier: string }) => void;
}

const LOCATION_OPTIONS = [
  { value: 'New Cairo, Fifth Settlement', label: 'New Cairo, Fifth Settlement', shortLabel: 'New Cairo, Fifth Settlement' },
  { value: 'Sheikh Zayed', label: 'Sheikh Zayed & 6th of October', shortLabel: 'Sheikh Zayed' },
  { value: 'North Coast', label: 'North Coast (Sahel)', shortLabel: 'North Coast (Sahel)' },
  { value: 'Ain Sokhna', label: 'Ain Sokhna (Red Sea)', shortLabel: 'Ain Sokhna' },
  { value: 'El Gouna', label: 'El Gouna (Red Sea)', shortLabel: 'El Gouna' },
  { value: 'Madinaty', label: 'Madinaty (East Cairo)', shortLabel: 'Madinaty' },
];

const TYPE_OPTIONS = [
  { value: 'Standalone Villa', label: 'Standalone Villa', shortLabel: 'Standalone Villa' },
  { value: 'Penthouse', label: 'Sky Penthouse', shortLabel: 'Sky Penthouse' },
  { value: 'Mansion', label: 'Grand Mansion', shortLabel: 'Grand Mansion' },
  { value: 'Apartment', label: 'Luxury Apartment', shortLabel: 'Luxury Apartment' },
  { value: 'Chalet', label: 'Prime Chalet', shortLabel: 'Prime Chalet' },
  { value: 'Duplex', label: 'Sky Duplex', shortLabel: 'Sky Duplex' },
];

const PRICE_OPTIONS = [
  { value: '15,000,000 - 45,000,000 EGP', label: '15M – 45M EGP', shortLabel: '15M – 45M EGP' },
  { value: 'Under 20,000,000 EGP', label: 'Under 20M EGP', shortLabel: '< 20M EGP' },
  { value: '20,000,000 - 35,000,000 EGP', label: '20M – 35M EGP', shortLabel: '20M – 35M EGP' },
  { value: '35,000,000 - 60,000,000 EGP', label: '35M – 60M EGP', shortLabel: '35M – 60M EGP' },
  { value: '60,000,000+ EGP', label: 'Ultra-Luxury (60M+ EGP)', shortLabel: '60M+ EGP' },
];

export const QuickSearchBar: React.FC<QuickSearchBarProps> = ({ onSearch }) => {
  const [location, setLocation] = useState('New Cairo, Fifth Settlement');
  const [propertyType, setPropertyType] = useState('Standalone Villa');
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
    <form ref={barRef} className="quick-search-bar" onSubmit={handleSubmit}>
      {/* 1. Location Custom Dropdown */}
      <div className="search-field custom-filter-dropdown">
        <label className="field-label">LOCATION</label>
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
              {LOCATION_OPTIONS.find((o) => o.value === location)?.shortLabel || location}
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
                  <span className="option-label">{opt.label}</span>
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
        <label className="field-label">PROPERTY TYPE</label>
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
              {TYPE_OPTIONS.find((o) => o.value === propertyType)?.shortLabel || propertyType}
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
                  <span className="option-label">{opt.label}</span>
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
        <label className="field-label">PRICE RANGE</label>
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
              {PRICE_OPTIONS.find((o) => o.value === priceTier)?.shortLabel || priceTier}
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
                  <span className="option-label">{opt.label}</span>
                  {priceTier === opt.value && <Check size={14} className="option-check" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit Button */}
      <button type="submit" className="search-submit-btn">
        <span>Search Properties</span>
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
            rgba(255, 255, 255, 0.30) 35%,
            rgba(255, 255, 255, 0.48) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.75);
          box-shadow: 
            0 18px 44px rgba(15, 23, 42, 0.08), 
            inset 0 1.5px 2px #FFFFFF,
            inset 0 -1px 1px rgba(255, 255, 255, 0.25);
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
          color: #E8C87A;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        [data-theme="light"] .field-label {
          color: #B8860B;
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
          color: #F5C672;
        }

        [data-theme="light"] .field-icon {
          color: #B8860B;
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
          color: #0D1117;
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
            rgba(255, 255, 255, 0.92) 0%,
            rgba(255, 255, 255, 0.82) 50%,
            rgba(255, 255, 255, 0.90) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 18px 45px rgba(15, 23, 42, 0.12),
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
          color: #1E293B;
        }

        [data-theme="dark"] .filter-menu-option {
          color: #E2E8F0;
        }

        .filter-menu-option:hover {
          background: rgba(197, 154, 69, 0.14);
          color: var(--gold-primary);
          transform: translateX(2px);
        }

        .filter-menu-option.selected {
          background: rgba(197, 154, 69, 0.20);
          color: var(--gold-primary);
          font-weight: 700;
        }

        .option-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .option-check {
          color: var(--gold-primary);
          flex-shrink: 0;
        }

        .search-divider {
          width: 1px;
          height: 34px;
          background: var(--border-subtle);
        }

        .search-submit-btn {
          white-space: nowrap;
          padding: 0.8125rem 1.75rem;
          font-size: 0.9375rem;
          font-weight: 700;
          background: linear-gradient(135deg, #F5E5BE 0%, #D4AF37 45%, #C59A45 100%);
          color: #0A0C10;
          border-radius: 10px;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 4px 18px rgba(197, 154, 69, 0.25), inset 0 1px 1.5px rgba(255, 255, 255, 0.7);
          transition: all var(--transition-smooth);
        }

        .filter-custom-trigger:focus-visible,
        .search-input-field:focus-visible,
        .filter-menu-option:focus-visible,
        .search-submit-btn:focus-visible {
          outline: 2px solid var(--gold-primary) !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 16px var(--gold-glow) !important;
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
      `}</style>
    </form>
  );
};
