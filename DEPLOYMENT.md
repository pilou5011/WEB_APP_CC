# 🚀 Guide de déploiement - Application de gestion de cartes de vœux

Ce guide vous explique comment déployer votre application Next.js + Supabase en production.

## Prérequis

- Un compte GitHub
- Un compte Supabase (gratuit)
- Un compte Vercel (gratuit)

---

## Étape 1 : Préparer votre base de données Supabase

### 1.1 Créer un projet Supabase en production

1. Allez sur [https://supabase.com](https://supabase.com)
2. Connectez-vous ou créez un compte
3. Cliquez sur "New Project"
4. Remplissez les informations :
   - **Name** : cartes-voeux-prod (ou le nom de votre choix)
   - **Database Password** : Générez un mot de passe fort et **sauvegardez-le**
   - **Region** : Choisissez la région la plus proche (ex: Europe West pour la France)
   - **Pricing Plan** : Free (gratuit pour commencer)
5. Cliquez sur "Create new project"
6. Attendez quelques minutes que le projet soit créé

### 1.2 Appliquer les migrations

Une fois votre projet créé :

1. Dans Supabase, allez dans **SQL Editor** (dans le menu latéral)
2. Appliquez les migrations dans l'ordre suivant en copiant/collant le contenu de chaque fichier :

   **Ordre d'exécution des migrations :**
   
   a. `supabase/migrations/20250930121321_create_clients_and_stock_updates.sql`
   
   b. `supabase/migrations/20251002120000_add_collections_table.sql`
   
   c. `supabase/migrations/20251005100000_add_client_collections_and_stock_updates_fk.sql`
   
   d. `supabase/migrations/20250101120000_add_address_fields.sql`
   
   e. `supabase/migrations/20250108000000_add_invoices_table.sql`
   
   f. `supabase/migrations/20250110000000_add_custom_price_to_client_collections.sql`
   
   g. `supabase/migrations/20250111000000_create_user_profile_table.sql`
   
   h. `supabase/migrations/20251011000000_add_client_business_fields.sql`
   
   i. `supabase/migrations/20251012000000_add_establishment_types.sql`
   
   j. `supabase/migrations/20251012120000_add_client_additional_info.sql`
   
   k. `supabase/migrations/20251014000000_add_collection_info_to_stock_updates.sql`
   
   l. `supabase/migrations/20251014010000_create_invoice_adjustments.sql`
   
   m. `supabase/migrations/20251018000000_add_client_additional_fields.sql`
   
   n. `supabase/migrations/20251018010000_fix_average_time_columns.sql`
   
   o. `supabase/migrations/20251019000000_add_unit_price_quantity_to_adjustments.sql`
   
   p. `supabase/migrations/20251023000000_create_draft_stock_updates.sql`
   
   q. `supabase/migrations/20251024000000_add_closing_day.sql`
   
   r. `supabase/migrations/20251025000000_add_barcode_to_collections.sql`

3. Cliquez sur "Run" après chaque migration
4. Vérifiez qu'il n'y a pas d'erreurs

### 1.3 Récupérer les clés API

1. Dans Supabase, allez dans **Settings** > **API**
2. Notez les valeurs suivantes :
   - **Project URL** : `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (une longue chaîne)

⚠️ **Important** : Gardez ces informations en sécurité, vous en aurez besoin pour la configuration.

---

## Étape 2 : Pousser votre code sur GitHub

### 2.1 Initialiser Git (si ce n'est pas déjà fait)

```bash
git init
git add .
git commit -m "Initial commit - Application de gestion de cartes de vœux"
```

### 2.2 Créer un repository sur GitHub

1. Allez sur [https://github.com](https://github.com)
2. Cliquez sur le bouton **"+"** en haut à droite > **"New repository"**
3. Remplissez :
   - **Repository name** : `cartes-voeux-app` (ou le nom de votre choix)
   - **Description** : "Application de gestion de dépôts-ventes de cartes de vœux"
   - **Visibility** : Private (recommandé) ou Public
4. Ne cochez **PAS** "Initialize with README" (vous avez déjà du code)
5. Cliquez sur **"Create repository"**

### 2.3 Lier et pousser votre code

```bash
git remote add origin https://github.com/votre-username/cartes-voeux-app.git
git branch -M main
git push -u origin main
```

---

## Étape 3 : Déployer sur Vercel

### 3.1 Créer un compte Vercel

1. Allez sur [https://vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"**
3. Choisissez **"Continue with GitHub"** (recommandé)
4. Autorisez Vercel à accéder à vos repositories

### 3.2 Importer votre projet

1. Sur le dashboard Vercel, cliquez sur **"Add New"** > **"Project"**
2. Trouvez votre repository `cartes-voeux-app` dans la liste
3. Cliquez sur **"Import"**

### 3.3 Configurer les variables d'environnement

**IMPORTANT** : Avant de déployer, ajoutez les variables d'environnement :

1. Dans la section **"Environment Variables"** :
   
   Ajoutez ces 2 variables :
   
   - **Name** : `NEXT_PUBLIC_SUPABASE_URL`
     - **Value** : Votre Project URL de Supabase (étape 1.3)
   
   - **Name** : `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **Value** : Votre anon public key de Supabase (étape 1.3)

2. Assurez-vous que ces variables sont disponibles pour **Production**, **Preview**, et **Development**

### 3.4 Déployer

1. Cliquez sur **"Deploy"**
2. Attendez quelques minutes que le déploiement se termine
3. Une fois terminé, vous verrez un message de succès avec l'URL de votre application

🎉 **Félicitations !** Votre application est maintenant en ligne !

---

## Étape 4 : Tester votre application

1. Cliquez sur l'URL fournie par Vercel (ex: `https://cartes-voeux-app.vercel.app`)
2. Testez les fonctionnalités principales :
   - Créer un client
   - Créer une collection
   - Associer une collection à un client
   - Créer une facture

---

## Étape 5 : Configuration du profil utilisateur

1. Dans votre application déployée, allez dans **Profile** (menu principal)
2. Remplissez vos informations professionnelles :
   - Nom de la société
   - Adresse
   - SIRET, TVA
   - Téléphone
3. Ces informations apparaîtront automatiquement sur les factures PDF

---

## Mises à jour futures

Chaque fois que vous modifiez le code :

```bash
# 1. Commitez vos changements
git add .
git commit -m "Description des changements"

# 2. Poussez sur GitHub
git push origin main

# 3. Vercel redéploiera automatiquement !
```

---

## URL personnalisée (optionnel)

### Option 1 : Utiliser un sous-domaine Vercel

Dans Vercel > Settings > Domains, vous pouvez changer l'URL par défaut pour quelque chose comme :
- `mon-entreprise-cartes.vercel.app`

### Option 2 : Utiliser votre propre domaine

1. Achetez un nom de domaine (ex: sur OVH, Gandi, Google Domains)
2. Dans Vercel > Settings > Domains
3. Ajoutez votre domaine personnalisé
4. Suivez les instructions pour configurer les DNS

---

## Sauvegarder votre base de données

Pour sauvegarder régulièrement votre base de données Supabase :

1. Dans Supabase, allez dans **Database** > **Backups**
2. Le plan gratuit fait des sauvegardes quotidiennes automatiques (conservées 7 jours)
3. Vous pouvez aussi exporter manuellement vos données

---

## Assistance et support

### Problèmes courants

**Erreur : "Failed to fetch" ou problème de connexion**
- Vérifiez que les variables d'environnement sont bien configurées dans Vercel
- Vérifiez que votre projet Supabase est actif

**Les migrations ne s'appliquent pas**
- Assurez-vous d'exécuter les migrations dans l'ordre
- Vérifiez les messages d'erreur dans le SQL Editor de Supabase

**L'application ne se charge pas**
- Vérifiez les logs de déploiement dans Vercel
- Allez dans Vercel > Votre projet > Deployments > Cliquez sur le déploiement > View Function Logs

### Ressources

- **Documentation Vercel** : https://vercel.com/docs
- **Documentation Supabase** : https://supabase.com/docs
- **Documentation Next.js** : https://nextjs.org/docs

---

## Limites du plan gratuit

### Vercel (gratuit)
- Bande passante : 100 GB/mois
- Invocations de fonctions : 100 GB-Heures
- **Largement suffisant pour une utilisation personnelle ou tests**

### Supabase (gratuit)
- 500 MB de base de données
- 1 GB de stockage de fichiers
- 2 GB de bande passante
- **Parfait pour débuter et tester**

Si vous dépassez ces limites, vous recevrez une notification et pourrez upgrader vers un plan payant.

---

## Checklist finale

- [ ] Projet Supabase créé et migrations appliquées
- [ ] Code poussé sur GitHub
- [ ] Variables d'environnement configurées dans Vercel
- [ ] Application déployée sur Vercel
- [ ] Application testée et fonctionnelle
- [ ] Profil utilisateur configuré
- [ ] URL partagée avec les testeurs

---

**Votre application est maintenant en ligne et prête à être utilisée ! 🎉**

