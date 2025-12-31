-- ============================================
-- SCRIPT DE CRÉATION D'ENTREPRISE ET UTILISATEUR
-- ============================================
-- 
-- INSTRUCTIONS :
-- 1. Remplacez 'VOTRE-EMAIL@example.com' par l'email réel
-- 2. Copiez-collez ce script dans SQL Editor de Supabase
-- 3. Exécutez le script
--
-- ============================================

DO $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_company_id uuid;
  v_company_name text;
BEGIN
  -- ⚠️ REMPLACER CETTE LIGNE PAR L'EMAIL DE L'UTILISATEUR
  v_user_email := 'pierrelouchevallier@yahoo.fr';
  
  -- Récupérer l'ID de l'utilisateur depuis auth.users
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE email = v_user_email
    AND email_confirmed_at IS NOT NULL
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Utilisateur non trouvé ou email non confirmé pour: %', v_user_email;
  END IF;

  -- Vérifier si l'utilisateur existe déjà dans users
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE NOTICE '✅ L''utilisateur existe déjà dans la table users. ID: %', v_user_id;
    
    -- Vérifier l'entreprise
    SELECT company_id INTO v_company_id FROM public.users WHERE id = v_user_id;
    IF v_company_id IS NOT NULL THEN
      RAISE NOTICE '✅ L''entreprise existe déjà. Company ID: %', v_company_id;
    END IF;
    RETURN;
  END IF;

  -- Générer un nom d'entreprise basé sur l'email
  v_company_name := split_part(v_user_email, '@', 1);
  v_company_name := regexp_replace(v_company_name, '[^a-zA-Z0-9]', ' ', 'g');
  v_company_name := trim(v_company_name);
  
  IF v_company_name = '' THEN
    v_company_name := 'Mon Entreprise';
  ELSE
    v_company_name := v_company_name || ' Entreprise';
  END IF;

  RAISE NOTICE '📦 Création de l''entreprise: %', v_company_name;

  -- Créer l'entreprise
  INSERT INTO public.companies (name)
  VALUES (v_company_name)
  RETURNING id INTO v_company_id;

  RAISE NOTICE '✅ Entreprise créée avec l''ID: %', v_company_id;

  -- Créer l'utilisateur
  INSERT INTO public.users (id, email, company_id, role)
  VALUES (v_user_id, v_user_email, v_company_id, 'admin')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 COMPTE CRÉÉ AVEC SUCCÈS !';
  RAISE NOTICE '   Email: %', v_user_email;
  RAISE NOTICE '   User ID: %', v_user_id;
  RAISE NOTICE '   Company ID: %', v_company_id;
  RAISE NOTICE '   Company Name: %', v_company_name;
  RAISE NOTICE '   Role: admin';
  RAISE NOTICE '';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Erreur lors de la création: %', SQLERRM;
END $$;

