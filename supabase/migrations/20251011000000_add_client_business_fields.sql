/*
  # Ajout des champs professionnels pour les clients

  1. Nouveaux champs ajoutés à la table clients
    - `phone` (text, numéro de téléphone)
    - `rcs_number` (text, numéro RCS)
    - `naf_code` (text, code NAF)
    - `client_number` (text, numéro de client à 4 chiffres)

  2. Contraintes
    - client_number est unique (pas deux clients avec le même numéro)
*/

-- Ajouter les nouveaux champs
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS rcs_number text,
  ADD COLUMN IF NOT EXISTS naf_code text,
  ADD COLUMN IF NOT EXISTS client_number text;

-- Ajouter une contrainte d'unicité sur le numéro de client
ALTER TABLE clients
  ADD CONSTRAINT unique_client_number UNIQUE (client_number);

-- Ajouter des commentaires pour documenter les champs
COMMENT ON COLUMN clients.phone IS 'Numéro de téléphone du client';
COMMENT ON COLUMN clients.rcs_number IS 'Numéro RCS (Registre du Commerce et des Sociétés)';
COMMENT ON COLUMN clients.naf_code IS 'Code NAF (Nomenclature d''Activités Française)';
COMMENT ON COLUMN clients.client_number IS 'Numéro de client unique (6 chiffres)';

-- Créer un index sur le numéro de client pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_clients_client_number ON clients(client_number);


