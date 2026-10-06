-- Paiements Gold : statut de règlement des factures + historique des relances.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL;

COMMENT ON COLUMN invoices.paid_at IS
  'Horodatage du pointage manuel comme payée (NULL = impayée). Ne modifie pas le PDF ni les montants.';

CREATE INDEX IF NOT EXISTS idx_invoices_company_paid_at
  ON invoices (company_id, paid_at);

CREATE TABLE IF NOT EXISTS invoice_payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'failed')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE invoice_payment_reminders IS
  'Historique des relances de paiement envoyées pour une facture';
COMMENT ON COLUMN invoice_payment_reminders.status IS
  'sent = accepté par le service d''envoi ; failed = échec (non compté dans le total)';

CREATE INDEX IF NOT EXISTS idx_invoice_payment_reminders_invoice_id
  ON invoice_payment_reminders (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_reminders_company_id
  ON invoice_payment_reminders (company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_reminders_invoice_sent
  ON invoice_payment_reminders (invoice_id, sent_at DESC)
  WHERE status = 'sent';

ALTER TABLE invoice_payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Users can view invoice_payment_reminders from their company"
  ON invoice_payment_reminders;
DROP POLICY IF EXISTS "Users can insert invoice_payment_reminders for their company"
  ON invoice_payment_reminders;
DROP POLICY IF EXISTS "Users can update invoice_payment_reminders from their company"
  ON invoice_payment_reminders;
DROP POLICY IF EXISTS "Users can delete invoice_payment_reminders from their company"
  ON invoice_payment_reminders;

CREATE POLICY "Users can view invoice_payment_reminders from their company"
  ON invoice_payment_reminders FOR SELECT
  USING (company_id = public.user_company_id());

CREATE POLICY "Users can insert invoice_payment_reminders for their company"
  ON invoice_payment_reminders FOR INSERT
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can update invoice_payment_reminders from their company"
  ON invoice_payment_reminders FOR UPDATE
  USING (company_id = public.user_company_id())
  WITH CHECK (company_id = public.user_company_id());

CREATE POLICY "Users can delete invoice_payment_reminders from their company"
  ON invoice_payment_reminders FOR DELETE
  USING (company_id = public.user_company_id());
