'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Calculator,
  ReceiptText,
  BadgeDollarSign,
  AlertTriangle,
  AlertOctagon,
  Save,
  TrendingUp,
  Coins,
  Target,
  Flag,
  History,
  SlidersHorizontal,
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { ERPPropertyCostItem, ERPPropertyPriceHistoryEntry, PropertyCostCategory } from '@/lib/erp/types';
import { calculatePropertyAuditMetrics } from '@/lib/erp/propertyCostEngine';
import { formatUnitDisplayName } from '@/lib/erp/projectStatusHelper';
import {
  priceBuiltProperty,
  pricePerSqmForMarkup,
  estimateFeasibility,
  repriceBuilding,
} from '@/lib/erp/pricingCalculator';
import { D } from '@/lib/erp/math';
import { ZFPageHeader, ZFPanel, ZFSegmented } from '../../common/ZFPageHeader';
import { ZFKpiCard, ZFKpiGrid } from '../../ZFKpiCard';
import { useERPWorkstationContext } from '../../../context/ERPWorkstationContext';
import { ZFModalShell } from '../../common/ZFModalShell';
import { ZFFacts, ZFEffect, ZFFormFooter } from '../../common/ZFForm';
import shellStyles from '../../ZFWorkstationShell.module.css';
import s from './CostPricingCalculator.module.css';

export interface CostPricingCalculatorProps {
  properties: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  initialPropertyId?: string;
  onOpenAuditForProperty?: (p: Property) => void;
  /** Resolves false when the price was not saved. finalize: off-plan final price (user-confirmed 2026-10-06). */
  onUpdateSellingPrice?: (
    propertyId: string,
    newPriceEgp: number,
    options?: { finalize?: boolean; unitPrices?: Record<string, number>; costBasisEgp?: string }
  ) => Promise<boolean | void>;
  loadPriceHistory?: (propertyId: string) => Promise<ERPPropertyPriceHistoryEntry[]>;
  onNavigateToTab?: (tab: string) => void;
  isAr: boolean;
}

const TIERS = [
  { id: 'core_and_shell', ar: 'عظم وطوب', en: 'Core & shell', cost: 2800 },
  { id: 'semi_finished', ar: 'نصف تشطيب', en: 'Semi-finished', cost: 4500 },
  { id: 'lux', ar: 'لوكس', en: 'Lux', cost: 7500 },
  { id: 'super_lux', ar: 'سوبر لوكس', en: 'Super lux', cost: 10500 },
] as const;

const n = (v: string | number) => Number(v) || 0;
const fmt = (v: string | number) => Math.round(n(v)).toLocaleString('en-US');
const signed = (v: string | number) => (n(v) > 0 ? '+' : '') + fmt(v);
const pctPlain = (v: string | null) => (v === null ? '—' : `${v}%`);

export function CostPricingCalculator({
  properties,
  propertyCosts,
  initialPropertyId,
  onOpenAuditForProperty,
  onUpdateSellingPrice,
  loadPriceHistory,
  onNavigateToTab: _onNavigateToTab,
  isAr,
}: CostPricingCalculatorProps) {
  const cur = isAr ? 'ج.م' : 'EGP';
  const perSqm = isAr ? 'ج.م/م²' : 'EGP/m²';

  const [mode, setMode] = useState<'built' | 'feasibility'>('built');

  const [propertyId, setPropertyId] = useState<string>(() => {
    if (initialPropertyId && properties.some((p) => p.id === initialPropertyId)) {
      return initialPropertyId;
    }
    return properties[0]?.id ?? '';
  });

  useEffect(() => {
    if (initialPropertyId && properties.some((p) => p.id === initialPropertyId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPropertyId(initialPropertyId);
    }
  }, [initialPropertyId, properties]);

  useEffect(() => {
    if (!propertyId && properties.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPropertyId(properties[0].id);
    }
  }, [propertyId, properties]);

  const property = properties.find((p) => p.id === propertyId) ?? null;
  const erpCtx = useERPWorkstationContext();
  const setHasSideWidgets = erpCtx?.setHasSideWidgets;
  useEffect(() => {
    setHasSideWidgets?.(false);
  }, [setHasSideWidgets]);
  const area = property?.area_sqm || 0;
  const list = property?.price_egp || 0;

  const audit = useMemo(() => {
    if (!property) {
      return {
        propertyCosts: [],
        itemsCount: 0,
        totalLoggedCost: '0.00',
        costPerSqm: '0.00',
        byCategory: {} as { [key in PropertyCostCategory]?: { total: string; count: number } },
        byPhase: {},
      };
    }
    return calculatePropertyAuditMetrics(property.id, area, propertyCosts ?? []);
  }, [property, area, propertyCosts]);

  const [marketPerSqm, setMarketPerSqm] = useState<string>(() => {
    const initList = property?.price_egp || 0;
    const initArea = property?.area_sqm || 0;
    const m = initArea > 0 && initList > 0 ? Math.round(initList / initArea) : 0;
    return String(m);
  });

  const [chosenPerSqm, setChosenPerSqm] = useState<string>(() => {
    const initList = property?.price_egp || 0;
    const initArea = property?.area_sqm || 0;
    const m = initArea > 0 && initList > 0 ? Math.round(initList / initArea) : 0;
    const initAudit = property ? calculatePropertyAuditMetrics(property.id, initArea, propertyCosts ?? []) : null;
    const c = initAudit ? n(initAudit.costPerSqm) : 0;
    return String(m > 0 ? m : Math.round(c * 1.3));
  });

  const lastPropertyIdRef = useRef<string>(propertyId);

  useEffect(() => {
    if (lastPropertyIdRef.current !== propertyId) {
      lastPropertyIdRef.current = propertyId;
      if (property) {
        const propList = property.price_egp || 0;
        const propArea = property.area_sqm || 0;
        const m = propArea > 0 && propList > 0 ? Math.round(propList / propArea) : 0;
        const c = n(audit.costPerSqm);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMarketPerSqm(String(m));
        setChosenPerSqm(String(m > 0 ? m : Math.round(c * 1.3)));
      } else {
        setMarketPerSqm('0');
        setChosenPerSqm('0');
      }
    }
  }, [propertyId, property, audit.costPerSqm]);

  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);
  const [isEditingMarket, setIsEditingMarket] = useState(false);
  const [priceHistory, setPriceHistory] = useState<ERPPropertyPriceHistoryEntry[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (!loadPriceHistory || !propertyId) return;
    let cancelled = false;
    loadPriceHistory(propertyId)
      .then(rows => { if (!cancelled) setPriceHistory(rows); })
      .catch(() => { if (!cancelled) setPriceHistory([]); });
    return () => { cancelled = true; };
  }, [loadPriceHistory, propertyId, historyVersion]);

  // Off-plan properties carry an initial price until construction ends and the final price is approved.
  const isPriceFinal = Boolean(property?.price_finalized_at);
  const isInitialPrice = property?.completion_status === 'off_plan' && !isPriceFinal;
  const currentPriceLabel = isInitialPrice
    ? (isAr ? 'السعر المبدئي' : 'Initial price')
    : isPriceFinal
      ? (isAr ? 'السعر النهائي' : 'Final price')
      : (isAr ? 'السعر الحالي' : 'Current price');

  const [landCost, setLandCost] = useState('0');
  const [builtArea, setBuiltArea] = useState('1000');
  const [tier, setTier] = useState<string>('lux');
  const [costPerSqm, setCostPerSqm] = useState('7500');
  const [extrasPct, setExtrasPct] = useState('10');
  const [salePerSqm, setSalePerSqm] = useState('15000');

  const contracts = erpCtx?.data.contracts;
  // A unit with a live contract is contracted even when the stored unit still says available.
  const units = useMemo(() => {
    const raw = property?.building_units ?? [];
    const contractedIds = new Set(
      (contracts ?? [])
        .filter(c => c.status !== 'Rescinded' && c.property_id === property?.id && c.building_unit_id)
        .map(c => c.building_unit_id as string)
    );
    return raw.map(u => (u.status === 'available' && contractedIds.has(u.unit_id) ? { ...u, status: 'contracted' as const } : u));
  }, [property?.building_units, property?.id, contracts]);

  const repriceResult = useMemo(
    () => repriceBuilding(units, chosenPerSqm, contracts),
    [units, chosenPerSqm, contracts]
  );

  const availableUnitPrices = useMemo(() => {
    const map: Record<string, number> = {};
    repriceResult.units.forEach(u => {
      if (!u.locked && n(u.newPrice) > 0) {
        map[u.unit_id] = Math.round(n(u.newPrice));
      }
    });
    return map;
  }, [repriceResult]);

  const availableUnitsCount = repriceResult.repricedCount;
  const lockedUnitsCount = repriceResult.lockedCount;

  const result = useMemo(
    () =>
      priceBuiltProperty({
        totalCost: audit.totalLoggedCost,
        areaSqm: area,
        marketPricePerSqm: marketPerSqm,
        chosenPricePerSqm: chosenPerSqm,
        currentListPrice: list,
        overrideTotalPrice: units.length > 0 ? repriceResult.totalPrice : undefined,
      }),
    [audit.totalLoggedCost, area, marketPerSqm, chosenPerSqm, list, units.length, repriceResult.totalPrice]
  );

  const sumCurrent = useMemo(
    () => units.reduce((acc, u) => acc.plus(u.price_egp || 0), D(0)),
    [units]
  );
  const sumNew = useMemo(
    () => repriceResult.units.reduce((acc, u) => acc.plus(u.newPrice), D(0)),
    [repriceResult.units]
  );
  const sumDiff = useMemo(
    () => sumNew.minus(sumCurrent),
    [sumNew, sumCurrent]
  );
  const isUnitsSumMatching = units.length === 0 || sumNew.toFixed(2) === D(result.totalPrice).toFixed(2);

  const breakEvenVal = Math.round(n(result.breakEvenPricePerSqm));
  const markup15Val = Math.round(n(pricePerSqmForMarkup(result.costPerSqm, 15)));
  const markup30Val = Math.round(n(pricePerSqmForMarkup(result.costPerSqm, 30)));
  const marketVal = Math.round(n(marketPerSqm));

  const isSaveDisabled =
    isSaving ||
    n(result.totalPrice) <= 0 ||
    Math.round(n(result.totalPrice)) === Math.round(list) ||
    (units.length > 0 && !isUnitsSumMatching);

  const feas = useMemo(
    () =>
      estimateFeasibility({
        landCost,
        builtAreaSqm: n(builtArea),
        constructionCostPerSqm: costPerSqm,
        extraCostsPct: extrasPct,
        salePricePerSqm: salePerSqm,
      }),
    [landCost, builtArea, costPerSqm, extrasPct, salePerSqm]
  );

  return (
    <div className={s.page} dir={isAr ? 'rtl' : 'ltr'}>
      <ZFPageHeader
        title={isAr ? 'حاسبة التكاليف والتسعير' : 'Cost & pricing calculator'}
        subtitle={
          mode === 'built'
            ? isAr
              ? 'اختر العقار، حدد سعر المتر، وراجع أثره على الوحدات المتاحة قبل الاعتماد.'
              : 'Pick a property, set price per m², and review the impact on available units.'
            : isAr
            ? 'تقدير تكلفة وربح مشروع قبل البناء.'
            : 'Estimate cost and profit of a project before building.'
        }
        actions={
          <ZFSegmented
            ariaLabel={isAr ? 'وضع الحاسبة' : 'Calculator mode'}
            value={mode}
            onChange={(val) => setMode(val as 'built' | 'feasibility')}
            options={[
              {
                id: 'built',
                label: isAr ? 'تسعير عقار مبني' : 'Price a built property',
                icon: <Building2 size={14} />,
              },
              {
                id: 'feasibility',
                label: isAr ? 'دراسة جدوى' : 'Feasibility',
                icon: <Calculator size={14} />,
              },
            ]}
          />
        }
      />

      {mode === 'built' && properties.length === 0 && (
        <ZFPanel>
          <div className={s.empty}>{isAr ? 'لا توجد عقارات بعد.' : 'No properties yet.'}</div>
        </ZFPanel>
      )}

      {mode === 'built' && property && (
        <>
          {/* R1: Header row card */}
          <div className={s.headerCard}>
            <div className={s.headerSelectWrap}>
              <span className={s.lbl}>{isAr ? 'العقار' : 'Property'}</span>
              <select
                className={s.headerSelect}
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isAr ? p.title_ar : p.title_en || p.title_ar}
                  </option>
                ))}
              </select>
            </div>
            {property.completion_status === 'off_plan' ? (
              <span className={`${shellStyles.statusPill} ${shellStyles.statusPillAmber}`}>
                {isAr ? 'تحت الإنشاء' : 'Off-plan'}
              </span>
            ) : (
              <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
                {isAr ? 'جاهز' : 'Ready'}
              </span>
            )}
            <div className={s.sp} />
            {property.completion_status === 'off_plan' && (
              <div className={s.steps}>
                <span className={`${s.step} ${s.stepDone}`}>
                  <b>✓</b>
                  <span>{isAr ? 'السعر المبدئي' : 'Initial price'}</span>
                  {list > 0 && <span className={`${s.num} ${s.lbl}`}>{fmt(list)}</span>}
                </span>
                <i className={s.stepLine} />
                <span className={`${s.step} ${isPriceFinal ? s.stepDone : s.stepCur}`}>
                  <b>{isPriceFinal ? '✓' : '2'}</b>
                  <span>{isAr ? 'السعر النهائي' : 'Final price'}</span>
                </span>
              </div>
            )}
          </div>

          {/* R2 & R3: Two-column analytical work area */}
          <div className={s.twoColGrid}>
            {/* Card ①: أساس التكلفة */}
            <div className={s.card}>
              <h3 className={s.cardTitle}>
                <span className={s.sq}>①</span>
                <span>{isAr ? 'أساس التكلفة' : 'Cost basis'}</span>
              </h3>
              <div className={s.costGrid}>
                <div>
                  <div className={s.lbl}>{isAr ? 'صافي التكلفة المسجلة' : 'Net recorded cost'}</div>
                  <div className={`${s.big} ${s.num}`}>{fmt(audit.totalLoggedCost)}</div>
                </div>
                <div>
                  <div className={s.lbl}>{isAr ? 'المساحة' : 'Area'}</div>
                  <div className={`${s.big} ${s.num}`}>{area} {isAr ? 'م²' : 'm²'}</div>
                </div>
                <div>
                  <div className={s.lbl}>{isAr ? 'تكلفة المتر' : 'Cost per m²'}</div>
                  <div className={`${s.big} ${s.num}`}>{fmt(result.costPerSqm)}</div>
                </div>
                <div>
                  <div className={s.lbl}>{isAr ? 'بنود التكلفة' : 'Cost items'}</div>
                  <div style={{ paddingTop: 4 }}>
                    {onOpenAuditForProperty ? (
                      <button
                        type="button"
                        className={s.linkBtn}
                        onClick={() => onOpenAuditForProperty(property)}
                      >
                        <ReceiptText size={13} />
                        <span>{isAr ? `${audit.itemsCount} بنود — عرض` : `${audit.itemsCount} items — view`}</span>
                      </button>
                    ) : (
                      <span className={s.lbl}>{audit.itemsCount}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={s.noteLbl}>
                {isAr ? 'الصافي = الأصل + الإضافات − المرتجعات (لكل بند).' : 'Net = base + additions − returns (per item).'}
              </div>
              {!result.hasCost && (
                <div className={`${s.notice} ${s.noticeWarn}`} style={{ marginTop: 10 }}>
                  <AlertTriangle size={14} />
                  <span>
                    {isAr
                      ? 'لا توجد تكاليف مسجلة لهذا العقار، فالربح المعروض غير دقيق. سجّل المصاريف أولاً.'
                      : 'No costs are recorded for this property, so the profit shown is not reliable. Record costs first.'}
                  </span>
                </div>
              )}
            </div>

            {/* Card ②: سعر المتر */}
            <div className={s.card}>
              <h3 className={s.cardTitle}>
                <span className={s.sq}>②</span>
                <span>{isAr ? 'سعر المتر' : 'Price per m²'}</span>
              </h3>
              <div className={s.sqmRow}>
                <div className={s.inputNumberBox}>
                  <input
                    className={s.sqmInput}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={chosenPerSqm}
                    onChange={(e) => setChosenPerSqm(e.target.value)}
                    aria-label={isAr ? 'سعر المتر' : 'Price per m²'}
                  />
                  <span className={s.lbl}>{perSqm}</span>
                </div>
                <div className={s.chipsRow}>
                  <button
                    type="button"
                    className={`${s.chip} ${Math.round(n(chosenPerSqm)) === breakEvenVal && breakEvenVal > 0 ? s.chipActive : ''}`}
                    onClick={() => breakEvenVal > 0 && setChosenPerSqm(String(breakEvenVal))}
                  >
                    <span>{isAr ? 'التعادل' : 'Break-even'}</span>
                    <i className={s.chipVal}>{fmt(breakEvenVal)}</i>
                  </button>
                  <button
                    type="button"
                    className={`${s.chip} ${Math.round(n(chosenPerSqm)) === markup15Val && markup15Val > 0 ? s.chipActive : ''}`}
                    onClick={() => markup15Val > 0 && setChosenPerSqm(String(markup15Val))}
                  >
                    <span>{isAr ? 'التكلفة +15%' : 'Cost +15%'}</span>
                    <i className={s.chipVal}>{fmt(markup15Val)}</i>
                  </button>
                  <button
                    type="button"
                    className={`${s.chip} ${Math.round(n(chosenPerSqm)) === markup30Val && markup30Val > 0 ? s.chipActive : ''}`}
                    onClick={() => markup30Val > 0 && setChosenPerSqm(String(markup30Val))}
                  >
                    <span>{isAr ? 'التكلفة +30%' : 'Cost +30%'}</span>
                    <i className={s.chipVal}>{fmt(markup30Val)}</i>
                  </button>
                  <div
                    className={`${s.chip} ${Math.round(n(chosenPerSqm)) === marketVal && marketVal > 0 ? s.chipActive : ''}`}
                    onClick={() => {
                      if (!isEditingMarket && marketVal > 0) setChosenPerSqm(String(marketVal));
                    }}
                  >
                    <span>{isAr ? 'سعر السوق' : 'Market'}</span>
                    {isEditingMarket ? (
                      <input
                        type="number"
                        className={s.marketInput}
                        autoFocus
                        value={marketPerSqm}
                        onChange={(e) => setMarketPerSqm(e.target.value)}
                        onBlur={() => setIsEditingMarket(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setIsEditingMarket(false);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <i className={s.chipVal}>{fmt(marketVal)}</i>
                    )}
                    <button
                      type="button"
                      className={s.chipEditBtn}
                      title={isAr ? 'تعديل سعر السوق' : 'Edit market price'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingMarket((prev) => !prev);
                      }}
                    >
                      ✎
                    </button>
                  </div>
                </div>
              </div>

              <div className={s.statsGrid}>
                <div>
                  <div className={s.lbl}>{isAr ? 'سعر العقار' : 'Property price'}</div>
                  <div className={`${s.big} ${s.num}`} style={{ fontSize: '18px' }}>
                    {fmt(result.totalPrice)}
                  </div>
                  {units.length > 0 && lockedUnitsCount > 0 && (
                    <div className={s.statSub}>
                      {isAr
                        ? `متاح ${fmt(repriceResult.repricedTotal)} + محجوز/مباع ${fmt(repriceResult.lockedTotal)}`
                        : `Available ${fmt(repriceResult.repricedTotal)} + Locked ${fmt(repriceResult.lockedTotal)}`}
                    </div>
                  )}
                </div>
                <div>
                  <div className={s.lbl}>{isAr ? 'الربح المتوقع' : 'Expected profit'}</div>
                  <div
                    className={`${s.big} ${s.num}`}
                    style={{
                      fontSize: '18px',
                      color: n(result.profit) > 0 ? 'var(--erp-success, #16a34a)' : n(result.profit) < 0 ? 'var(--erp-danger, #dc2626)' : undefined,
                    }}
                  >
                    {signed(result.profit)}
                  </div>
                </div>
                <div>
                  <div className={s.lbl}>{isAr ? 'هامش الربح' : 'Margin'}</div>
                  <div className={`${s.big} ${s.num}`} style={{ fontSize: '18px' }}>
                    {pctPlain(result.marginPct)}
                  </div>
                </div>
                <div>
                  <div className={s.lbl}>{isAr ? 'عن السعر الحالي' : 'Vs current price'}</div>
                  <div
                    className={`${s.big} ${s.num}`}
                    style={{
                      fontSize: '18px',
                      color: n(result.changeVsList) > 0 ? 'var(--erp-success, #16a34a)' : n(result.changeVsList) < 0 ? 'var(--erp-danger, #dc2626)' : undefined,
                    }}
                  >
                    {signed(result.changeVsList)}
                  </div>
                </div>
              </div>

              {result.belowCost && (
                <div className={`${s.notice} ${s.noticeDanger}`} style={{ marginTop: 8 }}>
                  <AlertOctagon size={14} />
                  <span>
                    {isAr
                      ? 'السعر المختار أقل من التكلفة الفعلية: البيع به خسارة.'
                      : 'The chosen price is below actual cost: selling at it loses money.'}
                  </span>
                </div>
              )}

              <div className={s.noteLbl} style={{ marginTop: 8 }}>
                {isAr
                  ? 'سعر السوق يُكتب مرة لكل عقار ويُحفظ معه. الأزرار تملأ الخانة فقط؛ لا شيء يُحفظ قبل الضغط على زر الاعتماد.'
                  : 'Market price is entered once per property. Chips only fill the input; nothing is saved until confirmed.'}
              </div>
            </div>
          </div>

          {/* R4: Card ③ أثر السعر على الوحدات (only when property has units) */}
          {units.length > 0 && (
            <div className={s.unitsCard}>
              <h3 className={s.cardTitle}>
                <span className={s.sq}>③</span>
                <span>{isAr ? 'أثر السعر على الوحدات' : 'Impact on unit prices'}</span>
                <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}>
                  {isAr
                    ? `${availableUnitsCount} متاحة · ${lockedUnitsCount} محجوزة/مباعة لا تتغير`
                    : `${availableUnitsCount} available · ${lockedUnitsCount} locked`}
                </span>
              </h3>
              <div className={s.tableScroll}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>{isAr ? 'الوحدة' : 'Unit'}</th>
                      <th>{isAr ? 'الدور' : 'Floor'}</th>
                      <th className={s.num}>{isAr ? 'المساحة' : 'Area'}</th>
                      <th>{isAr ? 'الحالة' : 'Status'}</th>
                      <th className={s.num}>{isAr ? 'السعر الحالي' : 'Current'}</th>
                      <th className={s.num}>{isAr ? 'السعر الجديد' : 'New'}</th>
                      <th className={s.num}>{isAr ? 'الفرق' : 'Change'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repriceResult.units.map((uRow, idx) => {
                      const u = units.find((item) => item.unit_id === uRow.unit_id) || units[idx];
                      const changeNum = n(uRow.change);
                      const isLocked = uRow.locked;

                      return (
                        <tr key={uRow.unit_id || idx} className={isLocked ? s.lockedRow : undefined}>
                          <td>{formatUnitDisplayName(u?.unit_number, isAr)}</td>
                          <td>{u?.floor ?? '—'}</td>
                          <td className={s.num}>{u?.area_sqm ?? 0} {isAr ? 'م²' : 'm²'}</td>
                          <td>
                            {isLocked ? (
                              <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`}>
                                🔒 {u?.status === 'reserved'
                                  ? (isAr ? 'محجوزة — لا تتغير' : 'Reserved — locked')
                                  : (isAr ? 'مباعة — لا تتغير' : 'Sold — locked')}
                              </span>
                            ) : (
                              <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
                                {isAr ? 'متاحة' : 'Available'}
                              </span>
                            )}
                          </td>
                          <td className={s.num}>{fmt(uRow.currentPrice)}</td>
                          <td className={s.num}>{fmt(uRow.newPrice)}</td>
                          <td className={`${s.num} ${!isLocked && changeNum > 0 ? s.pos : !isLocked && changeNum < 0 ? s.neg : ''}`}>
                            {isLocked ? '—' : signed(changeNum)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}>
                        {isAr ? 'الإجمالي = سعر العقار' : 'Total = Property price'}{' '}
                        {isUnitsSumMatching ? (
                          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`}>
                            {isAr ? 'مطابق' : 'Matching'}
                          </span>
                        ) : (
                          <span className={`${shellStyles.statusPill} ${shellStyles.statusPillRed || shellStyles.statusPillNeutral}`}>
                            {isAr ? 'غير مطابق' : 'Mismatch'}
                          </span>
                        )}
                      </td>
                      <td className={s.num}>{fmt(sumCurrent.toFixed(2))}</td>
                      <td className={s.num}>{fmt(sumNew.toFixed(2))}</td>
                      <td className={`${s.num} ${sumDiff.gt(0) ? s.pos : sumDiff.lt(0) ? s.neg : ''}`}>
                        {signed(sumDiff.toFixed(2))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className={s.noteLbl} style={{ marginTop: 6 }}>
                {isAr
                  ? 'الوحدات المتاحة = سعر المتر × مساحتها. المباعة والمحجوزة ثابتة على سعر عقدها. سعر العقار = مجموع الوحدات، فيتطابق دائماً.'
                  : 'Available units = price per m² × area. Sold/reserved units stay at contract price. Property price = sum of units.'}
              </div>
            </div>
          )}

          {/* R5: Sticky Bottom Action Bar */}
          <div className={s.bottomBar}>
            <div>
              <div className={s.lbl}>{isAr ? 'السعر الحالي ← الجديد' : 'Current price → New'}</div>
              <b className={s.barPrice}>
                {fmt(list)} ← {fmt(result.totalPrice)} {cur}
              </b>
            </div>
            <div className={s.sp} />
            {loadPriceHistory && (
              <button
                type="button"
                className={shellStyles.btnSecondary}
                onClick={() => setIsPriceHistoryOpen(true)}
              >
                <History size={14} />
                <span>{isAr ? `سجل الأسعار (${priceHistory.length})` : `Price history (${priceHistory.length})`}</span>
              </button>
            )}
            {isInitialPrice ? (
              <>
                <button
                  type="button"
                  className={shellStyles.btnSecondary}
                  disabled={isSaving || n(result.totalPrice) <= 0 || (units.length > 0 && !isUnitsSumMatching)}
                  onClick={() => setIsFinalizeOpen(true)}
                >
                  <Flag size={14} />
                  <span>{isAr ? 'إنهاء الإنشاء واعتماد السعر النهائي' : 'Finish construction & set final price'}</span>
                </button>
                <button
                  type="button"
                  className={shellStyles.btnPrimary}
                  disabled={isSaveDisabled}
                  onClick={() => setIsSaveConfirmOpen(true)}
                >
                  <Save size={14} />
                  <span>{isSaving ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ السعر المبدئي' : 'Save initial price')}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className={shellStyles.btnPrimary}
                disabled={isSaveDisabled}
                onClick={() => setIsSaveConfirmOpen(true)}
              >
                <Save size={14} />
                <span>{isSaving ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'حفظ السعر' : 'Save price')}</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* R5: Save Confirmation Modal */}
      {isSaveConfirmOpen && property && onUpdateSellingPrice && (
        <ZFModalShell
          isOpen
          onClose={() => setIsSaveConfirmOpen(false)}
          title={isInitialPrice ? (isAr ? 'تأكيد حفظ السعر المبدئي' : 'Confirm initial price') : (isAr ? 'تأكيد حفظ السعر' : 'Confirm price update')}
          subtitle={isAr ? property.title_ar : property.title_en || property.title_ar}
          icon={<Save size={18} />}
          isAr={isAr}
          maxWidth="520px"
          footer={
            <ZFFormFooter>
              <button
                type="button"
                className={shellStyles.btnSecondary}
                onClick={() => setIsSaveConfirmOpen(false)}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                className={shellStyles.btnPrimary}
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const saveTotal = Math.round(n(result.totalPrice));
                    const ok = await onUpdateSellingPrice(property.id, saveTotal, {
                      unitPrices: availableUnitPrices,
                      costBasisEgp: audit.totalLoggedCost,
                    });
                    if (ok !== false) {
                      setIsSaveConfirmOpen(false);
                      setHistoryVersion((v) => v + 1);
                    }
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                {isSaving ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'تأكيد الحفظ' : 'Confirm save')}
              </button>
            </ZFFormFooter>
          }
        >
          <ZFFacts
            items={[
              { label: isAr ? 'السعر الحالي' : 'Current price', value: `${fmt(list)} ${cur}` },
              { label: isAr ? 'السعر الجديد' : 'New price', value: `${fmt(result.totalPrice)} ${cur}`, tone: 'pos' },
              { label: isAr ? 'الفرق' : 'Difference', value: `${signed(result.changeVsList)} ${cur}` },
              ...(units.length > 0
                ? [
                    {
                      label: isAr ? 'الوحدات المتاحة المعاد تسعيرها' : 'Available units repriced',
                      value: isAr ? `${availableUnitsCount} وحدة` : `${availableUnitsCount} units`,
                    },
                    ...(lockedUnitsCount > 0
                      ? [
                          {
                            label: isAr ? 'الوحدات المحجوزة/المباعة (ثابتة)' : 'Locked units (unchanged)',
                            value: isAr ? `${lockedUnitsCount} وحدة` : `${lockedUnitsCount} units`,
                          },
                        ]
                      : []),
                  ]
                : []),
            ]}
          />
        </ZFModalShell>
      )}

      {/* R5: Price History Modal */}
      {isPriceHistoryOpen && property && (
        <ZFModalShell
          isOpen
          onClose={() => setIsPriceHistoryOpen(false)}
          title={isAr ? 'سجل الأسعار' : 'Price history'}
          subtitle={isAr ? property.title_ar : property.title_en || property.title_ar}
          icon={<History size={18} />}
          isAr={isAr}
          maxWidth="540px"
          footer={
            <ZFFormFooter>
              <button
                type="button"
                className={shellStyles.btnSecondary}
                onClick={() => setIsPriceHistoryOpen(false)}
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </ZFFormFooter>
          }
        >
          {priceHistory.length === 0 ? (
            <div className={s.empty}>{isAr ? 'لا يوجد سجل أسعار مسجل بعد لهذا العقار.' : 'No price history recorded yet.'}</div>
          ) : (
            <div className={s.historyList}>
              {priceHistory.map((h) => (
                <div key={h.history_id} className={s.historyItem}>
                  <div className={s.historyMeta}>
                    <span
                      className={`${shellStyles.statusPill} ${
                        h.stage === 'final'
                          ? shellStyles.statusPillGreen
                          : h.stage === 'initial'
                          ? shellStyles.statusPillAmber
                          : shellStyles.statusPillNeutral
                      }`}
                    >
                      {h.stage === 'final'
                        ? (isAr ? 'نهائي' : 'Final')
                        : h.stage === 'initial'
                        ? (isAr ? 'مبدئي' : 'Initial')
                        : (isAr ? 'تعديل' : 'Revised')}
                    </span>
                    <span className={s.historyDate}>{h.created_at.slice(0, 10)}</span>
                    {h.units_repriced > 0 && (
                      <span className={s.historyUnits}>
                        {isAr ? `${h.units_repriced} وحدة متاحة` : `${h.units_repriced} units`}
                      </span>
                    )}
                  </div>
                  <div className={s.historyPrice}>
                    <span className={s.num}>{fmt(h.price_egp)}</span>
                    <span className={s.lbl}>{cur}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ZFModalShell>
      )}

      {mode === 'feasibility' && (
        <>
          <ZFKpiGrid>
            <ZFKpiCard
              title={isAr ? 'إجمالي التكلفة' : 'Total cost'}
              value={fmt(feas.totalCost)}
              currency={cur}
              icon={<Coins size={16} />}
              accentColor="slate"
            />
            <ZFKpiCard
              title={isAr ? 'الإيرادات المتوقعة' : 'Expected revenue'}
              value={fmt(feas.revenue)}
              currency={cur}
              icon={<BadgeDollarSign size={16} />}
              accentColor="accent"
            />
            <ZFKpiCard
              title={isAr ? 'صافي الربح' : 'Net profit'}
              value={signed(feas.profit)}
              currency={cur}
              icon={<TrendingUp size={16} />}
              accentColor={n(feas.profit) < 0 ? 'rose' : 'emerald'}
              subtitleLabel={isAr ? 'هامش الربح' : 'Margin'}
              subtitleValue={pctPlain(feas.marginPct)}
            />
            <ZFKpiCard
              title={isAr ? 'سعر التعادل للمتر' : 'Break-even per m²'}
              value={fmt(feas.breakEvenPricePerSqm)}
              currency={perSqm}
              icon={<Target size={16} />}
              accentColor="blue"
            />
          </ZFKpiGrid>

          <div className={s.grid}>
          <ZFPanel
            icon={<SlidersHorizontal size={15} />}
            title={isAr ? 'بيانات المشروع' : 'Project inputs'}
          >
            <div className={s.fields}>
              <div className={s.field}>
                <label className={s.label}>{isAr ? 'تكلفة الأرض' : 'Land cost'}</label>
                <div className={s.inputWrap}>
                  <input
                    className={s.input}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={landCost}
                    onChange={(e) => setLandCost(e.target.value)}
                  />
                  <span className={s.inputUnit}>{cur}</span>
                </div>
              </div>

              <div className={s.field}>
                <label className={s.label}>{isAr ? 'مساحة البناء' : 'Built area'}</label>
                <div className={s.inputWrap}>
                  <input
                    className={s.input}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={builtArea}
                    onChange={(e) => setBuiltArea(e.target.value)}
                  />
                  <span className={s.inputUnit}>{isAr ? 'م²' : 'm²'}</span>
                </div>
              </div>

              <div className={`${s.field} ${s.fieldWide}`}>
                <label className={s.label}>{isAr ? 'مستوى التشطيب' : 'Finish level'}</label>
                <div className={s.chips}>
                  {TIERS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`${s.chip}${tier === t.id ? ` ${s.chipActive}` : ''}`}
                      onClick={() => {
                        setTier(t.id);
                        setCostPerSqm(String(t.cost));
                      }}
                    >
                      {isAr ? t.ar : t.en} <span className={s.chipSub}>{fmt(t.cost)}</span>
                    </button>
                  ))}
                </div>
                <div className={s.inputWrap}>
                  <input
                    className={s.input}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={costPerSqm}
                    onChange={(e) => {
                      setCostPerSqm(e.target.value);
                      setTier('custom');
                    }}
                  />
                  <span className={s.inputUnit}>{perSqm}</span>
                </div>
              </div>

              <div className={s.field}>
                <label className={s.label}>{isAr ? 'مصاريف إضافية' : 'Extra costs'}</label>
                <div className={s.inputWrap}>
                  <input
                    className={s.input}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={extrasPct}
                    onChange={(e) => setExtrasPct(e.target.value)}
                  />
                  <span className={s.inputUnit}>%</span>
                </div>
                <span className={s.hint}>
                  {isAr
                    ? 'تراخيص، تصميم، إشراف، توصيل مرافق — كنسبة من تكلفة البناء.'
                    : 'Permits, design, supervision, utilities — as % of construction cost.'}
                </span>
              </div>

              <div className={s.field}>
                <label className={s.label}>{isAr ? 'سعر البيع المتوقع للمتر' : 'Expected sale price per m²'}</label>
                <div className={s.inputWrap}>
                  <input
                    className={s.input}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={salePerSqm}
                    onChange={(e) => setSalePerSqm(e.target.value)}
                  />
                  <span className={s.inputUnit}>{perSqm}</span>
                </div>
              </div>
            </div>
          </ZFPanel>

          <ZFPanel icon={<BadgeDollarSign size={15} />} title={isAr ? 'تفصيل التكلفة' : 'Cost breakdown'}>
            <div className={s.result}>
              <div className={s.stack}>
                <span
                  className={s.stackLand}
                  style={{
                    width: `${n(feas.totalCost) > 0 ? (n(landCost) / n(feas.totalCost)) * 100 : 0}%`,
                  }}
                />
                <span
                  className={s.stackBuild}
                  style={{
                    width: `${
                      n(feas.totalCost) > 0 ? (n(feas.constructionCost) / n(feas.totalCost)) * 100 : 0
                    }%`,
                  }}
                />
                <span
                  className={s.stackExtra}
                  style={{
                    width: `${n(feas.totalCost) > 0 ? (n(feas.extraCosts) / n(feas.totalCost)) * 100 : 0}%`,
                  }}
                />
              </div>

              <div className={s.legend}>
                <span className={s.legendItem}>
                  <span className={`${s.dot} ${s.stackLand}`} />
                  {isAr ? 'الأرض' : 'Land'}
                </span>
                <span className={s.legendItem}>
                  <span className={`${s.dot} ${s.stackBuild}`} />
                  {isAr ? 'البناء' : 'Construction'}
                </span>
                <span className={s.legendItem}>
                  <span className={`${s.dot} ${s.stackExtra}`} />
                  {isAr ? 'إضافية' : 'Extras'}
                </span>
              </div>

              <div className={s.rows}>
                <div className={s.row}>
                  <span className={s.rowLabel}>{isAr ? 'تكلفة الأرض' : 'Land'}</span>
                  <span className={s.rowValue}>{fmt(landCost)} <span className={s.muted}>{cur}</span></span>
                </div>
                <div className={s.row}>
                  <span className={s.rowLabel}>{isAr ? 'تكلفة البناء' : 'Construction'}</span>
                  <span className={s.rowValue}>{fmt(feas.constructionCost)} <span className={s.muted}>{cur}</span></span>
                </div>
                <div className={s.row}>
                  <span className={s.rowLabel}>{isAr ? 'مصاريف إضافية' : 'Extras'}</span>
                  <span className={s.rowValue}>{fmt(feas.extraCosts)} <span className={s.muted}>{cur}</span></span>
                </div>
                <div className={`${s.row} ${s.rowTotal}`}>
                  <span className={s.rowLabel}>{isAr ? 'إجمالي التكلفة' : 'Total cost'}</span>
                  <span className={s.rowValue}>{fmt(feas.totalCost)} <span className={s.muted}>{cur}</span></span>
                </div>
              </div>

              {n(feas.profit) < 0 && (
                <div className={`${s.notice} ${s.noticeDanger}`}>
                  <AlertOctagon size={14} />
                  <span>
                    {isAr
                      ? 'سعر البيع المتوقع أقل من سعر التعادل: المشروع خاسر بهذه الأرقام.'
                      : 'Expected sale price is below break-even: the project loses money at these numbers.'}
                  </span>
                </div>
              )}
            </div>
          </ZFPanel>
        </div>
      </>
    )}

      {isFinalizeOpen && property && onUpdateSellingPrice && (
        <ZFModalShell
          isOpen
          onClose={() => setIsFinalizeOpen(false)}
          title={isAr ? 'إنهاء الإنشاء واعتماد السعر النهائي' : 'Finish construction & set the final price'}
          subtitle={isAr ? property.title_ar : property.title_en || property.title_ar}
          icon={<Flag size={18} />}
          isAr={isAr}
          maxWidth="560px"
          footer={
            <ZFFormFooter>
              <button type="button" className={shellStyles.btnSecondary} onClick={() => setIsFinalizeOpen(false)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                className={shellStyles.btnPrimary}
                disabled={isSaving || audit.itemsCount === 0 || n(result.totalPrice) <= 0}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const ok = await onUpdateSellingPrice(property.id, Math.round(n(result.totalPrice)), {
                      finalize: true,
                      unitPrices: availableUnitPrices,
                      costBasisEgp: audit.totalLoggedCost
                    });
                    if (ok !== false) {
                      setIsFinalizeOpen(false);
                      setHistoryVersion(v => v + 1);
                    }
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                {isSaving ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : (isAr ? 'اعتماد السعر النهائي' : 'Approve final price')}
              </button>
            </ZFFormFooter>
          }
        >
          <ZFFacts
            items={[
              { label: isAr ? 'التكلفة الفعلية' : 'Actual cost', value: `${fmt(audit.totalLoggedCost)} ${cur}` },
              { label: isAr ? 'السعر المبدئي' : 'Initial price', value: `${fmt(list)} ${cur}` },
              { label: isAr ? 'السعر النهائي' : 'Final price', value: `${fmt(result.totalPrice)} ${cur}`, tone: 'pos' },
              { label: isAr ? 'سعر المتر' : 'Per m²', value: `${fmt(chosenPerSqm)} ${perSqm}` }
            ]}
          />
          {audit.itemsCount === 0 ? (
            <ZFEffect tone="danger">
              {isAr
                ? 'مفيش تكاليف مسجلة للعقار ده. سجّل تكاليف البناء الأول عشان السعر النهائي يتحسب على التكلفة الفعلية.'
                : 'No costs are recorded for this property. Record construction costs first so the final price rests on actual cost.'}
            </ZFEffect>
          ) : (
            <ZFEffect tone="warn">
              {isAr
                ? `العقار هيتحول لـ "جاهز" والسعر هيتقفل كسعر نهائي. ${availableUnitsCount} وحدة متاحة هيتغير سعرها${lockedUnitsCount > 0 ? `، و${lockedUnitsCount} وحدة محجوزة أو متعاقد عليها هتفضل بسعرها` : ''}. العقود الموقعة مش هتتغير.`
                : `The property becomes "ready" and this price is locked as final. ${availableUnitsCount} available units will be repriced${lockedUnitsCount > 0 ? `; ${lockedUnitsCount} reserved or contracted units keep their price` : ''}. Signed contracts do not change.`}
            </ZFEffect>
          )}
          {n(result.profit) < 0 && (
            <ZFEffect tone="danger">
              {isAr ? 'السعر ده أقل من التكلفة الفعلية: العقار هيتباع بخسارة.' : 'This price is below actual cost: the property sells at a loss.'}
            </ZFEffect>
          )}
        </ZFModalShell>
      )}
    </div>
  );
}

export default CostPricingCalculator;
