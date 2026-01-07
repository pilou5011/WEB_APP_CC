/*
  # Autoriser la régénération du bon de dépôt (deposit_slip_pdf_path)

  Objectif:
  - Permettre de modifier `invoices.deposit_slip_pdf_path` même si une valeur existe déjà
  - Conserver l'immuabilité des champs critiques de la facture
  - Conserver l'immuabilité de `invoice_pdf_path` une fois défini

  Note:
  - On laisse `stock_report_pdf_path` modifiable (cohérent avec la migration 20250215000003).
*/

CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    OLD.id != NEW.id OR
    OLD.client_id != NEW.client_id OR
    OLD.total_stock_sold != NEW.total_stock_sold OR
    OLD.total_amount != NEW.total_amount OR
    OLD.invoice_number != NEW.invoice_number OR
    OLD.discount_percentage IS DISTINCT FROM NEW.discount_percentage OR
    OLD.created_at != NEW.created_at OR
    -- invoice_pdf_path reste immuable une fois défini
    (OLD.invoice_pdf_path IS NOT NULL AND OLD.invoice_pdf_path != NEW.invoice_pdf_path)
    -- NOTE: stock_report_pdf_path et deposit_slip_pdf_path peuvent être modifiés même si déjà définis
  ) THEN
    RAISE EXCEPTION 'Les factures sont immuables. Seuls les champs PDF (hors invoice_pdf_path) peuvent être mis à jour.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_invoice_modification() IS
  'Empêche la modification des champs critiques des factures. invoice_pdf_path est immuable une fois défini. stock_report_pdf_path et deposit_slip_pdf_path peuvent être mis à jour (ex: régénération).';


