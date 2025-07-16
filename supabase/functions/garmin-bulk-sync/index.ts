import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Real Garmin Connect API Integration
class GarminConnectAPI {
  private sessionCookies: string = '';
  private csrfToken: string = '';
  
  async authenticate(email: string, password: string): Promise<boolean> {
    try {
      console.log('🔐 Authenticating with Garmin Connect...');
      
      // Step 1: Get initial page and CSRF token
      const loginPageResponse = await fetch('https://sso.garmin.com/sso/signin', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!loginPageResponse.ok) {
        throw new Error(`Failed to load login page: ${loginPageResponse.status}`);
      }
      
      const loginPageContent = await loginPageResponse.text();
      
      // Extract CSRF token from page
      const csrfMatch = loginPageContent.match(/name="_csrf"\s+value="([^"]+)"/);
      if (csrfMatch) {
        this.csrfToken = csrfMatch[1];
        console.log('✅ CSRF token extracted');
      }
      
      // Store session cookies
      const setCookie = loginPageResponse.headers.get('set-cookie');
      if (setCookie) {
        this.sessionCookies = setCookie.split(',').map(c => c.split(';')[0]).join('; ');
      }
      
      // Step 2: Perform login
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Referer': 'https://sso.garmin.com/sso/signin'
        },
        body: loginData.toString()
      });
      
      console.log(`Login response status: ${loginResponse.status}`);
      
      if (loginResponse.ok || loginResponse.status === 302) {
        // Update cookies from login response
        const newCookies = loginResponse.headers.get('set-cookie');
        if (newCookies) {
          this.sessionCookies += '; ' + newCookies.split(',').map(c => c.split(';')[0]).join('; ');
        }
        
        console.log('✅ Authentication successful');
        return true;
      } else {
        const responseText = await loginResponse.text();
        console.error('❌ Authentication failed:', responseText.substring(0, 500));
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return false;
    }
  }
  
  async fetchGarminData(date: string, dataType: string): Promise<any> {
    if (!this.sessionCookies) {
      throw new Error('Not authenticated');
    }
    
    const dateStr = date.replace(/-/g, '');
    let endpoint = '';
    
    switch (dataType) {
      case 'hrv':
        endpoint = `https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}?metricId=60`;
        break;
      case 'sleep':
        endpoint = `https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailySleepData/${date}`;
        break;
      case 'body_battery':
        endpoint = `https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}?metricId=58`;
        break;
      case 'steps':
        endpoint = `https://connect.garmin.com/modern/proxy/userstats-service/stats/daily/${date}`;
        break;
      case 'stress':
        endpoint = `https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}?metricId=57`;
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
    
    console.log(`📡 Fetching real ${dataType} data from: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://connect.garmin.com/modern/',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Successfully fetched real ${dataType} data:`, data ? 'Data available' : 'No data');
        return data;
      } else if (response.status === 204) {
        console.log(`ℹ️ No ${dataType} data available for ${date}`);
        return null;
      } else {
        console.error(`❌ Failed to fetch ${dataType} data: HTTP ${response.status}`);
        const errorText = await response.text();
        console.error('Error response:', errorText.substring(0, 500));
        return null;
      }
    } catch (error) {
      console.error(`❌ Network error fetching ${dataType}:`, error);
      return null;
    }
  }
}

serve(async (req) => {
  console.log('🚀 Garmin Real Data Sync Function called');
  
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

    console.log(`🔄 Starting REAL data sync for user ${userId}, last ${weeksPast} weeks`);

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

    // Initialize Garmin API client
    const garminAPI = new GarminConnectAPI();
    
    // Authenticate with real Garmin credentials
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

    console.log(`📅 Fetching REAL data for range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Clear existing data first
    const { error: deleteError } = await supabase
      .from('garmin_raw_data')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.warn('Could not clear existing data:', deleteError.message);
    } else {
      console.log('✅ Cleared existing data');
    }

    const dataTypes = ['hrv', 'sleep', 'body_battery', 'steps', 'stress'];
    let totalDataPoints = 0;
    const errors: string[] = [];

    // Fetch REAL data for each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      console.log(`📊 Fetching REAL Garmin data for ${dateString}`);

      // Fetch real data for all types for this date
      for (const dataType of dataTypes) {
        try {
          const realData = await garminAPI.fetchGarminData(dateString, dataType);
          
          // Only store if we have actual data
          if (realData && Object.keys(realData).length > 0) {
            console.log(`📝 Storing ${dataType} data for ${dateString}:`, JSON.stringify(realData).substring(0, 200));
            
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
              console.error(`❌ Failed to store ${dataType} for ${dateString}:`, insertError.message);
            } else {
              totalDataPoints++;
              console.log(`✅ Stored REAL ${dataType} data for ${dateString}`);
            }
          } else {
            console.log(`⚠️ No meaningful ${dataType} data for ${dateString} - skipping storage`);
          }
        } catch (error) {
          console.error(`❌ Failed to fetch REAL ${dataType} for ${dateString}:`, error);
          errors.push(`${dateString}/${dataType}: ${error.message}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
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
      sync_type: 'bulk_real_data',
      status: errors.length > 0 ? 'partial_success' : 'success',
      data_points_synced: totalDataPoints,
      error_message: errors.length > 0 ? `${errors.length} errors occurred` : null,
      sync_timestamp: new Date().toISOString()
    });

    console.log(`✅ REAL data sync completed: ${totalDataPoints} data points, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      dataPointsSynced: totalDataPoints,
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      errors: errors,
      message: `Successfully synced ${totalDataPoints} REAL Garmin data points${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      dataSource: 'REAL_GARMIN_CONNECT_API'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Real data sync error:', error);
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