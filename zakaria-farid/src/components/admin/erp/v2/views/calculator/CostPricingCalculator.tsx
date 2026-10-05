'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Calculator,
  ReceiptText,
  SlidersHorizontal,
  BadgeDollarSign,
  AlertTriangle,
  AlertOctagon,
  Save,
  LayoutGrid,
  PieChart,
} from 'lucide-react';
import { Property } from '@/lib/supabase/types';
import { ERPPropertyCostItem, PropertyCostCategory } from '@/lib/erp/types';
import { calculatePropertyAuditMetrics } from '@/lib/erp/propertyCostEngine';
import {
  priceBuiltProperty,
  pricePerSqmForMarkup,
  priceUnitsAtRate,
  priceSliderBounds,
  estimateFeasibility,
} from '@/lib/erp/pricingCalculator';
import { ZFPageHeader, ZFPanel, ZFSegmented } from '../../common/ZFPageHeader';
import { ZFWorkstationSideWidgets } from '../../common/ZFWorkstationSideWidgets';
import shellStyles from '../../ZFWorkstationShell.module.css';
import s from './CostPricingCalculator.module.css';

export interface CostPricingCalculatorProps {
  properties: Property[];
  propertyCosts?: ERPPropertyCostItem[];
  initialPropertyId?: string;
  onOpenAuditForProperty?: (p: Property) => void;
  onUpdateSellingPrice?: (propertyId: string, newPriceEgp: number) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
  isAr: boolean;
}

const TIERS = [
  { id: 'core_and_shell', ar: 'عظم وطوب', en: 'Core & shell', cost: 2800 },
  { id: 'semi_finished', ar: 'نصف تشطيب', en: 'Semi-finished', cost: 4500 },
  { id: 'lux', ar: 'لوكس', en: 'Lux', cost: 7500 },
  { id: 'super_lux', ar: 'سوبر لوكس', en: 'Super lux', cost: 10500 },
] as const;

const CATEGORY_LABELS: Record<PropertyCostCategory, { ar: string; en: string }> = {
  civil_structure: { ar: 'خرسانات وهيكل', en: 'Structure' },
  mep_infrastructure: { ar: 'كهروميكانيك', en: 'MEP' },
  finishing_interior: { ar: 'تشطيبات', en: 'Finishing' },
  site_facade: { ar: 'واجهات ومداخل', en: 'Facade & site' },
  permits_engineering: { ar: 'تراخيص وإشراف', en: 'Permits & engineering' },
  taxes_fees: { ar: 'ضرائب ورسوم', en: 'Taxes & fees' },
  land_allocation: { ar: 'حصة الأرض', en: 'Land share' },
  labor_subcontractor: { ar: 'مصنعيات', en: 'Labour' },
};

const n = (v: string | number) => Number(v) || 0;
const fmt = (v: string | number) => Math.round(n(v)).toLocaleString('en-US');
const signed = (v: string | number) => (n(v) > 0 ? '+' : '') + fmt(v);
const pctText = (v: string | null) => (v === null ? '—' : `${n(v) > 0 ? '+' : ''}${v}%`);
const pctPlain = (v: string | null) => (v === null ? '—' : `${v}%`);
const clamp = (val: number, min = 0, max = 100) => Math.min(Math.max(val, min), max);

export function CostPricingCalculator({
  properties,
  propertyCosts,
  initialPropertyId,
  onOpenAuditForProperty,
  onUpdateSellingPrice,
  onNavigateToTab,
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

  const [landCost, setLandCost] = useState('0');
  const [builtArea, setBuiltArea] = useState('1000');
  const [tier, setTier] = useState<string>('lux');
  const [costPerSqm, setCostPerSqm] = useState('7500');
  const [extrasPct, setExtrasPct] = useState('10');
  const [salePerSqm, setSalePerSqm] = useState('15000');

  const result = useMemo(
    () =>
      priceBuiltProperty({
        totalCost: audit.totalLoggedCost,
        areaSqm: area,
        marketPricePerSqm: marketPerSqm,
        chosenPricePerSqm: chosenPerSqm,
        currentListPrice: list,
      }),
    [audit.totalLoggedCost, area, marketPerSqm, chosenPerSqm, list]
  );

  const bounds = useMemo(
    () => priceSliderBounds(result.costPerSqm, marketPerSqm),
    [result.costPerSqm, marketPerSqm]
  );

  const listPerSqm = area > 0 ? Math.round(list / area) : 0;

  const units = useMemo(() => property?.building_units ?? [], [property?.building_units]);
  const unitRows = useMemo(
    () => priceUnitsAtRate(units, chosenPerSqm),
    [units, chosenPerSqm]
  );

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

  const categoryList = useMemo(() => {
    const cats = Object.entries(audit.byCategory) as [PropertyCostCategory, { total: string; count: number }][];
    const totalCostNum = n(audit.totalLoggedCost);
    return cats
      .filter(([, data]) => n(data.total) > 0)
      .map(([key, data]) => ({
        key,
        total: data.total,
        share: totalCostNum > 0 ? (n(data.total) / totalCostNum) * 100 : 0,
      }))
      .sort((a, b) => n(b.total) - n(a.total));
  }, [audit]);

  // When current price ≈ market (the default), one marker says both instead of two overlapping labels.
  const listIsMarket = listPerSqm > 0 && Math.abs(listPerSqm - n(marketPerSqm)) <= n(marketPerSqm) * 0.01;
  const markers = [
    {
      id: 'cost',
      variant: s.markerCost,
      label: isAr ? 'التعادل' : 'Break-even',
      value: n(result.costPerSqm),
      low: false,
    },
    {
      id: 'list',
      variant: s.markerList,
      label: isAr ? 'السعر الحالي' : 'Current',
      value: listIsMarket ? 0 : listPerSqm,
      low: true,
    },
    {
      id: 'market',
      variant: s.markerMarket,
      label: listIsMarket ? (isAr ? 'السوق والسعر الحالي' : 'Market = current') : (isAr ? 'السوق' : 'Market'),
      value: n(marketPerSqm),
      low: false,
    },
  ];

  return (
    <div className={s.page} dir={isAr ? 'rtl' : 'ltr'}>
      <ZFPageHeader
        title={isAr ? 'حاسبة التكاليف والتسعير' : 'Cost & pricing calculator'}
        subtitle={
          mode === 'built'
            ? isAr
              ? 'اختر سعر بيع العقار بين تكلفته الفعلية وسعر السوق، وشاهد الربح قبل الحفظ.'
              : 'Pick a selling price between actual cost and market price, and see the profit before saving.'
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
          <div className={s.pickerBar}>
            <label className={s.pickerField}>
              <span className={s.label}>{isAr ? 'العقار' : 'Property'}</span>
              <select
                className={s.select}
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isAr ? p.title_ar : p.title_en || p.title_ar}
                  </option>
                ))}
              </select>
            </label>
            <div className={s.facts}>
              <div className={s.fact}>
                <span className={s.factLabel}>{isAr ? 'المساحة' : 'Area'}</span>
                <span className={s.factValue}>{area} {isAr ? 'م²' : 'm²'}</span>
              </div>
              <div className={s.fact}>
                <span className={s.factLabel}>{isAr ? 'السعر الحالي' : 'Current price'}</span>
                <span className={s.factValue}>{fmt(list)} {cur}</span>
              </div>
              <div className={s.fact}>
                <span className={s.factLabel}>{isAr ? 'التكاليف المسجلة' : 'Recorded costs'}</span>
                <span className={s.factValue}>{fmt(audit.totalLoggedCost)} {cur}</span>
              </div>
              {onOpenAuditForProperty && (
                <button
                  type="button"
                  className={s.linkBtn}
                  onClick={() => onOpenAuditForProperty(property)}
                >
                  <ReceiptText size={13} />
                  {isAr ? `عرض البنود (${audit.itemsCount})` : `View items (${audit.itemsCount})`}
                </button>
              )}
            </div>
          </div>

          <div className={s.grid}>
            <ZFPanel
              icon={<SlidersHorizontal size={15} />}
              title={isAr ? 'اختيار سعر المتر' : 'Choose price per m²'}
              hint={isAr ? 'حرّك المؤشر أو اكتب السعر مباشرة' : 'Drag the slider or type a price'}
            >
              <div className={s.ladder}>
                <div className={s.track}>
                  {result.hasCost && (
                    <span
                      className={s.lossZone}
                      style={{
                        width: `${bounds.max > bounds.min ? clamp(((n(result.costPerSqm) - bounds.min) / (bounds.max - bounds.min)) * 100) : 0}%`,
                      }}
                    />
                  )}
                  {markers
                    .filter((m) => m.value > 0)
                    .map((m) => {
                      const pos =
                        bounds.max > bounds.min
                          ? clamp(((m.value - bounds.min) / (bounds.max - bounds.min)) * 100)
                          : 0;
                      return (
                        <React.Fragment key={m.id}>
                          <span
                            className={`${s.marker} ${m.variant}`}
                            style={{ insetInlineStart: `${pos}%` }}
                          />
                          <span
                            className={`${s.markerLabel}${m.low ? ` ${s.markerLabelLow}` : ''}`}
                            style={{ insetInlineStart: `${pos}%` }}
                          >
                            {m.label}
                            <span className={s.markerValue}>{fmt(m.value)}</span>
                          </span>
                        </React.Fragment>
                      );
                    })}
                  <input
                    type="range"
                    className={s.range}
                    min={bounds.min}
                    max={bounds.max}
                    step={bounds.step}
                    value={clamp(n(chosenPerSqm), bounds.min, bounds.max)}
                    onChange={(e) => setChosenPerSqm(e.target.value)}
                    aria-label={isAr ? 'سعر المتر' : 'Price per m²'}
                  />
                </div>
              </div>

              <div className={s.fields}>
                <div className={s.field}>
                  <label className={s.label}>{isAr ? 'سعر المتر المختار' : 'Chosen price per m²'}</label>
                  <div className={s.inputWrap}>
                    <input
                      className={s.input}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={chosenPerSqm}
                      onChange={(e) => setChosenPerSqm(e.target.value)}
                    />
                    <span className={s.inputUnit}>{perSqm}</span>
                  </div>
                </div>

                <div className={s.field}>
                  <label className={s.label}>{isAr ? 'سعر المتر في السوق' : 'Market price per m²'}</label>
                  <div className={s.inputWrap}>
                    <input
                      className={s.input}
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={marketPerSqm}
                      onChange={(e) => setMarketPerSqm(e.target.value)}
                    />
                    <span className={s.inputUnit}>{perSqm}</span>
                  </div>
                  <span className={s.hint}>
                    {isAr
                      ? 'افتراضياً: السعر الحالي ÷ المساحة. عدّله حسب أسعار المنطقة.'
                      : 'Defaults to current price ÷ area. Adjust to local prices.'}
                  </span>
                </div>

                <div className={`${s.field} ${s.fieldWide}`}>
                  <label className={s.label}>{isAr ? 'اختيارات سريعة' : 'Quick picks'}</label>
                  <div className={s.chips}>
                    {result.hasCost && (
                      <button
                        type="button"
                        className={`${s.chip}${
                          Math.round(n(chosenPerSqm)) === Math.round(n(result.costPerSqm))
                            ? ` ${s.chipActive}`
                            : ''
                        }`}
                        onClick={() => setChosenPerSqm(String(Math.round(n(result.costPerSqm))))}
                      >
                        {isAr ? 'التعادل' : 'Break-even'}{' '}
                        <span className={s.chipSub}>{fmt(result.costPerSqm)}</span>
                      </button>
                    )}
                    {result.hasCost && (
                      <button
                        type="button"
                        className={`${s.chip}${
                          Math.round(n(chosenPerSqm)) ===
                          Math.round(n(pricePerSqmForMarkup(result.costPerSqm, 15)))
                            ? ` ${s.chipActive}`
                            : ''
                        }`}
                        onClick={() =>
                          setChosenPerSqm(String(Math.round(n(pricePerSqmForMarkup(result.costPerSqm, 15)))))
                        }
                      >
                        {isAr ? 'تكلفة +15%' : 'Cost +15%'}{' '}
                        <span className={s.chipSub}>{fmt(pricePerSqmForMarkup(result.costPerSqm, 15))}</span>
                      </button>
                    )}
                    {result.hasCost && (
                      <button
                        type="button"
                        className={`${s.chip}${
                          Math.round(n(chosenPerSqm)) ===
                          Math.round(n(pricePerSqmForMarkup(result.costPerSqm, 30)))
                            ? ` ${s.chipActive}`
                            : ''
                        }`}
                        onClick={() =>
                          setChosenPerSqm(String(Math.round(n(pricePerSqmForMarkup(result.costPerSqm, 30)))))
                        }
                      >
                        {isAr ? 'تكلفة +30%' : 'Cost +30%'}{' '}
                        <span className={s.chipSub}>{fmt(pricePerSqmForMarkup(result.costPerSqm, 30))}</span>
                      </button>
                    )}
                    {listPerSqm > 0 && (
                      <button
                        type="button"
                        className={`${s.chip}${
                          Math.round(n(chosenPerSqm)) === Math.round(listPerSqm) ? ` ${s.chipActive}` : ''
                        }`}
                        onClick={() => setChosenPerSqm(String(Math.round(listPerSqm)))}
                      >
                        {isAr ? 'السعر الحالي' : 'Current price'}{' '}
                        <span className={s.chipSub}>{fmt(listPerSqm)}</span>
                      </button>
                    )}
                    {n(marketPerSqm) > 0 && (
                      <button
                        type="button"
                        className={`${s.chip}${
                          Math.round(n(chosenPerSqm)) === Math.round(n(marketPerSqm))
                            ? ` ${s.chipActive}`
                            : ''
                        }`}
                        onClick={() => setChosenPerSqm(String(Math.round(n(marketPerSqm))))}
                      >
                        {isAr ? 'سعر السوق' : 'Market'}{' '}
                        <span className={s.chipSub}>{fmt(marketPerSqm)}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </ZFPanel>

            <ZFPanel icon={<BadgeDollarSign size={15} />} title={isAr ? 'النتيجة' : 'Result'}>
              <div className={s.result}>
                <div className={s.hero}>
                  <span className={s.heroLabel}>{isAr ? 'سعر البيع للعقار كاملاً' : 'Whole-property price'}</span>
                  <span className={s.heroValue}>
                    {fmt(result.totalPrice)}
                    <span className={s.heroUnit}>{cur}</span>
                  </span>
                  <span className={s.heroSub}>
                    {fmt(chosenPerSqm)} {perSqm} × {area} {isAr ? 'م²' : 'm²'}
                  </span>
                </div>
                <div className={s.rows}>
                  <div className={s.row}>
                    <span className={s.rowLabel}>{isAr ? 'التكلفة الفعلية' : 'Actual cost'}</span>
                    <span className={s.rowValue}>
                      {fmt(audit.totalLoggedCost)} <span className={s.muted}>{cur}</span>
                    </span>
                  </div>
                  <div className={s.row}>
                    <span className={s.rowLabel}>{isAr ? 'الربح' : 'Profit'}</span>
                    <span
                      className={`${s.rowValue} ${
                        n(result.profit) > 0 ? s.pos : n(result.profit) < 0 ? s.neg : ''
                      }`}
                    >
                      {signed(result.profit)} <span className={s.muted}>{cur}</span>
                    </span>
                  </div>
                  <div className={s.row}>
                    <span className={s.rowLabel}>{isAr ? 'هامش الربح من السعر' : 'Margin on price'}</span>
                    <span className={s.rowValue}>{pctPlain(result.marginPct)}</span>
                  </div>
                  <div className={s.row}>
                    <span className={s.rowLabel}>{isAr ? 'العائد على التكلفة' : 'Return on cost'}</span>
                    <span className={s.rowValue}>{pctPlain(result.returnOnCostPct)}</span>
                  </div>
                  <div className={s.row}>
                    <span className={s.rowLabel}>{isAr ? 'الفرق عن السعر الحالي' : 'Change vs current price'}</span>
                    <span className={s.rowValue}>
                      {signed(result.changeVsList)} <span className={s.muted}>{cur}</span>
                      {result.changeVsListPct !== null && ` (${pctText(result.changeVsListPct)})`}
                    </span>
                  </div>
                  <div className={s.row}>
                    <span className={s.rowLabel}>{isAr ? 'مقارنة بسعر السوق' : 'Vs market'}</span>
                    <span className={s.rowValue}>{pctText(result.vsMarketPct)}</span>
                  </div>
                </div>
                {!result.hasCost && (
                  <div className={`${s.notice} ${s.noticeWarn}`}>
                    <AlertTriangle size={14} />
                    <span>
                      {isAr
                        ? 'لا توجد تكاليف مسجلة لهذا العقار، فالربح المعروض غير دقيق. سجّل المصاريف أولاً.'
                        : 'No costs are recorded for this property, so the profit shown is not reliable. Record costs first.'}
                    </span>
                  </div>
                )}
                {result.belowCost && (
                  <div className={`${s.notice} ${s.noticeDanger}`}>
                    <AlertOctagon size={14} />
                    <span>
                      {isAr
                        ? 'السعر المختار أقل من التكلفة الفعلية: البيع به خسارة.'
                        : 'The chosen price is below actual cost: selling at it loses money.'}
                    </span>
                  </div>
                )}
                <div className={s.actions}>
                  {onUpdateSellingPrice && (
                    <button
                      type="button"
                      className={`${shellStyles.btnPrimary} ${s.saveBtn}`}
                      disabled={
                        isSaving ||
                        n(result.totalPrice) <= 0 ||
                        Math.round(n(result.totalPrice)) === Math.round(list)
                      }
                      onClick={async () => {
                        if (!property) return;
                        setIsSaving(true);
                        try {
                          await onUpdateSellingPrice(property.id, Math.round(n(result.totalPrice)));
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                    >
                      <Save size={14} />
                      <span>
                        {isSaving
                          ? isAr
                            ? 'جارٍ الحفظ…'
                            : 'Saving…'
                          : isAr
                          ? `حفظ ${fmt(result.totalPrice)} ${cur} كسعر للعقار`
                          : `Save ${fmt(result.totalPrice)} ${cur} as price`}
                      </span>
                    </button>
                  )}
                  <span className={s.hint}>
                    {isAr
                      ? 'يحدّث سعر العقار في الكتالوج والموقع.'
                      : 'Updates the property price in the catalog and website.'}
                  </span>
                </div>
              </div>
            </ZFPanel>
          </div>

          {units.length > 0 && (
            <ZFPanel
              flush
              icon={<LayoutGrid size={15} />}
              title={isAr ? 'الوحدات بنفس سعر المتر' : 'Units at this price per m²'}
              hint={isAr ? `${units.length} وحدة` : `${units.length} units`}
            >
              <div className={s.tableScroll}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>{isAr ? 'الوحدة' : 'Unit'}</th>
                      <th>{isAr ? 'الدور' : 'Floor'}</th>
                      <th>{isAr ? 'المساحة' : 'Area'}</th>
                      <th>{isAr ? 'الحالة' : 'Status'}</th>
                      <th className={s.num}>{isAr ? 'السعر الحالي' : 'Current'}</th>
                      <th className={s.num}>{isAr ? 'السعر الجديد' : 'New'}</th>
                      <th className={s.num}>{isAr ? 'الفرق' : 'Change'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((u, idx) => {
                      const uRow = unitRows[idx];
                      const changeNum = uRow ? n(uRow.change) : 0;
                      const statusCls =
                        u.status === 'available'
                          ? shellStyles.statusPillGreen
                          : u.status === 'reserved'
                          ? shellStyles.statusPillAmber || shellStyles.statusPillNeutral
                          : shellStyles.statusPillNeutral;
                      const statusLabel =
                        u.status === 'available'
                          ? isAr
                            ? 'متاحة'
                            : 'Available'
                          : u.status === 'reserved'
                          ? isAr
                            ? 'محجوزة'
                            : 'Reserved'
                          : isAr
                          ? 'مباعة'
                          : 'Sold';

                      return (
                        <tr key={u.unit_id || idx}>
                          <td>{u.unit_number}</td>
                          <td>{u.floor}</td>
                          <td>{u.area_sqm} {isAr ? 'م²' : 'm²'}</td>
                          <td>
                            <span className={`${shellStyles.statusPill} ${statusCls}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className={s.num}>{fmt(uRow?.currentPrice ?? u.price_egp ?? 0)}</td>
                          <td className={s.num}>{fmt(uRow?.newPrice ?? 0)}</td>
                          <td className={`${s.num} ${changeNum > 0 ? s.pos : changeNum < 0 ? s.neg : ''}`}>
                            {signed(changeNum)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={s.tableNote}>
                {isAr
                  ? 'للعرض فقط: الحفظ يحدّث سعر العقار ككل. أسعار الوحدات تُعدّل من صفحة العقارات.'
                  : 'Preview only: saving updates the whole-property price. Unit prices are edited on the Properties page.'}
              </div>
            </ZFPanel>
          )}
        </>
      )}

      {mode === 'feasibility' && (
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

          <ZFPanel icon={<BadgeDollarSign size={15} />} title={isAr ? 'النتيجة' : 'Result'}>
            <div className={s.result}>
              <div className={s.hero}>
                <span className={s.heroLabel}>{isAr ? 'صافي الربح المتوقع' : 'Expected profit'}</span>
                <span className={`${s.heroValue}${n(feas.profit) < 0 ? ` ${s.neg}` : ''}`}>
                  {signed(feas.profit)} <span className={s.heroUnit}>{cur}</span>
                </span>
                <span className={s.heroSub}>
                  {`${isAr ? 'هامش' : 'Margin'} ${pctPlain(feas.marginPct)} • ${
                    isAr ? 'عائد على التكلفة' : 'Return on cost'
                  } ${pctPlain(feas.returnOnCostPct)}`}
                </span>
              </div>

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
                <div className={s.row}>
                  <span className={s.rowLabel}>{isAr ? 'إجمالي التكلفة' : 'Total cost'}</span>
                  <span className={s.rowValue}>{fmt(feas.totalCost)} <span className={s.muted}>{cur}</span></span>
                </div>
                <div className={s.row}>
                  <span className={s.rowLabel}>{isAr ? 'الإيرادات المتوقعة' : 'Expected revenue'}</span>
                  <span className={s.rowValue}>{fmt(feas.revenue)} <span className={s.muted}>{cur}</span></span>
                </div>
                <div className={s.row}>
                  <span className={s.rowLabel}>{isAr ? 'سعر التعادل للمتر' : 'Break-even per m²'}</span>
                  <span className={s.rowValue}>{fmt(feas.breakEvenPricePerSqm)} <span className={s.muted}>{perSqm}</span></span>
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
      )}

      {mode === 'built' && property && (
        <ZFWorkstationSideWidgets>
          <ZFPanel
            icon={<PieChart size={15} />}
            title={isAr ? 'توزيع التكاليف' : 'Cost breakdown'}
            hint={isAr ? property.title_ar : property.title_en || property.title_ar}
          >
            {audit.itemsCount === 0 ? (
              <div className={s.empty}>{isAr ? 'لا توجد تكاليف مسجلة.' : 'No costs recorded.'}</div>
            ) : (
              <div className={s.breakdown}>
                {categoryList.map(({ key, total, share }) => (
                  <div key={key} className={s.bdRow}>
                    <div className={s.bdHead}>
                      <span className={s.bdName}>
                        {CATEGORY_LABELS[key]?.[isAr ? 'ar' : 'en'] || key}
                      </span>
                      <span className={s.bdValue}>{fmt(total)}</span>
                    </div>
                    <div className={s.bdTrack}>
                      <span className={s.bdFill} style={{ width: `${share}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {onNavigateToTab && (
              <button
                type="button"
                className={`${shellStyles.btnGhost} ${shellStyles.btnSm}`}
                onClick={() => onNavigateToTab('construction')}
              >
                {isAr ? 'دفتر مصاريف البناء' : 'Construction cost book'}
              </button>
            )}
          </ZFPanel>
        </ZFWorkstationSideWidgets>
      )}
    </div>
  );
}

export default CostPricingCalculator;
