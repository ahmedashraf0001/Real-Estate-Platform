'use client';

import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Zap, 
  SlidersHorizontal, 
  BookOpen, 
  FileSpreadsheet, 
  Printer, 
  FileText, 
  ShieldCheck, 
  Coins, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  HardHat
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { ZFWorkstationSideWidgets, ZFWidgetCard } from '../common/ZFWorkstationSideWidgets';
import styles from './CalculatorSideWidgets.module.css';

export interface CalculatorSideWidgetsProps {
  calculatorMode: 'BUILT_PROPERTY_PRICING' | 'FEASIBILITY_ESTIMATOR';
  selectedProperty?: Property | null;
  pricingScope: 'whole' | 'apartment';
  activeUnit?: {
    unit_id: string;
    unit_number: string;
    floor: number;
    area_sqm: number;
    totalApartmentCost: number;
    suggestedPrice: number;
    pricePerSqm: number;
    grossMargin: number | string;
    status: string;
  } | null;

  // Actual / Apportioned figures
  totalIncurredCost: number | string;
  costPerSqm: number | string;
  builtUpArea: number;
  suggestedSellingPrice: number | string;
  sellingPricePerSqm: number | string;
  grossMarginPct: number | string;
  returnOnCostPct: number | string;
  targetProfitAmount: number | string;

  // Feasibility mode specific calculations
  feasibilityData?: {
    grandProjectCost: number;
    grandCostPerSqm: number;
    projectedGrossRevenue: number;
    projectedNetProfit: number;
    developerMarginPercent: number;
    roiPercent?: number;
    totalLandCost: number;
    totalConstructionCost?: number;
    totalConstructionWip?: number;
  };

  // Actions
  onExportExcel: () => void;
  isExportingExcel?: boolean;
  onPrint: () => void;
  onPreview: () => void;
  onSaveCatalogPrice?: () => void;
  isUpdatingPrice?: boolean;
  priceUpdateSuccess?: boolean;
  onOpenAudit?: () => void;
  onOpenContract?: () => void;
  onNavigateToTab?: (tab: string) => void;

  isAr: boolean;
}

export const CalculatorSideWidgets: React.FC<CalculatorSideWidgetsProps> = ({
  calculatorMode,
  selectedProperty,
  pricingScope,
  activeUnit,
  totalIncurredCost,
  costPerSqm,
  builtUpArea,
  suggestedSellingPrice,
  sellingPricePerSqm,
  grossMarginPct,
  returnOnCostPct,
  targetProfitAmount,
  feasibilityData,
  onExportExcel,
  isExportingExcel = false,
  onPrint,
  onPreview,
  onSaveCatalogPrice,
  isUpdatingPrice = false,
  priceUpdateSuccess = false,
  onOpenAudit,
  onOpenContract,
  onNavigateToTab,
  isAr,
}) => {
  // Scenario state for Cost Sensitivity widget: 'down10' (-10%), 'base' (0%), 'up10' (+10%)
  const [activeScenario, setActiveScenario] = useState<'down10' | 'base' | 'up10'>('base');

  const ChevronIcon = isAr ? ChevronLeft : ChevronRight;

  // Safe numeric values
  const effectiveCost = Number(
    calculatorMode === 'FEASIBILITY_ESTIMATOR' && feasibilityData
      ? feasibilityData.grandProjectCost
      : totalIncurredCost
  ) || 0;

  const effectiveCostPerSqm = Number(
    calculatorMode === 'FEASIBILITY_ESTIMATOR' && feasibilityData
      ? feasibilityData.grandCostPerSqm
      : costPerSqm
  ) || 0;

  const effectiveRevenue = Number(
    calculatorMode === 'FEASIBILITY_ESTIMATOR' && feasibilityData
      ? feasibilityData.projectedGrossRevenue
      : suggestedSellingPrice
  ) || 0;

  const effectiveProfit = Number(
    calculatorMode === 'FEASIBILITY_ESTIMATOR' && feasibilityData
      ? feasibilityData.projectedNetProfit
      : targetProfitAmount
  ) || 0;

  const effectiveMarginNum = calculatorMode === 'FEASIBILITY_ESTIMATOR' && feasibilityData
    ? feasibilityData.developerMarginPercent
    : (typeof grossMarginPct === 'string' ? parseFloat(grossMarginPct) || 0 : grossMarginPct || 0);

  const effectiveReturnOnCost = calculatorMode === 'FEASIBILITY_ESTIMATOR' && feasibilityData
    ? (feasibilityData.roiPercent ?? feasibilityData.developerMarginPercent)
    : (typeof returnOnCostPct === 'string' ? parseFloat(returnOnCostPct) || 0 : returnOnCostPct || 0);

  // Clamped margin for progress bar (0% to 100%)
  const clampedMargin = Math.min(100, Math.max(0, effectiveMarginNum));

  // Sensitivity scenarios calculations
  const shiftMultiplier = activeScenario === 'up10' ? 1.10 : activeScenario === 'down10' ? 0.90 : 1.0;
  const scenarioCostPerSqm = Math.round(effectiveCostPerSqm * shiftMultiplier);
  const scenarioTotalCost = Math.round(effectiveCost * shiftMultiplier);
  const costDelta = scenarioTotalCost - effectiveCost;
  // If selling price remains steady, profit moves by negative of cost delta
  const scenarioProfit = effectiveProfit - costDelta;
  const scenarioMargin = effectiveRevenue > 0
    ? Math.round(((scenarioProfit / effectiveRevenue) * 100) * 10) / 10
    : 0;

  // Format monetary value with strict tabular numbers and LTR numeral isolation
  const renderMoney = (val: number | string, unitSuffix?: string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : (val || 0);
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const parts = absNum.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = `${isNegative ? '-' : ''}${intPart}.${parts[1]}`;
    const sym = isAr ? 'ج.م' : 'EGP';
    return (
      <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}>
        {formatted} <span style={{ fontSize: '0.72em', color: '#64748b', fontWeight: 600 }}>{unitSuffix ? `${sym}/${unitSuffix}` : sym}</span>
      </span>
    );
  };

  const renderCompactMoney = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : (val || 0);
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    if (absNum >= 1_000_000) {
      const millions = (absNum / 1_000_000).toFixed(2);
      return (
        <span dir="ltr" style={{ fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}>
          {isNegative ? '-' : ''}{millions} <span style={{ fontSize: '0.78em', color: '#64748b' }}>{isAr ? 'مليون ج.م' : 'M EGP'}</span>
        </span>
      );
    }
    return renderMoney(val);
  };

  return (
    <ZFWorkstationSideWidgets
      title={isAr ? 'أدوات الجدوى وهيكلة التكاليف' : 'Feasibility & Cost Structuring'}
      badge={isAr ? (calculatorMode === 'BUILT_PROPERTY_PRICING' ? 'تسعير فعلي' : 'دراسة تقديرية') : (calculatorMode === 'BUILT_PROPERTY_PRICING' ? 'Actual Pricing' : 'Feasibility')}
      icon={<Calculator size={16} strokeWidth={1.8} />}
    >
      <div className={styles.sideWidgetsWrap}>
        
        {/* ─── WIDGET 1: FEASIBILITY & ROI SUMMARY ─── */}
        <ZFWidgetCard
          id="calculator-roi-summary"
          title={isAr ? 'ملخص الجدوى والعائد الاستثماري' : 'Feasibility & ROI Summary'}
          icon={<TrendingUp size={14} />}
          badge={
            <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {effectiveMarginNum}% {isAr ? 'هامش' : 'margin'}
            </span>
          }
          isAr={isAr}
        >
          <div className={styles.roiSummaryCard}>
            {/* Profit Hero Box */}
            <div className={styles.profitHeroBox}>
              <div className={styles.heroLabel}>
                <span>{isAr ? 'صافي الربح المتوقع المستهدف:' : 'Target Expected Profit:'}</span>
                <span className={styles.rocBadge}>
                  {effectiveReturnOnCost >= 0 ? `+${effectiveReturnOnCost}% ROC` : `${effectiveReturnOnCost}% ROC`}
                </span>
              </div>
              <div className={styles.profitValueRow}>
                <span className={styles.profitAmount}>
                  +{renderMoney(effectiveProfit)}
                </span>
              </div>
            </div>

            {/* Breakeven Cost per Sqm */}
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>
                {isAr ? 'تكلفة تعادل المتر (نقطة الصفر):' : 'Breakeven Cost / Sqm:'}
              </span>
              <span className={styles.metricValue}>
                {renderMoney(effectiveCostPerSqm, 'م²')}
              </span>
            </div>

            {/* Selling Price per Sqm */}
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>
                {isAr ? 'سعر بيع المتر المستهدف:' : 'Target Selling Price / Sqm:'}
              </span>
              <span className={styles.metricValue} style={{ color: 'var(--erp-accent, #2563eb)' }}>
                {renderMoney(sellingPricePerSqm, 'م²')}
              </span>
            </div>

            {/* Investment vs Revenue Comparison */}
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>
                {isAr ? 'إجمالي التكلفة الاستثمارية:' : 'Total Investment Cost:'}
              </span>
              <span className={styles.metricValue}>
                {renderCompactMoney(effectiveCost)}
              </span>
            </div>

            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>
                {isAr ? 'إجمالي المبيعات المستهدفة:' : 'Gross Target Sales:'}
              </span>
              <span className={styles.metricValue} style={{ color: '#0f172a' }}>
                {renderCompactMoney(effectiveRevenue)}
              </span>
            </div>

            {/* Margin Realization Progress Bar */}
            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>
                  {isAr ? 'معدل تحقيق الهامش المستهدف:' : 'Target Margin Realization:'}
                </span>
                <span className={styles.progressPct}>
                  {effectiveMarginNum}%
                </span>
              </div>
              <div className={styles.progressBarTrack} role="progressbar" aria-valuenow={clampedMargin} aria-valuemin={0} aria-valuemax={100}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${clampedMargin}%` }} 
                />
              </div>
              <div className={styles.progressTicks}>
                <span>0%</span>
                <span>{isAr ? 'الهدف 35%' : 'Target 35%'}</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </ZFWidgetCard>

        {/* ─── WIDGET 2: QUICK ACTIONS ─── */}
        <ZFWidgetCard
          id="calculator-quick-actions"
          title={isAr ? 'الإجراءات السريعة للدراسة' : 'Study Quick Actions'}
          icon={<Zap size={14} />}
          badge={
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              {activeUnit && activeUnit.status !== 'contracted' ? '5' : '4'} {isAr ? 'عمليات' : 'tools'}
            </span>
          }
          isAr={isAr}
        >
          <div className={styles.quickActionsList}>
            {/* 1. Export Excel Study */}
            <div
              className={styles.actionRow}
              onClick={onExportExcel}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExportExcel(); } }}
              title={isAr ? 'تصدير دراسة الجدوى بالكامل إلى ملف Excel' : 'Export Feasibility Study to Excel'}
            >
              <div className={styles.actionLeading}>
                <div className={`${styles.actionSquircle} ${styles.actionSquircleGreen}`}>
                  <FileSpreadsheet size={15} />
                </div>
                <div className={styles.actionText}>
                  <span className={styles.actionTitle}>
                    {isExportingExcel ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير شيت Excel' : 'Export Excel Study')}
                  </span>
                  <span className={styles.actionSub}>
                    {isAr ? 'ملف xlsx شامل التكاليف والجدوى' : 'Export full study to xlsx spreadsheet'}
                  </span>
                </div>
              </div>
              <ChevronIcon size={14} className={styles.actionChevron} />
            </div>

            {/* 2. Print Official Dossier */}
            <div
              className={styles.actionRow}
              onClick={onPrint}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPrint(); } }}
              title={isAr ? 'أمر طباعة المستند المعتمد والرسومات' : 'Print Official Valuation Dossier'}
            >
              <div className={styles.actionLeading}>
                <div className={`${styles.actionSquircle} ${styles.actionSquircleSlate}`}>
                  <Printer size={15} />
                </div>
                <div className={styles.actionText}>
                  <span className={styles.actionTitle}>{isAr ? 'طباعة دراسة الجدوى' : 'Print Study Dossier'}</span>
                  <span className={styles.actionSub}>{isAr ? 'أمر طباعة المستند المعتمد للهيكل' : 'Print approved valuation document'}</span>
                </div>
              </div>
              <ChevronIcon size={14} className={styles.actionChevron} />
            </div>

            {/* 3. Update Catalog Selling Price */}
            {calculatorMode === 'BUILT_PROPERTY_PRICING' && onSaveCatalogPrice && (
              <div
                className={styles.actionRow}
                onClick={onSaveCatalogPrice}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSaveCatalogPrice(); } }}
                title={isAr ? 'اعتماد وحفظ السعر البيعي بالكتالوج والدفاتر' : 'Update Catalog Selling Price'}
              >
                <div className={styles.actionLeading}>
                  <div className={`${styles.actionSquircle} ${styles.actionSquircleAccent}`}>
                    <ShieldCheck size={15} />
                  </div>
                  <div className={styles.actionText}>
                    <span className={styles.actionTitle}>
                      {priceUpdateSuccess
                        ? (isAr ? 'تم اعتماد وحفظ السعر' : 'Price Updated')
                        : isUpdatingPrice
                        ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                        : (isAr ? 'اعتماد السعر بالكتالوج' : 'Update Catalog Price')}
                    </span>
                    <span className={styles.actionSub}>
                      {isAr ? 'تحديث السعر البيعي المقترح بالدفاتر' : 'Save verified selling price to system'}
                    </span>
                  </div>
                </div>
                <ChevronIcon size={14} className={styles.actionChevron} />
              </div>
            )}

            {/* 4. Preview Official Document */}
            <div
              className={styles.actionRow}
              onClick={onPreview}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPreview(); } }}
              title={isAr ? 'معاينة المستند الرسمي قبل الطباعة والاعتماد' : 'Preview Official Document'}
            >
              <div className={styles.actionLeading}>
                <div className={`${styles.actionSquircle} ${styles.actionSquircleAmber}`}>
                  <FileText size={15} />
                </div>
                <div className={styles.actionText}>
                  <span className={styles.actionTitle}>{isAr ? 'معاينة وثيقة التسعير' : 'Preview Document'}</span>
                  <span className={styles.actionSub}>{isAr ? 'فحص المستند الرسمي قبل الطباعة' : 'Inspect official dossier layout'}</span>
                </div>
              </div>
              <ChevronIcon size={14} className={styles.actionChevron} />
            </div>

            {/* 5. Optional Contract Creation for Selected Unit */}
            {pricingScope === 'apartment' && activeUnit && activeUnit.status !== 'contracted' && onOpenContract && (
              <div
                className={styles.actionRow}
                onClick={onOpenContract}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenContract(); } }}
                title={isAr ? `تحرير عقد بيع للوحدة ${activeUnit.unit_number}` : `Create sales contract for unit ${activeUnit.unit_number}`}
              >
                <div className={styles.actionLeading}>
                  <div className={`${styles.actionSquircle} ${styles.actionSquircleEmerald}`}>
                    <Plus size={15} />
                  </div>
                  <div className={styles.actionText}>
                    <span className={styles.actionTitle} style={{ color: '#15803d' }}>
                      {isAr ? `+ عقد جديد لشقة ${activeUnit.unit_number}` : `+ Contract Unit ${activeUnit.unit_number}`}
                    </span>
                    <span className={styles.actionSub}>
                      {isAr ? 'فتح نافذة تحرير عقد البيع مباشرة' : 'Open contract wizard for this unit'}
                    </span>
                  </div>
                </div>
                <ChevronIcon size={14} className={styles.actionChevron} />
              </div>
            )}
          </div>
        </ZFWidgetCard>

        {/* ─── WIDGET 3: COST SENSITIVITY & MARKET SCENARIOS ─── */}
        <ZFWidgetCard
          id="calculator-sensitivity"
          title={isAr ? 'تحليل الحساسية وسيناريوهات السوق' : 'Cost Sensitivity & Scenarios'}
          icon={<SlidersHorizontal size={14} />}
          badge={
            <span style={{ fontSize: '0.68rem', color: 'var(--erp-accent, #2563eb)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              ±10%
            </span>
          }
          isAr={isAr}
        >
          <div className={styles.sensitivityCard}>
            {/* Scenario Selector Tabs */}
            <div className={styles.scenarioTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeScenario === 'down10'}
                className={`${styles.scenarioTabBtn} ${activeScenario === 'down10' ? styles.scenarioTabBtnActive : ''}`}
                onClick={() => setActiveScenario('down10')}
              >
                {isAr ? 'وفر -10%' : 'Save -10%'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeScenario === 'base'}
                className={`${styles.scenarioTabBtn} ${activeScenario === 'base' ? styles.scenarioTabBtnActive : ''}`}
                onClick={() => setActiveScenario('base')}
              >
                {isAr ? 'الأساس 0%' : 'Base 0%'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeScenario === 'up10'}
                className={`${styles.scenarioTabBtn} ${activeScenario === 'up10' ? styles.scenarioTabBtnActive : ''}`}
                onClick={() => setActiveScenario('up10')}
              >
                {isAr ? 'تضخم +10%' : 'Inflation +10%'}
              </button>
            </div>

            {/* Scenario Result Hero Box */}
            <div className={styles.scenarioHeroBox}>
              <div className={styles.scenarioBadgeRow}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                  {activeScenario === 'up10' 
                    ? (isAr ? 'سيناريو زيادة تكاليف الخامات (+10%)' : 'Material Inflation (+10%)')
                    : activeScenario === 'down10'
                    ? (isAr ? 'سيناريو وفر وخفض التكاليف (-10%)' : 'Operational Savings (-10%)')
                    : (isAr ? 'السيناريو الأساسي المعتمد بالدراسة' : 'Base Audited Feasibility')}
                </span>
                {activeScenario === 'up10' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700 }}>
                    <ArrowUpRight size={13} />
                    <span>+10%</span>
                  </span>
                ) : activeScenario === 'down10' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#16a34a', fontSize: '0.7rem', fontWeight: 700 }}>
                    <ArrowDownRight size={13} />
                    <span>-10%</span>
                  </span>
                ) : (
                  <span style={{ color: 'var(--erp-accent, #2563eb)', fontSize: '0.7rem', fontWeight: 700 }}>
                    0%
                  </span>
                )}
              </div>

              <div className={styles.scenarioDetailRow}>
                <span className={styles.scenarioDetailLabel}>
                  {isAr ? 'تكلفة المتر المحسوبة بالسيناريو:' : 'Scenario Cost / Sqm:'}
                </span>
                <span className={styles.scenarioDetailValue}>
                  {renderMoney(scenarioCostPerSqm, 'م²')}
                </span>
              </div>

              <div className={styles.scenarioDetailRow}>
                <span className={styles.scenarioDetailLabel}>
                  {isAr ? 'الأثر على إجمالي الأرباح:' : 'Profit Shift Impact:'}
                </span>
                <span 
                  className={styles.scenarioDetailValue} 
                  style={{ color: costDelta > 0 ? '#dc2626' : costDelta < 0 ? '#16a34a' : '#0f172a' }}
                >
                  {costDelta === 0 
                    ? (isAr ? 'الأساس بدون تغيير' : 'No shift')
                    : `${costDelta < 0 ? '+' : '-'}${renderMoney(Math.abs(costDelta))}`}
                </span>
              </div>

              <div className={styles.scenarioDetailRow}>
                <span className={styles.scenarioDetailLabel}>
                  {isAr ? 'هامش الربح بعد أثر السيناريو:' : 'Resulting Net Margin:'}
                </span>
                <span 
                  className={styles.scenarioDetailValue}
                  style={{ color: scenarioMargin >= 30 ? '#16a34a' : 'var(--erp-accent, #2563eb)' }}
                >
                  {scenarioMargin}%
                </span>
              </div>
            </div>
          </div>
        </ZFWidgetCard>

        {/* ─── WIDGET 4: CONNECTED GL LEDGER ACCOUNTS ─── */}
        <ZFWidgetCard
          id="calculator-ledger-accounts"
          title={isAr ? 'الحسابات المحاسبية المرتبطة بالدفتر' : 'Connected Ledger Accounts'}
          icon={<BookOpen size={14} />}
          badge={
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
              3 {isAr ? 'حسابات' : 'accounts'}
            </span>
          }
          isAr={isAr}
        >
          <div className={styles.accountsList}>
            {/* 1. Account 105000: Construction WIP */}
            <div
              className={styles.accountCard}
              onClick={() => onNavigateToTab ? onNavigateToTab('ledger') : (onOpenAudit ? onOpenAudit() : undefined)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' || e.key === ' ') { 
                  e.preventDefault(); 
                  if (onNavigateToTab) onNavigateToTab('ledger');
                  else if (onOpenAudit) onOpenAudit();
                } 
              }}
              title={isAr ? 'عرض قيود مشروعات تحت التنفيذ بدفتر الأستاذ' : 'View Construction WIP in General Ledger'}
            >
              <div className={styles.accountLeading}>
                <div className={styles.accountTitleRow}>
                  <span className={styles.accountCodeBadge}>105000</span>
                  <span className={styles.accountName}>
                    {isAr ? 'مشروعات تحت التنفيذ (WIP)' : 'Construction WIP'}
                  </span>
                </div>
                <span className={styles.accountSub}>
                  {isAr ? 'تكلفة الأعمال والمواد المعتمدة' : 'Capitalized construction costs'}
                </span>
              </div>
              <div className={styles.accountTrailing}>
                <span className={styles.accountBalance}>
                  {renderCompactMoney(effectiveCost)}
                </span>
                <ChevronIcon size={14} className={styles.actionChevron} />
              </div>
            </div>

            {/* 2. Account 401000: Target Real Estate Revenues */}
            <div
              className={styles.accountCard}
              onClick={() => onNavigateToTab ? onNavigateToTab('contracts') : undefined}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' || e.key === ' ') { 
                  e.preventDefault(); 
                  if (onNavigateToTab) onNavigateToTab('contracts');
                } 
              }}
              title={isAr ? 'عرض سجل إيرادات العقود والمبيعات المستهدفة' : 'View Target Revenues in Sales Registry'}
            >
              <div className={styles.accountLeading}>
                <div className={styles.accountTitleRow}>
                  <span className={styles.accountCodeBadge}>401000</span>
                  <span className={styles.accountName}>
                    {isAr ? 'إيرادات المبيعات المستهدفة' : 'Target Sales Revenue'}
                  </span>
                </div>
                <span className={styles.accountSub}>
                  {isAr ? 'القيمة البيعية الإجمالية المقترحة' : 'Projected gross unit sales'}
                </span>
              </div>
              <div className={styles.accountTrailing}>
                <span className={styles.accountBalance}>
                  {renderCompactMoney(effectiveRevenue)}
                </span>
                <ChevronIcon size={14} className={styles.actionChevron} />
              </div>
            </div>

            {/* 3. Account 101000: Treasury Safe & Cash */}
            <div
              className={styles.accountCard}
              onClick={() => onNavigateToTab ? onNavigateToTab('operations') : undefined}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' || e.key === ' ') { 
                  e.preventDefault(); 
                  if (onNavigateToTab) onNavigateToTab('operations');
                } 
              }}
              title={isAr ? 'عرض حركة الخزينة العامة والسيولة التشغيلية' : 'View Treasury & Cashier in Daily Operations'}
            >
              <div className={styles.accountLeading}>
                <div className={styles.accountTitleRow}>
                  <span className={styles.accountCodeBadge}>101000</span>
                  <span className={styles.accountName}>
                    {isAr ? 'الخزينة العامة والسيولة' : 'Treasury & Cashier'}
                  </span>
                </div>
                <span className={styles.accountSub}>
                  {isAr ? 'تمويل مصروفات ومستخلصات البناء' : 'Operational cash funding'}
                </span>
              </div>
              <div className={styles.accountTrailing}>
                <span className={styles.accountBalance} style={{ color: 'var(--erp-accent, #2563eb)' }}>
                  {isAr ? 'الخزينة' : 'Safe'}
                </span>
                <ChevronIcon size={14} className={styles.actionChevron} />
              </div>
            </div>
          </div>
        </ZFWidgetCard>

      </div>
    </ZFWorkstationSideWidgets>
  );
};

export default CalculatorSideWidgets;
