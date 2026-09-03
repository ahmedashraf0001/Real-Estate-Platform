import type { ZoneInstance } from '@/lib/layering';

export type PropertyType = 'apartment' | 'building' | 'garage' | 'villa' | 'duplex' | 'penthouse' | 'townhouse' | 'commercial';

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

export interface PropertyVideo {
  id: string;
  url: string;
  title_en?: string;
  title_ar?: string;
  thumbnail?: string;
  duration?: string;
  category?: 'tour' | 'drone' | 'cad' | 'spec';
}

export type BuildingSaleMode = 'whole_building' | 'individual_units' | 'both_flexible';

export interface BuildingUnitItem {
  unit_id: string;
  unit_number: string; // e.g. "Flat 1A", "شقة 101"
  floor: number;
  area_sqm: number;
  bedrooms: number;
  bathrooms: number;
  price_egp: number; // Base price
  tax_amount_egp?: number; // Manual tax per apartment (not static)
  tax_description?: string; // e.g. "ضريبة ورسوم محددة يدوياً"
  status: 'available' | 'reserved' | 'contracted';
  contract_id?: string;
  contract_number?: string;
  buyer_name?: string;
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
  calcom_event_link?: string | null;
  videos?: PropertyVideo[];
  video_url?: string | null;
  spec_layers?: ZoneInstance[] | SpecLayer[] | any;
  property_images?: PropertyImage[];
  property_amenities?: PropertyAmenity[];
  partner_splits?: Array<{ partner_name: string; share_percentage: number }>;
  sale_mode?: BuildingSaleMode;
  total_units_count?: number;
  building_units?: BuildingUnitItem[];
  parent_property_id?: string | null;
  tax_amount_egp?: number;
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
  bookings?: Booking[];
}

export type BookingStatus =
  | 'viewing_scheduling_request'
  | 'cancelled'
  | 'rescheduled'
  | 'completed';

export interface Booking {
  id: string;
  lead_id: string;
  property_id: string | null;
  calcom_uid: string;
  agent_ref?: string | null;
  event_type_slug?: string | null;
  start_time: string | null;
  end_time: string | null;
  status: BookingStatus | string;
  attendee_name?: string | null;
  attendee_email?: string | null;
  attendee_phone?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
  property?: Pick<Property, 'id' | 'title_en' | 'title_ar' | 'slug'>;
}
