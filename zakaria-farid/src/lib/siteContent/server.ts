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

export const getSettingsLastSaved = cache(async (): Promise<{updatedAt?:string;actor?:string}> => {
  const client=await createClient();
  const {data,error}=await client.from('site_content').select('updated_at,updated_by').in('key',['platform_settings','about_page']).order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if(error||!data?.updated_at)return {};
  const {data:{user}}=await client.auth.getUser();
  const actor=user?.id===data.updated_by?(user?.user_metadata?.full_name||user?.user_metadata?.name||user?.email):undefined;
  return {updatedAt:data.updated_at,...(typeof actor==='string'&&actor?{actor}: {})};
});
