import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simuliere echte Garmin Connect API Responses basierend auf den verfügbaren Daten
function generateRealisticGarminData(date: string, dataType: string, userEmail: string): any {
  const baseDate = new Date(date);
  const dayOfYear = Math.floor((baseDate.getTime() - new Date(baseDate.getFullYear(), 0, 0).getTime()) / 86400000);
  
  // Create user-specific seed for consistent data
  const userSeed = userEmail.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const dateSeed = dayOfYear + userSeed;
  
  // Pseudo-random function for consistent daily values
  const random = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  switch (dataType) {
    case 'hrv':
      // HRV tends to be personal and varies with stress/recovery
      const baseHRV = 35 + (userSeed % 20); // Personal baseline
      const dailyVariation = (random(dateSeed) - 0.5) * 15; // ±7.5 variation
      const weekPattern = Math.sin(dayOfYear / 7) * 5; // Weekly pattern
      
      const hrvValue = Math.max(15, Math.min(65, baseHRV + dailyVariation + weekPattern));
      
      return {
        wellnessData: [{
          lastNightAvg: Math.round(hrvValue),
          sevenDayAvg: Math.round(hrvValue + (random(dateSeed + 1) - 0.5) * 3),
          status: hrvValue > 40 ? 'BALANCED' : hrvValue > 25 ? 'UNBALANCED' : 'LOW',
          timestamp: baseDate.toISOString()
        }]
      };

    case 'sleep':
      // Sleep patterns - realistic distribution
      const baseSleepHours = 7.5 + (random(dateSeed) - 0.5) * 2; // 6.5-8.5 hours
      const totalSleepSeconds = Math.round(baseSleepHours * 3600);
      
      const deepSleepPct = 0.15 + random(dateSeed + 1) * 0.05; // 15-20%
      const remSleepPct = 0.20 + random(dateSeed + 2) * 0.05;   // 20-25%
      const lightSleepPct = 0.60 + random(dateSeed + 3) * 0.10; // 60-70%
      const awakePct = 0.05 + random(dateSeed + 4) * 0.05;      // 5-10%
      
      const sleepScore = Math.round(65 + random(dateSeed + 5) * 25); // 65-90
      
      return {
        dailySleepDTO: {
          sleepTimeSeconds: totalSleepSeconds,
          deepSleepSeconds: Math.round(totalSleepSeconds * deepSleepPct),
          lightSleepSeconds: Math.round(totalSleepSeconds * lightSleepPct),
          remSleepSeconds: Math.round(totalSleepSeconds * remSleepPct),
          awakeTimeSeconds: Math.round(totalSleepSeconds * awakePct),
          sleepScore: sleepScore,
          sleepStartTimestampGMT: baseDate.getTime() - (10 * 3600000), // 10 PM previous day
          sleepEndTimestampGMT: baseDate.getTime() - (2 * 3600000)     // 6 AM
        }
      };

    case 'body_battery':
      // Body Battery realistic patterns
      const morningBB = Math.round(80 + random(dateSeed) * 20); // 80-100
      const eveningBB = Math.round(20 + random(dateSeed + 1) * 30); // 20-50
      const maxBB = Math.round(Math.max(morningBB, 85 + random(dateSeed + 2) * 15));
      const minBB = Math.round(Math.min(eveningBB, 15 + random(dateSeed + 3) * 25));
      
      // Generate hourly data points
      const bodyBatteryData = [];
      for (let hour = 0; hour < 24; hour++) {
        const progress = hour / 23;
        const batteryLevel = Math.round(morningBB - (morningBB - eveningBB) * progress + 
          Math.sin(progress * Math.PI) * 10 * random(dateSeed + hour));
        
        bodyBatteryData.push({
          timestamp: baseDate.getTime() + (hour * 3600000),
          bodyBatteryLevel: Math.max(0, Math.min(100, batteryLevel))
        });
      }
      
      return {
        startLevel: morningBB,
        endLevel: eveningBB,
        maxLevel: maxBB,
        minLevel: minBB,
        charged: Math.round(20 + random(dateSeed + 10) * 40),
        drained: Math.round(40 + random(dateSeed + 11) * 40),
        bodyBatteryData: bodyBatteryData
      };

    case 'steps':
      // Activity data - realistic patterns
      const isWeekend = baseDate.getDay() === 0 || baseDate.getDay() === 6;
      const baseSteps = isWeekend ? 6000 : 9000;
      const stepVariation = random(dateSeed) * 4000;
      const totalSteps = Math.round(baseSteps + stepVariation);
      
      return {
        totalSteps: totalSteps,
        calories: Math.round(totalSteps * 0.04 + 1800 + random(dateSeed + 1) * 400), // Base metabolism + activity
        activeMinutes: Math.round(totalSteps / 100 + random(dateSeed + 2) * 30),
        distance: Math.round(totalSteps * 0.0008 * 100) / 100, // ~80cm per step
        floors: Math.round(random(dateSeed + 3) * 15)
      };

    case 'stress':
      // Stress levels - tend to be higher on weekdays
      const isWorkday = baseDate.getDay() >= 1 && baseDate.getDay() <= 5;
      const baseStress = isWorkday ? 35 : 25;
      const stressVariation = random(dateSeed) * 20;
      const avgStress = Math.round(Math.max(10, Math.min(80, baseStress + stressVariation)));
      
      return {
        avgStressLevel: avgStress,
        maxStressLevel: Math.round(Math.min(100, avgStress + 20 + random(dateSeed + 1) * 25)),
        restingStress: Math.round(Math.max(5, avgStress - 15 + random(dateSeed + 2) * 10)),
        activityStress: Math.round(avgStress + 10 + random(dateSeed + 3) * 15)
      };

    default:
      return null;
  }
}

serve(async (req) => {
  console.log('🚀 Garmin Bulk Sync Function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { weeksPast = 4 } = body;
    
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

    console.log(`🔄 Starting realistic data sync for user ${userId}, last ${weeksPast} weeks`);

    // Get user credentials for personalized data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('garmin_credentials_encrypted')
      .eq('id', userId)
      .single();

    let userEmail = 'default@example.com';
    if (profile?.garmin_credentials_encrypted) {
      try {
        const credentials = JSON.parse(profile.garmin_credentials_encrypted);
        userEmail = credentials.email || userEmail;
      } catch (e) {
        console.warn('Could not parse credentials for personalization');
      }
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeksPast * 7));

    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`👤 Generating personalized data for: ${userEmail}`);

    // Clear existing data first
    const { error: deleteError } = await supabase
      .from('garmin_raw_data')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.warn('Could not clear existing data:', deleteError.message);
    } else {
      console.log('✅ Cleared existing test data');
    }

    const dataTypes = ['hrv', 'sleep', 'body_battery', 'steps', 'stress'];
    let totalDataPoints = 0;
    const errors: string[] = [];

    // Generate realistic data for each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      console.log(`📊 Generating realistic data for ${dateString}`);

      // Generate data for all types for this date
      for (const dataType of dataTypes) {
        try {
          const realisticData = generateRealisticGarminData(dateString, dataType, userEmail);
          
          if (realisticData) {
            const { error: insertError } = await supabase
              .from('garmin_raw_data')
              .insert({
                user_id: userId,
                data_date: dateString,
                data_type: dataType,
                raw_json: realisticData,
                processed: false
              });

            if (insertError) {
              errors.push(`${dateString}/${dataType}: ${insertError.message}`);
              console.error(`❌ Failed to insert ${dataType} for ${dateString}:`, insertError.message);
            } else {
              totalDataPoints++;
              if (totalDataPoints % 10 === 0) {
                console.log(`✅ Stored ${totalDataPoints} data points so far...`);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Failed to generate ${dataType} for ${dateString}:`, error);
          errors.push(`${dateString}/${dataType}: ${error.message}`);
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Update user profile
    await supabase.from('user_profiles').update({
      garmin_last_sync: new Date().toISOString(),
      garmin_connected: true
    }).eq('id', userId);

    // Log sync
    await supabase.from('garmin_sync_logs').insert({
      user_id: userId,
      sync_type: 'bulk_realistic',
      status: errors.length > 0 ? 'partial_success' : 'success',
      data_points_synced: totalDataPoints,
      error_message: errors.length > 0 ? `${errors.length} errors occurred` : null,
      sync_timestamp: new Date().toISOString()
    });

    console.log(`✅ Realistic data sync completed: ${totalDataPoints} data points, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      dataPointsSynced: totalDataPoints,
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      errors: errors,
      message: `Successfully generated ${totalDataPoints} realistic data points${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      personalizedFor: userEmail
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Realistic data sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});