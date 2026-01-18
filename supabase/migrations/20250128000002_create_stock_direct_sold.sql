/*
  # Création de la table stock_direct_sold

  Cette table permet de stocker les ventes directes (facturation sans bon de dépôt ni relevé de stock).
  Elle est utilisée pour l'onglet "Facturer" qui permet de générer une facture directe.
*/

CREATE TABLE IF NOT EXISTS stock_direct_sold (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  sub_product_id uuid REFERENCES sub_products(id) ON DELETE SET NULL,
  stock_sold integer NOT NULL DEFAULT 0,
  unit_price_ht numeric(10, 2) NOT NULL,
  total_amount_ht numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stock_direct_sold_client_id ON stock_direct_sold(client_id);
CREATE INDEX IF NOT EXISTS idx_stock_direct_sold_invoice_id ON stock_direct_sold(invoice_id);
CREATE INDEX IF NOT EXISTS idx_stock_direct_sold_collection_id ON stock_direct_sold(collection_id);
CREATE INDEX IF NOT EXISTS idx_stock_direct_sold_sub_product_id ON stock_direct_sold(sub_product_id);

-- RLS
ALTER TABLE stock_direct_sold ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to stock_direct_sold"
  ON stock_direct_sold FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to stock_direct_sold"
  ON stock_direct_sold FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to stock_direct_sold"
  ON stock_direct_sold FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to stock_direct_sold"
  ON stock_direct_sold FOR DELETE
  USING (true);

COMMENT ON TABLE stock_direct_sold IS 'Stocke les ventes directes (facturation sans bon de dépôt ni relevé de stock)';
COMMENT ON COLUMN stock_direct_sold.stock_sold IS 'Quantité vendue';
COMMENT ON COLUMN stock_direct_sold.unit_price_ht IS 'Prix unitaire HT';
COMMENT ON COLUMN stock_direct_sold.total_amount_ht IS 'Montant total HT (stock_sold × unit_price_ht)';

