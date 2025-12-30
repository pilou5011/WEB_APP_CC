# Résumé de la migration - Filtrage par company_id

## 📊 État d'avancement

### ✅ Fichiers complétés (partiellement ou totalement)

1. **app/clients/page.tsx** ✅
   - `loadClients()` - Filtrage par company_id ajouté

2. **app/clients/new/page.tsx** ✅
   - `loadEstablishmentTypes()` - Filtrage par company_id ajouté
   - `loadPaymentMethods()` - Filtrage par company_id ajouté
   - Insert client - company_id ajouté
   - Toutes les requêtes CRUD pour `payment_methods` - Filtrage par company_id ajouté
   - Toutes les requêtes CRUD pour `establishment_types` - Filtrage par company_id ajouté

3. **app/clients/[id]/info/page.tsx** ✅
   - `loadClient()` - Filtrage par company_id ajouté
   - `loadEstablishmentTypes()` - Filtrage par company_id ajouté
   - `loadPaymentMethods()` - Filtrage par company_id ajouté
   - Update client - Filtrage par company_id ajouté
   - Delete client - Filtrage par company_id ajouté
   - Toutes les requêtes CRUD pour `payment_methods` - Filtrage par company_id ajouté
   - Toutes les requêtes CRUD pour `establishment_types` - Filtrage par company_id ajouté

### ⚠️ Fichiers CRITIQUES restants (440+ requêtes)

#### Fichiers clients volumineux
- **app/clients/[id]/page.tsx** - **112 requêtes** ⚠️ CRITIQUE
- **app/clients/[id]/stock/page.tsx** - **112 requêtes** ⚠️ CRITIQUE
- **app/clients/[id]/documents/page.tsx** - **112 requêtes** ⚠️ CRITIQUE

#### Fichiers clients moyens
- **app/clients/[id]/credit-note/page.tsx** - **13 requêtes**
- **app/clients/[id]/invoice/page.tsx** - **13 requêtes**

#### Fichiers collections
- **app/collections/page.tsx** - Nombre de requêtes à déterminer
- **app/collections/new/page.tsx** - Nombre de requêtes à déterminer
- **app/collections/[id]/page.tsx** - Nombre de requêtes à déterminer

#### Fichiers critiques (génération PDF)
- **lib/pdf-generators.ts** ⚠️ CRITIQUE - Génération de factures
- **lib/pdf-generators-direct-invoice.ts** ⚠️ CRITIQUE - Génération de factures directes
- **lib/pdf-storage.ts** - Stockage de PDFs

#### Autres fichiers
- **app/profile/page.tsx** ⚠️ IMPORTANT - user_profile doit être filtré par company_id
- **components/deposit-slip-dialog.tsx** - Dialog de bon de dépôt

## 🔍 Tables concernées

Toutes les tables suivantes doivent être filtrées par `company_id` :

- ✅ `clients`
- ✅ `establishment_types`
- ✅ `payment_methods`
- ⏳ `invoices`
- ⏳ `stock_updates`
- ⏳ `collections`
- ⏳ `client_collections`
- ⏳ `client_sub_products`
- ⏳ `sub_products`
- ⏳ `user_profile`
- ⏳ `credit_notes`
- ⏳ `stock_direct_sold`
- ⏳ `collection_categories`
- ⏳ `collection_subcategories`
- ⏳ `draft_stock_updates`
- ⏳ `invoice_adjustments`

## 📝 Pattern appliqué

### Import obligatoire
```typescript
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
```

### Pour SELECT
```typescript
const companyId = await getCurrentUserCompanyId();
if (!companyId) {
  throw new Error('Non autorisé');
}

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('company_id', companyId)
  .is('deleted_at', null);
```

### Pour INSERT
```typescript
const companyId = await getCurrentUserCompanyId();
if (!companyId) {
  throw new Error('Non autorisé');
}

const { data, error } = await supabase
  .from('table_name')
  .insert([{ 
    ...data,
    company_id: companyId 
  }]);
```

### Pour UPDATE
```typescript
const companyId = await getCurrentUserCompanyId();
if (!companyId) {
  throw new Error('Non autorisé');
}

const { error } = await supabase
  .from('table_name')
  .update({ field: value })
  .eq('id', recordId)
  .eq('company_id', companyId);
```

### Pour DELETE
```typescript
const companyId = await getCurrentUserCompanyId();
if (!companyId) {
  throw new Error('Non autorisé');
}

const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', recordId)
  .eq('company_id', companyId);
```

## ⚠️ Points d'attention

1. **Requêtes imbriquées** : Lorsqu'une requête charge des données liées (par exemple, charger les collections d'un client), toutes les requêtes doivent être filtrées.

2. **Génération de PDFs** : Les fichiers de génération PDF doivent s'assurer que toutes les données chargées sont filtrées par company_id. Aucun document ne doit contenir des données d'une autre entreprise.

3. **user_profile** : La table `user_profile` a maintenant un `company_id`. Il doit y avoir un seul profil par entreprise. Les requêtes doivent être filtrées et les insertions doivent inclure le company_id.

4. **RLS comme backup** : Les politiques RLS filtrent déjà par company_id au niveau base de données, mais il faut aussi filtrer côté application pour une sécurité renforcée.

## 🚨 Tables ou requêtes supposées "globales"

**Aucune table n'est globale.** Toutes les tables métier ont un `company_id` et doivent être filtrées.

## ❌ Requêtes impossibles à sécuriser automatiquement

**Aucune identifiée pour l'instant.** Toutes les requêtes peuvent être modifiées pour inclure le filtrage par company_id.

## 🔍 Points à vérifier manuellement

1. **Requêtes dans les composants partagés** : Vérifier `components/deposit-slip-dialog.tsx` et autres composants
2. **Hooks personnalisés** : Vérifier s'il existe des hooks qui font des requêtes Supabase
3. **Fonctions utilitaires** : Vérifier `lib/` pour des fonctions qui font des requêtes
4. **Requêtes avec jointures** : Vérifier que les jointures respectent l'isolation par company_id

## 📈 Statistiques

- **Total de requêtes identifiées** : 440+ dans les fichiers clients uniquement
- **Requêtes modifiées** : ~40
- **Requêtes restantes** : ~400+
- **Fichiers complétés** : 3/16
- **Fichiers en cours** : 13/16

## 🎯 Prochaines étapes recommandées

1. **Priorité 1** : Fichiers critiques de génération PDF
   - `lib/pdf-generators.ts`
   - `lib/pdf-generators-direct-invoice.ts`

2. **Priorité 2** : Fichiers clients volumineux
   - `app/clients/[id]/page.tsx`
   - `app/clients/[id]/stock/page.tsx`
   - `app/clients/[id]/documents/page.tsx`

3. **Priorité 3** : Fichiers clients moyens
   - `app/clients/[id]/credit-note/page.tsx`
   - `app/clients/[id]/invoice/page.tsx`

4. **Priorité 4** : Fichiers collections et profil
   - `app/collections/**/*.tsx`
   - `app/profile/page.tsx`

5. **Priorité 5** : Composants et autres
   - `components/deposit-slip-dialog.tsx`
   - Autres composants/services

