
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Timer, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  BarChart3,
  Activity
} from 'lucide-react';

interface OptimizedProgress {
  current: number;
  total: number;
  percentage: number;
  throughput: number;
  estimatedTimeRemaining: number;
  startTime: number;
  peakThroughput: number;
  avgEmailDuration: number;
  successCount: number;
  errorCount: number;
}

interface OptimizedProgressMonitorProps {
  progress: OptimizedProgress;
  isProcessing: boolean;
}

export const OptimizedProgressMonitor: React.FC<OptimizedProgressMonitorProps> = ({
  progress,
  isProcessing
}) => {
  const { 
    current, 
    total, 
    percentage, 
    throughput, 
    estimatedTimeRemaining,
    startTime,
    peakThroughput,
    avgEmailDuration,
    successCount,
    errorCount
  } = progress;

  const elapsedTime = Date.now() - startTime;
  const elapsedSeconds = Math.round(elapsedTime / 1000);
  const estimatedSeconds = Math.round(estimatedTimeRemaining / 1000);

  const getPerformanceLevel = (throughput: number) => {
    if (throughput >= 15) return { level: 'ULTRA', color: 'bg-green-500', icon: '🚀' };
    if (throughput >= 10) return { level: 'ALTA', color: 'bg-blue-500', icon: '⚡' };
    if (throughput >= 5) return { level: 'BOA', color: 'bg-yellow-500', icon: '💪' };
    return { level: 'PADRÃO', color: 'bg-gray-500', icon: '📈' };
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const performance = getPerformanceLevel(throughput);
  const successRate = current > 0 ? ((successCount / current) * 100).toFixed(1) : '0';

  if (!isProcessing && current === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600 animate-pulse" />
          Monitor ULTRA-OTIMIZADO
          <Badge className={`${performance.color} text-white`}>
            {performance.icon} {performance.level} PERFORMANCE
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm text-muted-foreground">
              {current}/{total} emails ({percentage.toFixed(1)}%)
            </span>
          </div>
          <Progress value={percentage} className="h-3" />
        </div>

        {/* Real-time Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
              <span className="text-sm text-muted-foreground">Sucessos</span>
            </div>
            <div className="text-xl font-bold text-green-600">{successCount}</div>
            <div className="text-xs text-muted-foreground">{successRate}%</div>
          </div>

          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <XCircle className="h-4 w-4 mr-1 text-red-500" />
              <span className="text-sm text-muted-foreground">Falhas</span>
            </div>
            <div className="text-xl font-bold text-red-600">{errorCount}</div>
            <div className="text-xs text-muted-foreground">
              {current > 0 ? (((errorCount / current) * 100).toFixed(1)) : '0'}%
            </div>
          </div>

          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 mr-1 text-blue-500" />
              <span className="text-sm text-muted-foreground">Atual</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              {throughput.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">emails/s</div>
          </div>

          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <BarChart3 className="h-4 w-4 mr-1 text-purple-500" />
              <span className="text-sm text-muted-foreground">Pico</span>
            </div>
            <div className="text-xl font-bold text-purple-600">
              {peakThroughput.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">emails/s</div>
          </div>
        </div>

        {/* Time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 mr-1 text-gray-500" />
              <span className="text-sm text-muted-foreground">Tempo Decorrido</span>
            </div>
            <div className="text-lg font-bold text-gray-600">
              {formatTime(elapsedSeconds)}
            </div>
          </div>

          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <Timer className="h-4 w-4 mr-1 text-orange-500" />
              <span className="text-sm text-muted-foreground">Tempo Restante</span>
            </div>
            <div className="text-lg font-bold text-orange-600">
              {estimatedSeconds > 0 ? formatTime(estimatedSeconds) : '-'}
            </div>
          </div>

          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <Zap className="h-4 w-4 mr-1 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Média/Email</span>
            </div>
            <div className="text-lg font-bold text-yellow-600">
              {avgEmailDuration > 0 ? `${Math.round(avgEmailDuration)}ms` : '-'}
            </div>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={`${performance.color} text-white`} variant="outline">
                {performance.icon} {performance.level} PERFORMANCE
              </Badge>
              <span className="text-sm text-muted-foreground">
                Velocidade atual: {throughput.toFixed(2)} emails/segundo
              </span>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-600">Processando...</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Status Updates */}
        {isProcessing && current > 0 && (
          <div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-700">
              <strong>Status em Tempo Real:</strong> Processando email {current + 1} de {total}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Taxa de sucesso atual: {successRate}% | 
              Velocidade: {throughput.toFixed(1)} emails/s |
              Tempo restante estimado: {estimatedSeconds > 0 ? formatTime(estimatedSeconds) : 'Calculando...'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
