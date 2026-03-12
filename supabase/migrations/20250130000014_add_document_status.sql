/*
  # Ajout du statut de document pour les factures et avoirs
  
  Cette migration ajoute un champ `status` aux tables `invoices` et `credit_notes`
  pour gérer le cycle de vie des documents et permettre le rollback en cas d'échec.
  
  Statuts possibles:
  - 'processing': Document en cours de génération
  - 'completed': Document généré avec succès (PDF créé)
  - 'failed': Échec de la génération du PDF (document invalide)
  
  Tous les documents existants sont automatiquement définis comme 'completed'
  pour garantir la rétrocompatibilité.
*/

-- Ajouter le champ status à la table invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' NOT NULL;

-- Ajouter le champ status à la table credit_notes
ALTER TABLE credit_notes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' NOT NULL;

-- Définir tous les documents existants comme 'completed'
UPDATE invoices SET status = 'completed' WHERE status IS NULL OR status = '';
UPDATE credit_notes SET status = 'completed' WHERE status IS NULL OR status = '';

-- Ajouter une contrainte CHECK pour valider les valeurs de status
ALTER TABLE invoices 
ADD CONSTRAINT check_invoice_status 
CHECK (status IN ('processing', 'completed', 'failed'));

ALTER TABLE credit_notes 
ADD CONSTRAINT check_credit_note_status 
CHECK (status IN ('processing', 'completed', 'failed'));

-- Créer des index pour améliorer les performances des requêtes filtrées par status
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status) WHERE status = 'completed';

-- Commentaires
COMMENT ON COLUMN invoices.status IS 'Statut du document: processing (en cours), completed (généré avec succès), failed (échec de génération)';
COMMENT ON COLUMN credit_notes.status IS 'Statut du document: processing (en cours), completed (généré avec succès), failed (échec de génération)';

