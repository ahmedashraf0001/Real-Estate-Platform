'use server';

import { createServerClient } from '@supabase/ssr';
import { createClient as createBrowserServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendNewPropertyAlerts } from '@/lib/services/emailService';

// Creates an admin client using the service role key — bypasses RLS entirely.
// Falls back to null if the key is not set (e.g. Cloudflare Workers secrets not configured yet),
// so the caller can fall back to the session client which still works for authenticated admins.
async function getAdminClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || !url) {
    try {
      const cfSymbol = Symbol.for('__cloudflare-context__');
      const cfCtx = (globalThis as any)[cfSymbol];
      if (cfCtx?.env) {
        url = url || cfCtx.env.NEXT_PUBLIC_SUPABASE_URL;
        serviceKey = serviceKey || cfCtx.env.SUPABASE_SERVICE_ROLE_KEY;
      }
    } catch {
      // ignore
    }
  }

  if (!serviceKey || !url) {
    try {
      const cf = await import('@opennextjs/cloudflare');
      let ctx: any = null;
      try {
        ctx = await cf.getCloudflareContext({ async: true });
      } catch {
        ctx = (cf as any).getCloudflareContext?.();
      }
      if (ctx?.env) {
        url = url || ctx.env.NEXT_PUBLIC_SUPABASE_URL;
        serviceKey = serviceKey || ctx.env.SUPABASE_SERVICE_ROLE_KEY;
      }
    } catch {
      // Not in Cloudflare environment
    }
  }

  if (!url || !serviceKey || serviceKey.startsWith('sb_secret_') || serviceKey.startsWith('placeholder')) {
    // Valid service role key not set — use session client seamlessly
    return null;
  }

  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const VALID_PROPERTY_COLUMNS = new Set([
  'id',
  'slug',
  'title_en',
  'title_ar',
  'description_en',
  'description_ar',
  'price_egp',
  'bedrooms',
  'bathrooms',
  'area_sqm',
  'type',
  'location',
  'latitude',
  'longitude',
  'completion_status',
  'listing_status',
  'is_featured',
  'view',
  'floor_number',
  'spec_layers',
  'videos',
  'video_url',
  'calcom_event_link',
  'created_at',
]);

function sanitizePropertyPayload(raw: Record<string, any>) {
  if (!raw || typeof raw !== 'object') return raw;
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (VALID_PROPERTY_COLUMNS.has(key)) {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export async function saveProperty(
  payload: any,
  isEditing: boolean,
  propertyId?: string,
  amenities: string[] = [],
  previewUrls: string[] = []
) {
  try {
    const cleanPayload = sanitizePropertyPayload(payload);

    // First verify the user is actually authenticated via their session cookie
    const sessionClient = await createBrowserServer();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized: Please log in first.' };
    }

    // Now use the admin client or session client
    const adminSupabase = await getAdminClient();
    let supabase = adminSupabase ?? sessionClient;

    const executeWrite = async (client: any, payloadToWrite: any) => {
      let curPayload = { ...payloadToWrite };
      let res = isEditing && propertyId
        ? await client.from('properties').update(curPayload).eq('id', propertyId)
        : await client.from('properties').insert(curPayload).select('id, slug').single();

      // If missing columns (videos, video_url, spec_layers), strip them and retry
      if (res.error && (res.error.message?.includes('videos') || res.error.message?.includes('video_url') || res.error.message?.includes('spec_layers') || res.error.message?.includes('column'))) {
        console.warn('Column mismatch in Supabase DB, retrying with compatible payload:', res.error.message);
        if (res.error.message?.includes('videos')) delete curPayload.videos;
        if (res.error.message?.includes('video_url')) delete curPayload.video_url;
        if (res.error.message?.includes('spec_layers')) delete curPayload.spec_layers;

        res = isEditing && propertyId
          ? await client.from('properties').update(curPayload).eq('id', propertyId)
          : await client.from('properties').insert(curPayload).select('id, slug').single();
      }
      return res;
    };

    let writeRes = await executeWrite(supabase, cleanPayload);

    // If adminSupabase failed due to API key / auth issues, fall back to sessionClient immediately
    if (writeRes.error && (writeRes.error.message?.includes('API key') || writeRes.error.message?.includes('JWT') || writeRes.error.message?.includes('unauthorized') || writeRes.error.status === 401)) {
      console.warn('Falling back from admin client to authenticated session client:', writeRes.error.message);
      supabase = sessionClient;
      writeRes = await executeWrite(supabase, cleanPayload);
    }

    if (writeRes.error) {
      throw writeRes.error;
    }

    if (isEditing && propertyId) {
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
      const newProp = writeRes.data;

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

      // Fire property alert emails to all subscribers (non-blocking, non-fatal)
      if (newProp) {
        const alertPayload = {
          title_en: cleanPayload.title_en || payload.title_en || 'New Property',
          title_ar: cleanPayload.title_ar || payload.title_ar,
          description_en: cleanPayload.description_en || payload.description_en,
          price_egp: cleanPayload.price_egp || payload.price_egp,
          location: cleanPayload.location || payload.location,
          bedrooms: cleanPayload.bedrooms ?? payload.bedrooms,
          bathrooms: cleanPayload.bathrooms ?? payload.bathrooms,
          area_sqm: cleanPayload.area_sqm ?? payload.area_sqm,
          type: cleanPayload.type || payload.type,
          slug: newProp.slug || payload.slug,
          imageUrl: previewUrls[0] || undefined,
        };
        sendNewPropertyAlerts(supabase, alertPayload).catch((e) =>
          console.warn('[saveProperty] Property alert email non-fatal error:', e)
        );
      }

      return { success: true, propertyId: newProp?.id, slug: newProp?.slug || payload.slug };
    }
  } catch (error: any) {
    console.error('Server action saveProperty error:', error.message, error);
    return { success: false, error: error.message || 'Unknown database error' };
  }
}

export async function toggleArchiveProperty(propertyId: string, isArchived: boolean) {
  try {
    const sessionClient = await createBrowserServer();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized: Please log in first.' };
    }

    const adminSupabase = await getAdminClient();
    const supabase = adminSupabase ?? (await createBrowserServer());

    // Primary: update is_archived boolean column directly
    let updateResult = await supabase
      .from('properties')
      .update({ is_archived: isArchived })
      .eq('id', propertyId);

    // Fallback if is_archived column is missing on properties table in Supabase DB:
    // Fall back to listing_status = 'sold' (when archiving) or 'active' (when restoring)
    if (updateResult.error && updateResult.error.message.includes('is_archived')) {
      console.warn('is_archived column missing on properties table, falling back to listing_status: sold/active');
      updateResult = await supabase
        .from('properties')
        .update({ listing_status: isArchived ? 'sold' : 'active' })
        .eq('id', propertyId);
    }

    if (updateResult.error) {
      return { success: false, error: updateResult.error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, propertyId, isArchived };
  } catch (error: any) {
    console.error('toggleArchiveProperty error:', error);
    return { success: false, error: error.message || 'Error updating property archive state' };
  }
}

export async function deletePropertyPermanently(propertyId: string) {
  try {
    const sessionClient = await createBrowserServer();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized: Please log in first.' };
    }

    const adminSupabase = await getAdminClient();
    const supabase = adminSupabase ?? (await createBrowserServer());

    // First delete child rows in property_images and property_amenities
    await supabase.from('property_images').delete().eq('property_id', propertyId);
    await supabase.from('property_amenities').delete().eq('property_id', propertyId);

    const { error } = await supabase.from('properties').delete().eq('id', propertyId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, propertyId };
  } catch (error: any) {
    console.error('deletePropertyPermanently error:', error);
    return { success: false, error: error.message || 'Error deleting property' };
  }
}

export async function uploadMediaFile(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'No file provided' };

    const adminClient = await getAdminClient();
    const client = adminClient || (await createBrowserServer());

    const filename = `videos/video-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await client.storage
      .from('property-images')
      .upload(filename, buffer, {
        contentType: file.type || 'video/mp4',
        upsert: false,
      });

    if (uploadErr) {
      return { success: false, error: uploadErr.message };
    }

    const { data } = client.storage.from('property-images').getPublicUrl(filename);
    return { success: true, url: data.publicUrl };
  } catch (err: any) {
    console.error('uploadMediaFile error:', err);
    return { success: false, error: err?.message || 'Upload failed' };
  }
}
