
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOptimizedBatchSending } from '@/hooks/useOptimizedBatchSending';
import { OptimizedProgressMonitor } from './OptimizedProgressMonitor';
import { toast } from 'sonner';
import { Mail, Users, Zap, CheckCircle, XCircle, TrendingUp, BarChart3, Timer, Target, Activity, Trophy } from 'lucide-react';

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

  const handleUltraOptimizedSend = useCallback(async () => {
    if (selectedContacts.length === 0) {
      toast.error('Selecione ao menos um contato para envio');
      return;
    }

    if (selectedContacts.length > 10000) {
      toast.error('Limite máximo de 10.000 contatos por lote ultra-otimizado');
      return;
    }

    try {
      console.log(`🚀 Iniciando ULTRA-OTIMIZAÇÃO V3.0 para ${selectedContacts.length} contatos`);
      
      const startTime = Date.now();
      
      // Show initial toast with V3.0 expectations
      if (selectedContacts.length >= 1000) {
        toast.info('🚀 ULTRA-OTIMIZAÇÃO V3.0 ATIVADA!', {
          description: `Meta: 100+ emails/s com 500 conexões para ${selectedContacts.length} contatos em ~${Math.ceil(selectedContacts.length / 100)}s`,
          duration: 5000
        });
      } else {
        toast.info('⚡ PROCESSAMENTO ULTRA-RÁPIDO V3.0!', {
          description: `Processando ${selectedContacts.length} contatos com máxima performance`,
          duration: 4000
        });
      }
      
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
          peakThroughput: result.peakThroughput || result.avgThroughput,
          targetAchieved: result.targetAchieved || result.avgThroughput >= 100 || result.peakThroughput >= 100
        });
        
        // Enhanced performance feedback with V3.0 metrics
        if (result.targetAchieved || result.avgThroughput >= 100) {
          toast.success('🚀 META DE 100+ EMAILS/S ALCANÇADA!', {
            description: `🏆 ULTRA PERFORMANCE V3.0: ${result.avgThroughput.toFixed(2)} emails/s com 500 conexões! Histórico atualizado automaticamente.`,
            duration: 15000
          });
        } else if (result.avgThroughput >= 50) {
          toast.success('⚡ EXCELENTE PERFORMANCE V3.0!', {
            description: `Alta velocidade: ${result.avgThroughput.toFixed(2)} emails/s | Pico: ${result.peakThroughput.toFixed(2)} emails/s | Histórico atualizado.`,
            duration: 12000
          });
        } else if (result.avgThroughput >= 20) {
          toast.success('💪 BOA PERFORMANCE V3.0!', {
            description: `Velocidade: ${result.avgThroughput.toFixed(2)} emails/s | Pico: ${result.peakThroughput.toFixed(2)} emails/s | Histórico atualizado.`,
            duration: 10000
          });
        } else {
          toast.success('✅ Envio V3.0 concluído!', {
            description: `Taxa: ${result.avgThroughput.toFixed(2)} emails/s | Histórico atualizado automaticamente.`,
            duration: 8000
          });
        }

        // Final summary toast with V3.0 details
        setTimeout(() => {
          toast.success(`📊 Resumo ULTRA-OTIMIZADO V3.0: ${result.successCount} sucessos, ${result.errorCount} falhas`, {
            description: `Taxa de sucesso: ${result.successRate}% | Duração: ${result.totalDuration}s | 500 conexões simultâneas`,
            duration: 10000
          });
        }, 2000);
        
      } else {
        toast.error('O envio ultra-otimizado V3.0 falhou. Verifique os logs para mais detalhes.');
      }

    } catch (error: any) {
      console.error('Erro no envio ultra-otimizado V3.0:', error);
      toast.error(`Erro no processamento ultra-otimizado V3.0: ${error.message}`);
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
    return 'Volume Baixo 📈';
  };

  const getVolumeColor = () => {
    if (selectedContacts.length >= 5000) return 'destructive';
    if (selectedContacts.length >= 2000) return 'default';
    if (selectedContacts.length >= 500) return 'secondary';
    return 'outline';
  };

  const getPerformanceClass = (throughput: number, targetAchieved?: boolean) => {
    if (targetAchieved || throughput >= 100) return 'bg-green-500 text-white';
    if (throughput >= 50) return 'bg-blue-500 text-white';
    if (throughput >= 20) return 'bg-yellow-500 text-white';
    return 'bg-gray-500 text-white';
  };

  if (results) {
    return (
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Relatório ULTRA-OTIMIZADO V3.0
            <Badge className={getPerformanceClass(results.avgThroughput, results.targetAchieved)}>
              {results.targetAchieved ? '🚀 META ALCANÇADA' : 
               results.avgThroughput >= 50 ? '⚡ EXCELENTE' : 
               results.avgThroughput >= 20 ? '💪 BOM' : '📈 PADRÃO'}
            </Badge>
            {results.targetAchieved && (
              <Badge variant="outline" className="bg-yellow-100 border-yellow-400">
                <Trophy className="h-4 w-4 mr-1" />
                100+ EMAILS/S
              </Badge>
            )}
            <Badge variant="outline" className="bg-blue-100">
              HISTÓRICO ATUALIZADO
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
              <div className={`text-3xl font-bold ${results.targetAchieved ? 'text-green-600' : 'text-purple-600'}`}>
                {results.avgThroughput.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Emails/seg</div>
            </div>
          </div>

          {/* V3.0 Ultra Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            <div className="text-center bg-white/70 rounded-lg p-3">
              <div className="flex items-center justify-center mb-1">
                <Target className="h-4 w-4 mr-1 text-indigo-500" />
                <span className="text-sm text-muted-foreground">Conexões</span>
              </div>
              <div className="text-xl font-bold text-indigo-600">
                500
              </div>
              <div className="text-xs text-muted-foreground">simultâneas</div>
            </div>

            {results.avgEmailDuration && (
              <div className="text-center bg-white/70 rounded-lg p-3">
                <div className="flex items-center justify-center mb-1">
                  <Zap className="h-4 w-4 mr-1 text-orange-500" />
                  <span className="text-sm text-muted-foreground">Média/Email</span>
                </div>
                <div className="text-xl font-bold text-orange-600">
                  {results.avgEmailDuration.toFixed(0)}ms
                </div>
                <div className="text-xs text-muted-foreground">por email</div>
              </div>
            )}
          </div>

          {/* V3.0 Performance Summary */}
          <div className={`rounded-lg p-4 border-2 ${
            results.targetAchieved 
              ? 'bg-gradient-to-r from-green-100 to-yellow-100 border-green-300' 
              : 'bg-gradient-to-r from-blue-100 to-purple-100 border-blue-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={getPerformanceClass(results.avgThroughput, results.targetAchieved)} variant="outline">
                  {results.targetAchieved ? '🚀 META ALCANÇADA' :
                   results.avgThroughput >= 50 ? '⚡ EXCELENTE V3.0' :
                   results.avgThroughput >= 20 ? '💪 BOA PERFORMANCE' : '📈 PADRÃO'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {results.targetAchieved 
                    ? `🎯 Ultra-otimização atingiu ${results.avgThroughput.toFixed(2)} emails/s com 500 conexões!` 
                    : `Otimização V3.0 atingiu ${results.avgThroughput.toFixed(2)} emails/s`
                  }
                </span>
              </div>
              <Button onClick={resetResults} variant="outline" size="sm">
                Novo Envio V3.0
              </Button>
            </div>
          </div>

          {/* Target Achievement Banner */}
          {results.targetAchieved && (
            <div className="bg-gradient-to-r from-yellow-100 to-green-100 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-yellow-600" />
                <div>
                  <div className="font-bold text-green-800">🎯 META DE 100+ EMAILS/SEGUNDO ALCANÇADA!</div>
                  <div className="text-sm text-green-600">
                    Sistema V3.0 processou com {results.avgThroughput.toFixed(2)} emails/s usando 500 conexões simultâneas.
                    Performance ULTRA confirmada! ⚡🚀
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Update Confirmation */}
          <div className="bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-800">Histórico V3.0 Atualizado Automaticamente</div>
                <div className="text-sm text-green-600">
                  Todos os envios ultra-otimizados (sucessos e falhas) foram registrados no histórico com detalhes de performance. 
                  Acesse "Histórico de Envios" para análise completa.
                </div>
              </div>
            </div>
          </div>

          {/* Error Analysis */}
          {results.errorTypes && Object.keys(results.errorTypes).length > 0 && (
            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
              <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Análise Detalhada de Erros V3.0:
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
            Envio ULTRA-OTIMIZADO V3.0
            <Badge variant="outline" className="bg-blue-100">500 CONEXÕES | 100+ EMAILS/S</Badge>
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
                  Limite excedido: máximo 10.000 contatos por lote V3.0
                </span>
              </div>
            </div>
          )}

          {selectedContacts.length >= 2000 && selectedContacts.length <= 10000 && (
            <div className="bg-gradient-to-r from-green-50 to-yellow-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Trophy className="h-5 w-5" />
                <span className="text-sm font-bold">
                  ULTRA-OTIMIZAÇÃO V3.0 ATIVADA! 🚀
                </span>
              </div>
              <div className="text-xs text-green-600 space-y-1">
                <div>• 🎯 <strong>META:</strong> 100+ emails/segundo com 500 conexões simultâneas</div>
                <div>• 📦 <strong>PROCESSAMENTO:</strong> Chunks de 1.000 emails | Retry: 2 tentativas</div>
                <div>• ⚡ <strong>ESTIMATIVA:</strong> ~{Math.ceil(selectedContacts.length / 100)} segundos para {selectedContacts.length.toLocaleString()} emails</div>
                <div>• 📊 <strong>MONITORAMENTO:</strong> Real-time a cada 500ms | Histórico automático</div>
              </div>
            </div>
          )}

          {selectedContacts.length >= 500 && selectedContacts.length < 2000 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Processamento ultra-otimizado V3.0 para volume médio ⚡
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                • Performance esperada: 50+ emails/segundo • 500 conexões • Histórico automático
              </div>
            </div>
          )}

          {selectedContacts.length > 0 && selectedContacts.length < 500 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Volume baixo - Processamento V3.0 ultra-rápido garantido ✅
                </span>
              </div>
              <div className="text-xs text-green-600 mt-1">
                • Todos os envios serão registrados no histórico automaticamente com detalhes de performance
              </div>
            </div>
          )}

          <Button
            onClick={handleUltraOptimizedSend}
            disabled={isProcessing || selectedContacts.length === 0 || selectedContacts.length > 10000}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processando ULTRA-OTIMIZADO V3.0...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                🚀 ULTRA-ENVIO V3.0 | {selectedContacts.length.toLocaleString()} contatos | 500 conexões
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Ultra Progress Monitor V3.0 */}
      <OptimizedProgressMonitor 
        progress={progress} 
        isProcessing={isProcessing} 
      />
    </div>
  );
};
