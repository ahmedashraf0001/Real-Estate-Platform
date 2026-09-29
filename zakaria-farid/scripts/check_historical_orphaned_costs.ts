import { createClient } from '@supabase/supabase-js';

// Configuration: Load from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lybkeycbiposjkjkyjlh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'sb_publishable_5Mdq_Z4t3Wnt80h-UqltlA_2DLtS3Cc';

export interface OrphanedCostEntry {
  entryId: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  sourceModule: string;
  sourceEntityId?: string;
  accountCode: string;
  debitAmount: string;
}

export interface OrphanedCostAuditResult {
  totalWipJournalEntries: number;
  totalCostRecords: number;
  orphanedEntriesCount: number;
  orphanedEntries: OrphanedCostEntry[];
  permissionError?: string;
}

/**
 * Pure function: Detects journal entries on WIP accounts (150000-153000) or module WIP_ALLOCATION
 * that lack a corresponding entry in erp_property_costs.
 */
export function findOrphanedWipEntries(
  journalEntries: any[],
  propertyCosts: any[]
): { totalWipEntriesCount: number; orphanedEntries: OrphanedCostEntry[] } {
  const wipAccounts = new Set(['150000', '151000', '152000', '153000']);
  const orphanedEntries: OrphanedCostEntry[] = [];
  let totalWipEntriesCount = 0;

  for (const entry of journalEntries) {
    const lines = entry.lines || entry.erp_journal_lines || [];
    const wipLines = lines.filter((l: any) => 
      wipAccounts.has(l.account_code) && parseFloat(l.debit_amount || '0') > 0
    );

    if (wipLines.length === 0 && entry.source_module !== 'WIP_ALLOCATION') {
      continue;
    }

    totalWipEntriesCount++;

    for (const line of (wipLines.length > 0 ? wipLines : lines)) {
      // Check if this entry exists in erp_property_costs
      const matchingCost = propertyCosts.find((c: any) => {
        if (c.invoice_ref && c.invoice_ref === entry.entry_number) return true;
        if (c.item_id === entry.source_entity_id) return true;
        if (
          c.logged_date === entry.entry_date && 
          parseFloat(c.total_cost_egp || '0') === parseFloat(line.debit_amount || '0') &&
          (!entry.source_entity_id || c.property_id === entry.source_entity_id)
        ) {
          return true;
        }
        return false;
      });

      if (!matchingCost) {
        orphanedEntries.push({
          entryId: entry.entry_id,
          entryNumber: entry.entry_number,
          entryDate: entry.entry_date,
          description: entry.description,
          sourceModule: entry.source_module,
          sourceEntityId: entry.source_entity_id,
          accountCode: line.account_code,
          debitAmount: line.debit_amount
        });
      }
    }
  }

  return { totalWipEntriesCount, orphanedEntries };
}

export async function checkOrphanedJournalCosts(): Promise<OrphanedCostAuditResult> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('--- AUDIT: Checking Historical Orphaned Journal Costs ---');
  console.log(`Supabase URL: ${supabaseUrl}`);

  // Optional: Check if admin credentials were provided via CLI or env
  const args = typeof process !== 'undefined' ? process.argv : [];
  const getArg = (flag: string) => {
    const item = args.find(a => a.startsWith(`${flag}=`));
    return item ? item.split('=')[1] : undefined;
  };
  const email = process.env.SUPABASE_AUTH_EMAIL || getArg('--email');
  const password = process.env.SUPABASE_AUTH_PASSWORD || getArg('--password');

  if (email && password) {
    console.log(`Authenticating with Supabase as ${email}...`);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      console.warn(`Authentication warning: ${authErr.message}`);
    } else {
      console.log(`Authenticated successfully.`);
    }
  }

  // 1. Fetch all journal entries with lines
  const { data: entriesData, error: entriesError } = await supabase
    .from('erp_journal_entries')
    .select('*, erp_journal_lines(*)');

  if (entriesError) {
    console.warn(`\n[ACCESS RESTRICTION] Could not query erp_journal_entries: ${entriesError.message}`);
    console.log('Reason: Migration 016 revoked anon access to all 16 core ERP tables to protect financial records.');
    console.log('To inspect production data, please run:');
    console.log('  File: supabase/check_historical_orphaned_costs.sql');
    console.log('directly inside the Supabase SQL Editor with administrative permissions.\n');
    return {
      totalWipJournalEntries: 0,
      totalCostRecords: 0,
      orphanedEntriesCount: -1,
      orphanedEntries: [],
      permissionError: entriesError.message
    };
  }

  // 2. Fetch all property costs
  const { data: costsData, error: costsError } = await supabase
    .from('erp_property_costs')
    .select('*');

  if (costsError) {
    console.warn(`Note: Could not query erp_property_costs: ${costsError.message}`);
  }

  const propertyCosts = costsData || [];
  const journalEntries = entriesData || [];

  const { totalWipEntriesCount, orphanedEntries } = findOrphanedWipEntries(journalEntries, propertyCosts);

  console.log(`\nAudit Results:`);
  console.log(`- Total WIP Journal Entries Analyzed: ${totalWipEntriesCount}`);
  console.log(`- Total Property Cost Records in DB: ${propertyCosts.length}`);
  console.log(`- Orphaned Journal Entries (Missing in erp_property_costs): ${orphanedEntries.length}`);

  if (orphanedEntries.length > 0) {
    console.log('\nDetailed List of Orphaned Entries:');
    console.table(orphanedEntries);
  } else {
    console.log('\n[PASS] No orphaned journal entries found! All WIP entries have corresponding cost records or none exist.');
  }

  return {
    totalWipJournalEntries: totalWipEntriesCount,
    totalCostRecords: propertyCosts.length,
    orphanedEntriesCount: orphanedEntries.length,
    orphanedEntries
  };
}

// Direct CLI Execution
if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.includes('check_historical_orphaned_costs'))) {
  checkOrphanedJournalCosts()
    .then(res => {
      if (res.orphanedEntriesCount === -1) {
        console.log('Audit script finished (database query requires administrative credentials).');
      } else {
        console.log('Audit completed successfully.');
      }
    })
    .catch(err => {
      console.error('Audit execution error:', err);
    });
}
