-- Create table to store manual invoice adjustments (e.g., reprise de stock)

CREATE TABLE IF NOT EXISTS invoice_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  operation_name text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE invoice_adjustments IS 'Lignes d''ajustement de facture (reprise de stock, etc.)';
COMMENT ON COLUMN invoice_adjustments.operation_name IS 'Intitulé de l''opération affiché dans la colonne Collection';
COMMENT ON COLUMN invoice_adjustments.amount IS 'Montant (peut être négatif), ajouté au TOTAL H.T.';

-- RLS and basic permissive policies (align with other tables)
ALTER TABLE invoice_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to invoice_adjustments"
  ON invoice_adjustments FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to invoice_adjustments"
  ON invoice_adjustments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to invoice_adjustments"
  ON invoice_adjustments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to invoice_adjustments"
  ON invoice_adjustments FOR DELETE
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_adjustments_invoice_id ON invoice_adjustments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_adjustments_client_id ON invoice_adjustments(client_id);


