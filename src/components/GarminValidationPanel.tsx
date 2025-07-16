import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Activity } from 'lucide-react';

interface ValidationResult {
  totalRawRecords: number;
  emptyDataRecords: number;
  validDataRecords: number;
  dataTypes: Record<string, { total: number; empty: number; valid: number }>;
  sampleData: any[];
  lastSync: string | null;
}

export function GarminValidationPanel() {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const validateGarminData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all raw data for validation
      const { data: rawData } = await supabase
        .from('garmin_raw_data')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!rawData) return;

      const dataTypes: Record<string, { total: number; empty: number; valid: number }> = {};
      let emptyCount = 0;
      let validCount = 0;

      rawData.forEach(record => {
        const { data_type, raw_json } = record;
        
        if (!dataTypes[data_type]) {
          dataTypes[data_type] = { total: 0, empty: 0, valid: 0 };
        }
        
        dataTypes[data_type].total++;
        
        const isEmpty = !raw_json || 
          Object.keys(raw_json).length === 0 || 
          JSON.stringify(raw_json) === '{}';
          
        if (isEmpty) {
          dataTypes[data_type].empty++;
          emptyCount++;
        } else {
          dataTypes[data_type].valid++;
          validCount++;
        }
      });

      // Get profile info
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('garmin_last_sync')
        .eq('id', user.id)
        .single();

      setValidation({
        totalRawRecords: rawData.length,
        emptyDataRecords: emptyCount,
        validDataRecords: validCount,
        dataTypes,
        sampleData: rawData.slice(0, 3),
        lastSync: profile?.garmin_last_sync || null
      });
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const cleanEmptyRecords = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete all records with empty JSON - use textual comparison
      const { error } = await supabase
        .from('garmin_raw_data')
        .delete()
        .eq('user_id', user.id)
        .eq('raw_json', '{}');

      if (error) {
        console.error('Clean error:', error);
      } else {
        console.log('✅ Cleaned empty records');
        await validateGarminData(); // Refresh validation
      }
    } catch (error) {
      console.error('Clean error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Garmin Daten Validierung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={validateGarminData} 
            disabled={loading}
            variant="outline"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            Daten überprüfen
          </Button>
          
          {validation && validation.emptyDataRecords > 0 && (
            <Button 
              onClick={cleanEmptyRecords}
              disabled={loading}
              variant="destructive"
              size="sm"
            >
              <XCircle className="h-4 w-4" />
              Leere Datensätze löschen ({validation.emptyDataRecords})
            </Button>
          )}
        </div>

        {validation && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{validation.totalRawRecords}</div>
                <div className="text-sm text-muted-foreground">Gesamt Datensätze</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{validation.validDataRecords}</div>
                <div className="text-sm text-muted-foreground">Mit Daten</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{validation.emptyDataRecords}</div>
                <div className="text-sm text-muted-foreground">Leer</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Datentypen Übersicht:</h4>
              {Object.entries(validation.dataTypes).map(([type, stats]) => (
                <div key={type} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="font-medium">{type}</span>
                  <div className="flex gap-2">
                    {stats.valid > 0 && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {stats.valid} valid
                      </Badge>
                    )}
                    {stats.empty > 0 && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {stats.empty} leer
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {validation.lastSync && (
              <div className="text-xs text-muted-foreground">
                Letzter Sync: {new Date(validation.lastSync).toLocaleString('de-DE')}
              </div>
            )}

            {validation.sampleData.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">Sample Daten anzeigen</summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
                  {JSON.stringify(validation.sampleData.slice(0, 2), null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}