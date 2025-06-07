
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBatchEmailSending } from '@/hooks/useBatchEmailSending';
import { toast } from 'sonner';
import { Mail, Users, Zap, CheckCircle, XCircle, TrendingUp, Timer, Shield } from 'lucide-react';

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
  const { isProcessing, progress, sendEmailsInBatch } = useBatchEmailSending();

  const handleBatchSend = useCallback(async () => {
    if (selectedContacts.length === 0) {
      toast.error('Selecione ao menos um contato para envio');
      return;
    }

    if (selectedContacts.length > 10000) {
      toast.error('Limite máximo de 10.000 contatos por lote');
      return;
    }

    try {
      console.log(`🚀 Iniciando envio em lote otimizado: ${selectedContacts.length} contatos`);
      
      const startTime = Date.now();
      
      // Notificação inicial
      toast.info('⚡ ENVIO EM LOTE OTIMIZADO INICIADO!', {
        description: `Processando ${selectedContacts.length} contatos com rate limiting inteligente`,
        duration: 4000
      });
      
      const result = await sendEmailsInBatch(
        selectedContacts,
        templateId,
        customSubject,
        customContent
      );
      
      const totalTime = Date.now() - startTime;
      
      if (result && result.success) {
        setResults({
          ...result,
          totalTime: Math.round(totalTime / 1000)
        });
        
        // Feedback específico de sucesso
        if (result.successCount === selectedContacts.length) {
          toast.success('🎯 SUCESSO TOTAL!', {
            description: `Todos os ${result.successCount} emails foram enviados com sucesso!`,
            duration: 10000
          });
        } else if (result.successCount > 0) {
          toast.success(`✅ ${result.successCount} emails enviados!`, {
            description: `Taxa de sucesso: ${result.successRate} | Duração: ${result.totalDuration}s`,
            duration: 8000
          });
        }
      } else {
        toast.error('Falha no envio em lote. Verifique os logs para mais detalhes.');
      }

    } catch (error: any) {
      console.error('Erro no envio em lote:', error);
      toast.error(`Erro no processamento: ${error.message}`);
    } finally {
      onComplete();
    }
  }, [selectedContacts, templateId, customSubject, customContent, sendEmailsInBatch, onComplete]);

  const resetResults = () => {
    setResults(null);
  };

  const getVolumeLabel = () => {
    if (selectedContacts.length >= 5000) return 'Volume Muito Alto ⚡';
    if (selectedContacts.length >= 1000) return 'Volume Alto 🚀';
    if (selectedContacts.length >= 500) return 'Volume Médio 💪';
    if (selectedContacts.length >= 100) return 'Volume Baixo 📈';
    return 'Teste 🔍';
  };

  const getVolumeColor = () => {
    if (selectedContacts.length >= 1000) return 'default';
    if (selectedContacts.length >= 500) return 'secondary';
    return 'outline';
  };

  if (results) {
    return (
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Relatório de Envio em Lote
            <Badge variant="outline" className="bg-green-100 border-green-400">
              <Shield className="h-4 w-4 mr-1" />
              SISTEMA OTIMIZADO
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
              <div className="text-3xl font-bold text-blue-600">{results.successRate}</div>
              <div className="text-sm text-muted-foreground">Taxa Sucesso</div>
            </div>
            <div className="text-center bg-white/70 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">
                {results.totalDuration || results.totalTime}s
              </div>
              <div className="text-sm text-muted-foreground">Duração</div>
            </div>
          </div>

          {/* Performance */}
          {results.avgThroughput && (
            <div className="text-center bg-white/70 rounded-lg p-4">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                <span className="text-lg font-medium">Performance</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {results.avgThroughput} emails/s
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-green-100">
                  {results.successCount === selectedContacts.length ? '🎯 PERFEITO' : '✅ CONCLUÍDO'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {results.successCount === selectedContacts.length 
                    ? `🚀 Todos os ${results.successCount} emails enviados com sucesso!` 
                    : `${results.successCount} de ${selectedContacts.length} emails enviados`
                  }
                </span>
              </div>
              <Button onClick={resetResults} variant="outline" size="sm">
                Novo Envio
              </Button>
            </div>
          </div>

          {/* Confirmação de Histórico */}
          <div className="bg-gradient-to-r from-blue-100 to-green-100 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-800">Histórico Atualizado</div>
                <div className="text-sm text-blue-600">
                  Todos os envios foram registrados no histórico com rate limiting aplicado.
                </div>
              </div>
            </div>
          </div>
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
            Envio em Lote Otimizado
            <Badge variant="outline" className="bg-blue-100">RATE LIMITING INTELIGENTE</Badge>
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

          {selectedContacts.length >= 1000 && selectedContacts.length <= 10000 && (
            <div className="bg-gradient-to-r from-green-50 to-yellow-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-bold">
                  SISTEMA OTIMIZADO ATIVADO! ⚡
                </span>
              </div>
              <div className="text-xs text-green-600 space-y-1">
                <div>• 🎯 <strong>OTIMIZAÇÃO:</strong> Rate limiting inteligente por provedor</div>
                <div>• 📦 <strong>PROCESSAMENTO:</strong> Sequencial com delays adaptativos</div>
                <div>• ⚡ <strong>ESTIMATIVA:</strong> ~{Math.ceil(selectedContacts.length / 10)} segundos</div>
                <div>• 🛡️ <strong>PROTEÇÃO:</strong> Sistema anti-421 e retry inteligente</div>
              </div>
            </div>
          )}

          {selectedContacts.length >= 100 && selectedContacts.length < 1000 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Processamento otimizado com rate limiting ⚡
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                • Performance esperada: 5-15 emails/segundo • Histórico automático
              </div>
            </div>
          )}

          {selectedContacts.length > 0 && selectedContacts.length < 100 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Volume baixo - Processamento rápido garantido ✅
                </span>
              </div>
              <div className="text-xs text-green-600 mt-1">
                • Envios registrados no histórico automaticamente
              </div>
            </div>
          )}

          {/* Barra de progresso durante processamento */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processando com rate limiting...</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} className="h-2" />
              <div className="text-xs text-center text-muted-foreground">
                {Math.round((progress.current / progress.total) * 100)}% concluído
              </div>
            </div>
          )}

          <Button
            onClick={handleBatchSend}
            disabled={isProcessing || selectedContacts.length === 0 || selectedContacts.length > 10000}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            size="lg"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processando Lote Otimizado...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                ⚡ ENVIO OTIMIZADO | {selectedContacts.length.toLocaleString()} contatos
              </span>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
