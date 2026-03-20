/*
  Fix: numéro de facture séquentiel uniquement pour les factures `status = 'completed'`.

  Objectif:
  - Les factures `processing` ne doivent plus "consommer" des numéros.
  - Les numéros des factures `completed` doivent être consécutifs (FYYYY0001, 0002, ...).
  - Il est acceptable d'avoir le même `invoice_number` entre `completed` et `processing`.
*/

-- ============================================
-- 1) get_next_invoice_number: completed only
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

  -- Sérieialiser l'attribution des numéros par (company_id, année)
  -- pour réduire les collisions en cas de concurrence (plusieurs requests).
  PERFORM pg_advisory_xact_lock(hashtext(user_company::text || ':' || invoice_year::text));

  year_prefix := 'F' || invoice_year::text;

  -- Trouver le dernier numéro de facture COMPLETÉ pour cette année
  SELECT COALESCE(
           MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(year_prefix) + 1) AS integer)),
           0
         )
  INTO next_number
  FROM invoices
  WHERE invoice_number IS NOT NULL
    AND invoice_number LIKE year_prefix || '%'
    AND LENGTH(invoice_number) = 9
    AND company_id = user_company
    AND status = 'completed';

  -- Incrémenter
  next_number := next_number + 1;

  -- Générer le numéro de facture: F + année + 4 chiffres (padded)
  invoice_num := year_prefix || LPAD(next_number::text, 4, '0');

  -- Vérifier l'unicité uniquement sur les factures completed
  WHILE EXISTS (
    SELECT 1 FROM invoices
    WHERE invoice_number = invoice_num
      AND company_id = user_company
      AND status = 'completed'
  ) LOOP
    next_number := next_number + 1;
    invoice_num := year_prefix || LPAD(next_number::text, 4, '0');
  END LOOP;

  RETURN invoice_num;
END;
$$;

-- ============================================
-- 2) Unique index: completed only
-- ============================================
-- Sécurité supplémentaire: certaines migrations plus anciennes ont pu créer une contrainte UNIQUE
-- sous un autre nom.
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

DROP INDEX IF EXISTS invoices_company_id_invoice_number_unique;

-- Unique uniquement sur les factures completed
CREATE UNIQUE INDEX invoices_company_id_invoice_number_completed_unique
  ON invoices(company_id, invoice_number)
  WHERE invoice_number IS NOT NULL
    AND status = 'completed';

-- Index simple conservé pour recherches rapides (non unique)
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- ============================================
-- 3) Trigger de rattrapage si une facture passe à completed
--    (évite les erreurs de contrainte si invoice_number du processing collisionne)
-- ============================================
CREATE OR REPLACE FUNCTION set_invoice_number_on_complete_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  invoice_year integer;
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    -- Si invoice_number vide ou collision avec une autre facture completed, on calcule un nouveau numéro.
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' OR EXISTS (
      SELECT 1
      FROM invoices
      WHERE id <> OLD.id
        AND company_id = NEW.company_id
        AND status = 'completed'
        AND invoice_number = NEW.invoice_number
    ) THEN
      -- Pour garantir que le PDF contient bien le numéro affiché dans la DB:
      -- on ne modifie pas invoice_number si le PDF existe déjà.
      -- (dans l'app, le PDF est généré avant de passer à 'completed')
      IF NEW.invoice_pdf_path IS NULL THEN
        invoice_year := EXTRACT(YEAR FROM COALESCE(NEW.invoice_date, NEW.created_at, NOW()))::integer;
        NEW.invoice_number := get_next_invoice_number(invoice_year);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_invoice_number_on_complete ON invoices;
CREATE TRIGGER trigger_set_invoice_number_on_complete
  BEFORE UPDATE OF status ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number_on_complete_trigger();

-- ============================================
-- 4) Autoriser invoice_number uniquement sur transition processing -> completed
--    (sinon le trigger d'immuabilité empêcherait le trigger ci-dessus)
-- ============================================
CREATE OR REPLACE FUNCTION prevent_invoice_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Cas d'immuabilité: on bloque toute modification des champs critiques,
  -- sauf le changement de invoice_number lors du passage en completed.
  IF (
    OLD.id != NEW.id OR
    OLD.client_id != NEW.client_id OR
    OLD.total_cards_sold != NEW.total_cards_sold OR
    OLD.total_amount != NEW.total_amount OR
    OLD.created_at != NEW.created_at OR
    (
      OLD.invoice_number != NEW.invoice_number
      AND NOT (OLD.status <> 'completed' AND NEW.status = 'completed')
    ) OR
    -- IMMUTABILITE PDF: seul les champs PDF en 1ère génération peuvent être écrasés s'ils sont NULL côté OLD
    (OLD.invoice_pdf_path IS NOT NULL AND OLD.invoice_pdf_path != NEW.invoice_pdf_path) OR
    (OLD.stock_report_pdf_path IS NOT NULL AND OLD.stock_report_pdf_path != NEW.stock_report_pdf_path) OR
    (OLD.deposit_slip_pdf_path IS NOT NULL AND OLD.deposit_slip_pdf_path != NEW.deposit_slip_pdf_path)
  ) THEN
    RAISE EXCEPTION 'Les factures sont immuables. Seuls les champs PDF peuvent être mis à jour lors de leur première génération.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

