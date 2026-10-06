-- Add BL-specific prices on delivery_note_lines (cession HT + recommended TTC).
-- Custom flags distinguish inherited vs manually edited values.
-- On validation, effective prices are frozen into the numeric columns.

ALTER TABLE delivery_note_lines
  ADD COLUMN IF NOT EXISTS unit_price_ht numeric NULL,
  ADD COLUMN IF NOT EXISTS recommended_sale_price_ttc numeric NULL,
  ADD COLUMN IF NOT EXISTS unit_price_ht_is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommended_sale_price_ttc_is_custom boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN delivery_note_lines.unit_price_ht IS
  'Prix de cession HT figé à la validation, ou valeur personnalisée en brouillon si unit_price_ht_is_custom';
COMMENT ON COLUMN delivery_note_lines.recommended_sale_price_ttc IS
  'Prix de vente conseillé TTC figé à la validation, ou valeur personnalisée en brouillon si recommended_sale_price_ttc_is_custom';
COMMENT ON COLUMN delivery_note_lines.unit_price_ht_is_custom IS
  'true si le prix de cession HT a été modifié manuellement sur le BL';
COMMENT ON COLUMN delivery_note_lines.recommended_sale_price_ttc_is_custom IS
  'true si le prix de vente conseillé TTC a été modifié manuellement sur le BL';
