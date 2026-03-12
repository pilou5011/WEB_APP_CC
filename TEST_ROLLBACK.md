# Guide de test du système de rollback

## Méthode 1 : Simuler une erreur dans la génération PDF (RECOMMANDÉE)

### Pour les factures directes

Modifier temporairement `lib/pdf-generators-direct-invoice.ts` :

```typescript
export async function generateAndSaveDirectInvoicePDF(params: GenerateDirectInvoicePDFParams): Promise<void> {
  const { invoice, client, products, stockDirectSold, userProfile } = params;

  // 🧪 TEST ROLLBACK - Décommenter cette ligne pour tester
  // throw new Error('TEST: Simulated PDF generation failure');

  try {
    // ... reste du code
```

### Pour les factures avec stock updates

Modifier temporairement `lib/pdf-generators.ts` dans la fonction `generateAndSaveInvoicePDF` :

```typescript
export async function generateAndSaveInvoicePDF(params: GenerateInvoicePDFParams): Promise<void> {
  const { invoice, client, clientProducts, products, stockUpdates, adjustments, userProfile } = params;

  // 🧪 TEST ROLLBACK - Décommenter cette ligne pour tester
  // throw new Error('TEST: Simulated PDF generation failure');

  try {
    // ... reste du code
```

## Méthode 2 : Bloquer l'accès au storage Supabase

1. Ouvrir les DevTools du navigateur (F12)
2. Aller dans l'onglet "Network"
3. Filtrer par "storage"
4. Intercepter les requêtes vers Supabase Storage et les bloquer
5. Ou utiliser un outil comme Requestly pour bloquer les requêtes

## Méthode 3 : Utiliser les DevTools pour modifier le code à la volée

1. Ouvrir les DevTools (F12)
2. Aller dans l'onglet "Sources"
3. Trouver le fichier `pdf-generators-direct-invoice.ts` ou `pdf-generators.ts`
4. Ajouter un breakpoint et modifier le code pour lancer une erreur

## Méthode 4 : Créer un client de test avec des données invalides

Créer un client avec des données qui pourraient causer une erreur lors de la génération PDF (par exemple, des caractères spéciaux dans le nom).

## Ce qu'il faut vérifier après le test

1. ✅ La facture doit avoir `status = 'failed'` dans la base de données
2. ✅ Les entrées `stock_direct_sold` ou `stock_updates` doivent être supprimées
3. ✅ Les stocks dans `client_products` et `client_sub_products` doivent être restaurés à leur valeur précédente
4. ✅ Les `invoice_adjustments` doivent être supprimés
5. ✅ La facture ne doit PAS apparaître dans l'interface utilisateur (car filtrée par `status = 'completed'`)
6. ✅ Les logs doivent montrer le message de rollback dans la console

## Requête SQL pour vérifier les documents échoués

```sql
-- Voir toutes les factures échouées
SELECT id, client_id, status, created_at, invoice_pdf_path
FROM invoices
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Voir tous les avoirs échoués
SELECT id, invoice_id, client_id, status, created_at, credit_note_pdf_path
FROM credit_notes
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Vérifier qu'il n'y a pas de stock_updates liés à une facture échouée
SELECT su.*
FROM stock_updates su
INNER JOIN invoices i ON su.invoice_id = i.id
WHERE i.status = 'failed';

-- Vérifier qu'il n'y a pas de stock_direct_sold liés à une facture échouée
SELECT sds.*
FROM stock_direct_sold sds
INNER JOIN invoices i ON sds.invoice_id = i.id
WHERE i.status = 'failed';
```

## Nettoyage après le test

Après avoir testé, n'oubliez pas de :
1. Retirer les lignes de test ajoutées dans les fichiers PDF
2. Supprimer les documents de test avec `status = 'failed'` si nécessaire
3. Vérifier que les stocks sont cohérents

