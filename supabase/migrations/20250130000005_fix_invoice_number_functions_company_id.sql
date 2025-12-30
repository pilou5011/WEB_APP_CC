/*
  # Correction des fonctions de génération de numéros pour filtrer par company_id

  Cette migration corrige les fonctions get_next_invoice_number et get_next_credit_note_number
  pour qu'elles filtrent par company_id, garantissant que chaque entreprise a sa propre
  séquence de numéros de facture et d'avoir.
*/

-- Corriger get_next_invoice_number pour filtrer par company_id
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
  
  -- Filtrer par company_id
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(year_prefix) + 1) AS integer)), 0)
  INTO next_number
  FROM invoices
  WHERE invoice_number IS NOT NULL
    AND invoice_number LIKE year_prefix || '%'
    AND LENGTH(invoice_number) = 9
    AND company_id = user_company;
  
  next_number := next_number + 1;
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

-- Corriger get_next_credit_note_number pour filtrer par company_id
CREATE OR REPLACE FUNCTION get_next_credit_note_number(credit_note_year integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  credit_note_num text;
  year_prefix text;
  user_company uuid;
BEGIN
  -- Récupérer le company_id de l'utilisateur connecté
  user_company := public.user_company_id();
  IF user_company IS NULL THEN
    RAISE EXCEPTION 'Non autorisé : company_id manquant';
  END IF;
  
  year_prefix := 'A' || credit_note_year::text;
  
  -- Filtrer par company_id
  SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM LENGTH(year_prefix) + 1) AS integer)), 0)
  INTO next_number
  FROM credit_notes
  WHERE credit_note_number IS NOT NULL
    AND credit_note_number LIKE year_prefix || '%'
    AND LENGTH(credit_note_number) = 9
    AND company_id = user_company;
  
  next_number := next_number + 1;
  credit_note_num := year_prefix || LPAD(next_number::text, 4, '0');
  
  -- Vérifier l'unicité (sécurité supplémentaire) - filtrer aussi par company_id
  WHILE EXISTS (
    SELECT 1 FROM credit_notes 
    WHERE credit_note_number = credit_note_num 
    AND company_id = user_company
  ) LOOP
    next_number := next_number + 1;
    credit_note_num := year_prefix || LPAD(next_number::text, 4, '0');
  END LOOP;
  
  RETURN credit_note_num;
END;
$$;

-- Commentaires
COMMENT ON FUNCTION get_next_invoice_number IS 'Génère le prochain numéro de facture séquentiel pour une année donnée, filtré par company_id';
COMMENT ON FUNCTION get_next_credit_note_number IS 'Génère le prochain numéro d''avoir séquentiel pour une année donnée, filtré par company_id';

