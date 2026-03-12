/*
  # Ajout du prix d'achat HT aux produits

  1. Nouvelle colonne ajoutée à la table products
    - purchase_price_ht (numeric, nullable) : prix d'achat hors taxes du produit
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS purchase_price_ht numeric;

COMMENT ON COLUMN public.products.purchase_price_ht IS 'Prix d''achat hors taxes (HT) du produit';
