/*
  # Correction du numéro de facture pour le modèle multi-company
  
  Cette migration corrige :
  1. La fonction get_next_invoice_number pour qu'elle filtre par company_id
  2. La contrainte UNIQUE sur invoice_number pour qu'elle soit scoped par company_id
  
  Cela permet à différentes entreprises d'avoir leurs propres séquences de numéros de facture
  et d'avoir des numéros identiques sans conflit.
*/

-- ============================================
-- 1. Corriger la fonction get_next_invoice_number
-- ============================================

CREATE OR REPLACE FUNCTION get_next_invoice_number(invoice_year integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  invoice_num text;
  year_prefix text;
  user_company uuid;
BEGIN
  -- Récupérer le company_id de l'utilisateur connecté
  user_company := public.user_company_id();
  IF user_company IS NULL THEN
    RAISE EXCEPTION 'Non autorisé : company_id manquant';
  END IF;
  
  year_prefix := 'F' || invoice_year::text;
  
  -- Filtrer par company_id pour trouver le dernier numéro
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(year_prefix) + 1) AS integer)), 0)
  INTO next_number
  FROM invoices
  WHERE invoice_number IS NOT NULL
    AND invoice_number LIKE year_prefix || '%'
    AND LENGTH(invoice_number) = 9
    AND company_id = user_company;
  
  -- Incrémenter
  next_number := next_number + 1;
  
  -- Générer le numéro de facture: F + année + 4 chiffres (padded)
  invoice_num := year_prefix || LPAD(next_number::text, 4, '0');
  
  -- Vérifier l'unicité (sécurité supplémentaire) - filtrer aussi par company_id
  WHILE EXISTS (
    SELECT 1 FROM invoices 
    WHERE invoice_number = invoice_num 
    AND company_id = user_company
  ) LOOP
    next_number := next_number + 1;
    invoice_num := year_prefix || LPAD(next_number::text, 4, '0');
  END LOOP;
  
  RETURN invoice_num;
END;
$$;

COMMENT ON FUNCTION get_next_invoice_number IS 
  'Génère le prochain numéro de facture séquentiel pour une année donnée, filtré par company_id. Permet à différentes entreprises d''avoir leurs propres séquences de numéros de facture.';

-- ============================================
-- 2. Corriger la contrainte UNIQUE sur invoice_number
-- ============================================

-- Supprimer l'ancienne contrainte UNIQUE globale
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- Supprimer l'ancien index unique s'il existe
DROP INDEX IF EXISTS idx_invoices_invoice_number;

-- Créer une nouvelle contrainte UNIQUE partielle scoped par company_id
-- Note: invoice_number peut être NULL, donc on exclut les NULL de la contrainte unique
-- Note: Les factures sont immuables et n'ont pas de colonne deleted_at
CREATE UNIQUE INDEX invoices_company_id_invoice_number_unique
  ON invoices(company_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

COMMENT ON INDEX invoices_company_id_invoice_number_unique IS 
  'Contrainte UNIQUE partielle sur (company_id, invoice_number) pour les enregistrements avec invoice_number non NULL. Permet à différentes entreprises d''avoir des factures avec le même numéro de facture.';

-- Créer un index simple pour les recherches rapides (non unique)
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

