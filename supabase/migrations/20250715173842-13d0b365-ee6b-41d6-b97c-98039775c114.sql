-- Phase 1: Kritische Backend-Infrastruktur - GAF System Database
-- Aktiviere pgvector Extension für ML/Embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ===== 1. USER PROFILES mit Dynamic Attributes =====
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'Europe/Zurich',
  
  -- Garmin Integration
  garmin_connected BOOLEAN DEFAULT FALSE,
  garmin_credentials_encrypted TEXT,
  garmin_last_sync TIMESTAMP WITH TIME ZONE,
  
  -- Baseline Calibration
  hrv_baseline JSONB DEFAULT '{"avg": 30, "min": 20, "max": 40, "calibrated": false}',
  framework_baselines JSONB DEFAULT '{"koerper": 2, "mind": 2, "soul": 2, "dimension4": 2, "dimension5": 2, "dimension6": 2, "dimension7": 2}',
  
  -- Dynamic User Variables (KRITISCH für Erweiterbarkeit!)
  custom_attributes JSONB DEFAULT '{}',
  attribute_definitions JSONB DEFAULT '{}',
  
  -- ML Personalization
  user_embedding VECTOR(1536),
  ml_preferences JSONB DEFAULT '{"learning_rate": 0.1, "pattern_sensitivity": 0.7}',
  
  -- Analysis Settings
  analysis_settings JSONB DEFAULT '{"auto_analysis": true, "analysis_time": "08:00"}',
  notification_preferences JSONB DEFAULT '{"daily_analysis": true, "critical_alerts": true, "weekly_reports": true}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 2. DAILY METRICS mit HRV-Timing-Logic =====
CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  
  -- HRV-Timing-Logic (KRITISCH!)
  hrv_score NUMERIC(4,1),
  hrv_status TEXT CHECK (hrv_status IN ('kritisch', 'unter_bereich', 'normal', 'optimal')),
  hrv_reflects_date DATE NOT NULL,
  can_validate_patterns BOOLEAN DEFAULT FALSE,
  
  -- Core Garmin Data
  garmin_data JSONB DEFAULT '{}',
  garmin_last_sync TIMESTAMP WITH TIME ZONE,
  
  -- 7-Dimensional Framework Assessment
  mind_status TEXT CHECK (mind_status IN ('klar_motiviert', 'funktional_angestrengt', 'ueberlastet_erschoepft')),
  body_status TEXT CHECK (body_status IN ('energievoll_vital', 'muede_okay', 'erschoepft_schmerzen')),
  soul_status TEXT CHECK (soul_status IN ('zufrieden_sinnhaft', 'neutral_funktional', 'unzufrieden_sinnlos')),
  
  -- Daily Planning & Focus
  fokus_heute TEXT CHECK (fokus_heute IN ('regeneration', 'balance', 'produktivitaet', 'ueberleben')),
  energie_budget TEXT CHECK (energie_budget IN ('niedrig', 'mittel', 'hoch')),
  
  -- Sleep & Recovery
  schlafqualitaet TEXT CHECK (schlafqualitaet IN ('schlecht', 'okay', 'gut', 'sehr_gut')),
  aufwach_gefuehl TEXT CHECK (aufwach_gefuehl IN ('erschoepft', 'muede', 'erholt', 'energiegeladen')),
  schlafenszeitpunkt TEXT CHECK (schlafenszeitpunkt IN ('vor_22', '22_23', '23_24', 'nach_24')),
  schlaf_bereitschaft TEXT CHECK (schlaf_bereitschaft IN ('aufgedreht', 'normal', 'muede', 'sehr_muede')),
  
  -- Activities & Habits
  sport_heute BOOLEAN DEFAULT FALSE,
  sport_intensitaet TEXT CHECK (sport_intensitaet IN ('leicht', 'mittel', 'hoch', 'sehr_hoch', 'keine')),
  meditation_heute BOOLEAN DEFAULT FALSE,
  meditation_timing TEXT[] DEFAULT '{}',
  oliver_arbeit_heute BOOLEAN DEFAULT FALSE,
  
  -- Values & Events (Arrays für Multi-Select)
  werte_gelebt TEXT[] DEFAULT '{}',
  werte_kreis_balance TEXT CHECK (werte_kreis_balance IN ('innerer_dominiert', 'ausgewogen', 'aeusserer_zuviel')),
  werte_zufriedenheit INTEGER CHECK (werte_zufriedenheit >= 1 AND werte_zufriedenheit <= 10),
  mood_boosting_events TEXT[] DEFAULT '{}',
  mood_killing_events TEXT[] DEFAULT '{}',
  events_bilanz TEXT CHECK (events_bilanz IN ('mehr_booster', 'ausgeglichen', 'mehr_killer')),
  
  -- Alcohol & Nutrition
  alkohol_konsum TEXT CHECK (alkohol_konsum IN ('kein', 'ein_glas', 'moderat', 'hoch')),
  alkohol_timing TEXT CHECK (alkohol_timing IN ('kein', 'mittags', 'nachmittags', 'abends', 'spaet_abends')),
  alkohol_details TEXT,
  letzte_hauptmahlzeit TEXT CHECK (letzte_hauptmahlzeit IN ('vor_12', '12_14', '14_16', '16_18', '18_19', '19_20', 'nach_20')),
  abendliche_nahrung TEXT CHECK (abendliche_nahrung IN ('keine', 'leichte_snacks', 'normale_mahlzeit', 'schwere_mahlzeit')),
  verdauungsgefuehl TEXT CHECK (verdauungsgefuehl IN ('leicht_gut', 'normal', 'schwer_voll')),
  
  -- Mental & Emotional
  gedanken_aktivitaet TEXT CHECK (gedanken_aktivitaet IN ('ruhig_klar', 'normal', 'kopf_voll_unruhe')),
  emotionale_belastung TEXT CHECK (emotionale_belastung IN ('keine', 'leicht', 'mittel', 'hoch')),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  task_feeling TEXT CHECK (task_feeling IN ('mehr_geschafft', 'normal_produktiv', 'weniger_geschafft')),
  
  -- Physical & Energy
  koerperliche_symptome TEXT[] DEFAULT '{}',
  energie_level_ende TEXT CHECK (energie_level_ende IN ('erschoepft', 'muede', 'okay', 'energievoll')),
  
  -- Planning & Reflection
  regenerations_bedarf_morgen TEXT CHECK (regenerations_bedarf_morgen IN ('hoch', 'mittel', 'niedrig')),
  erwartete_hrv_morgen TEXT,
  anpassungen_morgen TEXT,
  erkenntnisse TEXT,
  groesster_widerstand TEXT,
  tag_bewertung INTEGER CHECK (tag_bewertung >= 1 AND tag_bewertung <= 10),
  
  -- Contemplative Activities
  kontemplative_aktivitaeten TEXT[] DEFAULT '{}',
  kognitive_verarbeitung TEXT[] DEFAULT '{}',
  
  -- Dynamic Custom Variables
  custom_variables JSONB DEFAULT '{}',
  lifestyle_factors JSONB DEFAULT '{}',
  
  -- ML & Analysis
  daily_embedding VECTOR(1536),
  lifestyle_embedding VECTOR(384),
  detected_correlations JSONB DEFAULT '{}',
  anomaly_scores JSONB DEFAULT '{}',
  
  -- Quality & Validation
  data_quality_score FLOAT DEFAULT 0.0,
  data_completeness FLOAT DEFAULT 0.0,
  manual_overrides JSONB DEFAULT '{}',
  
  -- General Notes
  notizen TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, metric_date)
);

-- ===== 3. GAF ANALYSIS RESULTS =====
CREATE TABLE public.gaf_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('daily', 'weekly', 'retrospective', 'emergency')),
  
  -- Framework Assessment (7 Dimensionen)
  framework_score JSONB NOT NULL DEFAULT '{"total": 0, "dimensions": {}}',
  framework_embedding VECTOR(1536),
  
  -- Pattern Analysis Results
  detected_patterns JSONB[] DEFAULT '{}',
  pattern_confidence_scores JSONB DEFAULT '{}',
  
  -- Recommendations
  recommendations JSONB[] DEFAULT '{}',
  recommendation_embeddings VECTOR(1536)[],
  
  -- Alerts & Critical Findings
  alerts JSONB[] DEFAULT '{}',
  risk_assessment JSONB DEFAULT '{}',
  
  -- Analysis Metadata
  data_completeness FLOAT DEFAULT 0.0,
  confidence_level FLOAT DEFAULT 0.0,
  ml_model_version TEXT DEFAULT 'v1.0',
  processing_time_ms INTEGER DEFAULT 0,
  
  -- Executive Summary
  executive_summary TEXT,
  executive_embedding VECTOR(1536),
  
  -- Erweiterbare Felder
  custom_insights JSONB DEFAULT '{}',
  experimental_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 4. KNOWLEDGE BASE für ML =====
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Knowledge Classification
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('pattern', 'intervention', 'correlation', 'hypothesis')),
  category TEXT NOT NULL CHECK (category IN ('hrv', 'sleep', 'stress', 'lifestyle', 'custom', 'framework')),
  
  -- Core Knowledge Data
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  knowledge_embedding VECTOR(1536),
  
  -- Evidence & Validation
  evidence_data JSONB NOT NULL DEFAULT '{}',
  confidence_level FLOAT NOT NULL DEFAULT 0.5 CHECK (confidence_level >= 0 AND confidence_level <= 1),
  validation_count INTEGER DEFAULT 0,
  contradiction_count INTEGER DEFAULT 0,
  
  -- ML Training Data
  training_examples JSONB[] DEFAULT '{}',
  success_rate FLOAT DEFAULT 0.0,
  roi_data JSONB DEFAULT '{}',
  
  -- Dynamische Attribute
  variable_definitions JSONB DEFAULT '{}',
  correlation_mappings JSONB DEFAULT '{}',
  
  -- Meta-Information
  source TEXT DEFAULT 'system' CHECK (source IN ('user_generated', 'ml_discovered', 'imported', 'system')),
  created_by UUID REFERENCES auth.users(id),
  last_validated_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 5. PATTERN HISTORY & ML Learning =====
CREATE TABLE public.pattern_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern Definition
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('lifestyle', 'health', 'performance', 'custom')),
  
  -- Trigger → Outcome Mapping
  trigger_variables JSONB NOT NULL DEFAULT '{}',
  outcome_variables JSONB NOT NULL DEFAULT '{}',
  time_delay_hours INTEGER NOT NULL DEFAULT 24,
  
  -- Historical Evidence
  occurrences JSONB[] DEFAULT '{}',
  success_predictions INTEGER DEFAULT 0,
  failed_predictions INTEGER DEFAULT 0,
  
  -- ML Model Data
  pattern_embedding VECTOR(1536),
  feature_importance JSONB DEFAULT '{}',
  model_accuracy FLOAT DEFAULT 0.0,
  
  -- Dynamic Learning
  hypothesis_status TEXT DEFAULT 'testing' CHECK (hypothesis_status IN ('testing', 'validated', 'rejected', 'inconclusive')),
  next_validation_date DATE,
  confidence_evolution JSONB[] DEFAULT '{}',
  
  -- Custom Pattern Support
  custom_variables JSONB DEFAULT '{}',
  analysis_rules JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, pattern_name)
);

-- ===== 6. USER VARIABLE DEFINITIONS (Dynamic Attributes) =====
CREATE TABLE public.user_variable_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Variable Definition
  variable_name TEXT NOT NULL,
  variable_type TEXT NOT NULL CHECK (variable_type IN ('numeric', 'categorical', 'boolean', 'text', 'multi_select')),
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Validation Rules
  validation_rules JSONB DEFAULT '{}',
  default_value JSONB,
  options JSONB DEFAULT '{}', -- For categorical/multi_select
  
  -- Analysis Integration
  analysis_category TEXT CHECK (analysis_category IN ('lifestyle', 'environment', 'work', 'health', 'custom')),
  correlation_targets TEXT[] DEFAULT '{}',
  
  -- ML Integration
  feature_importance FLOAT DEFAULT 0.5,
  embedding_weight FLOAT DEFAULT 1.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, variable_name)
);

-- ===== HRV-TIMING-LOGIC TRIGGER (KRITISCH!) =====
CREATE OR REPLACE FUNCTION validate_hrv_timing()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatische Berechnung: HRV reflektiert immer Vortag
  NEW.hrv_reflects_date := NEW.metric_date - INTERVAL '1 day';
  
  -- Pattern-Validation nur für vergangene Daten möglich
  NEW.can_validate_patterns := NEW.metric_date < CURRENT_DATE;
  
  -- Garmin Data Update mit korrekter Timing-Logic
  IF NEW.garmin_data IS NOT NULL THEN
    NEW.garmin_data := NEW.garmin_data || jsonb_build_object(
      'hrv_reflects_date', NEW.hrv_reflects_date,
      'measurement_date', NEW.metric_date,
      'timing_corrected', true,
      'can_validate_patterns', NEW.can_validate_patterns
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hrv_timing_trigger
  BEFORE INSERT OR UPDATE ON daily_metrics
  FOR EACH ROW EXECUTE FUNCTION validate_hrv_timing();

-- ===== PATTERN VALIDATION FUNKTION =====
CREATE OR REPLACE FUNCTION validate_pattern_correlation(
  trigger_date DATE,
  outcome_date DATE,
  min_delay_hours INTEGER DEFAULT 24
) RETURNS BOOLEAN AS $$
BEGIN
  -- Nur Pattern validieren, die mindestens 24h Delay haben
  RETURN outcome_date >= trigger_date + (min_delay_hours || ' hours')::INTERVAL
    AND outcome_date < CURRENT_DATE; -- Nur vergangene Daten
END;
$$ LANGUAGE plpgsql;

-- ===== AUTOMATIC TIMESTAMP UPDATES =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_metrics_updated_at
  BEFORE UPDATE ON daily_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gaf_analysis_results_updated_at
  BEFORE UPDATE ON gaf_analysis_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pattern_history_updated_at
  BEFORE UPDATE ON pattern_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== PERFORMANCE INDEXES =====
-- Vector Similarity Search Indexes
CREATE INDEX ON gaf_analysis_results USING ivfflat (framework_embedding vector_cosine_ops);
CREATE INDEX ON daily_metrics USING ivfflat (daily_embedding vector_cosine_ops);
CREATE INDEX ON knowledge_base USING ivfflat (knowledge_embedding vector_cosine_ops);
CREATE INDEX ON pattern_history USING ivfflat (pattern_embedding vector_cosine_ops);

-- Time-based Query Indexes
CREATE INDEX ON daily_metrics (user_id, metric_date DESC);
CREATE INDEX ON daily_metrics (user_id, hrv_reflects_date);
CREATE INDEX ON gaf_analysis_results (user_id, analysis_date DESC);

-- Pattern Analysis Indexes
CREATE INDEX ON pattern_history (user_id, pattern_type);
CREATE INDEX ON daily_metrics USING GIN (custom_variables);
CREATE INDEX ON daily_metrics USING GIN (lifestyle_factors);
CREATE INDEX ON daily_metrics USING GIN (werte_gelebt);
CREATE INDEX ON daily_metrics USING GIN (mood_boosting_events);
CREATE INDEX ON daily_metrics USING GIN (mood_killing_events);

-- HRV Status and Framework Analysis
CREATE INDEX ON daily_metrics (user_id, hrv_status);
CREATE INDEX ON daily_metrics (user_id, mind_status, body_status, soul_status);

-- Knowledge Base Search
CREATE INDEX ON knowledge_base (knowledge_type, category);
CREATE INDEX ON knowledge_base (confidence_level DESC);

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gaf_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_variable_definitions ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Daily Metrics Policies
CREATE POLICY "Users can view their own daily metrics" 
ON public.daily_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily metrics" 
ON public.daily_metrics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily metrics" 
ON public.daily_metrics 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily metrics" 
ON public.daily_metrics 
FOR DELETE 
USING (auth.uid() = user_id);

-- GAF Analysis Results Policies
CREATE POLICY "Users can view their own analysis results" 
ON public.gaf_analysis_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analysis results" 
ON public.gaf_analysis_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis results" 
ON public.gaf_analysis_results 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Pattern History Policies
CREATE POLICY "Users can view their own patterns" 
ON public.pattern_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patterns" 
ON public.pattern_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns" 
ON public.pattern_history 
FOR UPDATE 
USING (auth.uid() = user_id);

-- User Variable Definitions Policies
CREATE POLICY "Users can view their own variable definitions" 
ON public.user_variable_definitions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own variable definitions" 
ON public.user_variable_definitions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own variable definitions" 
ON public.user_variable_definitions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Knowledge Base Public Read Access (für ML Pattern Sharing)
CREATE POLICY "Knowledge base is viewable by authenticated users" 
ON public.knowledge_base 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can contribute to knowledge base" 
ON public.knowledge_base 
FOR INSERT 
WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- ===== INITIAL KNOWLEDGE BASE ENTRIES =====
INSERT INTO public.knowledge_base (
  knowledge_type, category, title, description, evidence_data, confidence_level, source
) VALUES 
(
  'pattern', 'hrv', 'HRV Timing Logic', 
  'HRV-Wert TAG X reflektiert Recovery vom TAG X-1. Aktivitäten TAG X zeigen Impact erst TAG X+1.',
  '{"timing_delay_hours": 24, "validation_required": true, "critical_system_rule": true}',
  1.0, 'system'
),
(
  'correlation', 'lifestyle', 'Alkohol HRV Impact',
  'Alkohol-Konsum zeigt HRV-Impact mit 24-96h Delay. Besonders stark bei >2 Einheiten.',
  '{"delay_range_hours": [24, 96], "impact_threshold": 2, "avg_hrv_drop": -8}',
  0.85, 'system'
),
(
  'pattern', 'sleep', 'Schlafqualität HRV Korrelation',
  'Schlafqualität korreliert stark mit HRV am nächsten Tag. Besonders Deep Sleep wichtig.',
  '{"correlation_strength": 0.78, "deep_sleep_importance": 0.9}',
  0.82, 'system'
),
(
  'intervention', 'framework', '7-Dimensionales Assessment',
  'Framework-Score aus 7 Bereichen: Körper, Mind, Soul + 4 weitere. Je 3 Punkte max = 21 total.',
  '{"dimensions": 7, "max_score_per_dimension": 3, "total_max": 21}',
  1.0, 'system'
);

-- ===== SAMPLE DATA STRUCTURE =====
-- Beispiel für HRV Status Mapping
INSERT INTO public.knowledge_base (
  knowledge_type, category, title, description, evidence_data, confidence_level, source
) VALUES (
  'correlation', 'hrv', 'HRV Status Thresholds',
  'HRV Status Kategorisierung basierend auf individuellen Baselines und allgemeinen Schwellenwerten.',
  '{
    "kritisch": {"threshold": "<=22", "color": "red", "action": "immediate_rest"},
    "unter_bereich": {"threshold": "23-26", "color": "yellow", "action": "reduce_stress"},
    "normal": {"threshold": "27-35", "color": "green", "action": "maintain"},
    "optimal": {"threshold": ">=35", "color": "purple", "action": "optimize"}
  }',
  0.95, 'system'
);