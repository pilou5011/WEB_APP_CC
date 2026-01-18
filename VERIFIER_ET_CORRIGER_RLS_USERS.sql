-- ============================================
-- VÉRIFICATION ET CORRECTION DES POLITIQUES RLS POUR USERS
-- ============================================
-- 
-- Ce script vérifie et corrige les politiques RLS pour la table users
-- afin que les utilisateurs puissent voir leur propre enregistrement
-- et que les admins puissent gérer les utilisateurs.
--
-- INSTRUCTIONS :
-- 1. Exécutez ce script dans SQL Editor de Supabase
-- 2. Vérifiez les résultats dans la section "VÉRIFICATION"
-- 3. Si des erreurs apparaissent, les politiques seront recréées
--
-- ============================================

-- ============================================
-- ÉTAPE 1 : VÉRIFICATION DES POLITIQUES EXISTANTES
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ============================================
-- ÉTAPE 2 : SUPPRESSION DES ANCIENNES POLITIQUES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their company" ON users;
DROP POLICY IF EXISTS "Admins can update users in their company" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their company" ON users;
DROP POLICY IF EXISTS "Users can insert their own record" ON users;

-- ============================================
-- ÉTAPE 3 : CRÉATION DES POLITIQUES CORRECTES
-- ============================================

-- 1. Politique pour voir son propre enregistrement (PRIORITAIRE)
-- Cette politique doit être évaluée en premier pour éviter les dépendances circulaires
CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  USING (id = auth.uid());

-- 2. Politique pour voir les autres utilisateurs de la même entreprise
-- Cette politique utilise user_company_id() qui peut maintenant fonctionner
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (company_id = public.user_company_id());

-- 3. Politique pour créer son propre enregistrement (nouveau compte)
CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  WITH CHECK (
    id = auth.uid() AND
    NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

-- 4. Politique pour que les admins puissent insérer des utilisateurs dans leur entreprise
CREATE POLICY "Admins can insert users in their company"
  ON users FOR INSERT
  WITH CHECK (
    company_id = public.user_company_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Politique pour que les admins puissent mettre à jour les utilisateurs de leur entreprise
CREATE POLICY "Admins can update users in their company"
  ON users FOR UPDATE
  USING (
    company_id = public.user_company_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. Politique pour que les admins puissent supprimer les utilisateurs de leur entreprise
CREATE POLICY "Admins can delete users in their company"
  ON users FOR DELETE
  USING (
    company_id = public.user_company_id() AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- ÉTAPE 4 : VÉRIFICATION QUE RLS EST ACTIVÉ
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 5 : VÉRIFICATION FINALE
-- ============================================

SELECT 
  'Politiques RLS pour users' as verification,
  COUNT(*) as nombre_politiques
FROM pg_policies
WHERE tablename = 'users';

-- Afficher toutes les politiques créées
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Lecture'
    WHEN cmd = 'INSERT' THEN 'Insertion'
    WHEN cmd = 'UPDATE' THEN 'Mise à jour'
    WHEN cmd = 'DELETE' THEN 'Suppression'
  END as operation_fr
FROM pg_policies
WHERE tablename = 'users'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
  END,
  policyname;

-- ============================================
-- ÉTAPE 6 : TEST DE LA FONCTION user_company_id()
-- ============================================

-- Vérifier que la fonction existe et fonctionne
SELECT 
  proname as function_name,
  proargnames as arguments,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'user_company_id';

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
--
-- 1. **Ordre des politiques** :
--    - "Users can view their own record" doit être créée EN PREMIER
--    - Elle permet à un utilisateur de voir son propre enregistrement
--    - Sans elle, user_company_id() ne peut pas fonctionner (dépendance circulaire)
--
-- 2. **Vérification du rôle admin** :
--    - La fonction isCurrentUserAdmin() lit dans users avec .eq('id', user.id)
--    - Cette requête utilise la politique "Users can view their own record"
--    - Si cette politique n'existe pas ou ne fonctionne pas, getCurrentUser() retourne null
--
-- 3. **Si le problème persiste** :
--    - Vérifiez que l'utilisateur existe bien dans auth.users
--    - Vérifiez que l'utilisateur existe bien dans public.users avec le bon id
--    - Vérifiez que le rôle est bien 'admin' (pas 'Admin' ou 'ADMIN')
--    - Vérifiez les logs dans la console du navigateur (F12)
--
-- ============================================

