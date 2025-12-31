/*
  # Autoriser la mise à jour de stock_report_pdf_path et deposit_slip_pdf_path
  
  Cette migration modifie le trigger prevent_invoice_modification pour permettre
  la mise à jour de stock_report_pdf_path et deposit_slip_pdf_path même si elles sont déjà définies.
  
  Seule invoice_pdf_path reste immuable une fois définie (immuabilité contractuelle).
*/

-- Modifier le trigger pour permettre la mise à jour de stock_report_pdf_path et deposit_slip_pdf_path
CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Permettre uniquement la mise à jour des champs PDF s'ils sont NULL dans OLD
  -- Tous les autres champs doivent rester identiques
  IF (
    -- Vérifier que les champs critiques n'ont pas changé
    OLD.id != NEW.id OR
    OLD.client_id != NEW.client_id OR
    OLD.total_cards_sold != NEW.total_cards_sold OR
    OLD.total_amount != NEW.total_amount OR
    OLD.invoice_number != NEW.invoice_number OR
    OLD.created_at != NEW.created_at OR
    -- EMPÊCHER la modification de invoice_pdf_path si elle est déjà définie (immuabilité contractuelle)
    (OLD.invoice_pdf_path IS NOT NULL AND OLD.invoice_pdf_path != NEW.invoice_pdf_path)
    -- NOTE: stock_report_pdf_path et deposit_slip_pdf_path peuvent être modifiés même si déjà définis
    -- (suppression des restrictions pour ces deux colonnes)
  ) THEN
    RAISE EXCEPTION 'Les factures sont immuables. Seuls les champs PDF peuvent être mis à jour lors de leur première génération.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_invoice_modification() IS 
  'Empêche la modification des champs critiques des factures. Seule invoice_pdf_path est immuable une fois définie. stock_report_pdf_path et deposit_slip_pdf_path peuvent être modifiés à tout moment.';

