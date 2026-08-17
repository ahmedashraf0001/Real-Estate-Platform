import type { ZoneInstance } from '@/lib/layering';

export type PropertyType = 'villa' | 'apartment' | 'townhouse' | 'duplex' | 'chalet';
export type CompletionStatus = 'ready' | 'off_plan';
export type ListingStatus = 'active' | 'under_offer' | 'sold' | 'archived';

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  alt_text_en: string | null;
  alt_text_ar: string | null;
  sort_order: number;
}

export interface PropertyAmenity {
  id: string;
  property_id: string;
  amenity_en: string;
  amenity_ar: string;
}

export interface SpecLayerItem {
  id: string;
  label_en: string;
  label_ar: string;
  details_en?: string;
  details_ar?: string;
  finishing_en?: string;
  finishing_ar?: string;
  image_ids?: string[];
}

export interface SpecLayer {
  layer_key: string;
  layer_label_en: string;
  layer_label_ar: string;
  items: SpecLayerItem[];
}

export interface Property {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  price_egp: number;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  type: PropertyType;
  location: string;
  latitude: number | null;
  longitude: number | null;
  completion_status: CompletionStatus;
  listing_status: ListingStatus;
  is_featured: boolean;
  is_archived?: boolean | null;
  created_at: string;
  view?: string | null;
  floor_number?: number | null;
  finishing?: string | null;
  furnishing?: string | null;
  spec_layers?: ZoneInstance[] | SpecLayer[] | any;
  property_images?: PropertyImage[];
  property_amenities?: PropertyAmenity[];
}

export interface Lead {
  id: string;
  property_id: string | null;
  name: string;
  email: string | null;
  phone: string;
  message: string | null;
  notes?: string | null;
  lost_reason?: string | null;
  stage?: string | null;
  stage_updated_at?: string | null;
  source?: string | null;
  entry_method?: string | null;
  is_archived?: boolean | null;
  created_at: string;
  property?: Pick<Property, 'id' | 'title_en' | 'title_ar' | 'slug'>;
}
