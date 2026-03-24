/*
  Préférence utilisateur: mode de saisie stock par défaut.

  - Ajoute un champ dans user_profile pour choisir le mode par défaut
    dans "Facturer (dépôt)".
  - Valeurs possibles:
    - 'deposit'  : saisie via "Nouveau dépôt"
    - 'reassort' : saisie via "Réassort"
*/

ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS stock_input_mode_preference text NOT NULL DEFAULT 'deposit';

-- Nettoyage défensif de données historiques éventuelles
UPDATE user_profile
SET stock_input_mode_preference = 'deposit'
WHERE stock_input_mode_preference IS NULL
   OR stock_input_mode_preference NOT IN ('deposit', 'reassort');

-- Contrainte de domaine
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_user_profile_stock_input_mode_preference'
  ) THEN
    ALTER TABLE user_profile
      ADD CONSTRAINT check_user_profile_stock_input_mode_preference
      CHECK (stock_input_mode_preference IN ('deposit', 'reassort'));
  END IF;
END $$;

COMMENT ON COLUMN user_profile.stock_input_mode_preference IS
  'Préférence de saisie stock par défaut dans l''onglet Facturer (dépôt): deposit ou reassort';
