/*
  # Ajout du champ company_name_short à la table user_profile (obligatoire)

  Ce champ permet de stocker un nom commercial court qui sera utilisé dans l'envoi des emails.
  Ce champ est obligatoire.
*/

-- Ajouter la colonne d'abord (nullable)
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS company_name_short text;

-- Remplir les valeurs NULL existantes avec company_name comme valeur par défaut
UPDATE user_profile
SET company_name_short = company_name
WHERE company_name_short IS NULL AND company_name IS NOT NULL;

-- Si company_name est aussi NULL, utiliser une valeur par défaut
UPDATE user_profile
SET company_name_short = 'Entreprise'
WHERE company_name_short IS NULL;

-- Rendre la colonne NOT NULL
ALTER TABLE user_profile
ALTER COLUMN company_name_short SET NOT NULL;

COMMENT ON COLUMN user_profile.company_name_short IS 'Nom commercial court utilisé dans l\'envoi des emails (obligatoire)';

