import { useEffect, useRef, useCallback } from 'react';
import { supabase, DraftStockUpdateData } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';

const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const LOCAL_STORAGE_PREFIX = 'stock_update_draft_';
/** How many recent active drafts to scan when recovering (newest first). */
const DRAFT_RECOVERY_SCAN_LIMIT = 50;

export interface DraftInfo {
  clientId: string;
  createdAt: string;
  source: 'local' | 'server';
}

/** True when draft has stock counts / reassort / adjustments (not only product_info). */
function draftDataIsMeaningful(data: DraftStockUpdateData | null | undefined): boolean {
  if (!data) return false;

  const hasStockData = Object.values(data.perProductForm || {}).some(
    (form) =>
      form.counted_stock !== '' ||
      form.stock_added !== '' ||
      (form.reassort_saisie && form.reassort_saisie !== '')
  );

  const hasSubProductStockData = data.perSubProductForm
    ? Object.values(data.perSubProductForm).some(
        (form) =>
          form.counted_stock !== '' ||
          form.stock_added !== '' ||
          (form.reassort_saisie && form.reassort_saisie !== '')
      )
    : false;

  const hasAdjustments = (data.pendingAdjustments || []).length > 0;

  return hasStockData || hasSubProductStockData || hasAdjustments;
}

/** Recent drafts for a client+company (newest first). Optionally only active rows. */
async function fetchRecentDrafts(
  clientId: string,
  companyId: string,
  options: { activeOnly?: boolean; columns?: string; limit?: number } = {}
) {
  const {
    activeOnly = true,
    columns = '*',
    limit = DRAFT_RECOVERY_SCAN_LIMIT,
  } = options;

  let query = supabase
    .from('draft_stock_updates')
    .select(columns)
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (activeOnly) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Prefer newest active meaningful draft; if none, fall back to a soft-deleted
 * snapshot that still has stocks (previous save was soft-deleted when a new row was added).
 */
async function fetchBestMeaningfulDraft(clientId: string, companyId: string) {
  const activeRows = await fetchRecentDrafts(clientId, companyId, { activeOnly: true });
  for (const row of activeRows) {
    if (draftDataIsMeaningful(row.draft_data as DraftStockUpdateData)) {
      return row;
    }
  }

  // Active row empty / missing stocks → recover from soft-deleted history
  const historyRows = await fetchRecentDrafts(clientId, companyId, {
    activeOnly: false,
    limit: DRAFT_RECOVERY_SCAN_LIMIT,
  });
  for (const row of historyRows) {
    if (row.deleted_at == null) continue; // already checked active above
    if (draftDataIsMeaningful(row.draft_data as DraftStockUpdateData)) {
      return row;
    }
  }

  return null;
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
   * Insert a new draft row, then soft-delete all previous active drafts
   * for this client+company (only the newest stays active).
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

      if (insertError) throw insertError;
      if (!inserted?.id) {
        throw new Error('Insert draft failed: no id returned');
      }

      // Soft-delete previous active drafts; keep the new row as the only active one
      const { error: softDeleteError } = await supabase
        .from('draft_stock_updates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .neq('id', inserted.id);

      if (softDeleteError) {
        console.warn('[Draft] Could not soft-delete previous drafts:', softDeleteError);
      }

      lastSyncDataRef.current = dataString;
      console.log('[Draft] Inserted new draft and soft-deleted previous for client:', clientId);
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

  // Load best meaningful draft from server (skip empty newest snapshots)
  const loadDraftFromServer = useCallback(async (): Promise<DraftStockUpdateData | null> => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const row = await fetchBestMeaningfulDraft(clientId, companyId);
      if (!row) {
        console.log('[Draft] No meaningful server draft for client:', clientId);
        return null;
      }

      console.log('[Draft] Loaded meaningful server draft for client:', clientId, 'id:', row.id);
      return row.draft_data as DraftStockUpdateData;
    } catch (error) {
      console.error('[Draft] Error loading from server:', error);
      return null;
    }
  }, [clientId]);

  // Prefer meaningful local; else newest meaningful server snapshot
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

    if (localInfo && draftDataIsMeaningful(localData)) {
      return localInfo;
    }

    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        return localInfo;
      }

      const row = await fetchBestMeaningfulDraft(clientId, companyId);
      if (row) {
        return {
          clientId: row.client_id,
          createdAt: row.created_at,
          source: 'server'
        };
      }
    } catch (error) {
      console.error('[Draft] Error checking server draft info:', error);
    }

    return localInfo;
  }, [clientId, getLocalStorageKey]);

  // Soft-delete ALL active drafts for this client (discard / after invoice)
  const deleteDraft = useCallback(async () => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      console.log('[Draft] Starting deletion for client:', clientId);

      const key = getLocalStorageKey();
      localStorage.removeItem(key);
      console.log('[Draft] Deleted local draft for client:', clientId);

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

      console.log('[Draft] Deleted server drafts for client:', clientId, 'Rows deleted:', data?.length || 0);

      lastSyncDataRef.current = '';

      const remaining = await fetchRecentDrafts(clientId, companyId, {
        activeOnly: true,
        columns: 'id',
        limit: 1,
      });

      if (remaining.length > 0) {
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
        }
        console.log('[Draft] Successfully deleted drafts on retry');
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

  const isDraftEmpty = useCallback((data: DraftStockUpdateData): boolean => {
    const hasProductData = Object.values(data.perProductForm || {}).some(
      (form) =>
        form.counted_stock !== '' ||
        form.stock_added !== '' ||
        form.product_info !== '' ||
        (form.reassort_saisie && form.reassort_saisie !== '')
    );

    const hasSubProductData = data.perSubProductForm
      ? Object.values(data.perSubProductForm).some(
          (form) =>
            form.counted_stock !== '' ||
            form.stock_added !== '' ||
            (form.reassort_saisie && form.reassort_saisie !== '')
        )
      : false;

    const hasAdjustments = (data.pendingAdjustments || []).length > 0;

    return !hasProductData && !hasSubProductData && !hasAdjustments;
  }, []);

  const hasMeaningfulDraft = useCallback((data: DraftStockUpdateData): boolean => {
    return draftDataIsMeaningful(data);
  }, []);

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
    saveDraftToServer(data).catch((err) =>
      console.error('[Draft] Error in immediate server save:', err)
    );
  }, [saveDraftLocally, isDraftEmpty, isActiveTab, saveDraftToServer]);

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
            saveDraftToServer(data).catch((err) =>
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
