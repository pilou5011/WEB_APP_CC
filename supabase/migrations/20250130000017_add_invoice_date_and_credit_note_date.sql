/*
  # Ajout des dates comptables pour les factures et avoirs
  
  Ce changement permet de dissocier :
  - created_at : date technique de création (jamais modifiée)
  - invoice_date / credit_note_date : date comptable (modifiable par l'utilisateur)
  
  La date comptable est utilisée pour l'affichage dans les documents PDF et l'interface.
*/

-- Ajouter invoice_date à la table invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE NOT NULL;

-- Initialiser invoice_date pour les factures existantes avec leur created_at
UPDATE invoices 
SET invoice_date = DATE(created_at)
WHERE invoice_date IS NULL OR invoice_date = CURRENT_DATE;

-- Ajouter credit_note_date à la table credit_notes
ALTER TABLE credit_notes 
ADD COLUMN IF NOT EXISTS credit_note_date DATE DEFAULT CURRENT_DATE NOT NULL;

-- Initialiser credit_note_date pour les avoirs existants avec leur created_at
UPDATE credit_notes 
SET credit_note_date = DATE(created_at)
WHERE credit_note_date IS NULL OR credit_note_date = CURRENT_DATE;

-- Créer des index pour améliorer les performances des requêtes par date
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_credit_notes_credit_note_date ON credit_notes(credit_note_date);

-- Commentaires
COMMENT ON COLUMN invoices.invoice_date IS 'Date comptable de la facture, modifiable par l''utilisateur. Utilisée pour l''affichage dans les documents.';
COMMENT ON COLUMN credit_notes.credit_note_date IS 'Date comptable de l''avoir, modifiable par l''utilisateur. Utilisée pour l''affichage dans les documents.';


