/*
  # Liaisons client-collections et suivi de stock par collection

  1. Tables créées/altérées
    - `client_collections` (relation n..n entre clients et collections, avec stock par collection)
    - Ajout de `collection_id` sur `stock_updates`

  2. Sécurité
    - RLS activé et politiques d'accès publiques (simple)
*/

-- Table de liaison avec stock par collection pour un client
CREATE TABLE IF NOT EXISTS client_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  initial_stock integer NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (client_id, collection_id)
);

ALTER TABLE client_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to client_collections"
  ON client_collections FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to client_collections"
  ON client_collections FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to client_collections"
  ON client_collections FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to client_collections"
  ON client_collections FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_client_collections_client ON client_collections(client_id);
CREATE INDEX IF NOT EXISTS idx_client_collections_collection ON client_collections(collection_id);

-- Historique par collection: ajouter une FK optionnelle
ALTER TABLE stock_updates
ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_updates_collection_id ON stock_updates(collection_id);



