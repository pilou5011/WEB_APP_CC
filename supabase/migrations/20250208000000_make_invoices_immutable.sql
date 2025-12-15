/*
  # Rendre les factures immuables
  
  Les factures ne doivent jamais être modifiées ou supprimées une fois créées.
  Cette migration :
  1. Supprime les politiques UPDATE et DELETE pour les factures
  2. Crée un trigger qui empêche les mises à jour des champs critiques
     (seuls invoice_pdf_path, stock_report_pdf_path, deposit_slip_pdf_path peuvent être mis à jour si NULL)
*/

-- Supprimer les anciennes politiques UPDATE et DELETE
DROP POLICY IF EXISTS "Allow public update access to invoices" ON invoices;
DROP POLICY IF EXISTS "Allow public delete access to invoices" ON invoices;

-- Créer une fonction trigger pour empêcher les modifications de factures
CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Permettre uniquement la mise à jour des champs PDF s'ils sont NULL
  -- Tous les autres champs doivent rester identiques
  IF (
    -- Vérifier que les champs critiques n'ont pas changé
    OLD.id != NEW.id OR
    OLD.client_id != NEW.client_id OR
    OLD.total_cards_sold != NEW.total_cards_sold OR
    OLD.total_amount != NEW.total_amount OR
    OLD.invoice_number != NEW.invoice_number OR
    OLD.created_at != NEW.created_at OR
    -- Vérifier que les champs PDF ne sont pas écrasés s'ils existent déjà
    (OLD.invoice_pdf_path IS NOT NULL AND OLD.invoice_pdf_path != NEW.invoice_pdf_path) OR
    (OLD.stock_report_pdf_path IS NOT NULL AND OLD.stock_report_pdf_path != NEW.stock_report_pdf_path) OR
    (OLD.deposit_slip_pdf_path IS NOT NULL AND OLD.deposit_slip_pdf_path != NEW.deposit_slip_pdf_path)
  ) THEN
    RAISE EXCEPTION 'Les factures sont immuables. Seuls les champs PDF peuvent être mis à jour lors de leur première génération.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS prevent_invoice_modification_trigger ON invoices;
CREATE TRIGGER prevent_invoice_modification_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invoice_modification();

-- Créer une fonction trigger pour empêcher les suppressions
CREATE OR REPLACE FUNCTION prevent_invoice_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Les factures ne peuvent jamais être supprimées.';
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger de suppression
DROP TRIGGER IF EXISTS prevent_invoice_deletion_trigger ON invoices;
CREATE TRIGGER prevent_invoice_deletion_trigger
  BEFORE DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invoice_deletion();

-- Aucune politique DELETE : les factures ne peuvent jamais être supprimées
-- (La suppression via CASCADE lors de la suppression d'un client reste possible au niveau SQL,
--  mais le trigger empêchera toute suppression directe)

COMMENT ON TABLE invoices IS 'Table des factures - Les factures sont immuables une fois créées. Seuls les champs PDF peuvent être mis à jour lors de leur première génération.';

