
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOptimizedBatchSending } from '@/hooks/useOptimizedBatchSending';
import { OptimizedProgressMonitor } from './OptimizedProgressMonitor';
import { toast } from 'sonner';
import { Mail, Users, Zap, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

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
      console.log(`🚀 Iniciando envio otimizado para ${selectedContacts.length} contatos`);
      
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
          throughput: result.avgThroughput || Math.round((selectedContacts.length / totalTime) * 1000)
        });
        
        // Performance feedback
        if (result.avgThroughput >= 8) {
          toast.success('🚀 Performance excelente alcançada!', {
            description: `Taxa de ${result.avgThroughput.toFixed(2)} emails/segundo`,
            duration: 5000
          });
        } else if (result.avgThroughput >= 5) {
          toast.success('⚡ Boa performance de envio!', {
            description: `Taxa de ${result.avgThroughput.toFixed(2)} emails/segundo`,
            duration: 5000
          });
        }
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
    if (selectedContacts.length >= 5000) return 'Volume Ultra Alto';
    if (selectedContacts.length >= 2000) return 'Volume Alto';
    if (selectedContacts.length >= 500) return 'Volume Médio';
    return 'Volume Baixo';
  };

  const getVolumeColor = () => {
    if (selectedContacts.length >= 5000) return 'destructive';
    if (selectedContacts.length >= 2000) return 'default';
    if (selectedContacts.length >= 500) return 'secondary';
    return 'outline';
  };

  if (results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Relatório de Envio Otimizado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{results.successCount}</div>
              <div className="text-sm text-muted-foreground">Sucessos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{results.errorCount}</div>
              <div className="text-sm text-muted-foreground">Falhas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{results.successRate}%</div>
              <div className="text-sm text-muted-foreground">Taxa Sucesso</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{results.avgThroughput.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Emails/seg</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tempo total: {results.totalDuration}s
              </Badge>
              {results.avgThroughput >= 8 && (
                <Badge className="bg-green-500 text-white">
                  🚀 Performance Excelente
                </Badge>
              )}
            </div>
            <Button onClick={resetResults} variant="outline">
              Novo Envio Otimizado
            </Button>
          </div>

          {results.errorTypes && Object.keys(results.errorTypes).length > 0 && (
            <div className="border rounded-lg p-4 bg-red-50">
              <h4 className="font-medium text-red-800 mb-2">Análise de Erros:</h4>
              <div className="space-y-1">
                {Object.entries(results.errorTypes).map(([errorType, count]) => (
                  <div key={errorType} className="flex justify-between text-sm">
                    <span className="text-red-700">{errorType}</span>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Envio em Lote Otimizado
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Processamento otimizado ativado para alta performance!
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                • 15 emails simultâneos • Lotes de 25 • Tempo estimado: ~{Math.round(selectedContacts.length / 8 / 60)} minutos
              </div>
            </div>
          )}

          <Button
            onClick={handleOptimizedSend}
            disabled={isProcessing || selectedContacts.length === 0 || selectedContacts.length > 10000}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enviando em Lote Otimizado...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Enviar Otimizado para {selectedContacts.length.toLocaleString()} contatos
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress Monitor */}
      <OptimizedProgressMonitor 
        progress={progress} 
        isProcessing={isProcessing} 
      />
    </div>
  );
};
