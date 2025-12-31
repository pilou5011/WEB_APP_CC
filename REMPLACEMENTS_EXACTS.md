# Remplacements Exactes - Collection → Product

## ⚠️ RÈGLE D'OR : Respecter la casse exacte !

---

## Fichier : `app/clients/[id]/page.tsx`

### Remplacements à faire (dans VS Code avec Ctrl+H) :

#### 1. Types et composants (majuscule)
- `Collection` → `Product` (avec "Match Whole Word" activé)
- `ClientCollection` → `ClientProduct` (avec "Match Whole Word" activé)
- `SortableCollectionRow` → `SortableProductRow`
- `collectionSubProducts` → `productSubProducts`

#### 2. Variables camelCase
- `collection_id` → `product_id`
- `collection_info` → `product_info`
- `collectionId` → `productId`
- `collectionComboboxOpen` → `productComboboxOpen`
- `setCollectionComboboxOpen` → `setProductComboboxOpen`
- `selectedCollectionHasSubProducts` → `selectedProductHasSubProducts`
- `setSelectedCollectionHasSubProducts` → `setSelectedProductHasSubProducts`
- `deleteCollectionDialogOpen` → `deleteProductDialogOpen`
- `setDeleteCollectionDialogOpen` → `setDeleteProductDialogOpen`
- `reorderedCollections` → `reorderedProducts`

#### 3. Chaînes littérales (dans le code)
- `'collection'` → `'product'` (dans `type: 'collection' | 'sub-product'`)
- `"collection"` → `"product"`

#### 4. Textes français (minuscules)
- `collection` → `produit` (dans les commentaires et textes)
  - Exemple : `// Component for sortable collection row` → `// Component for sortable product row`
  - Exemple : `// Delete collection dialog` → `// Delete product dialog`
  - Exemple : `// Check if selected collection has sub-products` → `// Check if selected product has sub-products`
  - Exemple : `// Load all collections` → `// Load all products`
  - Exemple : `// Update all collections` → `// Update all products`

#### 5. Textes français (avec majuscule)
- `Collection` → `Produit` (dans les textes UI)
- `Collections` → `Produits` (dans les textes UI)
- `'Ordre des collections mis à jour'` → `'Ordre des produits mis à jour'`
- `'Error updating collection order'` → `'Error updating product order'`

#### 6. Propriétés d'objets
- `.collection_id` → `.product_id`
- `associateForm.collection_id` → `associateForm.product_id`

---

## Fichier : `app/clients/[id]/invoice/page.tsx`

Même logique - vérifier les occurrences spécifiques dans ce fichier.

---

## Fichier : `app/clients/[id]/documents/page.tsx`

Même logique - vérifier les occurrences spécifiques dans ce fichier.

---

## Technique VS Code

1. **Ouvrir le fichier**
2. **Ctrl+H** (Rechercher et Remplacer)
3. **Activer "Match Case"** ✅ (important !)
4. **Pour les types/variables** : Activer "Match Whole Word" ✅
5. **Pour les chaînes/commentaires** : Désactiver "Match Whole Word" ❌

### Ordre recommandé :
1. Types (`Collection` → `Product`)
2. Variables camelCase (`collectionId` → `productId`)
3. Chaînes littérales (`'collection'` → `'product'`)
4. Textes français (`collection` → `produit`)
5. Propriétés (`.collection_id` → `.product_id`)

---

## Vérification finale

Après chaque fichier, faire une recherche globale :
- Recherche : `collection` (sans "Match Case")
- Si des résultats apparaissent, vérifier le contexte et remplacer manuellement

