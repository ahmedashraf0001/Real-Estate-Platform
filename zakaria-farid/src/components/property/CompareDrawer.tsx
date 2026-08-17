'use client';
import React, { useState, useEffect } from 'react';
import { Property } from '@/types';
import { 
  Scale, 
  X, 
  ArrowUpRight, 
  Check, 
  Minus, 
  Bed, 
  Bath, 
  Maximize2, 
  Calendar, 
  MapPin, 
  Building2, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CompareDrawerProps {
  selectedProperties: Property[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelectProperty: (id: string) => void;
}

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  selectedProperties,
  onRemove,
  onClear,
  onSelectProperty
}) => {
  const [isOpenModal, setIsOpenModal] = useState(false);

  useEffect(() => {
    if (isOpenModal) {
      // 1. Stop Lenis smooth scroll while modal is open
      if (typeof window !== 'undefined' && window.__masrLenis) {
        window.__masrLenis.stop();
      }

      // 2. Lock standard browser scroll
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      return () => {
        // Resume Lenis smooth scroll on modal close
        if (typeof window !== 'undefined' && window.__masrLenis) {
          window.__masrLenis.start();
        }
        document.documentElement.style.overflow = originalHtmlOverflow || '';
        document.body.style.overflow = originalBodyOverflow || '';
      };
    }
  }, [isOpenModal]);

  if (selectedProperties.length === 0) return null;

  const maxSlots = 3;
  const canCompare = selectedProperties.length >= 2;

  // Aggregate all unique amenities from selected properties for comparison matrix
  const allAmenities = Array.from(
    new Set(selectedProperties.flatMap((p) => p.amenities.map((a) => a.title)))
  );

  return (
    <>
      {/* 1. Floating Crystal Dock Bar at bottom of screen */}
      <div className="compare-dock-wrapper">
        <motion.div
          className="compare-dock-container"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        >
          <div className="compare-dock-inner">
            <div className="compare-dock-info">
              <div className="compare-icon-wrap">
                <Scale size={18} className="dock-scale-icon" />
              </div>
              <div>
                <span className="dock-title">Estate Comparison</span>
                <span className="dock-subtitle">
                  {selectedProperties.length} of {maxSlots} Selected {canCompare ? '(Ready)' : '(Select 1 more)'}
                </span>
              </div>
            </div>

            <div className="dock-slots-row">
              {selectedProperties.map((p) => (
                <div key={p.id} className="dock-slot filled">
                  <img src={p.images[0]} alt={p.title} className="dock-slot-img" />
                  <div className="dock-slot-meta">
                    <span className="slot-title">{p.title}</span>
                    <span className="slot-price">
                      {new Intl.NumberFormat('en-US').format(p.price)} {p.currency}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(p.id);
                    }}
                    className="dock-remove-btn"
                    title="Remove from comparison"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}

              {Array.from({ length: maxSlots - selectedProperties.length }).map((_, idx) => (
                <div key={`empty-${idx}`} className="dock-slot empty">
                  <span className="empty-text">+ Add Estate</span>
                </div>
              ))}
            </div>

            <div className="dock-actions-row">
              <button
                onClick={() => canCompare && setIsOpenModal(true)}
                disabled={!canCompare}
                className={`btn-gold dock-compare-btn ${!canCompare ? 'disabled' : ''}`}
                title={canCompare ? 'Open Comparison Matrix' : 'Select at least 2 properties'}
              >
                <Scale size={15} />
                <span>Compare ({selectedProperties.length})</span>
              </button>
              <button onClick={onClear} className="dock-clear-btn" title="Clear comparison list">
                Clear
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 2. Full Architectural Comparison Modal */}
      <AnimatePresence>
        {isOpenModal && (
          <motion.div 
            className="compare-modal-backdrop" 
            onClick={() => setIsOpenModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            data-lenis-prevent="true"
          >
            <motion.div
              className="compare-modal-window"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              data-lenis-prevent="true"
            >
              {/* Header */}
              <div className="modal-header">
                <div className="modal-title-wrap">
                  <div className="modal-icon-badge">
                    <Scale size={20} className="badge-gold-icon" />
                  </div>
                  <div>
                    <span className="eyebrow">ARCHITECTURAL PORTFOLIO ANALYSIS</span>
                    <h2 className="modal-heading">Side-by-Side Estate Comparison</h2>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpenModal(false)}
                  className="modal-close-btn"
                  title="Close Comparison"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Comparison Matrix Table */}
              <div 
                className="compare-matrix-scroll" 
                data-lenis-prevent="true"
                onWheel={(e) => e.stopPropagation()}
              >
                <div
                  className="compare-matrix-grid"
                  style={{
                    gridTemplateColumns: `220px repeat(${selectedProperties.length}, minmax(280px, 1fr))`
                  }}
                >
                  {/* Row 1: Estate Header & Imagery */}
                  <div className="matrix-row-label header-label">ESTATE OVERVIEW</div>
                  {selectedProperties.map((p) => (
                    <div key={`header-${p.id}`} className="matrix-card-cell header-cell">
                      <div className="cell-image-frame">
                        <img src={p.images[0]} alt={p.title} className="cell-img" />
                        <span className="cell-location-tag">
                          <MapPin size={11} />
                          <span>{p.district}</span>
                        </span>
                      </div>
                      <h4 className="cell-title">{p.title}</h4>
                      <span className="cell-type">{p.propertyType}</span>
                    </div>
                  ))}

                  {/* Row 2: Guide Price */}
                  <div className="matrix-row-label">GUIDE PRICE</div>
                  {selectedProperties.map((p) => (
                    <div key={`price-${p.id}`} className="matrix-cell highlight-cell">
                      <div className="cell-price-val">
                        {new Intl.NumberFormat('en-US').format(p.price)}{' '}
                        <span className="cell-currency">{p.currency}</span>
                      </div>
                    </div>
                  ))}

                  {/* Row 3: Price per sqm */}
                  <div className="matrix-row-label">PRICE / SQM</div>
                  {selectedProperties.map((p) => (
                    <div key={`sqmrate-${p.id}`} className="matrix-cell">
                      <span className="cell-sub-val">
                        {Math.round(p.price / p.sqm).toLocaleString('en-US')} EGP / m²
                      </span>
                    </div>
                  ))}

                  {/* Row 4: Built-up Area */}
                  <div className="matrix-row-label">BUILT-UP AREA</div>
                  {selectedProperties.map((p) => (
                    <div key={`sqm-${p.id}`} className="matrix-cell">
                      <span className="cell-metric-val">
                        <Maximize2 size={14} className="cell-spec-icon" />
                        <strong>{p.sqm}</strong> sqm
                      </span>
                    </div>
                  ))}

                  {/* Row 5: Bedrooms & Bathrooms */}
                  <div className="matrix-row-label">BEDROOMS / BATHS</div>
                  {selectedProperties.map((p) => (
                    <div key={`beds-${p.id}`} className="matrix-cell">
                      <span className="cell-metric-val">
                        <Bed size={14} className="cell-spec-icon" /> {p.beds} Beds •{' '}
                        <Bath size={14} className="cell-spec-icon" /> {p.baths} Baths
                      </span>
                    </div>
                  ))}

                  {/* Row 6: Delivery Year */}
                  <div className="matrix-row-label">DELIVERY YEAR</div>
                  {selectedProperties.map((p) => (
                    <div key={`built-${p.id}`} className="matrix-cell">
                      <span className="cell-metric-val">
                        <Calendar size={14} className="cell-spec-icon" />
                        {p.builtYear || 'Immediate Key Handover'}
                      </span>
                    </div>
                  ))}

                  {/* Row 7: Amenities Breakdown */}
                  <div className="matrix-row-label">KEY AMENITIES</div>
                  {selectedProperties.map((p) => (
                    <div key={`amenities-${p.id}`} className="matrix-cell amenities-cell">
                      <div className="amenities-chips-wrap">
                        {p.amenities.map((a, i) => (
                          <span key={i} className="matrix-amenity-chip">
                            <Check size={12} className="chip-check" />
                            <span>{a.title}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Row 8: Action CTA */}
                  <div className="matrix-row-label">ACQUISITION ACTION</div>
                  {selectedProperties.map((p) => (
                    <div key={`cta-${p.id}`} className="matrix-cell action-cell">
                      <button
                        onClick={() => {
                          setIsOpenModal(false);
                          onSelectProperty(p.id);
                        }}
                        className="btn-gold cell-explore-btn"
                      >
                        <span>View Dossier</span>
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* Floating Dock Wrapper & Bar */
        .compare-dock-wrapper {
          position: fixed;
          bottom: 24px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          pointer-events: none;
          z-index: 9999;
          padding: 0 1.25rem;
        }

        .compare-dock-container {
          width: 100%;
          max-width: 1100px;
          pointer-events: auto;
        }

        .compare-dock-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          border-radius: 24px;
          padding: 0.65rem 1rem;
          gap: 0.75rem;
          width: 100%;
          box-sizing: border-box;
          transition: all var(--transition-smooth);
        }

        [data-theme="dark"] .compare-dock-inner {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.28) 0%,
            rgba(255, 255, 255, 0.08) 25%,
            rgba(18, 24, 38, 0.42) 60%,
            rgba(10, 14, 24, 0.65) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.32);
          box-shadow: 
            0 24px 60px rgba(0, 0, 0, 0.45),
            0 0 30px rgba(252, 211, 77, 0.2),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
            inset 0 -1px 1px rgba(255, 255, 255, 0.15);
        }

        [data-theme="light"] .compare-dock-inner {
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.70) 0%,
            rgba(255, 255, 255, 0.35) 35%,
            rgba(255, 255, 255, 0.55) 100%
          );
          backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(20px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 
            0 20px 50px rgba(15, 23, 42, 0.10),
            0 0 30px rgba(184, 133, 48, 0.12),
            inset 0 1.5px 2px #FFFFFF;
        }

        .compare-dock-info {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
        }

        .compare-icon-wrap {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: rgba(197, 142, 54, 0.18);
          border: 1px solid var(--gold-border);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 14px rgba(197, 142, 54, 0.3);
          flex-shrink: 0;
        }

        .dock-scale-icon {
          color: var(--gold-primary);
        }

        .dock-title {
          font-family: var(--font-heading);
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--text-primary);
          display: block;
          line-height: 1.2;
        }

        .dock-subtitle {
          font-size: 0.6875rem;
          color: var(--text-secondary);
          display: block;
          white-space: nowrap;
        }

        .dock-slots-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex: 1 1 auto;
          min-width: 0;
          justify-content: center;
        }

        .dock-slot {
          display: flex;
          align-items: center;
          gap: 7px;
          border-radius: 12px;
          padding: 3px 8px 3px 3px;
          min-width: 80px;
          max-width: 165px;
          flex: 1 1 0px;
          height: 42px;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }

        [data-theme="dark"] .dock-slot.filled {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(221, 167, 82, 0.4);
        }

        [data-theme="light"] .dock-slot.filled {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid var(--gold-border);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .dock-slot.empty {
          justify-content: center;
          max-width: 110px;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .dock-slot.empty {
          border: 1px dashed rgba(221, 167, 82, 0.35);
          background: rgba(255, 255, 255, 0.03);
        }

        [data-theme="light"] .dock-slot.empty {
          border: 1.5px dashed rgba(197, 154, 69, 0.45);
          background: rgba(197, 154, 69, 0.05);
        }

        .empty-text {
          font-size: 0.72rem;
          white-space: nowrap;
          transition: color var(--transition-fast);
        }

        [data-theme="dark"] .empty-text {
          color: rgba(221, 167, 82, 0.9);
          font-weight: 600;
        }

        [data-theme="light"] .empty-text {
          color: var(--gold-primary);
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .dock-slot-img {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .dock-slot-meta {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .slot-title {
          font-family: var(--font-heading);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .slot-price {
          font-size: 0.65rem;
          color: var(--gold-primary);
          font-weight: 600;
          white-space: nowrap;
        }

        .dock-remove-btn {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .dock-remove-btn:hover {
          background: var(--gold-primary);
          color: #0A0C10;
        }

        .dock-actions-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-shrink: 0;
        }

        .dock-compare-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0.52rem 0.95rem;
          font-size: 0.8125rem;
          font-weight: 700;
          border-radius: 11px;
          white-space: nowrap;
        }

        .dock-compare-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.6);
        }

        .dock-clear-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.48rem 0.75rem;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: 1px solid var(--border-subtle);
          white-space: nowrap;
        }

        [data-theme="dark"] .dock-clear-btn {
          background: rgba(255, 255, 255, 0.06);
          color: #C7D2DF;
          border-color: rgba(255, 255, 255, 0.14);
        }

        [data-theme="dark"] .dock-clear-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
          border-color: rgba(255, 255, 255, 0.25);
        }

        [data-theme="light"] .dock-clear-btn {
          background: rgba(0, 0, 0, 0.04);
          color: #1E293B;
          border-color: rgba(0, 0, 0, 0.10);
        }

        [data-theme="light"] .dock-clear-btn:hover {
          background: rgba(0, 0, 0, 0.08);
          color: #0D1117;
          border-color: rgba(0, 0, 0, 0.18);
        }

        @media (max-width: 860px) {
          .dock-slot.empty {
            display: none;
          }
          .dock-subtitle {
            display: none;
          }
        }

        /* Full Comparison Modal Backdrop */
        .compare-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.45);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          overflow: hidden;
        }

        .compare-modal-window {
          backdrop-filter: blur(28px) saturate(210%) brightness(1.04);
          -webkit-backdrop-filter: blur(28px) saturate(210%) brightness(1.04);
          border-radius: 28px;
          width: 100%;
          max-width: 1200px;
          height: min(88vh, 840px);
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        [data-theme="dark"] .compare-modal-window {
          background: linear-gradient(
            140deg,
            rgba(255, 255, 255, 0.18) 0%,
            rgba(18, 24, 38, 0.85) 45%,
            rgba(10, 14, 24, 0.94) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 
            0 32px 80px rgba(0, 0, 0, 0.6),
            0 0 35px rgba(252, 211, 77, 0.18),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.65);
        }

        [data-theme="light"] .compare-modal-window {
          background: linear-gradient(
            140deg,
            rgba(255, 255, 255, 0.94) 0%,
            rgba(255, 255, 255, 0.84) 45%,
            rgba(255, 255, 255, 0.92) 100%
          );
          backdrop-filter: blur(24px) saturate(210%) contrast(108%) brightness(108%);
          -webkit-backdrop-filter: blur(24px) saturate(210%) contrast(108%) brightness(108%);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 32px 80px rgba(15, 23, 42, 0.12),
            0 0 35px rgba(184, 133, 48, 0.12),
            inset 0 2px 2.5px #FFFFFF;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.75rem 2rem;
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .modal-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: rgba(197, 142, 54, 0.18);
          border: 1px solid var(--gold-border);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(197, 142, 54, 0.25);
        }

        .badge-gold-icon {
          color: var(--gold-primary);
        }

        .modal-heading {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .modal-close-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        [data-theme="dark"] .modal-close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid var(--border-subtle);
          color: #ffffff;
        }

        [data-theme="light"] .modal-close-btn {
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #0D1117;
        }

        .modal-close-btn:hover {
          background: var(--gold-primary);
          color: #0A0C10;
        }

        /* Matrix Table Scroll */
        .compare-matrix-scroll {
          overflow-y: auto;
          overflow-x: auto;
          padding: 1.5rem 2rem 2.5rem;
          flex: 1 1 auto;
          min-height: 0;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .compare-matrix-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .compare-matrix-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
        }

        .compare-matrix-scroll::-webkit-scrollbar-thumb {
          background: rgba(221, 167, 82, 0.35);
          border-radius: 4px;
        }

        .compare-matrix-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(221, 167, 82, 0.65);
        }

        .compare-matrix-grid {
          display: grid;
          gap: 1rem 1.5rem;
          align-items: center;
        }

        .matrix-row-label {
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.75rem 0;
        }

        [data-theme="dark"] .matrix-row-label {
          color: #94A3B8;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        [data-theme="light"] .matrix-row-label {
          color: #64748B;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .matrix-row-label.header-label {
          border-bottom: none;
        }

        .matrix-card-cell {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cell-image-frame {
          position: relative;
          width: 100%;
          height: 170px;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .cell-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cell-location-tag {
          position: absolute;
          top: 10px;
          left: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(10, 14, 22, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          padding: 0.25rem 0.65rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #ffffff;
        }

        .cell-title {
          font-family: var(--font-heading);
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.25;
        }

        [data-theme="dark"] .cell-title {
          color: #ffffff;
        }

        [data-theme="light"] .cell-title {
          color: #0D1117;
        }

        .cell-type {
          font-size: 0.75rem;
          color: var(--gold-primary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .matrix-cell {
          padding: 0.75rem 0;
          display: flex;
          align-items: center;
        }

        [data-theme="dark"] .matrix-cell {
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        [data-theme="light"] .matrix-cell {
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .cell-price-val {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--gold-primary);
        }

        .cell-currency {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--gold-light);
        }

        .cell-sub-val {
          font-size: 0.9375rem;
          font-weight: 600;
        }

        [data-theme="dark"] .cell-sub-val {
          color: #CBD5E1;
        }

        [data-theme="light"] .cell-sub-val {
          color: #334155;
        }

        .cell-metric-val {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        [data-theme="dark"] .cell-metric-val {
          color: #ffffff;
        }

        [data-theme="light"] .cell-metric-val {
          color: #0D1117;
        }

        .cell-spec-icon {
          color: var(--gold-primary);
        }

        .amenities-cell {
          align-items: flex-start;
        }

        .amenities-chips-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .matrix-amenity-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 8px;
          padding: 0.25rem 0.55rem;
          font-size: 0.75rem;
        }

        [data-theme="dark"] .matrix-amenity-chip {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #E2E8F0;
        }

        [data-theme="light"] .matrix-amenity-chip {
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.08);
          color: #0D1117;
        }

        .chip-check {
          color: var(--gold-primary);
        }

        .action-cell {
          border-bottom: none;
          padding-top: 1rem;
        }

        .cell-explore-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: 12px;
        }

        @media (max-width: 768px) {
          .compare-dock-inner {
            flex-direction: column;
            gap: 0.75rem;
          }

          .dock-slots-row {
            width: 100%;
            overflow-x: auto;
            justify-content: flex-start;
          }

          .modal-header {
            padding: 1.25rem;
          }

          .compare-matrix-scroll {
            padding: 1rem;
          }
        }
      `}</style>
    </>
  );
};
