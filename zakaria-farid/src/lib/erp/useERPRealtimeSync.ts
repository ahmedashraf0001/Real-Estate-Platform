'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

export type RealtimeSyncStatus = 'connected' | 'syncing' | 'reconnecting' | 'disconnected';

interface UseERPRealtimeSyncOptions {
  supabase: SupabaseClient;
  onSync: (isSilent?: boolean) => Promise<unknown>;
  debounceMs?: number;
  heartbeatIntervalMs?: number;
  enabled?: boolean;
}

export function useERPRealtimeSync({
  supabase,
  onSync,
  debounceMs = 250,
  heartbeatIntervalMs = 25000,
  enabled = true
}: UseERPRealtimeSyncOptions) {
  const [status, setStatus] = useState<RealtimeSyncStatus>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => new Date());
  const [syncCount, setSyncCount] = useState<number>(0);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef<boolean>(false);
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  // Debounced silent revalidation trigger
  const triggerDebouncedSync = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setStatus('syncing');

      try {
        await onSyncRef.current(true);
        setLastSyncTime(new Date());
        setSyncCount(prev => prev + 1);
        setStatus('connected');
      } catch (err) {
        console.warn('Realtime background sync error:', err);
        setStatus('connected');
      } finally {
        isSyncingRef.current = false;
      }
    }, debounceMs);
  }, [debounceMs]);

  // Immediate manual sync (e.g. from refresh button)
  const triggerManualSync = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isSyncingRef.current = true;
    setStatus('syncing');

    try {
      await onSyncRef.current(true);
      setLastSyncTime(new Date());
      setSyncCount(prev => prev + 1);
      setStatus('connected');
    } catch (err) {
      console.warn('Manual sync error:', err);
      setStatus('connected');
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !supabase) return;

    // ERP Core Tables to subscribe to in Real-Time
    const ERP_TABLES = [
      'erp_contracts',
      'erp_installment_schedules',
      'erp_journal_entries',
      'erp_journal_lines',
      'erp_pdc_records',
      'erp_property_costs',
      'erp_rescissions',
      'erp_contract_amendments',
      'erp_cost_allocations',
      'erp_tax_records',
      'erp_partner_calls',
      'erp_maker_checker',
      'properties',
      'leads'
    ];

    setStatus('syncing');

    let channel = supabase.channel('zf-finos-realtime-master');

    ERP_TABLES.forEach(table => {
      channel = channel.on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        () => {
          triggerDebouncedSync();
        }
      );
    });

    channel.subscribe((subStatus) => {
      if (subStatus === 'SUBSCRIBED') {
        setStatus('connected');
      } else if (subStatus === 'CLOSED') {
        setStatus('disconnected');
      } else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
        setStatus('reconnecting');
      }
    });

    // 2. Window Focus & Visibility Change Listeners
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerDebouncedSync();
      }
    };

    const handleFocus = () => {
      triggerDebouncedSync();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // 3. Resilient Heartbeat Polling Loop (Safety Net for Mobile/Sleep)
    const heartbeatTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerDebouncedSync();
      }
    }, heartbeatIntervalMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      clearInterval(heartbeatTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      supabase.removeChannel(channel);
    };
  }, [supabase, enabled, heartbeatIntervalMs, triggerDebouncedSync]);

  return {
    status,
    lastSyncTime,
    syncCount,
    triggerManualSync
  };
}
