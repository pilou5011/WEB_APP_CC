-- Migration pour ajouter les champs d'adresse séparés
-- Ajouter les nouveaux champs d'adresse
ALTER TABLE clients ADD COLUMN street_address text;
ALTER TABLE clients ADD COLUMN postal_code text;
ALTER TABLE clients ADD COLUMN city text;

-- Mettre à jour les enregistrements existants si nécessaire
-- (Pour l'instant, on laisse les anciennes adresses dans le champ address)
-- Les nouveaux clients utiliseront les nouveaux champs

-- Ajouter des contraintes de validation
ALTER TABLE clients ADD CONSTRAINT check_postal_code 
  CHECK (postal_code IS NULL OR postal_code ~ '^[0-9]{5}$');

-- Rendre les nouveaux champs obligatoires pour les nouveaux enregistrements
-- (On ne peut pas ajouter NOT NULL directement car il y a des données existantes)
-- On gérera cela côté application

