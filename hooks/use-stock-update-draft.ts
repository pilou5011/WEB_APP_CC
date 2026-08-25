import { useEffect, useRef, useCallback } from 'react';
import { supabase, DraftStockUpdateData } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';

const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const LOCAL_STORAGE_PREFIX = 'stock_update_draft_';

export interface DraftInfo {
  clientId: string;
  createdAt: string;
  source: 'local' | 'server';
}

/** Fetch the most recent active draft row (never use maybeSingle — duplicates break it). */
async function fetchLatestActiveDraft(
  clientId: string,
  companyId: string,
  columns: string = '*'
) {
  const { data, error } = await supabase
    .from('draft_stock_updates')
    .select(columns)
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

/** Soft-delete older active duplicates so only the latest remains. */
async function softDeleteOlderDuplicates(
  clientId: string,
  companyId: string,
  keepId: string
) {
  const { error } = await supabase
    .from('draft_stock_updates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .neq('id', keepId);

  if (error) {
    console.warn('[Draft] Could not soft-delete duplicate drafts:', error);
  }
}

export function useStockUpdateDraft(clientId: string, isActiveTab: boolean = true) {
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncDataRef = useRef<string>('');

  const getLocalStorageKey = useCallback(() => {
    return `${LOCAL_STORAGE_PREFIX}${clientId}`;
  }, [clientId]);

  // Save to localStorage
  const saveDraftLocally = useCallback((data: DraftStockUpdateData) => {
    try {
      const key = getLocalStorageKey();
      const draftInfo = {
        data,
        clientId,
        createdAt: new Date().toISOString(),
        source: 'local' as const
      };
      localStorage.setItem(key, JSON.stringify(draftInfo));
      console.log('[Draft] Saved locally for client:', clientId);
    } catch (error) {
      console.error('[Draft] Error saving to localStorage:', error);
    }
  }, [clientId, getLocalStorageKey]);

  /**
   * Persist draft to server for this client+company.
   * Rule: never create a 2nd active draft — always UPDATE the latest one.
   * Prefer atomic RPC; fall back to select-then-update/insert with race handling.
   */
  const saveDraftToServer = useCallback(async (data: DraftStockUpdateData) => {
    if (!isActiveTab) {
      console.log('[Draft] Not saving: not on active tab');
      return;
    }

    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const dataString = JSON.stringify(data);

      if (dataString === lastSyncDataRef.current) {
        console.log('[Draft] No changes detected, skipping server sync');
        return;
      }

      // Preferred path: one DB round-trip, never two active rows
      const { data: rpcId, error: rpcError } = await supabase.rpc(
        'upsert_draft_stock_update',
        {
          p_client_id: clientId,
          p_company_id: companyId,
          p_draft_data: data,
        }
      );

      if (!rpcError) {
        lastSyncDataRef.current = dataString;
        console.log('[Draft] Upserted server draft for client:', clientId, 'id:', rpcId);
        return;
      }

      // RPC missing (migration not applied yet) or failed — safe client-side upsert
      console.warn('[Draft] RPC upsert unavailable, using fallback:', rpcError.message);

      const existing = await fetchLatestActiveDraft(clientId, companyId, 'id');

      if (existing) {
        const { error: updateError } = await supabase
          .from('draft_stock_updates')
          .update({
            draft_data: data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('company_id', companyId);

        if (updateError) throw updateError;
        await softDeleteOlderDuplicates(clientId, companyId, existing.id);
        console.log('[Draft] Updated existing server draft for client:', clientId);
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('draft_stock_updates')
          .insert([
            {
              client_id: clientId,
              company_id: companyId,
              draft_data: data,
            },
          ])
          .select('id')
          .maybeSingle();

        // Unique violation / concurrent insert → update the row that won
        if (insertError) {
          const isUniqueConflict =
            insertError.code === '23505' ||
            /duplicate|unique/i.test(insertError.message || '');

          if (!isUniqueConflict) throw insertError;

          const winner = await fetchLatestActiveDraft(clientId, companyId, 'id');
          if (!winner) throw insertError;

          const { error: raceUpdateError } = await supabase
            .from('draft_stock_updates')
            .update({
              draft_data: data,
              updated_at: new Date().toISOString(),
            })
            .eq('id', winner.id)
            .eq('company_id', companyId);

          if (raceUpdateError) throw raceUpdateError;
          await softDeleteOlderDuplicates(clientId, companyId, winner.id);
          console.log('[Draft] Race resolved: updated winning draft for client:', clientId);
        } else if (inserted?.id) {
          await softDeleteOlderDuplicates(clientId, companyId, inserted.id);
          console.log('[Draft] Created first server draft for client:', clientId);
        }
      }

      lastSyncDataRef.current = dataString;
    } catch (error) {
      console.error('[Draft] Error saving to server:', error);
    }
  }, [clientId, isActiveTab]);

  // Load draft from localStorage
  const loadDraftLocally = useCallback((): DraftStockUpdateData | null => {
    try {
      const key = getLocalStorageKey();
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      console.log('[Draft] Loaded local draft for client:', clientId);
      return parsed.data;
    } catch (error) {
      console.error('[Draft] Error loading from localStorage:', error);
      return null;
    }
  }, [clientId, getLocalStorageKey]);

  // Load draft from server (most recent active row)
  const loadDraftFromServer = useCallback(async (): Promise<DraftStockUpdateData | null> => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const data = await fetchLatestActiveDraft(clientId, companyId, '*');
      if (!data) return null;

      // Best-effort cleanup if duplicates accumulated
      await softDeleteOlderDuplicates(clientId, companyId, data.id);

      console.log('[Draft] Loaded server draft for client:', clientId);
      return data.draft_data as DraftStockUpdateData;
    } catch (error) {
      console.error('[Draft] Error loading from server:', error);
      return null;
    }
  }, [clientId]);

  // Get draft info (for showing prompt to user)
  // Prefer meaningful local draft; otherwise fall through to server
  // (avoids a stale/empty local entry masking a good server draft)
  const getDraftInfo = useCallback(async (): Promise<DraftInfo | null> => {
    let localInfo: DraftInfo | null = null;
    let localData: DraftStockUpdateData | null = null;

    try {
      const key = getLocalStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        localData = parsed.data as DraftStockUpdateData;
        localInfo = {
          clientId: parsed.clientId,
          createdAt: parsed.createdAt,
          source: 'local'
        };
      }
    } catch (error) {
      console.error('[Draft] Error checking local draft info:', error);
    }

    const localIsMeaningful =
      localData &&
      (
        Object.values(localData.perProductForm || {}).some(
          (form) =>
            form.counted_stock !== '' ||
            form.stock_added !== '' ||
            (form.reassort_saisie && form.reassort_saisie !== '')
        ) ||
        (localData.perSubProductForm &&
          Object.values(localData.perSubProductForm).some(
            (form) =>
              form.counted_stock !== '' ||
              form.stock_added !== '' ||
              (form.reassort_saisie && form.reassort_saisie !== '')
          )) ||
        (localData.pendingAdjustments && localData.pendingAdjustments.length > 0)
      );

    if (localInfo && localIsMeaningful) {
      return localInfo;
    }

    // Check server (or fall through if local exists but is not meaningful)
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        return localInfo; // may be non-meaningful local only
      }

      const data = await fetchLatestActiveDraft(
        clientId,
        companyId,
        'id, client_id, created_at, updated_at'
      );

      if (data) {
        await softDeleteOlderDuplicates(clientId, companyId, data.id);
        return {
          clientId: data.client_id,
          createdAt: data.created_at,
          source: 'server'
        };
      }
    } catch (error) {
      console.error('[Draft] Error checking server draft info:', error);
    }

    return localInfo;
  }, [clientId, getLocalStorageKey]);

  // Delete drafts (both local and server)
  const deleteDraft = useCallback(async () => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      console.log('[Draft] Starting deletion for client:', clientId);
      
      // Delete from localStorage FIRST
      const key = getLocalStorageKey();
      localStorage.removeItem(key);
      console.log('[Draft] Deleted local draft for client:', clientId);

      // Soft-delete ALL active drafts for this client (handles duplicates)
      const { error, data } = await supabase
        .from('draft_stock_updates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .select();

      if (error) {
        console.error('[Draft] Server deletion error:', error);
        throw error;
      }
      
      console.log('[Draft] Deleted server draft for client:', clientId, 'Rows deleted:', data?.length || 0);

      lastSyncDataRef.current = '';
      
      const remaining = await fetchLatestActiveDraft(clientId, companyId, 'id');
      
      if (remaining) {
        console.warn('[Draft] WARNING: Draft still exists after deletion attempt! Retrying...');
        const { error: retryError } = await supabase
          .from('draft_stock_updates')
          .update({ deleted_at: new Date().toISOString() })
          .eq('client_id', clientId)
          .eq('company_id', companyId)
          .is('deleted_at', null);
        
        if (retryError) {
          console.error('[Draft] Retry deletion also failed:', retryError);
          throw retryError;
        } else {
          console.log('[Draft] Successfully deleted draft on retry');
        }
      } else {
        console.log('[Draft] Deletion verified: no draft remains in database');
      }
      
      if (localStorage.getItem(key)) {
        console.warn('[Draft] WARNING: LocalStorage still contains draft data, removing...');
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('[Draft] Error deleting draft:', error);
      throw error;
    }
  }, [clientId, getLocalStorageKey]);

  // Check if data is empty (no need to save)
  const isDraftEmpty = useCallback((data: DraftStockUpdateData): boolean => {
    const hasProductData = Object.values(data.perProductForm || {}).some(
      form =>
        form.counted_stock !== '' ||
        form.stock_added !== '' ||
        form.product_info !== '' ||
        (form.reassort_saisie && form.reassort_saisie !== '')
    );

    const hasSubProductData = data.perSubProductForm
      ? Object.values(data.perSubProductForm).some(
          form =>
            form.counted_stock !== '' ||
            form.stock_added !== '' ||
            (form.reassort_saisie && form.reassort_saisie !== '')
        )
      : false;

    const hasAdjustments = (data.pendingAdjustments || []).length > 0;

    return !hasProductData && !hasSubProductData && !hasAdjustments;
  }, []);

  // Check if draft has meaningful data that warrants showing recovery dialog
  const hasMeaningfulDraft = useCallback((data: DraftStockUpdateData): boolean => {
    const hasStockData = Object.values(data.perProductForm || {}).some(
      form =>
        form.counted_stock !== '' ||
        form.stock_added !== '' ||
        (form.reassort_saisie && form.reassort_saisie !== '')
    );

    const hasSubProductStockData = data.perSubProductForm
      ? Object.values(data.perSubProductForm).some(
          form =>
            form.counted_stock !== '' ||
            form.stock_added !== '' ||
            (form.reassort_saisie && form.reassort_saisie !== '')
        )
      : false;

    const hasAdjustments = (data.pendingAdjustments || []).length > 0;

    return hasStockData || hasSubProductStockData || hasAdjustments;
  }, []);

  // Auto-save function (saves to local immediately, syncs to server periodically)
  const autoSave = useCallback((data: DraftStockUpdateData) => {
    if (!isActiveTab) {
      console.log('[Draft] AutoSave: Not saving - not on active tab');
      return;
    }

    if (isDraftEmpty(data)) {
      console.log('[Draft] AutoSave: Data is empty, not saving');
      return;
    }

    console.log('[Draft] AutoSave: Saving draft data', data);
    saveDraftLocally(data);
    saveDraftToServer(data).catch(err => 
      console.error('[Draft] Error in immediate server save:', err)
    );
  }, [saveDraftLocally, isDraftEmpty, isActiveTab, saveDraftToServer]);

  // Setup periodic sync to server (only if active tab)
  useEffect(() => {
    if (!isActiveTab) {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      return;
    }

    const syncToServer = async () => {
      try {
        const key = getLocalStorageKey();
        const stored = localStorage.getItem(key);
        if (!stored) return;

        const parsed = JSON.parse(stored);
        const data = parsed.data as DraftStockUpdateData;

        if (isDraftEmpty(data)) {
          return;
        }

        await saveDraftToServer(data);
      } catch (error) {
        console.error('[Draft] Error during periodic sync:', error);
      }
    };

    const initialSyncTimer = setTimeout(syncToServer, 5000);
    syncTimerRef.current = setInterval(syncToServer, SYNC_INTERVAL);

    return () => {
      clearTimeout(initialSyncTimer);
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [clientId, getLocalStorageKey, saveDraftToServer, isDraftEmpty, isActiveTab]);

  // Cleanup on unmount - perform final sync (only if active tab)
  useEffect(() => {
    return () => {
      if (!isActiveTab) {
        return;
      }
      const key = getLocalStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const data = parsed.data as DraftStockUpdateData;
          if (!isDraftEmpty(data)) {
            saveDraftToServer(data).catch(err => 
              console.error('[Draft] Error in final sync on unmount:', err)
            );
          }
        } catch (error) {
          console.error('[Draft] Error during unmount sync:', error);
        }
      }
    };
  }, [getLocalStorageKey, saveDraftToServer, isDraftEmpty, isActiveTab]);

  return {
    autoSave,
    loadDraftLocally,
    loadDraftFromServer,
    getDraftInfo,
    deleteDraft,
    saveDraftToServer,
    hasMeaningfulDraft
  };
}
