-- Fix check constraint for aufwach_gefuehl
ALTER TABLE public.daily_metrics DROP CONSTRAINT IF EXISTS daily_metrics_aufwach_gefuehl_check;

-- Add new check constraint with correct values
ALTER TABLE public.daily_metrics ADD CONSTRAINT daily_metrics_aufwach_gefuehl_check 
CHECK (aufwach_gefuehl IS NULL OR aufwach_gefuehl IN ('Energiegeladen', 'Erholt', 'Müde', 'Erschöpft'));

-- Update process_garmin_data function to handle null/empty data properly
CREATE OR REPLACE FUNCTION public.process_garmin_data()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only process if we have meaningful data (not empty JSON)
  IF NEW.raw_json IS NULL OR NEW.raw_json = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Automatically update daily_metrics when new Garmin data arrives
  IF NEW.data_type = 'hrv' AND NEW.processed = false THEN
    UPDATE public.daily_metrics 
    SET 
      hrv_score = COALESCE((NEW.raw_json->'wellnessData'->0->>'lastNightAvg')::numeric, hrv_score),
      garmin_data = COALESCE(garmin_data, '{}'::jsonb) || jsonb_build_object(
        'hrv', NEW.raw_json,
        'last_sync', now(),
        'auto_updated', true
      ),
      garmin_last_sync = now(),
      updated_at = now()
    WHERE user_id = NEW.user_id 
      AND metric_date = NEW.data_date + INTERVAL '1 day'; -- HRV reflects next day
      
    -- Mark as processed
    UPDATE public.garmin_raw_data SET processed = true WHERE id = NEW.id;
  END IF;
  
  IF NEW.data_type = 'sleep' AND NEW.processed = false THEN
    UPDATE public.daily_metrics 
    SET 
      schlafqualitaet = CASE 
        WHEN (NEW.raw_json->'dailySleepDTO'->>'sleepScore')::numeric >= 80 THEN 'Sehr gut'
        WHEN (NEW.raw_json->'dailySleepDTO'->>'sleepScore')::numeric >= 70 THEN 'Gut'
        WHEN (NEW.raw_json->'dailySleepDTO'->>'sleepScore')::numeric >= 50 THEN 'Okay'
        ELSE 'Schlecht'
      END,
      aufwach_gefuehl = CASE 
        WHEN (NEW.raw_json->'dailySleepDTO'->>'sleepScore')::numeric >= 80 THEN 'Energiegeladen'
        WHEN (NEW.raw_json->'dailySleepDTO'->>'sleepScore')::numeric >= 70 THEN 'Erholt'
        WHEN (NEW.raw_json->'dailySleepDTO'->>'sleepScore')::numeric >= 50 THEN 'Müde'
        ELSE 'Erschöpft'
      END,
      garmin_data = COALESCE(garmin_data, '{}'::jsonb) || jsonb_build_object(
        'sleep', NEW.raw_json,
        'last_sync', now(),
        'auto_updated', true
      ),
      garmin_last_sync = now(),
      updated_at = now()
    WHERE user_id = NEW.user_id AND metric_date = NEW.data_date;
    
    UPDATE public.garmin_raw_data SET processed = true WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;