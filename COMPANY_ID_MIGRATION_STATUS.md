# État d'avancement - Migration company_id

## ✅ Fichiers complétés

### app/clients/page.tsx
- ✅ loadClients() - Filtrage par company_id ajouté

### app/clients/new/page.tsx
- ✅ loadEstablishmentTypes() - Filtrage par company_id ajouté
- ✅ loadPaymentMethods() - Filtrage par company_id ajouté
- ✅ Insert client - company_id ajouté
- ✅ Toutes les requêtes payment_methods (CRUD) - Filtrage par company_id ajouté
- ✅ Toutes les requêtes establishment_types (CRUD) - Filtrage par company_id ajouté

### app/clients/[id]/info/page.tsx
- ✅ loadClient() - Filtrage par company_id ajouté
- ✅ loadEstablishmentTypes() - Filtrage par company_id ajouté
- ✅ loadPaymentMethods() - Filtrage par company_id ajouté
- ✅ Update client - Filtrage par company_id ajouté
- ✅ Delete client - Filtrage par company_id ajouté
- ✅ Toutes les requêtes payment_methods (CRUD) - Filtrage par company_id ajouté
- ✅ Toutes les requêtes establishment_types (CRUD) - Filtrage par company_id ajouté

## ⏳ Fichiers en cours / à faire

### app/clients/[id]/page.tsx - **112 requêtes**
- ⚠️ CRITIQUE - Fichier très volumineux avec beaucoup de requêtes
- Nécessite une modification systématique de toutes les requêtes

### app/clients/[id]/stock/page.tsx - **112 requêtes**
- ⚠️ CRITIQUE - Fichier très volumineux avec beaucoup de requêtes
- Nécessite une modification systématique de toutes les requêtes

### app/clients/[id]/documents/page.tsx - **112 requêtes**
- ⚠️ CRITIQUE - Fichier très volumineux avec beaucoup de requêtes
- Nécessite une modification systématique de toutes les requêtes

### app/clients/[id]/credit-note/page.tsx - **13 requêtes**
- À modifier

### app/clients/[id]/invoice/page.tsx - **13 requêtes**
- À modifier

### app/collections/page.tsx
- À modifier

### app/collections/new/page.tsx
- À modifier

### app/collections/[id]/page.tsx
- À modifier

### app/profile/page.tsx
- ⚠️ IMPORTANT - user_profile doit être filtré par company_id

### lib/pdf-generators.ts
- ⚠️ CRITIQUE - Génération de PDFs, doit filtrer toutes les données par company_id

### lib/pdf-generators-direct-invoice.ts
- ⚠️ CRITIQUE - Génération de PDFs, doit filtrer toutes les données par company_id

### lib/pdf-storage.ts
- À vérifier

### components/deposit-slip-dialog.tsx
- À modifier

## 📊 Statistiques

- **Total de requêtes identifiées** : 440+ dans les fichiers clients uniquement
- **Requêtes modifiées** : ~30
- **Requêtes restantes** : ~410+

## ⚠️ Points d'attention

1. **Fichiers volumineux** : Les fichiers `app/clients/[id]/page.tsx`, `stock/page.tsx`, et `documents/page.tsx` contiennent chacun 112 requêtes. Ils nécessitent une attention particulière.

2. **Génération de PDFs** : Les fichiers `lib/pdf-generators*.ts` sont critiques car ils génèrent des documents. Toutes les données doivent être filtrées par company_id.

3. **user_profile** : La table `user_profile` a maintenant un `company_id`. Il faut s'assurer qu'un seul profil existe par entreprise.

4. **Requêtes imbriquées** : Certaines requêtes peuvent charger des données liées (collections, sub_products, etc.). Toutes doivent être filtrées.

## 🔄 Prochaines étapes recommandées

1. Continuer avec les fichiers les plus simples (credit-note, invoice)
2. Puis traiter les fichiers volumineux (page.tsx, stock/page.tsx, documents/page.tsx)
3. Enfin, les fichiers de génération PDF et les composants

