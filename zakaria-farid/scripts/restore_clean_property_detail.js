const fs = require('fs');
const path = require('path');

const newUiFile = path.resolve('c:/Users/lyr1csan/Documents/project/new ui/src/views/PropertyDetailView.tsx');
const targetFile = path.resolve('c:/Users/lyr1csan/Documents/project/Real-Estate-Platform/zakaria-farid/src/components/property/PropertyDetailView.tsx');

let content = fs.readFileSync(newUiFile, 'utf8');

// Adapt imports
content = content.replace("import L from 'leaflet';", `let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}`);
content = content.replace("import { Property } from '../types';", "import { Property } from '@/types';\nimport { useRouter } from 'next/navigation';");
content = content.replace("import { PROPERTIES } from '../data/properties';", "import { PROPERTIES } from '@/data/properties';");
content = content.replace("import { PropertyCard } from '../components/PropertyCard';", "import { PropertyCard } from './PropertyCard';");
content = content.replace("import { createCachedTileLayer } from '../utils/mapCache';", "import { createCachedTileLayer } from '@/lib/mapCache';");

// Update interface
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

// Update component header
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
  const cleanNarrative = rawNarrative.replace(/<[^>]*>/g, '').trim() || 'An extraordinary architectural masterpiece crafted with the highest standards of luxury and precision.';

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

// Update similar properties line
content = content.replace(
  'const similarProperties = PROPERTIES.filter((p) => p.id !== property.id).slice(0, 3);',
  'const similarProperties = propSimilar || PROPERTIES.filter((p) => p.id !== property.id).slice(0, 3);'
);

// Fix Leaflet zoom position in SanctumSatelliteMap
content = content.replace("zoomControl: true,", "zoomControl: false,");
content = content.replace("attributionControl: false\n    });", `attributionControl: false\n    });\n\n    L.control.zoom({ position: 'bottomright' }).addTo(map);`);

// Fix word spacing and letter spacing in main title to prevent cramped font
content = content.replace(
  "letter-spacing: -0.025em;\n          line-height: 1.15;",
  "letter-spacing: -0.008em;\n          word-spacing: 0.04em;\n          line-height: 1.15;"
);

// Fix Leaflet zoom styling for luxury glass aesthetic
content = content.replace(
  "/* 5. Main Content Detail Layout */",
  `/* Map Zoom Controls */
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
console.log('Successfully restored clean, pure PropertyDetailView.tsx matching the elegant design system!');
