import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env.local');
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {}
}

loadEnv();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Try calling rpc if any sql executor exists
  const rpcs = ['exec_sql', 'exec', 'query', 'run_sql', 'execute_sql'];
  for (const name of rpcs) {
    const { data, error } = await supabase.rpc(name, {
      query: "ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'building'; ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'garage';"
    });
    console.log(`RPC [${name}]:`, { data, error });
  }
}

main();
