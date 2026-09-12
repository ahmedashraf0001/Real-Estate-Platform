import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { 
  sendServerSideLeadNotification, 
  getNotifyFaridWhatsAppUrl 
} from '@/lib/services/whatsappNotifier';

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

function stripHtml(input?: string | null): string {
  if (!input) return '';
  return input.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Server-Side Validation Schema for Customer Leads
 * Guarantees strict input sanitization, prevents SQL/Script injection,
 * and validates phone numbers.
 */
const RawLeadSchema = z.object({
  name: z.string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  phone: z.string({ required_error: 'Phone number is required' })
    .min(3, 'Phone number is required')
    .max(35, 'Phone number is too long'),
  email: z.string().email('Invalid email address').max(150).nullable().optional().or(z.literal('')),
  message: z.string().max(2000).nullable().optional(),
  property_id: z.string().max(100).nullable().optional(),
  property_title: z.string().max(200).nullable().optional(),
  budget: z.string().max(100).nullable().optional(),
  preferred_channel: z.string().max(50).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  source: z.string().max(150).nullable().optional(),
});

/**
 * Validates phone numbers: accepts Egyptian mobile (010, 011, 012, 015),
 * international E.164 formats, or explicit email-only fallback ("N/A - Email Only").
 */
function isValidPhone(phone: string, email?: string | null): boolean {
  const clean = phone.trim();
  if (clean.toUpperCase().startsWith('N/A')) {
    return Boolean(email && email.includes('@'));
  }
  // Strip out valid formatting characters: digits, spaces, hyphens, plus, parens
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return false;
  }
  return /^[+]?[0-9\s\-().]{7,30}$/.test(clean);
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
    let rawJson: unknown;
    try {
      rawJson = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parseResult = RawLeadSchema.safeParse(rawJson);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json({ 
        error: firstIssue?.message || 'Invalid input data' 
      }, { status: 400 });
    }

    const data = parseResult.data;
    const sanitizedName = stripHtml(data.name);
    const rawPhone = stripHtml(data.phone);
    const sanitizedEmail = data.email ? stripHtml(data.email).toLowerCase() : null;

    if (!sanitizedName || sanitizedName.length < 2) {
      return NextResponse.json({ error: 'Please provide a valid name (at least 2 characters)' }, { status: 400 });
    }

    if (!isValidPhone(rawPhone, sanitizedEmail)) {
      return NextResponse.json({ 
        error: 'Please provide a valid phone number (e.g. 01012345678 or +201009970776)' 
      }, { status: 400 });
    }

    const sanitizedPhone = rawPhone.toUpperCase().startsWith('N/A') 
      ? 'N/A - Email Only' 
      : rawPhone.replace(/[^\d+]/g, '');

    const sanitizedMessage = stripHtml(data.message);
    const sanitizedBudget = stripHtml(data.budget);
    const sanitizedChannel = stripHtml(data.preferred_channel);
    const sanitizedNotes = stripHtml(data.notes);
    const sanitizedSource = stripHtml(data.source);
    const propertyIdInput = stripHtml(data.property_id);
    const propertyTitleInput = stripHtml(data.property_title);

    const adminSupabase = await getAdminClient();
    const supabase = adminSupabase ?? (await createServerClient());

    let finalPropertyId: string | null = null;
    let resolvedPropertyTitle: string | null = propertyTitleInput || null;
    let resolvedPropertySlug: string | null = null;

    // Resolve property by UUID or slug safely
    if (propertyIdInput) {
      if (isValidUUID(propertyIdInput)) {
        try {
          const { data: prop } = await supabase
            .from('properties')
            .select('id, title_ar, title_en, slug')
            .eq('id', propertyIdInput)
            .maybeSingle();

          if (prop) {
            finalPropertyId = prop.id;
            resolvedPropertyTitle = resolvedPropertyTitle || prop.title_ar || prop.title_en;
            resolvedPropertySlug = prop.slug;
          } else {
            finalPropertyId = propertyIdInput;
          }
        } catch {
          finalPropertyId = propertyIdInput;
        }
      } else if (/^[a-zA-Z0-9_-]{1,100}$/.test(propertyIdInput)) {
        // Safe slug lookup
        resolvedPropertySlug = propertyIdInput;
        try {
          const { data: prop } = await supabase
            .from('properties')
            .select('id, title_ar, title_en, slug')
            .eq('slug', propertyIdInput)
            .maybeSingle();

          if (prop) {
            finalPropertyId = prop.id;
            resolvedPropertyTitle = resolvedPropertyTitle || prop.title_ar || prop.title_en;
            resolvedPropertySlug = prop.slug;
          } else {
            finalPropertyId = null;
          }
        } catch {
          finalPropertyId = null;
        }
      }
    }

    // Clean notes without duplication
    let cleanNotes = sanitizedNotes;
    if (sanitizedChannel && !cleanNotes.includes(sanitizedChannel)) {
      cleanNotes = cleanNotes ? `Protocol: ${sanitizedChannel} | ${cleanNotes}` : `Protocol: ${sanitizedChannel}`;
    }

    const leadPayload = {
      name: sanitizedName,
      email: sanitizedEmail || null,
      phone: sanitizedPhone,
      message: sanitizedMessage || null,
      property_id: finalPropertyId,
      notes: cleanNotes || null,
      source: sanitizedSource || (resolvedPropertyTitle ? `Property Acquisition: ${resolvedPropertyTitle}` : 'Website Inquiry Modal'),
      entry_method: 'form',
      stage: 'new',
      stage_updated_at: new Date().toISOString(),
    };

    let insertedLeadId: string | null = null;

    // ─── RLS Least-Privilege Insert Handling ──────────────────────────────────
    // P1 Security Hardening:
    // When inserting as anon, public.leads has INSERT-only privilege (no SELECT).
    // Using .insert() WITHOUT .select() avoids triggering PostgreSQL RETURNING clause
    // which requires SELECT permissions and causes permission denied (42501) errors.
    if (adminSupabase) {
      const insertRes = await adminSupabase.from('leads').insert(leadPayload).select('id').maybeSingle();
      if (!insertRes.error && insertRes.data) {
        insertedLeadId = insertRes.data.id;
      } else {
        // Fallback with minimal payload
        const fallbackPayload = {
          name: leadPayload.name,
          phone: leadPayload.phone,
          email: leadPayload.email,
          message: leadPayload.message,
          notes: leadPayload.notes,
          source: leadPayload.source,
        };
        const fallbackRes = await adminSupabase.from('leads').insert(fallbackPayload).select('id').maybeSingle();
        if (fallbackRes.error) {
          console.error('[api/leads] Admin fallback lead insert error:', fallbackRes.error.message);
          throw fallbackRes.error;
        }
        if (fallbackRes.data) {
          insertedLeadId = fallbackRes.data.id;
        }
      }
    } else {
      // Anon client: execute INSERT only without .select()
      const insertRes = await supabase.from('leads').insert(leadPayload);
      if (insertRes.error) {
        console.warn('[api/leads] Anon lead insert error, attempting minimal fallback:', insertRes.error.message);
        const fallbackPayload = {
          name: leadPayload.name,
          phone: leadPayload.phone,
          email: leadPayload.email,
          message: leadPayload.message,
          notes: leadPayload.notes,
          source: leadPayload.source,
        };
        const fallbackRes = await supabase.from('leads').insert(fallbackPayload);
        if (fallbackRes.error) {
          console.error('[api/leads] Anon fallback lead insert error:', fallbackRes.error.message);
          throw fallbackRes.error;
        }
      }
    }

    const notificationPayload = {
      name: leadPayload.name,
      phone: leadPayload.phone,
      email: leadPayload.email,
      message: leadPayload.message,
      propertyTitle: resolvedPropertyTitle,
      propertySlug: resolvedPropertySlug,
      budget: sanitizedBudget || null,
      notes: cleanNotes,
      source: leadPayload.source,
      entryMethod: 'form',
      preferredChannel: sanitizedChannel || 'WhatsApp',
    };

    // 1. Dispatch background notification if webhook/bot is active
    try {
      await sendServerSideLeadNotification(notificationPayload);
    } catch (notifyErr) {
      console.warn('[api/leads] WhatsApp server-side notification non-fatal error:', notifyErr);
    }

    // 2. Build direct WhatsApp URL to notify Farid Zakaria
    const faridWhatsAppUrl = getNotifyFaridWhatsAppUrl(notificationPayload);

    // 3. Secure Response:
    // Do NOT return unmasked client phone or private details in response body
    return NextResponse.json({ 
      success: true, 
      id: insertedLeadId || undefined,
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
