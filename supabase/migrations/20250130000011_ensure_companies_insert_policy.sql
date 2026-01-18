/*
  # Vérification et création de la politique INSERT pour companies
  
  Cette migration s'assure que la politique permettant la création d'entreprise
  pour un nouvel utilisateur existe et est correctement configurée.
*/

-- Supprimer la politique si elle existe déjà (pour permettre la réexécution)
DROP POLICY IF EXISTS "Users can create a company if they don't have one" ON companies;

-- Créer la politique INSERT pour companies
-- Permet la création d'une entreprise uniquement si l'utilisateur n'a pas encore d'entreprise
CREATE POLICY "Users can create a company if they don't have one"
  ON companies FOR INSERT
  WITH CHECK (
    -- L'utilisateur ne doit pas avoir d'entreprise existante
    NOT EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
    )
  );

-- Commentaire
COMMENT ON POLICY "Users can create a company if they don't have one" ON companies IS 
  'Permet la création d''une entreprise lors de l''inscription d''un nouvel utilisateur. 
   Vérifie que l''utilisateur n''a pas encore d''entreprise pour éviter les abus.';

