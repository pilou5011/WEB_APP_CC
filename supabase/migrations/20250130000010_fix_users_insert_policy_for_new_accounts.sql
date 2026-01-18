/*
  # Correction de la politique RLS pour permettre la création d'utilisateur lors de la première connexion

  Problème : La politique "Admins can insert users in their company" nécessite qu'un admin existe,
  mais lors de la création d'un nouveau compte, l'utilisateur n'existe pas encore dans la table users.

  Solution : Ajouter une politique qui permet à un utilisateur authentifié de créer son propre
  enregistrement dans users, mais uniquement s'il n'existe pas déjà.
*/

-- Ajouter une politique qui permet à un utilisateur de créer son propre enregistrement
-- Cette politique est nécessaire pour la première connexion après confirmation d'email
CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  WITH CHECK (
    id = auth.uid() AND
    -- Vérifier que l'utilisateur n'existe pas déjà
    NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  );

-- Note: La politique "Admins can insert users in their company" reste active
-- pour permettre aux admins d'inviter d'autres utilisateurs

