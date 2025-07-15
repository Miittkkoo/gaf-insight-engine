// Mock Data Service for GAF-System Demonstration

import { DailyMetrics, AnalysisReport, DetectedPattern } from '@/types/gaf';

export class MockDataService {
  private static instance: MockDataService;

  static getInstance(): MockDataService {
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService();
    }
    return MockDataService.instance;
  }

  async getDailyMetrics(userId: string, date: Date): Promise<DailyMetrics> {
    // Simulate API call delay
    await this.delay(500);

    const mockMetrics: DailyMetrics = {
      id: `metrics-${date.toISOString().split('T')[0]}`,
      userId,
      date,
      garmin: {
        hrv: {
          score: 45 + Math.random() * 20,
          sevenDayAvg: 48 + Math.random() * 15,
          status: this.getRandomStatus(['balanced', 'unbalanced', 'low']),
          lastNight: 40 + Math.random() * 25
        },
        bodyBattery: {
          start: 85 + Math.random() * 10,
          end: 25 + Math.random() * 20,
          min: 15 + Math.random() * 10,
          max: 95 + Math.random() * 5,
          charged: 70 + Math.random() * 15,
          drained: 60 + Math.random() * 20
        },
        sleep: {
          duration: 420 + Math.random() * 120, // 7-9 hours
          deepSleep: 60 + Math.random() * 40,
          lightSleep: 240 + Math.random() * 80,
          remSleep: 90 + Math.random() * 40,
          awake: 10 + Math.random() * 20,
          quality: this.getRandomStatus(['poor', 'fair', 'good', 'excellent'])
        },
        stress: {
          avg: 20 + Math.random() * 40,
          max: 60 + Math.random() * 30,
          restingPeriods: 4 + Math.random() * 6
        },
        activities: this.generateRandomActivities(),
        steps: 8000 + Math.random() * 4000,
        calories: 2200 + Math.random() * 600,
        activeMinutes: 45 + Math.random() * 60
      },
      manual: {
        workHours: 6 + Math.random() * 4,
        alcoholUnits: Math.random() * 3,
        caffeineIntake: 200 + Math.random() * 200,
        waterIntake: 2000 + Math.random() * 1000,
        medications: [],
        supplements: ['Vitamin D', 'Omega-3']
      },
      frameworkScore: this.generateFrameworkScore(),
      analysis: {
        patterns: [],
        recommendations: [],
        alerts: []
      },
      metadata: {
        analyzed: false,
        analysisTimestamp: new Date(),
        dataCompleteness: 85 + Math.random() * 15,
        version: '1.0.0'
      }
    };

    return mockMetrics;
  }

  async getHistoricalData(userId: string, days: number = 30): Promise<DailyMetrics[]> {
    await this.delay(300);

    const historical: DailyMetrics[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const metrics = await this.getDailyMetrics(userId, date);
      historical.push(metrics);
    }

    return historical;
  }

  async getDetectedPatterns(userId: string): Promise<DetectedPattern[]> {
    await this.delay(400);

    return [
      {
        id: 'pattern-1',
        userId,
        pattern: {
          name: 'Alcohol Impact on HRV',
          type: 'lifestyle',
          trigger: 'alcohol_consumption',
          outcome: 'reduced_hrv',
          timeDelay: 24 // hours
        },
        statistics: {
          occurrences: 12,
          successRate: 0.78,
          avgImpact: -15.5,
          lastOccurred: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          firstIdentified: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
        },
        evidence: [],
        recommendations: {
          avoid: ['Alcohol consumption after 8 PM', 'Multiple drinks per session'],
          optimize: ['Hydration before/after alcohol', 'Light meal with alcohol'],
          monitor: ['HRV next morning', 'Sleep quality', 'Recovery metrics']
        }
      },
      {
        id: 'pattern-2',
        userId,
        pattern: {
          name: 'Sleep Duration Optimization',
          type: 'health',
          trigger: 'sleep_duration_8plus',
          outcome: 'improved_recovery',
          timeDelay: 8
        },
        statistics: {
          occurrences: 20,
          successRate: 0.85,
          avgImpact: 12.3,
          lastOccurred: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          firstIdentified: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        },
        evidence: [],
        recommendations: {
          avoid: ['Screen time 1h before bed', 'Caffeine after 2 PM', 'Large meals before bed'],
          optimize: ['Consistent bedtime', 'Cool room temperature', 'Blackout curtains'],
          monitor: ['Sleep stages', 'HRV trend', 'Morning readiness']
        }
      }
    ];
  }

  async generateAnalysisReport(userId: string, date: Date): Promise<AnalysisReport> {
    await this.delay(1000);

    const report: AnalysisReport = {
      id: `report-${date.toISOString().split('T')[0]}`,
      userId,
      date,
      type: 'daily',
      findings: {
        keyInsights: [
          'HRV shows positive 7-day trend indicating improving recovery',
          'Sleep quality correlates strongly with next-day performance',
          'Stress management through meditation shows measurable benefits'
        ],
        validatedPatterns: [
          {
            pattern: 'alcohol_hrv_impact',
            confidence: 0.82,
            historicalSuccess: 0.78,
            recommendation: 'Limit alcohol to weekends, monitor recovery impact'
          }
        ],
        anomalies: [
          {
            metric: 'body_battery',
            expected: 75,
            actual: 45,
            significance: 'moderate'
          }
        ]
      },
      executiveSummary: {
        overallStatus: 'Good with optimization opportunities',
        criticalAreas: ['Energy management', 'Stress reduction'],
        topRecommendations: [
          'Prioritize 8+ hours sleep',
          'Implement midday stress break',
          'Monitor alcohol impact patterns'
        ],
        riskAssessment: 'Low risk, stable trends'
      },
      detailedReport: this.generateDetailedReport(),
      metadata: {
        processingTime: 2340,
        dataPoints: 156,
        confidence: 0.87,
        version: '1.0.0'
      }
    };

    return report;
  }

  private generateRandomActivities() {
    const activities = [];
    const activityTypes = ['Running', 'Cycling', 'Swimming', 'Strength', 'Yoga', 'Walking'];
    
    const numActivities = Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numActivities; i++) {
      activities.push({
        type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        duration: 30 + Math.random() * 90,
        calories: 200 + Math.random() * 400,
        distance: 2 + Math.random() * 8,
        avgHeartRate: 120 + Math.random() * 40,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
      });
    }
    
    return activities;
  }

  private generateFrameworkScore() {
    const dimensions = ['koerper', 'mind', 'soul', 'dimension4', 'dimension5', 'dimension6', 'dimension7'];
    const frameworkDimensions: any = {};
    
    let total = 0;
    
    dimensions.forEach(dim => {
      const score = parseFloat((2 + Math.random() * 1).toFixed(1));
      total += score;
      
      frameworkDimensions[dim] = {
        score,
        status: this.getStatusFromScore(score),
        trend: this.getRandomStatus(['improving', 'stable', 'declining'])
      };
    });

    return {
      total: parseFloat(total.toFixed(1)),
      dimensions: frameworkDimensions
    };
  }

  private getStatusFromScore(score: number): string {
    if (score >= 2.5) return 'optimal';
    if (score >= 2.0) return 'good';
    if (score >= 1.5) return 'needs_attention';
    return 'critical';
  }

  private getRandomStatus(statuses: string[]): any {
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private generateDetailedReport(): string {
    return `
# GAF-System Tagesanalyse

## Executive Summary
Ihre heutige Gesamtverfassung zeigt eine **gute Baseline** mit spezifischen Optimierungsmöglichkeiten.

## Schlüssel-Metriken

### HRV & Recovery
- **Aktueller HRV**: 52ms (↗ +8% zu 7-Tage-Durchschnitt)
- **Recovery Status**: Optimal für moderate Belastung
- **Trend**: Positive Entwicklung über letzte 5 Tage

### Schlaf-Analyse
- **Gesamtdauer**: 7h 55min (✓ Zielbereich)
- **Tiefschlaf**: 1h 25min (85% von optimal)
- **Schlafqualität**: Gut, konsistente Erholung

### Stress & Energie
- **Durchschnittsstress**: 32/100 (Niedrig)
- **Body Battery**: 68% aktuell
- **Regenerationsphasen**: 6 Episoden erkannt

## Erkannte Muster

### 🟢 Positive Patterns
1. **Optimal Sleep Recovery**: 8+ Stunden Schlaf → +15% HRV Verbesserung
2. **Stress Management**: Meditation korreliert mit besserer Recovery

### 🟡 Attention Areas
1. **Energy Depletion**: Body Battery unter 30% häufiger als optimal
2. **Alkohol Impact**: 24-48h verzögerte HRV Reduktion nach Konsum

## Handlungsempfehlungen

### Sofort (Heute)
- ✅ **Stress-Break**: 10min Meditation um 15:00
- ✅ **Hydration**: Ziel 2.5L Wasser
- ✅ **Early Bed**: Vor 22:30 schlafen für optimale Recovery

### Diese Woche
- 📊 **Pattern Tracking**: Alkohol-HRV Korrelation dokumentieren
- 🏃‍♂️ **Active Recovery**: Leichte Bewegung an Ruhetagen
- 📱 **Screen Time**: Reduzierung 1h vor Bettzeit

### Langfristig
- 📈 **Framework Optimization**: Dimension "Mind" auf 2.8+ steigern
- 🔄 **Pattern Validation**: 30-Tage Interventions-Tracking
- 📊 **Quarterly Review**: Gesamtframework-Assessment

## Risiko-Assessment
**Aktuelles Risiko**: Niedrig
**Trend**: Stabil bis verbessernd
**Kritische Bereiche**: Keine akuten Warnzeichen

---
*Report generiert: ${new Date().toLocaleString('de-DE')} | GAF-System v1.0.0*
    `.trim();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mockDataService = MockDataService.getInstance();