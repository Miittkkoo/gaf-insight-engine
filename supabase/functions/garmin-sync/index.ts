import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('✅ Garmin Sync Function called')
  
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

    console.log(`🚀 Starting Garmin sync for user ${userId} on date ${date}`)

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

    // Simulate Garmin authentication and data fetch for now
    console.log('🔐 Simulating Garmin authentication...')
    
    try {
      // For now, just create mock data to test the storage pipeline
      const mockHRVData = {
        lastNightAvg: 45,
        sevenDayAvg: 42,
        status: 'balanced',
        timestamp: new Date().toISOString(),
        date: date
      }

      console.log('✅ Mock Garmin data created')

      // Store the data
      const { error: insertError } = await supabase
        .from('garmin_raw_data')
        .upsert({
          user_id: userId,
          data_date: date,
          data_type: 'hrv',
          raw_json: mockHRVData,
          processed: false
        })

      if (insertError) {
        console.error('❌ Error storing data:', insertError)
        throw insertError
      }

      console.log('✅ Data stored successfully')

      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          garmin_last_sync: new Date().toISOString(),
          garmin_connected: true
        })
        .eq('id', userId)

      if (updateError) {
        console.error('❌ Error updating profile:', updateError)
        throw updateError
      }

      console.log('✅ Profile updated successfully')

      // Log successful sync
      const { error: logError } = await supabase
        .from('garmin_sync_logs')
        .insert({
          user_id: userId,
          sync_type: 'manual',
          status: 'success',
          data_points_synced: 1,
          sync_timestamp: new Date().toISOString()
        })

      if (logError) {
        console.error('⚠️ Error logging sync (non-critical):', logError)
      }

      console.log('✅ Sync completed successfully (mock data)')

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Mock Garmin data synced successfully',
          data: { hrv: mockHRVData },
          note: 'This is mock data for testing - real Garmin API will be added next'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )

    } catch (dataError) {
      console.error('❌ Error in data pipeline:', dataError)
      
      // Log failed sync
      await supabase
        .from('garmin_sync_logs')
        .insert({
          user_id: userId,
          sync_type: 'manual',
          status: 'failed',
          error_message: `Data pipeline failed: ${dataError.message}`,
          sync_timestamp: new Date().toISOString()
        })

      return new Response(
        JSON.stringify({ 
          error: 'Failed to process Garmin data', 
          details: dataError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }
})