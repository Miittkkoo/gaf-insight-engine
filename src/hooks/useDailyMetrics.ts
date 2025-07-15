import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DailyMetricsData {
  metric_date: string;
  hrv_score?: number;
  hrv_status?: string;
  mind_status?: string;
  body_status?: string;
  soul_status?: string;
  fokus_heute?: string;
  energie_budget?: string;
  schlafqualitaet?: string;
  aufwach_gefuehl?: string;
  sport_heute?: boolean;
  sport_intensitaet?: string;
  meditation_heute?: boolean;
  meditation_timing?: string[];
  werte_gelebt?: string[];
  werte_zufriedenheit?: number;
  mood_boosting_events?: string[];
  mood_killing_events?: string[];
  alkohol_konsum?: string;
  alkohol_timing?: string;
  letzte_hauptmahlzeit?: string;
  abendliche_nahrung?: string;
  koerperliche_symptome?: string[];
  stress_level?: number;
  tag_bewertung?: number;
  kontemplative_aktivitaeten?: string[];
  kognitive_verarbeitung?: string[];
  regenerations_bedarf_morgen?: string;
  erwartete_hrv_morgen?: string;
  anpassungen_morgen?: string;
  erkenntnisse?: string;
  notizen?: string;
  [key: string]: any;
}

export const useDailyMetrics = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const saveMetrics = async (data: DailyMetricsData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht angemeldet');
      }

      const { data: result, error } = await supabase.rpc('save_daily_metrics', {
        p_user_id: user.id,
        p_metric_date: data.metric_date,
        p_data: data as any
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Erfolgreich gespeichert",
        description: "Ihre Daten wurden erfolgreich gespeichert"
      });

      return result;
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Fehler beim Speichern",
        description: error.message || "Unerwarteter Fehler beim Speichern",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMetrics = async (id: string, updates: Partial<DailyMetricsData>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht angemeldet');
      }

      // First get the current entry to get the metric_date
      const { data: currentEntry, error: fetchError } = await supabase
        .from('daily_metrics')
        .select('metric_date')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Use save_daily_metrics function for updates too
      const { data: result, error } = await supabase.rpc('save_daily_metrics', {
        p_user_id: user.id,
        p_metric_date: currentEntry.metric_date,
        p_data: updates as any
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Erfolgreich aktualisiert",
        description: "Eintrag wurde erfolgreich aktualisiert"
      });

      return result;
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: "Fehler beim Aktualisieren",
        description: error.message || "Unerwarteter Fehler beim Aktualisieren",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loadMetrics = async (date: string) => {
    try {
      const { data, error } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('metric_date', date)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading data:', error);
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Load error:', error);
      toast({
        title: "Fehler beim Laden",
        description: error.message || "Daten konnten nicht geladen werden",
        variant: "destructive"
      });
      throw error;
    }
  };

  const loadAllMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_metrics')
        .select('*')
        .order('metric_date', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: any) {
      console.error('Load all error:', error);
      toast({
        title: "Fehler beim Laden",
        description: error.message || "Einträge konnten nicht geladen werden",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    saveMetrics,
    updateMetrics,
    loadMetrics,
    loadAllMetrics,
    isLoading
  };
};