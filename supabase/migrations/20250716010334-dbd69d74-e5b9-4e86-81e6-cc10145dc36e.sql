-- First fix existing invalid data 
UPDATE public.daily_metrics 
SET aufwach_gefuehl = CASE 
  WHEN aufwach_gefuehl NOT IN ('Energiegeladen', 'Erholt', 'Müde', 'Erschöpft') THEN NULL
  ELSE aufwach_gefuehl
END;

-- Now add the check constraint
ALTER TABLE public.daily_metrics DROP CONSTRAINT IF EXISTS daily_metrics_aufwach_gefuehl_check;
ALTER TABLE public.daily_metrics ADD CONSTRAINT daily_metrics_aufwach_gefuehl_check 
CHECK (aufwach_gefuehl IS NULL OR aufwach_gefuehl IN ('Energiegeladen', 'Erholt', 'Müde', 'Erschöpft'));