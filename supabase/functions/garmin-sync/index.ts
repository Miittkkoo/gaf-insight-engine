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
      
      this.updateCookies(loginPageResponse)
      const loginPageHtml = await loginPageResponse.text()
      
      // Extract CSRF token
      const csrfMatch = loginPageHtml.match(/name="_csrf"\s+value="([^"]+)"/)
      const csrfToken = csrfMatch ? csrfMatch[1] : ''
      
      console.log('✅ Got login page and CSRF token')

      // Step 2: Login with credentials
      const loginData = new URLSearchParams({
        'username': this.email,
        'password': this.password,
        '_csrf': csrfToken,
        'embed': 'false',
        'displayNameRequired': 'false'
      })

      const loginResponse = await fetch('https://sso.garmin.com/sso/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Cookie': this.getCookieHeader(),
          'Referer': 'https://sso.garmin.com/sso/signin'
        },
        body: loginData.toString(),
        redirect: 'manual'
      })

      this.updateCookies(loginResponse)
      
      // Check for successful authentication
      if (loginResponse.status === 302) {
        const location = loginResponse.headers.get('location')
        if (location?.includes('ticket=')) {
          console.log('✅ Login successful, processing ticket...')
          
          // Follow the redirect to complete authentication
          const ticketResponse = await fetch(location, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cookie': this.getCookieHeader()
            },
            redirect: 'manual'
          })
          
          this.updateCookies(ticketResponse)
          
          if (ticketResponse.status === 302) {
            const finalLocation = ticketResponse.headers.get('location')
            if (finalLocation) {
              const finalResponse = await fetch(finalLocation, {
                method: 'GET',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Cookie': this.getCookieHeader()
                }
              })
              this.updateCookies(finalResponse)
            }
          }
          
          console.log('✅ Authentication complete!')
          return
        }
      }
      
      // Check response for errors
      const responseText = await loginResponse.text()
      if (responseText.includes('Invalid username or password') || responseText.includes('error')) {
        throw new Error('Invalid username or password')
      }
      
      // If we get here, assume success if we have session cookies
      if (this.cookies.has('GARMIN-SSO') || this.cookies.size > 0) {
        console.log('✅ Authentication appears successful')
        return
      }
      
      throw new Error('Authentication failed - no session established')
      
    } catch (error) {
      console.error('❌ Authentication failed:', error)
      throw error
    }
  }

  private async makeRequest(url: string): Promise<any> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': this.getCookieHeader(),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      // If not JSON, return as text
      return text
    }
  }

  async getHRVData(date: string): Promise<any> {
    console.log(`📊 Fetching HRV data for ${date}...`)
    try {
      const url = `https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}`
      const data = await this.makeRequest(url)
      console.log('✅ HRV data retrieved')
      return data
    } catch (error) {
      console.error('❌ Failed to fetch HRV data:', error)
      return null
    }
  }

  async getSleepData(date: string): Promise<any> {
    console.log(`😴 Fetching sleep data for ${date}...`)
    try {
      const url = `https://connect.garmin.com/modern/proxy/wellness-service/wellness/dailySleepData/${encodeURIComponent(this.email)}?date=${date}`
      const data = await this.makeRequest(url)
      console.log('✅ Sleep data retrieved')
      return data
    } catch (error) {
      console.error('❌ Failed to fetch sleep data:', error)
      return null
    }
  }

  async getBodyBatteryData(date: string): Promise<any> {
    console.log(`🔋 Fetching Body Battery data for ${date}...`)
    try {
      const url = `https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}`
      const data = await this.makeRequest(url)
      console.log('✅ Body Battery data retrieved')
      return data
    } catch (error) {
      console.error('❌ Failed to fetch Body Battery data:', error)
      return null
    }
  }

  async getDailyStats(date: string): Promise<any> {
    console.log(`📈 Fetching daily stats for ${date}...`)
    try {
      const url = `https://connect.garmin.com/modern/proxy/userstats-service/stats/daily/${date}/${date}`
      const data = await this.makeRequest(url)
      console.log('✅ Daily stats retrieved')
      return data
    } catch (error) {
      console.error('❌ Failed to fetch daily stats:', error)
      return null
    }
  }

  async getStressData(date: string): Promise<any> {
    console.log(`😰 Fetching stress data for ${date}...`)
    try {
      const url = `https://connect.garmin.com/modern/proxy/userstats-service/wellness/daily/${date}/${date}`
      const data = await this.makeRequest(url)
      console.log('✅ Stress data retrieved')
      return data
    } catch (error) {
      console.error('❌ Failed to fetch stress data:', error)
      return null
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

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

    console.log(`🚀 Starting Garmin sync for user ${user.id} on date ${date}`)

    // Get Garmin credentials from user profile
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('garmin_credentials_encrypted')
      .eq('id', user.id)
      .single()

    if (!profile?.garmin_credentials_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Garmin credentials not configured' }),
        { 
          status: 500, 
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
      console.log('📱 Using user-specific Garmin credentials')
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid Garmin credentials format' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Garmin client and authenticate
    const garminClient = new GarminConnectClient(garminEmail, garminPassword)
    
    try {
      await garminClient.authenticate()
    } catch (authError) {
      console.error('❌ Garmin authentication failed:', authError)
      
      // Log failed sync
      await supabaseClient
        .from('garmin_sync_logs')
        .insert({
          user_id: user.id,
          sync_type: 'full_sync',
          status: 'failed',
          error_message: `Authentication failed: ${authError.message}`,
          sync_timestamp: new Date().toISOString(),
          sync_duration_ms: Date.now() - startTime
        })

      return new Response(
        JSON.stringify({ error: `Garmin authentication failed: ${authError.message}` }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch all data types in parallel
    console.log('📡 Fetching all Garmin data...')
    const [hrvData, sleepData, bodyBatteryData, dailyStats, stressData] = await Promise.allSettled([
      garminClient.getHRVData(date),
      garminClient.getSleepData(date),
      garminClient.getBodyBatteryData(date),
      garminClient.getDailyStats(date),
      garminClient.getStressData(date)
    ])

    // Process results and prepare data for storage
    const rawDataInserts = []
    let dataPointsCount = 0

    if (hrvData.status === 'fulfilled' && hrvData.value) {
      rawDataInserts.push({ 
        user_id: user.id, 
        data_type: 'hrv', 
        data_date: date, 
        raw_json: hrvData.value 
      })
      dataPointsCount++
    }

    if (sleepData.status === 'fulfilled' && sleepData.value) {
      rawDataInserts.push({ 
        user_id: user.id, 
        data_type: 'sleep', 
        data_date: date, 
        raw_json: sleepData.value 
      })
      dataPointsCount++
    }

    if (bodyBatteryData.status === 'fulfilled' && bodyBatteryData.value) {
      rawDataInserts.push({ 
        user_id: user.id, 
        data_type: 'body_battery', 
        data_date: date, 
        raw_json: bodyBatteryData.value 
      })
      dataPointsCount++
    }

    if (dailyStats.status === 'fulfilled' && dailyStats.value) {
      rawDataInserts.push({ 
        user_id: user.id, 
        data_type: 'daily_stats', 
        data_date: date, 
        raw_json: dailyStats.value 
      })
      dataPointsCount++
    }

    if (stressData.status === 'fulfilled' && stressData.value) {
      rawDataInserts.push({ 
        user_id: user.id, 
        data_type: 'stress', 
        data_date: date, 
        raw_json: stressData.value 
      })
      dataPointsCount++
    }

    if (rawDataInserts.length === 0) {
      console.log('⚠️ No data retrieved from Garmin Connect, this might be normal for future dates')
      // Don't throw error, just return empty result
    }

    // Remove existing data for this date to avoid duplicates
    if (rawDataInserts.length > 0) {
      await supabaseClient
        .from('garmin_raw_data')
        .delete()
        .eq('user_id', user.id)
        .eq('data_date', date)

      // Insert new data
      const { error: insertError } = await supabaseClient
        .from('garmin_raw_data')
        .insert(rawDataInserts)

      if (insertError) {
        throw new Error(`Failed to store data: ${insertError.message}`)
      }
    }

    // Process data for response
    const processedData = processGarminData(rawDataInserts)

    // Update user profile
    await supabaseClient
      .from('user_profiles')
      .update({ 
        garmin_last_sync: new Date().toISOString(),
        garmin_connected: true 
      })
      .eq('id', user.id)

    // Log successful sync
    await supabaseClient
      .from('garmin_sync_logs')
      .insert({
        user_id: user.id,
        sync_type: 'full_sync',
        status: 'success',
        data_points_synced: dataPointsCount,
        sync_timestamp: new Date().toISOString(),
        sync_duration_ms: Date.now() - startTime
      })

    console.log(`✅ Garmin sync completed! Retrieved ${dataPointsCount} data points in ${Date.now() - startTime}ms`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: processedData,
        dataPoints: dataPointsCount,
        syncDuration: Date.now() - startTime
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Garmin sync error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function processGarminData(rawDataInserts: any[]): any {
  if (rawDataInserts.length === 0) {
    return {
      hrv: { score: null, status: 'no_data' },
      sleep: { quality: null, score: null },
      bodyBattery: { current: null, max: null },
      stress: { average: null, max: null },
      steps: { total: null, goal: null }
    }
  }

  const dataByType = rawDataInserts.reduce((acc, item) => {
    acc[item.data_type] = item.raw_json
    return acc
  }, {})

  return {
    hrv: extractHRVData(dataByType.hrv),
    sleep: extractSleepData(dataByType.sleep), 
    bodyBattery: extractBodyBatteryData(dataByType.body_battery),
    stress: extractStressData(dataByType.stress),
    steps: extractStepsData(dataByType.daily_stats)
  }
}

function extractHRVData(data: any): any {
  if (!data) return { score: null, status: 'no_data' }
  
  return {
    score: data.lastNightAvg || data.hrvScore || null,
    sevenDayAvg: data.sevenDayAvg || null,
    status: data.status || 'unknown',
    lastNight: data.lastNightAvg || null
  }
}

function extractSleepData(data: any): any {
  if (!data) return { quality: null, score: null }
  
  return {
    quality: data.sleepQualityTypePK || null,
    score: data.sleepScores?.overall || null,
    duration: data.sleepTimeSeconds || null,
    deepSleep: data.deepSleepSeconds || null,
    lightSleep: data.lightSleepSeconds || null,
    remSleep: data.remSleepSeconds || null
  }
}

function extractBodyBatteryData(data: any): any {
  if (!data) return { current: null, max: null }
  
  return {
    current: data.bodyBatteryValuesArray?.[data.bodyBatteryValuesArray?.length - 1]?.value || null,
    max: data.bodyBatteryDrainedValue || null,
    charged: data.bodyBatteryChargedValue || null
  }
}

function extractStressData(data: any): any {
  if (!data) return { average: null, max: null }
  
  return {
    average: data.overallStressLevel || null,
    max: data.maxStressLevel || null,
    restStress: data.restStressLevel || null
  }
}

function extractStepsData(data: any): any {
  if (!data) return { total: null, goal: null }
  
  return {
    total: data.totalSteps || null,
    goal: data.stepGoal || null,
    distance: data.totalDistance || null
  }
}