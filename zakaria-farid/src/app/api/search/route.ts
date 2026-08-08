import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseSmartQuery } from '@/lib/utils/searchUtils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQ = searchParams.get('q')?.trim() || '';
  let typeParam = searchParams.get('type')?.trim();
  const mode = searchParams.get('mode');
  const locale = searchParams.get('locale') || 'en';

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

  const parsed = parseSmartQuery(rawQ);
  if (!typeParam && parsed.detectedType) {
    typeParam = parsed.detectedType;
  }

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

  if (typeParam) {
    query = query.eq('type', typeParam);
  }

  if (parsed.searchTerms.length > 0) {
    const conditionsSet = new Set<string>();
    parsed.searchTerms.forEach((term) => {
      const sanitized = term.replace(/[,()%]/g, ' ').trim();
      if (sanitized.length >= 2) {
        conditionsSet.add(`location.ilike.%${sanitized}%`);
        conditionsSet.add(`title_en.ilike.%${sanitized}%`);
        conditionsSet.add(`title_ar.ilike.%${sanitized}%`);
        conditionsSet.add(`description_en.ilike.%${sanitized}%`);
        conditionsSet.add(`description_ar.ilike.%${sanitized}%`);
      }
    });

    if (conditionsSet.size > 0) {
      query = query.or(Array.from(conditionsSet).join(','));
    }
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) {
    return NextResponse.json({ suggestions: [], results: [] });
  }

  return NextResponse.json({ suggestions: [], results: data ?? [] });
}

