/*
  # Création de la table tour_names et modification de clients
  
  1. Suppression de l'ancienne colonne tour_name (TEXT)
  2. Création de la table tour_names avec company_id et soft delete
  3. Ajout de tour_name_id dans clients (référence vers tour_names)
  4. Configuration RLS et contraintes UNIQUE
*/

-- Supprimer l'ancienne colonne tour_name si elle existe
ALTER TABLE clients
DROP COLUMN IF EXISTS tour_name;

-- Créer la table tour_names
CREATE TABLE IF NOT EXISTS tour_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE tour_names ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour tour_names (basées sur company_id)
CREATE POLICY "Users can view tour_names from their company"
  ON tour_names FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert tour_names for their company"
  ON tour_names FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update tour_names from their company"
  ON tour_names FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete tour_names from their company"
  ON tour_names FOR DELETE
  USING (company_id = public.user_company_id());

-- Ajouter la colonne tour_name_id à la table clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS tour_name_id uuid REFERENCES tour_names(id) ON DELETE SET NULL;

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_tour_names_company_id ON tour_names(company_id);
CREATE INDEX IF NOT EXISTS idx_tour_names_name ON tour_names(name);
CREATE INDEX IF NOT EXISTS idx_clients_tour_name_id ON clients(tour_name_id);

-- Contrainte UNIQUE partielle sur (company_id, name) pour les enregistrements non supprimés
CREATE UNIQUE INDEX IF NOT EXISTS tour_names_company_id_name_unique_not_deleted
  ON tour_names(company_id, name)
  WHERE deleted_at IS NULL;

-- Commentaires
COMMENT ON TABLE tour_names IS 'Noms de tournées associés aux clients';
COMMENT ON COLUMN clients.tour_name_id IS 'Nom de la tournée associée au client';

