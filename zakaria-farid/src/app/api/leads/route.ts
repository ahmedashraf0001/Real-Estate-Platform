import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { 
  sendServerSideLeadNotification, 
  getNotifyFaridWhatsAppUrl 
} from '@/lib/services/whatsappNotifier';

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      message, 
      property_id, 
      property_title, 
      budget, 
      preferred_channel, 
      notes, 
      source 
    } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const adminSupabase = await getAdminClient();
    const supabase = adminSupabase ?? (await createServerClient());

    let finalPropertyId: string | null = null;
    let resolvedPropertyTitle: string | null = property_title || null;
    let resolvedPropertySlug: string | null = null;

    // Resolve property by UUID or slug
    if (property_id) {
      const rawPropId = String(property_id).trim();

      if (isValidUUID(rawPropId)) {
        // Query by UUID
        try {
          const { data: prop } = await supabase
            .from('properties')
            .select('id, title_ar, title_en, slug')
            .eq('id', rawPropId)
            .maybeSingle();

          if (prop) {
            finalPropertyId = prop.id;
            resolvedPropertyTitle = resolvedPropertyTitle || prop.title_ar || prop.title_en;
            resolvedPropertySlug = prop.slug;
          } else {
            // Still a valid UUID, store it
            finalPropertyId = rawPropId;
          }
        } catch {
          finalPropertyId = rawPropId;
        }
      } else {
        // rawPropId is a slug (e.g. "ultra-luxury-modern-smart-mansion")
        resolvedPropertySlug = rawPropId;
        try {
          const { data: prop } = await supabase
            .from('properties')
            .select('id, title_ar, title_en, slug')
            .eq('slug', rawPropId)
            .maybeSingle();

          if (prop) {
            finalPropertyId = prop.id;
            resolvedPropertyTitle = resolvedPropertyTitle || prop.title_ar || prop.title_en;
            resolvedPropertySlug = prop.slug;
          } else {
            // Property not found in database (e.g. mock/catalog asset), do not pass invalid string as UUID
            finalPropertyId = null;
          }
        } catch {
          finalPropertyId = null;
        }
      }
    }

    // Clean notes without duplication
    let cleanNotes = notes ? String(notes).trim() : '';
    if (preferred_channel && !cleanNotes.includes(preferred_channel)) {
      cleanNotes = cleanNotes ? `Protocol: ${preferred_channel} | ${cleanNotes}` : `Protocol: ${preferred_channel}`;
    }

    const leadPayload = {
      name: String(name).trim(),
      email: email ? String(email).trim() : null,
      phone: String(phone).trim(),
      message: message ? String(message).trim() : null,
      property_id: finalPropertyId,
      notes: cleanNotes || null,
      source: source || (resolvedPropertyTitle ? `Property Acquisition: ${resolvedPropertyTitle}` : 'Website Inquiry Modal'),
      entry_method: 'form',
      stage: 'new',
      stage_updated_at: new Date().toISOString(),
    };

    let insertedLead: any = null;

    // Primary insert attempt
    const insertRes = await supabase.from('leads').insert(leadPayload).select().maybeSingle();

    if (insertRes.error) {
      console.warn('[api/leads] Primary lead insert error, falling back to minimal payload:', insertRes.error.message);
      
      const fallbackPayload = {
        name: leadPayload.name,
        phone: leadPayload.phone,
        email: leadPayload.email,
        message: leadPayload.message,
        notes: leadPayload.notes,
        source: leadPayload.source,
      };

      const fallbackRes = await supabase.from('leads').insert(fallbackPayload).select().maybeSingle();
      if (fallbackRes.error) {
        console.error('[api/leads] Fallback lead insert error:', fallbackRes.error.message);
        throw fallbackRes.error;
      }
      insertedLead = fallbackRes.data;
    } else {
      insertedLead = insertRes.data;
    }

    const notificationPayload = {
      name: leadPayload.name,
      phone: leadPayload.phone,
      email: leadPayload.email,
      message: leadPayload.message,
      propertyTitle: resolvedPropertyTitle,
      propertySlug: resolvedPropertySlug,
      budget,
      notes: cleanNotes,
      source: leadPayload.source,
      entryMethod: 'form',
      preferredChannel: preferred_channel || 'WhatsApp',
    };

    // 1. Dispatch background notification if webhook/bot is active
    try {
      await sendServerSideLeadNotification(notificationPayload);
    } catch (notifyErr) {
      console.warn('[api/leads] WhatsApp server-side notification non-fatal error:', notifyErr);
    }

    // 2. Build direct WhatsApp URL to notify Farid Zakaria
    const faridWhatsAppUrl = getNotifyFaridWhatsAppUrl(notificationPayload);

    return NextResponse.json({ 
      success: true, 
      lead: insertedLead,
      farid_whatsapp_url: faridWhatsAppUrl 
    }, { status: 201 });
  } catch (err: any) {
    console.error('[api/leads] Fatal lead submission error:', err);
    return NextResponse.json({ 
      error: err?.message || 'Internal server error',
      details: process.env.NODE_ENV !== 'production' ? String(err) : undefined 
    }, { status: 500 });
  }
}
