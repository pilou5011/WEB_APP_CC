/*
  # Correction de la politique INSERT pour companies avec SECURITY DEFINER
  
  Problème : La politique RLS normale peut échouer car elle vérifie dans users
  qui peut aussi avoir des restrictions RLS.
  
  Solution : Créer une fonction SECURITY DEFINER qui permet la création d'entreprise
  pour un utilisateur authentifié qui n'a pas encore d'entreprise.
*/

-- Supprimer la fonction si elle existe
DROP FUNCTION IF EXISTS public.create_company_for_new_user(text);

-- Créer une fonction SECURITY DEFINER pour créer une entreprise
CREATE OR REPLACE FUNCTION public.create_company_for_new_user(company_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur actuel
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Vérifier que l'utilisateur n'a pas déjà une entreprise
  IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User already has a company';
  END IF;
  
  -- Créer l'entreprise
  INSERT INTO companies (name)
  VALUES (company_name)
  RETURNING id INTO v_company_id;
  
  RETURN v_company_id;
END;
$$;

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;

-- Créer une nouvelle politique qui utilise la fonction
CREATE POLICY "Users can create a company if they don't have one"
  ON companies FOR INSERT
  WITH CHECK (
    -- Utiliser la fonction pour vérifier
    public.create_company_for_new_user(name) IS NOT NULL
  );

-- Note: La fonction retourne l'ID mais la politique WITH CHECK ne peut pas utiliser le résultat
-- Créons plutôt une politique plus simple
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;

-- Politique simplifiée qui vérifie directement
CREATE POLICY "Users can create a company if they don't have one"
  ON companies FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    NOT EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
    )
  );

-- Garder la fonction pour une utilisation future si nécessaire
COMMENT ON FUNCTION public.create_company_for_new_user(text) IS 
  'Fonction helper pour créer une entreprise pour un nouvel utilisateur. 
   Peut être utilisée dans le code applicatif si nécessaire.';

