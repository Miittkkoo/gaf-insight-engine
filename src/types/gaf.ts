// GAF-System Type Definitions

export interface User {
  id: string;
  email: string;
  profile: {
    name: string;
    timezone: string;
    garminConnected: boolean;
    settings: {
      notificationPreferences: {
        dailyAnalysis: boolean;
        criticalAlerts: boolean;
        weeklyReports: boolean;
      };
      analysisTime: string;
      language: string;
    };
  };
  created: Date;
  lastActive: Date;
}

export interface GarminData {
  hrv: {
    score: number;
    sevenDayAvg: number;
    status: 'balanced' | 'unbalanced' | 'low';
    lastNight: number;
  };
  bodyBattery: {
    start: number;
    end: number;
    min: number;
    max: number;
    charged: number;
    drained: number;
  };
  sleep: {
    duration: number;
    deepSleep: number;
    lightSleep: number;
    remSleep: number;
    awake: number;
    quality: 'poor' | 'fair' | 'good' | 'excellent';
  };
  stress: {
    avg: number;
    max: number;
    restingPeriods: number;
  };
  activities: Activity[];
  steps: number;
  calories: number;
  activeMinutes: number;
}

export interface Activity {
  type: string;
  duration: number;
  calories: number;
  distance: number;
  avgHeartRate: number;
  timestamp: Date;
}

export interface ManualData {
  workHours: number;
  alcoholUnits: number;
  caffeineIntake: number;
  waterIntake: number;
  medications: string[];
  supplements: string[];
}

export interface FrameworkDimension {
  score: number;
  status: string;
  trend: string;
}

export interface FrameworkScore {
  total: number;
  dimensions: {
    koerper: FrameworkDimension;
    mind: FrameworkDimension;
    soul: FrameworkDimension;
    dimension4: FrameworkDimension;
    dimension5: FrameworkDimension;
    dimension6: FrameworkDimension;
    dimension7: FrameworkDimension;
  };
}

export interface Pattern {
  type: string;
  confidence: number;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface Recommendation {
  priority: number;
  category: string;
  action: string;
  expectedROI: number;
  timing: 'immediate' | 'today' | 'this_week';
}

export interface Alert {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  triggered: Date;
}

export interface AnalysisResults {
  patterns: Pattern[];
  recommendations: Recommendation[];
  alerts: Alert[];
}

export interface DailyMetrics {
  id: string;
  userId: string;
  date: Date;
  garmin: GarminData;
  manual: ManualData;
  frameworkScore: FrameworkScore;
  analysis: AnalysisResults;
  metadata: {
    analyzed: boolean;
    analysisTimestamp: Date;
    dataCompleteness: number;
    version: string;
  };
}

export interface AnalysisReport {
  id: string;
  userId: string;
  date: Date;
  type: 'daily' | 'weekly' | 'retrospective' | 'emergency';
  findings: {
    keyInsights: string[];
    validatedPatterns: {
      pattern: string;
      confidence: number;
      historicalSuccess: number;
      recommendation: string;
    }[];
    anomalies: {
      metric: string;
      expected: number;
      actual: number;
      significance: string;
    }[];
  };
  executiveSummary: {
    overallStatus: string;
    criticalAreas: string[];
    topRecommendations: string[];
    riskAssessment: string;
  };
  detailedReport: string;
  metadata: {
    processingTime: number;
    dataPoints: number;
    confidence: number;
    version: string;
  };
}

export interface DetectedPattern {
  id: string;
  userId: string;
  pattern: {
    name: string;
    type: 'lifestyle' | 'health' | 'performance';
    trigger: string;
    outcome: string;
    timeDelay: number;
  };
  statistics: {
    occurrences: number;
    successRate: number;
    avgImpact: number;
    lastOccurred: Date;
    firstIdentified: Date;
  };
  evidence: {
    date: Date;
    metrics: Record<string, any>;
    outcome: string;
    confidence: number;
  }[];
  recommendations: {
    avoid: string[];
    optimize: string[];
    monitor: string[];
  };
}