-- Add collection_info field to stock_updates table
-- This field stores additional information about the collection for the invoice

ALTER TABLE stock_updates 
ADD COLUMN IF NOT EXISTS collection_info text;

COMMENT ON COLUMN stock_updates.collection_info IS 'Informations complémentaires sur la collection pour la facture';
