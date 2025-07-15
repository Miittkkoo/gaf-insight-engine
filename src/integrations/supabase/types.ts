export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      daily_metrics: {
        Row: {
          abendliche_nahrung: string | null
          alkohol_details: string | null
          alkohol_konsum: string | null
          alkohol_timing: string | null
          anomaly_scores: Json | null
          anpassungen_morgen: string | null
          aufwach_gefuehl: string | null
          body_status: string | null
          can_validate_patterns: boolean | null
          created_at: string | null
          custom_variables: Json | null
          daily_embedding: string | null
          data_completeness: number | null
          data_quality_score: number | null
          detected_correlations: Json | null
          emotionale_belastung: string | null
          energie_budget: string | null
          energie_level_ende: string | null
          erkenntnisse: string | null
          erwartete_hrv_morgen: string | null
          events_bilanz: string | null
          fokus_heute: string | null
          garmin_data: Json | null
          garmin_last_sync: string | null
          gedanken_aktivitaet: string | null
          groesster_widerstand: string | null
          hrv_reflects_date: string
          hrv_score: number | null
          hrv_status: string | null
          id: string
          koerperliche_symptome: string[] | null
          kognitive_verarbeitung: string[] | null
          kontemplative_aktivitaeten: string[] | null
          letzte_hauptmahlzeit: string | null
          lifestyle_embedding: string | null
          lifestyle_factors: Json | null
          manual_overrides: Json | null
          meditation_heute: boolean | null
          meditation_timing: string[] | null
          metric_date: string
          mind_status: string | null
          mood_boosting_events: string[] | null
          mood_killing_events: string[] | null
          notizen: string | null
          oliver_arbeit_heute: boolean | null
          regenerations_bedarf_morgen: string | null
          schlaf_bereitschaft: string | null
          schlafenszeitpunkt: string | null
          schlafqualitaet: string | null
          soul_status: string | null
          sport_heute: boolean | null
          sport_intensitaet: string | null
          stress_level: number | null
          tag_bewertung: number | null
          task_feeling: string | null
          updated_at: string | null
          user_id: string | null
          verdauungsgefuehl: string | null
          werte_gelebt: string[] | null
          werte_kreis_balance: string | null
          werte_zufriedenheit: number | null
        }
        Insert: {
          abendliche_nahrung?: string | null
          alkohol_details?: string | null
          alkohol_konsum?: string | null
          alkohol_timing?: string | null
          anomaly_scores?: Json | null
          anpassungen_morgen?: string | null
          aufwach_gefuehl?: string | null
          body_status?: string | null
          can_validate_patterns?: boolean | null
          created_at?: string | null
          custom_variables?: Json | null
          daily_embedding?: string | null
          data_completeness?: number | null
          data_quality_score?: number | null
          detected_correlations?: Json | null
          emotionale_belastung?: string | null
          energie_budget?: string | null
          energie_level_ende?: string | null
          erkenntnisse?: string | null
          erwartete_hrv_morgen?: string | null
          events_bilanz?: string | null
          fokus_heute?: string | null
          garmin_data?: Json | null
          garmin_last_sync?: string | null
          gedanken_aktivitaet?: string | null
          groesster_widerstand?: string | null
          hrv_reflects_date: string
          hrv_score?: number | null
          hrv_status?: string | null
          id?: string
          koerperliche_symptome?: string[] | null
          kognitive_verarbeitung?: string[] | null
          kontemplative_aktivitaeten?: string[] | null
          letzte_hauptmahlzeit?: string | null
          lifestyle_embedding?: string | null
          lifestyle_factors?: Json | null
          manual_overrides?: Json | null
          meditation_heute?: boolean | null
          meditation_timing?: string[] | null
          metric_date: string
          mind_status?: string | null
          mood_boosting_events?: string[] | null
          mood_killing_events?: string[] | null
          notizen?: string | null
          oliver_arbeit_heute?: boolean | null
          regenerations_bedarf_morgen?: string | null
          schlaf_bereitschaft?: string | null
          schlafenszeitpunkt?: string | null
          schlafqualitaet?: string | null
          soul_status?: string | null
          sport_heute?: boolean | null
          sport_intensitaet?: string | null
          stress_level?: number | null
          tag_bewertung?: number | null
          task_feeling?: string | null
          updated_at?: string | null
          user_id?: string | null
          verdauungsgefuehl?: string | null
          werte_gelebt?: string[] | null
          werte_kreis_balance?: string | null
          werte_zufriedenheit?: number | null
        }
        Update: {
          abendliche_nahrung?: string | null
          alkohol_details?: string | null
          alkohol_konsum?: string | null
          alkohol_timing?: string | null
          anomaly_scores?: Json | null
          anpassungen_morgen?: string | null
          aufwach_gefuehl?: string | null
          body_status?: string | null
          can_validate_patterns?: boolean | null
          created_at?: string | null
          custom_variables?: Json | null
          daily_embedding?: string | null
          data_completeness?: number | null
          data_quality_score?: number | null
          detected_correlations?: Json | null
          emotionale_belastung?: string | null
          energie_budget?: string | null
          energie_level_ende?: string | null
          erkenntnisse?: string | null
          erwartete_hrv_morgen?: string | null
          events_bilanz?: string | null
          fokus_heute?: string | null
          garmin_data?: Json | null
          garmin_last_sync?: string | null
          gedanken_aktivitaet?: string | null
          groesster_widerstand?: string | null
          hrv_reflects_date?: string
          hrv_score?: number | null
          hrv_status?: string | null
          id?: string
          koerperliche_symptome?: string[] | null
          kognitive_verarbeitung?: string[] | null
          kontemplative_aktivitaeten?: string[] | null
          letzte_hauptmahlzeit?: string | null
          lifestyle_embedding?: string | null
          lifestyle_factors?: Json | null
          manual_overrides?: Json | null
          meditation_heute?: boolean | null
          meditation_timing?: string[] | null
          metric_date?: string
          mind_status?: string | null
          mood_boosting_events?: string[] | null
          mood_killing_events?: string[] | null
          notizen?: string | null
          oliver_arbeit_heute?: boolean | null
          regenerations_bedarf_morgen?: string | null
          schlaf_bereitschaft?: string | null
          schlafenszeitpunkt?: string | null
          schlafqualitaet?: string | null
          soul_status?: string | null
          sport_heute?: boolean | null
          sport_intensitaet?: string | null
          stress_level?: number | null
          tag_bewertung?: number | null
          task_feeling?: string | null
          updated_at?: string | null
          user_id?: string | null
          verdauungsgefuehl?: string | null
          werte_gelebt?: string[] | null
          werte_kreis_balance?: string | null
          werte_zufriedenheit?: number | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          updated_at: string | null
          user_percentage: number | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          updated_at?: string | null
          user_percentage?: number | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          updated_at?: string | null
          user_percentage?: number | null
        }
        Relationships: []
      }
      gaf_analysis_results: {
        Row: {
          alerts: Json[] | null
          analysis_date: string
          analysis_type: string
          confidence_level: number | null
          created_at: string | null
          custom_insights: Json | null
          data_completeness: number | null
          detected_patterns: Json[] | null
          executive_embedding: string | null
          executive_summary: string | null
          experimental_data: Json | null
          framework_embedding: string | null
          framework_score: Json
          id: string
          ml_model_version: string | null
          pattern_confidence_scores: Json | null
          processing_time_ms: number | null
          recommendation_embeddings: string[] | null
          recommendations: Json[] | null
          risk_assessment: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alerts?: Json[] | null
          analysis_date: string
          analysis_type: string
          confidence_level?: number | null
          created_at?: string | null
          custom_insights?: Json | null
          data_completeness?: number | null
          detected_patterns?: Json[] | null
          executive_embedding?: string | null
          executive_summary?: string | null
          experimental_data?: Json | null
          framework_embedding?: string | null
          framework_score?: Json
          id?: string
          ml_model_version?: string | null
          pattern_confidence_scores?: Json | null
          processing_time_ms?: number | null
          recommendation_embeddings?: string[] | null
          recommendations?: Json[] | null
          risk_assessment?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alerts?: Json[] | null
          analysis_date?: string
          analysis_type?: string
          confidence_level?: number | null
          created_at?: string | null
          custom_insights?: Json | null
          data_completeness?: number | null
          detected_patterns?: Json[] | null
          executive_embedding?: string | null
          executive_summary?: string | null
          experimental_data?: Json | null
          framework_embedding?: string | null
          framework_score?: Json
          id?: string
          ml_model_version?: string | null
          pattern_confidence_scores?: Json | null
          processing_time_ms?: number | null
          recommendation_embeddings?: string[] | null
          recommendations?: Json[] | null
          risk_assessment?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      garmin_devices: {
        Row: {
          created_at: string
          device_id: string
          device_name: string
          device_type: string | null
          firmware_version: string | null
          id: string
          is_active: boolean | null
          last_sync: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name: string
          device_type?: string | null
          firmware_version?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string
          device_type?: string | null
          firmware_version?: string | null
          id?: string
          is_active?: boolean | null
          last_sync?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      garmin_raw_data: {
        Row: {
          created_at: string
          data_date: string
          data_type: string
          garmin_id: string | null
          id: string
          processed: boolean | null
          processing_errors: string[] | null
          raw_json: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          data_date: string
          data_type: string
          garmin_id?: string | null
          id?: string
          processed?: boolean | null
          processing_errors?: string[] | null
          raw_json: Json
          user_id: string
        }
        Update: {
          created_at?: string
          data_date?: string
          data_type?: string
          garmin_id?: string | null
          id?: string
          processed?: boolean | null
          processing_errors?: string[] | null
          raw_json?: Json
          user_id?: string
        }
        Relationships: []
      }
      garmin_sync_logs: {
        Row: {
          created_at: string
          data_points_synced: number | null
          error_message: string | null
          garmin_last_activity_timestamp: string | null
          id: string
          status: string
          sync_duration_ms: number | null
          sync_timestamp: string
          sync_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_points_synced?: number | null
          error_message?: string | null
          garmin_last_activity_timestamp?: string | null
          id?: string
          status?: string
          sync_duration_ms?: number | null
          sync_timestamp?: string
          sync_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_points_synced?: number | null
          error_message?: string | null
          garmin_last_activity_timestamp?: string | null
          id?: string
          status?: string
          sync_duration_ms?: number | null
          sync_timestamp?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: string
          confidence_level: number
          contradiction_count: number | null
          correlation_mappings: Json | null
          created_at: string | null
          created_by: string | null
          description: string
          evidence_data: Json
          id: string
          knowledge_embedding: string | null
          knowledge_type: string
          last_validated_at: string | null
          roi_data: Json | null
          source: string | null
          success_rate: number | null
          title: string
          training_examples: Json[] | null
          updated_at: string | null
          validation_count: number | null
          variable_definitions: Json | null
        }
        Insert: {
          category: string
          confidence_level?: number
          contradiction_count?: number | null
          correlation_mappings?: Json | null
          created_at?: string | null
          created_by?: string | null
          description: string
          evidence_data?: Json
          id?: string
          knowledge_embedding?: string | null
          knowledge_type: string
          last_validated_at?: string | null
          roi_data?: Json | null
          source?: string | null
          success_rate?: number | null
          title: string
          training_examples?: Json[] | null
          updated_at?: string | null
          validation_count?: number | null
          variable_definitions?: Json | null
        }
        Update: {
          category?: string
          confidence_level?: number
          contradiction_count?: number | null
          correlation_mappings?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          evidence_data?: Json
          id?: string
          knowledge_embedding?: string | null
          knowledge_type?: string
          last_validated_at?: string | null
          roi_data?: Json | null
          source?: string | null
          success_rate?: number | null
          title?: string
          training_examples?: Json[] | null
          updated_at?: string | null
          validation_count?: number | null
          variable_definitions?: Json | null
        }
        Relationships: []
      }
      pattern_history: {
        Row: {
          analysis_rules: Json | null
          confidence_evolution: Json[] | null
          created_at: string | null
          custom_variables: Json | null
          failed_predictions: number | null
          feature_importance: Json | null
          hypothesis_status: string | null
          id: string
          model_accuracy: number | null
          next_validation_date: string | null
          occurrences: Json[] | null
          outcome_variables: Json
          pattern_embedding: string | null
          pattern_name: string
          pattern_type: string
          success_predictions: number | null
          time_delay_hours: number
          trigger_variables: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analysis_rules?: Json | null
          confidence_evolution?: Json[] | null
          created_at?: string | null
          custom_variables?: Json | null
          failed_predictions?: number | null
          feature_importance?: Json | null
          hypothesis_status?: string | null
          id?: string
          model_accuracy?: number | null
          next_validation_date?: string | null
          occurrences?: Json[] | null
          outcome_variables?: Json
          pattern_embedding?: string | null
          pattern_name: string
          pattern_type: string
          success_predictions?: number | null
          time_delay_hours?: number
          trigger_variables?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_rules?: Json | null
          confidence_evolution?: Json[] | null
          created_at?: string | null
          custom_variables?: Json | null
          failed_predictions?: number | null
          feature_importance?: Json | null
          hypothesis_status?: string | null
          id?: string
          model_accuracy?: number | null
          next_validation_date?: string | null
          occurrences?: Json[] | null
          outcome_variables?: Json
          pattern_embedding?: string | null
          pattern_name?: string
          pattern_type?: string
          success_predictions?: number | null
          time_delay_hours?: number
          trigger_variables?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_data_backups: {
        Row: {
          backup_date: string | null
          backup_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          metrics_data: Json | null
          profile_data: Json | null
          user_id: string
        }
        Insert: {
          backup_date?: string | null
          backup_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metrics_data?: Json | null
          profile_data?: Json | null
          user_id: string
        }
        Update: {
          backup_date?: string | null
          backup_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metrics_data?: Json | null
          profile_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          analysis_settings: Json | null
          attribute_definitions: Json | null
          created_at: string | null
          custom_attributes: Json | null
          display_name: string | null
          framework_baselines: Json | null
          garmin_connected: boolean | null
          garmin_credentials_encrypted: string | null
          garmin_last_sync: string | null
          hrv_baseline: Json | null
          id: string
          ml_preferences: Json | null
          notification_preferences: Json | null
          timezone: string | null
          updated_at: string | null
          user_embedding: string | null
        }
        Insert: {
          analysis_settings?: Json | null
          attribute_definitions?: Json | null
          created_at?: string | null
          custom_attributes?: Json | null
          display_name?: string | null
          framework_baselines?: Json | null
          garmin_connected?: boolean | null
          garmin_credentials_encrypted?: string | null
          garmin_last_sync?: string | null
          hrv_baseline?: Json | null
          id: string
          ml_preferences?: Json | null
          notification_preferences?: Json | null
          timezone?: string | null
          updated_at?: string | null
          user_embedding?: string | null
        }
        Update: {
          analysis_settings?: Json | null
          attribute_definitions?: Json | null
          created_at?: string | null
          custom_attributes?: Json | null
          display_name?: string | null
          framework_baselines?: Json | null
          garmin_connected?: boolean | null
          garmin_credentials_encrypted?: string | null
          garmin_last_sync?: string | null
          hrv_baseline?: Json | null
          id?: string
          ml_preferences?: Json | null
          notification_preferences?: Json | null
          timezone?: string | null
          updated_at?: string | null
          user_embedding?: string | null
        }
        Relationships: []
      }
      user_variable_definitions: {
        Row: {
          analysis_category: string | null
          correlation_targets: string[] | null
          created_at: string | null
          default_value: Json | null
          description: string | null
          display_name: string
          embedding_weight: number | null
          feature_importance: number | null
          id: string
          options: Json | null
          user_id: string | null
          validation_rules: Json | null
          variable_name: string
          variable_type: string
        }
        Insert: {
          analysis_category?: string | null
          correlation_targets?: string[] | null
          created_at?: string | null
          default_value?: Json | null
          description?: string | null
          display_name: string
          embedding_weight?: number | null
          feature_importance?: number | null
          id?: string
          options?: Json | null
          user_id?: string | null
          validation_rules?: Json | null
          variable_name: string
          variable_type: string
        }
        Update: {
          analysis_category?: string | null
          correlation_targets?: string[] | null
          created_at?: string | null
          default_value?: Json | null
          description?: string | null
          display_name?: string
          embedding_weight?: number | null
          feature_importance?: number | null
          id?: string
          options?: Json | null
          user_id?: string | null
          validation_rules?: Json | null
          variable_name?: string
          variable_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      find_users_without_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          created_at: string
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      health_check: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          status: string
          details: Json
        }[]
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      test_daily_metrics_insert: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      test_profile_update: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      upsert_daily_metrics: {
        Args: { p_data: Json }
        Returns: undefined
      }
      validate_constraints: {
        Args: Record<PropertyKey, never>
        Returns: {
          constraint_name: string
          table_name: string
          violations: number
          constraint_type: string
        }[]
      }
      validate_pattern_correlation: {
        Args: {
          trigger_date: string
          outcome_date: string
          min_delay_hours?: number
        }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
