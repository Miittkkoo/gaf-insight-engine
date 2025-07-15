-- Drop and recreate the upsert function with improved error handling
DROP FUNCTION IF EXISTS public.upsert_daily_metrics(jsonb);

CREATE OR REPLACE FUNCTION public.upsert_daily_metrics(p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    conflict_constraint_name text := 'daily_metrics_user_id_metric_date_unique';
BEGIN
  -- Verify the constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = conflict_constraint_name
  ) THEN
    RAISE EXCEPTION 'Constraint % does not exist', conflict_constraint_name;
  END IF;

  INSERT INTO public.daily_metrics (
    user_id, metric_date, hrv_score, hrv_status, hrv_reflects_date,
    can_validate_patterns, garmin_data, garmin_last_sync, mind_status,
    body_status, soul_status, fokus_heute, energie_budget, schlafqualitaet,
    aufwach_gefuehl, schlafenszeitpunkt, schlaf_bereitschaft, sport_heute,
    sport_intensitaet, meditation_heute, meditation_timing, oliver_arbeit_heute,
    werte_gelebt, werte_kreis_balance, werte_zufriedenheit, mood_boosting_events,
    mood_killing_events, events_bilanz, alkohol_konsum, alkohol_timing,
    alkohol_details, letzte_hauptmahlzeit, abendliche_nahrung, verdauungsgefuehl,
    gedanken_aktivitaet, emotionale_belastung, stress_level, task_feeling,
    koerperliche_symptome, energie_level_ende, regenerations_bedarf_morgen,
    erwartete_hrv_morgen, anpassungen_morgen, erkenntnisse, groesster_widerstand,
    tag_bewertung, kontemplative_aktivitaeten, kognitive_verarbeitung,
    custom_variables, lifestyle_factors, daily_embedding, lifestyle_embedding,
    detected_correlations, anomaly_scores, data_quality_score, data_completeness,
    manual_overrides, notizen, updated_at
  )
  VALUES (
    (p_data->>'user_id')::uuid,
    (p_data->>'metric_date')::date,
    CASE WHEN p_data->>'hrv_score' = '' OR p_data->>'hrv_score' IS NULL THEN NULL 
         ELSE (p_data->>'hrv_score')::numeric END,
    NULLIF(p_data->>'hrv_status', ''),
    (p_data->>'hrv_reflects_date')::date,
    COALESCE((p_data->>'can_validate_patterns')::boolean, false),
    COALESCE(p_data->'garmin_data', '{}'::jsonb),
    CASE WHEN p_data->>'garmin_last_sync' = '' OR p_data->>'garmin_last_sync' IS NULL THEN NULL 
         ELSE (p_data->>'garmin_last_sync')::timestamptz END,
    NULLIF(p_data->>'mind_status', ''),
    NULLIF(p_data->>'body_status', ''),
    NULLIF(p_data->>'soul_status', ''),
    NULLIF(p_data->>'fokus_heute', ''),
    NULLIF(p_data->>'energie_budget', ''),
    NULLIF(p_data->>'schlafqualitaet', ''),
    NULLIF(p_data->>'aufwach_gefuehl', ''),
    NULLIF(p_data->>'schlafenszeitpunkt', ''),
    NULLIF(p_data->>'schlaf_bereitschaft', ''),
    COALESCE((p_data->>'sport_heute')::boolean, false),
    NULLIF(p_data->>'sport_intensitaet', ''),
    COALESCE((p_data->>'meditation_heute')::boolean, false),
    CASE WHEN p_data->'meditation_timing' IS NOT NULL 
         THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'meditation_timing'))
         ELSE '{}'::text[] END,
    COALESCE((p_data->>'oliver_arbeit_heute')::boolean, false),
    CASE WHEN p_data->'werte_gelebt' IS NOT NULL 
         THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'werte_gelebt'))
         ELSE '{}'::text[] END,
    NULLIF(p_data->>'werte_kreis_balance', ''),
    CASE WHEN p_data->>'werte_zufriedenheit' = '' OR p_data->>'werte_zufriedenheit' IS NULL THEN NULL 
         ELSE (p_data->>'werte_zufriedenheit')::integer END,
    CASE WHEN p_data->'mood_boosting_events' IS NOT NULL 
         THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'mood_boosting_events'))
         ELSE '{}'::text[] END,
    CASE WHEN p_data->'mood_killing_events' IS NOT NULL 
         THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'mood_killing_events'))
         ELSE '{}'::text[] END,
    NULLIF(p_data->>'events_bilanz', ''),
    NULLIF(p_data->>'alkohol_konsum', ''),
    NULLIF(p_data->>'alkohol_timing', ''),
    NULLIF(p_data->>'alkohol_details', ''),
    NULLIF(p_data->>'letzte_hauptmahlzeit', ''),
    NULLIF(p_data->>'abendliche_nahrung', ''),
    NULLIF(p_data->>'verdauungsgefuehl', ''),
    NULLIF(p_data->>'gedanken_aktivitaet', ''),
    NULLIF(p_data->>'emotionale_belastung', ''),
    CASE WHEN p_data->>'stress_level' = '' OR p_data->>'stress_level' IS NULL THEN NULL 
         ELSE (p_data->>'stress_level')::integer END,
    NULLIF(p_data->>'task_feeling', ''),
    CASE WHEN p_data->'koerperliche_symptome' IS NOT NULL 
         THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'koerperliche_symptome'))
         ELSE '{}'::text[] END,
    NULLIF(p_data->>'energie_level_ende', ''),
    NULLIF(p_data->>'regenerations_bedarf_morgen', ''),
    NULLIF(p_data->>'erwartete_hrv_morgen', ''),
    NULLIF(p_data->>'anpassungen_morgen', ''),
    NULLIF(p_data->>'erkenntnisse', ''),
    NULLIF(p_data->>'groesster_widerstand', ''),
    CASE WHEN p_data->>'tag_bewertung' = '' OR p_data->>'tag_bewertung' IS NULL THEN NULL 
         ELSE (p_data->>'tag_bewertung')::integer END,
    CASE WHEN p_data->'kontemplative_aktivitaeten' IS NOT NULL 
         THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'kontemplative_aktivitaeten'))
         ELSE '{}'::text[] END,
    CASE WHEN p_data->'kognitive_verarbeitung' IS NOT NULL 
         THEN ARRAY(SELECT jsonb_array_elements_text(p_data->'kognitive_verarbeitung'))
         ELSE '{}'::text[] END,
    COALESCE(p_data->'custom_variables', '{}'::jsonb),
    COALESCE(p_data->'lifestyle_factors', '{}'::jsonb),
    CASE WHEN p_data->>'daily_embedding' = '' OR p_data->>'daily_embedding' IS NULL THEN NULL 
         ELSE (p_data->>'daily_embedding')::vector END,
    CASE WHEN p_data->>'lifestyle_embedding' = '' OR p_data->>'lifestyle_embedding' IS NULL THEN NULL 
         ELSE (p_data->>'lifestyle_embedding')::vector END,
    COALESCE(p_data->'detected_correlations', '{}'::jsonb),
    COALESCE(p_data->'anomaly_scores', '{}'::jsonb),
    COALESCE((p_data->>'data_quality_score')::double precision, 0),
    COALESCE((p_data->>'data_completeness')::double precision, 0),
    COALESCE(p_data->'manual_overrides', '{}'::jsonb),
    NULLIF(p_data->>'notizen', ''),
    COALESCE((p_data->>'updated_at')::timestamptz, now())
  )
  ON CONFLICT (user_id, metric_date)
  DO UPDATE SET
    hrv_score = EXCLUDED.hrv_score,
    hrv_status = EXCLUDED.hrv_status,
    hrv_reflects_date = EXCLUDED.hrv_reflects_date,
    can_validate_patterns = EXCLUDED.can_validate_patterns,
    garmin_data = EXCLUDED.garmin_data,
    garmin_last_sync = EXCLUDED.garmin_last_sync,
    mind_status = EXCLUDED.mind_status,
    body_status = EXCLUDED.body_status,
    soul_status = EXCLUDED.soul_status,
    fokus_heute = EXCLUDED.fokus_heute,
    energie_budget = EXCLUDED.energie_budget,
    schlafqualitaet = EXCLUDED.schlafqualitaet,
    aufwach_gefuehl = EXCLUDED.aufwach_gefuehl,
    schlafenszeitpunkt = EXCLUDED.schlafenszeitpunkt,
    schlaf_bereitschaft = EXCLUDED.schlaf_bereitschaft,
    sport_heute = EXCLUDED.sport_heute,
    sport_intensitaet = EXCLUDED.sport_intensitaet,
    meditation_heute = EXCLUDED.meditation_heute,
    meditation_timing = EXCLUDED.meditation_timing,
    oliver_arbeit_heute = EXCLUDED.oliver_arbeit_heute,
    werte_gelebt = EXCLUDED.werte_gelebt,
    werte_kreis_balance = EXCLUDED.werte_kreis_balance,
    werte_zufriedenheit = EXCLUDED.werte_zufriedenheit,
    mood_boosting_events = EXCLUDED.mood_boosting_events,
    mood_killing_events = EXCLUDED.mood_killing_events,
    events_bilanz = EXCLUDED.events_bilanz,
    alkohol_konsum = EXCLUDED.alkohol_konsum,
    alkohol_timing = EXCLUDED.alkohol_timing,
    alkohol_details = EXCLUDED.alkohol_details,
    letzte_hauptmahlzeit = EXCLUDED.letzte_hauptmahlzeit,
    abendliche_nahrung = EXCLUDED.abendliche_nahrung,
    verdauungsgefuehl = EXCLUDED.verdauungsgefuehl,
    gedanken_aktivitaet = EXCLUDED.gedanken_aktivitaet,
    emotionale_belastung = EXCLUDED.emotionale_belastung,
    stress_level = EXCLUDED.stress_level,
    task_feeling = EXCLUDED.task_feeling,
    koerperliche_symptome = EXCLUDED.koerperliche_symptome,
    energie_level_ende = EXCLUDED.energie_level_ende,
    regenerations_bedarf_morgen = EXCLUDED.regenerations_bedarf_morgen,
    erwartete_hrv_morgen = EXCLUDED.erwartete_hrv_morgen,
    anpassungen_morgen = EXCLUDED.anpassungen_morgen,
    erkenntnisse = EXCLUDED.erkenntnisse,
    groesster_widerstand = EXCLUDED.groesster_widerstand,
    tag_bewertung = EXCLUDED.tag_bewertung,
    kontemplative_aktivitaeten = EXCLUDED.kontemplative_aktivitaeten,
    kognitive_verarbeitung = EXCLUDED.kognitive_verarbeitung,
    custom_variables = EXCLUDED.custom_variables,
    lifestyle_factors = EXCLUDED.lifestyle_factors,
    daily_embedding = EXCLUDED.daily_embedding,
    lifestyle_embedding = EXCLUDED.lifestyle_embedding,
    detected_correlations = EXCLUDED.detected_correlations,
    anomaly_scores = EXCLUDED.anomaly_scores,
    data_quality_score = EXCLUDED.data_quality_score,
    data_completeness = EXCLUDED.data_completeness,
    manual_overrides = EXCLUDED.manual_overrides,
    notizen = EXCLUDED.notizen,
    updated_at = EXCLUDED.updated_at;
    
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'upsert_daily_metrics failed: %', SQLERRM;
END;
$$;