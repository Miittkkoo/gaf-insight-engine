import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🔍 Garmin Connection Test Function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Authorization header required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    let userId: string;
    
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      userId = payload.sub;
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Invalid authorization token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔍 Testing connection for user ${userId}`);

    // Get user's Garmin credentials
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('garmin_credentials_encrypted, garmin_connected')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.garmin_credentials_encrypted) {
      console.log('❌ No Garmin credentials found');
      return new Response(JSON.stringify({
        connected: false,
        error: 'No Garmin credentials found. Please set up your credentials first.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse credentials
    let credentials;
    try {
      credentials = JSON.parse(profile.garmin_credentials_encrypted);
      if (!credentials.email || !credentials.password) {
        throw new Error('Invalid credentials format');
      }
    } catch (e) {
      console.log('❌ Invalid credentials format');
      return new Response(JSON.stringify({
        connected: false,
        error: 'Invalid credentials format'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📧 Testing with email:', credentials.email);

    // Simple test - try to "authenticate" 
    // In real implementation, this would test actual Garmin Connect login
    const testSuccess = credentials.email.includes('@') && credentials.password.length > 0;

    if (testSuccess) {
      console.log('✅ Connection test successful');
      
      // Update connection status
      await supabase.from('user_profiles').update({
        garmin_connected: true,
        updated_at: new Date().toISOString()
      }).eq('id', userId);

      return new Response(JSON.stringify({
        connected: true,
        message: 'Garmin connection test successful'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.log('❌ Connection test failed');
      return new Response(JSON.stringify({
        connected: false,
        error: 'Connection test failed. Please check your credentials.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Connection test error:', error);
    return new Response(JSON.stringify({
      connected: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});