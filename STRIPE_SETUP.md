# Configuration Stripe - Documentation

## 📋 Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env.local` :

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration - TEST (Environnement de développement)
# ⚠️ Utiliser uniquement les clés de test en développement
STRIPE_SECRET_KEY_TEST=sk_test_your_test_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_your_test_publishable_key
STRIPE_WEBHOOK_SECRET_TEST=whsec_your_test_webhook_secret

# Stripe Configuration - PRODUCTION (Environnement de production)
# ⚠️ NE JAMAIS commiter ces clés réelles
STRIPE_SECRET_KEY_LIVE=sk_live_your_live_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET_LIVE=whsec_your_live_webhook_secret

# Environment Mode
# Utiliser "test" pour le développement et "production" pour la production
STRIPE_MODE=test

# Application URL (pour les webhooks Stripe)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Product IDs (à configurer après création des produits dans Stripe)
STRIPE_PRICE_STANDARD_MONTHLY_TEST=price_xxx
STRIPE_PRICE_STANDARD_YEARLY_TEST=price_xxx
STRIPE_PRICE_PREMIUM_MONTHLY_TEST=price_xxx
STRIPE_PRICE_PREMIUM_YEARLY_TEST=price_xxx
STRIPE_PRICE_EXTRA_USER_MONTHLY_TEST=price_xxx
STRIPE_PRICE_EXTRA_USER_YEARLY_TEST=price_xxx

STRIPE_PRICE_STANDARD_MONTHLY_LIVE=price_xxx
STRIPE_PRICE_STANDARD_YEARLY_LIVE=price_xxx
STRIPE_PRICE_PREMIUM_MONTHLY_LIVE=price_xxx
STRIPE_PRICE_PREMIUM_YEARLY_LIVE=price_xxx
STRIPE_PRICE_EXTRA_USER_MONTHLY_LIVE=price_xxx
STRIPE_PRICE_EXTRA_USER_YEARLY_LIVE=price_xxx
```

## 🏗️ Configuration Stripe Dashboard

### 1. Créer les produits dans Stripe (Mode Test)

#### Produit: Abonnement Standard
- Nom: "Abonnement Standard"
- Description: "Accès standard à l'application"
- Prix mensuels et annuels à créer

#### Produit: Abonnement Premium
- Nom: "Abonnement Premium"
- Description: "Accès premium avec fonctionnalités avancées"
- Prix mensuels et annuels à créer

#### Produit: Utilisateur supplémentaire
- Nom: "Utilisateur supplémentaire"
- Description: "Ajout d'un utilisateur à votre abonnement"
- Facturation par quantité
- Prix mensuels et annuels à créer

### 2. Configurer les Webhooks

URL du webhook (local - utiliser Stripe CLI):
```
http://localhost:3000/api/stripe/webhook
```

URL du webhook (production):
```
https://votre-domaine.com/api/stripe/webhook
```

Événements à écouter:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

### 3. Test avec Stripe CLI

Installer Stripe CLI:
```bash
npm install -g stripe
stripe login
```

Rediriger les webhooks en local:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Tester les webhooks:
```bash
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

## 🔐 Sécurité

### ❌ Ne JAMAIS faire:
- Exposer les clés secrètes côté client
- Commiter les clés dans Git
- Utiliser les clés de production en développement
- Faire confiance uniquement au frontend pour la validation

### ✅ Toujours faire:
- Vérifier la signature des webhooks
- Valider les données côté serveur
- Utiliser les clés de test en développement
- Synchroniser l'état Stripe avec la base de données

## 🧪 Cartes de test Stripe

Cartes de test à utiliser en mode test:

| Type | Numéro | CVC | Date |
|------|--------|-----|------|
| Succès | 4242 4242 4242 4242 | Tout | Future |
| Échec | 4000 0000 0000 0002 | Tout | Future |
| 3D Secure | 4000 0027 6000 3184 | Tout | Future |

## 📊 Flux d'activation

### Activation initiale (one-shot)
1. L'entreprise est créée → `has_paid_entry_fee = false`
2. Paiement manuel (virement) reçu
3. Admin active manuellement → `has_paid_entry_fee = true`
4. L'entreprise peut alors souscrire un abonnement

### Cycle de vie d'un abonnement
1. **Création**: Customer Stripe créé, abonnement créé
2. **Actif**: `subscription_status = 'active'`, accès total
3. **Échec de paiement**: `subscription_status = 'suspended'`, accès bloqué
4. **Paiement réussi**: `subscription_status = 'active'`, accès rétabli
5. **Annulation**: `subscription_status = 'suspended'`, accès bloqué

## 🚀 Installation des dépendances

```bash
npm install stripe
```

## 📝 Types TypeScript

Les types sont définis dans `types/stripe.ts` pour une meilleure expérience de développement.

