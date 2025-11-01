# ✅ Checklist d'Implémentation - Modifications Client

## 📋 Vue d'ensemble

Cette checklist vous guide pas à pas pour implémenter les nouvelles fonctionnalités :
- Jours de marché avec horaires
- Périodes de vacances multiples  
- Fréquence de passage étendue (52 semaines)
- Suppression du champ "Jour de fermeture" redondant

---

## 🎯 Étape 1 : Migration de la base de données

### ☐ 1.1 - Sauvegarde de sécurité

**Avant toute chose**, faites une sauvegarde de votre base de données !

```bash
# Via Supabase Dashboard : Settings > Database > Backups
```

### ☐ 1.2 - Exécuter la migration SQL

1. Ouvrez [supabase.com](https://supabase.com) et connectez-vous
2. Sélectionnez votre projet
3. Allez dans "SQL Editor"
4. Cliquez sur "New Query"
5. Copiez le contenu du fichier : `supabase/migrations/20250131000000_add_market_hours_and_vacation_periods.sql`
6. Collez et cliquez sur "Run"
7. ✅ Vérifiez qu'il n'y a pas d'erreur

### ☐ 1.3 - Vérifier la migration

Exécutez cette requête pour vérifier :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('market_days_schedule', 'vacation_periods');
```

**Résultat attendu** :
```
market_days_schedule | jsonb
vacation_periods     | jsonb
```

---

## 🔧 Étape 2 : Code Front-End (DÉJÀ FAIT)

### ☑ 2.1 - Composants créés

- ✅ `components/market-days-editor.tsx` - Éditeur de jours de marché
- ✅ `components/vacation-periods-editor.tsx` - Éditeur de périodes de vacances

### ☑ 2.2 - Modifications existantes

- ✅ Fréquence de passage : 12 → 52 semaines
- ✅ Suppression du champ "Jour de fermeture" libre
- ✅ Types TypeScript ajoutés dans `lib/supabase.ts`

### ☐ 2.3 - Intégration dans page info (À FINALISER)

**Note** : Le code front-end pour intégrer les composants dans `app/clients/[id]/info/page.tsx` n'est pas encore terminé.

**Pour finaliser** :
1. Importer et utiliser `MarketDaysEditor` dans le formulaire
2. Importer et utiliser `VacationPeriodsEditor` dans le formulaire
3. Charger et sauvegarder les nouvelles structures de données
4. Afficher les données dans la vue de lecture

---

## 📦 Étape 3 : Installation des dépendances

### ☐ 3.1 - Vérifier les packages

Tous les composants UI nécessaires sont déjà installés :
- ✅ `@/components/ui/button`
- ✅ `@/components/ui/input`
- ✅ `@/components/ui/label`
- ✅ `@/components/ui/checkbox`

Aucune installation supplémentaire requise !

---

## 🧪 Étape 4 : Tests

### ☐ 4.1 - Test de la migration des données

1. Vérifiez quelques clients existants :
```sql
SELECT name, market_days, market_days_schedule, vacation_periods
FROM clients
WHERE market_days IS NOT NULL OR vacation_start_date IS NOT NULL
LIMIT 5;
```

2. Vérifiez que :
   - `market_days_schedule` contient la structure JSON correcte
   - `vacation_periods` contient les anciennes périodes migrées

### ☐ 4.2 - Test de l'interface

Une fois le code front-end finalisé :

1. **Jours de marché** :
   - [ ] Sélectionner un jour
   - [ ] Ajouter une plage horaire
   - [ ] Ajouter une deuxième plage horaire
   - [ ] Supprimer une plage
   - [ ] Désélectionner un jour
   - [ ] Sauvegarder et vérifier

2. **Périodes de vacances** :
   - [ ] Ajouter une période
   - [ ] Renseigner dates début/fin
   - [ ] Cocher "récurrent"
   - [ ] Ajouter une 2e période
   - [ ] Supprimer une période
   - [ ] Sauvegarder et vérifier

3. **Fréquence de passage** :
   - [ ] Sélectionner une valeur > 12 (ex: 25 semaines)
   - [ ] Sauvegarder
   - [ ] Vérifier l'affichage

---

## 📱 Étape 5 : Déploiement

### ☐ 5.1 - Commit et push

```bash
git add .
git commit -m "feat: Add market hours and multiple vacation periods"
git push origin modif_infos_client
```

### ☐ 5.2 - Vérifier le build

Sur Vercel :
- [ ] Build réussi
- [ ] Aucune erreur TypeScript
- [ ] Application déployée

### ☐ 5.3 - Test en production

- [ ] Ouvrir un client existant
- [ ] Vérifier que les données migrées s'affichent
- [ ] Tester l'édition
- [ ] Vérifier la sauvegarde

---

## 🧹 Étape 6 : Nettoyage (Optionnel - À faire plus tard)

**⚠️ Attendez au moins 1 semaine** pour vous assurer que tout fonctionne bien.

### ☐ 6.1 - Supprimer les anciens champs

Une fois validé en production pendant plusieurs jours :

```sql
-- ⚠️ IRRÉVERSIBLE ! Sauvegarde recommandée avant

ALTER TABLE clients DROP COLUMN IF EXISTS market_days;
ALTER TABLE clients DROP COLUMN IF EXISTS vacation_start_date;
ALTER TABLE clients DROP COLUMN IF EXISTS vacation_end_date;
-- Note: closing_day peut rester si utilisé ailleurs
```

### ☐ 6.2 - Nettoyer le code

- [ ] Retirer les références à `market_days` dans le code
- [ ] Retirer les références à `vacation_start_date` / `vacation_end_date`
- [ ] Mettre à jour la documentation

---

## 📊 État actuel du projet

### ✅ Terminé

- [x] Migration SQL créée
- [x] Composants React créés
- [x] Types TypeScript ajoutés
- [x] Documentation rédigée
- [x] Fréquence 52 semaines
- [x] Suppression "Jour de fermeture"

### 🔄 En cours

- [ ] Intégration complète dans `app/clients/[id]/info/page.tsx`
- [ ] Tests de l'interface

### ⏳ À faire

- [ ] Exécuter la migration SQL sur Supabase
- [ ] Finaliser l'intégration front-end
- [ ] Tester en développement
- [ ] Déployer en production
- [ ] Valider avec utilisateurs
- [ ] Nettoyage (optionnel, plus tard)

---

## 🎯 Prochaine action immédiate

**→ Exécuter la migration SQL** (Étape 1.2)

C'est le pré-requis pour que tout le reste fonctionne !

---

## 💡 Remarques importantes

### Ordre d'exécution

1. **D'ABORD** : Migration SQL
2. **ENSUITE** : Finaliser le code front-end
3. **ENFIN** : Tester et déployer

### Rollback possible

Si problème, vous pouvez annuler :
```sql
ALTER TABLE clients DROP COLUMN IF EXISTS market_days_schedule;
ALTER TABLE clients DROP COLUMN IF EXISTS vacation_periods;
```

Les anciennes colonnes restent intactes !

### Compatibilité

Le code conserve les anciens champs pendant la transition :
- `market_days` (ancien) coexiste avec `market_days_schedule` (nouveau)
- `vacation_start_date/end_date` (ancien) coexiste avec `vacation_periods` (nouveau)

---

## 📞 Besoin d'aide ?

- **Migration SQL** : Voir `MIGRATION_GUIDE.md`
- **Utilisation** : Voir `FEATURES_UPDATE.md`
- **Questions** : Demandez !

---

**Bonne implémentation ! 🚀**

