/*
  # Correction robuste de la politique INSERT pour companies

  Cette migration corrige définitivement le problème de création d'entreprise
  en s'assurant que la politique RLS INSERT existe et fonctionne correctement.
*/

-- 1. Supprimer toutes les politiques INSERT existantes sur companies (pour repartir de zéro)
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;
DROP POLICY IF EXISTS "Allow public insert access to companies" ON companies;
DROP POLICY IF EXISTS "Anyone can insert companies" ON companies;

-- 2. Créer la politique INSERT pour companies
-- Cette politique permet la création d'une entreprise si :
-- - L'utilisateur est authentifié (auth.uid() existe)
-- - L'utilisateur n'existe pas encore dans la table users (nouveau compte)
CREATE POLICY "Users can create a company if they don't have one"
  ON companies FOR INSERT
  WITH CHECK (
    -- L'utilisateur doit être authentifié
    auth.uid() IS NOT NULL
    AND
    -- L'utilisateur ne doit pas encore exister dans la table users
    NOT EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
    )
  );

-- 3. Vérifier que RLS est bien activé sur companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Commentaire
COMMENT ON POLICY "Users can create a company if they don't have one" ON companies IS 
  'Permet la création d''une entreprise lors de l''inscription d''un nouvel utilisateur. 
   Vérifie que l''utilisateur est authentifié et n''a pas encore d''entreprise pour éviter les abus.';

