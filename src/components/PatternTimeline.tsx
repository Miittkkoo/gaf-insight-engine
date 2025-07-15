import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface PatternTimelineProps {
  patterns?: any[];
  className?: string;
}

export const PatternTimeline: React.FC<PatternTimelineProps> = ({ 
  patterns = [], 
  className = "" 
}) => {
  // Mock pattern data for demonstration
  const mockPatterns = [
    {
      date: '2024-07-15',
      type: 'sleep_optimization',
      impact: 'positive',
      confidence: 0.92,
      description: 'Optimaler Schlaf führte zu +15% HRV Verbesserung',
      metrics: { hrv: 58, sleep: 485 }
    },
    {
      date: '2024-07-14',
      type: 'alcohol_impact',
      impact: 'negative',
      confidence: 0.78,
      description: 'Alkoholkonsum reduzierte HRV um 12% am Folgetag',
      metrics: { hrv: 42, alcohol: 2 }
    },
    {
      date: '2024-07-13',
      type: 'stress_recovery',
      impact: 'neutral',
      confidence: 0.65,
      description: 'Meditation kompensierte hohen Arbeitsstress',
      metrics: { stress: 45, recovery: 78 }
    },
    {
      date: '2024-07-12',
      type: 'training_adaptation',
      impact: 'positive',
      confidence: 0.85,
      description: 'Optimale Trainingsintensität verbesserte Recovery',
      metrics: { hrv: 55, training: 'moderate' }
    }
  ];

  const displayPatterns = patterns.length > 0 ? patterns : mockPatterns;

  const getPatternIcon = (impact: string) => {
    switch (impact) {
      case 'positive':
        return <CheckCircle2 className="h-5 w-5 text-health-optimal" />;
      case 'negative':
        return <AlertCircle className="h-5 w-5 text-health-warning" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPatternColor = (impact: string) => {
    switch (impact) {
      case 'positive':
        return 'border-health-optimal bg-health-optimal/5';
      case 'negative':
        return 'border-health-warning bg-health-warning/5';
      default:
        return 'border-muted bg-muted/20';
    }
  };

  return (
    <Card className={`p-6 bg-gradient-surface border-border shadow-data ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center">
          <Clock className="h-5 w-5 mr-2 text-primary" />
          Pattern Recognition Timeline
        </h3>
        <Badge variant="outline" className="text-xs">
          {displayPatterns.length} patterns detected
        </Badge>
      </div>

      <div className="space-y-4">
        {displayPatterns.map((pattern, index) => (
          <div key={index} className="relative">
            {/* Timeline line */}
            {index < displayPatterns.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-px bg-border" />
            )}
            
            {/* Pattern entry */}
            <div className="flex items-start space-x-4">
              {/* Timeline dot */}
              <div className="relative z-10 mt-1">
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${getPatternColor(pattern.impact)}`}>
                  {getPatternIcon(pattern.impact)}
                </div>
              </div>

              {/* Pattern content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-sm">{pattern.description}</h4>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(pattern.date).toLocaleDateString('de-DE')}
                  </span>
                </div>

                {/* Pattern details */}
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {pattern.type.replace('_', ' ')}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      pattern.impact === 'positive' ? 'text-health-optimal' :
                      pattern.impact === 'negative' ? 'text-health-warning' : 
                      'text-muted-foreground'
                    }`}
                  >
                    {(pattern.confidence * 100).toFixed(0)}% confident
                  </Badge>
                  <span className={`text-xs flex items-center ${
                    pattern.impact === 'positive' ? 'text-health-optimal' :
                    pattern.impact === 'negative' ? 'text-health-warning' : 
                    'text-muted-foreground'
                  }`}>
                    {pattern.impact === 'positive' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : pattern.impact === 'negative' ? (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    ) : null}
                    {pattern.impact}
                  </span>
                </div>

                {/* Metrics visualization */}
                {pattern.metrics && (
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    {Object.entries(pattern.metrics).map(([key, value]) => (
                      <span key={key} className="flex items-center">
                        <span className="capitalize">{key}:</span>
                        <span className="ml-1 font-mono">
                          {typeof value === 'number' ? value.toFixed(0) : String(value)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline summary */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-health-optimal">
              {displayPatterns.filter(p => p.impact === 'positive').length}
            </div>
            <div className="text-xs text-muted-foreground">Positive</div>
          </div>
          <div>
            <div className="text-lg font-bold text-health-warning">
              {displayPatterns.filter(p => p.impact === 'negative').length}
            </div>
            <div className="text-xs text-muted-foreground">Negative</div>
          </div>
          <div>
            <div className="text-lg font-bold text-muted-foreground">
              {displayPatterns.filter(p => p.impact === 'neutral').length}
            </div>
            <div className="text-xs text-muted-foreground">Neutral</div>
          </div>
        </div>
      </div>
    </Card>
  );
};