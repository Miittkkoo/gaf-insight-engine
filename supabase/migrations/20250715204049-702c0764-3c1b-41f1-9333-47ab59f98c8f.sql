-- Schritt 1: Alte problematische Struktur bereinigen
DROP FUNCTION IF EXISTS public.upsert_daily_metrics(jsonb);

-- Schritt 2: Fundamentale Strukturverbesserungen
-- user_id sollte NOT NULL sein für RLS und unique constraints
ALTER TABLE public.daily_metrics 
ALTER COLUMN user_id SET NOT NULL;

-- Schritt 3: Bessere RLS Policies 
DROP POLICY IF EXISTS "Users can create their own daily metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Users can view their own daily metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Users can update their own daily metrics" ON public.daily_metrics;
DROP POLICY IF EXISTS "Users can delete their own daily metrics" ON public.daily_metrics;

-- Neue, robuste RLS Policies
CREATE POLICY "Enable all operations for authenticated users on their own data" 
ON public.daily_metrics 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Schritt 4: Einfache, robuste UPSERT Funktion
CREATE OR REPLACE FUNCTION public.save_daily_metrics(
  p_user_id UUID,
  p_metric_date DATE,
  p_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_data JSONB;
BEGIN
  -- Sicherheitscheck: Nur eigene Daten
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Einfacher INSERT mit ON CONFLICT UPDATE
  INSERT INTO public.daily_metrics (
    user_id, 
    metric_date,
    hrv_score,
    hrv_status,
    hrv_reflects_date,
    mind_status,
    body_status,
    soul_status,
    fokus_heute,
    energie_budget,
    schlafqualitaet,
    aufwach_gefuehl,
    sport_heute,
    sport_intensitaet,
    meditation_heute,
    meditation_timing,
    werte_gelebt,
    werte_zufriedenheit,
    mood_boosting_events,
    mood_killing_events,
    alkohol_konsum,
    alkohol_timing,
    letzte_hauptmahlzeit,
    abendliche_nahrung,
    koerperliche_symptome,
    stress_level,
    tag_bewertung,
    kontemplative_aktivitaeten,
    kognitive_verarbeitung,
    regenerations_bedarf_morgen,
    erwartete_hrv_morgen,
    anpassungen_morgen,
    erkenntnisse,
    notizen,
    data_completeness,
    updated_at
  ) VALUES (
    p_user_id,
    p_metric_date,
    (p_data->>'hrv_score')::NUMERIC,
    p_data->>'hrv_status',
    (p_metric_date - INTERVAL '1 day')::DATE, -- HRV reflects previous day
    p_data->>'mind_status',
    p_data->>'body_status', 
    p_data->>'soul_status',
    p_data->>'fokus_heute',
    p_data->>'energie_budget',
    p_data->>'schlafqualitaet',
    p_data->>'aufwach_gefuehl',
    COALESCE((p_data->>'sport_heute')::BOOLEAN, false),
    p_data->>'sport_intensitaet',
    COALESCE((p_data->>'meditation_heute')::BOOLEAN, false),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_data->'meditation_timing')), 
      ARRAY[]::TEXT[]
    ),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_data->'werte_gelebt')), 
      ARRAY[]::TEXT[]
    ),
    (p_data->>'werte_zufriedenheit')::INTEGER,
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_data->'mood_boosting_events')), 
      ARRAY[]::TEXT[]
    ),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_data->'mood_killing_events')), 
      ARRAY[]::TEXT[]
    ),
    p_data->>'alkohol_konsum',
    p_data->>'alkohol_timing',
    p_data->>'letzte_hauptmahlzeit',
    p_data->>'abendliche_nahrung',
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_data->'koerperliche_symptome')), 
      ARRAY[]::TEXT[]
    ),
    (p_data->>'stress_level')::INTEGER,
    (p_data->>'tag_bewertung')::INTEGER,
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_data->'kontemplative_aktivitaeten')), 
      ARRAY[]::TEXT[]
    ),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_data->'kognitive_verarbeitung')), 
      ARRAY[]::TEXT[]
    ),
    p_data->>'regenerations_bedarf_morgen',
    p_data->>'erwartete_hrv_morgen',
    p_data->>'anpassungen_morgen',
    p_data->>'erkenntnisse',
    p_data->>'notizen',
    COALESCE((p_data->>'data_completeness')::DOUBLE PRECISION, 0),
    NOW()
  )
  ON CONFLICT (user_id, metric_date) 
  DO UPDATE SET
    hrv_score = EXCLUDED.hrv_score,
    hrv_status = EXCLUDED.hrv_status,
    mind_status = EXCLUDED.mind_status,
    body_status = EXCLUDED.body_status,
    soul_status = EXCLUDED.soul_status,
    fokus_heute = EXCLUDED.fokus_heute,
    energie_budget = EXCLUDED.energie_budget,
    schlafqualitaet = EXCLUDED.schlafqualitaet,
    aufwach_gefuehl = EXCLUDED.aufwach_gefuehl,
    sport_heute = EXCLUDED.sport_heute,
    sport_intensitaet = EXCLUDED.sport_intensitaet,
    meditation_heute = EXCLUDED.meditation_heute,
    meditation_timing = EXCLUDED.meditation_timing,
    werte_gelebt = EXCLUDED.werte_gelebt,
    werte_zufriedenheit = EXCLUDED.werte_zufriedenheit,
    mood_boosting_events = EXCLUDED.mood_boosting_events,
    mood_killing_events = EXCLUDED.mood_killing_events,
    alkohol_konsum = EXCLUDED.alkohol_konsum,
    alkohol_timing = EXCLUDED.alkohol_timing,
    letzte_hauptmahlzeit = EXCLUDED.letzte_hauptmahlzeit,
    abendliche_nahrung = EXCLUDED.abendliche_nahrung,
    koerperliche_symptome = EXCLUDED.koerperliche_symptome,
    stress_level = EXCLUDED.stress_level,
    tag_bewertung = EXCLUDED.tag_bewertung,
    kontemplative_aktivitaeten = EXCLUDED.kontemplative_aktivitaeten,
    kognitive_verarbeitung = EXCLUDED.kognitive_verarbeitung,
    regenerations_bedarf_morgen = EXCLUDED.regenerations_bedarf_morgen,
    erwartete_hrv_morgen = EXCLUDED.erwartete_hrv_morgen,
    anpassungen_morgen = EXCLUDED.anpassungen_morgen,
    erkenntnisse = EXCLUDED.erkenntnisse,
    notizen = EXCLUDED.notizen,
    data_completeness = EXCLUDED.data_completeness,
    updated_at = EXCLUDED.updated_at
  RETURNING to_jsonb(daily_metrics.*);

  -- Return the saved data
  SELECT to_jsonb(dm.*) INTO result_data
  FROM daily_metrics dm 
  WHERE dm.user_id = p_user_id AND dm.metric_date = p_metric_date;

  RETURN result_data;
END;
$$;