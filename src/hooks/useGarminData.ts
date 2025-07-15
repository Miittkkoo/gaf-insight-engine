import { useState, useEffect } from 'react';
import { GarminData } from '@/types/gaf';
import { supabase } from '@/integrations/supabase/client';

interface GarminDataState {
  data: GarminData | null;
  loading: boolean;
  error: string | null;
  lastSync: string | null;
}

export function useGarminData(date: string) {
  const [state, setState] = useState<GarminDataState>({
    data: null,
    loading: false,
    error: null,
    lastSync: null
  });

  const syncGarminData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Call the Garmin sync Edge Function
      const response = await fetch(`https://hjlmhuboqunwplieenwb.supabase.co/functions/v1/garmin-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync Garmin data');
      }

      const { data: garminData } = await response.json();
      
      // Refresh from database to get any newly synced data
      await loadExistingData();
      
      setState(prev => ({
        ...prev,
        data: garminData,
        loading: false,
        lastSync: new Date().toISOString()
      }));

      return garminData;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      throw error;
    }
  };

  const loadExistingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for existing raw data for this date
      const { data: rawData } = await supabase
        .from('garmin_raw_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('data_date', date)
        .order('created_at', { ascending: false })
        .limit(1);

      if (rawData && rawData.length > 0) {
        // If we have raw data, process it into our GarminData format
        const processed = await processRawGarminData(rawData);
        setState(prev => ({
          ...prev,
          data: processed,
          lastSync: rawData[0].created_at
        }));
      }

      // Get user's last sync timestamp
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('garmin_last_sync, garmin_connected')
        .eq('id', user.id)
        .single();

      if (profile?.garmin_last_sync) {
        setState(prev => ({
          ...prev,
          lastSync: profile.garmin_last_sync
        }));
      }
    } catch (error) {
      console.error('Failed to load existing Garmin data:', error);
    }
  };

  useEffect(() => {
    loadExistingData();
  }, [date]);

  return {
    ...state,
    syncGarminData,
    refreshData: loadExistingData
  };
}

async function processRawGarminData(rawDataArray: any[]): Promise<GarminData | null> {
  if (!rawDataArray || rawDataArray.length === 0) return null;

  // Aggregate data from different data types
  const dataByType = rawDataArray.reduce((acc, item) => {
    acc[item.data_type] = item.raw_json;
    return acc;
  }, {});

  const { hrv, daily_stats, heart_rate, body_battery, sleep } = dataByType;

  return {
    hrv: {
      score: hrv?.lastNightAvg || 35,
      sevenDayAvg: hrv?.sevenDayAvg || 35,
      status: mapHRVStatus(hrv?.status),
      lastNight: hrv?.lastNight || 35
    },
    bodyBattery: {
      start: body_battery?.start || 85,
      end: body_battery?.end || 30,
      min: body_battery?.min || 20,
      max: body_battery?.max || 95,
      charged: body_battery?.charged || 70,
      drained: body_battery?.drained || 65
    },
    sleep: {
      duration: sleep?.duration || 480,
      deepSleep: sleep?.deepSleep || 90,
      lightSleep: sleep?.lightSleep || 300,
      remSleep: sleep?.remSleep || 90,
      awake: sleep?.awake || 20,
      quality: mapSleepQuality(sleep?.sleepScores?.overall)
    },
    stress: {
      avg: daily_stats?.stressLevel || 25,
      max: daily_stats?.maxStress || 60,
      restingPeriods: daily_stats?.restingStressMinutes || 300
    },
    activities: daily_stats?.activities || [],
    steps: daily_stats?.steps || 0,
    calories: daily_stats?.calories || 0,
    activeMinutes: daily_stats?.activeMinutes || 0
  };
}

function mapHRVStatus(status: string | undefined): 'balanced' | 'unbalanced' | 'low' {
  if (!status) return 'balanced';
  
  switch (status.toLowerCase()) {
    case 'balanced':
    case 'optimal':
    case 'good':
      return 'balanced';
    case 'unbalanced':
    case 'poor':
      return 'unbalanced';
    case 'low':
    case 'critical':
      return 'low';
    default:
      return 'balanced';
  }
}

function mapSleepQuality(score: number | undefined): 'excellent' | 'good' | 'fair' | 'poor' {
  if (!score) return 'fair';
  
  if (score >= 80) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}