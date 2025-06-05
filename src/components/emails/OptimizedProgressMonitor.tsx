
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, TrendingUp, Target, Gauge, BarChart3, Timer } from 'lucide-react';

interface OptimizedProgressProps {
  progress: {
    current: number;
    total: number;
    percentage: number;
    throughput: number;
    estimatedTimeRemaining: number;
    startTime: number;
    peakThroughput?: number;
    avgEmailDuration?: number;
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
    if (throughput >= 12) return 'text-green-600';
    if (throughput >= 8) return 'text-blue-600';
    if (throughput >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLabel = (throughput: number) => {
    if (throughput >= 12) return 'ULTRA PERFORMANCE 🚀';
    if (throughput >= 8) return 'Performance Excelente ⚡';
    if (throughput >= 5) return 'Performance Boa 💪';
    if (throughput >= 3) return 'Performance Moderada';
    return 'Performance Baixa';
  };

  const getEfficiencyMetrics = () => {
    const elapsed = getElapsedTime();
    const avgDuration = progress.avgEmailDuration || 0;
    const efficiency = avgDuration > 0 ? Math.min((1000 / avgDuration) * 100, 100) : 0;
    
    return {
      efficiency: efficiency.toFixed(1),
      avgDuration: avgDuration.toFixed(0)
    };
  };

  if (!isProcessing && progress.current === 0) {
    return null;
  }

  const metrics = getEfficiencyMetrics();

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-blue-600" />
          Monitor ULTRA-OTIMIZADO
          {isProcessing && (
            <Badge variant="outline" className="ml-2 animate-pulse bg-blue-100">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                Processando...
              </div>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar with Animation */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progresso Ultra-Otimizado</span>
            <span className="font-mono font-bold text-blue-600">{progress.current} / {progress.total}</span>
          </div>
          <Progress value={progress.percentage} className="h-4 bg-gray-200">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress.percentage}%` }}
            />
          </Progress>
          <div className="text-center">
            <span className="text-2xl font-bold text-blue-600">
              {progress.percentage.toFixed(1)}%
            </span>
            {isProcessing && (
              <span className="ml-2 text-sm text-muted-foreground animate-pulse">
                processando...
              </span>
            )}
          </div>
        </div>

        {/* Ultra Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-1 bg-white/50 rounded-lg p-3">
            <div className="flex items-center justify-center">
              <Gauge className="h-4 w-4 mr-1 text-blue-500" />
              <span className="text-xs text-muted-foreground">Taxa Atual</span>
            </div>
            <div className={`text-xl font-bold ${getPerformanceColor(progress.throughput)}`}>
              {progress.throughput.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">emails/s</div>
          </div>

          {progress.peakThroughput !== undefined && (
            <div className="text-center space-y-1 bg-white/50 rounded-lg p-3">
              <div className="flex items-center justify-center">
                <BarChart3 className="h-4 w-4 mr-1 text-green-500" />
                <span className="text-xs text-muted-foreground">Pico</span>
              </div>
              <div className="text-xl font-bold text-green-600">
                {progress.peakThroughput.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">emails/s</div>
            </div>
          )}

          <div className="text-center space-y-1 bg-white/50 rounded-lg p-3">
            <div className="flex items-center justify-center">
              <Clock className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-xs text-muted-foreground">Decorrido</span>
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatTime(getElapsedTime())}
            </div>
          </div>

          <div className="text-center space-y-1 bg-white/50 rounded-lg p-3">
            <div className="flex items-center justify-center">
              <TrendingUp className="h-4 w-4 mr-1 text-purple-500" />
              <span className="text-xs text-muted-foreground">Restante</span>
            </div>
            <div className="text-xl font-bold text-purple-600">
              {formatTime(progress.estimatedTimeRemaining)}
            </div>
          </div>
        </div>

        {/* Additional Ultra Metrics */}
        {progress.avgEmailDuration !== undefined && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center space-y-1 bg-white/50 rounded-lg p-3">
              <div className="flex items-center justify-center">
                <Timer className="h-4 w-4 mr-1 text-orange-500" />
                <span className="text-xs text-muted-foreground">Duração Média</span>
              </div>
              <div className="text-lg font-bold text-orange-600">
                {metrics.avgDuration}ms
              </div>
              <div className="text-xs text-muted-foreground">por email</div>
            </div>

            <div className="text-center space-y-1 bg-white/50 rounded-lg p-3">
              <div className="flex items-center justify-center">
                <Target className="h-4 w-4 mr-1 text-indigo-500" />
                <span className="text-xs text-muted-foreground">Eficiência</span>
              </div>
              <div className="text-lg font-bold text-indigo-600">
                {metrics.efficiency}%
              </div>
              <div className="text-xs text-muted-foreground">otimização</div>
            </div>
          </div>
        )}

        {/* Ultra Performance Indicator */}
        <div className="border-2 rounded-lg p-4 bg-gradient-to-r from-blue-100 to-purple-100 border-blue-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full animate-pulse ${
                progress.throughput >= 12 ? 'bg-green-500' :
                progress.throughput >= 8 ? 'bg-blue-500' :
                progress.throughput >= 5 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="font-bold text-lg">
                {getPerformanceLabel(progress.throughput)}
              </span>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
          </div>
        </div>

        {/* Technical Details - ULTRA */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-3 bg-white/30 rounded-lg p-3">
          <div className="flex justify-between">
            <span>Processamento:</span>
            <span className="font-mono text-blue-600">ULTRA-PARALELO</span>
          </div>
          <div className="flex justify-between">
            <span>Simultâneos:</span>
            <span className="font-mono text-green-600">25 conexões</span>
          </div>
          <div className="flex justify-between">
            <span>Lotes:</span>
            <span className="font-mono text-purple-600">50 emails/lote</span>
          </div>
          <div className="flex justify-between">
            <span>Micro-lotes:</span>
            <span className="font-mono text-orange-600">5 emails/micro</span>
          </div>
          <div className="flex justify-between">
            <span>Otimização SMTP:</span>
            <span className="font-mono text-green-600">ULTRA-ATIVA 🚀</span>
          </div>
          <div className="flex justify-between">
            <span>Taxa Meta:</span>
            <span className="font-mono text-blue-600">12+ emails/s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
