/*
  # Ajout du code barre produit aux collections
  
  Ajoute un champ optionnel pour stocker le code barre produit (13 chiffres)
*/

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS barcode text;

COMMENT ON COLUMN collections.barcode IS 'Code barre produit (13 chiffres)';

-- Ajouter une contrainte pour vérifier que le code barre fait exactement 13 chiffres si renseigné
ALTER TABLE collections
  ADD CONSTRAINT check_barcode_length 
  CHECK (barcode IS NULL OR (barcode ~ '^[0-9]{13}$'));

