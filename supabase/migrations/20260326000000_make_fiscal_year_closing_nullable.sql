-- Rendre la date de clôture comptable optionnelle (null = comportement par défaut côté dashboard)
ALTER TABLE user_profile
  ALTER COLUMN fiscal_year_end_month DROP NOT NULL,
  ALTER COLUMN fiscal_year_end_month DROP DEFAULT,
  ALTER COLUMN fiscal_year_end_day DROP NOT NULL,
  ALTER COLUMN fiscal_year_end_day DROP DEFAULT;

COMMENT ON COLUMN user_profile.fiscal_year_end_month IS 'Mois de clôture de l''exercice comptable (1-12), null si non défini';
COMMENT ON COLUMN user_profile.fiscal_year_end_day IS 'Jour de clôture de l''exercice comptable (1-31), null si non défini';
