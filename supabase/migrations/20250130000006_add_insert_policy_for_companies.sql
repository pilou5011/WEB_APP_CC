/*
  # Ajout de la politique INSERT pour companies

  Cette migration ajoute une politique RLS permettant la création d'une entreprise
  lors de l'inscription d'un nouvel utilisateur. La politique vérifie que l'utilisateur
  n'a pas encore d'entreprise (pas encore dans la table users) pour éviter les abus.
*/

-- Supprimer la politique si elle existe déjà (pour permettre la réexécution)
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;

-- Ajouter la politique INSERT pour companies
-- Permet la création d'une entreprise uniquement si l'utilisateur n'a pas encore d'entreprise
CREATE POLICY "Users can create a company if they don't have one"
  ON companies FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
    )
  );

-- Commentaire
COMMENT ON POLICY "Users can create a company if they don't have one" ON companies IS 
  'Permet la création d''une entreprise lors de l''inscription d''un nouvel utilisateur. 
   Vérifie que l''utilisateur n''a pas encore d''entreprise pour éviter les abus.';
