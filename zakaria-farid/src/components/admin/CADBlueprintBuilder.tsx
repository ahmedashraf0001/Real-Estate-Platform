'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Building,
  Layers,
  Plus,
  Minus,
  Trash2,
  ChevronDown,
  Search,
  Pencil,
  Undo2,
  Redo2,
  AlertTriangle,
  GripVertical,
  Copy,
  Check,
} from 'lucide-react';
import { ZoneInstance, ZoneSpatialLayout } from '@/lib/layering';
import { ZONE_TEMPLATES, getTradesForZone, getAttributesForTrade } from '@/lib/layering/templates';
import { computeMetricLayout } from '@/lib/layering/floorplanLayout';
import { fallbackMetricFor } from '@/lib/layering/zoneMetrics';

interface CADBlueprintBuilderProps {
  zoneInstances: ZoneInstance[];
  onZoneInstancesChange: (updated: ZoneInstance[]) => void;
  propertyType?: 'apartment' | 'building' | 'garage';
  bedrooms?: number;
  /** Declared property area from wizard Step 1 (m²) — powers the reconciliation bar. */
  declaredArea?: number;
  isAr?: boolean;
}

// Default dimension templates for Egyptian middle-class property types
const DEFAULT_DIMENSIONS: Record<string, { l: number; w: number; ceiling: string; titleEn: string; titleAr: string }> = {
  // ── Apartment (شقة) — typical Egyptian middle-class dimensions ───────────
  'apt.reception':   { l: 6.5, w: 4.8, ceiling: '3.0m Flush',   titleEn: 'Living / Reception',    titleAr: 'الصالة / الاستقبال' },
  'apt.master_bed':  { l: 4.2, w: 3.8, ceiling: '3.0m Flush',   titleEn: 'Master Bedroom',        titleAr: 'غرفة النوم الرئيسية' },
  'apt.master_bath': { l: 2.8, w: 2.2, ceiling: '2.8m Flush',   titleEn: 'Master Bathroom',       titleAr: 'الحمام الملحق' },
  'apt.std_bed':     { l: 3.8, w: 3.2, ceiling: '3.0m Flush',   titleEn: 'Bedroom',               titleAr: 'غرفة نوم' },
  'apt.main_bath':   { l: 2.8, w: 2.0, ceiling: '2.8m Flush',   titleEn: 'Bathroom',              titleAr: 'الحمام' },
  'apt.kitchen':     { l: 3.5, w: 2.8, ceiling: '2.8m Flush',   titleEn: 'Kitchen',               titleAr: 'المطبخ' },
  'apt.balcony':     { l: 4.0, w: 1.5, ceiling: 'Open Sky',     titleEn: 'Balcony',               titleAr: 'البلكونة' },
  'apt.corridor':    { l: 4.5, w: 1.4, ceiling: '3.0m Flush',   titleEn: 'Internal Corridor',     titleAr: 'الردهة الداخلية' },
  'apt.guest_bath':  { l: 2.2, w: 1.6, ceiling: '2.8m Flush',   titleEn: 'Guest Toilet',          titleAr: 'حمام الضيوف' },
  'apt.laundry':     { l: 2.5, w: 2.0, ceiling: '2.8m Flush',   titleEn: 'Laundry / Storage',     titleAr: 'غرفة الغسيل / المخزن' },
  // ── Building (عمارة) zones ──────────────────────────────────────────────
  'bld.basement':       { l: 20.0, w: 12.0, ceiling: '2.8m Low',     titleEn: 'Basement / Parking',        titleAr: 'البدروم / الجراج' },
  'bld.ground_lobby':   { l: 20.0, w: 12.0, ceiling: '3.2m Flush',   titleEn: 'Ground Floor & Entrance',   titleAr: 'الدور الأرضي والمدخل' },
  'bld.typical_floors': { l: 20.0, w: 12.0, ceiling: '3.0m Flush',   titleEn: 'Typical Floor (per floor)', titleAr: 'الدور المتكرر (لكل دور)' },
  'bld.roof':           { l: 20.0, w: 12.0, ceiling: 'Open Roof',    titleEn: 'Roof & Water Tanks',        titleAr: 'السطح وخزانات المياه' },
  // ── Garage (جراج) zones ─────────────────────────────────────────────────
  'grg.ramp':  { l: 6.0, w: 3.5, ceiling: '2.8m Low',  titleEn: 'Ramp & Gate',    titleAr: 'الرامب والبوابة' },
  'grg.bay':   { l: 5.5, w: 2.5, ceiling: '2.8m Low',  titleEn: 'Parking Bay',    titleAr: 'باكية الجراج' },
  'grg.elec':  { l: 2.0, w: 1.5, ceiling: '2.8m Low',  titleEn: 'Electrical Box', titleAr: 'لوحة الكهرباء' },
};

// ── Smart per-type default dimensions on add (spec §8 Phase 1, §4.1) ─────────
// Sensible medians used when a room is added; covers all 10 apartment template
// types plus building/garage. Falls back to DEFAULT_DIMENSIONS l/w when absent.
const STARTER_DEFAULTS: Record<string, { l: number; w: number }> = {
  'apt.reception':   { l: 5.0, w: 4.0 },
  'apt.master_bed':  { l: 4.5, w: 4.0 },
  'apt.master_bath': { l: 2.6, w: 2.0 },
  'apt.std_bed':     { l: 3.5, w: 3.2 },
  'apt.main_bath':   { l: 2.4, w: 1.8 },
  'apt.kitchen':     { l: 3.4, w: 2.8 },
  'apt.balcony':     { l: 4.0, w: 1.5 },
  'apt.corridor':    { l: 4.0, w: 1.4 },
  'apt.guest_bath':  { l: 1.6, w: 1.2 },
  'apt.laundry':     { l: 2.4, w: 2.0 },
  'bld.basement':       { l: 20.0, w: 12.0 },
  'bld.ground_lobby':   { l: 20.0, w: 12.0 },
  'bld.typical_floors': { l: 20.0, w: 12.0 },
  'bld.roof':           { l: 20.0, w: 12.0 },
  'grg.ramp':  { l: 6.0, w: 3.5 },
  'grg.bay':   { l: 5.5, w: 2.5 },
  'grg.elec':  { l: 2.0, w: 1.5 },
};

function starterDims(templateId: string): { l: number; w: number } {
  const s = STARTER_DEFAULTS[templateId];
  if (s) return s;
  const d = DEFAULT_DIMENSIONS[templateId];
  return { l: d?.l ?? 4.0, w: d?.w ?? 3.0 };
}

// ── Add-room menu groups (spec §4.1) — apartment templates grouped ──────────
interface AddGroup {
  key: string;
  labelEn: string;
  labelAr: string;
  templateIds: string[];
}

const ADD_GROUPS: Record<'apartment' | 'building' | 'garage', AddGroup[]> = {
  apartment: [
    { key: 'living',   labelEn: 'Living',   labelAr: 'المعيشة',   templateIds: ['apt.reception', 'apt.corridor'] },
    { key: 'sleeping', labelEn: 'Sleeping', labelAr: 'غرف النوم', templateIds: ['apt.master_bed', 'apt.std_bed'] },
    { key: 'wet',      labelEn: 'Wet',      labelAr: 'مناطق رطبة', templateIds: ['apt.master_bath', 'apt.main_bath', 'apt.guest_bath', 'apt.kitchen'] },
    { key: 'service',  labelEn: 'Service',  labelAr: 'خدمات',     templateIds: ['apt.laundry'] },
    { key: 'outdoor',  labelEn: 'Outdoor',  labelAr: 'خارجي',     templateIds: ['apt.balcony'] },
  ],
  building: [
    { key: 'floors', labelEn: 'Floors & Zones', labelAr: 'الأدوار والمناطق', templateIds: ['bld.basement', 'bld.ground_lobby', 'bld.typical_floors', 'bld.roof'] },
  ],
  garage: [
    { key: 'garage', labelEn: 'Garage Zones', labelAr: 'مناطق الجراج', templateIds: ['grg.ramp', 'grg.bay', 'grg.elec'] },
  ],
};

// ── Starter presets (spec §2b, §4.6) ─────────────────────────────────────────
interface StarterPreset {
  id: string;
  labelEn: string;
  labelAr: string;
  subEn: string;
  subAr: string;
  approxSqm: number;
  // template ids to instantiate, in order
  rooms: string[];
}

const STARTER_PRESETS: StarterPreset[] = [
  {
    id: 'apartment',
    labelEn: 'Apartment', labelAr: 'شقة',
    subEn: '2BR · 2BA', subAr: 'غرفتان · حمامان',
    approxSqm: 96,
    rooms: ['apt.reception', 'apt.kitchen', 'apt.master_bed', 'apt.std_bed', 'apt.master_bath', 'apt.main_bath', 'apt.balcony'],
  },
  {
    id: 'villa',
    labelEn: 'Villa', labelAr: 'فيلا',
    subEn: '4BR · 3BA', subAr: '٤ غرف · ٣ حمامات',
    approxSqm: 240,
    rooms: ['apt.reception', 'apt.kitchen', 'apt.master_bed', 'apt.std_bed', 'apt.std_bed', 'apt.std_bed', 'apt.master_bath', 'apt.main_bath', 'apt.guest_bath', 'apt.corridor', 'apt.balcony', 'apt.laundry'],
  },
  {
    id: 'chalet',
    labelEn: 'Chalet', labelAr: 'شاليه',
    subEn: '1BR · 1BA', subAr: 'غرفة · حمام',
    approxSqm: 55,
    rooms: ['apt.reception', 'apt.kitchen', 'apt.master_bed', 'apt.main_bath', 'apt.balcony'],
  },
];

// Recommend the preset matching wizard Step-1 type + bedroom count.
function recommendedPresetId(propertyType: string, bedrooms: number): string | null {
  if (propertyType !== 'apartment') return null;
  if (bedrooms >= 4) return 'villa';
  if (bedrooms <= 1) return 'chalet';
  return 'apartment';
}

// Floor plan slot configurations for continuous shared partition walls
interface RoomSlot {
  xF: number;
  yF: number;
  wF: number;
  hF: number;
}

const FLOOR_PLAN_TEMPLATES: Record<number, RoomSlot[]> = {
  1: [{ xF: 0.08, yF: 0.08, wF: 0.84, hF: 0.84 }],
  2: [
    { xF: 0.08, yF: 0.08, wF: 0.46, hF: 0.84 },
    { xF: 0.54, yF: 0.08, wF: 0.38, hF: 0.84 },
  ],
  3: [
    { xF: 0.08, yF: 0.08, wF: 0.48, hF: 0.84 },
    { xF: 0.56, yF: 0.08, wF: 0.36, hF: 0.44 },
    { xF: 0.56, yF: 0.52, wF: 0.36, hF: 0.40 },
  ],
  4: [
    { xF: 0.08, yF: 0.08, wF: 0.32, hF: 0.84 },
    { xF: 0.40, yF: 0.08, wF: 0.52, hF: 0.44 },
    { xF: 0.40, yF: 0.52, wF: 0.28, hF: 0.40 },
    { xF: 0.68, yF: 0.52, wF: 0.24, hF: 0.40 },
  ],
  5: [
    { xF: 0.08, yF: 0.08, wF: 0.28, hF: 0.44 },
    { xF: 0.36, yF: 0.08, wF: 0.56, hF: 0.44 },
    { xF: 0.08, yF: 0.52, wF: 0.38, hF: 0.40 },
    { xF: 0.46, yF: 0.52, wF: 0.18, hF: 0.40 },
    { xF: 0.64, yF: 0.52, wF: 0.28, hF: 0.40 },
  ],
  6: [
    { xF: 0.08, yF: 0.08, wF: 0.26, hF: 0.44 },
    { xF: 0.34, yF: 0.08, wF: 0.30, hF: 0.44 },
    { xF: 0.64, yF: 0.08, wF: 0.28, hF: 0.44 },
    { xF: 0.08, yF: 0.52, wF: 0.26, hF: 0.40 },
    { xF: 0.34, yF: 0.52, wF: 0.30, hF: 0.40 },
    { xF: 0.64, yF: 0.52, wF: 0.28, hF: 0.40 },
  ],
};

function getFloorPlanSlots(count: number): RoomSlot[] {
  if (FLOOR_PLAN_TEMPLATES[count]) return FLOOR_PLAN_TEMPLATES[count];
  const slots: RoomSlot[] = [];
  const cols = count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    slots.push({
      xF: 0.08 + col * (0.84 / cols),
      yF: 0.08 + row * (0.84 / rows),
      wF: 0.84 / cols,
      hF: 0.84 / rows,
    });
  }
  return slots;
}

const CEILING_OPTIONS: Array<{ value: string; en: string; ar: string }> = [
  { value: '2.6m Flush', en: '2.6 m', ar: '٢.٦ م' },
  { value: '2.8m Flush', en: '2.8 m', ar: '٢.٨ م' },
  { value: '3.0m Flush', en: '3.0 m', ar: '٣.٠ م' },
  { value: '3.2m Flush', en: '3.2 m', ar: '٣.٢ م' },
  { value: '3.5m Flush', en: '3.5 m', ar: '٣.٥ م' },
  { value: '4.0m Flush', en: '4.0 m+', ar: '٤.٠ م+' },
  { value: 'Open Sky', en: 'Open Sky', ar: 'مفتوح' },
  { value: 'Open Roof', en: 'Open Roof', ar: 'سطح مفتوح' },
];

const WARN_BANDS: Record<string, [number, number]> = {
  'apt.reception':   [9, 80],
  'apt.master_bed':  [9, 40],
  'apt.std_bed':     [9, 40],
  'apt.master_bath': [1.5, 15],
  'apt.main_bath':   [1.5, 15],
  'apt.guest_bath':  [1, 6],
  'apt.kitchen':     [4, 30],
  'apt.balcony':     [1, 30],
  'apt.corridor':    [1, 25],
  'apt.laundry':     [1, 20],
};

type WarnState = 'ok' | 'low' | 'high';

function warnFor(templateId: string, sqm: number): WarnState {
  const band = WARN_BANDS[templateId];
  if (!band) return 'ok';
  if (sqm < band[0]) return 'low';
  if (sqm > band[1]) return 'high';
  return 'ok';
}

const GROUND_KEY = '__ground__';

function floorKeyOf(z: ZoneInstance): string {
  return z.level_label?.trim() || GROUND_KEY;
}

function floorLabelFor(key: string, isAr: boolean): string {
  if (key === GROUND_KEY) return isAr ? 'الأرضي' : 'Ground';
  return key;
}

// Normalize Arabic-Indic digits and decimal separator to ASCII for parsing.
function normalizeNumeric(raw: string): string {
  const map: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '٫': '.', '،': '.',
  };
  return raw.replace(/[٠-٩٫،]/g, (c) => map[c] ?? c);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ─── DimStepper (spec §3 row 8, §6.1) ──────────────────────────────────────
interface DimStepperProps {
  value: number;
  onChange: (next: number) => void;
  label: string;
  ariaLabel: string;
  isAr: boolean;
  onFocus?: () => void;
}

const DimStepper: React.FC<DimStepperProps> = ({ value, onChange, label, ariaLabel, isAr, onFocus }) => {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseFloat(normalizeNumeric(raw));
    if (isNaN(parsed) || parsed <= 0) {
      // Hard block ≤0/NaN — revert to last valid value with a brief shake.
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(0.1, round1(parsed));
    onChange(clamped);
    setDraft(String(clamped));
  };

  const nudge = (delta: number) => {
    const next = Math.max(0.1, round1(value + delta));
    onChange(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      nudge(e.shiftKey ? 1.0 : 0.1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nudge(e.shiftKey ? -1.0 : -0.1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit((e.target as HTMLInputElement).value);
    }
  };

  return (
    <div className="fp-stepper" onFocus={onFocus}>
      <span className="fp-stepper-label" aria-hidden="true">{label}</span>
      <button
        type="button"
        className="fp-stepper-btn"
        aria-label={isAr ? `إنقاص ${ariaLabel}` : `Decrease ${ariaLabel}`}
        tabIndex={-1}
        onClick={() => nudge(-0.1)}
      >
        <Minus size={13} />
      </button>
      <span className="fp-stepper-value" dir="ltr">
        <input
          className="fp-stepper-input"
          type="text"
          inputMode="decimal"
          aria-label={ariaLabel}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={(e) => { e.target.select(); onFocus?.(); }}
        />
        <span className="fp-stepper-unit">m</span>
      </span>
      <button
        type="button"
        className="fp-stepper-btn"
        aria-label={isAr ? `زيادة ${ariaLabel}` : `Increase ${ariaLabel}`}
        tabIndex={-1}
        onClick={() => nudge(0.1)}
      >
        <Plus size={13} />
      </button>
    </div>
  );
};

// ─── RoomListRow (spec §6) ──────────────────────────────────────────────────
interface RoomListRowProps {
  room: ZoneInstance;
  selected: boolean;
  labelName: string;
  widthM: number;
  lengthM: number;
  sqm: number;
  ceiling: string;
  warn: WarnState;
  isAr: boolean;
  rowRef: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  onPatch: (updates: Partial<ZoneSpatialLayout>) => void;
  onRename: (next: string) => void;
  onDelete: () => void;
  onArrow: (dir: -1 | 1) => void;
  onReorder: (dir: -1 | 1) => void;
  onDragStart: (e: React.PointerEvent) => void;
}

const RoomListRow: React.FC<RoomListRowProps> = ({
  room, selected, labelName, widthM, lengthM, sqm, ceiling, warn, isAr,
  rowRef, onSelect, onPatch, onRename, onDelete, onArrow, onReorder, onDragStart,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(labelName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftName(labelName);
  }, [labelName]);

  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  const commitName = () => {
    const trimmed = draftName.trim().slice(0, 40);
    onRename(trimmed);
    setEditingName(false);
  };

  const onRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const inField = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
    if (inField) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') { e.preventDefault(); onReorder(1); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') { e.preventDefault(); onReorder(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); onArrow(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); onArrow(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const firstStepper = e.currentTarget.querySelector<HTMLInputElement>('.fp-stepper-input');
      firstStepper?.focus();
    }
    else if (e.key === 'F2') { e.preventDefault(); setEditingName(true); }
    else if (e.key === 'Delete') { e.preventDefault(); onDelete(); }
    else if (e.key === 'Escape') { e.preventDefault(); (e.currentTarget as HTMLDivElement).blur(); }
  };

  return (
    <div
      ref={rowRef}
      className={`fp-row ${selected ? 'selected' : ''}`}
      tabIndex={0}
      role="listitem"
      aria-selected={selected}
      onClick={onSelect}
      onFocus={onSelect}
      onKeyDown={onRowKeyDown}
    >
      <div className="fp-row-line1">
        <span
          className="fp-row-drag"
          title={isAr ? 'اسحب لإعادة الترتيب — الترتيب يظهر في الإعلان' : 'Drag to reorder — order shown on the listing'}
          onPointerDown={onDragStart}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={13} />
        </span>
        <span className="fp-row-icon" aria-hidden="true"><Building size={14} /></span>
        {editingName ? (
          <input
            ref={nameInputRef}
            className="fp-row-name-input"
            dir="auto"
            maxLength={40}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitName(); }
              else if (e.key === 'Escape') { e.preventDefault(); setDraftName(labelName); setEditingName(false); }
            }}
          />
        ) : (
          <span
            className="fp-row-name"
            dir="auto"
            title={labelName}
            onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}
          >
            {labelName}
          </span>
        )}
        {!editingName && (
          <button
            type="button"
            className="fp-row-edit"
            aria-label={isAr ? 'إعادة تسمية الغرفة' : 'Rename room'}
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); setEditingName(true); }}
          >
            <Pencil size={12} />
          </button>
        )}
        {warn !== 'ok' && (
          <span
            className="fp-row-warn"
            title={isAr
              ? (warn === 'low' ? 'أصغر من المعتاد لهذا النوع — تأكد من القياسات' : 'أكبر من المعتاد لهذا النوع — تأكد من القياسات')
              : (warn === 'low' ? 'Unusually small for this room type — double-check' : 'Unusually large for this room type — double-check')}
          >
            <AlertTriangle size={13} />
          </span>
        )}
        <span className={`fp-row-area ${selected ? 'gold' : ''}`}>{round1(sqm)} m²</span>
      </div>

      <div className="fp-row-line2">
        <DimStepper
          value={widthM}
          onChange={(v) => onPatch({ width_m: v })}
          label={isAr ? 'ع' : 'W'}
          ariaLabel={isAr ? 'العرض بالمتر' : 'Width in meters'}
          isAr={isAr}
          onFocus={onSelect}
        />
        <DimStepper
          value={lengthM}
          onChange={(v) => onPatch({ length_m: v })}
          label={isAr ? 'ط' : 'L'}
          ariaLabel={isAr ? 'الطول بالمتر' : 'Length in meters'}
          isAr={isAr}
          onFocus={onSelect}
        />
      </div>

      {selected && (
        <div className="fp-row-line3">
          <label className="fp-ceiling">
            <span className="fp-ceiling-label">{isAr ? 'الارتفاع' : 'Ceiling'}</span>
            <select
              className="fp-ceiling-select"
              value={ceiling}
              onChange={(e) => onPatch({ ceiling_height: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            >
              {CEILING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{isAr ? o.ar : o.en}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="fp-row-delete"
            aria-label={isAr ? 'حذف الغرفة' : 'Delete room'}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

export const CADBlueprintBuilder: React.FC<CADBlueprintBuilderProps> = ({
  zoneInstances,
  onZoneInstancesChange,
  propertyType = 'apartment',
  bedrooms = 2,
  declaredArea,
  isAr = false,
}) => {
  const defaultKey = propertyType === 'building' ? 'bld_ground' : propertyType === 'garage' ? 'grg_ramp' : GROUND_KEY;
  const [activeFloorKey, setActiveFloorKey] = useState<string>(defaultKey);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addFilter, setAddFilter] = useState('');
  const [dismissedPresets, setDismissedPresets] = useState<Record<string, boolean>>({});
  const [extraFloors, setExtraFloors] = useState<string[]>([]);
  const [floorMenuOpen, setFloorMenuOpen] = useState(false);
  const [renamingFloorKey, setRenamingFloorKey] = useState<string | null>(null);
  const [floorDraft, setFloorDraft] = useState('');
  const [toast, setToast] = useState<{ label: string } | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [dragState, setDragState] = useState<{ id: string; overIndex: number } | null>(null);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const addMenuRef = useRef<HTMLDivElement>(null);
  const floorMenuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ past: ZoneInstance[][]; future: ZoneInstance[][] }>({ past: [], future: [] });
  const burstTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const zonesRef = useRef(zoneInstances);
  zonesRef.current = zoneInstances;

  const bumpHistory = () => setHistoryVersion(v => v + 1);

  const pushHistory = useCallback((snapshot: ZoneInstance[]) => {
    const h = historyRef.current;
    h.past.push(snapshot);
    if (h.past.length > 50) h.past.shift();
    h.future = [];
    bumpHistory();
  }, []);

  // Debounced snapshots for stepper bursts: one undo step per 500ms burst.
  const pushHistoryBurst = useCallback((snapshot: ZoneInstance[]) => {
    if (burstTimerRef.current === null) {
      pushHistory(snapshot);
    } else {
      window.clearTimeout(burstTimerRef.current);
    }
    burstTimerRef.current = window.setTimeout(() => { burstTimerRef.current = null; }, 500);
  }, [pushHistory]);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((label: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ label });
    toastTimerRef.current = window.setTimeout(() => { toastTimerRef.current = null; setToast(null); }, 6000);
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    const prev = h.past.pop()!;
    h.future.push(zonesRef.current);
    onZoneInstancesChange(prev);
    dismissToast();
    bumpHistory();
  }, [onZoneInstancesChange, dismissToast]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    const next = h.future.pop()!;
    h.past.push(zonesRef.current);
    onZoneInstancesChange(next);
    dismissToast();
    bumpHistory();
  }, [onZoneInstancesChange, dismissToast]);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;
  void historyVersion;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k !== 'z' && k !== 'y') return;
      const rootEl = rootRef.current;
      const target = e.target as HTMLElement;
      if (!rootEl || !rootEl.contains(target)) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      e.preventDefault();
      if (k === 'y' || (k === 'z' && e.shiftKey)) redo();
      else undo();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  useEffect(() => {
    setActiveFloorKey(defaultKey);
    setSelectedZoneId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyType]);

  useEffect(() => {
    if (!addMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAddMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [addMenuOpen]);

  useEffect(() => {
    if (!floorMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (floorMenuRef.current && !floorMenuRef.current.contains(e.target as Node)) setFloorMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFloorMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [floorMenuOpen]);

  const floorGroups = useMemo(() => {
    const groups: Record<string, { labelEn: string; labelAr: string; zones: ZoneInstance[] }> = {};

    function flatZones(list: ZoneInstance[]): ZoneInstance[] {
      const result: ZoneInstance[] = [];
      for (const z of list) {
        if (z.children && z.children.length > 0) result.push(...flatZones(z.children));
        else result.push(z);
      }
      return result;
    }

    const flat = flatZones(zoneInstances);

    if (propertyType === 'apartment') {
      groups[GROUND_KEY] = { labelEn: floorLabelFor(GROUND_KEY, false), labelAr: floorLabelFor(GROUND_KEY, true), zones: [] };
      for (const z of flat) {
        const key = floorKeyOf(z);
        if (!groups[key]) {
          groups[key] = { labelEn: floorLabelFor(key, false), labelAr: floorLabelFor(key, true), zones: [] };
        }
        groups[key].zones.push(z);
      }
      for (const key of extraFloors) {
        if (!groups[key]) {
          groups[key] = { labelEn: key, labelAr: key, zones: [] };
        }
      }
      for (const g of Object.values(groups)) {
        g.zones.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      }
    } else if (propertyType === 'building') {
      groups['bld_basement'] = { labelEn: 'Basement / Parking', labelAr: 'البدروم والجراج', zones: [] };
      groups['bld_ground']   = { labelEn: 'Ground Floor & Entrance', labelAr: 'الدور الأرضي والمدخل', zones: [] };
      groups['bld_floors']   = { labelEn: 'Typical Floors & Stairwell', labelAr: 'الأدوار المتكررة والسلم', zones: [] };
      groups['bld_roof']     = { labelEn: 'Roof & Water Tanks', labelAr: 'السطح وخزانات المياه', zones: [] };
      for (const z of flat) {
        const t = z.zone_template_id;
        if (t === 'bld.basement')            groups['bld_basement'].zones.push(z);
        else if (t === 'bld.ground_lobby')   groups['bld_ground'].zones.push(z);
        else if (t === 'bld.typical_floors') groups['bld_floors'].zones.push(z);
        else if (t === 'bld.roof')           groups['bld_roof'].zones.push(z);
        else                                 groups['bld_ground'].zones.push(z);
      }
    } else if (propertyType === 'garage') {
      groups['grg_ramp'] = { labelEn: 'Ramp & Gate', labelAr: 'الرامب والبوابة', zones: [] };
      groups['grg_bays'] = { labelEn: 'Parking Bays & Electrical', labelAr: 'الباكيات والكهرباء', zones: [] };
      for (const z of flat) {
        const t = z.zone_template_id;
        if (t === 'grg.ramp') groups['grg_ramp'].zones.push(z);
        else                  groups['grg_bays'].zones.push(z);
      }
    }

    return groups;
  }, [zoneInstances, propertyType, extraFloors]);

  const spatialOf = useCallback((z: ZoneInstance) => {
    const shared = fallbackMetricFor(z.zone_template_id);
    const d = starterDims(z.zone_template_id);
    const l = z.spatial?.length_m ?? shared?.length_m ?? d.l;
    const w = z.spatial?.width_m ?? shared?.width_m ?? d.w;
    const sqm = z.spatial?.sqm ?? shared?.sqm ?? Math.round(l * w);
    const ceiling = z.spatial?.ceiling_height ?? shared?.ceiling ?? DEFAULT_DIMENSIONS[z.zone_template_id]?.ceiling ?? '3.0m Flush';
    return { l, w, sqm, ceiling };
  }, []);

  const floorSqm = useCallback((zones: ZoneInstance[]) => {
    return Math.round(zones.reduce((sum, z) => sum + spatialOf(z).sqm, 0));
  }, [spatialOf]);

  const activeZones = useMemo(() => {
    const group = floorGroups[activeFloorKey];
    return group ? group.zones : [];
  }, [floorGroups, activeFloorKey]);

  const currentSelectedZone = useMemo(() => {
    if (!selectedZoneId) return null;
    return activeZones.find(z => z.id === selectedZoneId) || null;
  }, [selectedZoneId, activeZones]);

  const getZoneLabel = useCallback((z: ZoneInstance) => {
    if (z.instance_label && z.instance_label.trim()) return z.instance_label;
    const def = DEFAULT_DIMENSIONS[z.zone_template_id];
    if (def) return isAr ? def.titleAr : def.titleEn;
    const tmpl = ZONE_TEMPLATES.find(t => t.id === z.zone_template_id);
    return isAr ? (tmpl?.label_ar || z.zone_template_id) : (tmpl?.label_en || z.zone_template_id);
  }, [isAr]);

  const handleUpdateSpatial = (zoneId: string, updates: Partial<ZoneSpatialLayout>) => {
    function updateRecursive(list: ZoneInstance[]): ZoneInstance[] {
      return list.map(z => {
        if (z.id === zoneId) {
          const shared = fallbackMetricFor(z.zone_template_id);
          const d = starterDims(z.zone_template_id);
          const currentSpatial: ZoneSpatialLayout = z.spatial || {
            gridX: 0,
            gridY: 0,
            gridW: 6,
            gridH: 4,
            length_m: shared?.length_m ?? d.l,
            width_m: shared?.width_m ?? d.w,
            sqm: shared?.sqm ?? Math.round(d.l * d.w),
            ceiling_height: shared?.ceiling ?? DEFAULT_DIMENSIONS[z.zone_template_id]?.ceiling ?? '3.0m Flush',
          };
          const nextSpatial = { ...currentSpatial, ...updates };
          if (updates.length_m !== undefined || updates.width_m !== undefined) {
            const l = updates.length_m ?? currentSpatial.length_m;
            const w = updates.width_m ?? currentSpatial.width_m;
            nextSpatial.sqm = round1(l * w);
          }
          return { ...z, spatial: nextSpatial };
        }
        if (z.children && z.children.length > 0) {
          return { ...z, children: updateRecursive(z.children) };
        }
        return z;
      });
    }
    pushHistoryBurst(zoneInstances);
    onZoneInstancesChange(updateRecursive(zoneInstances));
  };

  const handleRenameRoom = (zoneId: string, nextLabel: string) => {
    const def = DEFAULT_DIMENSIONS[zoneId];
    function renameRecursive(list: ZoneInstance[]): ZoneInstance[] {
      return list.map(z => {
        if (z.id === zoneId) {
          const fallback = def ? (isAr ? def.titleAr : def.titleEn) : undefined;
          return { ...z, instance_label: nextLabel || fallback };
        }
        if (z.children && z.children.length > 0) return { ...z, children: renameRecursive(z.children) };
        return z;
      });
    }
    pushHistory(zoneInstances);
    onZoneInstancesChange(renameRecursive(zoneInstances));
  };

  // Single construction path shared by add-room and preset application, so the
  // FinishingWizard coupling (trades/attributes) stays identical either way.
  const buildRoomInstance = useCallback((templateId: string, sortOrder: number, levelLabel?: string): ZoneInstance => {
    const defaults = DEFAULT_DIMENSIONS[templateId] || { l: 8.0, w: 6.0, ceiling: '3.0m Flush', titleEn: 'Curated Suite', titleAr: 'مساحة معمارية' };
    const dims = starterDims(templateId);
    const zoneTpl = ZONE_TEMPLATES.find(z => z.id === templateId);

    let trades: ZoneInstance['trades'] = [];
    if (zoneTpl) {
      const tpls = getTradesForZone(zoneTpl);
      trades = tpls.map(t => ({
        id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        trade_template_id: t.id,
        status: t.status_values[0] || 'NotStarted',
        attributes: getAttributesForTrade(t.id, zoneTpl.id).map(attr => ({
          attribute_template_id: attr.id,
          value: null,
        })),
      }));
    }

    return {
      id: `zone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      zone_template_id: templateId,
      instance_label: isAr ? defaults.titleAr : defaults.titleEn,
      ...(levelLabel && levelLabel !== GROUND_KEY ? { level_label: levelLabel } : {}),
      sort_order: sortOrder,
      spatial: {
        gridX: 0,
        gridY: 0,
        gridW: 6,
        gridH: 4,
        length_m: dims.l,
        width_m: dims.w,
        sqm: Math.round(dims.l * dims.w),
        ceiling_height: defaults.ceiling,
      },
      trades,
    };
  }, [isAr]);

  const handleAddRoom = (templateId: string, keepOpen = false) => {
    const levelLabel = propertyType === 'apartment' ? activeFloorKey : undefined;
    const newZone = buildRoomInstance(templateId, zoneInstances.length, levelLabel);
    pushHistory(zoneInstances);
    onZoneInstancesChange([...zoneInstances, newZone]);
    setSelectedZoneId(newZone.id);
    if (!keepOpen) setAddMenuOpen(false);
    requestAnimationFrame(() => {
      const el = rowRefs.current[newZone.id];
      el?.scrollIntoView({ block: 'nearest' });
      el?.querySelector<HTMLInputElement>('.fp-stepper-input')?.focus();
    });
  };

  const handleApplyPreset = (preset: StarterPreset) => {
    const base = zoneInstances.length;
    const levelLabel = propertyType === 'apartment' ? activeFloorKey : undefined;
    const newZones = preset.rooms.map((tid, i) => buildRoomInstance(tid, base + i, levelLabel));
    pushHistory(zoneInstances);
    onZoneInstancesChange([...zoneInstances, ...newZones]);
    if (newZones[0]) setSelectedZoneId(newZones[0].id);
    showToast(isAr ? `تمت إضافة ${newZones.length} غرف` : `${newZones.length} rooms added`);
  };

  const handleStartEmpty = () => {
    setDismissedPresets(prev => ({ ...prev, [activeFloorKey]: true }));
  };

  const handleRemoveRoom = (zoneId: string, label: string) => {
    function removeRecursive(list: ZoneInstance[]): ZoneInstance[] {
      return list
        .filter(z => z.id !== zoneId)
        .map(z => (z.children && z.children.length > 0 ? { ...z, children: removeRecursive(z.children) } : z));
    }
    pushHistory(zoneInstances);
    onZoneInstancesChange(removeRecursive(zoneInstances));
    if (selectedZoneId === zoneId) setSelectedZoneId(null);
    showToast(isAr ? `تم حذف ${label}` : `${label} deleted`);
  };

  const freshIds = (zones: ZoneInstance[], levelLabel: string): ZoneInstance[] => {
    return zones.map((z, i) => ({
      ...z,
      id: `zone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${i}`,
      level_label: levelLabel,
      images: undefined,
      trades: (z.trades || []).map(t => ({
        ...t,
        id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        attributes: t.attributes.map(a => ({ ...a })),
      })),
      children: z.children && z.children.length > 0 ? freshIds(z.children, levelLabel) : undefined,
      spatial: z.spatial ? { ...z.spatial } : undefined,
    }));
  };

  const nextFloorName = () => {
    const existing = new Set(Object.keys(floorGroups));
    let n = 2;
    while (existing.has(isAr ? `الطابق ${n}` : `Floor ${n}`)) n++;
    return isAr ? `الطابق ${n}` : `Floor ${n}`;
  };

  const handleAddFloor = (mode: 'blank' | 'duplicate') => {
    const name = nextFloorName();
    setFloorMenuOpen(false);
    if (mode === 'blank') {
      setExtraFloors(prev => [...prev, name]);
      setActiveFloorKey(name);
      setSelectedZoneId(null);
      setRenamingFloorKey(name);
      setFloorDraft(name);
      return;
    }
    const current = floorGroups[activeFloorKey]?.zones ?? [];
    if (current.length === 0) {
      setExtraFloors(prev => [...prev, name]);
      setActiveFloorKey(name);
      setRenamingFloorKey(name);
      setFloorDraft(name);
      return;
    }
    const base = zoneInstances.length;
    const copies = freshIds(current, name).map((z, i) => ({ ...z, sort_order: base + i }));
    pushHistory(zoneInstances);
    onZoneInstancesChange([...zoneInstances, ...copies]);
    setActiveFloorKey(name);
    setSelectedZoneId(copies[0]?.id ?? null);
    setRenamingFloorKey(name);
    setFloorDraft(name);
    showToast(isAr ? 'تم نسخ الطابق' : 'Floor duplicated');
  };

  const handleRenameFloor = (oldKey: string, rawNext: string) => {
    const next = rawNext.trim().slice(0, 30);
    setRenamingFloorKey(null);
    if (!next || next === oldKey || next === GROUND_KEY) return;
    if (floorGroups[next]) return;
    const zonesInFloor = floorGroups[oldKey]?.zones ?? [];
    if (zonesInFloor.length > 0) {
      const ids = new Set(zonesInFloor.map(z => z.id));
      function relabel(list: ZoneInstance[]): ZoneInstance[] {
        return list.map(z => {
          const patched = ids.has(z.id) ? { ...z, level_label: next } : z;
          return patched.children && patched.children.length > 0
            ? { ...patched, children: relabel(patched.children) }
            : patched;
        });
      }
      pushHistory(zoneInstances);
      onZoneInstancesChange(relabel(zoneInstances));
    }
    setExtraFloors(prev => prev.map(k => (k === oldKey ? next : k)));
    if (activeFloorKey === oldKey) setActiveFloorKey(next);
  };

  const handleReorder = (zoneId: string, targetIndex: number) => {
    const zones = floorGroups[activeFloorKey]?.zones ?? [];
    const fromIndex = zones.findIndex(z => z.id === zoneId);
    if (fromIndex === -1) return;
    const clamped = Math.max(0, Math.min(zones.length - 1, targetIndex));
    if (clamped === fromIndex) return;
    const ordered = [...zones];
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(clamped, 0, moved);
    const orderById = new Map(ordered.map((z, i) => [z.id, i]));
    function rewrite(list: ZoneInstance[]): ZoneInstance[] {
      return list.map(z => {
        const next = orderById.has(z.id) ? { ...z, sort_order: orderById.get(z.id)! } : z;
        return next.children && next.children.length > 0
          ? { ...next, children: rewrite(next.children) }
          : next;
      });
    }
    pushHistory(zoneInstances);
    onZoneInstancesChange(rewrite(zoneInstances));
  };

  const handleRowDragStart = (zoneId: string, e: React.PointerEvent) => {
    e.preventDefault();
    const zones = floorGroups[activeFloorKey]?.zones ?? [];
    const startIndex = zones.findIndex(z => z.id === zoneId);
    if (startIndex === -1) return;
    setDragState({ id: zoneId, overIndex: startIndex });

    const idsInOrder = zones.map(z => z.id);
    const computeOver = (clientY: number) => {
      let over = idsInOrder.length - 1;
      for (let i = 0; i < idsInOrder.length; i++) {
        const el = rowRefs.current[idsInOrder[i]];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) { over = i; break; }
      }
      return over;
    };

    let latestOver = startIndex;
    const onMove = (ev: PointerEvent) => {
      latestOver = computeOver(ev.clientY);
      setDragState({ id: zoneId, overIndex: latestOver });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDragState(null);
      handleReorder(zoneId, latestOver);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const selectZone = useCallback((id: string, scrollRow = false) => {
    setSelectedZoneId(id);
    if (scrollRow) {
      requestAnimationFrame(() => {
        rowRefs.current[id]?.scrollIntoView({ block: 'nearest' });
      });
    }
  }, []);

  const moveSelection = (dir: -1 | 1) => {
    if (activeZones.length === 0) return;
    const idx = currentSelectedZone ? activeZones.findIndex(z => z.id === currentSelectedZone.id) : -1;
    const nextIdx = Math.min(activeZones.length - 1, Math.max(0, idx + dir));
    const next = activeZones[nextIdx];
    if (next) {
      selectZone(next.id, true);
      requestAnimationFrame(() => rowRefs.current[next.id]?.focus());
    }
  };

  const metricLayout = useMemo(() => {
    return computeMetricLayout(
      activeZones.map(z => {
        const sp = spatialOf(z);
        return { id: z.id, widthM: sp.w, lengthM: sp.l };
      }),
    );
  }, [activeZones, spatialOf]);

  const previewSlots = useMemo(() => {
    return activeZones.map((zone, idx) => {
      const rect = metricLayout.rooms[idx];
      const sp = spatialOf(zone);
      const title = getZoneLabel(zone);
      return {
        zone,
        x: rect.x, y: rect.y, w: rect.w, h: rect.h,
        pinX: rect.x + rect.w / 2,
        pinY: rect.y + rect.h / 2,
        title,
        dims: `${sp.l} × ${sp.w}`,
        sqm: sp.sqm,
        warn: warnFor(zone.zone_template_id, sp.sqm),
      };
    });
  }, [activeZones, metricLayout, spatialOf, getZoneLabel]);

  const allFlatZones = useMemo(() => {
    return Object.values(floorGroups).flatMap(g => g.zones);
  }, [floorGroups]);

  const roomsTotalSqm = useMemo(() => floorSqm(allFlatZones), [allFlatZones, floorSqm]);

  const reconState = useMemo(() => {
    if (!declaredArea || declaredArea <= 0 || allFlatZones.length === 0) return 'none' as const;
    const ratio = roomsTotalSqm / declaredArea;
    if (ratio >= 0.9 && ratio <= 1.1) return 'ok' as const;
    return roomsTotalSqm > declaredArea ? ('over' as const) : ('under' as const);
  }, [declaredArea, roomsTotalSqm, allFlatZones.length]);

  const handleReview = () => {
    let target: ZoneInstance | null = null;
    let worstGap = 0;
    for (const z of allFlatZones) {
      const sp = spatialOf(z);
      const band = WARN_BANDS[z.zone_template_id];
      if (!band) continue;
      const gap = sp.sqm < band[0] ? band[0] - sp.sqm : sp.sqm > band[1] ? sp.sqm - band[1] : 0;
      if (gap > worstGap) { worstGap = gap; target = z; }
    }
    if (!target) {
      for (const z of allFlatZones) {
        const sp = spatialOf(z);
        if (!target || sp.sqm > spatialOf(target).sqm) target = z;
      }
    }
    if (!target) return;
    if (propertyType === 'apartment') {
      setActiveFloorKey(floorKeyOf(target));
    } else {
      for (const [key, g] of Object.entries(floorGroups)) {
        if (g.zones.some(z => z.id === target!.id)) { setActiveFloorKey(key); break; }
      }
    }
    selectZone(target.id, true);
    requestAnimationFrame(() => rowRefs.current[target!.id]?.focus());
  };

  const showPresets = activeZones.length === 0 && !dismissedPresets[activeFloorKey];
  const recommendedId = recommendedPresetId(propertyType, bedrooms);
  const activeAddGroups = ADD_GROUPS[propertyType] || ADD_GROUPS.apartment;

  const filteredGroups = useMemo(() => {
    const q = normalizeNumeric(addFilter).trim().toLowerCase();
    return activeAddGroups
      .map(g => ({
        ...g,
        templateIds: g.templateIds.filter(tid => {
          if (!q) return true;
          const d = DEFAULT_DIMENSIONS[tid];
          const en = (d?.titleEn || '').toLowerCase();
          const ar = d?.titleAr || '';
          return en.includes(q) || ar.includes(addFilter.trim());
        }),
      }))
      .filter(g => g.templateIds.length > 0);
  }, [activeAddGroups, addFilter]);

  return (
    <div className="fp-root" dir={isAr ? 'rtl' : 'ltr'} ref={rootRef}>

      <div className="fp-header">
        <div className="fp-header-info">
          <h3 className="fp-title">{isAr ? 'المخطط' : 'Floor Plan'}</h3>
          <p className="fp-subtitle">{isAr ? 'يظهر في الإعلان العام' : 'Shown on the public listing'}</p>
        </div>
        <div className="fp-header-actions">
          <button
            type="button"
            className="fp-history-btn"
            aria-label={isAr ? 'تراجع' : 'Undo'}
            title={isAr ? 'تراجع (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            className="fp-history-btn"
            aria-label={isAr ? 'إعادة' : 'Redo'}
            title={isAr ? 'إعادة (Ctrl+Shift+Z)' : 'Redo (Ctrl+Shift+Z)'}
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 size={15} />
          </button>
          <span className="fp-room-count">
            {activeZones.length} {isAr ? (activeZones.length === 1 ? 'غرفة' : 'غرف') : (activeZones.length === 1 ? 'room' : 'rooms')}
          </span>
        </div>
      </div>

      <div className="fp-floor-tabs">
        {Object.entries(floorGroups).map(([key, group]) => {
          const isActive = activeFloorKey === key;
          const sqmBadge = floorSqm(group.zones);
          const renaming = renamingFloorKey === key;
          return (
            <button
              key={key}
              className={`fp-floor-tab ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveFloorKey(key);
                setSelectedZoneId(group.zones[0]?.id ?? null);
              }}
              onDoubleClick={() => {
                if (propertyType !== 'apartment' || key === GROUND_KEY) return;
                setRenamingFloorKey(key);
                setFloorDraft(key);
              }}
              type="button"
            >
              <Building size={14} />
              {renaming ? (
                <input
                  className="fp-floor-rename"
                  dir="auto"
                  autoFocus
                  maxLength={30}
                  value={floorDraft}
                  onChange={(e) => setFloorDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => handleRenameFloor(key, floorDraft)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleRenameFloor(key, floorDraft); }
                    else if (e.key === 'Escape') { e.preventDefault(); setRenamingFloorKey(null); }
                  }}
                />
              ) : (
                <span>{isAr ? group.labelAr : group.labelEn}</span>
              )}
              <span className="fp-floor-badge" dir="ltr">{sqmBadge} m²</span>
            </button>
          );
        })}

        {propertyType === 'apartment' && (
          <div className="fp-floor-add-wrap" ref={floorMenuRef}>
            <button
              type="button"
              className="fp-floor-tab fp-floor-add"
              aria-haspopup="menu"
              aria-expanded={floorMenuOpen}
              onClick={() => setFloorMenuOpen(o => !o)}
            >
              <Plus size={14} />
              <span>{isAr ? 'إضافة طابق' : 'Add floor'}</span>
              <ChevronDown size={13} />
            </button>
            {floorMenuOpen && (
              <div className="fp-floor-menu" role="menu">
                <button type="button" role="menuitem" className="fp-add-item" onClick={() => handleAddFloor('blank')}>
                  <Plus size={12} />
                  <span>{isAr ? 'طابق فارغ' : 'Blank floor'}</span>
                </button>
                <button type="button" role="menuitem" className="fp-add-item" onClick={() => handleAddFloor('duplicate')}>
                  <Copy size={12} />
                  <span>{isAr ? 'نسخ الطابق الحالي' : 'Duplicate current floor'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fp-workspace">

        <div className="fp-canvas-panel">
          <div className="fp-canvas-bar">
            <span className="fp-canvas-badge">
              <Layers size={13} />
              <span>{isAr ? 'معاينة حية للمخطط' : 'LIVE FLOOR PLAN PREVIEW'}</span>
            </span>
            {previewSlots.length > 0 && (
              <span className="fp-canvas-scale" dir="ltr">
                1m ≈ {Math.max(1, Math.round(metricLayout.pxPerMeter))}px
              </span>
            )}
          </div>

          <div className="fp-canvas-body">
            {previewSlots.length > 0 ? (
              <svg viewBox="0 0 680 440" className="fp-canvas-svg" style={{ direction: 'ltr' }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="adminCadGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(221, 167, 82, 0.08)" strokeWidth="0.4" />
                  </pattern>
                  <pattern id="adminCadGridMajor" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(221, 167, 82, 0.15)" strokeWidth="0.8" />
                  </pattern>
                  <filter id="adminGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#DDA752" floodOpacity="0.8" />
                  </filter>
                </defs>

                <rect width="680" height="440" fill="url(#adminCadGrid)" />
                <rect width="680" height="440" fill="url(#adminCadGridMajor)" opacity="0.4" />

                {(() => {
                  const minX = Math.min(...previewSlots.map(s => s.x));
                  const maxX = Math.max(...previewSlots.map(s => s.x + s.w));
                  const minY = Math.min(...previewSlots.map(s => s.y));
                  const maxY = Math.max(...previewSlots.map(s => s.y + s.h));
                  return (
                    <g>
                      <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="none" stroke="#DDA752" strokeWidth="3" />
                      <rect x={minX + 3} y={minY + 3} width={maxX - minX - 6} height={maxY - minY - 6} fill="none" stroke="rgba(221, 167, 82, 0.4)" strokeWidth="1" />
                    </g>
                  );
                })()}

                {previewSlots.map(s => (
                  <rect key={`part-${s.zone.id}`} x={s.x} y={s.y} width={s.w} height={s.h} fill="none" stroke="rgba(221, 167, 82, 0.45)" strokeWidth="1.5" />
                ))}

                {previewSlots.map((s, idx) => {
                  const isSelected = currentSelectedZone?.id === s.zone.id;
                  const isWarn = s.warn !== 'ok';
                  const full = s.w >= 90 && s.h >= 52;
                  const medium = !full && s.w >= 56 && s.h >= 30;
                  const tiny = !full && !medium;
                  return (
                    <g
                      key={s.zone.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${s.title}, ${round1(s.sqm)} ${isAr ? 'متر مربع' : 'square meters'}`}
                      onClick={() => selectZone(s.zone.id, true)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectZone(s.zone.id, true); } }}
                      style={{ cursor: 'pointer' }}
                    >
                      <title>{`${s.title} — ${s.dims} m — ${round1(s.sqm)} m²`}</title>
                      <rect
                        x={s.x + 2}
                        y={s.y + 2}
                        width={Math.max(2, s.w - 4)}
                        height={Math.max(2, s.h - 4)}
                        fill={isSelected ? 'rgba(221, 167, 82, 0.16)' : 'rgba(255, 255, 255, 0.02)'}
                        stroke={isSelected ? '#DDA752' : isWarn ? '#E0A63A' : 'transparent'}
                        strokeWidth="1.5"
                        strokeDasharray={!isSelected && isWarn ? '4 3' : undefined}
                        filter={isSelected ? 'url(#adminGoldGlow)' : undefined}
                      />
                      {isSelected && (() => {
                        const cx = s.x + 4, cy = s.y + 4, ex = s.x + s.w - 4, ey = s.y + s.h - 4, t = 6;
                        return (
                          <g stroke="#DDA752" strokeWidth="1.5">
                            <path d={`M ${cx} ${cy + t} L ${cx} ${cy} L ${cx + t} ${cy}`} fill="none" />
                            <path d={`M ${ex - t} ${cy} L ${ex} ${cy} L ${ex} ${cy + t}`} fill="none" />
                            <path d={`M ${cx} ${ey - t} L ${cx} ${ey} L ${cx + t} ${ey}`} fill="none" />
                            <path d={`M ${ex - t} ${ey} L ${ex} ${ey} L ${ex} ${ey - t}`} fill="none" />
                          </g>
                        );
                      })()}

                      {full && (
                        <text x={s.x + 8} y={s.y + 14} fontSize="8" fill="#DDA752" fontFamily="monospace" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{s.dims}</text>
                      )}

                      {tiny ? (
                        <text x={s.pinX} y={s.pinY + 3} fontSize="9" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="monospace" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                          {String(idx + 1).padStart(2, '0')}
                        </text>
                      ) : (
                        <>
                          <text x={s.pinX} y={s.pinY - 2} fontSize={full ? 10 : 8.5} fill="#FFFFFF" textAnchor="middle" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">
                            {s.title}
                          </text>
                          <text x={s.pinX} y={s.pinY + (full ? 12 : 10)} fontSize={full ? 9 : 8} fill={isWarn ? '#E0A63A' : '#DDA752'} textAnchor="middle" fontWeight="800" fontFamily="monospace" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                            {round1(s.sqm)} m²{isWarn ? ' !' : ''}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            ) : showPresets ? (
              <div className="fp-presets">
                <div className="fp-presets-head">
                  <h4 className="fp-presets-title">{isAr ? 'ابدأ مخططك' : 'Start your floor plan'}</h4>
                  <p className="fp-presets-desc">{isAr ? 'اختر تخطيطاً جاهزاً، أو أضف الغرف واحدة تلو الأخرى من القائمة.' : 'Pick a starter layout, or add rooms one by one from the list.'}</p>
                </div>
                <div className="fp-presets-grid">
                  {STARTER_PRESETS.map((p) => {
                    const recommended = p.id === recommendedId;
                    return (
                      <div key={p.id} className={`fp-preset-card ${recommended ? 'recommended' : ''}`}>
                        {recommended && <span className="fp-preset-badge">{isAr ? 'موصى به' : 'RECOMMENDED'}</span>}
                        <div className="fp-preset-thumb" aria-hidden="true">
                          <svg viewBox="0 0 120 78" width="120" height="78" style={{ direction: 'ltr' }}>
                            {getFloorPlanSlots(Math.min(p.rooms.length, 6)).map((slot, i) => (
                              <rect key={i} x={120 * slot.xF} y={78 * slot.yF} width={120 * slot.wF} height={78 * slot.hF} fill="rgba(221,167,82,0.08)" stroke="rgba(221,167,82,0.5)" strokeWidth="1" />
                            ))}
                          </svg>
                        </div>
                        <span className="fp-preset-name">{isAr ? p.labelAr : p.labelEn}</span>
                        <span className="fp-preset-sub">{isAr ? p.subAr : p.subEn}</span>
                        <span className="fp-preset-sqm">~{p.approxSqm} m²</span>
                        <button
                          type="button"
                          className="fp-preset-use"
                          autoFocus={recommended}
                          onClick={() => handleApplyPreset(p)}
                        >
                          {isAr ? 'استخدم هذا' : 'Use this'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" className="fp-start-empty" onClick={handleStartEmpty}>
                  <span>{isAr ? 'ابدأ فارغاً' : 'Start empty'}</span>
                  <span className="fp-arrow-glyph" aria-hidden="true">→</span>
                </button>
              </div>
            ) : (
              <div className="fp-empty-box">
                <Building size={36} className="fp-empty-icon" />
                <h4 className="fp-empty-title">{isAr ? 'لا توجد غرف بعد' : 'No rooms yet'}</h4>
                <p className="fp-empty-desc">{isAr ? 'أضف غرفاً من القائمة لتظهر هنا وعلى المخطط.' : 'Add a room from the list to see it here and on the plan.'}</p>
              </div>
            )}
          </div>

          {allFlatZones.length > 0 && (
            <div className={`fp-recon ${reconState === 'ok' ? 'ok' : reconState === 'none' ? '' : 'warn'}`}>
              <div className="fp-recon-text">
                {reconState === 'ok' && <Check size={14} className="fp-recon-icon" />}
                {(reconState === 'over' || reconState === 'under') && <AlertTriangle size={14} className="fp-recon-icon" />}
                <span>
                  {isAr ? 'مجموع الغرف' : 'Rooms total'}{' '}
                  <bdi dir="ltr"><strong>{roomsTotalSqm} m²</strong></bdi>
                  {declaredArea && declaredArea > 0 ? (
                    <>
                      {' · '}{isAr ? 'المساحة المعلنة' : 'Declared'}{' '}
                      <bdi dir="ltr"><strong>{Math.round(declaredArea)} m²</strong></bdi>
                    </>
                  ) : null}
                  {reconState === 'under' && (
                    <span className="fp-recon-note">
                      {' — '}<bdi dir="ltr">{Math.round((declaredArea ?? 0) - roomsTotalSqm)} m²</bdi> {isAr ? 'غير محتسبة' : 'unaccounted'}
                    </span>
                  )}
                  {reconState === 'over' && (
                    <span className="fp-recon-note">
                      {' — '}{isAr ? 'يتجاوز المعلن بـ' : 'exceeds declared by'} <bdi dir="ltr">{Math.round(roomsTotalSqm - (declaredArea ?? 0))} m²</bdi>
                    </span>
                  )}
                  {reconState === 'ok' && (
                    <span className="fp-recon-note">{' — '}{isAr ? 'مطابق للمساحة المعلنة' : 'matches declared area'}</span>
                  )}
                </span>
              </div>
              {(reconState === 'over' || reconState === 'under') && (
                <button type="button" className="fp-recon-review" onClick={handleReview}>
                  {isAr ? 'مراجعة' : 'Review'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="fp-list-panel">
          <div className="fp-add-wrap" ref={addMenuRef}>
            <button
              type="button"
              className="fp-add-btn"
              aria-haspopup="menu"
              aria-expanded={addMenuOpen}
              onClick={() => setAddMenuOpen(o => !o)}
            >
              <Plus size={15} />
              <span>{isAr ? 'إضافة غرفة' : 'Add room'}</span>
              <ChevronDown size={14} className="fp-add-chevron" />
            </button>

            {addMenuOpen && (
              <div className="fp-add-menu" role="menu">
                <div className="fp-add-search">
                  <Search size={13} />
                  <input
                    type="text"
                    className="fp-add-search-input"
                    placeholder={isAr ? 'بحث...' : 'Search...'}
                    value={addFilter}
                    onChange={(e) => setAddFilter(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="fp-add-groups">
                  {filteredGroups.length === 0 && (
                    <p className="fp-add-empty">{isAr ? 'لا نتائج' : 'No matches'}</p>
                  )}
                  {filteredGroups.map(g => (
                    <div key={g.key} className="fp-add-group">
                      <span className="fp-add-group-head">{isAr ? g.labelAr : g.labelEn}</span>
                      {g.templateIds.map(tid => {
                        const d = DEFAULT_DIMENSIONS[tid];
                        return (
                          <button
                            key={tid}
                            type="button"
                            role="menuitem"
                            className="fp-add-item"
                            onClick={(e) => handleAddRoom(tid, e.shiftKey)}
                          >
                            <Plus size={12} />
                            <span>{isAr ? d?.titleAr : d?.titleEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="fp-list-scroll" role="list">
            {activeZones.length === 0 ? (
              <div className="fp-list-empty">
                <p className="fp-list-empty-title">{isAr ? 'لا توجد غرف بعد.' : 'No rooms yet.'}</p>
                <p className="fp-list-empty-desc">{isAr ? 'الغرف التي تضيفها تظهر هنا وعلى المخطط.' : 'Rooms you add appear here and on the plan.'}</p>
              </div>
            ) : (
              activeZones.map((zone, idx) => {
                const sp = spatialOf(zone);
                const dragging = dragState?.id === zone.id;
                const dropBefore = dragState && dragState.id !== zone.id && dragState.overIndex === idx;
                return (
                  <div key={zone.id} className={`fp-row-wrap ${dragging ? 'dragging' : ''} ${dropBefore ? 'drop-before' : ''}`}>
                    <RoomListRow
                      room={zone}
                      selected={currentSelectedZone?.id === zone.id}
                      labelName={getZoneLabel(zone)}
                      widthM={sp.w}
                      lengthM={sp.l}
                      sqm={sp.sqm}
                      ceiling={sp.ceiling}
                      warn={warnFor(zone.zone_template_id, sp.sqm)}
                      isAr={isAr}
                      rowRef={(el) => { rowRefs.current[zone.id] = el; }}
                      onSelect={() => selectZone(zone.id)}
                      onPatch={(updates) => handleUpdateSpatial(zone.id, updates)}
                      onRename={(next) => handleRenameRoom(zone.id, next)}
                      onDelete={() => handleRemoveRoom(zone.id, getZoneLabel(zone))}
                      onArrow={(dir) => moveSelection(dir)}
                      onReorder={(dir) => handleReorder(zone.id, idx + dir)}
                      onDragStart={(e) => handleRowDragStart(zone.id, e)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {toast && (
        <div
          className="fp-toast"
          role="status"
          onMouseEnter={() => { if (toastTimerRef.current !== null) { window.clearTimeout(toastTimerRef.current); toastTimerRef.current = null; } }}
          onMouseLeave={() => { toastTimerRef.current = window.setTimeout(() => { toastTimerRef.current = null; setToast(null); }, 3000); }}
        >
          <span className="fp-toast-label">{toast.label}</span>
          <button type="button" className="fp-toast-undo" onClick={undo}>
            {isAr ? 'تراجع' : 'Undo'}
          </button>
        </div>
      )}

      <style>{`
        .fp-root {
          --fp-surface: #0D1220;
          --fp-canvas-bg: #0A0E18;
          --fp-line: rgba(221,167,82,0.16);
          --fp-text: #EDE8DD;
          --fp-text-dim: rgba(237,232,221,0.55);
          --fp-gold: #DDA752;
          --fp-gold-grad: linear-gradient(135deg,#DDA752,#B8860B);
          --fp-warn: #E0A63A;
          --fp-warn-bg: rgba(224,166,58,0.10);
          --fp-danger: #D96B6B;
          --fp-focus-ring: 0 0 0 2px rgba(221,167,82,0.55);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: var(--fp-text);
        }

        [data-theme="light"] .fp-root {
          --fp-surface: #FFFFFF;
          --fp-canvas-bg: #F6F4EF;
          --fp-line: rgba(184,134,11,0.22);
          --fp-text: #1C1A16;
          --fp-text-dim: rgba(28,26,22,0.55);
          --fp-gold: #B8860B;
          --fp-warn: #B07A10;
          --fp-warn-bg: rgba(176,122,16,0.08);
          --fp-danger: #B23A3A;
          --fp-focus-ring: 0 0 0 2px rgba(184,134,11,0.5);
        }

        .fp-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .fp-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--fp-text);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .fp-subtitle {
          font-size: 0.8125rem;
          color: var(--fp-text-dim);
          margin: 0.15rem 0 0;
        }

        .fp-room-count {
          font-family: monospace;
          font-variant-numeric: tabular-nums;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--fp-gold);
          padding: 4px 12px;
          border-radius: 9999px;
          background: rgba(221,167,82,0.08);
          border: 1px solid var(--fp-line);
          white-space: nowrap;
        }

        .fp-floor-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 4px;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--fp-line);
        }

        [data-theme="light"] .fp-floor-tabs {
          background: #FFFFFF;
        }

        .fp-floor-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          background: transparent;
          border: 1px solid transparent;
          color: var(--fp-text-dim);
          transition: background-color 0.15s cubic-bezier(0.2,0,0,1), color 0.15s cubic-bezier(0.2,0,0,1);
          white-space: nowrap;
        }

        .fp-floor-tab:hover {
          color: var(--fp-text);
          background: rgba(221,167,82,0.05);
        }

        .fp-floor-tab.active {
          background: rgba(221,167,82,0.10);
          border-color: rgba(221,167,82,0.4);
          color: var(--fp-gold);
        }

        .fp-floor-badge {
          font-family: monospace;
          font-variant-numeric: tabular-nums;
          padding: 2px 7px;
          border-radius: 9999px;
          font-size: 0.6875rem;
          font-weight: 800;
          background: rgba(255,255,255,0.08);
        }

        .fp-floor-tab.active .fp-floor-badge {
          background: rgba(221,167,82,0.25);
          color: var(--fp-gold);
        }

        .fp-workspace {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 1.5rem;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .fp-workspace {
            grid-template-columns: 1fr;
          }
        }

        .fp-canvas-panel {
          border-radius: 14px;
          overflow: hidden;
          background: var(--fp-canvas-bg);
          border: 1px solid var(--fp-line);
          box-shadow: 0 16px 40px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
        }

        [data-theme="light"] .fp-canvas-panel {
          box-shadow: 0 12px 32px rgba(28,26,22,0.06);
        }

        .fp-canvas-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.1rem;
          background: rgba(255,255,255,0.03);
          border-block-end: 1px solid var(--fp-line);
        }

        [data-theme="light"] .fp-canvas-bar {
          background: #F8FAFC;
        }

        .fp-canvas-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: monospace;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--fp-gold);
        }

        .fp-canvas-body {
          padding: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 440px;
        }

        .fp-canvas-svg {
          width: 100%;
          height: auto;
          max-height: 480px;
          aspect-ratio: 680 / 440;
          border-radius: 10px;
        }

        .fp-empty-box, .fp-presets {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 2rem 1.25rem;
          text-align: center;
          width: 100%;
        }

        .fp-empty-icon { color: rgba(221,167,82,0.4); margin-block-end: 0.5rem; }
        .fp-empty-title { font-size: 1.1rem; font-weight: 700; color: var(--fp-text); margin: 0; }
        .fp-empty-desc { font-size: 0.8125rem; color: var(--fp-text-dim); margin: 0; max-width: 320px; }

        .fp-presets-head { margin-block-end: 1rem; }
        .fp-presets-title { font-size: 1.2rem; font-weight: 800; color: var(--fp-text); margin: 0; }
        .fp-presets-desc { font-size: 0.8125rem; color: var(--fp-text-dim); margin: 0.35rem 0 0; max-width: 380px; }

        .fp-presets-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          width: 100%;
          max-width: 520px;
        }

        @media (max-width: 560px) {
          .fp-presets-grid { grid-template-columns: 1fr; }
        }

        .fp-preset-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 14px 12px;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--fp-line);
          transition: transform 0.15s cubic-bezier(0.2,0,0,1), box-shadow 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-preset-card.recommended {
          border-color: var(--fp-gold);
          box-shadow: 0 0 0 1px rgba(221,167,82,0.35);
        }

        .fp-preset-badge {
          position: absolute;
          inset-block-start: -9px;
          inset-inline-start: 10px;
          font-size: 0.5625rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 2px 8px;
          border-radius: 9999px;
          background: var(--fp-gold-grad);
          color: #0A0E18;
        }

        .fp-preset-thumb {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 4px 0;
        }

        .fp-preset-name { font-size: 0.875rem; font-weight: 800; color: var(--fp-text); }
        .fp-preset-sub { font-size: 0.6875rem; font-weight: 600; color: var(--fp-text-dim); }
        .fp-preset-sqm { font-family: monospace; font-variant-numeric: tabular-nums; font-size: 0.75rem; color: var(--fp-gold); font-weight: 700; }

        .fp-preset-use {
          margin-block-start: 8px;
          width: 100%;
          min-height: 40px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          background: rgba(221,167,82,0.10);
          border: 1px solid rgba(221,167,82,0.35);
          color: var(--fp-gold);
          transition: background-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-preset-use:hover { background: rgba(221,167,82,0.2); }
        .fp-preset-use:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        .fp-start-empty {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-block-start: 1rem;
          padding: 8px 14px;
          border-radius: 9999px;
          background: transparent;
          border: 1px solid var(--fp-line);
          color: var(--fp-text-dim);
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          transition: color 0.15s cubic-bezier(0.2,0,0,1), border-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-start-empty:hover { color: var(--fp-text); border-color: var(--fp-gold); }
        .fp-start-empty:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        [dir="rtl"] .fp-arrow-glyph { transform: scaleX(-1); display: inline-block; }

        .fp-list-panel {
          display: flex;
          flex-direction: column;
          gap: 0;
          border-radius: 14px;
          background: var(--fp-surface);
          border: 1px solid var(--fp-line);
          overflow: hidden;
        }

        .fp-add-wrap {
          position: relative;
          padding: 10px;
          border-block-end: 1px solid var(--fp-line);
        }

        .fp-add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          min-height: 44px;
          padding: 10px 14px;
          border-radius: 10px;
          background: var(--fp-gold-grad);
          border: none;
          color: #0A0E18;
          font-size: 0.875rem;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s cubic-bezier(0.2,0,0,1), opacity 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-add-btn:hover { opacity: 0.92; }
        .fp-add-btn:active { transform: translateY(1px); }
        .fp-add-btn:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }
        .fp-add-chevron { margin-inline-start: auto; }

        .fp-add-menu {
          position: absolute;
          inset-block-start: calc(100% - 4px);
          inset-inline-start: 10px;
          inset-inline-end: 10px;
          z-index: 40;
          border-radius: 12px;
          background: var(--fp-surface);
          border: 1px solid var(--fp-line);
          box-shadow: 0 18px 48px rgba(0,0,0,0.4);
          padding: 8px;
          max-height: 360px;
          overflow-y: auto;
        }

        .fp-add-search {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--fp-line);
          color: var(--fp-text-dim);
          margin-block-end: 8px;
        }

        [data-theme="light"] .fp-add-search { background: #F8FAFC; }

        .fp-add-search-input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          color: var(--fp-text);
          font-family: inherit;
          font-size: 0.8125rem;
        }

        .fp-add-group { display: flex; flex-direction: column; margin-block-end: 6px; }

        .fp-add-group-head {
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--fp-text-dim);
          text-align: start;
          padding: 6px 8px 3px;
        }

        .fp-add-item {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 8px 10px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: var(--fp-text);
          font-family: inherit;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          text-align: start;
          transition: background-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-add-item:hover { background: rgba(221,167,82,0.08); color: var(--fp-gold); }
        .fp-add-item:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }
        .fp-add-empty { font-size: 0.8125rem; color: var(--fp-text-dim); text-align: center; padding: 12px; margin: 0; }

        .fp-list-scroll {
          display: flex;
          flex-direction: column;
          max-height: 620px;
          overflow-y: auto;
        }

        .fp-list-empty { padding: 2.5rem 1.5rem; text-align: center; }
        .fp-list-empty-title { font-size: 0.9rem; font-weight: 700; color: var(--fp-text); margin: 0; }
        .fp-list-empty-desc { font-size: 0.8125rem; color: var(--fp-text-dim); margin: 0.35rem 0 0; }

        .fp-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 14px;
          border-block-end: 1px solid var(--fp-line);
          border-inline-start: 2px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: background-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-row:hover { background: rgba(221,167,82,0.05); }
        .fp-row:hover .fp-row-edit { opacity: 0.6; }
        .fp-row:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }
        .fp-row:focus-within .fp-row-edit { opacity: 0.6; }

        .fp-row.selected {
          background: rgba(221,167,82,0.08);
          border-inline-start: 2px solid var(--fp-gold);
        }

        .fp-row-line1 {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fp-row-icon { color: var(--fp-gold); display: inline-flex; flex-shrink: 0; }

        .fp-row-name {
          flex: 1;
          min-width: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--fp-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fp-row-name-input {
          flex: 1;
          min-width: 0;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 3px 6px;
          border-radius: 6px;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--fp-gold);
          color: var(--fp-text);
          outline: none;
        }

        [data-theme="light"] .fp-row-name-input { background: #FFFFFF; }

        .fp-row-edit {
          opacity: 0;
          flex-shrink: 0;
          padding: 3px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: var(--fp-text-dim);
          cursor: pointer;
          transition: opacity 0.15s cubic-bezier(0.2,0,0,1), color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-row-edit:hover { color: var(--fp-gold); opacity: 1; }

        .fp-row-area {
          flex-shrink: 0;
          font-family: monospace;
          font-variant-numeric: tabular-nums;
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--fp-text-dim);
          margin-inline-start: auto;
        }

        .fp-row-area.gold { color: var(--fp-gold); }

        .fp-row-line2 {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .fp-row-line3 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-block-start: 4px;
        }

        .fp-stepper {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 4px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--fp-line);
        }

        [data-theme="light"] .fp-stepper { background: #F8FAFC; }

        .fp-stepper-label {
          font-family: monospace;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--fp-text-dim);
          padding-inline: 2px;
        }

        .fp-stepper-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: var(--fp-gold);
          cursor: pointer;
          flex-shrink: 0;
          transition: background-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-stepper-btn:hover { background: rgba(221,167,82,0.12); }

        .fp-stepper-value {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          direction: ltr;
          unicode-bidi: isolate;
        }

        .fp-stepper-input {
          width: 3ch;
          text-align: center;
          font-family: monospace;
          font-variant-numeric: tabular-nums;
          font-size: 0.8125rem;
          font-weight: 700;
          background: transparent;
          border: none;
          outline: none;
          color: var(--fp-text);
          padding: 2px 0;
        }

        .fp-stepper-input:focus-visible { box-shadow: var(--fp-focus-ring); border-radius: 4px; }

        .fp-stepper-unit {
          font-family: monospace;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--fp-text-dim);
        }

        .fp-ceiling { display: inline-flex; align-items: center; gap: 8px; }

        .fp-ceiling-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--fp-text-dim);
        }

        .fp-ceiling-select {
          min-height: 34px;
          padding: 4px 8px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--fp-line);
          color: var(--fp-text);
          font-family: inherit;
          font-size: 0.75rem;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }

        [data-theme="light"] .fp-ceiling-select { background: #F8FAFC; }
        .fp-ceiling-select:focus-visible { box-shadow: var(--fp-focus-ring); }

        .fp-row-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid var(--fp-line);
          color: var(--fp-text-dim);
          cursor: pointer;
          transition: background-color 0.15s cubic-bezier(0.2,0,0,1), color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-row-delete:hover {
          color: var(--fp-danger);
          border-color: var(--fp-danger);
          background: rgba(217,107,107,0.08);
        }

        .fp-row-delete:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        .fp-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fp-history-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid var(--fp-line);
          color: var(--fp-text-dim);
          cursor: pointer;
          transition: color 0.15s cubic-bezier(0.2,0,0,1), border-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-history-btn:hover:not(:disabled) { color: var(--fp-gold); border-color: var(--fp-gold); }
        .fp-history-btn:disabled { opacity: 0.35; cursor: default; }
        .fp-history-btn:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        .fp-canvas-scale {
          font-family: monospace;
          font-variant-numeric: tabular-nums;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--fp-text-dim);
        }

        .fp-floor-rename {
          font-family: inherit;
          font-size: 0.8125rem;
          font-weight: 700;
          width: 10ch;
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--fp-gold);
          color: var(--fp-text);
          outline: none;
        }

        [data-theme="light"] .fp-floor-rename { background: #FFFFFF; }

        .fp-floor-add-wrap { position: relative; }

        .fp-floor-add { color: var(--fp-gold); }

        .fp-floor-menu {
          position: absolute;
          inset-block-start: calc(100% + 4px);
          inset-inline-start: 0;
          z-index: 40;
          min-width: 220px;
          border-radius: 12px;
          background: var(--fp-surface);
          border: 1px solid var(--fp-line);
          box-shadow: 0 18px 48px rgba(0,0,0,0.4);
          padding: 6px;
        }

        [data-theme="light"] .fp-floor-menu { box-shadow: 0 18px 48px rgba(28,26,22,0.15); }

        .fp-recon {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0.65rem 1.1rem;
          border-block-start: 1px solid var(--fp-line);
          background: rgba(255,255,255,0.02);
          font-size: 0.8125rem;
          color: var(--fp-text-dim);
        }

        [data-theme="light"] .fp-recon { background: #F8FAFC; }

        .fp-recon.ok .fp-recon-icon { color: var(--fp-gold); }
        .fp-recon.warn { background: var(--fp-warn-bg); color: var(--fp-text); }
        .fp-recon.warn .fp-recon-icon { color: var(--fp-warn); }

        .fp-recon-text {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .fp-recon-text strong {
          font-family: monospace;
          font-variant-numeric: tabular-nums;
          font-weight: 800;
          color: var(--fp-text);
        }

        .fp-recon-note { color: inherit; }

        .fp-recon-review {
          flex-shrink: 0;
          padding: 5px 14px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          background: rgba(224,166,58,0.14);
          border: 1px solid var(--fp-warn);
          color: var(--fp-warn);
          transition: background-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-recon-review:hover { background: rgba(224,166,58,0.25); }
        .fp-recon-review:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        .fp-row-drag {
          display: inline-flex;
          align-items: center;
          color: var(--fp-text-dim);
          opacity: 0;
          cursor: grab;
          flex-shrink: 0;
          touch-action: none;
          transition: opacity 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-row:hover .fp-row-drag,
        .fp-row:focus-within .fp-row-drag { opacity: 0.6; }
        .fp-row-drag:active { cursor: grabbing; }

        .fp-row-warn {
          display: inline-flex;
          align-items: center;
          color: var(--fp-warn);
          flex-shrink: 0;
        }

        .fp-row-wrap { position: relative; }

        .fp-row-wrap.dragging { opacity: 0.55; }

        .fp-row-wrap.drop-before::before {
          content: '';
          position: absolute;
          inset-inline: 8px;
          inset-block-start: -1px;
          height: 2px;
          background: var(--fp-gold);
          z-index: 5;
        }

        .fp-toast {
          position: fixed;
          inset-block-end: 24px;
          inset-inline-end: 24px;
          z-index: 90;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-radius: 12px;
          background: var(--fp-surface);
          border: 1px solid var(--fp-line);
          box-shadow: 0 18px 48px rgba(0,0,0,0.45);
          animation: fpToastIn 0.2s cubic-bezier(0.2,0,0,1);
        }

        [data-theme="light"] .fp-toast { box-shadow: 0 18px 48px rgba(28,26,22,0.2); }

        @keyframes fpToastIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fp-toast-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--fp-text);
        }

        .fp-toast-undo {
          padding: 5px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          background: rgba(221,167,82,0.12);
          border: 1px solid rgba(221,167,82,0.4);
          color: var(--fp-gold);
          transition: background-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-toast-undo:hover { background: rgba(221,167,82,0.22); }
        .fp-toast-undo:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        @media (max-width: 1024px) {
          .fp-add-wrap {
            position: sticky;
            top: 0;
            z-index: 20;
            background: var(--fp-surface);
          }
          .fp-list-scroll { max-height: none; }
          .fp-stepper-btn { width: 40px; height: 40px; }
          .fp-stepper-input { width: 3.5ch; font-size: 0.9rem; }
          .fp-row-drag { opacity: 0.6; }
          .fp-toast { inset-inline: 16px; inset-block-end: 16px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .fp-root *,
          .fp-root *::before,
          .fp-root *::after {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CADBlueprintBuilder;

