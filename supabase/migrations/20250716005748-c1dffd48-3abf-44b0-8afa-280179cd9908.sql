-- Fix the process_garmin_data trigger to handle JSON properly
CREATE OR REPLACE FUNCTION public.process_garmin_data()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
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

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS process_garmin_data_trigger ON public.garmin_raw_data;
CREATE TRIGGER process_garmin_data_trigger
  AFTER INSERT ON public.garmin_raw_data
  FOR EACH ROW
  EXECUTE FUNCTION process_garmin_data();