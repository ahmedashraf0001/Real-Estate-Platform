import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQ = searchParams.get('q')?.trim() || '';
  const typeParam = searchParams.get('type')?.trim();
  const mode = searchParams.get('mode');

  const supabase = await createClient();

  // Mode: Extract clean dynamic suggestions from actual database records
  if (mode === 'suggestions') {
    const { data: props } = await supabase
      .from('properties')
      .select('location, type')
      .eq('listing_status', 'active')
      .order('created_at', { ascending: false })
      .limit(30);

    const locationsSet = new Set<string>();
    const typesSet = new Set<string>();

    props?.forEach((p) => {
      if (p.location) {
        const mainLoc = p.location.split(',')[0].trim();
        if (mainLoc) locationsSet.add(mainLoc);
      }
      if (p.type) {
        typesSet.add(p.type.trim());
      }
    });

    const suggestions = [
      ...Array.from(locationsSet),
      ...Array.from(typesSet),
    ].slice(0, 6);

    return NextResponse.json({ suggestions, results: [] });
  }

  if (!rawQ && !typeParam) {
    return NextResponse.json({ suggestions: [], results: [] });
  }

  // Clean query string (strip syntax delimiters)
  const sanitizedQ = rawQ ? rawQ.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const words = sanitizedQ ? sanitizedQ.split(' ').filter((w) => w.length >= 2) : [];

  let query = supabase
    .from('properties')
    .select(`
      id,
      title_en,
      title_ar,
      slug,
      price_egp,
      location,
      bedrooms,
      bathrooms,
      area_sqm,
      type,
      property_images(url, sort_order)
    `)
    .eq('listing_status', 'active');

  // Enforce property type filtering if type dropdown is selected
  if (typeParam) {
    query = query.eq('type', typeParam);
  }

  // Apply location / title conditions if search text is typed
  if (sanitizedQ) {
    const conditions: string[] = [
      `title_en.ilike.%${sanitizedQ}%`,
      `title_ar.ilike.%${sanitizedQ}%`,
      `location.ilike.%${sanitizedQ}%`
    ];

    if (words.length > 1) {
      words.forEach((word) => {
        if (word.length >= 3) {
          conditions.push(
            `location.ilike.%${word}%`,
            `title_en.ilike.%${word}%`,
            `title_ar.ilike.%${word}%`
          );
        }
      });
    }

    query = query.or(conditions.join(','));
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) {
    return NextResponse.json({ suggestions: [], results: [] });
  }

  return NextResponse.json({ suggestions: [], results: data ?? [] });
}
