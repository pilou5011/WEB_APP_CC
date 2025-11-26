# Système de Brouillons Persistants pour les Mises à Jour de Stock

## Vue d'ensemble

Ce système permet aux utilisateurs de ne jamais perdre leurs données lors de la saisie de mises à jour de stock, même en cas de:
- Fermeture accidentelle de l'onglet
- Problème de connexion réseau
- Plantage de l'application
- Redémarrage du navigateur

## Architecture

### 1. Base de données (`draft_stock_updates`)

Une nouvelle table a été créée pour stocker les brouillons côté serveur:

```sql
CREATE TABLE draft_stock_updates (
  id uuid PRIMARY KEY,
  client_id uuid REFERENCES clients(id),
  draft_data jsonb,
  created_at timestamptz,
  updated_at timestamptz
);
```

**Migration:** `supabase/migrations/20251023000000_create_draft_stock_updates.sql`

### 2. Types TypeScript

Nouveaux types ajoutés dans `lib/supabase.ts`:

- `DraftStockUpdateData`: Structure des données sauvegardées
  - `perCollectionForm`: Formulaire par collection
  - `pendingAdjustments`: Ajustements de reprise de stock

- `DraftStockUpdate`: Type de la table database

### 3. Hook de gestion (`useStockUpdateDraft`)

**Fichier:** `hooks/use-stock-update-draft.ts`

#### Fonctionnalités:

1. **Sauvegarde locale automatique** (`autoSave`)
   - Sauvegarde immédiate dans localStorage à chaque modification
   - Pas de sauvegarde si les données sont vides

2. **Synchronisation serveur périodique**
   - Sync automatique toutes les 2 minutes
   - Sync initial après 5 secondes
   - Sync final lors du démontage du composant
   - Optimisation: skip si les données n'ont pas changé

3. **Récupération de brouillon** (`getDraftInfo`, `loadDraftLocally`, `loadDraftFromServer`)
   - Vérifie d'abord localStorage (plus rapide)
   - Puis vérifie le serveur si rien en local
   - Retourne les informations pour afficher la date au utilisateur

4. **Suppression** (`deleteDraft`)
   - Supprime à la fois local et serveur
   - Appelé automatiquement après soumission réussie

### 4. Composant de récupération

**Fichier:** `components/draft-recovery-dialog.tsx`

Dialog qui s'affiche au chargement de la page si un brouillon existe:

```
"Vous aviez commencé une mise à jour de stock le 23/10/2024 à 16:32.
Voulez-vous reprendre là où vous vous étiez arrêté ?"

[Supprimer le brouillon]  [Reprendre]
```

### 5. Intégration dans la page client

**Fichier:** `app/clients/[id]/page.tsx`

#### Modifications:

1. **Import du hook et du dialog**
   ```typescript
   const draft = useStockUpdateDraft(clientId);
   ```

2. **Vérification au chargement**
   - Vérifie l'existence d'un brouillon après le chargement des données client
   - Affiche le dialog de récupération si un brouillon existe

3. **Auto-sauvegarde**
   - useEffect qui surveille `perCollectionForm` et `pendingAdjustments`
   - Appelle `draft.autoSave()` à chaque modification

4. **Handlers de récupération**
   - `handleResumeDraft`: Restaure les données du brouillon
   - `handleDiscardDraft`: Supprime le brouillon
   - Suppression automatique après soumission réussie

## Flux de fonctionnement

### Scénario 1: Sauvegarde normale

1. L'utilisateur modifie un champ dans le formulaire
2. ✅ Sauvegarde immédiate dans localStorage
3. ⏱️ Après 5 secondes: première sync serveur
4. ⏱️ Toutes les 2 minutes: sync serveur
5. L'utilisateur soumet le formulaire
6. ✅ Suppression automatique du brouillon (local + serveur)

### Scénario 2: Fermeture accidentelle

1. L'utilisateur remplit le formulaire
2. ✅ Données sauvegardées localement
3. ✅ Données synchronisées au serveur (si >5 sec)
4. ❌ L'utilisateur ferme l'onglet par erreur
5. L'utilisateur rouvre la page
6. 💬 Dialog affiché: "Vous aviez commencé une mise à jour..."
7. L'utilisateur clique sur "Reprendre"
8. ✅ Données restaurées depuis localStorage (instantané)

### Scénario 3: Changement de machine

1. L'utilisateur remplit le formulaire sur machine A
2. ✅ Données sauvegardées localement
3. ✅ Données synchronisées au serveur après 2 minutes
4. L'utilisateur change de machine (machine B)
5. L'utilisateur ouvre la page sur machine B
6. 💬 Dialog affiché: "Vous aviez commencé une mise à jour..."
7. L'utilisateur clique sur "Reprendre"
8. ✅ Données restaurées depuis le serveur

### Scénario 4: Problème réseau

1. L'utilisateur remplit le formulaire
2. ✅ Données sauvegardées localement
3. ❌ Sync serveur échoue (pas de réseau)
4. Les données restent dans localStorage
5. Quand le réseau revient, la prochaine sync réussit

## Optimisations

### Performance

1. **localStorage en priorité**: Lecture locale avant serveur pour rapidité
2. **Debouncing implicite**: Pas de sauvegarde si données vides
3. **Sync intelligente**: Skip si données inchangées
4. **Async cleanup**: Sync finale "fire and forget" au démontage

### UX

1. **Non-intrusif**: Pas de notification à chaque sauvegarde
2. **Dialog clair**: Date formatée en français
3. **Toast de confirmation**: Feedback après restauration/suppression
4. **Récupération prioritaire**: Local d'abord (plus rapide)

### Sécurité des données

1. **Double sauvegarde**: Local + Serveur
2. **Sync périodique**: Assure cohérence même en cas de crash
3. **Cleanup automatique**: Pas d'accumulation de brouillons obsolètes

## Configuration

### Paramètres modifiables

Dans `hooks/use-stock-update-draft.ts`:

```typescript
const SYNC_INTERVAL = 2 * 60 * 1000; // 2 minutes (modifiable)
const LOCAL_STORAGE_PREFIX = 'stock_update_draft_'; // Préfixe des clés
```

### Initial sync delay

```typescript
const initialSyncTimer = setTimeout(syncToServer, 5000); // 5 secondes
```

## Logs de développement

Le système inclut des logs console pour debug:

```
[Draft] Saved locally for client: abc-123
[Draft] Updated server draft for client: abc-123
[Draft] No changes detected, skipping server sync
[Draft] Loaded local draft for client: abc-123
[Draft] Deleted server draft for client: abc-123
```

## Tests recommandés

1. ✅ Remplir un formulaire, fermer l'onglet, rouvrir → Données restaurées
2. ✅ Remplir un formulaire, attendre 2 min, changer de machine → Données disponibles
3. ✅ Remplir et soumettre → Brouillon supprimé
4. ✅ Cliquer "Supprimer le brouillon" → Brouillon effacé
5. ✅ Formulaire vide → Pas de brouillon créé
6. ✅ Couper le réseau, remplir le formulaire → Sauvegarde locale fonctionne
7. ✅ Rétablir le réseau → Sync automatique réussit

## Migration database

Pour appliquer la migration:

```bash
# Si vous utilisez Supabase local
supabase db reset

# Ou si vous utilisez Supabase cloud
# La migration sera appliquée automatiquement au prochain déploiement
```

## Compatibilité

- ✅ Chrome/Edge (localStorage + indexedDB)
- ✅ Firefox (localStorage)
- ✅ Safari (localStorage avec limitations iOS)
- ⚠️ Mode privé: localStorage fonctionne mais effacé à la fermeture
- ⚠️ Cookies désactivés: localStorage peut être bloqué

## Maintenance

### Nettoyage des anciens brouillons

Pour éviter l'accumulation, vous pouvez créer une tâche cron qui supprime les brouillons de plus de 7 jours:

```sql
DELETE FROM draft_stock_updates 
WHERE updated_at < NOW() - INTERVAL '7 days';
```

## Support

En cas de problème:

1. Vérifier la console pour les logs `[Draft]`
2. Vérifier localStorage dans DevTools → Application → Local Storage
3. Vérifier la table `draft_stock_updates` dans Supabase
4. Vérifier les permissions RLS

## Future améliorations possibles

- [ ] Historique des versions de brouillons
- [ ] Indication visuelle de sauvegarde en cours
- [ ] Compression des données JSON pour localStorage
- [ ] Migration automatique de localStorage vers IndexedDB pour plus de capacité
- [ ] Export/Import de brouillons










