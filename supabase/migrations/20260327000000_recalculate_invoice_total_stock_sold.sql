/*
  # Recalculer invoices.total_stock_sold depuis les lignes produits

  Problème:
  - Pour les produits avec sous-produits, `total_stock_sold` était calculé via
    max(0, Σ previous − Σ counted), alors que les lignes `stock_updates` parents
    (et le PDF) utilisent Σ max(0, previous_i − counted_i).
  - Écart possible dès qu'un sous-produit a counted > previous.

  Correction données:
  - Aligner `invoices.total_stock_sold` sur la somme des `stock_updates.stock_sold`
    des lignes produits parents (product_id NOT NULL, sub_product_id IS NULL).
  - Ne touche pas aux factures directes (stock_direct_sold uniquement).

  Aussi:
  - Rétablit `prevent_invoice_modification` sur `total_stock_sold`
    (régression `total_cards_sold` après le rename)
  - Recrée le trigger s'il est absent
*/

-- 1) Assouplir temporairement la fonction d'immuabilité (si un trigger l'appelle)
CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Recalculer total_stock_sold depuis les lignes produits parents
UPDATE invoices AS i
SET total_stock_sold = s.sum_sold
FROM (
  SELECT
    invoice_id,
    COALESCE(SUM(stock_sold), 0)::integer AS sum_sold
  FROM stock_updates
  WHERE invoice_id IS NOT NULL
    AND product_id IS NOT NULL
    AND sub_product_id IS NULL
  GROUP BY invoice_id
) AS s
WHERE i.id = s.invoice_id
  AND i.total_stock_sold IS DISTINCT FROM s.sum_sold;

-- 3) Rétablir l'immuabilité avec le bon nom de colonne + (re)créer le trigger
CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    OLD.id != NEW.id OR
    OLD.client_id != NEW.client_id OR
    OLD.total_stock_sold != NEW.total_stock_sold OR
    OLD.total_amount != NEW.total_amount OR
    OLD.created_at != NEW.created_at OR
    OLD.discount_percentage IS DISTINCT FROM NEW.discount_percentage OR
    (
      OLD.invoice_number IS DISTINCT FROM NEW.invoice_number
      AND NOT (OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed')
    ) OR
    (OLD.invoice_pdf_path IS NOT NULL AND OLD.invoice_pdf_path IS DISTINCT FROM NEW.invoice_pdf_path)
  ) THEN
    RAISE EXCEPTION 'Les factures sont immuables. Seuls les champs PDF (hors invoice_pdf_path) peuvent être mis à jour.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_invoice_modification() IS
  'Empêche la modification des champs critiques des factures. total_stock_sold et total_amount sont immuables. invoice_pdf_path est immuable une fois défini. stock_report_pdf_path et deposit_slip_pdf_path peuvent être mis à jour.';

DROP TRIGGER IF EXISTS prevent_invoice_modification_trigger ON invoices;
CREATE TRIGGER prevent_invoice_modification_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invoice_modification();
