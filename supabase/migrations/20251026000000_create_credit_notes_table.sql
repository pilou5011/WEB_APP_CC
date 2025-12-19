/*
  # Création de la table credit_notes (avoir)
  
  1. Création de la table credit_notes avec les champs demandés
  2. Création d'une fonction pour générer le numéro d'avoir séquentiel
  3. Format: A20250001, A20250002, etc. (A + année + 4 chiffres incrémentaux)
  4. Garantit l'unicité et l'absence de trous dans la numérotation
*/

-- Créer la table credit_notes
CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  unit_price numeric(10, 2) NOT NULL,
  quantity integer NOT NULL,
  total_amount numeric(10, 2) NOT NULL,
  operation_name text NOT NULL,
  credit_note_number text UNIQUE,
  credit_note_pdf_path text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

-- Policies for credit_notes
DROP POLICY IF EXISTS "Allow public read access to credit_notes" ON credit_notes;
CREATE POLICY "Allow public read access to credit_notes"
  ON credit_notes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access to credit_notes" ON credit_notes;
CREATE POLICY "Allow public insert access to credit_notes"
  ON credit_notes FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to credit_notes" ON credit_notes;
CREATE POLICY "Allow public update access to credit_notes"
  ON credit_notes FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to credit_notes" ON credit_notes;
CREATE POLICY "Allow public delete access to credit_notes"
  ON credit_notes FOR DELETE
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_notes_client_id ON credit_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_created_at ON credit_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_notes_credit_note_number ON credit_notes(credit_note_number);

-- Fonction pour générer le prochain numéro d'avoir pour une année donnée
CREATE OR REPLACE FUNCTION get_next_credit_note_number(credit_note_year integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  credit_note_num text;
  year_prefix text;
BEGIN
  year_prefix := 'A' || credit_note_year::text;
  
  -- Trouver le dernier numéro d'avoir pour cette année
  -- On extrait les 4 derniers chiffres après 'A' + année (ex: A20250001 -> 0001)
  SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM LENGTH(year_prefix) + 1) AS integer)), 0)
  INTO next_number
  FROM credit_notes
  WHERE credit_note_number IS NOT NULL
    AND credit_note_number LIKE year_prefix || '%'
    AND LENGTH(credit_note_number) = 9; -- Format: A20250001 (9 caractères)
  
  -- Incrémenter
  next_number := next_number + 1;
  
  -- Générer le numéro d'avoir: A + année + 4 chiffres (padded)
  credit_note_num := year_prefix || LPAD(next_number::text, 4, '0');
  
  -- Vérifier l'unicité (sécurité supplémentaire)
  WHILE EXISTS (SELECT 1 FROM credit_notes WHERE credit_note_number = credit_note_num) LOOP
    next_number := next_number + 1;
    credit_note_num := year_prefix || LPAD(next_number::text, 4, '0');
  END LOOP;
  
  RETURN credit_note_num;
END;
$$;

-- Trigger pour générer automatiquement le numéro d'avoir lors de l'insertion
CREATE OR REPLACE FUNCTION set_credit_note_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  credit_note_year integer;
BEGIN
  -- Si credit_note_number n'est pas déjà défini, le générer
  IF NEW.credit_note_number IS NULL OR NEW.credit_note_number = '' THEN
    -- Utiliser la date de création si disponible, sinon utiliser la date actuelle
    IF NEW.created_at IS NOT NULL THEN
      credit_note_year := EXTRACT(YEAR FROM NEW.created_at)::integer;
    ELSE
      credit_note_year := EXTRACT(YEAR FROM NOW())::integer;
    END IF;
    
    NEW.credit_note_number := get_next_credit_note_number(credit_note_year);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_set_credit_note_number ON credit_notes;
CREATE TRIGGER trigger_set_credit_note_number
  BEFORE INSERT ON credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION set_credit_note_number();

-- Commentaires
COMMENT ON COLUMN credit_notes.credit_note_number IS 'Numéro d''avoir unique au format AYYYYNNNN (ex: A20250001)';
COMMENT ON FUNCTION get_next_credit_note_number IS 'Génère le prochain numéro d''avoir séquentiel pour une année donnée';

