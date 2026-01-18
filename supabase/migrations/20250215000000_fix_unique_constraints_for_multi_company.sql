/*
  # Correction des contraintes UNIQUE pour le modèle multi-company
  
  Cette migration corrige TOUTES les contraintes UNIQUE pour qu'elles soient scoped par company_id.
  Cela permet à différentes entreprises d'avoir des éléments avec le même nom.
  
  Tables concernées :
  - establishment_types (company_id, name)
  - payment_methods (company_id, name)
  - collection_categories (company_id, name)
  - collection_subcategories (company_id, category_id, name)
  - sub_products (company_id, collection_id, name)
  - clients (company_id, client_number)
  
  Note: client_collections et client_sub_products n'ont pas besoin de company_id dans leur contrainte
  car client_id est déjà scoped par company_id via RLS.
*/

-- ============================================
-- 1. establishment_types
-- ============================================

-- Supprimer l'ancienne contrainte UNIQUE partielle
DROP INDEX IF EXISTS establishment_types_name_unique_not_deleted;

-- Créer une nouvelle contrainte UNIQUE partielle scoped par company_id
CREATE UNIQUE INDEX establishment_types_company_id_name_unique_not_deleted
  ON establishment_types(company_id, name)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX establishment_types_company_id_name_unique_not_deleted IS 
  'Contrainte UNIQUE partielle sur (company_id, name) pour les enregistrements non supprimés. Permet à différentes entreprises d''avoir des types d''établissement avec le même nom.';

-- ============================================
-- 2. payment_methods
-- ============================================

-- Supprimer l'ancienne contrainte UNIQUE partielle
DROP INDEX IF EXISTS payment_methods_name_unique_not_deleted;

-- Créer une nouvelle contrainte UNIQUE partielle scoped par company_id
CREATE UNIQUE INDEX payment_methods_company_id_name_unique_not_deleted
  ON payment_methods(company_id, name)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX payment_methods_company_id_name_unique_not_deleted IS 
  'Contrainte UNIQUE partielle sur (company_id, name) pour les enregistrements non supprimés. Permet à différentes entreprises d''avoir des méthodes de paiement avec le même nom.';

-- ============================================
-- 3. collection_categories
-- ============================================

-- Supprimer l'ancienne contrainte UNIQUE partielle
DROP INDEX IF EXISTS collection_categories_name_unique_not_deleted;

-- Créer une nouvelle contrainte UNIQUE partielle scoped par company_id
CREATE UNIQUE INDEX collection_categories_company_id_name_unique_not_deleted
  ON collection_categories(company_id, name)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX collection_categories_company_id_name_unique_not_deleted IS 
  'Contrainte UNIQUE partielle sur (company_id, name) pour les enregistrements non supprimés. Permet à différentes entreprises d''avoir des catégories de collection avec le même nom.';

-- ============================================
-- 4. collection_subcategories
-- ============================================

-- Supprimer l'ancienne contrainte UNIQUE partielle
DROP INDEX IF EXISTS collection_subcategories_category_id_name_unique_not_deleted;

-- Créer une nouvelle contrainte UNIQUE partielle scoped par company_id
-- Note: category_id est déjà scoped par company_id, mais on ajoute company_id pour être explicite et cohérent
CREATE UNIQUE INDEX collection_subcategories_company_id_category_id_name_unique_not_deleted
  ON collection_subcategories(company_id, category_id, name)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX collection_subcategories_company_id_category_id_name_unique_not_deleted IS 
  'Contrainte UNIQUE partielle sur (company_id, category_id, name) pour les enregistrements non supprimés. Permet à différentes entreprises d''avoir des sous-catégories avec le même nom dans la même catégorie.';

-- ============================================
-- 5. sub_products
-- ============================================

-- Supprimer l'ancienne contrainte UNIQUE partielle
DROP INDEX IF EXISTS sub_products_collection_id_name_unique_not_deleted;

-- Créer une nouvelle contrainte UNIQUE partielle scoped par company_id
-- Note: collection_id est déjà scoped par company_id, mais on ajoute company_id pour être explicite et cohérent
CREATE UNIQUE INDEX sub_products_company_id_collection_id_name_unique_not_deleted
  ON sub_products(company_id, collection_id, name)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX sub_products_company_id_collection_id_name_unique_not_deleted IS 
  'Contrainte UNIQUE partielle sur (company_id, collection_id, name) pour les enregistrements non supprimés. Permet à différentes entreprises d''avoir des sous-produits avec le même nom dans la même collection.';

-- ============================================
-- 6. clients (client_number)
-- ============================================

-- Supprimer l'ancienne contrainte UNIQUE globale
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS unique_client_number;

-- Créer une nouvelle contrainte UNIQUE partielle scoped par company_id
-- Note: client_number peut être NULL, donc on exclut les NULL de la contrainte unique
CREATE UNIQUE INDEX clients_company_id_client_number_unique_not_deleted
  ON clients(company_id, client_number)
  WHERE deleted_at IS NULL AND client_number IS NOT NULL;

COMMENT ON INDEX clients_company_id_client_number_unique_not_deleted IS 
  'Contrainte UNIQUE partielle sur (company_id, client_number) pour les enregistrements non supprimés avec client_number non NULL. Permet à différentes entreprises d''avoir des clients avec le même numéro de client.';

-- ============================================
-- 7. Note sur client_collections et client_sub_products
-- ============================================
-- Ces tables n'ont pas besoin de company_id dans leur contrainte unique car :
-- - client_id est déjà scoped par company_id via RLS
-- - La contrainte unique actuelle (client_id, collection_id) ou (client_id, sub_product_id) est suffisante
-- car un client ne peut appartenir qu'à une seule entreprise

