'use client';

import React from 'react';
import { Building2, ChevronLeft, DoorOpen } from 'lucide-react';
import type { ZoneInstance } from '@/lib/layering/instances';
import type { BuildingUnitItem } from '@/lib/supabase/types';
import { BLUEPRINT_ICONS } from '@/lib/layering/blueprintIcons';
import { blueprintLabel, zoneLabel } from '@/lib/layering/labels';
import { buildingFloorKey, floorLabel, resolveBlueprintUnit, selectBuildingFloor, type BlueprintView } from '@/lib/layering/buildingBlueprint';
import { blueprintElementDetail } from '@/lib/layering/publicBlueprint';
import styles from './BuildingBlueprintPreview.module.css';

interface Props {
  zones: ZoneInstance[];
  inventory?: BuildingUnitItem[];
  view: BlueprintView;
  onViewChange: (view: BlueprintView) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onInspect?: (id: string) => void;
  isAr: boolean;
  elevation?: React.ReactNode;
  onRequestUnit?: (unit: ZoneInstance) => void;
}

export default function BuildingBlueprintPreview({ zones, inventory = [], view, onViewChange, selectedId, onSelect, onInspect, isAr, onRequestUnit, elevation }: Props) {
  const text = (ar: string, en: string) => isAr ? ar : en;
  const keys = [...new Set(zones.map(buildingFloorKey))].filter(k => k !== 'building').sort((a, b) => {
    const order = (key: string) => key === 'bld_basement' ? -1 : key === 'bld_ground' ? 0 : key === 'bld_roof' ? Infinity : Number(key.match(/\d+/)?.[0] ?? 0);
    return order(a) - order(b);
  });
  const floorKey = view.mode === 'elevation' ? undefined : view.floorKey;
  const floor = floorKey ? selectBuildingFloor(zones, floorKey) : { units: [], core: [] };
  const unit = view.mode === 'unit' ? floor.units.find(u => u.id === view.unitId) : undefined;
  const rooms = unit?.children?.flatMap(z => z.children?.length ? z.children : [z]) ?? [];
  const selected = [...zones, ...rooms].find(z => z.id === selectedId);
  const navigate = (next: BlueprintView) => { onSelect(null); onViewChange(next); };
  const icon = (z: ZoneInstance, size = 22) => { const Icon = BLUEPRINT_ICONS[z.zone_template_id] ?? Building2; return <Icon size={size} aria-hidden="true" />; };
  const status = (value?: string) => value ? <span className={`${styles.pill} ${value === 'available' || value === 'Finished' || value === 'Installed' ? styles.available : ''}`}>{blueprintLabel('status', value ?? '', isAr)}</span> : null;
  const dimensions = (z: ZoneInstance) => z.spatial && z.spatial.length_m > 0 && z.spatial.width_m > 0 ? `${z.spatial.length_m} × ${z.spatial.width_m} ${text('م', 'm')} · ${z.spatial.sqm || Number((z.spatial.length_m * z.spatial.width_m).toFixed(2))} ${text('م²', 'm²')}` : null;
  const unitFacts = (z: ZoneInstance) => {
    const facts = resolveBlueprintUnit(z, inventory);
    return [!!facts.area_sqm ? `${facts.area_sqm} ${text('م²', 'm²')}` : null, !!facts.bedrooms ? `${facts.bedrooms} ${text('غرف', 'bedrooms')}` : null, !!facts.bathrooms ? `${facts.bathrooms} ${text('حمامات', 'bathrooms')}` : null].filter(Boolean).join(' · ');
  };
  const unitTile = (z: ZoneInstance) => <button type="button" key={z.id} className={styles.unit} onClick={() => navigate({ mode: 'unit', floorKey: buildingFloorKey(z), unitId: z.id })}>
    {icon(z, 28)}<strong><bdi>{zoneLabel(z, isAr)}</bdi></strong>
    {unitFacts(z) && <span>{unitFacts(z)}</span>}
    {status(resolveBlueprintUnit(z, inventory).status)}
    <span className={styles.link}>{text('عرض مخطط الشقة ‹', 'View unit plan ›')}</span>
    <span className={styles.door} title={text('باب الشقة', 'Unit door')}><DoorOpen size={19} /></span>
  </button>;
  const coreTile = (z: ZoneInstance) => <button type="button" key={z.id} aria-pressed={selectedId === z.id} className={`${styles.element} ${z.zone_template_id === 'bld.lightwell' ? styles.lightwell : ''}`} onClick={() => onSelect(z.id)}>{icon(z)}<strong>{zoneLabel(z, isAr)}</strong></button>;
  const detail = selected ? blueprintElementDetail(selected, isAr) : null;
  const selectedFacts = selected ? [
    ...(dimensions(selected) ? [[text('الأبعاد', 'Dimensions'), dimensions(selected)!]] : []),
    ...(selected.service_purpose ? [[text('الغرض', 'Purpose'), selected.service_purpose]] : []),
    ...(selected.zone_template_id === 'bld.unit' ? (() => {
      const facts = resolveBlueprintUnit(selected, inventory);
      return [
        [text('المساحة (م²)', 'Area (m²)'), facts.area_sqm], [text('غرف النوم', 'Bedrooms'), facts.bedrooms],
        [text('الحمامات', 'Bathrooms'), facts.bathrooms], [text('الاتجاه', 'Orientation'), facts.orientation],
        [text('الإطلالة', 'View'), facts.view], [text('التشطيب', 'Finishing'), facts.finishing_state ? blueprintLabel('status', facts.finishing_state, isAr) : undefined],
      ].filter((pair): pair is [string, string | number] => pair[1] !== undefined && pair[1] !== '' && pair[1] !== 0).map(([label, value]) => [label, String(value)]);
    })() : []),
    ...(detail?.facts ?? []),
  ].filter(([, value]) => value != null && value !== '' && value !== '0' && !/^\s*\[.*\]\s*$/.test(value)) : [];
  const selectedLocation = selected?.zone_template_id === 'bld.elevator' || selected?.zone_template_id === 'bld.staircase'
    ? `${text('قلب المبنى', 'Building core')} · ${text('يخدم', 'Serves')} ${keys.map(k => floorLabel(k, isAr)).join(text('، ', ', '))}`
    : floorKey ? floorLabel(floorKey, isAr) : text('المبنى', 'Building');

  return <section className={styles.root} dir={isAr ? 'rtl' : 'ltr'} aria-label={text('معاينة مخطط المبنى', 'Building blueprint preview')}>
    <nav className={styles.path} aria-label={text('مسار المبنى', 'Building path')}>
      <button type="button" aria-current={view.mode === 'elevation' ? 'page' : undefined} onClick={() => navigate({ mode: 'elevation' })}><Building2 size={17} />{text('المبنى', 'Building')}</button>
      {floorKey && <><span aria-hidden="true">›</span><button type="button" aria-current={view.mode === 'floor' ? 'page' : undefined} onClick={() => navigate({ mode: 'floor', floorKey })}>{floorLabel(floorKey, isAr)}</button><span aria-hidden="true">›</span><span className={styles.activeChip}>{unit ? zoneLabel(unit, isAr) : text('اختر شقة', 'Choose a unit')}</span></>}
      {view.mode !== 'elevation' && <button type="button" className={styles.back} onClick={() => navigate(view.mode === 'unit' ? { mode: 'floor', floorKey: view.floorKey } : { mode: 'elevation' })}><ChevronLeft size={16} />{view.mode === 'unit' ? text('رجوع للدور', 'Back to floor') : text('رجوع لواجهة المبنى', 'Back to building')}</button>}
    </nav>
    {unit && (() => {
      const facts = resolveBlueprintUnit(unit, inventory);
      const index = floor.units.findIndex(u => u.id === unit.id);
      return <div className={styles.summary}>
        <strong>{unitFacts(unit)}</strong>
        {facts.finishing_state && <span>{blueprintLabel('status', facts.finishing_state, isAr)}</span>}
        {facts.orientation && !/^\s*\[.*\]\s*$/.test(facts.orientation) && <span>{text('الاتجاه', 'Orientation')}: {facts.orientation}</span>}
        {facts.view && !/^\s*\[.*\]\s*$/.test(facts.view) && <span>{text('الإطلالة', 'View')}: {facts.view}</span>}
        {status(facts.status)}
        <button type="button" onClick={() => onSelect(unit.id)}>{text('بيانات الشقة', 'Unit facts')}</button>
        <button type="button" disabled={index <= 0} onClick={() => navigate({ mode: 'unit', floorKey: floorKey!, unitId: floor.units[index - 1].id })}>{text('الشقة السابقة', 'Previous unit')}</button>
        <button type="button" disabled={index >= floor.units.length - 1} onClick={() => navigate({ mode: 'unit', floorKey: floorKey!, unitId: floor.units[index + 1].id })}>{text('الشقة التالية', 'Next unit')}</button>
        {onRequestUnit && <button type="button" className={styles.request} onClick={() => onRequestUnit(unit)}>{text('اطلب هذه الشقة', 'Request this unit')}</button>}
      </div>;
    })()}
    <div className={styles.workspace}>
      <aside className={styles.floors} aria-label={text('الأدوار', 'Floors')}>
        {keys.map(key => {
          const data = selectBuildingFloor(zones, key);
          const available = data.units.filter(u => resolveBlueprintUnit(u, inventory).status === 'available').length;
          const availabilityKnown = data.units.length > 0 && data.units.every(u => resolveBlueprintUnit(u, inventory).status !== undefined);
          return <button type="button" key={key} aria-current={key === floorKey ? 'page' : undefined} onClick={() => navigate({ mode: 'floor', floorKey: key })}><strong>{floorLabel(key, isAr)}</strong><small>{data.units.length} {text('شقة', 'units')}{availabilityKnown && <> · {available} {text('متاحة', 'available')}</>}</small></button>;
        })}
      </aside>
      <div className={styles.planColumn}>
        {view.mode === 'elevation' ? <>{elevation}<div className={styles.building}>
          <h3>{text('واجهة المبنى', 'Building overview')}</h3>
          {!elevation && [...keys].reverse().map(key => <button type="button" key={key} onClick={() => navigate({ mode: 'floor', floorKey: key })}><span>{floorLabel(key, isAr)}</span><span>{selectBuildingFloor(zones, key).units.length} {text('شقة', 'units')}</span><ChevronLeft size={18} /></button>)}
          {zones.filter(z => z.zone_template_id === 'bld.building').map(coreTile)}
          {!keys.length && <p>{text('لا توجد أدوار مسجلة.', 'No floors recorded.')}</p>}
        </div></> : view.mode === 'unit' ? <div className={styles.roomPlan}>
          {rooms.map(z => <button type="button" key={z.id} className={styles.room} aria-pressed={selectedId === z.id} onClick={() => onSelect(z.id)}>{icon(z, 27)}<strong>{zoneLabel(z, isAr)}</strong>{dimensions(z) && <span>{dimensions(z)}</span>}</button>)}
          {!rooms.length && <p>{text('لم تسجل غرف هذه الشقة.', 'No rooms recorded for this unit.')}</p>}
        </div> : <div className={styles.floorPlan}>
          <div className={styles.unitStack}>{floor.units.filter((_, i) => i % 2 === 0).map(unitTile)}</div>
          <div className={styles.core}>{floor.core.map(coreTile)}{!floor.core.length && <p>{text('لم تسجل المساحات المشتركة', 'Shared spaces not recorded')}</p>}</div>
          <div className={styles.unitStack}>{floor.units.filter((_, i) => i % 2 === 1).map(unitTile)}</div>
          {!floor.units.length && <p className={styles.empty}>{text('لا توجد شقق مسجلة لهذا الدور', 'No units recorded on this floor')}</p>}
        </div>}
        <div className={styles.legend}><span className={styles.available}>{text('متاحة', 'Available')}</span><span>{text('مباعة / محجوزة', 'Sold / Reserved')}</span><span>{text('مساحات مشتركة', 'Shared spaces')}</span><span><DoorOpen size={15} />{text('باب الشقة', 'Unit door')}</span></div>
      </div>
      <aside className={styles.detail} aria-label={text('تفاصيل العنصر', 'Element details')}>
        {selected ? <>
          <span className={styles.iconTile}>{icon(selected, 30)}</span><h3>{zoneLabel(selected, isAr)}</h3><p>{selectedLocation}</p>
          {onInspect && <button type="button" onClick={() => onInspect(selected.id)}>{text('تحرير بيانات العنصر', 'Edit element facts')}</button>}
          <dl className={styles.facts}>{selectedFacts.map(([label, value], i) => <div key={i}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl>
          <h4>{text('حالة التنفيذ لهذا العنصر', 'Execution status for this element')}</h4>
          <ul className={styles.trades}>{detail?.trades.map(t => <li key={t.id}><span>{blueprintLabel('trade', t.trade_template_id, isAr)}</span>{status(t.status)}</li>)}</ul>
          {!detail?.trades.length && <p>{text('لم تسجل أعمال لهذا العنصر', 'No trades recorded for this element')}</p>}
          <h4>{text('صور العنصر', 'Element photos')}</h4>
          {selected.images?.length ? <div className={styles.photos}>{selected.images.map((url, i) => <img key={`${url}-${i}`} src={url} alt={`${zoneLabel(selected, isAr)} ${i + 1}`} />)}</div> : <p className={styles.photoSlot}>{text('لم تضاف صور بعد', 'No photos added yet')}</p>}
        </> : <p>{text('اختر عنصراً لعرض بياناته وأعماله', 'Select an element to see its facts and trades')}</p>}
        <p className={styles.note}>{text('الأعمال العامة للمبنى تظهر تحت «المبنى».', 'Building-wide work appears under “Building”.')}</p>
      </aside>
    </div>
  </section>;
}
