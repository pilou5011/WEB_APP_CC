/*
  # Correction des politiques RLS pour products et client_products
  
  Cette migration corrige un problème de sécurité critique : les politiques RLS
  pour products et client_products utilisaient USING (true), permettant l'accès
  à tous les produits de toutes les entreprises.
  
  Cette migration remplace ces politiques par des politiques qui filtrent
  strictement par company_id.
*/

-- Supprimer les anciennes politiques publiques non sécurisées
DROP POLICY IF EXISTS "Allow public read access to products" ON products;
DROP POLICY IF EXISTS "Allow public insert access to products" ON products;
DROP POLICY IF EXISTS "Allow public update access to products" ON products;
DROP POLICY IF EXISTS "Allow public delete access to products" ON products;

DROP POLICY IF EXISTS "Allow public read access to client_products" ON client_products;
DROP POLICY IF EXISTS "Allow public insert access to client_products" ON client_products;
DROP POLICY IF EXISTS "Allow public update access to client_products" ON client_products;
DROP POLICY IF EXISTS "Allow public delete access to client_products" ON client_products;

-- Créer les politiques RLS sécurisées pour products
CREATE POLICY "Users can view products in their company"
  ON products FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert products in their company"
  ON products FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update products in their company"
  ON products FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete products in their company"
  ON products FOR DELETE
  USING (company_id = public.user_company_id());

-- Créer les politiques RLS sécurisées pour client_products
CREATE POLICY "Users can view client_products in their company"
  ON client_products FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert client_products in their company"
  ON client_products FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update client_products in their company"
  ON client_products FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete client_products in their company"
  ON client_products FOR DELETE
  USING (company_id = public.user_company_id());

