import { useEffect, useRef, useCallback } from 'react';
import { supabase, DraftCreditNoteData } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';

const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds
const LOCAL_STORAGE_PREFIX = 'credit_note_draft_';

export interface DraftInfo {
  clientId: string;
  createdAt: string;
  source: 'local' | 'server';
}

export function useCreditNoteDraft(clientId: string) {
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncDataRef = useRef<string>('');

  const getLocalStorageKey = useCallback(() => {
    return `${LOCAL_STORAGE_PREFIX}${clientId}`;
  }, [clientId]);

  // Save to localStorage
  const saveDraftLocally = useCallback((data: DraftCreditNoteData) => {
    try {
      const key = getLocalStorageKey();
      const draftInfo = {
        data,
        clientId,
        createdAt: new Date().toISOString(),
        source: 'local' as const
      };
      localStorage.setItem(key, JSON.stringify(draftInfo));
      console.log('[Draft Credit Note] Saved locally for client:', clientId);
    } catch (error) {
      console.error('[Draft Credit Note] Error saving to localStorage:', error);
    }
  }, [clientId, getLocalStorageKey]);

  // Save to server (upsert)
  const saveDraftToServer = useCallback(async (data: DraftCreditNoteData) => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const dataString = JSON.stringify(data);
      
      // Skip if data hasn't changed
      if (dataString === lastSyncDataRef.current) {
        console.log('[Draft Credit Note] No changes detected, skipping server sync');
        return;
      }

      // Check if a draft already exists for this client
      const { data: existing, error: fetchError } = await supabase
        .from('draft_credit_notes')
        .select('id')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('draft_credit_notes')
          .update({
            draft_data: data,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .eq('company_id', companyId);

        if (updateError) throw updateError;
        console.log('[Draft Credit Note] Updated server draft for client:', clientId);
      } else {
        // Insert new draft
        const { error: insertError } = await supabase
          .from('draft_credit_notes')
          .insert([{
            client_id: clientId,
            company_id: companyId,
            draft_data: data
          }]);

        if (insertError) throw insertError;
        console.log('[Draft Credit Note] Created server draft for client:', clientId);
      }

      lastSyncDataRef.current = dataString;
    } catch (error) {
      console.error('[Draft Credit Note] Error saving to server:', error);
    }
  }, [clientId]);

  // Load draft from localStorage
  const loadDraftLocally = useCallback((): DraftCreditNoteData | null => {
    try {
      const key = getLocalStorageKey();
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      console.log('[Draft Credit Note] Loaded local draft for client:', clientId);
      return parsed.data;
    } catch (error) {
      console.error('[Draft Credit Note] Error loading from localStorage:', error);
      return null;
    }
  }, [clientId, getLocalStorageKey]);

  // Load draft from server
  const loadDraftFromServer = useCallback(async (): Promise<DraftCreditNoteData | null> => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { data, error } = await supabase
        .from('draft_credit_notes')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      console.log('[Draft Credit Note] Loaded server draft for client:', clientId);
      return data.draft_data as DraftCreditNoteData;
    } catch (error) {
      console.error('[Draft Credit Note] Error loading from server:', error);
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
      console.error('[Draft Credit Note] Error checking local draft info:', error);
    }

    // Check server
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        return null;
      }

      const { data, error } = await supabase
        .from('draft_credit_notes')
        .select('client_id, created_at')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
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
      console.error('[Draft Credit Note] Error checking server draft info:', error);
    }

    return null;
  }, [clientId, getLocalStorageKey]);

  // Delete drafts (both local and server)
  const deleteDraft = useCallback(async () => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      console.log('[Draft Credit Note] Starting deletion for client:', clientId);
      
      // Delete from localStorage FIRST
      const key = getLocalStorageKey();
      localStorage.removeItem(key);
      console.log('[Draft Credit Note] Deleted local draft for client:', clientId);

      // Delete from server (soft delete) - use .select() to get confirmation
      const { error, data } = await supabase
        .from('draft_credit_notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .is('deleted_at', null) // Only update non-deleted drafts
        .select();

      if (error) {
        console.error('[Draft Credit Note] Server deletion error:', error);
        throw error;
      }
      
      console.log('[Draft Credit Note] Deleted server draft for client:', clientId, 'Rows deleted:', data?.length || 0);

      // Clear last sync data
      lastSyncDataRef.current = '';
      
      // Verify deletion by checking directly (not using getDraftInfo to avoid circular dependency)
      const { data: verifyData } = await supabase
        .from('draft_credit_notes')
        .select('id')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .is('deleted_at', null) // Only check non-deleted drafts
        .maybeSingle();
      
      if (verifyData) {
        console.warn('[Draft Credit Note] WARNING: Draft still exists after deletion attempt! Retrying...');
        // Try one more time to delete from server (soft delete)
        const { error: retryError } = await supabase
          .from('draft_credit_notes')
          .update({ deleted_at: new Date().toISOString() })
          .eq('client_id', clientId)
          .eq('company_id', companyId)
          .is('deleted_at', null); // Only update non-deleted drafts
        
        if (retryError) {
          console.error('[Draft Credit Note] Retry deletion also failed:', retryError);
          throw retryError;
        } else {
          console.log('[Draft Credit Note] Successfully deleted draft on retry');
        }
      } else {
        console.log('[Draft Credit Note] Deletion verified: no draft remains in database');
      }
      
      // Double-check localStorage is cleared
      if (localStorage.getItem(key)) {
        console.warn('[Draft Credit Note] WARNING: LocalStorage still contains draft data, removing...');
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('[Draft Credit Note] Error deleting draft:', error);
      // Re-throw error so caller knows deletion failed
      throw error;
    }
  }, [clientId, getLocalStorageKey]);

  // Check if data is empty (no need to save)
  const isDraftEmpty = useCallback((data: DraftCreditNoteData): boolean => {
    // Check if at least one field is filled: invoice_id, operation_name, quantity, or unit_price
    const hasInvoiceId = data.invoice_id && data.invoice_id.trim() !== '';
    const hasOperationName = data.operation_name && data.operation_name.trim() !== '';
    const hasQuantity = data.quantity && data.quantity.trim() !== '';
    const hasUnitPrice = data.unit_price && data.unit_price.trim() !== '';

    const hasData = hasInvoiceId || hasOperationName || hasQuantity || hasUnitPrice;

    return !hasData;
  }, []);

  // Check if draft has meaningful data that warrants showing recovery dialog
  const hasMeaningfulDraft = useCallback((data: DraftCreditNoteData): boolean => {
    // Check if at least one field is filled: invoice_id, operation_name, quantity, or unit_price
    const hasInvoiceId = data.invoice_id && data.invoice_id.trim() !== '';
    const hasOperationName = data.operation_name && data.operation_name.trim() !== '';
    const hasQuantity = data.quantity && data.quantity.trim() !== '';
    const hasUnitPrice = data.unit_price && data.unit_price.trim() !== '';

    const hasData = hasInvoiceId || hasOperationName || hasQuantity || hasUnitPrice;

    return hasData;
  }, []);

  // Auto-save function (saves to local immediately, syncs to server periodically)
  const autoSave = useCallback((data: DraftCreditNoteData) => {
    // Don't save if data is empty
    if (isDraftEmpty(data)) {
      console.log('[Draft Credit Note] AutoSave: Data is empty, not saving');
      return;
    }

    console.log('[Draft Credit Note] AutoSave: Saving draft data', data);
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
        const data = parsed.data as DraftCreditNoteData;

        // Don't sync if data is empty
        if (isDraftEmpty(data)) {
          return;
        }

        await saveDraftToServer(data);
      } catch (error) {
        console.error('[Draft Credit Note] Error during periodic sync:', error);
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
          const data = parsed.data as DraftCreditNoteData;
          if (!isDraftEmpty(data)) {
            // Perform final sync (fire and forget)
            saveDraftToServer(data).catch(err => 
              console.error('[Draft Credit Note] Error in final sync on unmount:', err)
            );
          }
        } catch (error) {
          console.error('[Draft Credit Note] Error during unmount sync:', error);
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

