/*
  # Ajout du soft delete (suppression logique) à toutes les tables
  
  Cette migration ajoute une colonne `deleted_at` (timestamp) à toutes les tables
  qui peuvent être supprimées dans l'application, permettant de conserver toutes
  les données tout en les masquant de l'affichage.
  
  Tables concernées :
  - clients
  - client_collections
  - client_sub_products
  - establishment_types
  - payment_methods
  - collection_categories
  - collection_subcategories
  - collections
  - sub_products
  - draft_stock_updates
  
  Les vues SQL créées permettent de faciliter les requêtes en filtrant automatiquement
  les enregistrements supprimés.
*/

-- ============================================
-- 1. Ajout de la colonne deleted_at
-- ============================================

-- Clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Client collections
ALTER TABLE client_collections
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Client sub products
ALTER TABLE client_sub_products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Establishment types
ALTER TABLE establishment_types
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Payment methods
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Collection categories
ALTER TABLE collection_categories
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Collection subcategories
ALTER TABLE collection_subcategories
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Collections
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Sub products
ALTER TABLE sub_products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Draft stock updates
ALTER TABLE draft_stock_updates
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- ============================================
-- 2. Création d'index pour les performances
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_collections_deleted_at ON client_collections(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_sub_products_deleted_at ON client_sub_products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_establishment_types_deleted_at ON establishment_types(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_methods_deleted_at ON payment_methods(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_collection_categories_deleted_at ON collection_categories(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_collection_subcategories_deleted_at ON collection_subcategories(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_collections_deleted_at ON collections(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sub_products_deleted_at ON sub_products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_draft_stock_updates_deleted_at ON draft_stock_updates(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- 3. Création de vues SQL pour faciliter les requêtes
-- ============================================

-- Vue pour les clients actifs
CREATE OR REPLACE VIEW clients_active AS
SELECT * FROM clients WHERE deleted_at IS NULL;

-- Vue pour les client_collections actives
CREATE OR REPLACE VIEW client_collections_active AS
SELECT * FROM client_collections WHERE deleted_at IS NULL;

-- Vue pour les client_sub_products actifs
CREATE OR REPLACE VIEW client_sub_products_active AS
SELECT * FROM client_sub_products WHERE deleted_at IS NULL;

-- Vue pour les establishment_types actifs
CREATE OR REPLACE VIEW establishment_types_active AS
SELECT * FROM establishment_types WHERE deleted_at IS NULL;

-- Vue pour les payment_methods actifs
CREATE OR REPLACE VIEW payment_methods_active AS
SELECT * FROM payment_methods WHERE deleted_at IS NULL;

-- Vue pour les collection_categories actives
CREATE OR REPLACE VIEW collection_categories_active AS
SELECT * FROM collection_categories WHERE deleted_at IS NULL;

-- Vue pour les collection_subcategories actives
CREATE OR REPLACE VIEW collection_subcategories_active AS
SELECT * FROM collection_subcategories WHERE deleted_at IS NULL;

-- Vue pour les collections actives
CREATE OR REPLACE VIEW collections_active AS
SELECT * FROM collections WHERE deleted_at IS NULL;

-- Vue pour les sub_products actifs
CREATE OR REPLACE VIEW sub_products_active AS
SELECT * FROM sub_products WHERE deleted_at IS NULL;

-- Vue pour les draft_stock_updates actifs
CREATE OR REPLACE VIEW draft_stock_updates_active AS
SELECT * FROM draft_stock_updates WHERE deleted_at IS NULL;

-- ============================================
-- 4. Commentaires
-- ============================================

COMMENT ON COLUMN clients.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN client_collections.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN client_sub_products.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN establishment_types.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN payment_methods.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN collection_categories.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN collection_subcategories.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN collections.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN sub_products.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
COMMENT ON COLUMN draft_stock_updates.deleted_at IS 'Date de suppression logique (NULL si non supprimé)';
