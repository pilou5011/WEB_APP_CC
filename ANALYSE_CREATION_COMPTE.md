# Analyse de la création de compte

## 🔍 Comment fonctionne actuellement la création de compte

### Scénario 1 : Email de confirmation REQUIS (cas le plus courant)

1. **Inscription** (`handleSignup`) :
   - ✅ Crée l'utilisateur dans `auth.users`
   - ❌ **NE crée PAS** l'entreprise dans `companies`
   - ❌ **NE crée PAS** l'utilisateur dans `users`
   - ✅ Stocke le nom d'entreprise dans `user_metadata.pending_company_name`
   - ✅ Envoie un email de confirmation

2. **Confirmation d'email** :
   - ✅ L'utilisateur clique sur le lien dans l'email
   - ✅ `email_confirmed_at` est mis à jour dans `auth.users`

3. **Première connexion** (`handleLogin`) :
   - ✅ Détecte que l'utilisateur n'existe pas dans `users`
   - ✅ Essaie de créer l'entreprise et l'utilisateur
   - ⚠️ **Peut échouer** si les politiques RLS ne sont pas correctement configurées

### Scénario 2 : Email de confirmation NON requis (rare)

1. **Inscription** (`handleSignup`) :
   - ✅ Crée l'utilisateur dans `auth.users`
   - ✅ Crée l'entreprise dans `companies`
   - ✅ Crée l'utilisateur dans `users`
   - ✅ Connecte automatiquement l'utilisateur

## ⚠️ PROBLÈME ACTUEL

**Si les migrations RLS ne sont pas appliquées**, la création de l'entreprise et de l'utilisateur lors de la première connexion **échouera** avec une erreur RLS.

## ✅ SOLUTION

Pour que la création de compte fonctionne correctement, vous devez :

1. **Appliquer les migrations RLS** :
   - `20250130000009_fix_users_rls_circular_dependency.sql`
   - `20250130000010_fix_users_insert_policy_for_new_accounts.sql`

2. **Vérifier que les politiques RLS sont actives** :
   - La politique "Users can create a company if they don't have one" doit exister
   - La politique "Users can insert their own record" doit exister

## 📋 Checklist pour un nouveau compte

Après l'inscription et la confirmation d'email, lors de la première connexion :

- [ ] L'entreprise est créée dans `companies`
- [ ] L'utilisateur est créé dans `users` avec le bon `company_id`
- [ ] Le rôle est défini à 'admin'
- [ ] La connexion réussit

## 🔧 Test

Pour tester si tout fonctionne :

1. Créez un nouveau compte avec un email valide
2. Confirmez l'email
3. Connectez-vous
4. Vérifiez dans Supabase que :
   - L'entreprise existe dans `companies`
   - L'utilisateur existe dans `users`
   - Le `company_id` correspond

