// GAF Analysis Engine - Core Intelligence System

import { DailyMetrics, AnalysisResults, Pattern, Recommendation, Alert } from '@/types/gaf';
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

  private async integrateGarminData(userId: string, date: Date) {
    try {
      // Try to get real Garmin data via Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        const response = await fetch('/functions/v1/garmin-sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            date: date.toISOString().split('T')[0] 
          }),
        });

        if (response.ok) {
          const { data: garminData } = await response.json();
          return this.applyHRVTimingLogic(garminData, date);
        }
      }
    } catch (error) {
    }
    
    console.warn('Failed to fetch Garmin data, returning null for analysis');
    return null;
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
    const patterns: Pattern[] = [];

    // HRV-Sleep Pattern
    if (results.garmin.sleep.duration < 420) { // Less than 7 hours
      patterns.push({
        type: 'sleep_hrv_correlation',
        confidence: 0.85,
        description: 'Unzureichender Schlaf korreliert negativ mit HRV Recovery',
        impact: 'negative'
      });
    }

    // Body Battery Pattern
    if (results.garmin.bodyBattery.end < 30) {
      patterns.push({
        type: 'energy_depletion',
        confidence: 0.78,
        description: 'Kritische Energieerschöpfung erkannt - Regeneration erforderlich',
        impact: 'negative'
      });
    }

    // Positive Recovery Pattern
    if (results.garmin.hrv.score > results.garmin.hrv.sevenDayAvg * 1.1) {
      patterns.push({
        type: 'optimal_recovery',
        confidence: 0.92,
        description: 'Überdurchschnittliche Recovery - optimale Leistungsbereitschaft',
        impact: 'positive'
      });
    }

    return patterns;
  }

  private async generateRecommendations(results: any): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // HRV-based recommendations
    if (results.garmin.hrv.score < 35) {
      recommendations.push({
        priority: 1,
        category: 'Recovery',
        action: 'Aktive Regeneration: Leichte Bewegung, Meditation, früh schlafen',
        expectedROI: 0.85,
        timing: 'immediate'
      });
    }

    // Sleep optimization
    if (results.garmin.sleep.duration < 420) {
      recommendations.push({
        priority: 2,
        category: 'Sleep',
        action: 'Schlafzeit um 30-60 Minuten verlängern für optimale Recovery',
        expectedROI: 0.75,
        timing: 'today'
      });
    }

    // Stress management
    if (results.garmin.stress.avg > 50) {
      recommendations.push({
        priority: 3,
        category: 'Stress',
        action: 'Stress-Reduktion durch Atemübungen oder kurze Meditation',
        expectedROI: 0.65,
        timing: 'immediate'
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private async detectCriticalAlerts(results: any): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Critical HRV Alert
    if (results.garmin.hrv.score < 25) {
      alerts.push({
        severity: 'critical',
        message: 'HRV kritisch niedrig - Sofortige Regeneration erforderlich',
        triggered: new Date()
      });
    }

    // Body Battery Warning
    if (results.garmin.bodyBattery.end < 20) {
      alerts.push({
        severity: 'warning',
        message: 'Body Battery kritisch niedrig - Energiemanagement erforderlich',
        triggered: new Date()
      });
    }

    // Sleep Quality Alert
    if (results.garmin.sleep.quality === 'poor') {
      alerts.push({
        severity: 'warning',
        message: 'Schlechte Schlafqualität erkannt - Schlafhygiene optimieren',
        triggered: new Date()
      });
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