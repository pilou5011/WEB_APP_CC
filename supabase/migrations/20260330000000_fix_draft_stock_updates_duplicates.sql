-- Fix: multiple active draft_stock_updates per client broke recovery.
-- .maybeSingle() fails (or returns null) when >1 row matches, so the UI
-- showed an empty form while rows still existed with deleted_at IS NULL.
-- Concurrent autosaves then kept inserting more rows (amplification).

-- 1) Soft-delete duplicates: keep the most recently updated row per (client_id, company_id)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, company_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    ) AS rn
  FROM draft_stock_updates
  WHERE deleted_at IS NULL
)
UPDATE draft_stock_updates d
SET deleted_at = now()
FROM ranked r
WHERE d.id = r.id
  AND r.rn > 1;

-- 2) Enforce at most one active draft per client+company
CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_stock_updates_one_active_per_client
  ON draft_stock_updates (client_id, company_id)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_draft_stock_updates_one_active_per_client IS
  'Un seul brouillon Facturer (dépôt) actif par client et société';
