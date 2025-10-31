-- Migration pour ajouter les horaires de marché et les périodes de vacances multiples
-- Date: 2025-01-31

-- 1. Modifier le champ market_days pour supporter la structure JSON avec horaires
-- Note: market_days devient market_days_schedule (JSONB) pour stocker les horaires
-- Format: { "Lundi": [{"start": "08:00", "end": "12:00"}], "Mardi": [], ... }

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS market_days_schedule JSONB DEFAULT '{
  "Lundi": [],
  "Mardi": [],
  "Mercredi": [],
  "Jeudi": [],
  "Vendredi": [],
  "Samedi": [],
  "Dimanche": []
}'::jsonb;

-- 2. Ajouter un champ pour les périodes de vacances multiples
-- Format: [{"id": "period-123", "startDate": "2024-07-01", "endDate": "2024-07-31", "isRecurring": true}]

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS vacation_periods JSONB DEFAULT '[]'::jsonb;

-- 3. Migrer les données existantes de market_days vers market_days_schedule
-- Si market_days contient ["Lundi", "Mardi"], on crée la structure avec des horaires vides
UPDATE clients
SET market_days_schedule = (
  SELECT jsonb_object_agg(
    day,
    CASE 
      WHEN market_days @> ARRAY[day]::text[]
      THEN '[]'::jsonb  -- Jour avec marché mais sans horaires définis
      ELSE '[]'::jsonb  -- Pas de marché ce jour
    END
  )
  FROM unnest(ARRAY['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']) AS day
)
WHERE market_days IS NOT NULL AND array_length(market_days, 1) > 0;

-- 4. Migrer les données existantes de vacation_start_date et vacation_end_date
-- vers vacation_periods (si renseignées)
UPDATE clients
SET vacation_periods = jsonb_build_array(
  jsonb_build_object(
    'id', 'migrated-' || id,
    'startDate', vacation_start_date,
    'endDate', vacation_end_date,
    'isRecurring', false
  )
)
WHERE vacation_start_date IS NOT NULL AND vacation_end_date IS NOT NULL;

-- 5. Commentaires sur les colonnes pour documentation
COMMENT ON COLUMN clients.market_days_schedule IS 'Horaires des jours de marché par jour de la semaine (JSONB). Format: {"Lundi": [{"start": "08:00", "end": "12:00"}], ...}';
COMMENT ON COLUMN clients.vacation_periods IS 'Périodes de vacances multiples avec récurrence (JSONB). Format: [{"id": "period-123", "startDate": "2024-07-01", "endDate": "2024-07-31", "isRecurring": true}]';

-- 6. OPTIONNEL: Vous pouvez supprimer les anciens champs après vérification
-- Décommentez ces lignes une fois que vous avez vérifié que tout fonctionne correctement

-- ALTER TABLE clients DROP COLUMN IF EXISTS market_days;
-- ALTER TABLE clients DROP COLUMN IF EXISTS vacation_start_date;
-- ALTER TABLE clients DROP COLUMN IF EXISTS vacation_end_date;
-- ALTER TABLE clients DROP COLUMN IF EXISTS closing_day;

-- Note: On garde closing_day pour l'instant car il est utilisé ailleurs dans l'app

