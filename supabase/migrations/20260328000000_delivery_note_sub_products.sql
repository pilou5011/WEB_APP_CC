/*
  # Bons de livraison — sous-produits

  - Table delivery_note_line_sub_products : composition figée d'un BL
  - Les modèles restent au niveau produit principal uniquement
  - Import : composition actuelle du catalogue (nouveaux sous-produits à 0,
    éléments soft-deleted ignorés)
*/

-- ============================================
-- 1. Table
-- ============================================

CREATE TABLE IF NOT EXISTS delivery_note_line_sub_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  sub_product_id uuid NOT NULL REFERENCES sub_products(id),
  quantity integer NOT NULL CHECK (quantity >= 0),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_dn_line_sub_products_note_id
  ON delivery_note_line_sub_products(delivery_note_id);

CREATE INDEX IF NOT EXISTS idx_dn_line_sub_products_company_id
  ON delivery_note_line_sub_products(company_id);

CREATE INDEX IF NOT EXISTS idx_dn_line_sub_products_deleted_at
  ON delivery_note_line_sub_products(deleted_at) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS delivery_note_line_sub_products_note_sub_unique
  ON delivery_note_line_sub_products(delivery_note_id, sub_product_id)
  WHERE deleted_at IS NULL;

-- ============================================
-- 2. RLS
-- ============================================

ALTER TABLE delivery_note_line_sub_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery_note_line_sub_products in their company"
  ON delivery_note_line_sub_products FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert delivery_note_line_sub_products in their company"
  ON delivery_note_line_sub_products FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update delivery_note_line_sub_products in their company"
  ON delivery_note_line_sub_products FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete delivery_note_line_sub_products in their company"
  ON delivery_note_line_sub_products FOR DELETE
  USING (company_id = public.user_company_id());

COMMENT ON TABLE delivery_note_line_sub_products IS
  'Quantités par sous-produit figées sur un BL. Les modèles ne stockent que le produit principal.';

-- ============================================
-- 3. Import atomique (parents + sous-produits)
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
  v_sp record;
  v_previous integer;
  v_new integer;
  v_qty integer;
  v_cp_id uuid;
  v_csp_id uuid;
  v_max_order integer;
  v_has_subs boolean;
  v_parent_previous integer;
  v_parent_added integer;
  v_parent_new integer;
  v_product_deleted timestamptz;
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
    SELECT deleted_at INTO v_product_deleted
    FROM products
    WHERE id = v_line.product_id;

    IF v_product_deleted IS NOT NULL THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM sub_products
      WHERE product_id = v_line.product_id
        AND company_id = v_company_id
        AND deleted_at IS NULL
    ) INTO v_has_subs;

    IF NOT v_has_subs THEN
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
    ELSE
      v_parent_previous := 0;
      v_parent_added := 0;
      v_parent_new := 0;

      SELECT id INTO v_cp_id
      FROM client_products
      WHERE client_id = v_note.client_id
        AND product_id = v_line.product_id
        AND company_id = v_company_id
        AND deleted_at IS NULL;

      IF v_cp_id IS NULL THEN
        v_max_order := v_max_order + 1;
        INSERT INTO client_products (
          client_id, company_id, product_id, initial_stock, current_stock, display_order
        ) VALUES (
          v_note.client_id, v_company_id, v_line.product_id, 0, 0, v_max_order
        )
        RETURNING id INTO v_cp_id;
      END IF;

      FOR v_sp IN
        SELECT sp.id, sp.display_order
        FROM sub_products sp
        WHERE sp.product_id = v_line.product_id
          AND sp.company_id = v_company_id
          AND sp.deleted_at IS NULL
        ORDER BY sp.display_order, sp.name
      LOOP
        SELECT COALESCE(dnsp.quantity, 0) INTO v_qty
        FROM delivery_note_line_sub_products dnsp
        WHERE dnsp.delivery_note_id = p_delivery_note_id
          AND dnsp.sub_product_id = v_sp.id
          AND dnsp.deleted_at IS NULL;

        IF v_qty IS NULL THEN
          v_qty := 0;
        END IF;

        SELECT COALESCE(su.new_stock, 0) INTO v_previous
        FROM stock_updates su
        WHERE su.client_id = v_note.client_id
          AND su.company_id = v_company_id
          AND su.sub_product_id = v_sp.id
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

        SELECT id INTO v_csp_id
        FROM client_sub_products
        WHERE client_id = v_note.client_id
          AND sub_product_id = v_sp.id
          AND company_id = v_company_id
          AND deleted_at IS NULL;

        IF v_csp_id IS NULL THEN
          v_previous := 0;
          v_new := v_qty;
          INSERT INTO client_sub_products (
            client_id, company_id, sub_product_id, initial_stock, current_stock
          ) VALUES (
            v_note.client_id, v_company_id, v_sp.id, v_qty, v_qty
          );
        ELSE
          v_new := v_previous + v_qty;
          UPDATE client_sub_products
          SET current_stock = v_new, updated_at = now()
          WHERE id = v_csp_id;
        END IF;

        INSERT INTO stock_updates (
          client_id, company_id, product_id, sub_product_id, invoice_id,
          previous_stock, counted_stock, stock_sold, stock_added, new_stock
        ) VALUES (
          v_note.client_id, v_company_id, NULL, v_sp.id, NULL,
          v_previous, v_new, 0, v_qty, v_new
        );

        v_parent_previous := v_parent_previous + v_previous;
        v_parent_added := v_parent_added + v_qty;
        v_parent_new := v_parent_new + v_new;
      END LOOP;

      UPDATE client_products
      SET current_stock = v_parent_new, updated_at = now()
      WHERE id = v_cp_id;

      INSERT INTO stock_updates (
        client_id, company_id, product_id, sub_product_id, invoice_id,
        previous_stock, counted_stock, stock_sold, stock_added, new_stock
      ) VALUES (
        v_note.client_id, v_company_id, v_line.product_id, NULL, NULL,
        v_parent_previous, v_parent_new, 0, v_parent_added, v_parent_new
      );
    END IF;
  END LOOP;

  UPDATE delivery_notes
  SET status = 'imported',
      imported_at = now(),
      updated_at = now()
  WHERE id = p_delivery_note_id
    AND deleted_at IS NULL;
END;
$$;
