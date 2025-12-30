/*
  # Corriger la politique RLS pour permettre la mise à jour de invoice_pdf_path uniquement si NULL
  
  La politique doit permettre :
  1. La mise à jour de invoice_pdf_path UNIQUEMENT si OLD.invoice_pdf_path IS NULL (première génération)
  2. La mise à jour de stock_report_pdf_path et deposit_slip_pdf_path même si invoice_pdf_path n'est pas NULL
  3. Empêcher toute modification de invoice_pdf_path si elle est déjà définie (immuabilité contractuelle)
  
  Le trigger empêche déjà la modification de invoice_pdf_path si OLD.invoice_pdf_path IS NOT NULL,
  mais la politique RLS doit aussi refléter cette logique.
*/

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Users can update invoices in their company" ON invoices;

-- Créer une politique qui permet la mise à jour uniquement si invoice_pdf_path IS NULL
-- Cela garantit que invoice_pdf_path ne peut être défini qu'une seule fois (immuabilité contractuelle)
CREATE POLICY "Users can update invoices in their company"
  ON invoices FOR UPDATE
  USING (
    company_id = public.user_company_id() AND
    invoice_pdf_path IS NULL  -- Permettre la mise à jour UNIQUEMENT si invoice_pdf_path n'est pas encore défini
  )
  WITH CHECK (
    company_id = public.user_company_id()
    -- Le trigger prevent_invoice_modification_trigger empêchera toute modification de invoice_pdf_path
    -- si elle est déjà définie, garantissant l'immuabilité contractuelle
  );

-- Le trigger existant empêche déjà la modification de invoice_pdf_path si OLD.invoice_pdf_path IS NOT NULL
-- On s'assure juste qu'il est bien en place
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
    (OLD.invoice_pdf_path IS NOT NULL AND OLD.invoice_pdf_path != NEW.invoice_pdf_path) OR
    -- Permettre la mise à jour de stock_report_pdf_path et deposit_slip_pdf_path uniquement si NULL
    (OLD.stock_report_pdf_path IS NOT NULL AND OLD.stock_report_pdf_path != NEW.stock_report_pdf_path) OR
    (OLD.deposit_slip_pdf_path IS NOT NULL AND OLD.deposit_slip_pdf_path != NEW.deposit_slip_pdf_path)
  ) THEN
    RAISE EXCEPTION 'Les factures sont immuables. Seuls les champs PDF peuvent être mis à jour lors de leur première génération.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON POLICY "Users can update invoices in their company" ON invoices IS 
  'Permet aux utilisateurs de mettre à jour les factures de leur entreprise UNIQUEMENT si invoice_pdf_path IS NULL. Cela garantit que invoice_pdf_path ne peut être défini qu''une seule fois, préservant l''immuabilité contractuelle des factures. Le trigger prevent_invoice_modification_trigger empêche également la modification de invoice_pdf_path si elle est déjà définie.';

