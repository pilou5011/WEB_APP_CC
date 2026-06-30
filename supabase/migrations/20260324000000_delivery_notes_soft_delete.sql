/*
  # Soft delete — Bons de livraison

  Ajoute deleted_at sur toutes les tables de la fonctionnalité BL,
  contraintes UNIQUE partielles, et met à jour les fonctions SQL associées.
*/

-- ============================================
-- 1. Colonne deleted_at
-- ============================================

ALTER TABLE delivery_note_templates
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE delivery_note_template_products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE delivery_note_lines
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- ============================================
-- 2. Index partiels (lignes actives)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_delivery_note_templates_deleted_at
  ON delivery_note_templates(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_note_template_products_deleted_at
  ON delivery_note_template_products(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_notes_deleted_at
  ON delivery_notes(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_note_lines_deleted_at
  ON delivery_note_lines(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- 3. Contraintes UNIQUE partielles
-- ============================================

DROP INDEX IF EXISTS delivery_notes_company_delivery_number_unique;

CREATE UNIQUE INDEX IF NOT EXISTS delivery_notes_company_delivery_number_unique
  ON delivery_notes(company_id, delivery_number)
  WHERE deleted_at IS NULL;

ALTER TABLE delivery_note_template_products
  DROP CONSTRAINT IF EXISTS delivery_note_template_products_template_id_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS delivery_note_template_products_template_product_unique
  ON delivery_note_template_products(template_id, product_id)
  WHERE deleted_at IS NULL;

ALTER TABLE delivery_note_lines
  DROP CONSTRAINT IF EXISTS delivery_note_lines_delivery_note_id_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS delivery_note_lines_note_product_unique
  ON delivery_note_lines(delivery_note_id, product_id)
  WHERE deleted_at IS NULL;

-- ============================================
-- 4. Numérotation (ignorer les BL supprimés)
-- ============================================

CREATE OR REPLACE FUNCTION get_next_delivery_note_number(p_company_id uuid, p_year integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_prefix text;
  next_seq integer;
  delivery_num text;
BEGIN
  year_prefix := 'BL-' || p_year::text || '-';

  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(delivery_number FROM LENGTH(year_prefix) + 1) AS integer
      )
    ),
    0
  ) + 1
  INTO next_seq
  FROM delivery_notes
  WHERE company_id = p_company_id
    AND deleted_at IS NULL
    AND delivery_number IS NOT NULL
    AND delivery_number LIKE year_prefix || '%'
    AND LENGTH(delivery_number) = LENGTH(year_prefix) + 6;

  delivery_num := year_prefix || LPAD(next_seq::text, 6, '0');

  WHILE EXISTS (
    SELECT 1 FROM delivery_notes
    WHERE company_id = p_company_id
      AND delivery_number = delivery_num
      AND deleted_at IS NULL
  ) LOOP
    next_seq := next_seq + 1;
    delivery_num := year_prefix || LPAD(next_seq::text, 6, '0');
  END LOOP;

  RETURN delivery_num;
END;
$$;

-- ============================================
-- 5. Trigger produit supprimé → soft delete lignes modèle
-- ============================================

CREATE OR REPLACE FUNCTION remove_deleted_product_from_delivery_templates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at) THEN
    UPDATE delivery_note_template_products
    SET deleted_at = now()
    WHERE product_id = NEW.id
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- 6. Import atomique (ignorer BL / lignes supprimés)
-- ============================================

CREATE OR REPLACE FUNCTION import_delivery_note_to_stock(p_delivery_note_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_note delivery_notes%ROWTYPE;
  v_line record;
  v_previous integer;
  v_new integer;
  v_cp_id uuid;
  v_max_order integer;
BEGIN
  SELECT company_id INTO v_company_id FROM users WHERE id = auth.uid();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT * INTO v_note
  FROM delivery_notes
  WHERE id = p_delivery_note_id
    AND company_id = v_company_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bon de livraison introuvable';
  END IF;

  IF v_note.status <> 'draft' THEN
    RAISE EXCEPTION 'Ce bon de livraison a déjà été importé';
  END IF;

  SELECT COALESCE(MAX(display_order), 0) INTO v_max_order
  FROM client_products
  WHERE client_id = v_note.client_id
    AND company_id = v_company_id
    AND deleted_at IS NULL;

  FOR v_line IN
    SELECT *
    FROM delivery_note_lines
    WHERE delivery_note_id = p_delivery_note_id
      AND company_id = v_company_id
      AND deleted_at IS NULL
    ORDER BY display_order
  LOOP
    SELECT COALESCE(su.new_stock, 0) INTO v_previous
    FROM stock_updates su
    WHERE su.client_id = v_note.client_id
      AND su.company_id = v_company_id
      AND su.product_id = v_line.product_id
      AND su.sub_product_id IS NULL
      AND (
        su.invoice_id IS NULL
        OR EXISTS (
          SELECT 1 FROM invoices i
          WHERE i.id = su.invoice_id AND i.status = 'completed'
        )
      )
    ORDER BY su.created_at DESC
    LIMIT 1;

    IF v_previous IS NULL THEN
      v_previous := 0;
    END IF;

    SELECT id INTO v_cp_id
    FROM client_products
    WHERE client_id = v_note.client_id
      AND product_id = v_line.product_id
      AND company_id = v_company_id
      AND deleted_at IS NULL;

    IF v_cp_id IS NULL THEN
      v_max_order := v_max_order + 1;
      v_previous := 0;
      v_new := v_line.quantity;

      INSERT INTO client_products (
        client_id, company_id, product_id, initial_stock, current_stock, display_order
      ) VALUES (
        v_note.client_id, v_company_id, v_line.product_id,
        v_line.quantity, v_line.quantity, v_max_order
      );
    ELSE
      v_new := v_previous + v_line.quantity;
      UPDATE client_products
      SET current_stock = v_new, updated_at = now()
      WHERE id = v_cp_id;
    END IF;

    INSERT INTO stock_updates (
      client_id, company_id, product_id, sub_product_id, invoice_id,
      previous_stock, counted_stock, stock_sold, stock_added, new_stock
    ) VALUES (
      v_note.client_id, v_company_id, v_line.product_id, NULL, NULL,
      v_previous, v_new, 0, v_line.quantity, v_new
    );
  END LOOP;

  UPDATE delivery_notes
  SET status = 'imported',
      imported_at = now(),
      updated_at = now()
  WHERE id = p_delivery_note_id
    AND deleted_at IS NULL;
END;
$$;

COMMENT ON COLUMN delivery_note_templates.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN delivery_note_template_products.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN delivery_notes.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN delivery_note_lines.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
