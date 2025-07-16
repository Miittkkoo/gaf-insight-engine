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

      console.log('Calling Garmin sync function for date:', date);
      
      // Call the Garmin sync Edge Function using Supabase client
      const { data: functionResult, error: functionError } = await supabase.functions.invoke('garmin-sync', {
        body: { date },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('Function result:', functionResult);
      console.log('Function error:', functionError);

      if (functionError) {
        console.error('Function error details:', functionError);
        throw new Error(functionError.message || 'Failed to sync Garmin data');
      }

      const garminData = functionResult?.data;
      
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
      console.error('Sync error:', error);
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

  console.log('Processing raw Garmin data:', rawDataArray);

  // Initialize result with defaults to prevent NaN and [object Object] errors
  let result: GarminData = {
    hrv: { score: 0, sevenDayAvg: 0, status: 'balanced', lastNight: 0 },
    bodyBattery: { start: 0, end: 0, min: 0, max: 0, charged: 0, drained: 0 },
    sleep: { duration: 0, deepSleep: 0, lightSleep: 0, remSleep: 0, awake: 0, quality: 'fair' },
    stress: { avg: 0, max: 0, restingPeriods: 0 },
    activities: [],
    steps: 0,
    calories: 0,
    activeMinutes: 0,
    lastSync: null
  };

  // Process each data type
  rawDataArray.forEach(item => {
    const { data_type, raw_json } = item;
    console.log(`Processing ${data_type} data:`, raw_json);
    
    switch (data_type) {
      case 'hrv':
        // Handle real Garmin API HRV data structure
        if (raw_json?.wellnessData?.length > 0) {
          const hrvData = raw_json.wellnessData[0];
          result.hrv = {
            score: hrvData.lastNightAvg || 0,
            sevenDayAvg: hrvData.sevenDayAvg || hrvData.lastNightAvg || 0,
            status: mapHRVStatus(hrvData.status),
            lastNight: hrvData.lastNightAvg || 0
          };
          result.lastNightAvg = hrvData.lastNightAvg;
          result.hrvStatus = hrvData.status;
        } else if (raw_json?.hrvSummary) {
          // Fallback for alternative structure
          const hrv = raw_json.hrvSummary;
          result.hrv = {
            score: hrv.lastNightAvg || 0,
            sevenDayAvg: hrv.sevenDayAvg || hrv.lastNightAvg || 0,
            status: mapHRVStatus(hrv.status),
            lastNight: hrv.lastNightAvg || 0
          };
          result.lastNightAvg = hrv.lastNightAvg;
          result.hrvStatus = hrv.status;
        }
        break;
        
      case 'sleep':
        // Handle real Garmin API sleep data structure
        if (raw_json?.dailySleepDTO) {
          const sleep = raw_json.dailySleepDTO;
          result.sleep = {
            duration: Math.round((sleep.sleepTimeSeconds || 0) / 60),
            deepSleep: Math.round((sleep.deepSleepSeconds || 0) / 60),
            lightSleep: Math.round((sleep.lightSleepSeconds || 0) / 60),
            remSleep: Math.round((sleep.remSleepSeconds || 0) / 60),
            awake: Math.round((sleep.awakeTimeSeconds || 0) / 60),
            quality: mapSleepQuality(sleep.sleepScore)
          };
          result.sleepTimeSeconds = sleep.sleepTimeSeconds;
          result.sleepScore = sleep.sleepScore;
        }
        break;
        
        
      case 'body_battery':
        if (raw_json) {
          const bodyBatteryLevels = raw_json.bodyBatteryData?.map((d: any) => d.bodyBatteryLevel) || [raw_json.startLevel || 0, raw_json.endLevel || 0];
          result.bodyBattery = {
            start: raw_json.startLevel || 0,
            end: raw_json.endLevel || 0,
            min: raw_json.minLevel || Math.min(...bodyBatteryLevels) || 0,
            max: raw_json.maxLevel || Math.max(...bodyBatteryLevels) || 0,
            charged: raw_json.charged || 0,
            drained: raw_json.drained || 0
          };
          result.endLevel = raw_json.endLevel;
          result.startLevel = raw_json.startLevel;
        }
        break;
        
      case 'steps':
        if (raw_json) {
          // Handle both formats: totalSteps directly or dailyMovement wrapper
          const steps = raw_json.totalSteps || raw_json.dailyMovement?.totalSteps || 0;
          const calories = raw_json.calories || raw_json.dailyMovement?.caloriesBurned || 0;
          const activeSeconds = raw_json.activeMinutes ? raw_json.activeMinutes * 60 : (raw_json.dailyMovement?.activeTimeSeconds || 0);
          
          result.steps = steps;
          result.calories = calories;
          result.activeMinutes = Math.round(activeSeconds / 60);
          result.totalSteps = steps;
          result.caloriesBurned = calories;
        }
        break;
        
      case 'stress':
        if (raw_json) {
          result.stress = {
            avg: raw_json.avgStressLevel || 0,
            max: raw_json.maxStressLevel || 0,
            restingPeriods: 0 // Not available in current data structure
          };
          // Add direct properties for backward compatibility
          result.avgStressLevel = raw_json.avgStressLevel;
          result.maxStressLevel = raw_json.maxStressLevel;
        }
        break;
    }
  });

  console.log('Processed result:', result);
  return result;
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