/*
  # Texte libre documents PDF (factures, avoirs, bons de livraison)

  Champ nullable free_text pour afficher une note sous l'encart client
  des PDF (facture compte ferme, facture dépôt, bon de dépôt, avoir, BL).

  - invoices.free_text : partagé facture dépôt + bon de dépôt (même opération)
  - credit_notes.free_text
  - delivery_notes.free_text

  Les documents existants restent valides (NULL → zone vide dans le PDF).
*/

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS free_text text NULL;

ALTER TABLE credit_notes
  ADD COLUMN IF NOT EXISTS free_text text NULL;

ALTER TABLE delivery_notes
  ADD COLUMN IF NOT EXISTS free_text text NULL;

COMMENT ON COLUMN invoices.free_text IS
  'Texte libre PDF (max 3 lignes) — facture compte ferme / dépôt et bon de dépôt associé';

COMMENT ON COLUMN credit_notes.free_text IS
  'Texte libre PDF (max 3 lignes) affiché sous l''encart client de l''avoir';

COMMENT ON COLUMN delivery_notes.free_text IS
  'Texte libre PDF (max 3 lignes) affiché sous l''encart client du bon de livraison';
