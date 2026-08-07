import { createClient } from './server';
import type { Property, Lead, SpecLayer, SpecLayerItem } from './types';
import { buildZoneInstances, type PropertyTypeId, type GlobalFinishingState } from '@/lib/layering';

// ─── Properties ───────────────────────────────────────────────────

export async function getFeaturedProperties(): Promise<Property[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('properties')
    .select(`*, property_images(*)`)
    .eq('is_featured', true)
    .eq('listing_status', 'active')
    .order('created_at', { ascending: false })
    .limit(6);
  if (error) throw error;
  return (data as Property[]) ?? [];
}

export async function getAllProperties(params?: {
  location?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  type?: string;
  listing_status?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}): Promise<Property[]> {
  const supabase = await createClient();
  let query = supabase
    .from('properties')
    .select(`*, property_images(id, url, alt_text_en, alt_text_ar, sort_order)`);

  if (params?.location) query = query.ilike('location', `%${params.location}%`);
  if (params?.min_price) query = query.gte('price_egp', params.min_price);
  if (params?.max_price) query = query.lte('price_egp', params.max_price);
  if (params?.bedrooms) query = query.eq('bedrooms', params.bedrooms);
  if (params?.type) query = query.eq('type', params.type);
  if (params?.listing_status) query = query.eq('listing_status', params.listing_status);

  if (params?.sort === 'price_asc') query = query.order('price_egp', { ascending: true });
  else if (params?.sort === 'price_desc') query = query.order('price_egp', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data as Property[]) ?? [];
}

export function ensureSpecLayers(property: Property): Property {
  // If property already has spec_layers (either new ZoneInstance[] format or legacy SpecLayer[]), keep it
  if (property.spec_layers && property.spec_layers.length > 0) {
    return property;
  }

  // Generate new ZoneInstance[] structure dynamically based on property type and finish status
  const propType = (property.type as PropertyTypeId) || 'apartment';
  const finishState: GlobalFinishingState =
    property.completion_status === 'off_plan' ? 'red_brick' : 'fully_finished';

  const zoneInstances = buildZoneInstances(propType, finishState, property.bedrooms || 2);

  return { ...property, spec_layers: zoneInstances as any };
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('properties')
    .select(`*, property_images(*), property_amenities(*)`)
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  return ensureSpecLayers(data as Property);
}

export async function getAllPropertySlugs(): Promise<{ slug: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('properties').select('slug');
  return data ?? [];
}

export async function getPropertiesByIds(ids: string[]): Promise<Property[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('properties')
    .select(`*, property_images(*), property_amenities(*)`)
    .in('id', ids);
  if (error) throw error;
  // Return in the same order as ids array
  const map = new Map((data as Property[]).map((p) => [p.id, ensureSpecLayers(p)]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Property[];
}


// ─── Leads ────────────────────────────────────────────────────────

export async function submitLead(lead: Omit<Lead, 'id' | 'created_at' | 'property'>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('leads').insert(lead);
  if (error) throw error;
}

export async function getAllLeads(): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leads')
    .select(`*, property:properties(id, title_en, title_ar, slug)`)
    .order('stage_updated_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Lead[]) ?? [];
}

// ─── Admin – Property CRUD ─────────────────────────────────────────

export async function getAllPropertiesAdmin(): Promise<Property[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('properties')
    .select(`*, property_images(id, url, sort_order)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Property[]) ?? [];
}

export async function createProperty(property: Omit<Property, 'id' | 'created_at' | 'property_images' | 'property_amenities'>): Promise<Property> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('properties').insert(property).select().single();
  if (error) throw error;
  return data as Property;
}

export async function updateProperty(id: string, property: Partial<Omit<Property, 'id' | 'created_at' | 'property_images' | 'property_amenities'>>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('properties').update(property).eq('id', id);
  if (error) throw error;
}

export async function deleteProperty(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}
