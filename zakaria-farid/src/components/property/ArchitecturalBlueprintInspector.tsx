'use client';
import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Zap, 
  Wind, 
  Droplet, 
  CheckCircle2, 
  ShieldCheck, 
  X, 
  ArrowRight, 
  FileText, 
  Building, 
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import { ZoneInstance } from '@/lib/layering';

interface ArchitecturalBlueprintInspectorProps {
  zones?: ZoneInstance[];
  propertyTitle: string;
  locale?: string;
  propertyType?: string;
  propertyImages?: string[];
}

// 7-Star Curated Architectural Photography
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

const ZONE_FRIENDLY_NAMES: Record<string, { en: string; ar: string }> = {
  'vil.exterior': { en: 'Private Grounds & Landscape', ar: 'الحدائق والمساحات الخارجية' },
  'vil.g.entrance': { en: 'Double-Height Entrance Foyer', ar: 'بهو المدخل الرئيسي المزدوج' },
  'vil.g.reception': { en: 'Grand Reception & Salon', ar: 'صالون الاستقبال الرئيسي الفاخر' },
  'vil.g.dining': { en: 'Formal Dining Salon', ar: 'غرفة الطعام الملكية' },
  'vil.g.powder_room': { en: 'Guest Powder Room & Spa', ar: 'حمام الضيوف الفاخر' },
  'vil.g.kitchen': { en: 'Chef Show Kitchen & Pantry', ar: 'مطبخ الاستعراض الرئيسي ومخزن التحضير' },
  'vil.f.master_suite': { en: 'Master Royal Suite', ar: 'الجناح الملكي الرئيسي' },
  'vil.f.master_bath': { en: 'Master En-Suite Spa Bath', ar: 'حمام السبا الملحق بالجناح الرئيسي' },
  'vil.f.std_bed': { en: 'Executive Bedroom Suite', ar: 'غرفة النوم التنفيذية' },
  'vil.f.family_room': { en: 'Family Living & Media Lounge', ar: 'الصالة العائلية وغرفة السينما' },
  'vil.f.main_bath': { en: 'Main Luxury Bathroom', ar: 'الحمام الرئيسي الفاخر' },
  'vil.b.garage': { en: '4-Car Integrated Garage', ar: 'جراج سيارات خاص يتسع لـ ٤ سيارات' },
  'vil.b.game_room': { en: 'Entertainment & Gaming Salon', ar: 'صالة الألعاب والترفيه' },
  'vil.b.driver_room': { en: "Maid & Driver Quarters", ar: 'غرف السائق والمساعدين' },
  'vil.r.guest_suite': { en: 'Skyline Roof Annex / Guest Suite', ar: 'ملحق الرووف وجناح الضيوف' },
  'vil.r.terrace': { en: 'Panoramic Sky Terrace & Pergola', ar: 'تراس السطح البانورامي مع البرجولا' },
  'apt.reception': { en: 'Grand Reception', ar: 'الاستقبال الرئيسي' },
  'apt.master_bed': { en: 'Master Bedroom Suite', ar: 'غرفة النوم الرئيسية' },
  'apt.kitchen': { en: 'Designer Kitchen', ar: 'المطبخ الفاخر' },
  'apt.main_bath': { en: 'Main Bathroom', ar: 'الحمام الرئيسي' },
  'apt.balcony': { en: 'Panoramic Balcony', ar: 'الشرفة البانورامية' }
};

const TRADE_FRIENDLY_NAMES: Record<string, { en: string; ar: string }> = {
  'ext.landscaping': { en: 'Landscape Engineering', ar: 'تنسيق الحدائق والمساحات الخضراء' },
  'ext.fence_gate': { en: 'Enclosure & Security Gate', ar: 'الأسوار والبوابات الأمنية' },
  'ext.pool': { en: 'Heated Infinity Pool Systems', ar: 'أنظمة المسبح اللا متناهي المدفأ' },
  'liv.electrical': { en: 'KNX Smart Electrical & Lighting', ar: 'التحكم الذكي والإنارة المعمارية' },
  'liv.hvac': { en: 'Concealed VRF Climate Control', ar: 'التكييف المركزي المخفي' },
  'liv.flooring': { en: 'Imported Marble & Hardwood Parquet', ar: 'الرخام المستورد والباركيه الطبيعي' },
  'liv.walls': { en: 'Acoustic Insulation & Stucco Walls', ar: 'العزل الصوتي والدهانات المعمارية' },
  'liv.carpentry': { en: 'Bespoke Joinery & Schuco Glazing', ar: 'الأبواب الفاخرة وقطاعات الألومنيوم' },
  'wet.plumbing': { en: 'Concealed Sanitary & PEX Piping', ar: 'السباكة المدفونة وتمديدات PEX' },
  'wet.walls': { en: 'Waterproofing & Large-Format Porcelain', ar: 'العزل المائي والبورسلين الكبير' },
  'wet.flooring': { en: 'Anti-Slip Italian Marble Flooring', ar: 'أرضيات الرخام الإيطالي المعالج' }
};

interface TradeStatusInfo {
  specEn: string;
  specAr: string;
  badgeEn: string;
  badgeAr: string;
  badgeType: 'emerald' | 'gold' | 'blue' | 'gray';
}

function resolveTradeStatusDetails(tradeId: string, status: string): TradeStatusInfo {
  const t = tradeId.toLowerCase();
  const s = (status || '').toLowerCase();

  if (s === 'finished') {
    return {
      specEn: 'Premium turnkey grade execution • Tested and certified to European & Egyptian codes',
      specAr: 'تشطيب فاخر معتمد بالكامل • تم الفحص والاختبار وفق أعلى الأكواد الهندسية',
      badgeEn: 'Turnkey Finished',
      badgeAr: 'تشطيب مكتمل',
      badgeType: 'emerald'
    };
  }

  if (s === 'conduitsonly') {
    return {
      specEn: 'Heavy-duty fire-rated PVC conduits & backboxes installed • Ready for KNX smart cabling',
      specAr: 'تمديد مواسير PVC المقاومة للحرارة والعلب الماجيك • جاهز لسحب الأسلاك الذكية',
      badgeEn: 'First Fix (Conduits)',
      badgeAr: 'تأسيس مواسير',
      badgeType: 'blue'
    };
  }

  if (s === 'wired') {
    return {
      specEn: 'Certified fire-resistant copper wiring pulled • Automation sub-panels and circuits connected',
      specAr: 'سحب الأسلاك النحاسية المعزولة وربط لوحات التوزيع الفرعية والدوائر الذكية',
      badgeEn: 'Wired & Prepped',
      badgeAr: 'تمديد الأسلاك',
      badgeType: 'gold'
    };
  }

  if (s === 'sandbed') {
    return {
      specEn: 'Laser-leveled sand bed & damp-proof subfloor screed • Prepared for marble/parquet laying',
      specAr: 'فرشة رمل منسوبة بالليزر وطبقة لياسة عازلة • جاهزة لتركيب الرخام والباركيه',
      badgeEn: 'Subfloor Screed',
      badgeAr: 'فرشة رمل ولياسة',
      badgeType: 'blue'
    };
  }

  if (s === 'tiled') {
    return {
      specEn: 'High-density large-format porcelain / marble slabs laid with anti-microbial epoxy grout',
      specAr: 'تركيب البورسلين والرخام المستورد مع فواصل إيبوكسي معالجة ضد البكتيريا',
      badgeEn: 'Tiling Completed',
      badgeAr: 'تركيب البلاط',
      badgeType: 'gold'
    };
  }

  if (s === 'plastered') {
    return {
      specEn: 'Acoustic cementitious base plaster & fiberglass mesh reinforcement applied to walls',
      specAr: 'بياض محارة إسمنتية معالجة مع شبك فايبر لتقوية الزوايا ومنع التشققات',
      badgeEn: 'Base Plaster',
      badgeAr: 'طبقة المحارة',
      badgeType: 'blue'
    };
  }

  if (s === 'putty') {
    return {
      specEn: 'Multi-layer acrylic putty sanded to Level 5 silk smoothness • Deep primer base coated',
      specAr: 'طبقات معجون أكريليك مسحوبة وناعمة كالحرير • جاهزة للدهان المعماري النهائي',
      badgeEn: 'Putty & Primer',
      badgeAr: 'مرحلة المعجون',
      badgeType: 'gold'
    };
  }

  if (s === 'finalpaint') {
    return {
      specEn: 'Anti-bacterial low-VOC architectural matte finish paint applied with precision spray',
      specAr: 'دهانات معمارية نهائية مقاومة للبكتيريا ومطابقة لأعلى معايير جودة الهواء',
      badgeEn: 'Final Paint',
      badgeAr: 'الدهان النهائي',
      badgeType: 'emerald'
    };
  }

  if (s === 'roughin') {
    return {
      specEn: 'Hydraulically pressure-tested PEX-a piping & sound-insulated drainage stacks certified',
      specAr: 'تمديدات السباكة المدفونة PEX-a واختبار الضغط الهيدروليكي المعتمد والصامت',
      badgeEn: 'Rough-In Tested',
      badgeAr: 'تأسيس مضغوط',
      badgeType: 'gold'
    };
  }

  if (s === 'subframes') {
    return {
      specEn: 'Treated counter-frames & sub-assemblies anchored for acoustic solid wood doors & Schuco glazing',
      specAr: 'تركيب الحلوق الزفرة المعالجة تمهيداً للأبواب الخشبية والواجهات الزجاجية',
      badgeEn: 'Subframes Set',
      badgeAr: 'حلوق معمارية',
      badgeType: 'blue'
    };
  }

  if (s === 'installed') {
    return {
      specEn: 'Core mechanical & electrical equipment mounted, calibrated, and system-tested',
      specAr: 'تركيب الوحدات الرئيسية والمعدات وتثبيتها ومعايرتها هندسياً واختبارها',
      badgeEn: 'Units Installed',
      badgeAr: 'وحدات مركبة',
      badgeType: 'emerald'
    };
  }

  if (s === 'redbrick' || s === 'notstarted') {
    return {
      specEn: 'Core masonry structure approved • Execution blueprints prepared for construction rollout',
      specAr: 'الهيكل الإنشائي معتمد • المخططات التنفيذية جاهزة لبدء أعمال التأسيس المعماري',
      badgeEn: 'Core & Shell',
      badgeAr: 'طوب أحمر / قيد البدء',
      badgeType: 'gray'
    };
  }

  return {
    specEn: status ? `Specification Stage: ${status}` : 'Certified Engineering Standard',
    specAr: status ? `مرحلة التنفيذ: ${status}` : 'مواصفات هندسية معتمدة',
    badgeEn: status || 'Verified Spec',
    badgeAr: status || 'مواصفات معتمدة',
    badgeType: 'gold'
  };
}

interface FlattenedZoneTrade {
  name: string;
  nameAr: string;
  spec: string;
  specAr: string;
  badge: string;
  badgeAr: string;
  badgeType: 'emerald' | 'gold' | 'blue' | 'gray';
  icon: 'zap' | 'wind' | 'droplet' | 'layers' | 'check';
}

interface FlattenedZone {
  id: string;
  floorLabel: string;
  floorLabelAr: string;
  zoneTitle: string;
  zoneTitleAr: string;
  category: string;
  image: string;
  trades: FlattenedZoneTrade[];
}

export const ArchitecturalBlueprintInspector: React.FC<ArchitecturalBlueprintInspectorProps> = ({
  zones = [],
  propertyTitle,
  locale = 'en',
  propertyType = 'villa',
  propertyImages = []
}) => {
  const isAr = locale === 'ar';
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeFloor, setActiveFloor] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<FlattenedZone | null>(null);

  // Lock body & html scroll when space inspector modal is open
  React.useEffect(() => {
    if (selectedZone) {
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow || '';
        document.body.style.overflow = originalBodyOverflow || '';
      };
    }
  }, [selectedZone]);

  // Flatten nested floor/room hierarchy into a clean luxury collection
  const flattenedZones: FlattenedZone[] = useMemo(() => {
    if (!zones || zones.length === 0) {
      return [
        {
          id: 'ground-reception',
          floorLabel: 'Ground Floor',
          floorLabelAr: 'الدور الأرضي',
          zoneTitle: 'Grand Reception & Salon',
          zoneTitleAr: 'صالون الاستقبال الرئيسي الفاخر',
          category: 'living_space',
          image: CURATED_ROOM_IMAGES.reception,
          trades: [
            { name: 'Marble & Flooring', nameAr: 'الرخام والأرضيات', spec: 'Bookmatched Italian Calacatta Gold slabs with brass inlays', specAr: 'ألواح رخام كلكتا إيطالي فاخر مع فواصل نحاسية', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'layers' },
            { name: 'Climate / HVAC', nameAr: 'التكييف المركزي', spec: 'Concealed VRV IV-S system with linear architectural slot diffusers', specAr: 'تكييف مركزي مخفي بمخارج خطية معمارية صامتة', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'wind' },
            { name: 'Smart Automation', nameAr: 'التحكم الذكي', spec: 'KNX automated lighting, motorized drapery & climate scenes', specAr: 'نظام KNX للتحكم بالستائر والإضاءة والسيناريوهات', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'zap' }
          ]
        },
        {
          id: 'first-master-suite',
          floorLabel: 'First Floor',
          floorLabelAr: 'الدور الأول',
          zoneTitle: 'Master Royal Suite',
          zoneTitleAr: 'الجناح الملكي الرئيسي',
          category: 'living_space',
          image: CURATED_ROOM_IMAGES.master,
          trades: [
            { name: 'Hardwood Flooring', nameAr: 'الأرضيات الخشبية', spec: 'French herringbone engineered natural oak parquet', specAr: 'باركيه خشب طبيعي بلوط فرنسي بنمط متعرج', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'layers' },
            { name: 'Spa Sanitary Fixtures', nameAr: 'الأطقم الصحية', spec: 'Grohe Allure Brilliant thermostatic mixer & freestanding soaking tub', specAr: 'خلاطات جروهي مدفونة وحوض استحمام مستقل فاخر', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'droplet' },
            { name: 'Acoustic Soundproofing', nameAr: 'العزل الصوتي', spec: 'Double-stud insulated drywall with rockwool damping (STC 58)', specAr: 'عزل صوتي فائق بالألواح الجدارية والصوف الصخري', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'layers' }
          ]
        },
        {
          id: 'outdoor-grounds',
          floorLabel: 'Outdoor Grounds',
          floorLabelAr: 'المساحات الخارجية',
          zoneTitle: 'Private Grounds & Heated Pool',
          zoneTitleAr: 'الحدائق والمسبح اللا متناهي المدفأ',
          category: 'exterior',
          image: CURATED_ROOM_IMAGES.grounds,
          trades: [
            { name: 'Landscape Engineering', nameAr: 'تنسيق الحدائق', spec: 'Subterranean automatic drip irrigation & multi-tier drainage', specAr: 'شبكة ري بالتنقيط وتصريف مياه أوتوماتيكية متطورة', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'droplet' },
            { name: 'Pool Systems', nameAr: 'أنظمة المسبح', spec: 'Heated overflow system with Italian glass mosaic coping', specAr: 'نظام تدفئة وتدفق مع فسيفساء زجاجية إيطالية', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'droplet' },
            { name: 'Architectural Lighting', nameAr: 'الإضاءة المعمارية', spec: 'Concealed IP67 architectural LED scene controllers', specAr: 'إضاءة خارجية LED مقاومة للماء مع سيناريوهات ليلية', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'zap' }
          ]
        },
        {
          id: 'ground-kitchen',
          floorLabel: 'Ground Floor',
          floorLabelAr: 'الدور الأرضي',
          zoneTitle: 'Chef Show Kitchen & Pantry',
          zoneTitleAr: 'مطبخ الاستعراض الرئيسي ومخزن التحضير',
          category: 'wet_room',
          image: CURATED_ROOM_IMAGES.kitchen,
          trades: [
            { name: 'Plumbing & Drainage', nameAr: 'السباكة والمرافق', spec: 'Multilayer PEX-a German piping with silent drainage stack', specAr: 'أنابيب PEX-a ألمانية مع أعمدة تصريف صامتة', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'droplet' },
            { name: 'Cabinetry & Surfaces', nameAr: 'الخزائن والأسطح', spec: 'Corian seamless anti-bacterial surfaces & Blum soft-close joinery', specAr: 'أسطح كوريان معالجة وخزائن هيدروليكية من بلوم', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'layers' },
            { name: 'Ventilation Extraction', nameAr: 'التهوية والشفط', spec: 'High-CFM commercial-grade concealed duct exhaust', specAr: 'شفاط مركزي عالي الكفاءة بتمديدات مخفية معزولة', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'wind' }
          ]
        },
        {
          id: 'roof-terrace',
          floorLabel: 'Roof Level',
          floorLabelAr: 'الرووف والتراس',
          zoneTitle: 'Panoramic Sky Terrace',
          zoneTitleAr: 'تراس السطح البانورامي مع البرجولا',
          category: 'transit',
          image: CURATED_ROOM_IMAGES.terrace,
          trades: [
            { name: 'Weatherproof Glazing', nameAr: 'الألومنيوم والواجهات', spec: 'Schuco thermal-break double glazed sliding doors', specAr: 'أبواب منزلقة ألومنيوم شوكو ألماني عازل للحرارة', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'layers' },
            { name: 'Thermal Insulation', nameAr: 'العزل الحراري', spec: 'Dual-layer membrane + high-density XPS thermal barrier', specAr: 'عزل مائي وحراري مزدوج بألواح البوليسترين عالية الكثافة', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'layers' }
          ]
        }
      ];
    }

    const list: FlattenedZone[] = [];

    const traverse = (item: ZoneInstance, parentFloorName = 'Ground Floor', parentFloorNameAr = 'الدور الأرضي') => {
      if (item.children && item.children.length > 0) {
        const floorName = item.instance_label || item.zone_template_id || 'Level';
        const isGround = floorName.toLowerCase().includes('ground') || floorName.toLowerCase().includes('أرضي');
        const isFirst = floorName.toLowerCase().includes('first') || floorName.toLowerCase().includes('أول');
        const isRoof = floorName.toLowerCase().includes('roof') || floorName.toLowerCase().includes('رووف') || floorName.toLowerCase().includes('سطح');
        const isOutdoor = floorName.toLowerCase().includes('exterior') || floorName.toLowerCase().includes('outdoor') || floorName.toLowerCase().includes('حديق');

        const floorNameEn = isOutdoor ? 'Outdoor Grounds' : isGround ? 'Ground Floor' : isFirst ? 'First Floor' : isRoof ? 'Roof Level' : floorName;
        const floorNameAr = isOutdoor ? 'المساحات الخارجية' : isGround ? 'الدور الأرضي' : isFirst ? 'الدور الأول' : isRoof ? 'الرووف' : floorName;

        item.children.forEach((child) => traverse(child, floorNameEn, floorNameAr));
        return;
      }

      const rawTitle = item.instance_label || item.zone_template_id;
      const friendlyZone = ZONE_FRIENDLY_NAMES[item.zone_template_id] || ZONE_FRIENDLY_NAMES[rawTitle] || { en: rawTitle, ar: rawTitle };
      const titleEn = friendlyZone.en;
      const titleAr = friendlyZone.ar;
      const customImg = item.images && item.images.length > 0 ? item.images[0] : undefined;
      const img = resolveSpaceImage(titleEn + ' ' + (item.zone_template_id || ''), customImg);

      const parsedTrades: FlattenedZoneTrade[] = (item.trades || []).map((t) => {
        const tId = t.trade_template_id?.toLowerCase() || '';
        const friendlyTrade = TRADE_FRIENDLY_NAMES[t.trade_template_id] || { en: t.trade_template_id, ar: t.trade_template_id };
        const iconType: 'zap' | 'wind' | 'droplet' | 'layers' | 'check' = 
          tId.includes('elect') ? 'zap' :
          tId.includes('hvac') || tId.includes('air') ? 'wind' :
          tId.includes('plumb') || tId.includes('water') || tId.includes('pool') ? 'droplet' :
          'layers';

        const statusDetails = resolveTradeStatusDetails(t.trade_template_id, t.status);

        return {
          name: friendlyTrade.en,
          nameAr: friendlyTrade.ar,
          spec: statusDetails.specEn,
          specAr: statusDetails.specAr,
          badge: statusDetails.badgeEn,
          badgeAr: statusDetails.badgeAr,
          badgeType: statusDetails.badgeType,
          icon: iconType
        };
      });

      list.push({
        id: item.id,
        floorLabel: parentFloorName,
        floorLabelAr: parentFloorNameAr,
        zoneTitle: titleEn,
        zoneTitleAr: titleAr,
        category: 'living_space',
        image: img,
        trades: parsedTrades.length > 0 ? parsedTrades : [
          { name: 'Electrical & Automation', nameAr: 'الكهرباء والتحكم', spec: 'Schneider KNX smart automation & LED circuits', specAr: 'نظام شنايدر الذكي ودوائر إضاءة LED', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'zap' },
          { name: 'Climate / HVAC', nameAr: 'التكييف المركزي', spec: 'Concealed VRF with linear diffusers', specAr: 'تكييف مركزي مخفي بمخارج خطية', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'wind' },
          { name: 'Flooring & Finishes', nameAr: 'الأرضيات والتشطيب', spec: 'Imported luxury marble & acoustic drywall', specAr: 'رخام مستورد وألواح جدارية عازلة', badge: 'Turnkey Finished', badgeAr: 'تشطيب مكتمل', badgeType: 'emerald', icon: 'layers' }
        ]
      });
    };

    zones.forEach((z) => traverse(z));
    return list;
  }, [zones, propertyImages]);

  // Extract unique floor categories
  const floorTabs = useMemo(() => {
    const map = new Map<string, number>();
    flattenedZones.forEach((z) => {
      map.set(z.floorLabel, (map.get(z.floorLabel) || 0) + 1);
    });
    return [
      { id: 'all', labelEn: 'All Spaces', labelAr: 'كافة المساحات', count: flattenedZones.length },
      ...Array.from(map.entries()).map(([floor, count]) => ({
        id: floor,
        labelEn: floor,
        labelAr: floor.includes('Ground') ? 'الدور الأرضي' : floor.includes('First') ? 'الدور الأول' : floor.includes('Roof') ? 'الرووف' : 'المساحات الخارجية',
        count
      }))
    ];
  }, [flattenedZones]);

  // Filtered list
  const displayedZones = useMemo(() => {
    if (activeFloor === 'all') return flattenedZones;
    return flattenedZones.filter((z) => z.floorLabel === activeFloor);
  }, [flattenedZones, activeFloor]);

  // Slider navigation controls
  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-blueprint-section">
      
      {/* Header with Title and Slider Navigation */}
      <div className="space-header-row">
        <div className="space-title-block">
          <span className="space-eyebrow">
            <Layers size={14} className="space-eyebrow-icon" />
            <span>{isAr ? 'المخطط الهندسي والمساحات' : 'ARCHITECTURAL BLUEPRINT & SPACES'}</span>
          </span>
          <h3 className="space-heading">
            {isAr ? 'المساحات وتفاصيل التشطيب' : 'Curated Spaces & Engineering Blueprint'}
          </h3>
        </div>

        {/* Right Controls: Tabs & Arrows */}
        <div className="space-controls-group">
          {/* Floor Level Filter Tabs */}
          <div className="floor-filter-strip">
            {floorTabs.map((floor) => {
              const isSelected = activeFloor === floor.id;
              const label = isAr ? floor.labelAr : floor.labelEn;

              return (
                <button
                  key={floor.id}
                  type="button"
                  className={`floor-tab-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFloor(floor.id);
                    if (sliderRef.current) sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                  }}
                >
                  <span>{label}</span>
                  <span className="floor-tab-badge">{floor.count}</span>
                  {isSelected && (
                    <motion.div 
                      layoutId="spaceFloorTabActive" 
                      className="tab-active-glow" 
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }} 
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Slider Step Arrows */}
          <div className="slider-arrows-wrap">
            <button 
              className="slider-arrow-btn" 
              onClick={() => scroll('left')}
              title={isAr ? 'السابق' : 'Previous Space'}
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="slider-arrow-btn" 
              onClick={() => scroll('right')}
              title={isAr ? 'التالي' : 'Next Space'}
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Uniform Photographic Media Slider Track */}
      <div className="spaces-slider-viewport">
        <div className="spaces-slider-track" ref={sliderRef}>
          {displayedZones.map((zone, idx) => (
            <div
              key={zone.id || idx}
              className="blueprint-space-card"
              onClick={() => setSelectedZone(zone)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedZone(zone);
                }
              }}
            >
              {/* Full-bleed Absolute Photographic Layer */}
              <div className="blueprint-card-media-box">
                <img 
                  src={zone.image} 
                  alt={zone.zoneTitle} 
                  className="blueprint-space-img" 
                  loading="lazy" 
                />
                <div className="blueprint-card-vignette" />
              </div>

              {/* Top Level Badges */}
              <div className="blueprint-card-top-bar">
                <span className="blueprint-floor-pill">
                  <Building size={13} className="pill-icon" />
                  <span>{isAr ? zone.floorLabelAr : zone.floorLabel}</span>
                </span>

              </div>

              {/* Floating Frosted Glass Bottom Overlay */}
              <div className="blueprint-space-glass-overlay">
                <div className="blueprint-space-text-wrap">
                  <span className="blueprint-space-meta">
                    <Sparkles size={11} className="meta-icon-gold" />
                    <span>{isAr ? 'المخطط والمواصفات' : 'BLUEPRINT ZONE'}</span>
                  </span>
                  <h4 className="blueprint-space-title">
                    {isAr ? zone.zoneTitleAr : zone.zoneTitle}
                  </h4>
                  <p className="blueprint-space-specs-count">
                    {zone.trades.length} {isAr ? 'بنود ومواصفات هندسية' : 'Engineered Specifications'}
                  </p>
                </div>

                {/* Inspect specifications action button */}
                <div className="blueprint-space-action-row">
                  <span className="action-row-label">
                    {isAr ? 'معاينة البنود والخامات' : 'Inspect Specifications'}
                  </span>
                  <div className="action-circle-bubble">
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info Notice & PDF Action */}
      <div className="space-footer-notice-bar">
        <div className="notice-left">
          <ShieldCheck size={16} className="notice-icon-gold" />
          <span>
            {isAr 
              ? 'انقر على أي مساحة لفتح نافذة المواصفات وجدول الخامات المعتمدة بالكامل' 
              : 'Click on any space card to open the interactive liquid glass inspector for complete MEP trade specifications and engineering certificates.'}
          </span>
        </div>

        <button 
          className="btn-print-spec-dossier"
          onClick={() => window.print()}
          type="button"
        >
          <FileText size={14} />
          <span>{isAr ? 'طباعة كراسة المواصفات (PDF)' : 'Print Architectural Spec Sheet'}</span>
        </button>
      </div>

      {/* Interactive Liquid Glass Pop-Up Modal */}
      <AnimatePresence>
        {selectedZone && (
          <motion.div 
            className="zone-glass-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedZone(null)}
          >
            <motion.div 
              className="zone-glass-modal-card"
              initial={{ scale: 0.92, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Hero Photographic Banner */}
              <div className="glass-modal-hero">
                <img 
                  src={selectedZone.image} 
                  alt={selectedZone.zoneTitle} 
                  className="glass-modal-hero-photo" 
                />
                <div className="glass-modal-hero-gradient" />

                {/* Close Button */}
                <button 
                  className="glass-modal-close-btn"
                  onClick={() => setSelectedZone(null)}
                  type="button"
                  title="Close Inspector"
                >
                  <X size={17} />
                </button>

                {/* Hero Info Overlay */}
                <div className="glass-modal-hero-info">
                  <div className="glass-modal-pill-row">
                    <span className="glass-modal-pill-gold">
                      <Building size={13} />
                      <span>{isAr ? selectedZone.floorLabelAr : selectedZone.floorLabel}</span>
                    </span>
                    <span className="glass-modal-pill-emerald">
                      <CheckCircle2 size={13} />
                      <span>{isAr ? 'مواصفات هندسية معتمدة' : '100% Verified Specifications'}</span>
                    </span>
                  </div>
                  <h3 className="glass-modal-heading">
                    {isAr ? selectedZone.zoneTitleAr : selectedZone.zoneTitle}
                  </h3>
                </div>
              </div>

              {/* Modal Body & Specifications Grid */}
              <div className="glass-modal-body-scroll">
                <div className="glass-modal-specs-header">
                  <span className="glass-modal-eyebrow">
                    {isAr ? 'جدول البنود الهندسية والخامات' : 'ENGINEERING TRADE SPECIFICATIONS'}
                  </span>
                  <h4 className="glass-modal-subheading">
                    {isAr ? 'المواد والخامات المنفذة في هذه المساحة' : 'Materials, Systems & Infrastructure'}
                  </h4>
                </div>

                <div className="glass-modal-trades-list">
                  {selectedZone.trades.map((trade, idx) => {
                    const Icon = trade.icon === 'zap' ? Zap : trade.icon === 'wind' ? Wind : trade.icon === 'droplet' ? Droplet : Layers;
                    return (
                      <div key={idx} className="glass-spec-trade-card">
                        <div className="glass-spec-icon-box">
                          <Icon size={18} className="spec-gold-icon" />
                        </div>
                        <div className="glass-spec-content">
                          <span className="glass-spec-trade-name">
                            {isAr ? trade.nameAr : trade.name}
                          </span>
                          <span className="glass-spec-trade-detail">
                            {isAr ? trade.specAr : trade.spec}
                          </span>
                        </div>
                        <div className={`glass-spec-installed-pill badge-${trade.badgeType}`}>
                          {trade.badgeType === 'emerald' ? (
                            <Check size={12} strokeWidth={2.5} />
                          ) : trade.badgeType === 'gold' ? (
                            <Sparkles size={11} />
                          ) : (
                            <Building size={11} />
                          )}
                          <span>{isAr ? trade.badgeAr : trade.badge}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quality & Certification Stamp Card */}
                <div className="glass-modal-certification-card">
                  <ShieldCheck size={24} className="cert-shield-icon" />
                  <div className="cert-info-block">
                    <span className="cert-heading">
                      {isAr ? 'مطابق للكود الهندسي الأوروبي والمصري' : 'Certified Engineering Compliance'}
                    </span>
                    <span className="cert-body">
                      {isAr 
                        ? 'تم الفحص والاختبار لشبكات التكييف والمياه والكهرباء والإنارة والعزل الصوتي والحراري.' 
                        : 'Tested and certified for thermal insulation, hydraulic pressure, soundproofing, and KNX intelligent circuits.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Bar */}
              <div className="glass-modal-footer">
                <button 
                  className="btn-glass-modal-print"
                  onClick={() => window.print()}
                  type="button"
                >
                  <FileText size={15} />
                  <span>{isAr ? 'طباعة كراسة المواصفات (PDF)' : 'Print Space Spec Dossier'}</span>
                </button>
                <button 
                  className="btn-glass-modal-close"
                  onClick={() => setSelectedZone(null)}
                  type="button"
                >
                  <span>{isAr ? 'إغلاق' : 'Close'}</span>
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .space-blueprint-section {
          margin-bottom: 4rem;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .space-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .space-title-block {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .space-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--gold-primary, #DDA752);
          font-size: 0.6875rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: var(--font-heading);
        }

        .space-eyebrow-icon {
          color: var(--gold-primary, #DDA752);
        }

        .space-heading {
          font-family: var(--font-heading);
          font-size: clamp(1.4rem, 2.5vw, 1.85rem);
          font-weight: 800;
          color: var(--text-primary, #FFFFFF);
          letter-spacing: -0.02em;
          margin: 0;
        }

        .space-controls-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Floor Filter Strip */
        .floor-filter-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(10, 14, 24, 0.65);
          padding: 4px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .floor-tab-btn {
          position: relative;
          background: transparent;
          border: none;
          color: var(--text-muted, #94A3B8);
          font-size: 0.78125rem;
          font-weight: 600;
          padding: 0.4rem 0.85rem;
          border-radius: 9999px;
          cursor: pointer;
          white-space: nowrap;
          transition: color 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          z-index: 1;
        }

        .floor-tab-btn:hover {
          color: #FFFFFF;
        }

        .floor-tab-btn.active {
          color: #FFFFFF;
        }

        .floor-tab-badge {
          font-size: 0.6875rem;
          font-weight: 700;
          opacity: 0.65;
        }

        .tab-active-glow {
          position: absolute;
          inset: 0;
          background: var(--gold-primary, #DDA752);
          border-radius: 9999px;
          z-index: -1;
          box-shadow: 0 0 12px rgba(221, 167, 82, 0.45);
        }

        /* Navigation Arrows */
        .slider-arrows-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .slider-arrow-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(22, 28, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .slider-arrow-btn:hover {
          background: var(--gold-primary, #DDA752);
          color: #0A0C10;
          border-color: var(--gold-primary, #DDA752);
        }

        /* Slider Viewport & Track */
        .spaces-slider-viewport {
          position: relative;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          min-width: 0;
        }

        .spaces-slider-track {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          gap: 1.5rem !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 0.5rem 0.15rem 1.5rem;
          scrollbar-width: none;
          -ms-overflow-style: none;
          min-width: 0;
          width: 100%;
        }

        .spaces-slider-track::-webkit-scrollbar {
          display: none;
        }

        /* -------------------------------------------------------------
           Blueprint Space Card (Uniform Full-Bleed Media with Glass Panel)
        ------------------------------------------------------------- */
        .blueprint-space-card {
          position: relative !important;
          flex: 0 0 320px !important;
          flex-shrink: 0 !important;
          width: 320px !important;
          min-width: 320px !important;
          max-width: 320px !important;
          height: 440px !important;
          scroll-snap-align: start;
          border-radius: 22px !important;
          overflow: hidden !important;
          cursor: pointer !important;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, border-color 0.35s ease !important;
          background: #11141B !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          padding: 1.15rem 1.15rem 1.15rem !important;
        }

        .blueprint-space-card:hover {
          transform: translateY(-6px);
          border-color: rgba(221, 167, 82, 0.7) !important;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(221, 167, 82, 0.25) !important;
        }

        .blueprint-card-media-box {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
          z-index: 1 !important;
        }

        .blueprint-space-img {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .blueprint-space-card:hover .blueprint-space-img {
          transform: scale(1.06);
        }

        .blueprint-card-vignette {
          position: absolute !important;
          inset: 0 !important;
          background: linear-gradient(
            180deg,
            rgba(6, 9, 15, 0.18) 0%,
            rgba(6, 9, 15, 0.04) 35%,
            rgba(6, 9, 15, 0.55) 100%
          ) !important;
          pointer-events: none !important;
          z-index: 2 !important;
        }

        /* Top Bar */
        .blueprint-card-top-bar {
          position: relative !important;
          z-index: 3 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          width: 100% !important;
        }

        .blueprint-floor-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.4rem 0.85rem;
          border-radius: 9999px;
          font-family: var(--font-heading);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          background: rgba(10, 14, 22, 0.72);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4);
        }

        .blueprint-floor-pill .pill-icon {
          color: var(--gold-primary, #DDA752);
        }


        /* Floating Frosted Glass Bottom Overlay */
        .blueprint-space-glass-overlay {
          position: relative !important;
          z-index: 3 !important;
          background: rgba(12, 17, 28, 0.78) !important;
          backdrop-filter: blur(24px) saturate(210%) contrast(108%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(210%) contrast(108%) !important;
          border: 1px solid rgba(255, 255, 255, 0.22) !important;
          border-radius: 18px !important;
          padding: 1.15rem 1.15rem 1rem !important;
          box-shadow: 
            0 16px 36px rgba(0, 0, 0, 0.45),
            0 4px 12px rgba(0, 0, 0, 0.2),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.55) !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.75rem !important;
          box-sizing: border-box !important;
        }

        .blueprint-space-text-wrap {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .blueprint-space-meta {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--gold-primary, #DDA752);
          text-transform: uppercase;
          font-family: var(--font-heading);
        }

        .meta-icon-gold {
          color: var(--gold-primary, #DDA752);
        }

        .blueprint-space-title {
          font-family: var(--font-heading);
          font-size: 1.125rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          line-height: 1.25;
          letter-spacing: -0.015em;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .blueprint-space-specs-count {
          font-size: 0.75rem;
          color: var(--text-muted, #94A3B8);
          margin: 0;
          font-weight: 500;
        }

        .blueprint-space-action-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.65rem;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }

        .action-row-label {
          font-size: 0.78125rem;
          font-weight: 700;
          color: var(--gold-primary, #DDA752);
        }

        .action-circle-bubble {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(221, 167, 82, 0.15);
          border: 1px solid var(--gold-border, rgba(221, 167, 82, 0.4));
          color: var(--gold-primary, #DDA752);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .blueprint-space-card:hover .action-circle-bubble {
          background: var(--gold-primary, #DDA752);
          color: #0A0C10;
          transform: translateX(2px);
        }

        /* -------------------------------------------------------------
           Footer Info Notice Bar
        ------------------------------------------------------------- */
        .space-footer-notice-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(14, 18, 28, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 0.85rem 1.25rem;
          gap: 1.25rem;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          flex-wrap: wrap;
        }

        .notice-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78125rem;
          color: var(--text-muted, #94A3B8);
          flex: 1;
          min-width: 250px;
        }

        .notice-icon-gold {
          color: var(--gold-primary, #DDA752);
          flex-shrink: 0;
        }

        .btn-print-spec-dossier {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(221, 167, 82, 0.12);
          border: 1px solid var(--gold-border, rgba(221, 167, 82, 0.4));
          color: var(--gold-primary, #DDA752);
          padding: 0.5rem 1.15rem;
          border-radius: 9999px;
          font-size: 0.78125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-print-spec-dossier:hover {
          background: var(--gold-primary, #DDA752);
          color: #0A0C10;
        }

        /* -------------------------------------------------------------
           Liquid Glass Pop-Up Modal (Inspector)
        ------------------------------------------------------------- */
        .zone-glass-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          background: rgba(4, 7, 14, 0.86) !important;
          backdrop-filter: blur(28px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(28px) saturate(180%) !important;
          z-index: 9999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 1.5rem !important;
          box-sizing: border-box !important;
          overscroll-behavior: contain !important;
        }

        .zone-glass-modal-card {
          position: relative;
          width: 100%;
          max-width: 680px;
          height: 88vh;
          max-height: 800px;
          background: linear-gradient(
            155deg,
            rgba(18, 24, 38, 0.95) 0%,
            rgba(10, 14, 24, 0.98) 100%
          );
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 26px;
          overflow: hidden;
          box-shadow: 
            0 32px 80px rgba(0, 0, 0, 0.85),
            0 0 0 1px rgba(255, 255, 255, 0.08),
            inset 0 1.5px 2px rgba(255, 255, 255, 0.45);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          overscroll-behavior: contain;
        }

        .glass-modal-hero {
          position: relative;
          width: 100%;
          height: 230px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .glass-modal-hero-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .glass-modal-hero-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 14, 24, 0.2) 0%,
            rgba(10, 14, 24, 0.6) 50%,
            #0D121E 100%
          );
        }

        .glass-modal-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(10, 14, 24, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 10;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .glass-modal-close-btn:hover {
          background: var(--gold-primary, #DDA752);
          color: #0A0C10;
          border-color: var(--gold-primary, #DDA752);
        }

        .glass-modal-hero-info {
          position: absolute;
          bottom: 1.35rem;
          left: 1.5rem;
          right: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 4;
        }

        .glass-modal-pill-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .glass-modal-pill-gold {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(221, 167, 82, 0.18);
          border: 1px solid var(--gold-border, rgba(221, 167, 82, 0.4));
          color: var(--gold-primary, #DDA752);
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .glass-modal-pill-emerald {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(16, 185, 129, 0.18);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34D399;
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .glass-modal-heading {
          font-family: var(--font-heading);
          font-size: clamp(1.3rem, 2vw, 1.6rem);
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        /* Modal Body Scroll */
        .glass-modal-body-scroll {
          padding: 1.5rem 1.65rem;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overscroll-behavior: contain !important;
          touch-action: pan-y !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .glass-modal-body-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .glass-modal-body-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }

        .glass-modal-body-scroll::-webkit-scrollbar-thumb {
          background: rgba(221, 167, 82, 0.35);
          border-radius: 9999px;
        }

        .glass-modal-body-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--gold-primary, #DDA752);
        }

        .glass-modal-specs-header {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .glass-modal-eyebrow {
          font-family: var(--font-heading);
          font-size: 0.65625rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--gold-primary, #DDA752);
          text-transform: uppercase;
        }

        .glass-modal-subheading {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
        }

        .glass-modal-trades-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .glass-spec-trade-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.95rem 1.15rem;
          border-radius: 14px;
          transition: border-color 0.2s ease, background 0.2s ease;
        }

        .glass-spec-trade-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(221, 167, 82, 0.4);
        }

        .glass-spec-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(221, 167, 82, 0.14);
          border: 1px solid var(--gold-border, rgba(221, 167, 82, 0.4));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .spec-gold-icon {
          color: var(--gold-primary, #DDA752);
        }

        .glass-spec-content {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }

        .glass-spec-trade-name {
          font-size: 0.875rem;
          font-weight: 700;
          color: #FFFFFF;
        }

        .glass-spec-trade-detail {
          font-size: 0.78125rem;
          color: var(--text-muted, #94A3B8);
          line-height: 1.4;
        }

        .glass-spec-installed-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.32rem 0.75rem;
          border-radius: 9999px;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .glass-spec-installed-pill.badge-emerald {
          color: #34D399;
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid rgba(16, 185, 129, 0.38);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
        }

        .glass-spec-installed-pill.badge-gold {
          color: #FCD34D;
          background: rgba(221, 167, 82, 0.14);
          border: 1px solid rgba(221, 167, 82, 0.38);
          box-shadow: 0 2px 8px rgba(221, 167, 82, 0.15);
        }

        .glass-spec-installed-pill.badge-blue {
          color: #60A5FA;
          background: rgba(59, 130, 246, 0.14);
          border: 1px solid rgba(59, 130, 246, 0.38);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
        }

        .glass-spec-installed-pill.badge-gray {
          color: #94A3B8;
          background: rgba(148, 163, 184, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.25);
        }

        /* Quality Stamp Card */
        .glass-modal-certification-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(221, 167, 82, 0.08);
          border: 1px solid var(--gold-border, rgba(221, 167, 82, 0.35));
          border-radius: 14px;
          padding: 1rem 1.25rem;
        }

        .cert-shield-icon {
          color: var(--gold-primary, #DDA752);
          flex-shrink: 0;
        }

        .cert-info-block {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .cert-heading {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--gold-primary, #DDA752);
        }

        .cert-body {
          font-size: 0.75rem;
          color: var(--text-muted, #94A3B8);
          line-height: 1.4;
        }

        /* Modal Footer Bar */
        .glass-modal-footer {
          padding: 1.15rem 1.65rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(10, 14, 24, 0.8);
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }

        .btn-glass-modal-print {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(221, 167, 82, 0.14);
          border: 1px solid var(--gold-border, rgba(221, 167, 82, 0.4));
          color: var(--gold-primary, #DDA752);
          padding: 0.55rem 1.15rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-glass-modal-print:hover {
          background: var(--gold-primary, #DDA752);
          color: #0A0C10;
        }

        .btn-glass-modal-close {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          padding: 0.55rem 1.25rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-glass-modal-close:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        @media (max-width: 768px) {
          .space-header-row {
            flex-direction: column;
            align-items: stretch;
          }
          .space-controls-group {
            justify-content: space-between;
          }
          .blueprint-space-card {
            flex: 0 0 285px !important;
            width: 285px !important;
            min-width: 285px !important;
            max-width: 285px !important;
            height: 420px !important;
          }
        }

        /* ─── LIGHT MODE OVERRIDES ─────────────────────────────────── */
        [data-theme="light"] .blueprint-inspector-section {
          background: transparent;
        }

        [data-theme="light"] .floor-filter-strip {
          background: rgba(255, 255, 255, 0.7);
          border-color: rgba(0, 0, 0, 0.1);
        }

        [data-theme="light"] .floor-tab-btn {
          color: var(--text-muted);
        }

        [data-theme="light"] .floor-tab-btn:hover,
        [data-theme="light"] .floor-tab-btn.active {
          color: #0D1117;
        }

        [data-theme="light"] .slider-arrow-btn {
          background: rgba(255, 255, 255, 0.85);
          border-color: rgba(0, 0, 0, 0.15);
          color: var(--text-secondary);
        }

        [data-theme="light"] .slider-arrow-btn:hover {
          background: var(--gold-primary);
          color: #fff;
        }

        [data-theme="light"] .blueprint-space-card {
          background: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
        }

        [data-theme="light"] .blueprint-space-card:hover {
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.12), 0 0 24px rgba(212, 160, 52, 0.2) !important;
        }

        [data-theme="light"] .blueprint-card-top-bar {
          background: transparent;
        }

        [data-theme="light"] .blueprint-floor-pill {
          background: rgba(255, 255, 255, 0.85);
          border-color: rgba(0, 0, 0, 0.15);
          color: var(--text-secondary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        [data-theme="light"] .blueprint-card-vignette {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.0) 30%,
            rgba(0, 0, 0, 0.35) 100%
          ) !important;
        }

        [data-theme="light"] .blueprint-space-glass-overlay {
          background: rgba(255, 255, 255, 0.88) !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.9) !important;
        }

        [data-theme="light"] .blueprint-space-title {
          color: #0D1117 !important;
        }

        [data-theme="light"] .blueprint-space-specs-count {
          color: var(--text-muted) !important;
        }

        [data-theme="light"] .blueprint-inspect-link {
          color: var(--gold-dark, #B8860B) !important;
        }

        [data-theme="light"] .inspect-link-arrow {
          background: rgba(212, 160, 52, 0.12);
          border-color: rgba(212, 160, 52, 0.3);
          color: var(--gold-dark, #B8860B);
        }

        /* Modal light mode */
        [data-theme="light"] .zone-glass-modal-backdrop {
          background: rgba(15, 23, 42, 0.45);
        }

        [data-theme="light"] .zone-glass-modal-card {
          background: linear-gradient(155deg, #ffffff 0%, #F4F1EA 100%);
          border-color: rgba(0, 0, 0, 0.1);
          box-shadow: 0 32px 80px rgba(0,0,0,0.2), inset 0 1.5px 2px rgba(255,255,255,0.9);
        }

        [data-theme="light"] .glass-modal-hero-gradient {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            #F4F1EA 100%
          );
        }

        [data-theme="light"] .glass-modal-close-btn {
          background: rgba(255, 255, 255, 0.85);
          border-color: rgba(0, 0, 0, 0.15);
          color: #0D1117;
        }

        [data-theme="light"] .glass-modal-body {
          background: transparent;
        }

        [data-theme="light"] .zone-detail-trade-card {
          background: rgba(255, 255, 255, 0.8);
          border-color: rgba(0, 0, 0, 0.08);
        }

        [data-theme="light"] .zone-detail-trade-card:hover {
          border-color: rgba(212, 160, 52, 0.4);
        }

        [data-theme="light"] .trade-name-label {
          color: #0D1117;
        }

        [data-theme="light"] .trade-spec-text {
          color: var(--text-secondary);
        }

        [data-theme="light"] .glass-modal-footer {
          background: rgba(244, 241, 234, 0.9);
          border-top-color: rgba(0, 0, 0, 0.08);
        }

        [data-theme="light"] .btn-glass-modal-close {
          background: rgba(0, 0, 0, 0.06);
          border-color: rgba(0, 0, 0, 0.12);
          color: #0D1117;
        }

        [data-theme="light"] .btn-glass-modal-close:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        [data-theme="light"] .zone-cert-block {
          background: rgba(212, 160, 52, 0.08);
          border-color: rgba(212, 160, 52, 0.2);
        }
      `}</style>
    </div>
  );
};

export default ArchitecturalBlueprintInspector;
