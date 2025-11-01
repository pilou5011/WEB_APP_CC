-- Migration pour ajouter le champ département à la table clients
-- Date: 2025-01-31

-- Ajouter la colonne department
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS department VARCHAR(10) NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN clients.department IS 'Numéro de département (auto-complété depuis le code postal). Format: "75", "13", "971", etc.';

-- Optionnel : Auto-compléter le département pour les clients existants qui ont un code postal
-- Cette requête met à jour le département en fonction des 2 premiers chiffres du code postal
-- Pour les codes postaux DOM (97xxx), utilise les 3 premiers chiffres
UPDATE clients
SET department = CASE
  -- DOM (971-977)
  WHEN postal_code LIKE '97%' THEN SUBSTRING(postal_code, 1, 3)
  -- Cas standard : les 2 premiers chiffres
  WHEN postal_code IS NOT NULL AND LENGTH(postal_code) = 5 THEN SUBSTRING(postal_code, 1, 2)
  ELSE NULL
END
WHERE postal_code IS NOT NULL 
  AND department IS NULL
  AND LENGTH(postal_code) = 5;

