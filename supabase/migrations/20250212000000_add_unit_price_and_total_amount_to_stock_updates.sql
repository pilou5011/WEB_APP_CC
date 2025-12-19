/*
  # Ajout des colonnes unit_price_ht et total_amount_ht à stock_updates

  1. Ajout de la colonne unit_price_ht : Prix auquel est vendu la collection (HT)
  2. Ajout de la colonne total_amount_ht : Nombre de cartes vendues x unit_price_ht
  
  Ces colonnes sont renseignées uniquement lors de la génération d'une facture (quand des cartes sont vendues).
  Elles restent null pour les ajustements de stock (modifications de stock sans vente).
*/

-- Ajouter les colonnes unit_price_ht et total_amount_ht
ALTER TABLE stock_updates
  ADD COLUMN IF NOT EXISTS unit_price_ht numeric(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS total_amount_ht numeric(10, 2) NULL;

-- Commentaires
COMMENT ON COLUMN stock_updates.unit_price_ht IS 'Prix unitaire HT auquel est vendu la collection (renseigné uniquement lors de la génération d''une facture)';
COMMENT ON COLUMN stock_updates.total_amount_ht IS 'Montant total HT : nombre de cartes vendues x unit_price_ht (renseigné uniquement lors de la génération d''une facture)';
