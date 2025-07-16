import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchRealGarminData(date: string, dataType: string, userId: string): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get user's Garmin credentials
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('garmin_credentials_encrypted')
    .eq('id', userId)
    .single();

  if (!profile?.garmin_credentials_encrypted) {
    throw new Error('Garmin credentials not found');
  }

  const credentials = JSON.parse(profile.garmin_credentials_encrypted);
  
  try {
    // Make actual Garmin Connect API calls
    const garminService = new GarminConnectService();
    await garminService.authenticate(credentials.email, credentials.password);
    
    let data;
    switch (dataType) {
      case 'hrv':
        data = await garminService.getHRVData(date);
        break;
      case 'sleep':
        data = await garminService.getSleepData(date);
        break;
      case 'body_battery':
        data = await garminService.getBodyBatteryData(date);
        break;
      case 'steps':
        data = await garminService.getDailyStats(date);
        break;
      case 'stress':
        data = await garminService.getStressData(date);
        break;
      default:
        return null;
    }
    
    console.log(`📊 Fetched real ${dataType} data for ${date}:`, data ? 'success' : 'no data');
    return data;
  } catch (error) {
    console.error(`❌ Failed to fetch real ${dataType} data for ${date}:`, error);
    throw error;
  }
}

// Simplified Garmin Connect API service
class GarminConnectService {
  private sessionCookies: string = '';
  
  async authenticate(email: string, password: string): Promise<void> {
    try {
      // Step 1: Get initial cookies and CSRF token
      const initialResponse = await fetch('https://sso.garmin.com/sso/signin', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      
      const setCookieHeader = initialResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        this.sessionCookies = setCookieHeader;
      }
      
      // Step 2: Login with credentials
      const loginResponse = await fetch('https://sso.garmin.com/sso/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': this.sessionCookies,
        },
        body: new URLSearchParams({
          username: email,
          password: password,
          embed: 'false',
          gauthHost: 'https://sso.garmin.com/sso'
        })
      });
      
      if (loginResponse.ok) {
        const finalCookies = loginResponse.headers.get('set-cookie');
        if (finalCookies) {
          this.sessionCookies += '; ' + finalCookies;
        }
        console.log('✅ Garmin authentication successful');
      } else {
        throw new Error(`Authentication failed: ${loginResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Garmin authentication error:', error);
      throw new Error('Failed to authenticate with Garmin Connect');
    }
  }
  
  async getHRVData(date: string): Promise<any> {
    if (!this.sessionCookies) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}?metricId=60`, {
        headers: {
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`HRV data for ${date}:`, data);
        return data;
      } else {
        console.error(`Failed to fetch HRV data: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching HRV data:', error);
      return null;
    }
  }
  
  async getSleepData(date: string): Promise<any> {
    if (!this.sessionCookies) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailySleepData/${date}`, {
        headers: {
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Sleep data for ${date}:`, data);
        return data;
      } else {
        console.error(`Failed to fetch sleep data: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      return null;
    }
  }
  
  async getBodyBatteryData(date: string): Promise<any> {
    if (!this.sessionCookies) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}?metricId=58`, {
        headers: {
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Body Battery data for ${date}:`, data);
        return data;
      } else {
        console.error(`Failed to fetch Body Battery data: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching Body Battery data:', error);
      return null;
    }
  }
  
  async getDailyStats(date: string): Promise<any> {
    if (!this.sessionCookies) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`https://connect.garmin.com/modern/proxy/userstats-service/stats/daily/${date}`, {
        headers: {
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Daily stats for ${date}:`, data);
        return data;
      } else {
        console.error(`Failed to fetch daily stats: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      return null;
    }
  }
  
  async getStressData(date: string): Promise<any> {
    if (!this.sessionCookies) throw new Error('Not authenticated');
    
    try {
      const response = await fetch(`https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}?metricId=57`, {
        headers: {
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Stress data for ${date}:`, data);
        return data;
      } else {
        console.error(`Failed to fetch stress data: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching stress data:', error);
      return null;
    }
  }
}

serve(async (req) => {
  console.log('🚀 Garmin Bulk Sync Function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { weeksPast = 4 } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Authorization header required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    let userId: string;
    
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub;
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Invalid authorization token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔄 Starting bulk sync for user ${userId}, last ${weeksPast} weeks`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeksPast * 7));

    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    const dataTypes = ['hrv', 'sleep', 'body_battery', 'steps', 'stress'];
    let totalDataPoints = 0;
    const errors: string[] = [];

    // Generate data for each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      console.log(`📊 Processing data for ${dateString}`);

      // Check if data already exists for this date
      const { data: existingData } = await supabase
        .from('garmin_raw_data')
        .select('data_type')
        .eq('user_id', userId)
        .eq('data_date', dateString);

      const existingTypes = existingData?.map(d => d.data_type) || [];

      // Fetch real Garmin data for missing types
      for (const dataType of dataTypes) {
        if (!existingTypes.includes(dataType)) {
          try {
            const realData = await fetchRealGarminData(dateString, dataType, userId);
            
            if (realData) {
              const { error: insertError } = await supabase
                .from('garmin_raw_data')
                .insert({
                  user_id: userId,
                  data_date: dateString,
                  data_type: dataType,
                  raw_json: realData,
                  processed: false
                });

              if (insertError) {
                errors.push(`${dateString}/${dataType}: ${insertError.message}`);
              } else {
                totalDataPoints++;
                console.log(`✅ Stored real ${dataType} data for ${dateString}`);
              }
            }
          } catch (error) {
            console.error(`❌ Failed to fetch ${dataType} for ${dateString}:`, error);
            errors.push(`${dateString}/${dataType}: ${error.message}`);
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Update user profile
    await supabase.from('user_profiles').update({
      garmin_last_sync: new Date().toISOString(),
      garmin_connected: true
    }).eq('id', userId);

    // Log sync
    await supabase.from('garmin_sync_logs').insert({
      user_id: userId,
      sync_type: 'bulk',
      status: errors.length > 0 ? 'partial_success' : 'success',
      data_points_synced: totalDataPoints,
      error_message: errors.length > 0 ? `${errors.length} errors occurred` : null,
      sync_timestamp: new Date().toISOString()
    });

    console.log(`✅ Bulk sync completed: ${totalDataPoints} data points, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      dataPointsSynced: totalDataPoints,
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      errors: errors,
      message: `Successfully synced ${totalDataPoints} data points${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Bulk sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});