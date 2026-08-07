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

  let data: any = null;
  let error = null;

  try {
    ({ data, error } = await supabase.from('leads').insert(insertPayload).select().single());
  } catch (insertError) {
    error = insertError as any;
  }

  if ((error && error.message?.includes('stage')) || error?.message?.includes('notes') || error?.message?.includes('lost_reason') || error?.message?.includes('stage_updated_at') || error?.message?.includes('source') || error?.message?.includes('entry_method')) {
    const fallbackPayload = {
      name: insertPayload.name,
      phone: insertPayload.phone,
      email: insertPayload.email,
      message: insertPayload.message,
      property_id: insertPayload.property_id,
    } as Record<string, unknown>;
    const fallbackResult = await supabase.from('leads').insert(fallbackPayload).select().single();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  revalidatePath('/admin');
  return { success: true, lead: data as Lead };
}

export async function updateLeadStage(leadId: string, stage: string) {
  const sessionClient = await createBrowserServer();
  const { data: { user } } = await sessionClient.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = createAdminClient() ?? (await createBrowserServer());
  let data: any = null;
  let error = null;

  try {
    ({ data, error } = await supabase
      .from('leads')
      .update({
        stage,
        stage_updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select()
      .single());
  } catch (updateError) {
    error = updateError as any;
  }

  if (error && (error.message?.includes('stage') || error.message?.includes('stage_updated_at'))) {
    const fallbackResult = await supabase
      .from('leads')
      .update({ stage })
      .eq('id', leadId)
      .select()
      .single();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  revalidatePath('/admin');
  return { success: true, lead: data as Lead };
}

export async function updateLeadDetails(
  leadId: string,
  updates: {
    notes?: string | null;
    lost_reason?: string | null;
    source?: string | null;
  }
) {
  const sessionClient = await createBrowserServer();
  const { data: { user } } = await sessionClient.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const supabase = createAdminClient() ?? (await createBrowserServer());
  let data: any = null;
  let error = null;

  const payload = {
    notes: updates.notes === undefined ? undefined : normalizeString(updates.notes),
    lost_reason: updates.lost_reason === undefined ? undefined : normalizeString(updates.lost_reason),
    source: updates.source === undefined ? undefined : normalizeString(updates.source),
  };

  try {
    ({ data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', leadId)
      .select()
      .single());
  } catch (updateError) {
    error = updateError as any;
  }

  if (error && (error.message?.includes('notes') || error.message?.includes('lost_reason') || error.message?.includes('source'))) {
    const fallbackPayload = {} as Record<string, string | null | undefined>;
    if (updates.notes !== undefined) fallbackPayload.notes = normalizeString(updates.notes);
    if (updates.lost_reason !== undefined) fallbackPayload.lost_reason = normalizeString(updates.lost_reason);
    if (updates.source !== undefined) fallbackPayload.source = normalizeString(updates.source);
    const fallbackResult = await supabase.from('leads').update(fallbackPayload).eq('id', leadId).select().single();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw error;
  }

  revalidatePath('/admin');
  return { success: true, lead: data as Lead };
}
