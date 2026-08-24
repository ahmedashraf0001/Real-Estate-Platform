'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Building,
  Layers,
  Plus,
  Minus,
  Trash2,
  Pencil,
  Undo2,
  Redo2,
  AlertTriangle,
  GripVertical,
  Check,
  Sparkles,
  MousePointer2,
  DoorOpen,
  RectangleHorizontal,
  Copy,
  Magnet,
  RotateCw,
  Maximize2,
  Paintbrush,
  Hammer,
  Construction,
  CheckCheck,
  Sofa,
  Bed,
  Bath,
  Trees,
  Car,
  Compass,
  MapPin,
  X,
  LayoutGrid,
  Wand2,
} from 'lucide-react';
import { ZoneInstance, ZoneSpatialLayout, ZoneOpening, removeZones, applyGlobalState, getZoneBadge, GlobalFinishingState, addCustomZone, getStatusForTrade } from '@/lib/layering';
import { SMART_ZONE_SUGGESTIONS } from '@/lib/layering/categories';
import { ZONE_TEMPLATES, TRADE_TEMPLATES, getTradesForZone, getAttributesForTrade } from '@/lib/layering/templates';
import { ZONE_CATEGORY_BUCKETS, ZoneCategoryBucket } from '@/lib/layering/categories';
import { computeMetricLayout, openingSegments } from '@/lib/layering/floorplanLayout';
import { fallbackMetricFor, FALLBACK_ZONE_TITLES } from '@/lib/layering/zoneMetrics';

interface CADBlueprintBuilderProps {
  zoneInstances: ZoneInstance[];
  onZoneInstancesChange: (updated: ZoneInstance[]) => void;
  propertyType?: 'apartment' | 'building' | 'garage';
  subtype?: 'standard' | 'duplex' | 'standard_roof' | 'full_roof' | 'ground' | 'residential' | 'commercial' | 'mixed' | 'mixed_use' | string;
  bedrooms?: number;
  /** Declared property area from wizard Step 1 (m²) — powers the reconciliation bar. */
  declaredArea?: number;
  /** Optional controlled selection — lets a parent host an external inspector panel. */
  selectedZoneId?: string | null;
  onSelectedZoneIdChange?: (id: string | null) => void;
  /** When provided, the room list renders into this element (Figma-style sidebar) instead of the workspace column. */
  listPortalTarget?: HTMLElement | null;
  /** Receives bedrooms/bathrooms/floor number chosen in the preset wizard so the host form can persist them. */
  onPresetMeta?: (meta: { bedrooms: number; bathrooms: number; floorNumber: number | null }) => void;
  /** When true and activeZones are empty, opens the wizard automatically */
  autoOpenWizardOnEmpty?: boolean;
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
  'bld.unit':           { l: 14.0, w: 10.0, ceiling: '3.0m Flush',   titleEn: 'Residential Unit',          titleAr: 'وحدة سكنية' },
  'bld.entrance_gate':   { l: 4.0,  w: 1.5,  ceiling: 'Open Sky',     titleEn: 'Entrance Gate & Fence',     titleAr: 'بوابة وسور المدخل' },
  'bld.entrance_lobby':  { l: 6.0,  w: 4.0,  ceiling: '3.6m Flush',   titleEn: 'Main Entrance & Lobby',     titleAr: 'مدخل العمارة والردهة' },
  'bld.staircase':       { l: 5.0,  w: 3.0,  ceiling: '3.0m Flush',   titleEn: 'Building Staircase',        titleAr: 'السلم وبيت السلم' },
  'bld.elevator':        { l: 2.2,  w: 2.0,  ceiling: '3.0m Flush',   titleEn: 'Elevator & Shaft',          titleAr: 'الأسانسير والمصعد' },
  'bld.electric_box':    { l: 2.5,  w: 1.8,  ceiling: '3.0m Flush',   titleEn: 'Electric Meters & Board Box', titleAr: 'غرفة ولوحة الكهرباء والعدادات' },
  'bld.water_motors':    { l: 2.5,  w: 1.8,  ceiling: '3.0m Flush',   titleEn: 'Water Motors & Pumps Box',  titleAr: 'غرفة مواتير ومضخات المياه' },
  'bld.garage_bays':     { l: 6.0,  w: 5.5,  ceiling: '3.0m Flush',   titleEn: 'Ground Garage & Parking',   titleAr: 'باكيات الجراج الأرضي' },
  'bld.guard_room':      { l: 3.0,  w: 2.5,  ceiling: '3.0m Flush',   titleEn: 'Guard Room / Booth',        titleAr: 'غرفة الحارس والأمن' },
  'bld.commercial_shop': { l: 8.0,  w: 5.0,  ceiling: '3.8m Flush',   titleEn: 'Commercial Shop / Retail',  titleAr: 'محل تجاري' },
  'bld.central_corridor': { l: 6.0, w: 2.5,  ceiling: '3.0m Flush',   titleEn: 'Central Floor Corridor',   titleAr: 'طرقة التوزيع بالدور' },
  'bld.lightwell':       { l: 3.0,  w: 2.5,  ceiling: 'Open Duct',    titleEn: 'Building Lightwell & Duct', titleAr: 'منور العمارة والخدمات' },
  'bld.balcony':         { l: 4.0,  w: 1.5,  ceiling: 'Open Balcony', titleEn: 'Exterior Balcony / Terrace', titleAr: 'البلكونة والتراس الخارجي' },
  'bld.roof_terrace':    { l: 12.0, w: 8.0,  ceiling: 'Open Sky',     titleEn: 'Panoramic Roof Terrace',    titleAr: 'تراس السطح والبرجولا' },
  'bld.roof_service':    { l: 5.0,  w: 4.0,  ceiling: '3.0m Flush',   titleEn: 'Elevator Machine & Tanks',  titleAr: 'غرفة محرك الأسانسير وخزانات المياه' },
  // ── Garage (جراج) zones ─────────────────────────────────────────────────
  'grg.garage': { l: 12.0, w: 6.0, ceiling: '2.8m Low', titleEn: 'Garage', titleAr: 'الجراج' },
  'grg.ramp':  { l: 6.0, w: 3.5, ceiling: '2.8m Low',  titleEn: 'Ramp & Gate',    titleAr: 'الرامب والبوابة' },
  'grg.bay':   { l: 5.5, w: 2.5, ceiling: '2.8m Low',  titleEn: 'Parking Bay',    titleAr: 'باكية الجراج' },
  'grg.elec':  { l: 2.0, w: 1.5, ceiling: '2.8m Low',  titleEn: 'Electrical Box', titleAr: 'لوحة الكهرباء' },
};

// ── Smart per-type default dimensions on add (spec §8 Phase 1, §4.1) ─────────
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
  'bld.unit':           { l: 14.0, w: 10.0 },
  'bld.entrance_gate':   { l: 4.0,  w: 1.5 },
  'bld.entrance_lobby':  { l: 6.0,  w: 4.0 },
  'bld.staircase':       { l: 5.0,  w: 3.0 },
  'bld.elevator':        { l: 2.2,  w: 2.0 },
  'bld.electric_box':    { l: 2.5,  w: 1.8 },
  'bld.water_motors':    { l: 2.5,  w: 1.8 },
  'bld.garage_bays':     { l: 6.0,  w: 5.5 },
  'bld.guard_room':      { l: 3.0,  w: 2.5 },
  'bld.commercial_shop': { l: 8.0,  w: 5.0 },
  'bld.central_corridor': { l: 6.0, w: 2.5 },
  'bld.lightwell':       { l: 3.0,  w: 2.5 },
  'bld.balcony':         { l: 4.0,  w: 1.5 },
  'bld.roof_terrace':    { l: 12.0, w: 8.0 },
  'bld.roof_service':    { l: 5.0,  w: 4.0 },
  'grg.garage': { l: 12.0, w: 6.0 },
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

// ── Adaptive Preset-Generation Wizard Model ─────────────────────────────────
export interface AdaptiveWizardAnswers {
  globalFinishing: GlobalFinishingState;
  floorNumber: string;

  // 1. Standard Apartment (شقة عادية)
  livingRooms: number;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  guestToilet: boolean;
  separateDining: boolean;
  maidRoom: boolean;
  laundryRoom: boolean;
  dressingRoom: boolean;

  // 2. Duplex (دوبلكس طابقين)
  duplexReceptionSections: number;
  duplexSeparateDining: boolean;
  duplexGuestToilet: boolean;
  duplexGroundGarden: boolean;
  duplexUpperBedrooms: number;
  duplexUpperBaths: number;
  duplexUpperLiving: boolean;
  duplexUpperBalconies: number;
  duplexInternalStairs: boolean;
  duplexMaidRoom: boolean;
  duplexLaundry: boolean;

  // 3. Standard Roof (روف عادي) — basic apartment on rooftop floor
  stdRoofBedrooms: number;
  stdRoofBathrooms: number;
  stdRoofGuestToilet: boolean;
  stdRoofBalcony: boolean;
  stdRoofLaundry: boolean;

  // 4. Premium Roof (روف بريميم) — Unit A + Unit B (150m+150m) on same floor + plain open rooftop above
  premiumRoofUnitABedrooms: number;
  premiumRoofUnitABaths: number;
  premiumRoofUnitBBedrooms: number;
  premiumRoofUnitBBaths: number;

  // 4. Entire Building (عمارة كاملة)
  buildingTypicalFloors: number;
  buildingUnitsPerFloor: number;
  buildingBedsPerUnit: number;
  buildingHasBasement: boolean;
  buildingCommercialShops: number;
  buildingHasGuardRoom: boolean;
  buildingHasRoofTerrace: boolean;

  // 5. Garage (جراج خاص أو تجاري)
  garageBays: number;
  garageHasEvCharger: boolean;
  garageHasCarWash: boolean;
  garageHasSecurityBooth: boolean;
  garageHasStorage: boolean;
}

export const ADAPTIVE_WIZARD_DEFAULTS: AdaptiveWizardAnswers = {
  globalFinishing: 'semi_finished',
  floorNumber: '',

  // Standard Flat
  livingRooms: 1,
  bedrooms: 3,
  bathrooms: 2,
  balconies: 1,
  guestToilet: true,
  separateDining: false,
  maidRoom: false,
  laundryRoom: false,
  dressingRoom: false,

  // Duplex
  duplexReceptionSections: 2,
  duplexSeparateDining: true,
  duplexGuestToilet: true,
  duplexGroundGarden: false,
  duplexUpperBedrooms: 3,
  duplexUpperBaths: 2,
  duplexUpperLiving: true,
  duplexUpperBalconies: 1,
  duplexInternalStairs: true,
  duplexMaidRoom: false,
  duplexLaundry: false,

  // Standard Roof
  stdRoofBedrooms: 3,
  stdRoofBathrooms: 2,
  stdRoofGuestToilet: false,
  stdRoofBalcony: false,
  stdRoofLaundry: false,

  // Premium Roof
  premiumRoofUnitABedrooms: 3,
  premiumRoofUnitABaths: 2,
  premiumRoofUnitBBedrooms: 3,
  premiumRoofUnitBBaths: 2,

  // Building
  buildingTypicalFloors: 4,
  buildingUnitsPerFloor: 2,
  buildingBedsPerUnit: 3,
  buildingHasBasement: true,
  buildingCommercialShops: 2,
  buildingHasGuardRoom: true,
  buildingHasRoofTerrace: true,

  // Garage
  garageBays: 10,
  garageHasEvCharger: true,
  garageHasCarWash: false,
  garageHasSecurityBooth: true,
  garageHasStorage: true,
};

function templatesFromAnswers(a: AdaptiveWizardAnswers): string[] {
  const list: string[] = [];
  for (let i = 0; i < Math.max(1, a.livingRooms || 1); i++) list.push('apt.reception');
  if (a.separateDining) list.push('apt.reception');
  list.push('apt.kitchen', 'apt.corridor');
  list.push('apt.master_bed');
  if (a.bathrooms > 1) list.push('apt.master_bath');
  for (let i = 1; i < Math.max(1, a.bedrooms); i++) list.push('apt.std_bed');
  const remainingBaths = Math.max(1, a.bathrooms - (a.bathrooms > 1 ? 1 : 0));
  for (let i = 0; i < remainingBaths; i++) list.push('apt.main_bath');
  for (let i = 0; i < Math.max(0, a.balconies); i++) list.push('apt.balcony');
  if (a.guestToilet) list.push('apt.guest_bath');
  if (a.laundryRoom) list.push('apt.laundry');
  return list;
}

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

const GLOBAL_STATE_OPTIONS: Array<{ id: GlobalFinishingState; icon: 'brick' | 'crane' | 'sparkle'; en: string; ar: string }> = [
  { id: 'red_brick', icon: 'brick', en: 'Red Brick', ar: 'طوب أحمر' },
  { id: 'semi_finished', icon: 'crane', en: 'Semi', ar: 'نص تشطيب' },
  { id: 'fully_finished', icon: 'sparkle', en: 'Finished', ar: 'تشطيب كامل' },
];

const GROUND_KEY = '__ground__';

function floorKeyOf(z: ZoneInstance): string {
  return z.level_label?.trim() || GROUND_KEY;
}

function floorLabelFor(key: string, isAr: boolean): string {
  if (key === GROUND_KEY) return isAr ? 'الأرضي' : 'Ground';
  return key;
}

function renderCategoryIcon(key: string, size: number = 13) {
  switch (key) {
    case 'living':
      return <Sofa size={size} />;
    case 'bedrooms':
      return <Bed size={size} />;
    case 'baths_kitchen':
      return <Bath size={size} />;
    case 'outdoor':
    case 'roof_outdoor':
      return <Trees size={size} />;
    case 'ground_entrance':
      return <DoorOpen size={size} />;
    case 'utilities_parking':
    case 'garage':
      return <Car size={size} />;
    case 'floor_core':
    case 'units':
    default:
      return <Building size={size} />;
  }
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
            <input
              type="text"
              className="fp-ceiling-select"
              dir="auto"
              defaultValue={ceiling}
              placeholder={isAr ? 'مثال: 3.0m' : 'e.g. 3.0m Flush'}
              maxLength={30}
              onBlur={(e) => { if (e.target.value.trim() && e.target.value !== ceiling) onPatch({ ceiling_height: e.target.value.trim() }); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v && v !== ceiling) onPatch({ ceiling_height: v });
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
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
  subtype = 'standard',
  bedrooms = 2,
  declaredArea,
  selectedZoneId: controlledSelectedZoneId,
  onSelectedZoneIdChange,
  listPortalTarget = null,
  onPresetMeta,
  autoOpenWizardOnEmpty = false,
  isAr = false,
}) => {
  const defaultKey = propertyType === 'building'
    ? 'bld_ground'
    : propertyType === 'garage'
      ? 'grg_ramp'
      : subtype === 'full_roof'
        ? (isAr ? 'الدور المشترك' : 'Shared Floor')
        : subtype === 'standard_roof'
          ? (isAr ? 'السطح' : 'Roof')
          : subtype === 'duplex'
            ? (isAr ? 'الدور السفلي' : 'Lower Floor')
            : GROUND_KEY;
  const [activeFloorKey, setActiveFloorKey] = useState<string>(defaultKey);
  const [internalSelectedZoneId, setInternalSelectedZoneId] = useState<string | null>(null);
  const isControlledSelection = controlledSelectedZoneId !== undefined;
  const selectedZoneId = isControlledSelection ? controlledSelectedZoneId : internalSelectedZoneId;
  const setSelectedZoneId = useCallback((id: string | null) => {
    onSelectedZoneIdChange?.(id);
    if (!isControlledSelection) setInternalSelectedZoneId(id);
  }, [onSelectedZoneIdChange, isControlledSelection]);
  const [groupAddOpen, setGroupAddOpen] = useState<string | null>(null);
  const [customInputForGroup, setCustomInputForGroup] = useState<string | null>(null);
  const [customGroupRoomName, setCustomGroupRoomName] = useState('');
  const [customZoneName, setCustomZoneName] = useState('');
  const [dismissedPresets, setDismissedPresets] = useState<Record<string, boolean>>({});
  const [wizardOpen, setWizardOpen] = useState(autoOpenWizardOnEmpty && zoneInstances.length === 0);
  const [wizard, setWizard] = useState<AdaptiveWizardAnswers>(() => ({
    ...ADAPTIVE_WIZARD_DEFAULTS,
    bedrooms: bedrooms || 3,
    duplexUpperBedrooms: bedrooms || 3,
    stdRoofBedrooms: Math.min(bedrooms || 3, 5),
    premiumRoofUnitABedrooms: Math.min(bedrooms || 3, 5),
    premiumRoofUnitBBedrooms: Math.min(bedrooms || 3, 5),
  }));

  useEffect(() => {
    if (autoOpenWizardOnEmpty && zoneInstances.length === 0) {
      setWizardOpen(true);
    }
  }, [autoOpenWizardOnEmpty, zoneInstances.length]);
  const [extraFloors, setExtraFloors] = useState<string[]>([]);
  const [renamingFloorKey, setRenamingFloorKey] = useState<string | null>(null);
  const [floorDraft, setFloorDraft] = useState('');
  const [toast, setToast] = useState<{ label: string } | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [dragState, setDragState] = useState<{ id: string; overIndex: number } | null>(null);
  const [canvasDrag, setCanvasDrag] = useState<{
    id: string;
    x: number;
    y: number;
    overId: string | null;
    snap?: { x: number; y: number; w: number; h: number };
    guides?: Array<{ x1: number; y1: number; x2: number; y2: number; label: string; type: 'x' | 'y' }>;
    snapLabel?: string;
    dockedWith?: string;
  } | null>(null);
  const [magneticSnap, setMagneticSnap] = useState(true);
  const [gridResolutionM, setGridResolutionM] = useState<number>(0.5);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [activeOpeningHover, setActiveOpeningHover] = useState<{
    zoneId: string;
    kind: 'door' | 'window';
    edge: 'n' | 'e' | 's' | 'w';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    offsetM: number;
    widthM: number;
    distLeftM: number;
    distRightM: number;
  } | null>(null);
  const [composerTool, setComposerTool] = useState<'select' | 'door' | 'window'>('select');
  const [bldView, setBldView] = useState<
    | { mode: 'elevation' }
    | { mode: 'floor'; floorKey: string }
    | { mode: 'unit'; floorKey: string; unitId: string }
  >({ mode: 'elevation' });

  // ── Canvas Pan & Zoom Interactive States ──
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [canvasZoom, setCanvasZoom] = useState<number>(1);
  const [isPanningCanvas, setIsPanningCanvas] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({ clientX: 0, clientY: 0, panX: 0, panY: 0 });
  const clipboardZoneRef = useRef<ZoneInstance | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const suppressCanvasClickRef = useRef(false);
  const previewSlotsRef = useRef<Array<{ zone: ZoneInstance; x: number; y: number; w: number; h: number }>>([]);
  const metricLayoutRef = useRef<ReturnType<typeof computeMetricLayout> | null>(null);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const spatialOfRef = useRef<((z: ZoneInstance) => { l: number; w: number; sqm: number; ceiling: string }) | null>(null);
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

  const spatialOf = useCallback((z: ZoneInstance): { l: number; w: number; sqm: number; ceiling: string } => {
    if (!z.spatial && z.children && z.children.length > 0) {
      const sqm = Math.max(1, Math.round(z.children.reduce((sum, c) => sum + spatialOfRef.current!(c).sqm, 0)));
      const l = round1(Math.sqrt(sqm * (3 / 4)));
      const w = round1(sqm / l);
      return { l, w, sqm, ceiling: '3.0m Flush' };
    }
    const shared = fallbackMetricFor(z.zone_template_id);
    const d = starterDims(z.zone_template_id);
    const l = z.spatial?.length_m ?? shared?.length_m ?? d.l;
    const w = z.spatial?.width_m ?? shared?.width_m ?? d.w;
    const sqm = z.spatial?.sqm ?? shared?.sqm ?? Math.round(l * w);
    const ceiling = z.spatial?.ceiling_height ?? shared?.ceiling ?? DEFAULT_DIMENSIONS[z.zone_template_id]?.ceiling ?? '3.0m Flush';
    return { l, w, sqm, ceiling };
  }, []);
  spatialOfRef.current = spatialOf;

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
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;

      const k = e.key.toLowerCase();
      // Undo / Redo
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
        return;
      }

      // Copy Component (Ctrl+C)
      if (k === 'c') {
        const slots = previewSlotsRef.current;
        const found = slots.find(s => s.zone.id === selectedZoneId)?.zone || zonesRef.current.find(z => z.id === selectedZoneId);
        if (found) {
          clipboardZoneRef.current = found;
          showToast(isAr ? `تم نسخ "${found.instance_label || 'غرفة'}" (اضغط Ctrl+V للصق)` : `Copied "${found.instance_label || 'Space'}" (Press Ctrl+V to paste)`);
        }
        return;
      }

      // Paste Component Outside Apartment (Ctrl+V)
      if (k === 'v') {
        if (clipboardZoneRef.current) {
          e.preventDefault();
          const src = clipboardZoneRef.current;
          const slots = previewSlotsRef.current;
          const currentTotalSqm = zonesRef.current.reduce((sum, z) => {
            const sp = spatialOf(z);
            return sum + (sp?.sqm ?? 0);
          }, 0);

          if (declaredArea && declaredArea > 0) {
            const remainingSqm = declaredArea - currentTotalSqm;
            if (remainingSqm < 2.0) {
              showToast(isAr ? `لا يمكن اللصق: تم استهلاك كامل مساحة الشقة (${declaredArea}م²)` : `Cannot paste: total apartment area reached (${declaredArea}m²)`);
              return;
            }
          }

          const maxX = slots.length > 0
            ? Math.max(...slots.map(s => {
                const sp = s.zone.spatial;
                return (sp?.pos_x_m ?? 0) + (sp?.width_m ?? 4.0);
              }))
            : 12;

          let cloneW = src.spatial?.width_m ?? 4.0;
          let cloneL = src.spatial?.length_m ?? 3.5;
          let cloneSqm = round1(cloneW * cloneL);

          if (declaredArea && declaredArea > 0) {
            const remainingSqm = Math.max(2.25, round1(declaredArea - currentTotalSqm));
            if (cloneSqm > remainingSqm) {
              const scale = Math.sqrt(remainingSqm / cloneSqm);
              cloneW = Math.max(1.5, round1(Math.floor(cloneW * scale * 10) / 10));
              cloneL = Math.max(1.5, round1(Math.floor(cloneL * scale * 10) / 10));
              cloneSqm = round1(cloneW * cloneL);
            }
          }

          const newId = `zone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const cloned: ZoneInstance = {
            ...src,
            id: newId,
            instance_label: (src.instance_label || 'Space') + (isAr ? ' (نسخة)' : ' (Copy)'),
            trades: (src.trades || []).map(t => ({
              ...t,
              id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              attributes: (t.attributes || []).map(a => ({ ...a })),
            })),
            spatial: {
              ...(src.spatial || { gridX: 0, gridY: 0, gridW: 6, gridH: 4 }),
              pos_x_m: round1(maxX + 1.2),
              pos_y_m: 0,
              width_m: cloneW,
              length_m: cloneL,
              sqm: cloneSqm,
            } as ZoneSpatialLayout,
          };

          pushHistory(zonesRef.current);
          onZoneInstancesChange([...zonesRef.current, cloned]);
          setSelectedZoneId(newId);
          showToast(isAr ? 'تم لصق الغرفة خارج المخطط — اسحبها لمكانها' : 'Room pasted outside apartment — drag to position');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedZoneId, isAr, declaredArea, spatialOf, pushHistory, onZoneInstancesChange, setSelectedZoneId, showToast]);

  useEffect(() => {
    setActiveFloorKey(defaultKey);
    setSelectedZoneId(null);
    setBldView({ mode: 'elevation' });
    setComposerTool('select');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyType]);

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
      for (const z of flat) {
        const key = floorKeyOf(z);
        if (!groups[key]) {
          groups[key] = { labelEn: floorLabelFor(key, false), labelAr: floorLabelFor(key, true), zones: [] };
        }
        groups[key].zones.push(z);
      }
      for (const key of extraFloors) {
        if (!groups[key]) {
          groups[key] = { labelEn: floorLabelFor(key, false), labelAr: floorLabelFor(key, true), zones: [] };
        }
      }
      // If no other floors were added or GROUND_KEY is explicitly in extraFloors/has zones:
      if (Object.keys(groups).length === 0 || (extraFloors.includes(GROUND_KEY) && !groups[GROUND_KEY])) {
        groups[GROUND_KEY] = { labelEn: floorLabelFor(GROUND_KEY, false), labelAr: floorLabelFor(GROUND_KEY, true), zones: [] };
      }
      for (const g of Object.values(groups)) {
        g.zones.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      }
    } else if (propertyType === 'building') {
      groups['bld_ground'] = { labelEn: 'Ground Floor & Entrance', labelAr: 'الدور الأرضي والمدخل', zones: [] };
      for (const z of flat) {
        const lvl = z.level_label || 'bld_ground';
        const isGround = lvl === 'bld_ground' || lvl === 'Ground Floor';
        const isRoof = lvl === 'bld_roof' || lvl === 'Roof';
        const isBasement = lvl === 'bld_basement' || lvl === 'Basement';

        const targetKey = isGround ? 'bld_ground' : isRoof ? 'bld_roof' : isBasement ? 'bld_basement' : lvl;
        if (!groups[targetKey]) {
          const labelEn = targetKey === 'bld_roof' ? 'Roof & Sky Terrace' : targetKey === 'bld_basement' ? 'Basement / Parking' : targetKey;
          const labelAr = targetKey === 'bld_roof' ? 'السطح والخدمات' : targetKey === 'bld_basement' ? 'البدروم والجراج' : targetKey;
          groups[targetKey] = { labelEn, labelAr, zones: [] };
        }
        groups[targetKey].zones.push(z);
      }
      for (const g of Object.values(groups)) {
        g.zones.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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


  const floorSqm = useCallback((zones: ZoneInstance[]) => {
    return Math.round(zones.reduce((sum, z) => sum + spatialOf(z).sqm, 0));
  }, [spatialOf]);

  const buildingModel = useMemo(() => {
    if (propertyType !== 'building') return null;
    const basement = zoneInstances.filter(z => z.zone_template_id === 'bld.basement' || z.level_label === 'bld_basement');
    const ground = zoneInstances.filter(z => z.level_label === 'bld_ground' || z.zone_template_id === 'bld.ground_lobby');
    const roof = zoneInstances.filter(z => z.level_label === 'bld_roof' || z.zone_template_id === 'bld.roof');
    const units = zoneInstances.filter(z => z.zone_template_id === 'bld.unit');
    const others = zoneInstances.filter(z => !['bld.basement', 'bld.ground_lobby', 'bld.roof', 'bld.unit'].includes(z.zone_template_id));

    const floorsMap = new Map<string, ZoneInstance[]>();
    for (const u of units) {
      const key = u.level_label || 'Floor 1';
      if (!floorsMap.has(key)) floorsMap.set(key, []);
      floorsMap.get(key)!.push(u);
    }
    const floorNum = (k: string) => {
      const m = k.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    };
    const unitSignature = (u: ZoneInstance) => {
      const letter = (u.instance_label || '').replace(/[^A-Za-z]/g, '').replace(/^Flat/i, '');
      const kids = (u.children ?? [])
        .map(c => `${c.zone_template_id}:${Math.round(spatialOf(c).sqm)}`)
        .sort()
        .join('|');
      return `${letter}=${kids}`;
    };
    const floors = Array.from(floorsMap.entries())
      .map(([key, us]) => ({
        key,
        num: floorNum(key),
        units: [...us].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        sqm: Math.round(us.reduce((s, u) => s + spatialOf(u).sqm, 0)),
        signature: us.map(unitSignature).sort().join('||'),
      }))
      .sort((a, b) => a.num - b.num);

    return { basement, ground, roof, units, others, floors };
  }, [propertyType, zoneInstances, spatialOf]);

  const composerActive = propertyType === 'apartment' || (propertyType === 'building' && bldView.mode === 'unit');

  const activeZones = useMemo(() => {
    if (propertyType === 'building') {
      if (!buildingModel) return [];
      if (bldView.mode === 'elevation') {
        return zoneInstances;
      }
      if (bldView.mode === 'floor') {
        const fk = bldView.floorKey;
        const isGround = fk === 'bld_ground' || fk === 'Ground Floor';
        const isRoof = fk === 'bld_roof' || fk === 'Roof';
        const isBasement = fk === 'bld_basement' || fk === 'Basement';

        return zoneInstances.filter(z => {
          const lvl = z.level_label;
          if (isGround) return lvl === 'bld_ground' || lvl === 'Ground Floor' || z.zone_template_id === 'bld.ground_lobby';
          if (isRoof) return lvl === 'bld_roof' || lvl === 'Roof' || z.zone_template_id === 'bld.roof';
          if (isBasement) return lvl === 'bld_basement' || lvl === 'Basement' || z.zone_template_id === 'bld.basement';
          return lvl === fk;
        });
      }
      const unit = buildingModel.units.find(u => u.id === bldView.unitId);
      return unit?.children ?? [];
    }
    const group = floorGroups[activeFloorKey];
    return group ? group.zones : [];
  }, [floorGroups, activeFloorKey, propertyType, bldView, buildingModel, zoneInstances]);

  const zoneGroups = useMemo(() => {
    const bucketKey = propertyType === 'building' && bldView.mode === 'unit' ? 'apartment' : propertyType;
    const buckets = ZONE_CATEGORY_BUCKETS[bucketKey] ?? ZONE_CATEGORY_BUCKETS.apartment;
    const used = new Set<string>();
    const groups = buckets.map(bucket => ({
      bucket,
      zones: activeZones.filter(z => {
        if (used.has(z.id)) return false;
        const hit = bucket.match(z.zone_template_id, z.instance_label);
        if (hit) used.add(z.id);
        return hit;
      }),
    }));
    const other = activeZones.filter(z => !used.has(z.id));
    return { groups, other };
  }, [activeZones, propertyType, bldView.mode]);

  const displayZones = useMemo(
    () => [...zoneGroups.groups.flatMap(g => g.zones), ...zoneGroups.other],
    [zoneGroups],
  );

  const currentSelectedZone = useMemo(() => {
    if (!selectedZoneId) return null;
    return activeZones.find(z => z.id === selectedZoneId) || null;
  }, [selectedZoneId, activeZones]);

  const getZoneLabel = useCallback((z: ZoneInstance) => {
    if (z.zone_template_id === 'bld.unit' && z.instance_label && z.level_label) {
      return `${z.instance_label} (${z.level_label})`;
    }
    if (z.instance_label && z.instance_label.trim()) return z.instance_label;
    const def = DEFAULT_DIMENSIONS[z.zone_template_id];
    if (def) return isAr ? def.titleAr : def.titleEn;
    const tmpl = ZONE_TEMPLATES.find(t => t.id === z.zone_template_id);
    if (tmpl) return isAr ? tmpl.label_ar : tmpl.label_en;
    const shared = FALLBACK_ZONE_TITLES[z.zone_template_id];
    if (shared) return isAr ? shared.ar : shared.en;
    return z.zone_template_id;
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
            let l = updates.length_m ?? currentSpatial.length_m;
            let w = updates.width_m ?? currentSpatial.width_m;

            if (declaredArea && declaredArea > 0 && propertyType === 'apartment') {
              const otherRoomsSqm = activeZones
                .filter(other => other.id !== zoneId)
                .reduce((sum, other) => sum + spatialOf(other).sqm, 0);
              const maxAllowedAreaSqm = Math.max(2.25, declaredArea - otherRoomsSqm);
              if (round1(l * w) > maxAllowedAreaSqm) {
                if (updates.length_m !== undefined && updates.width_m === undefined) {
                  l = Math.max(1.5, Math.floor((maxAllowedAreaSqm / w) * 10) / 10);
                } else if (updates.width_m !== undefined && updates.length_m === undefined) {
                  w = Math.max(1.5, Math.floor((maxAllowedAreaSqm / l) * 10) / 10);
                } else {
                  const scale = Math.sqrt(maxAllowedAreaSqm / (l * w));
                  l = Math.max(1.5, round1(l * scale));
                  w = Math.max(1.5, round1(maxAllowedAreaSqm / l));
                }
              }
            }

            nextSpatial.length_m = l;
            nextSpatial.width_m = w;
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
  // trades/attributes coupling stays identical either way.
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
      instance_label: defaults.titleEn,
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

  const handlePropagateUnit = () => {
    if (bldView.mode !== 'unit' || !buildingModel) return;
    const unit = buildingModel.units.find(u => u.id === bldView.unitId);
    if (!unit) return;
    const letter = (unit.instance_label || '').trim().slice(-1).toUpperCase();
    if (!/[A-Z]/.test(letter)) return;

    const cloneZones = (zones: ZoneInstance[], levelLabel?: string): ZoneInstance[] =>
      zones.map((z, i) => ({
        ...z,
        id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${i}`,
        level_label: levelLabel ?? z.level_label,
        trades: (z.trades || []).map(t => ({
          ...t,
          id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          attributes: t.attributes.map(a => ({ ...a })),
        })),
        spatial: z.spatial
          ? { ...z.spatial, openings: z.spatial.openings?.map(o => ({ ...o, id: `open-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })) }
          : undefined,
        children: z.children && z.children.length > 0 ? cloneZones(z.children, levelLabel ?? z.level_label) : undefined,
      }));

    const targets = buildingModel.units.filter(u =>
      u.id !== unit.id && (u.instance_label || '').trim().slice(-1).toUpperCase() === letter,
    );
    if (targets.length === 0) {
      showToast(isAr ? 'لا توجد وحدات مطابقة' : 'No matching units found');
      return;
    }
    const targetIds = new Set(targets.map(t => t.id));
    pushHistory(zoneInstances);
    onZoneInstancesChange(zoneInstances.map(z =>
      targetIds.has(z.id) ? { ...z, children: cloneZones(unit.children ?? [], z.level_label) } : z,
    ));
    showToast(isAr
      ? `تم التطبيق على ${targets.length} ${targets.length === 1 ? 'وحدة' : 'وحدات'}`
      : `Applied to ${targets.length} ${targets.length === 1 ? 'unit' : 'units'}`);
  };

  const handleAddRoom = (templateId: string) => {
    if (propertyType === 'building') {
      if (bldView.mode === 'unit') {
        const unit = buildingModel?.units.find(u => u.id === bldView.unitId);
        if (!unit) return;
        const newZone = buildRoomInstance(templateId, (unit.children?.length ?? 0) + 1, unit.level_label);
        pushHistory(zoneInstances);
        onZoneInstancesChange(zoneInstances.map(z =>
          z.id === unit.id ? { ...z, children: [...(z.children ?? []), newZone] } : z,
        ));
        setSelectedZoneId(newZone.id);
        requestAnimationFrame(() => {
          const el = rowRefs.current[newZone.id];
          el?.scrollIntoView({ block: 'nearest' });
          el?.querySelector<HTMLInputElement>('.fp-stepper-input')?.focus();
        });
        return;
      }
      if (bldView.mode === 'floor') {
        const floorKey = bldView.floorKey;
        if (templateId === 'bld.unit') {
          const floorNum = floorKey.replace(/\D/g, '') || '1';
          const existingInFloor = zoneInstances.filter(z => z.zone_template_id === 'bld.unit' && (z.level_label || 'Floor 1') === floorKey);
          const letter = String.fromCharCode(65 + existingInFloor.length);
          const newUnit: ZoneInstance = {
            id: `zone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            zone_template_id: 'bld.unit',
            instance_label: `Flat ${floorNum}${letter}`,
            level_label: floorKey,
            sort_order: zoneInstances.length + 1,
            trades: [],
            children: ['apt.reception', 'apt.kitchen', 'apt.master_bed', 'apt.std_bed', 'apt.main_bath', 'apt.balcony'].map((tid, i) => buildRoomInstance(tid, i + 1, floorKey)),
          };
          pushHistory(zoneInstances);
          onZoneInstancesChange([...zoneInstances, newUnit]);
          setSelectedZoneId(newUnit.id);
          return;
        }

        const newZone = buildRoomInstance(templateId, zoneInstances.length + 1, floorKey);
        pushHistory(zoneInstances);
        onZoneInstancesChange([...zoneInstances, newZone]);
        setSelectedZoneId(newZone.id);
        requestAnimationFrame(() => {
          const el = rowRefs.current[newZone.id];
          el?.scrollIntoView({ block: 'nearest' });
          el?.querySelector<HTMLInputElement>('.fp-stepper-input')?.focus();
        });
        return;
      }
    }
    const levelLabel = propertyType === 'apartment' ? activeFloorKey : undefined;
    const newZone = buildRoomInstance(templateId, zoneInstances.length, levelLabel);
    if (propertyType === 'apartment' && declaredArea && declaredArea > 0) {
      const currentSqm = activeZones.reduce((sum, z) => sum + spatialOf(z).sqm, 0);
      const remaining = declaredArea - currentSqm;
      if (remaining > 0 && remaining < (newZone.spatial?.sqm || 12)) {
        const adjustedSqm = Math.max(2.25, remaining);
        const l = Math.max(1.5, round1(Math.sqrt(adjustedSqm * 1.2)));
        const w = Math.max(1.5, round1(adjustedSqm / l));
        newZone.spatial = {
          ...newZone.spatial!,
          length_m: l,
          width_m: w,
          sqm: round1(l * w),
        };
      }
    }
    pushHistory(zoneInstances);
    onZoneInstancesChange([...zoneInstances, newZone]);
    setSelectedZoneId(newZone.id);
    requestAnimationFrame(() => {
      const el = rowRefs.current[newZone.id];
      el?.scrollIntoView({ block: 'nearest' });
      el?.querySelector<HTMLInputElement>('.fp-stepper-input')?.focus();
    });
  };

  const handleGenerateFromWizard = () => {
    if (zoneInstances.length > 0) {
      const ok = window.confirm(
        isAr
          ? 'توليد تخطيط جديد سيستبدل المخطط الحالي. هل تريد المتابعة؟'
          : 'Generating a new layout will replace existing zones. Continue?'
      );
      if (!ok) return;
    }

    const applyFinishing = (z: ZoneInstance): ZoneInstance => {
      if (!wizard.globalFinishing) return z;
      const trades = (z.trades || []).map(t => {
        const tpl = TRADE_TEMPLATES.find(tradeTpl => tradeTpl.id === t.trade_template_id);
        return {
          ...t,
          status: tpl ? getStatusForTrade(tpl.id, wizard.globalFinishing, tpl.status_values) : t.status,
        };
      });
      const children = z.children?.map(applyFinishing);
      return { ...z, trades, children };
    };

    let generated: ZoneInstance[] = [];
    let metaBedrooms = wizard.bedrooms;
    let metaBathrooms = wizard.bathrooms;

    // ── CASE 1: Duplex Multi-Level Apartment ──────────────────────────────
    if (propertyType === 'apartment' && subtype === 'duplex') {
      const lowerLabel = isAr ? 'الدور السفلي' : 'Lower Floor';
      const upperLabel = isAr ? 'الدور العلوي' : 'Upper Floor';

      // Lower Floor
      const lowerList: string[] = [];
      for (let i = 0; i < Math.max(1, wizard.duplexReceptionSections); i++) lowerList.push('apt.reception');
      if (wizard.duplexSeparateDining) lowerList.push('apt.reception');
      lowerList.push('apt.kitchen', 'apt.corridor');
      if (wizard.duplexGuestToilet) lowerList.push('apt.guest_bath');
      if (wizard.duplexInternalStairs) lowerList.push('bld.staircase');
      if (wizard.duplexGroundGarden) lowerList.push('apt.balcony');
      if (wizard.duplexLaundry) lowerList.push('apt.laundry');

      const lowerZones = lowerList.map((tid, i) => buildRoomInstance(tid, i + 1, lowerLabel));

      // Upper Floor
      const upperList: string[] = [];
      upperList.push('apt.master_bed', 'apt.master_bath');
      if (wizard.duplexUpperLiving) upperList.push('apt.reception');
      for (let i = 1; i < Math.max(1, wizard.duplexUpperBedrooms); i++) upperList.push('apt.std_bed');
      for (let i = 0; i < Math.max(1, wizard.duplexUpperBaths - 1); i++) upperList.push('apt.main_bath');
      for (let i = 0; i < Math.max(0, wizard.duplexUpperBalconies); i++) upperList.push('apt.balcony');
      upperList.push('apt.corridor');
      if (wizard.duplexInternalStairs) upperList.push('bld.staircase');

      const upperZones = upperList.map((tid, i) => buildRoomInstance(tid, lowerZones.length + i + 1, upperLabel));

      generated = [...lowerZones, ...upperZones];
      if (wizard.duplexMaidRoom) {
        generated = addCustomZone(generated, isAr ? 'غرفة خادمة بحمام' : "Maid's Room with Bath", wizard.globalFinishing);
        if (generated[generated.length - 1]) generated[generated.length - 1].level_label = lowerLabel;
      }

      setExtraFloors([upperLabel]);
      setActiveFloorKey(lowerLabel);
      metaBedrooms = wizard.duplexUpperBedrooms;
      metaBathrooms = (wizard.duplexGuestToilet ? 1 : 0) + wizard.duplexUpperBaths;
    }
    // ── CASE 2a: Standard Roof (روف عادي) ──────────────────────────────
    else if (propertyType === 'apartment' && subtype === 'standard_roof') {
      const roofLabel = isAr ? 'السطح' : 'Roof';
      const stdList: string[] = [];
      stdList.push('apt.reception');
      stdList.push('apt.kitchen');
      stdList.push('apt.corridor');
      stdList.push('apt.master_bed');
      if (wizard.stdRoofBathrooms > 1) stdList.push('apt.master_bath');
      for (let i = 1; i < Math.max(1, wizard.stdRoofBedrooms); i++) stdList.push('apt.std_bed');
      const remainingBaths = Math.max(1, wizard.stdRoofBathrooms - (wizard.stdRoofBathrooms > 1 ? 1 : 0));
      for (let i = 0; i < remainingBaths; i++) stdList.push('apt.main_bath');
      if (wizard.stdRoofGuestToilet) stdList.push('apt.guest_bath');
      if (wizard.stdRoofBalcony) stdList.push('apt.balcony');
      if (wizard.stdRoofLaundry) stdList.push('apt.laundry');

      generated = stdList.map((tid, i) => buildRoomInstance(tid, i + 1, roofLabel));

      setExtraFloors([roofLabel]);
      setActiveFloorKey(roofLabel);
      metaBedrooms = wizard.stdRoofBedrooms;
      metaBathrooms = wizard.stdRoofBathrooms;
    }
    // ── CASE 2b: Premium Roof (روف بريميم) — Unit A + Unit B (150m+150m) + open rooftop ──
    else if (propertyType === 'apartment' && subtype === 'full_roof') {
      const sharedFloorLabel = isAr ? 'الدور المشترك' : 'Shared Floor';
      const openRoofLabel = isAr ? 'السطح المكشوف' : 'Open Rooftop';

      // ── Unit A (Left 150m² Apartment, X: 0 to 13.5m) ──────────────────────
      const unitAZones: ZoneInstance[] = [];
      let sortA = 1;

      // 1. Reception (8.0m × 5.0m = 40.0 m²) at (0, 0)
      const recA = buildRoomInstance('apt.reception', sortA++, sharedFloorLabel);
      recA.instance_label = isAr ? 'وحدة أ — الصالة / الاستقبال' : 'Unit A — Reception & Living';
      recA.spatial = { ...recA.spatial!, width_m: 8.0, length_m: 5.0, sqm: 40.0, pos_x_m: 0, pos_y_m: 0 };
      unitAZones.push(recA);

      // 2. Kitchen (4.0m × 3.5m = 14.0 m²) at (8.5, 0)
      const kitA = buildRoomInstance('apt.kitchen', sortA++, sharedFloorLabel);
      kitA.instance_label = isAr ? 'وحدة أ — المطبخ' : 'Unit A — Kitchen';
      kitA.spatial = { ...kitA.spatial!, width_m: 4.0, length_m: 3.5, sqm: 14.0, pos_x_m: 8.5, pos_y_m: 0 };
      unitAZones.push(kitA);

      // 3. Corridor (4.0m × 2.0m = 8.0 m²) at (8.5, 3.6)
      const corA = buildRoomInstance('apt.corridor', sortA++, sharedFloorLabel);
      corA.instance_label = isAr ? 'وحدة أ — الردّهة الداخلية' : 'Unit A — Inner Corridor';
      corA.spatial = { ...corA.spatial!, width_m: 4.0, length_m: 2.0, sqm: 8.0, pos_x_m: 8.5, pos_y_m: 3.6 };
      unitAZones.push(corA);

      // 4. Master Bed (5.5m × 4.0m = 22.0 m²) at (0, 5.4)
      const mBedA = buildRoomInstance('apt.master_bed', sortA++, sharedFloorLabel);
      mBedA.instance_label = isAr ? 'وحدة أ — غرفة النوم الرئيسية' : 'Unit A — Master Bedroom';
      mBedA.spatial = { ...mBedA.spatial!, width_m: 5.5, length_m: 4.0, sqm: 22.0, pos_x_m: 0, pos_y_m: 5.4 };
      unitAZones.push(mBedA);

      // 5. Master Bath (3.0m × 2.0m = 6.0 m²) at (5.8, 5.4)
      if (wizard.premiumRoofUnitABaths > 1) {
        const mBathA = buildRoomInstance('apt.master_bath', sortA++, sharedFloorLabel);
        mBathA.instance_label = isAr ? 'وحدة أ — الحمام الملحق' : 'Unit A — Master En-Suite';
        mBathA.spatial = { ...mBathA.spatial!, width_m: 3.0, length_m: 2.0, sqm: 6.0, pos_x_m: 5.8, pos_y_m: 5.4 };
        unitAZones.push(mBathA);
      }

      // 6. Main Bath (3.2m × 2.5m = 8.0 m²) at (9.0, 5.4)
      const bathA = buildRoomInstance('apt.main_bath', sortA++, sharedFloorLabel);
      bathA.instance_label = isAr ? 'وحدة أ — الحمام الرئيسي' : 'Unit A — Main Bathroom';
      bathA.spatial = { ...bathA.spatial!, width_m: 3.2, length_m: 2.5, sqm: 8.0, pos_x_m: 9.0, pos_y_m: 5.4 };
      unitAZones.push(bathA);

      // 7. Extra Standard Bedrooms (at y: 9.8)
      const extraBedsA = Math.max(1, wizard.premiumRoofUnitABedrooms) - 1;
      for (let i = 0; i < extraBedsA; i++) {
        const sBed = buildRoomInstance('apt.std_bed', sortA++, sharedFloorLabel);
        sBed.instance_label = isAr ? `وحدة أ — غرفة نوم ${i + 2}` : `Unit A — Bedroom ${i + 2}`;
        sBed.spatial = { ...sBed.spatial!, width_m: 4.5, length_m: 4.0, sqm: 18.0, pos_x_m: i * 4.8, pos_y_m: 9.8 };
        unitAZones.push(sBed);
      }

      // 8. Balcony (5.0m × 3.0m = 15.0 m²) attached outside
      const balcA = buildRoomInstance('apt.balcony', sortA++, sharedFloorLabel);
      balcA.instance_label = isAr ? 'وحدة أ — البلكونة' : 'Unit A — Balcony';
      balcA.spatial = { ...balcA.spatial!, width_m: 5.0, length_m: 3.0, sqm: 15.0, pos_x_m: Math.max(0, extraBedsA * 4.8), pos_y_m: 9.8 };
      unitAZones.push(balcA);

      // ── Unit B (Right 150m² Apartment, Offset X by 15.0m) ──────────────────
      const unitBZones: ZoneInstance[] = [];
      let sortB = sortA;
      const OFF_X = 15.0;

      // 1. Reception (8.0m × 5.0m = 40.0 m²) at (OFF_X + 0, 0)
      const recB = buildRoomInstance('apt.reception', sortB++, sharedFloorLabel);
      recB.instance_label = isAr ? 'وحدة ب — الصالة / الاستقبال' : 'Unit B — Reception & Living';
      recB.spatial = { ...recB.spatial!, width_m: 8.0, length_m: 5.0, sqm: 40.0, pos_x_m: OFF_X + 0, pos_y_m: 0 };
      unitBZones.push(recB);

      // 2. Kitchen (4.0m × 3.5m = 14.0 m²) at (OFF_X + 8.5, 0)
      const kitB = buildRoomInstance('apt.kitchen', sortB++, sharedFloorLabel);
      kitB.instance_label = isAr ? 'وحدة ب — المطبخ' : 'Unit B — Kitchen';
      kitB.spatial = { ...kitB.spatial!, width_m: 4.0, length_m: 3.5, sqm: 14.0, pos_x_m: OFF_X + 8.5, pos_y_m: 0 };
      unitBZones.push(kitB);

      // 3. Corridor (4.0m × 2.0m = 8.0 m²) at (OFF_X + 8.5, 3.6)
      const corB = buildRoomInstance('apt.corridor', sortB++, sharedFloorLabel);
      corB.instance_label = isAr ? 'وحدة ب — الردّهة الداخلية' : 'Unit B — Inner Corridor';
      corB.spatial = { ...corB.spatial!, width_m: 4.0, length_m: 2.0, sqm: 8.0, pos_x_m: OFF_X + 8.5, pos_y_m: 3.6 };
      unitBZones.push(corB);

      // 4. Master Bed (5.5m × 4.0m = 22.0 m²) at (OFF_X + 0, 5.4)
      const mBedB = buildRoomInstance('apt.master_bed', sortB++, sharedFloorLabel);
      mBedB.instance_label = isAr ? 'وحدة ب — غرفة النوم الرئيسية' : 'Unit B — Master Bedroom';
      mBedB.spatial = { ...mBedB.spatial!, width_m: 5.5, length_m: 4.0, sqm: 22.0, pos_x_m: OFF_X + 0, pos_y_m: 5.4 };
      unitBZones.push(mBedB);

      // 5. Master Bath (3.0m × 2.0m = 6.0 m²) at (OFF_X + 5.8, 5.4)
      if (wizard.premiumRoofUnitBBaths > 1) {
        const mBathB = buildRoomInstance('apt.master_bath', sortB++, sharedFloorLabel);
        mBathB.instance_label = isAr ? 'وحدة ب — الحمام الملحق' : 'Unit B — Master En-Suite';
        mBathB.spatial = { ...mBathB.spatial!, width_m: 3.0, length_m: 2.0, sqm: 6.0, pos_x_m: OFF_X + 5.8, pos_y_m: 5.4 };
        unitBZones.push(mBathB);
      }

      // 6. Main Bath (3.2m × 2.5m = 8.0 m²) at (OFF_X + 9.0, 5.4)
      const bathB = buildRoomInstance('apt.main_bath', sortB++, sharedFloorLabel);
      bathB.instance_label = isAr ? 'وحدة ب — الحمام الرئيسي' : 'Unit B — Main Bathroom';
      bathB.spatial = { ...bathB.spatial!, width_m: 3.2, length_m: 2.5, sqm: 8.0, pos_x_m: OFF_X + 9.0, pos_y_m: 5.4 };
      unitBZones.push(bathB);

      // 7. Extra Standard Bedrooms (at y: 9.8)
      const extraBedsB = Math.max(1, wizard.premiumRoofUnitBBedrooms) - 1;
      for (let i = 0; i < extraBedsB; i++) {
        const sBed = buildRoomInstance('apt.std_bed', sortB++, sharedFloorLabel);
        sBed.instance_label = isAr ? `وحدة ب — غرفة نوم ${i + 2}` : `Unit B — Bedroom ${i + 2}`;
        sBed.spatial = { ...sBed.spatial!, width_m: 4.5, length_m: 4.0, sqm: 18.0, pos_x_m: OFF_X + i * 4.8, pos_y_m: 9.8 };
        unitBZones.push(sBed);
      }

      // 8. Balcony (5.0m × 3.0m = 15.0 m²) attached outside
      const balcB = buildRoomInstance('apt.balcony', sortB++, sharedFloorLabel);
      balcB.instance_label = isAr ? 'وحدة ب — البلكونة' : 'Unit B — Balcony';
      balcB.spatial = { ...balcB.spatial!, width_m: 5.0, length_m: 3.0, sqm: 15.0, pos_x_m: OFF_X + Math.max(0, extraBedsB * 4.8), pos_y_m: 9.8 };
      unitBZones.push(balcB);

      // ── Open Rooftop slab — level above (plain open rooftop ~300m²) ────────
      const roofSlabZone = buildRoomInstance('apt.balcony', sortB++, openRoofLabel);
      roofSlabZone.instance_label = isAr ? 'السطح المكشوف — مساحة كاملة للعمارة' : 'Open Rooftop — Full Building Footprint';
      roofSlabZone.spatial = { ...roofSlabZone.spatial!, width_m: 28.0, length_m: 13.5, sqm: 300, pos_x_m: 0, pos_y_m: 0 };

      generated = [...unitAZones, ...unitBZones, roofSlabZone];

      setExtraFloors([sharedFloorLabel, openRoofLabel]);
      setActiveFloorKey(sharedFloorLabel);
      metaBedrooms = wizard.premiumRoofUnitABedrooms + wizard.premiumRoofUnitBBedrooms;
      metaBathrooms = wizard.premiumRoofUnitABaths + wizard.premiumRoofUnitBBaths;
    }
    // ── CASE 3: Entire Building (عمارة كاملة) ──────────────────────────────
    else if (propertyType === 'building') {
      let sortIdx = 1;
      // Basement
      if (wizard.buildingHasBasement) {
        generated.push(
          buildRoomInstance('bld.basement', sortIdx++, 'bld_basement'),
          buildRoomInstance('bld.water_motors', sortIdx++, 'bld_basement')
        );
      }
      // Ground Floor
      generated.push(
        buildRoomInstance('bld.entrance_gate', sortIdx++, 'bld_ground'),
        buildRoomInstance('bld.entrance_lobby', sortIdx++, 'bld_ground'),
        buildRoomInstance('bld.staircase', sortIdx++, 'bld_ground'),
        buildRoomInstance('bld.elevator', sortIdx++, 'bld_ground'),
        buildRoomInstance('bld.electric_box', sortIdx++, 'bld_ground')
      );
      if (wizard.buildingHasGuardRoom) {
        generated.push(buildRoomInstance('bld.guard_room', sortIdx++, 'bld_ground'));
      }
      for (let s = 0; s < Math.max(0, wizard.buildingCommercialShops); s++) {
        const shop = buildRoomInstance('bld.commercial_shop', sortIdx++, 'bld_ground');
        shop.instance_label = isAr ? `محل تجاري ${s + 1}` : `Retail Shop ${s + 1}`;
        generated.push(shop);
      }

      // Typical Floors
      const numFloors = Math.max(1, Math.min(12, wizard.buildingTypicalFloors));
      const unitsPerFloor = Math.max(1, Math.min(6, wizard.buildingUnitsPerFloor));
      const unitLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

      for (let f = 1; f <= numFloors; f++) {
        const floorKey = `Floor ${f}`;
        generated.push(
          buildRoomInstance('bld.central_corridor', sortIdx++, floorKey),
          buildRoomInstance('bld.staircase', sortIdx++, floorKey),
          buildRoomInstance('bld.elevator', sortIdx++, floorKey),
          buildRoomInstance('bld.lightwell', sortIdx++, floorKey)
        );

        for (let u = 0; u < unitsPerFloor; u++) {
          const letter = unitLetters[u] || `${u + 1}`;
          const childIds = ['apt.reception', 'apt.kitchen', 'apt.master_bed', 'apt.main_bath', 'apt.balcony'];
          for (let b = 1; b < wizard.buildingBedsPerUnit; b++) childIds.push('apt.std_bed');
          const children = childIds.map((tid, i) => buildRoomInstance(tid, i + 1, floorKey));

          generated.push({
            id: `zone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-u${f}${letter}`,
            zone_template_id: 'bld.unit',
            instance_label: `Flat ${f}${letter}`,
            level_label: floorKey,
            sort_order: sortIdx++,
            trades: [],
            children,
          });
        }
      }

      // Roof
      generated.push(
        buildRoomInstance('bld.staircase', sortIdx++, 'bld_roof'),
        buildRoomInstance('bld.roof_service', sortIdx++, 'bld_roof')
      );
      if (wizard.buildingHasRoofTerrace) {
        generated.push(buildRoomInstance('bld.roof_terrace', sortIdx++, 'bld_roof'));
      }

      setActiveFloorKey('bld_ground');
      setBldView({ mode: 'elevation' });
    }
    // ── CASE 4: Parking Garage (جراج خاص أو تجاري) ────────────────────────
    else if (propertyType === 'garage') {
      let sortIdx = 1;
      const ramp = buildRoomInstance('grg.ramp', sortIdx++, 'grg_ramp');
      const driveway = buildRoomInstance('grg.garage', sortIdx++, 'grg_ramp');
      driveway.instance_label = isAr ? 'مسار الحركة والمناورة' : 'Driveway Circulation Lane';
      generated.push(ramp, driveway);

      const numBays = Math.max(1, Math.min(30, wizard.garageBays));
      for (let b = 1; b <= numBays; b++) {
        const bay = buildRoomInstance('grg.bay', sortIdx++, 'grg_bays');
        bay.instance_label = isAr ? `باكية سيارة P-${b.toString().padStart(2, '0')}` : `Parking Bay P-${b.toString().padStart(2, '0')}`;
        generated.push(bay);
      }

      if (wizard.garageHasEvCharger) {
        const ev = buildRoomInstance('grg.elec', sortIdx++, 'grg_bays');
        ev.instance_label = isAr ? 'شاحن سيارات كهربائية EV' : 'EV Fast Charging Station';
        generated.push(ev);
      }
      if (wizard.garageHasSecurityBooth) {
        const guard = buildRoomInstance('bld.guard_room', sortIdx++, 'grg_ramp');
        guard.instance_label = isAr ? 'كشك الأمن والتحكم' : 'Security & Access Booth';
        generated.push(guard);
      }
      if (wizard.garageHasCarWash) {
        generated = addCustomZone(generated, isAr ? 'باكية غسيل وخدمة السيارات' : 'Car Wash & Detailing Bay', wizard.globalFinishing);
        if (generated[generated.length - 1]) generated[generated.length - 1].level_label = 'grg_bays';
      }
      if (wizard.garageHasStorage) {
        const elec = buildRoomInstance('grg.elec', sortIdx++, 'grg_bays');
        elec.instance_label = isAr ? 'لوحة الكهرباء وغرفة الصيانة' : 'Electrical Panel & Storage';
        generated.push(elec);
      }

      setActiveFloorKey('grg_ramp');
    }
    // ── CASE 5: Standard Apartment (شقة سكنية عادية) ───────────────────────
    else {
      const levelLabel = activeFloorKey || GROUND_KEY;
      const templateIds = templatesFromAnswers(wizard);
      generated = templateIds.map((tid, i) => buildRoomInstance(tid, i + 1, levelLabel));

      if (wizard.maidRoom) {
        generated = addCustomZone(generated, isAr ? 'غرفة خادمة / مساعدة' : "Maid's Room", wizard.globalFinishing || 'semi_finished');
        if (generated[generated.length - 1] && levelLabel !== GROUND_KEY) {
          generated[generated.length - 1].level_label = levelLabel;
        }
      }
      if (wizard.dressingRoom) {
        generated = addCustomZone(generated, isAr ? 'غرفة ملابس ماستر (Dressing)' : 'Master Dressing Room', wizard.globalFinishing || 'semi_finished');
        if (generated[generated.length - 1] && levelLabel !== GROUND_KEY) {
          generated[generated.length - 1].level_label = levelLabel;
        }
      }
      metaBedrooms = wizard.bedrooms;
      metaBathrooms = wizard.bathrooms;
    }

    // Apply global finishing level across all generated trades
    const finalZones = generated.map(applyFinishing);

    pushHistory(zoneInstances);
    onZoneInstancesChange(finalZones);
    onPresetMeta?.({
      bedrooms: metaBedrooms,
      bathrooms: metaBathrooms,
      floorNumber: wizard.floorNumber === '' ? null : Number(wizard.floorNumber),
    });

    setWizardOpen(false);
    setDismissedPresets(prev => ({ ...prev, [activeFloorKey]: true }));
    if (finalZones[0]) setSelectedZoneId(finalZones[0].id);

    showToast(
      isAr
        ? `تم توليد المخطط بنجاح (${finalZones.length} مساحات ووحدات معمارية)`
        : `Architectural blueprint generated (${finalZones.length} spaces)`
    );
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

  const dominantState = useMemo((): GlobalFinishingState | null => {
    function leaves(list: ZoneInstance[]): ZoneInstance[] {
      return list.flatMap(z => (z.children && z.children.length > 0 ? leaves(z.children) : [z]));
    }
    const badges = leaves(zoneInstances).map(getZoneBadge).filter(b => b !== 'unknown');
    if (badges.length === 0) return null;
    if (badges.every(b => b === badges[0]) && badges[0] !== 'mixed') return badges[0] as GlobalFinishingState;
    return null;
  }, [zoneInstances]);

  const handleGlobalState = (state: GlobalFinishingState) => {
    if (zoneInstances.length === 0) return;
    pushHistory(zoneInstances);
    onZoneInstancesChange(applyGlobalState(zoneInstances, state));
    const opt = GLOBAL_STATE_OPTIONS.find(o => o.id === state);
    showToast(isAr ? `تم تطبيق حالة ${opt?.ar}` : `${opt?.en === 'Semi' ? 'Semi-Finished' : opt?.en} state applied`);
  };

  const handleAddCustomZone = (rawName: string) => {
    const name = rawName.trim().slice(0, 40);
    if (!name) return;
    pushHistory(zoneInstances);
    let next = addCustomZone(zoneInstances, name, 'semi_finished');
    const newZone = next[next.length - 1];
    if (propertyType === 'apartment' && declaredArea && declaredArea > 0 && newZone) {
      const currentSqm = activeZones.reduce((sum, z) => sum + spatialOf(z).sqm, 0);
      const remaining = declaredArea - currentSqm;
      if (remaining > 0 && remaining < (newZone.spatial?.sqm || 12)) {
        const adjustedSqm = Math.max(2.25, remaining);
        const l = Math.max(1.5, round1(Math.sqrt(adjustedSqm * 1.2)));
        const w = Math.max(1.5, round1(adjustedSqm / l));
        newZone.spatial = {
          ...newZone.spatial!,
          length_m: l,
          width_m: w,
          sqm: round1(l * w),
        };
      }
    }
    if (propertyType === 'apartment' && activeFloorKey !== GROUND_KEY && newZone) {
      next = next.map(z => (z.id === newZone.id ? { ...z, level_label: activeFloorKey } : z));
    }
    onZoneInstancesChange(next);
    setCustomZoneName('');
    if (newZone) {
      setSelectedZoneId(newZone.id);
      requestAnimationFrame(() => rowRefs.current[newZone.id]?.scrollIntoView({ block: 'nearest' }));
    }
    showToast(isAr ? `تمت إضافة "${name}"` : `"${name}" added`);
  };

  const handleRemoveGroup = (bucket: ZoneCategoryBucket, zones: ZoneInstance[]) => {
    const label = isAr ? bucket.ar : bucket.en;
    const ok = window.confirm(isAr
      ? `حذف كل غرف قسم "${label}" (${zones.length} غرفة)؟`
      : `Delete all ${zones.length} room(s) in "${label}"?`);
    if (!ok) return;
    pushHistory(zoneInstances);
    onZoneInstancesChange(removeZones(zoneInstances, zones.map(z => z.id)));
    if (selectedZoneId && zones.some(z => z.id === selectedZoneId)) setSelectedZoneId(null);
    showToast(isAr ? `تم حذف قسم ${label}` : `${label} section deleted`);
  };

  useEffect(() => {
    if (!groupAddOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.fp-group-addwrap')) setGroupAddOpen(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setGroupAddOpen(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [groupAddOpen]);

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
    const zones = displayZones;
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

  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    const localX = (pt.x - 340 - canvasPan.x) / canvasZoom + 340;
    const localY = (pt.y - 220 - canvasPan.y) / canvasZoom + 220;
    return { x: localX, y: localY };
  };

  const materializePlacement = (moves: Record<string, { x: number; y: number; w: number; h: number }>) => {
    // 1. Calculate bounding minX and minY across all moved positions to normalize the layout to origin (0, 0)
    let minX = Infinity;
    let minY = Infinity;
    for (const m of Object.values(moves)) {
      minX = Math.min(minX, m.x);
      minY = Math.min(minY, m.y);
    }
    const shiftX = isFinite(minX) ? minX : 0;
    const shiftY = isFinite(minY) ? minY : 0;

    function rec(list: ZoneInstance[]): ZoneInstance[] {
      return list.map(z => {
        const base = z.children && z.children.length > 0 ? { ...z, children: rec(z.children) } : z;
        const m = moves[z.id];
        if (!m) return base;
        const shared = fallbackMetricFor(z.zone_template_id);
        const d = starterDims(z.zone_template_id);
        const cur: ZoneSpatialLayout = base.spatial || {
          gridX: 0,
          gridY: 0,
          gridW: 6,
          gridH: 4,
          length_m: shared?.length_m ?? d.l,
          width_m: shared?.width_m ?? d.w,
          sqm: shared?.sqm ?? Math.round(d.l * d.w),
          ceiling_height: shared?.ceiling ?? DEFAULT_DIMENSIONS[z.zone_template_id]?.ceiling ?? '3.0m Flush',
        };
        const normalizedX = round1(m.x - shiftX);
        const normalizedY = round1(m.y - shiftY);

        return {
          ...base,
          spatial: {
            ...cur,
            pos_x_m: normalizedX,
            pos_y_m: normalizedY,
            width_m: round1(m.w),
            length_m: round1(m.h),
            sqm: round1(m.w * m.h),
          },
        };
      });
    }
    pushHistory(zoneInstances);
    onZoneInstancesChange(rec(zoneInstances));
  };

  const computeMagneticSnap = (
    zoneId: string,
    pointer: { x: number; y: number },
    slots: Array<{ zone: ZoneInstance; x: number; y: number; w: number; h: number }>,
    layout: ReturnType<typeof computeMetricLayout>,
    snapEnabled = true,
    gridM = 0.5,
    grabOffsetM?: { x: number; y: number },
  ): {
    snapM: { x: number; y: number; w: number; h: number };
    snapPx: { x: number; y: number; w: number; h: number };
    guides: Array<{ x1: number; y1: number; x2: number; y2: number; label: string; type: 'x' | 'y' }>;
    snapLabel?: string;
    dockedWith?: string;
  } | null => {
    const slot = slots.find(s => s.zone.id === zoneId);
    if (!slot || layout.pxPerMeter <= 0) return null;
    const k = layout.pxPerMeter;
    const w = slot.w / k;
    const h = slot.h / k;

    // Use actual click grab offset if provided, otherwise default to room center
    const offX = grabOffsetM ? grabOffsetM.x : w / 2;
    const offY = grabOffsetM ? grabOffsetM.y : h / 2;

    const rawX = (pointer.x - layout.bounds.x) / k - offX;
    const rawY = (pointer.y - layout.bounds.y) / k - offY;

    if (!snapEnabled) {
      const snapM = { x: rawX, y: rawY, w, h };
      const snapPx = {
        x: layout.bounds.x + snapM.x * k,
        y: layout.bounds.y + snapM.y * k,
        w: w * k,
        h: h * k,
      };
      return { snapM, snapPx, guides: [] };
    }

    let snapX = Math.round(rawX / gridM) * gridM;
    let snapY = Math.round(rawY / gridM) * gridM;

    const guides: Array<{ x1: number; y1: number; x2: number; y2: number; label: string; type: 'x' | 'y' }> = [];
    const SNAP_THRESH_M = 0.45;
    let bestDx = SNAP_THRESH_M;
    let bestDy = SNAP_THRESH_M;
    let snapLabel: string | undefined = undefined;
    let dockedWith: string | undefined = undefined;

    for (const s of slots) {
      if (s.zone.id === zoneId) continue;
      const ox = (s.x - layout.bounds.x) / k;
      const oy = (s.y - layout.bounds.y) / k;
      const ow = s.w / k;
      const oh = s.h / k;
      const roomName = getZoneLabel(s.zone);

      // X: Dock Left of other room
      const candDockLeft = ox - w;
      if (Math.abs(candDockLeft - rawX) < bestDx) {
        bestDx = Math.abs(candDockLeft - rawX);
        snapX = candDockLeft;
        dockedWith = roomName;
        snapLabel = isAr ? `ملتصق بـ ${roomName} (يسار)` : `Docked to ${roomName} (West)`;
        guides.push({
          x1: layout.bounds.x + ox * k,
          y1: 20,
          x2: layout.bounds.x + ox * k,
          y2: 440,
          type: 'x',
          label: isAr ? `محاذاة جدار: ${roomName}` : `Aligned Wall: ${roomName}`,
        });
      }

      // X: Dock Right of other room
      const candDockRight = ox + ow;
      if (Math.abs(candDockRight - rawX) < bestDx) {
        bestDx = Math.abs(candDockRight - rawX);
        snapX = candDockRight;
        dockedWith = roomName;
        snapLabel = isAr ? `ملتصق بـ ${roomName} (يمين)` : `Docked to ${roomName} (East)`;
        guides.push({
          x1: layout.bounds.x + (ox + ow) * k,
          y1: 20,
          x2: layout.bounds.x + (ox + ow) * k,
          y2: 440,
          type: 'x',
          label: isAr ? `محاذاة جدار: ${roomName}` : `Aligned Wall: ${roomName}`,
        });
      }

      // X: Align Left walls
      const candAlignLeft = ox;
      if (Math.abs(candAlignLeft - rawX) < bestDx) {
        bestDx = Math.abs(candAlignLeft - rawX);
        snapX = candAlignLeft;
        snapLabel = isAr ? `محاذاة الجدار الأيسر مع ${roomName}` : `Left Wall with ${roomName}`;
        guides.push({
          x1: layout.bounds.x + ox * k,
          y1: 20,
          x2: layout.bounds.x + ox * k,
          y2: 440,
          type: 'x',
          label: isAr ? `محاذاة الجدار: ${roomName}` : `Left Wall: ${roomName}`,
        });
      }

      // X: Align Right walls
      const candAlignRight = ox + ow - w;
      if (Math.abs(candAlignRight - rawX) < bestDx) {
        bestDx = Math.abs(candAlignRight - rawX);
        snapX = candAlignRight;
        snapLabel = isAr ? `محاذاة الجدار الأيمن مع ${roomName}` : `Right Wall with ${roomName}`;
        guides.push({
          x1: layout.bounds.x + (ox + ow) * k,
          y1: 20,
          x2: layout.bounds.x + (ox + ow) * k,
          y2: 440,
          type: 'x',
          label: isAr ? `محاذاة الجدار: ${roomName}` : `Right Wall: ${roomName}`,
        });
      }

      // Y: Dock Top of other room
      const candDockTop = oy - h;
      if (Math.abs(candDockTop - rawY) < bestDy) {
        bestDy = Math.abs(candDockTop - rawY);
        snapY = candDockTop;
        dockedWith = roomName;
        snapLabel = isAr ? `ملتصق بـ ${roomName} (أعلى)` : `Docked to ${roomName} (North)`;
        guides.push({
          x1: 20,
          y1: layout.bounds.y + oy * k,
          x2: 740,
          y2: layout.bounds.y + oy * k,
          type: 'y',
          label: isAr ? `محاذاة جدار: ${roomName}` : `Aligned Wall: ${roomName}`,
        });
      }

      // Y: Dock Bottom of other room
      const candDockBottom = oy + oh;
      if (Math.abs(candDockBottom - rawY) < bestDy) {
        bestDy = Math.abs(candDockBottom - rawY);
        snapY = candDockBottom;
        dockedWith = roomName;
        snapLabel = isAr ? `ملتصق بـ ${roomName} (أسفل)` : `Docked to ${roomName} (South)`;
        guides.push({
          x1: 20,
          y1: layout.bounds.y + (oy + oh) * k,
          x2: 740,
          y2: layout.bounds.y + (oy + oh) * k,
          type: 'y',
          label: isAr ? `محاذاة جدار: ${roomName}` : `Aligned Wall: ${roomName}`,
        });
      }

      // Y: Align Top walls
      const candAlignTop = oy;
      if (Math.abs(candAlignTop - rawY) < bestDy) {
        bestDy = Math.abs(candAlignTop - rawY);
        snapY = candAlignTop;
        snapLabel = isAr ? `محاذاة الجدار العلوي مع ${roomName}` : `Top Wall with ${roomName}`;
        guides.push({
          x1: 20,
          y1: layout.bounds.y + oy * k,
          x2: 740,
          y2: layout.bounds.y + oy * k,
          type: 'y',
          label: isAr ? `محاذاة الجدار: ${roomName}` : `Top Wall: ${roomName}`,
        });
      }

      // Y: Align Bottom walls
      const candAlignBottom = oy + oh - h;
      if (Math.abs(candAlignBottom - rawY) < bestDy) {
        bestDy = Math.abs(candAlignBottom - rawY);
        snapY = candAlignBottom;
        snapLabel = isAr ? `محاذاة الجدار السفلي مع ${roomName}` : `Bottom Wall with ${roomName}`;
        guides.push({
          x1: 20,
          y1: layout.bounds.y + (oy + oh) * k,
          x2: 740,
          y2: layout.bounds.y + (oy + oh) * k,
          type: 'y',
          label: isAr ? `محاذاة الجدار: ${roomName}` : `Bottom Wall: ${roomName}`,
        });
      }
    }

    // Dynamic Overlap Prevention: Check if { snapX, snapY, w, h } overlaps any other room
    const otherRooms = slots
      .filter(s => s.zone.id !== zoneId)
      .map(s => ({
        id: s.zone.id,
        x: (s.x - layout.bounds.x) / k,
        y: (s.y - layout.bounds.y) / k,
        w: s.w / k,
        h: s.h / k,
        title: getZoneLabel(s.zone),
      }));

    const EPS = 0.04;
    const isOverlapping = (testBox: { x: number; y: number; w: number; h: number }) => {
      return otherRooms.some(o =>
        testBox.x < o.x + o.w - EPS &&
        testBox.x + testBox.w > o.x + EPS &&
        testBox.y < o.y + o.h - EPS &&
        testBox.y + testBox.h > o.y + EPS
      );
    };

    if (isOverlapping({ x: snapX, y: snapY, w, h })) {
      let bestDist = Infinity;
      let resolvedX = snapX;
      let resolvedY = snapY;

      for (const o of otherRooms) {
        const candidates = [
          { x: o.x + o.w, y: snapY, label: isAr ? `محاذاة مع ${o.title} (يمين)` : `Docked to ${o.title} (East)` },
          { x: o.x - w, y: snapY, label: isAr ? `محاذاة مع ${o.title} (يسار)` : `Docked to ${o.title} (West)` },
          { x: snapX, y: o.y + o.h, label: isAr ? `محاذاة مع ${o.title} (أسفل)` : `Docked to ${o.title} (South)` },
          { x: snapX, y: o.y - h, label: isAr ? `محاذاة مع ${o.title} (أعلى)` : `Docked to ${o.title} (North)` },
          { x: o.x + o.w, y: o.y, label: isAr ? `محاذاة مع ${o.title}` : `Docked to ${o.title}` },
          { x: o.x - w, y: o.y, label: isAr ? `محاذاة مع ${o.title}` : `Docked to ${o.title}` },
          { x: o.x, y: o.y + o.h, label: isAr ? `محاذاة مع ${o.title}` : `Docked to ${o.title}` },
          { x: o.x, y: o.y - h, label: isAr ? `محاذاة مع ${o.title}` : `Docked to ${o.title}` },
        ];

        for (const cand of candidates) {
          if (!isOverlapping({ x: cand.x, y: cand.y, w, h })) {
            const dist = Math.hypot(cand.x - rawX, cand.y - rawY);
            if (dist < bestDist) {
              bestDist = dist;
              resolvedX = cand.x;
              resolvedY = cand.y;
              snapLabel = cand.label;
              dockedWith = o.title;
            }
          }
        }
      }

      snapX = round1(resolvedX);
      snapY = round1(resolvedY);
    }

    // ── Enforce Balcony Exterior Rule (Balconies cannot be placed inside apartment core) ──
    const isBalconyZone = zoneId && (
      slot.zone.zone_template_id.includes('balcony') || 
      slot.zone.zone_template_id.includes('terrace') ||
      slot.zone.instance_label?.toLowerCase().includes('balcony') ||
      slot.zone.instance_label?.toLowerCase().includes('بلكونة') ||
      slot.zone.instance_label?.toLowerCase().includes('تراس')
    );

    if (isBalconyZone && otherRooms.length > 0) {
      const inMinX = Math.min(...otherRooms.map(o => o.x));
      const inMaxX = Math.max(...otherRooms.map(o => o.x + o.w));
      const inMinY = Math.min(...otherRooms.map(o => o.y));
      const inMaxY = Math.max(...otherRooms.map(o => o.y + o.h));

      // If proposed balcony position is inside the indoor bounds
      if (snapX >= inMinX && snapX + w <= inMaxX && snapY >= inMinY && snapY + h <= inMaxY) {
        const dEast = Math.abs(inMaxX - snapX);
        const dWest = Math.abs(snapX + w - inMinX);
        const dNorth = Math.abs(snapY + h - inMinY);
        const dSouth = Math.abs(inMaxY - snapY);
        const minD = Math.min(dEast, dWest, dNorth, dSouth);

        if (minD === dEast) { snapX = inMaxX; }
        else if (minD === dWest) { snapX = inMinX - w; }
        else if (minD === dSouth) { snapY = inMaxY; }
        else { snapY = inMinY - h; }
      }
    }

    const snapM = { x: snapX, y: snapY, w, h };
    const snapPx = {
      x: layout.bounds.x + snapX * k,
      y: layout.bounds.y + snapY * k,
      w: w * k,
      h: h * k,
    };

    return { snapM, snapPx, guides: guides.slice(-2), snapLabel, dockedWith };
  };

  /**
   * Auto-Fit & Compact:
   * Packs all indoor rooms into a tight, seamless floor plate with zero internal air gaps,
   * respecting spatial layout and placing balconies on the exterior perimeter facade.
   */
  const handleAutoFitEnvelope = () => {
    const slots = previewSlotsRef.current;
    if (slots.length === 0) return;
    const indoorSlots = slots.filter(s => !s.zone.zone_template_id.includes('balcony') && !s.zone.zone_template_id.includes('terrace'));
    const outdoorSlots = slots.filter(s => s.zone.zone_template_id.includes('balcony') || s.zone.zone_template_id.includes('terrace'));

    if (indoorSlots.length === 0) return;

    // Sort rooms topologically: North to South, West to East
    const sorted = [...indoorSlots].sort((a, b) => {
      const ay = a.zone.spatial?.pos_y_m ?? 0;
      const by = b.zone.spatial?.pos_y_m ?? 0;
      if (Math.abs(ay - by) > 1.2) return ay - by;
      return (a.zone.spatial?.pos_x_m ?? 0) - (b.zone.spatial?.pos_x_m ?? 0);
    });

    // 2D Skyline strip packing to eliminate ALL internal holes
    type Placed = { id: string; x: number; y: number; w: number; h: number };
    const placed: Placed[] = [];
    const moves: Record<string, { x: number; y: number; w: number; h: number }> = {};

    for (const room of sorted) {
      const sp = spatialOf(room.zone);
      const w = sp.w;
      const h = sp.l;
      const origX = room.zone.spatial?.pos_x_m ?? 0;
      const origY = room.zone.spatial?.pos_y_m ?? 0;

      // Find the best non-overlapping position (x, y) closest to original position that touches existing rooms
      const candPositions: Array<{ x: number; y: number; cost: number }> = [];
      
      if (placed.length === 0) {
        candPositions.push({ x: 0, y: 0, cost: 0 });
      } else {
        // Try top-left corner (0,0)
        candPositions.push({ x: 0, y: 0, cost: Math.hypot(0 - origX, 0 - origY) });

        for (const p of placed) {
          // East of p
          candPositions.push({ x: p.x + p.w, y: p.y, cost: Math.hypot(p.x + p.w - origX, p.y - origY) });
          // South of p
          candPositions.push({ x: p.x, y: p.y + p.h, cost: Math.hypot(p.x - origX, p.y + p.h - origY) });
          // Align top with p.y, flush to left walls
          candPositions.push({ x: 0, y: p.y + p.h, cost: Math.hypot(0 - origX, p.y + p.h - origY) });
        }
      }

      candPositions.sort((a, b) => a.cost - b.cost);

      let bestPos = { x: 0, y: 0 };
      const EPS = 0.04;
      for (const pos of candPositions) {
        const overlaps = placed.some(p => 
          pos.x < p.x + p.w - EPS &&
          pos.x + w > p.x + EPS &&
          pos.y < p.y + p.h - EPS &&
          pos.y + h > p.y + EPS
        );
        if (!overlaps) {
          bestPos = { x: round1(pos.x), y: round1(pos.y) };
          break;
        }
      }

      placed.push({ id: room.zone.id, x: bestPos.x, y: bestPos.y, w, h });
      moves[room.zone.id] = { x: bestPos.x, y: bestPos.y, w, h };
    }

    const maxIndoorX = placed.length > 0 ? Math.max(...placed.map(p => p.x + p.w)) : 10;
    let balcY = 0;
    for (const out of outdoorSlots) {
      const sp = spatialOf(out.zone);
      moves[out.zone.id] = { x: round1(maxIndoorX), y: round1(balcY), w: sp.w, h: sp.l };
      balcY = round1(balcY + sp.l);
    }

    materializePlacement(moves);
    showToast(isAr ? 'تم رص وتنسيق حدود الشقة وإزالة الفراغات الميتة بالكامل' : 'Seamless compact layout: all dead space eliminated');
  };

  /**
   * Auto Align & Snap Sides (Flush):
   * Moves rooms tightly flush against each other in 2D space without altering room sizes.
   * Pulls each room West and North until touching neighboring walls, then levels collinear edges.
   */
  const handleAutoAlignFlush = () => {
    const slots = previewSlotsRef.current;
    if (slots.length === 0) return;
    const layout = metricLayoutRef.current;
    if (!layout) return;
    const k = layout.pxPerMeter;

    type RoomBox = {
      id: string;
      isOutdoor: boolean;
      w: number;
      h: number;
      x: number;
      y: number;
      origZone: ZoneInstance;
    };

    const roomBoxes: RoomBox[] = slots.map(s => {
      const sp = spatialOf(s.zone);
      const tid = s.zone.zone_template_id || '';
      const isOutdoor = tid.includes('balcony') || tid.includes('terrace');
      const curX = s.zone.spatial?.pos_x_m ?? (s.x - layout.bounds.x) / k;
      const curY = s.zone.spatial?.pos_y_m ?? (s.y - layout.bounds.y) / k;
      return {
        id: s.zone.id,
        isOutdoor,
        w: round1(sp.w),
        h: round1(sp.l),
        x: round1(curX),
        y: round1(curY),
        origZone: s.zone,
      };
    });

    const indoorBoxes = roomBoxes.filter(r => !r.isOutdoor);
    const outdoorBoxes = roomBoxes.filter(r => r.isOutdoor);

    if (indoorBoxes.length > 0) {
      const EPS = 0.05;

      // Repeat relaxation passes to settle all rooms flush against boundaries and neighbors
      for (let pass = 0; pass < 5; pass++) {
        // 1. Pull North (upwards) against obstacles
        indoorBoxes.sort((a, b) => a.y - b.y || a.x - b.x);
        for (const r of indoorBoxes) {
          const obstaclesAbove = indoorBoxes.filter(o => 
            o.id !== r.id &&
            o.y + o.h <= r.y + EPS &&
            Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x) > EPS
          );
          if (obstaclesAbove.length > 0) {
            r.y = round1(Math.max(...obstaclesAbove.map(o => o.y + o.h)));
          } else {
            r.y = 0;
          }
        }

        // 2. Pull West (leftwards) against obstacles
        indoorBoxes.sort((a, b) => a.x - b.x || a.y - b.y);
        for (const r of indoorBoxes) {
          const obstaclesLeft = indoorBoxes.filter(o => 
            o.id !== r.id &&
            o.x + o.w <= r.x + EPS &&
            Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y) > EPS
          );
          if (obstaclesLeft.length > 0) {
            r.x = round1(Math.max(...obstaclesLeft.map(o => o.x + o.w)));
          } else {
            r.x = 0;
          }
        }

        // 3. Collinear edge alignments
        for (let i = 0; i < indoorBoxes.length; i++) {
          for (let j = 0; j < indoorBoxes.length; j++) {
            if (i === j) continue;
            const a = indoorBoxes[i];
            const b = indoorBoxes[j];
            if (Math.abs(a.x - b.x) > 0 && Math.abs(a.x - b.x) < 0.6) {
              b.x = a.x;
            }
            if (Math.abs((a.x + a.w) - (b.x + b.w)) > 0 && Math.abs((a.x + a.w) - (b.x + b.w)) < 0.6) {
              b.x = round1(a.x + a.w - b.w);
            }
            if (Math.abs(a.y - b.y) > 0 && Math.abs(a.y - b.y) < 0.6) {
              b.y = a.y;
            }
            if (Math.abs((a.y + a.h) - (b.y + b.h)) > 0 && Math.abs((a.y + a.h) - (b.y + b.h)) < 0.6) {
              b.y = round1(a.y + a.h - b.h);
            }
          }
        }
      }

      // 4. Strict Overlap Resolution Pass (Push overlapping rooms apart until 0 intersection)
      for (let pass = 0; pass < 8; pass++) {
        let hadOverlap = false;
        for (let i = 0; i < indoorBoxes.length; i++) {
          for (let j = i + 1; j < indoorBoxes.length; j++) {
            const a = indoorBoxes[i];
            const b = indoorBoxes[j];
            const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
            const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

            if (overlapX > 0.05 && overlapY > 0.05) {
              hadOverlap = true;
              // Separate along the axis of minimum overlap
              if (overlapX <= overlapY) {
                // Horizontal push
                if (a.x < b.x) {
                  b.x = round1(a.x + a.w);
                } else {
                  a.x = round1(b.x + b.w);
                }
              } else {
                // Vertical push
                if (a.y < b.y) {
                  b.y = round1(a.y + a.h);
                } else {
                  a.y = round1(b.y + b.h);
                }
              }
            }
          }
        }
        if (!hadOverlap) break;
      }

      // 5. Flush Bottom Baseline Alignment:
      // Ensure all bottommost rooms share a perfectly flush bottom boundary with the outer envelope
      const globalMaxY = Math.max(...indoorBoxes.map(r => r.y + r.h));
      for (const r of indoorBoxes) {
        // If this room has no room below it, align its bottom directly to globalMaxY if within 1.0m
        const hasBelow = indoorBoxes.some(o => o.id !== r.id && o.y >= r.y + r.h - 0.1 && Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x) > 0.1);
        if (!hasBelow && Math.abs(globalMaxY - (r.y + r.h)) < 1.0 && Math.abs(globalMaxY - (r.y + r.h)) > 0) {
          const newY = round1(globalMaxY - r.h);
          // Only shift if it doesn't cause collision
          const causesOverlap = indoorBoxes.some(o => 
            o.id !== r.id &&
            r.x < o.x + o.w - 0.05 &&
            r.x + r.w > o.x + 0.05 &&
            newY < o.y + o.h - 0.05 &&
            newY + r.h > o.y + 0.05
          );
          if (!causesOverlap) {
            r.y = newY;
          }
        }
      }
    }

    // 4. Align outdoor balconies flush on the exterior right facade
    const indoorMaxX = indoorBoxes.length > 0 ? Math.max(...indoorBoxes.map(r => r.x + r.w)) : 0;
    const indoorMinY = indoorBoxes.length > 0 ? Math.min(...indoorBoxes.map(r => r.y)) : 0;

    let currentBalconyY = indoorMinY;
    for (const out of outdoorBoxes) {
      out.x = round1(indoorMaxX);
      out.y = round1(currentBalconyY);
      currentBalconyY = round1(currentBalconyY + out.h);
    }

    const moves: Record<string, { x: number; y: number; w: number; h: number }> = {};
    for (const r of [...indoorBoxes, ...outdoorBoxes]) {
      moves[r.id] = { x: r.x, y: r.y, w: r.w, h: r.h };
    }

    materializePlacement(moves);
    showToast(isAr ? 'تمت محاذاة وتلاصق الجدران وإغلاق الفراغات' : 'Walls auto-aligned flush & dead spaces eliminated');
  };

  const handleAutoDock = () => {
    const slots = previewSlotsRef.current;
    if (slots.length === 0) return;
    const moves: Record<string, { x: number; y: number; w: number; h: number }> = {};
    
    const isUnitA = (s: typeof slots[0]) => (s.zone.instance_label || '').includes('وحدة أ') || (s.zone.instance_label || '').includes('Unit A');
    const isUnitB = (s: typeof slots[0]) => (s.zone.instance_label || '').includes('وحدة ب') || (s.zone.instance_label || '').includes('Unit B');
    const hasTwinUnits = slots.some(isUnitA) && slots.some(isUnitB);

    const priority = (tid: string) => {
      if (tid === 'apt.reception') return 1;
      if (tid === 'apt.kitchen') return 2;
      if (tid === 'apt.corridor') return 3;
      if (tid === 'apt.master_bed') return 4;
      if (tid === 'apt.master_bath') return 5;
      if (tid.includes('bed')) return 6;
      if (tid.includes('bath')) return 7;
      return 10;
    };

    if (hasTwinUnits) {
      const dockUnit = (unitSlots: typeof slots, startX: number, maxWidth: number) => {
        const indoor = unitSlots.filter(s => !s.zone.zone_template_id.includes('balcony') && !s.zone.zone_template_id.includes('terrace'));
        const outdoor = unitSlots.filter(s => s.zone.zone_template_id.includes('balcony') || s.zone.zone_template_id.includes('terrace'));
        const sorted = [...indoor].sort((a, b) => priority(a.zone.zone_template_id) - priority(b.zone.zone_template_id));

        let curX = startX;
        let curY = 0;
        let maxRowH = 0;
        let maxIndoorX = startX;

        for (const s of sorted) {
          const sp = spatialOf(s.zone);
          const w = sp.w;
          const h = sp.l;
          if (curX > startX && curX + w > maxWidth) {
            curX = startX;
            curY += maxRowH;
            maxRowH = 0;
          }
          moves[s.zone.id] = { x: curX, y: curY, w, h };
          maxIndoorX = Math.max(maxIndoorX, curX + w);
          curX += w;
          maxRowH = Math.max(maxRowH, h);
        }

        let outX = maxIndoorX;
        let outY = 0;
        for (const s of outdoor) {
          const sp = spatialOf(s.zone);
          const w = sp.w;
          const h = sp.l;
          moves[s.zone.id] = { x: outX, y: outY, w, h };
          outY += h;
        }
      };

      dockUnit(slots.filter(isUnitA), 0, 13.0);
      dockUnit(slots.filter(isUnitB), 15.0, 28.0);
    } else {
      const indoorSlots = slots.filter(s => !s.zone.zone_template_id.includes('balcony') && !s.zone.zone_template_id.includes('terrace'));
      const outdoorSlots = slots.filter(s => s.zone.zone_template_id.includes('balcony') || s.zone.zone_template_id.includes('terrace'));
      const sortedIndoor = [...indoorSlots].sort((a, b) => priority(a.zone.zone_template_id) - priority(b.zone.zone_template_id));
      let curX = 0;
      let curY = 0;
      let maxRowH = 0;
      const maxRowWidth = 14;
      let maxIndoorX = 0;

      for (const s of sortedIndoor) {
        const sp = spatialOf(s.zone);
        const w = sp.w;
        const h = sp.l;
        if (curX > 0 && curX + w > maxRowWidth) {
          curX = 0;
          curY += maxRowH;
          maxRowH = 0;
        }
        moves[s.zone.id] = { x: curX, y: curY, w, h };
        maxIndoorX = Math.max(maxIndoorX, curX + w);
        curX += w;
        maxRowH = Math.max(maxRowH, h);
      }

      let outX = maxIndoorX > 0 ? maxIndoorX : 0;
      let outY = 0;
      for (const s of outdoorSlots) {
        const sp = spatialOf(s.zone);
        const w = sp.w;
        const h = sp.l;
        moves[s.zone.id] = { x: outX, y: outY, w, h };
        outY += h;
      }
    }

    materializePlacement(moves);
    showToast(isAr ? 'تم تنظيم المخطط وتوزيع الوحدات جنباً إلى جنب' : 'Blueprint auto-arranged side-by-side with exterior balconies');
  };


  const handleRotateRoom = (zoneId: string) => {
    const zone = activeZones.find(z => z.id === zoneId);
    if (!zone) return;
    const sp = spatialOf(zone);
    const oldW = sp.w;
    const oldL = sp.l;
    const newW = oldL;
    const newL = oldW;

    // Rotate openings 90° clockwise: N -> E -> S -> W -> N
    const edgeRotMap: Record<'n' | 'e' | 's' | 'w', 'n' | 'e' | 's' | 'w'> = {
      n: 'e',
      e: 's',
      s: 'w',
      w: 'n',
    };

    const rotatedOpenings = (zone.spatial?.openings ?? []).map(o => ({
      ...o,
      edge: edgeRotMap[o.edge],
    }));

    pushHistory(zoneInstances);

    const updates: Partial<ZoneInstance['spatial']> = {
      width_m: newW,
      length_m: newL,
      openings: rotatedOpenings,
    };

    if (zone.spatial?.pos_x_m !== undefined && zone.spatial?.pos_y_m !== undefined) {
      const centerX = zone.spatial.pos_x_m + oldW / 2;
      const centerY = zone.spatial.pos_y_m + oldL / 2;
      updates.pos_x_m = Math.max(0, round1(centerX - newW / 2));
      updates.pos_y_m = Math.max(0, round1(centerY - newL / 2));
    }

    handleUpdateSpatial(zoneId, updates);
    showToast(isAr ? `تم تدوير الغرفة 90° (${newW}م × ${newL}م)` : `Room rotated 90° (${newW}m × ${newL}m)`);
  };

  /**
   * Rotate Entire Floor Plan / Apartment by 90° Clockwise:
   * Rotates every room's bounding position, dimensions, and wall openings around the layout bounding box.
   */
  const handleRotateEntireApartment = () => {
    const slots = previewSlotsRef.current;
    if (slots.length === 0) return;

    // 1. Calculate bounding box of current layout
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const s of slots) {
      const sp = spatialOf(s.zone);
      const x = s.zone.spatial?.pos_x_m ?? 0;
      const y = s.zone.spatial?.pos_y_m ?? 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + sp.w);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + sp.l);
    }

    const totalH = Math.max(1, maxY - minY);

    // 90° Clockwise edge mapping: n -> e, e -> s, s -> w, w -> n
    const edgeRotMap: Record<'n' | 'e' | 's' | 'w', 'n' | 'e' | 's' | 'w'> = {
      n: 'e',
      e: 's',
      s: 'w',
      w: 'n',
    };

    const edgeToId = (list: ZoneInstance[]): ZoneInstance[] => {
      return list.map(z => {
        const isSelectedFloor = propertyType === 'apartment' ? floorKeyOf(z) === activeFloorKey : true;
        if (!isSelectedFloor) {
          return z.children && z.children.length > 0 ? { ...z, children: edgeToId(z.children) } : z;
        }

        const sp = spatialOf(z);
        const oldX = z.spatial?.pos_x_m ?? 0;
        const oldY = z.spatial?.pos_y_m ?? 0;
        const oldW = sp.w;
        const oldH = sp.l;

        // 90° Clockwise transformation: (x, y) -> (totalH - (y + h), x)
        const newX = round1(totalH - (oldY + oldH - minY));
        const newY = round1(oldX - minX);
        const newW = oldH;
        const newH = oldW;

        const rotatedOpenings = (z.spatial?.openings ?? []).map(o => ({
          ...o,
          edge: edgeRotMap[o.edge],
        }));

        const curSpatial = z.spatial || {
          gridX: 0,
          gridY: 0,
          gridW: 6,
          gridH: 4,
          length_m: newH,
          width_m: newW,
          sqm: round1(newW * newH),
          ceiling_height: sp.ceiling,
        };

        const updated: ZoneInstance = {
          ...z,
          spatial: {
            ...curSpatial,
            pos_x_m: newX,
            pos_y_m: newY,
            width_m: newW,
            length_m: newH,
            sqm: round1(newW * newH),
            openings: rotatedOpenings,
          },
        };

        return updated.children && updated.children.length > 0
          ? { ...updated, children: edgeToId(updated.children) }
          : updated;
      });
    };

    pushHistory(zoneInstances);
    onZoneInstancesChange(edgeToId(zoneInstances));
    showToast(isAr ? 'تم تدوير المخطط بالكامل 90° بنجاح' : 'Entire floor plan rotated 90° clockwise');
  };

  /**
   * Check if a proposed opening on an edge overlaps with existing openings on that edge,
   * maintaining 0.15m corner jamb clearances and 0.15m gap between openings.
   */
  const findValidOpeningSlot = (
    existingOpenings: ZoneOpening[],
    edge: 'n' | 'e' | 's' | 'w',
    edgeLenM: number,
    widthM: number,
    desiredOffsetM?: number,
  ): { valid: boolean; offsetM: number; reason?: string } => {
    const CORNER_MARGIN = 0.15;
    const OPENING_GAP = 0.15;

    if (edgeLenM < widthM + CORNER_MARGIN * 2) {
      return { valid: false, offsetM: 0, reason: 'wall_too_short' };
    }

    const minOffset = CORNER_MARGIN;
    const maxOffset = edgeLenM - widthM - CORNER_MARGIN;

    const sameEdge = existingOpenings
      .filter(o => o.edge === edge)
      .map(o => ({
        start: o.offset_m,
        end: o.offset_m + o.width_m,
      }))
      .sort((a, b) => a.start - b.start);

    const isClear = (off: number) => {
      if (off < minOffset - 0.01 || off > maxOffset + 0.01) return false;
      const s = off;
      const e = off + widthM;
      return !sameEdge.some(o => s < o.end + OPENING_GAP && e > o.start - OPENING_GAP);
    };

    if (desiredOffsetM !== undefined) {
      const clamped = Math.max(minOffset, Math.min(maxOffset, desiredOffsetM));
      if (isClear(clamped)) {
        return { valid: true, offsetM: round1(clamped) };
      }
    }

    const intervals: { start: number; end: number }[] = [];
    let cur = minOffset;
    for (const o of sameEdge) {
      if (o.start - OPENING_GAP > cur) {
        intervals.push({ start: cur, end: o.start - OPENING_GAP });
      }
      cur = Math.max(cur, o.end + OPENING_GAP);
    }
    if (cur < maxOffset + widthM) {
      intervals.push({ start: cur, end: maxOffset + widthM });
    }

    const validIntervals = intervals.filter(iv => iv.end - iv.start >= widthM - 0.01);
    if (validIntervals.length === 0) {
      return { valid: false, offsetM: 0, reason: 'wall_full' };
    }

    if (desiredOffsetM !== undefined) {
      let closestOffset = validIntervals[0].start;
      let minDist = Infinity;
      for (const iv of validIntervals) {
        const candidate = Math.max(iv.start, Math.min(iv.end - widthM, desiredOffsetM));
        const dist = Math.abs(candidate - desiredOffsetM);
        if (dist < minDist) {
          minDist = dist;
          closestOffset = candidate;
        }
      }
      return { valid: true, offsetM: round1(closestOffset) };
    }

    const largest = [...validIntervals].sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];
    const centered = largest.start + (largest.end - largest.start - widthM) / 2;
    return { valid: true, offsetM: round1(centered) };
  };

  const handleResizePointerDown = (zoneId: string, handle: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 's' | 'w' | 'n', e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const layout = metricLayoutRef.current;
    const slots = previewSlotsRef.current;
    const slot = slots.find(s => s.zone.id === zoneId);
    if (!layout || !slot || layout.pxPerMeter <= 0) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startSp = spatialOf(slot.zone);
    const startW = startSp.w;
    const startL = startSp.l;
    const curPosX = slot.zone.spatial?.pos_x_m ?? (slot.x - layout.bounds.x) / layout.pxPerMeter;
    const curPosY = slot.zone.spatial?.pos_y_m ?? (slot.y - layout.bounds.y) / layout.pxPerMeter;
    const k = layout.pxPerMeter;
    const step = gridResolutionM || 0.5;

    let lastW = startW;
    let lastL = startL;
    let lastX = curPosX;
    let lastY = curPosY;
    let rafId: number | null = null;

    const SNAP_EDGE_THRESH = 0.35;
    const otherRooms = slots
      .filter(s => s.zone.id !== zoneId)
      .map(s => {
        const osp = spatialOf(s.zone);
        const ox = s.zone.spatial?.pos_x_m ?? (s.x - layout.bounds.x) / k;
        const oy = s.zone.spatial?.pos_y_m ?? (s.y - layout.bounds.y) / k;
        return {
          id: s.zone.id,
          left: ox,
          right: ox + osp.w,
          top: oy,
          bottom: oy + osp.l,
          w: osp.w,
          l: osp.l,
          sqm: osp.sqm,
        };
      });

    const otherRoomsTotalSqm = otherRooms.reduce((sum, r) => sum + r.sqm, 0);
    const maxAllowedAreaSqm = (declaredArea && declaredArea > 0)
      ? Math.max(2.25, round1(declaredArea - otherRoomsTotalSqm))
      : Infinity;

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const dxM = (ev.clientX - startX) / (k * canvasZoom);
      const dyM = (ev.clientY - startY) / (k * canvasZoom);

      let nextW = startW;
      let nextL = startL;
      let nextX = curPosX;
      let nextY = curPosY;

      const snapVal = (val: number) => Math.max(1.5, Math.min(24, Math.round(val / step) * step));

      const curTop = curPosY;
      const curBottom = curPosY + startL;
      const curLeft = curPosX;
      const curRight = curPosX + startW;

      // 1. East edge resizing (anchors Left edge at curPosX)
      if (handle === 'se' || handle === 'e' || handle === 'ne') {
        let maxAllowedRight = 30;
        for (const o of otherRooms) {
          const overlapsY = (o.top < curBottom - 0.05) && (o.bottom > curTop + 0.05);
          if (overlapsY && o.left >= curLeft + 0.5) {
            maxAllowedRight = Math.min(maxAllowedRight, o.left);
          }
        }
        let candRight = Math.min(maxAllowedRight, curPosX + snapVal(startW + dxM));
        if (Math.abs(candRight - maxAllowedRight) < SNAP_EDGE_THRESH) {
          candRight = maxAllowedRight;
        } else {
          for (const o of otherRooms) {
            if (Math.abs(candRight - o.left) < SNAP_EDGE_THRESH && o.left <= maxAllowedRight) { candRight = o.left; break; }
            if (Math.abs(candRight - o.right) < SNAP_EDGE_THRESH && o.right <= maxAllowedRight) { candRight = o.right; break; }
          }
        }
        nextW = Math.max(1.5, round1(candRight - curPosX));
      }

      // 2. South edge resizing (anchors Top edge at curPosY)
      if (handle === 'se' || handle === 's' || handle === 'sw') {
        let maxAllowedBottom = 30;
        for (const o of otherRooms) {
          const overlapsX = (o.left < curRight - 0.05) && (o.right > curLeft + 0.05);
          if (overlapsX && o.top >= curTop + 0.5) {
            maxAllowedBottom = Math.min(maxAllowedBottom, o.top);
          }
        }
        let candBottom = Math.min(maxAllowedBottom, curPosY + snapVal(startL + dyM));
        if (Math.abs(candBottom - maxAllowedBottom) < SNAP_EDGE_THRESH) {
          candBottom = maxAllowedBottom;
        } else {
          for (const o of otherRooms) {
            if (Math.abs(candBottom - o.top) < SNAP_EDGE_THRESH && o.top <= maxAllowedBottom) { candBottom = o.top; break; }
            if (Math.abs(candBottom - o.bottom) < SNAP_EDGE_THRESH && o.bottom <= maxAllowedBottom) { candBottom = o.bottom; break; }
          }
        }
        nextL = Math.max(1.5, round1(candBottom - curPosY));
      }

      // 3. West edge resizing (anchors Right edge at fixedRight)
      if (handle === 'sw' || handle === 'nw' || handle === 'w') {
        const fixedRight = curPosX + startW;
        let minAllowedLeft = 0;
        for (const o of otherRooms) {
          const overlapsY = (o.top < curBottom - 0.05) && (o.bottom > curTop + 0.05);
          if (overlapsY && o.right <= fixedRight - 0.5) {
            minAllowedLeft = Math.max(minAllowedLeft, o.right);
          }
        }
        let candLeft = Math.max(minAllowedLeft, snapVal(curPosX + dxM));
        if (Math.abs(candLeft - minAllowedLeft) < SNAP_EDGE_THRESH) {
          candLeft = minAllowedLeft;
        } else {
          for (const o of otherRooms) {
            if (Math.abs(candLeft - o.left) < SNAP_EDGE_THRESH && o.left >= minAllowedLeft) { candLeft = o.left; break; }
            if (Math.abs(candLeft - o.right) < SNAP_EDGE_THRESH && o.right >= minAllowedLeft) { candLeft = o.right; break; }
          }
        }
        candLeft = Math.min(fixedRight - 1.5, Math.max(minAllowedLeft, candLeft));
        nextX = round1(candLeft);
        nextW = Math.max(1.5, round1(fixedRight - nextX));
      }

      // 4. North edge resizing (anchors Bottom edge at fixedBottom)
      if (handle === 'ne' || handle === 'nw' || handle === 'n') {
        const fixedBottom = curPosY + startL;
        let minAllowedTop = 0;
        for (const o of otherRooms) {
          const overlapsX = (o.left < curRight - 0.05) && (o.right > curLeft + 0.05);
          if (overlapsX && o.bottom <= fixedBottom - 0.5) {
            minAllowedTop = Math.max(minAllowedTop, o.bottom);
          }
        }
        let candTop = Math.max(minAllowedTop, snapVal(curPosY + dyM));
        if (Math.abs(candTop - minAllowedTop) < SNAP_EDGE_THRESH) {
          candTop = minAllowedTop;
        } else {
          for (const o of otherRooms) {
            if (Math.abs(candTop - o.top) < SNAP_EDGE_THRESH && o.top >= minAllowedTop) { candTop = o.top; break; }
            if (Math.abs(candTop - o.bottom) < SNAP_EDGE_THRESH && o.bottom >= minAllowedTop) { candTop = o.bottom; break; }
          }
        }
        candTop = Math.min(fixedBottom - 1.5, Math.max(minAllowedTop, candTop));
        nextY = round1(candTop);
        nextL = Math.max(1.5, round1(fixedBottom - nextY));
      }

      // ── Total Apartment Area Budget Constraint ──
      if (maxAllowedAreaSqm < Infinity) {
        const proposedArea = nextW * nextL;
        if (proposedArea > maxAllowedAreaSqm) {
          if (handle === 'e' || handle === 'w') {
            nextW = Math.max(1.5, round1(Math.floor((maxAllowedAreaSqm / nextL) * 10) / 10));
            if (handle === 'w') {
              nextX = round1(curPosX + startW - nextW);
            }
          } else if (handle === 's' || handle === 'n') {
            nextL = Math.max(1.5, round1(Math.floor((maxAllowedAreaSqm / nextW) * 10) / 10));
            if (handle === 'n') {
              nextY = round1(curPosY + startL - nextL);
            }
          } else {
            const scale = Math.sqrt(maxAllowedAreaSqm / proposedArea);
            nextW = Math.max(1.5, round1(Math.floor(nextW * scale * 10) / 10));
            nextL = Math.max(1.5, round1(Math.floor(nextL * scale * 10) / 10));
            if (handle === 'sw' || handle === 'nw') {
              nextX = round1(curPosX + startW - nextW);
            }
            if (handle === 'ne' || handle === 'nw') {
              nextY = round1(curPosY + startL - nextL);
            }
          }
        }
      }

      if (nextW !== lastW || nextL !== lastL || nextX !== lastX || nextY !== lastY) {
        lastW = nextW;
        lastL = nextL;
        lastX = nextX;
        lastY = nextY;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          handleUpdateSpatial(zoneId, { width_m: nextW, length_m: nextL, pos_x_m: nextX, pos_y_m: nextY });
        });
      }
    };

    const onUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      handleUpdateSpatial(zoneId, { width_m: lastW, length_m: lastL, pos_x_m: lastX, pos_y_m: lastY });
      const currentArea = round1(lastW * lastL);
      if (declaredArea && currentArea >= maxAllowedAreaSqm) {
        showToast(isAr ? `الأبعاد: ${lastW}م × ${lastL}م (${currentArea}م² - الحد الأقصى للمساحة المتاحة)` : `Dimensions: ${lastW}m × ${lastL}m (${currentArea}m² - Max available area reached)`);
      } else {
        showToast(isAr ? `الأبعاد: ${lastW}م × ${lastL}م (${currentArea}م²)` : `Dimensions: ${lastW}m × ${lastL}m (${currentArea}m²)`);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
  };

  const handleFlipOpening = (zoneId: string, openingId: string) => {
    const zone = activeZones.find(z => z.id === zoneId);
    if (!zone) return;
    const openings = (zone.spatial?.openings ?? []).map(o =>
      o.id === openingId ? { ...o, flip: !o.flip } : o,
    );
    handleUpdateSpatial(zoneId, { openings });
    showToast(isAr ? 'تم عكس اتجاه فتح الباب' : 'Door swing flipped');
  };

  const handleStartDoorPlacement = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setComposerTool('door');
    showToast(isAr ? 'أداة الأبواب: حرّك المؤشر فوق أي جدار وانقر لوضع الباب في المكان المحدد' : 'Door Tool: Hover over any wall and click to place door at exact cursor position');
  };

  const handleStartWindowPlacement = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setComposerTool('window');
    showToast(isAr ? 'أداة النوافذ: حرّك المؤشر فوق الجدار الخارجي وانقر لوضع النافذة' : 'Window Tool: Hover over exterior wall and click to place window at exact cursor position');
  };

  const handleOpeningPointerDown = (
    zoneId: string,
    openingId: string,
    edge: 'n' | 'e' | 's' | 'w',
    initialOffsetM: number,
    openingWidthM: number,
    e: React.PointerEvent,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (composerTool !== 'select') return;

    const layout = metricLayoutRef.current;
    const slots = previewSlotsRef.current;
    const slot = slots.find(s => s.zone.id === zoneId);
    if (!layout || !slot || layout.pxPerMeter <= 0) return;

    const k = layout.pxPerMeter;
    const horizontal = edge === 'n' || edge === 's';
    const edgeLenM = (horizontal ? slot.w : slot.h) / k;
    const zone = activeZones.find(z => z.id === zoneId);
    if (!zone) return;
    const otherOpenings = (zone.spatial?.openings ?? []).filter(o => o.id !== openingId);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let lastOffsetM = initialOffsetM;
    let rafId: number | null = null;

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const deltaPx = horizontal ? (ev.clientX - startClientX) : (ev.clientY - startClientY);
      const deltaM = deltaPx / k;
      const proposedM = initialOffsetM + deltaM;

      const slotRes = findValidOpeningSlot(otherOpenings, edge, edgeLenM, openingWidthM, proposedM);
      const newOffsetM = slotRes.valid ? slotRes.offsetM : lastOffsetM;

      if (newOffsetM !== lastOffsetM) {
        lastOffsetM = newOffsetM;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const updatedOpenings = (zone.spatial?.openings ?? []).map(o =>
            o.id === openingId ? { ...o, offset_m: newOffsetM } : o
          );
          handleUpdateSpatial(zoneId, { openings: updatedOpenings });
        });
      }
    };

    const onUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      pushHistory(zoneInstances);
      showToast(isAr ? 'تم تعديل موضع الفتحة على الجدار' : 'Opening repositioned along wall');
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
  };

  const handleAdjustWindowWidth = (zoneId: string, openingId: string) => {
    const zone = activeZones.find(z => z.id === zoneId);
    if (!zone) return;
    const widths = [1.0, 1.2, 1.6, 2.0];
    const openings = (zone.spatial?.openings ?? []).map(o => {
      if (o.id !== openingId) return o;
      const idx = widths.indexOf(o.width_m);
      const nextW = widths[(idx + 1) % widths.length];
      return { ...o, width_m: nextW };
    });
    handleUpdateSpatial(zoneId, { openings });
    showToast(isAr ? 'تم تعديل عرض النافذة' : 'Window width adjusted');
  };

  const handleWallPointerMove = (zoneId: string, e: React.PointerEvent) => {
    if (composerTool === 'select') {
      if (activeOpeningHover) setActiveOpeningHover(null);
      return;
    }
    const layout = metricLayoutRef.current;
    const slots = previewSlotsRef.current;
    const slot = slots.find(s => s.zone.id === zoneId);
    if (!layout || !slot || layout.pxPerMeter <= 0) return;

    const p = clientToSvg(e.clientX, e.clientY);
    const dN = Math.abs(p.y - slot.y);
    const dS = Math.abs(slot.y + slot.h - p.y);
    const dW = Math.abs(p.x - slot.x);
    const dE = Math.abs(slot.x + slot.w - p.x);
    const min = Math.min(dN, dS, dW, dE);
    const edge: ZoneOpening['edge'] = min === dN ? 'n' : min === dS ? 's' : min === dW ? 'w' : 'e';
    const k = layout.pxPerMeter;
    const horizontal = edge === 'n' || edge === 's';
    const edgeLenM = (horizontal ? slot.w : slot.h) / k;
    const widthM = composerTool === 'door' ? 0.9 : 1.2;

    const alongM = (horizontal ? p.x - slot.x : p.y - slot.y) / k - widthM / 2;
    const existingOpenings = slot.zone.spatial?.openings ?? [];
    const slotRes = findValidOpeningSlot(existingOpenings, edge, edgeLenM, widthM, alongM);
    const offsetM = slotRes.valid ? slotRes.offsetM : round1(Math.max(0.15, Math.min(alongM, edgeLenM - widthM - 0.15)));
    const distLeftM = offsetM;
    const distRightM = round1(edgeLenM - (offsetM + widthM));

    const offPx = offsetM * k;
    const wPx = widthM * k;

    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    if (horizontal) {
      const y = edge === 'n' ? slot.y : slot.y + slot.h;
      x1 = slot.x + offPx;
      y1 = y;
      x2 = slot.x + offPx + wPx;
      y2 = y;
    } else {
      const x = edge === 'w' ? slot.x : slot.x + slot.w;
      x1 = x;
      y1 = slot.y + offPx;
      x2 = x;
      y2 = slot.y + offPx + wPx;
    }

    setActiveOpeningHover({
      zoneId,
      kind: composerTool,
      edge,
      x1,
      y1,
      x2,
      y2,
      offsetM,
      widthM,
      distLeftM,
      distRightM,
    });
  };

  const handleComposerClick = (zoneId: string, e: React.MouseEvent) => {
    const layout = metricLayoutRef.current;
    const slots = previewSlotsRef.current;
    const slot = slots.find(s => s.zone.id === zoneId);
    if (!layout || !slot || layout.pxPerMeter <= 0 || composerTool === 'select') return;
    const kind = composerTool;
    const p = clientToSvg(e.clientX, e.clientY);
    const dN = Math.abs(p.y - slot.y);
    const dS = Math.abs(slot.y + slot.h - p.y);
    const dW = Math.abs(p.x - slot.x);
    const dE = Math.abs(slot.x + slot.w - p.x);
    const min = Math.min(dN, dS, dW, dE);
    const edge: ZoneOpening['edge'] = min === dN ? 'n' : min === dS ? 's' : min === dW ? 'w' : 'e';
    const k = layout.pxPerMeter;
    const horizontal = edge === 'n' || edge === 's';
    const edgeLenM = (horizontal ? slot.w : slot.h) / k;
    const widthM = kind === 'door' ? 0.9 : 1.2;
    if (edgeLenM < widthM + 0.3) {
      showToast(isAr ? 'الحائط أقصر من الفتحة' : 'Wall too short for this opening');
      return;
    }
    const alongM = (horizontal ? p.x - slot.x : p.y - slot.y) / k - widthM / 2;
    const existingOpenings = slot.zone.spatial?.openings ?? [];
    const slotRes = findValidOpeningSlot(existingOpenings, edge, edgeLenM, widthM, alongM);

    if (!slotRes.valid) {
      showToast(isAr ? 'لا توجد مساحة كافية على هذا الجدار (تداخل مع فتحة أخرى)' : 'Cannot place here (overlaps another opening)');
      return;
    }

    const opening: ZoneOpening = {
      id: `open-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      edge,
      offset_m: slotRes.offsetM,
      width_m: widthM,
      flip: false,
    };
    pushHistory(zoneInstances);
    handleUpdateSpatial(zoneId, { openings: [...existingOpenings, opening] });
    setComposerTool('select');
    setActiveOpeningHover(null);
    showToast(kind === 'door' 
      ? (isAr ? 'تم وضع الباب في المكان المحدد بدقة' : 'Door placed at chosen location') 
      : (isAr ? 'تم وضع النافذة في المكان المحدد بدقة' : 'Window placed at chosen location'));
  };

  const handleRemoveOpening = (zoneId: string, openingId: string) => {
    const zone = activeZones.find(z => z.id === zoneId);
    if (!zone) return;
    handleUpdateSpatial(zoneId, { openings: (zone.spatial?.openings ?? []).filter(o => o.id !== openingId) });
    showToast(isAr ? 'تمت إزالة الفتحة' : 'Opening removed');
  };

  const handleCanvasBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (composerTool !== 'select') return;
    setIsPanningCanvas(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: canvasPan.x,
      panY: canvasPan.y,
    };
    const onPanMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const dx = ev.clientX - panStartRef.current.clientX;
      const dy = ev.clientY - panStartRef.current.clientY;
      setCanvasPan({
        x: round1(panStartRef.current.panX + dx),
        y: round1(panStartRef.current.panY + dy),
      });
    };
    const onPanUp = () => {
      setIsPanningCanvas(false);
      window.removeEventListener('pointermove', onPanMove);
      window.removeEventListener('pointerup', onPanUp);
    };
    window.addEventListener('pointermove', onPanMove);
    window.addEventListener('pointerup', onPanUp);
  };

  const handleCanvasRoomPointerDown = (zoneId: string, e: React.PointerEvent) => {
    if (e.button !== 0 || displayZones.length < 1 || composerTool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let moved = false;
    let latestSnapM: { x: number; y: number; w: number; h: number } | null = null;
    let latestOverId: string | null = null;

    const slotsAtStart = previewSlotsRef.current;
    const layoutAtStart = metricLayoutRef.current;
    if (!layoutAtStart) return;

    const clickedSlot = slotsAtStart.find(s => s.zone.id === zoneId);
    const startSvgP = clientToSvg(startClientX, startClientY);
    const k = layoutAtStart.pxPerMeter;
    const grabOffsetM = clickedSlot && k > 0
      ? {
          x: Math.max(0, Math.min(clickedSlot.w / k, (startSvgP.x - clickedSlot.x) / k)),
          y: Math.max(0, Math.min(clickedSlot.h / k, (startSvgP.y - clickedSlot.y) / k)),
        }
      : undefined;

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      if (!moved) {
        const dist = Math.hypot(ev.clientX - startClientX, ev.clientY - startClientY);
        if (dist < 4) return;
        moved = true;
        setSelectedZoneId(zoneId);
      }
      const p = clientToSvg(ev.clientX, ev.clientY);
      const snapRes = computeMagneticSnap(zoneId, p, slotsAtStart, layoutAtStart, magneticSnap, gridResolutionM, grabOffsetM);
      if (snapRes) {
        latestSnapM = snapRes.snapM;
        setCanvasDrag({
          id: zoneId,
          x: p.x,
          y: p.y,
          overId: null,
          snap: snapRes.snapPx,
          guides: snapRes.guides,
          snapLabel: snapRes.snapLabel,
          dockedWith: snapRes.dockedWith,
        });
      } else {
        const over = slotsAtStart.find(s =>
          s.zone.id !== zoneId &&
          p.x >= s.x && p.x <= s.x + s.w &&
          p.y >= s.y && p.y <= s.y + s.h,
        );
        latestOverId = over?.zone.id ?? null;
        setCanvasDrag({ id: zoneId, x: p.x, y: p.y, overId: latestOverId });
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setCanvasDrag(null);
      if (!moved) {
        selectZone(zoneId, true);
        return;
      }
      suppressCanvasClickRef.current = true;
      window.setTimeout(() => { suppressCanvasClickRef.current = false; }, 50);

      if (latestSnapM) {
        const k = layoutAtStart.pxPerMeter;
        const moves: Record<string, { x: number; y: number; w: number; h: number }> = {};
        for (const s of slotsAtStart) {
          moves[s.zone.id] = s.zone.id === zoneId
            ? latestSnapM
            : {
                x: (s.x - layoutAtStart.bounds.x) / k,
                y: (s.y - layoutAtStart.bounds.y) / k,
                w: s.w / k,
                h: s.h / k,
              };
        }
        materializePlacement(moves);
        showToast(isAr ? 'تمت محاذاة وتثبيت الغرفة بنجاح' : 'Room magnetically positioned');
        return;
      }
      if (latestOverId) {
        const targetIdx = displayZones.findIndex(z => z.id === latestOverId);
        if (targetIdx !== -1) handleReorder(zoneId, targetIdx);
      }
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
  };

  const handleRowDragStart = (zoneId: string, e: React.PointerEvent) => {
    e.preventDefault();
    const zones = displayZones;
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
    if (displayZones.length === 0) return;
    const idx = currentSelectedZone ? displayZones.findIndex(z => z.id === currentSelectedZone.id) : -1;
    const nextIdx = Math.min(displayZones.length - 1, Math.max(0, idx + dir));
    const next = displayZones[nextIdx];
    if (next) {
      selectZone(next.id, true);
      requestAnimationFrame(() => rowRefs.current[next.id]?.focus());
    }
  };

  const metricLayout = useMemo(() => {
    return computeMetricLayout(
      activeZones.map(z => {
        const sp = spatialOf(z);
        return {
          id: z.id,
          widthM: sp.w,
          lengthM: sp.l,
          xM: z.spatial?.pos_x_m,
          yM: z.spatial?.pos_y_m,
          label: z.instance_label,
        };
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

  previewSlotsRef.current = previewSlots;
  metricLayoutRef.current = metricLayout;

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

  const unreachableRooms = useMemo(() => {
    if (!composerActive || previewSlots.length < 2) return [];
    if (!activeZones.some(z => z.spatial?.pos_x_m != null && z.spatial?.pos_y_m != null)) return [];
    const doors = new Set(
      previewSlots
        .filter(s => (s.zone.spatial?.openings ?? []).some(o => o.kind === 'door'))
        .map(s => s.zone.id),
    );
    if (doors.size === 0) return [];

    const TOUCH = 8;
    const OVERLAP = 6;
    const adjacent = (a: typeof previewSlots[number], b: typeof previewSlots[number]) => {
      const xOverlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const yOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      const touchV = Math.abs(a.y + a.h - b.y) < TOUCH || Math.abs(b.y + b.h - a.y) < TOUCH;
      const touchH = Math.abs(a.x + a.w - b.x) < TOUCH || Math.abs(b.x + b.w - a.x) < TOUCH;
      return (touchV && xOverlap > OVERLAP) || (touchH && yOverlap > OVERLAP);
    };

    return previewSlots
      .filter(s => {
        if (doors.has(s.zone.id)) return false;
        return !previewSlots.some(o => o.zone.id !== s.zone.id && doors.has(o.zone.id) && adjacent(s, o));
      })
      .map(s => ({ id: s.zone.id, title: s.title }));
  }, [composerActive, previewSlots, activeZones]);

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

  const viewAnimKey = `${propertyType}_${bldView.mode}_${'floorKey' in bldView ? bldView.floorKey : ''}_${'unitId' in bldView ? bldView.unitId : ''}_${activeFloorKey}`;

  const [clipboardZone, setClipboardZone] = useState<ZoneInstance | null>(null);

  // Copy Room to Clipboard
  const handleCopyRoom = useCallback((zoneToCopy?: ZoneInstance | null) => {
    const target = zoneToCopy || currentSelectedZone;
    if (!target) {
      showToast(isAr ? 'حدد غرفة لنسخها أولاً' : 'Select a room to copy first');
      return;
    }
    setClipboardZone(target);
    showToast(isAr ? `تم نسخ ${getZoneLabel(target)} (Ctrl+C)` : `Copied ${getZoneLabel(target)} (Ctrl+C)`);
  }, [currentSelectedZone, isAr, showToast]);

  // Paste Room from Clipboard
  const handlePasteRoom = useCallback(() => {
    if (!clipboardZone) {
      showToast(isAr ? 'الحافظة فارغة — انسخ غرفة أولاً' : 'Clipboard is empty — copy a room first');
      return;
    }

    const curFloorZones = floorGroups[activeFloorKey]?.zones ?? [];
    const countSameTid = curFloorZones.filter(z => z.zone_template_id === clipboardZone.zone_template_id).length;
    const baseLabel = getZoneLabel(clipboardZone).replace(/\s*\d+$/, '');
    const newLabel = `${baseLabel} ${countSameTid + 1}`;

    const sp = spatialOf(clipboardZone);
    const origSpatial = clipboardZone.spatial;
    const newPosXM = origSpatial?.pos_x_m != null ? round1(origSpatial.pos_x_m + 2.0) : 0;
    const posYM = origSpatial?.pos_y_m != null ? round1(origSpatial.pos_y_m + 2.0) : 0;

    const newSpatial: ZoneSpatialLayout = {
      gridX: origSpatial?.gridX ?? 0,
      gridY: origSpatial?.gridY ?? 0,
      gridW: origSpatial?.gridW ?? 6,
      gridH: origSpatial?.gridH ?? 4,
      length_m: sp.l,
      width_m: sp.w,
      sqm: sp.sqm,
      ceiling_height: sp.ceiling,
      pos_x_m: newPosXM,
      pos_y_m: posYM,
      openings: (origSpatial?.openings ?? []).map(o => ({ ...o, id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 5)}` })),
    };

    const newZone: ZoneInstance = {
      ...clipboardZone,
      id: `zone-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      instance_label: newLabel,
      level_label: propertyType === 'apartment' ? activeFloorKey : clipboardZone.level_label,
      sort_order: zoneInstances.length + 1,
      spatial: newSpatial,
    };

    pushHistory(zoneInstances);

    if (propertyType === 'building' && bldView.mode === 'unit') {
      const unit = buildingModel?.units.find(u => u.id === bldView.unitId);
      if (unit) {
        onZoneInstancesChange(zoneInstances.map(z =>
          z.id === unit.id ? { ...z, children: [...(z.children ?? []), newZone] } : z,
        ));
      } else {
        onZoneInstancesChange([...zoneInstances, newZone]);
      }
    } else {
      onZoneInstancesChange([...zoneInstances, newZone]);
    }

    setSelectedZoneId(newZone.id);
    showToast(isAr ? `تم لصق ${newLabel} (Ctrl+V)` : `Pasted ${newLabel} (Ctrl+V)`);
    requestAnimationFrame(() => {
      rowRefs.current[newZone.id]?.scrollIntoView({ block: 'nearest' });
    });
  }, [clipboardZone, floorGroups, activeFloorKey, spatialOf, propertyType, zoneInstances, pushHistory, onZoneInstancesChange, bldView, buildingModel, isAr, showToast]);

  // Global Keyboard Shortcuts (Ctrl+C, Ctrl+V, Ctrl+Z, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + C: Copy selected room
      if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        if (currentSelectedZone) {
          e.preventDefault();
          handleCopyRoom(currentSelectedZone);
        }
      }

      // Ctrl + V: Paste room
      if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        if (clipboardZone) {
          e.preventDefault();
          handlePasteRoom();
        }
      }

      // Delete or Backspace: Delete selected room
      if ((e.key === 'Delete' || e.key === 'Backspace') && currentSelectedZone) {
        e.preventDefault();
        pushHistory(zoneInstances);
        onZoneInstancesChange(removeZones(zoneInstances, [currentSelectedZone.id]));
        setSelectedZoneId(null);
        showToast(isAr ? 'تم حذف الغرفة' : 'Room deleted');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSelectedZone, clipboardZone, handleCopyRoom, handlePasteRoom, zoneInstances, pushHistory, onZoneInstancesChange, isAr, showToast]);

  // Reliably prevent outer page / modal scrolling while zooming the CAD canvas
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setCanvasZoom(z => Math.max(0.5, Math.min(3.0, round1(z + delta))));
    };

    svgEl.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      svgEl.removeEventListener('wheel', handleNativeWheel);
    };
  }, [viewAnimKey]);

  return (
    <div className="fp-root" dir={isAr ? 'rtl' : 'ltr'} ref={rootRef} data-lenis-prevent="true">

      {propertyType === 'building' ? (
        <div className="fp-floor-tabs">
          <nav className="fp-crumbs" aria-label={isAr ? 'مسار المبنى' : 'Building navigation'}>
            <button
              type="button"
              className={`fp-crumb ${bldView.mode === 'elevation' ? 'active' : ''}`}
              onClick={() => {
                setBldView({ mode: 'elevation' });
                setSelectedZoneId(null);
                setComposerTool('select');
              }}
            >
              <Building size={13} />
              <span>{isAr ? 'المبنى' : 'Building'}</span>
            </button>
            {bldView.mode !== 'elevation' && (
              <>
                <span className="fp-crumb-sep" aria-hidden="true">›</span>
                <button
                  type="button"
                  className={`fp-crumb ${bldView.mode === 'floor' ? 'active' : ''}`}
                  onClick={() => {
                    setBldView({ mode: 'floor', floorKey: bldView.floorKey });
                    setSelectedZoneId(null);
                    setComposerTool('select');
                  }}
                >
                  {bldView.floorKey === 'bld_basement'
                    ? (isAr ? 'البدروم' : 'Basement')
                    : bldView.floorKey === 'bld_ground'
                      ? (isAr ? 'الدور الأرضي' : 'Ground Floor')
                      : bldView.floorKey === 'bld_roof'
                        ? (isAr ? 'السطح' : 'Roof')
                        : bldView.floorKey}
                </button>
              </>
            )}
            {bldView.mode === 'unit' && (() => {
              const unit = buildingModel?.units.find(u => u.id === bldView.unitId);
              return (
                <>
                  <span className="fp-crumb-sep" aria-hidden="true">›</span>
                  <span className="fp-crumb active" aria-current="page">{unit?.instance_label ?? (isAr ? 'وحدة' : 'Unit')}</span>
                </>
              );
            })()}
            {bldView.mode === 'unit' && (
              <button type="button" className="fp-crumb-propagate" onClick={handlePropagateUnit}>
                <Copy size={12} />
                <span>{isAr ? 'تطبيق على الوحدات المطابقة' : 'Apply to matching units'}</span>
              </button>
            )}
          </nav>
        </div>
      ) : (
      <div className="fp-floor-tabs">
        <div className="fp-floor-tabs-scroll" role="tablist">
          {Object.entries(floorGroups).map(([key, group], _idx, entries) => {
            const isActive = activeFloorKey === key;
            const sqmBadge = floorSqm(group.zones);
            const renaming = renamingFloorKey === key;
            const singleApartmentTab = propertyType === 'apartment' && entries.length === 1 && key === GROUND_KEY;
            const tabLabel = singleApartmentTab
              ? (isAr ? 'الشقة' : 'Apartment')
              : (isAr ? group.labelAr : group.labelEn);
            return (
              <div
                key={key}
                role="tab"
                tabIndex={0}
                aria-selected={isActive}
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
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveFloorKey(key);
                    setSelectedZoneId(group.zones[0]?.id ?? null);
                  } else if (e.key === 'F2' && propertyType === 'apartment' && key !== GROUND_KEY) {
                    e.preventDefault();
                    setRenamingFloorKey(key);
                    setFloorDraft(key);
                  }
                }}
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
                      e.stopPropagation();
                      if (e.key === 'Enter') { e.preventDefault(); handleRenameFloor(key, floorDraft); }
                      else if (e.key === 'Escape') { e.preventDefault(); setRenamingFloorKey(null); }
                    }}
                  />
                ) : (
                  <span>{tabLabel}</span>
                )}
                <span className="fp-floor-badge" dir="ltr">{sqmBadge} m²</span>
              </div>
            );
          })}
        </div>

        <div className="fp-header-actions" style={{ marginInlineStart: 'auto' }}>
          <button
            type="button"
            className="fp-history-btn"
            aria-label={isAr ? 'تراجع' : 'Undo'}
            title={isAr ? 'تراجع (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            className="fp-history-btn"
            aria-label={isAr ? 'إعادة' : 'Redo'}
            title={isAr ? 'إعادة (Ctrl+Shift+Z)' : 'Redo (Ctrl+Shift+Z)'}
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 size={14} />
          </button>
        </div>
      </div>
      )}

      <div className={`fp-workspace ${listPortalTarget ? 'no-list' : ''}`}>

        <div className="fp-canvas-panel">
          {/* ── Single Unified Sleek CAD Header Toolbar ── */}
          <div className="fp-canvas-bar">
            <div className="fp-canvas-bar-left">
              {previewSlots.length > 0 && (propertyType !== 'building' || bldView.mode === 'unit') && (
                <div className="fp-tools" role="group" aria-label={isAr ? 'أدوات المخطط والمغناطيس' : 'CAD Designer Studio Tools'}>
                  {/* Magnetic Snapping Toggle */}
                  <button
                    type="button"
                    className={`fp-tool-btn fp-tool-magnet ${magneticSnap ? 'active' : ''}`}
                    title={isAr ? 'تفعيل/تعطيل المحاذاة المغناطيسية الذكية' : 'Toggle Magnetic Smart Snapping'}
                    aria-pressed={magneticSnap}
                    onClick={() => {
                      setMagneticSnap(prev => !prev);
                      showToast(isAr ? (!magneticSnap ? 'المغناطيس مفعّل' : 'المغناطيس معطّل') : (!magneticSnap ? 'Magnetic snap enabled' : 'Magnetic snap disabled'));
                    }}
                  >
                    <Magnet size={13} />
                    <span className="fp-tool-label">{isAr ? (magneticSnap ? 'مغناطيس: مفعّل' : 'مغناطيس: معطّل') : (magneticSnap ? 'Snap: ON' : 'Snap: OFF')}</span>
                  </button>

                  {/* Grid Snap Selector */}
                  <button
                    type="button"
                    className="fp-tool-btn"
                    title={isAr ? `تغيير دقة الشبكة (${gridResolutionM}م)` : `Toggle Grid Step (${gridResolutionM}m)`}
                    onClick={() => {
                      const next = gridResolutionM === 0.5 ? 0.25 : gridResolutionM === 0.25 ? 1.0 : 0.5;
                      setGridResolutionM(next);
                      showToast(isAr ? `دقة الشبكة: ${next} متر` : `Grid resolution: ${next}m`);
                    }}
                  >
                    <LayoutGrid size={13} />
                    <span className="fp-tool-label">{gridResolutionM}m</span>
                  </button>

                  {/* Auto Align & Snap Sides */}
                  <button
                    type="button"
                    className="fp-tool-btn fp-tool-autoalign"
                    title={isAr ? 'محاذاة الجوانب تلقائياً وإغلاق الفراغات مع الاحتفاظ بالمساحات' : 'Auto-align sides and eliminate dead space gaps (keeps sizes & layout)'}
                    onClick={handleAutoAlignFlush}
                  >
                    <Sparkles size={13} />
                    <span className="fp-tool-label">{isAr ? 'محاذاة الفراغات' : 'Auto-Align'}</span>
                  </button>

                  {/* Shrinkwrap Perimeter / Compact Footprint */}
                  <button
                    type="button"
                    className="fp-tool-btn"
                    title={isAr ? 'تقليص وتنسيق حدود الشقة وإزالة الفراغات الميتة بالكامل' : 'Compact footprint & shrinkwrap apartment perimeter'}
                    onClick={handleAutoFitEnvelope}
                  >
                    <Maximize2 size={13} />
                    <span className="fp-tool-label">{isAr ? 'تقليص الحدود' : 'Compact'}</span>
                  </button>

                  {/* Rotate Entire Apartment Layout */}
                  <button
                    type="button"
                    className="fp-tool-btn"
                    title={isAr ? 'تدوير المخطط بالكامل 90 درجة مع الحفاظ على التخطيط والأبواب' : 'Rotate entire apartment layout 90° clockwise'}
                    onClick={handleRotateEntireApartment}
                  >
                    <RotateCw size={13} />
                    <span className="fp-tool-label">{isAr ? 'تدوير 90°' : 'Rotate 90°'}</span>
                  </button>

                  {/* Auto Dock / Arrange Layout */}
                  <button
                    type="button"
                    className="fp-tool-btn fp-tool-autodock"
                    title={isAr ? 'تجميع وتنسيق الغرف تلقائياً بدون تداخل' : 'Auto-dock & arrange all rooms seamlessly'}
                    onClick={handleAutoDock}
                  >
                    <Wand2 size={13} />
                    <span className="fp-tool-label">{isAr ? 'تنسيق ذكي' : 'Auto-Dock'}</span>
                  </button>

                  <div className="fp-tool-divider" />

                  {/* Copy Selected Room */}
                  <button
                    type="button"
                    className="fp-tool-btn"
                    title={isAr ? 'نسخ الغرفة المحددة (Ctrl+C)' : 'Copy selected room (Ctrl+C)'}
                    disabled={!currentSelectedZone}
                    onClick={() => handleCopyRoom(currentSelectedZone)}
                  >
                    <Copy size={13} />
                    <span className="fp-tool-label">{isAr ? 'نسخ' : 'Copy'}</span>
                  </button>

                  {/* Paste Room */}
                  <button
                    type="button"
                    className="fp-tool-btn"
                    title={isAr ? 'لصق الغرفة المنسوخة (Ctrl+V)' : 'Paste copied room (Ctrl+V)'}
                    disabled={!clipboardZone}
                    onClick={handlePasteRoom}
                  >
                    <span className="fp-tool-label">{isAr ? 'لصق' : 'Paste'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="fp-canvas-bar-right">
              {declaredArea && declaredArea > 0 && (() => {
                const activeSqm = floorSqm(floorGroups[activeFloorKey]?.zones ?? []);
                const pct = Math.min(100, Math.round((activeSqm / declaredArea) * 100));
                const rem = Math.max(0, round1(declaredArea - activeSqm));
                const isFull = activeSqm >= declaredArea;

                return (
                  <div
                    className={`fp-area-budget-meter ${isFull ? 'full' : ''}`}
                    title={
                      isAr
                        ? `المساحة المحجوزة: ${activeSqm} م² من إجمالي ${declaredArea} م² (المتبقي: ${rem} م²)`
                        : `Allocated: ${activeSqm} m² of ${declaredArea} m² (Remaining: ${rem} m²)`
                    }
                  >
                    <div className="fp-budget-meter-header">
                      <span className="fp-budget-meter-val" dir="ltr">
                        <strong>{activeSqm}</strong> / {declaredArea} m²
                      </span>
                      <span className={`fp-budget-meter-tag ${isFull ? 'full' : ''}`}>
                        {isFull
                          ? (isAr ? 'مكتمل' : '100%')
                          : (isAr ? `متبقي ${rem}م²` : `${rem}m² left`)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <button
                type="button"
                className="fp-tool-action-btn"
                title={isAr ? 'تراجع (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
                disabled={!canUndo}
                onClick={undo}
              >
                <Undo2 size={13} />
              </button>
              <button
                type="button"
                className="fp-tool-action-btn"
                title={isAr ? 'إعادة (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
                disabled={!canRedo}
                onClick={redo}
              >
                <Redo2 size={13} />
              </button>
            </div>
          </div>

          <div className="fp-canvas-body" style={{ position: 'relative' }}>
            {/* Floating Bottom-Right Zoom & Pan Controls */}
            <div className="fp-floating-zoom-widget">
              <button
                type="button"
                className="fp-float-zoom-btn"
                title="Zoom Out (-)"
                disabled={canvasZoom <= 0.5}
                onClick={() => setCanvasZoom(z => Math.max(0.5, round1(z - 0.2)))}
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                className="fp-float-zoom-btn fp-float-zoom-val"
                title="Reset Canvas View (100%)"
                onClick={() => { setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }); }}
              >
                <span>{Math.round(canvasZoom * 100)}%</span>
              </button>
              <button
                type="button"
                className="fp-float-zoom-btn"
                title="Zoom In (+)"
                disabled={canvasZoom >= 3.0}
                onClick={() => setCanvasZoom(z => Math.min(3.0, round1(z + 0.2)))}
              >
                <Plus size={13} />
              </button>
            </div>
            {propertyType === 'building' && bldView.mode === 'elevation' && buildingModel ? (() => {
              const sigFirstFloor = new Map<string, string>();
              for (const f of buildingModel.floors) {
                if (!sigFirstFloor.has(f.signature)) sigFirstFloor.set(f.signature, f.key);
              }
              const hasBasement = buildingModel.basement.length > 0;
              const hasRoof = buildingModel.roof.length > 0;
              const hasGround = buildingModel.ground.length > 0 || buildingModel.others.length > 0;
              const floorsList = [...buildingModel.floors].reverse();
              const totalFloorsCount = floorsList.length;

              if (totalFloorsCount === 0 && !hasRoof && !hasGround && !hasBasement) {
                return (
                  <div className="fp-empty-box">
                    <Building size={36} className="fp-empty-icon" />
                    <h4 className="fp-empty-title">{isAr ? 'لا توجد طوابق بعد' : 'No floors yet'}</h4>
                    <p className="fp-empty-desc">{isAr ? 'أضف مناطق المبنى من القائمة الجانبية.' : 'Add building zones from the side list.'}</p>
                  </div>
                );
              }

              // Dimensions for the 760x480 architectural canvas
              const bldX = 120;
              const bldW = 460;
              const bldRight = bldX + bldW; // 580
              const basementH = hasBasement ? 48 : 0;
              const groundBaseY = hasBasement ? 398 : 420; // ±0.00m line
              const groundH = Math.min(74, Math.max(54, (groundBaseY - 50) / (totalFloorsCount + (hasRoof ? 1 : 0) + 1.2) * 1.25));
              const groundY = groundBaseY - groundH;
              const roofStructH = hasRoof ? Math.min(44, Math.max(30, (groundY - 50) / (totalFloorsCount + 1) * 0.85)) : 0;
              const availTypicalH = groundY - 50 - roofStructH;
              const typFloorH = Math.min(68, Math.max(38, availTypicalH / Math.max(1, totalFloorsCount)));
              const actualTypicalTotalH = totalFloorsCount * typFloorH;
              const roofY = groundY - actualTypicalTotalH;
              return (
                <svg key={viewAnimKey} viewBox="0 0 760 480" className="fp-canvas-svg fp-building-elevation fp-view-animated" style={{ direction: 'ltr' }} xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="adminElevGrid" width="12" height="12" patternUnits="userSpaceOnUse">
                      <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(221, 167, 82, 0.07)" strokeWidth="0.5" />
                    </pattern>
                    <pattern id="adminElevMajorGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(221, 167, 82, 0.12)" strokeWidth="0.8" />
                    </pattern>
                    <pattern id="adminElevGroundHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(221, 167, 82, 0.25)" strokeWidth="1" />
                    </pattern>
                    <linearGradient id="adminElevGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(127, 180, 216, 0.35)" />
                      <stop offset="40%" stopColor="rgba(127, 180, 216, 0.15)" />
                      <stop offset="60%" stopColor="rgba(221, 167, 82, 0.08)" />
                      <stop offset="100%" stopColor="rgba(127, 180, 216, 0.25)" />
                    </linearGradient>
                    <linearGradient id="adminElevBalconyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(127, 180, 216, 0.28)" />
                      <stop offset="100%" stopColor="rgba(127, 180, 216, 0.06)" />
                    </linearGradient>
                    <linearGradient id="adminElevLobbyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(221, 167, 82, 0.22)" />
                      <stop offset="100%" stopColor="rgba(221, 167, 82, 0.04)" />
                    </linearGradient>
                    <filter id="adminElevHoverGlow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#DDA752" floodOpacity="0.6" />
                    </filter>
                  </defs>

                  {/* CAD Blueprint Background Grid */}
                  <rect width="760" height="480" fill="url(#adminElevGrid)" />
                  <rect width="760" height="480" fill="url(#adminElevMajorGrid)" opacity="0.4" />

                  {/* Left Datum / Elevation Level Lines */}
                  {floorsList.map((f, idx) => {
                    const floorY = roofY + idx * typFloorH;
                    const datumM = ((floorsList.length - idx) * 3.3).toFixed(2);
                    return (
                      <g key={`datum-${f.key}`} className="fp-datum-group">
                        <line x1="20" y1={floorY} x2={bldX - 8} y2={floorY} stroke="rgba(221, 167, 82, 0.3)" strokeDasharray="3 3" />
                        <circle cx="34" cy={floorY} r="4" fill="none" stroke="#DDA752" strokeWidth="1" />
                        <line x1="30" y1={floorY} x2="38" y2={floorY} stroke="#DDA752" strokeWidth="1" />
                        <line x1="34" y1={floorY - 4} x2="34" y2={floorY + 4} stroke="#DDA752" strokeWidth="1" />
                        <text x="44" y={floorY + 3} fontSize="8.5" fill="#DDA752" fontFamily="monospace" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                          +{datumM}m
                        </text>
                      </g>
                    );
                  })}
                  {/* Ground Datum Line */}
                  <g className="fp-datum-group">
                    <line x1="20" y1={groundBaseY} x2={bldX - 8} y2={groundBaseY} stroke="#DDA752" strokeWidth="1.2" />
                    <text x="44" y={groundBaseY + 3} fontSize="9" fill="#DDA752" fontWeight="800" fontFamily="monospace" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                      ±0.00m
                    </text>
                  </g>
                  {hasBasement && (
                    <g className="fp-datum-group">
                      <line x1="20" y1={groundBaseY + basementH} x2={bldX - 8} y2={groundBaseY + basementH} stroke="rgba(221, 167, 82, 0.3)" strokeDasharray="3 3" />
                      <text x="44" y={groundBaseY + basementH + 3} fontSize="8.5" fill="#DDA752" fontFamily="monospace" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                        -3.00m
                      </text>
                    </g>
                  )}

                  {/* ─── ROOFTOP ARCHITECTURAL CROWN ─── */}
                  {hasRoof && (
                    <g
                      role="button"
                      tabIndex={0}
                      className="fp-elev-floor-group"
                      style={{ cursor: 'pointer' }}
                      aria-label={`${isAr ? 'السطح والتراس' : 'Roof Terrace'} — ${floorSqm(buildingModel.roof)} m²`}
                      onClick={() => {
                        setBldView({ mode: 'floor', floorKey: 'bld_roof' });
                        setSelectedZoneId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setBldView({ mode: 'floor', floorKey: 'bld_roof' });
                          setSelectedZoneId(null);
                        }
                      }}
                    >
                      {/* Left Rooftop Modern Pergola */}
                      <g transform={`translate(${bldX + 24}, ${roofY - 24})`}>
                        <rect width="140" height="24" fill="rgba(221, 167, 82, 0.08)" stroke="#DDA752" strokeWidth="1.2" />
                        {[20, 40, 60, 80, 100, 120].map(px => (
                          <line key={`perg-${px}`} x1={px} y1="0" x2={px} y2="24" stroke="rgba(221, 167, 82, 0.4)" strokeWidth="1" />
                        ))}
                        <line x1="0" y1="0" x2="140" y2="0" stroke="#DDA752" strokeWidth="2" />
                      </g>

                      {/* Center Elevator Penthouse Machine Room */}
                      <g transform={`translate(${bldX + bldW / 2 - 40}, ${roofY - 32})`}>
                        <rect width="80" height="32" rx="2" fill="rgba(10, 14, 24, 0.95)" stroke="#DDA752" strokeWidth="1.5" />
                        <line x1="20" y1="10" x2="60" y2="10" stroke="rgba(221, 167, 82, 0.4)" strokeWidth="1" />
                        <line x1="20" y1="16" x2="60" y2="16" stroke="rgba(221, 167, 82, 0.4)" strokeWidth="1" />
                        <line x1="20" y1="22" x2="60" y2="22" stroke="rgba(221, 167, 82, 0.4)" strokeWidth="1" />
                        <text x="40" y="7" fontSize="7" fill="#DDA752" textAnchor="middle" fontWeight="700" fontFamily="monospace">ELEVATOR PENTHOUSE</text>
                      </g>

                      {/* Right Rooftop Water Storage Tanks */}
                      <g transform={`translate(${bldRight - 110}, ${roofY - 22})`}>
                        <rect x="0" y="4" width="34" height="18" rx="3" fill="rgba(127, 180, 216, 0.15)" stroke="#7FB4D8" strokeWidth="1.2" />
                        <rect x="42" y="4" width="34" height="18" rx="3" fill="rgba(127, 180, 216, 0.15)" stroke="#7FB4D8" strokeWidth="1.2" />
                        <line x1="34" y1="13" x2="42" y2="13" stroke="#7FB4D8" strokeWidth="1.5" />
                        <text x="38" y="-1" fontSize="6.5" fill="#7FB4D8" textAnchor="middle" fontFamily="monospace">WATER TANKS</text>
                      </g>

                      {/* Roof Parapet & Glass Balustrade */}
                      <rect x={bldX} y={roofY - 4} width={bldW} height="4" fill="#DDA752" />
                      <line x1={bldX} y1={roofY - 14} x2={bldRight} y2={roofY - 14} stroke="rgba(127, 180, 216, 0.6)" strokeWidth="1" strokeDasharray="6 3" />

                      {/* Roof Info Card on the Right */}
                      <g transform={`translate(${bldRight + 16}, ${roofY - 20})`}>
                        <rect width="138" height="32" rx="6" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(221, 167, 82, 0.25)" strokeWidth="1" className="fp-elev-card-border" />
                        <text x="8" y="14" fontSize="9.5" fill="#FFFFFF" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">
                          {isAr ? 'السطح والتراس' : 'Roof Terrace'}
                        </text>
                        <text x="8" y="25" fontSize="8" fill="#DDA752" fontFamily="monospace" fontWeight="700">
                          {`${floorSqm(buildingModel.roof)} m²`}
                        </text>
                        <text x="130" y="25" fontSize="7.5" fill="rgba(255, 255, 255, 0.5)" textAnchor="end" fontFamily="'Plus Jakarta Sans', sans-serif">
                          {isAr ? 'عرض ‹' : 'Inspect ›'}
                        </text>
                      </g>
                    </g>
                  )}

                  {/* ─── TYPICAL RESIDENTIAL FLOORS (FACADE & BALCONIES) ─── */}
                  {floorsList.map((floor, idx) => {
                    const floorY = roofY + idx * typFloorH;
                    const isLinked = sigFirstFloor.get(floor.signature) !== floor.key;
                    const unitsCount = floor.units.length;

                    return (
                      <g
                        key={floor.key}
                        role="button"
                        tabIndex={0}
                        className="fp-elev-floor-group"
                        style={{ cursor: 'pointer' }}
                        aria-label={`${floor.key} — ${floor.sqm} m² — ${unitsCount} ${isAr ? 'شقق' : 'units'}`}
                        onClick={() => {
                          setBldView({ mode: 'floor', floorKey: floor.key });
                          setSelectedZoneId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setBldView({ mode: 'floor', floorKey: floor.key });
                            setSelectedZoneId(null);
                          }
                        }}
                      >
                        {/* Floor Backdrop with Hover Filter */}
                        <rect
                          x={bldX}
                          y={floorY}
                          width={bldW}
                          height={typFloorH}
                          fill={idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'rgba(221, 167, 82, 0.02)'}
                          stroke="none"
                          className="fp-elev-floor-bg"
                        />

                        {/* Concrete Floor Slab Band */}
                        <rect x={bldX - 4} y={floorY + typFloorH - 3} width={bldW + 8} height="4" fill="#DDA752" opacity="0.9" />

                        {/* Left Residential Bay (Flat A Balcony & Windows) */}
                        <g transform={`translate(${bldX + 16}, ${floorY + 4})`}>
                          {/* Sliding French Doors Behind Balcony */}
                          <rect x="10" y="4" width="70" height={typFloorH - 12} fill="url(#adminElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                          <line x1="45" y1="4" x2="45" y2={typFloorH - 8} stroke="#7FB4D8" strokeWidth="1.2" />
                          {/* Cantilevered Balcony Slab & Glass Balustrade */}
                          <rect x="4" y={typFloorH - 10} width="82" height="4" fill="#DDA752" />
                          <rect x="4" y={typFloorH - 22} width="82" height="12" fill="url(#adminElevBalconyGrad)" stroke="#7FB4D8" strokeWidth="1" />
                          {/* Vertical Glass Stanchions */}
                          <line x1="24" y1={typFloorH - 22} x2="24" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />
                          <line x1="44" y1={typFloorH - 22} x2="44" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />
                          <line x1="64" y1={typFloorH - 22} x2="64" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />

                          {/* Bedroom Window Set */}
                          <rect x="100" y="8" width="56" height={typFloorH - 20} rx="1" fill="url(#adminElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                          <line x1="128" y1="8" x2="128" y2={typFloorH - 12} stroke="#7FB4D8" strokeWidth="1" />
                        </g>

                        {/* Center Architectural Spine (Staircase & Elevator Core Glazing) */}
                        <g transform={`translate(${bldX + bldW / 2 - 28}, ${floorY + 4})`}>
                          <rect width="56" height={typFloorH - 8} fill="rgba(10, 14, 24, 0.8)" stroke="rgba(221, 167, 82, 0.4)" strokeWidth="1.2" />
                          {/* Modern Vertical Architectural Mullions */}
                          <line x1="14" y1="0" x2="14" y2={typFloorH - 8} stroke="rgba(221, 167, 82, 0.3)" strokeWidth="1" />
                          <line x1="28" y1="0" x2="28" y2={typFloorH - 8} stroke="rgba(221, 167, 82, 0.3)" strokeWidth="1" />
                          <line x1="42" y1="0" x2="42" y2={typFloorH - 8} stroke="rgba(221, 167, 82, 0.3)" strokeWidth="1" />
                        </g>

                        {/* Right Residential Bay (Flat B Windows & Balcony) */}
                        <g transform={`translate(${bldRight - 186}, ${floorY + 4})`}>
                          {/* Bedroom Window Set */}
                          <rect x="14" y="8" width="56" height={typFloorH - 20} rx="1" fill="url(#adminElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                          <line x1="42" y1="8" x2="42" y2={typFloorH - 12} stroke="#7FB4D8" strokeWidth="1" />

                          {/* Sliding French Doors Behind Balcony */}
                          <rect x="90" y="4" width="70" height={typFloorH - 12} fill="url(#adminElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                          <line x1="125" y1="4" x2="125" y2={typFloorH - 8} stroke="#7FB4D8" strokeWidth="1.2" />
                          {/* Cantilevered Balcony Slab & Glass Balustrade */}
                          <rect x="84" y={typFloorH - 10} width="82" height="4" fill="#DDA752" />
                          <rect x="84" y={typFloorH - 22} width="82" height="12" fill="url(#adminElevBalconyGrad)" stroke="#7FB4D8" strokeWidth="1" />
                          {/* Vertical Glass Stanchions */}
                          <line x1="104" y1={typFloorH - 22} x2="104" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />
                          <line x1="124" y1={typFloorH - 22} x2="124" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />
                          <line x1="144" y1={typFloorH - 22} x2="144" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />
                        </g>

                        {/* Floor Badge on Building Facade */}
                        <g transform={`translate(${bldX + 10}, ${floorY + 12})`}>
                          <rect width="52" height="15" rx="3" fill="rgba(10, 14, 24, 0.85)" stroke="rgba(221, 167, 82, 0.5)" strokeWidth="0.8" />
                          <text x="26" y="11" fontSize="8" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
                            {floor.key}
                          </text>
                        </g>

                        {/* Right Floor Info Card */}
                        <g transform={`translate(${bldRight + 16}, ${floorY + (typFloorH - 32) / 2})`}>
                          <rect width="138" height="32" rx="6" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(221, 167, 82, 0.25)" strokeWidth="1" className="fp-elev-card-border" />
                          <text x="8" y="14" fontSize="9.5" fill="#FFFFFF" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">
                            {floor.key}
                          </text>
                          <text x="8" y="25" fontSize="8" fill="#DDA752" fontFamily="monospace" fontWeight="700">
                            {`${floor.sqm} m² • ${unitsCount} ${isAr ? 'شقق' : 'units'}`}
                          </text>
                          {isLinked && (
                            <text x="130" y="14" fontSize="7" fill="rgba(221, 167, 82, 0.7)" textAnchor="end" fontFamily="'Plus Jakarta Sans', sans-serif">
                              {isAr ? 'نموذج مكرر' : 'Linked'}
                            </text>
                          )}
                          <text x="130" y="25" fontSize="7.5" fill="rgba(255, 255, 255, 0.5)" textAnchor="end" fontFamily="'Plus Jakarta Sans', sans-serif">
                            {isAr ? 'عرض ‹' : 'Inspect ›'}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* ─── GROUND FLOOR & GRAND ENTRANCE PORTICO ─── */}
                  {hasGround && (
                    <g
                      role="button"
                      tabIndex={0}
                      className="fp-elev-floor-group"
                      style={{ cursor: 'pointer' }}
                      aria-label={`${isAr ? 'الدور الأرضي والمدخل' : 'Ground Floor & Lobby'} — ${floorSqm([...buildingModel.ground, ...buildingModel.others])} m²`}
                      onClick={() => {
                        setBldView({ mode: 'floor', floorKey: 'bld_ground' });
                        setSelectedZoneId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setBldView({ mode: 'floor', floorKey: 'bld_ground' });
                          setSelectedZoneId(null);
                        }
                      }}
                    >
                      {/* Ground Floor Base Box */}
                      <rect x={bldX} y={groundY} width={bldW} height={groundH} fill="url(#adminElevLobbyGrad)" stroke="none" className="fp-elev-floor-bg" />

                      {/* Floor Slab */}
                      <rect x={bldX - 4} y={groundY + groundH - 3} width={bldW + 8} height="4" fill="#DDA752" opacity="0.9" />

                      {/* Double-Height Glazing on Left and Right of Lobby */}
                      <rect x={bldX + 16} y={groundY + 8} width={130} height={groundH - 18} fill="url(#adminElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                      <line x1={bldX + 59} y1={groundY + 8} x2={bldX + 59} y2={groundY + groundH - 10} stroke="#7FB4D8" strokeWidth="1" />
                      <line x1={bldX + 102} y1={groundY + 8} x2={bldX + 102} y2={groundY + groundH - 10} stroke="#7FB4D8" strokeWidth="1" />

                      <rect x={bldRight - 146} y={groundY + 8} width={130} height={groundH - 18} fill="url(#adminElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                      <line x1={bldRight - 103} y1={groundY + 8} x2={bldRight - 103} y2={groundY + groundH - 10} stroke="#7FB4D8" strokeWidth="1" />
                      <line x1={bldRight - 60} y1={groundY + 8} x2={bldRight - 60} y2={groundY + groundH - 10} stroke="#7FB4D8" strokeWidth="1" />

                      {/* Grand Center Entrance Portico & Canopy */}
                      <g transform={`translate(${bldX + bldW / 2 - 55}, ${groundY})`}>
                        {/* Cantilevered Portico Canopy with Spotlights */}
                        <polygon points="-8,10 118,10 112,0 -2,0" fill="#DDA752" />
                        <line x1="-8" y1="10" x2="118" y2="10" stroke="#FFFFFF" strokeWidth="1" />
                        {/* Spotlights */}
                        <circle cx="20" cy="10" r="2" fill="#FFFFFF" />
                        <circle cx="55" cy="10" r="2" fill="#FFFFFF" />
                        <circle cx="90" cy="10" r="2" fill="#FFFFFF" />

                        {/* Glazed Double Entrance Doors */}
                        <rect x="15" y="10" width="80" height={groundH - 14} fill="url(#adminElevGlassGrad)" stroke="#DDA752" strokeWidth="1.5" />
                        <line x1="55" y1="10" x2="55" y2={groundH - 4} stroke="#DDA752" strokeWidth="1.5" />
                        {/* Brass Pull Handles */}
                        <line x1="51" y1={groundH / 2} x2="51" y2={groundH / 2 + 12} stroke="#DDA752" strokeWidth="2" />
                        <line x1="59" y1={groundH / 2} x2="59" y2={groundH / 2 + 12} stroke="#DDA752" strokeWidth="2" />

                        {/* Entrance Steps */}
                        <rect x="5" y={groundH - 4} width="100" height="4" fill="#DDA752" />
                      </g>

                      {/* Ground Floor Label */}
                      <g transform={`translate(${bldX + 10}, ${groundY + 12})`}>
                        <rect width="66" height="15" rx="3" fill="rgba(10, 14, 24, 0.85)" stroke="rgba(221, 167, 82, 0.5)" strokeWidth="0.8" />
                        <text x="33" y="11" fontSize="8" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
                          {isAr ? 'الأرضي' : 'GROUND'}
                        </text>
                      </g>

                      {/* Right Ground Info Card */}
                      <g transform={`translate(${bldRight + 16}, ${groundY + (groundH - 32) / 2})`}>
                        <rect width="138" height="32" rx="6" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(221, 167, 82, 0.25)" strokeWidth="1" className="fp-elev-card-border" />
                        <text x="8" y="14" fontSize="9.5" fill="#FFFFFF" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">
                          {isAr ? 'الدور الأرضي والمدخل' : 'Ground Floor & Lobby'}
                        </text>
                        <text x="8" y="25" fontSize="8" fill="#DDA752" fontFamily="monospace" fontWeight="700">
                          {`${floorSqm([...buildingModel.ground, ...buildingModel.others])} m²`}
                        </text>
                        <text x="130" y="25" fontSize="7.5" fill="rgba(255, 255, 255, 0.5)" textAnchor="end" fontFamily="'Plus Jakarta Sans', sans-serif">
                          {isAr ? 'عرض ‹' : 'Inspect ›'}
                        </text>
                      </g>
                    </g>
                  )}

                  {/* ─── BASEMENT & SUBTERRANEAN GARAGE ─── */}
                  {/* Ground Surface Datum Level Solid Line & Hatch */}
                  <rect x="0" y={groundBaseY} width="760" height="6" fill="url(#adminElevGroundHatch)" />
                  <line x1="0" y1={groundBaseY} x2="760" y2={groundBaseY} stroke="#DDA752" strokeWidth="2" />

                  {hasBasement && (
                    <g
                      role="button"
                      tabIndex={0}
                      className="fp-elev-floor-group"
                      style={{ cursor: 'pointer' }}
                      aria-label={`${isAr ? 'البدروم والجراج' : 'Basement Garage'} — ${floorSqm(buildingModel.basement)} m²`}
                      onClick={() => {
                        setBldView({ mode: 'floor', floorKey: 'bld_basement' });
                        setSelectedZoneId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setBldView({ mode: 'floor', floorKey: 'bld_basement' });
                          setSelectedZoneId(null);
                        }
                      }}
                    >
                      {/* Basement Retaining Walls & Box */}
                      <rect x={bldX} y={groundBaseY} width={bldW} height={basementH} fill="rgba(10, 14, 24, 0.9)" stroke="rgba(221, 167, 82, 0.3)" strokeDasharray="4 2" className="fp-elev-floor-bg" />

                      {/* Garage Vehicular Ramp Entrance */}
                      <g transform={`translate(${bldX + 24}, ${groundBaseY + 6})`}>
                        <polygon points="0,0 80,0 80,36 0,36" fill="rgba(221, 167, 82, 0.08)" stroke="#DDA752" strokeWidth="1" strokeDasharray="3 2" />
                        <line x1="0" y1="0" x2="80" y2="36" stroke="#DDA752" strokeWidth="1.5" />
                        <text x="40" y="22" fontSize="7.5" fill="#DDA752" textAnchor="middle" fontFamily="monospace" fontWeight="700">RAMP ↘ 15%</text>
                      </g>

                      {/* Parking Bays Grid Hints */}
                      {[140, 190, 240, 290, 340, 390].map(bx => (
                        <g key={`pbay-${bx}`} transform={`translate(${bldX + bx}, ${groundBaseY + 6})`}>
                          <rect width="40" height="36" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(221, 167, 82, 0.2)" strokeWidth="0.8" />
                          <text x="20" y="22" fontSize="7" fill="rgba(255, 255, 255, 0.4)" textAnchor="middle" fontFamily="monospace">P</text>
                        </g>
                      ))}

                      {/* Basement Floor Label */}
                      <g transform={`translate(${bldX + 10}, ${groundBaseY + 12})`}>
                        <rect width="66" height="15" rx="3" fill="rgba(10, 14, 24, 0.85)" stroke="rgba(221, 167, 82, 0.5)" strokeWidth="0.8" />
                        <text x="33" y="11" fontSize="8" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
                          {isAr ? 'البدروم' : 'BASEMENT'}
                        </text>
                      </g>

                      {/* Right Basement Info Card */}
                      <g transform={`translate(${bldRight + 16}, ${groundBaseY + (basementH - 32) / 2})`}>
                        <rect width="138" height="32" rx="6" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(221, 167, 82, 0.25)" strokeWidth="1" className="fp-elev-card-border" />
                        <text x="8" y="14" fontSize="9.5" fill="#FFFFFF" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">
                          {isAr ? 'البدروم والجراج' : 'Basement / Garage'}
                        </text>
                        <text x="8" y="25" fontSize="8" fill="#DDA752" fontFamily="monospace" fontWeight="700">
                          {`${floorSqm(buildingModel.basement)} m²`}
                        </text>
                        <text x="130" y="25" fontSize="7.5" fill="rgba(255, 255, 255, 0.5)" textAnchor="end" fontFamily="'Plus Jakarta Sans', sans-serif">
                          {isAr ? 'عرض ‹' : 'Inspect ›'}
                        </text>
                      </g>
                    </g>
                  )}
                </svg>
              );
            })() : propertyType === 'building' && bldView.mode === 'floor' && buildingModel ? (() => {
              const floorKey = bldView.floorKey;
              const isGround = floorKey === 'bld_ground' || floorKey === 'Ground Floor';
              const isRoof = floorKey === 'bld_roof' || floorKey === 'Roof';
              const isBasement = floorKey === 'bld_basement' || floorKey === 'Basement';
              const currentFloor = buildingModel.floors.find(f => f.key === floorKey) || buildingModel.floors[0];
              const unitsOnFloor = currentFloor?.units || buildingModel.units.slice(0, 2);
              const flatA = unitsOnFloor[0];
              const flatB = unitsOnFloor[1];
              const floorTitle = isGround
                ? (isAr ? 'الدور الأرضي والمدخل الرئيسي' : 'Ground Floor & Grand Entrance')
                : isRoof
                  ? (isAr ? 'السطح والتراس البانورامي' : 'Rooftop Sky Terrace & Mechanical')
                  : isBasement
                    ? (isAr ? 'البدروم ومواقف السيارات' : 'Basement Secure Parking & Utilities')
                    : `${floorKey} (Typical Residential Plate)`;
              const totalSqm = isGround
                ? floorSqm([...buildingModel.ground, ...buildingModel.others])
                : isRoof
                  ? floorSqm(buildingModel.roof)
                  : isBasement
                    ? floorSqm(buildingModel.basement)
                    : currentFloor?.sqm || 412;

              return (
                <svg
                  key={viewAnimKey}
                  ref={svgRef}
                  viewBox="0 0 740 480"
                  className="fp-canvas-svg fp-floor-plate fp-view-animated"
                  style={{ direction: 'ltr' }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="adminCadGrid" width="12" height="12" patternUnits="userSpaceOnUse">
                      <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(221, 167, 82, 0.08)" strokeWidth="0.5" />
                    </pattern>
                    <pattern id="adminCadGridMajor" width="60" height="60" patternUnits="userSpaceOnUse">
                      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(221, 167, 82, 0.14)" strokeWidth="0.8" />
                    </pattern>
                    <pattern id="adminParquetPattern" width="16" height="16" patternUnits="userSpaceOnUse">
                      <path d="M 0 0 L 8 8 M 8 0 L 16 8 M 0 8 L 8 16 M 8 8 L 16 16" fill="none" stroke="rgba(221, 167, 82, 0.15)" strokeWidth="0.8" />
                      <rect width="16" height="16" fill="rgba(221, 167, 82, 0.025)" />
                    </pattern>
                    <pattern id="adminTilePattern" width="14" height="14" patternUnits="userSpaceOnUse">
                      <rect width="14" height="14" fill="rgba(127, 180, 216, 0.02)" stroke="rgba(127, 180, 216, 0.15)" strokeWidth="0.6" />
                    </pattern>
                    <pattern id="adminDeckPattern" width="8" height="16" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="8" y2="0" stroke="rgba(221, 167, 82, 0.25)" strokeWidth="0.8" />
                      <rect width="8" height="16" fill="rgba(221, 167, 82, 0.03)" />
                    </pattern>
                    <pattern id="adminBedPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                      <circle cx="5" cy="5" r="0.8" fill="rgba(221, 167, 82, 0.15)" />
                      <rect width="10" height="10" fill="rgba(255, 255, 255, 0.015)" />
                    </pattern>
                    <pattern id="adminColumnHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#DDA752" strokeWidth="1.2" />
                    </pattern>
                    <linearGradient id="adminElevLobbyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(221, 167, 82, 0.2)" />
                      <stop offset="100%" stopColor="rgba(221, 167, 82, 0.03)" />
                    </linearGradient>
                    <linearGradient id="adminElevBalconyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(127, 180, 216, 0.28)" />
                      <stop offset="100%" stopColor="rgba(127, 180, 216, 0.06)" />
                    </linearGradient>
                    <filter id="adminGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#DDA752" floodOpacity="0.8" />
                    </filter>
                  </defs>

                  {/* Blueprint Grid */}
                  <rect width="740" height="480" fill="url(#adminCadGrid)" />
                  <rect width="740" height="480" fill="url(#adminCadGridMajor)" opacity="0.4" />

                  {/* Dimension Leader Lines (Top: Width 24.00m, Left: Depth 16.00m) */}
                  <g className="fp-dimension-leaders" opacity="0.85">
                    {/* Top Width */}
                    <line x1="64" y1="36" x2="676" y2="36" stroke="#DDA752" strokeWidth="1" />
                    <line x1="64" y1="30" x2="64" y2="46" stroke="#DDA752" strokeWidth="1.5" />
                    <line x1="676" y1="30" x2="676" y2="46" stroke="#DDA752" strokeWidth="1.5" />
                    <rect x="320" y="26" width="100" height="18" rx="4" fill="rgba(10,14,24,0.85)" stroke="rgba(221,167,82,0.3)" strokeWidth="0.8" />
                    <text x="370" y="38" fontSize="8.5" fill="#DDA752" textAnchor="middle" fontFamily="monospace" fontWeight="700">24.00 m</text>

                    {/* Left Depth */}
                    <line x1="36" y1="56" x2="36" y2="424" stroke="#DDA752" strokeWidth="1" />
                    <line x1="30" y1="56" x2="46" y2="56" stroke="#DDA752" strokeWidth="1.5" />
                    <line x1="30" y1="424" x2="46" y2="424" stroke="#DDA752" strokeWidth="1.5" />
                    <rect x="18" y="230" width="36" height="18" rx="4" fill="rgba(10,14,24,0.85)" stroke="rgba(221,167,82,0.3)" strokeWidth="0.8" />
                    <text x="36" y="242" fontSize="8" fill="#DDA752" textAnchor="middle" fontFamily="monospace" fontWeight="700">16.00m</text>
                  </g>

                  {/* Exterior Insulated Double Structural Walls */}
                  <rect x="64" y="56" width="612" height="368" fill="none" stroke="#DDA752" strokeWidth="4" />
                  <rect x="68" y="60" width="604" height="360" fill="none" stroke="rgba(221, 167, 82, 0.4)" strokeWidth="1" />

                  {/* Corner & Grid Concrete Reinforced Columns */}
                  {[
                    [64, 56], [320, 56], [420, 56], [676, 56],
                    [64, 240], [676, 240],
                    [64, 424], [320, 424], [420, 424], [676, 424]
                  ].map(([cx, cy], i) => (
                    <rect key={`col-${i}`} x={cx - 6} y={cy - 6} width="12" height="12" fill="url(#adminColumnHatch)" stroke="#DDA752" strokeWidth="1.2" />
                  ))}

                  {/* ─── GROUND FLOOR PLATE (Authentic Middle-Class Egyptian Blueprint) ─── */}
                  {isGround && (
                    <g className="fp-ground-plate">
                      {/* Grand Lobby Marble Floor */}
                      <rect x="70" y="62" width="600" height="356" fill="url(#adminTilePattern)" />

                      {/* Main Revolving Double Entrance Doors & Gate */}
                      <g transform="translate(370, 424)">
                        <circle cx="0" cy="0" r="22" fill="rgba(10,14,24,0.9)" stroke="#DDA752" strokeWidth="1.5" />
                        <line x1="-22" y1="0" x2="22" y2="0" stroke="#DDA752" strokeWidth="1.5" />
                        <line x1="0" y1="-22" x2="0" y2="22" stroke="#DDA752" strokeWidth="1.5" />
                        <text x="0" y="32" fontSize="8" fill="#DDA752" textAnchor="middle" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">MAIN ENTRANCE GATE & FENCE</text>
                      </g>

                      {/* Concierge & Security Guard Booth */}
                      <g transform="translate(320, 310)">
                        <path d="M 0 0 C 30 -15, 70 -15, 100 0 L 90 24 C 65 14, 35 14, 10 24 Z" fill="rgba(221,167,82,0.2)" stroke="#DDA752" strokeWidth="1.5" />
                        <circle cx="50" cy="8" r="4" fill="#DDA752" />
                        <text x="50" y="40" fontSize="8.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">GUARD & SECURITY BOOTH</text>
                      </g>

                      {/* Central Elevator Bank */}
                      <g transform="translate(330, 80)">
                        <rect width="80" height="74" fill="rgba(10,14,24,0.95)" stroke="#DDA752" strokeWidth="2" />
                        <line x1="0" y1="0" x2="80" y2="74" stroke="rgba(221,167,82,0.4)" />
                        <line x1="80" y1="0" x2="0" y2="74" stroke="rgba(221,167,82,0.4)" />
                        <rect x="10" y="10" width="60" height="54" rx="2" fill="rgba(221,167,82,0.15)" stroke="#DDA752" strokeWidth="1" />
                        <text x="40" y="42" fontSize="9" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="monospace">ELEVATOR</text>
                      </g>

                      {/* Main Building Staircase */}
                      <g transform="translate(330, 160)">
                        <rect width="80" height="100" fill="rgba(13,18,32,0.95)" stroke="#DDA752" strokeWidth="2" />
                        {[10, 24, 38, 52, 66, 80, 94].map(ty => (
                          <line key={`gstair-${ty}`} x1="0" y1={ty} x2="80" y2={ty} stroke="rgba(221,167,82,0.4)" strokeWidth="1" />
                        ))}
                        <line x1="40" y1="6" x2="40" y2="94" stroke="#DDA752" strokeWidth="1.5" />
                        <text x="40" y="55" fontSize="7.5" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="monospace">STAIRCASE ↗</text>
                      </g>

                      {/* Left Wing Top: Ground Garage / 2-Car Private Bays */}
                      <g transform="translate(80, 80)">
                        <rect width="220" height="160" fill="rgba(221,167,82,0.04)" stroke="rgba(221,167,82,0.4)" strokeWidth="1.5" />
                        <line x1="110" y1="0" x2="110" y2="160" stroke="rgba(221,167,82,0.3)" strokeDasharray="4 3" />
                        <text x="55" y="80" fontSize="9" fill="#FFFFFF" textAnchor="middle" fontWeight="700">BAY P-01</text>
                        <text x="165" y="80" fontSize="9" fill="#FFFFFF" textAnchor="middle" fontWeight="700">BAY P-02</text>
                        <text x="110" y="140" fontSize="8.5" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">GROUND GARAGE & PARKING</text>
                      </g>

                      {/* Left Wing Bottom: Water Motors & Pumps Box */}
                      <g transform="translate(80, 260)">
                        <rect width="100" height="150" fill="rgba(127,180,216,0.05)" stroke="rgba(127,180,216,0.5)" strokeWidth="1.5" strokeDasharray="4 2" />
                        <circle cx="50" cy="50" r="18" fill="rgba(127,180,216,0.15)" stroke="#7FB4D8" strokeWidth="1.5" />
                        <circle cx="50" cy="95" r="18" fill="rgba(127,180,216,0.15)" stroke="#7FB4D8" strokeWidth="1.5" />
                        <text x="50" y="132" fontSize="7.5" fill="#7FB4D8" textAnchor="middle" fontWeight="800" fontFamily="monospace">WATER PUMPS BOX</text>
                      </g>

                      {/* Left Wing Bottom: Electric Board & Meters Room */}
                      <g transform="translate(190, 260)">
                        <rect width="110" height="150" fill="rgba(221,167,82,0.06)" stroke="rgba(221,167,82,0.5)" strokeWidth="1.5" strokeDasharray="4 2" />
                        <rect x="20" y="30" width="70" height="50" fill="rgba(221,167,82,0.12)" stroke="#DDA752" strokeWidth="1" />
                        <text x="55" y="60" fontSize="8" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="monospace">⚡ METERS</text>
                        <text x="55" y="132" fontSize="7.5" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">ELECTRIC BOARD</text>
                      </g>

                      {/* Right Wing Top: Commercial Shop / Retail Store */}
                      <g transform="translate(440, 80)">
                        <rect width="220" height="200" fill="rgba(221,167,82,0.05)" stroke="rgba(221,167,82,0.4)" strokeWidth="1.5" />
                        <rect x="15" y="15" width="190" height="30" fill="rgba(221,167,82,0.08)" stroke="#DDA752" strokeWidth="1" />
                        <text x="110" y="34" fontSize="8.5" fill="#DDA752" textAnchor="middle" fontWeight="800">STORE FRONT GLASS</text>
                        <text x="110" y="110" fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="700">COMMERCIAL SHOP / RETAIL</text>
                        <text x="110" y="126" fontSize="8.5" fill="#DDA752" textAnchor="middle" fontFamily="monospace">44.0 m²</text>
                      </g>

                      {/* Right Wing Bottom: Building Facility / Storage */}
                      <g transform="translate(440, 300)">
                        <rect width="220" height="110" fill="rgba(221,167,82,0.03)" stroke="rgba(221,167,82,0.3)" strokeWidth="1.5" />
                        <text x="110" y="60" fontSize="9.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700">BUILDING SERVICES & STORAGE</text>
                        <text x="110" y="76" fontSize="8.5" fill="#DDA752" textAnchor="middle" fontFamily="monospace">24.0 m²</text>
                      </g>
                    </g>
                  )}

                  {/* ─── ROOFTOP SKY TERRACE PLATE ─── */}
                  {isRoof && (
                    <g className="fp-roof-plate">
                      {/* Rooftop Wooden Deck Planking */}
                      <rect x="70" y="62" width="600" height="356" fill="url(#adminDeckPattern)" />

                      {/* Left Rooftop Modern Pergola */}
                      <g transform="translate(90, 90)">
                        <rect width="210" height="230" fill="rgba(221,167,82,0.06)" stroke="#DDA752" strokeWidth="1.5" />
                        {[30, 60, 90, 120, 150, 180].map(px => (
                          <line key={`r-perg-${px}`} x1={px} y1="0" x2={px} y2="230" stroke="rgba(221,167,82,0.3)" strokeWidth="1.5" />
                        ))}
                        <text x="105" y="120" fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="700">PANORAMIC PERGOLA & LOUNGE</text>
                        <text x="105" y="136" fontSize="8.5" fill="#DDA752" textAnchor="middle" fontFamily="monospace">84.0 m²</text>
                      </g>

                      {/* Center Elevator Penthouse & Stairwell */}
                      <g transform="translate(330, 80)">
                        <rect width="80" height="110" rx="2" fill="rgba(10,14,24,0.95)" stroke="#DDA752" strokeWidth="2" />
                        <text x="40" y="55" fontSize="8.5" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">ELEVATOR PENTHOUSE</text>
                        <line x1="30" y1="110" x2="50" y2="110" stroke="#DDA752" strokeWidth="3" />
                      </g>

                      {/* Right Rooftop Water Storage & Solar */}
                      <g transform="translate(440, 90)">
                        <rect width="210" height="230" fill="rgba(127,180,216,0.04)" stroke="rgba(127,180,216,0.4)" strokeWidth="1.5" />
                        <circle cx="60" cy="70" r="28" fill="rgba(127,180,216,0.15)" stroke="#7FB4D8" strokeWidth="1.5" />
                        <circle cx="150" cy="70" r="28" fill="rgba(127,180,216,0.15)" stroke="#7FB4D8" strokeWidth="1.5" />
                        <line x1="60" y1="70" x2="150" y2="70" stroke="#7FB4D8" strokeWidth="2" />
                        <text x="105" y="130" fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="700">WATER TANKS & SOLAR ARRAY</text>
                        <text x="105" y="146" fontSize="8.5" fill="#7FB4D8" textAnchor="middle" fontFamily="monospace">Dual 5000L Tanks</text>
                      </g>

                      {/* Glass Balustrade Perimeter */}
                      <rect x="70" y="62" width="600" height="356" fill="none" stroke="#7FB4D8" strokeWidth="1.5" strokeDasharray="6 3" />
                    </g>
                  )}

                  {/* ─── BASEMENT SECURE PARKING PLATE ─── */}
                  {isBasement && (
                    <g className="fp-basement-plate">
                      {/* Underground Floor */}
                      <rect x="70" y="62" width="600" height="356" fill="rgba(10,14,24,0.6)" />

                      {/* Ramp Entry on Left */}
                      <g transform="translate(70, 70)">
                        <polygon points="0,0 80,0 80,140 0,140" fill="rgba(221,167,82,0.1)" stroke="#DDA752" strokeWidth="1.5" />
                        <text x="40" y="70" fontSize="9" fill="#DDA752" textAnchor="middle" fontWeight="700" fontFamily="monospace">RAMP ↘ 15%</text>
                      </g>

                      {/* 2-Way Traffic Central Lane */}
                      <line x1="160" y1="240" x2="660" y2="240" stroke="#DDA752" strokeWidth="2" strokeDasharray="10 8" />
                      <text x="360" y="232" fontSize="9" fill="#DDA752" fontWeight="700">TRAFFIC CIRCULATION LANE ↑ ↓</text>

                      {/* Numbered Parking Bays (Top Row P-01..P-06, Bottom Row P-07..P-12) */}
                      {[180, 260, 340, 420, 500, 580].map((bx, i) => (
                        <g key={`bay-top-${i}`}>
                          <rect x={bx} y="70" width="70" height="130" fill="rgba(255,255,255,0.02)" stroke="rgba(221,167,82,0.4)" strokeWidth="1" strokeDasharray="4 2" />
                          <text x={bx + 35} y="135" fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="800" fontFamily="monospace">{`P-0${i + 1}`}</text>
                        </g>
                      ))}
                      {[180, 260, 340, 420, 500, 580].map((bx, i) => (
                        <g key={`bay-bot-${i}`}>
                          <rect x={bx} y="280" width="70" height="130" fill="rgba(255,255,255,0.02)" stroke="rgba(221,167,82,0.4)" strokeWidth="1" strokeDasharray="4 2" />
                          <text x={bx + 35} y="345" fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="800" fontFamily="monospace">{`P-${i + 7 < 10 ? '0' : ''}${i + 7}`}</text>
                        </g>
                      ))}
                    </g>
                  )}

                  {/* ─── TYPICAL RESIDENTIAL FLOOR PLATE (Floor 1, Floor 2, Floor 3...) ─── */}
                  {!isGround && !isRoof && !isBasement && (
                    <g className="fp-typical-plate">
                      {/* ── CENTRAL BUILDING CORE (x = 320 to 420, y = 56 to 424) ── */}
                      <rect x="320" y="56" width="100" height="368" fill="rgba(10,14,24,0.92)" stroke="#DDA752" strokeWidth="2.5" />

                      {/* Elevator Shaft */}
                      <g transform="translate(330, 68)">
                        <rect width="80" height="74" fill="rgba(13,18,32,0.95)" stroke="#DDA752" strokeWidth="2" />
                        <line x1="0" y1="0" x2="80" y2="74" stroke="rgba(221,167,82,0.4)" />
                        <line x1="80" y1="0" x2="0" y2="74" stroke="rgba(221,167,82,0.4)" />
                        <rect x="10" y="10" width="60" height="54" rx="2" fill="rgba(221,167,82,0.15)" stroke="#DDA752" strokeWidth="1" />
                        <text x="40" y="38" fontSize="8" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="monospace">ELEVATOR</text>
                        <text x="40" y="50" fontSize="7" fill="rgba(255,255,255,0.7)" textAnchor="middle">8 Persons</text>
                        <line x1="24" y1="74" x2="56" y2="74" stroke="#DDA752" strokeWidth="3" />
                      </g>

                      {/* Fire Escape Stairwell */}
                      <g transform="translate(330, 154)">
                        <rect width="80" height="110" fill="rgba(13,18,32,0.95)" stroke="#DDA752" strokeWidth="2" />
                        {[8, 20, 32, 44, 56, 68, 80, 92, 104].map(ty => (
                          <line key={`tread-${ty}`} x1="0" y1={ty} x2="80" y2={ty} stroke="rgba(221,167,82,0.4)" strokeWidth="1" />
                        ))}
                        <line x1="40" y1="6" x2="40" y2="104" stroke="#DDA752" strokeWidth="1.5" />
                        {/* Direction Arrow */}
                        <path d="M 20 95 L 20 20 L 15 28 M 20 20 L 25 28" fill="none" stroke="#DDA752" strokeWidth="1.5" />
                        <text x="60" y="60" fontSize="7.5" fill="#DDA752" fontWeight="800" fontFamily="monospace">UP ↗</text>
                      </g>

                      {/* MEP / Service Utility Shaft */}
                      <g transform="translate(330, 274)">
                        <rect width="80" height="38" fill="rgba(221,167,82,0.06)" stroke="rgba(221,167,82,0.5)" strokeDasharray="4 2" />
                        <text x="40" y="22" fontSize="7.5" fill="rgba(221,167,82,0.85)" textAnchor="middle" fontWeight="700" fontFamily="monospace">MEP RISER</text>
                      </g>

                      {/* Central Distribution Lobby Corridor */}
                      <g transform="translate(320, 320)">
                        <rect width="100" height="104" fill="url(#adminElevLobbyGrad)" />
                        <text x="50" y="58" fontSize="8" fill="#FFFFFF" textAnchor="middle" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">CENTRAL CORRIDOR</text>
                        {/* Door Leaf to Flat A */}
                        <path d="M 0 36 A 24 24 0 0 1 -24 60" fill="none" stroke="#DDA752" strokeWidth="1.5" strokeDasharray="3 2" />
                        <line x1="0" y1="36" x2="-24" y2="36" stroke="#DDA752" strokeWidth="2" />
                        {/* Door Leaf to Flat B */}
                        <path d="M 100 36 A 24 24 0 0 0 124 60" fill="none" stroke="#DDA752" strokeWidth="1.5" strokeDasharray="3 2" />
                        <line x1="100" y1="36" x2="124" y2="36" stroke="#DDA752" strokeWidth="2" />
                      </g>

                      {/* ── FLAT A SUITE BAY (Left: x = 68 to 320, y = 60 to 420) ── */}
                      <g
                        role="button"
                        tabIndex={0}
                        className="fp-elev-floor-group"
                        style={{ cursor: 'pointer' }}
                        aria-label={`${flatA?.instance_label || 'Flat A'} — Click to drill into flat floor plan`}
                        onClick={() => {
                          if (flatA) {
                            setBldView({ mode: 'unit', floorKey: bldView.floorKey, unitId: flatA.id });
                            setSelectedZoneId(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (flatA) {
                              setBldView({ mode: 'unit', floorKey: bldView.floorKey, unitId: flatA.id });
                              setSelectedZoneId(null);
                            }
                          }
                        }}
                      >
                        {/* Suite Boundary & Hover Highlight */}
                        <rect x="68" y="60" width="252" height="360" fill="rgba(255,255,255,0.01)" className="fp-elev-floor-bg" />

                        {/* Living / Reception Room */}
                        <rect x="170" y="210" width="150" height="210" fill="url(#adminParquetPattern)" stroke="#DDA752" strokeWidth="1.5" />
                        {/* Sofa Lounge outline */}
                        <rect x="190" y="340" width="70" height="24" rx="3" fill="rgba(221,167,82,0.12)" stroke="rgba(221,167,82,0.6)" strokeWidth="1" />
                        <circle cx="225" cy="315" r="10" fill="rgba(221,167,82,0.15)" stroke="rgba(221,167,82,0.6)" strokeWidth="1" />
                        <text x="245" y="250" fontSize="9" fill="#FFFFFF" textAnchor="middle" fontWeight="700">Grand Reception</text>
                        <text x="245" y="264" fontSize="8" fill="#DDA752" textAnchor="middle" fontFamily="monospace">68.0 m²</text>

                        {/* Master Bedroom Suite */}
                        <rect x="68" y="60" width="112" height="150" fill="url(#adminBedPattern)" stroke="#DDA752" strokeWidth="1.5" />
                        <rect x="90" y="74" width="46" height="50" rx="2" fill="rgba(221,167,82,0.12)" stroke="rgba(221,167,82,0.6)" strokeWidth="1" />
                        <text x="124" y="145" fontSize="8.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700">Master Suite</text>

                        {/* Standard Bedroom */}
                        <rect x="180" y="60" width="140" height="150" fill="url(#adminBedPattern)" stroke="#DDA752" strokeWidth="1.5" />
                        <rect x="230" y="74" width="40" height="46" rx="2" fill="rgba(221,167,82,0.12)" stroke="rgba(221,167,82,0.6)" strokeWidth="1" />
                        <text x="250" y="145" fontSize="8.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700">Guest Bedroom</text>

                        {/* Designer Kitchen */}
                        <rect x="68" y="210" width="102" height="100" fill="url(#adminTilePattern)" stroke="#DDA752" strokeWidth="1.5" />
                        <text x="119" y="260" fontSize="8.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700">Kitchen</text>

                        {/* Main Bathroom */}
                        <rect x="68" y="310" width="102" height="110" fill="url(#adminTilePattern)" stroke="#DDA752" strokeWidth="1.5" />
                        <text x="119" y="365" fontSize="8.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700">Main Bath</text>

                        {/* Cantilevered Balcony (Projects out on Left) */}
                        <rect x="36" y="140" width="28" height="140" fill="url(#adminDeckPattern)" stroke="#7FB4D8" strokeWidth="1.5" />
                        <text x="50" y="215" fontSize="7.5" fill="#7FB4D8" textAnchor="middle" fontWeight="700" transform="rotate(-90 50 215)">BALCONY</text>

                        {/* Flat A Floating Action Card */}
                        <g transform="translate(80, 72)">
                          <rect width="136" height="28" rx="6" fill="rgba(10,14,24,0.9)" stroke="#DDA752" strokeWidth="1.2" filter="url(#adminGoldGlow)" />
                          <text x="8" y="14" fontSize="9" fill="#FFFFFF" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
                            {flatA?.instance_label || 'Flat 1A'}
                          </text>
                          <text x="128" y="14" fontSize="8.5" fill="#DDA752" textAnchor="end" fontFamily="monospace" fontWeight="700">
                            {`${flatA?.spatial?.sqm || 206} m²`}
                          </text>
                          <text x="8" y="23" fontSize="7" fill="rgba(221,167,82,0.85)" fontFamily="'Plus Jakarta Sans', sans-serif">
                            {isAr ? 'انقر لتعديل مخطط الشقة ‹' : 'Click to edit unit plan ›'}
                          </text>
                        </g>
                      </g>

                      {/* ── FLAT B SUITE BAY (Right: x = 420 to 672, y = 60 to 420) ── */}
                      <g
                        role="button"
                        tabIndex={0}
                        className="fp-elev-floor-group"
                        style={{ cursor: 'pointer' }}
                        aria-label={`${flatB?.instance_label || 'Flat B'} — Click to drill into flat floor plan`}
                        onClick={() => {
                          if (flatB) {
                            setBldView({ mode: 'unit', floorKey: bldView.floorKey, unitId: flatB.id });
                            setSelectedZoneId(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (flatB) {
                              setBldView({ mode: 'unit', floorKey: bldView.floorKey, unitId: flatB.id });
                              setSelectedZoneId(null);
                            }
                          }
                        }}
                      >
                        {/* Suite Boundary & Hover Highlight */}
                        <rect x="420" y="60" width="252" height="360" fill="rgba(255,255,255,0.01)" className="fp-elev-floor-bg" />

                        {/* Living / Reception Room */}
                        <rect x="420" y="210" width="150" height="210" fill="url(#adminParquetPattern)" stroke="#DDA752" strokeWidth="1.5" />
                        <rect x="480" y="340" width="70" height="24" rx="3" fill="rgba(221,167,82,0.12)" stroke="rgba(221,167,82,0.6)" strokeWidth="1" />
                        <circle cx="515" cy="315" r="10" fill="rgba(221,167,82,0.15)" stroke="rgba(221,167,82,0.6)" strokeWidth="1" />
                        <text x="495" y="250" fontSize="9" fill="#FFFFFF" textAnchor="middle" fontWeight="700">Grand Reception</text>
                        <text x="495" y="264" fontSize="8" fill="#DDA752" textAnchor="middle" fontFamily="monospace">68.0 m²</text>

                        {/* Master Bedroom Suite */}
                        <rect x="560" y="60" width="112" height="150" fill="url(#adminBedPattern)" stroke="#DDA752" strokeWidth="1.5" />
                        <rect x="604" y="74" width="46" height="50" rx="2" fill="rgba(221,167,82,0.12)" stroke="rgba(221,167,82,0.6)" strokeWidth="1" />
                        <text x="616" y="145" fontSize="8.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700">Master Suite</text>

                        {/* Standard Bedroom */}
                        <rect x="420" y="60" width="140" height="150" fill="url(#adminBedPattern)" stroke="#DDA752" strokeWidth="1.5" />
                        <rect x="470" y="74" width="40" height="46" rx="2" fill="rgba(221,167,82,0.12)" stroke="rgba(221,167,82,0.6)" strokeWidth="1" />
                        <text x="490" y="145" fontSize="8.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700">Guest Bedroom</text>

                        {/* Designer Kitchen */}
                        <rect x="570" y="210" width="102" height="100" fill="url(#adminTilePattern)" stroke="#DDA752" strokeWidth="1.5" />
                        <text x="621" y="260" fontSize="8.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700">Kitchen</text>

                        {/* Main Bathroom */}
                        <rect x="570" y="310" width="102" height="110" fill="url(#adminTilePattern)" stroke="#DDA752" strokeWidth="1.5" />
                        <text x="621" y="365" fontSize="8.5" fill="#FFFFFF" textAnchor="middle" fontWeight="700">Main Bath</text>

                        {/* Cantilevered Balcony (Projects out on Right) */}
                        <rect x="676" y="140" width="28" height="140" fill="url(#adminDeckPattern)" stroke="#7FB4D8" strokeWidth="1.5" />
                        <text x="690" y="215" fontSize="7.5" fill="#7FB4D8" textAnchor="middle" fontWeight="700" transform="rotate(90 690 215)">BALCONY</text>

                        {/* Flat B Floating Action Card */}
                        <g transform="translate(524, 72)">
                          <rect width="136" height="28" rx="6" fill="rgba(10,14,24,0.9)" stroke="#DDA752" strokeWidth="1.2" filter="url(#adminGoldGlow)" />
                          <text x="8" y="14" fontSize="9" fill="#FFFFFF" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
                            {flatB?.instance_label || 'Flat 1B'}
                          </text>
                          <text x="128" y="14" fontSize="8.5" fill="#DDA752" textAnchor="end" fontFamily="monospace" fontWeight="700">
                            {`${flatB?.spatial?.sqm || 206} m²`}
                          </text>
                          <text x="8" y="23" fontSize="7" fill="rgba(221,167,82,0.85)" fontFamily="'Plus Jakarta Sans', sans-serif">
                            {isAr ? 'انقر لتعديل مخطط الشقة ‹' : 'Click to edit unit plan ›'}
                          </text>
                        </g>
                      </g>
                    </g>
                  )}

                  {/* ── ARCHITECTURAL TITLE BLOCK & NORTH ARROW ── */}
                  {/* North Arrow */}
                  <g transform="translate(696, 26)">
                    <circle cx="16" cy="16" r="14" fill="rgba(10,14,24,0.8)" stroke="#DDA752" strokeWidth="1" />
                    <polygon points="16,5 21,24 16,20 11,24" fill="#DDA752" />
                    <text x="16" y="2" fontSize="8" fill="#DDA752" textAnchor="middle" fontWeight="900" fontFamily="'Plus Jakarta Sans', sans-serif">N</text>
                  </g>

                  {/* Title Block Stamp */}
                  <g transform="translate(420, 440)">
                    <rect width="256" height="26" rx="4" fill="rgba(10,14,24,0.85)" stroke="rgba(221,167,82,0.3)" strokeWidth="0.8" />
                    <text x="8" y="12" fontSize="8" fill="#FFFFFF" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">
                      {floorTitle}
                    </text>
                    <text x="8" y="21" fontSize="7" fill="#DDA752" fontFamily="monospace">
                      {`TOTAL PLATE: ${totalSqm} m² • SCALE 1:100`}
                    </text>
                  </g>
                </svg>
              );
            })() : previewSlots.length > 0 ? (() => {
              const minX = Math.min(...previewSlots.map(s => s.x));
              const maxX = Math.max(...previewSlots.map(s => s.x + s.w));
              const minY = Math.min(...previewSlots.map(s => s.y));
              const maxY = Math.max(...previewSlots.map(s => s.y + s.h));
              const totalWidthM = ((maxX - minX) / (metricLayout.pxPerMeter || 1)).toFixed(2);
              const totalDepthM = ((maxY - minY) / (metricLayout.pxPerMeter || 1)).toFixed(2);

              // Envelope is calculated strictly for indoor conditioned rooms (balcony/terrace projects OUTSIDE)
              const indoorSlots = previewSlots.filter(s => {
                const tid = s.zone.zone_template_id;
                return !tid.includes('balcony') && !tid.includes('terrace');
              });
              const slotsForEnvelope = indoorSlots.length > 0 ? indoorSlots : previewSlots;
              const envMinX = Math.min(...slotsForEnvelope.map(s => s.x));
              const envMaxX = Math.max(...slotsForEnvelope.map(s => s.x + s.w));
              const envMinY = Math.min(...slotsForEnvelope.map(s => s.y));
              const envMaxY = Math.max(...slotsForEnvelope.map(s => s.y + s.h));

              return (
                <svg
                  key={viewAnimKey}
                  ref={svgRef}
                  viewBox="0 0 680 440"
                  className="fp-canvas-svg fp-flat-plan fp-view-animated"
                  style={{ direction: 'ltr', cursor: isPanningCanvas ? 'grabbing' : 'default' }}
                  xmlns="http://www.w3.org/2000/svg"
                  onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY < 0 ? 0.15 : -0.15;
                    setCanvasZoom(z => Math.max(0.5, Math.min(3.0, round1(z + delta))));
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (suppressCanvasClickRef.current) return;
                    setSelectedZoneId(null);
                    setComposerTool('select');
                    setActiveOpeningHover(null);
                  }}
                  onClick={() => {
                    if (suppressCanvasClickRef.current) return;
                    setSelectedZoneId(null);
                    setComposerTool('select');
                    setActiveOpeningHover(null);
                  }}
                >
                  <defs>
                    <pattern id="adminCadGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(221, 167, 82, 0.08)" strokeWidth="0.4" />
                    </pattern>
                    <pattern id="adminCadGridMajor" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(221, 167, 82, 0.15)" strokeWidth="0.8" />
                    </pattern>
                    <pattern id="adminParquetPattern" width="16" height="16" patternUnits="userSpaceOnUse">
                      <path d="M 0 0 L 8 8 M 8 0 L 16 8 M 0 8 L 8 16 M 8 8 L 16 16" fill="none" stroke="rgba(221, 167, 82, 0.14)" strokeWidth="0.8" />
                      <rect width="16" height="16" fill="rgba(221, 167, 82, 0.02)" />
                    </pattern>
                    <pattern id="adminTilePattern" width="12" height="12" patternUnits="userSpaceOnUse">
                      <rect width="12" height="12" fill="rgba(127, 180, 216, 0.02)" stroke="rgba(127, 180, 216, 0.14)" strokeWidth="0.6" />
                    </pattern>
                    <pattern id="adminDeckPattern" width="8" height="16" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="8" y2="0" stroke="rgba(221, 167, 82, 0.25)" strokeWidth="0.8" />
                      <rect width="8" height="16" fill="rgba(221, 167, 82, 0.03)" />
                    </pattern>
                    <pattern id="adminBedPattern" width="10" height="10" patternUnits="userSpaceOnUse">
                      <circle cx="5" cy="5" r="0.8" fill="rgba(221, 167, 82, 0.15)" />
                      <rect width="10" height="10" fill="rgba(255, 255, 255, 0.015)" />
                    </pattern>
                    <pattern id="adminColumnHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#DDA752" strokeWidth="1.2" />
                    </pattern>
                    <filter id="adminGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#DDA752" floodOpacity="0.8" />
                    </filter>
                  </defs>

                  {/* Blueprint Grid & Background (Click or drag to pan) */}
                  <g
                    className="fp-canvas-bg-layer"
                    style={{ cursor: composerTool !== 'select' ? 'crosshair' : isPanningCanvas ? 'grabbing' : 'grab' }}
                    onPointerDown={handleCanvasBgPointerDown}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (suppressCanvasClickRef.current) return;
                      setSelectedZoneId(null);
                      setComposerTool('select');
                      setActiveOpeningHover(null);
                    }}
                    onClick={() => {
                      if (suppressCanvasClickRef.current) return;
                      setSelectedZoneId(null);
                      setComposerTool('select');
                      setActiveOpeningHover(null);
                    }}
                  >
                    <rect width="680" height="440" fill="url(#adminCadGrid)" pointerEvents="all" />
                    <rect width="680" height="440" fill="url(#adminCadGridMajor)" opacity="0.4" pointerEvents="all" />
                  </g>

                  {/* ── Scalable & Pannable CAD Workspace Group ── */}
                  <g
                    transform={`translate(${canvasPan.x}, ${canvasPan.y}) scale(${canvasZoom})`}
                    style={{
                      transformOrigin: '340px 220px',
                      transition: isPanningCanvas ? 'none' : 'transform 0.08s ease-out',
                    }}
                  >

                  {/* Structural Insulated Perimeter Envelopes (Single Envelope or Dual-Unit Side-by-Side Envelopes) */}
                  {(() => {
                    const unitMap = new Map<string, typeof slotsForEnvelope>();
                    for (const s of slotsForEnvelope) {
                      const lbl = s.zone.instance_label || s.title || '';
                      let k = 'all';
                      if (lbl.includes('وحدة أ') || lbl.includes('Unit A')) k = isAr ? 'وحدة أ — 150 م²' : 'Unit A — 150 m²';
                      else if (lbl.includes('وحدة ب') || lbl.includes('Unit B')) k = isAr ? 'وحدة ب — 150 م²' : 'Unit B — 150 m²';
                      if (!unitMap.has(k)) unitMap.set(k, []);
                      unitMap.get(k)!.push(s);
                    }

                    const isMultiUnit = unitMap.size > 1 && !unitMap.has('all');
                    const envelopes = isMultiUnit
                      ? Array.from(unitMap.entries()).map(([label, slots]) => ({
                          label,
                          minX: Math.min(...slots.map(s => s.x)),
                          maxX: Math.max(...slots.map(s => s.x + s.w)),
                          minY: Math.min(...slots.map(s => s.y)),
                          maxY: Math.max(...slots.map(s => s.y + s.h)),
                        }))
                      : [{ label: '', minX: envMinX, maxX: envMaxX, minY: envMinY, maxY: envMaxY }];

                    return (
                      <>
                        {envelopes.map((env, eIdx) => (
                          <g key={`env-${eIdx}`} className="fp-envelope" pointerEvents="none">
                            <rect x={env.minX - 2} y={env.minY - 2} width={env.maxX - env.minX + 4} height={env.maxY - env.minY + 4} fill="none" stroke="#DDA752" strokeWidth="3.5" />
                            <rect x={env.minX + 2} y={env.minY + 2} width={env.maxX - env.minX - 4} height={env.maxY - env.minY - 4} fill="none" stroke="rgba(221, 167, 82, 0.45)" strokeWidth="1" />
                            {/* Reinforced Corner Concrete Columns */}
                            <rect x={env.minX - 5} y={env.minY - 5} width="10" height="10" fill="url(#adminColumnHatch)" stroke="#DDA752" strokeWidth="1" />
                            <rect x={env.maxX - 5} y={env.minY - 5} width="10" height="10" fill="url(#adminColumnHatch)" stroke="#DDA752" strokeWidth="1" />
                            <rect x={env.minX - 5} y={env.maxY - 5} width="10" height="10" fill="url(#adminColumnHatch)" stroke="#DDA752" strokeWidth="1" />
                            <rect x={env.maxX - 5} y={env.maxY - 5} width="10" height="10" fill="url(#adminColumnHatch)" stroke="#DDA752" strokeWidth="1" />
                            {/* Unit Header Badge */}
                            {env.label && (
                              <g transform={`translate(${(env.minX + env.maxX) / 2 - 60}, ${env.minY - 22})`}>
                                <rect width="120" height="18" rx="4" fill="rgba(10,14,24,0.92)" stroke="#DDA752" strokeWidth="1.2" />
                                <text x="60" y="12" fontSize="9" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
                                  {env.label}
                                </text>
                              </g>
                            )}
                          </g>
                        ))}
                      </>
                    );
                  })()}


                  {/* Room Internal Partitions */}
                  {indoorSlots.map(s => (
                    <rect key={`part-${s.zone.id}`} x={s.x} y={s.y} width={s.w} height={s.h} fill="none" stroke="rgba(221, 167, 82, 0.6)" strokeWidth="2" pointerEvents="none" />
                  ))}

                  {/* Room Interactive Cards with Flooring Patterns & CAD Fixtures */}
                  {previewSlots.map((s, idx) => {
                    const isSelected = currentSelectedZone?.id === s.zone.id;
                    const isWarn = s.warn !== 'ok';
                    const isDragSource = canvasDrag?.id === s.zone.id;
                    const isDropTarget = canvasDrag != null && canvasDrag.overId === s.zone.id;
                    const full = s.w >= 90 && s.h >= 52;
                    const medium = !full && s.w >= 56 && s.h >= 30;
                    const tiny = !full && !medium;

                    const tid = s.zone.zone_template_id;
                    const isReception = tid === 'apt.reception' || tid === 'bld.entrance_lobby';
                    const isMasterBed = tid === 'apt.master_bed';
                    const isBed = tid.includes('bed') || tid === 'apt.dressing';
                    const isKitchen = tid === 'apt.kitchen';
                    const isBath = tid.includes('bath');
                    const isBalcony = tid.includes('balcony') || tid.includes('terrace');
                    const isStaircase = tid === 'bld.staircase';
                    const isElevator = tid === 'bld.elevator';
                    const isElectricBox = tid === 'bld.electric_box';
                    const isWaterMotors = tid === 'bld.water_motors';
                    const isGarageBays = tid === 'bld.garage_bays';
                    const isCorridor = tid === 'bld.central_corridor' || tid === 'apt.corridor';
                    const isLightwell = tid === 'bld.lightwell';
                    const isUnit = tid === 'bld.unit';

                    const floorFill = isReception
                      ? 'url(#adminParquetPattern)'
                      : isKitchen || isBath
                        ? 'url(#adminTilePattern)'
                        : isBalcony
                          ? 'url(#adminDeckPattern)'
                          : isBed
                            ? 'url(#adminBedPattern)'
                            : isUnit
                              ? 'rgba(221, 167, 82, 0.05)'
                              : isSelected
                                ? 'rgba(221, 167, 82, 0.16)'
                                : 'rgba(255, 255, 255, 0.02)';

                    return (
                      <g
                        key={s.zone.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${s.title}, ${round1(s.sqm)} ${isAr ? 'متر مربع' : 'square meters'}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectZone(s.zone.id, true);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (suppressCanvasClickRef.current) return;
                          if (composerTool !== 'select') {
                            handleComposerClick(s.zone.id, e);
                            return;
                          }
                          if (propertyType === 'building' && bldView.mode === 'floor' && s.zone.zone_template_id === 'bld.unit') {
                            setBldView({ mode: 'unit', floorKey: bldView.floorKey, unitId: s.zone.id });
                            setSelectedZoneId(null);
                            return;
                          }
                          selectZone(s.zone.id, true);
                        }}
                        onPointerDown={(e) => handleCanvasRoomPointerDown(s.zone.id, e)}
                        onPointerMove={(e) => handleWallPointerMove(s.zone.id, e)}
                        onPointerLeave={() => { if (composerTool !== 'select') setActiveOpeningHover(null); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (propertyType === 'building' && bldView.mode === 'floor' && s.zone.zone_template_id === 'bld.unit') {
                              setBldView({ mode: 'unit', floorKey: bldView.floorKey, unitId: s.zone.id });
                              setSelectedZoneId(null);
                              return;
                            }
                            selectZone(s.zone.id, true);
                          }
                        }}
                        opacity={isDragSource ? 0.35 : 1}
                        style={{ cursor: composerTool !== 'select' ? 'crosshair' : canvasDrag ? 'grabbing' : 'grab', touchAction: 'none' }}
                      >
                        {isDropTarget && (
                          <rect
                            x={s.x}
                            y={s.y}
                            width={s.w}
                            height={s.h}
                            fill="rgba(221, 167, 82, 0.12)"
                            stroke="#DDA752"
                            strokeWidth="2"
                            strokeDasharray="6 4"
                          />
                        )}
                        <title>{`${s.title} — ${s.dims} m — ${round1(s.sqm)} m²`}</title>

                        {/* Room Floor Surface with Texture */}
                        <rect
                          x={s.x + 2}
                          y={s.y + 2}
                          width={Math.max(2, s.w - 4)}
                          height={Math.max(2, s.h - 4)}
                          fill={floorFill}
                          stroke={isSelected ? '#DDA752' : isWarn ? '#E0A63A' : 'transparent'}
                          strokeWidth="1.5"
                          strokeDasharray={!isSelected && isWarn ? '4 3' : undefined}
                          filter={isSelected ? 'url(#adminGoldGlow)' : undefined}
                        />

                        {/* Exterior Balcony Cantilevered Construction & Safety Railing */}
                        {isBalcony && (
                          <g pointerEvents="none">
                            {/* Outdoor Sky Terrace Tint */}
                            <rect
                              x={s.x + 2}
                              y={s.y + 2}
                              width={Math.max(2, s.w - 4)}
                              height={Math.max(2, s.h - 4)}
                              fill="rgba(127, 180, 216, 0.08)"
                            />
                            {/* Cantilever Slab Outer Edge */}
                            <rect
                              x={s.x}
                              y={s.y}
                              width={s.w}
                              height={s.h}
                              fill="none"
                              stroke="#7FB4D8"
                              strokeWidth="2.5"
                              strokeDasharray="6 3"
                            />
                            {/* Glass Guardrail Inner Line */}
                            <rect
                              x={s.x + 3}
                              y={s.y + 3}
                              width={Math.max(2, s.w - 6)}
                              height={Math.max(2, s.h - 6)}
                              fill="none"
                              stroke="rgba(127, 180, 216, 0.35)"
                              strokeWidth="1"
                            />
                            {/* Corner Baluster Posts */}
                            <circle cx={s.x + 3} cy={s.y + 3} r="3.5" fill="#7FB4D8" stroke="#0D1220" strokeWidth="1" />
                            <circle cx={s.x + s.w - 3} cy={s.y + 3} r="3.5" fill="#7FB4D8" stroke="#0D1220" strokeWidth="1" />
                            <circle cx={s.x + 3} cy={s.y + s.h - 3} r="3.5" fill="#7FB4D8" stroke="#0D1220" strokeWidth="1" />
                            <circle cx={s.x + s.w - 3} cy={s.y + s.h - 3} r="3.5" fill="#7FB4D8" stroke="#0D1220" strokeWidth="1" />
                            {/* Exterior Badge Stamp */}
                            <rect
                              x={s.x + s.w / 2 - 38}
                              y={s.y + s.h - 16}
                              width="76"
                              height="12"
                              rx="3"
                              fill="rgba(10, 14, 24, 0.9)"
                              stroke="rgba(127, 180, 216, 0.6)"
                              strokeWidth="0.8"
                            />
                            <text
                              x={s.x + s.w / 2}
                              y={s.y + s.h - 8}
                              fontSize="6.5"
                              fill="#7FB4D8"
                              textAnchor="middle"
                              fontWeight="800"
                              fontFamily="monospace"
                            >
                              {isAr ? 'شرفة خارجية' : 'EXTERIOR BALCONY'}
                            </text>
                          </g>
                        )}

                        {/* Residential Flat Interactive Block */}
                        {isUnit && (
                          <g pointerEvents="none">
                            <rect
                              x={s.x + 2}
                              y={s.y + 2}
                              width={Math.max(2, s.w - 4)}
                              height={Math.max(2, s.h - 4)}
                              fill="rgba(221, 167, 82, 0.05)"
                              stroke="#DDA752"
                              strokeWidth="1.8"
                            />
                            {s.w >= 100 && s.h >= 50 && (
                              <g
                                transform={`translate(${s.x + s.w / 2 - 55}, ${s.y + s.h - 24})`}
                                pointerEvents="all"
                                style={{ cursor: 'pointer' }}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setBldView({ mode: 'unit', floorKey: bldView.mode === 'floor' ? bldView.floorKey : 'Floor 1', unitId: s.zone.id });
                                  setSelectedZoneId(null);
                                }}
                              >
                                <rect width="110" height="18" rx="4" fill="rgba(10, 14, 24, 0.9)" stroke="#DDA752" strokeWidth="1" filter="url(#adminGoldGlow)" />
                                <text x="55" y="12" fontSize="7.5" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
                                  {isAr ? 'انقر لتعديل الشقة ‹' : 'Click to edit unit plan ›'}
                                </text>
                              </g>
                            )}
                          </g>
                        )}

                        {/* Building Staircase */}
                        {isStaircase && (
                          <g pointerEvents="none" opacity="0.8">
                            {[...Array(Math.max(3, Math.min(8, Math.floor(s.h / 12))))].map((_, i) => (
                              <line
                                key={`stair-${i}`}
                                x1={s.x + 6}
                                y1={s.y + 8 + i * 10}
                                x2={s.x + s.w - 6}
                                y2={s.y + 8 + i * 10}
                                stroke="rgba(221, 167, 82, 0.4)"
                                strokeWidth="1"
                              />
                            ))}
                            <line x1={s.x + s.w / 2} y1={s.y + 6} x2={s.x + s.w / 2} y2={s.y + s.h - 6} stroke="#DDA752" strokeWidth="1.5" />
                            <text x={s.x + s.w - 18} y={s.y + 14} fontSize="7" fill="#DDA752" fontWeight="800" fontFamily="monospace">UP ↗</text>
                          </g>
                        )}

                        {/* Building Elevator */}
                        {isElevator && (
                          <g pointerEvents="none" opacity="0.85">
                            <line x1={s.x + 4} y1={s.y + 4} x2={s.x + s.w - 4} y2={s.y + s.h - 4} stroke="rgba(221, 167, 82, 0.4)" />
                            <line x1={s.x + s.w - 4} y1={s.y + 4} x2={s.x + 4} y2={s.y + s.h - 4} stroke="rgba(221, 167, 82, 0.4)" />
                            <rect x={s.x + s.w / 2 - 14} y={s.y + s.h / 2 - 10} width="28" height="20" rx="2" fill="rgba(10, 14, 24, 0.9)" stroke="#DDA752" strokeWidth="1" />
                            <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 3} fontSize="6.5" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="monospace">ELEV</text>
                          </g>
                        )}

                        {/* Electric Board & Meters */}
                        {isElectricBox && (
                          <g pointerEvents="none" opacity="0.85">
                            <rect x={s.x + 6} y={s.y + 6} width={s.w - 12} height={s.h - 12} fill="rgba(221, 167, 82, 0.08)" stroke="#DDA752" strokeWidth="1" strokeDasharray="3 2" />
                            <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 3} fontSize="7" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="monospace">⚡ ELECTRIC</text>
                          </g>
                        )}

                        {/* Water Motors & Pumps */}
                        {isWaterMotors && (
                          <g pointerEvents="none" opacity="0.85">
                            <circle cx={s.x + s.w / 2 - 8} cy={s.y + s.h / 2} r="6" fill="rgba(127, 180, 216, 0.15)" stroke="#7FB4D8" strokeWidth="1" />
                            <circle cx={s.x + s.w / 2 + 8} cy={s.y + s.h / 2} r="6" fill="rgba(127, 180, 216, 0.15)" stroke="#7FB4D8" strokeWidth="1" />
                            <text x={s.x + s.w / 2} y={s.y + s.h - 5} fontSize="6.5" fill="#7FB4D8" textAnchor="middle" fontWeight="800" fontFamily="monospace">💧 PUMPS</text>
                          </g>
                        )}

                        {/* Garage Parking Bays */}
                        {isGarageBays && (
                          <g pointerEvents="none" opacity="0.7">
                            <line x1={s.x + s.w / 2} y1={s.y + 4} x2={s.x + s.w / 2} y2={s.y + s.h - 4} stroke="rgba(221, 167, 82, 0.4)" strokeDasharray="4 2" />
                            <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 3} fontSize="7" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="monospace">🚗 PARKING</text>
                          </g>
                        )}

                        {/* Corridor */}
                        {isCorridor && (
                          <g pointerEvents="none" opacity="0.6">
                            <line x1={s.x + 8} y1={s.y + s.h / 2} x2={s.x + s.w - 8} y2={s.y + s.h / 2} stroke="#DDA752" strokeWidth="1.5" strokeDasharray="6 4" />
                          </g>
                        )}

                        {/* Lightwell Duct */}
                        {isLightwell && (
                          <g pointerEvents="none" opacity="0.7">
                            <line x1={s.x + 4} y1={s.y + 4} x2={s.x + s.w - 4} y2={s.y + s.h - 4} stroke="rgba(221, 167, 82, 0.3)" strokeDasharray="3 3" />
                            <line x1={s.x + s.w - 4} y1={s.y + 4} x2={s.x + 4} y2={s.y + s.h - 4} stroke="rgba(221, 167, 82, 0.3)" strokeDasharray="3 3" />
                            <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 3} fontSize="6.5" fill="rgba(221, 167, 82, 0.8)" textAnchor="middle" fontWeight="800" fontFamily="monospace">DUCT / منور</text>
                          </g>
                        )}

                        {/* ── CAD Spatial Furniture / Fixture Outlines ── */}
                        {s.w >= 64 && s.h >= 44 && !isUnit && !isStaircase && !isElevator && !isElectricBox && !isWaterMotors && !isGarageBays && !isLightwell && (
                          <g className="fp-cad-fixtures" opacity="0.65" pointerEvents="none">
                            {/* Living Reception: 3-piece sofa & coffee table */}
                            {isReception && (
                              <g>
                                <rect x={s.x + 10} y={s.y + s.h - 26} width={Math.min(54, s.w - 20)} height="16" rx="3" fill="none" stroke="rgba(221,167,82,0.7)" strokeWidth="1" />
                                <rect x={s.x + s.w / 2 - 12} y={s.y + s.h / 2 - 6} width="24" height="12" rx="2" fill="none" stroke="rgba(221,167,82,0.6)" strokeWidth="0.8" />
                                <line x1={s.x + 12} y1={s.y + 8} x2={s.x + Math.min(48, s.w - 24)} y2={s.y + 8} stroke="rgba(221,167,82,0.6)" strokeWidth="1.5" />
                              </g>
                            )}
                            {/* Master Bed: King bed with headboard & pillows */}
                            {isMasterBed && (
                              <g>
                                <rect x={s.x + s.w / 2 - 16} y={s.y + 10} width="32" height="38" rx="2" fill="none" stroke="rgba(221,167,82,0.7)" strokeWidth="1" />
                                <line x1={s.x + s.w / 2 - 16} y1={s.y + 10} x2={s.x + s.w / 2 + 16} y2={s.y + 10} stroke="rgba(221,167,82,0.9)" strokeWidth="2" />
                                <rect x={s.x + s.w / 2 - 13} y={s.y + 13} width="11" height="8" rx="1" fill="none" stroke="rgba(221,167,82,0.6)" strokeWidth="0.8" />
                                <rect x={s.x + s.w / 2 + 2} y={s.y + 13} width="11" height="8" rx="1" fill="none" stroke="rgba(221,167,82,0.6)" strokeWidth="0.8" />
                                {/* Nightstands */}
                                <rect x={s.x + s.w / 2 - 24} y={s.y + 10} width="6" height="8" fill="none" stroke="rgba(221,167,82,0.5)" strokeWidth="0.8" />
                                <rect x={s.x + s.w / 2 + 18} y={s.y + 10} width="6" height="8" fill="none" stroke="rgba(221,167,82,0.5)" strokeWidth="0.8" />
                              </g>
                            )}
                            {/* Standard Bed */}
                            {!isMasterBed && isBed && (
                              <g>
                                <rect x={s.x + s.w / 2 - 12} y={s.y + 10} width="24" height="34" rx="2" fill="none" stroke="rgba(221,167,82,0.7)" strokeWidth="1" />
                                <rect x={s.x + s.w / 2 - 9} y={s.y + 13} width="18" height="7" rx="1" fill="none" stroke="rgba(221,167,82,0.6)" strokeWidth="0.8" />
                              </g>
                            )}
                            {/* Kitchen: Countertop, sink, hob */}
                            {isKitchen && (
                              <g>
                                <line x1={s.x + 8} y1={s.y + 8} x2={s.x + s.w - 8} y2={s.y + 8} stroke="rgba(221,167,82,0.6)" strokeWidth="1.5" />
                                <line x1={s.x + 8} y1={s.y + 8} x2={s.x + 8} y2={s.y + s.h - 8} stroke="rgba(221,167,82,0.6)" strokeWidth="1.5" />
                                {/* Double sink */}
                                <rect x={s.x + 12} y={s.y + 12} width="16" height="10" fill="none" stroke="rgba(127,180,216,0.7)" strokeWidth="0.8" />
                                <line x1={s.x + 20} y1={s.y + 12} x2={s.x + 20} y2={s.y + 22} stroke="rgba(127,180,216,0.7)" strokeWidth="0.8" />
                              </g>
                            )}
                            {/* Bathroom: Shower tray & vanity */}
                            {isBath && (
                              <g>
                                <rect x={s.x + 8} y={s.y + 8} width="22" height="22" fill="none" stroke="rgba(127,180,216,0.7)" strokeWidth="1" />
                                <circle cx={s.x + 19} cy={s.y + 19} r="2" fill="rgba(127,180,216,0.7)" />
                                {/* Vanity oval */}
                                <ellipse cx={s.x + s.w - 16} cy={s.y + 16} rx="8" ry="6" fill="none" stroke="rgba(221,167,82,0.6)" strokeWidth="0.8" />
                              </g>
                            )}
                          </g>
                        )}

                        {/* Selected Corner Accents & Live Interactive Resize Handles */}
                        {isSelected && (() => {
                          const cx = s.x + 4, cy = s.y + 4, ex = s.x + s.w - 4, ey = s.y + s.h - 4, t = 6;

                          return (
                            <g>
                              {/* Corner Accents */}
                              <g stroke="#DDA752" strokeWidth="1.5">
                                <path d={`M ${cx} ${cy + t} L ${cx} ${cy} L ${cx + t} ${cy}`} fill="none" />
                                <path d={`M ${ex - t} ${cy} L ${ex} ${cy} L ${ex} ${cy + t}`} fill="none" />
                                <path d={`M ${cx} ${ey - t} L ${cx} ${ey} L ${cx + t} ${ey}`} fill="none" />
                                <path d={`M ${ex - t} ${ey} L ${ex} ${ey} L ${ex} ${ey - t}`} fill="none" />
                              </g>

                              {/* 4 Sleek Minimal Corner Resize Grippers */}
                              <circle
                                cx={s.x + s.w}
                                cy={s.y + s.h}
                                r="3.5"
                                fill="#DDA752"
                                stroke="#0A0E1A"
                                strokeWidth="1"
                                style={{ cursor: 'nwse-resize' }}
                                onPointerDown={(ev) => handleResizePointerDown(s.zone.id, 'se', ev)}
                              >
                                <title>{isAr ? 'اسحب لتغيير الأبعاد (الزاوية)' : 'Drag to resize room (Corner)'}</title>
                              </circle>
                              <circle
                                cx={s.x}
                                cy={s.y + s.h}
                                r="3.5"
                                fill="#DDA752"
                                stroke="#0A0E1A"
                                strokeWidth="1"
                                style={{ cursor: 'nesw-resize' }}
                                onPointerDown={(ev) => handleResizePointerDown(s.zone.id, 'sw', ev)}
                              >
                                <title>{isAr ? 'اسحب لتغيير الأبعاد (الزاوية)' : 'Drag to resize room (Corner)'}</title>
                              </circle>
                              <circle
                                cx={s.x + s.w}
                                cy={s.y}
                                r="3.5"
                                fill="#DDA752"
                                stroke="#0A0E1A"
                                strokeWidth="1"
                                style={{ cursor: 'nesw-resize' }}
                                onPointerDown={(ev) => handleResizePointerDown(s.zone.id, 'ne', ev)}
                              >
                                <title>{isAr ? 'اسحب لتغيير الأبعاد (الزاوية)' : 'Drag to resize room (Corner)'}</title>
                              </circle>
                              <circle
                                cx={s.x}
                                cy={s.y}
                                r="3.5"
                                fill="#DDA752"
                                stroke="#0A0E1A"
                                strokeWidth="1"
                                style={{ cursor: 'nwse-resize' }}
                                onPointerDown={(ev) => handleResizePointerDown(s.zone.id, 'nw', ev)}
                              >
                                <title>{isAr ? 'اسحب لتغيير الأبعاد (الزاوية)' : 'Drag to resize room (Corner)'}</title>
                              </circle>

                              {/* 4 Edge Midpoint Handles for Direct Side Dragging */}
                              {/* East side handle */}
                              <rect
                                x={s.x + s.w - 2.5}
                                y={s.y + s.h / 2 - 7}
                                width="5"
                                height="14"
                                rx="2.5"
                                fill="#DDA752"
                                stroke="#0A0E1A"
                                strokeWidth="0.8"
                                style={{ cursor: 'ew-resize' }}
                                onPointerDown={(ev) => handleResizePointerDown(s.zone.id, 'e', ev)}
                              >
                                <title>{isAr ? 'اسحب الجانب الأيمن للتوسيع أو التضييق' : 'Drag right side to expand or shrink'}</title>
                              </rect>
                              {/* West side handle */}
                              <rect
                                x={s.x - 2.5}
                                y={s.y + s.h / 2 - 7}
                                width="5"
                                height="14"
                                rx="2.5"
                                fill="#DDA752"
                                stroke="#0A0E1A"
                                strokeWidth="0.8"
                                style={{ cursor: 'ew-resize' }}
                                onPointerDown={(ev) => handleResizePointerDown(s.zone.id, 'w', ev)}
                              >
                                <title>{isAr ? 'اسحب الجانب الأيسر للتوسيع أو التضييق' : 'Drag left side to expand or shrink'}</title>
                              </rect>
                              {/* South side handle */}
                              <rect
                                x={s.x + s.w / 2 - 7}
                                y={s.y + s.h - 2.5}
                                width="14"
                                height="5"
                                rx="2.5"
                                fill="#DDA752"
                                stroke="#0A0E1A"
                                strokeWidth="0.8"
                                style={{ cursor: 'ns-resize' }}
                                onPointerDown={(ev) => handleResizePointerDown(s.zone.id, 's', ev)}
                              >
                                <title>{isAr ? 'اسحب الجانب السفلي للتوسيع أو التضييق' : 'Drag bottom side to expand or shrink'}</title>
                              </rect>
                              {/* North side handle */}
                              <rect
                                x={s.x + s.w / 2 - 7}
                                y={s.y - 2.5}
                                width="14"
                                height="5"
                                rx="2.5"
                                fill="#DDA752"
                                stroke="#0A0E1A"
                                strokeWidth="0.8"
                                style={{ cursor: 'ns-resize' }}
                                onPointerDown={(ev) => handleResizePointerDown(s.zone.id, 'n', ev)}
                              >
                                <title>{isAr ? 'اسحب الجانب العلوي للتوسيع أو التضييق' : 'Drag top side to expand or shrink'}</title>
                              </rect>
                            </g>
                          );
                        })()}

                        {full && (
                          <text x={s.x + 8} y={s.y + 14} fontSize="8" fill="#DDA752" fontFamily="monospace" pointerEvents="none" style={{ direction: 'ltr', unicodeBidi: 'isolate', userSelect: 'none', WebkitUserSelect: 'none' }}>{s.dims}</text>
                        )}

                        {tiny ? (
                          <text x={s.pinX} y={s.pinY + 3} fontSize="9" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="monospace" pointerEvents="none" style={{ direction: 'ltr', unicodeBidi: 'isolate', userSelect: 'none', WebkitUserSelect: 'none' }}>
                            {String(idx + 1).padStart(2, '0')}
                          </text>
                        ) : (
                          <>
                            <text x={s.pinX} y={s.pinY - 2} fontSize={full ? 10 : 8.5} fill="#FFFFFF" textAnchor="middle" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif" pointerEvents="none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                              {s.title}
                            </text>
                            <text x={s.pinX} y={s.pinY + (full ? 12 : 10)} fontSize={full ? 9 : 8} fill={isWarn ? '#E0A63A' : '#DDA752'} textAnchor="middle" fontWeight="800" fontFamily="monospace" pointerEvents="none" style={{ direction: 'ltr', unicodeBidi: 'isolate', userSelect: 'none', WebkitUserSelect: 'none' }}>
                              {round1(s.sqm)} m²{isWarn ? ' !' : ''}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  {/* ── Realistic CAD Door and Window Openings ── */}
                  {previewSlots.flatMap(s =>
                    openingSegments(s, s.zone.spatial?.openings, metricLayout.pxPerMeter).map(seg => {
                      const horizontal = seg.edge === 'n' || seg.edge === 's';
                      const len = horizontal ? Math.abs(seg.x2 - seg.x1) : Math.abs(seg.y2 - seg.y1);
                      const isFlipped = !!seg.flip;

                      if (seg.kind === 'door') {
                        let pivotX = seg.x1;
                        let pivotY = seg.y1;
                        let leafEndX = seg.x1;
                        let leafEndY = seg.y1;
                        let knobX = seg.x1;
                        let knobY = seg.y1;
                        let arcPath = '';

                        if (horizontal) {
                          const inwardY = seg.edge === 'n' ? seg.y1 + len : seg.y1 - len;
                          if (!isFlipped) {
                            pivotX = seg.x1;
                            pivotY = seg.y1;
                            leafEndX = seg.x1;
                            leafEndY = inwardY;
                            knobX = seg.x1 + 3;
                            knobY = inwardY + (seg.edge === 'n' ? -4 : 4);
                            const sweep = seg.edge === 'n' ? 0 : 1;
                            arcPath = `M ${seg.x1} ${inwardY} A ${len} ${len} 0 0 ${sweep} ${seg.x2} ${seg.y1}`;
                          } else {
                            pivotX = seg.x2;
                            pivotY = seg.y1;
                            leafEndX = seg.x2;
                            leafEndY = inwardY;
                            knobX = seg.x2 - 3;
                            knobY = inwardY + (seg.edge === 'n' ? -4 : 4);
                            const sweep = seg.edge === 'n' ? 1 : 0;
                            arcPath = `M ${seg.x2} ${inwardY} A ${len} ${len} 0 0 ${sweep} ${seg.x1} ${seg.y1}`;
                          }
                        } else {
                          const inwardX = seg.edge === 'w' ? seg.x1 + len : seg.x1 - len;
                          if (!isFlipped) {
                            pivotX = seg.x1;
                            pivotY = seg.y1;
                            leafEndX = inwardX;
                            leafEndY = seg.y1;
                            knobX = inwardX + (seg.edge === 'w' ? -4 : 4);
                            knobY = seg.y1 + 3;
                            const sweep = seg.edge === 'w' ? 1 : 0;
                            arcPath = `M ${inwardX} ${seg.y1} A ${len} ${len} 0 0 ${sweep} ${seg.x1} ${seg.y2}`;
                          } else {
                            pivotX = seg.x1;
                            pivotY = seg.y2;
                            leafEndX = inwardX;
                            leafEndY = seg.y2;
                            knobX = inwardX + (seg.edge === 'w' ? -4 : 4);
                            knobY = seg.y2 - 3;
                            const sweep = seg.edge === 'w' ? 0 : 1;
                            arcPath = `M ${inwardX} ${seg.y2} A ${len} ${len} 0 0 ${sweep} ${seg.x1} ${seg.y1}`;
                          }
                        }

                        return (
                          <g
                            key={seg.id}
                            className="fp-cad-door-group"
                            style={{ cursor: 'grab' }}
                            onPointerDown={(ev) => handleOpeningPointerDown(s.zone.id, seg.id, seg.edge, seg.offset_m ?? 0, seg.width_m ?? 0.9, ev)}
                          >
                            <title>{isAr ? 'باب — اسحب لتحريك الموضع على الجدار' : 'Door — Drag along wall to reposition, or use hover actions'}</title>

                            {/* Wall cutout gap */}
                            <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="#0A0E1A" strokeWidth="6" />

                            {/* Jamb End Caps */}
                            <rect
                              x={horizontal ? seg.x1 - 2 : seg.x1 - 2}
                              y={horizontal ? seg.y1 - 2 : seg.y1 - 2}
                              width={horizontal ? 3 : 4}
                              height={horizontal ? 4 : 3}
                              rx="0.5"
                              fill="#DDA752"
                            />
                            <rect
                              x={horizontal ? seg.x2 - 1 : seg.x2 - 2}
                              y={horizontal ? seg.y2 - 2 : seg.y2 - 1}
                              width={horizontal ? 3 : 4}
                              height={horizontal ? 4 : 3}
                              rx="0.5"
                              fill="#DDA752"
                            />

                            {/* 90-degree Circular Clearance Swing Sector */}
                            <path d={arcPath} fill="rgba(221, 167, 82, 0.08)" stroke="#DDA752" strokeWidth="1.2" strokeDasharray="3 2" />

                            {/* Solid Door Leaf Panel */}
                            <line x1={pivotX} y1={pivotY} x2={leafEndX} y2={leafEndY} stroke="#DDA752" strokeWidth="2.5" strokeLinecap="round" />

                            {/* Door Knob */}
                            <circle cx={knobX} cy={knobY} r="1.8" fill="#FFFFFF" stroke="#DDA752" strokeWidth="0.8" />

                            {/* Hinge Pivot Point */}
                            <circle cx={pivotX} cy={pivotY} r="2.2" fill="#DDA752" />

                            {/* Interactive Hover Action Pill (Flip & Delete) */}
                            <g
                              transform={`translate(${(seg.x1 + seg.x2) / 2 - 26}, ${(seg.y1 + seg.y2) / 2 - 20})`}
                              className="fp-opening-hover-actions"
                            >
                              <rect width="52" height="18" rx="5" fill="#0D1220" stroke="#DDA752" strokeWidth="1" />
                              {/* Flip button */}
                              <g
                                style={{ cursor: 'pointer' }}
                                onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); handleFlipOpening(s.zone.id, seg.id); }}
                              >
                                <text x="13" y="12.5" fontSize="9" fill="#DDA752" textAnchor="middle" fontWeight="900">↺</text>
                                <title>{isAr ? 'عكس اتجاه الباب' : 'Flip swing'}</title>
                              </g>
                              <line x1="26" y1="3" x2="26" y2="15" stroke="rgba(221,167,82,0.3)" strokeWidth="0.8" />
                              {/* Delete button */}
                              <g
                                style={{ cursor: 'pointer' }}
                                onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); handleRemoveOpening(s.zone.id, seg.id); }}
                              >
                                <text x="39" y="12.5" fontSize="9" fill="#EF4444" textAnchor="middle" fontWeight="900">✕</text>
                                <title>{isAr ? 'حذف الباب' : 'Delete door'}</title>
                              </g>
                            </g>
                          </g>
                        );
                      }

                      // Render realistic architectural window
                      const sillX1 = horizontal ? seg.x1 - 3 : seg.edge === 'w' ? seg.x1 - 3 : seg.x1 + 3;
                      const sillY1 = horizontal ? (seg.edge === 'n' ? seg.y1 - 3 : seg.y1 + 3) : seg.y1 - 3;
                      const sillX2 = horizontal ? seg.x2 + 3 : sillX1;
                      const sillY2 = horizontal ? sillY1 : seg.y2 + 3;

                      return (
                        <g
                          key={seg.id}
                          className="fp-cad-window-group"
                          style={{ cursor: 'grab' }}
                          onPointerDown={(ev) => handleOpeningPointerDown(s.zone.id, seg.id, seg.edge, seg.offset_m ?? 0, seg.width_m ?? 1.2, ev)}
                        >
                          <title>{isAr ? 'نافذة — اسحب لتحريك الموضع على الجدار' : 'Window — Drag along wall to reposition, or use hover actions'}</title>

                          {/* Wall Cutout Gap */}
                          <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="#0A0E1A" strokeWidth="6" />

                          {/* Outer Projecting Stone Sill Ledge */}
                          <line x1={sillX1} y1={sillY1} x2={sillX2} y2={sillY2} stroke="#7FB4D8" strokeWidth="2.8" strokeLinecap="round" />

                          {/* Double Glazed Glass Panes */}
                          {horizontal ? (
                            <rect x={seg.x1} y={seg.y1 - 2} width={seg.x2 - seg.x1} height="4" fill="url(#adminElevGlassGrad)" stroke="#7FB4D8" strokeWidth="0.8" />
                          ) : (
                            <rect x={seg.x1 - 2} y={seg.y1} width="4" height={seg.y2 - seg.y1} fill="url(#adminElevGlassGrad)" stroke="#7FB4D8" strokeWidth="0.8" />
                          )}

                          {/* Center Mullion Divider */}
                          {horizontal ? (
                            <line x1={(seg.x1 + seg.x2) / 2} y1={seg.y1 - 3} x2={(seg.x1 + seg.x2) / 2} y2={seg.y1 + 3} stroke="#7FB4D8" strokeWidth="1.5" />
                          ) : (
                            <line x1={seg.x1 - 3} y1={(seg.y1 + seg.y2) / 2} x2={seg.x1 + 3} y2={(seg.y1 + seg.y2) / 2} stroke="#7FB4D8" strokeWidth="1.5" />
                          )}

                          {/* Interactive Hover Actions */}
                          <g
                            transform={`translate(${(seg.x1 + seg.x2) / 2 - 32}, ${(seg.y1 + seg.y2) / 2 - 20})`}
                            className="fp-opening-hover-actions"
                          >
                            <rect width="64" height="18" rx="5" fill="#0D1220" stroke="#7FB4D8" strokeWidth="1" />
                            {/* Width Adjust */}
                            <g
                              style={{ cursor: 'pointer' }}
                              onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); handleAdjustWindowWidth(s.zone.id, seg.id); }}
                            >
                              <text x="18" y="12" fontSize="7.5" fill="#7FB4D8" textAnchor="middle" fontWeight="800">{seg.width_m}m</text>
                              <title>{isAr ? 'تغيير العرض' : 'Change width'}</title>
                            </g>
                            <line x1="36" y1="3" x2="36" y2="15" stroke="rgba(127,180,216,0.3)" strokeWidth="0.8" />
                            {/* Delete button */}
                            <g
                              style={{ cursor: 'pointer' }}
                              onPointerDown={(ev) => { ev.stopPropagation(); ev.preventDefault(); handleRemoveOpening(s.zone.id, seg.id); }}
                            >
                              <text x="50" y="12.5" fontSize="9" fill="#EF4444" textAnchor="middle" fontWeight="900">✕</text>
                              <title>{isAr ? 'حذف النافذة' : 'Delete window'}</title>
                            </g>
                          </g>
                        </g>
                      );
                    })
                  )}

                  {/* ── Top-Level Selected Room Floating Action HUD (Independent from room drag target) ── */}
                  {currentSelectedZone && (() => {
                    const s = previewSlots.find(slot => slot.zone.id === currentSelectedZone.id);
                    if (!s) return null;

                    const barW = 212;
                    const barH = 26;
                    const preferAbove = s.y >= 38;
                    const barY = preferAbove ? s.y - 32 : s.y + s.h + 8;
                    const barX = Math.max(10, Math.min(680 - barW - 10, s.x + s.w / 2 - barW / 2));

                    return (
                      <g className="fp-selected-room-floating-bar" transform={`translate(${barX}, ${barY})`}>
                        <rect
                          width={barW}
                          height={barH}
                          rx="6"
                          fill="#0D1220"
                          stroke="#DDA752"
                          strokeWidth="1.2"
                          filter="url(#adminGoldGlow)"
                        />

                        {/* ⟲ 90° Rotate */}
                        <g
                          transform="translate(6, 4)"
                          style={{ cursor: 'pointer' }}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            handleRotateRoom(s.zone.id);
                          }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            handleRotateRoom(s.zone.id);
                          }}
                        >
                          <rect width="32" height="18" rx="4" fill="rgba(221,167,82,0.15)" stroke="rgba(221,167,82,0.4)" strokeWidth="0.8" />
                          <text x="16" y="12.5" fontSize="8.5" fill="#DDA752" textAnchor="middle" fontWeight="800">⟲ 90°</text>
                          <title>{isAr ? 'تدوير الغرفة 90 درجة' : 'Rotate room 90°'}</title>
                        </g>

                        {/* ❐ Copy Room */}
                        <g
                          transform="translate(42, 4)"
                          style={{ cursor: 'pointer' }}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            handleCopyRoom(s.zone);
                          }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            handleCopyRoom(s.zone);
                          }}
                        >
                          <rect width="36" height="18" rx="4" fill="rgba(221,167,82,0.15)" stroke="rgba(221,167,82,0.4)" strokeWidth="0.8" />
                          <text x="18" y="12.5" fontSize="8" fill="#DDA752" textAnchor="middle" fontWeight="800">{isAr ? 'نسخ' : 'Copy'}</text>
                          <title>{isAr ? 'نسخ الغرفة (Ctrl+C)' : 'Copy Room (Ctrl+C)'}</title>
                        </g>

                        {/* + Door (Activates Door Placement Tool for this room) */}
                        <g
                          transform="translate(82, 4)"
                          style={{ cursor: 'pointer' }}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            handleStartDoorPlacement(s.zone.id);
                          }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            handleStartDoorPlacement(s.zone.id);
                          }}
                        >
                          <rect
                            width={38}
                            height={18}
                            rx="4"
                            fill={composerTool === 'door' ? '#DDA752' : 'rgba(221,167,82,0.15)'}
                            stroke="rgba(221,167,82,0.5)"
                            strokeWidth="0.8"
                          />
                          <text
                            x="19"
                            y="12.5"
                            fontSize="8.5"
                            fill={composerTool === 'door' ? '#0A0E1A' : '#FFFFFF'}
                            textAnchor="middle"
                            fontWeight="800"
                          >
                            {isAr ? '+ باب' : '+ Door'}
                          </text>
                          <title>{isAr ? 'تحديد موضع الباب على الجدار' : 'Click any wall to place door at chosen location'}</title>
                        </g>

                        {/* + Window (Activates Window Placement Tool for this room) */}
                        <g
                          transform="translate(124, 4)"
                          style={{ cursor: 'pointer' }}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            handleStartWindowPlacement(s.zone.id);
                          }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            handleStartWindowPlacement(s.zone.id);
                          }}
                        >
                          <rect
                            width={44}
                            height={18}
                            rx="4"
                            fill={composerTool === 'window' ? '#7FB4D8' : 'rgba(127,180,216,0.15)'}
                            stroke="rgba(127,180,216,0.5)"
                            strokeWidth="0.8"
                          />
                          <text
                            x="22"
                            y="12.5"
                            fontSize="8.5"
                            fill={composerTool === 'window' ? '#0A0E1A' : '#7FB4D8'}
                            textAnchor="middle"
                            fontWeight="800"
                          >
                            {isAr ? '+ نافذة' : '+ Window'}
                          </text>
                          <title>{isAr ? 'تحديد موضع النافذة على الجدار الخارجي' : 'Click exterior wall to place window at chosen location'}</title>
                        </g>

                        {/* ✕ Delete Room */}
                        <g
                          transform="translate(172, 4)"
                          style={{ cursor: 'pointer' }}
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            pushHistory(zoneInstances);
                            onZoneInstancesChange(removeZones(zoneInstances, [s.zone.id]));
                            setSelectedZoneId(null);
                            showToast(isAr ? 'تم حذف الغرفة' : 'Room deleted');
                          }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            ev.preventDefault();
                            pushHistory(zoneInstances);
                            onZoneInstancesChange(removeZones(zoneInstances, [s.zone.id]));
                            setSelectedZoneId(null);
                            showToast(isAr ? 'تم حذف الغرفة' : 'Room deleted');
                          }}
                        >
                          <rect width="34" height="18" rx="4" fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.4)" strokeWidth="0.8" />
                          <text x="17" y="12.5" fontSize="9" fill="#EF4444" textAnchor="middle" fontWeight="900">✕</text>
                          <title>{isAr ? 'حذف الغرفة (Del)' : 'Delete room (Del)'}</title>
                        </g>
                      </g>
                    );
                  })()}

                  {/* ── Live Ghost Opening Cursor Placement Preview ── */}
                  {activeOpeningHover && (
                    <g className="fp-ghost-opening" opacity="0.85" pointerEvents="none">
                      {activeOpeningHover.kind === 'door' ? (
                        <>
                          <line x1={activeOpeningHover.x1} y1={activeOpeningHover.y1} x2={activeOpeningHover.x2} y2={activeOpeningHover.y2} stroke="#DDA752" strokeWidth="3" />
                          <circle cx={activeOpeningHover.x1} cy={activeOpeningHover.y1} r="3" fill="#DDA752" />
                          <text
                            x={(activeOpeningHover.x1 + activeOpeningHover.x2) / 2}
                            y={(activeOpeningHover.y1 + activeOpeningHover.y2) / 2 - 8}
                            fontSize="7.5"
                            fill="#DDA752"
                            textAnchor="middle"
                            fontWeight="800"
                            fontFamily="monospace"
                          >
                            {`← ${activeOpeningHover.distLeftM}m | 0.9m | ${activeOpeningHover.distRightM}m →`}
                          </text>
                        </>
                      ) : (
                        <>
                          <line x1={activeOpeningHover.x1} y1={activeOpeningHover.y1} x2={activeOpeningHover.x2} y2={activeOpeningHover.y2} stroke="#7FB4D8" strokeWidth="4" />
                          <text
                            x={(activeOpeningHover.x1 + activeOpeningHover.x2) / 2}
                            y={(activeOpeningHover.y1 + activeOpeningHover.y2) / 2 - 8}
                            fontSize="7.5"
                            fill="#7FB4D8"
                            textAnchor="middle"
                            fontWeight="800"
                            fontFamily="monospace"
                          >
                            {`← ${activeOpeningHover.distLeftM}m | 1.2m | ${activeOpeningHover.distRightM}m →`}
                          </text>
                        </>
                      )}
                    </g>
                  )}

                  {/* ── Magnetic Laser Snapping Guides & Alignment Labels ── */}
                  {canvasDrag?.guides?.map((g, gi) => (
                    <g key={`guide-${gi}`} className="fp-laser-guide" pointerEvents="none">
                      <line
                        x1={g.x1}
                        y1={g.y1}
                        x2={g.x2}
                        y2={g.y2}
                        stroke="#DDA752"
                        strokeWidth="1.2"
                        strokeDasharray="4 3"
                        filter="url(#adminElevHoverGlow)"
                      />
                      <g transform={`translate(${g.type === 'x' ? g.x1 + 6 : 24}, ${g.type === 'y' ? g.y1 - 6 : 28 + gi * 16})`}>
                        <rect x="0" y="-10" width={g.label.length * 6 + 16} height="14" rx="3" fill="rgba(10, 14, 24, 0.92)" stroke="#DDA752" strokeWidth="0.8" />
                        <text x="8" y="0" fontSize="7" fill="#DDA752" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
                          {`🧲 ${g.label}`}
                        </text>
                      </g>
                    </g>
                  ))}

                  {/* Magnetic Destination Snap Box with Corner Crosshairs */}
                  {canvasDrag?.snap && (
                    <g pointerEvents="none">
                      <rect
                        x={canvasDrag.snap.x}
                        y={canvasDrag.snap.y}
                        width={canvasDrag.snap.w}
                        height={canvasDrag.snap.h}
                        fill="rgba(221, 167, 82, 0.12)"
                        stroke="#DDA752"
                        strokeWidth="1.8"
                        strokeDasharray="6 3"
                        filter="url(#adminGoldGlow)"
                      />
                      {/* Corner Crosshairs */}
                      <path
                        d={`M ${canvasDrag.snap.x - 4} ${canvasDrag.snap.y} L ${canvasDrag.snap.x + 8} ${canvasDrag.snap.y} M ${canvasDrag.snap.x} ${canvasDrag.snap.y - 4} L ${canvasDrag.snap.x} ${canvasDrag.snap.y + 8}`}
                        stroke="#DDA752"
                        strokeWidth="1.5"
                      />
                      <path
                        d={`M ${canvasDrag.snap.x + canvasDrag.snap.w - 8} ${canvasDrag.snap.y} L ${canvasDrag.snap.x + canvasDrag.snap.w + 4} ${canvasDrag.snap.y} M ${canvasDrag.snap.x + canvasDrag.snap.w} ${canvasDrag.snap.y - 4} L ${canvasDrag.snap.x + canvasDrag.snap.w} ${canvasDrag.snap.y + 8}`}
                        stroke="#DDA752"
                        strokeWidth="1.5"
                      />
                      {canvasDrag.snapLabel && (
                        <g transform={`translate(${canvasDrag.snap.x + canvasDrag.snap.w / 2}, ${canvasDrag.snap.y - 8})`}>
                          <rect x="-60" y="-8" width="120" height="15" rx="3" fill="#0A0E1A" stroke="#DDA752" strokeWidth="0.8" />
                          <text y="2" fontSize="7" fill="#DDA752" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
                            {canvasDrag.snapLabel}
                          </text>
                        </g>
                      )}
                    </g>
                  )}

                  {/* Dragged Room Floating Proxy (Full True Dimensions, No Artificial Shrinking) */}
                  {canvasDrag && (() => {
                    const src = previewSlots.find(s => s.zone.id === canvasDrag.id);
                    if (!src) return null;
                    const drawX = canvasDrag.snap ? canvasDrag.snap.x : canvasDrag.x - src.w / 2;
                    const drawY = canvasDrag.snap ? canvasDrag.snap.y : canvasDrag.y - src.h / 2;
                    return (
                      <g opacity={0.88} pointerEvents="none">
                        <rect
                          x={drawX}
                          y={drawY}
                          width={src.w}
                          height={src.h}
                          rx={4}
                          fill="rgba(221, 167, 82, 0.22)"
                          stroke="#DDA752"
                          strokeWidth="2"
                          filter="url(#adminGoldGlow)"
                        />
                        <text
                          x={drawX + src.w / 2}
                          y={drawY + src.h / 2 + 3}
                          fontSize="9.5"
                          fill="#FFFFFF"
                          textAnchor="middle"
                          fontWeight="700"
                          fontFamily="'Plus Jakarta Sans', sans-serif"
                        >
                          {src.title}
                        </text>
                      </g>
                    );
                  })()}
                </g>

                {/* ── Dynamic Architectural Stamp & North Arrow ── */}
                <g transform={`translate(${Math.min(646, Math.max(500, maxX - 20))}, ${Math.max(16, minY - 24)})`} opacity="0.85">
                  <circle cx="16" cy="16" r="13" fill="rgba(10,14,24,0.8)" stroke="#DDA752" strokeWidth="1" />
                  <polygon points="16,6 20,23 16,19 12,23" fill="#DDA752" />
                  <text x="16" y="3" fontSize="7.5" fill="#DDA752" textAnchor="middle" fontWeight="900" fontFamily="'Plus Jakarta Sans', sans-serif">N</text>
                </g>

                {/* Dynamic Blueprint Title Block */}
                <g transform={`translate(${Math.max(20, maxX - (isAr ? 260 : 248))}, ${Math.min(410, maxY + 14)})`} opacity="0.85" style={{ direction: 'ltr' }}>
                  <rect width={isAr ? 260 : 248} height="24" rx="4" fill="rgba(10,14,24,0.85)" stroke="rgba(221,167,82,0.3)" strokeWidth="0.8" />
                  <text x="10" y="11" fontSize="7.5" fill="#FFFFFF" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif" textAnchor="start" dominantBaseline="middle" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
                    {isAr ? 'مخطط معماري تفصيلي للمساحات' : 'ARCHITECTURAL CAD FLOOR PLAN'}
                  </text>
                  <text x="10" y="18.5" fontSize="6.5" fill="#DDA752" fontFamily="monospace" textAnchor="start" dominantBaseline="middle" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
                    {`BOUNDS: ${totalWidthM}m × ${totalDepthM}m • SCALE 1:50`}
                  </text>
                </g>
              </svg>
            );
            })() : showPresets && propertyType === 'apartment' ? (
              <div className="fp-onboarding-card">
                <div className="fp-onboarding-badge">
                  <Sparkles size={13} />
                  <span>{isAr ? 'بدء إعداد المخطط المعماري' : 'ARCHITECTURAL BLUEPRINT SETUP'}</span>
                </div>
                <h3 className="fp-onboarding-title">
                  {isAr ? 'كيف ترغب في بناء المخطط؟' : 'How would you like to build your floor plan?'}
                </h3>
                <p className="fp-onboarding-desc">
                  {isAr
                    ? 'اختر بين توليد تخطيط ذكي مخصص بالأبعاد والتشطيبات، أو البدء بحدود الشقة من الصفر وتنسيق الغرف يدوياً.'
                    : 'Choose between generating a tailored preset with custom dimensions & finishing, or start with clean apartment outer borders from scratch.'}
                </p>

                <div className="fp-onboarding-choices">
                  {/* Choice 1: Smart AI Preset Wizard */}
                  <div className="fp-choice-card recommended" onClick={() => setWizardOpen(true)}>
                    <div className="fp-choice-badge">{isAr ? 'موصى به' : 'RECOMMENDED'}</div>
                    <div className="fp-choice-icon-box">
                      <Sparkles size={24} />
                    </div>
                    <h4 className="fp-choice-name">{isAr ? 'معالج التوليد الذكي' : 'Smart Preset Wizard'}</h4>
                    <p className="fp-choice-info">
                      {isAr
                        ? 'حدد عدد الغرف، الصالة، البلكونات، والمساحات الإضافية ومستوى التشطيب لتوليد المخطط فوراً.'
                        : 'Specify bedrooms, living, balconies, extra layout spaces & finishing to generate layout.'}
                    </p>
                    <button type="button" className="fp-choice-action-btn primary">
                      <Sparkles size={14} />
                      <span>{isAr ? 'فتح المعالج وتوليد المخطط' : 'Launch Wizard'}</span>
                    </button>
                  </div>

                  {/* Choice 2: Ground Zero Clean Slate */}
                  <div className="fp-choice-card" onClick={handleStartEmpty}>
                    <div className="fp-choice-icon-box secondary">
                      <Maximize2 size={24} />
                    </div>
                    <h4 className="fp-choice-name">{isAr ? 'البدء من نقطة الصفر' : 'Build from Ground Zero'}</h4>
                    <p className="fp-choice-info">
                      {isAr
                        ? 'مساحة عمل فارغة مع حدود الشقة الخارجية، لتضيف وتوزع الغرف والأبواب بحرية تامة.'
                        : 'Start with clean apartment boundary walls and add custom rooms, doors & partitions freely.'}
                    </p>
                    <button type="button" className="fp-choice-action-btn outline">
                      <span>{isAr ? 'البدء بحدود فارغة' : 'Start with Clean Boundary'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="fp-empty-box">
                <Building size={36} className="fp-empty-icon" />
                <h4 className="fp-empty-title">{isAr ? 'لا توجد غرف بعد' : 'No rooms yet'}</h4>
                <p className="fp-empty-desc">{isAr ? 'أضف غرفاً من القائمة لتظهر هنا وعلى المخطط.' : 'Add a room from the list to see it here and on the plan.'}</p>
                <button type="button" className="fp-wizard-trigger" style={{ marginTop: 12 }} onClick={() => setWizardOpen(true)}>
                  <Sparkles size={12} />
                  <span>{isAr ? 'فتح المعالج الذكي' : 'Open Wizard'}</span>
                </button>
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

          {unreachableRooms.length > 0 && (
            <div className="fp-recon warn fp-unreachable">
              <div className="fp-recon-text">
                <AlertTriangle size={14} className="fp-recon-icon" />
                <span>
                  {isAr
                    ? `${unreachableRooms.length === 1 ? 'غرفة بلا مدخل' : 'غرف بلا مدخل'}: `
                    : `${unreachableRooms.length === 1 ? 'Unreachable room' : 'Unreachable rooms'} — no door access: `}
                  <strong>{unreachableRooms.map(r => r.title).join(isAr ? '، ' : ', ')}</strong>
                </span>
              </div>
              <button
                type="button"
                className="fp-recon-review"
                onClick={() => {
                  const first = unreachableRooms[0];
                  if (first) selectZone(first.id, true);
                }}
              >
                {isAr ? 'عرض' : 'Show'}
              </button>
            </div>
          )}
        </div>

        {(() => {
        const listPanel = (
        <div className={`fp-list-panel ${listPortalTarget ? 'in-rail' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>
          <div className="fp-global-state" role="group" aria-label={isAr ? 'حالة التشطيب الإجمالية' : 'Global finishing state'}>
            <div className="fp-global-state-head">
              <div className="fp-global-state-title-wrap">
                <Paintbrush size={12} className="fp-global-state-icon" />
                <span className="fp-global-state-label">{isAr ? 'التشطيب العام' : 'FINISHING'}</span>
              </div>
              {propertyType === 'apartment' && (
                <button
                  type="button"
                  className="fp-wizard-trigger"
                  title={isAr ? 'توليد تخطيط بالمعالج الذكي' : 'Generate layout with AI wizard'}
                  onClick={() => setWizardOpen(true)}
                >
                  <Sparkles size={11} />
                  <span>{isAr ? 'المعالج الذكي' : 'Wizard'}</span>
                </button>
              )}
            </div>

            {/* Luxury Segmented Control */}
            <div className="fp-segmented-track">
              {GLOBAL_STATE_OPTIONS.map(opt => {
                const isActive = dominantState === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`fp-segmented-btn ${isActive ? 'active' : ''}`}
                    title={isAr
                      ? `تطبيق حالة ${opt.ar} على كل الغرف`
                      : `Apply ${opt.en === 'Semi' ? 'Semi-Finished' : opt.en} to all rooms`}
                    onClick={() => handleGlobalState(opt.id)}
                  >
                    <span className="fp-segmented-btn-icon">
                      {opt.icon === 'brick' && <Hammer size={12} />}
                      {opt.icon === 'crane' && <Construction size={12} />}
                      {opt.icon === 'sparkle' && <CheckCheck size={12} />}
                    </span>
                    <span className="fp-segmented-btn-txt">{isAr ? opt.ar : opt.en}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="fp-list-scroll" role="list">
            {(() => {
                const renderRow = (zone: ZoneInstance) => {
                  const idx = displayZones.findIndex(z => z.id === zone.id);
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
                        onSelect={() => {
                          if (propertyType === 'building') {
                            if (zone.zone_template_id === 'bld.unit') {
                              if (bldView.mode === 'elevation' || bldView.mode === 'floor') {
                                setBldView({ mode: 'unit', floorKey: zone.level_label || 'Floor 1', unitId: zone.id });
                                selectZone(zone.id);
                                return;
                              }
                            }
                            if (bldView.mode === 'elevation') {
                              if (zone.zone_template_id === 'bld.ground_lobby' || zone.zone_template_id === 'bld.basement' || zone.zone_template_id === 'bld.roof') {
                                const key = zone.zone_template_id === 'bld.ground_lobby' ? 'bld_ground' : zone.zone_template_id === 'bld.basement' ? 'bld_basement' : 'bld_roof';
                                setBldView({ mode: 'floor', floorKey: key });
                                selectZone(zone.id);
                                return;
                              }
                            }
                          }
                          selectZone(zone.id);
                        }}
                        onPatch={(updates) => handleUpdateSpatial(zone.id, updates)}
                        onRename={(next) => handleRenameRoom(zone.id, next)}
                        onDelete={() => handleRemoveRoom(zone.id, getZoneLabel(zone))}
                        onArrow={(dir) => moveSelection(dir)}
                        onReorder={(dir) => handleReorder(zone.id, idx + dir)}
                        onDragStart={(e) => handleRowDragStart(zone.id, e)}
                      />
                    </div>
                  );
                };

                return (
                  <>
                    {zoneGroups.groups.map(({ bucket, zones }) => {
                      const isOpen = groupAddOpen === bucket.key;
                      return (
                        <div
                          key={bucket.key}
                          className={`fp-group ${isOpen ? 'is-open' : ''}`}
                          style={{ zIndex: isOpen ? 50 : undefined, position: isOpen ? 'relative' : undefined }}
                        >
                          <div
                            className={`fp-group-head ${isOpen ? 'is-open' : ''}`}
                            style={{ zIndex: isOpen ? 60 : 10 }}
                          >
                            <span className="fp-group-title">
                              <span className="fp-group-title-icon">{renderCategoryIcon(bucket.key)}</span>
                              <span>{isAr ? bucket.ar : bucket.en}</span>
                            </span>
                            <span className="fp-group-count">{zones.length}</span>
                            <span className="fp-group-actions">
                              <span className="fp-group-addwrap" style={{ zIndex: isOpen ? 70 : undefined }}>
                                <button
                                  type="button"
                                  className="fp-group-btn"
                                  aria-haspopup="menu"
                                  aria-expanded={isOpen}
                                  aria-label={isAr ? `إضافة غرفة إلى ${bucket.ar}` : `Add room to ${bucket.en}`}
                                  onClick={() => {
                                    setGroupAddOpen(o => (o === bucket.key ? null : bucket.key));
                                    setCustomInputForGroup(null);
                                    setCustomGroupRoomName('');
                                  }}
                                >
                                  <Plus size={12} />
                                </button>
                                {isOpen && (
                                  <div className="fp-group-menu" role="menu">
                                    {bucket.addTemplates.filter(tid => DEFAULT_DIMENSIONS[tid]).map(tid => (
                                      <button
                                        key={tid}
                                        type="button"
                                        role="menuitem"
                                        className="fp-add-item"
                                        onClick={() => {
                                          setGroupAddOpen(null);
                                          setCustomInputForGroup(null);
                                          handleAddRoom(tid);
                                        }}
                                      >
                                        <Plus size={12} />
                                        <span>{isAr ? DEFAULT_DIMENSIONS[tid].titleAr : DEFAULT_DIMENSIONS[tid].titleEn}</span>
                                      </button>
                                    ))}

                                    <div className="fp-group-menu-divider" />

                                    {customInputForGroup === bucket.key ? (
                                      <div className="fp-group-menu-custom-row" onClick={e => e.stopPropagation()}>
                                        <input
                                          type="text"
                                          className="fp-group-menu-custom-input"
                                          autoFocus
                                          dir="auto"
                                          placeholder={isAr ? 'اسم الغرفة...' : 'Room name...'}
                                          value={customGroupRoomName}
                                          onChange={e => setCustomGroupRoomName(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              if (customGroupRoomName.trim()) {
                                                handleAddCustomZone(customGroupRoomName.trim());
                                                setCustomGroupRoomName('');
                                                setCustomInputForGroup(null);
                                                setGroupAddOpen(null);
                                              }
                                            } else if (e.key === 'Escape') {
                                              setCustomInputForGroup(null);
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          className="fp-group-menu-custom-btn"
                                          disabled={!customGroupRoomName.trim()}
                                          onClick={() => {
                                            if (customGroupRoomName.trim()) {
                                              handleAddCustomZone(customGroupRoomName.trim());
                                              setCustomGroupRoomName('');
                                              setCustomInputForGroup(null);
                                              setGroupAddOpen(null);
                                            }
                                          }}
                                        >
                                          <Plus size={11} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className="fp-add-item fp-add-custom-item"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCustomInputForGroup(bucket.key);
                                        }}
                                      >
                                        <Sparkles size={11} style={{ color: '#DDA752' }} />
                                        <span style={{ color: '#DDA752', fontWeight: 700 }}>
                                          {isAr ? '+ غرفة مخصصة...' : '+ Custom room...'}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </span>
                              {zones.length > 0 && (
                                <button
                                  type="button"
                                  className="fp-group-btn danger"
                                  aria-label={isAr ? `حذف قسم ${bucket.ar}` : `Delete ${bucket.en} section`}
                                  onClick={() => handleRemoveGroup(bucket, zones)}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </span>
                          </div>
                          {zones.map(renderRow)}
                        </div>
                      );
                    })}

                    {zoneGroups.other.length > 0 && (
                      <div className="fp-group">
                        <div className="fp-group-head">
                          <span className="fp-group-title">
                            <span className="fp-group-title-icon"><MapPin size={13} /></span>
                            <span>{isAr ? 'مناطق أخرى' : 'Other Areas'}</span>
                          </span>
                          <span className="fp-group-count">{zoneGroups.other.length}</span>
                        </div>
                        {zoneGroups.other.map(renderRow)}
                      </div>
                    )}
                  </>
                );
              })()}
          </div>

          <div className="fp-custom-zone">
            <span className="fp-custom-zone-label">
              <Sparkles size={11} />
              <span>{isAr ? 'إضافة منطقة مخصصة' : 'ADD CUSTOM ZONE'}</span>
            </span>
            <div className="fp-custom-zone-row">
              <input
                type="text"
                className="fp-custom-zone-input"
                dir="auto"
                maxLength={40}
                placeholder={isAr ? 'اسم المنطقة (مثل: غرفة غسيل)...' : 'Zone name (e.g. Laundry Room)...'}
                value={customZoneName}
                onChange={(e) => setCustomZoneName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddCustomZone(customZoneName); }
                }}
              />
              <button
                type="button"
                className="fp-custom-zone-btn"
                disabled={!customZoneName.trim()}
                aria-label={isAr ? 'إضافة المنطقة' : 'Add zone'}
                onClick={() => handleAddCustomZone(customZoneName)}
              >
                <Plus size={13} />
              </button>
            </div>
            <div className="fp-custom-zone-chips">
              {(SMART_ZONE_SUGGESTIONS[propertyType] ?? []).map(s => (
                <button
                  key={s.en}
                  type="button"
                  className="fp-custom-zone-chip"
                  onClick={() => handleAddCustomZone(isAr ? s.ar : s.en)}
                >
                  <Plus size={10} />
                  <span>{isAr ? s.ar : s.en}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        );
        return listPortalTarget ? createPortal(listPanel, listPortalTarget) : listPanel;
        })()}

      </div>

      {wizardOpen && (
        <div className="fp-wizard-overlay" role="dialog" aria-modal="true" aria-label={isAr ? 'معالج توليد التخطيط الذكي' : 'Smart layout generation wizard'}>
          <div className="fp-wizard-modal">
            {/* ─── Dynamic Adaptive Header ─── */}
            <div className="fp-wizard-head">
              <div className="fp-wizard-head-title">
                {propertyType === 'apartment' && subtype === 'duplex' ? (
                  <>
                    <Building size={16} />
                    <span>{isAr ? 'معالج التوليد المعماري للدوبلكس (طابقين)' : 'Smart Duplex Multi-Floor Wizard'}</span>
                  </>
                ) : propertyType === 'apartment' && subtype === 'standard_roof' ? (
                  <>
                    <Trees size={16} />
                    <span>{isAr ? 'معالج التوليد للروف العادي (شقة بسيطة على السطح)' : 'Standard Roof Wizard — Basic Flat on Rooftop'}</span>
                  </>
                ) : propertyType === 'apartment' && subtype === 'full_roof' ? (
                  <>
                    <Trees size={16} />
                    <span>{isAr ? 'معالج الروف البريميم (وحدة أ + وحدة ب + سطح مكشوف)' : 'Premium Roof Wizard — Unit A + Unit B + Open Rooftop'}</span>
                  </>
                ) : propertyType === 'building' ? (
                  <>
                    <Building size={16} />
                    <span>{isAr ? 'معالج التوليد المعماري للعمارات والأبراج' : 'Smart Building Architecture Wizard'}</span>
                  </>
                ) : propertyType === 'garage' ? (
                  <>
                    <Car size={16} />
                    <span>{isAr ? 'معالج تخطيط وتوزيع الجراجات والمواقف' : 'Smart Garage & Parking Wizard'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>{isAr ? 'معالج التوليد المعماري للشقق السكنية' : 'Smart Apartment Layout Wizard'}</span>
                  </>
                )}
              </div>
              <button type="button" className="fp-wizard-close-btn" aria-label={isAr ? 'إغلاق' : 'Close'} onClick={() => setWizardOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="fp-wizard-body">
              {/* ════════════════════════════════════════════════════════════════ */}
              {/* VARIANT A: DUPLEX (طابقين)                                     */}
              {/* ════════════════════════════════════════════════════════════════ */}
              {propertyType === 'apartment' && subtype === 'duplex' && (
                <>
                  {/* Lower Level Spaces */}
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '١. مساحات الدور السفلي / الأرضي' : '1. Lower Level Spaces'}
                    </span>
                    <div className="fp-wizard-grid-4">
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'قطع الريسبشن' : 'Reception Sections'}</span>
                        <input
                          type="number" min={1} max={5} dir="ltr"
                          value={wizard.duplexReceptionSections}
                          onChange={(e) => setWizard(w => ({ ...w, duplexReceptionSections: Math.max(1, Math.min(5, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                    </div>
                    <div className="fp-wizard-toggles">
                      {([
                        ['duplexSeparateDining', isAr ? 'غرفة طعام منفصلة (Dining)' : 'Formal Dining Hall'],
                        ['duplexGuestToilet', isAr ? 'حمام ضيوف سفلي' : 'Lower Powder Room'],
                        ['duplexGroundGarden', isAr ? 'حديقة وتراس خاص' : 'Private Garden & Patio'],
                        ['duplexLaundry', isAr ? 'غرفة غسيل / مخزن' : 'Laundry / Storage'],
                      ] as Array<[keyof AdaptiveWizardAnswers, string]>).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`fp-wizard-toggle ${wizard[key] ? 'on' : ''}`}
                          aria-pressed={Boolean(wizard[key])}
                          onClick={() => setWizard(w => ({ ...w, [key]: !w[key] }))}
                        >
                          {wizard[key] ? <Check size={12} /> : <Plus size={12} />}
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upper Level Spaces */}
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '٢. أجنحة وغرف الدور العلوي' : '2. Upper Level Suites & Bedrooms'}
                    </span>
                    <div className="fp-wizard-grid-4">
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'إجمالي غرف النوم' : 'Total Bedrooms'}</span>
                        <input
                          type="number" min={1} max={6} dir="ltr"
                          value={wizard.duplexUpperBedrooms}
                          onChange={(e) => setWizard(w => ({ ...w, duplexUpperBedrooms: Math.max(1, Math.min(6, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'الحمامات العلوية' : 'Upper Bathrooms'}</span>
                        <input
                          type="number" min={1} max={4} dir="ltr"
                          value={wizard.duplexUpperBaths}
                          onChange={(e) => setWizard(w => ({ ...w, duplexUpperBaths: Math.max(1, Math.min(4, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'بلكونات علوية' : 'Upper Balconies'}</span>
                        <input
                          type="number" min={0} max={4} dir="ltr"
                          value={wizard.duplexUpperBalconies}
                          onChange={(e) => setWizard(w => ({ ...w, duplexUpperBalconies: Math.max(0, Math.min(4, Number(e.target.value) || 0)) }))}
                        />
                      </label>
                    </div>
                    <div className="fp-wizard-toggles">
                      <button
                        type="button"
                        className={`fp-wizard-toggle ${wizard.duplexUpperLiving ? 'on' : ''}`}
                        aria-pressed={Boolean(wizard.duplexUpperLiving)}
                        onClick={() => setWizard(w => ({ ...w, duplexUpperLiving: !w.duplexUpperLiving }))}
                      >
                        {wizard.duplexUpperLiving ? <Check size={12} /> : <Plus size={12} />}
                        <span>{isAr ? 'صالة معيشة عائلية (Family Living)' : 'Upper Family Lounge'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Connecting Architecture & Maid */}
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '٣. عناصر الربط والخدمات' : '3. Circulation & Staff Quarters'}
                    </span>
                    <div className="fp-wizard-toggles">
                      <button
                        type="button"
                        className={`fp-wizard-toggle ${wizard.duplexInternalStairs ? 'on' : ''}`}
                        aria-pressed={Boolean(wizard.duplexInternalStairs)}
                        onClick={() => setWizard(w => ({ ...w, duplexInternalStairs: !w.duplexInternalStairs }))}
                      >
                        {wizard.duplexInternalStairs ? <Check size={12} /> : <Plus size={12} />}
                        <span>{isAr ? 'سلم داخلي يربط الدورين' : 'Internal Connecting Staircase'}</span>
                      </button>
                      <button
                        type="button"
                        className={`fp-wizard-toggle ${wizard.duplexMaidRoom ? 'on' : ''}`}
                        aria-pressed={Boolean(wizard.duplexMaidRoom)}
                        onClick={() => setWizard(w => ({ ...w, duplexMaidRoom: !w.duplexMaidRoom }))}
                      >
                        {wizard.duplexMaidRoom ? <Check size={12} /> : <Plus size={12} />}
                        <span>{isAr ? 'غرفة خادمة بحمام مستقل' : "Maid's Room with En-Suite"}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ════════════════════════════════════════════════════════════════ */}
              {/* VARIANT B1: STANDARD ROOF (روف عادي)                                   */}
              {/* ════════════════════════════════════════════════════════════════ */}
              {propertyType === 'apartment' && subtype === 'standard_roof' && (
                <>
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? 'مساحات الشقة على السطح' : 'Rooftop Apartment Rooms'}
                    </span>
                    <div className="fp-wizard-grid-4">
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'غرف النوم' : 'Bedrooms'}</span>
                        <input
                          type="number" min={1} max={5} dir="ltr"
                          value={wizard.stdRoofBedrooms}
                          onChange={(e) => setWizard(w => ({ ...w, stdRoofBedrooms: Math.max(1, Math.min(5, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'الحمامات' : 'Bathrooms'}</span>
                        <input
                          type="number" min={1} max={4} dir="ltr"
                          value={wizard.stdRoofBathrooms}
                          onChange={(e) => setWizard(w => ({ ...w, stdRoofBathrooms: Math.max(1, Math.min(4, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                    </div>
                    <div className="fp-wizard-toggles">
                      {([
                        ['stdRoofGuestToilet', isAr ? 'حمام ضيوف' : 'Guest Toilet'],
                        ['stdRoofBalcony', isAr ? 'بلكونة' : 'Balcony'],
                        ['stdRoofLaundry', isAr ? 'غرفة غسيل / مخزن' : 'Laundry / Storage'],
                      ] as Array<[keyof AdaptiveWizardAnswers, string]>).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`fp-wizard-toggle ${wizard[key] ? 'on' : ''}`}
                          aria-pressed={Boolean(wizard[key])}
                          onClick={() => setWizard(w => ({ ...w, [key]: !w[key] }))}
                        >
                          {wizard[key] ? <Check size={12} /> : <Plus size={12} />}
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ════════════════════════════════════════════════════════════════ */}
              {/* VARIANT B2: PREMIUM ROOF (روف بريميم)                                */}
              {/* ════════════════════════════════════════════════════════════════ */}
              {propertyType === 'apartment' && subtype === 'full_roof' && (
                <>
                  {/* Unit A */}
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '١. وحدة أ — 150م² (الشقة الأولى)' : '1. Unit A — 150m² (First Apartment)'}
                    </span>
                    <div className="fp-wizard-grid-4">
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'غرف النوم' : 'Bedrooms'}</span>
                        <input
                          type="number" min={1} max={5} dir="ltr"
                          value={wizard.premiumRoofUnitABedrooms}
                          onChange={(e) => setWizard(w => ({ ...w, premiumRoofUnitABedrooms: Math.max(1, Math.min(5, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'الحمامات' : 'Bathrooms'}</span>
                        <input
                          type="number" min={1} max={4} dir="ltr"
                          value={wizard.premiumRoofUnitABaths}
                          onChange={(e) => setWizard(w => ({ ...w, premiumRoofUnitABaths: Math.max(1, Math.min(4, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Unit B */}
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '٢. وحدة ب — 150م² (الشقة المقابلة)' : '2. Unit B — 150m² (Facing Apartment)'}
                    </span>
                    <div className="fp-wizard-grid-4">
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'غرف النوم' : 'Bedrooms'}</span>
                        <input
                          type="number" min={1} max={5} dir="ltr"
                          value={wizard.premiumRoofUnitBBedrooms}
                          onChange={(e) => setWizard(w => ({ ...w, premiumRoofUnitBBedrooms: Math.max(1, Math.min(5, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'الحمامات' : 'Bathrooms'}</span>
                        <input
                          type="number" min={1} max={4} dir="ltr"
                          value={wizard.premiumRoofUnitBBaths}
                          onChange={(e) => setWizard(w => ({ ...w, premiumRoofUnitBBaths: Math.max(1, Math.min(4, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Open Rooftop — Plain slab */}
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '٣. السطح المكشوف — مساحة السطح بالكامل فوق الدور' : '3. Open Rooftop — Full Building Footprint Above'}
                    </span>
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Check size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
                      <span>
                        {isAr
                          ? 'السطح المكشوف بالكامل مسجل كطابق علوي مستقل في المخطط الهندسي (سطح مفتوح).'
                          : 'The full open rooftop slab is automatically included as an upper floor level in the CAD blueprint.'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* ════════════════════════════════════════════════════════════════ */}
              {/* VARIANT C: ENTIRE BUILDING (عمارة كاملة)                       */}
              {/* ════════════════════════════════════════════════════════════════ */}
              {propertyType === 'building' && (
                <>
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '١. الهيكل وعدد الأدوار السكنية' : '1. Building Metrology & Floor Counts'}
                    </span>
                    <div className="fp-wizard-grid-4">
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'الأدوار المتكررة' : 'Typical Floors'}</span>
                        <input
                          type="number" min={1} max={12} dir="ltr"
                          value={wizard.buildingTypicalFloors}
                          onChange={(e) => setWizard(w => ({ ...w, buildingTypicalFloors: Math.max(1, Math.min(12, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'شقق بالدور' : 'Units / Floor'}</span>
                        <input
                          type="number" min={1} max={6} dir="ltr"
                          value={wizard.buildingUnitsPerFloor}
                          onChange={(e) => setWizard(w => ({ ...w, buildingUnitsPerFloor: Math.max(1, Math.min(6, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'غرف كل شقة' : 'Beds / Unit'}</span>
                        <input
                          type="number" min={1} max={5} dir="ltr"
                          value={wizard.buildingBedsPerUnit}
                          onChange={(e) => setWizard(w => ({ ...w, buildingBedsPerUnit: Math.max(1, Math.min(5, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'محلات تجارية' : 'Retail Shops'}</span>
                        <input
                          type="number" min={0} max={6} dir="ltr"
                          value={wizard.buildingCommercialShops}
                          onChange={(e) => setWizard(w => ({ ...w, buildingCommercialShops: Math.max(0, Math.min(6, Number(e.target.value) || 0)) }))}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '٢. مرافق البدروم والأرضي والسطح' : '2. Basement, Ground & Roof Facilities'}
                    </span>
                    <div className="fp-wizard-toggles">
                      {([
                        ['buildingHasBasement', isAr ? 'بدروم جراج ومواقف' : 'Basement Parking Garage'],
                        ['buildingHasGuardRoom', isAr ? 'غرفة حارس وأمن' : 'Security Guard Room'],
                        ['buildingHasRoofTerrace', isAr ? 'تراس السطح المشترك' : 'Panoramic Sky Roof Deck'],
                      ] as Array<[keyof AdaptiveWizardAnswers, string]>).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`fp-wizard-toggle ${wizard[key] ? 'on' : ''}`}
                          aria-pressed={Boolean(wizard[key])}
                          onClick={() => setWizard(w => ({ ...w, [key]: !w[key] }))}
                        >
                          {wizard[key] ? <Check size={12} /> : <Plus size={12} />}
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ════════════════════════════════════════════════════════════════ */}
              {/* VARIANT D: GARAGE (جراج خاص أو تجاري)                          */}
              {/* ════════════════════════════════════════════════════════════════ */}
              {propertyType === 'garage' && (
                <>
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '١. سعة المواقف والسيارات' : '1. Parking Capacity & Bays'}
                    </span>
                    <div className="fp-wizard-grid-4">
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'عدد باكيات السيارات' : 'Parking Bays'}</span>
                        <input
                          type="number" min={1} max={30} dir="ltr"
                          value={wizard.garageBays}
                          onChange={(e) => setWizard(w => ({ ...w, garageBays: Math.max(1, Math.min(30, Number(e.target.value) || 1)) }))}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '٢. التجهيزات الكهربائية والخدمية' : '2. Utilities & Charging Facilities'}
                    </span>
                    <div className="fp-wizard-toggles">
                      {([
                        ['garageHasEvCharger', isAr ? 'شاحن سيارات كهربائية EV' : 'EV Fast Charging Station'],
                        ['garageHasCarWash', isAr ? 'باكية غسيل وخدمة' : 'Car Wash & Detail Bay'],
                        ['garageHasSecurityBooth', isAr ? 'كشك أمن ومراقبة' : 'Security & CCTV Booth'],
                        ['garageHasStorage', isAr ? 'لوحة كهرباء ومخزن' : 'Electrical Board & Storage'],
                      ] as Array<[keyof AdaptiveWizardAnswers, string]>).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`fp-wizard-toggle ${wizard[key] ? 'on' : ''}`}
                          aria-pressed={Boolean(wizard[key])}
                          onClick={() => setWizard(w => ({ ...w, [key]: !w[key] }))}
                        >
                          {wizard[key] ? <Check size={12} /> : <Plus size={12} />}
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ════════════════════════════════════════════════════════════════ */}
              {/* VARIANT E: STANDARD APARTMENT (شقة سكنية عادية)                 */}
              {/* ════════════════════════════════════════════════════════════════ */}
              {propertyType === 'apartment' && subtype !== 'duplex' && subtype !== 'standard_roof' && subtype !== 'full_roof' && (
                <>
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '١. المكونات الأساسية للشقة' : '1. Core Apartment Components'}
                    </span>
                    <div className="fp-wizard-grid-4">
                      {/* Living / Reception */}
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'الريسبشن / الصالة' : 'Living / Reception'}</span>
                        <input
                          type="number" min={1} max={4} dir="ltr"
                          value={wizard.livingRooms || 1}
                          onChange={(e) => setWizard(w => ({ ...w, livingRooms: Math.max(1, Math.min(4, Number(e.target.value) || 1)) }))}
                        />
                      </label>

                      {/* Bedrooms */}
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'غرف النوم' : 'Bedrooms'}</span>
                        <input
                          type="number" min={1} max={8} dir="ltr"
                          value={wizard.bedrooms}
                          onChange={(e) => setWizard(w => ({ ...w, bedrooms: Math.max(1, Math.min(8, Number(e.target.value) || 1)) }))}
                        />
                      </label>

                      {/* Bathrooms */}
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'الحمامات' : 'Bathrooms'}</span>
                        <input
                          type="number" min={1} max={6} dir="ltr"
                          value={wizard.bathrooms}
                          onChange={(e) => setWizard(w => ({ ...w, bathrooms: Math.max(1, Math.min(6, Number(e.target.value) || 1)) }))}
                        />
                      </label>

                      {/* Balconies */}
                      <label className="fp-wizard-field">
                        <span className="fp-wizard-label-text">{isAr ? 'البلكونات' : 'Balconies'}</span>
                        <input
                          type="number" min={0} max={6} dir="ltr"
                          value={wizard.balconies ?? 1}
                          onChange={(e) => setWizard(w => ({ ...w, balconies: Math.max(0, Math.min(6, Number(e.target.value) || 0)) }))}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Typical Egyptian Middle-Class Unit Spaces */}
                  <div className="fp-wizard-section">
                    <span className="fp-wizard-section-title">
                      {isAr ? '٢. مساحات وتوزيعات إضافية' : '2. Extra Layout Spaces'}
                    </span>
                    <div className="fp-wizard-toggles">
                      {([
                        ['guestToilet', isAr ? 'حمام ضيوف (Guest Toilet)' : 'Guest Toilet'],
                        ['separateDining', isAr ? 'سفرة / صالون مستقل' : 'Dining / Salon Area'],
                        ['laundryRoom', isAr ? 'غرفة غسيل / مخزن' : 'Laundry / Storage'],
                        ['maidRoom', isAr ? 'غرفة خادمة / مساعدة' : "Maid's Room"],
                        ['dressingRoom', isAr ? 'غرفة ملابس ماستر (Dressing)' : 'Master Dressing Room'],
                      ] as Array<[keyof AdaptiveWizardAnswers, string]>).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          className={`fp-wizard-toggle ${wizard[key] ? 'on' : ''}`}
                          aria-pressed={Boolean(wizard[key])}
                          onClick={() => setWizard(w => ({ ...w, [key]: !w[key] }))}
                        >
                          {wizard[key] ? <Check size={12} /> : <Plus size={12} />}
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ─── Global Finishing Level (All Types) ─── */}
              <div className="fp-wizard-section">
                <span className="fp-wizard-section-title">
                  {propertyType === 'apartment' && subtype === 'duplex'
                    ? (isAr ? '٤. مستوى تشطيب الدوبلكس الأولي' : '4. Initial Duplex Finishing Level')
                    : (isAr ? '٣. مستوى تشطيب المخطط الأولي' : '3. Initial Finishing Level')}
                </span>
                <div className="fp-wizard-fin-track">
                  {GLOBAL_STATE_OPTIONS.map(opt => {
                    const isActive = wizard.globalFinishing === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`fp-wizard-fin-btn ${isActive ? 'active' : ''}`}
                        onClick={() => setWizard(w => ({ ...w, globalFinishing: opt.id }))}
                      >
                        <span className="fp-wizard-fin-icon">
                          {opt.icon === 'brick' && <Hammer size={13} />}
                          {opt.icon === 'crane' && <Construction size={13} />}
                          {opt.icon === 'sparkle' && <CheckCheck size={13} />}
                        </span>
                        <span>{isAr ? opt.ar : opt.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── Real-Time Summary & Actions Footer ─── */}
            <div className="fp-wizard-footer">
              <div className="fp-wizard-footer-summary">
                {propertyType === 'apartment' && subtype === 'duplex' ? (
                  <span>
                    {wizard.duplexReceptionSections + (wizard.duplexSeparateDining ? 1 : 0) + 2 + (wizard.duplexGuestToilet ? 1 : 0) + (wizard.duplexGroundGarden ? 1 : 0) + (wizard.duplexLaundry ? 1 : 0) + 2 + (wizard.duplexUpperLiving ? 1 : 0) + Math.max(0, wizard.duplexUpperBedrooms - 1) + Math.max(1, wizard.duplexUpperBaths - 1) + wizard.duplexUpperBalconies + 1 + (wizard.duplexInternalStairs ? 2 : 0) + (wizard.duplexMaidRoom ? 1 : 0)}{' '}
                    {isAr ? 'غرف ومساحات عبر طابقين جاهزة' : 'spaces across 2 levels ready'}
                  </span>
                ) : propertyType === 'apartment' && subtype === 'standard_roof' ? (
                  <span>
                    {3 + wizard.stdRoofBedrooms + wizard.stdRoofBathrooms + (wizard.stdRoofGuestToilet ? 1 : 0) + (wizard.stdRoofBalcony ? 1 : 0) + (wizard.stdRoofLaundry ? 1 : 0)}{' '}
                    {isAr ? 'غرفة على السطح جاهزة' : 'rooftop flat spaces ready'}
                  </span>
                ) : propertyType === 'apartment' && subtype === 'full_roof' ? (
                  <span>
                    {(4 + wizard.premiumRoofUnitABedrooms + wizard.premiumRoofUnitABaths) + (4 + wizard.premiumRoofUnitBBedrooms + wizard.premiumRoofUnitBBaths) + 1}{' '}
                    {isAr ? 'وحدة أ + وحدة ب + سطح مكشوف جاهزة' : 'Unit A + Unit B + open roof ready'}
                  </span>
                ) : propertyType === 'building' ? (
                  <span>
                    {(wizard.buildingHasBasement ? 2 : 0) + 5 + (wizard.buildingHasGuardRoom ? 1 : 0) + wizard.buildingCommercialShops + wizard.buildingTypicalFloors * (4 + wizard.buildingUnitsPerFloor) + 2 + (wizard.buildingHasRoofTerrace ? 1 : 0)}{' '}
                    {isAr ? `وحدات ومرافق عبر ${wizard.buildingTypicalFloors + 2} أدوار جاهزة` : `units & cores across ${wizard.buildingTypicalFloors + 2} floors ready`}
                  </span>
                ) : propertyType === 'garage' ? (
                  <span>
                    {2 + wizard.garageBays + (wizard.garageHasEvCharger ? 1 : 0) + (wizard.garageHasCarWash ? 1 : 0) + (wizard.garageHasSecurityBooth ? 1 : 0) + (wizard.garageHasStorage ? 1 : 0)}{' '}
                    {isAr ? `باكيات ومرافق جراج جاهزة` : `bays & facilities ready`}
                  </span>
                ) : (
                  <span>
                    {templatesFromAnswers(wizard).length + (wizard.maidRoom ? 1 : 0) + (wizard.dressingRoom ? 1 : 0)}{' '}
                    {isAr ? 'غرف ومساحات جاهزة للتوليد' : 'spaces ready to generate'}
                  </span>
                )}
              </div>
              <div className="fp-wizard-actions">
                <button type="button" className="fp-wizard-cancel-btn" onClick={() => setWizardOpen(false)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="button" className="fp-wizard-generate-btn" onClick={handleGenerateFromWizard}>
                  <Sparkles size={14} />
                  <span>{isAr ? 'توليد المخطط الآن' : 'Generate Blueprint Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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


        .fp-floor-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px;
          border-radius: 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--fp-line);
        }

        .fp-floor-tabs-scroll {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
          overflow-x: auto;
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

        .fp-workspace.no-list {
          display: block;
          width: 100%;
        }

        .fp-workspace.no-list .fp-canvas-panel {
          width: 100%;
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
          max-height: min(74vh, 820px);
          aspect-ratio: 680 / 440;
          border-radius: 10px;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        .fp-canvas-svg text {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          pointer-events: none;
        }

        .fp-canvas-svg * {
          -webkit-user-drag: none;
        }

        @keyframes fpViewTransition {
          0% {
            opacity: 0;
            transform: scale(0.976) translateY(5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .fp-view-animated {
          animation: fpViewTransition 220ms cubic-bezier(0.23, 1, 0.32, 1) both;
          transform-origin: 50% 50%;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .fp-view-animated {
            animation: fpFade 160ms ease both;
          }
        }

        .fp-canvas-svg g[role="button"] {
          outline: none;
        }

        .fp-canvas-svg g[role="button"]:focus-visible {
          outline: 2px solid rgba(221, 167, 82, 0.65);
          outline-offset: 2px;
        }

        .fp-elev-floor-group {
          cursor: pointer;
          transition: transform 0.16s ease, filter 0.16s ease;
        }

        .fp-elev-floor-bg {
          fill: rgba(221, 167, 82, 0.02);
          stroke: rgba(221, 167, 82, 0.2);
          stroke-width: 1px;
          transition: fill 0.18s cubic-bezier(0.2,0,0,1), stroke 0.18s cubic-bezier(0.2,0,0,1);
        }

        .fp-elev-floor-group:hover .fp-elev-floor-bg {
          fill: rgba(221, 167, 82, 0.08);
          stroke: rgba(221, 167, 82, 0.7);
        }

        .fp-elev-floor-group:hover .fp-elev-card-border {
          stroke: #DDA752;
          fill: rgba(221, 167, 82, 0.1);
        }

        .fp-elev-floor-group:hover {
          filter: drop-shadow(0 0 10px rgba(221, 167, 82, 0.35));
        }

        .fp-elev-datum {
          pointer-events: none;
          opacity: 0.85;
          transition: opacity 0.16s ease;
        }

        .fp-elev-floor-group:hover .fp-elev-datum {
          opacity: 1;
        }

        .fp-cad-fixtures {
          transition: opacity 0.18s ease;
        }

        .fp-canvas-svg g[role="button"]:hover .fp-cad-fixtures {
          opacity: 0.95;
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

        .fp-global-state-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .fp-wizard-trigger {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          border-radius: 9999px;
          font-size: 0.6rem;
          font-weight: 800;
          cursor: pointer;
          background: rgba(221,167,82,0.10);
          border: 1px solid rgba(221,167,82,0.35);
          color: var(--fp-gold);
          transition: background-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-wizard-trigger:hover { background: rgba(221,167,82,0.2); }
        .fp-wizard-trigger:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        .fp-wizard-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          padding: 10px 22px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 800;
          cursor: pointer;
          background: var(--fp-gold-grad);
          border: none;
          color: #0A0E18;
          transition: opacity 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-wizard-cta:hover { opacity: 0.92; }
        .fp-wizard-cta:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        .fp-wizard-overlay {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(6, 9, 16, 0.72);
          backdrop-filter: blur(6px);
        }

        /* ── 2-Choice Setup Onboarding Card ── */
        .fp-onboarding-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 620px;
          width: 100%;
          padding: 2.25rem 1.25rem;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .fp-onboarding-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #DDA752;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(221, 167, 82, 0.10);
          border: 1px solid rgba(221, 167, 82, 0.25);
          margin-bottom: 0.75rem;
        }

        .fp-onboarding-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--fp-text);
          margin: 0 0 0.5rem;
        }

        .fp-onboarding-desc {
          font-size: 0.8125rem;
          color: var(--fp-text-dim);
          margin: 0 0 1.75rem;
          max-width: 480px;
          line-height: 1.5;
        }

        .fp-onboarding-choices {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          width: 100%;
        }

        @media (max-width: 600px) {
          .fp-onboarding-choices {
            grid-template-columns: 1fr;
          }
        }

        .fp-choice-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px 18px 20px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid var(--fp-line);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        }

        .fp-choice-card:hover {
          transform: translateY(-2px);
          border-color: rgba(221, 167, 82, 0.6);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
          background: rgba(255, 255, 255, 0.05);
        }

        .fp-choice-card.recommended {
          border-color: rgba(221, 167, 82, 0.45);
          background: linear-gradient(180deg, rgba(221, 167, 82, 0.06), rgba(255, 255, 255, 0.02));
        }

        .fp-choice-badge {
          position: absolute;
          top: -9px;
          inset-inline-start: 16px;
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 2px 8px;
          border-radius: 999px;
          background: linear-gradient(135deg, #DDA752, #B8860B);
          color: #0A0E18;
        }

        .fp-choice-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(221, 167, 82, 0.12);
          color: #DDA752;
          margin-bottom: 12px;
        }

        .fp-choice-icon-box.secondary {
          background: rgba(255, 255, 255, 0.06);
          color: var(--fp-text-dim);
        }

        .fp-choice-name {
          font-size: 1rem;
          font-weight: 800;
          color: var(--fp-text);
          margin: 0 0 6px;
        }

        .fp-choice-info {
          font-size: 0.72rem;
          color: var(--fp-text-dim);
          line-height: 1.45;
          margin: 0 0 18px;
          flex: 1;
        }

        .fp-choice-action-btn {
          width: 100%;
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 9px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .fp-choice-action-btn.primary {
          background: linear-gradient(135deg, #DDA752, #B8860B);
          border: none;
          color: #0A0E18;
        }

        .fp-choice-action-btn.outline {
          background: transparent;
          border: 1px solid var(--fp-line);
          color: var(--fp-text);
        }

        .fp-choice-action-btn.outline:hover {
          border-color: #DDA752;
          color: #DDA752;
        }

        /* ── Upgraded Smart Wizard Modal ── */
        .fp-wizard-modal {
          width: min(520px, 100%);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          border-radius: 18px;
          background: #0D1220;
          border: 1px solid rgba(221, 167, 82, 0.35);
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.8);
          overflow: hidden;
        }

        [data-theme="light"] .fp-wizard-modal {
          background: #FFFFFF;
          border-color: rgba(184, 134, 11, 0.35);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .fp-wizard-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(221, 167, 82, 0.15);
          background: rgba(10, 14, 24, 0.5);
        }

        .fp-wizard-head-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 800;
          color: #DDA752;
        }

        .fp-wizard-close-btn {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .fp-wizard-close-btn:hover {
          color: #DDA752;
          border-color: #DDA752;
        }

        .fp-wizard-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow-y: auto;
        }

        .fp-wizard-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fp-wizard-section-title {
          font-size: 0.78rem;
          font-weight: 800;
          color: #DDA752;
          letter-spacing: 0.04em;
        }

        .fp-wizard-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        @media (max-width: 520px) {
          .fp-wizard-grid-4 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .fp-wizard-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(221, 167, 82, 0.16);
          border-radius: 9px;
          padding: 8px 10px;
          transition: all 0.15s ease;
        }

        .fp-wizard-field:focus-within {
          border-color: #DDA752;
          background: rgba(221, 167, 82, 0.04);
        }

        .fp-wizard-label-text {
          font-size: 0.65rem;
          font-weight: 700;
          color: rgba(237, 232, 221, 0.6);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        [data-theme="light"] .fp-wizard-label-text {
          color: #64748B;
        }

        .fp-wizard-field input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: #EDE8DD;
          font-size: 1rem;
          font-weight: 800;
          font-family: monospace;
          text-align: center;
        }

        [data-theme="light"] .fp-wizard-field input {
          color: #0F172A;
        }

        /* ── Extra Spaces Toggles ── */
        .fp-wizard-toggles {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .fp-wizard-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(221, 167, 82, 0.18);
          color: rgba(237, 232, 221, 0.7);
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .fp-wizard-toggle:hover {
          border-color: rgba(221, 167, 82, 0.4);
          color: #EDE8DD;
        }

        .fp-wizard-toggle.on {
          background: rgba(221, 167, 82, 0.14);
          border-color: #DDA752;
          color: #DDA752;
          font-weight: 800;
        }

        /* ── Finishing Track Switcher ── */
        .fp-wizard-fin-track {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          background: rgba(10, 14, 24, 0.7);
          border: 1px solid rgba(221, 167, 82, 0.18);
          border-radius: 10px;
          padding: 3px;
        }

        [data-theme="light"] .fp-wizard-fin-track {
          background: #E2E8F0;
        }

        .fp-wizard-fin-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 6px;
          border-radius: 7px;
          background: transparent;
          border: none;
          color: rgba(237, 232, 221, 0.6);
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        [data-theme="light"] .fp-wizard-fin-btn {
          color: #64748B;
        }

        .fp-wizard-fin-btn:hover:not(.active) {
          color: #EDE8DD;
          background: rgba(255, 255, 255, 0.04);
        }

        .fp-wizard-fin-btn.active {
          background: linear-gradient(135deg, #DDA752, #B8860B);
          color: #0A0E18;
          font-weight: 800;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
        }

        .fp-wizard-fin-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .fp-wizard-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: rgba(10, 14, 24, 0.85);
          border-top: 1px solid rgba(221, 167, 82, 0.15);
        }

        [data-theme="light"] .fp-wizard-footer {
          background: #F1F5F9;
        }

        .fp-wizard-footer-summary {
          font-size: 0.7rem;
          font-weight: 700;
          color: rgba(237, 232, 221, 0.6);
          font-family: monospace;
        }

        .fp-wizard-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .fp-wizard-cancel-btn {
          padding: 8px 14px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(237, 232, 221, 0.7);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .fp-wizard-cancel-btn:hover {
          color: #EDE8DD;
          border-color: rgba(255, 255, 255, 0.3);
        }

        .fp-wizard-generate-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          background: linear-gradient(135deg, #DDA752, #B8860B);
          border: none;
          color: #0A0E18;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(221, 167, 82, 0.3);
          transition: all 0.15s ease;
        }

        .fp-wizard-generate-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(221, 167, 82, 0.45);
        }

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

        .fp-workspace.no-list {
          grid-template-columns: 1fr;
        }

        .fp-list-panel.in-rail {
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
          height: 100%;
          border: none;
          border-radius: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: var(--fp-text);
        }

        .fp-list-panel.in-rail .fp-list-scroll {
          max-height: none;
          flex: 1;
        }

        .fp-list-panel.in-rail .fp-row-line2,
        .fp-list-panel.in-rail .fp-row-line3 {
          display: none;
        }

        .fp-list-panel.in-rail .fp-row {
          padding: 10px 12px;
        }

        .fp-global-state {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 14px;
          border-block-end: 1px solid var(--fp-line);
          background: rgba(255, 255, 255, 0.015);
        }

        [data-theme="light"] .fp-global-state {
          background: rgba(0, 0, 0, 0.015);
        }

        .fp-global-state-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .fp-global-state-title-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .fp-global-state-icon {
          color: var(--fp-gold);
          opacity: 0.85;
        }

        .fp-global-state-label {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--fp-text-dim);
          text-transform: uppercase;
        }

        .fp-wizard-trigger {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 0.65rem;
          font-weight: 700;
          cursor: pointer;
          background: rgba(221, 167, 82, 0.10);
          border: 1px solid rgba(221, 167, 82, 0.35);
          color: var(--fp-gold);
          transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
        }

        .fp-wizard-trigger:hover {
          background: rgba(221, 167, 82, 0.22);
          border-color: var(--fp-gold);
          transform: translateY(-0.5px);
        }

        .fp-wizard-trigger:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        .fp-segmented-track {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3px;
          padding: 3px;
          background: rgba(10, 14, 24, 0.7);
          border: 1px solid var(--fp-line);
          border-radius: 10px;
        }

        [data-theme="light"] .fp-segmented-track {
          background: #F1F5F9;
        }

        .fp-segmented-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 32px;
          padding: 0 6px;
          border-radius: 7px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--fp-text-dim);
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.2, 0, 0, 1);
          white-space: nowrap;
        }

        .fp-segmented-btn:hover:not(.active) {
          color: var(--fp-text);
          background: rgba(255, 255, 255, 0.05);
        }

        [data-theme="light"] .fp-segmented-btn:hover:not(.active) {
          background: rgba(0, 0, 0, 0.04);
        }

        .fp-segmented-btn.active {
          background: rgba(221, 167, 82, 0.16);
          border-color: rgba(221, 167, 82, 0.5);
          color: var(--fp-gold);
          font-weight: 800;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }

        [data-theme="light"] .fp-segmented-btn.active {
          background: #FFFFFF;
          border-color: rgba(221, 167, 82, 0.6);
          color: #B8860B;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .fp-segmented-btn-icon {
          font-size: 0.82rem;
          display: inline-flex;
          line-height: 1;
        }

        .fp-segmented-btn-txt {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          padding-bottom: 8px;
        }

        .fp-custom-zone {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 14px 18px;
          background: rgba(10, 14, 24, 0.6);
          border-top: 1px dashed var(--fp-line);
          flex-shrink: 0;
        }

        [data-theme="light"] .fp-custom-zone {
          background: #F1F5F9;
        }

        .fp-custom-zone-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--fp-gold);
        }

        .fp-custom-zone-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fp-custom-zone-input {
          flex: 1;
          height: 36px;
          padding: 0 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--fp-line);
          color: var(--fp-text);
          font-family: inherit;
          font-size: 0.8125rem;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .fp-custom-zone-input:focus {
          border-color: var(--fp-gold);
        }

        .fp-custom-zone-btn {
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--fp-gold-grad);
          border: none;
          color: #0A0E18;
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity 0.15s ease;
        }

        .fp-custom-zone-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .fp-custom-zone-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .fp-custom-zone-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed var(--fp-line);
          color: var(--fp-text-dim);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .fp-custom-zone-chip:hover {
          color: var(--fp-gold);
          border-color: var(--fp-gold);
          background: rgba(221, 167, 82, 0.08);
        }

        .fp-group {
          display: flex;
          flex-direction: column;
        }

        .fp-group-head {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--fp-canvas-bg);
          border-block-end: 1px solid var(--fp-line);
        }

        [data-theme="light"] .fp-group-head {
          background: #F8FAFC;
        }

        .fp-group-title {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--fp-gold);
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .fp-group-title-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--fp-gold);
          flex-shrink: 0;
        }

        .fp-group-count {
          font-family: monospace;
          font-variant-numeric: tabular-nums;
          font-size: 0.62rem;
          font-weight: 800;
          padding: 1px 7px;
          border-radius: 9999px;
          background: rgba(221,167,82,0.12);
          color: var(--fp-gold);
          flex-shrink: 0;
        }

        .fp-group-actions {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-inline-start: auto;
          flex-shrink: 0;
        }

        .fp-group-addwrap { position: relative; display: inline-flex; }

        .fp-group-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 7px;
          background: transparent;
          border: 1px solid var(--fp-line);
          color: var(--fp-text-dim);
          cursor: pointer;
          transition: color 0.15s cubic-bezier(0.2,0,0,1), border-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-group-btn:hover { color: var(--fp-gold); border-color: var(--fp-gold); }
        .fp-group-btn.danger:hover { color: var(--fp-danger); border-color: var(--fp-danger); }
        .fp-group-btn:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        .fp-group.is-open {
          position: relative;
          z-index: 50;
        }

        .fp-group-head.is-open {
          z-index: 60 !important;
        }

        .fp-group-menu {
          position: absolute;
          inset-block-start: calc(100% + 4px);
          inset-inline-end: 0;
          z-index: 100;
          min-width: 220px;
          border-radius: 12px;
          background: #0D1220;
          border: 1px solid rgba(221, 167, 82, 0.35);
          box-shadow: 0 20px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(221,167,82,0.2);
          padding: 6px;
        }

        [data-theme="light"] .fp-group-menu {
          background: #FFFFFF;
          border-color: rgba(221, 167, 82, 0.4);
          box-shadow: 0 18px 48px rgba(28,26,22,0.18);
        }

        .fp-group-menu-divider {
          height: 1px;
          margin: 4px 4px;
          background: rgba(221, 167, 82, 0.2);
        }

        .fp-group-menu-custom-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 4px;
        }

        .fp-group-menu-custom-input {
          flex: 1;
          min-width: 0;
          padding: 6px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(221, 167, 82, 0.4);
          color: var(--fp-text);
          font-family: inherit;
          font-size: 0.75rem;
          outline: none;
        }

        [data-theme="light"] .fp-group-menu-custom-input {
          background: #F8FAFC;
        }

        .fp-group-menu-custom-input:focus {
          border-color: var(--fp-gold);
        }

        .fp-group-menu-custom-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: var(--fp-gold-grad);
          border: none;
          color: #0A0E18;
          cursor: pointer;
          flex-shrink: 0;
          font-weight: 800;
        }

        .fp-group-menu-custom-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .fp-add-custom-item {
          color: var(--fp-gold);
        }

        .fp-custom-zone {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px 12px;
          border-block-start: 1px dashed rgba(221,167,82,0.3);
          flex-shrink: 0;
        }

        .fp-custom-zone-label {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--fp-gold);
        }

        .fp-custom-zone-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fp-custom-zone-input {
          flex: 1;
          min-width: 0;
          padding: 7px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--fp-line);
          color: var(--fp-text);
          font-family: inherit;
          font-size: 0.75rem;
          outline: none;
        }

        [data-theme="light"] .fp-custom-zone-input { background: #F8FAFC; }
        .fp-custom-zone-input:focus { border-color: var(--fp-gold); }
        .fp-custom-zone-input::placeholder { color: var(--fp-text-dim); }

        .fp-custom-zone-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--fp-gold-grad);
          border: none;
          color: #0A0E18;
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-custom-zone-btn:hover:not(:disabled) { opacity: 0.9; }
        .fp-custom-zone-btn:disabled { opacity: 0.35; cursor: default; }
        .fp-custom-zone-btn:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

        .fp-custom-zone-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .fp-custom-zone-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: 9999px;
          font-size: 0.62rem;
          font-weight: 700;
          cursor: pointer;
          background: transparent;
          border: 1px dashed var(--fp-line);
          color: var(--fp-text-dim);
          transition: color 0.15s cubic-bezier(0.2,0,0,1), border-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .fp-custom-zone-chip:hover { color: var(--fp-gold); border-color: var(--fp-gold); }
        .fp-custom-zone-chip:focus-visible { outline: none; box-shadow: var(--fp-focus-ring); }

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

        .fp-area-budget-meter {
          display: inline-flex;
          flex-direction: column;
          gap: 3px;
          padding: 3px 8px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--fp-line);
          min-width: 170px;
        }

        [data-theme="light"] .fp-area-budget-meter {
          background: #F8FAFC;
        }

        .fp-area-budget-meter.full {
          border-color: rgba(221, 167, 82, 0.5);
          background: rgba(221, 167, 82, 0.08);
        }

        .fp-budget-meter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          font-size: 0.7rem;
        }

        .fp-budget-meter-label {
          color: var(--fp-text-dim);
          font-weight: 600;
        }

        .fp-budget-meter-val {
          font-family: monospace;
          font-variant-numeric: tabular-nums;
          font-size: 0.72rem;
          color: var(--fp-text);
        }

        .fp-budget-meter-val strong {
          color: var(--fp-gold);
          font-weight: 800;
        }

        .fp-budget-meter-tag {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--fp-text-dim);
        }

        .fp-budget-meter-tag.full {
          background: rgba(221, 167, 82, 0.2);
          color: var(--fp-gold);
        }

        .fp-budget-progress-track {
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        [data-theme="light"] .fp-budget-progress-track {
          background: rgba(0, 0, 0, 0.08);
        }

        .fp-budget-progress-bar {
          height: 100%;
          border-radius: 2px;
          background: #4ADE80;
          transition: width 0.3s cubic-bezier(0.2, 0, 0, 1), background-color 0.3s ease;
        }

        .fp-budget-progress-bar.warning {
          background: #FBBF24;
        }

        .fp-budget-progress-bar.full {
          background: var(--fp-gold);
        }

        .fp-crumbs {
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 38px;
          flex-wrap: wrap;
        }

        .fp-crumb {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          font-family: inherit;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--fp-text-dim);
          cursor: pointer;
          transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }

        .fp-crumb:hover { color: var(--fp-gold); }

        .fp-crumb.active {
          color: var(--fp-gold);
          background: rgba(221,167,82,0.1);
          border-color: var(--fp-line);
          cursor: default;
        }

        .fp-crumb-sep {
          color: var(--fp-text-dim);
          font-size: 0.9rem;
          opacity: 0.6;
        }

        .fp-crumb-propagate {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-inline-start: auto;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--fp-line);
          background: rgba(221,167,82,0.08);
          font-family: inherit;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--fp-gold);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .fp-crumb-propagate:hover { background: rgba(221,167,82,0.16); }

        .fp-elev-slab:hover rect { fill: rgba(221,167,82,0.12); }
        .fp-elev-slab:focus-visible { outline: none; }
        .fp-elev-slab:focus-visible rect { stroke-width: 2.6; }



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

        .fp-canvas-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          background: rgba(10, 14, 24, 0.95);
          border-block-end: 1px solid var(--fp-line);
          gap: 12px;
          min-height: 44px;
        }

        [data-theme="light"] .fp-canvas-bar {
          background: #F8FAFC;
        }

        .fp-canvas-bar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .fp-canvas-bar-right {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-inline-start: auto;
        }

        .fp-canvas-toolbar-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 14px;
          background: rgba(13, 18, 30, 0.85);
          border-block-end: 1px solid var(--fp-line);
          gap: 10px;
          min-height: 40px;
          flex-wrap: wrap;
        }

        [data-theme="light"] .fp-canvas-toolbar-row {
          background: #F1F5F9;
        }

        .fp-canvas-toolbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .fp-canvas-toolbar-right {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-inline-start: auto;
          flex-wrap: wrap;
        }

        .fp-tools {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--fp-line);
          padding: 3px 6px;
          border-radius: 9px;
          flex-shrink: 0;
          white-space: nowrap;
        }

        [data-theme="light"] .fp-tools {
          background: rgba(0, 0, 0, 0.03);
        }

        .fp-tool-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: auto !important;
          min-width: fit-content;
          height: 28px;
          padding: 0 10px;
          border-radius: 7px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--fp-text-dim);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
        }

        .fp-tool-btn:hover {
          color: var(--fp-text);
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(221, 167, 82, 0.25);
        }

        [data-theme="light"] .fp-tool-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .fp-tool-btn.active {
          background: rgba(221, 167, 82, 0.16);
          border-color: var(--fp-gold);
          color: var(--fp-gold);
          box-shadow: 0 0 10px rgba(221, 167, 82, 0.2);
        }

        .fp-tool-label {
          font-size: 0.75rem;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
        }

        .fp-tool-divider {
          width: 1px;
          height: 18px;
          background: var(--fp-line);
          margin: 0 4px;
          flex-shrink: 0;
        }

        .fp-tool-magnet.active {
          color: #7FB4D8;
          border-color: #7FB4D8;
          background: rgba(127, 180, 216, 0.15);
          box-shadow: 0 0 10px rgba(127, 180, 216, 0.25);
        }

        .fp-tool-autodock:hover {
          color: var(--fp-gold);
          border-color: var(--fp-gold);
          background: rgba(221, 167, 82, 0.15);
        }

        .fp-floating-zoom-widget {
          position: absolute;
          bottom: 24px;
          inset-inline-end: 24px;
          z-index: 30;
          display: inline-flex;
          align-items: center;
          background: rgba(13, 19, 34, 0.88);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(221, 167, 82, 0.3);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
          overflow: hidden;
        }

        [data-theme="light"] .fp-floating-zoom-widget {
          background: rgba(255, 255, 255, 0.92);
          border-color: rgba(221, 167, 82, 0.4);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
        }

        .fp-float-zoom-btn {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--fp-text);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .fp-float-zoom-btn:hover:not(:disabled) {
          background: rgba(221, 167, 82, 0.18);
          color: var(--fp-gold);
        }

        .fp-float-zoom-btn:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .fp-float-zoom-val {
          width: auto !important;
          min-width: 52px;
          padding: 0 8px;
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--fp-gold);
          border-inline: 1px solid var(--fp-line);
          letter-spacing: -0.02em;
        }

        .fp-tool-action-btn {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--fp-line);
          color: var(--fp-text-dim);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s cubic-bezier(0.2, 0, 0, 1);
        }

        .fp-tool-action-btn:hover:not(:disabled) {
          color: var(--fp-gold);
          border-color: var(--fp-gold);
          background: rgba(221, 167, 82, 0.12);
        }

        .fp-tool-action-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .fp-cad-door-group:hover .fp-opening-hover-actions,
        .fp-cad-window-group:hover .fp-opening-hover-actions {
          opacity: 1;
          pointer-events: auto;
        }

        .fp-opening-hover-actions {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s cubic-bezier(0.2, 0, 0, 1);
        }

        .fp-laser-guide line {
          animation: fpLaserPulse 1.2s infinite alternate;
        }

        @keyframes fpLaserPulse {
          from { opacity: 0.7; }
          to { opacity: 1; }
        }

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

