# Guide de migration - Filtrage par company_id

## ⚠️ TÂCHE CRITIQUE EN COURS

Cette migration est en cours. Il reste **440+ requêtes** à modifier dans les fichiers clients.

## Pattern à appliquer

### Pour toutes les requêtes SELECT
```typescript
// AVANT
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .is('deleted_at', null);

// APRÈS
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

### Pour toutes les requêtes INSERT
```typescript
// AVANT
const { data, error } = await supabase
  .from('table_name')
  .insert([{ field1: value1, field2: value2 }]);

// APRÈS
const companyId = await getCurrentUserCompanyId();
if (!companyId) {
  throw new Error('Non autorisé');
}

const { data, error } = await supabase
  .from('table_name')
  .insert([{ 
    field1: value1, 
    field2: value2,
    company_id: companyId 
  }]);
```

### Pour toutes les requêtes UPDATE
```typescript
// AVANT
const { error } = await supabase
  .from('table_name')
  .update({ field: value })
  .eq('id', recordId);

// APRÈS
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

### Pour toutes les requêtes DELETE
```typescript
// AVANT
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', recordId);

// APRÈS
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

## Fichiers modifiés

### ✅ Complétés partiellement
- [x] app/clients/page.tsx - loadClients() modifié
- [x] app/clients/new/page.tsx - loadEstablishmentTypes(), loadPaymentMethods(), insert client modifiés
- [ ] app/clients/new/page.tsx - **RESTE À FAIRE** : toutes les autres requêtes (payment_methods, establishment_types CRUD)

### ⏳ En attente
- [ ] app/clients/[id]/page.tsx - **112 requêtes**
- [ ] app/clients/[id]/stock/page.tsx - **112 requêtes**
- [ ] app/clients/[id]/documents/page.tsx - **112 requêtes**
- [ ] app/clients/[id]/credit-note/page.tsx - **13 requêtes**
- [ ] app/clients/[id]/invoice/page.tsx - **13 requêtes**
- [ ] app/clients/[id]/info/page.tsx - **43 requêtes**
- [ ] app/collections/page.tsx
- [ ] app/collections/new/page.tsx
- [ ] app/collections/[id]/page.tsx
- [ ] app/profile/page.tsx
- [ ] lib/pdf-generators.ts
- [ ] lib/pdf-generators-direct-invoice.ts
- [ ] lib/pdf-storage.ts
- [ ] components/deposit-slip-dialog.tsx

## Notes importantes

1. **Import obligatoire** : Ajouter `import { getCurrentUserCompanyId } from '@/lib/auth-helpers';` en haut de chaque fichier
2. **Vérification systématique** : Toujours vérifier `companyId` avant chaque requête
3. **RLS comme backup** : Les politiques RLS filtrent déjà par company_id, mais il faut aussi filtrer côté application pour la sécurité

## Prochaines étapes

1. Continuer avec app/clients/new/page.tsx (requêtes payment_methods et establishment_types)
2. Puis app/clients/[id]/info/page.tsx (plus simple, moins de requêtes)
3. Puis les fichiers les plus complexes (page.tsx, stock/page.tsx, documents/page.tsx)

