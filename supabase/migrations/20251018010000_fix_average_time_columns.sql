/*
  # Correction des colonnes de temps moyen

  Cette migration nettoie les anciennes colonnes et s'assure que les nouvelles sont présentes
*/

-- Supprimer les anciennes colonnes si elles existent
ALTER TABLE clients DROP COLUMN IF EXISTS average_time_number;
ALTER TABLE clients DROP COLUMN IF EXISTS average_time_unit;

-- S'assurer que les nouvelles colonnes existent
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS average_time_hours integer,
  ADD COLUMN IF NOT EXISTS average_time_minutes integer;

-- Mettre à jour les commentaires
COMMENT ON COLUMN clients.average_time_hours IS 'Temps moyen - heures';
COMMENT ON COLUMN clients.average_time_minutes IS 'Temps moyen - minutes (0-59)';

