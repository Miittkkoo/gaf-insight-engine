-- Fix RLS policies for garmin_sync_logs and garmin_raw_data tables

-- Enable RLS on both tables (if not already enabled)
ALTER TABLE public.garmin_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garmin_raw_data ENABLE ROW LEVEL SECURITY;

-- Create policies for garmin_sync_logs
CREATE POLICY "Users can view their own sync logs" 
ON public.garmin_sync_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs" 
ON public.garmin_sync_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert sync logs" 
ON public.garmin_sync_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can select sync logs" 
ON public.garmin_sync_logs 
FOR SELECT 
USING (true);

-- Create policies for garmin_raw_data
CREATE POLICY "Users can view their own raw data" 
ON public.garmin_raw_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own raw data" 
ON public.garmin_raw_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own raw data" 
ON public.garmin_raw_data 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage raw data" 
ON public.garmin_raw_data 
FOR ALL 
USING (true);

-- Grant necessary permissions to service role
GRANT ALL ON public.garmin_sync_logs TO service_role;
GRANT ALL ON public.garmin_raw_data TO service_role;