/*
  # Ajout du champ display_order aux sous-produits
  
  Ce champ permet de définir l'ordre d'affichage des sous-produits
  au niveau du produit parent. L'ordre est global (identique pour tous les clients).
  
  L'ordre est utilisé dans :
  - La page de modification de produit
  - Les pages de facturation (Facturer - dépôt)
  - Tous les documents PDF générés
*/

-- Ajouter le champ display_order à la table sub_products
ALTER TABLE sub_products 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0 NOT NULL;

-- Initialiser display_order pour les sous-produits existants
-- On utilise ROW_NUMBER() pour attribuer un ordre basé sur created_at
UPDATE sub_products sp
SET display_order = sub.rank
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at ASC, id ASC) as rank
  FROM sub_products
) sub
WHERE sp.id = sub.id;

-- Créer un index pour améliorer les performances des requêtes triées
CREATE INDEX IF NOT EXISTS idx_sub_products_display_order 
ON sub_products(product_id, display_order);

-- Commentaire
COMMENT ON COLUMN sub_products.display_order IS 'Ordre d''affichage des sous-produits au sein du produit parent. Ordre global (identique pour tous les clients).';


