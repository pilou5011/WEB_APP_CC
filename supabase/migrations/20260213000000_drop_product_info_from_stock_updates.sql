/*
  # Suppression de product_info de stock_updates

  L'info produit est désormais stockée uniquement dans client_products.product_info.
  Cette colonne est redondante et supprimée.
*/

ALTER TABLE public.stock_updates
  DROP COLUMN IF EXISTS product_info;
