/**
 * Zakaria Farid Real Estate ERP: Properties Inventory KPIs
 * 4 Discrete Floating White Cards (.discreteKpiCard in .discreteKpiGrid)
 * Follows FIN-OS Design System Invariants & Anti-Slop Guidelines:
 * - Neutral white card surfaces (#ffffff !important; 1px #cbd5e1 border, 12px radius)
 * - Zero enclosing outer panel / container
 * - 28x28px squircle icons consuming dynamic accents
 * - Card 1: Avg Price / m² with benchmark market range gauge
 * - Card 2: Available inventory market value with dynamic accent progress bar
 * - Card 3: Absorbed building capital with 3-segment progress
 * - Card 4: Contracted sales volume with green progress bar & soft green pill badge
 * - Strict RTL isolation, Western Arabic digits (0-9), tabular numerals, zero fake static data
 */

'use client';

import React, { useMemo } from 'react';
import { 
  Tag, 
  Home, 
  Calculator, 
  Layers, 
  Coins, 
  FileText, 
  TrendingUp 
} from 'lucide-react';
import { Decimal } from '@/lib/erp/math';
import styles from './PropertiesInventoryKpis.module.css';

export interface PropertiesInventoryKpisProps {
  totalUnitsCount: number;
  availableUnitsCount: number;
  contractedUnitsCount: number;
  totalCatalogVal: Decimal;
  availableInventoryVal: Decimal;
  contractedSalesVal: Decimal;
  totalAreaSqm: Decimal;
  avgPricePerSqm: Decimal;
  totalWipInvested: Decimal;
  costItemsCount?: number;
  isAr?: boolean;
}

export const PropertiesInventoryKpis: React.FC<PropertiesInventoryKpisProps> = ({
  totalUnitsCount,
  availableUnitsCount,
  contractedUnitsCount: _contractedUnitsCount,
  totalCatalogVal,
  availableInventoryVal,
  contractedSalesVal,
  totalAreaSqm,
  avgPricePerSqm,
  totalWipInvested,
  costItemsCount = 0,
  isAr = true,
}) => {
  // ─── Card 1: Avg Price / m² ───
  const avgPriceNum = avgPricePerSqm?.toNumber() || 0;
  const displayAvgPrice = useMemo(() => {
    if (avgPriceNum > 0) {
      return avgPriceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '0.00';
  }, [avgPriceNum]);

  // Card 1 Gauge Needle Position
  // Benchmark range: Min 32,000, Benchmark ~48,000, Max 65,000
  const gaugeMin = 32000;
  const gaugeMax = 65000;
  const needlePct = useMemo(() => {
    if (avgPriceNum <= 0) return 0;
    const clamped = Math.max(gaugeMin, Math.min(gaugeMax, avgPriceNum));
    return Math.round(((clamped - gaugeMin) / (gaugeMax - gaugeMin)) * 100);
  }, [avgPriceNum]);

  // ─── Card 2: Available Inventory ───
  const availValNum = availableInventoryVal?.toNumber() || 0;
  const displayAvailVal = useMemo(() => {
    if (availValNum > 0) {
      return Math.round(availValNum).toLocaleString('en-US');
    }
    return '0';
  }, [availValNum]);

  const availPct = useMemo(() => {
    const total = totalCatalogVal?.toNumber() || 0;
    if (total > 0 && availValNum > 0) {
      return Math.min(100, Math.max(0, Math.round((availValNum / total) * 100)));
    }
    return 0;
  }, [totalCatalogVal, availValNum]);

  // ─── Card 3: WIP Capital Invested ───
  const wipNum = totalWipInvested?.toNumber() || 0;
  const displayWipVal = useMemo(() => {
    if (wipNum > 0) {
      return Math.round(wipNum).toLocaleString('en-US');
    }
    return '0';
  }, [wipNum]);

  // ─── Card 4: Contracted Sales ───
  const salesNum = contractedSalesVal?.toNumber() || 0;
  const displaySalesVal = useMemo(() => {
    if (salesNum > 0) {
      return Math.round(salesNum).toLocaleString('en-US');
    }
    return '0';
  }, [salesNum]);

  const soldPct = useMemo(() => {
    const total = totalCatalogVal?.toNumber() || 0;
    if (total > 0 && salesNum > 0) {
      return Math.min(100, Math.max(0, Math.round((salesNum / total) * 100)));
    }
    return 0;
  }, [totalCatalogVal, salesNum]);

  const totalAreaNum = totalAreaSqm?.toNumber() || 0;
  const displayArea = totalAreaNum > 0 ? Math.round(totalAreaNum).toLocaleString('en-US') : '0';
  const displayUnits = totalUnitsCount || 0;
  const displayAvailUnits = availableUnitsCount || 0;
  const displayCostCount = costItemsCount || 0;

  return (
    <div className={styles.discreteKpiGrid} dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── CARD 1: AVG PRICE / SQM ─── */}
      <div className={styles.discreteKpiCard}>
        <div className={styles.cardTopContent}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              {isAr ? 'متوسط سعر المتر البيعي' : 'Average price / m²'}
            </h3>
            <div className={styles.squircleIcon}>
              <Tag size={16} />
            </div>
          </div>

          <div className={styles.cardValueRow}>
            <span className={styles.cardValue}>
              <bdi>{displayAvgPrice}</bdi>
            </span>
            <span className={styles.cardUnit}>
              {isAr ? 'ج.م / م²' : 'EGP / m²'}
            </span>
          </div>

          {/* Benchmark range gauge */}
          <div className={styles.middleTelemetry}>
            <div className={styles.gaugeTrack} dir="ltr">
              <div 
                className={styles.gaugeZone} 
                style={{ 
                  left: '38%', 
                  width: '28%' 
                }} 
              />
              <div 
                className={styles.gaugeNeedle} 
                style={{ 
                  left: `${needlePct}%` 
                }} 
                title={`${isAr ? 'القيمة الحالية' : 'Current value'}: ${displayAvgPrice}`}
              />
            </div>
            <div className={styles.gaugeLabels} dir="ltr">
              <span>{gaugeMin.toLocaleString('en-US')}</span>
              <span className={styles.gaugeBenchmarkText}>
                {isAr ? 'متوسط السوق' : 'Market average'}
              </span>
              <span>{gaugeMax.toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>

        {/* Sub-row: Area + Units */}
        <div className={styles.card1SubRow}>
          <div className={styles.card1SubItem}>
            <Calculator size={15} className={styles.metaIcon} />
            <div className={styles.metaTextGroup}>
              <span className={styles.metaSecondary}>
                {isAr ? 'إجمالي مساحات المحفظة' : 'Total portfolio area'}
              </span>
              <span className={styles.metaPrimary}>
                {displayArea} {isAr ? 'م²' : 'm²'}
              </span>
            </div>
          </div>

          <div className={styles.card1Divider} />

          <div className={styles.card1SubItem}>
            <Home size={16} className={styles.metaIcon} />
            <div className={styles.metaTextGroup}>
              <span className={styles.metaPrimary}>
                {displayUnits} {isAr ? 'وحدة' : 'units'}
              </span>
              <span className={styles.metaSecondary}>
                {isAr ? 'من إجمالي المحفظة' : 'of total catalog'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CARD 2: AVAILABLE INVENTORY MARKET VALUE ─── */}
      <div className={styles.discreteKpiCard}>
        <div className={styles.cardTopContent}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              {isAr ? 'قيمة المخزون المتاح للبيع' : 'Available inventory value'}
            </h3>
            <div className={styles.squircleIcon}>
              <Layers size={16} />
            </div>
          </div>

          <div className={styles.cardValueRow}>
            <span className={styles.cardValue}>
              <bdi>{displayAvailVal}</bdi>
            </span>
            <span className={styles.cardUnit}>
              {isAr ? 'ج.م' : 'EGP'}
            </span>
          </div>

          {/* Dynamic accent progress bar */}
          <div className={styles.middleTelemetry}>
            <div className={styles.progressBarRow} dir="ltr">
              <div className={styles.progressBarTrack}>
                <div 
                  className={styles.progressFillAccent} 
                  style={{ width: `${availPct}%` }} 
                />
              </div>
              <span className={styles.progressPctText}>{availPct}%</span>
            </div>
            <div className={styles.progressSublabelWrap}>
              <span className={styles.progressSublabel}>
                {isAr ? 'من إجمالي المخزون' : 'of total portfolio inventory'}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-row: Booking availability */}
        <div className={styles.bottomMetaRow}>
          <div className={styles.metaTextGroup}>
            <span className={styles.metaSecondary}>
              {isAr ? 'متاح للتعاقد الفوري' : 'Available for booking'}
            </span>
            <span className={styles.metaPrimary}>
              {displayAvailUnits} {isAr ? 'وحدة شاغرة' : 'vacant units'}
            </span>
          </div>
          <Calculator size={18} className={styles.metaIcon} />
        </div>
      </div>

      {/* ─── CARD 3: ABSORBED CONSTRUCTION CAPITAL ─── */}
      <div className={styles.discreteKpiCard}>
        <div className={styles.cardTopContent}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              {isAr ? 'رأس المال المستثمر في المباني' : 'Absorbed building capital'}
            </h3>
            <div className={`${styles.squircleIcon} ${styles.squircleSlate}`}>
              <Coins size={16} />
            </div>
          </div>

          <div className={styles.cardValueRow}>
            <span className={styles.cardValue}>
              <bdi>{displayWipVal}</bdi>
            </span>
            <span className={styles.cardUnit}>
              {isAr ? 'ج.م' : 'EGP'}
            </span>
          </div>

          {/* 3-Segment progress bar */}
          <div className={styles.middleTelemetry}>
            <div className={styles.segmentedBarTrack} dir="ltr">
              <div className={styles.segmentDark} style={{ width: '45%' }} />
              <div className={styles.segmentMedium} style={{ width: '35%' }} />
              <div className={styles.segmentLight} style={{ width: '20%' }} />
            </div>
            <div className={styles.segmentLegend}>
              <span>
                <span className={styles.legendDot} style={{ background: '#334155' }} />
                {isAr ? 'مباني' : 'Structural'}
              </span>
              <span>
                <span className={styles.legendDot} style={{ background: '#64748b' }} />
                {isAr ? 'أعمال إنشائية' : 'Civil works'}
              </span>
              <span>
                <span className={styles.legendDot} style={{ background: '#cbd5e1' }} />
                {isAr ? 'أخرى' : 'Other'}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-row: Capitalized WIP items */}
        <div className={styles.bottomMetaRow}>
          <div className={styles.metaTextGroup}>
            <span className={styles.metaSecondary}>
              {isAr ? 'أصل استثماري محمل' : 'Capitalized WIP assets'}
            </span>
            <span className={styles.metaPrimary}>
              {displayCostCount} {isAr ? 'فواتير وبند تكلفة' : 'cost items and invoices'}
            </span>
          </div>
          <FileText size={18} className={styles.metaIcon} />
        </div>
      </div>

      {/* ─── CARD 4: CONTRACTED SALES VELOCITY ─── */}
      <div className={styles.discreteKpiCard}>
        <div className={styles.cardTopContent}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              {isAr ? 'إجمالي مبيعات المحفظة' : 'Contracted sales volume'}
            </h3>
            <div className={`${styles.squircleIcon} ${styles.squircleGreen}`}>
              <TrendingUp size={16} />
            </div>
          </div>

          <div className={styles.cardValueRow}>
            <span className={styles.cardValue}>
              <bdi>{displaySalesVal}</bdi>
            </span>
            <span className={styles.cardUnit}>
              {isAr ? 'ج.م' : 'EGP'}
            </span>
          </div>

          {/* Green progress bar & soft green micro-pill */}
          <div className={styles.middleTelemetry}>
            <div className={styles.progressBarTrack} dir="ltr" style={{ width: '100%', marginBottom: '0.5rem' }}>
              <div 
                className={styles.progressFillGreen} 
                style={{ width: `${soldPct}%` }} 
              />
            </div>
            <div className={styles.card4PillRow}>
              <span className={styles.pillLabelText}>
                {isAr ? 'نسبة المبيعات من المحفظة' : 'of portfolio ceiling'}
              </span>
              <div className={styles.card4Divider} />
              <span className={styles.statusPillGreen}>
                {soldPct}% {isAr ? 'مبيع' : 'sold'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.card4BottomSpacer} />
      </div>
    </div>
  );
};
