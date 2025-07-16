import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Database, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useGarminSync } from '@/hooks/useGarminSync';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export function GarminSyncManager() {
  const {
    isLoading,
    lastSync,
    dataQuality,
    error,
    validateData,
    cleanInvalidRecords,
    bulkSync
  } = useGarminSync();

  useEffect(() => {
    validateData();
  }, [validateData]);

  const handleBulkSync = () => {
    bulkSync(4);
  };

  const handleCleanRecords = () => {
    cleanInvalidRecords();
  };

  const getQualityStatus = () => {
    if (!dataQuality) return 'unknown';
    
    const qualityRatio = dataQuality.totalRecords > 0 
      ? dataQuality.meaningfulRecords / dataQuality.totalRecords 
      : 0;
    
    if (qualityRatio >= 0.8) return 'excellent';
    if (qualityRatio >= 0.6) return 'good';
    if (qualityRatio >= 0.3) return 'fair';
    return 'poor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'fair':
      case 'poor':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Garmin Daten Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Controls */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleBulkSync}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Synchronisiert...' : 'Daten synchronisieren'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={validateData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Validierung aktualisieren
          </Button>
          
          {dataQuality && dataQuality.emptyRecords > 0 && (
            <Button 
              variant="destructive"
              onClick={handleCleanRecords}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Leere Datensätze löschen ({dataQuality.emptyRecords})
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Fehler:</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Last Sync Info */}
        {lastSync && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Letzte Synchronisation: {formatDistanceToNow(new Date(lastSync), { 
              addSuffix: true, 
              locale: de 
            })}
          </div>
        )}

        <Separator />

        {/* Data Quality Overview */}
        {dataQuality && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Datenqualität</h3>
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(getQualityStatus())} text-white`}
              >
                <div className="flex items-center gap-1">
                  {getStatusIcon(getQualityStatus())}
                  {getQualityStatus()}
                </div>
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {dataQuality.totalRecords}
                </div>
                <div className="text-sm text-muted-foreground">
                  Gesamt
                </div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {dataQuality.meaningfulRecords}
                </div>
                <div className="text-sm text-muted-foreground">
                  Mit Daten
                </div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {dataQuality.emptyRecords}
                </div>
                <div className="text-sm text-muted-foreground">
                  Leer
                </div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.keys(dataQuality.dataTypes).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Datentypen
                </div>
              </div>
            </div>

            {/* Data Types Breakdown */}
            {Object.keys(dataQuality.dataTypes).length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Datentypen Verteilung</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Object.entries(dataQuality.dataTypes).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="justify-center">
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Data */}
            {dataQuality.sampleData.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Daten Beispiele</h4>
                <div className="space-y-2">
                  {dataQuality.sampleData.map((sample, index) => (
                    <div key={index} className="p-2 bg-muted rounded text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {sample.type} - {sample.date}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {sample.size} Zeichen
                        </Badge>
                      </div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {sample.preview}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!dataQuality && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Keine Datenqualitäts-Informationen verfügbar.</p>
            <p className="text-sm">Klicken Sie auf "Validierung aktualisieren" um zu beginnen.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}