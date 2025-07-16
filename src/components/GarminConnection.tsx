import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Loader2, Download, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { garminConnectionService } from '@/services/garminConnectionService';
import { useToast } from '@/hooks/use-toast';

export const GarminConnection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
    loadAvailableDates();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('garmin_credentials_encrypted, garmin_connected, garmin_last_sync')
        .eq('id', user.id)
        .single();

      if (profile) {
        setConnected(profile.garmin_connected || false);
        setLastSync(profile.garmin_last_sync);
        
        if (profile.garmin_credentials_encrypted) {
          try {
            const credentials = JSON.parse(profile.garmin_credentials_encrypted);
            setEmail(credentials.email || '');
          } catch (e) {
            console.error('Error parsing credentials:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadAvailableDates = async () => {
    const dates = await garminConnectionService.getAvailableDataDates();
    setAvailableDates(dates);
  };

  const saveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const encryptedCredentials = JSON.stringify({ 
        email, 
        password,
        updatedAt: new Date().toISOString()
      });

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          garmin_credentials_encrypted: encryptedCredentials,
          garmin_connected: false,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Credentials saved",
        description: "Your Garmin credentials have been saved successfully.",
      });

      setPassword(''); // Clear password for security
      await loadProfile();

    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Error",
        description: "Failed to save credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    
    try {
      const result = await garminConnectionService.testConnection();
      
      if (result.success) {
        setConnected(true);
        toast({
          title: "Connection successful",
          description: result.message,
        });
        await loadProfile();
      } else {
        toast({
          title: "Connection failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test failed",
        description: "Failed to test connection",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const bulkSync = async () => {
    setSyncing(true);
    
    try {
      const result = await garminConnectionService.bulkSync(4);
      
      if (result.success) {
        toast({
          title: "Sync completed",
          description: `${result.dataPointsSynced} data points synced for ${result.dateRange}`,
        });
        await loadProfile();
        await loadAvailableDates();
      } else {
        toast({
          title: "Sync failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Failed to sync data",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Garmin Connect Integration
          </CardTitle>
          <CardDescription>
            Connect your Garmin account to sync health and fitness data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <Badge variant="default" className="bg-emerald-500">Connected</Badge>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <Badge variant="secondary">Not Connected</Badge>
              </>
            )}
            {lastSync && (
              <span className="text-sm text-muted-foreground ml-2">
                Last sync: {new Date(lastSync).toLocaleString()}
              </span>
            )}
          </div>

          <Separator />

          {/* Credentials Form */}
          <form onSubmit={saveCredentials} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Garmin Connect Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Credentials
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={testing || !email}
              >
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
            </div>
          </form>

          <Separator />

          {/* Data Sync Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Data Synchronization</h4>
                <p className="text-sm text-muted-foreground">
                  Sync the last 4 weeks of your Garmin data
                </p>
              </div>
              <Button
                onClick={bulkSync}
                disabled={syncing || !connected}
                size="sm"
              >
                {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Download className="mr-2 h-4 w-4" />
                Bulk Sync
              </Button>
            </div>

            {availableDates.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Available data ({availableDates.length} days):</p>
                <div className="flex flex-wrap gap-1">
                  {availableDates.slice(0, 10).map((date) => (
                    <Badge key={date} variant="outline" className="text-xs">
                      {date}
                    </Badge>
                  ))}
                  {availableDates.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{availableDates.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};