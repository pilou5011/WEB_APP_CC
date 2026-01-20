-- ============================================
-- VÉRIFIER L'ÉTAT D'UN UTILISATEUR
-- ============================================
-- 
-- Ce script permet de vérifier l'état d'un utilisateur dans la base de données
-- et de corriger les problèmes éventuels.
--
-- INSTRUCTIONS :
-- 1. Remplacez 'chevallierpierrelouis@gmail.com' par l'email à vérifier
-- 2. Exécutez le script dans SQL Editor de Supabase
-- 3. Vérifiez les résultats
--
-- ============================================

-- Variable pour l'email à vérifier
DO $$
DECLARE
  v_user_email text := 'chevallierpierrelouis@gmail.com';
  v_user_id uuid;
  v_user_exists boolean := false;
  v_company_id uuid;
  v_company_name text;
BEGIN
  -- 1. Vérifier dans auth.users
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION DE L''UTILISATEUR: %', v_user_email;
  RAISE NOTICE '========================================';
  
  SELECT id, email_confirmed_at IS NOT NULL as email_confirmed
  INTO v_user_id, v_user_exists
  FROM auth.users
  WHERE email = v_user_email
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Utilisateur NON TROUVÉ dans auth.users';
    RETURN;
  ELSE
    RAISE NOTICE '✅ Utilisateur trouvé dans auth.users';
    RAISE NOTICE '   ID: %', v_user_id;
    
    -- Vérifier si l'email est confirmé
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id AND email_confirmed_at IS NOT NULL) THEN
      RAISE NOTICE '✅ Email confirmé';
    ELSE
      RAISE NOTICE '⚠️  Email NON confirmé';
    END IF;
  END IF;
  
  -- 2. Vérifier dans users
  RAISE NOTICE '';
  RAISE NOTICE 'Vérification dans la table users...';
  
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE NOTICE '✅ Utilisateur existe dans la table users';
    
    -- Récupérer les informations
    SELECT company_id, email INTO v_company_id, v_user_email
    FROM public.users
    WHERE id = v_user_id;
    
    RAISE NOTICE '   Company ID: %', v_company_id;
    
    IF v_company_id IS NULL THEN
      RAISE NOTICE '❌ PROBLÈME: company_id est NULL !';
      RAISE NOTICE '   → L''utilisateur existe mais n''a pas d''entreprise';
    ELSE
      -- Vérifier si l'entreprise existe
      IF EXISTS (SELECT 1 FROM public.companies WHERE id = v_company_id) THEN
        SELECT name INTO v_company_name FROM public.companies WHERE id = v_company_id;
        RAISE NOTICE '✅ Entreprise existe: %', v_company_name;
      ELSE
        RAISE NOTICE '❌ PROBLÈME: L''entreprise avec ID % n''existe pas !', v_company_id;
      END IF;
    END IF;
  ELSE
    RAISE NOTICE '⚠️  Utilisateur N''EXISTE PAS dans la table users';
    RAISE NOTICE '   → Il sera créé lors de la prochaine connexion';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email: %', v_user_email;
  RAISE NOTICE 'User ID: %', v_user_id;
  
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    SELECT company_id INTO v_company_id FROM public.users WHERE id = v_user_id;
    IF v_company_id IS NULL THEN
      RAISE NOTICE 'STATUT: ❌ Utilisateur sans entreprise (company_id = NULL)';
      RAISE NOTICE '';
      RAISE NOTICE 'SOLUTION: Exécutez le script CORRIGER_UTILISATEUR_SANS_ENTREPRISE.sql';
    ELSE
      RAISE NOTICE 'STATUT: ✅ Utilisateur avec entreprise';
    END IF;
  ELSE
    RAISE NOTICE 'STATUT: ⚠️  Utilisateur non créé dans users (sera créé à la connexion)';
  END IF;
END $$;

-- Afficher les détails complets
SELECT 
  'auth.users' as table_name,
  au.id as user_id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.created_at as auth_created_at
FROM auth.users au
WHERE au.email = 'chevallierpierrelouis@gmail.com'

UNION ALL

SELECT 
  'public.users' as table_name,
  u.id as user_id,
  u.email,
  u.company_id IS NOT NULL as has_company,
  u.created_at as auth_created_at
FROM public.users u
WHERE u.email = 'chevallierpierrelouis@gmail.com';

