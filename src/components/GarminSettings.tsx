import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useGarminData } from '@/hooks/useGarminData';
import { Loader2, Wifi, WifiOff, RefreshCw, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface GarminProfile {
  garmin_connected: boolean;
  garmin_last_sync: string | null;
}

export function GarminSettings() {
  const [profile, setProfile] = useState<GarminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const today = new Date().toISOString().split('T')[0];
  const { data: garminData, loading: syncLoading, error, syncGarminData, lastSync } = useGarminData(today);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('garmin_connected, garmin_last_sync')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast({
        title: "Fehler",
        description: "Profil konnte nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      await syncGarminData();
      await loadProfile(); // Refresh profile to get updated sync time
      
      toast({
        title: "Synchronisation erfolgreich",
        description: "Garmin-Daten wurden erfolgreich synchronisiert",
      });
    } catch (error) {
      toast({
        title: "Synchronisation fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    }
  };

  const testConnection = async () => {
    try {
      await syncGarminData();
      
      await supabase
        .from('user_profiles')
        .update({ garmin_connected: true })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);
      
      await loadProfile();
      
      toast({
        title: "Verbindung erfolgreich",
        description: "Garmin-Verbindung wurde erfolgreich getestet",
      });
    } catch (error) {
      await supabase
        .from('user_profiles')
        .update({ garmin_connected: false })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);
      
      await loadProfile();
      
      toast({
        title: "Verbindung fehlgeschlagen",
        description: "Garmin-Verbindung konnte nicht hergestellt werden. Bitte überprüfen Sie Ihre Zugangsdaten.",
        variant: "destructive",
      });
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {profile?.garmin_connected ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              Garmin Connect Integration
            </div>
            <Badge variant={profile?.garmin_connected ? "default" : "secondary"}>
              {profile?.garmin_connected ? "Verbunden" : "Nicht verbunden"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Automatische Synchronisation von Garmin-Gesundheitsdaten für HRV-Analyse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.garmin_last_sync && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Letzte Synchronisation: {format(new Date(profile.garmin_last_sync), 'dd.MM.yyyy HH:mm', { locale: de })}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={testConnection} 
              disabled={syncLoading}
              variant="outline"
            >
              {syncLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Verbindung testen
            </Button>
            
            <Button 
              onClick={handleSync} 
              disabled={syncLoading || !profile?.garmin_connected}
            >
              {syncLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <RefreshCw className="h-4 w-4 mr-2" />
              Jetzt synchronisieren
            </Button>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              Fehler: {error}
            </div>
          )}
        </CardContent>
      </Card>

      {garminData && (
        <Card>
          <CardHeader>
            <CardTitle>Aktuelle Garmin-Daten</CardTitle>
            <CardDescription>
              Übersicht der heute synchronisierten Daten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">HRV Score</div>
                <div className="text-2xl font-bold">{Math.round(garminData.hrv.score)}</div>
                <div className="text-muted-foreground">Status: {garminData.hrv.status}</div>
              </div>
              
              <div>
                <div className="font-medium">Body Battery</div>
                <div className="text-2xl font-bold">{Math.round(garminData.bodyBattery?.end || 0)}</div>
                <div className="text-muted-foreground">Ende des Tages</div>
              </div>
              
              <div>
                <div className="font-medium">Schlaf</div>
                <div className="text-2xl font-bold">{Math.round((garminData.sleep?.duration || 0) / 60)}h</div>
                <div className="text-muted-foreground">Qualität: {garminData.sleep?.quality || 'N/A'}</div>
              </div>
              
              <div>
                <div className="font-medium">Schritte</div>
                <div className="text-2xl font-bold">{(garminData.steps || 0).toLocaleString()}</div>
                <div className="text-muted-foreground">Heute</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Setup-Hinweise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="font-medium text-blue-900">Konfiguration</div>
            <div className="text-blue-700">
              Die Garmin-Zugangsdaten (E-Mail und Passwort) wurden bereits in den Projekt-Secrets hinterlegt.
              Die Integration verwendet diese Credentials für die automatische Datensynchronisation.
            </div>
          </div>
          
          <div className="bg-amber-50 p-3 rounded-md">
            <div className="font-medium text-amber-900">Wichtiger Hinweis</div>
            <div className="text-amber-700">
              Diese Integration nutzt die inoffizielle Garmin Connect Web-API. 
              Für Produktionsumgebungen wird die offizielle Garmin Health API empfohlen.
            </div>
          </div>
          
          <div className="bg-green-50 p-3 rounded-md">
            <div className="font-medium text-green-900">Datenverarbeitung</div>
            <div className="text-green-700">
              Synchronisierte Daten werden automatisch in die täglichen Metriken integriert und 
              für die GAF-Analyse verwendet. HRV-Werte reflektieren die Erholung vom Vortag.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}