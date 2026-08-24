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
  Compass,
  Info
} from 'lucide-react';
import { ZoneInstance, ZoneSpatialLayout, getZoneBadge, FinishBadge } from '@/lib/layering';
import { computeMetricLayout, metricInputFromSpatial, MetricRoomRect } from '@/lib/layering/floorplanLayout';
import { FALLBACK_ZONE_METRICS, FALLBACK_ZONE_TITLES, GENERIC_ZONE_METRIC } from '@/lib/layering/zoneMetrics';

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
}

const CURATED_ROOM_IMAGES: Record<string, string> = {
  grounds: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=85',
  garden: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=85',
  pool: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85',
  foyer: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85',
  entrance: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85',
  reception: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
  living: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
  salon: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
  dining: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=85',
  kitchen: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=85',
  master: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=85',
  bedroom: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=85',
  suite: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=85',
  bath: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85',
  spa: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85',
  powder: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85',
  terrace: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85',
  balcony: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85',
  roof: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85',
  garage: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=85',
  family: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
  game: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85'
};

function resolveSpaceImage(key: string, customImage?: string): string {
  if (customImage && typeof customImage === 'string' && customImage.startsWith('http')) {
    return customImage;
  }
  const cleanKey = key.toLowerCase();
  for (const [pattern, url] of Object.entries(CURATED_ROOM_IMAGES)) {
    if (cleanKey.includes(pattern)) return url;
  }
  return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85';
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

const DEFAULT_TRADE_SPECS: Record<string, TradeSpecItem[]> = {
  reception: [
    {
      id: 'rec_marble',
      name: 'Imported Marble & Parquet Finish',
      nameAr: 'أرضيات رخام مستورد وباركيه HDF ألماني',
      spec: 'Premium Calacatta gold marble borders with acoustic sound-dampening subfloor',
      specAr: 'رخام كالاكاتا فاخر مع عزل صوتي متطور أسفل الأرضيات',
      icon: 'layers',
      badge: 'Ultra-Luxury',
      badgeAr: 'تشطيب فاخر'
    },
    {
      id: 'rec_hvac',
      name: 'Concealed Slot Diffuser AC',
      nameAr: 'تكييف كونسيلد مخفي بمخارج خطية',
      spec: 'Inverter VRF system with whisper-quiet operation (NC 25)',
      specAr: 'نظام VRF إنفرتر هادئ للغاية مع مخارج هواء ديكورية',
      icon: 'wind',
      badge: 'Smart VRF',
      badgeAr: 'إنفرتر ذكي'
    },
    {
      id: 'rec_elec',
      name: 'Architectural Lighting & Smart Circuits',
      nameAr: 'إنارة معمارية ومسارات مغناطيسية ذكية',
      spec: 'Magnetic track spotlights (CRI 95+) with automated lighting scenes',
      specAr: 'كشافات مغناطيسية عالية الدقة مع لوحات تحكم ذكية',
      icon: 'zap',
      badge: 'Smart Ready',
      badgeAr: 'تحكم ذكي'
    }
  ],
  master_bed: [
    {
      id: 'bed_floor',
      name: 'Natural Hardwood Oak Parquet',
      nameAr: 'أرضيات باركيه خشب طبيعي أرو',
      spec: 'Multi-layer engineered oak with thermal insulation underlayment',
      specAr: 'خشب أرو طبيعي متعدد الطبقات مع عزل حراري وصوتي',
      icon: 'layers',
      badge: 'Engineered Wood',
      badgeAr: 'خشب طبيعي'
    },
    {
      id: 'bed_windows',
      name: 'Acoustic Double-Glazed Facade',
      nameAr: 'قطاعات ألومنيوم عازلة للصوت والحرارة',
      spec: 'Thermal-break Schuco double glazing ensuring 38dB acoustic reduction',
      specAr: 'زجاج مزدوج عازل للضوضاء والحرارة مع قطاع ألومنيوم ثيرمال بريك',
      icon: 'layers',
      badge: 'Acoustic 38dB',
      badgeAr: 'عازل للصوت'
    }
  ],
  kitchen: [
    {
      id: 'kitch_tiles',
      name: 'Porcelain Nano-Sealed Floor & Wall Tiles',
      nameAr: 'سيراميك وبورسلين معالج نانو مقاوم للبقع',
      spec: '60×120cm rectified anti-slip porcelain with epoxy grouting',
      specAr: 'بورسلين مقاس ٦٠×١٢٠سم مع فواصل إيبوكسية مضادة للبكتيريا',
      icon: 'layers',
      badge: 'Nano-Shield',
      badgeAr: 'معالج نانو'
    },
    {
      id: 'kitch_plumb',
      name: 'Concealed Drainage & Water Filter Ready',
      nameAr: 'تغذية وصرف مخفي مجهز لوحدات الفلترة',
      spec: 'Multi-layer PPR German plumbing lines with soundproof drainage pipes',
      specAr: 'شبكة تغذية PPR ألمانية وصرف سمارت معزول للصوت',
      icon: 'droplet',
      badge: 'DIN Certified',
      badgeAr: 'معتمد ألمانياً'
    }
  ],
  bath: [
    {
      id: 'bath_sanitary',
      name: 'Concealed Cistern & Wall-Hung Fixtures',
      nameAr: 'أطقم صحية معلقة وخزانات دفن',
      spec: 'Grohe/Duravit soft-close wall-hung toilet with pneumatic flush plate',
      specAr: 'قاعدة معلقة درافيت مع صندوق طرد دفن جروهي',
      icon: 'droplet',
      badge: 'European Fixtures',
      badgeAr: 'أطقم أوروبية'
    },
    {
      id: 'bath_waterproofing',
      name: 'Dual-Layer Polymer Waterproofing',
      nameAr: 'عزل مائي كيميائي مزدوج للحمامات',
      spec: 'Certified 72-hr water-tested elastomeric waterproofing membrane',
      specAr: 'عزل مائي بوليمري مرن مختبر ضد التسريب لمدة ٧٢ ساعة',
      icon: 'droplet',
      badge: '100% Tested',
      badgeAr: 'مختبر ٧٢ ساعة'
    }
  ],
  balcony: [
    {
      id: 'balc_deck',
      name: 'Weatherproof Wood Composite Decking',
      nameAr: 'أرضيات خشب بلاستيكي WPC مقاوم للعوامل الجوية',
      spec: 'UV-stabilized anti-slip outdoor decking with concealed drainage channel',
      specAr: 'خشب WPC معالج ضد الشمس والأمطار مع مسار صرف مخفي',
      icon: 'layers',
      badge: 'Weatherproof',
      badgeAr: 'مقاوم للشمس'
    },
    {
      id: 'balc_rail',
      name: 'Architectural Safety Balustrade Railing',
      nameAr: 'درابزين أمان مع حديد مشغول وزجاج سيكوريت',
      spec: '1.1m height tempered laminated safety glass with stainless steel posts',
      specAr: 'درابزين أمان بارتفاع ١.١م مع زجاج سيكوريت وقوائم صلب',
      icon: 'layers',
      badge: 'Safety Rated',
      badgeAr: 'معايير الأمان'
    }
  ]
};

function resolveRoomTradeSpecs(tid: string): TradeSpecItem[] {
  const clean = tid.toLowerCase();
  for (const [k, specs] of Object.entries(DEFAULT_TRADE_SPECS)) {
    if (clean.includes(k)) return specs;
  }
  return DEFAULT_TRADE_SPECS.reception;
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
  doorCount: number;
  windowCount: number;
  spatial?: ZoneSpatialLayout;
}

export const ArchitecturalBlueprintInspector: React.FC<ArchitecturalBlueprintInspectorProps> = ({
  zones = [],
  propertyTitle,
  locale = 'en',
  propertyType = 'apartment',
  propertyImages = []
}) => {
  const isAr = locale === 'ar';
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bldView, setBldView] = useState<{ mode: 'elevation' | 'floor' | 'unit'; floorKey: string; unitId?: string }>({
    mode: propertyType === 'building' ? 'elevation' : 'unit',
    floorKey: 'Floor 1',
  });
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [activeModalZone, setActiveModalZone] = useState<ProcessedZone | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

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

  // 1. Process All Zones with Dimensions, Titles, and Trades
  const processedZones = useMemo<ProcessedZone[]>(() => {
    const list: ProcessedZone[] = [];

    const processSingle = (z: ZoneInstance, parentFloorKey?: string, unitLabel?: string) => {
      const tid = z.zone_template_id;
      const metric = FALLBACK_ZONE_METRICS[tid] || GENERIC_ZONE_METRIC;
      const titleFallback = FALLBACK_ZONE_TITLES[tid] || { en: z.instance_label || 'Space', ar: z.instance_label || 'مساحة' };
      const titleEn = z.instance_label || titleFallback.en;
      const titleAr = KNOWN_TEMPLATE_AR_LABELS[tid] || (isArabicText(z.instance_label) ? z.instance_label : titleFallback.ar) || titleEn;

      const sp = z.spatial;
      const length_m = sp?.length_m ?? metric.length_m;
      const width_m = sp?.width_m ?? metric.width_m;
      const sqm = sp?.sqm ?? metric.sqm;
      const ceiling = metric.ceiling || '3.0m';
      const dims = `${length_m.toFixed(1)}m × ${width_m.toFixed(1)}m`;

      const floorKey = parentFloorKey || z.level_label || 'Floor 1';
      const floorLabel = floorKey === 'bld_ground' ? 'Ground Floor' : floorKey === 'bld_roof' ? 'Roof' : floorKey === 'bld_basement' ? 'Basement' : floorKey;
      const floorLabelAr = floorKey === 'bld_ground' ? 'الدور الأرضي' : floorKey === 'bld_roof' ? 'السطح' : floorKey === 'bld_basement' ? 'البدروم' : floorKey;

      const doorCount = sp?.openings?.filter(o => o.kind === 'door').length ?? 1;
      const windowCount = sp?.openings?.filter(o => o.kind === 'window').length ?? 1;

      const baseImg = resolveSpaceImage(tid);
      const imagesList = propertyImages.length > 0 ? propertyImages : [baseImg];
      const trades = resolveRoomTradeSpecs(tid);

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
        image: baseImg,
        imagesList,
        trades,
        doorCount,
        windowCount,
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

    // If no zones provided, generate rich default apartment zones
    if (list.length === 0) {
      const defaultTids = ['apt.reception', 'apt.master_bed', 'apt.std_bed', 'apt.kitchen', 'apt.main_bath', 'apt.balcony'];
      for (const tid of defaultTids) {
        const m = FALLBACK_ZONE_METRICS[tid] || GENERIC_ZONE_METRIC;
        const t = FALLBACK_ZONE_TITLES[tid] || { en: 'Room', ar: 'غرفة' };
        list.push({
          id: `def-${tid}`,
          templateId: tid,
          zoneTitle: t.en,
          zoneTitleAr: t.ar,
          floorKey: 'Floor 1',
          floorLabel: 'Floor 1',
          floorLabelAr: 'الدور الأول',
          sqm: m.sqm,
          ceiling: m.ceiling,
          dims: `${m.length_m}m × ${m.width_m}m`,
          length_m: m.length_m,
          width_m: m.width_m,
          badge: 'fully_finished',
          image: resolveSpaceImage(tid),
          imagesList: propertyImages.length > 0 ? propertyImages : [resolveSpaceImage(tid)],
          trades: resolveRoomTradeSpecs(tid),
          doorCount: 1,
          windowCount: 1,
        });
      }
    }

    return list;
  }, [zones, propertyImages]);

  // 1.5 Extract Available Distinct Floors / Levels
  const availableFloors = useMemo(() => {
    const keys = Array.from(new Set(processedZones.map(z => z.floorKey))).filter(Boolean);
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
    if (propertyType === 'building') {
      if (bldView.mode === 'unit') {
        return processedZones.filter(z => z.unitLabel && z.floorKey === bldView.floorKey);
      }
      return processedZones.filter(z => z.floorKey === bldView.floorKey);
    }
    // If property has multiple floors (e.g. Ground Floor, First Floor, Roof), filter by active floor tab!
    if (availableFloors.length > 1) {
      return processedZones.filter(z => z.floorKey === activeFloorKey);
    }
    return processedZones;
  }, [propertyType, bldView, processedZones, availableFloors, activeFloorKey]);

  // 3. Metric Layout
  const metricLayout = useMemo(() => {
    const inputs = currentViewZones.map(z => metricInputFromSpatial(z.id, z.spatial, z.sqm));
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
  const compassY = useMemo(() => layoutBounds.minY - 26, [layoutBounds.minY]);

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

  // When room is clicked -> open popup modal with specs
  const handleRoomClick = (zone: ProcessedZone | undefined) => {
    if (!zone) return;
    setActiveModalZone(zone);
  };

  const isGround = bldView.floorKey === 'bld_ground' || bldView.floorKey === 'Ground Floor';
  const isRoof = bldView.floorKey === 'bld_roof' || bldView.floorKey === 'Roof';
  const isBasement = bldView.floorKey === 'bld_basement' || bldView.floorKey === 'Basement';

  // Vector SVG Content Renderer
  const renderVectorSvgContent = () => {
    /* ─── 1. BUILDING FACADE & ELEVATION VIEW ─── */
    if (propertyType === 'building' && bldView.mode === 'elevation') {
      const bldX = 140;
      const bldW = 460;
      const bldRight = bldX + bldW;
      const groundBaseY = 380;
      const basementH = 50;
      const groundY = 320;
      const typFloorH = 60;
      const actualTypicalTotalH = 3 * typFloorH;
      const roofY = groundY - actualTypicalTotalH;

      const buildingFloors = [
        { key: 'Floor 3', labelEn: 'Floor 3', labelAr: 'الدور الثالث', sqm: 412, unitsCount: 2 },
        { key: 'Floor 2', labelEn: 'Floor 2', labelAr: 'الدور الثاني', sqm: 412, unitsCount: 2 },
        { key: 'Floor 1', labelEn: 'Floor 1', labelAr: 'الدور الأول', sqm: 412, unitsCount: 2 },
      ];

      return (
        <svg
          viewBox="0 0 760 480"
          className="cad-vector-svg fp-building-elevation"
          style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center center', direction: 'ltr' }}
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

          {/* Background Grid */}
          <rect width="760" height="480" fill="var(--cad-stage-bg)" />
          <rect width="760" height="480" fill="url(#pubElevGrid)" />
          <rect width="760" height="480" fill="url(#pubElevMajorGrid)" opacity="0.4" />

          {/* Left Datum / Elevation Level Lines */}
          {buildingFloors.map((f, idx) => {
            const floorY = roofY + idx * typFloorH;
            const datumM = ((buildingFloors.length - idx) * 3.3).toFixed(2);
            return (
              <g key={`datum-${f.key}`} className="fp-datum-group">
                <line x1="20" y1={floorY} x2={bldX - 8} y2={floorY} stroke="var(--cad-dims-color)" strokeOpacity="0.4" strokeDasharray="3 3" />
                <circle cx="34" cy={floorY} r="4" fill="none" stroke="var(--gold-primary)" strokeWidth="1" />
                <line x1="30" y1={floorY} x2="38" y2={floorY} stroke="var(--gold-primary)" strokeWidth="1" />
                <line x1="34" y1={floorY - 4} x2="34" y2={floorY + 4} stroke="var(--gold-primary)" strokeWidth="1" />
                <text x="44" y={floorY + 3} fontSize="8.5" fill="var(--gold-primary)" fontFamily="monospace">
                  +{datumM}m
                </text>
              </g>
            );
          })}
          {/* Ground Datum Line */}
          <g className="fp-datum-group">
            <line x1="20" y1={groundBaseY} x2={bldX - 8} y2={groundBaseY} stroke="var(--gold-primary)" strokeWidth="1.2" />
            <text x="44" y={groundBaseY + 3} fontSize="9" fill="var(--gold-primary)" fontWeight="800" fontFamily="monospace">
              ±0.00m
            </text>
          </g>
          {/* Basement Datum Line */}
          <g className="fp-datum-group">
            <line x1="20" y1={groundBaseY + basementH} x2={bldX - 8} y2={groundBaseY + basementH} stroke="var(--cad-dims-color)" strokeOpacity="0.4" strokeDasharray="3 3" />
            <text x="44" y={groundBaseY + basementH + 3} fontSize="8.5" fill="var(--gold-primary)" fontFamily="monospace">
              -3.00m
            </text>
          </g>

          {/* ─── ROOFTOP ARCHITECTURAL CROWN ─── */}
          <g
            role="button"
            tabIndex={0}
            className="pub-elev-floor-row"
            style={{ cursor: 'pointer' }}
            onClick={() => setBldView({ mode: 'floor', floorKey: 'bld_roof' })}
          >
            {/* Left Rooftop Modern Pergola */}
            <g transform={`translate(${bldX + 24}, ${roofY - 24})`}>
              <rect width="140" height="24" fill="rgba(221, 167, 82, 0.08)" stroke="var(--gold-primary)" strokeWidth="1.2" />
              {[20, 40, 60, 80, 100, 120].map(px => (
                <line key={`perg-${px}`} x1={px} y1="0" x2={px} y2="24" stroke="var(--cad-dims-color)" strokeOpacity="0.4" strokeWidth="1" />
              ))}
              <line x1="0" y1="0" x2="140" y2="0" stroke="var(--gold-primary)" strokeWidth="2" />
            </g>

            {/* Center Elevator Penthouse Machine Room */}
            <g transform={`translate(${bldX + bldW / 2 - 40}, ${roofY - 32})`}>
              <rect width="80" height="32" rx="2" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="1.5" />
              <line x1="20" y1="10" x2="60" y2="10" stroke="var(--cad-dims-color)" strokeOpacity="0.5" strokeWidth="1" />
              <line x1="20" y1="16" x2="60" y2="16" stroke="var(--cad-dims-color)" strokeOpacity="0.5" strokeWidth="1" />
              <line x1="20" y1="22" x2="60" y2="22" stroke="var(--cad-dims-color)" strokeOpacity="0.5" strokeWidth="1" />
              <text x="40" y="7" fontSize="7" fill="var(--gold-primary)" textAnchor="middle" fontWeight="700" fontFamily="monospace">ELEVATOR PENTHOUSE</text>
            </g>

            {/* Right Rooftop Water Storage Tanks */}
            <g transform={`translate(${bldRight - 110}, ${roofY - 22})`}>
              <rect x="0" y="4" width="34" height="18" rx="3" fill="rgba(127, 180, 216, 0.15)" stroke="#7FB4D8" strokeWidth="1.2" />
              <rect x="42" y="4" width="34" height="18" rx="3" fill="rgba(127, 180, 216, 0.15)" stroke="#7FB4D8" strokeWidth="1.2" />
              <line x1="34" y1="13" x2="42" y2="13" stroke="#7FB4D8" strokeWidth="1.5" />
              <text x="38" y="-1" fontSize="6.5" fill="#7FB4D8" textAnchor="middle" fontFamily="monospace">WATER TANKS</text>
            </g>

            {/* Roof Parapet & Glass Balustrade */}
            <rect x={bldX} y={roofY - 4} width={bldW} height="4" fill="var(--gold-primary)" />
            <line x1={bldX} y1={roofY - 14} x2={bldRight} y2={roofY - 14} stroke="rgba(127, 180, 216, 0.6)" strokeWidth="1" strokeDasharray="6 3" />

            {/* Roof Info Card on the Right */}
            <g transform={`translate(${bldRight + 16}, ${roofY - 20})`}>
              <rect width="138" height="32" rx="6" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeOpacity="0.4" strokeWidth="1" />
              <text x="8" y="14" fontSize="9.5" fill="var(--cad-text-primary)" fontWeight="700">
                {isAr ? 'السطح والتراس' : 'Roof Terrace'}
              </text>
              <text x="8" y="25" fontSize="8" fill="var(--gold-primary)" fontFamily="monospace" fontWeight="700">
                280 m²
              </text>
              <text x="130" y="25" fontSize="7.5" fill="var(--cad-text-muted)" textAnchor="end">
                {isAr ? 'عرض ‹' : 'Inspect ›'}
              </text>
            </g>
          </g>

          {/* ─── TYPICAL RESIDENTIAL FLOORS (FACADE & BALCONIES) ─── */}
          {buildingFloors.map((floor, idx) => {
            const floorY = roofY + idx * typFloorH;

            return (
              <g
                key={floor.key}
                role="button"
                tabIndex={0}
                className="pub-elev-floor-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setBldView({ mode: 'floor', floorKey: floor.key })}
              >
                {/* Floor Backdrop */}
                <rect
                  x={bldX}
                  y={floorY}
                  width={bldW}
                  height={typFloorH}
                  fill={idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'rgba(221, 167, 82, 0.02)'}
                  stroke="none"
                />

                {/* Concrete Floor Slab Band */}
                <rect x={bldX - 4} y={floorY + typFloorH - 3} width={bldW + 8} height="4" fill="var(--gold-primary)" opacity="0.9" />

                {/* Left Residential Bay (Flat A Balcony & Windows) */}
                <g transform={`translate(${bldX + 16}, ${floorY + 4})`}>
                  <rect x="10" y="4" width="70" height={typFloorH - 12} fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                  <line x1="45" y1="4" x2="45" y2={typFloorH - 8} stroke="#7FB4D8" strokeWidth="1.2" />
                  <rect x="4" y={typFloorH - 10} width="82" height="4" fill="var(--gold-primary)" />
                  <rect x="4" y={typFloorH - 22} width="82" height="12" fill="url(#pubElevBalconyGrad)" stroke="#7FB4D8" strokeWidth="1" />
                  <line x1="24" y1={typFloorH - 22} x2="24" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />
                  <line x1="44" y1={typFloorH - 22} x2="44" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />
                  <line x1="64" y1={typFloorH - 22} x2="64" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />

                  <rect x="100" y="8" width="56" height={typFloorH - 20} rx="1" fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                  <line x1="128" y1="8" x2="128" y2={typFloorH - 12} stroke="#7FB4D8" strokeWidth="1" />
                </g>

                {/* Center Architectural Spine (Core Glazing) */}
                <g transform={`translate(${bldX + bldW / 2 - 28}, ${floorY + 4})`}>
                  <rect width="56" height={typFloorH - 8} fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeOpacity="0.4" strokeWidth="1.2" />
                  <line x1="14" y1="0" x2="14" y2={typFloorH - 8} stroke="var(--gold-primary)" strokeOpacity="0.3" strokeWidth="1" />
                  <line x1="28" y1="0" x2="28" y2={typFloorH - 8} stroke="var(--gold-primary)" strokeOpacity="0.3" strokeWidth="1" />
                  <line x1="42" y1="0" x2="42" y2={typFloorH - 8} stroke="var(--gold-primary)" strokeOpacity="0.3" strokeWidth="1" />
                </g>

                {/* Right Residential Bay (Flat B Windows & Balcony) */}
                <g transform={`translate(${bldRight - 186}, ${floorY + 4})`}>
                  <rect x="14" y="8" width="56" height={typFloorH - 20} rx="1" fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                  <line x1="42" y1="8" x2="42" y2={typFloorH - 12} stroke="#7FB4D8" strokeWidth="1" />

                  <rect x="90" y="4" width="70" height={typFloorH - 12} fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
                  <line x1="125" y1="4" x2="125" y2={typFloorH - 8} stroke="#7FB4D8" strokeWidth="1.2" />
                  <rect x="84" y={typFloorH - 10} width="82" height="4" fill="var(--gold-primary)" />
                  <rect x="84" y={typFloorH - 22} width="82" height="12" fill="url(#pubElevBalconyGrad)" stroke="#7FB4D8" strokeWidth="1" />
                  <line x1="104" y1={typFloorH - 22} x2="104" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />
                  <line x1="124" y1={typFloorH - 22} x2="124" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />
                  <line x1="144" y1={typFloorH - 22} x2="144" y2={typFloorH - 10} stroke="#7FB4D8" strokeWidth="1" />
                </g>

                {/* Right Info Card */}
                <g transform={`translate(${bldRight + 16}, ${floorY + 12})`}>
                  <rect width="138" height="36" rx="6" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeOpacity="0.3" strokeWidth="1" />
                  <text x="8" y="15" fontSize="10" fill="var(--cad-text-primary)" fontWeight="700">
                    {isAr ? floor.labelAr : floor.labelEn}
                  </text>
                  <text x="8" y="27" fontSize="8" fill="var(--gold-primary)" fontFamily="monospace">
                    {`${floor.sqm} m² • 2 ${isAr ? 'شقق' : 'units'}`}
                  </text>
                  <text x="130" y="22" fontSize="8" fill="var(--gold-primary)" textAnchor="end">
                    {isAr ? 'عرض ‹' : 'Inspect ›'}
                  </text>
                </g>
              </g>
            );
          })}

          {/* ─── GROUND FLOOR LOBBY ─── */}
          <g
            role="button"
            tabIndex={0}
            className="pub-elev-floor-row"
            style={{ cursor: 'pointer' }}
            onClick={() => setBldView({ mode: 'floor', floorKey: 'bld_ground' })}
          >
            <rect x={bldX} y={groundY} width={bldW} height="60" fill="url(#pubElevLobbyGrad)" stroke="none" />
            <rect x={bldX - 6} y={groundBaseY - 4} width={bldW + 12} height="5" fill="var(--gold-primary)" />
            {/* Grand Portico Entrance Canopy */}
            <g transform={`translate(${bldX + bldW / 2 - 40}, ${groundY + 12})`}>
              <rect x="0" y="0" width="80" height="48" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="1.5" />
              <rect x="18" y="10" width="44" height="38" fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
              <line x1="40" y1="10" x2="40" y2="48" stroke="var(--gold-primary)" strokeWidth="1.2" />
              <text x="40" y="6" fontSize="6.5" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800" letterSpacing="0.1em">GRAND LOBBY</text>
            </g>
            {/* Retail Storefront Glazing */}
            <g transform={`translate(${bldX + 20}, ${groundY + 16})`}>
              <rect width="130" height="44" fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
              <line x1="65" y1="0" x2="65" y2="44" stroke="#7FB4D8" strokeWidth="1" />
              <text x="65" y="26" fontSize="7.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">COMMERCIAL SUITE</text>
            </g>
            {/* Security Guard / Gate */}
            <g transform={`translate(${bldRight - 150}, ${groundY + 16})`}>
              <rect width="130" height="44" fill="url(#pubElevGlassGrad)" stroke="#7FB4D8" strokeWidth="1" />
              <line x1="65" y1="0" x2="65" y2="44" stroke="#7FB4D8" strokeWidth="1" />
              <text x="65" y="26" fontSize="7.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">RECEPTION & GATE</text>
            </g>

            {/* Ground Info Card */}
            <g transform={`translate(${bldRight + 16}, ${groundY + 14})`}>
              <rect width="138" height="36" rx="6" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeWidth="1.2" />
              <text x="8" y="15" fontSize="10" fill="var(--cad-text-primary)" fontWeight="800">
                {isAr ? 'الدور الأرضي' : 'Ground Floor'}
              </text>
              <text x="8" y="27" fontSize="8" fill="var(--gold-primary)" fontFamily="monospace">
                412 m² • Lobby & Retail
              </text>
              <text x="130" y="22" fontSize="8" fill="var(--gold-primary)" textAnchor="end">
                {isAr ? 'عرض ‹' : 'Inspect ›'}
              </text>
            </g>
          </g>

          {/* ─── BASEMENT FLOOR ─── */}
          <g
            role="button"
            tabIndex={0}
            className="pub-elev-floor-row"
            style={{ cursor: 'pointer' }}
            onClick={() => setBldView({ mode: 'floor', floorKey: 'bld_basement' })}
          >
            {/* Earth & Concrete Retaining Soil Background */}
            <rect x={bldX - 10} y={groundBaseY + 1} width={bldW + 20} height={basementH} fill="url(#pubElevGroundHatch)" opacity="0.3" />
            <rect x={bldX} y={groundBaseY + 1} width={bldW} height={basementH} fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="1.5" strokeDasharray="6 3" />
            {/* Basement Ramp / Garage Pillars */}
            <g transform={`translate(${bldX + 24}, ${groundBaseY + 10})`}>
              <rect width="140" height="32" fill="rgba(221, 167, 82, 0.04)" stroke="var(--gold-primary)" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 2" />
              <text x="70" y="20" fontSize="8" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">PARKING (P-01..P-08)</text>
            </g>
            <g transform={`translate(${bldRight - 164}, ${groundBaseY + 10})`}>
              <rect width="140" height="32" fill="rgba(221, 167, 82, 0.04)" stroke="var(--gold-primary)" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 2" />
              <text x="70" y="20" fontSize="8" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">PUMPS & GENERATOR</text>
            </g>

            {/* Basement Info Card */}
            <g transform={`translate(${bldRight + 16}, ${groundBaseY + 8})`}>
              <rect width="138" height="34" rx="6" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeOpacity="0.4" strokeWidth="1" />
              <text x="8" y="14" fontSize="9.5" fill="var(--cad-text-primary)" fontWeight="700">
                {isAr ? 'البدروم والمواقف' : 'Basement Parking'}
              </text>
              <text x="8" y="26" fontSize="8" fill="var(--gold-primary)" fontFamily="monospace">
                412 m² • Secure Garage
              </text>
              <text x="130" y="20" fontSize="8" fill="var(--gold-primary)" textAnchor="end">
                {isAr ? 'عرض ‹' : 'Inspect ›'}
              </text>
            </g>
          </g>
        </svg>
      );
    }

    /* ─── 2. BUILDING FLOOR PLATE VIEW ─── */
    if (propertyType === 'building' && bldView.mode === 'floor') {
      return (
        <svg
          viewBox="0 0 740 480"
          className="cad-vector-svg"
          style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center center', direction: 'ltr' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="pubFloorCadGrid" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M 12 0 L 0 0 0 12" fill="none" stroke="var(--cad-grid-color)" strokeWidth="0.5" />
            </pattern>
            <pattern id="pubParquetPattern" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 0 0 L 8 8 M 8 0 L 16 8 M 0 8 L 8 16 M 8 8 L 16 16" fill="none" stroke="var(--cad-parquet-stroke)" strokeWidth="0.8" />
              <rect width="16" height="16" fill="var(--cad-parquet-fill)" />
            </pattern>
            <pattern id="pubTilePattern" width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="14" fill="var(--cad-tile-fill)" stroke="var(--cad-tile-stroke)" strokeWidth="0.6" />
            </pattern>
            <pattern id="pubDeckPattern" width="8" height="16" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="8" y2="0" stroke="var(--cad-deck-stroke)" strokeWidth="0.8" />
              <rect width="8" height="16" fill="var(--cad-deck-fill)" />
            </pattern>
            <pattern id="pubBedPattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="0.8" fill="var(--cad-bed-dot)" />
              <rect width="10" height="10" fill="var(--cad-bed-fill)" />
            </pattern>
            <pattern id="pubColumnHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--gold-primary)" strokeWidth="1.2" />
            </pattern>
          </defs>

          <rect width="740" height="480" fill="var(--cad-stage-bg)" />
          <rect width="740" height="480" fill="url(#pubFloorCadGrid)" />

          {/* Dimension Leader Lines */}
          <g className="fp-dimension-leaders" opacity="0.95">
            <line x1="64" y1="36" x2="676" y2="36" stroke="var(--gold-primary)" strokeWidth="1" />
            <line x1="64" y1="30" x2="64" y2="46" stroke="var(--gold-primary)" strokeWidth="1.5" />
            <line x1="676" y1="30" x2="676" y2="46" stroke="var(--gold-primary)" strokeWidth="1.5" />
            <rect x="320" y="26" width="100" height="18" rx="4" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeWidth="0.8" />
            <text x="370" y="38" fontSize="8.5" fill="var(--cad-dims-color)" textAnchor="middle" fontFamily="monospace" fontWeight="800">24.00 m</text>

            <line x1="36" y1="56" x2="36" y2="424" stroke="var(--gold-primary)" strokeWidth="1" />
            <line x1="30" y1="56" x2="46" y2="56" stroke="var(--gold-primary)" strokeWidth="1.5" />
            <line x1="30" y1="424" x2="46" y2="424" stroke="var(--gold-primary)" strokeWidth="1.5" />
            <rect x="18" y="230" width="36" height="18" rx="4" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeWidth="0.8" />
            <text x="36" y="242" fontSize="8" fill="var(--cad-dims-color)" textAnchor="middle" fontFamily="monospace" fontWeight="800">16.00m</text>
          </g>

          {/* Exterior Double Insulated Walls */}
          <rect x="64" y="56" width="612" height="368" fill="none" stroke="var(--gold-primary)" strokeWidth="4" />
          <rect x="68" y="60" width="604" height="360" fill="none" stroke="var(--gold-primary)" strokeOpacity="0.4" strokeWidth="1" />

          {/* Corner Concrete Columns */}
          {[
            [64, 56], [320, 56], [420, 56], [676, 56],
            [64, 240], [676, 240],
            [64, 424], [320, 424], [420, 424], [676, 424]
          ].map(([cx, cy], i) => (
            <rect key={`col-${i}`} x={cx - 6} y={cy - 6} width="12" height="12" fill="url(#pubColumnHatch)" stroke="var(--gold-primary)" strokeWidth="1.2" />
          ))}

          {/* GROUND FLOOR PLATE */}
          {isGround && (
            <g className="pub-ground-plate">
              <rect x="70" y="62" width="600" height="356" fill="url(#pubTilePattern)" />
              <circle cx="370" cy="424" r="20" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="1.5" />
              <text x="370" y="446" fontSize="7.5" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">ENTRANCE GATE</text>
              <g transform="translate(330, 80)">
                <rect width="80" height="74" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="2" />
                <text x="40" y="42" fontSize="9" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">ELEVATOR</text>
              </g>
              <g transform="translate(330, 160)">
                <rect width="80" height="100" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="2" />
                <text x="40" y="55" fontSize="7.5" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">STAIRCASE ↗</text>
              </g>
              <g transform="translate(80, 80)">
                <rect width="220" height="160" fill="rgba(221,167,82,0.04)" stroke="var(--gold-primary)" strokeOpacity="0.4" strokeWidth="1.5" />
                <text x="110" y="90" fontSize="9.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="800">GROUND GARAGE BAYS</text>
              </g>
              <g transform="translate(80, 260)">
                <rect width="100" height="150" fill="var(--cad-tile-fill)" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4 2" />
                <text x="50" y="80" fontSize="7.5" fill="#3B82F6" textAnchor="middle" fontWeight="800">WATER PUMPS</text>
              </g>
              <g transform="translate(190, 260)">
                <rect width="110" height="150" fill="var(--cad-parquet-fill)" stroke="var(--gold-primary)" strokeWidth="1.5" strokeDasharray="4 2" />
                <text x="55" y="80" fontSize="7.5" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">⚡ ELECTRIC BOX</text>
              </g>
              <g transform="translate(440, 80)">
                <rect width="220" height="200" fill="var(--cad-parquet-fill)" stroke="var(--gold-primary)" strokeOpacity="0.4" strokeWidth="1.5" />
                <text x="110" y="110" fontSize="10" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="800">COMMERCIAL RETAIL SHOP</text>
              </g>
            </g>
          )}

          {/* BASEMENT FLOOR PLATE */}
          {isBasement && (
            <g className="pub-basement-plate">
              <rect x="70" y="62" width="600" height="356" fill="rgba(10, 14, 24, 0.4)" stroke="var(--gold-primary)" strokeDasharray="4 2" />
              <g transform="translate(80, 70)">
                <rect width="580" height="220" fill="rgba(221,167,82,0.03)" stroke="var(--gold-primary)" strokeOpacity="0.4" strokeWidth="1.5" />
                <text x="290" y="110" fontSize="14" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">BASEMENT PARKING ENCLAVE (P-01 to P-12)</text>
                <text x="290" y="130" fontSize="9" fill="var(--cad-text-muted)" textAnchor="middle">Secure access via automatic hydraulic gate</text>
              </g>
              <g transform="translate(80, 300)">
                <rect width="280" height="110" fill="var(--cad-tile-fill)" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4 2" />
                <text x="140" y="60" fontSize="9" fill="#3B82F6" textAnchor="middle" fontWeight="800">CENTRAL WATER TANK & MOTOR PUMPS</text>
              </g>
              <g transform="translate(380, 300)">
                <rect width="280" height="110" fill="var(--cad-parquet-fill)" stroke="var(--gold-primary)" strokeWidth="1.5" strokeDasharray="4 2" />
                <text x="140" y="60" fontSize="9" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">BACKUP POWER GENERATOR & MAIN PANEL</text>
              </g>
            </g>
          )}

          {/* ROOFTOP SKY TERRACE PLATE */}
          {isRoof && (
            <g className="pub-roof-plate">
              <rect x="70" y="62" width="600" height="356" fill="url(#pubDeckPattern)" />
              <g transform="translate(330, 80)">
                <rect width="80" height="74" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="2" />
                <text x="40" y="42" fontSize="8" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">ELEVATOR</text>
              </g>
              <g transform="translate(330, 160)">
                <rect width="80" height="100" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="2" />
                <text x="40" y="55" fontSize="7.5" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">STAIRS ↗</text>
              </g>
              <g transform="translate(100, 90)">
                <rect width="200" height="280" fill="rgba(221,167,82,0.06)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <text x="100" y="140" fontSize="12" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">SKY LOUNGE & PERGOLA</text>
                <text x="100" y="160" fontSize="8.5" fill="var(--cad-text-muted)" textAnchor="middle">Outdoor BBQ & Seating Area</text>
              </g>
              <g transform="translate(440, 90)">
                <rect width="200" height="280" fill="rgba(127,180,216,0.08)" stroke="#7FB4D8" strokeWidth="1.5" />
                <text x="100" y="140" fontSize="12" fill="#7FB4D8" textAnchor="middle" fontWeight="800">SOLAR ARRAY & TANKS</text>
                <text x="100" y="160" fontSize="8.5" fill="var(--cad-text-muted)" textAnchor="middle">Clean energy & water reserves</text>
              </g>
            </g>
          )}

          {/* TYPICAL RESIDENTIAL FLOOR PLATE */}
          {!isGround && !isRoof && !isBasement && (
            <g className="pub-typical-plate">
              <rect x="320" y="56" width="100" height="368" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="2.5" />
              <g transform="translate(330, 68)">
                <rect width="80" height="74" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="2" />
                <text x="40" y="38" fontSize="8" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">ELEVATOR</text>
                <text x="40" y="50" fontSize="7" fill="var(--cad-text-muted)" textAnchor="middle">8 Persons</text>
              </g>
              <g transform="translate(330, 154)">
                <rect width="80" height="110" fill="var(--cad-core-bg)" stroke="var(--gold-primary)" strokeWidth="2" />
                <text x="40" y="60" fontSize="7.5" fill="var(--gold-primary)" textAnchor="middle" fontWeight="800">STAIRS ↗</text>
              </g>
              <g transform="translate(320, 320)">
                <rect width="100" height="104" fill="var(--cad-core-bg)" />
                <text x="50" y="58" fontSize="7.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="800">CORRIDOR</text>
              </g>

              {/* Flat A (Left Wing) */}
              <g 
                className="pub-elev-floor-group"
                onClick={() => setBldView({ mode: 'unit', floorKey: bldView.floorKey, unitId: 'flatA' })}
                style={{ cursor: 'pointer' }}
              >
                <rect x="68" y="60" width="252" height="360" fill="transparent" />
                <rect x="170" y="210" width="150" height="210" fill="url(#pubParquetPattern)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                {/* Sofa Lounge outline */}
                <rect x="190" y="340" width="70" height="24" rx="3" fill="var(--cad-furniture-fill)" stroke="var(--gold-primary)" strokeOpacity="0.6" strokeWidth="1" />
                <circle cx="225" cy="315" r="10" fill="var(--cad-furniture-fill)" stroke="var(--gold-primary)" strokeOpacity="0.6" strokeWidth="1" />
                <text x="245" y="250" fontSize="9" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">Grand Reception</text>
                <text x="245" y="264" fontSize="8" fill="var(--gold-primary)" textAnchor="middle" fontFamily="monospace">68.0 m²</text>

                <rect x="68" y="60" width="112" height="150" fill="url(#pubBedPattern)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <rect x="90" y="74" width="46" height="50" rx="2" fill="var(--cad-furniture-fill)" stroke="var(--gold-primary)" strokeOpacity="0.6" strokeWidth="1" />
                <text x="124" y="145" fontSize="8.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">Master Suite</text>

                <rect x="180" y="60" width="140" height="150" fill="url(#pubBedPattern)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <rect x="230" y="74" width="40" height="46" rx="2" fill="var(--cad-furniture-fill)" stroke="var(--gold-primary)" strokeOpacity="0.6" strokeWidth="1" />
                <text x="250" y="145" fontSize="8.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">Guest Bedroom</text>

                <rect x="68" y="210" width="102" height="100" fill="url(#pubTilePattern)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <text x="119" y="260" fontSize="8.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">Kitchen</text>

                <rect x="68" y="310" width="102" height="110" fill="url(#pubTilePattern)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <text x="119" y="365" fontSize="8.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">Main Bath</text>

                {/* Exterior Projecting Balcony */}
                <rect x="36" y="140" width="28" height="140" fill="url(#pubDeckPattern)" stroke="#3B82F6" strokeWidth="1.5" />
                <text x="50" y="215" fontSize="7.5" fill="#3B82F6" textAnchor="middle" fontWeight="800" transform="rotate(-90 50 215)">BALCONY</text>

                {/* Flat A Action Card */}
                <g transform="translate(80, 72)">
                  <rect width="136" height="28" rx="6" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeWidth="1.2" />
                  <text x="8" y="14" fontSize="9" fill="var(--cad-text-primary)" fontWeight="800">Flat 1A</text>
                  <text x="128" y="14" fontSize="8.5" fill="var(--gold-primary)" textAnchor="end" fontWeight="800">206 m²</text>
                  <text x="8" y="23" fontSize="7" fill="var(--cad-dims-color)">{isAr ? 'انقر لعرض مخطط الشقة ‹' : 'Click to inspect unit plan ›'}</text>
                </g>
              </g>

              {/* Flat B (Right Wing) */}
              <g 
                className="pub-elev-floor-group"
                onClick={() => setBldView({ mode: 'unit', floorKey: bldView.floorKey, unitId: 'flatB' })}
                style={{ cursor: 'pointer' }}
              >
                <rect x="420" y="60" width="252" height="360" fill="transparent" />
                <rect x="420" y="210" width="150" height="210" fill="url(#pubParquetPattern)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <rect x="480" y="340" width="70" height="24" rx="3" fill="var(--cad-furniture-fill)" stroke="var(--gold-primary)" strokeOpacity="0.6" strokeWidth="1" />
                <circle cx="515" cy="315" r="10" fill="var(--cad-furniture-fill)" stroke="var(--gold-primary)" strokeOpacity="0.6" strokeWidth="1" />
                <text x="495" y="250" fontSize="9" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">Grand Reception</text>
                <text x="495" y="264" fontSize="8" fill="var(--gold-primary)" textAnchor="middle" fontFamily="monospace">68.0 m²</text>

                <rect x="560" y="60" width="112" height="150" fill="url(#pubBedPattern)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <rect x="604" y="74" width="46" height="50" rx="2" fill="var(--cad-furniture-fill)" stroke="var(--gold-primary)" strokeOpacity="0.6" strokeWidth="1" />
                <text x="616" y="145" fontSize="8.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">Master Suite</text>

                <rect x="420" y="60" width="140" height="150" fill="url(#pubBedPattern)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <rect x="470" y="74" width="40" height="46" rx="2" fill="var(--cad-furniture-fill)" stroke="var(--gold-primary)" strokeOpacity="0.6" strokeWidth="1" />
                <text x="490" y="145" fontSize="8.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">Guest Bedroom</text>

                <rect x="570" y="210" width="102" height="100" fill="url(#pubTilePattern)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <text x="621" y="260" fontSize="8.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">Kitchen</text>

                <rect x="570" y="310" width="102" height="110" fill="url(#pubTilePattern)" stroke="var(--gold-primary)" strokeWidth="1.5" />
                <text x="621" y="365" fontSize="8.5" fill="var(--cad-text-primary)" textAnchor="middle" fontWeight="700">Main Bath</text>

                {/* Exterior Projecting Balcony */}
                <rect x="676" y="140" width="28" height="140" fill="url(#pubDeckPattern)" stroke="#3B82F6" strokeWidth="1.5" />
                <text x="690" y="215" fontSize="7.5" fill="#3B82F6" textAnchor="middle" fontWeight="800" transform="rotate(90 690 215)">BALCONY</text>

                {/* Flat B Action Card */}
                <g transform="translate(524, 72)">
                  <rect width="136" height="28" rx="6" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeWidth="1.2" />
                  <text x="8" y="14" fontSize="9" fill="var(--cad-text-primary)" fontWeight="800">Flat 1B</text>
                  <text x="128" y="14" fontSize="8.5" fill="var(--gold-primary)" textAnchor="end" fontWeight="800">206 m²</text>
                  <text x="8" y="23" fontSize="7" fill="var(--cad-dims-color)">{isAr ? 'انقر لعرض مخطط الشقة ‹' : 'Click to inspect unit plan ›'}</text>
                </g>
              </g>
            </g>
          )}

          {/* Title Badge Bottom Left */}
          <g transform="translate(64, 436)">
            <rect width="140" height="24" rx="4" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeWidth="0.8" />
            <text x="8" y="16" fontSize="8.5" fill="var(--cad-text-primary)" fontWeight="800">
              {isGround ? (isAr ? 'الدور الأرضي' : 'Ground Floor') : isRoof ? (isAr ? 'السطح والتراس' : 'Roof Terrace') : isBasement ? (isAr ? 'البدروم' : 'Basement') : bldView.floorKey}
            </text>
            <text x="132" y="16" fontSize="8" fill="var(--gold-primary)" textAnchor="end" fontFamily="monospace">412 m²</text>
          </g>
        </svg>
      );
    }

    /* ─── 3. APARTMENT / FLAT / UNIT DETAILED BLUEPRINT ─── */
    return (
      <svg
        viewBox={dynamicViewBox}
        preserveAspectRatio="xMidYMid meet"
        className="cad-vector-svg cad-unit-svg"
        style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center center', direction: 'ltr' }}
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
            if (lbl.includes('وحدة أ') || lbl.includes('Unit A')) k = isAr ? 'وحدة أ — 150 م²' : 'Unit A — 150 m²';
            else if (lbl.includes('وحدة ب') || lbl.includes('Unit B')) k = isAr ? 'وحدة ب — 150 م²' : 'Unit B — 150 m²';
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
                      {s.sqm} m²
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
            {isAr ? 'مخطط معماري تفصيلي للمساحات' : 'ARCHITECTURAL CAD FLOOR PLAN'}
          </text>
          <text x="10" y="18.5" fontSize="6.5" fill="var(--gold-primary)" fontFamily="monospace" fontWeight="700" textAnchor="start" dominantBaseline="middle" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
            {`BOUNDS: ${totalWidthM}m × ${totalDepthM}m • SCALE 1:50`}
          </text>
        </g>

        {/* North Compass Arrow (Dynamic positioning relative to layoutBounds) */}
        <g transform={`translate(${compassX}, ${compassY})`} opacity="0.95">
          <circle cx="14" cy="14" r="12" fill="var(--cad-stamp-bg)" stroke="var(--gold-primary)" strokeWidth="1" />
          <polygon points="14,4 18,20 14,16 10,20" fill="var(--gold-primary)" />
          <text x="14" y="2" fontSize="7" fill="var(--gold-primary)" textAnchor="middle" fontWeight="900">N</text>
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
          title="Zoom Out (-)"
        >
          <Minus size={13} />
        </button>
        <button 
          className="cad-zoom-val-btn" 
          onClick={handleResetZoom} 
          type="button" 
          title="Reset View (100%)"
        >
          <span>{Math.round(zoom * 100)}%</span>
        </button>
        <button 
          className="cad-zoom-btn" 
          onClick={handleZoomIn} 
          disabled={zoom >= 2.5}
          type="button" 
          title="Zoom In (+)"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Right Cluster: Metrology Tags & Fullscreen Toggle */}
      <div className="stage-controls-right-group">
        <div className="metrology-tag">
          <Compass size={13} className="compass-icon" />
          <span>N 32° W</span>
        </div>

        <div className="metrology-tag">
          <span>SCALE 1:50</span>
        </div>

        <div className="metrology-tag gold-tag">
          <Info size={12} />
          <span>{isAr ? 'انقر على أي غرفة لعرض المواصفات' : 'Click any space for full specs'}</span>
        </div>

        {/* Fullscreen Button (Only shown in inline mode) */}
        {!inFullscreen && (
          <button
            type="button"
            className="cad-fullscreen-toggle-btn"
            onClick={() => setIsFullscreen(true)}
            title="View Fullscreen Studio"
          >
            <Maximize2 size={14} />
            <span>{isAr ? 'ملء الشاشة' : 'Fullscreen'}</span>
          </button>
        )}
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
        {propertyType === 'building' ? (
          <div className="studio-crumbs-row">
            <button
              type="button"
              className={`studio-crumb-btn ${bldView.mode === 'elevation' ? 'active' : ''}`}
              onClick={() => setBldView({ mode: 'elevation', floorKey: bldView.floorKey })}
            >
              <Building size={13} />
              <span>{isAr ? 'واجهة المبنى' : 'Building Facade'}</span>
            </button>
            {bldView.mode !== 'elevation' && (
              <>
                <span className="studio-crumb-sep">›</span>
                <button
                  type="button"
                  className={`studio-crumb-btn ${bldView.mode === 'floor' ? 'active' : ''}`}
                  onClick={() => setBldView({ mode: 'floor', floorKey: bldView.floorKey })}
                >
                  <span>{isGround ? (isAr ? 'الدور الأرضي' : 'Ground Floor') : isRoof ? (isAr ? 'السطح' : 'Roof') : isBasement ? (isAr ? 'البدروم' : 'Basement') : bldView.floorKey}</span>
                </button>
              </>
            )}
            {bldView.mode === 'unit' && (
              <>
                <span className="studio-crumb-sep">›</span>
                <span className="studio-crumb-btn active">
                  <span>{bldView.unitId ? 'Flat' : (isAr ? 'الشقة' : 'Flat Plan')}</span>
                </span>
              </>
            )}
          </div>
        ) : availableFloors.length > 1 ? (
          <div className="studio-crumbs-row">
            {availableFloors.map((fKey) => {
              const isActive = activeFloorKey === fKey;
              const fZone = processedZones.find(z => z.floorKey === fKey);
              const label = isAr ? (fZone?.floorLabelAr || fKey) : (fZone?.floorLabel || fKey);
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

      {/* 2. Panoramic Inline CAD Stage */}
      <div className="studio-panoramic-stage">
        {renderControlsBar(false)}
        <div 
          className="stage-svg-wrapper" 
          onMouseDown={handleMouseDown} 
          onMouseMove={handleMouseMove} 
          onMouseUp={handleMouseUp}
        >
          {renderVectorSvgContent()}
        </div>
      </div>

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

            {propertyType === 'building' ? (
              <div className="studio-crumbs-row">
                <button
                  type="button"
                  className={`studio-crumb-btn ${bldView.mode === 'elevation' ? 'active' : ''}`}
                  onClick={() => setBldView({ mode: 'elevation', floorKey: bldView.floorKey })}
                >
                  <Building size={13} />
                  <span>{isAr ? 'واجهة المبنى' : 'Building Facade'}</span>
                </button>
                {bldView.mode !== 'elevation' && (
                  <>
                    <span className="studio-crumb-sep">›</span>
                    <button
                      type="button"
                      className={`studio-crumb-btn ${bldView.mode === 'floor' ? 'active' : ''}`}
                      onClick={() => setBldView({ mode: 'floor', floorKey: bldView.floorKey })}
                    >
                      <span>{isGround ? (isAr ? 'الدور الأرضي' : 'Ground Floor') : isRoof ? (isAr ? 'السطح' : 'Roof') : isBasement ? (isAr ? 'البدروم' : 'Basement') : bldView.floorKey}</span>
                    </button>
                  </>
                )}
                {bldView.mode === 'unit' && (
                  <>
                    <span className="studio-crumb-sep">›</span>
                    <span className="studio-crumb-btn active">
                      <span>{bldView.unitId ? 'Flat' : (isAr ? 'الشقة' : 'Flat Plan')}</span>
                    </span>
                  </>
                )}
              </div>
            ) : availableFloors.length > 1 ? (
              <div className="studio-crumbs-row">
                {availableFloors.map((fKey) => {
                  const isActive = activeFloorKey === fKey;
                  const fZone = processedZones.find(z => z.floorKey === fKey);
                  const label = isAr ? (fZone?.floorLabelAr || fKey) : (fZone?.floorLabel || fKey);
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

                {/* Modal Hero Visual Image */}
                <div className="pub-modal-hero">
                  <img 
                    src={activeModalZone.image} 
                    alt={isAr ? activeModalZone.zoneTitleAr : activeModalZone.zoneTitle} 
                    className="pub-modal-img" 
                  />
                  <div className="pub-modal-scrim" />
                </div>

                {/* 4 Architectural Key Metrics */}
                <div className="pub-metrics-grid">
                  <div className="pub-metric-cell">
                    <span className="pub-metric-lbl">{isAr ? 'مساحة المسطح' : 'BUILT-UP AREA'}</span>
                    <span className="pub-metric-val" dir="ltr">{activeModalZone.sqm} m²</span>
                  </div>
                  <div className="pub-metric-cell">
                    <span className="pub-metric-lbl">{isAr ? 'ارتفاع السقف' : 'CEILING HEIGHT'}</span>
                    <span className="pub-metric-val">{activeModalZone.ceiling}</span>
                  </div>
                  <div className="pub-metric-cell">
                    <span className="pub-metric-lbl">{isAr ? 'الأبعاد المعمارية' : 'DIMENSIONS'}</span>
                    <span className="pub-metric-val" dir="ltr">{activeModalZone.dims}</span>
                  </div>
                  <div className="pub-metric-cell">
                    <span className="pub-metric-lbl">{isAr ? 'الفتحات والنوافذ' : 'OPENINGS'}</span>
                    <span className="pub-metric-val" dir="ltr">
                      {activeModalZone.doorCount + activeModalZone.windowCount > 0
                        ? [
                            activeModalZone.doorCount > 0 
                              ? `${activeModalZone.doorCount} ${isAr ? (activeModalZone.doorCount === 1 ? 'باب' : 'أبواب') : (activeModalZone.doorCount === 1 ? 'Door' : 'Doors')}` 
                              : null,
                            activeModalZone.windowCount > 0 
                              ? `${activeModalZone.windowCount} ${isAr ? (activeModalZone.windowCount === 1 ? 'نافذة' : 'نوافذ') : (activeModalZone.windowCount === 1 ? 'Window' : 'Windows')}` 
                              : null,
                          ].filter(Boolean).join(' · ')
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Engineered Trades & Materials Matrix */}
                <div className="pub-trades-section">
                  <h4 className="pub-trades-heading">
                    {isAr ? 'المواصفات والأنظمة الهندسية المعتمدة' : 'ENGINEERED SYSTEMS & MATERIAL SPECIFICATIONS'}
                  </h4>

                  <div className="pub-trades-grid">
                    {activeModalZone.trades.map((trade) => {
                      const Icon = trade.icon === 'zap' ? Zap : trade.icon === 'wind' ? Wind : trade.icon === 'droplet' ? Droplet : Layers;
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
                            <p className="pub-trade-spec">{isAr ? trade.specAr : trade.spec}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pub-modal-footer">
                  <a
                    href={`https://wa.me/201000000000?text=Hello,%20I%20am%20inquiring%20about%20${encodeURIComponent(activeModalZone.zoneTitle)}%20in%20${encodeURIComponent(propertyTitle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pub-inquire-cta-btn"
                  >
                    <MessageSquare size={16} />
                    <span>{isAr ? 'استفسار فوري عن هذا الجناح' : 'Inquire About This Space'}</span>
                  </a>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <style>{`
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

        .studio-crumb-sep {
          color: var(--gold-primary, rgba(221, 167, 82, 0.5));
          font-size: 0.85rem;
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

        .pub-elev-floor-row:hover rect {
          fill: rgba(221, 167, 82, 0.18);
          stroke-width: 2.2;
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
