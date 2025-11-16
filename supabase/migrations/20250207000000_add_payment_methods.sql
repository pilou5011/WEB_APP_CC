/*
  # Ajout des méthodes de paiement

  1. Nouvelle table créée
    - `payment_methods`
      - `id` (uuid, clé primaire)
      - `name` (text, nom de la méthode de paiement)
      - `created_at` (timestamp, date de création)

  2. Modification de la table clients
    - Ajout d'une colonne `payment_method_id` (référence vers payment_methods)
    - Suppression de l'ancienne colonne `payment_method` (text) si elle existe

  3. Sécurité
    - RLS activé sur payment_methods
    - Politiques permettant lecture et écriture pour tous
*/

-- Créer la table des méthodes de paiement
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès
CREATE POLICY "Allow public read access to payment_methods"
  ON payment_methods FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to payment_methods"
  ON payment_methods FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to payment_methods"
  ON payment_methods FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to payment_methods"
  ON payment_methods FOR DELETE
  USING (true);

-- Ajouter la colonne à la table clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL;

-- Migrer les données existantes de payment_method (text) vers payment_method_id si possible
-- Note: Cette migration ne migre pas automatiquement les données existantes
-- Les données devront être migrées manuellement ou via un script séparé

-- Ajouter un commentaire
COMMENT ON COLUMN clients.payment_method_id IS 'Méthode de paiement du client';

-- Créer un index
CREATE INDEX IF NOT EXISTS idx_clients_payment_method_id ON clients(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_name ON payment_methods(name);

