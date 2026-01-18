-- Create table for draft credit notes
-- This allows users to save their work in progress and resume later

CREATE TABLE IF NOT EXISTS draft_credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  draft_data jsonb NOT NULL,
  deleted_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE draft_credit_notes ENABLE ROW LEVEL SECURITY;

-- Policies for public access (matching existing pattern)
CREATE POLICY "Allow public read access to draft_credit_notes"
  ON draft_credit_notes FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to draft_credit_notes"
  ON draft_credit_notes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to draft_credit_notes"
  ON draft_credit_notes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to draft_credit_notes"
  ON draft_credit_notes FOR DELETE
  USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_draft_credit_notes_client_id ON draft_credit_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_draft_credit_notes_company_id ON draft_credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_draft_credit_notes_deleted_at ON draft_credit_notes(deleted_at) WHERE deleted_at IS NULL;

-- Add comments
COMMENT ON TABLE draft_credit_notes IS 'Stores draft credit note data for clients to prevent data loss';
COMMENT ON COLUMN draft_credit_notes.draft_data IS 'JSONB containing invoice_id, operation_name, quantity, and unit_price';

