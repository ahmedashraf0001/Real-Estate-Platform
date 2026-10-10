'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, MoreHorizontal, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import type { ZoneInstance } from '@/lib/layering/instances';
import type { BuildingUnitItem } from '@/lib/supabase/types';
import { zoneLabel } from '@/lib/layering/labels';
import { buildingFloorKey, floorLabel, type BlueprintView } from '@/lib/layering/buildingBlueprint';
import {
  changeZoneType, createUnit, createZone, deleteFloor, duplicateFloor, duplicateZone, insertZone, isUnitLocked,
  listFloorKeys, lockedUnitsOnFloor, moveInList, nextFloorKey, nextUnitCode, removeZoneById, renameZone, reorderZones,
  ROOM_TEMPLATES, SHARED_SPACE_TEMPLATES,
} from '@/lib/layering/blueprintEditor';
import type { ZoneTemplate } from '@/lib/layering/templates';
import styles from './BuildingBlueprintPreview.module.css';

export interface BlueprintEditing {
  onChange: (zones: ZoneInstance[]) => void;
}

type TileKind = 'shared' | 'room' | 'unit';

interface Args {
  edit?: BlueprintEditing;
  zones: ZoneInstance[];
  inventory: BuildingUnitItem[];
  isAr: boolean;
  view: BlueprintView;
  onViewChange: (view: BlueprintView) => void;
  onSelect: (id: string | null) => void;
}

const nextOrder = (list: ZoneInstance[]) => list.reduce((max, z) => Math.max(max, z.sort_order), 0) + 1;

/** Admin edit controls layered on the shared building drawing. Inert when `edit` is absent (public page). */
export function useBlueprintEditing({ edit, zones, inventory, isAr, view, onViewChange, onSelect }: Args) {
  const text = (ar: string, en: string) => isAr ? ar : en;
  const [pending, setPending] = useState<string[]>([]);
  const floors = listFloorKeys(zones, edit ? pending : []);
  const [picker, setPicker] = useState<{ kind: 'shared' | 'room'; list: ZoneInstance[]; parentId?: string } | null>(null);
  const [customName, setCustomName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [typeMenu, setTypeMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'zone' | 'floor'; id: string } | null>(null);
  const [floorMenu, setFloorMenu] = useState<string | null>(null);
  const floorKey = view.mode === 'elevation' ? undefined : view.floorKey;

  const commit = (next: ZoneInstance[]) => { edit?.onChange(next); setConfirm(null); setTypeMenu(null); };

  const add = (template?: ZoneTemplate) => {
    if (!picker) return;
    const label = template ? undefined : customName.trim();
    if (!template && !label) return;
    const zone = createZone({ templateId: template?.id, label, floorKey: picker.kind === 'room' ? undefined : floorKey, sortOrder: nextOrder(picker.list) });
    commit(insertZone(zones, zone, picker.parentId));
    setPicker(null); setCustomName(''); onSelect(zone.id);
  };

  const addFloor = (kind: 'upper' | 'ground' | 'basement' | 'roof') => {
    const key = nextFloorKey(floors, kind);
    if (!key) return;
    setPending(p => [...p, key]);
    onViewChange({ mode: 'floor', floorKey: key });
  };

  const saveRename = () => { if (renaming) commit(renameZone(zones, renaming.id, renaming.value)); setRenaming(null); };

  /** Rename field shown in place of a tile's content while renaming. */
  const renameField = (z: ZoneInstance) => renaming?.id !== z.id ? null : (
    <input className={styles.renameInput} autoFocus aria-label={text('الاسم الجديد', 'New name')} value={renaming.value}
      onChange={e => setRenaming({ id: z.id, value: e.target.value })} onBlur={saveRename}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveRename(); } if (e.key === 'Escape') setRenaming(null); }} />
  );

  const tileControls = (z: ZoneInstance, list: ZoneInstance[], kind: TileKind) => {
    if (!edit) return null;
    const index = list.indexOf(z);
    const locked = isUnitLocked(z, inventory);
    const templates = kind === 'room' ? ROOM_TEMPLATES : SHARED_SPACE_TEMPLATES;
    const move = (delta: -1 | 1) => commit(reorderZones(zones, moveInList(list.map(x => x.id), z.id, delta)));
    return <>
      <div className={styles.tileActions}>
        <button type="button" title={text('إعادة التسمية', 'Rename')} aria-label={text('إعادة التسمية', 'Rename')} onClick={() => setRenaming({ id: z.id, value: kind === 'unit' ? (z.unit?.unit_code ?? z.instance_label ?? '') : zoneLabel(z, isAr) })}><Pencil size={13} /></button>
        {kind !== 'unit' && <button type="button" title={text('تغيير النوع', 'Change type')} aria-label={text('تغيير النوع', 'Change type')} aria-expanded={typeMenu === z.id} onClick={() => setTypeMenu(typeMenu === z.id ? null : z.id)}><Settings2 size={13} /></button>}
        <button type="button" title={text('تكرار', 'Duplicate')} aria-label={text('تكرار', 'Duplicate')} onClick={() => commit(duplicateZone(zones, z.id))}><Copy size={13} /></button>
        <button type="button" title={text('نقل للأمام', 'Move earlier')} aria-label={text('نقل للأمام', 'Move earlier')} disabled={index <= 0} onClick={() => move(-1)}>{isAr ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}</button>
        <button type="button" title={text('نقل للخلف', 'Move later')} aria-label={text('نقل للخلف', 'Move later')} disabled={index >= list.length - 1} onClick={() => move(1)}>{isAr ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}</button>
        <button type="button" className={styles.dangerIcon} disabled={locked}
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
    </>;
  };

  const addSlot = (kind: 'shared' | 'room' | 'unit', list: ZoneInstance[], parentId?: string) => !edit ? null : (
    <button type="button" className={styles.addSlot} onClick={() => {
      if (kind === 'unit') { if (floorKey) commit([...zones, createUnit(floorKey, nextUnitCode(zones, floorKey), nextOrder(list))]); }
      else setPicker({ kind, list, parentId });
    }}><Plus size={16} />{kind === 'unit' ? text('شقة', 'Unit') : kind === 'room' ? text('غرفة', 'Room') : text('مساحة مشتركة', 'Shared space')}</button>
  );

  const pickerPanel = !edit || !picker ? null : (
    <div className={styles.picker} role="dialog" aria-label={picker.kind === 'room' ? text('إضافة غرفة', 'Add room') : text('إضافة مساحة', 'Add space')}>
      <header><strong>{picker.kind === 'room' ? text('إضافة غرفة', 'Add a room') : text(`إضافة مساحة إلى ${floorKey ? floorLabel(floorKey, true) : ''}`, `Add a space to ${floorKey ? floorLabel(floorKey, false) : ''}`)}</strong>
        <button type="button" aria-label={text('إغلاق', 'Close')} onClick={() => setPicker(null)}>✕</button></header>
      <div className={styles.chips}>
        {(picker.kind === 'room' ? ROOM_TEMPLATES : SHARED_SPACE_TEMPLATES).map(t => <button type="button" key={t.id} onClick={() => add(t)}>{isAr ? t.label_ar : t.label_en}</button>)}
      </div>
      <div className={styles.custom}>
        <label htmlFor="bp-custom-name">{text('أو اسم مخصص', 'Or a custom name')}</label>
        <input id="bp-custom-name" value={customName} onChange={e => setCustomName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={text('مثال: مصلى، غرفة اجتماعات', 'e.g. Prayer room, Meeting room')} />
        <button type="button" disabled={!customName.trim()} onClick={() => add()}>{text('إضافة', 'Add')}</button>
      </div>
    </div>
  );

  const floorControls = (key: string) => {
    if (!edit) return null;
    const locked = confirm?.kind === 'floor' && confirm.id === key ? lockedUnitsOnFloor(zones, key, inventory) : [];
    const count = zones.filter(z => z.zone_template_id !== 'bld.building' && buildingFloorKey(z) === key).length;
    return <>
      <button type="button" className={styles.kebab} aria-label={text('خيارات الدور', 'Floor options')} aria-expanded={floorMenu === key} onClick={() => setFloorMenu(floorMenu === key ? null : key)}><MoreHorizontal size={16} /></button>
      {floorMenu === key && <div className={styles.floorMenu} role="menu">
        <button type="button" role="menuitem" onClick={() => {
          const target = nextFloorKey(floors, 'upper')!;
          commit(duplicateFloor(zones, key, target)); setFloorMenu(null); onViewChange({ mode: 'floor', floorKey: target });
        }}>{text('تكرار كدور جديد', 'Duplicate as new floor')}</button>
        <button type="button" role="menuitem" className={styles.dangerText} onClick={() => { setConfirm({ kind: 'floor', id: key }); setFloorMenu(null); }}>{text('حذف الدور…', 'Delete floor…')}</button>
      </div>}
      {confirm?.kind === 'floor' && confirm.id === key && <div className={`${styles.confirm} ${styles.floorConfirm}`} role="alertdialog" aria-label={text('تأكيد حذف الدور', 'Confirm floor delete')}>
        <span>{locked.length > 0
          ? text(`لا يمكن حذف الدور: فيه ${locked.length} شقة محجوزة أو مباعة.`, `This floor has ${locked.length} reserved or sold units and cannot be deleted.`)
          : text(`حذف ${floorLabel(key, true)} وكل ما عليه (${count} عنصر)؟`, `Delete ${floorLabel(key, false)} and its ${count} items?`)}</span>
        <div>
          {locked.length === 0 && <button type="button" className={styles.dangerSolid} onClick={() => {
            setPending(p => p.filter(k => k !== key));
            commit(deleteFloor(zones, key));
            onViewChange({ mode: 'elevation' });
          }}>{text('حذف', 'Delete')}</button>}
          <button type="button" onClick={() => setConfirm(null)}>{locked.length ? text('حسنًا', 'OK') : text('إلغاء', 'Cancel')}</button>
        </div>
      </div>}
    </>;
  };

  const addFloors = !edit ? null : (
    <div className={styles.addFloors}>
      <button type="button" onClick={() => addFloor('upper')}><Plus size={14} />{text('دور علوي', 'Upper floor')}</button>
      {!floors.includes('bld_ground') && <button type="button" onClick={() => addFloor('ground')}><Plus size={14} />{text('الدور الأرضي', 'Ground floor')}</button>}
      {!floors.includes('bld_basement') && <button type="button" onClick={() => addFloor('basement')}><Plus size={14} />{text('بدروم', 'Basement')}</button>}
      {!floors.includes('bld_roof') && <button type="button" onClick={() => addFloor('roof')}><Plus size={14} />{text('سطح', 'Roof')}</button>}
    </div>
  );

  return { editing: !!edit, floors, renameField, tileControls, addSlot, pickerPanel, floorControls, addFloors };
}
