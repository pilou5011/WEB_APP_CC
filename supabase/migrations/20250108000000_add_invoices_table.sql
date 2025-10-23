-- Add invoices table to track global invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  total_cards_sold integer NOT NULL DEFAULT 0,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add invoice_id to stock_updates to link updates to invoices
ALTER TABLE stock_updates 
ADD COLUMN invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policies for invoices
CREATE POLICY "Allow public read access to invoices"
  ON invoices FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to invoices"
  ON invoices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to invoices"
  ON invoices FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to invoices"
  ON invoices FOR DELETE
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_updates_invoice_id ON stock_updates(invoice_id);

