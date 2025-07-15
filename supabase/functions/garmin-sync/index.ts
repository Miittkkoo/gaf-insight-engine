import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simplified Garmin Connect Client
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
    console.log('🔐 Starting Garmin authentication...')

    try {
      // Step 1: Get login page
      const loginPageResponse = await fetch('https://sso.garmin.com/sso/signin', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
      console.log('✅ Got CSRF token')

      // Step 2: Submit login
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://sso.garmin.com/sso/signin',
          'Cookie': this.getCookieHeader()
        },
        body: loginData.toString(),
        redirect: 'manual'
      })

      this.updateCookies(loginResponse)

      // Check for successful authentication
      if (loginResponse.status === 302) {
        const location = loginResponse.headers.get('location')
        if (location && location.includes('ticket')) {
          console.log('✅ Authentication successful')
          return
        }
      }

      const responseText = await loginResponse.text()
      if (responseText.includes('Invalid username or password')) {
        throw new Error('Invalid username or password')
      }

      throw new Error(`Authentication failed with status: ${loginResponse.status}`)

    } catch (error) {
      console.error('❌ Authentication failed:', error)
      throw error
    }
  }

  async getHRVData(date: string): Promise<any> {
    console.log('📊 Fetching HRV data for:', date)
    
    const response = await fetch(`https://connect.garmin.com/modern/proxy/usersummary-service/usersummary/daily/${date}`, {
      headers: {
        'Cookie': this.getCookieHeader(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch HRV data: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ HRV data fetched successfully')
    return data
  }
}

serve(async (req) => {
  console.log('✅ Function called successfully!')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Request body:', body)
    
    const { date } = body
    if (!date) {
      return new Response(
        JSON.stringify({ error: 'Date parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
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

    // Try to fetch some basic data
    try {
      const hrvData = await garminClient.getHRVData(date)
      
      // Store the data
      await supabase
        .from('garmin_raw_data')
        .upsert({
          user_id: userId,
          data_date: date,
          data_type: 'hrv',
          raw_json: hrvData,
          processed: false
        })

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
          data_points_synced: 1,
          sync_timestamp: new Date().toISOString()
        })

      console.log('✅ Sync completed successfully')

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Garmin data synced successfully',
          data: { hrv: hrvData }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )

    } catch (dataError) {
      console.error('❌ Error fetching data:', dataError)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch Garmin data', 
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