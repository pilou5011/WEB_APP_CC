-- Migration: Rename RCS and NAF columns to SIRET and TVA
-- This aligns the database column names with the new labels

-- Rename rcs_number to siret_number
ALTER TABLE clients
RENAME COLUMN rcs_number TO siret_number;

-- Rename naf_code to tva_number
ALTER TABLE clients
RENAME COLUMN naf_code TO tva_number;

-- Update comments for documentation
COMMENT ON COLUMN clients.siret_number IS 'Numéro SIRET de la société';
COMMENT ON COLUMN clients.tva_number IS 'Numéro de TVA intracommunautaire';

