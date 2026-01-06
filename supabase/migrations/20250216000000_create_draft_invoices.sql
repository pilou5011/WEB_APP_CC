-- Create table for draft invoices
-- This allows users to save their work in progress and resume later

CREATE TABLE IF NOT EXISTS draft_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  draft_data jsonb NOT NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE draft_invoices ENABLE ROW LEVEL SECURITY;

-- Policies for public access (matching existing pattern)
CREATE POLICY "Allow public read access to draft_invoices"
  ON draft_invoices FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to draft_invoices"
  ON draft_invoices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to draft_invoices"
  ON draft_invoices FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to draft_invoices"
  ON draft_invoices FOR DELETE
  USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_draft_invoices_client_id ON draft_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_draft_invoices_company_id ON draft_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_draft_invoices_deleted_at ON draft_invoices(deleted_at) WHERE deleted_at IS NULL;

-- Add comments
COMMENT ON TABLE draft_invoices IS 'Stores draft invoice data for clients to prevent data loss';
COMMENT ON COLUMN draft_invoices.draft_data IS 'JSONB containing rows (InvoiceRow[]) and discountPercentage';

