'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function getAccentColor(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const cookieColor = cookieStore.get('zf_accent_color')?.value;
    if (cookieColor) return cookieColor;

    const supabase = await createClient();

    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'accent_color')
      .maybeSingle();

    if (data?.value) return data.value;
  } catch {
    // Graceful fallback to default gold
  }
  return '#C9A96A';
}

export async function updateAccentColor(colorHex: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies();
    cookieStore.set('zf_accent_color', colorHex, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });

    try {
      const supabase = await createClient();
      await supabase.from('site_settings').upsert({ key: 'accent_color', value: colorHex }, { onConflict: 'key' });
    } catch {
      // Ignored if table not created in remote DB yet
    }

    revalidatePath('/', 'layout');
    revalidatePath('/admin', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update accent color' };
  }
}
