import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GarminDataResponse {
  success: boolean;
  data: any;
  isEmpty: boolean;
  error?: string;
}

// Comprehensive Garmin Connect API Integration
class GarminConnectAPI {
  private sessionCookies: string = '';
  private csrfToken: string = '';
  private isAuthenticated: boolean = false;
  
  async authenticate(email: string, password: string): Promise<boolean> {
    try {
      console.log('🔐 Starting Garmin Connect authentication...');
      
      // Reset state
      this.sessionCookies = '';
      this.csrfToken = '';
      this.isAuthenticated = false;
      
      // Step 1: Get login page and extract CSRF token
      const loginPageResponse = await fetch('https://sso.garmin.com/sso/signin', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!loginPageResponse.ok) {
        throw new Error(`Login page request failed: ${loginPageResponse.status}`);
      }
      
      const loginPageContent = await loginPageResponse.text();
      
      // Extract CSRF token
      const csrfMatch = loginPageContent.match(/name="_csrf"\s+value="([^"]+)"/);
      if (csrfMatch) {
        this.csrfToken = csrfMatch[1];
        console.log('✅ CSRF token extracted successfully');
      } else {
        throw new Error('Could not extract CSRF token from login page');
      }
      
      // Store initial cookies
      const setCookie = loginPageResponse.headers.get('set-cookie');
      if (setCookie) {
        this.sessionCookies = setCookie.split(',').map(c => c.split(';')[0]).join('; ');
      }
      
      // Step 2: Perform authentication
      const loginData = new URLSearchParams({
        username: email,
        password: password,
        embed: 'false',
        gauthHost: 'https://sso.garmin.com/sso',
        service: 'https://connect.garmin.com/modern',
        clientId: 'GarminConnect',
        consumeServiceTicket: 'false',
        createAccountShown: 'true',
        cssUrl: 'https://static.garmincdn.com/com.garmin.connect/ui/css/gauth-custom-v1.2-min.css',
        displayNameShown: 'false',
        embedSsoLogin: 'true',
        generateExtraServiceTicket: 'true',
        generateTwoExtraServiceTickets: 'false',
        generateNoServiceTicket: 'false',
        globalOptInShown: 'true',
        id: 'gauth-widget',
        inheritScriptSrc: 'true',
        locale: 'en_US',
        locationPromptShown: 'true',
        mfaRequired: 'false',
        mfaShown: 'false',
        openCreateAccount: 'false',
        privacyStatementShown: 'false',
        redirectAfterAccountCreationUrl: 'https://connect.garmin.com/modern',
        redirectAfterAccountLoginUrl: 'https://connect.garmin.com/modern',
        rememberMeShown: 'false',
        rememberMyBrowserShown: 'false',
        showTermsOfUse: 'false',
        showPrivacyPolicy: 'false',
        showConnectLegalAge: 'false',
        webhost: 'https://connect.garmin.com',
        _csrf: this.csrfToken
      });
      
      const loginResponse = await fetch('https://sso.garmin.com/sso/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Referer': 'https://sso.garmin.com/sso/signin',
          'Origin': 'https://sso.garmin.com'
        },
        body: loginData.toString()
      });
      
      console.log(`Login response status: ${loginResponse.status}`);
      
      // Update cookies from login response
      const newCookies = loginResponse.headers.get('set-cookie');
      if (newCookies) {
        this.sessionCookies += '; ' + newCookies.split(',').map(c => c.split(';')[0]).join('; ');
      }
      
      if (loginResponse.ok || loginResponse.status === 302) {
        this.isAuthenticated = true;
        console.log('✅ Garmin Connect authentication successful');
        return true;
      } else {
        const responseText = await loginResponse.text();
        console.error('❌ Authentication failed:', responseText.substring(0, 500));
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      this.isAuthenticated = false;
      return false;
    }
  }
  
  private getEndpoint(dataType: string, date: string): string {
    const endpoints = {
      'hrv': `https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}?metricId=60`,
      'sleep': `https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailySleepData/${date}`,
      'body_battery': `https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}?metricId=58`,
      'steps': `https://connect.garmin.com/modern/proxy/userstats-service/stats/daily/${date}`,
      'stress': `https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}?metricId=57`
    };
    
    if (!endpoints[dataType as keyof typeof endpoints]) {
      throw new Error(`Unknown data type: ${dataType}`);
    }
    
    return endpoints[dataType as keyof typeof endpoints];
  }
  
  private validateDataMeaningfulness(data: any, dataType: string): boolean {
    if (!data || data === null || data === undefined) {
      return false;
    }
    
    // Check for empty objects or arrays
    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.length > 0;
      } else {
        const keys = Object.keys(data);
        if (keys.length === 0) {
          return false;
        }
        
        // Data type specific validation
        switch (dataType) {
          case 'hrv':
            return data.wellnessData && Array.isArray(data.wellnessData) && data.wellnessData.length > 0;
          case 'sleep':
            return data.dailySleepDTO && typeof data.dailySleepDTO === 'object';
          case 'body_battery':
            return data.wellnessData && Array.isArray(data.wellnessData) && data.wellnessData.length > 0;
          case 'steps':
            return data.totalSteps !== undefined || data.steps !== undefined;
          case 'stress':
            return data.wellnessData && Array.isArray(data.wellnessData) && data.wellnessData.length > 0;
          default:
            return keys.length > 0;
        }
      }
    }
    
    return true;
  }
  
  async fetchData(date: string, dataType: string): Promise<GarminDataResponse> {
    if (!this.isAuthenticated) {
      return {
        success: false,
        data: null,
        isEmpty: true,
        error: 'Not authenticated'
      };
    }
    
    try {
      const endpoint = this.getEndpoint(dataType, date);
      console.log(`📡 Fetching ${dataType} data from: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://connect.garmin.com/modern/',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (response.status === 204) {
        console.log(`ℹ️ No ${dataType} data available for ${date} (204 No Content)`);
        return {
          success: true,
          data: null,
          isEmpty: true
        };
      }
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch ${dataType} data: HTTP ${response.status}`);
        return {
          success: false,
          data: null,
          isEmpty: true,
          error: `HTTP ${response.status}`
        };
      }
      
      const data = await response.json();
      const isMeaningful = this.validateDataMeaningfulness(data, dataType);
      
      console.log(`✅ ${dataType} data received, meaningful: ${isMeaningful}`);
      
      if (isMeaningful) {
        console.log(`📊 Valid ${dataType} data structure:`, JSON.stringify(data).substring(0, 200) + '...');
      }
      
      return {
        success: true,
        data: isMeaningful ? data : null,
        isEmpty: !isMeaningful
      };
      
    } catch (error) {
      console.error(`❌ Network error fetching ${dataType}:`, error);
      return {
        success: false,
        data: null,
        isEmpty: true,
        error: error.message
      };
    }
  }
}

serve(async (req) => {
  console.log('🚀 Enhanced Garmin Data Sync Function started');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { weeksPast = 4 } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract and validate user from JWT
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

    console.log(`🔄 Starting enhanced sync for user ${userId}, last ${weeksPast} weeks`);

    // Get user's Garmin credentials
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('garmin_credentials_encrypted')
      .eq('id', userId)
      .single();

    if (!profile?.garmin_credentials_encrypted) {
      return new Response(JSON.stringify({
        error: 'Garmin credentials not found. Please configure your Garmin Connect login first.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let credentials;
    try {
      credentials = JSON.parse(profile.garmin_credentials_encrypted);
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Invalid Garmin credentials format'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize enhanced Garmin API client
    const garminAPI = new GarminConnectAPI();
    
    // Authenticate
    const authSuccess = await garminAPI.authenticate(credentials.email, credentials.password);
    if (!authSuccess) {
      return new Response(JSON.stringify({
        error: 'Failed to authenticate with Garmin Connect. Please check your credentials.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeksPast * 7));

    console.log(`📅 Sync range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Clear existing data first
    const { error: deleteError } = await supabase
      .from('garmin_raw_data')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.warn('Could not clear existing data:', deleteError.message);
    } else {
      console.log('✅ Cleared existing Garmin data');
    }

    const dataTypes = ['hrv', 'sleep', 'body_battery', 'steps', 'stress'];
    let totalDataPoints = 0;
    let totalEmptyResponses = 0;
    const errors: string[] = [];
    const syncResults: Record<string, any> = {};

    // Fetch data for each day
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      console.log(`📊 Processing data for ${dateString}`);

      for (const dataType of dataTypes) {
        try {
          const result = await garminAPI.fetchData(dateString, dataType);
          
          if (!result.success) {
            errors.push(`${dateString}/${dataType}: ${result.error || 'Unknown error'}`);
            continue;
          }
          
          if (result.isEmpty) {
            totalEmptyResponses++;
            console.log(`⚪ No meaningful ${dataType} data for ${dateString}`);
            continue;
          }
          
          // Store meaningful data
          const { error: insertError } = await supabase
            .from('garmin_raw_data')
            .insert({
              user_id: userId,
              data_date: dateString,
              data_type: dataType,
              raw_json: result.data,
              processed: false
            });

          if (insertError) {
            errors.push(`${dateString}/${dataType}: ${insertError.message}`);
            console.error(`❌ Failed to store ${dataType} for ${dateString}:`, insertError.message);
          } else {
            totalDataPoints++;
            console.log(`✅ Stored ${dataType} data for ${dateString}`);
          }
        } catch (error) {
          console.error(`❌ Error processing ${dataType} for ${dateString}:`, error);
          errors.push(`${dateString}/${dataType}: ${error.message}`);
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Update user profile
    await supabase.from('user_profiles').update({
      garmin_last_sync: new Date().toISOString(),
      garmin_connected: true
    }).eq('id', userId);

    // Log sync operation
    await supabase.from('garmin_sync_logs').insert({
      user_id: userId,
      sync_type: 'enhanced_bulk_sync',
      status: errors.length > 0 ? 'partial_success' : 'success',
      data_points_synced: totalDataPoints,
      error_message: errors.length > 0 ? `${errors.length} errors occurred` : null,
      sync_timestamp: new Date().toISOString()
    });

    console.log(`✅ Enhanced sync completed: ${totalDataPoints} data points stored, ${totalEmptyResponses} empty responses, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      dataPointsSynced: totalDataPoints,
      emptyResponses: totalEmptyResponses,
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      errors: errors,
      message: `Successfully synced ${totalDataPoints} meaningful Garmin data points${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      dataSource: 'ENHANCED_GARMIN_CONNECT_API'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Enhanced sync error:', error);
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