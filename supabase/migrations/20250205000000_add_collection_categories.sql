/*
  # Ajout des catégories et sous-catégories pour les collections

  1. Nouvelles tables créées
    - `collection_categories`
      - `id` (uuid, clé primaire)
      - `name` (text, nom de la catégorie)
      - `created_at` (timestamp, date de création)
    
    - `collection_subcategories`
      - `id` (uuid, clé primaire)
      - `category_id` (uuid, référence vers collection_categories)
      - `name` (text, nom de la sous-catégorie)
      - `created_at` (timestamp, date de création)

  2. Modification de la table collections
    - Ajout d'une colonne `category_id` (référence vers collection_categories)
    - Ajout d'une colonne `subcategory_id` (référence vers collection_subcategories)

  3. Sécurité
    - RLS activé sur les nouvelles tables
    - Politiques permettant lecture et écriture pour tous
*/

-- Créer la table des catégories de collections
CREATE TABLE IF NOT EXISTS collection_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Créer la table des sous-catégories de collections
CREATE TABLE IF NOT EXISTS collection_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES collection_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Activer RLS
ALTER TABLE collection_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_subcategories ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès pour collection_categories
CREATE POLICY "Allow public read access to collection_categories"
  ON collection_categories FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to collection_categories"
  ON collection_categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to collection_categories"
  ON collection_categories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to collection_categories"
  ON collection_categories FOR DELETE
  USING (true);

-- Politiques d'accès pour collection_subcategories
CREATE POLICY "Allow public read access to collection_subcategories"
  ON collection_subcategories FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to collection_subcategories"
  ON collection_subcategories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to collection_subcategories"
  ON collection_subcategories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to collection_subcategories"
  ON collection_subcategories FOR DELETE
  USING (true);

-- Ajouter les colonnes à la table collections
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES collection_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES collection_subcategories(id) ON DELETE SET NULL;

-- Ajouter des commentaires
COMMENT ON COLUMN collections.category_id IS 'Catégorie de la collection';
COMMENT ON COLUMN collections.subcategory_id IS 'Sous-catégorie de la collection';

-- Créer des index
CREATE INDEX IF NOT EXISTS idx_collections_category_id ON collections(category_id);
CREATE INDEX IF NOT EXISTS idx_collections_subcategory_id ON collections(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_collection_categories_name ON collection_categories(name);
CREATE INDEX IF NOT EXISTS idx_collection_subcategories_category_id ON collection_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_collection_subcategories_name ON collection_subcategories(name);

