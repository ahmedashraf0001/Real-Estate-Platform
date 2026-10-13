import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { mergeSiteContent, type SiteContentKey, type SiteContentMap } from './defaults';

// React cache deduplicates calls inside one server render, not across visitors.
export const getSiteContent = cache(async <K extends SiteContentKey>(key: K): Promise<SiteContentMap[K]> => {
  const client = await createClient();
  const { data, error } = await client.from('site_content').select('content').eq('key', key).maybeSingle();
  if (error) console.error(`Unable to read site_content/${key}:`, error.message);
  return mergeSiteContent(key, data?.content);
});
