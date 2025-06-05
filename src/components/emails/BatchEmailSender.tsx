
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOptimizedBatchSending } from '@/hooks/useOptimizedBatchSending';
import { OptimizedProgressMonitor } from './OptimizedProgressMonitor';
import { toast } from 'sonner';
import { Mail, Users, Zap, CheckCircle, XCircle, TrendingUp, BarChart3, Timer, Target, Activity, Shield, Layers } from 'lucide-react';

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

    if (selectedContacts.length > 5000) {
      toast.error('Limite máximo de 5.000 contatos por lote otimizado');
      return;
    }

    try {
      console.log(`🚀 Iniciando envio otimizado para Gmail: ${selectedContacts.length} contatos`);
      
      const startTime = Date.now();
      
      // Notificação inicial otimizada
      const estimatedTime = Math.ceil(selectedContacts.length / 15);
      toast.info('⚡ ENVIO GMAIL OTIMIZADO INICIADO!', {
        description: `Processando ${selectedContacts.length} contatos em ~${estimatedTime}s com rate limiting inteligente`,
        duration: 4000
      });
      
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
          targetAchieved: result.targetAchieved || result.avgThroughput >= 12 // 80% da meta
        });
        
        // Feedback de performance específico para Gmail
        if (result.targetAchieved || result.avgThroughput >= 12) {
          toast.success('🚀 EXCELENTE PERFORMANCE GMAIL!', {
            description: `⚡ ${result.avgThroughput.toFixed(2)} emails/s com rate limiting otimizado! Histórico atualizado.`,
            duration: 12000
          });
        } else if (result.avgThroughput >= 8) {
          toast.success('⚡ BOA PERFORMANCE GMAIL!', {
            description: `Velocidade: ${result.avgThroughput.toFixed(2)} emails/s | Pico: ${result.peakThroughput.toFixed(2)} emails/s | Histórico atualizado.`,
            duration: 10000
          });
        } else {
          toast.success('✅ Envio Gmail concluído!', {
            description: `Taxa: ${result.avgThroughput.toFixed(2)} emails/s | Histórico atualizado.`,
            duration: 8000
          });
        }

        // Resumo detalhado
        setTimeout(() => {
          toast.success(`📊 Resumo Gmail Otimizado: ${result.successCount} sucessos, ${result.errorCount} falhas`, {
            description: `Taxa de sucesso: ${result.successRate}% | Duração: ${result.totalDuration}s | Rate limiting aplicado`,
            duration: 8000
          });
        }, 2000);
        
      } else {
        toast.error('O envio otimizado falhou. Verifique os logs para mais detalhes.');
      }

    } catch (error: any) {
      console.error('Erro no envio otimizado:', error);
      toast.error(`Erro no processamento otimizado: ${error.message}`);
    } finally {
      onComplete();
    }
  }, [selectedContacts, templateId, customSubject, customContent, sendOptimizedBatch, onComplete]);

  const resetResults = () => {
    setResults(null);
  };

  const getVolumeLabel = () => {
    if (selectedContacts.length >= 2000) return 'Volume Alto ⚡';
    if (selectedContacts.length >= 500) return 'Volume Médio 💪';
    if (selectedContacts.length >= 100) return 'Volume Baixo 📈';
    return 'Teste 🔍';
  };

  const getVolumeColor = () => {
    if (selectedContacts.length >= 2000) return 'default';
    if (selectedContacts.length >= 500) return 'secondary';
    return 'outline';
  };

  const getPerformanceClass = (throughput: number, targetAchieved?: boolean) => {
    if (targetAchieved || throughput >= 12) return 'bg-green-500 text-white';
    if (throughput >= 8) return 'bg-blue-500 text-white';
    if (throughput >= 4) return 'bg-yellow-500 text-white';
    return 'bg-gray-500 text-white';
  };

  if (results) {
    return (
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Relatório Gmail Otimizado
            <Badge className={getPerformanceClass(results.avgThroughput, results.targetAchieved)}>
              {results.targetAchieved ? '🚀 EXCELENTE' : 
               results.avgThroughput >= 8 ? '⚡ BOA' : 
               results.avgThroughput >= 4 ? '💪 PADRÃO' : '📈 BAIXA'}
            </Badge>
            {results.targetAchieved && (
              <Badge variant="outline" className="bg-green-100 border-green-400">
                <Target className="h-4 w-4 mr-1" />
                META ATINGIDA
              </Badge>
            )}
            <Badge variant="outline" className="bg-blue-100">
              <Shield className="h-4 w-4 mr-1" />
              GMAIL OTIMIZADO
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Métricas Principais */}
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

          {/* Métricas Gmail Otimizadas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {results.peakThroughput && (
              <div className="text-center bg-white/70 rounded-lg p-3">
                <div className="flex items-center justify-center mb-1">
                  <BarChart3 className="h-4 w-4 mr-1 text-green-500" />
                  <span className="text-sm text-muted-foreground">Pico</span>
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
                <span className="text-sm text-muted-foreground">Duração</span>
              </div>
              <div className="text-xl font-bold text-blue-600">
                {results.totalDuration}s
              </div>
              <div className="text-xs text-muted-foreground">tempo total</div>
            </div>

            <div className="text-center bg-white/70 rounded-lg p-3">
              <div className="flex items-center justify-center mb-1">
                <Layers className="h-4 w-4 mr-1 text-indigo-500" />
                <span className="text-sm text-muted-foreground">Chunks</span>
              </div>
              <div className="text-xl font-bold text-indigo-600">
                200
              </div>
              <div className="text-xs text-muted-foreground">emails/chunk</div>
            </div>

            <div className="text-center bg-white/70 rounded-lg p-3">
              <div className="flex items-center justify-center mb-1">
                <Shield className="h-4 w-4 mr-1 text-orange-500" />
                <span className="text-sm text-muted-foreground">Rate Limit</span>
              </div>
              <div className="text-xl font-bold text-orange-600">
                14
              </div>
              <div className="text-xs text-muted-foreground">emails/s max</div>
            </div>
          </div>

          {/* Resumo de Performance Gmail */}
          <div className={`rounded-lg p-4 border-2 ${
            results.targetAchieved 
              ? 'bg-gradient-to-r from-green-100 to-yellow-100 border-green-300' 
              : 'bg-gradient-to-r from-blue-100 to-purple-100 border-blue-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={getPerformanceClass(results.avgThroughput, results.targetAchieved)} variant="outline">
                  {results.targetAchieved ? '🚀 EXCELENTE GMAIL' :
                   results.avgThroughput >= 8 ? '⚡ BOA PERFORMANCE' :
                   results.avgThroughput >= 4 ? '💪 PERFORMANCE PADRÃO' : '📈 BAIXA PERFORMANCE'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {results.targetAchieved 
                    ? `🎯 Gmail otimizado atingiu ${results.avgThroughput.toFixed(2)} emails/s com rate limiting!` 
                    : `Gmail: ${results.avgThroughput.toFixed(2)} emails/s com proteção contra rate limit`
                  }
                </span>
              </div>
              <Button onClick={resetResults} variant="outline" size="sm">
                Novo Envio
              </Button>
            </div>
          </div>

          {/* Banner de Conquista */}
          {results.targetAchieved && (
            <div className="bg-gradient-to-r from-yellow-100 to-green-100 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-yellow-600" />
                <div>
                  <div className="font-bold text-green-800">🎯 META GMAIL ATINGIDA!</div>
                  <div className="text-sm text-green-600">
                    Sistema otimizado processou com {results.avgThroughput.toFixed(2)} emails/s respeitando 
                    os limites do Gmail com rate limiting inteligente! ⚡🚀
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirmação de Histórico */}
          <div className="bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-800">Histórico Gmail Atualizado</div>
                <div className="text-sm text-green-600">
                  Todos os envios otimizados foram registrados no histórico com métricas de performance. 
                  Rate limiting aplicado com sucesso para proteção da conta.
                </div>
              </div>
            </div>
          </div>

          {/* Análise de Erros */}
          {results.errorTypes && Object.keys(results.errorTypes).length > 0 && (
            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
              <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Análise de Erros Gmail:
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
            <Shield className="h-6 w-6 text-blue-600" />
            Envio Gmail Otimizado
            <Badge variant="outline" className="bg-blue-100">RATE LIMITING | 15 EMAILS/S</Badge>
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

          {selectedContacts.length > 5000 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Limite excedido: máximo 5.000 contatos por lote otimizado
                </span>
              </div>
            </div>
          )}

          {selectedContacts.length >= 1000 && selectedContacts.length <= 5000 && (
            <div className="bg-gradient-to-r from-green-50 to-yellow-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-bold">
                  GMAIL OTIMIZADO ATIVADO! ⚡
                </span>
              </div>
              <div className="text-xs text-green-600 space-y-1">
                <div>• 🎯 <strong>META:</strong> 15 emails/segundo com rate limiting inteligente</div>
                <div>• 📦 <strong>PROCESSAMENTO:</strong> Chunks de 200 emails | 25 conexões simultâneas</div>
                <div>• ⚡ <strong>ESTIMATIVA:</strong> ~{Math.ceil(selectedContacts.length / 15)} segundos para {selectedContacts.length.toLocaleString()} emails</div>
                <div>• 🛡️ <strong>PROTEÇÃO:</strong> Rate limiting 14 emails/s | Burst limit 100 emails</div>
              </div>
            </div>
          )}

          {selectedContacts.length >= 200 && selectedContacts.length < 1000 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Processamento otimizado para Gmail ⚡
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                • Performance esperada: 10-15 emails/segundo • Rate limiting aplicado • Histórico automático
              </div>
            </div>
          )}

          {selectedContacts.length > 0 && selectedContacts.length < 200 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Volume baixo - Processamento rápido garantido ✅
                </span>
              </div>
              <div className="text-xs text-green-600 mt-1">
                • Envios registrados no histórico automaticamente com proteção Gmail
              </div>
            </div>
          )}

          <Button
            onClick={handleOptimizedSend}
            disabled={isProcessing || selectedContacts.length === 0 || selectedContacts.length > 5000}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processando Gmail Otimizado...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                ⚡ ENVIO GMAIL | {selectedContacts.length.toLocaleString()} contatos | Rate Limiting
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Monitor de Progresso Gmail Otimizado */}
      <OptimizedProgressMonitor 
        progress={progress} 
        isProcessing={isProcessing} 
      />
    </div>
  );
};
