/*
  # Ajout du support des sous-produits dans stock_updates
  
  Permet de conserver l'historique des sous-produits dans le relevé de stock.
  Les sous-produits ne sont pas inclus dans la facture et le bon de dépôt,
  mais sont conservés dans le relevé de stock pour l'historique.
*/

-- Ajouter sub_product_id à stock_updates
ALTER TABLE stock_updates
ADD COLUMN IF NOT EXISTS sub_product_id uuid REFERENCES sub_products(id) ON DELETE SET NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stock_updates_sub_product_id ON stock_updates(sub_product_id);

