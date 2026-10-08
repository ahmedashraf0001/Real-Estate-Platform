'use client';

import React, { useMemo } from 'react';
import { 
  Coins, 
  FileCheck, 
  TrendingUp, 
  Percent, 
  Calculator, 
  BarChart3, 
  Boxes 
} from 'lucide-react';
import type { SinglePropertyAnalysis } from '@/lib/erp/propertyAnalysisEngine';
import { formatCompactEGP } from '@/lib/erp/propertyAnalysisEngine';
import styles from './PropertyKpiBlueprintCards.module.css';

interface PropertyKpiBlueprintCardsProps {
  analysis: SinglePropertyAnalysis;
  isAr?: boolean;
  currentAccent?: string;
}

export const PropertyKpiBlueprintCards: React.FC<PropertyKpiBlueprintCardsProps> = ({
  analysis,
  isAr = true,
  currentAccent = 'var(--erp-accent, #2563eb)'
}) => {
  // Sparkline mini-bars data for RSV & Momentum
  const rsvBars = useMemo(() => [
    { height: 35, opacity: 0.35 },
    { height: 42, opacity: 0.4 },
    { height: 38, opacity: 0.45 },
    { height: 50, opacity: 0.5 },
    { height: 58, opacity: 0.6 },
    { height: 52, opacity: 0.65 },
    { height: 68, opacity: 0.75 },
    { height: 75, opacity: 0.85 },
    { height: 82, opacity: 0.9 },
    { height: 88, opacity: 0.95 },
    { height: 94, opacity: 1.0 },
    { height: 100, opacity: 1.0 }
  ], []);

  // Sparkline mini-bars data for NPV & ROI growth
  const npvBars = useMemo(() => [
    { height: 20, opacity: 0.3 },
    { height: 26, opacity: 0.35 },
    { height: 32, opacity: 0.4 },
    { height: 38, opacity: 0.45 },
    { height: 45, opacity: 0.5 },
    { height: 54, opacity: 0.6 },
    { height: 62, opacity: 0.7 },
    { height: 70, opacity: 0.8 },
    { height: 80, opacity: 0.85 },
    { height: 88, opacity: 0.9 },
    { height: 95, opacity: 0.95 },
    { height: 100, opacity: 1.0 }
  ], []);

  // Capital spent progression percentage
  const totalRsv = analysis.expectedTotalSales.toNumber();
  const investedCap = analysis.breakdown.totalInvestedCapital.toNumber();
  const spentPct = totalRsv > 0 ? Math.min(100, Math.round((investedCap / totalRsv) * 100)) : 58;

  // Absorption percentage
  const absorptionPct = Math.min(100, Math.max(0, Math.round(analysis.absorptionRatePct.toNumber())));

  // Capped ROI for clean display
  const rawRoi = analysis.roiPct.toNumber();
  const displayRoiText = rawRoi > 999 ? '>999%' : `${rawRoi.toFixed(1)}%`;

  return (
    <div className={styles.kpiGrid} dir={isAr ? 'rtl' : 'ltr'}>
      {/* CARD 1: إجمالي رأس المال المستثمر (Invested Capital) */}
      <div className={styles.kpiCard}>
        <div>
          <div className={styles.cardHeaderRow}>
            <h4 className={styles.cardTitle}>
              {isAr ? 'إجمالي رأس المال المستثمر' : 'Total Invested Capital'}
            </h4>
            <div className={styles.squircleBadge}>
              <Coins size={15} />
            </div>
          </div>

          <div className={styles.cardValueRow}>
            <span className={styles.cardValue}>
              {formatCompactEGP(analysis.breakdown.totalInvestedCapital, isAr)}
            </span>
          </div>

          <div className={styles.cardSubRow}>
            <span className={styles.cardSubLabel}>
              {isAr ? 'رأس مال منفق' : 'Incurred Capital'}
            </span>
          </div>
        </div>

        <div>
          <div className={styles.visualTrackRow}>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBarTrack}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${spentPct}%`, backgroundColor: currentAccent }}
                />
              </div>
              <span className={styles.progressPctLabel}>{spentPct}%</span>
            </div>
          </div>

          <div className={styles.footerCapsule}>
            <div className={styles.footerCapsuleLeading}>
              <span>
                {isAr 
                  ? `تكلفة المتر التقديرية: ${formatCompactEGP(analysis.costPerSqm, isAr)} / م²`
                  : `Estimated Cost: ${formatCompactEGP(analysis.costPerSqm, false)} / sqm`}
              </span>
            </div>
            <div className={styles.footerCapsuleIcon}>
              <Calculator size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: القيمة البيعية المتوقعة (RSV) */}
      <div className={styles.kpiCard}>
        <div>
          <div className={styles.cardHeaderRow}>
            <h4 className={styles.cardTitle}>
              {isAr ? 'القيمة البيعية المتوقعة (RSV)' : 'Expected Sales Value (RSV)'}
            </h4>
            <div className={styles.squircleBadge}>
              <FileCheck size={15} />
            </div>
          </div>

          <div className={styles.cardValueRow}>
            <span className={styles.cardValue}>
              {formatCompactEGP(analysis.expectedTotalSales, isAr)}
            </span>
          </div>

          <div className={styles.cardSubRow}>
            <span className={styles.cardSubLabel}>
              {isAr ? 'قيمة تعاقدية' : 'Contracted Value'}
            </span>
            <span className={styles.deltaPillGreen}>
              <span>▲ +14.2%</span>
            </span>
          </div>
        </div>

        <div>
          <div className={styles.visualTrackRow}>
            <div className={styles.miniSparklineBars}>
              {rsvBars.map((b, idx) => (
                <div
                  key={idx}
                  className={styles.sparklineBar}
                  style={{
                    height: `${b.height}%`,
                    backgroundColor: currentAccent,
                    opacity: b.opacity
                  }}
                />
              ))}
            </div>
          </div>

          <div className={styles.footerCapsule}>
            <div className={styles.footerCapsuleLeading}>
              <span>
                {isAr 
                  ? `المبيعات الفعلية المحققة: ${formatCompactEGP(analysis.contractedSales, isAr)}`
                  : `Contracted Sales: ${formatCompactEGP(analysis.contractedSales, false)}`}
              </span>
            </div>
            <div className={styles.footerCapsuleIcon}>
              <BarChart3 size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: صافي الربح المتوقع (NPV) */}
      <div className={styles.kpiCard}>
        <div>
          <div className={styles.cardHeaderRow}>
            <h4 className={styles.cardTitle}>
              {isAr ? 'صافي الربح المتوقع (NPV)' : 'Net Expected Profit (NPV)'}
            </h4>
            <div className={styles.squircleBadge}>
              <TrendingUp size={15} />
            </div>
          </div>

          <div className={styles.cardValueRow}>
            <span className={styles.cardValue}>
              {formatCompactEGP(analysis.netExpectedProfit, isAr)}
            </span>
          </div>

          <div className={styles.cardSubRow}>
            <span className={styles.cardSubLabel}>
              {isAr ? 'عائد ROI' : 'Return ROI'}
            </span>
            <span className={styles.deltaPillGreen}>
              <span>▲ {displayRoiText}</span>
            </span>
          </div>
        </div>

        <div>
          <div className={styles.visualTrackRow}>
            <div className={styles.miniSparklineBars}>
              {npvBars.map((b, idx) => (
                <div
                  key={idx}
                  className={styles.sparklineBar}
                  style={{
                    height: `${b.height}%`,
                    backgroundColor: '#16a34a',
                    opacity: b.opacity
                  }}
                />
              ))}
            </div>
          </div>

          <div className={styles.footerCapsule}>
            <div className={styles.footerCapsuleLeading}>
              <span>
                {isAr 
                  ? `العائد على الاستثمار: ${analysis.roiPct.toFixed(1)}%`
                  : `ROI: ${analysis.roiPct.toFixed(1)}%`}
              </span>
            </div>
            <div className={styles.footerCapsuleIcon}>
              <TrendingUp size={13} />
            </div>
          </div>
        </div>
      </div>

      {/* CARD 4: نسبة الامتصاص والمبيعات (Absorption & Sales) */}
      <div className={styles.kpiCard}>
        <div>
          <div className={styles.cardHeaderRow}>
            <h4 className={styles.cardTitle}>
              {isAr ? 'نسبة الامتصاص والمبيعات' : 'Sales Absorption Rate'}
            </h4>
            <div className={styles.squircleBadge}>
              <Percent size={15} />
            </div>
          </div>

          <div className={styles.cardValueRow}>
            <span className={styles.cardValue}>
              {analysis.absorptionRatePct.toFixed(1)}%
            </span>
          </div>

          <div className={styles.cardSubRow}>
            <span className={styles.cardSubLabel}>
              {isAr ? 'وحدات مباعة' : 'Sold Units'}
            </span>
            <span className={styles.deltaPillNeutral}>
              <span>{analysis.soldUnits} / {analysis.totalUnits}</span>
            </span>
          </div>
        </div>

        <div>
          <div className={styles.visualTrackRow}>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBarTrack}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${absorptionPct}%`, backgroundColor: currentAccent }}
                />
              </div>
              <span className={styles.progressPctLabel}>{absorptionPct}%</span>
            </div>
          </div>

          <div className={styles.footerCapsule}>
            <div className={styles.footerCapsuleLeading}>
              <span>
                {isAr 
                  ? `الوحدات المتعاقد عليها: ${analysis.soldUnits} من ${analysis.totalUnits} وحدة`
                  : `Contracted Units: ${analysis.soldUnits} of ${analysis.totalUnits}`}
              </span>
            </div>
            <div className={styles.footerCapsuleIcon}>
              <Boxes size={13} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
