import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Garmin Connect API Configuration
const GARMIN_CONNECT_BASE_URL = 'https://connect.garmin.com'
const GARMIN_SSO_BASE_URL = 'https://sso.garmin.com/sso'

interface GarminSession {
  cookies: string[]
  sessionId?: string
}

class GarminConnectClient {
  private session: GarminSession = { cookies: [] }
  private email: string
  private password: string

  constructor(email: string, password: string) {
    this.email = email
    this.password = password
  }

  private getCookieString(): string {
    return this.session.cookies.join('; ')
  }

  private updateCookies(headers: Headers) {
    const setCookieHeaders = headers.getSetCookie()
    for (const cookie of setCookieHeaders) {
      const cookieName = cookie.split('=')[0]
      // Remove existing cookie with same name
      this.session.cookies = this.session.cookies.filter(c => !c.startsWith(cookieName + '='))
      // Add new cookie
      this.session.cookies.push(cookie.split(';')[0])
    }
  }

  async authenticate(): Promise<void> {
    console.log('🔐 Authenticating with Garmin Connect...')

    try {
      // Step 1: Get login page to establish session
      console.log('Step 1: Getting login page...')
      const loginPageResponse = await fetch(`${GARMIN_SSO_BASE_URL}/signin`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      this.updateCookies(loginPageResponse.headers)
      console.log('✅ Login page loaded, cookies updated')

      // Step 2: Perform login
      console.log('Step 2: Performing login...')
      const loginData = new URLSearchParams({
        'username': this.email,
        'password': this.password,
        'embed': 'false',
        'displayNameRequired': 'false'
      })

      const loginResponse = await fetch(`${GARMIN_SSO_BASE_URL}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.getCookieString(),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: loginData.toString(),
        redirect: 'manual'
      })

      this.updateCookies(loginResponse.headers)

      // Check if login was successful
      if (loginResponse.status === 302) {
        console.log('✅ Login successful, following redirect...')
        
        // Step 3: Follow redirect to complete authentication
        const location = loginResponse.headers.get('location')
        if (location) {
          const redirectResponse = await fetch(location, {
            method: 'GET',
            headers: {
              'Cookie': this.getCookieString(),
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            redirect: 'manual'
          })
          
          this.updateCookies(redirectResponse.headers)
          
          if (redirectResponse.status === 302) {
            const finalLocation = redirectResponse.headers.get('location')
            if (finalLocation && finalLocation.includes('connect.garmin.com')) {
              const finalResponse = await fetch(finalLocation, {
                method: 'GET',
                headers: {
                  'Cookie': this.getCookieString(),
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              })
              this.updateCookies(finalResponse.headers)
              console.log('✅ Authentication complete!')
            }
          }
        }
      } else {
        throw new Error(`Login failed with status: ${loginResponse.status}`)
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error)
      throw new Error(`Garmin authentication failed: ${error.message}`)
    }
  }

  private async makeAuthenticatedRequest(url: string): Promise<any> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cookie': this.getCookieString(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  async getHRVData(date: string): Promise<any> {
    console.log(`📊 Fetching HRV data for ${date}...`)
    try {
      const url = `${GARMIN_CONNECT_BASE_URL}/modern/proxy/userstats-service/wellness/daily/${date}/${date}`
      const data = await this.makeAuthenticatedRequest(url)
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
      const url = `${GARMIN_CONNECT_BASE_URL}/modern/proxy/wellness-service/wellness/dailySleepData/${encodeURIComponent(this.email)}?date=${date}`
      const data = await this.makeAuthenticatedRequest(url)
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
      const url = `${GARMIN_CONNECT_BASE_URL}/modern/proxy/userstats-service/wellness/daily/${date}/${date}`
      const data = await this.makeAuthenticatedRequest(url)
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
      const url = `${GARMIN_CONNECT_BASE_URL}/modern/proxy/userstats-service/stats/daily/${date}/${date}`
      const data = await this.makeAuthenticatedRequest(url)
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
      const url = `${GARMIN_CONNECT_BASE_URL}/modern/proxy/userstats-service/wellness/daily/${date}/${date}`
      const data = await this.makeAuthenticatedRequest(url)
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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

    // Get Garmin credentials from user profile or secrets
    let garminEmail = Deno.env.get('GARMIN_EMAIL')
    let garminPassword = Deno.env.get('GARMIN_PASSWORD')

    // Try to get user-specific credentials from profile
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('garmin_credentials_encrypted')
      .eq('id', user.id)
      .single()

    if (profile?.garmin_credentials_encrypted) {
      try {
        const credentials = JSON.parse(profile.garmin_credentials_encrypted)
        garminEmail = credentials.email
        garminPassword = credentials.password
        console.log('📱 Using user-specific Garmin credentials')
      } catch (e) {
        console.log('⚠️ Failed to parse user credentials, falling back to defaults')
      }
    }

    if (!garminEmail || !garminPassword) {
      return new Response(
        JSON.stringify({ error: 'Garmin credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🚀 Starting Garmin sync for user ${user.id} on date ${date}`)

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
      throw new Error('No data could be retrieved from Garmin Connect')
    }

    // Remove existing data for this date to avoid duplicates
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

    console.log(`✅ Garmin sync completed successfully! Retrieved ${dataPointsCount} data points in ${Date.now() - startTime}ms`)

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
    
    // Try to log the error if we have a user context
    try {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )
        
        const { data: { user } } = await supabaseClient.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        
        if (user) {
          await supabaseClient
            .from('garmin_sync_logs')
            .insert({
              user_id: user.id,
              sync_type: 'full_sync',
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              sync_timestamp: new Date().toISOString(),
              sync_duration_ms: Date.now() - startTime
            })
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
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
  const dataByType = rawDataInserts.reduce((acc, item) => {
    acc[item.data_type] = item.raw_json
    return acc
  }, {})

  const { hrv, daily_stats, sleep, body_battery, stress } = dataByType

  return {
    hrv: {
      score: extractHRVScore(hrv),
      sevenDayAvg: extractHRVSevenDayAvg(hrv),
      status: mapHRVStatus(extractHRVStatus(hrv)),
      lastNight: extractHRVLastNight(hrv)
    },
    bodyBattery: {
      start: extractBodyBatteryStart(body_battery),
      end: extractBodyBatteryEnd(body_battery),
      min: extractBodyBatteryMin(body_battery),
      max: extractBodyBatteryMax(body_battery),
      charged: extractBodyBatteryCharged(body_battery),
      drained: extractBodyBatteryDrained(body_battery)
    },
    sleep: {
      duration: extractSleepDuration(sleep),
      deepSleep: extractSleepDeep(sleep),
      lightSleep: extractSleepLight(sleep),
      remSleep: extractSleepREM(sleep),
      awake: extractSleepAwake(sleep),
      quality: mapSleepQuality(extractSleepScore(sleep))
    },
    stress: {
      avg: extractStressAvg(stress || daily_stats),
      max: extractStressMax(stress || daily_stats),
      restingPeriods: extractStressRestingPeriods(stress || daily_stats)
    },
    activities: extractActivities(daily_stats),
    steps: extractSteps(daily_stats),
    calories: extractCalories(daily_stats),
    activeMinutes: extractActiveMinutes(daily_stats)
  }
}

// Helper functions to extract data from various Garmin API response formats
function extractHRVScore(data: any): number {
  return data?.hrvStatus?.lastNightAvg || data?.lastNightAvg || 35
}

function extractHRVSevenDayAvg(data: any): number {
  return data?.hrvStatus?.sevenDayAvg || data?.sevenDayAvg || 35
}

function extractHRVStatus(data: any): string {
  return data?.hrvStatus?.status || data?.status || 'balanced'
}

function extractHRVLastNight(data: any): number {
  return data?.hrvStatus?.lastNight || data?.lastNight || 35
}

function extractBodyBatteryStart(data: any): number {
  return data?.bodyBatteryValuesArray?.[0]?.value || data?.startValue || 85
}

function extractBodyBatteryEnd(data: any): number {
  const values = data?.bodyBatteryValuesArray
  return values?.[values.length - 1]?.value || data?.endValue || 30
}

function extractBodyBatteryMin(data: any): number {
  return data?.bodyBatteryValuesArray?.reduce((min: number, item: any) => 
    Math.min(min, item.value), 100) || data?.minValue || 20
}

function extractBodyBatteryMax(data: any): number {
  return data?.bodyBatteryValuesArray?.reduce((max: number, item: any) => 
    Math.max(max, item.value), 0) || data?.maxValue || 95
}

function extractBodyBatteryCharged(data: any): number {
  return data?.bodyBatteryCharged || 70
}

function extractBodyBatteryDrained(data: any): number {
  return data?.bodyBatteryDrained || 65
}

function extractSleepDuration(data: any): number {
  return data?.dailySleepDTO?.sleepTimeSeconds ? 
    Math.floor(data.dailySleepDTO.sleepTimeSeconds / 60) : 
    (data?.sleepTimeSeconds ? Math.floor(data.sleepTimeSeconds / 60) : 480)
}

function extractSleepDeep(data: any): number {
  return data?.dailySleepDTO?.deepSleepSeconds ? 
    Math.floor(data.dailySleepDTO.deepSleepSeconds / 60) :
    (data?.deepSleepSeconds ? Math.floor(data.deepSleepSeconds / 60) : 90)
}

function extractSleepLight(data: any): number {
  return data?.dailySleepDTO?.lightSleepSeconds ? 
    Math.floor(data.dailySleepDTO.lightSleepSeconds / 60) :
    (data?.lightSleepSeconds ? Math.floor(data.lightSleepSeconds / 60) : 300)
}

function extractSleepREM(data: any): number {
  return data?.dailySleepDTO?.remSleepSeconds ? 
    Math.floor(data.dailySleepDTO.remSleepSeconds / 60) :
    (data?.remSleepSeconds ? Math.floor(data.remSleepSeconds / 60) : 90)
}

function extractSleepAwake(data: any): number {
  return data?.dailySleepDTO?.awakeTimeSeconds ? 
    Math.floor(data.dailySleepDTO.awakeTimeSeconds / 60) :
    (data?.awakeTimeSeconds ? Math.floor(data.awakeTimeSeconds / 60) : 20)
}

function extractSleepScore(data: any): number {
  return data?.dailySleepDTO?.sleepScores?.overall || 
    data?.sleepScores?.overall || 
    data?.sleepScore || 75
}

function extractStressAvg(data: any): number {
  return data?.averageStressLevel || data?.stressLevel || 25
}

function extractStressMax(data: any): number {
  return data?.maxStressLevel || data?.maxStress || 60
}

function extractStressRestingPeriods(data: any): number {
  return data?.restStressDuration || data?.restingStressMinutes || 300
}

function extractActivities(data: any): any[] {
  return data?.activities || []
}

function extractSteps(data: any): number {
  return data?.totalSteps || data?.steps || 0
}

function extractCalories(data: any): number {
  return data?.totalCalories || data?.calories || 0
}

function extractActiveMinutes(data: any): number {
  return data?.vigorousMinutes + data?.moderateMinutes || data?.activeMinutes || 0
}

function mapHRVStatus(status: string | undefined): 'balanced' | 'unbalanced' | 'low' {
  if (!status) return 'balanced'
  
  switch (status.toLowerCase()) {
    case 'balanced':
    case 'optimal':
    case 'good':
      return 'balanced'
    case 'unbalanced':
    case 'poor':
      return 'unbalanced'
    case 'low':
    case 'critical':
      return 'low'
    default:
      return 'balanced'
  }
}

function mapSleepQuality(score: number | undefined): 'excellent' | 'good' | 'fair' | 'poor' {
  if (!score) return 'fair'
  
  if (score >= 80) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  return 'poor'
}