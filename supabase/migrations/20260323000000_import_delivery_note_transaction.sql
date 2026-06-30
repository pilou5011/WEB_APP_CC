/*
  Import atomique d'un bon de livraison dans les stocks (Ancien dépôt).
  Toute l'opération est transactionnelle : en cas d'erreur, aucune modification partielle.
*/

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
  WHERE id = p_delivery_note_id;
END;
$$;

GRANT EXECUTE ON FUNCTION import_delivery_note_to_stock(uuid) TO authenticated;

COMMENT ON FUNCTION import_delivery_note_to_stock(uuid) IS
  'Importe un bon de livraison brouillon : met à jour Ancien dépôt, crée client_products si besoin, marque le BL importé. Transaction atomique.';
