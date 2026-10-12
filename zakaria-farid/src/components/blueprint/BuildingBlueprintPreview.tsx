'use client';
import ZoneMedia from './ZoneMedia';

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Building2, DoorOpen, X } from 'lucide-react';
import type { ZoneInstance } from '@/lib/layering/instances';
import type { BuildingUnitItem } from '@/lib/supabase/types';
import { BLUEPRINT_ICONS } from '@/lib/layering/blueprintIcons';
import { blueprintLabel, zoneLabel } from '@/lib/layering/labels';
import { buildingFloorKey, blueprintFloorSummary, groupBlueprintFacilities, floorLabel, resolveBlueprintUnit, selectBuildingFloor, type BlueprintView } from '@/lib/layering/buildingBlueprint';
import { blueprintElementDetail } from '@/lib/layering/publicBlueprint';
import { arrangeGroundFloor, arrangeUnitRooms, roomWeight, sortTiles } from '@/lib/layering/blueprintEditor';
import { useBlueprintEditing, type BlueprintEditing } from './useBlueprintEditing';
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
  actions?: React.ReactNode;
  hoveredFloor?: string | null;
  onHoverFloor?: (key: string | null) => void;
  fullscreen?: boolean;
  zoom?: number;
  onRequestUnit?: (unit: ZoneInstance) => void;
  /** Admin only: turns the drawing into an editor. */
  edit?: BlueprintEditing;
}

export default function BuildingBlueprintPreview({ zones, inventory = [], view, onViewChange, selectedId, onSelect, onInspect, isAr, onRequestUnit, elevation, edit, actions, hoveredFloor, onHoverFloor, fullscreen = false, zoom = 1 }: Props) {
  const text = (ar: string, en: string) => isAr ? ar : en;
  const ed = useBlueprintEditing({ edit, zones, inventory, isAr, view, onViewChange, onSelect });
  const keys = [...ed.floors].reverse();
  const floorKey = view.mode === 'elevation' ? undefined : view.floorKey;
  const floor = floorKey ? selectBuildingFloor(zones, floorKey) : { units: [], core: [] };
  const unit = view.mode === 'unit' ? floor.units.find(u => u.id === view.unitId) : undefined;
  const rooms = unit?.children?.flatMap(z => z.children?.length ? z.children : [z]) ?? [];
  const selected = [...zones, ...rooms].find(z => z.id === selectedId);
  const rootRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const open = Boolean(selected);
  useLayoutEffect(() => {
    if (!open) return;
    const drawing = rootRef.current?.querySelector<HTMLElement>('[data-blueprint-drawing]');
    const panel = panelRef.current;
    if (!drawing || !panel) return;
    const fit = () => {
      const rect = drawing.getBoundingClientRect();
      const navbarBottom = fullscreen ? 0 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--map-navbar-bottom')) || 0;
      const top = Math.max(rect.top + drawing.clientTop, navbarBottom ? navbarBottom + 8 : 0);
      const bottom = Math.min(rect.bottom - drawing.clientTop, window.innerHeight);
      panel.style.setProperty('--bp-detail-top', `${Math.max(0, top - rect.top - drawing.clientTop)}px`);
      panel.style.setProperty('--bp-detail-height', `${Math.max(0, bottom - top)}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(drawing);
    window.addEventListener('scroll', fit, true);
    window.addEventListener('resize', fit);
    return () => { observer.disconnect(); window.removeEventListener('scroll', fit, true); window.removeEventListener('resize', fit); };
  }, [open, fullscreen]);
  useEffect(() => {
    if (open && !wasOpen.current) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      panelRef.current?.querySelector<HTMLButtonElement>('[data-detail-close]')?.focus({ preventScroll: true });
    } else if (!open && wasOpen.current) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !rootRef.current?.contains(document.activeElement)) return;
      event.preventDefault(); event.stopImmediatePropagation(); onSelect(null);
    };
    document.addEventListener('keydown', escape, true);
    return () => document.removeEventListener('keydown', escape, true);
  }, [open, onSelect]);
  useEffect(() => {
    const rail = rootRef.current?.querySelector<HTMLElement>('[data-floor-rail]');
    const current = rail?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!rail || !current) return;
    // Scroll only the rail: scrollIntoView would also move the page.
    const row = current.getBoundingClientRect(), viewport = rail.getBoundingClientRect();
    if (rail.scrollHeight > rail.clientHeight) {
      if (row.top < viewport.top) rail.scrollTop += row.top - viewport.top;
      else if (row.bottom > viewport.bottom) rail.scrollTop += row.bottom - viewport.bottom;
    }
    if (rail.scrollWidth > rail.clientWidth) {
      if (row.left < viewport.left) rail.scrollLeft += row.left - viewport.left;
      else if (row.right > viewport.right) rail.scrollLeft += row.right - viewport.right;
    }
  }, [floorKey, fullscreen]);
  const navigate = (next: BlueprintView) => { onSelect(null); onViewChange(next); };
  const icon = (z: ZoneInstance, size = 22) => { const Icon = BLUEPRINT_ICONS[z.zone_template_id] ?? Building2; return <Icon size={size} aria-hidden="true" />; };
  const status = (value?: string) => value ? <span className={`${styles.pill} ${value === 'available' || value === 'Finished' || value === 'Installed' ? styles.available : ''}`}>{blueprintLabel('status', value ?? '', isAr)}</span> : null;
  const dimensions = (z: ZoneInstance) => z.spatial && z.spatial.length_m > 0 && z.spatial.width_m > 0 ? `${z.spatial.length_m} × ${z.spatial.width_m} ${text('م', 'm')} · ${z.spatial.sqm || Number((z.spatial.length_m * z.spatial.width_m).toFixed(2))} ${text('م²', 'm²')}` : null;
  const unitFacts = (z: ZoneInstance) => {
    const facts = resolveBlueprintUnit(z, inventory);
    return [!!facts.area_sqm ? `${facts.area_sqm} ${text('م²', 'm²')}` : null, !!facts.bedrooms ? `${facts.bedrooms} ${text('غرف', 'bedrooms')}` : null, !!facts.bathrooms ? `${facts.bathrooms} ${text('حمامات', 'bathrooms')}` : null].filter(Boolean).join(' · ');
  };
  const units = sortTiles(floor.units);
  const core = sortTiles(floor.core);
  const orderedRooms = sortTiles(rooms);
  /** In the admin each tile carries its edit bar and drag handles; on the public page the tile renders alone. */
  const wrap = (z: ZoneInstance, list: ZoneInstance[], kind: 'shared' | 'room' | 'unit', groupKey: string, tile: React.ReactElement, style?: React.CSSProperties) => {
    if (!ed.editing) return tile;
    const drag = ed.tileDragProps(z, list, kind, groupKey);
    return (
      <div
        key={z.id}
        className={`${styles.tileWrap} ${drag.className || ''}`.trim()}
        style={style}
        draggable={drag.draggable}
        data-drop-target={drag['data-drop-target']}
        data-is-dragging={drag['data-is-dragging']}
        onDragStart={drag.onDragStart}
        onDragOver={drag.onDragOver}
        onDragEnter={drag.onDragEnter}
        onDragLeave={drag.onDragLeave}
        onDrop={drag.onDrop}
        onDragEnd={drag.onDragEnd}
      >
        {(selectedId === z.id ? null : ed.renameField(z)) ?? tile}
        {selectedId !== z.id && ed.tileControls(z, list, kind)}
      </div>
    );
  };
  const unitTile = (z: ZoneInstance) => {
    const hasPhoto = Boolean(z.images?.length && z.images[0]);
    return wrap(z, units, 'unit', floorKey ?? 'elevation', (
      <button type="button" key={z.id} className={`${styles.unit} ${hasPhoto ? styles.tileWithPhoto : ''}`} onClick={() => navigate({ mode: 'unit', floorKey: buildingFloorKey(z), unitId: z.id })}>
        {hasPhoto ? (
          <>
            <img src={z.images![0]} alt="" className={styles.tilePhotoCover} />
            <div className={styles.tilePhotoScrim} />
            <div className={styles.tilePhotoContent}>
              <strong><bdi>{zoneLabel(z, isAr)}</bdi></strong>
              {unitFacts(z) && <span>{unitFacts(z)}</span>}
              {status(resolveBlueprintUnit(z, inventory).status)}
              <span className={styles.link}>{text('عرض مخطط الشقة ‹', 'View unit plan ›')}</span>
            </div>
          </>
        ) : (
          <>
            {icon(z, 28)}<strong><bdi>{zoneLabel(z, isAr)}</bdi></strong>
            {unitFacts(z) && <span>{unitFacts(z)}</span>}
            {status(resolveBlueprintUnit(z, inventory).status)}
            <span className={styles.link}>{text('عرض مخطط الشقة ‹', 'View unit plan ›')}</span>
          </>
        )}
        <span className={styles.door} title={text('باب الشقة', 'Unit door')}><DoorOpen size={19} /></span>
      </button>
    ));
  };
  const pick = (id: string) => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    onSelect(selectedId === id ? null : id);
  };
  const coreButton = (z: ZoneInstance) => {
    const hasPhoto = Boolean(z.images?.length && z.images[0]);
    return (
      <button
        type="button"
        key={z.id}
        data-zone-id={z.id}
        data-zone-template={z.zone_template_id}
        aria-pressed={selectedId === z.id}
        className={`${styles.element} ${z.zone_template_id === 'bld.lightwell' ? styles.lightwell : ''} ${hasPhoto ? styles.tileWithPhoto : ''}`}
        onClick={() => pick(z.id)}
      >
        {hasPhoto ? (
          <>
            <img src={z.images![0]} alt="" className={styles.tilePhotoCover} />
            <div className={styles.tilePhotoScrim} />
            <div className={styles.tilePhotoContent}>
              <strong>{zoneLabel(z, isAr)}</strong>
              {dimensions(z) && <span className={styles.dims}>{dimensions(z)}</span>}
            </div>
          </>
        ) : (
          <>
            {icon(z)}<strong>{zoneLabel(z, isAr)}</strong>
            {dimensions(z) && <span className={styles.dims}>{dimensions(z)}</span>}
          </>
        )}
      </button>
    );
  };
  const coreTile = (z: ZoneInstance) => wrap(z, core, 'shared', floorKey ?? 'elevation', coreButton(z));
  const roomTile = (z: ZoneInstance) => {
    const hasPhoto = Boolean(z.images?.length && z.images[0]);
    return wrap(z, orderedRooms, 'room', unit?.id ?? 'unit',
      <button
        type="button"
        key={z.id}
        data-zone-id={z.id}
        data-zone-template={z.zone_template_id}
        className={`${styles.room} ${hasPhoto ? styles.tileWithPhoto : ''}`}
        style={ed.editing ? undefined : { flexGrow: roomWeight(z) }}
        aria-pressed={selectedId === z.id}
        onClick={() => pick(z.id)}
      >
        {hasPhoto ? (
          <>
            <img src={z.images![0]} alt="" className={styles.tilePhotoCover} />
            <div className={styles.tilePhotoScrim} />
            <div className={styles.tilePhotoContent}>
              <strong>{zoneLabel(z, isAr)}</strong>
              {dimensions(z) && <span>{dimensions(z)}</span>}
            </div>
          </>
        ) : (
          <>
            {icon(z, 27)}<strong>{zoneLabel(z, isAr)}</strong>
            {dimensions(z) && <span>{dimensions(z)}</span>}
          </>
        )}
      </button>,
      { flexGrow: roomWeight(z) }
    );
  };
  const apartment = arrangeUnitRooms(rooms);
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
  const selectedLocation = selected ? floorLabel(rooms.includes(selected) && floorKey ? floorKey : buildingFloorKey(selected), isAr) +
    (['bld.elevator', 'bld.staircase'].includes(selected.zone_template_id)
      ? ` · ${text('قلب المبنى', 'Building core')} · ${text('يخدم', 'Serves')} ${keys.map(k => floorLabel(k, isAr)).join(text('، ', ', '))}` : '') : '';
  const allUnits = zones.filter(z => z.zone_template_id === 'bld.unit');
  const availabilityKnown = allUnits.length > 0 && allUnits.every(z => resolveBlueprintUnit(z, inventory).status !== undefined);
  const facilities = groupBlueprintFacilities(zones, isAr);
  const floorIndex = floorKey ? keys.indexOf(floorKey) : -1;
  return <section ref={rootRef} className={`${styles.root} ${fullscreen ? styles.fullscreen : ''}`} dir={isAr ? 'rtl' : 'ltr'} aria-label={text('معاينة مخطط المبنى', 'Building blueprint preview')}>
    <div className={styles.topbar}>
      <nav className={styles.path} aria-label={text('مسار المبنى', 'Building path')}>
        {view.mode === 'elevation' ? <span aria-current="page">{text('المبنى', 'Building')}</span> : <button type="button" onClick={() => navigate({ mode: 'elevation' })}>{text('المبنى', 'Building')}</button>}
        {floorKey && <><span aria-hidden="true">{isAr ? '‹' : '›'}</span>{view.mode === 'floor' ? <span aria-current="page">{floorLabel(floorKey, isAr)}</span> : <button type="button" onClick={() => navigate({ mode: 'floor', floorKey })}>{floorLabel(floorKey, isAr)}</button>}</>}
        {unit && <><span aria-hidden="true">{isAr ? '‹' : '›'}</span><span aria-current="page"><bdi>{zoneLabel(unit, isAr)}</bdi></span></>}
      </nav>
      {actions}
    </div>
    <div className={styles.workspace}>
      <div className={styles.planColumn} data-blueprint-drawing>
        <div className={styles.planDrawing} style={view.mode === 'elevation' ? undefined : { transform: `scale(${zoom})` }}>
        {view.mode === 'elevation' ? elevation ?? <p className={styles.empty}>{text('اختر دوراً من القائمة.', 'Choose a floor from the rail.')}</p> : view.mode === 'unit' ? <div className={styles.roomPlan}>
          {apartment.front.length > 0 && <div className={styles.aptFront}>{apartment.front.map(roomTile)}</div>}
          <div className={styles.aptSide}>{apartment.social.map(roomTile)}</div>
          <div className={styles.aptSide}>{apartment.private.map(roomTile)}</div>
          {!rooms.length && <p className={styles.empty}>{text('لم تسجل غرف هذه الشقة.', 'No rooms recorded for this unit.')}</p>}
          {ed.editing && unit && <div className={styles.planAdd}>{ed.addSlot('room', orderedRooms, unit.id)}</div>}
        </div> : units.length === 0 ? (() => {
          const ground = arrangeGroundFloor(core);
          const hasUpper = ground.large.length > 0 || ground.core.length > 0 || ground.services.length > 0;
          return (
            <div className={styles.groundPlanContainer}>
              <div className={styles.groundBuildingFrame}>
                <div className={styles.groundFrameHeader}>
                  <span className={styles.groundFrameBadge}>{floorLabel(floorKey ?? 'bld_ground', isAr)}</span>
                </div>
                {hasUpper && (
                  <div className={styles.groundUpperGrid}>
                    {ground.large.length > 0 && (
                      <div className={styles.groundGarageCol}>
                        {ground.large.map(z => wrap(z, ground.large, 'shared', `${floorKey}-large`, coreButton(z)))}
                      </div>
                    )}
                    {ground.core.length > 0 && (
                      <div className={styles.groundCoreCol}>
                        {ground.core.map(z => wrap(z, ground.core, 'shared', `${floorKey}-core`, coreButton(z)))}
                      </div>
                    )}
                    {ground.services.length > 0 && (
                      <div className={styles.groundServicesCol}>
                        {ground.services.map(z => wrap(z, ground.services, 'shared', `${floorKey}-services`, coreButton(z)))}
                      </div>
                    )}
                  </div>
                )}
                {ground.front.length > 0 && (
                  <div className={styles.groundFrontStrip}>
                    {ground.front.map(z => wrap(z, ground.front, 'shared', `${floorKey}-front`, coreButton(z)))}
                  </div>
                )}
                {!hasUpper && ground.front.length === 0 && !ed.editing && (
                  <p className={styles.empty}>{text('لم تسجل عناصر الدور الأرضي.', 'No ground floor elements recorded.')}</p>
                )}
              </div>

              {/* Gate & Wall outside the building line under the frame, centred, dashed */}
              {ground.gate.length > 0 && (
                <div className={styles.groundGateBoundary}>
                  <div className={styles.groundGateWall}>
                    {ground.gate.map(z => wrap(z, ground.gate, 'shared', `${floorKey}-gate`, coreButton(z)))}
                  </div>
                </div>
              )}

              {/* Street at the bottom */}
              <div className={styles.groundStreet}>
                <div className={styles.groundStreetDashes} />
                <span className={styles.groundStreetLabel}>{text('شارع المدخل الرئيسي', 'Main Entrance Street')}</span>
                <div className={styles.groundStreetDashes} />
              </div>

              {ed.editing && (
                <div className={styles.planAdd}>
                  {ed.addSlot('shared', core)}
                  {ed.addSlot('unit', units)}
                </div>
              )}
            </div>
          );
        })() : <div className={styles.floorPlan}>
          <div className={styles.unitStack}>{units.filter((_, i) => i % 2 === 0).map(unitTile)}</div>
          <div className={styles.core}>{core.map(coreTile)}{!core.length && !ed.editing && <p>{text('لم تسجل المساحات المشتركة', 'Shared spaces not recorded')}</p>}{ed.addSlot('shared', core)}</div>
          <div className={styles.unitStack}>{units.filter((_, i) => i % 2 === 1).map(unitTile)}</div>
          {ed.editing && <div className={styles.planAdd}>{ed.addSlot('unit', units)}</div>}
        </div>}
        </div>
      {selected && <aside ref={panelRef} data-blueprint-detail data-lenis-prevent className={styles.detail} role="region" aria-label={text('تفاصيل العنصر', 'Element details')}>
        <div className={styles.detailHeader}>
          <span className={styles.dragHandle} aria-hidden="true" />
          <button type="button" data-detail-close aria-label={text('إغلاق تفاصيل العنصر', 'Close element details')} onClick={() => onSelect(null)}><X size={20} /></button>
        </div>
        <div className={styles.detailBody}>
          {ed.editing && <div className={styles.detailEditor}>
            {ed.renameField(selected)}
            {ed.tileControls(selected, rooms.includes(selected) ? orderedRooms : selected.zone_template_id === 'bld.unit' ? units : core.includes(selected) ? core : zones.filter(z => z.zone_template_id !== 'bld.unit'), rooms.includes(selected) ? 'room' : selected.zone_template_id === 'bld.unit' ? 'unit' : 'shared')}
          </div>}
          {edit?.renderDetails ? edit.renderDetails(selected.id) : <>
          <span className={styles.iconTile}>{icon(selected, 30)}</span><h3>{zoneLabel(selected, isAr)}</h3><p>{selectedLocation}</p>
          {onInspect && <button type="button" onClick={() => onInspect(selected.id)}>{text('تحرير بيانات العنصر', 'Edit element facts')}</button>}
          <dl className={styles.facts}>{selectedFacts.map(([label, value], i) => <div key={i}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}</dl>
          <h4>{text('حالة التنفيذ لهذا العنصر', 'Execution status for this element')}</h4>
          <ul className={styles.trades}>{detail?.trades.map(t => <li key={t.id}><span>{blueprintLabel('trade', t.trade_template_id, isAr)}</span>{status(t.status)}</li>)}</ul>
          {!detail?.trades.length && <p>{text('لم تسجل أعمال لهذا العنصر', 'No trades recorded for this element')}</p>}
          <ZoneMedia zone={selected} isAr={isAr} />
        <p className={styles.note}>{text('الأعمال العامة للمبنى تظهر تحت «المبنى».', 'Building-wide work appears under “Building”.')}</p>
        {selected.zone_template_id === 'bld.unit' && onRequestUnit && <button type="button" className={styles.request} onClick={() => onRequestUnit(selected)}>{text('اطلب هذه الشقة', 'Request this unit')}</button>}
          </>}
        </div>
      </aside>}
      </div>
      <aside className={`${styles.floors} ${ed.editing ? styles.floorsAdminCompact : ''}`} data-floor-rail aria-label={text('الأدوار', 'Floors')}>
        {keys.map(key => {
          const button = <button type="button" key={key} data-floor-key={key} data-hovered={hoveredFloor === key || undefined}
            aria-current={key === floorKey ? 'page' : undefined}
            onMouseEnter={() => onHoverFloor?.(key)} onMouseLeave={() => onHoverFloor?.(null)}
            onFocus={() => onHoverFloor?.(key)} onBlur={() => onHoverFloor?.(null)}
            onClick={() => navigate({ mode: 'floor', floorKey: key })}>
            <span><strong>{floorLabel(key, isAr)}</strong><span aria-hidden="true">{isAr ? '‹' : '›'}</span></span>
            <small title={blueprintFloorSummary(zones, key, inventory, isAr)}>{blueprintFloorSummary(zones, key, inventory, isAr)}</small>
          </button>;
          return ed.editing ? <div key={key} className={styles.floorRow}>{button}{ed.floorControls(key)}</div> : button;
        })}
        {!keys.length && <p>{text('لا توجد أدوار مسجلة.', 'No floors recorded.')}</p>}
        {ed.addFloors}
      </aside>
    </div>
    {ed.pickerPanel}
    <div className={styles.infoStrip} data-blueprint-info>
      {view.mode === 'elevation' && <>
        <div className={styles.summary}>
          <span>{keys.length} {text('أدوار', 'floors')}</span><span>{allUnits.length} {text('شقة', 'units')}</span>
          {availabilityKnown && <span>{allUnits.filter(z => resolveBlueprintUnit(z, inventory).status === 'available').length} {text('متاحة', 'available')}</span>}
        </div>
        <h3>{text('مرافق المبنى', 'Building facilities')}</h3>
        <div className={styles.facilities}>{facilities.map(({ zone: z, count }) => wrap(z, facilities.map(f => f.zone), 'shared', 'building',
          <button type="button" key={z.id} data-facility-id={z.id} aria-pressed={selectedId === z.id} onClick={() => pick(z.id)}>{icon(z, 16)}{zoneLabel(z, isAr)}{count > 1 && <small><bdi>×{count}</bdi></small>}</button>))}</div>
        <p className={styles.note}>{text('اضغط على أي دور في الرسم أو في القائمة', 'Click any floor in the drawing or the rail')}</p>
      </>}
      {view.mode === 'floor' && <div className={styles.summary}>
        <strong>{floorLabel(view.floorKey, isAr)}</strong><span>{floor.units.length ? blueprintFloorSummary(zones, view.floorKey, inventory, isAr) : `${floor.core.length} ${text('مساحات مشتركة', 'shared spaces')}`}</span>
        {floorIndex > 0 && <button type="button" onClick={() => navigate({ mode: 'floor', floorKey: keys[floorIndex - 1] })}>{text('الدور الأعلى', 'Upper floor')}</button>}
        {floorIndex >= 0 && floorIndex < keys.length - 1 && <button type="button" onClick={() => navigate({ mode: 'floor', floorKey: keys[floorIndex + 1] })}>{text('الدور الأدنى', 'Lower floor')}</button>}
      </div>}
    {unit && (() => {
      const facts = resolveBlueprintUnit(unit, inventory);
      const index = floor.units.findIndex(u => u.id === unit.id);
      return <div className={styles.summary}>
        <strong>{zoneLabel(unit, isAr)}</strong><span>{unitFacts(unit)}</span>
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
    {unit && !ed.editing && Boolean(unit.videos?.length || unit.images?.length) && <ZoneMedia zone={unit} isAr={isAr} />}

    </div>
    <div className={styles.legend}><span className={styles.available}>{text('متاحة', 'Available')}</span><span>{text('مباعة / محجوزة', 'Sold / Reserved')}</span><span>{text('مساحات مشتركة', 'Shared spaces')}</span><span><DoorOpen size={15} />{text('باب الشقة', 'Unit door')}</span></div>
  </section>;
}
