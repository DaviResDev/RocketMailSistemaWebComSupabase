
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
  Activity,
  Target,
  Trophy
} from 'lucide-react';

interface UltraOptimizedProgress {
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
  targetThroughput: number; // 100+ emails/second target
  performanceLevel: 'ULTRA' | 'ALTA' | 'BOA' | 'PADRÃO';
}

interface OptimizedProgressMonitorProps {
  progress: UltraOptimizedProgress;
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
    errorCount,
    targetThroughput,
    performanceLevel
  } = progress;

  const elapsedTime = Date.now() - startTime;
  const elapsedSeconds = Math.round(elapsedTime / 1000);
  const estimatedSeconds = Math.round(estimatedTimeRemaining / 1000);

  const getPerformanceData = (level: string) => {
    switch (level) {
      case 'ULTRA':
        return { color: 'bg-green-500', icon: '🚀', label: 'ULTRA PERFORMANCE', textColor: 'text-green-600' };
      case 'ALTA':
        return { color: 'bg-blue-500', icon: '⚡', label: 'ALTA PERFORMANCE', textColor: 'text-blue-600' };
      case 'BOA':
        return { color: 'bg-yellow-500', icon: '💪', label: 'BOA PERFORMANCE', textColor: 'text-yellow-600' };
      default:
        return { color: 'bg-gray-500', icon: '📈', label: 'PADRÃO', textColor: 'text-gray-600' };
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const performance = getPerformanceData(performanceLevel);
  const successRate = current > 0 ? ((successCount / current) * 100).toFixed(1) : '0';
  const targetProgress = targetThroughput > 0 ? Math.min((throughput / targetThroughput) * 100, 100) : 0;

  if (!isProcessing && current === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600 animate-pulse" />
          Monitor ULTRA-OTIMIZADO V3.0
          <Badge className={`${performance.color} text-white`}>
            {performance.icon} {performance.label}
          </Badge>
          {throughput >= targetThroughput && (
            <Badge className="bg-gold-500 text-white">
              <Trophy className="h-4 w-4 mr-1" />
              META ALCANÇADA
            </Badge>
          )}
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

        {/* Target Performance Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Meta de Performance (100+ emails/s)</span>
            <span className="text-sm text-muted-foreground">
              {throughput.toFixed(1)}/{targetThroughput}+ emails/s
            </span>
          </div>
          <div className="relative">
            <Progress value={targetProgress} className="h-2" />
            {throughput >= targetThroughput && (
              <div className="absolute top-0 right-0 text-xs text-green-600 font-bold">
                🎯 ALCANÇADA!
              </div>
            )}
          </div>
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
            <div className={`text-xl font-bold ${performance.textColor}`}>
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

        {/* Enhanced Time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 mr-1 text-gray-500" />
              <span className="text-sm text-muted-foreground">Decorrido</span>
            </div>
            <div className="text-lg font-bold text-gray-600">
              {formatTime(elapsedSeconds)}
            </div>
          </div>

          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <Timer className="h-4 w-4 mr-1 text-orange-500" />
              <span className="text-sm text-muted-foreground">Restante</span>
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

          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <Target className="h-4 w-4 mr-1 text-indigo-500" />
              <span className="text-sm text-muted-foreground">Conexões</span>
            </div>
            <div className="text-lg font-bold text-indigo-600">
              500
            </div>
            <div className="text-xs text-muted-foreground">simultâneas</div>
          </div>
        </div>

        {/* Ultra Performance Indicator */}
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={`${performance.color} text-white`} variant="outline">
                {performance.icon} {performance.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {throughput >= targetThroughput 
                  ? `🎯 META ALCANÇADA: ${throughput.toFixed(2)} emails/s` 
                  : `Velocidade atual: ${throughput.toFixed(2)} emails/s (meta: ${targetThroughput}+)`
                }
              </span>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-600">
                  {throughput >= targetThroughput ? 'ULTRA PROCESSANDO' : 'Processando...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ultra Status Updates */}
        {isProcessing && current > 0 && (
          <div className={`text-center border rounded-lg p-3 ${
            throughput >= targetThroughput 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className={`text-sm font-bold ${
              throughput >= targetThroughput ? 'text-green-700' : 'text-blue-700'
            }`}>
              <strong>ULTRA-OTIMIZAÇÃO V3.0:</strong> Processando email {current + 1} de {total}
              {throughput >= targetThroughput && ' 🚀 META ALCANÇADA!'}
            </div>
            <div className={`text-xs mt-1 ${
              throughput >= targetThroughput ? 'text-green-600' : 'text-blue-600'
            }`}>
              Taxa atual: {throughput.toFixed(1)} emails/s | 
              Pico: {peakThroughput.toFixed(1)} emails/s |
              Sucesso: {successRate}% |
              500 conexões simultâneas |
              Chunks de 1000 emails
            </div>
          </div>
        )}

        {/* Performance Achievement Banner */}
        {throughput >= targetThroughput && (
          <div className="bg-gradient-to-r from-green-100 to-yellow-100 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-yellow-600" />
              <div>
                <div className="font-bold text-green-800">🎯 META DE PERFORMANCE ALCANÇADA!</div>
                <div className="text-sm text-green-600">
                  Sistema atingiu {throughput.toFixed(2)} emails/segundo com 500 conexões simultâneas.
                  Performance ULTRA confirmada! ⚡
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
