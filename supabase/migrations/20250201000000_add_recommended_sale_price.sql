/*
  # Ajout du prix de vente conseillé (TTC) aux collections
  
  1. Changements
    - Ajout de `recommended_sale_price` dans `collections`
      - Nullable : prix de vente conseillé TTC par défaut pour la collection
      - numeric(10,2) pour permettre les décimales
    - Ajout de `custom_recommended_sale_price` dans `client_collections`
      - Nullable : si NULL, utiliser le prix par défaut de la collection (recommended_sale_price)
      - Si non NULL, utiliser ce prix spécifique pour ce client
    2. Logique
    - Lors de l'association d'une collection à un client, on peut :
      * Laisser custom_recommended_sale_price à NULL → utilise collections.recommended_sale_price
      * Définir custom_recommended_sale_price → utilise ce prix spécifique
    3. Notes
    - Le prix est stocké en numeric(10,2) pour la cohérence avec les autres champs de prix
    - La migration est idempotente (ADD COLUMN IF NOT EXISTS)
*/

-- Ajouter le champ recommended_sale_price à collections
ALTER TABLE collections
ADD COLUMN IF NOT EXISTS recommended_sale_price numeric(10,2) DEFAULT NULL;

-- Ajouter le champ custom_recommended_sale_price à client_collections
ALTER TABLE client_collections
ADD COLUMN IF NOT EXISTS custom_recommended_sale_price numeric(10,2) DEFAULT NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_collections_recommended_sale_price ON collections(recommended_sale_price) WHERE recommended_sale_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_collections_custom_recommended_sale_price ON client_collections(custom_recommended_sale_price) WHERE custom_recommended_sale_price IS NOT NULL;

-- Ajouter des commentaires pour documenter les champs
COMMENT ON COLUMN collections.recommended_sale_price IS 'Prix de vente conseillé TTC par défaut pour cette collection';
COMMENT ON COLUMN client_collections.custom_recommended_sale_price IS 'Prix de vente conseillé TTC personnalisé pour cette collection chez ce client. Si NULL, utiliser le prix par défaut de la collection.';

