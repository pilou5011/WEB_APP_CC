-- Migration: Add email sent tracking to invoices and credit_notes
-- This allows tracking which documents have been sent by email

-- Add columns to track email sending for invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_email_sent_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS deposit_slip_email_sent_at timestamptz NULL;

-- Add column to track email sending for credit notes
ALTER TABLE credit_notes
ADD COLUMN IF NOT EXISTS email_sent_at timestamptz NULL;

-- Add comments for documentation
COMMENT ON COLUMN invoices.invoice_email_sent_at IS 'Date and time when the invoice was sent by email. NULL if not sent.';
COMMENT ON COLUMN invoices.deposit_slip_email_sent_at IS 'Date and time when the deposit slip was sent by email. NULL if not sent.';
COMMENT ON COLUMN credit_notes.email_sent_at IS 'Date and time when the credit note was sent by email. NULL if not sent.';

