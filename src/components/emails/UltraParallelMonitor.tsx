
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
  Mail,
  Layers,
  Cpu,
  Trophy
} from 'lucide-react';

interface UltraParallelProgress {
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
  targetThroughput: number;
  performanceLevel: 'CONQUISTADA' | 'EXCELENTE' | 'BOA' | 'PADRÃO';
  chunkProgress: {
    current: number;
    total: number;
    chunkNumber: number;
  };
  connectionsActive: number;
}

interface UltraParallelMonitorProps {
  progress: UltraParallelProgress;
  isProcessing: boolean;
}

export const UltraParallelMonitor: React.FC<UltraParallelMonitorProps> = ({
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
    performanceLevel,
    chunkProgress,
    connectionsActive
  } = progress;

  const elapsedTime = Date.now() - startTime;
  const elapsedSeconds = Math.round(elapsedTime / 1000);
  const estimatedSeconds = Math.round(estimatedTimeRemaining / 1000);

  const getPerformanceData = (level: string) => {
    switch (level) {
      case 'CONQUISTADA':
        return { 
          color: 'bg-gradient-to-r from-yellow-400 to-orange-500', 
          icon: '🏆', 
          label: 'META CONQUISTADA!', 
          textColor: 'text-yellow-600',
          borderColor: 'border-yellow-400'
        };
      case 'EXCELENTE':
        return { 
          color: 'bg-gradient-to-r from-green-400 to-blue-500', 
          icon: '🚀', 
          label: 'PERFORMANCE EXCELENTE', 
          textColor: 'text-green-600',
          borderColor: 'border-green-400'
        };
      case 'BOA':
        return { 
          color: 'bg-blue-500', 
          icon: '⚡', 
          label: 'BOA PERFORMANCE', 
          textColor: 'text-blue-600',
          borderColor: 'border-blue-400'
        };
      default:
        return { 
          color: 'bg-gray-500', 
          icon: '💪', 
          label: 'PERFORMANCE PADRÃO', 
          textColor: 'text-gray-600',
          borderColor: 'border-gray-400'
        };
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
    <Card className={`border-4 ${performance.borderColor} bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 shadow-2xl`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-7 w-7 text-purple-600 animate-pulse" />
          Monitor Ultra-Parallel V5.0
          <Badge className={`${performance.color} text-white text-sm px-3 py-1 animate-pulse`}>
            {performance.icon} {performance.label}
          </Badge>
          {throughput >= targetThroughput && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-bounce">
              <Trophy className="h-4 w-4 mr-1" />
              200+ EMAILS/S!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progresso Geral Ultra-Paralelo */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold">Progresso Ultra-Paralelo (1000 conexões)</span>
            <span className="text-sm text-muted-foreground font-mono">
              {current}/{total} emails ({percentage.toFixed(1)}%)
            </span>
          </div>
          <Progress value={percentage} className="h-4" />
        </div>

        {/* Meta 200+ emails/s */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-bold">Meta Ultra: {targetThroughput}+ emails/s</span>
            </div>
            <span className="text-sm text-muted-foreground font-mono">
              {throughput.toFixed(1)}/{targetThroughput}+ emails/s
            </span>
          </div>
          <div className="relative">
            <Progress value={targetProgress} className="h-3" />
            {throughput >= targetThroughput && (
              <div className="absolute top-0 right-0 text-xs text-yellow-600 font-bold animate-pulse">
                🏆 CONQUISTADA!
              </div>
            )}
          </div>
        </div>

        {/* Chunk Ultra-Paralelo */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">Ultra-Chunk {chunkProgress.chunkNumber} (200 emails)</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {chunkProgress.current}/{chunkProgress.total} no chunk
            </span>
          </div>
          <Progress 
            value={(chunkProgress.current / chunkProgress.total) * 100} 
            className="h-2" 
          />
        </div>

        {/* Métricas Ultra-Paralelas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-3 border border-green-300">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
              <span className="text-xs text-green-700 font-bold">Sucessos</span>
            </div>
            <div className="text-xl font-bold text-green-700">{successCount}</div>
            <div className="text-xs text-green-600">{successRate}%</div>
          </div>

          <div className="text-center bg-gradient-to-br from-red-100 to-red-200 rounded-lg p-3 border border-red-300">
            <div className="flex items-center justify-center mb-1">
              <XCircle className="h-4 w-4 mr-1 text-red-600" />
              <span className="text-xs text-red-700 font-bold">Falhas</span>
            </div>
            <div className="text-xl font-bold text-red-700">{errorCount}</div>
            <div className="text-xs text-red-600">
              {current > 0 ? (((errorCount / current) * 100).toFixed(1)) : '0'}%
            </div>
          </div>

          <div className="text-center bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-3 border border-blue-300">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 mr-1 text-blue-600" />
              <span className="text-xs text-blue-700 font-bold">Atual</span>
            </div>
            <div className={`text-xl font-bold ${performance.textColor}`}>
              {throughput.toFixed(1)}
            </div>
            <div className="text-xs text-blue-600">emails/s</div>
          </div>

          <div className="text-center bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-3 border border-purple-300">
            <div className="flex items-center justify-center mb-1">
              <BarChart3 className="h-4 w-4 mr-1 text-purple-600" />
              <span className="text-xs text-purple-700 font-bold">Pico</span>
            </div>
            <div className="text-xl font-bold text-purple-700">
              {peakThroughput.toFixed(1)}
            </div>
            <div className="text-xs text-purple-600">emails/s</div>
          </div>
        </div>

        {/* Métricas de Tempo e Conexões */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="text-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 mr-1 text-gray-600" />
              <span className="text-xs text-gray-700 font-bold">Decorrido</span>
            </div>
            <div className="text-lg font-bold text-gray-700">
              {formatTime(elapsedSeconds)}
            </div>
          </div>

          <div className="text-center bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <Timer className="h-4 w-4 mr-1 text-orange-600" />
              <span className="text-xs text-orange-700 font-bold">Restante</span>
            </div>
            <div className="text-lg font-bold text-orange-700">
              {estimatedSeconds > 0 ? formatTime(estimatedSeconds) : '-'}
            </div>
          </div>

          <div className="text-center bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <Zap className="h-4 w-4 mr-1 text-yellow-600" />
              <span className="text-xs text-yellow-700 font-bold">Média/Email</span>
            </div>
            <div className="text-lg font-bold text-yellow-700">
              {avgEmailDuration > 0 ? `${Math.round(avgEmailDuration)}ms` : '-'}
            </div>
          </div>

          <div className="text-center bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg p-3">
            <div className="flex items-center justify-center mb-1">
              <Cpu className="h-4 w-4 mr-1 text-indigo-600" />
              <span className="text-xs text-indigo-700 font-bold">Conexões</span>
            </div>
            <div className="text-lg font-bold text-indigo-700">
              {connectionsActive}
            </div>
          </div>
        </div>

        {/* Banner de Performance Ultra-Paralela */}
        <div className={`${performance.color} border-4 ${performance.borderColor} rounded-lg p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-white/20 text-white border-white/30" variant="outline">
                {performance.icon} {performance.label}
              </Badge>
              <span className="text-sm font-bold">
                {throughput >= targetThroughput
                  ? `🏆 Meta Ultra Conquistada: ${throughput.toFixed(2)} emails/s com 1000 conexões!` 
                  : `Ultra-Paralelo: ${throughput.toFixed(2)} emails/s (meta: ${targetThroughput}+) | ${connectionsActive} conexões ativas`
                }
              </span>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-bold">
                  {throughput >= targetThroughput ? 'META CONQUISTADA!' : 'Ultra-Processando...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status Ultra-Paralelo */}
        {isProcessing && current > 0 && (
          <div className={`text-center border-2 rounded-lg p-4 ${
            throughput >= targetThroughput
              ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300' 
              : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-300'
          }`}>
            <div className={`text-sm font-bold ${
              throughput >= targetThroughput ? 'text-yellow-800' : 'text-purple-800'
            }`}>
              <Mail className="inline h-5 w-5 mr-2" />
              <strong>Ultra-Parallel V5.0:</strong> Processando email {current + 1} de {total}
              {throughput >= targetThroughput && ' 🏆 META 200+ EMAILS/S CONQUISTADA!'}
            </div>
            <div className={`text-xs mt-2 font-mono ${
              throughput >= targetThroughput ? 'text-yellow-700' : 'text-purple-700'
            }`}>
              Taxa: {throughput.toFixed(1)} emails/s | 
              Pico: {peakThroughput.toFixed(1)} emails/s |
              Sucesso: {successRate}% |
              Chunk {chunkProgress.chunkNumber} |
              {connectionsActive} conexões ativas |
              Zero delay entre chunks
            </div>
          </div>
        )}

        {/* Banner de Conquista da Meta */}
        {throughput >= targetThroughput && (
          <div className="bg-gradient-to-r from-yellow-100 via-orange-100 to-red-100 border-4 border-yellow-400 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-600 animate-bounce" />
              <div>
                <div className="font-black text-lg text-yellow-800">🏆 META 200+ EMAILS/S CONQUISTADA!</div>
                <div className="text-sm text-yellow-700 font-bold">
                  Sistema Ultra-Paralelo V5.0 atingiu {throughput.toFixed(2)} emails/s com 1000 conexões simultâneas.
                  Performance excepcional! 🚀⚡🎯
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
