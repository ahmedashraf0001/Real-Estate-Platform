/**
 * Zakaria Farid Real Estate ERP — Construction & Feasibility Cost Calculator
 * Real estate development cost estimator tailored for the Egyptian market.
 * Computes structural steel tonnage, ready-mix concrete volume, MEP, finishing tiers,
 * and developer profit margins (ROI %) per square meter.
 */

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Hammer, 
  FileSpreadsheet, 
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Property } from '@/lib/supabase/types';
import { D } from '@/lib/erp/math';

interface ConstructionCostCalculatorProps {
  properties: Property[];
  onApplyBudgetToProperty?: (propertyId: string, budgetAmount: string) => void;
  isAr: boolean;
}

export type PropertyConstructionType = 
  | 'apartment_standard' 
  | 'apartment_duplex' 
  | 'apartment_roof' 
  | 'building' 
  | 'garage';

export type FinishingTier = 'core_and_shell' | 'semi_finished' | 'lux' | 'super_lux';

export const FINISHING_TIER_COSTS: Record<FinishingTier, { costPerSqm: number; labelAr: string; labelEn: string; descAr: string }> = {
  core_and_shell: {
    costPerSqm: 2800,
    labelAr: 'طوب أحمر وعظم (Core & Shell)',
    labelEn: 'Core & Shell / Red Brick',
    descAr: 'هيكل خرساني مسلّح ومباني طوب أحمر وحلوق خشب بدون تشطيب داخلي'
  },
  semi_finished: {
    costPerSqm: 4500,
    labelAr: 'نصف تشطيب (Semi-Finished) — الأكثر طلباً',
    labelEn: 'Semi-Finished (Standard)',
    descAr: 'محارة أسمنتية كاملة، حلوق خشبية، تأسيس كهرباء وعلب، وتمديدات مواسير سباكة'
  },
  lux: {
    costPerSqm: 7500,
    labelAr: 'تشطيب لوكس (Lux Finished)',
    labelEn: 'Lux Finished',
    descAr: 'أرضيات سيراميك فرز أول، دهانات بلاستيك جوتن، أطقم صحي، وشبابيك ألوميتال'
  },
  super_lux: {
    costPerSqm: 10500,
    labelAr: 'تشطيب سوبر لوكس (Super Lux)',
    labelEn: 'Super Lux Finished',
    descAr: 'أرضيات بورسلين، أسقف ساقطة وجبسوم بورد ليد، دهانات كمبيوتر، وقطاعات جامبو'
  }
};

export const ConstructionCostCalculator: React.FC<ConstructionCostCalculatorProps> = ({
  properties,
  onApplyBudgetToProperty,
  isAr
}) => {
  // Inputs State — Middle Class Egyptian Real Estate Defaults
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [constructionType, setConstructionType] = useState<PropertyConstructionType>('apartment_standard');
  const [builtUpAreaSqm, setBuiltUpAreaSqm] = useState<number>(160);
  const [floorsCount, setFloorsCount] = useState<number>(5);
  const [landAreaSqm, setLandAreaSqm] = useState<number>(300);
  const [landPricePerSqm, setLandPricePerSqm] = useState<number>(12000);
  const [finishingTier, setFinishingTier] = useState<FinishingTier>('semi_finished');
  
  // Market Material Prices (Egypt Middle Class Market Rates)
  const [steelPricePerTon, setSteelPricePerTon] = useState<number>(41000); // EGP per ton
  const [concretePricePerM3, setConcretePricePerM3] = useState<number>(1600); // EGP per m3
  const laborCostPerSqm = 1000; // EGP per sqm
  const [targetSalePricePerSqm, setTargetSalePricePerSqm] = useState<number>(24000); // EGP per sqm selling

  // When a property is selected from the catalog, auto-fill area and specs
  const handleSelectProperty = (propId: string) => {
    setSelectedPropertyId(propId);
    if (!propId) return;
    const prop = properties.find(p => p.id === propId);
    if (prop) {
      if (prop.area_sqm) setBuiltUpAreaSqm(prop.area_sqm);
      if (prop.price_egp && prop.area_sqm) {
        setTargetSalePricePerSqm(Math.round(prop.price_egp / prop.area_sqm));
      }
      const title = (prop.title_ar || prop.title_en || '').toLowerCase();
      if (prop.type === 'building') {
        setConstructionType('building');
        setFloorsCount(5);
      } else if (prop.type === 'garage') {
        setConstructionType('garage');
        setFloorsCount(1);
      } else if (title.includes('دوبلكس') || title.includes('duplex')) {
        setConstructionType('apartment_duplex');
        setFloorsCount(2);
      } else if (title.includes('روف') || title.includes('رووف') || title.includes('roof')) {
        setConstructionType('apartment_roof');
        setFloorsCount(1);
      } else {
        setConstructionType('apartment_standard');
        setFloorsCount(1);
      }
    }
  };

  // Calculations
  const calculations = useMemo(() => {
    const area = Math.max(1, builtUpAreaSqm);

    // 1. Engineering Material Estimates
    // Industry rule in Egypt: ~105-115 kg of steel per m² of built-up area
    const steelTons = (area * 0.11);
    const totalSteelCost = steelTons * steelPricePerTon;

    // Ready-mix concrete volume: ~0.42 m³ per m² of built-up area
    const concreteVolumeM3 = (area * 0.42);
    const totalConcreteCost = concreteVolumeM3 * concretePricePerM3;

    // Structural skeleton labor (مصنعيات نجارة وحدادة وصب وبنائين)
    const totalLaborCost = area * laborCostPerSqm;

    // Direct Skeleton Cost (تكلفة الهيكل الخرساني والمباني عظم)
    const skeletonTotal = totalSteelCost + totalConcreteCost + totalLaborCost;

    // 2. MEP & Utilities (كهروميكانيك، تأسيس سباكة وكهرباء، عزل مائي وحراري)
    const mepCostPerSqm = 2200;
    const totalMepCost = area * mepCostPerSqm;

    // 3. Architectural Finishing (التشطيبات المعمارية حسب المستوى المختار)
    const finishingUnitCost = FINISHING_TIER_COSTS[finishingTier].costPerSqm;
    const totalFinishingCost = area * finishingUnitCost;

    // 4. Elevators, Facade Stone & Site Improvements
    const hasElevator = (floorsCount >= 4 || constructionType === 'building') && constructionType !== 'garage';
    const elevatorCost = hasElevator ? 450000 : 0; // Standard building passenger elevator
    const facadeAndLandscapeCost = area * 1200; // Egyptian facade finishing & marble entrance

    // Total Direct Construction WIP Cost (المباني والتنفيذ)
    const totalConstructionWip = skeletonTotal + totalMepCost + totalFinishingCost + elevatorCost + facadeAndLandscapeCost;
    const constructionCostPerSqm = totalConstructionWip / area;

    // 5. Land Cost Allocation
    const totalLandCost = landAreaSqm * landPricePerSqm;
    const landCostPerBuiltSqm = totalLandCost / area;

    // Grand Project Cost (WIP + Land Asset)
    const grandProjectCost = totalConstructionWip + totalLandCost;
    const grandCostPerSqm = grandProjectCost / area;

    // 6. Feasibility & Revenue Projection
    const projectedGrossRevenue = area * targetSalePricePerSqm;
    const projectedNetProfit = projectedGrossRevenue - grandProjectCost;
    const developerMarginPercent = grandProjectCost > 0 
      ? (projectedNetProfit / grandProjectCost) * 100 
      : 0;

    return {
      steelTons: Math.round(steelTons * 10) / 10,
      totalSteelCost,
      concreteVolumeM3: Math.round(concreteVolumeM3),
      totalConcreteCost,
      totalLaborCost,
      skeletonTotal,
      totalMepCost,
      totalFinishingCost,
      elevatorCost,
      facadeAndLandscapeCost,
      totalConstructionWip,
      constructionCostPerSqm: Math.round(constructionCostPerSqm),
      totalLandCost,
      landCostPerBuiltSqm: Math.round(landCostPerBuiltSqm),
      grandProjectCost,
      grandCostPerSqm: Math.round(grandCostPerSqm),
      projectedGrossRevenue,
      projectedNetProfit,
      developerMarginPercent: Math.round(developerMarginPercent * 10) / 10
    };
  }, [
    builtUpAreaSqm, 
    floorsCount, 
    landAreaSqm, 
    landPricePerSqm, 
    finishingTier, 
    steelPricePerTon, 
    concretePricePerM3, 
    laborCostPerSqm, 
    targetSalePricePerSqm, 
    constructionType
  ]);

  // Export Feasibility Study to Excel
  const handleExportFeasibilityExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      [isAr ? 'دراسة الجدوى وحاسبة تكاليف التشييد التقديرية' : 'Construction Feasibility & Cost Estimation'],
      [isAr ? 'شركة زكريا فريد للتطوير العقاري' : 'Zakaria Farid Real Estate Developments'],
      [isAr ? 'تاريخ الحساب:' : 'Calculation Date:', new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')],
      [],
      [isAr ? 'المواصفات الفنية والمساحات' : 'Technical Specifications'],
      [isAr ? 'المساحة المبنية الإجمالية (م²)' : 'Built-up Area (sqm)', builtUpAreaSqm],
      [isAr ? 'مساحة الأرض (م²)' : 'Land Area (sqm)', landAreaSqm],
      [isAr ? 'عدد الأدوار' : 'Number of Floors', floorsCount],
      [isAr ? 'مستوى التشطيب المختار' : 'Finishing Tier', FINISHING_TIER_COSTS[finishingTier].labelAr],
      [],
      [isAr ? 'تقديرات المواد والإنشاءات' : 'Material & Structural Estimates', isAr ? 'الكمية' : 'Quantity', isAr ? 'التكلفة الإجمالية (ج.م)' : 'Total Cost (EGP)'],
      [isAr ? 'حديد التسليح المقدر' : 'Steel Rebar', `${calculations.steelTons} طن`, calculations.totalSteelCost],
      [isAr ? 'خرسانة مسلحة جاهزة' : 'Ready-mix Concrete', `${calculations.concreteVolumeM3} م³`, calculations.totalConcreteCost],
      [isAr ? 'أجور مصنعيات الهيكل' : 'Skeleton Labor', `${builtUpAreaSqm} م²`, calculations.totalLaborCost],
      [isAr ? 'إجمالي تكلفة العظم والخرسانات' : 'Total Skeleton Cost', '', calculations.skeletonTotal],
      [isAr ? 'التأسيس والكهروميكانيك (MEP)' : 'MEP & Utilities', '', calculations.totalMepCost],
      [isAr ? 'أعمال التشطيبات المعمارية' : 'Architectural Finishing', '', calculations.totalFinishingCost],
      [isAr ? 'المصاعد والواجهات وتنسيق الموقع' : 'Elevator, Facade & Landscape', '', calculations.elevatorCost + calculations.facadeAndLandscapeCost],
      [isAr ? 'إجمالي تكلفة البناء والتشييد (WIP)' : 'Total Construction Cost (WIP)', '', calculations.totalConstructionWip],
      [isAr ? 'تكلفة الأرض المخصصة' : 'Allocated Land Cost', '', calculations.totalLandCost],
      [isAr ? 'إجمالي الاستثمار والتكلفة الكلية' : 'Grand Total Investment', '', calculations.grandProjectCost],
      [],
      [isAr ? 'المؤشرات المالية وهامش الربح' : 'Financial Indicators & Margins'],
      [isAr ? 'تكلفة المتر الإجمالية (ج.م/م²)' : 'Total Cost / sqm', calculations.grandCostPerSqm],
      [isAr ? 'سعر البيع المستهدف للمتر (ج.م/م²)' : 'Target Sale Price / sqm', targetSalePricePerSqm],
      [isAr ? 'إجمالي المبيعات المتوقعة' : 'Projected Sales Revenue', calculations.projectedGrossRevenue],
      [isAr ? 'صافي أرباح المطور المتوقعة' : 'Projected Net Developer Profit', calculations.projectedNetProfit],
      [isAr ? 'العائد على الاستثمار (ROI %)' : 'Return on Investment (ROI %)', `${calculations.developerMarginPercent}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 35 }, { wch: 22 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, isAr ? 'دراسة الجدوى التقديرية' : 'Feasibility Study');
    XLSX.writeFile(wb, `دراسة_جدوى_بناء_${builtUpAreaSqm}متر_${Date.now()}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(18, 22, 34, 0.95) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.35)',
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--zf-gold, #d4af37), #b89628)',
            color: '#0a0c12',
            padding: '0.85rem',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.35)'
          }}>
            <Calculator size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
                {isAr ? 'حاسبة تكاليف البناء والتشييد ودراسة الجدوى الميدانية' : 'Construction Cost & Feasibility Estimator'}
              </h2>
              <span style={{
                background: 'rgba(212, 175, 55, 0.15)',
                color: 'var(--zf-gold, #d4af37)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 800
              }}>
                {isAr ? 'معايير السوق المصري' : 'Egypt Market Rates'}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--zf-text-secondary, #a7acc0)' }}>
              {isAr 
                ? 'حساب أطنان الحديد وحجوم الخرسانات ومستويات التشطيب وحساب هوامش الربح للمطور العقاري' 
                : 'Automated steel tonnage, concrete volume, finishing tiers, and developer ROI margins'}
            </p>
          </div>
        </div>

        <button
          onClick={handleExportFeasibilityExcel}
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '10px',
            padding: '0.65rem 1.15rem',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
            transition: 'all 0.2s ease'
          }}
        >
          <FileSpreadsheet size={16} />
          <span>{isAr ? 'تصدير دراسة الجدوى Excel' : 'Export Feasibility Excel'}</span>
        </button>
      </div>

      {/* Main Grid: Parameters on Left, Real-Time Calculations on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* INPUT PARAMETERS CARD */}
        <div style={{
          background: 'rgba(18, 22, 34, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.35rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.15rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Hammer size={18} color="var(--zf-gold, #d4af37)" />
              <span>{isAr ? 'مدخلات المشروع والمواصفات الفنية' : 'Project Parameters & Specs'}</span>
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--zf-text-muted, #6b7086)' }}>
              {isAr ? 'تعديل المعطيات لحظياً' : 'Real-time computation'}
            </span>
          </div>

          {/* Quick-Link to Existing Property in Catalog */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }}>
              {isAr ? 'ربط بمشروع / عقار من الكتالوج (اختياري للتحميل السريع):' : 'Load Specs from Existing Property:'}
            </label>
            <select
              value={selectedPropertyId}
              onChange={e => handleSelectProperty(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '8px',
                padding: '0.55rem',
                color: '#ffffff',
                fontSize: '0.8rem',
                outline: 'none',
                colorScheme: 'dark'
              }}
            >
              <option value="">{isAr ? '-- إدخال أبعاد حرة ومستقلة --' : '-- Custom Manual Specs --'}</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {isAr ? p.title_ar : p.title_en} ({p.area_sqm} م² - {D(p.price_egp).formatEGP(isAr)})
                </option>
              ))}
            </select>
          </div>

          {/* Type & Areas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e5e7eb' }}>
                {isAr ? 'نوع العقار الإنشائي:' : 'Property Type:'}
              </label>
              <select
                value={constructionType}
                onChange={e => setConstructionType(e.target.value as PropertyConstructionType)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '0.55rem',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none',
                  colorScheme: 'dark'
                }}
              >
                <option value="apartment_standard">{isAr ? 'شقة عادية (Standard Flat)' : 'Standard Flat'}</option>
                <option value="apartment_duplex">{isAr ? 'دوبلكس دورين (Duplex)' : 'Duplex'}</option>
                <option value="apartment_roof">{isAr ? 'شقة رووف مع السطح (Roof Suite)' : 'Roof Suite'}</option>
                <option value="building">{isAr ? 'عمارة سكنية / تجارية كاملة (Building)' : 'Residential Building'}</option>
                <option value="garage">{isAr ? 'جراج سيارات استثماري (Garage)' : 'Commercial Garage'}</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e5e7eb' }}>
                {isAr ? 'المساحة المبنية BUA (م²):' : 'Built-up Area (sqm):'}
              </label>
              <input
                type="number"
                min="50"
                step="10"
                value={builtUpAreaSqm}
                onChange={e => setBuiltUpAreaSqm(parseFloat(e.target.value) || 0)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '0.55rem',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Floors & Land Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e5e7eb' }}>
                {isAr ? 'عدد الأدوار الإنشائية:' : 'Floors Count:'}
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={floorsCount}
                onChange={e => setFloorsCount(parseInt(e.target.value, 10) || 1)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '0.55rem',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e5e7eb' }}>
                {isAr ? 'مساحة الأرض (م²):' : 'Land Area (sqm):'}
              </label>
              <input
                type="number"
                min="0"
                value={landAreaSqm}
                onChange={e => setLandAreaSqm(parseFloat(e.target.value) || 0)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '0.55rem',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Finishing Tier Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--zf-gold, #d4af37)' }}>
              {isAr ? 'مستوى التشطيب المعماري والتسليم:' : 'Finishing & Handover Tier:'}
            </label>
            <select
              value={finishingTier}
              onChange={e => setFinishingTier(e.target.value as FinishingTier)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                outline: 'none',
                colorScheme: 'dark'
              }}
            >
              {Object.entries(FINISHING_TIER_COSTS).map(([tierKey, data]) => (
                <option key={tierKey} value={tierKey}>
                  {data.labelAr} — (~{data.costPerSqm.toLocaleString()} ج.م/م²)
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.15rem' }}>
              {FINISHING_TIER_COSTS[finishingTier].descAr}
            </span>
          </div>

          {/* Market Unit Costs (Customizable) */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--zf-text-muted, #6b7086)', textTransform: 'uppercase' }}>
              {isAr ? 'أسعار خامات ومصنعيات السوق المباشرة (ج.م):' : 'Live Construction Unit Costs (EGP):'}
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', marginBottom: '0.2rem' }}>
                  {isAr ? 'سعر طن حديد التسليح (ج.م):' : 'Steel Rebar / Ton:'}
                </label>
                <input
                  type="number"
                  value={steelPricePerTon}
                  onChange={e => setSteelPricePerTon(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', marginBottom: '0.2rem' }}>
                  {isAr ? 'سعر متر خرسانة جاهزة (ج.م/م³):' : 'Concrete / m³:'}
                </label>
                <input
                  type="number"
                  value={concretePricePerM3}
                  onChange={e => setConcretePricePerM3(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', marginBottom: '0.2rem' }}>
                  {isAr ? 'سعر متر الأرض الفعلي (ج.م/م²):' : 'Land Price / sqm:'}
                </label>
                <input
                  type="number"
                  value={landPricePerSqm}
                  onChange={e => setLandPricePerSqm(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '6px', color: '#fff', fontSize: '0.8rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--zf-gold, #d4af37)', display: 'block', marginBottom: '0.2rem', fontWeight: 700 }}>
                  {isAr ? 'سعر البيع المستهدف (ج.م/م²):' : 'Target Selling / sqm:'}
                </label>
                <input
                  type="number"
                  value={targetSalePricePerSqm}
                  onChange={e => setTargetSalePricePerSqm(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: 'rgba(212,175,55,0.1)', border: '1px solid var(--zf-gold, #d4af37)', padding: '0.4rem', borderRadius: '6px', color: 'var(--zf-gold, #d4af37)', fontSize: '0.85rem', fontWeight: 800 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS & FEASIBILITY ENGINE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Key Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(18, 22, 34, 0.9) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <span style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 700 }}>
                {isAr ? 'حديد التسليح المقدر (Structural Steel)' : 'Estimated Steel'}
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
                {calculations.steelTons} <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{isAr ? 'طن' : 'Tons'}</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                {D(calculations.totalSteelCost).formatEGP(isAr)}
              </span>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(18, 22, 34, 0.9) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>
                {isAr ? 'الخرسانة المسلحة الجاهزة' : 'Ready-Mix Concrete'}
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
                {calculations.concreteVolumeM3} <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>م³</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                {D(calculations.totalConcreteCost).formatEGP(isAr)}
              </span>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(18, 22, 34, 0.9) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--zf-gold, #d4af37)', fontWeight: 700 }}>
                {isAr ? 'العائد المتوقع للمطور (ROI)' : 'Expected Developer ROI'}
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: calculations.developerMarginPercent >= 30 ? '#34d399' : '#f59e0b' }}>
                +{calculations.developerMarginPercent}%
              </div>
              <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                {isAr ? 'هامش ربح صافي على التكلفة' : 'Net Margin over Cost'}
              </span>
            </div>
          </div>

          {/* Detailed Financial Breakdown Table */}
          <div style={{
            background: 'rgba(18, 22, 34, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                {isAr ? 'توزيع بنود تكلفة المشروع الإجمالية (Detailed WIP Breakdown)' : 'Cost Allocation Breakdown'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--zf-gold, #d4af37)', fontWeight: 700 }}>
                {isAr ? `تكلفة المتر الشاملة: ${calculations.grandCostPerSqm.toLocaleString()} ج.م/م²` : `Total Cost/m²: ${calculations.grandCostPerSqm} EGP`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>1. {isAr ? 'الهيكل الخرساني والمباني عظم (حديد + خرسانة + عمالة)' : 'Concrete Skeleton & Masonry'}:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{D(calculations.skeletonTotal).formatEGP(isAr)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>2. {isAr ? 'التأسيس والكهروميكانيك والمرافق (MEP)' : 'MEP & Plumbing/Electrical'}:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{D(calculations.totalMepCost).formatEGP(isAr)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>3. {isAr ? `التشطيبات المعمارية (${FINISHING_TIER_COSTS[finishingTier].labelAr})` : 'Finishing'}:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#38bdf8' }}>{D(calculations.totalFinishingCost).formatEGP(isAr)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                <span>4. {isAr ? 'المصاعد والواجهات الخارجية وتنسيق الموقع' : 'Elevators, Stone Facade & Landscape'}:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{D(calculations.elevatorCost + calculations.facadeAndLandscapeCost).formatEGP(isAr)}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#f59e0b',
                fontWeight: 800,
                paddingTop: '0.35rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <span>{isAr ? 'إجمالي تكلفة البناء والتشييد المباشرة (151000 WIP):' : 'Total Construction WIP:'}</span>
                <span style={{ fontFamily: 'monospace' }}>{D(calculations.totalConstructionWip).formatEGP(isAr)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                <span>{isAr ? 'تكلفة الأرض المخصصة للمشروع (150000 Land):' : 'Allocated Land Cost:'}</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{D(calculations.totalLandCost).formatEGP(isAr)}</span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.9rem',
                paddingTop: '0.45rem',
                borderTop: '1px solid rgba(212, 175, 55, 0.3)',
                background: 'rgba(212, 175, 55, 0.05)',
                padding: '0.5rem',
                borderRadius: '8px'
              }}>
                <span>{isAr ? 'إجمالي التكلفة الاستثمارية الكلية للمشروع:' : 'Grand Total Project Investment:'}</span>
                <span style={{ color: 'var(--zf-gold, #d4af37)', fontFamily: 'monospace' }}>{D(calculations.grandProjectCost).formatEGP(isAr)}</span>
              </div>
            </div>

            {/* Feasibility Bottom Line */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(18, 22, 34, 0.6) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              padding: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem'
            }}>
              <div>
                <span style={{ color: '#9ca3af', display: 'block', fontSize: '0.7rem' }}>
                  {isAr ? 'إجمالي المبيعات المستهدفة:' : 'Projected Sales:'}
                </span>
                <span style={{ fontWeight: 800, color: '#ffffff' }}>
                  {D(calculations.projectedGrossRevenue).formatEGP(isAr)}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#34d399', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>
                  {isAr ? 'صافي الربح المتوقع للمطور:' : 'Projected Net Profit:'}
                </span>
                <span style={{ fontWeight: 900, color: '#34d399', fontSize: '0.95rem' }}>
                  +{D(calculations.projectedNetProfit).formatEGP(isAr)}
                </span>
              </div>
            </div>

            {/* Link to Selected Property CTA */}
            {selectedPropertyId && onApplyBudgetToProperty && (
              <button
                onClick={() => onApplyBudgetToProperty(selectedPropertyId, calculations.totalConstructionWip.toString())}
                style={{
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
                  border: '1px solid var(--zf-gold, #d4af37)',
                  color: 'var(--zf-gold, #d4af37)',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <CheckCircle2 size={14} />
                <span>{isAr ? 'اعتماد هذه الحسابات كميزانية تقديرية للعقار المحدد بالدفاتر' : 'Commit as Approved WIP Budget Ceiling for Property'}</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
