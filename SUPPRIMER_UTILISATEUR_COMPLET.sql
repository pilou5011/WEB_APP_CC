-- ============================================
-- SCRIPT POUR SUPPRIMER COMPLÈTEMENT UN UTILISATEUR
-- ============================================
-- 
-- Ce script supprime un utilisateur de toutes les tables :
-- 1. auth.users (authentification Supabase)
-- 2. public.users (table métier)
-- 3. Nettoyage des références dans user_invitations
--
-- ⚠️ ATTENTION : Ce script supprime définitivement l'utilisateur et toutes ses données
--
-- INSTRUCTIONS :
-- 1. Remplacez 'USER_EMAIL@example.com' par l'email de l'utilisateur à supprimer
-- 2. Ou remplacez 'USER_ID_UUID' par l'ID UUID de l'utilisateur
-- 3. Exécutez le script dans SQL Editor de Supabase
--
-- ============================================

-- Option 1 : Supprimer par EMAIL
-- Remplacez l'email ci-dessous
DO $$
DECLARE
  v_user_id uuid;
  v_user_email text := 'USER_EMAIL@example.com'; -- ⚠️ REMPLACEZ ICI
BEGIN
  -- Récupérer l'ID de l'utilisateur depuis auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Utilisateur non trouvé avec l''email: %', v_user_email;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Suppression de l''utilisateur: % (ID: %)', v_user_email, v_user_id;
  
  -- 1. Supprimer les invitations créées par cet utilisateur (invited_by sera mis à NULL)
  UPDATE user_invitations
  SET invited_by = NULL
  WHERE invited_by = v_user_id;
  
  RAISE NOTICE 'Invitations mises à jour (invited_by mis à NULL)';
  
  -- 2. Supprimer de public.users (si pas déjà fait)
  DELETE FROM public.users
  WHERE id = v_user_id;
  
  RAISE NOTICE 'Utilisateur supprimé de public.users';
  
  -- 3. Supprimer de auth.users (authentification Supabase)
  -- ⚠️ Cette opération nécessite des permissions spéciales
  -- Si vous avez une erreur, utilisez le Dashboard Supabase : Authentication > Users > Delete
  DELETE FROM auth.users
  WHERE id = v_user_id;
  
  RAISE NOTICE 'Utilisateur supprimé de auth.users';
  RAISE NOTICE '✅ Suppression complète terminée pour: %', v_user_email;
END $$;

-- ============================================
-- Option 2 : Supprimer par ID UUID
-- ============================================
-- Décommentez et utilisez cette section si vous préférez utiliser l'ID directement

/*
DO $$
DECLARE
  v_user_id uuid := 'USER_ID_UUID'; -- ⚠️ REMPLACEZ ICI par l'ID UUID
  v_user_email text;
BEGIN
  -- Récupérer l'email pour les messages
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  IF v_user_email IS NULL THEN
    RAISE NOTICE 'Utilisateur non trouvé avec l''ID: %', v_user_id;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Suppression de l''utilisateur: % (ID: %)', v_user_email, v_user_id;
  
  -- 1. Supprimer les invitations créées par cet utilisateur
  UPDATE user_invitations
  SET invited_by = NULL
  WHERE invited_by = v_user_id;
  
  RAISE NOTICE 'Invitations mises à jour (invited_by mis à NULL)';
  
  -- 2. Supprimer de public.users
  DELETE FROM public.users
  WHERE id = v_user_id;
  
  RAISE NOTICE 'Utilisateur supprimé de public.users';
  
  -- 3. Supprimer de auth.users
  DELETE FROM auth.users
  WHERE id = v_user_id;
  
  RAISE NOTICE 'Utilisateur supprimé de auth.users';
  RAISE NOTICE '✅ Suppression complète terminée pour: %', v_user_email;
END $$;
*/

-- ============================================
-- VÉRIFICATION : Vérifier qu'un utilisateur a bien été supprimé
-- ============================================
-- Exécutez cette requête pour vérifier qu'il ne reste rien

/*
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users
WHERE email = 'USER_EMAIL@example.com' -- ⚠️ REMPLACEZ ICI

UNION ALL

SELECT 
  'public.users' as table_name,
  COUNT(*) as count
FROM public.users
WHERE email = 'USER_EMAIL@example.com' -- ⚠️ REMPLACEZ ICI

UNION ALL

SELECT 
  'user_invitations (invited_by)' as table_name,
  COUNT(*) as count
FROM user_invitations
WHERE invited_by = (SELECT id FROM auth.users WHERE email = 'USER_EMAIL@example.com'); -- ⚠️ REMPLACEZ ICI
*/

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
--
-- 1. **auth.users** : 
--    - Si la suppression échoue avec une erreur de permissions,
--    - Utilisez le Dashboard Supabase : Authentication > Users > [Sélectionner l'utilisateur] > Delete
--
-- 2. **public.users** :
--    - Vous avez déjà supprimé cette ligne manuellement ✅
--    - Si l'utilisateur était le dernier de son entreprise, l'entreprise sera supprimée automatiquement
--    - (grâce à ON DELETE CASCADE sur company_id)
--
-- 3. **user_invitations** :
--    - Les invitations créées par cet utilisateur (invited_by) seront mises à NULL
--    - Les invitations pour cet utilisateur (par email) resteront mais ne pourront plus être acceptées
--
-- 4. **Données métier** :
--    - Les données créées par l'utilisateur (clients, factures, etc.) restent dans la base
--    - Elles sont liées à company_id, pas à user_id
--    - Si vous voulez supprimer toutes les données de l'entreprise, supprimez l'entreprise
--
-- 5. **Suppression de l'entreprise** :
--    - Si vous supprimez une entreprise, tous les utilisateurs de cette entreprise seront supprimés
--    - Toutes les données métier (clients, factures, etc.) seront supprimées (ON DELETE CASCADE)
--    - ⚠️ C'est une opération irréversible !

