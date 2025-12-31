# Guide de vérification d'un compte dans Supabase

## 📋 Tables à vérifier

Un compte utilisateur est créé dans **3 tables** :

1. **`auth.users`** - Table d'authentification Supabase (gérée automatiquement)
2. **`users`** - Table métier de l'application (contient company_id, role)
3. **`companies`** - Table des entreprises (créée lors de l'inscription)

---

## 🔍 Méthode 1 : Via le Dashboard Supabase (Recommandé)

### Étape 1 : Vérifier dans `auth.users`

1. Ouvrez votre projet Supabase
2. Allez dans **Authentication** → **Users**
3. Recherchez l'email de l'utilisateur
4. Vérifiez :
   - ✅ Email confirmé (`email_confirmed_at` n'est pas null)
   - ✅ Statut actif
   - ✅ Date de création

### Étape 2 : Vérifier dans `users` (table métier)

1. Allez dans **Table Editor**
2. Sélectionnez la table **`users`**
3. Recherchez l'utilisateur par email ou ID
4. Vérifiez :
   - ✅ L'utilisateur existe avec le bon `id` (correspond à `auth.users.id`)
   - ✅ `company_id` est renseigné
   - ✅ `role` est défini (généralement 'admin' pour le premier utilisateur)

### Étape 3 : Vérifier dans `companies`

1. Dans **Table Editor**, sélectionnez la table **`companies`**
2. Recherchez l'entreprise par `id` (utilisez le `company_id` de l'utilisateur)
3. Vérifiez :
   - ✅ L'entreprise existe
   - ✅ Le nom de l'entreprise est correct

---

## 🔍 Méthode 2 : Via SQL Editor (Plus précis)

### Requête complète pour vérifier un compte

```sql
-- Vérifier un compte par email
SELECT 
  au.id as auth_user_id,
  au.email,
  au.email_confirmed_at,
  au.created_at as auth_created_at,
  u.id as user_id,
  u.company_id,
  u.role,
  c.id as company_id,
  c.name as company_name,
  c.created_at as company_created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.companies c ON u.company_id = c.id
WHERE au.email = 'votre-email@example.com';
```

### Vérifier si un compte est complet

```sql
-- Vérifier si tous les éléments sont présents
SELECT 
  au.email,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Email confirmé'
    ELSE '❌ Email non confirmé'
  END as email_status,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ Utilisateur créé'
    ELSE '❌ Utilisateur manquant'
  END as user_status,
  CASE 
    WHEN c.id IS NOT NULL THEN '✅ Entreprise créée'
    ELSE '❌ Entreprise manquante'
  END as company_status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.companies c ON u.company_id = c.id
WHERE au.email = 'votre-email@example.com';
```

### Lister tous les comptes incomplets

```sql
-- Trouver les comptes avec email confirmé mais utilisateur manquant
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE au.email_confirmed_at IS NOT NULL
  AND u.id IS NULL;
```

---

## 🔧 Diagnostic des problèmes courants

### Problème 1 : Utilisateur dans `auth.users` mais pas dans `users`

**Symptôme** : L'utilisateur peut se connecter mais obtient "Non autorisé"

**Solution** : Exécuter la migration `20250130000010_fix_users_insert_policy_for_new_accounts.sql` puis recréer l'utilisateur :

```sql
-- Créer l'entreprise et l'utilisateur manquant
DO $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_company_id uuid;
BEGIN
  -- Remplacer par l'email de l'utilisateur
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE email = 'votre-email@example.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé dans auth.users';
  END IF;

  -- Créer l'entreprise
  INSERT INTO public.companies (name)
  VALUES (split_part(v_user_email, '@', 1) || ' Entreprise')
  RETURNING id INTO v_company_id;

  -- Créer l'utilisateur
  INSERT INTO public.users (id, email, company_id, role)
  VALUES (v_user_id, v_user_email, v_company_id, 'admin')
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Compte créé avec succès pour %', v_user_email;
END $$;
```

### Problème 2 : Vérifier les politiques RLS

```sql
-- Vérifier les politiques RLS sur users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;
```

---

## ✅ Checklist de vérification

Pour un compte valide, vous devez avoir :

- [ ] Utilisateur dans `auth.users` avec `email_confirmed_at` non null
- [ ] Utilisateur dans `users` avec le même `id` que `auth.users.id`
- [ ] `company_id` renseigné dans `users`
- [ ] Entreprise correspondante dans `companies` avec le même `id` que `users.company_id`
- [ ] `role` défini dans `users` (généralement 'admin' pour le premier utilisateur)

---

## 📝 Notes importantes

1. **L'ID doit correspondre** : `auth.users.id` = `users.id`
2. **L'email doit correspondre** : `auth.users.email` = `users.email`
3. **La relation doit être valide** : `users.company_id` doit exister dans `companies.id`
4. **Les politiques RLS** doivent permettre la lecture de ces données

