# 🔐 Gestion des Mots de Passe dans Supabase

## 📋 Vue d'ensemble

Supabase utilise une approche de sécurité standard de l'industrie pour gérer les mots de passe. **Les mots de passe ne sont JAMAIS stockés en clair** dans la base de données.

---

## 🔍 Où sont stockés les mots de passe ?

### Table `auth.users` (schéma `auth`)

Les mots de passe sont stockés dans la table `auth.users`, mais dans une colonne qui **n'est pas visible par défaut** dans le Dashboard Supabase :

- **Colonne** : `encrypted_password`
- **Type** : `text` (hash bcrypt)
- **Visibilité** : Masquée dans le Dashboard pour des raisons de sécurité

### Pourquoi vous ne voyez pas cette colonne ?

Le Dashboard Supabase masque intentionnellement certaines colonnes sensibles :
- `encrypted_password` - Le hash du mot de passe
- `salt` - Le sel utilisé pour le hashage (si applicable)
- `raw_app_meta_data` - Métadonnées brutes
- `raw_user_meta_data` - Métadonnées utilisateur brutes

---

## 🔒 Comment fonctionne le stockage sécurisé ?

### 1. **Hachage avec bcrypt**

Quand un utilisateur crée un compte ou change son mot de passe :

```typescript
// Dans votre code (app/auth/page.tsx)
await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'monMotDePasse123'
});
```

**Ce qui se passe côté Supabase :**

1. Le mot de passe en clair (`monMotDePasse123`) est reçu par le serveur Supabase
2. Supabase génère un **sel (salt)** unique pour cet utilisateur
3. Le mot de passe est **hashé avec bcrypt** : `bcrypt(password + salt)`
4. Seul le **hash** est stocké dans `encrypted_password`
5. Le mot de passe original est **immédiatement supprimé de la mémoire**

**Résultat :**
- ✅ Le hash ressemble à : `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`
- ❌ Le mot de passe original n'existe plus nulle part

---

## 🔐 Comment Supabase vérifie un mot de passe lors de la connexion ?

### Processus de vérification

Quand vous vous connectez :

```typescript
// Dans votre code (app/auth/page.tsx)
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'monMotDePasse123'
});
```

**Étapes de vérification :**

1. **Récupération du hash** :
   - Supabase récupère l'utilisateur par email dans `auth.users`
   - Il lit la colonne `encrypted_password` (le hash bcrypt)

2. **Hachage du mot de passe saisi** :
   - Le mot de passe saisi (`monMotDePasse123`) est hashé avec le même algorithme
   - Le sel est extrait du hash stocké (bcrypt inclut le sel dans le hash)

3. **Comparaison** :
   - Supabase compare le hash du mot de passe saisi avec le hash stocké
   - Si les deux hash correspondent → ✅ Connexion réussie
   - Si les hash ne correspondent pas → ❌ "Email ou mot de passe incorrect"

4. **Sécurité** :
   - Le mot de passe en clair n'est **jamais** comparé directement
   - Seuls les hash sont comparés
   - Même si quelqu'un accède à la base de données, il ne peut pas récupérer le mot de passe original

---

## 🛡️ Sécurité de bcrypt

### Caractéristiques de bcrypt :

1. **Algorithme unidirectionnel** :
   - Impossible de "dé-hasher" un mot de passe
   - Même avec le hash, on ne peut pas retrouver le mot de passe original

2. **Sel unique** :
   - Chaque utilisateur a un sel différent
   - Même mot de passe = hash différent pour chaque utilisateur
   - Protège contre les attaques par table arc-en-ciel (rainbow tables)

3. **Coût configurable** :
   - Le "coût" (rounds) détermine la lenteur du hachage
   - Plus c'est lent, plus c'est sécurisé (résiste aux attaques par force brute)
   - Supabase utilise un coût élevé par défaut

4. **Résistant aux attaques** :
   - Force brute : très lent (bcrypt est intentionnellement lent)
   - Table arc-en-ciel : inutile (sel unique)
   - Attaque par dictionnaire : difficile (si le mot de passe est fort)

---

## 🔍 Comment voir la colonne `encrypted_password` ?

### Via SQL Editor (avec prudence !)

```sql
-- ⚠️ ATTENTION : Ne jamais exposer cette information
-- Cette requête montre le hash (mais pas le mot de passe original)
SELECT 
  id,
  email,
  encrypted_password,  -- Le hash bcrypt
  created_at
FROM auth.users
WHERE email = 'user@example.com';
```

**⚠️ Important :**
- Le hash ne peut pas être utilisé pour se connecter directement
- Ne partagez jamais cette information
- Ne l'exposez jamais dans votre application frontend

---

## 📊 Structure de la table `auth.users`

### Colonnes visibles dans le Dashboard :

- `id` (uuid) - Identifiant unique
- `email` (text) - Email de l'utilisateur
- `email_confirmed_at` (timestamp) - Date de confirmation
- `created_at` (timestamp) - Date de création
- `last_sign_in_at` (timestamp) - Dernière connexion
- `phone` (text) - Numéro de téléphone (optionnel)
- `raw_app_meta_data` (jsonb) - Métadonnées application
- `raw_user_meta_data` (jsonb) - Métadonnées utilisateur

### Colonnes masquées (sécurité) :

- `encrypted_password` (text) - **Hash bcrypt du mot de passe**
- `salt` (text) - Sel pour le hashage (si utilisé séparément)
- `confirmation_token` (text) - Token de confirmation
- `recovery_token` (text) - Token de récupération

---

## 🔄 Flux complet d'authentification

### 1. **Inscription** (`signUp`)

```
Utilisateur saisit : "monMotDePasse123"
         ↓
Client envoie au serveur Supabase
         ↓
Supabase génère un sel unique
         ↓
Supabase hash : bcrypt("monMotDePasse123" + sel)
         ↓
Hash stocké dans encrypted_password
         ↓
Mot de passe original supprimé
```

### 2. **Connexion** (`signInWithPassword`)

```
Utilisateur saisit : "monMotDePasse123"
         ↓
Client envoie au serveur Supabase
         ↓
Supabase récupère encrypted_password de auth.users
         ↓
Supabase hash le mot de passe saisi avec le même sel
         ↓
Comparaison des deux hash
         ↓
Si identiques → ✅ Session créée
Si différents → ❌ Erreur "Invalid credentials"
```

---

## 🚨 Bonnes pratiques de sécurité

### ✅ Ce que Supabase fait automatiquement :

1. **Hachage sécurisé** : Utilise bcrypt avec sel unique
2. **Protection contre les attaques** : Rate limiting sur les tentatives de connexion
3. **Validation** : Vérifie la force du mot de passe (minimum 6 caractères)
4. **HTTPS** : Toutes les communications sont chiffrées
5. **Tokens JWT** : Les sessions utilisent des tokens sécurisés

### ✅ Ce que vous devez faire :

1. **Ne jamais stocker de mots de passe en clair** dans votre code
2. **Utiliser HTTPS** en production
3. **Valider les mots de passe** côté client ET serveur
4. **Encourager des mots de passe forts** (minimum 8 caractères, majuscules, chiffres, symboles)
5. **Ne jamais logger les mots de passe** dans les logs

---

## 🔧 Vérification dans votre code

### Dans `app/auth/page.tsx` :

```typescript
// ✅ CORRECT : Le mot de passe est envoyé au serveur Supabase
// qui le hash automatiquement
const { data, error } = await supabase.auth.signInWithPassword({
  email: trimmedEmail,
  password: trimmedPassword,  // Envoyé en HTTPS, hashé côté serveur
});

// ❌ MAUVAIS : Ne jamais faire ça
// const passwordHash = bcrypt.hash(password); // Ne pas hasher côté client !
// await supabase.auth.signInWithPassword({ password: passwordHash });
```

---

## 📝 Résumé

| Question | Réponse |
|----------|---------|
| **Où sont stockés les mots de passe ?** | Dans `auth.users.encrypted_password` (hash bcrypt) |
| **Pourquoi je ne vois pas cette colonne ?** | Masquée par sécurité dans le Dashboard |
| **Comment Supabase vérifie un mot de passe ?** | Compare le hash du mot de passe saisi avec le hash stocké |
| **Puis-je récupérer un mot de passe ?** | ❌ Non, c'est impossible (hachage unidirectionnel) |
| **Est-ce sécurisé ?** | ✅ Oui, utilise bcrypt avec sel unique |
| **Le mot de passe est-il envoyé en clair ?** | Oui, mais uniquement via HTTPS (chiffré en transit) |

---

## 🎯 Conclusion

Supabase gère les mots de passe de manière **sécurisée et standard** :

1. ✅ Hachage avec bcrypt (algorithme industriel standard)
2. ✅ Sel unique par utilisateur
3. ✅ Mot de passe jamais stocké en clair
4. ✅ Vérification par comparaison de hash
5. ✅ Communication chiffrée (HTTPS)

**Vous n'avez rien à faire** : Supabase gère tout automatiquement de manière sécurisée ! 🔒

