/*
  # Ajout du champ jour de fermeture
  
  Ajoute un champ pour stocker le jour de fermeture du client
*/

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS closing_day text;

COMMENT ON COLUMN clients.closing_day IS 'Jour de fermeture hebdomadaire du client';

