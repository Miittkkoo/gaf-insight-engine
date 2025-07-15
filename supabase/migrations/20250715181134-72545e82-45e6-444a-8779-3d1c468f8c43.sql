-- Create user profiles table for user-specific settings and baselines
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'Europe/Zurich',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Garmin Integration
  garmin_connected BOOLEAN DEFAULT false,
  garmin_credentials_encrypted TEXT, -- Encrypted API keys
  garmin_last_sync TIMESTAMP WITH TIME ZONE,
  
  -- User-specific HRV baselines
  hrv_baseline JSONB DEFAULT '{"avg": 30, "max": 40, "min": 20, "calibrated": false}',
  
  -- Framework baselines (user-specific)
  framework_baselines JSONB DEFAULT '{"mind": 2, "soul": 2, "koerper": 2, "dimension4": 2, "dimension5": 2, "dimension6": 2, "dimension7": 2}',
  
  -- Custom user attributes and definitions
  custom_attributes JSONB DEFAULT '{}',
  attribute_definitions JSONB DEFAULT '{}',
  
  -- User preferences
  notification_preferences JSONB DEFAULT '{"daily_analysis": true, "weekly_reports": true, "critical_alerts": true}',
  analysis_settings JSONB DEFAULT '{"analysis_time": "08:00", "auto_analysis": true}',
  ml_preferences JSONB DEFAULT '{"learning_rate": 0.1, "pattern_sensitivity": 0.7}',
  
  -- User embedding for ML
  user_embedding vector(1536)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    display_name,
    custom_attributes,
    attribute_definitions
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    '{}',
    '{}'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();