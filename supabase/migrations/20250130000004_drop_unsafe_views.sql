/*
  # Suppression des vues non sécurisées par company_id

  Les vues *_active ne filtrent que par deleted_at IS NULL et exposent
  des données cross-company. Elles sont remplacées par l'utilisation directe
  des tables avec RLS activé, qui filtrent automatiquement par company_id.

  Cette migration supprime toutes les vues non sécurisées.
*/

-- Supprimer toutes les vues *_active
DROP VIEW IF EXISTS clients_active;
DROP VIEW IF EXISTS client_collections_active;
DROP VIEW IF EXISTS client_sub_products_active;
DROP VIEW IF EXISTS establishment_types_active;
DROP VIEW IF EXISTS payment_methods_active;
DROP VIEW IF EXISTS collection_categories_active;
DROP VIEW IF EXISTS collection_subcategories_active;
DROP VIEW IF EXISTS collections_active;
DROP VIEW IF EXISTS sub_products_active;
DROP VIEW IF EXISTS draft_stock_updates_active;

-- Commentaire pour expliquer pourquoi les vues ont été supprimées
COMMENT ON TABLE clients IS 'Utiliser directement la table avec RLS activé. Les vues *_active ont été supprimées car elles exposaient des données cross-company.';
COMMENT ON TABLE client_collections IS 'Utiliser directement la table avec RLS activé. Les vues *_active ont été supprimées car elles exposaient des données cross-company.';
COMMENT ON TABLE client_sub_products IS 'Utiliser directement la table avec RLS activé. Les vues *_active ont été supprimées car elles exposaient des données cross-company.';
COMMENT ON TABLE establishment_types IS 'Utiliser directement la table avec RLS activé. Les vues *_active ont été supprimées car elles exposaient des données cross-company.';
COMMENT ON TABLE payment_methods IS 'Utiliser directement la table avec RLS activé. Les vues *_active ont été supprimées car elles exposaient des données cross-company.';
COMMENT ON TABLE collection_categories IS 'Utiliser directement la table avec RLS activé. Les vues *_active ont été supprimées car elles exposaient des données cross-company.';
COMMENT ON TABLE collection_subcategories IS 'Utiliser directement la table avec RLS activé. Les vues *_active ont été supprimées car elles exposaient des données cross-company.';
COMMENT ON TABLE collections IS 'Utiliser directement la table avec RLS activé. Les vues *_active ont été supprimées car elles exposaient des données cross-company.';
COMMENT ON TABLE sub_products IS 'Utiliser directement la table avec RLS activé. Les vues *_active ont été supprimées car elles exposaient des données cross-company.';
COMMENT ON TABLE draft_stock_updates IS 'Utiliser directement la table avec RLS activé. Les vues *_active ont été supprimées car elles exposaient des données cross-company.';

