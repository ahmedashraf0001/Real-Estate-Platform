'use client';

import React, { useMemo, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight, Copy, DoorOpen, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import type { ZoneInstance } from '@/lib/layering/instances';
import type { BuildingUnitItem } from '@/lib/supabase/types';
import { BLUEPRINT_ICONS } from '@/lib/layering/blueprintIcons';
import { blueprintLabel, zoneLabel } from '@/lib/layering/labels';
import { buildingFloorKey, floorLabel, resolveBlueprintUnit, selectBuildingFloor } from '@/lib/layering/buildingBlueprint';
import {
  changeZoneType, createUnit, createZone, deleteFloor, duplicateFloor, duplicateZone, findZone, insertZone, isUnitLocked,
  listFloorKeys, lockedUnitsOnFloor, moveInList, nextFloorKey, nextUnitCode, removeZoneById, renameZone, reorderZones,
  ROOM_TEMPLATES, SHARED_SPACE_TEMPLATES, sortTiles,
} from '@/lib/layering/blueprintEditor';
import type { ZoneTemplate } from '@/lib/layering/templates';
import styles from './BuildingTileEditor.module.css';

interface Props {
  zones: ZoneInstance[];
  onChange: (zones: ZoneInstance[]) => void;
  inventory?: BuildingUnitItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Opens the zone inspector (dimensions, finishing, photos, video). */
  onInspect?: (id: string) => void;
  isAr: boolean;
}

type View = { floorKey: string; unitId?: string };
type Picker = { kind: 'shared' | 'room' } | null;
type Confirm = { kind: 'zone' | 'floor'; id: string } | null;

/** Admin editor for building blueprints: the same tiles the public page shows, all editable. */
export default function BuildingTileEditor({ zones, onChange, inventory = [], selectedId, onSelect, onInspect, isAr }: Props) {
  const text = (ar: string, en: string) => isAr ? ar : en;
  const [pending, setPending] = useState<string[]>([]);
  const floors = useMemo(() => listFloorKeys(zones, pending), [zones, pending]);
  const [view, setView] = useState<View>(() => ({ floorKey: floors.find(k => k !== 'bld_roof') ?? floors[0] ?? 'bld_ground' }));
  const [picker, setPicker] = useState<Picker>(null);
  const [customName, setCustomName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [typeMenu, setTypeMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [floorMenu, setFloorMenu] = useState<string | null>(null);

  const floorKey = floors.includes(view.floorKey) ? view.floorKey : floors[0] ?? 'bld_ground';
  const floor = selectBuildingFloor(zones, floorKey);
  const unit = view.unitId ? findZone(zones, view.unitId) : undefined;
  const shared = sortTiles(floor.core);
  const units = sortTiles(floor.units);
  const rooms = sortTiles(unit?.children ?? []);
  const buildingZone = zones.find(z => z.zone_template_id === 'bld.building');

  const commit = (next: ZoneInstance[]) => { onChange(next); setConfirm(null); setTypeMenu(null); };
  const go = (next: View) => { setView(next); setPicker(null); setConfirm(null); setRenaming(null); onSelect(null); };
  const icon = (z: ZoneInstance, size = 22) => { const Icon = BLUEPRINT_ICONS[z.zone_template_id] ?? Building2; return <Icon size={size} aria-hidden="true" />; };
  const dims = (z: ZoneInstance) => {
    const s = z.spatial;
    if (s && s.length_m > 0 && s.width_m > 0) return `${s.length_m} × ${s.width_m} ${text('م', 'm')} · ${s.sqm || Number((s.length_m * s.width_m).toFixed(2))} ${text('م²', 'm²')}`;
    return s?.sqm ? `${s.sqm} ${text('م²', 'm²')}` : null;
  };

  const addFloor = (kind: 'upper' | 'ground' | 'basement' | 'roof') => {
    const key = nextFloorKey(floors, kind);
    if (!key) return;
    setPending(p => [...p, key]);
    go({ floorKey: key });
  };

  const add = (template?: ZoneTemplate) => {
    const label = template ? undefined : customName.trim();
    if (!template && !label) return;
    const list = picker?.kind === 'room' ? rooms : shared;
    const zone = createZone({ templateId: template?.id, label, floorKey: picker?.kind === 'room' ? undefined : floorKey, sortOrder: nextOrder(list) });
    commit(insertZone(zones, zone, picker?.kind === 'room' ? unit?.id : undefined));
    setPicker(null); setCustomName(''); onSelect(zone.id);
  };

  const addUnit = () => {
    const zone = createUnit(floorKey, nextUnitCode(zones, floorKey), nextOrder(units));
    commit([...zones, zone]);
  };

  const nextOrder = (list: ZoneInstance[]) => list.reduce((max, z) => Math.max(max, z.sort_order), 0) + 1;
  const move = (list: ZoneInstance[], id: string, delta: -1 | 1) => commit(reorderZones(zones, moveInList(list.map(z => z.id), id, delta)));

  const saveRename = () => {
    if (renaming) commit(renameZone(zones, renaming.id, renaming.value));
    setRenaming(null);
  };

  const tile = (z: ZoneInstance, list: ZoneInstance[], kind: 'shared' | 'room' | 'unit') => {
    const index = list.indexOf(z);
    const locked = isUnitLocked(z, inventory);
    const facts = kind === 'unit' ? resolveBlueprintUnit(z, inventory) : null;
    const templates = kind === 'room' ? ROOM_TEMPLATES : SHARED_SPACE_TEMPLATES;
    const open = () => {
      if (kind === 'unit') go({ floorKey, unitId: z.id });
      else { onSelect(z.id); onInspect?.(z.id); }
    };
    return <div key={z.id} className={`${styles.tile} ${kind === 'unit' ? styles.unitTile : ''}`} aria-current={selectedId === z.id ? 'true' : undefined}>
      {renaming?.id === z.id ? (
        <input className={styles.renameInput} autoFocus aria-label={text('الاسم الجديد', 'New name')} value={renaming.value}
          onChange={e => setRenaming({ id: z.id, value: e.target.value })} onBlur={saveRename}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveRename(); } if (e.key === 'Escape') setRenaming(null); }} />
      ) : (
        <button type="button" className={styles.tileBody} onClick={open}>
          <span className={styles.iconBox}>{icon(z)}</span>
          <strong><bdi>{zoneLabel(z, isAr)}</bdi></strong>
          {kind === 'unit' ? <small>{[facts?.area_sqm ? `${facts.area_sqm} ${text('م²', 'm²')}` : null, `${z.children?.length ?? 0} ${text('غرفة', 'rooms')}`].filter(Boolean).join(' · ')}</small>
            : dims(z) && <small>{dims(z)}</small>}
          {facts?.status && <span className={`${styles.pill} ${facts.status === 'available' ? styles.ok : ''}`}>{blueprintLabel('status', facts.status, isAr)}</span>}
        </button>
      )}
      <div className={styles.actions}>
        <button type="button" title={text('إعادة التسمية', 'Rename')} aria-label={text('إعادة التسمية', 'Rename')} onClick={() => setRenaming({ id: z.id, value: kind === 'unit' ? (z.unit?.unit_code ?? z.instance_label ?? '') : zoneLabel(z, isAr) })}><Pencil size={13} /></button>
        {kind !== 'unit' && <button type="button" title={text('تغيير النوع', 'Change type')} aria-label={text('تغيير النوع', 'Change type')} aria-expanded={typeMenu === z.id} onClick={() => setTypeMenu(typeMenu === z.id ? null : z.id)}><Settings2 size={13} /></button>}
        {kind === 'unit' && onInspect && <button type="button" title={text('بيانات الشقة', 'Unit details')} aria-label={text('بيانات الشقة', 'Unit details')} onClick={() => { onSelect(z.id); onInspect(z.id); }}><Settings2 size={13} /></button>}
        <button type="button" title={text('تكرار', 'Duplicate')} aria-label={text('تكرار', 'Duplicate')} onClick={() => commit(duplicateZone(zones, z.id))}><Copy size={13} /></button>
        <button type="button" title={text('نقل للأمام', 'Move earlier')} aria-label={text('نقل للأمام', 'Move earlier')} disabled={index <= 0} onClick={() => move(list, z.id, -1)}>{isAr ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}</button>
        <button type="button" title={text('نقل للخلف', 'Move later')} aria-label={text('نقل للخلف', 'Move later')} disabled={index >= list.length - 1} onClick={() => move(list, z.id, 1)}>{isAr ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}</button>
        <button type="button" className={styles.danger} disabled={locked}
          title={locked ? text('الشقة محجوزة أو مباعة ولا يمكن حذفها', 'Reserved or sold units cannot be deleted') : text('حذف', 'Delete')}
          aria-label={text('حذف', 'Delete')} onClick={() => setConfirm({ kind: 'zone', id: z.id })}><Trash2 size={13} /></button>
      </div>
      {typeMenu === z.id && <div className={styles.typeMenu} role="menu">
        {templates.map(t => <button type="button" role="menuitemradio" aria-checked={t.id === z.zone_template_id} key={t.id} onClick={() => commit(changeZoneType(zones, z.id, t.id))}>{isAr ? t.label_ar : t.label_en}</button>)}
      </div>}
      {confirm?.kind === 'zone' && confirm.id === z.id && <div className={styles.confirm} role="alertdialog" aria-label={text('تأكيد الحذف', 'Confirm delete')}>
        <span>{kind === 'unit' && (z.children?.length ?? 0) > 0
          ? text(`حذف «${zoneLabel(z, true)}» وغرفها (${z.children!.length})؟`, `Delete "${zoneLabel(z, false)}" and its ${z.children!.length} rooms?`)
          : text(`حذف «${zoneLabel(z, true)}»؟`, `Delete "${zoneLabel(z, false)}"?`)}</span>
        <div><button type="button" className={styles.dangerSolid} onClick={() => commit(removeZoneById(zones, z.id))}>{text('حذف', 'Delete')}</button><button type="button" onClick={() => setConfirm(null)}>{text('إلغاء', 'Cancel')}</button></div>
      </div>}
    </div>;
  };

  const addTile = (label: string, onClick: () => void) => <button type="button" className={`${styles.tile} ${styles.addTile}`} onClick={onClick}><Plus size={18} />{label}</button>;

  const lockedOnFloor = confirm?.kind === 'floor' ? lockedUnitsOnFloor(zones, confirm.id, inventory) : [];
  const confirmFloorCount = confirm?.kind === 'floor' ? zones.filter(z => z.zone_template_id !== 'bld.building' && buildingFloorKey(z) === confirm.id).length : 0;

  return <section className={styles.root} dir={isAr ? 'rtl' : 'ltr'} aria-label={text('محرر مخطط المبنى', 'Building plan editor')}>
    <nav className={styles.path} aria-label={text('مسار المبنى', 'Building path')}>
      <span><Building2 size={15} />{text('المبنى', 'Building')}</span>
      <span aria-hidden="true">›</span>
      <button type="button" aria-current={!unit ? 'page' : undefined} onClick={() => go({ floorKey })}>{floorLabel(floorKey, isAr)}</button>
      {unit && <><span aria-hidden="true">›</span><span className={styles.activeChip}>{zoneLabel(unit, isAr)}</span>
        <button type="button" className={styles.back} onClick={() => go({ floorKey })}>{isAr ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}{text('رجوع للدور', 'Back to floor')}</button></>}
    </nav>

    <div className={styles.workspace}>
      <aside className={styles.floors} aria-label={text('الأدوار', 'Floors')}>
        <h3>{text('الأدوار', 'Floors')}</h3>
        {buildingZone && <button type="button" className={styles.floorBtn} aria-pressed={selectedId === buildingZone.id} onClick={() => { onSelect(buildingZone.id); onInspect?.(buildingZone.id); }}>
          <strong>{text('المبنى / المرافق العامة', 'Building / shared facilities')}</strong><small>{text('تشطيبات عامة للمبنى', 'Building-wide finishing')}</small>
        </button>}
        {[...floors].reverse().map(key => {
          const data = selectBuildingFloor(zones, key);
          return <div key={key} className={styles.floorRow}>
            <button type="button" className={styles.floorBtn} aria-current={key === floorKey ? 'page' : undefined} onClick={() => go({ floorKey: key })}>
              <strong>{floorLabel(key, isAr)}</strong>
              <small>{data.units.length} {text('شقة', 'units')} · {data.core.length} {text('مساحة مشتركة', 'shared')}</small>
            </button>
            <button type="button" className={styles.kebab} aria-label={text('خيارات الدور', 'Floor options')} aria-expanded={floorMenu === key} onClick={() => setFloorMenu(floorMenu === key ? null : key)}>⋯</button>
            {floorMenu === key && <div className={styles.floorMenu} role="menu">
              <button type="button" role="menuitem" onClick={() => {
                const target = nextFloorKey(floors, 'upper')!;
                commit(duplicateFloor(zones, key, target)); setFloorMenu(null); go({ floorKey: target });
              }}>{text('تكرار كدور جديد', 'Duplicate as new floor')}</button>
              <button type="button" role="menuitem" className={styles.dangerText} onClick={() => { setConfirm({ kind: 'floor', id: key }); setFloorMenu(null); }}>{text('حذف الدور…', 'Delete floor…')}</button>
            </div>}
            {confirm?.kind === 'floor' && confirm.id === key && <div className={styles.confirm} role="alertdialog" aria-label={text('تأكيد حذف الدور', 'Confirm floor delete')}>
              {lockedOnFloor.length > 0
                ? <span>{text(`لا يمكن حذف الدور: فيه ${lockedOnFloor.length} شقة محجوزة أو مباعة.`, `This floor has ${lockedOnFloor.length} reserved or sold units and cannot be deleted.`)}</span>
                : <span>{text(`حذف ${floorLabel(key, true)} وكل ما عليه (${confirmFloorCount} عنصر)؟`, `Delete ${floorLabel(key, false)} and its ${confirmFloorCount} items?`)}</span>}
              <div>
                {lockedOnFloor.length === 0 && <button type="button" className={styles.dangerSolid} onClick={() => {
                  setPending(p => p.filter(k => k !== key));
                  commit(deleteFloor(zones, key));
                  go({ floorKey: floors.find(k => k !== key) ?? 'bld_ground' });
                }}>{text('حذف', 'Delete')}</button>}
                <button type="button" onClick={() => setConfirm(null)}>{lockedOnFloor.length ? text('حسنًا', 'OK') : text('إلغاء', 'Cancel')}</button>
              </div>
            </div>}
          </div>;
        })}
        <div className={styles.addFloors}>
          <button type="button" onClick={() => addFloor('upper')}><Plus size={14} />{text('دور علوي', 'Upper floor')}</button>
          {!floors.includes('bld_ground') && <button type="button" onClick={() => addFloor('ground')}><Plus size={14} />{text('الدور الأرضي', 'Ground floor')}</button>}
          {!floors.includes('bld_basement') && <button type="button" onClick={() => addFloor('basement')}><Plus size={14} />{text('بدروم', 'Basement')}</button>}
          {!floors.includes('bld_roof') && <button type="button" onClick={() => addFloor('roof')}><Plus size={14} />{text('سطح', 'Roof')}</button>}
        </div>
      </aside>

      <div className={styles.canvas}>
        {unit ? <>
          <h3 className={styles.groupLabel}>{text('غرف الشقة', 'Unit rooms')}</h3>
          <div className={styles.grid}>
            {rooms.map(z => tile(z, rooms, 'room'))}
            {addTile(text('إضافة غرفة', 'Add room'), () => setPicker({ kind: 'room' }))}
          </div>
        </> : <>
          <h3 className={styles.groupLabel}>{text('المساحات المشتركة', 'Shared spaces')}</h3>
          <div className={styles.grid}>
            {shared.map(z => tile(z, shared, 'shared'))}
            {addTile(text('إضافة مساحة', 'Add space'), () => setPicker({ kind: 'shared' }))}
          </div>
          <h3 className={styles.groupLabel}>{text('الشقق', 'Units')}</h3>
          <div className={styles.grid}>
            {units.map(z => tile(z, units, 'unit'))}
            {addTile(text('إضافة شقة', 'Add unit'), addUnit)}
          </div>
        </>}

        {picker && <div className={styles.picker} role="dialog" aria-label={picker.kind === 'room' ? text('إضافة غرفة', 'Add room') : text('إضافة مساحة', 'Add space')}>
          <header><strong>{picker.kind === 'room' ? text(`إضافة غرفة إلى ${unit ? zoneLabel(unit, true) : ''}`, `Add a room to ${unit ? zoneLabel(unit, false) : ''}`) : text(`إضافة مساحة إلى ${floorLabel(floorKey, true)}`, `Add a space to ${floorLabel(floorKey, false)}`)}</strong>
            <button type="button" aria-label={text('إغلاق', 'Close')} onClick={() => setPicker(null)}>✕</button></header>
          <div className={styles.chips}>
            {(picker.kind === 'room' ? ROOM_TEMPLATES : SHARED_SPACE_TEMPLATES).map(t => <button type="button" key={t.id} onClick={() => add(t)}>{isAr ? t.label_ar : t.label_en}</button>)}
          </div>
          <div className={styles.custom}>
            <label htmlFor="bp-custom-name">{text('أو اسم مخصص', 'Or a custom name')}</label>
            <input id="bp-custom-name" value={customName} onChange={e => setCustomName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={text('مثال: مصلى، غرفة اجتماعات', 'e.g. Prayer room, Meeting room')} />
            <button type="button" disabled={!customName.trim()} onClick={() => add()}>{text('إضافة', 'Add')}</button>
          </div>
        </div>}

        <p className={styles.legend}><DoorOpen size={14} />{text('اضغط المربع لفتح بياناته (الأبعاد، التشطيب، الصور). الترتيب هنا هو الترتيب في صفحة العقار.', 'Click a tile to open its details (dimensions, finishing, photos). The order here is the order on the property page.')}</p>
      </div>
    </div>
  </section>;
}
