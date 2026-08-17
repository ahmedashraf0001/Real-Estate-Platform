import { Property, Neighborhood, Testimonial } from '@/types';

export const PROPERTIES: Property[] = [
  {
    id: 'the-obsidian-pavilion',
    title: 'The Obsidian Pavilion',
    location: 'Sodic East Estate, New Cairo, Egypt',
    district: 'New Cairo',
    estateName: 'Sodic East Estate',
    price: 42500000,
    currency: 'EGP',
    beds: 5,
    baths: 6,
    sqm: 720,
    propertyType: 'Standalone Villa',
    builtYear: 2025,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85'
    ],
    narrative: `The Obsidian Pavilion is a breathtaking exercise in contemporary organic brutalism. Built primarily with textured white Egyptian limestone and dynamic dark volcanic slabs, the estate stands as a testament to modern architectural heritage. Floating cantilevers create massive shaded terraces, sheltering full-height triple-glazed glass facade walls that frame spectacular desert sunset alignments.

Every interior coordinate flows seamlessly to the sprawling outside lagoons. Designed for elite privacy and state of the art wellness, the villa contains private spa chambers, a curated double-height grand gallery, and high-specification custom kitchen units imported from Milano.`,
    amenities: [
      { icon: 'waves', title: '25m Curved Infinity Pool' },
      { icon: 'flower-2', title: 'Manicured Botanical Gardens' },
      { icon: 'shield-check', title: '24/7 Armed Security & Concierge' },
      { icon: 'car', title: '4-Car Integrated Showroom Garage' },
      { icon: 'dumbbell', title: 'Private TechnoGym Studio Room' },
      { icon: 'building', title: 'Internal Hydraulic Otis Elevator' }
    ],
    mapCoordinates: { x: 38, y: 44, lat: 30.0131, lng: 31.4913 },
    broker: {
      name: 'Tarek Mansour',
      role: 'Director of Private Assets',
      phone: '+20 100 123 4567',
      email: 't.mansour@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80'
    }
  },
  {
    id: 'sokhna-sea-cliff-mansion',
    title: 'Sokhna Sea-Cliff Mansion',
    location: 'Monte Galala Peak, Ain Sokhna, Egypt',
    district: 'Ain Sokhna',
    estateName: 'Monte Galala Estate',
    price: 28000000,
    currency: 'EGP',
    beds: 4,
    baths: 5,
    sqm: 540,
    propertyType: 'Standalone Villa',
    builtYear: 2024,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=85'
    ],
    narrative: `Carved directly into the crimson granite elevations of the Galala plateau, this coastal sanctuary commands uninterrupted panoramic vistas of the Gulf of Suez. Featuring multi-tier cantilevered terraces, sea-facing infinity plunge pools, and floor-to-ceiling panoramic glass walls.

The master suite occupies its own secluded pavilion with an open-air rain shower and direct private cliff walk trail to the private marina below.`,
    amenities: [
      { icon: 'waves', title: 'Dual-Level Cliff Plunge Pools' },
      { icon: 'shield-check', title: 'Private Gated Mountain Access' },
      { icon: 'flower-2', title: 'Xeriscape Desert Flora Terraces' },
      { icon: 'building', title: 'Bespoke Italian Solar Glass' }
    ],
    mapCoordinates: { x: 78, y: 72, lat: 29.6010, lng: 32.3380 },
    broker: {
      name: 'Yasmine El-Shamy',
      role: 'Head of Coastal Portfolios',
      phone: '+20 100 876 5432',
      email: 'y.shamy@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
    }
  },
  {
    id: 'the-sky-palace-penthouse',
    title: 'The Sky Palace Penthouse',
    location: 'Zayed Central Park Tower, Sheikh Zayed, Egypt',
    district: 'Sheikh Zayed',
    estateName: 'Zayed Heights Park',
    price: 36000000,
    currency: 'EGP',
    beds: 4,
    baths: 4,
    sqm: 480,
    propertyType: 'Penthouse',
    builtYear: 2025,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85'
    ],
    narrative: `Rising 42 stories above the vibrant Sheikh Zayed district, this duplex penthouse commands 360-degree panoramic views over the Great Pyramids and modern city skyline. Featuring a double-height grand gallery salon, private rooftop heated infinity pool, and custom marble staircase.`,
    amenities: [
      { icon: 'waves', title: 'Private Sky Infinity Pool' },
      { icon: 'shield-check', title: 'Private Keyed Elevator Access' },
      { icon: 'car', title: '3 Underground VIP Parking Bays' },
      { icon: 'building', title: 'Triple-Height 7.5m Ceilings' }
    ],
    mapCoordinates: { x: 22, y: 38, lat: 30.0489, lng: 30.9856 },
    broker: {
      name: 'Karim Mansour',
      role: 'Prime Residences Partner',
      phone: '+20 100 555 7777',
      email: 'k.mansour@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
    }
  },
  {
    id: 'north-coast-seaside-sanctuary',
    title: 'North Coast Seaside Sanctuary',
    location: 'Hacienda Bay Waters, North Coast, Egypt',
    district: 'North Coast',
    estateName: 'Hacienda Waters',
    price: 52000000,
    currency: 'EGP',
    beds: 6,
    baths: 7,
    sqm: 850,
    propertyType: 'Mansion',
    builtYear: 2024,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=85'
    ],
    narrative: `Direct beachfront Mediterranean estate offering private white sand access and turquoise sea views. Masterfully constructed with travertine marble and sustainable teak elements.`,
    amenities: [
      { icon: 'waves', title: 'Direct Private Beachfront Access' },
      { icon: 'flower-2', title: 'Pergola Shaded Dining Terraces' },
      { icon: 'shield-check', title: 'Private Gated Compound Security' }
    ],
    mapCoordinates: { x: 20, y: 15, lat: 30.9333, lng: 28.7500 },
    broker: {
      name: 'Yasmine El-Shamy',
      role: 'Head of Coastal Portfolios',
      phone: '+20 100 876 5432',
      email: 'y.shamy@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
    }
  },
  {
    id: 'gouna-water-sanctuary',
    title: 'Gouna Water Sanctuary',
    location: 'Marina West, El Gouna, Red Sea, Egypt',
    district: 'Gouna',
    estateName: 'Abu Tig Marina Estates',
    price: 31000000,
    currency: 'EGP',
    beds: 4,
    baths: 5,
    sqm: 510,
    propertyType: 'Standalone Villa',
    builtYear: 2024,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=85'
    ],
    narrative: `Designed by world-renowned architecture studios, this lagoon-front villa integrates seamless boat berthing, open-plan indoor/outdoor living, and expansive shaded courtyards.`,
    amenities: [
      { icon: 'waves', title: 'Private Boat Jetty & Lagoon Access' },
      { icon: 'shield-check', title: '24/7 Gouna Gated Security' },
      { icon: 'flower-2', title: 'Lush Tropical Courtyards' }
    ],
    mapCoordinates: { x: 88, y: 85, lat: 27.3949, lng: 33.6765 },
    broker: {
      name: 'Tarek Mansour',
      role: 'Director of Private Assets',
      phone: '+20 100 123 4567',
      email: 't.mansour@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80'
    }
  },
  {
    id: 'madinaty-four-seasons-mansion',
    title: 'Madinaty Four Seasons Mansion',
    location: 'Privado Gated Enclave, Madinaty, Egypt',
    district: 'Madinaty',
    estateName: 'Four Seasons Privado',
    price: 68000000,
    currency: 'EGP',
    beds: 7,
    baths: 8,
    sqm: 1150,
    propertyType: 'Mansion',
    builtYear: 2025,
    featured: true,
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85'
    ],
    narrative: `Palatial neoclassical grandeur reimagined. Features soaring 8-meter ceilings, marble colonnades, an Olympic-length outdoor swimming pool, and an expansive private banquet ballroom.`,
    amenities: [
      { icon: 'waves', title: '50m Olympic Sized Pool' },
      { icon: 'flower-2', title: '5,000 sqm Private Estate Grounds' },
      { icon: 'building', title: 'Serviced by Four Seasons Hospitality' }
    ],
    mapCoordinates: { x: 55, y: 35, lat: 30.1250, lng: 31.6250 },
    broker: {
      name: 'Sherif Badran',
      role: 'Senior Private Advisor',
      phone: '+20 100 999 8888',
      email: 's.badran@zakariafarid.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
    }
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-1',
    name: 'Karim El-Sewedy',
    role: 'Managing Director, Infrastructure Capital',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    comment: 'Zakaria Farid understood our need for absolute discretion and structural authenticity. The Obsidian Pavilion is nothing short of an architectural sculpture.',
    rating: 5
  },
  {
    id: 't-2',
    name: 'Nour Mansour',
    role: 'Principal, Contemporary Design Atelier',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    comment: 'The only real estate platform in the Middle East that treats architecture as high art. The private viewing experience with chauffeured inspection was impeccable.',
    rating: 5
  }
];

export const STATS = [
  { value: '2,500+', label: 'Curated Architectural Estates' },
  { value: '15+', label: 'Prestige Egyptian Destinations' },
  { value: '98%', label: 'Sovereign Client Satisfaction' },
  { value: '10+ Years', label: 'Ultra-Prime Advisory Authority' }
];

export const VALUE_PROPS = [
  {
    icon: 'video',
    title: 'Immersive Virtual Tours',
    description: 'Experience spatial flow and high-end finishes intimately through cinematic digital walkthroughs before booking physical inspections.'
  },
  {
    icon: 'shield',
    title: 'Rigorous Verification',
    description: 'Every structural layout, property deed, and architectural blueprint is fully authenticated by legal & structural audit experts.'
  },
  {
    icon: 'handshake',
    title: 'Elite Client Advisory',
    description: 'Our experienced real estate advisors represent your interests meticulously, offering hyper-tailored boutique purchase representation.'
  }
];
