# Comment Identifier le Contexte : Collection → Product ou Produit ?

## 🎯 Règle Générale

**`Collection` (anglais) = Type/Variable** → Remplacer par `Product`  
**`Collection` (français) = Texte UI** → Remplacer par `Produit`

---

## 📋 Guide d'Identification

### 1. **Types TypeScript** → `Product` (anglais)

**Indicateurs :**
- Après `:` (déclaration de type)
- Dans les génériques `<Collection>`
- Après `import` ou dans les types d'interface
- En majuscule au début d'un nom de type

**Exemples :**
```typescript
// ✅ Type → Product
const [items, setItems] = useState<Collection[]>([]);
// Devient : useState<Product[]>([])

function MyComponent({ item }: { item: Collection }) {
// Devient : { item: Product }

import { Collection, ClientCollection } from '@/lib/supabase';
// Devient : import { Product, ClientProduct } from '@/lib/supabase';

interface MyProps {
  collection: Collection;
}
// Devient : product: Product;
```

---

### 2. **Variables/Propriétés** → `product` ou `productId` (anglais, camelCase)

**Indicateurs :**
- En camelCase : `collectionId`, `collectionInfo`
- Avec underscore : `collection_id`, `collection_info`
- Utilisé comme nom de variable/propriété
- Pas entre guillemets

**Exemples :**
```typescript
// ✅ Variable → productId
const collectionId = params.id;
// Devient : const productId = params.id;

// ✅ Propriété d'objet → product_id
update.collection_id === cc.product_id
// Devient : update.product_id === cp.product_id

// ✅ Variable d'état → productToDelete
const [collectionToDelete, setCollectionToDelete] = useState(null);
// Devient : const [productToDelete, setProductToDelete] = useState(null);
```

---

### 3. **Textes UI (français)** → `Produit` ou `produit` (français)

**Indicateurs :**
- Entre guillemets simples `'...'` ou doubles `"..."`
- Dans des appels de fonction UI : `toast.success()`, `doc.text()`, `Label`, etc.
- Dans des commentaires français
- Dans des chaînes de template : `` `${...}` ``
- Suivi d'un texte français

**Exemples :**
```typescript
// ✅ Texte UI → 'Produit'
toast.success('Collection créée avec succès');
// Devient : toast.success('Produit créé avec succès');

// ✅ Texte UI dans Label
<Label>Nom de la Collection</Label>
// Devient : <Label>Nom du Produit</Label>

// ✅ Texte UI dans doc.text() (PDF)
doc.text('Collection', x, y);
// Devient : doc.text('Produit', x, y);

// ✅ Texte UI dans template string
`Une collection avec le nom "${name}" existe déjà`
// Devient : `Un produit avec le nom "${name}" existe déjà`

// ✅ Commentaire français
// Charger toutes les collections
// Devient : // Charger tous les produits
```

---

## 🔍 Méthode de Vérification dans VS Code

### Étape 1 : Recherche Contextuelle
1. **Ctrl+F** pour rechercher `Collection`
2. **Activer "Match Case"** ✅
3. Pour chaque occurrence, regarder le contexte :

### Étape 2 : Questions à se poser

**C'est un TYPE si :**
- ❓ Est-ce après `:` ou dans `<...>` ?
- ❓ Est-ce dans un `import` ou une déclaration de type ?
- → **Remplacer par `Product`**

**C'est une VARIABLE si :**
- ❓ Est-ce en camelCase (`collectionId`) ou avec underscore (`collection_id`) ?
- ❓ Est-ce utilisé comme nom de variable/propriété ?
- ❓ N'est PAS entre guillemets ?
- → **Remplacer par `productId` ou `product_id`**

**C'est un TEXTE UI si :**
- ❓ Est-ce entre guillemets `'Collection'` ou `"Collection"` ?
- ❓ Est-ce dans un appel de fonction UI (`toast`, `doc.text`, etc.) ?
- ❓ Est-ce dans un commentaire français ?
- ❓ Est-ce suivi d'un texte français ?
- → **Remplacer par `Produit`**

---

## 📝 Exemples Concrets du Fichier

### Exemple 1 : Type TypeScript
```typescript
const [items, setItems] = useState<Collection[]>([]);
```
**Analyse :** `Collection` est dans `<Collection[]>` → C'est un type  
**Action :** `Collection` → `Product`

### Exemple 2 : Variable
```typescript
const collectionId = params.id;
```
**Analyse :** `collectionId` est en camelCase, nom de variable  
**Action :** `collectionId` → `productId`

### Exemple 3 : Texte UI
```typescript
toast.success('Collection créée avec succès');
```
**Analyse :** `'Collection'` est entre guillemets, dans un toast  
**Action :** `'Collection'` → `'Produit'`

### Exemple 4 : Propriété d'objet
```typescript
if (update.collection_id === cc.product_id) {
```
**Analyse :** `.collection_id` est une propriété d'objet  
**Action :** `.collection_id` → `.product_id`

### Exemple 5 : Commentaire
```typescript
// Load all collections
```
**Analyse :** Dans un commentaire, texte anglais mais contexte UI  
**Action :** `collections` → `products` (ou `produits` selon le style)

---

## ⚠️ Cas Ambigus

### Cas 1 : Dans une chaîne de template
```typescript
`Collection ${name} créée`
```
**Analyse :** Entre backticks, mais c'est un texte UI  
**Action :** `Collection` → `Produit`

### Cas 2 : Nom de fonction
```typescript
function loadCollections() {
```
**Analyse :** Nom de fonction, mais fait référence à des données  
**Action :** `loadCollections` → `loadProducts` (anglais car c'est du code)

### Cas 3 : Clé d'objet
```typescript
const data = { collection: item };
```
**Analyse :** Clé d'objet, fait référence à une variable  
**Action :** `collection:` → `product:`

---

## ✅ Checklist de Vérification

Avant de remplacer, vérifiez :
- [ ] Est-ce un type TypeScript ? → `Product`
- [ ] Est-ce une variable/propriété ? → `product` ou `productId`
- [ ] Est-ce entre guillemets (texte UI) ? → `Produit`
- [ ] Est-ce dans un commentaire français ? → `produit` ou `Produit`
- [ ] Est-ce dans un appel UI (`toast`, `doc.text`, etc.) ? → `Produit`

---

## 🎯 Stratégie Recommandée

1. **D'abord les types** : Chercher `: Collection` ou `<Collection` → `Product`
2. **Ensuite les variables** : Chercher `collection` en camelCase → `product`
3. **Enfin les textes UI** : Chercher `'Collection'` ou `"Collection"` → `'Produit'`

**Astuce :** Utilisez "Find All" (Alt+Enter dans la recherche) pour voir toutes les occurrences et leur contexte avant de remplacer !

