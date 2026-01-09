# 🚀 Installation de l'intégration Stripe

## ⚡ Installation rapide

Suivez ces étapes dans l'ordre pour activer l'intégration Stripe.

---

## 📦 Étape 1 : Installer les dépendances NPM

```bash
npm install stripe
```

---

## 🗄️ Étape 2 : Appliquer la migration de base de données

### Option A : Avec Supabase CLI (recommandé)

```bash
# Si vous utilisez Supabase en local
supabase migration up
```

### Option B : Via le Dashboard Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Ouvrez le fichier `supabase/migrations/20260208000000_add_stripe_integration.sql`
5. Copiez tout le contenu
6. Collez-le dans l'éditeur SQL
7. Cliquez sur **Run**
8. Vérifiez qu'il n'y a pas d'erreurs

---

## 🔑 Étape 3 : Configurer les clés Stripe

### 3.1 Obtenir vos clés Stripe

1. Connectez-vous à https://dashboard.stripe.com
2. Cliquez sur **Developers** en haut à droite
3. Allez dans **API keys**
4. En **mode Test** :
   - Copiez **Publishable key** (commence par `pk_test_`)
   - Cliquez sur **Reveal test key** et copiez **Secret key** (commence par `sk_test_`)

### 3.2 Créer le fichier .env.local

Créez un fichier `.env.local` à la racine du projet (à côté de `package.json`) :

```bash
# Supabase (si pas déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe - Mode TEST (développement)
STRIPE_SECRET_KEY_TEST=sk_test_votre_cle_secrete
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_votre_cle_publique
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxx

# Mode actuel
STRIPE_MODE=test

# Prix Stripe (à remplir après création des produits)
STRIPE_PRICE_STANDARD_MONTHLY_TEST=
STRIPE_PRICE_STANDARD_YEARLY_TEST=
STRIPE_PRICE_PREMIUM_MONTHLY_TEST=
STRIPE_PRICE_PREMIUM_YEARLY_TEST=
STRIPE_PRICE_EXTRA_USER_MONTHLY_TEST=
STRIPE_PRICE_EXTRA_USER_YEARLY_TEST=
```

**⚠️ Important** : Ne commitez JAMAIS ce fichier dans Git ! Il est déjà dans `.gitignore`.

---

## 🛍️ Étape 4 : Créer les produits dans Stripe

### 4.1 Créer les produits

1. Allez sur https://dashboard.stripe.com/test/products
2. Cliquez sur **+ Add product**

#### Produit 1 : Abonnement Standard

- **Name** : `Abonnement Standard`
- **Description** : `Accès standard à l'application de gestion de cartes de vœux`
- **Pricing model** : `Recurring`
- Cliquez sur **Add pricing**

**Prix 1 : Mensuel**
- **Price** : `29` (ou votre tarif)
- **Currency** : EUR
- **Billing period** : Monthly
- Cliquez sur **Add price**
- ✅ **COPIEZ LE PRICE ID** (commence par `price_`) → Mettez-le dans `STRIPE_PRICE_STANDARD_MONTHLY_TEST`

**Prix 2 : Annuel**
- Cliquez sur **Add another price**
- **Price** : `290` (ou votre tarif)
- **Currency** : EUR
- **Billing period** : Yearly
- Cliquez on **Add price**
- ✅ **COPIEZ LE PRICE ID** → Mettez-le dans `STRIPE_PRICE_STANDARD_YEARLY_TEST`

#### Produit 2 : Abonnement Premium

Répétez le processus :
- **Name** : `Abonnement Premium`
- **Description** : `Accès premium avec fonctionnalités avancées`
- **Prix mensuel** : ex. 49€ → Copiez le Price ID dans `STRIPE_PRICE_PREMIUM_MONTHLY_TEST`
- **Prix annuel** : ex. 490€ → Copiez le Price ID dans `STRIPE_PRICE_PREMIUM_YEARLY_TEST`

#### Produit 3 : Utilisateur supplémentaire

- **Name** : `Utilisateur supplémentaire`
- **Description** : `Ajout d'un utilisateur à votre abonnement`
- **Pricing model** : `Recurring`
- **Prix mensuel** : ex. 10€ → Copiez le Price ID dans `STRIPE_PRICE_EXTRA_USER_MONTHLY_TEST`
- **Prix annuel** : ex. 100€ → Copiez le Price ID dans `STRIPE_PRICE_EXTRA_USER_YEARLY_TEST`

---

## 🔔 Étape 5 : Configurer les webhooks Stripe

### 5.1 Installer Stripe CLI (pour le développement local)

```bash
# Windows (avec chocolatey)
choco install stripe

# Ou téléchargez depuis : https://github.com/stripe/stripe-cli/releases
```

### 5.2 Se connecter à Stripe

```bash
stripe login
```

### 5.3 Rediriger les webhooks en local

Dans un terminal séparé (à laisser ouvert) :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Cette commande va :
- ✅ Afficher un **webhook signing secret** (commence par `whsec_`)
- ✅ **COPIEZ-LE** et mettez-le dans `STRIPE_WEBHOOK_SECRET_TEST` dans `.env.local`
- ✅ Rediriger tous les webhooks Stripe vers votre app locale

### 5.4 Configurer les webhooks en production (plus tard)

1. Allez sur https://dashboard.stripe.com/webhooks
2. Cliquez sur **Add endpoint**
3. **Endpoint URL** : `https://votre-domaine.com/api/stripe/webhook`
4. Sélectionnez les événements :
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Cliquez sur **Add endpoint**
6. Copiez le **Signing secret** → Ce sera `STRIPE_WEBHOOK_SECRET_LIVE` en production

---

## 🧪 Étape 6 : Tester l'installation

### 6.1 Démarrer l'application

```bash
npm run dev
```

### 6.2 Créer un compte test

1. Allez sur http://localhost:3000/auth
2. Créez un nouveau compte
3. Vérifiez dans les logs que le customer Stripe est créé
4. Vous devriez être redirigé vers `/subscription`

### 6.3 Vérifier dans Stripe

1. Allez sur https://dashboard.stripe.com/test/customers
2. Vous devriez voir un nouveau customer avec le nom de votre entreprise

### 6.4 Tester les webhooks

Dans un nouveau terminal :

```bash
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

Vérifiez dans les logs de votre app que les webhooks sont reçus.

---

## ✅ Vérification finale

Vérifiez que tout fonctionne :

- [ ] `npm install stripe` a réussi
- [ ] La migration de base de données est appliquée
- [ ] Toutes les variables d'environnement sont configurées
- [ ] Les 3 produits Stripe sont créés avec leurs prix
- [ ] Les 6 Price IDs sont copiés dans `.env.local`
- [ ] Stripe CLI est connecté et écoute les webhooks
- [ ] Un compte test crée un customer Stripe
- [ ] La page `/subscription` s'affiche correctement

---

## 🎉 C'est terminé !

Votre intégration Stripe est maintenant opérationnelle en mode TEST.

### Prochaines étapes

1. **Tester le flux complet** :
   - Créer un compte
   - Activer manuellement `has_paid_entry_fee` (voir ci-dessous)
   - Souscrire un abonnement
   - Tester les paiements

2. **Activer une entreprise manuellement** (simuler le paiement des frais d'entrée) :

```sql
-- Dans Supabase SQL Editor
UPDATE companies 
SET has_paid_entry_fee = true 
WHERE name = 'Nom de votre entreprise test';
```

3. **Préparer la production** :
   - Créer les produits en mode LIVE
   - Configurer les webhooks production
   - Mettre à jour `.env.local` avec les clés LIVE
   - Changer `STRIPE_MODE=production`

---

## 🆘 Besoin d'aide ?

- 📖 Lisez `STRIPE_INTEGRATION_COMPLETE.md` pour plus de détails
- 📚 Consultez `STRIPE_SETUP.md` pour la configuration avancée
- 🔧 Documentation Stripe : https://stripe.com/docs
- 💬 Dashboard Stripe : https://dashboard.stripe.com

**Bonne chance ! 🚀**

