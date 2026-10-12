import { createBrowserClient } from '@supabase/ssr';

export function createClient(fetchOverride?: typeof fetch) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient(url, key, fetchOverride ? {
    global: { fetch: fetchOverride }, isSingleton: false,
    auth: { autoRefreshToken: false, detectSessionInUrl: false },
  } : undefined);
}

