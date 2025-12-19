/*
  # Ajout du champ discount_percentage à la table invoices

  Ce champ permet de stocker le pourcentage de remise commerciale appliqué à la facture.
  La remise est appliquée sur le montant HT avant le calcul de la TVA (conforme fiscalement).
*/

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS discount_percentage numeric(5, 2) DEFAULT NULL;

COMMENT ON COLUMN invoices.discount_percentage IS 'Pourcentage de remise commerciale appliqué (0-100). La remise est appliquée sur le HT avant calcul de la TVA.';

