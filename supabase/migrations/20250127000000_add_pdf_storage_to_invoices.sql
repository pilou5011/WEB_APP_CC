-- Migration: Add PDF storage columns to invoices table
-- This allows storing the paths to generated PDFs (invoice, stock report, deposit slip)
-- in Supabase Storage, ensuring documents are frozen in time

-- Add columns to store PDF file paths in Supabase Storage
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_pdf_path TEXT,
ADD COLUMN IF NOT EXISTS stock_report_pdf_path TEXT,
ADD COLUMN IF NOT EXISTS deposit_slip_pdf_path TEXT;

-- Add comments for documentation
COMMENT ON COLUMN invoices.invoice_pdf_path IS 'Path to the stored PDF file for the invoice in Supabase Storage';
COMMENT ON COLUMN invoices.stock_report_pdf_path IS 'Path to the stored PDF file for the stock report in Supabase Storage';
COMMENT ON COLUMN invoices.deposit_slip_pdf_path IS 'Path to the stored PDF file for the deposit slip in Supabase Storage';

