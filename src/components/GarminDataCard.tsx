import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Activity, Heart, Battery, Moon, Timer, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface GarminDataCardProps {
  date: string;
  showRefresh?: boolean;
}

interface ProcessedGarminData {
  hrv: {
    score: number;
    status: 'kritisch' | 'unter_bereich' | 'normal' | 'optimal';
    sevenDayAvg: number;
  };
  sleep: {
    duration: number;
    quality: 'schlecht' | 'okay' | 'gut' | 'sehr_gut';
    deepSleep: number;
    lightSleep: number;
    remSleep: number;
    awake: number;
  };
  bodyBattery: {
    start: number;
    end: number;
    min: number;
    max: number;
  };
  stress: {
    avg: number;
    max: number;
  };
  activity: {
    steps: number;
    calories: number;
    activeMinutes: number;
  };
  lastSync: string | null;
}

const GarminDataCard: React.FC<GarminDataCardProps> = ({ date, showRefresh = false }) => {
  const [data, setData] = useState<ProcessedGarminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  const loadGarminData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load raw Garmin data for the specified date
      const { data: rawData } = await supabase
        .from('garmin_raw_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('data_date', date)
        .order('created_at', { ascending: false });

      if (rawData && rawData.length > 0) {
        const processed = processRawData(rawData);
        setData(processed);
      }

      // Get last sync time
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('garmin_last_sync')
        .eq('id', user.id)
        .single();

      if (profile?.garmin_last_sync) {
        setData(prev => prev ? { ...prev, lastSync: profile.garmin_last_sync } : null);
      }

    } catch (error) {
      console.error('Failed to load Garmin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRawData = (rawDataArray: any[]): ProcessedGarminData => {
    const dataByType = rawDataArray.reduce((acc, item) => {
      acc[item.data_type] = item.raw_json;
      return acc;
    }, {});

    const { hrv, daily_stats, sleep, body_battery } = dataByType;

    return {
      hrv: {
        score: hrv?.lastNightAvg || 35,
        status: mapHRVStatus(hrv?.lastNightAvg),
        sevenDayAvg: hrv?.sevenDayAvg || 35
      },
      sleep: {
        duration: sleep?.duration || 480,
        quality: mapSleepQuality(sleep?.sleepScores?.overall),
        deepSleep: sleep?.deepSleep || 90,
        lightSleep: sleep?.lightSleep || 300,
        remSleep: sleep?.remSleep || 90,
        awake: sleep?.awake || 20
      },
      bodyBattery: {
        start: body_battery?.start || 85,
        end: body_battery?.end || 30,
        min: body_battery?.min || 20,
        max: body_battery?.max || 95
      },
      stress: {
        avg: daily_stats?.stressLevel || 25,
        max: daily_stats?.maxStress || 60
      },
      activity: {
        steps: daily_stats?.steps || 0,
        calories: daily_stats?.calories || 0,
        activeMinutes: daily_stats?.activeMinutes || 0
      },
      lastSync: null
    };
  };

  const mapHRVStatus = (score: number): 'kritisch' | 'unter_bereich' | 'normal' | 'optimal' => {
    if (!score) return 'normal';
    if (score <= 22) return 'kritisch';
    if (score <= 26) return 'unter_bereich';
    if (score <= 35) return 'normal';
    return 'optimal';
  };

  const mapSleepQuality = (score: number): 'schlecht' | 'okay' | 'gut' | 'sehr_gut' => {
    if (!score) return 'okay';
    if (score >= 80) return 'sehr_gut';
    if (score >= 70) return 'gut';
    if (score >= 50) return 'okay';
    return 'schlecht';
  };

  const getHRVStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-600';
      case 'normal': return 'text-blue-600';
      case 'unter_bereich': return 'text-yellow-600';
      case 'kritisch': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSleepQualityColor = (quality: string) => {
    switch (quality) {
      case 'sehr_gut': return 'text-green-600';
      case 'gut': return 'text-blue-600';
      case 'okay': return 'text-yellow-600';
      case 'schlecht': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  useEffect(() => {
    loadGarminData();

    // Set up real-time subscription for new Garmin data
    if (realTimeUpdates) {
      const channel = supabase
        .channel('garmin-data-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'garmin_raw_data',
            filter: `data_date=eq.${date}`
          },
          () => {
            console.log('New Garmin data received, refreshing...');
            loadGarminData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [date, realTimeUpdates]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Garmin Daten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Garmin Daten
          </CardTitle>
          <CardDescription>
            Keine Garmin-Daten für {format(new Date(date), 'dd. MMMM yyyy', { locale: de })} verfügbar
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Garmin Daten
        </CardTitle>
        <CardDescription>
          {format(new Date(date), 'dd. MMMM yyyy', { locale: de })}
          {data.lastSync && (
            <span className="ml-2 text-xs text-muted-foreground">
              • Sync: {format(new Date(data.lastSync), 'HH:mm', { locale: de })}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* HRV */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-medium">HRV</span>
            </div>
            <Badge variant="outline" className={getHRVStatusColor(data.hrv.status)}>
              {data.hrv.score}ms
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Status: <span className={getHRVStatusColor(data.hrv.status)}>
              {data.hrv.status.replace('_', ' ')}
            </span> | 7-Tage Ø: {data.hrv.sevenDayAvg}ms
          </div>
        </div>

        <Separator />

        {/* Sleep */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Schlaf</span>
            </div>
            <Badge variant="outline" className={getSleepQualityColor(data.sleep.quality)}>
              {Math.round(data.sleep.duration / 60)}h {data.sleep.duration % 60}m
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Qualität: <span className={getSleepQualityColor(data.sleep.quality)}>
              {data.sleep.quality.replace('_', ' ')}
            </span></div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>Tief: {data.sleep.deepSleep}m</div>
              <div>Leicht: {data.sleep.lightSleep}m</div>
              <div>REM: {data.sleep.remSleep}m</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Body Battery */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4 text-green-500" />
              <span className="font-medium">Body Battery</span>
            </div>
            <div className="text-sm font-medium">
              {data.bodyBattery.start} → {data.bodyBattery.end}
            </div>
          </div>
          <Progress value={data.bodyBattery.end} className="h-2" />
          <div className="text-xs text-muted-foreground">
            Min: {data.bodyBattery.min} | Max: {data.bodyBattery.max}
          </div>
        </div>

        <Separator />

        {/* Activity & Stress */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Aktivität
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>{data.activity.steps.toLocaleString()} Schritte</div>
              <div>{data.activity.calories} kcal</div>
              <div>{data.activity.activeMinutes} min aktiv</div>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Timer className="h-4 w-4 text-purple-500" />
              Stress
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Ø Stress: {data.stress.avg}</div>
              <div>Max: {data.stress.max}</div>
            </div>
          </div>
        </div>

        {/* Real-time toggle */}
        {showRefresh && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={realTimeUpdates}
                  onChange={(e) => setRealTimeUpdates(e.target.checked)}
                  className="rounded"
                />
                Live Updates
              </label>
              <button
                onClick={loadGarminData}
                className="text-blue-600 hover:text-blue-800"
              >
                Aktualisieren
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GarminDataCard;