# 📋 Résumé Complet des Modifications : "Cartes" → "Stock"

## ✅ Migration SQL créée
**Fichier :** `supabase/migrations/20250215000006_rename_cards_to_stock.sql`

### Colonnes renommées :
- `invoices.total_cards_sold` → `invoices.total_stock_sold`
- `stock_updates.cards_sold` → `stock_updates.stock_sold`
- `stock_updates.cards_added` → `stock_updates.stock_added`

---

## 📝 Modifications appliquées

### 1. **Types TypeScript** (`lib/supabase.ts`)
- ✅ `cards_sold: number` → `stock_sold: number`
- ✅ `cards_added: number` → `stock_added: number`
- ✅ `total_cards_sold: number` → `total_stock_sold: number`
- ✅ `perProductForm: { cards_added: string }` → `{ stock_added: string }`
- ✅ `perSubProductForm: { cards_added: string }` → `{ stock_added: string }`
- ✅ Commentaire : `cards_sold x unit_price_ht` → `stock_sold x unit_price_ht`

### 2. **Variables Code** (camelCase)
- ✅ `cardsSold` → `stockSold`
- ✅ `cardsAdded` → `stockAdded`
- ✅ `totalCardsSold` → `totalStockSold`
- ✅ `totalCardsAdded` → `totalStockAdded`

### 3. **Propriétés d'objets** (snake_case)
- ✅ `cards_sold` → `stock_sold`
- ✅ `cards_added` → `stock_added`
- ✅ `total_cards_sold` → `total_stock_sold`

### 4. **Textes UI - Messages utilisateur**

#### **app/page.tsx**
- ✅ `"Gérez vos produits de cartes et leurs prix"` → `"Gérez vos produits et leurs prix"`

#### **app/products/page.tsx**
- ✅ `"Produits de cartes de vœux"` → `"Produits de vœux"`

#### **app/clients/page.tsx**
- ✅ `"Dépôts-ventes de cartes de vœux"` → `"Dépôts-ventes de produits"`

#### **app/layout.tsx**
- ✅ `"Application de gestion de dépôts-ventes de cartes de vœux"` → `"Application de gestion de dépôts-ventes"`

#### **app/clients/[id]/stock/page.tsx**
- ✅ `"aucune carte vendue"` → `"aucun stock vendu"`
- ✅ `"des cartes ont été vendues"` → `"du stock a été vendu"`
- ✅ `"des cartes sont vendues"` → `"du stock est vendu"`
- ✅ `"nombre de cartes reprises"` → `"quantité reprise"`
- ✅ `"Prix unitaire par carte"` → `"Prix unitaire par unité"`
- ✅ `"Nombre de cartes reprises"` → `"Quantité reprise"`
- ✅ `"{quantity} carte(s)"` → `"{quantity} unité(s)"`
- ✅ `"les nouvelles cartes"` → `"le nouveau stock"`
- ✅ `"{stock} cartes en stock"` → `"{stock} unité(s) en stock"`

#### **app/clients/[id]/documents/page.tsx**
- ✅ `"{invoice.total_cards_sold} carte(s) vendue(s)"` → `"{invoice.total_stock_sold} unité(s) vendue(s)"`
- ✅ `"{stockUpdate.total_cards_sold} carte(s) vendue(s)"` → `"{stockUpdate.stock_sold} unité(s) vendue(s)"`
- ✅ `"{stock} cartes en stock"` → `"{stock} unité(s) en stock"`
- ✅ Mêmes commentaires que stock/page.tsx

#### **app/clients/[id]/page.tsx**
- ✅ `"Cartes vendues"` → `"Stock vendu"`
- ✅ `"{stock} cartes en stock"` → `"{stock} unité(s) en stock"`
- ✅ Mêmes commentaires que stock/page.tsx

#### **components/stock-update-confirmation-dialog.tsx**
- ✅ `"Total cartes vendues"` → `"Total stock vendu"`
- ✅ `"Cartes vendues"` → `"Stock vendu"`
- ✅ `"Cartes ajoutées"` → `"Stock ajouté"`
- ✅ `"{quantity} carte(s)"` → `"{quantity} unité(s)"`

### 5. **Commentaires Code**
- ✅ `// Ne créer le stock_update QUE si des cartes ont été vendues` → `// Ne créer le stock_update QUE si du stock a été vendu`
- ✅ `// Calculer uniquement si des cartes sont vendues` → `// Calculer uniquement si du stock est vendu`
- ✅ `// Form per product: { cards_added }` → `// Form per product: { stock_added }`

### 6. **Fichiers PDF** (`lib/pdf-generators.ts`)
- ✅ `update.cards_sold` → `update.stock_sold`
- ✅ `update.cards_added` → `update.stock_added`
- ✅ `subProductStockUpdate.cards_added` → `subProductStockUpdate.stock_added`

### 7. **Fichiers Invoice** (`app/clients/[id]/invoice/page.tsx`)
- ✅ `total_cards_sold: totalQuantity` → `total_stock_sold: totalQuantity`

---

## 📊 Statistiques

- **Fichiers modifiés :** 12
- **Types TypeScript modifiés :** 5
- **Variables code modifiées :** ~150 occurrences
- **Textes UI modifiés :** ~25 occurrences
- **Commentaires modifiés :** ~10 occurrences

---

## ⚠️ À vérifier après migration SQL

Après avoir exécuté la migration SQL dans Supabase, vérifiez que :
1. Les colonnes ont bien été renommées dans la base de données
2. Les requêtes fonctionnent correctement
3. Les PDFs s'affichent correctement
4. Les factures s'affichent correctement

---

## ✅ Prochaines étapes

1. **Exécuter la migration SQL** dans Supabase
2. **Tester l'application** pour vérifier que tout fonctionne
3. **Vérifier les PDFs** générés
4. **Vérifier les factures** générées

