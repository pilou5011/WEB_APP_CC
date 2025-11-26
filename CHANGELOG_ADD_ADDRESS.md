# Liste des modifications depuis la branche "add_address"

## 📋 Vue d'ensemble
Cette liste présente toutes les améliorations et nouvelles fonctionnalités ajoutées à l'application depuis la branche "add_address". Ces modifications améliorent l'expérience utilisateur, la gestion des données et la traçabilité des opérations.

---

## 🎯 GESTION DES CLIENTS

### Nouvelle page de création de client
- **Page dédiée** : Création d'une page complète dédiée à la création de nouveaux clients (`/clients/new`)
- **Tous les champs** : Accès à tous les champs d'information lors de la création (adresse, coordonnées, informations légales, etc.)
- **Calendrier intégré** : Le calendrier est maintenant directement accessible dans la page principale du client

### Amélioration de la page client
- **Bouton "Ajouter la collection"** : Le bouton "Associer la collection" a été renommé en "Ajouter la collection" pour plus de clarté
- **Suppression avec confirmation** : Ajout d'un bouton "Supprimer ce client" avec demande de confirmation avant suppression
- **Titres dynamiques** : Les titres des pages affichent maintenant le nom du client

### Amélioration du calendrier
- **Interface simplifiée** : Suppression des flèches de navigation gauche/droite et du bouton "Aujourd'hui" pour une interface plus épurée

---

## 📦 GESTION DES COLLECTIONS

### Nouvelle organisation de l'affichage
- **Barre de recherche** : Ajout d'une barre de recherche pour trouver rapidement une collection
- **Tri alphabétique** : Les collections sont maintenant triées automatiquement par ordre alphabétique
- **Encarts compacts** : Réduction de la taille des encarts pour afficher plus de collections sur une même page
- **Style cohérent** : L'affichage des collections suit maintenant le même style que l'affichage des clients

### Catégories et sous-catégories
- **Système de catégorisation** : Ajout d'un système complet de catégories et sous-catégories pour organiser les collections
- **Gestion flexible** : Possibilité d'ajouter, modifier et supprimer des catégories et sous-catégories
- **Organisation par catégorie** : Les collections sont organisées par catégorie dans la page de gestion (similaire à l'organisation par ville pour les clients)
- **Filtres avancés** : Ajout de filtres par catégorie et sous-catégorie pour faciliter la recherche
- **Messages informatifs** : Affichage d'un message "Liste vide, veuillez ajouter un élément" en grisé lorsque les listes sont vides
- **Confirmation de suppression** : Demande de confirmation avant de supprimer une catégorie ou sous-catégorie

### Nouvelle page de création de collection
- **Page dédiée** : Création d'une page complète dédiée à la création de nouvelles collections (`/collections/new`)
- **Tous les champs** : Accès à tous les champs lors de la création (nom, prix, catégorie, sous-catégorie, etc.)

### Mode lecture seule / édition pour les collections
- **Affichage par défaut** : Par défaut, les informations de la collection sont affichées en mode lecture seule
- **Bouton "Modifier la collection"** : Un bouton permet de passer en mode édition
- **Boutons d'action** : En mode édition, affichage de boutons "Annuler" et "Enregistrer" en bas à droite
- **Suppression avec confirmation** : Bouton "Supprimer collection" en bas à gauche avec demande de confirmation
- **Format uniforme** : Le bouton "Modifier la collection" utilise maintenant le même format que le bouton "Modifier infos client"

---

## 🔄 GESTION DU STOCK

### Réorganisation des collections associées
- **Ajout en fin de liste** : Les nouvelles collections associées à un client sont ajoutées visuellement en dessous de toutes les autres collections
- **Réorganisation par glisser-déposer** : Possibilité de réorganiser les collections en les glissant-déposant pour modifier leur ordre d'affichage
- **Ordre persistant** : L'ordre des collections est sauvegardé et respecté dans tous les documents (bon de dépôt, facture, relevé de stock)

### Nouvelle colonne "Réassort"
- **Colonne dynamique** : Ajout d'une colonne "Réassort" entre "Stock compté" et "Nouveau dépôt"
- **Calcul automatique** : La valeur de "Réassort" est automatiquement calculée comme la différence entre "Nouveau dépôt" et "Stock compté" (Réassort = Nouveau dépôt - Stock compté)
- **Affichage en lecture seule** : Cette colonne n'est pas modifiable par l'utilisateur
- **Format uniforme** : Le format d'affichage correspond à celui de la colonne "Ancien dépôt"

### Amélioration de la saisie du stock
- **Stock initial obligatoire** : Le stock initial d'une collection est maintenant un champ obligatoire (peut être renseigné à 0)
- **Blocage conditionnel** : Les champs "Réassort" et "Nouveau dépôt" sont bloqués lorsque "Stock compté" n'est pas renseigné
- **Format uniforme pour sous-produits** : Pour les collections avec sous-produits, les colonnes "Stock compté" et "Nouveau dépôt" utilisent le même format que "Ancien dépôt" et "Réassort"

### En-tête fixe du tableau
- **En-tête toujours visible** : L'en-tête du tableau des collections reste fixe lors du défilement, permettant de toujours identifier les colonnes

### Dialog amélioré pour sous-produits
- **Taille optimisée** : Le dialog de saisie des stocks initiaux des sous-produits prend maintenant une partie de l'écran au lieu de tout l'écran
- **Défilement** : Possibilité de faire défiler dans ce dialog lorsqu'il y a beaucoup de sous-collections

---

## 📄 GESTION DES DOCUMENTS

### Historique des documents
- **Renommage** : "Historique des factures" a été renommé en "Historique des documents"
- **Affichage discret** : Le nombre de cartes vendues et le montant total de la facture sont affichés de manière plus discrète

### Nouveau document : Relevé de stock
- **Document historique** : Création d'un nouveau document "Relevé de stock" qui sert d'historique des mouvements de stock
- **Colonnes complètes** : Ce document inclut toutes les colonnes du bon de dépôt, plus les colonnes "Ancien dépôt", "Stock compté" et "Réassort"
- **Calcul automatique** : La colonne "Réassort" est calculée automatiquement (Nouveau dépôt - Stock compté)
- **Prévisualisation** : Affichage du relevé de stock dans une prévisualisation PDF, similaire à la facture
- **Bouton d'accès** : Bouton "Relevé de stock" disponible dans l'historique des documents

### Bon de dépôt amélioré
- **Bouton dans l'historique** : Ajout d'un bouton "Bon de dépôt" dans l'historique des documents pour afficher les bons de dépôt précédents
- **Prévisualisation** : Affichage du bon de dépôt dans une prévisualisation PDF, similaire à la facture
- **Données historiques** : Utilisation des données historiques pour afficher les bons de dépôt passés
- **Améliorations visuelles** :
  - Police noire pour toutes les valeurs du tableau (au lieu de grise)
  - Ajustement des largeurs de colonnes ("Infos" réduite, "Marchandise remise" élargie)
  - Augmentation de la taille de police pour les colonnes "Prix de cession" et "Prix de vente conseillé"

### Facture améliorée
- **Police noire** : Toutes les valeurs du tableau sont maintenant affichées en police noire (au lieu de grise) pour une meilleure lisibilité

### Numérotation des factures
- **Format standardisé** : Les factures ont maintenant un numéro unique au format **F20250001**, **F20250002**, etc. (F + année + 4 chiffres incrémentaux)
- **Numérotation séquentielle** : Aucun trou dans la numérotation, chaque facture a un numéro unique et séquentiel
- **Affichage dans la facture** : Le numéro de facture est maintenant affiché dans le document PDF après "N° Facture:"

---

## 💳 GESTION DES MÉTHODES DE PAIEMENT

### Nouveau système de gestion
- **Liste déroulante avec recherche** : Le champ "Règlement" utilise maintenant une liste déroulante avec fonction de recherche (similaire au champ "Catégorie" pour les collections)
- **Ajout en ligne** : Possibilité d'ajouter de nouvelles méthodes de paiement directement depuis le champ
- **Modification et suppression** : Possibilité de modifier et supprimer les méthodes de paiement avec confirmation
- **Boutons au survol** : Les boutons d'édition et de suppression apparaissent au survol de chaque élément dans la liste
- **Message informatif** : Affichage d'un message "Liste vide, veuillez ajouter un élément" en grisé lorsque la liste est vide

---

## 🏢 GESTION DES TYPES D'ÉTABLISSEMENT

### Amélioration de l'interface
- **Liste déroulante avec recherche** : Le champ "Type d'établissement" utilise maintenant une liste déroulante avec fonction de recherche (similaire au champ "Catégorie" pour les collections)
- **Ajout en ligne** : Possibilité d'ajouter de nouveaux types d'établissement directement depuis le champ
- **Modification et suppression** : Possibilité de modifier et supprimer les types d'établissement avec confirmation
- **Boutons au survol** : Les boutons d'édition et de suppression apparaissent au survol de chaque élément dans la liste
- **Message informatif** : Affichage d'un message "Liste vide, veuillez ajouter un élément" en grisé lorsque la liste est vide

---

## 🎨 INTERFACE UTILISATEUR

### Page d'accueil
- **Nettoyage** : Suppression du texte "Cartes de vœux" et de l'encart "Application de gestion complète pour vos dépôts-ventes" pour une interface plus épurée

### Améliorations visuelles
- **Cohérence** : Harmonisation des styles et formats entre les différentes pages
- **Lisibilité** : Amélioration de la lisibilité des documents PDF avec des polices noires
- **Organisation** : Meilleure organisation visuelle des informations

---

## 🔧 AMÉLIORATIONS TECHNIQUES

### Corrections de bugs
- **Correction TypeScript** : Correction d'erreurs TypeScript liées à la gestion des brouillons de mise à jour de stock
- **Gestion des valeurs nulles** : Amélioration de la gestion des valeurs nulles dans les formulaires

### Optimisations
- **Performance** : Optimisation des requêtes et de l'affichage
- **Stabilité** : Amélioration de la stabilité de l'application

---

## 📝 NOTES IMPORTANTES

### Migration de base de données
- **Nouvelles tables** : Création de tables pour les catégories, sous-catégories, méthodes de paiement et numéros de facture
- **Colonnes ajoutées** : Ajout de colonnes pour l'ordre d'affichage des collections et les numéros de facture
- **Script de correction** : Un script SQL (`FIX_INVOICE_NUMBERS.sql`) est disponible pour corriger les numéros de facture existants si nécessaire

### Compatibilité
- **Données existantes** : Toutes les données existantes sont préservées et migrées automatiquement
- **Rétrocompatibilité** : L'application reste compatible avec les données existantes

---

## 🚀 PROCHAINES ÉTAPES

Pour bénéficier de toutes ces améliorations, assurez-vous que :
1. Les migrations de base de données ont été exécutées
2. Le script `FIX_INVOICE_NUMBERS.sql` a été exécuté si vous avez des factures existantes
3. Votre navigateur est à jour pour une meilleure expérience

---

*Document généré automatiquement à partir des modifications Git depuis la branche "add_address"*


