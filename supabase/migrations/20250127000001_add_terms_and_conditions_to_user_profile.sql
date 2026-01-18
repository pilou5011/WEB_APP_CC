/*
  # Ajout du champ terms_and_conditions à la table user_profile

  Ce champ permet de stocker les conditions générales de vente personnalisées pour l'utilisateur.
  Ce champ est optionnel et peut contenir jusqu'à 600 caractères.
  La valeur par défaut correspond aux conditions générales actuelles.
*/

-- Ajouter la colonne (nullable, max 600 caractères)
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS terms_and_conditions text;

-- Ajouter une contrainte pour limiter à 600 caractères (si elle n'existe pas déjà)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'terms_and_conditions_max_length'
  ) THEN
    ALTER TABLE user_profile
    ADD CONSTRAINT terms_and_conditions_max_length 
    CHECK (char_length(terms_and_conditions) <= 600);
  END IF;
END $$;

-- Remplir avec la valeur par défaut (conditions générales actuelles)
UPDATE user_profile
SET terms_and_conditions = 'Conditions de Dépôt-Vente : La marchandise et les présentoirs mis en dépôt restent la propriété de Castel Carterie SAS. Le dépositaire s''engage à régler comptant les produits vendus à la date d''émission de la facture. Le dépositaire s''engage à assurer la marchandise et les présentoirs contre tous les risques (vol, incendie, dégâts des eaux,…). En cas d''une saisie, le client s''engage à informer l''huissier de la réserve de propriété de Castel Carterie SAS. Tout retard de paiement entraîne une indemnité forfaitaire de 40 € + pénalités de retard de 3 fois le taux d''intérêt légal.'
WHERE terms_and_conditions IS NULL;

COMMENT ON COLUMN user_profile.terms_and_conditions IS 'Conditions générales de vente personnalisées (max 600 caractères)';

