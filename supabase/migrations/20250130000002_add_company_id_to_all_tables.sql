/*
  # Ajout de company_id à toutes les tables métier pour l'isolation des données

  Tables concernées :
  - clients
  - invoices
  - stock_updates
  - collections
  - client_collections
  - client_sub_products
  - sub_products
  - user_profile (devient un profil par entreprise)
  - credit_notes
  - stock_direct_sold
  - establishment_types
  - payment_methods
  - collection_categories
  - collection_subcategories
  - draft_stock_updates
  - invoice_adjustments
*/

-- Clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);

-- Invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);

-- Stock updates
ALTER TABLE stock_updates
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_stock_updates_company_id ON stock_updates(company_id);

-- Collections
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_collections_company_id ON collections(company_id);

-- Client collections
ALTER TABLE client_collections
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_collections_company_id ON client_collections(company_id);

-- Client sub products
ALTER TABLE client_sub_products
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_sub_products_company_id ON client_sub_products(company_id);

-- Sub products
ALTER TABLE sub_products
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sub_products_company_id ON sub_products(company_id);

-- User profile (devient un profil par entreprise)
ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_profile_company_id ON user_profile(company_id);

-- Credit notes
ALTER TABLE credit_notes
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_credit_notes_company_id ON credit_notes(company_id);

-- Stock direct sold
ALTER TABLE stock_direct_sold
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_stock_direct_sold_company_id ON stock_direct_sold(company_id);

-- Establishment types
ALTER TABLE establishment_types
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_establishment_types_company_id ON establishment_types(company_id);

-- Payment methods
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON payment_methods(company_id);

-- Collection categories
ALTER TABLE collection_categories
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_collection_categories_company_id ON collection_categories(company_id);

-- Collection subcategories
ALTER TABLE collection_subcategories
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_collection_subcategories_company_id ON collection_subcategories(company_id);

-- Draft stock updates
ALTER TABLE draft_stock_updates
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_draft_stock_updates_company_id ON draft_stock_updates(company_id);

-- Invoice adjustments
ALTER TABLE invoice_adjustments
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoice_adjustments_company_id ON invoice_adjustments(company_id);

