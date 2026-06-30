/*
  # Formule d'abonnement par utilisateur

  Chaque utilisateur est associé à une formule (standard | gold).
  La valeur par défaut « standard » préserve le comportement actuel pour tous les comptes existants.
*/

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'standard'
  CHECK (subscription_plan IN ('standard', 'gold'));

COMMENT ON COLUMN users.subscription_plan IS
  'Formule d''abonnement de l''utilisateur : standard (fonctionnalités actuelles) ou gold (standard + premium).';

CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);
