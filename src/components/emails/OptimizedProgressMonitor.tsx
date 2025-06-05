
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
  Layers
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
  targetThroughput: number;
  performanceLevel: 'EXCELENTE' | 'BOA' | 'PADRÃO' | 'BAIXA';
  chunkProgress: {
    current: number;
    total: number;
    chunkNumber: number;
  };
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
    errorCount,
    targetThroughput,
    performanceLevel,
    chunkProgress
  } = progress;

  const elapsedTime = Date.now() - startTime;
  const elapsedSeconds = Math.round(elapsedTime / 1000);
  const estimatedSeconds = Math.round(estimatedTimeRemaining / 1000);

  const getPerformanceData = (level: string) => {
    switch (level) {
      case 'EXCELENTE':
        return { color: 'bg-green-500', icon: '🚀', label: 'EXCELENTE', textColor: 'text-green-600' };
      case 'BOA':
        return { color: 'bg-blue-500', icon: '⚡', label: 'BOA PERFORMANCE', textColor: 'text-blue-600' };
      case 'PADRÃO':
        return { color: 'bg-yellow-500', icon: '💪', label: 'PERFORMANCE PADRÃO', textColor: 'text-yellow-600' };
      default:
        return { color: 'bg-gray-500', icon: '📈', label: 'BAIXA PERFORMANCE', textColor: 'text-gray-600' };
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
          Monitor Gmail Otimizado
          <Badge className={`${performance.color} text-white`}>
            {performance.icon} {performance.label}
          </Badge>
          {throughput >= (targetThroughput * 0.8) && (
            <Badge className="bg-green-500 text-white">
              <Target className="h-4 w-4 mr-1" />
              META ATINGIDA
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progresso Geral */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm text-muted-foreground">
              {current}/{total} emails ({percentage.toFixed(1)}%)
            </span>
          </div>
          <Progress value={percentage} className="h-3" />
        </div>

        {/* Progresso do Chunk Atual */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Chunk {chunkProgress.chunkNumber}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {chunkProgress.current}/{chunkProgress.total} no chunk atual
            </span>
          </div>
          <Progress 
            value={(chunkProgress.current / chunkProgress.total) * 100} 
            className="h-2" 
          />
        </div>

        {/* Meta de Performance Gmail */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Performance Gmail (Meta: {targetThroughput} emails/s)</span>
            <span className="text-sm text-muted-foreground">
              {throughput.toFixed(1)}/{targetThroughput} emails/s
            </span>
          </div>
          <div className="relative">
            <Progress value={targetProgress} className="h-2" />
            {throughput >= (targetThroughput * 0.8) && (
              <div className="absolute top-0 right-0 text-xs text-green-600 font-bold">
                🎯 ATINGIDA!
              </div>
            )}
          </div>
        </div>

        {/* Métricas em Tempo Real */}
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

        {/* Métricas de Tempo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        {/* Indicador de Performance Gmail */}
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={`${performance.color} text-white`} variant="outline">
                {performance.icon} {performance.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {throughput >= (targetThroughput * 0.8)
                  ? `🎯 Meta Gmail atingida: ${throughput.toFixed(2)} emails/s` 
                  : `Velocidade atual: ${throughput.toFixed(2)} emails/s (meta: ${targetThroughput})`
                }
              </span>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-600">
                  {throughput >= (targetThroughput * 0.8) ? 'PERFORMANCE EXCELENTE' : 'Processando...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status de Processamento */}
        {isProcessing && current > 0 && (
          <div className={`text-center border rounded-lg p-3 ${
            throughput >= (targetThroughput * 0.8)
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className={`text-sm font-bold ${
              throughput >= (targetThroughput * 0.8) ? 'text-green-700' : 'text-blue-700'
            }`}>
              <Mail className="inline h-4 w-4 mr-1" />
              <strong>Gmail Otimizado:</strong> Processando email {current + 1} de {total}
              {throughput >= (targetThroughput * 0.8) && ' 🚀 META ATINGIDA!'}
            </div>
            <div className={`text-xs mt-1 ${
              throughput >= (targetThroughput * 0.8) ? 'text-green-600' : 'text-blue-600'
            }`}>
              Taxa: {throughput.toFixed(1)} emails/s | 
              Pico: {peakThroughput.toFixed(1)} emails/s |
              Sucesso: {successRate}% |
              Chunk {chunkProgress.chunkNumber} |
              Rate Limiting: 14 emails/s
            </div>
          </div>
        )}

        {/* Banner de Conquista */}
        {throughput >= (targetThroughput * 0.8) && (
          <div className="bg-gradient-to-r from-green-100 to-yellow-100 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-bold text-green-800">🎯 META GMAIL ATINGIDA!</div>
                <div className="text-sm text-green-600">
                  Sistema otimizado atingiu {throughput.toFixed(2)} emails/s com rate limiting inteligente.
                  Performance excelente para Gmail! ⚡
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
