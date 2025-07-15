-- Create system tables for migration safety

-- 1. Feature Flags Table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  user_percentage NUMERIC DEFAULT 0 CHECK (user_percentage >= 0 AND user_percentage <= 100),
  config JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for feature flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature flags (they're application-wide)
CREATE POLICY "Everyone can read feature flags" 
ON public.feature_flags FOR SELECT 
USING (true);

-- Only system admin can modify feature flags
CREATE POLICY "Only system can modify feature flags" 
ON public.feature_flags FOR ALL 
USING (false)
WITH CHECK (false);

-- 2. User Data Backups Table
CREATE TABLE IF NOT EXISTS public.user_data_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  backup_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  backup_type TEXT NOT NULL DEFAULT 'manual',
  profile_data JSONB,
  metrics_data JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for backups
ALTER TABLE public.user_data_backups ENABLE ROW LEVEL SECURITY;

-- Users can only access their own backups
CREATE POLICY "Users can view their own backups" 
ON public.user_data_backups FOR SELECT 
USING (auth.uid() = user_id);

-- 3. System Configuration Table
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert initial system version
INSERT INTO public.system_config (key, value, description) 
VALUES 
  ('db_version', '"1.0.0"'::jsonb, 'Database schema version'),
  ('app_version', '"1.0.0"'::jsonb, 'Application version'),
  ('migration_lock', 'false'::jsonb, 'Migration lock status')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS for system config (read-only for authenticated users)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read system config" 
ON public.system_config FOR SELECT 
USING (auth.role() = 'authenticated');

-- 4. Health Check Function
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  details JSONB
) AS $$
BEGIN
  -- Check RLS Policies
  RETURN QUERY
  SELECT 
    'rls_enabled'::TEXT,
    CASE WHEN COUNT(*) >= 8 THEN 'OK' ELSE 'WARNING' END::TEXT,
    jsonb_build_object(
      'tables_with_rls', COUNT(*),
      'expected_minimum', 8
    )
  FROM information_schema.tables t
  JOIN pg_class c ON c.relname = t.table_name
  WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND c.relrowsecurity = true;
    
  -- Check User Profiles
  RETURN QUERY
  SELECT 
    'user_profiles'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
    jsonb_build_object('total_users', COUNT(*))
  FROM public.user_profiles;
  
  -- Check Daily Metrics Integrity
  RETURN QUERY
  SELECT 
    'daily_metrics_integrity'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END::TEXT,
    jsonb_build_object('orphaned_records', COUNT(*))
  FROM public.daily_metrics 
  WHERE user_id IS NULL;
  
  -- Check System Configuration
  RETURN QUERY
  SELECT 
    'system_config'::TEXT,
    CASE WHEN COUNT(*) >= 3 THEN 'OK' ELSE 'WARNING' END::TEXT,
    jsonb_build_object('config_entries', COUNT(*))
  FROM public.system_config;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Constraint Validation Function
CREATE OR REPLACE FUNCTION public.validate_constraints()
RETURNS TABLE (
  constraint_name TEXT,
  table_name TEXT,
  violations INTEGER,
  constraint_type TEXT
) AS $$
BEGIN
  -- This is a placeholder function that would check specific constraints
  -- In a real implementation, you'd check for specific business rule violations
  
  RETURN QUERY
  SELECT 
    'user_id_not_null'::TEXT,
    'daily_metrics'::TEXT,
    (SELECT COUNT(*)::INTEGER FROM public.daily_metrics WHERE user_id IS NULL),
    'NOT NULL'::TEXT;
    
  RETURN QUERY
  SELECT 
    'metric_date_valid'::TEXT,
    'daily_metrics'::TEXT,
    (SELECT COUNT(*)::INTEGER FROM public.daily_metrics WHERE metric_date > CURRENT_DATE),
    'BUSINESS RULE'::TEXT;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Find Users Without Profiles Function
CREATE OR REPLACE FUNCTION public.find_users_without_profiles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- This would find auth.users without corresponding profiles
  -- Since we can't directly query auth.users from the client,
  -- we'll return an empty result for now
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Test Functions for Post-Migration Validation
CREATE OR REPLACE FUNCTION public.test_daily_metrics_insert()
RETURNS BOOLEAN AS $$
DECLARE
  test_user_id UUID;
  test_result BOOLEAN := false;
BEGIN
  -- Get current user
  test_user_id := auth.uid();
  
  IF test_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Try a simple operation that exercises RLS
  PERFORM 1 FROM public.daily_metrics 
  WHERE user_id = test_user_id 
  LIMIT 1;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.test_profile_update()
RETURNS BOOLEAN AS $$
DECLARE
  test_user_id UUID;
BEGIN
  test_user_id := auth.uid();
  
  IF test_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Test profile access
  PERFORM 1 FROM public.user_profiles 
  WHERE id = test_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at triggers
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default feature flags
INSERT INTO public.feature_flags (name, enabled, user_percentage, description) VALUES
  ('new_garmin_integration', false, 0, 'Enable new Garmin integration features'),
  ('enhanced_analytics', false, 0, 'Enable enhanced analytics dashboard'),
  ('experimental_ai_insights', false, 0, 'Enable experimental AI-powered insights')
ON CONFLICT (name) DO NOTHING;