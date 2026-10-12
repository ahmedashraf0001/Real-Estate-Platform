'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building, Plus, Trash2, X, MousePointerClick, Zap, Droplets, Wind, DoorOpen, Paintbrush, Hammer, Wrench } from 'lucide-react';
import MediaManager from './media/MediaManager';
import {
  ZoneInstance,
  ZoneSpatialLayout,
  TradeTemplate,
  ZONE_TEMPLATES,
  TRADE_TEMPLATES,
  getTradesForZone,
  getAttributesForTrade,
  getZoneBadge,
  updateTradeStatus,
  updateAttributeValue,
  removeAttributeFromTrade,
  addTradeToZone,
  removeTradeFromZone,
  removeZone,
} from '@/lib/layering';
import { CEILING_TYPES, fallbackMetricFor, formatCeiling, parseCeiling, serializeCeiling } from '@/lib/layering/zoneMetrics';
import { changeZoneType, ROOM_TEMPLATES, SHARED_SPACE_TEMPLATES, renameZone } from '@/lib/layering/blueprintEditor';

import { blueprintLabel, zoneLabel } from '@/lib/layering/labels';
import { buildingFloorKey, floorLabel, patchBlueprintZone, resolveBlueprintUnit } from '@/lib/layering/buildingBlueprint';
import { BLUEPRINT_ICONS } from '@/lib/layering/blueprintIcons';
import type { BuildingUnitItem } from '@/lib/supabase/types';

interface ZoneInspectorProps {
  buildingUnits?: BuildingUnitItem[];
  zoneInstances: ZoneInstance[];
  onZoneInstancesChange: (updated: ZoneInstance[]) => void;
  selectedZoneId: string | null;
  /** Declared property area (m²) to prevent total room areas from exceeding the apartment size */
  declaredArea?: number;
  /** Figma-style flyout mode: hidden when nothing is selected, closable, offset beside the rooms rail. */
  nested?: boolean;
  docked?: boolean;
  onCopy?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClose?: () => void;
  isAr?: boolean;
}

function findZone(zones: ZoneInstance[], id: string): ZoneInstance | null {
  for (const z of zones) {
    if (z.id === id) return z;
    if (z.children) {
      const hit = findZone(z.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

function tradeTemplateFor(trade: { trade_template_id: string; status: string }): TradeTemplate {
  const found = TRADE_TEMPLATES.find(t => t.id === trade.trade_template_id);
  if (found) return found;
  const generic = ['NotStarted', 'InProgress', 'Finished'];
  return {
    id: trade.trade_template_id,
    categories: [],
    label_en: blueprintLabel('trade', trade.trade_template_id, false),
    label_ar: blueprintLabel('trade', trade.trade_template_id, true),
    status_values: generic.includes(trade.status) || !trade.status ? generic : [...generic, trade.status],
  };
}

const TIER_STYLES: Record<string, { en: string; ar: string; color: string }> = {
  fully_finished: { en: 'Fully Finished', ar: 'تشطيب كامل', color: '#4CC38A' },
  semi_finished: { en: 'Semi-Finished', ar: 'نص تشطيب', color: '#E0A63A' },
  red_brick: { en: 'Red Brick', ar: 'طوب أحمر', color: '#E06D5B' },
  mixed: { en: 'Mixed', ar: 'مختلط', color: '#9FB3D9' },
};

export function ZoneInspector({ zoneInstances, onZoneInstancesChange, selectedZoneId, declaredArea, nested = false, docked = false, onCopy, onDelete, onClose, isAr = false, buildingUnits = [] }: ZoneInspectorProps) {
  const [addTradeOpen, setAddTradeOpen] = useState(false);

  const zone = useMemo(
    () => (selectedZoneId ? findZone(zoneInstances, selectedZoneId) : null),
    [zoneInstances, selectedZoneId],
  );

  if (!zone) {
    if (nested) return null;
    return (
      <aside className={`zi-root ${docked ? 'zi-docked' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="zi-empty">
          <MousePointerClick size={28} className="zi-empty-icon" />
          <h4 className="zi-empty-title">{isAr ? 'اختر مساحة لتعديلها' : 'Select a space to edit'}</h4>
          <p className="zi-empty-desc">
            {isAr
              ? 'اختر غرفة من المخطط أو القائمة لعرض أبعادها وتشطيباتها هنا.'
              : 'Select a room on the plan or list to inspect its dimensions and finishes here.'}
          </p>
        </div>
        <InspectorStyles />
      </aside>
    );
  }

  return (
    <aside className={`zi-root ${nested ? 'zi-nested' : ''} ${docked ? 'zi-docked' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
      <ZoneInspectorBody
        key={zone.id}
        zone={zone}
        buildingUnits={buildingUnits}
        zoneInstances={zoneInstances}
        onZoneInstancesChange={onZoneInstancesChange}
        declaredArea={declaredArea}
        isAr={isAr}
        addTradeOpen={addTradeOpen}
        setAddTradeOpen={setAddTradeOpen}
        onClose={nested ? onClose : undefined}
        onCopy={onCopy}
        onDelete={onDelete}
      />
      <InspectorStyles />
    </aside>
  );
}

interface BodyProps {
  buildingUnits: BuildingUnitItem[];
  zone: ZoneInstance;
  zoneInstances: ZoneInstance[];
  onZoneInstancesChange: (updated: ZoneInstance[]) => void;
  declaredArea?: number;
  isAr: boolean;
  addTradeOpen: boolean;
  setAddTradeOpen: (v: boolean) => void;
  onClose?: () => void;
  onCopy?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function ZoneInspectorBody({
  zone, zoneInstances, onZoneInstancesChange, declaredArea, isAr, buildingUnits,
  addTradeOpen, setAddTradeOpen, onClose, onCopy, onDelete,
}: BodyProps) {
  const ElementIcon = BLUEPRINT_ICONS[zone.zone_template_id] ?? Building;
  const unitFacts = resolveBlueprintUnit(zone, buildingUnits);
  const patchZone = (patch: Partial<ZoneInstance>) => onZoneInstancesChange(patchBlueprintZone(zoneInstances, zone.id, patch));
  const floorCount = new Set(zoneInstances.filter(z => z.zone_template_id !== 'bld.building').map(buildingFloorKey)).size;
  const shared = fallbackMetricFor(zone.zone_template_id);
  const widthM = zone.spatial?.width_m ?? shared?.width_m ?? 3;
  const lengthM = zone.spatial?.length_m ?? shared?.length_m ?? 4;
  const sqm = zone.spatial?.sqm ?? shared?.sqm ?? Math.round(widthM * lengthM);
  const ceiling = zone.spatial?.ceiling_height ?? shared?.ceiling ?? '3.0m Flush';
  const badge = getZoneBadge(zone);
  const tier = TIER_STYLES[badge];

  // Calculate sum of areas of all other zones
  const otherZonesTotalSqm = useMemo(() => {
    function sumExcept(list: ZoneInstance[]): number {
      return list.reduce((acc, z) => {
        const selfSqm = z.id === zone.id ? 0 : (z.spatial?.sqm ?? 0);
        const childSqm = z.children ? sumExcept(z.children) : 0;
        return acc + selfSqm + childSqm;
      }, 0);
    }
    return sumExcept(zoneInstances);
  }, [zoneInstances, zone.id]);

  const maxAllowedSqm = (declaredArea && declaredArea > 0)
    ? Math.max(2.25, Math.round((declaredArea - otherZonesTotalSqm) * 10) / 10)
    : Infinity;

  const patchSpatial = (updates: Partial<ZoneSpatialLayout>) => {
    function walk(list: ZoneInstance[]): ZoneInstance[] {
      return list.map(z => {
        if (z.id === zone.id) {
          const current: ZoneSpatialLayout = z.spatial ?? {
            gridX: 0, gridY: 0, gridW: 6, gridH: 4,
            length_m: lengthM, width_m: widthM, sqm, ceiling_height: ceiling,
          };
          const next = { ...current, ...updates };
          if (updates.length_m !== undefined || updates.width_m !== undefined) {
            let l = updates.length_m ?? current.length_m;
            let w = updates.width_m ?? current.width_m;
            let calculatedSqm = Math.round(l * w * 10) / 10;
            if (maxAllowedSqm < Infinity && calculatedSqm > maxAllowedSqm) {
              if (updates.width_m !== undefined && updates.length_m === undefined) {
                w = Math.max(1.0, Math.floor((maxAllowedSqm / l) * 10) / 10);
              } else if (updates.length_m !== undefined && updates.width_m === undefined) {
                l = Math.max(1.0, Math.floor((maxAllowedSqm / w) * 10) / 10);
              } else {
                const scale = Math.sqrt(maxAllowedSqm / calculatedSqm);
                w = Math.max(1.0, Math.floor(w * scale * 10) / 10);
                l = Math.max(1.0, Math.floor(l * scale * 10) / 10);
              }
              calculatedSqm = Math.round(l * w * 10) / 10;
              toast.warning(isAr ? `تم ضبط الأبعاد لعدم تجاوز إجمالي مساحة الشقة (${declaredArea}م²)` : `Adjusted dimensions to fit within total apartment area (${declaredArea}m²)`);
            }
            next.width_m = w;
            next.length_m = l;
            next.sqm = calculatedSqm;
          }
          return { ...z, spatial: next };
        }
        return z.children ? { ...z, children: walk(z.children) } : z;
      });
    }
    onZoneInstancesChange(walk(zoneInstances));
  };

  const commitDim = (field: 'width_m' | 'length_m', raw: string) => {
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) return;
    patchSpatial({ [field]: Math.max(0.1, Math.round(parsed * 10) / 10) });
  };

  const zoneTpl = ZONE_TEMPLATES.find(t => t.id === zone.zone_template_id);
  const elementAttributeIds = new Set(zone.trades.flatMap(t => getAttributesForTrade(t.trade_template_id, zone.zone_template_id)).filter(a =>
    (zone.zone_template_id === 'bld.elevator' && a.id.startsWith('inf.elev.')) ||
    (zone.zone_template_id === 'bld.staircase' && a.id.startsWith('inf.stair.')),
  ).map(a => a.id));
  const existingTradeIds = new Set(zone.trades.map(t => t.trade_template_id));
  const addableTrades = (zoneTpl ? getTradesForZone(zoneTpl) : TRADE_TEMPLATES).filter(t => !existingTradeIds.has(t.id));

  return (
    <>
      <header className="zi-header">
        <span className="zi-header-icon"><ElementIcon size={15} /></span>
        <div className="zi-header-text">
          <h4 className="zi-title">{zoneLabel(zone, isAr)}</h4>
          <div className="zi-meta">
            <bdi>{sqm} {isAr ? 'م²' : 'm²'}</bdi>
            {zone.level_label && <span className="zi-level">{floorLabel(buildingFloorKey(zone), isAr)}</span>}
          </div>
        </div>
        {tier && (
          <span className="zi-tier" style={{ color: tier.color, borderColor: tier.color }}>
            {isAr ? tier.ar : tier.en}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            className="zi-icon-btn"
            aria-label={isAr ? 'إغلاق' : 'Close'}
            onClick={onClose}
          >
            <X size={13} />
          </button>
        )}
      </header>

      <section className="zi-section">
        <label className="zi-ceiling"><span>{isAr ? 'الاسم' : 'Name'}</span><input data-inspector-name aria-label={isAr ? 'الاسم' : 'Name'} type="text" key={zoneLabel(zone, isAr)} defaultValue={zone.zone_template_id === 'bld.unit' ? zone.unit?.unit_code ?? zone.instance_label ?? '' : zoneLabel(zone, isAr)} onBlur={e => onZoneInstancesChange(renameZone(zoneInstances, zone.id, e.target.value))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} /></label>
        <label className="zi-ceiling"><span>{isAr ? 'النوع' : 'Type'}</span><select aria-label={isAr ? 'النوع' : 'Type'} value={zone.zone_template_id} disabled={zone.zone_template_id === 'bld.unit'} onChange={e => onZoneInstancesChange(changeZoneType(zoneInstances, zone.id, e.target.value))}>
          {![...ROOM_TEMPLATES, ...SHARED_SPACE_TEMPLATES].some(t => t.id === zone.zone_template_id) && <option value={zone.zone_template_id}>{blueprintLabel('zone', zone.zone_template_id, isAr)}</option>}
          {(zone.zone_template_id.startsWith('apt.') || zoneInstances.some(parent => parent.zone_template_id === 'bld.unit' && findZone(parent.children ?? [], zone.id)) ? ROOM_TEMPLATES : SHARED_SPACE_TEMPLATES).map(t => <option key={t.id} value={t.id}>{isAr ? t.label_ar : t.label_en}</option>)}
        </select></label>
        {(onCopy || onDelete) && <div className="zi-editor-actions">
          {onCopy && <button type="button" onClick={() => onCopy(zone.id)}>{isAr ? 'نسخ' : 'Copy'}</button>}
          {onDelete && <button type="button" disabled={unitFacts.status === 'sold' || unitFacts.status === 'reserved'} title={unitFacts.status === 'sold' || unitFacts.status === 'reserved' ? (isAr ? 'الشقة محجوزة أو مباعة ولا يمكن حذفها' : 'Reserved or sold units cannot be deleted') : undefined} onClick={() => onDelete(zone.id)}>{isAr ? 'حذف' : 'Delete'}</button>}
        </div>}
      </section>

      {onClose && (
        <button
          type="button"
          className="zi-delete-zone"
          onClick={() => {
            const ok = window.confirm(isAr
              ? `حذف "${zoneLabel(zone, isAr)}" نهائياً من المخطط؟`
              : `Delete "${zoneLabel(zone, isAr)}" from the floor plan?`);
            if (!ok) return;
            onZoneInstancesChange(removeZone(zoneInstances, zone.id));
            onClose();
          }}
        >
          <Trash2 size={12} />
          <span>{isAr ? 'حذف الغرفة' : 'Delete room'}</span>
        </button>
      )}

      {zone.zone_template_id === 'bld.unit' && <section className="zi-section">
        <span className="zi-section-label">{isAr ? 'بيانات الشقة' : 'Unit facts'}</span>
        {(['area_sqm', 'bedrooms', 'bathrooms'] as const).map((field, i) => <label className="zi-ceiling" key={field}>
          <span>{(isAr ? ['المساحة (م²)', 'غرف النوم', 'الحمامات'] : ['Area (m²)', 'Bedrooms', 'Bathrooms'])[i]}</span>
          <input type="number" min="0" step={field === 'area_sqm' ? '0.1' : '1'} value={zone.unit?.[field] ?? unitFacts[field] ?? ''} onChange={e => { const n = e.target.valueAsNumber; if (e.target.value === '' || (Number.isFinite(n) && n >= 0 && (field === 'area_sqm' || Number.isInteger(n)))) patchZone({ unit: { ...zone.unit, [field]: e.target.value === '' ? undefined : n } }); }} />
        </label>)}
        <label className="zi-ceiling"><span>{isAr ? 'الدور' : 'Floor'}</span><input type="number" min="-1" step="1" value={zone.floor_number ?? unitFacts.floor_number ?? ''} onChange={e => {
          const n = e.target.valueAsNumber; if (!Number.isInteger(n) || n < -1) return;
          const level_label = n === 0 ? 'bld_ground' : n === -1 ? 'bld_basement' : `Floor ${n}`;
          const move = (list: ZoneInstance[]): ZoneInstance[] => list.map(z => ({ ...z, floor_number: n, level_label, ...(z.children ? { children: move(z.children) } : {}) }));
          patchZone({ floor_number: n, level_label, children: zone.children ? move(zone.children) : undefined });
        }} /></label>
        <label className="zi-ceiling"><span>{isAr ? 'التشطيب' : 'Finishing'}</span><select value={zone.unit?.finishing_state ?? unitFacts.finishing_state ?? ''} onChange={e => patchZone({ unit: { ...zone.unit, finishing_state: (e.target.value || undefined) as 'red_brick' | 'semi_finished' | 'fully_finished' | undefined } })}>
          <option value="">{isAr ? 'غير محدد' : 'Unspecified'}</option>{(['red_brick', 'semi_finished', 'fully_finished'] as const).map(value => <option key={value} value={value}>{blueprintLabel('status', value, isAr)}</option>)}
        </select></label>
        {(['orientation', 'view'] as const).map((field, i) => <label className="zi-ceiling" key={field}><span>{(isAr ? ['الاتجاه', 'الإطلالة'] : ['Orientation', 'View'])[i]}</span><input type="text" value={zone.unit?.[field] ?? ''} onChange={e => patchZone({ unit: { ...zone.unit, [field]: e.target.value || undefined } })} /></label>)}
        <p>{isAr ? 'حالة البيع من سجل وحدات المبنى' : 'Sale status from building inventory'}: {blueprintLabel('status', unitFacts.status ?? '', isAr)}</p>
      </section>}
      {['bld.service', 'bld.guard_room', 'bld.electric_box', 'bld.water_motors', 'bld.roof_service'].includes(zone.zone_template_id) && <section className="zi-section"><label className="zi-ceiling"><span>{isAr ? 'الغرض من الغرفة' : 'Room purpose'}</span><input type="text" value={zone.service_purpose ?? ''} onChange={e => patchZone({ service_purpose: e.target.value || undefined })} /></label></section>}
      {zone.trades.filter(t => getAttributesForTrade(t.trade_template_id, zone.zone_template_id).some(a => elementAttributeIds.has(a.id))).map(trade => <section className="zi-section" key={`facts-${trade.id}`}>
        <span className="zi-section-label">{blueprintLabel('trade', trade.trade_template_id, isAr)}</span>
        {getAttributesForTrade(trade.trade_template_id, zone.zone_template_id).filter(a => elementAttributeIds.has(a.id)).map(attr => {
          const value = trade.attributes.find(a => a.attribute_template_id === attr.id)?.value;
          const defaultStops = attr.id === 'inf.elev.stops' ? floorCount : undefined;
          return <label className="zi-ceiling" key={attr.id}><span>{blueprintLabel('attribute', attr.id, isAr)}</span><input type={attr.data_type === 'integer' || attr.data_type === 'numeric' ? 'number' : 'text'} min="0" step={attr.data_type === 'integer' ? '1' : '0.1'} value={value === null || value === undefined ? '' : String(value)} placeholder={defaultStops === undefined ? undefined : String(defaultStops)} onChange={e => {
            const numeric = attr.data_type === 'integer' || attr.data_type === 'numeric';
            const next = e.target.value === '' ? null : numeric ? e.target.valueAsNumber : e.target.value;
            if (typeof next === 'number' && (!Number.isFinite(next) || next < 0 || (attr.data_type === 'integer' && !Number.isInteger(next)))) return;
            onZoneInstancesChange(updateAttributeValue(zoneInstances, zone.id, trade.id, attr.id, next));
          }} />{defaultStops !== undefined && value == null && <small>{isAr ? `الافتراضي حسب الأدوار: ${defaultStops}` : `Default from floors: ${defaultStops}`}</small>}</label>;
        })}
      </section>)}
      <section className="zi-section">
        <span className="zi-section-label">{isAr ? 'الأبعاد' : 'DIMENSIONS'}</span>
        <div className="zi-dims">
          <label className="zi-dim">
            <span>{isAr ? 'العرض' : 'W'}</span>
            <span className="zi-dim-field" dir="ltr">
              <input
                key={`w-${widthM}`}
                type="text"
                inputMode="decimal"
                defaultValue={widthM}
                onBlur={e => commitDim('width_m', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitDim('width_m', (e.target as HTMLInputElement).value); }}
              />
              <em>{isAr ? 'م' : 'm'}</em>
            </span>
          </label>
          <label className="zi-dim">
            <span>{isAr ? 'الطول' : 'L'}</span>
            <span className="zi-dim-field" dir="ltr">
              <input
                key={`l-${lengthM}`}
                type="text"
                inputMode="decimal"
                defaultValue={lengthM}
                onBlur={e => commitDim('length_m', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitDim('length_m', (e.target as HTMLInputElement).value); }}
              />
              <em>{isAr ? 'م' : 'm'}</em>
            </span>
          </label>
        </div>
        <label className="zi-ceiling">
          <span>{isAr ? 'الارتفاع' : 'Ceiling'}</span>
          <select aria-label={isAr ? 'الارتفاع' : 'Ceiling'} value={ceiling} onChange={e => patchSpatial({ ceiling_height: e.target.value })}>
            <option value={ceiling}>{formatCeiling(parseCeiling(ceiling), isAr)}</option>
            {[...new Set([
              ...[2.8, 3, 3.2, 3.4, 3.6, 3.8, 4.4].map(height_m => serializeCeiling({ height_m, type: 'flush' })),
              ...Object.keys(CEILING_TYPES).map(type => serializeCeiling({ height_m: type.startsWith('open') ? null : parseCeiling(ceiling).height_m ?? 3, type: type as keyof typeof CEILING_TYPES })),
            ])].filter(value => value !== ceiling).map(value => <option key={value} value={value}>{formatCeiling(parseCeiling(value), isAr)}</option>)}
          </select>
        </label>
        <label className="zi-ceiling"><span>{isAr ? 'ارتفاع مخصص (م)' : 'Custom height (m)'}</span>
          <input type="number" min="0.1" step="0.1" key={ceiling} defaultValue={parseCeiling(ceiling).height_m ?? ''} onBlur={e => {
            const height_m = e.target.valueAsNumber;
            if (Number.isFinite(height_m) && height_m > 0 && height_m !== parseCeiling(ceiling).height_m) patchSpatial({ ceiling_height: serializeCeiling({ height_m, type: parseCeiling(ceiling).type === 'unknown' ? 'flush' : parseCeiling(ceiling).type }) });
          }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
        </label>
      </section>

      <section className="zi-section">
        <div className="zi-section-head">
          <span className="zi-section-label">{isAr ? 'أنظمة التشطيب' : 'FINISHING SYSTEMS'}</span>
          <span className="zi-count">{zone.trades.length}</span>
        </div>

        {zone.trades.map(trade => {
          const tpl = tradeTemplateFor(trade);
          const attrs = getAttributesForTrade(trade.trade_template_id, zone.zone_template_id);
          const isElectrical = trade.trade_template_id.includes('elec');
          const isPlumbing = trade.trade_template_id.includes('plumb');
          const isHVAC = trade.trade_template_id.includes('hvac');
          const isCarpentry = trade.trade_template_id.includes('carpentry') || trade.trade_template_id.includes('door') || trade.trade_template_id.includes('window');
          const isPainting = trade.trade_template_id.includes('paint') || trade.trade_template_id.includes('plaster');
          const isFlooring = trade.trade_template_id.includes('floor') || trade.trade_template_id.includes('tile');

          return (
            <div key={trade.id} className="zi-trade">
              <div className="zi-trade-head">
                <div className="zi-trade-title-wrap">
                  <span className="zi-trade-icon-box" aria-hidden="true">
                    {isElectrical && <Zap size={13} />}
                    {isPlumbing && <Droplets size={13} />}
                    {isHVAC && <Wind size={13} />}
                    {isCarpentry && <DoorOpen size={13} />}
                    {isPainting && <Paintbrush size={13} />}
                    {isFlooring && <Hammer size={13} />}
                    {!isElectrical && !isPlumbing && !isHVAC && !isCarpentry && !isPainting && !isFlooring && <Wrench size={13} />}
                  </span>
                  <span className="zi-trade-name">{blueprintLabel('trade', tpl.id, isAr)}</span>
                </div>
                <button
                  type="button"
                  className="zi-icon-btn danger"
                  aria-label={isAr ? 'حذف القسم' : 'Remove trade'}
                  title={isAr ? 'حذف البند' : 'Remove trade'}
                  onClick={() => onZoneInstancesChange(removeTradeFromZone(zoneInstances, zone.id, trade.id))}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Luxury Segmented Pill Track for Trade Statuses */}
              <div className="zi-status-segmented-track" role="group">
                {tpl.status_values.map(sv => {
                  const isActive = trade.status === sv;
                  return (
                    <button
                      key={sv}
                      type="button"
                      className={`zi-status-seg-btn ${isActive ? 'active' : ''}`}
                      onClick={() => onZoneInstancesChange(updateTradeStatus(zoneInstances, zone.id, trade.id, sv))}
                    >
                      {blueprintLabel('status', sv, isAr)}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic & Custom Trade Specifications */}
              <div className="zi-attrs">
                {trade.attributes.filter(attr => !elementAttributeIds.has(attr.attribute_template_id)).map(attr => {
                  const tplAttr = attrs.find(a => a.id === attr.attribute_template_id);
                  const label = tplAttr ? blueprintLabel('attribute', tplAttr.id, isAr) : attr.custom_label || blueprintLabel('attribute', attr.attribute_template_id, isAr);
                  const val = attr.value === null ? '' : String(attr.value);

                  return (
                    <div key={attr.attribute_template_id} className="zi-attr-row">
                      <span className="zi-attr-label" title={label}>{label}</span>
                      <div className="zi-attr-input-group">
                        <input
                          type="text"
                          className="zi-attr-val-input"
                          dir="auto"
                          placeholder={isAr ? 'اكتب المواصفة...' : 'Enter spec...'}
                          key={val}
                          defaultValue={val}
                          onBlur={e => {
                            const next = e.target.value.trim();
                            onZoneInstancesChange(updateAttributeValue(zoneInstances, zone.id, trade.id, attr.attribute_template_id, next || null, attr.custom_label));
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="zi-attr-del-btn"
                          aria-label={isAr ? 'حذف هذا التفصيل' : 'Delete this detail'}
                          title={isAr ? 'حذف' : 'Delete'}
                          onClick={() => onZoneInstancesChange(removeAttributeFromTrade(zoneInstances, zone.id, trade.id, attr.attribute_template_id))}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Custom Detail Row */}
                <div className="zi-add-attr-row">
                  <span className="zi-add-attr-icon">+</span>
                  <input
                    type="text"
                    className="zi-add-attr-input"
                    dir="auto"
                    placeholder={isAr ? 'إضافة تفصيل مخصص (مثال: ماركة الأسلاك، القواطع...)' : 'Add custom spec (e.g. Wiring Brand, Breaker...)'}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        const customName = input.value.trim();
                        if (customName) {
                          const newAttrId = `custom-attr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                          onZoneInstancesChange(updateAttributeValue(zoneInstances, zone.id, trade.id, newAttrId, '', customName));
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>

                {/* Quick Add Suggestions Chips */}
                {attrs.filter(tplAttr => !elementAttributeIds.has(tplAttr.id) && !trade.attributes.some(a => a.attribute_template_id === tplAttr.id)).length > 0 && (
                  <div className="zi-attr-chips">
                    <span className="zi-attr-chips-label">{isAr ? 'اقتراحات:' : 'Suggestions:'}</span>
                    {attrs.filter(a => !elementAttributeIds.has(a.id))
                      .filter(tplAttr => !trade.attributes.some(a => a.attribute_template_id === tplAttr.id))
                      .map(tplAttr => (
                        <button
                          key={tplAttr.id}
                          type="button"
                          className="zi-attr-chip"
                          onClick={() => {
                            const label = blueprintLabel('attribute', tplAttr.id, isAr);
                            onZoneInstancesChange(updateAttributeValue(zoneInstances, zone.id, trade.id, tplAttr.id, '', label));
                          }}
                        >
                          <span>+</span>
                          <span>{blueprintLabel('attribute', tplAttr.id, isAr)}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {addableTrades.length > 0 && (
          <div className="zi-add-trade">
            {addTradeOpen ? (
              <select
                autoFocus
                defaultValue=""
                onChange={e => {
                  if (e.target.value) {
                    onZoneInstancesChange(addTradeToZone(zoneInstances, zone.id, e.target.value, 'semi_finished'));
                  }
                  setAddTradeOpen(false);
                }}
                onBlur={() => setAddTradeOpen(false)}
              >
                <option value="" disabled>{isAr ? 'اختر نظاماً...' : 'Pick a system...'}</option>
                {addableTrades.map(t => (
                  <option key={t.id} value={t.id}>{blueprintLabel('trade', t.id, isAr)}</option>
                ))}
              </select>
            ) : (
              <button type="button" className="zi-add-btn" onClick={() => setAddTradeOpen(true)}>
                <Plus size={12} />
                <span>{isAr ? 'إضافة نظام تشطيب' : 'Add finishing system'}</span>
              </button>
            )}
          </div>
        )}
      </section>

      <section className="zi-section">
        <MediaManager contextLabel={zoneLabel(zone, isAr)} videos={zone.videos ?? []} photos={zone.images ?? []}
          storagePathPrefix={`zone-photos/${zone.id}-`} isAr={isAr}
          onChange={media => patchZone({ videos: media.videos, images: media.photos })} />
      </section>
    </>
  );
}

function InspectorStyles() {
  return (
    <style>{`
      .zi-root {
        position: fixed;
        top: 0;
        bottom: 72px;
        inset-inline-end: 0;
        width: 320px;
        height: calc(100dvh - 72px);
        z-index: 60;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 16px 14px 24px;
        background: var(--admin-card-bg, #ffffff);
        border-inline-start: 1px solid var(--admin-card-border, #cbd5e1);
        border-bottom: 1px solid var(--admin-card-border, #cbd5e1);
        box-shadow: -12px 0 32px var(--admin-card-shadow, rgba(0,0,0,0.06));
        font-family: inherit;
        color: var(--admin-text-body, #334155);
      }

      [dir="rtl"].zi-root {
        box-shadow: 12px 0 32px var(--admin-card-shadow, rgba(0,0,0,0.06));
      }

      .zi-root.zi-docked { position: static; width: 100%; height: auto; max-height: none; padding: 16px; border: 0; box-shadow: none; margin: 0; }
      .zi-docked input, .zi-docked button { min-height: 44px; }
      .zi-docked .zi-icon-btn, .zi-docked .zi-attr-del-btn { min-width: 44px; min-height: 44px; }
      .zi-docked .zi-dim-field input { min-height: 32px; }
      .zi-docked .zi-status-segmented-track { flex-wrap: wrap; }
      .zi-docked .zi-status-seg-btn { min-width: 64px; flex: 1 1 90px; white-space: normal; line-height: 1.5; font-size: 0.75rem; }
      .zi-docked .zi-attr-row { flex-wrap: wrap; }
      .zi-docked .zi-attr-label { max-width: 100%; white-space: normal; }
      .zi-docked .zi-tier { color: var(--admin-text-body) !important; border-color: var(--admin-card-border) !important; }
      .zi-editor-actions { display: flex; gap: 8px; }
      .zi-docked button:focus-visible, .zi-docked input:focus-visible, .zi-docked select:focus-visible { outline: 2px solid var(--admin-accent); outline-offset: 2px; }

      .zi-root.zi-nested {
        inset-inline-end: 300px;
        z-index: 59;
        border-inline-end: 1px solid var(--admin-card-border, #cbd5e1);
        animation: ziSlideIn 0.18s cubic-bezier(0.2,0,0,1);
      }

      @keyframes ziSlideIn {
        from { opacity: 0; transform: translateX(8px); }
        to { opacity: 1; transform: translateX(0); }
      }

      [dir="rtl"].zi-root.zi-nested {
        animation-name: ziSlideInRtl;
      }

      @keyframes ziSlideInRtl {
        from { opacity: 0; transform: translateX(-8px); }
        to { opacity: 1; transform: translateX(0); }
      }

      .zi-delete-zone {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 0.66rem;
        font-weight: 800;
        cursor: pointer;
        background: var(--admin-danger-bg, rgba(220, 38, 38, 0.08));
        border: 1px solid var(--admin-danger-border, rgba(220, 38, 38, 0.25));
        color: var(--admin-danger-text, #dc2626);
        transition: background-color 0.15s;
      }

      .zi-delete-zone:hover { background: var(--admin-danger-bg, rgba(220, 38, 38, 0.16)); }

      @media (max-width: 1023px) {
        .zi-root {
          position: static;
          width: auto;
          height: auto;
          max-height: none;
          border-radius: 14px;
          border: 1px solid var(--admin-card-border, #cbd5e1);
          box-shadow: none;
          margin-top: 16px;
        }
      }

      .zi-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 6px;
        padding: 3rem 0.5rem;
      }
      .zi-empty-icon { color: var(--admin-accent-border, rgba(37, 99, 235, 0.35)); margin-bottom: 4px; }
      .zi-empty-title { margin: 0; font-size: 0.875rem; font-weight: 700; color: var(--admin-text-title, #0f172a); }
      .zi-empty-desc { margin: 0; font-size: 0.72rem; line-height: 1.5; color: var(--admin-text-muted, #64748b); }

      .zi-header { display: flex; align-items: flex-start; gap: 8px; }
      .zi-header-icon {
        flex-shrink: 0;
        display: inline-flex;
        padding: 6px;
        border-radius: 8px;
        color: var(--admin-accent, #2563eb);
        background: var(--admin-accent-subtle, #eff6ff);
      }
      .zi-header-text { flex: 1; min-width: 0; }
      .zi-title { margin: 0; font-size: 0.85rem; font-weight: 800; line-height: 1.25; overflow-wrap: break-word; color: var(--admin-text-title, #0f172a); }
      .zi-meta {
        display: flex; align-items: center; gap: 6px; margin-top: 3px;
        font-family: monospace; font-variant-numeric: tabular-nums;
        font-size: 0.68rem; font-weight: 700; color: var(--admin-text-muted, #64748b);
      }
      .zi-level {
        font-family: inherit;
        padding: 1px 7px; border-radius: 999px;
        background: var(--admin-accent-subtle, #eff6ff); color: var(--admin-accent, #2563eb);
      }
      .zi-tier {
        flex-shrink: 0; font-size: 0.6rem; font-weight: 800;
        padding: 2px 8px; border-radius: 999px; border: 1px solid;
        white-space: nowrap;
      }

      .zi-section {
        display: flex; flex-direction: column; gap: 8px;
        padding-top: 12px; border-top: 1px solid var(--admin-divider, #e2e8f0);
      }
      .zi-section-head { display: flex; align-items: center; justify-content: space-between; }
      .zi-section-label {
        font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em;
        color: var(--admin-text-muted, #64748b);
      }
      .zi-count {
        font-family: monospace; font-size: 0.62rem; font-weight: 800;
        padding: 1px 7px; border-radius: 999px;
        background: var(--admin-accent-subtle, #eff6ff); color: var(--admin-accent, #2563eb);
      }

      .zi-dims { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .zi-dim { display: flex; flex-direction: column; gap: 3px; }
      .zi-dim > span, .zi-ceiling > span {
        font-size: 0.62rem; font-weight: 700; color: var(--admin-text-muted, #64748b);
      }
      .zi-dim-field {
        display: flex; align-items: baseline; gap: 3px;
        padding: 5px 8px; border-radius: 8px;
        background: var(--admin-input-bg, #ffffff);
        border: 1px solid var(--admin-input-border, #cbd5e1);
      }
      .zi-dim-field input {
        width: 100%; min-width: 0; background: transparent; border: none; outline: none;
        color: var(--admin-text-title, #0f172a); font-family: monospace; font-size: 0.78rem; font-weight: 700;
      }
      .zi-dim-field em { font-style: normal; font-family: monospace; font-size: 0.62rem; color: var(--admin-text-dim, #94a3b8); }
      .zi-dim-field:focus-within { border-color: var(--admin-accent, #2563eb); }

      .zi-ceiling { display: flex; flex-direction: column; gap: 3px; }
      .zi-ceiling select, .zi-ceiling input, .zi-add-trade select, .zi-attr select {
        min-height: 44px;
        padding: 6px 8px; border-radius: 8px;
        background: var(--admin-input-bg, #ffffff); border: 1px solid var(--admin-input-border, #cbd5e1);
        color: var(--admin-text-title, #0f172a); font-family: inherit; font-size: 0.72rem; font-weight: 600;
        outline: none; cursor: pointer; max-width: 100%;
      }
      .zi-ceiling select:focus, .zi-ceiling input:focus, .zi-attr select:focus { border-color: var(--admin-accent, #2563eb); }

      /* ── Modern Finishing System Trade Card ── */
      .zi-trade {
        display: flex; flex-direction: column; gap: 8px;
        padding: 12px; border-radius: 12px;
        background: var(--admin-card-bg-subtle, #f8fafc);
        border: 1px solid var(--admin-card-border, #cbd5e1);
        transition: all 0.2s ease;
      }
      .zi-trade:hover {
        border-color: var(--admin-accent-border, rgba(37, 99, 235, 0.25));
        background: var(--admin-card-bg, #ffffff);
      }

      .zi-trade-head {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
      }
      .zi-trade-title-wrap {
        display: inline-flex; align-items: center; gap: 6px;
      }
      .zi-trade-icon-box {
        display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; border-radius: 6px;
        background: var(--admin-accent-subtle, #eff6ff);
        color: var(--admin-accent, #2563eb);
      }
      .zi-trade-name {
        font-size: 0.8rem; font-weight: 800; color: var(--admin-text-title, #0f172a);
      }

      .zi-icon-btn {
        flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; border-radius: 6px;
        background: transparent; border: 1px solid var(--admin-card-border, #cbd5e1);
        color: var(--admin-text-muted, #64748b); cursor: pointer;
        transition: all 0.15s ease;
      }
      .zi-icon-btn:hover {
        color: var(--admin-text-title, #0f172a); border-color: var(--admin-accent-border);
      }
      .zi-icon-btn.danger:hover {
        color: var(--admin-danger-text, #dc2626); border-color: var(--admin-danger-border, rgba(220, 38, 38, 0.25));
        background: var(--admin-danger-bg, rgba(220, 38, 38, 0.08));
      }

      /* ── Luxury Segmented Status Track ── */
      .zi-status-segmented-track {
        display: flex;
        background: var(--admin-track-bg, #e2e8f0);
        border: 1px solid var(--admin-card-border, #cbd5e1);
        border-radius: 8px;
        padding: 2px;
        gap: 2px;
      }
      .zi-status-seg-btn {
        flex: 1;
        padding: 5px 6px;
        border-radius: 6px;
        font-size: 0.65rem;
        font-weight: 700;
        cursor: pointer;
        background: transparent;
        border: none;
        color: var(--admin-text-muted, #64748b);
        transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
        text-align: center;
        white-space: nowrap;
      }
      .zi-status-seg-btn:hover {
        color: var(--admin-text-title, #0f172a);
        background: var(--admin-card-bg, #ffffff);
      }
      .zi-status-seg-btn.active {
        background: var(--admin-accent, #2563eb);
        color: #ffffff;
        font-weight: 800;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }

      /* ── Trade Attributes & Custom Specifications ── */
      .zi-attrs {
        display: flex; flex-direction: column; gap: 6px;
        padding-top: 8px; border-top: 1px solid var(--admin-divider, #e2e8f0);
      }
      .zi-attr-row {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        background: var(--admin-card-bg, #ffffff);
        padding: 4px 8px; border-radius: 7px;
        border: 1px solid var(--admin-card-border-subtle, #f1f5f9);
      }
      .zi-attr-label {
        font-size: 0.68rem; font-weight: 700; color: var(--admin-text-body, #334155);
        max-width: 48%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .zi-attr-input-group {
        display: flex; align-items: center; gap: 4px; flex: 1; justify-content: flex-end;
      }
      .zi-attr-val-input {
        width: 100%; max-width: 130px; padding: 4px 8px; border-radius: 6px;
        background: var(--admin-input-bg, #ffffff); border: 1px solid var(--admin-input-border, #cbd5e1);
        color: var(--admin-accent, #2563eb); font-size: 0.68rem; font-weight: 600; outline: none;
        transition: border-color 0.15s ease;
      }
      .zi-attr-val-input:focus { border-color: var(--admin-accent, #2563eb); box-shadow: 0 0 0 2px var(--admin-accent-tint, rgba(37, 99, 235, 0.08)); }
      .zi-attr-del-btn {
        width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center;
        border-radius: 5px; background: transparent; border: none;
        color: var(--admin-text-dim, #94a3b8); cursor: pointer; transition: all 0.15s ease;
        flex-shrink: 0;
      }
      .zi-attr-del-btn:hover { color: var(--admin-danger-text, #dc2626); background: var(--admin-danger-bg, rgba(220, 38, 38, 0.08)); }

      .zi-add-attr-row {
        display: flex; align-items: center; gap: 6px;
        margin-top: 2px;
        background: var(--admin-dropzone-bg, #f8fafc);
        border: 1px dashed var(--admin-dropzone-border, #cbd5e1);
        border-radius: 7px;
        padding: 2px 8px;
        transition: all 0.15s ease;
      }
      .zi-add-attr-row:focus-within {
        border-color: var(--admin-accent, #2563eb);
        background: var(--admin-accent-tint, rgba(37, 99, 235, 0.08));
      }
      .zi-add-attr-icon {
        font-size: 0.8rem; font-weight: 800; color: var(--admin-accent, #2563eb);
      }
      .zi-add-attr-input {
        flex: 1; padding: 4px 0; background: transparent; border: none;
        color: var(--admin-text-title, #0f172a); font-size: 0.68rem; outline: none;
      }
      .zi-add-attr-input::placeholder {
        color: var(--admin-text-dim, #94a3b8);
      }

      .zi-attr-chips {
        display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 4px;
      }
      .zi-attr-chips-label {
        font-size: 0.6rem; font-weight: 700; color: var(--admin-text-muted, #64748b);
      }
      .zi-attr-chip {
        display: inline-flex; align-items: center; gap: 3px;
        padding: 2px 8px; border-radius: 999px;
        background: var(--admin-accent-tint, rgba(37, 99, 235, 0.08)); border: 1px solid var(--admin-accent-border, rgba(37, 99, 235, 0.25));
        color: var(--admin-accent, #2563eb); font-size: 0.62rem; font-weight: 700; cursor: pointer;
        transition: all 0.15s ease;
      }
      .zi-attr-chip:hover {
        background: var(--admin-accent-subtle, #eff6ff); border-color: var(--admin-accent, #2563eb);
      }

      .zi-add-trade select { width: 100%; }
      .zi-add-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        width: 100%; min-height: 32px; padding: 6px 10px; border-radius: 8px;
        font-size: 0.66rem; font-weight: 800; cursor: pointer;
        background: var(--admin-accent-tint, rgba(37, 99, 235, 0.08));
        border: 1px dashed var(--admin-accent-border, rgba(37, 99, 235, 0.25)); color: var(--admin-accent, #2563eb);
        transition: background-color 0.15s;
      }
      .zi-add-btn:hover:not(:disabled) { background: var(--admin-accent-subtle, #eff6ff); }
      .zi-add-btn:disabled { opacity: 0.6; cursor: default; }



    `}</style>
  );
}

export default ZoneInspector;
