-- Create a reliable UPSERT function for daily_metrics
CREATE OR REPLACE FUNCTION upsert_daily_metrics(p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
  SELECT
    (p_data->>'user_id')::uuid,
    (p_data->>'metric_date')::date,
    (p_data->>'hrv_score')::numeric,
    p_data->>'hrv_status',
    (p_data->>'hrv_reflects_date')::date,
    (p_data->>'can_validate_patterns')::boolean,
    p_data->'garmin_data',
    (p_data->>'garmin_last_sync')::timestamptz,
    p_data->>'mind_status',
    p_data->>'body_status',
    p_data->>'soul_status',
    p_data->>'fokus_heute',
    p_data->>'energie_budget',
    p_data->>'schlafqualitaet',
    p_data->>'aufwach_gefuehl',
    p_data->>'schlafenszeitpunkt',
    p_data->>'schlaf_bereitschaft',
    (p_data->>'sport_heute')::boolean,
    p_data->>'sport_intensitaet',
    (p_data->>'meditation_heute')::boolean,
    CASE WHEN p_data->'meditation_timing' IS NOT NULL 
         THEN array(select jsonb_array_elements_text(p_data->'meditation_timing'))
         ELSE '{}'::text[]
    END,
    (p_data->>'oliver_arbeit_heute')::boolean,
    CASE WHEN p_data->'werte_gelebt' IS NOT NULL 
         THEN array(select jsonb_array_elements_text(p_data->'werte_gelebt'))
         ELSE '{}'::text[]
    END,
    p_data->>'werte_kreis_balance',
    (p_data->>'werte_zufriedenheit')::integer,
    CASE WHEN p_data->'mood_boosting_events' IS NOT NULL 
         THEN array(select jsonb_array_elements_text(p_data->'mood_boosting_events'))
         ELSE '{}'::text[]
    END,
    CASE WHEN p_data->'mood_killing_events' IS NOT NULL 
         THEN array(select jsonb_array_elements_text(p_data->'mood_killing_events'))
         ELSE '{}'::text[]
    END,
    p_data->>'events_bilanz',
    p_data->>'alkohol_konsum',
    p_data->>'alkohol_timing',
    p_data->>'alkohol_details',
    p_data->>'letzte_hauptmahlzeit',
    p_data->>'abendliche_nahrung',
    p_data->>'verdauungsgefuehl',
    p_data->>'gedanken_aktivitaet',
    p_data->>'emotionale_belastung',
    (p_data->>'stress_level')::integer,
    p_data->>'task_feeling',
    CASE WHEN p_data->'koerperliche_symptome' IS NOT NULL 
         THEN array(select jsonb_array_elements_text(p_data->'koerperliche_symptome'))
         ELSE '{}'::text[]
    END,
    p_data->>'energie_level_ende',
    p_data->>'regenerations_bedarf_morgen',
    p_data->>'erwartete_hrv_morgen',
    p_data->>'anpassungen_morgen',
    p_data->>'erkenntnisse',
    p_data->>'groesster_widerstand',
    (p_data->>'tag_bewertung')::integer,
    CASE WHEN p_data->'kontemplative_aktivitaeten' IS NOT NULL 
         THEN array(select jsonb_array_elements_text(p_data->'kontemplative_aktivitaeten'))
         ELSE '{}'::text[]
    END,
    CASE WHEN p_data->'kognitive_verarbeitung' IS NOT NULL 
         THEN array(select jsonb_array_elements_text(p_data->'kognitive_verarbeitung'))
         ELSE '{}'::text[]
    END,
    COALESCE(p_data->'custom_variables', '{}'::jsonb),
    COALESCE(p_data->'lifestyle_factors', '{}'::jsonb),
    (p_data->>'daily_embedding')::vector,
    (p_data->>'lifestyle_embedding')::vector,
    COALESCE(p_data->'detected_correlations', '{}'::jsonb),
    COALESCE(p_data->'anomaly_scores', '{}'::jsonb),
    COALESCE((p_data->>'data_quality_score')::double precision, 0),
    COALESCE((p_data->>'data_completeness')::double precision, 0),
    COALESCE(p_data->'manual_overrides', '{}'::jsonb),
    p_data->>'notizen',
    COALESCE((p_data->>'updated_at')::timestamptz, now())
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
END;
$$;