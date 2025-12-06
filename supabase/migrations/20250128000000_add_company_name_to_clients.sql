-- Migration: Add company_name field to clients table
-- This field represents the legal company name and will be used in invoices

-- Add company_name column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN clients.company_name IS 'Nom de la société (raison sociale) - utilisé dans les factures';

