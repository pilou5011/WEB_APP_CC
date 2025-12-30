/*
  # Fonction SECURITY DEFINER pour créer une entreprise
  
  Cette fonction permet de créer une entreprise en contournant RLS.
  Elle vérifie que l'utilisateur n'a pas déjà une entreprise avant de créer.
*/

-- Créer une fonction SECURITY DEFINER pour créer une entreprise
CREATE OR REPLACE FUNCTION public.create_company_for_user(company_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Vérifier que l'utilisateur n'a pas déjà une entreprise
  -- En utilisant SECURITY DEFINER, on peut lire dans users sans RLS
  IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User already has a company';
  END IF;
  
  -- Créer l'entreprise (contourne RLS car SECURITY DEFINER)
  INSERT INTO companies (name)
  VALUES (company_name)
  RETURNING id INTO v_company_id;
  
  RETURN v_company_id;
END;
$$;

-- Donner les permissions d'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.create_company_for_user(text) TO authenticated;

COMMENT ON FUNCTION public.create_company_for_user(text) IS 
  'Crée une entreprise pour l''utilisateur authentifié actuel. 
   Vérifie qu''il n''a pas déjà une entreprise. 
   Contourne RLS grâce à SECURITY DEFINER.';

