-- Create table for draft stock updates
-- This allows users to save their work in progress and resume later

CREATE TABLE IF NOT EXISTS draft_stock_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  draft_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE draft_stock_updates ENABLE ROW LEVEL SECURITY;

-- Policies for public access (matching existing pattern)
CREATE POLICY "Allow public read access to draft_stock_updates"
  ON draft_stock_updates FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to draft_stock_updates"
  ON draft_stock_updates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to draft_stock_updates"
  ON draft_stock_updates FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to draft_stock_updates"
  ON draft_stock_updates FOR DELETE
  USING (true);

-- Create index for faster lookups by client_id
CREATE INDEX IF NOT EXISTS idx_draft_stock_updates_client_id ON draft_stock_updates(client_id);

-- Add comment
COMMENT ON TABLE draft_stock_updates IS 'Stores draft stock update data for clients to prevent data loss';
COMMENT ON COLUMN draft_stock_updates.draft_data IS 'JSONB containing perCollectionForm and pendingAdjustments';


