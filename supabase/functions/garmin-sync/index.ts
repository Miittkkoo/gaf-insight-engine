import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Real Garmin Connect API Service
class RealGarminService {
  private client: any
  private email: string
  private password: string

  constructor(email: string, password: string) {
    this.email = email
    this.password = password
  }

  async authenticate(): Promise<void> {
    console.log('🔐 Authenticating with real Garmin Connect...')
    console.log('📧 Email:', this.email)
    console.log('🔑 Password length:', this.password?.length || 0)
    
    try {
      // Import garmin-connect package dynamically
      const { GarminConnect } = await import('https://esm.sh/garmin-connect@1.5.0')
      
      this.client = new GarminConnect({
        username: this.email,
        password: this.password
      })
      
      await this.client.login()
      console.log('✅ Real Garmin authentication successful')
    } catch (error) {
      console.error('❌ Garmin authentication failed:', error)
      throw new Error(`Garmin authentication failed: ${error.message}`)
    }
  }

  async getHRVData(date: string): Promise<any> {
    try {
      console.log('📊 Fetching real HRV data for:', date)
      
      const hrvData = await this.client.getHRV(date)
      
      return {
        hrvSummary: {
          lastNightAvg: hrvData?.lastNightAvg || null,
          lastNightFiveMintueHigh: hrvData?.lastNightFiveMintueHigh || null,
          baseline: {
            balancedLow: hrvData?.baseline?.balancedLow || null,
            balancedHigh: hrvData?.baseline?.balancedHigh || null
          },
          status: this.mapHRVStatus(hrvData?.status)
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.warn('⚠️ HRV data fetch failed, using fallback:', error.message)
      return null
    }
  }

  async getSleepData(date: string): Promise<any> {
    try {
      console.log('😴 Fetching real sleep data for:', date)
      
      const sleepData = await this.client.getSleep(date)
      
      return {
        dailySleepDTO: {
          sleepTimeSeconds: sleepData?.sleepTimeSeconds || 0,
          deepSleepSeconds: sleepData?.deepSleepSeconds || 0,
          lightSleepSeconds: sleepData?.lightSleepSeconds || 0,
          remSleepSeconds: sleepData?.remSleepSeconds || 0,
          awakeTimeSeconds: sleepData?.awakeTimeSeconds || 0,
          sleepScore: sleepData?.sleepScore || 0,
          qualityMetrics: {
            overall: sleepData?.sleepScore || 0,
            duration: sleepData?.durationScore || 0,
            quality: sleepData?.qualityScore || 0,
            recovery: sleepData?.recoveryScore || 0
          }
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.warn('⚠️ Sleep data fetch failed, using fallback:', error.message)
      return null
    }
  }

  async getBodyBatteryData(date: string): Promise<any> {
    try {
      console.log('🔋 Fetching real Body Battery data for:', date)
      
      const bodyBatteryData = await this.client.getBodyBattery(date)
      
      return {
        bodyBatteryData: bodyBatteryData?.bodyBatteryValuesArray || [],
        charged: bodyBatteryData?.charged || 0,
        drained: bodyBatteryData?.drained || 0,
        startLevel: bodyBatteryData?.startLevel || 0,
        endLevel: bodyBatteryData?.endLevel || 0
      }
    } catch (error) {
      console.warn('⚠️ Body Battery data fetch failed, using fallback:', error.message)
      return null
    }
  }

  async getStepsData(date: string): Promise<any> {
    try {
      console.log('👣 Fetching real steps data for:', date)
      
      const stepsData = await this.client.getSteps(date, date)
      
      return {
        dailyMovement: {
          totalSteps: stepsData?.totalSteps || 0,
          totalDistance: stepsData?.totalDistance || 0,
          activeTimeSeconds: stepsData?.activeTimeSeconds || 0,
          caloriesBurned: stepsData?.caloriesBurned || 0,
          floorsClimbed: stepsData?.floorsClimbed || 0
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.warn('⚠️ Steps data fetch failed, using fallback:', error.message)
      return null
    }
  }

  async getStressData(date: string): Promise<any> {
    try {
      console.log('😰 Fetching real stress data for:', date)
      
      const stressData = await this.client.getStress(date)
      
      return {
        stressData: stressData?.stressValuesArray || [],
        avgStressLevel: stressData?.avgStressLevel || 0,
        maxStressLevel: stressData?.maxStressLevel || 0,
        stressChartData: {
          timeOffsetStressLevelValues: stressData?.timeOffsetStressLevelValues || []
        }
      }
    } catch (error) {
      console.warn('⚠️ Stress data fetch failed, using fallback:', error.message)
      return null
    }
  }

  private mapHRVStatus(status: string | undefined): string {
    switch (status?.toUpperCase()) {
      case 'BALANCED': return 'BALANCED'
      case 'UNBALANCED': return 'UNBALANCED'
      case 'POOR': return 'POOR'
      default: return 'UNKNOWN'
    }
  }
}

serve(async (req) => {
  console.log('🔥 REAL Garmin Connect API Integration - Echte Daten werden abgerufen!')
  
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

    // Initialize and authenticate REAL Garmin Service
    const garminClient = new RealGarminService(garminEmail, garminPassword)
    
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