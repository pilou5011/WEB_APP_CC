/*
  # Ajout des coordonnées GPS aux clients
  
  1. Changements
    - Ajout de `latitude` dans `clients`
      - Type: DECIMAL(10, 8) pour la précision GPS
      - Nullable : peut être NULL si l'adresse n'a pas été géocodée
    - Ajout de `longitude` dans `clients`
      - Type: DECIMAL(11, 8) pour la précision GPS
      - Nullable : peut être NULL si l'adresse n'a pas été géocodée
    
  2. Logique
    - Les coordonnées GPS permettront :
      * Validation de l'existence de l'adresse
      * Calcul de distances et temps de trajet entre clients
      * Optimisation des tournées
    
  3. Notes
    - Les coordonnées seront obtenues via l'API Adresse Data Gouv
    - Index créé pour optimiser les recherches géographiques
*/

-- Ajouter les colonnes latitude et longitude
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) DEFAULT NULL;

-- Créer un index pour les recherches géographiques
CREATE INDEX IF NOT EXISTS idx_clients_coordinates 
ON clients(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN clients.latitude IS 'Latitude GPS de l''adresse du client (pour validation et calcul de distance)';
COMMENT ON COLUMN clients.longitude IS 'Longitude GPS de l''adresse du client (pour validation et calcul de distance)';

-- Ajouter les mêmes colonnes à user_profile pour l'adresse de l'entreprise
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) DEFAULT NULL;

-- Créer un index pour user_profile également
CREATE INDEX IF NOT EXISTS idx_user_profile_coordinates 
ON user_profile(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Commentaires pour user_profile
COMMENT ON COLUMN user_profile.latitude IS 'Latitude GPS de l''adresse de l''entreprise (pour validation)';
COMMENT ON COLUMN user_profile.longitude IS 'Longitude GPS de l''adresse de l''entreprise (pour validation)';

