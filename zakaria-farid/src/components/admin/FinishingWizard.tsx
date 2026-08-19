'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Plus, Check, ImagePlus, X, Loader2, Trash2, SlidersHorizontal, Sparkles, RotateCcw, RotateCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  PropertyTypeId,
  ZoneTemplate,
  ZoneInstance,
  TradeInstance,
  GlobalFinishingState,
  ZONE_TEMPLATES,
  TRADE_TEMPLATES,
  ATTRIBUTE_TEMPLATES,
  getTradesForZone,
  getAttributesForTrade,
  buildZoneInstances,
  applyGlobalState,
  addOptionalZone,
  updateTradeStatus,
  updateAttributeValue,
  addZoneImage,
  removeZoneImage,
  removeZone,
  removeZones,
  addCustomZone,
  addTradeToZone,
  removeTradeFromZone,
} from '@/lib/layering';
import styles from './FinishingWizard.module.css';


// ─── Status label humaniser ─────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  NotStarted:    { en: 'Not Started',     ar: 'لم يبدأ' },
  RoughIn:       { en: 'Rough-In',        ar: 'تمديدات خام' },
  Finished:      { en: 'Finished',        ar: 'تم' },
  ConduitsOnly:  { en: 'Conduits Only',   ar: 'مواسير فقط' },
  Wired:         { en: 'Wired',           ar: 'أسلاك' },
  RedBrick:      { en: 'Red Brick',       ar: 'طوب أحمر' },
  Plastered:     { en: 'Plastered',       ar: 'مبياض' },
  Tiled:         { en: 'Tiled',           ar: 'سيراميك' },
  FinalPaint:    { en: 'Final Paint',     ar: 'دهان نهائي' },
  Putty:         { en: 'Putty',           ar: 'بطيبة' },
  SandBed:       { en: 'Sand Bed',        ar: 'رملة' },
  None:          { en: 'None',            ar: 'لا يوجد' },
  SubFrames:     { en: 'Sub-Frames',      ar: 'برواز' },
  Installed:     { en: 'Installed',       ar: 'مركّب' },
  CopperPrep:    { en: 'Copper Prep',     ar: 'تمديد نحاس' },
  Rough:         { en: 'Rough',           ar: 'خام' },
  Built:         { en: 'Built',           ar: 'تم البناء' },
  Shell:         { en: 'Shell',           ar: 'هيكل' },
  InProgress:    { en: 'In Progress',     ar: 'جاري' },
  Shaft:         { en: 'Shaft Ready',     ar: 'بئر المصعد' },
  Applied:       { en: 'Applied',         ar: 'تم التطبيق' },
  CoreAndShell:  { en: 'Core & Shell',    ar: 'هيكل أساسي' },
  Fitted:        { en: 'Fitted Out',      ar: 'مجهز' },
};

function statusLabel(status: string, isAr: boolean) {
  const s = STATUS_LABELS[status];
  if (!s) return status;
  return isAr ? s.ar : s.en;
}

// ─── Sub-type options ───────────────────────────────────────────────────────
const SUBTYPES: Record<PropertyTypeId, Array<{ id: string; en: string; ar: string }>> = {
  apartment: [
    { id: 'standard',  en: 'Standard Apartment',      ar: 'شقة عادية' },
    { id: 'ground',    en: 'Ground Floor (Apartment)', ar: 'شقة أرضي' },
    { id: 'duplex',    en: 'Duplex (Two Floors)',       ar: 'دوبلكس (دورين)' },
    { id: 'roof',      en: 'Roof Apartment (روف)',     ar: 'شقة روف' },
  ],
  building: [
    { id: 'residential', en: 'Residential Building (عمارة)', ar: 'عمارة سكنية' },
    { id: 'mixed',       en: 'Mixed Use (سكني + تجاري)',    ar: 'سكني وتجاري' },
  ],
  garage: [],
};

// ─── Optional zones per property type ──────────────────────────────────────
const OPTIONAL_ZONES_FOR_TYPE: Record<PropertyTypeId, string[]> = {
  apartment: ['apt.guest_bath', 'apt.laundry'],
  building:  [],
  garage:    [],
};

// ─── Global state config ───────────────────────────────────────────────────
const GLOBAL_STATES: Array<{
  id: GlobalFinishingState;
  emoji: string;
  en: string;
  ar: string;
  desc_en: string;
  desc_ar: string;
}> = [
  {
    id: 'red_brick',
    emoji: '🧱',
    en: 'Red Brick',
    ar: 'طوب أحمر',
    desc_en: 'Bare structure only — no trades started',
    desc_ar: 'هيكل خام فقط — لم يبدأ أي تشطيب',
  },
  {
    id: 'semi_finished',
    emoji: '🏗️',
    en: 'Semi-Finished',
    ar: 'نص تشطيب',
    desc_en: 'Rough-in done, plastered walls, no flooring yet',
    desc_ar: 'تمديدات خام، حوائط مبياضة، بدون أرضيات',
  },
  {
    id: 'fully_finished',
    emoji: '✨',
    en: 'Fully Finished',
    ar: 'تشطيب كامل',
    desc_en: 'All trades completed to final finish',
    desc_ar: 'جميع الأعمال مكتملة بالتشطيب النهائي',
  },
];

// ─── Props ─────────────────────────────────────────────────────────────────

type CategoryConfig = {
  key: string;
  en: string;
  ar: string;
  emoji: string;
  match: (id: string, label?: string) => boolean;
};

const CATEGORY_CONFIG_BY_TYPE: Record<PropertyTypeId, CategoryConfig[]> = {
  apartment: [
    {
      key: 'living',
      en: 'Living & Reception Areas',
      ar: 'المساحات المعيشية والاستقبال',
      emoji: '🛋️',
      match: (id, label) => {
        const text = (id + ' ' + (label ?? '')).toLowerCase();
        return text.includes('reception') || text.includes('living') || text.includes('dining') ||
          text.includes('corridor') || text.includes('entrance') || text.includes('salon') ||
          text.includes('office') || text.includes('storage') || text.includes('laundry');
      },
    },
    {
      key: 'bedrooms',
      en: 'Bedrooms & Suites',
      ar: 'غرف النوم والأجنحة',
      emoji: '🛏️',
      match: (id) => id.includes('bed') || id.includes('suite'),
    },
    {
      key: 'baths_kitchen',
      en: 'Bathrooms & Kitchen',
      ar: 'الحمامات والمطبخ',
      emoji: '🛁',
      match: (id) => id.includes('bath') || id.includes('kitchen') || id.includes('powder'),
    },
    {
      key: 'outdoor',
      en: 'Balconies & Outdoor',
      ar: 'البلكونات والمساحات الخارجية',
      emoji: '🌿',
      match: (id) => id.includes('balcony') || id.includes('terrace') || id.includes('roof'),
    },
  ],
  building: [
    {
      key: 'structure',
      en: 'Structural & Common Areas',
      ar: 'الهيكل والمناطق المشتركة',
      emoji: '🏗️',
      match: (id) =>
        id.startsWith('bld.') || id.includes('lobby') || id.includes('stair') ||
        id.includes('corridor') || id.includes('entrance') || id.includes('basement'),
    },
    {
      key: 'infrastructure',
      en: 'Infrastructure & Utilities',
      ar: 'البنية التحتية والمرافق',
      emoji: '⚙️',
      match: (id) =>
        id.includes('elec') || id.includes('plumb') || id.includes('water') ||
        id.includes('tank') || id.includes('roof') || id.includes('pump'),
    },
    {
      key: 'units',
      en: 'Residential Units',
      ar: 'الوحدات السكنية',
      emoji: '🏠',
      match: (id) =>
        id.includes('apt.') || id.includes('unit') || id.includes('flat'),
    },
  ],
  garage: [
    {
      key: 'access',
      en: 'Access & Entry',
      ar: 'المدخل والبوابة',
      emoji: '🚪',
      match: (id) =>
        id.includes('ramp') || id.includes('gate') || id.includes('entrance') || id.includes('grg.ramp'),
    },
    {
      key: 'bays',
      en: 'Parking Bays',
      ar: 'أماكن الانتظار',
      emoji: '🚗',
      match: (id) =>
        id.includes('bay') || id.includes('parking') || id.includes('grg.bay'),
    },
    {
      key: 'electrical',
      en: 'Lighting & Electrical',
      ar: 'الإنارة والكهرباء',
      emoji: '💡',
      match: (id) =>
        id.includes('elec') || id.includes('light') || id.includes('grg.elec'),
    },
  ],
};

const SMART_SUGGESTIONS_BY_TYPE: Record<PropertyTypeId, Array<{ en: string; ar: string }>> = {
  apartment: [
    { en: 'Laundry Room',   ar: 'غرفة غسيل' },
    { en: 'Storage Room',   ar: 'مخزن' },
    { en: 'Guest Toilet',   ar: 'حمام ضيوف' },
    { en: 'Dressing Room',  ar: 'غرفة ملابس' },
    { en: 'Servant Room',   ar: 'غرفة خادمة' },
    { en: 'Open Kitchen',   ar: 'مطبخ أمريكي' },
    { en: 'Balcony',        ar: 'بلكونة' },
  ],
  building: [
    { en: 'Generator Room',  ar: 'غرفة مولد' },
    { en: 'Guard Room',      ar: 'غرفة حارس' },
    { en: 'Water Pump Room', ar: 'غرفة طلمبات' },
    { en: 'Meter Room',      ar: 'غرفة عدادات' },
    { en: 'Storage Room',    ar: 'مخزن' },
  ],
  garage: [
    { en: 'Extra Parking Bay',  ar: 'باكية إضافية' },
    { en: 'Storage Room',       ar: 'مخزن' },
    { en: 'Security Booth',     ar: 'كابينة أمن' },
    { en: 'EV Charging Point',  ar: 'نقطة شحن كهربائي' },
  ],
};

interface FinishingWizardProps {
  propertyType: PropertyTypeId;
  bedroomCount: number;
  zoneInstances: ZoneInstance[];
  onZoneInstancesChange: (zones: ZoneInstance[]) => void;
  isAr?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function FinishingWizard({
  propertyType,
  bedroomCount,
  zoneInstances,
  onZoneInstancesChange,
  isAr = false,
}: FinishingWizardProps) {
  const [subType, setSubType] = useState<string>(SUBTYPES[propertyType]?.[0]?.id ?? 'standard');
  const [globalState, setGlobalState] = useState<GlobalFinishingState | null>(null);
  const [localBedroomCount, setLocalBedroomCount] = useState(Math.max(1, bedroomCount));
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [expandedAttrs, setExpandedAttrs] = useState<Set<string>>(new Set()); // key = `${zoneId}_${tradeId}`
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [addedOptionalZones, setAddedOptionalZones] = useState<Set<string>>(new Set());
  const [uploadingZoneId, setUploadingZoneId] = useState<string | null>(null);
  const zoneImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Custom zone & trade picker state
  const [customZoneInput, setCustomZoneInput] = useState('');
  const [openTradePickerZoneId, setOpenTradePickerZoneId] = useState<string | null>(null);

  // Resolved per-type config
  const CATEGORY_CONFIG = CATEGORY_CONFIG_BY_TYPE[propertyType] ?? CATEGORY_CONFIG_BY_TYPE.apartment;
  const SMART_SUGGESTIONS = SMART_SUGGESTIONS_BY_TYPE[propertyType] ?? SMART_SUGGESTIONS_BY_TYPE.apartment;

  // Undo / Redo history management
  const [history, setHistory] = useState<ZoneInstance[][]>([zoneInstances]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUndoRedoAction = useRef(false);

  function updateZones(newZones: ZoneInstance[]) {
    if (!isUndoRedoAction.current) {
      const nextHistory = history.slice(0, historyIndex + 1);
      nextHistory.push(newZones);
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    }
    isUndoRedoAction.current = false;
    onZoneInstancesChange(newZones);
  }

  function handleUndo() {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      isUndoRedoAction.current = true;
      onZoneInstancesChange(history[prevIdx]);
    }
  }

  function handleRedo() {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      isUndoRedoAction.current = true;
      onZoneInstancesChange(history[nextIdx]);
    }
  }

  const subtypes = SUBTYPES[propertyType] ?? [];
  const optionalZoneIds = OPTIONAL_ZONES_FOR_TYPE[propertyType] ?? [];

  function handleSelectGlobalState(state: GlobalFinishingState) {
    setGlobalState(state);
    if (zoneInstances.length === 0) {
      // First time — build from scratch
      updateZones(buildZoneInstances(propertyType, state, localBedroomCount));
    } else {
      // Re-apply to existing zones (keeps attribute values)
      updateZones(applyGlobalState(zoneInstances, state));
    }
  }

  function handleBedroomChange(delta: number) {
    const newCount = Math.max(1, Math.min(8, localBedroomCount + delta));
    setLocalBedroomCount(newCount);
    if (globalState) {
      updateZones(buildZoneInstances(propertyType, globalState, newCount));
    }
  }

  function toggleFloor(id: string) {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleZone(id: string) {
    setExpandedZones(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAttrs(key: string) {
    setExpandedAttrs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleTradeStatus(zoneId: string, tradeId: string, status: string) {
    updateZones(updateTradeStatus(zoneInstances, zoneId, tradeId, status));
  }

  function handleAttrValue(
    zoneId: string,
    tradeId: string,
    attrId: string,
    value: boolean | string | number | null
  ) {
    updateZones(updateAttributeValue(zoneInstances, zoneId, tradeId, attrId, value));
  }

  function handleAddOptionalZone(zoneTemplateId: string, parentZoneInstanceId?: string) {
    setAddedOptionalZones(prev => new Set([...prev, zoneTemplateId]));
    const gs = globalState ?? 'red_brick';
    updateZones(addOptionalZone(zoneInstances, zoneTemplateId, gs, parentZoneInstanceId));
  }

  async function handleZoneImageUpload(zoneId: string, files: FileList | File[]) {
    setUploadingZoneId(zoneId);
    try {
      const supabase = createClient();
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      const uploadPromises = fileArray.map(async (file, idx) => {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const uniqueId = `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
        const path = `zone-photos/${zoneId}-${uniqueId}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(path, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          console.error('Zone photo upload error:', uploadError);
          return null;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(path);
        return publicUrl;
      });

      const uploadedUrls = (await Promise.all(uploadPromises)).filter((url): url is string => url !== null);

      if (uploadedUrls.length > 0) {
        let updated = zoneInstances;
        for (const url of uploadedUrls) {
          updated = addZoneImage(updated, zoneId, url);
        }
        updateZones(updated);
        toast.success(isAr ? `تم رفع ${uploadedUrls.length} صورة بنجاح` : `Uploaded ${uploadedUrls.length} photos`);
      }
    } catch (err) {
      console.error('Zone image upload failed:', err);
      toast.error(isAr ? 'فشل رفع الصور' : 'Failed to upload zone photos');
    } finally {
      setUploadingZoneId(null);
    }
  }

  function handleZoneImageRemove(zoneId: string, index: number) {
    updateZones(removeZoneImage(zoneInstances, zoneId, index));
  }

  // ── Zone add/remove handlers ──────────────────────────────────────────────
  function handleRemoveZone(zoneId: string) {
    updateZones(removeZone(zoneInstances, zoneId));
    setExpandedZones(prev => { const n = new Set(prev); n.delete(zoneId); return n; });
  }

  function handleRemoveSection(catZones: ZoneInstance[]) {
    const ids = catZones.map(z => z.id);
    updateZones(removeZones(zoneInstances, ids));
  }

  function handleAddZoneToCategory(catKey: string, currentCatZones: ZoneInstance[]) {
    const cat = CATEGORY_CONFIG.find(c => c.key === catKey);
    const baseName = cat ? (isAr ? cat.ar : cat.en) : 'Zone';
    const count = currentCatZones.length + 1;
    const label = `${baseName} ${count}`;
    const gs = globalState ?? 'red_brick';
    updateZones(addCustomZone(zoneInstances, label, gs));
  }

  function handleAddCustomZone() {
    const label = customZoneInput.trim();
    if (!label) return;
    const gs = globalState ?? 'red_brick';
    updateZones(addCustomZone(zoneInstances, label, gs));
    setCustomZoneInput('');
  }

  // ── Trade add/remove handlers ─────────────────────────────────────────────
  function handleAddTrade(zoneId: string, tradeTemplateId: string) {
    const gs = globalState ?? 'red_brick';
    updateZones(addTradeToZone(zoneInstances, zoneId, tradeTemplateId, gs));
    setOpenTradePickerZoneId(null);
  }

  function handleRemoveTrade(zoneId: string, tradeInstanceId: string) {
    updateZones(removeTradeFromZone(zoneInstances, zoneId, tradeInstanceId));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getZoneTemplate(id: string): ZoneTemplate | undefined {
    const found = ZONE_TEMPLATES.find(z => z.id === id);
    if (found) return found;
    if (id.startsWith('custom.') || !found) {
      return {
        id,
        property_type_id: propertyType,
        label_en: 'Custom Zone',
        label_ar: 'منطقة مخصصة',
        category: 'living_space',
        sort_order: 99,
      };
    }
    return undefined;
  }

  function isZoneModified(zone: ZoneInstance): boolean {
    if (!globalState) return false;
    // A zone is "modified" if any trade status differs from the global state default
    // Simple check: trades are non-empty and at least one was explicitly changed after initial build
    return false; // We'll track this more precisely with a future enhancement
  }

  function getZoneStatusSummary(zone: ZoneInstance): Array<{ trade_en: string; status: string }> {
    const tpl = getZoneTemplate(zone.zone_template_id);
    if (!tpl) return [];
    return zone.trades.slice(0, 3).map(t => {
      const tradeTpl = TRADE_TEMPLATES.find(tr => tr.id === t.trade_template_id);
      return { trade_en: tradeTpl?.label_en.split(' ')[0] ?? t.trade_template_id, status: t.status };
    });
  }

  // ── Attribute renderer ────────────────────────────────────────────────────
  function renderAttribute(
    zoneId: string,
    tradeId: string,
    attrId: string,
    value: boolean | string | number | null,
    label_en: string,
    label_ar: string,
    dataType: string,
    enumValues?: string[]
  ) {
    const label = isAr ? label_ar : label_en;
    return (
      <div key={attrId} className={styles.attrRow}>
        <span className={styles.attrLabel}>{label}</span>
        <div className={styles.attrControl}>
          {dataType === 'boolean' && (
            <button
              type="button"
              className={`${styles.attrToggle} ${value === true ? styles.attrToggleOn : ''}`}
              onClick={() => handleAttrValue(zoneId, tradeId, attrId, value !== true)}
              aria-label={label}
            />
          )}
          {dataType === 'enum' && enumValues && (
            <select
              className={styles.attrSelect}
              value={(value as string) ?? ''}
              onChange={e => handleAttrValue(zoneId, tradeId, attrId, e.target.value || null)}
            >
              <option value="">{isAr ? '— اختر —' : '— select —'}</option>
              {enumValues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          )}
          {dataType === 'text' && (
            <input
              type="text"
              className={styles.attrInput}
              value={(value as string) ?? ''}
              placeholder={isAr ? 'اكتب هنا…' : 'type…'}
              onChange={e => handleAttrValue(zoneId, tradeId, attrId, e.target.value || null)}
            />
          )}
          {(dataType === 'integer' || dataType === 'numeric') && (
            <input
              type="number"
              className={styles.attrNumberInput}
              value={(value as number) ?? ''}
              onChange={e => handleAttrValue(zoneId, tradeId, attrId, e.target.value ? Number(e.target.value) : null)}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Trade row renderer ────────────────────────────────────────────────────
  function renderTrade(zoneInst: ZoneInstance, trade: TradeInstance) {
    const tradeTpl = TRADE_TEMPLATES.find(t => t.id === trade.trade_template_id);
    if (!tradeTpl) return null;
    const attrsKey = `${zoneInst.id}_${trade.id}`;
    const showAttrs = expandedAttrs.has(attrsKey);
    const attrs = getAttributesForTrade(trade.trade_template_id, zoneInst.zone_template_id);

    return (
      <div key={trade.id} className={styles.tradeRow}>
        <div className={styles.tradeHeader}>
          <div style={{ flex: 1 }}>
            <span className={styles.tradeLabel}>{isAr ? tradeTpl.label_ar : tradeTpl.label_en}</span>
            {isAr
              ? <> · <span className={styles.tradeLabelAr}>{tradeTpl.label_en}</span></>
              : <> · <span className={styles.tradeLabelAr}>{tradeTpl.label_ar}</span></>
            }
          </div>
          {attrs.length > 0 && (
            <button type="button" className={styles.showAttrsBtn} onClick={() => toggleAttrs(attrsKey)}>
              {showAttrs ? (isAr ? 'إخفاء التفاصيل' : 'Hide details') : (isAr ? 'تفاصيل' : 'Details')}
            </button>
          )}
          {/* Remove trade section button */}
          <button
            type="button"
            className={styles.tradeRemoveBtn}
            onClick={() => handleRemoveTrade(zoneInst.id, trade.id)}
            aria-label="Remove section"
            title={isAr ? 'حذف هذا القسم من الغرفة' : 'Remove section from zone'}
          >
            <Trash2 size={13} />
            <span>{isAr ? 'حذف القسم' : 'Remove Section'}</span>
          </button>
        </div>

        {/* Status segmented control */}
        <div className={styles.statusControl}>
          {tradeTpl.status_values.map(sv => (
            <button
              key={sv}
              type="button"
              className={`${styles.statusBtn} ${trade.status === sv ? styles.statusBtnActive : ''}`}
              onClick={() => handleTradeStatus(zoneInst.id, trade.id, sv)}
            >
              {statusLabel(sv, isAr)}
            </button>
          ))}
        </div>

        {/* Attributes panel */}
        {showAttrs && attrs.length > 0 && (
          <div className={styles.attrsPanel}>
            {attrs.map(attrTpl => {
              const val = trade.attributes.find(a => a.attribute_template_id === attrTpl.id)?.value ?? null;
              return renderAttribute(
                zoneInst.id, trade.id, attrTpl.id,
                val, attrTpl.label_en, attrTpl.label_ar,
                attrTpl.data_type, attrTpl.enum_values
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Leaf zone renderer ────────────────────────────────────────────────────
  function renderLeafZone(zoneInst: ZoneInstance, indent = false) {
    const tpl = getZoneTemplate(zoneInst.zone_template_id);
    if (!tpl) return null;
    const expanded = expandedZones.has(zoneInst.id);
    const label = zoneInst.instance_label ?? (isAr ? tpl.label_ar : tpl.label_en);
    const labelSub = isAr ? tpl.label_en : tpl.label_ar;
    const summary = getZoneStatusSummary(zoneInst);

    return (
      <div key={zoneInst.id} className={styles.zoneRow} style={indent ? { marginLeft: 0 } : {}}>
        <div className={styles.zoneRowHeader} onClick={() => toggleZone(zoneInst.id)}>
          <span className={`${styles.zoneDot} ${zoneInst.trades.some(t => t.status !== 'NotStarted' && t.status !== 'SandBed' && t.status !== 'RedBrick' && t.status !== 'None') ? styles.zoneDotDone : ''}`} />
          <div style={{ flex: 1 }}>
            <span className={styles.zoneLabel}>{label}</span>
            {' '}
            <span className={styles.zoneLabelAr}>{labelSub}</span>
          </div>
          {!expanded && (
            <div className={styles.zoneStatusChips}>
              {summary.map((s, i) => (
                <span key={i} className={styles.zoneStatusChip}>
                  {s.trade_en}: {statusLabel(s.status, isAr)}
                </span>
              ))}
            </div>
          )}
          {/* Remove zone button — prominent red action button */}
          <button
            type="button"
            className={styles.zoneRemoveBtn}
            onClick={e => { e.stopPropagation(); handleRemoveZone(zoneInst.id); }}
            aria-label="Delete Zone"
            title={isAr ? 'حذف هذه المنطقة بالكامل' : 'Delete Zone'}
          >
            <Trash2 size={13} />
            <span>{isAr ? 'حذف المنطقة' : 'Delete Zone'}</span>
          </button>
          <ChevronRight size={14} className={`${styles.zoneChevron} ${expanded ? styles.zoneChevronOpen : ''}`} />
        </div>
        {expanded && (
          <div className={styles.zoneTradesPanel}>
            {/* ── Zone Photos Gallery ─────────────────────────────────── */}
            <div className={styles.zoneCoverPhotoSection}>
              <div className={styles.zoneCoverPhotoLabel}>
                <ImagePlus size={14} style={{ color: '#DDA752' }} />
                <span>{isAr ? 'صور الغرفة (اختياري — متعددة)' : 'Zone Photos (optional, multiple)'}</span>
                {(zoneInst.images?.length ?? 0) > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', marginLeft: 'auto' }}>
                    {zoneInst.images!.length} {isAr ? 'صورة' : 'photos'}
                  </span>
                )}
              </div>

              {/* Thumbnail strip */}
              {(zoneInst.images?.length ?? 0) > 0 && (
                <div className={styles.zoneThumbnailGrid}>
                  {zoneInst.images!.map((url, idx) => (
                    <div key={idx} className={styles.zoneThumbnailItem}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`zone photo ${idx + 1}`} className={styles.zoneThumbnailImg} />
                      <button
                        type="button"
                        className={styles.zoneThumbnailRemove}
                        onClick={() => handleZoneImageRemove(zoneInst.id, idx)}
                        aria-label="Remove photo"
                      >
                        <X size={11} />
                      </button>
                      {idx === 0 && (
                        <span className={styles.zoneThumbnailCoverBadge}>
                          {isAr ? 'غلاف' : 'Cover'}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Add more button */}
                  <button
                    type="button"
                    className={styles.zoneThumbnailAddMore}
                    onClick={() => zoneImageInputRefs.current[zoneInst.id]?.click()}
                    disabled={uploadingZoneId === zoneInst.id}
                    title={isAr ? 'إضافة المزيد من الصور' : 'Add more photos'}
                  >
                    {uploadingZoneId === zoneInst.id ? (
                      <Loader2 size={16} className={styles.spinner} />
                    ) : (
                      <ImagePlus size={16} />
                    )}
                  </button>
                </div>
              )}

              {/* Empty state upload button */}
              {(zoneInst.images?.length ?? 0) === 0 && (
                <button
                  type="button"
                  className={styles.zoneCoverUploadBtn}
                  onClick={() => zoneImageInputRefs.current[zoneInst.id]?.click()}
                  disabled={uploadingZoneId === zoneInst.id}
                >
                  {uploadingZoneId === zoneInst.id ? (
                    <><Loader2 size={14} className={styles.spinner} /><span>{isAr ? 'جاري الرفع…' : 'Uploading…'}</span></>
                  ) : (
                    <><ImagePlus size={14} /><span>{isAr ? 'إضافة صور للغرفة' : 'Upload zone photos'}</span></>
                  )}
                </button>
              )}

              <input
                ref={el => { zoneImageInputRefs.current[zoneInst.id] = el; }}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleZoneImageUpload(zoneInst.id, e.target.files);
                  }
                  e.target.value = '';
                }}
              />
            </div>

            {zoneInst.trades.map(t => renderTrade(zoneInst, t))}

            {/* ── Add Trade Section inline picker ────────────────── */}
            {openTradePickerZoneId === zoneInst.id && (
              <div className={styles.tradePickerPanel}>
                <div className={styles.tradePickerHeader}>
                  <span className={styles.tradePickerLabel}>
                    <SlidersHorizontal size={13} />
                    {isAr ? 'إضافة قسم تشطيب جديد:' : 'Add a Finishing Trade Section:'}
                  </span>
                  <button
                    type="button"
                    className={styles.tradePickerClose}
                    onClick={() => setOpenTradePickerZoneId(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className={styles.tradePickerList}>
                  {TRADE_TEMPLATES
                    .filter(t => !zoneInst.trades.some(e => e.trade_template_id === t.id))
                    .map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className={styles.tradePickerChip}
                        onClick={() => handleAddTrade(zoneInst.id, t.id)}
                      >
                        <Plus size={11} />
                        {isAr ? t.label_ar : t.label_en}
                      </button>
                    ))}
                  {TRADE_TEMPLATES.filter(t => !zoneInst.trades.some(e => e.trade_template_id === t.id)).length === 0 && (
                    <span className={styles.emptyTradesMsg}>
                      {isAr ? 'جميع أقسام التشطيب مضافة بالفعل لهذه المنطقة' : 'All available trade sections are already active in this zone'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Fallback show picker button when picker is closed */}
            {openTradePickerZoneId !== zoneInst.id && (
              <button
                type="button"
                className={styles.addTradeBtnInline}
                onClick={() => setOpenTradePickerZoneId(zoneInst.id)}
              >
                <Plus size={13} />
                {isAr ? 'إضافة قسم تشطيب جديد' : 'Add another trade / finishing section'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Container (floor) zone renderer ─────────────────────────────────────
  function renderContainerZone(zoneInst: ZoneInstance) {
    const tpl = getZoneTemplate(zoneInst.zone_template_id);
    if (!tpl) return null;
    const expanded = expandedFloors.has(zoneInst.id);
    const floorIcons: Record<string, string> = {
      'vil.ground':   '🏠',
      'vil.first':    '🏢',
      'vil.basement': '🏚️',
      'vil.roof':     '🌤️',
    };
    const icon = floorIcons[tpl.id] ?? '🏗️';

    return (
      <div key={zoneInst.id} className={styles.floorBlock}>
        <div className={styles.floorHeader} onClick={() => toggleFloor(zoneInst.id)}>
          <ChevronRight
            size={16}
            className={`${styles.floorChevron} ${expanded ? styles.floorChevronOpen : ''}`}
          />
          <span className={styles.floorIcon}>{icon}</span>
          <div style={{ flex: 1 }}>
            <span className={styles.floorLabel}>{isAr ? tpl.label_ar : tpl.label_en}</span>
            {' '}
            <span className={styles.floorLabelAr}>{isAr ? tpl.label_en : tpl.label_ar}</span>
          </div>
          {zoneInst.children && (
            <span className={styles.tradeBadge}>
              {zoneInst.children.length} {isAr ? 'مناطق' : 'zones'}
            </span>
          )}
        </div>
        {expanded && zoneInst.children && (
          <div className={styles.floorChildren}>
            {zoneInst.children.map(child => renderLeafZone(child, true))}
          </div>
        )}
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  const hasZones = zoneInstances.length > 0;

  return (
    <div className={styles.root} dir={isAr ? 'rtl' : 'ltr'}>

      {/* Sub-type strip */}
      {subtypes.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isAr ? 'النوع الفرعي' : 'Sub-type'}
          </p>
          <div className={styles.subtypeStrip}>
            {subtypes.map(st => (
              <button
                key={st.id}
                type="button"
                className={`${styles.subtypeChip} ${subType === st.id ? styles.subtypeChipActive : ''}`}
                onClick={() => setSubType(st.id)}
              >
                {isAr ? st.ar : st.en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bedroom count (apartments + villas) */}
      {propertyType === 'apartment' && (
        <div className={styles.bedroomRow}>
          <span className={styles.bedroomLabel}>
            {isAr ? 'عدد غرف النوم العادية' : 'Standard Bedroom Count'}
          </span>
          <div className={styles.bedroomStepper}>
            <button type="button" className={styles.stepperBtn} onClick={() => handleBedroomChange(-1)}>−</button>
            <span className={styles.stepperCount}>{localBedroomCount}</span>
            <button type="button" className={styles.stepperBtn} onClick={() => handleBedroomChange(+1)}>+</button>
          </div>
        </div>
      )}

      {/* Global Finishing State */}
      <div className={styles.globalStateSection}>
        <p className={styles.globalStateLabel}>
          {isAr ? '١. اختر الحالة الإجمالية للتشطيب' : '1. Set global finishing state'}
        </p>
        <div className={styles.globalStateCards}>
          {GLOBAL_STATES.map(gs => (
            <button
              key={gs.id}
              type="button"
              className={`${styles.stateCard} ${globalState === gs.id ? styles.stateCardActive : ''}`}
              onClick={() => handleSelectGlobalState(gs.id)}
            >
              <span className={styles.stateEmoji}>{gs.emoji}</span>
              <span className={styles.stateName}>{isAr ? gs.ar : gs.en}</span>
              <span className={styles.stateNameAr}>{isAr ? gs.en : gs.ar}</span>
              <span className={styles.stateDesc}>{isAr ? gs.desc_ar : gs.desc_en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Zone finishes note — CAD floor plans live in Step 3 above */}

      {/* Zone accordion */}
      {hasZones && (
        <div>
          <div className={styles.zonesHeader} style={{ marginBottom: 14 }}>
            <div>
              <p className={styles.zonesTitle}>
                {isAr ? '٢. مراجعة المناطق والتشطيبات' : '2. Review zones & finishes'}
              </p>
              <p className={styles.zonesSubtitle}>
                {isAr
                  ? 'انقر على أي منطقة لتعديل الأقسام والتشطيبات'
                  : 'Tap any zone to adjust trade sections or add detail'}
              </p>
            </div>

            {/* Undo / Redo controls */}
            <div className={styles.undoRedoControls}>
              <button
                type="button"
                className={styles.undoBtn}
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title={isAr ? 'تراجع عن آخر تغيير' : 'Undo last change'}
              >
                <RotateCcw size={13} />
                <span>{isAr ? 'تراجع' : 'Undo'}</span>
              </button>
              <button
                type="button"
                className={styles.redoBtn}
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title={isAr ? 'إعادة التغيير' : 'Redo change'}
              >
                <RotateCw size={13} />
                <span>{isAr ? 'إعادة' : 'Redo'}</span>
              </button>
            </div>
          </div>

          {(() => {
            const hasContainers = zoneInstances.some(z => getZoneTemplate(z.zone_template_id)?.is_container);

            if (hasContainers) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {zoneInstances.map(zoneInst => {
                    const tpl = getZoneTemplate(zoneInst.zone_template_id);
                    if (!tpl) return null;
                    return tpl.is_container
                      ? renderContainerZone(zoneInst)
                      : renderLeafZone(zoneInst);
                  })}
                </div>
              );
            }

            // Categorize non-container leaf zones
            const categorizedMap = new Map<string, ZoneInstance[]>();
            const uncategorized: ZoneInstance[] = [];

            for (const zInst of zoneInstances) {
              const category = CATEGORY_CONFIG.find(c => c.match(zInst.zone_template_id, zInst.instance_label));
              if (category) {
                if (!categorizedMap.has(category.key)) categorizedMap.set(category.key, []);
                categorizedMap.get(category.key)!.push(zInst);
              } else {
                uncategorized.push(zInst);
              }
            }

            return (
              <div>
                {CATEGORY_CONFIG.map(cat => {
                  const catZones = categorizedMap.get(cat.key);
                  if (!catZones || catZones.length === 0) return null;

                  return (
                    <div key={cat.key} className={styles.categorySectionCard}>
                      <div className={styles.categorySectionHeader}>
                        <div className={styles.categoryTitleGroup}>
                          <span className={styles.categoryEmoji}>{cat.emoji}</span>
                          <h3 className={styles.categoryTitleText}>{isAr ? cat.ar : cat.en}</h3>
                          <span className={styles.categoryCountBadge}>
                            {catZones.length} {isAr ? 'مناطق' : 'Zones'}
                          </span>
                        </div>
                        <div className={styles.categoryHeaderActions}>
                          <button
                            type="button"
                            className={styles.addCategoryZoneBtn}
                            onClick={() => handleAddZoneToCategory(cat.key, catZones)}
                            title={isAr ? 'إضافة منطقة جديدة لهذا القسم' : 'Add a zone to this section'}
                          >
                            <Plus size={12} />
                            <span>{isAr ? 'إضافة منطقة' : 'Add Zone'}</span>
                          </button>
                          <button
                            type="button"
                            className={styles.removeCategorySectionBtn}
                            onClick={() => handleRemoveSection(catZones)}
                            title={isAr ? 'حذف هذا القسم بالكامل' : 'Delete entire section'}
                          >
                            <Trash2 size={12} />
                            <span>{isAr ? 'حذف القسم' : 'Delete Section'}</span>
                          </button>
                        </div>
                      </div>

                      <div className={styles.categoryZoneList}>
                        {catZones.map(z => renderLeafZone(z))}
                      </div>
                    </div>
                  );
                })}

                {uncategorized.length > 0 && (
                  <div className={styles.categorySectionCard}>
                    <div className={styles.categorySectionHeader}>
                      <div className={styles.categoryTitleGroup}>
                        <span className={styles.categoryEmoji}>📍</span>
                        <h3 className={styles.categoryTitleText}>{isAr ? 'مناطق أخرى' : 'Other Areas'}</h3>
                        <span className={styles.categoryCountBadge}>
                          {uncategorized.length} {isAr ? 'مناطق' : 'Zones'}
                        </span>
                      </div>
                      <div className={styles.categoryHeaderActions}>
                        <button
                          type="button"
                          className={styles.removeCategorySectionBtn}
                          onClick={() => handleRemoveSection(uncategorized)}
                          title={isAr ? 'حذف هذه المناطق' : 'Delete section'}
                        >
                          <Trash2 size={12} />
                          <span>{isAr ? 'حذف القسم' : 'Delete Section'}</span>
                        </button>
                      </div>
                    </div>
                    <div className={styles.categoryZoneList}>
                      {uncategorized.map(z => renderLeafZone(z))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Add Custom Zone Panel with Smart Suggestions */}
          <div className={styles.zoneManagementFooter}>
            <div className={styles.addCustomZonePanel}>
              <div className={styles.addCustomZoneHeader}>
                <Sparkles size={14} className={styles.addCustomZoneIcon} />
                <span className={styles.addCustomZoneLabel}>
                  {isAr ? 'إضافة منطقة مخصصة' : 'Add Custom Zone'}
                </span>
              </div>
              <div className={styles.addCustomZoneRow}>
                <input
                  type="text"
                  className={styles.addCustomZoneInput}
                  value={customZoneInput}
                  onChange={e => setCustomZoneInput(e.target.value)}
                  placeholder={isAr ? 'اكتب اسم المنطقة (مثال: غرفة غسيل، مخزن، مكتب)…' : 'Type zone name (e.g. Laundry Room, Storage, Office)…'}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customZoneInput.trim()) {
                      handleAddCustomZone();
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.addCustomZoneBtn}
                  onClick={handleAddCustomZone}
                  disabled={!customZoneInput.trim()}
                >
                  <Plus size={14} />
                  {isAr ? 'إضافة المنطقة' : 'Add Zone'}
                </button>
              </div>

              {/* Smart suggestions */}
              <div className={styles.smartSuggestionsBlock}>
                <span className={styles.smartSuggestionsLabel}>
                  💡 {isAr ? 'اقتراحات ذكية:' : 'Smart Suggestions:'}
                </span>
                <div className={styles.smartSuggestionsGrid}>
                  {SMART_SUGGESTIONS
                    .filter(s => {
                      const name = (isAr ? s.ar : s.en).toLowerCase();
                      const query = customZoneInput.trim().toLowerCase();
                      return !query || name.includes(query);
                    })
                    .map(s => {
                      const label = isAr ? s.ar : s.en;
                      const exists = zoneInstances.some(z =>
                        z.instance_label?.toLowerCase() === label.toLowerCase() ||
                        z.zone_template_id.toLowerCase().includes(s.en.toLowerCase().replace(/\s+/g, ''))
                      );
                      return (
                        <button
                          key={s.en}
                          type="button"
                          className={`${styles.suggestionChip} ${exists ? styles.suggestionChipAdded : ''}`}
                          onClick={() => {
                            if (!exists) {
                              const gs = globalState ?? 'red_brick';
                              updateZones(addCustomZone(zoneInstances, label, gs));
                            }
                          }}
                        >
                          {exists ? <Check size={10} /> : <Plus size={10} />}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasZones && !globalState && (
        <div style={{
          textAlign: 'center', padding: '32px 16px',
          background: 'var(--color-surface)', borderRadius: 12,
          border: '1.5px dashed var(--color-border)',
          color: 'var(--color-text-muted)', fontSize: 13
        }}>
          {isAr
            ? '👆 اختر الحالة الإجمالية للتشطيب أعلاه لبدء تحديد مواصفات العقار'
            : '👆 Select a global finishing state above to populate property specs'}
        </div>
      )}
    </div>
  );
}
