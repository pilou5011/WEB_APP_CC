/*
  # Création de la table user_profile pour les informations de l'entreprise

  1. Table créée
    - `user_profile`
      - `id` (uuid, clé primaire)
      - `company_name` (text, nom de la société)
      - `first_name` (text, prénom)
      - `last_name` (text, nom)
      - `street_address` (text, adresse)
      - `postal_code` (text, code postal)
      - `city` (text, ville)
      - `siret` (text, numéro SIRET - 14 chiffres)
      - `ape_code` (text, code APE)
      - `tva_number` (text, numéro TVA intracommunautaire)
      - `email` (text, email)
      - `phone` (text, numéro de téléphone)
      - `created_at` (timestamp, date de création)
      - `updated_at` (timestamp, date de dernière mise à jour)

  2. Sécurité
    - RLS activé sur la table
    - Politiques permettant lecture et écriture pour tous (accès public pour simplifier)
    
  3. Notes importantes
    - Une seule ligne de profil sera utilisée (profil unique)
    - Les champs sont optionnels pour permettre une saisie progressive
*/

CREATE TABLE IF NOT EXISTS user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text,
  first_name text,
  last_name text,
  street_address text,
  postal_code text,
  city text,
  siret text,
  ape_code text,
  tva_number text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to user_profile"
  ON user_profile FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to user_profile"
  ON user_profile FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to user_profile"
  ON user_profile FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to user_profile"
  ON user_profile FOR DELETE
  USING (true);

-- Ajouter des commentaires pour documenter les champs
COMMENT ON COLUMN user_profile.siret IS 'Numéro SIRET - 14 chiffres';
COMMENT ON COLUMN user_profile.ape_code IS 'Code APE (Activité Principale Exercée)';
COMMENT ON COLUMN user_profile.tva_number IS 'Numéro TVA intracommunautaire';

CREATE INDEX IF NOT EXISTS idx_user_profile_created_at ON user_profile(created_at DESC);


















