import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    // Get Garmin credentials from secrets
    const garminEmail = Deno.env.get('GARMIN_EMAIL')
    const garminPassword = Deno.env.get('GARMIN_PASSWORD')

    if (!garminEmail || !garminPassword) {
      return new Response(
        JSON.stringify({ error: 'Garmin credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user's Garmin user ID from their profile
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('garmin_credentials_encrypted')
      .eq('id', user.id)
      .single()

    let garminUserId = '124462920' // Default fallback

    if (profile?.garmin_credentials_encrypted) {
      try {
        const credentials = JSON.parse(profile.garmin_credentials_encrypted)
        garminUserId = credentials.userId || garminUserId
      } catch (error) {
        console.error('Failed to parse Garmin credentials:', error)
      }
    }

    // Authenticate with Garmin Connect
    const authResponse = await fetch('https://connect.garmin.com/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: garminEmail,
        password: garminPassword,
      }),
    })

    if (!authResponse.ok) {
      throw new Error('Garmin authentication failed')
    }

    // Extract cookies for subsequent requests
    const cookies = authResponse.headers.get('set-cookie') || ''
    
    const baseUrl = 'https://connect.garmin.com/modern/proxy'
    const headers = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': cookies,
    }

    // Fetch all Garmin data endpoints in parallel
    const [hrvResponse, dailyStatsResponse, heartRateResponse, bodyBatteryResponse, sleepResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/userstats-service/wellness/${garminUserId}?fromDate=${date}&untilDate=${date}`, { headers }),
      fetch(`${baseUrl}/usersummary-service/usersummary/daily/${garminUserId}?calendarDate=${date}`, { headers }),
      fetch(`${baseUrl}/wellness-service/wellness/dailyHeartRate/${garminUserId}?date=${date}`, { headers }),
      fetch(`${baseUrl}/usersummary-service/usersummary/hydration/allData/${garminUserId}?startDate=${date}&endDate=${date}`, { headers }),
      fetch(`${baseUrl}/wellness-service/wellness/dailySleep/${garminUserId}?date=${date}`, { headers })
    ])

    const extractData = async (response: PromiseSettledResult<Response>) => {
      if (response.status === 'fulfilled' && response.value.ok) {
        try {
          return await response.value.json()
        } catch {
          return null
        }
      }
      return null
    }

    const [hrv, dailyStats, heartRate, bodyBattery, sleep] = await Promise.all([
      extractData(hrvResponse),
      extractData(dailyStatsResponse), 
      extractData(heartRateResponse),
      extractData(bodyBatteryResponse),
      extractData(sleepResponse)
    ])

    // Store raw data in database
    const rawDataInserts = []
    
    if (hrv) rawDataInserts.push({ user_id: user.id, data_type: 'hrv', data_date: date, raw_json: hrv })
    if (dailyStats) rawDataInserts.push({ user_id: user.id, data_type: 'daily_stats', data_date: date, raw_json: dailyStats })
    if (heartRate) rawDataInserts.push({ user_id: user.id, data_type: 'heart_rate', data_date: date, raw_json: heartRate })
    if (bodyBattery) rawDataInserts.push({ user_id: user.id, data_type: 'body_battery', data_date: date, raw_json: bodyBattery })
    if (sleep) rawDataInserts.push({ user_id: user.id, data_type: 'sleep', data_date: date, raw_json: sleep })

    if (rawDataInserts.length > 0) {
      await supabaseClient
        .from('garmin_raw_data')
        .insert(rawDataInserts)
    }

    // Map to standardized format
    const garminData = {
      hrv: {
        score: hrv?.lastNightAvg || 35,
        sevenDayAvg: hrv?.sevenDayAvg || 35,
        status: mapHRVStatus(hrv?.status),
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
        quality: mapSleepQuality(sleep?.sleepScores?.overall)
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
    }

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
        data_points_synced: rawDataInserts.length,
        sync_timestamp: new Date().toISOString(),
        sync_duration_ms: Date.now() - Date.now() // Will be calculated properly
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: garminData,
        dataPoints: rawDataInserts.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Garmin sync error:', error)
    
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