const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('C:/Users/lyr1csan/Documents/project/new ui/src/views/PropertyDetailView.tsx');
const destPath = path.resolve('C:/Users/lyr1csan/Documents/project/Real-Estate-Platform/zakaria-farid/src/components/property/PropertyDetailView.tsx');

let content = fs.readFileSync(srcPath, 'utf8');

// 1. Add 'use client'
if (!content.startsWith("'use client'")) {
  content = "'use client';\n" + content;
}

// 2. Fix relative imports to point to zakaria-farid structure
content = content.replace("import { Property } from '../types';", "import { Property } from '@/types';");
content = content.replace("import { PROPERTIES } from '../data/properties';", "import { PROPERTIES } from '@/data/properties';");
content = content.replace("import { PropertyCard } from '../components/PropertyCard';", "import { PropertyCard } from './PropertyCard';");
content = content.replace("import { createCachedTileLayer } from '../utils/mapCache';", "import { createCachedTileLayer } from '@/lib/mapCache';");
content = content.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\nimport { useRouter } from 'next/navigation';");

// 3. Update interface to accept Next.js props
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

// 4. Update component signature to handle optional callbacks and fallback to router
const oldCompSig = `export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  propertyId,
  onBack,
  onSelectProperty,
  onOpenInquiry
}) => {
  const property = PROPERTIES.find((p) => p.id === propertyId) || PROPERTIES[0];`;

const newCompSig = `export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
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
  
  // Normalize property fields seamlessly
  const property: Property = {
    id: rawProperty.slug || rawProperty.id || 'the-obsidian-pavilion',
    title: rawProperty.title || rawProperty.title_en || 'The Obsidian Pavilion',
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
    featured: rawProperty.featured ?? true,
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
    narrative: rawProperty.narrative || rawProperty.description_en || rawProperty.description_ar || 'An extraordinary architectural masterpiece crafted with the highest standards of luxury and precision.',
    amenities: rawProperty.amenities || [
      { icon: 'waves', title: '25m Curved Infinity Pool' },
      { icon: 'flower-2', title: 'Manicured Botanical Gardens' },
      { icon: 'shield-check', title: '24/7 Armed Security & Concierge' },
      { icon: 'car', title: '4-Car Integrated Showroom Garage' },
      { icon: 'dumbbell', title: 'Private TechnoGym Studio Room' },
      { icon: 'building', title: 'Internal Hydraulic Otis Elevator' }
    ],
    mapCoordinates: rawProperty.mapCoordinates || (rawProperty.latitude && rawProperty.longitude ? { x: 38, y: 44, lat: Number(rawProperty.latitude), lng: Number(rawProperty.longitude) } : { x: 38, y: 44, lat: 30.0131, lng: 31.4913 }),
    broker: rawProperty.broker || {
      name: 'Sherif Badran',
      role: 'Senior Private Advisor',
      phone: '+20 100 999 8888',
      email: 's.badran@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
    }
  };

  const onBack = propOnBack || (() => router.push('/' + locale + '/properties'));
  const onSelectProperty = propOnSelectProperty || ((id: string) => router.push('/' + locale + '/properties/' + id));
  const onOpenInquiry = propOnOpenInquiry || ((type: string, propertyName?: string) => {
    window.location.href = 'https://wa.me/' + (property.broker?.phone || '+201009998888').replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hello, I am inquiring about ' + (propertyName || property.title));
  });`;

content = content.replace(oldCompSig, newCompSig);

// 5. Similar properties fallback
content = content.replace(
  "const similarProperties = PROPERTIES.filter((p) => p.id !== property.id).slice(0, 3);",
  "const similarProperties = (propSimilar && propSimilar.length > 0) ? propSimilar : PROPERTIES.filter((p: any) => p.id !== property.id).slice(0, 3);"
);

// Fix explicit types in maps & forEach
content = content.replace("property.images.forEach((src) => {", "property.images.forEach((src: string) => {");
content = content.replace("{property.images.map((imgUrl, idx) => (", "{property.images.map((imgUrl: string, idx: number) => (");
content = content.replace("{property.images.map((imgUrl, idx) => {", "{property.images.map((imgUrl: string, idx: number) => {");
content = content.replace("{property.images.map((thumb, idx) => (", "{property.images.map((thumb: string, idx: number) => (");
content = content.replace("{property.narrative.split('\\n\\n').map((paragraph, i) => (", "{property.narrative.split('\\n\\n').map((paragraph: string, i: number) => (");
content = content.replace("{specCategories.map((cat, idx) => (", "{specCategories.map((cat: any, idx: number) => (");
content = content.replace("{cat.items.map((item, i) => (", "{cat.items.map((item: string, i: number) => (");
content = content.replace("{travelEstimates.map((item, i) => {", "{travelEstimates.map((item: any, i: number) => {");
content = content.replace("{similarProperties.map((p, idx) => (", "{similarProperties.map((p: any, idx: number) => (");

fs.writeFileSync(destPath, content, 'utf8');
console.log('Successfully written exact new ui PropertyDetailView to zakaria-farid. File size:', fs.statSync(destPath).size);
