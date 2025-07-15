-- Garmin Data Integration Tables
CREATE TABLE public.garmin_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sync_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_type TEXT NOT NULL, -- 'hrv', 'sleep', 'activity', 'stress', 'full'
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'partial'
  data_points_synced INTEGER DEFAULT 0,
  error_message TEXT,
  garmin_last_activity_timestamp TIMESTAMP WITH TIME ZONE,
  sync_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Garmin Device Information
CREATE TABLE public.garmin_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT, -- 'watch', 'scale', 'bike_computer'
  firmware_version TEXT,
  last_sync TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Raw Garmin Data Storage
CREATE TABLE public.garmin_raw_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_date DATE NOT NULL,
  data_type TEXT NOT NULL, -- 'hrv', 'sleep', 'stress', 'body_battery', 'activity'
  raw_json JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_errors TEXT[],
  garmin_id TEXT, -- Original Garmin ID for deduplication
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, data_date, data_type, garmin_id)
);

-- Auto-processing function for Garmin data
CREATE OR REPLACE FUNCTION public.process_garmin_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically update daily_metrics when new Garmin data arrives
  IF NEW.data_type = 'hrv' AND NEW.processed = false THEN
    UPDATE public.daily_metrics 
    SET 
      hrv_score = COALESCE((NEW.raw_json->>'lastNightAvg')::numeric, hrv_score),
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
        WHEN (NEW.raw_json->>'sleepScores'->>'overall')::numeric >= 80 THEN 'Sehr gut'
        WHEN (NEW.raw_json->>'sleepScores'->>'overall')::numeric >= 70 THEN 'Gut'
        WHEN (NEW.raw_json->>'sleepScores'->>'overall')::numeric >= 50 THEN 'Okay'
        ELSE 'Schlecht'
      END,
      aufwach_gefuehl = CASE 
        WHEN (NEW.raw_json->>'sleepScores'->>'awakenings')::numeric <= 2 THEN 'Energiegeladen'
        WHEN (NEW.raw_json->>'sleepScores'->>'awakenings')::numeric <= 4 THEN 'Erholt'
        WHEN (NEW.raw_json->>'sleepScores'->>'awakenings')::numeric <= 6 THEN 'Müde'
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
$$ LANGUAGE plpgsql;

-- Trigger for auto-processing
CREATE TRIGGER auto_process_garmin_data
  AFTER INSERT ON public.garmin_raw_data
  FOR EACH ROW
  EXECUTE FUNCTION public.process_garmin_data();

-- Function to trigger analysis update when daily_metrics is modified
CREATE OR REPLACE FUNCTION public.trigger_analysis_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if significant fields have changed
  IF (OLD.hrv_score IS DISTINCT FROM NEW.hrv_score OR
      OLD.stress_level IS DISTINCT FROM NEW.stress_level OR
      OLD.tag_bewertung IS DISTINCT FROM NEW.tag_bewertung OR
      OLD.werte_zufriedenheit IS DISTINCT FROM NEW.werte_zufriedenheit OR
      OLD.mind_status IS DISTINCT FROM NEW.mind_status OR
      OLD.body_status IS DISTINCT FROM NEW.body_status OR
      OLD.soul_status IS DISTINCT FROM NEW.soul_status) THEN
    
    -- Insert a pending analysis job
    INSERT INTO public.gaf_analysis_results (
      user_id,
      analysis_date,
      analysis_type,
      framework_score,
      executive_summary,
      confidence_level,
      data_completeness,
      custom_insights
    ) VALUES (
      NEW.user_id,
      NEW.metric_date,
      'triggered_update',
      jsonb_build_object(
        'total', 0,
        'dimensions', jsonb_build_object(
          'mind', CASE NEW.mind_status 
            WHEN 'Klar & Motiviert' THEN 3
            WHEN 'Funktional aber angestrengt' THEN 2
            ELSE 1 END,
          'body', CASE NEW.body_status 
            WHEN 'Energievoll & Vital' THEN 3
            WHEN 'Müde aber okay' THEN 2
            ELSE 1 END,
          'soul', CASE NEW.soul_status 
            WHEN 'Zufrieden & Sinnhaft' THEN 3
            WHEN 'Neutral & Funktional' THEN 2
            ELSE 1 END
        )
      ),
      'Analysis triggered by data update at ' || now()::text,
      0.85,
      CASE 
        WHEN NEW.hrv_score IS NOT NULL THEN 0.9
        ELSE 0.6
      END,
      jsonb_build_object(
        'trigger_reason', 'manual_data_update',
        'updated_fields', ARRAY[
          CASE WHEN OLD.hrv_score IS DISTINCT FROM NEW.hrv_score THEN 'hrv_score' END,
          CASE WHEN OLD.stress_level IS DISTINCT FROM NEW.stress_level THEN 'stress_level' END,
          CASE WHEN OLD.tag_bewertung IS DISTINCT FROM NEW.tag_bewertung THEN 'tag_bewertung' END
        ]
      )
    )
    ON CONFLICT (user_id, analysis_date, analysis_type) 
    DO UPDATE SET 
      updated_at = now(),
      executive_summary = 'Re-analysis triggered by data update at ' || now()::text,
      custom_insights = EXCLUDED.custom_insights;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for analysis updates
CREATE TRIGGER trigger_analysis_on_update
  AFTER UPDATE ON public.daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_analysis_update();

-- Enable RLS
ALTER TABLE public.garmin_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garmin_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garmin_raw_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own Garmin sync logs" 
ON public.garmin_sync_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Garmin sync logs" 
ON public.garmin_sync_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own Garmin devices" 
ON public.garmin_devices FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own Garmin devices" 
ON public.garmin_devices FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own Garmin raw data" 
ON public.garmin_raw_data FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Garmin raw data" 
ON public.garmin_raw_data FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_garmin_sync_logs_user_date ON public.garmin_sync_logs(user_id, sync_timestamp DESC);
CREATE INDEX idx_garmin_devices_user_active ON public.garmin_devices(user_id, is_active);
CREATE INDEX idx_garmin_raw_data_user_date_type ON public.garmin_raw_data(user_id, data_date DESC, data_type);
CREATE INDEX idx_garmin_raw_data_processed ON public.garmin_raw_data(processed, created_at) WHERE processed = false;

-- Add trigger for garmin_devices timestamps
CREATE TRIGGER update_garmin_devices_updated_at
  BEFORE UPDATE ON public.garmin_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();