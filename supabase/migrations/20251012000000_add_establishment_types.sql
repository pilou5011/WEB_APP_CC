/*
  # Ajout des types d'établissement

  1. Nouvelle table créée
    - `establishment_types`
      - `id` (uuid, clé primaire)
      - `name` (text, nom du type d'établissement)
      - `created_at` (timestamp, date de création)

  2. Modification de la table clients
    - Ajout d'une colonne `establishment_type_id` (référence vers establishment_types)

  3. Sécurité
    - RLS activé sur establishment_types
    - Politiques permettant lecture et écriture pour tous
*/

-- Créer la table des types d'établissement
CREATE TABLE IF NOT EXISTS establishment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE establishment_types ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès
CREATE POLICY "Allow public read access to establishment_types"
  ON establishment_types FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to establishment_types"
  ON establishment_types FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to establishment_types"
  ON establishment_types FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to establishment_types"
  ON establishment_types FOR DELETE
  USING (true);

-- Ajouter la colonne à la table clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS establishment_type_id uuid REFERENCES establishment_types(id) ON DELETE SET NULL;

-- Ajouter un commentaire
COMMENT ON COLUMN clients.establishment_type_id IS 'Type d''établissement du client';

-- Créer un index
CREATE INDEX IF NOT EXISTS idx_clients_establishment_type_id ON clients(establishment_type_id);
CREATE INDEX IF NOT EXISTS idx_establishment_types_name ON establishment_types(name);


