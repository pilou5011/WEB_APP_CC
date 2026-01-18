# Remplacements : "Cartes" → "Stock" / "Produits"

## ✅ Migration SQL créée
**Fichier :** `supabase/migrations/20250215000006_rename_cards_to_stock.sql`

Cette migration renomme :
- `invoices.total_cards_sold` → `invoices.total_stock_sold`
- `stock_updates.cards_sold` → `stock_updates.stock_sold`
- `stock_updates.cards_added` → `stock_updates.stock_added`

---

## 📋 Messages UI à modifier

### 1. **app/page.tsx** (ligne 456)
**Actuel :**
```typescript
Gérez vos produits de cartes et leurs prix
```
**Proposé :**
```typescript
Gérez vos produits et leurs prix
```
**Raison :** "produits de cartes" est redondant, "produits" suffit.

---

### 2. **app/clients/[id]/stock/page.tsx**

#### Ligne 1386-1387 (Commentaire)
**Actuel :**
```typescript
// IMPORTANT: Ne créer le stock_update pour le produit parent QUE si des cartes ont été vendues
// (totalCardsSold > 0). Si aucune carte n'est vendue, pas de ligne dans stock_updates.
```
**Proposé :**
```typescript
// IMPORTANT: Ne créer le stock_update pour le produit parent QUE si du stock a été vendu
// (totalStockSold > 0). Si aucun stock n'est vendu, pas de ligne dans stock_updates.
```

#### Ligne 1430 (Commentaire)
**Actuel :**
```typescript
// Calculer unit_price_ht et total_amount_ht uniquement si une facture est générée et des cartes sont vendues
```
**Proposé :**
```typescript
// Calculer unit_price_ht et total_amount_ht uniquement si une facture est générée et du stock est vendu
```

#### Ligne 1661 (Toast)
**Actuel :**
```typescript
toast.success('Stock mis à jour (aucune carte vendue, aucune facture créée)');
```
**Proposé :**
```typescript
toast.success('Stock mis à jour (aucun stock vendu, aucune facture créée)');
```

#### Ligne 3262 (Texte UI)
**Actuel :**
```typescript
Ajoutez une opération de reprise de stock avec le prix unitaire et le nombre de cartes reprises
```
**Proposé :**
```typescript
Ajoutez une opération de reprise de stock avec le prix unitaire et la quantité reprise
```

#### Ligne 3284 (Affichage)
**Actuel :**
```typescript
{a.quantity} carte(s) × {displayPrice.toFixed(2)} € = {totalAmount} €
```
**Proposé :**
```typescript
{a.quantity} unité(s) × {displayPrice.toFixed(2)} € = {totalAmount} €
```
**Alternative :**
```typescript
Quantité : {a.quantity} × {displayPrice.toFixed(2)} € = {totalAmount} €
```

#### Ligne 3312 (Label)
**Actuel :**
```typescript
Saisissez le nom de l'opération, le prix unitaire par carte et le nombre de cartes reprises
```
**Proposé :**
```typescript
Saisissez le nom de l'opération, le prix unitaire par unité et la quantité reprise
```

#### Ligne 3328 (Label)
**Actuel :**
```typescript
<Label htmlFor="adj-unit-price">Prix unitaire par carte (€)</Label>
```
**Proposé :**
```typescript
<Label htmlFor="adj-unit-price">Prix unitaire par unité (€)</Label>
```

#### Ligne 3347 (Label)
**Actuel :**
```typescript
<Label htmlFor="adj-quantity">Nombre de cartes reprises</Label>
```
**Proposé :**
```typescript
<Label htmlFor="adj-quantity">Quantité reprise</Label>
```

#### Ligne 3561 (Texte UI)
**Actuel :**
```typescript
Comptez le stock restant et ajoutez les nouvelles cartes pour chaque produit
```
**Proposé :**
```typescript
Comptez le stock restant et ajoutez le nouveau stock pour chaque produit
```

#### Ligne 3607 (Alerte)
**Actuel :**
```typescript
⚠️ Attention : Ce produit a encore {productToDelete.current_stock} cartes en stock.
```
**Proposé :**
```typescript
⚠️ Attention : Ce produit a encore {productToDelete.current_stock} unité(s) en stock.
```

---

### 3. **app/clients/[id]/documents/page.tsx**

#### Lignes 1385-1386 (Commentaires) - Identiques à stock/page.tsx
**Proposé :** Même remplacement que ci-dessus

#### Ligne 1429 (Commentaire) - Identique à stock/page.tsx
**Proposé :** Même remplacement que ci-dessus

#### Ligne 1661 (Toast) - Identique à stock/page.tsx
**Proposé :** Même remplacement que ci-dessus

#### Ligne 2981 (Affichage)
**Actuel :**
```typescript
<span>{invoice.total_cards_sold} carte{invoice.total_cards_sold > 1 ? 's' : ''} vendue{invoice.total_cards_sold > 1 ? 's' : ''}</span>
```
**Proposé :**
```typescript
<span>{invoice.total_stock_sold} unité{invoice.total_stock_sold > 1 ? 's' : ''} vendue{invoice.total_stock_sold > 1 ? 's' : ''}</span>
```
**Note :** Il faudra aussi mettre à jour la référence à `total_cards_sold` → `total_stock_sold`

#### Ligne 3062 (Affichage)
**Actuel :**
```typescript
<span>{stockUpdate.total_cards_sold} carte{stockUpdate.total_cards_sold > 1 ? 's' : ''} vendue{stockUpdate.total_cards_sold > 1 ? 's' : ''}</span>
```
**Proposé :**
```typescript
<span>{stockUpdate.stock_sold} unité{stockUpdate.stock_sold > 1 ? 's' : ''} vendue{stockUpdate.stock_sold > 1 ? 's' : ''}</span>
```
**Note :** Il faudra aussi mettre à jour la référence à `cards_sold` → `stock_sold`

#### Ligne 3158 (Alerte) - Identique à stock/page.tsx
**Proposé :** Même remplacement que ci-dessus

---

### 4. **app/clients/[id]/page.tsx**

#### Lignes 1387-1388, 1431, 1670 (Commentaires/Toast) - Identiques à stock/page.tsx
**Proposé :** Même remplacement que ci-dessus

#### Ligne 3126 (Label)
**Actuel :**
```typescript
<span>Cartes vendues</span>
```
**Proposé :**
```typescript
<span>Stock vendu</span>
```

#### Ligne 3250 (Alerte) - Identique à stock/page.tsx
**Proposé :** Même remplacement que ci-dessus

---

### 5. **app/products/page.tsx** (ligne 580)
**Actuel :**
```typescript
<p className="text-slate-600">Produits de cartes de vœux</p>
```
**Proposé :**
```typescript
<p className="text-slate-600">Produits de vœux</p>
```
**Alternative :**
```typescript
<p className="text-slate-600">Catalogue de produits</p>
```

---

### 6. **app/clients/page.tsx** (ligne 194)
**Actuel :**
```typescript
<p className="text-slate-600">Dépôts-ventes de cartes de vœux</p>
```
**Proposé :**
```typescript
<p className="text-slate-600">Dépôts-ventes de produits</p>
```
**Alternative :**
```typescript
<p className="text-slate-600">Gestion de dépôts-ventes</p>
```

---

### 7. **app/layout.tsx** (ligne 10)
**Actuel :**
```typescript
description: 'Application de gestion de dépôts-ventes de cartes de vœux',
```
**Proposé :**
```typescript
description: 'Application de gestion de dépôts-ventes',
```
**Alternative :**
```typescript
description: 'Application de gestion de dépôts-ventes de produits',
```

---

### 8. **components/stock-update-confirmation-dialog.tsx**

#### Ligne 98 (Label)
**Actuel :**
```typescript
<span className="text-sm font-medium">Total cartes vendues</span>
```
**Proposé :**
```typescript
<span className="text-sm font-medium">Total stock vendu</span>
```

#### Ligne 200 (Label)
**Actuel :**
```typescript
<span className="text-slate-500 block mb-1">Cartes vendues</span>
```
**Proposé :**
```typescript
<span className="text-slate-500 block mb-1">Stock vendu</span>
```

#### Ligne 208 (Label)
**Actuel :**
```typescript
<span className="text-slate-500 block mb-1">Cartes ajoutées</span>
```
**Proposé :**
```typescript
<span className="text-slate-500 block mb-1">Stock ajouté</span>
```

#### Ligne 242 (Affichage)
**Actuel :**
```typescript
{quantity} carte{quantity > 1 ? 's' : ''} × {unitPrice.toFixed(2)} €
```
**Proposé :**
```typescript
{quantity} unité{quantity > 1 ? 's' : ''} × {unitPrice.toFixed(2)} €
```

#### Ligne 275 (Label)
**Actuel :**
```typescript
<span>Total cartes vendues</span>
```
**Proposé :**
```typescript
<span>Total stock vendu</span>
```

---

## 🔧 Variables Code à modifier

### Dans les fichiers TypeScript, remplacer :
- `total_cards_sold` → `total_stock_sold` (dans invoices)
- `cards_sold` → `stock_sold` (dans stock_updates)
- `cards_added` → `stock_added` (dans stock_updates)
- `totalCardsSold` → `totalStockSold` (variables camelCase)

---

## ✅ Résumé des actions

1. ✅ **Migration SQL créée** : `20250215000006_rename_cards_to_stock.sql`
2. ⏳ **À faire** : Mettre à jour les références de colonnes dans le code TypeScript
3. ⏳ **À faire** : Remplacer tous les textes UI mentionnant "cartes"

---

## 📝 Notes

- Les termes "unité(s)" ou "quantité" sont proposés pour remplacer "carte(s)"
- "Stock vendu" remplace "Cartes vendues"
- "Produits" remplace "produits de cartes" (plus générique)
- Les commentaires techniques sont aussi mis à jour pour cohérence

Souhaitez-vous que j'applique ces modifications automatiquement ?

