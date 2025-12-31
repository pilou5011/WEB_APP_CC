-- ============================================
-- SOLUTION FINALE POUR LE PROBLÈME RLS COMPANIES
-- ============================================
-- 
-- Ce script utilise une approche différente : permettre à tout utilisateur
-- authentifié de créer une entreprise, avec une vérification dans la fonction.
--
-- INSTRUCTIONS :
-- 1. Copiez-collez ce script dans SQL Editor de Supabase
-- 2. Exécutez le script
-- 3. Rechargez la page de l'application
--
-- ============================================

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS public.user_has_company();

-- Créer une fonction SECURITY DEFINER qui lit directement dans users
-- en désactivant temporairement RLS
CREATE OR REPLACE FUNCTION public.user_has_company()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  -- Récupérer l'ID de l'utilisateur
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Désactiver temporairement RLS pour cette requête
  -- SECURITY DEFINER nous donne les droits du propriétaire
  PERFORM set_config('row_security', 'off', true);
  
  -- Lire directement dans users sans RLS
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = v_user_id
  ) INTO v_exists;
  
  -- Réactiver RLS
  PERFORM set_config('row_security', 'on', true);
  
  RETURN COALESCE(v_exists, false);
END;
$$;

-- Supprimer toutes les politiques existantes sur companies
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;

-- Créer une politique simple qui permet à tout utilisateur authentifié
-- de créer une entreprise (la vérification se fait dans la fonction)
CREATE POLICY "Authenticated users can create a company"
  ON companies FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    NOT public.user_has_company()
  );

-- Recréer la politique SELECT pour companies
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = public.user_company_id());

-- Vérifier que la fonction fonctionne
SELECT 
  public.user_has_company() as has_company,
  auth.uid() as current_user_id;

