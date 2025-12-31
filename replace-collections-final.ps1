# Script PowerShell pour remplacer toutes les occurrences de "collection" par "product"
# dans les fichiers clients restants

$files = @(
    "app\clients\[id]\page.tsx",
    "app\clients\[id]\invoice\page.tsx",
    "app\clients\[id]\documents\page.tsx"
)

foreach ($filePath in $files) {
    $fullPath = Join-Path (Get-Location) $filePath
    if (Test-Path $fullPath) {
        Write-Host "Processing $filePath..."
        $content = Get-Content $fullPath -Raw -Encoding UTF8
        
        # Types et imports
        $content = $content -replace '\bCollection\b', 'Product'
        $content = $content -replace '\bCollectionCategory\b', 'ProductCategory'
        $content = $content -replace '\bCollectionSubcategory\b', 'ProductSubcategory'
        $content = $content -replace '\bClientCollection\b', 'ClientProduct'
        
        # Variables et propriétés
        $content = $content -replace '\bcollection_id\b', 'product_id'
        $content = $content -replace '\bcollection_info\b', 'product_info'
        $content = $content -replace '\bcollection_name\b', 'product_name'
        $content = $content -replace '\bcollectionName\b', 'productName'
        $content = $content -replace '\bcollectionData\b', 'productData'
        $content = $content -replace '\bcollectionInfos\b', 'productInfos'
        $content = $content -replace '\bperCollectionForm\b', 'perProductForm'
        $content = $content -replace '\bclientCollections\b', 'clientProducts'
        $content = $content -replace '\bclientCollection\b', 'clientProduct'
        $content = $content -replace '\bsortedCollections\b', 'sortedProducts'
        $content = $content -replace '\bprocessedCollections\b', 'processedProducts'
        $content = $content -replace '\ballCollections\b', 'allProducts'
        $content = $content -replace '\bcollectionToDelete\b', 'productToDelete'
        $content = $content -replace '\bdeletingCollection\b', 'deletingProduct'
        $content = $content -replace '\bcollectionToEdit\b', 'productToEdit'
        $content = $content -replace '\bcollectionSubProducts\b', 'productSubProducts'
        $content = $content -replace '\bselectedCollectionHasSubProducts\b', 'selectedProductHasSubProducts'
        $content = $content -replace '\bcollectionComboboxOpen\b', 'productComboboxOpen'
        $content = $content -replace '\bsetCollectionToDelete\b', 'setProductToDelete'
        $content = $content -replace '\bsetDeletingCollection\b', 'setDeletingProduct'
        $content = $content -replace '\bsetCollectionToEdit\b', 'setProductToEdit'
        $content = $content -replace '\bsetSelectedCollectionHasSubProducts\b', 'setSelectedProductHasSubProducts'
        $content = $content -replace '\bsetCollectionComboboxOpen\b', 'setProductComboboxOpen'
        $content = $content -replace '\bdeleteCollectionDialogOpen\b', 'deleteProductDialogOpen'
        $content = $content -replace '\bsetDeleteCollectionDialogOpen\b', 'setDeleteProductDialogOpen'
        $content = $content -replace '\bhandleDeleteCollectionClick\b', 'handleDeleteProductClick'
        $content = $content -replace '\bprepareCollectionUpdates\b', 'prepareProductUpdates'
        $content = $content -replace '\bSortableCollectionRow\b', 'SortableProductRow'
        $content = $content -replace '\bcc\.collection\b', 'cp.product'
        $content = $content -replace '\bccData\b', 'cpData'
        $content = $content -replace '\bccError\b', 'cpError'
        $content = $content -replace '\bccWithTyped\b', 'cpWithTyped'
        $content = $content -replace '\bcollectionsData\b', 'productsData'
        $content = $content -replace '\bcollectionsError\b', 'productsError'
        $content = $content -replace '\bsetAllCollections\b', 'setAllProducts'
        $content = $content -replace '\bsetClientCollections\b', 'setClientProducts'
        $content = $content -replace '\bsetCollectionInfos\b', 'setProductInfos'
        $content = $content -replace '\bsetPerCollectionForm\b', 'setPerProductForm'
        $content = $content -replace '\bsubProductsByCollection\b', 'subProductsByProduct'
        
        # Tables Supabase
        $content = $content -replace "\.from\(['`"]collections['`"]\)", ".from('products')"
        $content = $content -replace "\.from\(['`"]client_collections['`"]\)", ".from('client_products')"
        $content = $content -replace "\.from\(['`"]collection_categories['`"]\)", ".from('product_categories')"
        $content = $content -replace "\.from\(['`"]collection_subcategories['`"]\)", ".from('product_subcategories')"
        $content = $content -replace "collection:collections", "product:products"
        $content = $content -replace "\.eq\('collection_id'", ".eq('product_id'"
        $content = $content -replace "\.in\('collection_id'", ".in('product_id'"
        
        # Routes
        $content = $content -replace '/collections', '/products'
        
        # Textes français (UI) - attention à l'ordre pour éviter les remplacements partiels
        $content = $content -replace 'les collections', 'les produits'
        $content = $content -replace 'des collections', 'des produits'
        $content = $content -replace 'une collection', 'un produit'
        $content = $content -replace 'la collection', 'le produit'
        $content = $content -replace 'Cette collection', 'Ce produit'
        $content = $content -replace 'cette collection', 'ce produit'
        $content = $content -replace 'Collection dissociée', 'Produit dissocié'
        $content = $content -replace 'Collection associée', 'Produit associé'
        $content = $content -replace 'Collections liées', 'Produits liés'
        $content = $content -replace 'Associez des collections', 'Associez des produits'
        $content = $content -replace 'Choisir une collection', 'Choisir un produit'
        $content = $content -replace 'Rechercher une collection', 'Rechercher un produit'
        $content = $content -replace 'Aucune collection', 'Aucun produit'
        $content = $content -replace 'Ajouter la collection', 'Ajouter le produit'
        $content = $content -replace 'Info collection', 'Info produit'
        $content = $content -replace 'Supprimer la collection', 'Supprimer le produit'
        $content = $content -replace 'Prix par défaut de la collection', 'Prix par défaut du produit'
        $content = $content -replace 'Prix de vente conseillé de la collection', 'Prix de vente conseillé du produit'
        $content = $content -replace 'Cette collection contient', 'Ce produit contient'
        $content = $content -replace 'pour chaque collection', 'pour chaque produit'
        $content = $content -replace '\bCollections\b', 'Produits'
        $content = $content -replace '\bCollection\b', 'Produit'
        $content = $content -replace '\bcollections\b', 'produits'
        $content = $content -replace '\bcollection\b', 'produit'
        
        Set-Content $fullPath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  Updated $filePath"
    } else {
        Write-Host "  File not found: $filePath"
    }
}

Write-Host "Done!"

