-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job for automatic Garmin data sync (every 6 hours)
SELECT cron.schedule(
  'garmin-auto-sync',
  '0 */6 * * *', -- Every 6 hours at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://hjlmhuboqunwplieenwb.supabase.co/functions/v1/garmin-auto-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqbG1odWJvcXVud3BsaWVlbndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTUyMzEsImV4cCI6MjA2ODE3MTIzMX0.sG9rpdypGInoo6mUMway0ht68SU4pnHcDF9JszN-OPk"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to manually trigger auto-sync (for testing/admin)
CREATE OR REPLACE FUNCTION public.trigger_garmin_auto_sync()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT
    net.http_post(
        url:='https://hjlmhuboqunwplieenwb.supabase.co/functions/v1/garmin-auto-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqbG1odWJvcXVud3BsaWVlbndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTUyMzEsImV4cCI6MjA2ODE3MTIzMX0.sG9rpdypGInoo6mUMway0ht68SU4pnHcDF9JszN-OPk"}'::jsonb,
        body:='{"manual_trigger": true}'::jsonb
    ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for better performance on garmin_raw_data queries
CREATE INDEX IF NOT EXISTS idx_garmin_raw_data_user_date 
ON public.garmin_raw_data(user_id, data_date DESC);

-- Add index for sync logs
CREATE INDEX IF NOT EXISTS idx_garmin_sync_logs_user_timestamp 
ON public.garmin_sync_logs(user_id, sync_timestamp DESC);