/*
  # Migration: Renommage de "cards" vers "stock"
  
  Cette migration renomme les colonnes liées aux "cartes" pour utiliser "stock" à la place.
  
  Colonnes renommées:
  - invoices.total_cards_sold → invoices.total_stock_sold
  - stock_updates.cards_sold → stock_updates.stock_sold
  - stock_updates.cards_added → stock_updates.stock_added
  
  IMPORTANT: Cette migration doit être exécutée en une seule transaction pour garantir la cohérence.
*/

BEGIN;

-- ============================================
-- 1. RENOMMER LES COLONNES DANS invoices
-- ============================================

ALTER TABLE IF EXISTS invoices 
  RENAME COLUMN total_cards_sold TO total_stock_sold;

-- ============================================
-- 2. RENOMMER LES COLONNES DANS stock_updates
-- ============================================

ALTER TABLE IF EXISTS stock_updates 
  RENAME COLUMN cards_sold TO stock_sold;

ALTER TABLE IF EXISTS stock_updates 
  RENAME COLUMN cards_added TO stock_added;

-- ============================================
-- 3. METTRE À JOUR LES COMMENTAIRES (optionnel)
-- ============================================

COMMENT ON COLUMN invoices.total_stock_sold IS 'Total du stock vendu pour cette facture';
COMMENT ON COLUMN stock_updates.stock_sold IS 'Quantité de stock vendue lors de cette mise à jour';
COMMENT ON COLUMN stock_updates.stock_added IS 'Quantité de stock ajoutée lors de cette mise à jour';

COMMIT;

