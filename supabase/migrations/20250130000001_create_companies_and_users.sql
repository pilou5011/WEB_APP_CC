/*
  # Création des tables companies et users pour le mode multi-utilisateurs/multi-entreprises

  1. Table companies
    - id (uuid, clé primaire)
    - name (text, nom de l'entreprise)
    - created_at (timestamp)

  2. Table users
    - id (uuid, clé primaire, lié à auth.users)
    - email (text, unique)
    - company_id (uuid, référence vers companies)
    - role (text, 'admin' ou 'user')
    - created_at (timestamp)

  3. Sécurité
    - RLS activé sur les deux tables
    - Politiques d'accès basées sur company_id
*/

-- Table companies
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Table users (liée à auth.users de Supabase)
-- Note: On ne peut pas créer de FK vers auth.users depuis une migration standard
-- La cohérence sera gérée au niveau applicatif
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now()
);

-- Créer un trigger pour supprimer l'utilisateur si auth.users est supprimé
-- Ce trigger doit être créé avec les permissions appropriées
-- Pour l'instant, on gère la suppression au niveau applicatif

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Fonction helper pour obtenir le company_id de l'utilisateur connecté
-- Cette fonction doit être créée dans le schéma public, pas auth
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Politiques RLS pour companies
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = public.user_company_id());

CREATE POLICY "Admins can update their company"
  ON companies FOR UPDATE
  USING (id = public.user_company_id() AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Politiques RLS pour users
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Admins can insert users in their company"
  ON users FOR INSERT
  WITH CHECK (
    company_id = public.user_company_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update users in their company"
  ON users FOR UPDATE
  USING (
    company_id = public.user_company_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete users in their company"
  ON users FOR DELETE
  USING (
    company_id = public.user_company_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Table pour les invitations
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  accepted_at timestamptz NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);

-- Politiques RLS pour user_invitations
CREATE POLICY "Users can view invitations in their company"
  ON user_invitations FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Admins can insert invitations in their company"
  ON user_invitations FOR INSERT
  WITH CHECK (
    company_id = public.user_company_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update invitations in their company"
  ON user_invitations FOR UPDATE
  USING (
    company_id = public.user_company_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete invitations in their company"
  ON user_invitations FOR DELETE
  USING (
    company_id = public.user_company_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Permettre à n'importe qui de lire une invitation par token (pour la page d'acceptation)
CREATE POLICY "Anyone can view invitation by token"
  ON user_invitations FOR SELECT
  USING (true);

COMMENT ON TABLE companies IS 'Entreprises utilisant l''application';
COMMENT ON TABLE users IS 'Utilisateurs de l''application, liés à auth.users';
COMMENT ON TABLE user_invitations IS 'Invitations d''utilisateurs à rejoindre une entreprise';

