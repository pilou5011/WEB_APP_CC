/*
  # Ajout des sous-produits aux collections
  
  1. Tables créées
    - `sub_products`
      - `id` (uuid, clé primaire)
      - `collection_id` (uuid, référence vers collections)
      - `name` (text, nom du sous-produit)
      - `created_at` (timestamp, date de création)
      - `updated_at` (timestamp, date de dernière mise à jour)
    
    - `client_sub_products`
      - `id` (uuid, clé primaire)
      - `client_id` (uuid, référence vers clients)
      - `sub_product_id` (uuid, référence vers sub_products)
      - `initial_stock` (integer, stock initial)
      - `current_stock` (integer, stock actuel)
      - `created_at` (timestamp, date de création)
      - `updated_at` (timestamp, date de dernière mise à jour)
      - UNIQUE (client_id, sub_product_id)
  
  2. Logique
    - Un sous-produit appartient à une collection
    - Le stock d'une collection avec sous-produits = somme des stocks de ses sous-produits
    - Les sous-produits héritent du prix et autres caractéristiques de la collection parent
  
  3. Sécurité
    - RLS activé sur toutes les tables
    - Politiques d'accès publiques
*/

-- Table des sous-produits
CREATE TABLE IF NOT EXISTS sub_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (collection_id, name)
);

-- Table de liaison client-sous-produits avec stock
CREATE TABLE IF NOT EXISTS client_sub_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sub_product_id uuid NOT NULL REFERENCES sub_products(id) ON DELETE CASCADE,
  initial_stock integer NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (client_id, sub_product_id)
);

-- RLS pour sub_products
ALTER TABLE sub_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to sub_products"
  ON sub_products FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to sub_products"
  ON sub_products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to sub_products"
  ON sub_products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to sub_products"
  ON sub_products FOR DELETE
  USING (true);

-- RLS pour client_sub_products
ALTER TABLE client_sub_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to client_sub_products"
  ON client_sub_products FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to client_sub_products"
  ON client_sub_products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to client_sub_products"
  ON client_sub_products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to client_sub_products"
  ON client_sub_products FOR DELETE
  USING (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sub_products_collection_id ON sub_products(collection_id);
CREATE INDEX IF NOT EXISTS idx_client_sub_products_client_id ON client_sub_products(client_id);
CREATE INDEX IF NOT EXISTS idx_client_sub_products_sub_product_id ON client_sub_products(sub_product_id);

-- Commentaires
COMMENT ON TABLE sub_products IS 'Sous-produits appartenant à une collection. Ils héritent du prix et autres caractéristiques de la collection parent.';
COMMENT ON TABLE client_sub_products IS 'Gestion des stocks des sous-produits par client. Le stock d''une collection = somme des stocks de ses sous-produits.';

