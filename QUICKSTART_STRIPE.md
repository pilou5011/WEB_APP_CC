# ⚡ Stripe - Démarrage rapide (5 minutes)

## ⚠️ Prerequisites

**Avant de commencer**, vous devez avoir :
- ✅ Un compte Stripe (gratuit)

**Si vous n'avez pas encore de compte Stripe**, suivez d'abord :
👉 **[GUIDE_CREATION_COMPTE_STRIPE.md](./GUIDE_CREATION_COMPTE_STRIPE.md)** - Guide complet pour créer un compte Stripe et obtenir vos clés API

---

## 🎯 Ce qu'il faut faire MAINTENANT

### 0️⃣ (Si nécessaire) Créer un compte Stripe (5 minutes)

Si vous n'avez pas encore de compte Stripe :
1. Allez sur https://stripe.com/fr
2. Cliquez sur "Commencer" ou "Créer un compte"
3. Remplissez le formulaire (email, mot de passe, informations)
4. Vérifiez votre email
5. Récupérez vos clés API dans **Developers > API keys** (mode TEST)

👉 **Guide détaillé** : [GUIDE_CREATION_COMPTE_STRIPE.md](./GUIDE_CREATION_COMPTE_STRIPE.md)

### 1️⃣ Installer Stripe (30 secondes)

```bash
npm install stripe
```

### 2️⃣ Appliquer la migration DB (1 minute)

Allez dans votre dashboard Supabase :
1. **SQL Editor** → Nouvelle requête
2. Ouvrez `supabase/migrations/20260208000000_add_stripe_integration.sql`
3. Copiez-collez tout → **Run**

### 3️⃣ Ajouter les clés Stripe (2 minutes)

Créez `.env.local` à la racine :

```bash
# Vos clés Supabase (déjà configurées normalement)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clés Stripe TEST (trouvez-les sur https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY_TEST=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxx

# Mode
STRIPE_MODE=test

# Prix (laissez vide pour l'instant, on les remplira après)
STRIPE_PRICE_STANDARD_MONTHLY_TEST=
STRIPE_PRICE_STANDARD_YEARLY_TEST=
STRIPE_PRICE_PREMIUM_MONTHLY_TEST=
STRIPE_PRICE_PREMIUM_YEARLY_TEST=
STRIPE_PRICE_EXTRA_USER_MONTHLY_TEST=
STRIPE_PRICE_EXTRA_USER_YEARLY_TEST=
```

### 4️⃣ Créer les produits Stripe (2 minutes)

1. Allez sur https://dashboard.stripe.com/test/products
2. Créez **3 produits** avec leurs **prix mensuels ET annuels** :
   - **Abonnement Standard** (ex: 29€/mois, 290€/an)
   - **Abonnement Premium** (ex: 49€/mois, 490€/an)
   - **Utilisateur supplémentaire** (ex: 10€/mois, 100€/an)
3. **Copiez les 6 Price IDs** dans `.env.local`

### 5️⃣ Tester (30 secondes)

```bash
npm run dev
```

Créez un compte test → Vous serez redirigé vers `/subscription` ✅

---

## 🎉 C'est terminé !

### ✅ Ce qui fonctionne MAINTENANT :

- ✅ Création automatique de customer Stripe à l'inscription
- ✅ Page `/subscription` pour gérer l'abonnement
- ✅ Middleware qui bloque l'accès sans abonnement actif
- ✅ Webhooks prêts (à configurer pour recevoir les événements)

### 📝 Ce qu'il reste à faire :

1. **Configurer les webhooks** (pour le dev local) :
   ```bash
   npm install -g stripe
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   # Copiez le webhook secret dans STRIPE_WEBHOOK_SECRET_TEST
   ```

2. **Activer manuellement une entreprise test** :
   ```sql
   -- Dans Supabase SQL Editor
   UPDATE companies SET has_paid_entry_fee = true WHERE name = 'Votre entreprise test';
   ```

3. **Créer un abonnement via API** (optionnel pour tester) :
   ```bash
   curl -X POST http://localhost:3000/api/stripe/create-subscription \
     -H "Content-Type: application/json" \
     -d '{
       "company_id": "uuid",
       "plan_type": "standard",
       "billing_cycle": "monthly"
     }'
   ```

---

## 📚 Documentation complète

- **Installation détaillée** : Lisez `INSTALLATION_STRIPE.md`
- **Guide complet** : Lisez `STRIPE_INTEGRATION_COMPLETE.md`
- **Configuration** : Lisez `STRIPE_SETUP.md`
- **Requêtes SQL utiles** : Voir `STRIPE_ADMIN_QUERIES.sql`

---

## 🆘 Problèmes courants

### "Missing Stripe secret key"
→ Vérifiez que `.env.local` existe et contient `STRIPE_SECRET_KEY_TEST`

### "Stripe webhook verification failed"
→ Installez Stripe CLI et lancez `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Redirection infinie vers `/subscription`
→ Activez les frais d'entrée : `UPDATE companies SET has_paid_entry_fee = true`

---

## 🚀 Prêt pour la production ?

Quand vous serez prêt :

1. Créez les produits en mode LIVE sur Stripe
2. Configurez les webhooks production
3. Changez `STRIPE_MODE=production` dans `.env`
4. Testez avec de vraies cartes (petits montants)

**C'est parti ! 🎉**

