import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('✅ Function called - checking where it crashes...')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request handled')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Step 1: Parsing request body...')
    const body = await req.json()
    console.log('Step 1 SUCCESS - body:', body)
    
    console.log('Step 2: Creating Supabase client...')
    
    // MINIMAL Supabase import test
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    console.log('Step 2a: Import successful')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Step 2b: Env vars exist:', !!supabaseUrl, !!supabaseKey)
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('Step 2 SUCCESS - Supabase client created')
    
    console.log('Step 3: Checking auth header...')
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No auth header')
    }
    console.log('Step 3 SUCCESS - Auth header exists')
    
    console.log('Step 4: Parsing JWT...')
    const jwt = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    const userId = payload.sub
    console.log('Step 4 SUCCESS - User ID:', userId)
    
    console.log('Step 5: Database query test...')
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('garmin_credentials_encrypted')
      .eq('id', userId)
      .single()
    
    if (profileError) {
      console.log('Step 5 ERROR:', profileError)
      throw profileError
    }
    console.log('Step 5 SUCCESS - Profile found:', !!profile)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'All steps completed successfully',
        userId: userId,
        hasCredentials: !!profile?.garmin_credentials_encrypted
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error at step:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Function error', 
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})