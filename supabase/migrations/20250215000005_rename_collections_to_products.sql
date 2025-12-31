/*
  # Migration: Renommage de "Collection" vers "Produit"
  
  Cette migration renomme toutes les tables, colonnes, contraintes, index et politiques RLS
  pour remplacer "collection" par "product" dans toute la base de données.
  
  Tables renommées:
  - collections → products
  - client_collections → client_products
  - collection_categories → product_categories
  - collection_subcategories → product_subcategories
  
  Colonnes renommées:
  - collection_id → product_id (dans toutes les tables)
  - collection_info → product_info
  - collection_name → product_name (si existe)
  
  IMPORTANT: Cette migration doit être exécutée en une seule transaction pour garantir la cohérence.
*/

BEGIN;

-- ============================================
-- 1. RENOMMER LES TABLES
-- ============================================

-- Renommer collection_categories → product_categories
ALTER TABLE IF EXISTS collection_categories RENAME TO product_categories;

-- Renommer collection_subcategories → product_subcategories
ALTER TABLE IF EXISTS collection_subcategories RENAME TO product_subcategories;

-- Renommer collections → products
ALTER TABLE IF EXISTS collections RENAME TO products;

-- Renommer client_collections → client_products
ALTER TABLE IF EXISTS client_collections RENAME TO client_products;

-- ============================================
-- 2. RENOMMER LES COLONNES DANS LES TABLES
-- ============================================

-- Dans products (ex-collections)
-- category_id et subcategory_id référencent déjà product_categories et product_subcategories
-- (les tables ont été renommées, les FK suivront)

-- Dans client_products (ex-client_collections)
ALTER TABLE IF EXISTS client_products 
  RENAME COLUMN collection_id TO product_id;

-- Dans sub_products
ALTER TABLE IF EXISTS sub_products 
  RENAME COLUMN collection_id TO product_id;

-- Dans stock_updates
ALTER TABLE IF EXISTS stock_updates 
  RENAME COLUMN collection_id TO product_id;

ALTER TABLE IF EXISTS stock_updates 
  RENAME COLUMN collection_info TO product_info;

-- Dans stock_direct_sold
ALTER TABLE IF EXISTS stock_direct_sold 
  RENAME COLUMN collection_id TO product_id;

-- ============================================
-- 3. METTRE À JOUR LES FOREIGN KEYS
-- ============================================

-- Supprimer les anciennes contraintes de foreign key
ALTER TABLE IF EXISTS product_subcategories 
  DROP CONSTRAINT IF EXISTS collection_subcategories_category_id_fkey;

ALTER TABLE IF EXISTS products 
  DROP CONSTRAINT IF EXISTS collections_category_id_fkey;

ALTER TABLE IF EXISTS products 
  DROP CONSTRAINT IF EXISTS collections_subcategory_id_fkey;

ALTER TABLE IF EXISTS client_products 
  DROP CONSTRAINT IF EXISTS client_collections_collection_id_fkey;

ALTER TABLE IF EXISTS sub_products 
  DROP CONSTRAINT IF EXISTS sub_products_collection_id_fkey;

ALTER TABLE IF EXISTS stock_updates 
  DROP CONSTRAINT IF EXISTS stock_updates_collection_id_fkey;

ALTER TABLE IF EXISTS stock_direct_sold 
  DROP CONSTRAINT IF EXISTS stock_direct_sold_collection_id_fkey;

-- Recréer les foreign keys avec les nouveaux noms
ALTER TABLE IF EXISTS product_subcategories 
  ADD CONSTRAINT product_subcategories_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS products 
  ADD CONSTRAINT products_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS products 
  ADD CONSTRAINT products_subcategory_id_fkey 
  FOREIGN KEY (subcategory_id) REFERENCES product_subcategories(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS client_products 
  ADD CONSTRAINT client_products_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS sub_products 
  ADD CONSTRAINT sub_products_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS stock_updates 
  ADD CONSTRAINT stock_updates_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS stock_direct_sold 
  ADD CONSTRAINT stock_direct_sold_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- ============================================
-- 4. RENOMMER LES INDEX
-- ============================================

-- Index sur products (ex-collections)
ALTER INDEX IF EXISTS idx_collections_created_at RENAME TO idx_products_created_at;
ALTER INDEX IF EXISTS idx_collections_name RENAME TO idx_products_name;
ALTER INDEX IF EXISTS idx_collections_category_id RENAME TO idx_products_category_id;
ALTER INDEX IF EXISTS idx_collections_subcategory_id RENAME TO idx_products_subcategory_id;
ALTER INDEX IF EXISTS idx_collections_company_id RENAME TO idx_products_company_id;

-- Index sur client_products (ex-client_collections)
ALTER INDEX IF EXISTS idx_client_collections_client RENAME TO idx_client_products_client;
ALTER INDEX IF EXISTS idx_client_collections_collection RENAME TO idx_client_products_product;
ALTER INDEX IF EXISTS idx_client_collections_company_id RENAME TO idx_client_products_company_id;

-- Index sur stock_updates
ALTER INDEX IF EXISTS idx_stock_updates_collection_id RENAME TO idx_stock_updates_product_id;

-- Index sur stock_direct_sold
ALTER INDEX IF EXISTS idx_stock_direct_sold_collection_id RENAME TO idx_stock_direct_sold_product_id;

-- Index sur sub_products
ALTER INDEX IF EXISTS idx_sub_products_collection_id RENAME TO idx_sub_products_product_id;

-- Index sur product_categories (ex-collection_categories)
ALTER INDEX IF EXISTS idx_collection_categories_name RENAME TO idx_product_categories_name;

-- Index sur product_subcategories (ex-collection_subcategories)
ALTER INDEX IF EXISTS idx_collection_subcategories_category_id RENAME TO idx_product_subcategories_category_id;
ALTER INDEX IF EXISTS idx_collection_subcategories_name RENAME TO idx_product_subcategories_name;

-- ============================================
-- 5. METTRE À JOUR LES CONTRAINTES UNIQUES
-- ============================================

-- La contrainte unique sur client_products (client_id, product_id) est déjà correcte
-- car elle utilise les noms de colonnes, pas le nom de table

-- La contrainte unique sur sub_products (product_id, name) est déjà correcte

-- La contrainte unique sur product_subcategories (category_id, name) est déjà correcte

-- ============================================
-- 6. METTRE À JOUR LES POLITIQUES RLS
-- ============================================

-- Supprimer les anciennes politiques RLS
DROP POLICY IF EXISTS "Allow public read access to collections" ON products;
DROP POLICY IF EXISTS "Allow public insert access to collections" ON products;
DROP POLICY IF EXISTS "Allow public update access to collections" ON products;
DROP POLICY IF EXISTS "Allow public delete access to collections" ON products;

DROP POLICY IF EXISTS "Allow public read access to client_collections" ON client_products;
DROP POLICY IF EXISTS "Allow public insert access to client_collections" ON client_products;
DROP POLICY IF EXISTS "Allow public update access to client_collections" ON client_products;
DROP POLICY IF EXISTS "Allow public delete access to client_collections" ON client_products;

DROP POLICY IF EXISTS "Allow public read access to collection_categories" ON product_categories;
DROP POLICY IF EXISTS "Allow public insert access to collection_categories" ON product_categories;
DROP POLICY IF EXISTS "Allow public update access to collection_categories" ON product_categories;
DROP POLICY IF EXISTS "Allow public delete access to collection_categories" ON product_categories;

DROP POLICY IF EXISTS "Allow public read access to collection_subcategories" ON product_subcategories;
DROP POLICY IF EXISTS "Allow public insert access to collection_subcategories" ON product_subcategories;
DROP POLICY IF EXISTS "Allow public update access to collection_subcategories" ON product_subcategories;
DROP POLICY IF EXISTS "Allow public delete access to collection_subcategories" ON product_subcategories;

-- Recréer les politiques RLS avec les nouveaux noms
CREATE POLICY "Allow public read access to products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to products"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to products"
  ON products FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to client_products"
  ON client_products FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to client_products"
  ON client_products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to client_products"
  ON client_products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to client_products"
  ON client_products FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to product_categories"
  ON product_categories FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to product_categories"
  ON product_categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to product_categories"
  ON product_categories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to product_categories"
  ON product_categories FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to product_subcategories"
  ON product_subcategories FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to product_subcategories"
  ON product_subcategories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to product_subcategories"
  ON product_subcategories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to product_subcategories"
  ON product_subcategories FOR DELETE
  USING (true);

-- ============================================
-- 7. METTRE À JOUR LES COMMENTAIRES
-- ============================================

COMMENT ON TABLE products IS 'Produits de cartes de vœux';
COMMENT ON TABLE client_products IS 'Relation entre clients et produits avec gestion du stock';
COMMENT ON TABLE product_categories IS 'Catégories de produits';
COMMENT ON TABLE product_subcategories IS 'Sous-catégories de produits';

COMMENT ON COLUMN products.category_id IS 'Catégorie du produit';
COMMENT ON COLUMN products.subcategory_id IS 'Sous-catégorie du produit';
COMMENT ON COLUMN stock_updates.product_info IS 'Informations complémentaires sur le produit pour la facture';

-- ============================================
-- 8. METTRE À JOUR LA LISTE DES TABLES AVEC SOFT DELETE
-- ============================================

-- Note: La liste SOFT_DELETE_TABLES est dans le code TypeScript, pas dans la BDD
-- Elle sera mise à jour dans lib/supabase.ts

COMMIT;

