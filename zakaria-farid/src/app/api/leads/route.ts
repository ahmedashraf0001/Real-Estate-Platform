import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message, property_id, notes, source } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from('leads').insert({
      name,
      email: email || null,
      phone,
      message: message || null,
      property_id: property_id || null,
      notes: notes || null,
      source: source || 'website',
      entry_method: 'form',
      stage: 'new',
      stage_updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Lead submission error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
