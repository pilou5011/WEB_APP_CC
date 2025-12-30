/*
  # Correction de la politique INSERT pour companies avec fonction helper

  Cette migration crée une fonction helper qui vérifie si un utilisateur peut créer
  une entreprise, puis utilise cette fonction dans la politique RLS.
*/

-- 1. Créer une fonction helper pour vérifier si l'utilisateur peut créer une entreprise
CREATE OR REPLACE FUNCTION public.can_user_create_company()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Vérifier que l'utilisateur n'existe pas encore dans la table users
  IF EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 2. Supprimer toutes les politiques INSERT existantes sur companies
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;
DROP POLICY IF EXISTS "Allow public insert access to companies" ON companies;
DROP POLICY IF EXISTS "Anyone can insert companies" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to create companies" ON companies;

-- 3. Créer la nouvelle politique INSERT pour companies utilisant la fonction
CREATE POLICY "Users can create a company if they don't have one"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (public.can_user_create_company() = true);

-- 4. S'assurer que RLS est activé
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Commentaires
COMMENT ON FUNCTION public.can_user_create_company() IS 
  'Vérifie si l''utilisateur authentifié peut créer une entreprise (nouveau compte)';

COMMENT ON POLICY "Users can create a company if they don't have one" ON companies IS 
  'Permet la création d''une entreprise lors de l''inscription d''un nouvel utilisateur. 
   Utilise la fonction can_user_create_company() pour vérifier que l''utilisateur est nouveau.';

