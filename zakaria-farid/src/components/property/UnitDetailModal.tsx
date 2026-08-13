'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Download, Bookmark, Maximize2, Compass } from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatting';
import styles from './UnitDetailModal.module.css';

interface UnitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTitle: string;
  price: number;
  locale: string;
  areaSqm: number;
}

export default function UnitDetailModal({
  isOpen,
  onClose,
  propertyTitle,
  price,
  locale,
  areaSqm,
}: UnitDetailModalProps) {
  const isAr = locale === 'ar';
  const [paymentMode, setPaymentMode] = useState<'full' | 'mortgage' | 'installment'>('full');
  const [activeTab, setActiveTab] = useState<'plan' | 'unfurnished' | 'floor' | 'view'>('plan');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={styles.backdrop} onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Band */}
          <div className={styles.header}>
            <div className={styles.headerMeta}>
              <span className={styles.unitCode}>CODE: ZF-1048</span>
              <h3 className={styles.unitTitle}>{propertyTitle} · {areaSqm}m²</h3>
            </div>

            <div className={styles.headerActions}>
              <button className={styles.iconBtn} aria-label="Share"><Share2 size={16} /></button>
              <button className={styles.iconBtn} aria-label="Download Spec Sheet"><Download size={16} /></button>
              <button className={styles.iconBtn} aria-label="Save Unit"><Bookmark size={16} /></button>
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={20} /></button>
            </div>
          </div>

          {/* Modal Grid */}
          <div className={styles.bodyGrid}>
            {/* Left Column: Financial & Specifications */}
            <div className={styles.colLeft}>
              <div className={styles.priceWrap}>
                <span className={styles.priceLabel}>{isAr ? 'السعر الكلي' : 'TOTAL INVESTMENT'}</span>
                <span className={styles.priceVal}>{formatPrice(price, locale)}</span>
              </div>

              {/* Payment Mode Segmented Control */}
              <div className={styles.paymentToggle}>
                <button
                  className={`${styles.payTab} ${paymentMode === 'full' ? styles.payTabActive : ''}`}
                  onClick={() => setPaymentMode('full')}
                >
                  {isAr ? 'دفعة واحدة' : '100% Payment'}
                </button>
                <button
                  className={`${styles.payTab} ${paymentMode === 'mortgage' ? styles.payTabActive : ''}`}
                  onClick={() => setPaymentMode('mortgage')}
                >
                  {isAr ? 'تمويل عقاري' : 'Mortgage'}
                </button>
                <button
                  className={`${styles.payTab} ${paymentMode === 'installment' ? styles.payTabActive : ''}`}
                  onClick={() => setPaymentMode('installment')}
                >
                  {isAr ? 'تقسيط مباشر' : 'Installment'}
                </button>
              </div>

              {/* Unit Specifications List */}
              <div className={styles.specList}>
                <div className={styles.specRow}>
                  <span>{isAr ? 'المشروع' : 'Project'}</span>
                  <strong>{propertyTitle}</strong>
                </div>
                <div className={styles.specRow}>
                  <span>{isAr ? 'تاريخ التسليم' : 'Completion Date'}</span>
                  <strong>Q4 2026</strong>
                </div>
                <div className={styles.specRow}>
                  <span>{isAr ? 'المساحة الصافية' : 'Living Area'}</span>
                  <strong>{areaSqm} m²</strong>
                </div>
                <div className={styles.specRow}>
                  <span>{isAr ? 'ارتفاع الأسقف' : 'Ceiling Height'}</span>
                  <strong>3.40 m</strong>
                </div>
              </div>

              {/* Feature Tag Pills */}
              <div className={styles.tagGroup}>
                <span className={styles.tagPill}>{isAr ? 'مطبخ رئيسي واسع' : 'Large Kitchen'}</span>
                <span className={styles.tagPill}>{isAr ? 'شرفة إيطالية' : 'Loggia Terrace'}</span>
                <span className={styles.tagPill}>{isAr ? 'تشطيب سوبر لوكس' : 'Premium Finishing'}</span>
              </div>

              {/* Reserve CTA */}
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 'auto' }}>
                {isAr ? 'حجز الوحدة الآن' : 'Reserve Unit Direct'}
              </button>
            </div>

            {/* Right Column: Floor Plan SVG Viewer */}
            <div className={styles.colRight}>
              {/* Floor Plan View Tabs */}
              <div className={styles.planTabs}>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'plan' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('plan')}
                >
                  {isAr ? 'المخطط الهندسي' : 'Floor Plan'}
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'unfurnished' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('unfurnished')}
                >
                  {isAr ? 'بدون أثاث' : 'Unfurnished'}
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'floor' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('floor')}
                >
                  {isAr ? 'موقع الطابق' : 'Floor Map'}
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'view' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('view')}
                >
                  {isAr ? 'الإطلالة' : 'Window View'}
                </button>
              </div>

              {/* Floor Plan Visualizer */}
              <div className={styles.planCanvas}>
                <svg viewBox="0 0 400 300" className={styles.svgCanvas}>
                  <rect x="20" y="20" width="360" height="260" fill="none" stroke="#AC8054" strokeWidth="2" rx="8" />
                  <line x1="160" y1="20" x2="160" y2="280" stroke="#AC8054" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="20" y1="160" x2="280" y2="160" stroke="#AC8054" strokeWidth="1.5" strokeDasharray="4 4" />

                  {/* Room Dimension Labels */}
                  <text x="80" y="90" fill="#1E2026" fontSize="11" fontWeight="700" textAnchor="middle">
                    LIVING ROOM · 48m²
                  </text>
                  <text x="270" y="90" fill="#1E2026" fontSize="11" fontWeight="700" textAnchor="middle">
                    MASTER BEDROOM · 32m²
                  </text>
                  <text x="80" y="220" fill="#1E2026" fontSize="11" fontWeight="700" textAnchor="middle">
                    DINING & KITCHEN · 28m²
                  </text>
                  <text x="270" y="220" fill="#1E2026" fontSize="11" fontWeight="700" textAnchor="middle">
                    TERRACE · 18m²
                  </text>
                </svg>

                <div className={styles.canvasControls}>
                  <button className={styles.compassBtn}>
                    <Compass size={16} /> N
                  </button>
                  <button className={styles.expandBtn}>
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
