import { useState, useCallback } from 'react';
import { garminDataService, type GarminSyncResult, type GarminDataQuality } from '@/services/garminDataService';
import { useToast } from '@/hooks/use-toast';

interface GarminSyncState {
  isLoading: boolean;
  lastSync: string | null;
  dataQuality: GarminDataQuality | null;
  error: string | null;
}

export function useGarminSync() {
  const { toast } = useToast();
  
  const [state, setState] = useState<GarminSyncState>({
    isLoading: false,
    lastSync: null,
    dataQuality: null,
    error: null
  });

  const validateData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const quality = await garminDataService.validateDataQuality();
      
      setState(prev => ({
        ...prev,
        dataQuality: quality,
        lastSync: quality.lastSync,
        isLoading: false
      }));
      
      return quality;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      
      toast({
        title: "Validierung fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  }, [toast]);

  const cleanInvalidRecords = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const deletedCount = await garminDataService.cleanInvalidRecords();
      
      toast({
        title: "Daten bereinigt",
        description: `${deletedCount} ungültige Datensätze wurden entfernt.`,
      });
      
      // Refresh validation after cleanup
      await validateData();
      
      return deletedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cleanup failed';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      
      toast({
        title: "Bereinigung fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  }, [toast, validateData]);

  const bulkSync = useCallback(async (weeksPast: number = 4): Promise<GarminSyncResult> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await garminDataService.bulkSync(weeksPast);
      
      if (result.success) {
        toast({
          title: "Sync erfolgreich",
          description: `${result.dataPointsSynced} Datenpunkte synchronisiert.`,
        });
      } else {
        throw new Error(result.message || 'Sync failed');
      }
      
      // Refresh validation after sync
      await validateData();
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      
      toast({
        title: "Sync fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  }, [toast, validateData]);

  const getDataForDate = useCallback(async (date: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return await garminDataService.getDataForDate(date);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get data';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  const getAvailableDataDates = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return await garminDataService.getAvailableDataDates();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get dates';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  return {
    ...state,
    validateData,
    cleanInvalidRecords,
    bulkSync,
    getDataForDate,
    getAvailableDataDates
  };
}