/*
  # Correction des politiques RLS pour tour_names
  
  Cette migration corrige les politiques RLS pour utiliser public.user_company_id()
  au lieu d'une sous-requête sur user_profile, pour être cohérent avec les autres tables.
  
  IMPORTANT: Cette migration doit être exécutée après la création de la table tour_names
  si les politiques RLS initiales ne fonctionnent pas correctement.
*/

-- S'assurer que la fonction user_company_id() existe
-- (Elle devrait déjà exister, mais on la recrée pour être sûr)
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Supprimer TOUTES les politiques existantes pour tour_names (y compris avec des noms différents)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tour_names') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON tour_names', r.policyname);
  END LOOP;
END $$;

-- Créer les nouvelles politiques avec public.user_company_id()
CREATE POLICY "Users can view tour_names from their company"
  ON tour_names FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert tour_names for their company"
  ON tour_names FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update tour_names from their company"
  ON tour_names FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete tour_names from their company"
  ON tour_names FOR DELETE
  USING (company_id = public.user_company_id());

