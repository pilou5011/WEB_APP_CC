-- ============================================
-- SCRIPT COMPLET POUR APPLIQUER TOUTES LES MIGRATIONS RLS
-- ============================================
-- 
-- Ce script applique toutes les migrations nécessaires pour que
-- la création de compte fonctionne correctement.
--
-- INSTRUCTIONS :
-- 1. Copiez-collez ce script dans SQL Editor de Supabase
-- 2. Exécutez le script
-- 3. Essayez de vous connecter à nouveau
--
-- ============================================

-- ============================================
-- 1. CORRECTION DE LA DÉPENDANCE CIRCULAIRE DANS USERS
-- ============================================

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;

-- Ajouter une politique qui permet à un utilisateur de voir son propre enregistrement
CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Ajouter une politique pour voir les autres utilisateurs de la même entreprise
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (company_id = public.user_company_id());

-- ============================================
-- 2. POLITIQUE INSERT POUR COMPANIES
-- ============================================

-- Créer une fonction SECURITY DEFINER pour vérifier si l'utilisateur a déjà une entreprise
-- Cette fonction peut lire dans users sans être bloquée par RLS
CREATE OR REPLACE FUNCTION public.user_has_company()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid());
$$;

-- Supprimer la politique si elle existe déjà
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;

-- Créer la politique INSERT pour companies en utilisant la fonction
CREATE POLICY "Users can create a company if they don't have one"
  ON companies FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    NOT public.user_has_company()
  );

-- ============================================
-- 3. POLITIQUE INSERT POUR USERS (PREMIÈRE CONNEXION)
-- ============================================

-- Supprimer la politique si elle existe déjà
DROP POLICY IF EXISTS "Users can insert their own record" ON users;

-- Ajouter une politique qui permet à un utilisateur de créer son propre enregistrement
-- Utilise la fonction user_has_company() pour éviter les problèmes RLS
CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  WITH CHECK (
    id = auth.uid() AND
    NOT public.user_has_company()
  );

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que les politiques existent
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('users', 'companies')
  AND policyname IN (
    'Users can view their own record',
    'Users can view users in their company',
    'Users can create a company if they don''t have one',
    'Users can insert their own record'
  )
ORDER BY tablename, policyname;

