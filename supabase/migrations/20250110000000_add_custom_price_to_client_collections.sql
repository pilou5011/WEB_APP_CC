/*
  # Ajout du prix personnalisé par client pour les collections

  1. Changements
    - Ajout de `custom_price` dans `client_collections`
      - Nullable : si NULL, utiliser le prix par défaut de la collection
      - Si non NULL, utiliser ce prix spécifique pour ce client
    
  2. Logique
    - Lors de l'association d'une collection à un client, on peut :
      * Laisser custom_price à NULL → utilise collections.price
      * Définir custom_price → utilise ce prix spécifique
    
  3. Notes
    - Le prix est stocké en numeric(10,2) pour la cohérence avec collections.price
    - La migration est idempotente (ADD COLUMN IF NOT EXISTS)
*/

-- Ajouter le champ custom_price à client_collections
ALTER TABLE client_collections
ADD COLUMN IF NOT EXISTS custom_price numeric(10,2) DEFAULT NULL;

-- Créer un index pour améliorer les performances des requêtes filtrant par prix personnalisé
CREATE INDEX IF NOT EXISTS idx_client_collections_custom_price ON client_collections(custom_price) WHERE custom_price IS NOT NULL;

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN client_collections.custom_price IS 'Prix personnalisé pour cette collection chez ce client. Si NULL, utiliser le prix par défaut de la collection.';



