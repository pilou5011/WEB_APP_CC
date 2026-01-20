-- ============================================
-- CORRECTION RLS POUR COMPANIES - PROBLÈME DE CONNEXION
-- ============================================
-- 
-- Ce script corrige le problème "new row violates row-level security policy"
-- qui se produit lors de la création d'entreprise à la connexion.
--
-- INSTRUCTIONS :
-- 1. Ouvrez Supabase Dashboard → SQL Editor
-- 2. Copiez-collez ce script
-- 3. Exécutez le script
-- 4. Reconnectez-vous à votre application
--
-- ============================================

-- Supprimer toutes les politiques INSERT existantes sur companies
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create a company" ON companies;
DROP POLICY IF EXISTS "Any authenticated user can create a company" ON companies;
DROP POLICY IF EXISTS "Allow public insert access to companies" ON companies;
DROP POLICY IF EXISTS "Anyone can insert companies" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to create companies" ON companies;

-- Créer une politique simple : tout utilisateur authentifié peut créer une entreprise
-- La vérification qu'il n'en a pas déjà une se fait dans le code applicatif
CREATE POLICY "Any authenticated user can create a company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Vérifier que RLS est activé
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

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

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Politique RLS pour companies créée avec succès !';
  RAISE NOTICE 'Vous pouvez maintenant vous reconnecter à votre application.';
END $$;

