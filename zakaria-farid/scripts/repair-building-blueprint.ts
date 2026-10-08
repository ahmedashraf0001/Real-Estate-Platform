// Task-authorized one-property repair. Dry run by default; never writes inventory/contracts.
import { createClient } from '@supabase/supabase-js';
import { repairBuildingTradeScopes } from '../src/lib/layering/buildingBlueprint';
import type { ZoneInstance } from '../src/lib/layering/instances';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || new URL(url).hostname !== 'lybkeycbiposjkjkyjlh.supabase.co') throw new Error('Repair restricted to test project lybkeycbiposjkjkyjlh');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('Missing anon/publishable key');
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  // An authenticated test-admin session may be supplied by the operator when RLS blocks anon UPDATE.
  if (process.env.BLUEPRINT_TEST_ACCESS_TOKEN) await supabase.auth.setSession({ access_token: process.env.BLUEPRINT_TEST_ACCESS_TOKEN, refresh_token: process.env.BLUEPRINT_TEST_REFRESH_TOKEN ?? '' });
  const read = async () => {
    const { data, error } = await supabase.from('properties').select('id,slug,type,spec_layers').eq('slug', 'el-gouna-marina-residential-building-عمارة-شقق-بالجونة-bqycxm').single();
    if (error) throw error;
    if (data.type !== 'building' || !Array.isArray(data.spec_layers) || !data.spec_layers.every((z: ZoneInstance) => z.zone_template_id && Array.isArray(z.trades))) throw new Error('Expected building ZoneInstance JSON');
    return data;
  };
  const before = await read();
  const result = repairBuildingTradeScopes(before.spec_layers);
  console.log(JSON.stringify({ phase: 'dry-run', id: before.id, zonesBefore: before.spec_layers.length, zonesAfter: result.zones.length, tradesBefore: result.before, tradesAfter: result.after, movedAttachments: result.moved, buildingTrades: result.zones.find(z => z.zone_template_id === 'bld.building')?.trades.length ?? 0, secondRunMoved: repairBuildingTradeScopes(result.zones).moved }));
  if (!process.argv.includes('--apply') || !result.moved) return;
  const current = await read();
  if (JSON.stringify(current.spec_layers) !== JSON.stringify(before.spec_layers)) throw new Error('Blueprint changed after dry-run; rerun before applying');
  const { data, error } = await supabase.from('properties').update({ spec_layers: result.zones }).eq('id', before.id).eq('type', 'building').select('id');
  if (error) throw error;
  if (data?.length !== 1) throw new Error('RLS blocked repair: UPDATE returned no rows');
  const after = await read();
  if (repairBuildingTradeScopes(after.spec_layers).moved !== 0) throw new Error('Repair read-back did not verify');
  console.log(JSON.stringify({ phase: 'applied', id: after.id, zones: after.spec_layers.length, trades: result.after, secondRunMoved: 0 }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
