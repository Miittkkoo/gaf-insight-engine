-- First, set default user_id for any existing rows without user_id
UPDATE public.daily_metrics 
SET user_id = '00000000-0000-0000-0000-000000000000'::uuid 
WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE public.daily_metrics 
ALTER COLUMN user_id SET NOT NULL;

-- Now add the unique constraint
ALTER TABLE public.daily_metrics 
ADD CONSTRAINT daily_metrics_user_id_metric_date_unique 
UNIQUE (user_id, metric_date);