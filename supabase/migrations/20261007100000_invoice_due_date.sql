-- Date d'échéance choisie à l'établissement de la facture.
-- NULL = facture antérieure : aucune échéance n'a été enregistrée.
-- Ne pas backfiller : Paiements et les PDF régénérés utilisent alors invoice_date.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS due_date date NULL;

COMMENT ON COLUMN invoices.due_date IS
  'Date d''échéance retenue à l''établissement. NULL pour les factures antérieures (secours = invoice_date, sans ajouter 30 jours).';
