/*
  # Ajout de champs supplémentaires pour les clients

  1. Nouveaux champs ajoutés à la table clients
    - `phone_1_info` (text, informations sur le correspondant du téléphone 1)
    - `average_time_hours` (integer, temps moyen - heures)
    - `average_time_minutes` (integer, temps moyen - minutes)
    - `vacation_start_date` (date, date de début de vacances)
    - `vacation_end_date` (date, date de fin de vacances)
    - `market_days` (text[], jours de marché - tableau)
    - `payment_method` (text, mode de règlement)
*/

-- Ajouter les nouveaux champs
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS phone_1_info text,
  ADD COLUMN IF NOT EXISTS average_time_hours integer,
  ADD COLUMN IF NOT EXISTS average_time_minutes integer,
  ADD COLUMN IF NOT EXISTS vacation_start_date date,
  ADD COLUMN IF NOT EXISTS vacation_end_date date,
  ADD COLUMN IF NOT EXISTS market_days text[],
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Ajouter des commentaires pour documenter les champs
COMMENT ON COLUMN clients.phone_1_info IS 'Informations sur le correspondant du téléphone principal';
COMMENT ON COLUMN clients.average_time_hours IS 'Temps moyen - heures';
COMMENT ON COLUMN clients.average_time_minutes IS 'Temps moyen - minutes (0-59)';
COMMENT ON COLUMN clients.vacation_start_date IS 'Date de début des vacances';
COMMENT ON COLUMN clients.vacation_end_date IS 'Date de fin des vacances';
COMMENT ON COLUMN clients.market_days IS 'Jours de marché (tableau de jours)';
COMMENT ON COLUMN clients.payment_method IS 'Mode de règlement';

