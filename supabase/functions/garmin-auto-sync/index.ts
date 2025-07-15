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
    console.log('Starting automated Garmin sync for all users...')
    
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

    // Get all users who have Garmin connected and haven't synced in the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data: users, error: usersError } = await supabaseClient
      .from('user_profiles')
      .select('id, garmin_last_sync, garmin_connected')
      .eq('garmin_connected', true)
      .or(`garmin_last_sync.is.null,garmin_last_sync.lt.${twoHoursAgo}`)

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    console.log(`Found ${users?.length || 0} users for sync`)

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No users need syncing', syncedUsers: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Garmin credentials from secrets
    const garminEmail = Deno.env.get('GARMIN_EMAIL')
    const garminPassword = Deno.env.get('GARMIN_PASSWORD')

    if (!garminEmail || !garminPassword) {
      throw new Error('Garmin credentials not configured')
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each user
    for (const user of users) {
      try {
        console.log(`Syncing user ${user.id}...`)
        
        // Get yesterday's and today's data (in case we missed yesterday)
        const dates = [
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
          new Date().toISOString().split('T')[0] // Today
        ]

        for (const date of dates) {
          await syncUserGarminData(supabaseClient, user.id, date, garminEmail, garminPassword)
        }

        // Update user's last sync time
        await supabaseClient
          .from('user_profiles')
          .update({ garmin_last_sync: new Date().toISOString() })
          .eq('id', user.id)

        successCount++
        console.log(`Successfully synced user ${user.id}`)

      } catch (error) {
        errorCount++
        const errorMsg = `User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(`Failed to sync user ${user.id}:`, error)

        // Log failed sync
        await supabaseClient
          .from('garmin_sync_logs')
          .insert({
            user_id: user.id,
            sync_type: 'auto_sync',
            status: 'error',
            error_message: errorMsg,
            sync_timestamp: new Date().toISOString()
          })
      }
    }

    console.log(`Auto-sync completed: ${successCount} success, ${errorCount} errors`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        syncedUsers: successCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auto-sync error:', error)
    
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

async function syncUserGarminData(
  supabaseClient: any, 
  userId: string, 
  date: string, 
  garminEmail: string, 
  garminPassword: string
) {
  // Check if we already have data for this date
  const { data: existingData } = await supabaseClient
    .from('garmin_raw_data')
    .select('id')
    .eq('user_id', userId)
    .eq('data_date', date)

  if (existingData && existingData.length > 0) {
    console.log(`User ${userId} already has data for ${date}, skipping`)
    return
  }

  // Get user's Garmin user ID from their profile
  const { data: profile } = await supabaseClient
    .from('user_profiles')
    .select('garmin_credentials_encrypted')
    .eq('id', userId)
    .single()

  let garminUserId = '124462920' // Default fallback

  if (profile?.garmin_credentials_encrypted) {
    try {
      const credentials = JSON.parse(profile.garmin_credentials_encrypted)
      garminUserId = credentials.userId || garminUserId
    } catch (error) {
      console.error('Failed to parse Garmin credentials for user', userId, error)
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
  
  if (hrv) rawDataInserts.push({ user_id: userId, data_type: 'hrv', data_date: date, raw_json: hrv })
  if (dailyStats) rawDataInserts.push({ user_id: userId, data_type: 'daily_stats', data_date: date, raw_json: dailyStats })
  if (heartRate) rawDataInserts.push({ user_id: userId, data_type: 'heart_rate', data_date: date, raw_json: heartRate })
  if (bodyBattery) rawDataInserts.push({ user_id: userId, data_type: 'body_battery', data_date: date, raw_json: bodyBattery })
  if (sleep) rawDataInserts.push({ user_id: userId, data_type: 'sleep', data_date: date, raw_json: sleep })

  if (rawDataInserts.length > 0) {
    await supabaseClient
      .from('garmin_raw_data')
      .insert(rawDataInserts)

    // Log successful sync
    await supabaseClient
      .from('garmin_sync_logs')
      .insert({
        user_id: userId,
        sync_type: 'auto_sync',
        status: 'success',
        data_points_synced: rawDataInserts.length,
        sync_timestamp: new Date().toISOString()
      })

    console.log(`Stored ${rawDataInserts.length} data points for user ${userId} on ${date}`)
  }
}