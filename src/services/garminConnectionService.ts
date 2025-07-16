import { supabase } from '@/integrations/supabase/client';

export interface GarminConnectionResult {
  success: boolean;
  message: string;
  connected?: boolean;
  lastSync?: string;
}

export interface GarminBulkSyncResult {
  success: boolean;
  message: string;
  dataPointsSynced?: number;
  dateRange?: string;
  errors?: string[];
}

export class GarminConnectionService {
  
  async testConnection(): Promise<GarminConnectionResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return {
          success: false,
          message: 'Not authenticated'
        };
      }

      console.log('Testing Garmin connection...');
      
      const { data: functionResult, error: functionError } = await supabase.functions.invoke('garmin-test-connection', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (functionError) {
        return {
          success: false,
          message: functionError.message || 'Connection test failed'
        };
      }

      return {
        success: true,
        message: 'Garmin connection successful',
        connected: functionResult?.connected || false
      };
      
    } catch (error) {
      console.error('Connection test error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async bulkSync(weeksPast: number = 4): Promise<GarminBulkSyncResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return {
          success: false,
          message: 'Not authenticated'
        };
      }

      console.log(`Starting bulk sync for last ${weeksPast} weeks...`);
      
      const { data: functionResult, error: functionError } = await supabase.functions.invoke('garmin-bulk-sync', {
        body: { weeksPast },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (functionError) {
        return {
          success: false,
          message: functionError.message || 'Bulk sync failed'
        };
      }

      return {
        success: true,
        message: 'Bulk sync completed successfully',
        dataPointsSynced: functionResult?.dataPointsSynced || 0,
        dateRange: functionResult?.dateRange || '',
        errors: functionResult?.errors || []
      };
      
    } catch (error) {
      console.error('Bulk sync error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAvailableDataDates(): Promise<string[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: rawData } = await supabase
        .from('garmin_raw_data')
        .select('data_date')
        .eq('user_id', user.id)
        .order('data_date', { ascending: false });

      if (!rawData) return [];

      // Get unique dates
      const uniqueDates = [...new Set(rawData.map(item => item.data_date))];
      return uniqueDates.sort().reverse(); // Most recent first
      
    } catch (error) {
      console.error('Error fetching available data dates:', error);
      return [];
    }
  }

  async getDataForDate(date: string): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: rawData } = await supabase
        .from('garmin_raw_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('data_date', date);

      if (!rawData || rawData.length === 0) return null;

      // Process raw data into structured format
      const processedData: any = {
        date,
        hasData: true,
        dataTypes: []
      };

      rawData.forEach(item => {
        processedData.dataTypes.push(item.data_type);
        processedData[item.data_type] = item.raw_json;
      });

      return processedData;
      
    } catch (error) {
      console.error('Error fetching data for date:', error);
      return null;
    }
  }
}

export const garminConnectionService = new GarminConnectionService();