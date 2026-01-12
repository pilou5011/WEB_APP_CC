-- Add tour_name field to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS tour_name TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN clients.tour_name IS 'Nom de la tournée associée au client';

