import { supabase } from "@/integrations/supabase/client";
import { GarminData } from "@/types/gaf";

export class GarminAPIService {
  private userId: string | null = null;
  private email: string | null = null;
  private password: string | null = null;
  private baseUrl = "https://connect.garmin.com/modern/proxy/";

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    this.userId = user.id;
    
    // Try to get credentials from user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('garmin_credentials_encrypted')
      .eq('id', user.id)
      .single();
      
    if (profile?.garmin_credentials_encrypted) {
      // For now, assume credentials are stored as JSON (in production, these should be encrypted)
      try {
        const credentials = JSON.parse(profile.garmin_credentials_encrypted);
        this.email = credentials.email;
        this.password = credentials.password;
      } catch (error) {
        console.error('Failed to parse Garmin credentials:', error);
      }
    }
  }

  async authenticate(): Promise<boolean> {
    if (!this.email || !this.password) {
      throw new Error('Garmin credentials not configured');
    }

    try {
      // This is a simplified authentication flow
      // In production, you would implement proper session management
      const response = await fetch('https://connect.garmin.com/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: this.email,
          password: this.password,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Garmin authentication failed:', error);
      return false;
    }
  }

  async getHRVData(date: string): Promise<any> {
    if (!this.userId) await this.initialize();
    
    const endpoint = `/userstats-service/wellness/${this.userId}?fromDate=${date}&untilDate=${date}`;
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HRV data fetch failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('HRV data fetch error:', error);
      throw error;
    }
  }

  async getDailyStats(date: string): Promise<any> {
    if (!this.userId) await this.initialize();
    
    const endpoint = `/usersummary-service/usersummary/daily/${this.userId}?calendarDate=${date}`;
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Daily stats fetch failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Daily stats fetch error:', error);
      throw error;
    }
  }

  async getHeartRateData(date: string): Promise<any> {
    if (!this.userId) await this.initialize();
    
    const endpoint = `/wellness-service/wellness/dailyHeartRate/${this.userId}?date=${date}`;
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Heart rate data fetch failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Heart rate data fetch error:', error);
      throw error;
    }
  }

  async getBodyBattery(startDate: string, endDate: string): Promise<any> {
    if (!this.userId) await this.initialize();
    
    const endpoint = `/usersummary-service/usersummary/hydration/allData/${this.userId}?startDate=${startDate}&endDate=${endDate}`;
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Body battery data fetch failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Body battery data fetch error:', error);
      throw error;
    }
  }

  async getSleepData(date: string): Promise<any> {
    if (!this.userId) await this.initialize();
    
    const endpoint = `/wellness-service/wellness/dailySleep/${this.userId}?date=${date}`;
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Sleep data fetch failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Sleep data fetch error:', error);
      throw error;
    }
  }

  async syncAllData(date: string): Promise<GarminData> {
    try {
      const isAuthenticated = await this.authenticate();
      if (!isAuthenticated) {
        throw new Error('Failed to authenticate with Garmin');
      }

      const [hrv, dailyStats, heartRate, bodyBattery, sleep] = await Promise.all([
        this.getHRVData(date).catch(() => null),
        this.getDailyStats(date).catch(() => null),
        this.getHeartRateData(date).catch(() => null),
        this.getBodyBattery(date, date).catch(() => null),
        this.getSleepData(date).catch(() => null)
      ]);

      // Map the raw Garmin data to our GarminData interface
      const garminData: GarminData = {
        hrv: {
          score: hrv?.lastNightAvg || 35,
          sevenDayAvg: hrv?.sevenDayAvg || 35,
          status: this.mapHRVStatus(hrv?.status),
          lastNight: hrv?.lastNight || 35
        },
        bodyBattery: {
          start: bodyBattery?.start || 85,
          end: bodyBattery?.end || 30,
          min: bodyBattery?.min || 20,
          max: bodyBattery?.max || 95,
          charged: bodyBattery?.charged || 70,
          drained: bodyBattery?.drained || 65
        },
        sleep: {
          duration: sleep?.duration || 480,
          deepSleep: sleep?.deepSleep || 90,
          lightSleep: sleep?.lightSleep || 300,
          remSleep: sleep?.remSleep || 90,
          awake: sleep?.awake || 20,
          quality: this.mapSleepQuality(sleep?.sleepScores?.overall)
        },
        stress: {
          avg: dailyStats?.stressLevel || 25,
          max: dailyStats?.maxStress || 60,
          restingPeriods: dailyStats?.restingStressMinutes || 300
        },
        activities: dailyStats?.activities || [],
        steps: dailyStats?.steps || 0,
        calories: dailyStats?.calories || 0,
        activeMinutes: dailyStats?.activeMinutes || 0
      };

      // Store raw data in database
      await this.storeRawData('combined', date, {
        hrv, dailyStats, heartRate, bodyBattery, sleep
      });

      // Update user profile sync timestamp
      await supabase
        .from('user_profiles')
        .update({ 
          garmin_last_sync: new Date().toISOString(),
          garmin_connected: true 
        })
        .eq('id', this.userId);

      return garminData;
    } catch (error) {
      console.error('Garmin sync failed:', error);
      
      // Log the sync error
      await supabase
        .from('garmin_sync_logs')
        .insert({
          user_id: this.userId,
          sync_type: 'full_sync',
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          sync_timestamp: new Date().toISOString()
        });
      
      throw error;
    }
  }

  private async storeRawData(dataType: string, date: string, rawData: any) {
    if (!this.userId) return;

    await supabase
      .from('garmin_raw_data')
      .insert({
        user_id: this.userId,
        data_type: dataType,
        data_date: date,
        raw_json: rawData,
        processed: false
      });
  }

  private mapHRVStatus(status: string | undefined): 'balanced' | 'unbalanced' | 'low' {
    if (!status) return 'balanced';
    
    switch (status.toLowerCase()) {
      case 'balanced':
      case 'optimal':
      case 'good':
        return 'balanced';
      case 'unbalanced':
      case 'poor':
        return 'unbalanced';
      case 'low':
      case 'critical':
        return 'low';
      default:
        return 'balanced';
    }
  }

  private mapSleepQuality(score: number | undefined): 'excellent' | 'good' | 'fair' | 'poor' {
    if (!score) return 'fair';
    
    if (score >= 80) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }
}

export const garminService = new GarminAPIService();