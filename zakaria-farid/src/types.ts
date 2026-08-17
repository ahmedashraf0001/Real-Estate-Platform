export interface Property {
  id: string;
  title: string;
  location: string;
  district: string; // e.g. "New Cairo", "Ain Sokhna", "Sheikh Zayed", "North Coast", "Gouna", "Madinaty"
  estateName: string; // e.g. "Sodic East Estate"
  price: number;
  currency: string;
  beds: number;
  baths: number;
  sqm: number;
  propertyType: 'Standalone Villa' | 'Penthouse' | 'Mansion' | 'Apartment' | 'Chalet' | 'Duplex' | string;
  builtYear: number;
  featured?: boolean;
  images: string[];
  narrative: string;
  amenities: {
    icon: string;
    title: string;
  }[];
  mapCoordinates: { x: number; y: number; lat: number; lng: number }; // Geographic coordinates for Leaflet & interactive maps
  broker: {
    name: string;
    role: string;
    phone: string;
    email: string;
    avatar: string;
  };
  slug?: string;
  title_en?: string;
  title_ar?: string;
  description?: string;
  description_en?: string;
  description_ar?: string;
  price_egp?: number;
  type?: string;
  completion_status?: string;
  listing_status?: string;
  is_featured?: boolean;
  is_archived?: boolean | null;
  floor_number?: number | null;
  view?: string | null;
  finishing?: string;
  furnishing?: string;
  spec_layers?: any;
  property_images?: any[];
  property_amenities?: any[];
  created_at?: string;
}

export interface Neighborhood {
  id: string;
  name: string;
  description: string;
  image: string;
  avgPricePerSqm: string;
  propertyCount: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  comment: string;
  rating: number;
  avatar: string;
}

export interface FilterState {
  location: string;
  propertyType: string;
  priceTier: string;
  bedrooms: string;
  searchQuery?: string;
  sortBy: 'price-desc' | 'price-asc' | 'newest' | 'beds-desc';
}

declare global {
  interface Window {
    __masrLenis?: any;
  }
}
