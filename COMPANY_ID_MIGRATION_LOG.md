# Journal de migration - Filtrage par company_id

## Fichiers modifiés

### ✅ Complétés
- [ ] app/clients/page.tsx
- [ ] app/clients/new/page.tsx
- [ ] app/clients/[id]/page.tsx
- [ ] app/clients/[id]/info/page.tsx
- [ ] app/clients/[id]/stock/page.tsx
- [ ] app/clients/[id]/documents/page.tsx
- [ ] app/clients/[id]/credit-note/page.tsx
- [ ] app/clients/[id]/invoice/page.tsx
- [ ] app/collections/page.tsx
- [ ] app/collections/new/page.tsx
- [ ] app/collections/[id]/page.tsx
- [ ] app/profile/page.tsx
- [ ] lib/pdf-generators.ts
- [ ] lib/pdf-generators-direct-invoice.ts
- [ ] lib/pdf-storage.ts
- [ ] components/deposit-slip-dialog.tsx

## Notes importantes

### Tables globales (sans company_id)
Aucune table n'est globalement accessible. Toutes les tables métier ont un company_id.

### Requêtes impossibles à sécuriser automatiquement
Aucune identifiée pour l'instant.

### Points à vérifier manuellement
- Les requêtes dans les composants partagés
- Les hooks personnalisés
- Les fonctions utilitaires

