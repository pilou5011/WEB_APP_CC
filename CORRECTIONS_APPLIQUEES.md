# ✅ CORRECTIONS APPLIQUÉES - ISOLATION PAR COMPANY_ID

## 📋 Fichiers corrigés

### ✅ hooks/use-stock-update-draft.ts
- **8 requêtes corrigées** :
  - `saveDraftToServer`: Ajout de `company_id` dans SELECT, UPDATE, INSERT
  - `loadDraftFromServer`: Ajout de `company_id` dans SELECT
  - `getDraftInfo`: Ajout de `company_id` dans SELECT
  - `deleteDraft`: Ajout de `company_id` dans UPDATE et SELECT (2x)

### ✅ components/stock-report-dialog.tsx
- **6 requêtes corrigées** :
  - `loadUserProfile`: Ajout de `company_id` dans SELECT
  - `loadSubProducts`: Ajout de `company_id` dans SELECT pour `sub_products` et `client_sub_products`
  - `loadPreviousInvoiceDate`: Ajout de `company_id` dans SELECT pour `invoices` (2x)

### ✅ components/global-invoice-dialog.tsx
- **3 requêtes corrigées** :
  - `loadInvoiceAdjustments`: Ajout de `company_id` dans SELECT pour `invoice_adjustments`
  - `loadUserProfile`: Ajout de `company_id` dans SELECT pour `user_profile`

---

## ⚠️ FICHIERS RESTANTS À CORRIGER

### ❌ components/categories-manager.tsx
**6 requêtes à corriger** :
1. Ligne 61: SELECT `collection_categories` (vérification doublon) - Ajouter `.eq('company_id', companyId)`
2. Ligne 76: UPDATE `collection_categories` - Ajouter `.eq('company_id', companyId)`
3. Ligne 107: UPDATE `collection_categories` (soft delete) - Ajouter `.eq('company_id', companyId)`
4. Ligne 146: SELECT `collection_subcategories` (vérification doublon) - Ajouter `.eq('company_id', companyId)`
5. Ligne 162: UPDATE `collection_subcategories` - Ajouter `.eq('company_id', companyId)`
6. Ligne 193: UPDATE `collection_subcategories` (soft delete) - Ajouter `.eq('company_id', companyId)`

### ❌ components/payment-methods-manager.tsx
**3 requêtes à corriger** :
1. Ligne 53: SELECT `payment_methods` (vérification doublon) - Ajouter `.eq('company_id', companyId)`
2. Ligne 68: UPDATE `payment_methods` - Ajouter `.eq('company_id', companyId)`
3. Ligne 99: UPDATE `payment_methods` (soft delete) - Ajouter `.eq('company_id', companyId)`

### ❌ components/establishment-types-manager.tsx
**3 requêtes à corriger** :
1. Ligne 53: SELECT `establishment_types` (vérification doublon) - Ajouter `.eq('company_id', companyId)`
2. Ligne 68: UPDATE `establishment_types` - Ajouter `.eq('company_id', companyId)`
3. Ligne 99: UPDATE `establishment_types` (soft delete) - Ajouter `.eq('company_id', companyId)`

### ❌ VIEWS PostgreSQL
**10 vues à corriger ou désactiver** :
Les vues `*_active` dans `supabase/migrations/20250213000000_add_soft_delete_to_all_tables.sql` ne filtrent que par `deleted_at IS NULL`, pas par `company_id`.

**Recommandation**: Désactiver ces vues et utiliser uniquement les tables avec RLS activé, OU modifier les vues pour inclure `company_id = public.user_company_id()`.

---

## 🔧 PATTERN DE CORRECTION

Pour chaque fichier à corriger :

1. **Ajouter l'import** :
```typescript
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
```

2. **Pour chaque fonction async avec requêtes Supabase** :
```typescript
const companyId = await getCurrentUserCompanyId();
if (!companyId) {
  throw new Error('Non autorisé');
}
```

3. **Pour SELECT** :
```typescript
.eq('company_id', companyId)
```

4. **Pour UPDATE/DELETE** :
```typescript
.eq('company_id', companyId)
```

5. **Pour INSERT** :
```typescript
.insert([{
  ...data,
  company_id: companyId
}])
```

---

## 📊 STATISTIQUES

- **Fichiers corrigés**: 3/7
- **Requêtes corrigées**: 17/29
- **Fichiers restants**: 4
- **Requêtes restantes**: 12
- **Vues PostgreSQL**: 10

---

## ⚠️ PROCHAINES ÉTAPES

1. Corriger `components/categories-manager.tsx`
2. Corriger `components/payment-methods-manager.tsx`
3. Corriger `components/establishment-types-manager.tsx`
4. Corriger ou désactiver les VIEWS PostgreSQL
5. Vérifier qu'aucune autre requête n'a été oubliée
6. Produire le rapport final de validation

