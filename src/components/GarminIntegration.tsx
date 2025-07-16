import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGarminSync } from '@/hooks/useGarminSync';
import { GarminSyncManager } from './GarminSyncManager';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Download, 
  Wifi, 
  Activity, 
  Heart, 
  Battery, 
  Moon, 
  Timer, 
  TrendingUp,
  Calendar,
  Database 
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

import { useToast } from '@/hooks/use-toast';

interface GarminProfile {
  garmin_connected: boolean;
  garmin_last_sync: string | null;
  garmin_credentials_encrypted?: string;
}

interface ProcessedGarminData {
  hrv: {
    score: number;
    status: string;
    sevenDayAvg: number;
  };
  sleep: {
    duration: number;
    quality: string;
    deepSleep: number;
    lightSleep: number;
    remSleep: number;
    score: number;
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
}

export const GarminIntegration: React.FC = () => {
  const [profile, setProfile] = useState<GarminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [garminData, setGarminData] = useState<ProcessedGarminData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
    loadAvailableDates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadGarminDataForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('garmin_connected, garmin_last_sync, garmin_credentials_encrypted')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rawData } = await supabase
        .from('garmin_raw_data')
        .select('data_date')
        .eq('user_id', user.id)
        .order('data_date', { ascending: false });

      if (rawData) {
        const uniqueDates = [...new Set(rawData.map(item => item.data_date))];
        setAvailableDates(uniqueDates);
        
        // Set most recent date as default if available
        if (uniqueDates.length > 0 && !selectedDate) {
          setSelectedDate(uniqueDates[0]);
        }
      }
    } catch (error) {
      console.error('Error loading available dates:', error);
    }
  };

  const loadGarminDataForDate = async (date: string) => {
    setDataLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rawData } = await supabase
        .from('garmin_raw_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('data_date', date)
        .order('created_at', { ascending: false });

      if (rawData && rawData.length > 0) {
        const processed = processRawData(rawData);
        setGarminData(processed);
      } else {
        setGarminData(null);
      }
    } catch (error) {
      console.error('Error loading Garmin data:', error);
      setGarminData(null);
    } finally {
      setDataLoading(false);
    }
  };

  const processRawData = (rawDataArray: any[]): ProcessedGarminData => {
    const dataByType = rawDataArray.reduce((acc, item) => {
      acc[item.data_type] = item.raw_json;
      return acc;
    }, {});

    const result: ProcessedGarminData = {
      hrv: {
        score: 0,
        status: 'balanced',
        sevenDayAvg: 0
      },
      sleep: {
        duration: 0,
        quality: 'fair',
        deepSleep: 0,
        lightSleep: 0,
        remSleep: 0,
        score: 0
      },
      bodyBattery: {
        start: 0,
        end: 0,
        min: 0,
        max: 0
      },
      stress: {
        avg: 0,
        max: 0
      },
      activity: {
        steps: 0,
        calories: 0,
        activeMinutes: 0
      }
    };

    // Process HRV data - handle wellnessData structure
    if (dataByType.hrv?.wellnessData?.length > 0) {
      const hrv = dataByType.hrv.wellnessData[0];
      result.hrv = {
        score: hrv.lastNightAvg || 0,
        status: hrv.status?.toLowerCase() || 'balanced',
        sevenDayAvg: hrv.sevenDayAvg || hrv.lastNightAvg || 0
      };
    } else if (dataByType.hrv?.hrvSummary) {
      const hrv = dataByType.hrv.hrvSummary;
      result.hrv = {
        score: hrv.lastNightAvg || 0,
        status: hrv.status?.toLowerCase() || 'balanced',
        sevenDayAvg: hrv.sevenDayAvg || hrv.lastNightAvg || 0
      };
    }

    // Process sleep data
    if (dataByType.sleep?.dailySleepDTO) {
      const sleep = dataByType.sleep.dailySleepDTO;
      result.sleep = {
        duration: Math.round((sleep.sleepTimeSeconds || 0) / 60),
        deepSleep: Math.round((sleep.deepSleepSeconds || 0) / 60),
        lightSleep: Math.round((sleep.lightSleepSeconds || 0) / 60),
        remSleep: Math.round((sleep.remSleepSeconds || 0) / 60),
        score: sleep.sleepScore || 0,
        quality: mapSleepQuality(sleep.sleepScore)
      };
    }

    // Process body battery data - new realistic structure
    if (dataByType.body_battery) {
      const bb = dataByType.body_battery;
      result.bodyBattery = {
        start: bb.startLevel || 0,
        end: bb.endLevel || 0,
        min: bb.minLevel || 0,
        max: bb.maxLevel || 100
      };
    }

    // Process steps data - handle both structures
    if (dataByType.steps?.totalSteps) {
      // Direct structure from new realistic data
      result.activity = {
        steps: dataByType.steps.totalSteps || 0,
        calories: dataByType.steps.calories || 0,
        activeMinutes: dataByType.steps.activeMinutes || 0
      };
    } else if (dataByType.steps?.dailyMovement) {
      // Nested structure
      const movement = dataByType.steps.dailyMovement;
      result.activity = {
        steps: movement.totalSteps || 0,
        calories: movement.caloriesBurned || 0,
        activeMinutes: Math.round((movement.activeTimeSeconds || 0) / 60)
      };
    }

    // Process stress data
    if (dataByType.stress) {
      result.stress = {
        avg: dataByType.stress.avgStressLevel || 0,
        max: dataByType.stress.maxStressLevel || 0
      };
    }

    return result;
  };

  const mapSleepQuality = (score: number | undefined): string => {
    if (!score) return 'fair';
    if (score >= 80) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Nicht authentifiziert');
      }

      // Simple test - just check if we can access Garmin function
      const { error } = await supabase.functions.invoke('garmin-bulk-sync', {
        body: { test: true },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        toast({
          title: "Verbindung fehlgeschlagen",
          description: "Garmin-Service nicht erreichbar",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verbindung erfolgreich",
          description: "Garmin-Service ist erreichbar",
        });
        await loadProfile();
      }
    } catch (error) {
      toast({
        title: "Test fehlgeschlagen",
        description: "Verbindungstest konnte nicht durchgeführt werden",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const bulkSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Nicht authentifiziert');
      }

      if (!profile?.garmin_credentials_encrypted) {
        throw new Error('Garmin-Zugangsdaten fehlen. Bitte konfigurieren Sie Ihre Anmeldedaten.');
      }

      console.log('🚀 Starte ECHTEN Garmin-Daten Sync...');

      // Call the REAL Garmin bulk sync Edge Function
      const { data: result, error } = await supabase.functions.invoke('garmin-bulk-sync', {
        body: { weeksPast: 4 },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('❌ ECHTER Bulk-Sync Fehler:', error);
        throw error;
      }

      console.log('✅ ECHTER Bulk-Sync Ergebnis:', result);

      if (result?.success) {
        toast({
          title: "🎯 ECHTE Daten synchronisiert!",
          description: `${result.dataPointsSynced} echte Garmin-Datenpunkte von ${result.dateRange} geladen`,
        });
        await loadProfile();
        await loadAvailableDates();
        
        // Refresh current date data
        if (selectedDate) {
          await loadGarminDataForDate(selectedDate);
        }
      } else {
        toast({
          title: "❌ Synchronisation fehlgeschlagen",
          description: result?.message || 'Unbekannter Fehler',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ ECHTER Sync Fehler:', error);
      toast({
        title: "❌ Sync fehlgeschlagen",
        description: error instanceof Error ? error.message : 'Echte Datensynchronisation fehlgeschlagen',
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const getHRVStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'balanced': return 'text-green-600';
      case 'unbalanced': return 'text-yellow-600';
      case 'poor': 
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSleepQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
    </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Garmin Connect Integration
            <div className="ml-auto">
              {profile?.garmin_connected ? (
                <Badge variant="default" className="bg-emerald-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verbunden
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Nicht verbunden
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Automatische Synchronisation von Garmin-Gesundheitsdaten
            {profile?.garmin_last_sync && (
              <span className="block text-xs text-muted-foreground mt-1">
                Letzte Sync: {format(new Date(profile.garmin_last_sync), 'dd.MM.yyyy HH:mm', { locale: de })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={testConnection}
              disabled={testing}
              variant="outline"
              size="sm"
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Wifi className="mr-2 h-4 w-4" />
              Verbindung testen
            </Button>
            
            <Button
              onClick={bulkSync}
              disabled={syncing || !profile?.garmin_credentials_encrypted}
              size="sm"
            >
              {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Download className="mr-2 h-4 w-4" />
              🎯 ECHTE Daten laden (4 Wochen)
            </Button>
          </div>

          {availableDates.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Database className="w-4 h-4" />
              <span className="font-medium">Verfügbare Daten:</span>
              <Badge variant="outline">{availableDates.length} Tage</Badge>
              <span className="text-muted-foreground">
                {availableDates[availableDates.length - 1]} bis {availableDates[0]}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Viewer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Garmin Daten
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Datum wählen" />
              </SelectTrigger>
              <SelectContent>
                {[...Array(7)].map((_, i) => {
                  const date = subDays(new Date(), i).toISOString().split('T')[0];
                  const hasData = availableDates.includes(date);
                  return (
                    <SelectItem key={date} value={date}>
                      <div className="flex items-center gap-2">
                        <span>{format(new Date(date), 'dd.MM.yyyy', { locale: de })}</span>
                        {hasData && <Badge variant="secondary" className="text-xs">Daten</Badge>}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Lade Daten...</span>
            </div>
          ) : !garminData ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Garmin-Daten für {format(new Date(selectedDate), 'dd. MMMM yyyy', { locale: de })} verfügbar</p>
              <p className="text-sm mt-2">Führen Sie eine Synchronisation durch, um Daten zu laden</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* HRV */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="font-medium">HRV</span>
                  </div>
                  <Badge variant="outline" className={getHRVStatusColor(garminData.hrv.status)}>
                    {garminData.hrv.score}ms
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Status: <span className={getHRVStatusColor(garminData.hrv.status)}>
                    {garminData.hrv.status}
                  </span> | 7-Tage Ø: {garminData.hrv.sevenDayAvg}ms
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
                  <Badge variant="outline" className={getSleepQualityColor(garminData.sleep.quality)}>
                    {Math.floor(garminData.sleep.duration / 60)}h {garminData.sleep.duration % 60}m
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Score: <span className={getSleepQualityColor(garminData.sleep.quality)}>
                    {garminData.sleep.score}/100 ({garminData.sleep.quality})
                  </span></div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>Tief: {garminData.sleep.deepSleep}m</div>
                    <div>Leicht: {garminData.sleep.lightSleep}m</div>
                    <div>REM: {garminData.sleep.remSleep}m</div>
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
                    {garminData.bodyBattery.start} → {garminData.bodyBattery.end}
                  </div>
                </div>
                <Progress value={garminData.bodyBattery.end} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  Min: {garminData.bodyBattery.min} | Max: {garminData.bodyBattery.max}
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
                    <div>{garminData.activity.steps.toLocaleString()} Schritte</div>
                    <div>{garminData.activity.calories} kcal</div>
                    <div>{garminData.activity.activeMinutes} min aktiv</div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Timer className="h-4 w-4 text-purple-500" />
                    Stress
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Ø Stress: {garminData.stress.avg}</div>
                    <div>Max: {garminData.stress.max}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Sync Manager */}
      <GarminSyncManager />
    </div>
  );
};