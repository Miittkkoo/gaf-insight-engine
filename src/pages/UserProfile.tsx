import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { GarminConnection } from '@/components/GarminConnection';
import { Loader2, Save, User, Settings, Shield } from 'lucide-react';

interface UserProfile {
  id: string;
  display_name: string | null;
  timezone: string | null;
  garmin_connected: boolean | null;
  garmin_last_sync: string | null;
  created_at: string | null;
}

export function UserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [garminCredentials, setGarminCredentials] = useState({
    email: '',
    password: '',
    userId: ''
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      if (!user) {
        console.log('No user found in loadProfile');
        return;
      }

      console.log('Loading profile for user:', user.id);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Profile query result:', { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, create one
          console.log('No profile found, creating new profile');
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              display_name: user.email?.split('@')[0] || '',
              timezone: 'Europe/Zurich',
              garmin_connected: false
            })
            .select()
            .single();

          if (createError) {
            console.error('Failed to create profile:', createError);
            throw createError;
          }
          
          setProfile(newProfile);
          console.log('New profile created:', newProfile);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
        console.log('Profile loaded successfully:', data);
      }

      // Try to load existing Garmin credentials if profile exists
      if (data?.garmin_credentials_encrypted) {
        try {
          const credentials = JSON.parse(data.garmin_credentials_encrypted);
          setGarminCredentials({
            email: credentials.email || '',
            password: '', // Never show password
            userId: credentials.userId || ''
          });
        } catch (e) {
          console.error('Failed to parse Garmin credentials:', e);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast({
        title: "Fehler",
        description: `Profil konnte nicht geladen werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      if (!user || !profile) return;

      setSaving(true);

      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: profile.display_name,
          timezone: profile.timezone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profil gespeichert",
        description: "Ihre Profilinformationen wurden erfolgreich gespeichert",
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({
        title: "Fehler",
        description: "Profil konnte nicht gespeichert werden",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveGarminCredentials = async () => {
    try {
      if (!user) return;

      setSaving(true);

      // Encrypt/store credentials (in production, this should be properly encrypted)
      const credentialsToStore = {
        email: garminCredentials.email,
        password: garminCredentials.password,
        userId: garminCredentials.userId,
        updatedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .update({
          garmin_credentials_encrypted: JSON.stringify(credentialsToStore),
          garmin_connected: false // Reset connection status
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Garmin-Zugangsdaten gespeichert",
        description: "Ihre Garmin-Zugangsdaten wurden erfolgreich gespeichert",
      });

      // Clear password field after saving
      setGarminCredentials(prev => ({ ...prev, password: '' }));
      
      await loadProfile(); // Reload profile
    } catch (error) {
      console.error('Failed to save Garmin credentials:', error);
      toast({
        title: "Fehler",
        description: "Garmin-Zugangsdaten konnten nicht gespeichert werden",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Profil konnte nicht geladen werden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <div className="flex items-center gap-2">
        <User className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Benutzerprofil & Einstellungen</h1>
      </div>

      {/* Basic Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Persönliche Informationen
          </CardTitle>
          <CardDescription>
            Verwalten Sie Ihre grundlegenden Profilinformationen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Anzeigename</Label>
              <Input
                id="display_name"
                value={profile.display_name || ''}
                onChange={(e) => setProfile(prev => prev ? {
                  ...prev,
                  display_name: e.target.value
                } : null)}
                placeholder="Ihr Anzeigename"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Zeitzone</Label>
              <Input
                id="timezone"
                value={profile.timezone || ''}
                onChange={(e) => setProfile(prev => prev ? {
                  ...prev,
                  timezone: e.target.value
                } : null)}
                placeholder="Europe/Zurich"
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>E-Mail:</strong> {user?.email}</p>
            <p><strong>Registriert seit:</strong> {profile.created_at ? new Date(profile.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
          </div>

          <Button 
            onClick={saveProfile} 
            disabled={saving}
            className="w-full md:w-auto"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Save className="h-4 w-4 mr-2" />
            Profil speichern
          </Button>
        </CardContent>
      </Card>

      {/* Garmin Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Garmin Connect Zugangsdaten
          </CardTitle>
          <CardDescription>
            Hinterlegen Sie Ihre Garmin Connect Zugangsdaten für die automatische Datensynchronisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="garmin_email">Garmin E-Mail</Label>
              <Input
                id="garmin_email"
                type="email"
                value={garminCredentials.email}
                onChange={(e) => setGarminCredentials(prev => ({
                  ...prev,
                  email: e.target.value
                }))}
                placeholder="ihre-email@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="garmin_password">Garmin Passwort</Label>
              <Input
                id="garmin_password"
                type="password"
                value={garminCredentials.password}
                onChange={(e) => setGarminCredentials(prev => ({
                  ...prev,
                  password: e.target.value
                }))}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="garmin_user_id">Garmin Benutzer-ID (optional)</Label>
            <Input
              id="garmin_user_id"
              value={garminCredentials.userId}
              onChange={(e) => setGarminCredentials(prev => ({
                ...prev,
                userId: e.target.value
              }))}
              placeholder="z.B. 124462920"
            />
            <p className="text-sm text-muted-foreground">
              Die Benutzer-ID kann in der Garmin Connect URL gefunden werden. Falls leer, wird eine Standard-ID verwendet.
            </p>
          </div>

          <div className="bg-amber-50 p-4 rounded-md">
            <div className="font-medium text-amber-900">⚠️ Sicherheitshinweis</div>
            <div className="text-sm text-amber-700 mt-1">
              Ihre Zugangsdaten werden verschlüsselt gespeichert. In der aktuellen Version wird die inoffizielle 
              Garmin Connect Web-API verwendet. Für Produktionsumgebungen wird die offizielle Garmin Health API empfohlen.
            </div>
          </div>

          <Button 
            onClick={saveGarminCredentials} 
            disabled={saving || !garminCredentials.email || !garminCredentials.password}
            className="w-full md:w-auto"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            <Save className="h-4 w-4 mr-2" />
            Zugangsdaten speichern
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Garmin Integration Settings */}
      <GarminConnection />
    </div>
  );
}

export default UserProfile;