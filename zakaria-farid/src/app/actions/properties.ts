'use server';

import { createServerClient } from '@supabase/ssr';
import { createClient as createBrowserServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Creates an admin client using the service role key — bypasses RLS entirely.
// This is safe because this code only runs server-side and the key is never
// exposed to the browser.
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to .env.local');
  }

  // Use the JS client directly with the service role key
  // This bypasses all RLS policies
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function saveProperty(
  payload: any,
  isEditing: boolean,
  propertyId?: string,
  amenities: string[] = [],
  previewUrls: string[] = []
) {
  try {
    // First verify the user is actually authenticated via their session cookie
    const sessionClient = await createBrowserServer();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Please log in first.' };
    }

    // Now use the admin client to actually write to the database
    const supabase = createAdminClient();

    if (isEditing && propertyId) {
      let { error } = await supabase.from('properties').update(payload).eq('id', propertyId);
      
      // Fallback: If spec_layers column hasn't been added to Supabase DB yet, retry without spec_layers
      if (error && error.message?.includes('spec_layers')) {
        console.warn('spec_layers column missing in Supabase DB. Retrying update without spec_layers...');
        const fallbackPayload = { ...payload };
        delete fallbackPayload.spec_layers;
        const fallbackRes = await supabase.from('properties').update(fallbackPayload).eq('id', propertyId);
        if (fallbackRes.error) throw fallbackRes.error;
        error = null;
      } else if (error) {
        throw error;
      }

      // Update amenities
      await supabase.from('property_amenities').delete().eq('property_id', propertyId);
      if (amenities.length > 0) {
        const amRows = amenities.map((a: string) => ({ property_id: propertyId, amenity_en: a, amenity_ar: a }));
        const { error: amErr } = await supabase.from('property_amenities').insert(amRows);
        if (amErr) console.error('Amenity insert error:', amErr);
      }

      revalidatePath('/admin');
      revalidatePath('/');
      return { success: true, propertyId, slug: payload.slug };
    } else {
      let newPropData: any = null;
      let { data: newProp, error } = await supabase
        .from('properties')
        .insert(payload)
        .select('id, slug')
        .single();

      // Fallback: If spec_layers column hasn't been added to Supabase DB yet, retry without spec_layers
      if (error && error.message?.includes('spec_layers')) {
        console.warn('spec_layers column missing in Supabase DB. Retrying insert without spec_layers...');
        const fallbackPayload = { ...payload };
        delete fallbackPayload.spec_layers;
        const fallbackRes = await supabase
          .from('properties')
          .insert(fallbackPayload)
          .select('id, slug')
          .single();
        if (fallbackRes.error) throw fallbackRes.error;
        newProp = fallbackRes.data;
        error = null;
      } else if (error) {
        throw error;
      }

      // Save image urls
      if (previewUrls.length > 0 && newProp) {
        const imgRows = previewUrls.map((url: string, i: number) => ({
          property_id: newProp.id,
          url,
          sort_order: i,
        }));
        const { error: imgErr } = await supabase.from('property_images').insert(imgRows);
        if (imgErr) console.error('Image insert error:', imgErr);
      }

      // Save amenities
      if (amenities.length > 0 && newProp) {
        const amRows = amenities.map((a: string) => ({
          property_id: newProp.id,
          amenity_en: a,
          amenity_ar: a,
        }));
        const { error: amErr } = await supabase.from('property_amenities').insert(amRows);
        if (amErr) console.error('Amenity insert error:', amErr);
      }

      revalidatePath('/admin');
      revalidatePath('/');
      return { success: true, propertyId: newProp?.id, slug: newProp?.slug || payload.slug };
    }
  } catch (error: any) {
    console.error('Server action saveProperty error:', error.message, error);
    return { success: false, error: error.message || 'Unknown database error' };
  }
}
