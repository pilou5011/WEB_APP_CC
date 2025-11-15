/*
  # Ajout du champ display_order pour l'ordre d'affichage des collections

  1. Modification de la table client_collections
    - Ajout d'une colonne `display_order` (integer, ordre d'affichage)
    - Valeur par défaut basée sur created_at pour les collections existantes
    - Index pour améliorer les performances de tri

  2. Notes
    - Les nouvelles collections auront un display_order automatique (max + 1)
    - Permet de réorganiser l'affichage des collections par client
*/

-- Ajouter la colonne display_order
ALTER TABLE client_collections
  ADD COLUMN IF NOT EXISTS display_order integer;

-- Initialiser display_order pour les collections existantes basé sur created_at
-- Utiliser ROW_NUMBER dans une sous-requête pour créer un ordre séquentiel par client
UPDATE client_collections
SET display_order = sub.row_num
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at ASC) as row_num
  FROM client_collections
) AS sub
WHERE client_collections.id = sub.id;

-- Rendre la colonne NOT NULL avec une valeur par défaut
ALTER TABLE client_collections
  ALTER COLUMN display_order SET NOT NULL,
  ALTER COLUMN display_order SET DEFAULT 0;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_client_collections_display_order ON client_collections(client_id, display_order);

-- Ajouter un commentaire
COMMENT ON COLUMN client_collections.display_order IS 'Ordre d''affichage des collections pour ce client';

