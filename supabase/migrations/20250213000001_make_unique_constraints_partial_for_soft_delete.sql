/*
  # Modification des contraintes UNIQUE pour supporter le soft delete
  
  Cette migration modifie les contraintes UNIQUE pour qu'elles soient partielles,
  c'est-à-dire qu'elles ne s'appliquent qu'aux enregistrements non supprimés (deleted_at IS NULL).
  
  Cela permet de recréer un élément avec le même nom qu'un élément supprimé.
  
  Tables concernées :
  - establishment_types (name)
  - payment_methods (name)
  - collection_categories (name)
  - collection_subcategories (category_id, name)
  - sub_products (collection_id, name)
  - client_collections (client_id, collection_id)
  - client_sub_products (client_id, sub_product_id)
*/

-- ============================================
-- 1. establishment_types
-- ============================================

-- Supprimer la contrainte UNIQUE existante sur name
ALTER TABLE establishment_types
  DROP CONSTRAINT IF EXISTS establishment_types_name_key;

-- Créer une contrainte UNIQUE partielle (uniquement sur les enregistrements non supprimés)
CREATE UNIQUE INDEX IF NOT EXISTS establishment_types_name_unique_not_deleted
  ON establishment_types(name)
  WHERE deleted_at IS NULL;

-- ============================================
-- 2. payment_methods
-- ============================================

-- Supprimer la contrainte UNIQUE existante sur name
ALTER TABLE payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_name_key;

-- Créer une contrainte UNIQUE partielle (uniquement sur les enregistrements non supprimés)
CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_name_unique_not_deleted
  ON payment_methods(name)
  WHERE deleted_at IS NULL;

-- ============================================
-- 3. collection_categories
-- ============================================

-- Supprimer la contrainte UNIQUE existante sur name
ALTER TABLE collection_categories
  DROP CONSTRAINT IF EXISTS collection_categories_name_key;

-- Créer une contrainte UNIQUE partielle (uniquement sur les enregistrements non supprimés)
CREATE UNIQUE INDEX IF NOT EXISTS collection_categories_name_unique_not_deleted
  ON collection_categories(name)
  WHERE deleted_at IS NULL;

-- ============================================
-- 4. collection_subcategories
-- ============================================

-- Supprimer la contrainte UNIQUE existante sur (category_id, name)
ALTER TABLE collection_subcategories
  DROP CONSTRAINT IF EXISTS collection_subcategories_category_id_name_key;

-- Créer une contrainte UNIQUE partielle (uniquement sur les enregistrements non supprimés)
CREATE UNIQUE INDEX IF NOT EXISTS collection_subcategories_category_id_name_unique_not_deleted
  ON collection_subcategories(category_id, name)
  WHERE deleted_at IS NULL;

-- ============================================
-- 5. Commentaires
-- ============================================

-- ============================================
-- 5. sub_products
-- ============================================

-- Supprimer la contrainte UNIQUE existante sur (collection_id, name)
ALTER TABLE sub_products
  DROP CONSTRAINT IF EXISTS sub_products_collection_id_name_key;

-- Créer une contrainte UNIQUE partielle (uniquement sur les enregistrements non supprimés)
CREATE UNIQUE INDEX IF NOT EXISTS sub_products_collection_id_name_unique_not_deleted
  ON sub_products(collection_id, name)
  WHERE deleted_at IS NULL;

-- ============================================
-- 6. client_collections
-- ============================================

-- Supprimer la contrainte UNIQUE existante sur (client_id, collection_id)
ALTER TABLE client_collections
  DROP CONSTRAINT IF EXISTS client_collections_client_id_collection_id_key;

-- Créer une contrainte UNIQUE partielle (uniquement sur les enregistrements non supprimés)
CREATE UNIQUE INDEX IF NOT EXISTS client_collections_client_id_collection_id_unique_not_deleted
  ON client_collections(client_id, collection_id)
  WHERE deleted_at IS NULL;

-- ============================================
-- 7. client_sub_products
-- ============================================

-- Supprimer la contrainte UNIQUE existante sur (client_id, sub_product_id)
ALTER TABLE client_sub_products
  DROP CONSTRAINT IF EXISTS client_sub_products_client_id_sub_product_id_key;

-- Créer une contrainte UNIQUE partielle (uniquement sur les enregistrements non supprimés)
CREATE UNIQUE INDEX IF NOT EXISTS client_sub_products_client_id_sub_product_id_unique_not_deleted
  ON client_sub_products(client_id, sub_product_id)
  WHERE deleted_at IS NULL;

-- ============================================
-- 8. Commentaires
-- ============================================

COMMENT ON INDEX establishment_types_name_unique_not_deleted IS 'Contrainte UNIQUE partielle sur name pour les enregistrements non supprimés';
COMMENT ON INDEX payment_methods_name_unique_not_deleted IS 'Contrainte UNIQUE partielle sur name pour les enregistrements non supprimés';
COMMENT ON INDEX collection_categories_name_unique_not_deleted IS 'Contrainte UNIQUE partielle sur name pour les enregistrements non supprimés';
COMMENT ON INDEX collection_subcategories_category_id_name_unique_not_deleted IS 'Contrainte UNIQUE partielle sur (category_id, name) pour les enregistrements non supprimés';
COMMENT ON INDEX sub_products_collection_id_name_unique_not_deleted IS 'Contrainte UNIQUE partielle sur (collection_id, name) pour les enregistrements non supprimés';
COMMENT ON INDEX client_collections_client_id_collection_id_unique_not_deleted IS 'Contrainte UNIQUE partielle sur (client_id, collection_id) pour les enregistrements non supprimés';
COMMENT ON INDEX client_sub_products_client_id_sub_product_id_unique_not_deleted IS 'Contrainte UNIQUE partielle sur (client_id, sub_product_id) pour les enregistrements non supprimés';




