'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { mergeSiteContent, PRIVATE_AUTOMATION_FIELDS, SITE_CONTENT_DEFAULTS, type SiteContentKey } from '@/lib/siteContent/defaults';

export async function saveSiteContent(key: SiteContentKey, content: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    // Existing properties/leads policies identify administrators by authenticated role.
    if (authError || !user || user.role !== 'authenticated') return { success: false, error: 'غير مصرح بالحفظ / Unauthorized' };
    if (!Object.hasOwn(SITE_CONTENT_DEFAULTS, key)) return { success: false, error: 'مفتاح محتوى غير صالح / Invalid content key' };
    if (key === 'platform_settings' && content && typeof content === 'object') {
      const config = (content as Record<string, unknown>).whatsappAutomation;
      if (config && typeof config === 'object' && PRIVATE_AUTOMATION_FIELDS.some(field => Boolean((config as Record<string, unknown>)[field]))) {
        return { success: false, error: 'بيانات مزود الخدمة السرية تُضبط في متغيرات الخادم فقط.' };
      }
    }
    const { error } = await client.from('site_content').upsert({ key, content: mergeSiteContent(key, content), updated_by: user.id }, { onConflict: 'key' });
    if (error) return { success: false, error: error.message };
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'تعذر الحفظ / Save failed' };
  }
}

export async function resetSiteContent(key: SiteContentKey): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user || user.role !== 'authenticated') return { success: false, error: 'غير مصرح بالحفظ / Unauthorized' };
    if (!Object.hasOwn(SITE_CONTENT_DEFAULTS, key)) return { success: false, error: 'مفتاح محتوى غير صالح / Invalid content key' };
    const { error } = await client.from('site_content').delete().eq('key', key);
    if (error) return { success: false, error: error.message };
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'تعذر الاستعادة / Reset failed' };
  }
}
