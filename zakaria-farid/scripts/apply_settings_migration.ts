import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lybkeycbiposjkjkyjlh.supabase.co';
const SERVICE_ROLE_KEY = 'sb_secret_euJWBvU0hgJFcdrlPyCR9Q_gjO6trMU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('⚙️ Checking & creating site_settings table...');

  // Try creating row or upserting
  const { data, error } = await supabase
    .from('site_settings')
    .upsert({ key: 'accent_color', value: '#C9A96A' }, { onConflict: 'key' })
    .select();

  if (error) {
    console.error('❌ Table error:', error.message);
  } else {
    console.log('✅ site_settings ready:', data);
  }
}

main().catch(console.error);
