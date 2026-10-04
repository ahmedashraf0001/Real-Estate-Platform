import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids') || '';
  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);

  if (!ids.length) {
    return NextResponse.json({ properties: [] });
  }

  const results: any[] = [];
  const foundIds = new Set<string>();

  try {
    const supabase = await createClient();
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const uuids = ids.filter(isUuid);
    const slugs = ids.filter(id => !isUuid(id));

    if (uuids.length > 0) {
      const res = await supabase
        .from('properties')
        .select(`*, property_images(*), property_amenities(*)`)
        .in('id', uuids);

      if (res.data && Array.isArray(res.data)) {
        for (const p of res.data) {
          const canonicalKey = p.id || p.slug;
          if (canonicalKey && !foundIds.has(canonicalKey)) {
            foundIds.add(canonicalKey);
            if (p.slug) foundIds.add(p.slug);
            if (p.id) foundIds.add(p.id);
            results.push(p);
          }
        }
      }
    }

    if (slugs.length > 0) {
      const res = await supabase
        .from('properties')
        .select(`*, property_images(*), property_amenities(*)`)
        .in('slug', slugs);

      if (res.data && Array.isArray(res.data)) {
        for (const p of res.data) {
          const canonicalKey = p.id || p.slug;
          if (canonicalKey && !foundIds.has(canonicalKey)) {
            foundIds.add(canonicalKey);
            if (p.slug) foundIds.add(p.slug);
            if (p.id) foundIds.add(p.id);
            results.push(p);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to query properties from Supabase for saved portfolio:', err);
  }

  return NextResponse.json({ properties: results });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (!ids.length) {
      return NextResponse.json({ properties: [] });
    }

    const results: any[] = [];
    const foundIds = new Set<string>();

    try {
      const supabase = await createClient();
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const uuids = ids.filter(isUuid);
      const slugs = ids.filter(id => !isUuid(id));

      if (uuids.length > 0) {
        const res = await supabase
          .from('properties')
          .select(`*, property_images(*), property_amenities(*)`)
          .in('id', uuids);

        if (res.data && Array.isArray(res.data)) {
          for (const p of res.data) {
            const canonicalKey = p.id || p.slug;
            if (canonicalKey && !foundIds.has(canonicalKey)) {
              foundIds.add(canonicalKey);
              if (p.slug) foundIds.add(p.slug);
              if (p.id) foundIds.add(p.id);
              results.push(p);
            }
          }
        }
      }

      if (slugs.length > 0) {
        const res = await supabase
          .from('properties')
          .select(`*, property_images(*), property_amenities(*)`)
          .in('slug', slugs);

        if (res.data && Array.isArray(res.data)) {
          for (const p of res.data) {
            const canonicalKey = p.id || p.slug;
            if (canonicalKey && !foundIds.has(canonicalKey)) {
              foundIds.add(canonicalKey);
              if (p.slug) foundIds.add(p.slug);
              if (p.id) foundIds.add(p.id);
              results.push(p);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to query properties from Supabase:', err);
    }

    return NextResponse.json({ properties: results });
  } catch (err) {
    return NextResponse.json({ properties: [] }, { status: 400 });
  }
}
