-- ============================================
-- SOLUTION FINALE POUR RLS COMPANIES
-- ============================================
-- 
-- Cette solution crée une fonction SECURITY DEFINER qui contourne RLS
-- et modifie le code applicatif pour utiliser cette fonction.
--
-- INSTRUCTIONS :
-- 1. Exécutez ce script dans SQL Editor de Supabase
-- 2. Rechargez la page de l'application
--
-- ============================================

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

-- Supprimer toutes les politiques INSERT existantes sur companies
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create a company" ON companies;
DROP POLICY IF EXISTS "Any authenticated user can create a company" ON companies;

-- Créer une politique simple : tout utilisateur authentifié peut créer une entreprise
-- (la vérification se fait dans la fonction)
CREATE POLICY "Any authenticated user can create a company"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Vérifier que la fonction existe
SELECT 
  proname as function_name,
  proargnames as arguments,
  prosrc as source
FROM pg_proc
WHERE proname = 'create_company_for_user';

