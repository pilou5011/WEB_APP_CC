-- Jour de clôture de l'exercice comptable (par défaut : 31 décembre = année civile)
ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS fiscal_year_end_month integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS fiscal_year_end_day integer NOT NULL DEFAULT 31;

ALTER TABLE user_profile
  DROP CONSTRAINT IF EXISTS user_profile_fiscal_year_end_month_check;

ALTER TABLE user_profile
  ADD CONSTRAINT user_profile_fiscal_year_end_month_check
  CHECK (fiscal_year_end_month BETWEEN 1 AND 12);

ALTER TABLE user_profile
  DROP CONSTRAINT IF EXISTS user_profile_fiscal_year_end_day_check;

ALTER TABLE user_profile
  ADD CONSTRAINT user_profile_fiscal_year_end_day_check
  CHECK (fiscal_year_end_day BETWEEN 1 AND 31);

COMMENT ON COLUMN user_profile.fiscal_year_end_month IS 'Mois de clôture de l''exercice comptable (1-12)';
COMMENT ON COLUMN user_profile.fiscal_year_end_day IS 'Jour de clôture de l''exercice comptable (1-31)';
