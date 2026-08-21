import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signature.trim().toLowerCase().replace(/^sha256=/, '');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function fieldValue(responses: Record<string, unknown> | undefined, key: string): string | null {
  if (!responses) return null;
  const raw = responses[key];
  if (raw == null) return null;
  if (typeof raw === 'string') return raw.trim() || null;
  if (typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)) {
    const v = (raw as Record<string, unknown>).value;
    return typeof v === 'string' ? (v.trim() || null) : v != null ? String(v) : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-cal-signature-256');
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: { triggerEvent?: string; payload?: Record<string, any> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const triggerEvent = body.triggerEvent;
  const payload = body.payload;
  if (triggerEvent !== 'BOOKING_CREATED' || !payload) {
    return NextResponse.json({ ok: true, ignored: triggerEvent ?? 'unknown' });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
  }

  const uid: string | null = payload.uid || payload.bookingId?.toString() || null;
  if (!uid) {
    return NextResponse.json({ error: 'Missing booking uid' }, { status: 400 });
  }

  const attendee = Array.isArray(payload.attendees) ? payload.attendees[0] : undefined;
  const responses = payload.responses as Record<string, unknown> | undefined;

  const email: string | null =
    (attendee?.email as string | undefined)?.trim().toLowerCase() ||
    fieldValue(responses, 'email')?.toLowerCase() ||
    null;
  const name: string =
    (attendee?.name as string | undefined)?.trim() ||
    fieldValue(responses, 'name') ||
    'Cal.com Guest';
  const phone: string | null =
    fieldValue(responses, 'phone') ||
    fieldValue(responses, 'attendeePhoneNumber') ||
    (attendee?.phoneNumber as string | undefined)?.trim() ||
    null;

  if (!email && !phone) {
    return NextResponse.json({ error: 'Booking has no attendee contact info' }, { status: 400 });
  }

  const metadata = (payload.metadata ?? {}) as Record<string, unknown>;
  const rawPropertyId = typeof metadata.propertyId === 'string' ? metadata.propertyId : null;
  const propertyId = rawPropertyId && UUID_RE.test(rawPropertyId) ? rawPropertyId : null;
  const propertySlug = typeof metadata.propertySlug === 'string' ? metadata.propertySlug : null;

  // Find-or-create the lead: a returning buyer attaches to their existing
  // record (matched by email, then phone) instead of spawning a duplicate.
  let leadId: string | null = null;

  if (email) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .ilike('email', email)
      .order('created_at', { ascending: true })
      .limit(1);
    leadId = data?.[0]?.id ?? null;
  }
  if (!leadId && phone) {
    const { data } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', phone)
      .order('created_at', { ascending: true })
      .limit(1);
    leadId = data?.[0]?.id ?? null;
  }

  if (!leadId) {
    const { data: created, error: leadError } = await supabase
      .from('leads')
      .insert({
        name,
        email,
        phone: phone ?? '',
        property_id: propertyId,
        message: propertySlug
          ? `Private viewing requested via Cal.com for ${propertySlug}.`
          : 'Private viewing requested via Cal.com.',
        source: 'calcom',
        entry_method: 'calcom_booking',
        stage: 'viewing_scheduled',
        stage_updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (leadError || !created) {
      console.error('[calcom-webhook] lead insert failed:', leadError?.message);
      return NextResponse.json({ error: 'Lead creation failed' }, { status: 500 });
    }
    leadId = created.id;
  }

  const bookingRow = {
    lead_id: leadId,
    property_id: propertyId,
    calcom_uid: uid,
    agent_ref:
      (payload.organizer?.email as string | undefined) ||
      (payload.organizer?.username as string | undefined) ||
      null,
    event_type_slug:
      (payload.eventType?.slug as string | undefined) ||
      (typeof payload.eventSlug === 'string' ? payload.eventSlug : null),
    start_time: typeof payload.startTime === 'string' ? payload.startTime : null,
    end_time: typeof payload.endTime === 'string' ? payload.endTime : null,
    status: 'viewing_scheduling_request',
    attendee_name: name,
    attendee_email: email,
    attendee_phone: phone,
    metadata,
    updated_at: new Date().toISOString(),
  };

  // Idempotent by Cal.com booking UID: a re-delivered webhook updates the
  // same row instead of duplicating the booking.
  let { error: bookingError } = await supabase
    .from('bookings')
    .upsert(bookingRow, { onConflict: 'calcom_uid' });

  if (bookingError && bookingError.code === '23503') {
    ({ error: bookingError } = await supabase
      .from('bookings')
      .upsert({ ...bookingRow, property_id: null }, { onConflict: 'calcom_uid' }));
  }

  if (bookingError) {
    console.error('[calcom-webhook] booking upsert failed:', bookingError.message);
    return NextResponse.json({ error: 'Booking persistence failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, leadId, calcomUid: uid });
}
