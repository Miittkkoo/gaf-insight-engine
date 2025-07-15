-- Remove duplicate unique constraint
ALTER TABLE public.daily_metrics 
DROP CONSTRAINT IF EXISTS daily_metrics_user_id_metric_date_key;