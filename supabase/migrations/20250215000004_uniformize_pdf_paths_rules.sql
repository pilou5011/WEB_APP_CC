/*
  # Uniformiser les règles pour les 3 champs PDF
  
  Cette migration uniformise les règles pour invoice_pdf_path, stock_report_pdf_path et deposit_slip_pdf_path :
  - Si la valeur est NULL => on peut modifier la valeur
  - Si la valeur est NON NULL => on ne peut pas modifier la valeur
  
  Règles appliquées :
  1. Politique RLS : Permet toutes les mises à jour (la logique métier est gérée par le trigger)
  2. Trigger : Empêche la modification de chaque champ PDF si sa valeur OLD est NON NULL
*/

-- ============================================
-- 1. Corriger la politique RLS
-- ============================================

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Users can update invoices in their company" ON invoices;

-- Créer une nouvelle politique qui permet toutes les mises à jour au niveau RLS
-- La logique métier (immuabilité des champs PDF) est gérée par le trigger
CREATE POLICY "Users can update invoices in their company"
  ON invoices FOR UPDATE
  USING (
    company_id = public.user_company_id()
    -- Permettre toutes les mises à jour au niveau RLS
    -- Le trigger prevent_invoice_modification_trigger gère la logique métier :
    -- - Empêche la modification de chaque champ PDF si sa valeur OLD est NON NULL
  )
  WITH CHECK (
    company_id = public.user_company_id()
  );

COMMENT ON POLICY "Users can update invoices in their company" ON invoices IS 
  'Permet aux utilisateurs de mettre à jour les factures de leur entreprise. Le trigger prevent_invoice_modification_trigger empêche la modification des champs PDF si leur valeur est déjà définie (NON NULL).';

-- ============================================
-- 2. Corriger le trigger pour uniformiser les règles
-- ============================================

CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que les champs critiques n'ont pas changé
  IF (
    -- Champs immuables (jamais modifiables)
    OLD.id != NEW.id OR
    OLD.client_id != NEW.client_id OR
    OLD.total_cards_sold != NEW.total_cards_sold OR
    OLD.total_amount != NEW.total_amount OR
    OLD.invoice_number != NEW.invoice_number OR
    OLD.created_at != NEW.created_at OR
    -- RÈGLE UNIFORME pour les 3 champs PDF :
    -- Si la valeur OLD est NON NULL, on ne peut pas la modifier
    (OLD.invoice_pdf_path IS NOT NULL AND OLD.invoice_pdf_path != NEW.invoice_pdf_path) OR
    (OLD.stock_report_pdf_path IS NOT NULL AND OLD.stock_report_pdf_path != NEW.stock_report_pdf_path) OR
    (OLD.deposit_slip_pdf_path IS NOT NULL AND OLD.deposit_slip_pdf_path != NEW.deposit_slip_pdf_path)
  ) THEN
    RAISE EXCEPTION 'Les factures sont immuables. Les champs PDF peuvent être mis à jour uniquement si leur valeur actuelle est NULL.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_invoice_modification() IS 
  'Empêche la modification des champs critiques des factures. Règle uniforme pour les 3 champs PDF (invoice_pdf_path, stock_report_pdf_path, deposit_slip_pdf_path) : si la valeur est NULL, on peut la modifier ; si la valeur est NON NULL, on ne peut pas la modifier.';

