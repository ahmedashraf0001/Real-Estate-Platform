import { createClient } from './server';
import { getPublicSupabase } from './public';
import type { Property, Lead, SpecLayer, SpecLayerItem } from './types';
import { buildZoneInstances, type PropertyTypeId, type GlobalFinishingState } from '@/lib/layering';
import { parseSmartQuery } from '@/lib/utils/searchUtils';
import { FALLBACK_PROPERTIES } from '@/lib/data/fallbackProperties';

// ─── Properties ───────────────────────────────────────────────────

export async function getFeaturedProperties(): Promise<Property[]> {
  try {
    const supabase = getPublicSupabase();
    const { data, error } = await supabase
      .from('properties')
      .select(`*, property_images(*)`)
      .eq('is_featured', true)
      .eq('listing_status', 'active')
      .order('created_at', { ascending: false })
      .limit(6);
    if (!error && data && data.length > 0) {
      return (data as Property[]);
    }
  } catch (err) {
    // fallback below
  }
  return FALLBACK_PROPERTIES.filter((p) => p.is_featured);
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
  try {
    const supabase = getPublicSupabase();
    let query = supabase
      .from('properties')
      .select(`*, property_images(id, url, alt_text_en, alt_text_ar, sort_order)`);

    const rawLocation = params?.location?.trim();
    let searchType = params?.type;

    if (rawLocation) {
      const parsed = parseSmartQuery(rawLocation);

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
    }

    if (params?.sort === 'price_asc') query = query.order('price_egp', { ascending: true });
    else if (params?.sort === 'price_desc') query = query.order('price_egp', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const filtered = ((data as Property[]) ?? []).filter((p) => p.is_archived !== true && p.listing_status !== 'archived');
      return filtered;
    }
  } catch (err) {
    // fallback below
  }

  // Filter fallback properties
  let fallback = [...FALLBACK_PROPERTIES];
  if (params?.type) {
    fallback = fallback.filter(p => p.type === params.type);
  }
  if (params?.bedrooms) {
    fallback = fallback.filter(p => p.bedrooms === params.bedrooms);
  }
  if (params?.min_price) {
    fallback = fallback.filter(p => p.price_egp >= params.min_price!);
  }
  if (params?.max_price) {
    fallback = fallback.filter(p => p.price_egp <= params.max_price!);
  }
  return fallback;
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
  try {
    const supabase = getPublicSupabase();
    const { data, error } = await supabase
      .from('properties')
      .select(`*, property_images(*), property_amenities(*)`)
      .eq('slug', slug)
      .single();
    if (!error && data) {
      return ensureSpecLayers(data as Property);
    }
  } catch (err) {
    // fallback below
  }

  const foundFallback = FALLBACK_PROPERTIES.find(p => p.slug === slug || p.id === slug);
  if (foundFallback) {
    return ensureSpecLayers(foundFallback);
  }
  return null;
}

export async function getAllPropertySlugs(): Promise<{ slug: string }[]> {
  try {
    const supabase = getPublicSupabase();
    const { data } = await supabase.from('properties').select('slug');
    if (data && data.length > 0) {
      return data;
    }
  } catch (err) {
    // fallback below
  }
  return FALLBACK_PROPERTIES.map(p => ({ slug: p.slug }));
}

export async function getPropertiesByIds(ids: string[]): Promise<Property[]> {
  if (!ids.length) return [];
  try {
    const supabase = getPublicSupabase();
    const { data, error } = await supabase
      .from('properties')
      .select(`*, property_images(*), property_amenities(*)`)
      .in('id', ids);
    if (!error && data && data.length > 0) {
      const map = new Map((data as Property[]).map((p) => [p.id, ensureSpecLayers(p)]));
      return ids.map((id) => map.get(id)).filter(Boolean) as Property[];
    }
  } catch (err) {
    // fallback below
  }

  const map = new Map(FALLBACK_PROPERTIES.map((p) => [p.id, ensureSpecLayers(p)]));
  return ids.map((id) => map.get(id) || FALLBACK_PROPERTIES.find(f => f.slug === id)).filter(Boolean) as Property[];
}


// ─── Leads ────────────────────────────────────────────────────────

export async function submitLead(lead: Omit<Lead, 'id' | 'created_at' | 'property'>): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('leads').insert(lead);
  if (error) throw error;
}

export async function getAllLeads(): Promise<Lead[]> {
  const supabase = await createClient();
  const withBookings = `*, property:properties(id, title_en, title_ar, slug), bookings(*, property:properties(id, title_en, title_ar, slug))`;
  const baseSelect = `*, property:properties(id, title_en, title_ar, slug)`;

  let { data, error } = await supabase
    .from('leads')
    .select(withBookings)
    .order('stage_updated_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback if the bookings table has not been migrated yet
    const noBookings = await supabase
      .from('leads')
      .select(baseSelect)
      .order('stage_updated_at', { ascending: false })
      .order('created_at', { ascending: false });
    data = noBookings.data;
    error = noBookings.error;
  }

  if (error) {
    // Fallback if stage_updated_at column does not exist
    const fallback = await supabase
      .from('leads')
      .select(baseSelect)
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
