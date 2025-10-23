/*
  # Ajout de la table collections pour la gestion des collections de cartes

  1. Table créée
    - `collections`
      - `id` (uuid, clé primaire)
      - `name` (text, nom de la collection)
      - `price` (numeric, prix de la collection)
      - `created_at` (timestamp, date de création)
      - `updated_at` (timestamp, date de dernière mise à jour)

  2. Sécurité
    - RLS activé sur la table
    - Politiques permettant lecture et écriture pour tous (accès public pour simplifier)
    
  3. Notes importantes
    - Prix stocké en numeric pour permettre les décimales
    - Historique des modifications conservé avec updated_at
*/

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to collections"
  ON collections FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to collections"
  ON collections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to collections"
  ON collections FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to collections"
  ON collections FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);


