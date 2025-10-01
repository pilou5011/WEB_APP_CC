/*
  # Application de gestion de dépôts-ventes de cartes de vœux

  1. Tables créées
    - `clients`
      - `id` (uuid, clé primaire)
      - `name` (text, nom du client)
      - `address` (text, adresse du client)
      - `initial_stock` (integer, stock initial lors de la création)
      - `current_stock` (integer, stock actuel)
      - `created_at` (timestamp, date de création)
      - `updated_at` (timestamp, date de dernière mise à jour)
    
    - `stock_updates`
      - `id` (uuid, clé primaire)
      - `client_id` (uuid, référence vers clients)
      - `previous_stock` (integer, stock avant la mise à jour)
      - `counted_stock` (integer, stock compté lors de l'inventaire)
      - `cards_sold` (integer, cartes vendues calculées)
      - `cards_added` (integer, nouvelles cartes ajoutées)
      - `new_stock` (integer, nouveau stock après mise à jour)
      - `created_at` (timestamp, date de la mise à jour)

  2. Sécurité
    - RLS activé sur toutes les tables
    - Pas d'authentification pour l'instant (accès public pour simplifier)
    - Politiques permettant lecture et écriture pour tous
    
  3. Notes importantes
    - Prix unitaire fixé à 2€ (géré côté application)
    - Historique complet des mises à jour de stock conservé
    - Calculs automatiques des cartes vendues
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  initial_stock integer NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  previous_stock integer NOT NULL,
  counted_stock integer NOT NULL,
  cards_sold integer NOT NULL,
  cards_added integer NOT NULL DEFAULT 0,
  new_stock integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to clients"
  ON clients FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to clients"
  ON clients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to clients"
  ON clients FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to clients"
  ON clients FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access to stock_updates"
  ON stock_updates FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to stock_updates"
  ON stock_updates FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stock_updates_client_id ON stock_updates(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);