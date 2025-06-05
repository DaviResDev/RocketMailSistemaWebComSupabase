
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, TrendingUp, Target, Gauge } from 'lucide-react';

interface OptimizedProgressProps {
  progress: {
    current: number;
    total: number;
    percentage: number;
    throughput: number;
    estimatedTimeRemaining: number;
    startTime: number;
  };
  isProcessing: boolean;
}

export const OptimizedProgressMonitor: React.FC<OptimizedProgressProps> = ({
  progress,
  isProcessing
}) => {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getElapsedTime = () => {
    if (!progress.startTime) return 0;
    return Date.now() - progress.startTime;
  };

  const getPerformanceColor = (throughput: number) => {
    if (throughput >= 8) return 'text-green-600';
    if (throughput >= 5) return 'text-blue-600';
    if (throughput >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isProcessing && progress.current === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Monitor de Performance Otimizado
          {isProcessing && (
            <Badge variant="outline" className="ml-2 animate-pulse">
              Processando...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span className="font-mono">{progress.current} / {progress.total}</span>
          </div>
          <Progress value={progress.percentage} className="h-3" />
          <div className="text-center text-lg font-bold text-blue-600">
            {progress.percentage.toFixed(1)}%
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <Gauge className="h-4 w-4 mr-1 text-blue-500" />
              <span className="text-xs text-muted-foreground">Taxa</span>
            </div>
            <div className={`text-lg font-bold ${getPerformanceColor(progress.throughput)}`}>
              {progress.throughput.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">emails/s</div>
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <Clock className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-xs text-muted-foreground">Tempo Decorrido</span>
            </div>
            <div className="text-lg font-bold text-green-600">
              {formatTime(getElapsedTime())}
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <TrendingUp className="h-4 w-4 mr-1 text-purple-500" />
              <span className="text-xs text-muted-foreground">Restante</span>
            </div>
            <div className="text-lg font-bold text-purple-600">
              {formatTime(progress.estimatedTimeRemaining)}
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center">
              <Target className="h-4 w-4 mr-1 text-orange-500" />
              <span className="text-xs text-muted-foreground">Meta</span>
            </div>
            <div className="text-lg font-bold text-orange-600">
              8.0 emails/s
            </div>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="border rounded-lg p-3 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                progress.throughput >= 8 ? 'bg-green-500' :
                progress.throughput >= 5 ? 'bg-blue-500' :
                progress.throughput >= 3 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="font-medium">
                {progress.throughput >= 8 ? 'Performance Excelente' :
                 progress.throughput >= 5 ? 'Performance Boa' :
                 progress.throughput >= 3 ? 'Performance Moderada' : 'Performance Baixa'}
              </span>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-1 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
          </div>
        </div>

        {/* Technical Details */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
          <div className="flex justify-between">
            <span>Processamento Paralelo:</span>
            <span className="font-mono">15 simultâneos</span>
          </div>
          <div className="flex justify-between">
            <span>Lotes de:</span>
            <span className="font-mono">25 emails</span>
          </div>
          <div className="flex justify-between">
            <span>Otimização SMTP:</span>
            <span className="font-mono text-green-600">Ativa</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
