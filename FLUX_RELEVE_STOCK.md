# Flux de données : Relevé de stock depuis l'historique

## Vue d'ensemble

Lorsque vous cliquez sur le bouton "Relevé de stock" dans l'historique des documents de la page client, voici comment les informations sont retrouvées et affichées :

## 1. Source des données dans l'historique

### Stockage dans l'état React

Les mises à jour de stock **sans facture** sont stockées dans l'état `stockUpdatesWithoutInvoice` :

```typescript
// app/clients/[id]/page.tsx - ligne 288
const [stockUpdatesWithoutInvoice, setStockUpdatesWithoutInvoice] = useState<Array<{
  id: string;                    // ID généré : `stock-update-${Date.now()}`
  created_at: string;            // Date de création
  total_cards_sold: number;      // Total des cartes vendues
  total_amount: number;          // Montant total (0 si pas de facture)
  stockUpdates: StockUpdate[];   // ⭐ Tableau des stock_updates de cette transaction
}>>([]);
```

### Quand ces données sont créées

Lors d'une mise à jour de stock **sans facture** (ligne 1439) :

```typescript
setStockUpdatesWithoutInvoice(prev => [...prev, {
  id: `stock-update-${Date.now()}`,
  created_at: new Date().toISOString(),
  total_cards_sold: totalCardsSold,
  total_amount: 0,
  stockUpdates: insertedStockUpdates  // ⭐ Les stock_updates insérés en base
}]);
```

**Important** : Les `stockUpdates` stockés dans cet état sont les **mêmes** que ceux insérés dans la table `stock_updates` de Supabase.

## 2. Clic sur "Relevé de stock" dans l'historique

### Code du bouton (ligne 2739)

```typescript
<Button
  onClick={() => {
    // 1. Créer une facture temporaire pour le dialog
    const tempInvoice = {
      id: '',  // Chaîne vide (pas de facture réelle)
      client_id: clientId,
      total_cards_sold: stockUpdate.total_cards_sold,
      total_amount: 0,
      created_at: stockUpdate.created_at
    } as Invoice;
    
    // 2. Stocker les stockUpdates de l'historique
    setSelectedInvoiceForStockReport(tempInvoice);
    setStockUpdatesFromHistory(stockUpdate.stockUpdates);  // ⭐ ICI
    setStockUpdatesForDialog(stockUpdate.stockUpdates);
    
    // 3. Ouvrir le dialog
    setTimeout(() => {
      setStockReportDialogOpen(true);
    }, 0);
  }}
>
  Relevé de stock
</Button>
```

**Source des données** : `stockUpdate.stockUpdates` provient directement de l'état `stockUpdatesWithoutInvoice` (ligne 2631).

## 3. Passage des données au dialog

### Logique de sélection (ligne 3006)

Le composant `StockReportDialog` reçoit les `stockUpdates` via une fonction qui détermine la source :

```typescript
stockUpdates={(() => {
  // Si facture existe (ID non vide)
  if (selectedInvoiceForStockReport.id && selectedInvoiceForStockReport.id.trim() !== '') {
    // Utiliser les stock_updates filtrés par invoice_id depuis la base
    return stockUpdates.filter(u => u.invoice_id === selectedInvoiceForStockReport.id);
  } else {
    // ⭐ Priorité 1: stockUpdatesFromHistory (depuis l'historique)
    if (stockUpdatesFromHistory.length > 0) {
      return stockUpdatesFromHistory;  // ⭐ Utilisé pour les relevés sans facture
    }
    // Priorité 2: stockUpdatesForDialog
    if (stockUpdatesForDialog.length > 0) {
      return stockUpdatesForDialog;
    }
    // Priorité 3: recentStockUpdatesWithoutInvoice (fallback)
    return recentStockUpdatesWithoutInvoice;
  }
})()}
```

**Pour les relevés sans facture depuis l'historique** : `stockUpdatesFromHistory` est utilisé.

## 4. Génération du PDF dans le dialog

### Création des maps (ligne 402)

Le dialog crée des maps pour retrouver rapidement les `stock_updates` par collection/sous-produit :

```typescript
const stockUpdatesByCollectionId = new Map<string, StockUpdate>();
const stockUpdatesBySubProductId = new Map<string, StockUpdate>();

stockUpdates.forEach(update => {
  if (update.collection_id) {
    stockUpdatesByCollectionId.set(update.collection_id, update);
  }
  if (update.sub_product_id) {
    stockUpdatesBySubProductId.set(update.sub_product_id, update);
  }
});
```

### Récupération des valeurs pour chaque collection (ligne 503)

Pour chaque collection dans `clientCollections` :

```typescript
// 1. Chercher le stock_update correspondant
const stockUpdate = stockUpdatesByCollectionId.get(cc.collection_id || '');

// 2. Si trouvé : utiliser ses valeurs
if (stockUpdate) {
  previousStock = stockUpdate.previous_stock;
  countedStock = stockUpdate.counted_stock;
  reassort = stockUpdate.cards_added;
  newDeposit = stockUpdate.new_stock;
} else {
  // 3. Si pas trouvé : utiliser le dernier new_stock de l'historique
  const lastNewStock = lastNewStockByCollectionId.get(cc.collection_id || '') || 0;
  previousStock = lastNewStock;
  countedStock = lastNewStock;
  reassort = 0;
  newDeposit = lastNewStock;
}
```

### Chargement de l'historique (ligne 422)

Le dialog charge aussi l'historique complet depuis Supabase pour trouver le dernier `new_stock` :

```typescript
const { data: historicalStockUpdates } = await supabase
  .from('stock_updates')
  .select('*')
  .eq('client_id', client.id)
  .order('created_at', { ascending: false });
```

Cet historique est utilisé **uniquement** si aucun `stock_update` n'est trouvé dans les `stockUpdates` passés en prop.

## 5. Résumé du flux

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Mise à jour de stock (sans facture)                      │
│    → insertedStockUpdates créés en base                     │
│    → stockUpdatesWithoutInvoice mis à jour                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Affichage dans l'historique                               │
│    → stockUpdatesWithoutInvoice.map()                        │
│    → stockUpdate.stockUpdates contient les données          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Clic sur "Relevé de stock"                                │
│    → setStockUpdatesFromHistory(stockUpdate.stockUpdates)   │
│    → setStockReportDialogOpen(true)                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. StockReportDialog reçoit les données                      │
│    → stockUpdates = stockUpdatesFromHistory                  │
│    → Création des maps par collection_id                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Génération du PDF                                         │
│    → Pour chaque collection :                                │
│      - Chercher dans stockUpdatesByCollectionId              │
│      - Si trouvé : utiliser les valeurs du stock_update      │
│      - Sinon : utiliser le dernier new_stock de l'historique │
└─────────────────────────────────────────────────────────────┘
```

## Points importants

1. **Source unique** : Les `stockUpdates` passés au dialog proviennent de l'état React `stockUpdatesWithoutInvoice`, qui contient les mêmes données que celles insérées en base.

2. **Pas de requête Supabase** : Pour les relevés sans facture depuis l'historique, les données viennent directement de l'état React, **pas d'une requête Supabase**.

3. **Historique Supabase** : L'historique chargé depuis Supabase (ligne 422) est utilisé uniquement comme **fallback** si aucun `stock_update` n'est trouvé dans les `stockUpdates` passés en prop.

4. **Problème potentiel** : Si `stockUpdatesFromHistory` est vide ou si les `collection_id` ne correspondent pas, le dialog utilisera le dernier `new_stock` de l'historique au lieu des valeurs du `stock_update`.

## Vérification

Pour vérifier que les bonnes données sont utilisées, consultez les logs dans la console :

- `[History] Opening stock report dialog` : montre les `stockUpdates` de l'historique
- `[StockReportDialog] Using stockUpdatesFromHistory` : confirme l'utilisation de cette source
- `Collection X - Recherche stock_update` : indique si le `stock_update` est trouvé

