'use client';

import React from 'react';
import { 
  Building2, 
  MapPin, 
  Layers, 
  Plus, 
  Calculator, 
  LineChart, 
  CheckCircle2, 
  Clock, 
  Check,
  Maximize2,
  Home
} from 'lucide-react';
import { Property, BuildingUnitItem } from '@/lib/supabase/types';
import { ERPContract } from '@/lib/erp/types';
import { calculateProjectCardMetrics } from '@/lib/erp/propertiesPortfolioCalculations';
import styles from '../PropertiesPortfolioView.module.css';
import shellStyles from '../../ZFWorkstationShell.module.css';

export interface ProjectShowcaseCardProps {
  property: Property;
  contracts?: ERPContract[];
  isSelected?: boolean;
  onSelect?: () => void;
  onViewUnits?: () => void;
  onOpenContract?: () => void;
  onOpenCalculator?: () => void;
  onOpenLifecycle?: () => void;
  isAr?: boolean;
  index?: number;
}

export const getCuratedProjectImage = (property: Property, index: number = 0): string => {
  if (property.property_images && property.property_images.length > 0 && property.property_images[0]?.url) {
    const rawUrl = property.property_images[0].url;
    if (rawUrl.startsWith('http') && !rawUrl.includes('supabase.co/storage/v1/object/public/properties/broken')) {
      return rawUrl;
    }
  }

  const title = ((property.title_ar || '') + ' ' + (property.title_en || '')).toLowerCase();
  if (title.includes('جونة') || title.includes('لاجون') || title.includes('gouna') || title.includes('lagoon')) {
    return 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=85';
  }
  if (title.includes('ساحل') || title.includes('ووترز') || title.includes('coast') || title.includes('waters')) {
    return 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85';
  }
  if (title.includes('سخنة') || title.includes('جبل') || title.includes('sokhna')) {
    return 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85';
  }
  if (property.type === 'building' || title.includes('عمارة') || title.includes('building')) {
    const buildingImages = [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
    ];
    return buildingImages[index % buildingImages.length];
  }
  if (property.type === 'villa') {
    return 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85';
  }

  const fallbackPool = [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=85'
  ];
  return fallbackPool[index % fallbackPool.length];
};

export const ProjectShowcaseCard: React.FC<ProjectShowcaseCardProps> = ({
  property,
  contracts = [],
  isSelected = false,
  onSelect,
  onViewUnits,
  onOpenContract,
  onOpenCalculator,
  onOpenLifecycle,
  isAr = true,
  index = 0,
}) => {
  const metrics = calculateProjectCardMetrics(property, contracts);
  const imgUrl = getCuratedProjectImage(property, index);
  const isBuilding = property.type === 'building' || (property.title_ar || '').includes('عمارة') || (property.title_en || '').toLowerCase().includes('building') || (property.building_units && property.building_units.length > 0);
  const displayedPrice = isBuilding ? (property.price_egp || 0) : metrics.minPrice;
  const formatArea = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const areaUnit = isAr ? 'م²' : 'm²';
  const unitAreaLabel = metrics.minArea !== metrics.maxArea
    ? `${formatArea(metrics.minArea)} - ${formatArea(metrics.maxArea)}`
    : formatArea(metrics.minArea);
  const hasUnitAreas = property.building_units?.some(unit => unit.area_sqm > 0);

  const formatEgp = (val: number): string => {
    return `${Math.round(val).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;
  };

  // Compact currency formatter for metric strip
  const formatCompactEgp = (val: number): string => {
    if (val >= 1_000_000) {
      const m = (val / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return `${m} ${isAr ? 'مليون ج.م' : 'M EGP'}`;
    }
    if (val >= 1_000) {
      const k = (val / 1_000).toFixed(0);
      return `${k} ${isAr ? 'ألف ج.م' : 'K EGP'}`;
    }
    return formatEgp(val);
  };

  // Category label
  let categoryLabel = isAr ? 'مشروع عقاري' : 'Property';
  if (isBuilding) categoryLabel = isAr ? 'عمارة سكنية' : 'Building Block';
  else if (property.type === 'villa') categoryLabel = isAr ? 'فيلا فاخرة' : 'Villa';
  else if (property.type === 'duplex') categoryLabel = isAr ? 'دوبلكس' : 'Duplex';
  else if (property.type === 'penthouse') categoryLabel = isAr ? 'بنتهاوس' : 'Penthouse';
  else if ((property.type as string) === 'chalet') categoryLabel = isAr ? 'شاليه ساحلي' : 'Chalet';
  else if (property.type === 'commercial' || (property.type as string) === 'office') categoryLabel = isAr ? 'تجاري وإداري' : 'Commercial';

  return (
    <div
      className={`${styles.projectCard} ${isSelected ? styles.projectCardSelected : ''}`}
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff !important',
        borderRadius: '12px',
        border: isSelected ? '1.5px solid var(--erp-accent)' : '1px solid var(--erp-border, #cbd5e1)',
        boxShadow: isSelected ? '0 0 0 1px var(--erp-accent), 0 4px 14px -2px color-mix(in srgb, var(--erp-accent) 15%, transparent)' : undefined,
        overflow: 'hidden',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        minHeight: '460px',
      }}
    >
      {/* ─── 1. HIGH-RES PHOTO BANNER (SPACIOUS 16:10 RATIO) ─── */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          minHeight: '200px',
          overflow: 'hidden',
          background: '#0f172a',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgUrl}
          alt={property.title_ar || property.title_en}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onError={(e) => {
            const fallback = getCuratedProjectImage(property, index + 1);
            if (e.currentTarget.src !== fallback) {
              e.currentTarget.src = fallback;
            }
          }}
        />

        {/* Subtle Vignette Gradient Overlay */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            pointerEvents: 'none',
          }} 
        />

        {/* Top-Right: Clean Floating Status Pill (Single, No clutter) */}
        <div style={{
          position: 'absolute',
          top: '12px',
          [isAr ? 'right' : 'left']: '12px',
          zIndex: 2,
        }}>
          {metrics.isContracted ? (
            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillNeutral}`} style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.92)' }}>
              <CheckCircle2 size={12} />
              <span>{isAr ? 'تم التعاقد بالكامل' : 'Fully Sold'}</span>
            </span>
          ) : metrics.contractedUnitsCount > 0 ? (
            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillBlue}`} style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.92)' }}>
              <Clock size={12} />
              <span>{isAr ? `مباع جزئياً (${metrics.contractedUnitsCount}/${metrics.totalUnitsCount})` : `Partially Sold (${metrics.contractedUnitsCount}/${metrics.totalUnitsCount})`}</span>
            </span>
          ) : property.completion_status === 'ready' ? (
            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillGreen}`} style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.92)' }}>
              <Check size={12} />
              <span>{isAr ? 'جاهز للتسليم' : 'Ready'}</span>
            </span>
          ) : (
            <span className={`${shellStyles.statusPill} ${shellStyles.statusPillAmber}`} style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.92)' }}>
              <Clock size={12} />
              <span>{isAr ? 'قيد التنفيذ والإنشاء' : 'Under Construction'}</span>
            </span>
          )}
        </div>
      </div>

      {/* ─── 2. CARD BODY & HIERARCHY ─── */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        
        {/* Category Tag + Location Meta Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'var(--erp-accent)',
            background: 'var(--erp-accent-tint, color-mix(in srgb, var(--erp-accent) 8%, transparent))',
            border: '1px solid color-mix(in srgb, var(--erp-accent) 20%, transparent)',
            padding: '0.15rem 0.55rem',
            borderRadius: '5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}>
            {isBuilding ? <Building2 size={11} /> : <Home size={11} />}
            <span>{categoryLabel}</span>
          </span>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.72rem',
            color: 'var(--erp-text-muted, #64748b)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '55%',
          }}>
            <MapPin size={11} color="var(--erp-accent)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {property.location || (isAr ? 'موقع متميز' : 'Prime Location')}
            </span>
          </div>
        </div>

        {/* Multi-Line Title (Unclipped, Up to 2 Lines) */}
        <h3 style={{
          margin: 0,
          fontSize: '0.88rem',
          fontWeight: 700,
          color: 'var(--erp-text-title)',
          lineHeight: 1.4,
          minHeight: '2.8rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }} title={isAr ? property.title_ar : property.title_en}>
          {isAr ? property.title_ar : property.title_en}
        </h3>

        {/* Completion Progress Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>{isAr ? 'نسبة الإنجاز الإنشائي' : 'Completion Rate'}</span>
            <strong style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{metrics.completionPct}%</strong>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: '#e2e8f0',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}>
            <div 
              style={{
                width: `${metrics.completionPct}%`,
                height: '100%',
                background: metrics.completionPct === 100 ? '#10b981' : 'var(--erp-accent)',
                borderRadius: '9999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* ─── 3. SPACIOUS 3-METRIC STRIP ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.4rem',
          padding: '0.6rem 0.65rem',
          background: '#f8fafc',
          border: '1px solid #f1f5f9',
          borderRadius: '8px',
        }}>
          {/* Metric 1: Building total and unit area range */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{isAr ? 'المساحات' : 'Areas'}</span>
            <strong style={{ fontSize: '0.76rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              <bdi dir="ltr">{`${formatArea(property.area_sqm || 0)} ${areaUnit}`}</bdi>
              {hasUnitAreas ? <> · {isAr ? 'الوحدات' : 'Units'} <bdi dir="ltr">{unitAreaLabel} {areaUnit}</bdi></> : null}
            </strong>
          </div>

          {/* Metric 2: Available vs Total Units */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', borderInlineStart: '1px solid #e2e8f0', paddingInlineStart: '0.45rem' }}>
            <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{isAr ? 'الوحدات المتاحة' : 'Available'}</span>
            <strong style={{ fontSize: '0.76rem', color: metrics.availableUnitsCount > 0 ? '#10b981' : '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              {metrics.availableUnitsCount} {isAr ? 'من' : 'of'} {metrics.totalUnitsCount}
            </strong>
          </div>

          {/* Metric 3: Price */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', borderInlineStart: '1px solid #e2e8f0', paddingInlineStart: '0.45rem' }}>
            <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{isAr ? 'السعر' : 'Price'}</span>
            <strong 
              style={{ fontSize: '0.76rem', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}
              title={formatEgp(displayedPrice)}
            >
              {formatCompactEgp(displayedPrice)}
            </strong>
          </div>
        </div>

        {/* ─── 4. STANDARDIZED ACTION BUTTONS ─── */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: isBuilding && onViewUnits ? '1.35fr 1fr auto' : (!metrics.isContracted && onOpenContract ? '1.35fr 1fr auto' : '1.35fr auto'),
            gap: '0.45rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #f1f5f9',
            marginTop: 'auto',
            alignItems: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action 1: View Units Details (if building) */}
          {isBuilding && onViewUnits && (
            <button
              type="button"
              onClick={onViewUnits}
              className={shellStyles.btnPrimary}
              title={isAr ? 'عرض مصفوفة شقق وعمارات هذا المشروع' : 'View Units Matrix'}
            >
              <Layers size={13} />
              <span>{isAr ? `الوحدات (${metrics.totalUnitsCount})` : `Units (${metrics.totalUnitsCount})`}</span>
            </button>
          )}

          {/* Action 2: New Sale Contract (if standalone property) */}
          {!isBuilding && !metrics.isContracted && onOpenContract && (
            <button
              type="button"
              onClick={onOpenContract}
              className={shellStyles.btnPrimary}
              title={isAr ? 'تحرير عقد بيع جديد' : 'New Contract'}
            >
              <Plus size={13} />
              <span>{isAr ? 'عقد بيع جديد' : 'Contract'}</span>
            </button>
          )}

          {/* Action 3: Lifecycle Analysis */}
          {onOpenLifecycle && (
            <button
              type="button"
              onClick={onOpenLifecycle}
              className={shellStyles.btnSecondary}
              style={{ whiteSpace: 'nowrap' }}
              title={isAr ? 'تحليل دورة الحياة والجدوى للمشروع' : 'Lifecycle Analysis'}
            >
              <LineChart size={13} />
              <span>{isAr ? 'دورة الحياة ↗' : 'Lifecycle ↗'}</span>
            </button>
          )}

          {/* Action 4: Feasibility Calculator */}
          {onOpenCalculator && (
            <button
              type="button"
              onClick={onOpenCalculator}
              className={shellStyles.btnSecondary}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.48rem 0.55rem',
                cursor: 'pointer',
              }}
              title={isAr ? 'حاسبة الجدوى والتسعير' : 'Feasibility Calculator'}
            >
              <Calculator size={13} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProjectShowcaseCard;
