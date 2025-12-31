/*
  # Corriger la politique RLS pour permettre la mise à jour de stock_report_pdf_path et deposit_slip_pdf_path
  
  La politique RLS actuelle bloque TOUTE mise à jour si invoice_pdf_path IS NOT NULL.
  Cela empêche la mise à jour de stock_report_pdf_path et deposit_slip_pdf_path même si invoice_pdf_path est déjà défini.
  
  Cette migration corrige la politique pour permettre :
  1. La mise à jour si invoice_pdf_path IS NULL (première génération)
  2. La mise à jour de stock_report_pdf_path et deposit_slip_pdf_path même si invoice_pdf_path IS NOT NULL
  3. Empêcher la modification de invoice_pdf_path si elle est déjà définie (via le trigger)
*/

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Users can update invoices in their company" ON invoices;

-- Créer une nouvelle politique qui permet toutes les mises à jour pour les factures de l'entreprise
-- La logique métier (immuabilité de invoice_pdf_path) est gérée par le trigger prevent_invoice_modification_trigger
-- Cette politique permet notamment la mise à jour de stock_report_pdf_path et deposit_slip_pdf_path
-- même si invoice_pdf_path est déjà défini
CREATE POLICY "Users can update invoices in their company"
  ON invoices FOR UPDATE
  USING (
    company_id = public.user_company_id()
    -- Permettre toutes les mises à jour au niveau RLS
    -- Le trigger prevent_invoice_modification_trigger gère la logique métier :
    -- - Empêche la modification de invoice_pdf_path si elle est déjà définie
    -- - Permet la mise à jour de stock_report_pdf_path et deposit_slip_pdf_path
  )
  WITH CHECK (
    company_id = public.user_company_id()
    -- Le trigger prevent_invoice_modification_trigger empêchera toute modification de invoice_pdf_path
    -- si elle est déjà définie, garantissant l'immuabilité contractuelle
  );

COMMENT ON POLICY "Users can update invoices in their company" ON invoices IS 
  'Permet aux utilisateurs de mettre à jour les factures de leur entreprise. La mise à jour de invoice_pdf_path est uniquement autorisée si elle est NULL (première génération). Les mises à jour de stock_report_pdf_path et deposit_slip_pdf_path sont toujours autorisées. Le trigger prevent_invoice_modification_trigger empêche la modification de invoice_pdf_path si elle est déjà définie.';

