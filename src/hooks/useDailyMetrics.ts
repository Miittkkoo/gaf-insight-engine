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

  // UPSERT-basierte Speicherung für Race-Condition-Schutz
  const saveMetrics = async (data: DailyMetricsData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht angemeldet');
      }

      console.log('Saving metrics for user:', user.id, 'date:', data.metric_date);

      // UPSERT: Atomische Insert-oder-Update Operation
      const { data: result, error } = await supabase
        .from('daily_metrics')
        .upsert({
          ...data,
          user_id: user.id,
          hrv_reflects_date: new Date(new Date(data.metric_date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Vortag
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,metric_date'
        })
        .select()
        .single();

      if (error) {
        console.error('Upsert error:', error);
        throw error;
      }

      console.log('Upsert successful:', result);
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

  // UPDATE für Journal (einfacher direkter Update)
  const updateMetrics = async (id: string, updates: Partial<DailyMetricsData>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht angemeldet');
      }

      console.log('Updating entry ID:', id);

      const { data: result, error } = await supabase
        .from('daily_metrics')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id) // Sicherheit: nur eigene Einträge
        .select()
        .single();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log('Update successful:', result);
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
        console.error('Load error:', error);
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