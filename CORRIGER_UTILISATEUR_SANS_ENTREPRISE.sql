-- ============================================
-- CORRIGER UN UTILISATEUR SANS ENTREPRISE
-- ============================================
-- 
-- Ce script corrige un utilisateur qui existe dans users mais n'a pas d'entreprise.
-- Il crée une entreprise et l'associe à l'utilisateur.
--
-- INSTRUCTIONS :
-- 1. Remplacez 'chevallierpierrelouis@gmail.com' par l'email à corriger
-- 2. Exécutez d'abord VERIFIER_UTILISATEUR.sql pour vérifier l'état
-- 3. Exécutez ce script pour corriger
--
-- ============================================

DO $$
DECLARE
  v_user_email text := 'chevallierpierrelouis@gmail.com';
  v_user_id uuid;
  v_company_id uuid;
  v_company_name text;
  v_existing_company_id uuid;
BEGIN
  -- Récupérer l'ID de l'utilisateur
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email
    AND email_confirmed_at IS NOT NULL
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé ou email non confirmé: %', v_user_email;
  END IF;
  
  RAISE NOTICE 'Utilisateur trouvé: % (ID: %)', v_user_email, v_user_id;
  
  -- Vérifier si l'utilisateur existe dans users
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Utilisateur non trouvé dans la table users. Il sera créé lors de la prochaine connexion.';
  END IF;
  
  -- Vérifier si l'utilisateur a déjà une entreprise
  SELECT company_id INTO v_existing_company_id
  FROM public.users
  WHERE id = v_user_id;
  
  IF v_existing_company_id IS NOT NULL THEN
    -- Vérifier si l'entreprise existe vraiment
    IF EXISTS (SELECT 1 FROM public.companies WHERE id = v_existing_company_id) THEN
      RAISE NOTICE '✅ L''utilisateur a déjà une entreprise (ID: %)', v_existing_company_id;
      RETURN;
    ELSE
      RAISE NOTICE '⚠️  L''utilisateur a un company_id mais l''entreprise n''existe pas. Création d''une nouvelle entreprise...';
    END IF;
  END IF;
  
  -- Générer un nom d'entreprise basé sur l'email
  v_company_name := split_part(v_user_email, '@', 1);
  v_company_name := regexp_replace(v_company_name, '[^a-zA-Z0-9]', ' ', 'g');
  v_company_name := trim(v_company_name);
  
  IF v_company_name = '' THEN
    v_company_name := 'Mon Entreprise';
  ELSE
    v_company_name := initcap(v_company_name) || ' Entreprise';
  END IF;
  
  RAISE NOTICE 'Création de l''entreprise: %', v_company_name;
  
  -- Créer l'entreprise (en utilisant SECURITY DEFINER pour contourner RLS si nécessaire)
  INSERT INTO public.companies (name)
  VALUES (v_company_name)
  RETURNING id INTO v_company_id;
  
  RAISE NOTICE '✅ Entreprise créée avec l''ID: %', v_company_id;
  
  -- Mettre à jour l'utilisateur avec le company_id
  UPDATE public.users
  SET company_id = v_company_id
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ Utilisateur mis à jour avec company_id: %', v_company_id;
  RAISE NOTICE '';
  RAISE NOTICE '✅ CORRECTION TERMINÉE AVEC SUCCÈS !';
  RAISE NOTICE 'Vous pouvez maintenant vous reconnecter avec: %', v_user_email;
END $$;

