-- Script SQL à exécuter manuellement dans Supabase pour corriger les numéros de facture
-- Ce script peut être exécuté directement dans l'éditeur SQL de Supabase

-- 1. Créer la colonne invoice_number si elle n'existe pas
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- 2. Créer l'index unique (on le supprime d'abord s'il existe pour éviter les erreurs)
DROP INDEX IF EXISTS idx_invoices_invoice_number;
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- 3. Ajouter la contrainte UNIQUE si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'invoices_invoice_number_key'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
  END IF;
END $$;

-- 4. Recréer la fonction get_next_invoice_number
CREATE OR REPLACE FUNCTION get_next_invoice_number(invoice_year integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  invoice_num text;
  year_prefix text;
BEGIN
  year_prefix := 'F' || invoice_year::text;
  
  -- Trouver le dernier numéro de facture pour cette année
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(year_prefix) + 1) AS integer)), 0)
  INTO next_number
  FROM invoices
  WHERE invoice_number IS NOT NULL
    AND invoice_number LIKE year_prefix || '%'
    AND LENGTH(invoice_number) = 9;
  
  -- Incrémenter
  next_number := next_number + 1;
  
  -- Générer le numéro de facture: F + année + 4 chiffres (padded)
  invoice_num := year_prefix || LPAD(next_number::text, 4, '0');
  
  -- Vérifier l'unicité (sécurité supplémentaire)
  WHILE EXISTS (SELECT 1 FROM invoices WHERE invoice_number = invoice_num) LOOP
    next_number := next_number + 1;
    invoice_num := year_prefix || LPAD(next_number::text, 4, '0');
  END LOOP;
  
  RETURN invoice_num;
END;
$$;

-- 5. Recréer la fonction du trigger
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  invoice_year integer;
BEGIN
  -- Si invoice_number n'est pas déjà défini, le générer
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    -- Utiliser la date de création si disponible, sinon utiliser la date actuelle
    IF NEW.created_at IS NOT NULL THEN
      invoice_year := EXTRACT(YEAR FROM NEW.created_at)::integer;
    ELSE
      invoice_year := EXTRACT(YEAR FROM NOW())::integer;
    END IF;
    
    NEW.invoice_number := get_next_invoice_number(invoice_year);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Recréer le trigger
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON invoices;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- 7. Mettre à jour les factures existantes qui n'ont pas de numéro
DO $$
DECLARE
  inv_record RECORD;
  year_val integer;
  max_num integer;
  new_num text;
  year_prefix text;
BEGIN
  -- Pour chaque année où il y a des factures
  FOR year_val IN 
    SELECT DISTINCT EXTRACT(YEAR FROM created_at)::integer 
    FROM invoices 
    ORDER BY 1
  LOOP
    year_prefix := 'F' || year_val::text;
    
    -- Pour chaque facture de cette année sans numéro, dans l'ordre chronologique
    FOR inv_record IN
      SELECT id, created_at
      FROM invoices
      WHERE (invoice_number IS NULL OR invoice_number = '' OR invoice_number = 'N/A')
        AND EXTRACT(YEAR FROM created_at)::integer = year_val
      ORDER BY created_at ASC
    LOOP
      -- Trouver le dernier numéro pour cette année (y compris les factures déjà migrées)
      SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(year_prefix) + 1) AS integer)), 0)
      INTO max_num
      FROM invoices
      WHERE invoice_number IS NOT NULL
        AND invoice_number LIKE year_prefix || '%'
        AND LENGTH(invoice_number) = 9;
      
      max_num := max_num + 1;
      new_num := year_prefix || LPAD(max_num::text, 4, '0');
      
      -- Mettre à jour la facture
      UPDATE invoices
      SET invoice_number = new_num
      WHERE id = inv_record.id;
    END LOOP;
  END LOOP;
END;
$$;

-- 8. Vérifier le résultat
SELECT id, invoice_number, created_at 
FROM invoices 
ORDER BY created_at DESC 
LIMIT 10;

