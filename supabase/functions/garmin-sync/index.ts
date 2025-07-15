import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Echte Garmin Connect Client Implementation
class GarminConnectClient {
  private email: string
  private password: string
  private cookies = new Map<string, string>()
  private authenticated = false

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
    console.log('🔐 Starting Garmin Connect authentication...')

    try {
      // Step 1: Get login page and CSRF token
      console.log('Step 1: Getting login page...')
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
      const csrfMatch = loginPageHtml.match(/"_csrf":\s*"([^"]+)"/) || 
                       loginPageHtml.match(/name="_csrf"\s+value="([^"]+)"/) ||
                       loginPageHtml.match(/'_csrf':\s*'([^']+)'/)
      
      if (!csrfMatch) {
        console.error('Login page HTML snippet:', loginPageHtml.substring(0, 500))
        throw new Error('Could not find CSRF token in login page')
      }
      
      const csrfToken = csrfMatch[1]
      console.log('✅ Got CSRF token:', csrfToken.substring(0, 10) + '...')

      // Step 2: Submit login credentials
      console.log('Step 2: Submitting login credentials...')
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
      console.log('Login response status:', loginResponse.status)

      // Step 3: Handle authentication response
      if (loginResponse.status === 302) {
        const location = loginResponse.headers.get('location')
        console.log('Redirect location:', location)
        
        if (location && location.includes('ticket')) {
          console.log('Step 3: Processing authentication ticket...')
          
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
          console.log('✅ Authentication ticket processed')
          this.authenticated = true
          return
        }
      }

      // Check for authentication errors
      const responseText = await loginResponse.text()
      if (responseText.includes('Invalid username or password') || 
          responseText.includes('error') || 
          responseText.includes('incorrect')) {
        throw new Error('Invalid username or password')
      }

      // If we get here without a ticket redirect, try a different approach
      if (loginResponse.status === 200) {
        console.log('✅ Authentication appears successful (status 200)')
        this.authenticated = true
        return
      }

      throw new Error(`Authentication failed with status: ${loginResponse.status}`)

    } catch (error) {
      console.error('❌ Authentication failed:', error)
      this.authenticated = false
      throw error
    }
  }

  private async makeAuthenticatedRequest(url: string): Promise<any> {
    if (!this.authenticated) {
      throw new Error('Client not authenticated')
    }

    const response = await fetch(url, {
      headers: {
        'Cookie': this.getCookieHeader(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} - ${url}`)
    }

    return await response.json()
  }

  async getHRVData(date: string): Promise<any> {
    console.log('📊 Fetching HRV data for:', date)
    const data = await this.makeAuthenticatedRequest(
      `https://connect.garmin.com/modern/proxy/usersummary-service/usersummary/daily/${date}`
    )
    console.log('✅ HRV data fetched successfully')
    return data
  }

  async getSleepData(date: string): Promise<any> {
    console.log('😴 Fetching sleep data for:', date)
    const data = await this.makeAuthenticatedRequest(
      `https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailySleepData/${date}`
    )
    console.log('✅ Sleep data fetched successfully')
    return data
  }

  async getBodyBatteryData(date: string): Promise<any> {
    console.log('🔋 Fetching Body Battery data for:', date)
    const data = await this.makeAuthenticatedRequest(
      `https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailyBodyBattery/${date}`
    )
    console.log('✅ Body Battery data fetched successfully')
    return data
  }

  async getStepsData(date: string): Promise<any> {
    console.log('👣 Fetching steps data for:', date)
    const data = await this.makeAuthenticatedRequest(
      `https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailySummaryChart/${date}`
    )
    console.log('✅ Steps data fetched successfully')
    return data
  }

  async getStressData(date: string): Promise<any> {
    console.log('😰 Fetching stress data for:', date)
    const data = await this.makeAuthenticatedRequest(
      `https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailyStress/${date}`
    )
    console.log('✅ Stress data fetched successfully')
    return data
  }
}

serve(async (req) => {
  console.log('✅ Garmin Sync Function called (REAL DATA VERSION)')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { date } = body
    
    if (!date) {
      return new Response(
        JSON.stringify({ error: 'Date parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Import Supabase
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    const jwt = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    const userId = payload.sub

    console.log(`🚀 Starting REAL Garmin sync for user ${userId} on date ${date}`)

    // Get user's Garmin credentials
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('garmin_credentials_encrypted')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.garmin_credentials_encrypted) {
      console.log('❌ No Garmin credentials found')
      return new Response(
        JSON.stringify({ error: 'Garmin credentials not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    let garminEmail: string
    let garminPassword: string

    try {
      const credentials = JSON.parse(profile.garmin_credentials_encrypted)
      garminEmail = credentials.email
      garminPassword = credentials.password
      console.log('📱 Using credentials for:', garminEmail)
      console.log('📱 Password length:', garminPassword?.length || 0)
    } catch (e) {
      console.log('❌ Error parsing credentials:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid credentials format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Initialize and authenticate Garmin client
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Fetch all data types in parallel
    const syncStartTime = Date.now()
    let dataPointsSynced = 0
    const syncedData: any = {}

    try {
      console.log(`📊 Fetching ALL Garmin data for ${date}...`)
      
      const [hrvResult, sleepResult, bodyBatteryResult, stepsResult, stressResult] = await Promise.allSettled([
        garminClient.getHRVData(date),
        garminClient.getSleepData(date),
        garminClient.getBodyBatteryData(date),
        garminClient.getStepsData(date),
        garminClient.getStressData(date)
      ])

      // Process HRV data
      if (hrvResult.status === 'fulfilled' && hrvResult.value) {
        console.log('✅ HRV data processed')
        syncedData.hrv = hrvResult.value
        dataPointsSynced++
        
        await supabase
          .from('garmin_raw_data')
          .upsert({
            user_id: userId,
            data_date: date,
            data_type: 'hrv',
            raw_json: hrvResult.value,
            processed: false
          })
      } else {
        console.log('⚠️ HRV data failed:', hrvResult.status === 'rejected' ? hrvResult.reason : 'No data')
      }

      // Process Sleep data
      if (sleepResult.status === 'fulfilled' && sleepResult.value) {
        console.log('✅ Sleep data processed')
        syncedData.sleep = sleepResult.value
        dataPointsSynced++
        
        await supabase
          .from('garmin_raw_data')
          .upsert({
            user_id: userId,
            data_date: date,
            data_type: 'sleep',
            raw_json: sleepResult.value,
            processed: false
          })
      } else {
        console.log('⚠️ Sleep data failed:', sleepResult.status === 'rejected' ? sleepResult.reason : 'No data')
      }

      // Process Body Battery data
      if (bodyBatteryResult.status === 'fulfilled' && bodyBatteryResult.value) {
        console.log('✅ Body Battery data processed')
        syncedData.bodyBattery = bodyBatteryResult.value
        dataPointsSynced++
        
        await supabase
          .from('garmin_raw_data')
          .upsert({
            user_id: userId,
            data_date: date,
            data_type: 'body_battery',
            raw_json: bodyBatteryResult.value,
            processed: false
          })
      } else {
        console.log('⚠️ Body Battery data failed:', bodyBatteryResult.status === 'rejected' ? bodyBatteryResult.reason : 'No data')
      }

      // Process Steps data
      if (stepsResult.status === 'fulfilled' && stepsResult.value) {
        console.log('✅ Steps data processed')
        syncedData.steps = stepsResult.value
        dataPointsSynced++
        
        await supabase
          .from('garmin_raw_data')
          .upsert({
            user_id: userId,
            data_date: date,
            data_type: 'steps',
            raw_json: stepsResult.value,
            processed: false
          })
      } else {
        console.log('⚠️ Steps data failed:', stepsResult.status === 'rejected' ? stepsResult.reason : 'No data')
      }

      // Process Stress data
      if (stressResult.status === 'fulfilled' && stressResult.value) {
        console.log('✅ Stress data processed')
        syncedData.stress = stressResult.value
        dataPointsSynced++
        
        await supabase
          .from('garmin_raw_data')
          .upsert({
            user_id: userId,
            data_date: date,
            data_type: 'stress',
            raw_json: stressResult.value,
            processed: false
          })
      } else {
        console.log('⚠️ Stress data failed:', stressResult.status === 'rejected' ? stressResult.reason : 'No data')
      }

      const syncDuration = Date.now() - syncStartTime

      // Update user profile
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

      console.log(`✅ REAL DATA SYNC completed! ${dataPointsSynced} data points synced in ${syncDuration}ms`)

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Real Garmin data synced successfully! ${dataPointsSynced} data points`,
          data: syncedData,
          dataPointsSynced,
          syncDuration: syncDuration
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )

    } catch (dataError) {
      console.error('❌ Error fetching real Garmin data:', dataError)
      
      const syncDuration = Date.now() - syncStartTime
      
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
          error: 'Failed to fetch real Garmin data', 
          details: dataError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

  } catch (error) {
    console.error('❌ Unexpected error in real data sync:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }
})