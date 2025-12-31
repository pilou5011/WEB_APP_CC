# Migration vers le mode multi-utilisateurs/multi-entreprises

## ✅ Ce qui a été fait

### 1. Migrations Supabase
- ✅ Création de la table `companies`
- ✅ Création de la table `users` (liée à `auth.users`)
- ✅ Création de la table `user_invitations`
- ✅ Ajout de `company_id` à toutes les tables métier :
  - clients
  - invoices
  - stock_updates
  - collections
  - client_collections
  - client_sub_products
  - sub_products
  - user_profile
  - credit_notes
  - stock_direct_sold
  - establishment_types
  - payment_methods
  - collection_categories
  - collection_subcategories
  - draft_stock_updates
  - invoice_adjustments

### 2. Row Level Security (RLS)
- ✅ Fonction helper `auth.user_company_id()` pour obtenir le company_id de l'utilisateur connecté
- ✅ Politiques RLS mises à jour sur toutes les tables pour filtrer par `company_id`
- ✅ Politiques spéciales pour les admins (gestion des utilisateurs)

### 3. Authentification
- ✅ Landing page `/auth` avec création de compte et connexion
- ✅ Création automatique d'une entreprise lors de l'inscription
- ✅ Le premier utilisateur devient automatiquement administrateur
- ✅ Middleware pour protéger les routes (redirection vers `/auth` si non connecté)
- ✅ Page d'accueil mise à jour avec informations de l'utilisateur et déconnexion

### 4. Gestion des utilisateurs
- ✅ Page `/users` pour les administrateurs
- ✅ Système d'invitation d'utilisateurs
- ✅ Page `/auth/accept-invitation` pour accepter une invitation et créer un mot de passe
- ✅ Gestion des rôles (admin/user)

### 5. Helpers et types
- ✅ Types TypeScript ajoutés : `Company`, `User`, `UserInvitation`
- ✅ Helpers d'authentification dans `lib/auth-helpers.ts` :
  - `getCurrentUser()`
  - `getCurrentUserCompanyId()`
  - `isCurrentUserAdmin()`
  - `getSession()`

## ⚠️ Ce qui reste à faire

### 1. Mise à jour des requêtes (CRITIQUE)
Toutes les requêtes Supabase doivent être mises à jour pour :
- Filtrer par `company_id` automatiquement
- Utiliser `getCurrentUserCompanyId()` pour obtenir le company_id

**Fichiers à modifier :**
- `app/clients/**/*.tsx` - Toutes les pages clients
- `app/collections/**/*.tsx` - Toutes les pages collections
- `app/profile/page.tsx` - Page de profil
- `lib/pdf-generators*.ts` - Générateurs de PDF
- Tous les autres fichiers qui font des requêtes Supabase

**Exemple de modification :**
```typescript
// AVANT
const { data } = await supabase
  .from('clients')
  .select('*')
  .is('deleted_at', null);

// APRÈS
const companyId = await getCurrentUserCompanyId();
if (!companyId) throw new Error('Non autorisé');

const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('company_id', companyId)
  .is('deleted_at', null);
```

### 2. Insertions de données
Toutes les insertions doivent inclure `company_id` :
```typescript
const companyId = await getCurrentUserCompanyId();
if (!companyId) throw new Error('Non autorisé');

await supabase
  .from('clients')
  .insert([{
    ...clientData,
    company_id: companyId
  }]);
```

### 3. Envoi d'emails d'invitation
Actuellement, le lien d'invitation est affiché dans un toast. Il faut :
- Configurer un service d'email (Resend, SendGrid, etc.)
- Créer un template d'email
- Envoyer l'email automatiquement lors de la création d'une invitation

### 4. Migration des données existantes
Si vous avez des données existantes, il faut :
- Créer une entreprise par défaut
- Assigner toutes les données existantes à cette entreprise
- Créer un utilisateur admin pour cette entreprise

### 5. Tests
- Tester la création de compte
- Tester la connexion
- Tester l'invitation d'utilisateurs
- Tester l'isolation des données entre entreprises
- Tester les permissions admin/user

## 📝 Notes importantes

1. **Isolation stricte** : Les utilisateurs ne peuvent voir que les données de leur entreprise
2. **RLS actif** : Toutes les tables ont des politiques RLS qui filtrent par `company_id`
3. **Premier utilisateur = Admin** : Le premier utilisateur qui crée un compte devient automatiquement admin
4. **Invitations obligatoires** : Impossible de rejoindre une entreprise sans invitation
5. **Pas de changement métier** : Toutes les fonctionnalités existantes restent identiques, seule l'isolation des données change

## 🔧 Commandes utiles

### Appliquer les migrations
```bash
# Si vous utilisez Supabase CLI
supabase db push

# Ou exécutez les migrations manuellement dans le dashboard Supabase
```

### Vérifier les politiques RLS
```sql
-- Vérifier les politiques sur une table
SELECT * FROM pg_policies WHERE tablename = 'clients';
```

## 🚨 Points d'attention

1. **Toutes les requêtes doivent filtrer par company_id** - C'est critique pour la sécurité
2. **Les insertions doivent inclure company_id** - Sinon les données ne seront pas accessibles
3. **Tester l'isolation** - Créer deux entreprises et vérifier qu'elles ne voient pas les données de l'autre
4. **Backup avant migration** - Faire un backup de la base de données avant d'appliquer les migrations

