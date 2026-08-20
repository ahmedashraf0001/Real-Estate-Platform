'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Zap, 
  Wind, 
  Droplet, 
  Compass, 
  FileText, 
  Building, 
  Check, 
  Sparkles,
  Camera,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Maximize2
} from 'lucide-react';
import { ZoneInstance, ZoneSpatialLayout, getZoneBadge, FinishBadge } from '@/lib/layering';
import { computeMetricLayout, metricInputFromSpatial } from '@/lib/layering/floorplanLayout';
import { FALLBACK_ZONE_METRICS, FALLBACK_ZONE_TITLES, GENERIC_ZONE_METRIC } from '@/lib/layering/zoneMetrics';

type SystemKey = 'all' | 'civil' | 'electrical' | 'plumbing' | 'hvac' | 'finishes';

const SYSTEM_FILTERS: Array<{ key: SystemKey; en: string; ar: string }> = [
  { key: 'all',        en: 'All Systems', ar: 'كل الأنظمة' },
  { key: 'civil',      en: 'Civil',       ar: 'إنشائي' },
  { key: 'electrical', en: 'Electrical',  ar: 'كهرباء' },
  { key: 'plumbing',   en: 'Plumbing',    ar: 'سباكة' },
  { key: 'hvac',       en: 'HVAC',        ar: 'تكييف' },
  { key: 'finishes',   en: 'Finishes',    ar: 'تشطيبات' },
];

const TIER_BADGES: Record<Exclude<FinishBadge, 'unknown'>, { en: string; ar: string; color: string; bg: string }> = {
  fully_finished: { en: 'Fully Finished', ar: 'تشطيب كامل', color: '#4CC38A', bg: 'rgba(76, 195, 138, 0.12)' },
  semi_finished:  { en: 'Semi-Finished',  ar: 'نص تشطيب',   color: '#E0A63A', bg: 'rgba(224, 166, 58, 0.12)' },
  red_brick:      { en: 'Red Brick',      ar: 'طوب أحمر',    color: '#E06D5B', bg: 'rgba(224, 109, 91, 0.12)' },
  mixed:          { en: 'Mixed Finishing', ar: 'تشطيب مختلط', color: '#9FB3D9', bg: 'rgba(159, 179, 217, 0.12)' },
};

interface ArchitecturalBlueprintInspectorProps {
  zones?: ZoneInstance[];
  propertyTitle: string;
  locale?: string;
  propertyType?: string;
  propertyImages?: string[];
}

// Curated Architectural Room Photography
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

// All metrics come from the shared FALLBACK_ZONE_METRICS table so the public
// page and the admin edit form always agree.
const ZONE_METRICS: Record<string, { sqm: number; ceiling: string; dims: string }> =
  Object.fromEntries(
    Object.entries(FALLBACK_ZONE_METRICS).map(([id, m]) => [
      id,
      { sqm: m.sqm, ceiling: m.ceiling, dims: `${m.length_m}m × ${m.width_m}m` },
    ]),
  );

const ZONE_TITLES: Record<string, { en: string; ar: string }> = FALLBACK_ZONE_TITLES;

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

function systemOf(trade: TradeSpecItem): Exclude<SystemKey, 'all'> {
  if (trade.icon === 'zap') return 'electrical';
  if (trade.icon === 'droplet') return 'plumbing';
  if (trade.icon === 'wind') return 'hvac';
  const n = `${trade.name} ${trade.nameAr}`.toLowerCase();
  if (/paint|finish|carpentry|joinery|door|tiling|دهان|تشطيب|نجارة|أبواب/.test(n)) return 'finishes';
  return 'civil';
}

// Room-Specific Bespoke Engineering Systems & Materials
const BESPOKE_ROOM_SPECS: Record<string, TradeSpecItem[]> = {
  'vil.g.entrance': [
    {
      id: 'foyer_portal',
      name: 'Statuario Marble Portal & Atrium Wall',
      nameAr: 'بوابة رخام ستاتوريو إيطالي مع بهو مزدوج',
      spec: '5.2m full-height book-matched Statuario marble slabs with brushed brass profile inlays',
      specAr: 'ألواح رخام ستاتوريو إيطالي متطابق بارتفاع ٥.٢م مع حليات وتطعيمات نحاس معتق',
      icon: 'layers',
      badge: 'Bespoke Craft',
      badgeAr: 'تنفيذ خاص'
    },
    {
      id: 'foyer_pivot',
      name: 'Motorized Biometric Pivot Portal',
      nameAr: 'باب محوري مصفح ذكي ببصمة الإصبع',
      spec: '3.2m armored thermal pivot door with integrated biometric recognition & smart lock',
      specAr: 'باب مدخل محوري مصفح بارتفاع ٣.٢م مع قارئ بصمة مدمج وقفل ذكي كهروميكانيكي',
      icon: 'zap',
      badge: 'High Security',
      badgeAr: 'أمان فائق'
    },
    {
      id: 'foyer_lighting',
      name: 'Atrium Architectural Lighting & Chandelier Circuit',
      nameAr: 'الإنارة المعمارية ومسارات الثريا المركزية',
      spec: 'Lutron welcome scenes, perimeter cove light grazing, reinforced 150kg chandelier ceiling box',
      specAr: 'سيناريوهات ترحيب Lutron، إنارة مخفية في الكوف، وصندوق تعليق ثريات مدعم ١٥٠ كجم',
      icon: 'zap',
      badge: 'Lutron HomeWorks',
      badgeAr: 'نظام لوترون'
    },
    {
      id: 'foyer_hvac',
      name: 'High-Throw Vertical Air Diffusers',
      nameAr: 'مخارج هواء رأسية عالية التدفق للبهو',
      spec: 'Concealed Daikin VRF vertical jet diffusers ensuring uniform climate across 5.2m height',
      specAr: 'مخارج هواء نفاثة مخفية Daikin VRF تضمن ثبات درجات الحرارة عبر كامل الارتفاع',
      icon: 'wind',
      badge: 'Balanced Flow',
      badgeAr: 'تدفق متوازن'
    }
  ],

  'vil.g.reception': [
    {
      id: 'rec_marble',
      name: 'Book-Matched Calacatta Gold Marble',
      nameAr: 'رخام كالاكاتا جولد إيطالي متطابق العروق',
      spec: '120×240cm premium Calacatta slabs with acoustic sound-dampening subfloor underlayment',
      specAr: 'ألواح كالاكاتا نخب أول مقاس ١٢٠×٢٤٠سم مع طبقات عزل صوتي متقدمة أسفل الأرضيات',
      icon: 'layers',
      badge: 'Ultra-Luxury',
      badgeAr: 'خامات ملكية'
    },
    {
      id: 'rec_facade',
      name: 'Schuco Structural Glass Panoramic Wall',
      nameAr: 'واجهة زجاجية بانورامية هيكلية Schuco',
      spec: 'Floor-to-ceiling Schuco triple-glazed low-E acoustic glass with thermal barrier & motorized tracks',
      specAr: 'زجاج ثلاثي عازل للصوت والحرارة Schuco من الأرض للسقف مع مسارات ستائر كهروميكانيكية',
      icon: 'layers',
      badge: 'Acoustic 42dB',
      badgeAr: 'عزل صوتي ٤٢ ديسبل'
    },
    {
      id: 'rec_knx',
      name: 'KNX Architectural Lighting & Track Spots',
      nameAr: 'التحكم الذكي والإنارة المغناطيسية KNX',
      spec: 'Magnetic track spotlights (CRI 98+), museum-grade art wall illumination, automated scene pads',
      specAr: 'كشافات مغناطيسية CRI 98+، إنارة لوحات فنية بمستوى المتاحف، ولوحات لمسية ذكية',
      icon: 'zap',
      badge: 'KNX Certified',
      badgeAr: 'معتمد KNX'
    },
    {
      id: 'rec_vrf',
      name: 'Concealed 2.4m Architectural Slot VRF',
      nameAr: 'تكييف مركزي مخفي بمخارج خطية ٢.٤م',
      spec: 'Daikin VRF inverter with 2400mm invisible linear slot diffusers and digital room thermostat',
      specAr: 'أنظمة Daikin VRF بمخارج خطية مدمجة ٢٤٠٠ مم وثرموستات لمسي رقمي مستقل',
      icon: 'wind',
      badge: 'Whisper Silent',
      badgeAr: 'فائق الهدوء'
    }
  ],

  'vil.g.dining': [
    {
      id: 'din_panelling',
      name: 'Canaletto Walnut & Acoustic Ceiling Dome',
      nameAr: 'تجليد خشب جوز كاناليتو وقبة صوتية',
      spec: 'Fluted Italian Canaletto walnut wall paneling, acoustic recessed gypsum dome ceiling',
      specAr: 'تجليدات حوائط خشب جوز إيطالي مضلع مع قبة سقفية جبسية معالجة صوتياً',
      icon: 'layers',
      badge: 'Italian Joinery',
      badgeAr: 'نجارة إيطالية'
    },
    {
      id: 'din_light',
      name: 'Warm-Dimming Dining Ambiance (2200K)',
      nameAr: 'إنارة عشاء دافئة متدرجة ٢٢٠٠ كلفن',
      spec: 'Lutron warm-dimming technology shifting from crisp 3000K to intimate 2200K candlelight warmth',
      specAr: 'تقنية Lutron للتعتيم الدافئ تتحول بسلاسة لضوء الشموع الدافئ ٢٢٠٠ كلفن',
      icon: 'zap',
      badge: 'Lutron WarmDim',
      badgeAr: 'تعتيم دافئ'
    },
    {
      id: 'din_wine',
      name: 'Climate-Controlled Wine Storage Prep',
      nameAr: 'تجهيزات كابينة حفظ المشروبات المبردة',
      spec: 'Dedicated 12°C refrigeration lines, insulated UV-resistant frameless glass enclosure rough-in',
      specAr: 'تمديدات تبريد مخصصة لدرجة ١٢ مئوية وتجهيزات زجاج عازل للأشعة فوق البنفسجية',
      icon: 'droplet',
      badge: 'Sommelier Prep',
      badgeAr: 'جاهز للتبريد'
    },
    {
      id: 'din_vrf',
      name: 'Low-Velocity Silent VRF Climate Supply',
      nameAr: 'تكييف منخفض السرعة غير مسموع',
      spec: 'Acoustically lined ductwork operating below 18 dBA for undisturbed fine dining conversations',
      specAr: 'مجاري هواء معزولة صوتياً تعمل بأقل من ١٨ ديسبل لضمان هدوء تام أثناء العشاء',
      icon: 'wind',
      badge: '< 18 dBA',
      badgeAr: 'أقل من ١٨ ديسبل'
    }
  ],

  'vil.g.kitchen': [
    {
      id: 'kit_appliance',
      name: 'Gaggenau 400 Series 380V Power Infrastructure',
      nameAr: 'بنية كهربائية ٣٨٠ فولت لأجهزة Gaggenau',
      spec: 'Dedicated 3-phase high-amperage feeds for induction cooktop, combi-steam ovens & warming drawers',
      specAr: 'خطوط كهرباء ثلاثية الفاز عالية التحمل لمسطحات الحث، أفران البخار، وأدراج التسخين',
      icon: 'zap',
      badge: '3-Phase 380V',
      badgeAr: '٣ فاز مخصص'
    },
    {
      id: 'kit_stone',
      name: 'Dekton Laurent 20mm Heatproof Island',
      nameAr: 'جزيرة مطبخ رخام صناعي دكتون لوران ٢٠ مم',
      spec: 'Ultra-compact heat-, scratch-, and stain-proof Dekton Laurent slabs with integrated waterfall edge',
      specAr: 'أسطح دكتون فائقة المقاومة للحرارة والخدش والبقع مع جوانب شلال متصلة',
      icon: 'layers',
      badge: 'Heat & Stain Proof',
      badgeAr: 'مقاوم للحرارة'
    },
    {
      id: 'kit_water',
      name: 'Quooker Boiling & Multi-Stage Reverse Osmosis',
      nameAr: 'محطة تحلية RO مع خلاط مياه مغلية Quooker',
      spec: 'Integrated 7-stage RO mineral purification system, Quooker instant 100°C boiling water tap',
      specAr: 'نظام تنقية RO بـ ٧ مراحل، وخلاط Quooker الفوري للمياه المغلية بدرجة ١٠٠ مئوية',
      icon: 'droplet',
      badge: 'Mineral Purity',
      badgeAr: 'تنقية متقدمة'
    },
    {
      id: 'kit_hvac',
      name: 'High-Volume 1400m³/h Ceiling Extraction',
      nameAr: 'شفاط سقف مدمج عالي السحب ١٤٠٠ م³/ساعة',
      spec: 'Flush ceiling extractor with dedicated roof duct and make-up air ventilation interlock',
      specAr: 'شفاط سقف خطي متصل بمدخنة مستقلة للسطح ونظام تعويض هواء أوتوماتيكي',
      icon: 'wind',
      badge: '1400 m³/h',
      badgeAr: 'سحب هائل'
    }
  ],

  'vil.g.powder_room': [
    {
      id: 'pwd_onyx',
      name: 'Backlit Translucent Honey Onyx Slab',
      nameAr: 'لوح رخام أونيكس عسلي مضيء',
      spec: 'Natural book-matched Honey Onyx backlit with 2700K diffusion LED panel and brass wall fixtures',
      specAr: 'رخام أونيكس طبيعي منفذ للضوء مع إضاءة خلفية متجانسة وخلاطات نحاس جدارية',
      icon: 'layers',
      badge: 'Natural Onyx',
      badgeAr: 'أونيكس طبيعي'
    },
    {
      id: 'pwd_geberit',
      name: 'Geberit Sigma80 Touchless Glass Actuator',
      nameAr: 'شاسيه Geberit مع شاشة لمس زجاجية',
      spec: 'Concealed Geberit carrier with dual-beam optical touchless sensor in obsidian black glass',
      specAr: 'شاسيه مدفون Geberit مع لوحة تشغيل زجاجية سوداء تعمل بمستشعر حركة غير تلامسي',
      icon: 'droplet',
      badge: 'Touchless Pro',
      badgeAr: 'تشغيل بدون لمس'
    },
    {
      id: 'pwd_basin',
      name: 'Antonio Lupi Monolithic Freestanding Basin',
      nameAr: 'حوض أنطونيو لوبي حجري قائم بذاته',
      spec: 'Hand-carved Nero Marquina stone basin with Dornbracht brushed dark platinum mixer',
      specAr: 'حوض منحوت يدوياً من حجر نيرو ماركينا الإسباني مع خلاط بلاتينيوم معتق Dornbracht',
      icon: 'droplet',
      badge: 'Italian Atelier',
      badgeAr: 'تصميم إيطالي'
    },
    {
      id: 'pwd_vent',
      name: 'Continuous Silent Acoustic Extraction',
      nameAr: 'نظام سحب وتهوية صامت مستمر',
      spec: 'S&P ultra-quiet inline extraction with continuous low-speed trickle and motion boost',
      specAr: 'شفاط مخفي S&P ألماني صامت يعمل بنظام تدفق هواء دائم وزيادة سحب بالحساس',
      icon: 'wind',
      badge: 'Silent Air Flow',
      badgeAr: 'تهوية صامتة'
    }
  ],

  'vil.f.master_suite': [
    {
      id: 'mst_wood',
      name: 'European Smoked Oak Herringbone Parquet',
      nameAr: 'باركيه خشب بلوط مدخن ألماني هيرنجبون',
      spec: '15mm engineered solid oak with acoustic underlayment, UV matte lacquer finish & brass dividers',
      specAr: 'خشب بلوط طبيعي متداخل مع طبقة عزل صوتي ودهان غير لامع مقاوم للخدش وحليات نحاسية',
      icon: 'layers',
      badge: 'Solid European Oak',
      badgeAr: 'بلوط أوروبي'
    },
    {
      id: 'mst_circadian',
      name: 'Circadian Sleep & Wake KNX Lighting',
      nameAr: 'نظام إنارة بيولوجي ذكي يحاكي ضوء الشمس',
      spec: 'Automated color temperature shifting (1800K to 5000K) supporting natural melatonin cycles',
      specAr: 'تعديل آلي لدرجة حرارة الضوء من الشروق حتى الغروب لتعزيز جودة النوم والراحة',
      icon: 'zap',
      badge: 'Circadian Sync',
      badgeAr: 'مزامنة حيوية'
    },
    {
      id: 'mst_shades',
      name: 'Dual Motorized Blackout & Sheer Drapery',
      nameAr: 'ستائر كهربائية مزدوجة عاتمة وشفافة',
      spec: 'Silent Somfy motorized tracks recessed in ceiling pocket, programmed with bedside keypad',
      specAr: 'مسارات Somfy صامتة مدمجة بالسقف مع تحكم من لوحات جانب السرير وتطبيق الهاتف',
      icon: 'zap',
      badge: '100% Total Blackout',
      badgeAr: 'عزل ضوئي ١٠٠٪'
    },
    {
      id: 'mst_vrf',
      name: 'Draft-Free Night-Mode Daikin VRF',
      nameAr: 'تكييف Daikin بنمط نوم فائق الهدوء',
      spec: 'Indirect linear slot diffusers positioned away from bed zone with continuous humidity balance',
      specAr: 'مخارج هواء غير مباشرة بعيدة عن السرير مع موازنة آلية لنسبة الرطوبة أثناء النوم',
      icon: 'wind',
      badge: 'Draft-Free',
      badgeAr: 'تدفق مريح'
    }
  ],

  'vil.f.master_bath': [
    {
      id: 'mbath_shower',
      name: 'Hansgrohe Axor RainSky Ceiling Shower',
      nameAr: 'دش سقفي مطري فاخر Axor RainSky',
      spec: 'Flush ceiling-mounted multi-pattern shower with integrated therapeutic chromatherapy LED lighting',
      specAr: 'دش مطري سقفي مدفون مع خيارات تدفق متعددة وإنارة علاجية مدمجة بالألوان',
      icon: 'droplet',
      badge: 'Chromatherapy',
      badgeAr: 'إنارة علاجية'
    },
    {
      id: 'mbath_stone',
      name: 'Full-Height Arabescato Corchia Marble Slabs',
      nameAr: 'ألواح رخام أرابيسكاتو إيطالي بارتفاع كامل',
      spec: 'Seamless book-matched wet walls with concealed floor drainage and anti-limescale sealing',
      specAr: 'حوائط رخامية متطابقة بدون فواصل ظاهرة مع صفاية دش خطية مخفية تحت الرخام',
      icon: 'layers',
      badge: 'Book-Matched',
      badgeAr: 'عروق متطابقة'
    },
    {
      id: 'mbath_heat',
      name: 'Devi Digital Radiant Heated Floor',
      nameAr: 'تدفئة أرضية كهربائية رقمية Devi',
      spec: 'Programmable radiant underfloor heating mat paired with heated architectural towel rails',
      specAr: 'شبكة تدفئة تحت الرخام رقمية قابلة للبرمجة مع مجفف مناشف معلق ساخن',
      icon: 'zap',
      badge: 'Radiant Warmth',
      badgeAr: 'تدفئة متجانسة'
    },
    {
      id: 'mbath_tub',
      name: 'Freestanding Mineral Composite Soaking Tub',
      nameAr: 'حوض استحمام قائم بذاته من الحجر المعدني',
      spec: 'Solid surface thermal-retaining soaking tub with floor-mounted Hansgrohe Axor mixer',
      specAr: 'بانيو حجري عازل للحرارة يحتفظ بسخونة المياه مع خلاط أرضي مستقل Axor',
      icon: 'droplet',
      badge: 'Spa Grade',
      badgeAr: 'جودة سبا'
    }
  ],

  'vil.f.family_room': [
    {
      id: 'fam_cinema',
      name: 'Dolby Atmos 7.2.4 In-Wall Audio Conduit',
      nameAr: 'بنية تحتية صوتية Dolby Atmos 7.2.4',
      spec: 'Pre-wired in-wall acoustic conduits with soundproof fabric wall paneling and low-resonance studs',
      specAr: 'تمديدات مسرح منزلي مخفية بالحوائط مع ألواح قماشية معالجة صوتياً لامتصاص الصدى',
      icon: 'zap',
      badge: 'Dolby Atmos Ready',
      badgeAr: 'جاهز للصوت المحيطي'
    },
    {
      id: 'fam_knx',
      name: 'Cinema Scene Keypad & RGBW Bias Backlight',
      nameAr: 'لوحة تحكم سينمائية مع إضاءة خلفية للشاشات',
      spec: 'One-touch "Cinema Mode" dimming ceiling spots, closing shades, and illuminating OLED bias lights',
      specAr: 'كبسة واحدة تضبط الإنارة، تغلق الستائر، وتفعل الإضاءة الخلفية المريحة للعين',
      icon: 'zap',
      badge: 'Cinema Presets',
      badgeAr: 'أوضاع سينما'
    },
    {
      id: 'fam_millwork',
      name: 'Bespoke Fluted Oak Media Atelier',
      nameAr: 'مكتبة شاشة من خشب البلوط المضلع',
      spec: 'Custom low-profile media unit with concealed cooling fans for AV receivers and hidden cables',
      specAr: 'وحدة أجهزة ومكتبة بتصميم مضلع مع مراوح تبريد مخفية للأجهزة الصوتية ومسارات أسلاك',
      icon: 'layers',
      badge: 'Custom Millwork',
      badgeAr: 'تفصيل خاص'
    },
    {
      id: 'fam_vrf',
      name: 'High-CFM Daikin Multi-Slot Linear Diffuser',
      nameAr: 'مخرج هواء خطي متعدد الفتحات للتجمعات العائلية',
      spec: 'Sized to maintain crisp cooling during large family film gatherings without air noise',
      specAr: 'مصمم خصيصاً لتبريد مريح وهادئ أثناء التجمعات العائلية الكبيرة دون أي ضجيج',
      icon: 'wind',
      badge: 'Silent Air Flow',
      badgeAr: 'تدفق هادئ'
    }
  ],

  'vil.r.terrace': [
    {
      id: 'roof_pergola',
      name: 'Motorized Bioclimatic Louvered Pergola',
      nameAr: 'برجولا ألومنيوم ذكية بشرائح متحركة',
      spec: 'Automated tilting louvers with built-in rain and wind sensors, integrated perimeter 3000K LED',
      specAr: 'شرائح ألومنيوم كهروميكانيكية تغلق آلياً عند المطر مع إنارة دافئة محيطية مدمجة',
      icon: 'layers',
      badge: 'Smart Bioclimatic',
      badgeAr: 'تحكم ذكي بالطقس'
    },
    {
      id: 'roof_bbq',
      name: 'Marine-Grade 316 Stainless Outdoor BBQ',
      nameAr: 'شواية ومطبخ خارجي ستانلس ستيل ٣١٦',
      spec: 'Built-in 5-burner gas grill, outdoor marine-grade beverage chiller, and granite prep bar',
      specAr: 'شواية غاز بلت إن من الستانلس المقاوم للصدأ مع ثلاجة مشروبات ورخام جرانيت خارجي',
      icon: 'layers',
      badge: 'Marine Grade 316',
      badgeAr: 'مقاوم للعوامل الجوية'
    },
    {
      id: 'roof_waterproof',
      name: 'Sika Double-Layer SBS Elastomeric Membrane',
      nameAr: 'عزل مائي مزدوج SBS من شركة Sika',
      spec: 'Heavy-duty root-proof elastomeric waterproofing membrane with concealed linear perimeter drains',
      specAr: 'عزل مائي مطاطي مزدوج عالي التحمل مع مجاري تصريف أمطار خطية مخفية',
      icon: 'droplet',
      badge: '10-Year Certified',
      badgeAr: 'ضمان ١٠ سنوات'
    },
    {
      id: 'roof_sound',
      name: 'Sonance All-Weather Landscape Audio',
      nameAr: 'نظام صوتي خارجي Sonance مقاوم للماء',
      spec: 'IP66 waterproof landscape speakers paired with multi-zone Sonos digital streaming amplifier',
      specAr: 'سماعات خارجية IP66 مقاومة للرطوبة والشمس متصلة بنظام Sonos للبث الصوتي',
      icon: 'zap',
      badge: 'IP66 Waterproof',
      badgeAr: 'مقاوم للماء IP66'
    }
  ],

  'vil.b.garage': [
    {
      id: 'grg_floor',
      name: 'Polyaspartic Terrazzo Epoxy Coating',
      nameAr: 'أرضيات إيبوكسي تيرازو بوليازبارتيك فائق التحمل',
      spec: 'Industrial-grade seamless resin floor resistant to hot tire marks, chemical spills & motor oils',
      specAr: 'أرضية راتنجية متصلة خالية من الفواصل مقاومة لحرارة الإطارات، الزيوت والمواد الكيميائية',
      icon: 'layers',
      badge: 'Heavy Duty Resin',
      badgeAr: 'تحمل شاق'
    },
    {
      id: 'grg_ev',
      name: 'Dual 22kW 3-Phase Fast EV Wallbox Chargers',
      nameAr: 'محطتا شحن سريع للسيارات الكهربائية ٢٢ ك.و',
      spec: 'Two Type-2 smart chargers with intelligent load management and solar-generation prioritization',
      specAr: 'شاحنا سيارات كهربائية ذكيان مع توزيع آلي للحمل الكهربائي ودعم الطاقة الشمسية',
      icon: 'zap',
      badge: '2× 22kW Fast Charge',
      badgeAr: 'شحن سريع ٢٢ ك.و'
    },
    {
      id: 'grg_door',
      name: 'Hormann Insulated Sectional High-Speed Doors',
      nameAr: 'أبواب جراج قطعية سريعة عازلة Hormann',
      spec: '42mm double-skin polyurethane insulated panels with optical safety beams and app control',
      specAr: 'أبواب قطعية ألمانية معزولة بسماكة ٤٢ مم مع حساسات أمان وتطبيق تحكم بالجوال',
      icon: 'zap',
      badge: 'German Hormann',
      badgeAr: 'صناعة ألمانية'
    },
    {
      id: 'grg_vent',
      name: 'Automated CO/NO2 Sensor Exhaust System',
      nameAr: 'نظام شفط عوادم السيارات بحساسات الغاز',
      spec: 'Continuous gas monitoring triggering automated dual high-CFM extraction blowers',
      specAr: 'مراقبة دائمة لغازات العوادم مع تشغيل آلي لمراوح السحب العملاقة لضمان هواء نقي',
      icon: 'wind',
      badge: 'Auto Safety Exhaust',
      badgeAr: 'أمان آلي'
    }
  ],

  'vil.exterior': [
    {
      id: 'ext_landscape',
      name: 'Hunter Weather-Sensed Drip & Spray Irrigation',
      nameAr: 'شبكة ري ذكية بمستشعرات طقس Hunter',
      spec: 'Automated multi-zone smart controller adjusting water delivery based on local evapotranspiration',
      specAr: 'نظام ري ذكي متعدد المناطق يضبط كميات المياه آلياً حسب درجات الحرارة والرطوبة',
      icon: 'droplet',
      badge: 'Water Efficient',
      badgeAr: 'ري مستدام'
    },
    {
      id: 'ext_pool',
      name: 'Magnesium Heated Salt-Water Pool System',
      nameAr: 'مسبح مدفأ بنظام تعقيم الماغنيسيوم الصحي',
      spec: 'Skin-softening mineral filtration, inverter heat pump, automated hidden slatted safety cover',
      specAr: 'تعقيم طبيعي بأملاح الماغنيسيوم، مضخة تسخين حرارية، وغطاء أمان كهروميكانيكي مخفي',
      icon: 'droplet',
      badge: 'Mineral Salt Pool',
      badgeAr: 'مياه معدنية صحية'
    },
    {
      id: 'ext_lighting',
      name: 'Bega Brass Bollards & Architectural Uplighting',
      nameAr: 'إنارة حدائق معمارية ألمانية Bega',
      spec: 'Solid forged brass landscape fixtures, astronomical timer control, antiglare tree grazing',
      specAr: 'كشافات نحاس صب ألمانية مع توقيت فلكي يتبع غروب الشمس بدون أي توهج مزعج',
      icon: 'zap',
      badge: 'Solid Brass Bega',
      badgeAr: 'نحاس أصلي Bega'
    },
    {
      id: 'ext_security',
      name: 'AI Perimeter Protection & Thermal CCTV',
      nameAr: 'حماية أمنية ذكية مع كاميرات مراقبة حرارية',
      spec: 'Fiber-optic perimeter intrusion detection paired with 4K active deterrence smart cameras',
      specAr: 'حساسات كابلات ألياف ضوئية على الأسوار مع كاميرات 4K تدعم التعرف الذكي على الأشخاص',
      icon: 'zap',
      badge: 'AI Security Perimeter',
      badgeAr: 'حماية ذكية'
    }
  ]
};

// Fallback Default Room Specs
const DEFAULT_FALLBACK_SPECS: TradeSpecItem[] = [
  {
    id: 'elec',
    name: 'KNX Smart Automation & Lighting',
    nameAr: 'التحكم الذكي والإنارة المعمارية KNX',
    spec: 'Lutron scene dimming, invisible magnetic track lights, presence automation',
    specAr: 'أنظمة تحكم متطورة Lutron، إنارة مغناطيسية مخفية، وحساسات حركة ذكية',
    icon: 'zap',
    badge: 'Turnkey 100%',
    badgeAr: 'تشطيب مكتمل'
  },
  {
    id: 'hvac',
    name: 'Concealed VRF Climate Control',
    nameAr: 'تكييف الهواء المركزي المخفي VRF',
    spec: 'Daikin multi-zone inverter with flush linear architectural slot diffusers',
    specAr: 'أنظمة Daikin متعددة المناطق ومخارج هواء معمارية خطية مدمجة',
    icon: 'wind',
    badge: 'Certified Code',
    badgeAr: 'معتمد هندسياً'
  },
  {
    id: 'finishes',
    name: 'Stonework & Wall Finishes',
    nameAr: 'الرخام المستورد والدهانات المعمارية',
    spec: 'Book-matched Calacatta Gold marble, solid natural parquet, acoustic stucco',
    specAr: 'رخام كالاكاتا إيطالي متطابق العروق، باركيه طبيعي وعزل صوتي فائق',
    icon: 'layers',
    badge: 'Ultra-Luxury',
    badgeAr: 'خامات سوبر ديلوكس'
  },
  {
    id: 'plumbing',
    name: 'Concealed Plumbing & Spa Fixtures',
    nameAr: 'السباكة المدفونة والتجهيزات الصحية',
    spec: 'Geberit concealed carriers, Hansgrohe Axor brushed fixtures, PEX lines',
    specAr: 'شاسيهات مدفونة Geberit، خلاطات Hansgrohe، وتمديدات PEX معزولة',
    icon: 'droplet',
    badge: 'Pressure Tested',
    badgeAr: 'تم الاختبار'
  }
];

function resolveRoomTradeSpecs(zoneKey: string): TradeSpecItem[] {
  const clean = zoneKey.toLowerCase();
  for (const [pattern, specs] of Object.entries(BESPOKE_ROOM_SPECS)) {
    if (clean === pattern || clean.includes(pattern) || pattern.includes(clean)) {
      return specs;
    }
  }

  // Check partial matches (e.g. powder, bath, kitchen, bed, dining, roof, garage)
  if (clean.includes('powder') || clean.includes('guest_bath')) return BESPOKE_ROOM_SPECS['vil.g.powder_room'];
  if (clean.includes('kitchen')) return BESPOKE_ROOM_SPECS['vil.g.kitchen'];
  if (clean.includes('dining')) return BESPOKE_ROOM_SPECS['vil.g.dining'];
  if (clean.includes('entrance') || clean.includes('foyer')) return BESPOKE_ROOM_SPECS['vil.g.entrance'];
  if (clean.includes('master_bath') || clean.includes('spa')) return BESPOKE_ROOM_SPECS['vil.f.master_bath'];
  if (clean.includes('master')) return BESPOKE_ROOM_SPECS['vil.f.master_suite'];
  if (clean.includes('family') || clean.includes('media') || clean.includes('game')) return BESPOKE_ROOM_SPECS['vil.f.family_room'];
  if (clean.includes('bath')) return BESPOKE_ROOM_SPECS['vil.f.main_bath'];
  if (clean.includes('terrace') || clean.includes('roof') || clean.includes('balcony')) return BESPOKE_ROOM_SPECS['vil.r.terrace'];
  if (clean.includes('garage')) return BESPOKE_ROOM_SPECS['vil.b.garage'];
  if (clean.includes('exterior') || clean.includes('garden') || clean.includes('pool')) return BESPOKE_ROOM_SPECS['vil.exterior'];

  return DEFAULT_FALLBACK_SPECS;
}

function flattenZoneInstances(rawZones: ZoneInstance[]): ZoneInstance[] {
  const result: ZoneInstance[] = [];
  for (const z of rawZones) {
    if (z.children && z.children.length > 0) {
      result.push(...flattenZoneInstances(z.children));
    } else {
      result.push(z);
    }
  }
  return result;
}

interface ProcessedZone {
  id: string;
  zoneKey: string;
  floorKey: string;
  floorLabel: string;
  floorLabelAr: string;
  zoneTitle: string;
  zoneTitleAr: string;
  image: string;
  imagesList: string[];
  badge: FinishBadge;
  sqm: number;
  ceiling: string;
  dims: string;
  spatial?: ZoneSpatialLayout;
  svgCoords: { x: number; y: number; w: number; h: number; pinX: number; pinY: number };
  trades: TradeSpecItem[];
}


// Metric-true layout: rooms are sized by their real meter dimensions via the
// shared engine, so this public plan always matches the admin builder preview.
function computeArchitecturalLayout(zones: ProcessedZone[]): ProcessedZone[] {
  const count = zones.length;
  if (count === 0) return [];

  const layout = computeMetricLayout(
    zones.map((zone) => {
      if (zone.spatial?.width_m && zone.spatial?.length_m) {
        return metricInputFromSpatial(zone.id, zone.spatial, zone.sqm);
      }
      const parsed = zone.dims.match(/([\d.]+)\s*m?\s*[×x]\s*([\d.]+)\s*m?/i);
      if (parsed) {
        return { id: zone.id, widthM: parseFloat(parsed[2]), lengthM: parseFloat(parsed[1]) };
      }
      return metricInputFromSpatial(zone.id, zone.spatial, zone.sqm);
    }),
  );

  return zones.map((zone, idx) => {
    const rect = layout.rooms[idx];
    const hasSpatialDims = Boolean(zone.spatial?.length_m && zone.spatial?.width_m);
    return {
      ...zone,
      dims: hasSpatialDims ? `${zone.spatial!.length_m}m × ${zone.spatial!.width_m}m` : zone.dims,
      sqm: zone.spatial?.sqm || zone.sqm,
      ceiling: zone.spatial?.ceiling_height || zone.ceiling,
      svgCoords: { x: rect.x, y: rect.y, w: rect.w, h: rect.h, pinX: rect.x + rect.w / 2, pinY: rect.y + rect.h / 2 },
    };
  });
}

const TRADE_LABELS: Record<string, { en: string; ar: string; defaultSpecEn: string; defaultSpecAr: string }> = {
  electrical: {
    en: 'Electrical Infrastructure & Lighting',
    ar: 'التمديدات الكهربائية والإنارة الذكية',
    defaultSpecEn: 'Concealed fire-rated conduits, certified copper circuitry, and independent sub-panel distribution',
    defaultSpecAr: 'تمديدات خراطيم معزولة مقاومة للحريق وشبكة أسلاك نحاسية معتمدة مع لوحة توزيع مستقلة'
  },
  walls: {
    en: 'Wall Systems & Plastering',
    ar: 'أنظمة الحوائط واللياسة',
    defaultSpecEn: 'Acoustic-treated partition masonry, multi-layer cementitious plaster, and primed smooth surface',
    defaultSpecAr: 'قواطع معالجة صوتياً مع طبقات بياض أسمنتي وشبك تسليح فايبر وبطانة تأسيسية'
  },
  flooring: {
    en: 'Flooring & Sub-Base Prep',
    ar: 'تأسيس وتشطيب الأرضيات',
    defaultSpecEn: 'Laser-calibrated sand base, acoustic insulation membrane, and screed finish preparation',
    defaultSpecAr: 'فرشة رملية موزونة بالليزر مع عازل صوتي وطبقة لياسة مجهزة للرخام والبورسلين'
  },
  carpentry: {
    en: 'Carpentry, Doors & Joinery',
    ar: 'أعمال النجارة والأبواب',
    defaultSpecEn: 'Steamed beechwood sub-frames with acoustic rubber gasket seals and anti-warp anchors',
    defaultSpecAr: 'حلوق خشب زان مبخر مع جوانات عزل الصوت وتثبيت معالج ضد الانفتال والتمدد'
  },
  hvac: {
    en: 'HVAC & Climate Control',
    ar: 'التكييف والتحكم المناخي',
    defaultSpecEn: 'Insulated refrigerant copper piping, concealed condensation drain, and architectural diffuser lines',
    defaultSpecAr: 'مواسير نحاسية معزولة وتمديدات صرف تكييف ومسارات جريلات خطية مدمجة'
  },
  plumbing: {
    en: 'Plumbing & Drainage',
    ar: 'السباكة وشبكات الصرف',
    defaultSpecEn: 'German PEX hot/cold pressure piping, multi-layer acoustic silent drain system, and isolation valves',
    defaultSpecAr: 'شبكة تغذية PEX ألمانية معزولة وصرف صحي ثلاثي الطبقات عازل للصوت ومحابس عزل'
  },
  finishing: {
    en: 'Architectural Finishes',
    ar: 'التشطيبات المعمارية',
    defaultSpecEn: 'Premium grade surface coatings, architectural trim moldings, and high-durability sealants',
    defaultSpecAr: 'دهانات وتشطيبات ديكورية معتمدة وحليات معمارية ومواد عزل وحماية عالية المتانة'
  }
};

const STATUS_FORMATTER: Record<string, { en: string; ar: string }> = {
  conduitsonly: { en: 'Conduits Installed', ar: 'تمديدات الخراطيم' },
  conduits_only: { en: 'Conduits Installed', ar: 'تمديدات الخراطيم' },
  plastered: { en: 'Plastered & Primed', ar: 'محارة وبطانة' },
  sandbed: { en: 'Sub-Base Prepared', ar: 'فرشة رمل موزونة' },
  sand_bed: { en: 'Sub-Base Prepared', ar: 'فرشة رمل موزونة' },
  subframes: { en: 'Sub-Frames Fixed', ar: 'حلوق خشبية مثبتة' },
  sub_frames: { en: 'Sub-Frames Fixed', ar: 'حلوق خشبية مثبتة' },
  notstarted: { en: 'Planned Phase', ar: 'مرحلة مستقبلية' },
  not_started: { en: 'Planned Phase', ar: 'مرحلة مستقبلية' },
  inprogress: { en: 'In Progress', ar: 'قيد التنفيذ' },
  in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
  completed: { en: 'Fully Finished', ar: 'مكتمل بالكامل' },
  turnkey: { en: 'Turnkey Verified', ar: 'تسليم معتمد' },
  firstfix: { en: '1st Fix Complete', ar: 'المرحلة الأولى' },
  first_fix: { en: '1st Fix Complete', ar: 'المرحلة الأولى' },
  secondfix: { en: '2nd Fix Complete', ar: 'المرحلة الثانية' },
  second_fix: { en: '2nd Fix Complete', ar: 'المرحلة الثانية' },
  roughin: { en: 'Rough-In Done', ar: 'التأسيس منجز' }
};

function formatStatus(rawStatus?: string): { en: string; ar: string } {
  if (!rawStatus) return { en: 'Turnkey Verified', ar: 'تسليم معتمد' };
  const clean = rawStatus.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (STATUS_FORMATTER[clean]) return STATUS_FORMATTER[clean];
  const en = rawStatus.replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return { en, ar: en };
}

function resolveTradeInfo(rawTid: string): { nameEn: string; nameAr: string; defaultSpecEn: string; defaultSpecAr: string } {
  const parts = rawTid.split('.');
  const key = parts[parts.length - 1].toLowerCase();
  
  for (const [tKey, data] of Object.entries(TRADE_LABELS)) {
    if (key.includes(tKey) || rawTid.toLowerCase().includes(tKey)) {
      return {
        nameEn: data.en,
        nameAr: data.ar,
        defaultSpecEn: data.defaultSpecEn,
        defaultSpecAr: data.defaultSpecAr
      };
    }
  }

  const fallback = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    nameEn: fallback,
    nameAr: fallback,
    defaultSpecEn: 'Specification verified according to architectural engineering standards',
    defaultSpecAr: 'المواصفة مطابقة للمعايير الهندسية والمعمارية المعتمدة'
  };
}

function parseTradeInstances(zInst: ZoneInstance): TradeSpecItem[] {
  if (!zInst.trades || zInst.trades.length === 0) {
    return resolveRoomTradeSpecs(zInst.zone_template_id);
  }

  const parsed = zInst.trades.map((tInst, tIdx) => {
    const tid = tInst.trade_template_id || `trade-${tIdx}`;
    const tradeInfo = resolveTradeInfo(tid);
    const statusInfo = formatStatus(tInst.status);

    let specEn = '';
    let specAr = '';

    if (tInst.attributes && tInst.attributes.length > 0) {
      const parts: string[] = [];
      tInst.attributes.forEach(attr => {
        if (attr.value !== null && attr.value !== undefined && attr.value !== '') {
          const valStr = typeof attr.value === 'boolean' ? (attr.value ? 'Yes' : 'No') : String(attr.value);
          const attrLabel = attr.attribute_template_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          parts.push(`${attrLabel}: ${valStr}`);
        }
      });
      if (parts.length > 0) {
        specEn = parts.join(' • ');
        specAr = parts.join(' • ');
      }
    }

    if (!specEn) {
      specEn = tradeInfo.defaultSpecEn;
      specAr = tradeInfo.defaultSpecAr;
    }

    let icon: 'zap' | 'wind' | 'droplet' | 'layers' = 'layers';
    const lower = tid.toLowerCase();
    if (lower.includes('elec') || lower.includes('light') || lower.includes('smart') || lower.includes('knx') || lower.includes('power')) {
      icon = 'zap';
    } else if (lower.includes('hvac') || lower.includes('air') || lower.includes('vent') || lower.includes('duct') || lower.includes('climate')) {
      icon = 'wind';
    } else if (lower.includes('plumb') || lower.includes('water') || lower.includes('drain') || lower.includes('sanitary')) {
      icon = 'droplet';
    }

    return {
      id: tInst.id || `trade-${tIdx}-${tid}`,
      name: tradeInfo.nameEn,
      nameAr: tradeInfo.nameAr,
      spec: specEn,
      specAr: specAr,
      icon,
      badge: statusInfo.en,
      badgeAr: statusInfo.ar
    };
  });

  return parsed.length > 0 ? parsed : resolveRoomTradeSpecs(zInst.zone_template_id);
}

export const ArchitecturalBlueprintInspector: React.FC<ArchitecturalBlueprintInspectorProps> = ({
  zones = [],
  propertyTitle,
  locale = 'en',
  propertyType = 'villa'
}) => {
  const isAr = locale === 'ar';
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<'blueprint' | 'photo'>('blueprint');
  const [systemFilter, setSystemFilter] = useState<SystemKey>('all');
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    setPhotoIndex(0);
  }, [selectedZoneId]);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  // CAD Blueprint Interactive Zoom & Pan (Grab) State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDraggedRef.current = true;
    }
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSvgWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom(prev => Math.min(prev + 0.15, 2.5));
      } else {
        setZoom(prev => Math.max(prev - 0.15, 0.75));
      }
    }
  };

  // Process and adapt raw zones into rich spatial blueprints
  const processedZones = useMemo<ProcessedZone[]>(() => {
    const flattened = flattenZoneInstances(zones || []);

    const defaultTemplateKeys = propertyType === 'apartment'
      ? ['apt.reception', 'apt.master_bed', 'apt.kitchen', 'apt.main_bath', 'apt.balcony']
      : [
          'vil.g.reception', 'vil.g.entrance', 'vil.g.dining', 'vil.g.kitchen', 'vil.g.powder_room',
          'vil.f.master_suite', 'vil.f.master_bath', 'vil.f.std_bed', 'vil.f.family_room',
          'vil.r.terrace', 'vil.r.guest_suite',
          'vil.b.garage', 'vil.b.game_room'
        ];

    const sourceList = (flattened.length > 0)
      ? flattened
      : defaultTemplateKeys.map((key, i) => ({
          id: `default-${i}-${key}`,
          zone_template_id: key,
          sort_order: i,
          trades: []
        } as ZoneInstance));

    return sourceList.map((zInst, idx) => {
      const key = zInst.zone_template_id;
      const titles = ZONE_TITLES[key] || { 
        en: zInst.instance_label || key.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Curated Suite',
        ar: zInst.instance_label || 'مساحة معمارية منتقاة'
      };

      const metrics = ZONE_METRICS[key] || {
        sqm: GENERIC_ZONE_METRIC.sqm,
        ceiling: GENERIC_ZONE_METRIC.ceiling,
        dims: `${GENERIC_ZONE_METRIC.length_m}m × ${GENERIC_ZONE_METRIC.width_m}m`,
      };

      // Determine Floor Key and Labels
      let floorKey = 'ground';
      let floorLabel = 'Ground Level';
      let floorLabelAr = 'الطابق الأرضي';

      if (key.includes('.f.') || key.includes('master') || key.includes('std_bed') || key.includes('family')) {
        floorKey = 'first';
        floorLabel = 'First Level';
        floorLabelAr = 'الطابق الأول';
      } else if (key.includes('.r.') || key.includes('roof') || key.includes('terrace')) {
        floorKey = 'roof';
        floorLabel = 'Sky Terrace & Roof';
        floorLabelAr = 'الرووف والتراس البانورامي';
      } else if (key.includes('.b.') || key.includes('garage') || key.includes('game') || key.includes('driver')) {
        floorKey = 'basement';
        floorLabel = 'Basement & Garage';
        floorLabelAr = 'البدروم والجراج الخاص';
      } else if (key.includes('exterior')) {
        floorKey = 'exterior';
        floorLabel = 'Private Grounds';
        floorLabelAr = 'الحدائق والمحيط الخارجي';
      }

      return {
        id: zInst.id || `zone-${idx}-${key}`,
        zoneKey: key,
        floorKey,
        floorLabel,
        floorLabelAr,
        zoneTitle: titles.en,
        zoneTitleAr: titles.ar,
        image: resolveSpaceImage(key, zInst.images?.[0]),
        imagesList: (zInst.images ?? []).filter(Boolean),
        badge: getZoneBadge(zInst),
        sqm: zInst.spatial?.sqm || metrics.sqm,
        ceiling: zInst.spatial?.ceiling_height || metrics.ceiling,
        dims: zInst.spatial ? `${zInst.spatial.length_m}m × ${zInst.spatial.width_m}m` : metrics.dims,
        spatial: zInst.spatial,
        svgCoords: { x: 0, y: 0, w: 0, h: 0, pinX: 0, pinY: 0 },
        trades: parseTradeInstances(zInst)
      };
    });
  }, [zones, propertyType]);

  // Unique floors ordered logically
  const availableFloors = useMemo(() => {
    const floorOrder = ['ground', 'first', 'roof', 'basement', 'exterior'];
    const map = new Map<string, { key: string; label: string; labelAr: string; count: number }>();

    processedZones.forEach(z => {
      if (!map.has(z.floorKey)) {
        map.set(z.floorKey, {
          key: z.floorKey,
          label: z.floorLabel,
          labelAr: z.floorLabelAr,
          count: 1
        });
      } else {
        map.get(z.floorKey)!.count++;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const idxA = floorOrder.indexOf(a.key);
      const idxB = floorOrder.indexOf(b.key);
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    });
  }, [processedZones]);

  // Active Floor initialized to the first logical floor (e.g. Ground Level)
  const [activeFloor, setActiveFloor] = useState<string>(() => {
    return availableFloors[0]?.key || 'ground';
  });

  // Sync active floor if property zones change
  useEffect(() => {
    if (availableFloors.length > 0 && !availableFloors.some(f => f.key === activeFloor)) {
      setActiveFloor(availableFloors[0].key);
    }
  }, [availableFloors, activeFloor]);

  // Filtered & Architecturally-laid-out zones for Active Floor
  const displayedZones = useMemo(() => {
    const currentFloorKey = activeFloor || (availableFloors[0]?.key ?? 'ground');
    const floorZones = processedZones.filter(z => z.floorKey === currentFloorKey);
    const baseList = floorZones.length > 0 ? floorZones : processedZones;

    return computeArchitecturalLayout(baseList);
  }, [processedZones, activeFloor, availableFloors]);

  // Active list of rooms on currently selected floor
  const activeRoomList = displayedZones;

  // Active Zone (defaults to first room of currently active floor)
  const currentZone = useMemo<ProcessedZone>(() => {
    if (selectedZoneId) {
      const found = displayedZones.find(z => z.id === selectedZoneId);
      if (found) return found;
    }
    return displayedZones[0] || processedZones[0];
  }, [selectedZoneId, displayedZones, processedZones]);

  // Current room index in active room list
  const currentRoomIndex = useMemo(() => {
    const idx = activeRoomList.findIndex(z => z.id === currentZone.id);
    return idx >= 0 ? idx : 0;
  }, [activeRoomList, currentZone]);

  const pillsBarRef = useRef<HTMLDivElement>(null);
  const filmstripTrackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updatePillsScrollState = () => {
    if (!pillsBarRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = pillsBarRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  useEffect(() => {
    updatePillsScrollState();
    const el = pillsBarRef.current;
    if (el) {
      el.addEventListener('scroll', updatePillsScrollState, { passive: true });
      window.addEventListener('resize', updatePillsScrollState);
      return () => {
        el.removeEventListener('scroll', updatePillsScrollState);
        window.removeEventListener('resize', updatePillsScrollState);
      };
    }
  }, [activeRoomList, activeFloor]);

  // Automatically center active chip when selected
  useEffect(() => {
    if (pillsBarRef.current && currentZone?.id) {
      const activeBtn = pillsBarRef.current.querySelector('.room-chip-btn.active') as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
    if (filmstripTrackRef.current && currentZone?.id) {
      const activeThumb = filmstripTrackRef.current.querySelector('.filmstrip-thumb-card.active') as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedZoneId, activeFloor, currentZone?.id]);

  const handleHorizontalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  const handleScrollPills = (direction: 'left' | 'right') => {
    if (!pillsBarRef.current) return;
    const offset = direction === 'left' ? -240 : 240;
    pillsBarRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handlePrevRoom = () => {
    if (activeRoomList.length <= 1) return;
    const prevIdx = (currentRoomIndex - 1 + activeRoomList.length) % activeRoomList.length;
    setSelectedZoneId(activeRoomList[prevIdx].id);
  };

  const handleNextRoom = () => {
    if (activeRoomList.length <= 1) return;
    const nextIdx = (currentRoomIndex + 1) % activeRoomList.length;
    setSelectedZoneId(activeRoomList[nextIdx].id);
  };

  const handleInquireSpace = () => {
    const text = `Hello, I would like to inquire about the ${currentZone.zoneTitle} (${currentZone.sqm} SQM) in ${propertyTitle}.`;
    window.location.href = `https://wa.me/201009998888?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="blueprint-studio-root" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* 1. Header Bar */}
      <div className="studio-top-header">
        <div className="studio-title-block">
          <span className="studio-eyebrow">
            <Sparkles size={13} className="sparkle-gold" />
            <span>
              {isAr 
                ? `${processedZones.length} مساحات معمارية مدققة • ${availableFloors.length} مستويات` 
                : `${processedZones.length} CURATED ARCHITECTURAL SPACES • ${availableFloors.length} LEVELS`}
            </span>
          </span>
          <h3 className="studio-main-heading">
            {isAr ? 'المخطط المعماري التفاعلي وملف المواصفات' : 'Interactive Blueprint & Engineering Dossier'}
          </h3>
        </div>

        <button 
          className="studio-print-btn"
          onClick={() => window.print()}
          type="button"
          title="Export Complete Specification Dossier"
        >
          <FileText size={15} />
          <span>{isAr ? 'طباعة كراسة المواصفات (PDF)' : 'Export Complete Dossier (PDF)'}</span>
        </button>
      </div>

      {/* 2. Floor Level Selector Tabs */}
      <div className="studio-floor-tabs-bar" onWheel={handleHorizontalWheel}>
        {availableFloors.map((floor) => {
          const isSelected = activeFloor === floor.key;
          return (
            <button
              key={floor.key}
              className={`studio-floor-tab ${isSelected ? 'active' : ''}`}
              onClick={() => {
                setActiveFloor(floor.key);
                const firstOnFloor = processedZones.find(z => z.floorKey === floor.key);
                if (firstOnFloor) setSelectedZoneId(firstOnFloor.id);
              }}
              type="button"
            >
              <Building size={14} className="tab-icon" />
              <span>{isAr ? floor.labelAr : floor.label}</span>
              <span className="floor-count-pill">{floor.count}</span>
              {isSelected && (
                <motion.div 
                  layoutId="activeFloorIndicator" 
                  className="tab-active-indicator"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Room Quick Select Pills (1:1 with Active Floor's Rooms) with Smooth Scrolling */}
      <div className="studio-room-pills-wrapper">
        {canScrollLeft && (
          <button 
            className="pills-scroll-btn scroll-left" 
            onClick={() => handleScrollPills(isAr ? 'right' : 'left')}
            type="button"
            aria-label="Scroll Left"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <div 
          ref={pillsBarRef}
          className="studio-room-pills-bar"
          onWheel={handleHorizontalWheel}
        >
          {activeRoomList.map((zone, idx) => {
            const isActive = currentZone.id === zone.id;
            return (
              <button
                key={zone.id}
                className={`room-chip-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedZoneId(zone.id)}
                onMouseEnter={() => setHoveredZoneId(zone.id)}
                onMouseLeave={() => setHoveredZoneId(null)}
                type="button"
              >
                <span className="room-num-badge">0{idx + 1}</span>
                <span className="room-chip-title">{isAr ? zone.zoneTitleAr : zone.zoneTitle}</span>
                <span className="room-chip-sqm">{zone.sqm} m²</span>
              </button>
            );
          })}
        </div>

        {canScrollRight && (
          <button 
            className="pills-scroll-btn scroll-right" 
            onClick={() => handleScrollPills(isAr ? 'left' : 'right')}
            type="button"
            aria-label="Scroll Right"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* 4. Panoramic Stacked Workspace: Full-Width Visual Stage + Full-Width Live Dossier */}
      <div className="studio-workspace-container">
        
        {/* Top Panoramic Visual Stage */}
        <div className="studio-stage-pane">
          
          {/* Top Stage Control Bar */}
          <div className="stage-controls-bar">
            {/* Mode Switcher */}
            <div className="stage-mode-switcher">
              <button
                className={`mode-switch-btn ${canvasMode === 'blueprint' ? 'active' : ''}`}
                onClick={() => setCanvasMode('blueprint')}
                type="button"
              >
                <Layers size={14} />
                <span>{isAr ? 'المخطط الهندسي (CAD)' : 'CAD Blueprint'}</span>
              </button>

              <button
                className={`mode-switch-btn ${canvasMode === 'photo' ? 'active' : ''}`}
                onClick={() => setCanvasMode('photo')}
                type="button"
              >
                <Camera size={14} />
                <span>{isAr ? 'الواقع المعماري' : 'Spatial Photo'}</span>
              </button>
            </div>

            {/* Architectural Compass, Interactive Zoom & Metrology */}
            <div className="stage-metrology-row">
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
                  title="Reset Zoom & Pan (100%)"
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
              <div className="metrology-divider" />
              <div className="metrology-tag">
                <Compass size={13} className="compass-icon" />
                <span>N 32° W</span>
              </div>
              <div className="metrology-divider" />
              <div className="metrology-tag">
                <span>SCALE 1:50</span>
              </div>
            </div>
          </div>

          {/* Main Visual Display Stage */}
          <div className="stage-viewport-box">
            
            <AnimatePresence mode="wait">
              {canvasMode === 'blueprint' ? (
                /* Interactive CAD Vector Schematic */
                <motion.div 
                  key={`blueprint-${activeFloor}`}
                  className="blueprint-svg-canvas"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.28 }}
                >
                  <svg 
                    viewBox="0 0 680 440" 
                    className="cad-vector-svg"
                    xmlns="http://www.w3.org/2000/svg"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleSvgWheel}
                    style={{ cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default'), userSelect: 'none' }}
                  >
                    <defs>
                      <pattern id="cadGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" className="cad-grid-pattern-line" strokeWidth="0.4" />
                      </pattern>
                      <pattern id="cadGridMajor" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" className="cad-grid-major-line" strokeWidth="0.8" />
                      </pattern>
                      <filter id="goldGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#DDA752" floodOpacity="0.7" />
                      </filter>
                    </defs>

                    {/* ── 1. Fine Background Engineering Grid ── */}
                    <rect width="680" height="440" fill="url(#cadGrid)" />
                    <rect width="680" height="440" fill="url(#cadGridMajor)" opacity="0.35" />

                    {/* ── 2. Scalable & Pannable Floor Plan Interactive Group ── */}
                    <g 
                      transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} 
                      style={{ transformOrigin: '340px 220px', transition: isDragging ? 'none' : 'transform 0.15s ease-out' }}
                    >

                    {/* ── 2. Building Outer Perimeter Enclosure (Double Structural Walls) ── */}
                    {displayedZones.length > 0 && (() => {
                      const minX = Math.min(...displayedZones.map(z => z.svgCoords.x));
                      const maxX = Math.max(...displayedZones.map(z => z.svgCoords.x + z.svgCoords.w));
                      const minY = Math.min(...displayedZones.map(z => z.svgCoords.y));
                      const maxY = Math.max(...displayedZones.map(z => z.svgCoords.y + z.svgCoords.h));
                      return (
                        <g className="cad-structural-perimeter">
                          {/* Exterior Outer Wall */}
                          <rect
                            x={minX}
                            y={minY}
                            width={maxX - minX}
                            height={maxY - minY}
                            fill="none"
                            stroke="#DDA752"
                            strokeWidth="3.5"
                            rx="2"
                          />
                          {/* Cavity Inner Line */}
                          <rect
                            x={minX + 3}
                            y={minY + 3}
                            width={maxX - minX - 6}
                            height={maxY - minY - 6}
                            fill="none"
                            stroke="rgba(221, 167, 82, 0.4)"
                            strokeWidth="1"
                            rx="1"
                          />
                        </g>
                      );
                    })()}

                    {/* ── 3. Interior Partition Walls Between Adjacent Rooms ── */}
                    {displayedZones.map((zone) => {
                      const { x, y, w, h } = zone.svgCoords;
                      return (
                        <g key={`walls-${zone.id}`} className="cad-partition-lines">
                          {/* Right partition wall */}
                          <line x1={x + w} y1={y} x2={x + w} y2={y + h} stroke="#DDA752" strokeWidth="2.5" opacity="0.8" />
                          {/* Bottom partition wall */}
                          <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke="#DDA752" strokeWidth="2.5" opacity="0.8" />
                        </g>
                      );
                    })}

                    {/* ── 4. Architectural Window Glazing & Patio Sliders (Embedded in Outer Walls) ── */}
                    {displayedZones.length > 0 && (() => {
                      const minX = Math.min(...displayedZones.map(z => z.svgCoords.x));
                      const maxX = Math.max(...displayedZones.map(z => z.svgCoords.x + z.svgCoords.w));
                      const minY = Math.min(...displayedZones.map(z => z.svgCoords.y));
                      const maxY = Math.max(...displayedZones.map(z => z.svgCoords.y + z.svgCoords.h));
                      return (
                        <g className="cad-exterior-glazing">
                          {/* Reception East Facade: Sliding Glass Patio Doors */}
                          <rect x={maxX - 3} y={minY + 30} width={6} height={120} rx="1" fill="rgba(96, 165, 250, 0.3)" stroke="#60A5FA" strokeWidth="1" />
                          <line x1={maxX} y1={minY + 32} x2={maxX} y2={minY + 148} stroke="#93C5FD" strokeWidth="1.2" />

                          {/* Dining South Facade: Panoramic Window */}
                          <rect x={minX + 35} y={maxY - 3} width={130} height={6} rx="1" fill="rgba(96, 165, 250, 0.3)" stroke="#60A5FA" strokeWidth="1" />
                          <line x1={minX + 38} y1={maxY} x2={minX + 162} y2={maxY} stroke="#93C5FD" strokeWidth="1.2" />

                          {/* Kitchen South-East Facade: Garden Vista Window */}
                          <rect x={maxX - 130} y={maxY - 3} width={95} height={6} rx="1" fill="rgba(96, 165, 250, 0.3)" stroke="#60A5FA" strokeWidth="1" />
                          <line x1={maxX - 127} y1={maxY} x2={maxX - 38} y2={maxY} stroke="#93C5FD" strokeWidth="1.2" />
                        </g>
                      );
                    })()}

                    {/* ── 5. Interactive Room Polygons & Luxury Architectural Layouts ── */}
                    {displayedZones.map((zone) => {
                      const { x, y, w, h, pinX, pinY } = zone.svgCoords;
                      const isSelected = currentZone.id === zone.id;
                      const isHovered = hoveredZoneId === zone.id;
                      const key = zone.zoneKey.toLowerCase();

                      return (
                        <g
                          key={zone.id}
                          className="interactive-cad-room"
                          onClick={() => setSelectedZoneId(zone.id)}
                          onMouseEnter={() => setHoveredZoneId(zone.id)}
                          onMouseLeave={() => setHoveredZoneId(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Room Floor Fill Area */}
                          <rect
                            x={x + 2}
                            y={y + 2}
                            width={w - 4}
                            height={h - 4}
                            className={`cad-room-fill ${isSelected ? 'selected' : ''}`}
                            filter={isSelected ? 'url(#goldGlowFilter)' : undefined}
                          />

                          {/* ② Clean, Intuitive Luxury Space Symbol Badge */}
                          <g transform={`translate(${pinX}, ${pinY - (h > 100 ? 16 : 10)})`} className="cad-room-symbol-badge">
                            {/* Living / Reception / Salon: Modern Sofa */}
                            {(key.includes('reception') || key.includes('living') || key.includes('salon') || key.includes('lounge') || key.includes('family')) && (
                              <g>
                                <rect x="-16" y="-16" width="32" height="32" rx="8" fill={isSelected ? "rgba(221,167,82,0.22)" : "rgba(221,167,82,0.08)"} stroke="#DDA752" strokeWidth={isSelected ? "1.6" : "1.2"} />
                                <path d="M -9 -4 C -9 -8, 9 -8, 9 -4 L 9 4 L -9 4 Z" fill="none" stroke="#DDA752" strokeWidth="1.3" strokeLinejoin="round" />
                                <rect x="-11" y="-4" width="3" height="9" rx="1.5" fill="#DDA752" />
                                <rect x="8" y="-4" width="3" height="9" rx="1.5" fill="#DDA752" />
                                <line x1="0" y1="-4" x2="0" y2="4" stroke="#DDA752" strokeWidth="1" />
                                <line x1="-8" y1="5" x2="8" y2="5" stroke="#DDA752" strokeWidth="1.3" />
                                <line x1="-7" y1="5" x2="-8" y2="8" stroke="#DDA752" strokeWidth="1.2" />
                                <line x1="7" y1="5" x2="8" y2="8" stroke="#DDA752" strokeWidth="1.2" />
                              </g>
                            )}

                            {/* Formal Dining Salon: Table & Utensils */}
                            {key.includes('dining') && (
                              <g>
                                <rect x="-16" y="-16" width="32" height="32" rx="8" fill={isSelected ? "rgba(221,167,82,0.22)" : "rgba(221,167,82,0.08)"} stroke="#DDA752" strokeWidth={isSelected ? "1.6" : "1.2"} />
                                <path d="M -6 -7 L -6 -1 M -8 -7 L -8 -3 C -8 -1 -6 -1 -6 -1 M -4 -7 L -4 -3 C -4 -1 -6 -1 -6 -1 M -6 -1 L -6 7" fill="none" stroke="#DDA752" strokeWidth="1.1" strokeLinecap="round" />
                                <path d="M 6 -7 C 6 -7 3 -3 3 1 L 3 7 M 6 -7 L 6 7" fill="none" stroke="#DDA752" strokeWidth="1.1" strokeLinecap="round" />
                                <circle cx="0" cy="0" r="4.5" fill="none" stroke="#DDA752" strokeWidth="1.1" />
                              </g>
                            )}

                            {/* Chef Show Kitchen & Pantry: Chef Hat & Cookware */}
                            {key.includes('kitchen') && (
                              <g>
                                <rect x="-16" y="-16" width="32" height="32" rx="8" fill={isSelected ? "rgba(221,167,82,0.22)" : "rgba(221,167,82,0.08)"} stroke="#DDA752" strokeWidth={isSelected ? "1.6" : "1.2"} />
                                <path d="M -5 3 L 5 3 L 5 0 C 7 0 8 -3 6 -5 C 7 -8 3 -9 0 -7 C -2 -9 -7 -8 -6 -5 C -8 -3 -7 0 -5 0 Z" fill="none" stroke="#DDA752" strokeWidth="1.2" strokeLinejoin="round" />
                                <line x1="-5" y1="4" x2="5" y2="4" stroke="#DDA752" strokeWidth="1.2" />
                                <line x1="-5" y1="6" x2="5" y2="6" stroke="#DDA752" strokeWidth="1.2" />
                              </g>
                            )}

                            {/* Guest Powder Room & Spa: Bathtub & Spa Droplets */}
                            {(key.includes('bath') || key.includes('powder') || key.includes('spa')) && (
                              <g>
                                <rect x="-16" y="-16" width="32" height="32" rx="8" fill={isSelected ? "rgba(221,167,82,0.22)" : "rgba(221,167,82,0.08)"} stroke="#DDA752" strokeWidth={isSelected ? "1.6" : "1.2"} />
                                <path d="M -8 -1 L 8 -1 C 8 -1 8 5 5 5 L -5 5 C -8 5 -8 -1 -8 -1 Z" fill="none" stroke="#DDA752" strokeWidth="1.2" strokeLinejoin="round" />
                                <path d="M -6 -1 L -6 -6 C -6 -8 -3 -8 -3 -6" fill="none" stroke="#DDA752" strokeWidth="1.1" />
                                <circle cx="-2.5" cy="-3.5" r="0.7" fill="#DDA752" />
                                <circle cx="-0.5" cy="-2.5" r="0.7" fill="#DDA752" />
                                <line x1="-5" y1="5" x2="-6" y2="7" stroke="#DDA752" strokeWidth="1.1" />
                                <line x1="5" y1="5" x2="6" y2="7" stroke="#DDA752" strokeWidth="1.1" />
                              </g>
                            )}

                            {/* Entrance Foyer: Grand Portal Doors */}
                            {(key.includes('foyer') || key.includes('entrance') || key.includes('hall')) && (
                              <g>
                                <rect x="-16" y="-16" width="32" height="32" rx="8" fill={isSelected ? "rgba(221,167,82,0.22)" : "rgba(221,167,82,0.08)"} stroke="#DDA752" strokeWidth={isSelected ? "1.6" : "1.2"} />
                                <rect x="-7" y="-8" width="14" height="15" rx="1" fill="none" stroke="#DDA752" strokeWidth="1.2" />
                                <line x1="0" y1="-8" x2="0" y2="7" stroke="#DDA752" strokeWidth="1" />
                                <circle cx="-2" cy="0" r="0.9" fill="#DDA752" />
                                <circle cx="2" cy="0" r="0.9" fill="#DDA752" />
                                <path d="M -7 -8 Q 0 -11 7 -8" fill="none" stroke="#DDA752" strokeWidth="1" />
                              </g>
                            )}

                            {/* Master Suite & Bedrooms: Luxury Bed */}
                            {(key.includes('bed') || key.includes('master') || key.includes('suite')) && !key.includes('bath') && (
                              <g>
                                <rect x="-16" y="-16" width="32" height="32" rx="8" fill={isSelected ? "rgba(221,167,82,0.22)" : "rgba(221,167,82,0.08)"} stroke="#DDA752" strokeWidth={isSelected ? "1.6" : "1.2"} />
                                <line x1="-8" y1="-5" x2="8" y2="-5" stroke="#DDA752" strokeWidth="1.3" strokeLinecap="round" />
                                <rect x="-6" y="-4" width="4.5" height="2.5" rx="0.8" fill="none" stroke="#DDA752" strokeWidth="0.9" />
                                <rect x="1.5" y="-4" width="4.5" height="2.5" rx="0.8" fill="none" stroke="#DDA752" strokeWidth="0.9" />
                                <path d="M -7 0 L 7 0 L 7 5 L -7 5 Z" fill="none" stroke="#DDA752" strokeWidth="1.2" />
                                <line x1="-7" y1="2" x2="7" y2="2" stroke="#DDA752" strokeWidth="0.8" strokeDasharray="2 1" />
                                <line x1="-7" y1="5" x2="-7" y2="7" stroke="#DDA752" strokeWidth="1.1" />
                                <line x1="7" y1="5" x2="7" y2="7" stroke="#DDA752" strokeWidth="1.1" />
                              </g>
                            )}

                            {/* Private Grounds / Pool / Terrace: Waves & Sun */}
                            {(key.includes('pool') || key.includes('garden') || key.includes('exterior') || key.includes('terrace') || key.includes('roof')) && (
                              <g>
                                <rect x="-16" y="-16" width="32" height="32" rx="8" fill={isSelected ? "rgba(221,167,82,0.22)" : "rgba(221,167,82,0.08)"} stroke="#DDA752" strokeWidth={isSelected ? "1.6" : "1.2"} />
                                <path d="M -7 -2 Q -3.5 -5 0 -2 Q 3.5 1 7 -2" fill="none" stroke="#DDA752" strokeWidth="1.3" strokeLinecap="round" />
                                <path d="M -7 3 Q -3.5 0 0 3 Q 3.5 6 7 3" fill="none" stroke="#DDA752" strokeWidth="1.3" strokeLinecap="round" />
                              </g>
                            )}
                          </g>

                          {/* Dimension Stamp (Non-Overlapping Position in Top-Left) */}
                          <text
                            x={x + 8}
                            y={y + 14}
                            className="cad-room-dims"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            {zone.dims}
                          </text>

                          {/* Room Name with Smart Multi-line Fitting */}
                          {w < 130 && !isAr && zone.zoneTitle.includes('&') ? (
                            <text
                              x={pinX}
                              y={y + h - 28}
                              className="cad-room-title"
                              fontSize="8.5"
                              textAnchor="middle"
                              fontFamily="'Plus Jakarta Sans', sans-serif"
                              fontWeight="800"
                            >
                              <tspan x={pinX} dy="0">{zone.zoneTitle.split('&')[0].trim()}</tspan>
                              <tspan x={pinX} dy="10">& {zone.zoneTitle.split('&')[1].trim()}</tspan>
                            </text>
                          ) : (
                            <text
                              x={pinX}
                              y={y + h - 22}
                              className="cad-room-title"
                              fontSize={w < 120 ? '8.5' : (w > 160 ? '11' : '10')}
                              textAnchor="middle"
                              fontFamily="'Plus Jakarta Sans', sans-serif"
                              fontWeight="800"
                            >
                              {isAr ? zone.zoneTitleAr : zone.zoneTitle}
                            </text>
                          )}

                          {/* SQM Badge */}
                          <text
                            x={pinX}
                            y={y + h - 9}
                            className="cad-room-sqm"
                            fontSize="9"
                            textAnchor="middle"
                            fontFamily="'Plus Jakarta Sans', sans-serif"
                            fontWeight="800"
                          >
                            {zone.sqm} SQM
                          </text>

                          {/* Pulsating Hotspot Beacon */}
                          {isSelected && (
                            <g>
                              <circle cx={pinX} cy={pinY} r={13} fill="rgba(221, 167, 82, 0.18)" className="beacon-ring-ping" />
                              <circle cx={pinX} cy={pinY} r={4.5} fill="#DDA752" stroke="#FFFFFF" strokeWidth="1.8" className="beacon-dot-live" />
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* ── 6. Structural Column Grid Coordinates (Outside Perimeter) ── */}
                    {displayedZones.length > 0 && (() => {
                      const minX = Math.min(...displayedZones.map(z => z.svgCoords.x));
                      const maxX = Math.max(...displayedZones.map(z => z.svgCoords.x + z.svgCoords.w));
                      const minY = Math.min(...displayedZones.map(z => z.svgCoords.y));
                      const maxY = Math.max(...displayedZones.map(z => z.svgCoords.y + z.svgCoords.h));
                      const cols = ['A', 'B', 'C', 'D'];
                      const rows = ['1', '2', '3'];
                      const colStep = (maxX - minX) / 3;
                      const rowStep = (maxY - minY) / 2;
                      return (
                        <g opacity="0.45" className="cad-grid-axes">
                          {/* Column Bubbles along Top (Above building) */}
                          {cols.map((label, i) => {
                            const cx = minX + i * colStep;
                            return (
                              <g key={`col-${label}`}>
                                <line x1={cx} y1={minY - 16} x2={cx} y2={minY} stroke="rgba(221, 167, 82, 0.25)" strokeDasharray="3 3" strokeWidth="0.8" />
                                <circle cx={cx} cy={minY - 14} r="6.5" fill="rgba(10, 14, 24, 0.85)" stroke="#DDA752" strokeWidth="1" />
                                <text x={cx} y={minY - 11.5} fontSize="7" fill="#DDA752" textAnchor="middle" fontFamily="monospace" fontWeight="bold">{label}</text>
                              </g>
                            );
                          })}
                          {/* Row Bubbles along Left (Left of building) */}
                          {rows.map((label, i) => {
                            const cy = minY + i * rowStep;
                            return (
                              <g key={`row-${label}`}>
                                <line x1={minX - 16} y1={cy} x2={minX} y2={cy} stroke="rgba(221, 167, 82, 0.25)" strokeDasharray="3 3" strokeWidth="0.8" />
                                <circle cx={minX - 14} cy={cy} r="6.5" fill="rgba(10, 14, 24, 0.85)" stroke="#DDA752" strokeWidth="1" />
                                <text x={minX - 14} y={cy + 2.5} fontSize="7" fill="#DDA752" textAnchor="middle" fontFamily="monospace" fontWeight="bold">{label}</text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}

                    {/* ── 7. Architectural Graphic Scale Bar ── */}
                    <g transform="translate(40, 420)" opacity="0.65">
                      <line x1="0" y1="0" x2="80" y2="0" stroke="#DDA752" strokeWidth="1.5" />
                      <line x1="0" y1="-3" x2="0" y2="3" stroke="#DDA752" strokeWidth="1.5" />
                      <line x1="40" y1="-2" x2="40" y2="2" stroke="#DDA752" strokeWidth="1" />
                      <line x1="80" y1="-3" x2="80" y2="3" stroke="#DDA752" strokeWidth="1.5" />
                      <text x="0" y="10" fontSize="7" fill="#DDA752" fontFamily="monospace">0m</text>
                      <text x="36" y="10" fontSize="7" fill="#DDA752" fontFamily="monospace">5m</text>
                      <text x="74" y="10" fontSize="7" fill="#DDA752" fontFamily="monospace">10m</text>
                    </g>

                    {/* ── 8. North Orientation Arrow ── */}
                    <g transform="translate(642, 26)" opacity="0.75">
                      <polygon points="0,-10 4,5 0,2 -4,5" fill="#DDA752" />
                      <polygon points="0,10 4,-5 0,-2 -4,-5" fill="rgba(221, 167, 82, 0.25)" stroke="#DDA752" strokeWidth="0.6" />
                      <text x="0" y="18" fontSize="7.5" fill="#DDA752" textAnchor="middle" fontFamily="monospace" fontWeight="bold">N</text>
                    </g>
                  </g>
                </svg>
                </motion.div>

              ) : (
                /* High-Res Spatial Photography View with Interactive Carousel & Filmstrip */
                <motion.div 
                  key={`photo-${activeFloor}`}
                  className="photo-preview-stage"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.28 }}
                >
                  {(() => {
                    const gallery = currentZone.imagesList.length > 0 ? currentZone.imagesList : [currentZone.image];
                    const safeIdx = photoIndex % gallery.length;
                    return (
                      <>
                        <AnimatePresence mode="wait">
                          <motion.img
                            key={`${currentZone.id}-${safeIdx}`}
                            src={gallery[safeIdx]}
                            alt={currentZone.zoneTitle}
                            className="photo-preview-img"
                            initial={{ opacity: 0, scale: 1.03 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                          />
                        </AnimatePresence>

                        {gallery.length > 1 && (
                          <div className="zone-gallery-dots" role="tablist" aria-label={isAr ? 'صور الغرفة' : 'Room photos'}>
                            <button
                              type="button"
                              className="zone-gallery-arrow"
                              aria-label={isAr ? 'الصورة السابقة' : 'Previous photo'}
                              onClick={(e) => { e.stopPropagation(); setPhotoIndex((safeIdx - 1 + gallery.length) % gallery.length); }}
                            >
                              <ChevronLeft size={14} />
                            </button>
                            {gallery.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                role="tab"
                                aria-selected={i === safeIdx}
                                aria-label={`${isAr ? 'صورة' : 'Photo'} ${i + 1}`}
                                className={`zone-gallery-dot ${i === safeIdx ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                              />
                            ))}
                            <button
                              type="button"
                              className="zone-gallery-arrow"
                              aria-label={isAr ? 'الصورة التالية' : 'Next photo'}
                              onClick={(e) => { e.stopPropagation(); setPhotoIndex((safeIdx + 1) % gallery.length); }}
                            >
                              <ChevronRight size={14} />
                            </button>
                            <span className="zone-gallery-counter" dir="ltr">{safeIdx + 1}/{gallery.length}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="photo-preview-vignette" />

                  {/* Top Metadata Bar */}
                  <div className="photo-top-meta-bar">
                    <div className="photo-vista-badge">
                      <Sparkles size={12} className="sparkle-gold" />
                      <span>{isAr ? currentZone.zoneTitleAr : currentZone.zoneTitle} • 4K ARCHITECTURAL CAPTURE</span>
                    </div>

                    <div className="photo-counter-badge">
                      <span>{currentRoomIndex + 1} / {activeRoomList.length}</span>
                    </div>
                  </div>

                  {/* Carousel Left / Right Arrows */}
                  {activeRoomList.length > 1 && (
                    <>
                      <button 
                        className="photo-nav-arrow arrow-left" 
                        onClick={(e) => { e.stopPropagation(); handlePrevRoom(); }}
                        type="button"
                        aria-label="Previous Room"
                      >
                        <ChevronLeft size={22} />
                      </button>

                      <button 
                        className="photo-nav-arrow arrow-right" 
                        onClick={(e) => { e.stopPropagation(); handleNextRoom(); }}
                        type="button"
                        aria-label="Next Room"
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  )}

                  {/* Bottom Floating Room Thumbnail Filmstrip */}
                  <div className="photo-filmstrip-container">
                    <div 
                      ref={filmstripTrackRef}
                      className="photo-filmstrip-track"
                      onWheel={handleHorizontalWheel}
                    >
                      {activeRoomList.map((zone, idx) => {
                        const isCurrent = zone.id === currentZone.id;
                        return (
                          <button
                            key={zone.id}
                            className={`filmstrip-thumb-card ${isCurrent ? 'active' : ''}`}
                            onClick={() => setSelectedZoneId(zone.id)}
                            type="button"
                          >
                            <div className="thumb-img-box">
                              <img src={zone.image} alt={zone.zoneTitle} className="thumb-img" />
                              <span className="thumb-num-badge">0{idx + 1}</span>
                            </div>
                            <div className="thumb-meta">
                              <span className="thumb-title">{isAr ? zone.zoneTitleAr : zone.zoneTitle}</span>
                              <span className="thumb-sqm">{zone.sqm} m²</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Bottom Full-Width Live Specifications Dossier Pane */}
        <div className="studio-dossier-pane">
          
          {/* Active Space Hero Header Card */}
          <div className="dossier-space-header">
            <div className="dossier-header-left">
              <div className="dossier-badge-row">
                <span className="dossier-floor-badge">
                  <Building size={13} />
                  <span>{isAr ? currentZone.floorLabelAr : currentZone.floorLabel}</span>
                </span>

                <span className="dossier-verified-badge">
                  <ShieldCheck size={13} />
                  <span>{isAr ? 'أصل مدقق بالكامل' : '100% Verified Specifications'}</span>
                </span>

                {currentZone.badge !== 'unknown' && (() => {
                  const tier = TIER_BADGES[currentZone.badge];
                  return (
                    <span
                      className="dossier-tier-badge"
                      style={{ color: tier.color, background: tier.bg, borderColor: tier.color }}
                    >
                      <span className="tier-dot" style={{ background: tier.color }} />
                      <span>{isAr ? tier.ar : tier.en}</span>
                    </span>
                  );
                })()}
              </div>

              <h4 className="dossier-space-title">
                {isAr ? currentZone.zoneTitleAr : currentZone.zoneTitle}
              </h4>
            </div>

            {/* Quick Metrics Bar */}
            <div className="dossier-metrics-strip">
              <div className="dossier-metric-item">
                <span className="metric-lbl">{isAr ? 'مساحة المسطح' : 'BUILT-UP AREA'}</span>
                <span className="metric-val">{currentZone.sqm} SQM</span>
              </div>
              <div className="metric-v-sep" />
              <div className="dossier-metric-item">
                <span className="metric-lbl">{isAr ? 'ارتفاع السقف' : 'CEILING HEIGHT'}</span>
                <span className="metric-val">{currentZone.ceiling}</span>
              </div>
              <div className="metric-v-sep" />
              <div className="dossier-metric-item">
                <span className="metric-lbl">{isAr ? 'الأبعاد المعمارية' : 'DIMENSIONS'}</span>
                <span className="metric-val">{currentZone.dims}</span>
              </div>
            </div>
          </div>

          {/* Trade Specifications Matrix Grid (2 Columns on Desktop) */}
          <div className="dossier-trades-container">
            <span className="trades-section-eyebrow">
              {isAr ? 'البنود والأنظمة الهندسية المعتمدة لهذا الجناح' : 'ENGINEERED SYSTEMS & MATERIAL SPECIFICATIONS'}
            </span>

            <div className="system-filter-strip" role="tablist" aria-label={isAr ? 'تصفية حسب النظام' : 'Filter by system'}>
              {SYSTEM_FILTERS.map(sf => {
                const count = sf.key === 'all'
                  ? currentZone.trades.length
                  : currentZone.trades.filter(t => systemOf(t) === sf.key).length;
                if (sf.key !== 'all' && count === 0) return null;
                return (
                  <button
                    key={sf.key}
                    type="button"
                    role="tab"
                    aria-selected={systemFilter === sf.key}
                    className={`system-filter-pill ${systemFilter === sf.key ? 'active' : ''}`}
                    onClick={() => setSystemFilter(sf.key)}
                  >
                    <span>{isAr ? sf.ar : sf.en}</span>
                    <span className="system-pill-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="dossier-trades-grid">
              {currentZone.trades.filter(t => systemFilter === 'all' || systemOf(t) === systemFilter).map((trade) => {
                const Icon = trade.icon === 'zap' ? Zap : trade.icon === 'wind' ? Wind : trade.icon === 'droplet' ? Droplet : Layers;
                return (
                  <div key={trade.id} className="trade-spec-card">
                    <div className="trade-spec-icon-box">
                      <Icon size={18} className="trade-icon" />
                    </div>

                    <div className="trade-spec-info">
                      <div className="trade-spec-title-row">
                        <span className="trade-name">{isAr ? trade.nameAr : trade.name}</span>
                        <span className="trade-status-pill">
                          <Check size={11} strokeWidth={3} />
                          <span>{isAr ? trade.badgeAr : trade.badge}</span>
                        </span>
                      </div>
                      <p className="trade-spec-desc">{isAr ? trade.specAr : trade.spec}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dossier Footer Actions */}
          <div className="dossier-footer-actions">
            <button 
              className="dossier-inquire-btn"
              onClick={handleInquireSpace}
              type="button"
            >
              <MessageSquare size={16} />
              <span>{isAr ? 'استفسار فوري عن هذا الجناح' : 'Inquire About This Space'}</span>
            </button>
          </div>

        </div>

      </div>

      <style>{`
        .blueprint-studio-root {
          margin-bottom: 4rem;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .dossier-tier-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          border: 1px solid;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .tier-dot {
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          flex-shrink: 0;
        }

        .system-filter-strip {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin: 0.75rem 0 1rem;
        }

        .system-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(221, 167, 82, 0.18);
          color: rgba(237, 232, 221, 0.6);
          transition: color 0.15s cubic-bezier(0.2,0,0,1), border-color 0.15s cubic-bezier(0.2,0,0,1), background-color 0.15s cubic-bezier(0.2,0,0,1);
        }

        .system-filter-pill:hover { color: #EDE8DD; border-color: rgba(221, 167, 82, 0.45); }

        .system-filter-pill.active {
          background: rgba(221, 167, 82, 0.12);
          border-color: #DDA752;
          color: #DDA752;
        }

        .system-pill-count {
          font-family: monospace;
          font-variant-numeric: tabular-nums;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 1px 7px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.07);
        }

        .system-filter-pill.active .system-pill-count { background: rgba(221, 167, 82, 0.22); }

        [data-theme="light"] .system-filter-pill {
          background: #FFFFFF;
          border-color: rgba(184, 134, 11, 0.25);
          color: rgba(28, 26, 22, 0.6);
        }

        [data-theme="light"] .system-filter-pill.active {
          background: rgba(184, 134, 11, 0.1);
          border-color: #B8860B;
          color: #B8860B;
        }

        .zone-gallery-dots {
          position: absolute;
          inset-block-end: 96px;
          inset-inline-start: 50%;
          transform: translateX(-50%);
          z-index: 8;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          border-radius: 9999px;
          background: rgba(10, 14, 24, 0.72);
          border: 1px solid rgba(221, 167, 82, 0.3);
          backdrop-filter: blur(8px);
        }

        [dir="rtl"] .zone-gallery-dots { transform: translateX(50%); }

        .zone-gallery-dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          border: none;
          padding: 0;
          cursor: pointer;
          background: rgba(237, 232, 221, 0.35);
          transition: background-color 0.15s cubic-bezier(0.2,0,0,1), transform 0.15s cubic-bezier(0.2,0,0,1);
        }

        .zone-gallery-dot.active { background: #DDA752; transform: scale(1.25); }

        .zone-gallery-arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          background: rgba(221, 167, 82, 0.16);
          color: #DDA752;
        }

        .zone-gallery-counter {
          font-family: monospace;
          font-variant-numeric: tabular-nums;
          font-size: 0.65rem;
          font-weight: 800;
          color: rgba(237, 232, 221, 0.75);
          padding-inline-start: 3px;
        }

        /* 1. Header Bar */
        .studio-top-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .studio-title-block {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .studio-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: var(--gold-primary, #DDA752);
          text-transform: uppercase;
        }

        [data-theme="light"] .studio-eyebrow {
          color: #B8860B;
        }

        .sparkle-gold {
          color: var(--gold-primary, #DDA752);
          filter: drop-shadow(0 0 6px rgba(221, 167, 82, 0.7));
        }

        .studio-main-heading {
          font-family: var(--font-heading);
          font-size: clamp(1.4rem, 2.2vw, 1.85rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          color: var(--text-primary, #FFFFFF);
          margin: 0;
        }

        .studio-print-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.6rem 1.15rem;
          border-radius: 9999px;
          font-family: var(--font-heading);
          font-size: 0.78125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(221, 167, 82, 0.1);
          border: 1px solid rgba(221, 167, 82, 0.35);
          color: var(--gold-primary, #DDA752);
        }

        .studio-print-btn:hover {
          background: rgba(221, 167, 82, 0.2);
          border-color: var(--gold-primary, #DDA752);
          transform: translateY(-1px);
        }

        /* 2. Floor Tabs Bar */
        .studio-floor-tabs-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 0.35rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          scrollbar-width: none;
        }

        .studio-floor-tabs-bar::-webkit-scrollbar {
          display: none;
        }

        [data-theme="light"] .studio-floor-tabs-bar {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.08);
        }

        .studio-floor-tab {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.55rem 1.05rem;
          border-radius: 12px;
          font-family: var(--font-heading);
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          background: transparent;
          border: none;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .studio-floor-tab:hover {
          color: var(--text-primary, #FFFFFF);
        }

        .studio-floor-tab.active {
          color: var(--gold-primary, #DDA752);
        }

        [data-theme="light"] .studio-floor-tab.active {
          color: #7A5200;
        }

        .tab-icon {
          flex-shrink: 0;
        }

        .floor-count-pill {
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.6875rem;
          font-weight: 800;
          background: rgba(255, 255, 255, 0.06);
        }

        .studio-floor-tab.active .floor-count-pill {
          background: rgba(221, 167, 82, 0.2);
          color: var(--gold-primary, #DDA752);
        }

        .tab-active-indicator {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: rgba(221, 167, 82, 0.12);
          border: 1.5px solid rgba(221, 167, 82, 0.5);
          pointer-events: none;
        }

        /* 3. Room Quick Select Pills */
        .studio-room-pills-wrapper {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
        }

        .studio-room-pills-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          padding: 4px 2px;
          scrollbar-width: none;
          width: 100%;
        }

        .studio-room-pills-bar::-webkit-scrollbar {
          display: none;
        }

        .pills-scroll-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 14, 24, 0.9);
          border: 1px solid rgba(221, 167, 82, 0.5);
          color: var(--gold-primary, #DDA752);
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
          transition: all 0.2s ease;
        }

        .pills-scroll-btn:hover {
          background: var(--gold-primary, #DDA752);
          color: #0A0E18;
          transform: translateY(-50%) scale(1.1);
        }

        .pills-scroll-btn.scroll-left {
          left: -4px;
        }

        .pills-scroll-btn.scroll-right {
          right: -4px;
        }

        [data-theme="light"] .pills-scroll-btn {
          background: #FFFFFF;
          border-color: rgba(221, 167, 82, 0.7);
          color: #7A5200;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        }

        .room-chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.45rem 0.9rem;
          border-radius: 9999px;
          font-family: var(--font-heading);
          font-size: 0.78125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          white-space: nowrap;
        }

        [data-theme="light"] .room-chip-btn {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.08);
          color: #334155;
        }

        .room-chip-btn:hover {
          border-color: rgba(221, 167, 82, 0.4);
          color: var(--text-primary, #FFFFFF);
          transform: translateY(-1px);
        }

        .room-chip-btn.active {
          background: linear-gradient(135deg, rgba(221, 167, 82, 0.22) 0%, rgba(10, 14, 24, 0.85) 100%);
          border-color: var(--gold-primary, #DDA752);
          color: #FFF4D4;
          box-shadow: 0 0 14px rgba(221, 167, 82, 0.25);
        }

        [data-theme="light"] .room-chip-btn.active {
          background: linear-gradient(135deg, #FFF5DB 0%, #FFFFFF 100%);
          border-color: #B8860B;
          color: #7A5200;
        }

        .room-num-badge {
          font-size: 0.65rem;
          font-weight: 800;
          opacity: 0.6;
        }

        .room-chip-sqm {
          font-size: 0.6875rem;
          opacity: 0.75;
          color: var(--gold-primary, #DDA752);
        }

        /* 4. Panoramic Stacked Workspace Container */
        .studio-workspace-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }

        /* Top Stage Pane */
        .studio-stage-pane {
          width: 100%;
          border-radius: 24px;
          overflow: hidden;
          background: rgba(10, 14, 24, 0.7);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          min-height: 440px;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
        }

        [data-theme="light"] .studio-stage-pane {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.08);
          box-shadow: 0 16px 40px rgba(30, 24, 16, 0.06);
        }

        .stage-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .stage-controls-bar {
          border-bottom-color: rgba(0, 0, 0, 0.06);
        }

        .stage-mode-switcher {
          display: flex;
          gap: 6px;
          padding: 3px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
        }

        [data-theme="light"] .stage-mode-switcher {
          background: #F1F5F9;
        }

        .mode-switch-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          background: transparent;
          border: none;
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          transition: all 0.2s ease;
        }

        .mode-switch-btn.active {
          background: rgba(221, 167, 82, 0.2);
          color: var(--gold-primary, #DDA752);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        [data-theme="light"] .mode-switch-btn.active {
          background: #FFFFFF;
          color: #7A5200;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .stage-metrology-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--gold-primary, #DDA752);
          font-weight: 700;
        }

        .cad-zoom-controls {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(221, 167, 82, 0.3);
          border-radius: 8px;
          padding: 2px 4px;
        }

        [data-theme="light"] .cad-zoom-controls {
          background: #F1F5F9;
          border-color: rgba(221, 167, 82, 0.5);
        }

        .cad-zoom-btn {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #DDA752;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .cad-zoom-btn:hover:not(:disabled) {
          background: rgba(221, 167, 82, 0.2);
          color: #FFFFFF;
        }

        .cad-zoom-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .cad-zoom-val-btn {
          padding: 2px 6px;
          background: transparent;
          border: none;
          color: #DDA752;
          font-family: monospace;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .cad-zoom-val-btn:hover {
          background: rgba(221, 167, 82, 0.15);
        }

        [data-theme="light"] .stage-metrology-row {
          color: #B8860B;
        }

        .metrology-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .metrology-divider {
          width: 1px;
          height: 12px;
          background: rgba(221, 167, 82, 0.3);
        }

        .stage-viewport-box {
          position: relative;
          width: 100%;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          min-height: 420px;
        }

        .blueprint-svg-canvas {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: #080C14;
        }

        [data-theme="light"] .blueprint-svg-canvas {
          background: #F8FAFC;
        }

        .cad-vector-svg {
          width: 100%;
          max-height: 400px;
        }

        .cad-grid-pattern-line {
          stroke: rgba(221, 167, 82, 0.08);
        }

        [data-theme="light"] .cad-grid-pattern-line {
          stroke: rgba(30, 41, 59, 0.09);
        }

        /* ── CAD Floor Fill (building interior background) */
        .cad-floor-fill {
          fill: rgba(255, 255, 255, 0.03);
        }
        [data-theme="light"] .cad-floor-fill {
          fill: rgba(254, 250, 240, 0.9);
        }

        /* ── Perimeter Wall */
        .cad-perimeter-wall {
          stroke: #DDA752;
          opacity: 0.85;
        }
        [data-theme="light"] .cad-perimeter-wall {
          stroke: #B8860B;
          opacity: 0.9;
        }

        /* ── Partition Walls Between Rooms */
        .cad-partition-wall {
          stroke: rgba(221, 167, 82, 0.55);
        }
        [data-theme="light"] .cad-partition-wall {
          stroke: rgba(100, 80, 20, 0.5);
        }

        /* ── Major grid lines */
        .cad-grid-major-line {
          stroke: rgba(221, 167, 82, 0.06);
        }
        [data-theme="light"] .cad-grid-major-line {
          stroke: rgba(30, 41, 59, 0.08);
        }

        /* ── Room Fill */
        .cad-room-fill {
          fill: rgba(255, 255, 255, 0.0);
          transition: fill 0.2s ease;
        }
        .interactive-cad-room:hover .cad-room-fill {
          fill: rgba(221, 167, 82, 0.06);
        }
        .cad-room-fill.selected {
          fill: rgba(221, 167, 82, 0.14);
        }
        [data-theme="light"] .cad-room-fill {
          fill: transparent;
        }
        [data-theme="light"] .interactive-cad-room:hover .cad-room-fill {
          fill: rgba(221, 167, 82, 0.09);
        }
        [data-theme="light"] .cad-room-fill.selected {
          fill: rgba(221, 167, 82, 0.18);
        }

        .cad-room-title {
          fill: rgba(255, 255, 255, 0.9);
          font-weight: 800;
        }
        [data-theme="light"] .cad-room-title {
          fill: #0F172A !important;
          font-weight: 800;
        }

        .cad-room-dims {
          fill: rgba(255, 255, 255, 0.5);
          font-weight: 700;
        }
        [data-theme="light"] .cad-room-dims {
          fill: #475569 !important;
          font-weight: 700;
        }

        .cad-room-sqm {
          fill: rgba(221, 167, 82, 0.85);
          font-weight: 800;
        }
        [data-theme="light"] .cad-room-sqm {
          fill: #9E6B0B !important;
          font-weight: 800;
        }


        /* ─── Spatial Photography Stage & Carousel Controls ────────────────────────── */
        .photo-preview-stage {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000000;
        }

        .photo-preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .photo-preview-vignette {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top, 
            rgba(6, 9, 16, 0.92) 0%, 
            rgba(6, 9, 16, 0.4) 40%, 
            transparent 70%
          );
          pointer-events: none;
        }

        .photo-top-meta-bar {
          position: absolute;
          top: 1rem;
          left: 1.25rem;
          right: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
          pointer-events: none;
        }

        .photo-vista-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.45rem 1rem;
          border-radius: 9999px;
          background: rgba(10, 14, 24, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(221, 167, 82, 0.4);
          color: #FFF4D4;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 700;
        }

        .photo-counter-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.4rem 0.85rem;
          border-radius: 9999px;
          background: rgba(10, 14, 24, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        /* Carousel Navigation Arrows */
        .photo-nav-arrow {
          position: absolute;
          top: 45%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 14, 24, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          cursor: pointer;
          z-index: 20;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .photo-nav-arrow:hover {
          background: rgba(221, 167, 82, 0.35);
          border-color: #DDA752;
          color: #FFF4D4;
          transform: translateY(-50%) scale(1.08);
        }

        .arrow-left {
          left: 1.25rem;
        }

        .arrow-right {
          right: 1.25rem;
        }

        /* Bottom Floating Thumbnail Filmstrip */
        .photo-filmstrip-container {
          position: absolute;
          bottom: 1rem;
          left: 1.25rem;
          right: 1.25rem;
          z-index: 15;
          display: flex;
          align-items: center;
          padding: 6px;
          border-radius: 16px;
          background: rgba(10, 14, 24, 0.82);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .photo-filmstrip-track {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          width: 100%;
          scrollbar-width: none;
          padding: 2px;
        }

        .photo-filmstrip-track::-webkit-scrollbar {
          display: none;
        }

        .filmstrip-thumb-card {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px 4px 4px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
          text-align: left;
        }

        .filmstrip-thumb-card:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(221, 167, 82, 0.4);
        }

        .filmstrip-thumb-card.active {
          background: linear-gradient(135deg, rgba(221, 167, 82, 0.25) 0%, rgba(10, 14, 24, 0.95) 100%);
          border-color: var(--gold-primary, #DDA752);
          box-shadow: 0 0 12px rgba(221, 167, 82, 0.3);
        }

        .thumb-img-box {
          position: relative;
          width: 44px;
          height: 32px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumb-num-badge {
          position: absolute;
          bottom: 2px;
          right: 2px;
          font-size: 0.55rem;
          font-weight: 800;
          padding: 1px 3px;
          border-radius: 3px;
          background: rgba(0, 0, 0, 0.7);
          color: #FFFFFF;
          line-height: 1;
        }

        .thumb-meta {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .thumb-title {
          font-family: var(--font-heading);
          font-size: 0.6875rem;
          font-weight: 700;
          color: #FFFFFF;
          white-space: nowrap;
        }

        .thumb-sqm {
          font-size: 0.625rem;
          font-weight: 700;
          color: var(--gold-primary, #DDA752);
        }

        /* Bottom Dossier Pane */
        .studio-dossier-pane {
          width: 100%;
          border-radius: 24px;
          background: rgba(10, 14, 24, 0.7);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
        }

        [data-theme="light"] .studio-dossier-pane {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.08);
          box-shadow: 0 16px 40px rgba(30, 24, 16, 0.06);
        }

        .dossier-space-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-wrap: wrap;
        }

        [data-theme="light"] .dossier-space-header {
          border-bottom-color: rgba(0, 0, 0, 0.06);
        }

        .dossier-header-left {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .dossier-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .dossier-floor-badge,
        .dossier-verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.6875rem;
          font-weight: 800;
        }

        .dossier-floor-badge {
          background: rgba(221, 167, 82, 0.15);
          color: var(--gold-primary, #DDA752);
          border: 1px solid rgba(221, 167, 82, 0.35);
        }

        .dossier-verified-badge {
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .dossier-space-title {
          font-family: var(--font-heading);
          font-size: 1.45rem;
          font-weight: 800;
          color: var(--text-primary, #FFFFFF);
          margin: 0;
          line-height: 1.25;
        }

        [data-theme="light"] .dossier-space-title {
          color: #0F172A;
        }

        .dossier-metrics-strip {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.25rem;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        [data-theme="light"] .dossier-metrics-strip {
          background: #F8FAFC;
          border-color: rgba(0, 0, 0, 0.05);
        }

        .dossier-metric-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .metric-lbl {
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--gold-primary, #DDA752);
          text-transform: uppercase;
        }

        [data-theme="light"] .metric-lbl {
          color: #B8860B;
        }

        .metric-val {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-primary, #FFFFFF);
        }

        [data-theme="light"] .metric-val {
          color: #0F172A;
        }

        .metric-v-sep {
          width: 1px;
          height: 24px;
          background: rgba(255, 255, 255, 0.08);
        }

        [data-theme="light"] .metric-v-sep {
          background: rgba(0, 0, 0, 0.08);
        }

        /* Trades Grid (2 Columns on Desktop) */
        .dossier-trades-container {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .trades-section-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--gold-primary, #DDA752);
          text-transform: uppercase;
        }

        [data-theme="light"] .trades-section-eyebrow {
          color: #B8860B;
        }

        .dossier-trades-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .trade-spec-card {
          display: flex;
          gap: 12px;
          padding: 1rem 1.15rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.2s ease;
        }

        [data-theme="light"] .trade-spec-card {
          background: #F8FAFC;
          border-color: rgba(0, 0, 0, 0.05);
        }

        .trade-spec-card:hover {
          border-color: rgba(221, 167, 82, 0.35);
          transform: translateY(-2px);
        }

        .trade-spec-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(221, 167, 82, 0.12);
          border: 1px solid rgba(221, 167, 82, 0.25);
        }

        .trade-icon {
          color: var(--gold-primary, #DDA752);
        }

        [data-theme="light"] .trade-icon {
          color: #B8860B;
        }

        .trade-spec-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }

        .trade-spec-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .trade-name {
          font-family: var(--font-heading);
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-primary, #FFFFFF);
        }

        [data-theme="light"] .trade-name {
          color: #0F172A;
        }

        .trade-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 0.15rem 0.45rem;
          border-radius: 9999px;
          font-size: 0.625rem;
          font-weight: 800;
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
          white-space: nowrap;
        }

        .trade-spec-desc {
          font-size: 0.75rem;
          color: var(--text-secondary, rgba(255, 255, 255, 0.65));
          line-height: 1.45;
          margin: 0;
        }

        [data-theme="light"] .trade-spec-desc {
          color: #475569;
        }

        /* Dossier Footer Actions */
        .dossier-footer-actions {
          display: flex;
          gap: 10px;
          padding-top: 0.5rem;
        }

        .dossier-inquire-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.85rem 1.25rem;
          border-radius: 9999px;
          font-family: var(--font-heading);
          font-size: 0.8125rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          background: linear-gradient(135deg, #FFF4D4 0%, var(--gold-primary, #DDA752) 50%, #9E7226 100%);
          color: #0A0C10;
          border: none;
          box-shadow: 0 4px 18px rgba(221, 167, 82, 0.35);
        }

        .dossier-inquire-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(221, 167, 82, 0.5);
        }

        @media (max-width: 768px) {
          .dossier-trades-grid {
            grid-template-columns: 1fr;
          }
          .dossier-metrics-strip {
            width: 100%;
            justify-content: space-between;
          }
          .photo-filmstrip-container {
            bottom: 0.5rem;
            left: 0.5rem;
            right: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ArchitecturalBlueprintInspector;
