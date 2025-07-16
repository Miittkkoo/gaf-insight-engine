import { supabase } from "@/integrations/supabase/client";

export interface GarminDataQuality {
  totalRecords: number;
  meaningfulRecords: number;
  emptyRecords: number;
  dataTypes: Record<string, number>;
  lastSync: string | null;
  sampleData: any[];
}

export interface GarminSyncResult {
  success: boolean;
  dataPointsSynced: number;
  emptyResponses?: number;
  dateRange: string;
  errors: string[];
  message: string;
  dataSource: string;
}

/**
 * Service for managing Garmin data operations
 */
export class GarminDataService {
  
  /**
   * Validates Garmin data quality and structure
   */
  async validateDataQuality(): Promise<GarminDataQuality> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get all raw data for validation
      const { data: rawData, error } = await supabase
        .from('garmin_raw_data')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Analyze data quality
      const totalRecords = rawData?.length || 0;
      let meaningfulRecords = 0;
      let emptyRecords = 0;
      const dataTypes: Record<string, number> = {};
      const sampleData: any[] = [];

      rawData?.forEach((record) => {
        // Count by data type
        dataTypes[record.data_type] = (dataTypes[record.data_type] || 0) + 1;
        
        // Check if data is meaningful
        const rawJson = record.raw_json;
        if (!rawJson || 
            (typeof rawJson === 'object' && Object.keys(rawJson).length === 0) ||
            rawJson === null ||
            rawJson === undefined ||
            (Array.isArray(rawJson) && rawJson.length === 0)) {
          emptyRecords++;
        } else {
          meaningfulRecords++;
          
          // Add to sample data (first 5 meaningful records)
          if (sampleData.length < 5) {
            sampleData.push({
              date: record.data_date,
              type: record.data_type,
              preview: JSON.stringify(rawJson).substring(0, 100) + '...',
              size: JSON.stringify(rawJson).length
            });
          }
        }
      });

      // Get last sync timestamp
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('garmin_last_sync')
        .eq('id', user.id)
        .single();

      return {
        totalRecords,
        meaningfulRecords,
        emptyRecords,
        dataTypes,
        lastSync: profile?.garmin_last_sync || null,
        sampleData
      };
    } catch (error) {
      console.error('Error validating data quality:', error);
      throw error;
    }
  }

  /**
   * Cleans empty or invalid records from the database
   */
  async cleanInvalidRecords(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete records with empty or null JSON
      const { data, error } = await supabase
        .from('garmin_raw_data')
        .delete()
        .eq('user_id', user.id)
        .or('raw_json.is.null,raw_json.eq.{}')
        .select('id');

      if (error) throw error;

      const deletedCount = data?.length || 0;
      console.log(`✅ Cleaned ${deletedCount} invalid records`);
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning invalid records:', error);
      throw error;
    }
  }

  /**
   * Initiates a bulk sync with Garmin Connect
   */
  async bulkSync(weeksPast: number = 4): Promise<GarminSyncResult> {
    try {
      const { data, error } = await supabase.functions.invoke('garmin-bulk-sync', {
        body: { weeksPast }
      });

      if (error) throw error;

      return data as GarminSyncResult;
    } catch (error) {
      console.error('Error during bulk sync:', error);
      throw error;
    }
  }

  /**
   * Gets processed Garmin data for a specific date
   */
  async getDataForDate(date: string): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: rawData, error } = await supabase
        .from('garmin_raw_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('data_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return this.processRawDataArray(rawData || []);
    } catch (error) {
      console.error('Error getting data for date:', error);
      throw error;
    }
  }

  /**
   * Gets available data dates
   */
  async getAvailableDataDates(): Promise<string[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('garmin_raw_data')
        .select('data_date')
        .eq('user_id', user.id)
        .order('data_date', { ascending: false });

      if (error) throw error;

      // Return unique dates
      const dates = [...new Set(data?.map(item => item.data_date) || [])];
      return dates;
    } catch (error) {
      console.error('Error getting available dates:', error);
      throw error;
    }
  }

  /**
   * Processes raw Garmin data array into structured format
   */
  private processRawDataArray(rawDataArray: any[]): any {
    if (!rawDataArray || rawDataArray.length === 0) {
      return null;
    }

    const processedData: any = {
      date: rawDataArray[0]?.data_date || null,
      lastSync: new Date().toISOString()
    };

    rawDataArray.forEach((item) => {
      if (!item.raw_json || Object.keys(item.raw_json).length === 0) {
        return; // Skip empty data
      }

      switch (item.data_type) {
        case 'hrv':
          processedData.hrv = this.processHRVData(item.raw_json);
          break;
        case 'sleep':
          processedData.sleep = this.processSleepData(item.raw_json);
          break;
        case 'body_battery':
          processedData.bodyBattery = this.processBodyBatteryData(item.raw_json);
          break;
        case 'steps':
          processedData.activity = this.processActivityData(item.raw_json);
          break;
        case 'stress':
          processedData.stress = this.processStressData(item.raw_json);
          break;
      }
    });

    return processedData;
  }

  private processHRVData(data: any): any {
    if (!data?.wellnessData || !Array.isArray(data.wellnessData) || data.wellnessData.length === 0) {
      return null;
    }

    const hrvData = data.wellnessData[0];
    return {
      value: hrvData.lastNightAvg || null,
      status: this.mapHRVStatus(hrvData.status),
      timestamp: hrvData.timestamp || null
    };
  }

  private processSleepData(data: any): any {
    if (!data?.dailySleepDTO) {
      return null;
    }

    const sleepData = data.dailySleepDTO;
    return {
      score: sleepData.sleepScore || null,
      quality: this.mapSleepQuality(sleepData.sleepScore),
      totalSleep: sleepData.sleepTimeSeconds || null,
      deepSleep: sleepData.deepSleepSeconds || null,
      lightSleep: sleepData.lightSleepSeconds || null,
      remSleep: sleepData.remSleepSeconds || null,
      awakeTime: sleepData.awakeTimeSeconds || null
    };
  }

  private processBodyBatteryData(data: any): any {
    if (!data?.wellnessData || !Array.isArray(data.wellnessData) || data.wellnessData.length === 0) {
      return null;
    }

    const batteryData = data.wellnessData[0];
    return {
      current: batteryData.value || null,
      charged: batteryData.charged || null,
      drained: batteryData.drained || null
    };
  }

  private processActivityData(data: any): any {
    if (!data) {
      return null;
    }

    return {
      steps: data.totalSteps || data.steps || null,
      distance: data.totalDistance || null,
      activeTime: data.activeTime || null,
      calories: data.totalCalories || null
    };
  }

  private processStressData(data: any): any {
    if (!data?.wellnessData || !Array.isArray(data.wellnessData) || data.wellnessData.length === 0) {
      return null;
    }

    const stressData = data.wellnessData[0];
    return {
      average: stressData.value || null,
      max: stressData.max || null,
      restTime: stressData.restTime || null
    };
  }

  private mapHRVStatus(status: string | undefined): 'balanced' | 'unbalanced' | 'low' {
    if (!status) return 'low';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('balanced')) return 'balanced';
    if (statusLower.includes('unbalanced')) return 'unbalanced';
    return 'low';
  }

  private mapSleepQuality(score: number | undefined): 'excellent' | 'good' | 'fair' | 'poor' {
    if (!score) return 'poor';
    
    if (score >= 80) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }
}

// Export singleton instance
export const garminDataService = new GarminDataService();