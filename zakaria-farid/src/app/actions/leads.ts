'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createBrowserServer } from '@/lib/supabase/server';
import type { Lead } from '@/lib/supabase/types';

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
    } catch (e) {
      // Not in Cloudflare environment
    }
  }

  if (!url || !serviceKey) {
    console.warn('[AdminClient] SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL missing!');
    return null;
  }

  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, serviceKey, {
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

    const adminSupabase = await getAdminClient();
    const supabase = adminSupabase ?? (await createBrowserServer());

    const insertPayload = {
      name: payload.name,
      phone: payload.phone,
      email: normalizeString(payload.email),
      message: normalizeString(payload.message),
      property_id: normalizeString(payload.property_id),
      notes: normalizeString(payload.notes),
      source: normalizeString(payload.source),
      entry_method: normalizeString(payload.entry_method) || 'admin_manual',
    };

    let { data, error } = await supabase.from('leads').insert(insertPayload).select();

    if (error) {
      console.warn('createLead insert failed, trying minimal payload:', error.message);
      const fallbackPayload = {
        name: payload.name,
        phone: payload.phone,
        email: normalizeString(payload.email),
        message: normalizeString(payload.message),
      };
      const fallback = await supabase.from('leads').insert(fallbackPayload).select();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('Error creating lead:', error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Lead creation failed: 0 rows inserted.' };
    }

    revalidatePath('/admin');
    return { success: true, lead: data[0] as Lead };
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
      return { success: false, error: 'Unauthorized: Please sign in as admin.' };
    }

    const adminSupabase = await getAdminClient();
    const supabase = adminSupabase ?? (await createBrowserServer());

    // Primary update attempt with stage and stage_updated_at
    let updateResult = await supabase
      .from('leads')
      .update(
        {
          stage,
          stage_updated_at: new Date().toISOString(),
        },
        { count: 'exact' }
      )
      .eq('id', leadId);

    // Fallback: if stage_updated_at fails
    if (updateResult.error || (updateResult.count !== null && updateResult.count === 0)) {
      console.warn('Lead stage update with stage_updated_at failed or updated 0 rows, attempting stage-only fallback');
      updateResult = await supabase
        .from('leads')
        .update({ stage }, { count: 'exact' })
        .eq('id', leadId);
    }

    if (updateResult.error) {
      console.error('Lead stage update error:', updateResult.error.message);
      return { success: false, error: updateResult.error.message };
    }

    if (updateResult.count === 0) {
      console.error('Lead stage update modified 0 rows for leadId:', leadId);
      return {
        success: false,
        error: 'Lead update failed: 0 rows modified in Supabase. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in Cloudflare secrets or enable RLS UPDATE policy on leads table.',
      };
    }

    revalidatePath('/admin');
    return { success: true, lead: { id: leadId, stage } as Lead };
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
      return { success: false, error: 'Unauthorized: Please sign in as admin.' };
    }

    const adminSupabase = await getAdminClient();
    const supabase = adminSupabase ?? (await createBrowserServer());

    const payload = {
      notes: updates.notes === undefined ? undefined : normalizeString(updates.notes),
      lost_reason: updates.lost_reason === undefined ? undefined : normalizeString(updates.lost_reason),
      source: updates.source === undefined ? undefined : normalizeString(updates.source),
    };

    let updateResult = await supabase
      .from('leads')
      .update(payload, { count: 'exact' })
      .eq('id', leadId);

    if (updateResult.error || (updateResult.count !== null && updateResult.count === 0)) {
      console.warn('Lead details update failed or updated 0 rows, trying fallback');
      const fallbackPayload = {} as Record<string, string | null | undefined>;
      if (updates.notes !== undefined) fallbackPayload.notes = normalizeString(updates.notes);
      if (updates.lost_reason !== undefined) fallbackPayload.lost_reason = normalizeString(updates.lost_reason);
      if (updates.source !== undefined) fallbackPayload.source = normalizeString(updates.source);
      
      updateResult = await supabase.from('leads').update(fallbackPayload, { count: 'exact' }).eq('id', leadId);
    }

    if (updateResult.error) {
      return { success: false, error: updateResult.error.message };
    }

    if (updateResult.count === 0) {
      return { success: false, error: 'Lead details update failed: 0 rows modified in Supabase.' };
    }

    revalidatePath('/admin');
    return { success: true, lead: { id: leadId, ...updates } as unknown as Lead };
  } catch (err: any) {
    console.error('Exception in updateLeadDetails:', err);
    return { success: false, error: err.message || 'Server action error' };
  }
}

export async function toggleArchiveLead(leadId: string, isArchived: boolean) {
  try {
    const sessionClient = await createBrowserServer();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized: Please sign in as admin.' };
    }

    const adminSupabase = await getAdminClient();
    const supabase = adminSupabase ?? (await createBrowserServer());

    // Try updating is_archived field
    let updateResult = await supabase
      .from('leads')
      .update({ is_archived: isArchived }, { count: 'exact' })
      .eq('id', leadId);

    // Fallback if is_archived column doesn't exist yet: update stage to 'archived'
    if (updateResult.error && updateResult.error.message.includes('is_archived')) {
      console.warn('is_archived column missing, falling back to setting stage to archived');
      updateResult = await supabase
        .from('leads')
        .update({ stage: isArchived ? 'archived' : 'new' }, { count: 'exact' })
        .eq('id', leadId);
    }

    if (updateResult.error) {
      return { success: false, error: updateResult.error.message };
    }

    revalidatePath('/admin');
    return { success: true, leadId, isArchived };
  } catch (err: any) {
    console.error('Exception in toggleArchiveLead:', err);
    return { success: false, error: err.message || 'Server action error' };
  }
}

export async function deleteLeadPermanently(leadId: string) {
  try {
    const sessionClient = await createBrowserServer();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized: Please sign in as admin.' };
    }

    const adminSupabase = await getAdminClient();
    const supabase = adminSupabase ?? (await createBrowserServer());

    const { error } = await supabase.from('leads').delete().eq('id', leadId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    return { success: true, leadId };
  } catch (err: any) {
    console.error('Exception in deleteLeadPermanently:', err);
    return { success: false, error: err.message || 'Server action error' };
  }
}
