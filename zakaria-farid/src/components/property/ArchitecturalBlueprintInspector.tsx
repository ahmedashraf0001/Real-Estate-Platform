'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Zap, 
  Wind, 
  Droplet, 
  Building, 
  Check, 
  Sparkles,
  MessageSquare,
  Plus,
  Minus,
  X,
  Maximize2,
  Minimize2,
  Info
} from 'lucide-react';
import { ZoneInstance, ZoneSpatialLayout, getZoneBadge, FinishBadge } from '@/lib/layering';
import { computeMetricLayout, metricInputFromSpatial, MetricRoomRect } from '@/lib/layering/floorplanLayout';
import { FALLBACK_ZONE_METRICS, FALLBACK_ZONE_TITLES, GENERIC_ZONE_METRIC } from '@/lib/layering/zoneMetrics';
import { ATTRIBUTE_TEMPLATES } from '@/lib/layering';
import { blueprintLabel } from '@/lib/layering/labels';
import BuildingBlueprintPreview from '@/components/blueprint/BuildingBlueprintPreview';
import { buildingFloorKey, floorLabel, selectBuildingFloor, type BlueprintView } from '@/lib/layering/buildingBlueprint';
import { parseBlueprintView, serializeBlueprintView } from '@/lib/layering/publicBlueprint';
import { zoneLabel } from '@/lib/layering/labels';
import type { BuildingUnitItem } from '@/lib/supabase/types';
import type { TradeInstance } from '@/lib/layering';

type SystemKey = 'all' | 'civil' | 'electrical' | 'plumbing' | 'hvac' | 'finishes';

const TIER_BADGES: Record<Exclude<FinishBadge, 'unknown'>, { en: string; ar: string; color: string; bg: string }> = {
  fully_finished: { en: 'Fully Finished', ar: 'تشطيب كامل', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  semi_finished:  { en: 'Semi-Finished',  ar: 'نص تشطيب',   color: '#E0A63A', bg: 'rgba(224, 166, 58, 0.12)' },
  red_brick:      { en: 'Red Brick',      ar: 'طوب أحمر',    color: '#E06D5B', bg: 'rgba(224, 109, 91, 0.12)' },
  mixed:          { en: 'Mixed Finishing', ar: 'تشطيب مختلط', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
};

interface ArchitecturalBlueprintInspectorProps {
  zones?: ZoneInstance[];
  propertyTitle: string;
  locale?: string;
  propertyType?: string;
  propertyImages?: string[];
  inventory?: BuildingUnitItem[];
  onRequestUnit?: (unit: ZoneInstance) => void;
}

interface TradeSpecItem {
  id: string;
  name: string;
  nameAr: string;
  spec: string;
  specAr: string;
  icon: 'zap' | 'wind' | 'droplet' | 'layers';
  badge: string;
  badgeAr: string;
}

/** "Ceramic (سيراميك)" -> the part for the requested language. */
function pickLang(value: string, isAr: boolean): string {
  const m = value.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (!m) return value;
  return isAr ? m[2] : m[1];
}

/** Specs shown for a space come only from the trades the admin recorded on that zone. */
function buildTradeSpecs(trades: TradeInstance[] = []): TradeSpecItem[] {
  return trades.map(t => {
    const status = { en: blueprintLabel('status', t.status, false), ar: blueprintLabel('status', t.status, true) };
    const attrs = (t.attributes || []).filter(a => a.value !== null && a.value !== '' && a.value !== false);
    const attrText = (isAr: boolean) => attrs.map(a => {
      const tpl = ATTRIBUTE_TEMPLATES.find(x => x.id === a.attribute_template_id);
      const label = tpl ? blueprintLabel('attribute', tpl.id, isAr) : a.custom_label || blueprintLabel('attribute', a.attribute_template_id, isAr);
      const value = a.value === true ? (isAr ? 'نعم' : 'Yes') : pickLang(String(a.value), isAr);
      return `${label}: ${value}`;
    }).join(' · ');
    const id = t.trade_template_id;
    const icon: TradeSpecItem['icon'] = id.includes('elec') ? 'zap' : id.includes('hvac') ? 'wind' : id.includes('plumb') ? 'droplet' : 'layers';
    return {
      id: t.id || id,
      name: blueprintLabel('trade', id, false),
      nameAr: blueprintLabel('trade', id, true),
      spec: attrText(false),
      specAr: attrText(true),
      icon,
      badge: status.en,
      badgeAr: status.ar,
    };
  });
}

const KNOWN_TEMPLATE_AR_LABELS: Record<string, string> = {
  'bld.entrance_gate': 'بوابة وسور المدخل',
  'bld.entrance_lobby': 'مدخل وردهة العمارة',
  'bld.staircase': 'السلم الرئيسي',
  'bld.elevator': 'المصعد الكهربائي',
  'bld.electric_box': 'لوحة العدادات',
  'bld.water_motors': 'مضخات المياه',
  'bld.garage_bays': 'باكيات الجراج',
  'bld.guard_room': 'غرفة الحارس والأمن',
  'bld.commercial_shop': 'محل تجاري',
  'bld.central_corridor': 'طرقة التوزيع',
  'bld.lightwell': 'المنور والخدمات',
  'bld.balcony': 'البلكونة والتراس',
  'bld.roof_terrace': 'تراس السطح والبرجولا',
  'bld.roof_service': 'غرفة المحرك والخزانات',
  'bld.unit': 'وحدة سكنية',
  'grg.garage': 'مساحة الجراج',
  'grg.ramp': 'رامب وبوابة الدخول',
  'grg.bay': 'باكيات السيارات',
  'grg.elec': 'الكهرباء والإنارة',
  'grg.security_booth': 'كابينة الأمن',
  'grg.storage': 'المخزن الملحق',
  'apt.reception': 'الاستقبال والصالة',
  'apt.master_bed': 'غرفة النوم الرئيسية',
  'apt.master_bath': 'حمام الماستر',
  'apt.std_bed': 'غرفة نوم',
  'apt.main_bath': 'الحمام الرئيسي',
  'apt.kitchen': 'المطبخ',
  'apt.balcony': 'الشرفة الخارجية',
  'apt.corridor': 'الطرقة الداخلية',
  'apt.guest_bath': 'حمام الضيوف',
  'apt.laundry': 'غرفة الغسيل',
  'apt.dressing': 'غرفة الملابس',
};

function isArabicText(str?: string): boolean {
  if (!str) return false;
  return /[\u0600-\u06FF]/.test(str);
}

function computeRoomTextLayout(
  title: string,
  boxWidth: number,
  boxHeight: number
): { lines: string[]; fontSize: number; lineHeight: number } {
  if (!title) return { lines: [''], fontSize: 7.5, lineHeight: 9.5 };

  const cleanTitle = title.trim();
  const words = cleanTitle.split(/\s+/);
  
  const availW = Math.max(24, boxWidth - 8);
  const availH = Math.max(20, boxHeight - 20);

  let lines: string[] = [];

  if (words.length <= 1) {
    lines = [cleanTitle];
  } else if (words.length === 2) {
    if (cleanTitle.length <= 14 && availW >= 75) {
      lines = [cleanTitle];
    } else {
      lines = [words[0], words[1]];
    }
  } else if (words.length <= 4) {
    const mid = Math.ceil(words.length / 2);
    lines = [
      words.slice(0, mid).join(' '),
      words.slice(mid).join(' ')
    ];
  } else {
    // 5 or more words: 2 or 3 lines depending on height
    if (availH >= 65 && availW < 130) {
      const p1 = Math.ceil(words.length / 3);
      const p2 = Math.ceil((words.length * 2) / 3);
      lines = [
        words.slice(0, p1).join(' '),
        words.slice(p1, p2).join(' '),
        words.slice(p2).join(' ')
      ];
    } else {
      const mid = Math.ceil(words.length / 2);
      lines = [
        words.slice(0, mid).join(' '),
        words.slice(mid).join(' ')
      ];
    }
  }

  lines = lines.filter(l => l.trim().length > 0);
  const maxLineLen = Math.max(...lines.map(l => l.length), 1);

  // Compute font size to fit inside the room envelope
  const widthFont = (availW / (maxLineLen * 0.55));
  const heightFont = (availH / (lines.length + 1.25)) * 0.85;
  
  let fontSize = Math.min(8.5, widthFont, heightFont);
  fontSize = Math.max(5.4, Math.min(fontSize, 9.0));
  
  const lineHeight = Math.max(7.2, fontSize * 1.25);

  return {
    lines,
    fontSize: Number(fontSize.toFixed(1)),
    lineHeight: Number(lineHeight.toFixed(1)),
  };
}

interface ProcessedZone {
  id: string;
  templateId: string;
  zoneTitle: string;
  zoneTitleAr: string;
  floorKey: string;
  floorLabel: string;
  floorLabelAr: string;
  unitLabel?: string;
  sqm: number;
  ceiling: string;
  dims: string;
  length_m: number;
  width_m: number;
  badge: FinishBadge;
  image: string;
  imagesList: string[];
  trades: TradeSpecItem[];
  doorCount: number | null;
  windowCount: number | null;
  /** True only when the admin entered real dimensions for this space. */
  measured: boolean;
  /** Area used to draw a schematic box when the space has no real dimensions. */
  layoutSqm: number;
  spatial?: ZoneSpatialLayout;
}

const FLOOR_NAME_MAP_AR: Record<string, string> = {
  'ground': 'الدور الأرضي',
  'ground floor': 'الدور الأرضي',
  'ground level': 'الدور الأرضي',
  'ground floor plan': 'مسقط الدور الأرضي',
  'floor 1': 'الدور الأول',
  'first floor': 'الدور الأول',
  '1st floor': 'الدور الأول',
  'first floor plan': 'مسقط الدور الأول',
  'floor 2': 'الدور الثاني',
  'second floor': 'الدور الثاني',
  '2nd floor': 'الدور الثاني',
  'second floor plan': 'مسقط الدور الثاني',
  'floor 3': 'الدور الثالث',
  'third floor': 'الدور الثالث',
  '3rd floor': 'الدور الثالث',
  'third floor plan': 'مسقط الدور الثالث',
  'floor 4': 'الدور الرابع',
  'fourth floor': 'الدور الرابع',
  '4th floor': 'الدور الرابع',
  'floor 5': 'الدور الخامس',
  'fifth floor': 'الدور الخامس',
  '5th floor': 'الدور الخامس',
  'roof': 'طابق الروف (السطح)',
  'roof sky floor': 'طابق الروف (السطح)',
  'roof terrace': 'تراس الروف',
  'roof floor': 'طابق الروف',
  'roof garden': 'حديقة الروف',
  'roof level': 'طابق الروف',
  'basement': 'طابق البدروم',
  'basement level': 'طابق البدروم',
  'penthouse': 'طابق البنتهاوس',
  'podium': 'طابق البوديوم',
  'mezzanine': 'طابق الميزانين',
};

const formatFloorLabel = (fKey: string, isAr: boolean, fZone?: any): string => {
  if (!isAr) {
    return fZone?.floorLabel || fKey;
  }
  if (fZone?.floorLabelAr && !fZone.floorLabelAr.toLowerCase().startsWith('floor')) {
    return fZone.floorLabelAr;
  }
  const cleanKey = (fKey || '').toLowerCase().trim();
  if (FLOOR_NAME_MAP_AR[cleanKey]) return FLOOR_NAME_MAP_AR[cleanKey];

  const floorMatch = cleanKey.match(/(?:floor|level|الطابق|الدور)\s*(\d+)/i);
  if (floorMatch) {
    const num = floorMatch[1];
    const arNumbers: Record<string, string> = {
      '1': 'الأول',
      '2': 'الثاني',
      '3': 'الثالث',
      '4': 'الرابع',
      '5': 'الخامس',
      '6': 'السادس',
      '7': 'السابع',
      '8': 'الثامن',
      '9': 'التاسع',
      '10': 'العاشر',
    };
    return `الدور ${arNumbers[num] || num}`;
  }
  if (cleanKey.includes('ground')) return 'الدور الأرضي';
  if (cleanKey.includes('roof')) return 'طابق الروف (السطح)';
  if (cleanKey.includes('basement')) return 'طابق البدروم';
  if (cleanKey.includes('penthouse')) return 'طابق البنتهاوس';

  return fKey;
};

export const ArchitecturalBlueprintInspector: React.FC<ArchitecturalBlueprintInspectorProps> = ({
  zones = [],
  propertyTitle,
  locale = 'en',
  propertyType = 'apartment',
  inventory = [],
  onRequestUnit,
  propertyImages: _propertyImages = []
}) => {
  const isAr = locale === 'ar';
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bldView, updateBldView] = useState<BlueprintView>({ mode: 'elevation' });
  const setBldView = (view: BlueprintView) => {
    updateBldView(view);
    setIsFullscreen(false);
    setSelectedZoneId(null);
    const url = new URL(window.location.href);
    url.searchParams.set('bp', serializeBlueprintView(view));
    window.history.pushState(null, '', url);
  };
  useEffect(() => {
    if (propertyType !== 'building') return;
    const hydrate = () => {
      const view = parseBlueprintView(new URL(window.location.href).searchParams.get('bp'));
      const floor = view.mode !== 'elevation' ? selectBuildingFloor(zones, view.floorKey) : null;
      const valid = !floor || (floor.units.length + floor.core.length > 0 && (view.mode !== 'unit' || floor.units.some(u => u.id === view.unitId)));
      updateBldView(valid ? view : { mode: 'elevation' });
      setSelectedZoneId(null);
    };
    hydrate();
    window.addEventListener('popstate', hydrate);
    return () => window.removeEventListener('popstate', hydrate);
  }, [propertyType, zones]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [activeModalZone, setActiveModalZone] = useState<ProcessedZone | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchPinchRef = useRef<{ initialDist: number; initialZoom: number } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fsStageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const updateTheme = () => {
      const themeAttr = document.documentElement.getAttribute('data-theme');
      setCurrentTheme(themeAttr === 'light' ? 'light' : 'dark');
    };
    updateTheme();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-theme') {
          updateTheme();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Lock body scroll when fullscreen or modal is open to prevent page scrolling behind
  useEffect(() => {
    if (isFullscreen || activeModalZone) {
      document.documentElement.classList.add('cad-fullscreen-locked');
      document.body.classList.add('cad-fullscreen-locked');
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('touch-action', 'none', 'important');
      return () => {
        document.documentElement.classList.remove('cad-fullscreen-locked');
        document.body.classList.remove('cad-fullscreen-locked');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('touch-action');
      };
    }
  }, [isFullscreen, activeModalZone]);

  // Keyboard shortcut (Escape to exit fullscreen or modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeModalZone) setActiveModalZone(null);
        else if (isFullscreen) setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalZone, isFullscreen]);

  // Non-passive touch event listeners to guarantee 100% smooth touch panning and pinch-to-zoom without page scroll
  useEffect(() => {
    const attachStageListeners = (el: HTMLDivElement | null) => {
      if (!el) return () => {};

      let isMoving = false;
      let startX = 0;
      let startY = 0;
      let initialPanX = pan.x;
      let initialPanY = pan.y;

      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          isMoving = true;
          setIsDragging(true);
          const t = e.touches[0];
          startX = t.clientX;
          startY = t.clientY;
          initialPanX = pan.x;
          initialPanY = pan.y;
          dragStartRef.current = { x: t.clientX, y: t.clientY, panX: pan.x, panY: pan.y };
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          touchPinchRef.current = { initialDist: dist, initialZoom: zoom };
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        if (e.cancelable) {
          e.preventDefault();
        }
        e.stopPropagation();

        if (e.touches.length === 1 && isMoving) {
          const t = e.touches[0];
          const dx = t.clientX - startX;
          const dy = t.clientY - startY;
          setPan({
            x: initialPanX + dx,
            y: initialPanY + dy,
          });
        } else if (e.touches.length === 2 && touchPinchRef.current) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          const scaleFactor = dist / touchPinchRef.current.initialDist;
          const newZoom = Math.min(2.5, Math.max(0.75, touchPinchRef.current.initialZoom * scaleFactor));
          setZoom(newZoom);
        }
      };

      const onTouchEnd = () => {
        isMoving = false;
        setIsDragging(false);
        touchPinchRef.current = null;
      };

      el.addEventListener('touchstart', onTouchStart, { passive: false });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd, { passive: true });
      el.addEventListener('touchcancel', onTouchEnd, { passive: true });

      return () => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchEnd);
      };
    };

    const cleanup1 = attachStageListeners(stageRef.current);
    const cleanup2 = attachStageListeners(fsStageRef.current);
    return () => {
      cleanup1();
      cleanup2();
    };
  }, [pan, zoom, isFullscreen]);

  // 1. Process All Zones with Dimensions, Titles, and Trades
  const processedZones = useMemo<ProcessedZone[]>(() => {
    const list: ProcessedZone[] = [];

    const processSingle = (z: ZoneInstance, parentFloorKey?: string, unitLabel?: string) => {
      const tid = z.zone_template_id;
      const metric = FALLBACK_ZONE_METRICS[tid] || GENERIC_ZONE_METRIC;
      const titleFallback = FALLBACK_ZONE_TITLES[tid] || { en: z.instance_label || 'Space', ar: z.instance_label || 'مساحة' };
      const titleEn = propertyType === 'building' ? zoneLabel(z, false) : z.instance_label || titleFallback.en;
      // A flat is named by its code ("Flat 3A"), not the generic template label.
      const titleAr = propertyType === 'building' ? zoneLabel(z, true) : (tid === 'bld.unit' && z.instance_label) ? z.instance_label : (KNOWN_TEMPLATE_AR_LABELS[tid] || (isArabicText(z.instance_label) ? z.instance_label : titleFallback.ar) || titleEn);

      const sp = z.spatial;
      const measured = !!(sp && sp.length_m > 0 && sp.width_m > 0);
      const length_m = measured ? sp!.length_m : metric.length_m;
      const width_m = measured ? sp!.width_m : metric.width_m;
      const sqm = measured ? (sp!.sqm ?? Number((sp!.length_m * sp!.width_m).toFixed(1))) : 0;
      const ceiling = sp?.ceiling_height || '';
      const dims = measured ? `${length_m.toFixed(1)}m × ${width_m.toFixed(1)}m` : '';

      const floorKey = parentFloorKey || (propertyType === 'building' ? buildingFloorKey(z) : z.level_label || 'Floor 1');
      const floorLabel = floorKey === 'bld_ground' ? 'Ground Floor' : floorKey === 'bld_roof' ? 'Roof' : floorKey === 'bld_basement' ? 'Basement' : floorKey;
      const floorLabelAr = formatFloorLabel(floorKey, true);

      const doorCount = sp?.openings ? sp.openings.filter(o => o.kind === 'door').length : null;
      const windowCount = sp?.openings ? sp.openings.filter(o => o.kind === 'window').length : null;

      const imagesList = (z.images || []).filter(Boolean);

      list.push({
        id: z.id,
        templateId: tid,
        zoneTitle: titleEn,
        zoneTitleAr: titleAr,
        floorKey,
        floorLabel,
        floorLabelAr,
        unitLabel: unitLabel || (tid === 'bld.unit' ? z.instance_label : undefined),
        sqm,
        ceiling,
        dims,
        length_m,
        width_m,
        badge: getZoneBadge(z),
        image: imagesList[0] || '',
        imagesList,
        trades: buildTradeSpecs(z.trades),
        doorCount,
        windowCount,
        measured,
        layoutSqm: metric.sqm,
        spatial: z.spatial,
      });

      if (z.children && z.children.length > 0) {
        for (const child of z.children) {
          processSingle(child, floorKey, z.instance_label || 'Unit');
        }
      }
    };

    for (const z of zones) {
      processSingle(z);
    }

    return list;
  }, [zones, propertyType]);

  // 1.5 Extract Available Distinct Floors / Levels
  const availableFloors = useMemo(() => {
    const keys = Array.from(new Set(processedZones.filter(z => z.floorKey !== 'building').map(z => z.floorKey))).filter(Boolean);
    if (keys.length === 0) return ['Floor 1'];
    return keys;
  }, [processedZones]);

  const [activeFloorKey, setActiveFloorKey] = useState<string>(availableFloors[0] || 'Floor 1');

  // Keep activeFloorKey in sync when floors change
  useEffect(() => {
    if (availableFloors.length > 0 && !availableFloors.includes(activeFloorKey)) {
      setActiveFloorKey(availableFloors[0]);
    }
  }, [availableFloors, activeFloorKey]);

  // 2. Active Zones for Current View
  const currentViewZones = useMemo(() => {
    // If property has multiple floors (e.g. Ground Floor, First Floor, Roof), filter by active floor tab!
    if (availableFloors.length > 1) {
      return processedZones.filter(z => z.floorKey === activeFloorKey);
    }
    return processedZones;
  }, [processedZones, availableFloors, activeFloorKey]);

  // 3. Metric Layout
  const metricLayout = useMemo(() => {
    const inputs = currentViewZones.map(z => metricInputFromSpatial(z.id, z.spatial, z.measured ? z.sqm : z.layoutSqm));
    return computeMetricLayout(inputs, 680, 440);
  }, [currentViewZones]);

  const previewSlots = useMemo(() => {
    return metricLayout.rooms.map((s: MetricRoomRect) => {
      const found = currentViewZones.find(z => z.id === s.id);
      return {
        ...s,
        zone: found,
        title: isAr ? found?.zoneTitleAr || '' : found?.zoneTitle || '',
        sqm: found?.sqm || 0,
        dims: found?.dims || '',
      };
    });
  }, [metricLayout, currentViewZones, isAr]);

  // Structural Envelope (indoor conditioned rooms only)
  const indoorSlots = useMemo(() => {
    return previewSlots.filter((s: { zone?: ProcessedZone }) => {
      const tid = s.zone?.templateId || '';
      return !tid.includes('balcony') && !tid.includes('terrace');
    });
  }, [previewSlots]);

  const envBounds = useMemo(() => {
    const slots = indoorSlots.length > 0 ? indoorSlots : previewSlots;
    if (slots.length === 0) return { minX: 40, maxX: 640, minY: 40, maxY: 400 };
    return {
      minX: Math.min(...slots.map((s: { x: number }) => s.x)),
      maxX: Math.max(...slots.map((s: { x: number; w: number }) => s.x + s.w)),
      minY: Math.min(...slots.map((s: { y: number }) => s.y)),
      maxY: Math.max(...slots.map((s: { y: number; h: number }) => s.y + s.h)),
    };
  }, [indoorSlots, previewSlots]);

  // Dynamic layout bounding coordinates for rooms
  const layoutBounds = useMemo(() => {
    if (previewSlots.length === 0) return { minX: 40, maxX: 640, minY: 40, maxY: 400 };
    const minX = Math.min(...previewSlots.map(s => s.x));
    const maxX = Math.max(...previewSlots.map(s => s.x + s.w));
    const minY = Math.min(...previewSlots.map(s => s.y));
    const maxY = Math.max(...previewSlots.map(s => s.y + s.h));
    return { minX, maxX, minY, maxY };
  }, [previewSlots]);

  // Mathematically calculated positions for stamps & compass to prevent clipping
  const stampWidth = locale === 'ar' ? 260 : 248;
  const stampX = useMemo(() => Math.max(layoutBounds.minX, layoutBounds.maxX - stampWidth), [layoutBounds.minX, layoutBounds.maxX, stampWidth]);
  const stampY = useMemo(() => layoutBounds.maxY + 10, [layoutBounds.maxY]);
  const compassX = useMemo(() => layoutBounds.maxX - 22, [layoutBounds.maxX]);

  // Dynamic tight viewBox that incorporates drawing, stamps, and north arrow
  const dynamicViewBox = useMemo(() => {
    const { minX, maxX, minY, maxY } = layoutBounds;
    const effectiveMinX = Math.min(minX, stampX);
    const effectiveMaxX = Math.max(maxX, stampX + stampWidth, compassX + 30);
    const padLeft = 24;
    const padRight = 24;
    const padTop = 38; // Accommodates North Compass Arrow
    const padBottom = 46; // Accommodates Title Block Stamp
    const x = Math.floor(effectiveMinX - padLeft);
    const y = Math.floor(minY - padTop);
    const w = Math.ceil((effectiveMaxX - effectiveMinX) + padLeft + padRight);
    const h = Math.ceil((maxY - minY) + padTop + padBottom);
    return `${x} ${y} ${w} ${h}`;
  }, [layoutBounds, stampX, stampWidth, compassX]);

  const totalWidthM = useMemo(() => {
    if (previewSlots.length === 0) return '24.00';
    return ((layoutBounds.maxX - layoutBounds.minX) / (metricLayout.pxPerMeter || 1)).toFixed(2);
  }, [layoutBounds, metricLayout]);

  const totalDepthM = useMemo(() => {
    if (previewSlots.length === 0) return '16.00';
    return ((layoutBounds.maxY - layoutBounds.minY) / (metricLayout.pxPerMeter || 1)).toFixed(2);
  }, [layoutBounds, metricLayout]);

  // Zoom and Pan Handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const t = e.touches[0];
      dragStartRef.current = { x: t.clientX, y: t.clientY, panX: pan.x, panY: pan.y };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchPinchRef.current = { initialDist: dist, initialZoom: zoom };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0];
      const dx = t.clientX - dragStartRef.current.x;
      const dy = t.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    } else if (e.touches.length === 2 && touchPinchRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / touchPinchRef.current.initialDist;
      const newZoom = Math.min(2.5, Math.max(0.75, touchPinchRef.current.initialZoom * scaleFactor));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchPinchRef.current = null;
  };

  // When room is clicked -> open popup modal with specs
  const handleRoomClick = (zone: ProcessedZone | undefined) => {
    if (!zone) return;
    setActiveModalZone(zone);
  };

  // Every level of the building, top to bottom, from the zones the admin recorded.
  const buildingLevels = useMemo(() => {
    if (propertyType !== 'building') return [];
    const rank = (k: string) => {
      if (k === 'bld_roof') return 1e6;
      if (k === 'bld_ground') return 0;
      if (k === 'bld_basement') return -1;
      const n = parseInt(k.match(/\d+/)?.[0] || '', 10);
      return Number.isFinite(n) ? n : 0.5;
    };
    const keys = Array.from(new Set(processedZones.filter(z => z.floorKey !== 'building').map(z => z.floorKey)));
    return keys.map(key => {
      const onFloor = processedZones.filter(z => z.floorKey === key);
      const flats = onFloor.filter(z => z.templateId === 'bld.unit');
      const shared = onFloor.filter(z => !z.unitLabel);
      const leaves = onFloor.filter(z => z.templateId !== 'bld.unit');
      const allMeasured = leaves.length > 0 && leaves.every(z => z.measured);
      return {
        key,
        rank: rank(key),
        labelEn: key === 'bld_ground' ? 'Ground Floor' : key === 'bld_roof' ? 'Roof' : key === 'bld_basement' ? 'Basement' : key,
        labelAr: floorLabel(key, true),
        flats: flats.map(f => isAr ? f.zoneTitleAr : f.zoneTitle),
        sharedCount: shared.length,
        templates: onFloor.map(z => z.templateId),
        sqm: allMeasured ? leaves.reduce((sum, z) => sum + z.sqm, 0) : null,
      };
    }).sort((a, b) => b.rank - a.rank);
  }, [processedZones, propertyType, isAr]);

  const viewMeasured = currentViewZones.length > 0 && currentViewZones.every(z => z.measured);

  // Vector SVG Content Renderer
  const renderVectorSvgContent = () => {
    /* ─── 1. BUILDING ELEVATION: drawn from the recorded levels and flats ─── */
    if (propertyType === 'building' && bldView.mode === 'elevation') {
      const bldX = 140;
      const bldW = 460;
      const bldRight = bldX + bldW;
      const floorH = 60;
      const groundH = 60;
      const basementH = 50;
      const crownH = 40;
      const coreW = 56;

      const roofLevel = buildingLevels.find(l => l.key === 'bld_roof');
      const groundLevel = buildingLevels.find(l => l.key === 'bld_ground');
      const basementLevel = buildingLevels.find(l => l.key === 'bld_basement');
      const typical = buildingLevels.filter(l => l !== roofLevel && l !== groundLevel && l !== basementLevel);

      const roofY = crownH + 10;
      const groundY = roofY + typical.length * floorH;
      const gradeY = groundY + (groundLevel ? groundH : 0);
      const height = gradeY + (basementLevel ? basementH : 0) + 30;

      const summaryOf = (level: typeof buildingLevels[number]) => [
        level.flats.length > 0
          ? (isAr ? `${level.flats.length} ${level.flats.length === 1 ? 'شقة' : 'شقق'}` : `${level.flats.length} ${level.flats.length === 1 ? 'flat' : 'flats'}`)
          : '',
        level.sharedCount > 0 ? (isAr ? `${level.sharedCount} مساحات` : `${level.sharedCount} spaces`) : '',
        level.sqm ? `${level.sqm.toFixed(0)} m²` : '',
      ].filter(Boolean).join(' • ');

      const infoCard = (level: typeof buildingLevels[number], y: number, strong = false) => (
        <g transform={`translate(${bldRight + 16}, ${y})`}>
          <rect width="150" height="34" rx="6" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeOpacity={strong ? 0.6 : 0.3} strokeWidth={strong ? 1.2 : 1} />
          <text x={isAr ? 142 : 8} y="14" fontSize="9.5" fill="var(--cad-text-primary)" fontWeight="700" textAnchor="start" style={{ direction: isAr ? 'rtl' : 'ltr', unicodeBidi: 'plaintext' }}>
            {isAr ? level.labelAr : level.labelEn}
          </text>
          <text x={isAr ? 142 : 8} y="26" fontSize="7.5" fill="var(--gold-primary)" textAnchor="start" style={{ direction: isAr ? 'rtl' : 'ltr', unicodeBidi: 'plaintext' }}>
            {summaryOf(level)}
          </text>
          <text x={isAr ? 8 : 142} y="20" fontSize="8" fill="var(--gold-primary)" textAnchor={isAr ? 'start' : 'end'}>
            {isAr ? '‹' : '›'}
          </text>
        </g>
      );

      // One facade bay per flat: big balcony window + smaller window, mirrored on the far side of the core.
      const renderBay = (flat: string, x: number, w: number, mirrored: boolean, y: number) => {
        const bigW = Math.max(24, w * 0.46);
        const smallW = Math.max(16, w * 0.3);
        const bigX = mirrored ? w - bigW - 8 : 8;
        const smallX = mirrored ? 10 : w - smallW - 10;
        const balX = mirrored ? w - bigW - 14 : 2;
        const balW = bigW + 12;
        return (
          <g key={flat} transform={`translate(${x}, ${y + 4})`}>
            <rect x={bigX} y="4" width={bigW} height={floorH - 12} fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
            <line x1={bigX + bigW / 2} y1="4" x2={bigX + bigW / 2} y2={floorH - 8} stroke="#7FB4D8" strokeWidth="1.2" />
            <rect x={balX} y={floorH - 22} width={balW} height="12" fill="url(#pubElevBalconyGrad)" stroke="#7FB4D8" strokeWidth="1" />
            {[0.25, 0.5, 0.75].map(f => (
              <line key={f} x1={balX + balW * f} y1={floorH - 22} x2={balX + balW * f} y2={floorH - 10} stroke="#7FB4D8" strokeWidth="1" />
            ))}
            <rect x={balX} y={floorH - 10} width={balW} height="4" fill="var(--gold-primary)" />
            <rect x={smallX} y="8" width={smallW} height={floorH - 20} rx="1" fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
            <line x1={smallX + smallW / 2} y1="8" x2={smallX + smallW / 2} y2={floorH - 12} stroke="#7FB4D8" strokeWidth="1" />
            <text x={w / 2} y="2" fontSize="6.5" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800" fontFamily="monospace">{flat}</text>
          </g>
        );
      };

      return (
        <svg
          viewBox={`0 0 760 ${height}`}
          className="cad-vector-svg fp-building-elevation"
          style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`, willChange: 'transform', transformOrigin: 'center center', direction: 'ltr' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="pubElevGrid" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M 12 0 L 0 0 0 12" fill="none" stroke="var(--cad-grid-color)" strokeWidth="0.5" />
            </pattern>
            <pattern id="pubElevMajorGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--cad-grid-color)" strokeOpacity="0.8" strokeWidth="0.8" />
            </pattern>
            <pattern id="pubElevGroundHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--gold-primary)" strokeOpacity="0.35" strokeWidth="1" />
            </pattern>
            <linearGradient id="pubElevGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(127, 180, 216, 0.35)" />
              <stop offset="40%" stopColor="rgba(127, 180, 216, 0.15)" />
              <stop offset="60%" stopColor="rgba(221, 167, 82, 0.08)" />
              <stop offset="100%" stopColor="rgba(127, 180, 216, 0.25)" />
            </linearGradient>
            <linearGradient id="pubElevBalconyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(127, 180, 216, 0.28)" />
              <stop offset="100%" stopColor="rgba(127, 180, 216, 0.06)" />
            </linearGradient>
            <linearGradient id="pubElevLobbyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(221, 167, 82, 0.22)" />
              <stop offset="100%" stopColor="rgba(221, 167, 82, 0.04)" />
            </linearGradient>
          </defs>

          <rect width="760" height={height} fill="var(--cad-stage-bg)" />
          <rect width="760" height={height} fill="url(#pubElevGrid)" />
          <rect width="760" height={height} fill="url(#pubElevMajorGrid)" opacity="0.4" />

          {/* Level lines on the left */}
          {[roofY, ...typical.map((_, i) => roofY + (i + 1) * floorH)].map((y, i) => (
            <g key={`datum-${i}`} className="fp-datum-group">
              <line x1="20" y1={y} x2={bldX - 8} y2={y} stroke="var(--cad-dims-color)" strokeOpacity="0.4" strokeDasharray="3 3" />
              <circle cx="34" cy={y} r="4" fill="none" stroke="var(--gold-primary)" strokeWidth="1" />
              <line x1="30" y1={y} x2="38" y2={y} stroke="var(--gold-primary)" strokeWidth="1" />
              <line x1="34" y1={y - 4} x2="34" y2={y + 4} stroke="var(--gold-primary)" strokeWidth="1" />
            </g>
          ))}

          {/* Building shell */}
          <rect x={bldX} y={roofY} width={bldW} height={gradeY - roofY} fill="rgba(255, 255, 255, 0.015)" stroke="var(--gold-primary)" strokeOpacity="0.55" strokeWidth="1.5" />

          {/* Roof crown */}
          {roofLevel && (
            <g>
              {roofLevel.templates.includes('bld.roof_terrace') && (
                <g transform={`translate(${bldX + 24}, ${roofY - 24})`}>
                  <rect width="140" height="24" fill="rgba(221, 167, 82, 0.08)" stroke="var(--gold-primary)" strokeWidth="1.2" />
                  {[20, 40, 60, 80, 100, 120].map(px => (
                    <line key={`perg-${px}`} x1={px} y1="0" x2={px} y2="24" stroke="var(--cad-dims-color)" strokeOpacity="0.4" strokeWidth="1" />
                  ))}
                  <line x1="0" y1="0" x2="140" y2="0" stroke="var(--gold-primary)" strokeWidth="2" />
                </g>
              )}
              {(roofLevel.templates.includes('bld.roof_service') || roofLevel.templates.includes('bld.staircase')) && (
                <g transform={`translate(${bldX + bldW / 2 - 40}, ${roofY - 32})`}>
                  <rect width="80" height="32" rx="2" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                  <line x1="20" y1="10" x2="60" y2="10" stroke="var(--cad-dims-color)" strokeOpacity="0.5" strokeWidth="1" />
                  <line x1="20" y1="16" x2="60" y2="16" stroke="var(--cad-dims-color)" strokeOpacity="0.5" strokeWidth="1" />
                  <line x1="20" y1="22" x2="60" y2="22" stroke="var(--cad-dims-color)" strokeOpacity="0.5" strokeWidth="1" />
                </g>
              )}
              {roofLevel.templates.includes('bld.roof_service') && (
                <g transform={`translate(${bldRight - 110}, ${roofY - 22})`}>
                  <rect x="0" y="4" width="34" height="18" rx="3" fill="rgba(127, 180, 216, 0.15)" stroke="#7FB4D8" strokeWidth="1.2" />
                  <rect x="42" y="4" width="34" height="18" rx="3" fill="rgba(127, 180, 216, 0.15)" stroke="#7FB4D8" strokeWidth="1.2" />
                  <line x1="34" y1="13" x2="42" y2="13" stroke="#7FB4D8" strokeWidth="1.5" />
                </g>
              )}
              <rect x={bldX} y={roofY - 4} width={bldW} height="4" fill="var(--gold-primary)" />
              <line x1={bldX} y1={roofY - 14} x2={bldRight} y2={roofY - 14} stroke="rgba(127, 180, 216, 0.6)" strokeWidth="1" strokeDasharray="6 3" />
              {infoCard(roofLevel, roofY - 40)}
            </g>
          )}

          {/* Typical floors: one bay per recorded flat, stair core in the middle */}
          {typical.map((level, idx) => {
            const y = roofY + idx * floorH;
            const n = level.flats.length;
            const leftCount = Math.ceil(n / 2);
            const rightCount = n - leftCount;
            const sideW = (bldW - coreW) / 2 - 12;
            const leftW = leftCount > 0 ? sideW / leftCount : 0;
            const rightW = rightCount > 0 ? sideW / rightCount : 0;
            return (
              <g key={level.key}>
                <rect x={bldX} y={y} width={bldW} height={floorH} fill={idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'rgba(221, 167, 82, 0.02)'} stroke="none" />
                <rect x={bldX - 4} y={y + floorH - 3} width={bldW + 8} height="4" fill="var(--gold-primary)" opacity="0.9" />

                {level.flats.slice(0, leftCount).map((flat, b) => renderBay(flat, bldX + 8 + b * leftW, leftW, false, y))}

                <g transform={`translate(${bldX + bldW / 2 - coreW / 2}, ${y + 4})`}>
                  <rect width={coreW} height={floorH - 8} fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeOpacity="0.4" strokeWidth="1.2" />
                  {[14, 28, 42].map(px => (
                    <line key={px} x1={px} y1="0" x2={px} y2={floorH - 8} stroke="var(--gold-primary)" strokeOpacity="0.3" strokeWidth="1" />
                  ))}
                </g>

                {level.flats.slice(leftCount).map((flat, b) => renderBay(flat, bldX + bldW / 2 + coreW / 2 + 4 + b * rightW, rightW, true, y))}

                {infoCard(level, y + floorH / 2 - 17)}
              </g>
            );
          })}

          {/* Ground floor: lobby and entrance */}
          {groundLevel && (
            <g>
              <rect x={bldX} y={groundY} width={bldW} height={groundH} fill="url(#pubElevLobbyGrad)" stroke="none" />
              <g transform={`translate(${bldX + bldW / 2 - 40}, ${groundY + 12})`}>
                <rect x="0" y="0" width="80" height={groundH - 12} fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <rect x="18" y="10" width="44" height={groundH - 22} fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                <line x1="40" y1="10" x2="40" y2={groundH - 12} stroke="var(--gold-primary)" strokeWidth="1.2" />
              </g>
              <g transform={`translate(${bldX + 20}, ${groundY + 16})`}>
                <rect width="130" height={groundH - 16} fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                <line x1="65" y1="0" x2="65" y2={groundH - 16} stroke="#7FB4D8" strokeWidth="1" />
              </g>
              <g transform={`translate(${bldRight - 150}, ${groundY + 16})`}>
                <rect width="130" height={groundH - 16} fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                <line x1="65" y1="0" x2="65" y2={groundH - 16} stroke="#7FB4D8" strokeWidth="1" />
              </g>
              {infoCard(groundLevel, groundY + groundH / 2 - 17, true)}
            </g>
          )}

          {/* Grade */}
          <rect x={bldX - 6} y={gradeY - 4} width={bldW + 12} height="5" fill="var(--gold-primary)" />
          <line x1="20" y1={gradeY} x2={bldX - 8} y2={gradeY} stroke="var(--gold-primary)" strokeWidth="1.2" />

          {/* Basement, only when recorded */}
          {basementLevel && (
            <g>
              <rect x={bldX - 10} y={gradeY + 1} width={bldW + 20} height={basementH} fill="url(#pubElevGroundHatch)" opacity="0.3" />
              <rect x={bldX} y={gradeY + 1} width={bldW} height={basementH} fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="1.5" strokeDasharray="6 3" />
              {infoCard(basementLevel, gradeY + 8)}
            </g>
          )}
        </svg>
      );
    }

    /* ─── 3. APARTMENT / FLAT / UNIT DETAILED BLUEPRINT ─── */
    return (
      <svg
        viewBox={dynamicViewBox}
        preserveAspectRatio="xMidYMid meet"
        className="cad-vector-svg cad-unit-svg"
        style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`, willChange: 'transform', transformOrigin: 'center center', direction: 'ltr' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="pubUnitCadGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--cad-grid-color)" strokeWidth="0.4" />
          </pattern>
          <pattern id="pubUnitParquetPattern" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 8 8 M 8 0 L 16 8 M 0 8 L 8 16 M 8 8 L 16 16" fill="none" stroke="var(--cad-parquet-stroke)" strokeWidth="0.8" />
            <rect width="16" height="16" fill="var(--cad-parquet-fill)" />
          </pattern>
          <pattern id="pubUnitTilePattern" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="var(--cad-tile-fill)" stroke="var(--cad-tile-stroke)" strokeWidth="0.6" />
          </pattern>
          <pattern id="pubUnitDeckPattern" width="8" height="16" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="8" y2="0" stroke="var(--cad-deck-stroke)" strokeWidth="0.8" />
            <rect width="8" height="16" fill="var(--cad-deck-fill)" />
          </pattern>
          <pattern id="pubUnitBedPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="0.8" fill="var(--cad-bed-dot)" />
            <rect width="10" height="10" fill="var(--cad-bed-fill)" />
          </pattern>
          <pattern id="pubUnitColumnHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--gold-primary)" strokeWidth="1.2" />
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect x="-300" y="-300" width="1400" height="1200" fill="var(--cad-stage-bg)" />
        <rect x="-300" y="-300" width="1400" height="1200" fill="url(#pubUnitCadGrid)" />

        {/* Structural Insulated Perimeter Envelopes (Single Envelope or Dual-Unit Side-by-Side Envelopes) */}
        {(() => {
          const isAr = locale === 'ar';
          const unitMap = new Map<string, typeof indoorSlots>();
          for (const s of indoorSlots) {
            const lbl = (s.zone?.zoneTitle || s.zone?.zoneTitleAr || s.id || '');
            let k = 'all';
            if (lbl.includes('وحدة أ') || lbl.includes('Unit A')) k = isAr ? 'وحدة أ' : 'Unit A';
            else if (lbl.includes('وحدة ب') || lbl.includes('Unit B')) k = isAr ? 'وحدة ب' : 'Unit B';
            if (!unitMap.has(k)) unitMap.set(k, []);
            unitMap.get(k)!.push(s);
          }

          const isMultiUnit = unitMap.size > 1 && !unitMap.has('all');
          const envelopes = isMultiUnit
            ? Array.from(unitMap.entries()).map(([label, slots]) => ({
                label,
                minX: Math.min(...slots.map((s: { x: number }) => s.x)),
                maxX: Math.max(...slots.map((s: { x: number; w: number }) => s.x + s.w)),
                minY: Math.min(...slots.map((s: { y: number }) => s.y)),
                maxY: Math.max(...slots.map((s: { y: number; h: number }) => s.y + s.h)),
              }))
            : [{ label: '', minX: envBounds.minX, maxX: envBounds.maxX, minY: envBounds.minY, maxY: envBounds.maxY }];

          return (
            <>
              {envelopes.map((env, eIdx) => (
                <g key={`pub-env-${eIdx}`} className="fp-envelope" pointerEvents="none">
                  <rect x={env.minX - 2} y={env.minY - 2} width={env.maxX - env.minX + 4} height={env.maxY - env.minY + 4} fill="none" stroke="var(--gold-primary)" strokeWidth="3.5" />
                  <rect x={env.minX + 2} y={env.minY + 2} width={env.maxX - env.minX - 4} height={env.maxY - env.minY - 4} fill="none" stroke="var(--gold-primary)" strokeOpacity="0.45" strokeWidth="1" />
                  {/* Reinforced Corner Concrete Columns */}
                  <rect x={env.minX - 5} y={env.minY - 5} width="10" height="10" fill="url(#pubUnitColumnHatch)" stroke="var(--gold-primary)" strokeWidth="1" />
                  <rect x={env.maxX - 5} y={env.minY - 5} width="10" height="10" fill="url(#pubUnitColumnHatch)" stroke="var(--gold-primary)" strokeWidth="1" />
                  <rect x={env.minX - 5} y={env.maxY - 5} width="10" height="10" fill="url(#pubUnitColumnHatch)" stroke="var(--gold-primary)" strokeWidth="1" />
                  <rect x={env.maxX - 5} y={env.maxY - 5} width="10" height="10" fill="url(#pubUnitColumnHatch)" stroke="var(--gold-primary)" strokeWidth="1" />
                  {/* Unit Header Badge */}
                  {env.label && (
                    <g transform={`translate(${(env.minX + env.maxX) / 2 - 60}, ${env.minY - 22})`}>
                      <rect width="120" height="18" rx="4" fill="var(--cad-stage-bg)" stroke="var(--gold-primary)" strokeWidth="1.2" />
                      <text x="60" y="12" fontSize="9" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif">
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
        {indoorSlots.map((s: { id: string; x: number; y: number; w: number; h: number }) => (
          <rect key={`part-${s.id}`} x={s.x} y={s.y} width={s.w} height={s.h} fill="none" stroke="var(--gold-primary)" strokeOpacity="0.6" strokeWidth="2" pointerEvents="none" />
        ))}

        {/* Interactive Room Cards & Architectural Vectors */}
        {previewSlots.map((s: { id: string; x: number; y: number; w: number; h: number; zone?: ProcessedZone; title: string; sqm: number; dims: string }) => {
          const tid = s.zone?.templateId || '';
          const isReception = tid === 'apt.reception';
          const isMasterBed = tid === 'apt.master_bed';
          const isBed = tid.includes('bed') || tid === 'apt.dressing';
          const isKitchen = tid === 'apt.kitchen';
          const isBath = tid.includes('bath');
          const isBalcony = tid.includes('balcony') || tid.includes('terrace');
          const isSelected = selectedZoneId === s.id;
          const isNarrowVertical = s.w < 70 && s.h > 100;

          const floorFill = isReception
            ? 'url(#pubUnitParquetPattern)'
            : isKitchen || isBath
              ? 'url(#pubUnitTilePattern)'
              : isBalcony
                ? 'url(#pubUnitDeckPattern)'
                : isBed
                  ? 'url(#pubUnitBedPattern)'
                  : 'var(--cad-stage-bg)';

          return (
            <g
              key={s.id}
              className="pub-interactive-room-slot"
              style={{ cursor: 'pointer' }}
              onClick={() => handleRoomClick(s.zone)}
            >
              {/* Floor Surface */}
              <rect
                x={s.x + 2}
                y={s.y + 2}
                width={Math.max(2, s.w - 4)}
                height={Math.max(2, s.h - 4)}
                fill={floorFill}
                stroke={isSelected ? 'var(--gold-primary)' : 'transparent'}
                strokeWidth="1.5"
              />

              {/* Exterior Balcony Cantilever Construction */}
              {isBalcony && (
                <g pointerEvents="none">
                  <rect x={s.x + 2} y={s.y + 2} width={Math.max(2, s.w - 4)} height={Math.max(2, s.h - 4)} fill="rgba(127, 180, 216, 0.08)" />
                  {/* Cantilever Slab Outer Edge */}
                  <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="none" stroke="#7FB4D8" strokeWidth="2.5" strokeDasharray="6 3" />
                  {/* Corner Baluster Posts */}
                  <circle cx={s.x + 3} cy={s.y + 3} r="3.5" fill="#7FB4D8" />
                  <circle cx={s.x + s.w - 3} cy={s.y + 3} r="3.5" fill="#7FB4D8" />
                  <circle cx={s.x + 3} cy={s.y + s.h - 3} r="3.5" fill="#7FB4D8" />
                  <circle cx={s.x + s.w - 3} cy={s.y + s.h - 3} r="3.5" fill="#7FB4D8" />
                  {/* Balcony Badge */}
                  <rect x={s.x + 4} y={s.y + s.h - 18} width={Math.max(10, s.w - 8)} height="14" rx="3" fill="var(--cad-balcony-badge-bg)" stroke="#7FB4D8" strokeWidth="0.8" />
                  <text x={s.x + s.w / 2} y={s.y + s.h - 8} fontSize="6" fill="#7FB4D8" textAnchor="middle" fontWeight="800" fontFamily="monospace">
                    {isAr ? 'شرفة خارجية' : 'BALCONY'}
                  </text>
                </g>
              )}

              {/* ── CAD Spatial Furniture / Fixture Outlines ── */}
              {s.w >= 50 && s.h >= 36 && !isBalcony && (
                <g className="fp-cad-fixtures" opacity="0.75" pointerEvents="none">
                  {/* Living Reception: 3-piece sofa & coffee table */}
                  {isReception && (
                    <g>
                      <rect x={s.x + 10} y={s.y + s.h - 26} width={Math.min(54, s.w - 20)} height="16" rx="3" fill="none" stroke="var(--gold-primary)" strokeWidth="1" />
                      <rect x={s.x + s.w / 2 - 12} y={s.y + s.h / 2 - 6} width="24" height="12" rx="2" fill="none" stroke="var(--gold-primary)" strokeOpacity="0.8" strokeWidth="0.8" />
                      <line x1={s.x + 12} y1={s.y + 8} x2={s.x + Math.min(48, s.w - 24)} y2={s.y + 8} stroke="var(--gold-primary)" strokeOpacity="0.8" strokeWidth="1.5" />
                    </g>
                  )}
                  {/* Master Bed: King bed with headboard & pillows */}
                  {isMasterBed && (
                    <g>
                      <rect x={s.x + s.w / 2 - 16} y={s.y + 10} width="32" height="38" rx="2" fill="none" stroke="var(--gold-primary)" strokeWidth="1" />
                      <line x1={s.x + s.w / 2 - 16} y1={s.y + 10} x2={s.x + s.w / 2 + 16} y2={s.y + 10} stroke="var(--gold-primary)" strokeWidth="2" />
                      <rect x={s.x + s.w / 2 - 13} y={s.y + 13} width="11" height="8" rx="1" fill="none" stroke="var(--gold-primary)" strokeOpacity="0.8" strokeWidth="0.8" />
                      <rect x={s.x + s.w / 2 + 2} y={s.y + 13} width="11" height="8" rx="1" fill="none" stroke="var(--gold-primary)" strokeOpacity="0.8" strokeWidth="0.8" />
                      {/* Nightstands */}
                      <rect x={s.x + s.w / 2 - 24} y={s.y + 10} width="6" height="8" fill="none" stroke="var(--gold-primary)" strokeOpacity="0.7" strokeWidth="0.8" />
                      <rect x={s.x + s.w / 2 + 18} y={s.y + 10} width="6" height="8" fill="none" stroke="var(--gold-primary)" strokeOpacity="0.7" strokeWidth="0.8" />
                    </g>
                  )}
                  {/* Standard Bed */}
                  {!isMasterBed && isBed && (
                    <g>
                      <rect x={s.x + s.w / 2 - 12} y={s.y + 10} width="24" height="34" rx="2" fill="none" stroke="var(--gold-primary)" strokeWidth="1" />
                      <rect x={s.x + s.w / 2 - 9} y={s.y + 13} width="18" height="7" rx="1" fill="none" stroke="var(--gold-primary)" strokeOpacity="0.8" strokeWidth="0.8" />
                    </g>
                  )}
                  {/* Kitchen: Countertop, sink, hob */}
                  {isKitchen && (
                    <g>
                      <line x1={s.x + 8} y1={s.y + 8} x2={s.x + s.w - 8} y2={s.y + 8} stroke="var(--gold-primary)" strokeOpacity="0.8" strokeWidth="1.5" />
                      <line x1={s.x + 8} y1={s.y + 8} x2={s.x + 8} y2={s.y + s.h - 8} stroke="var(--gold-primary)" strokeOpacity="0.8" strokeWidth="1.5" />
                      {/* Double sink */}
                      <rect x={s.x + 12} y={s.y + 12} width="16" height="10" fill="none" stroke="#7FB4D8" strokeWidth="0.8" />
                      <line x1={s.x + 20} y1={s.y + 12} x2={s.x + 20} y2={s.y + 22} stroke="#7FB4D8" strokeWidth="0.8" />
                    </g>
                  )}
                  {/* Bathroom: Shower tray & vanity */}
                  {isBath && (
                    <g>
                      <rect x={s.x + 8} y={s.y + 8} width="22" height="22" fill="none" stroke="#7FB4D8" strokeWidth="1" />
                      <circle cx={s.x + 19} cy={s.y + 19} r="2" fill="#7FB4D8" />
                      {/* Vanity oval */}
                      <ellipse cx={s.x + s.w - 16} cy={s.y + 16} rx="8" ry="6" fill="none" stroke="var(--gold-primary)" strokeOpacity="0.8" strokeWidth="0.8" />
                    </g>
                  )}
                </g>
              )}

              {/* Room Dimension Stamp (Placed top right to prevent fixture overlap) */}
              <text 
                x={isKitchen || isBath ? s.x + s.w - 6 : s.x + 8} 
                y={s.y + 13} 
                fontSize="6.2" 
                fill="var(--cad-dims-color)" 
                fontFamily="monospace" 
                fontWeight="700"
                textAnchor={isKitchen || isBath ? 'end' : 'start'}
              >
                {s.dims}
              </text>

              {/* Room Title & Area Badge (Smart multi-line auto-fit to prevent box overflow) */}
              {(() => {
                const textLayout = computeRoomTextLayout(s.title, s.w, s.h);
                const { lines, fontSize, lineHeight } = textLayout;
                const totalTextH = (lines.length * lineHeight) + lineHeight * 0.85;
                const headerOffset = 14;
                const startY = s.y + headerOffset + Math.max(2, (s.h - headerOffset - totalTextH) / 2) + fontSize * 0.8;

                return (
                  <g style={{ pointerEvents: 'none' }}>
                    {lines.map((line, lIdx) => (
                      <text
                        key={lIdx}
                        x={s.x + s.w / 2}
                        y={startY + lIdx * lineHeight}
                        fontSize={fontSize}
                        fill="var(--cad-text-primary)"
                        textAnchor="middle"
                        fontWeight="800"
                        style={{ userSelect: 'none' }}
                      >
                        {line}
                      </text>
                    ))}
                    <text
                      x={s.x + s.w / 2}
                      y={startY + lines.length * lineHeight + 2}
                      fontSize={Math.max(5.4, fontSize - 0.6)}
                      fill="var(--gold-primary)"
                      textAnchor="middle"
                      fontFamily="monospace"
                      fontWeight="800"
                      style={{ userSelect: 'none' }}
                    >
                      {s.sqm > 0 ? `${s.sqm} m²` : ''}
                    </text>
                  </g>
                );
              })()}

              {/* Selected Corner Accents */}
              {isSelected && (() => {
                const cx = s.x + 4, cy = s.y + 4, ex = s.x + s.w - 4, ey = s.y + s.h - 4, t = 6;
                return (
                  <g stroke="var(--gold-primary)" strokeWidth="1.5">
                    <path d={`M ${cx} ${cy + t} L ${cx} ${cy} L ${cx + t} ${cy}`} fill="none" />
                    <path d={`M ${ex - t} ${cy} L ${ex} ${cy} L ${ex} ${cy + t}`} fill="none" />
                    <path d={`M ${cx} ${ey - t} L ${cx} ${ey} L ${cx + t} ${ey}`} fill="none" />
                    <path d={`M ${ex - t} ${ey} L ${ex} ${ey} L ${ex} ${ey - t}`} fill="none" />
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* Title Block Stamp (Dynamic positioning relative to layoutBounds) */}
        <g transform={`translate(${stampX}, ${stampY})`} opacity="0.95" style={{ direction: 'ltr' }}>
          <rect width={stampWidth} height="24" rx="4" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeWidth="0.8" />
          <text x="10" y="11" fontSize="7.5" fill="var(--cad-text-primary)" fontWeight="800" textAnchor="start" dominantBaseline="middle" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
            {isAr ? 'توزيع المساحات' : 'SPACE LAYOUT'}
          </text>
          <text x="10" y="18.5" fontSize="6.5" fill="var(--gold-primary)" fontFamily="monospace" fontWeight="700" textAnchor="start" dominantBaseline="middle" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
            {viewMeasured
              ? `${totalWidthM}m × ${totalDepthM}m`
              : (isAr ? 'مخطط توضيحي • المقاسات غير مسجلة' : 'Schematic • dimensions not recorded')}
          </text>
        </g>

      </svg>
    );
  };

  // Controls Toolbar Component
  const renderControlsBar = (inFullscreen = false) => (
    <div className={`stage-controls-bar ${inFullscreen ? 'fullscreen-stage-controls' : ''}`}>
      {/* Left Cluster: Zoom Controls */}
      <div className="cad-zoom-controls">
        <button 
          className="cad-zoom-btn" 
          onClick={handleZoomOut} 
          disabled={zoom <= 0.75}
          type="button" 
          title={isAr ? 'تصغير (-)' : 'Zoom out (-)'}
        >
          <Minus size={13} />
        </button>
        <button 
          className="cad-zoom-val-btn" 
          onClick={handleResetZoom} 
          type="button" 
          title={isAr ? 'إعادة العرض (100%)' : 'Reset view (100%)'}
        >
          <span>{Math.round(zoom * 100)}%</span>
        </button>
        <button 
          className="cad-zoom-btn" 
          onClick={handleZoomIn} 
          disabled={zoom >= 2.5}
          type="button" 
          title={isAr ? 'تكبير (+)' : 'Zoom in (+)'}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Right Cluster: Metrology Tags & Fullscreen Toggle */}
      <div className="stage-controls-right-group">
        {propertyType !== 'building' && <button
          type="button"
          className="metrology-tag gold-tag clickable"
          onClick={() => {
            const targetZone = (currentViewZones && currentViewZones.length > 0)
              ? (currentViewZones.find(z => z.id === selectedZoneId) || currentViewZones[0])
              : (processedZones[0] || null);
            if (targetZone) setActiveModalZone(targetZone);
          }}
          title={isAr ? 'عرض المواصفات المعمارية الكاملة' : 'View full architectural specifications'}
        >
          <Info size={12} />
          <span>{isAr ? 'انقر على أي غرفة لعرض المواصفات' : 'Click any space for full specs'}</span>
        </button>}

        {/* Fullscreen Button (Only shown in inline mode) */}
        {!inFullscreen && (
          <button
            type="button"
            className="cad-fullscreen-toggle-btn"
            onClick={() => setIsFullscreen(true)}
            title={isAr ? 'ملء الشاشة' : 'View fullscreen studio'}
          >
            <Maximize2 size={14} />
            <span>{isAr ? 'ملء الشاشة' : 'Fullscreen'}</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderInlineStage = () => (
    <div className="studio-panoramic-stage">
      {renderControlsBar(false)}
      <div className="stage-svg-wrapper" onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        {renderVectorSvgContent()}
      </div>
    </div>
  );

  return (
    <div className="blueprint-studio-root" data-theme={currentTheme} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* 1. Header Bar with Metrology & Navigation */}
      <div className="studio-top-header">
        <div className="studio-title-block">
          <span className="studio-eyebrow">
            <Sparkles size={13} className="sparkle-gold" />
            <span>
              {isAr 
                ? 'المخطط الهندسي والمعماري المعتمد • كراسة المواصفات' 
                : 'VERIFIED ARCHITECTURAL CAD BLUEPRINT • SPECIFICATIONS'}
            </span>
          </span>
          <h3 className="studio-main-heading">
            {isAr ? 'المخطط المعماري التفاعلي وتوزيع المساحات' : 'Interactive Architectural Blueprint'}
          </h3>
        </div>

        {/* View Switcher / Breadcrumbs for Building or Multi-Floor Villas */}
        {propertyType !== 'building' && availableFloors.length > 1 ? (
          <div className="studio-crumbs-row">
            {availableFloors.map((fKey) => {
              const isActive = activeFloorKey === fKey;
              const fZone = processedZones.find(z => z.floorKey === fKey);
              const label = formatFloorLabel(fKey, isAr, fZone);
              return (
                <button
                  key={fKey}
                  type="button"
                  className={`studio-crumb-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveFloorKey(fKey)}
                >
                  <Layers size={13} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {propertyType === 'building' ? (
        <BuildingBlueprintPreview zones={zones} inventory={inventory} view={bldView}
          onViewChange={setBldView} selectedId={selectedZoneId} onSelect={setSelectedZoneId}
          isAr={isAr} onRequestUnit={onRequestUnit}
          elevation={bldView.mode === 'elevation' ? renderInlineStage() : undefined} />
      ) : renderInlineStage()}

      {/* 3. DEDICATED FULLSCREEN STUDIO OVERLAY (PORTALED TO DOCUMENT.BODY) */}
      {mounted && isFullscreen && createPortal(
        <div className="cad-fullscreen-portal-overlay" data-theme={currentTheme} dir={isAr ? 'rtl' : 'ltr'}>
          <div className="cad-fullscreen-topbar">
            <div className="cad-fullscreen-meta-block">
              <span className="cad-fullscreen-badge">
                <Sparkles size={12} className="sparkle-gold" />
                <span>{isAr ? 'استوديو المخططات المعمارية المعتمدة' : 'ARCHITECTURAL CAD STUDIO'}</span>
              </span>
              <h3 className="cad-fullscreen-title">{propertyTitle}</h3>
            </div>

            {propertyType !== 'building' && availableFloors.length > 1 ? (
              <div className="studio-crumbs-row">
                {availableFloors.map((fKey) => {
                  const isActive = activeFloorKey === fKey;
                  const fZone = processedZones.find(z => z.floorKey === fKey);
                  const label = formatFloorLabel(fKey, isAr, fZone);
                  return (
                    <button
                      key={fKey}
                      type="button"
                      className={`studio-crumb-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveFloorKey(fKey)}
                    >
                      <Layers size={13} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              className="cad-fullscreen-close-btn"
              onClick={() => setIsFullscreen(false)}
            >
              <Minimize2 size={16} />
              <span>{isAr ? 'إغلاق ملء الشاشة' : 'Exit Fullscreen'}</span>
            </button>
          </div>

          <div className="cad-fullscreen-stage-container">
            {renderControlsBar(true)}
            <div 
              className="stage-svg-wrapper fullscreen-svg-wrapper" 
              onMouseDown={handleMouseDown} 
              onMouseMove={handleMouseMove} 
              onMouseUp={handleMouseUp}
            >
              {renderVectorSvgContent()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 4. LUXURY FLOATING POPUP MODAL (PORTALED TO DOCUMENT.BODY) */}
      {mounted && createPortal(
        <AnimatePresence>
          {activeModalZone && (
            <div className="pub-modal-portal-wrapper">
              <div 
                className="pub-modal-backdrop" 
                onClick={() => setActiveModalZone(null)}
              />
              <motion.div 
                className="pub-spec-modal-card"
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 30 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Top Header */}
                <div className="pub-modal-header">
                  <div className="pub-modal-meta">
                    <div className="pub-badge-row">
                      <span className="pub-floor-pill">
                        <Building size={12} />
                        <span>{isAr ? activeModalZone.floorLabelAr : activeModalZone.floorLabel}</span>
                      </span>
                      {activeModalZone.unitLabel && (
                        <span className="pub-unit-pill">{activeModalZone.unitLabel}</span>
                      )}
                      {activeModalZone.badge !== 'unknown' && (() => {
                        const tier = TIER_BADGES[activeModalZone.badge];
                        return (
                          <span className="pub-tier-pill" style={{ color: tier.color, background: tier.bg, borderColor: tier.color }}>
                            <Check size={10} strokeWidth={3} />
                            <span>{isAr ? tier.ar : tier.en}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <h3 className="pub-modal-title">
                      {isAr ? activeModalZone.zoneTitleAr : activeModalZone.zoneTitle}
                    </h3>
                  </div>

                  <button 
                    type="button" 
                    className="pub-modal-close-btn"
                    onClick={() => setActiveModalZone(null)}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Photos the admin uploaded for this space (portrait or landscape, never cropped) */}
                {activeModalZone.imagesList.length > 0 && (
                  <div className="pub-modal-gallery">
                    {activeModalZone.imagesList.map((src, idx) => (
                      <div key={`${src}-${idx}`} className="pub-modal-photo">
                        <div className="pub-modal-photo-bg" style={{ backgroundImage: `url(${src})` }} aria-hidden="true" />
                        <img src={src} alt={isAr ? activeModalZone.zoneTitleAr : activeModalZone.zoneTitle} className="pub-modal-photo-img" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Measurements: only the ones recorded for this space */}
                {(() => {
                  const z = activeModalZone;
                  const openings = [
                    z.doorCount ? `${z.doorCount} ${isAr ? (z.doorCount === 1 ? 'باب' : 'أبواب') : (z.doorCount === 1 ? 'Door' : 'Doors')}` : null,
                    z.windowCount ? `${z.windowCount} ${isAr ? (z.windowCount === 1 ? 'نافذة' : 'نوافذ') : (z.windowCount === 1 ? 'Window' : 'Windows')}` : null,
                  ].filter(Boolean).join(' · ');
                  const cells = [
                    z.sqm > 0 ? { lbl: isAr ? 'المساحة' : 'AREA', val: `${z.sqm} m²`, ltr: true } : null,
                    z.dims ? { lbl: isAr ? 'الأبعاد' : 'DIMENSIONS', val: z.dims, ltr: true } : null,
                    z.ceiling ? { lbl: isAr ? 'ارتفاع السقف' : 'CEILING HEIGHT', val: z.ceiling, ltr: false } : null,
                    openings ? { lbl: isAr ? 'الفتحات' : 'OPENINGS', val: openings, ltr: false } : null,
                  ].filter((c): c is { lbl: string; val: string; ltr: boolean } => !!c);
                  if (cells.length === 0) return null;
                  return (
                    <div className="pub-metrics-grid">
                      {cells.map(c => (
                        <div key={c.lbl} className="pub-metric-cell">
                          <span className="pub-metric-lbl">{c.lbl}</span>
                          <span className="pub-metric-val" dir={c.ltr ? 'ltr' : undefined}>{c.val}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Trades recorded for this space */}
                {activeModalZone.trades.length > 0 ? (
                  <div className="pub-trades-section">
                    <h4 className="pub-trades-heading">
                      {isAr ? 'أعمال التشطيب في هذه المساحة' : 'FINISHING WORK IN THIS SPACE'}
                    </h4>

                    <div className="pub-trades-grid">
                      {activeModalZone.trades.map((trade) => {
                        const Icon = trade.icon === 'zap' ? Zap : trade.icon === 'wind' ? Wind : trade.icon === 'droplet' ? Droplet : Layers;
                        const spec = isAr ? trade.specAr : trade.spec;
                        return (
                          <div key={trade.id} className="pub-trade-card">
                            <div className="pub-trade-icon-box">
                              <Icon size={16} />
                            </div>
                            <div className="pub-trade-info">
                              <div className="pub-trade-title-row">
                                <span className="pub-trade-name">{isAr ? trade.nameAr : trade.name}</span>
                                <span className="pub-trade-badge">{isAr ? trade.badgeAr : trade.badge}</span>
                              </div>
                              {spec && <p className="pub-trade-spec">{spec}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="pub-trades-empty">
                    {isAr ? 'لم تُسجل مواصفات لهذه المساحة بعد.' : 'No specifications recorded for this space yet.'}
                  </p>
                )}

                {/* Inquiry goes to the business WhatsApp number from the environment */}
                {process.env.NEXT_PUBLIC_WHATSAPP_NUMBER && (
                  <div className="pub-modal-footer">
                    <a
                      href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(`${isAr ? 'استفسار عن' : 'Inquiry about'} ${isAr ? activeModalZone.zoneTitleAr : activeModalZone.zoneTitle} — ${propertyTitle}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pub-inquire-cta-btn"
                    >
                      <MessageSquare size={16} />
                      <span>{isAr ? 'استفسار عن هذه المساحة' : 'Ask about this space'}</span>
                    </a>
                  </div>
                )}

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <style>{`
        .pub-modal-gallery {
          display: flex;
          gap: 0.6rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          margin-bottom: 1.1rem;
        }
        .pub-modal-photo {
          position: relative;
          flex: 0 0 100%;
          height: 260px;
          border-radius: 14px;
          overflow: hidden;
          background: #0A0C10;
          scroll-snap-align: center;
        }
        .pub-modal-gallery:has(.pub-modal-photo + .pub-modal-photo) .pub-modal-photo { flex-basis: 88%; }
        .pub-modal-photo-bg {
          position: absolute;
          inset: -30px;
          background-size: cover;
          background-position: center;
          filter: blur(24px) brightness(0.5);
        }
        .pub-modal-photo-img {
          position: relative;
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .pub-trades-empty {
          margin: 0.5rem 0 0;
          font-size: 0.82rem;
          color: var(--cad-text-muted, #94a3b8);
        }

        /* ── THEMING VARIABLES ── */
        .blueprint-studio-root,
        .cad-fullscreen-portal-overlay {
          --cad-stage-bg: #090C15;
          --cad-grid-color: rgba(221, 167, 82, 0.08);
          --cad-text-primary: #FFFFFF;
          --cad-text-muted: rgba(255, 255, 255, 0.7);
          --cad-dims-color: rgba(221, 167, 82, 0.85);
          --cad-parquet-stroke: rgba(221, 167, 82, 0.22);
          --cad-parquet-fill: rgba(221, 167, 82, 0.035);
          --cad-tile-stroke: rgba(127, 180, 216, 0.25);
          --cad-tile-fill: rgba(127, 180, 216, 0.04);
          --cad-deck-stroke: rgba(221, 167, 82, 0.35);
          --cad-deck-fill: rgba(221, 167, 82, 0.05);
          --cad-bed-dot: rgba(221, 167, 82, 0.25);
          --cad-bed-fill: rgba(255, 255, 255, 0.02);
          --cad-furniture-fill: rgba(221, 167, 82, 0.14);
          --cad-stamp-bg: rgba(10, 14, 24, 0.92);
          --cad-core-bg: rgba(10, 14, 24, 0.95);
          --cad-balcony-badge-bg: rgba(10, 14, 24, 0.95);
          --cad-toolbar-bg: rgba(10, 14, 24, 0.88);
          --cad-toolbar-text: #FFFFFF;
          --cad-toolbar-border: rgba(221, 167, 82, 0.3);
          --gold-primary: #DDA752;

          margin-bottom: 2rem;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          font-family: var(--font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
        }

        [data-theme="light"] .blueprint-studio-root,
        [data-theme="light"] .cad-fullscreen-portal-overlay,
        .blueprint-studio-root[data-theme="light"],
        .cad-fullscreen-portal-overlay[data-theme="light"],
        .pub-modal-portal-wrapper[data-theme="light"] {
          --cad-stage-bg: #FFFFFF;
          --cad-grid-color: rgba(15, 23, 42, 0.05);
          --cad-text-primary: #0F172A;
          --cad-text-muted: #475569;
          --cad-dims-color: #B8860B;
          --cad-parquet-stroke: rgba(184, 134, 11, 0.3);
          --cad-parquet-fill: #FFFBF2;
          --cad-tile-stroke: rgba(59, 130, 246, 0.3);
          --cad-tile-fill: #F0F7FF;
          --cad-deck-stroke: rgba(184, 134, 11, 0.4);
          --cad-deck-fill: #FEF9E7;
          --cad-bed-dot: rgba(184, 134, 11, 0.35);
          --cad-bed-fill: #FAF9F6;
          --cad-furniture-fill: rgba(184, 134, 11, 0.15);
          --cad-stamp-bg: rgba(255, 255, 255, 0.96);
          --cad-core-bg: #F8FAFC;
          --cad-balcony-badge-bg: #FFFFFF;
          --cad-toolbar-bg: rgba(255, 255, 255, 0.94);
          --cad-toolbar-text: #0F172A;
          --cad-toolbar-border: rgba(184, 134, 11, 0.4);
          --gold-primary: #B8860B;
        }

        [data-theme="dark"] .blueprint-studio-root,
        [data-theme="dark"] .cad-fullscreen-portal-overlay,
        .blueprint-studio-root[data-theme="dark"],
        .cad-fullscreen-portal-overlay[data-theme="dark"],
        .pub-modal-portal-wrapper[data-theme="dark"] {
          --cad-stage-bg: #090C15;
          --cad-grid-color: rgba(221, 167, 82, 0.08);
          --cad-text-primary: #FFFFFF;
          --cad-text-muted: rgba(255, 255, 255, 0.7);
          --cad-dims-color: rgba(221, 167, 82, 0.85);
          --cad-parquet-stroke: rgba(221, 167, 82, 0.22);
          --cad-parquet-fill: rgba(221, 167, 82, 0.035);
          --cad-tile-stroke: rgba(127, 180, 216, 0.25);
          --cad-tile-fill: rgba(127, 180, 216, 0.04);
          --cad-deck-stroke: rgba(221, 167, 82, 0.35);
          --cad-deck-fill: rgba(221, 167, 82, 0.05);
          --cad-bed-dot: rgba(221, 167, 82, 0.25);
          --cad-bed-fill: rgba(255, 255, 255, 0.02);
          --cad-furniture-fill: rgba(221, 167, 82, 0.14);
          --cad-stamp-bg: rgba(10, 14, 24, 0.92);
          --cad-core-bg: rgba(10, 14, 24, 0.95);
          --cad-balcony-badge-bg: rgba(10, 14, 24, 0.95);
          --cad-toolbar-bg: rgba(10, 14, 24, 0.88);
          --cad-toolbar-text: #FFFFFF;
          --cad-toolbar-border: rgba(221, 167, 82, 0.3);
          --gold-primary: #DDA752;
        }

        .studio-top-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--gold-primary, rgba(221, 167, 82, 0.2));
        }

        .studio-title-block {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .studio-eyebrow {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold-primary, #DDA752);
          font-weight: 800;
        }

        .sparkle-gold {
          color: var(--gold-primary, #DDA752);
        }

        .studio-main-heading {
          font-size: 1.45rem;
          font-weight: 800;
          color: var(--text-primary, var(--cad-text-primary));
          font-family: var(--font-heading, inherit);
          letter-spacing: -0.01em;
          margin: 0;
        }

        .studio-crumbs-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--cad-toolbar-bg);
          padding: 0.35rem 0.65rem;
          border-radius: 10px;
          border: 1px solid var(--cad-toolbar-border);
        }

        .studio-crumb-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: transparent;
          border: none;
          color: var(--cad-text-muted);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .studio-crumb-btn:hover,
        .studio-crumb-btn.active {
          color: var(--gold-primary, #DDA752);
        }

        /* Stage Container */
        .studio-panoramic-stage {
          position: relative;
          width: 100%;
          border-radius: 18px;
          overflow: hidden;
          background: var(--cad-stage-bg);
          border: 1px solid var(--cad-toolbar-border);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
        }

        .stage-controls-bar {
          position: absolute;
          top: 1rem;
          left: 1.25rem;
          right: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          z-index: 10;
          pointer-events: none;
        }

        .fullscreen-stage-controls {
          top: 1.25rem;
          left: 1.75rem;
          right: 1.75rem;
        }

        .stage-controls-right-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          pointer-events: auto;
        }

        .cad-zoom-controls,
        .metrology-tag,
        .cad-fullscreen-toggle-btn {
          pointer-events: auto;
          background: var(--cad-toolbar-bg);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid var(--cad-toolbar-border);
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.65rem;
          font-size: 0.75rem;
          color: var(--cad-toolbar-text);
          font-weight: 600;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
        }

        .cad-fullscreen-toggle-btn {
          cursor: pointer;
          color: var(--gold-primary, #DDA752);
          transition: all 0.2s ease;
        }

        .cad-fullscreen-toggle-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(221, 167, 82, 0.25);
        }

        .metrology-tag.gold-tag {
          color: var(--gold-primary, #DDA752);
          border-color: var(--gold-primary, rgba(221, 167, 82, 0.5));
        }

        .cad-zoom-btn {
          background: transparent;
          border: none;
          color: var(--gold-primary, #DDA752);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.15rem;
        }

        .cad-zoom-val-btn {
          background: transparent;
          border: none;
          color: var(--cad-toolbar-text);
          font-size: 0.72rem;
          font-family: monospace;
          cursor: pointer;
        }

        .compass-icon {
          color: var(--gold-primary, #DDA752);
        }

        .stage-svg-wrapper {
          width: 100%;
          min-height: 440px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          cursor: grab;
          background: var(--cad-stage-bg);
        }

        .stage-svg-wrapper:active {
          cursor: grabbing;
        }

        .cad-vector-svg {
          width: 100%;
          height: auto;
          max-height: 520px;
          transition: transform 0.15s ease-out;
          direction: ltr !important;
        }

        .pub-interactive-room-slot:hover rect {
          stroke: var(--gold-primary, #DDA752);
          stroke-width: 2;
          filter: drop-shadow(0 0 6px rgba(221, 167, 82, 0.8));
        }

        /* ── DEDICATED FULLSCREEN PORTAL OVERLAY ── */
        .cad-fullscreen-portal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999999;
          background: var(--cad-stage-bg, #090C15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          margin: 0 !important;
          padding: 0 !important;
          font-family: var(--font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
        }

        .cad-fullscreen-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          padding: 0.9rem 1.75rem;
          background: var(--cad-toolbar-bg);
          border-bottom: 1px solid var(--cad-toolbar-border);
          backdrop-filter: blur(16px);
          flex-shrink: 0;
        }

        .cad-fullscreen-meta-block {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .cad-fullscreen-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--gold-primary, #DDA752);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .cad-fullscreen-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: var(--cad-text-primary);
          margin: 0;
        }

        .cad-fullscreen-close-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #DDA752 0%, #C4913E 100%);
          color: #0A0E18;
          border: none;
          font-weight: 800;
          font-size: 0.85rem;
          padding: 0.55rem 1.15rem;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(221, 167, 82, 0.35);
          transition: all 0.2s ease;
        }

        .cad-fullscreen-close-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(221, 167, 82, 0.5);
        }

        .cad-fullscreen-stage-container {
          position: relative;
          flex: 1;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: var(--cad-stage-bg, #090C15);
        }

        .fullscreen-svg-wrapper {
          width: 100%;
          height: 100%;
          min-height: calc(100vh - 75px);
          max-height: calc(100vh - 75px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3.5rem 1.5rem 1.5rem 1.5rem;
          box-sizing: border-box;
          overflow: hidden;
        }

        .fullscreen-svg-wrapper .cad-vector-svg {
          width: auto;
          max-width: 92vw;
          max-height: calc(100vh - 140px);
          height: auto;
          margin: auto;
          display: block;
        }

        /* ── MODAL POPUP PORTAL STYLING ── */
        .pub-modal-portal-wrapper {
          position: fixed !important;
          inset: 0 !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 99999999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 1.25rem !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background: transparent !important;
        }

        .pub-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: rgba(4, 7, 14, 0.85) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          z-index: 1 !important;
          margin: 0 !important;
        }

        .pub-spec-modal-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 640px;
          max-height: 88vh;
          overflow-y: auto;
          background: var(--bg-surface, #FFFFFF);
          border: 1px solid rgba(221, 167, 82, 0.45);
          border-radius: 20px;
          box-shadow: 0 28px 64px rgba(0, 0, 0, 0.45), 0 0 24px rgba(221, 167, 82, 0.15);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem;
        }

        [data-theme="dark"] .pub-spec-modal-card {
          background: #0D1220;
          border-color: rgba(221, 167, 82, 0.4);
          box-shadow: 0 28px 64px rgba(0, 0, 0, 0.75), 0 0 24px rgba(221, 167, 82, 0.18);
        }

        [data-theme="light"] .pub-spec-modal-card {
          background: #FAF8F5;
          border-color: rgba(184, 133, 48, 0.35);
          box-shadow: 0 28px 64px rgba(15, 23, 42, 0.15), 0 0 24px rgba(184, 133, 48, 0.12);
        }

        .pub-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .pub-modal-meta {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .pub-badge-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .pub-floor-pill,
        .pub-unit-pill,
        .pub-tier-pill {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          background: rgba(15, 23, 42, 0.05);
          border: 1px solid rgba(15, 23, 42, 0.12);
          color: #0F172A;
        }

        [data-theme="dark"] .pub-floor-pill,
        [data-theme="dark"] .pub-unit-pill {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
        }

        .pub-floor-pill {
          color: var(--gold-primary, #B8860B);
          border-color: var(--gold-primary, rgba(184, 134, 11, 0.35));
        }

        .pub-modal-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }

        [data-theme="dark"] .pub-modal-title {
          color: #FFFFFF;
        }

        .pub-modal-close-btn {
          background: rgba(15, 23, 42, 0.06);
          border: 1px solid rgba(15, 23, 42, 0.12);
          color: #0F172A;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        [data-theme="dark"] .pub-modal-close-btn {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
        }

        .pub-modal-close-btn:hover {
          background: rgba(221, 167, 82, 0.2);
          color: var(--gold-primary, #DDA752);
          border-color: var(--gold-primary, #DDA752);
        }

        .pub-modal-hero {
          position: relative;
          width: 100%;
          height: 180px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(221, 167, 82, 0.2);
        }

        .pub-modal-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pub-modal-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(10, 14, 24, 0.7) 100%);
        }

        .pub-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        @media (max-width: 600px) {
          .pub-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* ── Mobile: clean CAD controls & floor tabs ── */
        @media (max-width: 768px) {
          /* Floor tabs: one scrollable row, no per-tab icons */
          .studio-top-header {
            align-items: stretch;
          }
          .studio-crumbs-row {
            width: 100%;
            overflow-x: auto;
            flex-wrap: nowrap;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .studio-crumbs-row::-webkit-scrollbar {
            display: none;
          }
          .studio-crumb-btn {
            flex-shrink: 0;
            white-space: nowrap;
            font-size: 0.78rem;
            padding: 0.3rem 0.35rem;
          }
          .studio-crumb-btn svg {
            display: none;
          }

          /* Controls: static row above the canvas instead of overlaying it */
          .stage-controls-bar {
            position: static;
            flex-wrap: wrap;
            row-gap: 0.5rem;
            padding: 0.75rem 0.75rem 0;
          }
          .stage-controls-right-group {
            display: contents;
          }
          .metrology-tag {
            display: none;
          }
          .metrology-tag.gold-tag {
            display: flex;
            order: 3;
            flex: 1 1 100%;
            justify-content: center;
            font-size: 0.7rem;
            padding: 0.4rem 0.6rem;
          }
          .cad-zoom-controls {
            order: 1;
          }
          .cad-fullscreen-toggle-btn {
            order: 2;
          }

          .stage-svg-wrapper {
            min-height: 300px;
            padding: 0.75rem;
          }

          /* Fullscreen studio: breathing room in the topbar, larger CAD canvas */
          .cad-fullscreen-topbar {
            flex-wrap: wrap;
            gap: 0.6rem;
            padding: 0.75rem 0.9rem;
          }
          .cad-fullscreen-badge {
            display: none;
          }
          .cad-fullscreen-title {
            font-size: 0.95rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 55vw;
          }
          .cad-fullscreen-meta-block {
            flex: 1;
            min-width: 0;
          }
          .cad-fullscreen-close-btn {
            padding: 0.45rem 0.75rem;
            font-size: 0.78rem;
            flex-shrink: 0;
          }
          .cad-fullscreen-close-btn span {
            display: none;
          }
          .cad-fullscreen-topbar .studio-crumbs-row {
            order: 3;
            flex-basis: 100%;
          }
          .fullscreen-svg-wrapper {
            padding: 0.75rem 0.35rem;
            min-height: 0;
            max-height: none;
          }
          .fullscreen-svg-wrapper .cad-vector-svg {
            max-width: 99vw;
            max-height: calc(100dvh - 200px);
          }
        }

        .pub-metric-cell {
          background: rgba(221, 167, 82, 0.04);
          border: 1px solid rgba(221, 167, 82, 0.22);
          border-radius: 10px;
          padding: 0.65rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          transition: all 0.2s ease;
        }

        [data-theme="dark"] .pub-metric-cell {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(221, 167, 82, 0.20);
        }

        .pub-metric-lbl {
          font-size: 0.65rem;
          color: #64748B;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        [data-theme="dark"] .pub-metric-lbl {
          color: rgba(255, 255, 255, 0.55);
        }

        .pub-metric-val {
          font-size: 0.95rem;
          font-weight: 700;
          color: #9E6B0D;
          font-family: var(--font-heading, var(--font-sans, system-ui, -apple-system, sans-serif));
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }

        [data-theme="dark"] .pub-metric-val {
          color: #DDA752;
        }

        .pub-trades-section {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .pub-trades-heading {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748B;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0;
        }

        [data-theme="dark"] .pub-trades-heading {
          color: rgba(255, 255, 255, 0.6);
        }

        .pub-trades-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.65rem;
        }

        .pub-trade-card {
          background: rgba(15, 23, 42, 0.02);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 10px;
          padding: 0.75rem 0.9rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        [data-theme="dark"] .pub-trade-card {
          background: rgba(255, 255, 255, 0.025);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .pub-trade-icon-box {
          background: rgba(221, 167, 82, 0.12);
          border: 1px solid var(--gold-primary, rgba(221, 167, 82, 0.35));
          color: var(--gold-primary, #B8860B);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .pub-trade-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          flex: 1;
        }

        .pub-trade-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .pub-trade-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: #0F172A;
        }

        [data-theme="dark"] .pub-trade-name {
          color: #FFFFFF;
        }

        .pub-trade-badge {
          font-size: 0.68rem;
          color: #10B981;
          font-weight: 700;
        }

        .pub-trade-spec {
          font-size: 0.78rem;
          color: #475569;
          line-height: 1.4;
          margin: 0;
        }

        [data-theme="dark"] .pub-trade-spec {
          color: rgba(255, 255, 255, 0.65);
        }

        .pub-modal-footer {
          padding-top: 0.5rem;
        }

        .pub-inquire-cta-btn {
          width: 100%;
          background: linear-gradient(135deg, #DDA752 0%, #C4913E 100%);
          color: #0A0E18;
          font-weight: 800;
          font-size: 0.88rem;
          border-radius: 10px;
          padding: 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          text-decoration: none;
          box-shadow: 0 6px 18px rgba(221, 167, 82, 0.35);
          transition: all 0.2s ease;
        }

        .pub-inquire-cta-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(221, 167, 82, 0.45);
        }
      `}</style>
    </div>
  );
};

export default ArchitecturalBlueprintInspector;
