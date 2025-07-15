-- Add unique constraint to daily_metrics table for user_id and metric_date combination
-- This will allow UPSERT operations to work correctly
ALTER TABLE public.daily_metrics 
ADD CONSTRAINT daily_metrics_user_id_metric_date_unique 
UNIQUE (user_id, metric_date);