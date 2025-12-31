/*
  # Correction de la dépendance circulaire dans les politiques RLS de la table users

  Problème : La politique RLS "Users can view users in their company" utilise
  public.user_company_id() qui lit dans la table users, créant une dépendance circulaire.

  Solution : Ajouter une politique qui permet à un utilisateur de voir son propre
  enregistrement, indépendamment de la vérification de company_id.
*/

-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Users can view users in their company" ON users;

-- Ajouter une politique qui permet à un utilisateur de voir son propre enregistrement
-- Cette politique doit être évaluée en premier (avant celle basée sur company_id)
CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Ajouter une politique pour voir les autres utilisateurs de la même entreprise
-- Cette politique utilise user_company_id() qui peut maintenant fonctionner
-- car l'utilisateur peut voir son propre enregistrement via la politique ci-dessus
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (company_id = public.user_company_id());

