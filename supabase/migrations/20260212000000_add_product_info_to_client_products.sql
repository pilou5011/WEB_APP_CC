/*
  # Ajout de product_info aux client_products

  1. Nouvelle colonne
    - product_info (text, nullable) : info produit pour la facture, renseignée à l'affiliation
*/

ALTER TABLE public.client_products
  ADD COLUMN IF NOT EXISTS product_info text;

COMMENT ON COLUMN public.client_products.product_info IS 'Information produit pour la facture (renseignée à l''affiliation du produit au client)';
