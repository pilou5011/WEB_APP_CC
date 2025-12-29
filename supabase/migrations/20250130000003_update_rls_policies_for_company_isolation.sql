/*
  # Mise à jour des politiques RLS pour l'isolation par entreprise

  Cette migration met à jour toutes les politiques RLS existantes pour filtrer
  les données par company_id. Les utilisateurs ne peuvent voir et manipuler
  que les données de leur entreprise.
*/

-- Supprimer les anciennes politiques publiques
DROP POLICY IF EXISTS "Allow public read access to clients" ON clients;
DROP POLICY IF EXISTS "Allow public insert access to clients" ON clients;
DROP POLICY IF EXISTS "Allow public update access to clients" ON clients;
DROP POLICY IF EXISTS "Allow public delete access to clients" ON clients;

DROP POLICY IF EXISTS "Allow public read access to invoices" ON invoices;
DROP POLICY IF EXISTS "Allow public insert access to invoices" ON invoices;
DROP POLICY IF EXISTS "Allow public update access to invoices" ON invoices;

DROP POLICY IF EXISTS "Allow public read access to stock_updates" ON stock_updates;
DROP POLICY IF EXISTS "Allow public insert access to stock_updates" ON stock_updates;
DROP POLICY IF EXISTS "Allow public update access to stock_updates" ON stock_updates;

DROP POLICY IF EXISTS "Allow public read access to collections" ON collections;
DROP POLICY IF EXISTS "Allow public insert access to collections" ON collections;
DROP POLICY IF EXISTS "Allow public update access to collections" ON collections;
DROP POLICY IF EXISTS "Allow public delete access to collections" ON collections;

DROP POLICY IF EXISTS "Allow public read access to client_collections" ON client_collections;
DROP POLICY IF EXISTS "Allow public insert access to client_collections" ON client_collections;
DROP POLICY IF EXISTS "Allow public update access to client_collections" ON client_collections;
DROP POLICY IF EXISTS "Allow public delete access to client_collections" ON client_collections;

DROP POLICY IF EXISTS "Allow public read access to client_sub_products" ON client_sub_products;
DROP POLICY IF EXISTS "Allow public insert access to client_sub_products" ON client_sub_products;
DROP POLICY IF EXISTS "Allow public update access to client_sub_products" ON client_sub_products;
DROP POLICY IF EXISTS "Allow public delete access to client_sub_products" ON client_sub_products;

DROP POLICY IF EXISTS "Allow public read access to sub_products" ON sub_products;
DROP POLICY IF EXISTS "Allow public insert access to sub_products" ON sub_products;
DROP POLICY IF EXISTS "Allow public update access to sub_products" ON sub_products;
DROP POLICY IF EXISTS "Allow public delete access to sub_products" ON sub_products;

DROP POLICY IF EXISTS "Allow public read access to user_profile" ON user_profile;
DROP POLICY IF EXISTS "Allow public insert access to user_profile" ON user_profile;
DROP POLICY IF EXISTS "Allow public update access to user_profile" ON user_profile;
DROP POLICY IF EXISTS "Allow public delete access to user_profile" ON user_profile;

DROP POLICY IF EXISTS "Allow public read access to establishment_types" ON establishment_types;
DROP POLICY IF EXISTS "Allow public insert access to establishment_types" ON establishment_types;
DROP POLICY IF EXISTS "Allow public update access to establishment_types" ON establishment_types;
DROP POLICY IF EXISTS "Allow public delete access to establishment_types" ON establishment_types;

DROP POLICY IF EXISTS "Allow public read access to payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Allow public insert access to payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Allow public update access to payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Allow public delete access to payment_methods" ON payment_methods;

DROP POLICY IF EXISTS "Allow public read access to collection_categories" ON collection_categories;
DROP POLICY IF EXISTS "Allow public insert access to collection_categories" ON collection_categories;
DROP POLICY IF EXISTS "Allow public update access to collection_categories" ON collection_categories;
DROP POLICY IF EXISTS "Allow public delete access to collection_categories" ON collection_categories;

DROP POLICY IF EXISTS "Allow public read access to collection_subcategories" ON collection_subcategories;
DROP POLICY IF EXISTS "Allow public insert access to collection_subcategories" ON collection_subcategories;
DROP POLICY IF EXISTS "Allow public update access to collection_subcategories" ON collection_subcategories;
DROP POLICY IF EXISTS "Allow public delete access to collection_subcategories" ON collection_subcategories;

DROP POLICY IF EXISTS "Allow public read access to draft_stock_updates" ON draft_stock_updates;
DROP POLICY IF EXISTS "Allow public insert access to draft_stock_updates" ON draft_stock_updates;
DROP POLICY IF EXISTS "Allow public update access to draft_stock_updates" ON draft_stock_updates;
DROP POLICY IF EXISTS "Allow public delete access to draft_stock_updates" ON draft_stock_updates;

-- Fonction helper pour créer des politiques RLS standardisées
CREATE OR REPLACE FUNCTION create_company_rls_policies(table_name text)
RETURNS void AS $$
BEGIN
  -- Supprimer les politiques existantes si elles existent
  EXECUTE format('DROP POLICY IF EXISTS "Users can view %s in their company" ON %I', table_name, table_name);
  EXECUTE format('DROP POLICY IF EXISTS "Users can insert %s in their company" ON %I', table_name, table_name);
  EXECUTE format('DROP POLICY IF EXISTS "Users can update %s in their company" ON %I', table_name, table_name);
  EXECUTE format('DROP POLICY IF EXISTS "Users can delete %s in their company" ON %I', table_name, table_name);

  -- SELECT
  EXECUTE format('
    CREATE POLICY "Users can view %s in their company"
      ON %I FOR SELECT
      USING (company_id = public.user_company_id());
  ', table_name, table_name);

  -- INSERT
  EXECUTE format('
    CREATE POLICY "Users can insert %s in their company"
      ON %I FOR INSERT
      WITH CHECK (company_id = public.user_company_id());
  ', table_name, table_name);

  -- UPDATE
  EXECUTE format('
    CREATE POLICY "Users can update %s in their company"
      ON %I FOR UPDATE
      USING (company_id = public.user_company_id())
      WITH CHECK (company_id = public.user_company_id());
  ', table_name, table_name);

  -- DELETE
  EXECUTE format('
    CREATE POLICY "Users can delete %s in their company"
      ON %I FOR DELETE
      USING (company_id = public.user_company_id());
  ', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- Créer les politiques pour toutes les tables métier
SELECT create_company_rls_policies('clients');
SELECT create_company_rls_policies('invoices');
SELECT create_company_rls_policies('stock_updates');
SELECT create_company_rls_policies('collections');
SELECT create_company_rls_policies('client_collections');
SELECT create_company_rls_policies('client_sub_products');
SELECT create_company_rls_policies('sub_products');
SELECT create_company_rls_policies('user_profile');
SELECT create_company_rls_policies('credit_notes');
SELECT create_company_rls_policies('stock_direct_sold');
SELECT create_company_rls_policies('establishment_types');
SELECT create_company_rls_policies('payment_methods');
SELECT create_company_rls_policies('collection_categories');
SELECT create_company_rls_policies('collection_subcategories');
SELECT create_company_rls_policies('draft_stock_updates');
SELECT create_company_rls_policies('invoice_adjustments');

-- Politiques spéciales pour invoices (immutables après création)
DROP POLICY IF EXISTS "Users can update invoices in their company" ON invoices;
CREATE POLICY "Users can update invoices in their company"
  ON invoices FOR UPDATE
  USING (
    company_id = public.user_company_id() AND
    invoice_pdf_path IS NULL
  )
  WITH CHECK (
    company_id = public.user_company_id() AND
    invoice_pdf_path IS NULL
  );

-- Nettoyer la fonction helper
DROP FUNCTION IF EXISTS create_company_rls_policies(text);

