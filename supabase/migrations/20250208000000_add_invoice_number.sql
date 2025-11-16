/*
  # Ajout du numéro de facture séquentiel

  1. Ajout de la colonne invoice_number à la table invoices
  2. Création d'une fonction pour générer le numéro de facture séquentiel
  3. Format: F20250001, F20250002, etc. (F + année + 4 chiffres incrémentaux)
  4. Garantit l'unicité et l'absence de trous dans la numérotation
*/

-- Ajouter la colonne invoice_number
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_year_created_at ON invoices(EXTRACT(YEAR FROM created_at), created_at);

-- Fonction pour générer le prochain numéro de facture pour une année donnée
CREATE OR REPLACE FUNCTION get_next_invoice_number(invoice_year integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  invoice_num text;
BEGIN
  -- Trouver le dernier numéro de facture pour cette année
  -- On extrait les 4 derniers chiffres après 'F' + année (ex: F20250001 -> 0001)
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH('F' || invoice_year::text) + 1) AS integer)), 0)
  INTO next_number
  FROM invoices
  WHERE invoice_number IS NOT NULL
    AND invoice_number LIKE 'F' || invoice_year::text || '%'
    AND LENGTH(invoice_number) = 9; -- Format: F20250001 (9 caractères)
  
  -- Incrémenter
  next_number := next_number + 1;
  
  -- Générer le numéro de facture: F + année + 4 chiffres (padded)
  invoice_num := 'F' || invoice_year::text || LPAD(next_number::text, 4, '0');
  
  -- Vérifier l'unicité (sécurité supplémentaire)
  WHILE EXISTS (SELECT 1 FROM invoices WHERE invoice_number = invoice_num) LOOP
    next_number := next_number + 1;
    invoice_num := 'F' || invoice_year::text || LPAD(next_number::text, 4, '0');
  END LOOP;
  
  RETURN invoice_num;
END;
$$;

-- Trigger pour générer automatiquement le numéro de facture lors de l'insertion
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

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON invoices;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Migrer les factures existantes si nécessaire
-- Pour les factures existantes, on génère un numéro basé sur leur date de création
DO $$
DECLARE
  inv_record RECORD;
  year_val integer;
  max_num integer;
  new_num text;
BEGIN
  -- Pour chaque année où il y a des factures
  FOR year_val IN 
    SELECT DISTINCT EXTRACT(YEAR FROM created_at)::integer 
    FROM invoices 
    WHERE invoice_number IS NULL
    ORDER BY 1
  LOOP
    -- Pour chaque facture de cette année, dans l'ordre chronologique
    FOR inv_record IN
      SELECT id, created_at
      FROM invoices
      WHERE invoice_number IS NULL
        AND EXTRACT(YEAR FROM created_at)::integer = year_val
      ORDER BY created_at ASC
    LOOP
      -- Trouver le dernier numéro pour cette année (y compris les factures déjà migrées)
      SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH('F' || year_val::text) + 1) AS integer)), 0)
      INTO max_num
      FROM invoices
      WHERE invoice_number IS NOT NULL
        AND invoice_number LIKE 'F' || year_val::text || '%'
        AND LENGTH(invoice_number) = 9;
      
      max_num := max_num + 1;
      new_num := 'F' || year_val::text || LPAD(max_num::text, 4, '0');
      
      -- Mettre à jour la facture
      UPDATE invoices
      SET invoice_number = new_num
      WHERE id = inv_record.id;
    END LOOP;
  END LOOP;
END;
$$;

-- Commentaire
COMMENT ON COLUMN invoices.invoice_number IS 'Numéro de facture unique au format FYYYYNNNN (ex: F20250001)';
COMMENT ON FUNCTION get_next_invoice_number IS 'Génère le prochain numéro de facture séquentiel pour une année donnée';

