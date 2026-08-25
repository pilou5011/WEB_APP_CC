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

-- 3) Atomic upsert: always UPDATE the latest active draft; INSERT only if none.
--    On concurrent insert race, catch unique_violation and UPDATE instead.
CREATE OR REPLACE FUNCTION public.upsert_draft_stock_update(
  p_client_id uuid,
  p_company_id uuid,
  p_draft_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_user_company uuid;
BEGIN
  v_user_company := public.user_company_id();
  IF v_user_company IS NULL OR v_user_company IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Lock the latest active draft for this client+company (if any)
  SELECT id
  INTO v_id
  FROM draft_stock_updates
  WHERE client_id = p_client_id
    AND company_id = p_company_id
    AND deleted_at IS NULL
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_id IS NOT NULL THEN
    -- Soft-delete any other active rows (safety net before unique index / races)
    UPDATE draft_stock_updates
    SET deleted_at = now()
    WHERE client_id = p_client_id
      AND company_id = p_company_id
      AND deleted_at IS NULL
      AND id <> v_id;

    UPDATE draft_stock_updates
    SET
      draft_data = p_draft_data,
      updated_at = now()
    WHERE id = v_id;

    RETURN v_id;
  END IF;

  BEGIN
    INSERT INTO draft_stock_updates (client_id, company_id, draft_data)
    VALUES (p_client_id, p_company_id, p_draft_data)
    RETURNING id INTO v_id;

    RETURN v_id;
  EXCEPTION
    WHEN unique_violation THEN
      -- Another request inserted first — update that row instead
      SELECT id
      INTO v_id
      FROM draft_stock_updates
      WHERE client_id = p_client_id
        AND company_id = p_company_id
        AND deleted_at IS NULL
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 1
      FOR UPDATE;

      IF v_id IS NULL THEN
        RAISE;
      END IF;

      UPDATE draft_stock_updates
      SET
        draft_data = p_draft_data,
        updated_at = now()
      WHERE id = v_id;

      -- Clean any stragglers
      UPDATE draft_stock_updates
      SET deleted_at = now()
      WHERE client_id = p_client_id
        AND company_id = p_company_id
        AND deleted_at IS NULL
        AND id <> v_id;

      RETURN v_id;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_draft_stock_update(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_draft_stock_update(uuid, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.upsert_draft_stock_update(uuid, uuid, jsonb) IS
  'Met à jour le brouillon actif (client+company) ou en crée un seul ; jamais deux actifs.';
