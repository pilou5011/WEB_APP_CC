# 🔒 AUDIT COMPLET - ISOLATION PAR COMPANY_ID

**Date**: 2025-01-30
**Objectif**: Vérifier que toutes les requêtes Supabase sont filtrées par `company_id` pour garantir l'isolation stricte des données entre entreprises.

---

## 📋 RÉSUMÉ EXÉCUTIF

### ✅ Éléments conformes
- Les fichiers principaux (`app/clients/**/*.tsx`, `app/collections/**/*.tsx`, `app/profile/page.tsx`) ont été migrés
- Les fichiers PDF (`lib/pdf-generators*.ts`, `lib/pdf-storage.ts`) ont été migrés
- Les politiques RLS sont en place et filtrent par `company_id`
- La fonction `getCurrentUserCompanyId()` est utilisée correctement dans la plupart des fichiers

### ⚠️ Problèmes critiques identifiés

#### 1. **hooks/use-stock-update-draft.ts** - CRITIQUE
- **8 requêtes** sur `draft_stock_updates` sans filtrage `company_id`
- **Impact**: Les brouillons peuvent être accessibles entre entreprises
- **Correction requise**: Ajouter `company_id` à toutes les requêtes

#### 2. **components/stock-report-dialog.tsx** - CRITIQUE
- **6 requêtes** sans filtrage `company_id`:
  - `user_profile` (ligne 124)
  - `sub_products` (ligne 146)
  - `client_sub_products` (ligne 153)
  - `invoices` (lignes 182, 204)
- **Impact**: Données cross-company accessibles dans les rapports de stock
- **Correction requise**: Ajouter `company_id` à toutes les requêtes

#### 3. **components/global-invoice-dialog.tsx** - CRITIQUE
- **3 requêtes** sans filtrage `company_id`:
  - `invoice_adjustments` (ligne 54)
  - `user_profile` (ligne 127)
- **Impact**: Ajustements et profils cross-company accessibles
- **Correction requise**: Ajouter `company_id` à toutes les requêtes

#### 4. **components/categories-manager.tsx** - CRITIQUE
- **6 requêtes** sur `collection_categories` et `collection_subcategories` sans filtrage `company_id`
- **Impact**: Catégories cross-company accessibles et modifiables
- **Correction requise**: Ajouter `company_id` à toutes les requêtes

#### 5. **components/payment-methods-manager.tsx** - CRITIQUE
- **3 requêtes** sur `payment_methods` sans filtrage `company_id`
- **Impact**: Méthodes de paiement cross-company accessibles et modifiables
- **Correction requise**: Ajouter `company_id` à toutes les requêtes

#### 6. **components/establishment-types-manager.tsx** - CRITIQUE
- **3 requêtes** sur `establishment_types` sans filtrage `company_id`
- **Impact**: Types d'établissement cross-company accessibles et modifiables
- **Correction requise**: Ajouter `company_id` à toutes les requêtes

#### 7. **VIEWS PostgreSQL** - CRITIQUE
- **10 vues** (`*_active`) ne filtrent que par `deleted_at IS NULL`, pas par `company_id`
- **Impact**: Les vues exposent des données cross-company
- **Correction requise**: Modifier les vues pour inclure `company_id` OU désactiver les vues et utiliser uniquement les tables avec RLS

---

## 🔍 DÉTAIL DES PROBLÈMES

### Requêtes non filtrées identifiées

#### hooks/use-stock-update-draft.ts
```typescript
// ❌ PROBLÈME: 8 requêtes sans company_id
- Ligne 51: SELECT sur draft_stock_updates
- Ligne 64: UPDATE sur draft_stock_updates
- Ligne 76: INSERT sur draft_stock_updates (sans company_id dans l'insert)
- Ligne 112: SELECT sur draft_stock_updates
- Ligne 153: SELECT sur draft_stock_updates
- Ligne 189: UPDATE sur draft_stock_updates
- Ligne 207: SELECT sur draft_stock_updates
- Ligne 217: UPDATE sur draft_stock_updates
```

#### components/stock-report-dialog.tsx
```typescript
// ❌ PROBLÈME: 6 requêtes sans company_id
- Ligne 124: SELECT user_profile (sans company_id)
- Ligne 146: SELECT sub_products (sans company_id)
- Ligne 153: SELECT client_sub_products (sans company_id)
- Ligne 182: SELECT invoices (sans company_id)
- Ligne 204: SELECT invoices (sans company_id)
```

#### components/global-invoice-dialog.tsx
```typescript
// ❌ PROBLÈME: 3 requêtes sans company_id
- Ligne 54: SELECT invoice_adjustments (sans company_id)
- Ligne 127: SELECT user_profile (sans company_id)
```

#### components/categories-manager.tsx
```typescript
// ❌ PROBLÈME: 6 requêtes sans company_id
- Ligne 61: SELECT collection_categories (vérification doublon)
- Ligne 76: UPDATE collection_categories
- Ligne 107: UPDATE collection_categories (soft delete)
- Ligne 146: SELECT collection_subcategories (vérification doublon)
- Ligne 162: UPDATE collection_subcategories
- Ligne 193: UPDATE collection_subcategories (soft delete)
```

#### components/payment-methods-manager.tsx
```typescript
// ❌ PROBLÈME: 3 requêtes sans company_id
- Ligne 53: SELECT payment_methods (vérification doublon)
- Ligne 68: UPDATE payment_methods
- Ligne 99: UPDATE payment_methods (soft delete)
```

#### components/establishment-types-manager.tsx
```typescript
// ❌ PROBLÈME: 3 requêtes sans company_id
- Ligne 53: SELECT establishment_types (vérification doublon)
- Ligne 68: UPDATE establishment_types
- Ligne 99: UPDATE establishment_types (soft delete)
```

---

## ✅ REQUÊTES LÉGITIMEMENT SANS COMPANY_ID

### app/page.tsx
- **Ligne 32**: `SELECT users WHERE id = session.user.id`
- **Justification**: Récupération de l'utilisateur connecté uniquement (filtré par `id` de session)

### app/users/page.tsx
- **Ligne 92**: `SELECT users WHERE email = ...`
- **Justification**: Vérification globale de l'existence d'un email (nécessaire pour éviter les doublons cross-company lors de l'invitation)

### app/auth/page.tsx
- **Ligne 49**: `SELECT users WHERE id = data.user.id`
- **Justification**: Vérification de l'existence de l'utilisateur après authentification
- **Ligne 109**: `INSERT companies`
- **Justification**: Création d'une nouvelle entreprise (pas de company_id existant)

### app/auth/accept-invitation/page.tsx
- **Ligne 39**: `SELECT user_invitations WHERE token = ...`
- **Justification**: Recherche par token unique (sécurisé)

---

## 🛡️ VÉRIFICATION RLS

### Politiques RLS en place
✅ Toutes les tables métier ont des politiques RLS qui filtrent par `company_id = public.user_company_id()`

### Tables avec RLS
- ✅ `clients`
- ✅ `invoices`
- ✅ `stock_updates`
- ✅ `collections`
- ✅ `client_collections`
- ✅ `client_sub_products`
- ✅ `sub_products`
- ✅ `user_profile`
- ✅ `credit_notes`
- ✅ `stock_direct_sold`
- ✅ `establishment_types`
- ✅ `payment_methods`
- ✅ `collection_categories`
- ✅ `collection_subcategories`
- ✅ `draft_stock_updates`
- ✅ `invoice_adjustments`

**Note**: Les politiques RLS sont un backup de sécurité, mais le filtrage côté application est OBLIGATOIRE pour garantir l'isolation.

---

## 📊 STATISTIQUES

- **Total de requêtes Supabase identifiées**: ~500+
- **Requêtes non filtrées identifiées**: 29
- **Fichiers à corriger**: 7
- **Vues PostgreSQL à corriger**: 10

---

## 🚨 RISQUES IDENTIFIÉS

### Risque CRITIQUE
1. **Fuites de données cross-company** via les composants de gestion (categories, payment_methods, establishment_types)
2. **Brouillons accessibles entre entreprises** via `use-stock-update-draft.ts`
3. **Données exposées dans les PDFs** via `stock-report-dialog.tsx` et `global-invoice-dialog.tsx`
4. **Vues PostgreSQL exposant des données cross-company**

### Risque MOYEN
- Les politiques RLS protègent au niveau base de données, mais le code applicatif doit aussi filtrer

---

## ✅ PLAN DE CORRECTION

1. ✅ Corriger `hooks/use-stock-update-draft.ts`
2. ✅ Corriger `components/stock-report-dialog.tsx`
3. ✅ Corriger `components/global-invoice-dialog.tsx`
4. ✅ Corriger `components/categories-manager.tsx`
5. ✅ Corriger `components/payment-methods-manager.tsx`
6. ✅ Corriger `components/establishment-types-manager.tsx`
7. ✅ Corriger les VIEWS PostgreSQL

---

## 📝 NOTES IMPORTANTES

1. **RLS comme backup**: Les politiques RLS filtrent déjà par `company_id`, mais le code applicatif DOIT aussi filtrer pour une sécurité renforcée.

2. **Vues PostgreSQL**: Les vues `*_active` ne doivent PAS être utilisées directement. Utiliser les tables avec RLS activé.

3. **INSERT sans company_id**: Tous les INSERT doivent inclure `company_id` obtenu via `getCurrentUserCompanyId()`.

4. **UPDATE/DELETE**: Tous les UPDATE et DELETE doivent filtrer par `company_id` en plus de l'`id`.

---

## ✅ VALIDATION FINALE

Une fois toutes les corrections appliquées, confirmer explicitement :

**"Aucune requête ou donnée ne peut fuiter entre deux entreprises"**

