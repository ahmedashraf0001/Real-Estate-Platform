'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Copy, MoreHorizontal, Pencil, Plus, Redo2, Trash2, Undo2 } from 'lucide-react';
import type { ZoneInstance } from '@/lib/layering/instances';
import type { BuildingUnitItem } from '@/lib/supabase/types';
import { zoneLabel } from '@/lib/layering/labels';
import { buildingFloorKey, floorLabel, type BlueprintView } from '@/lib/layering/buildingBlueprint';
import {
  blueprintKeyboardCommand, createBlueprintHistory, pushBlueprintHistory, sealBlueprintHistory, undoBlueprintHistory, redoBlueprintHistory, findZone, createUnit, createZone, deleteFloor, duplicateFloor, duplicateZone, insertZone, isUnitLocked,
  listFloorKeys, lockedUnitsOnFloor, moveIdToTarget, nextFloorKey, nextUnitCode, removeZoneById, reorderZones,
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
  selectedId: string | null;
}

const nextOrder = (list: ZoneInstance[]) => list.reduce((max, z) => Math.max(max, z.sort_order), 0) + 1;

/** Admin edit controls layered on the shared building drawing. Inert when `edit` is absent (public page). */
export function useBlueprintEditing({ edit, zones, inventory, isAr, view, onViewChange, onSelect, selectedId }: Args) {
  const text = (ar: string, en: string) => isAr ? ar : en;
  const [history, setHistory] = useState(() => createBlueprintHistory({ zones, pending: [] as string[] }));
  const historyRef = useRef(history);
  const expected = useRef(zones);
  const field = useRef<string | undefined>(undefined);
  const focusSequence = useRef(0);
  const pending = history.present.pending;
  useLayoutEffect(() => {
    if (!edit || zones === expected.current) return;
    expected.current = zones;
    const fresh = createBlueprintHistory({ zones, pending: [] as string[] });
    historyRef.current = fresh; setHistory(fresh);
    setPicker(null); setTileMenu(null); setFloorMenu(null); setConfirm(null); setDragState(null); setDropOverId(null); setCustomName(''); endField(); onSelect(null);
  }, [zones, edit, onSelect]);
  const publish = (next: typeof history) => {
    historyRef.current = next; setHistory(next); expected.current = next.present.zones;
    edit?.onChange(next.present.zones);
  };
  const beginField = (event: React.FocusEvent) => {
    const target = event.target as HTMLElement;
    if (target.matches('input, textarea') || target.isContentEditable) field.current = `field-${++focusSequence.current}`;
  };
  const endField = () => { field.current = undefined; historyRef.current = sealBlueprintHistory(historyRef.current); };
  const undo = () => { endField(); publish(undoBlueprintHistory(historyRef.current)); };
  const redo = () => { endField(); publish(redoBlueprintHistory(historyRef.current)); };
  const floors = listFloorKeys(zones, edit ? pending : []);
  const [picker, setPicker] = useState<{ kind: 'shared' | 'room'; list: ZoneInstance[]; parentId?: string } | null>(null);
  const [customName, setCustomName] = useState('');
  const [tileMenu, setTileMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'floor'; id: string } | null>(null);
  const [floorMenu, setFloorMenu] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ id: string; kind: TileKind; groupKey: string } | null>(null);
  const [dropOverId, setDropOverId] = useState<string | null>(null);
  const floorKey = view.mode === 'elevation' ? undefined : view.floorKey;

  const commit = (next: ZoneInstance[], nextPending = historyRef.current.present.pending) => {
    publish(pushBlueprintHistory(historyRef.current, { zones: next, pending: nextPending }, field.current));
    setConfirm(null); setTileMenu(null);
  };
  const floorName = (key: string) => floorLabel(key, isAr);
  const remove = (id: string) => {
    const zone = findZone(zones, id);
    if (!zone || isUnitLocked(zone, inventory)) return;
    (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-blueprint-editor]')?.focus();
    commit(removeZoneById(zones, id)); onSelect(null);
  };
  const duplicate = (id: string) => commit(duplicateZone(zones, id));
  const focusName = (root?: HTMLElement | null) => (root ?? document.querySelector<HTMLElement>('[data-blueprint-editor]'))?.querySelector<HTMLInputElement>('[data-inspector-name]')?.focus();
  const keyboard = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const command = blueprintKeyboardCommand(event, Boolean(target.closest('input, textarea, select, [contenteditable=true]')));
    if (!command) return;
    if (command === 'undo' || command === 'redo') { event.preventDefault(); event.stopPropagation(); command === 'undo' ? undo() : redo(); return; }
    if (target.closest('[data-tile-menu]')) return;
    const wrapper = target.closest<HTMLElement>('[data-editor-tile]');
    const id = wrapper?.dataset.editorTile ?? selectedId;
    if (!id || (!wrapper && (command === 'inspect' || command === 'previous' || command === 'next'))) return;
    event.preventDefault(); event.stopPropagation();
    if (command === 'delete') remove(id);
    if (command === 'duplicate') duplicate(id);
    if (command === 'inspect') { onSelect(id); requestAnimationFrame(() => focusName(target.closest<HTMLElement>('[data-blueprint-editor]'))); }
    if (wrapper && (command === 'previous' || command === 'next')) {
      const tiles = [...wrapper.closest('[data-blueprint-drawing], [data-blueprint-info]')!.querySelectorAll<HTMLElement>('[data-editor-tile]')];
      const next = tiles[Math.max(0, Math.min(tiles.length - 1, tiles.indexOf(wrapper) + (command === 'next' ? 1 : -1)))];
      onSelect(next.dataset.editorTile!); next.querySelector<HTMLButtonElement>('button')?.focus();
    }
  };
  const historyBar = !edit ? null : <div className={styles.historyBar}>
    <button type="button" disabled={!history.past.length} title={text('تراجع', 'Undo')} onClick={undo}><Undo2 size={16} />{text('تراجع', 'Undo')}</button>
    <button type="button" disabled={!history.future.length} title={text('إعادة', 'Redo')} onClick={redo}><Redo2 size={16} />{text('إعادة', 'Redo')}</button>
    <span aria-live="polite">{history.changes} {text('تغييرات', 'changes')}</span>
  </div>;

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
    commit(zones, [...pending, key]);
    onViewChange({ mode: 'floor', floorKey: key });
  };

  const tileControls = (z: ZoneInstance) => !edit ? null : <div className={styles.tileMenu} data-tile-menu>
    <button type="button" className={styles.kebab} aria-label={text('خيارات المساحة', 'Space options')} aria-expanded={tileMenu === z.id} onClick={() => setTileMenu(tileMenu === z.id ? null : z.id)}><MoreHorizontal size={16} /></button>
    {tileMenu === z.id && <div className={styles.typeMenu} role="menu" onKeyDown={e => {
      if (e.key === 'Escape') { e.stopPropagation(); setTileMenu(null); e.currentTarget.parentElement?.querySelector<HTMLButtonElement>('button')?.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        items[(items.indexOf(e.target as HTMLButtonElement) + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
      }
    }}>
      <button type="button" role="menuitem" autoFocus onClick={e => { const root = e.currentTarget.closest<HTMLElement>('[data-blueprint-editor]'); onSelect(z.id); setTileMenu(null); requestAnimationFrame(() => focusName(root)); }}><Pencil size={14} />{text('تعديل', 'Edit')}</button>
      <button type="button" role="menuitem" onClick={() => duplicate(z.id)}><Copy size={14} />{text('نسخ', 'Copy')}</button>
      <button type="button" role="menuitem" disabled={isUnitLocked(z, inventory)} title={isUnitLocked(z, inventory) ? text('الشقة محجوزة أو مباعة ولا يمكن حذفها', 'Reserved or sold units cannot be deleted') : undefined} onClick={() => remove(z.id)}><Trash2 size={14} />{text('حذف', 'Delete')}</button>
    </div>}
  </div>;

  const tileDragProps = (z: ZoneInstance, list: ZoneInstance[], kind: TileKind, groupKey: string) => {
    if (!edit) return {};
    const isOver = dropOverId === z.id && dragState?.kind === kind && dragState?.groupKey === groupKey && dragState?.id !== z.id;
    const isDragging = dragState?.id === z.id;
    return {
      draggable: true,
      className: `${isOver ? styles.dropTarget : ''} ${isDragging ? styles.isDragging : ''}`.trim(),
      'data-drop-target': isOver ? 'true' : undefined,
      'data-is-dragging': isDragging ? 'true' : undefined,
      onDragStart: (e: React.DragEvent) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest?.('[data-tile-menu], input')) {
          e.preventDefault();
          return;
        }
        setDragState({ id: z.id, kind, groupKey });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', z.id);
      },
      onDragOver: (e: React.DragEvent) => {
        if (!dragState) return;
        if (dragState.kind !== kind || dragState.groupKey !== groupKey) return;
        if (dragState.id === z.id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      },
      onDragEnter: (e: React.DragEvent) => {
        if (!dragState) return;
        if (dragState.kind !== kind || dragState.groupKey !== groupKey) return;
        if (dragState.id === z.id) return;
        e.preventDefault();
        setDropOverId(z.id);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (dropOverId === z.id) {
          setDropOverId(null);
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (!dragState) return;
        if (dragState.kind === kind && dragState.groupKey === groupKey && dragState.id !== z.id) {
          const idList = list.map(item => item.id);
          const reordered = moveIdToTarget(idList, dragState.id, z.id);
          commit(reorderZones(zones, reordered));
        }
        setDragState(null);
        setDropOverId(null);
      },
      onDragEnd: () => {
        setDragState(null);
        setDropOverId(null);
      },
    };
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
          commit(duplicateFloor(zones, key, target), [...pending, target]); setFloorMenu(null); onViewChange({ mode: 'floor', floorKey: target });
        }}>{text('تكرار كدور جديد', 'Duplicate as new floor')}</button>
        <button type="button" role="menuitem" className={styles.dangerText} onClick={() => { setConfirm({ kind: 'floor', id: key }); setFloorMenu(null); }}>{text('حذف الدور…', 'Delete floor…')}</button>
      </div>}
      {confirm?.kind === 'floor' && confirm.id === key && <div className={`${styles.confirm} ${styles.floorConfirm}`} role="alertdialog" aria-label={text('تأكيد حذف الدور', 'Confirm floor delete')}>
        <span>{locked.length > 0
          ? text(`لا يمكن حذف الدور: فيه ${locked.length} شقة محجوزة أو مباعة.`, `This floor has ${locked.length} reserved or sold units and cannot be deleted.`)
          : text(`حذف ${floorLabel(key, true)} وكل ما عليه (${count} عنصر)؟`, `Delete ${floorLabel(key, false)} and its ${count} items?`)}</span>
        <div>
          {locked.length === 0 && <button type="button" className={styles.dangerSolid} onClick={() => {
            commit(deleteFloor(zones, key), pending.filter(k => k !== key));
            onViewChange({ mode: 'elevation' });
          }}>{text('حذف', 'Delete')}</button>}
          <button type="button" onClick={() => setConfirm(null)}>{locked.length ? text('حسنًا', 'OK') : text('إلغاء', 'Cancel')}</button>
        </div>
      </div>}
    </>;
  };

  const addFloors = !edit ? null : (
    <div className={styles.addFloors}>
      <button type="button" onClick={() => addFloor('upper')}><Plus size={14} />{text('دور', 'Floor')}</button>
      {!floors.includes('bld_ground') && <button type="button" onClick={() => addFloor('ground')}><Plus size={14} />{text('الدور الأرضي', 'Ground floor')}</button>}
      {!floors.includes('bld_basement') && <button type="button" onClick={() => addFloor('basement')}><Plus size={14} />{text('بدروم', 'Basement')}</button>}
      {!floors.includes('bld_roof') && <button type="button" onClick={() => addFloor('roof')}><Plus size={14} />{text('سطح', 'Roof')}</button>}
    </div>
  );

  const topActions = !edit || !floorKey ? null : <div className={styles.editorActions}>
    <button type="button" className={styles.primaryAction} onClick={() => {
      setPicker({ kind: 'shared', list: zones.filter(z => buildingFloorKey(z) === floorKey && z.zone_template_id !== 'bld.unit') });
    }}><Plus size={16} />{text('مساحة', 'Space')}</button>
    <button type="button" onClick={() => commit([...zones, createUnit(floorKey, nextUnitCode(zones, floorKey), nextOrder(zones.filter(z => buildingFloorKey(z) === floorKey)))])}><Plus size={16} />{text('شقة', 'Unit')}</button>
  </div>;
  return { editing: !!edit, floors, floorName, tileControls, tileDragProps, addSlot, pickerPanel, floorControls, addFloors,
    commit, remove, duplicate, keyboard, beginField, endField, historyBar, topActions };

}
