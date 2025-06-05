
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOptimizedBatchSending } from '@/hooks/useOptimizedBatchSending';
import { OptimizedProgressMonitor } from './OptimizedProgressMonitor';
import { toast } from 'sonner';
import { Mail, Users, Zap, CheckCircle, XCircle, TrendingUp, BarChart3, Timer, Target } from 'lucide-react';

interface BatchEmailSenderProps {
  selectedContacts: any[];
  templateId: string;
  customSubject?: string;
  customContent?: string;
  onComplete: () => void;
}

export const BatchEmailSender: React.FC<BatchEmailSenderProps> = ({
  selectedContacts,
  templateId,
  customSubject,
  customContent,
  onComplete
}) => {
  const [results, setResults] = useState<any>(null);
  const { isProcessing, progress, sendOptimizedBatch } = useOptimizedBatchSending();

  const handleOptimizedSend = useCallback(async () => {
    if (selectedContacts.length === 0) {
      toast.error('Selecione ao menos um contato para envio');
      return;
    }

    if (selectedContacts.length > 10000) {
      toast.error('Limite máximo de 10.000 contatos por lote');
      return;
    }

    try {
      console.log(`🚀 Iniciando ULTRA-OTIMIZAÇÃO para ${selectedContacts.length} contatos`);
      
      const startTime = Date.now();
      
      const result = await sendOptimizedBatch(
        selectedContacts,
        templateId,
        customSubject,
        customContent
      );
      
      const totalTime = Date.now() - startTime;
      
      if (result) {
        setResults({
          ...result,
          totalTime: Math.round(totalTime / 1000),
          throughput: result.avgThroughput || Math.round((selectedContacts.length / totalTime) * 1000),
          peakThroughput: result.peakThroughput || result.avgThroughput
        });
        
        // Enhanced performance feedback
        if (result.avgThroughput >= 12) {
          toast.success('🚀 ULTRA PERFORMANCE ALCANÇADA!', {
            description: `Taxa excepcional de ${result.avgThroughput.toFixed(2)} emails/segundo`,
            duration: 8000
          });
        } else if (result.avgThroughput >= 8) {
          toast.success('⚡ EXCELENTE PERFORMANCE!', {
            description: `Taxa de ${result.avgThroughput.toFixed(2)} emails/segundo`,
            duration: 6000
          });
        } else if (result.avgThroughput >= 5) {
          toast.success('💪 BOA PERFORMANCE!', {
            description: `Taxa de ${result.avgThroughput.toFixed(2)} emails/segundo`,
            duration: 5000
          });
        }
      } else {
        toast.error('O envio ultra-otimizado falhou. Verifique os logs para mais detalhes.');
      }

    } catch (error: any) {
      console.error('Erro no envio ultra-otimizado:', error);
      toast.error(`Erro no processamento ultra-otimizado: ${error.message}`);
    } finally {
      onComplete();
    }
  }, [selectedContacts, templateId, customSubject, customContent, sendOptimizedBatch, onComplete]);

  const resetResults = () => {
    setResults(null);
  };

  const getVolumeLabel = () => {
    if (selectedContacts.length >= 5000) return 'Volume ULTRA Alto 🚀';
    if (selectedContacts.length >= 2000) return 'Volume Alto ⚡';
    if (selectedContacts.length >= 500) return 'Volume Médio 💪';
    return 'Volume Baixo';
  };

  const getVolumeColor = () => {
    if (selectedContacts.length >= 5000) return 'destructive';
    if (selectedContacts.length >= 2000) return 'default';
    if (selectedContacts.length >= 500) return 'secondary';
    return 'outline';
  };

  const getPerformanceClass = (throughput: number) => {
    if (throughput >= 12) return 'bg-green-500 text-white';
    if (throughput >= 8) return 'bg-blue-500 text-white';
    if (throughput >= 5) return 'bg-yellow-500 text-white';
    return 'bg-gray-500 text-white';
  };

  if (results) {
    return (
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Relatório ULTRA-OTIMIZADO
            <Badge className={getPerformanceClass(results.avgThroughput)}>
              {results.avgThroughput >= 12 ? '🚀 ULTRA' : 
               results.avgThroughput >= 8 ? '⚡ EXCELENTE' : 
               results.avgThroughput >= 5 ? '💪 BOM' : '📈 PADRÃO'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center bg-white/70 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{results.successCount}</div>
              <div className="text-sm text-muted-foreground">Sucessos</div>
            </div>
            <div className="text-center bg-white/70 rounded-lg p-4">
              <div className="text-3xl font-bold text-red-600">{results.errorCount}</div>
              <div className="text-sm text-muted-foreground">Falhas</div>
            </div>
            <div className="text-center bg-white/70 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{results.successRate}%</div>
              <div className="text-sm text-muted-foreground">Taxa Sucesso</div>
            </div>
            <div className="text-center bg-white/70 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">{results.avgThroughput.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Emails/seg</div>
            </div>
          </div>

          {/* Ultra Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {results.peakThroughput && (
              <div className="text-center bg-white/70 rounded-lg p-3">
                <div className="flex items-center justify-center mb-1">
                  <BarChart3 className="h-4 w-4 mr-1 text-green-500" />
                  <span className="text-sm text-muted-foreground">Pico Máximo</span>
                </div>
                <div className="text-xl font-bold text-green-600">
                  {results.peakThroughput.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">emails/s</div>
              </div>
            )}

            <div className="text-center bg-white/70 rounded-lg p-3">
              <div className="flex items-center justify-center mb-1">
                <Timer className="h-4 w-4 mr-1 text-blue-500" />
                <span className="text-sm text-muted-foreground">Tempo Total</span>
              </div>
              <div className="text-xl font-bold text-blue-600">
                {results.totalDuration}s
              </div>
              <div className="text-xs text-muted-foreground">duração</div>
            </div>

            {results.avgEmailDuration && (
              <div className="text-center bg-white/70 rounded-lg p-3">
                <div className="flex items-center justify-center mb-1">
                  <Target className="h-4 w-4 mr-1 text-orange-500" />
                  <span className="text-sm text-muted-foreground">Média/Email</span>
                </div>
                <div className="text-xl font-bold text-orange-600">
                  {results.avgEmailDuration.toFixed(0)}ms
                </div>
                <div className="text-xs text-muted-foreground">por email</div>
              </div>
            )}
          </div>

          {/* Performance Summary */}
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={getPerformanceClass(results.avgThroughput)} variant="outline">
                  {results.avgThroughput >= 12 ? '🚀 ULTRA PERFORMANCE' :
                   results.avgThroughput >= 8 ? '⚡ EXCELENTE' :
                   results.avgThroughput >= 5 ? '💪 BOA PERFORMANCE' : '📈 PADRÃO'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Otimização atingiu {results.avgThroughput.toFixed(2)} emails/s
                </span>
              </div>
              <Button onClick={resetResults} variant="outline" size="sm">
                Novo Envio Ultra-Otimizado
              </Button>
            </div>
          </div>

          {/* Error Analysis */}
          {results.errorTypes && Object.keys(results.errorTypes).length > 0 && (
            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
              <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Análise Detalhada de Erros:
              </h4>
              <div className="space-y-2">
                {Object.entries(results.errorTypes).map(([errorType, count]) => (
                  <div key={errorType} className="flex justify-between items-center">
                    <span className="text-red-700 text-sm">{errorType}</span>
                    <Badge variant="destructive" className="text-xs">{count as number}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-600" />
            Envio ULTRA-OTIMIZADO
            <Badge variant="outline" className="bg-blue-100">NOVA VERSÃO</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {selectedContacts.length.toLocaleString()} contatos selecionados
              </span>
            </div>
            <Badge variant={getVolumeColor()}>{getVolumeLabel()}</Badge>
          </div>

          {selectedContacts.length > 10000 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Limite excedido: máximo 10.000 contatos por lote
                </span>
              </div>
            </div>
          )}

          {selectedContacts.length >= 2000 && selectedContacts.length <= 10000 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-bold">
                  ULTRA-OTIMIZAÇÃO ATIVADA! 🚀
                </span>
              </div>
              <div className="text-xs text-blue-600 space-y-1">
                <div>• 25 emails simultâneos • Lotes de 50 • Micro-lotes de 5</div>
                <div>• Tempo estimado: ~{Math.round(selectedContacts.length / 12 / 60)} minutos</div>
                <div>• Meta de performance: 12+ emails/segundo</div>
              </div>
            </div>
          )}

          {selectedContacts.length >= 500 && selectedContacts.length < 2000 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Processamento otimizado para volume médio ⚡
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                • Performance esperada: 8+ emails/segundo
              </div>
            </div>
          )}

          <Button
            onClick={handleOptimizedSend}
            disabled={isProcessing || selectedContacts.length === 0 || selectedContacts.length > 10000}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processando ULTRA-OTIMIZADO...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                🚀 ULTRA-ENVIO para {selectedContacts.length.toLocaleString()} contatos
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Ultra Progress Monitor */}
      <OptimizedProgressMonitor 
        progress={progress} 
        isProcessing={isProcessing} 
      />
    </div>
  );
};
