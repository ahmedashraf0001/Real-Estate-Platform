const fs = require('fs');
const path = require('path');

const newUiFile = path.resolve('c:/Users/lyr1csan/Documents/project/new ui/src/views/PropertyDetailView.tsx');
const targetFile = path.resolve('c:/Users/lyr1csan/Documents/project/Real-Estate-Platform/zakaria-farid/src/components/property/PropertyDetailView.tsx');

let content = fs.readFileSync(newUiFile, 'utf8');

// 1. Add 'use client' and adapt imports
content = `'use client';\n` + content;
content = content.replace("import L from 'leaflet';", `let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}`);
content = content.replace("import { Property } from '../types';", "import { Property } from '@/types';\nimport { useRouter } from 'next/navigation';");
content = content.replace("import { PROPERTIES } from '../data/properties';", "import { PROPERTIES } from '@/data/properties';");
content = content.replace("import { PropertyCard } from '../components/PropertyCard';", "import { PropertyCard } from './PropertyCard';");
content = content.replace("import { createCachedTileLayer } from '../utils/mapCache';", "import { createCachedTileLayer } from '@/lib/mapCache';");

// 2. Update interface for Next.js props
const oldInterface = `interface PropertyDetailViewProps {
  propertyId: string;
  onBack: () => void;
  onSelectProperty: (id: string) => void;
  onOpenInquiry: (type: string, propertyName?: string) => void;
}`;

const newInterface = `interface PropertyDetailViewProps {
  propertyId?: string;
  property?: Property | any;
  similarProperties?: (Property | any)[];
  locale?: string;
  onBack?: () => void;
  onSelectProperty?: (id: string) => void;
  onOpenInquiry?: (type: string, propertyName?: string) => void;
}`;

content = content.replace(oldInterface, newInterface);

// 3. Update component header and data normalization
const oldCompHeader = `export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  onBack,
  onSelectProperty,
  onOpenInquiry
}) => {
  const property = PROPERTIES.find((p) => p.id === propertyId) || PROPERTIES[0];`;

const newCompHeader = `export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  property: propProperty,
  similarProperties: propSimilar,
  locale = 'en',
  onBack: propOnBack,
  onSelectProperty: propOnSelectProperty,
  onOpenInquiry: propOnOpenInquiry
}) => {
  const router = useRouter();
  const isAr = locale === 'ar';
  const effectiveId = propertyId || propProperty?.slug || propProperty?.id;
  const rawProperty = propProperty || PROPERTIES.find((p: any) => p.id === effectiveId) || PROPERTIES[0];

  const onBack = propOnBack || (() => router.push('/' + locale + '/properties'));
  const onSelectProperty = propOnSelectProperty || ((id: string) => router.push('/' + locale + '/properties/' + id));
  const onOpenInquiry = propOnOpenInquiry || ((type: string, propertyName?: string) => {
    const phone = (rawProperty.broker?.phone || '+201009970776').replace(/[^0-9]/g, '');
    window.location.href = \`https://wa.me/\${phone}?text=\${encodeURIComponent('Hello, I am inquiring about ' + (propertyName || rawProperty.title_en || rawProperty.title))}\`;
  });

  const rawNarrative = isAr 
    ? (rawProperty.description_ar || rawProperty.narrative || rawProperty.description_en || '')
    : (rawProperty.description_en || rawProperty.narrative || rawProperty.description_ar || '');

  // Strip raw HTML tags cleanly from narrative if entered via rich-text editor
  const cleanNarrative = rawNarrative
    .replace(/<\\/p>\\s*<p>/gi, '\\n\\n')
    .replace(/<br\\s*\\/?>/gi, '\\n')
    .replace(/<[^>]*>/g, '')
    .trim() || (isAr ? 'تحفة معمارية استثنائية صُممت بأعلى معايير الفخامة والدقة الهندسية.' : 'An extraordinary architectural masterpiece crafted with the highest standards of luxury and precision.');

  const property: Property = {
    id: rawProperty.slug || rawProperty.id || 'the-obsidian-pavilion',
    slug: rawProperty.slug || rawProperty.id || 'the-obsidian-pavilion',
    title: isAr ? (rawProperty.title_ar || rawProperty.title) : (rawProperty.title_en || rawProperty.title || 'The Obsidian Pavilion'),
    location: rawProperty.location || 'Sodic East Estate, New Cairo, Egypt',
    district: rawProperty.district || (rawProperty.location ? rawProperty.location.split(',')[0].trim() : 'New Cairo'),
    estateName: rawProperty.estateName || (rawProperty.district ? rawProperty.district : 'Four Seasons Privado'),
    price: rawProperty.price || rawProperty.price_egp || 42500000,
    currency: rawProperty.currency || (isAr ? 'ج.م' : 'EGP'),
    beds: rawProperty.beds || rawProperty.bedrooms || 5,
    baths: rawProperty.baths || rawProperty.bathrooms || 6,
    sqm: rawProperty.sqm || rawProperty.area_sqm || 720,
    propertyType: rawProperty.propertyType || rawProperty.type || 'Standalone Villa',
    builtYear: rawProperty.builtYear || rawProperty.year_built || 2025,
    featured: rawProperty.featured ?? rawProperty.is_featured ?? true,
    images: (rawProperty.images && rawProperty.images.length > 0) 
      ? rawProperty.images 
      : (rawProperty.property_images && rawProperty.property_images.length > 0)
        ? rawProperty.property_images.map((img: any) => typeof img === 'string' ? img : img.url)
        : [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
            'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85',
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
            'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85'
          ],
    narrative: cleanNarrative,
    amenities: rawProperty.amenities || [
      { icon: 'waves', title: isAr ? 'مسبح لا متناهي مدفأ' : 'Heated Infinity Pool' },
      { icon: 'flower-2', title: isAr ? 'حدائق نباتية منسقة' : 'Manicured Botanical Gardens' },
      { icon: 'shield-check', title: isAr ? 'أمن وحراسة مشددة ٢٤/٧' : '24/7 Armed Security & Concierge' },
      { icon: 'car', title: isAr ? 'جراج يتسع لـ ٤ سيارات' : '4-Car Integrated Garage' },
      { icon: 'dumbbell', title: isAr ? 'صالة رياضية خاصة' : 'Private TechnoGym Studio' },
      { icon: 'building', title: isAr ? 'مصعد هيدروليكي خاص' : 'Internal Hydraulic Elevator' }
    ],
    mapCoordinates: rawProperty.mapCoordinates || (rawProperty.latitude && rawProperty.longitude ? { x: 38, y: 44, lat: Number(rawProperty.latitude), lng: Number(rawProperty.longitude) } : { x: 38, y: 44, lat: 30.0131, lng: 31.4913 }),
    broker: rawProperty.broker || {
      name: isAr ? 'زكريا فريد' : 'Zakaria Farid',
      role: isAr ? 'المالك المباشر والمستشار الأول' : 'Senior Acquisition Lead',
      phone: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ? \`+\${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}\` : '+201009970776',
      email: 'contact@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80'
    }
  };`;

content = content.replace(oldCompHeader, newCompHeader);

// 4. Update similar properties reference
content = content.replace(
  'const similarProperties = PROPERTIES.filter((p) => p.id !== property.id).slice(0, 3);',
  'const similarProperties = propSimilar || PROPERTIES.filter((p) => p.id !== property.id).slice(0, 3);'
);

// 5. Build dynamic 4-card Master Specification Matrix that intelligently integrates custom amenities, finishing, and floor/view
const oldSpecCategories = `  const specCategories = [
    {
      category: 'Thermal & Glazing Architecture',
      items: [
        'Floor-to-ceiling triple glazed thermal acoustic glass',
        'Imported Italian travertine and honed limestone facade',
        '4.2m double-height foyer ceiling volume'
      ]
    },
    {
      category: 'Private Grounds & Landscape',
      items: [
        'Heated infinity edge swimming pool with marble coping',
        'Private manicured zen gardens with subterranean drainage',
        'Dedicated covered carport for 4 executive vehicles'
      ]
    },
    {
      category: 'Smart Systems & Security',
      items: [
        'KNX automated smart home climate & lighting automation',
        'Integrated biometric access & 24/7 guarded gatehouse',
        'Dedicated server room with redundant backup generator'
      ]
    },
    {
      category: 'Private Quarters & Hospitality',
      items: [
        'Master wing with dual walk-in dressing suites & spa bath',
        'Independent private service quarters with en-suite bath',
        'Chef show kitchen with separate commercial preparation pantry'
      ]
    }
  ];`;

const newSpecCategories = `  // Price per SQM calculation
  const pricePerSqm = property.sqm && property.sqm > 0 
    ? Math.round(property.price / property.sqm).toLocaleString() 
    : null;

  // Curated 4-Card Master Specification Matrix dynamically incorporating amenities & finishing
  const specCategories = useMemo(() => {
    const customAmenities = rawProperty.property_amenities || rawProperty.amenities || [];
    const customItems = customAmenities.map((am: any) => {
      if (typeof am === 'string') return am;
      return isAr ? (am.amenity_ar || am.amenity_en || am.title) : (am.amenity_en || am.amenity_ar || am.title);
    }).filter(Boolean);

    const viewItem = rawProperty.view 
      ? (isAr ? \`الإطلالة والواجهة: \${rawProperty.view}\` : \`Primary Exposure: \${rawProperty.view}\`)
      : (isAr ? 'إطلالة بانورامية مفتوحة على المساحات الخضراء والبحيرات' : 'Panoramic open vista overlooking curated green estate');

    const finishingItem = rawProperty.finishing === 'red_brick'
      ? (isAr ? 'مستوى التنفيذ: على الهيكل الخرساني (طوب أحمر للمعاينة والتصميم)' : 'Execution Grade: Core & Shell (Red Brick bespoke canvas)')
      : (isAr ? 'مستوى التشطيب: تشطيب فندقي فاخر بالكامل (ألترا سوبر لوكس جاهز للسكن)' : 'Finishing Standard: Turnkey ultra-luxury specification with imported marble');

    const floorItem = rawProperty.floor_number !== undefined && rawProperty.floor_number !== null
      ? (rawProperty.floor_number === 0 
          ? (isAr ? 'التكوين الرأسي: الطابق الأرضي مع حديقة ومسبح خاص' : 'Verticality: Ground level with private manicured garden & pool')
          : (isAr ? \`المستوى: الطابق رقم \${rawProperty.floor_number} بإطلالة مرتفعة\` : \`Level: Floor \${rawProperty.floor_number} with elevated panoramic perspective\`))
      : (isAr ? 'التكوين الرأسي: فيلا مستقلة متعددة الطوابق (أرضي + أول + روف تراس)' : 'Verticality: Multi-level estate (Ground + First Floor + Open Sky Terrace)');

    return [
      {
        category: isAr ? 'العمارة والواجهات الزجاجية' : 'Thermal & Glazing Architecture',
        items: [
          'Floor-to-ceiling triple glazed acoustic glass' + (isAr ? ' (زجاج عازل ثلاثي)' : ''),
          viewItem,
          floorItem
        ]
      },
      {
        category: isAr ? 'المساحات والحدائق والترفيه' : 'Private Grounds & Landscape',
        items: customItems.length > 0 ? customItems.slice(0, 3) : [
          isAr ? 'حمام سباحة لا متناهي مدفأ مع حواف رخامية' : 'Heated infinity edge swimming pool with marble coping',
          isAr ? 'حدائق يابانية منسقة مع شبكة تصريف مياه تحت الأرض' : 'Private manicured zen gardens with subterranean drainage',
          isAr ? 'جراج تنفيذي مغطى مخصص لـ ٤ سيارات فارهة' : 'Dedicated covered carport for 4 executive vehicles'
        ]
      },
      {
        category: isAr ? 'الأنظمة الذكية والأمان' : 'Smart Systems & Security',
        items: customItems.length > 3 ? customItems.slice(3, 6) : [
          isAr ? 'نظام KNX الذكي للتحكم بالحرارة والإضاءة والستائر' : 'KNX automated smart home climate & lighting automation',
          isAr ? 'بوابات أمنية بيومترية وحراسة مشددة على مدار ٢٤ ساعة' : 'Integrated biometric access & 24/7 guarded gatehouse',
          isAr ? 'غرفة خوادم مخصصة ومولد كهرباء احتياطي فوري' : 'Dedicated server room with redundant backup generator'
        ]
      },
      {
        category: isAr ? 'الأجنحة والتشطيب الهندسي' : 'Private Quarters & Engineering',
        items: [
          finishingItem,
          isAr ? 'جناح نوم رئيسي ملكي مع غرفتي ملابس وحمام سبا خاص' : 'Master wing with dual walk-in dressing suites & spa bath',
          isAr ? 'مطبخ رئيسي للشيف ومخزن تحضير منفصل مع غرف للخدمات' : 'Chef show kitchen with separate commercial preparation pantry'
        ]
      }
    ];
  }, [rawProperty.property_amenities, rawProperty.amenities, rawProperty.view, rawProperty.finishing, rawProperty.floor_number, isAr]);`;

content = content.replace(oldSpecCategories, newSpecCategories);

// 6. Refine the Price Card in the top header to include price per SQM cleanly
const oldPriceCard = `            <div className="property-price-card">
              <span className="price-label">ACQUISITION VALUE</span>
              <div className="price-value">
                {formattedPrice} <span className="price-currency">{property.currency}</span>
              </div>
              <span className="price-tax-note">Freehold Escrow Verified • 0% Hidden Fees</span>
            </div>`;

const newPriceCard = `            <div className="property-price-card">
              <span className="price-label">{isAr ? 'قيمة الاستحواذ المعتمدة' : 'ACQUISITION VALUE'}</span>
              <div className="price-value">
                {formattedPrice} <span className="price-currency">{property.currency}</span>
              </div>
              <span className="price-tax-note">
                {pricePerSqm ? \`~ \${pricePerSqm} \${property.currency} / m² • \` : ''}
                {isAr ? 'تسجيل عقاري موثق • ٠٪ عمولات خفية' : 'Freehold Escrow Verified • 0% Hidden Fees'}
              </span>
            </div>`;

content = content.replace(oldPriceCard, newPriceCard);

// 7. Fix type annotation on PropertyCard in similar section
content = content.replace(
  'onSelect={onSelectProperty}',
  'onSelect={(id) => onSelectProperty(id || p.id || p.slug)}'
);

// 8. Fix type annotations on specCategories.map
content = content.replace(
  '{specCategories.map((cat, idx) => (',
  '{specCategories.map((cat: any, idx: number) => ('
);
content = content.replace(
  '{cat.items.map((item, i) => (',
  '{cat.items.map((item: string, i: number) => ('
);

// 9. Fix Leaflet zoom position & styling
content = content.replace("zoomControl: true,", "zoomControl: false,");
content = content.replace("attributionControl: false\n    });", `attributionControl: false\n    });\n\n    L.control.zoom({ position: 'bottomright' }).addTo(map);`);

content = content.replace(
  "/* 5. Main Content Detail Layout */",
  `/* Leaflet Zoom Control Styling */
        .sanctum-map-frame .leaflet-control-zoom {
          border: 1px solid var(--border-subtle) !important;
          border-radius: 10px !important;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
          margin-bottom: 1.25rem !important;
          margin-right: 1.25rem !important;
        }

        .sanctum-map-frame .leaflet-control-zoom a {
          background: rgba(13, 17, 23, 0.85) !important;
          color: #DDA752 !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          transition: all 0.2s ease;
        }

        .sanctum-map-frame .leaflet-control-zoom a:hover {
          background: rgba(221, 167, 82, 0.2) !important;
          color: #FFFFFF !important;
        }

        /* 5. Main Content Detail Layout */`
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully wrote pristine, clean PropertyDetailView.tsx matching 100% luxury standards!');
