import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Heart, 
  Battery, 
  Moon, 
  Brain, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ZapOff,
  Plus,
  BookOpen
} from 'lucide-react';
import { GAFAnalysisEngine } from '@/services/gafAnalysisEngine';
import { AnalysisResults } from '@/types/gaf';
import { PatternTimeline } from '@/components/PatternTimeline';

interface GAFDashboardProps {}

export const GAFDashboard: React.FC<GAFDashboardProps> = () => {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState({
    hrv: { score: 52, status: 'balanced', trend: 'improving' },
    bodyBattery: { current: 68, charged: 85, drained: 45 },
    sleep: { duration: 475, quality: 'good', deepSleep: 85 },
    stress: { avg: 32, status: 'low', restingPeriods: 6 },
    framework: {
      total: 16.8,
      dimensions: {
        koerper: { score: 2.4, status: 'good' },
        mind: { score: 2.6, status: 'optimal' },
        soul: { score: 2.3, status: 'good' },
        dimension4: { score: 2.5, status: 'optimal' },
        dimension5: { score: 2.2, status: 'good' },
        dimension6: { score: 2.4, status: 'good' },
        dimension7: { score: 2.4, status: 'good' }
      }
    }
  });

  const analysisEngine = new GAFAnalysisEngine();

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const results = await analysisEngine.runFullAnalysis(
        'demo-user-id',
        new Date(),
        'daily'
      );
      setAnalysisResults(results);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-run analysis on component mount
    runAnalysis();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'health-optimal';
      case 'good': case 'balanced': return 'health-good';
      case 'warning': case 'unbalanced': return 'health-warning';
      case 'critical': case 'low': return 'health-critical';
      default: return 'muted';
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-health-critical" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-health-warning" />;
      default: return <CheckCircle className="h-4 w-4 text-health-good" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              GAF-System Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Personal Health & Performance Intelligence Platform
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/journal">
              <Button variant="outline" className="hover:bg-muted" size="lg">
                <BookOpen className="w-4 h-4 mr-2" />
                Journal
              </Button>
            </Link>
            <Link to="/daily-entry">
              <Button className="bg-gradient-secondary hover:opacity-90 transition-opacity" size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Daily Entry
              </Button>
            </Link>
            <Button 
              onClick={runAnalysis} 
              disabled={loading}
              className="bg-gradient-primary hover:opacity-90 transition-opacity"
              size="lg"
            >
              {loading ? '🔬 Analyzing...' : '🚀 Run Analysis'}
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* HRV Status */}
        <Card className="p-6 bg-gradient-to-br from-card to-muted border-border shadow-data">
          <div className="flex items-center justify-between mb-4">
            <Heart className="h-8 w-8 text-data-hrv" />
            <Badge className={`bg-${getStatusColor(currentMetrics.hrv.status)}/20 text-${getStatusColor(currentMetrics.hrv.status)}`}>
              {currentMetrics.hrv.status}
            </Badge>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-data-hrv">
              {currentMetrics.hrv.score.toFixed(0)}ms
            </h3>
            <p className="text-sm text-muted-foreground">HRV Score</p>
            <div className="flex items-center text-xs">
              {currentMetrics.hrv.trend === 'improving' ? 
                <TrendingUp className="h-3 w-3 text-health-good mr-1" /> :
                <TrendingDown className="h-3 w-3 text-health-warning mr-1" />
              }
              <span className="text-muted-foreground">{currentMetrics.hrv.trend}</span>
            </div>
          </div>
        </Card>

        {/* Body Battery */}
        <Card className="p-6 bg-gradient-to-br from-card to-muted border-border shadow-data">
          <div className="flex items-center justify-between mb-4">
            <Battery className="h-8 w-8 text-data-performance" />
            <div className="text-right">
              <div className="text-2xl font-bold text-data-performance">
                {currentMetrics.bodyBattery.current}%
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-data-performance h-2 rounded-full transition-all duration-500"
                style={{ width: `${currentMetrics.bodyBattery.current}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Charged: +{currentMetrics.bodyBattery.charged}</span>
              <span>Drained: -{currentMetrics.bodyBattery.drained}</span>
            </div>
          </div>
        </Card>

        {/* Sleep Quality */}
        <Card className="p-6 bg-gradient-to-br from-card to-muted border-border shadow-data">
          <div className="flex items-center justify-between mb-4">
            <Moon className="h-8 w-8 text-data-sleep" />
            <Badge className={`bg-${getStatusColor(currentMetrics.sleep.quality)}/20 text-${getStatusColor(currentMetrics.sleep.quality)}`}>
              {currentMetrics.sleep.quality}
            </Badge>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-data-sleep">
              {Math.floor(currentMetrics.sleep.duration / 60)}h {currentMetrics.sleep.duration % 60}m
            </h3>
            <p className="text-sm text-muted-foreground">Sleep Duration</p>
            <div className="text-xs text-muted-foreground">
              Deep Sleep: {currentMetrics.sleep.deepSleep}min
            </div>
          </div>
        </Card>

        {/* Stress Level */}
        <Card className="p-6 bg-gradient-to-br from-card to-muted border-border shadow-data">
          <div className="flex items-center justify-between mb-4">
            <Brain className="h-8 w-8 text-data-stress" />
            <Badge className={`bg-${getStatusColor(currentMetrics.stress.status)}/20 text-${getStatusColor(currentMetrics.stress.status)}`}>
              {currentMetrics.stress.status}
            </Badge>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-data-stress">
              {currentMetrics.stress.avg.toFixed(0)}
            </h3>
            <p className="text-sm text-muted-foreground">Avg Stress</p>
            <div className="text-xs text-muted-foreground">
              Rest Periods: {currentMetrics.stress.restingPeriods}
            </div>
          </div>
        </Card>
      </div>

      {/* Framework Assessment */}
      <Card className="p-6 mb-8 bg-gradient-surface border-border shadow-elevated">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Activity className="h-6 w-6 mr-2 text-primary" />
          7-Dimensional Framework Assessment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {Object.entries(currentMetrics.framework.dimensions).map(([dim, data]) => (
            <div key={dim} className="text-center">
              <div className="mb-2">
                <div 
                  className="w-16 h-16 rounded-full mx-auto border-4 flex items-center justify-center text-lg font-bold transition-all duration-300 hover:scale-105"
                  style={{
                    borderColor: `hsl(var(--${getStatusColor(data.status)}))`,
                    backgroundColor: `hsl(var(--${getStatusColor(data.status)}) / 0.1)`,
                    color: `hsl(var(--${getStatusColor(data.status)}))`
                  }}
                >
                  {data.score}
                </div>
              </div>
              <p className="text-sm font-medium capitalize">{dim}</p>
              <p className="text-xs text-muted-foreground">{data.status}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {currentMetrics.framework.total}/21
          </div>
          <p className="text-muted-foreground">Overall Framework Score</p>
        </div>
      </Card>

      {/* Pattern Timeline */}
      <div className="mb-8">
        <PatternTimeline />
      </div>

      {/* Analysis Results */}
      {analysisResults && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Patterns */}
          <Card className="p-6 bg-gradient-to-br from-card to-muted border-border">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              Detected Patterns
            </h3>
            <div className="space-y-3">
              {analysisResults.patterns.map((pattern, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-background/50">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    pattern.impact === 'positive' ? 'bg-health-good' :
                    pattern.impact === 'negative' ? 'bg-health-warning' : 'bg-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{pattern.description}</p>
                    <div className="flex items-center mt-1 space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {(pattern.confidence * 100).toFixed(0)}% confident
                      </Badge>
                      <span className={`text-xs ${
                        pattern.impact === 'positive' ? 'text-health-good' :
                        pattern.impact === 'negative' ? 'text-health-warning' : 'text-muted-foreground'
                      }`}>
                        {pattern.impact}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recommendations & Alerts */}
          <Card className="p-6 bg-gradient-to-br from-card to-muted border-border">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-primary" />
              Recommendations & Alerts
            </h3>
            <div className="space-y-4">
              {/* Alerts */}
              {analysisResults.alerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">CRITICAL ALERTS</h4>
                  {analysisResults.alerts.map((alert, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-health-critical/10 border border-health-critical/20">
                      {getAlertIcon(alert.severity)}
                      <p className="text-sm flex-1">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">TOP RECOMMENDATIONS</h4>
                {analysisResults.recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                      {rec.priority}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{rec.action}</p>
                      <div className="flex items-center mt-1 space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {rec.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ROI: {(rec.expectedROI * 100).toFixed(0)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {rec.timing}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Executive Summary Card */}
      <Card className="p-6 bg-gradient-secondary border-border shadow-elevated">
        <h3 className="text-xl font-bold mb-4 flex items-center text-secondary-foreground">
          <Activity className="h-5 w-5 mr-2" />
          Executive Health Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-health-optimal">
              {currentMetrics.framework.total > 18 ? 'Excellent' : 
               currentMetrics.framework.total > 15 ? 'Good' : 
               currentMetrics.framework.total > 12 ? 'Moderate' : 'Poor'}
            </div>
            <p className="text-sm text-muted-foreground">Overall Status</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-data-hrv">
              {currentMetrics.hrv.score > 50 ? 'Optimal' : 
               currentMetrics.hrv.score > 35 ? 'Good' : 'Low'}
            </div>
            <p className="text-sm text-muted-foreground">Recovery Status</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-data-performance">
              {analysisResults ? analysisResults.recommendations.length : 0}
            </div>
            <p className="text-sm text-muted-foreground">Active Recommendations</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-background/50 rounded-lg">
          <p className="text-sm text-secondary-foreground">
            <strong>Key Insight:</strong> Ihr aktueller GAF-Score von {currentMetrics.framework.total}/21 
            zeigt {currentMetrics.framework.total > 15 ? 'eine starke' : 'eine entwicklungsfähige'} Gesamtverfassung. 
            HRV-basierte Recovery ist {currentMetrics.hrv.score > 45 ? 'optimal' : 'verbesserungswürdig'}.
            {analysisResults && analysisResults.patterns.length > 0 && 
              ` ${analysisResults.patterns.length} Verhaltensmuster wurden identifiziert.`
            }
          </p>
        </div>
      </Card>

      {/* Analysis Status */}
      {loading && (
        <Card className="p-8 mt-6 text-center bg-gradient-surface border-border">
          <div className="space-y-4">
            <div className="animate-spin mx-auto w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            <div>
              <h3 className="text-lg font-medium">🔬 GAF Analysis in Progress</h3>
              <p className="text-muted-foreground text-sm">
                Running 8-phase analysis • Pattern recognition • Generating recommendations
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};