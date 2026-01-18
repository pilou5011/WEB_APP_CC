# Exemples Concrets de Remplacements - app/clients/[id]/page.tsx

## 📋 Analyse Ligne par Ligne

### ✅ Exemple 1 : Commentaire (ligne 117)
```typescript
// Component for sortable collection row
```
**Analyse :** Commentaire en anglais, mais décrit une fonctionnalité  
**Contexte :** C'est du texte descriptif  
**Action :** `collection` → `product` (garder en anglais car c'est un commentaire de code)  
**Résultat :** `// Component for sortable product row`

---

### ✅ Exemple 2 : Nom de fonction (ligne 118)
```typescript
function SortableCollectionRow({
```
**Analyse :** Nom de fonction, partie du code  
**Contexte :** C'est un identifiant de fonction  
**Action :** `SortableCollectionRow` → `SortableProductRow`  
**Résultat :** `function SortableProductRow({`

---

### ✅ Exemple 3 : Variable camelCase (ligne 124)
```typescript
collectionSubProducts,
```
**Analyse :** Variable en camelCase, pas entre guillemets  
**Contexte :** C'est une variable/propriété  
**Action :** `collectionSubProducts` → `productSubProducts`  
**Résultat :** `productSubProducts,`

---

### ✅ Exemple 4 : Type dans déclaration (ligne 145)
```typescript
collectionSubProducts: SubProduct[];
```
**Analyse :** Type dans une déclaration d'interface  
**Contexte :** C'est une déclaration de type  
**Action :** `collectionSubProducts` → `productSubProducts`  
**Résultat :** `productSubProducts: SubProduct[];`

---

### ✅ Exemple 5 : Commentaire avec variable (ligne 349)
```typescript
// collection_id -> SubProduct[]
```
**Analyse :** Commentaire qui mentionne une variable  
**Contexte :** Commentaire technique  
**Action :** `collection_id` → `product_id`  
**Résultat :** `// product_id -> SubProduct[]`

---

### ✅ Exemple 6 : Commentaire descriptif (ligne 397)
```typescript
// Delete collection dialog
```
**Analyse :** Commentaire en anglais, décrit une fonctionnalité  
**Contexte :** Commentaire de code  
**Action :** `collection` → `product` (garder en anglais)  
**Résultat :** `// Delete product dialog`

---

### ✅ Exemple 7 : Chaîne littérale (ligne 421) ⚠️ IMPORTANT
```typescript
type: 'collection' | 'sub-product';
```
**Analyse :** `'collection'` est entre guillemets simples  
**Contexte :** C'est une valeur littérale (string literal)  
**Action :** `'collection'` → `'product'` (garder en anglais car c'est une valeur technique)  
**Résultat :** `type: 'product' | 'sub-product';`

**Note :** Même si c'est entre guillemets, ici c'est une valeur technique (type), pas un texte UI affiché à l'utilisateur.

---

### ✅ Exemple 8 : Propriété d'objet (ligne 425)
```typescript
collectionId: string | null;
```
**Analyse :** Propriété d'objet, type TypeScript  
**Contexte :** Déclaration de propriété  
**Action :** `collectionId` → `productId`  
**Résultat :** `productId: string | null;`

---

### ✅ Exemple 9 : Propriété avec underscore (ligne 467)
```typescript
collection_id: string | null;
```
**Analyse :** Propriété avec underscore, type TypeScript  
**Contexte :** Déclaration de propriété  
**Action :** `collection_id` → `product_id`  
**Résultat :** `product_id: string | null;`

---

### ✅ Exemple 10 : Commentaire JSX (ligne 3240)
```typescript
{/* Delete Collection Dialog */}
```
**Analyse :** Commentaire JSX, texte descriptif  
**Contexte :** Commentaire dans le JSX  
**Action :** `Collection` → `Product` (garder en anglais car commentaire de code)  
**Résultat :** `{/* Delete Product Dialog */}`

---

### ✅ Exemple 11 : Texte UI dans AlertDialogTitle (ligne 3244) ⚠️ IMPORTANT
```typescript
<AlertDialogTitle>Supprimer la collection ?</AlertDialogTitle>
```
**Analyse :** Texte entre balises JSX, en français, affiché à l'utilisateur  
**Contexte :** C'est un texte UI visible par l'utilisateur  
**Action :** `la collection` → `le produit`  
**Résultat :** `<AlertDialogTitle>Supprimer le produit ?</AlertDialogTitle>`

**Note :** Ici c'est clairement un texte UI car :
- Entre balises JSX (`<AlertDialogTitle>`)
- En français
- Affiché à l'utilisateur

---

### ✅ Exemple 12 : Texte UI avec interpolation (ligne 3246)
```typescript
Êtes-vous sûr de vouloir dissocier la collection "{productToDelete?.collection?.name}" de ce client ?
```
**Analyse :** Texte en français avec interpolation de variable  
**Contexte :** Texte UI affiché à l'utilisateur  
**Action :** `la collection` → `le produit`  
**Résultat :** `Êtes-vous sûr de vouloir dissocier le produit "{productToDelete?.product?.name}" de ce client ?`

**Note :** Ici `collection` apparaît deux fois :
1. `la collection` → `le produit` (texte UI)
2. `?.collection?.` → `?.product?.` (propriété d'objet, code)

---

### ✅ Exemple 13 : Texte UI dans span (ligne 3250)
```typescript
⚠️ Attention : Cette collection a encore {productToDelete.current_stock} cartes en stock.
```
**Analyse :** Texte en français dans un `<span>`, affiché à l'utilisateur  
**Contexte :** Texte UI  
**Action :** `Cette collection` → `Ce produit`  
**Résultat :** `⚠️ Attention : Ce produit a encore {productToDelete.current_stock} cartes en stock.`

---

## 🎯 Règles de Décision Rapide

### C'est du CODE (anglais) si :
- ✅ Pas entre guillemets ET en camelCase/underscore
- ✅ Après `:` dans une déclaration de type
- ✅ Nom de fonction/composant
- ✅ Propriété d'objet (`.collection`, `?.collection?`)

**→ Remplacer par :** `Product`, `product`, `productId`, `product_id`, etc.

### C'est du TEXTE UI (français) si :
- ✅ Entre guillemets `'...'` ou `"..."`
- ✅ Dans des balises JSX (`<AlertDialogTitle>`, `<Label>`, etc.)
- ✅ En français ET visible par l'utilisateur
- ✅ Dans des appels UI (`toast.success()`, `doc.text()`, etc.)

**→ Remplacer par :** `Produit`, `produit`, `le produit`, etc.

### Cas Spécial : Chaînes Littérales Techniques
- ⚠️ `type: 'collection'` → `type: 'product'` (valeur technique, garder en anglais)
- ⚠️ `'collection'` dans un enum → `'product'` (valeur technique)

---

## 🔍 Méthode de Vérification dans VS Code

1. **Ctrl+F** pour chercher `collection` ou `Collection`
2. **Activer "Match Case"** ✅
3. Pour chaque occurrence, regarder :
   - **Est-ce entre guillemets ?** → Probablement texte UI
   - **Est-ce en camelCase/underscore ?** → Probablement code
   - **Est-ce dans une balise JSX ?** → Probablement texte UI
   - **Est-ce après `:` ou dans `<...>` ?** → Probablement type/code
   - **Est-ce en français ?** → Probablement texte UI

4. **Si doute :** Regarder le contexte complet (lignes avant/après)

---

## ✅ Checklist Rapide

Avant de remplacer, demandez-vous :
- [ ] Est-ce entre guillemets ET en français ? → **Texte UI** → `Produit`
- [ ] Est-ce en camelCase/underscore ? → **Code** → `product` ou `productId`
- [ ] Est-ce un type TypeScript (`: Collection`) ? → **Code** → `Product`
- [ ] Est-ce dans une balise JSX en français ? → **Texte UI** → `Produit`
- [ ] Est-ce une valeur technique (`type: 'collection'`) ? → **Code** → `'product'`

