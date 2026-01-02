# Guide de Remplacements : Collection → Product

## ⚠️ IMPORTANT : Respecter la casse exacte !

### Fichiers à traiter :
1. `app/clients/[id]/page.tsx` (207 occurrences)
2. `app/clients/[id]/invoice/page.tsx` (53 occurrences)
3. `app/clients/[id]/documents/page.tsx` (297 occurrences)

---

## Remplacements à effectuer (dans l'ordre indiqué)

### 1. Types TypeScript (avec majuscule)
- `Collection` → `Product`
- `CollectionCategory` → `ProductCategory`
- `CollectionSubcategory` → `ProductSubcategory`
- `ClientCollection` → `ClientProduct`

### 2. Variables et propriétés (camelCase)
- `collection_id` → `product_id`
- `collection_info` → `product_info`
- `collection_name` → `product_name`
- `collectionName` → `productName`
- `collectionData` → `productData`
- `collectionInfos` → `productInfos`
- `perCollectionForm` → `perProductForm`
- `clientCollections` → `clientProducts`
- `clientCollection` → `clientProduct`
- `sortedCollections` → `sortedProducts`
- `processedCollections` → `processedProducts`
- `allCollections` → `allProducts`
- `collectionsData` → `productsData`
- `collectionsError` → `productsError`
- `setAllCollections` → `setAllProducts`
- `ccData` → `cpData`
- `ccError` → `cpError`
- `ccWithTyped` → `cpWithTyped`
- `collectionToDelete` → `productToDelete`
- `deletingCollection` → `deletingProduct`
- `collectionToEdit` → `productToEdit`
- `deleteCollectionDialogOpen` → `deleteProductDialogOpen`
- `setDeleteCollectionDialogOpen` → `setDeleteProductDialogOpen`
- `handleDeleteCollectionClick` → `handleDeleteProductClick`
- `prepareCollectionUpdates` → `prepareProductUpdates`
- `subProductsByCollection` → `subProductsByProduct`
- `selectedCollectionHasSubProducts` → `selectedProductHasSubProducts`
- `setSelectedCollectionHasSubProducts` → `setSelectedProductHasSubProducts`
- `collectionComboboxOpen` → `productComboboxOpen`
- `setCollectionComboboxOpen` → `setProductComboboxOpen`
- `collectionId` → `productId`
- `collectionInfo` → `productInfo`
- `setPerCollectionForm` → `setPerProductForm`
- `setClientCollections` → `setClientProducts`
- `reorderedCollections` → `reorderedProducts`

### 3. Tables Supabase (chaînes exactes)
- `.from('collections')` → `.from('products')`
- `.from("collections")` → `.from("products")`
- `.from('client_collections')` → `.from('client_products')`
- `.from("client_collections")` → `.from("client_products")`
- `.from('collection_categories')` → `.from('product_categories')`
- `.from("collection_categories")` → `.from("product_categories")`
- `.from('collection_subcategories')` → `.from('product_subcategories')`
- `.from("collection_subcategories")` → `.from("product_subcategories")`
- `collection:collections` → `product:products`
- `collection:Collection` → `product:Product`

### 4. Routes (chaînes exactes)
- `/collections` → `/products`
- `/collections/` → `/products/`

### 5. Propriétés d'objets (avec point ou deux-points)
- `.collection` → `.product` (attention : seulement si suivi d'un espace, point, ou fin de ligne)
- `: Collection` → `: Product`
- `: ClientCollection` → `: ClientProduct`
- `collection?:` → `product?:`
- `collection:` → `product:`
- `collections:` → `products:`

### 6. Textes français dans l'UI (respecter la casse)
- `les collections` → `les produits`
- `des collections` → `des produits`
- `une collection` → `un produit`
- `la collection` → `le produit`
- `Cette collection` → `Ce produit`
- `cette collection` → `ce produit`
- `pour la collection` → `pour le produit`
- `de la collection` → `du produit`
- `de cette collection` → `de ce produit`
- `la collection parent` → `le produit parent`
- `la collection du client` → `le produit du client`
- `Supprimer la collection` → `Supprimer le produit`
- `supprimer la collection` → `supprimer le produit`
- `Ordre des collections` → `Ordre des produits`
- `ordre des collections` → `ordre des produits`
- `Gestion des Collections` → `Gestion des Produits`
- `gestion des collections` → `gestion des produits`
- `Collections` → `Produits` (mot entier avec majuscule)
- `Collection` → `Produit` (mot entier avec majuscule)
- `collections` → `produits` (mot entier en minuscules)
- `collection` → `produit` (mot entier en minuscules)

### 7. Variables avec préfixe/suffixe (attention au contexte)
- `cc.collection` → `cp.product`
- `cc.collection_id` → `cp.product_id`
- `cc.collection_info` → `cp.product_info`
- `cc: ClientCollection` → `cp: ClientProduct`
- `cc: Collection` → `cp: Product`

---

## Ordre recommandé pour VS Code

Dans VS Code, utilisez la fonction "Rechercher et Remplacer" (Ctrl+H) avec ces options :
- ✅ Activer "Match Case" (respecter la casse)
- ✅ Activer "Match Whole Word" (mot entier) pour les remplacements de types/variables
- ❌ Désactiver "Match Whole Word" pour les remplacements dans les chaînes/commentaires

### Ordre d'exécution :
1. D'abord les types (Collection → Product, etc.)
2. Ensuite les variables camelCase
3. Puis les tables Supabase
4. Enfin les textes français

---

## Vérification après remplacement

Après chaque fichier, vérifiez qu'il n'y a plus d'occurrences :
- Recherche : `collection` (sans respecter la casse)
- Recherche : `Collection` (avec majuscule)

Si des occurrences subsistent, vérifiez le contexte pour décider du remplacement approprié.

