'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createBrowserServer } from '@/lib/supabase/server';
import type { Lead } from '@/lib/supabase/types';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeString(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function createLead(payload: {
  name: string;
  phone: string;
  email?: string | null;
  message?: string | null;
  property_id?: string | null;
  notes?: string | null;
  source?: string | null;
  entry_method?: string | null;
}) {
  try {
    const sessionClient = await createBrowserServer();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = createAdminClient() ?? (await createBrowserServer());

    const insertPayload = {
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      email: normalizeString(payload.email),
      message: normalizeString(payload.message),
      property_id: payload.property_id || null,
      notes: normalizeString(payload.notes),
      source: normalizeString(payload.source) ?? 'manual',
      entry_method: normalizeString(payload.entry_method) ?? 'manual',
      stage: 'new',
      stage_updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase.from('leads').insert(insertPayload).select();

    if (error) {
      console.warn('createLead full insert failed, trying basic fallback:', error.message);
      const fallbackPayload = {
        name: insertPayload.name,
        phone: insertPayload.phone,
        email: insertPayload.email,
        message: insertPayload.message,
        property_id: insertPayload.property_id,
      } as Record<string, unknown>;

      const fallback = await supabase.from('leads').insert(fallbackPayload).select();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    const lead = data && data.length > 0 ? (data[0] as Lead) : null;
    return { success: true, lead };
  } catch (err: any) {
    console.error('Exception in createLead:', err);
    return { success: false, error: err.message || 'Server action error' };
  }
}

export async function updateLeadStage(leadId: string, stage: string) {
  try {
    const sessionClient = await createBrowserServer();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = createAdminClient() ?? (await createBrowserServer());

    // Primary update attempt with stage and stage_updated_at
    let { data, error } = await supabase
      .from('leads')
      .update({
        stage,
        stage_updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select();

    // Fallback: if error occurred, try updating just stage (e.g. stage_updated_at column missing)
    if (error) {
      console.warn('Lead stage update with stage_updated_at failed, attempting stage-only fallback:', error.message);
      const fallback = await supabase
        .from('leads')
        .update({ stage })
        .eq('id', leadId)
        .select();

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Lead stage update failed completely:', error.message);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    const lead = data && data.length > 0 ? (data[0] as Lead) : null;
    return { success: true, lead };
  } catch (err: any) {
    console.error('Exception in updateLeadStage:', err);
    return { success: false, error: err.message || 'Server action error' };
  }
}

export async function updateLeadDetails(
  leadId: string,
  updates: {
    notes?: string | null;
    lost_reason?: string | null;
    source?: string | null;
  }
) {
  try {
    const sessionClient = await createBrowserServer();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = createAdminClient() ?? (await createBrowserServer());

    const payload = {
      notes: updates.notes === undefined ? undefined : normalizeString(updates.notes),
      lost_reason: updates.lost_reason === undefined ? undefined : normalizeString(updates.lost_reason),
      source: updates.source === undefined ? undefined : normalizeString(updates.source),
    };

    let { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', leadId)
      .select();

    if (error) {
      console.warn('Lead details update failed, trying fallback:', error.message);
      const fallbackPayload = {} as Record<string, string | null | undefined>;
      if (updates.notes !== undefined) fallbackPayload.notes = normalizeString(updates.notes);
      if (updates.lost_reason !== undefined) fallbackPayload.lost_reason = normalizeString(updates.lost_reason);
      if (updates.source !== undefined) fallbackPayload.source = normalizeString(updates.source);
      
      const fallback = await supabase.from('leads').update(fallbackPayload).eq('id', leadId).select();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    const lead = data && data.length > 0 ? (data[0] as Lead) : null;
    return { success: true, lead };
  } catch (err: any) {
    console.error('Exception in updateLeadDetails:', err);
    return { success: false, error: err.message || 'Server action error' };
  }
}
