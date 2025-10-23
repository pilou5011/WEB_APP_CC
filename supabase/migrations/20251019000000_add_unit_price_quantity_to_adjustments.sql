/*
  # Ajout de prix unitaire et quantité aux ajustements de facture

  Ajoute les colonnes unit_price et quantity à la table invoice_adjustments
  pour permettre un calcul détaillé des reprises de stock
*/

-- Ajouter les nouvelles colonnes
ALTER TABLE invoice_adjustments
  ADD COLUMN IF NOT EXISTS unit_price numeric(10, 2),
  ADD COLUMN IF NOT EXISTS quantity integer;

-- Mettre à jour les commentaires
COMMENT ON COLUMN invoice_adjustments.unit_price IS 'Prix unitaire de la carte reprise';
COMMENT ON COLUMN invoice_adjustments.quantity IS 'Nombre de cartes reprises';
COMMENT ON COLUMN invoice_adjustments.amount IS 'Montant total = unit_price * quantity (peut être négatif)';

