# 📋 Guide de Migration - Jours de Marché et Périodes de Vacances

## 🎯 Objectif

Cette migration ajoute :
1. **Horaires de marché** : Système complet avec plages horaires par jour
2. **Périodes de vacances multiples** : Avec support de récurrence annuelle

---

## 🚀 Comment exécuter la migration

### **Option 1 : Via l'interface Supabase (Recommandé)**

1. **Connectez-vous sur [supabase.com](https://supabase.com)**
2. **Sélectionnez votre projet**
3. **Allez dans "SQL Editor"** (dans le menu de gauche)
4. **Cliquez sur "New Query"**
5. **Copiez-collez** le contenu du fichier `supabase/migrations/20250131000000_add_market_hours_and_vacation_periods.sql`
6. **Cliquez sur "Run"** (ou appuyez sur Ctrl+Enter)
7. **Vérifiez** qu'il n'y a pas d'erreur

### **Option 2 : Via Supabase CLI**

Si vous avez installé Supabase CLI localement :

```bash
# Appliquer la migration
supabase db push

# OU si vous voulez l'exécuter manuellement
supabase db execute -f supabase/migrations/20250131000000_add_market_hours_and_vacation_periods.sql
```

---

## 📊 Nouveaux champs ajoutés

### 1. `market_days_schedule` (JSONB)

Remplace l'ancien champ `market_days` (array simple) par une structure avec horaires.

**Format :**
```json
{
  "Lundi": [
    {"start": "08:00", "end": "12:00"},
    {"start": "14:00", "end": "18:00"}
  ],
  "Mardi": [],
  "Mercredi": [{"start": "08:00", "end": "12:30"}],
  "Jeudi": [],
  "Vendredi": [],
  "Samedi": [{"start": "07:00", "end": "13:00"}],
  "Dimanche": []
}
```

### 2. `vacation_periods` (JSONB)

Nouveau champ pour gérer plusieurs périodes de vacances.

**Format :**
```json
[
  {
    "id": "period-1706745600000",
    "startDate": "2024-07-01",
    "endDate": "2024-07-31",
    "isRecurring": true
  },
  {
    "id": "period-1706831998000",
    "startDate": "2024-12-24",
    "endDate": "2025-01-02",
    "isRecurring": false
  }
]
```

---

## 🔄 Migration des données existantes

La migration s'occupe automatiquement de :

### ✅ Jours de marché
- Si un client avait `market_days: ["Lundi", "Mercredi"]`
- Devient : `market_days_schedule: {"Lundi": [], "Mardi": [], "Mercredi": [], ...}`
- Les jours sans marché ont un tableau vide `[]`

### ✅ Périodes de vacances
- Si un client avait `vacation_start_date: "2024-07-01"` et `vacation_end_date: "2024-07-31"`
- Devient : `vacation_periods: [{"id": "migrated-xxx", "startDate": "2024-07-01", "endDate": "2024-07-31", "isRecurring": false}]`

---

## ⚠️ Vérifications post-migration

Après avoir exécuté la migration, vérifiez dans Supabase :

### 1. Structure des colonnes

```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('market_days_schedule', 'vacation_periods');
```

Résultat attendu :
```
column_name            | data_type
-----------------------+----------
market_days_schedule   | jsonb
vacation_periods       | jsonb
```

### 2. Données migrées

```sql
-- Vérifier quelques clients
SELECT 
  name,
  market_days,
  market_days_schedule,
  vacation_start_date,
  vacation_end_date,
  vacation_periods
FROM clients
WHERE market_days IS NOT NULL OR vacation_start_date IS NOT NULL
LIMIT 5;
```

---

## 🧹 Nettoyage (Optionnel)

Une fois que vous avez vérifié que tout fonctionne correctement pendant quelques jours, vous pouvez supprimer les anciens champs :

```sql
-- ⚠️ ATTENTION : Cette opération est irréversible !
-- Assurez-vous d'avoir une sauvegarde avant d'exécuter

-- Supprimer les anciens champs
ALTER TABLE clients DROP COLUMN IF EXISTS market_days;
ALTER TABLE clients DROP COLUMN IF EXISTS vacation_start_date;
ALTER TABLE clients DROP COLUMN IF EXISTS vacation_end_date;
ALTER TABLE clients DROP COLUMN IF EXISTS closing_day;
```

---

## 🔙 Rollback (Annulation)

Si vous rencontrez des problèmes, vous pouvez annuler la migration :

```sql
-- Supprimer les nouveaux champs
ALTER TABLE clients DROP COLUMN IF EXISTS market_days_schedule;
ALTER TABLE clients DROP COLUMN IF EXISTS vacation_periods;

-- Les anciennes données (market_days, vacation_start_date, etc.) sont conservées !
```

---

## ✅ Checklist de migration

- [ ] Sauvegarde de la base de données effectuée
- [ ] Migration SQL exécutée sans erreur
- [ ] Nouveaux champs créés (market_days_schedule, vacation_periods)
- [ ] Données migrées correctement vérifiées
- [ ] Application redémarrée pour prendre en compte les changements
- [ ] Tests effectués sur quelques clients
- [ ] (Optionnel) Anciens champs supprimés après validation

---

## 📞 Support

En cas de problème lors de la migration :
1. Vérifiez les logs d'erreur dans Supabase
2. Assurez-vous d'avoir les permissions nécessaires
3. Consultez la documentation Supabase : [supabase.com/docs](https://supabase.com/docs)

---

## 🎉 Après la migration

Une fois la migration effectuée avec succès, l'application pourra :
- ✅ Gérer les horaires de marché par jour avec plages multiples
- ✅ Créer plusieurs périodes de vacances
- ✅ Marquer les périodes comme récurrentes annuellement
- ✅ Afficher les horaires dans les vues client et info

**Prochaine étape** : Redémarrer l'application Next.js pour que les changements prennent effet !

