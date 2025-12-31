-- ============================================
-- SOLUTION SIMPLE ET EFFICACE POUR RLS COMPANIES
-- ============================================
-- 
-- Cette solution permet à tout utilisateur authentifié de créer une entreprise.
-- La vérification qu'il n'en a pas déjà une se fait côté application.
--
-- INSTRUCTIONS :
-- 1. Copiez-collez ce script dans SQL Editor de Supabase
-- 2. Exécutez le script
-- 3. Rechargez la page de l'application
--
-- ============================================

-- Supprimer toutes les politiques INSERT existantes sur companies
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create a company" ON companies;

-- Créer une politique simple : tout utilisateur authentifié peut créer une entreprise
-- La vérification qu'il n'en a pas déjà une se fait dans le code applicatif
CREATE POLICY "Any authenticated user can create a company"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Vérifier que la politique existe
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'companies'
  AND cmd = 'INSERT'
ORDER BY policyname;

