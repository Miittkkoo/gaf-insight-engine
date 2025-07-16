// GAF Analysis Engine - Core Intelligence System

import { DailyMetrics, AnalysisResults, Pattern, Recommendation, Alert, GarminData } from '@/types/gaf';
import { supabase } from '@/integrations/supabase/client';

export class GAFAnalysisEngine {
  private readonly phases = [
    'timeContextPrep',
    'databaseResearch',
    'garminIntegration',
    'frameworkAssessment',
    'patternAnalysis',
    'recommendations',
    'databaseUpdate',
    'executiveReport'
  ];

  async runFullAnalysis(userId: string, date: Date, analysisType: string = 'daily'): Promise<AnalysisResults> {
    console.log(`🔬 Starting GAF Analysis for user ${userId} on ${date.toISOString()}`);
    
    const startTime = performance.now();
    const results: any = {};

    try {
      // Phase 1: Time Context & Data Preparation
      results.context = await this.prepareTimeContext(userId, date);
      console.log('✅ Phase 1: Time Context prepared');

      // Phase 2: Historical Database Research
      results.historical = await this.researchHistoricalData(userId, date);
      console.log('✅ Phase 2: Historical data analyzed');

      // Phase 3: Garmin Data Integration with HRV Timing Logic
      results.garmin = await this.integrateGarminData(userId, date);
      console.log('✅ Phase 3: Garmin data integrated');

      // Phase 4: 7-Dimensional Framework Assessment
      results.framework = await this.assessFramework(results);
      console.log('✅ Phase 4: Framework assessment completed');

      // Phase 5: Advanced Pattern Analysis
      results.patterns = await this.analyzePatterns(results);
      console.log('✅ Phase 5: Pattern analysis completed');

      // Phase 6: Generate Personalized Recommendations
      results.recommendations = await this.generateRecommendations(results);
      console.log('✅ Phase 6: Recommendations generated');

      // Phase 7: Critical Alert Detection
      results.alerts = await this.detectCriticalAlerts(results);
      console.log('✅ Phase 7: Alert analysis completed');

      const processingTime = performance.now() - startTime;
      console.log(`🚀 GAF Analysis completed in ${processingTime.toFixed(2)}ms`);

      return {
        patterns: results.patterns,
        recommendations: results.recommendations,
        alerts: results.alerts
      };

    } catch (error) {
      console.error('❌ GAF Analysis Engine Error:', error);
      throw error;
    }
  }

  private async prepareTimeContext(userId: string, date: Date) {
    // Simulate time context preparation
    return {
      analysisDate: date,
      timezone: 'Europe/Zurich',
      dayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      seasonality: this.getSeasonality(date)
    };
  }

  private async researchHistoricalData(userId: string, date: Date) {
    // Simulate historical data research
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const pastDate = new Date(date);
      pastDate.setDate(pastDate.getDate() - i);
      return {
        date: pastDate,
        hrvScore: 45 + Math.random() * 20,
        sleepQuality: Math.random() * 100,
        stressLevel: Math.random() * 100
      };
    });

    return {
      dataPoints: last30Days.length,
      avgHRV: last30Days.reduce((sum, day) => sum + day.hrvScore, 0) / last30Days.length,
      trends: this.calculateTrends(last30Days)
    };
  }

  private async integrateGarminData(userId: string, date: Date): Promise<GarminData | null> {
    try {
      console.log(`🔍 Integrating Garmin data for ${date.toISOString().split('T')[0]}`);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user found');
        return null;
      }

      const { data: rawData, error } = await supabase
        .from('garmin_raw_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('data_date', date.toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching raw Garmin data:', error);
        return null;
      }

      if (!rawData || rawData.length === 0) {
        console.warn(`No Garmin data found for date ${date.toISOString().split('T')[0]}`);
        return null;
      }

      console.log(`✅ Found ${rawData.length} Garmin data entries for ${date.toISOString().split('T')[0]}`);
      const processedData = await this.processRawGarminData(rawData);
      return this.applyHRVTimingLogic(processedData, date);

    } catch (error) {
      console.warn('Failed to fetch Garmin data, returning null for analysis');
      return null;
    }
  }

  private async processRawGarminData(rawDataArray: any[]): Promise<GarminData | null> {
    if (!rawDataArray || rawDataArray.length === 0) return null;

    console.log('Processing raw Garmin data:', rawDataArray);

    // Initialize result with defaults to prevent NaN and [object Object] errors
    let result: GarminData = {
      hrv: { score: 0, sevenDayAvg: 0, status: 'balanced', lastNight: 0 },
      bodyBattery: { start: 0, end: 0, min: 0, max: 0, charged: 0, drained: 0 },
      sleep: { duration: 0, deepSleep: 0, lightSleep: 0, remSleep: 0, awake: 0, quality: 'fair' },
      stress: { avg: 0, max: 0, restingPeriods: 0 },
      activities: [],
      steps: 0,
      calories: 0,
      activeMinutes: 0,
      lastSync: null
    };

    // Process each data type
    rawDataArray.forEach(item => {
      const { data_type, raw_json } = item;
      
      switch (data_type) {
        case 'hrv':
          if (raw_json?.hrvSummary) {
            const hrv = raw_json.hrvSummary;
            result.hrv = {
              score: hrv.lastNightAvg || 0,
              sevenDayAvg: hrv.sevenDayAvg || hrv.lastNightAvg || 0,
              status: this.mapHRVStatus(hrv.status),
              lastNight: hrv.lastNightAvg || 0
            };
          }
          break;
          
        case 'sleep':
          if (raw_json?.dailySleepDTO) {
            const sleep = raw_json.dailySleepDTO;
            result.sleep = {
              duration: Math.round((sleep.sleepTimeSeconds || 0) / 60),
              deepSleep: Math.round((sleep.deepSleepSeconds || 0) / 60),
              lightSleep: Math.round((sleep.lightSleepSeconds || 0) / 60),
              remSleep: Math.round((sleep.remSleepSeconds || 0) / 60),
              awake: Math.round((sleep.awakeTimeSeconds || 0) / 60),
              quality: this.mapSleepQuality(sleep.sleepScore)
            };
          }
          break;
          
        case 'body_battery':
          if (raw_json) {
            const bodyBatteryLevels = raw_json.bodyBatteryData?.map((d: any) => d.bodyBatteryLevel) || [0];
            result.bodyBattery = {
              start: raw_json.startLevel || 0,
              end: raw_json.endLevel || 0,
              min: Math.min(...bodyBatteryLevels),
              max: Math.max(...bodyBatteryLevels),
              charged: raw_json.charged || 0,
              drained: raw_json.drained || 0
            };
          }
          break;
          
        case 'steps':
          if (raw_json?.dailyMovement) {
            const movement = raw_json.dailyMovement;
            result.steps = movement.totalSteps || 0;
            result.calories = movement.caloriesBurned || 0;
            result.activeMinutes = Math.round((movement.activeTimeSeconds || 0) / 60);
          }
          break;
          
        case 'stress':
          if (raw_json) {
            result.stress = {
              avg: raw_json.avgStressLevel || 0,
              max: raw_json.maxStressLevel || 0,
              restingPeriods: 0 // Not available in current data structure
            };
          }
          break;
      }
    });

    console.log('Processed result:', result);
    return result;
  }

  private mapHRVStatus(status: string | undefined): 'balanced' | 'unbalanced' | 'low' {
    if (!status) return 'balanced';
    
    switch (status.toLowerCase()) {
      case 'balanced':
      case 'optimal':
      case 'good':
        return 'balanced';
      case 'unbalanced':
      case 'poor':
        return 'unbalanced';
      case 'low':
      case 'critical':
        return 'low';
      default:
        return 'balanced';
    }
  }

  private mapSleepQuality(score: number | undefined): 'excellent' | 'good' | 'fair' | 'poor' {
    if (!score) return 'fair';
    
    if (score >= 80) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  private applyHRVTimingLogic(garminData: any, date: Date) {
    // CRITICAL: HRV reflects recovery from previous day
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);

    return {
      ...garminData,
      hrv: {
        ...garminData.hrv,
        reflectsDate: yesterday.toISOString().split('T')[0],
        measurementDate: date.toISOString().split('T')[0],
        canValidatePatterns: date < new Date()
      },
      metadata: {
        timingCorrected: true,
        note: 'HRV values reflect recovery from previous day activities'
      }
    };
  }

  private async assessFramework(results: any) {
    // 7-Dimensional Framework Assessment
    const dimensions = [
      'koerper', 'mind', 'soul', 'dimension4', 
      'dimension5', 'dimension6', 'dimension7'
    ];

    const frameworkScores = dimensions.reduce((acc, dim) => {
      const baseScore = 2 + Math.random() * 1; // 2-3 range
      acc[dim] = {
        score: parseFloat(baseScore.toFixed(1)),
        status: this.getDimensionStatus(baseScore),
        trend: this.getTrend()
      };
      return acc;
    }, {} as Record<string, any>);

    const totalScore = Object.values(frameworkScores)
      .reduce((sum: number, dim: any) => sum + (dim as any).score, 0);

    return {
      total: parseFloat(totalScore.toFixed(1)),
      dimensions: frameworkScores,
      assessment: this.getOverallAssessment(totalScore)
    };
  }

  private async analyzePatterns(results: any): Promise<Pattern[]> {
    console.log('🔍 Starting pattern analysis...');
    
    const patterns: Pattern[] = [];
    
    // Only analyze patterns if we have valid data
    if (results.garmin && typeof results.garmin === 'object') {
      console.log('✅ Valid Garmin data available for pattern analysis');
      
      // Sleep quality vs HRV pattern - with null checks
      if (results.garmin.sleep?.duration && results.garmin.hrv?.score) {
        if (results.garmin.sleep.duration < 420) { // Less than 7 hours
          patterns.push({
            type: 'sleep_hrv_correlation',
            confidence: 0.85,
            description: 'Unzureichender Schlaf korreliert negativ mit HRV Recovery',
            impact: 'negative'
          });
        }
      } else {
        console.log('⚠️ Sleep or HRV data incomplete, skipping sleep-HRV pattern analysis');
      }
      
      // Body Battery pattern - with null checks
      if (results.garmin.bodyBattery?.end !== undefined) {
        if (results.garmin.bodyBattery.end < 30) {
          patterns.push({
            type: 'energy_depletion',
            confidence: 0.78,
            description: 'Kritische Energieerschöpfung erkannt - Regeneration erforderlich',
            impact: 'negative'
          });
        }
      }
      
      // Positive Recovery Pattern - with null checks
      if (results.garmin.hrv?.score && results.garmin.hrv?.sevenDayAvg) {
        if (results.garmin.hrv.score > results.garmin.hrv.sevenDayAvg * 1.1) {
          patterns.push({
            type: 'optimal_recovery',
            confidence: 0.92,
            description: 'Überdurchschnittliche Recovery - optimale Leistungsbereitschaft',
            impact: 'positive'
          });
        }
      }
    } else {
      console.log('⚠️ No valid Garmin data for pattern analysis');
    }
    
    console.log(`✅ Found ${patterns.length} patterns`);
    return patterns;
  }

  private async generateRecommendations(results: any): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Only generate recommendations if we have valid Garmin data
    if (results.garmin && typeof results.garmin === 'object') {
      // HRV-based recommendations
      if (results.garmin.hrv?.score && results.garmin.hrv.score < 35) {
        recommendations.push({
          priority: 1,
          category: 'Recovery',
          action: 'Aktive Regeneration: Leichte Bewegung, Meditation, früh schlafen',
          expectedROI: 0.85,
          timing: 'immediate'
        });
      }

      // Sleep optimization
      if (results.garmin.sleep?.duration && results.garmin.sleep.duration < 420) {
        recommendations.push({
          priority: 2,
          category: 'Sleep',
          action: 'Schlafzeit um 30-60 Minuten verlängern für optimale Recovery',
          expectedROI: 0.75,
          timing: 'today'
        });
      }

      // Stress management
      if (results.garmin.stress?.avg && results.garmin.stress.avg > 50) {
        recommendations.push({
          priority: 3,
          category: 'Stress',
          action: 'Stress-Reduktion durch Atemübungen oder kurze Meditation',
          expectedROI: 0.65,
          timing: 'immediate'
        });
      }
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private async detectCriticalAlerts(results: any): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Only detect alerts if we have valid Garmin data
    if (results.garmin && typeof results.garmin === 'object') {
      // Critical HRV Alert
      if (results.garmin.hrv?.score && results.garmin.hrv.score < 25) {
        alerts.push({
          severity: 'critical',
          message: 'HRV kritisch niedrig - Sofortige Regeneration erforderlich',
          triggered: new Date()
        });
      }

      // Body Battery Warning
      if (results.garmin.bodyBattery?.end !== undefined && results.garmin.bodyBattery.end < 20) {
        alerts.push({
          severity: 'warning',
          message: 'Body Battery kritisch niedrig - Energiemanagement erforderlich',
          triggered: new Date()
        });
      }

      // Sleep Quality Alert
      if (results.garmin.sleep?.quality === 'poor') {
        alerts.push({
          severity: 'warning',
          message: 'Schlechte Schlafqualität erkannt - Schlafhygiene optimieren',
          triggered: new Date()
        });
      }
    }

    return alerts;
  }

  // Helper methods
  private getSeasonality(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private calculateTrends(data: any[]): any {
    // Simple trend calculation
    const recent = data.slice(0, 7);
    const older = data.slice(7, 14);
    
    const recentAvg = recent.reduce((sum, d) => sum + d.hrvScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.hrvScore, 0) / older.length;
    
    return {
      direction: recentAvg > olderAvg ? 'improving' : 'declining',
      magnitude: Math.abs(recentAvg - olderAvg)
    };
  }

  private getHRVStatus(score: number): 'balanced' | 'unbalanced' | 'low' {
    if (score > 50) return 'balanced';
    if (score > 35) return 'unbalanced';
    return 'low';
  }

  private getSleepQuality(duration: number): 'poor' | 'fair' | 'good' | 'excellent' {
    if (duration < 360) return 'poor';
    if (duration < 420) return 'fair';
    if (duration < 540) return 'good';
    return 'excellent';
  }

  private getDimensionStatus(score: number): string {
    if (score >= 2.5) return 'optimal';
    if (score >= 2.0) return 'good';
    if (score >= 1.5) return 'needs_attention';
    return 'critical';
  }

  private getTrend(): string {
    const trends = ['improving', 'stable', 'declining'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private getOverallAssessment(totalScore: number): string {
    if (totalScore >= 18) return 'Excellent overall health status';
    if (totalScore >= 15) return 'Good health status with room for optimization';
    if (totalScore >= 12) return 'Moderate health status - action needed';
    return 'Poor health status - immediate intervention required';
  }
}