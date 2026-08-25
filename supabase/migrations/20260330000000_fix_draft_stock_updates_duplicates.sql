-- Draft stock updates: each save inserts a new row, then soft-deletes previous
-- active rows for the same (client_id, company_id). Soft-deleted history is kept
-- so recovery can fall back if the newest active draft has empty stock.
-- Soft-delete all remaining actives when the user discards or completes Facturer (dépôt).

-- If a previous version of this migration (unique draft + upsert RPC) was applied, undo it.
DROP INDEX IF EXISTS idx_draft_stock_updates_one_active_per_client;
DROP FUNCTION IF EXISTS public.upsert_draft_stock_update(uuid, uuid, jsonb);
