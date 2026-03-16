/*
  # Migration de product_info depuis stock_updates vers client_products
  
  Cette migration remplit la colonne product_info de client_products
  à partir des données historiques de stock_updates.
  
  Pour chaque couple client_id + product_id, on récupère la valeur product_info
  de la dernière entrée dans stock_updates (triée par created_at DESC, puis id DESC).
  
  Contraintes:
  - Ne met à jour que les lignes où product_info IS NULL
  - Ne met à jour que si une valeur product_info existe dans stock_updates
  - Utilise la dernière valeur chronologique pour chaque couple client_id + product_id
*/

-- Étape 1 : Créer un index composite pour améliorer les performances de la requête
-- Cet index sera utile pour la jointure et le tri
CREATE INDEX IF NOT EXISTS idx_stock_updates_client_product_created 
ON stock_updates(client_id, product_id, created_at DESC, id DESC)
WHERE product_info IS NOT NULL AND product_info != '';

-- Étape 2 : Mettre à jour client_products avec product_info depuis stock_updates
-- Utilisation d'une CTE (Common Table Expression) pour améliorer les performances
-- et garantir qu'on récupère bien la dernière valeur par couple client_id + product_id
WITH latest_product_info AS (
  SELECT DISTINCT ON (client_id, product_id)
    client_id,
    product_id,
    product_info
  FROM stock_updates
  WHERE product_info IS NOT NULL
    AND product_info != ''
    AND product_id IS NOT NULL
  ORDER BY client_id, product_id, created_at DESC, id DESC
)
UPDATE client_products cp
SET product_info = lpi.product_info
FROM latest_product_info lpi
WHERE cp.client_id = lpi.client_id
  AND cp.product_id = lpi.product_id
  AND cp.product_info IS NULL;

-- Étape 3 : Vérification - Statistiques (peut être exécuté manuellement après la migration)
-- SELECT 
--   COUNT(*) as total_client_products,
--   COUNT(product_info) FILTER (WHERE product_info IS NOT NULL AND product_info != '') as with_product_info,
--   COUNT(*) FILTER (WHERE product_info IS NULL OR product_info = '') as without_product_info,
--   ROUND(100.0 * COUNT(product_info) FILTER (WHERE product_info IS NOT NULL AND product_info != '') / COUNT(*), 2) as percentage_with_info
-- FROM client_products;

-- Commentaire
COMMENT ON COLUMN client_products.product_info IS 'Information sur le produit pour ce client, migrée depuis stock_updates (dernière valeur historique)';

