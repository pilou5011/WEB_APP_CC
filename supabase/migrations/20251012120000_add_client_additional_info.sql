/*
  # Ajout d'informations complémentaires pour les clients

  1. Nouveaux champs ajoutés à la table clients
    - `phone_2` (text, numéro de téléphone 2)
    - `phone_2_info` (text, informations sur le correspondant du téléphone 2)
    - `phone_3` (text, numéro de téléphone 3)
    - `phone_3_info` (text, informations sur le correspondant du téléphone 3)
    - `opening_hours` (jsonb, horaires d'ouverture)
    - `visit_frequency_number` (integer, fréquence de passage - nombre)
    - `visit_frequency_unit` (text, fréquence de passage - unité: semaines ou mois)
    - `email` (text, adresse email)
    - `comment` (text, commentaires)
*/

-- Ajouter les nouveaux champs
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS phone_2 text,
  ADD COLUMN IF NOT EXISTS phone_2_info text,
  ADD COLUMN IF NOT EXISTS phone_3 text,
  ADD COLUMN IF NOT EXISTS phone_3_info text,
  ADD COLUMN IF NOT EXISTS opening_hours jsonb,
  ADD COLUMN IF NOT EXISTS visit_frequency_number integer,
  ADD COLUMN IF NOT EXISTS visit_frequency_unit text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS comment text;

-- Ajouter des commentaires pour documenter les champs
COMMENT ON COLUMN clients.phone_2 IS 'Numéro de téléphone secondaire';
COMMENT ON COLUMN clients.phone_2_info IS 'Informations sur le correspondant du téléphone 2';
COMMENT ON COLUMN clients.phone_3 IS 'Numéro de téléphone tertiaire';
COMMENT ON COLUMN clients.phone_3_info IS 'Informations sur le correspondant du téléphone 3';
COMMENT ON COLUMN clients.opening_hours IS 'Horaires d''ouverture (JSON)';
COMMENT ON COLUMN clients.visit_frequency_number IS 'Fréquence de passage - nombre (1-12)';
COMMENT ON COLUMN clients.visit_frequency_unit IS 'Fréquence de passage - unité (semaines ou mois)';
COMMENT ON COLUMN clients.email IS 'Adresse email du client';
COMMENT ON COLUMN clients.comment IS 'Commentaires';

