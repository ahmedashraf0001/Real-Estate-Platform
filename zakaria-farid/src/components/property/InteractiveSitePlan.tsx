'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, SlidersHorizontal, ChevronRight, Building } from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatting';
import styles from './InteractiveSitePlan.module.css';

interface BuildingData {
  id: number;
  number: number;
  apartments: number;
  completion: string;
  pinX: number; // percentage
  pinY: number; // percentage
  breakdown: {
    type: string;
    count: number;
    fromPrice: number;
  }[];
}

const DUMMY_BUILDINGS: BuildingData[] = [
  {
    id: 1,
    number: 1,
    apartments: 24,
    completion: 'Q2 2026',
    pinX: 25,
    pinY: 60,
    breakdown: [
      { type: '1-bedroom', count: 8, fromPrice: 4500000 },
      { type: '2-bedroom', count: 12, fromPrice: 6800000 },
      { type: '3-bedroom', count: 4, fromPrice: 9200000 },
    ],
  },
  {
    id: 2,
    number: 2,
    apartments: 30,
    completion: 'Q3 2027',
    pinX: 38,
    pinY: 52,
    breakdown: [
      { type: '1-bedroom', count: 9, fromPrice: 5000000 },
      { type: '2-bedroom', count: 2, fromPrice: 8000000 },
      { type: '3-bedroom', count: 18, fromPrice: 8800000 },
      { type: '4-bedroom', count: 1, fromPrice: 12500000 },
    ],
  },
  {
    id: 3,
    number: 3,
    apartments: 18,
    completion: 'Q4 2026',
    pinX: 52,
    pinY: 45,
    breakdown: [
      { type: '2-bedroom', count: 10, fromPrice: 7500000 },
      { type: '3-bedroom', count: 8, fromPrice: 9900000 },
    ],
  },
  {
    id: 4,
    number: 4,
    apartments: 36,
    completion: 'Q1 2027',
    pinX: 62,
    pinY: 28,
    breakdown: [
      { type: '1-bedroom', count: 16, fromPrice: 4800000 },
      { type: '2-bedroom', count: 20, fromPrice: 7200000 },
    ],
  },
  {
    id: 5,
    number: 5,
    apartments: 20,
    completion: 'Q3 2026',
    pinX: 45,
    pinY: 32,
    breakdown: [
      { type: '3-bedroom', count: 12, fromPrice: 10500000 },
      { type: '4-bedroom', count: 8, fromPrice: 14000000 },
    ],
  },
  {
    id: 6,
    number: 6,
    apartments: 28,
    completion: 'Q2 2027',
    pinX: 32,
    pinY: 38,
    breakdown: [
      { type: '1-bedroom', count: 10, fromPrice: 5200000 },
      { type: '2-bedroom', count: 18, fromPrice: 7800000 },
    ],
  },
];

interface InteractiveSitePlanProps {
  propertyTitle: string;
  locale: string;
  onOpenUnitModal?: () => void;
}

export default function InteractiveSitePlan({
  propertyTitle,
  locale,
  onOpenUnitModal,
}: InteractiveSitePlanProps) {
  const isAr = locale === 'ar';
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingData>(DUMMY_BUILDINGS[1]);

  return (
    <section className={styles.section}>
      <div className="container">
        {/* Header Label */}
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>{isAr ? 'المخطط العام التفاعلي' : 'INTERACTIVE MASTER PLAN'}</span>
          <h2 className={styles.title}>{propertyTitle}</h2>
          <p className={styles.sub}>{isAr ? 'اختر المبنى على المخطط لعرض التفاصيل والوحدات المتاحة' : 'Select a building on the master plan to explore available units'}</p>
        </div>

        {/* Master Plan Viewer Container */}
        <div className={styles.planContainer}>
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80"
            alt="Master Plan Aerial Render"
            fill
            style={{ objectFit: 'cover', filter: 'brightness(0.7)' }}
          />
          <div className={styles.planOverlay} />

          {/* Interactive Numbered Pins */}
          {DUMMY_BUILDINGS.map((b) => {
            const isSelected = selectedBuilding.id === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBuilding(b)}
                className={`${styles.buildingPin} ${isSelected ? styles.pinSelected : ''}`}
                style={{ left: `${b.pinX}%`, top: `${b.pinY}%` }}
                aria-label={`Select Building ${b.number}`}
              >
                <span>{b.number}</span>
              </button>
            );
          })}

          {/* Floating Dark Detail Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedBuilding.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={styles.detailCard}
            >
              <div className={styles.cardHeader}>
                <span className={styles.bldgNum}>{selectedBuilding.number}</span>
                <div className={styles.bldgMeta}>
                  <span className={styles.bldgLabel}>{isAr ? 'المبنى رقم' : 'Building №'}</span>
                  <span className={styles.bldgCompletion}>{selectedBuilding.completion}</span>
                </div>
              </div>

              <div className={styles.cardStatsRow}>
                <div className={styles.statBox}>
                  <span className={styles.statVal}>{selectedBuilding.apartments}</span>
                  <span className={styles.statName}>{isAr ? 'وحدة سكنية' : 'apartments'}</span>
                </div>
              </div>

              {/* Unit Type Breakdown Table */}
              <div className={styles.breakdownTable}>
                {selectedBuilding.breakdown.map((row) => (
                  <div key={row.type} className={styles.tableRow}>
                    <span className={styles.typeName}>{row.type}</span>
                    <span className={styles.typeCount}>{row.count}</span>
                    <span className={styles.typePrice}>from {formatPrice(row.fromPrice, locale)}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onOpenUnitModal}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '16px' }}
              >
                {isAr ? 'عرض وحدات المبنى' : 'Select on 3D plan'} →
              </button>
            </motion.div>
          </AnimatePresence>

          {/* Floating Filter Button (Bottom Left) */}
          <button className={styles.floatingFilterBtn}>
            <SlidersHorizontal size={14} />
            <span>{isAr ? 'تصفية المخطط' : 'Filters'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
