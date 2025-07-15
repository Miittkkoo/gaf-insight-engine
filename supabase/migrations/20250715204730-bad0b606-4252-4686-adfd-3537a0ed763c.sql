-- Add unique constraint for user_id and metric_date to enable ON CONFLICT functionality
ALTER TABLE public.daily_metrics 
ADD CONSTRAINT daily_metrics_user_date_unique UNIQUE (user_id, metric_date);