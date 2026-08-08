import { createClient } from './server';
import { getPublicSupabase } from './public';
import type { Property, Lead, SpecLayer, SpecLayerItem } from './types';
import { buildZoneInstances, type PropertyTypeId, type GlobalFinishingState } from '@/lib/layering';
import { parseSmartQuery } from '@/lib/utils/searchUtils';

// ─── Properties ───────────────────────────────────────────────────

export async function getFeaturedProperties(): Promise<Property[]> {
  const supabase = getPublicSupabase();
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
  const supabase = getPublicSupabase();
  let query = supabase
    .from('properties')
    .select(`*, property_images(id, url, alt_text_en, alt_text_ar, sort_order)`);

  const rawLocation = params?.location?.trim();
  let searchType = params?.type;

  if (rawLocation) {
    const parsed = parseSmartQuery(rawLocation);

    // Auto-detect property type if present in query string and not explicitly selected
    if (!searchType && parsed.detectedType) {
      searchType = parsed.detectedType;
    }

    const conditionsSet = new Set<string>();
    parsed.searchTerms.forEach((term) => {
      const sanitized = term.replace(/[,()%]/g, ' ').trim();
      if (sanitized.length >= 2) {
        conditionsSet.add(`location.ilike.%${sanitized}%`);
        conditionsSet.add(`title_en.ilike.%${sanitized}%`);
        conditionsSet.add(`title_ar.ilike.%${sanitized}%`);
        conditionsSet.add(`description_en.ilike.%${sanitized}%`);
        conditionsSet.add(`description_ar.ilike.%${sanitized}%`);
      }
    });

    if (conditionsSet.size > 0) {
      query = query.or(Array.from(conditionsSet).join(','));
    }
  }

  if (params?.min_price) query = query.gte('price_egp', params.min_price);
  if (params?.max_price) query = query.lte('price_egp', params.max_price);
  if (params?.bedrooms) query = query.eq('bedrooms', params.bedrooms);
  if (searchType) query = query.eq('type', searchType);
  if (params?.listing_status) {
    query = query.eq('listing_status', params.listing_status);
  } else {
    query = query.neq('listing_status', 'archived');
  }

  if (params?.sort === 'price_asc') query = query.order('price_egp', { ascending: true });
  else if (params?.sort === 'price_desc') query = query.order('price_egp', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  // Filter out any property with is_archived === true
  const filtered = ((data as Property[]) ?? []).filter((p) => p.is_archived !== true && p.listing_status !== 'archived');
  return filtered;
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
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from('properties')
    .select(`*, property_images(*), property_amenities(*)`)
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  return ensureSpecLayers(data as Property);
}

export async function getAllPropertySlugs(): Promise<{ slug: string }[]> {
  const supabase = getPublicSupabase();
  const { data } = await supabase.from('properties').select('slug');
  return data ?? [];
}

export async function getPropertiesByIds(ids: string[]): Promise<Property[]> {
  if (!ids.length) return [];
  const supabase = getPublicSupabase();
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
  let { data, error } = await supabase
    .from('leads')
    .select(`*, property:properties(id, title_en, title_ar, slug)`)
    .order('stage_updated_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback if stage_updated_at column does not exist
    const fallback = await supabase
      .from('leads')
      .select(`*, property:properties(id, title_en, title_ar, slug)`)
      .order('created_at', { ascending: false });

    data = fallback.data;
    error = fallback.error;
  }

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
