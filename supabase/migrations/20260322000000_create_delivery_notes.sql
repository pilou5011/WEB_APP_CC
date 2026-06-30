/*
  # Bons de livraison — entité indépendante de la facturation

  Tables :
  - delivery_note_templates : modèles globaux par entreprise (sans client)
  - delivery_note_template_products : produits d'un modèle (sans quantités)
  - delivery_notes : bons de livraison par client
  - delivery_note_lines : lignes produit + quantité
*/

-- Modèles globaux (par entreprise)
CREATE TABLE IF NOT EXISTS delivery_note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_note_templates_company_id
  ON delivery_note_templates(company_id);

-- Produits d'un modèle (sans quantités)
CREATE TABLE IF NOT EXISTS delivery_note_template_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES delivery_note_templates(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_note_template_products_template_id
  ON delivery_note_template_products(template_id);

CREATE INDEX IF NOT EXISTS idx_delivery_note_template_products_company_id
  ON delivery_note_template_products(company_id);

-- Bons de livraison (par client)
CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  delivery_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'imported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  imported_at timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS delivery_notes_company_delivery_number_unique
  ON delivery_notes(company_id, delivery_number);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_client_id ON delivery_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_company_id ON delivery_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);

-- Lignes d'un bon de livraison
CREATE TABLE IF NOT EXISTS delivery_note_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity >= 0),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(delivery_note_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_note_lines_delivery_note_id
  ON delivery_note_lines(delivery_note_id);

CREATE INDEX IF NOT EXISTS idx_delivery_note_lines_company_id
  ON delivery_note_lines(company_id);

-- Numérotation BL-YYYY-NNNNNN (ex: BL-2026-000152)
CREATE OR REPLACE FUNCTION get_next_delivery_note_number(p_company_id uuid, p_year integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_prefix text;
  next_seq integer;
  delivery_num text;
BEGIN
  year_prefix := 'BL-' || p_year::text || '-';

  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(delivery_number FROM LENGTH(year_prefix) + 1) AS integer
      )
    ),
    0
  ) + 1
  INTO next_seq
  FROM delivery_notes
  WHERE company_id = p_company_id
    AND delivery_number IS NOT NULL
    AND delivery_number LIKE year_prefix || '%'
    AND LENGTH(delivery_number) = LENGTH(year_prefix) + 6;

  delivery_num := year_prefix || LPAD(next_seq::text, 6, '0');

  WHILE EXISTS (
    SELECT 1 FROM delivery_notes
    WHERE company_id = p_company_id AND delivery_number = delivery_num
  ) LOOP
    next_seq := next_seq + 1;
    delivery_num := year_prefix || LPAD(next_seq::text, 6, '0');
  END LOOP;

  RETURN delivery_num;
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_delivery_note_number(uuid, integer) TO authenticated;

-- Retirer automatiquement les produits soft-deleted des modèles
CREATE OR REPLACE FUNCTION remove_deleted_product_from_delivery_templates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at) THEN
    DELETE FROM delivery_note_template_products WHERE product_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_remove_deleted_product_from_delivery_templates ON products;
CREATE TRIGGER trigger_remove_deleted_product_from_delivery_templates
  AFTER UPDATE OF deleted_at ON products
  FOR EACH ROW
  EXECUTE FUNCTION remove_deleted_product_from_delivery_templates();

-- RLS (politiques explicites — create_company_rls_policies n'existe plus en base)
ALTER TABLE delivery_note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_template_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery_note_templates in their company"
  ON delivery_note_templates FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert delivery_note_templates in their company"
  ON delivery_note_templates FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update delivery_note_templates in their company"
  ON delivery_note_templates FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete delivery_note_templates in their company"
  ON delivery_note_templates FOR DELETE
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can view delivery_note_template_products in their company"
  ON delivery_note_template_products FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert delivery_note_template_products in their company"
  ON delivery_note_template_products FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update delivery_note_template_products in their company"
  ON delivery_note_template_products FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete delivery_note_template_products in their company"
  ON delivery_note_template_products FOR DELETE
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can view delivery_notes in their company"
  ON delivery_notes FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert delivery_notes in their company"
  ON delivery_notes FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update delivery_notes in their company"
  ON delivery_notes FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete delivery_notes in their company"
  ON delivery_notes FOR DELETE
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can view delivery_note_lines in their company"
  ON delivery_note_lines FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert delivery_note_lines in their company"
  ON delivery_note_lines FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update delivery_note_lines in their company"
  ON delivery_note_lines FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete delivery_note_lines in their company"
  ON delivery_note_lines FOR DELETE
  USING (company_id = public.user_company_id());

COMMENT ON TABLE delivery_note_templates IS 'Modèles de bons de livraison globaux par entreprise (sans client, sans quantités)';
COMMENT ON TABLE delivery_notes IS 'Bons de livraison par client, indépendants de la facturation';
COMMENT ON COLUMN delivery_notes.status IS 'draft = modifiable, imported = figé après import dans Facturer (dépôt)';
