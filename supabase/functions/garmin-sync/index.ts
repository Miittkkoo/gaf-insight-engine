import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Improved Garmin Connect Client based on garth library principles
class GarminConnectClient {
  private email: string
  private password: string
  private cookies = new Map<string, string>()

  constructor(email: string, password: string) {
    this.email = email
    this.password = password
  }

  private updateCookies(response: Response) {
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      const cookies = setCookieHeader.split(',')
      for (const cookie of cookies) {
        const [nameValue] = cookie.split(';')
        const [name, value] = nameValue.split('=')
        if (name && value) {
          this.cookies.set(name.trim(), value.trim())
        }
      }
    }
  }

  private getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }

  async authenticate(): Promise<void> {
    console.log('🔐 Authenticating with Garmin Connect using improved method...')

    try {
      // Step 1: Get CSRF token and session
      const loginPageResponse = await fetch('https://sso.garmin.com/sso/signin', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })

      if (!loginPageResponse.ok) {
        throw new Error(`Failed to get login page: ${loginPageResponse.status}`)
      }

      this.updateCookies(loginPageResponse)
      const loginPageHtml = await loginPageResponse.text()
      
      // Extract CSRF token
      const csrfMatch = loginPageHtml.match(/"_csrf":\s*"([^"]+)"/) || loginPageHtml.match(/name="_csrf"\s+value="([^"]+)"/)
      if (!csrfMatch) {
        throw new Error('Could not find CSRF token')
      }
      const csrfToken = csrfMatch[1]
      console.log('✅ Got login page and CSRF token')

      // Step 2: Submit login form
      const loginData = new URLSearchParams({
        'username': this.email,
        'password': this.password,
        '_csrf': csrfToken,
        'embed': 'false',
        'rememberme': 'on'
      })

      const loginResponse = await fetch('https://sso.garmin.com/sso/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://sso.garmin.com/sso/signin',
          'Cookie': this.getCookieHeader()
        },
        body: loginData.toString(),
        redirect: 'manual'
      })

      this.updateCookies(loginResponse)

      // Check for successful authentication
      if (loginResponse.status === 302 || loginResponse.status === 200) {
        const location = loginResponse.headers.get('location')
        if (location && location.includes('ticket')) {
          console.log('✅ Authentication successful, processing ticket...')
          
          // Follow the redirect to complete authentication
          const ticketResponse = await fetch(location, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Cookie': this.getCookieHeader()
            },
            redirect: 'manual'
          })
          
          this.updateCookies(ticketResponse)
          console.log('✅ Ticket processed, authentication complete')
          return
        }
      }

      // Check response content for error indicators
      const responseText = await loginResponse.text()
      if (responseText.includes('Invalid username or password') || 
          responseText.includes('error') || 
          responseText.includes('incorrect')) {
        throw new Error('Invalid username or password')
      }

      throw new Error(`Authentication failed with status: ${loginResponse.status}`)

    } catch (error) {
      console.error('❌ Authentication failed:', error)
      throw error
    }
  }

  async getHRVData(date: string): Promise<any> {
    const response = await fetch(`https://connect.garmin.com/modern/proxy/usersummary-service/usersummary/daily/${date}`, {
      headers: {
        'Cookie': this.getCookieHeader(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch HRV data: ${response.status}`)
    }

    return await response.json()
  }

  async getSleepData(date: string): Promise<any> {
    const response = await fetch(`https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailySleepData/${date}`, {
      headers: {
        'Cookie': this.getCookieHeader(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sleep data: ${response.status}`)
    }

    return await response.json()
  }

  async getBodyBatteryData(date: string): Promise<any> {
    const response = await fetch(`https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailyBodyBattery/${date}`, {
      headers: {
        'Cookie': this.getCookieHeader(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch body battery data: ${response.status}`)
    }

    return await response.json()
  }

  async getStepsData(date: string): Promise<any> {
    const response = await fetch(`https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailySummaryChart/${date}`, {
      headers: {
        'Cookie': this.getCookieHeader(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch steps data: ${response.status}`)
    }

    return await response.json()
  }

  async getStressData(date: string): Promise<any> {
    const response = await fetch(`https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailyStress/${date}`, {
      headers: {
        'Cookie': this.getCookieHeader(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch stress data: ${response.status}`)
    }

    return await response.json()
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { date } = await req.json()
    
    if (!date) {
      return new Response(
        JSON.stringify({ error: 'Date parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Decode JWT to get user ID
    const jwt = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    const userId = payload.sub

    console.log(`🚀 Starting Garmin sync for user ${userId} on date ${date}`)

    // Get user's Garmin credentials
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('garmin_credentials_encrypted')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.garmin_credentials_encrypted) {
      console.log('❌ No Garmin credentials found for user:', userId)
      return new Response(
        JSON.stringify({ error: 'Garmin credentials not found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let garminEmail: string
    let garminPassword: string

    try {
      const credentials = JSON.parse(profile.garmin_credentials_encrypted)
      garminEmail = credentials.email
      garminPassword = credentials.password
      console.log('📱 Using user-specific Garmin credentials for:', garminEmail)
      console.log('📱 Password length:', garminPassword?.length || 0)
    } catch (e) {
      console.log('❌ Error parsing Garmin credentials:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid Garmin credentials format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Garmin client and authenticate
    const garminClient = new GarminConnectClient(garminEmail, garminPassword)
    
    try {
      await garminClient.authenticate()
      console.log('✅ Garmin authentication successful')
    } catch (authError) {
      console.error('❌ Garmin authentication failed:', authError)
      
      // Log failed sync
      await supabase
        .from('garmin_sync_logs')
        .insert({
          user_id: userId,
          sync_type: 'manual',
          status: 'failed',
          error_message: `Authentication failed: ${authError.message}`,
          sync_timestamp: new Date().toISOString()
        })

      return new Response(
        JSON.stringify({ 
          error: 'Garmin authentication failed', 
          details: authError.message 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch data in parallel
    const syncStartTime = Date.now()
    let dataPointsSynced = 0
    const syncedData: any = {}

    try {
      console.log(`📊 Fetching Garmin data for ${date}...`)
      
      const [hrvData, sleepData, bodyBatteryData, stepsData, stressData] = await Promise.allSettled([
        garminClient.getHRVData(date),
        garminClient.getSleepData(date),
        garminClient.getBodyBatteryData(date),
        garminClient.getStepsData(date),
        garminClient.getStressData(date)
      ])

      // Process HRV data
      if (hrvData.status === 'fulfilled' && hrvData.value) {
        console.log('✅ HRV data fetched successfully')
        syncedData.hrv = hrvData.value
        dataPointsSynced++
        
        // Store raw data
        await supabase
          .from('garmin_raw_data')
          .upsert({
            user_id: userId,
            data_date: date,
            data_type: 'hrv',
            raw_json: hrvData.value,
            processed: false
          })
      }

      // Process Sleep data
      if (sleepData.status === 'fulfilled' && sleepData.value) {
        console.log('✅ Sleep data fetched successfully')
        syncedData.sleep = sleepData.value
        dataPointsSynced++
        
        await supabase
          .from('garmin_raw_data')
          .upsert({
            user_id: userId,
            data_date: date,
            data_type: 'sleep',
            raw_json: sleepData.value,
            processed: false
          })
      }

      // Process Body Battery data
      if (bodyBatteryData.status === 'fulfilled' && bodyBatteryData.value) {
        console.log('✅ Body Battery data fetched successfully')
        syncedData.bodyBattery = bodyBatteryData.value
        dataPointsSynced++
        
        await supabase
          .from('garmin_raw_data')
          .upsert({
            user_id: userId,
            data_date: date,
            data_type: 'body_battery',
            raw_json: bodyBatteryData.value,
            processed: false
          })
      }

      // Process Steps data
      if (stepsData.status === 'fulfilled' && stepsData.value) {
        console.log('✅ Steps data fetched successfully')
        syncedData.steps = stepsData.value
        dataPointsSynced++
        
        await supabase
          .from('garmin_raw_data')
          .upsert({
            user_id: userId,
            data_date: date,
            data_type: 'steps',
            raw_json: stepsData.value,
            processed: false
          })
      }

      // Process Stress data
      if (stressData.status === 'fulfilled' && stressData.value) {
        console.log('✅ Stress data fetched successfully')
        syncedData.stress = stressData.value
        dataPointsSynced++
        
        await supabase
          .from('garmin_raw_data')
          .upsert({
            user_id: userId,
            data_date: date,
            data_type: 'stress',
            raw_json: stressData.value,
            processed: false
          })
      }

      const syncDuration = Date.now() - syncStartTime

      // Update user profile with last sync time
      await supabase
        .from('user_profiles')
        .update({
          garmin_last_sync: new Date().toISOString(),
          garmin_connected: true
        })
        .eq('id', userId)

      // Log successful sync
      await supabase
        .from('garmin_sync_logs')
        .insert({
          user_id: userId,
          sync_type: 'manual',
          status: 'success',
          data_points_synced: dataPointsSynced,
          sync_duration_ms: syncDuration,
          sync_timestamp: new Date().toISOString()
        })

      console.log(`✅ Sync completed successfully. ${dataPointsSynced} data points synced in ${syncDuration}ms`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: syncedData,
          dataPointsSynced,
          syncDuration: syncDuration
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (dataError) {
      console.error('❌ Error fetching Garmin data:', dataError)
      
      const syncDuration = Date.now() - syncStartTime
      
      // Log failed sync
      await supabase
        .from('garmin_sync_logs')
        .insert({
          user_id: userId,
          sync_type: 'manual',
          status: 'failed',
          error_message: `Data fetch failed: ${dataError.message}`,
          sync_duration_ms: syncDuration,
          sync_timestamp: new Date().toISOString()
        })

      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Garmin data', 
          details: dataError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})