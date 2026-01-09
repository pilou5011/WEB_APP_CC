-- ========================================
-- Requêtes SQL utiles pour l'administration Stripe
-- ========================================

-- ========================================
-- 1. ACTIVATION MANUELLE D'UNE ENTREPRISE
-- ========================================

-- Activer les frais d'entrée pour une entreprise (après paiement manuel)
UPDATE companies 
SET has_paid_entry_fee = true,
    updated_at = NOW()
WHERE id = 'uuid-de-lentreprise';

-- OU par nom d'entreprise
UPDATE companies 
SET has_paid_entry_fee = true,
    updated_at = NOW()
WHERE name = 'Nom de l''entreprise';

-- ========================================
-- 2. CONSULTATION DES ABONNEMENTS
-- ========================================

-- Voir tous les abonnements actifs
SELECT 
    c.name AS entreprise,
    s.plan_type,
    s.billing_cycle,
    s.extra_users_count,
    s.status,
    s.activated_at,
    c.subscription_status,
    c.has_paid_entry_fee
FROM subscriptions s
JOIN companies c ON s.company_id = c.id
WHERE s.status IN ('active', 'trial')
ORDER BY s.activated_at DESC;

-- Voir tous les abonnements par entreprise
SELECT 
    c.name AS entreprise,
    c.has_paid_entry_fee AS frais_payes,
    c.subscription_status AS statut_acces,
    c.stripe_customer_id,
    s.plan_type,
    s.billing_cycle,
    s.status AS statut_stripe,
    s.extra_users_count,
    s.stripe_subscription_id
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id
ORDER BY c.created_at DESC;

-- Voir les entreprises sans abonnement actif
SELECT 
    c.name AS entreprise,
    c.has_paid_entry_fee AS frais_payes,
    c.subscription_status AS statut_acces,
    c.created_at
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id
WHERE s.id IS NULL OR s.status NOT IN ('active', 'trial')
ORDER BY c.created_at DESC;

-- ========================================
-- 3. GESTION DES ACCÈS
-- ========================================

-- Bloquer manuellement l'accès d'une entreprise
UPDATE companies 
SET subscription_status = 'suspended',
    updated_at = NOW()
WHERE id = 'uuid-de-lentreprise';

-- Réactiver l'accès d'une entreprise
UPDATE companies 
SET subscription_status = 'active',
    updated_at = NOW()
WHERE id = 'uuid-de-lentreprise'
AND has_paid_entry_fee = true;

-- Vérifier les entreprises avec accès bloqué
SELECT 
    c.name AS entreprise,
    c.subscription_status,
    c.has_paid_entry_fee,
    s.status AS statut_abonnement,
    c.updated_at AS derniere_modif
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id
WHERE c.subscription_status != 'active'
ORDER BY c.updated_at DESC;

-- ========================================
-- 4. STATISTIQUES ET MONITORING
-- ========================================

-- Nombre d'entreprises par statut d'abonnement
SELECT 
    subscription_status,
    COUNT(*) AS nombre,
    COUNT(*) FILTER (WHERE has_paid_entry_fee = true) AS avec_frais_payes
FROM companies
GROUP BY subscription_status;

-- Répartition par type de plan
SELECT 
    plan_type,
    billing_cycle,
    COUNT(*) AS nombre_abonnes,
    SUM(extra_users_count) AS total_users_extra
FROM subscriptions
WHERE status IN ('active', 'trial')
GROUP BY plan_type, billing_cycle
ORDER BY plan_type, billing_cycle;

-- Entreprises créées récemment sans activation
SELECT 
    c.name AS entreprise,
    c.created_at,
    c.has_paid_entry_fee,
    c.stripe_customer_id,
    EXTRACT(day FROM (NOW() - c.created_at)) AS jours_depuis_creation
FROM companies c
WHERE c.has_paid_entry_fee = false
AND c.created_at > NOW() - INTERVAL '30 days'
ORDER BY c.created_at DESC;

-- ========================================
-- 5. GESTION DES UTILISATEURS
-- ========================================

-- Voir le nombre d'utilisateurs par entreprise
SELECT 
    c.name AS entreprise,
    c.subscription_status,
    s.plan_type,
    s.extra_users_count,
    COUNT(u.id) AS utilisateurs_actuels,
    CASE 
        WHEN s.plan_type = 'standard' THEN 1 + COALESCE(s.extra_users_count, 0)
        WHEN s.plan_type = 'premium' THEN 3 + COALESCE(s.extra_users_count, 0)
        ELSE 1
    END AS limite_utilisateurs
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id
LEFT JOIN user_profile u ON c.id = u.company_id
GROUP BY c.id, c.name, c.subscription_status, s.plan_type, s.extra_users_count
ORDER BY utilisateurs_actuels DESC;

-- Entreprises ayant dépassé leur limite d'utilisateurs
SELECT 
    c.name AS entreprise,
    s.plan_type,
    s.extra_users_count,
    COUNT(u.id) AS utilisateurs_actuels,
    CASE 
        WHEN s.plan_type = 'standard' THEN 1 + COALESCE(s.extra_users_count, 0)
        WHEN s.plan_type = 'premium' THEN 3 + COALESCE(s.extra_users_count, 0)
        ELSE 1
    END AS limite_utilisateurs
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id
LEFT JOIN user_profile u ON c.id = u.company_id
GROUP BY c.id, c.name, s.plan_type, s.extra_users_count
HAVING COUNT(u.id) > CASE 
    WHEN s.plan_type = 'standard' THEN 1 + COALESCE(s.extra_users_count, 0)
    WHEN s.plan_type = 'premium' THEN 3 + COALESCE(s.extra_users_count, 0)
    ELSE 1
END;

-- ========================================
-- 6. WEBHOOKS ET ÉVÉNEMENTS STRIPE
-- ========================================

-- Voir les derniers événements Stripe reçus
SELECT 
    event_type,
    processed_at,
    stripe_event_id
FROM stripe_events
ORDER BY processed_at DESC
LIMIT 50;

-- Compter les événements par type
SELECT 
    event_type,
    COUNT(*) AS nombre,
    MAX(processed_at) AS dernier_event
FROM stripe_events
GROUP BY event_type
ORDER BY nombre DESC;

-- Événements récents pour une entreprise spécifique
-- (en cherchant dans le payload JSON)
SELECT 
    se.event_type,
    se.processed_at,
    se.payload->>'id' AS stripe_event_id
FROM stripe_events se
WHERE se.payload::text LIKE '%uuid-de-lentreprise%'
ORDER BY se.processed_at DESC;

-- ========================================
-- 7. MAINTENANCE ET CLEANUP
-- ========================================

-- Trouver les customers Stripe orphelins (companies supprimées)
-- Note: Nécessite de vérifier manuellement dans Stripe
SELECT 
    c.id,
    c.name,
    c.stripe_customer_id,
    c.deleted_at
FROM companies c
WHERE c.stripe_customer_id IS NOT NULL
AND c.deleted_at IS NOT NULL;

-- Nettoyer les anciens événements Stripe (> 90 jours)
-- ⚠️ À utiliser avec précaution
DELETE FROM stripe_events
WHERE processed_at < NOW() - INTERVAL '90 days';

-- ========================================
-- 8. FONCTION UTILITAIRE
-- ========================================

-- Vérifier si une entreprise a un accès valide
SELECT check_company_access('uuid-de-lentreprise');
-- Retourne: true = accès autorisé, false = accès bloqué

-- ========================================
-- 9. REQUÊTES DE DEBUG
-- ========================================

-- Voir toutes les infos d'une entreprise
SELECT 
    c.id,
    c.name,
    c.stripe_customer_id,
    c.has_paid_entry_fee,
    c.subscription_status,
    c.created_at,
    s.id AS subscription_id,
    s.stripe_subscription_id,
    s.plan_type,
    s.billing_cycle,
    s.extra_users_count,
    s.status AS stripe_status,
    s.activated_at,
    COUNT(u.id) AS nb_utilisateurs
FROM companies c
LEFT JOIN subscriptions s ON c.id = s.company_id
LEFT JOIN user_profile u ON c.id = u.company_id
WHERE c.name = 'Nom de l''entreprise'
-- OU
-- WHERE c.id = 'uuid-de-lentreprise'
GROUP BY c.id, s.id;

-- Voir les logs d'erreurs de webhooks (si vous avez des erreurs)
-- Cette requête ne marchera que si vous avez activé des logs
SELECT 
    event_type,
    processed_at,
    payload->>'error' AS erreur
FROM stripe_events
WHERE payload->>'error' IS NOT NULL
ORDER BY processed_at DESC;

-- ========================================
-- 10. RESET POUR TESTS (DÉVELOPPEMENT UNIQUEMENT)
-- ========================================

-- ⚠️⚠️⚠️ DANGER - Ne JAMAIS utiliser en production ⚠️⚠️⚠️

-- Réinitialiser l'état d'une entreprise pour retester
-- UPDATE companies 
-- SET 
--     has_paid_entry_fee = false,
--     subscription_status = 'pending_payment',
--     updated_at = NOW()
-- WHERE id = 'uuid-de-lentreprise';

-- DELETE FROM subscriptions WHERE company_id = 'uuid-de-lentreprise';

-- ⚠️⚠️⚠️ DANGER - Ne JAMAIS utiliser en production ⚠️⚠️⚠️

