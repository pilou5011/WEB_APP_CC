import { useEffect, useRef, useCallback } from 'react';
import { supabase, DraftStockUpdateData } from '@/lib/supabase';

const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const LOCAL_STORAGE_PREFIX = 'stock_update_draft_';

export interface DraftInfo {
  clientId: string;
  createdAt: string;
  source: 'local' | 'server';
}

export function useStockUpdateDraft(clientId: string) {
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

  // Save to server (upsert)
  const saveDraftToServer = useCallback(async (data: DraftStockUpdateData) => {
    try {
      const dataString = JSON.stringify(data);
      
      // Skip if data hasn't changed
      if (dataString === lastSyncDataRef.current) {
        console.log('[Draft] No changes detected, skipping server sync');
        return;
      }

      // Check if a draft already exists for this client
      const { data: existing, error: fetchError } = await supabase
        .from('draft_stock_updates')
        .select('id')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('draft_stock_updates')
          .update({
            draft_data: data,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        console.log('[Draft] Updated server draft for client:', clientId);
      } else {
        // Insert new draft
        const { error: insertError } = await supabase
          .from('draft_stock_updates')
          .insert([{
            client_id: clientId,
            draft_data: data
          }]);

        if (insertError) throw insertError;
        console.log('[Draft] Created server draft for client:', clientId);
      }

      lastSyncDataRef.current = dataString;
    } catch (error) {
      console.error('[Draft] Error saving to server:', error);
    }
  }, [clientId]);

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

  // Load draft from server
  const loadDraftFromServer = useCallback(async (): Promise<DraftStockUpdateData | null> => {
    try {
      const { data, error } = await supabase
        .from('draft_stock_updates')
        .select('*')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      console.log('[Draft] Loaded server draft for client:', clientId);
      return data.draft_data as DraftStockUpdateData;
    } catch (error) {
      console.error('[Draft] Error loading from server:', error);
      return null;
    }
  }, [clientId]);

  // Get draft info (for showing prompt to user)
  const getDraftInfo = useCallback(async (): Promise<DraftInfo | null> => {
    // Check local first
    try {
      const key = getLocalStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          clientId: parsed.clientId,
          createdAt: parsed.createdAt,
          source: 'local'
        };
      }
    } catch (error) {
      console.error('[Draft] Error checking local draft info:', error);
    }

    // Check server
    try {
      const { data, error } = await supabase
        .from('draft_stock_updates')
        .select('client_id, created_at')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        return {
          clientId: data.client_id,
          createdAt: data.created_at,
          source: 'server'
        };
      }
    } catch (error) {
      console.error('[Draft] Error checking server draft info:', error);
    }

    return null;
  }, [clientId, getLocalStorageKey]);

  // Delete drafts (both local and server)
  const deleteDraft = useCallback(async () => {
    try {
      console.log('[Draft] Starting deletion for client:', clientId);
      
      // Delete from localStorage FIRST
      const key = getLocalStorageKey();
      localStorage.removeItem(key);
      console.log('[Draft] Deleted local draft for client:', clientId);

      // Delete from server (soft delete) - use .select() to get confirmation
      const { error, data } = await supabase
        .from('draft_stock_updates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .is('deleted_at', null) // Only update non-deleted drafts
        .select();

      if (error) {
        console.error('[Draft] Server deletion error:', error);
        throw error;
      }
      
      console.log('[Draft] Deleted server draft for client:', clientId, 'Rows deleted:', data?.length || 0);

      // Clear last sync data
      lastSyncDataRef.current = '';
      
      // Verify deletion by checking directly (not using getDraftInfo to avoid circular dependency)
      const { data: verifyData } = await supabase
        .from('draft_stock_updates')
        .select('id')
        .eq('client_id', clientId)
        .is('deleted_at', null) // Only check non-deleted drafts
        .maybeSingle();
      
      if (verifyData) {
        console.warn('[Draft] WARNING: Draft still exists after deletion attempt! Retrying...');
        // Try one more time to delete from server (soft delete)
        const { error: retryError } = await supabase
          .from('draft_stock_updates')
          .update({ deleted_at: new Date().toISOString() })
          .eq('client_id', clientId)
          .is('deleted_at', null); // Only update non-deleted drafts
        
        if (retryError) {
          console.error('[Draft] Retry deletion also failed:', retryError);
          throw retryError;
        } else {
          console.log('[Draft] Successfully deleted draft on retry');
        }
      } else {
        console.log('[Draft] Deletion verified: no draft remains in database');
      }
      
      // Double-check localStorage is cleared
      if (localStorage.getItem(key)) {
        console.warn('[Draft] WARNING: LocalStorage still contains draft data, removing...');
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('[Draft] Error deleting draft:', error);
      // Re-throw error so caller knows deletion failed
      throw error;
    }
  }, [clientId, getLocalStorageKey]);

  // Check if data is empty (no need to save)
  const isDraftEmpty = useCallback((data: DraftStockUpdateData): boolean => {
    // Check if any collection form has data
    const hasCollectionData = Object.values(data.perCollectionForm).some(
      form => form.counted_stock !== '' || form.cards_added !== '' || form.collection_info !== ''
    );

    // Check if any sub-product form has data
    const hasSubProductData = data.perSubProductForm ? Object.values(data.perSubProductForm).some(
      form => form.counted_stock !== '' || form.cards_added !== ''
    ) : false;

    // Check if any adjustments exist
    const hasAdjustments = data.pendingAdjustments.length > 0;

    return !hasCollectionData && !hasSubProductData && !hasAdjustments;
  }, []);

  // Check if draft has meaningful data that warrants showing recovery dialog
  // Only check counted_stock and cards_added (stock update fields), ignore collection_info
  const hasMeaningfulDraft = useCallback((data: DraftStockUpdateData): boolean => {
    // Check if any collection form has stock data (not just collection_info)
    const hasStockData = Object.values(data.perCollectionForm).some(
      form => form.counted_stock !== '' || form.cards_added !== ''
    );

    // Check if any sub-product form has stock data
    const hasSubProductStockData = data.perSubProductForm ? Object.values(data.perSubProductForm).some(
      form => form.counted_stock !== '' || form.cards_added !== ''
    ) : false;

    // Adjustments also count as meaningful data
    const hasAdjustments = data.pendingAdjustments.length > 0;

    return hasStockData || hasSubProductStockData || hasAdjustments;
  }, []);

  // Auto-save function (saves to local immediately, syncs to server periodically)
  const autoSave = useCallback((data: DraftStockUpdateData) => {
    // Don't save if data is empty
    if (isDraftEmpty(data)) {
      console.log('[Draft] AutoSave: Data is empty, not saving');
      return;
    }

    console.log('[Draft] AutoSave: Saving draft data', data);
    // Save to localStorage immediately
    saveDraftLocally(data);
  }, [saveDraftLocally, isDraftEmpty]);

  // Setup periodic sync to server
  useEffect(() => {
    // Function to perform sync
    const syncToServer = async () => {
      try {
        const key = getLocalStorageKey();
        const stored = localStorage.getItem(key);
        if (!stored) return;

        const parsed = JSON.parse(stored);
        const data = parsed.data as DraftStockUpdateData;

        // Don't sync if data is empty
        if (isDraftEmpty(data)) {
          return;
        }

        await saveDraftToServer(data);
      } catch (error) {
        console.error('[Draft] Error during periodic sync:', error);
      }
    };

    // Initial sync after a short delay
    const initialSyncTimer = setTimeout(syncToServer, 5000); // 5 seconds after mount

    // Setup periodic sync
    syncTimerRef.current = setInterval(syncToServer, SYNC_INTERVAL);

    return () => {
      clearTimeout(initialSyncTimer);
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [clientId, getLocalStorageKey, saveDraftToServer, isDraftEmpty]);

  // Cleanup on unmount - perform final sync
  useEffect(() => {
    return () => {
      const key = getLocalStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const data = parsed.data as DraftStockUpdateData;
          if (!isDraftEmpty(data)) {
            // Perform final sync (fire and forget)
            saveDraftToServer(data).catch(err => 
              console.error('[Draft] Error in final sync on unmount:', err)
            );
          }
        } catch (error) {
          console.error('[Draft] Error during unmount sync:', error);
        }
      }
    };
  }, [getLocalStorageKey, saveDraftToServer, isDraftEmpty]);

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


